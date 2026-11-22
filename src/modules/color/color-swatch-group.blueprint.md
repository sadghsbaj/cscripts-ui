# `ColorSwatchGroup` Blueprint

## 1. Overview & Scope

- **Kind:** `component` (with coordinated updates to sibling `ColorSwatch.svelte` and `color.context.ts`)
- **Purpose:** Single-select preset palette container implementing the WAI-ARIA `radiogroup` pattern for `<ColorSwatch />` items. Supports standalone controlled/uncontrolled usage, seamless integration with `ColorPickerContext`, flexible 1D (row/column) or 2D (grid/flex-wrap) layouts, and roving `tabindex` keyboard navigation.
- **Boundaries & Files:**
  - **New component:** `src/modules/color/ColorSwatchGroup.svelte`
  - **Public exports & types:** `src/modules/color/index.ts` (`ColorSwatchGroup`, `ColorSwatchGroupProps`, `ColorSwatchGroupOrientation`)
  - **Context updates:** `src/modules/color/color.context.ts` (`ColorSwatchGroupContext`)
  - **Item updates:** `src/modules/color/ColorSwatch.svelte` (roving `tabindex` participation and item registration)
  - **Internal helper (optional):** `src/modules/color/color-swatch-group-nav.internal.ts` (2D spatial arrow-key target resolution and perceptual color matching)
- **Explicit Non-Goals:**
  - Multi-select swatch groups (strictly single-select `role="radiogroup"`).
  - Form `<input>` / `name` propagation (visual color preset selector, not a native form control).
  - Data-driven `presets` array prop (composition via `<ColorSwatch />` children follows the library's compound pattern).

---

## 2. Public API

### Exports (`src/modules/color/index.ts`)

- `ColorSwatchGroup` (default export from `./ColorSwatchGroup.svelte`)
- `ColorSwatchGroupProps` (interface)
- `COLOR_SWATCH_GROUP_ORIENTATIONS`, `ColorSwatchGroupOrientation` (already exported from `color.context.ts`)

### `ColorSwatchGroupProps`

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` (`$bindable(null)`) | `null` | Bound to the root `<div role="radiogroup">`. |
| `value` | `string \| undefined` (`$bindable(undefined)`) | `undefined` | Selected color string. Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: string) => void` | `undefined` | Fires when a swatch is selected via pointer or keyboard. |
| `orientation` | `ColorSwatchGroupOrientation` (`"horizontal" \| "vertical" \| "both"`) | `"both"` | Controls arrow-key axes and default flex direction. `"both"` is default because swatch palettes commonly render as 2D grids or wrapping rows while still supporting 1D rows naturally. |
| `columns` | `number \| undefined` | `undefined` | Positive integer (`>= 1`). Switches layout from flex-wrap to a fixed-column CSS Grid (e.g. `columns={7}` for a 2×7 preset grid). |
| `disabled` | `boolean` | `false` | Disables all child swatches and keyboard navigation. Also inherits `pickerCtx.disabled` when nested in `ColorPicker`. |
| `children` | `Snippet` | `undefined` | Expects `<ColorSwatch />` children (which automatically resolve to `mode="radio"` inside the group). |

> **Why `variant` and `size` are omitted:** Like `CheckboxGroup` and `SwitchGroup`, `ColorSwatchGroup` is a headless layout and state coordinator. Visual sizing (`xs..xl`) is owned by each child `<ColorSwatch size="..." />`.

### Controlled / Uncontrolled / `ColorPickerContext` Priority

1. **Reading active color:**
   - `resolvedValue = value ?? pickerCtx?.value`
   - If `value` is explicitly provided (`value !== undefined`), it takes precedence over `ColorPickerContext`.
   - If `value === undefined` and `ColorSwatchGroup` is nested inside `ColorPicker`, it reads `pickerCtx.value` reactively so dragging `ColorArea` or editing `ColorInput` updates the active swatch highlight.
2. **Writing on `select(swatchColor)`:**
   - Guard: no-op if `resolvedDisabled` is `true`, if `pickerCtx?.readonly` is `true`, or if `isSelected(swatchColor)` is already `true`.
   - If `pickerCtx` is present: call `pickerCtx.setString(swatchColor, { commit: true })`.
   - If `value !== undefined` OR `!pickerCtx`: assign `value = swatchColor` (keeps standalone uncontrolled `bind:value` working without breaking `pickerCtx.value` tracking when `value` was intentionally omitted inside `ColorPicker`).
   - Always call `onValueChange?.(swatchColor)`.

### Color Matching (`isSelected(swatchColor)`)

`ColorSwatchGroup` must match semantically equivalent colors across formats (e.g. `#ef4444` vs `#EF4444`, `rgb(239, 68, 68)`, or `oklch(...)` from `ColorPicker`):

1. **Fast path:** If `resolvedValue` is `undefined`, return `false`. Compare `swatchColor.trim().toLowerCase() === resolvedValue.trim().toLowerCase()`.
2. **Perceptual parsed comparison:** Parse both strings via `parseColor()` from `color.utils.ts`:
   - If both parse:
     - Alpha must match within `0.002` (`Math.abs(a.alpha - b.alpha) <= 0.002`).
     - If both have `alpha === 0`, return `true` (all fully transparent colors are equivalent).
     - Otherwise, compare `oklab` channels `[l, a, b]` with a small epsilon (`<= 0.002` per channel) to tolerate rounding differences between hex, sRGB, and OKLCH roundtrips.
   - If either fails `parseColor()`, fall back to the normalized string comparison.

### Context Contract (`ColorSwatchGroupContext` in `color.context.ts`)

Extend `ColorSwatchGroupContext` with roving-tabindex coordination (keeping new members optional if needed for test-host compatibility, or updating `ColorSwatchTestHost.internal.svelte`):

- `readonly orientation: ColorSwatchGroupOrientation`
- `readonly disabled: boolean`
- `readonly tabStop: HTMLElement | null` (the single swatch element currently holding `tabindex="0"`)
- `isSelected: (swatchColor: string) => boolean`
- `select: (swatchColor: string) => void`
- `registerItem: (element: HTMLElement, getColor: () => string | undefined) => () => void`

### CSS Variables

- `--cs-color-swatch-group-gap`: Gap between swatches (default `8px`).
- `--cs-color-swatch-group-columns`: Set via inline style when `columns` is provided (`columns >= 1`).

---

## 3. DOM, Semantics & Accessibility

### Root Element & Attributes

- **Element:** `<div bind:this={ref} role="radiogroup" {...rest}>`
- **Accessible Name:** Consumers provide `aria-label` or `aria-labelledby` via `{...rest}`.
- **ARIA & Data Attributes on Root:**
  - `role="radiogroup"`
  - `aria-orientation={orientation === "vertical" ? "vertical" : orientation === "horizontal" ? "horizontal" : undefined}` (omit for `"both"`, as WAI-ARIA `aria-orientation` only accepts `"horizontal" | "vertical"`).
  - `aria-disabled={resolvedDisabled ? "true" : undefined}`
  - `class={["cs-color-swatch-group", className]}`
  - `data-orientation={orientation}`
  - `data-layout={resolvedColumns ? "grid" : "flex"}`
  - `data-disabled={resolvedDisabled ? "" : undefined}`

### Child `ColorSwatch` Semantics (`mode="radio"`)

- Renders `<button type="button" role="radio" aria-checked={isSelected ? "true" : "false"} ...>`.
- **Roving `tabindex`:**
  - Only **one** enabled swatch in the group has `tabindex="0"` at any time; all other swatches have `tabindex="-1"`.
  - Priority for `tabStop` resolution:
    1. Currently focused swatch inside the group (if enabled).
    2. Currently selected swatch (`isSelected === true` and enabled).
    3. First enabled swatch in DOM order.
  - Disabled swatches are skipped (`tabindex="-1"` / native `disabled`).
  - Standalone `ColorSwatch` (`mode="button"` outside `ColorSwatchGroup`) retains default button `tabindex` behavior.

### Keyboard Navigation (`onkeydown` on Root)

- **1D & 2D Axis Handling:**
  - `ArrowLeft` / `ArrowRight` (when `orientation` is `"horizontal"` or `"both"`): Step to previous / next enabled swatch in DOM order (respecting RTL via `getComputedStyle(root).direction === "rtl"`), wrapping around at boundaries.
  - `ArrowUp` / `ArrowDown` (when `orientation` is `"vertical"` or `"both"`):
    - When `orientation === "vertical"`: Step to previous / next enabled swatch in DOM order with wrap-around.
    - When `orientation === "both"`: Use **2D spatial navigation** via `getBoundingClientRect()` on enabled registered swatches:
      - Cluster enabled items into visual rows by `centerY` proximity (e.g. `<= 4px` or half item height).
      - Move to the row above (`ArrowUp`) or below (`ArrowDown`), wrapping between first and last row.
      - Within the target row, pick the enabled swatch whose `centerX` is closest to the current swatch's `centerX` (gracefully handles ragged last rows, e.g. 10 items in a 7-column grid).
      - If there is only 1 visual row, `ArrowUp`/`ArrowDown` is a no-op (does not unexpectedly jump horizontally).
  - `Home` / `End`: Jump to the first / last enabled swatch in DOM order.
- **Activation & Focus:**
  - Arrow / `Home` / `End` navigation prevents default scrolling, updates `tabStop`, calls `target.focus()`, and **immediately selects** the target swatch (`select(targetColor)`) per standard WAI-ARIA `radiogroup` behavior.
  - `Space` / `Enter` on a focused swatch activates the native `<button>` click handler and calls `select(color)`.

---

## 4. Visual & Motion Contract

- **Layer:** `@layer components.primitive`
- **Layout:**
  - **Flex mode (`columns` omitted):** `display: flex; flex-wrap: wrap; align-items: center; gap: var(--cs-color-swatch-group-gap);` (switches to `flex-direction: column; align-items: flex-start;` when `orientation === "vertical"` and `columns` is omitted).
  - **Grid mode (`columns` provided):** `display: grid; grid-template-columns: repeat(var(--cs-color-swatch-group-columns), max-content); justify-content: start; align-items: center; gap: var(--cs-color-swatch-group-gap);`
- **Gap & Halo Clearance (`8px` default):**
  - `ColorSwatch` with `showCheck={false}` renders an outer selection halo at `inset: -4px` (`4px` outside the swatch bounds).
  - A default `--cs-color-swatch-group-gap: 8px` guarantees `8px` between adjacent swatch edges so the `4px` halo has clean breathing room without overlapping neighboring fills, while `z-index: 1` (selected) and `z-index: 2` (`:focus-visible` with `outline-offset: 6px`) on `ColorSwatch` prevent clipping by siblings.
- **Container Surface & Motion:**
  - `ColorSwatchGroup` itself is a transparent, borderless layout container with no background, shadow, or container-level motion; all tactile hover/press/check/halo physics remain owned by `ColorSwatch`.

---

## 5. Edge Cases & Constraints

- **Empty or all-disabled group:** `tabStop` resolves to `null`; keyboard navigation safely no-ops without throwing.
- **Dynamic swatch children:** Adding, removing, or toggling `disabled` on a child `<ColorSwatch>` (including the currently active `tabStop`) automatically re-evaluates `tabStop` via `$effect` / `registerItem` cleanup so focusability is never lost.
- **Ragged grids & wrapped flex rows:** 2D spatial navigation using `getBoundingClientRect()` handles both explicit `columns` grids with incomplete last rows and responsive `flex-wrap` palettes without hardcoding column counts in JS.
- **RTL support:** `ArrowLeft` and `ArrowRight` invert step direction when `getComputedStyle(ref).direction === "rtl"`.
- **Non-swatch children / nested elements:** `registerItem` only registers `<ColorSwatch>` radio buttons, so decorative dividers or wrappers inside the group do not break keyboard indexing.
