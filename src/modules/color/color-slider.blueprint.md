# `ColorSlider` Blueprint

## 1. Overview & Scope

- **Kind:** `component`
- **Purpose:** Accessible 1D color-channel slider (`role="slider"`) supporting all 12 `ColorChannel` axes (`hue`, `saturation`, `value`, `hsl-saturation`, `lightness`, `red`, `green`, `blue`, `oklch-lightness`, `chroma`, `oklch-hue`, `alpha`). Works seamlessly inside `ColorPicker` via `ColorPickerContext` or standalone with `bind:value`, `onValueChange`, `onCommit`, and an optional `color` context prop.
- **Boundaries & Files:**
  - **Component:** `src/modules/color/ColorSlider.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorSlider`, `ColorSliderProps`, `COLOR_SLIDER_SIZES`, `COLOR_SLIDER_ORIENTATIONS`, `ColorSliderSize`, `ColorSliderOrientation`)
  - **Internal helpers:** `src/modules/color/color-channel.internal.ts` (channel metadata table, value clamping/stepping, `aria-valuetext` formatting, and live CSS track/thumb gradient builders — designed to be shared with future `ColorArea`)
- **Shared Principles for `ColorArea`:**
  - `ColorSlider` establishes the module's **interactive color-surface & thumb contract**: pointer capture (`setPointerCapture`), `touch-action: none`, `commit: false` on `pointermove` / `commit: true` on `pointerup` / `pointercancel` / keyboard stepping, and the **shared thumb anatomy** (circular indicator with inner live color fill, 2px white ring, subtle dark outer contrast rim, and `--cs-spring-snappy` scale physics). Future `ColorArea` will reuse the exact same thumb visual contract and `color-channel.internal.ts` channel definitions.
- **Explicit Non-Goals:**
  - Native `<input type="range">` wrapping (custom `role="slider"` thumb + track gives exact multi-stop CSS gradient control, RTL/vertical parity, and consistent `ColorArea` thumb physics).
  - Multi-thumb range sliders (always single-thumb 1D channel selection).
  - Built-in visible numeric readout or label row (consumers compose `ColorSlider` with `ColorInput` or custom labels inside `ColorPicker`).

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorSlider` (default export from `./ColorSlider.svelte`)
- `ColorSliderProps` (interface)
- `COLOR_SLIDER_SIZES`, `ColorSliderSize` (already defined in `index.ts`: `"xs" | "sm" | "md" | "lg" | "xl"`)
- `COLOR_SLIDER_ORIENTATIONS`, `ColorSliderOrientation` (already defined in `index.ts`: `"horizontal" | "vertical"`)

### `ColorSliderProps`

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable(null)`) | `null` | Bound to the root `.cs-color-slider` container. |
| `size` | `ColorSliderSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | **required** | T-shirt scale controlling track thickness, thumb diameter, and hit-target padding. No default value (matches `ColorSwatchProps` and `architecture-and-apis.md`). |
| `channel` | `ColorChannel` | **required** | One of the 12 `COLOR_CHANNELS` from `color.utils.ts`. Determines range, step, keyboard increments, gradient, and default `aria-label`. |
| `orientation` | `ColorSliderOrientation` (`"horizontal" \| "vertical"`) | `"horizontal"` | Slider axis. Horizontal tracks run min-to-max along inline-start -> inline-end (RTL-aware); vertical tracks run min (bottom) -> max (top). |
| `value` | `number \| undefined` (`$bindable(undefined)`) | `undefined` | Numeric channel value for controlled/uncontrolled standalone usage. Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: number) => void` | `undefined` | Fires on every value change during pointer drag or keyboard stepping. |
| `onCommit` | `(value: number) => void` | `undefined` | Fires when an interaction commits (`pointerup`, `pointercancel`, or keyboard stepping). |
| `color` | `string \| undefined` | `undefined` | Optional base CSS color string for standalone contextual gradients (e.g. `alpha`, `saturation`, `red`). Ignored when `ColorPickerContext` is active unless no picker context exists. |
| `label` | `string \| undefined` | `undefined` | Accessible name override for the `role="slider"` thumb. Falls back to `rest["aria-label"]`, `rest["aria-labelledby"]`, or localized channel name via `t({ de, en })`. |
| `disabled` | `boolean` | `false` | Disables pointer and keyboard interaction. Also inherits `pickerCtx?.disabled`. |
| `readonly` | `boolean` | `false` | Prevents value mutation while keeping the thumb focusable (`aria-readonly="true"`). Also inherits `pickerCtx?.readonly`. |
| `invalid` | `boolean` | `false` | Marks invalid state (`data-invalid`, `aria-invalid="true"`). Also inherits `pickerCtx?.invalid`. |
| `inverted` | `boolean` | `false` | Reverses the visual/interaction axis (e.g. max on inline-start / bottom). |

### State Resolution & `ColorPickerContext` Priority

1. **Reading active numeric value (`resolvedValue`):**
   - If `value !== undefined`: use `clampChannel(channel, value)`.
   - Else if `pickerCtx` is present: use `pickerCtx.getChannel(channel)`.
   - Else (standalone uncontrolled): use internal `$state` initialized from `color` (if valid via `parseColor(color)`) or channel fallback (`hue: 0`, `alpha: 1`, others: `0`).
2. **Reading contextual base color (for dependent gradients & thumb fill):**
   - If `pickerCtx` is present: derive from `pickerCtx.state.snapshot` and `pickerCtx.state.parsed`.
   - Else: parse `color` prop (defaulting to `#3B82F6` / `#000000` depending on channel, e.g. opaque accent/black fallback) and merge `resolvedValue` for the active `channel`.
3. **Writing on interaction (`updateValue(next, commit)`):**
   - Guard: no-op if `resolvedDisabled` or `resolvedReadonly` is `true`.
   - Snap/clamp `next` to `[min, max]` (using step precision on keyboard input; continuous or high-precision rounded on pointer drag).
   - If `pickerCtx` is present and `value === undefined`: call `pickerCtx.setChannel(channel, next, { commit })`.
   - Else: update `value = next` (or internal state if uncontrolled standalone) and invoke `onValueChange?.(next)`; when `commit` is `true`, invoke `onCommit?.(next)`.

### Channel Metadata Contract (`color-channel.internal.ts`)

| `ColorChannel` | `min` | `max` | `step` | `largeStep` | `aria-valuetext` Format | Localized Default Label (`de` / `en`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `hue` | `0` | `360` | `1` | `15` | `"{n}°"` | `Farbton` / `Hue` |
| `saturation` | `0` | `100` | `1` | `10` | `"{n}%"` | `Sättigung` / `Saturation` |
| `value` | `0` | `100` | `1` | `10` | `"{n}%"` | `Helligkeit` / `Value` |
| `hsl-saturation` | `0` | `100` | `1` | `10` | `"{n}%"` | `Sättigung` / `Saturation` |
| `lightness` | `0` | `100` | `1` | `10` | `"{n}%"` | `Helligkeit` / `Lightness` |
| `red` | `0` | `255` | `1` | `15` | `"{n}"` | `Rot` / `Red` |
| `green` | `0` | `255` | `1` | `15` | `"{n}"` | `Grün` / `Green` |
| `blue` | `0` | `255` | `1` | `15` | `"{n}"` | `Blau` / `Blue` |
| `oklch-lightness` | `0` | `1` | `0.01` | `0.1` | `"{pct}%"` (or `0.00`) | `Helligkeit` / `Lightness` |
| `chroma` | `0` | `0.4` | `0.005` | `0.02` | `"{0.000}"` | `Chroma` / `Chroma` |
| `oklch-hue` | `0` | `360` | `1` | `15` | `"{n}°"` | `Farbton` / `Hue` |
| `alpha` | `0` | `1` | `0.01` | `0.1` | `"{pct}%"` | `Deckkraft` / `Alpha` |

### CSS Variables

- `--cs-color-slider-track-size`: Track cross-axis thickness (`px`, per `size`).
- `--cs-color-slider-track-length`: Default inline-size (horizontal) or block-size (vertical) when unconstrained by parent (`100%` / `200px` default).
- `--cs-color-slider-thumb-size`: Outer thumb diameter (`px`, per `size`).
- `--cs-color-slider-radius`: Track corner radius (`var(--cs-radius-full)`).
- `--cs-color-slider-checker-size`: Checkerboard tile size for `alpha` channel (`px`, per `size`).
- `--cs-color-slider-thumb-ring`: Thumb ring color (default `white`).
- `--cs-color-slider-thumb-rim`: Subtle outer contrast rim (default `rgb(0 0 0 / 0.14)`).
- `--cs-color-slider-thumb-fill`: Live CSS color inside the thumb.
- `--cs-color-slider-gradient`: Live CSS `linear-gradient(...)` for the track.

---

## 3. DOM, Semantics & Accessibility

### DOM Structure

```html
<div
    bind:this={ref}
    class={["cs-color-slider", className]}
    data-size={size}
    data-orientation={orientation}
    data-channel={channel}
    data-alpha={channel === "alpha" ? "" : undefined}
    data-inverted={inverted ? "" : undefined}
    data-dragging={isDragging ? "" : undefined}
    data-disabled={resolvedDisabled ? "" : undefined}
    data-readonly={resolvedReadonly ? "" : undefined}
    data-invalid={resolvedInvalid ? "" : undefined}
    {...rest}
>
    <div class="cs-color-slider-track" aria-hidden="true">
        <div class="cs-color-slider-gradient"></div>
    </div>
    <div
        bind:this={thumbRef}
        class="cs-color-slider-thumb"
        role="slider"
        tabindex={resolvedDisabled ? -1 : 0}
        aria-label={resolvedAriaLabel}
        aria-labelledby={resolvedAriaLabel ? undefined : rest["aria-labelledby"]}
        aria-orientation={orientation}
        aria-valuemin={meta.min}
        aria-valuemax={meta.max}
        aria-valuenow={roundedAriaValue}
        aria-valuetext={formattedAriaValueText}
        aria-disabled={resolvedDisabled ? "true" : undefined}
        aria-readonly={resolvedReadonly ? "true" : undefined}
        aria-invalid={resolvedInvalid ? "true" : undefined}
        style:--cs-color-slider-progress={progressPercent}
    >
        <span class="cs-color-slider-thumb-fill" aria-hidden="true"></span>
    </div>
</div>
```

> **Note on `{...rest}` & ARIA:** Ensure `aria-label` / `aria-labelledby` are routed to the `role="slider"` thumb rather than duplicated on the non-interactive outer `div` wrapper.

### Pointer Interaction

- Attach `onpointerdown`, `onpointermove`, `onpointerup`, `onpointercancel` on the root `.cs-color-slider` hit surface (which includes vertical/horizontal padding around the track so compact tracks remain effortless to grab without `<HitArea />` clutter).
- On `pointerdown` (primary button only, not disabled/readonly):
  1. Call `event.currentTarget.setPointerCapture(event.pointerId)`.
  2. Focus the `role="slider"` thumb (`thumbRef?.focus({ preventScroll: true })`).
  3. Set `isDragging = true`, compute normalized ratio `[0..1]` from `getBoundingClientRect()` of the **track**, and emit `updateValue(next, false)`.
- On `pointermove` (while dragging): compute ratio and emit `updateValue(next, false)`.
- On `pointerup` / `pointercancel`: release capture if held, set `isDragging = false`, and emit `updateValue(lastValue, true)` (committing the final value).
- **Axis & RTL Calculation:**
  - `horizontal`: compute `ratio = (clientX - rect.left) / rect.width`. If `getComputedStyle(el).direction === "rtl"`, invert `ratio = 1 - ratio`. If `inverted`, invert `ratio = 1 - ratio`.
  - `vertical`: `ratio = 1 - (clientY - rect.top) / rect.height` (bottom = `0` = min, top = `1` = max). If `inverted`, invert `ratio = 1 - ratio`.

### Keyboard Navigation (on `role="slider"` thumb)

All keyboard adjustments commit immediately (`commit: true`) and call `event.preventDefault()`:
- `ArrowRight` / `ArrowUp`: `+step` (for `ArrowRight`, respect RTL by negating; if `inverted`, negate).
- `ArrowLeft` / `ArrowDown`: `-step` (for `ArrowLeft`, respect RTL by negating; if `inverted`, negate).
- `PageUp`: `+largeStep` (respect `inverted`).
- `PageDown`: `-largeStep` (respect `inverted`).
- `Home`: `min` (or `max` if `inverted`).
- `End`: `max` (or `min` if `inverted`).

---

## 4. Visual & Motion Contract

### Proportional `size` Scale (`xs..xl`)

Calibrated to pair visually with `ColorSwatch` (`20px..40px`) and `ColorInput`:

| `size` | Track Thickness | Thumb Diameter | Hit-Area Cross Padding | Checker Tile (`alpha`) |
| :--- | :--- | :--- | :--- | :--- |
| `xs` | `8px` | `12px` | `6px` (`20px` total) | `6px` |
| `sm` | `10px` | `14px` | `6px` (`22px` total) | `6px` |
| `md` | `12px` | `16px` | `6px` (`24px` total) | `8px` |
| `lg` | `14px` | `18px` | `6px` (`26px` total) | `8px` |
| `xl` | `16px` | `22px` | `6px` (`28px` total) | `10px` |

### Track Surface & Live Gradients

- **Shape:** Full pill (`border-radius: var(--cs-radius-full)`), borderless, with a subtle inner edge ring (`inset 0 0 0 1px light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12))`) so light gradients (e.g. `lightness` near 100%) remain crisp against `bg-elevated` / `bg-canvas`.
- **No Checkerboard Bleed:** Checkerboard background (`conic-gradient` matching `ColorSwatch`) is rendered **strictly** when `data-alpha` is present (`channel === "alpha"`). All 11 opaque channels render a solid gradient with zero checkerboard underneath.
- **Gradient Construction per Channel:**
  - `hue`: 7-stop sRGB/HSL spectrum (`#ff0000`, `#ffff00`, `#00ff00`, `#00ffff`, `#0000ff`, `#ff00ff`, `#ff0000`) along the track direction (`to right` / `to left` in RTL / `to top` in vertical).
  - `oklch-hue`: `linear-gradient(<dir> in oklch longer hue, oklch(0.7 0.16 0), oklch(0.7 0.16 360))` (or multi-stop sampled fallback if needed, Chromium supports `in oklch longer hue` natively).
  - `alpha`: `linear-gradient(<dir>, transparent, <opaqueCurrentColor>)` layered over the `conic-gradient` checkerboard.
  - `saturation` / `value`: 2-stop HSV endpoints converted to sRGB (`s=0..100` at current `h, v`; `v=0..100` at current `h, s`).
  - `hsl-saturation` / `lightness`: 2-stop (`hsl-saturation`: `0%..100%`) or 3-stop (`lightness`: `0%`, `50%`, `100%`) at current `h, s`.
  - `red` / `green` / `blue`: 2-stop `rgb(...)` from `0` to `255` holding the other two RGB channels constant.
  - `oklch-lightness` / `chroma`: multi-stop (e.g. 5–7 stops) sampled in `oklch(...)` at current `c, h` or `l, h` so out-of-sRGB perceptual transitions stay smooth.

### Thumb Anatomy & Motion (Shared with `ColorArea`)

- **Positioning:** Centered on the track axis at `calc(var(--cs-color-slider-progress) * 100%)` along the active axis (clamped/inset or centered at `0%..100%` of the track's inner span so the thumb's center aligns cleanly with `0%` and `100%`—matching `color.png` where the thumb sits slightly proud of the pill ends).
- **Visual Layers:**
  - Outer `box-shadow`: `0 0 0 1px var(--cs-color-slider-thumb-rim), 0 1px 3px rgb(0 0 0 / 0.22)`
  - White ring: `border: 2px solid var(--cs-color-slider-thumb-ring)`
  - Inner fill (`.cs-color-slider-thumb-fill`): displays the live color (`hsl(h 100% 50%)` for `hue`, `oklch(0.7 0.16 h)` for `oklch-hue`, or current color for all other channels; for `alpha`, renders the translucent current color over a micro-checkerboard so alpha is legible inside the thumb too).
- **Motion:**
  - Resting/release transition: `scale var(--cs-dur-240) var(--cs-spring-snappy)`.
  - `@media (hover: hover)` hover (not disabled): `scale: 1.1` with `var(--cs-dur-effect-fast) var(--cs-ease-effect)`.
  - Active drag (`[data-dragging] .cs-color-slider-thumb`): `scale: 1.18` with `var(--cs-dur-press) var(--cs-ease-press)`.
  - `:focus-visible`: uses global foundation focus ring on `.cs-color-slider-thumb` (`outline-offset: 2px`).
  - `[data-disabled]`: uses `--cs-color-disabled-bg` / `--cs-color-disabled-border` and muted grayscale track (`filter: grayscale(0.85) opacity(0.45)`), matching `ColorSwatch`.

---

## 5. Edge Cases & Constraints

- **Touch & Scroll Prevention:** `touch-action: none` on `.cs-color-slider` prevents vertical page scrolling when dragging a `vertical` slider (or diagonal jitter on `horizontal` sliders) on touch/pen devices.
- **Zero-Size / Hidden Container Guard:** If `rect.width <= 0` (horizontal) or `rect.height <= 0` (vertical) during pointer math, return early without emitting `NaN`.
- **Achromatic Hue Preservation:** When `saturation === 0` or `value === 0` (or `chroma === 0` in OKLCH), `ColorState` preserves the last non-achromatic `hue` / `oklch-hue` in its snapshot; `ColorSlider` must read from `pickerCtx.getChannel(channel)` so dragging `saturation` to `0` does not jump the `hue` slider back to `0°`.
- **Floating-Point Precision:** Step arithmetic (`value + step`) must round to channel precision (e.g. `0.01` -> 2 decimals, `0.005` -> 3 decimals) to avoid `0.30000000000000004` in `aria-valuenow` and `onValueChange`.
- **Browser Support:** Modern Chromium-first (`conic-gradient`, `light-dark()`, `in oklch longer hue`, `setPointerCapture`). Rely on global `prefers-reduced-motion` rules in `src/css/foundation/` rather than duplicating media queries inside the module.
