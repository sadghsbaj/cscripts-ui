---
name: SegmentedControl
kind: component
import: cs/svelte/segmented-control
exports:
  - SegmentedControl
  - SegmentedControlItem
  - SegmentedControlLabel
  - SegmentedControlIcon
  - SEGMENTED_CONTROL_SIZES
  - SEGMENTED_CONTROL_WIDTHS
  - SegmentedControlSize
  - SegmentedControlWidth
  - SegmentedControlProps
  - SegmentedControlItemProps
  - SegmentedControlLabelProps
  - SegmentedControlIconComponentProps
  - SegmentedControlIconProps
  - SegmentedControlContext
  - getSegmentedControlContext
  - setSegmentedControlContext
  - hasSegmentedControlContext
---

# SegmentedControl

## Overview
Single-selection `role="radiogroup"` / `role="radio"` pill control composed of `<SegmentedControl />`, `<SegmentedControlItem />`, `<SegmentedControlIcon />`, and `<SegmentedControlLabel />`, featuring a gliding active indicator, horizontal roving focus, and overflow step-scrolling with edge fade masks and context-sensitive chevrons.

## API

### `SegmentedControl` Props
Generic over `T extends string = string`. Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `role="radiogroup"`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `SegmentedControlSize` | Yes | — | T-shirt size: `"xs"` (`28px`), `"sm"` (`32px`), `"md"` (`36px`), `"lg"` (`40px`), `"xl"` (`44px`). |
| `value` | `T \| undefined` | No | `undefined` | `$bindable` selected item value. Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: T) => void` | No | `undefined` | Fires with the newly selected value on user click or keyboard navigation when the selection changes. |
| `width` | `SegmentedControlWidth` | No | `"content"` | `"content"` sizes each segment to its content (`fit-content`); `"equal"` stretches to `100%` and distributes segments evenly via CSS Grid. |
| `disabled` | `boolean` | No | `false` | Disables the radiogroup (`aria-disabled="true"`), roving focus, all child items, and the hidden form input. |
| `name` | `string` | No | `undefined` | When truthy, renders `<input type="hidden" {name} value={value ?? ""} {disabled} />` for form submission. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `children` | `Snippet` | No | `undefined` | Child `<SegmentedControlItem />` elements. |

### `SegmentedControlItem` Props
Generic over `T extends string = string`. Extends `Omit<HTMLButtonAttributes, "value" | "type">`. Renders `<button type="button" role="radio">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `T` | Yes | — | Unique value identifying the segment (exposed as `data-value={value}`). |
| `disabled` | `boolean` | No | `false` | Disables this individual item (effective disabled state is `group.disabled \|\| disabled`). |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `children` | `Snippet` | No | `undefined` | Segment content (`<SegmentedControlIcon />`, `<SegmentedControlLabel />`, etc.). |

### `SegmentedControlLabel` & `SegmentedControlIcon`
- `SegmentedControlLabel` (`SegmentedControlLabelProps` extending `HTMLAttributes<HTMLSpanElement>`): Renders `<span class="cs-segmented-control-label">` with `ref = $bindable(null)`, single-line ellipsis truncation (`overflow-x: clip; text-overflow: ellipsis; white-space: nowrap`), and `text-box: trim-both cap alphabetic`.
- `SegmentedControlIcon` (`SegmentedControlIconProps` extending `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`): Props `{ icon: Component<SegmentedControlIconComponentProps>; color?: string; ...SVGAttributes }`. Renders `<Icon {...rest} aria-hidden="true" class={["cs-segmented-control-icon", className]} />` sized to `calc(1em + 2px)` with `stroke-width: 2.5`.

### Exported Constants & Types
- `SEGMENTED_CONTROL_SIZES`: `readonly ["xs", "sm", "md", "lg", "xl"]` (`SegmentedControlSize`)
- `SEGMENTED_CONTROL_WIDTHS`: `readonly ["content", "equal"]` (`SegmentedControlWidth`)
- `SegmentedControlProps<T>`, `SegmentedControlItemProps<T>`, `SegmentedControlLabelProps`, `SegmentedControlIconComponentProps`, `SegmentedControlIconProps`
- `SegmentedControlContext`, `getSegmentedControlContext`, `setSegmentedControlContext`, `hasSegmentedControlContext`

### `data-*` Attributes
- Root (`.cs-segmented-control`): `data-size={size}`, `data-width={width}`, `data-disabled` (when `disabled`), `data-arrow-nav` (while navigating via arrow/`Home`/`End` keys).
- Viewport (`.cs-segmented-control-viewport`): `data-scroll-prev` (when scrollable toward start), `data-scroll-next` (when scrollable toward end).
- Indicator (`.cs-segmented-control-indicator`): `data-active` (when `value` matches a registered item), `data-ready` (set after first `requestAnimationFrame`).
- Scroll buttons (`.cs-segmented-control-scroll-btn`): `data-direction="prev" | "next"`, `data-visible` (when scrollable in that direction).
- Item (`.cs-segmented-control-item`): `data-state="active" | "inactive"`, `data-value={value}`, `data-disabled` (when group or item is disabled).

### CSS Custom Properties
Overridable on `.cs-segmented-control`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-segmented-control-bg` | `var(--cs-color-base-soft)` | Pill track background color. |
| `--cs-segmented-control-indicator-bg` | `light-dark(white, var(--cs-color-base-800))` | Active indicator fill (`var(--cs-color-disabled-bg-elevated)` when `[data-disabled]`). |
| `--cs-segmented-control-indicator-shadow` | `light-dark(0 1px 2px rgb(0 0 0 / 0.08), none)` | Active indicator box-shadow (`none` when `[data-disabled]`). |
| `--cs-segmented-control-fg` | `var(--cs-color-text-weak)` | Inactive item foreground color. |
| `--cs-segmented-control-fg-hover` | `var(--cs-color-text-strong)` | Inactive item hover foreground color. |
| `--cs-segmented-control-fg-active` | `var(--cs-color-text-strong)` | Active item foreground color. |
| `--cs-segmented-control-height` | `28px` / `32px` / `36px` / `40px` / `44px` | Outer control height per `data-size` (`xs`–`xl`). |
| `--cs-segmented-control-pad` | `3px` (`xs`–`md`), `4px` (`lg`–`xl`) | Inner track padding around the indicator and items. |
| `--cs-segmented-control-item-px` | `8px` / `10px` / `12px` / `14px` / `16px` | Horizontal item padding per `data-size` (`xs`–`xl`). |
| `--cs-segmented-control-gap` | `4px` (`xs`–`sm`), `6px` (`md`–`xl`) | Gap between icon and label inside `.cs-segmented-control-item-content`. |
| `--cs-segmented-control-fade-size` | `50px` (`xs`–`sm`), `56px` (`md`–`xl`) | Edge fade width forwarded to `--cs-scroll-fade-size` on the viewport. |

Internal / computed properties:
- `--cs-segmented-control-mask-left` / `--cs-segmented-control-mask-right`: Registered `@property` (`<length>`, `initial-value: 0px`) driving the `mask-image` chevron safe-space on `.cs-segmented-control-viewport`.
- `--cs-segmented-control-lane`: `calc(var(--cs-segmented-control-height) - var(--cs-segmented-control-pad) + 20px)` target mask inset when `data-scroll-prev` / `data-scroll-next` is active.
- `--cs-segmented-control-indicator-x` / `--cs-segmented-control-indicator-w`: Inline pixel offset and width applied to `.cs-segmented-control-indicator`.

## Examples

### Icons + Labels
```svelte
<script lang="ts">
    import { Columns3, LayoutGrid, List } from "@lucide/svelte";
    import {
        SegmentedControl,
        SegmentedControlIcon,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "cs/svelte/segmented-control";

    let viewMode = $state("list");
</script>

<SegmentedControl size="md" bind:value={viewMode} aria-label="View mode">
    <SegmentedControlItem value="list">
        <SegmentedControlIcon icon={List} />
        <SegmentedControlLabel>List</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="grid">
        <SegmentedControlIcon icon={LayoutGrid} />
        <SegmentedControlLabel>Grid</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="board">
        <SegmentedControlIcon icon={Columns3} />
        <SegmentedControlLabel>Board</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>
```

### Equal Width
```svelte
<SegmentedControl size="md" width="equal" bind:value={tab} aria-label="Section">
    <SegmentedControlItem value="overview">
        <SegmentedControlLabel>Overview</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="activity">
        <SegmentedControlLabel>Activity</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="settings">
        <SegmentedControlLabel>Settings</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>
```

### Controlled `bind:value={get, set}` & `onValueChange`
```svelte
<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";

    let locked = $state(false);
    let period = $state("monthly");
</script>

<SegmentedControl
    size="md"
    aria-label="Billing period"
    bind:value={
        () => period,
        (next) => {
            if (!locked && next !== undefined) period = next;
        }
    }
    onValueChange={(next) => console.log("selected:", next)}
>
    <SegmentedControlItem value="monthly">
        <SegmentedControlLabel>Monthly</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="yearly">
        <SegmentedControlLabel>Yearly</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>
```

### Form Submission (`name`)
```svelte
<form>
    <SegmentedControl size="md" name="billing_period" value="monthly" aria-label="Billing period">
        <SegmentedControlItem value="monthly">
            <SegmentedControlLabel>Monthly</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="yearly">
            <SegmentedControlLabel>Yearly</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</form>
```

### Disabled Group & Item
```svelte
<SegmentedControl size="md" value="standard" aria-label="Shipping tier">
    <SegmentedControlItem value="standard">
        <SegmentedControlLabel>Standard</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="priority" disabled>
        <SegmentedControlLabel>Priority</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="express">
        <SegmentedControlLabel>Express</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>

<SegmentedControl size="md" value="standard" disabled aria-label="Locked tier">
    <SegmentedControlItem value="standard">
        <SegmentedControlLabel>Standard</SegmentedControlLabel>
    </SegmentedControlItem>
    <SegmentedControlItem value="express">
        <SegmentedControlLabel>Express</SegmentedControlLabel>
    </SegmentedControlItem>
</SegmentedControl>
```

## Behavior & Quirks
- **Single-selection `radiogroup`/`radio` semantics:** Always enforces mutually exclusive single selection (`role="radiogroup"` and `role="radio"` with `aria-checked`)—clicking the already-active segment is a no-op and its `:active` content scale (`0.95`) only applies to `[data-state="inactive"]` items. Use `ToggleButtonGroup` when you need multi-selection (`type="multiple"`), `allowDeselect`, or vertical orientation.
- **Roving focus & outline suppression:** Attaches `rovingFocus` (`orientation: "horizontal"`, `loop: false`, `homeEnd: true`, `preventScroll: true`), starting on the `aria-checked="true"` item (or the first item). Tabbing into the control displays the `:focus-visible` outline (`2px solid var(--cs-color-accent-solid)`). Navigating with arrow/`Home`/`End` keys immediately selects the newly focused item, sets `data-arrow-nav` on the root to suppress `:focus-visible` outlines while the sliding indicator communicates movement, and clears `data-arrow-nav` on `pointerdown` or when focus leaves the group (`focusout`).
- **Mount-flush `180ms` `quart-out` sliding indicator:** Indicator `offsetLeft` and `offsetWidth` are synced synchronously in `$effect`, while `data-ready` is applied after the first `requestAnimationFrame` so initial mount snaps cleanly into place without animating from `0px`. Subsequent changes transition `translate` and `width` over `var(--cs-dur-180)` (`180ms`) with `var(--cs-ease-quart-out)`, and a `ResizeObserver` on the viewport, track, and active item keeps alignment accurate across resizes.
- **Overflow scrolling & layout-neutral chevron safe-space:** Attaches `scrollFade({ size: "md", direction: "horizontal", edges: "both" })` using `--cs-segmented-control-fade-size` (`50px` for `xs`/`sm`, `56px` for `md`–`xl`). Registered `@property` lengths (`--cs-segmented-control-mask-left` and `--cs-segmented-control-mask-right`) animate a `mask-image` gradient in `140ms` (`--cs-dur-140` `--cs-ease-quad-out`) to carve out a layout-neutral chevron safe-space (`--cs-segmented-control-lane`) in sync with the `prev`/`next` buttons' `opacity` and `scale` (`0.8` → `1`). The `prev`/`next` buttons sit outside the masked viewport (`tabindex="-1"`, `aria-hidden="true"`), snap to the edge when within `12px`, auto-scroll focused items past the fade reserve during arrow navigation, and mirror direction/icons automatically under `:dir(rtl)`.
- **No `<HitArea />` exception:** `SegmentedControlItem` omits `<HitArea />` because segments are tightly abutting buttons inside a shared pill track where expanded hit targets would overlap neighbors.
- **No separators (by design):** Unlike `ToggleButtonGroup` (`ToggleButtonGroupSeparator`), `SegmentedControl` intentionally has no separator component or dividers between items—items have no individual background fills and separate cleanly via whitespace on the shared `base-soft` pill track while the active indicator slides smoothly across.
- **Structure & icon-only accessibility (`segmented-control/require-structure`):** The ESLint rule requires `<SegmentedControlItem>` to contain `<SegmentedControlLabel>` and/or `<SegmentedControlIcon>` (never raw icon components), and requires `aria-label` or `aria-labelledby` on icon-only items (when `<SegmentedControlIcon>` is used without `<SegmentedControlLabel>`).
