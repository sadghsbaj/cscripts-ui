import { FsError, isFsError } from "./errors.ts";
import { sha256Hex } from "./fs-backend.internal.ts";
import { DEFAULT_SYSTEM_DIR, normalizeRelativePath } from "./path-template.ts";
import type {
	BackupOptions,
	FileRevision,
	FsBackend,
	LockRetryOptions,
	SafeDeleteOptions,
	SafeMoveOptions,
	SafeWriteOptions,
} from "./types.ts";

export type {
	BackupOptions,
	LockRetryOptions,
	SafeDeleteOptions,
	SafeMoveOptions,
	SafeWriteOptions,
} from "./types.ts";

export interface WriteQueueOptions {
	systemDir?: string;
	useWebLocks?: boolean;
	lockPrefix?: string;
	retryOnLock?: boolean | LockRetryOptions;
	verifyAfterWrite?: boolean;
	backup?: BackupOptions;
}

const DEFAULT_RETRY_OPTIONS: Required<LockRetryOptions> = {
	maxRetries: 3,
	baseDelayMs: 50,
	maxDelayMs: 500,
};

const DEFAULT_MAX_BACKUPS_PER_FILE = 5;
const DEFAULT_MAX_BACKUP_AGE_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export function revisionsMatch(expected: FileRevision, actual: FileRevision): boolean {
	if (expected.lastModified !== actual.lastModified || expected.size !== actual.size) {
		return false;
	}
	if (expected.hash !== undefined && actual.hash !== undefined) {
		return expected.hash === actual.hash;
	}
	return true;
}

function resolveRetryConfig(
	option: boolean | LockRetryOptions | undefined,
	fallback: boolean | LockRetryOptions | undefined,
): Required<LockRetryOptions> | null {
	const effective = option ?? fallback ?? true;
	if (effective === false) {
		return null;
	}
	if (effective === true) {
		return DEFAULT_RETRY_OPTIONS;
	}
	return {
		maxRetries: effective.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
		baseDelayMs: effective.baseDelayMs ?? DEFAULT_RETRY_OPTIONS.baseDelayMs,
		maxDelayMs: effective.maxDelayMs ?? DEFAULT_RETRY_OPTIONS.maxDelayMs,
	};
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

function encodeBackupPrefix(relativePath: string): string {
	return relativePath.replaceAll("%", "%25").replaceAll("/", "%2F");
}

function parseBackupMeta(
	fileName: string,
	prefix: string,
): { ts: number; seq: number } | null {
	if (!fileName.startsWith(`${prefix}.`) || !fileName.endsWith(".bak")) {
		return null;
	}
	const middle = fileName.slice(prefix.length + 1, -4);
	const dotIndex = middle.indexOf(".");
	const tsPart = dotIndex === -1 ? middle : middle.slice(0, dotIndex);
	const seqPart = dotIndex === -1 ? "0" : middle.slice(dotIndex + 1);
	const ts = Number(tsPart);
	const seq = Number(seqPart);
	if (!Number.isFinite(ts) || ts <= 0) {
		return null;
	}
	return { ts, seq: Number.isFinite(seq) ? seq : 0 };
}

export class WriteQueue {
	readonly #backend: FsBackend;
	readonly #systemDir: string;
	readonly #useWebLocks: boolean;
	readonly #lockPrefix: string;
	readonly #retryOnLock: boolean | LockRetryOptions | undefined;
	readonly #verifyAfterWrite: boolean;
	readonly #backupOptions: Required<BackupOptions>;

	readonly #pathTails = new Map<string, Promise<void>>();
	readonly #activeTasks = new Set<Promise<unknown>>();
	#barrierPromise: Promise<void> = Promise.resolve();
	#barrierCount = 0;
	#pendingBarrierWaiters = 0;
	#backupSeq = 0;

	constructor(backend: FsBackend, options?: WriteQueueOptions) {
		this.#backend = backend;
		this.#systemDir = options?.systemDir ?? DEFAULT_SYSTEM_DIR;
		this.#useWebLocks = options?.useWebLocks ?? true;
		this.#lockPrefix = options?.lockPrefix ?? "cs-fs";
		this.#retryOnLock = options?.retryOnLock;
		this.#verifyAfterWrite = options?.verifyAfterWrite ?? false;
		this.#backupOptions = {
			enabled: options?.backup?.enabled ?? false,
			maxBackupsPerFile: options?.backup?.maxBackupsPerFile ?? DEFAULT_MAX_BACKUPS_PER_FILE,
			maxBackupAgeDays: options?.backup?.maxBackupAgeDays ?? DEFAULT_MAX_BACKUP_AGE_DAYS,
		};
	}

	async withPathLock<T>(relativePath: string, fn: () => Promise<T>): Promise<T> {
		return this.withPathLocks([relativePath], fn);
	}

	/**
	 * Acquires per-path locks in deterministic sorted order.
	 * Invariant: Lock callbacks (`fn`) must never re-entrantly invoke the same `WriteQueue`,
	 * or they will self-deadlock on the path tail or global barrier.
	 */
	async withPathLocks<T>(paths: readonly string[], fn: () => Promise<T>): Promise<T> {
		const uniqueSorted = [...new Set(paths.map((p) => normalizeRelativePath(p)))].toSorted(
			(a, b) => a.localeCompare(b),
		);
		if (uniqueSorted.length === 0) {
			return fn();
		}

		this.#pendingBarrierWaiters += 1;
		let task: Promise<T>;
		let reservations: Array<{
			path: string;
			previous: Promise<void>;
			nextTail: Promise<void>;
			release: () => void;
		}> = [];

		try {
			// Wait for any active or queued global barrier before registering on #activeTasks.
			while (this.#barrierCount > 0) {
				await this.#barrierPromise;
			}

			reservations = uniqueSorted.map((path) => {
				const previous = this.#pathTails.get(path) ?? Promise.resolve();
				const { promise: nextTail, resolve: release } = Promise.withResolvers<void>();
				this.#pathTails.set(path, nextTail);
				return { path, previous, nextTail, release };
			});

			const runWithLocks = async (): Promise<T> => {
				await Promise.all(reservations.map((r) => r.previous));
				const acquireWebLocks = (index: number): Promise<T> => {
					const path = uniqueSorted[index];
					if (path === undefined) {
						return fn();
					}
					return this.#withOptionalWebLock(`path:${path}`, () => acquireWebLocks(index + 1));
				};
				return acquireWebLocks(0);
			};

			task = runWithLocks();
			this.#activeTasks.add(task);
		} finally {
			this.#pendingBarrierWaiters -= 1;
		}

		try {
			return await task;
		} finally {
			this.#activeTasks.delete(task);
			for (const res of reservations) {
				res.release();
				if (this.#pathTails.get(res.path) === res.nextTail) {
					this.#pathTails.delete(res.path);
				}
			}
		}
	}

	/**
	 * Executes `fn` exclusively after draining all active path tasks and prior barriers.
	 * Invariant: Lock callbacks (`fn`) must never re-entrantly invoke the same `WriteQueue`,
	 * or they will self-deadlock on the path tail or global barrier.
	 */
	async withGlobalBarrier<T>(fn: () => Promise<T>): Promise<T> {
		const prevBarrier = this.#barrierPromise;
		const { promise: currentBarrier, resolve: releaseBarrier } = Promise.withResolvers<void>();
		this.#barrierPromise = currentBarrier;
		this.#barrierCount += 1;

		try {
			await prevBarrier;
			await Promise.allSettled(this.#activeTasks);
			return await this.#withOptionalWebLock("global-barrier", fn);
		} finally {
			this.#barrierCount -= 1;
			releaseBarrier();
		}
	}

	async flush(): Promise<void> {
		while (
			this.#barrierCount > 0 ||
			this.#pendingBarrierWaiters > 0 ||
			this.#activeTasks.size > 0
		) {
			if (this.#barrierCount > 0) {
				await this.#barrierPromise;
			}
			if (this.#activeTasks.size > 0) {
				await Promise.allSettled(this.#activeTasks);
			}
			if (this.#pendingBarrierWaiters > 0) {
				// Yield a microtask so barrier waiters can register into #activeTasks.
				await Promise.resolve();
			}
		}
	}

	async write(
		relativePath: string,
		bytes: Uint8Array,
		options?: SafeWriteOptions,
	): Promise<FileRevision> {
		const normalized = normalizeRelativePath(relativePath);
		return this.withPathLock(normalized, () => {
			let backupChecked = false;
			return this.#withLockRetry(options?.retryOnLock, async () => {
				if (options?.expectedRevision !== undefined) {
					await this.#assertExpectedRevision(normalized, options.expectedRevision);
				}

				const shouldBackup = options?.backup ?? this.#backupOptions.enabled;
				if (shouldBackup && !backupChecked) {
					await this.#createBackupIfExists(normalized);
					backupChecked = true;
				}

				const shouldVerify = options?.verifyAfterWrite ?? this.#verifyAfterWrite;
				const expectedHash = shouldVerify ? await sha256Hex(bytes) : undefined;

				const revision = await this.#backend.writeBytes(normalized, bytes, options);

				if (shouldVerify && expectedHash !== undefined) {
					const readBack = await this.#backend.readBytes(normalized, {
						signal: options?.signal,
					});
					const actualHash = await sha256Hex(readBack.bytes);
					if (readBack.bytes.byteLength !== bytes.byteLength || actualHash !== expectedHash) {
						throw new FsError(
							"IO_FAILED",
							`Post-write verification failed for "${normalized}".`,
							{
								details: {
									path: normalized,
									expectedSize: bytes.byteLength,
									actualSize: readBack.bytes.byteLength,
									expectedHash,
									actualHash,
								},
							},
						);
					}
					return { ...readBack.revision, hash: actualHash };
				}

				return revision;
			});
		});
	}

	async delete(relativePath: string, options?: SafeDeleteOptions): Promise<void> {
		const normalized = normalizeRelativePath(relativePath);
		return this.withPathLock(normalized, () => {
			let backupChecked = false;
			return this.#withLockRetry(options?.retryOnLock, async () => {
				if (options?.expectedRevision !== undefined) {
					await this.#assertExpectedRevision(normalized, options.expectedRevision);
				}

				const shouldBackup = options?.backup ?? this.#backupOptions.enabled;
				if (shouldBackup && !backupChecked) {
					await this.#createBackupIfExists(normalized);
					backupChecked = true;
				}

				await this.#backend.deleteFile(normalized);
			});
		});
	}

	async move(
		fromPath: string,
		toPath: string,
		options?: SafeMoveOptions,
	): Promise<FileRevision> {
		const normalizedFrom = normalizeRelativePath(fromPath);
		const normalizedTo = normalizeRelativePath(toPath);

		if (normalizedFrom === normalizedTo) {
			return this.withPathLock(normalizedFrom, async () => {
				const stat = await this.#backend.stat(normalizedFrom);
				if (!stat) {
					throw new FsError("NOT_FOUND", `File not found: "${normalizedFrom}".`, {
						details: { path: normalizedFrom },
					});
				}
				return { size: stat.size, lastModified: stat.lastModified };
			});
		}

		// Acquire all path locks atomically in deterministic order to avoid barrier deadlocks.
		return this.withPathLocks([normalizedFrom, normalizedTo], () =>
			this.#withLockRetry(options?.retryOnLock, async () => {
				if (options?.expectedRevision !== undefined) {
					await this.#assertExpectedRevision(normalizedFrom, options.expectedRevision);
				}
				return this.#backend.moveFile(normalizedFrom, normalizedTo);
			}),
		);
	}

	async #withOptionalWebLock<T>(lockSuffix: string, fn: () => Promise<T>): Promise<T> {
		if (
			!this.#useWebLocks ||
			typeof navigator === "undefined" ||
			typeof navigator.locks?.request !== "function"
		) {
			return fn();
		}
		const lockName = `${this.#lockPrefix}:${lockSuffix}`;
		return navigator.locks.request(lockName, fn);
	}

	async #withLockRetry<T>(
		override: boolean | LockRetryOptions | undefined,
		fn: () => Promise<T>,
	): Promise<T> {
		const config = resolveRetryConfig(override, this.#retryOnLock);
		if (!config) {
			return fn();
		}

		let attempt = 0;
		for (;;) {
			try {
				return await fn();
			} catch (error) {
				if (!isFsError(error) || error.code !== "FILE_LOCKED" || attempt >= config.maxRetries) {
					throw error;
				}
				const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** attempt);
				const jitter = Math.floor(Math.random() * Math.max(1, exponential * 0.5));
				attempt += 1;
				await sleep(exponential + jitter);
			}
		}
	}

	async #assertExpectedRevision(
		path: string,
		expectedRevision: FileRevision | null,
	): Promise<void> {
		const currentStat = await this.#backend.stat(path);
		if (expectedRevision === null) {
			if (currentStat !== null) {
				const remoteRevision: FileRevision = {
					size: currentStat.size,
					lastModified: currentStat.lastModified,
				};
				throw new FsError("CONFLICT", `File "${path}" already exists on disk.`, {
					details: { path, expectedRevision: null, remoteRevision },
				});
			}
			return;
		}

		if (currentStat === null) {
			throw new FsError("CONFLICT", `File "${path}" was deleted externally.`, {
				details: { path, expectedRevision, remoteRevision: null },
			});
		}

		const remoteRevision: FileRevision = {
			size: currentStat.size,
			lastModified: currentStat.lastModified,
		};

		if (expectedRevision.hash !== undefined) {
			const read = await this.#backend.readBytes(path);
			remoteRevision.hash = await sha256Hex(read.bytes);
		}

		if (!revisionsMatch(expectedRevision, remoteRevision)) {
			throw new FsError(
				"CONFLICT",
				`Revision conflict for "${path}": expected (${expectedRevision.size}B @ ${expectedRevision.lastModified}), found (${remoteRevision.size}B @ ${remoteRevision.lastModified}).`,
				{
					details: { path, expectedRevision, remoteRevision },
				},
			);
		}
	}

	async #createBackupIfExists(path: string): Promise<void> {
		let existing: { bytes: Uint8Array; revision: FileRevision };
		try {
			existing = await this.#backend.readBytes(path);
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return;
			}
			throw error;
		}

		const backupDir = `${this.#systemDir}/backups`;
		const prefix = encodeBackupPrefix(path);
		this.#backupSeq += 1;
		const ts = Date.now();
		const backupPath = `${backupDir}/${prefix}.${ts}.${this.#backupSeq}.bak`;

		await this.#backend.writeBytes(backupPath, existing.bytes);
		await this.#pruneBackups(backupDir, prefix, ts);
	}

	async #pruneBackups(backupDir: string, prefix: string, nowMs: number): Promise<void> {
		const entries = await this.#backend.listDir(backupDir);
		const matching: Array<{ path: string; ts: number; seq: number }> = [];

		for (const entry of entries) {
			if (entry.kind !== "file") continue;
			const meta = parseBackupMeta(entry.name, prefix);
			if (meta !== null) {
				matching.push({ path: entry.path, ts: meta.ts, seq: meta.seq });
			}
		}

		matching.sort((a, b) => b.ts - a.ts || b.seq - a.seq);

		const maxCount = this.#backupOptions.maxBackupsPerFile;
		const maxAgeMs = this.#backupOptions.maxBackupAgeDays * MS_PER_DAY;

		for (const [i, item] of matching.entries()) {
			const exceedsCount = Number.isFinite(maxCount) && i >= maxCount;
			const exceedsAge = Number.isFinite(maxAgeMs) && nowMs - item.ts > maxAgeMs;
			if (exceedsCount || exceedsAge) {
				try {
					await this.#backend.deleteFile(item.path);
				} catch {
					// Best-effort pruning; ignore concurrent cleanup.
				}
			}
		}
	}
}
