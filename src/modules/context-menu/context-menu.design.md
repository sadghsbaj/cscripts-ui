# ContextMenu Design Spec (`src/modules/context-menu/`)

## 1. Visual Direction & Parity with `Dropdown`

`ContextMenu` shares the exact floating surface language, `xs`–`xl` size scale, and item anatomy of [`Dropdown`](../dropdown/dropdown.design.md) by composing [`src/shared/listbox/listbox.css`](../../shared/listbox/listbox.css) and wrapping [`Popover`](../popover/Popover.svelte):

- **Calm monochrome floating surface:** `--cs-listbox-content-bg` (`--cs-color-elevated`), `--cs-listbox-content-shadow` (`--cs-shadow-floating`), borderless depth, and `--cs-squircle-soft` (`corner-shape`) geometry.
- **Concentric panel-to-item radii:** Item corner radius derives from `--cs-listbox-item-radius: max(var(--cs-radius-lg), calc(var(--cs-listbox-content-radius) - var(--cs-listbox-content-padding)))`, matching `Dropdown`, `Select`, and `Combobox` pixel-for-pixel.
- **Compound parity (no nested submenus in v1):** Exposes `ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuItemText`, `ContextMenuItemDescription`, `ContextMenuItemShortcut`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuGroup`, `ContextMenuGroupLabel`, `ContextMenuSeparator`, `ContextMenuHeader`, and `ContextMenuFooter` (plus `{@attach contextMenuTrigger()}` / `ContextMenuTrigger`). Nested submenus are intentionally omitted in v1.

---

## 2. Cursor-Anchored Positioning & Viewport Behavior

Unlike `Dropdown` (which anchors to a visible button with `offset="8px"`), `ContextMenu` anchors to a **virtual `0px × 0px` cursor point** so the panel blooms directly from the user's pointer without custom JavaScript viewport math:

### Virtual Anchor (`.cs-context-menu-anchor`)
- Rendered as a non-interactive `0px × 0px` fixed element (`position: fixed; inset: auto; width: 0; height: 0; margin: 0; padding: 0; pointer-events: none;`) carrying `anchor-name: --anchor-${id}` (consumed by `Popover`'s `--cs-popover-anchor`).
- **Pointer open (`contextmenu`):** Positioned at `(clientX, clientY)`, clamped inside `[4px, innerWidth - 4px]` × `[4px, innerHeight - 4px]` so the anchor never sits outside the viewport on synthetic or edge clicks.
- **Keyboard open (`Shift+F10` or `ContextMenu` key):** Positioned at the optical center `(rect.left + rect.width / 2, rect.top + rect.height / 2)` of the focused element inside the trigger region (or the trigger region itself if it holds focus), clamped to the same `4px` viewport inset.

### Offset, Placement & `transform-origin`
- **`placement="bottom-start"`:** Maps to `Popover`'s `position-area: block-end span-inline-end` and `--cs-popover-origin: top left` (the exact corner closest to the cursor tip).
- **`offset="2px"` (`--cs-context-menu-offset: 2px`):**
  - `Dropdown` uses `8px` to clear a button's shadow and border; `ContextMenu` has no trigger chrome to clear, so `8px` feels detached from the pointer.
  - `0px` crowds the rounded squircle corner directly under the cursor hotspot and risks accidental item hover on a `1px` pointer jitter.
  - `2px` (`margin-block-start: 2px`) gives a crisp hairline separation from the cursor tip while staying visually locked to the click point.
- **Viewport-edge flip & safety margin:** Inherited directly from `Popover` (`position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline`) and `listbox.css` (`max-inline-size: min(var(--cs-listbox-content-max-width), calc(100vw - 32px))`, `max-block-size: min(var(--cs-listbox-content-max-height), calc(100dvh - 32px))`), preserving a `16px` margin from every viewport edge.

---

## 3. Motion Choreography from Cursor Origin

Right-clicking is a **high-frequency, surgical** interaction. Using `Popover`'s default `Dropdown` timings (`380ms` enter, `8px` travel) feels floaty when anchored to a cursor tip. `ContextMenu` keeps `Popover`'s `[data-animate]` `@starting-style` architecture and tunes its `--cs-popover-anim-*` tokens locally on `.cs-context-menu-content`:

| Token | `Dropdown` (`Popover` Default) | `ContextMenu` Override | Rationale |
| :--- | :--- | :--- | :--- |
| `--cs-popover-anim-distance` | `8px` | `4px` | Keeps the top-left corner tight to the cursor tip while preserving a subtle downward bloom. |
| `--cs-popover-anim-scale-start` | `0.9` | `0.92` | Tighter scale delta blooms cleanly from `--cs-popover-origin: top left` without feeling bouncy. |
| `--cs-popover-anim-scale-exit` | `0.95` | `0.96` | Minimal shrink on fast dismissal. |
| `--cs-popover-anim-blur-start` | `3.5px` | `2.5px` | Lighter initial blur so menu labels are readable almost immediately. |
| `--cs-popover-anim-blur-exit` | `2px` | `1.5px` | Crisp, non-smearing fade-out. |
| `--cs-popover-anim-dur-in` | `var(--cs-dur-enter-md)` (`380ms`) | `var(--cs-dur-enter-sm)` (`260ms`) | Snappier spring (`--cs-spring-snappy`) suited to cursor-triggered menus. |
| `--cs-popover-anim-dur-out` | `var(--cs-dur-exit-md)` (`120ms`) | `var(--cs-dur-exit-sm)` (`100ms`) | Near-instant dismissal (`--cs-ease-quad-in`) when clicking away. |

### Re-Right-Clicking While Already Open (Instant Reposition)
- Right-clicking a new location while `ContextMenu` is already `:popover-open` must **not** play a `100ms` exit followed by a `260ms` entrance.
- Instead, update the virtual anchor's `(clientX, clientY)` coordinates and apply `Popover`'s built-in `[data-instant]` attribute (`transition: none !important`) for the reposition cycle so the panel snaps cleanly to the new cursor tip with zero exit/enter flicker.

---

## 4. Trigger Region Ergonomics

- **Open state hook (`data-open`):** The trigger region receives `data-open={open ? "" : undefined}` (canonical boolean state per naming rules, matching `Dropdown`) so consumers can style an active target surface (e.g. a selected canvas card or file row) when its context menu is open.
- **Zero unintended trigger chrome:** `ContextMenu` attaches no default `:hover`, `:focus-visible`, `cursor: pointer`, or outline styles to the trigger region. Trigger regions are arbitrary layouts (canvases, cards, table rows, text blocks) that must remain visually untouched at rest.
- **No false highlight on pointer open:**
  1. `offset="2px"` keeps the first `.cs-context-menu-item` spatially below the cursor hotspot at rest.
  2. Opening via `contextmenu` focuses `listRef` (`preventScroll: true`) and leaves `data-nav="keyboard"` and `data-roving-active` unset—item 0 is **never** pre-highlighted on right-click. Only keyboard open (`Shift+F10` / `ContextMenu` key) or subsequent `ArrowDown` / `ArrowUp` / `Home` / `End` activates `data-nav="keyboard"` and highlights the target item.
  3. Mouse `pointermove` (`pointerType === "mouse"`) clears `data-nav="keyboard"` / `data-arrow-nav` and returns focus to `listRef` (`preventScroll: true`), preventing stationary-cursor hover fights and `:focus-visible` flashes.

---

## 5. Size Scale, Panel Bounds & Item Anatomy (`xs` – `xl`)

`size` (`xs`–`xl`) is a **required prop** on `ContextMenu` (no default, consistent with `Dropdown`, `Select`, `Combobox`, and `Button`), propagated via context to `data-size` on `.cs-context-menu-content.cs-listbox`:

- **Size tokens:** Inherited 1:1 from `src/shared/listbox/listbox.css` (`14px`–`20px` panel radius, `4px`–`6px` panel padding, `28px`–`42px` item min-height, `14px`–`18px` icon/indicator size).
- **Panel width & bounds:**
  - Defaults to `width="content"` and `maxHeight="min(320px, 60dvh)"`.
  - `min-inline-size: var(--cs-context-menu-content-min-width, 180px)`.
  - `--cs-listbox-content-max-width: var(--cs-context-menu-content-max-width, 320px)` (matching `Dropdown` so trailing shortcuts stay visually connected to their labels).
- **Standard action item (`ContextMenuItem`):** `role="menuitem"`, omits `.cs-listbox-item-check` so `listbox.css` collapses the trailing checkmark gutter automatically. Supports optional leading icon (`.cs-listbox-item-icon`, `stroke-width: 2.25`, optical `-2px` start inset), `ContextMenuItemText`, `ContextMenuItemDescription`, and trailing `ContextMenuItemShortcut` or `<Kbd variant="ghost" size="xs" />` (`size="sm"` at `xl`).
- **Check & radio items (`ContextMenuCheckboxItem` / `ContextMenuRadioItem`):** Use a **leading** `.cs-context-menu-item-indicator.cs-listbox-item-indicator` (`--cs-listbox-icon-size`, `padding-inline-start: calc(var(--cs-listbox-item-px) - 2px)`) so labels align vertically with icon items and the trailing slot stays free for shortcuts. Radio dots size to `round(nearest, calc(var(--cs-listbox-icon-size) * 0.4), 1px)` and reveal with `--cs-dur-effect` `--cs-spring-snappy`.
- **Destructive actions (`negative`):** `ContextMenuItem` exposes `negative?: boolean` (`data-negative`), calm monochrome at rest (`--cs-color-text-strong`), transitioning to `--cs-color-negative-soft` / `--cs-color-negative-soft-fg` on hover/roving-active/`:focus-visible`, `--cs-color-negative-soft-hover` + `scale: 0.97` on `:active`, and colorless `--cs-color-disabled-fg` when `[data-disabled]`.
- **Pinned `ContextMenuHeader` & `ContextMenuFooter` + `.cs-context-menu-row`:**
  - Header and footer render outside `<ScrollArea>` with `flex-shrink: 0`, `padding-inline: calc(var(--cs-listbox-content-padding) + var(--cs-listbox-item-px))`, `padding-block: 8px`, and a `1px` `--cs-listbox-separator-bg` hairline on the edge facing `<ScrollArea>`.
  - `.cs-context-menu-row` provides a transparent, non-scaling row container for inline widgets (e.g. `Switch`, `ToggleGroup`).

---

## 6. Parity Matrix: `listbox.css` vs. `context-menu.css`

| Layer / Token | Source | Notes |
| :--- | :--- | :--- |
| `.cs-listbox`, `.cs-listbox-list`, `.cs-listbox-item*`, `.cs-listbox-group*`, `.cs-listbox-separator` | Reused 1:1 from `src/shared/listbox/listbox.css` | Includes `xs`–`xl` geometry, concentric radii, leading `.cs-listbox-item-indicator` inset, 2-row description grid, press `scale: 0.97`, and keyboard/pointer nav arbitration. |
| Top-layer `popover="auto"`, anchor positioning, flip fallbacks, `[data-animate]`, `[data-instant]` | Reused 1:1 from `src/modules/popover/Popover.svelte` | Zero custom JS positioning or animation loops. |
| `.cs-context-menu-anchor` | Module-local (`context-menu.css`) | `0px × 0px` fixed virtual anchor positioned at `(x, y)`. |
| `--cs-context-menu-offset`, `--cs-popover-anim-*` overrides | Module-local (`context-menu.css`) | `2px` cursor offset and `260ms` / `100ms` cursor-origin motion tuning. |
| `--cs-context-menu-content-min-width`, `--cs-context-menu-content-max-width`, `--cs-context-menu-header-*`, `--cs-context-menu-footer-*`, `--cs-context-menu-shortcut-fg`, `--cs-context-menu-item-negative-*` | Module-local (`context-menu.css`) | Mirrors `dropdown.css` `--cs-dropdown-*` API under the `context-menu` namespace. |
| `.cs-context-menu-item[data-negative]`, `.cs-context-menu-item-shortcut`, `.cs-context-menu-item-indicator`, `.cs-context-menu-header`, `.cs-context-menu-footer`, `.cs-context-menu-row` | Module-local (`context-menu.css`) | Visual parity with `src/modules/dropdown/dropdown.css`. |
