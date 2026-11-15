import type { FileAdapter } from "./adapters.ts";
import { FsError, isFsError, type FsErrorCode } from "./errors.ts";
import type { FileRevision, FileStat, FsBackend } from "./fs-backend.internal.ts";
import type { FsLogger } from "./logger.internal.ts";
import {
	DEFAULT_SYSTEM_DIR,
	isIgnoredPath,
	validatePathSegment,
	type PathIgnoreRule,
	type PathTemplate,
} from "./path-template.ts";
import type { WriteQueue } from "./write-queue.internal.ts";

export const CACHE_FORMAT_VERSION = 1;
export const DEFAULT_INDEX_FLUSH_MS = 250;
export const DEFAULT_MAX_FLUSH_WAIT_MS = 2000;
export const DEFAULT_BOOT_CONCURRENCY = 6;
export const DEFAULT_HEAL_YIELD_EVERY = 50;

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

export interface CacheEngineOptions {
	backend: FsBackend;
	writeQueue: WriteQueue;
	collections: readonly CacheCollectionConfig<unknown, unknown>[];
	systemDir?: string;
	ignore?: readonly PathIgnoreRule[];
	bootCheck?: BootCheckMode;
	bootConcurrency?: number;
	indexFlushMs?: number;
	maxFlushWaitMs?: number;
	logger?: FsLogger;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function createEmptyMeta(): WorkspaceMetaFile {
	return {
		formatVersion: CACHE_FORMAT_VERSION,
		lastHealAt: null,
		collections: {},
	};
}

function createEmptyManifest(): MetaCollectionManifest {
	return {
		partitions: {},
		pathToPartition: {},
		revisions: {},
	};
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileRevision(value: unknown): value is FileRevision {
	if (!isPlainRecord(value)) return false;
	return typeof value.size === "number" && typeof value.lastModified === "number";
}

function parseMetaFile(rawText: string): WorkspaceMetaFile | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawText);
	} catch {
		return null;
	}
	if (!isPlainRecord(parsed) || parsed.formatVersion !== CACHE_FORMAT_VERSION) {
		return null;
	}
	if (parsed.lastHealAt !== null && typeof parsed.lastHealAt !== "string") {
		return null;
	}
	if (!isPlainRecord(parsed.collections)) {
		return null;
	}

	const collections: Record<string, MetaCollectionManifest> = {};
	for (const [colName, colValue] of Object.entries(parsed.collections)) {
		if (!isPlainRecord(colValue)) return null;
		if (
			!isPlainRecord(colValue.partitions) ||
			!isPlainRecord(colValue.pathToPartition) ||
			!isPlainRecord(colValue.revisions)
		) {
			return null;
		}

		const partitions: Record<string, MetaPartitionInfo> = {};
		for (const [pKey, pInfo] of Object.entries(colValue.partitions)) {
			if (
				!isPlainRecord(pInfo) ||
				typeof pInfo.count !== "number" ||
				typeof pInfo.updatedAt !== "string"
			) {
				return null;
			}
			partitions[pKey] = { count: pInfo.count, updatedAt: pInfo.updatedAt };
		}

		const pathToPartition: Record<string, string> = {};
		for (const [path, pKey] of Object.entries(colValue.pathToPartition)) {
			if (typeof pKey !== "string") return null;
			pathToPartition[path] = pKey;
		}

		const revisions: Record<string, FileRevision> = {};
		for (const [path, rev] of Object.entries(colValue.revisions)) {
			if (!isFileRevision(rev)) return null;
			revisions[path] = rev;
		}

		collections[colName] = { partitions, pathToPartition, revisions };
	}

	return {
		formatVersion: CACHE_FORMAT_VERSION,
		lastHealAt: parsed.lastHealAt,
		collections,
	};
}

const COMPANION_STATUSES = new Set<string>(["present", "missing", "orphaned"]);

function parseShardEntries(rawText: string): CachedIndexEntry[] | null {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawText);
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) {
		return null;
	}
	const entries: CachedIndexEntry[] = [];
	for (const item of parsed) {
		if (!isPlainRecord(item)) return null;
		if (
			typeof item.path !== "string" ||
			!isPlainRecord(item.params) ||
			!isFileRevision(item.revision)
		) {
			return null;
		}
		const params: Record<string, string> = {};
		for (const [k, v] of Object.entries(item.params)) {
			if (typeof v !== "string") return null;
			params[k] = v;
		}
		const entry: CachedIndexEntry = {
			path: item.path,
			params,
			revision: item.revision,
			data: item.data,
		};
		if (typeof item.companionStatus === "string" && COMPANION_STATUSES.has(item.companionStatus)) {
			entry.companionStatus = item.companionStatus as CompanionStatus;
		}
		entries.push(entry);
	}
	return entries;
}

function validatePartitionKey(partitionKey: string): string {
	const validation = validatePathSegment(partitionKey, { maxSegmentLength: 180 });
	if (!validation.valid) {
		throw new FsError(
			"INVALID_PATH",
			`Invalid partition key "${partitionKey}": ${validation.reasons.join(", ")}.`,
			{ details: { partitionKey, reasons: validation.reasons } },
		);
	}
	return partitionKey;
}

function isMissingOrCorruptCacheError(error: unknown): boolean {
	if (error instanceof SyntaxError) return true;
	return isFsError(error) && (error.code === "NOT_FOUND" || error.code === "CORRUPT_DATA");
}

async function waitForSettled(promise: Promise<unknown>): Promise<void> {
	try {
		await promise;
	} catch {
		// Caller awaits only for completion; errors are handled by the original owner.
	}
}

function checkAborted(signal: AbortSignal | undefined, context: string): void {
	if (signal?.aborted) {
		throw new FsError("ABORTED", `Operation aborted during ${context}.`, {
			cause: signal.reason,
		});
	}
}

function yieldToEventLoop(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

async function runWithConcurrency<T>(
	items: readonly T[],
	concurrency: number,
	worker: (item: T) => Promise<void>,
): Promise<void> {
	if (items.length === 0) return;
	const limit = Math.max(1, Math.min(concurrency, items.length));
	let nextIndex = 0;

	const runners = Array.from({ length: limit }, async () => {
		while (nextIndex < items.length) {
			const current = items[nextIndex];
			nextIndex += 1;
			if (current !== undefined) {
				await worker(current);
			}
		}
	});

	await Promise.all(runners);
}

export class CacheEngine {
	readonly #backend: FsBackend;
	readonly #writeQueue: WriteQueue;
	readonly #systemDir: string;
	readonly #metaPath: string;
	readonly #indexDir: string;
	readonly #ignore: readonly PathIgnoreRule[] | undefined;
	readonly #bootCheck: BootCheckMode;
	readonly #bootConcurrency: number;
	readonly #indexFlushMs: number;
	readonly #maxFlushWaitMs: number;
	readonly #logger?: FsLogger;

	readonly #collections = new Map<string, CacheCollectionConfig<unknown, unknown>>();
	readonly #shards = new Map<string, Map<string, Map<string, CachedIndexEntry>>>();
	readonly #dirtyShards = new Map<string, Set<string>>();
	readonly #shardGenerations = new Map<string, Map<string, number>>();
	readonly #corruptShards = new Map<string, Set<string>>();

	#meta: WorkspaceMetaFile = createEmptyMeta();
	#metaDirty = false;
	#metaGeneration = 0;
	#corruptEntries: CorruptEntry[] = [];

	#debounceTimer: ReturnType<typeof setTimeout> | undefined;
	#maxWaitTimer: ReturnType<typeof setTimeout> | undefined;
	#activeFlush: Promise<void> | null = null;
	#activeHeal: Promise<HealReport> | null = null;
	#isHealing = false;
	#healMode: HealMode | null = null;
	#destroyed = false;

	constructor(options: CacheEngineOptions) {
		this.#backend = options.backend;
		this.#writeQueue = options.writeQueue;
		this.#systemDir = options.systemDir ?? DEFAULT_SYSTEM_DIR;
		this.#metaPath = `${this.#systemDir}/meta.json`;
		this.#indexDir = `${this.#systemDir}/index`;
		this.#ignore = options.ignore;
		this.#bootCheck = options.bootCheck ?? "metadata-scan";
		this.#bootConcurrency = Math.max(1, options.bootConcurrency ?? DEFAULT_BOOT_CONCURRENCY);
		this.#indexFlushMs = Math.max(0, options.indexFlushMs ?? DEFAULT_INDEX_FLUSH_MS);
		this.#maxFlushWaitMs = Math.max(
			this.#indexFlushMs,
			options.maxFlushWaitMs ?? DEFAULT_MAX_FLUSH_WAIT_MS,
		);
		this.#logger = options.logger;

		for (const col of options.collections) {
			if (this.#collections.has(col.name)) {
				throw new FsError("INVALID_CONFIG", `Duplicate collection name "${col.name}".`, {
					details: { collection: col.name },
				});
			}
			this.#collections.set(col.name, col);
			if (col.index) {
				this.#shards.set(col.name, new Map());
				this.#dirtyShards.set(col.name, new Set());
				this.#corruptShards.set(col.name, new Set());
				this.#meta.collections[col.name] = createEmptyManifest();
			}
		}
	}

	get meta(): WorkspaceMetaFile {
		return this.#meta;
	}

	getCorruptEntries(): CorruptEntry[] {
		return [...this.#corruptEntries];
	}

	loadedPartitions(collectionName: string): string[] {
		const colShards = this.#shards.get(collectionName);
		if (!colShards) return [];
		return colShards
			.keys()
			.toArray()
			.toSorted((a, b) => a.localeCompare(b));
	}

	unloadedPartitions(collectionName: string): string[] {
		const manifest = this.#meta.collections[collectionName];
		const colShards = this.#shards.get(collectionName);
		if (!manifest || !colShards) return [];
		return Object.keys(manifest.partitions)
			.filter((key) => !colShards.has(key))
			.toSorted((a, b) => a.localeCompare(b));
	}

	hasUnloadedPartitions(collectionName: string): boolean {
		return this.unloadedPartitions(collectionName).length > 0;
	}

	getEntries<TProjected = unknown>(collectionName: string): CachedIndexEntry<TProjected>[] {
		const colShards = this.#shards.get(collectionName);
		if (!colShards) return [];
		const result: CachedIndexEntry<TProjected>[] = [];
		for (const shardMap of colShards.values()) {
			for (const entry of shardMap.values()) {
				result.push(entry as CachedIndexEntry<TProjected>);
			}
		}
		return result;
	}

	getEntry<TProjected = unknown>(
		collectionName: string,
		path: string,
	): CachedIndexEntry<TProjected> | undefined {
		const manifest = this.#meta.collections[collectionName];
		const colShards = this.#shards.get(collectionName);
		if (!manifest || !colShards) return undefined;
		const partitionKey = manifest.pathToPartition[path];
		if (partitionKey === undefined) return undefined;
		return colShards.get(partitionKey)?.get(path) as CachedIndexEntry<TProjected> | undefined;
	}

	getRevision(collectionName: string, path: string): FileRevision | undefined {
		return this.#meta.collections[collectionName]?.revisions[path];
	}

	async loadPartitions(collectionName: string, keys: readonly string[]): Promise<void> {
		const col = this.#requireIndexedCollection(collectionName);
		const colShards = this.#shards.get(col.name);
		if (!colShards) return;
		const manifest = this.#ensureManifest(col.name);

		for (const rawKey of keys) {
			const key = validatePartitionKey(rawKey);
			if (colShards.has(key)) continue;
			if (!Object.prototype.hasOwnProperty.call(manifest.partitions, key)) continue;
			await this.#loadShardFromDisk(col.name, key);
		}
	}

	async loadAllPartitions(collectionName: string): Promise<void> {
		const unloaded = this.unloadedPartitions(collectionName);
		if (unloaded.length === 0) return;
		await this.loadPartitions(collectionName, unloaded);
	}

	async upsertEntry(
		collectionName: string,
		path: string,
		params: Record<string, string>,
		revision: FileRevision,
		doc: unknown,
		companionStatus?: CompanionStatus,
	): Promise<void> {
		const col = this.#collections.get(collectionName);
		if (!col?.index) return;

		const manifest = this.#ensureManifest(collectionName);
		const colShards = this.#shards.get(collectionName);
		if (!colShards) return;

		const rawPartitionKey = col.index.partitionBy ? col.index.partitionBy(params, doc) : "default";
		const newPartitionKey = validatePartitionKey(rawPartitionKey);
		const projected = col.index.project ? col.index.project(doc, params) : doc;

		const oldPartitionKey = manifest.pathToPartition[path];
		if (oldPartitionKey !== undefined && oldPartitionKey !== newPartitionKey) {
			await this.#removeFromShard(collectionName, oldPartitionKey, path);
		}

		await this.#ensureShardLoaded(collectionName, newPartitionKey);
		const targetShard = colShards.get(newPartitionKey);
		if (targetShard) {
			const entry: CachedIndexEntry = {
				path,
				params,
				revision,
				data: projected,
			};
			if (companionStatus !== undefined) {
				entry.companionStatus = companionStatus;
			}
			targetShard.set(path, entry);
			this.#updatePartitionManifest(manifest, newPartitionKey, targetShard.size);
		}

		manifest.pathToPartition[path] = newPartitionKey;
		manifest.revisions[path] = revision;
		this.#markShardDirty(collectionName, newPartitionKey);
		this.#markMetaDirty();
		this.#clearCorruptPath(collectionName, path);
		this.#scheduleFlush();
	}

	async removeEntry(collectionName: string, path: string): Promise<void> {
		const col = this.#collections.get(collectionName);
		if (!col?.index) return;

		const manifest = this.#ensureManifest(collectionName);
		const oldPartitionKey = manifest.pathToPartition[path];
		if (oldPartitionKey !== undefined) {
			await this.#removeFromShard(collectionName, oldPartitionKey, path);
		}

		delete manifest.pathToPartition[path];
		delete manifest.revisions[path];
		this.#markMetaDirty();
		this.#clearCorruptPath(collectionName, path);
		this.#scheduleFlush();
	}

	async boot(options?: {
		signal?: AbortSignal;
		onProgress?: (progress: SyncProgress) => void;
	}): Promise<BootResult> {
		if (this.#bootCheck === "none") {
			return { healed: false, report: null };
		}

		const metaLoaded = await this.#loadMetaFromDisk();
		let anyShardCorrupt = false;

		for (const col of this.#collections.values()) {
			if (!col.index) continue;
			const manifest = this.#ensureManifest(col.name);
			const eagerPredicate = col.index.eagerPartitions ?? (() => true);
			const eagerKeys = Object.keys(manifest.partitions).filter((key) => eagerPredicate(key));
			for (const key of eagerKeys) {
				const ok = await this.#loadShardFromDisk(col.name, key);
				if (!ok) {
					anyShardCorrupt = true;
				}
			}
		}

		if (this.#bootCheck === "cache-only") {
			return { healed: false, report: null };
		}

		if (!metaLoaded || anyShardCorrupt) {
			const report = await this.heal({
				mode: "incremental",
				signal: options?.signal,
				onProgress: options?.onProgress,
			});
			return { healed: true, report };
		}

		const hasDrift = await this.#detectMetadataDrift(options?.signal);
		if (!hasDrift) {
			return { healed: false, report: null };
		}

		const report = await this.heal({
			mode: "incremental",
			signal: options?.signal,
			onProgress: options?.onProgress,
		});
		return { healed: true, report };
	}

	async heal(options?: HealOptions): Promise<HealReport> {
		const mode: HealMode = options?.mode ?? "incremental";
		const yieldEvery = Math.max(1, options?.yieldEvery ?? DEFAULT_HEAL_YIELD_EVERY);
		const startedAt = performance.now();

		this.#clearFlushTimers();
		while (this.#activeHeal) {
			await waitForSettled(this.#activeHeal);
		}
		while (this.#activeFlush) {
			await waitForSettled(this.#activeFlush);
		}

		const run = async (): Promise<HealReport> => {
			this.#isHealing = true;
			this.#healMode = mode;
			try {
				return await this.#writeQueue.withGlobalBarrier(async () => {
					checkAborted(options?.signal, "heal");

					const diskFiles = await this.#backend.walkFiles("", {
						systemDir: this.#systemDir,
						shouldIgnore: (relativePath) =>
							isIgnoredPath(relativePath, this.#systemDir, this.#ignore),
						signal: options?.signal,
					});

					options?.onProgress?.({
						phase: "scanning",
						processed: 0,
						total: diskFiles.length,
					});

					const diskFileMap = new Map<string, FileStat>();
					for (const stat of diskFiles) {
						diskFileMap.set(stat.path, stat);
					}

					// In full mode, reset all in-memory shards & manifests before rebuilding.
					if (mode === "full") {
						this.#resetAllIndexedState();
						await this.#collectDiskShardsIntoDirty();
					}

			const seenByCollection = new Map<string, Set<string>>();
			const companionPathsByCollection = new Map<string, Set<string>>();
			for (const col of this.#collections.values()) {
				seenByCollection.set(col.name, new Set());
				companionPathsByCollection.set(col.name, new Set());
			}

			// Classify disk files into primary collection files and companion files.
			const matchedPrimary: Array<{
				collection: CacheCollectionConfig<unknown, unknown>;
				stat: FileStat;
				params: Record<string, string>;
			}> = [];

			for (const stat of diskFiles) {
				const match = this.#classifyDiskFile(stat);
				if (!match) continue;
				if (match.kind === "primary") {
					matchedPrimary.push({
						collection: match.collection,
						stat,
						params: match.params,
					});
					seenByCollection.get(match.collection.name)?.add(stat.path);
				} else {
					companionPathsByCollection.get(match.collection.name)?.add(stat.path);
				}
			}

			let added = 0;
			let updated = 0;
			let unchanged = 0;
			let removed = 0;
			const failures: CorruptEntry[] = [];
			const orphanedCompanions: Array<{ collection: string; path: string }> = [];

			// Detect orphaned companion files (companion exists without matching primary record).
			for (const col of this.#collections.values()) {
				if (!col.index || !col.companion) continue;
				const companionSet = companionPathsByCollection.get(col.name);
				if (!companionSet) continue;
				orphanedCompanions.push(
					...this.#findOrphanedCompanions(col, companionSet, diskFileMap),
				);
			}

			// Process matched primary files.
			for (const [index, item] of matchedPrimary.entries()) {
				checkAborted(options?.signal, "heal");

				const { collection: col, stat, params } = item;
				const manifest = this.#ensureManifest(col.name);
				const colShards = this.#shards.get(col.name);
				const corruptShardSet = this.#corruptShards.get(col.name);

				const expectedCompanionStatus: CompanionStatus | undefined = col.companion
					? diskFileMap.has(col.companion.template.build(params))
						? "present"
						: "missing"
					: undefined;

				const prevRev = manifest.revisions[stat.path];
				const prevPartition = manifest.pathToPartition[stat.path];
				const isShardCorrupt =
					prevPartition !== undefined && (corruptShardSet?.has(prevPartition) ?? false);

				const isUnchanged =
					mode === "incremental" &&
					prevRev !== undefined &&
					prevPartition !== undefined &&
					!isShardCorrupt &&
					prevRev.size === stat.size &&
					prevRev.lastModified === stat.lastModified;

				if (isUnchanged) {
					await this.#ensureShardLoaded(col.name, prevPartition);
					const existingEntry = colShards?.get(prevPartition)?.get(stat.path);
					if (existingEntry) {
						if (
							expectedCompanionStatus !== undefined &&
							existingEntry.companionStatus !== expectedCompanionStatus
						) {
							existingEntry.companionStatus = expectedCompanionStatus;
							this.#markShardDirty(col.name, prevPartition);
						}
						unchanged += 1;
					} else {
						// Shard was missing/empty on disk even though meta had revision; re-parse below.
						const parsedOk = await this.#indexFileFromDisk(
							col,
							stat,
							params,
							expectedCompanionStatus,
							failures,
						);
						if (parsedOk) {
							updated += 1;
						}
					}
				} else {
					const parsedOk = await this.#indexFileFromDisk(
						col,
						stat,
						params,
						expectedCompanionStatus,
						failures,
					);
					if (parsedOk) {
						if (prevRev === undefined) {
							added += 1;
						} else {
							updated += 1;
						}
					} else if (prevRev !== undefined) {
						// Remove stale cached entry for newly-corrupted file.
						await this.#removeEntryImmediate(col.name, stat.path);
					}
				}

				options?.onProgress?.({
					phase: "indexing",
					processed: index + 1,
					total: matchedPrimary.length,
					currentPath: stat.path,
				});

				if ((index + 1) % yieldEvery === 0) {
					await yieldToEventLoop();
				}
			}

			// Reconcile deleted / moved-away entries.
			for (const col of this.#collections.values()) {
				if (!col.index) continue;
				const manifest = this.#ensureManifest(col.name);
				const seen = seenByCollection.get(col.name) ?? new Set<string>();
				const stalePaths = Object.keys(manifest.pathToPartition).filter((p) => !seen.has(p));
				for (const stalePath of stalePaths) {
					await this.#removeEntryImmediate(col.name, stalePath);
					removed += 1;
				}
				corruptShardSetClear(this.#corruptShards.get(col.name));
			}

			this.#corruptEntries = failures;
			this.#meta.lastHealAt = new Date().toISOString();
			this.#markMetaDirty();

			options?.onProgress?.({
				phase: "flushing",
				processed: matchedPrimary.length,
				total: matchedPrimary.length,
			});

			await this.#flushToDisk(true);

			const durationMs = Math.round(performance.now() - startedAt);
			const report: HealReport = {
				mode,
				added,
				updated,
				removed,
				unchanged,
				failures,
				orphanedCompanions,
				durationMs,
			};

			this.#logger?.log({
				level: failures.length > 0 ? "warn" : "info",
				event: "heal",
				durationMs,
				message: `Heal (${mode}) completed: +${added} ~${updated} -${removed} =${unchanged}, failures=${failures.length}.`,
				meta: {
					mode,
					added,
					updated,
					removed,
					unchanged,
					failureCount: failures.length,
					orphanedCompanionCount: orphanedCompanions.length,
				},
			});

			return report;
				});
			} finally {
				this.#isHealing = false;
				this.#healMode = null;
				this.#activeHeal = null;
			}
		};

		const promise = run();
		this.#activeHeal = promise;
		return promise;
	}

	async flush(): Promise<void> {
		this.#clearFlushTimers();
		while (this.#activeHeal || this.#activeFlush) {
			if (this.#activeHeal) {
				await waitForSettled(this.#activeHeal);
			}
			if (this.#activeFlush) {
				await waitForSettled(this.#activeFlush);
			}
		}
		if (!this.#hasDirtyState()) {
			return;
		}

		const run = async (): Promise<void> => {
			try {
				while (this.#hasDirtyState()) {
					await this.#flushToDisk(false);
				}
			} finally {
				this.#activeFlush = null;
			}
		};

		this.#activeFlush = run();
		await this.#activeFlush;
	}

	destroy(): void {
		this.#destroyed = true;
		this.#clearFlushTimers();
	}

	#requireIndexedCollection(name: string): CacheCollectionConfig<unknown, unknown> {
		const col = this.#collections.get(name);
		if (!col?.index) {
			throw new FsError("INVALID_CONFIG", `Collection "${name}" is not indexed.`, {
				details: { collection: name },
			});
		}
		return col;
	}

	#ensureManifest(collectionName: string): MetaCollectionManifest {
		let manifest = this.#meta.collections[collectionName];
		if (!manifest) {
			manifest = createEmptyManifest();
			this.#meta.collections[collectionName] = manifest;
		}
		return manifest;
	}

	#shardPath(collectionName: string, partitionKey: string): string {
		return `${this.#indexDir}/${collectionName}/${partitionKey}.json`;
	}

	#markMetaDirty(): void {
		this.#metaDirty = true;
		this.#metaGeneration += 1;
	}

	#getShardGeneration(collectionName: string, partitionKey: string): number {
		return this.#shardGenerations.get(collectionName)?.get(partitionKey) ?? 0;
	}

	#bumpShardGeneration(collectionName: string, partitionKey: string): void {
		let colMap = this.#shardGenerations.get(collectionName);
		if (!colMap) {
			colMap = new Map();
			this.#shardGenerations.set(collectionName, colMap);
		}
		colMap.set(partitionKey, (colMap.get(partitionKey) ?? 0) + 1);
	}

	#markShardDirty(collectionName: string, partitionKey: string): void {
		let set = this.#dirtyShards.get(collectionName);
		if (!set) {
			set = new Set();
			this.#dirtyShards.set(collectionName, set);
		}
		set.add(partitionKey);
		this.#bumpShardGeneration(collectionName, partitionKey);
	}

	#updatePartitionManifest(
		manifest: MetaCollectionManifest,
		partitionKey: string,
		count: number,
	): void {
		if (count <= 0) {
			delete manifest.partitions[partitionKey];
		} else {
			manifest.partitions[partitionKey] = {
				count,
				updatedAt: new Date().toISOString(),
			};
		}
	}

	#clearCorruptPath(collectionName: string, path: string): void {
		if (this.#corruptEntries.length === 0) return;
		this.#corruptEntries = this.#corruptEntries.filter(
			(entry) => !(entry.collection === collectionName && entry.path === path),
		);
	}

	#resetAllIndexedState(): void {
		const prevCollections = this.#meta.collections;
		this.#meta = createEmptyMeta();
		for (const col of this.#collections.values()) {
			if (!col.index) continue;
			const dirtyKeys = new Set<string>();
			const prevManifest = prevCollections[col.name];
			if (prevManifest) {
				for (const key of Object.keys(prevManifest.partitions)) {
					dirtyKeys.add(key);
				}
			}
			const prevColShards = this.#shards.get(col.name);
			if (prevColShards) {
				for (const key of prevColShards.keys()) {
					dirtyKeys.add(key);
				}
			}
			this.#meta.collections[col.name] = createEmptyManifest();
			this.#shards.set(col.name, new Map());
			// Seed dirty with previous shard keys so stale/empty shards on disk are pruned.
			this.#dirtyShards.set(col.name, new Set());
			for (const key of dirtyKeys) {
				this.#markShardDirty(col.name, key);
			}
			this.#corruptShards.set(col.name, new Set());
		}
		this.#markMetaDirty();
	}

	async #collectDiskShardsIntoDirty(): Promise<void> {
		for (const col of this.#collections.values()) {
			if (!col.index) continue;
			await this.#collectCollectionDiskShardsIntoDirty(col.name);
		}
	}

	async #collectCollectionDiskShardsIntoDirty(collectionName: string): Promise<void> {
		const colIndexDir = `${this.#indexDir}/${collectionName}`;
		let entries;
		try {
			entries = await this.#backend.listDir(colIndexDir);
		} catch (error) {
			if (isFsError(error) && error.code === "NOT_FOUND") {
				return;
			}
			throw error;
		}
		for (const entry of entries) {
			if (entry.kind !== "file" || !entry.name.endsWith(".json")) continue;
			const partitionKey = entry.name.slice(0, -".json".length);
			if (!partitionKey) continue;
			this.#markShardDirty(collectionName, partitionKey);
		}
	}

	async #ensureShardLoaded(collectionName: string, partitionKey: string): Promise<void> {
		const colShards = this.#shards.get(collectionName);
		if (!colShards) return;
		if (colShards.has(partitionKey)) return;
		if (this.#healMode === "full") {
			colShards.set(partitionKey, new Map());
			return;
		}
		await this.#loadShardFromDisk(collectionName, partitionKey);
	}

	async #removeFromShard(
		collectionName: string,
		partitionKey: string,
		path: string,
	): Promise<void> {
		await this.#ensureShardLoaded(collectionName, partitionKey);
		const colShards = this.#shards.get(collectionName);
		const manifest = this.#ensureManifest(collectionName);
		const shard = colShards?.get(partitionKey);
		if (!shard) return;

		if (shard.delete(path)) {
			this.#updatePartitionManifest(manifest, partitionKey, shard.size);
			this.#markShardDirty(collectionName, partitionKey);
		}
	}

	async #removeEntryImmediate(collectionName: string, path: string): Promise<void> {
		const manifest = this.#ensureManifest(collectionName);
		const oldPartitionKey = manifest.pathToPartition[path];
		if (oldPartitionKey !== undefined) {
			await this.#removeFromShard(collectionName, oldPartitionKey, path);
		}
		delete manifest.pathToPartition[path];
		delete manifest.revisions[path];
		this.#markMetaDirty();
	}

	async #indexFileFromDisk(
		col: CacheCollectionConfig<unknown, unknown>,
		stat: FileStat,
		params: Record<string, string>,
		companionStatus: CompanionStatus | undefined,
		failures: CorruptEntry[],
	): Promise<boolean> {
		if (!col.index) return false;
		try {
			const file = await this.#backend.readFile(stat.path);
			const decoded = await col.adapter.decode({
				path: stat.path,
				file,
				readBytes: async () => new Uint8Array(await file.arrayBuffer()),
				readText: () => file.text(),
			});
			const revision: FileRevision = { size: stat.size, lastModified: stat.lastModified };
			const rawPartitionKey = col.index.partitionBy
				? col.index.partitionBy(params, decoded.data)
				: "default";
			const newPartitionKey = validatePartitionKey(rawPartitionKey);
			const projected = col.index.project
				? col.index.project(decoded.data, params)
				: decoded.data;

			const manifest = this.#ensureManifest(col.name);
			const oldPartitionKey = manifest.pathToPartition[stat.path];
			if (oldPartitionKey !== undefined && oldPartitionKey !== newPartitionKey) {
				await this.#removeFromShard(col.name, oldPartitionKey, stat.path);
			}

			await this.#ensureShardLoaded(col.name, newPartitionKey);
			const shard = this.#shards.get(col.name)?.get(newPartitionKey);
			if (shard) {
				const entry: CachedIndexEntry = {
					path: stat.path,
					params,
					revision,
					data: projected,
				};
				if (companionStatus !== undefined) {
					entry.companionStatus = companionStatus;
				}
				shard.set(stat.path, entry);
				this.#updatePartitionManifest(manifest, newPartitionKey, shard.size);
			}

			manifest.pathToPartition[stat.path] = newPartitionKey;
			manifest.revisions[stat.path] = revision;
			this.#markShardDirty(col.name, newPartitionKey);
			this.#markMetaDirty();
			return true;
		} catch (error) {
			const code: FsErrorCode = isFsError(error) ? error.code : "CORRUPT_DATA";
			const message =
				error instanceof Error ? error.message : `Failed to decode "${stat.path}".`;
			failures.push({
				collection: col.name,
				path: stat.path,
				code,
				message,
				cause: error,
			});
			return false;
		}
	}

	async #loadMetaFromDisk(): Promise<boolean> {
		try {
			const { bytes } = await this.#backend.readBytes(this.#metaPath);
			const parsed = parseMetaFile(textDecoder.decode(bytes));
			if (!parsed) {
				this.#meta = createEmptyMeta();
				for (const col of this.#collections.values()) {
					if (col.index) {
						this.#meta.collections[col.name] = createEmptyManifest();
					}
				}
				return false;
			}
			this.#meta = parsed;
			for (const col of this.#collections.values()) {
				if (col.index && !this.#meta.collections[col.name]) {
					this.#meta.collections[col.name] = createEmptyManifest();
				}
			}
			return true;
		} catch (error) {
			if (isMissingOrCorruptCacheError(error)) {
				return false;
			}
			throw error;
		}
	}

	async #loadShardFromDisk(collectionName: string, partitionKey: string): Promise<boolean> {
		const colShards = this.#shards.get(collectionName);
		if (!colShards) return true;

		const shardMap = new Map<string, CachedIndexEntry>();
		colShards.set(partitionKey, shardMap);

		const shardPath = this.#shardPath(collectionName, partitionKey);
		try {
			const { bytes } = await this.#backend.readBytes(shardPath);
			const parsed = parseShardEntries(textDecoder.decode(bytes));
			if (!parsed) {
				this.#corruptShards.get(collectionName)?.add(partitionKey);
				return false;
			}
			for (const entry of parsed) {
				shardMap.set(entry.path, entry);
			}
			return true;
		} catch (error) {
			if (isMissingOrCorruptCacheError(error)) {
				this.#corruptShards.get(collectionName)?.add(partitionKey);
				return false;
			}
			colShards.delete(partitionKey);
			throw error;
		}
	}

	async #detectMetadataDrift(signal: AbortSignal | undefined): Promise<boolean> {
		const diskFiles = await this.#backend.walkFiles("", {
			systemDir: this.#systemDir,
			shouldIgnore: (relativePath) =>
				isIgnoredPath(relativePath, this.#systemDir, this.#ignore),
			signal,
		});

		const matchedByCollection = new Map<string, Map<string, FileStat>>();
		for (const col of this.#collections.values()) {
			if (col.index) {
				matchedByCollection.set(col.name, new Map());
			}
		}

		const diskPathSet = new Set<string>();
		for (const stat of diskFiles) {
			diskPathSet.add(stat.path);
			const matchedCol = this.#findMatchingIndexedCollection(stat.path);
			if (matchedCol) {
				matchedByCollection.get(matchedCol.name)?.set(stat.path, stat);
			}
		}

		let driftDetected = false;

		for (const col of this.#collections.values()) {
			if (!col.index) continue;
			const manifest = this.#ensureManifest(col.name);
			const diskMap = matchedByCollection.get(col.name) ?? new Map<string, FileStat>();
			const cachedPaths = Object.keys(manifest.revisions);

			if (diskMap.size !== cachedPaths.length) {
				return true;
			}

			const entries = diskMap.entries().toArray();
			await runWithConcurrency(entries, this.#bootConcurrency, async ([path, stat]) => {
				if (driftDetected) return;
				checkAborted(signal, "metadata-scan");
				const cached = manifest.revisions[path];
				if (
					!cached ||
					cached.size !== stat.size ||
					cached.lastModified !== stat.lastModified
				) {
					driftDetected = true;
					return;
				}
				if (col.companion) {
					const loadedEntry = this.getEntry(col.name, path);
					if (loadedEntry) {
						const expectedCompanionPath = col.companion.template.build(loadedEntry.params);
						const expectedStatus: CompanionStatus = diskPathSet.has(expectedCompanionPath)
							? "present"
							: "missing";
						if (loadedEntry.companionStatus !== expectedStatus) {
							driftDetected = true;
						}
					}
				}
			});

			if (driftDetected) {
				return true;
			}
		}

		return false;
	}

	#classifyDiskFile(
		stat: FileStat,
	):
		| { kind: "primary"; collection: CacheCollectionConfig<unknown, unknown>; params: Record<string, string> }
		| { kind: "companion"; collection: CacheCollectionConfig<unknown, unknown> }
		| null {
		for (const col of this.#collections.values()) {
			if (!col.index) continue;
			const parsed = col.template.parse(stat.path);
			if (parsed !== null) {
				return { kind: "primary", collection: col, params: parsed };
			}
			if (col.companion?.template.matches(stat.path)) {
				return { kind: "companion", collection: col };
			}
		}
		return null;
	}

	#findOrphanedCompanions(
		col: CacheCollectionConfig<unknown, unknown>,
		companionSet: ReadonlySet<string>,
		diskFileMap: ReadonlyMap<string, FileStat>,
	): Array<{ collection: string; path: string }> {
		if (!col.companion) return [];
		const orphaned: Array<{ collection: string; path: string }> = [];
		for (const compPath of companionSet) {
			const compParams = col.companion.template.parse(compPath);
			if (!compParams) continue;
			const expectedPrimaryPath = col.template.build(compParams);
			if (!diskFileMap.has(expectedPrimaryPath)) {
				orphaned.push({ collection: col.name, path: compPath });
			}
		}
		return orphaned;
	}

	#findMatchingIndexedCollection(path: string): CacheCollectionConfig<unknown, unknown> | null {
		for (const col of this.#collections.values()) {
			if (col.index && col.template.matches(path)) {
				return col;
			}
		}
		return null;
	}

	#hasDirtyState(): boolean {
		if (this.#metaDirty) return true;
		for (const set of this.#dirtyShards.values()) {
			if (set.size > 0) return true;
		}
		return false;
	}

	#scheduleFlush(): void {
		if (this.#destroyed || this.#isHealing) return;
		if (this.#indexFlushMs === 0) {
			this.#clearFlushTimers();
			void this.#triggerScheduledFlush();
			return;
		}

		if (this.#debounceTimer !== undefined) {
			clearTimeout(this.#debounceTimer);
		}
		this.#debounceTimer = setTimeout(() => {
			this.#debounceTimer = undefined;
			void this.#triggerScheduledFlush();
		}, this.#indexFlushMs);

		if (this.#maxWaitTimer === undefined) {
			this.#maxWaitTimer = setTimeout(() => {
				this.#maxWaitTimer = undefined;
				void this.#triggerScheduledFlush();
			}, this.#maxFlushWaitMs);
		}
	}

	async #triggerScheduledFlush(): Promise<void> {
		try {
			await this.flush();
		} catch (error) {
			this.#logger?.log({
				level: "warn",
				event: "cache",
				code: isFsError(error) ? error.code : undefined,
				message: "Scheduled cache flush failed.",
			});
		}
	}

	#clearFlushTimers(): void {
		if (this.#debounceTimer !== undefined) {
			clearTimeout(this.#debounceTimer);
			this.#debounceTimer = undefined;
		}
		if (this.#maxWaitTimer !== undefined) {
			clearTimeout(this.#maxWaitTimer);
			this.#maxWaitTimer = undefined;
		}
	}

	async #flushToDisk(directBackend: boolean): Promise<void> {
		for (const [colName, dirtySet] of this.#dirtyShards.entries()) {
			if (dirtySet.size === 0) continue;
			const keys = [...dirtySet];
			const colShards = this.#shards.get(colName);

			for (const partitionKey of keys) {
				const gen = this.#getShardGeneration(colName, partitionKey);
				const shardPath = this.#shardPath(colName, partitionKey);
				const shard = colShards?.get(partitionKey);
				if (!shard || shard.size === 0) {
					await this.#deleteCacheFile(shardPath, directBackend);
				} else {
					const payload = textEncoder.encode(JSON.stringify(shard.values().toArray()));
					await this.#writeCacheFile(shardPath, payload, directBackend);
				}
				if (this.#getShardGeneration(colName, partitionKey) === gen) {
					dirtySet.delete(partitionKey);
				}
			}
		}

		if (this.#metaDirty) {
			const metaGen = this.#metaGeneration;
			const payload = textEncoder.encode(JSON.stringify(this.#meta));
			await this.#writeCacheFile(this.#metaPath, payload, directBackend);
			if (this.#metaGeneration === metaGen) {
				this.#metaDirty = false;
			}
		}
	}

	async #writeCacheFile(
		path: string,
		bytes: Uint8Array,
		directBackend: boolean,
	): Promise<void> {
		if (directBackend) {
			await this.#backend.writeBytes(path, bytes);
		} else {
			await this.#writeQueue.write(path, bytes, { backup: false });
		}
	}

	async #deleteCacheFile(path: string, directBackend: boolean): Promise<void> {
		try {
			if (directBackend) {
				await this.#backend.deleteFile(path);
			} else {
				await this.#writeQueue.delete(path, { backup: false });
			}
		} catch (error) {
			if (!isFsError(error) || error.code !== "NOT_FOUND") {
				throw error;
			}
		}
	}
}

function corruptShardSetClear(set: Set<string> | undefined): void {
	set?.clear();
}
