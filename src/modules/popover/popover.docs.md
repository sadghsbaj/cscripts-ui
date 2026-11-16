---
name: Popover
kind: hybrid
import: cs/svelte/popover
exports:
  - Popover
  - popoverTrigger
  - POPOVER_PLACEMENTS
  - POPOVER_WIDTHS
  - PopoverPlacement
  - PopoverWidth
  - PopoverProps
  - PopoverTriggerOptions
---

# Popover

## Overview
Low-level floating surface primitive (`<Popover />`) and trigger attachment (`popoverTrigger`) built on the native HTML Popover API (`popover="auto" | "manual" | "hint"`) and CSS Anchor Positioning, with automatic placement flips, directional spring motion, and hint warmup acceleration.

## API

### `Popover` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | — | Unique ID; automatically binds `position-anchor: --anchor-${id}`. |
| `placement` | `PopoverPlacement` | Yes | — | Anchor placement: `"top" \| "top-start" \| "top-end" \| "right" \| "right-start" \| "right-end" \| "bottom" \| "bottom-start" \| "bottom-end" \| "left" \| "left-start" \| "left-end"`. |
| `width` | `PopoverWidth` | Yes | — | Width sizing: `"content"` (`max-content`), `"anchor"` (`anchor-size(inline)`), `"min-anchor"` (`max-content` with `min-inline-size: anchor-size(inline)`). |
| `popover` | `"" \| "auto" \| "manual" \| "hint"` | No | `"auto"` | Native HTML `popover` attribute mode. |
| `animate` | `boolean` | No | `true` | Enables built-in directional spring + blur entrance/exit transitions. |
| `offset` | `string` | No | `"8px"` | Gap between trigger and popover (`--cs-popover-offset`). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>`. |

### `popoverTrigger(options: PopoverTriggerOptions): Attachment<HTMLElement>`
Wires a trigger element's `anchor-name: --anchor-${target}` and interaction behavior:

| Option | Modes | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `target` | All | `string` | — | Required ID of the target `<Popover />`. |
| `enabled` | All | `boolean \| (() => boolean)` | `true` | Enables or disables the trigger attachment. |
| `mode` | All | `"auto" \| "manual" \| "hint"` | `"auto"` | `"auto"` toggles via `popovertarget`; `"manual"` wires anchor only; `"hint"` uses hardened `interestfor`. |
| `triggerOn` | `"auto"` | `"pointerdown" \| "click"` | `"pointerdown"` | `"pointerdown"` opens immediately on mouse down (touch/keyboard keep click). |
| `delay` | `"hint"` | `string` | `"400ms 150ms"` | Native `interest-delay` shorthand (`"<open> <close>"`). |
| `dismissOnPress` | `"hint"` | `boolean` | `true` | Dismisses the hint popover on pointer press or `Enter` / `Space`. |

### `data-*` Attributes
- `data-width={width}`, `data-placement={placement}`, `data-animate` (when `animate` is true).
- Hint warmup sets `data-hint-warm` on `<html>`, `data-warm` on warm-opened hint popovers, and `data-instant` on replaced hint popovers.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-popover-offset` | `"8px"` | Margin offset between anchor and popover. |
| `--cs-popover-anim-distance` | `8px` | Directional slide distance. |
| `--cs-popover-anim-scale-start` / `--cs-popover-anim-scale-exit` | `0.9` / `0.95` | Entry and exit scale factors. |
| `--cs-popover-anim-blur-start` / `--cs-popover-anim-blur-exit` | `3.5px` / `2px` | Entry and exit blur radius. |
| `--cs-popover-anim-dur-in` / `-fade-in` / `-blur-in` / `-out` | `380ms` / `160ms` / `190ms` / `120ms` | Entrance and exit transition durations. |

## Examples

```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger } from "cs/svelte/popover";
</script>

<Button variant="secondary" size="md" {@attach popoverTrigger({ target: "menu-popover" })}>
    <ButtonLabel>Options</ButtonLabel>
</Button>

<Popover id="menu-popover" placement="bottom-start" width="min-anchor" class="bg-elevated shadow-floating rounded-xl p-2">
    <div>Menu item</div>
</Popover>
```

## Behavior & Quirks
- **Automatic anchor pairing:** `<Popover id="foo" />` listens to `--anchor-foo` and `popoverTrigger({ target: "foo" })` sets `anchor-name: --anchor-foo` automatically.
- **Hint focus hardening:** In `mode: "hint"`, `interestfor` is disarmed on programmatic focus restoration (e.g. switching OS windows) unless `:focus-visible` or `:hover` is active.
- **Warmup window:** When any hint popover is open or closed within the 300ms cooldown, subsequent hint triggers open with `0ms` delay and skip entrance/exit transitions (`data-warm` / `data-instant`) for instant toolbar scrubbing.
