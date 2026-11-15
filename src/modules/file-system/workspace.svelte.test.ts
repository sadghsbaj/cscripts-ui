import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStoragePrefix } from "../browser-storage/index.ts";
import {
	createWorkspace,
	defineCollection,
	defineSingleton,
	FsError,
	isFsError,
	jsonAdapter,
	type ConflictDetails,
	type FsErrorCode,
	type FsLogEntry,
	type MutationContext,
	type MutationSettledContext,
	type StandardSchemaV1,
	type SyncProgress,
} from "./index.ts";
import * as fileSystemBarrel from "./index.ts";
import type { IdbHandleStore } from "./idb-handle-store.internal.ts";
import { MemoryFsBackend } from "./memory-fs.internal.ts";

interface SettingsDoc {
	theme: string;
	currency: string;
}

interface InvoiceDoc {
	id: string;
	year: string;
	title: string;
	amount: number;
	notes?: string;
}

interface InvoiceProjected {
	id: string;
	year: string;
	title: string;
	amount: number;
}

const settingsSchema: StandardSchemaV1<unknown, SettingsDoc> = {
	"~standard": {
		version: 1,
		vendor: "test",
		validate(value: unknown) {
			if (
				typeof value === "object" &&
				value !== null &&
				typeof (value as SettingsDoc).theme === "string" &&
				typeof (value as SettingsDoc).currency === "string"
			) {
				return { value: value as SettingsDoc };
			}
			return { issues: [{ message: "Invalid SettingsDoc" }] };
		},
	},
};

const invoiceSchema: StandardSchemaV1<unknown, InvoiceDoc> = {
	"~standard": {
		version: 1,
		vendor: "test",
		validate(value: unknown) {
			if (
				typeof value === "object" &&
				value !== null &&
				typeof (value as InvoiceDoc).id === "string" &&
				typeof (value as InvoiceDoc).year === "string" &&
				typeof (value as InvoiceDoc).title === "string" &&
				typeof (value as InvoiceDoc).amount === "number"
			) {
				return { value: value as InvoiceDoc };
			}
			return { issues: [{ message: "Invalid InvoiceDoc" }] };
		},
	},
};

function encodeJson(value: unknown): Uint8Array {
	return new TextEncoder().encode(JSON.stringify(value));
}

async function expectFsErrorCode(
	fn: () => unknown | Promise<unknown>,
	code: FsErrorCode,
): Promise<FsError> {
	try {
		await fn();
	} catch (error) {
		expect(isFsError(error)).toBe(true);
		if (isFsError(error)) {
			expect(error.code).toBe(code);
			return error;
		}
	}
	throw new Error(`Expected FsError("${code}") to be thrown.`);
}

function makeFakeDirHandle(
	name: string,
	options?: {
		queryPermission?: PermissionState;
		requestPermission?: PermissionState;
	},
): FileSystemDirectoryHandle {
	let perm = options?.queryPermission ?? "granted";
	const reqPerm = options?.requestPermission ?? "granted";
	return {
		kind: "directory",
		name,
		getFileHandle: vi.fn(),
		getDirectoryHandle: vi.fn(),
		removeEntry: vi.fn(),
		resolve: vi.fn(),
		isSameEntry: vi.fn(),
		queryPermission: vi.fn(async () => perm),
		requestPermission: vi.fn(async () => {
			perm = reqPerm;
			return reqPerm;
		}),
		keys: vi.fn(),
		values: vi.fn(),
		entries: vi.fn(),
		[Symbol.asyncIterator]: vi.fn(),
	} as unknown as FileSystemDirectoryHandle;
}

function createMockIdbStore(initialHandle: FileSystemDirectoryHandle | null = null): IdbHandleStore & {
	saved: FileSystemDirectoryHandle | null;
	clearedCount: number;
} {
	const store = {
		saved: initialHandle,
		clearedCount: 0,
		async loadHandle() {
			return store.saved;
		},
		async saveHandle(handle: FileSystemDirectoryHandle) {
			store.saved = handle;
		},
		async clearHandle() {
			store.saved = null;
			store.clearedCount += 1;
		},
	};
	return store as unknown as IdbHandleStore & {
		saved: FileSystemDirectoryHandle | null;
		clearedCount: number;
	};
}

function stubSupportedEnvironment(picker?: () => Promise<FileSystemDirectoryHandle>): void {
	Object.defineProperties(window, {
		isSecureContext: {
			value: true,
			configurable: true,
		},
		showDirectoryPicker: {
			value: picker ?? vi.fn(async () => makeFakeDirHandle("picked")),
			configurable: true,
			writable: true,
		},
	});
	vi.stubGlobal("indexedDB", { open: vi.fn() });
}

function createDeferred<T = void>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
} {
	return Promise.withResolvers<T>();
}

describe("Workspace (workspace.svelte.ts & index.ts)", () => {
	const workspacesToDestroy: Array<{ destroy: () => void }> = [];

	function trackWorkspace<T extends { destroy: () => void }>(ws: T): T {
		workspacesToDestroy.push(ws);
		return ws;
	}

	beforeEach(() => {
		configureStoragePrefix("");
	});

	afterEach(() => {
		while (workspacesToDestroy.length > 0) {
			workspacesToDestroy.pop()?.destroy();
		}
		configureStoragePrefix("");
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.useRealTimers();
		delete (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker;
	});

	describe("1. Config, Prefix & Barrel Isolation", () => {
		it("throws FsError('MISSING_PREFIX') when neither configureStoragePrefix nor namespace is set", () => {
			try {
				createWorkspace({
					backend: new MemoryFsBackend(),
				});
				throw new Error("Expected MISSING_PREFIX");
			} catch (error) {
				expect(isFsError(error)).toBe(true);
				if (isFsError(error)) {
					expect(error.code).toBe("MISSING_PREFIX");
				}
			}
		});

		it("resolves namespace from configureStoragePrefix() or explicit config.namespace", () => {
			configureStoragePrefix("app-prefix:");
			const ws1 = trackWorkspace(
				createWorkspace({
					backend: new MemoryFsBackend(),
				}),
			);
			expect(ws1.namespace).toBe("app-prefix");

			const ws2 = trackWorkspace(
				createWorkspace({
					namespace: "custom-ns",
					backend: new MemoryFsBackend(),
				}),
			);
			expect(ws2.namespace).toBe("custom-ns");
		});

		it("throws FsError('INVALID_CONFIG') when singleton or collection/companion resides in systemDir", () => {
			expect(() =>
				createWorkspace({
					namespace: "test-ns",
					backend: new MemoryFsBackend(),
					singletons: {
						bad: defineSingleton({
							path: "_cs-fs/settings.json",
							adapter: jsonAdapter({ schema: settingsSchema }),
						}),
					},
				}),
			).toThrowError(FsError);

			try {
				createWorkspace({
					namespace: "test-ns",
					systemDir: ".meta",
					backend: new MemoryFsBackend(),
					collections: {
						items: defineCollection({
							pattern: ".meta/items/{id}.json",
							adapter: jsonAdapter({ schema: invoiceSchema }),
						}),
					},
				});
				throw new Error("Expected INVALID_CONFIG");
			} catch (error) {
				expect(isFsError(error)).toBe(true);
				if (isFsError(error)) {
					expect(error.code).toBe("INVALID_CONFIG");
				}
			}
		});

		it("throws FsError('INVALID_CONFIG') on overlapping collection or companion templates", () => {
			try {
				createWorkspace({
					namespace: "test-ns",
					backend: new MemoryFsBackend(),
					collections: {
						a: defineCollection({
							pattern: "docs/{id}.json",
							adapter: jsonAdapter({ schema: invoiceSchema }),
							companion: {
								pattern: "docs/{id}.json",
							},
						}),
					},
				});
				throw new Error("Expected INVALID_CONFIG");
			} catch (error) {
				expect(isFsError(error)).toBe(true);
				if (isFsError(error)) {
					expect(error.code).toBe("INVALID_CONFIG");
				}
			}

			try {
				createWorkspace({
					namespace: "test-ns",
					backend: new MemoryFsBackend(),
					collections: {
						a: defineCollection({
							pattern: "items/{year}/{id}.json",
							adapter: jsonAdapter({ schema: invoiceSchema }),
						}),
						b: defineCollection({
							pattern: "items/{folder}/{name}.json",
							adapter: jsonAdapter({ schema: invoiceSchema }),
						}),
					},
				});
				throw new Error("Expected INVALID_CONFIG");
			} catch (error) {
				expect(isFsError(error)).toBe(true);
				if (isFsError(error)) {
					expect(error.code).toBe("INVALID_CONFIG");
				}
			}
		});

		it("index.ts exports public APIs cleanly without exposing internal symbols", () => {
			const exportedKeys = Object.keys(fileSystemBarrel);
			expect(exportedKeys).toContain("createWorkspace");
			expect(exportedKeys).toContain("defineWorkspace");
			expect(exportedKeys).toContain("defineCollection");
			expect(exportedKeys).toContain("defineSingleton");
			expect(exportedKeys).toContain("jsonAdapter");
			expect(exportedKeys).toContain("FsError");

			const forbiddenInternalSymbols = [
				"MemoryFsBackend",
				"BrowserFsBackend",
				"WriteQueue",
				"CacheEngine",
				"FsLogger",
				"IdbHandleStore",
				"resolveWorkspaceNamespace",
				"recordEmergencyLog",
			];
			for (const internalName of forbiddenInternalSymbols) {
				expect(exportedKeys).not.toContain(internalName);
			}
		});
	});

	describe("2. Mount & Permission Lifecycle", () => {
		it("restore() handles unsupported, unlinked, needs-permission, ready, and stale", async () => {
			// Unsupported when window.showDirectoryPicker / indexedDB are absent
			const unsupportedWs = trackWorkspace(createWorkspace({ namespace: "unsupported-ws" }));
			expect(unsupportedWs.mountStatus).toBe("unsupported");
			expect(await unsupportedWs.restore()).toBe("unsupported");

			// Now stub supported browser APIs
			stubSupportedEnvironment();

			// unlinked when IDB has no handle
			const emptyIdb = createMockIdbStore(null);
			const unlinkedWs = trackWorkspace(
				createWorkspace({
					namespace: "unlinked-ws",
					idbStore: emptyIdb,
				}),
			);
			expect(unlinkedWs.mountStatus).toBe("unlinked");
			expect(await unlinkedWs.restore()).toBe("unlinked");

			// needs-permission when queryPermission !== "granted"
			const promptHandle = makeFakeDirHandle("vault", { queryPermission: "prompt" });
			const promptIdb = createMockIdbStore(promptHandle);
			const promptWs = trackWorkspace(
				createWorkspace({
					namespace: "prompt-ws",
					idbStore: promptIdb,
				}),
			);
			expect(await promptWs.restore()).toBe("needs-permission");
			expect(promptWs.mountStatus).toBe("needs-permission");

			// ready when queryPermission === "granted"
			const grantedHandle = makeFakeDirHandle("vault", { queryPermission: "granted" });
			const grantedIdb = createMockIdbStore(grantedHandle);
			const readyWs = trackWorkspace(
				createWorkspace({
					namespace: "ready-ws",
					idbStore: grantedIdb,
					createBackend: () => new MemoryFsBackend(),
				}),
			);
			expect(await readyWs.restore()).toBe("ready");
			expect(readyWs.mountStatus).toBe("ready");

			// stale when root directory is missing (HANDLE_STALE during boot)
			const staleBackend = new MemoryFsBackend();
			vi.spyOn(staleBackend, "walkFiles").mockRejectedValueOnce(
				new FsError("HANDLE_STALE", "Missing root directory"),
			);
			const staleIdb = createMockIdbStore(makeFakeDirHandle("missing", { queryPermission: "granted" }));
			const staleWs = trackWorkspace(
				createWorkspace({
					namespace: "stale-ws",
					idbStore: staleIdb,
					createBackend: () => staleBackend,
				}),
			);
			expect(await staleWs.restore()).toBe("stale");
			expect(staleWs.mountStatus).toBe("stale");
			expect(staleWs.lastError?.code).toBe("HANDLE_STALE");
		});

		it("pick(), requestAccess(), and forget() transition mountStatus and persist/clear IDB handle", async () => {
			const pickedHandle = makeFakeDirHandle("chosen", {
				queryPermission: "prompt",
				requestPermission: "granted",
			});
			const abortPicker = vi
				.fn<() => Promise<FileSystemDirectoryHandle>>()
				.mockRejectedValueOnce(new DOMException("User cancelled", "AbortError"))
				.mockResolvedValueOnce(pickedHandle);

			stubSupportedEnvironment(abortPicker);
			const idb = createMockIdbStore(null);

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "pick-ws",
					idbStore: idb,
					showDirectoryPicker: abortPicker,
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			// AbortError in pick() does not throw and keeps unlinked
			expect(await ws.pick()).toBe("unlinked");
			expect(ws.lastError).toBeNull();

			// Successful pick() saves handle and becomes ready
			expect(await ws.pick()).toBe("ready");
			expect(idb.saved).toBe(pickedHandle);

			// forget() clears IDB handle and returns to unlinked
			await ws.forget();
			expect(ws.mountStatus).toBe("unlinked");
			expect(idb.saved).toBeNull();
			expect(idb.clearedCount).toBe(1);

			// requestAccess() from needs-permission -> ready
			const needsPermHandle = makeFakeDirHandle("reauth", {
				queryPermission: "prompt",
				requestPermission: "granted",
			});
			idb.saved = needsPermHandle;
			expect(await ws.restore()).toBe("needs-permission");
			expect(await ws.requestAccess()).toBe("ready");
			expect(ws.mountStatus).toBe("ready");
		});

		it("destroy() detaches focus, visibilitychange, beforeunload listeners and aborts active work", async () => {
			vi.useFakeTimers();
			const backend = new MemoryFsBackend();
			const walkSpy = vi.spyOn(backend, "walkFiles");

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "destroy-ws",
					backend,
					revalidateOnFocus: { minIntervalMs: 100 },
					preventCloseWhilePending: true,
				}),
			);
			await ws.restore();
			const callsAfterRestore = walkSpy.mock.calls.length;

			ws.destroy();

			// Focus & visibilitychange after destroy should NOT trigger heal/walkFiles
			vi.advanceTimersByTime(1000);
			window.dispatchEvent(new Event("focus"));
			Object.defineProperty(document, "visibilityState", {
				value: "visible",
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
			await Promise.resolve();
			expect(walkSpy.mock.calls.length).toBe(callsAfterRestore);

			// beforeunload after destroy should NOT preventDefault
			const unloadEvent = new Event("beforeunload", { cancelable: true });
			const preventSpy = vi.spyOn(unloadEvent, "preventDefault");
			window.dispatchEvent(unloadEvent);
			expect(preventSpy).not.toHaveBeenCalled();

			// Subsequent operations throw ABORTED
			await expectFsErrorCode(() => ws.heal(), "ABORTED");
		});
	});

	describe("3. Reactive State & Lifecycle ($state.raw, health, lastError, beforeunload)", () => {
		it("transitions health across base, positive, caution, negative and clears lastError on success or clearError()", async () => {
			stubSupportedEnvironment();
			const idb = createMockIdbStore(null);
			const backend = new MemoryFsBackend();
			const gate = createDeferred<void>();
			const originalWrite = backend.writeBytes.bind(backend);
			let gateWrites = false;
			vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				if (gateWrites && path === "settings.json") {
					await gate.promise;
				}
				return originalWrite(path, bytes, opts);
			});

			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const ws = createWorkspace({
				namespace: "health-ws",
				idbStore: idb,
				showDirectoryPicker: async () => makeFakeDirHandle("h"),
				createBackend: () => backend,
				singletons: { settings },
			});
			trackWorkspace(ws);

			// unlinked -> base
			expect(ws.mountStatus).toBe("unlinked");
			expect(ws.health).toBe("base");

			// needs-permission -> caution
			idb.saved = makeFakeDirHandle("h", { queryPermission: "prompt" });
			await ws.restore();
			expect(ws.health).toBe("caution");

			// ready & idle -> positive
			await ws.requestAccess();
			expect(ws.mountStatus).toBe("ready");
			expect(ws.health).toBe("positive");
			expect(ws.isBusy).toBe(false);
			expect(ws.activity).toBe("idle");

			// pending mutation -> isBusy true, caution
			gateWrites = true;
			const pendingWrite = ws.singletons.settings.write({ theme: "dark", currency: "EUR" });
			expect(ws.pendingMutationCount).toBe(1);
			expect(ws.isBusy).toBe(true);
			expect(ws.activity).toBe("writing");
			expect(ws.health).toBe("caution");

			// beforeunload calls preventDefault while pendingMutationCount > 0
			const unloadWhilePending = new Event("beforeunload", { cancelable: true });
			const preventWhilePending = vi.spyOn(unloadWhilePending, "preventDefault");
			window.dispatchEvent(unloadWhilePending);
			expect(preventWhilePending).toHaveBeenCalledTimes(1);

			gate.resolve();
			await pendingWrite;
			expect(ws.pendingMutationCount).toBe(0);
			expect(ws.isBusy).toBe(false);
			expect(ws.health).toBe("positive");

			// beforeunload does NOT call preventDefault when pendingMutationCount === 0
			const unloadIdle = new Event("beforeunload", { cancelable: true });
			const preventIdle = vi.spyOn(unloadIdle, "preventDefault");
			window.dispatchEvent(unloadIdle);
			expect(preventIdle).not.toHaveBeenCalled();

			// IO_FAILED sets lastError and health -> negative
			gateWrites = false;
			backend.simulateError("settings.json", "IO_FAILED", 1);
			await expectFsErrorCode(
				() => ws.singletons.settings.write({ theme: "light", currency: "USD" }),
				"IO_FAILED",
			);
			expect(ws.lastError?.code).toBe("IO_FAILED");
			expect(ws.health).toBe("negative");

			// clearError() resets lastError and restores positive
			ws.clearError();
			expect(ws.lastError).toBeNull();
			expect(ws.health).toBe("positive");

			// Subsequent successful disk write also clears lastError
			backend.simulateError("settings.json", "IO_FAILED", 1);
			await expectFsErrorCode(
				() => ws.singletons.settings.write({ theme: "light", currency: "USD" }),
				"IO_FAILED",
			);
			expect(ws.lastError).not.toBeNull();

			await ws.singletons.settings.write({ theme: "light", currency: "USD" });
			expect(ws.lastError).toBeNull();
			expect(ws.health).toBe("positive");
		});

		it("surfaces corruptEntries on boot and sets health to caution", async () => {
			const backend = new MemoryFsBackend();
			await backend.injectExternalFile(
				"invoices/2026/bad.json",
				new TextEncoder().encode("{not valid json"),
			);

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "corrupt-ws",
				backend,
				collections: { invoices },
			});
			trackWorkspace(ws);

			await ws.restore();
			expect(ws.corruptEntries).toHaveLength(1);
			expect(ws.corruptEntries[0]?.path).toBe("invoices/2026/bad.json");
			expect(ws.health).toBe("caution");
		});
	});

	describe("4. Optimistic UI & Isolated Per-Op Rollback", () => {
		it("projects optimistic writes, updates, moves, and deletes at 0ms", async () => {
			const backend = new MemoryFsBackend();
			const gate = createDeferred<void>();
			const origWrite = backend.writeBytes.bind(backend);
			let blockWrite = true;
			vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				if (blockWrite && !path.startsWith("_cs-fs/")) {
					await gate.promise;
				}
				return origWrite(path, bytes, opts);
			});

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
					project: (doc): InvoiceProjected => ({
						id: doc.id,
						year: doc.year,
						title: doc.title,
						amount: doc.amount,
					}),
				},
			});
			const ws = createWorkspace({
				namespace: "optimistic-ws",
				backend,
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			// Write is visible immediately before disk write resolves
			const writePromise = ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Draft", amount: 100 },
			);
			expect(ws.collections.invoices.entries).toHaveLength(1);
			expect(ws.collections.invoices.entries[0]?.data.title).toBe("Draft");

			gate.resolve();
			await writePromise;
			blockWrite = false;

			// Update optimistic projection
			const gate2 = createDeferred<void>();
			vi.spyOn(backend, "writeBytes").mockImplementationOnce(async (path, bytes, opts) => {
				await gate2.promise;
				return origWrite(path, bytes, opts);
			});
			const updatePromise = ws.collections.invoices.update({ year: "2026", id: "1" }, (cur) => ({
				...(cur as InvoiceDoc),
				title: "Updated",
			}));
			// Wait a microtask for update's read to finish and push pending upsert
			await vi.waitFor(() => {
				expect(ws.collections.invoices.entries[0]?.data.title).toBe("Updated");
			});
			gate2.resolve();
			await updatePromise;

			// Move optimistic projection
			const gateMove = createDeferred<void>();
			const origMove = backend.moveFile.bind(backend);
			vi.spyOn(backend, "moveFile").mockImplementationOnce(async (from, to) => {
				await gateMove.promise;
				return origMove(from, to);
			});
			const movePromise = ws.collections.invoices.move(
				{ year: "2026", id: "1" },
				{ year: "2026", id: "1b" },
			);
			expect(ws.collections.invoices.entries).toHaveLength(1);
			expect(ws.collections.invoices.entries[0]?.path).toBe("invoices/2026/1b.json");
			gateMove.resolve();
			await movePromise;

			// Delete optimistic projection
			const gateDel = createDeferred<void>();
			const origDel = backend.deleteFile.bind(backend);
			vi.spyOn(backend, "deleteFile").mockImplementationOnce(async (path) => {
				await gateDel.promise;
				return origDel(path);
			});
			const delPromise = ws.collections.invoices.delete({ year: "2026", id: "1b" });
			expect(ws.collections.invoices.entries).toHaveLength(0);
			gateDel.resolve();
			await delPromise;
			expect(ws.collections.invoices.entries).toHaveLength(0);
		});

		it("rolls back ONLY the failed mutation when 2 mutations are queued while keeping the second intact", async () => {
			const backend = new MemoryFsBackend();
			const gate1 = createDeferred<void>();
			const origWrite = backend.writeBytes.bind(backend);
			vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				if (path === "invoices/2026/fail.json") {
					await gate1.promise;
					throw new FsError("IO_FAILED", "Simulated disk error on first write");
				}
				return origWrite(path, bytes, opts);
			});

			const errorHooks: Array<{ error: FsError; context: MutationContext }> = [];
			const settledHooks: MutationSettledContext[] = [];
			const progressHooks: SyncProgress[] = [];
			const logHooks: FsLogEntry[] = [];

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "isolated-rollback-ws",
				backend,
				onMutationError: (error, context) => {
					errorHooks.push({ error, context });
				},
				onMutationSettled: (ctx) => {
					settledHooks.push(ctx);
				},
				onSyncProgress: (progress) => {
					progressHooks.push(progress);
				},
				onLog: (entry) => {
					logHooks.push(entry);
				},
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			const p1 = ws.collections.invoices.write(
				{ year: "2026", id: "fail" },
				{ id: "fail", year: "2026", title: "Will Fail", amount: 10 },
			);
			const p2 = ws.collections.invoices.write(
				{ year: "2026", id: "ok" },
				{ id: "ok", year: "2026", title: "Will Succeed", amount: 20 },
			);

			// Both are optimistically visible
			expect(ws.collections.invoices.entries.map((e) => e.data.id)).toEqual(["fail", "ok"]);
			expect(ws.pendingMutationCount).toBe(2);

			await p2;
			gate1.resolve();
			await expectFsErrorCode(() => p1, "IO_FAILED");

			// Only "fail" rolled back; "ok" remains intact in entries and on disk
			expect(ws.collections.invoices.entries.map((e) => e.data.id)).toEqual(["ok"]);
			expect(await ws.collections.invoices.exists({ year: "2026", id: "ok" })).toBe(true);
			expect(await ws.collections.invoices.exists({ year: "2026", id: "fail" })).toBe(false);

			expect(errorHooks).toHaveLength(1);
			expect(errorHooks[0]?.context.path).toBe("invoices/2026/fail.json");
			expect(settledHooks.some((s) => s.path === "invoices/2026/fail.json" && s.status === "rolled-back")).toBe(
				true,
			);
			expect(settledHooks.some((s) => s.path === "invoices/2026/ok.json" && s.status === "committed")).toBe(
				true,
			);
			expect(progressHooks.length).toBeGreaterThan(0);
			expect(logHooks.length).toBeGreaterThan(0);
		});
	});

	describe("5. Conflict Policies & resolveConflict", () => {
		it("detect policy aborts on external SMB edit, updates confirmed state to remote truth, and preserves local draft in unresolvedConflicts", async () => {
			const backend = new MemoryFsBackend();
			const conflicts: ConflictDetails[] = [];
			const settled: MutationSettledContext[] = [];

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "conflict-detect-ws",
				backend,
				conflictPolicy: "detect",
				onMutationConflict: (c) => {
					conflicts.push(c);
				},
				onMutationSettled: (s) => {
					settled.push(s);
				},
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Base", amount: 100 },
			);

			// External SMB edit
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Remote Edit", amount: 200 }),
			);

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "1" },
						{ id: "1", year: "2026", title: "Local Edit", amount: 150 },
					),
				"CONFLICT",
			);

			expect(ws.unresolvedConflictCount).toBe(1);
			expect(conflicts).toHaveLength(1);
			expect(conflicts[0]?.local).toEqual({
				id: "1",
				year: "2026",
				title: "Local Edit",
				amount: 150,
			});
			expect(conflicts[0]?.remote).toEqual({
				id: "1",
				year: "2026",
				title: "Remote Edit",
				amount: 200,
			});
			expect(ws.health).toBe("caution");
			// Confirmed state updated to remote truth
			expect(ws.collections.invoices.entries[0]?.data.title).toBe("Remote Edit");
			expect(settled.at(-1)?.status).toBe("conflict");
		});

		it("auto-merge policy auto-commits disjoint edits and escalates overlapping or delete-edit conflicts", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "conflict-automerge-ws",
				backend,
				conflictPolicy: "auto-merge",
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Base", amount: 100 },
			);

			// Disjoint remote edit: changes amount only
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Base", amount: 500 }),
			);

			// Local edit: changes title only -> auto-merges!
			const mergedRes = await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Local Title", amount: 100 },
			);
			expect(mergedRes.merged).toBe(true);
			expect(ws.unresolvedConflictCount).toBe(0);
			const readMerged = await ws.collections.invoices.read({ year: "2026", id: "1" });
			expect(readMerged?.data).toEqual({
				id: "1",
				year: "2026",
				title: "Local Title",
				amount: 500,
			});

			// Overlapping remote edit: changes title
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Remote Title", amount: 500 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "1" },
						{ id: "1", year: "2026", title: "Conflicting Title", amount: 500 },
					),
				"CONFLICT",
			);
			expect(ws.unresolvedConflictCount).toBe(1);

			// delete-edit conflict: remote deletes file while local writes
			await ws.collections.invoices.write(
				{ year: "2026", id: "2" },
				{ id: "2", year: "2026", title: "Doc 2", amount: 50 },
			);
			await backend.deleteFile("invoices/2026/2.json");
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "2" },
						{ id: "2", year: "2026", title: "Edited After Remote Delete", amount: 60 },
					),
				"CONFLICT",
			);
			expect(ws.unresolvedConflictCount).toBe(2);
		});

		it("last-write-wins policy overwrites sequentially without escalating", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
			});
			const ws = createWorkspace({
				namespace: "conflict-lww-ws",
				backend,
				conflictPolicy: "last-write-wins",
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "First", amount: 1 },
			);
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "External", amount: 2 }),
			);
			await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Last Wins", amount: 3 },
			);

			expect(ws.unresolvedConflictCount).toBe(0);
			const read = await ws.collections.invoices.read({ year: "2026", id: "1" });
			expect(read?.data.title).toBe("Last Wins");
		});

		it("resolveConflict supports keep-local, keep-remote, apply-custom and re-checks remoteRevision against concurrent edits", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "resolve-conflict-ws",
				backend,
				conflictPolicy: "detect",
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			// 1. keep-remote
			await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Base", amount: 1 },
			);
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Remote 1", amount: 2 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "1" },
						{ id: "1", year: "2026", title: "Local 1", amount: 3 },
					),
				"CONFLICT",
			);
			const c1 = ws.unresolvedConflicts[0];
			expect(c1).toBeDefined();
			if (c1) {
				await ws.resolveConflict(c1.id, "keep-remote");
			}
			expect(ws.unresolvedConflictCount).toBe(0);
			const afterKeepRemote = await ws.collections.invoices.read({ year: "2026", id: "1" });
			expect(afterKeepRemote?.data.title).toBe("Remote 1");

			// 2. keep-local
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Remote 2", amount: 4 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "1" },
						{ id: "1", year: "2026", title: "Local 2", amount: 5 },
					),
				"CONFLICT",
			);
			const c2 = ws.unresolvedConflicts[0];
			expect(c2).toBeDefined();
			if (c2) {
				await ws.resolveConflict(c2.id, "keep-local");
			}
			expect(ws.unresolvedConflictCount).toBe(0);
			const afterKeepLocal = await ws.collections.invoices.read({ year: "2026", id: "1" });
			expect(afterKeepLocal?.data.title).toBe("Local 2");

			// 3. apply-custom + concurrent edit during resolution triggers fresh CONFLICT
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Remote 3", amount: 6 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "1" },
						{ id: "1", year: "2026", title: "Local 3", amount: 7 },
					),
				"CONFLICT",
			);
			const c3 = ws.unresolvedConflicts[0];
			expect(c3).toBeDefined();

			// Concurrent external edit happens BEFORE resolveConflict executes
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				encodeJson({ id: "1", year: "2026", title: "Remote 4 Concurrent", amount: 8 }),
			);

			if (c3) {
				await expectFsErrorCode(
					() =>
						ws.resolveConflict(c3.id, "apply-custom", {
							id: "1",
							year: "2026",
							title: "Custom Merged",
							amount: 9,
						}),
					"CONFLICT",
				);
			}
			// Disk still has Remote 4 Concurrent (not silently overwritten)
			const afterConcurrent = await ws.collections.invoices.read({ year: "2026", id: "1" });
			expect(afterConcurrent?.data.title).toBe("Remote 4 Concurrent");
		});
	});

	describe("6. Singletons, Indexed vs Unindexed Collections, Partitions & Eager Migration", () => {
		it("settings singleton in business area survives _cs-fs/ deletion and heal()", async () => {
			const backend = new MemoryFsBackend();
			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "singleton-heal-ws",
				backend,
				singletons: { settings },
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			await ws.singletons.settings.write({ theme: "dark", currency: "USD" });
			await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Inv 1", amount: 99 },
			);
			await ws.flush();

			// Delete _cs-fs/ completely
			await backend.removeDir("_cs-fs", { recursive: true });

			const report = await ws.heal({ mode: "full" });
			expect(report.mode).toBe("full");

			const readSettings = await ws.singletons.settings.read();
			expect(readSettings?.data).toEqual({ theme: "dark", currency: "USD" });
			expect(ws.collections.invoices.entries).toHaveLength(1);
		});

		it("unindexed collection exposes list() with 0 file-content reads and omits indexed methods at runtime", async () => {
			const backend = new MemoryFsBackend();
			await backend.injectExternalFile(
				"docs/2026/a.json",
				encodeJson({ id: "a", year: "2026", title: "Doc A", amount: 10 }),
			);
			await backend.injectExternalFile(
				"docs/2025/b.json",
				encodeJson({ id: "b", year: "2025", title: "Doc B", amount: 20 }),
			);

			const readSpy = vi.spyOn(backend, "readBytes");

			const docs = defineCollection({
				pattern: "docs/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
			});
			const ws = createWorkspace({
				namespace: "unindexed-ws",
				backend,
				collections: { docs },
			});
			trackWorkspace(ws);
			await ws.restore();

			const col = ws.collections.docs as unknown as Record<string, unknown>;
			expect("entries" in col).toBe(false);
			expect("query" in col).toBe(false);
			expect("loadPartitions" in col).toBe(false);
			expect("loadAllPartitions" in col).toBe(false);

			const readsBeforeList = readSpy.mock.calls.filter((c) => c[0].startsWith("docs/")).length;
			const listed = await ws.collections.docs.list({ params: { year: "2026" } });
			const readsAfterList = readSpy.mock.calls.filter((c) => c[0].startsWith("docs/")).length;

			expect(listed).toHaveLength(1);
			expect(listed[0]?.params).toEqual({ year: "2026", id: "a" });
			expect(readsAfterList - readsBeforeList).toBe(0);
		});

		it("indexed collection exposes entries, query(), and partition loading", async () => {
			const backend = new MemoryFsBackend();
			const invoicesDef = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
					eagerPartitions: (key) => key === "2026",
				},
			});

			const ws1 = trackWorkspace(
				createWorkspace({
					namespace: "indexed-partitions-ws",
					backend,
					collections: { invoices: invoicesDef },
				}),
			);
			await ws1.restore();
			await ws1.collections.invoices.write(
				{ year: "2025", id: "a" },
				{ id: "a", year: "2025", title: "Old", amount: 10 },
			);
			await ws1.collections.invoices.write(
				{ year: "2026", id: "b" },
				{ id: "b", year: "2026", title: "New", amount: 20 },
			);
			await ws1.flush();
			ws1.destroy();

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "indexed-partitions-ws",
					backend,
					collections: { invoices: invoicesDef },
				}),
			);
			await ws.restore();

			expect(ws.collections.invoices.loadedPartitions()).toContain("2026");
			expect(ws.collections.invoices.unloadedPartitions()).toContain("2025");
			expect(ws.collections.invoices.hasUnloadedPartitions()).toBe(true);
			expect(ws.collections.invoices.entries).toHaveLength(1);

			await ws.collections.invoices.loadPartitions(["2025"]);
			expect(ws.collections.invoices.hasUnloadedPartitions()).toBe(false);
			expect(ws.collections.invoices.entries).toHaveLength(2);

			const q2025 = ws.collections.invoices.query({ params: { year: "2025" } });
			expect(q2025).toHaveLength(1);
			expect(q2025[0]?.data.id).toBe("a");

			await ws.collections.invoices.loadAllPartitions();
			expect(ws.collections.invoices.entries).toHaveLength(2);
		});

		it("supports writeRaw() and migrationWriteBack: 'eager'", async () => {
			const backend = new MemoryFsBackend();
			await backend.injectExternalFile(
				"invoices/2026/legacy.json",
				encodeJson({ id: "legacy", year: "2026", title: "Legacy", amount: 5, schemaVersion: 1 }),
			);

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter<InvoiceDoc>({
					schema: invoiceSchema,
					version: 2,
					minVersion: 1,
					migrationWriteBack: "eager",
					migrations: {
						1: (raw) => {
							const obj = raw as Record<string, unknown>;
							return {
								id: String(obj.id),
								year: String(obj.year),
								title: `${String(obj.title)} (v2)`,
								amount: Number(obj.amount),
							};
						},
					},
				}),
			});
			const ws = createWorkspace({
				namespace: "raw-migration-ws",
				backend,
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			const migratedRead = await ws.collections.invoices.read({ year: "2026", id: "legacy" });
			expect(migratedRead?.migrated).toBe(true);
			expect(migratedRead?.data.title).toBe("Legacy (v2)");

			// Eager write-back persisted the migrated payload to disk
			const diskRaw = await backend.readBytes("invoices/2026/legacy.json");
			const diskJson = JSON.parse(new TextDecoder().decode(diskRaw.bytes)) as InvoiceDoc;
			expect(diskJson.title).toBe("Legacy (v2)");

			// writeRaw writes raw bytes directly
			await ws.collections.invoices.writeRaw(
				{ year: "2026", id: "raw1" },
				JSON.stringify({ id: "raw1", year: "2026", title: "Raw", amount: 42, schemaVersion: 2 }),
			);
			const rawRead = await ws.collections.invoices.read({ year: "2026", id: "raw1" });
			expect(rawRead?.data.title).toBe("Raw");
		});
	});

	describe("7. Paired companion Lifecycle", () => {
		it("writeWithCompanion writes companion BEFORE primary and aborts primary if companion fails", async () => {
			const backend = new MemoryFsBackend();
			const writeOrder: string[] = [];
			const origWrite = backend.writeBytes.bind(backend);
			vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				writeOrder.push(path);
				return origWrite(path, bytes, opts);
			});

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				companion: {
					pattern: "invoices/{year}/{id}.pdf",
				},
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "companion-ws",
				backend,
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			// Companion failure prevents primary write
			backend.simulateError("invoices/2026/fail.pdf", "IO_FAILED", 1);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						{ year: "2026", id: "fail" },
						{ id: "fail", year: "2026", title: "Fail", amount: 10 },
						new Uint8Array([1, 2, 3]),
					),
				"IO_FAILED",
			);
			expect(await backend.exists("invoices/2026/fail.json")).toBe(false);

			// Successful writeWithCompanion writes companion before primary
			writeOrder.length = 0;
			await ws.collections.invoices.writeWithCompanion(
				{ year: "2026", id: "ok" },
				{ id: "ok", year: "2026", title: "OK", amount: 50 },
				new Uint8Array([9, 8, 7]),
			);
			const pdfIdx = writeOrder.indexOf("invoices/2026/ok.pdf");
			const jsonIdx = writeOrder.indexOf("invoices/2026/ok.json");
			expect(pdfIdx).toBeGreaterThanOrEqual(0);
			expect(jsonIdx).toBeGreaterThan(pdfIdx);

			expect(await ws.collections.invoices.hasCompanion({ year: "2026", id: "ok" })).toBe(true);
			const comp = await ws.collections.invoices.readCompanion({ year: "2026", id: "ok" });
			expect([...(comp?.bytes ?? [])]).toEqual([9, 8, 7]);
		});

		it("move() moves both primary and companion, rolls back primary if companion move fails, and delete() removes both", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				companion: {
					pattern: "invoices/{year}/{id}.pdf",
				},
			});
			const ws = createWorkspace({
				namespace: "companion-move-del-ws",
				backend,
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			await ws.collections.invoices.writeWithCompanion(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "Move Me", amount: 75 },
				new Uint8Array([4, 5, 6]),
			);

			// Simulate failure when moving companion -> primary move must roll back
			backend.simulateError("invoices/2026/2.pdf", "IO_FAILED", 1);
			await expectFsErrorCode(
				() => ws.collections.invoices.move({ year: "2026", id: "1" }, { year: "2026", id: "2" }),
				"IO_FAILED",
			);
			expect(await backend.exists("invoices/2026/1.json")).toBe(true);
			expect(await backend.exists("invoices/2026/2.json")).toBe(false);

			// Successful move moves both
			await ws.collections.invoices.move({ year: "2026", id: "1" }, { year: "2026", id: "2" });
			expect(await backend.exists("invoices/2026/1.json")).toBe(false);
			expect(await backend.exists("invoices/2026/1.pdf")).toBe(false);
			expect(await backend.exists("invoices/2026/2.json")).toBe(true);
			expect(await backend.exists("invoices/2026/2.pdf")).toBe(true);

			// delete() removes both primary and companion
			await ws.collections.invoices.delete({ year: "2026", id: "2" });
			expect(await backend.exists("invoices/2026/2.json")).toBe(false);
			expect(await backend.exists("invoices/2026/2.pdf")).toBe(false);
		});
	});

	describe("8. revalidateOnFocus, flush(), readLogs(), Emergency Logs", () => {
		it("throttles focus revalidation when mountStatus === 'ready' and supports flush/logs", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-15T12:00:00Z"));

			const backend = new MemoryFsBackend();
			const walkSpy = vi.spyOn(backend, "walkFiles");

			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const ws = createWorkspace({
				namespace: "focus-logs-ws",
				backend,
				revalidateOnFocus: { minIntervalMs: 5000 },
				singletons: { settings },
			});
			trackWorkspace(ws);
			await ws.restore();
			const baselineWalks = walkSpy.mock.calls.length;

			// First focus triggers incremental heal
			window.dispatchEvent(new Event("focus"));
			await vi.waitFor(() => {
				expect(walkSpy.mock.calls.length).toBeGreaterThan(baselineWalks);
			});
			const afterFirstFocus = walkSpy.mock.calls.length;

			// Immediate second focus within 5000ms is throttled
			vi.advanceTimersByTime(1000);
			window.dispatchEvent(new Event("focus"));
			await Promise.resolve();
			expect(walkSpy.mock.calls.length).toBe(afterFirstFocus);

			// Past minIntervalMs, visibilitychange(visible) triggers revalidation
			vi.advanceTimersByTime(5000);
			Object.defineProperty(document, "visibilityState", {
				value: "visible",
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
			await vi.waitFor(() => {
				expect(walkSpy.mock.calls.length).toBeGreaterThan(afterFirstFocus);
			});

			// Emergency logs & readLogs & flush
			backend.simulateError("settings.json", "IO_FAILED", 1);
			await expectFsErrorCode(
				() => ws.singletons.settings.write({ theme: "dark", currency: "EUR" }),
				"IO_FAILED",
			);
			expect(ws.getEmergencyLogs().length).toBeGreaterThan(0);
			ws.clearEmergencyLogs();
			expect(ws.getEmergencyLogs()).toHaveLength(0);

			await ws.flush();
			const logs = await ws.readLogs();
			expect(logs.some((entry) => entry.code === "IO_FAILED")).toBe(true);
		});
	});

	describe("9. Singleton Lifecycle, Hash Conflict Detection, Concurrent Activity & Edge Cases", () => {
		it("SingletonHandle.exists(), update(), and delete() enforce OCC under detect and allow last-write-wins", async () => {
			const backend = new MemoryFsBackend();
			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const ws = createWorkspace({
				namespace: "singleton-ops-ws",
				backend,
				conflictPolicy: "detect",
				singletons: { settings },
			});
			trackWorkspace(ws);
			await ws.restore();

			expect(await ws.singletons.settings.exists()).toBe(false);

			// update() from null creates the singleton
			await ws.singletons.settings.update((cur) => ({
				theme: cur?.theme ?? "light",
				currency: cur?.currency ?? "USD",
			}));
			expect(await ws.singletons.settings.exists()).toBe(true);

			// External SMB edit triggers CONFLICT on delete() under detect
			await backend.injectExternalFile(
				"settings.json",
				encodeJson({ theme: "smb", currency: "EUR" }),
			);
			await expectFsErrorCode(() => ws.singletons.settings.delete(), "CONFLICT");

			// update() under detect also catches concurrent edit during updater execution
			const gate = createDeferred<void>();
			const updatePromise = ws.singletons.settings.update(async (cur) => {
				await gate.promise;
				return {
					theme: cur?.theme ?? "dark",
					currency: "GBP",
				};
			});
			await backend.injectExternalFile(
				"settings.json",
				encodeJson({ theme: "concurrent", currency: "CHF" }),
			);
			gate.resolve();
			await expectFsErrorCode(() => updatePromise, "CONFLICT");

			// update() with conflictPolicy: "last-write-wins" succeeds despite external edit
			const lwwRes = await ws.singletons.settings.update(
				() => ({ theme: "forced", currency: "JPY" }),
				{ conflictPolicy: "last-write-wins" },
			);
			expect(lwwRes.path).toBe("settings.json");

			// delete() after reading current revision succeeds
			const latest = await ws.singletons.settings.read();
			await ws.singletons.settings.delete({ expectedRevision: latest?.revision });
			expect(await ws.singletons.settings.exists()).toBe(false);
		});

		it("detects same-size external SMB edit with identical lastModified via SHA-256 FileRevision.hash", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
			});
			const ws = createWorkspace({
				namespace: "hash-conflict-ws",
				backend,
				conflictPolicy: "detect",
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			const firstWrite = await ws.collections.invoices.write(
				{ year: "2026", id: "1" },
				{ id: "1", year: "2026", title: "AAAA", amount: 100 },
			);
			expect(firstWrite.revision.hash).toBeDefined();

			// Inject external edit with exact same byte length and identical lastModified
			const diskRead = await backend.readBytes("invoices/2026/1.json");
			const externalText = new TextDecoder().decode(diskRead.bytes).replace("AAAA", "BBBB");
			const externalBytes = new TextEncoder().encode(externalText);
			expect(externalBytes.byteLength).toBe(firstWrite.revision.size);
			await backend.injectExternalFile(
				"invoices/2026/1.json",
				externalBytes,
				firstWrite.revision.lastModified,
			);

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "1" },
						{ id: "1", year: "2026", title: "CCCC", amount: 100 },
					),
				"CONFLICT",
			);
		});

		it("keeps activity === 'writing' while any concurrent write is in flight, then returns to 'idle'", async () => {
			const backend = new MemoryFsBackend();
			const slowGate = createDeferred<void>();
			const origWrite = backend.writeBytes.bind(backend);
			vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				if (path === "invoices/2026/slow.json") {
					await slowGate.promise;
				}
				return origWrite(path, bytes, opts);
			});

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
			});
			const ws = createWorkspace({
				namespace: "concurrent-activity-ws",
				backend,
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			expect(ws.activity).toBe("idle");

			const slowPromise = ws.collections.invoices.write(
				{ year: "2026", id: "slow" },
				{ id: "slow", year: "2026", title: "Slow", amount: 1 },
			);
			const fastPromise = ws.collections.invoices.write(
				{ year: "2026", id: "fast" },
				{ id: "fast", year: "2026", title: "Fast", amount: 2 },
			);

			expect(ws.activity).toBe("writing");
			await fastPromise;
			// Slow write is still in flight, so activity must remain "writing"
			expect(ws.activity).toBe("writing");

			slowGate.resolve();
			await slowPromise;
			expect(ws.activity).toBe("idle");
		});

		it("handles denied/prompt requestAccess(), resolveConflict() error paths, and cross-partition move()", async () => {
			stubSupportedEnvironment();

			// requestAccess() stays needs-permission when requestPermission returns "denied" or "prompt"
			const deniedHandle = makeFakeDirHandle("denied-dir", {
				queryPermission: "prompt",
				requestPermission: "denied",
			});
			const idb = createMockIdbStore(deniedHandle);
			const permWs = createWorkspace({
				namespace: "perm-denied-ws",
				idbStore: idb,
			});
			trackWorkspace(permWs);
			expect(await permWs.restore()).toBe("needs-permission");
			expect(await permWs.requestAccess()).toBe("needs-permission");
			expect(permWs.mountStatus).toBe("needs-permission");

			const promptHandle = makeFakeDirHandle("prompt-dir", {
				queryPermission: "prompt",
				requestPermission: "prompt",
			});
			idb.saved = promptHandle;
			expect(await permWs.restore()).toBe("needs-permission");
			expect(await permWs.requestAccess()).toBe("needs-permission");

			// resolveConflict error paths & cross-partition move
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const ws = createWorkspace({
				namespace: "edge-cases-ws",
				backend,
				conflictPolicy: "detect",
				collections: { invoices },
			});
			trackWorkspace(ws);
			await ws.restore();

			await expectFsErrorCode(
				() => ws.resolveConflict("non-existent-id", "keep-local"),
				"NOT_FOUND",
			);

			await ws.collections.invoices.write(
				{ year: "2025", id: "1" },
				{ id: "1", year: "2025", title: "Base", amount: 10 },
			);
			await backend.injectExternalFile(
				"invoices/2025/1.json",
				encodeJson({ id: "1", year: "2025", title: "Remote", amount: 20 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2025", id: "1" },
						{ id: "1", year: "2025", title: "Local", amount: 30 },
					),
				"CONFLICT",
			);
			const conflictId = ws.unresolvedConflicts[0]?.id ?? "";
			await expectFsErrorCode(
				() => ws.resolveConflict(conflictId, "apply-custom"),
				"INVALID_CONFIG",
			);
			await ws.resolveConflict(conflictId, "keep-remote");

			// Cross-partition move (2025 -> 2026) updates entries and query() without ghost duplicates
			await ws.collections.invoices.move(
				{ year: "2025", id: "1" },
				{ year: "2026", id: "1" },
			);
			expect(ws.collections.invoices.entries).toHaveLength(1);
			expect(ws.collections.invoices.entries[0]?.path).toBe("invoices/2026/1.json");
			expect(ws.collections.invoices.query({ params: { year: "2025" } })).toHaveLength(0);
			expect(ws.collections.invoices.query({ params: { year: "2026" } })).toHaveLength(1);
		});
	});
});
