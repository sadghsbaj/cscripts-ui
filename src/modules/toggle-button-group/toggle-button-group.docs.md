---
name: ToggleButtonGroup
kind: component
import: cs/svelte/toggle-button-group
exports:
  - ToggleButtonGroup
  - TOGGLE_BUTTON_GROUP_TYPES
  - TOGGLE_BUTTON_GROUP_ORIENTATIONS
  - ToggleButtonGroupType
  - ToggleButtonGroupOrientation
  - ToggleButtonGroupSingleProps
  - ToggleButtonGroupMultipleProps
  - ToggleButtonGroupTypeProps
  - ToggleButtonGroupProps
  - ToggleButtonGroupContext
  - getToggleButtonGroupContext
  - setToggleButtonGroupContext
  - hasToggleButtonGroupContext
---

# ToggleButtonGroup

## Overview
Composite container (`<ToggleButtonGroup />`) that coordinates single- or multi-selection across child `<ToggleButton value="..." />` items with unified outer pill corners, stationary surface press feedback (scaling inner content inward instead of squashing adjacent edges), and automatic hairline separators between adjacent items.

## Usage Guidance
- **Prefer `SegmentedControl`**: Use `SegmentedControl` for most mode and view switches.
- **Targeted toolbars**: Reserve `ToggleButtonGroup` for small, targeted, multi-select or formatting toolbars (e.g., Bold / Italic / Underline icon groups) — avoid using it as a generic switch across general layouts.

## API

### `ToggleButtonGroup` Props
Extends `HTMLAttributes<HTMLDivElement>`. Renders `role="group"`.

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
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";

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
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";

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
- **`$bindable()` pitfall (`value={fn()}`):** Never pass a non-bound expression (e.g. `value={getView()}`) to `value`. Because `value` is declared with `$bindable()` and mutated internally on interaction, passing a non-bound expression passes `svelte-check` without warning but throws a Svelte 5 runtime error **even if `onValueChange` is also passed**. When controlling state via a getter/setter or external store, you MUST use `bind:value={getter, setter}` (or `bind:value={() => current, () => {}}` paired with `onValueChange`), or `bind:value={state}` for local `$state`. `ToggleButtonGroup` has no `defaultValue` prop; for uncontrolled mode, omit `value` (optionally pairing with `onValueChange`).
- **Group press feedback:** Surface squash and focus scale (`--cs-toggle-button-squash-active: 1`, `--cs-toggle-button-focus-scale-active: 1`) are neutralized across all grouped items so adjacent edges stay flush, while inner content (`.cs-toggle-button-icon`, `.cs-toggle-button-label`) scales inward (`0.94`) on `:active:not(:disabled)`. Under `data-fixed-selection` (`type="single"` with `allowDeselect={false}`), clicking an already-selected item is a no-op and keeps inner-content `scale: 1` as well.
- **Automatic hairline separators:** Hairline `::after` seam separators are rendered automatically between adjacent `<ToggleButton />` items (`.cs-toggle-button:not(:last-child)`). They fade out when either neighbor is pressed (`[aria-pressed="true"]`), active, or focused (`:focus-visible`)—and on `:hover` inside `@media (hover: hover)` so touch devices do not get sticky hover states—then re-emerge in the semantic soft foreground color (`--cs-color-<color>-soft-fg`) when *both* adjacent buttons are pressed in `type="multiple"`.
