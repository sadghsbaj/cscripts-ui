# RovingFocus — Blueprint

## 1. Overview & Scope

- **Kind:** `attachment` (`rovingFocus` in `src/modules/focus/`, exported via `cs/svelte/focus`)
- **Purpose:** Provide a headless Svelte 5 element attachment implementing the W3C APG **roving `tabindex`** pattern for composite widgets (toolbars, segmented controls, menus, listboxes, tablists, and custom grids/lists).
- **Boundaries vs. Sibling Focus Attachments:**
  - **`autoFocus`:** One-shot initial focus on mount, optional text selection (`select`), and unmount focus restoration (`restoreFocus`).
  - **`focusTrap`:** Modal `Tab` / `Shift+Tab` containment, outside-click interception, `Escape` handling, and nested trap stacking (`trapStack`).
  - **`rovingFocus`:** Intra-container composite keyboard navigation:
    - Maintains a **single tab stop** (`tabindex="0"` on the active item, `tabindex="-1"` on all other managed items).
    - Handles `Arrow*` (and optional `Home` / `End`) navigation between items.
    - Remembers the active item across `Tab`-out and `Tab`-back-in.
    - Synchronizes `tabindex` on pointer click / `focusin` and across dynamic DOM mutations (items added, removed, hidden, or disabled).
  - **Headless (Zero CSS):** `rovingFocus` ships **no** stylesheets or visual tokens. Visual styling remains the responsibility of the host component or `src/css/foundation/focus.css`.

---

## 2. Public API

### Exports (`src/modules/focus/index.ts`)

Re-exported via `export * from "./roving-focus.attach";`:
- `rovingFocus`
- `RovingFocusOrientation`
- `RovingFocusDirection`
- `RovingFocusItems`
- `RovingFocusChangeEvent`
- `RovingFocusOptions`

### Signature

```ts
export function rovingFocus<T extends HTMLElement = HTMLElement>(
    options: RovingFocusOptions
): Attachment<T>;
```

Follows the library's required-options attachment contract (matching `focusTrap(options: FocusTrapOptions)`), returning `Attachment<T>`.

### Types & Options

```ts
export type RovingFocusOrientation = "horizontal" | "vertical" | "both";
export type RovingFocusDirection = "ltr" | "rtl" | "auto";
export type RovingFocusItems = string | ((container: HTMLElement) => HTMLElement[]);

export interface RovingFocusChangeEvent {
    activeItem: HTMLElement;
    previousItem: HTMLElement | null;
    container: HTMLElement;
    reason: "keyboard" | "pointer" | "focus" | "init" | "mutation";
}
```

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean \| (() => boolean)` | `true` | Enables or disables the attachment via `resolveGetter`. When `false`, no listeners, `tabindex` mutations, or `data-*` attributes are applied. |
| `orientation` | `RovingFocusOrientation \| (() => RovingFocusOrientation)` | *(required)* | Axis of arrow-key navigation (resolved via `resolveGetter`): `"horizontal"` (`ArrowLeft`/`ArrowRight`), `"vertical"` (`ArrowUp`/`ArrowDown`), or `"both"` (all four arrows step linearly). |
| `dir` | `RovingFocusDirection` | `"auto"` | Text direction for horizontal arrow keys. `"auto"` reads `getComputedStyle(container).direction`. |
| `loop` | `boolean \| (() => boolean)` | `true` | Wraps from last enabled item to first (and vice versa) on arrow navigation (resolved via `resolveGetter`). |
| `homeEnd` | `boolean \| (() => boolean)` | `true` | Enables `Home` (first enabled item) and `End` (last enabled item) navigation (resolved via `resolveGetter`). |
| `items` | `RovingFocusItems` | Auto-discovery | CSS selector or custom resolver returning candidate items within `container`. |
| `initialActive` | `string \| ((items: HTMLElement[], container: HTMLElement) => HTMLElement \| null)` | `undefined` | Optional selector or resolver to pick the initial `tabindex="0"` item on mount. |
| `preventScroll` | `boolean` | `false` | Passed to `target.focus({ preventScroll })`. Defaults to `false` so arrow navigation scrolls focused items into view in scrollable menus/lists (unlike `autoFocus`/`focusTrap`, which default to `true`). |
| `onActiveChange` | `(event: RovingFocusChangeEvent) => void` | `undefined` | Fired whenever the active roving item changes (useful for selection-follows-focus in segmented controls or tabs). |

### CSS Variables

None. `rovingFocus` is purely behavioral and defines no `--cs-focus-*` or `--cs-roving-focus-*` CSS variables.

---

## 3. DOM, Semantics & Accessibility

### Native Elements & Host Responsibilities

- `rovingFocus` attaches to any `HTMLElement` container (`<div role="toolbar">`, `<div role="menu">`, `<div role="listbox">`, `<div role="tablist">`, `<div role="group">`, etc.).
- **ARIA roles and selection attributes** (`role`, `aria-orientation`, `aria-pressed`, `aria-checked`, `aria-selected`, `aria-activedescendant`) are **owned by the host component**, not `rovingFocus`.

### `data-*` Attributes

| Attribute | Target | Presence | Purpose |
| :--- | :--- | :--- | :--- |
| `data-roving-focus` | `container` | `""` while enabled | Marks the roving container boundary so nested roving containers do not claim inner items, and aids debugging/styling. |
| `data-roving-active` | Active item | `""` on current `tabindex="0"` item | Exposes the current roving position to CSS (e.g., menu/listbox highlight) independently of `:focus-visible`. |

All `data-*` attributes are deterministically removed on teardown or when `enabled` becomes `false`.

### Keyboard Navigation

- **Single Tab Stop:** Only the active item has `tabindex="0"`; all other managed items have `tabindex="-1"`. Pressing `Tab` / `Shift+Tab` leaves the container normally (or delegates to an enclosing `focusTrap`).
- **Orientation Mapping:**
  - `"horizontal"`: `ArrowLeft` / `ArrowRight` move focus; `ArrowUp` / `ArrowDown` are ignored.
  - `"vertical"`: `ArrowUp` / `ArrowDown` move focus; `ArrowLeft` / `ArrowRight` are ignored.
  - `"both"`: `ArrowLeft` / `ArrowUp` move previous; `ArrowRight` / `ArrowDown` move next.
- **RTL Support:** When resolved direction is `"rtl"`, `ArrowLeft` moves **next** and `ArrowRight` moves **previous**. `ArrowUp`, `ArrowDown`, `Home`, and `End` are unaffected.
- **Modifier Keys:** Key events with `altKey`, `ctrlKey`, `metaKey`, or `shiftKey` are ignored so browser/OS shortcuts (e.g., `Alt+ArrowLeft`, `Cmd+ArrowLeft`) continue to work.
- **Text-Editing Guard:** Key events originating inside text-editing controls (`textarea`, `[contenteditable]`, `select`, or text-like `<input>` types such as `text`, `search`, `email`, `url`, `tel`, `password`, `number`) are ignored so arrow keys and `Home`/`End` never hijack caret movement or value editing.
- **`event.preventDefault()`:** Called only when `rovingFocus` actually handles the key (matching `orientation` / `homeEnd` and not guarded by modifiers or text inputs), preventing unwanted page scrolling on `ArrowUp`/`ArrowDown`/`Home`/`End`.

### Focus & Pointer Behavior

- **Initial Active Resolution (on mount):**
  1. `initialActive` option (if provided and resolves to an enabled, visible item).
  2. First enabled item already carrying `tabindex="0"` in the DOM.
  3. First enabled, visible item in DOM order.
- **Pointer Click / Programmatic Focus (`focusin` + `pointerdown`):**
  - Clicking or focusing any managed item updates `tabindex="0"` and `data-roving-active` to that item and sets `tabindex="-1"` on the previous active item.
  - Does not call `.focus()` redundantly if the item is already `document.activeElement`.

---

## 4. Visual & Motion Contract

- **No Shipped Styles:** `rovingFocus` contains zero CSS.
- **Toolbars & Segmented Controls:** Rely on the global `:focus-visible` outline in `src/css/foundation/focus.css`. Clicking with a pointer updates `tabindex="0"` without triggering `:focus-visible`, keeping mouse clicks ring-free while preserving instant keyboard focus rings on `Tab` or `Arrow*` navigation.
- **Menus & Listboxes:** Components that render a full-row active highlight (e.g., `--cs-color-base-sunken` or `--cs-color-accent-soft`) can target `[data-roving-active]` or `:focus-visible` in their own component stylesheet and optionally suppress the default outline (`outline: none`) on menu items when a background highlight serves as the focus indicator.
- **Motion:** No transitions or animations are owned by `rovingFocus`. Focus ring rendering remains instantaneous per `src/css/foundation/focus.css`.

---

## 5. Edge Cases & Constraints

### Item Discovery & Nested Containers

- **Auto-discovery (`items` omitted):** Queries focusable descendants using `focus-utils.internal.ts` (`getFocusableElements(container, { includeNegativeTabIndex: true })`) so items previously assigned `tabindex="-1"` remain discoverable.
- **Nested Roving Boundary:** When auto-discovering items, candidates whose `element.closest("[data-roving-focus]") !== container` are excluded so nested roving widgets (e.g., a toolbar inside a dialog or nested menu) do not interfere with each other.
- **Disabled / Hidden / Inert Items:** Filtered out via `isElementDisabledOrInert` and `isElementVisible` from `focus-utils.internal.ts`.

### Dynamic DOM Mutations

- A scoped `MutationObserver` on `container` (`childList: true, subtree: true, attributes: true`, filtering `attributeFilter: ["disabled", "aria-disabled", "hidden", "inert"]`) re-syncs managed items when items are added, removed, or toggled disabled/hidden.
- **Self-Mutation Guard:** `tabindex` and `data-roving-active` are omitted from `attributeFilter` (or guarded by an internal `isSyncing` flag) to prevent observer feedback loops.
- **Active Item Removal / Disablement:** If the currently active item is removed or becomes disabled while focus is inside `container` (or fell back to `document.body` upon removal), `rovingFocus` promotes the nearest valid sibling (or first enabled item) to `tabindex="0"` and moves focus to it. If focus was outside `container`, it updates `tabindex="0"` silently without stealing focus.

### Teardown & `tabindex` Restoration

- Original `tabindex` values of managed elements are recorded in a `WeakMap<HTMLElement, string | null>` before first modification and restored on teardown (or when `enabled` becomes `false`).

### Composition with `autoFocus` and `focusTrap`

- **`rovingFocus` + `autoFocus`:** In a popover menu or listbox, `autoFocus({ target: '[tabindex="0"]' })` (or `first-focusable`) focuses the active roving item on open, and `rovingFocus` handles subsequent arrow navigation.
- **`rovingFocus` + `focusTrap`:** `focusTrap` handles `Tab` containment and `Escape` dismissal at the container level; `rovingFocus` handles `Arrow*` / `Home` / `End` inside the container. Neither intercepts the other's keys.

### Browser Support & Non-Goals

- **Browser Support:** Modern Chromium-first (matches `.agents/rules/code-style.md`), relying on standard `MutationObserver`, `getComputedStyle`, `Element.closest`, and `Element.checkVisibility` (already used in `focus-utils.internal.ts`).
- **Explicit Non-Goals:**
  - **2D Grid Row/Column Math:** `orientation: "both"` steps linearly through DOM order; true 2D matrix navigation (`aria-rowindex` / `aria-colindex`) is out of scope.
  - **Typeahead / Character Search:** Menu/listbox type-to-select belongs in a dedicated menu/listbox helper or future option, not core `rovingFocus`.
  - **Virtualization:** Items must exist in the DOM; virtualized list scrolling is out of scope.
  - **Selection State:** `rovingFocus` never mutates `aria-pressed`, `aria-checked`, or `aria-selected`.

---

## 6. Resolved Decisions

1. **`preventScroll` Defaults to `false`:** Unlike `autoFocus` and `focusTrap` (which default `preventScroll` to `true` to prevent viewport jumps on mount), `rovingFocus` defaults `preventScroll` to `false` so keyboard arrowing in scrollable menus and listboxes scrolls newly focused items into view. This difference must be prominently documented in `roving-focus.docs.md`.
2. **No Pointer Hover Option (`activateOnHover`):** Pointer hover activation stays out of `rovingFocus`. Menus and listboxes that want hover-to-highlight/focus can call `item.focus({ preventScroll })` on `pointerenter`, which `rovingFocus` automatically syncs (`tabindex="0"` + `data-roving-active`) via `focusin`.
3. **Reactive Getters on Core Behavioral Options:** `enabled`, `orientation`, `loop`, and `homeEnd` all accept `T | (() => T)` and resolve via `resolveGetter` (`src/shared/resolve-getter.ts`), avoiding attachment teardown/re-initialization when host props change dynamically.
4. **Always Skip Disabled / Inert / Hidden Items:** `rovingFocus` always excludes disabled, `aria-disabled="true"`, `inert`, and hidden items via `focus-utils.internal.ts` (no `focusDisabled` option).
5. **Documentation Split:** When documentation is authored for `rovingFocus`, `src/modules/focus/focus.docs.md` will be split into per-attachment docs (`auto-focus.docs.md`, `focus-trap.docs.md`, and `roving-focus.docs.md`).
6. **Required `orientation` Option:** `options` and `options.orientation` are intentionally required (matching `focusTrap(options: FocusTrapOptions)`), forcing callers to explicitly declare `"horizontal"`, `"vertical"`, or `"both"` instead of silently assuming horizontal arrow navigation on vertical menus or listboxes.
