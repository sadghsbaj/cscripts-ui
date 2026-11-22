---
name: Color
kind: hybrid
import: cs/svelte/color
exports:
    - ColorPicker
    - ColorArea
    - ColorSlider
    - ColorSwatch
    - ColorSwatchGroup
    - ColorInput
    - ColorFormatSelect
    - ColorEyeDropper
    - ColorState
    - createColorState
    - parseColor
    - formatColor
    - convertColor
    - isInGamut
    - clampToGamut
    - getRelativeLuminance
    - getContrastRatio
    - isEyeDropperSupported
    - getColorPickerContext
    - setColorPickerContext
    - hasColorPickerContext
    - getColorSwatchGroupContext
    - setColorSwatchGroupContext
    - hasColorSwatchGroupContext
    - COLOR_PICKER_SPACES
    - COLOR_AREA_SIZES
    - COLOR_SLIDER_SIZES
    - COLOR_SLIDER_ORIENTATIONS
    - COLOR_SWATCH_SIZES
    - COLOR_SWATCH_GROUP_ORIENTATIONS
    - COLOR_SWATCH_PRESETS
    - COLOR_INPUT_VARIANTS
    - COLOR_INPUT_SIZES
    - COLOR_FORMAT_SELECT_VARIANTS
    - COLOR_FORMAT_SELECT_SIZES
    - COLOR_FORMAT_SELECT_DEFAULTS
    - COLOR_EYE_DROPPER_VARIANTS
    - COLOR_EYE_DROPPER_SIZES
    - COLOR_EYE_DROPPER_UNSUPPORTED_BEHAVIORS
    - COLOR_FORMATS
    - COLOR_ALPHA_FORMATS
    - COLOR_SPACES
    - COLOR_GAMUTS
    - COLOR_CHANNELS
    - ColorPickerSpace
    - ColorAreaSize
    - ColorSliderSize
    - ColorSliderOrientation
    - ColorSwatchSize
    - ColorSwatchGroupOrientation
    - ColorSwatchPreset
    - ColorInputVariant
    - ColorInputSize
    - ColorFormatSelectVariant
    - ColorFormatSelectSize
    - ColorEyeDropperVariant
    - ColorEyeDropperSize
    - ColorEyeDropperUnsupportedBehavior
    - ColorFormat
    - ConcreteColorFormat
    - ColorAlphaFormat
    - ColorSpace
    - ColorGamut
    - ColorChannel
    - ParsedColor
    - FormatColorOptions
    - ColorChannelsTuple
    - ColorChannelSnapshot
    - ColorChannelMutationOptions
    - CreateColorStateOptions
    - ColorPickerContext
    - ColorSwatchGroupContext
    - ColorPickerProps
    - ColorAreaProps
    - ColorSliderProps
    - ColorSwatchProps
    - ColorSwatchGroupProps
    - ColorInputBaseProps
    - ColorInputFullProps
    - ColorInputChannelProps
    - ColorInputProps
    - ColorFormatSelectProps
    - ColorEyeDropperProps
---

# Color

## Overview

Composable color-picker suite built around a headless `ColorPicker` context provider and modular primitives (`ColorArea`, `ColorSlider`, `ColorSwatch`, `ColorSwatchGroup`, `ColorInput`, `ColorFormatSelect`, `ColorEyeDropper`). Backed by a dual-layer `ColorState` engine and CSS Color Level 4 utilities (`parseColor`, `formatColor`, `convertColor`, gamut clamping, and WCAG contrast helpers) supporting sRGB, HSL, HSV, OKLCH, OKLab, and Display P3.

## Usage Guidance

- **Business apps vs. graphic/design tools (`space`):** Use the default `space="hsv"` (with Hex/RGB/HSL formats) for standard business applications and end-user forms—it is the most familiar editing model. Reserve `space="oklch"` (paired with `defaultFormat="oklch"`) for dedicated graphic/design tools or wide-gamut workflows.
- **Give `ColorInput` enough width alongside `ColorFormatSelect`:** `ColorInput` defaults to compact widths (`112px`–`144px` in full-color mode). When pairing it with `ColorFormatSelect`, pass `class="flex-1 min-w-0"` or override `--cs-color-input-width` (e.g. `100%`) so longer strings like `rgb(...)` or `oklch(...)` remain readable without horizontal scrolling.
- **Composability with `clipboard` and `context-menu`:**
  - Place `<TextInputAction>` with `<CopyIcon />` and `copyOnClick` inside `<ColorInput>`'s `children` slot for one-click copying.
  - Wrap `<ColorSwatchGroup>` in `<ContextMenu>` with `contextMenuTrigger` on each `<ColorSwatch>` to let users copy or remove saved colors.
  - `<ColorEyeDropper>` renders as a compact icon-only `Button` and defaults to `unsupportedBehavior="hide"`, cleanly omitting itself in non-Chromium browsers.

## API

### `ColorPicker` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Surfaceless `<div role="group" class="cs-color-picker">` context provider that creates a `ColorState` instance and exposes `ColorPickerContext` to nested primitives.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | No | `undefined` | `$bindable` controlled CSS color string. Supports `bind:value` and `bind:value={get, set}`. |
| `defaultValue` | `string` | No | `"#3b82f6"` | Initial CSS color string for uncontrolled usage. |
| `onValueChange` | `(value: string) => void` | No | `undefined` | Fires on every color mutation (including live pointer drags and typing). |
| `onCommit` | `(value: string) => void` | No | `undefined` | Fires when an interaction commits (drag end, keyboard step, Enter/blur, swatch/eyedropper pick). |
| `format` | `ColorFormat` | No | `undefined` | `$bindable` controlled output/editing format (`"auto" \| "hex" \| "hex8" \| "rgb" \| "hsl" \| "oklch" \| "p3"`). |
| `defaultFormat` | `ColorFormat` | No | `"auto"` | Initial format when `format` is uncontrolled. |
| `onFormatChange` | `(format: ColorFormat) => void` | No | `undefined` | Fires when `setFormat` is called (e.g. via `ColorFormatSelect`). |
| `space` | `ColorPickerSpace` | No | `"hsv"` | Editing color space exposed via `ColorPickerContext.space`: `"hsv" \| "hsl" \| "oklch"`. |
| `alphaFormat` | `ColorAlphaFormat` | No | `"auto"` | Controls alpha channel emission in `ColorState` formatted output strings: `"auto" \| "always" \| "never"`. |
| `gamut` | `ColorGamut` | No | `undefined` | Optional target gamut clamping applied by `ColorState`: `"srgb" \| "p3"`. |
| `disabled` | `boolean` | No | `false` | Disables all nested color primitives and sets `aria-disabled="true"`. |
| `readonly` | `boolean` | No | `false` | Prevents color mutations in nested primitives (`ColorFormatSelect` remains interactive). |
| `invalid` | `boolean` | No | `false` | Propagates invalid state (`data-invalid`) to nested primitives. |
| `label` | `string` | No | Localized `"Color picker"` / `"Farbwähler"` | Accessible group name (`aria-label`). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `children` | `Snippet<[ColorPickerContext]>` | No | `undefined` | Child content receiving `ColorPickerContext` as a snippet parameter. |

#### `ColorPicker` `data-*` Attributes & CSS Variables

- **`data-*`:** `data-space={space}`, `data-format={resolvedFormat}`, `data-disabled`, `data-readonly`, `data-invalid`.
- **CSS Variables (`.cs-color-picker`):**
  - `--cs-color-picker-gap` (default `12px`): Vertical gap between flex children.
  - `--cs-color-picker-width` (default `100%`): Inline size of the picker group.

---

### `ColorArea` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Interactive 2D color plane with a `role="slider"` thumb supporting pointer drag, RTL mirroring, and 2D keyboard navigation (`Arrow*`, `Shift+Arrow*`, `PageUp`/`PageDown`, `Home`/`End`, `Shift+Home`/`Shift+End`).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `ColorAreaSize` | Yes | — | T-shirt scale controlling height (`120px`–`240px`), thumb diameter (`12px`–`22px`), radius, and checkerboard size: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `xChannel` | `ColorChannel` | No | Space-dependent | Horizontal (inline) color channel. Defaults to `"saturation"` (`hsv`), `"hsl-saturation"` (`hsl`), or `"chroma"` (`oklch`). |
| `yChannel` | `ColorChannel` | No | Space-dependent | Vertical (block) color channel. Defaults to `"value"` (`hsv`), `"lightness"` (`hsl`), or `"oklch-lightness"` (`oklch`). |
| `xValue` | `number` | No | `undefined` | `$bindable` X-axis numeric value for controlled/standalone usage. |
| `yValue` | `number` | No | `undefined` | `$bindable` Y-axis numeric value for controlled/standalone usage. |
| `onValueChange` | `(x: number, y: number) => void` | No | `undefined` | Fires on every coordinate change during pointer drag or keyboard stepping. |
| `onCommit` | `(x: number, y: number) => void` | No | `undefined` | Fires when an interaction commits (`pointerup`, `pointercancel`, `lostpointercapture`, or keyboard stepping). |
| `color` | `string` | No | `undefined` | Optional base CSS color string for standalone usage. |
| `label` | `string` | No | Localized `"{xLabel} and {yLabel}"` | Accessible name override (`aria-label`) for the `role="slider"` thumb. |
| `disabled` | `boolean` | No | `false` | Disables interaction (`disabled \|\| pickerCtx?.disabled`). |
| `readonly` | `boolean` | No | `false` | Prevents mutations (`readonly \|\| pickerCtx?.readonly`). |
| `invalid` | `boolean` | No | `false` | Applies negative `1.5px` border (`invalid \|\| pickerCtx?.invalid`). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

#### `ColorArea` `data-*` Attributes & CSS Variables

- **`data-*`:** `data-size={size}`, `data-x-channel`, `data-y-channel`, `data-alpha` (when either axis is `"alpha"`), `data-dragging`, `data-disabled`, `data-readonly`, `data-invalid`.
- **CSS Variables (`.cs-color-area`):**
  - `--cs-color-area-width` (default `100%`)
  - `--cs-color-area-height` (`120px` / `150px` / `180px` / `210px` / `240px` across `xs`–`xl`)
  - `--cs-color-area-radius` (`--cs-radius-md`, `--cs-radius-lg`, `--cs-radius-xl`, `14px`, `--cs-radius-2xl` across `xs`–`xl`)
  - `--cs-color-area-thumb-size` (`12px` / `14px` / `16px` / `18px` / `22px` across `xs`–`xl`)
  - `--cs-color-area-thumb-ring` (default `white`)
  - `--cs-color-area-thumb-rim` (default `rgb(0 0 0 / 0.14)`)
  - `--cs-color-area-checker-size` (`6px` / `6px` / `8px` / `8px` / `10px` across `xs`–`xl`)

---

### `ColorSlider` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Accessible 1D `role="slider"` channel track supporting all 12 `ColorChannel` values, horizontal/vertical orientation, RTL, and axis inversion.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `ColorSliderSize` | Yes | — | T-shirt scale controlling track thickness (`8px`–`16px`) and thumb diameter (`12px`–`22px`): `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `channel` | `ColorChannel` | Yes | — | Color channel axis controlled by this slider. |
| `orientation` | `ColorSliderOrientation` | No | `"horizontal"` | Slider axis: `"horizontal" \| "vertical"`. |
| `value` | `number` | No | `undefined` | `$bindable` numeric channel value for controlled/standalone usage. |
| `onValueChange` | `(value: number) => void` | No | `undefined` | Fires on every value change during pointer drag or keyboard stepping. |
| `onCommit` | `(value: number) => void` | No | `undefined` | Fires when an interaction commits. |
| `color` | `string` | No | `undefined` | Optional base CSS color string for standalone contextual gradients. |
| `label` | `string` | No | Localized channel name | Accessible name override (`aria-label`) for the thumb. |
| `disabled` | `boolean` | No | `false` | Disables interaction (`disabled \|\| pickerCtx?.disabled`). |
| `readonly` | `boolean` | No | `false` | Prevents mutations (`readonly \|\| pickerCtx?.readonly`). |
| `invalid` | `boolean` | No | `false` | Applies negative `1.5px` inset border (`invalid \|\| pickerCtx?.invalid`). |
| `inverted` | `boolean` | No | `false` | Reverses the visual and interaction axis (e.g. max on inline-start / bottom). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

#### `ColorSlider` `data-*` Attributes & CSS Variables

- **`data-*`:** `data-size={size}`, `data-orientation={orientation}`, `data-channel={channel}`, `data-alpha` (when `channel === "alpha"`), `data-inverted`, `data-dragging`, `data-disabled`, `data-readonly`, `data-invalid`.
- **CSS Variables (`.cs-color-slider`):**
  - `--cs-color-slider-track-length` (default `100%` horizontal / `200px` vertical)
  - `--cs-color-slider-track-size` (`8px` / `10px` / `12px` / `14px` / `16px` across `xs`–`xl`)
  - `--cs-color-slider-thumb-size` (`12px` / `14px` / `16px` / `18px` / `22px` across `xs`–`xl`)
  - `--cs-color-slider-radius` (default `var(--cs-radius-full)`)
  - `--cs-color-slider-hit-pad` (default `6px`)
  - `--cs-color-slider-thumb-ring` (default `white`)
  - `--cs-color-slider-thumb-rim` (default `rgb(0 0 0 / 0.14)`)
  - `--cs-color-slider-checker-size` (`6px` / `6px` / `8px` / `8px` / `10px` across `xs`–`xl`)

---

### `ColorSwatch` & `ColorSwatchGroup`

#### `ColorSwatch` Props

Extends `HTMLAttributes<HTMLElement>`. Renders either a non-interactive `<span>` (`mode="preview"`) or an interactive `<button type="button">` (`mode="button"` or `"radio"` inside `ColorSwatchGroup`) with an embedded `<HitArea>` for touch targets.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `ColorSwatchSize` | Yes | — | T-shirt scale controlling dimensions (`20px` / `24px` / `28px` / `32px` / `40px`): `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `color` | `string` | No | `pickerCtx?.value ?? "transparent"` | CSS color string displayed by the swatch. |
| `label` | `string` | No | Formatted `color` | Human-readable color name used for `aria-label`. |
| `mode` | `"auto" \| "preview" \| "button"` | No | `"auto"` | `"auto"` resolves to `"radio"` inside `ColorSwatchGroup` and `"preview"` otherwise. |
| `selected` | `boolean` | No | `undefined` | Standalone selection override (falls back to `ColorSwatchGroup` selection when nested). |
| `showCheck` | `boolean` | No | `true` | Shows a luminance-adaptive checkmark when selected; `false` renders an outer selection halo instead. |
| `decorative` | `boolean` | No | `false` | Sets `aria-hidden="true"` on `"preview"` swatches paired with adjacent visible color text. |
| `disabled` | `boolean` | No | `false` | Disables interactive swatches (`disabled \|\| groupCtx?.disabled \|\| pickerCtx?.disabled`). |
| `onclick` | `(event: MouseEvent) => void` | No | `undefined` | Click handler. |
| `ref` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the `<span>` or `<button>`. |
| `children` | `Snippet` | No | `undefined` | Optional custom overlay content. |

#### `ColorSwatchGroup` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Coordinates `role="radiogroup"` single-selection, roving `tabindex`, and 1D/2D keyboard navigation across child `ColorSwatch` items.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | No | `undefined` | `$bindable` selected color string; falls back to `ColorPickerContext.value` when nested. |
| `onValueChange` | `(value: string) => void` | No | `undefined` | Fires when a swatch is selected via pointer or keyboard. |
| `orientation` | `ColorSwatchGroupOrientation` | No | `"both"` | Arrow-key axes and default flex direction: `"horizontal" \| "vertical" \| "both"`. |
| `columns` | `number` | No | `undefined` | Positive integer (`>= 1`) switching layout from `flex-wrap` to a fixed-column CSS Grid. |
| `disabled` | `boolean` | No | `false` | Disables all child swatches and keyboard navigation. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the `<div>`. |
| `children` | `Snippet` | No | `undefined` | `<ColorSwatch>` items. |

#### `COLOR_SWATCH_PRESETS`

Exported 14-color palette array (`readonly ColorSwatchPreset[]`, each `{ color: string; label: string }` with localized DE/EN labels) ready to iterate inside `<ColorSwatchGroup>`.

#### `ColorSwatch` & `ColorSwatchGroup` `data-*` Attributes & CSS Variables

- **`ColorSwatch` `data-*`:** `data-size={size}`, `data-mode="preview" | "button" | "radio"`, `data-selected`, `data-show-check`, `data-check-contrast="checker" | "dark" | "light"`, `data-halo-tone="transparent" | "near-white" | "near-black" | "normal"`, `data-translucent`, `data-disabled`.
- **`ColorSwatch` CSS Variables (`.cs-color-swatch`):**
  - `--cs-color-swatch-size` (`20px` / `24px` / `28px` / `32px` / `40px` across `xs`–`xl`)
  - `--cs-color-swatch-radius` (default `calc(var(--cs-color-swatch-size) / 2)`)
  - `--cs-color-swatch-squircle` (default `var(--cs-squircle-soft)`)
  - `--cs-color-swatch-edge` (rim border color)
  - `--cs-color-swatch-halo` (outer ring color when `showCheck={false}`)
  - `--cs-color-swatch-check-fg` (checkmark color override)
  - `--cs-color-swatch-checker-size` (`8px` / `8px` / `10px` / `10px` / `12px` across `xs`–`xl`)
- **`ColorSwatchGroup` `data-*`:** `data-orientation={orientation}`, `data-layout="grid" | "flex"`, `data-columns`, `data-disabled`.
- **`ColorSwatchGroup` CSS Variables (`.cs-color-swatch-group`):**
  - `--cs-color-swatch-group-gap` (default `8px`)
  - `--cs-color-swatch-group-columns` (set from `columns` prop)

---

### `ColorInput` Props

Built on `TextInput` + `TextInputField`. Operates in **Full-Color Mode** (`channel` omitted) or **Single-Channel Numeric Mode** (`channel` provided). Supports `children` (e.g. `<TextInputAction>`).

#### Shared Base Props (`ColorInputBaseProps`)

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ColorInputVariant` | Yes | — | Visual shell style forwarded to `TextInput`: `"soft" \| "elevated"`. |
| `size` | `ColorInputSize` | Yes | — | T-shirt scale forwarded to `TextInput` (`28px`–`44px` height): `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `placeholder` | `string` | No | `undefined` | Input placeholder text. |
| `label` | `string` | No | Localized `"Color value"` or channel label | Accessible name (`aria-label`) for the inner `<input>`. |
| `disabled` | `boolean` | No | `false` | Disables the input (`disabled \|\| pickerCtx?.disabled`). |
| `readonly` | `boolean` | No | `false` | Sets readonly (`readonly \|\| pickerCtx?.readonly`); `TextInputAction` children remain clickable. |
| `invalid` | `boolean` | No | `false` | Applies invalid ring (`invalid \|\| pickerCtx?.invalid`). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `TextInput` `<div>`. |
| `inputRef` | `HTMLInputElement \| null` | No | `null` | `$bindable` reference to the inner `<input>`. |
| `children` | `Snippet` | No | `undefined` | Trailing slot content (e.g. `<TextInputAction>`). |

#### Full-Color Mode (`ColorInputFullProps`, `channel?: undefined`)

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `string` | No | `undefined` | `$bindable` CSS color string for standalone controlled/uncontrolled usage. |
| `onValueChange` | `(value: string) => void` | No | `undefined` | Fires on valid live input or commit. |
| `onCommit` | `(value: string) => void` | No | `undefined` | Fires on Enter or blur commit. |
| `format` | `ColorFormat` | No | `"auto"` | Output format (`"auto"` resolves to `pickerCtx.format`, `parsed.sourceFormat`, then `"hex"`). |
| `alpha` | `ColorAlphaFormat` | No | `"auto"` | Controls alpha emission in `formatColor`. |
| `showSwatch` | `boolean` | No | `false` | Renders a compact decorative `ColorSwatch` preview as a leading prefix. |
| `showPrefix` | `boolean` | No | `true` | Renders `#` as a muted leading prefix span in `hex`/`hex8` modes. |

#### Single-Channel Numeric Mode (`ColorInputChannelProps`)

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `channel` | `ColorChannel` | Yes | — | Selects Single-Channel Numeric Mode (`ArrowUp`/`ArrowDown` stepping supported). |
| `value` | `number` | No | `undefined` | `$bindable` underlying numeric channel value (e.g. `0..1` for `alpha`, `0..360` for `hue`). |
| `onValueChange` | `(value: number) => void` | No | `undefined` | Fires on valid numeric input, arrow stepping, or commit. |
| `onCommit` | `(value: number) => void` | No | `undefined` | Fires on Enter, blur, or arrow stepping. |
| `color` | `string` | No | `undefined` | Optional base CSS color string for standalone usage when `value` and `pickerCtx` are absent. |
| `showUnit` | `boolean` | No | `true` | Appends channel unit (`%` or `°`) to the formatted display string. |

#### `ColorInput` `data-*` Attributes & CSS Variables

- **`data-*`:** `data-mode="full" | "channel"`, `data-channel={channel}` (plus `TextInput`'s `data-variant`, `data-size`, `data-invalid`, `data-disabled`, `data-readonly`).
- **CSS Variables (`.cs-color-input`):**
  - `--cs-color-input-width` (default `112px`–`144px` in `full` mode, `64px`–`80px` in `channel` mode across `xs`–`xl`)
  - `--cs-color-input-swatch-size` (`14px` / `16px` / `18px` / `20px` / `22px` across `xs`–`xl`)
  - `--cs-color-input-prefix-fg` (default `var(--cs-color-text-weak)`)

---

### `ColorFormatSelect` Props

Extends `Omit<HTMLButtonAttributes, "type" | "value" | "children">`. Built on `Select` (`width="min-anchor"`). Syncs with `ColorPickerContext.format` when nested, and remains interactive even when `ColorPicker` has `readonly={true}`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ColorFormatSelectVariant` | Yes | — | Visual shell style forwarded to `Select`: `"soft" \| "elevated"`. |
| `size` | `ColorFormatSelectSize` | Yes | — | T-shirt scale forwarded to `Select`: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `value` | `ColorFormat` | No | `undefined` | `$bindable` controlled/standalone selected format. |
| `onValueChange` | `(format: ColorFormat) => void` | No | `undefined` | Fires when a format is selected. |
| `open` | `boolean` | No | `false` | `$bindable` popover open state forwarded to `Select`. |
| `onOpenChange` | `(open: boolean) => void` | No | `undefined` | Fires whenever open state changes. |
| `formats` | `readonly ColorFormat[]` | No | `COLOR_FORMAT_SELECT_DEFAULTS` | Ordered list of selectable formats (`["hex", "rgb", "hsl", "oklch"]` by default). |
| `disabled` | `boolean` | No | `false` | Disables the select (`disabled \|\| pickerCtx?.disabled`). |
| `invalid` | `boolean` | No | `false` | Applies invalid ring (`invalid \|\| pickerCtx?.invalid`). |
| `label` | `string` | No | Localized `"Color format"` / `"Farbformat"` | Accessible name (`aria-label`) for `SelectTrigger`. |
| `name` | `string` | No | `undefined` | Hidden `<input>` name forwarded to `Select`. |
| `required` | `boolean` | No | `false` | Sets `aria-required="true"` on `SelectTrigger`. |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to `SelectTrigger`. |

#### `ColorFormatSelect` CSS Variables

- **CSS Variables (`.cs-color-format-select-trigger`):**
  - `--cs-color-format-select-width` (default `fit-content`)
  - `--cs-color-format-select-min-width` (`72px` / `76px` / `84px` / `92px` / `100px` across `xs`–`xl`)

---

### `ColorEyeDropper` Props

Extends `Omit<HTMLButtonAttributes, "type" | "color" | "size" | "value">`. Built on `Button` (`iconOnly` when `children` is omitted, with `<HitArea>` for `xs`–`lg`). Wraps Chromium's `EyeDropper` API.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ColorEyeDropperVariant` | Yes | — | Visual style forwarded 1:1 to `Button`: `"primary" \| "secondary" \| "tertiary" \| "ghost" \| "elevated"`. |
| `size` | `ColorEyeDropperSize` | Yes | — | T-shirt scale forwarded 1:1 to `Button`: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `value` | `string` | No | `undefined` | `$bindable` CSS color string updated to `result.sRGBHex` on pick. |
| `onPick` | `(color: string) => void` | No | `undefined` | Fires with the picked `sRGBHex` string when sampling succeeds. |
| `onError` | `(error: unknown) => void` | No | `undefined` | Optional handler for non-abort `EyeDropper.open()` failures. |
| `unsupportedBehavior` | `ColorEyeDropperUnsupportedBehavior` | No | `"hide"` | Behavior when `EyeDropper` is unavailable: `"hide" \| "disable"`. |
| `disabled` | `boolean` | No | `false` | Disables the button (`disabled \|\| pickerCtx?.disabled \|\| pickerCtx?.readonly`). |
| `label` | `string` | No | Localized `"Pick color from screen"` | Accessible name (`aria-label`) when `children` is omitted. |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>`. |
| `children` | `Snippet` | No | `undefined` | Optional custom button content (replaces default `Pipette` icon). |

- **`data-*`:** `data-picking` (while eyedropper session is active), `data-unsupported` (when `EyeDropper` is unavailable and `unsupportedBehavior="disable"`).

---

### Headless State (`createColorState` & `ColorState`)

`createColorState(options?: CreateColorStateOptions): ColorState` creates a reactive Svelte 5 `ColorState` instance.

#### `CreateColorStateOptions`

| Option | Type | Description |
| :--- | :--- | :--- |
| `value` | `() => string \| undefined` | Getter for controlled external color string. |
| `setValue` | `(next: string) => void` | Setter called when internal mutations update the controlled value. |
| `defaultValue` | `string` | Initial color string for uncontrolled usage (falls back to `"#000000"`). |
| `format` | `() => ColorFormat \| undefined` | Getter for output format (`"auto"` preserves `parsed.sourceFormat`). |
| `alphaFormat` | `() => ColorAlphaFormat \| undefined` | Getter for alpha formatting rule (`"auto" \| "always" \| "never"`). |
| `gamut` | `() => ColorGamut \| undefined` | Getter for target gamut clamping (`"srgb" \| "p3"`). |
| `onValueChange` | `(value: string) => void` | Fires on every formatted value change. |
| `onCommit` | `(value: string) => void` | Fires when `commit()` is called or an edit passes `{ commit: true }`. |

#### `ColorState` Properties & Methods

- **Getters:**
  - `value: string` — Current formatted CSS color string.
  - `parsed: ParsedColor` — High-precision internal color representation.
  - `channels: ColorChannelSnapshot` — Snapshot containing `{ hsv: { h, s, v }, hsl: { h, s, l }, oklch: { l, c, h }, rgb: { r, g, b }, p3: { r, g, b }, alpha }`.
  - `resolvedFormat: ConcreteColorFormat` — Active concrete output format.
  - `inGamut: boolean` — Whether `parsed` fits inside the configured `gamut` (defaults to `"srgb"`).
- **Methods:**
  - `getChannel(channel: ColorChannel): number` — Reads a single channel in its canonical range.
  - `setChannel(channel: ColorChannel, next: number, options?: ColorChannelMutationOptions): void` — Mutates one channel while preserving polar axes.
  - `setChannels(partial: Partial<Record<ColorChannel, number>>, options?: ColorChannelMutationOptions): void` — Atomically mutates multiple channels.
  - `setString(raw: string, options?: ColorChannelMutationOptions): boolean` — Parses and applies a CSS color string; returns `false` on invalid input.
  - `commit(): void` — Flushes pending uncommitted edits and fires `onCommit` once.
  - `sync(): void` — Synchronizes any pending external `value()` change into internal state.

---

### Pure Color Utilities & Channel Reference

- **`parseColor(input: string): ParsedColor | null`** — Parses `#hex`, `rgb()`, `hsl()`, `hwb()`, `oklab()`, `oklch()`, `color(srgb ...)`, `color(display-p3 ...)`, or CSS named colors into `ParsedColor`; returns `null` on invalid input.
- **`formatColor(color: ParsedColor | string, format?: ConcreteColorFormat, options?: FormatColorOptions): string`** — Formats a color into `"hex" | "hex8" | "rgb" | "hsl" | "oklch" | "p3"` (defaults to `parsed.sourceFormat`). `options`: `{ alpha?: ColorAlphaFormat; precision?: number; gamut?: ColorGamut }`.
- **`convertColor(color: ParsedColor | string, targetSpace: ColorSpace): ColorChannelsTuple`** — Converts a color to a 3-number tuple for `"srgb"` (`0..255`), `"hsl"` (`0..360`, `0..100`, `0..100`), `"hsv"` (`0..360`, `0..100`, `0..100`), `"oklch"` (`0..1`, `0..0.4+`, `0..360`), `"oklab"` (`0..1`, `a`, `b`), or `"p3"` (`0..1`).
- **`isInGamut(color: ParsedColor | string, gamut: ColorGamut): boolean`** — Checks whether a color fits inside `"srgb"` or `"p3"` within `1e-5`.
- **`clampToGamut(color: ParsedColor | string, gamut: ColorGamut): ParsedColor`** — Perceptually clamps an out-of-gamut color into `"srgb"` or `"p3"` via CSS Color 4 OKLCH chroma binary search.
- **`getRelativeLuminance(color: ParsedColor | string): number`** — WCAG 2.x relative luminance in `[0..1]`.
- **`getContrastRatio(fg: ParsedColor | string, bg: ParsedColor | string): number`** — WCAG 2.x contrast ratio in `[1..21]` (alpha-compositing translucent foregrounds over `bg`).
- **`isEyeDropperSupported(): boolean`** — SSR-safe capability check for `window.EyeDropper`.

#### `COLOR_CHANNELS` Ranges

| Channel | Range | Step / Large Step | Description |
| :--- | :--- | :--- | :--- |
| `hue` | `0..360` | `1` / `15` | HSV/HSL hue (`°`). |
| `saturation` | `0..100` | `1` / `10` | HSV saturation (`%`). |
| `value` | `0..100` | `1` / `10` | HSV value/brightness (`%`). |
| `hsl-saturation` | `0..100` | `1` / `10` | HSL saturation (`%`). |
| `lightness` | `0..100` | `1` / `10` | HSL lightness (`%`). |
| `red`, `green`, `blue` | `0..255` | `1` / `15` | sRGB 8-bit channels. |
| `oklch-lightness` | `0..1` | `0.01` / `0.1` | OKLCH perceptual lightness (`0..100%` display). |
| `chroma` | `0..0.4` | `0.005` / `0.02` | OKLCH chroma. |
| `oklch-hue` | `0..360` | `1` / `15` | OKLCH hue (`°`). |
| `alpha` | `0..1` | `0.01` / `0.1` | Opacity (`0..100%` display). |

---

### Context Helpers

- `getColorPickerContext()`, `setColorPickerContext(ctx)`, `hasColorPickerContext()`
- `getColorSwatchGroupContext()`, `setColorSwatchGroupContext(ctx)`, `hasColorSwatchGroupContext()`

## Examples

### Studio / Full Picker

Combines `Card`, `ColorPicker`, `ColorArea`, `ColorSlider` (`hue` + `alpha`), `ColorFormatSelect`, `ColorInput` with `TextInputAction` + `CopyIcon`, `ColorEyeDropper`, and a `ColorSwatchGroup` wrapped in `ContextMenu` to copy or remove saved colors:

```svelte
<script lang="ts">
    import { Copy, Trash2 } from "@lucide/svelte";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Card } from "cs/svelte/card";
    import { CopyIcon, copyOnClick, copyToClipboard } from "cs/svelte/clipboard";
    import {
        COLOR_SWATCH_PRESETS,
        ColorArea,
        ColorEyeDropper,
        ColorFormatSelect,
        ColorInput,
        ColorPicker,
        ColorSlider,
        ColorSwatch,
        ColorSwatchGroup,
    } from "cs/svelte/color";
    import {
        ContextMenu,
        ContextMenuContent,
        ContextMenuItem,
        ContextMenuItemIcon,
        ContextMenuItemText,
        contextMenuTrigger,
    } from "cs/svelte/context-menu";
    import { TextInputAction } from "cs/svelte/text-input";

    let studioColor = $state("#3B82F6");
    let savedColors = $state<string[]>(COLOR_SWATCH_PRESETS.slice(0, 7).map((p) => p.color));
    let contextSwatchColor = $state("");
</script>

<Card variant="elevated" size="md" class="w-[320px]">
    <ColorPicker bind:value={studioColor}>
        {#snippet children(ctx)}
            <ColorArea size="md" />

            <div class="flex flex-col gap-2">
                <ColorSlider size="md" channel="hue" />
                <ColorSlider size="md" channel="alpha" />
            </div>

            <div class="flex items-center gap-1.5">
                <ColorFormatSelect variant="soft" size="md" />
                <ColorInput variant="soft" size="md" showSwatch class="flex-1 min-w-0">
                    <TextInputAction
                        aria-label="Copy color"
                        {@attach copyOnClick({ text: () => ctx.value })}
                    >
                        <CopyIcon />
                    </TextInputAction>
                </ColorInput>
            </div>

            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-500 text-weak">Saved colors</span>
                    <div class="flex items-center gap-1">
                        <ColorEyeDropper variant="ghost" size="xs" unsupportedBehavior="disable" />
                        <Button
                            variant="ghost"
                            size="xs"
                            onclick={() => {
                                if (!savedColors.includes(ctx.value)) {
                                    savedColors = [...savedColors.slice(0, 13), ctx.value];
                                }
                            }}
                        >
                            <ButtonLabel>+ Add</ButtonLabel>
                        </Button>
                    </div>
                </div>

                <ContextMenu size="sm">
                    <ColorSwatchGroup
                        columns={7}
                        style="--cs-color-swatch-group-gap: 6px"
                        aria-label="Saved colors"
                    >
                        {#each savedColors as swatch (swatch)}
                            <ColorSwatch
                                size="lg"
                                color={swatch}
                                {@attach contextMenuTrigger({ onOpen: () => (contextSwatchColor = swatch) })}
                            />
                        {/each}
                    </ColorSwatchGroup>
                    <ContextMenuContent>
                        <ContextMenuItem onSelect={() => void copyToClipboard(contextSwatchColor)}>
                            <ContextMenuItemIcon icon={Copy} />
                            <ContextMenuItemText>Copy color</ContextMenuItemText>
                        </ContextMenuItem>
                        <ContextMenuItem
                            negative
                            disabled={savedColors.length <= 1}
                            onSelect={() => {
                                if (savedColors.length <= 1) return;
                                savedColors = savedColors.filter((c) => c !== contextSwatchColor);
                            }}
                        >
                            <ContextMenuItemIcon icon={Trash2} />
                            <ContextMenuItemText>Remove</ContextMenuItemText>
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
            </div>
        {/snippet}
    </ColorPicker>
</Card>
```

### Compact Popover Picker

Trigger `Button` with an inline `ColorSwatch` and monospace hex label opening a `Popover` containing a compact `sm` `ColorPicker`:

```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import {
        COLOR_SWATCH_PRESETS,
        ColorArea,
        ColorEyeDropper,
        ColorInput,
        ColorPicker,
        ColorSlider,
        ColorSwatch,
        ColorSwatchGroup,
    } from "cs/svelte/color";
    import { Popover, popoverTrigger } from "cs/svelte/popover";

    let popoverColor = $state("#6366F1");
</script>

<Button
    variant="elevated"
    size="sm"
    {@attach popoverTrigger({ target: "color-picker-popover", triggerOn: "click" })}
>
    <ColorSwatch size="xs" color={popoverColor} decorative />
    <ButtonLabel class="font-mono">{popoverColor}</ButtonLabel>
</Button>

<Popover
    id="color-picker-popover"
    placement="bottom-start"
    width="content"
    class="bg-elevated shadow-floating rounded-2xl squircle p-3"
>
    <ColorPicker
        bind:value={popoverColor}
        style="--cs-color-picker-width: 224px; --cs-color-picker-gap: 10px"
    >
        <ColorArea size="sm" />
        <div class="flex flex-col gap-1.5">
            <ColorSlider size="sm" channel="hue" />
            <ColorSlider size="sm" channel="alpha" />
        </div>
        <div class="flex items-center gap-1.5">
            <ColorInput variant="soft" size="sm" class="flex-1 min-w-0" />
            <ColorEyeDropper variant="secondary" size="sm" unsupportedBehavior="disable" />
        </div>
        <ColorSwatchGroup
            columns={7}
            style="--cs-color-swatch-group-gap: 6px"
            aria-label="Compact presets"
        >
            {#each COLOR_SWATCH_PRESETS.slice(0, 7) as preset (preset.color)}
                <ColorSwatch size="sm" color={preset.color} label={preset.label} />
            {/each}
        </ColorSwatchGroup>
    </ColorPicker>
</Popover>
```

### Standalone Primitives (without `ColorPicker`)

Every primitive (`ColorArea`, `ColorSlider`, `ColorInput`, `ColorSwatch`, `ColorSwatchGroup`, `ColorFormatSelect`, `ColorEyeDropper`) works outside `<ColorPicker>` by binding directly to `createColorState` or plain `$state` values:

```svelte
<script lang="ts">
    import { ColorSlider, ColorSwatch, createColorState } from "cs/svelte/color";

    const colorState = createColorState({ defaultValue: "#3b82f6", format: () => "rgb" });
</script>

<div class="flex items-center gap-4">
    <ColorSwatch size="xl" color={colorState.value} mode="preview" />
    <div class="flex flex-col gap-3 w-64">
        <ColorSlider
            size="md"
            channel="hue"
            color={colorState.value}
            bind:value={
                () => colorState.getChannel("hue"),
                (v) => colorState.setChannel("hue", v, { commit: false })
            }
            onCommit={(v) => colorState.setChannel("hue", v, { commit: true })}
        />
        <ColorSlider
            size="md"
            channel="alpha"
            color={colorState.value}
            bind:value={
                () => colorState.getChannel("alpha"),
                (v) => colorState.setChannel("alpha", v, { commit: false })
            }
            onCommit={(v) => colorState.setChannel("alpha", v, { commit: true })}
        />
    </div>
</div>
```

## Behavior & Quirks

- **CSS fast-path vs. `<canvas>` in `ColorArea`:** HSV (`saturation` × `value`), HSL (`hsl-saturation` × `lightness`), and sRGB channel pairs (`red`/`green`/`blue` via `mix-blend-mode: screen`) render using pure CSS gradients without canvas overhead. OKLCH (`chroma` × `oklch-lightness`, etc.) and arbitrary cross-space channel combinations automatically render via a 2D `<canvas>`.
- **Achromatic axis preservation in `ColorState`:** Dragging saturation, value, lightness, chroma, or alpha to `0` (or lightness to `100`) does not discard the stored hue or saturation in `hsv`, `hsl`, or `oklch`, preventing slider thumbs from snapping to `0°` when returning from black, white, or gray.
- **`ColorSwatch` contrast & anti-bleed guards:** Selected swatches render a luminance-adaptive checkmark (`data-check-contrast="dark" | "light" | "checker"`—falling back to a blurred pill on translucent/checkerboard fills), or an outer halo when `showCheck={false}`. Near-white, near-black, and transparent swatches automatically receive subtle rim borders (`--cs-color-swatch-edge`) so they stay distinct against matching light/dark surfaces.
- **`ColorFormatSelect` under `readonly`:** When `ColorPicker` has `readonly={true}`, color mutations are blocked, but `ColorFormatSelect` remains interactive so users can still switch display formats to inspect the color in Hex, RGB, HSL, or OKLCH (`disabled={true}` still disables it).
- **`ColorEyeDropper` SSR & lifecycle:** Browser capability (`isEyeDropperSupported()`) is evaluated inside `$effect` after mount so SSR and initial hydration stay deterministic. Active `EyeDropper.open()` sessions are automatically aborted via `AbortController` if the component unmounts or becomes disabled.
- **`ColorInput` draft & Escape handling:** Typing valid colors updates live state immediately (`commit: false`), while `Enter` and `blur` commit and normalize formatting. Pressing `Escape` while the draft is dirty reverts to the pre-focus color, blurs the `<input>`, and calls `stopPropagation()` so enclosing `Popover` or `Modal` containers stay open.
