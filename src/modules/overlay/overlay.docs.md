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

## Usage Guidance
- **`blur`** *(recommended default)*: Default for most modals and overlays — separates the overlay clearly while preserving minimal background structure for context.
- **`solid`**: When the user should be completely pulled out of the underlying view (e.g., fullscreen modals or major blocking states).
- **`dim`**: When the underlying content should remain lightly visible/readable.
- **`transparent`**: Rare — only when interaction must be blocked while keeping the background completely unobstructed.

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
| `--cs-overlay-inset-top` | `0px` | Dynamically set when `window.visualViewport` offsets from the top edge and added to `padding-block-start`. |
| `--cs-overlay-inset-bottom` | `0px` | Dynamically set when `window.visualViewport` shrinks from the bottom (e.g., mobile virtual keyboard) and added to `padding-block-end`. |

## Examples

```svelte
<script lang="ts">
    import { Overlay } from "cs/svelte/overlay";

    let open = $state(false);
</script>

{#if open}
    <Overlay variant="blur" onclick={() => (open = false)}>
        <div class="bg-elevated shadow-floating rounded-2xl p-6">
            Modal content
        </div>
    </Overlay>
{/if}
```

## Behavior & Quirks
- **No built-in focus trap (dialog composition):** `<Overlay />` is intentionally a pure top-layer backdrop primitive without built-in focus trapping or auto-focus. For standard dialogs, wrap `<Modal />` from `cs/svelte/modal` inside `<Overlay />` (which wires `focusTrap` automatically); for custom non-modal surfaces, attach `focusTrap` and `autoFocus` from `cs/svelte/focus` directly on the child container.
- **Safe backdrop dismiss:** `onclick` only fires when both `pointerdown` and `click` occur directly on the backdrop (`event.target === event.currentTarget`), preventing accidental dismissal when dragging text selection out of a child dialog.
- **Mobile virtual keyboard adaptation:** `Overlay` tracks `window.visualViewport` (`resize` and `scroll`, guarded against pinch-to-zoom `scale > 1.01` and `<= 1px` subpixel noise) and expands its block padding (`--cs-overlay-inset-top` / `--cs-overlay-inset-bottom`) while keeping its `100dvh` backdrop full-screen, so centered children (such as `Modal`) automatically re-center and constrain `max-block-size: 100%` within the visible area above the keyboard. `padding-block` transitions smoothly (`--cs-dur-280` / `--cs-ease-quart-out`) when the keyboard opens and freezes its insets during `out:overlayExit` so closing dialogs fade out in place without jumping down.
- **Motion & exit transition:** Uses semantic motion tokens from `motion.css` (`--cs-dur-enter-sm` / `--cs-ease-effect` for opacity enter, `--cs-dur-enter-lg` / `--cs-ease-quart-out` for `backdrop-filter` enter, and `--cs-dur-exit-lg` / `--cs-ease-exit` for exit). On unmount, the custom `out:overlayExit` Svelte transition calls `hidePopover()` and dynamically reads the computed `transitionDuration` so JS unmount timing stays synced with CSS `allow-discrete` / `overlay` exit animations and `prefers-reduced-motion`.
- **Conditional rendering:** Mount `<Overlay />` inside `{#if open}`—it opens automatically on mount via `topLayer()`.
