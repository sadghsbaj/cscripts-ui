# Combobox Design Spec (`src/modules/combobox/`)

## 1. Visual Direction & Parity with `select`

`Combobox` shares ~90% of its visual language with [`Select`](../select/select.docs.md) and [`TextInput`](../text-input/text-input.docs.md):

- **Calm monochrome surfaces + single accent:** Grounded `soft` / `elevated` control shell paired with a `floating` popover panel (`--cs-color-elevated`, `--cs-shadow-floating`), borderless depth, and `--cs-squircle-soft` (`corner-shape`) geometry.
- **1:1 T-shirt scale (`xs` – `xl`):** Control heights (`28px` – `44px`), radii, gaps, icon sizes, and popover/item proportions match `Select` and `TextInput` identically so mixed forms align on the same baseline.
- **Identical option anatomy:** Single-line labels, leading icons, descriptions, group labels, separators, and animated trailing checkmarks match `SelectItem` pixel-for-pixel.

---

## 2. Control / Input Anatomy (`ComboboxControl` & `ComboboxInput`)

Unlike `SelectTrigger` (a single `<button>`), `ComboboxControl` is a composite `<div>` shell (following `TextInput`) that houses an editable `<input>` alongside optional leading/trailing affordances.

### DOM & Slot Structure

```text
.cs-combobox-control (div, data-variant, data-size, data-state="open"|"closed", data-invalid, data-disabled, data-readonly)
├── [optional] .cs-combobox-icon (leading icon or selected-item icon)
├── .cs-combobox-input (input[role="combobox"])
├── [optional] .cs-combobox-clear (button[type="button"], data-visible="true"|"false")
└── [optional] .cs-combobox-trigger (button[type="button"], tabindex="-1", ChevronDown)
```

### Shell Tokens & Geometry (`xs` – `xl`)

| Size | Height | Font Size | Radius | Inline Padding (`px`) | Gap | Icon Size | Action Size | Action Inset |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `28px` | `--cs-text-xs` | `9px` | `8px` | `6px` | `14px` | `20px` | `4px` |
| `sm` | `32px` | `--cs-text-xs` | `10px` | `10px` | `6px` | `14px` | `24px` | `4px` |
| `md` | `36px` | `--cs-text-sm` | `12px` | `12px` | `8px` | `16px` | `28px` | `4px` |
| `lg` | `40px` | `--cs-text-sm` | `13px` | `14px` | `8px` | `16px` | `30px` | `5px` |
| `xl` | `44px` | `--cs-text-base` | `14px` | `16px` | `10px` | `18px` | `32px` | `6px` |

### Optical Edge Compensation & Concentric Actions

- **Leading icon:** When `.cs-combobox-icon` is `:first-child`, `padding-inline-start` is `calc(var(--cs-combobox-px) - 2px)` to compensate for Lucide's `2px` internal SVG viewBox padding.
- **Trailing actions (`ComboboxClear` / `ComboboxTrigger`):** Both buttons use the `TextInputAction` concentric footprint (`--cs-combobox-action-size` × `--cs-combobox-action-size`, `border-radius: calc(var(--cs-combobox-action-size) / 2)`, `corner-shape: var(--cs-squircle-soft)`), each wrapping `<HitArea size="sm" />` (since `20px–32px` is below `1936px²`).
- **Concentric right inset:** When a visible trailing action follows `.cs-combobox-input` (`&:has(> .cs-combobox-input ~ .cs-combobox-action:not([data-visible="false"]))`), `padding-inline-end` switches from `--cs-combobox-px` to `--cs-combobox-action-inset` (`4px–6px`). Adjacent visible actions tighten their gap via `margin-inline-start: calc(var(--cs-combobox-gap) * -0.5)` so `Clear` + `Chevron` feel grouped rather than floating apart.

### Variants, States & Focus Ring

- **`variant="soft"`:** `--cs-color-base-soft` → hover/open `--cs-color-base-soft-hover`, `--cs-shadow: none`.
- **`variant="elevated"`:** `--cs-color-elevated` → hover/open `--cs-color-elevated-hover`, `--cs-shadow-elevated` → hover/open `--cs-shadow-elevated-hover`.
- **Focus Ring (`::after` overlay):** Rendered on `.cs-combobox-control::after` (`inset: 0`, `border-radius: inherit`, `corner-shape: inherit`, `pointer-events: none`).
  - `:focus-within:not([data-disabled])`: `inset 0 0 0 2px var(--cs-color-accent-solid)`.
  - `[data-invalid]:not([data-disabled])`: overrides ring to `inset 0 0 0 2px var(--cs-color-negative-solid)`, caret to `--cs-color-negative-solid`, and leading/chevron icons to `--cs-color-negative-soft-fg`.
  - `[data-disabled]`: `--cs-disabled-opacity: 1`, colorless `--cs-color-disabled-fg` / `--cs-color-disabled-bg`, `--cs-shadow: none` (including `elevated`, borderless), zero focus ring.
- **Typography & Cursor:**
  - `.cs-combobox-input` uses `font-weight: 400` (matching `TextInputField`, preventing glyph-width reflow while editing), `caret-color: var(--cs-color-accent-solid)`, `cursor: text`, and `--cs-color-text-weak` for `::placeholder`.
  - Clicking empty shell padding (`onmousedown` on `ComboboxControl` when `event.target === ref`) calls `event.preventDefault()` and focuses `<input>` without ring flicker.

### Single-Select vs. Multi-Select (`multiple`)

- **Single-select (default):** Fixed `height: var(--cs-combobox-height)`, single-line `<input>`, optional leading icon (`showIcon`) synced from the selected item when the input matches the committed label.
- **Multi-select (optional future/mode extension):**
  - `ComboboxControl[data-multiple]` uses `min-height: var(--cs-combobox-height)`, `height: auto`, `flex-wrap: wrap`, `padding-block: 4px`, with inline removable chips (`xs`/`sm` height calibrated to fit cleanly inside a single `32px–44px` row) and `<input>` set to `flex: 1 1 60px`.
  - Trailing `ComboboxClear` and `ComboboxTrigger` remain pinned in a non-wrapping end slot (`align-self: center`) so they never wrap onto a chip row.

---

## 3. Shared vs. Module-Local Architecture (`src/shared/listbox/`)

### Recommendation: Extract Shared Listbox CSS into `src/shared/listbox/listbox.css`

Follow the exact precedent of `src/shared/button-control/button-control.css` (imported directly by both `Button` and `ToggleButton`):

1. **What moves to `src/shared/listbox/listbox.css` (`@layer components.composite`):**
   - **Panel & Scroll list:** `.cs-listbox` (background `--cs-color-elevated`, `--cs-shadow-floating`, `--cs-squircle-soft`, concentric `xs–xl` size tokens `--cs-listbox-content-radius`, `--cs-listbox-content-padding`, `--cs-listbox-item-*`, `--cs-listbox-icon-size`, `--cs-listbox-check-size`, `--cs-listbox-group-*`) and `.cs-listbox-list` (flex column, gap, padding, `overscroll-behavior: contain`, `scroll-padding-block`).
   - **Items & Subparts:** `.cs-listbox-item`, `.cs-listbox-item-inner` (grid layout with optional icon & checkmark), `.cs-listbox-item-content` (single-line `text-box: trim-both cap alphabetic`, inline accessories, and `has(> .cs-listbox-item-description)` 2-row grid), `.cs-listbox-item-icon`, `.cs-listbox-item-text`, `.cs-listbox-item-description`, `.cs-listbox-item-check` (opacity/scale checkmark reveal), `.cs-listbox-group`, `.cs-listbox-group-label`, `.cs-listbox-separator`, and `.cs-listbox-empty`.
   - **Unified Active / Highlight Selector:** Both focus models share one visual rule:
     - `:is(.cs-listbox:not([data-nav="keyboard"])) .cs-listbox-item:hover:not([data-disabled])`
     - `.cs-listbox[data-nav="keyboard"] .cs-listbox-item[data-roving-active]:not([data-disabled])` (`Select`)
     - `.cs-listbox-item[data-highlighted]:not([data-disabled])` (`Combobox`)
2. **What stays module-local:**
   - **Control / Trigger shells (`SelectTrigger` vs. `ComboboxControl`/`ComboboxInput`/`ComboboxClear`/`ComboboxTrigger`):** Different DOM semantics (`<button>` vs. `<div>` + `<input>` + action buttons). Keep styles local to `combobox/` while mirroring `TextInput` and `SelectTrigger` token values.
   - **Context & Keyboard/Filter State Machines:** `Select` manages `rovingFocus`, trigger typeahead, and pointer-drag-release; `Combobox` manages input-driven filtering, `aria-activedescendant`, query-vs-value sync, and empty state. Keeping TS/Svelte logic separate avoids cross-module coupling and brittle abstractions.

---

## 4. States & Motion Choreography

### 1. Active / Highlighted Item (Focus Stays in `<input>`)

- **ARIA & Focus:** DOM focus remains on `<input>` (`aria-activedescendant={activeItemId}`). `ComboboxItem` has `role="option"` and `tabindex={-1}`, and `onmousedown={(e) => e.preventDefault()}` prevents pointer clicks from blurring `<input>` before selection commits.
- **Visual Highlight:** Active items receive `data-highlighted=""` instead of `:focus-visible`. They render the calm `--cs-color-base-soft` surface and `--cs-color-text-main` icon tint without an item-level `2px` focus outline (preserving the single accent focus ring on `ComboboxControl`).
- **Keyboard vs. Pointer Arbitration:** `ArrowDown` / `ArrowUp` / `Home` / `End` set `data-nav="keyboard"` on `ComboboxContent`, suppressing `:hover` so a stationary cursor never fights keyboard navigation. Mouse `pointermove` clears `data-nav="keyboard"` and syncs `data-highlighted` to the hovered item.

### 2. Empty State (`ComboboxEmpty`)

- Rendered inside `.cs-listbox-list` when zero items match the current filter.
- **Styling:** `padding-inline: var(--cs-listbox-item-px)`, `padding-block: calc(var(--cs-listbox-item-py) * 2.5)`, `color: var(--cs-color-text-weak)`, `font-size: var(--cs-listbox-item-font-size)`, `line-height: var(--cs-leading-snug)`, `text-align: center`, `user-select: none`.
- **Motion:** Subtle fade-in (`opacity: 0 → 1`, `--cs-dur-effect-fast` `100ms` `--cs-ease-effect`) so filtering down to zero matches feels calm rather than abrupt.

### 3. Typing-to-Open & Popover Cadence

- `ComboboxContent` wraps `Popover` (`placement="bottom-start"`, `width="min-anchor"`, `offset="8px"`, `maxHeight="min(320px, 60dvh)"`).
- Typing into a closed `ComboboxInput` opens the popover immediately using `Popover`'s native top-layer enter choreography (`--cs-dur-enter-sm` / `--cs-ease-enter`) while keeping caret and selection undisturbed in `<input>`.

### 4. Clear & Chevron Micro-Interactions

- **Clear Button (`ComboboxClear`):** Mirrors `TextInputAction` collapse/reveal choreography:
  - Hidden (`data-visible="false"`): `width: 0`, `margin-inline-start: calc(var(--cs-combobox-gap) * -1)`, `opacity: 0`, `scale: 0.85`, `visibility: hidden`, transitioning over `--cs-dur-120` `--cs-ease-quart-out` (`visibility var(--cs-dur-120) allow-discrete`).
  - Hover / Press: `::before` circular-squircle backdrop fills `--cs-color-base-soft` on hover and `--cs-color-base-soft-hover` + `scale: 0.92` (`--cs-dur-press` `140ms` `--cs-ease-press`) on `:active`.
  - `onmousedown={(e) => e.preventDefault()}` ensures clearing returns/keeps focus in `<input>`.
- **Chevron Toggle (`ComboboxTrigger`):**
  - Uses the same concentric action button & `::before` press physics (`tabindex={-1}`, `onmousedown={(e) => e.preventDefault()}`).
  - `ChevronDown` (`stroke-width: 2.25`) rotates `0deg → 180deg` on `[data-state="open"]` with asymmetric timing: `--cs-dur-200` `--cs-ease-quart-out` on open, `--cs-dur-exit-md` (`120ms`) `--cs-ease-exit` on close.
