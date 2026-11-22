# `ColorFormatSelect` Blueprint

## 1. Overview & Scope

- **Kind:** `component` (composite built on `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, and `SelectItem` from `../select/index.ts`)
- **Purpose:** Compact color-format switcher dropdown (`Hex`, `RGB`, `HSL`, `OKLCH`, and optionally `Hex8`, `P3`, `Auto`) designed to sit beside `ColorInput` (full-color + alpha channel) in a `ColorPicker` toolbar or work standalone.
- **Boundaries & Files:**
  - **Component:** `src/modules/color/ColorFormatSelect.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorFormatSelect`, `ColorFormatSelectProps`, `COLOR_FORMAT_SELECT_VARIANTS`, `COLOR_FORMAT_SELECT_SIZES`, `COLOR_FORMAT_SELECT_DEFAULTS`, `ColorFormatSelectVariant`, `ColorFormatSelectSize`)
  - **Context extension:** `src/modules/color/color.context.ts` adds optional `setFormat?: (format: ColorFormat) => void` to `ColorPickerContext` so `ColorFormatSelect` can drive `pickerCtx.format` (syncing sibling `ColorInput` components automatically).
- **Explicit Non-Goals:**
  - Re-implementing listbox keyboard navigation, typeahead, focus restoration, or popover positioning (always delegate to `Select`).
  - Mutating the active color value when switching formats (format selection changes representation only).
  - Exposing raw `SelectContent` / `SelectItem` composition slots; `ColorFormatSelect` renders a self-contained format list from `formats`.

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorFormatSelect` (default export from `./ColorFormatSelect.svelte`)
- `COLOR_FORMAT_SELECT_VARIANTS` (`SELECT_VARIANTS`: `["soft", "elevated"] as const`) and `ColorFormatSelectVariant`
- `COLOR_FORMAT_SELECT_SIZES` (`SELECT_SIZES`: `["xs", "sm", "md", "lg", "xl"] as const`) and `ColorFormatSelectSize`
- `COLOR_FORMAT_SELECT_DEFAULTS = ["hex", "rgb", "hsl", "oklch"] as const`
- `ColorFormatSelectProps`

### `ColorFormatSelectProps`

Extends `Omit<HTMLButtonAttributes, "type" | "value" | "children">` (forwarded to `SelectTrigger`):

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` (`$bindable(null)`) | `null` | Bound to the `SelectTrigger` `<button>` element. |
| `variant` | `ColorFormatSelectVariant` (`"soft" \| "elevated"`) | **required** | Visual shell style forwarded to `Select` (`1:1` with `Select` & `ColorInput`). No default. |
| `size` | `ColorFormatSelectSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | **required** | T-shirt scale forwarded to `Select` (`28px`–`44px` height, `1:1` with `Select` & `ColorInput`). No default. |
| `value` | `ColorFormat \| undefined` (`$bindable(undefined)`) | `undefined` | Controlled/standalone selected format. Supports `bind:value`. |
| `onValueChange` | `(format: ColorFormat) => void` | `undefined` | Fires when the user selects a format. |
| `open` | `boolean` (`$bindable(false)`) | `false` | Controlled/uncontrolled popover open state forwarded to `Select`. |
| `onOpenChange` | `(open: boolean) => void` | `undefined` | Fires when the dropdown opens or closes. |
| `formats` | `readonly ColorFormat[]` | `COLOR_FORMAT_SELECT_DEFAULTS` | Ordered list of selectable formats. Excludes `"auto"`, `"hex8"`, and `"p3"` by default; deduplicated while preserving order. |
| `disabled` | `boolean` | `false` | Disables trigger and selection. Inherits `pickerCtx?.disabled`. |
| `invalid` | `boolean` | `false` | Applies validation error ring (`data-invalid`, `aria-invalid`). Inherits `pickerCtx?.invalid`. |
| `label` | `string \| undefined` | `undefined` | Accessible name (`aria-label`) for `SelectTrigger`. Falls back to `rest["aria-label"]`, `rest["aria-labelledby"]`, or localized `"Color format"` / `"Farbformat"`. |
| `name` | `string \| undefined` | `undefined` | Optional form field name forwarded to `Select`. |
| `required` | `boolean` | `false` | Optional required state forwarded to `Select`. |

### `ColorPickerContext` Extension (`src/modules/color/color.context.ts`)

```ts
export interface ColorPickerContext {
    // ...existing fields...
    readonly format: ColorFormat;
    setFormat?: (format: ColorFormat) => void;
}
```

- `setFormat` is optional on the interface so existing test hosts and partial contexts remain compatible, while `ColorPicker` provides it.

### State Resolution & Priority

1. **Read priority:**
   - If `value !== undefined`: `value` drives the selected format (explicit/standalone override).
   - Else if `pickerCtx` is present: reads `pickerCtx.format`.
   - Else: internal uncontrolled `$state<ColorFormat>` initialized to `formats[0] ?? "hex"`.
2. **`"auto"` fallback when excluded from `formats`:**
   - If the resolved format is `"auto"` (e.g., `pickerCtx.format === "auto"`) and `"auto"` is not in `formats`, display/select `formats.includes("hex") ? "hex" : formats[0]` so the trigger never renders an unmapped `"auto"` string.
3. **Write behavior (`onValueChange`):**
   - If `value !== undefined`: update `value = nextFormat`.
   - Else if `pickerCtx?.setFormat`: call `pickerCtx.setFormat(nextFormat)`.
   - Else: update internal uncontrolled state.
   - Always invoke `onValueChange?.(nextFormat)`.

### Format Labels

Canonical short UI labels (constant map inside `ColorFormatSelect.svelte` or `color-format-select.internal.ts`):

| `ColorFormat` | Label |
| :--- | :--- |
| `"hex"` | `"Hex"` |
| `"hex8"` | `"Hex8"` |
| `"rgb"` | `"RGB"` |
| `"hsl"` | `"HSL"` |
| `"oklch"` | `"OKLCH"` |
| `"p3"` | `"P3"` |
| `"auto"` | `t({ de: "Auto", en: "Auto" })` |

### CSS Variables

- `--cs-color-format-select-width`: Explicit trigger width override (default: `fit-content`).
- `--cs-color-format-select-min-width`: Minimum trigger width to prevent horizontal layout jitter when switching between `"Hex"` and `"OKLCH"` (defaults scale with `size`: `72px` at `xs`, `76px` at `sm`, `84px` at `md`, `92px` at `lg`, `100px` at `xl`).

---

## 3. DOM, Semantics & Accessibility

### Composition Structure

```svelte
<Select
    value={selectedFormat}
    onValueChange={handleValueChange}
    bind:open
    {onOpenChange}
    {variant}
    {size}
    disabled={resolvedDisabled}
    invalid={resolvedInvalid}
    {required}
    {name}
>
    <SelectTrigger
        bind:ref
        class={["cs-color-format-select-trigger", className]}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledByProp}
        {...rest}
    >
        <SelectValue />
    </SelectTrigger>
    <SelectContent width="min-anchor">
        {#each uniqueFormats as format (format)}
            <SelectItem value={format} label={FORMAT_LABELS[format]}>
                {FORMAT_LABELS[format]}
            </SelectItem>
        {/each}
    </SelectContent>
</Select>
```

### Semantics, ARIA & Keyboard

- Inherits full `Select` ARIA wiring (`role="combobox"` / `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`, `aria-invalid`, `aria-required`, and `role="listbox"` / `role="option"` in the popover).
- `aria-label` resolution on `SelectTrigger`: `label ?? rest["aria-label"]` (omitted when `rest["aria-labelledby"]` is provided unless `label` is explicit); falls back to `t({ de: "Farbformat", en: "Color format" })` when neither `label`, `aria-label`, nor `aria-labelledby` is set.
- Full keyboard support (`Enter`/`Space`/`ArrowDown`/`ArrowUp` to open, roving `ArrowUp`/`ArrowDown`/`Home`/`End`, typeahead `"h"`/`"r"`/`"o"`, `Escape` to close and restore trigger focus) is delegated to `Select`.

---

## 4. Visual & Motion Contract

- **Surface & Shape Parity:** Uses `Select`'s `variant` (`"soft" | "elevated"`) and `size` (`"xs".."xl"`) tokens unchanged (`28px`–`44px` height, `--cs-squircle-soft`, `--cs-shadow-elevated`, `--cs-color-negative-solid` invalid ring, `--cs-color-disabled-*` disabled tokens), ensuring pixel-exact baseline and height alignment next to `ColorInput` as shown in `color.png`.
- **Compact Trigger Geometry:** `.cs-color-format-select-trigger` sets `width: var(--cs-color-format-select-width, fit-content)` and `min-width: var(--cs-color-format-select-min-width, ...)` under `@layer components.composite` so `[Hex v]` sits compactly beside `[# 4F46E5]` and `[100%]` without shifting adjacent inputs when switching to `"OKLCH"`.
- **Popover Width:** `SelectContent` uses `width="min-anchor"` (at least as wide as the trigger, expanding automatically to fit the widest format label + checkmark).
- **Motion:** Uses `SelectTrigger` chevron rotation and `Popover` directional spring entrance/exit without additional custom motion.

---

## 5. Edge Cases & Constraints

- **Readonly `ColorPicker`:** `pickerCtx?.readonly` intentionally does **not** disable `ColorFormatSelect`—changing the display format (`Hex` ↔ `RGB` ↔ `OKLCH`) inspects the color without mutating it.
- **Empty or Duplicate `formats`:** Deduplicate `formats` while preserving order. If an empty array is passed, fall back to `COLOR_FORMAT_SELECT_DEFAULTS` so the select is never empty.
- **Out-of-list Controlled `value`:** If `value` is set to a `ColorFormat` not present in `formats` (other than the `"auto"` fallback noted above), `SelectValue` still displays the canonical label if mapped, or `Select` handles it gracefully without crashing.
- **Cross-Module Boundary:** Consumes `Select` exclusively through `../select/index.ts` (never `select.context.internal.ts`).
