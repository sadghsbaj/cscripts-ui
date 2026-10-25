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
import { defineConfig, presetWind4 } from "unocss";
import { presetCS } from "cs/uno";

export default defineConfig({
  presets: [presetWind4(), presetCS()],
});
```

3. Svelte Components

```svelte
<script lang="ts">
  import { Dialog } from 'cs/svelte';
</script>
```

## Project Structure

- src/css/ — Tokens, reset, and standalone CSS components (src/css/components/*.css).
- src/uno/ — UnoCSS preset mirroring the CSS tokens.
- src/svelte/ — Svelte 5 components (src/svelte/components/).
- playground/ — Local Vite test app (ignored when installed in other projects).

## Local Development Workflow

1. Start the local playground to build and test:

```bash
bun dev
```

2. Add or edit files inside src/ and test them inside playground/App.svelte.

3. Push changes to GitHub:

```bash
git add .
git commit -m "update ui"
git push
```

4. Run bun update cs in any project using this package.
