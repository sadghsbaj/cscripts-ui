# Splitter Module Blueprint

## 1. Overview & Scope

- **Kind:** `component` (compound layout primitive: `Splitter`, `SplitterPane`, `SplitterHandle`)
- **Purpose:** Divides a container into two or more resizable panes along a `horizontal` (side-by-side columns) or `vertical` (stacked rows) axis, with full support for 2D nested splitters, dynamic `{#if}` mounting/unmounting, collapsible panes, pixel/percentage constraints, `ResizeObserver` adaptation, pointer dragging, and WAI-ARIA Window Splitter keyboard navigation.
- **Primary Motivating Use Case:** Multi-pane application shells (e.g. an AI chatboard with a collapsible left sidebar, flexible center workspace, and optional right inspector panel, where the center or side panes may themselves contain nested vertical/horizontal splitters).
- **Comparison with Sibling Modules:**
  - **`Collapsible`:** Animates a single disclosure panel along its content axis; does not manage sibling space redistribution or interactive drag handles.
  - **`ScrollArea`:** Owns inner scrolling inside a fixed or flex box; `SplitterPane` pairs naturally with `ScrollArea` inside it (`min-width: 0; min-height: 0;`).
  - **`Dnd`:** Uses Pointer Events for item/container drag-and-drop; `Splitter` uses Pointer Events + `setPointerCapture` strictly for divider-track resizing.
- **Boundaries:**
  - **Owns:** Pane registration in DOM order, pixel/percentage constraint solving, `ResizeObserver` container-resize redistribution, collapse/expand state + pre-collapse memory, pointer capture drag loop, document-level drag cursor/selection lock, WAI-ARIA `role="separator"` keyboard resizing, and separator styling.
  - **Does not** wrap or inject scrollbars into pane content (consumers place `ScrollArea` or scrollable elements inside `SplitterPane`).
  - **Out of scope:** Multi-axis 4-way corner intersection handles (2D layouts compose nested `Splitter` instances), drag-to-reorder panes, floating/dockable window managers, and automatic `localStorage` persistence (consumers bind `extent` / `collapsed` and persist via `browser-storage` if desired).

---

## 2. Public API

### Module File Layout (`src/modules/splitter/`)

- **Public entry point:** `index.ts` (never re-exports `*.internal.*`)
- **Public source files:**
  - `Splitter.svelte` — Root container, `ResizeObserver`, layout solver, and context provider.
  - `SplitterPane.svelte` — Individual resizable pane.
  - `SplitterHandle.svelte` — Interactive `role="separator"` divider between panes.
  - `splitter.css` — `@layer components.composite` styles and `--cs-splitter-*` tokens.
  - `splitter.types.ts` — Public types and `UPPER_SNAKE_CASE` option constants.
  - `splitter.context.ts` — `createContext()` typed helpers (`getSplitterContext`, `setSplitterContext`, `hasSplitterContext`).
- **Internal modules (never exported):**
  - `splitter-solver.internal.ts` — Pure constraint-solving, unit conversion (`px` / `%`), `ResizeObserver` redistribution, and collapse/mount space-allocation math.
- **Co-located docs/preview/tests:** `splitter.blueprint.md`, `splitter.docs.md`, `Splitter.preview.svelte`, `splitter.test.ts`, `splitter.svelte.test.ts`.

### Exports (`src/modules/splitter/index.ts`)

Flat `PascalCase` compound exports (no dot-notation, no `*.internal.*` exports):

- **Components:**
  - `Splitter`
  - `SplitterPane`
  - `SplitterHandle`
- **Context Helpers:**
  - `getSplitterContext`, `setSplitterContext`, `hasSplitterContext`, `type SplitterContext`
- **Option Arrays & Types:**
  - `SPLITTER_ORIENTATIONS = ["horizontal", "vertical"] as const` -> `SplitterOrientation`
  - `SPLITTER_VARIANTS = ["subtle", "elevated", "transparent"] as const` -> `SplitterVariant`
  - `SPLITTER_SIZES = ["sm", "md", "lg"] as const` -> `SplitterSize`
  - `SPLITTER_DOUBLE_CLICK_ACTIONS = ["reset", "collapse", "none"] as const` -> `SplitterDoubleClickAction`
  - `SplitterExtent = number | \`${number}px\` | \`${number}%\``
  - `SplitterProps`, `SplitterPaneProps`, `SplitterHandleProps`, `SplitterResizeEvent`

> **Naming Rule Compliance:** `size` is strictly reserved for the T-shirt scale (`"sm" | "md" | "lg"`) controlling handle/gutter visual proportions. Pane dimensions use the canonical term **`extent`** (`extent`, `defaultExtent`, `min`, `max`, `collapsedExtent`).

### Props

#### `SplitterProps` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

`variant` and `size` **MUST NOT** have default values—call sites must choose both explicitly.

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to root `.cs-splitter`. |
| `variant` | `SplitterVariant` | *required* | `"subtle" \| "elevated" \| "transparent"` separator visual style. |
| `size` | `SplitterSize` | *required* | `"sm" \| "md" \| "lg"` T-shirt scale for handle thickness and grip pill proportions. |
| `orientation` | `SplitterOrientation` | `"horizontal"` | `"horizontal"` (side-by-side columns) or `"vertical"` (stacked rows). |
| `animate` | `boolean` | `true` | Animates programmatic collapse/expand/reset transitions (never during active pointer drag). |
| `disabled` | `boolean` | `false` | Disables all `SplitterHandle` interactions within this splitter. |
| `onResize` | `(event: SplitterResizeEvent) => void` | `undefined` | Fires during pointer/keyboard resize with `{ panes }`. |
| `onResizeEnd` | `(event: SplitterResizeEvent) => void` | `undefined` | Fires once when a pointer drag or keyboard step completes. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-splitter", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Slotted `SplitterPane` and `SplitterHandle` children. |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to root `.cs-splitter`. |

#### `SplitterPaneProps` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to `.cs-splitter-pane`. |
| `id` | `string` | `$props.id()` | Unique pane identifier (used in `aria-controls` and resize event payloads). |
| `extent` | `SplitterExtent \| undefined` | `undefined` | `$bindable()`, controlled pane extent (`number` = `%`, `"260px"`, or `"30%"`). Omit on flexible fill panes. |
| `defaultExtent` | `SplitterExtent \| undefined` | `undefined` | Uncontrolled initial extent (and reset target for double-click `"reset"`). |
| `min` | `SplitterExtent` | `"0px"` | Minimum allowed extent when expanded. |
| `max` | `SplitterExtent` | `"100%"` | Maximum allowed extent. |
| `collapsible` | `boolean` | `false` | Allows pane to collapse via `collapsed`, `Enter` key, or dragging past `collapseThreshold`. |
| `collapsed` | `boolean` | `false` | `$bindable()`, current collapsed state. Expanding restores pre-collapse extent. |
| `collapsedExtent` | `SplitterExtent` | `"0px"` | Extent when `collapsed={true}` (e.g. `"48px"` for an icon rail, or `"0px"` to hide). |
| `collapseThreshold` | `number` | `0.5` | Fraction (`0..1`) of `min` below which dragging snaps the pane to `collapsed={true}`. |
| `onCollapseChange` | `(collapsed: boolean) => void` | `undefined` | Fires when `collapsed` changes via user interaction. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-splitter-pane", className]`. |
| `children` | `Snippet \| undefined` | `undefined` | Pane content (can include another nested `<Splitter>`). |
| `...rest` | `HTMLAttributes<HTMLDivElement>` | — | Forwarded to `.cs-splitter-pane`. |

#### `SplitterHandleProps` (`extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role">`)

| Prop | Type | Default | Notes |
| :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | `null` | `$bindable()`, bound to `.cs-splitter-handle`. |
| `variant` | `SplitterVariant` | *(from root)* | Optional per-handle override of root `variant`. |
| `size` | `SplitterSize` | *(from root)* | Optional per-handle override of root `size`. |
| `disabled` | `boolean` | `false` | Disables this handle independently of root `disabled`. |
| `keyboardStep` | `SplitterExtent` | `"16px"` | Extent delta per `Arrow` key press. |
| `keyboardStepLarge` | `SplitterExtent` | `"64px"` | Extent delta per `Shift + Arrow` key press. |
| `doubleClickAction` | `SplitterDoubleClickAction` | `"reset"` | `"reset"` (restore adjacent `defaultExtent`), `"collapse"` (toggle adjacent collapsible pane), or `"none"`. |
| `label` | `string` | *(localized default)* | Accessible `aria-label` for `role="separator"`; defaults via `t({ de, en })`. |
| `class` | `ClassValue` | `undefined` | Merged via `["cs-splitter-handle", className]`. |
| `children` | `Snippet<[{ dragging: boolean; orientation: SplitterOrientation }]> \| undefined` | `undefined` | Optional custom grip content replacing the default pill indicator. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, "children" \| "role">` | — | Forwarded to `.cs-splitter-handle`. |

### CSS Custom Properties (`--cs-splitter-*`)

All library styles live in `splitter.css` inside `@layer components.composite`:

| Variable | Purpose |
| :--- | :--- |
| `--cs-splitter-handle-size` | Layout gutter thickness (`1px` / `4px` / `8px` depending on `variant` & `size`). |
| `--cs-splitter-handle-hit-size` | Expanded pointer hit-zone width/height (`12px`–`16px`) centered on the handle. |
| `--cs-splitter-handle-bg` | Resting gutter/divider color. |
| `--cs-splitter-handle-bg-hover` | Gutter/divider color on `:hover` / `:focus-visible`. |
| `--cs-splitter-handle-bg-active` | Gutter/divider color while `[data-dragging]`. |
| `--cs-splitter-pill-bg` | Center grip pill resting color. |
| `--cs-splitter-pill-bg-active` | Center grip pill color on hover/focus/drag (`--cs-color-accent-solid`). |
| `--cs-splitter-pill-length` | Grip pill length along the separator (`20px` / `28px` / `36px` by `size`). |
| `--cs-splitter-pill-thickness` | Grip pill thickness across the separator (`3px` / `4px` / `5px` by `size`). |
| `--cs-splitter-radius` | Corner radius for grip pill (`var(--cs-radius-full)`). |
| `--cs-splitter-transition-dur` | Programmatic collapse/reset transition duration (`var(--cs-dur-200)`). |
| `--cs-splitter-transition-ease` | Programmatic collapse/reset easing (`var(--cs-ease-quart-out)`). |

---

## 3. DOM, Semantics & Accessibility

### DOM Structure & Selectors

```html
<div
  class="cs-splitter"
  data-orientation={orientation}
  data-variant={variant}
  data-size={size}
  data-dragging?
  data-disabled?
>
  <div
    class="cs-splitter-pane"
    id={paneId}
    data-collapsed?
    style:--cs-splitter-pane-basis="..."
  >
    {children}
  </div>

  <div
    class="cs-splitter-handle"
    role="separator"
    tabindex={isDisabled ? -1 : 0}
    aria-orientation={orientation === "horizontal" ? "vertical" : "horizontal"}
    aria-controls={prevPaneId}
    aria-valuenow={valuenow}
    aria-valuemin={valuemin}
    aria-valuemax={valuemax}
    aria-label={resolvedLabel}
    aria-disabled={isDisabled ? "true" : undefined}
    data-orientation={orientation}
    data-variant={effectiveVariant}
    data-size={effectiveSize}
    data-dragging?
    data-disabled?
  >
    <span class="cs-splitter-handle-pill" aria-hidden="true"></span>
  </div>

  <div class="cs-splitter-pane" id={nextPaneId} ...>
    {children}
  </div>
</div>
```

- **Direct-child scoped selectors:** Layout and orientation rules target `.cs-splitter[data-orientation="horizontal"] > .cs-splitter-pane` and `.cs-splitter > .cs-splitter-handle` so nested `Splitter` instances never inherit ancestor flex directions or handle styles.
- **Dynamic DOM-order pairing:** `SplitterPane` and `SplitterHandle` register on mount and unregister on unmount; `Splitter` sorts registered nodes using `Node.compareDocumentPosition` so `{#if ...}` conditional panes and handles always pair with their true adjacent siblings.

### WAI-ARIA Window Splitter & Keyboard Navigation

- **Perpendicular `aria-orientation`:** A `horizontal` `Splitter` (left/right panes) renders a vertical divider bar (`aria-orientation="vertical"`). A `vertical` `Splitter` (top/bottom panes) renders a horizontal divider bar (`aria-orientation="horizontal"`).
- **Live ARIA Values:** `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` reflect the preceding pane's integer percentage (`0..100`) of the combined adjacent-pair extent (or container extent), updating continuously during drag and keyboard steps.
- **Keyboard Bindings (on focused `SplitterHandle`):**
  - `ArrowLeft` / `ArrowRight` (when `Splitter` is `"horizontal"`) or `ArrowUp` / `ArrowDown` (when `Splitter` is `"vertical"`): Adjusts the divider by `keyboardStep` (`Shift` multiplies/uses `keyboardStepLarge`).
  - `Home`: Shrinks the preceding pane to its `min` (or `collapsedExtent` if `collapsible`).
  - `End`: Expands the preceding pane to its `max` (constrained by the following pane's `min`).
  - `Enter`: If either adjacent pane has `collapsible={true}`, toggles its `collapsed` state (preferring the collapsible pane, or the preceding pane if both are collapsible).
  - All handled keys call `event.preventDefault()` (preventing scroll) and `event.stopPropagation()` (isolating nested splitters).
- **Focus & Disabled Semantics:** Non-disabled handles use `tabindex="0"`; disabled handles set `tabindex="-1"`, `aria-disabled="true"`, and `data-disabled=""`. Global `:focus-visible` ring styling is inherited from `src/css/foundation/`.

---

## 4. Visual & Motion Contract

- **CSS Layer:** Lives in `@layer components.composite`.
- **Borderless Surface Philosophy (`design-and-tokens.md`):**
  - `Splitter` itself renders a transparent flex container (`background: transparent`) so consumer panes (`Card`, `elevated`, `sunken`, or `canvas` regions) own their own surfaces.
  - **`subtle`:** Hairline `1px` `--cs-splitter-handle-bg` divider line (using subtle surface contrast) that reveals a `--cs-splitter-pill-bg-active` grip pill on `:hover`, `:focus-visible`, and `[data-dragging]`.
  - **`elevated`:** `4px`–`8px` gutter track with a resting `--cs-splitter-pill-bg` grip pill (`--cs-shadow-elevated` / `--cs-color-bg-elevated` feel) that brightens to `--cs-color-accent-solid` on interaction.
  - **`transparent`:** `0px`–`8px` invisible gap at rest (ideal for `elevated` island panes separated over `canvas`) that reveals a crisp accent pill only on `:hover`, `:focus-visible`, or `[data-dragging]`.
- **Proportional `size` Scale (`sm | md | lg`):**
  - `sm`: Compact (`1px` subtle / `4px` elevated gutter, `20px × 3px` pill) — suited for dense toolbars and nested sub-panes.
  - `md`: Standard (`1px` subtle / `6px` elevated gutter, `28px × 4px` pill) — default application shell scale.
  - `lg`: Spacious (`2px` subtle / `8px` elevated gutter, `36px × 5px` pill) — touch-friendly or high-contrast dashboards.
- **Expanded Hit Area Without Layout Bloat:**
  - `SplitterHandle` keeps a tight layout footprint (`--cs-splitter-handle-size`) while providing a centered `--cs-splitter-handle-hit-size` (`12px`–`16px`) interactive target via a `::before` pseudo-element (`position: absolute; inset-block: 0; inset-inline: calc((var(--cs-splitter-handle-hit-size) - 100%) / -2)` for horizontal, and swapped axes for vertical) with `touch-action: none`.
- **Motion:**
  - **Zero-lag drag:** While `data-dragging` is present on `.cs-splitter`, `transition` on `.cs-splitter-pane` is `none` so panes track pointer movement 1:1 at 60/120fps.
  - **Programmatic transitions:** When `collapsed` changes or double-click `"reset"` runs (and `animate={true}`), `.cs-splitter-pane` smoothly transitions `flex-basis` over `--cs-dur-200` with `--cs-ease-quart-out`.
  - **Pill & handle feedback:** Hover/focus/active pill scale and color transitions use `--cs-dur-effect-fast` (`--cs-dur-100`) and `--cs-ease-effect`.
  - `prefers-reduced-motion: reduce` is inherited globally from `src/css/foundation/motion.css`.

---

## 5. Edge Cases & Constraints

- **Nested 2D Splitters (Event & Layout Isolation):**
  - `SplitterHandle` calls `event.stopPropagation()` on `pointerdown` and `keydown`, and binds `setPointerCapture(event.pointerId)` directly on the handle element (processing only matching `pointerId` events). Nested splitters never interfere with ancestor handles.
  - `.cs-splitter-pane` sets `min-width: 0; min-height: 0; overflow: hidden;` so wide text, code blocks, or nested `ScrollArea` / `Splitter` children never force a pane wider than its solved `flex-basis`.
  - While collapsed (`data-collapsed`), `.cs-splitter-pane` sets `inert` when `collapsedExtent === "0px"` (or `"0%"` / `0`) so hidden controls inside a `0px` pane cannot receive accidental `Tab` focus.
- **Container Resize (`ResizeObserver`):**
  - When the root `.cs-splitter` resizes, pixel-specified panes (`"260px"`) preserve their pixel extent while percentage/flexible panes absorb the delta proportionally.
  - If the container shrinks below the sum of all panes' `min` extents, panes compress proportionally below `min` down to `0px` rather than overflowing the container.
- **Dynamic `{#if}` Show/Hide & Redistribution:**
  - Unmounting a pane redistributes its extent proportionally across remaining expanded panes (respecting `min`/`max`).
  - Mounting a new pane (or re-mounting a toggled pane) claims its `extent` / `defaultExtent` (or equal share if unspecified) from flexible/neighboring panes without exceeding any pane's `min`/`max`.
- **Drag Cursor & Selection Lock:**
  - During active pointer drag, `document.documentElement` receives `data-splitter-dragging={orientation}` to enforce `cursor: col-resize` / `row-resize` and `user-select: none` globally even if the pointer leaves the handle or viewport; always cleared on `pointerup`, `pointercancel`, `blur`, and unmount.
- **Browser Support:**
  - Targets modern evergreen Chromium (`ResizeObserver`, `PointerEvent` + `setPointerCapture`, CSS Nesting, `inert`). No legacy IE/WebKit resize-observer polyfills.
- **Explicit Non-Goals:**
  - No 4-way corner drag intersections, no built-in `localStorage` persistence, no pane drag-reordering, and no `info` / semantic status color variants on handles.
