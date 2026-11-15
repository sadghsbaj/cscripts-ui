---
name: FadeMask
kind: attachment
import: cs/svelte/fade-mask
exports:
  - fadeMask
  - FADE_MASK_VARIANTS
  - FADE_MASK_STRENGTHS
  - FadeMaskVariant
  - FadeMaskStrength
  - FadeMaskOptions
---

# FadeMask

## Overview
Svelte 5 attachment (`fadeMask`) that applies static CSS `oklch` alpha gradient masks (`radial`, directional, or symmetrical `block`/`inline`) to HTML and SVG elements.

## API

### `fadeMask(options: FadeMaskOptions): Attachment<Element>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `FadeMaskVariant` | Yes | — | Mask shape/direction: `"radial" \| "top" \| "bottom" \| "left" \| "right" \| "block" \| "inline"`. |
| `strength` | `FadeMaskStrength` | Yes | — | Falloff preset: `"sm"` (60%→100%, 15% edge), `"md"` (30%→90%, 25% edge), `"lg"` (0%→75%, 35% edge). |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. |

### Applied Class & `data-*` Attributes
- Class: `.cs-fade-mask`
- `data-fade-mask-variant={variant}`
- `data-fade-mask-strength={strength}`

## Examples

```svelte
<script lang="ts">
    import { BackgroundPattern } from "cs/svelte/background-pattern";
    import { fadeMask } from "cs/svelte/fade-mask";
</script>

<div class="relative isolate h-48 overflow-hidden" {@attach fadeMask({ variant: "radial", strength: "lg" })}>
    <BackgroundPattern variant="grid" size="md" />
</div>
```

## Behavior & Quirks
- **Static vs scroll-driven:** `fadeMask` applies a static mask regardless of scroll position; use `scrollFade` from `cs/svelte/scroll-fade` for dynamic scroll-driven edge fades.
- **No reactive re-run on plain props:** If `enabled` depends on reactive state, pass a getter `enabled: () => condition`.
