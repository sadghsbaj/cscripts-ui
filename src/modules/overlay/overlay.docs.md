---
name: Overlay
kind: hybrid
import: cs/svelte/overlay
exports:
  - Overlay
  - topLayer
  - OVERLAY_VARIANTS
  - OverlayVariant
  - OverlayProps
  - TopLayerOptions
---

# Overlay

## Overview
Fullscreen backdrop surface (`<Overlay />`) promoted to the browser's native Top Layer via `popover="manual"` and the `topLayer` attachment. Includes optical blur/dim/solid/transparent variants, safe backdrop click-dismiss ergonomics, and `scrollLock` containment.

## API

### `Overlay` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "popover">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `OverlayVariant` | Yes | — | Backdrop style: `"blur" \| "dim" \| "solid" \| "transparent"`. |
| `lockScroll` | `boolean` | No | `true` | Prevents background scrolling outside scrollable descendants via `scrollLock`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

### `topLayer(options?: TopLayerOptions): Attachment<HTMLElement>`
Promotes any `[popover]` element to the Top Layer on mount via `showPopover()` and closes it on unmount via `hidePopover()`.
- `enabled?: boolean | (() => boolean)` (`@default true`).

### `data-*` Attributes
- `data-variant={variant}`
- `data-scroll-locked` (when `lockScroll` is `true`, inherited from `scrollLock`)

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-overlay-padding` (on `:root`) | `clamp(1rem, 0.5rem + 2dvmin, 2rem)` | Viewport edge padding; exposed on `:root` so floating children can align to the same inset. |

## Examples

```svelte
<script lang="ts">
    import { Overlay } from "cs/svelte/overlay";

    let open = $state(false);
</script>

{#if open}
    <Overlay variant="blur" onclick={() => (open = false)}>
        <div class="bg-elevated shadow-elevated rounded-2xl p-6">
            Modal content
        </div>
    </Overlay>
{/if}
```

## Behavior & Quirks
- **Safe backdrop dismiss:** `onclick` only fires when both `pointerdown` and `click` occur directly on the backdrop (`event.target === event.currentTarget`), preventing accidental dismissal when dragging text selection out of a child dialog.
- **160ms exit transition:** Uses a custom `out:overlayExit` Svelte transition that calls `hidePopover()` and holds DOM removal for 160ms so CSS `allow-discrete` / `overlay` exit animations complete cleanly.
- **Conditional rendering:** Mount `<Overlay />` inside `{#if open}`—it opens automatically on mount via `topLayer()`.
