# MemoryFsBackend — Internal Engineering Notes

> **Do not rename to `*.internal.docs.md`:** `playground/PreviewView.svelte` globs `../src/modules/**/*.docs.md` by folder, so a second `.docs.md` file would collide with `file-system.docs.md`.

## Purpose

`MemoryFsBackend` (`src/modules/file-system/memory-fs.internal.ts`) implements `FsBackend` entirely in memory so Vitest unit, contract, and chaos suites can deterministically test `WriteQueue`, `CacheEngine`, and `Workspace` without browser OPFS or `showDirectoryPicker`.

## Constructor Options (`MemoryFsBackendOptions`)

- `maxFileBytes?: number` (default `DEFAULT_MAX_FILE_BYTES`, `100 MiB`): Enforced on `readFile`, `readBytes`, and `writeBytes`, throwing `FsError("FILE_TOO_LARGE")`.
- `clockSkewMs?: number` (default `0`): Offset added to `Date.now()` in `#nextTimestamp()` (also mutable at runtime via `backend.clockSkewMs = ...`).
- `nativeMoveMode?: NativeMoveFaultMode` (default `"supported"`): Controls `moveFile()` behavior (`"supported" | "unavailable" | "fail-once" | "always-fail"`).

## Fault, Oplock, Stream-Abort & External-Mutation Simulation API

### File Locks & Error Injection
- `simulateFileLocked(path, count = Infinity)`: Schedules `FsError("FILE_LOCKED")` for the next `count` operations touching `path` (`readFile`, `readBytes`, `stat`, `writeBytes`, `deleteFile`, `moveFile`, `exists`). Used to test `WriteQueue` `retryOnLock` exponential backoff and exhaustion.
- `simulateError(path, code, count = Infinity)`: Schedules any `SimulatedFaultCode` (`"FILE_LOCKED" | "HANDLE_STALE" | "PERMISSION_DENIED" | "IO_FAILED"`) for `count` operations on `path`.
- `clearFault(path)`: Clears any pending fault and stream-abort counter for `path`.

### Stream Aborts & Native Move Fallbacks
- `simulateStreamAbort(path, count = 1)`: Throws `FsError("ABORTED")` inside `writeBytes()` **after** size checks and **before** committing to `#files`, simulating a crashed `FileSystemWritableFileStream` so prior file contents remain untouched.
- `simulateNativeMoveFailure(mode)`: Sets `nativeMoveMode` (`"supported" | "unavailable" | "fail-once" | "always-fail"`). When native move is unavailable or fails, `moveFile()` runs the verified copy + SHA-256 hash check + `deleteFile()` fallback and increments `backend.nativeMoveFallbackCount`.

### External Mutations & Clock Skew
- `async injectExternalFile(path, bytes, lastModified?)`: Writes directly to `#files` (bypassing `WriteQueue` and `CacheEngine`) to simulate another user/tab creating or modifying a file on an SMB share. Returns `Promise<FileRevision>` (`{ size, lastModified }`).
- `deleteExternalFile(path)`: Deletes directly from `#files` to simulate external deletion (returns `boolean`).
- `setExternalMtime(path, lastModified)`: Updates `lastModified` on an existing file without changing its bytes (throws `FsError("NOT_FOUND")` if missing).
- `clockSkewMs` getter/setter: Simulates NAS/SMB clock skew where file `lastModified` timestamps are in the past or future relative to `Date.now()`. `#nextTimestamp()` guarantees strictly monotonic timestamps per backend instance (`candidate > #lastTimestamp ? candidate : #lastTimestamp + 1`).

## `readFile()` & `removeDir()` Behavior
- **`readFile()` parity with `readBytes()`:** `readFile(path, options?)` performs the same pre-read checks as `readBytes()`: checks `options?.signal?.aborted` (throwing `FsError("ABORTED")`), calls `this.#consumeFault(path)`, verifies file existence (`FsError("NOT_FOUND")`), and enforces `options?.maxFileBytes ?? this.#maxFileBytes` (`FsError("FILE_TOO_LARGE")`).
- **`removeDir(dirPath, { recursive })`:** When `!recursive` (default), checks both `#files` and `#dirs` for any entry starting with `${dirPath}/` and throws `FsError("IO_FAILED")` if non-empty (ensuring empty subdirectories still prevent non-recursive removal). When `recursive` is `true`, deletes all matching `#files` and `#dirs` entries.
