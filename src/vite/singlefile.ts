import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig, Rollup } from "vite";

export const CS_SINGLEFILE_PLUGIN_NAME = "vite-plugin-cs-singlefile";

export interface CSSingleFileOptions {
    /**
     * Whether to bundle the entire application (JS, CSS, fonts, images, SVGs, and public icons)
     * into a single standalone `dist/index.html` file during `vite build`.
     */
    enabled: boolean;
}

const MIME_TYPES: Record<string, string> = {
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".woff2": "font/woff2",
};

function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] ?? "application/octet-stream";
}

function escapeRegex(value: string): string {
    return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function resolveBundleKey(attrUrl: string, baseUrl: string, bundle: Rollup.OutputBundle): string | undefined {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const candidates = new Set<string>([attrUrl, attrUrl.replace(/^\.\//, ""), attrUrl.replace(/^\//, "")]);

    if (attrUrl.startsWith(normalizedBase)) {
        candidates.add(attrUrl.slice(normalizedBase.length));
    }

    for (const candidate of candidates) {
        if (candidate in bundle) {
            return candidate;
        }
    }

    return undefined;
}

function inlinePublicAssets(html: string, publicDir: string, baseUrl: string): string {
    if (!publicDir || !existsSync(publicDir)) return html;

    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;

    // Inline <link ... href="/favicon.png"> or similar public directory references
    return html.replaceAll(
        /(<link\b[^>]*?\bhref=["'])([^"']+)(["'][^>]*>)/gi,
        (fullMatch, prefix: string, href: string, suffix: string) => {
            if (href.startsWith("data:") || href.startsWith("http://") || href.startsWith("https://")) {
                return fullMatch;
            }

            let relativePath = href;
            if (relativePath.startsWith(normalizedBase)) {
                relativePath = relativePath.slice(normalizedBase.length);
            } else if (relativePath.startsWith("/")) {
                relativePath = relativePath.slice(1);
            }

            const diskPath = path.resolve(publicDir, relativePath);
            if (!diskPath.startsWith(publicDir) || !existsSync(diskPath)) {
                return fullMatch;
            }

            const buffer = readFileSync(diskPath);
            const mime = getMimeType(diskPath);
            const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

            return `${prefix}${dataUri}${suffix}`;
        }
    );
}

/**
 * Vite plugin that compiles the entire build output into a single self-contained `index.html`.
 *
 * Architectural Notes:
 * - Zero-Overhead Disabled Mode (`enabled: false`): Returns a no-op plugin so normal multi-asset builds
 *   remain untouched unless explicitly enabled via `csSingleFile({ enabled: true })`.
 * - Automatic `csFont` Handshake: When active, `csFont({ sans: "inter" })` detects this plugin
 *   via `CS_SINGLEFILE_PLUGIN_NAME` and automatically switches to Base64 font inlining.
 * - Complete Asset Consolidation: Forces Vite to inline imported module assets (`assetsInlineLimit`),
 *   disables `public/` directory copying while inlining `<link rel="icon">` files as Base64 data URIs,
 *   and embeds all emitted JS and CSS bundles directly into `index.html`.
 */
export function csSingleFile(options: CSSingleFileOptions): Plugin {
    if (!options.enabled) {
        return {
            name: "vite-plugin-cs-singlefile-noop",
        };
    }

    let resolvedConfig: ResolvedConfig | undefined;

    return {
        name: CS_SINGLEFILE_PLUGIN_NAME,
        apply: "build",

        config() {
            return {
                build: {
                    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
                    cssCodeSplit: false,
                    copyPublicDir: false,
                    rollupOptions: {
                        output: {
                            codeSplitting: false,
                        },
                    },
                },
            };
        },

        configResolved(config) {
            resolvedConfig = config;
        },

        transformIndexHtml: {
            order: "post",
            handler(html, ctx) {
                const bundle = ctx.bundle;
                if (!bundle || !resolvedConfig) return html;

                const baseUrl = resolvedConfig.base;
                const consumedFiles = new Set<string>();
                let result = html;

                // 1. Inline emitted JS entry chunks (<script type="module" ... src="...">)
                result = result.replaceAll(
                    /<script\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
                    (fullMatch, src: string) => {
                        const key = resolveBundleKey(src, baseUrl, bundle);
                        const item = key ? bundle[key] : undefined;

                        if (!key || !item || item.type !== "chunk") {
                            return fullMatch;
                        }

                        consumedFiles.add(key);
                        const safeCode = (item as Rollup.OutputChunk).code.replaceAll(
                            /<\/script/gi,
                            String.raw`<\/script`
                        );
                        return `<script type="module">${safeCode}</script>`;
                    }
                );

                // 2. Inline emitted CSS assets (<link rel="stylesheet" ... href="...">)
                result = result.replaceAll(
                    /<link\b[^>]*?\brel=["']stylesheet["'][^>]*?\bhref=["']([^"']+)["'][^>]*>|<link\b[^>]*?\bhref=["']([^"']+)["'][^>]*?\brel=["']stylesheet["'][^>]*>/gi,
                    (fullMatch, hrefA?: string, hrefB?: string) => {
                        const href = hrefA ?? hrefB;
                        if (!href) return fullMatch;

                        const key = resolveBundleKey(href, baseUrl, bundle);
                        const item = key ? bundle[key] : undefined;

                        if (!key || !item || item.type !== "asset") {
                            return fullMatch;
                        }

                        consumedFiles.add(key);
                        const cssSource = String((item as Rollup.OutputAsset).source).trim();
                        return `<style>${cssSource}</style>`;
                    }
                );

                // 3. Strip any leftover modulepreload links for inlined chunks
                for (const fileKey of consumedFiles) {
                    const escapedKey = escapeRegex(fileKey);
                    const preloadRegex = new RegExp(
                        String.raw`<link\b[^>]*?\brel=["']modulepreload["'][^>]*?\bhref=["'][^"']*${escapedKey}["'][^>]*>\s*`,
                        "gi"
                    );
                    result = result.replaceAll(preloadRegex, "");
                    delete bundle[fileKey];
                }

                // 4. Inline public directory links (e.g. <link rel="icon" href="/favicon.png">)
                result = inlinePublicAssets(result, resolvedConfig.publicDir, baseUrl);

                return result;
            },
        },
    };
}
