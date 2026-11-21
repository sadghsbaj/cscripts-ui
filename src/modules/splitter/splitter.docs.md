---
name: Splitter
kind: component
import: cs/svelte/splitter
exports:
  - Splitter
  - SplitterPane
  - SplitterHandle
  - getSplitterContext
  - setSplitterContext
  - hasSplitterContext
  - SPLITTER_ORIENTATIONS
  - SPLITTER_VARIANTS
  - SPLITTER_SIZES
  - SPLITTER_DOUBLE_CLICK_ACTIONS
  - SplitterContext
  - SplitterOrientation
  - SplitterVariant
  - SplitterSize
  - SplitterDoubleClickAction
  - SplitterExtent
  - SplitterPaneSnapshot
  - SplitterResizeEvent
  - SplitterProps
  - SplitterPaneProps
  - SplitterHandleProps
---

# Splitter

## Overview

Compound resizable multi-pane layout (`<Splitter>`, `<SplitterPane>`, `<SplitterHandle>`) supporting horizontal and vertical orientations, three divider variants (`"subtle"`, `"elevated"`, `"transparent"`), three size scales (`"sm"`, `"md"`, `"lg"`), collapsible panes, `id`-based extent memory across `{#if}` remounts, nested 2D splits, and WAI-ARIA keyboard navigation.

## API

### `Splitter` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `SplitterVariant` | Yes | — | Handle/divider variant: `"subtle" \| "elevated" \| "transparent"`. |
| `size` | `SplitterSize` | Yes | — | Handle track and grip pill size scale: `"sm" \| "md" \| "lg"`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |
| `orientation` | `SplitterOrientation` | No | `"horizontal"` | Split axis: `"horizontal"` (side-by-side) or `"vertical"` (stacked). |
| `animate` | `boolean` | No | `true` | Enables `flex-basis` transitions on programmatic collapse/expand, keyboard collapse/expand, and double-click reset. |
| `disabled` | `boolean` | No | `false` | Disables all `<SplitterHandle>` instances in this splitter. |
| `onResize` | `(event: SplitterResizeEvent) => void` | No | `undefined` | Fired during pointer drag and on keyboard steps, jumps, collapse toggles, and double-click resets. |
| `onResizeEnd` | `(event: SplitterResizeEvent) => void` | No | `undefined` | Fired when pointer drag ends or after keyboard steps, jumps, collapse toggles, and double-click resets complete. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-splitter`. |
| `children` | `Snippet` | No | `undefined` | `<SplitterPane>` and `<SplitterHandle>` elements. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, "children">` | No | — | Forwarded to the root `<div>`. |

### `SplitterPane` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the pane `<div>`. |
| `id` | `string` | No | `$props.id()` | Explicit pane ID. Enables `id`-based extent memory across `{#if}` unmount/remount when uncontrolled. |
| `extent` | `SplitterExtent` | No | `undefined` | `$bindable` controlled extent (`number` as `%`, `` `${number}%` ``, or `` `${number}px` ``). Overrides `defaultExtent` and `id` memory. |
| `defaultExtent` | `SplitterExtent` | No | `undefined` | Initial uncontrolled extent (and target extent for `doubleClickAction="reset"`). Panes without `extent` or `defaultExtent` share remaining space equally. |
| `min` | `SplitterExtent` | No | `"0px"` | Minimum extent when expanded. |
| `max` | `SplitterExtent` | No | `"100%"` | Maximum extent when expanded. |
| `collapsible` | `boolean` | No | `false` | Allows collapsing to `collapsedExtent` via drag threshold, `Home`, `Enter`, `doubleClickAction="collapse"`, or `bind:collapsed`. |
| `collapsed` | `boolean` | No | `false` | `$bindable` collapsed state. |
| `collapsedExtent` | `SplitterExtent` | No | `"0px"` | Extent when collapsed. Sets `inert` on the pane when `<= 0`. |
| `collapseThreshold` | `number` | No | `0.5` | Fraction (`0`–`1`) between `collapsedExtent` and `min` where dragging snaps between collapsed and expanded. |
| `onCollapseChange` | `(collapsed: boolean) => void` | No | `undefined` | Fired when user interaction (drag, keyboard, or double-click) toggles `collapsed`. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-splitter-pane`. |
| `children` | `Snippet` | No | `undefined` | Pane content. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, "children">` | No | — | Forwarded to the pane `<div>`. |

### `SplitterHandle` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children" | "role">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the handle `<div>`. |
| `variant` | `SplitterVariant` | No | Inherited | Overrides root `variant` for this handle: `"subtle" \| "elevated" \| "transparent"`. |
| `size` | `SplitterSize` | No | Inherited | Overrides root `size` for this handle: `"sm" \| "md" \| "lg"`. |
| `disabled` | `boolean` | No | `false` | Disables this handle (also disabled when root `Splitter` has `disabled={true}`). |
| `keyboardStep` | `SplitterExtent` | No | `"16px"` | Resize step for `ArrowLeft`/`ArrowRight` (horizontal) or `ArrowUp`/`ArrowDown` (vertical). |
| `keyboardStepLarge` | `SplitterExtent` | No | `"64px"` | Resize step when holding `Shift` with an arrow key. |
| `doubleClickAction` | `SplitterDoubleClickAction` | No | `"reset"` | Double-click behavior: `"reset"` (restore `defaultExtent` / 50–50 and uncollapse), `"collapse"` (toggle first collapsible adjacent pane), or `"none"`. |
| `label` | `string` | No | Localized (`"Resize panes"` / `"Größe der Bereiche anpassen"`) | Accessible `aria-label` on the `role="separator"` element. |
| `class` | `ClassValue` | No | `undefined` | Additional classes merged with `.cs-splitter-handle`. |
| `children` | `Snippet<[{ dragging: boolean; orientation: SplitterOrientation }]>` | No | `undefined` | Custom handle content; defaults to `<span class="cs-splitter-handle-pill" aria-hidden="true"></span>`. |
| `...rest` | `Omit<HTMLAttributes<HTMLDivElement>, "children" | "role">` | No | — | Forwarded to the handle `<div>` (`onpointerdown`, `onpointermove`, `onpointerup`, `onpointercancel`, `onkeydown`, `ondblclick` run before internal handlers). |

### Context Helpers & Types
- **`getSplitterContext(): SplitterContext`**: Retrieves the parent `SplitterContext` inside custom descendants.
- **`setSplitterContext(context: SplitterContext): SplitterContext`**: Sets a `SplitterContext` in the current component scope.
- **`hasSplitterContext(): boolean`**: Returns `true` when called inside a `<Splitter>` tree.
- **`SplitterResizeEvent`**: `{ panes: SplitterPaneSnapshot[] }`, where each `SplitterPaneSnapshot` is `{ id: string; extentPx: number; extentPercent: number; collapsed: boolean }`.
- **Option Constants**: `SPLITTER_ORIENTATIONS`, `SPLITTER_VARIANTS`, `SPLITTER_SIZES`, `SPLITTER_DOUBLE_CLICK_ACTIONS`.

### `data-*` Attributes
- **`Splitter` (`.cs-splitter`)**: `data-orientation={orientation}`, `data-variant={variant}`, `data-size={size}`, `data-animate` (when `animate` is `true`), `data-animating` (during animated programmatic/keyboard/double-click transitions), `data-dragging` (during pointer drag), `data-disabled` (when `disabled` is `true`).
- **`SplitterPane` (`.cs-splitter-pane`)**: `data-collapsed` (when collapsed), `data-sized` (when `flex-basis` is resolved or specified).
- **`SplitterHandle` (`.cs-splitter-handle`)**: `data-orientation={orientation}`, `data-variant={effectiveVariant}`, `data-size={effectiveSize}`, `data-dragging` (while actively dragged), `data-disabled` (when handle or root is disabled).
- **Document Root (`<html>`)**: `data-splitter-dragging="horizontal" | "vertical"` while a pointer drag is active to lock cursor and `user-select: none` globally.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-splitter-pane-basis` | Computed (`px` / `%`) | Inline `flex-basis` applied to `.cs-splitter-pane[data-sized]`. |
| `--cs-splitter-handle-size` | `4px` / `6px` / `8px` (`1px` / `1px` / `2px` on `subtle`) | Handle track thickness (`sm` / `md` / `lg`). |
| `--cs-splitter-handle-hit-size` | `12px` / `14px` / `16px` | Invisible pointer hit-target thickness (`::before`). |
| `--cs-splitter-pill-length` | `20px` / `28px` / `36px` | Grip pill length along the handle axis. |
| `--cs-splitter-pill-thickness` | `3px` / `4px` / `5px` | Grip pill thickness perpendicular to the handle axis. |
| `--cs-splitter-handle-bg` | `var(--cs-color-base-soft)` (`transparent` on `transparent`) | Resting handle track background. |
| `--cs-splitter-handle-bg-hover` | `var(--cs-color-base-soft-hover)` (`transparent` on `transparent`) | Handle track hover background. |
| `--cs-splitter-handle-bg-active` | `var(--cs-color-accent-soft-fg)` (`subtle`) / `var(--cs-color-accent-soft)` (`elevated`, `transparent`) | Handle track focus/drag background. |
| `--cs-splitter-pill-bg` | `transparent` (`subtle`, `transparent`) / `var(--cs-color-text-weaker)` (`elevated`) | Resting grip pill background. |
| `--cs-splitter-pill-bg-hover` | `var(--cs-color-text-weak)` (`subtle`, `transparent`) / `var(--cs-color-text-main)` (`elevated`) | Grip pill hover background. |
| `--cs-splitter-pill-bg-active` | `var(--cs-color-accent-solid)` | Grip pill focus/drag background. |
| `--cs-splitter-pill-opacity-rest` | `0` (`subtle`, `transparent`) / `1` (`elevated`) | Resting grip pill opacity. |
| `--cs-splitter-pill-scale-rest` | `0.75` (`subtle`, `transparent`) / `1` (`elevated`) | Resting grip pill scale. |
| `--cs-splitter-pill-scale-hover` | `1` (`subtle`, `transparent`) / `1.04` (`elevated`) | Hover grip pill scale. |
| `--cs-splitter-hover-delay` | `var(--cs-dur-80)` | Delay before hover reveal on handle and grip pill. |
| `--cs-splitter-radius` | `var(--cs-radius-full)` | Grip pill border radius. |
| `--cs-splitter-transition-dur` | `var(--cs-dur-200)` | `flex-basis` transition duration when `data-animate` and `data-animating` are present. |
| `--cs-splitter-transition-ease` | `var(--cs-ease-quart-out)` | `flex-basis` transition easing when `data-animate` and `data-animating` are present. |

## Examples

### Basic Two-Pane Split
```svelte
<script lang="ts">
    import { Splitter, SplitterHandle, SplitterPane } from "cs/svelte/splitter";
</script>

<div class="h-80">
    <Splitter variant="subtle" size="md">
        <SplitterPane defaultExtent="240px" min="160px" max="360px">
            Sidebar
        </SplitterPane>
        <SplitterHandle label="Resize sidebar" />
        <SplitterPane min="240px">
            Main content
        </SplitterPane>
    </Splitter>
</div>
```

### Dynamic `{#if}` Panes with `id` Memory & Collapse
```svelte
<script lang="ts">
    import { Splitter, SplitterHandle, SplitterPane } from "cs/svelte/splitter";

    let showSidebar = $state(true);
    let sidebarCollapsed = $state(false);
</script>

<div class="h-96">
    <Splitter variant="subtle" size="md">
        {#if showSidebar}
            <SplitterPane
                id="workspace-sidebar"
                defaultExtent="220px"
                min="160px"
                max="340px"
                collapsible
                bind:collapsed={sidebarCollapsed}
            >
                Sidebar
            </SplitterPane>
            <SplitterHandle label="Resize sidebar" />
        {/if}

        <SplitterPane id="workspace-main" min="240px">
            Editor
        </SplitterPane>
    </Splitter>
</div>
```

### Controlled Extents & Resize Events
```svelte
<script lang="ts">
    import { Splitter, SplitterHandle, SplitterPane } from "cs/svelte/splitter";

    let navExtent = $state("30%");
</script>

<div class="h-64">
    <Splitter
        variant="elevated"
        size="md"
        onResizeEnd={(e) => {
            console.log(e.panes);
        }}
    >
        <SplitterPane bind:extent={navExtent} min="120px" max="50%">
            Navigation
        </SplitterPane>
        <SplitterHandle />
        <SplitterPane min="160px">
            Details
        </SplitterPane>
    </Splitter>
</div>
```

### 2D Nested Split
```svelte
<script lang="ts">
    import { Splitter, SplitterHandle, SplitterPane } from "cs/svelte/splitter";
</script>

<div class="h-96">
    <Splitter variant="subtle" size="md">
        <SplitterPane defaultExtent="200px" min="140px">
            Explorer
        </SplitterPane>
        <SplitterHandle label="Resize explorer" />
        <SplitterPane min="240px">
            <Splitter orientation="vertical" variant="subtle" size="sm">
                <SplitterPane defaultExtent="70%" min="100px">
                    Code
                </SplitterPane>
                <SplitterHandle label="Resize terminal" />
                <SplitterPane min="72px">
                    Terminal
                </SplitterPane>
            </Splitter>
        </SplitterPane>
    </Splitter>
</div>
```

## Behavior & Quirks

- **WAI-ARIA & Keyboard Navigation:** `SplitterHandle` renders `role="separator"` with `tabindex={0}` (`-1` when disabled), `aria-orientation` perpendicular to the split axis (`"vertical"` for horizontal splitters, `"horizontal"` for vertical splitters), `aria-controls` referencing the preceding pane's `id`, and `aria-valuenow` / `aria-valuemin` / `aria-valuemax` as integer percentages (`0`–`100`) of the adjacent pane pair.
  - `ArrowLeft` / `ArrowRight` (horizontal) or `ArrowUp` / `ArrowDown` (vertical) resizes by `keyboardStep` (`"16px"`), or `keyboardStepLarge` (`"64px"`) with `Shift`.
  - `Home` / `End` jumps the preceding pane to its minimum (or collapses it when `collapsible`) / maximum extent within the pair.
  - `Enter` toggles collapse on the first collapsible adjacent pane (preferring the preceding pane).
  - Double-click runs `doubleClickAction` (`"reset"` by default, `"collapse"`, or `"none"`).
- **Uncontrolled `id` Memory vs. `bind:extent`:** Uncontrolled panes (`extent` omitted) with an explicit `id` persist their user-resized pixel extent in the parent `<Splitter>`'s memory map. Unmounting and remounting via `{#if}` restores that remembered extent instead of `defaultExtent`; double-clicking an adjacent handle with `doubleClickAction="reset"` clears the remembered extent. Controlled panes (`extent` / `bind:extent`) bypass `id` memory and write back updates in the same unit format (`px`, `%`, or `number`) as the bound value.
- **Collapse Snapping & `inert`:** Dragging or stepping a `collapsible` pane below `collapsedExtent + (min - collapsedExtent) * collapseThreshold` snaps it to `collapsedExtent` and remembers its pre-collapse extent for restoration on expand. Collapsed panes with `collapsedExtent <= 0` receive `inert` so hidden content cannot receive focus or pointer events.
- **Container Sizing & `ResizeObserver`:** `.cs-splitter` uses `width: 100%; height: 100%; min-width: 0; min-height: 0;`, so its parent must provide an explicit size along the split axis. On container resize, `px`-sized panes stay fixed while `%` / flex panes absorb the delta; if the container shrinks below the sum of `min` bounds, panes compress proportionally.
- **Animation Suppression:** Mount/unmount (`{#if}`), `ResizeObserver` updates, and active pointer drags bypass `flex-basis` transitions so layout reconciliation is immediate and drag tracking has zero lag.
