# Virtual Scroll — Module Blueprint

## 1. Overview & Scope

- **Module**: `virtual-scroll` (`src/modules/virtual-scroll/`)
- **Kind**: `hybrid` (Headless reactive Svelte 5 controller + element attachments + optional `<VirtualScroll>` convenience component)
- **Purpose**: Render arbitrarily large datasets (100k+ items) at 60/120fps by windowing DOM nodes to the visible viewport plus overscan—**strictly in normal document flow without `position: absolute`**.

### Architectural Decision: Headless Controller + Attachments + Optional Component

| Approach | Assessment |
| :--- | :--- |
| **Component-only (`<VirtualScroll>`)** | Fails for `<table>` (`<tbody>` cannot wrap `<tr>`s in a `<div>`), breaks `<ul>`/`<ol>` semantic validity when injecting wrapper divs, and complicates composition with `<ScrollAreaContent>` or `window` scrolling. |
| **Attachment-only (`@attach`)** | Cannot ergonomically return reactive `items`, `offsetBefore`, `offsetAfter`, or imperative `scrollToIndex()` methods to Svelte `{#each}` blocks. |
| **Hybrid (Chosen)** | `createVirtualScroll(options)` creates a reactive Svelte 5 Runes controller (`VirtualScrollController`) with attachments (`attachViewport`, `attachList`, `attachItem`) and reactive getters (`items`, `offsetBefore`, `offsetAfter`). An optional `<VirtualScroll>` component wraps this controller for standard list use cases. |

### Flow-Preserving Layout Strategies (Zero `position: absolute`)

1. **Padding Mode (`attachList` — Default for `<div>`, `<ul>`, `<ol>`, Flex, CSS Grid)**:
   - Reads initial computed `paddingBlockStart` / `paddingBlockEnd` (or `paddingInlineStart` / `paddingInlineEnd` for horizontal) on attach as `basePaddingBefore` / `basePaddingAfter`, and applies `basePaddingBefore + offsetBefore` and `basePaddingAfter + offsetAfter` so user-defined padding is never clobbered.
   - Preserves `<ul>`/`<ol>` valid HTML (only `<li>` children), avoids margin-collapsing bugs, and does not trigger extra flex/grid `gap` before or after rendered items.
   - Supports **CSS Grid / multi-column layouts** via `lanes` (row-based slicing: `startIndex = startRow * lanes`, so the first rendered item always starts in column 1).
2. **Spacer Mode (`offsetBefore` / `offsetAfter` — For `<table>` / `<tbody>`)**:
   - CSS `padding` is ignored on `<tbody>`. Consumers render conditional spacer `<tr>` elements before and after `{#each virtual.items as item (item.key)}`:
     ```svelte
     {#if virtual.offsetBefore > 0}
         <tr aria-hidden="true" data-virtual-scroll-spacer="before">
             <td colspan={colCount} style="height: {virtual.offsetBefore}px; padding: 0; border: 0;"></td>
         </tr>
     {/if}
     ```
   - Omitting spacer `<tr>`s when `offsetBefore === 0` / `offsetAfter === 0` prevents extra `border-spacing` at scroll boundaries. Note that with `border-collapse: separate` and non-zero `border-spacing`, a visible spacer `<tr>` introduces one `border-spacing` step; `border-collapse: collapse` or `border-spacing: 0` is recommended for exact table height.
3. **Scroll Target & `listOffset` Handling**:
   - **`scrollTarget: "element"`**: Works on any `overflow: auto` element or `<ScrollAreaContent>` from `cs/svelte/scroll-area`. When `viewportEl !== listEl` (e.g. a header sits above `listEl` inside `viewportEl`), `listOffset` is computed relative to `viewportEl`'s scroll origin (`listEl.getBoundingClientRect().top - viewportEl.getBoundingClientRect().top + viewportEl.scrollTop`, or horizontal equivalent).
   - **`scrollTarget: "window"`**: `attachViewport` is optional (no-op); `attachList` drives `window` scroll/resize listeners and `listOffset` (`listEl.getBoundingClientRect().top + window.scrollY` or `.left + window.scrollX`). `listOffset` is subtracted from `window.scrollY`/`scrollX` when computing `relativeScrollOffset`, added back in `scrollToIndex`/`scrollToOffset`, and scroll anchoring uses `window.scrollBy`.

### Evaluation of Modern CSS Features

- **`content-visibility: auto` & `contain-intrinsic-size`**: Not a replacement for DOM windowing at 100k+ items (retaining 100k DOM nodes, Svelte component instances, and reactive `$effect` graphs causes excessive heap usage and slow initial mount, and breaks `ResizeObserver` measurement of off-screen nodes).
- **`contain: layout style`**: Safe and recommended on virtualized items (`[data-virtual-scroll-item]`) to isolate layout/style recalculation per item without clipping focus rings or popovers (`contain: paint` and `contain: size` are intentionally avoided).
- **`overflow-anchor: none`**: Set on `[data-virtual-scroll-list]` / `[data-virtual-scroll-viewport]` to disable native browser scroll anchoring, which conflicts with DOM node removals + padding adjustments. Deterministic JS scroll anchoring is performed instead when rows above the viewport resize.

### Proposed File Structure

- `src/modules/virtual-scroll/index.ts` — Public exports (`createVirtualScroll`, `VirtualScroll`, types, constants).
- `src/modules/virtual-scroll/virtual-scroll.svelte.ts` — Reactive `VirtualScrollController` and `createVirtualScroll`.
- `src/modules/virtual-scroll/fenwick-tree.internal.ts` — Internal O(log N) row-indexed Binary Indexed Tree (`Float64Array`) for prefix sums and offset lookup (never exported).
- `src/modules/virtual-scroll/VirtualScroll.svelte` — Optional two-element convenience wrapper component.
- `src/modules/virtual-scroll/VirtualScroll.preview.svelte` — Playground preview.
- `src/modules/virtual-scroll/virtual-scroll.docs.md` — Module documentation.
- `src/modules/virtual-scroll/virtual-scroll.blueprint.md` — This blueprint.
- `src/modules/virtual-scroll/virtual-scroll.test.ts` — Vitest unit tests (Fenwick tree, range math, anchoring).
- `src/modules/virtual-scroll/virtual-scroll.svelte.test.ts` — Vitest Svelte component/reactivity tests.

---

## 2. Public API

### Constants & Types

- `VIRTUAL_SCROLL_ORIENTATIONS = ["vertical", "horizontal"] as const`
- `VIRTUAL_SCROLL_ALIGNS = ["auto", "start", "center", "end"] as const`
- `VIRTUAL_SCROLL_TARGETS = ["element", "window"] as const`
- `VirtualScrollOrientation = (typeof VIRTUAL_SCROLL_ORIENTATIONS)[number]`
- `VirtualScrollAlign = (typeof VIRTUAL_SCROLL_ALIGNS)[number]`
- `VirtualScrollTarget = (typeof VIRTUAL_SCROLL_TARGETS)[number]`
- `MaybeGetter<T> = T | (() => T)`

### `createVirtualScroll(options: VirtualScrollOptions): VirtualScrollController`

#### `VirtualScrollOptions`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `count` | `MaybeGetter<number>` | Required | Total number of items. |
| `estimateSize` | `number \| ((index: number) => number)` | Required | Estimated (or exact, if `fixed: true`) extent in px along scroll axis. Kept unambiguous (no 0-arg getter). |
| `fixed` | `MaybeGetter<boolean>` | `false` | Skips `ResizeObserver` item measurement and Fenwick tree allocation; uses O(1) arithmetic. |
| `orientation` | `MaybeGetter<VirtualScrollOrientation>` | `"vertical"` | Scroll axis (`"vertical"` or `"horizontal"`). |
| `overscan` | `MaybeGetter<number>` | `5` | Extra rows rendered before and after the visible viewport. |
| `gap` | `MaybeGetter<number>` | `0` (auto-read from CSS if `attachList` used) | Gap in px between rows along the scroll axis. |
| `lanes` | `MaybeGetter<number>` | `1` | Number of columns/tracks per row (for CSS Grid / multi-column layouts). |
| `scrollTarget` | `MaybeGetter<VirtualScrollTarget>` | `"element"` | Whether scrolling is on the attached viewport element or `window`. |
| `getItemKey` | `(index: number) => string \| number` | `(i) => i` | Stable key for preserving measured sizes across insertions/reorders and keying `{#each}`. |
| `initialViewportSize` | `number` | `0` | Fallback viewport extent for SSR before client measurement. |
| `initialRenderCount` | `number` | `0` | Number of items to render during SSR before client measurement. |
| `onRangeChange` | `(range: VirtualScrollRange) => void` | `undefined` | Callback when visible index range changes. |

#### `VirtualScrollController` (Reactive State & Methods)

- **Reactive Getters**:
  - `items: readonly VirtualScrollItem[]` — Rendered items (`{ index, lane, start, size, key }`). Always use `{#each virtual.items as item (item.key)}` in templates.
  - `offsetBefore: number` — Spacer extent in px before `startIndex`.
  - `offsetAfter: number` — Spacer extent in px after `endIndex`.
  - `totalSize: number` — Total scrollable extent in px.
  - `startIndex: number` / `endIndex: number` — Rendered index bounds (`0` and `-1` when empty).
  - `visibleRange: VirtualScrollRange` — `{ startIndex, endIndex }` excluding overscan.
  - `isScrolling: boolean` — `true` during active scroll (debounced 150ms idle).
  - `scrollOffset: number` — Current scroll position along the active axis (relative to `listOffset`).
- **Attachments**:
  - `attachViewport: Attachment<HTMLElement>` — Binds passive `scroll` listener, viewport `ResizeObserver`, and `overflow-anchor: none`. Optional/no-op when `scrollTarget === "window"`.
  - `attachList: Attachment<HTMLElement>` — Applies `overflow-anchor: none`, preserves initial computed padding, and updates `--cs-virtual-scroll-before` / `--cs-virtual-scroll-after` + logical `padding-block` / `padding-inline` styles; auto-detects CSS `row-gap` / `column-gap` when `gap` is not explicitly provided.
  - `attachItem(index: number): Attachment<HTMLElement>` — Registers/unregisters the element with the pooled `ResizeObserver` and sets `data-index` + `contain: layout style`.
- **Methods**:
  - `scrollToIndex(index: number, options?: { align?: VirtualScrollAlign; behavior?: ScrollBehavior }): void`
  - `scrollToOffset(offset: number, options?: { behavior?: ScrollBehavior }): void`
  - `measure(): void` — Forces re-measurement of all currently mounted items.
  - `invalidate(fromIndex?: number): void` — Clears cached measurements from `fromIndex` onward.
  - `getItemAriaProps(index: number, options?: VirtualScrollItemAriaOptions): VirtualScrollItemAriaProps`
    - `VirtualScrollItemAriaOptions`: `{ role?: "listitem" | "option" | "row"; headerRowCount?: number }` (default `role: "listitem"`).
    - Returns `{ "aria-setsize": count, "aria-posinset": index + 1 }` for `"listitem"` / `"option"`, or `{ "aria-rowindex": index + 1 + (headerRowCount ?? 0) }` for `"row"`.

### `<VirtualScroll>` Convenience Component

Always renders a **two-element structure** (outer viewport `<div>` + inner list `<div | ul | ol>`) so viewport overflow/padding never collides with `attachList` padding:
- Outer viewport: `<div bind:this={ref} {...rest} class={["cs-virtual-scroll", className]}>`
- Inner list: `<svelte:element this={as} bind:this={listRef} role={role} class={["cs-virtual-scroll-list", listClass]}>`

- **Props (`VirtualScrollProps<T>`)**:
  - `ref = $bindable(null): HTMLDivElement | null`
  - `listRef = $bindable(null): HTMLElement | null`
  - `controller = $bindable(null): VirtualScrollController | null`
  - `items: readonly T[]`
  - `as?: "div" | "ul" | "ol"` (default `"div"`)
  - `role?: HTMLAttributes<HTMLElement>["role"]` (forwarded to inner list element)
  - `listClass?: string` (forwarded to inner list element)
  - `estimateSize`, `fixed`, `orientation`, `overscan`, `gap`, `lanes`, `scrollTarget`, `getItemKey`, `initialViewportSize`, `initialRenderCount`, `onRangeChange`
    - Note: `<VirtualScroll>` wraps `estimateSize` as `(index) => (typeof estimateSize === "function" ? estimateSize(index) : estimateSize)` so reactive prop updates work without 0-arg vs 1-arg ambiguity.
  - `children: Snippet<[item: T, index: number]>`
  - Standard `HTMLAttributes<HTMLDivElement>` (`class`, `style`, etc. forwarded to outer viewport).

### CSS Custom Properties

- `--cs-virtual-scroll-before`: Dynamic padding/spacer extent before rendered items (px).
- `--cs-virtual-scroll-after`: Dynamic padding/spacer extent after rendered items (px).
- `--cs-virtual-scroll-total-size`: Total computed scrollable extent (px).

---

## 3. DOM, Semantics & Accessibility

- **Native Elements**: Zero wrapper elements imposed by the controller. Consumers use semantic `<ul>`/`<li>`, `<ol>`/`<li>`, `<table>`/`<tbody>`/`<tr>`, or `<div>` directly. `<VirtualScroll>` renders `.cs-virtual-scroll` (viewport) + `.cs-virtual-scroll-list` (list) styled in `@layer components.composite`.
- **Data Attributes**:
  - `data-virtual-scroll-viewport=""` on viewport element.
  - `data-virtual-scroll-list=""` on list element.
  - `data-virtual-scroll-item=""` and `data-index={index}` on each rendered item.
  - `data-virtual-scroll-spacer="before" | "after"` on optional spacer `<tr>`s.
  - `data-orientation={orientation}` and `data-scrolling={isScrolling ? "" : undefined}` on viewport.
- **ARIA Attributes**:
  - Lists (`role="list"` / `role="listbox"`): `aria-setsize={count}` and `aria-posinset={item.index + 1}` via `virtual.getItemAriaProps(item.index)`.
  - Tables/Grids (`role="table"` / `role="grid"`): `aria-rowcount={totalRows}` on `<table>`, `aria-rowindex` via `virtual.getItemAriaProps(item.index, { role: "row", headerRowCount })` on each `<tr>`, and `aria-hidden="true"` on spacer `<tr>`s.
- **Keyboard & Focus Behavior**:
  - Native scrolling (`PageUp`, `PageDown`, `Home`, `End`, `Space`, arrow keys) works natively because scrolling is 100% browser-native.
  - For interactive widgets (`listbox`, `grid`), `aria-activedescendant` on the container is recommended over roving `tabindex` so focus is never lost when an item unmounts off-screen; consumers can pair `ArrowDown`/`ArrowUp` with `virtual.scrollToIndex(activeIndex, { align: "auto" })`.

---

## 4. Visual & Motion Contract

- **Surface & Elevation**: Headless / transparent by default. Inherits parent surface and composes seamlessly with `<ScrollArea>` / `<ScrollAreaContent>` for `cscripts-ui` custom overlay scrollbars.
- **Zebra Striping Note**: In `<table>` spacer mode, inserting/removing the top spacer `<tr>` shifts `:nth-child(even)` parity. Consumers should stripe via `[data-index]` or `item.index % 2` rather than `:nth-child`.
- **Row-Based Fenwick Tree & Frame Budget**:
  - **Row-indexed Fenwick Tree (`Float64Array`)**: Indexes **rows** (`rowCount = Math.ceil(count / lanes)`), not individual items. Per-item measured sizes are stored separately; when an item at `index` in row `r = Math.floor(index / lanes)` resizes, `rowHeight[r] = max(itemSizes in row r)` is recomputed and Fenwick index `r` is updated only if `rowHeight[r]` changed. `gap` is stored per row (`rowHeight[r] + gap`), and `totalSize` subtracts `gap` once when `rowCount > 0` so total gap equals `(rowCount - 1) * gap`.
  - **Complexity**: **O(log R)** offset lookup and updates where `R = rowCount` (`<0.1ms` per scroll frame for 100k items); **O(1)** in `fixed: true` mode.
  - **Single pooled `ResizeObserver`** per controller instance (maps `Element -> index` via `WeakMap`).
  - **Subpixel noise guard**: Size deltas `< 0.5px` are ignored to prevent infinite resize loops.
  - **Coalesced `requestAnimationFrame`** scroll handling with `{ passive: true }` listeners.
  - **Minimal Svelte reactivity churn**: Internal arrays/trees are non-reactive; `$state` fields (`startIndex`, `endIndex`, `offsetBefore`, `offsetAfter`) only mutate when the rendered slice or spacer offsets actually change.
- **Scroll Anchoring**:
  - When a `ResizeObserver` batch changes `rowHeight[r]` for a row above the first visible row (`r < firstVisibleRow`) and `scrollOffset > 0`, the controller accumulates `delta = newRowHeight - oldRowHeight` and synchronously adjusts `viewport.scrollTop += delta` (or `scrollLeft`, or `window.scrollBy` in `"window"` mode) in the same frame to prevent visual jumping.
  - Disabled during active programmatic `scrollToIndex` / `scrollToOffset` calls.

---

## 5. Edge Cases & Constraints

- **Empty List (`count === 0`)**: `items = []`, `offsetBefore = 0`, `offsetAfter = 0`, `totalSize = 0`. No spacers rendered.
- **Zero-Height / Hidden Container (`clientHeight === 0`, e.g. inactive tab)**: Keeps cached item measurements intact, renders `items = []`, and automatically restores the range when the viewport `ResizeObserver` reports `> 0`.
- **Dynamic Additions / Removals / Reordering**:
  - When `count`, `lanes`, or `gap` changes, the row Fenwick tree resizes/rebuilds cleanly; if `getItemKey` is provided, previously measured item sizes are remapped by key.
- **`scrollToIndex` with Unmeasured Items & Sticky Headers**:
  - Respects `scrollPaddingBlockStart` / `scrollPaddingBlockEnd` (or `scrollPaddingInlineStart` / `End`) read from `getComputedStyle(viewportEl)` when aligning items (e.g. under sticky `<thead>` or fixed app headers).
  - Jumping to a far unmeasured index uses `estimateSize`. Once rendered and measured by `ResizeObserver`, if `behavior !== "smooth"`, up to 3 `rAF` convergence passes correct any drift so the target item lands at the requested `align` position.
- **RTL Horizontal Scrolling**: Normalizes `Math.abs(el.scrollLeft)` and uses logical `padding-inline-start` / `padding-inline-end`.
- **SSR**: Renders `initialRenderCount` items using `estimateSize` and `initialViewportSize` when `typeof window === "undefined"`, hydrating cleanly on mount.
- **Explicit Non-Goals**:
  - No `position: absolute` item placement.
  - No 2D masonry/staggered-height layout (grid virtualization assumes uniform row heights per lane row).
  - No built-in infinite-scroll data fetching (consumers react to `onRangeChange` or `endIndex >= count - threshold`).

### Testing Strategy

- **Vitest (`virtual-scroll.test.ts`, `virtual-scroll.svelte.test.ts`)**:
  - Row-indexed Fenwick tree unit tests (init, update, prefix sum, binary-lifting search, 100k-item stress benchmark).
  - Controller range math: `overscan`, `gap`, `lanes` (`lanes > 1` with mixed item heights per row), `fixed` vs dynamic, `count === 0`, `getItemKey` remapping, unkeyed reuse, dynamic `count`/`lanes`/`gap` updates, and SSR `initialRenderCount`.
- **Playwright (E2E)**:
  - Variable-height `ResizeObserver` measurement + scroll anchoring (no visual jump when rows above viewport resize).
  - `window` `scrollTarget` with `listOffset > 0` (header above list).
  - `<table>` spacer `<tr>` layout, `scrollHeight` accuracy, and sticky `<thead>` `scroll-padding-top` alignment.
  - CSS Grid (`lanes > 1`) with mixed-height cards and `gap`.
  - `<ScrollArea>` + `<ScrollAreaContent>` composition.
  - `scrollToIndex` convergence on unmeasured variable-height items.
