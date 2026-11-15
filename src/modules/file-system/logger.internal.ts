import {
	getLocalStorageJson,
	removeLocalStorage,
	setLocalStorageJson,
} from "../browser-storage/index.ts";
import { encodeJsonlLines, jsonlAdapter } from "./adapters.ts";
import { isFsError } from "./errors.ts";
import { DEFAULT_SYSTEM_DIR } from "./path-template.ts";
import {
	FS_LOG_LEVELS,
	type EmergencyLogEntry,
	type EmergencyLogInput,
	type FsBackend,
	type FsLogEntry,
	type FsLogInput,
	type FsLogLevel,
	type FsLogRotationOptions,
	type ReadLogsOptions,
} from "./types.ts";
import type { WriteQueue } from "./write-queue.internal.ts";

export {
	FS_LOG_EVENTS,
	FS_LOG_LEVELS,
	type EmergencyLogEntry,
	type EmergencyLogInput,
	type FsLogEntry,
	type FsLogEvent,
	type FsLogInput,
	type FsLogLevel,
	type FsLogRotationOptions,
	type ReadLogsOptions,
} from "./types.ts";

export interface FsLoggerOptions {
	namespace: string;
	systemDir?: string;
	logLevel?: FsLogLevel;
	logFlushMs?: number;
	rotation?: FsLogRotationOptions;
	backend?: FsBackend;
	writeQueue?: WriteQueue;
	onLog?: (entry: FsLogEntry) => void;
}

export const DEFAULT_LOG_LEVEL: FsLogLevel = "info";
export const DEFAULT_LOG_FLUSH_MS = 1000;
export const DEFAULT_LOG_MAX_BYTES = 1024 * 1024;
export const DEFAULT_LOG_MAX_LINES = 2000;
export const DEFAULT_LOG_MAX_FILES = 5;

export const DEFAULT_EMERGENCY_LOG_MAX_ENTRIES = 50;
export const DEFAULT_EMERGENCY_LOG_MAX_BYTES = 64 * 1024;

const EMERGENCY_KEY_SUFFIX = "fs-emergency-log";
const LOG_FILE_NAME = "fs.jsonl";
const MAX_EMERGENCY_MESSAGE_CHARS = 512;
const MAX_EMERGENCY_PATH_CHARS = 260;

const LEVEL_PRIORITY: Record<FsLogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const logJsonlAdapter = jsonlAdapter<FsLogEntry>({
	onCorruptLine: "skip-any",
});

function emergencyStorageKey(namespace: string): string {
	return `${namespace}:${EMERGENCY_KEY_SUFFIX}`;
}

function truncateString(value: string, maxChars: number): string {
	if (value.length <= maxChars) {
		return value;
	}
	return `${value.slice(0, maxChars - 3)}...`;
}

function isEmergencyLogEntry(value: unknown): value is EmergencyLogEntry {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.ts === "string" &&
		typeof record.level === "string" &&
		FS_LOG_LEVELS.includes(record.level as FsLogLevel) &&
		typeof record.event === "string" &&
		typeof record.message === "string"
	);
}

function isEmergencyLogArray(value: unknown): value is EmergencyLogEntry[] {
	return Array.isArray(value) && value.every((item) => isEmergencyLogEntry(item));
}

function utf8ByteLength(text: string): number {
	return textEncoder.encode(text).byteLength;
}

/**
 * Records a metadata-only diagnostic entry into the capped `localStorage` emergency ring buffer.
 * Business payloads are never stored here.
 */
export function recordEmergencyLog(namespace: string, input: EmergencyLogInput): void {
	if (namespace.trim().length === 0) {
		return;
	}
	const key = emergencyStorageKey(namespace);
	const existing = getLocalStorageJson<EmergencyLogEntry[]>(key, [], {
		prefix: false,
		validate: isEmergencyLogArray,
	});

	const sanitized: EmergencyLogEntry = {
		ts: input.ts ?? new Date().toISOString(),
		level: input.level,
		event: input.event,
		message: truncateString(input.message, MAX_EMERGENCY_MESSAGE_CHARS),
	};
	if (input.code !== undefined) {
		sanitized.code = input.code;
	}
	if (input.path !== undefined) {
		sanitized.path = truncateString(input.path, MAX_EMERGENCY_PATH_CHARS);
	}

	const next = [...existing, sanitized];
	while (next.length > DEFAULT_EMERGENCY_LOG_MAX_ENTRIES) {
		next.shift();
	}

	while (
		next.length > 1 &&
		utf8ByteLength(JSON.stringify(next)) > DEFAULT_EMERGENCY_LOG_MAX_BYTES
	) {
		next.shift();
	}

	setLocalStorageJson(key, next, { prefix: false });
}

export function getEmergencyLogs(namespace: string): EmergencyLogEntry[] {
	if (namespace.trim().length === 0) {
		return [];
	}
	return getLocalStorageJson<EmergencyLogEntry[]>(emergencyStorageKey(namespace), [], {
		prefix: false,
		validate: isEmergencyLogArray,
	});
}

export function clearEmergencyLogs(namespace: string): void {
	if (namespace.trim().length === 0) {
		return;
	}
	removeLocalStorage(emergencyStorageKey(namespace), { prefix: false });
}

function rotatedFileName(index: number): string {
	return index === 0 ? LOG_FILE_NAME : `fs.${index}.jsonl`;
}

function parseRotatedIndex(fileName: string): number | null {
	if (fileName === LOG_FILE_NAME) {
		return 0;
	}
	const match = /^fs\.(\d+)\.jsonl$/.exec(fileName);
	if (!match?.[1]) {
		return null;
	}
	const index = Number(match[1]);
	return Number.isSafeInteger(index) && index >= 1 ? index : null;
}

function countNonEmptyLines(text: string): number {
	let count = 0;
	for (const line of text.split(/\r?\n/)) {
		if (line.trim().length > 0) {
			count += 1;
		}
	}
	return count;
}

export class FsLogger {
	readonly #namespace: string;
	readonly #systemDir: string;
	readonly #logsDir: string;
	readonly #logFilePath: string;
	readonly #logLevel: FsLogLevel;
	readonly #logFlushMs: number;
	readonly #maxBytes: number;
	readonly #maxLines: number;
	readonly #maxFiles: number;
	readonly #onLog?: (entry: FsLogEntry) => void;

	#backend: FsBackend | undefined;
	#writeQueue: WriteQueue | undefined;
	#seq = 0;
	#pending: FsLogEntry[] = [];
	#flushTimer: ReturnType<typeof setTimeout> | undefined;
	#activeFlush: Promise<void> | null = null;
	#destroyed = false;

	constructor(options: FsLoggerOptions) {
		this.#namespace = options.namespace;
		this.#systemDir = options.systemDir ?? DEFAULT_SYSTEM_DIR;
		this.#logsDir = `${this.#systemDir}/logs`;
		this.#logFilePath = `${this.#logsDir}/${LOG_FILE_NAME}`;
		this.#logLevel = options.logLevel ?? DEFAULT_LOG_LEVEL;
		this.#logFlushMs = Math.max(0, options.logFlushMs ?? DEFAULT_LOG_FLUSH_MS);
		this.#maxBytes = Math.max(1024, options.rotation?.maxBytes ?? DEFAULT_LOG_MAX_BYTES);
		this.#maxLines = Math.max(10, options.rotation?.maxLines ?? DEFAULT_LOG_MAX_LINES);
		this.#maxFiles = Math.max(1, options.rotation?.maxFiles ?? DEFAULT_LOG_MAX_FILES);
		this.#backend = options.backend;
		this.#writeQueue = options.writeQueue;
		this.#onLog = options.onLog;
	}

	setBackend(backend: FsBackend | undefined, writeQueue: WriteQueue | undefined): void {
		this.#backend = backend;
		this.#writeQueue = writeQueue;
	}

	log(input: FsLogInput): FsLogEntry | null {
		if (this.#destroyed) {
			return null;
		}

		// Skip read/cache-hit noise unless debug logging is explicitly enabled.
		if (input.event === "read" && this.#logLevel !== "debug") {
			return null;
		}
		if (LEVEL_PRIORITY[input.level] < LEVEL_PRIORITY[this.#logLevel]) {
			return null;
		}

		this.#seq += 1;
		const entry: FsLogEntry = {
			ts: new Date().toISOString(),
			seq: this.#seq,
			level: input.level,
			event: input.event,
			message: input.message,
		};
		if (input.path !== undefined) entry.path = input.path;
		if (input.durationMs !== undefined) entry.durationMs = input.durationMs;
		if (input.code !== undefined) entry.code = input.code;
		if (input.meta !== undefined) entry.meta = input.meta;

		if (this.#onLog) {
			try {
				this.#onLog(entry);
			} catch {
				// Consumer log hooks must never break filesystem operations.
			}
		}

		const isUrgent = entry.level === "error" || entry.event === "conflict";
		if (!this.#backend || !this.#writeQueue) {
			if (isUrgent) {
				recordEmergencyLog(this.#namespace, {
					ts: entry.ts,
					level: entry.level,
					event: entry.event,
					code: entry.code,
					path: entry.path,
					message: entry.message,
				});
			}
			return entry;
		}

		this.#pending.push(entry);

		if (isUrgent || this.#logFlushMs === 0) {
			this.#clearFlushTimer();
			void this.flush();
		} else if (this.#flushTimer === undefined) {
			this.#flushTimer = setTimeout(() => {
				this.#flushTimer = undefined;
				void this.flush();
			}, this.#logFlushMs);
		}

		return entry;
	}

	async flush(): Promise<void> {
		this.#clearFlushTimer();
		while (this.#activeFlush) {
			await this.#activeFlush;
		}
		if (this.#pending.length === 0) {
			return;
		}
		const backend = this.#backend;
		const writeQueue = this.#writeQueue;
		if (!backend || !writeQueue) {
			return;
		}

		const run = async (): Promise<void> => {
			try {
				while (this.#pending.length > 0) {
					const batch = [...this.#pending];
					this.#pending.length = 0;
					try {
						await writeQueue.withPathLock(this.#logFilePath, () =>
							this.#appendBatchLocked(backend, batch),
						);
					} catch (error) {
						const code = isFsError(error) ? error.code : "IO_FAILED";
						for (const failedEntry of batch) {
							recordEmergencyLog(this.#namespace, {
								ts: failedEntry.ts,
								level: failedEntry.level,
								event: failedEntry.event,
								code: failedEntry.code ?? code,
								path: failedEntry.path,
								message: failedEntry.message,
							});
						}
						recordEmergencyLog(this.#namespace, {
							level: "error",
							event: "error",
							code,
							path: this.#logFilePath,
							message:
								error instanceof Error
									? `Failed to flush logs to disk: ${error.message}`
									: "Failed to flush logs to disk.",
						});
					}
				}
			} finally {
				this.#activeFlush = null;
			}
		};

		this.#activeFlush = run();
		await this.#activeFlush;
	}

	async readLogs(options?: ReadLogsOptions): Promise<FsLogEntry[]> {
		await this.flush();
		const backend = this.#backend;
		if (!backend) {
			return [];
		}

		let dirEntries: Awaited<ReturnType<FsBackend["listDir"]>>;
		try {
			dirEntries = await backend.listDir(this.#logsDir);
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return [];
			}
			throw error;
		}

		const logFiles = dirEntries
			.filter((entry) => entry.kind === "file")
			.map((entry) => ({
				path: entry.path,
				index: parseRotatedIndex(entry.name),
			}))
			.filter((item): item is { path: string; index: number } => item.index !== null)
			// Read oldest -> newest so entries remain in chronological order.
			.toSorted((a, b) => b.index - a.index);

		const minPriority = options?.level === undefined ? -1 : LEVEL_PRIORITY[options.level];
		const allEntries: FsLogEntry[] = [];

		for (const fileInfo of logFiles) {
			try {
				const file = await backend.readFile(fileInfo.path);
				const decoded = await logJsonlAdapter.decode({
					path: fileInfo.path,
					file,
					readBytes: async () => new Uint8Array(await file.arrayBuffer()),
					readText: () => file.text(),
				});
				for (const entry of decoded.data) {
					if (minPriority === -1 || LEVEL_PRIORITY[entry.level] >= minPriority) {
						allEntries.push(entry);
					}
				}
			} catch (error) {
				if (isFsError(error) && error.code === "NOT_FOUND") {
					continue;
				}
				throw error;
			}
		}

		if (options?.limit !== undefined && options.limit >= 0 && allEntries.length > options.limit) {
			return allEntries.slice(allEntries.length - options.limit);
		}
		return allEntries;
	}

	destroy(): void {
		this.#destroyed = true;
		this.#clearFlushTimer();
	}

	#clearFlushTimer(): void {
		if (this.#flushTimer === undefined) return;
		clearTimeout(this.#flushTimer);
		this.#flushTimer = undefined;
	}

	async #appendBatchLocked(backend: FsBackend, batch: readonly FsLogEntry[]): Promise<void> {
		const batchText = encodeJsonlLines(batch);
		const batchBytes = textEncoder.encode(batchText);

		let existingText = "";
		let existingByteLength = 0;
		let existingLineCount = 0;

		try {
			const existing = await backend.readBytes(this.#logFilePath);
			existingByteLength = existing.bytes.byteLength;
			existingText = textDecoder.decode(existing.bytes);
			existingLineCount = countNonEmptyLines(existingText);
		} catch (error) {
			if (!isFsError(error) || error.code !== "NOT_FOUND") {
				throw error;
			}
		}

		const needsRotation =
			existingLineCount > 0 &&
			(existingByteLength + batchBytes.byteLength > this.#maxBytes ||
				existingLineCount + batch.length > this.#maxLines);

		if (needsRotation) {
			await this.#rotateLogsLocked(backend);
			await backend.writeBytes(this.#logFilePath, batchBytes);
			return;
		}

		const separator = existingText.length > 0 && !existingText.endsWith("\n") ? "\n" : "";
		const combinedBytes =
			existingText.length === 0
				? batchBytes
				: textEncoder.encode(`${existingText}${separator}${batchText}`);
		await backend.writeBytes(this.#logFilePath, combinedBytes);
	}

	async #rotateLogsLocked(backend: FsBackend): Promise<void> {
		if (this.#maxFiles <= 1) {
			await this.#deleteIfExists(backend, this.#logFilePath);
			return;
		}

		const maxRotatedIndex = this.#maxFiles - 1;

		// Prune any stale rotated files beyond maxFiles retention.
		try {
			const entries = await backend.listDir(this.#logsDir);
			for (const entry of entries) {
				if (entry.kind !== "file") continue;
				const idx = parseRotatedIndex(entry.name);
				if (idx !== null && idx >= maxRotatedIndex) {
					await this.#deleteIfExists(backend, entry.path);
				}
			}
		} catch (error) {
			if (!isFsError(error) || error.code !== "NOT_FOUND") {
				throw error;
			}
		}

		for (let i = maxRotatedIndex - 1; i >= 0; i -= 1) {
			const sourcePath = `${this.#logsDir}/${rotatedFileName(i)}`;
			const targetPath = `${this.#logsDir}/${rotatedFileName(i + 1)}`;
			try {
				await backend.moveFile(sourcePath, targetPath);
			} catch (error) {
				if (!isFsError(error) || error.code !== "NOT_FOUND") {
					throw error;
				}
			}
		}
	}

	async #deleteIfExists(backend: FsBackend, path: string): Promise<void> {
		try {
			await backend.deleteFile(path);
		} catch (error) {
			if (!isFsError(error) || error.code !== "NOT_FOUND") {
				throw error;
			}
		}
	}
}
