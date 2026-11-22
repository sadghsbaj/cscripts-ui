# `ColorArea` Blueprint

## 1. Overview & Scope

- **Kind:** `component`
- **Purpose:** Accessible 2D color-plane selector (`role="slider"` with 2D `aria-roledescription`, dual-channel `aria-valuetext`, and 2D keyboard navigation) controlling two `ColorChannel` axes simultaneously (`xChannel` along the inline axis, `yChannel` along the block axis). Works inside `ColorPicker` via `ColorPickerContext` (reading both channels and writing atomically via `setChannels`) or standalone with `bind:xValue`, `bind:yValue`, `onValueChange`, `onCommit`, and an optional `color` context prop.
- **Boundaries & Files:**
  - **Component:** `src/modules/color/ColorArea.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorArea`, `ColorAreaProps`, `COLOR_AREA_SIZES`, `ColorAreaSize`)
  - **Internal helpers:** `src/modules/color/color-channel.internal.ts` (shared channel metadata, value clamping/stepping, `aria-valuetext` formatting, default X/Y channel-pair resolution by color space, CSS 2D gradient builders, and OKLCH/fallback `<canvas>` pixel-plane renderer)
- **Parity with `ColorSlider`:**
  - Reuses the exact interactive contract established by `ColorSlider.svelte`: `setPointerCapture`, `touch-action: none`, `commit: false` on `pointermove`, `commit: true` on `pointerup` / `pointercancel` / `lostpointercapture` / keyboard stepping, `pointerFocus` (`data-pointer-focus`) to suppress pointer-triggered focus outlines, `pointer-events: auto` on the thumb for edge overhang hit-testing, and **Option A** thumb anatomy and motion.
- **Explicit Non-Goals:**
  - Built-in hue slider, alpha slider, or numeric readouts (consumers compose `ColorArea` with `ColorSlider` and `ColorInput` inside `ColorPicker`).
  - Multi-thumb or 3D/polar wheel selection (always a rectangular 2D Cartesian plane with a single thumb).
  - Hard-locked `aspect-ratio: 1` that prevents rectangular picker layouts (such as the wide `color.png` plane); height defaults scale per `size` and remain overridable via `--cs-color-area-height` / `--cs-color-area-width`.

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorArea` (default export from `./ColorArea.svelte`)
- `ColorAreaProps` (interface)
- `COLOR_AREA_SIZES`, `ColorAreaSize` (already defined in `index.ts`: `"xs" | "sm" | "md" | "lg" | "xl"`)

### `ColorAreaProps`

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable(null)`) | `null` | Bound to the root `.cs-color-area` container. |
| `size` | `ColorAreaSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | **required** | T-shirt scale controlling default area height, thumb diameter, corner radius, and checkerboard tile size. No default value. |
| `xChannel` | `ColorChannel \| undefined` | `undefined` | Horizontal (inline) color channel. Defaults based on `pickerCtx?.space` (see below). |
| `yChannel` | `ColorChannel \| undefined` | `undefined` | Vertical (block) color channel. Defaults based on `pickerCtx?.space` (see below). |
| `xValue` | `number \| undefined` (`$bindable(undefined)`) | `undefined` | Controlled/uncontrolled X-axis numeric value. Supports `bind:xValue` and `bind:xValue={get, set}`. |
| `yValue` | `number \| undefined` (`$bindable(undefined)`) | `undefined` | Controlled/uncontrolled Y-axis numeric value. Supports `bind:yValue` and `bind:yValue={get, set}`. |
| `onValueChange` | `(x: number, y: number) => void` | `undefined` | Fires on every coordinate change during pointer drag or keyboard stepping. |
| `onCommit` | `(x: number, y: number) => void` | `undefined` | Fires when an interaction commits (`pointerup`, `pointercancel`, `lostpointercapture`, or keyboard stepping). |
| `color` | `string \| undefined` | `undefined` | Optional base CSS color string for standalone usage (supplies the fixed third channel such as `hue` when picking `saturation` × `value`, plus initial X/Y values when uncontrolled). |
| `label` | `string \| undefined` | `undefined` | Accessible name override for the `role="slider"` thumb. Falls back to `rest["aria-label"]`, `rest["aria-labelledby"]`, or localized `"<xLabel> and <yLabel>"` via `t({ de, en })`. |
| `disabled` | `boolean` | `false` | Disables pointer and keyboard interaction. Also inherits `pickerCtx?.disabled`. |
| `readonly` | `boolean` | `false` | Prevents value mutation while keeping the thumb focusable (`aria-readonly="true"`). Also inherits `pickerCtx?.readonly`. |
| `invalid` | `boolean` | `false` | Marks invalid state (`data-invalid`, `aria-invalid="true"`). Also inherits `pickerCtx?.invalid`. |

### Default `xChannel` / `yChannel` Resolution

When `xChannel` or `yChannel` is omitted, resolve per axis from `pickerCtx?.space`:

| `pickerCtx?.space` | Default `xChannel` | Default `yChannel` |
| :--- | :--- | :--- |
| `"hsv"` (or standalone without `pickerCtx`) | `"saturation"` | `"value"` |
| `"hsl"` | `"hsl-saturation"` | `"lightness"` |
| `"oklch"` | `"chroma"` | `"oklch-lightness"` |

If a consumer supplies only one axis (e.g. `xChannel="red"`), the omitted axis still falls back to the table above.

### State Resolution & `ColorPickerContext` Integration

1. **Reading active coordinates (`resolvedX`, `resolvedY`):**
   - For X: if `xValue !== undefined`, use `clampChannel(resolvedXChannel, xValue)`. Else if `pickerCtx` is present, use `clampChannel(resolvedXChannel, pickerCtx.getChannel(resolvedXChannel))`. Else use uncontrolled internal `$state` initialized from `buildSnapshotFromColor(color)` (or `xMeta.defaultValue`).
   - Apply the identical priority chain for Y (`resolvedY`).
2. **Reading active color snapshot (for background plane & thumb fill):**
   - If `pickerCtx` is present and both `xValue === undefined && yValue === undefined`: use `pickerCtx.state.channels` directly.
   - Otherwise: start from `pickerCtx ? pickerCtx.state.channels : buildSnapshotFromColor(color)` and merge both `(resolvedXChannel, resolvedX)` and `(resolvedYChannel, resolvedY)` into a single snapshot via `mergeChannelIntoSnapshot`.
3. **Writing on interaction (`updateValues(nextX, nextY, commit)`):**
   - Guard: no-op if `resolvedDisabled || resolvedReadonly` is `true`.
   - Clamp both axes via `clampChannel`.
   - **Atomic `ColorPickerContext` write:** When `pickerCtx` is present and `xValue === undefined && yValue === undefined`, call:
     ```ts
     pickerCtx.setChannels(
         { [resolvedXChannel]: clampedX, [resolvedYChannel]: clampedY },
         { commit }
     );
     ```
     This guarantees a single history/emission step for simultaneous X+Y updates.
   - **Standalone / bound props write:** Update `xValue` (or `internalXValue`) and `yValue` (or `internalYValue`), invoke `onValueChange?.(clampedX, clampedY)`, and when `commit` is `true`, invoke `onCommit?.(clampedX, clampedY)`. (If `pickerCtx` is present alongside a single bound prop, update the unbound axis via `pickerCtx.setChannel` and the bound prop locally.)

### CSS Variables (`--cs-color-area-*`)

- `--cs-color-area-width`: Default root inline size (`100%`).
- `--cs-color-area-height`: Default root block size (`px`, per `size`).
- `--cs-color-area-radius`: Surface corner radius (`px`, per `size`).
- `--cs-color-area-thumb-size`: Outer thumb diameter (`px`, per `size`, matching `ColorSlider`).
- `--cs-color-area-thumb-ring`: Thumb border ring color (default `white`).
- `--cs-color-area-thumb-rim`: Subtle outer contrast rim (default `rgb(0 0 0 / 0.14)`).
- `--cs-color-area-thumb-bg`: Live CSS color inside the thumb (set inline on root, matching `--cs-color-slider-thumb-bg`).
- `--cs-color-area-checker-size`: Checkerboard tile size when an `alpha` channel is rendered (`px`, per `size`).
- `--cs-color-area-x-progress`: Normalized `[0..1]` horizontal thumb progress (`0` = inline-start, `1` = inline-end).
- `--cs-color-area-y-progress`: Normalized `[0..1]` vertical thumb progress (`0` = bottom, `1` = top).

---

## 3. DOM, Semantics & Accessibility

### DOM Structure

```html
<div
    bind:this={ref}
    {...rest}
    class={["cs-color-area", className]}
    data-size={size}
    data-x-channel={resolvedXChannel}
    data-y-channel={resolvedYChannel}
    data-alpha={isAlphaArea ? "" : undefined}
    data-dragging={isDragging ? "" : undefined}
    data-disabled={resolvedDisabled ? "" : undefined}
    data-readonly={resolvedReadonly ? "" : undefined}
    data-invalid={resolvedInvalid ? "" : undefined}
    style:--cs-color-area-thumb-bg={thumbFill}
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={finishDrag}
    onpointercancel={finishDrag}
    onlostpointercapture={handleLostPointerCapture}
>
    <div bind:this={surfaceRef} class="cs-color-area-surface" aria-hidden="true">
        <!-- Either pure CSS gradient layers OR DPR-scaled <canvas class="cs-color-area-canvas"> -->
    </div>
    <div
        bind:this={thumbRef}
        class="cs-color-area-thumb"
        role="slider"
        tabindex={resolvedDisabled ? -1 : 0}
        data-pointer-focus={pointerFocus ? "" : undefined}
        aria-roledescription={roledescription}
        aria-label={resolvedAriaLabel}
        aria-labelledby={resolvedAriaLabel ? undefined : ariaLabelledByProp}
        aria-valuemin={xMeta.min}
        aria-valuemax={xMeta.max}
        aria-valuenow={resolvedX}
        aria-valuetext={formattedAriaValueText}
        aria-disabled={resolvedDisabled ? "true" : undefined}
        aria-readonly={resolvedReadonly ? "true" : undefined}
        aria-invalid={resolvedInvalid ? "true" : undefined}
        style:--cs-color-area-x-progress={xProgress}
        style:--cs-color-area-y-progress={yProgress}
        onkeydown={handleThumbKeyDown}
        onblur={() => (pointerFocus = false)}
    >
        <span class="cs-color-area-thumb-fill" aria-hidden="true"></span>
    </div>
</div>
```

> **Note on `{...rest}` & ARIA:** Route `aria-label` and `aria-labelledby` to the `role="slider"` thumb rather than the non-interactive outer `div` wrapper (identical to `ColorSlider.svelte`).

### ARIA & Screen Reader Semantics

- `role="slider"` on `.cs-color-area-thumb`.
- `aria-roledescription`: localized via `t({ de: "2D-Farbfeld", en: "2D color area" })` so assistive tech announces 2D interaction rather than a 1D slider.
- `aria-valuemin` / `aria-valuemax` / `aria-valuenow`: bound to the X-axis channel (`xMeta.min`, `xMeta.max`, `resolvedX`) to satisfy single-number ARIA slider constraints.
- `aria-valuetext`: always includes **both** channels with their localized labels and formatted values, e.g. `"${xMeta.label} ${xMeta.formatValueText(resolvedX)}, ${yMeta.label} ${yMeta.formatValueText(resolvedY)}"` (e.g. `"Sättigung 72%, Helligkeit 85%"` / `"Saturation 72%, Value 85%"`), so every X or Y adjustment is announced clearly.
- Omit `aria-orientation` (or do not force `"horizontal"`/`"vertical"`) since movement is 2D.

### Pointer Interaction

- Attach `onpointerdown`, `onpointermove`, `onpointerup`, `onpointercancel`, `onlostpointercapture` on the root `.cs-color-area`.
- On `pointerdown` (primary button `event.button === 0`, not disabled/readonly):
  1. `event.preventDefault()`
  2. Set `isDragging = true`, `activePointerId = event.pointerId`, and call `setPointerCapture` (wrapped in `try/catch` for synthetic test environments).
  3. Set `pointerFocus = true` and focus `thumbRef?.focus({ preventScroll: true })`.
  4. Compute normalized `(xRatio, yRatio)` from `surfaceRef.getBoundingClientRect()` (reading `getComputedStyle(ref).direction === "rtl"` so `xRatio = 1 - rawX` in RTL, while `yRatio = clamp01(1 - (clientY - rect.top) / rect.height)` so bottom = `0` = min, top = `1` = max).
  5. Emit `updateValues(nextX, nextY, false)`.
- On `pointermove` (while `isDragging` and matching `activePointerId`): recompute `(nextX, nextY)` and emit `updateValues(nextX, nextY, false)`.
- On `pointerup` / `pointercancel` / `lostpointercapture`: release capture if held, set `isDragging = false`, `activePointerId = null`, and emit `updateValues(lastX, lastY, true)` to commit.

### Keyboard Navigation (on `role="slider"` thumb)

All keyboard adjustments commit immediately (`commit: true`) and call `event.preventDefault()`:
- `ArrowRight`: X `+xMeta.step * rtlSign` (`rtlSign = isRtl ? -1 : 1`)
- `ArrowLeft`: X `-xMeta.step * rtlSign`
- `ArrowUp`: Y `+yMeta.step`
- `ArrowDown`: Y `-yMeta.step`
- `Shift + ArrowRight` / `Shift + ArrowLeft`: X `±xMeta.largeStep * rtlSign`
- `Shift + ArrowUp` / `Shift + ArrowDown`: Y `±yMeta.largeStep`
- `PageUp`: Y `+yMeta.largeStep`
- `PageDown`: Y `-yMeta.largeStep`
- `Home`: X `xMeta.min` (or `yMeta.min` when `Shift` is held)
- `End`: X `xMeta.max` (or `yMeta.max` when `Shift` is held)

---

## 4. Visual & Motion Contract

### Proportional `size` Scale (`xs..xl`)

Thumb diameter and checker tile size match `ColorSlider.svelte` 1:1 so `ColorArea` + `ColorSlider` look like a single cohesive family inside `ColorPicker`:

| `size` | Default Height | Surface Radius | Thumb Diameter | Checker Tile (`alpha`) |
| :--- | :--- | :--- | :--- | :--- |
| `xs` | `120px` | `8px` (`--cs-radius-md`) | `12px` | `6px` |
| `sm` | `150px` | `10px` (`--cs-radius-lg`) | `14px` | `6px` |
| `md` | `180px` | `12px` (`--cs-radius-xl`) | `16px` | `8px` |
| `lg` | `210px` | `14px` | `18px` | `8px` |
| `xl` | `240px` | `16px` (`--cs-radius-2xl`) | `22px` | `10px` |

### Surface Shape & Elevation

- **Shape:** Borderless rectangle with `border-radius: var(--cs-color-area-radius)` and `corner-shape: superellipse(var(--cs-squircle-smooth))` (matching `color.png`).
- **Inner Edge Ring:** `.cs-color-area-surface::after` renders `box-shadow: inset 0 0 0 1px light-dark(rgb(0 0 0 / 0.08), rgb(255 255 255 / 0.12))` so light areas (near white) stay crisp against `bg-elevated` / `bg-canvas`.
- **Invalid State:** `[data-invalid] .cs-color-area-surface::after` renders `box-shadow: inset 0 0 0 1.5px var(--cs-color-negative-solid)`.
- **Disabled State:** `[data-disabled] .cs-color-area-surface` applies `filter: grayscale(0.85) opacity(0.45)`, matching `ColorSlider`.

### 2D Gradient & `<canvas>` Rendering Strategy

Use a **hybrid strategy** that picks pure CSS gradients wherever mathematically exact and crisp, and falls back to a DPR-scaled `<canvas>` only when perceptual color math or gamut boundaries require per-pixel evaluation:

1. **Pure CSS Fast-Path (crisp at any zoom/DPR, zero JS pixel loop):**
   - **HSV (`saturation` × `value` or `value` × `saturation`):**
     - Base hue fill (`hsl(<hue> 100% 50%)` or `hsv(h, 100, 100)` in sRGB)
     - Saturation ramp (`linear-gradient(to right, #fff, transparent)` — RTL-aware `to left`, or vertical if axes are swapped)
     - Value ramp (`linear-gradient(to top, #000, transparent)`)
   - **HSL (`hsl-saturation` × `lightness` or `lightness` × `hsl-saturation`):**
     - Horizontal saturation ramp (`linear-gradient(to right, #808080, hsl(<hue> 100% 50%))` — RTL-aware)
     - Vertical lightness split overlays (`linear-gradient(to top, #000, transparent 50%)` + `linear-gradient(to bottom, #fff, transparent 50%)`) so `L = 50%` preserves full saturation.
   - **sRGB Pairs (`red` × `green`, `red` × `blue`, `green` × `blue`):**
     - Base layer holding the fixed third channel (`rgb(0, 0, <fixed>)` etc.) plus two orthogonal single-channel gradients (`0 → 255` on X, `0 → 255` on Y) composited with `mix-blend-mode: screen`.

2. **DPR-Scaled `<canvas>` Fallback (`oklch` & arbitrary channel pairs):**
   - Required for `oklch` (`chroma` × `oklch-lightness`, `oklch-hue` × `oklch-lightness`, etc.) and any non-CSS-linear channel combination (e.g. `hue` × `saturation`, `alpha` pairs).
   - **Gamut-Clamping:** Each pixel `(x, y)` evaluates `oklchToOklab([L, C, H])` and clamps out-of-gamut colors to the display/sRGB gamut via `clampParsedToGamut` (from `color-math.internal.ts`), ensuring accurate perceptual curves and smooth gamut boundaries.
   - **DPR & Redraw Discipline:**
     - Track `surfaceRef` dimensions via `ResizeObserver` and scale canvas backing resolution with `Math.min(window.devicePixelRatio || 1, 2)` (capped to avoid excessive fill work on 3x/4x mobile screens).
     - Redraw **only** when the fixed background parameter(s) (e.g. `oklch-hue`), `xChannel`/`yChannel`, `isRtl`, or surface dimensions change — **never** when only `xValue` or `yValue` changes during thumb dragging.

### Thumb Anatomy & Option A Motion (100% Parity with `ColorSlider.svelte`)

- **Positioning:**
  - `inset-inline-start: calc(var(--cs-color-area-x-progress) * 100%)`
  - `inset-block-end: calc(var(--cs-color-area-y-progress) * 100%)`
  - Individual `translate` property: `translate: -50% 50%;` (and `&:dir(rtl) { translate: 50% 50%; }`) so the thumb center aligns cleanly with `[0%..100%]` on both axes, overhanging the surface edges at extremes without clipping (`.cs-color-area-surface` has `overflow: hidden`, while `.cs-color-area` does not clip the thumb).
- **Visual Layers:**
  - `inline-size` / `block-size`: `var(--cs-color-area-thumb-size)`
  - `border: 2px solid var(--cs-color-area-thumb-ring)` (`white`)
  - `border-radius: var(--cs-radius-full)`
  - `box-shadow: 0 0 0 1px var(--cs-color-area-thumb-rim), 0 1px 3px rgb(0 0 0 / 0.22)`
  - Inner `.cs-color-area-thumb-fill` using `background-color: var(--cs-color-area-thumb-bg)` (with micro-checkerboard underneath if either channel is `alpha`).
  - `[data-disabled]`: `--cs-color-disabled-border` ring, `box-shadow: none`, and `--cs-color-disabled-bg` fill.
- **Cursors & Pointer Hit-Testing:**
  - Root `.cs-color-area`: `cursor: default;`
  - `.cs-color-area-surface`: `pointer-events: none;`
  - `.cs-color-area-thumb`: `pointer-events: auto;` (ensures the overhanging half of the thumb at `0%` / `100%` edges still shows `grab` and initiates drag).
  - `@media (hover: hover)` on `.cs-color-area:not([data-disabled], [data-readonly]) .cs-color-area-thumb:hover`: `cursor: grab;`
  - `[data-dragging]` on root and thumb: `cursor: grabbing;`
- **Option A Motion & Focus:**
  - Resting/release: `scale: 1; transition: scale var(--cs-dur-240) var(--cs-spring-snappy);`
  - Active/drag (`.cs-color-area:is([data-dragging], :active:not([data-disabled], [data-readonly])) .cs-color-area-thumb`): `scale: 1.1; transition: scale var(--cs-dur-160) var(--cs-ease-cubic-out);`
  - No hover scale.
  - `:focus-visible`: `z-index: 2; outline-offset: 2px;`, suppressed via `&[data-pointer-focus]:focus-visible { outline: none; }` when focused by pointer.

---

## 5. Edge Cases & Constraints

- **Touch & Scroll Prevention:** `touch-action: none` on `.cs-color-area` prevents vertical or horizontal page scrolling during 2D dragging on touch/pen devices.
- **Zero-Size / Hidden Container Guard:** If `rect.width <= 0 || rect.height <= 0` during pointer math (or `ResizeObserver` canvas sizing), return early without emitting `NaN` or creating a `0x0` `ImageData` buffer.
- **Achromatic Hue Preservation:** When `saturation === 0` / `value === 0` (HSV), `hsl-saturation === 0` / `lightness === 0 | 100` (HSL), or `chroma === 0` / `oklch-lightness === 0 | 1` (OKLCH), `ColorState` preserves the last non-achromatic hue in its snapshot; `ColorArea` must read the hue from `pickerCtx.state.channels` (or `standaloneBaseSnapshot`) so dragging to black/white/gray does not reset the background hue to `0°`.
- **RTL Support:** Both CSS gradient direction (`to left` vs `to right` on horizontal ramps), `<canvas>` X-coordinate mapping, pointer X calculation, `ArrowLeft`/`ArrowRight` stepping, and thumb `translate: 50% 50%` under `:dir(rtl)` must stay synchronized.
- **Floating-Point Precision:** Clamp and round via `clampChannel` / `stepChannelValue` from `color-channel.internal.ts` so `aria-valuenow`, `aria-valuetext`, and `onValueChange` never emit floating-point drift (e.g. `0.30000000000000004`).
- **Browser Support:** Modern Chromium-first (`corner-shape: superellipse(...)`, `light-dark()`, `setPointerCapture`, `mix-blend-mode: screen`, `ResizeObserver`). Rely on `src/css/foundation/` for global `:focus-visible` and `prefers-reduced-motion` handling.
