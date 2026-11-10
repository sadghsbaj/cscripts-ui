import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

const CONFIGURE_PREFIX_CALL_REGEX = /\bconfigureStoragePrefix\s*\(\s*(?:(["'`])([\s\S]*?)\1)?\s*\)/;

/**
 * Inspects the project's entry `main.ts` during Vite startup (`vite dev` / `vite build`)
 * and logs a warning if `configureStoragePrefix("...")` is missing or left as an empty string `""`.
 */
export function verifyStoragePrefix(config: ResolvedConfig): void {
    const candidates = [
        path.resolve(config.root, "src/main.ts"),
        path.resolve(config.root, "playground/main.ts"),
    ];

    const mainPath = candidates.find((candidate) => existsSync(candidate));
    if (!mainPath) return;

    const relativeMain = path.relative(config.root, mainPath).replaceAll("\\", "/");

    try {
        const source = readFileSync(mainPath, "utf8");
        const match = CONFIGURE_PREFIX_CALL_REGEX.exec(source);

        if (!match) {
            config.logger.warn(
                `\n[cs/vite] Missing configureStoragePrefix("your-app-id") in ${relativeMain}. Local file:// HTML apps in Chromium/Edge share a single browser storage bucket—define a unique prefix to prevent key collisions.\n`
            );
            return;
        }

        const rawLiteral = match[2];
        if (rawLiteral !== undefined) {
            const normalized = rawLiteral.trim().replace(/:+$/, "");
            if (normalized.length === 0) {
                config.logger.warn(
                    `\n[cs/vite] configureStoragePrefix("") in ${relativeMain} has an empty prefix. Set a unique non-empty prefix (e.g. configureStoragePrefix("holzanalysen")) so local file:// HTML apps do not collide in browser storage.\n`
                );
            }
        }
    } catch {
        // Ignore unreadable entry files
    }
}

/**
 * Standalone Vite plugin that validates `configureStoragePrefix` in `main.ts`.
 * Automatically invoked by `csTheme()` as well so existing `vite.config.ts` setups get the check out of the box.
 */
export function csStorageCheck(): Plugin {
    return {
        name: "vite-plugin-cs-storage-check",
        configResolved(config) {
            verifyStoragePrefix(config);
        },
    };
}
