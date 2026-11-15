---
name: RovingFocus
kind: attachment
import: cs/svelte/focus
exports:
  - rovingFocus
  - RovingFocusOrientation
  - RovingFocusDirection
  - RovingFocusItems
  - RovingFocusChangeReason
  - RovingFocusChangeEvent
  - RovingFocusOptions
---

# RovingFocus

## Overview
`rovingFocus` is a headless Svelte 5 element attachment (`{@attach rovingFocus(...)}`) implementing the W3C APG roving `tabindex` pattern for composite widgets such as toolbars, segmented controls, menus, listboxes, and tablists.

## API

### `rovingFocus<T extends HTMLElement = HTMLElement>(options: RovingFocusOptions): Attachment<T>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `orientation` | `RovingFocusOrientation \| (() => RovingFocusOrientation)` | Yes | — | Navigation axis: `"horizontal"` (`ArrowLeft`/`ArrowRight`), `"vertical"` (`ArrowUp`/`ArrowDown`), or `"both"`. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. Accepts a reactive getter. |
| `dir` | `RovingFocusDirection` | No | `"auto"` | Text direction for horizontal arrows (`"ltr"`, `"rtl"`, or `"auto"`, which reads `getComputedStyle(container).direction`). |
| `loop` | `boolean \| (() => boolean)` | No | `true` | Wraps arrow navigation from the last item to the first and vice versa. |
| `homeEnd` | `boolean \| (() => boolean)` | No | `true` | Enables `Home` (first item) and `End` (last item) navigation. |
| `items` | `RovingFocusItems` | No | Auto-discovery | CSS selector string or `(container) => HTMLElement[]` resolver. Defaults to focusable descendants including `tabindex="-1"`. |
| `initialActive` | `string \| ((items: HTMLElement[], container: HTMLElement) => HTMLElement \| null)` | No | `undefined` | Selector (matched via `item.matches(...)`) or resolver to pick the initial active item on mount. |
| `preventScroll` | `boolean` | No | `false` | Passed to `target.focus({ preventScroll })`. Defaults to `false` so arrow navigation scrolls items into view in scrollable lists (unlike `autoFocus` and `focusTrap`, which default to `true`). |
| `onActiveChange` | `(event: RovingFocusChangeEvent) => void` | No | `undefined` | Fired when the active item changes, with `{ activeItem, previousItem, container, reason }`. |

### `data-*` Attributes

| Attribute | Target | Presence | Purpose |
| :--- | :--- | :--- | :--- |
| `data-roving-focus` | `container` | `""` while enabled | Marks the roving container boundary for nested isolation and styling; removed on teardown. |
| `data-roving-active` | Active item | `""` on active `tabindex="0"` item | Exposes the active roving item to CSS independently of `:focus-visible`; removed on teardown. |

### Exported Types

```ts
export type RovingFocusOrientation = "horizontal" | "vertical" | "both";
export type RovingFocusDirection = "ltr" | "rtl" | "auto";
export type RovingFocusItems = string | ((container: HTMLElement) => HTMLElement[]);
export type RovingFocusChangeReason = "keyboard" | "pointer" | "focus" | "init" | "mutation";

export interface RovingFocusChangeEvent {
    activeItem: HTMLElement;
    previousItem: HTMLElement | null;
    container: HTMLElement;
    reason: RovingFocusChangeReason;
}
```

## Examples

```svelte
<script lang="ts">
    import { rovingFocus } from "cs/svelte/focus";
</script>

<div role="toolbar" aria-label="Formatting" {@attach rovingFocus({ orientation: "horizontal" })}>
    <button type="button">Bold</button>
    <button type="button">Italic</button>
    <button type="button">Underline</button>
</div>

<!-- Styling the active roving item in Svelte 5 scoped <style> -->
<div role="listbox" {@attach rovingFocus({ orientation: "vertical" })}>
    <button type="button" class="roving-item">Inbox</button>
    <button type="button" class="roving-item">Drafts</button>
    <button type="button" class="roving-item">Archive</button>
</div>

<style>
    .roving-item:focus-visible {
        outline: none;
    }

    /* Wrap dynamic data-roving-* attributes in :global() to avoid css_unused_selector */
    :global([data-roving-focus]):focus-within .roving-item:global([data-roving-active]) {
        background: var(--cs-color-accent-soft);
        color: var(--cs-color-accent-soft-fg);
    }
</style>
```

## Behavior & Quirks
- **Svelte 5 scoped `<style>` `:global(...)` requirement:** `data-roving-focus` and `data-roving-active` are added dynamically at runtime by `{@attach rovingFocus(...)}` rather than statically in the template. Svelte 5's CSS compiler strips bare `[data-roving-focus]` or `[data-roving-active]` selectors with a `css_unused_selector` warning. Always wrap them in `:global(...)` (e.g., `:global([data-roving-focus]):focus-within .item:global([data-roving-active])`).
- **`preventScroll` default contrast:** `rovingFocus` defaults `preventScroll` to `false` so keyboard arrow navigation scrolls off-screen items into view inside scrollable menus/listboxes. By contrast, `autoFocus` and `focusTrap` default `preventScroll` to `true` to prevent viewport jumps on mount.
- **Modifier & text/range input guards:** Key events with `altKey`, `ctrlKey`, `metaKey`, or `shiftKey` are ignored. Events originating from `<textarea>`, `<select>`, `[contenteditable]`, or text/range `<input>` types (`text`, `search`, `email`, `url`, `tel`, `password`, `number`, `range`, `date`, `datetime-local`, `month`, `time`, `week`) are also ignored so native caret movement and value editing are never hijacked.
- **Nested `[data-roving-focus]` isolation:** Item discovery and event handlers verify `el.closest("[data-roving-focus]") === container`, ensuring outer roving containers never claim items or intercept events belonging to nested roving containers. On teardown, cleanup skips elements now owned by a still-mounted inner roving container.
- **`MutationObserver` promotion & `WeakMap` `tabindex` restoration:** A `MutationObserver` watches `childList`, `subtree`, and `attributes` (`disabled`, `aria-disabled`, `hidden`, `inert`, `data-roving-focus`). If the active item is removed, disabled, or hidden, `rovingFocus` promotes the nearest valid sibling (and focuses it if focus was within the container). Original `tabindex` values are tracked in a `WeakMap` and restored (or removed if originally absent) on teardown.
- **Composition with `autoFocus` and `focusTrap`:** Inside a modal dialog or popover, pair `focusTrap` or `autoFocus` on the outer overlay with `rovingFocus` on the inner toolbar/listbox, or target `[data-roving-active]` with `initialFocus` / `target` so the active roving item receives initial focus immediately.
