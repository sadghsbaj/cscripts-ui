---
name: Checkbox
kind: component
import: cs/svelte/checkbox
exports:
  - Checkbox
  - CHECKBOX_VARIANTS
  - CHECKBOX_SIZES
  - CheckboxVariant
  - CheckboxSize
  - CheckboxProps
---

# Checkbox

## Overview
Native `<input type="checkbox">` primitive styled as a borderless squircle with CSS-anchored vector checkmark/indeterminate dash drawing, active press physics, and invalid state support.

## API

### `Checkbox` Props
Extends `Omit<HTMLInputAttributes, "size" | "type">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `CheckboxVariant` | Yes | — | Surface style: `"soft" \| "elevated"`. |
| `size` | `CheckboxSize` | Yes | — | T-shirt size: `"xs"` (12px), `"sm"` (16px), `"md"` (20px), `"lg"` (24px), `"xl"` (28px). |
| `checked` | `boolean` | No | `undefined` | `$bindable` checked state. |
| `onCheckedChange` | `(checked: boolean) => void` | No | `undefined` | Fires with the next `checked` state after `onchange` only when `checked` changes. |
| `indeterminate` | `boolean` | No | `undefined` | `$bindable` indeterminate state (draws a horizontal dash instead of a checkmark). |
| `onIndeterminateChange` | `(indeterminate: boolean) => void` | No | `undefined` | Fires with the next `indeterminate` state after `onchange` only when `indeterminate` changes. |
| `invalid` | `boolean` | No | `undefined` | Sets `aria-invalid="true"` and applies negative ring/fill styling. |
| `ref` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the `<input>` element. |

### `data-*` Attributes
- `data-variant={variant}`
- `data-size={size}`

## Examples

```svelte
<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";

    let agreed = $state(false);
</script>

<label class="inline-flex items-center gap-2">
    <Checkbox variant="soft" size="md" bind:checked={agreed} />
    <span>Accept terms</span>
</label>
```

```svelte
<!-- Indeterminate & invalid states -->
<Checkbox variant="elevated" size="lg" indeterminate />
<Checkbox variant="soft" size="md" invalid />
```

### Tri-State Cycling
For custom tri-state cycling, update both your bound state and `event.currentTarget.checked` / `event.currentTarget.indeterminate` directly inside `onchange` rather than in a separate `$effect` watching `bind:checked`. This keeps the transition atomic and avoids intermediate state flashes.

```svelte
<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";

    let step = $state(0);
    let checked = $state(false);
    let indeterminate = $state(false);

    function handleChange(event: Event & { currentTarget: HTMLInputElement }): void {
        step = (step + 1) % 3;
        checked = step === 2;
        indeterminate = step === 1;
        event.currentTarget.checked = checked;
        event.currentTarget.indeterminate = indeterminate;
    }
</script>

<label class="inline-flex items-center gap-2">
    <Checkbox
        variant="soft"
        size="md"
        bind:checked
        bind:indeterminate
        onchange={handleChange}
    />
    <span>Select all</span>
</label>
```

## State Transition Motion
- **`unchecked <-> checked`:** Draws the checkmark stroke (`140ms`) on entry and retracts/fades on exit (no morph).
- **`unchecked <-> indeterminate`:** Draws the dash symmetrically from the center outward (`140ms`) on entry and retracts outside-in on exit (no morph from checkmark).
- **`indeterminate <-> checked`:** Continuously morphs a single 3-point path (`160ms`, `quart-out`) in both directions with no opacity crossfade or flash; snaps immediately when `prefers-reduced-motion: reduce` is active.

## Behavior & Quirks
- **Zero-wrapper flat DOM:** Renders a native `<input type="checkbox">` and an adjacent sibling `<svg>` positioned via CSS Anchor Positioning (`anchor-name` / `position-anchor`)—no wrapper `<span>` is emitted.
- **Persistent SVG paths:** Checkmark, single continuous dash, and morph paths remain mounted so all state transitions animate smoothly without DOM teardown.
- **No `<HitArea />` or expanded hit area (use `<label>`):** `<Checkbox>` renders a native void `<input type="checkbox">` with zero wrapper DOM, so `<HitArea />` cannot be passed as a child. It intentionally avoids extra wrapper elements or `40px`–`48px` pseudo-element hit areas so the library does not split into a dual-track hit-area architecture or reserve pseudo-elements for hit-target expansion. Because checkboxes always sit alongside descriptive text, wrap `<Checkbox>` and its label text in a `<label>` (or associate them via `for`/`id`) so clicking the label toggles the control and provides the full hit target.
- **Active press jitter guard:** On `:active`, the input scales to `0.9` while its `::before` pseudo-element counter-scales by `calc(1 / 0.85)` (~6% net margin). This is strictly a small `:active` subpixel-jitter guard to prevent edge clicks from dropping during press shrink, not an expanded hit target.
- **Disabled state:** Uses colorless `--cs-color-disabled-*` tokens and dims the anchored icon to `opacity: 0.5`.
- **`CheckboxGroup` integration:** When rendered inside `<CheckboxGroup>` with a `value` prop, `<Checkbox>` automatically registers as a group item and derives `checked`, `name`, `disabled`, and `invalid` from group context (with item-level `name`, `disabled`, and `invalid` overriding/combining as documented in `checkbox-group.docs.md`).
- **Scroll containers & CSS Anchor Positioning:** Inside custom scroll containers whose nearest `position: relative` ancestor sits outside the scroller, place a `position: relative` wrapper inside the scroll viewport so the anchored `.cs-checkbox-icon` tracks scroll offset accurately.
