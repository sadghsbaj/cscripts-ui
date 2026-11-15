import { SvelteDate, SvelteMap, SvelteSet } from "svelte/reactivity";
import {
	type FileAdapter,
	type JsonFileAdapter,
} from "./adapters.ts";
import {
	CacheEngine,
	DEFAULT_BOOT_CONCURRENCY,
	DEFAULT_INDEX_FLUSH_MS,
	DEFAULT_MAX_FLUSH_WAIT_MS,
} from "./cache-engine.internal.ts";
import { FsError, isFsError } from "./errors.ts";
import {
	BrowserFsBackend,
	DEFAULT_MAX_FILE_BYTES,
	sha256Hex,
} from "./fs-backend.internal.ts";
import {
	IdbHandleStore,
	resolveWorkspaceNamespace,
} from "./idb-handle-store.internal.ts";
import {
	diffJson,
	mergeJson3Way,
	type JsonDiffOptions,
	type JsonDiffResult,
	type JsonMergeResult,
} from "./json-diff.ts";
import {
	clearEmergencyLogs as clearEmergencyLogsInternal,
	DEFAULT_LOG_FLUSH_MS,
	DEFAULT_LOG_LEVEL,
	FsLogger,
	getEmergencyLogs as getEmergencyLogsInternal,
	recordEmergencyLog,
} from "./logger.internal.ts";
import {
	assertNonOverlappingTemplates,
	createPathTemplate,
	DEFAULT_SYSTEM_DIR,
	isIgnoredPath,
	normalizeRelativePath,
	validateRelativePath,
	type PathIgnoreRule,
	type PathTemplate,
	type PathValidationOptions,
} from "./path-template.ts";
import { checkFileSystemSupport, type FileSystemSupportReport } from "./support.ts";
import type {
	BackupOptions,
	BootCheckMode,
	CacheCollectionConfig,
	CachedIndexEntry,
	CollectionIndexConfig,
	CompanionStatus,
	CorruptEntry,
	EmergencyLogEntry,
	FileRevision,
	FsBackend,
	FsLogEntry,
	FsLogLevel,
	FsLogRotationOptions,
	HealOptions,
	HealReport,
	IdbHandleStoreLike,
	LockRetryOptions,
	ReadLogsOptions,
	SyncProgress,
} from "./types.ts";
import { WriteQueue } from "./write-queue.internal.ts";

export type {
	BackupOptions,
	BootCheckMode,
	BootResult,
	CachedIndexEntry,
	CollectionIndexConfig,
	CompanionStatus,
	CorruptEntry,
	EmergencyLogEntry,
	FileRevision,
	FsBackend,
	FsLogEntry,
	FsLogEvent,
	FsLogInput,
	FsLogLevel,
	FsLogRotationOptions,
	HealMode,
	HealOptions,
	HealReport,
	IdbHandleStoreLike,
	LockRetryOptions,
	ReadLogsOptions,
	SyncProgress,
} from "./types.ts";

export const MOUNT_STATUSES = [
	"unlinked",
	"needs-permission",
	"ready",
	"stale",
	"unsupported",
] as const;
export type MountStatus = (typeof MOUNT_STATUSES)[number];

export const WORKSPACE_ACTIVITIES = [
	"idle",
	"restoring",
	"reading",
	"writing",
	"healing",
] as const;
export type WorkspaceActivity = (typeof WORKSPACE_ACTIVITIES)[number];

export const WORKSPACE_HEALTH_STATES = ["base", "positive", "caution", "negative"] as const;
export type WorkspaceHealth = (typeof WORKSPACE_HEALTH_STATES)[number];

export const CONFLICT_POLICIES = ["detect", "auto-merge", "last-write-wins"] as const;
export type ConflictPolicy = (typeof CONFLICT_POLICIES)[number];

export const CONFLICT_RESOLUTIONS = ["keep-local", "keep-remote", "apply-custom"] as const;
export type ConflictResolution = (typeof CONFLICT_RESOLUTIONS)[number];

export interface PickDirectoryOptions {
	id?: string;
	mode?: "read" | "readwrite";
	startIn?: "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos";
}

export interface SingletonConfig<TData> {
	path: string;
	adapter: FileAdapter<TData>;
	pathOptions?: PathValidationOptions;
}

export interface ErasedSingletonDefinition {
	readonly kind: "singleton";
	readonly path: string;
	readonly template: PathTemplate;
	readonly pathOptions?: PathValidationOptions;
}

export interface SingletonDefinition<TData> extends ErasedSingletonDefinition {
	readonly adapter: FileAdapter<TData>;
}

export interface CompanionConfig {
	pattern: string;
	paramPatterns?: Record<string, RegExp | string>;
	pathOptions?: PathValidationOptions;
}

export interface CollectionConfig<TData, TProjected = TData> {
	pattern: string;
	adapter: FileAdapter<TData>;
	paramPatterns?: Record<string, RegExp | string>;
	pathOptions?: PathValidationOptions;
	companion?: CompanionConfig;
	index?: CollectionIndexConfig<TData, TProjected>;
}

export interface ErasedCollectionDefinition {
	readonly kind: "collection";
	readonly pattern: string;
	readonly template: PathTemplate;
	readonly companion?: {
		readonly pattern: string;
		readonly template: PathTemplate;
	};
	readonly hasIndex: boolean;
}

export interface CollectionDefinition<
	TData,
	TProjected = TData,
	TParams extends Record<string, string> = Record<string, string>,
	THasIndex extends boolean = boolean,
> extends ErasedCollectionDefinition {
	readonly adapter: FileAdapter<TData>;
	readonly index?: CollectionIndexConfig<TData, TProjected>;
	readonly hasIndex: THasIndex;
	readonly _paramsBrand?: TParams;
}

export interface ReadResult<TData> {
	path: string;
	data: TData;
	revision: FileRevision;
	meta?: unknown;
	migrated?: boolean;
	fromVersion?: number;
	warnings?: string[];
}

export interface CompanionReadResult {
	path: string;
	bytes: Uint8Array;
	file: File;
	revision: FileRevision;
}

export interface WriteResult {
	path: string;
	revision: FileRevision;
	merged?: boolean;
}

export interface WriteOperationOptions {
	expectedRevision?: FileRevision | null;
	conflictPolicy?: ConflictPolicy;
	backup?: boolean;
	signal?: AbortSignal;
}

export interface DeleteOperationOptions {
	expectedRevision?: FileRevision | null;
	conflictPolicy?: ConflictPolicy;
	backup?: boolean;
}

export interface MoveOperationOptions {
	expectedRevision?: FileRevision | null;
	conflictPolicy?: ConflictPolicy;
}

export interface CollectionListItem<
	TParams extends Record<string, string> = Record<string, string>,
> {
	path: string;
	params: TParams;
	size: number;
	lastModified: number;
}

export type CollectionListFilter<
	TParams extends Record<string, string> = Record<string, string>,
> =
	| ((item: CollectionListItem<TParams>) => boolean)
	| {
			params?: Partial<TParams>;
			where?: (item: CollectionListItem<TParams>) => boolean;
	  };

export type CollectionQueryFilter<
	TProjected = unknown,
	TParams extends Record<string, string> = Record<string, string>,
> =
	| ((entry: CachedIndexEntry<TProjected> & { params: TParams }) => boolean)
	| {
			params?: Partial<TParams>;
			where?: (entry: CachedIndexEntry<TProjected> & { params: TParams }) => boolean;
	  };

export interface SingletonHandle<TData> {
	readonly path: string;
	read(options?: { signal?: AbortSignal }): Promise<ReadResult<TData> | null>;
	write(data: TData, options?: WriteOperationOptions): Promise<WriteResult>;
	update(
		updater: (current: TData | null) => TData | Promise<TData>,
		options?: WriteOperationOptions,
	): Promise<WriteResult>;
	exists(): Promise<boolean>;
	delete(options?: DeleteOperationOptions): Promise<void>;
}

export interface BaseCollectionHandle<
	TData,
	TParams extends Record<string, string> = Record<string, string>,
> {
	readonly name: string;
	readonly pattern: string;
	read(params: TParams, options?: { signal?: AbortSignal }): Promise<ReadResult<TData> | null>;
	write(params: TParams, data: TData, options?: WriteOperationOptions): Promise<WriteResult>;
	writeRaw(
		params: TParams,
		fileOrBytes: File | Uint8Array | string,
		options?: WriteOperationOptions,
	): Promise<WriteResult>;
	writeWithCompanion(
		params: TParams,
		data: TData,
		companionFile: File | Uint8Array | string,
		options?: WriteOperationOptions,
	): Promise<WriteResult>;
	readCompanion(
		params: TParams,
		options?: { signal?: AbortSignal },
	): Promise<CompanionReadResult | null>;
	hasCompanion(params: TParams): Promise<boolean>;
	update(
		params: TParams,
		updater: (current: TData | null) => TData | Promise<TData>,
		options?: WriteOperationOptions,
	): Promise<WriteResult>;
	move(fromParams: TParams, toParams: TParams, options?: MoveOperationOptions): Promise<WriteResult>;
	delete(params: TParams, options?: DeleteOperationOptions): Promise<void>;
	exists(params: TParams): Promise<boolean>;
	list(filter?: CollectionListFilter<TParams>): Promise<CollectionListItem<TParams>[]>;
}

export interface IndexedCollectionHandle<
	TProjected,
	TParams extends Record<string, string> = Record<string, string>,
> {
	readonly entries: readonly (CachedIndexEntry<TProjected> & { params: TParams })[];
	query(
		filter?: CollectionQueryFilter<TProjected, TParams>,
	): (CachedIndexEntry<TProjected> & { params: TParams })[];
	loadedPartitions(): string[];
	unloadedPartitions(): string[];
	hasUnloadedPartitions(): boolean;
	loadPartitions(keys: readonly string[]): Promise<void>;
	loadAllPartitions(): Promise<void>;
}

export type CollectionHandle<
	TData,
	TProjected = TData,
	TParams extends Record<string, string> = Record<string, string>,
	THasIndex extends boolean = boolean,
> = THasIndex extends true
	? BaseCollectionHandle<TData, TParams> & IndexedCollectionHandle<TProjected, TParams>
	: BaseCollectionHandle<TData, TParams>;

export interface ConflictDetails<TData = unknown> {
	id: string;
	collection?: string;
	singleton?: string;
	path: string;
	params?: Record<string, string>;
	base: TData | undefined;
	local: TData;
	remote: TData | undefined;
	remoteRevision: FileRevision | null;
	diffLocalToRemote: JsonDiffResult | null;
	threeWay?: JsonMergeResult<TData>;
	createdAt: string;
}

export interface MutationContext {
	operation: "write" | "writeRaw" | "writeWithCompanion" | "update" | "move" | "delete";
	collection?: string;
	singleton?: string;
	path: string;
}

export interface MutationSettledContext extends MutationContext {
	status: "committed" | "rolled-back" | "conflict";
	revision?: FileRevision;
	error?: FsError;
}

export type RevalidateOnFocusOption = boolean | { minIntervalMs?: number };

export interface WorkspaceConfig<
	TSingletons extends Record<string, ErasedSingletonDefinition> = Record<string, never>,
	TCollections extends Record<string, ErasedCollectionDefinition> = Record<string, never>,
> {
	namespace?: string;
	storageKey?: string;
	systemDir?: string;
	mode?: "read" | "readwrite";
	singletons?: TSingletons;
	collections?: TCollections;
	conflictPolicy?: ConflictPolicy;
	diffOptions?: JsonDiffOptions;
	bootCheck?: BootCheckMode;
	bootConcurrency?: number;
	indexFlushMs?: number;
	maxFlushWaitMs?: number;
	ignore?: readonly PathIgnoreRule[];
	maxFileBytes?: number;
	useWebLocks?: boolean;
	retryOnLock?: boolean | LockRetryOptions;
	verifyAfterWrite?: boolean;
	backup?: BackupOptions;
	logLevel?: FsLogLevel;
	logFlushMs?: number;
	logRotation?: FsLogRotationOptions;
	preventCloseWhilePending?: boolean;
	revalidateOnFocus?: RevalidateOnFocusOption;
	onMutationError?: (error: FsError, context: MutationContext) => void;
	onMutationConflict?: (conflict: ConflictDetails) => void;
	onMutationSettled?: (context: MutationSettledContext) => void;
	onSyncProgress?: (progress: SyncProgress) => void;
	onLog?: (entry: FsLogEntry) => void;
	backend?: FsBackend;
	idbStore?: IdbHandleStoreLike;
	indexedDb?: IDBFactory;
	showDirectoryPicker?: (options?: PickDirectoryOptions) => Promise<FileSystemDirectoryHandle>;
	createBackend?: (handle: FileSystemDirectoryHandle) => FsBackend;
}

type SingletonHandleMap<TSingletons> = {
	readonly [K in keyof TSingletons]: TSingletons[K] extends SingletonDefinition<infer TData>
		? SingletonHandle<TData>
		: never;
};

type CollectionHandleMap<TCollections> = {
	readonly [K in keyof TCollections]: TCollections[K] extends CollectionDefinition<
		infer TData,
		infer TProjected,
		infer TParams,
		infer THasIndex
	>
		? CollectionHandle<TData, TProjected, TParams, THasIndex>
		: never;
};

export interface Workspace<
	TSingletons extends Record<string, ErasedSingletonDefinition> = Record<string, never>,
	TCollections extends Record<string, ErasedCollectionDefinition> = Record<string, never>,
> {
	readonly namespace: string;
	readonly systemDir: string;
	readonly support: FileSystemSupportReport;
	readonly mountStatus: MountStatus;
	readonly activity: WorkspaceActivity;
	readonly isBusy: boolean;
	readonly pendingMutationCount: number;
	readonly unresolvedConflicts: readonly ConflictDetails[];
	readonly unresolvedConflictCount: number;
	readonly corruptEntries: readonly CorruptEntry[];
	readonly health: WorkspaceHealth;
	readonly lastError: FsError | null;
	readonly syncProgress: SyncProgress | null;
	readonly singletons: SingletonHandleMap<TSingletons>;
	readonly collections: CollectionHandleMap<TCollections>;
	restore(): Promise<MountStatus>;
	pick(options?: PickDirectoryOptions): Promise<MountStatus>;
	requestAccess(): Promise<MountStatus>;
	forget(): Promise<void>;
	flush(): Promise<void>;
	destroy(): void;
	clearError(): void;
	heal(options?: HealOptions): Promise<HealReport>;
	resolveConflict(
		conflictId: string,
		resolution: ConflictResolution,
		customDoc?: unknown,
	): Promise<WriteResult | void>;
	readLogs(options?: ReadLogsOptions): Promise<FsLogEntry[]>;
	getEmergencyLogs(): EmergencyLogEntry[];
	clearEmergencyLogs(): void;
}

interface PermissionAwareDirectoryHandle extends FileSystemDirectoryHandle {
	queryPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
	requestPermission?: (descriptor?: { mode?: "read" | "readwrite" }) => Promise<PermissionState>;
}

interface WindowWithDirectoryPicker {
	showDirectoryPicker?: (options?: PickDirectoryOptions) => Promise<FileSystemDirectoryHandle>;
}

interface TrackedDocEntry {
	revision: FileRevision;
	data: unknown;
}

type PendingMutation =
	| {
			id: string;
			kind: "pending";
			collection: string;
			path: string;
	  }
	| {
			id: string;
			kind: "upsert";
			collection: string;
			path: string;
			params: Record<string, string>;
			projected: unknown;
			companionStatus?: CompanionStatus;
	  }
	| {
			id: string;
			kind: "delete";
			collection: string;
			path: string;
	  }
	| {
			id: string;
			kind: "move";
			collection: string;
			fromPath: string;
			toPath: string;
			toParams: Record<string, string>;
			projected?: unknown;
	  };

interface ConflictTarget {
	adapter: FileAdapter<unknown>;
	collection?: string;
	singleton?: string;
	params?: Record<string, string>;
	companionStatus?: CompanionStatus;
}

const MAX_TRACKED_DOCS = 2000;
const DEFAULT_REVALIDATE_INTERVAL_MS = 5000;

export function defineSingleton<TData>(config: SingletonConfig<TData>): SingletonDefinition<TData> {
	const normalized = normalizeRelativePath(config.path);
	validateRelativePath(normalized, config.pathOptions);
	const template = createPathTemplate(normalized, {
		pathOptions: config.pathOptions,
	});
	return {
		kind: "singleton",
		path: normalized,
		adapter: config.adapter,
		template,
		pathOptions: config.pathOptions,
	};
}

export function defineCollection<
	TData,
	TProjected = TData,
	TParams extends Record<string, string> = Record<string, string>,
>(
	config: CollectionConfig<TData, TProjected> & {
		index: CollectionIndexConfig<TData, TProjected>;
	},
): CollectionDefinition<TData, TProjected, TParams, true>;

export function defineCollection<
	TData,
	TParams extends Record<string, string> = Record<string, string>,
>(
	config: Omit<CollectionConfig<TData, TData>, "index"> & { index?: undefined },
): CollectionDefinition<TData, TData, TParams, false>;

export function defineCollection<
	TData,
	TProjected = TData,
	TParams extends Record<string, string> = Record<string, string>,
>(
	config: CollectionConfig<TData, TProjected>,
): CollectionDefinition<TData, TProjected, TParams, boolean> {
	const template = createPathTemplate(config.pattern, {
		paramPatterns: config.paramPatterns,
		pathOptions: config.pathOptions,
	});
	const companion = config.companion
		? {
				pattern: config.companion.pattern,
				template: createPathTemplate(config.companion.pattern, {
					paramPatterns: config.companion.paramPatterns ?? config.paramPatterns,
					pathOptions: config.companion.pathOptions ?? config.pathOptions,
				}),
			}
		: undefined;

	return {
		kind: "collection",
		pattern: config.pattern,
		adapter: config.adapter,
		template,
		companion,
		index: config.index,
		hasIndex: config.index !== undefined,
	};
}

function toFsError(error: unknown, fallbackMessage: string): FsError {
	if (isFsError(error)) {
		return error;
	}
	return new FsError("IO_FAILED", fallbackMessage, { cause: error });
}

function cloneSnapshot<T>(value: T): T {
	if (value === null || typeof value !== "object") {
		return value;
	}
	try {
		return structuredClone(value);
	} catch {
		return value;
	}
}

function toUint8Array(encoded: Uint8Array | string): Uint8Array {
	if (typeof encoded === "string") {
		return new TextEncoder().encode(encoded);
	}
	return encoded;
}

async function rawInputToUint8Array(input: File | Uint8Array | string): Promise<Uint8Array> {
	if (input instanceof Uint8Array) {
		return input;
	}
	if (typeof input === "string") {
		return new TextEncoder().encode(input);
	}
	return new Uint8Array(await input.arrayBuffer());
}

function isAbortDomError(error: unknown): boolean {
	if (isFsError(error)) {
		return error.code === "ABORTED";
	}
	if (typeof error === "object" && error !== null && "name" in error) {
		return (error as { name?: unknown }).name === "AbortError";
	}
	return false;
}

function matchesParamsFilter(
	actual: Record<string, string>,
	filter: Partial<Record<string, string>> | undefined,
): boolean {
	if (!filter) {
		return true;
	}
	for (const [key, expected] of Object.entries(filter)) {
		if (expected !== undefined && actual[key] !== expected) {
			return false;
		}
	}
	return true;
}

function applyPendingMutations(
	confirmed: readonly CachedIndexEntry[],
	mutations: readonly PendingMutation[],
	collectionName: string,
): CachedIndexEntry[] {
	const relevant = mutations.filter((m) => m.collection === collectionName && m.kind !== "pending");
	if (relevant.length === 0) {
		return [...confirmed];
	}

	const map = new SvelteMap<string, CachedIndexEntry>();
	for (const entry of confirmed) {
		map.set(entry.path, entry);
	}

	for (const mutation of relevant) {
		if (mutation.kind === "upsert") {
			const existing = map.get(mutation.path);
			map.set(mutation.path, {
				path: mutation.path,
				params: mutation.params,
				revision: existing?.revision ?? { size: 0, lastModified: 0 },
				data: mutation.projected,
				companionStatus: mutation.companionStatus ?? existing?.companionStatus,
			});
			continue;
		}
		if (mutation.kind === "delete") {
			map.delete(mutation.path);
			continue;
		}
		if (mutation.kind === "move") {
			const existing = map.get(mutation.fromPath);
			map.delete(mutation.fromPath);
			if (existing) {
				map.set(mutation.toPath, {
					...existing,
					path: mutation.toPath,
					params: mutation.toParams,
					data: mutation.projected ?? existing.data,
				});
			}
		}
	}

	return map.values().toArray();
}

function assertNotSystemPath(path: string, systemDir: string): void {
	if (path === systemDir || path.startsWith(`${systemDir}/`)) {
		throw new FsError(
			"INVALID_CONFIG",
			`Path "${path}" cannot reside inside reserved system directory "${systemDir}".`,
			{ details: { path, systemDir } },
		);
	}
}

export function createWorkspace<
	TSingletons extends Record<string, ErasedSingletonDefinition> = Record<string, never>,
	TCollections extends Record<string, ErasedCollectionDefinition> = Record<string, never>,
>(config: WorkspaceConfig<TSingletons, TCollections>): Workspace<TSingletons, TCollections> {
	return defineWorkspace(config);
}

export function defineWorkspace<
	TSingletons extends Record<string, ErasedSingletonDefinition> = Record<string, never>,
	TCollections extends Record<string, ErasedCollectionDefinition> = Record<string, never>,
>(config: WorkspaceConfig<TSingletons, TCollections>): Workspace<TSingletons, TCollections> {
	const namespace = resolveWorkspaceNamespace(config.namespace);
	const systemDir = normalizeRelativePath(config.systemDir ?? DEFAULT_SYSTEM_DIR);
	const mode = config.mode ?? "readwrite";
	const defaultConflictPolicy: ConflictPolicy = config.conflictPolicy ?? "detect";
	const support = checkFileSystemSupport();

	const singletonDefs = (config.singletons ?? {}) as Record<string, SingletonDefinition<unknown>>;
	const collectionDefs = (config.collections ?? {}) as Record<
		string,
		CollectionDefinition<unknown, unknown, Record<string, string>, boolean>
	>;

	const allTemplates: PathTemplate[] = [];
	for (const def of Object.values(singletonDefs)) {
		assertNotSystemPath(def.path, systemDir);
		allTemplates.push(def.template);
	}
	for (const def of Object.values(collectionDefs)) {
		const normalizedPattern = normalizeRelativePath(def.pattern);
		assertNotSystemPath(normalizedPattern, systemDir);
		allTemplates.push(def.template);
		if (def.companion) {
			const normalizedCompanion = normalizeRelativePath(def.companion.pattern);
			assertNotSystemPath(normalizedCompanion, systemDir);
			allTemplates.push(def.companion.template);
		}
	}
	assertNonOverlappingTemplates(allTemplates);

	const idbStore =
		config.idbStore ??
		(config.backend
			? null
			: new IdbHandleStore({
					namespace,
					storageKey: config.storageKey,
					indexedDb: config.indexedDb,
				}));

	const logger = new FsLogger({
		namespace,
		systemDir,
		logLevel: config.logLevel ?? DEFAULT_LOG_LEVEL,
		logFlushMs: config.logFlushMs ?? DEFAULT_LOG_FLUSH_MS,
		rotation: config.logRotation,
		onLog: config.onLog,
	});

	const initialStatus: MountStatus = config.backend
		? "ready"
		: support.supported
			? "unlinked"
			: "unsupported";

	let mountStatus = $state<MountStatus>(initialStatus);
	let activeHealing = $state(0);
	let activeRestoring = $state(0);
	let activeWriting = $state(0);
	let activeReading = $state(0);
	let pendingMutations = $state.raw<readonly PendingMutation[]>([]);
	let confirmedEntries = $state.raw<Record<string, readonly CachedIndexEntry[]>>({});
	let unresolvedConflicts = $state.raw<readonly ConflictDetails[]>([]);
	let corruptEntries = $state.raw<readonly CorruptEntry[]>([]);
	let lastError = $state<FsError | null>(null);
	let syncProgress = $state.raw<SyncProgress | null>(null);

	const activity = $derived.by<WorkspaceActivity>(() => {
		if (activeHealing > 0) return "healing";
		if (activeRestoring > 0) return "restoring";
		if (activeWriting > 0) return "writing";
		if (activeReading > 0) return "reading";
		return "idle";
	});
	const pendingMutationCount = $derived(pendingMutations.length);
	const unresolvedConflictCount = $derived(unresolvedConflicts.length);
	const isBusy = $derived(activity !== "idle" || pendingMutationCount > 0);
	const health = $derived.by<WorkspaceHealth>(() => {
		if (mountStatus === "stale" || mountStatus === "unsupported" || lastError !== null) {
			return "negative";
		}
		if (mountStatus === "unlinked") {
			return "base";
		}
		if (
			mountStatus === "needs-permission" ||
			isBusy ||
			unresolvedConflictCount > 0 ||
			corruptEntries.length > 0
		) {
			return "caution";
		}
		return "positive";
	});

	let backend: FsBackend | null = config.backend ?? null;
	let writeQueue: WriteQueue | null = null;
	let cacheEngine: CacheEngine | null = null;
	let directoryHandle: PermissionAwareDirectoryHandle | null = null;
	let destroyed = false;
	let mountEpoch = 0;
	let activeAbortController: AbortController | null = null;
	let lastRevalidateAt = 0;
	let mutationSeq = 0;
	let conflictSeq = 0;
	const inFlightMutations = new SvelteSet<Promise<void>>();
	const trackedDocs = new SvelteMap<string, TrackedDocEntry>();
	const conflictTargets = new SvelteMap<string, ConflictTarget>();

	async function withActivity<T>(
		kind: Exclude<WorkspaceActivity, "idle">,
		fn: () => Promise<T>,
	): Promise<T> {
		switch (kind) {
			case "healing": {
				activeHealing += 1;
				break;
			}
			case "restoring": {
				activeRestoring += 1;
				break;
			}
			case "writing": {
				activeWriting += 1;
				break;
			}
			case "reading": {
				activeReading += 1;
				break;
			}
		}

		try {
			return await fn();
		} finally {
			switch (kind) {
				case "healing": {
					activeHealing = Math.max(0, activeHealing - 1);
					break;
				}
				case "restoring": {
					activeRestoring = Math.max(0, activeRestoring - 1);
					break;
				}
				case "writing": {
					activeWriting = Math.max(0, activeWriting - 1);
					break;
				}
				case "reading": {
					activeReading = Math.max(0, activeReading - 1);
					break;
				}
			}
		}
	}

	async function withHash(revision: FileRevision, bytes: Uint8Array): Promise<FileRevision> {
		if (revision.hash !== undefined) {
			return revision;
		}
		return {
			...revision,
			hash: await sha256Hex(bytes),
		};
	}

	function nextMutationId(): string {
		mutationSeq += 1;
		return `mut-${mutationSeq}`;
	}

	function nextConflictId(): string {
		conflictSeq += 1;
		return `conflict-${conflictSeq}`;
	}

	function setTrackedDoc(
		path: string,
		revision: FileRevision,
		data: unknown,
		epoch = mountEpoch,
	): void {
		if (epoch !== mountEpoch) {
			return;
		}
		if (trackedDocs.has(path)) {
			trackedDocs.delete(path);
		} else if (trackedDocs.size >= MAX_TRACKED_DOCS) {
			const oldestKey = trackedDocs.keys().next().value;
			if (oldestKey !== undefined) {
				trackedDocs.delete(oldestKey);
			}
		}
		trackedDocs.set(path, { revision, data: cloneSnapshot(data) });
	}

	function removeTrackedDoc(path: string, epoch = mountEpoch): void {
		if (epoch !== mountEpoch) {
			return;
		}
		trackedDocs.delete(path);
	}

	function refreshConfirmedSnapshot(collectionName?: string, epoch = mountEpoch): void {
		if (epoch !== mountEpoch) {
			return;
		}
		if (!cacheEngine) {
			confirmedEntries = {};
			corruptEntries = [];
			return;
		}
		corruptEntries = cacheEngine.getCorruptEntries();
		if (collectionName !== undefined) {
			confirmedEntries = {
				...confirmedEntries,
				[collectionName]: cacheEngine.getEntries(collectionName),
			};
			return;
		}
		const next: Record<string, readonly CachedIndexEntry[]> = {};
		for (const [name, def] of Object.entries(collectionDefs)) {
			if (def.hasIndex) {
				next[name] = cacheEngine.getEntries(name);
			}
		}
		confirmedEntries = next;
	}

	function buildCacheCollectionConfigs(): CacheCollectionConfig<unknown, unknown>[] {
		const configs: CacheCollectionConfig<unknown, unknown>[] = [];
		for (const [name, def] of Object.entries(collectionDefs)) {
			configs.push({
				name,
				template: def.template,
				adapter: def.adapter,
				companion: def.companion ? { template: def.companion.template } : undefined,
				index: def.index,
			});
		}
		return configs;
	}

	function initializeEngine(nextBackend: FsBackend): void {
		cacheEngine?.destroy();

		const nextQueue = new WriteQueue(nextBackend, {
			systemDir,
			useWebLocks: config.useWebLocks,
			lockPrefix: `cs-fs:${namespace}`,
			retryOnLock: config.retryOnLock,
			verifyAfterWrite: config.verifyAfterWrite,
			backup: config.backup,
		});

		const nextCache = new CacheEngine({
			backend: nextBackend,
			writeQueue: nextQueue,
			collections: buildCacheCollectionConfigs(),
			systemDir,
			ignore: config.ignore,
			bootCheck: config.bootCheck ?? "metadata-scan",
			bootConcurrency: config.bootConcurrency ?? DEFAULT_BOOT_CONCURRENCY,
			indexFlushMs: config.indexFlushMs ?? DEFAULT_INDEX_FLUSH_MS,
			maxFlushWaitMs: config.maxFlushWaitMs ?? DEFAULT_MAX_FLUSH_WAIT_MS,
			readOnly: mode === "read",
			logger,
		});

		backend = nextBackend;
		writeQueue = nextQueue;
		cacheEngine = nextCache;
		if (mode !== "read") {
			logger.setBackend(nextBackend, nextQueue);
		} else {
			logger.setBackend(undefined, undefined);
		}
	}

	if (config.backend) {
		initializeEngine(config.backend);
	}

	function assertWritable(): void {
		if (mode === "read") {
			throw new FsError("PERMISSION_DENIED", "Workspace is mounted in read-only mode.");
		}
	}

	function assertMounted(): { backend: FsBackend; writeQueue: WriteQueue; cacheEngine: CacheEngine } {
		if (destroyed) {
			throw new FsError("ABORTED", "Workspace has been destroyed.");
		}
		if (mountStatus === "unsupported") {
			throw new FsError("UNSUPPORTED_ENV", "File System Access API is not supported.");
		}
		if (mountStatus === "stale") {
			throw new FsError("HANDLE_STALE", "Mounted directory handle is stale or missing.");
		}
		if (mountStatus === "needs-permission") {
			throw new FsError("PERMISSION_REQUIRED", "Directory permission must be granted.");
		}
		if (mountStatus !== "ready" || !backend || !writeQueue || !cacheEngine) {
			throw new FsError("UNLINKED", "Workspace is not mounted to a directory.");
		}
		return { backend, writeQueue, cacheEngine };
	}

	function handleInfrastructureError(
		error: unknown,
		fallbackMessage: string,
		context?: MutationContext,
		epoch = mountEpoch,
	): FsError {
		const fsError = toFsError(error, fallbackMessage);
		if (epoch !== mountEpoch) {
			return fsError;
		}
		if (fsError.code === "HANDLE_STALE") {
			mountStatus = "stale";
		} else if (fsError.code === "PERMISSION_DENIED" || fsError.code === "PERMISSION_REQUIRED") {
			mountStatus = "needs-permission";
		}

		if (fsError.code !== "CONFLICT") {
			lastError = fsError;
			logger.log({
				level: "error",
				event: "error",
				code: fsError.code,
				path: context?.path,
				message: fsError.message,
			});
			if (["IO_FAILED", "HANDLE_STALE", "PERMISSION_DENIED"].includes(fsError.code)) {
				recordEmergencyLog(namespace, {
					level: "error",
					event: "error",
					code: fsError.code,
					path: context?.path,
					message: fsError.message,
				});
			}
			if (context) {
				config.onMutationError?.(fsError, context);
			}
		}

		return fsError;
	}

	function pushPendingMutation(mutation: PendingMutation): void {
		pendingMutations = [...pendingMutations, mutation];
	}

	function updatePendingMutation(id: string, replacement: PendingMutation): void {
		pendingMutations = pendingMutations.map((item) => (item.id === id ? replacement : item));
	}

	function removePendingMutation(id: string): void {
		pendingMutations = pendingMutations.filter((item) => item.id !== id);
	}

	async function decodeWithRevision(
		activeBackend: FsBackend,
		path: string,
		adapter: FileAdapter<unknown>,
		signal?: AbortSignal,
	): Promise<{
		data: unknown;
		revision: FileRevision;
		meta?: unknown;
		migrated?: boolean;
		fromVersion?: number;
		warnings?: string[];
	} | null> {
		let bytes: Uint8Array;
		let revision: FileRevision;
		try {
			const result = await activeBackend.readBytes(path, {
				maxFileBytes: config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
				signal,
			});
			bytes = result.bytes;
			revision = result.revision;
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return null;
			}
			throw error;
		}

		const hash = revision.hash ?? (await sha256Hex(bytes));
		const fullRevision: FileRevision = {
			size: revision.size,
			lastModified: revision.lastModified,
			hash,
		};

		const fileName = path.split("/").at(-1) ?? path;
		const copy = new Uint8Array(bytes);
		const file = new File([copy], fileName, { lastModified: fullRevision.lastModified });
		const decoded = await adapter.decode({
			path,
			file,
			readBytes: async () => bytes,
			readText: async () => new TextDecoder().decode(bytes),
		});

		return {
			data: decoded.data,
			revision: fullRevision,
			meta: decoded.meta,
			migrated: decoded.migrated,
			fromVersion: decoded.fromVersion,
			warnings: decoded.warnings,
		};
	}

	async function maybeWriteBackMigration(
		activeQueue: WriteQueue,
		path: string,
		adapter: FileAdapter<unknown>,
		data: unknown,
		revision: FileRevision,
		fromVersion: number | undefined,
		signal?: AbortSignal,
	): Promise<FileRevision> {
		const jsonLike = adapter as Partial<JsonFileAdapter<unknown>>;
		const writeBackMode = jsonLike.migrationWriteBack ?? "lazy";
		logger.log({
			level: "info",
			event: "migration",
			path,
			message: `Document migrated (${writeBackMode} write-back)${fromVersion !== undefined ? ` from v${fromVersion}` : ""}.`,
		});

		if (writeBackMode !== "eager" || mode === "read") {
			return revision;
		}

		assertWritable();
		const encoded = toUint8Array(await adapter.encode(data, { path }));
		const written = await activeQueue.write(path, encoded, {
			expectedRevision: revision,
			backup: jsonLike.backupBeforeMigration,
			maxFileBytes: config.maxFileBytes,
			signal,
		});
		return withHash(written, encoded);
	}

	async function performConflictAwareWrite(params: {
		activeBackend: FsBackend;
		activeQueue: WriteQueue;
		path: string;
		adapter: FileAdapter<unknown>;
		data: unknown;
		expectedRevision: FileRevision | null | undefined;
		policy: ConflictPolicy;
		backup?: boolean;
		signal?: AbortSignal;
		target: ConflictTarget;
	}): Promise<WriteResult> {
		const {
			activeBackend,
			activeQueue,
			path,
			adapter,
			data,
			expectedRevision,
			policy,
			backup,
			signal,
			target,
		} = params;

		const encoded = toUint8Array(await adapter.encode(data, { path }));

		if (policy === "last-write-wins") {
			const rawRevision = await activeQueue.write(path, encoded, {
				expectedRevision: undefined,
				backup,
				maxFileBytes: config.maxFileBytes,
				signal,
			});
			const revision = await withHash(rawRevision, encoded);
			setTrackedDoc(path, revision, data);
			return { path, revision };
		}

		const effectiveExpected = expectedRevision === undefined ? null : expectedRevision;

		try {
			const rawRevision = await activeQueue.write(path, encoded, {
				expectedRevision: effectiveExpected,
				backup,
				maxFileBytes: config.maxFileBytes,
				signal,
			});
			const revision = await withHash(rawRevision, encoded);
			setTrackedDoc(path, revision, data);
			return { path, revision };
		} catch (error) {
			if (!isFsError(error) || error.code !== "CONFLICT") {
				throw error;
			}
		}

		// Conflict detected: read remote truth and run diff / 3-way merge.
		const remoteDecoded = await decodeWithRevision(activeBackend, path, adapter, signal);
		const tracked = trackedDocs.get(path);
		const baseDoc = tracked?.data;

		if (policy === "auto-merge" && remoteDecoded !== null) {
			const mergeResult = adapter.merge
				? adapter.merge(baseDoc, data, remoteDecoded.data)
				: mergeJson3Way(baseDoc, data, remoteDecoded.data, config.diffOptions);

			if (mergeResult.conflicts.length === 0) {
				const mergedEncoded = toUint8Array(await adapter.encode(mergeResult.merged, { path }));
				const rawRevision = await activeQueue.write(path, mergedEncoded, {
					expectedRevision: remoteDecoded.revision,
					backup,
					maxFileBytes: config.maxFileBytes,
					signal,
				});
				const revision = await withHash(rawRevision, mergedEncoded);
				setTrackedDoc(path, revision, mergeResult.merged);
				return { path, revision, merged: true };
			}

			const diffLocalToRemote = adapter.diff
				? adapter.diff(data, remoteDecoded.data)
				: diffJson(data, remoteDecoded.data, config.diffOptions);

			return await escalateConflict({
				path,
				baseDoc,
				localDoc: data,
				remoteDoc: remoteDecoded.data,
				remoteRevision: remoteDecoded.revision,
				diffLocalToRemote,
				threeWay: mergeResult,
				target,
			});
		}

		const diffLocalToRemote =
			remoteDecoded !== null
				? adapter.diff
					? adapter.diff(data, remoteDecoded.data)
					: diffJson(data, remoteDecoded.data, config.diffOptions)
				: null;

		const threeWay =
			remoteDecoded !== null
				? adapter.merge
					? adapter.merge(baseDoc, data, remoteDecoded.data)
					: mergeJson3Way(baseDoc, data, remoteDecoded.data, config.diffOptions)
				: undefined;

		return await escalateConflict({
			path,
			baseDoc,
			localDoc: data,
			remoteDoc: remoteDecoded?.data,
			remoteRevision: remoteDecoded?.revision ?? null,
			diffLocalToRemote,
			threeWay,
			target,
		});
	}

	async function escalateConflict(input: {
		path: string;
		baseDoc: unknown;
		localDoc: unknown;
		remoteDoc: unknown;
		remoteRevision: FileRevision | null;
		diffLocalToRemote: JsonDiffResult | null;
		threeWay?: JsonMergeResult<unknown>;
		target: ConflictTarget;
	}): Promise<never> {
		const conflictId = nextConflictId();
		const details: ConflictDetails = {
			id: conflictId,
			collection: input.target.collection,
			singleton: input.target.singleton,
			path: input.path,
			params: input.target.params,
			base: input.baseDoc,
			local: input.localDoc,
			remote: input.remoteDoc,
			remoteRevision: input.remoteRevision,
			diffLocalToRemote: input.diffLocalToRemote,
			threeWay: input.threeWay,
			createdAt: new SvelteDate().toISOString(),
		};

		conflictTargets.set(conflictId, input.target);
		unresolvedConflicts = [...unresolvedConflicts, details];

		if (input.remoteDoc !== undefined && input.remoteRevision !== null) {
			setTrackedDoc(input.path, input.remoteRevision, input.remoteDoc);
			if (cacheEngine && input.target.collection && input.target.params) {
				await cacheEngine.upsertEntry(
					input.target.collection,
					input.path,
					input.target.params,
					input.remoteRevision,
					input.remoteDoc,
					input.target.companionStatus,
				);
				refreshConfirmedSnapshot(input.target.collection);
			}
		} else {
			removeTrackedDoc(input.path);
			if (cacheEngine && input.target.collection) {
				await cacheEngine.removeEntry(input.target.collection, input.path);
				refreshConfirmedSnapshot(input.target.collection);
			}
		}

		logger.log({
			level: "warn",
			event: "conflict",
			code: "CONFLICT",
			path: input.path,
			message: `Write conflict detected for "${input.path}" (${conflictId}).`,
		});

		config.onMutationConflict?.(details);

		throw new FsError("CONFLICT", `Conflict detected for "${input.path}".`, {
			details: { conflictId, path: input.path },
		});
	}

	async function runBootCheck(epoch: number, activeCache: CacheEngine): Promise<void> {
		if (epoch !== mountEpoch) {
			return;
		}
		activeAbortController?.abort();
		const controller = new AbortController();
		activeAbortController = controller;
		try {
			await activeCache.boot({
				signal: controller.signal,
				onProgress: (progress) => {
					if (epoch !== mountEpoch) {
						return;
					}
					syncProgress = progress;
					config.onSyncProgress?.(progress);
				},
			});
			if (epoch !== mountEpoch) {
				return;
			}
			refreshConfirmedSnapshot(undefined, epoch);
			lastError = null;
		} finally {
			if (epoch === mountEpoch) {
				syncProgress = null;
			}
			if (activeAbortController === controller) {
				activeAbortController = null;
			}
		}
	}

	async function restore(): Promise<MountStatus> {
		if (destroyed) {
			return mountStatus;
		}
		const epoch = mountEpoch;
		if (config.backend) {
			if (mountStatus === "unlinked") {
				initializeEngine(config.backend);
				mountStatus = "ready";
			}
			if (cacheEngine) {
				const activeCache = cacheEngine;
				await withActivity("restoring", async () => {
					try {
						await runBootCheck(epoch, activeCache);
					} catch (error) {
						if (epoch !== mountEpoch) {
							return;
						}
						handleInfrastructureError(error, "Workspace boot check failed.", undefined, epoch);
					}
				});
			}
			return mountStatus;
		}

		if (!support.supported || !idbStore) {
			mountStatus = "unsupported";
			return mountStatus;
		}

		return withActivity("restoring", async () => {
			try {
				const handle = (await idbStore.loadHandle()) as PermissionAwareDirectoryHandle | null;
				if (epoch !== mountEpoch) {
					return mountStatus;
				}
				if (!handle) {
					mountStatus = "unlinked";
					return mountStatus;
				}

				directoryHandle = handle;
				const permission = handle.queryPermission
					? await handle.queryPermission({ mode })
					: "granted";
				if (epoch !== mountEpoch) {
					return mountStatus;
				}

				if (permission !== "granted") {
					mountStatus = "needs-permission";
					logger.log({
						level: "info",
						event: "permission",
						message: `Restored handle requires permission ("${permission}").`,
					});
					return mountStatus;
				}

				const nextBackend = config.createBackend
					? config.createBackend(handle)
					: new BrowserFsBackend(handle, { maxFileBytes: config.maxFileBytes });
				initializeEngine(nextBackend);
				mountStatus = "ready";
				logger.log({
					level: "info",
					event: "mount",
					message: "Workspace restored and ready.",
				});
				await runBootCheck(epoch, cacheEngine as CacheEngine);
				if (epoch !== mountEpoch) {
					return mountStatus;
				}
				return mountStatus;
			} catch (error) {
				if (epoch !== mountEpoch) {
					return mountStatus;
				}
				handleInfrastructureError(error, "Failed to restore workspace handle.", undefined, epoch);
				return mountStatus;
			}
		});
	}

	async function pick(options?: PickDirectoryOptions): Promise<MountStatus> {
		if (destroyed) {
			return mountStatus;
		}
		if (!support.supported && !config.showDirectoryPicker) {
			mountStatus = "unsupported";
			throw new FsError("UNSUPPORTED_ENV", "showDirectoryPicker is not supported.");
		}

		const picker =
			config.showDirectoryPicker ??
			(typeof window !== "undefined"
				? (window as unknown as WindowWithDirectoryPicker).showDirectoryPicker
				: undefined);

		if (typeof picker !== "function") {
			mountStatus = "unsupported";
			throw new FsError("UNSUPPORTED_ENV", "showDirectoryPicker is not available.");
		}

		let pickedHandle: FileSystemDirectoryHandle;
		try {
			pickedHandle = await picker({ mode, ...options });
		} catch (error) {
			if (isAbortDomError(error)) {
				return mountStatus;
			}
			throw handleInfrastructureError(error, "Failed to pick workspace directory.");
		}

		return withActivity("restoring", async () => {
			mountEpoch += 1;
			const epoch = mountEpoch;
			try {
				directoryHandle = pickedHandle as PermissionAwareDirectoryHandle;
				if (idbStore) {
					await idbStore.saveHandle(pickedHandle);
				}
				if (epoch !== mountEpoch) {
					return mountStatus;
				}
				const nextBackend = config.createBackend
					? config.createBackend(pickedHandle)
					: new BrowserFsBackend(pickedHandle, { maxFileBytes: config.maxFileBytes });
				initializeEngine(nextBackend);
				mountStatus = "ready";
				lastError = null;
				logger.log({
					level: "info",
					event: "mount",
					message: `Mounted directory "${pickedHandle.name}".`,
				});
				await runBootCheck(epoch, cacheEngine as CacheEngine);
				return mountStatus;
			} catch (error) {
				handleInfrastructureError(error, "Failed to initialize mounted directory.", undefined, epoch);
				return mountStatus;
			}
		});
	}

	async function requestAccess(): Promise<MountStatus> {
		if (destroyed) {
			return mountStatus;
		}
		if (config.backend) {
			return mountStatus;
		}
		if (!support.supported || !idbStore) {
			mountStatus = "unsupported";
			return mountStatus;
		}
		const epoch = mountEpoch;

		let handle = directoryHandle;
		if (!handle) {
			handle = (await idbStore.loadHandle()) as PermissionAwareDirectoryHandle | null;
			if (epoch !== mountEpoch) {
				return mountStatus;
			}
			directoryHandle = handle;
		}
		if (!handle) {
			mountStatus = "unlinked";
			return mountStatus;
		}

		return withActivity("restoring", async () => {
			try {
				const permission = handle.requestPermission
					? await handle.requestPermission({ mode })
					: "granted";
				if (epoch !== mountEpoch) {
					return mountStatus;
				}

				if (permission !== "granted") {
					mountStatus = "needs-permission";
					logger.log({
						level: "warn",
						event: "permission",
						message: `Directory permission not granted ("${permission}").`,
					});
					return mountStatus;
				}

				const nextBackend = config.createBackend
					? config.createBackend(handle)
					: new BrowserFsBackend(handle, { maxFileBytes: config.maxFileBytes });
				initializeEngine(nextBackend);
				mountStatus = "ready";
				lastError = null;
				logger.log({
					level: "info",
					event: "permission",
					message: "Directory permission granted.",
				});
				await runBootCheck(epoch, cacheEngine as CacheEngine);
				if (epoch !== mountEpoch) {
					return mountStatus;
				}
				return mountStatus;
			} catch (error) {
				if (epoch !== mountEpoch) {
					return mountStatus;
				}
				handleInfrastructureError(error, "Failed to request directory access.", undefined, epoch);
				return mountStatus;
			}
		});
	}

	async function forget(): Promise<void> {
		mountEpoch += 1;
		activeAbortController?.abort();
		activeAbortController = null;
		cacheEngine?.destroy();
		cacheEngine = null;
		writeQueue = null;
		backend = null;
		directoryHandle = null;
		logger.setBackend(undefined, undefined);

		trackedDocs.clear();
		conflictTargets.clear();
		pendingMutations = [];
		confirmedEntries = {};
		unresolvedConflicts = [];
		corruptEntries = [];
		lastError = null;
		syncProgress = null;

		if (idbStore) {
			try {
				await idbStore.clearHandle();
			} catch {
				// Ignore IDB errors when forgetting an already-broken handle.
			}
		}

		mountStatus = support.supported || config.backend ? "unlinked" : "unsupported";
	}

	async function flush(): Promise<void> {
		if (inFlightMutations.size > 0) {
			await Promise.allSettled(inFlightMutations);
		}
		await writeQueue?.flush();
		await cacheEngine?.flush();
		await logger.flush();
	}

	async function heal(options?: HealOptions): Promise<HealReport> {
		const { cacheEngine: activeCache } = assertMounted();
		const epoch = mountEpoch;
		activeAbortController?.abort();
		const controller = new AbortController();
		activeAbortController = controller;

		const onExternalAbort = (): void => {
			controller.abort(options?.signal?.reason);
		};
		if (options?.signal) {
			if (options.signal.aborted) {
				controller.abort(options.signal.reason);
			} else {
				options.signal.addEventListener("abort", onExternalAbort);
			}
		}

		return withActivity("healing", async () => {
			try {
				const report = await activeCache.heal({
					...options,
					signal: controller.signal,
					onProgress: (progress) => {
						syncProgress = progress;
						config.onSyncProgress?.(progress);
						options?.onProgress?.(progress);
					},
				});
				refreshConfirmedSnapshot(undefined, epoch);
				if (epoch === mountEpoch) {
					lastError = null;
				}
				return report;
			} catch (error) {
				if (isFsError(error) && error.code === "ABORTED") {
					throw error;
				}
				throw handleInfrastructureError(error, "Workspace heal failed.", undefined, epoch);
			} finally {
				options?.signal?.removeEventListener("abort", onExternalAbort);
				if (epoch === mountEpoch) {
					syncProgress = null;
				}
				if (activeAbortController === controller) {
					activeAbortController = null;
				}
			}
		});
	}

	async function resolveConflict(
		conflictId: string,
		resolution: ConflictResolution,
		customDoc?: unknown,
	): Promise<WriteResult | void> {
		assertWritable();
		const conflict = unresolvedConflicts.find((item) => item.id === conflictId);
		const target = conflictTargets.get(conflictId);
		if (!conflict || !target) {
			throw new FsError("NOT_FOUND", `Conflict "${conflictId}" was not found.`, {
				details: { conflictId },
			});
		}

		const {
			backend: activeBackend,
			writeQueue: activeQueue,
			cacheEngine: activeCache,
		} = assertMounted();
		const epoch = mountEpoch;

		if (resolution === "keep-remote") {
			unresolvedConflicts = unresolvedConflicts.filter((item) => item.id !== conflictId);
			conflictTargets.delete(conflictId);

			if (conflict.remote !== undefined && conflict.remoteRevision !== null) {
				setTrackedDoc(conflict.path, conflict.remoteRevision, conflict.remote, epoch);
				if (target.collection && conflict.params) {
					await activeCache.upsertEntry(
						target.collection,
						conflict.path,
						conflict.params,
						conflict.remoteRevision,
						conflict.remote,
						target.companionStatus,
					);
					refreshConfirmedSnapshot(target.collection, epoch);
				}
			} else {
				removeTrackedDoc(conflict.path, epoch);
				if (target.collection) {
					await activeCache.removeEntry(target.collection, conflict.path);
					refreshConfirmedSnapshot(target.collection, epoch);
				}
			}

			if (epoch === mountEpoch) {
				lastError = null;
			}
			return undefined;
		}

		if (resolution === "apply-custom" && customDoc === undefined) {
			throw new FsError(
				"INVALID_CONFIG",
				'resolveConflict(..., "apply-custom", customDoc) requires a customDoc argument.',
			);
		}

		const docToWrite = resolution === "keep-local" ? conflict.local : customDoc;
		return withActivity("writing", async () => {
			try {
				const encoded = toUint8Array(
					await target.adapter.encode(docToWrite, { path: conflict.path }),
				);
				const rawRevision = await activeQueue.write(conflict.path, encoded, {
					expectedRevision: conflict.remoteRevision,
					maxFileBytes: config.maxFileBytes,
				});
				const revision = await withHash(rawRevision, encoded);
				if (epoch !== mountEpoch) {
					return { path: conflict.path, revision };
				}

				setTrackedDoc(conflict.path, revision, docToWrite, epoch);
				unresolvedConflicts = unresolvedConflicts.filter((item) => item.id !== conflictId);
				conflictTargets.delete(conflictId);

				if (target.collection && conflict.params) {
					await activeCache.upsertEntry(
						target.collection,
						conflict.path,
						conflict.params,
						revision,
						docToWrite,
						target.companionStatus,
					);
					refreshConfirmedSnapshot(target.collection, epoch);
				}

				if (epoch === mountEpoch) {
					lastError = null;
				}
				logger.log({
					level: "info",
					event: "write",
					path: conflict.path,
					message: `Resolved conflict "${conflictId}" using "${resolution}".`,
				});

				return { path: conflict.path, revision };
			} catch (error) {
				if (isFsError(error) && error.code === "CONFLICT" && epoch === mountEpoch) {
					let remoteDecoded: Awaited<ReturnType<typeof decodeWithRevision>>;
					try {
						remoteDecoded = await decodeWithRevision(
							activeBackend,
							conflict.path,
							target.adapter,
						);
					} catch {
						remoteDecoded = null;
					}
					if (epoch === mountEpoch) {
						const nextRemote = remoteDecoded?.data;
						const nextRemoteRevision = remoteDecoded?.revision ?? null;
						const nextDiff =
							remoteDecoded !== null
								? target.adapter.diff
									? target.adapter.diff(docToWrite, remoteDecoded.data)
									: diffJson(docToWrite, remoteDecoded.data, config.diffOptions)
								: null;
						const nextThreeWay =
							remoteDecoded !== null
								? target.adapter.merge
									? target.adapter.merge(conflict.base, docToWrite, remoteDecoded.data)
									: mergeJson3Way(
											conflict.base,
											docToWrite,
											remoteDecoded.data,
											config.diffOptions,
										)
								: undefined;
						const refreshedConflict: ConflictDetails = {
							...conflict,
							local: docToWrite,
							remote: nextRemote,
							remoteRevision: nextRemoteRevision,
							diffLocalToRemote: nextDiff,
							threeWay: nextThreeWay,
						};
						unresolvedConflicts = unresolvedConflicts.map((item) =>
							item.id === conflictId ? refreshedConflict : item,
						);
					}
				}
				throw handleInfrastructureError(
					error,
					`Failed to resolve conflict "${conflictId}".`,
					undefined,
					epoch,
				);
			}
		});
	}

	function trackMutationPromise(promise: Promise<unknown>): void {
		const settled = (async () => {
			try {
				await promise;
			} catch {
				// Errors are already handled and surfaced by the caller.
			}
		})();
		inFlightMutations.add(settled);
		void (async () => {
			try {
				await settled;
			} finally {
				inFlightMutations.delete(settled);
			}
		})();
	}

	function buildSingletonHandle(
		name: string,
		def: SingletonDefinition<unknown>,
	): SingletonHandle<unknown> {
		return {
			path: def.path,

			async read(options) {
				const { backend: activeBackend, writeQueue: activeQueue } = assertMounted();
				const epoch = mountEpoch;
				return withActivity("reading", async () => {
					try {
						const decoded = await decodeWithRevision(
							activeBackend,
							def.path,
							def.adapter,
							options?.signal,
						);
						if (!decoded) {
							removeTrackedDoc(def.path, epoch);
							return null;
						}
						const finalRevision = decoded.migrated
							? await maybeWriteBackMigration(
									activeQueue,
									def.path,
									def.adapter,
									decoded.data,
									decoded.revision,
									decoded.fromVersion,
									options?.signal,
								)
							: decoded.revision;
						setTrackedDoc(def.path, finalRevision, decoded.data, epoch);
						if (epoch === mountEpoch) {
							lastError = null;
						}
						return {
							path: def.path,
							data: decoded.data,
							revision: finalRevision,
							meta: decoded.meta,
							migrated: decoded.migrated,
							fromVersion: decoded.fromVersion,
							warnings: decoded.warnings,
						};
					} catch (error) {
						throw handleInfrastructureError(
							error,
							`Failed to read singleton "${name}".`,
							undefined,
							epoch,
						);
					}
				});
			},

			async write(data, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue } = assertMounted();
				const epoch = mountEpoch;
				const context: MutationContext = {
					operation: "write",
					singleton: name,
					path: def.path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({ id: mutId, kind: "pending", collection: "", path: def.path });

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						const expectedRevision =
							options?.expectedRevision !== undefined
								? options.expectedRevision
								: trackedDocs.get(def.path)?.revision;

						const result = await performConflictAwareWrite({
							activeBackend,
							activeQueue,
							path: def.path,
							adapter: def.adapter,
							data,
							expectedRevision,
							policy: options?.conflictPolicy ?? defaultConflictPolicy,
							backup: options?.backup,
							signal: options?.signal,
							target: { adapter: def.adapter, singleton: name },
						});
						if (epoch !== mountEpoch) {
							return result;
						}

						lastError = null;
						logger.log({
							level: "info",
							event: "write",
							path: def.path,
							message: `Wrote singleton "${name}".`,
						});
						config.onMutationSettled?.({
							...context,
							status: "committed",
							revision: result.revision,
						});
						return result;
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to write singleton "${name}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async update(updater, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue } = assertMounted();
				const epoch = mountEpoch;
				const context: MutationContext = {
					operation: "update",
					singleton: name,
					path: def.path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({ id: mutId, kind: "pending", collection: "", path: def.path });

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						const current = await decodeWithRevision(
							activeBackend,
							def.path,
							def.adapter,
							options?.signal,
						);
						if (epoch !== mountEpoch) {
							throw new FsError("ABORTED", "Workspace was unmounted.");
						}
						if (current) {
							setTrackedDoc(def.path, current.revision, current.data, epoch);
						} else {
							removeTrackedDoc(def.path, epoch);
						}
						const nextData = await updater(current ? current.data : null);
						const expectedRevision =
							options?.expectedRevision !== undefined
								? options.expectedRevision
								: (current?.revision ?? null);

						const result = await performConflictAwareWrite({
							activeBackend,
							activeQueue,
							path: def.path,
							adapter: def.adapter,
							data: nextData,
							expectedRevision,
							policy: options?.conflictPolicy ?? defaultConflictPolicy,
							backup: options?.backup,
							signal: options?.signal,
							target: { adapter: def.adapter, singleton: name },
						});
						if (epoch !== mountEpoch) {
							return result;
						}

						lastError = null;
						config.onMutationSettled?.({
							...context,
							status: "committed",
							revision: result.revision,
						});
						return result;
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to update singleton "${name}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async exists() {
				const { backend: activeBackend } = assertMounted();
				return activeBackend.exists(def.path);
			},

			async delete(options) {
				assertWritable();
				const { writeQueue: activeQueue } = assertMounted();
				const epoch = mountEpoch;
				const context: MutationContext = {
					operation: "delete",
					singleton: name,
					path: def.path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({ id: mutId, kind: "pending", collection: "", path: def.path });

				const task = withActivity("writing", async (): Promise<void> => {
					try {
						const policy = options?.conflictPolicy ?? defaultConflictPolicy;
						const expectedRevision =
							policy === "last-write-wins"
								? undefined
								: (options?.expectedRevision ?? trackedDocs.get(def.path)?.revision);
						await activeQueue.delete(def.path, {
							expectedRevision,
							backup: options?.backup,
						});
						if (epoch !== mountEpoch) {
							return;
						}
						removeTrackedDoc(def.path, epoch);
						lastError = null;
						logger.log({
							level: "info",
							event: "delete",
							path: def.path,
							message: `Deleted singleton "${name}".`,
						});
						config.onMutationSettled?.({ ...context, status: "committed" });
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to delete singleton "${name}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},
		};
	}

	function buildCollectionHandle(
		name: string,
		def: CollectionDefinition<unknown, unknown, Record<string, string>, boolean>,
	): CollectionHandle<unknown, unknown, Record<string, string>, boolean> {
		function projectDoc(doc: unknown, params: Record<string, string>): unknown {
			return def.index?.project ? def.index.project(doc, params) : doc;
		}

		function requireCompanionTemplate(): PathTemplate {
			if (!def.companion) {
				throw new FsError(
					"INVALID_CONFIG",
					`Collection "${name}" does not have a companion template configured.`,
					{ details: { collection: name } },
				);
			}
			return def.companion.template;
		}

		async function resolveExistingCompanionStatus(
			activeBackend: FsBackend,
			activeCache: CacheEngine,
			path: string,
			params: Record<string, string>,
		): Promise<CompanionStatus | undefined> {
			if (!def.companion) {
				return undefined;
			}
			const cached = activeCache.getEntry(name, path)?.companionStatus;
			if (cached !== undefined) {
				return cached;
			}
			return (await activeBackend.exists(def.companion.template.build(params)))
				? "present"
				: "missing";
		}

		const baseHandle: BaseCollectionHandle<unknown, Record<string, string>> = {
			name,
			pattern: def.pattern,

			async read(params, options) {
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const path = def.template.build(params);
				return withActivity("reading", async () => {
					try {
						const decoded = await decodeWithRevision(
							activeBackend,
							path,
							def.adapter,
							options?.signal,
						);
						if (!decoded) {
							removeTrackedDoc(path, epoch);
							return null;
						}
						let finalRevision = decoded.revision;
						if (decoded.migrated) {
							finalRevision = await maybeWriteBackMigration(
								activeQueue,
								path,
								def.adapter,
								decoded.data,
								decoded.revision,
								decoded.fromVersion,
								options?.signal,
							);
							if (epoch !== mountEpoch) {
								return {
									path,
									data: decoded.data,
									revision: finalRevision,
									meta: decoded.meta,
									migrated: decoded.migrated,
									fromVersion: decoded.fromVersion,
									warnings: decoded.warnings,
								};
							}
							if (def.hasIndex) {
								const companionStatus = await resolveExistingCompanionStatus(
									activeBackend,
									activeCache,
									path,
									params,
								);
								await activeCache.upsertEntry(
									name,
									path,
									params,
									finalRevision,
									decoded.data,
									companionStatus,
								);
								refreshConfirmedSnapshot(name, epoch);
							}
						}
						setTrackedDoc(path, finalRevision, decoded.data, epoch);
						if (epoch === mountEpoch) {
							lastError = null;
						}
						return {
							path,
							data: decoded.data,
							revision: finalRevision,
							meta: decoded.meta,
							migrated: decoded.migrated,
							fromVersion: decoded.fromVersion,
							warnings: decoded.warnings,
						};
					} catch (error) {
						throw handleInfrastructureError(error, `Failed to read "${path}".`, undefined, epoch);
					}
				});
			},

			async write(params, data, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const path = def.template.build(params);
				const context: MutationContext = {
					operation: "write",
					collection: name,
					path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({
					id: mutId,
					kind: "upsert",
					collection: name,
					path,
					params,
					projected: def.hasIndex ? projectDoc(data, params) : data,
				});

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						const expectedRevision =
							options?.expectedRevision !== undefined
								? options.expectedRevision
								: (trackedDocs.get(path)?.revision ?? activeCache.getRevision(name, path));
						const existingCompanionStatus = await resolveExistingCompanionStatus(
							activeBackend,
							activeCache,
							path,
							params,
						);

						const result = await performConflictAwareWrite({
							activeBackend,
							activeQueue,
							path,
							adapter: def.adapter,
							data,
							expectedRevision,
							policy: options?.conflictPolicy ?? defaultConflictPolicy,
							backup: options?.backup,
							signal: options?.signal,
							target: {
								adapter: def.adapter,
								collection: name,
								params,
								companionStatus: existingCompanionStatus,
							},
						});
						if (epoch !== mountEpoch) {
							return result;
						}

						if (def.hasIndex) {
							const committedData = result.merged
								? (trackedDocs.get(path)?.data ?? data)
								: data;
							await activeCache.upsertEntry(
								name,
								path,
								params,
								result.revision,
								committedData,
								existingCompanionStatus,
							);
							refreshConfirmedSnapshot(name, epoch);
						}

						lastError = null;
						logger.log({
							level: "info",
							event: "write",
							path,
							message: `Wrote record in "${name}".`,
						});
						config.onMutationSettled?.({
							...context,
							status: "committed",
							revision: result.revision,
						});
						return result;
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to write "${path}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async writeRaw(params, fileOrBytes, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const path = def.template.build(params);
				const context: MutationContext = {
					operation: "writeRaw",
					collection: name,
					path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({ id: mutId, kind: "pending", collection: name, path });

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						const bytes = await rawInputToUint8Array(fileOrBytes);
						const policy = options?.conflictPolicy ?? defaultConflictPolicy;
						const expectedRevision =
							policy === "last-write-wins"
								? undefined
								: (options?.expectedRevision ??
									trackedDocs.get(path)?.revision ??
									null);
						const rawRevision = await activeQueue.write(path, bytes, {
							expectedRevision,
							backup: options?.backup,
							maxFileBytes: config.maxFileBytes,
							signal: options?.signal,
						});
						const revision = await withHash(rawRevision, bytes);
						if (epoch !== mountEpoch) {
							return { path, revision };
						}

						removeTrackedDoc(path, epoch);
						if (def.hasIndex) {
							const fileName = path.split("/").at(-1) ?? path;
							const rawFile =
								fileOrBytes instanceof File
									? fileOrBytes
									: new File([new Uint8Array(bytes)], fileName, {
											lastModified: revision.lastModified,
										});
							try {
								const decoded = await def.adapter.decode({
									path,
									file: rawFile,
									readBytes: async () => bytes,
									readText: async () => new TextDecoder().decode(bytes),
								});
								const existingCompanionStatus = await resolveExistingCompanionStatus(
									activeBackend,
									activeCache,
									path,
									params,
								);
								await activeCache.upsertEntry(
									name,
									path,
									params,
									revision,
									decoded.data,
									existingCompanionStatus,
								);
							} catch {
								await activeCache.removeEntry(name, path);
							}
							refreshConfirmedSnapshot(name, epoch);
						}

						lastError = null;
						logger.log({
							level: "info",
							event: "write",
							path,
							message: `Wrote raw file in "${name}".`,
						});
						config.onMutationSettled?.({ ...context, status: "committed", revision });
						return { path, revision };
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to write raw file "${path}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async writeWithCompanion(params, data, companionFile, options) {
				assertWritable();
				const companionTemplate = requireCompanionTemplate();
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const path = def.template.build(params);
				const companionPath = companionTemplate.build(params);
				const context: MutationContext = {
					operation: "writeWithCompanion",
					collection: name,
					path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({
					id: mutId,
					kind: "upsert",
					collection: name,
					path,
					params,
					projected: def.hasIndex ? projectDoc(data, params) : data,
					companionStatus: "present",
				});

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						// Validate/encode primary record before writing companion so invalid data never overwrites companion.
						toUint8Array(await def.adapter.encode(data, { path }));

						const policy = options?.conflictPolicy ?? defaultConflictPolicy;
						const expectedRevision =
							options?.expectedRevision !== undefined
								? options.expectedRevision
								: (trackedDocs.get(path)?.revision ?? activeCache.getRevision(name, path));

						let conflictPrechecked = false;
						if (policy !== "last-write-wins") {
							const effectiveExpected =
								expectedRevision === undefined ? null : expectedRevision;
							const currentStat = await activeBackend.stat(path);
							let mismatch =
								(effectiveExpected === null && currentStat !== null) ||
								(effectiveExpected !== null &&
									(currentStat === null ||
										currentStat.size !== effectiveExpected.size ||
										currentStat.lastModified !== effectiveExpected.lastModified));
							if (
								!mismatch &&
								effectiveExpected !== null &&
								effectiveExpected.hash !== undefined &&
								currentStat !== null
							) {
								const currentRead = await activeBackend.readBytes(path, {
									maxFileBytes: config.maxFileBytes,
									signal: options?.signal,
								});
								const currentHash = await sha256Hex(currentRead.bytes);
								mismatch = currentHash !== effectiveExpected.hash;
							}
							conflictPrechecked = mismatch;
						}

						const companionBytes = await rawInputToUint8Array(companionFile);
						let result: WriteResult;
						if (conflictPrechecked) {
							result = await performConflictAwareWrite({
								activeBackend,
								activeQueue,
								path,
								adapter: def.adapter,
								data,
								expectedRevision,
								policy,
								backup: options?.backup,
								signal: options?.signal,
								target: {
									adapter: def.adapter,
									collection: name,
									params,
									companionStatus: "present",
								},
							});
							if (result.merged) {
								await activeQueue.write(companionPath, companionBytes, {
									backup: options?.backup,
									maxFileBytes: config.maxFileBytes,
									signal: options?.signal,
								});
							}
						} else {
							// Write companion BEFORE primary record so a failed companion never leaves a dangling record.
							await activeQueue.write(companionPath, companionBytes, {
								backup: options?.backup,
								maxFileBytes: config.maxFileBytes,
								signal: options?.signal,
							});
							result = await performConflictAwareWrite({
								activeBackend,
								activeQueue,
								path,
								adapter: def.adapter,
								data,
								expectedRevision,
								policy,
								backup: options?.backup,
								signal: options?.signal,
								target: {
									adapter: def.adapter,
									collection: name,
									params,
									companionStatus: "present",
								},
							});
						}
						if (epoch !== mountEpoch) {
							return result;
						}

						if (def.hasIndex) {
							const committedData = result.merged
								? (trackedDocs.get(path)?.data ?? data)
								: data;
							await activeCache.upsertEntry(
								name,
								path,
								params,
								result.revision,
								committedData,
								"present",
							);
							refreshConfirmedSnapshot(name, epoch);
						}

						lastError = null;
						logger.log({
							level: "info",
							event: "write",
							path,
							message: `Wrote record with companion in "${name}".`,
						});
						config.onMutationSettled?.({
							...context,
							status: "committed",
							revision: result.revision,
						});
						return result;
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to write "${path}" with companion.`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async readCompanion(params, options) {
				const companionTemplate = requireCompanionTemplate();
				const { backend: activeBackend } = assertMounted();
				const companionPath = companionTemplate.build(params);
				try {
					const { bytes, revision } = await activeBackend.readBytes(companionPath, {
						maxFileBytes: config.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
						signal: options?.signal,
					});
					const fileName = companionPath.split("/").at(-1) ?? companionPath;
					const file = new File([new Uint8Array(bytes)], fileName, {
						lastModified: revision.lastModified,
					});
					return { path: companionPath, bytes, file, revision };
				} catch (error) {
					if (isFsError(error) && error.code === "NOT_FOUND") {
						return null;
					}
					throw handleInfrastructureError(
						error,
						`Failed to read companion "${companionPath}".`,
					);
				}
			},

			async hasCompanion(params) {
				const companionTemplate = requireCompanionTemplate();
				const { backend: activeBackend } = assertMounted();
				const companionPath = companionTemplate.build(params);
				return activeBackend.exists(companionPath);
			},

			async update(params, updater, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const path = def.template.build(params);
				const context: MutationContext = {
					operation: "update",
					collection: name,
					path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({ id: mutId, kind: "pending", collection: name, path });

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						const current = await decodeWithRevision(
							activeBackend,
							path,
							def.adapter,
							options?.signal,
						);
						if (epoch !== mountEpoch) {
							throw new FsError("ABORTED", "Workspace was unmounted.");
						}
						if (current) {
							setTrackedDoc(path, current.revision, current.data, epoch);
						} else {
							removeTrackedDoc(path, epoch);
						}

						const nextData = await updater(current ? current.data : null);
						const existingCompanionStatus = await resolveExistingCompanionStatus(
							activeBackend,
							activeCache,
							path,
							params,
						);
						if (def.hasIndex && epoch === mountEpoch) {
							updatePendingMutation(mutId, {
								id: mutId,
								kind: "upsert",
								collection: name,
								path,
								params,
								projected: projectDoc(nextData, params),
								companionStatus: existingCompanionStatus,
							});
						}

						const expectedRevision =
							options?.expectedRevision !== undefined
								? options.expectedRevision
								: (current?.revision ?? null);

						const result = await performConflictAwareWrite({
							activeBackend,
							activeQueue,
							path,
							adapter: def.adapter,
							data: nextData,
							expectedRevision,
							policy: options?.conflictPolicy ?? defaultConflictPolicy,
							backup: options?.backup,
							signal: options?.signal,
							target: {
								adapter: def.adapter,
								collection: name,
								params,
								companionStatus: existingCompanionStatus,
							},
						});
						if (epoch !== mountEpoch) {
							return result;
						}

						if (def.hasIndex) {
							const committedData = result.merged
								? (trackedDocs.get(path)?.data ?? nextData)
								: nextData;
							await activeCache.upsertEntry(
								name,
								path,
								params,
								result.revision,
								committedData,
								existingCompanionStatus,
							);
							refreshConfirmedSnapshot(name, epoch);
						}

						lastError = null;
						config.onMutationSettled?.({
							...context,
							status: "committed",
							revision: result.revision,
						});
						return result;
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to update "${path}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async move(fromParams, toParams, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const fromPath = def.template.build(fromParams);
				const toPath = def.template.build(toParams);
				const context: MutationContext = {
					operation: "move",
					collection: name,
					path: toPath,
				};
				const prevTracked = trackedDocs.get(fromPath);
				const projected =
					prevTracked !== undefined && def.index?.project
						? def.index.project(prevTracked.data, toParams)
						: undefined;
				const mutId = nextMutationId();
				pushPendingMutation({
					id: mutId,
					kind: "move",
					collection: name,
					fromPath,
					toPath,
					toParams,
					projected,
				});

				const task = withActivity("writing", async (): Promise<WriteResult> => {
					try {
						const policy = options?.conflictPolicy ?? defaultConflictPolicy;
						const prevCachedRevision = activeCache.getRevision(name, fromPath);
						const expectedRevision =
							policy === "last-write-wins"
								? undefined
								: (options?.expectedRevision ??
									prevTracked?.revision ??
									prevCachedRevision);

						const rawRevision = await activeQueue.move(fromPath, toPath, {
							expectedRevision,
						});
						const prevHash = prevTracked?.revision.hash ?? prevCachedRevision?.hash;
						const newRevision: FileRevision =
							rawRevision.hash !== undefined || prevHash === undefined
								? rawRevision
								: { ...rawRevision, hash: prevHash };

						let companionMoved = false;
						if (def.companion) {
							const fromCompanion = def.companion.template.build(fromParams);
							const toCompanion = def.companion.template.build(toParams);
							try {
								if (await activeBackend.exists(fromCompanion)) {
									await activeQueue.move(fromCompanion, toCompanion);
									companionMoved = true;
								}
							} catch (companionError) {
								// Roll back primary move so record + companion never split across paths.
								try {
									const rollbackRev = await activeQueue.move(toPath, fromPath);
									const prev = trackedDocs.get(fromPath);
									if (prev) {
										const preservedRev: FileRevision =
											rollbackRev.hash !== undefined || prev.revision.hash === undefined
												? rollbackRev
												: { ...rollbackRev, hash: prev.revision.hash };
										setTrackedDoc(fromPath, preservedRev, prev.data, epoch);
									}
								} catch {
									// Best-effort rollback.
								}
								throw companionError;
							}
						}

						if (epoch !== mountEpoch) {
							return { path: toPath, revision: newRevision };
						}

						removeTrackedDoc(fromPath, epoch);
						let docForIndex = prevTracked?.data;
						if (docForIndex === undefined && def.hasIndex) {
							const decoded = await decodeWithRevision(activeBackend, toPath, def.adapter);
							docForIndex = decoded?.data;
						}
						if (docForIndex !== undefined) {
							setTrackedDoc(toPath, newRevision, docForIndex, epoch);
						}

						if (def.hasIndex) {
							await activeCache.removeEntry(name, fromPath);
							if (docForIndex !== undefined) {
								await activeCache.upsertEntry(
									name,
									toPath,
									toParams,
									newRevision,
									docForIndex,
									def.companion ? (companionMoved ? "present" : "missing") : undefined,
								);
							}
							refreshConfirmedSnapshot(name, epoch);
						}

						lastError = null;
						logger.log({
							level: "info",
							event: "move",
							path: toPath,
							message: `Moved "${fromPath}" -> "${toPath}".`,
						});
						config.onMutationSettled?.({
							...context,
							status: "committed",
							revision: newRevision,
						});
						return { path: toPath, revision: newRevision };
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to move "${fromPath}" to "${toPath}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async delete(params, options) {
				assertWritable();
				const { backend: activeBackend, writeQueue: activeQueue, cacheEngine: activeCache } =
					assertMounted();
				const epoch = mountEpoch;
				const path = def.template.build(params);
				const context: MutationContext = {
					operation: "delete",
					collection: name,
					path,
				};
				const mutId = nextMutationId();
				pushPendingMutation({ id: mutId, kind: "delete", collection: name, path });

				const task = withActivity("writing", async (): Promise<void> => {
					try {
						const policy = options?.conflictPolicy ?? defaultConflictPolicy;
						const expectedRevision =
							policy === "last-write-wins"
								? undefined
								: (options?.expectedRevision ??
									trackedDocs.get(path)?.revision ??
									activeCache.getRevision(name, path));

						await activeQueue.delete(path, {
							expectedRevision,
							backup: options?.backup,
						});

						if (def.companion) {
							const companionPath = def.companion.template.build(params);
							if (await activeBackend.exists(companionPath)) {
								await activeQueue.delete(companionPath, {
									backup: options?.backup,
								});
							}
						}

						if (epoch !== mountEpoch) {
							return;
						}

						removeTrackedDoc(path, epoch);
						if (def.hasIndex) {
							await activeCache.removeEntry(name, path);
							refreshConfirmedSnapshot(name, epoch);
						}

						lastError = null;
						logger.log({
							level: "info",
							event: "delete",
							path,
							message: `Deleted "${path}".`,
						});
						config.onMutationSettled?.({ ...context, status: "committed" });
					} catch (error) {
						const fsError = handleInfrastructureError(
							error,
							`Failed to delete "${path}".`,
							context,
							epoch,
						);
						if (epoch === mountEpoch) {
							config.onMutationSettled?.({
								...context,
								status: fsError.code === "CONFLICT" ? "conflict" : "rolled-back",
								error: fsError,
							});
						}
						throw fsError;
					} finally {
						if (epoch === mountEpoch) {
							removePendingMutation(mutId);
						}
					}
				});

				trackMutationPromise(task);
				return task;
			},

			async exists(params) {
				const { backend: activeBackend } = assertMounted();
				const path = def.template.build(params);
				return activeBackend.exists(path);
			},

			async list(filter) {
				const { backend: activeBackend } = assertMounted();
				const files = await activeBackend.walkFiles("", {
					systemDir,
					shouldIgnore: (relativePath) => isIgnoredPath(relativePath, systemDir, config.ignore),
				});
				const items: CollectionListItem<Record<string, string>>[] = [];
				for (const stat of files) {
					if (isIgnoredPath(stat.path, systemDir, config.ignore)) {
						continue;
					}
					const parsed = def.template.parse(stat.path);
					if (!parsed) {
						continue;
					}
					const item: CollectionListItem<Record<string, string>> = {
						path: stat.path,
						params: parsed,
						size: stat.size,
						lastModified: stat.lastModified,
					};
					if (typeof filter === "function") {
						if (!filter(item)) {
							continue;
						}
					} else if (filter) {
						if (!matchesParamsFilter(item.params, filter.params)) {
							continue;
						}
						if (filter.where && !filter.where(item)) {
							continue;
						}
					}
					items.push(item);
				}
				return items.toSorted((a, b) => a.path.localeCompare(b.path));
			},
		};

		if (!def.hasIndex || !def.index) {
			return baseHandle;
		}

		const effectiveEntries = $derived.by(() =>
			applyPendingMutations(
				confirmedEntries[name] ?? [],
				pendingMutations,
				name,
			),
		);

		const indexedPart: IndexedCollectionHandle<unknown, Record<string, string>> = {
			get entries() {
				return effectiveEntries;
			},

			query(filter) {
				const list = effectiveEntries;
				if (!filter) {
					return [...list];
				}
				if (typeof filter === "function") {
					return list.filter((entry) => filter(entry));
				}
				return list.filter((entry) => {
					if (!matchesParamsFilter(entry.params, filter.params)) {
						return false;
					}
					if (filter.where && !filter.where(entry)) {
						return false;
					}
					return true;
				});
			},

			loadedPartitions() {
				return cacheEngine ? cacheEngine.loadedPartitions(name) : [];
			},

			unloadedPartitions() {
				return cacheEngine ? cacheEngine.unloadedPartitions(name) : [];
			},

			hasUnloadedPartitions() {
				return cacheEngine ? cacheEngine.hasUnloadedPartitions(name) : false;
			},

			async loadPartitions(keys) {
				const { cacheEngine: activeCache } = assertMounted();
				await activeCache.loadPartitions(name, keys);
				refreshConfirmedSnapshot(name);
			},

			async loadAllPartitions() {
				const { cacheEngine: activeCache } = assertMounted();
				await activeCache.loadAllPartitions(name);
				refreshConfirmedSnapshot(name);
			},
		};

		return Object.defineProperties(
			baseHandle,
			Object.getOwnPropertyDescriptors(indexedPart),
		) as CollectionHandle<unknown, unknown, Record<string, string>, boolean>;
	}

	const singletonHandles: Record<string, SingletonHandle<unknown>> = {};
	for (const [name, def] of Object.entries(singletonDefs)) {
		singletonHandles[name] = buildSingletonHandle(name, def);
	}

	const collectionHandles: Record<
		string,
		CollectionHandle<unknown, unknown, Record<string, string>, boolean>
	> = {};
	for (const [name, def] of Object.entries(collectionDefs)) {
		collectionHandles[name] = buildCollectionHandle(name, def);
	}

	// Browser lifecycle listeners: unload protection, background flush & throttled focus revalidation.
	const preventClose = config.preventCloseWhilePending ?? true;
	const onBeforeUnload = (event: BeforeUnloadEvent): void => {
		if (destroyed || !preventClose || pendingMutationCount === 0) {
			return;
		}
		event.preventDefault();
	};

	const flushBufferedCachesAndLogs = async (): Promise<void> => {
		if (destroyed || mountStatus !== "ready") {
			return;
		}
		await Promise.allSettled([cacheEngine?.flush(), logger.flush()]);
	};

	const onPageHide = (): void => {
		void flushBufferedCachesAndLogs().catch(() => {
			// Best-effort flush on page hide.
		});
	};

	const revalidateMinInterval =
		config.revalidateOnFocus === true
			? DEFAULT_REVALIDATE_INTERVAL_MS
			: typeof config.revalidateOnFocus === "object"
				? (config.revalidateOnFocus.minIntervalMs ?? DEFAULT_REVALIDATE_INTERVAL_MS)
				: null;

	const triggerFocusRevalidate = (): void => {
		if (destroyed || revalidateMinInterval === null) {
			return;
		}
		if (mountStatus !== "ready" || isBusy) {
			return;
		}
		const now = Date.now();
		if (now - lastRevalidateAt < revalidateMinInterval) {
			return;
		}
		lastRevalidateAt = now;
		void heal({ mode: "incremental" }).catch(() => {
			// Errors are already captured on `lastError` and `onMutationError`.
		});
	};

	const onVisibilityChange = (): void => {
		if (typeof document === "undefined") {
			return;
		}
		if (document.visibilityState === "hidden") {
			void flushBufferedCachesAndLogs().catch(() => {
				// Best-effort flush when tab is hidden.
			});
		} else if (document.visibilityState === "visible") {
			triggerFocusRevalidate();
		}
	};

	if (typeof window !== "undefined") {
		if (preventClose) {
			window.addEventListener("beforeunload", onBeforeUnload);
		}
		window.addEventListener("pagehide", onPageHide);
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", onVisibilityChange);
		}
		if (revalidateMinInterval !== null) {
			window.addEventListener("focus", triggerFocusRevalidate);
		}
	}

	function destroy(): void {
		if (destroyed) {
			return;
		}
		destroyed = true;
		mountEpoch += 1;
		activeAbortController?.abort();
		activeAbortController = null;
		cacheEngine?.destroy();
		logger.destroy();

		if (typeof window !== "undefined") {
			window.removeEventListener("beforeunload", onBeforeUnload);
			window.removeEventListener("pagehide", onPageHide);
			window.removeEventListener("focus", triggerFocusRevalidate);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", onVisibilityChange);
			}
		}
	}

	return {
		namespace,
		systemDir,
		support,
		get mountStatus() {
			return mountStatus;
		},
		get activity() {
			return activity;
		},
		get isBusy() {
			return isBusy;
		},
		get pendingMutationCount() {
			return pendingMutationCount;
		},
		get unresolvedConflicts() {
			return unresolvedConflicts;
		},
		get unresolvedConflictCount() {
			return unresolvedConflictCount;
		},
		get corruptEntries() {
			return corruptEntries;
		},
		get health() {
			return health;
		},
		get lastError() {
			return lastError;
		},
		get syncProgress() {
			return syncProgress;
		},
		singletons: singletonHandles as SingletonHandleMap<TSingletons>,
		collections: collectionHandles as CollectionHandleMap<TCollections>,
		restore,
		pick,
		requestAccess,
		forget,
		flush,
		destroy,
		clearError() {
			lastError = null;
		},
		heal,
		resolveConflict,
		readLogs(options?: ReadLogsOptions) {
			return logger.readLogs(options);
		},
		getEmergencyLogs() {
			return getEmergencyLogsInternal(namespace);
		},
		clearEmergencyLogs() {
			clearEmergencyLogsInternal(namespace);
		},
	};
}
