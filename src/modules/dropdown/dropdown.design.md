# Dropdown Design Spec (`src/modules/dropdown/`)

## 1. Visual Direction & Parity with `Select` & `Combobox`

`Dropdown` shares the exact floating surface language of [`Select`](../select/select.docs.md) and [`Combobox`](../combobox/combobox.design.md) by composing [`src/shared/listbox/listbox.css`](../../shared/listbox/listbox.css) while adapting its item anatomy for **actions, shortcuts, and toggles** rather than form value selection:

- **Calm monochrome floating surface:** `--cs-listbox-content-bg` (`--cs-color-elevated`), `--cs-listbox-content-shadow` (`--cs-shadow-floating`), borderless depth, and `--cs-squircle-soft` (`corner-shape`) geometry.
- **Concentric panel-to-item radii:** Item corner radius derives from `--cs-listbox-item-radius: max(var(--cs-radius-lg), calc(var(--cs-listbox-content-radius) - var(--cs-listbox-content-padding)))`, matching `Select` and `Combobox` pixel-for-pixel.
- **Identical `Popover` spring choreography:** Wraps `Popover` (`placement="bottom-start"`, `offset="8px"`, `maxHeight="min(320px, 60dvh)"`) with native top-layer enter/exit physics (`--cs-dur-enter-md` / `--cs-ease-enter` in, `--cs-dur-exit-md` / `--cs-ease-exit` out).
- **Trigger-agnostic (`{@attach dropdownTrigger()}`):** `Dropdown` ships no trigger chrome of its own. Any interactive element (`Button`, `IconButton`, `Avatar`, text link) binds via `{@attach dropdownTrigger()}` (matching `Popover`).

---

## 2. Size Scale & Panel Geometry (`xs` – `xl`)

Because the trigger is external and arbitrary in size, `size` (`xs`–`xl`) is a **required prop** on `Dropdown` (no default, consistent with `Select`, `Combobox`, and `Button`), propagated via context to `data-size={dropdown.size}` on `DropdownContent.cs-listbox`:

| Size | `--cs-listbox-content-radius` | `--cs-listbox-content-padding` | `--cs-listbox-item-min-height` | `--cs-listbox-item-px` / `py` | `--cs-listbox-item-font-size` | `--cs-listbox-item-title-lh` | `--cs-listbox-icon-size` | `--cs-listbox-group-gap` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` | `14px` | `4px` | `28px` | `8px` / `5px` | `--cs-text-xs` | `18px` | `14px` | `6px` |
| `sm` | `14px` | `4px` | `30px` | `8px` / `6px` | `--cs-text-xs` | `18px` | `14px` | `6px` |
| `md` | `18px` | `6px` | `34px` | `10px` / `7px` | `--cs-text-sm` | `20px` | `16px` | `10px` |
| `lg` | `18px` | `6px` | `38px` | `12px` / `8px` | `--cs-text-sm` | `20px` | `16px` | `10px` |
| `xl` | `20px` | `6px` | `42px` | `12px` / `9px` | `--cs-text-base` | `22px` | `18px` | `10px` |

### Panel Width & Bounds

- **Default `width="content"`:** Unlike `SelectContent` and `ComboboxContent` (which default to `width="min-anchor"` to match form controls), `DropdownContent` is frequently anchored to compact `IconButton`s or `Avatar`s and defaults to `width="content"`.
- **Optical width floor & ceiling (on `.cs-dropdown-content.cs-listbox`):**
  - `min-inline-size: var(--cs-dropdown-content-min-width, 180px)` (prevents narrow 1-word menus from looking pinched).
  - `--cs-listbox-content-max-width: var(--cs-dropdown-content-max-width, 320px)` (`320px` cap vs. `listbox.css`'s `360px` default keeps trailing shortcuts visually connected to their labels).
  - `--cs-listbox-content-max-height: ${maxHeight}` (passed inline by `DropdownContent`, defaulting to `min(320px, 60dvh)`).

---

## 3. Item Anatomy

### 1. Standard Action Item (`DropdownItem`) — No Reserved Checkmark Gutter

`listbox.css` already collapses the trailing checkmark column whenever `.cs-listbox-item-check` is absent (`.cs-listbox-item-inner:not(:has(> .cs-listbox-item-check))` sets `grid-template-columns: minmax(0, 1fr)`, or `auto minmax(0, 1fr)` with `.cs-listbox-item-icon`). By omitting `.cs-listbox-item-check`, `DropdownItem` gets zero wasted gutter space out of the box:

```text
.cs-dropdown-item.cs-listbox-item (role="menuitem", data-negative, data-disabled)
└── .cs-dropdown-item-inner.cs-listbox-item-inner
    ├── [optional] Icon (.cs-dropdown-item-icon.cs-listbox-item-icon, 14–18px, stroke-width: 2.25)
    └── .cs-dropdown-item-content.cs-listbox-item-content
        ├── Label (or .cs-dropdown-item-text.cs-listbox-item-text)
        ├── [optional] .cs-dropdown-item-description.cs-listbox-item-description
        └── [optional] Trailing accessory: .cs-dropdown-shortcut | <Kbd> | Badge
```

- **Optical icon inset:** Handled automatically by `listbox.css` (`.cs-listbox-item:has(.cs-listbox-item-icon)` sets `padding-inline-start: calc(var(--cs-listbox-item-px) - 2px)` to compensate for Lucide's `2px` internal SVG viewBox padding).
- **Label & Description:**
  - Single-line label uses `font-weight: 500`, `text-box: trim-both cap alphabetic`, `overflow-x: clip; text-overflow: ellipsis; white-space: nowrap`.
  - When `DropdownItemDescription` (`.cs-listbox-item-description`) is present, `.cs-listbox-item-content` switches to its 2-row grid (`row-gap: 2px`), `.cs-listbox-item-text` resets to `text-box: normal; line-height: var(--cs-listbox-item-title-lh)`, and trailing accessories automatically land in `grid-row: 1; align-self: center; flex-shrink: 0`.

### 2. Trailing Shortcut & Submenus (v1.1 / Deferred)

- **Text Shortcut (`.cs-dropdown-shortcut`):**
  - Placed inside `.cs-listbox-item-content` after the label/`DropdownItemText`. `listbox.css` already gives trailing non-text children `flex-shrink: 0` (and `margin-inline-start: auto` when `.cs-listbox-item-text` is absent; when `.cs-listbox-item-text` is present, `flex: 1 1 auto` pushes the shortcut right).
  - Styling: `padding-inline-start: 12px` (minimum breathing room from long labels), `font-size: var(--cs-text-xs)` (`11px` at `xs`/`sm`), `font-weight: 500`, `font-variant-numeric: tabular-nums`, `letter-spacing: 0.02em`, `text-box: trim-both cap alphabetic`.
  - Color: `--cs-dropdown-shortcut-fg: var(--cs-color-text-weaker)` at rest → `--cs-color-text-weak` on hover/highlight (`--cs-color-disabled-fg` when disabled).
- **`<Kbd>` Shortcut:**
  - Use `<Kbd variant="ghost" size="xs" />` for `xs`–`lg` menus (`18px` tall, `10px` text) and `size="sm"` for `xl` menus (`20px` tall). `variant="ghost"` keeps the floating panel calm and borderless; `variant="soft"` may be used when extra keycap separation is desired.
- **Submenus (`DropdownSubTrigger` / `DropdownSubContent`) — *v1.1 / Deferred (not part of v1)*:**
  - When added in v1.1, `DropdownSubTrigger` will render `ChevronRight` (`.cs-dropdown-sub-chevron`, `width: calc(var(--cs-listbox-icon-size) - 2px)`, `stroke-width: 2.25`, `--cs-color-text-weaker` → `--cs-color-text-weak`) as a trailing child inside `.cs-listbox-item-content`, retain `--cs-listbox-item-bg-hover` (`[data-state="open"]`) while its child panel is open, and anchor `DropdownSubContent` via `Popover` (`placement="right-start"`, `offset="4px"`, `width="content"`).

### 3. Check & Radio Items (`DropdownCheckboxItem` & `DropdownRadioItem`)

- **Leading Indicator Slot (`.cs-dropdown-item-indicator`):** Unlike `SelectItem` and `ComboboxItem` (which place `.cs-listbox-item-check` on the right and have no shortcuts), `DropdownCheckboxItem` and `DropdownRadioItem` place their indicator in the **leading** `--cs-listbox-icon-size` (`14px–18px`) column and use `padding-inline-start: calc(var(--cs-listbox-item-px) - 2px)` (matching `.cs-listbox-item-icon`):
  - Labels align vertically across checked and unchecked items in the same group.
  - The trailing slot remains free for `<Kbd>` or `.cs-dropdown-shortcut`.
  - Standard `DropdownItem`s in other groups are never penalized with an empty leading gutter.
- **Indicator Visuals & Motion:**
  - `DropdownCheckboxItem[data-checked]`: Lucide `Check` (`stroke-width: 2.5`, `--cs-listbox-item-indicator-fg` / `--cs-color-accent-soft-fg`) reveals via `opacity: 0 → 1`, `scale: 0.75 → 1` (`--cs-dur-effect-fast` `--cs-ease-quart-out`).
  - `DropdownRadioItem[data-checked]`: Centered `6px` circular dot (`border-radius: var(--cs-radius-full)`, `background-color: var(--cs-listbox-item-indicator-fg)`) reveals via `opacity: 0 → 1`, `scale: 0 → 1` (`--cs-dur-effect-fast` `--cs-ease-quart-out`).

---

## 4. Destructive / Semantic Actions (`negative`)

Following intent-driven status semantics and `Button`'s boolean `negative` API, `DropdownItem` exposes `negative?: boolean` (`data-negative` attribute, omitting `positive`, `caution`, and `info`).

- **Calm at rest:** Default state uses standard monochrome `--cs-listbox-item-fg` (`--cs-color-text-strong`) and `--cs-listbox-item-icon-fg` (`--cs-color-text-weak`) so a destructive action does not shout in a quiet menu.
- **Clear on hover / keyboard highlight / press:**
  - `listbox.css` sets `--cs-listbox-item-icon-fg: var(--cs-color-text-main)` directly inside `:hover`, `[data-roving-active]`, `:focus-visible`, and `:active`. `.cs-dropdown-item[data-negative]` therefore overrides those interaction states with:
    - Hover / `[data-roving-active]` / `:focus-visible`: `background-color: var(--cs-color-negative-soft)`, `color: var(--cs-color-negative-soft-fg)`, `--cs-listbox-item-icon-fg: var(--cs-color-negative-soft-fg)`, `--cs-dropdown-shortcut-fg: color-mix(in oklab, var(--cs-color-negative-soft-fg) 70%, transparent)`.
    - `:active`: `background-color: var(--cs-color-negative-soft-hover)`, `scale: 0.97`.
    - `[data-disabled]`: Overrides back to colorless `--cs-color-disabled-fg` with `transparent` background.

---

## 5. Compound Flexibility (Headers, Inline Widgets, Groups & Separators)

- **`DropdownGroup` / `DropdownGroupLabel` / `DropdownSeparator`:**
  - Compose `.cs-dropdown-group.cs-listbox-group`, `.cs-dropdown-group-label.cs-listbox-group-label`, and `.cs-dropdown-separator.cs-listbox-separator` directly from `listbox.css` (1:1 parity with `ComboboxGroup`, `ComboboxGroupLabel`, and `ComboboxSeparator`).
- **Custom Header (e.g. User Info / Workspace Header):**
  - Non-interactive, excluded from `rovingFocus`. Uses `--cs-listbox-item-px` horizontal padding, `padding-block: 6px 8px`, `--cs-text-sm` `font-weight: 500` `--cs-color-text-strong` title + `--cs-text-xs` `--cs-color-text-weak` subtitle, followed by a `DropdownSeparator`. Zero extra card fill or border.
- **Inline Widgets (e.g. `Switch`, `Slider`, `ToggleGroup`):**
  - Non-item custom rows (`.cs-dropdown-row`) match item padding (`padding-inline: var(--cs-listbox-item-px)`, `padding-block: var(--cs-listbox-item-py)`, `min-height: var(--cs-listbox-item-min-height)`) with `background: transparent` and no item-level hover/press scale, letting the embedded control own its focus ring and tactile physics.
  - Inline `Switch` rows wrap text + `<Switch size="sm" />` inside a clickable `<label>` (no extra hit-area wrapper DOM).

---

## 6. States & Motion Choreography

- **Keyboard vs. Pointer Arbitration:** Identical to `SelectContent` and `listbox.css`:
  - `ArrowDown`, `ArrowUp`, `Home`, `End`, and printable typeahead set `data-nav="keyboard"` and `data-arrow-nav` on `DropdownContent`, suppressing `:hover` (`.cs-listbox:not([data-nav="keyboard"]) &:hover:not([data-disabled])`) so a stationary cursor never fights keyboard navigation.
  - Mouse `pointermove` (`pointerType === "mouse"`) clears `data-nav="keyboard"` / `data-arrow-nav` and focuses `listRef` (`preventScroll: true`) so `:focus-visible` never flashes.
- **Tactile Press:** Inherited from `listbox.css` (`scale: 0.97` on `:active`, `--cs-dur-press` `--cs-ease-press`, `--cs-listbox-item-bg-active`).
- **Submenu Hover Intent (*v1.1 / Deferred*):** When submenus are added in v1.1, opening/closing nested `DropdownSubContent` on pointer hover will use a brief hover-intent delay (`~120ms` open, `~150ms` close) so diagonal pointer movement from `DropdownSubTrigger` toward the child panel never accidentally dismisses the submenu.

---

## 7. Integration with `src/shared/listbox/listbox.css`

`src/shared/listbox/listbox.css` is already live and powers `Combobox`. `Dropdown` imports `../../shared/listbox/listbox.css` directly and composes the `.cs-listbox*` classes alongside `.cs-dropdown-*` hooks:

1. **Reused directly from `src/shared/listbox/listbox.css` (zero duplication):**
   - `.cs-listbox` (panel surface, `xs`–`xl` size tokens, concentric `--cs-listbox-item-radius`, `:popover-open` flex column).
   - `.cs-listbox-list` (vertical flex, gap, padding, `overscroll-behavior: contain`, `scroll-padding-block`, `:focus { outline: none }`).
   - `.cs-listbox-item`, `.cs-listbox-item-inner` (including automatic collapse of `.cs-listbox-item-check` when absent), `.cs-listbox-item-content` (single-line `text-trim` + 2-row description grid + trailing accessory flex/grid placement), `.cs-listbox-item-icon`, `.cs-listbox-item-text`, `.cs-listbox-item-description`.
   - Unified hover / `[data-nav="keyboard"] [data-roving-active]` / `:focus-visible` / `:active` / `[data-disabled]` rules.
   - `.cs-listbox-group`, `.cs-listbox-group-label`, `.cs-listbox-separator`.
2. **Small `listbox.css` extension needed (or module-local in `dropdown`):**
   - **Leading indicator slot (`.cs-listbox-item-indicator`):** Currently `listbox.css` only checks `.cs-listbox-item-icon` for `padding-inline-start: calc(var(--cs-listbox-item-px) - 2px)` and `grid-template-columns: auto minmax(0, 1fr)`. Extending those two `:has(...)` selectors in `listbox.css` to `:has(.cs-listbox-item-icon, .cs-listbox-item-indicator)` lets `DropdownCheckboxItem` and `DropdownRadioItem` share the exact leading icon geometry without duplicating grid rules.
3. **Kept module-local in `src/modules/dropdown/`:**
   - `width="content"` default, `min-inline-size: 180px`, and `--cs-listbox-content-max-width: 320px` on `.cs-dropdown-content`.
   - `.cs-dropdown-item[data-negative]` hover/active/roving-active overrides.
   - `.cs-dropdown-shortcut`, `.cs-dropdown-header`, and `.cs-dropdown-row` (with `.cs-dropdown-sub-chevron` / `[data-state="open"]` submenu trigger persistence deferred to v1.1).
