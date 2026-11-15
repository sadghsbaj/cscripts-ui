# cs (cscripts-ui)

Zero-build-step UI and CSS foundation exporting raw CSS tokens, UnoCSS presets, ESLint config, Vite plugins, and Svelte 5 modules.

## New Project & Updates

Start a new project by copying `template/`. Its `postinstall` script runs `cs-sync-agents` automatically to sync `cs-*` rules and agents into `.agents/`.

Install or update in an existing project:

```bash
bun add github:sadghsbaj/cscripts-ui
bun update cs
```

## Exports

| Export               | Description                                                    |
| :------------------- | :------------------------------------------------------------- |
| `cs/css`             | CSS foundation (reset, design tokens, global styles)           |
| `cs/uno`             | UnoCSS preset (`presetCS()`) mirroring CSS tokens              |
| `cs/eslint`          | Shared ESLint flat config (`eslint >= 10`, `typescript ~6`)    |
| `cs/vite`            | Vite plugins (`csTheme`, `csFont`, `csLucide`, `csSingleFile`) |
| `cs/svelte/<module>` | Svelte 5 UI modules and attachments (`src/modules/<module>/`)  |
| `cs/svelte/work`     | Internal work application shell (`src/work/`)                  |

For component APIs, tokens, and usage examples, run the local playground or inspect co-located `*.docs.md` files under `src/modules/` and `src/work/`.

## Development

```bash
bun dev           # Start local playground & docs
bun run test      # Run Vitest unit/DOM tests
bun run lint      # Run ESLint across the repo
bun run typecheck # Run TypeScript & Svelte checks
bun run build:docs
```
