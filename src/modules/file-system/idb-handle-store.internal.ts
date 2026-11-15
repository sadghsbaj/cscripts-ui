import { getStoragePrefix } from "../browser-storage/index.ts";
import { FsError } from "./errors.ts";
import type { IdbHandleStoreLike } from "./types.ts";

export type { IdbHandleStoreLike } from "./types.ts";

export const DEFAULT_IDB_NAME = "cs-file-system-handles";
export const DEFAULT_IDB_STORE_NAME = "handles";
export const DEFAULT_HANDLE_STORAGE_KEY = "root-handle";

export interface IdbHandleStoreOptions {
	namespace?: string;
	storageKey?: string;
	dbName?: string;
	storeName?: string;
	indexedDb?: IDBFactory;
}

function normalizeNamespace(raw: string): string {
	return raw.trim().replaceAll(/:+$/g, "");
}

/**
 * Resolves the workspace namespace from an explicit override or `getStoragePrefix()`.
 * Throws `MISSING_PREFIX` when both are empty because `file://` apps share one origin bucket.
 */
export function resolveWorkspaceNamespace(namespace?: string): string {
	const explicit = namespace === undefined ? "" : normalizeNamespace(namespace);
	const globalPrefix = normalizeNamespace(getStoragePrefix());
	const resolved = explicit.length > 0 ? explicit : globalPrefix;

	if (resolved.length === 0) {
		throw new FsError(
			"MISSING_PREFIX",
			"Workspace namespace is required. Call configureStoragePrefix() or pass options.namespace.",
		);
	}

	return resolved;
}

function isDirectoryHandleLike(value: unknown): value is FileSystemDirectoryHandle {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as { kind?: unknown; getFileHandle?: unknown };
	return candidate.kind === "directory" && typeof candidate.getFileHandle === "function";
}

function openHandleDatabase(
	idb: IDBFactory,
	dbName: string,
	storeName: string,
): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		let request: IDBOpenDBRequest;
		try {
			request = idb.open(dbName, 1);
		} catch (error) {
			reject(
				new FsError("IO_FAILED", `Failed to open IndexedDB database "${dbName}".`, {
					details: { dbName },
					cause: error,
				}),
			);
			return;
		}

		request.addEventListener("upgradeneeded", () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(storeName)) {
				db.createObjectStore(storeName);
			}
		});

		request.addEventListener("success", () => {
			resolve(request.result);
		});

		request.addEventListener("error", () => {
			reject(
				new FsError("IO_FAILED", `Failed to open IndexedDB database "${dbName}".`, {
					details: { dbName },
					cause: request.error,
				}),
			);
		});

		request.addEventListener("blocked", () => {
			reject(
				new FsError("IO_FAILED", `IndexedDB database "${dbName}" open request was blocked.`, {
					details: { dbName },
				}),
			);
		});
	});
}

function awaitTransaction(tx: IDBTransaction, action: string): Promise<void> {
	return new Promise((resolve, reject) => {
		tx.addEventListener("complete", () => {
			resolve();
		});
		tx.addEventListener("error", () => {
			reject(
				new FsError("IO_FAILED", `IndexedDB ${action} transaction failed.`, {
					cause: tx.error,
				}),
			);
		});
		tx.addEventListener("abort", () => {
			reject(
				new FsError("IO_FAILED", `IndexedDB ${action} transaction was aborted.`, {
					cause: tx.error,
				}),
			);
		});
	});
}

function awaitRequest<T>(request: IDBRequest<T>, action: string): Promise<T> {
	return new Promise((resolve, reject) => {
		request.addEventListener("success", () => {
			resolve(request.result);
		});
		request.addEventListener("error", () => {
			reject(
				new FsError("IO_FAILED", `IndexedDB ${action} request failed.`, {
					cause: request.error,
				}),
			);
		});
	});
}

export class IdbHandleStore implements IdbHandleStoreLike {
	readonly namespace: string;
	readonly storageKey: string;
	readonly key: string;
	readonly #dbName: string;
	readonly #storeName: string;
	readonly #indexedDb: IDBFactory | undefined;

	constructor(options?: IdbHandleStoreOptions) {
		this.namespace = resolveWorkspaceNamespace(options?.namespace);

		const rawStorageKey = (options?.storageKey ?? DEFAULT_HANDLE_STORAGE_KEY).trim();
		if (rawStorageKey.length === 0) {
			throw new FsError("INVALID_CONFIG", "storageKey must be a non-empty string.");
		}

		this.storageKey = rawStorageKey;
		this.key = `${this.namespace}:${this.storageKey}`;
		this.#dbName = options?.dbName ?? DEFAULT_IDB_NAME;
		this.#storeName = options?.storeName ?? DEFAULT_IDB_STORE_NAME;
		this.#indexedDb =
			options?.indexedDb ?? (typeof indexedDB === "undefined" ? undefined : indexedDB);
	}

	#requireIndexedDb(): IDBFactory {
		if (!this.#indexedDb) {
			throw new FsError("UNSUPPORTED_ENV", "IndexedDB is not available in this environment.");
		}
		return this.#indexedDb;
	}

	#startTransaction(db: IDBDatabase, mode: IDBTransactionMode, action: string): IDBTransaction {
		try {
			return db.transaction(this.#storeName, mode);
		} catch (error) {
			throw new FsError("IO_FAILED", `Failed to start IndexedDB ${action} transaction.`, {
				details: { storeName: this.#storeName, mode },
				cause: error,
			});
		}
	}

	async saveHandle(handle: FileSystemDirectoryHandle): Promise<void> {
		const idb = this.#requireIndexedDb();
		const db = await openHandleDatabase(idb, this.#dbName, this.#storeName);
		try {
			const tx = this.#startTransaction(db, "readwrite", "saveHandle");
			const store = tx.objectStore(this.#storeName);
			store.put(handle, this.key);
			await awaitTransaction(tx, "saveHandle");
		} finally {
			db.close();
		}
	}

	async loadHandle(): Promise<FileSystemDirectoryHandle | null> {
		const idb = this.#requireIndexedDb();
		const db = await openHandleDatabase(idb, this.#dbName, this.#storeName);
		try {
			const tx = this.#startTransaction(db, "readonly", "loadHandle");
			const store = tx.objectStore(this.#storeName);
			const [result] = await Promise.all([
				awaitRequest(store.get(this.key), "loadHandle"),
				awaitTransaction(tx, "loadHandle"),
			]);
			return isDirectoryHandleLike(result) ? result : null;
		} finally {
			db.close();
		}
	}

	async clearHandle(): Promise<void> {
		const idb = this.#requireIndexedDb();
		const db = await openHandleDatabase(idb, this.#dbName, this.#storeName);
		try {
			const tx = this.#startTransaction(db, "readwrite", "clearHandle");
			const store = tx.objectStore(this.#storeName);
			store.delete(this.key);
			await awaitTransaction(tx, "clearHandle");
		} finally {
			db.close();
		}
	}
}
