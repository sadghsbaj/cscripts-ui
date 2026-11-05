import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HtmlTagDescriptor, Plugin } from "vite";

export type CSFontSans = "system" | "inter";
export type CSFontBuildStrategy = "inline" | "normal";

export interface CSFontOptions {
    /**
     * Primary sans-serif font family for the application.
     * - `"system"`: Native OS font stack defined in `typography.css` (0 KB network/bundle overhead).
     * - `"inter"`: Bundled Inter Variable (`inter.woff2`) with the system stack as fallback.
     * @default "system"
     */
    sans?: CSFontSans;

    /**
     * Delivery strategy during `vite build` when `sans` is set to `"inter"`.
     * During `vite dev`, the font is always served normally via `/@fs/` to keep DevTools clean.
     * - `"inline"`: Embeds `inter.woff2` as a Base64 data URI directly into `index.html` (zero network requests, zero FOUT/FOIT).
     * - `"normal"`: Emits a hashed `.woff2` asset into the build output and injects a `<link rel="preload">` tag.
     * @default "inline"
     */
    build?: CSFontBuildStrategy;
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
 * - Zero-Overhead Default (`sans: "system"`): Returns a no-op plugin so applications using the
 *   native system font stack never read, bundle, or emit `inter.woff2`.
 * - Clean DevTools in Dev (`vite dev`): Always serves `inter.woff2` as a normal file URL via
 *   Vite's `/@fs/` endpoint with `<link rel="preload">`, avoiding multi-kilobyte Base64 strings in the DOM inspector.
 * - Flexible Production Delivery (`vite build`): Defaults to `"inline"` (Base64 data URI in `<head>`
 *   for instant zero-request rendering in local/intranet tools) or `"normal"` (hashed Rollup asset + preload).
 */
export function csFont(options: CSFontOptions = {}): Plugin {
    const sans = options.sans ?? "system";

    if (sans === "system") {
        return {
            name: "vite-plugin-cs-font",
        };
    }

    const buildStrategy = options.build ?? "inline";
    let isBuild = false;
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
            baseUrl = config.base;
        },

        buildStart() {
            if (!isBuild) return;

            const fontBuffer = readFileSync(INTER_FONT_PATH);

            if (buildStrategy === "inline") {
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
            // 1. Production build with inlined Base64 data URI
            if (isBuild && buildStrategy === "inline") {
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

            // 2. Dev server (`/@fs/...`) or production build with external hashed asset (`build: "normal"`)
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
