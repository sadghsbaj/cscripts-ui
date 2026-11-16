---
name: ToggleButton
kind: component
import: cs/svelte/toggle-button
exports:
  - ToggleButton
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

### `data-*` Attributes
- `data-variant={variant}`, `data-color={color}`, `data-size={size}`, `data-icon-only` (when `iconOnly` is truthy), plus `aria-pressed="true" | "false"`.

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

## Behavior & Quirks
- **`$bindable()` pitfall (`pressed={fn()}`):** Never pass a non-bound expression (e.g. `pressed={isSaved()}`) to standalone `pressed`. Because `pressed` is declared with `$bindable(false)` and mutated internally on click, passing a non-bound expression passes `svelte-check` without warning but throws a Svelte 5 runtime error **even if `onPressedChange` is also passed**. When controlling state via a getter/setter or external store, you MUST use `bind:pressed={getter, setter}` (or `bind:pressed={() => current, () => {}}` paired with `onPressedChange`), or `bind:pressed={state}` for local `$state`. `ToggleButton` has no `defaultPressed` prop; for uncontrolled standalone mode, omit `pressed` (optionally pairing with `onPressedChange`).
- **Discriminated standalone vs group API:** TypeScript enforces `value` inside `<ToggleButtonGroup />` and `pressed` / `onPressedChange` standalone. In dev mode, mixing them logs a `console.warn`.
- **Two-layer surface:** `::before` renders the unpressed `soft`/`ghost` plate while `::after` pops in (`scale(0.55)` → `scale(1)`) when `aria-pressed="true"`.
- **Disabled active state:** Pressed disabled buttons use `--cs-color-disabled-fg-active` and `--cs-color-disabled-bg-active` so active selection remains legible without color saturation.
