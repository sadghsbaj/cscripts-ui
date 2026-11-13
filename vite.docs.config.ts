import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { csFont, csLucide, csSingleFile, csTheme } from "cs/vite";
import UnoCSS from "unocss/vite";
import { defineConfig, type Plugin } from "vite";

const TEMP_OUT_DIR = ".docs-dist";
const DOCS_ENTRY = "playground/docs.html";
const DOCS_TARGET = "src/vite/docs.html";

function moveDocsBundle(): Plugin {
    let root = process.cwd();

    return {
        name: "vite-plugin-cs-docs-output",
        configResolved(config) {
            root = config.root;
        },
        closeBundle() {
            const builtHtml = path.resolve(root, TEMP_OUT_DIR, DOCS_ENTRY);
            const targetHtml = path.resolve(root, DOCS_TARGET);

            if (existsSync(builtHtml)) {
                mkdirSync(path.dirname(targetHtml), { recursive: true });
                renameSync(builtHtml, targetHtml);
            }

            rmSync(path.resolve(root, TEMP_OUT_DIR), { recursive: true, force: true });
        },
    };
}

export default defineConfig({
    build: {
        outDir: TEMP_OUT_DIR,
        emptyOutDir: true,
        rollupOptions: {
            input: DOCS_ENTRY,
        },
    },
    plugins: [
        csTheme({ mode: "system" }),
        csFont({ sans: "inter" }),
        csLucide({ enabled: true }),
        UnoCSS(),
        svelte(),
        csSingleFile({ enabled: true }),
        moveDocsBundle(),
    ],
});
