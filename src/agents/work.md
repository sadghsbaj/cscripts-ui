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

1. **Discover all work exports:** Read `../svelte/work/index.ts` (and the sub-indexes `../svelte/work/app-intro/index.ts`, `../svelte/work/app-layout/index.ts`, `../svelte/work/app-controls/index.ts`, `../svelte/work/locations/index.ts`).
2. **Inspect component details:** Read the `.svelte` files in `../svelte/work/app-intro/`, `../svelte/work/app-layout/`, `../svelte/work/app-controls/`, and `../svelte/work/locations/` to check exact props, context behavior, and CSS layout rules.

### Standard App Shell Composition

Every work application follows this top-level structure:

```svelte
<script lang="ts">
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppIntro,
        WorkAppMain,
        WorkAppThemeButton,
    } from "cs/svelte/work";
</script>

<WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen">
    <WorkAppFrame>
        <WorkAppHeader>
            <!-- Optional custom segments: align="start" | "center" | "end" -->
            <WorkAppHeaderSegment align="center" renderIsland>
                <!-- Central controls (tabs, segmented controls) -->
            </WorkAppHeaderSegment>

            <WorkAppHeaderSegment align="end">
                <WorkAppHelpButton onclick={() => openDocumentationModal()} />
                <WorkAppThemeButton />
            </WorkAppHeaderSegment>
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
- **`WorkAppHeader` Layout & Controls (`WorkAppHeaderSegment`):** To add custom controls (tabs, segmented controls, quick-tool buttons), wrap them in `<WorkAppHeaderSegment align="before" | "start" | "center" | "end" | "after" renderIsland={boolean}>`.
    - `align="before"`: Placed on the outer left edge before the tool identity pill (ideal for telemetry status dots like `<WorkAppStatusDot />`).
    - `align="start"`: Placed on the left directly after the tool identity pill.
    - `align="center"`: Mathematically centered to the 1280px (`--cs-container-7xl`) header container. Keep central controls concise (1-word labels, `whitespace-nowrap`).
    - `align="end"`: Placed on the right directly before the Pfleiderer brand badge (ideal for theme switcher buttons, quick actions).
    - `align="after"`: Placed on the outer right edge after the Pfleiderer brand badge.
    - `renderIsland={true}`: Wraps the segment in an elevated pill (`bg-elevated rounded-full squircle`) matching the tool title and brand badge geometry. `renderIsland={false}` (default) provides a transparent flex wrapper.
- **Header Controls (`../svelte/work/app-controls/`):** Dedicated header widgets matching the 48px header pill geometry:
    - **Theme Toggle (`WorkAppThemeButton`):** NEVER build custom theme buttons for work headers. Always use `<WorkAppThemeButton />` (exported from `cs/svelte/work`), which is already pre-configured to 48px height (`variant="elevated"`), automatically calls `theme.cycle()` on click, and renders the active theme icon with accessible aria-label.
    - **Documentation & Help Trigger (`WorkAppHelpButton` / `WorkAppDocsButton`):** Use `<WorkAppHelpButton onclick={...} />` for in-app manuals, help dialogs, or wiki links (pre-configured 48px `variant="elevated"` button, default `BookOpen` icon, customizable `icon` and `aria-label`).
    - **Status & Connection Indicator (`WorkAppStatusDot`):** Pure 12px telemetry status dot button (`status="success" | "warning" | "danger" | "base"`, `pulse={true}`) with calm `--cs-ease-cubic-out` ping animation. Designed to sit inside `<WorkAppHeaderSegment island>` or any custom status container.
- **Single-Element Centered Frame & Built-In Signature (`WorkAppFrame` & `WorkAppSignature`):** `<WorkAppFrame>` is a full-height (`100%`) flex/scroll container (`overflow-y: auto`, `scrollbar-lg`) that centers content to `--cs-container-7xl` (`1280px`) via dynamic `padding-inline` so the scrollbar stays at the outer viewport edge. It also automatically renders `<WorkAppSignature />` in the bottom-right corner (`showSignature = true`, rendering a minimalist static `size="xs"` ghost info indicator with a `top-end` tooltip "Entwickelt von Colin Schäfer"). Do NOT manually render `<WorkAppSignature />` inside `<WorkAppFrame>`.
- **Default `--cs-container-7xl` Workspace & Wide Data Tables:** Keep the `<WorkAppFrame>` workspace strictly at its default `7xl` (`1280px`) width for calm visual focus. When a work tool displays wide multi-column tables that exceed `1280px`, do NOT break the container width or cram columns until text clips—make the table horizontally scrollable (`overflow-x: auto`) inside its island and provide an elevated expand icon button (e.g., top-right on hover) that opens the table in a smooth **Fullscreen Modal** for distraction-free editing.
- **Locations (`WorkLocation` & `WORK_LOCATIONS`):** Inspect `../svelte/work/locations/index.ts` when rendering or referencing Pfleiderer DACH site maps (`baruth`, `arnsberg`, `gütersloh`, `leutkirch`, `neumarkt`).
