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
Low-level floating surface primitive (`<Popover />`) and trigger attachment (`popoverTrigger`) built on the native HTML Popover API (`popover="auto" | "manual" | "hint"`) and CSS Anchor Positioning, with automatic placement flips, directional spring motion, and hover warmup acceleration.

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

| Option | Trigger Modes | Type | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `target` | All | `string` | — | Required ID of the target `<Popover />`. |
| `enabled` | All | `boolean \| (() => boolean)` | `true` | Enables or disables the trigger attachment. |
| `triggerOn` | All | `"pointerdown" \| "click" \| "hover" \| "manual"` | — | Required. `"pointerdown"` / `"click"` toggle via `popovertarget`; `"hover"` uses JS hover/focus timers (`bindHover`); `"manual"` binds `anchor-name` only. |
| `delay` | `"hover"` | `[number, number]` | `[400, 150]` | Open and close delays in milliseconds (`[openMs, closeMs]`). |
| `dismissOnPress` | `"hover"` | `boolean` | `true` | Dismisses the hover popover on pointer press or `Enter` / `Space`. |

### `data-*` Attributes
- `data-width={width}`, `data-placement={placement}`, `data-animate` (when `animate` is true).
- Hover warmup sets `data-warm` on warm-opened popovers and `data-instant` on replaced popovers to skip entrance/exit transitions.

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

<Button variant="secondary" size="md" {@attach popoverTrigger({ target: "menu-popover", triggerOn: "pointerdown" })}>
    <ButtonLabel>Options</ButtonLabel>
</Button>

<Popover id="menu-popover" placement="bottom-start" width="min-anchor" class="bg-elevated shadow-floating rounded-xl p-2">
    <div>Menu item</div>
</Popover>
```

## Behavior & Quirks
- **Automatic anchor pairing:** `<Popover id="foo" />` listens to `--anchor-foo` and `popoverTrigger({ target: "foo", triggerOn: "click" })` sets `anchor-name: --anchor-foo` automatically.
- **Choosing `triggerOn: "pointerdown"` vs. `"click"`:**
  - `"pointerdown"`: Ideal for menus, selects, and dropdowns where immediate opening and press-drag-release (`pointerup` on an item) feel natural (touch and keyboard still activate on `click`).
  - `"click"`: Better for standard toolbar/header action buttons or disclosure popovers where opening before pointer release feels jarring or conflicts with normal button click expectations.
- **Hover focus & scroll hardening (`triggerOn: "hover"`):** `bindHover` opens on mouse `pointerenter` (touch contacts are ignored) and keyboard `:focus-visible` (`focusin`), while ignoring programmatic or pointer-driven focus restoration (e.g. switching OS windows). Pressing the trigger (when `dismissOnPress` is `true`), pressing `Escape`, or scrolling outside the popover closes it immediately and disarms hover until pointer/focus leaves.
- **Hover warmup window (`triggerOn: "hover"`):** While a hover popover is open or within the `300ms` cooldown after closing, subsequent hover triggers open with `0ms` delay and skip entrance/exit transitions (`data-warm` / `data-instant`) for instant toolbar scrubbing.
