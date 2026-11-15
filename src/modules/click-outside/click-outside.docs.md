---
name: ClickOutside
kind: attachment
import: cs/svelte/click-outside
exports:
  - clickOutside
  - ClickOutsideTarget
  - ClickOutsideIgnore
  - ClickOutsideEventName
  - ClickOutsideDetail
  - ClickOutsideHandler
  - ClickOutsideOptions
---

# ClickOutside

## Overview
Svelte 5 attachment (`clickOutside`) that detects pointer/click interactions outside an element while resisting drag/text-selection false positives, Shadow DOM boundaries, iframe focus, and opening-event races.

## API

### `clickOutside(options: ClickOutsideOptions): Attachment<T>`
`T extends HTMLElement | SVGElement = HTMLElement`.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `onOutsideClick` | `(detail: ClickOutsideDetail) => void` | Yes | — | Callback fired with `{ target, event, container }` when an outside interaction occurs. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables outside detection. |
| `ignore` | `ClickOutsideIgnore` | No | `undefined` | Element(s), CSS selector(s), lazy element getter(s), or `(target, event) => boolean` predicate to exclude. |
| `events` | `ClickOutsideEventName[]` | No | `["click"]` | Events to listen for: `"pointerdown" \| "pointerup" \| "click" \| "contextmenu"`. |
| `capture` | `boolean` | No | `true` | Registers document listeners in the capture phase. |
| `detectIframe` | `boolean` | No | `true` | Detects clicks inside external `<iframe>` elements via `window` `blur`. |
| `requireMatchingPointerDown` | `boolean` | No | `true` | Requires both `pointerdown` and the triggering event to originate outside (prevents drag-out false positives). |
| `delay` | `number` | No | `0` | Delay in ms before attaching listeners (or `queueMicrotask` when `0`) to avoid closing on the opening click. |

### `data-*` Attributes
- Sets `data-click-outside=""` on the attached element while active (removed on cleanup).

## Examples

```svelte
<script lang="ts">
    import { clickOutside } from "cs/svelte/click-outside";

    let open = $state(false);
    let triggerRef = $state<HTMLButtonElement | null>(null);
</script>

<button bind:this={triggerRef} onclick={() => (open = !open)}>Toggle</button>

{#if open}
    <div
        {@attach clickOutside({
            onOutsideClick: () => (open = false),
            enabled: () => open,
            ignore: () => triggerRef,
        })}
    >
        Floating panel
    </div>
{/if}
```

## Behavior & Quirks
- **Opening-event immunity:** Listener registration is deferred via `queueMicrotask` (when `delay === 0`) or `setTimeout(delay)` so the click that mounted/opened the element does not immediately dismiss it.
- **Composed path:** Inspects `event.composedPath()` so elements detached during click handlers and Shadow DOM targets are evaluated accurately.
- **Drag safety:** With `requireMatchingPointerDown: true`, starting a text selection inside the container and releasing outside will not trigger `onOutsideClick`.
