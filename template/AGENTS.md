# Project Agent Instructions

This project uses the `cs` library for UI, CSS foundation, UnoCSS, and ESLint.

## Rules & API Verification

- **General Rules (`.agents/rules/`):** Project-wide design, styling, Svelte 5, code-style, and work-app rules live in `.agents/rules/` and are auto-loaded by Antigravity.
- **Managed `cs-*` Files:** Files prefixed with `cs-` in `.agents/rules/` and `.agents/agents/` are managed by `cs` and automatically updated on `bun update cs` / `bun install` (via `postinstall` / `bun run sync:agents`). Create custom app rules and agents **without** the `cs-` prefix so they are never overwritten.
- **Module APIs (`cs/svelte/*`):** NEVER guess `cs` class names, UnoCSS shortcuts, CSS tokens, or component props. Before using or modifying any module, read `./node_modules/cs/src/modules/<name>/<name>.docs.md` (or `./node_modules/cs/src/work/<submodule>/<submodule>.docs.md` for `cs/svelte/work`).
- **Reference Compositions (`cs/src/references`):** Before building multi-component views, forms, toolbars, or full app layouts, inspect `./node_modules/cs/src/references/INDEX.md` and read matching `*.svelte` / `*.docs.md` files for composition and layout inspiration.
- **Verification:** Run `bun run check`, `bun run lint` (`bunx --bun eslint .`), and `bun run test` (Vitest; `bun run test:e2e` for Playwright browser specs) after edits.

## Isolated `/lab` Sandbox

- For isolated UI experiments or prototypes under `/lab`, read `src/lab/LAB.md` before making changes and keep all edits strictly inside `src/lab/`.
