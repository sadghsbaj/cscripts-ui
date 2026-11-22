# `ColorPicker` Blueprint

## 1. Overview & Scope

- **Kind:** `component` (root compound-pattern coordinator & layout-flexible `role="group"` container)
- **Purpose:** Root state and context provider for the `color` module. Owns a reactive `ColorState` instance via `createColorState(...)`, manages controlled/uncontrolled `value` and `format` bindings, and exposes `ColorPickerContext` via `setColorPickerContext(...)` so any nested `ColorArea`, `ColorSlider`, `ColorInput`, `ColorFormatSelect`, `ColorSwatch`, `ColorSwatchGroup`, `ColorEyeDropper`, or custom `children(ctx)` snippet shares a single synchronized color model.
- **Boundaries & Files:**
  - **Component:** `src/modules/color/ColorPicker.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorPicker`, `ColorPickerProps`, `COLOR_PICKER_SPACES`, `ColorPickerSpace`)
  - **State & context:** `src/modules/color/color-state.svelte.ts` (`createColorState`), `src/modules/color/color.context.ts` (`setColorPickerContext`, `ColorPickerContext`)
- **Explicit Non-Goals:**
  - Rendering opinionated built-in chrome (no default `Card` surface, shadow, padding, header, or hardcoded subcomponent tree—consumers compose subcomponents freely inside `children`).
  - Adding `variant` or `size` props to `ColorPicker` itself (individual child controls carry their own explicit `size` and `variant` so e.g. a `lg` `ColorArea` can pair with `md` sliders and `sm` inputs).
  - Managing popover open/close state or trigger anchoring (compose `ColorPicker` inside `Popover` or `Card` when floating behavior is desired).

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorPicker` (default export from `./ColorPicker.svelte`)
- `COLOR_PICKER_SPACES = ["hsv", "hsl", "oklch"] as const`
- `ColorPickerSpace = (typeof COLOR_PICKER_SPACES)[number]`
- `ColorPickerProps`

### `ColorPickerProps`

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">` (forwarded to the root `<div role="group">`):

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable(null)`) | `null` | Bound to the root `.cs-color-picker` `<div>` element. |
| `value` | `string \| undefined` (`$bindable(undefined)`) | `undefined` | Controlled CSS color string. Supports `bind:value` and `bind:value={get, set}`. When `undefined`, `ColorPicker` runs uncontrolled starting from `defaultValue`. |
| `defaultValue` | `string` | `"#3b82f6"` | Initial CSS color string for uncontrolled usage (also fallback if `value` is initially invalid). Chosen over `#000000` so default `ColorArea`/`ColorSlider` thumbs start at a visible chromatic position (`Hue 217°`, `Sat 76%`, `Val 96%`). |
| `onValueChange` | `(value: string) => void` | `undefined` | Fires on every color mutation (including live pointer drags and typing). |
| `onCommit` | `(value: string) => void` | `undefined` | Fires when an interaction commits (`pointerup`, `pointercancel`, `lostpointercapture`, keyboard step, swatch/eyedropper pick, or input blur/Enter). |
| `format` | `ColorFormat \| undefined` (`$bindable(undefined)`) | `undefined` | Controlled output/editing format (`"auto" \| "hex" \| "hex8" \| "rgb" \| "hsl" \| "oklch" \| "p3"`). Supports `bind:format`. |
| `defaultFormat` | `ColorFormat` | `"auto"` | Initial format when `format` is uncontrolled. `"auto"` preserves each parsed input's source format (e.g. `#3b82f6` → `"hex"`, `oklch(...)` → `"oklch"`) while still allowing `ColorFormatSelect` to switch formats dynamically. |
| `onFormatChange` | `(format: ColorFormat) => void` | `undefined` | Fires when `setFormat` is called (e.g. from `ColorFormatSelect`). |
| `space` | `ColorPickerSpace` (`"hsv" \| "hsl" \| "oklch"`) | `"hsv"` | Editing color space exposed via `ColorPickerContext.space` (drives `ColorArea` default `xChannel`/`yChannel`). |
| `alphaFormat` | `ColorAlphaFormat` (`"auto" \| "always" \| "never"`) | `"auto"` | Controls alpha channel emission in `ColorState` formatted output strings. |
| `gamut` | `ColorGamut \| undefined` (`"srgb" \| "p3"`) | `undefined` | Optional target gamut clamping applied by `ColorState`. |
| `disabled` | `boolean` | `false` | Disables all nested `color` subcomponents and blocks context mutators. |
| `readonly` | `boolean` | `false` | Prevents value mutations across all nested subcomponents while keeping controls focusable and `ColorFormatSelect` usable. |
| `invalid` | `boolean` | `false` | Propagates validation error state to nested `ColorArea`, `ColorSlider`, `ColorInput`, and `ColorFormatSelect`. |
| `label` | `string \| undefined` | `undefined` | Accessible group name (`aria-label`). Falls back to `rest["aria-label"]`, `rest["aria-labelledby"]`, or localized `"Color picker"` / `"Farbwähler"` via `t({ de, en })`. |
| `children` | `Snippet<[ColorPickerContext]>` | `undefined` | Optional render snippet receiving `pickerCtx` as its argument; works seamlessly both with plain nested subcomponents (`<ColorArea ... />`) and `{#snippet children(ctx)}`. |

### State & `ColorPickerContext` Wiring

1. **Controlled vs. Uncontrolled `value` (Svelte 5 `$bindable()` compliance):**
   - `ColorPicker` passes `value: () => value` and `defaultValue` into `createColorState(...)`.
   - `setValue` only writes `value = next` when `value !== undefined`. When `value === undefined` (uncontrolled), `ColorState` owns its internal `#parsed` / `#snapshot` state and never mutates the `value` prop, avoiding Svelte 5 `ownership_invalid_mutation` warnings when consumers pass one-way props or omit `value`.
   - Consumers wanting two-way synchronization use `bind:value={color}`; consumers wanting one-way controlled flow pass `value={color}` + `onValueChange={(v) => (color = v)}`.
   - Because `ColorState` resolves external `value()` updates reactively inside `#resolveEffective()` and `#syncExternal()`, no `$effect` is needed to keep `ColorState` in sync with external `value` changes.

2. **Controlled vs. Uncontrolled `format` & `setFormat`:**
   - `internalFormat = $state<ColorFormat | undefined>(undefined)` stores uncontrolled format changes triggered via `pickerCtx.setFormat(next)`.
   - `resolvedFormat = $derived(format ?? internalFormat ?? defaultFormat)`.
   - `setFormat(next: ColorFormat)`:
     - Guard: if `disabled`, return early. (Note: `readonly` intentionally does **not** block `setFormat` so users can inspect a readonly color in `Hex`, `RGB`, `HSL`, or `OKLCH` without mutating the color.)
     - If `format !== undefined`, assign `format = next`; else assign `internalFormat = next`.
     - Invoke `onFormatChange?.(next)`.
   - Switching `format` updates `colorState.value` (via `format: () => resolvedFormat`) and `pickerCtx.format` reactively without mutating the underlying color or firing `onValueChange` / `onCommit`.

3. **Reactive `ColorPickerContext` Object:**
   - `setColorPickerContext(pickerCtx)` is called once during component initialization.
   - All reactive properties (`value`, `format`, `space`, `disabled`, `readonly`, `invalid`) are exposed as JS `get` accessors so child components always read live `$props` and `ColorState` values without stale closures.
   - Mutator methods (`setChannel`, `setChannels`, `setString`, `commit`) enforce `if (disabled || readonly) return;` at the context boundary before delegating to `colorState`.

### CSS Variables

- `--cs-color-picker-gap`: Vertical flex gap between child rows/controls (default: `12px`).
- `--cs-color-picker-width`: Root container `inline-size` (default: `100%`).

---

## 3. DOM, Semantics & Accessibility

### Native HTML & `data-*` Selectors

- **Root Element:** `<div role="group">` with `bind:this={ref}` and `{...rest}` (`class={["cs-color-picker", className]}`).
- **Data Attributes:**
  - `data-space={space}` (`"hsv" | "hsl" | "oklch"`)
  - `data-format={resolvedFormat}`
  - `data-disabled={disabled ? "" : undefined}`
  - `data-readonly={readonly ? "" : undefined}`
  - `data-invalid={invalid ? "" : undefined}`

### ARIA Attributes

- `role="group"`
- `aria-label={resolvedAriaLabel}` — `label ?? ariaLabelProp ?? (ariaLabelledByProp !== undefined ? undefined : t({ de: "Farbwähler", en: "Color picker" }))`
- `aria-labelledby={ariaLabelledByProp}`
- `aria-disabled={disabled ? "true" : undefined}`

### Keyboard Navigation & Focus Behavior

- The `.cs-color-picker` root itself is **not** focusable (`tabindex` is omitted).
- Standard `Tab` / `Shift+Tab` moves focus cleanly across the interactive child controls inside the group (`ColorArea` thumb → `ColorSlider` thumbs → `ColorFormatSelect` trigger → `ColorInput` → `ColorEyeDropper` → `ColorSwatchGroup` roving tab stop).
- Each child control manages its own specialized keyboard contract (`Arrow` keys on sliders/area/swatches, `Enter`/`Escape` on `ColorInput`, Space/Enter on `ColorEyeDropper` and `ColorFormatSelect`).

---

## 4. Visual & Motion Contract

### Layout-Flexible Container Rationale (No Built-in Surface Props)

`ColorPicker` is intentionally a **lean, transparent layout container** (`display: flex; flex-direction: column; gap: var(--cs-color-picker-gap, 12px); inline-size: var(--cs-color-picker-width, 100%);`) without `variant`, `elevated`, or surface/padding props:

1. **Zero double-surfaces:** `Card` and `Popover` already own `--cs-bg-elevated`, `--cs-shadow-elevated` / `--cs-shadow-floating`, `--cs-squircle`, and outer padding. Baking a card surface into `ColorPicker` would create nested card-in-card chrome whenever placed inside a `Popover` or `Card`.
2. **Panel-native embedding:** When placed directly inside a settings panel or inspector sidebar, a surface-free flex column inherits the host's background and spacing without visual clutter.
3. **API consistency:** Matches `ColorSwatchGroup` (`role="radiogroup"`, no `variant` or `size`) and adheres to `architecture-and-apis.md` (no unnecessary `variant` matrices on structural group containers).
4. **Full layout control:** Consumers needing a fixed-width floating picker (e.g. `280px` inside a `Popover`) simply set `--cs-color-picker-width` or a utility class on `ColorPicker` / its parent `PopoverContent`.

### Styling & Motion

- **CSS Layer:** Styled in `@layer components.composite` with `.cs-color-picker`.
- **Proportional Child Sizing:** Children (`ColorArea`, `ColorSlider`, `ColorInput`, `ColorFormatSelect`, `ColorEyeDropper`, `ColorSwatch`) declare their own `size` prop so matching T-shirt scales align proportionally.
- **Motion:** `ColorPicker` introduces no container-level animations or transitions; all tactile micro-interactions live on the interactive child primitives.

---

## 5. Edge Cases & Constraints

- **One-way `value` prop vs. `bind:value`:** When a parent passes a one-way `value` prop without `bind:value`, `ColorPicker` must not throw or warn on mutation if `onValueChange` updates the parent state; however, `bind:value` is the recommended two-way pattern. If `value` is omitted (`undefined`), `ColorPicker` operates purely uncontrolled via `defaultValue`.
- **`format="auto"` with `ColorFormatSelect`:** By default, `ColorPicker` uses `defaultFormat = "auto"` so `#3b82f6` resolves to `"hex"` and `oklch(...)` resolves to `"oklch"`. `ColorFormatSelect` already maps `"auto"` to `"hex"` (or `formats[0]`) for display when `"auto"` is excluded from its `formats` list, and calling `pickerCtx.setFormat(next)` switches `ColorPicker` into an explicit format.
- **`disabled` vs. `readonly`:** `disabled` disables all child controls and blocks `setFormat`, `setChannel`, `setChannels`, `setString`, and `commit`. `readonly` blocks all color-mutating context methods (`setChannel`, `setChannels`, `setString`, `commit`) and propagates `readonly` to sliders/area/inputs/eyedropper/swatch-group, while still allowing `ColorFormatSelect` to switch display formats.
- **Snippet `children(ctx)` support:** Rendering `{@render children?.(pickerCtx)}` allows advanced consumers to read `ctx.value`, `ctx.format`, `ctx.state.inGamut`, or render custom contrast/gamut badges directly without calling `getColorPickerContext()` in a wrapper component.
- **SSR safety:** `createColorState(...)` and `setColorPickerContext(...)` use pure reactive state with zero `window`/`document` access during initialization, making `ColorPicker` fully SSR-safe.
