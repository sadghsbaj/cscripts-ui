# CacheEngine — Internal Engineering Notes

> **Do not rename to `*.internal.docs.md`:** `playground/PreviewView.svelte` globs `../src/modules/**/*.docs.md` by folder, so a second `.docs.md` file would collide with `file-system.docs.md`.

## Two-Tier Cache Layout (`meta.json` + `index/` Shards)

All cache files live inside `systemDir` (default `"_cs-fs"`):

- **`_cs-fs/meta.json` (`WorkspaceMetaFile`):**
  - `formatVersion`: `CACHE_FORMAT_VERSION` (`1`).
  - `lastHealAt`: ISO timestamp or `null`.
  - `collections[name]` (`MetaCollectionManifest`):
    - `partitions`: `Record<partitionKey, { count, updatedAt }>`.
    - `pathToPartition`: `Record<relativePath, partitionKey>` — authoritative O(1) lookup for which shard owns a given file path.
    - `revisions`: `Record<relativePath, FileRevision>` (`{ size, lastModified, hash? }`) used for incremental change detection during `heal()`.
- **`_cs-fs/index/<collection>/<partitionKey>.json`:**
  - JSON array of `CachedIndexEntry` (`{ path, params, revision, data, companionStatus? }`).
  - Partition keys are validated with `validatePartitionKey()` (calling `validatePathSegment(key, { maxSegmentLength: 180 })`; default `"default"` when `partitionBy` is omitted).
  - Collections without `col.index` are skipped in all `CacheEngine` methods (`meta.json` only tracks indexed collections; unindexed collections do not write shards or `meta.json` entries).
  - `loadPartitions(collectionName, keys)` validates each key with `validatePartitionKey()` (`maxSegmentLength: 180`), skips already-loaded shards, and guards `manifest.partitions` lookups with `Object.prototype.hasOwnProperty.call(manifest.partitions, key)` before loading from disk.

## Cross-Partition Consistency (`pathToPartition`)

When a document's partition key changes (e.g., an order's `year` or `status` changes on update, or a document is moved):

1. `#indexFileFromDisk()` / `upsertEntry()` checks `manifest.pathToPartition[path]`.
2. If `oldPartitionKey !== undefined && oldPartitionKey !== newPartitionKey`, it calls `#removeFromShard(collectionName, oldPartitionKey, path)` **before** inserting into `newPartitionKey`.
3. `manifest.pathToPartition[path]` is updated to `newPartitionKey`, and both shards plus `meta.json` are marked dirty.
4. Empty shards (`shard.size === 0`) are deleted from disk during flush rather than leaving stale 0-entry files.

## Generation-Tracked Dirty Flags (`#metaGeneration`, `#shardGenerations`)

`flush()` writes shards and `meta.json` asynchronously without holding a global lock across normal mutations. To prevent a concurrent mutation from having its dirty flag cleared by an earlier in-flight flush:

- `#markMetaDirty()` sets `#metaDirty = true` and increments `#metaGeneration += 1`.
- `#markShardDirty(collectionName, partitionKey)` adds `partitionKey` to `#dirtyShards` and increments `#shardGenerations.get(collectionName).get(partitionKey)`.
- Before writing each shard in `#flushToDisk(directBackend: boolean)`, flush snapshots `const gen = this.#getShardGeneration(colName, partitionKey)`. After `#writeCacheFile` / `#deleteCacheFile` completes, it clears the dirty bit **only if** `this.#getShardGeneration(colName, partitionKey) === gen`.
- Similarly, `#metaDirty = false` is set after writing `meta.json` **only if** `this.#metaGeneration === metaGen`.
- `#writeCacheFile()` and `#deleteCacheFile()` early-return immediately when `this.#readOnly` is `true`, preventing any `_cs-fs/` disk writes in read-only workspaces.

Coalescing timers use `indexFlushMs` (default `250` ms) and `maxFlushWaitMs` (default `2000` ms) to batch rapid writes while bounding worst-case flush delay. Background timer callbacks invoke `#triggerScheduledFlush()`, which awaits `this.flush()` inside `try/catch` and logs a `"warn"` entry (`event: "cache"`) on failure instead of leaking an unhandled rejection.

## `#activeFlush` / `#activeHeal` Serialization

- `#activeFlush` and `#activeHeal` track the currently executing flush or heal promise.
- `flush()` loops `while (this.#activeHeal || this.#activeFlush)` awaiting `waitForSettled(...)` before starting a new `#activeFlush` run.
- `heal()` loops `while (this.#activeHeal)` and `while (this.#activeFlush)` before acquiring `writeQueue.withGlobalBarrier(...)` and setting `#activeHeal`.
- Inside `heal()`, cache writes pass `directBackend = true` to `#writeCacheFile` / `#deleteCacheFile` so they bypass `WriteQueue` (which is already paused at the global barrier, avoiding `WriteQueue` re-entrancy deadlock).

## `heal()` Invariants & `#healMode === "full"`

- **Modes:**
  - `"incremental"` (default for `bootCheck: "metadata-scan"` and `revalidateOnFocus`): Walks disk files, compares `stat` (`size`, `lastModified`) against `manifest.revisions[path]`, and only re-reads/re-decodes new or changed files, plus removes deleted paths.
  - `"full"`: Calls `#resetAllIndexedState()` followed by `#collectDiskShardsIntoDirty()` to rebuild all manifests and shards from scratch from disk. `#collectDiskShardsIntoDirty()` lists `_cs-fs/index/<collection>/` on disk and marks every existing `*.json` shard dirty so orphaned disk shards not listed in `meta.json` are still pruned during `#flushToDisk(true)`.
- **Why `#ensureShardLoaded()` skips disk shard reload when `#healMode === "full"`:**
  During a full heal, any pre-existing shard files on disk may be corrupt, stale, or belong to deleted entries. If `#ensureShardLoaded()` loaded old shard JSON from disk while `#healMode === "full"`, stale entries would leak into the rebuilt in-memory `Map` and corrupt `count` / `entries`. Instead, when `this.#healMode === "full"`, `#ensureShardLoaded()` initializes an empty `new Map()` in memory, ensuring the rebuilt shard reflects only files verified on disk during the heal pass.
- **Fault isolation & yielding:** Each file is decoded inside `try/catch`; decode/validation errors are pushed to `HealReport.failures` (`CorruptEntry[]`) without aborting the scan. Every `yieldEvery` files (default `50`), `heal()` yields to the macrotask queue (`setTimeout(0)`) to keep the UI responsive.
