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
| `indeterminate` | `boolean` | No | `undefined` | `$bindable` indeterminate state (draws a horizontal dash instead of a checkmark). |
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

<Checkbox
    variant="soft"
    size="md"
    bind:checked
    bind:indeterminate
    onchange={handleChange}
/>
```

## State Transition Motion
- **`unchecked <-> checked`:** Draws the checkmark stroke (`140ms`) on entry and retracts/fades on exit (no morph).
- **`unchecked <-> indeterminate`:** Draws the dash symmetrically from the center outward (`140ms`) on entry and retracts outside-in on exit (no morph from checkmark).
- **`indeterminate <-> checked`:** Continuously morphs a single 3-point path (`160ms`, `quart-out`) in both directions with no opacity crossfade or flash; snaps immediately when `prefers-reduced-motion: reduce` is active.

## Behavior & Quirks
- **Zero-wrapper flat DOM:** Renders a native `<input type="checkbox">` and an adjacent sibling `<svg>` positioned via CSS Anchor Positioning (`anchor-name` / `position-anchor`)—no wrapper `<span>` is emitted.
- **Persistent SVG paths:** Checkmark, symmetric split-dash, and morph paths remain mounted so all state transitions animate smoothly without DOM teardown.
- **Press hit-area preservation:** On `:active`, the input scales to `0.9` while its `::before` pseudo-element counter-scales by `calc(1 / 0.85)` to prevent edge clicks from dropping.
- **Disabled state:** Uses colorless `--cs-color-disabled-*` tokens and dims the anchored icon to `opacity: 0.5`.
