import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureStoragePrefix, getStoragePrefix } from "../browser-storage/index.ts";
import { isFsError, type FsError, type FsErrorCode } from "./errors.ts";
import {
	IdbHandleStore,
	resolveWorkspaceNamespace,
} from "./idb-handle-store.internal.ts";
import {
	clearEmergencyLogs,
	DEFAULT_EMERGENCY_LOG_MAX_BYTES,
	DEFAULT_EMERGENCY_LOG_MAX_ENTRIES,
	FsLogger,
	getEmergencyLogs,
	recordEmergencyLog,
	type FsLogEntry,
} from "./logger.internal.ts";
import { MemoryFsBackend } from "./memory-fs.internal.ts";
import { WriteQueue } from "./write-queue.internal.ts";

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
	throw new Error(`Expected FsError("${code}") to be thrown`);
}

function makeFakeDirHandle(name: string): FileSystemDirectoryHandle {
	return {
		kind: "directory",
		name,
		getFileHandle: vi.fn(),
		getDirectoryHandle: vi.fn(),
		removeEntry: vi.fn(),
		resolve: vi.fn(),
		isSameEntry: vi.fn(),
		queryPermission: vi.fn(),
		requestPermission: vi.fn(),
		keys: vi.fn(),
		values: vi.fn(),
		entries: vi.fn(),
		[Symbol.asyncIterator]: vi.fn(),
	} as unknown as FileSystemDirectoryHandle;
}

class MockEventRequest<T> extends EventTarget {
	result!: T;
	error: DOMException | null = null;
	transaction: IDBTransaction | null = null;
}

class MockOpenDbRequest extends MockEventRequest<IDBDatabase> {
	onupgradeneeded: ((ev: IDBVersionChangeEvent) => void) | null = null;
}

function createMockIndexedDb(): IDBFactory {
	const databases = new Map<string, Map<string, Map<IDBValidKey, unknown>>>();

	return {
		open(name: string): IDBOpenDBRequest {
			const req = new MockOpenDbRequest();
			let stores = databases.get(name);
			const isNew = stores === undefined;
			if (!stores) {
				stores = new Map();
				databases.set(name, stores);
			}

			const db: IDBDatabase = {
				name,
				version: 1,
				get objectStoreNames(): DOMStringList {
					const names = stores.keys().toArray();
					return {
						length: names.length,
						contains: (n: string) => stores.has(n),
						item: (i: number) => names[i] ?? null,
						[Symbol.iterator]: () => names[Symbol.iterator](),
					} as unknown as DOMStringList;
				},
				createObjectStore(storeName: string): IDBObjectStore {
					if (!stores.has(storeName)) {
						stores.set(storeName, new Map());
					}
					return {} as IDBObjectStore;
				},
				transaction(storeNames: string | string[]): IDBTransaction {
					const targetName = (Array.isArray(storeNames) ? storeNames[0] : storeNames) ?? "";
					const tx = new EventTarget() as IDBTransaction & { error: DOMException | null };
					tx.error = null;
					let scheduled = false;
					const scheduleComplete = (): void => {
						if (scheduled) return;
						scheduled = true;
						queueMicrotask(() => {
							tx.dispatchEvent(new Event("complete"));
						});
					};

					(tx as unknown as { objectStore: (n: string) => IDBObjectStore }).objectStore = (
						storeName: string,
					) => {
						const storeMap = stores.get(storeName || targetName);
						if (!storeMap) {
							throw new DOMException(`Store "${storeName}" not found`, "NotFoundError");
						}
						return {
							put(value: unknown, key?: IDBValidKey): IDBRequest<IDBValidKey> {
								const opReq = new MockEventRequest<IDBValidKey>();
								if (key !== undefined) {
									storeMap.set(key, value);
									opReq.result = key;
								}
								queueMicrotask(() => {
									opReq.dispatchEvent(new Event("success"));
									scheduleComplete();
								});
								return opReq as unknown as IDBRequest<IDBValidKey>;
							},
							get(key: IDBValidKey): IDBRequest<unknown> {
								const opReq = new MockEventRequest<unknown>();
								const value = storeMap.get(key);
								queueMicrotask(() => {
									opReq.result = value;
									opReq.dispatchEvent(new Event("success"));
									scheduleComplete();
								});
								return opReq as unknown as IDBRequest<unknown>;
							},
							delete(key: IDBValidKey): IDBRequest<undefined> {
								const opReq = new MockEventRequest<undefined>();
								storeMap.delete(key);
								queueMicrotask(() => {
									opReq.result = undefined;
									opReq.dispatchEvent(new Event("success"));
									scheduleComplete();
								});
								return opReq as unknown as IDBRequest<undefined>;
							},
						} as unknown as IDBObjectStore;
					};

					return tx as unknown as IDBTransaction;
				},
				close() {
					// noop
				},
			} as unknown as IDBDatabase;

			req.result = db;
			queueMicrotask(() => {
				if (isNew) {
					req.dispatchEvent(new Event("upgradeneeded"));
				}
				req.dispatchEvent(new Event("success"));
			});

			return req as unknown as IDBOpenDBRequest;
		},
	} as unknown as IDBFactory;
}

describe("idb-handle-store: resolveWorkspaceNamespace & IdbHandleStore", () => {
	let originalPrefix = "";

	beforeEach(() => {
		originalPrefix = getStoragePrefix();
		configureStoragePrefix("");
	});

	afterEach(() => {
		configureStoragePrefix(originalPrefix);
	});

	it("throws MISSING_PREFIX when both getStoragePrefix() and namespace are empty or whitespace", async () => {
		await expectFsErrorCode(() => resolveWorkspaceNamespace(), "MISSING_PREFIX");
		await expectFsErrorCode(() => resolveWorkspaceNamespace(""), "MISSING_PREFIX");
		await expectFsErrorCode(() => resolveWorkspaceNamespace(" ".repeat(3)), "MISSING_PREFIX");
		await expectFsErrorCode(() => resolveWorkspaceNamespace(":::"), "MISSING_PREFIX");

		configureStoragePrefix(" ".repeat(3));
		await expectFsErrorCode(() => resolveWorkspaceNamespace(), "MISSING_PREFIX");

		configureStoragePrefix("global-app:");
		expect(resolveWorkspaceNamespace()).toBe("global-app");
		expect(resolveWorkspaceNamespace("custom-ns::")).toBe("custom-ns");
	});

	it("saves, loads, and clears handles and isolates across namespaces and storageKeys", async () => {
		const mockIdb = createMockIndexedDb();
		configureStoragePrefix("shared-prefix");

		const storeA1 = new IdbHandleStore({
			namespace: "workspace-a",
			storageKey: "primary",
			indexedDb: mockIdb,
		});
		const storeA2 = new IdbHandleStore({
			namespace: "workspace-a",
			storageKey: "backup",
			indexedDb: mockIdb,
		});
		const storeB1 = new IdbHandleStore({
			namespace: "workspace-b",
			storageKey: "primary",
			indexedDb: mockIdb,
		});
		const storeGlobal = new IdbHandleStore({
			storageKey: "primary",
			indexedDb: mockIdb,
		});

		expect(storeGlobal.namespace).toBe("shared-prefix");
		expect(storeA1.key).toBe("workspace-a:primary");
		expect(storeA2.key).toBe("workspace-a:backup");
		expect(storeB1.key).toBe("workspace-b:primary");

		const handleA1 = makeFakeDirHandle("dir-a1");
		const handleA2 = makeFakeDirHandle("dir-a2");
		const handleB1 = makeFakeDirHandle("dir-b1");

		await storeA1.saveHandle(handleA1);
		await storeA2.saveHandle(handleA2);
		await storeB1.saveHandle(handleB1);

		const loadedA1 = await storeA1.loadHandle();
		const loadedA2 = await storeA2.loadHandle();
		const loadedB1 = await storeB1.loadHandle();
		expect(loadedA1?.name).toBe("dir-a1");
		expect(loadedA2?.name).toBe("dir-a2");
		expect(loadedB1?.name).toBe("dir-b1");
		expect(await storeGlobal.loadHandle()).toBeNull();

		// Clearing A1 does not touch A2 or B1
		await storeA1.clearHandle();
		expect(await storeA1.loadHandle()).toBeNull();
		const loadedA2After = await storeA2.loadHandle();
		const loadedB1After = await storeB1.loadHandle();
		expect(loadedA2After?.name).toBe("dir-a2");
		expect(loadedB1After?.name).toBe("dir-b1");

		await expectFsErrorCode(
			() => new IdbHandleStore({ namespace: "workspace-a", storageKey: "  ", indexedDb: mockIdb }),
			"INVALID_CONFIG",
		);
	});

	it("throws UNSUPPORTED_ENV when indexedDB is unavailable, maps error/blocked/abort to IO_FAILED, and returns null for non-handle values", async () => {
		// 1. UNSUPPORTED_ENV when indexedDB is missing (e.g. SSR)
		vi.stubGlobal("indexedDB", undefined);
		try {
			const noIdbStore = new IdbHandleStore({ namespace: "ssr-ns" });
			await expectFsErrorCode(() => noIdbStore.loadHandle(), "UNSUPPORTED_ENV");
			await expectFsErrorCode(() => noIdbStore.saveHandle(makeFakeDirHandle("x")), "UNSUPPORTED_ENV");
			await expectFsErrorCode(() => noIdbStore.clearHandle(), "UNSUPPORTED_ENV");
		} finally {
			vi.unstubAllGlobals();
		}

		// 2. IDB open 'error' and 'blocked' -> IO_FAILED
		const makeOpenFaultIdb = (eventType: "error" | "blocked"): IDBFactory =>
			({
				open(): IDBOpenDBRequest {
					const req = new MockOpenDbRequest();
					req.error = new DOMException("Open failed", "UnknownError");
					queueMicrotask(() => {
						req.dispatchEvent(new Event(eventType));
					});
					return req as unknown as IDBOpenDBRequest;
				},
			}) as unknown as IDBFactory;

		const errorStore = new IdbHandleStore({
			namespace: "err-ns",
			indexedDb: makeOpenFaultIdb("error"),
		});
		await expectFsErrorCode(() => errorStore.loadHandle(), "IO_FAILED");

		const blockedStore = new IdbHandleStore({
			namespace: "blk-ns",
			indexedDb: makeOpenFaultIdb("blocked"),
		});
		await expectFsErrorCode(() => blockedStore.loadHandle(), "IO_FAILED");

		// 3. Transaction 'abort' -> IO_FAILED
		const abortTxIdb: IDBFactory = {
			open(): IDBOpenDBRequest {
				const req = new MockOpenDbRequest();
				const db = {
					objectStoreNames: {
						contains: () => true,
					},
					transaction(): IDBTransaction {
						const tx = new EventTarget() as IDBTransaction & { error: DOMException | null };
						tx.error = new DOMException("Aborted", "AbortError");
						(tx as unknown as { objectStore: () => IDBObjectStore }).objectStore = () =>
							({
								put(): IDBRequest {
									const opReq = new MockEventRequest();
									queueMicrotask(() => {
										tx.dispatchEvent(new Event("abort"));
									});
									return opReq as unknown as IDBRequest;
								},
							}) as unknown as IDBObjectStore;
						return tx as unknown as IDBTransaction;
					},
					close() {
						// noop
					},
				} as unknown as IDBDatabase;
				req.result = db;
				queueMicrotask(() => {
					req.dispatchEvent(new Event("success"));
				});
				return req as unknown as IDBOpenDBRequest;
			},
		} as unknown as IDBFactory;

		const abortStore = new IdbHandleStore({ namespace: "abort-ns", indexedDb: abortTxIdb });
		await expectFsErrorCode(() => abortStore.saveHandle(makeFakeDirHandle("x")), "IO_FAILED");

		// 4. loadHandle() returns null for non-directory-handle values
		const mockIdb = createMockIndexedDb();
		const nonHandleStore = new IdbHandleStore({
			namespace: "corrupt-val-ns",
			storageKey: "k",
			indexedDb: mockIdb,
		});
		await nonHandleStore.saveHandle({ kind: "file", name: "not-a-dir" } as unknown as FileSystemDirectoryHandle);
		expect(await nonHandleStore.loadHandle()).toBeNull();
	});
});

describe("logger: FsLogger & emergency localStorage fallback", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		localStorage.clear();
	});

	it("filters 'read' and 'debug' noise at logLevel='info', and captures them at logLevel='debug'", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		const infoEntries: FsLogEntry[] = [];
		const infoLogger = new FsLogger({
			namespace: "test-info",
			logLevel: "info",
			logFlushMs: 0,
			backend,
			writeQueue,
			onLog: (entry) => {
				infoEntries.push(entry);
			},
		});

		expect(infoLogger.log({ level: "debug", event: "cache", message: "cache debug" })).toBeNull();
		expect(infoLogger.log({ level: "info", event: "read", message: "read hit" })).toBeNull();
		const writeEntry = infoLogger.log({
			level: "info",
			event: "write",
			path: "doc.json",
			message: "wrote doc",
		});
		expect(writeEntry).not.toBeNull();
		expect(infoEntries).toHaveLength(1);
		expect(infoEntries[0]?.event).toBe("write");

		await infoLogger.flush();
		const persistedInfo = await infoLogger.readLogs();
		expect(persistedInfo).toHaveLength(1);
		infoLogger.destroy();

		const debugBackend = new MemoryFsBackend();
		const debugQueue = new WriteQueue(debugBackend);
		const debugEntries: FsLogEntry[] = [];
		const debugLogger = new FsLogger({
			namespace: "test-debug",
			logLevel: "debug",
			logFlushMs: 0,
			backend: debugBackend,
			writeQueue: debugQueue,
			onLog: (entry) => {
				debugEntries.push(entry);
			},
		});

		debugLogger.log({ level: "debug", event: "cache", message: "cache debug" });
		debugLogger.log({ level: "info", event: "read", path: "a.json", message: "read a" });
		debugLogger.log({ level: "warn", event: "warn", message: "careful" });

		await debugLogger.flush();
		expect(debugEntries.map((e) => e.event)).toEqual(["cache", "read", "warn"]);
		const persistedDebug = await debugLogger.readLogs();
		expect(persistedDebug).toHaveLength(3);
		debugLogger.destroy();
	});

	it("coalesces batched JSONL appends via logFlushMs and flushes immediately on error, conflict, or flush()", async () => {
		vi.useFakeTimers();
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const writeSpy = vi.spyOn(backend, "writeBytes");

		const logger = new FsLogger({
			namespace: "batch-test",
			logLevel: "info",
			logFlushMs: 200,
			backend,
			writeQueue,
		});

		logger.log({ level: "info", event: "write", path: "1.json", message: "one" });
		logger.log({ level: "info", event: "write", path: "2.json", message: "two" });
		logger.log({ level: "warn", event: "warn", path: "3.json", message: "three" });

		// Nothing flushed yet before timer fires
		expect(writeSpy).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(200);
		expect(writeSpy).toHaveBeenCalledTimes(1);

		// Immediate flush on "error"
		logger.log({
			level: "error",
			event: "error",
			code: "IO_FAILED",
			path: "4.json",
			message: "disk error",
		});
		await vi.waitFor(() => expect(writeSpy).toHaveBeenCalledTimes(2));

		// Immediate flush on "conflict"
		logger.log({
			level: "warn",
			event: "conflict",
			path: "5.json",
			message: "merge conflict",
		});
		await vi.waitFor(() => expect(writeSpy).toHaveBeenCalledTimes(3));

		// Explicit flush() coalesces pending entry immediately
		logger.log({ level: "info", event: "delete", path: "6.json", message: "deleted" });
		expect(writeSpy).toHaveBeenCalledTimes(3);
		await logger.flush();
		expect(writeSpy).toHaveBeenCalledTimes(4);

		const all = await logger.readLogs();
		expect(all).toHaveLength(6);
		logger.destroy();
	});

	it("rotates logs by maxBytes and maxLines, prunes beyond maxFiles, and reads across rotated files with limit and level", async () => {
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);

		// Note: logger clamps maxLines >= 10, maxBytes >= 1024, maxFiles >= 1.
		const logger = new FsLogger({
			namespace: "rotate-lines",
			logLevel: "info",
			logFlushMs: 60_000,
			rotation: {
				maxLines: 10,
				maxBytes: 1024 * 1024,
				maxFiles: 3, // keeps fs.jsonl, fs.1.jsonl, fs.2.jsonl
			},
			backend,
			writeQueue,
		});

		// Write in batches of 6 lines so rotation triggers cleanly across multiple flushes
		for (let batch = 0; batch < 5; batch += 1) {
			for (let i = 0; i < 6; i += 1) {
				const idx = batch * 6 + i + 1;
				logger.log({
					level: idx % 5 === 0 ? "warn" : "info",
					event: "write",
					path: `file-${idx}.json`,
					message: `msg-${idx}`,
				});
			}
			await logger.flush();
		}

		const dirEntries = await backend.listDir("_cs-fs/logs");
		const fileNames = dirEntries.map((e) => e.name).toSorted((a, b) => a.localeCompare(b));
		expect(fileNames).toEqual(["fs.1.jsonl", "fs.2.jsonl", "fs.jsonl"]);

		const allRetained = await logger.readLogs();
		// 3 files * 6 lines each = 18 entries retained (oldest 12 pruned)
		expect(allRetained).toHaveLength(18);
		expect(allRetained[0]?.message).toBe("msg-13");
		expect(allRetained.at(-1)?.message).toBe("msg-30");

		// Filter by level & limit across rotated files
		const warns = await logger.readLogs({ level: "warn" });
		expect(warns.every((e) => e.level === "warn")).toBe(true);
		expect(warns.map((e) => e.message)).toEqual(["msg-15", "msg-20", "msg-25", "msg-30"]);

		const limited = await logger.readLogs({ limit: 4 });
		expect(limited.map((e) => e.message)).toEqual(["msg-27", "msg-28", "msg-29", "msg-30"]);
		logger.destroy();

		// Also verify rotation by maxBytes (min 1024 bytes) with default maxFiles = 5
		const byteBackend = new MemoryFsBackend();
		const byteQueue = new WriteQueue(byteBackend);
		const byteLogger = new FsLogger({
			namespace: "rotate-bytes",
			logLevel: "info",
			logFlushMs: 0,
			rotation: {
				maxBytes: 1024,
				maxLines: 1000,
			},
			backend: byteBackend,
			writeQueue: byteQueue,
		});

		for (let i = 0; i < 7; i += 1) {
			// Each entry ~700 bytes -> every 2nd flush exceeds 1024 bytes and rotates
			byteLogger.log({
				level: "info",
				event: "heal",
				message: `batch-${i}:${"x".repeat(600)}`,
			});
			await byteLogger.flush();
		}

		const byteDirEntries = await byteBackend.listDir("_cs-fs/logs");
		const byteFiles = byteDirEntries.map((e) => e.name).toSorted((a, b) => a.localeCompare(b));
		expect(byteFiles).toHaveLength(5);
		expect(byteFiles).toEqual([
			"fs.1.jsonl",
			"fs.2.jsonl",
			"fs.3.jsonl",
			"fs.4.jsonl",
			"fs.jsonl",
		]);
		byteLogger.destroy();
	});

	it("passes structured entries to onLog hook and isolates hook errors", () => {
		const received: FsLogEntry[] = [];
		const throwingHook = vi.fn((entry: FsLogEntry) => {
			received.push(entry);
			throw new Error("consumer hook failure");
		});

		const logger = new FsLogger({
			namespace: "hook-test",
			logLevel: "info",
			onLog: throwingHook,
		});

		const entry = logger.log({
			level: "warn",
			event: "heal",
			path: "records/1.json",
			durationMs: 12,
			code: "CORRUPT_DATA",
			message: "Recovered record",
			meta: { attempt: 1 },
		});

		expect(throwingHook).toHaveBeenCalledTimes(1);
		expect(entry).toMatchObject({
			seq: 1,
			level: "warn",
			event: "heal",
			path: "records/1.json",
			durationMs: 12,
			code: "CORRUPT_DATA",
			message: "Recovered record",
			meta: { attempt: 1 },
		});
		expect(typeof entry?.ts).toBe("string");
		expect(received[0]).toEqual(entry);
		logger.destroy();
	});

	it("stores metadata-only emergency logs in localStorage ring buffer (50 entries, ~64 KiB cap) and supports get/clear", async () => {
		const ns = "emerg-ns";
		const otherNs = "other-ns";

		// 1. Trigger emergency fallback via disk flush failure
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		backend.simulateError("_cs-fs/logs/fs.jsonl", "IO_FAILED");

		const logger = new FsLogger({
			namespace: ns,
			logLevel: "info",
			logFlushMs: 0,
			backend,
			writeQueue,
		});
		logger.log({
			level: "warn",
			event: "write",
			path: "items/1.json",
			message: "save failed",
			meta: { secretBusinessPayload: "MUST_NOT_APPEAR_IN_LOCALSTORAGE" },
		});
		await logger.flush();
		logger.destroy();

		const rawStored = localStorage.getItem(`${ns}:fs-emergency-log`);
		expect(rawStored).not.toBeNull();
		expect(rawStored).not.toContain("MUST_NOT_APPEAR_IN_LOCALSTORAGE");
		expect(getEmergencyLogs(ns).length).toBeGreaterThanOrEqual(1);

		clearEmergencyLogs(ns);
		expect(getEmergencyLogs(ns)).toEqual([]);
		expect(localStorage.getItem(`${ns}:fs-emergency-log`)).toBeNull();

		// 2. Ring buffer maxEntries = 50
		for (let i = 1; i <= 60; i += 1) {
			recordEmergencyLog(ns, {
				level: "error",
				event: "error",
				code: "IO_FAILED",
				message: `err-${i}`,
			});
		}
		const cappedCount = getEmergencyLogs(ns);
		expect(cappedCount).toHaveLength(DEFAULT_EMERGENCY_LOG_MAX_ENTRIES);
		expect(cappedCount[0]?.message).toBe("err-11");
		expect(cappedCount.at(-1)?.message).toBe("err-60");

		// 3. ~64 KiB UTF-8 byte cap using 4-byte emoji characters (512 UTF-16 code units = 1024 UTF-8 bytes)
		clearEmergencyLogs(ns);
		const bigEmoji = "🚀".repeat(256);
		for (let i = 0; i < 50; i += 1) {
			recordEmergencyLog(ns, {
				level: "error",
				event: "error",
				code: "IO_FAILED",
				path: `nested/${"a".repeat(200)}/${i}.json`,
				message: `${i}:${bigEmoji}`,
			});
		}
		const rawAfterByteCap = localStorage.getItem(`${ns}:fs-emergency-log`) ?? "";
		const byteLen = new TextEncoder().encode(rawAfterByteCap).byteLength;
		expect(byteLen).toBeLessThanOrEqual(DEFAULT_EMERGENCY_LOG_MAX_BYTES);
		expect(getEmergencyLogs(ns).length).toBeLessThan(DEFAULT_EMERGENCY_LOG_MAX_ENTRIES);

		// Isolation across namespaces
		recordEmergencyLog(otherNs, { level: "warn", event: "warn", message: "other" });
		clearEmergencyLogs(ns);
		expect(getEmergencyLogs(ns)).toEqual([]);
		expect(getEmergencyLogs(otherNs)).toHaveLength(1);
	});

	it("writes urgent error/conflict logs to emergency localStorage when unmounted and cancels timers/logs on destroy()", async () => {
		const ns = "unmounted-ns";
		const unmounted = new FsLogger({
			namespace: ns,
			logLevel: "info",
		});

		// Non-urgent logs when unmounted do not go to emergency localStorage
		unmounted.log({ level: "info", event: "mount", message: "info only" });
		unmounted.log({ level: "warn", event: "warn", message: "warn only" });
		expect(getEmergencyLogs(ns)).toEqual([]);

		// Urgent logs ("error" level or "conflict" event) go to emergency localStorage
		unmounted.log({
			level: "error",
			event: "error",
			code: "PERMISSION_DENIED",
			path: "root",
			message: "permission denied",
		});
		unmounted.log({
			level: "warn",
			event: "conflict",
			path: "doc.json",
			message: "conflict detected",
		});
		const emerg = getEmergencyLogs(ns);
		expect(emerg).toHaveLength(2);
		expect(emerg[0]?.code).toBe("PERMISSION_DENIED");
		expect(emerg[1]?.event).toBe("conflict");
		unmounted.destroy();

		// destroy() cancels pending flush timers and ignores subsequent log() calls
		vi.useFakeTimers();
		const backend = new MemoryFsBackend();
		const writeQueue = new WriteQueue(backend);
		const writeSpy = vi.spyOn(backend, "writeBytes");
		const onLogSpy = vi.fn();

		const mounted = new FsLogger({
			namespace: "destroy-ns",
			logLevel: "info",
			logFlushMs: 500,
			backend,
			writeQueue,
			onLog: onLogSpy,
		});

		mounted.log({ level: "info", event: "write", path: "a.json", message: "pending" });
		expect(onLogSpy).toHaveBeenCalledTimes(1);
		mounted.destroy();

		await vi.advanceTimersByTimeAsync(1000);
		expect(writeSpy).not.toHaveBeenCalled();

		expect(mounted.log({ level: "error", event: "error", message: "after destroy" })).toBeNull();
		expect(onLogSpy).toHaveBeenCalledTimes(1);
	});
});
