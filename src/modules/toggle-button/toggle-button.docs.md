---
name: ToggleButton
kind: component
import: cs/svelte/toggle-button
exports:
  - ToggleButton
  - ToggleButtonGroup
  - ToggleButtonLabel
  - ToggleButtonIcon
  - TOGGLE_BUTTON_COLORS
  - TOGGLE_BUTTON_SIZES
  - TOGGLE_BUTTON_VARIANTS
  - ToggleButtonColor
  - ToggleButtonSize
  - ToggleButtonVariant
  - ToggleButtonStateProps
  - ToggleButtonProps
  - ToggleButtonLabelProps
  - ToggleButtonIconComponentProps
  - ToggleButtonIconProps
  - TOGGLE_BUTTON_GROUP_TYPES
  - TOGGLE_BUTTON_GROUP_ORIENTATIONS
  - ToggleButtonGroupType
  - ToggleButtonGroupOrientation
  - ToggleButtonGroupSingleProps
  - ToggleButtonGroupMultipleProps
  - ToggleButtonGroupTypeProps
  - ToggleButtonGroupProps
---

# ToggleButton

## Overview
Two-state toggle button primitive (`<ToggleButton />`) supporting standalone `bind:pressed` / `onPressedChange` as well as coordinated `value` selection inside `<ToggleButtonGroup />`. Uses an animated `::after` pressed layer with spring pop-in and tactile squash physics.

## API

### `ToggleButton` Props
Extends `Omit<HTMLButtonAttributes, "color" | "size" | "value">`. Always enforces `type="button"` and `aria-pressed={isPressed}`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ToggleButtonVariant` | Yes | — | Surface style: `"soft" \| "ghost"`. |
| `color` | `ToggleButtonColor` | Yes | — | Pressed intent color: `"accent" \| "positive" \| "caution" \| "negative"`. |
| `size` | `ToggleButtonSize` | Yes | — | T-shirt size: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `iconOnly` | `boolean` | No | `undefined` | Locks square 1:1 proportions and scales direct icon children to 50%. |
| `disabled` | `boolean` | No | `false` | Disables the button (also inherits `disabled` from parent `<ToggleButtonGroup />`). |
| `value` | `string` | Inside group | — | Item identifier inside `<ToggleButtonGroup />`. Forbidden when standalone (`pressed`/`onPressedChange` become `never`). |
| `pressed` | `boolean` | Standalone | `false` | `$bindable` pressed state (standalone only; forbidden inside `<ToggleButtonGroup />`). |
| `onPressedChange` | `(pressed: boolean) => void` | Standalone | `undefined` | Fires with the next pressed state on user toggle (standalone only). |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>` element. |

### `ToggleButtonLabel` & `ToggleButtonIcon`
- `ToggleButtonLabel`: Renders `<span class="cs-toggle-button-label cs-button-control-label">` with `ref = $bindable(null)` and `...rest`.
- `ToggleButtonIcon`: Props `{ icon: Component<ToggleButtonIconComponentProps>; ...SVGAttributes }`. Renders `<Icon {...rest} aria-hidden="true" class="cs-toggle-button-icon cs-button-control-icon" />`.

### `ToggleButtonGroup` Props
Composite container (`<ToggleButtonGroup />`) that coordinates single- or multi-selection across child `<ToggleButton value="..." />` items with unified outer pill corners, stationary surface press feedback, and automatic hairline separators between adjacent items. Extends `HTMLAttributes<HTMLDivElement>` and renders `role="group"`.

- **Usage Guidance:** Prefer `SegmentedControl` for most mode and view switches; reserve `ToggleButtonGroup` for small, targeted, multi-select or formatting toolbars (e.g., Bold / Italic / Underline icon groups).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `"single" \| "multiple"` | Yes | — | Selection mode. |
| `value` | `string \| undefined` (single) or `string[]` (multiple) | No | `undefined` | `$bindable` selected item value(s). Supports `bind:value` and `bind:value={get, set}`. |
| `allowDeselect` | `boolean` | No | `false` | Single mode only (`never` in `multiple`). Allows clicking the active item to clear `value` to `undefined`. |
| `onValueChange` | `(value: ...) => void` | No | `undefined` | Fires with the updated selection when toggled by user interaction. |
| `orientation` | `"horizontal" \| "vertical"` | No | `"horizontal"` | Layout axis of the group. |
| `disabled` | `boolean` | No | `false` | Disables the group (`aria-disabled="true"`) and all child `<ToggleButton />` items. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the group `<div>`. |

### `data-*` Attributes
- `ToggleButton`: `data-variant={variant}`, `data-color={color}`, `data-size={size}`, `data-icon-only` (when `iconOnly` is truthy), plus `aria-pressed="true" | "false"`.
- `ToggleButtonGroup`: `data-type={type}`, `data-orientation={orientation}`, `data-fixed-selection` (present when `type === "single"` and `!allowDeselect`), `data-disabled` (present when `disabled` is true).

### CSS Custom Properties
| Variable | Description |
| :--- | :--- |
| `--cs-toggle-button-height` | Overrides the resolved button height. |
| `--cs-toggle-button-fg` / `--cs-toggle-button-fg-hover` | Foreground color at rest and on hover. |
| `--cs-toggle-button-bg` / `--cs-toggle-button-bg-hover` | Base surface fill at rest and on hover. |
| `--cs-toggle-button-bg-pressed` / `--cs-toggle-button-bg-pressed-hover` | Pressed `::after` fill at rest and on hover. |
| `--cs-toggle-button-border` / `--cs-toggle-button-shadow` | Optional border/shadow hooks. |
| `--cs-toggle-button-squash-active` | Pointer `:active` squash scale on `::after` (defaults to `--cs-squash-subtle`). |
| `--cs-toggle-button-focus-scale-active` | Keyboard `:focus-visible:active` scale (defaults to `0.97`). |
| `--cs-toggle-button-group-inner-radius` | Inner corner radius between adjacent grouped buttons (defaults to `var(--cs-radius-none)`). |
| `--cs-toggle-button-group-separator-fg` | Separator line color (defaults to `var(--cs-color-base-soft-fg)`, or pressed item's soft fg when both neighbors are pressed). |
| `--cs-toggle-button-group-separator-alpha` | Separator opacity mix percentage (defaults to `18%`). |

## Examples

```svelte
<script lang="ts">
    import { Bookmark } from "@lucide/svelte";
    import { ToggleButton, ToggleButtonIcon, ToggleButtonLabel } from "cs/svelte/toggle-button";

    let saved = $state(false);
</script>

<ToggleButton variant="soft" color="accent" size="md" bind:pressed={saved}>
    <ToggleButtonIcon icon={Bookmark} />
    <ToggleButtonLabel>{saved ? "Saved" : "Save"}</ToggleButtonLabel>
</ToggleButton>
```

### `ToggleButtonGroup`

```svelte
<script lang="ts">
    import { ToggleButton, ToggleButtonGroup, ToggleButtonLabel } from "cs/svelte/toggle-button";

    let view = $state("list");
</script>

<ToggleButtonGroup type="single" bind:value={view}>
    <ToggleButton variant="soft" color="accent" size="md" value="list">
        <ToggleButtonLabel>List</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton variant="soft" color="accent" size="md" value="grid">
        <ToggleButtonLabel>Grid</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>
```

### Controlled `bind:value={get, set}` & `onValueChange`

```svelte
<script lang="ts">
    import { ToggleButton, ToggleButtonGroup, ToggleButtonLabel } from "cs/svelte/toggle-button";

    let view = $state("list");
</script>

<!-- Use Svelte 5 function binding instead of one-way value={getView()} -->
<ToggleButtonGroup
    type="single"
    bind:value={() => view, (next) => { if (next) view = next; }}
    onValueChange={(next) => console.log("changed:", next)}
>
    <ToggleButton variant="soft" color="accent" size="md" value="list">
        <ToggleButtonLabel>List</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButton variant="soft" color="accent" size="md" value="grid">
        <ToggleButtonLabel>Grid</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>
```

## Behavior & Quirks
- **`$bindable()` pitfall (`pressed={fn()}` / `value={fn()}`):** Never pass a non-bound expression (e.g. `pressed={isSaved()}` or `value={getView()}`) to standalone `pressed` or group `value`. Because both are declared with `$bindable` and mutated internally on interaction, passing a non-bound expression passes `svelte-check` without warning but throws a Svelte 5 runtime error **even if `onPressedChange` / `onValueChange` is also passed**. When controlling state via a getter/setter or external store, you MUST use `bind:pressed={getter, setter}` / `bind:value={getter, setter}` (or `bind:value={() => current, () => {}}` paired with the change callback), or `bind:*={state}` for local `$state`. Neither component has a `defaultPressed` / `defaultValue` prop; for uncontrolled mode, omit the prop (optionally pairing with the change callback).
- **Discriminated standalone vs group API:** TypeScript enforces `value` inside `<ToggleButtonGroup />` and `pressed` / `onPressedChange` standalone. In dev mode, mixing them logs a `console.warn`.
- **Two-layer surface:** `::before` renders the unpressed `soft`/`ghost` plate while `::after` pops in (`scale(0.55)` → `scale(1)`) when `aria-pressed="true"`.
- **Disabled active state:** Pressed disabled buttons use `--cs-color-disabled-fg-active` and `--cs-color-disabled-bg-active` so active selection remains legible without color saturation.
- **Group press feedback:** Surface squash and focus scale (`--cs-toggle-button-squash-active: 1`, `--cs-toggle-button-focus-scale-active: 1`) are neutralized across all grouped items so adjacent edges stay flush, while inner content (`.cs-toggle-button-icon`, `.cs-toggle-button-label`) scales inward (`0.94`) on `:active:not(:disabled)`. Under `data-fixed-selection` (`type="single"` with `allowDeselect={false}`), clicking an already-selected item is a no-op and keeps inner-content `scale: 1` as well.
- **Automatic hairline separators:** Hairline `::after` seam separators are rendered automatically between adjacent `<ToggleButton />` items (`.cs-toggle-button:not(:last-child)`). They fade out when either neighbor is pressed (`[aria-pressed="true"]`), active, or focused (`:focus-visible`)—and on `:hover` inside `@media (hover: hover)` so touch devices do not get sticky hover states—then re-emerge in the semantic soft foreground color (`--cs-color-<color>-soft-fg`) when *both* adjacent buttons are pressed in `type="multiple"`.
