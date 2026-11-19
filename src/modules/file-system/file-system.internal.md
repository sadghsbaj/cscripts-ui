# FileSystem — Internal Engineering Notes

> **Do not rename to `*.internal.docs.md`:** `playground/PreviewView.svelte` globs `../src/modules/**/*.docs.md` by folder, so a second `.docs.md` file would collide with `file-system.docs.md`.

## Overall Internal Architecture

`src/modules/file-system/` is split into strict, layered internals (none of which are re-exported through `index.ts`):

- **`types.ts`**: Public contract layer (`FsBackend`, `FileRevision`, `HealReport`, `FsLogEntry`, `CacheCollectionConfig`, etc.) imported by both `*.internal.ts` modules and `workspace.svelte.ts` / `index.ts`, ensuring zero `*.internal.*` types leak through `index.ts`.
- **`fs-backend.internal.ts`**: `FsBackend` implementation (`BrowserFsBackend`) wrapping `FileSystemDirectoryHandle`, `FileSystemFileHandle`, `createWritable()`, and native `move()` with verified copy+SHA-256+delete fallback.
- **`memory-fs.internal.ts`**: `MemoryFsBackend` deterministic in-memory `FsBackend` for Vitest unit/chaos suites.
- **`write-queue.internal.ts`**: `WriteQueue` providing per-path FIFO mutexes, optional `navigator.locks` cross-tab coordination, global barriers, `retryOnLock` backoff, OCC revision checks, post-write SHA-256 verification, and bounded `.bak` backups.
- **`idb-handle-store.internal.ts`**: Zero-dependency native `IndexedDB` handle persistence (`cs-file-system-handles` / `handles` store) and `resolveWorkspaceNamespace()`.
- **`logger.internal.ts`**: `FsLogger` writing batched JSONL logs to `_cs-fs/logs/` with `1 MiB` / `2000` lines / `5` files rotation plus a capped 50-entry (`64 KiB`) metadata-only `localStorage` emergency ring buffer.
- **`cache-engine.internal.ts`**: `CacheEngine` managing `_cs-fs/meta.json` and `_cs-fs/index/<collection>/<partition>.json`.
- **`workspace.svelte.ts`**: Reactive Svelte 5 orchestrator (`$state`, `$state.raw`, `$derived`) binding mount lifecycle, optimistic UI overlay, conflict resolution, and collection/singleton handles. Uses `ErasedSingletonDefinition` and `ErasedCollectionDefinition` as non-generic base constraints on `WorkspaceConfig` / `Workspace` so per-handle `TData`, `TProjected`, `TParams`, and `THasIndex` types stay preserved without contravariance issues.

## Mount & Permission State Machine

`mountStatus` transitions across `"unlinked" | "restoring" | "needs-permission" | "ready" | "stale" | "unsupported"` (orthogonal to `activity` / `isBusy` and `health`, where `health` stays `"positive"` during normal `reading`/`writing`/`healing` and `"base"` during `"unlinked"`/`"restoring"`). `directoryName` is `$derived<string | null>(directoryHandle?.name ?? null)` from `$state.raw<PermissionAwareDirectoryHandle | null>(null)` `directoryHandle`:

1. **Initial state:** `"ready"` if an injected `config.backend` is provided (e.g., `MemoryFsBackend` in tests); `"unsupported"` if `checkFileSystemSupport().supported` is `false` (SSR, insecure context, missing `showDirectoryPicker` or `indexedDB`); `"restoring"` if `config.autoRestore` is `true` (which immediately triggers `void restore()`); otherwise `"unlinked"`.
2. **`restore()`**: Sets `mountStatus = "restoring"` synchronously before the first `await` (deduplicated within the same `mountEpoch` via `activeRestorePromise`) and reads the persisted `FileSystemDirectoryHandle` from `IdbHandleStore`.
   - Missing handle -> clears `directoryHandle = null` and transitions to `"unlinked"`.
   - `queryPermission({ mode }) === "granted"` -> initializes `BrowserFsBackend`, `WriteQueue`, `CacheEngine`, boots cache, transitions to `"ready"`.
   - `queryPermission` returns anything other than `"granted"` (`"prompt"` or `"denied"`) -> stores handle in memory (`directoryHandle = handle`) and transitions to `"needs-permission"` (never `"unlinked"`).
   - `NotFoundError` / `InvalidStateError` -> transitions to `"stale"` and surfaces `FsError("HANDLE_STALE")`.
   - Any other error in `catch` -> runs `handleInfrastructureError(...)`, and if `!destroyed && epoch === mountEpoch && mountStatus === "restoring"`, falls back to `"unlinked"` and clears `directoryHandle = null` so `restore()` never gets stuck in `"restoring"`.
3. **`requestAccess()`**: Must be called from a user gesture when `mountStatus === "needs-permission"` (never resets `mountStatus` to `"restoring"`). Invokes `handle.requestPermission({ mode })`; on `"granted"` boots engines and transitions to `"ready"`; if `permission !== "granted"` (including `"denied"` or `"prompt"`), remains in `"needs-permission"` (never `"unlinked"`).
4. **`pick(options?)`**: Calls `showDirectoryPicker`, persists handle via `idbStore.saveHandle()`, commits `directoryHandle` only after `idbStore.saveHandle()` succeeds and passes the `destroyed || epoch !== mountEpoch` guard, tears down any prior engine state, boots engines, and transitions to `"ready"`.
5. **`forget()`**: Deletes persisted handle from IndexedDB, destroys `CacheEngine` / `FsLogger` timers, clears `directoryHandle = null`, `confirmedEntries`, and `pendingMutations`, and resets `mountStatus` to `"unlinked"`.
6. **`mountEpoch` lifecycle guarding**: `mountEpoch` is incremented monotonically on `pick()`, `forget()`, and `destroy()`. Async operations (`restore`, `requestAccess`, `pick`, `heal`, `runBootCheck`, reads, mutations, conflict resolution, error handling) capture `const epoch = mountEpoch` at entry and verify `epoch === mountEpoch` before mutating reactive state (`mountStatus`, `confirmedEntries`, `pendingMutations`, `unresolvedConflicts`, `corruptEntries`, `lastError`, `trackedDocs`), preventing stale async completions from corrupting state across remounts or teardown.
7. **`mode: "read"` internal invariants**:
   - `initializeEngine()` passes `readOnly: mode === "read"` to `CacheEngine` and calls `logger.setBackend(undefined, undefined)` (instead of `logger.setBackend(nextBackend, nextQueue)`) so `_cs-fs/` disk writes for both cache shards/meta and JSONL logs are suppressed.
   - `maybeWriteBackMigration()` early-returns the existing `revision` when `writeBackMode !== "eager" || mode === "read"` **before** calling `assertWritable()`, allowing read-only workspaces to migrate documents in memory without throwing `FsError("PERMISSION_DENIED")`.

## `WriteQueue` Concurrency & Non-Reentrancy

- **Per-path FIFO mutex (`#pathTails`):** `withPathLock(path, fn)` / `withPathLocks(paths, fn)` normalizes paths, deduplicates, and sorts them lexicographically (`localeCompare`) before chaining promises onto `#pathTails`. Sorting prevents AB-BA deadlocks during `move(from, to)` or `writeWithCompanion()`.
- **Optional Web Locks (`#withOptionalWebLock`):** When `useWebLocks` is `true` (default) and `navigator.locks` is available, acquires `navigator.locks.request(\`${lockPrefix}:${name}\`)` in the same sorted order.
- **Global barrier (`withGlobalBarrier`):** Increments `#barrierCount`, chains onto `#barrierPromise`, awaits `Promise.allSettled(this.#activeTasks)` to drain all active path tasks, and runs `fn` exclusively (used by `CacheEngine.heal()`). New `withPathLocks` calls arriving while `#barrierCount > 0` wait on `#barrierPromise` before registering in `#activeTasks`.
- **Non-reentrancy invariant:** Callbacks passed to `withPathLocks` or `withGlobalBarrier` **must never** re-entrantly invoke the same `WriteQueue` instance—doing so will self-deadlock on `#pathTails` or `#barrierPromise`.
- **OCC (`revisionsMatch`) & backups:** `expectedRevision` checks compare `{ size, lastModified }` (and `hash` if both define it) for exact equality. Backups are written to `_cs-fs/backups/<encoded-path>.<ts>.<seq>.bak` and pruned by `maxBackupsPerFile` (default `5`) and `maxBackupAgeDays` (default `30`).

## Optimistic UI (`confirmedEntries + pendingMutations`)

- `confirmedEntries` (`$state.raw<Record<string, readonly CachedIndexEntry[]>>`) holds the last disk-confirmed index snapshot per collection.
- `pendingMutations` (`$state.raw<readonly PendingMutation[]>`) holds an ordered log of in-flight optimistic operations (`upsert`, `delete`, `move`, or `pending` for unindexed/raw mutations), each tagged with a unique `id`.
- `collection.entries` is a `$derived` overlay (`applyPendingMutations`) that clones `confirmedEntries[name]` and replays `pendingMutations` for that collection in order.
- **Per-op rollback:** On completion (success, error, or conflict), `removePendingMutation(id)` filters out only that operation's `id` from `pendingMutations`, leaving concurrent in-flight mutations intact. On commit, `confirmedEntries` is refreshed from `CacheEngine` before removing the pending mutation so there is no UI flicker.
- **Tracked revisions (`trackedDocs`):** A `SvelteMap<string, TrackedDocEntry>` (capped at `MAX_TRACKED_DOCS = 2000`) caches `{ revision, data }` from reads and writes to supply `base` for 3-way merges (`mergeJson3Way`) and default `expectedRevision` for OCC.

## `file://` & `csSingleFile` Constraints

- `resolveWorkspaceNamespace()` in `idb-handle-store.internal.ts` reads `config.namespace` or `getStoragePrefix()` (from `cs/svelte/browser-storage`), trims trailing colons, and throws `FsError("MISSING_PREFIX")` if both are empty. This prevents multiple `file://` HTML tools from overwriting each other's handles in the shared `file://` IndexedDB origin.
- No Web Workers, `fetch()`, dynamic `import()` URLs, or external assets are used anywhere in `src/modules/file-system/`.
