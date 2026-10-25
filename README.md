# cs (cscripts-ui)

Personal UI & CSS foundation. Zero build-step package exporting raw CSS, UnoCSS presets, and Svelte 5 components.

## Install & Update (in other projects)

Install directly from GitHub (gets added as "cs" in "package.json")

```bash
bun add github:sadghsbaj/cscripts-ui
```

Pull latest changes from main:

```bash
bun update cs
```

## Usage

1. CSS (main.ts or app.css)

```ts
// Load everything (reset, tokens, all components)
import "cs/css";
// Or load single components
import "cs/css/button";
```

2. UnoCSS
   Maps CSS variables from src/css to UnoCSS utilities:

```ts
import { presetCS } from "cs/uno";
import { defineConfig } from "unocss";

export default defineConfig({
    presets: [presetCS()],
});
```

`presetCS()` already includes `presetWind4`, the Svelte extractor, `transformerDirectives` and `transformerVariantGroup`. Do not add them again.

3. ESLint
   One import bundles all rules (base rules, Svelte, UnoCSS, unicorn, custom rules, Prettier):

```ts
// eslint.config.ts
import cs from "cs/eslint";

export default cs;
```

Extend or override by spreading it:

```ts
export default [...cs, { rules: { "no-console": "off" } }];
```

All plugins ship with `cs`; the project itself only needs `eslint` (`bun add -d eslint`). Individual rule sets (e.g. `svelteConfig`, `unicornConfig`) are also exported from `cs/eslint`. Keep `typescript` on `~6`, since typescript-eslint does not support TypeScript 7 yet.

4. Svelte Components

```svelte
<script lang="ts">
    import { Dialog } from "cs/svelte";
</script>
```

## Project Structure

- src/css/ — Tokens, reset, and standalone CSS components (src/css/components/*.css).
- src/uno/ — UnoCSS preset (theme, variants, rules, shortcuts) mirroring the CSS tokens.
- src/eslint/ — Shared ESLint flat config, exported as `cs/eslint`.
- src/vite/ — Vite plugins (`csTheme`), exported as `cs/vite`.
- template/ — Starter for new projects; copy it and adjust `index.html` (title, app name).
- src/svelte/ — Svelte 5 components (src/svelte/components/).
- playground/ — Local Vite test app (ignored when installed in other projects).

## Local Development Workflow

1. Start the local playground to build and test:

```bash
bun dev
```

2. Add or edit files inside src/ and test them inside playground/App.svelte. Run `bun lint` and `bun typecheck` before pushing.

3. Push changes to GitHub:

```bash
git add .
git commit -m "update ui"
git push
```

4. Run bun update cs in any project using this package.
