# Project Agent Instructions

This project uses the `cs` library for UI, CSS foundation, UnoCSS, and ESLint.

## Rules & API Verification

- **General Rules (`.agents/rules/`):** Project-wide design, styling, Svelte 5, code-style, and work-app rules live in `.agents/rules/` and are auto-loaded by Antigravity.
- **Module APIs (`cs/svelte/*`):** NEVER guess `cs` class names, UnoCSS shortcuts, CSS tokens, or component props. Before using or modifying any module, read `./node_modules/cs/src/modules/<name>/<name>.docs.md` (or `./node_modules/cs/src/work/<submodule>/<submodule>.docs.md` for `cs/svelte/work`).
- **Verification:** Run `bun run typecheck` and `bun run lint` (`bunx --bun eslint .`) after edits.

## Isolated `/lab` Sandbox

- For isolated UI experiments or prototypes under `/lab`, read `src/lab/LAB.md` before making changes and keep all edits strictly inside `src/lab/`.
