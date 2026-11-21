# ContextMenu Module Blueprint

## 1. Overview & Scope

- **Kind:** `hybrid` (compound component suite + `contextMenuTrigger` attachment)
- **Purpose:** An accessible, pointer- and keyboard-triggered action menu (`role="menu"`) built on top of `Popover`, `ScrollArea`, `scrollFade`, `rovingFocus`, and `src/shared/listbox/` (`listbox.css`, `extractListboxItemLabel`). It mirrors `Dropdown`'s compound API, `xs..xl` scale, and floating surface ergonomics while decoupling triggering from left-click buttons so any region, card, table row, list item, or canvas can open a menu at pointer coordinates `(x, y)` or via `Shift+F10` / `ContextMenu`.
- **Comparison with Sibling Modules:**
  - **`Dropdown`:** Button-triggered action menu (`popoverTrigger`, left-click / `ArrowDown` / `Enter` / `Space`, anchored to the trigger button's box).
  - **`ContextMenu`:** Secondary/contextual action menu (`contextmenu` right-click / touch long-press + `Shift+F10` / `ContextMenu` key, anchored to a `0x0` virtual viewport anchor at `(x, y)`). Left-click (`button === 0`) on the trigger element remains completely unaffected.
- **Boundaries:**
  - Owns `contextmenu` / keyboard trigger interception, virtual `(x, y)` coordinate anchoring, active-trigger tracking (supporting 1:1 or N:1 triggers per `<ContextMenu>`), focus restoration, right-button drag-release gating, keyboard navigation (`rovingFocus` + typeahead + `Escape`/`Tab`), checkbox/radio item state, and custom-widget coexistence.
  - Delegates floating positioning, viewport edge flipping (`position-try-fallbacks`), and top-layer light-dismiss (`popover="auto"`) to `Popover`, overflow scrolling to `ScrollArea` / `scrollFade`, and keyboard item traversal to `rovingFocus`.
  - **Does not** ship a trigger shell (`variant` is omitted on `ContextMenu`; `ContextMenuContent` always uses the elevated floating surface matching `DropdownContent`).
  - **Out of scope (v1):** Nested submenus (`ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`) are deferred, matching `Dropdown` v1.

---

## 2. Public API

### Exports (`src/modules/context-menu/index.ts`)

**Attachment (Canonical Trigger Wiring):**
- `contextMenuTrigger(options?: ContextMenuTriggerOptions): Attachment<HTMLElement>` — Attaches to any trigger element (card, row, region, canvas, etc.) inside `<ContextMenu>`, intercepting `contextmenu` and `Shift+F10` / `ContextMenu` keydown events without interfering with left-click or normal element interaction.

**Components (flat `PascalCase`, matching `Dropdown`):**
- `ContextMenu` — Root context provider and open/anchor/focus coordinator (renderless, no DOM wrapper).
- `ContextMenuContent` — Virtual `0x0` fixed anchor sibling + floating `Popover` (`role="menu"`) containing `ScrollArea` + `scrollFade`.
- `ContextMenuHeader` — Optional non-roving header slot (e.g. target item title, metadata, search/filter widget).
- `ContextMenuFooter` — Optional non-roving footer slot (e.g. status, secondary actions).
- `ContextMenuGroup` — Semantic menu group (`role="group"`).
- `ContextMenuGroupLabel` — Accessible group heading wired via `aria-labelledby`.
- `ContextMenuItem` — Standard action item (`role="menuitem"`, supports `negative`, `href`, `closeOnSelect`).
- `ContextMenuCheckboxItem` — Toggleable item (`role="menuitemcheckbox"`, `checked = $bindable()`, `indeterminate`).
- `ContextMenuRadioGroup` — Exclusive radio state coordinator (`value = $bindable()`, `role="group"`).
- `ContextMenuRadioItem` — Radio item (`role="menuitemradio"`, `value`).
- `ContextMenuItemIcon` — Leading decorative `<svg>` icon inside any item.
- `ContextMenuItemText` — Primary item label (used for typeahead extraction and `text-trim`).
- `ContextMenuItemDescription` — Secondary muted item description.
- `ContextMenuItemShortcut` — Trailing keyboard shortcut slot (accepts plain text or `<Kbd>` / `<KbdGroup>`).
- `ContextMenuSeparator` — Visual divider (`role="separator"`).

**Constants & Types:**
- `CONTEXT_MENU_SIZES = ["xs", "sm", "md", "lg", "xl"] as const` -> `ContextMenuSize`
- `ContextMenuTriggerOptions`, `ContextMenuProps`, `ContextMenuContentProps`, `ContextMenuHeaderProps`, `ContextMenuFooterProps`, `ContextMenuGroupProps`, `ContextMenuGroupLabelProps`, `ContextMenuItemProps`, `ContextMenuCheckboxItemProps`, `ContextMenuRadioGroupProps<T>`, `ContextMenuRadioItemProps<T>`, `ContextMenuItemIconProps`, `ContextMenuItemTextProps`, `ContextMenuItemDescriptionProps`, `ContextMenuItemShortcutProps`, `ContextMenuSeparatorProps`, `ContextMenuIconComponentProps`.

### Usage Pattern

```svelte
<ContextMenu size="md">
  <div class="file-card" {@attach contextMenuTrigger()}>
    Project Plan.pdf
  </div>

  <ContextMenuContent>
    <ContextMenuItem onSelect={handleOpen}>Open</ContextMenuItem>
    <ContextMenuItem onSelect={handleRename}>Rename</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem negative onSelect={handleDelete}>Delete</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

Multiple triggers can also share a single `<ContextMenu>` (e.g. rows in a table) by attaching `{@attach contextMenuTrigger()}` to each row; whichever trigger last fired `contextmenu` / `Shift+F10` becomes the active trigger and receives `data-open` while the menu is open.

### Attachment & Component Props

#### `contextMenuTrigger(options?: ContextMenuTriggerOptions): Attachment<HTMLElement>`
- `enabled?: boolean | (() => boolean)` — `@default true`. When `false` (or when `ContextMenu` `disabled` is `true`), `contextmenu` is not intercepted and `event.preventDefault()` is **not** called, allowing the browser's native context menu to appear.
- `onOpen?: (event: MouseEvent | KeyboardEvent) => void` — Optional callback invoked when this specific trigger opens the menu (useful for selecting/identifying the right-clicked row or item when sharing one `<ContextMenu>` across multiple triggers).

#### `ContextMenu`
- `open = $bindable(false)` — Popover open state.
- `onOpenChange?: (open: boolean) => void`
- `size: ContextMenuSize` — **Required** (`"xs" | "sm" | "md" | "lg" | "xl"`, no default). Controls item height, padding, font size, radii, and icon sizing.
- `disabled?: boolean` — `@default false`. Disables trigger interception and all items.
- `id?: string` — Base ID for virtual anchor / menu ARIA wiring (falls back to `$props.id()`).
- `children?: Snippet`

#### `ContextMenuContent` (`Omit<PopoverProps, "id" | "placement" | "width" | "offset">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `id?: string`
- `placement?: PopoverPlacement` — `@default "bottom-start"` (anchors the menu's top-start corner at `(x, y)` and flips automatically via `Popover` `position-try-fallbacks` near viewport edges).
- `offset?: string` — `@default "2px"` (small offset from cursor `(x, y)` so right-clicking in place does not land directly on the first item).
- `maxHeight?: string` — `@default "min(320px, 60dvh)"` (matches `DropdownContent` and `listbox.css`).
- `scrollbar?: ScrollAreaScrollbar` — `@default "hover"`
- `animate?: boolean` — `@default true`
- `header?: Snippet` — Optional pinned header rendered above `<ScrollArea>` inside the `.cs-listbox` flex column.
- `footer?: Snippet` — Optional pinned footer rendered below `<ScrollArea>` inside the `.cs-listbox` flex column.
- `children?: Snippet`
- *(Note: `width` is fixed to `"content"` internally because `"anchor"` / `"min-anchor"` are meaningless against a `0x0` virtual point anchor.)*

#### `ContextMenuHeader`, `ContextMenuFooter`, `ContextMenuGroup`, `ContextMenuGroupLabel`, `ContextMenuSeparator`
- Mirror their `Dropdown*` counterparts 1:1, each exposing `ref = $bindable()` and forwarding `{...rest}`.

#### `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup<T>`, `ContextMenuRadioItem<T>`
- Mirror `DropdownItem`, `DropdownCheckboxItem`, `DropdownRadioGroup<T>`, and `DropdownRadioItem<T>` 1:1 (including `negative`, `href`, `icon`, `label`, `disabled`, `closeOnSelect`, `onSelect`, `checked = $bindable()`, `indeterminate`, `value = $bindable()`).

#### `ContextMenuItemIcon`, `ContextMenuItemText`, `ContextMenuItemDescription`, `ContextMenuItemShortcut`
- Mirror their `Dropdown*` counterparts 1:1.

### CSS Variables (`--cs-context-menu-*` & `--cs-listbox-*`)

`ContextMenu` imports `src/shared/listbox/listbox.css` and inherits all `xs..xl` scale tokens (`--cs-listbox-content-radius`, `--cs-listbox-content-padding`, `--cs-listbox-item-*`, `--cs-listbox-icon-size`, `--cs-listbox-group-*`).

- **Content & List (`.cs-context-menu-content.cs-listbox`, `.cs-context-menu-list.cs-listbox-list`):**
  - `--cs-context-menu-content-min-width` (`@default 180px`), `--cs-context-menu-content-max-width` (`@default 320px`)
  - `--cs-context-menu-content-max-height` (forwarded to `--cs-listbox-content-max-height`, `@default min(320px, 60dvh)`)
  - `--cs-context-menu-header-px`, `--cs-context-menu-header-py`, `--cs-context-menu-footer-px`, `--cs-context-menu-footer-py`
- **Item Slots (`.cs-context-menu-item.cs-listbox-item`):**
  - `--cs-context-menu-shortcut-fg`
  - `--cs-context-menu-item-negative-fg`, `--cs-context-menu-item-negative-bg-hover`, `--cs-context-menu-item-negative-bg-active`
  - `.cs-context-menu-item-indicator` in the `--cs-listbox-icon-size` column for checkbox/radio indicators.

---

## 3. DOM, Semantics & Accessibility

### Virtual Anchor & CSS Anchor Positioning
- `ContextMenuContent` renders a sibling `<span class="cs-context-menu-anchor" aria-hidden="true">` immediately before `<Popover>` (never inside `<Popover>`, since an element cannot anchor to its own descendant).
- The virtual anchor uses `position: fixed; width: 0; height: 0; opacity: 0; pointer-events: none;`, `anchor-name: --anchor-${resolvedId}`, and inline `left: ${anchorX}px; top: ${anchorY}px;` (clamped to `[0, window.innerWidth]` / `[0, window.innerHeight]`).
- Because `<Popover>` already binds `position-anchor: --anchor-${id}`, `position-area`, and `position-try-fallbacks`, viewport edge flipping and clamping work natively in CSS with zero JS layout measurement of the menu panel.

### Native Elements & `data-*` Selectors
- **Trigger element** (via `contextMenuTrigger`):
  - Keeps its native element and semantics untouched (no `aria-haspopup` or `aria-expanded` injected onto non-button regions/rows/cards, avoiding invalid ARIA on generic containers).
  - Receives `data-open` only while it is the active trigger for the currently open menu, allowing consumers to style the active target card/row.
- **`ContextMenuContent`**:
  - `<Popover role="menu" id={resolvedId} aria-label={...} data-size={size} data-arrow-nav? data-nav="keyboard"?>`
  - Accessible name: uses consumer-provided `aria-label` or `aria-labelledby` if passed in `{...rest}`; otherwise defaults to a localized `aria-label` via `t({ de: "Kontextmenü", en: "Context menu" })` (never `aria-labelledby={triggerId}`, because a region/card trigger's text is not a menu label).
  - Flex column layout inside `.cs-listbox` (`header` -> `<ScrollArea><ScrollAreaContent class="cs-context-menu-list cs-listbox-list" tabindex={-1}>` -> `footer`) matching `DropdownContent`.
- **Items, Groups, Separators:**
  - `role="menuitem"`, `role="menuitemcheckbox"`, `role="menuitemradio"`, `role="group"`, `role="separator"`, `aria-checked`, `aria-disabled`, `data-disabled`, `data-checked`, `data-negative` — identical to `Dropdown`.

### Triggering, Focus Management & Keyboard Navigation
- **Pointer Trigger (`contextmenu` event):**
  - Calls `event.preventDefault()` (unless `event.defaultPrevented` or disabled), records `(event.clientX, event.clientY)` as the virtual anchor position, marks `openOrigin = "pointer"`, and opens the menu.
  - Left-click (`button === 0`) is never intercepted or prevented.
  - Right-clicking inside an already-open `ContextMenuContent` calls `event.preventDefault()` on `contextmenu` so the browser's native context menu does not appear over the custom menu.
- **Keyboard Trigger (`Shift+F10` and `ContextMenu` key):**
  - Intercepted on `keydown` (`(event.shiftKey && event.key === "F10") || event.key === "ContextMenu"`) when focus is on or inside the trigger element.
  - Calls `event.preventDefault()`, computes `(x, y)` from the focused element's (or trigger's) `getBoundingClientRect()` center, marks `openOrigin = "keyboard"`, and opens the menu.
- **Focus on Open & Restoration on Close:**
  - Captures `restoreFocusTarget` (`document.activeElement` if `HTMLElement`, falling back to `activeTriggerRef` if focusable) before opening.
  - On open, when `openOrigin === "keyboard"` (`Shift+F10` / `ContextMenu` key), `isKeyboardNav` / `isArrowNav` start `true` and `rovingFocus` focuses the first enabled `.cs-context-menu-item` (or `listRef` as fallback if no items exist). When `openOrigin === "pointer"` (`contextmenu`), focus is placed on `listRef` (`preventScroll: true`) and `isKeyboardNav` / `isArrowNav` start `false` so item 0 is not pre-highlighted on right-click.
  - On close (`Escape`, `Tab`, or `closeOnSelect`), focus is restored to `restoreFocusTarget` with `{ preventScroll: true }` (when still connected to the DOM).
- **Inside `ContextMenuContent` (`rovingFocus` & Custom Widgets):**
  - Identical to `DropdownContent`: `rovingFocus` (`orientation: "vertical"`, `loop: true`, `homeEnd: true`, `typeahead: true`, `items: ".cs-context-menu-item:not([data-disabled])"`), `guardCustomWidgetKeys` so inputs/switches/sliders inside the menu keep their keys, `Tab` synchronous close + focus restore when on a menu item, and `pointermove` focus reset to `listRef`.

---

## 4. Visual & Motion Contract

- **Floating Surface Parity:**
  - `ContextMenuContent` shares `listbox.css` with `DropdownContent` (`--cs-color-elevated`, `--cs-shadow-floating`, `--cs-squircle-soft`, concentric radii across `xs..xl`, `Popover` directional spring + blur entrance/exit).
- **Item States & Scale (`xs..xl`):**
  - Exact 1:1 visual parity with `DropdownItem`, `DropdownCheckboxItem`, `DropdownRadioItem`, `DropdownGroup`, `DropdownGroupLabel`, `DropdownSeparator`, `DropdownHeader`, and `DropdownFooter` across `xs..xl`.
  - `data-negative` uses `--cs-color-negative-soft-fg` and `--cs-color-negative-soft` hover/active fills.
  - `data-nav="keyboard"` suppresses `:hover` fighting keyboard focus.

---

## 5. Edge Cases & Constraints

- **OS Event Timing (`contextmenu` vs `pointerup`) & Right-Button Drag-Release:**
  - On macOS and Linux, `contextmenu` fires on right-button `mousedown`/`pointerdown` (`button === 2`); on Windows, `contextmenu` fires on `mouseup`/`pointerup` (`button === 2`).
  - Because the menu is already open while the right mouse button is still held down on macOS/Linux, a plain right-click-and-release (`pointerup` with `button === 2`) MUST NOT accidentally trigger the item under the cursor.
  - `ContextMenu` therefore gates `button === 2` drag-release strictly on **pointer travel distance** (`distance >= 4px` from the opening `(x, y)` AND target inside a `.cs-context-menu-item`, without an elapsed-time shortcut), paired with `offset = "2px"` so the cursor starts outside the panel's bounds. Left-click (`click` / `button === 0`) always activates items normally.
- **Re-Right-Clicking While Already Open:**
  - Right-clicking outside the open menu triggers `popover="auto"` light-dismiss on `pointerdown`, followed by `contextmenu` on the target trigger, which updates `(anchorX, anchorY)` and `activeTriggerRef` and re-opens the menu at the new coordinates.
  - If `contextmenu` fires while the popover is still open (e.g. `Shift+F10` or same-turn event), updating `(anchorX, anchorY)` repositions the virtual anchor immediately.
- **Touch Long-Press:**
  - Relies on native browser `contextmenu` synthesis (supported in Chromium on Android). Consumers building touch-heavy surfaces can add `user-select: none; -webkit-touch-callout: none;` to suppress OS text-selection callouts on long-press.
- **Browser Support:**
  - Relies on native Popover API (`:popover-open`, `popover="auto"`), CSS Anchor Positioning (`position-anchor`, `anchor-name`, `position-area`, `position-try-fallbacks`), and `corner-shape` (gracefully degrading to `border-radius`).
