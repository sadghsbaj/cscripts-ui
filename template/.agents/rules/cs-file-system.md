---
trigger: model_decision
description: "Rules for applications using cs/svelte/file-system local directory workspaces, IndexedDB handle persistence, and file:// single-file compatibility."
---

# Rule: File System Workspaces (`cs/svelte/file-system`)

<meta>
  <scope>Workspace lifecycle, UI state handling, conflict/migration patterns, and file:// safety for cs/svelte/file-system</scope>
  <applies_to>Applications integrating cs/svelte/file-system</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Treat `cs/svelte/file-system` as a local-first workspace backed by human-readable business files; never build parallel `localStorage` or `IndexedDB` business stores or wrapper abstractions around it.
  - Read `./node_modules/cs/src/modules/file-system/file-system.docs.md` (and `./node_modules/cs/src/modules/file-system/index.ts` for exact types) before designing or implementing workspace persistence.
</principles>

<patterns>
  <bootstrap_and_lifecycle>
    - **Prefix & `file://` isolation:** Call `configureStoragePrefix(...)` (from `cs/svelte/browser-storage`) or pass an explicit `namespace` before `defineWorkspace()` / `createWorkspace()` to prevent `MISSING_PREFIX` errors and cross-app handle collisions on `file://`.
    - **Single owner & teardown:** Maintain a single `createWorkspace()` owner per domain/root (pair component-scoped instances with `onDestroy(() => workspace.destroy())`). Never store raw `FileSystemDirectoryHandle` instances outside the workspace or its IDB store.
    - **Mount & gestures:** Call `restore()` silently in `onMount()`; invoke `pick()` and `requestAccess()` strictly from direct user gestures (`onclick`) without interrupting animated intros. Use `forget()` to unlink and `flush()` before exports, exits, or test assertions.
    - **`file://` & restricted browser compatibility:** Avoid Web Workers or external fetches when bundling with `csSingleFile`; handle `mountStatus === "unsupported"` cleanly when `showDirectoryPicker` or `IndexedDB` is unavailable.
  </bootstrap_and_lifecycle>

  <state_reads_and_mutations>
    - **Complete UI state machine:** Handle all `mountStatus` values (`"unlinked" | "needs-permission" | "ready" | "stale" | "unsupported"`), `mode` (`"read" | "readwrite"` in `WorkspaceConfig`), `activity` / `syncProgress`, `lastError` with explicit `clearError()`, `corruptEntries`, and `unresolvedConflicts`.
    - **Cache projections vs async reads:** Bind UI lists to reactive `$derived` `collections.<name>.entries` or synchronous `query()` for projected cache entries, and use async `read()` to load full records on demand from disk. Never mutate returned objects in-place; always persist changes via `write`, `update`, `move`, or `delete`.
    - **Large collections:** Configure `index` + `partitionBy` and `loadPartitions()` rather than `list()` + `read()` loops.
    - **Migrations, conflicts & companions:** Keep `version` and `migrations` contiguous and choose `migrationWriteBack: "eager" | "lazy"` intentionally. Prefer `"detect"` or `"auto-merge"` with an interactive UI (`unresolvedConflicts`, `applyConflictChoices`, `resolveConflict`) over blind `"last-write-wins"`, and expose `heal()` for cache recovery. Validate user-entered IDs/filenames with `validatePathSegment()` / `sanitizePathSegment()`, keep Singleton `path`, Collection `pattern`, and `companion.pattern` non-overlapping, and use `writeWithCompanion()` for coordinated primary + companion writes.
  </state_reads_and_mutations>
</patterns>

<constraints>
  - MUST read `./node_modules/cs/src/modules/file-system/file-system.docs.md` before implementing `cs/svelte/file-system` persistence.
  - MUST keep all app records and settings files outside `systemDir` (`_cs-fs/`).
  - MUST NOT persist domain records in `IndexedDB` or `localStorage`, or import `*.internal.*` files from `cs/src/modules/file-system/`.
  - MUST NOT instantiate duplicate workspaces for the same `namespace` without calling `destroy()` first.
  - MUST handle `"needs-permission"`, `"stale"`, `"unsupported"`, and conflict states explicitly whenever interactive writes are supported.
</constraints>
