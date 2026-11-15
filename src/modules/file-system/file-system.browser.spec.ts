import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { build, createServer, type ViteDevServer } from "vite";
import { csSingleFile } from "../../vite/singlefile.ts";

let testServer: ViteDevServer | undefined;
let testServerUrl = "";

test.describe("FileSystem real Chromium OPFS, IndexedDB & csSingleFile", () => {
    test.beforeAll(async () => {
        testServer = await createServer({
            root: process.cwd(),
            configFile: false,
            logLevel: "silent",
            server: { port: 0, host: "127.0.0.1" },
            plugins: [svelte()],
        });
        await testServer.listen();
        const resolved = testServer.resolvedUrls?.local[0];
        if (!resolved) {
            throw new Error("Failed to resolve local Vite test server URL.");
        }
        testServerUrl = resolved;
    });

    test.afterAll(async () => {
        await testServer?.close();
    });

    test("OPFS + BrowserFsBackend + WriteQueue: concurrent writes, OCC, native move, delete, walkFiles, >1 MiB integrity, and rotated JSONL logs", async ({
        page,
    }) => {
        await page.goto(testServerUrl);

        const result = await page.evaluate(async () => {
            const errorsUrl = "/src/modules/file-system/errors.ts";
            const backendUrl = "/src/modules/file-system/fs-backend.internal.ts";
            const queueUrl = "/src/modules/file-system/write-queue.internal.ts";
            const loggerUrl = "/src/modules/file-system/logger.internal.ts";

            const { FsError } = (await import(
                /* @vite-ignore */ errorsUrl
            )) as typeof import("./errors.ts");
            const { BrowserFsBackend, sha256Hex } = (await import(
                /* @vite-ignore */ backendUrl
            )) as typeof import("./fs-backend.internal.ts");
            const { WriteQueue } = (await import(
                /* @vite-ignore */ queueUrl
            )) as typeof import("./write-queue.internal.ts");
            const { FsLogger } = (await import(
                /* @vite-ignore */ loggerUrl
            )) as typeof import("./logger.internal.ts");

            const opfsRoot = await navigator.storage.getDirectory();
            const testDirName = `cs-fs-opfs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const subDir = await opfsRoot.getDirectoryHandle(testDirName, { create: true });

            try {
                const backend = new BrowserFsBackend(subDir);
                const writeQueue = new WriteQueue(backend, { useWebLocks: true });
                const encoder = new TextEncoder();
                const decoder = new TextDecoder();

                // 1. Concurrent writes across distinct paths + same-path FIFO serialization
                const distinctWrites = Array.from({ length: 10 }, (_, idx) =>
                    writeQueue.write(
                        `items/item-${idx}.txt`,
                        encoder.encode(`payload-${idx}`),
                    ),
                );
                const samePathWrites = Array.from({ length: 8 }, (_, idx) =>
                    writeQueue.write("shared/counter.txt", encoder.encode(`seq-${idx}`)),
                );
                await Promise.all([...distinctWrites, ...samePathWrites]);

                const finalCounter = await backend.readBytes("shared/counter.txt");
                const finalCounterText = decoder.decode(finalCounter.bytes);

                // 2. readFile() & readBytes()
                const fileObj = await backend.readFile("items/item-3.txt");
                const fileObjText = await fileObj.text();

                // 3. OCC revision checks
                const rev1 = await writeQueue.write(
                    "occ/doc.json",
                    encoder.encode('{"v":1}'),
                );
                const rev2 = await writeQueue.write(
                    "occ/doc.json",
                    encoder.encode('{"v":2}'),
                    { expectedRevision: rev1 },
                );

                let occConflictCode: string | null = null;
                try {
                    await writeQueue.write(
                        "occ/doc.json",
                        encoder.encode('{"v":3}'),
                        { expectedRevision: rev1 },
                    );
                } catch (error) {
                    occConflictCode = error instanceof FsError ? error.code : String(error);
                }

                // 4. Native FileSystemFileHandle.move() & WriteQueue.move()
                const hasNativeMove =
                    typeof FileSystemFileHandle !== "undefined" &&
                    typeof (FileSystemFileHandle.prototype as unknown as { move?: unknown })
                        .move === "function";

                await backend.writeBytes("move/source.txt", encoder.encode("move-me-payload"));
                await backend.moveFile("move/source.txt", "move/nested/target.txt");
                const sourceExistsAfterMove = await backend.exists("move/source.txt");
                const movedRead = await backend.readBytes("move/nested/target.txt");
                const movedText = decoder.decode(movedRead.bytes);

                // Also test WriteQueue.move with expectedRevision
                await writeQueue.move("move/nested/target.txt", "move/final.txt", {
                    expectedRevision: movedRead.revision,
                });
                const finalMovedExists = await backend.exists("move/final.txt");
                const targetExistsAfterSecondMove = await backend.exists(
                    "move/nested/target.txt",
                );

                // 5. Large payload integrity (> 1 MiB)
                const largeSize = 1.5 * 1024 * 1024; // 1.5 MiB
                const largePayload = new Uint8Array(largeSize);
                for (let i = 0; i < largeSize; i += 1) {
                    largePayload[i] = (i * 31 + 7) & 0xff;
                }
                const expectedLargeHash = await sha256Hex(largePayload);
                await writeQueue.write("large/blob.bin", largePayload, {
                    verifyAfterWrite: true,
                });
                const readLarge = await backend.readBytes("large/blob.bin");
                const actualLargeHash = await sha256Hex(readLarge.bytes);

                // 6. deleteFile & NOT_FOUND check
                await backend.deleteFile("items/item-0.txt");
                const deletedExists = await backend.exists("items/item-0.txt");
                const deletedStat = await backend.stat("items/item-0.txt");

                let deleteMissingCode: string | null = null;
                try {
                    await backend.deleteFile("items/item-0.txt");
                } catch (error) {
                    deleteMissingCode = error instanceof FsError ? error.code : String(error);
                }

                // 7. Rotated JSONL logs in _cs-fs/logs/ via FsLogger (4 batches -> triggers rotation + maxFiles: 3 cap)
                const logger = new FsLogger({
                    namespace: "opfs-test",
                    systemDir: "_cs-fs",
                    logLevel: "info",
                    logFlushMs: 0,
                    rotation: {
                        maxBytes: 1024,
                        maxLines: 10,
                        maxFiles: 3,
                    },
                    backend,
                    writeQueue,
                });

                for (let batch = 0; batch < 4; batch += 1) {
                    for (let i = 0; i < 10; i += 1) {
                        logger.log({
                            level: "info",
                            event: "write",
                            path: `items/item-${batch}-${i}.txt`,
                            message: `Rotated log batch ${batch} entry #${i} with padding for size threshold`,
                        });
                    }
                    await logger.flush();
                }

                const logDirEntries = await backend.listDir("_cs-fs/logs");
                const logFileNames = logDirEntries
                    .map((entry) => entry.name)
                    .toSorted((a, b) => a.localeCompare(b));
                const readBackLogs = await logger.readLogs({ limit: 50 });
                await logger.destroy();

                // 8. walkFiles ignoring _cs-fs system directory
                const walkedBusinessFiles = await backend.walkFiles("", {
                    systemDir: "_cs-fs",
                });
                const walkedPaths = walkedBusinessFiles
                    .map((entry) => entry.path)
                    .toSorted((a, b) => a.localeCompare(b));

                return {
                    finalCounterText,
                    fileObjName: fileObj.name,
                    fileObjText,
                    rev2Size: rev2.size,
                    occConflictCode,
                    hasNativeMove,
                    sourceExistsAfterMove,
                    movedText,
                    finalMovedExists,
                    targetExistsAfterSecondMove,
                    largeSize: readLarge.bytes.byteLength,
                    expectedLargeHash,
                    actualLargeHash,
                    deletedExists,
                    deletedStat,
                    deleteMissingCode,
                    logFileNames,
                    readBackLogsCount: readBackLogs.length,
                    walkedPaths,
                };
            } finally {
                await opfsRoot.removeEntry(testDirName, { recursive: true });
            }
        });

        expect(result.finalCounterText).toBe("seq-7");
        expect(result.fileObjName).toBe("item-3.txt");
        expect(result.fileObjText).toBe("payload-3");
        expect(result.rev2Size).toBe(7);
        expect(result.occConflictCode).toBe("CONFLICT");
        expect(result.hasNativeMove).toBe(true);
        expect(result.sourceExistsAfterMove).toBe(false);
        expect(result.movedText).toBe("move-me-payload");
        expect(result.finalMovedExists).toBe(true);
        expect(result.targetExistsAfterSecondMove).toBe(false);
        expect(result.largeSize).toBe(1.5 * 1024 * 1024);
        expect(result.actualLargeHash).toBe(result.expectedLargeHash);
        expect(result.deletedExists).toBe(false);
        expect(result.deletedStat).toBeNull();
        expect(result.deleteMissingCode).toBe("NOT_FOUND");
        expect(result.logFileNames).toEqual(["fs.1.jsonl", "fs.2.jsonl", "fs.jsonl"]);
        expect(result.readBackLogsCount).toBeGreaterThanOrEqual(15);
        expect(result.walkedPaths).not.toContain("items/item-0.txt");
        expect(result.walkedPaths.some((p) => p.startsWith("_cs-fs/"))).toBe(false);
        expect(result.walkedPaths).toContain("large/blob.bin");
        expect(result.walkedPaths).toContain("move/final.txt");
    });

    test("IndexedDB handle persistence across full page reloads & namespace isolation", async ({
        page,
    }) => {
        const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const dirAlpha = `cs-fs-alpha-${runId}`;
        const dirBeta = `cs-fs-beta-${runId}`;
        const nsAlpha = `app-alpha-${runId}`;
        const nsBeta = `app-beta-${runId}`;

        await page.goto(testServerUrl);

        try {
            // Step 1: Pick & write in app-alpha before reload
            const step1 = await page.evaluate(
                async ({ dirAlpha: alphaDirName, nsAlpha: alphaNs, nsBeta: betaNs }) => {
                    const indexUrl = "/src/modules/file-system/index.ts";
                    const idbUrl = "/src/modules/file-system/idb-handle-store.internal.ts";

                    const { createWorkspace, defineSingleton, jsonAdapter } = (await import(
                        /* @vite-ignore */ indexUrl
                    )) as typeof import("./index.ts");
                    const { IdbHandleStore } = (await import(
                        /* @vite-ignore */ idbUrl
                    )) as typeof import("./idb-handle-store.internal.ts");

                    const opfsRoot = await navigator.storage.getDirectory();
                    const alphaHandle = await opfsRoot.getDirectoryHandle(alphaDirName, {
                        create: true,
                    });

                    const settingsAdapter = jsonAdapter<{ theme: string; count: number }>({
                        validate: (v: unknown): v is { theme: string; count: number } =>
                            typeof v === "object" &&
                            v !== null &&
                            typeof (v as Record<string, unknown>).theme === "string" &&
                            typeof (v as Record<string, unknown>).count === "number",
                    });

                    // Stub showDirectoryPicker to return the real Chromium OPFS handle
                    Object.defineProperty(window, "showDirectoryPicker", {
                        value: async () => alphaHandle,
                        configurable: true,
                        writable: true,
                    });

                    const wsAlpha = createWorkspace({
                        namespace: alphaNs,
                        singletons: {
                            settings: defineSingleton({
                                path: "settings.json",
                                adapter: settingsAdapter,
                            }),
                        },
                    });

                    const pickedStatus = await wsAlpha.pick();
                    await wsAlpha.singletons.settings.write({ theme: "dark", count: 42 });
                    await wsAlpha.flush();
                    await wsAlpha.destroy();

                    // Verify app-beta cannot see app-alpha's handle
                    const storeBeta = new IdbHandleStore({ namespace: betaNs });
                    const betaHandleBefore = await storeBeta.loadHandle();

                    return {
                        pickedStatus,
                        betaHandleBeforeExists: betaHandleBefore !== null,
                    };
                },
                { dirAlpha, nsAlpha, nsBeta },
            );

            expect(step1.pickedStatus).toBe("ready");
            expect(step1.betaHandleBeforeExists).toBe(false);

            // Step 2: Full page reload -> restore app-alpha from IndexedDB & verify app-beta is still unlinked
            await page.reload();

            const step2 = await page.evaluate(
                async ({ dirBeta: betaDirName, nsAlpha: alphaNs, nsBeta: betaNs }) => {
                    const indexUrl = "/src/modules/file-system/index.ts";
                    const idbUrl = "/src/modules/file-system/idb-handle-store.internal.ts";

                    const { createWorkspace, defineSingleton, jsonAdapter } = (await import(
                        /* @vite-ignore */ indexUrl
                    )) as typeof import("./index.ts");
                    const { IdbHandleStore } = (await import(
                        /* @vite-ignore */ idbUrl
                    )) as typeof import("./idb-handle-store.internal.ts");

                    const settingsAdapter = jsonAdapter<{ theme: string; count: number }>({
                        validate: (v: unknown): v is { theme: string; count: number } =>
                            typeof v === "object" &&
                            v !== null &&
                            typeof (v as Record<string, unknown>).theme === "string" &&
                            typeof (v as Record<string, unknown>).count === "number",
                    });

                    const wsAlpha2 = createWorkspace({
                        namespace: alphaNs,
                        singletons: {
                            settings: defineSingleton({
                                path: "settings.json",
                                adapter: settingsAdapter,
                            }),
                        },
                    });

                    const restoredAlphaStatus = await wsAlpha2.restore();
                    const alphaData = await wsAlpha2.singletons.settings.read();
                    await wsAlpha2.destroy();

                    // Verify app-beta is unlinked before its own pick
                    const wsBeta = createWorkspace({
                        namespace: betaNs,
                        singletons: {
                            settings: defineSingleton({
                                path: "settings.json",
                                adapter: settingsAdapter,
                            }),
                        },
                    });
                    const restoredBetaStatus = await wsBeta.restore();

                    // Now pick a distinct OPFS directory for app-beta
                    const opfsRoot = await navigator.storage.getDirectory();
                    const betaHandle = await opfsRoot.getDirectoryHandle(betaDirName, {
                        create: true,
                    });
                    Object.defineProperty(window, "showDirectoryPicker", {
                        value: async () => betaHandle,
                        configurable: true,
                        writable: true,
                    });

                    await wsBeta.pick();
                    await wsBeta.singletons.settings.write({ theme: "light", count: 99 });
                    await wsBeta.flush();
                    await wsBeta.destroy();

                    // Also verify storageKey isolation within the same namespace
                    const altStore = new IdbHandleStore({
                        namespace: alphaNs,
                        storageKey: "secondary-root",
                    });
                    const altHandle = await altStore.loadHandle();

                    return {
                        restoredAlphaStatus,
                        alphaData: alphaData?.data ?? null,
                        restoredBetaStatus,
                        altHandleExists: altHandle !== null,
                    };
                },
                { dirBeta, nsAlpha, nsBeta },
            );

            expect(step2.restoredAlphaStatus).toBe("ready");
            expect(step2.alphaData).toEqual({ theme: "dark", count: 42 });
            expect(step2.restoredBetaStatus).toBe("unlinked");
            expect(step2.altHandleExists).toBe(false);

            // Step 3: Second full page reload -> both app-alpha and app-beta restore independently
            await page.reload();

            const step3 = await page.evaluate(
                async ({ nsAlpha: alphaNs, nsBeta: betaNs }) => {
                    const indexUrl = "/src/modules/file-system/index.ts";
                    const { createWorkspace, defineSingleton, jsonAdapter } = (await import(
                        /* @vite-ignore */ indexUrl
                    )) as typeof import("./index.ts");

                    const settingsAdapter = jsonAdapter<{ theme: string; count: number }>({
                        validate: (v: unknown): v is { theme: string; count: number } =>
                            typeof v === "object" &&
                            v !== null &&
                            typeof (v as Record<string, unknown>).theme === "string" &&
                            typeof (v as Record<string, unknown>).count === "number",
                    });

                    const wsAlpha3 = createWorkspace({
                        namespace: alphaNs,
                        singletons: {
                            settings: defineSingleton({
                                path: "settings.json",
                                adapter: settingsAdapter,
                            }),
                        },
                    });
                    const wsBeta2 = createWorkspace({
                        namespace: betaNs,
                        singletons: {
                            settings: defineSingleton({
                                path: "settings.json",
                                adapter: settingsAdapter,
                            }),
                        },
                    });

                    const [statusA, statusB] = await Promise.all([
                        wsAlpha3.restore(),
                        wsBeta2.restore(),
                    ]);
                    const [docA, docB] = await Promise.all([
                        wsAlpha3.singletons.settings.read(),
                        wsBeta2.singletons.settings.read(),
                    ]);

                    await Promise.all([wsAlpha3.forget(), wsBeta2.forget()]);
                    await Promise.all([wsAlpha3.destroy(), wsBeta2.destroy()]);

                    return {
                        statusA,
                        statusB,
                        dataA: docA?.data ?? null,
                        dataB: docB?.data ?? null,
                    };
                },
                { nsAlpha, nsBeta },
            );

            expect(step3.statusA).toBe("ready");
            expect(step3.statusB).toBe("ready");
            expect(step3.dataA).toEqual({ theme: "dark", count: 42 });
            expect(step3.dataB).toEqual({ theme: "light", count: 99 });
        } finally {
            await page.evaluate(
                async ({ dirAlpha: a, dirBeta: b }) => {
                    const opfsRoot = await navigator.storage.getDirectory();
                    try {
                        await opfsRoot.removeEntry(a, { recursive: true });
                    } catch {
                        // Ignore cleanup errors if entry was never created.
                    }
                    try {
                        await opfsRoot.removeEntry(b, { recursive: true });
                    } catch {
                        // Ignore cleanup errors if entry was never created.
                    }
                },
                { dirAlpha, dirBeta },
            );
        }
    });

    test("csSingleFile (file://) compatibility smoke check", async ({ page }) => {
        const tempDir = mkdtempSync(path.join(os.tmpdir(), "cs-fs-singlefile-"));
        const outDir = path.join(tempDir, "dist");
        const entryHtml = path.join(tempDir, "index.html");
        const entryTs = path.join(tempDir, "entry.ts");

        const fileSystemDir = path.resolve(process.cwd(), "src/modules/file-system");
        const browserStorageIndex = path.resolve(
            process.cwd(),
            "src/modules/browser-storage/index.ts",
        );

        writeFileSync(
            entryTs,
            `
import { configureStoragePrefix } from ${JSON.stringify(browserStorageIndex)};
import { checkFileSystemSupport, FsError } from ${JSON.stringify(path.join(fileSystemDir, "index.ts"))};
import { IdbHandleStore } from ${JSON.stringify(path.join(fileSystemDir, "idb-handle-store.internal.ts"))};
import {
    clearEmergencyLogs,
    getEmergencyLogs,
    recordEmergencyLog,
} from ${JSON.stringify(path.join(fileSystemDir, "logger.internal.ts"))};

async function run() {
    const support = checkFileSystemSupport();

    // 1. Strict MISSING_PREFIX enforcement when no prefix is configured
    configureStoragePrefix("");
    let missingPrefixCode: string | null = null;
    try {
        new IdbHandleStore();
    } catch (error) {
        missingPrefixCode = error instanceof FsError ? error.code : String(error);
    }

    // 2. Prefix configuration + IdbHandleStore key isolation
    configureStoragePrefix("singlefile-alpha");
    const storeAlpha = new IdbHandleStore();
    const storeBeta = new IdbHandleStore({ namespace: "singlefile-beta" });

    // 3. localStorage emergency log isolation
    clearEmergencyLogs("singlefile-alpha");
    clearEmergencyLogs("singlefile-beta");
    recordEmergencyLog("singlefile-alpha", {
        level: "error",
        event: "error",
        code: "IO_FAILED",
        message: "alpha failure",
    });
    const logsAlpha = getEmergencyLogs("singlefile-alpha");
    const logsBeta = getEmergencyLogs("singlefile-beta");
    clearEmergencyLogs("singlefile-alpha");
    clearEmergencyLogs("singlefile-beta");

    (window as unknown as { __csSingleFileResult: unknown }).__csSingleFileResult = {
        protocol: window.location.protocol,
        isSecureContext: window.isSecureContext,
        support,
        missingPrefixCode,
        storeAlphaKey: storeAlpha.key,
        storeBetaKey: storeBeta.key,
        logsAlphaCount: logsAlpha.length,
        logsAlphaMessage: logsAlpha[0]?.message ?? null,
        logsBetaCount: logsBeta.length,
    };
}

void run();
`,
        );

        writeFileSync(
            entryHtml,
            `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>csSingleFile FS Smoke</title></head>
<body>
<script type="module" src="./entry.ts"></script>
</body>
</html>
`,
        );

        try {
            await build({
                root: tempDir,
                logLevel: "silent",
                build: {
                    outDir,
                    emptyOutDir: true,
                    rollupOptions: {
                        input: entryHtml,
                    },
                },
                plugins: [svelte(), csSingleFile({ enabled: true })],
            });

            const externalRequests: string[] = [];
            const pageErrors: string[] = [];
            const workerCreations: string[] = [];

            page.on("request", (req) => {
                const url = req.url();
                if (!url.startsWith("file://") && !url.startsWith("data:")) {
                    externalRequests.push(url);
                }
            });
            page.on("pageerror", (error) => {
                pageErrors.push(error.message);
            });
            page.on("worker", (worker) => {
                workerCreations.push(worker.url());
            });

            const builtHtmlPath = path.join(outDir, "index.html");
            await page.goto(`file://${builtHtmlPath}`);
            await page.waitForFunction(
                () =>
                    (window as unknown as { __csSingleFileResult?: unknown })
                        .__csSingleFileResult !== undefined,
            );

            const smokeResult = await page.evaluate(
                () =>
                    (
                        window as unknown as {
                            __csSingleFileResult: {
                                protocol: string;
                                isSecureContext: boolean;
                                support: {
                                    supported: boolean;
                                    status: string;
                                    features: {
                                        directoryPicker: boolean;
                                        nativeMove: boolean;
                                        indexedDb: boolean;
                                        webLocks: boolean;
                                    };
                                };
                                missingPrefixCode: string | null;
                                storeAlphaKey: string;
                                storeBetaKey: string;
                                logsAlphaCount: number;
                                logsAlphaMessage: string | null;
                                logsBetaCount: number;
                            };
                        }
                    ).__csSingleFileResult,
            );

            expect(externalRequests).toEqual([]);
            expect(pageErrors).toEqual([]);
            expect(workerCreations).toEqual([]);
            expect(smokeResult.protocol).toBe("file:");
            expect(smokeResult.isSecureContext).toBe(true);
            expect(smokeResult.support.features.indexedDb).toBe(true);
            expect(smokeResult.missingPrefixCode).toBe("MISSING_PREFIX");
            expect(smokeResult.storeAlphaKey).toBe("singlefile-alpha:root-handle");
            expect(smokeResult.storeBetaKey).toBe("singlefile-beta:root-handle");
            expect(smokeResult.logsAlphaCount).toBe(1);
            expect(smokeResult.logsAlphaMessage).toBe("alpha failure");
            expect(smokeResult.logsBetaCount).toBe(0);
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });
});
