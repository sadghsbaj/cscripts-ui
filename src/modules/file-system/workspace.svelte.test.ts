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
	type HealReport,
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

async function readTextFromBackend(backend: MemoryFsBackend, path: string): Promise<string> {
	const result = await backend.readBytes(path);
	return new TextDecoder().decode(result.bytes);
}

async function readJsonFromBackend<T>(backend: MemoryFsBackend, path: string): Promise<T> {
	const text = await readTextFromBackend(backend, path);
	return JSON.parse(text) as T;
}

function setDocumentVisibility(state: DocumentVisibilityState): void {
	Object.defineProperty(document, "visibilityState", {
		value: state,
		configurable: true,
	});
	document.dispatchEvent(new Event("visibilitychange"));
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
	const originalLocationDescriptor = Object.getOwnPropertyDescriptor(window, "location");

	function trackWorkspace<T extends { destroy: () => void }>(ws: T): T {
		workspacesToDestroy.push(ws);
		return ws;
	}

	function stubWindowLocation(location: Pick<Location, "protocol" | "host">): void {
		Object.defineProperty(window, "location", {
			value: location,
			configurable: true,
		});
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
		if (originalLocationDescriptor) {
			Object.defineProperty(window, "location", originalLocationDescriptor);
		} else {
			delete (window as unknown as { location?: unknown }).location;
		}
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
		it("treats UNC file:// origin as unsupported even when browser APIs are present", async () => {
			stubSupportedEnvironment();
			stubWindowLocation({ protocol: "file:", host: "pfleiderer.loc" });

			const idbStore = createMockIdbStore(makeFakeDirHandle("vault"));
			const loadSpy = vi.spyOn(idbStore, "loadHandle");
			const saveSpy = vi.spyOn(idbStore, "saveHandle");
			const clearSpy = vi.spyOn(idbStore, "clearHandle");

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "unc-ws",
					autoRestore: true,
					idbStore,
				}),
			);

			expect(ws.mountStatus).toBe("unsupported");
			expect(await ws.restore()).toBe("unsupported");
			expect(loadSpy).not.toHaveBeenCalled();
			expect(saveSpy).not.toHaveBeenCalled();
			expect(clearSpy).not.toHaveBeenCalled();
			await expectFsErrorCode(() => ws.pick(), "UNSUPPORTED_ENV");
		});

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

		it("restore() does not overwrite unlinked state or mount backend if forget() runs while awaiting loadHandle()", async () => {
			stubSupportedEnvironment();
			const grantedHandle = makeFakeDirHandle("vault", { queryPermission: "granted" });
			const { promise: loadPromise, resolve: resolveLoad } =
				Promise.withResolvers<FileSystemDirectoryHandle | null>();
			const idb = createMockIdbStore(grantedHandle);
			idb.loadHandle = vi.fn(() => loadPromise);
			const createBackendSpy = vi.fn(() => new MemoryFsBackend());

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "restore-forget-race-ws",
					idbStore: idb,
					createBackend: createBackendSpy,
				}),
			);

			const restorePromise = ws.restore();
			await ws.forget();
			resolveLoad(grantedHandle);
			const result = await restorePromise;

			expect(result).toBe("unlinked");
			expect(ws.mountStatus).toBe("unlinked");
			expect(ws.lastError).toBeNull();
			expect(createBackendSpy).not.toHaveBeenCalled();
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

		it("directoryName is initially null for unlinked, unsupported, and injected backend workspaces", async () => {
			const unsupportedWs = trackWorkspace(createWorkspace({ namespace: "dir-unsupported-ws" }));
			expect(unsupportedWs.mountStatus).toBe("unsupported");
			expect(unsupportedWs.directoryName).toBeNull();

			const memoryWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-memory-ws",
					backend: new MemoryFsBackend(),
				}),
			);
			expect(memoryWs.mountStatus).toBe("ready");
			expect(memoryWs.directoryName).toBeNull();
			expect(await memoryWs.restore()).toBe("ready");
			expect(memoryWs.directoryName).toBeNull();

			stubSupportedEnvironment();
			const unlinkedWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-unlinked-ws",
					idbStore: createMockIdbStore(null),
				}),
			);
			expect(unlinkedWs.mountStatus).toBe("unlinked");
			expect(unlinkedWs.directoryName).toBeNull();
		});

		it("pick() updates directoryName on success and preserves previous directoryName on AbortError or saveHandle failure", async () => {
			const firstHandle = makeFakeDirHandle("first-folder");
			const secondHandle = makeFakeDirHandle("second-folder");
			const failingHandle = makeFakeDirHandle("failing-folder");

			const picker = vi
				.fn<() => Promise<FileSystemDirectoryHandle>>()
				.mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"))
				.mockResolvedValueOnce(failingHandle)
				.mockResolvedValueOnce(firstHandle)
				.mockRejectedValueOnce(new DOMException("Cancelled", "AbortError"))
				.mockResolvedValueOnce(secondHandle);

			stubSupportedEnvironment(picker);
			const idb = createMockIdbStore(null);
			const saveSpy = vi
				.spyOn(idb, "saveHandle")
				.mockRejectedValueOnce(new Error("IDB quota exceeded"));

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "dir-pick-ws",
					idbStore: idb,
					showDirectoryPicker: picker,
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			// AbortError when unlinked keeps directoryName === null
			expect(await ws.pick()).toBe("unlinked");
			expect(ws.directoryName).toBeNull();

			// saveHandle failure when unlinked keeps directoryName === null
			expect(await ws.pick()).toBe("unlinked");
			expect(ws.directoryName).toBeNull();
			expect(ws.lastError).not.toBeNull();

			// Successful pick sets directoryName
			expect(await ws.pick()).toBe("ready");
			expect(ws.directoryName).toBe("first-folder");

			// AbortError when already mounted preserves prior directoryName
			expect(await ws.pick()).toBe("ready");
			expect(ws.directoryName).toBe("first-folder");

			// saveHandle failure when already mounted preserves prior directoryName
			saveSpy.mockRejectedValueOnce(new Error("IDB write failed"));
			expect(await ws.pick()).toBe("ready");
			expect(ws.directoryName).toBe("first-folder");
		});

		it("restore() handles empty IDB, needs-permission, ready, and unexpected error fallback for directoryName", async () => {
			stubSupportedEnvironment();

			// Empty IDB -> null
			const emptyWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-restore-empty-ws",
					idbStore: createMockIdbStore(null),
				}),
			);
			expect(await emptyWs.restore()).toBe("unlinked");
			expect(emptyWs.directoryName).toBeNull();

			// needs-permission -> handle.name
			const promptHandle = makeFakeDirHandle("vault-prompt", { queryPermission: "prompt" });
			const promptWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-restore-prompt-ws",
					idbStore: createMockIdbStore(promptHandle),
				}),
			);
			expect(await promptWs.restore()).toBe("needs-permission");
			expect(promptWs.directoryName).toBe("vault-prompt");

			// ready -> handle.name
			const grantedHandle = makeFakeDirHandle("vault-ready", { queryPermission: "granted" });
			const readyWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-restore-ready-ws",
					idbStore: createMockIdbStore(grantedHandle),
					createBackend: () => new MemoryFsBackend(),
				}),
			);
			expect(await readyWs.restore()).toBe("ready");
			expect(readyWs.directoryName).toBe("vault-ready");

			// Unexpected restore error after handle load clears directoryName back to null
			const brokenHandle = makeFakeDirHandle("vault-broken") as FileSystemDirectoryHandle & {
				queryPermission: ReturnType<typeof vi.fn>;
			};
			brokenHandle.queryPermission.mockRejectedValueOnce(new Error("Permission query exploded"));
			const brokenWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-restore-error-ws",
					idbStore: createMockIdbStore(brokenHandle),
				}),
			);
			expect(await brokenWs.restore()).toBe("unlinked");
			expect(brokenWs.directoryName).toBeNull();
		});

		it("requestAccess() preserves directoryName across denied/prompt/ready and resets to null when handle is missing", async () => {
			stubSupportedEnvironment();

			// Missing handle -> unlinked & null
			const missingWs = trackWorkspace(
				createWorkspace({
					namespace: "dir-req-missing-ws",
					idbStore: createMockIdbStore(null),
				}),
			);
			expect(await missingWs.requestAccess()).toBe("unlinked");
			expect(missingWs.directoryName).toBeNull();

			// Denied, then prompt, then granted
			const handle = makeFakeDirHandle("reauth-folder", {
				queryPermission: "prompt",
			}) as FileSystemDirectoryHandle & {
				requestPermission: ReturnType<typeof vi.fn>;
			};
			const reqPermSpy = handle.requestPermission
				.mockResolvedValueOnce("denied")
				.mockResolvedValueOnce("prompt")
				.mockResolvedValueOnce("granted");

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "dir-req-ws",
					idbStore: createMockIdbStore(handle),
					createBackend: () => new MemoryFsBackend(),
				}),
			);
			expect(await ws.restore()).toBe("needs-permission");
			expect(ws.directoryName).toBe("reauth-folder");

			expect(await ws.requestAccess()).toBe("needs-permission");
			expect(ws.directoryName).toBe("reauth-folder");

			expect(await ws.requestAccess()).toBe("needs-permission");
			expect(ws.directoryName).toBe("reauth-folder");

			expect(await ws.requestAccess()).toBe("ready");
			expect(ws.directoryName).toBe("reauth-folder");
			expect(reqPermSpy).toHaveBeenCalledTimes(3);
		});

		it("forget() resets directoryName to null", async () => {
			stubSupportedEnvironment();
			const handle = makeFakeDirHandle("forgotten-folder", { queryPermission: "granted" });
			const ws = trackWorkspace(
				createWorkspace({
					namespace: "dir-forget-ws",
					idbStore: createMockIdbStore(handle),
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			expect(await ws.restore()).toBe("ready");
			expect(ws.directoryName).toBe("forgotten-folder");

			await ws.forget();
			expect(ws.mountStatus).toBe("unlinked");
			expect(ws.directoryName).toBeNull();
		});

		it("forget() or destroy() while pick() saveHandle() is pending does not leak the new directoryName", async () => {
			// Case 1: forget() during pending saveHandle()
			const newHandle1 = makeFakeDirHandle("leaked-on-forget");
			const picker1 = vi.fn(async () => newHandle1);
			stubSupportedEnvironment(picker1);

			const saveDeferred1 = createDeferred<void>();
			const idb1 = createMockIdbStore(null);
			idb1.saveHandle = vi.fn(() => saveDeferred1.promise);

			const ws1 = trackWorkspace(
				createWorkspace({
					namespace: "dir-race-forget-ws",
					idbStore: idb1,
					showDirectoryPicker: picker1,
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			const pickPromise1 = ws1.pick();
			await vi.waitFor(() => {
				expect(idb1.saveHandle).toHaveBeenCalledTimes(1);
			});

			await ws1.forget();
			saveDeferred1.resolve();
			expect(await pickPromise1).toBe("unlinked");
			expect(ws1.directoryName).toBeNull();

			// Case 2: destroy() during pending saveHandle()
			const newHandle2 = makeFakeDirHandle("leaked-on-destroy");
			const picker2 = vi.fn(async () => newHandle2);
			stubSupportedEnvironment(picker2);

			const saveDeferred2 = createDeferred<void>();
			const idb2 = createMockIdbStore(null);
			idb2.saveHandle = vi.fn(() => saveDeferred2.promise);

			const ws2 = trackWorkspace(
				createWorkspace({
					namespace: "dir-race-destroy-ws",
					idbStore: idb2,
					showDirectoryPicker: picker2,
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			const pickPromise2 = ws2.pick();
			await vi.waitFor(() => {
				expect(idb2.saveHandle).toHaveBeenCalledTimes(1);
			});

			ws2.destroy();
			saveDeferred2.resolve();
			expect(await pickPromise2).toBe("unlinked");
			expect(ws2.directoryName).toBeNull();
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

			// pending mutation -> isBusy true, health stays positive
			gateWrites = true;
			const pendingWrite = ws.singletons.settings.write({ theme: "dark", currency: "EUR" });
			expect(ws.pendingMutationCount).toBe(1);
			expect(ws.isBusy).toBe(true);
			expect(ws.activity).toBe("writing");
			expect(ws.health).toBe("positive");

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
				pollInterval: false,
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

	describe("10. Milestone 4 Hardening Regressions", () => {
		it("optimistic move() works with structurally distinct project() both with trackedDocs and from boot shard", async () => {
			interface NestedDoc {
				meta: {
					title: string;
					amount: number;
				};
			}
			interface DistinctProjected {
				label: string;
			}
			const nestedSchema: StandardSchemaV1<unknown, NestedDoc> = {
				"~standard": {
					version: 1,
					vendor: "test",
					validate(value: unknown) {
						if (
							typeof value === "object" &&
							value !== null &&
							typeof (value as NestedDoc).meta?.title === "string" &&
							typeof (value as NestedDoc).meta?.amount === "number"
						) {
							return { value: value as NestedDoc };
						}
						return { issues: [{ message: "Invalid NestedDoc" }] };
					},
				},
			};

			const backend = new MemoryFsBackend();
			const distinctCollection = defineCollection({
				pattern: "items/{year}/{id}.json",
				adapter: jsonAdapter({ schema: nestedSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
					project: (doc, params): DistinctProjected => ({
						label: `${params.year}:${doc.meta.title}`,
					}),
				},
			});

			// Case A: trackedDocs has the raw doc (written in current session)
			const ws1 = trackWorkspace(
				createWorkspace({
					namespace: "distinct-project-ws",
					backend,
					collections: { items: distinctCollection },
				}),
			);
			await ws1.restore();

			await ws1.collections.items.write(
				{ year: "2024", id: "a" },
				{ meta: { title: "Alpha", amount: 100 } },
			);

			const moveGate1 = createDeferred<void>();
			const origMove1 = backend.moveFile.bind(backend);
			const moveSpy1 = vi.spyOn(backend, "moveFile").mockImplementation(async (from, to) => {
				await moveGate1.promise;
				return origMove1(from, to);
			});

			const movePromise1 = ws1.collections.items.move(
				{ year: "2024", id: "a" },
				{ year: "2025", id: "a" },
			);
			// Optimistic entry should already reflect the new projected label without throwing
			await vi.waitFor(() => {
				expect(ws1.collections.items.entries[0]?.path).toBe("items/2025/a.json");
			});
			expect(ws1.collections.items.entries[0]?.data).toEqual({ label: "2025:Alpha" });
			expect(Object.values(ws1.collections.items.entries[0]?.data ?? {})).not.toContain(undefined);

			moveGate1.resolve();
			await movePromise1;
			moveSpy1.mockRestore();
			expect(ws1.collections.items.entries).toHaveLength(1);
			expect(ws1.collections.items.entries[0]?.data).toEqual({ label: "2025:Alpha" });

			// Persist shard and tear down ws1 so ws2 boots purely from shard without trackedDocs
			await ws1.flush();
			ws1.destroy();

			// Case B: entry loaded only from boot shard (trackedDocs is empty)
			const ws2 = trackWorkspace(
				createWorkspace({
					namespace: "distinct-project-ws",
					backend,
					collections: { items: distinctCollection },
				}),
			);
			await ws2.restore();
			expect(ws2.collections.items.entries).toHaveLength(1);
			expect(ws2.collections.items.entries[0]?.data).toEqual({ label: "2025:Alpha" });

			const moveGate2 = createDeferred<void>();
			const origMove2 = backend.moveFile.bind(backend);
			const moveSpy2 = vi.spyOn(backend, "moveFile").mockImplementation(async (from, to) => {
				await moveGate2.promise;
				return origMove2(from, to);
			});

			const movePromise2 = ws2.collections.items.move(
				{ year: "2025", id: "a" },
				{ year: "2026", id: "a" },
			);
			await vi.waitFor(() => {
				expect(ws2.collections.items.entries[0]?.path).toBe("items/2026/a.json");
			});
			// During in-flight move without trackedDocs, optimistic entry must not throw or corrupt fields
			expect(ws2.collections.items.entries[0]?.data).toBeDefined();
			expect(Object.values(ws2.collections.items.entries[0]?.data ?? {})).not.toContain(undefined);

			moveGate2.resolve();
			await movePromise2;
			moveSpy2.mockRestore();

			expect(ws2.collections.items.entries).toHaveLength(1);
			expect(ws2.collections.items.entries[0]?.path).toBe("items/2026/a.json");
			expect(ws2.collections.items.entries[0]?.data).toEqual({ label: "2026:Alpha" });
		});

		it("writeWithCompanion() aborts on invalid primary data or primary CONFLICT before overwriting existing companion", async () => {
			const backend = new MemoryFsBackend();
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

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "companion-precheck-ws",
					backend,
					conflictPolicy: "detect",
					collections: { invoices },
				}),
			);
			await ws.restore();

			const params = { year: "2025", id: "inv-1" };
			const originalCompanion = new TextEncoder().encode("original-pdf-bytes");
			await ws.collections.invoices.writeWithCompanion(
				params,
				{ id: "inv-1", year: "2025", title: "Valid", amount: 10 },
				originalCompanion,
			);

			// 1) Invalid primary data -> VALIDATION_FAILED before overwriting companion
			const invalidDoc = undefined as unknown as InvoiceDoc;
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						params,
						invalidDoc,
						new TextEncoder().encode("overwritten-on-invalid"),
					),
				"VALIDATION_FAILED",
			);
			const companionAfterInvalid = await backend.readBytes("invoices/2025/inv-1.pdf");
			expect(new TextDecoder().decode(companionAfterInvalid.bytes)).toBe("original-pdf-bytes");

			// 2) Primary OCC conflict -> CONFLICT before overwriting companion
			await backend.injectExternalFile(
				"invoices/2025/inv-1.json",
				encodeJson({ id: "inv-1", year: "2025", title: "External Edit", amount: 99 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						params,
						{ id: "inv-1", year: "2025", title: "Local Edit", amount: 50 },
						new TextEncoder().encode("overwritten-on-conflict"),
					),
				"CONFLICT",
			);
			const companionAfterConflict = await backend.readBytes("invoices/2025/inv-1.pdf");
			expect(new TextDecoder().decode(companionAfterConflict.bytes)).toBe("original-pdf-bytes");
		});

		it("collection.write() and collection.update() preserve companionStatus: 'present' in entries and persisted shard", async () => {
			const backend = new MemoryFsBackend();
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

			const ws1 = trackWorkspace(
				createWorkspace({
					namespace: "companion-preserve-ws",
					backend,
					collections: { invoices },
				}),
			);
			await ws1.restore();

			const params = { year: "2025", id: "c1" };
			await ws1.collections.invoices.writeWithCompanion(
				params,
				{ id: "c1", year: "2025", title: "Initial", amount: 10 },
				new TextEncoder().encode("pdf-data"),
			);
			expect(ws1.collections.invoices.entries[0]?.companionStatus).toBe("present");

			// JSON-only write()
			await ws1.collections.invoices.write(params, {
				id: "c1",
				year: "2025",
				title: "After Write",
				amount: 20,
			});
			expect(ws1.collections.invoices.entries[0]?.companionStatus).toBe("present");

			// JSON-only update()
			await ws1.collections.invoices.update(params, (prev) => ({
				id: prev?.id ?? "c1",
				year: prev?.year ?? "2025",
				title: "After Update",
				amount: 30,
			}));
			expect(ws1.collections.invoices.entries[0]?.companionStatus).toBe("present");

			await ws1.flush();
			ws1.destroy();

			// Verify persisted shard also preserved companionStatus: "present"
			const ws2 = trackWorkspace(
				createWorkspace({
					namespace: "companion-preserve-ws",
					backend,
					collections: { invoices },
				}),
			);
			await ws2.restore();
			expect(ws2.collections.invoices.entries).toHaveLength(1);
			expect(ws2.collections.invoices.entries[0]?.companionStatus).toBe("present");
		});

		it("resolveConflict() refreshes unresolvedConflicts on a second CONFLICT and succeeds on retry", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "resolve-refresh-ws",
					backend,
					conflictPolicy: "detect",
					collections: { invoices },
				}),
			);
			await ws.restore();

			const params = { year: "2025", id: "r1" };
			await ws.collections.invoices.write(params, {
				id: "r1",
				year: "2025",
				title: "Base",
				amount: 1,
			});

			// First external edit -> triggers first conflict
			const extRev1 = await backend.injectExternalFile(
				"invoices/2025/r1.json",
				encodeJson({ id: "r1", year: "2025", title: "Remote-1", amount: 2 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(params, {
						id: "r1",
						year: "2025",
						title: "Local",
						amount: 3,
					}),
				"CONFLICT",
			);

			expect(ws.unresolvedConflicts).toHaveLength(1);
			const conflictId = ws.unresolvedConflicts[0]?.id ?? "";
			expect(ws.unresolvedConflicts[0]?.remoteRevision?.lastModified).toBe(extRev1.lastModified);

			// Second external edit while conflict is open
			const extRev2 = await backend.injectExternalFile(
				"invoices/2025/r1.json",
				encodeJson({ id: "r1", year: "2025", title: "Remote-2", amount: 4 }),
			);

			// First resolve attempt fails with CONFLICT and refreshes conflict details to Remote-2
			await expectFsErrorCode(
				() => ws.resolveConflict(conflictId, "keep-local"),
				"CONFLICT",
			);
			expect(ws.unresolvedConflicts).toHaveLength(1);
			expect(ws.unresolvedConflicts[0]?.remoteRevision?.lastModified).toBe(extRev2.lastModified);
			expect(ws.unresolvedConflicts[0]?.remote).toEqual({
				id: "r1",
				year: "2025",
				title: "Remote-2",
				amount: 4,
			});

			// Second resolve attempt uses refreshed remoteRevision and succeeds
			await ws.resolveConflict(conflictId, "keep-local");
			expect(ws.unresolvedConflicts).toHaveLength(0);
			const finalDoc = await ws.collections.invoices.read(params);
			expect(finalDoc?.data).toEqual({ id: "r1", year: "2025", title: "Local", amount: 3 });
		});

		it("forget() increments mountEpoch so an in-flight failing write does not resurrect state or set lastError", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "forget-epoch-ws",
					backend,
					collections: { invoices },
				}),
			);
			await ws.restore();

			const writeGate = createDeferred<never>();
			const writeSpy = vi.spyOn(backend, "writeBytes").mockImplementation(async () => {
				return writeGate.promise;
			});

			const pendingWrite = ws.collections.invoices.write(
				{ year: "2025", id: "f1" },
				{ id: "f1", year: "2025", title: "InFlight", amount: 10 },
			);

			await vi.waitFor(() => {
				expect(writeSpy).toHaveBeenCalled();
			});

			await ws.forget();
			expect(ws.mountStatus).toBe("unlinked");
			expect(ws.lastError).toBeNull();

			writeGate.reject(new FsError("IO_FAILED", "Simulated disk failure after forget"));
			await expectFsErrorCode(() => pendingWrite, "IO_FAILED");

			expect(ws.mountStatus).toBe("unlinked");
			expect(ws.lastError).toBeNull();
			expect(ws.collections.invoices.entries).toHaveLength(0);
		});

		it("heal() ABORTED (via external AbortSignal or superseded heal()) does not set lastError or health = 'negative'", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "heal-abort-ws",
					backend,
					collections: { invoices },
				}),
			);
			await ws.restore();

			// Gate backend.walkFiles so heal() stays in flight until we abort
			const walkGate = createDeferred<void>();
			const origWalk = backend.walkFiles.bind(backend);
			const walkSpy = vi
				.spyOn(backend, "walkFiles")
				.mockImplementation(async (prefix, options) => {
					await walkGate.promise;
					if (options?.signal?.aborted) {
						throw new FsError("ABORTED", "Aborted");
					}
					return origWalk(prefix, options);
				});

			// 1) External AbortSignal
			const controller = new AbortController();
			const heal1 = ws.heal({ mode: "full", signal: controller.signal });
			await vi.waitFor(() => {
				expect(walkSpy).toHaveBeenCalledTimes(1);
			});
			controller.abort();
			walkGate.resolve();

			await expectFsErrorCode(() => heal1, "ABORTED");
			expect(ws.lastError).toBeNull();
			expect(ws.health).not.toBe("negative");

			// 2) Superseded second heal()
			const walkGate2 = createDeferred<void>();
			walkSpy.mockImplementationOnce(async (prefix, options) => {
				await walkGate2.promise;
				if (options?.signal?.aborted) {
					throw new FsError("ABORTED", "Superseded");
				}
				return origWalk(prefix, options);
			});
			walkSpy.mockImplementationOnce(async (prefix, options) => origWalk(prefix, options));

			const supersededHeal = ws.heal({ mode: "full" });
			await vi.waitFor(() => {
				expect(walkSpy).toHaveBeenCalledTimes(2);
			});
			const winningHeal = ws.heal({ mode: "full" });
			walkGate2.resolve();

			await expectFsErrorCode(() => supersededHeal, "ABORTED");
			await winningHeal;
			expect(ws.lastError).toBeNull();
			expect(ws.health).not.toBe("negative");
		});

		it("writeRaw() updates indexed entries, list() respects config.ignore, mode: 'read' blocks mutations & _cs-fs writes, and pagehide/visibilitychange flushes buffers", async () => {
			// A) writeRaw() updates indexed entries (and removes stale entry on invalid bytes)
			const backendA = new MemoryFsBackend();
			const invoicesA = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const wsA = trackWorkspace(
				createWorkspace({
					namespace: "writeraw-index-ws",
					backend: backendA,
					ignore: ["ignored"],
					collections: { invoices: invoicesA },
				}),
			);
			await wsA.restore();

			await wsA.collections.invoices.writeRaw(
				{ year: "2025", id: "raw1" },
				encodeJson({ id: "raw1", year: "2025", title: "Raw Title", amount: 42 }),
			);
			expect(wsA.collections.invoices.entries).toHaveLength(1);
			expect(wsA.collections.invoices.entries[0]?.data).toEqual({
				id: "raw1",
				year: "2025",
				title: "Raw Title",
				amount: 42,
			});

			// Overwrite with invalid JSON -> stale entry removed from entries
			await wsA.collections.invoices.writeRaw(
				{ year: "2025", id: "raw1" },
				new TextEncoder().encode("{not-valid-json"),
				{ conflictPolicy: "last-write-wins" },
			);
			expect(wsA.collections.invoices.entries).toHaveLength(0);

			// B) collection.list() respects config.ignore
			await backendA.injectExternalFile(
				"invoices/ignored/skip.json",
				encodeJson({ id: "skip", year: "ignored", title: "Skip", amount: 0 }),
			);
			await backendA.injectExternalFile(
				"invoices/2025/keep.json",
				encodeJson({ id: "keep", year: "2025", title: "Keep", amount: 5 }),
			);
			const listed = await wsA.collections.invoices.list();
			expect(listed.map((item) => item.path)).toEqual([
				"invoices/2025/keep.json",
				"invoices/2025/raw1.json",
			]);

			// C) mode: "read" throws PERMISSION_DENIED on all mutations, skips eager migration write-back, and writes no _cs-fs/ files
			const backendRead = new MemoryFsBackend();
			const legacyBytes = encodeJson({
				id: "m1",
				year: "2025",
				title: "Legacy",
				amount: 10,
				schemaVersion: 1,
			});
			await backendRead.injectExternalFile("invoices/2025/m1.json", legacyBytes);
			await backendRead.injectExternalFile("settings.json", encodeJson({ theme: "dark", currency: "EUR" }));

			const migratingCollection = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter<InvoiceDoc>({
					schema: invoiceSchema,
					version: 2,
					minVersion: 1,
					migrationWriteBack: "eager",
					migrations: {
						1: (raw) => {
							const rec = raw as Record<string, unknown>;
							return {
								id: String(rec.id),
								year: String(rec.year),
								title: `${String(rec.title)}-migrated`,
								amount: Number(rec.amount),
							};
						},
					},
				}),
				companion: {
					pattern: "invoices/{year}/{id}.pdf",
				},
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});
			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});

			const wsRead = trackWorkspace(
				createWorkspace({
					namespace: "read-mode-ws",
					backend: backendRead,
					mode: "read",
					collections: { invoices: migratingCollection },
					singletons: { settings },
				}),
			);
			await wsRead.restore();
			await wsRead.heal({ mode: "full" });

			// Eager migration write-back must be skipped in read mode: file on disk stays untouched
			const diskAfterHeal = await backendRead.readBytes("invoices/2025/m1.json");
			expect(diskAfterHeal.bytes).toEqual(legacyBytes);

			// Reading the legacy v1 doc returns migrated v2 data cleanly without writing back or raising errors
			const migratedRead = await wsRead.collections.invoices.read({ year: "2025", id: "m1" });
			expect(migratedRead?.migrated).toBe(true);
			expect(migratedRead?.data).toEqual({
				id: "m1",
				year: "2025",
				title: "Legacy-migrated",
				amount: 10,
				schemaVersion: 2,
			});
			expect(wsRead.lastError).toBeNull();
			expect(wsRead.mountStatus).toBe("ready");
			const diskAfterRead = await backendRead.readBytes("invoices/2025/m1.json");
			expect(diskAfterRead.bytes).toEqual(legacyBytes);

			// No _cs-fs/ cache or log files written in read mode
			const systemFiles = await backendRead.listDir("_cs-fs");
			expect(systemFiles).toHaveLength(0);

			// All write/mutation methods throw PERMISSION_DENIED
			await expectFsErrorCode(
				() =>
					wsRead.collections.invoices.write(
						{ year: "2025", id: "x" },
						{ id: "x", year: "2025", title: "X", amount: 1 },
					),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() =>
					wsRead.collections.invoices.update({ year: "2025", id: "m1" }, (doc) => ({
						id: doc?.id ?? "m1",
						year: doc?.year ?? "2025",
						title: doc?.title ?? "M1",
						amount: doc?.amount ?? 1,
					})),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() =>
					wsRead.collections.invoices.move(
						{ year: "2025", id: "m1" },
						{ year: "2026", id: "m1" },
					),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() => wsRead.collections.invoices.delete({ year: "2025", id: "m1" }),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() =>
					wsRead.collections.invoices.writeRaw(
						{ year: "2025", id: "x" },
						encodeJson({ id: "x", year: "2025", title: "X", amount: 1 }),
					),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() =>
					wsRead.collections.invoices.writeWithCompanion(
						{ year: "2025", id: "x" },
						{ id: "x", year: "2025", title: "X", amount: 1 },
						new Uint8Array([1, 2, 3]),
					),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() => wsRead.resolveConflict("any-id", "keep-local"),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() => wsRead.singletons.settings.write({ theme: "light", currency: "USD" }),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() =>
					wsRead.singletons.settings.update((prev) => ({
						theme: prev?.theme ?? "dark",
						currency: prev?.currency ?? "EUR",
					})),
				"PERMISSION_DENIED",
			);
			await expectFsErrorCode(
				() => wsRead.singletons.settings.delete(),
				"PERMISSION_DENIED",
			);

			// D) pagehide & visibilitychange: hidden trigger best-effort flush of buffered cache/log timers
			const backendFlush = new MemoryFsBackend();
			const flushInvoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (params) => params.year ?? "unknown" },
			});
			const wsFlush = trackWorkspace(
				createWorkspace({
					namespace: "lifecycle-flush-ws",
					backend: backendFlush,
					collections: {
						invoices: flushInvoices,
					},
				}),
			);
			await wsFlush.restore();

			await wsFlush.collections.invoices.write(
				{ year: "2025", id: "p1" },
				{ id: "p1", year: "2025", title: "PageHide", amount: 10 },
			);
			// Debounce timer hasn't fired yet -> cache shard should not be on disk yet
			expect(await backendFlush.listDir("_cs-fs/index")).toHaveLength(0);

			window.dispatchEvent(new Event("pagehide"));
			await vi.waitFor(async () => {
				const indexFiles = await backendFlush.listDir("_cs-fs/index");
				expect(indexFiles.length).toBeGreaterThan(0);
			});

			// Now write another entry and trigger visibilitychange -> hidden
			await wsFlush.collections.invoices.write(
				{ year: "2025", id: "p2" },
				{ id: "p2", year: "2025", title: "VisHidden", amount: 20 },
			);
			Object.defineProperty(document, "visibilityState", {
				value: "hidden",
				configurable: true,
			});
			document.dispatchEvent(new Event("visibilitychange"));
			await vi.waitFor(async () => {
				const logs = await backendFlush.listDir("_cs-fs/logs");
				expect(logs.length).toBeGreaterThan(0);
			});
			Object.defineProperty(document, "visibilityState", {
				value: "visible",
				configurable: true,
			});
		});
	});

	describe("11. Final Fix Regressions", () => {
		it("writeRaw() falls back to cacheEngine revision after reload/boot and still detects external conflicts", async () => {
			const backend = new MemoryFsBackend();
			const invoicesCol = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});

			const ws1 = trackWorkspace(
				createWorkspace({
					namespace: "write-raw-rev-fallback",
					backend,
					collections: { invoices: invoicesCol },
				}),
			);
			await ws1.restore();
			await ws1.collections.invoices.write(
				{ year: "2025", id: "raw-1" },
				{ id: "raw-1", year: "2025", title: "Initial", amount: 100 },
			);
			await ws1.flush();
			ws1.destroy();

			// Boot a fresh workspace over the same backend: trackedDocs is empty, cacheEngine has the revision
			const ws2 = trackWorkspace(
				createWorkspace({
					namespace: "write-raw-rev-fallback",
					backend,
					collections: { invoices: invoicesCol },
				}),
			);
			await ws2.restore();

			const updatedBytes = encodeJson({
				id: "raw-1",
				year: "2025",
				title: "Updated Raw",
				amount: 250,
			});
			const writeRes = await ws2.collections.invoices.writeRaw(
				{ year: "2025", id: "raw-1" },
				updatedBytes,
				{ conflictPolicy: "detect" },
			);
			expect(writeRes.path).toBe("invoices/2025/raw-1.json");
			const readBack = await ws2.collections.invoices.read({ year: "2025", id: "raw-1" });
			expect(readBack?.data.title).toBe("Updated Raw");

			// Simulate an external edit on disk -> stale writeRaw must still throw CONFLICT
			await backend.injectExternalFile(
				"invoices/2025/raw-1.json",
				encodeJson({ id: "raw-1", year: "2025", title: "External Edit", amount: 999 }),
			);
			await expectFsErrorCode(
				() =>
					ws2.collections.invoices.writeRaw(
						{ year: "2025", id: "raw-1" },
						encodeJson({ id: "raw-1", year: "2025", title: "Stale Raw", amount: 300 }),
						{ conflictPolicy: "detect" },
					),
				"CONFLICT",
			);
		});

		it("writeWithCompanion() rolls back existing or newly created companion on TOCTOU primary CONFLICT", async () => {
			const backend = new MemoryFsBackend();
			const invoicesCol = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				companion: { pattern: "invoices/{year}/{id}.pdf" },
				index: {
					partitionBy: (params) => params.year ?? "unknown",
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "companion-rollback-ws",
					backend,
					collections: { invoices: invoicesCol },
				}),
			);
			await ws.restore();

			// Case A: existing companion "old-pdf" must be restored if primary hits TOCTOU CONFLICT
			await ws.collections.invoices.writeWithCompanion(
				{ year: "2025", id: "c1" },
				{ id: "c1", year: "2025", title: "Original", amount: 10 },
				new TextEncoder().encode("old-pdf"),
			);

			const origWriteBytes = backend.writeBytes.bind(backend);
			let injectTarget: string | null = "invoices/2025/c1.pdf";
			let injectPrimaryPath = "invoices/2025/c1.json";
			const writeSpy = vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				const rev = await origWriteBytes(path, bytes, opts);
				if (injectTarget !== null && path === injectTarget) {
					injectTarget = null;
					await backend.injectExternalFile(
						injectPrimaryPath,
						encodeJson({ id: "external", year: "2025", title: "External TOCTOU", amount: 999 }),
					);
				}
				return rev;
			});

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						{ year: "2025", id: "c1" },
						{ id: "c1", year: "2025", title: "Local Update", amount: 20 },
						new TextEncoder().encode("new-pdf"),
					),
				"CONFLICT",
			);
			const rolledBackPdf = await backend.readBytes("invoices/2025/c1.pdf");
			expect(new TextDecoder().decode(rolledBackPdf.bytes)).toBe("old-pdf");

			// Case B: no companion existed previously -> newly created companion must be deleted on TOCTOU CONFLICT
			await ws.collections.invoices.write(
				{ year: "2025", id: "c2" },
				{ id: "c2", year: "2025", title: "No Companion Yet", amount: 30 },
			);
			injectTarget = "invoices/2025/c2.pdf";
			injectPrimaryPath = "invoices/2025/c2.json";

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						{ year: "2025", id: "c2" },
						{ id: "c2", year: "2025", title: "Local With New Pdf", amount: 40 },
						new TextEncoder().encode("brand-new-pdf"),
					),
				"CONFLICT",
			);
			expect(await backend.exists("invoices/2025/c2.pdf")).toBe(false);
			writeSpy.mockRestore();
		});

		it("pick() aborts cleanly without saving handle or creating backend if destroyed while picker() is pending", async () => {
			stubSupportedEnvironment();
			const { promise: pickerPromise, resolve: resolvePicker } =
				Promise.withResolvers<FileSystemDirectoryHandle>();
			const { promise: pickerCalled, resolve: markPickerCalled } = Promise.withResolvers<void>();

			const idbStore = createMockIdbStore();
			const saveHandleSpy = vi.spyOn(idbStore, "saveHandle");
			const createBackendSpy = vi.fn(() => new MemoryFsBackend());

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "pick-destroyed-guard",
					idbStore,
					createBackend: createBackendSpy,
					showDirectoryPicker: () => {
						markPickerCalled();
						return pickerPromise;
					},
				}),
			);

			const pickPromise = ws.pick();
			await pickerCalled;

			ws.destroy();
			resolvePicker(makeFakeDirHandle("picked-after-destroy"));

			const status = await pickPromise;
			expect(status).toBe("unlinked");
			expect(ws.mountStatus).toBe("unlinked");
			expect(saveHandleSpy).not.toHaveBeenCalled();
			expect(createBackendSpy).not.toHaveBeenCalled();
		});

		it("defineCollection() throws FsError(INVALID_CONFIG) when companion.pattern omits a primary template param", () => {
			let caught: unknown;
			try {
				defineCollection({
					pattern: "orders/{year}/{id}.json",
					adapter: jsonAdapter({ schema: invoiceSchema }),
					companion: { pattern: "assets/{id}.pdf" },
				});
			} catch (error) {
				caught = error;
			}
			expect(isFsError(caught)).toBe(true);
			if (isFsError(caught)) {
				expect(caught.code).toBe("INVALID_CONFIG");
			}
		});

		it("pick() clears old trackedDocs/unresolvedConflicts, keeps pendingMutationCount consistent across in-flight mutations, and does not orphan pendingMutations when saveHandle fails", async () => {
			stubSupportedEnvironment();
			const backendA = new MemoryFsBackend();
			const backendB = new MemoryFsBackend();
			const handleA = makeFakeDirHandle("dir-a");
			const handleB = makeFakeDirHandle("dir-b");
			const idbStore = createMockIdbStore();

			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "unknown" },
			});

			let nextHandle = handleA;
			let nextBackend = backendA;
			const ws = trackWorkspace(
				createWorkspace({
					namespace: "pick-switch-cleanup-ws",
					idbStore,
					showDirectoryPicker: async () => nextHandle,
					createBackend: () => nextBackend,
					singletons: { settings },
					collections: { invoices },
				}),
			);

			await ws.pick();
			expect(ws.mountStatus).toBe("ready");

			// Populate trackedDocs and unresolvedConflicts in Dir A
			await ws.singletons.settings.write({ theme: "dark", currency: "EUR" });
			const invRev = await ws.collections.invoices.write(
				{ year: "2025", id: "1" },
				{ id: "1", year: "2025", title: "Local", amount: 10 },
			);
			await backendA.injectExternalFile(
				"invoices/2025/1.json",
				encodeJson({ id: "1", year: "2025", title: "External", amount: 99 }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2025", id: "1" },
						{ id: "1", year: "2025", title: "Local2", amount: 20 },
						{ expectedRevision: invRev.revision, conflictPolicy: "detect" },
					),
				"CONFLICT",
			);
			expect(ws.unresolvedConflicts).toHaveLength(1);

			// Seed Dir B with a different settings.json (so if Dir A's trackedDocs leaked, delete() would CONFLICT)
			await backendB.injectExternalFile(
				"settings.json",
				encodeJson({ theme: "light", currency: "USD" }),
			);

			// Start an in-flight mutation in Dir A and gate its writeBytes
			const { promise: writeStarted, resolve: markWriteStarted } = Promise.withResolvers<void>();
			const { promise: writeGate, resolve: releaseWrite } = Promise.withResolvers<void>();
			const origWriteA = backendA.writeBytes.bind(backendA);
			vi.spyOn(backendA, "writeBytes").mockImplementationOnce(async (path, bytes, opts) => {
				markWriteStarted();
				await writeGate;
				return origWriteA(path, bytes, opts);
			});

			const inFlightA = ws.collections.invoices.write(
				{ year: "2025", id: "2" },
				{ id: "2", year: "2025", title: "InFlight", amount: 5 },
			);
			await writeStarted;
			expect(ws.pendingMutationCount).toBe(1);
			expect(ws.isBusy).toBe(true);

			// Switch to Dir B while Dir A's mutation is in-flight
			nextHandle = handleB;
			nextBackend = backendB;
			const statusB = await ws.pick();
			expect(statusB).toBe("ready");
			expect(ws.pendingMutationCount).toBe(0);
			expect(ws.unresolvedConflicts).toEqual([]);

			// Release Dir A's stale write; it must not re-dirty Dir B's pendingMutationCount or isBusy
			releaseWrite();
			await inFlightA;
			expect(ws.pendingMutationCount).toBe(0);
			expect(ws.isBusy).toBe(false);
			expect(ws.unresolvedConflicts).toEqual([]);

			// Old Dir A trackedDocs for settings.json were cleared, so delete() in Dir B succeeds without Dir A's revision
			await ws.singletons.settings.delete();
			expect(await backendB.exists("settings.json")).toBe(false);

			// Now test pick() failing in saveHandle while already mounted on Dir B with an in-flight mutation
			const { promise: bWriteStarted, resolve: markBWriteStarted } = Promise.withResolvers<void>();
			const { promise: bWriteGate, resolve: releaseBWrite } = Promise.withResolvers<void>();
			const origWriteB = backendB.writeBytes.bind(backendB);
			vi.spyOn(backendB, "writeBytes").mockImplementationOnce(async (path, bytes, opts) => {
				markBWriteStarted();
				await bWriteGate;
				return origWriteB(path, bytes, opts);
			});

			const inFlightB = ws.collections.invoices.write(
				{ year: "2026", id: "3" },
				{ id: "3", year: "2026", title: "PendingOnB", amount: 15 },
			);
			await bWriteStarted;
			expect(ws.pendingMutationCount).toBe(1);

			vi.spyOn(idbStore, "saveHandle").mockRejectedValueOnce(new Error("IDB quota exceeded"));
			const failedPickStatus = await ws.pick();
			expect(failedPickStatus).toBe("ready");
			expect(ws.lastError?.code).toBe("IO_FAILED");

			// Existing mount's in-flight mutation completes cleanly without orphaning pendingMutations
			releaseBWrite();
			await inFlightB;
			expect(ws.pendingMutationCount).toBe(0);
			expect(ws.isBusy).toBe(false);
		});

		it("pick() failing (saveHandle rejects) while restore() is in restoring state falls back cleanly instead of staying stuck in restoring", async () => {
			stubSupportedEnvironment();

			// Case A: directoryHandle is null -> falls back to "unlinked"
			const { promise: loadGate, resolve: releaseLoad } =
				Promise.withResolvers<FileSystemDirectoryHandle | null>();
			const { promise: loadStarted, resolve: markLoadStarted } = Promise.withResolvers<void>();

			const idbA = createMockIdbStore();
			vi.spyOn(idbA, "loadHandle").mockImplementationOnce(async () => {
				markLoadStarted();
				return loadGate;
			});
			vi.spyOn(idbA, "saveHandle").mockRejectedValueOnce(new Error("IDB save failed"));

			const wsA = trackWorkspace(
				createWorkspace({
					namespace: "pick-fail-during-restore-unlinked",
					idbStore: idbA,
					showDirectoryPicker: async () => makeFakeDirHandle("picked"),
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			const restoreA = wsA.restore();
			await loadStarted;
			expect(wsA.mountStatus).toBe("restoring");

			const pickStatusA = await wsA.pick();
			expect(pickStatusA).toBe("unlinked");
			expect(wsA.mountStatus).toBe("unlinked");
			expect(wsA.lastError?.code).toBe("IO_FAILED");

			releaseLoad(null);
			await restoreA;
			expect(wsA.mountStatus).toBe("unlinked");

			// Case B: directoryHandle is already set -> falls back to "needs-permission"
			const { promise: permGate, resolve: releasePerm } = Promise.withResolvers<PermissionState>();
			const { promise: permStarted, resolve: markPermStarted } = Promise.withResolvers<void>();
			const handleWithGatedPerm = {
				...makeFakeDirHandle("restored-dir"),
				queryPermission: vi.fn(async () => {
					markPermStarted();
					return permGate;
				}),
			} as unknown as FileSystemDirectoryHandle;

			const idbB = createMockIdbStore(handleWithGatedPerm);
			vi.spyOn(idbB, "saveHandle").mockRejectedValueOnce(new Error("IDB save failed"));

			const wsB = trackWorkspace(
				createWorkspace({
					namespace: "pick-fail-during-restore-perm",
					idbStore: idbB,
					showDirectoryPicker: async () => makeFakeDirHandle("picked-2"),
					createBackend: () => new MemoryFsBackend(),
				}),
			);

			const restoreB = wsB.restore();
			await permStarted;
			expect(wsB.mountStatus).toBe("restoring");

			const pickStatusB = await wsB.pick();
			expect(pickStatusB).toBe("needs-permission");
			expect(wsB.mountStatus).toBe("needs-permission");
			expect(wsB.lastError?.code).toBe("IO_FAILED");

			releasePerm("prompt");
			await restoreB;
			expect(wsB.mountStatus).toBe("needs-permission");
		});

		it("writeWithCompanion() with auto-merge rolls back primary file bytes and trackedDocs when companion write fails after conflictPrechecked", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				companion: { pattern: "invoices/{year}/{id}.pdf" },
				index: { partitionBy: (p) => p.year ?? "unknown" },
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "companion-automerge-rollback",
					backend,
					collections: { invoices },
				}),
			);
			await ws.restore();

			// Write initial record + companion (populates trackedDocs with base doc)
			const baseRes = await ws.collections.invoices.writeWithCompanion(
				{ year: "2025", id: "m1" },
				{ id: "m1", year: "2025", title: "BaseTitle", amount: 10 },
				new TextEncoder().encode("old-pdf"),
			);

			// External non-conflicting edit on disk (changes title while local will change amount)
			await backend.injectExternalFile(
				"invoices/2025/m1.json",
				encodeJson({ id: "m1", year: "2025", title: "RemoteTitle", amount: 10 }),
			);
			const readBefore = await backend.readBytes("invoices/2025/m1.json");
			const diskBefore = readBefore.bytes;

			// Fail companion write after auto-merge succeeds on primary
			const origWriteBytes = backend.writeBytes.bind(backend);
			const spy = vi.spyOn(backend, "writeBytes").mockImplementation(async (path, bytes, opts) => {
				if (path === "invoices/2025/m1.pdf") {
					throw new Error("Companion disk error");
				}
				return origWriteBytes(path, bytes, opts);
			});

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						{ year: "2025", id: "m1" },
						{ id: "m1", year: "2025", title: "BaseTitle", amount: 20 },
						new TextEncoder().encode("new-pdf"),
						{ conflictPolicy: "auto-merge" },
					),
				"IO_FAILED",
			);
			spy.mockRestore();

			// Primary file bytes on disk must be rolled back to diskBefore
			const readAfter = await backend.readBytes("invoices/2025/m1.json");
			const diskAfter = readAfter.bytes;
			expect(diskAfter).toEqual(diskBefore);

			// Companion file must still have old-pdf
			const pdfAfter = await backend.readBytes("invoices/2025/m1.pdf");
			expect(new TextDecoder().decode(pdfAfter.bytes)).toBe("old-pdf");

			// trackedDocs must be rolled back to baseRes.revision (not the aborted merged revision),
			// so a manual-policy delete without explicit expectedRevision conflicts with expectedRevision = baseRes.revision
			const conflictErr = await expectFsErrorCode(
				() => ws.collections.invoices.delete({ year: "2025", id: "m1" }, { conflictPolicy: "detect" }),
				"CONFLICT",
			);
			expect((conflictErr.details?.expectedRevision as { hash?: string })?.hash).toBe(
				baseRes.revision.hash,
			);
		});

		it("loadPartitions() and loadAllPartitions() racing with forget(), pick(), or destroy() do not mutate confirmedEntries or corruptEntries", async () => {
			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: {
					partitionBy: (p) => p.year ?? "unknown",
					eagerPartitions: (key) => key === "2026",
				},
			});

			await backend.injectExternalFile(
				"invoices/2025/old.json",
				encodeJson({ id: "old", year: "2025", title: "Old", amount: 10 }),
			);
			await backend.injectExternalFile(
				"invoices/2026/cur.json",
				encodeJson({ id: "cur", year: "2026", title: "Cur", amount: 20 }),
			);

			// Seed index shards on disk
			const seeder = trackWorkspace(
				createWorkspace({
					namespace: "partition-race-seeder",
					backend,
					collections: { invoices },
				}),
			);
			await seeder.restore();
			await seeder.heal({ mode: "full" });
			seeder.destroy();

			// Race 1: loadPartitions(["2025"]) vs forget()
			stubSupportedEnvironment();
			const idb = createMockIdbStore(makeFakeDirHandle("dir-1"));
			const wsForget = trackWorkspace(
				createWorkspace({
					namespace: "partition-race-forget",
					idbStore: idb,
					createBackend: () => backend,
					bootCheck: "cache-only",
					collections: { invoices },
				}),
			);
			await wsForget.restore();
			expect(wsForget.collections.invoices.hasUnloadedPartitions()).toBe(true);

			const { promise: shardReadStarted, resolve: markShardReadStarted } = Promise.withResolvers<void>();
			const { promise: shardReadGate, resolve: releaseShardRead } = Promise.withResolvers<void>();
			const origRead = backend.readBytes.bind(backend);
			const readSpy = vi.spyOn(backend, "readBytes").mockImplementation(async (path, opts) => {
				if (path === "_cs-fs/index/invoices/2025.json") {
					markShardReadStarted();
					await shardReadGate;
				}
				return origRead(path, opts);
			});

			const loadPromise = wsForget.collections.invoices.loadPartitions(["2025"]);
			await shardReadStarted;
			await wsForget.forget();
			releaseShardRead();
			await loadPromise;
			readSpy.mockRestore();

			expect(wsForget.collections.invoices.entries).toEqual([]);
			expect(wsForget.corruptEntries).toEqual([]);

			// Race 2: loadAllPartitions() vs destroy()
			const wsDestroy = trackWorkspace(
				createWorkspace({
					namespace: "partition-race-destroy",
					backend,
					bootCheck: "cache-only",
					collections: { invoices },
				}),
			);
			await wsDestroy.restore();

			const { promise: shard2Started, resolve: markShard2Started } = Promise.withResolvers<void>();
			const { promise: shard2Gate, resolve: releaseShard2 } = Promise.withResolvers<void>();
			const readSpy2 = vi.spyOn(backend, "readBytes").mockImplementation(async (path, opts) => {
				if (path === "_cs-fs/index/invoices/2025.json") {
					markShard2Started();
					await shard2Gate;
				}
				return origRead(path, opts);
			});

			const loadAllPromise = wsDestroy.collections.invoices.loadAllPartitions();
			await shard2Started;
			wsDestroy.destroy();
			releaseShard2();
			await loadAllPromise;
			readSpy2.mockRestore();

			expect(wsDestroy.collections.invoices.entries.map((e) => e.path)).toEqual(["invoices/2026/cur.json"]);
			expect(wsDestroy.corruptEntries).toEqual([]);
		});

		it("async updater() in singleton.update() and collection.update() racing with forget() or destroy() rejects with ABORTED without writing", async () => {
			stubSupportedEnvironment();
			const backend = new MemoryFsBackend();
			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "unknown" },
			});

			// Race 1: singleton.update() vs forget()
			const idbStore1 = createMockIdbStore(makeFakeDirHandle("dir-1"));
			const ws1 = trackWorkspace(
				createWorkspace({
					namespace: "updater-race-forget",
					idbStore: idbStore1,
					createBackend: () => backend,
					singletons: { settings },
					collections: { invoices },
				}),
			);
			await ws1.restore();

			const writeSpy1 = vi.spyOn(backend, "writeBytes");
			const { promise: sEntered, resolve: markSEntered } = Promise.withResolvers<void>();
			const { promise: sGate, resolve: releaseS } = Promise.withResolvers<void>();

			const settingsHandle = ws1.singletons.settings;
			const sUpdate = settingsHandle.update(async () => {
				markSEntered();
				await sGate;
				return { theme: "dark", currency: "EUR" };
			});
			await sEntered;
			await ws1.forget();
			releaseS();

			await expectFsErrorCode(() => sUpdate, "ABORTED");
			expect(writeSpy1).not.toHaveBeenCalledWith("settings.json", expect.anything(), expect.anything());
			expect(ws1.pendingMutationCount).toBe(0);
			writeSpy1.mockRestore();

			// Race 2: collection.update() vs destroy()
			const ws2 = trackWorkspace(
				createWorkspace({
					namespace: "updater-race-destroy",
					backend,
					singletons: { settings },
					collections: { invoices },
				}),
			);
			await ws2.restore();

			const writeSpy2 = vi.spyOn(backend, "writeBytes");
			const { promise: cEntered, resolve: markCEntered } = Promise.withResolvers<void>();
			const { promise: cGate, resolve: releaseC } = Promise.withResolvers<void>();

			const invoicesHandle = ws2.collections.invoices;
			const cUpdate = invoicesHandle.update({ year: "2025", id: "u1" }, async () => {
				markCEntered();
				await cGate;
				return { id: "u1", year: "2025", title: "Aborted", amount: 1 };
			});
			await cEntered;
			ws2.destroy();
			releaseC();

			await expectFsErrorCode(() => cUpdate, "ABORTED");
			expect(writeSpy2).not.toHaveBeenCalledWith(
				"invoices/2025/u1.json",
				expect.anything(),
				expect.anything(),
			);
			expect(ws2.collections.invoices.entries).toEqual([]);
			expect(await backend.exists("invoices/2025/u1.json")).toBe(false);
			writeSpy2.mockRestore();
		});

		it("singleton.delete(), collection.move(), and collection.delete() preserve explicit expectedRevision: null and fail with CONFLICT when file exists on disk", async () => {
			const backend = new MemoryFsBackend();
			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
			});
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "unknown" },
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "explicit-null-occ-ws",
					backend,
					singletons: { settings },
					collections: { invoices },
				}),
			);
			await ws.restore();

			// Populate trackedDocs and cacheEngine with existing files on disk
			await ws.singletons.settings.write({ theme: "dark", currency: "EUR" });
			await ws.collections.invoices.write(
				{ year: "2025", id: "d1" },
				{ id: "d1", year: "2025", title: "Existing", amount: 50 },
			);

			await expectFsErrorCode(
				() => ws.singletons.settings.delete({ expectedRevision: null }),
				"CONFLICT",
			);
			expect(await backend.exists("settings.json")).toBe(true);

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.move(
						{ year: "2025", id: "d1" },
						{ year: "2026", id: "d1" },
						{ expectedRevision: null },
					),
				"CONFLICT",
			);
			expect(await backend.exists("invoices/2025/d1.json")).toBe(true);
			expect(await backend.exists("invoices/2026/d1.json")).toBe(false);

			await expectFsErrorCode(
				() => ws.collections.invoices.delete({ year: "2025", id: "d1" }, { expectedRevision: null }),
				"CONFLICT",
			);
			expect(await backend.exists("invoices/2025/d1.json")).toBe(true);
		});
	});

	describe("12. Background Polling (pollInterval, onExternalChange, skipIdleMetaFlush)", () => {
		it("validates pollInterval config, disables polling for false/0, and defaults to 5000ms", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			for (const invalid of [-1, 500, NaN, 1500.5, Infinity]) {
				await expectFsErrorCode(
					() =>
						createWorkspace({
							namespace: `invalid-poll-${String(invalid)}`,
							backend: new MemoryFsBackend(),
							pollInterval: invalid,
						}),
					"INVALID_CONFIG",
				);
			}

			// pollInterval: false and 0 disable background polling completely
			for (const disabledValue of [false, 0] as const) {
				const backend = new MemoryFsBackend();
				const walkSpy = vi.spyOn(backend, "walkFiles");
				const ws = trackWorkspace(
					createWorkspace({
						namespace: `disabled-poll-${String(disabledValue)}`,
						backend,
						pollInterval: disabledValue,
					}),
				);
				await ws.restore();
				walkSpy.mockClear();

				await vi.advanceTimersByTimeAsync(60_000);
				expect(walkSpy).not.toHaveBeenCalled();
			}

			// Default pollInterval is 5000ms
			const defaultBackend = new MemoryFsBackend();
			const defaultWalkSpy = vi.spyOn(defaultBackend, "walkFiles");
			const defaultWs = trackWorkspace(
				createWorkspace({
					namespace: "default-poll-ws",
					backend: defaultBackend,
				}),
			);
			await defaultWs.restore();
			defaultWalkSpy.mockClear();

			await vi.advanceTimersByTimeAsync(4999);
			expect(defaultWalkSpy).not.toHaveBeenCalled();

			await vi.advanceTimersByTimeAsync(1);
			await vi.waitFor(() => {
				expect(defaultWalkSpy).toHaveBeenCalledTimes(1);
			});
		});

		it("runs a silent idle read-only poll with zero meta.json writes, idle activity/isBusy, and no onExternalChange", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			const backend = new MemoryFsBackend();
			await backend.writeBytes(
				"invoices/2026/inv-1.json",
				encodeJson({ id: "inv-1", year: "2026", title: "Seed", amount: 100 }),
			);

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "2026" },
			});
			const onExternalChange = vi.fn();

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "silent-poll-ws",
					backend,
					mode: "readwrite",
					collections: { invoices },
					onExternalChange,
				}),
			);
			await ws.restore();
			await ws.flush();

			const writeSpy = vi.spyOn(backend, "writeBytes");
			const origWalk = backend.walkFiles.bind(backend);
			const pollStarted = createDeferred<void>();
			const releasePoll = createDeferred<void>();
			let activityDuringPoll: string | null = null;
			let isBusyDuringPoll: boolean | null = null;

			const walkSpy = vi.spyOn(backend, "walkFiles").mockImplementationOnce(async (dir, opts) => {
				activityDuringPoll = ws.activity;
				isBusyDuringPoll = ws.isBusy;
				pollStarted.resolve();
				await releasePoll.promise;
				return await origWalk(dir, opts);
			});

			await vi.advanceTimersByTimeAsync(5000);
			await pollStarted.promise;

			expect(activityDuringPoll).toBe("idle");
			expect(isBusyDuringPoll).toBe(false);
			expect(ws.activity).toBe("idle");
			expect(ws.isBusy).toBe(false);

			releasePoll.resolve();
			await vi.waitFor(() => {
				expect(walkSpy).toHaveBeenCalledTimes(1);
			});
			// Flush any post-heal microtasks
			await Promise.resolve();
			await Promise.resolve();

			expect(writeSpy).not.toHaveBeenCalled();
			expect(ws.activity).toBe("idle");
			expect(ws.isBusy).toBe(false);
			expect(onExternalChange).not.toHaveBeenCalled();
		});

		it("detects external add/update/remove, updates collection.entries, and survives throwing onExternalChange", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			const backend = new MemoryFsBackend();
			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "2026" },
			});
			const reports: HealReport[] = [];
			let shouldThrow = false;
			const onExternalChange = vi.fn((report: HealReport) => {
				reports.push(report);
				if (shouldThrow) {
					throw new Error("consumer callback failed");
				}
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "external-change-poll-ws",
					backend,
					pollInterval: 2000,
					collections: { invoices },
					onExternalChange,
				}),
			);
			await ws.restore();
			expect(ws.collections.invoices.entries).toHaveLength(0);

			// 1. External add
			await backend.writeBytes(
				"invoices/2026/ext-1.json",
				encodeJson({ id: "ext-1", year: "2026", title: "External v1", amount: 50 }),
			);
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => {
				expect(onExternalChange).toHaveBeenCalledTimes(1);
			});
			expect(reports[0]?.added).toBe(1);
			expect((reports[0]?.added ?? 0) + (reports[0]?.updated ?? 0) + (reports[0]?.removed ?? 0)).toBeGreaterThan(0);
			expect(ws.collections.invoices.entries).toHaveLength(1);
			expect(ws.collections.invoices.entries[0]?.data.title).toBe("External v1");

			// 2. External update while onExternalChange throws -> polling must continue cleanly
			shouldThrow = true;
			await backend.writeBytes(
				"invoices/2026/ext-1.json",
				encodeJson({ id: "ext-1", year: "2026", title: "External v2 updated", amount: 75 }),
			);
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => {
				expect(onExternalChange).toHaveBeenCalledTimes(2);
			});
			expect(reports[1]?.updated).toBe(1);
			expect(ws.collections.invoices.entries[0]?.data.title).toBe("External v2 updated");
			expect(ws.health).toBe("positive");

			// 3. External remove -> proves polling continued after callback threw
			shouldThrow = false;
			await backend.deleteFile("invoices/2026/ext-1.json");
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => {
				expect(onExternalChange).toHaveBeenCalledTimes(3);
			});
			expect(reports[2]?.removed).toBe(1);
			expect(ws.collections.invoices.entries).toHaveLength(0);
		});

		it("prevents overlapping polls and applies adaptive backoff on slow ticks", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			const backend = new MemoryFsBackend();
			const origWalk = backend.walkFiles.bind(backend);
			const ws = trackWorkspace(
				createWorkspace({
					namespace: "slow-poll-backoff-ws",
					backend,
					pollInterval: 2000,
				}),
			);
			await ws.restore();

			const tick1Started = createDeferred<void>();
			const releaseTick1 = createDeferred<void>();
			let callCount = 0;

			vi.spyOn(backend, "walkFiles").mockImplementation(async (dir, opts) => {
				callCount += 1;
				if (callCount === 1) {
					tick1Started.resolve();
					await releaseTick1.promise;
				}
				return await origWalk(dir, opts);
			});

			// Fire tick 1 at 2000ms
			await vi.advanceTimersByTimeAsync(2000);
			await tick1Started.promise;
			expect(callCount).toBe(1);

			// Advance 1500ms while tick 1 is still in-flight (> pollInterval * 0.5) -> no overlap
			await vi.advanceTimersByTimeAsync(1500);
			expect(callCount).toBe(1);

			// Complete tick 1; durationMs (~1500) -> nextDelay = round(1500 * 2) = 3000ms
			releaseTick1.resolve();
			await Promise.resolve();
			await Promise.resolve();
			await Promise.resolve();

			// At +2000ms (normal interval), tick 2 must NOT have fired yet due to adaptive backoff
			await vi.advanceTimersByTimeAsync(2000);
			expect(callCount).toBe(1);

			// At +3000ms total since tick 1 finished, tick 2 fires
			await vi.advanceTimersByTimeAsync(1000);
			await vi.waitFor(() => {
				expect(callCount).toBe(2);
			});
		});

		it("backs off on transient IO_FAILED/FILE_LOCKED without marking unhealthy, and stops polling on HANDLE_STALE", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			const backend = new MemoryFsBackend();
			const origWalk = backend.walkFiles.bind(backend);
			const ws = trackWorkspace(
				createWorkspace({
					namespace: "poll-errors-ws",
					backend,
					pollInterval: 2000,
				}),
			);
			await ws.restore();

			let walkAttempts = 0;
			vi.spyOn(backend, "walkFiles").mockImplementation(async (dir, opts) => {
				walkAttempts += 1;
				if (walkAttempts === 1) {
					throw new FsError("IO_FAILED", "transient SMB hiccup");
				}
				if (walkAttempts === 2) {
					throw new FsError("FILE_LOCKED", "transient AV lock");
				}
				if (walkAttempts === 3) {
					return await origWalk(dir, opts);
				}
				if (walkAttempts === 4) {
					throw new FsError("HANDLE_STALE", "directory handle revoked");
				}
				return await origWalk(dir, opts);
			});

			// Attempt 1 (2000ms): IO_FAILED -> health stays positive, lastError null, backoff = 4000ms
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => expect(walkAttempts).toBe(1));
			expect(ws.health).toBe("positive");
			expect(ws.lastError).toBeNull();
			expect(ws.mountStatus).toBe("ready");

			await vi.advanceTimersByTimeAsync(2000);
			expect(walkAttempts).toBe(1); // still backed off

			// Attempt 2 (+2000ms = 4000ms): FILE_LOCKED -> health stays positive, lastError null, backoff = 8000ms
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => expect(walkAttempts).toBe(2));
			expect(ws.health).toBe("positive");
			expect(ws.lastError).toBeNull();

			await vi.advanceTimersByTimeAsync(4000);
			expect(walkAttempts).toBe(2); // still backed off

			// Attempt 3 (+4000ms = 8000ms): succeeds -> resets backoff back to 2000ms
			await vi.advanceTimersByTimeAsync(4000);
			await vi.waitFor(() => expect(walkAttempts).toBe(3));
			expect(ws.health).toBe("positive");
			expect(ws.lastError).toBeNull();

			// Attempt 4 (+2000ms): HANDLE_STALE -> transitions to stale and stops polling permanently
			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => expect(walkAttempts).toBe(4));
			expect(ws.mountStatus).toBe("stale");
			expect(ws.health).toBe("negative");
			expect(ws.lastError?.code).toBe("HANDLE_STALE");

			await vi.advanceTimersByTimeAsync(60_000);
			expect(walkAttempts).toBe(4);
		});

		it("pauses on hidden visibility, resumes & coalesces with revalidateOnFocus on visible, and stops on forget()/destroy()", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			try {
				setDocumentVisibility("visible");

				const backend = new MemoryFsBackend();
				const walkSpy = vi.spyOn(backend, "walkFiles");
				const ws = trackWorkspace(
					createWorkspace({
						namespace: "poll-visibility-ws",
						backend,
						pollInterval: 2000,
						revalidateOnFocus: { minIntervalMs: 5000 },
					}),
				);
				await ws.restore();
				walkSpy.mockClear();

				// Hide tab -> polling pauses completely
				setDocumentVisibility("hidden");
				await vi.advanceTimersByTimeAsync(10_000);
				expect(walkSpy).not.toHaveBeenCalled();

				// Show tab after > minIntervalMs -> coalesces with revalidateOnFocus (1 heal, no duplicate poll)
				setDocumentVisibility("visible");
				await vi.waitFor(() => {
					expect(walkSpy).toHaveBeenCalledTimes(1);
				});

				// Next regular background poll runs after pollInterval (2000ms)
				await vi.advanceTimersByTimeAsync(2000);
				await vi.waitFor(() => {
					expect(walkSpy).toHaveBeenCalledTimes(2);
				});

				// Immediate window focus within 5000ms of background poll is coalesced (throttled)
				window.dispatchEvent(new Event("focus"));
				await Promise.resolve();
				await Promise.resolve();
				expect(walkSpy).toHaveBeenCalledTimes(2);

				// Hide & show again within minIntervalMs (focus revalidate throttled) -> poll timer still resumes
				setDocumentVisibility("hidden");
				await vi.advanceTimersByTimeAsync(1000);
				setDocumentVisibility("visible");
				await Promise.resolve();
				expect(walkSpy).toHaveBeenCalledTimes(2);

				await vi.advanceTimersByTimeAsync(2000);
				await vi.waitFor(() => {
					expect(walkSpy).toHaveBeenCalledTimes(3);
				});

				// forget() stops polling
				await ws.forget();
				const callsAfterForget = walkSpy.mock.calls.length;
				await vi.advanceTimersByTimeAsync(20_000);
				expect(walkSpy.mock.calls.length).toBe(callsAfterForget);

				// destroy() stops polling
				const backend2 = new MemoryFsBackend();
				const walkSpy2 = vi.spyOn(backend2, "walkFiles");
				const ws2 = trackWorkspace(
					createWorkspace({
						namespace: "poll-destroy-ws",
						backend: backend2,
						pollInterval: 2000,
					}),
				);
				await ws2.restore();
				walkSpy2.mockClear();

				ws2.destroy();
				await vi.advanceTimersByTimeAsync(20_000);
				expect(walkSpy2).not.toHaveBeenCalled();
			} finally {
				setDocumentVisibility("visible");
			}
		});

		it("performs zero disk writes in mode: 'read' even when external changes are detected", async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date("2026-11-27T12:00:00Z"));

			const backend = new MemoryFsBackend();
			await backend.writeBytes(
				"invoices/2026/r-1.json",
				encodeJson({ id: "r-1", year: "2026", title: "Initial", amount: 10 }),
			);

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "2026" },
			});
			const onExternalChange = vi.fn();

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "readonly-poll-ws",
					backend,
					mode: "read",
					pollInterval: 2000,
					collections: { invoices },
					onExternalChange,
				}),
			);
			await ws.restore();
			expect(ws.collections.invoices.entries).toHaveLength(1);

			// Add an external file directly, then spy on all subsequent writes
			await backend.writeBytes(
				"invoices/2026/r-2.json",
				encodeJson({ id: "r-2", year: "2026", title: "External ReadOnly", amount: 20 }),
			);
			const writeSpy = vi.spyOn(backend, "writeBytes");

			await vi.advanceTimersByTimeAsync(2000);
			await vi.waitFor(() => {
				expect(onExternalChange).toHaveBeenCalledTimes(1);
			});

			expect(ws.collections.invoices.entries).toHaveLength(2);
			expect(writeSpy).not.toHaveBeenCalled();
		});
	});

	describe("13. Custom merge Hook (defineCollection & defineSingleton)", () => {
		it("validates merge option type on defineSingleton and defineCollection", async () => {
			await expectFsErrorCode(
				() =>
					defineSingleton({
						path: "settings.json",
						adapter: jsonAdapter({ schema: settingsSchema }),
						merge: "not-a-fn" as never,
					}),
				"INVALID_CONFIG",
			);

			await expectFsErrorCode(
				() =>
					defineCollection({
						pattern: "invoices/{year}/{id}.json",
						adapter: jsonAdapter({ schema: invoiceSchema }),
						merge: 42 as never,
					}),
				"INVALID_CONFIG",
			);
		});

		it("auto-merges concurrent edits on collection & singleton (3-way, 2-way base===undefined, defaultMerge) and enforces OCC expectedRevision", async () => {
			const backend = new MemoryFsBackend();
			const seenSingletonBases: Array<SettingsDoc | undefined> = [];
			const seenCollectionBases: Array<InvoiceDoc | undefined> = [];

			const settings = defineSingleton({
				path: "settings.json",
				adapter: jsonAdapter({ schema: settingsSchema }),
				merge(base, local, remote, helpers) {
					seenSingletonBases.push(base);
					const baseMerge = helpers.defaultMerge();
					if (baseMerge.conflicts.length === 0) {
						return baseMerge;
					}
					return {
						merged: {
							theme: local.theme,
							currency: remote.currency,
						},
						conflicts: [],
					};
				},
			});

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "2026" },
				merge(base, local, remote, helpers) {
					seenCollectionBases.push(base);
					const baseMerge = helpers.defaultMerge();
					return {
						merged: {
							...baseMerge.merged,
							title: `${local.title} + ${remote.title}`,
							amount: Math.max(local.amount, remote.amount),
						},
						conflicts: [],
					};
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "custom-merge-success-ws",
					backend,
					pollInterval: false,
					conflictPolicy: "auto-merge",
					singletons: { settings },
					collections: { invoices },
				}),
			);
			await ws.restore();

			// 1. 3-way merge on singleton
			await ws.singletons.settings.write({ theme: "light", currency: "USD" });
			await backend.writeBytes("settings.json", encodeJson({ theme: "solarized", currency: "EUR" }));

			const singletonResult = await ws.singletons.settings.write({
				theme: "dark",
				currency: "GBP",
			});
			expect(singletonResult.merged).toBe(true);
			expect(seenSingletonBases[0]).toEqual({ theme: "light", currency: "USD" });
			const diskSettings = await readJsonFromBackend<SettingsDoc>(backend, "settings.json");
			expect(diskSettings).toEqual({ theme: "dark", currency: "EUR" });

			// 2. 3-way merge on collection
			await ws.collections.invoices.write(
				{ year: "2026", id: "m1" },
				{ id: "m1", year: "2026", title: "Base", amount: 10 },
			);
			await backend.writeBytes(
				"invoices/2026/m1.json",
				encodeJson({ id: "m1", year: "2026", title: "Remote", amount: 30 }),
			);

			const colResult = await ws.collections.invoices.write(
				{ year: "2026", id: "m1" },
				{ id: "m1", year: "2026", title: "Local", amount: 20 },
			);
			expect(colResult.merged).toBe(true);
			expect(seenCollectionBases[0]).toEqual({ id: "m1", year: "2026", title: "Base", amount: 10 });
			const diskM1 = await readJsonFromBackend<InvoiceDoc>(backend, "invoices/2026/m1.json");
			expect(diskM1).toEqual({ id: "m1", year: "2026", title: "Local + Remote", amount: 30 });

			// 3. 2-way merge (base === undefined) when file exists externally and was never tracked
			await backend.writeBytes(
				"invoices/2026/untracked.json",
				encodeJson({ id: "untracked", year: "2026", title: "DiskOnly", amount: 80 }),
			);
			const twoWayResult = await ws.collections.invoices.write(
				{ year: "2026", id: "untracked" },
				{ id: "untracked", year: "2026", title: "LocalNew", amount: 40 },
			);
			expect(twoWayResult.merged).toBe(true);
			expect(seenCollectionBases[1]).toBeUndefined();
			const diskUntracked = await readJsonFromBackend<InvoiceDoc>(
				backend,
				"invoices/2026/untracked.json",
			);
			expect(diskUntracked).toEqual({
				id: "untracked",
				year: "2026",
				title: "LocalNew + DiskOnly",
				amount: 80,
			});

			// 4. OCC expectedRevision verification: racing external write during merge causes CONFLICT
			let triggerRace = true;
			const racingInvoices = defineCollection({
				pattern: "racing/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "2026" },
				merge(_base, local, remote) {
					if (triggerRace) {
						triggerRace = false;
						// Synchronously mutate backend bytes behind the scenes so stat revision changes before write
						void backend.writeBytes(
							"racing/2026/r1.json",
							encodeJson({ id: "r1", year: "2026", title: "ConcurrentRace", amount: 999 }),
						);
					}
					return { merged: { ...remote, title: local.title }, conflicts: [] };
				},
			});

			const wsRace = trackWorkspace(
				createWorkspace({
					namespace: "custom-merge-occ-ws",
					backend,
					pollInterval: false,
					conflictPolicy: "auto-merge",
					collections: { racingInvoices },
				}),
			);
			await wsRace.restore();
			await wsRace.collections.racingInvoices.write(
				{ year: "2026", id: "r1" },
				{ id: "r1", year: "2026", title: "V1", amount: 1 },
			);
			await backend.writeBytes(
				"racing/2026/r1.json",
				encodeJson({ id: "r1", year: "2026", title: "V2", amount: 2 }),
			);

			await expectFsErrorCode(
				() =>
					wsRace.collections.racingInvoices.write(
						{ year: "2026", id: "r1" },
						{ id: "r1", year: "2026", title: "LocalWrite", amount: 3 },
					),
				"CONFLICT",
			);
			const raceDisk = await readJsonFromBackend<InvoiceDoc>(backend, "racing/2026/r1.json");
			expect(raceDisk.title).toBe("ConcurrentRace");
		});

		it("isolates base, local, and remote from in-place mutations inside custom merge hook", async () => {
			interface NestedDoc {
				id: string;
				year: string;
				meta: { tags: string[] };
			}

			const backend = new MemoryFsBackend();
			const observedBases: Array<NestedDoc | undefined> = [];
			let shouldThrowAfterMutating = true;

			const docs = defineCollection({
				pattern: "docs/{year}/{id}.json",
				adapter: jsonAdapter<NestedDoc>(),
				index: { partitionBy: (p) => p.year ?? "2026" },
				merge(base, local, remote, helpers) {
					observedBases.push(structuredClone(base));
					// Adversarially mutate every input object and nested array in place
					if (base) {
						base.meta.tags.push("CORRUPTED_BASE");
					}
					local.meta.tags.push("CORRUPTED_LOCAL");
					remote.meta.tags.push("CORRUPTED_REMOTE");
					if (shouldThrowAfterMutating) {
						throw new Error("mutate-then-throw");
					}
					const fallback = helpers.defaultMerge();
					return {
						merged: fallback.merged,
						conflicts: fallback.conflicts,
					};
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "merge-isolation-ws",
					backend,
					pollInterval: false,
					conflictPolicy: "auto-merge",
					collections: { docs },
				}),
			);
			await ws.restore();

			await ws.collections.docs.write(
				{ year: "2026", id: "n1" },
				{ id: "n1", year: "2026", meta: { tags: ["base"] } },
			);
			await backend.writeBytes(
				"docs/2026/n1.json",
				encodeJson({ id: "n1", year: "2026", meta: { tags: ["remote"] } }),
			);

			// 1. Mutate inputs and throw -> trackedDocs still holds original base, uncorrupted
			const localInput1: NestedDoc = { id: "n1", year: "2026", meta: { tags: ["local-1"] } };
			await expectFsErrorCode(
				() => ws.collections.docs.write({ year: "2026", id: "n1" }, localInput1),
				"VALIDATION_FAILED",
			);
			expect(localInput1.meta.tags).toEqual(["local-1"]);

			// 2. Escalate conflict after mutating inputs -> base seen is still uncorrupted ["base"],
			//    and ConflictDetails receives uncorrupted base/local/remote
			shouldThrowAfterMutating = false;
			const localInput2: NestedDoc = { id: "n1", year: "2026", meta: { tags: ["local-2"] } };
			await expectFsErrorCode(
				() => ws.collections.docs.write({ year: "2026", id: "n1" }, localInput2),
				"CONFLICT",
			);
			expect(observedBases[1]).toEqual({ id: "n1", year: "2026", meta: { tags: ["base"] } });
			expect(ws.unresolvedConflicts).toHaveLength(1);
			const conflict = ws.unresolvedConflicts[0];
			expect(conflict).toBeDefined();
			expect(conflict?.base).toEqual({ id: "n1", year: "2026", meta: { tags: ["base"] } });
			expect(conflict?.local).toEqual({ id: "n1", year: "2026", meta: { tags: ["local-2"] } });
			expect(conflict?.remote).toEqual({ id: "n1", year: "2026", meta: { tags: ["remote"] } });
			expect(localInput2.meta.tags).toEqual(["local-2"]);

			// 3. Subsequent external write + conflict -> trackedDocs updated from remote is also uncorrupted ["remote"]
			await backend.writeBytes(
				"docs/2026/n1.json",
				encodeJson({ id: "n1", year: "2026", meta: { tags: ["remote-2"] } }),
			);
			await expectFsErrorCode(
				() =>
					ws.collections.docs.write(
						{ year: "2026", id: "n1" },
						{ id: "n1", year: "2026", meta: { tags: ["local-3"] } },
					),
				"CONFLICT",
			);
			expect(observedBases[2]).toEqual({ id: "n1", year: "2026", meta: { tags: ["remote"] } });
		});

		it("throws VALIDATION_FAILED, rolls back pending mutation, and leaves disk untouched when merged output fails schema/validate", async () => {
			const backend = new MemoryFsBackend();

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter<InvoiceDoc>({
					schema: invoiceSchema,
					validate(value): value is InvoiceDoc {
						return (
							typeof value === "object" &&
							value !== null &&
							typeof (value as InvoiceDoc).amount === "number" &&
							(value as InvoiceDoc).amount >= 0
						);
					},
				}),
				index: { partitionBy: (p) => p.year ?? "2026" },
				merge(_base, local) {
					if (local.title === "schema-invalid") {
						return {
							merged: { ...local, amount: "bad-type" as unknown as number },
							conflicts: [],
						};
					}
					return {
						merged: { ...local, amount: -50 },
						conflicts: [],
					};
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "merge-validation-fail-ws",
					backend,
					pollInterval: false,
					conflictPolicy: "auto-merge",
					collections: { invoices },
				}),
			);
			await ws.restore();

			await ws.collections.invoices.write(
				{ year: "2026", id: "v1" },
				{ id: "v1", year: "2026", title: "Base", amount: 10 },
			);
			const remoteDoc: InvoiceDoc = { id: "v1", year: "2026", title: "RemoteTruth", amount: 25 };
			await backend.writeBytes("invoices/2026/v1.json", encodeJson(remoteDoc));

			// 1. Fails StandardSchema validation
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "v1" },
						{ id: "v1", year: "2026", title: "schema-invalid", amount: 100 },
					),
				"VALIDATION_FAILED",
			);
			expect(ws.pendingMutationCount).toBe(0);
			expect(ws.collections.invoices.entries[0]?.data.title).toBe("Base");
			expect(await readJsonFromBackend<InvoiceDoc>(backend, "invoices/2026/v1.json")).toEqual(
				remoteDoc,
			);

			// 2. Fails custom adapter validate()
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "v1" },
						{ id: "v1", year: "2026", title: "validate-invalid", amount: 100 },
					),
				"VALIDATION_FAILED",
			);
			expect(ws.pendingMutationCount).toBe(0);
			expect(ws.collections.invoices.entries[0]?.data.title).toBe("Base");
			expect(await readJsonFromBackend<InvoiceDoc>(backend, "invoices/2026/v1.json")).toEqual(
				remoteDoc,
			);
		});

		it("handles throwing/malformed merge hooks: VALIDATION_FAILED in auto-merge, graceful threeWay=undefined in detect and resolveConflict refresh", async () => {
			const backend = new MemoryFsBackend();
			let mode: "throw" | "null" | "missing-merged" | "bad-conflicts" | "ok" = "throw";

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				index: { partitionBy: (p) => p.year ?? "2026" },
				merge(_base, local, _remote, helpers) {
					if (mode === "throw") {
						throw new Error("merge exploded");
					}
					if (mode === "null") {
						return null as never;
					}
					if (mode === "missing-merged") {
						return { conflicts: [] } as never;
					}
					if (mode === "bad-conflicts") {
						return { merged: local, conflicts: "nope" as never };
					}
					return helpers.defaultMerge();
				},
			});

			const conflictEvents: ConflictDetails[] = [];
			const ws = trackWorkspace(
				createWorkspace({
					namespace: "merge-malformed-ws",
					backend,
					pollInterval: false,
					conflictPolicy: "auto-merge",
					collections: { invoices },
					onMutationConflict: (c) => {
						conflictEvents.push(c);
					},
				}),
			);
			await ws.restore();

			await ws.collections.invoices.write(
				{ year: "2026", id: "e1" },
				{ id: "e1", year: "2026", title: "Base", amount: 10 },
			);
			const remoteV2: InvoiceDoc = { id: "e1", year: "2026", title: "RemoteV2", amount: 20 };
			await backend.writeBytes("invoices/2026/e1.json", encodeJson(remoteV2));

			// 1. In auto-merge: throwing & malformed returns all throw VALIDATION_FAILED, rollback pending, disk untouched
			for (const badMode of ["throw", "null", "missing-merged", "bad-conflicts"] as const) {
				mode = badMode;
				await expectFsErrorCode(
					() =>
						ws.collections.invoices.write(
							{ year: "2026", id: "e1" },
							{ id: "e1", year: "2026", title: `Local-${badMode}`, amount: 99 },
						),
					"VALIDATION_FAILED",
				);
				expect(ws.pendingMutationCount).toBe(0);
				expect(ws.collections.invoices.entries[0]?.data.title).toBe("Base");
				expect(await readJsonFromBackend<InvoiceDoc>(backend, "invoices/2026/e1.json")).toEqual(
					remoteV2,
				);
			}

			// 2. In detect escalation: throwing hook degrades gracefully to threeWay: undefined without dropping ConflictDetails
			mode = "throw";
			await expectFsErrorCode(
				() =>
					ws.collections.invoices.write(
						{ year: "2026", id: "e1" },
						{ id: "e1", year: "2026", title: "LocalDetect", amount: 30 },
						{ conflictPolicy: "detect" },
					),
				"CONFLICT",
			);
			expect(ws.unresolvedConflicts).toHaveLength(1);
			const initialConflict = ws.unresolvedConflicts[0];
			if (!initialConflict) {
				throw new Error("Expected initialConflict to be present");
			}
			expect(initialConflict.threeWay).toBeUndefined();
			expect(initialConflict.remote).toEqual(remoteV2);
			expect(initialConflict.local).toEqual({
				id: "e1",
				year: "2026",
				title: "LocalDetect",
				amount: 30,
			});
			expect(conflictEvents).toHaveLength(1);

			// 3. In resolveConflict() re-conflict refresh: throwing hook degrades to threeWay: undefined without dropping ConflictDetails
			const remoteV3: InvoiceDoc = { id: "e1", year: "2026", title: "RemoteV3", amount: 40 };
			await backend.writeBytes("invoices/2026/e1.json", encodeJson(remoteV3));
			mode = "bad-conflicts";

			await expectFsErrorCode(
				() => ws.resolveConflict(initialConflict.id, "keep-local"),
				"CONFLICT",
			);
			expect(ws.unresolvedConflicts).toHaveLength(1);
			const refreshed = ws.unresolvedConflicts[0];
			expect(refreshed?.id).toBe(initialConflict.id);
			expect(refreshed?.remote).toEqual(remoteV3);
			expect(refreshed?.threeWay).toBeUndefined();
		});

		it("applies custom merge symmetrically in writeWithCompanion (with companion rollback) and resolveConflict() re-conflict refresh", async () => {
			const backend = new MemoryFsBackend();
			let mergeBehavior: "merge" | "throw" | "conflict" = "merge";
			const mergeCalls: string[] = [];

			const invoices = defineCollection({
				pattern: "invoices/{year}/{id}.json",
				adapter: jsonAdapter({ schema: invoiceSchema }),
				companion: { pattern: "invoices/{year}/{id}.pdf" },
				index: { partitionBy: (p) => p.year ?? "2026" },
				merge(_base, local, remote, helpers) {
					mergeCalls.push(`${local.title}|${remote.title}`);
					if (mergeBehavior === "throw") {
						throw new Error("companion merge error");
					}
					if (mergeBehavior === "conflict") {
						const fallback = helpers.defaultMerge();
						return {
							merged: { ...local, title: `Suggested:${local.title}/${remote.title}` },
							conflicts: fallback.conflicts,
						};
					}
					return {
						merged: { ...local, title: `${local.title}+${remote.title}`, amount: remote.amount + local.amount },
						conflicts: [],
					};
				},
			});

			const ws = trackWorkspace(
				createWorkspace({
					namespace: "merge-companion-symmetry-ws",
					backend,
					pollInterval: false,
					conflictPolicy: "auto-merge",
					collections: { invoices },
				}),
			);
			await ws.restore();

			// Seed initial primary + companion
			await ws.collections.invoices.writeWithCompanion(
				{ year: "2026", id: "c1" },
				{ id: "c1", year: "2026", title: "Base", amount: 10 },
				new TextEncoder().encode("PDF-v1"),
			);

			// 1. writeWithCompanion auto-merge success
			await backend.writeBytes(
				"invoices/2026/c1.json",
				encodeJson({ id: "c1", year: "2026", title: "Remote1", amount: 20 }),
			);
			mergeBehavior = "merge";
			const mergedRes = await ws.collections.invoices.writeWithCompanion(
				{ year: "2026", id: "c1" },
				{ id: "c1", year: "2026", title: "Local1", amount: 5 },
				new TextEncoder().encode("PDF-v2"),
			);
			expect(mergedRes.merged).toBe(true);
			expect(await readJsonFromBackend<InvoiceDoc>(backend, "invoices/2026/c1.json")).toEqual({
				id: "c1",
				year: "2026",
				title: "Local1+Remote1",
				amount: 25,
			});
			expect(await readTextFromBackend(backend, "invoices/2026/c1.pdf")).toBe("PDF-v2");

			// 2. writeWithCompanion failure (throwing merge) -> companion rolled back, primary untouched
			const remote2: InvoiceDoc = { id: "c1", year: "2026", title: "Remote2", amount: 30 };
			await backend.writeBytes("invoices/2026/c1.json", encodeJson(remote2));
			mergeBehavior = "throw";

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						{ year: "2026", id: "c1" },
						{ id: "c1", year: "2026", title: "LocalFail", amount: 1 },
						new TextEncoder().encode("PDF-SHOULD-ROLLBACK"),
					),
				"VALIDATION_FAILED",
			);
			expect(ws.pendingMutationCount).toBe(0);
			expect(await readJsonFromBackend<InvoiceDoc>(backend, "invoices/2026/c1.json")).toEqual(
				remote2,
			);
			expect(await readTextFromBackend(backend, "invoices/2026/c1.pdf")).toBe("PDF-v2");

			// 3. writeWithCompanion conflict escalation -> companion rolled back (new file deleted), conflict has custom threeWay
			await backend.writeBytes(
				"invoices/2026/c2.json",
				encodeJson({ id: "c2", year: "2026", title: "DiskC2", amount: 40 }),
			);
			mergeBehavior = "conflict";

			await expectFsErrorCode(
				() =>
					ws.collections.invoices.writeWithCompanion(
						{ year: "2026", id: "c2" },
						{ id: "c2", year: "2026", title: "LocalC2", amount: 50 },
						new TextEncoder().encode("PDF-NEW-ROLLBACK"),
					),
				"CONFLICT",
			);
			expect(await backend.exists("invoices/2026/c2.pdf")).toBe(false);
			expect(ws.unresolvedConflicts).toHaveLength(1);
			const c2Conflict = ws.unresolvedConflicts[0];
			if (!c2Conflict) {
				throw new Error("Expected c2Conflict to be present");
			}
			expect(c2Conflict.threeWay?.merged).toEqual({
				id: "c2",
				year: "2026",
				title: "Suggested:LocalC2/DiskC2",
				amount: 50,
			});

			// 4. resolveConflict() re-conflict refresh runs custom merge hook and updates threeWay
			await backend.writeBytes(
				"invoices/2026/c2.json",
				encodeJson({ id: "c2", year: "2026", title: "DiskC2-V2", amount: 60 }),
			);
			mergeBehavior = "merge";

			await expectFsErrorCode(
				() => ws.resolveConflict(c2Conflict.id, "keep-local"),
				"CONFLICT",
			);
			expect(ws.unresolvedConflicts).toHaveLength(1);
			const refreshed = ws.unresolvedConflicts[0];
			expect(refreshed?.remote).toEqual({
				id: "c2",
				year: "2026",
				title: "DiskC2-V2",
				amount: 60,
			});
			expect(refreshed?.threeWay?.merged).toEqual({
				id: "c2",
				year: "2026",
				title: "LocalC2+DiskC2-V2",
				amount: 110,
			});
			expect(mergeCalls.at(-1)).toBe("LocalC2|DiskC2-V2");
		});
	});
});
