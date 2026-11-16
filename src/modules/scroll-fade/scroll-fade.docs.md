---
name: ScrollFade
kind: attachment
import: cs/svelte/scroll-fade
exports:
  - scrollFade
  - SCROLL_FADE_DIRECTIONS
  - SCROLL_FADE_EDGES
  - SCROLL_FADE_SIZES
  - ScrollFadeDirection
  - ScrollFadeEdge
  - ScrollFadeSize
  - ScrollFadeOptions
---

# ScrollFade

## Overview
Svelte 5 attachment (`scrollFade`) that applies dynamic, GPU-composited edge alpha fade masks to scrollable containers using CSS Scroll-Driven Animations (`scroll(self block)` / `scroll(self inline)`) and `@property` lengths.

## Usage Guidance
- **`md`** *(recommended default)*: Standard size for most UI scroll areas.
- **`sm`**: Very small scroll containers.
- **`lg`**: Very large or app-wide scroll containers.
- **Pairing**: Generally match `ScrollFade` size to the `ScrollArea` size (e.g., `md` with `md`) for balanced proportions.

## API

### `scrollFade(options: ScrollFadeOptions): Attachment<Element>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `ScrollFadeSize` | Yes | — | Maximum fade depth: `"sm"` (24px), `"md"` (40px), `"lg"` (64px). |
| `direction` | `ScrollFadeDirection` | Yes | — | Scroll axis to track: `"vertical" \| "horizontal" \| "both"`. |
| `edges` | `ScrollFadeEdge` | Yes | — | Edges to fade: `"both" \| "start" \| "end"`. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. |

### Applied Class & `data-*` Attributes
- Class: `.cs-scroll-fade`
- `data-force-animate=""`
- `data-scroll-fade-size={size}`
- `data-scroll-fade-direction={direction}`
- `data-scroll-fade-edges={edges}`

## Examples

```svelte
<script lang="ts">
    import { scrollFade } from "cs/svelte/scroll-fade";
</script>

<div class="overflow-y-auto max-h-80" {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}>
    {#each items as item}
        <div>{item}</div>
    {/each}
</div>
```

## Behavior & Quirks
- **Zero JS scroll listeners:** Entirely driven by CSS `animation-timeline: scroll(self ...)` on the compositor thread. When content fits without scrolling, the timeline is inactive and fade lengths stay at `0px`.
- **`data-force-animate`:** Opts into animation even under `prefers-reduced-motion` because the fade is a static spatial scroll-position indicator rather than autonomous motion.
- **Pair with `<ScrollAreaContent />`:** When using `<ScrollArea />`, attach `scrollFade` to `<ScrollAreaContent />` rather than `<ScrollArea />` so overlay scrollbars are not masked.
