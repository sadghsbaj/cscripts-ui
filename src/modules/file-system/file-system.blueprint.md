# FileSystem — Blueprint

> **Status:** Hardened architectural blueprint (v3) — finalized decisions on `_cs-fs/` isolation, `meta.json` vs optional `settings` singleton, strict prefix enforcement, array-identity diffing, fail-safe stepwise migrations, SMB clock-skew & oplock resilience, coalesced cache flushing, and lifecycle cleanup.

## 1. Overview & Scope
- **Kind:** `utility` (headless TypeScript I/O engine + reactive Svelte 5 `.svelte.ts` workspace controller; zero UI components or CSS).
- **Purpose:** Provide a standardized, battle-tested, type-safe persistence layer over Chromium's File System Access API tailored for single-file (`file://`) and network-drive (SMB) business applications. Offers a Prisma-like declarative workspace schema with single-directory mounting, IndexedDB handle persistence, FIFO per-path write serialization, schema validation & migrations, structural JSON diffing/merging, two-tier caching (`meta.json` + partitionable `index.json`) with incremental self-healing, optimistic UI updates, and rotated diagnostic logging.
- **Boundaries:**
  - `src/modules/file-system/` owns all core primitives, adapters, reactive workspace state (`*.svelte.ts`), virtual filesystem test backend (`*.internal.ts` or test utility), Vitest unit/chaos tests, Playwright OPFS browser tests, and `file-system.docs.md`.
  - Reads the shared application prefix (`getStoragePrefix`) and uses localStorage helpers (`getLocalStorageJson`, `setLocalStorageJson`) from `cs/svelte/browser-storage` purely for namespace coordination and emergency crash-log fallback, while keeping all IndexedDB logic cleanly encapsulated inside `src/modules/file-system/`.
  - **No UI coupling:** Permission overlays, directory picker buttons, conflict/diff dialogs, progress bars, status dots, and toast banners live in consuming apps or `src/work/` and bind strictly to the reactive state and hooks exposed here.

---

## 2. Public API

### Module Entry & Internal Layout (`src/modules/file-system/`)
Exports only public types, factories, built-in adapters, path/diff helpers, and reactive workspace constructors via `index.ts` (never re-exporting any `*.internal.*` file):
- **Public modules:** `index.ts`, `errors.ts`, `support.ts`, `path-template.ts`, `json-diff.ts`, `adapters.ts`, `workspace.svelte.ts`, `file-system.docs.md`.
- **Internal modules (`.internal.`):** `fs-backend.internal.ts` (`FsBackend` + `BrowserFsBackend`), `memory-fs.internal.ts` (`MemoryFsBackend` with fault/lock/clock-skew simulation), `idb-handle-store.internal.ts`, `write-queue.internal.ts`, `cache-engine.internal.ts`, `logger.internal.ts`.
- **Tests:** `file-system.test.ts` (Vitest) + Playwright OPFS Chromium integration tests.

### 2.1 Capability & Environment Diagnostics
- `checkFileSystemSupport(): FileSystemSupportReport`
  - Inspects `window.isSecureContext`, `showDirectoryPicker`, `indexedDB`, and `navigator.locks` via feature detection (never raw User-Agent parsing; `file://` in Chromium evaluates `isSecureContext === true`).
  - Returns `{ supported: boolean; status: "supported" | "unsupported-api" | "insecure-context" | "ssr"; features: { directoryPicker: boolean; nativeMove: boolean; indexedDb: boolean; webLocks: boolean } }`.

### 2.2 Handle Registry & Single Directory Mount
- **Single-mount model:** One workspace manages **one** mounted `FileSystemDirectoryHandle` root (`MountState`).
- **Handle Persistence (Zero-Dependency IDB) & Strict Prefix Enforcement:**
  - Minimal native `window.indexedDB` Promise wrapper scoped strictly to storing/restoring/clearing the `FileSystemDirectoryHandle` (zero business data stored in IDB).
  - Namespace defaults to `getStoragePrefix()` (`cs/svelte/browser-storage`), with an optional explicit `namespace` / `storageKey` override when an app needs multiple distinct workspaces.
  - **Fail-Fast Guarantee:** Because all `file://` apps share a single browser origin bucket, creating a workspace **throws `FsError("MISSING_PREFIX")`** if both `getStoragePrefix()` and `options.namespace` are empty/whitespace (never silent warning fallback).
- **Permission & Mount Lifecycle (`MountStatus`):**
  - `"unlinked"` — no saved handle in IDB.
  - `"needs-permission"` — handle restored from IDB, but `queryPermission({ mode })` returns `"prompt"` or `"denied"`.
  - `"ready"` — handle verified and accessible for the configured `mode` (`"readwrite"` default, or `"read"` for read-only inspection mounts).
  - `"stale"` — saved handle failed with `NotFoundError` / disconnected SMB share / renamed directory.
  - `"unsupported"` — browser lacks required APIs.
- **Controller Methods:**
  - `restore(): Promise<MountStatus>` — silent boot check (restores IDB handle and calls `queryPermission`, never triggers native browser prompts).
  - `pick(options?: PickDirectoryOptions): Promise<MountStatus>` — opens `showDirectoryPicker` (requires transient user activation), persists handle in IDB, transitions to `"ready"`.
  - `requestAccess(): Promise<MountStatus>` — calls `handle.requestPermission({ mode })` (requires transient user activation), transitions to `"ready"` or `"needs-permission"`.
  - `forget(): Promise<void>` — removes persisted handle from IDB and resets workspace state to `"unlinked"`.
  - `flush(): Promise<void>` — awaits all pending FIFO writes and flushes any dirty coalesced `index` / `meta.json` updates to disk.
  - `destroy(): void` — detaches `window`/`document` listeners (`focus`, `visibilitychange`, `beforeunload`) and cancels active background scans cleanly.

### 2.3 Virtual Backend (`FsBackend`) & Low-Level Safe Operations
- **Backend Abstraction:** Core engine runs against an internal `FsBackend` interface so production uses the browser `FileSystemDirectoryHandle` backend and Vitest runs against a deterministic `MemoryFsBackend` with fault/latency/external-mutation injection.
- **Concurrency & Locking:**
  - **Per-path FIFO Async Mutex / Queue:** Guarantees sequential execution of writes, moves, and deletes per normalized relative path (plus optional `navigator.locks` coordination across tabs in the same browser profile).
  - **Global Barrier:** Exclusive lock mode for workspace-wide operations (full heal, format migration).
- **Safe File Primitives:**
  - **Windows / SMB Path Validation, Length Bounds & UI Suggestions (`path-template.ts`):**
    - Guards strictly against invalid characters (`: * ? " < > | \`), trailing dots/spaces, path traversal (`..`), and Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`).
    - **Never silently rewrites invalid paths:** Invalid inputs throw `FsError("INVALID_PATH")` with structured validation reasons (`invalidChars`, `reasons`, `suggestion`) so no silent name collisions occur.
    - **Exported UI Helpers:** `validatePathSegment(value)` and `sanitizePathSegment(value)` return `{ valid, reasons, invalidChars, suggestion }` so consuming UIs can warn users inline and offer a 1-click safe name suggestion.
    - **Case-Sensitive Logical Paths:** Path equality and `MemoryFsBackend` operate case-sensitively (`Neumarkt` !== `neumarkt`), with SMB case-collision awareness documented for Windows shares.
    - **Windows `MAX_PATH` Safeguards (Configurable):** Enforces `maxSegmentLength` (`200` default, reserving room for `.tmp`/`.bak` suffixes within OS `255` limit), logs a non-blocking diagnostic warning above `warnRelativePathLength` (`180` default), and blocks runaway paths above `maxRelativePathLength` (`220` default, configurable/`Infinity`) to leave headroom for corporate SMB root prefixes (`M:\...\`) under standard Win32 `260`-char limits.
  - **File Size Safeguards (Configurable):**
    - `maxFileBytes` (default `100 MiB`, configurable/`Infinity`) guards against accidentally loading massive unrelated files into browser memory (`FsError("FILE_TOO_LARGE")`).
    - `jsonAdapter` adds a dedicated `maxJsonBytes` ceiling (default `25 MiB`, configurable) before running `TextDecoder` + `JSON.parse()` on the main thread.
  - **Safe Write & Delete:**
    - Serializes and validates payload in memory *before* opening `createWritable()`, writes atomically, optionally creates rolling `.bak` snapshots inside `<systemDir>/backups/` (bounded by retention limits: `maxBackupsPerFile`, `maxBackupAgeDays`), and optionally verifies post-write `size` / SHA-256 hash.
    - Supports OCC `expectedRevision` checks on **both** `write()` and `delete()` so concurrent external edits are never silently deleted.
  - **Safe `move` / `rename`:** Uses native `FileSystemFileHandle.move()` when supported, with automatic verified fallback (`write target -> verify size & hash -> remove source`) for SMB / cross-directory compatibility.
  - **External Mutation, Oplock & Clock-Skew Handling:**
    - Every file read captures a `FileRevision` (`{ size, lastModified, hash }`).
    - **Zero Clock-Skew Assumptions:** Server `lastModified` timestamps on SMB shares are compared strictly for equality against previously observed server `lastModified` values—never compared against client `Date.now()`.
    - Distinguishes external file locks (e.g. Excel / Antivirus SMB oplocks throwing `NoModificationAllowedError` -> `FsError("FILE_LOCKED")`) from permission errors, with configurable bounded jittered retry (`retryOnLock`, default enabled for short transient locks) before surfacing `FILE_LOCKED`; hard errors (`CONFLICT`, `PERMISSION_DENIED`, `VALIDATION_FAILED`, `HANDLE_STALE`) never retry.
    - External edits, renames, or deletions on the SMB share are cleanly surfaced rather than crashing with uncaught DOMExceptions.

### 2.4 Adapter System, Standard Schema & Migrations (`FileAdapter`)
- **Interface (`FileAdapter<TData, TDecodedMeta = unknown>`):**
  - `id: string`
  - `extensions: readonly string[]`
  - `decode(ctx: AdapterDecodeContext): Promise<AdapterDecodeResult<TData, TDecodedMeta>>` — provides `bytes: Uint8Array`, `file: File`, `path: string` so external adapters (CSV, Excel, PDF, Markdown) can parse from bytes or `File` stream directly without extra boilerplate.
  - `encode(data: TData, ctx: AdapterEncodeContext): Promise<Uint8Array | string>`
  - Optional `diff?(base: TData, local: TData, remote: TData)` / `merge?(...)` hook for custom formats.
- **Built-in Adapters (V1):**
  - **`jsonAdapter(options)`:**
    - **No Forced `{ data }` Envelope:** Business JSON stays clean and human-readable at top-level (no mandatory wrapper around user keys). Schema version can live in an unobtrusive configurable field (default `"schemaVersion"`) or be inferred via `detectVersion(raw)` for legacy unversioned files (`version = 0` / `1`).
    - **Zero-Dep Standard Schema & Type Guards:** Validates decoded payloads via **Standard Schema v1** (`~standard` — natively compatible with Zod v3.24+/v4 without adding `zod` as a dependency) and/or plain TypeScript type guards (`validate(raw): raw is T`).
    - **Typed Stepwise Migration Chain (`defineMigrationChain`):** Sequential per-step migrations (`v1 -> v2 -> v3`) where each step transforms only adjacent schema versions and the final output is validated against the latest schema. **Fail-Safe Abort Guarantee:** If any migration step throws or final Standard Schema / type-guard validation fails, the engine aborts immediately (`MIGRATION_FAILED` / `VALIDATION_FAILED`) with `{ path, fromVersion, toVersion, cause }` **without** modifying or overwriting the source file on disk so an admin can inspect it manually. Supports `migrationWriteBack: "lazy" | "eager"` and automatic pre-migration `.bak` snapshots.
    - **Serialization Format:** Business documents default to human-readable formatted JSON (`indent: 2`, configurable), whereas internal system caches (`meta.json`, `index` shards) serialize compactly for minimal SMB payload size and faster parsing. Built-in structural JSON diff & 3-way merge integration.
  - **`jsonlAdapter(options)`:**
    - Line-delimited JSON parser/serializer tailored for logs and append-only event streams.
    - Supports append operations and **resilient partial-line recovery** (malformed/truncated trailing line on crash is isolated without invalidating earlier valid lines).
- **External Custom Adapters & Binary Upload Support:** Consuming apps define custom adapters (e.g., `xlsxAdapter`, `csvAdapter`, `pdfAdapter`) via a `defineAdapter(...)` helper with full TypeScript inference flowing through collections and index projections. Adapters may return `encode` bytes directly from raw `File`/`Uint8Array` uploads (or use `collection.writeRaw(params, fileOrBytes)`) so binary files like dropped Excel workbooks can be archived at template paths alongside decoded metadata without forced re-encoding.

### 2.5 JSON Diff, Array-Identity Matching & 3-Way Merge
- **Structural JSON Diff (`diffJson(base, target, options?)`):**
  - Produces typed change entries `{ path: (string | number)[]; kind: "added" | "removed" | "changed"; before?: unknown; after?: unknown }`.
- **Array-Identity Matching (`arrayKeyBy`):**
  - Configurable per-path identity extractors (`Record<string, string | ((item: unknown) => string | number)>`, plus helper presets like key `"id"`).
  - Prevents index-shift cascades when one user deletes or inserts an element in an array while another edits a different element—tracking identity keys (`[id=...]`) across diff and 3-way merge rather than brittle positional indexes `[0, 1, 2]`.
- **3-Way Merge (`mergeJson3Way(base, local, remote, options?)`):**
  - Tracks `base` snapshot on read (`TrackedDocument<T>`).
  - Disjoint field/array-item edits merge cleanly into `merged`.
  - Overlapping edits on the same field or array-item attribute emit structured `JsonFieldConflict` entries (`{ path, key?, baseValue, localValue, remoteValue }`).
- **Configurable Conflict / Sync Policy (`conflictPolicy`):**
  - `"detect"` — compares disk `FileRevision` before write; aborts write on mismatch and returns/throws structured `ConflictError` containing `{ base, local, remote, diff, threeWay }` for consumer resolution.
  - `"auto-merge"` — runs `mergeJson3Way`; commits automatically if zero overlapping field conflicts, otherwise escalates `ConflictError` with only the unresolved conflicts.
  - `"last-write-wins"` — skips revision conflict abort and writes sequentially through the FIFO queue (optionally keeping a `.bak` copy of the overwritten remote version).

### 2.6 Directory Layout, Two-Tier Cache & Partitioned Index
- **Clear System vs. Business Separation inside the Single Mount:**
  - **System Folder (`systemDir`, default `"_cs-fs"`):** Dedicated reserved folder at mount root containing **exclusively** disposable derived caches and system diagnostics: `meta.json`, `index/`, `logs/`, and `backups/`. Unconditionally ignored by all collection scans to eliminate self-recursion and protect system state from user file browsing.
  - **Business & App-Data Area (including optional `settings.json`):** Completely free layout outside `<systemDir>/` (directly in root or in app-specific subdirectories). **Important Decision:** Optional user-editable `settings.json` is NEVER placed inside `_cs-fs/` or mixed into `meta.json`—apps that want persistent settings declare an optional `defineSingleton({ path: "settings.json", ... })` in the business area so deleting/healing `_cs-fs/` never wipes user settings.
- **Workspace Definition (`defineWorkspace` / `createWorkspace`):**
  - **Singletons (`defineSingleton`):** Optional named single-file slots (e.g. `settings: defineSingleton({ path, adapter })`) exposing `read()`, `write(data, opts?)`, `update(updater, opts?)`, `exists()`, and `delete(opts?)`.
  - **Collections (`defineCollection`):** Named path-template collections (e.g. `records: defineCollection({ pattern: "{year}/{month}/{location}/{id}.json", adapter, index? })`) exposing `read(params, opts?)`, `write(params, data, opts?)`, `writeRaw(params, fileOrBytes, opts?)`, `update(params, updater, opts?)`, `move(fromParams, toParams, opts?)`, `delete(params, opts?)`, `exists(params)`, `query(filter?)`, `loadPartitions(keys)`, and `loadAllPartitions()`. One template both **builds** destination paths and **parses** metadata parameters from existing disk paths; parameter values reject illegal path-separator injection (`/`, `\`), and workspace initialization validates collection patterns so overlapping templates fail fast instead of colliding silently.
- **Two-Tier Cache Architecture (Derived Caches Only — Never Source of Truth):**
  - **Tier 1 — `<systemDir>/meta.json`:**
    - Always lightweight, compact, and fast to load on startup.
    - Stores workspace `formatVersion`, collection/partition manifest (partition keys, file counts, `path -> partitionKey` index map, revision hashes, last heal timestamp), and optional small derived workspace hints (never irreplaceable user settings).
  - **Tier 2 — `<systemDir>/index/` (Single or Partitioned Shards):**
    - Configurable per collection via `index`:
      - `project(doc, pathParams)` — selects either slim search/list fields OR rich aggregated payload (to avoid 100+ slow SMB file reads on app startup).
      - **Partitioning / Sharding:** Optional `partitionBy(pathParams, doc)` (e.g. by year `"2026"` -> `_cs-fs/index/<collection>/2026.json`) plus `eagerPartitions` predicate/rule (e.g. load latest 3 years automatically on boot).
      - **Cross-Partition Consistency:** Tracks `path -> partitionKey` so updating a record's partition attribute (e.g., moving a date from `2025` to `2026`), moving, or deleting a file atomically removes the old shard entry while updating the new shard—preventing stale duplicates.
      - **Coalesced Cache Flush:** Rapid mutations update the reactive in-memory index at `0ms` while coalescing disk rewrites of `index` shards and `meta.json` (`indexFlushMs` debounce + `maxFlushWaitMs` ceiling so continuous edits still checkpoint regularly, flushed immediately on `flush()`, `heal()`, and `beforeunload`) to avoid 3x SMB write amplification per click.
      - **Transparent Querying & On-Demand Partition Loading:** Read/query APIs merge all currently loaded partitions transparently while exposing `partitionStatus` (`"loaded" | "unloaded"`) and `loadPartitions(keys)` / `loadAllPartitions()` so UIs can fetch older partitions on demand via button click.
- **Startup Quick-Check, Revalidation & Self-Healing (`heal`):**
  - **Invariant:** Losing, deleting, or corrupting `<systemDir>/meta.json` or any `<systemDir>/index/` shard **never** causes loss of business records or app settings.
  - **Boot Quick-Check (`bootCheck: "none" | "cache-only" | "metadata-scan"`):** Loads `meta.json` + eager `index` partitions immediately; when `"metadata-scan"` is enabled, runs a bounded-concurrency scan (`concurrency: 6` default, not unbounded `Promise.all`) comparing lightweight `File` metadata (`size`, `lastModified`, path) against cached entries (`0` bytes of file contents read if unchanged) and triggers incremental heal if drift or corruption is detected.
  - **Optional Focus Revalidation (`revalidateOnFocus?: boolean | { minIntervalMs: number }`):** Disabled or throttled check when returning to an idle browser tab (`focus` / `visibilitychange`), never using OS file-watcher APIs (`FileSystemObserver`).
  - **Incremental Healing (Default) & Full Rebuild (`mode: "full"`):** Re-parses only new/modified files (or all files in `"full"` mode), reconciles external renames/moves/deletes, updates partitions + `meta.json`, emits `SyncProgress` events (`{ phase, processed, total, currentPath }`), and honors `AbortSignal`.

### 2.7 Optimistic UI Engine & Reactive Status Hooks
- **Confirmed-Base + Pending-Patch Model:**
  - Rather than storing fragile per-op full snapshots that clobber overlapping writes, the reactive state separates `confirmedState` (last disk-verified truth) from an ordered `pendingMutations` queue; `effectiveState` is derived cleanly by layering pending patches over `confirmedState`.
  - **Per-Operation Rollback:** If a queued write fails or triggers `ConflictError`, only that failed mutation is removed from `pendingMutations`—`effectiveState` automatically settles back without clobbering sibling queued writes, and `onMutationError` / `onMutationConflict` / `onMutationSettled` hooks fire for toast/alert UIs.
- **Unload Protection (`preventCloseWhilePending`):**
  - Optional (default `true`) `beforeunload` warning whenever `pendingMutationCount > 0` so users on slow SMB shares do not accidentally close the tab mid-write.
- **UI Status & Activity Signals (compatible with `WorkAppStatusDot`):**
  - Reactive properties on the workspace state:
    - `mountStatus: MountStatus`
    - `activity: "idle" | "restoring" | "reading" | "writing" | "healing"`
    - `isBusy: boolean` (`activity !== "idle" || pendingMutationCount > 0`)
    - `pendingMutationCount: number`
    - `unresolvedConflictCount: number`
    - `health: "base" | "positive" | "caution" | "negative"` (maps mount/pending/error state directly to `cscripts-ui` semantic status colors, e.g. `"caution"` while syncing/pending or needing permission, `"negative"` on stale/I/O error, `"positive"` when ready & synced)
    - `lastError: FsError | null`

### 2.8 Structured Logging, Rotation & Emergency LocalStorage Fallback
- Built-in logger tracks lifecycle events (`mount`, `permission`, `read`, `write`, `move`, `delete`, `conflict`, `heal`, `migration`, `error`) + consumer-extensible hooks (`logger.log(...)`, `onLog` listener).
- Persisted inside `<systemDir>/logs/` using `jsonlAdapter` with automatic rotation (`maxBytes` / `maxLines` per file and `maxFiles` retention pruning).
- **Emergency `localStorage` Crash Trail (Diagnostics Only):** When file-system logging fails or a critical I/O error occurs while unmounted/disconnected, a bounded recent-action/error ring buffer is written to `localStorage` under `<prefix>:fs-emergency-log` via `cs/svelte/browser-storage`. Strictly diagnostic traces — **never** falls back to storing business records in `localStorage`.

### 2.9 Error Taxonomy (`FsError`)
Typed error class with machine-readable `code`:
`"MISSING_PREFIX" | "INVALID_CONFIG" | "UNSUPPORTED_ENV" | "UNLINKED" | "PERMISSION_REQUIRED" | "PERMISSION_DENIED" | "HANDLE_STALE" | "FILE_LOCKED" | "FILE_TOO_LARGE" | "NOT_FOUND" | "INVALID_PATH" | "VALIDATION_FAILED" | "MIGRATION_FAILED" | "CORRUPT_DATA" | "CONFLICT" | "ABORTED" | "IO_FAILED"`.

### 2.10 CSS Variables
- None. `file-system` introduces no CSS files or `--cs-file-system-*` custom properties.

---

## 3. DOM, Semantics & Accessibility
- **Headless module:** Renders no DOM elements, attributes, or styles.
- **Transient User Activation Contract:** Browser security requires `pick()` (`showDirectoryPicker`) and `requestAccess()` (`requestPermission`) to be invoked directly from a user gesture (e.g. native `<button onclick={...}>`). The module documents this contract and avoids queuing automatic modal triggers during boot.
- **Consumer Accessibility Guidance:** Consuming UIs hooking into `MountStatus === "needs-permission"`, `health`, or `SyncProgress` should map progress values to native `<progress>` / `aria-valuenow` and surface rollback/conflict alerts via `aria-live="polite"` / `"assertive"`.

---

## 4. Visual & Motion Contract
- **Headless:** No surface styles, shadows, squircles, or animations inside `src/modules/file-system/`.
- **Boot & Intro Choreography Coordination:** `restore()` performs only non-blocking IndexedDB reads and silent `queryPermission()` checks so apps running animated intros (e.g., ~2.5s cold boot curtains) are never interrupted by premature browser permission prompts or overlays. Heavy initial healing/indexing can be awaited or gated by consumers until the intro finishes.
- **Main-Thread Responsiveness:** Without Web Workers, multi-file scans and heals yield periodically (`yieldEvery` items or macrotask slices) so animations and UI input remain responsive.

---

## 5. Edge Cases & Constraints
- **Browser Support (`Modern Chromium-First`):** Targets modern Chromium/Edge (including local `file://` HTML execution). Non-Chromium browsers lacking `showDirectoryPicker` cleanly receive `status: "unsupported-api"` without throwing during module import or SSR.
- **`file://` Origin Bucket Sharing:** Multiple local HTML tools opened from `file://` share one origin for both `localStorage` and `IndexedDB`. Strict namespace prefixing (`configureStoragePrefix` or explicit `namespace`) is enforced at runtime (`MISSING_PREFIX` error when absent) to guarantee apps never overwrite each other's saved `DirectoryHandle`.
- **Single-File Build (`csSingleFile`):** Zero Web Workers and zero external worker/WASM asset URLs ensure 100% compatibility with bundled single-file HTML outputs.
- **SMB / Windows Hazards:** Enforces Windows invalid-character/reserved-name rules, handles `handle.move()` failures on network drives via verified copy+delete fallback, handles external SMB oplocks (`FILE_LOCKED`), avoids clock-skew bugs (strict server-mtime equality + SHA-256 instead of `Date.now()` comparisons), and bounds concurrent directory handles to prevent SMB socket exhaustion.
- **Multi-Tab Coordination on `file://`:** Does NOT rely on `BroadcastChannel` (which can be restricted/inconsistent across opaque `file://` origins); coordinates concurrent tab writes via `navigator.locks`, OCC `FileRevision` checks on both `write()` and `delete()`, and optional `revalidateOnFocus`.
- **JSON Round-Trip Caveat:** Plain `JSON.stringify` strips `undefined` properties and converts `Date` objects to ISO strings; documented clearly for schema authors (e.g. store ISO strings or use Zod coercion/ISO validators).
- **Backup & Log Retention Bounds:** Both `_cs-fs/logs/` and `_cs-fs/backups/` enforce configurable retention pruning (`maxFiles` / `maxBackupsPerFile`) so long-running workspaces never bloat indefinitely.
- **Cache-vs-Truth Invariant:** Neither `<systemDir>/meta.json` nor `<systemDir>/index/` (nor any partition shard) may ever be treated as authoritative source data; deletion or corruption of `<systemDir>/` (excluding optional backups) must always be recoverable via `heal()`.
- **Self-Recursion Guard:** Directory traversals strictly ignore `<systemDir>` (`_cs-fs/`) so log writes, backups, or index rebuilds never trigger recursive scanning.
- **Explicit Non-Goals (V1):**
  - No Web Workers or `FileSystemObserver` watchers.
  - No multi-directory mounts or standalone single-file (`showOpenFilePicker`) mounts.
  - No dual-storage sync fallback into `IndexedDB` or `localStorage` for business data.
  - No bundled heavy third-party parsers (`xlsx`, `csv`, `pdfjs`), schema validators (`zod`), or external IDB libraries (`idb`).
  - No built-in Svelte UI components (`FileChooser`, `DiffDialog`, `LogDrawer`) inside `src/modules/file-system/`.

---

## 6. Test & Documentation Plan

### 6.1 Unit, Contract & Chaos Tests (`Vitest` against `MemoryFsBackend`)
- **Prefix & Config Safety:** Throws `MISSING_PREFIX` when neither `configureStoragePrefix` nor explicit `namespace` is configured; verifies handle key isolation across namespaces.
- **Path & Windows Safety:** Reserved names (`CON`, `NUL`, `COM1`), invalid characters, trailing dots/spaces, path traversal rejection, separator injection inside template params, overlapping collection pattern rejection (`INVALID_CONFIG`), path-template building & round-trip parameter parsing, unconditional exclusion of `<systemDir>`.
- **Concurrency, Locks & Atomicity:** Overlapping FIFO writes to the same path, parallel writes to distinct paths, aborting mid-stream (`WritableStream.abort`) preserves prior valid file + triggers emergency diagnostic log, safe `move` native vs fallback verification, OCC revision check on `delete()`, `FILE_LOCKED` oplock handling, bounded backup pruning.
- **Adapters, Standard Schema & Migrations:** `jsonAdapter` validation (Standard Schema `~standard` + plain guards, unversioned legacy file detection, no forced `{ data }` envelope), stepwise migrations (`v1 -> v2 -> v3`) in `"lazy"` and `"eager"` modes, **fail-safe abort leaving disk untouched on failed migration/validation**, pre-migration backups, `jsonlAdapter` rotation + partial trailing line recovery, custom external adapter registration with TypeScript inference.
- **Diff, Array-Identity & Sync Policies:** Disjoint object merges, array-identity merges under concurrent insert/delete/edit without index-shift false conflicts, overlapping field/item conflict detection, `"detect"` vs `"auto-merge"` vs `"last-write-wins"` behavior under simulated SMB edits.
- **Two-Tier Cache, Sharding & Healing:** Clean separation of disposable `_cs-fs/meta.json` vs persistent optional `settings` singleton, boot quick-check modes (`none`, `cache-only`, `metadata-scan`) + clock-skew simulation (server mtime ahead/behind client clock), coalesced dirty index/meta flushing, cross-partition move/date-change cleanup (no ghost duplicates), incremental heal skipping unchanged files (`0` reads), external file add/edit/rename/delete reconciliation, corrupt/truncated `meta.json` and `index` shard auto-recovery without data loss, year/partition sharding with partial boot load + on-demand partition loading, scale test (1,000+ files across nested folders).
- **Optimistic UI, Status & Logging:** Immediate optimistic projection, isolated per-op rollback when one of multiple queued mutations fails, `pendingMutationCount` / `health` / `activity` / `beforeunload` / `flush()` / `destroy()` transitions, log rotation (`maxBytes`, `maxLines`, `maxFiles`), emergency `localStorage` fallback verification.

### 6.2 Real Browser Integration Tests (`Playwright` + Chromium OPFS)
- Execute real Chromium integration tests against **Origin Private File System (`navigator.storage.getDirectory()`)** exercising the genuine `BrowserFsBackend` (`FileSystemDirectoryHandle`, `FileSystemFileHandle`, `createWritable()`, native `move()`).
- Verify real `IndexedDB` handle serialization and restoration across full page reloads, namespace isolation between two different prefixes, concurrent file writes, large payload integrity, and log rotation on real Chromium storage.
- Smoke-verify bundled `csSingleFile` (`file://`) compatibility (environment check, IDB prefixing, zero external asset/worker fetches).

### 6.3 Documentation (`src/modules/file-system/file-system.docs.md`)
- Comprehensive guide tailored for both human developers and AI coding assistants: architectural invariants (derived caches vs source of truth, system vs business directory split), quick-start recipes, custom adapter guide (e.g. Excel/CSV), stepwise migration patterns, SMB/Windows caveats, optimistic UI & conflict-resolution patterns, and complete error-code reference.

