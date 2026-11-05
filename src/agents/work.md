# `cs` Internal Work Applications (`cs/svelte/work`)

All paths below are relative to `./node_modules/cs/src/agents/`.
This guide applies when building internal company (Pfleiderer) tools and applications.

## 1. Standard Build & Font Setup (`vite.config.ts`)

Internal work applications almost always run as standalone, server-free tools (e.g., opened directly from a local folder or company network share) and use the bundled **Inter** font:

```ts
import { csFont, csSingleFile, csTheme } from "cs/vite";

// In vite.config.ts plugins:
csTheme({ mode: "system" }),
csFont({ sans: "inter" }),
csSingleFile({ enabled: true }),
```

- Unless the user explicitly requests a classic server-hosted build, always configure `csFont({ sans: "inter" })` and `csSingleFile({ enabled: true })` for work tools so `vite build` produces a single self-contained `dist/index.html` with all assets, icons, and fonts embedded.

## 2. Work Application Shell & Primitives (`../svelte/work/`)

NEVER invent custom app headers, brand logos, intro screens, or page wrappers for internal work tools. Always use the built-in work primitives exported exclusively from `cs/svelte/work`:

1. **Discover all work exports:** Read `../svelte/work/index.ts` (and the sub-indexes `../svelte/work/app-intro/index.ts`, `../svelte/work/app-layout/index.ts`, `../svelte/work/locations/index.ts`).
2. **Inspect component details:** Read the `.svelte` files in `../svelte/work/app-intro/`, `../svelte/work/app-layout/`, and `../svelte/work/locations/` to check exact props, context behavior, and CSS layout rules.

### Standard App Shell Composition

Every work application follows this top-level structure:

```svelte
<script lang="ts">
    import { WorkAppFrame, WorkAppHeader, WorkAppIntro, WorkAppMain } from "cs/svelte/work";
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen">
    <WorkAppFrame>
        <WorkAppHeader>
            <!-- Optional central header controls (tabs, segmented controls, actions) -->
        </WorkAppHeader>

        <WorkAppMain>
            <!-- Primary application workspace islands -->
        </WorkAppMain>
    </WorkAppFrame>
</WorkAppIntro>
```

### Key Architectural Behaviors (DO NOT RE-IMPLEMENT)

- **Identity Context (`WorkAppIntro` -> `WorkAppHeader`):** `<WorkAppIntro>` provides `toolCategory` and `toolName` via Svelte context (`getWorkAppIdentity`). `<WorkAppHeader>` automatically reads `toolName` from this context for its left pill without needing redundant props.
- **Built-In Brand Badge (`WorkAppBrand`):** `<WorkAppHeader>` automatically renders `<WorkAppBrand />` (the Pfleiderer logo pill) on its right edge by default (`showBrand = true`). Do NOT manually place `<WorkAppBrand />` inside `<WorkAppHeader>`—any `children` passed to `<WorkAppHeader>` are positioned between the left tool-name pill and the right brand pill.
- **Single-Element Centered Frame & Built-In Signature (`WorkAppFrame` & `WorkAppSignature`):** `<WorkAppFrame>` is a full-height (`100%`) flex/scroll container (`overflow-y: auto`, `scrollbar-lg`) that centers content to `--cs-container-5xl` (`1024px`) via dynamic `padding-inline` so the scrollbar stays at the outer viewport edge. It also automatically renders `<WorkAppSignature />` in the bottom-right corner (`showSignature = true`, layered at `z-index: -1` inside `#app`'s isolated stacking context so workspace cards naturally slide over it on narrower laptops). Do NOT manually render `<WorkAppSignature />` inside `<WorkAppFrame>`.
- **Locations (`WorkLocation` & `WORK_LOCATIONS`):** Inspect `../svelte/work/locations/index.ts` when rendering or referencing Pfleiderer DACH site maps (`baruth`, `arnsberg`, `gütersloh`, `leutkirch`, `neumarkt`).
