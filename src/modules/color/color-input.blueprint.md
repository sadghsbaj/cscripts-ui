# `ColorInput` Blueprint

## 1. Overview & Scope

- **Kind:** `component` (composite built on `TextInput` + `TextInputField`, with optional `ColorSwatch` prefix)
- **Purpose:** Text and numeric color input supporting two modes from a single component:
  1. **Full-Color Mode** (`channel` omitted): parses and formats full CSS colors (`hex`, `hex8`, `rgb`, `hsl`, `oklch`, `p3`, named colors) with an optional muted `#` prefix in hex modes and an optional decorative `ColorSwatch` preview.
  2. **Single-Channel Numeric Mode** (`channel` provided): edits a single `ColorChannel` (`hue`, `alpha`, `red`, `chroma`, etc.) with unit formatting (`%`, `°`), clamping, and `ArrowUp` / `ArrowDown` keyboard stepping.
  Works seamlessly inside `ColorPicker` via `ColorPickerContext` or standalone via `bind:value`, `onValueChange`, and `onCommit`.
- **Boundaries & Files:**
  - **Component:** `src/modules/color/ColorInput.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorInput`, `ColorInputProps`, `ColorInputFullProps`, `ColorInputChannelProps`, `COLOR_INPUT_VARIANTS`, `COLOR_INPUT_SIZES`, `ColorInputVariant`, `ColorInputSize`)
  - **Internal helpers:** Reuses `color.utils.ts` (`parseColor`, `formatColor`) and `color-channel.internal.ts` (`COLOR_CHANNEL_META`, `clampChannel`, `roundToPrecision`).
- **Explicit Non-Goals:**
  - Multi-field segmented RGB/HSL/OKLCH inputs inside one shell (compose multiple `ColorInput channel={...}` instances instead).
  - Format-switcher dropdown inside `ColorInput` (compose with `Select` + `ColorPickerContext` as shown in the reference layout).
  - Re-implementing `TextInput` shell styling, focus rings, or disabled tokens (always delegate to `TextInput` + `TextInputField` from `../text-input/index.ts`).

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorInput` (default export from `./ColorInput.svelte`)
- `ColorInputProps` (`ColorInputFullProps | ColorInputChannelProps`)
- `ColorInputFullProps`, `ColorInputChannelProps` (interfaces)
- `COLOR_INPUT_VARIANTS`, `ColorInputVariant` (already defined in `index.ts`: `"soft" | "elevated"`)
- `COLOR_INPUT_SIZES`, `ColorInputSize` (already defined in `index.ts`: `"xs" | "sm" | "md" | "lg" | "xl"`)

### `ColorInputProps` (Discriminated Union)

Shared base (`ColorInputBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children">`):

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable(null)`) | `null` | Bound to the root `TextInput` shell `<div>`. |
| `inputRef` | `HTMLInputElement \| null` (`$bindable(null)`) | `null` | Bound to the inner `TextInputField` `<input>` for programmatic focus/selection. |
| `variant` | `ColorInputVariant` (`"soft" \| "elevated"`) | **required** | Visual shell style forwarded to `TextInput`. No default value. |
| `size` | `ColorInputSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | **required** | T-shirt scale forwarded to `TextInput` (28–44px height). No default value. |
| `placeholder` | `string \| undefined` | `undefined` | Short 1–3 word placeholder forwarded to `<input>`. |
| `label` | `string \| undefined` | `undefined` | Accessible name (`aria-label`) for the inner `<input>`. Falls back to `rest["aria-label"]`, `rest["aria-labelledby"]`, or a localized default. |
| `disabled` | `boolean` | `false` | Disables interaction. Inherits `pickerCtx?.disabled`. |
| `readonly` | `boolean` | `false` | Prevents edits while keeping `<input>` focusable. Inherits `pickerCtx?.readonly`. |
| `invalid` | `boolean` | `false` | Marks invalid state on `TextInput` (`data-invalid`) and `<input>` (`aria-invalid`). Inherits `pickerCtx?.invalid`. |

#### Full-Color Mode (`ColorInputFullProps`, when `channel?: undefined`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `channel` | `undefined` | `undefined` | Selects Full-Color Mode. |
| `value` | `string \| undefined` (`$bindable(undefined)`) | `undefined` | CSS color string for standalone controlled/uncontrolled usage. |
| `onValueChange` | `(value: string) => void` | `undefined` | Fires on valid live input or commit. |
| `onCommit` | `(value: string) => void` | `undefined` | Fires on `Enter` or `blur` when a valid color is committed. |
| `format` | `ColorFormat \| undefined` | `"auto"` | Output format (`"auto"` resolves to `pickerCtx?.format`, then `parsed.sourceFormat`, then `"hex"`). |
| `alpha` | `ColorAlphaFormat \| undefined` | `"auto"` | Controls alpha emission in `formatColor`. Set `"never"` when pairing with a separate `channel="alpha"` input. |
| `showSwatch` | `boolean` | `false` | Renders a compact decorative `ColorSwatch` preview as a leading prefix. |
| `showPrefix` | `boolean` | `true` | When the resolved format is `"hex"` or `"hex8"`, renders `#` as a muted leading prefix span and strips `#` from the `<input>` text. |

#### Single-Channel Mode (`ColorInputChannelProps`, when `channel: ColorChannel`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `channel` | `ColorChannel` | **required** | One of the 12 `COLOR_CHANNELS`. Selects Single-Channel Numeric Mode. |
| `value` | `number \| undefined` (`$bindable(undefined)`) | `undefined` | Underlying numeric channel value (e.g. `0..1` for `alpha`, `0..360` for `hue`). |
| `onValueChange` | `(value: number) => void` | `undefined` | Fires on valid live input, arrow stepping, or commit. |
| `onCommit` | `(value: number) => void` | `undefined` | Fires on `Enter`, `blur`, or arrow stepping. |
| `color` | `string \| undefined` | `undefined` | Optional base CSS color string for standalone usage when `value` and `pickerCtx` are absent. |
| `showUnit` | `boolean` | `true` | Appends channel unit (`%` or `°`) to the formatted display string. |

### State Resolution & Editing Lifecycle

1. **Source Priority:**
   - If `value !== undefined`: controlled/standalone value drives the display.
   - Else if `pickerCtx` is present: reads `pickerCtx.value` (full-color) or `pickerCtx.getChannel(channel)` (channel mode).
   - Else: internal uncontrolled fallback (`"#000000"` or parsed `color` prop / channel `defaultValue`).
2. **Focus & Draft Isolation (`isFocused` + `draftValue`):**
   - While `!isFocused`, `<input>` always reflects the formatted resolved value so external `ColorArea` / `ColorSlider` updates sync immediately.
   - On `focus`, `isFocused = true`, `preFocusValue` is snapshotted, and `draftValue` is initialized to the current formatted string.
   - While `isFocused`, user typing updates `draftValue` freely without re-formatting `<input>` mid-keystroke (prevents cursor jumping).
3. **Full-Color Mode Parsing & Commit:**
   - **Tolerant parsing:** If `showPrefix` is `true` in hex mode and the trimmed draft matches 3, 4, 6, or 8 hex digits without a leading `#`, prepend `#` before calling `parseColor()`. Full CSS strings (`#4F46E5`, `rgb(...)`, `oklch(...)`, named colors) always parse via `parseColor()`.
   - **Live input (`oninput`):** If `parseColor()` succeeds, format to `targetFormat` and apply live (`commit: false`) via `pickerCtx.setString(formatted, { commit: false })` or `value` / `onValueChange`. Incomplete/invalid intermediate drafts do not mutate state and do not trigger `data-invalid` while typing.
   - **Commit (`Enter` / `blur`):** If `parseColor()` succeeds, apply with `commit: true` and normalize `draftValue` to the formatted display string (e.g. uppercase `4F46E5`). If invalid or empty, revert `draftValue` cleanly to `preFocusValue` (last valid value).
   - **Cancel (`Escape`):** If the draft is dirty, `preventDefault()` + `stopPropagation()` (preventing ancestor `Popover`/`Dialog` dismissal), restore `preFocusValue` (undoing any live `commit: false` preview), and blur `inputRef`.
4. **Single-Channel Mode Parsing, Scale & Stepping:**
   - **Display scale:** `alpha` and `oklch-lightness` are stored in `[0..1]` in `ColorState` / `value` and displayed/parsed in `[0..100]` (`%`) for human-friendly editing (e.g. `1` displays as `100%`; typing `50` or `50%` parses to `0.5`). All other channels display in their native `COLOR_CHANNEL_META` range (`0..360°`, `0..100%`, `0..255`, `0..0.4`).
   - **Commit (`Enter` / `blur`):** Strip trailing `%` / `°` and whitespace, parse finite float, convert display scale to channel scale, clamp via `clampChannel()`, and commit (`commit: true`). Invalid/NaN input reverts to `preFocusValue`.
   - **Keyboard stepping (`ArrowUp` / `ArrowDown`):** Increment/decrement by `meta.step` (or `meta.largeStep` with `Shift`), clamp to `[min, max]`, update `draftValue` immediately, and commit (`commit: true`). Calls `event.preventDefault()`.

### CSS Variables

- `--cs-color-input-width`: Overrides default inline width (`128px` in full-color mode, `72px` in channel mode; scalable per `size`).
- `--cs-color-input-prefix-fg`: Color of the muted `#` prefix (defaults to `var(--cs-color-text-weak)`).
- `--cs-color-input-swatch-size`: Diameter of the optional `ColorSwatch` prefix (`14px`–`22px` across `xs`–`xl`).

---

## 3. DOM, Semantics & Accessibility

### DOM Structure

```html
<TextInput
    bind:ref
    {variant}
    {size}
    disabled={resolvedDisabled}
    readonly={resolvedReadonly}
    invalid={resolvedInvalid}
    class={["cs-color-input", className]}
    data-mode={channel ? "channel" : "full"}
    data-channel={channel}
    {...rest}
>
    {#if !channel && showSwatch}
        <ColorSwatch
            class="cs-color-input-swatch"
            {size}
            mode="preview"
            decorative
            color={resolvedSwatchColor}
        />
    {/if}
    {#if showHexPrefix}
        <span class="cs-color-input-prefix" aria-hidden="true">#</span>
    {/if}
    <TextInputField
        bind:ref={inputRef}
        class="cs-color-input-field"
        value={displayedValue}
        inputmode={channel ? "decimal" : "text"}
        spellcheck={false}
        autocomplete="off"
        autocapitalize="off"
        aria-label={resolvedAriaLabel}
        {placeholder}
        onfocus={...}
        oninput={...}
        onkeydown={...}
        onblur={...}
    />
</TextInput>
```

### Attributes & Accessibility

- **Native `<input>` semantics:** Delegates directly to `TextInputField`, preserving native selection, clipboard paste, `aria-invalid`, `disabled`, and `readonly`.
- **Accessible naming:** `aria-label` is set from `label` -> `rest["aria-label"]` -> localized fallback (`t({ de: "Farbwert", en: "Color value" })` in full-color mode, `COLOR_CHANNEL_META[channel].label` in channel mode) unless `rest["aria-labelledby"]` is provided. Note: `aria-label` / `aria-labelledby` should be forwarded to `<TextInputField>` rather than duplicated on the root `<div>`.
- **Decorative prefix:** Both `ColorSwatch` (`decorative`) and `.cs-color-input-prefix` (`aria-hidden="true"`) are hidden from the accessibility tree so screen readers announce only the input label and value.
- **Keyboard:** `Enter` commits; `Escape` reverts dirty edits; `ArrowUp` / `ArrowDown` (+ `Shift`) steps numeric channels.

---

## 4. Visual & Motion Contract

- **Surface & Elevation:** Inherited 1:1 from `TextInput` (`soft` -> `--cs-color-base-soft`, `elevated` -> `--cs-color-elevated` + `--cs-shadow-elevated`, `--cs-squircle-soft` corner shaping, 2px `--cs-color-accent-solid` focus ring via `.cs-text-input::after`).
- **Typography:** Uses the library's default sans-serif (`Inter`) with `font-variant-numeric: tabular-nums` so numeric channels (`100%`) and hex digits (`4F46E5`) align cleanly without layout jitter during live slider/area drags.
- **Prefix & Swatch Calibration:**
  - `.cs-color-input-prefix` (`#`) uses `--cs-color-text-weak`, `user-select: none`, and tight negative/reduced gap (`2px`–`4px`) to sit close to the hex digits (`# 4F46E5`).
  - `.cs-color-input-swatch` overrides `--cs-color-swatch-size` to fit concentrically inside `TextInput` heights (`xs: 14px`, `sm: 16px`, `md: 18px`, `lg: 20px`, `xl: 22px`).
- **Proportional `size` & Widths:** Height (`28px`–`44px`), font-size, radius, and padding match `TextInput` (`xs..xl`) 1:1 so `ColorInput` aligns with adjacent `Select` / `Button` controls in a picker toolbar. Default `--cs-color-input-width` scales compactly (`~112px`–`140px` full-color, `~64px`–`80px` channel) and can be overridden via CSS variable or utility classes.
- **Motion:** Relies on `TextInput` transitions (`--cs-dur-effect`, `--cs-ease-effect`, `--cs-dur-120`, `--cs-ease-quart-out`). No extra wrapper animations.

---

## 5. Edge Cases & Constraints

- **Wide-Gamut / Format Mismatch:** When `format="hex"` is active on an out-of-sRGB `oklch`/`p3` color, `formatColor` clamps/maps to sRGB hex; live typing in another syntax (e.g. pasting `oklch(...)` into a `format="auto"` input) updates `targetFormat` naturally, while explicit `format="hex"` normalizes back to hex on commit.
- **`Escape` Inside `Popover` / `Dialog`:** When the input has un-committed dirty edits, `Escape` MUST call `event.stopPropagation()` after reverting so it does not accidentally dismiss a hosting `Popover`; a second `Escape` when clean bubbles normally.
- **Rest Props Forwarding:** `aria-label` / `aria-labelledby` must be extracted from `...rest` so they land on the `<input>` (`TextInputField`) rather than the non-interactive `TextInput` shell `<div>`.
- **Disabled / Readonly:** Channel arrow stepping and input parsing are no-ops when `resolvedDisabled` or `resolvedReadonly` is `true`.
