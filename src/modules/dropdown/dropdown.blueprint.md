# Dropdown Module Blueprint

## 1. Overview & Scope

- **Kind:** `hybrid` (compound component suite + `dropdownTrigger` attachment)
- **Purpose:** An accessible, composable action and command menu (`role="menu"`) built on top of `Popover`, `ScrollArea`, `scrollFade`, `rovingFocus`, and `src/shared/listbox/` (`listbox.css`, `extractListboxItemLabel`), sharing floating panel & item ergonomics with `Select` and `Combobox` while decoupling the trigger so any interactive element (`Button`, icon button, avatar, custom button) can anchor and open the menu.
- **Comparison with Sibling Modules:**
  - **`Select`:** Form-oriented single-value picker (`<button>` trigger + `role="listbox"`, `aria-selected`, hidden `<input name>`).
  - **`Combobox`:** Filterable autocomplete (`<input role="combobox">` + `role="listbox"`, `inputValue`, filtering).
  - **`Dropdown`:** Action/command menu (`role="menu"`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, shortcuts, destructive actions, custom header/footer/widget content, optional submenus). **No** `<input>`, **no** form `value` / `name` / `invalid` / `required`.
- **Boundaries:**
  - Owns menu open/close coordination (`open`), press-drag-release pointer selection, keyboard navigation (`rovingFocus` + typeahead + `Escape`/`Tab`), checkbox/radio item state, and custom-widget coexistence.
  - Delegates floating positioning, CSS Anchor Positioning, and top-layer light-dismiss (`popover="auto"`) to `Popover`, overflow scrolling to `ScrollArea` / `scrollFade`, and keyboard item traversal to `rovingFocus`.
  - **Does not** ship a form-field trigger shell (hence `variant` is omitted on `Dropdown`; the consumer supplies the trigger element, and `DropdownContent` always uses the elevated floating surface matching `SelectContent` and `ComboboxContent`).

---

## 2. Public API

### Exports (`src/modules/dropdown/index.ts`)

**Attachment (Canonical Trigger Wiring):**
- `dropdownTrigger(options?: DropdownTriggerOptions): Attachment<HTMLElement>` — Attaches directly to any interactive trigger element (`<Button>`, `<button>`, avatar button, etc.) inside `<Dropdown>`, wiring `popoverTrigger`, CSS `anchor-name`, ARIA (`aria-haspopup="menu"`, `aria-expanded`, `aria-controls`), keyboard open (`ArrowDown` / `ArrowUp` / `Enter` / `Space`), and press-drag-release tracking.

**Components (flat `PascalCase`, matching `Select` & `Combobox`):**
- `Dropdown` — Root context provider and open/focus coordinator (renderless, no DOM wrapper).
- `DropdownContent` — Floating `Popover` (`role="menu"`) containing `ScrollArea` + `scrollFade`.
- `DropdownHeader` — Optional non-roving header slot (e.g. user profile card, section title, search/filter widget).
- `DropdownFooter` — Optional non-roving footer slot (e.g. sign-out bar, status, secondary actions).
- `DropdownGroup` — Semantic menu group (`role="group"`).
- `DropdownGroupLabel` — Accessible group heading wired via `aria-labelledby`.
- `DropdownItem` — Standard action item (`role="menuitem"`, supports `negative`, `href`, `closeOnSelect`).
- `DropdownCheckboxItem` — Toggleable item (`role="menuitemcheckbox"`, `checked = $bindable()`, `indeterminate`).
- `DropdownRadioGroup` — Exclusive radio state coordinator (`value = $bindable()`, `role="group"`).
- `DropdownRadioItem` — Radio item (`role="menuitemradio"`, `value`).
- `DropdownItemIcon` — Leading decorative `<svg>` icon inside any item.
- `DropdownItemText` — Primary item label (used for typeahead extraction and `text-trim`).
- `DropdownItemDescription` — Secondary muted item description.
- `DropdownItemShortcut` — Trailing keyboard shortcut slot (accepts plain text or `<Kbd>` / `<KbdGroup>`).
- `DropdownSeparator` — Visual divider (`role="separator"`).

**Phase 2 / v1.1 Submenu Components (contract reserved, deferred from v1):**
- `DropdownSub`, `DropdownSubTrigger`, `DropdownSubContent` — Nested `popover="auto"` submenu stack (see Section 5).

**Constants & Types:**
- `DROPDOWN_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `DropdownSize`
- `DropdownTriggerOptions`, `DropdownProps`, `DropdownContentProps`, `DropdownHeaderProps`, `DropdownFooterProps`, `DropdownGroupProps`, `DropdownGroupLabelProps`, `DropdownItemProps`, `DropdownCheckboxItemProps`, `DropdownRadioGroupProps<T>`, `DropdownRadioItemProps<T>`, `DropdownItemIconProps`, `DropdownItemTextProps`, `DropdownItemDescriptionProps`, `DropdownItemShortcutProps`, `DropdownSeparatorProps`, `DropdownIconComponentProps`.

### Trigger Design Decision: `dropdownTrigger` Attachment (No Wrapper `<DropdownTrigger>`)

Unlike `SelectTrigger` (which *is* a styled form-field `<button>`), `Dropdown` is triggered by arbitrary consumer components—most commonly `<Button>`, icon-only `<Button iconOnly>`, or custom avatar/row-action buttons.
- **Why not a `<button>`-rendering `DropdownTrigger`?** Wrapping `<Button>` inside `<DropdownTrigger>` would produce invalid nested `<button><button></button></button>` DOM.
- **Why not a `display: contents` wrapper?** `display: contents` has no layout box for CSS Anchor Positioning (`anchor-name`) and places `aria-expanded` on a non-interactive `<div>` instead of the `<button>`.
- **Why `{@attach dropdownTrigger()}`?** Matches `Popover` (`popoverTrigger`) natively in Svelte 5: `{@attach ...}` forwards cleanly through `{...rest}` on `<Button>` and native `<button>`, adds zero wrapper nodes, binds `anchor-name` and ARIA attributes directly to the interactive element, and avoids `asChild` snippet-prop boilerplate:

```svelte
<Dropdown size="md">
  <Button variant="secondary" size="md" {@attach dropdownTrigger()}>
    <ButtonLabel>Actions</ButtonLabel>
  </Button>

  <DropdownContent>
    <DropdownItem onSelect={handleEdit}>Edit</DropdownItem>
    <DropdownItem negative onSelect={handleDelete}>Delete</DropdownItem>
  </DropdownContent>
</Dropdown>
```

### Attachment & Component Props

#### `dropdownTrigger(options?: DropdownTriggerOptions): Attachment<HTMLElement>`
- `triggerOn?: "pointerdown" | "click"` — `@default "pointerdown"` (opens immediately on desktop mouse-down with press-drag-release support; touch/keyboard activate on `click`. Use `"click"` when opening on release is preferred).
- `enabled?: boolean | (() => boolean)` — `@default true`.

#### `Dropdown`
- `open = $bindable(false)` — Popover open state.
- `onOpenChange?: (open: boolean) => void`
- `size: DropdownSize` — **Required** (`"xs" | "sm" | "md" | "lg" | "xl"`, no default). Controls item height, padding, font size, radii, and icon sizing.
- `disabled?: boolean` — `@default false`. Disables trigger opening and all items.
- `id?: string` — Base ID for trigger/menu ARIA wiring (falls back to `$props.id()`).
- `children?: Snippet`

#### `DropdownContent` (`Omit<PopoverProps, "id" | "placement" | "width" | "offset">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `id?: string`
- `placement?: PopoverPlacement` — `@default "bottom-start"`
- `width?: PopoverWidth` — `@default "content"` (unlike `Select`'s `"min-anchor"`, action menus typically size to their own content unless `"min-anchor"` or `"anchor"` is explicitly requested).
- `offset?: string` — `@default "8px"`
- `maxHeight?: string` — `@default "min(320px, 60dvh)"` (matches `ComboboxContent` and `listbox.css`)
- `scrollbar?: ScrollAreaScrollbar` — `@default "hover"`
- `animate?: boolean` — `@default true`
- `header?: Snippet` — Optional pinned header rendered above `<ScrollArea>` inside the `.cs-listbox` flex column (typically wrapping `<DropdownHeader>`).
- `footer?: Snippet` — Optional pinned footer rendered below `<ScrollArea>` inside the `.cs-listbox` flex column (typically wrapping `<DropdownFooter>`).
- `children?: Snippet`

#### `DropdownHeader` & `DropdownFooter` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `children?: Snippet`
- **Pinned vs. Scrollable Placement:** Pass inside `DropdownContent`'s `header` / `footer` snippets (`{#snippet header()}<DropdownHeader>...</DropdownHeader>{/snippet}`) to keep them pinned outside `<ScrollArea>` (`.cs-listbox` is `display: flex; flex-direction: column; overflow: hidden;` with `> .cs-scroll-area { flex: 1 1 auto; min-height: 0; }`). Placing `<DropdownHeader>` / `<DropdownFooter>` inside `children` instead renders them as non-roving blocks that scroll with the list.

#### `DropdownGroup`, `DropdownGroupLabel`, `DropdownSeparator`
- Mirror `SelectGroup`, `SelectGroupLabel`, `SelectSeparator` 1:1, each exposing `ref = $bindable()`.

#### `DropdownItem` (`Omit<HTMLAttributes<HTMLDivElement>, "children"> & Omit<HTMLAnchorAttributes, "children">`)
- `ref = $bindable<HTMLElement | null>(null)` — `<div>` by default, or `<a>` when `href` is provided.
- `href?: string` — Renders an `<a>` element with `role="menuitem"` for navigation items.
- `icon?: Component<DropdownIconComponentProps>`
- `label?: string` — Explicit typeahead label override (falls back to `DropdownItemText` / `textContent`).
- `negative?: boolean` — `@default false`. Marks the item as a destructive/negative action (`data-negative`), matching `Button`'s `negative` flag rather than a separate `intent` enum (superseding the `intent="negative"` draft in `dropdown.design.md`).
- `disabled?: boolean` — `@default false`.
- `closeOnSelect?: boolean` — `@default true`. Closes the menu after `onSelect` unless `false` or `event.preventDefault()` is called.
- `onSelect?: (event: MouseEvent | KeyboardEvent) => void`
- `children?: Snippet`

#### `DropdownCheckboxItem` (`Omit<HTMLAttributes<HTMLDivElement>, "children">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `checked = $bindable(false)`
- `onCheckedChange?: (checked: boolean) => void`
- `indeterminate?: boolean` — `@default false` (sets `aria-checked="mixed"`).
- `icon?: Component<DropdownIconComponentProps>`
- `label?: string`
- `disabled?: boolean` — `@default false`.
- `closeOnSelect?: boolean` — `@default false` (standard menu UX keeps the menu open when toggling checkboxes).
- `onSelect?: (event: MouseEvent | KeyboardEvent) => void`
- `children?: Snippet`

#### `DropdownRadioGroup<T extends string = string>` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `value = $bindable<T | undefined>()`
- `onValueChange?: (value: T) => void`
- `children?: Snippet`

#### `DropdownRadioItem<T extends string = string>` (`Omit<HTMLAttributes<HTMLDivElement>, "children">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `value: T`
- `icon?: Component<DropdownIconComponentProps>`
- `label?: string`
- `disabled?: boolean` — `@default false`.
- `closeOnSelect?: boolean` — `@default false`.
- `onSelect?: (event: MouseEvent | KeyboardEvent) => void`
- `children?: Snippet`

#### `DropdownItemIcon`, `DropdownItemText`, `DropdownItemDescription`, `DropdownItemShortcut`
- `DropdownItemIcon`, `DropdownItemText`, `DropdownItemDescription`: Mirror `SelectItemIcon`, `SelectItemText`, `SelectItemDescription` 1:1.
- `DropdownItemShortcut`: `<span class="cs-dropdown-item-shortcut" aria-hidden="true">` with `ref = $bindable<HTMLSpanElement | null>(null)`.

### CSS Variables (`--cs-dropdown-*` & `--cs-listbox-*`)

`Dropdown` imports `src/shared/listbox/listbox.css` (`.cs-listbox`, `.cs-listbox-list`, `.cs-listbox-item`, `.cs-listbox-group`, `.cs-listbox-group-label`, `.cs-listbox-separator`) and inherits the `xs..xl` scale tokens (`--cs-listbox-content-radius`, `--cs-listbox-content-padding`, `--cs-listbox-item-*`, `--cs-listbox-icon-size`, `--cs-listbox-group-*`).

- **Content & List (`.cs-dropdown-content.cs-listbox`, `.cs-dropdown-list.cs-listbox-list`):**
  - `--cs-dropdown-content-min-width` (`@default 180px`), `--cs-dropdown-content-max-width` (`@default 320px`, overriding `--cs-listbox-content-max-width`)
  - `--cs-dropdown-content-max-height` (forwarded to `--cs-listbox-content-max-height`, `@default min(320px, 60dvh)`)
  - `--cs-dropdown-header-px`, `--cs-dropdown-header-py`, `--cs-dropdown-footer-px`, `--cs-dropdown-footer-py`
- **Dropdown-Specific Item Slots (`.cs-dropdown-item.cs-listbox-item`):**
  - `--cs-dropdown-shortcut-fg`
  - `--cs-dropdown-item-negative-fg`, `--cs-dropdown-item-negative-bg-hover`, `--cs-dropdown-item-negative-bg-active`
  - Leading indicator slot (`.cs-dropdown-item-indicator`) for `DropdownCheckboxItem` & `DropdownRadioItem` in the `--cs-listbox-icon-size` column (does not use `.cs-listbox-item-check`, so standard `DropdownItem`s reserve no empty checkmark gutter).

---

## 3. DOM, Semantics & Accessibility

### Native Elements & `data-*` Selectors
- **Trigger element** (via `dropdownTrigger`):
  - Keeps its native element (`<button>`, `<Button>`, etc.).
  - Receives `id={triggerId}`, `popovertarget={menuId}`, `aria-haspopup="menu"`, `aria-expanded={open ? "true" : "false"}`, `aria-controls={menuId}`, `data-open={open ? "" : undefined}`.
- **`DropdownContent`**:
  - `<Popover role="menu" id={resolvedId} aria-labelledby={triggerId} data-size={size} data-arrow-nav? data-nav="keyboard"?>`
  - Layout inside `.cs-listbox` (`display: flex; flex-direction: column; overflow: hidden;`):
    1. `{@render header?.()}` (`flex-shrink: 0`, pinned above scroll viewport)
    2. `<ScrollArea><ScrollAreaContent class="cs-dropdown-list cs-listbox-list" tabindex={-1}>{@render children?.()}</ScrollAreaContent></ScrollArea>` (`flex: 1 1 auto; min-height: 0`)
    3. `{@render footer?.()}` (`flex-shrink: 0`, pinned below scroll viewport)
- **`DropdownItem` / `DropdownCheckboxItem` / `DropdownRadioItem`**:
  - `<div|a class="cs-dropdown-item" role="menuitem" | "menuitemcheckbox" | "menuitemradio" tabindex={-1}>`
  - `aria-checked`: `"true" | "false" | "mixed"` (on checkbox/radio items only).
  - `aria-disabled={isDisabled ? "true" : undefined}`
  - `data-disabled={isDisabled ? "" : undefined}`
  - `data-checked={isChecked ? "" : undefined}`
  - `data-negative={negative ? "" : undefined}`
- **`DropdownGroup` / `DropdownGroupLabel` / `DropdownSeparator`**:
  - `role="group"` with `aria-labelledby={labelId}`, and `role="separator"` with `aria-orientation="horizontal"`.

### Keyboard, `rovingFocus` & Custom Content Coexistence
- **Opening from Trigger:**
  - `ArrowDown`, `Enter`, `Space` (when `triggerOn` handles keyboard): opens menu and focuses the **first** enabled `.cs-dropdown-item`.
  - `ArrowUp`: opens menu and focuses the **last** enabled `.cs-dropdown-item`.
- **Inside `DropdownContent` (`rovingFocus`):**
  - `rovingFocus` attaches to `.cs-dropdown-list` with `orientation: "vertical"`, `loop: true` (standard WAI-ARIA menu wrapping, or configurable), `homeEnd: true`, `typeahead: true`, `items: ".cs-dropdown-item:not([data-disabled])"`.
  - **Static custom content** (`DropdownHeader`, `DropdownFooter`, user profile cards) does not carry `.cs-dropdown-item`, so `rovingFocus` skips it automatically.
  - **Interactive custom widgets** (e.g. a `<Switch>`, `<TextInput>`, or mini-form inside `DropdownContent`):
    - `DropdownContent`'s `keydown` handler MUST bail out early when `event.target` is inside an editable or non-menuitem interactive widget (`input`, `textarea`, `select`, `[contenteditable]`, or focusable controls outside `.cs-dropdown-item`) so typing, `Space`, `ArrowUp`/`ArrowDown`, and `Home`/`End` inside the widget are never hijacked by menu navigation or typeahead.
    - Clicking or interacting with custom widgets inside `DropdownContent` does **not** trigger light-dismiss because native `popover="auto"` only dismisses on clicks *outside* the top-layer popover.
- **Activation & Closing:**
  - `Enter` / `Space` on a `.cs-dropdown-item`: triggers selection (`onSelect`, toggles checkbox or selects radio); closes menu and restores focus to `triggerRef` if `closeOnSelect` is `true` and `event.defaultPrevented` is `false`.
  - `Escape`: closes `Popover`, restores focus to `triggerRef`.
  - `Tab` / `Shift+Tab`:
    - If focus is on a `.cs-dropdown-item` (standard menu): closes menu synchronously and restores focus to `triggerRef` before browser Tab traversal leaves (matching `SelectContent`).
    - If custom focusable widgets exist inside `DropdownContent`, `Tab` moves naturally through those widgets and only closes when focus leaves `DropdownContent` (`focusout` to outside).

---

## 4. Visual & Motion Contract

- **Floating Surface Parity (`SelectContent` / `ComboboxContent`):**
  - `DropdownContent` uses `--cs-color-elevated`, `--cs-shadow-floating`, `--cs-squircle-soft`, concentric panel & item radii across `xs..xl`, and `Popover` directional spring + blur entrance/exit (`animate = true`).
  - `DropdownHeader` and `DropdownFooter` use subtle bottom/top hairline borders (`--cs-dropdown-separator-bg`) when needed, or clean spacing matching menu padding.
- **Item States & Scale (`xs..xl`):**
  - Heights, horizontal/vertical padding, font sizes, icon sizes, and gaps match `SelectItem` / `ComboboxItem` 1:1 across `xs..xl`.
  - Hover / `[data-arrow-nav]` `:focus-visible`: `--cs-color-base-soft` (`--cs-dropdown-item-bg-hover`).
  - Active press: `--cs-dropdown-item-bg-active` + subtle `scale` press feedback (`--cs-dur-press`, `--cs-ease-press`).
  - `data-negative`: `--cs-color-negative-fg` text & icon, with `--cs-color-negative-soft` hover/active fills (matching `Button` negative semantics).
  - Keyboard-vs-pointer nav: `data-nav="keyboard"` suppresses `:hover` fighting keyboard focus, and `pointermove` resets focus to the `.cs-dropdown-list` viewport so `:focus-visible` never flashes (matching `SelectContent`).

---

## 5. Edge Cases & Constraints

- **Shared Basis with `Select`, `Combobox` & `src/shared/listbox/`:**
  - **CSS (`src/shared/listbox/listbox.css`):** `DropdownContent`, `DropdownGroup`, `DropdownGroupLabel`, `DropdownSeparator`, and all item components compose `.cs-listbox*` classes alongside `.cs-dropdown-*` classes (matching `Combobox`), inheriting `xs..xl` concentric radii, padding, typography, hover/press/disabled states, and `[data-nav="keyboard"]` / `[data-arrow-nav]` focus rules.
  - **Label Extraction (`src/shared/listbox/listbox-utils.ts`):** `DropdownItem`, `DropdownCheckboxItem`, and `DropdownRadioItem` use `extractListboxItemLabel(label, textEl, contentEl, descriptionEl, "")` to compute `data-typeahead-label` for `rovingFocus`.
  - **No `createListboxRegistry` Needed:** Unlike `Select` and `Combobox` (which map `value: T` to item metadata and filter visibility via `createListboxRegistry` + `sortListboxItemsByDomOrder`), `Dropdown` action items carry no `value`, and DOM-order traversal/typeahead is handled directly by `rovingFocus`. `DropdownRadioGroup` only tracks its own `value` binding without a global registry.
  - **Drag-to-Select (`src/shared/listbox/pointer-drag-release.ts`):** Uses `createPointerDragRelease(() => triggerRef)` directly (`beginPointerOpen`, `shouldCommitPointerRelease`, `clearPointerOpen`), matching `Select` and `Combobox`.
- **Press-Drag-Release (`triggerOn: "pointerdown"`):**
  - Holding mouse-down on the trigger, dragging onto a `DropdownItem`, and releasing (`pointerup`) commits that item—matching native OS menus and `Select`. Touch contacts fall back to `click` to preserve scrolling.
- **Popover + Top-Layer Light Dismiss:**
  - `ontoggle` on `DropdownContent` reconciles `open = false` whenever native `popover="auto"` light-dismisses on outside click or `Escape`.
- **Phase 2 / v1.1 Scope (Submenus):**
  - `DropdownSub`, `DropdownSubTrigger`, `DropdownSubContent` are deferred from v1 to keep initial delivery focused. Native `popover="auto"` supports nested popovers out of the box (opening a child popover inside `DropdownContent` keeps the parent open, and outside click dismisses the entire stack), so v1's DOM and `Popover` architecture requires no breaking changes when submenus are added.
- **Browser Support:**
  - Relies on native Popover API (`:popover-open`), CSS Anchor Positioning (`position-anchor`, `anchor-name`), and `corner-shape` (gracefully degrading to `border-radius`).
