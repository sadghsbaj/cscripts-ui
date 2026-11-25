// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { build, type Plugin, type Rollup } from "vite";
import { afterEach, describe, expect, it } from "vitest";

import { CS_SINGLEFILE_PLUGIN_NAME, csSingleFile } from "./singlefile.ts";

function createHtmlAsset(fileName: string, source = "<html></html>"): Rollup.OutputAsset {
    return {
        type: "asset",
        fileName,
        name: path.basename(fileName),
        names: [path.basename(fileName)],
        originalFileName: null,
        originalFileNames: [],
        source,
    } as unknown as Rollup.OutputAsset;
}

function createTextAsset(fileName: string, source = "body{}"): Rollup.OutputAsset {
    return createHtmlAsset(fileName, source);
}

function invokeGenerateBundle(plugin: Plugin, bundle: Rollup.OutputBundle): Rollup.EmittedAsset[] {
    const hook = plugin.generateBundle;
    if (!hook) {
        throw new Error("Expected generateBundle hook to be defined");
    }

    const emitted: Rollup.EmittedAsset[] = [];
    const handler = typeof hook === "function" ? hook : hook.handler;
    handler.call(
        {
            emitFile(asset: Rollup.EmittedAsset) {
                emitted.push(asset);
                return "emitted-asset-ref";
            },
        } as never,
        {} as Rollup.NormalizedOutputOptions,
        bundle,
        false
    );

    return emitted;
}

describe("csSingleFile", () => {
    const tempDirs: string[] = [];

    afterEach(() => {
        while (tempDirs.length > 0) {
            const dir = tempDirs.pop();
            if (dir) {
                rmSync(dir, { recursive: true, force: true });
            }
        }
    });

    describe("fileName validation", () => {
        it.each([true, false])("throws on empty or whitespace-only fileName (enabled: %s)", (enabled) => {
            expect(() => csSingleFile({ enabled, fileName: "" })).toThrow(/non-empty/);
            expect(() => csSingleFile({ enabled, fileName: "   \t\n  " })).toThrow(/non-empty/);
        });

        it.each([true, false])(String.raw`throws on leading / or \ in fileName (enabled: %s)`, (enabled) => {
            expect(() => csSingleFile({ enabled, fileName: "/app.html" })).toThrow(/relative path/);
            expect(() => csSingleFile({ enabled, fileName: String.raw`\app.html` })).toThrow(/relative path/);
            expect(() => csSingleFile({ enabled, fileName: "  /nested/app.html" })).toThrow(/relative path/);
        });

        it.each([true, false])('throws on ".." path traversal segments in fileName (enabled: %s)', (enabled) => {
            expect(() => csSingleFile({ enabled, fileName: "../foo.html" })).toThrow(/\.\./);
            expect(() => csSingleFile({ enabled, fileName: "sub/../foo.html" })).toThrow(/\.\./);
            expect(() => csSingleFile({ enabled, fileName: String.raw`sub\..\foo.html` })).toThrow(/\.\./);
        });
    });

    describe("disabled mode", () => {
        it("returns a noop plugin without transformIndexHtml or generateBundle hooks when enabled is false", () => {
            const plugin = csSingleFile({ enabled: false, fileName: "work-app" });

            expect(plugin.name).toBe("vite-plugin-cs-singlefile-noop");
            expect(plugin.transformIndexHtml).toBeUndefined();
            expect(plugin.generateBundle).toBeUndefined();
            expect(plugin.config).toBeUndefined();
        });
    });

    describe(".html normalization and generateBundle output renaming", () => {
        it('renames emitted "index.html" to "work-app.html" when fileName omits .html', () => {
            const plugin = csSingleFile({ enabled: true, fileName: "work-app" });
            expect(plugin.name).toBe(CS_SINGLEFILE_PLUGIN_NAME);

            const htmlAsset = createHtmlAsset("index.html", "<html><body>work</body></html>");
            const otherAsset = createTextAsset("assets/logo.svg", "<svg/>");
            const bundle: Rollup.OutputBundle = {
                "index.html": htmlAsset,
                "assets/logo.svg": otherAsset,
            };

            const emitted = invokeGenerateBundle(plugin, bundle);

            expect(bundle["index.html"]).toBeUndefined();
            expect(bundle["assets/logo.svg"]).toBe(otherAsset);
            expect(emitted).toEqual([
                {
                    type: "asset",
                    fileName: "work-app.html",
                    source: "<html><body>work</body></html>",
                },
            ]);
        });

        it('preserves uppercase ".HTML" extension without double-appending ".html"', () => {
            const plugin = csSingleFile({ enabled: true, fileName: "custom.HTML" });
            const htmlAsset = createHtmlAsset("index.html", "<html>upper</html>");
            const bundle: Rollup.OutputBundle = {
                "index.html": htmlAsset,
            };

            const emitted = invokeGenerateBundle(plugin, bundle);

            expect(bundle["index.html"]).toBeUndefined();
            expect(emitted).toEqual([
                {
                    type: "asset",
                    fileName: "custom.HTML",
                    source: "<html>upper</html>",
                },
            ]);
        });

        it('renames nested input entry "playground/docs.html" to "docs.html" and removes the old key', () => {
            const plugin = csSingleFile({ enabled: true, fileName: "docs.html" });
            const htmlAsset = createHtmlAsset("playground/docs.html", "<html>docs</html>");
            const bundle: Rollup.OutputBundle = {
                "playground/docs.html": htmlAsset,
            };

            const emitted = invokeGenerateBundle(plugin, bundle);

            expect(bundle["playground/docs.html"]).toBeUndefined();
            expect(emitted).toEqual([
                {
                    type: "asset",
                    fileName: "docs.html",
                    source: "<html>docs</html>",
                },
            ]);
        });

        it('keeps the bundle entry untouched when the emitted key already matches targetFileName', () => {
            const plugin = csSingleFile({ enabled: true, fileName: "docs.html" });
            const htmlAsset = createHtmlAsset("docs.html", "<html>docs</html>");
            const bundle: Rollup.OutputBundle = {
                "docs.html": htmlAsset,
            };

            const emitted = invokeGenerateBundle(plugin, bundle);

            expect(bundle["docs.html"]).toBe(htmlAsset);
            expect(emitted).toEqual([]);
        });

        it(String.raw`normalizes backslash subpath "apps\my-tool" to "apps/my-tool.html"`, () => {
            const plugin = csSingleFile({ enabled: true, fileName: String.raw`apps\my-tool` });
            const htmlAsset = createHtmlAsset("index.html", "<html>tool</html>");
            const bundle: Rollup.OutputBundle = {
                "index.html": htmlAsset,
            };

            const emitted = invokeGenerateBundle(plugin, bundle);

            expect(bundle["index.html"]).toBeUndefined();
            expect(emitted).toEqual([
                {
                    type: "asset",
                    fileName: "apps/my-tool.html",
                    source: "<html>tool</html>",
                },
            ]);
        });
    });

    describe("Vite build integration", () => {
        it("emits a single self-contained HTML file with the configured fileName", async () => {
            const rootDir = mkdtempSync(path.join(os.tmpdir(), "cs-singlefile-build-"));
            tempDirs.push(rootDir);

            const outDir = path.join(rootDir, "dist");
            mkdirSync(path.join(rootDir, "src"), { recursive: true });
            writeFileSync(
                path.join(rootDir, "src/main.js"),
                'import "./style.css";\nconsole.log("singlefile-ok");\n',
                "utf8"
            );
            writeFileSync(path.join(rootDir, "src/style.css"), "body { color: red; }\n", "utf8");
            writeFileSync(
                path.join(rootDir, "index.html"),
                '<!doctype html><html><head><script type="module" src="/src/main.js"></script></head><body>hi</body></html>',
                "utf8"
            );

            await build({
                configFile: false,
                root: rootDir,
                logLevel: "silent",
                plugins: [csSingleFile({ enabled: true, fileName: "work-app" })],
                build: {
                    outDir,
                    emptyOutDir: true,
                },
            });

            const targetHtmlPath = path.join(outDir, "work-app.html");
            expect(existsSync(targetHtmlPath)).toBe(true);
            expect(existsSync(path.join(outDir, "index.html"))).toBe(false);

            const outputHtml = readFileSync(targetHtmlPath, "utf8");
            expect(outputHtml).toContain("singlefile-ok");
            expect(outputHtml).toContain("color:red");
        });
    });
});
