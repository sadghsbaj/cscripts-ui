---
name: WorkAppLayout
kind: component
import: cs/svelte/work
exports:
  - WorkAppFrame
  - WorkAppHeader
  - WorkAppHeaderSegment
  - WorkAppMain
  - WorkAppSignature
  - WorkAppBrand
  - WorkAppViewStage
  - workAppViewIn
  - workAppViewOut
  - WORK_APP_HEADER_SEGMENT_ALIGNMENTS
  - WORK_APP_VIEW_TRANSITION_AXES
  - WORK_APP_VIEW_TRANSITION_DIRECTIONS
  - WorkAppHeaderSegmentAlignment
  - WorkAppHeaderSegmentProps
  - WorkAppFrameProps
  - WorkAppHeaderProps
  - WorkAppMainProps
  - WorkAppSignatureProps
  - WorkAppBrandProps
  - WorkAppViewKey
  - WorkAppViewStageProps
  - WorkAppViewTransitionAxis
  - WorkAppViewTransitionDirection
  - WorkAppViewTransitionOptions
---

# WorkAppLayout

## Overview
Application shell primitives (`WorkAppFrame`, `WorkAppHeader`, `WorkAppHeaderSegment`, `WorkAppMain`, `WorkAppViewStage`, `WorkAppSignature`, `WorkAppBrand`) and view transitions (`workAppViewIn`, `workAppViewOut`) for Pfleiderer internal tools, providing centered responsive framing, a segmented pill header, view-switching staging, and brand/creator watermarks.

## API

### `WorkAppFrame`
Root page container (`<div class="cs-work-app-frame">`) extending `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `showSignature` | `boolean` | No | `true` | Automatically renders `<WorkAppSignature />` in the bottom-right corner. |

### `WorkAppHeader`
Top navigation bar (`<header class="cs-work-app-header">`) extending `HTMLAttributes<HTMLElement>`. Renders the tool identity pill on the left, a flexible spacer, child segments, and optionally `<WorkAppBrand />` on the right.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `toolName` | `string` | No | `undefined` | Displayed tool title. Falls back to `toolName` from `<WorkAppIntro />` context (`getWorkAppIdentity()`). |
| `showBrand` | `boolean` | No | `true` | Automatically renders `<WorkAppBrand />` on the right side of the header. |

### `WorkAppHeaderSegment`
Positioned slot (`<div class="cs-work-app-header-segment">`) inside `<WorkAppHeader />` extending `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<div>` element reference. |
| `align` | `WorkAppHeaderSegmentAlignment` | Yes | — | Horizontal flex/overlay slot: `"before" \| "start" \| "center" \| "end" \| "after"`. |
| `renderIsland` | `boolean` | No | `undefined` | Wraps the segment in an elevated pill surface (`data-island`). |
| `island` | `boolean` | No | `false` | Deprecated alias for `renderIsland`. |

- `data-alignment={align}`
- `data-island` (present when `renderIsland ?? island` is truthy)

### `WorkAppMain`
Main content container (`<main class="cs-work-app-main">`) extending `HTMLAttributes<HTMLElement>`.

### `WorkAppViewStage`
Grid-layered view container (`<div class="cs-work-app-view-stage">`) extending `HTMLAttributes<HTMLDivElement>`. Overlays entering and exiting child views in `grid-area: 1 / 1` so container height stays `max(out, in)` during transitions, and saves/restores scroll positions per `activeKey`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `activeKey` | `WorkAppViewKey` (`string \| number`) | No | `undefined` | Key identifying the active view; sets `data-active-key` and drives scroll save/restore. |
| `scrollContainer` | `HTMLElement \| Window \| null` | No | `undefined` | Explicit scroll container. When omitted, resolves the nearest `.cs-scroll-area-content`, scrollable ancestor, or `document.scrollingElement`. |
| `restoreScroll` | `boolean` | No | `true` | Saves the outgoing view's scroll offset and restores the incoming view's saved offset (`0` on first visit) when `activeKey` changes. |
| `ref` | `HTMLElement \| null` (`$bindable`) | No | `null` | Root `<div>` element reference. |

- `data-active-key={activeKey !== undefined ? String(activeKey) : undefined}`

### `workAppViewIn` / `workAppViewOut`
Svelte transition functions `(node: HTMLElement, options?: WorkAppViewTransitionOptions) => TransitionConfig` for view switching inside `<WorkAppViewStage />`. Both return `{ duration: 0, delay: 0 }` when `prefers-reduced-motion: reduce` is active.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `axis` | `WorkAppViewTransitionAxis` (`"x" \| "y"`) | No | `"y"` | Slide axis (`"y"` includes subtle scaling; `"x"` is horizontal translation only). |
| `direction` | `WorkAppViewTransitionDirection` (`1 \| -1`) | No | `1` | Travel direction multiplier (`1` or `-1`). |
| `distance` | `number` | No | `workAppViewIn`: `10` (`y`) / `16` (`x`); `workAppViewOut`: `6` (`y`) / `12` (`x`) | Translation distance in pixels. |
| `duration` | `number` | No | `workAppViewIn`: `220` (`y`) / `180` (`x`); `workAppViewOut`: `110` (`y`) / `100` (`x`) | Transition duration in milliseconds. |
| `delay` | `number` | No | `workAppViewIn`: `70` (`y`) / `60` (`x`); `workAppViewOut`: `0` | Delay before transition starts in milliseconds. |
| `easing` | `(t: number) => number` | No | `workAppViewIn`: `quartOut` (`y`) / `cubicOut` (`x`); `workAppViewOut`: `cubicIn` (`y`) / `quadIn` (`x`) | Svelte easing function. |

### `WorkAppSignature`
Fixed bottom-right creator info button (`<button type="button" class="cs-work-app-signature">`) with a left-placed tooltip and `<HitArea size="md" />`, extending `Omit<HTMLAttributes<HTMLButtonElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | No | `"Entwickelt von Colin Schäfer"` | Tooltip and `aria-label` text. |

### `WorkAppBrand`
Non-interactive elevated pill badge (`<div class="cs-work-app-brand">`) rendering `<WorkLogo />`, extending `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

## Examples

```svelte
<script lang="ts">
    import { HitArea } from "cs/svelte/hit-area";
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppMain,
        WorkAppStatusDot,
        WorkAppThemeButton,
    } from "cs/svelte/work";
</script>

<WorkAppFrame>
    <WorkAppHeader toolName="Holzanalysen">
        <WorkAppHeaderSegment align="before" renderIsland>
            <WorkAppStatusDot status="positive">
                <HitArea size="md" />
            </WorkAppStatusDot>
        </WorkAppHeaderSegment>
        <WorkAppHeaderSegment align="end">
            <WorkAppHelpButton onclick={openHelp} />
            <WorkAppThemeButton />
        </WorkAppHeaderSegment>
    </WorkAppHeader>
    <WorkAppMain>
        <!-- Page content -->
    </WorkAppMain>
</WorkAppFrame>
```

### View Transitions with `WorkAppViewStage`

```svelte
<script lang="ts">
    import {
        WorkAppMain,
        WorkAppViewStage,
        workAppViewIn,
        workAppViewOut,
    } from "cs/svelte/work";

    let activeView = $state<"overview" | "details">("overview");
</script>

<WorkAppMain>
    <WorkAppViewStage activeKey={activeView}>
        {#if activeView === "overview"}
            <div in:workAppViewIn out:workAppViewOut>
                <!-- Overview content -->
            </div>
        {:else}
            <div in:workAppViewIn={{ axis: "x", direction: 1 }} out:workAppViewOut={{ axis: "x", direction: 1 }}>
                <!-- Details content -->
            </div>
        {/if}
    </WorkAppViewStage>
</WorkAppMain>
```

## Behavior & Quirks
- **Header scope (global vs. app-specific):** `<WorkAppHeader />` is strictly reserved for **global app-level elements** (tool name, live status, help, theme, brand). App-specific navigation, filters, or business context (e.g. `Plant · Line`) belong in the app content area (`<WorkAppMain />`), not in header segments.
- **Custom header button height (`48px`):** `<Button size="xl" />` alone is `44px`, whereas `<WorkAppHeader />` items are `48px`. Custom `<Button />` controls placed inside `<WorkAppHeader />` must therefore set `--cs-button-height: 48px` (optionally paired with `size="xl"` for matching typography and padding) to align cleanly at `48px` with `WorkAppToolIdentity`, `<WorkAppBrand />`, `<WorkAppHelpButton />`, and `<WorkAppThemeButton />`.
- **Context-driven header title:** `<WorkAppHeader />` calls `getWorkAppIdentity()` and falls back to `identity.toolName` when `toolName` is not passed explicitly.
- **Segment ordering:** Header flex order places `"before"` (`5`) before the tool identity pill (`10`), `"start"` (`20`), un-segmented children (`25`), spacer (`30`), `"end"` (`40`), `<WorkAppBrand />` (`50`), and `"after"` (`60`). `"center"` is absolutely centered (`left: 50%; transform: translateX(-50%)`).
- **View stage overlap & exit locks:** `<WorkAppViewStage />` places direct children in `grid-area: 1 / 1` so entering and exiting views overlap without layout jumps. `workAppViewOut` sets `node.inert = true`, `pointer-events: none`, and `data-exiting` on start, while `workAppViewIn` clears those locks on intro start so rapid reversals never leave a view stuck inert.
- **Responsive signature:** `<WorkAppSignature />` is hidden on viewports narrower than `640px`.
- **Responsive gutter:** `<WorkAppFrame />` enforces a minimum `48px` horizontal padding while centering content up to `--cs-container-7xl`.
