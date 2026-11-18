# Combobox Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (compound component suite)
- **Purpose:** An accessible, filterable single-select autocomplete/combobox built on top of `Popover`, `ScrollArea`, `scrollFade`, and `HitArea`, pairing `TextInput`-aligned input chrome with `Select`-aligned floating listbox ergonomics.
- **Boundaries:**
  - Owns input-to-listbox state synchronization (`value`, `inputValue`, `open`, `highlightedValue`), client-side filtering (plus opt-out for consumer/async filtering), and ARIA 1.2 combobox focus management.
  - Delegates floating positioning and top-layer light-dismiss to `Popover`, overflow scrolling to `ScrollArea` / `scrollFade`, and compact button hit-area expansion to `HitArea`.
  - **Does not** implement multi-select tag/chip editing (`value: T[]`), virtualized list windowing, or async fetching/debouncing primitives.

---

## 2. Public API

### Exports (`src/modules/combobox/index.ts`)

**Components (flat `PascalCase`, matching `Select`):**
- `Combobox` — Root context provider, state coordinator, and optional hidden `<input>` for native form submission.
- `ComboboxControl` — Styled input shell `<div>` (`variant`, `size`), `Popover` anchor, and click-to-focus delegate.
- `ComboboxInput` — Native `<input role="combobox">` bound to `inputValue`.
- `ComboboxIcon` — Optional leading decorative `<svg>` icon inside `ComboboxControl`.
- `ComboboxClear` — Optional `<button type="button">` to clear `inputValue` and `value` when non-empty.
- `ComboboxTrigger` — Optional `<button type="button">` with rotating `ChevronDown` indicator to toggle `open`.
- `ComboboxContent` — Floating `Popover` (`role="listbox"`) containing `ScrollArea` + `scrollFade`.
- `ComboboxEmpty` — Empty-state container rendered when zero visible items match.
- `ComboboxGroup` — Semantic option group (`role="group"`), auto-hidden when all child items are filtered out.
- `ComboboxGroupLabel` — Accessible group heading wired via `aria-labelledby`.
- `ComboboxItem` — Selectable option (`role="option"`).
- `ComboboxItemIcon` — Leading option icon.
- `ComboboxItemText` — Primary option label (used for label extraction and `text-trim`).
- `ComboboxItemDescription` — Secondary muted option description.
- `ComboboxSeparator` — Visual divider (`role="separator"`).

**Constants & Types:**
- `COMBOBOX_VARIANTS = ["soft", "elevated"] as const` -> `ComboboxVariant`
- `COMBOBOX_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `ComboboxSize`
- `ComboboxFilterFn<T extends string = string> = (label: string, query: string, value: T) => boolean`
- `ComboboxProps<T>`, `ComboboxControlProps`, `ComboboxInputProps`, `ComboboxIconProps`, `ComboboxClearProps`, `ComboboxTriggerProps`, `ComboboxContentProps`, `ComboboxEmptyProps`, `ComboboxGroupProps`, `ComboboxGroupLabelProps`, `ComboboxItemProps<T>`, `ComboboxItemIconProps`, `ComboboxItemTextProps`, `ComboboxItemDescriptionProps`, `ComboboxSeparatorProps`, `ComboboxIconComponentProps`.

### Component Props

#### `Combobox<T extends string = string>`
- `value = $bindable<T | undefined>()` — Selected option value (or custom value when `allowCustomValue` is `true`).
- `onValueChange?: (value: T | undefined) => void`
- `inputValue = $bindable("")` — Live text in `ComboboxInput`.
- `onInputValueChange?: (inputValue: string) => void`
- `open = $bindable(false)` — Popover open state.
- `onOpenChange?: (open: boolean) => void`
- `variant: ComboboxVariant` — **Required** (`"soft" | "elevated"`, no default).
- `size: ComboboxSize` — **Required** (`"xs" | "sm" | "md" | "lg" | "xl"`, no default).
- `filter?: boolean | ComboboxFilterFn<T>` — `@default true`.
  - `true`: built-in normalized case-insensitive substring match against item label (and optional `keywords`).
  - `false`: disables built-in filtering (for consumer-driven / async filtering).
  - `(label, query, value) => boolean`: custom client-side matcher.
- `allowCustomValue?: boolean` — `@default false`. When `true`, custom `inputValue` is committed to `value` on `Enter` (when no item is highlighted) and on blur rather than reverting to `selectedItem?.label`.
- `openOnFocus?: boolean` — `@default false`. Opens the listbox automatically when `ComboboxInput` receives focus (unless `readonly` or `disabled`).
- `disabled?: boolean` — `@default false`.
- `readonly?: boolean` — `@default false`.
- `invalid?: boolean` — `@default false`.
- `required?: boolean` — `@default false`.
- `name?: string` — Renders `<input type="hidden" {name} value={value ?? ""} {disabled} />`.
- `id?: string` — Base ID for ARIA wiring (falls back to `$props.id()`).
- `children?: Snippet`

#### `ComboboxControl` (`Omit<HTMLAttributes<HTMLDivElement>, "children">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `disabled?: boolean`, `readonly?: boolean`, `invalid?: boolean` (override root flags if provided).
- `children?: Snippet`

#### `ComboboxInput` (`Omit<HTMLInputAttributes, "size" | "children" | "value">`)
- `ref = $bindable<HTMLInputElement | null>(null)`
- `disabled?: boolean`, `readonly?: boolean`, `invalid?: boolean`
- Forwards `{...rest}` (`placeholder`, `autocomplete="off"` default unless overridden, `aria-label`, etc.) directly to `<input>`.

#### `ComboboxIcon` (`Omit<SVGAttributes<SVGSVGElement>, "children" | "color">`)
- `icon: Component<ComboboxIconComponentProps>`
- `color?: string`

#### `ComboboxClear` (`Omit<HTMLButtonAttributes, "type">`)
- `ref = $bindable<HTMLButtonElement | null>(null)`
- `icon?: Component<ComboboxIconComponentProps>` (defaults to `X` from `@lucide/svelte`).
- `disabled?: boolean`
- Auto-hides (`data-visible="false"`) when `inputValue === ""` (or when `disabled` / `readonly`), using `HitArea` (`size="sm"`).

#### `ComboboxTrigger` (`Omit<HTMLButtonAttributes, "type">`)
- `ref = $bindable<HTMLButtonElement | null>(null)`
- `disabled?: boolean`
- Renders `ChevronDown` by default (customizable via `children`), using `HitArea` (`size="sm"`).

#### `ComboboxContent` (`Omit<PopoverProps, "id" | "placement" | "width" | "offset">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `id?: string`
- `placement?: PopoverPlacement` (`@default "bottom-start"`)
- `width?: PopoverWidth` (`@default "min-anchor"`)
- `offset?: string` (`@default "8px"`)
- `maxHeight?: string` (`@default "min(320px, 60dvh)"`)
- `scrollbar?: ScrollAreaScrollbar` (`@default "hover"`)
- `animate?: boolean` (`@default true`)

#### `ComboboxEmpty` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- Renders when `visibleItemCount === 0` (falls back to localized `"No results."` / `"Keine Ergebnisse."` via `src/shared/lang.internal.ts` when `children` is omitted).

#### `ComboboxGroup`, `ComboboxGroupLabel`, `ComboboxSeparator`, `ComboboxItemIcon`, `ComboboxItemText`, `ComboboxItemDescription`
- Mirror `SelectGroup`, `SelectGroupLabel`, `SelectSeparator`, `SelectItemIcon`, `SelectItemText`, `SelectItemDescription` 1:1, each exposing `ref = $bindable()` on its root element.

#### `ComboboxItem<T extends string = string>` (`Omit<HTMLAttributes<HTMLDivElement>, "children">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `value: T`
- `label?: string`
- `keywords?: string[]` — Extra searchable terms included by the default filter.
- `icon?: Component<ComboboxIconComponentProps>`
- `disabled?: boolean`
- `hideIndicator?: boolean` (`@default false`)
- `children?: Snippet`

### CSS Variables (`--cs-combobox-*`)

**Control shell (`.cs-combobox-control`):**
- `--cs-combobox-bg`, `--cs-combobox-bg-hover`
- `--cs-combobox-fg`, `--cs-combobox-placeholder-fg`, `--cs-combobox-caret`
- `--cs-combobox-icon-fg`, `--cs-combobox-indicator-fg`
- `--cs-combobox-shadow`, `--cs-combobox-shadow-hover`
- `--cs-combobox-ring-shadow`, `--cs-combobox-ring-shadow-hover`
- `--cs-combobox-height`, `--cs-combobox-font-size`, `--cs-combobox-radius`, `--cs-combobox-px`, `--cs-combobox-gap`, `--cs-combobox-icon-size`, `--cs-combobox-action-size`, `--cs-combobox-action-inset`

**Floating listbox & items (`.cs-combobox-content`, `.cs-combobox-item`):**
- `--cs-combobox-content-bg`, `--cs-combobox-content-shadow`, `--cs-combobox-content-radius`, `--cs-combobox-content-padding`, `--cs-combobox-content-max-height`, `--cs-combobox-content-max-width`
- `--cs-combobox-list-gap`
- `--cs-combobox-item-bg`, `--cs-combobox-item-bg-hover`, `--cs-combobox-item-bg-highlighted`, `--cs-combobox-item-bg-active`
- `--cs-combobox-item-fg`, `--cs-combobox-item-description-fg`, `--cs-combobox-item-icon-fg`, `--cs-combobox-item-indicator-fg`
- `--cs-combobox-item-radius`, `--cs-combobox-item-px`, `--cs-combobox-item-py`, `--cs-combobox-item-min-height`, `--cs-combobox-item-gap`, `--cs-combobox-item-font-size`
- `--cs-combobox-empty-fg`

---

## 3. DOM, Semantics & Accessibility

### Native Elements & `data-*` Selectors
- `ComboboxControl`: `<div class="cs-combobox-control" data-variant={variant} data-size={size} data-open? data-disabled? data-readonly? data-invalid?>`
  - Anchored for `Popover` via `popoverTrigger({ target: listboxId, triggerOn: "manual" })`.
  - Clicking empty shell padding focuses `ComboboxInput` (`event.preventDefault()` on `mousedown` when `event.target === ref`, matching `TextInput`).
- `ComboboxInput`: `<input class="cs-combobox-input" type="text" role="combobox" autocomplete="off" ...>`
  - `aria-expanded={open ? "true" : "false"}`
  - `aria-controls={listboxId}`
  - `aria-autocomplete={filter === false ? "list" : "list"}` (or `"none"` when `filter === false` and consumer does not filter; default `"list"`).
  - `aria-activedescendant={open && highlightedItemId ? highlightedItemId : undefined}`
  - `aria-invalid={resolvedInvalid ? "true" : undefined}`
  - `aria-required={required ? "true" : undefined}`
- `ComboboxClear` / `ComboboxTrigger`: `<button type="button" tabindex={-1}>`
  - `onpointerdown={(e) => e.preventDefault()}` so pointer interaction never blurs `ComboboxInput`.
  - `ComboboxTrigger` carries `aria-label` (localized `"Toggle options"` / `"Optionen umschalten"`), `aria-expanded={open ? "true" : "false"}`, `aria-controls={listboxId}`, `data-open={open ? "" : undefined}`.
- `ComboboxContent`: `<Popover role="listbox" id={resolvedId} aria-labelledby={labelId} data-size={size} data-nav={isKeyboardNav ? "keyboard" : undefined}>`
- `ComboboxItem`: `<div role="option" id={itemId} tabindex={-1} aria-selected={isSelected ? "true" : "false"} aria-disabled={isDisabled ? "true" : undefined} data-value={value} data-label={resolvedLabel} data-selected? data-highlighted? data-disabled? data-hidden? hidden={!isVisible}>`
- `ComboboxGroup`: `<div role="group" aria-labelledby={groupLabelId}>` (hidden via CSS `:not(:has(.cs-combobox-item:not([data-hidden])))` when all child items are filtered out).

### Input, Selection & Filtering State Machine
1. **Show-all-on-open invariant (`isFiltering`):**
   - Opening via `ComboboxTrigger`, `openOnFocus`, or `ArrowDown`/`ArrowUp` sets `isFiltering = false` so all items remain visible even when `inputValue` already holds the selected item's label.
   - Editing text in `ComboboxInput` (`oninput`) sets `isFiltering = true`, opens the popover if closed, and highlights the first visible enabled item.
2. **External `value` sync:**
   - When `value` is set initially or updated externally, `inputValue` syncs to `selectedItem?.label ?? value ?? ""` (when not actively typing).
   - Clearing `inputValue` to `""` (via backspace or `ComboboxClear`) clears `value` to `undefined` and emits `onValueChange?.(undefined)`.
3. **Item selection (`select(item)`):**
   - Sets `value = item.value` and `inputValue = item.label` (firing callbacks if changed), resets `isFiltering = false`, closes `open = false`, and keeps DOM focus on `ComboboxInput`.
4. **Blur / Outside light-dismiss:**
   - Closes `open = false`, resets `isFiltering = false`.
   - If `!allowCustomValue`: reverts `inputValue` to `selectedItem?.label ?? ""`.
   - If `allowCustomValue`: commits `inputValue === "" ? undefined : (inputValue as T)` to `value`.

### Keyboard & Focus Contract (ARIA 1.2)
- **DOM focus always stays on `ComboboxInput`** while the popover is open; `rovingFocus` is **not** used.
- **`ArrowDown`:**
  - Closed: opens popover (`isFiltering = false`), highlights the currently selected enabled item (if any) or the first visible enabled item.
  - Open: moves `highlightedValue` to next visible enabled item (clamped, `loop: false`), scrolls into view (`block: "nearest"`), sets `data-nav="keyboard"`.
- **`ArrowUp`:**
  - Closed: opens popover (`isFiltering = false`), highlights the currently selected enabled item (if any) or the last visible enabled item.
  - Open: moves `highlightedValue` to previous visible enabled item (clamped).
- **`Home` / `End`:** Preserves native `<input>` text-caret movement (not hijacked for list navigation).
- **`Enter`:**
  - Open + highlighted item: `preventDefault()`, selects highlighted item, closes popover.
  - Open + no highlighted item + `allowCustomValue`: `preventDefault()`, commits `inputValue` to `value`, closes popover.
  - Closed: native behavior (allows form submit).
- **`Escape`:**
  - Open: `preventDefault()`, `stopPropagation()`, closes popover, reverts `inputValue` when `!allowCustomValue`.
  - Closed + `!allowCustomValue` + dirty `inputValue`: `preventDefault()`, reverts `inputValue` to `selectedItem?.label ?? ""`.
- **`Tab`:** Closes popover (applying blur commit/revert rules) and allows native focus traversal to the next focusable element.
- **Pointer hover vs keyboard:** Moving the mouse over an item (`onpointermove`) clears `data-nav="keyboard"` and updates `highlightedValue` to that item; `onpointerdown` on `ComboboxItem` calls `preventDefault()` so `<input>` never blurs before `onclick` commits selection.

---

## 4. Visual & Motion Contract

- **Control Chrome Parity (`TextInput`):**
  - `ComboboxControl` matches `TextInput` 1:1 across `xs..xl` heights (`28px`, `32px`, `36px`, `40px`, `44px`), radii (`9px..14px`), `--cs-squircle-soft`, `soft` (`--cs-color-base-soft`) and `elevated` (`--cs-color-elevated` + `--cs-shadow-elevated`) surfaces, `:focus-within` 2px `--cs-color-accent-solid` inset ring, `data-invalid` negative ring, and colorless `--cs-color-disabled-*` tokens.
- **Floating Listbox Parity (`Select`):**
  - `ComboboxContent` uses `--cs-color-elevated`, `--cs-shadow-floating`, `--cs-squircle-soft`, concentric panel/item radii (`xs..xl`), and `Popover` directional spring animation (`animate = true`).
  - `ComboboxItem` highlights both `:hover:not([data-disabled])` (when `data-nav="keyboard"` is absent) and `[data-highlighted]` with `--cs-combobox-item-bg-hover` (`--cs-color-base-soft`), and `:active` with `--cs-combobox-item-bg-active` + subtle `scale` press feedback (`--cs-dur-press`, `--cs-ease-press`).
  - `ComboboxTrigger` chevron rotates `180deg` on `[data-open]` using `--cs-dur-200` / `--cs-ease-quart-out` (open) and `--cs-dur-exit-md` / `--cs-ease-exit` (close), matching `SelectTrigger`.
  - `ComboboxClear` animates visibility (`opacity`, `scale`, `width`) matching `TextInputAction`.

---

## 5. Edge Cases & Constraints

- **Hit Area:**
  - `ComboboxInput` is a void `<input>` inside clickable `ComboboxControl` (shell `mousedown` delegates focus to `<input>`)—no `<HitArea />` on `<input>`.
  - `ComboboxClear` and `ComboboxTrigger` are compact `<button>` controls below `1936px²` and MUST include `<HitArea size="sm" />`.
- **IME Composition:**
  - Ignore `Enter` / `Escape` handling while `event.isComposing` is `true` so IME candidate selection is never interrupted.
- **Popover + Top-Layer Light Dismiss:**
  - When `ComboboxContent` (`popover="auto"`) light-dismisses via outside click, `ontoggle` reconciles `open = false` and runs the blur/revert-or-commit rule.
- **Explicit Non-Goals (v1):**
  - Multi-select (`value: T[]`) with inline tag/chip tokens.
  - Virtualized rendering for 10,000+ items.
  - Built-in async debouncing or remote data fetching.
- **Browser Support:**
  - Relies on native Popover API (`:popover-open`), CSS Anchor Positioning (`position-anchor`, `anchor-name`), and `corner-shape` (gracefully degrading to `border-radius`), consistent with `Popover`, `Select`, and `TextInput`.
