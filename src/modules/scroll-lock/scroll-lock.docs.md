---
name: ScrollLock
kind: attachment
import: cs/svelte/scroll-lock
exports:
  - scrollLock
  - ScrollLockOptions
---

# ScrollLock

## Overview
Svelte 5 attachment (`scrollLock`) that prevents uncontained background scrolling by intercepting `wheel` and `touchmove` gestures on non-scrollable surfaces or boundary-reached descendants—without mutating `document.body` styles or causing scrollbar layout shifts.

## API

### `scrollLock(options?: ScrollLockOptions): Attachment<HTMLElement>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables scroll locking reactively. |
| `allowScrollableChildren` | `boolean` | No | `true` | Allows scrolling inside scrollable descendants (cancels only when at scroll boundary or on non-scrollable nodes). |
| `isScrollable` | `(element: HTMLElement) => boolean \| undefined` | No | `undefined` | Custom predicate to override default scrollable-element detection (`undefined` falls back to default heuristics). |
| `dataAttribute` | `boolean` | No | `true` | Toggles `data-scroll-locked=""` on the attached element while active. |

### `data-*` Attributes
- `data-scroll-locked` (when `enabled` and `dataAttribute` are true)

## Examples

```svelte
<script lang="ts">
    import { scrollLock } from "cs/svelte/scroll-lock";

    let open = $state(false);
</script>

<div {@attach scrollLock({ enabled: () => open })}>
    <div class="overflow-y-auto max-h-60">
        Scrollable inner content
    </div>
</div>
```

## Behavior & Quirks
- **Boundary-aware wheel containment:** Inspects `deltaY` / `deltaX` against `scrollTop` / `scrollLeft` on scrollable ancestors so reaching the top or bottom of an inner list does not chain scroll momentum to the page behind it.
- **Scrollable heuristics:** Recognizes `[data-scrollable="true"]`, `.cs-scroll-area-content`, and computed `overflow: auto | scroll` with overflowing content; `[data-scrollable="false"]` explicitly opts an element out.
