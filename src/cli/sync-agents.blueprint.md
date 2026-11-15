# Sync Agents CLI — Blueprint

## 1. Overview & Scope
- **Kind:** `utility` (CLI command + template lifecycle hook)
- **Purpose:** Automatically keep `cscripts-ui`-managed `.agents/` files (`rules` and `agents`) in consuming apps synchronized with the installed `cs` package version—running silently after `bun update cs` / `bun install` via `postinstall`, and callable manually via `bun run sync:agents`.
- **Boundary:** Strictly manages `cs-*`-prefixed files inside `.agents/rules/` and `.agents/agents/`. App-owned rules, app-owned agents, and root `AGENTS.md` are never modified or deleted.

---

## 2. File & Naming Structure

### `cscripts-ui` (`template/.agents/`)
Keep `.agents/rules/` and `.agents/agents/` **flat** (no nested `cs/` subfolders) so flat file scanners (e.g., Antigravity) discover all files reliably. Prefix all library-managed files with `cs-`:
- `template/.agents/rules/`:
  - `cs-code-style.md`
  - `cs-design-and-tokens.md`
  - `cs-naming.md`
  - `cs-svelte.md`
  - `cs-work.md`
- `template/.agents/agents/` (as agents are added):
  - `cs-<name>.md`

### CLI Location
- `src/cli/sync-agents.ts` (executable Bun TypeScript file with `#!/usr/bin/env bun` shebang).

---

## 3. Public API & `package.json` Wiring

### Root `package.json` (`cs`)
Expose the CLI binary directly (no build step required with Bun):
```json
"bin": {
    "cs-sync-agents": "./src/cli/sync-agents.ts"
}
```

### `template/package.json` (Consuming App)
```json
"scripts": {
    "sync:agents": "cs-sync-agents",
    "postinstall": "bun run sync:agents"
}
```
- `bun install` / `bun update cs` in the consuming app automatically runs `postinstall` → `cs-sync-agents`.
- Developers can also trigger it manually at any time via `bun run sync:agents`.

---

## 4. Sync Behavior & Algorithm

1. **Resolve paths:**
   - `sourceRoot`: resolved relative to the script via `import.meta.dir` → `../../template/.agents`.
   - `targetRoot`: resolved from the consuming app's working directory via `process.cwd()` → `.agents`.
2. **Sync subfolders (`["rules", "agents"]`):**
   For each folder:
   - Read all `cs-*` filenames in `sourceDir` (if `sourceDir` exists).
   - If `targetDir` exists, remove every file/entry in `targetDir` whose name starts with `cs-` (ensures renamed or deleted `cs-*` files in newer `cs` versions are cleaned up).
   - If `sourceDir` has `cs-*` files, ensure `targetDir` exists (`mkdirSync(..., { recursive: true })`) and copy each `cs-*` file from `sourceDir` to `targetDir`.

---

## 5. Edge Cases & Constraints
- **Self-execution guard:** If `path.resolve(cwd, "template/.agents") === path.resolve(sourceRoot)` or `path.resolve(sourceRoot) === path.resolve(targetRoot)` (e.g. invoked inside `cscripts-ui`), exit immediately without modifying anything.
- **Offline & version-locked:** Always copies from the locally installed `node_modules/cs/template/.agents`—no GitHub network requests, no auth issues on private repos, and rules always match the installed `cs` version.
- **Missing `agents/` folder:** If `template/.agents/agents` does not exist yet, skip copying without error (and still clean up stale `cs-*` files in target `agents/` if any exist).
- **Non-goals:**
  - Never overwrite or delete non-`cs-` files in `.agents/`.
  - Never modify root `AGENTS.md`.
  - Never use `postinstall` inside `cs/package.json` itself (Bun blocks dependency lifecycle scripts by default; root `template/package.json` runs reliably).
