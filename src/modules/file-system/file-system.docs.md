---
name: FileSystem
kind: utility
import: cs/svelte/file-system
exports:
  - MOUNT_STATUSES
  - WORKSPACE_ACTIVITIES
  - WORKSPACE_HEALTH_STATES
  - CONFLICT_POLICIES
  - CONFLICT_RESOLUTIONS
  - FS_ERROR_CODES
  - DEFAULT_MAX_JSON_BYTES
  - DEFAULT_MAX_SEGMENT_LENGTH
  - DEFAULT_WARN_RELATIVE_PATH_LENGTH
  - DEFAULT_MAX_RELATIVE_PATH_LENGTH
  - DEFAULT_SYSTEM_DIR
  - defineSingleton
  - defineCollection
  - defineWorkspace
  - createWorkspace
  - defineAdapter
  - jsonAdapter
  - jsonlAdapter
  - migrateDocument
  - encodeJsonlLine
  - encodeJsonlLines
  - diffJson
  - mergeJson3Way
  - applyConflictChoices
  - validatePathSegment
  - sanitizePathSegment
  - normalizeRelativePath
  - validateRelativePath
  - createPathTemplate
  - assertNonOverlappingTemplates
  - isIgnoredPath
  - FsError
  - isFsError
  - checkFileSystemSupport
  - MountStatus
  - WorkspaceActivity
  - WorkspaceHealth
  - ConflictPolicy
  - ConflictResolution
  - PickDirectoryOptions
  - SingletonConfig
  - SingletonDefinition
  - SingletonHandle
  - CompanionConfig
  - CollectionConfig
  - CollectionDefinition
  - BaseCollectionHandle
  - IndexedCollectionHandle
  - CollectionHandle
  - CollectionListItem
  - CollectionListFilter
  - CollectionQueryFilter
  - ReadResult
  - CompanionReadResult
  - WriteResult
  - WriteOperationOptions
  - DeleteOperationOptions
  - MoveOperationOptions
  - ConflictDetails
  - MutationContext
  - MutationSettledContext
  - RevalidateOnFocusOption
  - WorkspaceConfig
  - Workspace
  - AdapterDecodeContext
  - AdapterDecodeResult
  - AdapterEncodeContext
  - FileAdapter
  - StandardSchemaIssue
  - StandardSchemaResult
  - StandardSchemaV1
  - TypeGuardValidator
  - MigrationFn
  - MigrationStepConfig
  - MigrationStep
  - MigrationWriteBackMode
  - JsonAdapterOptions
  - JsonFileAdapter
  - MigrateDocumentOptions
  - MigrateDocumentResult
  - JsonlCorruptLinePolicy
  - JsonlAdapterOptions
  - DiffPathSegment
  - DiffKind
  - DiffEntry
  - JsonDiffSummary
  - JsonDiffResult
  - ArrayKeySelector
  - ArrayKeyByMap
  - UnkeyedArrayMode
  - JsonDiffOptions
  - JsonConflictKind
  - JsonFieldConflict
  - JsonMergeMode
  - JsonMergeResult
  - JsonMergeOptions
  - ConflictChoice
  - PathValidationReason
  - PathLengthWarning
  - PathValidationOptions
  - PathValidationResult
  - PathTemplateOptions
  - PathTemplate
  - PathIgnoreRule
  - FsErrorCode
  - FsErrorOptions
  - FileSystemSupportStatus
  - FileSystemSupportFeatures
  - FileSystemSupportReport
  - BootCheckMode
  - BootResult
  - CachedIndexEntry
  - CollectionIndexConfig
  - CompanionStatus
  - CorruptEntry
  - HealMode
  - HealOptions
  - HealReport
  - SyncProgress
  - FileRevision
  - FsBackend
  - EmergencyLogEntry
  - FsLogEntry
  - FsLogEvent
  - FsLogInput
  - FsLogLevel
  - FsLogRotationOptions
  - ReadLogsOptions
  - BackupOptions
  - LockRetryOptions
---

# FileSystem

## Overview
Local-first directory workspace for Svelte 5 built on the File System Access API (`showDirectoryPicker`), IndexedDB handle persistence, per-path serialized writes, schema-validated adapters with stepwise migrations, partitioned query indexes, optimistic UI state, and 3-way JSON conflict resolution. Designed for Chromium desktop apps, internal tools, and single-file `file://` bundles (`csSingleFile`).

## Architectural Invariants

1. **Business files are the single source of truth; `_cs-fs/` is strictly derived:**
   All user/domain documents live in the business directory tree (for example `settings.json`, `orders/{id}.json`, `orders/{id}.pdf`). Everything inside `systemDir` (default `"_cs-fs"`)—`meta.json`, `index/<collection>/<partition>.json`, `logs/*.jsonl`, and `backups/*.bak`—is disposable cache/telemetry. Deleting `_cs-fs/` never loses domain data; `workspace.heal({ mode: "full" })` rebuilds the entire cache from disk.
2. **Singletons live in the business area, never inside `_cs-fs/`:**
   App-level files such as `settings.json` are declared with `defineSingleton({ path: "settings.json", ... })` in the business root. Declaring a singleton or collection path inside `systemDir` throws `FsError("INVALID_CONFIG")`.
3. **Single-file `file://` & `MISSING_PREFIX` enforcement:**
   Standalone `file://` HTML tools share one browser origin bucket for IndexedDB and `localStorage`. `defineWorkspace()` / `createWorkspace()` resolves its namespace from `config.namespace` or `getStoragePrefix()` (from `cs/svelte/browser-storage`). If both are empty, workspace creation immediately throws `FsError("MISSING_PREFIX")` unless a custom `backend` is injected for tests. All operations are zero-worker and make zero external network/asset requests.
4. **No overlapping path templates:**
   Every singleton, collection, and companion pattern in a workspace is checked with `assertNonOverlappingTemplates()` at startup; overlapping patterns throw `FsError("INVALID_CONFIG")`.

## Quick-Start Recipe

```ts
// main.ts (or before creating the workspace)
import { configureStoragePrefix } from "cs/svelte/browser-storage";

configureStoragePrefix("oak-workshop");
```

```ts
// workspace.ts
import {
	defineCollection,
	defineSingleton,
	defineWorkspace,
	jsonAdapter,
} from "cs/svelte/file-system";

interface Settings {
	schemaVersion: number;
	workshopName: string;
}

interface Order {
	schemaVersion: number;
	id: string;
	year: string;
	customer: string;
	status: "draft" | "done";
}

interface OrderSummary {
	id: string;
	customer: string;
	status: Order["status"];
}

export const workspace = defineWorkspace({
	singletons: {
		settings: defineSingleton({
			path: "settings.json",
			adapter: jsonAdapter<Settings>({ version: 1 }),
		}),
	},
	collections: {
		orders: defineCollection({
			pattern: "orders/{year}/{id}.json",
			paramPatterns: { year: /^\d{4}$/ },
			adapter: jsonAdapter<Order>({ version: 1 }),
			index: {
				partitionBy: (params) => params.year,
				project: (doc) =>
					({
						id: doc.id,
						customer: doc.customer,
						status: doc.status,
					}) satisfies OrderSummary,
				eagerPartitions: (year) => year === String(new Date().getFullYear()),
			},
		}),
	},
	revalidateOnFocus: true,
});
```

```svelte
<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { workspace } from "./workspace";

	onMount(async () => {
		await workspace.restore();
	});

	onDestroy(() => {
		workspace.destroy();
	});
</script>

{#if workspace.mountStatus === "unlinked"}
	<button onclick={() => workspace.pick()}>Choose Folder</button>
{:else if workspace.mountStatus === "needs-permission"}
	<button onclick={() => workspace.requestAccess()}>Grant Folder Access</button>
{:else if workspace.mountStatus === "ready"}
	<p>Loaded orders: {workspace.collections.orders.entries.length}</p>
{/if}
```

### Mount Lifecycle Methods
- `workspace.restore()`: Loads a persisted `FileSystemDirectoryHandle` from IndexedDB, checks permission (`queryPermission`), and if granted runs boot cache validation/healing and transitions `mountStatus` to `"ready"` (or `"needs-permission"`, `"unlinked"`, `"stale"`, `"unsupported"`).
- `workspace.pick(options?)`: Opens `window.showDirectoryPicker(options)`, persists the handle in IndexedDB, boots the cache engine, and transitions to `"ready"`.
- `workspace.requestAccess()`: Calls `requestPermission({ mode })` on an existing handle when `mountStatus === "needs-permission"` and boots if granted.
- `workspace.forget()`: Clears the persisted handle from IndexedDB, flushes/destroys internal engines, and resets `mountStatus` to `"unlinked"`.
- `workspace.flush()`: Awaits all queued writes, pending index shard flushes, and log flushes.
- `workspace.destroy()`: Aborts in-flight operations, stops flush timers, and removes `beforeunload` / `focus` / `visibilitychange` listeners.

## Custom Adapters

Use `defineAdapter(config)` to support non-JSON formats (CSV, Markdown, Excel/XLSX, binary blobs) or paired binary attachments.

```ts
import { defineAdapter } from "cs/svelte/file-system";

export const csvAdapter = defineAdapter<string[][]>({
	id: "csv",
	extensions: [".csv"],
	async decode(ctx) {
		// Lazy helpers: readText() or readBytes() only read the File when called.
		// ctx.file is the raw File (inspect ctx.file.size before reading large binaries).
		const text = await ctx.readText();
		const rows = text
			.trim()
			.split(/\r?\n/)
			.map((line) => line.split(","));
		return { data: rows };
	},
	async encode(rows) {
		return rows.map((row) => row.join(",")).join("\n");
	},
});
```

### Raw Writes & Paired Companion Files
- `collection.writeRaw(params, fileOrBytes, options?)`: Writes a `File`, `Uint8Array`, or `string` directly without running `adapter.encode()` (useful for binary collections or pre-encoded exports).
- **Paired `companion` files:** Declare `companion: { pattern: "orders/{year}/{id}.pdf" }` on `defineCollection()`.
  - `writeWithCompanion(params, data, companionFile, options?)`: Writes the primary record and its companion file together and updates `companionStatus` (`"present" | "missing" | "orphaned"`).
  - `readCompanion(params, options?)` / `hasCompanion(params)`: Reads or checks the companion binary (`{ path, bytes, file, revision }`).
  - `move(fromParams, toParams)` and `delete(params)` automatically move or delete the paired companion file if present.

### Built-In `jsonlAdapter`
`jsonlAdapter<TLine>(options?)` decodes/encodes newline-delimited JSON (`TLine[]`).
- `onCorruptLine`: `"skip-trailing"` (default — recovers from a half-written final line after a crash and emits `warnings`), `"skip-any"`, or `"fail"`.
- Helper encoders: `encodeJsonlLine(item)` and `encodeJsonlLines(items)`.

## Stepwise Migrations

`jsonAdapter(options)` supports two modes:

1. **Unversioned mode** (`version` omitted): Parses JSON and validates against `schema` (Standard Schema v1, e.g. Zod/Valibot/ArkType) and/or `validate` (type guard).
2. **Versioned mode** (`version: number` provided): Reads `versionField` (default `"schemaVersion"`), enforces contiguous migration steps, and runs `migrateDocument()` on decode.

```ts
import { jsonAdapter } from "cs/svelte/file-system";

interface OrderV3 {
	schemaVersion: 3;
	id: string;
	totalCents: number;
}

export const orderAdapter = jsonAdapter<OrderV3>({
	version: 3,
	minVersion: 1,
	missingVersionAs: 1, // Treat legacy files without schemaVersion as v1
	migrationWriteBack: "lazy", // "lazy" (default: migrate in memory) | "eager" (persist upgraded file on read)
	backupBeforeMigration: true, // Snapshot original file into _cs-fs/backups/ before eager write-back
	migrations: {
		1: (doc) => {
			const d = doc as { id: string; total: number };
			return { id: d.id, totalCents: Math.round(d.total * 100) };
		},
		2: {
			migrate: (doc) => ({ ...(doc as object) }),
			validate: (raw): raw is OrderV3 =>
				typeof raw === "object" && raw !== null && "totalCents" in raw,
		},
	},
});
```

- **Fail-safe newer versions:** If a file on disk has `schemaVersion > options.version`, decoding throws `FsError("UNSUPPORTED_SCHEMA_VERSION")` without modifying the file.
- **Contiguous chain validation:** If `version: 3` and `minVersion: 1`, `migrations` must define keys `1` and `2`; missing steps throw `FsError("INVALID_CONFIG")` at adapter creation time.
- **Standalone helper:** `migrateDocument(options)` runs the same stepwise chain on an in-memory value without touching disk.

## Optimistic UI, Lifecycle & Status

Indexed collections (`defineCollection({ ..., index: ... })`) expose reactive Svelte 5 state:
- `collection.entries`: Reactive array combining `confirmedEntries` (disk-backed) overlaid with `pendingMutations` (optimistic upserts, moves, deletes). Mutations appear immediately in the UI and roll back per-operation on failure without reverting unrelated concurrent writes.
- `collection.query(filter?)`: Synchronously filters `collection.entries` by `{ params, where }` or a predicate.
- `collection.list(filter?)`: Walks disk directly (for unindexed collections or full disk listing).
- On-demand partitioning: `loadedPartitions()`, `unloadedPartitions()`, `hasUnloadedPartitions()`, `loadPartitions(keys)`, `loadAllPartitions()`.

Workspace reactive status properties:
- `mountStatus`: `"unlinked" | "needs-permission" | "ready" | "stale" | "unsupported"`.
- `activity`: `"idle" | "restoring" | "reading" | "writing" | "healing"`.
- `isBusy`: `true` when `activity !== "idle" || pendingMutationCount > 0`.
- `pendingMutationCount`: Number of in-flight optimistic mutations.
- `health`: `"base"` (`unlinked`), `"negative"` (`stale`, `unsupported`, or `lastError !== null`), `"caution"` (`needs-permission`, `isBusy`, `unresolvedConflictCount > 0`, or `corruptEntries.length > 0`), or `"positive"`.
- `lastError` & `clearError()`: Captures the most recent `FsError`. Call `workspace.clearError()` after the user acknowledges an error banner to return `health` from `"negative"` to `"positive"`/`"caution"`.
- `preventCloseWhilePending` (default `true`): Registers a `beforeunload` handler that calls `event.preventDefault()` while `pendingMutationCount > 0`.
- `revalidateOnFocus` (default `false`): When `true` or `{ minIntervalMs }` (default `5000`), runs `heal({ mode: "incremental" })` when the window regains focus or becomes visible.

## Conflict Resolution

Concurrent external edits (e.g., another user or another tab editing the same file on a shared folder) are detected via optimistic concurrency control (`expectedRevision` / tracked file revisions).

Configure `conflictPolicy` at the workspace level (default `"detect"`) or per operation:
- `"detect"`: Aborts the write on revision mismatch, records a `ConflictDetails` entry in `workspace.unresolvedConflicts`, fires `onMutationConflict`, and rejects with `FsError("CONFLICT")`.
- `"auto-merge"`: Attempts `adapter.merge(base, local, remote)` (built into `jsonAdapter` via `mergeJson3Way`). If clean, writes the merged document and returns `{ merged: true }`; if any field conflicts remain, falls back to `"detect"`.
- `"last-write-wins"`: Overwrites the remote file with local data.

### Interactive Diff & 3-Way Merge UI Wiring
Pure helpers from `cs/svelte/file-system`:
- `diffJson(base, target, options?)`: Produces `{ hasChanges, summary, entries }` with JSON Pointer paths (`pointer`), typed `segments`, and optional `arrayKeyBy` entity matching (e.g. `{ items: "id" }`) and `unkeyedArrayMode` (`"atomic" | "set"`).
- `mergeJson3Way(base, local, remote, options?)`: Computes a 3-way merge (or 2-way fallback when `base` is `undefined`), flagging `"value-mismatch"`, `"delete-edit"`, `"type-mismatch"`, and `"duplicate-array-key"` conflicts.
- `applyConflictChoices(mergeResult, choices, options?)`: Applies user selections (`Record<string, "local" | "remote" | { custom: unknown }>`) keyed by `conflict.id` to produce the resolved document.

```ts
import { applyConflictChoices, type ConflictChoice } from "cs/svelte/file-system";

async function resolveInteractive(
	conflictId: string,
	choices: Record<string, ConflictChoice>,
) {
	const conflict = workspace.unresolvedConflicts.find((c) => c.id === conflictId);
	if (!conflict?.threeWay) return;

	const resolvedDoc = applyConflictChoices(conflict.threeWay, choices);
	await workspace.resolveConflict(conflictId, "apply-custom", resolvedDoc);
}
```

`workspace.resolveConflict(conflictId, resolution, customDoc?)` supports `"keep-local"`, `"keep-remote"`, and `"apply-custom"`.

## SMB / Windows Caveats

1. **Path segment safety (`validatePathSegment` / `sanitizePathSegment`):**
   Rejects empty segments, `.` / `..`, Windows-forbidden characters (`: * ? " < > | \ /` and ASCII control chars `0x00–0x1F`), trailing dots or spaces, Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1–COM9`, `LPT1–LPT9`), and segments exceeding `DEFAULT_MAX_SEGMENT_LENGTH` (`200`). `result.suggestion` provides a sanitized replacement.
2. **Two-tier `MAX_PATH` bounds:**
   `validateRelativePath()` / `normalizeRelativePath()` warns via `onWarn` at `DEFAULT_WARN_RELATIVE_PATH_LENGTH` (`180`) and throws `FsError("INVALID_PATH")` above `DEFAULT_MAX_RELATIVE_PATH_LENGTH` (`220`) to stay safely under Windows `MAX_PATH` (`260`) when mounted inside a deep user folder.
3. **Case-sensitivity:**
   `PathTemplate` matching and in-memory maps are strictly case-sensitive. Never rely on case-only filename differences on Windows/SMB shares.
4. **Ignored Office/OS files:**
   `isIgnoredPath()` automatically skips `_cs-fs/`, `~$*` (Office lock/temp files), `Thumbs.db`, `desktop.ini`, and `.DS_Store`.
5. **Opportunistic lock (`FILE_LOCKED`) retries:**
   SMB/antivirus/Excel locks trigger exponential backoff retries (`retryOnLock`, default `true`: 3 retries, 50ms base, 500ms max) before surfacing `FsError("FILE_LOCKED")`.
6. **Clock-skew-safe revisions:**
   Revision checks compare `{ size, lastModified, hash? }` for exact equality rather than `>` timestamp comparisons, preventing false negatives when NAS/SMB clocks lag behind the local machine.

## Complete `FsErrorCode` Reference

| Code | Meaning |
| :--- | :--- |
| `MISSING_PREFIX` | Neither `config.namespace` nor `configureStoragePrefix()` was set before creating a persistent workspace. |
| `INVALID_CONFIG` | Invalid adapter, overlapping path templates, non-contiguous migrations, or business path inside `systemDir`. |
| `UNSUPPORTED_ENV` | Browser lacks `showDirectoryPicker` / `indexedDB`, is not a secure context, or running in SSR. |
| `UNSUPPORTED_SCHEMA_VERSION` | File on disk has a schema version newer than the adapter's `version`. |
| `UNLINKED` | Operation attempted while `mountStatus === "unlinked"`. |
| `PERMISSION_REQUIRED` | Directory handle requires user gesture via `requestAccess()` (`mountStatus === "needs-permission"`). |
| `PERMISSION_DENIED` | User dismissed the picker/prompt or denied read/write permission. |
| `HANDLE_STALE` | Persisted directory handle is no longer valid on disk (`NotFoundError` / `InvalidStateError`). |
| `FILE_LOCKED` | File is locked by another process/OS oplock after exhausting `retryOnLock` attempts. |
| `FILE_TOO_LARGE` | File size or write payload exceeds `maxFileBytes` (default 100 MiB) or `maxJsonBytes` (default 25 MiB). |
| `NOT_FOUND` | Target file or source path for move/read/delete does not exist. |
| `INVALID_PATH` | Empty path, traversal (`..`), Windows-invalid characters/reserved name, or exceeds `maxRelativePathLength`. |
| `VALIDATION_FAILED` | Payload failed Standard Schema v1 validation, type guard, or JSON serialization. |
| `MIGRATION_FAILED` | Document version is below `minVersion` or a migration step threw an error. |
| `CORRUPT_DATA` | File contains malformed JSON or unrecoverable corrupt JSONL lines. |
| `CONFLICT` | Remote revision changed since last read/write and `conflictPolicy` is `"detect"` (or `"auto-merge"` had conflicts). |
| `ABORTED` | Operation was cancelled via `AbortSignal` or `workspace.destroy()`. |
| `IO_FAILED` | Unexpected filesystem, IndexedDB, stream, or post-write verification failure. |
