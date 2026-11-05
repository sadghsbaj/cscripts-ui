import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HtmlTagDescriptor, Plugin } from "vite";

import { CS_SINGLEFILE_PLUGIN_NAME } from "./singlefile.ts";

export type CSFontSans = "system" | "inter";

export interface CSFontOptions {
    /**
     * Primary sans-serif font family for the application.
     * - `"system"`: Native OS font stack defined in `typography.css` (0 KB network/bundle overhead).
     * - `"inter"`: Bundled Inter Variable (`inter.woff2`) with the system stack as fallback.
     */
    sans: CSFontSans;
}

const INTER_FONT_PATH = fileURLToPath(new URL("../assets/fonts/inter.woff2", import.meta.url));
const INTER_FONT_DIR = path.dirname(INTER_FONT_PATH);

function buildFontCss(fontUrl: string, display: "block" | "swap"): string {
    return `@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;font-display:${display};src:url("${fontUrl}") format("woff2")}:root{--cs-font-sans:"Inter",var(--cs-font-sans-system)}`;
}

/**
 * Vite plugin that configures the root sans-serif typography (`--cs-font-sans`).
 *
 * Architectural Notes:
 * - Zero-Overhead System Mode (`sans: "system"`): Returns a no-op plugin so applications using the
 *   native system font stack never read, bundle, or emit `inter.woff2`.
 * - Clean DevTools in Dev (`vite dev`): Always serves `inter.woff2` as a normal file URL via
 *   Vite's `/@fs/` endpoint with `<link rel="preload">`, avoiding multi-kilobyte Base64 strings in the DOM inspector.
 * - Automatic Single-File Handshake (`vite build`): Emits a hashed `.woff2` asset with `<link rel="preload">`
 *   in normal builds, or automatically inlines `inter.woff2` as a Base64 data URI when `csSingleFile({ enabled: true })` is active.
 */
export function csFont(options: CSFontOptions): Plugin {
    if (options.sans === "system") {
        return {
            name: "vite-plugin-cs-font",
        };
    }

    let isBuild = false;
    let isSingleFile = false;
    let baseUrl = "/";
    let emittedAssetUrl: string | undefined;
    let inlineDataUri: string | undefined;

    return {
        name: "vite-plugin-cs-font",

        config() {
            return {
                server: {
                    fs: {
                        allow: [INTER_FONT_DIR],
                    },
                },
            };
        },

        configResolved(config) {
            isBuild = config.command === "build";
            isSingleFile = config.plugins.some((plugin) => plugin.name === CS_SINGLEFILE_PLUGIN_NAME);
            baseUrl = config.base;
        },

        buildStart() {
            if (!isBuild) return;

            const fontBuffer = readFileSync(INTER_FONT_PATH);

            if (isSingleFile) {
                inlineDataUri = `data:font/woff2;base64,${fontBuffer.toString("base64")}`;
            } else {
                // eslint-disable-next-line unicorn/no-this-outside-of-class
                const refId = this.emitFile({
                    type: "asset",
                    name: "inter.woff2",
                    source: fontBuffer,
                });
                // eslint-disable-next-line unicorn/no-this-outside-of-class
                const fileName = this.getFileName(refId);
                const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
                emittedAssetUrl = `${normalizedBase}${fileName}`;
            }
        },

        transformIndexHtml() {
            // 1. Single-file production build: inline Base64 data URI directly in <head>
            if (isBuild && isSingleFile) {
                const dataUri =
                    inlineDataUri ?? `data:font/woff2;base64,${readFileSync(INTER_FONT_PATH).toString("base64")}`;

                return [
                    {
                        tag: "style",
                        children: buildFontCss(dataUri, "block"),
                        injectTo: "head-prepend",
                    },
                ];
            }

            // 2. Dev server (`/@fs/...`) or standard production build with external hashed asset
            const normalizedFsPath = INTER_FONT_PATH.replaceAll("\\", "/");
            const devFontUrl = `/@fs${normalizedFsPath.startsWith("/") ? "" : "/"}${normalizedFsPath}`;
            const fontUrl = isBuild && emittedAssetUrl ? emittedAssetUrl : devFontUrl;

            const tags: HtmlTagDescriptor[] = [
                {
                    tag: "link",
                    attrs: {
                        rel: "preload",
                        href: fontUrl,
                        as: "font",
                        type: "font/woff2",
                        crossorigin: true,
                    },
                    injectTo: "head-prepend",
                },
                {
                    tag: "style",
                    children: buildFontCss(fontUrl, "swap"),
                    injectTo: "head-prepend",
                },
            ];

            return tags;
        },
    };
}
