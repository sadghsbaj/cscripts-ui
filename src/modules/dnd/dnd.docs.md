---
name: Dnd
kind: attachment
import: cs/svelte/dnd
exports:
    - createDnd
    - DndController
    - setDndContext
    - getDndContext
    - dragHandle
    - arrayMove
    - arrayTransfer
    - DND_STATUSES
    - DND_LAYOUTS
    - DND_ORIENTATIONS
    - DND_DROP_POSITIONS
    - DND_AXES
    - DND_INPUT_METHODS
    - DND_CANCEL_REASONS
    - DndStatus
    - DndLayout
    - DndOrientation
    - DndDropPosition
    - DndAxis
    - DndInputMethod
    - DndCancelReason
    - DndId
    - DndPoint
    - DragActivationOptions
    - DndAutoScrollOptions
    - DndActiveItem
    - DndOverTarget
    - DndDragStartEvent
    - DndDragMoveEvent
    - DndDragOverEvent
    - DndReorderEvent
    - DndDropEvent
    - DndDragCancelEvent
    - DndDragEndEvent
    - DndAnnouncements
    - DraggableOptions
    - SortableOptions
    - DroppableOptions
    - DragHandleOptions
    - DragThumbnailOptions
    - DndOptions
---

# Dnd

## Overview

Attachment-first, zero-wrapper-component Drag & Drop engine for Svelte 5 (`createDnd`, `setDndContext` / `getDndContext`, `dragHandle`, `arrayMove`, `arrayTransfer`). Built from scratch on **Pointer Events** (no HTML5 `draggable="true"`), a custom **WAAPI (`Element.animate()`) FLIP & flight engine** using independent `translate` with `composite: "add"`, **Top-Layer `popover="manual"`** drag thumbnails, resting-rect collision with anti-jitter hysteresis, **`ScrollArea`-compatible** delta-time auto-scroll, and full keyboard + `aria-live` accessibility across `"list"`, `"grid"`, `"tree"`, and `"free"` layouts.

### Key Svelte 5 Notes

- **Instantiate or read context in `<script>`, never inside `{@attach}`:** Svelte 5 evaluates `{@attach expr}` inside a reactive effect outside component initialization. Always call `const dnd = createDnd(...)` or `const dnd = getDndContext()` at the top level of `<script>` and pass `dnd.draggable(...)`, `dnd.sortable(...)`, `dnd.droppable(...)`, `dnd.dragHandle(...)`, and `dnd.dragThumbnail(...)` into `{@attach ...}`. Standalone `dragHandle()` can be attached directly in any child component without `getDndContext()`.
- **`dnd.active` stays populated during `"settling"`:** When a drag ends, `dnd.active` remains non-null while `dnd.status === "settling"` and clears only when returning to `"idle"`. Conditional `{#if dnd.active}` custom thumbnails stay mounted for the entire drop-settle or cancel-snap-back WAAPI flight.

## API

### Controller & Context

#### `createDnd<TData = unknown, TDropData = unknown>(options?: DndOptions<TData, TDropData>): DndController<TData, TDropData>`

Creates a reactive `DndController` instance.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `activation` | `DragActivationOptions` | No | `{ distance: 6, delay: 0, tolerance: 6, ignoreInteractive: true }` | Pointer drag initiation thresholds and interactive-element guard. |
| `autoScroll` | `boolean \| DndAutoScrollOptions` | No | `true` | Enables or configures edge auto-scroll across native scrollable ancestors (including `ScrollArea`). |
| `animate` | `boolean` | No | `true` | Global toggle for WAAPI sibling FLIP, drop-settle, and cancel snap-back flights (always bypassed under `prefers-reduced-motion: reduce`). |
| `hysteresisPx` | `number` | No | `6` | Minimum deadzone margin in px around sibling midpoints to prevent boundary oscillation (clamped to `<= 20%` of target dimension). |
| `announcements` | `Partial<DndAnnouncements>` | No | Localized `en` / `de` | Overrides for keyboard instructions, `aria-roledescription`, and `aria-live` status messages. |
| `onDragStart` | `(event: DndDragStartEvent<TData>) => void` | No | `undefined` | Fires when a drag transitions to `"dragging"`. |
| `onDragMove` | `(event: DndDragMoveEvent<TData>) => void` | No | `undefined` | Fires on pointer movement while `"dragging"`. |
| `onDragOver` | `(event: DndDragOverEvent<TData, TDropData>) => void` | No | `undefined` | Fires whenever the resolved `over` target changes. |
| `onReorder` | `(event: DndReorderEvent<TData>) => void` | No | `undefined` | Live structural mutation hook for `"list"` and `"grid"` layouts (single- or multi-container). Never fires for `"free"` or `"tree"`. |
| `onDrop` | `(event: DndDropEvent<TData, TDropData>) => void` | No | `undefined` | Final commit hook firing once on valid release across all 4 layouts. |
| `onDragCancel` | `(event: DndDragCancelEvent<TData>) => void` | No | `undefined` | Fires when a drag is cancelled (`"escape"`, `"pointer-cancel"`, `"invalid-drop"`, `"programmatic"`). |
| `onDragEnd` | `(event: DndDragEndEvent<TData, TDropData>) => void` | No | `undefined` | Always fires once at the end of every drag, immediately after `onDrop` or `onDragCancel`. |

#### `DragActivationOptions`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `distance` | `number` | `6` | Euclidean pointer travel in px required to transition `pending -> dragging`. |
| `delay` | `number` | `0` | Press-and-hold duration in ms before activating drag. When `> 0`, emits `data-pending` and requires drift within `tolerance`. |
| `tolerance` | `number` | `6` | Maximum pointer drift in px allowed while the `delay` timer is running. |
| `ignoreInteractive` | `boolean` | `true` | Blocks body-level drag initiation when `pointerdown` targets interactive elements (`a[href]`, `button`, `input`, `textarea`, `select`, `option`, `label`, `summary`, `[contenteditable]`, `[data-dnd-no-drag]`). |

#### `DndAutoScrollOptions`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `edgeSize` | `number` | `48` | Scroll activation zone thickness in px (auto-clamped to `<= 25%` of container dimension). |
| `minSpeed` | `number` | `60` | Minimum auto-scroll velocity in px/s at the outer edge of the zone. |
| `maxSpeed` | `number` | `900` | Maximum auto-scroll velocity in px/s flush against the container edge. |
| `initialEdgeGuard` | `boolean` | `true` | Suppresses scrolling toward an edge already occupied by the pointer at drag start until the pointer leaves that zone or moves `>= 8px` deeper. |

#### `setDndContext` / `getDndContext`

- `setDndContext<TData = unknown, TDropData = unknown>(dnd: DndController<TData, TDropData>): DndController<TData, TDropData>`: Provides a `DndController` instance to descendant components via Svelte 5 context and returns it.
- `getDndContext<TData = unknown, TDropData = unknown>(): DndController<TData, TDropData>`: Retrieves the nearest ancestor `DndController` from Svelte 5 context (call in `<script>`).

### `DndController` State & Methods

| Member | Type | Description |
| :--- | :--- | :--- |
| `status` | `DndStatus` | Reactive FSM state: `"idle" \| "pending" \| "dragging" \| "settling"`. |
| `isDragging` | `boolean` | `true` when `status === "dragging"`. |
| `isSettling` | `boolean` | `true` when `status === "settling"`. |
| `active` | `DndActiveItem<TData> \| null` | Active dragged item metadata (remains populated through `"settling"`). |
| `over` | `DndOverTarget<TDropData> \| null` | Currently hovered droppable/item target, or `null`. |
| `pointer` | `DndPoint \| null` | Current viewport pointer coordinates `{ x, y }` during pointer drags. |
| `delta` | `DndPoint` | Pointer displacement `{ x, y }` from the drag start point. |
| `inputMethod` | `DndInputMethod \| null` | `"pointer" \| "keyboard" \| null`. |
| `isOver(droppableId)` | `(droppableId: DndId) => boolean` | Returns `true` when `over?.droppableId === droppableId`. |
| `isDraggingItem(id)` | `(id: DndId) => boolean` | Returns `true` when `id` is currently `"dragging"` or `"settling"`. |
| `cancel()` | `() => void` | Programmatically cancels a `"pending"` or `"dragging"` operation (triggers `"programmatic"` cancel snap-back). |
| `destroy()` | `() => void` | Tears down any active drag, global listeners, Top-Layer thumbnail host, and `aria-live` announcer. |

### Attachments

All attachments accept a single options object and support `enabled?: boolean | (() => boolean)` (default `true`).

#### `dnd.draggable(options: DraggableOptions<TData>): Attachment<HTMLElement>`

Attaches free drag behavior to an element.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `DndId` | Yes | — | Unique identifier for this item. |
| `data` | `TData` | No | `undefined` | Arbitrary consumer payload attached to `DndActiveItem.data`. |
| `type` | `string` | No | `undefined` | Item type string matched against `DroppableOptions.accepts`. |
| `axis` | `DndAxis` | No | `"both"` | Constrains drag movement: `"both" \| "x" \| "y"`. |
| `requiresHandle` | `boolean` | No | Auto-detect | When omitted, auto-detects: if any enabled descendant has `[data-dnd-handle]`, only handles initiate drag; otherwise the whole element initiates drag. |
| `activation` | `Partial<DragActivationOptions>` | No | Controller default | Per-item override for `distance`, `delay`, `tolerance`, and `ignoreInteractive`. |
| `label` | `string` | No | `aria-label` / text / `String(id)` | Accessible item name used in `aria-live` announcements. |
| `disabled` | `boolean` | No | `false` | Disables drag initiation and sets `data-disabled`. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Reactive enable/disable flag for the attachment. |

#### `dnd.sortable(options: SortableOptions<TData>): Attachment<HTMLElement>`

Extends `DraggableOptions<TData>` for items inside `"list"`, `"grid"`, or `"tree"` droppable containers.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `containerId` | `DndId` | Yes | — | `id` of the parent `droppable` container. |
| `index` | `number` | Yes | — | Zero-based index within the container's rendered items. |
| `parentId` | `DndId \| null` | No | `null` | Tree parent ID enabling ancestor-cycle prevention. |
| `depth` | `number` | No | `undefined` | Tree nesting depth metadata (also drives `--cs-dnd-target-depth` on drop indicators). |
| `canNest` | `boolean` | No | `false` | For `"tree"` layout: allows `"inside"` drop zone targeting on this node. |
| `expanded` | `boolean` | No | `false` | For `"tree"` layout: collapsed nodes (`!expanded`) trigger `onExpandNode` after `expandDelay`. |

#### `dnd.droppable(options: DroppableOptions<TData, TDropData>): Attachment<HTMLElement>`

Attaches dropzone or sortable/tree container behavior to an element.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `DndId` | Yes | — | Unique identifier for this droppable container. |
| `layout` | `DndLayout` | No | `"free"` | Collision and feedback strategy: `"free" \| "list" \| "grid" \| "tree"`. |
| `orientation` | `DndOrientation` | No | `"vertical"` | Main axis for `layout: "list"`: `"vertical" \| "horizontal"`. |
| `data` | `TDropData` | No | `undefined` | Arbitrary consumer payload exposed on `over.data` and `onDrop` (`droppableData`). |
| `accepts` | `readonly string[] \| ((item, target) => boolean)` | No | `undefined` | Validates whether the active item can be dropped here (array matches `item.type`). |
| `animate` | `boolean` | No | `true` | Per-container toggle for sibling WAAPI FLIP animations. |
| `indicator` | `boolean` | No | `false` (`"list"`/`"grid"`), `true` (`"tree"`) | Emits `data-drop-position` (`"before" \| "inside" \| "after"`) on target items. |
| `edgeZoneRatio` | `number` | No | `0.25` | For `"tree"` layout: top/bottom fraction mapped to `"before"`/`"after"` (middle mapped to `"inside"` when `canNest` is `true`). |
| `expandDelay` | `number` | No | `500` | Hover duration in ms on a collapsed tree node before calling `onExpandNode`. |
| `onExpandNode` | `(nodeId: DndId) => void` | No | `undefined` | Callback invoked after hovering a collapsed `canNest` tree node for `expandDelay` ms. |
| `disabled` | `boolean` | No | `false` | Disables dropping onto this container and sets `data-disabled`. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Reactive enable/disable flag for the attachment. |

#### `dragHandle(options?: DragHandleOptions)` / `dnd.dragHandle(options?: DragHandleOptions)`

Marks an element (recommended: `<button type="button">`) as an explicit drag handle (`data-dnd-handle`, `touch-action: none; user-select: none;`).

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean \| (() => boolean)` | `true` | When `false`, omits/removes `data-dnd-handle` so the handle does not initiate drag. |

#### `dnd.dragThumbnail(options?: DragThumbnailOptions): Attachment<HTMLElement>`

Promotes a custom Svelte element inside `{#if dnd.active}` into the Top-Layer thumbnail host instead of auto-cloning the source element.

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean \| (() => boolean)` | `true` | Enables or disables the custom thumbnail registration. |
| `align` | `"grab" \| "cursor"` | `"grab"` | `"grab"` preserves the pointer's grab offset inside the item; `"cursor"` centers on the pointer. |
| `offset` | `{ x?: number; y?: number }` | `undefined` | Optional pixel offset from the pointer coordinates. |
| `animateSettle` | `boolean` | `true` | Enables WAAPI settle/dissolve/cancel flight on release. |

### Event Contracts

- **`DndActiveItem<TData>`:** `{ id, type, data, containerId, index, originContainerId, originIndex, label }`
- **`DndOverTarget<TDropData>`:** `{ droppableId, itemId, containerId, index, position, isValid, data }`
- **`onDragStart` (`DndDragStartEvent<TData>`):** `{ item, inputMethod, pointer }`
- **`onDragMove` (`DndDragMoveEvent<TData>`):** `{ item, pointer, delta }`
- **`onDragOver` (`DndDragOverEvent<TData, TDropData>`):** `{ item, over }` (fires only when the resolved target changes)
- **`onReorder` (`DndReorderEvent<TData>`):** `{ item, fromContainerId, toContainerId, fromIndex, toIndex }`. Fires live during drag for `"list"` and `"grid"` layouts (automatically wrapped in WAAPI FLIP `snapshot()` -> `onReorder()` -> DOM flush -> `play()`). **Never fires** for `"free"` or `"tree"`.
- **`onDrop` (`DndDropEvent<TData, TDropData>`):** `{ item, droppableId, droppableData, originContainerId, originIndex, targetContainerId, targetIndex, targetItemId, position, didMove }`. Fires once on valid release across all 4 layouts:
  - `"free"`: primary drop action (`droppableId`, `droppableData`, `item`).
  - `"tree"`: sole structural commit hook (`targetItemId`, `position: "before" | "inside" | "after"`, `item`).
  - `"list"` / `"grid"`: fires once after release with `didMove: boolean` (ideal for persistence or undo history without spamming on every live `onReorder`).
- **`onDragCancel` (`DndDragCancelEvent<TData>`):** `{ item, originContainerId, originIndex, currentContainerId, currentIndex, reason }`, where `reason` is `"escape" | "pointer-cancel" | "invalid-drop" | "programmatic"`. Also wrapped in WAAPI FLIP `snapshot()`/`play()` so reverting live-reordered state animates smoothly back.
- **`onDragEnd` (`DndDragEndEvent<TData, TDropData>`):** `{ item, over, dropped, cancelReason? }`. Always fires once immediately after `onDrop` or `onDragCancel`.

### Pure Utilities

- **`arrayMove<T>(items: readonly T[], fromIndex: number, toIndex: number): T[]`**: Immutably moves an item within `items` from `fromIndex` to `toIndex` (clamped).
- **`arrayTransfer<T>(source: readonly T[], target: readonly T[], fromIndex: number, toIndex: number): { source: T[]; target: T[] }`**: Immutably removes `source[fromIndex]` and inserts it into `target` at `toIndex` (clamped).

### Exported Constants & Types

- `DND_STATUSES = ["idle", "pending", "dragging", "settling"] as const` (`DndStatus`)
- `DND_LAYOUTS = ["free", "list", "grid", "tree"] as const` (`DndLayout`)
- `DND_ORIENTATIONS = ["vertical", "horizontal"] as const` (`DndOrientation`)
- `DND_DROP_POSITIONS = ["before", "inside", "after"] as const` (`DndDropPosition`)
- `DND_AXES = ["both", "x", "y"] as const` (`DndAxis`)
- `DND_INPUT_METHODS = ["pointer", "keyboard"] as const` (`DndInputMethod`)
- `DND_CANCEL_REASONS = ["escape", "pointer-cancel", "invalid-drop", "programmatic"] as const` (`DndCancelReason`)
- `DndId = string | number`, `DndPoint`, `DndAnnouncements`, `DndOptions`, `DndController`, `DraggableOptions`, `SortableOptions`, `DroppableOptions`, `DragHandleOptions`, `DragThumbnailOptions`, `DragActivationOptions`, `DndAutoScrollOptions`, `DndActiveItem`, `DndOverTarget`, `DndDragStartEvent`, `DndDragMoveEvent`, `DndDragOverEvent`, `DndReorderEvent`, `DndDropEvent`, `DndDragCancelEvent`, `DndDragEndEvent`.

## Styling, `data-*` Selectors & CSS Tokens

All library styles live in `dnd.attach.css` inside `@layer attachments`.

### `data-*` Attributes

| Element | Attribute | Values / Type | Description |
| :--- | :--- | :--- | :--- |
| Draggable / Sortable | `data-dnd-item` | boolean (`""`) | Present on all attached draggable/sortable elements. |
| Draggable / Sortable | `data-pending` | boolean (`""`) | Present during `"pending"` **only** when `activation.delay > 0` (`scale: 0.985`). |
| Draggable / Sortable | `data-dragging` | boolean (`""`) | Present on the in-flow origin element while `"dragging"` or `"settling"`. |
| Draggable / Sortable / Droppable | `data-disabled` | boolean (`""`) | Present when `disabled: true` or `enabled: false` (also styled on `[data-dnd-handle][data-disabled]` if applied by the consumer). |
| Drag Handle | `data-dnd-handle` | boolean (`""`) | Marks an explicit drag handle (`cursor: grab; touch-action: none; user-select: none;`). |
| Opt-out Descendant | `data-dnd-no-drag` | boolean | Consumer-authored attribute excluding a non-interactive subtree from initiating body drag. |
| Droppable | `data-dnd-droppable` | boolean (`""`) | Present on all attached droppable containers. |
| Droppable | `data-layout` | `"free" \| "list" \| "grid" \| "tree"` | Layout strategy of the droppable. |
| Droppable (`list`) | `data-orientation` | `"vertical" \| "horizontal"` | Present on `layout: "list"` droppables. |
| Droppable | `data-over` | boolean (`""`) | Present while the active item is hovering over this droppable. |
| Droppable | `data-drop-valid` | boolean (`""`) | Present while `data-over` is active and `accepts` validation passes. |
| Droppable | `data-drop-invalid` | boolean (`""`) | Present while `data-over` is active and `accepts` validation fails. |
| Target Item | `data-drop-position` | `"before" \| "inside" \| "after"` | Emitted on hovered target items when `indicator: true` (default for `"tree"`, opt-in for `"list"`/`"grid"`). |
| Thumbnail Element | `data-status` | `"dragging" \| "settling"` | Current flight state on `.cs-dnd-thumbnail` inside `.cs-dnd-thumbnail-host`. |
| `<html>` (`document.documentElement`) | `data-dnd-active` | boolean (`""`) | Present globally **only** while `status === "dragging" && inputMethod === "pointer"` (locks `grabbing` cursor and `user-select: none`; never set during keyboard drag or `"settling"`). |

### CSS Custom Properties (`--cs-dnd-*`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-dnd-handle-cursor` | `grab` | Resting cursor on `[data-dnd-handle]`. |
| `--cs-dnd-active-cursor` | `grabbing` | Global cursor on `html[data-dnd-active]` during pointer drag. |
| `--cs-dnd-thumbnail-shadow` | `var(--cs-shadow-floating)` | Box-shadow on `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-scale` | `1.02` | Lift scale on `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-rotate` | `0deg` | Optional tilt angle on `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-opacity` | `1` | Opacity on `.cs-dnd-thumbnail`. |
| `--cs-dnd-thumbnail-radius` | `inherit` | Border-radius on `.cs-dnd-thumbnail`. |
| `--cs-dnd-placeholder-opacity` | `0.35` | Opacity of the in-flow origin placeholder (`[data-dnd-item][data-dragging]`). |
| `--cs-dnd-drop-valid-bg` | `var(--cs-color-accent-soft)` | Background on valid hovered `"free"` dropzones. |
| `--cs-dnd-drop-valid-ring` | `var(--cs-color-accent-solid)` | `2px` inset ring color on valid hovered `"free"` dropzones. |
| `--cs-dnd-drop-invalid-bg` | `var(--cs-color-negative-soft)` | Background on invalid hovered `"free"` dropzones. |
| `--cs-dnd-drop-invalid-ring` | `var(--cs-color-negative-solid)` | `2px` inset ring color on invalid hovered `"free"` dropzones. |
| `--cs-dnd-indicator-bg` | `var(--cs-color-accent-solid)` | Color of `before`/`after` indicator lines, tree anchor ring, and `inside` ring. |
| `--cs-dnd-indicator-thickness` | `2px` | Thickness of `before`/`after` indicator bar. |
| `--cs-dnd-indicator-radius` | `var(--cs-radius-full)` | Border-radius of `before`/`after` indicator bar. |
| `--cs-dnd-indicator-inside-bg` | `var(--cs-color-accent-soft)` | Fill color on `[data-drop-position="inside"]` tree nodes. |
| `--cs-dnd-tree-base-inset` | `12px` | Base leading padding before depth indentation on tree drop indicators. |
| `--cs-dnd-tree-indent` | `20px` | Horizontal step per depth level on tree drop indicators. |
| `--cs-dnd-indicator-dot-size` | `6px` | Diameter of the hollow leading anchor ring on tree `before`/`after` indicators (`0px` hides it). |
| `--cs-dnd-target-depth` | `0` *(dynamic)* | Target nesting depth written on the hovered tree item (`depth`, or `depth + 1` for expanded-folder `after`). |
| `--cs-dnd-indicator-inset-start` | `0px` *(tree: computed)* | Leading inset of `before`/`after` indicator bar (auto-computed in trees from `--cs-dnd-tree-base-inset` + `--cs-dnd-target-depth * --cs-dnd-tree-indent`). |
| `--cs-dnd-pickup-dur` | `var(--cs-dur-160)` | WAAPI thumbnail pickup lift duration. |
| `--cs-dnd-pickup-ease` | `var(--cs-ease-quart-out)` | WAAPI thumbnail pickup lift easing. |
| `--cs-dnd-flip-dur` | `var(--cs-dur-240)` | WAAPI sibling FLIP displacement duration. |
| `--cs-dnd-flip-ease` | `var(--cs-ease-quart-out)` | WAAPI sibling FLIP displacement easing. |
| `--cs-dnd-settle-dur` | `var(--cs-dur-200)` | WAAPI drop-settle flight duration. |
| `--cs-dnd-settle-ease` | `var(--cs-ease-quart-out)` | WAAPI drop-settle flight easing. |
| `--cs-dnd-cancel-dur` | `var(--cs-dur-240)` | WAAPI cancel snap-back flight duration. |
| `--cs-dnd-cancel-ease` | `var(--cs-ease-quart-out)` | WAAPI cancel snap-back flight easing. |

#### Recessed-Slot Placeholder Recipe

For elevated cards or Kanban tiles, turn `[data-dragging]` into a sunken tray while hiding inner content:

```css
.kanban-card[data-dragging] {
    opacity: 1;
    background-color: var(--cs-color-sunken);
    box-shadow: var(--cs-shadow-sunken);
}

.kanban-card[data-dragging] > * {
    opacity: 0;
}
```

## Examples

### 1D Sortable List (with `dragHandle`, `ScrollArea` & `onDragCancel` Revert)

`autoScroll` discovers native overflow scroll ancestors automatically—including `<ScrollAreaContent>`—with zero cross-module imports.

```svelte
<script lang="ts">
    import { GripVertical } from "@lucide/svelte";
    import { arrayMove, createDnd, dragHandle } from "cs/svelte/dnd";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";

    interface Task {
        id: string;
        title: string;
    }

    let tasks = $state<Task[]>([
        { id: "t-1", title: "Audit keyboard focus rings" },
        { id: "t-2", title: "Finalize onboarding illustrations" },
        { id: "t-3", title: "Migrate billing webhooks" },
    ]);

    const dnd = createDnd<Task>({
        onReorder: ({ fromIndex, toIndex }) => {
            tasks = arrayMove(tasks, fromIndex, toIndex);
        },
        onDragCancel: ({ currentIndex, originIndex }) => {
            if (currentIndex !== null && originIndex !== null && currentIndex !== originIndex) {
                tasks = arrayMove(tasks, currentIndex, originIndex);
            }
        },
    });
</script>

<ScrollArea size="md" direction="vertical" class="h-72 rounded-2xl bg-sunken">
    <ScrollAreaContent class="p-3">
        <ul class="flex flex-col gap-2" {@attach dnd.droppable({ id: "tasks", layout: "list" })}>
            {#each tasks as task, index (task.id)}
                <li
                    class="flex items-center gap-2 rounded-xl bg-elevated px-3 py-2.5 shadow-elevated select-none"
                    {@attach dnd.sortable({
                        id: task.id,
                        containerId: "tasks",
                        index,
                        data: task,
                        label: task.title,
                    })}
                >
                    <button
                        type="button"
                        aria-label="Reorder {task.title}"
                        class="flex-center size-6 rounded-md text-weak hover:text-main"
                        {@attach dragHandle()}
                    >
                        <GripVertical class="size-3.5" />
                    </button>
                    <span class="text-sm font-medium text-strong">{task.title}</span>
                </li>
            {/each}
        </ul>
    </ScrollAreaContent>
</ScrollArea>
```

### Multi-Container Kanban Board

Give empty columns a `min-height` (e.g. `min-h-36`) so empty droppables remain valid hit targets. Fast cross-column pointer sweeps are automatically velocity/intent-gated so middle columns do not flicker mid-flight, while releasing over a column synchronously flushes the transfer before `onDrop`.

```svelte
<script lang="ts">
    import { arrayMove, arrayTransfer, createDnd, type DndId } from "cs/svelte/dnd";

    type ColumnId = "todo" | "in-progress" | "done";
    interface CardItem {
        id: string;
        title: string;
    }

    let columns = $state<Record<ColumnId, CardItem[]>>({
        todo: [
            { id: "c-1", title: "Design invoice PDF" },
            { id: "c-2", title: "Add rate-limit headers" },
        ],
        "in-progress": [{ id: "c-3", title: "Workspace invite flow" }],
        done: [],
    });

    function moveCard(fromId: DndId, toId: DndId, fromIndex: number, toIndex: number): void {
        const fromCol = fromId as ColumnId;
        const toCol = toId as ColumnId;
        if (fromCol === toCol) {
            columns[fromCol] = arrayMove(columns[fromCol], fromIndex, toIndex);
        } else {
            const { source, target } = arrayTransfer(columns[fromCol], columns[toCol], fromIndex, toIndex);
            columns[fromCol] = source;
            columns[toCol] = target;
        }
    }

    const dnd = createDnd<CardItem>({
        onReorder: ({ fromContainerId, toContainerId, fromIndex, toIndex }) => {
            moveCard(fromContainerId, toContainerId, fromIndex, toIndex);
        },
        onDragCancel: ({ currentContainerId, originContainerId, currentIndex, originIndex }) => {
            if (
                currentContainerId !== null &&
                originContainerId !== null &&
                currentIndex !== null &&
                originIndex !== null &&
                (currentContainerId !== originContainerId || currentIndex !== originIndex)
            ) {
                moveCard(currentContainerId, originContainerId, currentIndex, originIndex);
            }
        },
        onDrop: ({ didMove, targetContainerId, targetIndex }) => {
            if (didMove) {
                // Persist final column & index to backend
                console.log("Saved to", targetContainerId, targetIndex);
            }
        },
    });
</script>

<div class="grid grid-cols-3 gap-4">
    {#each ["todo", "in-progress", "done"] as const as colId (colId)}
        <div
            class="flex min-h-36 flex-col gap-2 rounded-2xl bg-sunken p-3"
            {@attach dnd.droppable({ id: colId, layout: "list", orientation: "vertical" })}
        >
            {#each columns[colId] as card, index (card.id)}
                <article
                    class="rounded-xl bg-elevated p-3 shadow-elevated select-none"
                    {@attach dnd.sortable({ id: card.id, containerId: colId, index, data: card, label: card.title })}
                >
                    {card.title}
                </article>
            {/each}
        </div>
    {/each}
</div>
```

### 2D Grid

```svelte
<script lang="ts">
    import { arrayMove, createDnd } from "cs/svelte/dnd";

    let widgets = $state([
        { id: "w-1", label: "Active Users", value: "14,820" },
        { id: "w-2", label: "Monthly Revenue", value: "$68.4k" },
        { id: "w-3", label: "Avg. Latency", value: "42 ms" },
        { id: "w-4", label: "Uptime", value: "99.98%" },
    ]);

    const dnd = createDnd({
        onReorder: ({ fromIndex, toIndex }) => {
            widgets = arrayMove(widgets, fromIndex, toIndex);
        },
    });
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3" {@attach dnd.droppable({ id: "widgets", layout: "grid" })}>
    {#each widgets as widget, index (widget.id)}
        <article
            class="rounded-2xl bg-base p-4 shadow-elevated select-none"
            {@attach dnd.sortable({ id: widget.id, containerId: "widgets", index, data: widget, label: widget.label })}
        >
            <div class="text-xs text-weak">{widget.label}</div>
            <div class="mt-1 text-lg font-semibold text-strong">{widget.value}</div>
        </article>
    {/each}
</div>
```

### Nested Tree (`layout: "tree"`)

Tree containers never fire `onReorder` during hover; all structural commits happen once in `onDrop` via `targetItemId` and `position` (`"before" | "inside" | "after"`). Note that dropping `"after"` an expanded folder (`canNest && expanded`) targets its first child (`depth + 1`).

```svelte
<script lang="ts">
    import { createDnd, type DndId } from "cs/svelte/dnd";

    interface TreeNode {
        id: string;
        name: string;
        kind: "folder" | "file";
        parentId: string | null;
        expanded?: boolean;
    }

    let nodes = $state<TreeNode[]>([
        { id: "f-1", name: "Design System", kind: "folder", parentId: null, expanded: true },
        { id: "n-1", name: "tokens.json", kind: "file", parentId: "f-1" },
        { id: "f-2", name: "Archive", kind: "folder", parentId: null, expanded: false },
        { id: "n-2", name: "legacy.css", kind: "file", parentId: "f-2" },
    ]);

    function flattenVisible(list: readonly TreeNode[], parentId: string | null = null, depth = 0) {
        const rows: { node: TreeNode; depth: number }[] = [];
        for (const node of list) {
            if (node.parentId !== parentId) continue;
            rows.push({ node, depth });
            if (node.kind === "folder" && node.expanded) {
                rows.push(...flattenVisible(list, node.id, depth + 1));
            }
        }
        return rows;
    }

    const visibleRows = $derived(flattenVisible(nodes));

    function expandNode(nodeId: DndId): void {
        nodes = nodes.map((n) => (n.id === String(nodeId) && n.kind === "folder" ? { ...n, expanded: true } : n));
    }

    const dnd = createDnd<TreeNode>({
        onDrop: ({ item, targetItemId, position }) => {
            if (!targetItemId || !position) return;
            const draggedId = String(item.id);
            const targetId = String(targetItemId);
            const dragged = nodes.find((n) => n.id === draggedId);
            const target = nodes.find((n) => n.id === targetId);
            if (!dragged || !target || draggedId === targetId) return;

            const isExpandedFolder = target.kind === "folder" && Boolean(target.expanded);
            const nestIntoTarget =
                (position === "inside" && target.kind === "folder") || (position === "after" && isExpandedFolder);
            const nextParentId = nestIntoTarget ? target.id : target.parentId;

            const remaining = nodes.filter((n) => n.id !== draggedId);
            const targetIdx = remaining.findIndex((n) => n.id === targetId);
            if (targetIdx === -1) return;

            remaining.splice(position === "before" ? targetIdx : targetIdx + 1, 0, {
                ...dragged,
                parentId: nextParentId,
            });
            nodes = remaining.map((n) =>
                position === "inside" && n.id === targetId && n.kind === "folder" ? { ...n, expanded: true } : n,
            );
        },
    });
</script>

<div
    class="flex flex-col gap-0.5 rounded-2xl bg-sunken p-2"
    style="--cs-dnd-tree-base-inset: 10px; --cs-dnd-tree-indent: 20px;"
    {@attach dnd.droppable({ id: "tree", layout: "tree", expandDelay: 500, onExpandNode: expandNode })}
>
    {#each visibleRows as row, index (row.node.id)}
        <div
            class="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm select-none"
            style="padding-inline-start: {row.depth * 20 + 10}px;"
            {@attach dnd.sortable({
                id: row.node.id,
                containerId: "tree",
                index,
                parentId: row.node.parentId,
                depth: row.depth,
                canNest: row.node.kind === "folder",
                expanded: Boolean(row.node.expanded),
                data: row.node,
                label: row.node.name,
            })}
        >
            {row.node.name}
        </div>
    {/each}
</div>
```

### Free Dropzones & Custom Thumbnail

Free dropzones emit `data-over` + `data-drop-valid` / `data-drop-invalid` automatically based on `accepts`. When a dropped item is removed/unmounted in `onDrop`, the thumbnail plays `animateDissolve` in place instead of flying back to a missing element.

```svelte
<script lang="ts">
    import { createDnd } from "cs/svelte/dnd";

    interface Asset {
        id: string;
        name: string;
        type: "image" | "doc";
    }

    let assets = $state<Asset[]>([
        { id: "a-1", name: "Hero.png", type: "image" },
        { id: "a-2", name: "Brief.pdf", type: "doc" },
    ]);

    const dnd = createDnd<Asset>({
        onDrop: ({ item, droppableId }) => {
            if (droppableId === "media" || droppableId === "trash") {
                assets = assets.filter((a) => a.id !== item.id);
            }
        },
    });
</script>

<div class="flex gap-2">
    {#each assets as asset (asset.id)}
        <div
            class="rounded-xl bg-base px-3 py-2 shadow-elevated select-none"
            {@attach dnd.draggable({ id: asset.id, type: asset.type, data: asset, label: asset.name })}
        >
            {asset.name}
        </div>
    {/each}
</div>

<div class="mt-4 grid grid-cols-2 gap-4">
    <div class="rounded-2xl bg-sunken p-6 text-center" {@attach dnd.droppable({ id: "media", layout: "free", accepts: ["image"] })}>
        Media Library (images only)
    </div>
    <div class="rounded-2xl bg-sunken p-6 text-center" {@attach dnd.droppable({ id: "trash", layout: "free", accepts: ["image", "doc"] })}>
        Trash
    </div>
</div>

{#if dnd.active}
    <div
        class="rounded-full bg-elevated px-3.5 py-1.5 text-xs font-medium text-strong"
        {@attach dnd.dragThumbnail({ align: "cursor", offset: { x: 14, y: 14 } })}
    >
        {dnd.active.data.name}
    </div>
{/if}
```

### Sortable Table (`<tr>`)

Setting `indicator: true` on `tbody` renders crisp inset `box-shadow` drop lines on `<tr>` elements, while auto-cloning wraps the dragged `<tr>` in a fixed-layout `<table class="cs-dnd-thumbnail cs-dnd-thumbnail-table">` that locks every cell width and preserves source `<table>` typography.

```svelte
<script lang="ts">
    import { GripVertical } from "@lucide/svelte";
    import { arrayMove, createDnd, dragHandle } from "cs/svelte/dnd";

    let rows = $state([
        { id: "r-1", feature: "Pointer drag engine", owner: "Lukas" },
        { id: "r-2", feature: "OAuth device login", owner: "Elena" },
    ]);

    const dnd = createDnd({
        onReorder: ({ fromIndex, toIndex }) => {
            rows = arrayMove(rows, fromIndex, toIndex);
        },
    });
</script>

<table class="w-full border-collapse text-left text-sm">
    <tbody {@attach dnd.droppable({ id: "table", layout: "list", indicator: true })}>
        {#each rows as row, index (row.id)}
            <tr {@attach dnd.sortable({ id: row.id, containerId: "table", index, data: row, label: row.feature })}>
                <td class="w-10 px-3 py-2">
                    <button type="button" aria-label="Reorder {row.feature}" {@attach dragHandle()}>
                        <GripVertical class="size-3.5" />
                    </button>
                </td>
                <td class="px-3 py-2 font-medium">{row.feature}</td>
                <td class="px-3 py-2 text-weak">{row.owner}</td>
            </tr>
        {/each}
    </tbody>
</table>
```

## Accessibility & Keyboard Controls

- **Focus & ARIA:** When an explicit `dragHandle` is present, keyboard listeners attach to the handle (prefer `<button type="button">`). Otherwise, `dnd` attaches to the draggable item and adds `tabindex="0"` only if the element is not natively focusable and lacks a `tabindex`. Every item receives `aria-roledescription` (default `"Draggable item"` / `"Ziehbares Element"`) and `aria-describedby` pointing to a shared visually-hidden instructions node.
- **Key Bindings:**
  - `Space` / `Enter`: Pick up (`idle -> dragging`, `inputMethod = "keyboard"`) or drop (`dragging -> settling -> idle`).
  - `Escape`: Cancels the active drag (`reason: "escape"`), triggers `onDragCancel`, and restores focus to the item/handle.
  - `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight`:
    - **`list`:** Main-axis arrows move `-1` / `+1`; cross-axis arrows jump to adjacent compatible containers in multi-container setups.
    - **`grid`:** `ArrowLeft` / `ArrowRight` move `-1` / `+1`; `ArrowUp` / `ArrowDown` move to the spatially nearest item in the row above/below.
    - **`tree`:** `ArrowUp` / `ArrowDown` step through `before` -> `inside` -> `after` positions of visible nodes (skipping descendants of the dragged node); `ArrowRight` / `ArrowLeft` expand/collapse or adjust nesting.
    - **`free`:** Arrow keys cycle through registered valid droppables.
- **Localized `aria-live` Announcements:** State transitions (`onDragStart`, `onDragOver`, `onDrop`, `onDragCancel`) announce into a shared visually-hidden `.cs-dnd-announcer` (`role="status"`, `aria-live="assertive"`). Override any message or `instructions` / `roleDescription` via `createDnd({ announcements: { ... } })`.

## Behavior & Quirks

- **Resting-Rect Collision & Anti-Jitter:** Collision detection never hit-tests against mid-flight animated sibling rects (`getRestingRect` subtracts remaining WAAPI FLIP displacement via `WeakMap` with zero `getComputedStyle` loops). Combined with `hysteresisPx` (`6px`) and an unequal-size post-swap guard, rapid pointer movement near boundaries never oscillates.
- **Cross-Container Velocity / Intent Gating:** Intra-container sorting is instant, while cross-container `onReorder` is gated by pointer speed and travel axis (`<= 100 px/s` instant, `100–240 px/s` `45ms` dwell, `240–320 px/s` `120ms` dwell, `> 320 px/s` or fast horizontal sweep suppressed) so dragging across middle Kanban columns stays calm. Releasing over a gated column flushes the transfer synchronously before `onDrop`.
- **Touch Scroll Coexistence & Interactive Guard:** Whole-element draggables with `activation.delay === 0` set `touch-action: none`; set `activation: { delay: 180, tolerance: 6 }` (or use `dragHandle`) for touch-scrollable lists. Body-level `pointerdown` ignores interactive descendants unless `ignoreInteractive: false`, and a one-shot capturing `click` suppressor prevents accidental clicks on pointer release.
- **Top-Layer Thumbnails & `<tr>` Fidelity:** Auto-cloning locks exact integer `width`/`height` (`Math.round`), strips `id` / `data-dragging` / `data-pending`, rounds `translate3d` coordinates to whole pixels, and wraps `<tr>` clones in a fixed-layout `<table><tbody>` inheriting `border-collapse`, `border-spacing`, and table typography.
