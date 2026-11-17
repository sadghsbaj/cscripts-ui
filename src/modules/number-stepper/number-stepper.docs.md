---
name: NumberStepper
kind: component
import: cs/svelte/number-stepper
exports:
  - NumberStepper
  - NumberStepperDecrement
  - NumberStepperIncrement
  - NumberStepperInput
  - NumberStepperValue
  - NUMBER_STEPPER_VARIANTS
  - NUMBER_STEPPER_SIZES
  - NUMBER_STEPPER_ORIENTATIONS
  - NumberStepperVariant
  - NumberStepperSize
  - NumberStepperOrientation
  - NumberStepperProps
  - NumberStepperIconComponentProps
  - NumberStepperButtonProps
  - NumberStepperDecrementProps
  - NumberStepperIncrementProps
  - NumberStepperInputProps
  - NumberStepperValueProps
  - NumberStepperContext
  - getNumberStepperContext
  - setNumberStepperContext
  - hasNumberStepperContext
---

# NumberStepper

## Overview
Compound numeric stepper primitive composed of `<NumberStepper />`, `<NumberStepperDecrement />`, `<NumberStepperIncrement />`, and an optional horizontal center slot (`<NumberStepperInput />` for editable entry or `<NumberStepperValue />` for read-only/resettable display). Supports `soft` and `elevated` surfaces, 1:1 `Button`/`TextInput`-aligned sizes (`xs`–`xl`), repeat-on-hold stepping, `defaultValue` reset, and horizontal or icon-only vertical orientations.

## API

### `NumberStepper` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Renders `<div role="group" class="cs-number-stepper">` and provides `NumberStepperContext` to child primitives.

`variant`, `size`, and `orientation` are **required** with no defaults:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `NumberStepperVariant` | Yes | — | Track surface style: `"soft" \| "elevated"`. |
| `size` | `NumberStepperSize` | Yes | — | T-shirt size matching `Button` and `TextInput` heights 1:1: `"xs"` (`28px`), `"sm"` (`32px`), `"md"` (`36px`), `"lg"` (`40px`), `"xl"` (`44px`). |
| `orientation` | `NumberStepperOrientation` | Yes | — | Layout axis: `"horizontal" \| "vertical"`. `"vertical"` is strictly icon-only. |
| `value` | `number` | No | `0` | `$bindable` numeric value. Supports `bind:value` and `bind:value={get, set}`. |
| `min` | `number` | No | `undefined` | Lower clamp bound. Automatically disables `<NumberStepperDecrement />` when `value <= min`. |
| `max` | `number` | No | `undefined` | Upper clamp bound. Automatically disables `<NumberStepperIncrement />` when `value >= max`. |
| `step` | `number` | No | `1` | Increment/decrement delta. Floating-point drift is normalized to `max(decimals(step), decimals(min ?? 0))`. |
| `defaultValue` | `number` | No | `undefined` | Reset target for middle-click on the stepper, and primary click/`Enter`/`Space` on `<NumberStepperValue />`. |
| `onValueChange` | `(value: number) => void` | No | `undefined` | Fires when user interaction commits a clamped value different from the current `value`. |
| `disabled` | `boolean` | No | `false` | Disables the entire stepper (`data-disabled`, `aria-disabled="true"`) and all child subparts. |
| `invalid` | `boolean` | No | `false` | Sets `data-invalid` on the root and `aria-invalid="true"` + negative ring/caret on `<NumberStepperInput />`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `children` | `Snippet` | No | `undefined` | Compound subparts (`NumberStepperDecrement`, `NumberStepperIncrement`, and horizontally `NumberStepperInput` or `NumberStepperValue`). |

### `NumberStepperDecrement` & `NumberStepperIncrement` Props
Both extend `Omit<HTMLButtonAttributes, "type">` (`NumberStepperDecrementProps = NumberStepperButtonProps`, `NumberStepperIncrementProps = NumberStepperButtonProps`). Render `<button type="button" class="cs-number-stepper-btn">` with `data-direction="decrement" | "increment"`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `icon` | `Component<NumberStepperIconComponentProps>` | No | `Minus` / `Plus` | Icon component rendered with `.cs-number-stepper-icon` and `strokeWidth={2.35}`. |
| `disabled` | `boolean` | No | `false` | Local disabled override. Effective disabled state is `Boolean(disabled) \|\| ctx.disabled \|\| !ctx.canDecrement` (or `!ctx.canIncrement`). |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `children` | `Snippet` | No | `undefined` | Custom icon content wrapped in `<span class="cs-number-stepper-icon" aria-hidden="true">` (takes precedence over `icon`). |

### `NumberStepperInput` Props (Horizontal Only)
Extends `Omit<HTMLInputAttributes, "size" | "value" | "children" | "type">`. Renders `<label class="cs-number-stepper-input-shell">` containing `<input type="text" role="spinbutton" class="cs-number-stepper-field">`. Throws at runtime if placed inside `<NumberStepper orientation="vertical">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prefix` | `string` | No | `undefined` | Static unit/symbol rendered before the `<input>` (`aria-hidden="true"`). |
| `suffix` | `string` | No | `undefined` | Static unit/symbol rendered after the `<input>` (`aria-hidden="true"`). When set, aligns input text right. |
| `disabled` | `boolean` | No | `false` | Local disabled override; effective state is `Boolean(disabled) \|\| ctx.disabled`. |
| `readonly` | `boolean` | No | `false` | Marks the `<input>` read-only while keeping stepper buttons active. |
| `ref` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the `<input>`. |

### `NumberStepperValue` Props (Horizontal Only)
Extends `HTMLAttributes<HTMLElement>`. Renders `<button type="button" class="cs-number-stepper-value">` when `ctx.defaultValue !== undefined`, or `<span class="cs-number-stepper-value">` otherwise. Throws at runtime if placed inside `<NumberStepper orientation="vertical">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `prefix` | `string` | No | `undefined` | Static prefix for default plain-text rendering. |
| `suffix` | `string` | No | `undefined` | Static suffix for default plain-text rendering. |
| `format` | `Intl.NumberFormatOptions` | No | `undefined` | Optional `Intl.NumberFormat` options for default plain-text rendering. |
| `locales` | `Intl.LocalesArgument` | No | `undefined` | Locale(s) passed to `Intl.NumberFormat`. |
| `ref` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the rendered `<button>` or `<span>`. |
| `children` | `Snippet` | No | `undefined` | Custom readout content (e.g. `<NumberMorph />`) wrapped in `.cs-number-stepper-value-text`. |

### Exported Constants, Context & Types
- `NUMBER_STEPPER_VARIANTS`: `readonly ["soft", "elevated"]` (`NumberStepperVariant`)
- `NUMBER_STEPPER_SIZES`: `readonly ["xs", "sm", "md", "lg", "xl"]` (`NumberStepperSize`)
- `NUMBER_STEPPER_ORIENTATIONS`: `readonly ["horizontal", "vertical"]` (`NumberStepperOrientation`)
- `NumberStepperContext`, `getNumberStepperContext`, `setNumberStepperContext`, `hasNumberStepperContext`:
  - Readonly getters: `value`, `min`, `max`, `step`, `defaultValue`, `variant`, `size`, `orientation`, `disabled`, `invalid`, `canDecrement`, `canIncrement`.
  - Methods: `decrement()`, `increment()`, `stepBy(delta: number)`, `commitValue(next: number)`, `reset()`.
- Types: `NumberStepperProps`, `NumberStepperIconComponentProps`, `NumberStepperButtonProps`, `NumberStepperDecrementProps`, `NumberStepperIncrementProps`, `NumberStepperInputProps`, `NumberStepperValueProps`.

### `data-*` Attributes
- Root (`.cs-number-stepper`): `data-variant={variant}`, `data-size={size}`, `data-orientation={orientation}`, `data-disabled` (when `disabled`), `data-invalid` (when `invalid`).
- Buttons (`.cs-number-stepper-btn`): `data-direction="decrement" | "increment"`.
- Input shell (`.cs-number-stepper-input-shell`): `data-has-suffix` (when `suffix` is truthy), `data-disabled` (when `disabled`).

### CSS Custom Properties
Overridable on `.cs-number-stepper`:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-number-stepper-bg` | `var(--cs-color-base-soft)` (`soft`) / `var(--cs-color-elevated)` (`elevated`) | Outer track background (`--cs-color-disabled-bg` / `--cs-color-disabled-bg-elevated` when `[data-disabled]`). |
| `--cs-number-stepper-shadow` | `none` (`soft`) / `var(--cs-shadow-elevated)` (`elevated`) | Outer track box-shadow (`0 0 0 1px var(--cs-color-disabled-border)` for disabled `elevated`). |
| `--cs-number-stepper-fg` | `var(--cs-color-text-main)` | Base button/icon foreground color (`var(--cs-color-disabled-fg)` when `[data-disabled]`). |
| `--cs-number-stepper-fg-strong` | `var(--cs-color-text-strong)` | Input/value text and button hover foreground (`var(--cs-color-disabled-fg)` when `[data-disabled]`). |
| `--cs-number-stepper-fg-disabled` | `var(--cs-color-disabled-fg)` | Disabled button icon foreground. |
| `--cs-number-stepper-btn-bg-hover` | `var(--cs-color-base-soft-hover)` (`soft`) / `light-dark(color-mix(in oklch, var(--cs-color-base-900) 4%, transparent), var(--cs-color-base-soft))` (`elevated`) | Step button hover background in non-input mode (switches to `--cs-number-stepper-btn-bg-hover-input` when `<NumberStepperInput />` is present). |
| `--cs-number-stepper-btn-bg-hover-input` | `var(--cs-color-base-soft-hover)` (`soft`) / `var(--cs-color-base-soft)` (`elevated`) | Step button hover background in editable input mode. |
| `--cs-number-stepper-sep-color` | `color-mix(in oklch, var(--cs-color-text-main) 16%, transparent)` | Hairline separator color in non-input mode. |
| `--cs-number-stepper-height` | `28px` / `32px` / `36px` / `40px` / `44px` | Horizontal outer height per `data-size` (`xs`–`xl`). |
| `--cs-number-stepper-width` | `28px` / `32px` / `36px` / `40px` / `44px` | Vertical outer width per `data-size` (`xs`–`xl`). |
| `--cs-number-stepper-pad` | `3px` (`xs`–`md`), `4px` (`lg`–`xl`) | Outer shell padding and gap in editable input mode. |
| `--cs-number-stepper-radius` | `calc(var(--cs-number-stepper-height) / 2)` (horizontal) / `calc(var(--cs-number-stepper-width) / 2)` (vertical) | Outer pill border-radius with `corner-shape: var(--cs-squircle-soft)`. |
| `--cs-number-stepper-font-size` | `var(--cs-text-xs)` (`xs`–`sm`), `var(--cs-text-sm)` (`md`–`lg`), `var(--cs-text-base)` (`xl`) | Font size for input/value text. |
| `--cs-number-stepper-icon-size` | `14px` (`xs`–`sm`), `16px` (`md`–`lg`), `18px` (`xl`) | Step button icon width and height. |
| `--cs-number-stepper-value-min-width` | `42px` / `46px` / `52px` / `58px` / `64px` | Minimum width of `<NumberStepperValue />` per `data-size`. |
| `--cs-number-stepper-well-px` | `8px` (`xs`–`sm`), `10px` (`md`–`xl`) | Horizontal padding inside `.cs-number-stepper-input-shell`. |
| `--cs-number-stepper-well-bg` | `light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 14%, transparent))` (`soft`) / `var(--cs-color-base-soft)` (`elevated`) | Inner input well background. |
| `--cs-number-stepper-well-bg-hover` | `light-dark(white, color-mix(in oklch, var(--cs-color-base-100) 18%, transparent))` (`soft`) / `var(--cs-color-base-soft-hover)` (`elevated`) | Inner input well hover background. |
| `--cs-number-stepper-well-shadow` | `light-dark(var(--cs-shadow-xs), none)` (`soft`) / `none` (`elevated`) | Inner input well rest shadow. |
| `--cs-number-stepper-well-shadow-hover` | `light-dark(var(--cs-shadow-sm), none)` (`soft`) / `none` (`elevated`) | Inner input well hover shadow. |
| `--cs-number-stepper-well-ring` | `inset 0 0 0 0px transparent` | Inset ring on `.cs-number-stepper-input-shell::after` (`2px` `accent-solid` on `:focus-within`, `2px` `negative-solid` on `[data-invalid]:not([data-disabled])`). |
| `--cs-number-stepper-well-caret` | `var(--cs-color-accent-solid)` | Caret color inside `<NumberStepperInput />` (`var(--cs-color-negative-solid)` when `[data-invalid]:not([data-disabled])`). |

## Examples

### Editable Input (`soft` & `elevated`, `prefix`/`suffix`, `defaultValue`)
```svelte
<script lang="ts">
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperInput,
    } from "cs/svelte/number-stepper";

    let opacity = $state(100);
    let budget = $state(24);
</script>

<NumberStepper
    variant="soft"
    size="md"
    orientation="horizontal"
    min={0}
    max={100}
    defaultValue={100}
    bind:value={opacity}
>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="%" aria-label="Opacity" />
    <NumberStepperIncrement />
</NumberStepper>

<NumberStepper
    variant="elevated"
    size="md"
    orientation="horizontal"
    min={0}
    max={999}
    defaultValue={24}
    bind:value={budget}
>
    <NumberStepperDecrement />
    <NumberStepperInput prefix="$" aria-label="Budget" />
    <NumberStepperIncrement />
</NumberStepper>
```

### Read-Only Value with `<NumberMorph>` Composition
```svelte
<script lang="ts">
    import { NumberMorph } from "cs/svelte/number-morph";
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperValue,
    } from "cs/svelte/number-stepper";

    let zoom = $state(100);
</script>

<NumberStepper
    variant="soft"
    size="md"
    orientation="horizontal"
    min={25}
    max={400}
    step={25}
    defaultValue={100}
    bind:value={zoom}
>
    <NumberStepperDecrement />
    <NumberStepperValue>
        <NumberMorph value={zoom} suffix="%" willChange />
    </NumberStepperValue>
    <NumberStepperIncrement />
</NumberStepper>
```

### Icon-Only (Horizontal & Vertical)
```svelte
<script lang="ts">
    import { ZoomIn, ZoomOut } from "@lucide/svelte";
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
    } from "cs/svelte/number-stepper";

    let zoom = $state(100);
</script>

<NumberStepper variant="soft" size="md" orientation="horizontal" min={25} max={200} step={25} bind:value={zoom}>
    <NumberStepperDecrement icon={ZoomOut} aria-label="Zoom out" />
    <NumberStepperIncrement icon={ZoomIn} aria-label="Zoom in" />
</NumberStepper>

<NumberStepper variant="elevated" size="md" orientation="vertical" min={25} max={200} step={25} bind:value={zoom}>
    <NumberStepperDecrement icon={ZoomOut} aria-label="Zoom out" />
    <NumberStepperIncrement icon={ZoomIn} aria-label="Zoom in" />
</NumberStepper>
```

### Controlled `bind:value={get, set}` & Decimal Stepping
```svelte
<script lang="ts">
    import {
        NumberStepper,
        NumberStepperDecrement,
        NumberStepperIncrement,
        NumberStepperInput,
    } from "cs/svelte/number-stepper";

    let scale = $state(1.5);
</script>

<NumberStepper
    variant="soft"
    size="md"
    orientation="horizontal"
    min={0.5}
    max={4}
    step={0.5}
    bind:value={
        () => scale,
        (next) => {
            scale = next;
        }
    }
    onValueChange={(next) => console.log("scale:", next)}
>
    <NumberStepperDecrement />
    <NumberStepperInput suffix="x" aria-label="Scale factor" />
    <NumberStepperIncrement />
</NumberStepper>
```

## Behavior & Quirks
- **`orientation="vertical"` is strictly icon-only:** `<NumberStepperInput />` and `<NumberStepperValue />` are forbidden inside `<NumberStepper orientation="vertical">`. This is enforced both at runtime (both components throw an `Error` if `ctx.orientation === "vertical"`) and statically by the `number-stepper/no-middle-in-vertical` ESLint rule. In vertical mode, CSS `order` places `<NumberStepperIncrement />` (`order: 1`) on top and `<NumberStepperDecrement />` (`order: 2`) on bottom regardless of DOM order.
- **Decoupled `<NumberMorph>` composition:** `cs/svelte/number-stepper` does not import `@number-flow/svelte` directly so apps without that optional peer dependency can use `NumberStepper` without bundle or build errors. Compose `<NumberMorph />` inside `<NumberStepperValue>` when digit-rolling transitions are desired; `.cs-number-stepper-value-text` provides `tabular-nums` alignment and `:active` press squash (`scale: 0.93`).
- **`defaultValue` reset (middle-click & value click):** When `defaultValue !== undefined` and the stepper is not `disabled`, middle-clicking anywhere on `.cs-number-stepper` resets `value` to `defaultValue` without stealing input focus. In addition, `<NumberStepperValue />` renders as a `<button type="button">` when `defaultValue !== undefined` so primary click (or `Enter`/`Space`) also resets `value`.
- **Repeat-on-hold stepping:** Pressing and holding the primary pointer button (`event.button === 0`) on `<NumberStepperDecrement />` or `<NumberStepperIncrement />` starts auto-stepping after a `400ms` initial delay at `85ms` intervals. Timers cancel on `pointerup`, `pointercancel`, `pointerleave`, or when the button hits `min`/`max` or becomes disabled, and the trailing `click` is consumed to prevent an extra step.
- **Input editing, clamping & keyboard/a11y:**
  - Root renders `role="group"` with `aria-disabled="true"` when `disabled`.
  - `<NumberStepperDecrement />` and `<NumberStepperIncrement />` render `<button type="button">` with localized default `aria-label`s (`"Decrease"`/`"Verringern"` and `"Increase"`/`"Erhöhen"`).
  - `<NumberStepperInput />` renders `role="spinbutton"` (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-invalid`, and `inputmode="decimal"` when `step` or `min` is non-integer, otherwise `"numeric"`). Focusing selects all text; typing keeps an un-clamped draft; `blur`, `change`, or `Enter` parses, clamps to `[min, max]`, and commits (reverting empty/NaN drafts); `Escape` reverts and blurs; `ArrowUp`/`ArrowDown` step (committing any dirty draft first); `Home`/`End` jump to `min`/`max` when finite.
  - `<NumberStepperValue />` supports `ArrowUp`/`ArrowRight` (increment) and `ArrowDown`/`ArrowLeft` (decrement) when rendered as a resettable `<button>`.
- **`$bindable()` pitfall (`value={fn()}`):** Never pass a non-bound expression (e.g. `value={getCount()}`) to `value`. Because `value` is declared with `$bindable(0)` and mutated internally, passing a non-bound expression throws a Svelte 5 runtime error on step/commit **even if `onValueChange` is also passed**. Use `bind:value={state}` or `bind:value={getter, setter}`.
- **No `<HitArea />` exception:** Step buttons and value segments sit flush edge-to-edge inside a shared pill track and intentionally omit `<HitArea />` so expanded hitboxes do not overlap adjacent segments.
