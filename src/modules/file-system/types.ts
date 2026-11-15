import type { FileAdapter } from "./adapters.ts";
import type { FsErrorCode } from "./errors.ts";
import type { PathTemplate } from "./path-template.ts";

export interface FileRevision {
	size: number;
	lastModified: number;
	hash?: string;
}

export interface FileStat {
	path: string;
	size: number;
	lastModified: number;
}

export interface FsDirEntry {
	name: string;
	path: string;
	kind: "file" | "directory";
}

export interface FsReadOptions {
	maxFileBytes?: number;
	signal?: AbortSignal;
}

export interface FsWriteOptions {
	maxFileBytes?: number;
	signal?: AbortSignal;
}

export interface FsWalkOptions {
	systemDir?: string;
	shouldIgnore?: (relativePath: string) => boolean;
	signal?: AbortSignal;
}

export interface FsBackend {
	readBytes(
		path: string,
		options?: FsReadOptions,
	): Promise<{ bytes: Uint8Array; revision: FileRevision }>;
	readFile(path: string, options?: FsReadOptions): Promise<File>;
	stat(path: string): Promise<FileStat | null>;
	writeBytes(path: string, bytes: Uint8Array, options?: FsWriteOptions): Promise<FileRevision>;
	deleteFile(path: string): Promise<void>;
	moveFile(fromPath: string, toPath: string): Promise<FileRevision>;
	exists(path: string): Promise<boolean>;
	listDir(dirPath: string): Promise<FsDirEntry[]>;
	walkFiles(dirPath?: string, options?: FsWalkOptions): Promise<FileStat[]>;
	ensureDir(dirPath: string): Promise<void>;
	removeDir(dirPath: string, options?: { recursive?: boolean }): Promise<void>;
}

export interface IdbHandleStoreLike {
	readonly namespace: string;
	readonly storageKey: string;
	readonly key: string;
	saveHandle(handle: FileSystemDirectoryHandle): Promise<void>;
	loadHandle(): Promise<FileSystemDirectoryHandle | null>;
	clearHandle(): Promise<void>;
}

export interface LockRetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
}

export interface BackupOptions {
	enabled?: boolean;
	maxBackupsPerFile?: number;
	maxBackupAgeDays?: number;
}

export interface SafeWriteOptions extends FsWriteOptions {
	expectedRevision?: FileRevision | null;
	backup?: boolean;
	verifyAfterWrite?: boolean;
	retryOnLock?: boolean | LockRetryOptions;
}

export interface SafeDeleteOptions {
	expectedRevision?: FileRevision | null;
	backup?: boolean;
	retryOnLock?: boolean | LockRetryOptions;
}

export interface SafeMoveOptions {
	expectedRevision?: FileRevision | null;
	retryOnLock?: boolean | LockRetryOptions;
}

export const FS_LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type FsLogLevel = (typeof FS_LOG_LEVELS)[number];

export const FS_LOG_EVENTS = [
	"mount",
	"permission",
	"read",
	"write",
	"move",
	"delete",
	"conflict",
	"heal",
	"migration",
	"cache",
	"warn",
	"error",
] as const;
export type FsLogEvent = (typeof FS_LOG_EVENTS)[number];

export interface FsLogEntry {
	ts: string;
	seq: number;
	level: FsLogLevel;
	event: FsLogEvent;
	path?: string;
	durationMs?: number;
	code?: FsErrorCode;
	message: string;
	meta?: Record<string, unknown>;
}

export interface FsLogInput {
	level: FsLogLevel;
	event: FsLogEvent;
	message: string;
	path?: string;
	durationMs?: number;
	code?: FsErrorCode;
	meta?: Record<string, unknown>;
}

export interface FsLogRotationOptions {
	maxBytes?: number;
	maxLines?: number;
	maxFiles?: number;
}

export interface ReadLogsOptions {
	limit?: number;
	level?: FsLogLevel;
}

export interface EmergencyLogEntry {
	ts: string;
	level: FsLogLevel;
	event: FsLogEvent;
	code?: FsErrorCode;
	path?: string;
	message: string;
}

export interface EmergencyLogInput {
	ts?: string;
	level: FsLogLevel;
	event: FsLogEvent;
	code?: FsErrorCode;
	path?: string;
	message: string;
}

export type BootCheckMode = "none" | "cache-only" | "metadata-scan";
export type HealMode = "incremental" | "full";
export type CompanionStatus = "present" | "missing" | "orphaned";

export interface CollectionIndexConfig<TData = unknown, TProjected = TData> {
	project?: (doc: TData, params: Record<string, string>) => TProjected;
	partitionBy?: (params: Record<string, string>, doc: TData) => string;
	eagerPartitions?: (partitionKey: string) => boolean;
}

export interface CacheCollectionConfig<TData = unknown, TProjected = TData> {
	name: string;
	template: PathTemplate;
	adapter: FileAdapter<TData>;
	companion?: {
		template: PathTemplate;
	};
	index?: CollectionIndexConfig<TData, TProjected>;
}

export interface CachedIndexEntry<TProjected = unknown> {
	path: string;
	params: Record<string, string>;
	revision: FileRevision;
	data: TProjected;
	companionStatus?: CompanionStatus;
}

export interface MetaPartitionInfo {
	count: number;
	updatedAt: string;
}

export interface MetaCollectionManifest {
	partitions: Record<string, MetaPartitionInfo>;
	pathToPartition: Record<string, string>;
	revisions: Record<string, FileRevision>;
}

export interface WorkspaceMetaFile {
	formatVersion: number;
	lastHealAt: string | null;
	collections: Record<string, MetaCollectionManifest>;
}

export interface CorruptEntry {
	collection: string;
	path: string;
	code: FsErrorCode;
	message: string;
	cause?: unknown;
}

export interface SyncProgress {
	phase: "scanning" | "indexing" | "flushing";
	processed: number;
	total: number;
	currentPath?: string;
}

export interface HealOptions {
	mode?: HealMode;
	signal?: AbortSignal;
	onProgress?: (progress: SyncProgress) => void;
	yieldEvery?: number;
}

export interface HealReport {
	mode: HealMode;
	added: number;
	updated: number;
	removed: number;
	unchanged: number;
	failures: CorruptEntry[];
	orphanedCompanions: Array<{ collection: string; path: string }>;
	durationMs: number;
}

export interface BootResult {
	healed: boolean;
	report: HealReport | null;
}
