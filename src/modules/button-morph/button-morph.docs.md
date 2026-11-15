---
name: ButtonMorph
kind: component
import: cs/svelte/button-morph
exports:
  - ButtonMorph
  - ButtonMorphItem
  - BUTTON_MORPH_DIRECTIONS
  - BUTTON_MORPH_ITEM_STATES
  - BUTTON_MORPH_RESET_REASONS
  - ButtonMorphDirection
  - ButtonMorphItemState
  - ButtonMorphResetReason
  - ButtonMorphProps
  - ButtonMorphItemProps
  - ButtonMorphContext
  - getButtonMorphContext
  - setButtonMorphContext
  - hasButtonMorphContext
---

# ButtonMorph

## Overview
Composite state-morphing container (`<ButtonMorph />`) that smoothly interpolates pill dimensions, surface colors, shadows, corner superellipses, and content across multiple `<ButtonMorphItem value="..." />` button states.

## API

### `ButtonMorph` Props
Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | Yes | — | `$bindable` active state key matching a child `<ButtonMorphItem value="..." />`. |
| `defaultValue` | `string` | No | Initial `value` | Resting state key restored when an automatic reset triggers. |
| `guardDelay` | `number` | No | `250` | Milliseconds after a state change during which click/keyboard activations on the newly active button are suppressed to prevent double-clicks. Set `0` to disable. |
| `resetTimeout` | `number` | No | `undefined` | Auto-resets `value` to `defaultValue` after this many ms whenever `value !== defaultValue` (paused while hovered). |
| `resetOnOutsideClick` | `boolean` | No | `false` | Resets `value` to `defaultValue` on outside clicks. |
| `resetOnEscape` | `boolean` | No | `false` | Resets `value` to `defaultValue` when `Escape` is pressed. |
| `onReset` | `(reason: ButtonMorphResetReason) => void` | No | `undefined` | Fires with `"timeout" \| "outside-click" \| "escape"` when an automatic reset restores `defaultValue`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

### `ButtonMorphItem` Props
Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | Yes | — | Unique state key identifying this morph slot. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the slot `<div>`. |

### `data-*` Attributes
- On `ButtonMorph`: `data-direction="forward" | "backward"`, `data-measured`, `data-transitioning`, `data-guarded`.
- On `ButtonMorphItem`: `data-value={value}`, `data-state="active" | "exiting" | "inactive"`.

## Examples

```svelte
<script lang="ts">
    import { Check, Trash2 } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { ButtonMorph, ButtonMorphItem } from "cs/svelte/button-morph";

    let step = $state("idle");
</script>

<ButtonMorph
    bind:value={step}
    resetTimeout={3000}
    resetOnOutsideClick
    resetOnEscape
>
    <ButtonMorphItem value="idle">
        <Button variant="ghost" size="md" negative iconOnly aria-label="Delete" onclick={() => (step = "confirm")}>
            <ButtonIcon icon={Trash2} />
        </Button>
    </ButtonMorphItem>

    <ButtonMorphItem value="confirm">
        <Button variant="primary" size="md" negative onclick={() => (step = "done")}>
            <ButtonLabel>Confirm Delete</ButtonLabel>
        </Button>
    </ButtonMorphItem>

    <ButtonMorphItem value="done">
        <Button variant="secondary" size="md" onclick={() => (step = "idle")}>
            <ButtonIcon icon={Check} />
            <ButtonLabel>Deleted</ButtonLabel>
        </Button>
    </ButtonMorphItem>
</ButtonMorph>
```

## Behavior & Quirks
- **Inert & focus handoff:** Inactive and exiting `<ButtonMorphItem>` slots automatically receive `inert` and `aria-hidden="true"`. Keyboard focus is handed off to the newly active button during transitions.
- **Pre-cached measurement:** Uses `ResizeObserver` on each slot's child button so target dimensions are known before a morph starts, avoiding layout jumps.
- **Single interpolating surface:** During the ~350ms transition (`data-transitioning`), individual button surfaces hide and `.cs-button-morph::before` interpolates background, shadow, and `--cs-button-morph-superellipse` (`@property`), preventing muddy translucent stacking.
- **Supported children:** Designed for `<Button />`, `<ToggleButton />`, and `<CloseButton />`.
