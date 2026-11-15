---
name: ToggleButtonGroup
kind: component
import: cs/svelte/toggle-button-group
exports:
  - ToggleButtonGroup
  - ToggleButtonGroupSeparator
  - TOGGLE_BUTTON_GROUP_TYPES
  - TOGGLE_BUTTON_GROUP_ORIENTATIONS
  - ToggleButtonGroupType
  - ToggleButtonGroupOrientation
  - ToggleButtonGroupSingleProps
  - ToggleButtonGroupMultipleProps
  - ToggleButtonGroupTypeProps
  - ToggleButtonGroupProps
  - ToggleButtonGroupSeparatorProps
  - ToggleButtonGroupContext
  - getToggleButtonGroupContext
  - setToggleButtonGroupContext
  - hasToggleButtonGroupContext
---

# ToggleButtonGroup

## Overview
Composite container (`<ToggleButtonGroup />`) that coordinates single- or multi-selection across child `<ToggleButton value="..." />` items with unified outer pill corners, stationary surface press feedback (scaling inner content inward instead of squashing adjacent edges), and optional `<ToggleButtonGroupSeparator />` dividers.

## API

### `ToggleButtonGroup` Props
Extends `HTMLAttributes<HTMLDivElement>`. Renders `role="group"`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `type` | `"single" \| "multiple"` | Yes | — | Selection mode. |
| `value` | `string \| undefined` (single) or `string[]` (multiple) | No | `undefined` | `$bindable` selected item value(s). |
| `allowDeselect` | `boolean` | No | `false` | Single mode only (`never` in `multiple`). Allows clicking the active item to clear `value` to `undefined`. |
| `onValueChange` | `(value: ...) => void` | No | `undefined` | Fires with the updated selection when toggled by user interaction. |
| `orientation` | `"horizontal" \| "vertical"` | No | `"horizontal"` | Layout axis of the group. |
| `disabled` | `boolean` | No | `false` | Disables the group (`aria-disabled="true"`) and all child `<ToggleButton />` items. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the group `<div>`. |

### `ToggleButtonGroupSeparator` Props
Extends `Omit<HTMLAttributes<HTMLSpanElement>, "children">`. Renders a zero-width/zero-height `role="separator" aria-hidden="true"` `<span>` with `ref = $bindable(null)`.

### `data-*` Attributes
- `data-type={type}`
- `data-orientation={orientation}`
- `data-fixed-selection` (present when `type === "single"` and `!allowDeselect`)
- `data-disabled` (present when `disabled` is true)

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-toggle-button-group-inner-radius` | `var(--cs-radius-none)` | Inner corner radius between adjacent grouped buttons. |
| `--cs-toggle-button-group-separator-fg` | `var(--cs-color-base-soft-fg)` (or pressed item's soft fg when both neighbors are pressed) | Separator line color. |
| `--cs-toggle-button-group-separator-alpha` | `18%` | Separator opacity mix percentage. |

## Examples

```svelte
<script lang="ts">
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";

    let view = $state("list");
</script>

<ToggleButtonGroup type="single" bind:value={view}>
    <ToggleButton variant="soft" color="accent" size="md" value="list">
        <ToggleButtonLabel>List</ToggleButtonLabel>
    </ToggleButton>
    <ToggleButtonGroupSeparator />
    <ToggleButton variant="soft" color="accent" size="md" value="grid">
        <ToggleButtonLabel>Grid</ToggleButtonLabel>
    </ToggleButton>
</ToggleButtonGroup>
```

## Behavior & Quirks
- **Group press feedback:** Surface squash and focus scale (`--cs-toggle-button-squash-active: 1`, `--cs-toggle-button-focus-scale-active: 1`) are neutralized across all grouped items so adjacent edges stay flush, while inner content (`.cs-toggle-button-icon`, `.cs-toggle-button-label`) scales inward (`0.94`) on `:active:not(:disabled)`. Under `data-fixed-selection` (`type="single"` with `allowDeselect={false}`), clicking an already-selected item is a no-op and keeps inner-content `scale: 1` as well.
- **Smart separator visibility:** `<ToggleButtonGroupSeparator />` automatically fades out when either neighbor is pressed, hovered, active, or focused—and re-emerges in the active color when *both* adjacent buttons are pressed (in `type="multiple"`).
