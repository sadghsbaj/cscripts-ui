---
name: ScrollArea
kind: component
import: cs/svelte/scroll-area
exports:
  - ScrollArea
  - ScrollAreaContent
  - SCROLL_AREA_SIZES
  - SCROLL_AREA_DIRECTIONS
  - SCROLL_AREA_SCROLLBARS
  - ScrollAreaSize
  - ScrollAreaDirection
  - ScrollAreaScrollbar
  - ScrollAreaProps
  - ScrollAreaContentProps
  - getScrollAreaContext
  - setScrollAreaContext
  - hasScrollAreaContext
---

# ScrollArea

## Overview
Composite scroll container (`<ScrollArea />` + `<ScrollAreaContent />`) that hides native OS scrollbars while preserving native scroll physics, rendering GPU-accelerated overlay scrollbars in the outer wrapper.

## API

### `ScrollArea` Props
Extends `HTMLAttributes<HTMLDivElement>`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `ScrollAreaSize` | Yes | — | Track/thumb thickness: `"sm"` (6px), `"md"` (8px), `"lg"` (12px). |
| `direction` | `ScrollAreaDirection` | Yes | — | Scrollable axes: `"vertical" \| "horizontal" \| "both"`. |
| `scrollbar` | `ScrollAreaScrollbar` | No | `"hover"` | Visibility mode: `"hover" \| "scroll" \| "always" \| "never"`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the outer wrapper `<div>`. |

### `ScrollAreaContent` Props
Extends `HTMLAttributes<HTMLDivElement>`.
- `ref?: HTMLDivElement | null` (`$bindable`). Spreads `{...rest}` directly onto the scrolling viewport `<div>` (ideal for `{@attach scrollFade(...)}`).

### `data-*` Attributes
- On `ScrollArea`: `data-size`, `data-scrollbar`, `data-scrolling`, `data-dragging`, `data-both-scrollable`.
- On `ScrollAreaContent`: `data-direction`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-scroll-area-track-bg` | Subtle base tint | Track pill background when hovered/dragged. |
| `--cs-scroll-area-thumb-bg` | Base 20%/22% | Resting thumb color. |
| `--cs-scroll-area-thumb-bg-track-hover` | Base 36%/44% | Thumb color when hovering the track. |
| `--cs-scroll-area-thumb-bg-hover` | Base 54%/76% | Thumb color on direct hover or active drag. |

## Examples

```svelte
<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
</script>

<ScrollArea size="md" direction="vertical" class="h-64 rounded-xl bg-elevated">
    <ScrollAreaContent class="p-4" {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}>
        <!-- Scrollable items -->
    </ScrollAreaContent>
</ScrollArea>
```

## Behavior & Quirks
- **Outer chrome separation:** Scrollbars render as siblings of `<ScrollAreaContent />` inside `<ScrollArea />`, so applying `scrollFade` to `<ScrollAreaContent />` never clips the scrollbar near edges.
- **Explicit container height:** Like any overflow container, `<ScrollArea />` needs a constrained height/width (e.g. `h-64` or `flex-1 min-h-0`) to scroll.
