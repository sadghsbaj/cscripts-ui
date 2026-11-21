---
name: Collapsible
kind: component
import: cs/svelte/collapsible
exports:
  - Collapsible
  - COLLAPSIBLE_AXES
  - COLLAPSIBLE_MOTIONS
  - CollapsibleAxis
  - CollapsibleMotion
  - CollapsibleState
  - CollapsibleProps
---

# Collapsible

## Overview
Standalone disclosure primitive (`<Collapsible />`) built on CSS Grid `0fr` ↔ `1fr` track transitions along vertical or horizontal axes. Supports partial collapse (`collapsedSize` + `fadeMask`), horizontal reveals, and serves as the low-level foundation for future `accordion` and non-virtualized `tree` modules.

## API

### `Collapsible` Props
Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `open` | `boolean` | No | `false` | `$bindable` expanded state. |
| `axis` | `CollapsibleAxis` | No | `"vertical"` | Collapse/expand axis: `"vertical" \| "horizontal"`. |
| `motion` | `CollapsibleMotion` | No | `"slide"` | Inner content motion preset: `"slide" \| "swell" \| "fade" \| "none"`. |
| `animate` | `boolean` | No | `true` | Enables animated transitions; when `false`, forces `data-motion="none"` and `data-instant`. |
| `collapsedSize` | `string` | No | `undefined` | CSS length for partial collapse (sets `--cs-collapsible-collapsed-size`); keeps content mounted and interactive. |
| `fadeMask` | `boolean` | No | `false` | Applies a surface-agnostic gradient `mask-image` that fades the clipped edge when collapsed and slides away when open. |
| `keepMounted` | `boolean` | No | `true` | Keeps children mounted in the DOM while closed; forced to `true` when `collapsedSize` is set. |
| `disabled` | `boolean` | No | `false` | Sets `data-disabled` on the root element. |
| `id` | `string` | No | `$props.id()` | Root element `id` (pair with `aria-controls` on external triggers). |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-collapsible`. |
| `style` | `string` | No | `undefined` | Inline styles merged with `--cs-collapsible-collapsed-size` when `collapsedSize` is set. |
| `children` | `Snippet` | No | `undefined` | Content rendered inside `.cs-collapsible-inner`. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | No | — | Forwarded to the root `<div>` (including `ontransitionend`). |

### `data-*` Attributes
- `data-open`: present when the grid track is in the open state.
- `data-axis={axis}`: `"vertical"` or `"horizontal"`.
- `data-motion={effectiveMotion}`: `"slide"`, `"swell"`, `"fade"`, or `"none"`.
- `data-state={collapsibleState}`: `"opening" | "open" | "closing" | "closed"` (`CollapsibleState`).
- `data-instant`: present on initial mount when `open` starts `true` (cleared after the first frame) or whenever `animate` is `false`.
- `data-disabled`: present when `disabled` is `true`.
- `data-collapsed-size`: present when `collapsedSize` is set.
- `data-fade-mask`: present when `fadeMask` is `true`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-collapsible-dur-enter` | `var(--cs-dur-240)` | Grid track, swell, and mask enter duration. |
| `--cs-collapsible-dur-exit` | `var(--cs-dur-160)` | Grid track, swell, and mask exit duration. |
| `--cs-collapsible-ease-enter` | `var(--cs-ease-quart-out)` | Grid track, swell, and mask enter easing. |
| `--cs-collapsible-ease-exit` | `var(--cs-ease-exit)` | Grid track, opacity, swell, and mask exit easing. |
| `--cs-collapsible-fade-dur-enter` | `var(--cs-dur-effect)` | Opacity enter duration for `"fade"` and `"swell"` motions. |
| `--cs-collapsible-fade-dur-exit` | `var(--cs-dur-effect-fast)` | Opacity exit duration for `"fade"` and `"swell"` motions. |
| `--cs-collapsible-swell-distance` | `6px` | Initial negative translation offset along the active axis for `"swell"` motion. |
| `--cs-collapsible-swell-scale` | `0.985` | Initial scale factor for `"swell"` motion. |
| `--cs-collapsible-collapsed-size` | `0px` (fallback) | Minimum block/inline size of `.cs-collapsible-inner` when collapsed (set automatically by `collapsedSize`). |
| `--cs-collapsible-fade-size` | `48px` | Gradient fade band length when `fadeMask` is `true`. |

## Examples

### Basic Disclosure
```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Collapsible } from "cs/svelte/collapsible";

    let open = $state(false);
    const panelId = $props.id();
</script>

<Button
    variant="secondary"
    size="md"
    aria-expanded={open}
    aria-controls={panelId}
    onclick={() => (open = !open)}
>
    <ButtonLabel>{open ? "Hide details" : "Show details"}</ButtonLabel>
</Button>

<Collapsible id={panelId} bind:open motion="swell">
    <div class="pt-3 text-sm text-secondary">
        Additional configuration details live here.
    </div>
</Collapsible>
```

### Partial Collapse with `collapsedSize` & `fadeMask`
```svelte
<script lang="ts">
    import { Collapsible } from "cs/svelte/collapsible";

    let expanded = $state(false);
</script>

<Collapsible bind:open={expanded} collapsedSize="72px" fadeMask>
    <p class="text-sm text-secondary">
        Long preview text that stays partially visible when collapsed and fades out cleanly at the bottom edge.
    </p>
</Collapsible>
```

### Horizontal Reveal
```svelte
<script lang="ts">
    import { Collapsible } from "cs/svelte/collapsible";

    let showLabel = $state(false);
</script>

<div class="flex items-center">
    <button type="button" aria-expanded={showLabel} onclick={() => (showLabel = !showLabel)}>
        Toggle
    </button>
    <Collapsible open={showLabel} axis="horizontal" motion="fade">
        <span class="whitespace-nowrap pl-2">Expanded label</span>
    </Collapsible>
</div>
```

## Behavior & Quirks
- **Trigger wiring & accessibility:** `Collapsible` renders the expandable region only—wire external triggers with `aria-expanded={open}` and `aria-controls={id}`.
- **`inert` & closed visibility:** `.cs-collapsible-inner` sets `inert` when `!open && !collapsedSize` (preventing keyboard focus and pointer interaction inside collapsed content) and applies `visibility: hidden` when `data-state="closed"` without `data-collapsed-size`. When `collapsedSize` is set, `inert` is omitted so the visible preview stays interactive.
- **Zero padding/margin on `.cs-collapsible`:** `.cs-collapsible` enforces `padding: 0; border: 0; margin: 0;` because padding or borders on the `0fr` grid container prevent it from collapsing to `0px`. Put padding, margins, borders, or backgrounds on an inner wrapper inside `children` rather than on `<Collapsible>`.
- **Parent `gap` phantom spacing:** Inside a flex or grid parent with `gap`, a closed `0px` `<Collapsible>` still occupies a grid/flex item slot and triggers `gap` around it. Place spacing inside `children` (e.g. `pt-3`) or omit `gap` on the parent when a zero-footprint closed state is required.
- **Horizontal `axis="horizontal"` text wrapping:** Transitioning `grid-template-columns` between `0fr` and `1fr` narrows the inline width during animation, which causes multi-word text to reflow/wrap unless constrained (e.g. `whitespace-nowrap` or a fixed inner width).
- **Focus ring clipping & lazy mounting:** `overflow-clip-margin` expands from `0px` to `4px` once `data-state="open"` so descendant focus rings are not clipped. With `keepMounted={false}`, children mount at `0fr` and wait one `requestAnimationFrame` before setting `data-open` so the enter transition has a start state. `prefers-reduced-motion: reduce`, `animate={false}`, and `motion="none"` settle synchronously.
- **Non-goal for virtualized lists/trees:** Built for standalone disclosures and future `accordion` / non-virtualized `tree` modules; do not use for virtualized lists or trees where item sizes are measured or recycled externally.
