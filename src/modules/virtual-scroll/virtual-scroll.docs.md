---
name: VirtualScroll
kind: hybrid
import: cs/svelte/virtual-scroll
exports:
  - VirtualScroll
  - createVirtualScroll
  - VirtualScrollController
  - VIRTUAL_SCROLL_ALIGNS
  - VIRTUAL_SCROLL_ORIENTATIONS
  - VIRTUAL_SCROLL_TARGETS
  - MaybeGetter
  - VirtualScrollAlign
  - VirtualScrollItem
  - VirtualScrollItemAriaOptions
  - VirtualScrollItemAriaProps
  - VirtualScrollKey
  - VirtualScrollOptions
  - VirtualScrollOrientation
  - VirtualScrollRange
  - VirtualScrollScrollToIndexOptions
  - VirtualScrollScrollToOffsetOptions
  - VirtualScrollTarget
  - VirtualScrollProps
---

# VirtualScroll

## Overview
Flow-preserving DOM virtualization for lists, tables, and grids (`100k+` items) with zero `position: absolute`. Provides a headless reactive Svelte 5 controller (`createVirtualScroll`) with element attachments (`attachViewport`, `attachList`, `attachItem`) and an optional `<VirtualScroll>` convenience wrapper.

## Usage Guidance
- **`<VirtualScroll>`**: Use for standard `<div>`, `<ul>`, or `<ol>` lists where a two-element overflow container (`cs-virtual-scroll` viewport + `cs-virtual-scroll-list` inner list) fits directly.
- **`createVirtualScroll` (Padding Mode)**: Use when composing with `<ScrollArea>` / `<ScrollAreaContent>`, custom scroll containers, CSS Grid (`lanes > 1`), or `scrollTarget: "window"`. `attachList` preserves existing computed padding and adds `offsetBefore` / `offsetAfter` via logical `padding-block` / `padding-inline`.
- **`createVirtualScroll` (Spacer Mode for `<table>`)**: CSS `padding` is ignored on `<tbody>`. Render conditional spacer `<tr>` elements using `offsetBefore` and `offsetAfter` before and after `{#each virtual.items as item (item.key)}`.

## API

### `createVirtualScroll(options: VirtualScrollOptions): VirtualScrollController`

#### `VirtualScrollOptions`
| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `count` | `MaybeGetter<number>` | Yes | — | Total number of items. |
| `estimateSize` | `number \| ((index: number) => number)` | Yes | — | Estimated (or exact, when `fixed: true`) extent in px along the scroll axis. |
| `fixed` | `MaybeGetter<boolean>` | No | `false` | Skips `ResizeObserver` item measurement and Fenwick tree allocation; uses O(1) arithmetic based on `estimateSize(0)`. |
| `orientation` | `MaybeGetter<VirtualScrollOrientation>` | No | `"vertical"` | Scroll axis (`"vertical" \| "horizontal"`). |
| `overscan` | `MaybeGetter<number>` | No | `5` | Extra rows rendered before and after the visible viewport. |
| `gap` | `MaybeGetter<number \| undefined>` | No | `0` (or CSS gap) | Gap in px between rows along the scroll axis. Auto-read from CSS `row-gap` / `column-gap` when omitted and `attachList` is used. |
| `lanes` | `MaybeGetter<number>` | No | `1` | Number of columns/tracks per row (for CSS Grid / multi-column layouts). |
| `scrollTarget` | `MaybeGetter<VirtualScrollTarget>` | No | `"element"` | Scroll container target (`"element" \| "window"`). |
| `getItemKey` | `(index: number) => VirtualScrollKey` | No | `(i) => i` | Stable key for preserving measured sizes across insertions/reorders and keying `{#each}`. |
| `initialViewportSize` | `number` | No | `0` | Fallback viewport extent in px for SSR before client measurement. |
| `initialRenderCount` | `number` | No | `0` | Number of items to render during SSR before client measurement. |
| `onRangeChange` | `(range: VirtualScrollRange) => void` | No | `undefined` | Callback fired when `visibleRange` (`{ startIndex, endIndex }`) changes. |

#### `VirtualScrollController`

**Reactive Getters**

| Property | Type | Description |
| :--- | :--- | :--- |
| `items` | `readonly VirtualScrollItem[]` | Currently rendered slice (`{ index, lane, start, size, key }`). Always key `{#each}` with `(item.key)`. |
| `offsetBefore` | `number` | Spacer extent in px before `startIndex`. |
| `offsetAfter` | `number` | Spacer extent in px after `endIndex`. |
| `totalSize` | `number` | Total scrollable extent in px along the active axis. |
| `startIndex` | `number` | First rendered item index (`0` when empty). |
| `endIndex` | `number` | Last rendered item index (`-1` when empty). |
| `visibleRange` | `VirtualScrollRange` | Visible `{ startIndex, endIndex }` excluding `overscan` (`{ startIndex: 0, endIndex: -1 }` when empty). |
| `isScrolling` | `boolean` | `true` during active scroll, debounced `150ms` after the last scroll event. |
| `scrollOffset` | `number` | Current scroll offset in px relative to the start of the list. |

**Attachments**

| Attachment | Signature | Description |
| :--- | :--- | :--- |
| `attachViewport` | `Attachment<HTMLElement>` | Binds passive `scroll` listener, viewport `ResizeObserver`, and `overflow-anchor: none`. Optional/no-op for scroll listeners when `scrollTarget === "window"`. |
| `attachList` | `Attachment<HTMLElement>` | Applies `overflow-anchor: none`, preserves initial computed padding, sets `--cs-virtual-scroll-*` CSS variables and logical padding offsets, auto-reads CSS gap if `gap` is omitted, and drives `window` scroll/resize listeners when `scrollTarget === "window"`. |
| `attachItem` | `(index: number) => Attachment<HTMLElement>` | Sets `data-virtual-scroll-item`, `data-index`, and `contain: layout style`; observes item size via a single pooled `ResizeObserver` when `fixed` is `false`. |

**Methods**

| Method | Signature | Description |
| :--- | :--- | :--- |
| `scrollToIndex` | `(index: number, options?: VirtualScrollScrollToIndexOptions) => void` | Scrolls so `index` is aligned (`align?: "auto" \| "start" \| "center" \| "end"`, `behavior?: ScrollBehavior`). Respects viewport `scroll-padding`. |
| `scrollToOffset` | `(offset: number, options?: VirtualScrollScrollToOffsetOptions) => void` | Scrolls to a pixel `offset` relative to the start of the list (`behavior?: ScrollBehavior`). |
| `measure` | `() => void` | Forces synchronous re-measurement of all currently mounted items. |
| `invalidate` | `(fromIndex?: number) => void` | Clears cached item measurements from `fromIndex` (default `0`) onward and recomputes layout. |
| `getItemAriaProps` | `(index: number, options?: VirtualScrollItemAriaOptions) => VirtualScrollItemAriaProps` | Returns `{ "aria-setsize", "aria-posinset" }` for `role: "listitem" \| "option"` (default `"listitem"`), or `{ "aria-rowindex" }` for `role: "row"` (`index + 1 + (headerRowCount ?? 0)`). |

### `VirtualScroll` Props
`<VirtualScroll<T>>` extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`. Extra attributes (`class`, `style`, etc.) are forwarded to the outer viewport `<div>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `items` | `readonly T[]` | Yes | — | Source data array. |
| `estimateSize` | `number \| ((index: number) => number)` | Yes | — | Estimated (or exact, when `fixed: true`) item extent in px. |
| `children` | `Snippet<[item: T, index: number]>` | Yes | — | Row/item template snippet receiving `(item, index)`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the outer viewport `<div>`. |
| `listRef` | `HTMLElement \| null` | No | `null` | `$bindable` reference to the inner list element. |
| `controller` | `VirtualScrollController \| null` | No | `null` | `$bindable` reference to the underlying `VirtualScrollController`. |
| `as` | `"div" \| "ul" \| "ol"` | No | `"div"` | Inner list element tag (`"ul"` and `"ol"` render `<li>` item wrappers). |
| `role` | `HTMLAttributes<HTMLElement>["role"]` | No | `undefined` | ARIA role forwarded to the inner list element. |
| `listClass` | `string` | No | `undefined` | Additional CSS classes forwarded to the inner list element. |
| `fixed` | `boolean` | No | `false` | Enables O(1) fixed-size mode. |
| `orientation` | `VirtualScrollOrientation` | No | `"vertical"` | Scroll axis (`"vertical" \| "horizontal"`). |
| `overscan` | `number` | No | `5` | Extra rows rendered before and after the visible viewport. |
| `gap` | `number` | No | `undefined` | Explicit row gap in px (auto-read from CSS gap when omitted). |
| `lanes` | `number` | No | `1` | Number of columns/tracks per row. |
| `scrollTarget` | `VirtualScrollTarget` | No | `"element"` | Scroll container target (`"element" \| "window"`). |
| `getItemKey` | `(index: number) => VirtualScrollKey` | No | `(i) => i` | Stable key function for item identity and measurement caching. |
| `initialViewportSize` | `number` | No | `0` | Fallback viewport extent in px for SSR. |
| `initialRenderCount` | `number` | No | `0` | Number of items to render during SSR. |
| `onRangeChange` | `(range: VirtualScrollRange) => void` | No | `undefined` | Callback fired when `visibleRange` changes. |

### Constants & Types
- `VIRTUAL_SCROLL_ORIENTATIONS`: `["vertical", "horizontal"] as const` (`VirtualScrollOrientation`)
- `VIRTUAL_SCROLL_ALIGNS`: `["auto", "start", "center", "end"] as const` (`VirtualScrollAlign`)
- `VIRTUAL_SCROLL_TARGETS`: `["element", "window"] as const` (`VirtualScrollTarget`)
- `MaybeGetter<T>`: `T | (() => T)`
- `VirtualScrollKey`: `string | number`
- `VirtualScrollRange`: `{ startIndex: number; endIndex: number }`
- `VirtualScrollItem`: `{ index: number; lane: number; start: number; size: number; key: VirtualScrollKey }`
- `VirtualScrollItemAriaOptions`: `{ role?: "listitem" | "option" | "row"; headerRowCount?: number }`
- `VirtualScrollItemAriaProps`: `{ "aria-setsize"?: number; "aria-posinset"?: number; "aria-rowindex"?: number }`
- `VirtualScrollScrollToIndexOptions`: `{ align?: VirtualScrollAlign; behavior?: ScrollBehavior }`
- `VirtualScrollScrollToOffsetOptions`: `{ behavior?: ScrollBehavior }`

### `data-*` Attributes
- Viewport (`attachViewport` / `<VirtualScroll>`): `data-virtual-scroll-viewport=""`, `data-orientation={orientation}`, and on `<VirtualScroll>` also `data-scroll-target={scrollTarget}` and `data-scrolling=""` (while `isScrolling` is `true`).
- List (`attachList`): `data-virtual-scroll-list=""`.
- Item (`attachItem(index)`): `data-virtual-scroll-item=""`, `data-index={index}`.
- Optional table spacers (consumer-rendered): `data-virtual-scroll-spacer="before" | "after"`.

### CSS Custom Properties
Set on the `attachList` element:

| Variable | Description |
| :--- | :--- |
| `--cs-virtual-scroll-before` | Dynamic spacer/padding extent before rendered items (`${offsetBefore}px`). |
| `--cs-virtual-scroll-after` | Dynamic spacer/padding extent after rendered items (`${offsetAfter}px`). |
| `--cs-virtual-scroll-total-size` | Total computed scrollable extent (`${totalSize}px`). |

## Examples

### `<VirtualScroll>` Component
```svelte
<script lang="ts">
    import { VirtualScroll, type VirtualScrollController } from "cs/svelte/virtual-scroll";

    const items = Array.from({ length: 10_000 }, (_, i) => ({ id: i, name: `Item ${i + 1}` }));
    let controller = $state<VirtualScrollController | null>(null);
</script>

<VirtualScroll
    bind:controller
    {items}
    as="ul"
    role="list"
    estimateSize={48}
    getItemKey={(i) => items[i]?.id ?? i}
    class="h-80"
    listClass="flex flex-col gap-1.5 p-2"
>
    {#snippet children(item)}
        <div class="rounded-lg bg-sunken px-3 py-2">{item.name}</div>
    {/snippet}
</VirtualScroll>
```

### `createVirtualScroll` with `<ScrollArea>`
```svelte
<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { createVirtualScroll } from "cs/svelte/virtual-scroll";

    const items = Array.from({ length: 5000 }, (_, i) => ({ id: `row-${i}`, label: `Activity #${i + 1}` }));

    const virtual = createVirtualScroll({
        count: () => items.length,
        estimateSize: 56,
        gap: 8,
        getItemKey: (i) => items[i]?.id ?? i,
    });
</script>

<ScrollArea size="md" direction="vertical" class="h-80">
    <ScrollAreaContent {@attach virtual.attachViewport}>
        <ul {@attach virtual.attachList} class="flex flex-col gap-2 p-3" role="list">
            {#each virtual.items as item (item.key)}
                <li
                    {@attach virtual.attachItem(item.index)}
                    {...virtual.getItemAriaProps(item.index)}
                    class="rounded-xl bg-sunken px-4 py-3"
                >
                    {items[item.index]?.label}
                </li>
            {/each}
        </ul>
    </ScrollAreaContent>
</ScrollArea>
```

### `<table>` Spacer Mode with Sticky `<thead>`
```svelte
<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { createVirtualScroll } from "cs/svelte/virtual-scroll";

    const rows = Array.from({ length: 10_000 }, (_, i) => ({ id: `INV-${i + 1}`, name: `Customer ${i + 1}` }));

    const virtual = createVirtualScroll({
        count: () => rows.length,
        estimateSize: 41,
        getItemKey: (i) => rows[i]?.id ?? i,
    });
</script>

<ScrollArea size="md" direction="vertical" class="h-80">
    <ScrollAreaContent {@attach virtual.attachViewport} class="scroll-pt-10">
        <table class="w-full border-collapse" aria-rowcount={rows.length}>
            <thead class="sticky top-0 z-10 bg-sunken">
                <tr><th>ID</th><th>Customer</th></tr>
            </thead>
            <tbody {@attach virtual.attachList}>
                {#if virtual.offsetBefore > 0}
                    <tr aria-hidden="true" data-virtual-scroll-spacer="before">
                        <td colspan="2" style="height: {virtual.offsetBefore}px; padding: 0; border: 0;"></td>
                    </tr>
                {/if}
                {#each virtual.items as item (item.key)}
                    <tr
                        {@attach virtual.attachItem(item.index)}
                        {...virtual.getItemAriaProps(item.index, { role: "row", headerRowCount: 1 })}
                        class={item.index % 2 === 1 ? "bg-sunken/50" : ""}
                    >
                        <td>{rows[item.index]?.id}</td>
                        <td>{rows[item.index]?.name}</td>
                    </tr>
                {/each}
                {#if virtual.offsetAfter > 0}
                    <tr aria-hidden="true" data-virtual-scroll-spacer="after">
                        <td colspan="2" style="height: {virtual.offsetAfter}px; padding: 0; border: 0;"></td>
                    </tr>
                {/if}
            </tbody>
        </table>
    </ScrollAreaContent>
</ScrollArea>
```

### CSS Grid (`lanes`) & `window` Scrolling
```svelte
<script lang="ts">
    import { createVirtualScroll } from "cs/svelte/virtual-scroll";

    let lanes = $state(3);
    const virtual = createVirtualScroll({
        count: () => items.length,
        estimateSize: 96,
        lanes: () => lanes,
        gap: 12,
        scrollTarget: "window",
        getItemKey: (i) => items[i]?.id ?? i,
    });
</script>

<div
    {@attach virtual.attachList}
    class="grid gap-3"
    style="grid-template-columns: repeat({lanes}, minmax(0, 1fr));"
>
    {#each virtual.items as item (item.key)}
        <div {@attach virtual.attachItem(item.index)} class="rounded-xl bg-sunken p-3">
            {items[item.index]?.title}
        </div>
    {/each}
</div>
```

## Behavior & Quirks

### Accessibility
- **List & Option Semantics**: Spread `{...virtual.getItemAriaProps(item.index)}` onto list/option items to emit `aria-setsize` and `aria-posinset` so screen readers announce the full virtualized count and position.
- **Table & Grid Semantics**: Set `aria-rowcount={rows.length}` on `<table>` (or `role="grid"`), spread `{...virtual.getItemAriaProps(item.index, { role: "row", headerRowCount: 1 })}` on each `<tr>`, and mark spacer `<tr>`s with `aria-hidden="true"`.
- **Keyboard Focus (`aria-activedescendant`)**: For interactive `listbox` or `grid` widgets, manage focus on the container with `aria-activedescendant` rather than roving `tabindex` on items so focus is not lost when an item unmounts off-screen; pair arrow navigation with `virtual.scrollToIndex(activeIndex, { align: "auto" })`.

### Best Practices & Caveats
- **Always Key `{#each}` with `(item.key)`**: Use `{#each virtual.items as item (item.key)}` (never unkeyed) so Svelte reuses DOM nodes and preserves `ResizeObserver` measurements accurately.
- **Table Zebra Striping**: In `<table>` spacer mode, mounting/unmounting the top spacer `<tr>` shifts `:nth-child(even)` parity. Stripe rows using `item.index % 2` or `[data-index]` instead of `:nth-child`.
- **Sticky Headers & `scroll-padding`**: `scrollToIndex` reads `scrollPaddingBlockStart` / `scrollPaddingBlockEnd` (or `scrollPaddingInlineStart` / `End`) from the viewport's computed style (or `document.documentElement` in `"window"` mode). Add e.g. `scroll-pt-10` on the scroll viewport when using a sticky `<thead>` or fixed header so `align: "start"` / `"auto"` does not tuck items underneath.
- **Use `fixed: true` When Heights Are Uniform**: Enables O(1) math and skips `ResizeObserver` + Fenwick tree allocation; `estimateSize` is evaluated at index `0` for all rows.
- **Dynamic Scroll Anchoring**: When `fixed` is `false` and an already-measured row above the viewport resizes, the controller adjusts `scrollTop` / `scrollLeft` (or `window.scrollBy`) synchronously in the same frame to prevent content jumping. Native `overflow-anchor` is set to `none` to avoid browser interference.
- **`scrollToIndex` Convergence**: When jumping to far unmeasured variable-height items (`behavior !== "smooth"`), up to 3 `requestAnimationFrame` convergence passes correct any drift once newly mounted items are measured.
- **Hidden / Zero-Size Containers**: When `clientHeight === 0` (e.g., an inactive tab), cached measurements are preserved, `items` becomes `[]`, and the visible slice restores automatically when the viewport resizes above `0`.
- **SSR & RTL**: Supply `initialViewportSize` and `initialRenderCount` for SSR pre-mount rendering. Horizontal mode normalizes `Math.abs(scrollLeft)` and uses logical `padding-inline-start` / `padding-inline-end` for RTL support.
