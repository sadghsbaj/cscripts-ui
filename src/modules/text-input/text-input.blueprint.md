# TextInput Blueprint

## 1. Overview & Scope

- **Purpose:** Foundational single-line text entry primitive (`<input>`) providing the tactile shell surface, `xs`–`xl` sizing parity with `Button`, state hierarchy (`hover`, `focus-within`, `invalid`, `disabled`, `readonly`), and explicit compound slots (`TextInputField`, `TextInputIcon`, `TextInputAction`).
- **Kind:** `component` (compound module: `TextInput`, `TextInputField`, `TextInputIcon`, `TextInputAction`).
- **Boundaries & Non-Goals:**
  - **No outer form chrome:** No built-in `<label>`, helper/description text, or error message text. Consumers pair via `<label for={id}>`, wrap in `<label>`, or compose a higher-level field wrapper.
  - **No multi-line entry:** `<textarea>` sizing/resizing belongs in a separate `Textarea` module.
  - **No built-in number steppers:** Custom `+`/`-` stepper controls, `role="spinbutton"`, locale decimal parsing, and `min`/`max`/`step` clamping belong in a dedicated future `NumberInput` layer (see Section 5).
  - **No popup/listbox logic:** Combobox/autocomplete behavior belongs in a future `Combobox` module composing `TextInput` + `Popover`.

---

## 2. Public API

### Barrel Exports (`src/modules/text-input/index.ts`)

- **Components:** `TextInput`, `TextInputField`, `TextInputIcon`, `TextInputAction`
- **Constants & Types:**
  - `TEXT_INPUT_VARIANTS = ["soft", "elevated"] as const` -> `TextInputVariant`
  - `TEXT_INPUT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `TextInputSize`
  - `TextInputProps`, `TextInputFieldProps`, `TextInputIconProps`, `TextInputIconComponentProps`, `TextInputActionProps`
- **Context (`text-input.context.ts`):**
  - `getTextInputContext`, `setTextInputContext`, `hasTextInputContext`, `type TextInputContext`
  - Exposes reactive getters for `disabled`, `readonly`, and `invalid`, plus `registerField(el: HTMLInputElement | null)` so `TextInputField` and `TextInputAction` inherit shell state without prop drilling and `TextInput` can focus the registered `<input>` on shell click.

### Composition Decision: Pure Compound Pattern (`<TextInput>` + `<TextInput*>`)

`cscripts-ui` consistently uses explicit compound subcomponents in DOM order (`Button` + `ButtonIcon` + `ButtonLabel`, `SegmentedControl` + `SegmentedControlItem` + `SegmentedControlIcon` + `SegmentedControlLabel`, `Popover`) rather than `leading`/`trailing` snippet props:

- **Explicit DOM order:** Consumers compose `<TextInputIcon />`, `<TextInputField />`, and `<TextInputAction />` directly inside `<TextInput>` in any order, making layout immediately readable and keeping direct-child CSS selectors (`:has(> .cs-text-input-icon:first-child)`, `:has(> .cs-text-input-action:last-child)`) working naturally without wrapper `<div>`s.
- **Clean prop & ref separation:** `{...rest}` and `ref` on `TextInput` target the outer `<div class="cs-text-input">` shell (`HTMLDivElement | null`); `{...rest}` and `ref` on `TextInputField` target `<input class="cs-text-input-field">` (`HTMLInputElement | null`). There is no `shellRef` vs `ref` split or prop-routing ambiguity.
- **Why `TextInputField`:** Avoids `TextInputInput` stuttering and matches the `.cs-text-input-field` class name in `text-input.design.md`.
- **Higher-level composability:** `Combobox`, search, and password inputs compose `<TextInput>` + `<TextInputField>` directly, attaching `Popover` anchoring/triggers to `<TextInput>` (`ref`) and input/ARIA attributes (`role="combobox"`, `aria-expanded`, `onkeydown`) to `<TextInputField>`.

### `TextInputProps`

Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `variant` | `TextInputVariant` (`"soft" \| "elevated"`) | *Required* | Surface style; no default. |
| `size` | `TextInputSize` (`"xs" \| "sm" \| "md" \| "lg" \| "xl"`) | *Required* | Matches `Button` heights 1:1; no default. |
| `invalid` | `boolean` | `undefined` | Sets `data-invalid` on shell and propagates via context to `TextInputField`. |
| `disabled` | `boolean` | `undefined` | Sets `data-disabled` on shell and propagates via context to `TextInputField` and `TextInputAction`. |
| `readonly` | `boolean` | `undefined` | Sets `data-readonly` on shell and propagates via context to `TextInputField`. |
| `ref` | `HTMLDivElement \| null` (`$bindable(null)`) | `null` | Bound to outer `.cs-text-input` `<div>` (e.g. for `Popover`/`Combobox` anchoring). |
| `children` | `Snippet` | `undefined` | Compound children (`TextInputField`, `TextInputIcon`, `TextInputAction`). |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to `<div class="cs-text-input">` (`class`, `style`, `data-*`, etc.). |

### `TextInputFieldProps`

Extends `Omit<HTMLInputAttributes, "size" | "children" | "value">`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `value` | `string` (`$bindable("")`) | `""` | Supports `bind:value` and `bind:value={get, set}`. |
| `onValueChange` | `(value: string) => void` | `undefined` | Fires on user input when `value` changes. |
| `disabled` | `boolean` | `undefined` | Combined with `TextInput` context (`disabled \|\| ctx?.disabled`). |
| `readonly` | `boolean` | `undefined` | Combined with `TextInput` context (`readonly \|\| ctx?.readonly`). |
| `invalid` | `boolean` | `undefined` | Combined with `TextInput` context (`invalid ?? ctx?.invalid`); sets `aria-invalid="true"` when truthy. |
| `ref` | `HTMLInputElement \| null` (`$bindable(null)`) | `null` | Bound to `<input>` for `.focus()`, `.select()`, and form refs; registered with `TextInput` context. |
| `...rest` | `HTMLInputAttributes` | — | Forwarded to `<input class="cs-text-input-field">` (`id`, `name`, `type`, `placeholder`, `required`, `aria-*`, `oninput`, etc.). |

### `TextInputIconProps`

Matches `ButtonIcon` / `SegmentedControlIcon` 1:1:

- Extends `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">` with `icon: Component<TextInputIconComponentProps>` and `color?: string`.
- Renders `<Icon {...rest} aria-hidden="true" class={["cs-text-input-icon", className]} />`.

### `TextInputAction` (Dedicated Subcomponent vs `Button`)

A dedicated `TextInputAction` is used instead of `<Button>` because inline field actions require a circular pill geometry (`calc(var(--cs-text-input-action-size) / 2)` with `corner-shape: var(--cs-squircle-soft)`), smaller field-nested dimensions (`20px`–`32px` vs `Button`'s `28px`–`44px`), optical edge padding for visible actions, transparent-to-soft `::before` hover/press physics, and `TextInput` context integration.

`TextInputActionProps` extends `Omit<HTMLButtonAttributes, "type">`:

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLButtonElement \| null` (`$bindable(null)`) | `null` | Bound to `<button>`. |
| `icon` | `Component<TextInputIconComponentProps>` | `undefined` | Convenience prop for icon-only actions (renders with `aria-hidden="true"`). |
| `visible` | `boolean` | `true` | Controls animated conditional reveal (`opacity` + `scale`) without losing exit transitions; when `false`, sets `aria-hidden="true"` and `tabindex={-1}`. |
| `disabled` | `boolean` | `undefined` | Combined with `TextInput` context (`disabled \|\| ctx?.disabled`). |
| `children` | `Snippet` | `undefined` | Optional custom content when `icon` is not used. |
| `...rest` | `HTMLButtonAttributes` | — | Forwarded to `<button>`. `type="button"` is enforced *after* `{...rest}` to prevent accidental form submission. |

*Note on `readonly`:* `TextInput` does **not** auto-disable `TextInputAction` when `readonly` is true, because non-mutating actions (e.g. copy, reveal password) remain valid on read-only fields; mutating actions (e.g. clear) should bind `disabled={readonly}` explicitly.

### CSS Variables (`--cs-text-input-*`)

- **Geometry & Typography:** `--cs-text-input-height`, `--cs-text-input-font-size`, `--cs-text-input-radius`, `--cs-text-input-padding-inline`, `--cs-text-input-gap`, `--cs-text-input-icon-size`, `--cs-text-input-action-size`, `--cs-text-input-action-inset`
- **Colors & Surfaces:** `--cs-text-input-bg`, `--cs-text-input-bg-hover`, `--cs-text-input-fg`, `--cs-text-input-placeholder-fg`, `--cs-text-input-caret`, `--cs-text-input-icon-fg`
- **Elevation & Ring:** `--cs-text-input-shadow`, `--cs-text-input-shadow-hover`, `--cs-text-input-ring-shadow`, `--cs-text-input-ring-shadow-hover`

---

## 3. DOM, Semantics & Accessibility

- **DOM Structure:**
  ```html
  <div class="cs-text-input" data-variant="..." data-size="..." [data-invalid] [data-disabled] [data-readonly]>
      <!-- e.g. <TextInputIcon ... /> (.cs-text-input-icon) -->
      <input class="cs-text-input-field" ... />
      <!-- e.g. <TextInputAction ... /> (.cs-text-input-action) -->
  </div>
  ```
- **Labeling & Semantics:**
  - `<TextInputField>` renders the native `<input>`; `id` and `aria-*` (`aria-label`, `aria-labelledby`, `aria-describedby`) forward directly to `<input>` so `<label for={id}>` and screen readers associate natively.
  - `invalid` (from `TextInput` context or local prop) sets `aria-invalid="true"` on `<input>`.
  - `TextInputIcon` always sets `aria-hidden="true"`.
  - `TextInputAction` renders `<button type="button">` and should receive an accessible `aria-label` when icon-only.
- **Shell Click-to-Focus:**
  - `.cs-text-input-icon` uses `pointer-events: none` so clicks fall through to `.cs-text-input`.
  - A `mousedown` handler on `.cs-text-input` focuses the registered `<input>` (`fieldEl`) **only** when `e.target === ref` and `!disabled`, calling `e.preventDefault()` so clicking shell padding or icons does not blur an already-focused `<input>` or flicker the focus ring, while leaving `<input>` text selection/drag and `TextInputAction` button clicks completely untouched.
- **Focus & Keyboard:**
  - Standard `<input>` keyboard navigation and `Tab` order; visible `TextInputAction` buttons sit in natural DOM tab order before/after `<TextInputField>`.
  - Suppresses global `:focus-visible` outline on `.cs-text-input-field` (`outline: none`) and renders the `::after` inset focus ring on `.cs-text-input:focus-within` for both pointer and keyboard focus.
- **ESLint / Tooling Notes:**
  - `onmousedown` on the `<div>` shell may trigger `svelte/a11y-no-static-element-interactions`; annotate with a concise why-comment + targeted eslint disable since the `<div>` only delegates focus to its registered `<input>`.
  - Compound structure fits a future `text-input/require-structure` ESLint rule (parallel to `button/require-structure` and `segmented-control/require-structure`): requiring `<TextInputField />` inside `<TextInput>`, `<TextInputIcon />` instead of raw icons, and `aria-label` on icon-only `<TextInputAction />`; `type="button"` is enforced in `TextInputAction.svelte` to satisfy button-type rules.

---

## 4. Visual & Motion Contract

- **Sizes (`xs`–`xl`):** Heights (`28px`, `32px`, `36px`, `40px`, `44px`) and font sizes (`12px`–`16px`) match `Button` 1:1 so `TextInput` and `Button` align to the pixel in form rows and toolbars.
- **Shape:**
  - Shell (`.cs-text-input`): `corner-shape: var(--cs-squircle-soft)` with `9px` / `10px` / `12px` / `13px` / `14px` radii for `xs`–`xl`.
  - Inline action (`.cs-text-input-action`): circular pill radius (`border-radius: calc(var(--cs-text-input-action-size) / 2)`) with `corner-shape: var(--cs-squircle-soft)`, `isolation: isolate`, and `overflow: visible` (so stateful icon components like `CopyIcon`'s `Sparkle` burst are not clipped, and child icon components size naturally via `calc(1em + 2px)` from inherited `font-size` to match `--cs-text-input-icon-size`).
- **Optical Edge Compensation:** `:has(> .cs-text-input-icon:first-child)` / `:last-child` reduces that side's `padding-inline` by `2px` to compensate for SVG viewBox padding; leading/trailing visible `.cs-text-input-action` (`:nth-child(1 of :not([data-visible="false"]))` / `:nth-last-child(1 of :not([data-visible="false"]))`) sets that side's `padding-inline` to `--cs-text-input-action-inset`.
- **Variants & States:**
  - `soft`: `--cs-color-base-soft` -> `--cs-color-base-soft-hover`, `shadow: none`.
  - `elevated`: `--cs-color-elevated` -> `--cs-color-elevated-hover`, `--cs-shadow-elevated` -> `--cs-shadow-elevated-hover`.
  - `::after` Ring Layer (`position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none; z-index: 1`):
    - Resting: `inset 0 0 0 0px transparent`
    - `:focus-within`: `inset 0 0 0 2px var(--cs-color-accent-solid)`
    - `[data-invalid]`: `1px` negative ring (`light-dark(color-mix(in oklab, var(--cs-color-negative-solid) 45%, transparent), color-mix(in oklab, var(--cs-color-negative-400) 55%, transparent))`, `60%` / `70%` on hover); both `soft` and `elevated` preserve their neutral backgrounds and hover states; icon shifts to `--cs-color-negative-soft-fg`, caret to `--cs-color-negative-solid`, and input text stays `--cs-color-text-strong`.
    - `[data-invalid]:focus-within`: `inset 0 0 0 2px var(--cs-color-negative-solid)`.
  - `[data-disabled]`: Uses `--cs-color-disabled-*` tokens (`--cs-disabled-opacity: 1`).
- **Active / Press:** No scale transform on `.cs-text-input` (prevents caret shift during click/drag selection). `TextInputAction` uses a decoupled `::before` hover/press surface (`position: absolute; inset: 0; z-index: -1; border-radius: inherit; corner-shape: inherit;`): resting `background-color: transparent; scale: 1`, hover `background-color: var(--cs-color-base-soft)` (`@media (hover: hover)`), and `:active:not(:disabled)::before` `background-color: var(--cs-color-base-soft-hover); scale: 0.92` so the icon and `<HitArea size="sm" />` never scale.
- **Motion Tokens (crisp, non-bouncy):**
  - Surface hover (`background-color`, `box-shadow`): `var(--cs-dur-effect) var(--cs-ease-effect)`
  - `::after` focus/invalid ring: `var(--cs-dur-120) var(--cs-ease-quart-out)`
  - `TextInputAction::before` resting/hover/release: `background-color var(--cs-dur-effect) var(--cs-ease-effect), scale var(--cs-dur-120) var(--cs-ease-quart-out)`
  - `TextInputAction::before` press (`:active:not(:disabled)::before`): `background-color var(--cs-dur-press) var(--cs-ease-press), scale var(--cs-dur-press) var(--cs-ease-press)`
  - `TextInputAction` conditional reveal (`opacity` + `scale` from `0`/`0.85` to `1`/`1`): `var(--cs-dur-120) var(--cs-ease-quart-out)` and `display var(--cs-dur-120) allow-discrete` (`@starting-style`) when `data-visible` toggles.

---

## 5. Edge Cases & Constraints

- **Native Widget Chrome Reset:** Explicitly suppress browser-injected UI on `.cs-text-input-field` (`appearance: none`, `::-webkit-search-cancel-button`, `::-webkit-inner-spin-button`, `::-webkit-outer-spin-button`, `-moz-appearance: textfield` for `type="number"`) so custom `TextInputAction` controls never collide with OS widgets.
- **`type="number"` & `NumberInput` Boundary:** `TextInput` accepts `type="number"` as a pass-through HTML attribute (with native spinners hidden), but does **not** implement custom stepper buttons, `role="spinbutton"`, or numeric parsing. Native `<input type="number">` has inconsistent cross-browser character filtering (`e`, `+`, `-`), wheel-scroll mutation, and no locale decimal formatting; a future `NumberInput` module will wrap `TextInput` with `type="text"`, `inputmode="decimal"`, `role="spinbutton"`, and dedicated stepper `TextInputAction`s.
- **Hit Area on `TextInputAction`:** All `TextInputAction` sizes (`20px`–`32px`, `400px²`–`1024px²`) are below `1936px²`; include `<HitArea size="sm" />` inside `TextInputAction` to expand the touch target without altering visual geometry.
- **Progressive Enhancement:** `corner-shape: var(--cs-squircle-soft)` and `@starting-style` / `transition-behavior: allow-discrete` degrade cleanly to standard `border-radius` and instant show/hide in non-supporting browsers.
- **CSS Layering:** All component styles live in plain CSS under `@layer components.primitive`.
