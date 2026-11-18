---
trigger: glob
globs: "**/src/modules/file-system/**"
---

# Rule: File System Invariants

<meta>
  <scope>Persistence kernel, cache engine, adapters, and browser/OPFS safety for src/modules/file-system/</scope>
  <applies_to>**/src/modules/file-system/**</applies_to>
  <version>1.0</version>
</meta>

<principles>
  - Read `src/modules/file-system/file-system.internal.md` and `src/modules/file-system/cache-engine.internal.md` (plus `file-system.docs.md` for public API changes) before editing, and update them in lockstep when behavior changes.
  - Keep `src/modules/file-system/` strictly headless: zero UI components, Svelte markup, or UnoCSS; UI belongs in consuming apps or `src/work/`.
</principles>

<patterns>
  <deliberate_decisions>
    - **No Workers / `BroadcastChannel` / `FileSystemObserver` / external URLs:** `csSingleFile` and `file://` opaque origins require zero external fetches or workers. Cross-tab coordination uses pull-based boot checks, throttled `revalidateOnFocus`, and `navigator.locks`.
    - **No `{ data }` wrapper; `settings` outside `systemDir`:** Business files remain human-readable. `_cs-fs/` is strictly disposable cache/telemetry and must remain 100% recoverable via `heal({ mode: "full" })`.
    - **Fail-fast `MISSING_PREFIX`:** `file://` origins share one `IndexedDB`/`localStorage` bucket; silent prefix fallback risks cross-app handle overwrites.
    - **Strict `FileRevision` equality (`size`, `lastModified`, `hash`):** Avoids NAS/SMB client-clock-skew false negatives.
    - **Browser / `file://` degradation:** Guard `file://` and missing `showDirectoryPicker` / `IndexedDB` capabilities before access, degrading cleanly to `mountStatus: "unsupported"`.
  </deliberate_decisions>

  <concurrency_and_state_invariants>
    - **Dirty-flag & version order:** Clear dirty/meta flags only *after* the disk write or delete succeeds, and only if the generation/version still matches.
    - **Async epoch & destroy guards:** Check `mountEpoch` and `destroyed` after every `await` (`pick()`, `restore()`, `requestAccess()`, `runBootCheck()`, `heal()`, `loadPartitions()`, and mutations) before mutating state.
    - **Queue & barrier ordering:** Serialize disk mutations through `WriteQueue`. `heal()` must await `#activeFlush` and hold `#isHealing` before acquiring `withGlobalBarrier(...)`.
    - **OCC & companion symmetry:** Keep `expectedRevision` checks symmetric across `write`, `writeRaw`, `writeWithCompanion`, `update`, `move`, `delete`, `singleton.*`, and `resolveConflict`. `writeWithCompanion()` must validate/encode and resolve primary OCC/conflict *before* writing the companion (or roll back on failure).
    - **Cache & projection lookups:** Optimistic `move()` projection must use raw `trackedDocs` (never double-`project()`). `writeRaw` revision lookup must use `trackedDocs` + `activeCache.getRevision`. `loadPartitions()` triggers incremental `heal()` on missing or corrupt shards rather than silently returning 0 entries, and unparseable data files surface via `corruptEntries`.
  </concurrency_and_state_invariants>
</patterns>

<constraints>
  - MUST NOT re-export any `*.internal.*` file from `src/modules/file-system/index.ts`.
  - MUST NOT use `any`, non-null assertions (`!`), or `eslint-disable` comments.
  - MUST guarantee `mode: "read"` performs zero disk mutations (including `_cs-fs/` writes and eager migration write-back).
  - MUST abort fail-safely on migration or validation failure, leaving disk untouched.
  - MUST reject invalid Windows/SMB path segments with `INVALID_PATH` instead of silently rewriting.
  - MUST keep `localStorage` emergency logs payload-free and bounded.
  - MUST follow `.agents/rules/naming.md` for file names (`*.internal.*`) and TypeScript symbols, and keep `*.internal.md`, `file-system.docs.md`, and Vitest/Playwright tests synchronized with behavioral changes.
</constraints>
