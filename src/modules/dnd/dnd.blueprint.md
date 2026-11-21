# Drag & Drop (`dnd`) Module Blueprint

## 1. Overview & Scope

- **Kind:** `attachment` (reactive Svelte 5 controller factory + attachment suite + pure reorder utilities; zero wrapper components)
- **Purpose:** A zero-dependency, pointer-event-driven Drag & Drop engine built from scratch for `cscripts-ui`. Uses **Pointer Events** (no HTML5 `draggable="true"`), a custom **WAAPI (`Element.animate()`) FLIP & flight engine** (no `svelte/animate` `flip`), **Top-Layer** drag thumbnails (`popover="manual"`), **anti-jitter layout-rect collision**, **auto-scroll** (seamless with `ScrollArea` and native containers), and **full keyboard accessibility**.
- **Supported Core Use Cases (All First-Class):**
  1. **Free Drag & Drop:** Dropzones, trash targets, upload/bucket zones, `isOver` / `data-over` hover state, `accepts` validation (`data-drop-valid` / `data-drop-invalid`).
  2. **1D Sorting:** Vertical & horizontal lists, tab strips, and table rows with live WAAPI sibling displacement.
  3. **Multi-Container:** Kanban boards, dual-list transfers, and playlist builders with cross-container moves, empty-container drops, and container-level `accepts`.
  4. **2D Grid & Nested Trees:** Dashboard widget grids and image galleries (2D layout-rect collision) plus hierarchical trees (3-zone `before` / `inside` / `after` detection, ancestor-cycle prevention, and optional hover-to-expand delay on collapsed nodes).
- **Boundaries:**
  - **Owns:** Pointer & keyboard drag sensors, explicit drag FSM, activation thresholds (`distance`, `delay`, `tolerance`, interactive-element guard, post-drag click suppression), layout-rect collision & anti-oscillation hysteresis, custom WAAPI FLIP / settle / cancel-snap-back engine, Top-Layer thumbnail host & auto-cloning, delta-time auto-scroll, and `aria-live` keyboard announcements.
  - **Zero Cross-Module Imports:** Does not import from `scroll-area` or `overlay`. Auto-scroll discovers native overflow scroll ancestors (which automatically includes `.cs-scroll-area-content`), and the thumbnail host calls native `popover="manual"` / `showPopover()` directly.
  - **No Wrapper Components:** Consumers keep their native semantic HTML (`<ul>`, `<li>`, `<table>`, `<tr>`, `<div>`, `<article>`) and wire behavior strictly via Svelte 5 `{@attach ...}`.
  - **Out of Scope (v1):** Native OS file-drop from desktop (`DataTransfer` — handled by `upload-area`), multi-item batch selection dragging (consumers can still pass multi-item payloads via `data` and render a custom thumbnail badge), and cross-window / iframe dragging.

---

## 2. Public API

### Module File Layout (`src/modules/dnd/`)

- **Public entry point:** `index.ts` (never re-exports `*.internal.*`)
- **Public source files:**
  - `dnd.svelte.ts` — `createDnd`, `DndController`, `setDndContext`, `getDndContext`
  - `dnd.attach.ts` — standalone `dragHandle` attachment + CSS import
  - `dnd.attach.css` — `@layer attachments` styles and `--cs-dnd-*` tokens
  - `dnd.types.ts` — public types & `UPPER_SNAKE_CASE` option constants
  - `dnd-utils.ts` — pure immutable helpers (`arrayMove`, `arrayTransfer`)
- **Internal modules (never exported):**
  - `waapi-flip.internal.ts` — WAAPI FLIP snapshot/play, mid-flight interruption retargeting, drop-settle & cancel-snap-back flight, `prefers-reduced-motion` handling
  - `collision.internal.ts` — resting layout-rect math, 1D/2D/Tree/Free hit-testing, directional crossing, hysteresis deadzones, unequal-size swap guard, tree ancestor-cycle check
  - `auto-scroll.internal.ts` — scroll-ancestor discovery, delta-time RAF loop, non-linear edge acceleration, initial-edge guard
  - `thumbnail.internal.ts` — Top-Layer `popover="manual"` host, auto-clone with locked box dimensions & ID stripping, integer-pixel GPU positioning
  - `announcer.internal.ts` — visually-hidden `aria-live` region & localized `de`/`en` announcements via `src/shared/lang.internal.ts`
- **Co-located docs/preview/tests:** `dnd.blueprint.md`, `dnd.design.md`, `dnd.docs.md`, `Dnd.preview.svelte`, `dnd.test.ts`, `dnd.svelte.test.ts`.

### Exports (`src/modules/dnd/index.ts`)

- **Controller & Context:**
  - `createDnd<TData = unknown, TDropData = unknown>(options?: DndOptions<TData, TDropData>): DndController<TData, TDropData>`
  - `setDndContext<TData = unknown, TDropData = unknown>(dnd: DndController<TData, TDropData>): DndController<TData, TDropData>`
  - `getDndContext<TData = unknown, TDropData = unknown>(): DndController<TData, TDropData>`
- **Standalone Attachment:**
  - `dragHandle(options?: DragHandleOptions): Attachment<HTMLElement>` (also mirrored as `dnd.dragHandle(options?)` for uniform ergonomics; works standalone in decoupled child components without calling `getDndContext()`)
- **Pure Utilities:**
  - `arrayMove<T>(items: readonly T[], fromIndex: number, toIndex: number): T[]`
  - `arrayTransfer<T>(source: readonly T[], target: readonly T[], fromIndex: number, toIndex: number): { source: T[]; target: T[] }`
- **Constants & Types:**
  - `DND_STATUSES = ["idle", "pending", "dragging", "settling"] as const` -> `DndStatus`
  - `DND_LAYOUTS = ["free", "list", "grid", "tree"] as const` -> `DndLayout`
  - `DND_ORIENTATIONS = ["vertical", "horizontal"] as const` -> `DndOrientation`
  - `DND_DROP_POSITIONS = ["before", "inside", "after"] as const` -> `DndDropPosition`
  - `DND_AXES = ["both", "x", "y"] as const` -> `DndAxis`
  - `DND_INPUT_METHODS = ["pointer", "keyboard"] as const` -> `DndInputMethod`
  - `DndId = string | number`
  - `DndOptions`, `DndController`, `DraggableOptions`, `SortableOptions`, `DroppableOptions`, `DragHandleOptions`, `DragThumbnailOptions`, `DragActivationOptions`, `DndAutoScrollOptions`, `DndActiveItem`, `DndOverTarget`, `DndDragStartEvent`, `DndDragMoveEvent`, `DndDragOverEvent`, `DndReorderEvent`, `DndDropEvent`, `DndDragCancelEvent`, `DndDragEndEvent`, `DndAnnouncements`.

> **Svelte 5 Context Safety Note:** Because `{@attach expr}` evaluates `expr` inside a reactive effect (outside component initialization), attachments MUST NOT call `getContext()` internally. Instead, consumers instantiate `const dnd = createDnd(...)` (or retrieve `const dnd = getDndContext()` in `<script>`) and bind via `dnd.draggable(...)`, `dnd.sortable(...)`, `dnd.droppable(...)`, `dnd.dragHandle(...)`, and `dnd.dragThumbnail(...)`. This guarantees type-safe `<TData>` inference and zero `lifecycle_outside_component` errors.

### Usage Patterns

**1D Sortable List (minimal wiring):**
```svelte
<script lang="ts">
  import { arrayMove, createDnd, dragHandle } from "cs";

  let items = $state([{ id: "a", label: "First" }, { id: "b", label: "Second" }]);

  const dnd = createDnd({
    onReorder: ({ fromIndex, toIndex }) => {
      items = arrayMove(items, fromIndex, toIndex);
    },
  });
</script>

<ul {@attach dnd.droppable({ id: "list", layout: "list" })}>
  {#each items as item, i (item.id)}
    <li {@attach dnd.sortable({ id: item.id, containerId: "list", index: i, data: item })}>
      <button type="button" {@attach dragHandle()}>Grip</button>
      {item.label}
    </li>
  {/each}
</ul>
```

**Multi-Container Kanban (same `onReorder` callback):**
```ts
const dnd = createDnd({
  onReorder: ({ fromContainerId, toContainerId, fromIndex, toIndex }) => {
    if (fromContainerId === toContainerId) {
      columns[fromContainerId] = arrayMove(columns[fromContainerId], fromIndex, toIndex);
    } else {
      const { source, target } = arrayTransfer(
        columns[fromContainerId],
        columns[toContainerId],
        fromIndex,
        toIndex,
      );
      columns[fromContainerId] = source;
      columns[toContainerId] = target;
    }
  },
  onDrop: ({ didMove, targetContainerId, targetIndex }) => {
    // Fires once on release — ideal for persisting final order/column to an API
  },
});
```

**Custom Drag Thumbnail (no wrapper component):**
```svelte
{#if dnd.active}
  <div class="my-ghost" {@attach dnd.dragThumbnail()}>
    {dnd.active.data.label}
  </div>
{/if}
```
*(Because `dnd.active` remains populated through `status === "settling"` and clears only upon returning to `"idle"`, conditional `{#if dnd.active}` stays mounted for the entire drop-settle / cancel-snap-back flight.)*

### Controller Options (`createDnd(options?)`)

- `activation?: DragActivationOptions`
  - `distance?: number` — `@default 6` (px Euclidean travel before `pending -> dragging`).
  - `delay?: number` — `@default 0` (ms press-and-hold duration; when `> 0`, pointer must stay within `tolerance` px).
  - `tolerance?: number` — `@default 6` (px allowed drift while `delay` timer runs).
  - `ignoreInteractive?: boolean` — `@default true` (blocks body-drag on nested interactive controls).
- `autoScroll?: boolean | DndAutoScrollOptions` — `@default true`
  - `edgeSize?: number` — `@default 48` (px, auto-clamped to `<= 25%` of container dimension).
  - `minSpeed?: number` — `@default 60` (px/s).
  - `maxSpeed?: number` — `@default 900` (px/s).
  - `initialEdgeGuard?: boolean` — `@default true`.
- `animate?: boolean` — `@default true` (global toggle for WAAPI FLIP, drop-settle, and cancel snap-back; always bypassed under `prefers-reduced-motion: reduce`).
- `hysteresisPx?: number` — `@default 6` (minimum deadzone margin for anti-oscillation swaps).
- `announcements?: Partial<DndAnnouncements>` — Optional overrides for `aria-live` strings.
- **Lifecycle Callbacks & Exact Event Payloads:**
  - `onDragStart?: (event: DndDragStartEvent<TData>) => void` — `{ item, inputMethod, pointer }`
  - `onDragMove?: (event: DndDragMoveEvent<TData>) => void` — `{ item, pointer, delta }`
  - `onDragOver?: (event: DndDragOverEvent<TData, TDropData>) => void` — `{ item, over }` (fires only when the resolved target changes)
  - `onReorder?: (event: DndReorderEvent<TData>) => void` — **Live structural mutation callback** for `layout: "list"` and `layout: "grid"` (both single-container and multi-container). Always provides `{ item, fromContainerId, toContainerId, fromIndex, toIndex }` (`fromContainerId === toContainerId` for 1D/2D single-container moves; distinct IDs for cross-container Kanban transfers). Automatically wrapped by the controller in `waapiFlip.snapshot` -> `onReorder` -> microtask flush -> `waapiFlip.play`. **Never fires** for `layout: "free"` or `layout: "tree"`.
  - `onDrop?: (event: DndDropEvent<TData, TDropData>) => void` — **Final commit callback**, firing once on valid release across **all 4 layouts**: `{ item, droppableId, droppableData, originContainerId, originIndex, targetContainerId, targetIndex, targetItemId, position, didMove }`:
    - `free`: primary drop action (`droppableId`, `droppableData`, `item`).
    - `tree`: sole structural commit hook (`droppableId`, `targetItemId`, `position: "before" | "inside" | "after"`, `item`). Trees never live-mutate via `onReorder` during hover to avoid vertical layout jumps.
    - `list` / `grid`: fires once after release (after any live `onReorder` previews) with `didMove: boolean` so consumers can persist final state to a backend or push one undo entry without spamming on every live swap.
  - `onDragCancel?: (event: DndDragCancelEvent<TData>) => void` — `{ item, originContainerId, originIndex, currentContainerId, currentIndex, reason: "escape" | "pointer-cancel" | "invalid-drop" | "programmatic" }`. Wrapped in WAAPI FLIP snapshot/play if the consumer reverts live-reordered `$state` back to `(originContainerId, originIndex)`.
  - `onDragEnd?: (event: DndDragEndEvent<TData, TDropData>) => void` — Always fires once at the end of every drag (`{ item, over, dropped, cancelReason? }`), immediately after `onDrop` or `onDragCancel`.

### Controller Reactive State (`DndController`)

All reactive getters are backed by Svelte 5 `$state`:
- `readonly status: DndStatus` (`"idle" | "pending" | "dragging" | "settling"`)
- `readonly isDragging: boolean` (`status === "dragging"`)
- `readonly isSettling: boolean` (`status === "settling"`)
- `readonly active: DndActiveItem<TData> | null` (`{ id, type, data, containerId, index, originContainerId, originIndex, label }`)
- `readonly over: DndOverTarget<TDropData> | null` (`{ droppableId, itemId, containerId, index, position, isValid, data }`)
- `readonly pointer: { x: number; y: number } | null`
- `readonly delta: { x: number; y: number }`
- `readonly inputMethod: DndInputMethod | null`
- `isOver(droppableId: DndId): boolean`
- `isDraggingItem(id: DndId): boolean`
- `cancel(): void` — Programmatically cancels an active drag (triggers cancel snap-back).
- `destroy(): void` — Tears down any active drag, global listeners, Top-Layer host, and `aria-live` node.

### Attachment Contracts (Single Uniform Options Object + `enabled`)

Every attachment takes a single options object and supports `enabled?: boolean | (() => boolean)` (`@default true`) resolved via `src/shared/resolve-getter.ts`:

1. **`dnd.draggable(options: DraggableOptions<TData>)`** (Free drag-and-drop items)
   - `id: DndId` (required)
   - `data?: TData`
   - `type?: string`
   - `axis?: DndAxis` — `@default "both"`
   - `requiresHandle?: boolean` — Auto-detects if omitted: if any enabled descendant carries `[data-dnd-handle]`, only handles initiate drag; otherwise the whole element initiates drag.
   - `activation?: Partial<DragActivationOptions>`
   - `label?: string` — Accessible item name for `aria-live` announcements.
   - `disabled?: boolean` — `@default false`
   - `enabled?: boolean | (() => boolean)` — `@default true`

2. **`dnd.sortable(options: SortableOptions<TData>)`** (1D list, Kanban, 2D grid, and Tree items; extends `DraggableOptions<TData>`)
   - `containerId: DndId` (required)
   - `index: number` (required)
   - `parentId?: DndId | null` — Tree parent reference (enables ancestor-cycle prevention).
   - `depth?: number` — Optional tree depth metadata.
   - `canNest?: boolean` — `@default false` (for `"tree"` layout: whether `"inside"` drop zone is valid on this node).
   - `expanded?: boolean` — `@default false` (for `"tree"` layout: whether node is currently expanded; collapsed nodes trigger `onExpandNode` after `expandDelay`).

3. **`dnd.droppable(options: DroppableOptions<TData, TDropData>)`** (Free dropzones & sortable/tree containers)
   - `id: DndId` (required)
   - `layout?: DndLayout` — `@default "free"` (`"free" | "list" | "grid" | "tree"`)
   - `orientation?: DndOrientation` — `@default "vertical"` (applies to `layout: "list"`)
   - `data?: TDropData`
   - `accepts?: readonly string[] | ((item: DndActiveItem<TData>, target: DndOverTarget<TDropData>) => boolean)` — Validates whether the active item can be dropped here.
   - `animate?: boolean` — `@default true` (per-container override for sibling FLIP animations).
   - `indicator?: boolean` — `@default false` for `"list"`/`"grid"`, `@default true` for `"tree"` (emits `data-drop-position` on target items).
   - `edgeZoneRatio?: number` — `@default 0.25` (for `"tree"`: top/bottom fraction mapped to `"before"`/`"after"`, middle mapped to `"inside"`).
   - `expandDelay?: number` — `@default 500` (ms hover on collapsed tree node before calling `onExpandNode`).
   - `onExpandNode?: (nodeId: DndId) => void`
   - `disabled?: boolean` — `@default false`
   - `enabled?: boolean | (() => boolean)` — `@default true`

4. **`dragHandle(options?: DragHandleOptions)` / `dnd.dragHandle(options?: DragHandleOptions)`**
   - `enabled?: boolean | (() => boolean)` — `@default true`
   - Marks the element with `data-dnd-handle=""` when enabled and applies `touch-action: none; user-select: none;`.

5. **`dnd.dragThumbnail(options?: DragThumbnailOptions)`**
   - `enabled?: boolean | (() => boolean)` — `@default true`
   - `align?: "grab" | "cursor"` — `@default "grab"` (preserves pointer grab offset vs. centers on pointer).
   - `offset?: { x?: number; y?: number }` — Optional pixel offset from pointer.
   - `animateSettle?: boolean` — `@default true` (WAAPI flight to target/origin on release).

### CSS Variables (`--cs-dnd-*`)

All library styles live in `dnd.attach.css` inside `@layer attachments`:
- **Thumbnail (`.cs-dnd-thumbnail`):**
  - `--cs-dnd-thumbnail-shadow` (`@default var(--cs-shadow-floating)`)
  - `--cs-dnd-thumbnail-scale` (`@default 1.02`)
  - `--cs-dnd-thumbnail-rotate` (`@default 0deg`)
  - `--cs-dnd-thumbnail-opacity` (`@default 1`)
  - `--cs-dnd-thumbnail-radius` (inherits element radius by default)
- **Origin Placeholder (`[data-dragging]`):**
  - `--cs-dnd-placeholder-opacity` (`@default 0.35`)
- **Dropzone Feedback (`[data-layout="free"][data-over]`):**
  - `--cs-dnd-drop-valid-bg` (`@default var(--cs-color-accent-soft)`)
  - `--cs-dnd-drop-valid-ring` (`@default var(--cs-color-accent-solid)`)
  - `--cs-dnd-drop-invalid-bg` (`@default var(--cs-color-negative-soft)`)
  - `--cs-dnd-drop-invalid-ring` (`@default var(--cs-color-negative-solid)`)
- **Drop Indicator (`[data-drop-position]`):**
  - `--cs-dnd-indicator-bg` (`@default var(--cs-color-accent-solid)`)
  - `--cs-dnd-indicator-thickness` (`@default 2px`)
  - `--cs-dnd-indicator-radius` (`@default var(--cs-radius-full)`)
  - `--cs-dnd-indicator-inside-bg` (`@default var(--cs-color-accent-soft)`)
- **Cursors:**
  - `--cs-dnd-handle-cursor` (`@default grab`)
  - `--cs-dnd-active-cursor` (`@default grabbing`)
- **Motion (read by WAAPI engine or overridden per scope):**
  - `--cs-dnd-pickup-dur` (`@default var(--cs-dur-160)`)
  - `--cs-dnd-pickup-ease` (`@default var(--cs-ease-quart-out)`)
  - `--cs-dnd-flip-dur` (`@default var(--cs-dur-240)`)
  - `--cs-dnd-flip-ease` (`@default var(--cs-ease-quart-out)`)
  - `--cs-dnd-settle-dur` (`@default var(--cs-dur-200)`)
  - `--cs-dnd-settle-ease` (`@default var(--cs-ease-quart-out)`)
  - `--cs-dnd-cancel-dur` (`@default var(--cs-dur-240)`)
  - `--cs-dnd-cancel-ease` (`@default var(--cs-ease-quart-out)`)

---

## 3. DOM, Semantics & Accessibility

### Native Elements & `data-*` Selectors

`dnd` never injects wrapper DOM around consumer items or containers. It decorates attached elements exclusively with standard boolean/enum `data-*` attributes:

| Element | Attribute | Type | Meaning |
| :--- | :--- | :--- | :--- |
| Draggable / Sortable | `data-pending` | boolean (`"" \| undefined`) | Present during `status === "pending"` only when `activation.delay > 0` (enables subtle press-and-hold readiness cue). |
| Draggable / Sortable | `data-dragging` | boolean (`"" \| undefined`) | Present on the real DOM element while it is the active dragged item (`dragging` or `settling`). |
| Draggable / Sortable | `data-disabled` | boolean | Present when `disabled: true` or `enabled: false`. |
| Drag Handle | `data-dnd-handle` | boolean | Marks an explicit drag handle (`touch-action: none; user-select: none;`). |
| Opt-out Descendant | `data-dnd-no-drag` | boolean | Consumer-authored attribute to exclude a non-interactive subtree from initiating drag. |
| Droppable / Container | `data-over` | boolean | Present while the active item is hovering over this droppable. |
| Droppable / Container | `data-drop-valid` | boolean | Present while `data-over` is active AND `accepts` validation passes. |
| Droppable / Container | `data-drop-invalid` | boolean | Present while `data-over` is active AND `accepts` validation fails. |
| Droppable / Container | `data-layout` | enum (`"free" \| "list" \| "grid" \| "tree"`) | Layout strategy of the droppable. |
| Droppable / Container | `data-orientation` | enum (`"vertical" \| "horizontal"`) | Present on `layout: "list"` droppables so horizontal `before`/`after` indicators orient vertically. |
| Target Sortable / Tree Item | `data-drop-position` | enum (`"before" \| "inside" \| "after"`) | Present when `indicator: true` (always on for `"tree"`, optional for `"list"`/`"grid"`). |
| Thumbnail Element | `data-status` | enum (`"dragging" \| "settling"`) | Current thumbnail flight state inside `.cs-dnd-thumbnail-host`. |
| `document.documentElement` | `data-dnd-active` | boolean | Present globally only while `status === "dragging" && inputMethod === "pointer"` (never during keyboard drag or `settling`). |

### Finite State Machine (FSM)

```
idle ──(valid pointerdown)──▶ pending ──(distance >= threshold OR delay elapsed)──▶ dragging
  ▲                              │                                                     │
  │                              └─(pointerup / pointercancel / Escape /               │
  │                                 drift > tolerance during delay)────────────────────┘
  │                                                                                    │
  │   idle ──(keyboard Space/Enter)──────────────────────────────────────────────────▶ dragging
  │                                                                                    │
  └──────────────────────────(WAAPI settle/cancel finished)◀── settling ◀──(drop / cancel)
```

### Keyboard Navigation & Screen Reader Accessibility

- **Focus & Semantics:**
  - If an explicit `dragHandle` is present, keyboard drag activation listens on the handle (recommended: native `<button type="button">`). Otherwise, it listens on the draggable element (setting `tabindex="0"` only if the element is not already natively focusable and lacks a `tabindex`).
  - Sets `aria-roledescription` (localized via `t({ de: "Ziehbares Element", en: "Draggable item" })`) and `aria-describedby` pointing to a shared visually-hidden instructions element (`"Press Space to pick up, Arrow keys to move, Space to drop, Escape to cancel."`).
  - Omits deprecated `aria-grabbed` / `aria-dropeffect`; all state transitions are announced via a shared visually-hidden `<div class="cs-dnd-announcer" role="status" aria-live="assertive" aria-atomic="true">`.
- **Key Bindings (when focused on draggable/handle):**
  - `Space` / `Enter`: Pick up (`idle -> dragging`, `inputMethod = "keyboard"`) or drop (`dragging -> settling -> idle`).
  - `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`:
    - **`list`:** Main-axis arrows reorder `-1` / `+1` (calling `onReorder` + WAAPI FLIP while preserving focus on the moved element). Cross-axis arrows in multi-container setups jump to adjacent compatible registered containers.
    - **`grid`:** `ArrowLeft`/`ArrowRight` move `-1`/`+1`; `ArrowUp`/`ArrowDown` move to the spatially nearest item in the row above/below using resting rects.
    - **`tree`:** `ArrowUp`/`ArrowDown` step through `before` -> `inside` -> `after` targets of visible nodes (skipping descendants of the dragged node); `ArrowRight`/`ArrowLeft` trigger expand/collapse or nesting change.
    - **`free`:** Arrow keys cycle through registered valid droppables.
  - `Escape`: Cancels the drag, reverts live-reordered state (via `onDragCancel` + origin metadata), announces cancellation, and restores focus to the item/handle.

---

## 4. Visual & Motion Contract

### Surface, Elevation & Indicators
- **Drag Thumbnail (Top Layer):**
  - Rendered inside a lazily mounted `<div class="cs-dnd-thumbnail-host" popover="manual" aria-hidden="true">` promoted via `showPopover()`. Resets UA popover margins/borders/backgrounds and covers the viewport with `pointer-events: none`.
  - Default auto-clone locks exact `width`/`height` from `getBoundingClientRect()`, strips `id` attributes (preventing duplicate DOM IDs), removes `[data-dragging]` so placeholder opacity does not leak into the ghost, and elevates with `--cs-shadow-floating` and subtle `--cs-dnd-thumbnail-scale` (`1.02`).
  - **Table Row (`<tr>`) Auto-Clone Fidelity:** Cloning a bare `<tr>` directly into a `<div>` host drops table column layout, `border-collapse`, `border-spacing`, and `table tr`/`tbody tr` selector matching. When `sourceEl.tagName === "TR"`:
    1. Measure `sourceEl.getBoundingClientRect()` (`rowRect`) and each direct `<td>`/`<th>` child's `getBoundingClientRect().width` **before** cloning.
    2. Clone the `<tr>` (stripping `id` and `data-dragging`) and write inline `width`, `min-width`, `max-width` (`${cellWidth}px`) + `box-sizing: border-box` onto each cloned `<td>`/`<th>` child.
    3. Wrap the cloned `<tr>` in a minimal `<table class="cs-dnd-thumbnail cs-dnd-thumbnail-table"><tbody>...</tbody></table>` shell with `table-layout: fixed; width: ${rowRect.width}px; margin: 0;` and `border-collapse` / `border-spacing` copied from `getComputedStyle(sourceEl.closest("table"))`. This preserves exact column widths (including `colspan`), cell `vertical-align`, and table CSS rules across browsers with zero anonymous-box quirks.
  - GPU positioning snaps coordinates via `Math.round()` (`translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`) to prevent subpixel text blur on GPU-promoted layers.
- **Origin Placeholder:**
  - The real element stays in flow holding its exact layout box with `data-dragging` (`opacity: var(--cs-dnd-placeholder-opacity)`). Consumers can customize placeholder appearance via `[data-dragging]` (e.g., sunken surface `--cs-color-sunken` + `--cs-shadow-sunken`).
- **Drop Indicators (Secondary / Tree / Non-Displacing Layouts):**
  - Primary feedback in `list` and `grid` is live WAAPI sibling displacement.
  - When `indicator: true` (default for `"tree"`, opt-in for `"list"`/`"grid"` such as `<table>` rows), `[data-drop-position="before" | "after"]` exposes crisp borderless `box-shadow` / pseudo-element accent lines (`--cs-dnd-indicator-bg`), and `[data-drop-position="inside"]` applies a soft accent highlight (`--cs-dnd-indicator-inside-bg`).
- **Cursors:**
  - Whole-element draggables keep `cursor: default` at rest (matching `design-and-tokens.md`); explicit `[data-dnd-handle]` elements use `cursor: var(--cs-dnd-handle-cursor, grab)` (reverting to `default` when `[data-disabled]`). During active pointer drags (`html[data-dnd-active]`), cursor locks globally to `var(--cs-dnd-active-cursor, grabbing)` and releases immediately upon entering `settling`.

### Custom WAAPI Engine (`waapi-flip.internal.ts`)

No `svelte/animate` `flip` and no CSS `transition` hacks (which collide with consumer transitions and lack deterministic completion promises):
1. **Sibling FLIP Displacement (Independent `translate` + `composite: "add"`):**
   - Before invoking `onReorder`, `waapiFlip.snapshot(containers)` captures each visible item's **live visual rect** (`getBoundingClientRect()`).
   - After consumer updates Svelte `$state` and Svelte flushes DOM (`queueMicrotask` / `tick()`), `waapiFlip.play(containers)` cancels any prior FLIP `Animation` on each moved item, reads its new **resting rect**, computes `(dx, dy)` from `prevVisual` to `nextResting` (normalizing by ancestor scale factor `rect.width / el.offsetWidth` when inside a CSS-scaled ancestor, defaulting to `1`), and starts an animation on the independent CSS `translate` property:
     ```ts
     el.animate(
       [{ translate: `${dx}px ${dy}px 0px` }, { translate: "0px 0px 0px" }],
       { duration, easing, composite: "add" },
     );
     ```
   - **Why `translate` + `composite: "add"` (not `transform`)?** In CSS Transforms Level 2, `translate` executes *before* `rotate`, `scale`, and `transform` (in parent coordinate space) and `composite: "add"` layers cleanly atop any consumer-authored `translate`, `scale`, `rotate`, or `transform` without ever overwriting them.
   - **Effect-Level Easing Invariant:** `easing` MUST be passed in the `KeyframeEffect` timing options object (never inside individual keyframes) so `anim.effect.getComputedTiming().progress` returns the exact eased progress.
   - Active FLIPs are tracked in `activeFlips = new WeakMap<HTMLElement, { anim: Animation; fromDx: number; fromDy: number }>()` and removed on `onfinish` / `oncancel`.
2. **Mid-Flight Interruption Handling (Zero Visual Jumps):**
   - Because `snapshot()` reads the **live interpolated visual rect** while an earlier WAAPI animation is mid-flight, and `play()` synchronously calls `prevAnim.cancel()` immediately before starting the new `el.animate()` in the same frame before paint, elements redirect smoothly from their exact interrupted coordinates with zero snapping or jumping.
3. **Drop-Settle & Cancel Snap-Back Flight:**
   - On drop (`dragging -> settling`), the engine measures the target item's final resting rect (after `onDrop` / DOM flush) and animates the Top-Layer thumbnail from its release coordinates to the target rect via `Element.animate()`.
   - On cancel (`Escape`, `pointercancel`, invalid free drop), the thumbnail animates back to the origin item's resting rect.
   - `await animation.finished` transitions `settling -> idle`, removes the thumbnail, and clears `data-dragging` so the real element reveals in place seamlessly.
4. **Reduced Motion (`prefers-reduced-motion: reduce`):**
   - Checked via `window.matchMedia("(prefers-reduced-motion: reduce)").matches`. When active (or `animate: false`), all FLIP displacements, settle flights, and cancel snap-backs skip `Element.animate()` and settle synchronously in 0ms.

---

## 5. Edge Cases & Constraints

### Anti-Glitch / Anti-Jitter Collision Architecture (Critical Invariants)

1. **Invariant Resting Layout Rects (`WeakMap` Fast-Path, Zero `getComputedStyle`):**
   - Collision detection NEVER hit-tests against animated visual rects of moving siblings.
   - `getRestingRect(el)` checks `activeFlips.get(el)` first:
     - **Fast path (non-animating items — majority of 200+ item lists):** Returns `el.getBoundingClientRect()` directly with **zero `getComputedStyle()` calls** and **zero matrix parsing**.
     - **Active FLIP path:** Reads `const progress = active.anim.effect?.getComputedTiming().progress ?? 0` (the eased WAAPI progress `[0, 1]`, or slightly outside `[0, 1]` during spring overshoot; `null` before first frame falls back to `0`), computes remaining FLIP offset `remDx = active.fromDx * (1 - progress)` and `remDy = active.fromDy * (1 - progress)`, and subtracts `(remDx, remDy)` from `el.getBoundingClientRect()`.
   - This is **100% immune** to consumer `transform: rotate(...)` / `scale(...)` on items, avoids layout-thrashing `getComputedStyle()` loops, and keeps viewport-relative coordinates automatically accurate across scroll positions.
2. **Directional Crossing, Hysteresis & Unequal-Size Swap Guard (No 1mm Oscillation):**
   - **Directional Crossing:** Track smoothed pointer travel direction `(dirX, dirY)`. In 1D lists, swaps with a subsequent sibling require crossing its midpoint + hysteresis in the forward direction; swaps with a preceding sibling require crossing in the reverse direction.
   - **Hysteresis Deadzone:** Crossing thresholds include a configurable `hysteresisPx` (`@default 6px`, bounded to `<= 20%` of target dimension) so micro-jitter around a 50% midpoint never oscillates.
   - **Unequal-Size Post-Swap Guard:** When swapping item `A` and item `B` with differing heights/widths (`size(A) !== size(B)`), the engine records a spatial guard for the pair `(A, B)` that blocks an immediate reverse swap until the pointer either reverses direction past the smaller item's far boundary or leaves the overlap zone.
3. **Empty-Container & Cross-Container Detection:**
   - Container hit-testing checks the pointer against each registered droppable's resting rect (preferring innermost nested droppable when containers overlap).
   - Dropping into an empty `list`/`grid` container resolves `index: 0` cleanly; dropping below the last item resolves `index: items.length`.
4. **Tree 3-Zone & Ancestor-Cycle Prevention:**
   - Vertical pointer ratio within a tree row maps to `before` (`[0, edgeZoneRatio)`), `inside` (`[edgeZoneRatio, 1 - edgeZoneRatio]` if `canNest`), and `after` (`(1 - edgeZoneRatio, 1]`). If `!canNest`, splits cleanly 50/50 between `before` and `after`.
   - Walks `parentId` links upward from any candidate target; if `active.id` is encountered as an ancestor (or `targetId === active.id`), the target is marked invalid (`data-drop-invalid`, drop blocked) so circular trees are impossible.
   - Hovering over a collapsed `canNest` node starts a single debounced timer (`expandDelay`, `@default 500ms`) that calls `onExpandNode(nodeId)` once and resets if the pointer leaves the node.

### Auto-Scroll Engine (`auto-scroll.internal.ts`)

- **Scroll-Ancestor Discovery:** Walks DOM ancestors checking `overflow-x`/`overflow-y` (`auto | scroll | overlay`) and scrollable overflow (`scrollHeight > clientHeight` or `scrollWidth > clientWidth`), plus `document.scrollingElement`. Works out-of-the-box with `.cs-scroll-area-content` (native `overflow: auto` + native `scroll` events) with zero cross-module coupling.
- **Delta-Time Normalized RAF Loop:** Uses `dt = Math.min((now - last) / 1000, 0.05)` so scroll velocity (`px/s`) is frame-rate independent (60Hz / 120Hz / 144Hz).
- **Non-Linear Acceleration:** Quadratic ramp `speed = minSpeed + (maxSpeed - minSpeed) * p²` where `p ∈ [0, 1]` is normalized edge penetration.
- **Initial-Edge Guard:** Records which edges the pointer already occupied at `pending -> dragging`. Scrolling toward a locked edge stays suppressed until the pointer leaves that edge zone or advances at least `8px` deeper toward the edge.
- **Continuous Collision Refresh:** Every scroll tick (auto-scroll or manual wheel scroll during drag) re-evaluates collision against updated viewport-relative resting rects at the current pointer coordinates.

### Pointer Events, Touch & Browser Quirks

- **Window-Level Move/Up Listeners (No Fragile Pointer Capture on Reparenting):** Moving a DOM element across containers in Chromium can silently release `setPointerCapture`. Therefore `pointermove`, `pointerup`, `pointercancel`, and `keydown` (`Escape`) are bound on `window` for the duration of `pending`/`dragging`, with `blur` and `visibilitychange` triggering a clean cancel.
- **Touch Scroll Coexistence:**
  - Explicit `dragHandle` elements apply `touch-action: none` so dragging a handle never scrolls the page.
  - Whole-element draggables with `delay > 0` keep normal touch scrolling possible: if the pointer moves more than `tolerance` px before `delay` elapses, `pending` aborts to `idle` and the browser scrolls naturally.
  - Whole-element draggables with `delay === 0` apply `touch-action: none` (or consumers can add a handle / `delay` for touch-scrollable lists).
- **Interactive-Element Guard:** Body-level `pointerdown` ignores events whose `composedPath()` / `closest()` hits `a[href], button, input, textarea, select, option, label, summary, [contenteditable]:not([contenteditable="false"]), [data-dnd-no-drag]` unless `ignoreInteractive: false` or initiated from a `dragHandle`.
- **Post-Drag Click Suppression:** After any completed or cancelled pointer drag, a one-shot capturing `click` listener on `window` (`{ capture: true, once: true }`, auto-cleared via `setTimeout(0)`) calls `preventDefault()` and `stopPropagation()` so releasing the pointer never accidentally triggers `onclick` or navigates links.
- **Browser Support:** Targets modern evergreen Chromium (Chrome primary) with native Pointer Events, Web Animations API (`Element.animate`, `composite: "add"` on CSS `translate`), and Popover API (`popover="manual"`). If `showPopover` is unavailable in a test/legacy environment, the thumbnail host degrades gracefully to `position: fixed; z-index: 2147483647;`.
