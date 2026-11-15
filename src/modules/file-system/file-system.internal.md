# FileSystem — Internal Engineering Notes

> **Do not rename to `*.internal.docs.md`:** `playground/PreviewView.svelte` globs `../src/modules/**/*.docs.md` by folder, so a second `.docs.md` file would collide with `file-system.docs.md`.

## Overall Internal Architecture

`src/modules/file-system/` is split into strict, layered internals (none of which are re-exported through `index.ts`):

- **`fs-backend.internal.ts`**: `FsBackend` abstraction and `BrowserFsBackend` wrapping `FileSystemDirectoryHandle`, `FileSystemFileHandle`, `createWritable()`, and native `move()` with verified copy+SHA-256+delete fallback.
- **`memory-fs.internal.ts`**: `MemoryFsBackend` deterministic in-memory `FsBackend` for Vitest unit/chaos suites.
- **`write-queue.internal.ts`**: `WriteQueue` providing per-path FIFO mutexes, optional `navigator.locks` cross-tab coordination, global barriers, `retryOnLock` backoff, OCC revision checks, post-write SHA-256 verification, and bounded `.bak` backups.
- **`idb-handle-store.internal.ts`**: Zero-dependency native `IndexedDB` handle persistence (`cs-file-system-handles` / `handles` store) and `resolveWorkspaceNamespace()`.
- **`logger.internal.ts`**: `FsLogger` writing batched JSONL logs to `_cs-fs/logs/` with `1 MiB` / `2000` lines / `5` files rotation plus a capped 50-entry (`64 KiB`) metadata-only `localStorage` emergency ring buffer.
- **`cache-engine.internal.ts`**: `CacheEngine` managing `_cs-fs/meta.json` and `_cs-fs/index/<collection>/<partition>.json`.
- **`workspace.svelte.ts`**: Reactive Svelte 5 orchestrator (`$state`, `$state.raw`, `$derived`) binding mount lifecycle, optimistic UI overlay, conflict resolution, and collection/singleton handles.

## Mount & Permission State Machine

`mountStatus` transitions across `"unlinked" | "needs-permission" | "ready" | "stale" | "unsupported"`:

1. **Initial state:** `"ready"` if an injected `config.backend` is provided (e.g., `MemoryFsBackend` in tests); `"unsupported"` if `checkFileSystemSupport().supported` is `false` (SSR, insecure context, missing `showDirectoryPicker` or `indexedDB`); otherwise `"unlinked"`.
2. **`restore()`**: Reads the persisted `FileSystemDirectoryHandle` from `IdbHandleStore`.
   - Missing handle -> `"unlinked"`.
   - `queryPermission({ mode }) === "granted"` -> initializes `BrowserFsBackend`, `WriteQueue`, `CacheEngine`, boots cache, transitions to `"ready"`.
   - `queryPermission` returns `"prompt"` -> stores handle in memory, transitions to `"needs-permission"`.
   - `queryPermission` returns `"denied"` -> transitions to `"needs-permission"` (or `"unlinked"` if denied permanently on re-request).
   - `NotFoundError` / `InvalidStateError` -> transitions to `"stale"` and surfaces `FsError("HANDLE_STALE")`.
3. **`requestAccess()`**: Must be called from a user gesture when `mountStatus === "needs-permission"`. Invokes `handle.requestPermission({ mode })`; on `"granted"` boots engines and transitions to `"ready"`.
4. **`pick(options?)`**: Calls `showDirectoryPicker`, persists handle in IndexedDB, tears down any prior engine state, boots engines, and transitions to `"ready"`.
5. **`forget()`**: Deletes persisted handle from IndexedDB, destroys `CacheEngine` / `FsLogger` timers, clears `confirmedEntries` / `pendingMutations`, resets `mountStatus` to `"unlinked"`.

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
