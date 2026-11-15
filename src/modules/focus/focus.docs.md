---
name: Focus
kind: attachment
import: cs/svelte/focus
exports:
  - autoFocus
  - focusTrap
  - AutoFocusTarget
  - AutoFocusSelection
  - AutoFocusTiming
  - AutoFocusSuccessEvent
  - AutoFocusErrorEvent
  - AutoFocusOptions
  - FocusTrapTarget
  - FocusTrapTiming
  - FocusTrapSuccessEvent
  - FocusTrapErrorEvent
  - FocusTrapOptions
---

# Focus

## Overview
Focus management attachments for Svelte 5: `autoFocus` for reliable initial focusing with text selection and focus restoration, and `focusTrap` for W3C APG modal dialog focus containment with nested trap stacking.

## API

### `autoFocus(options?: AutoFocusOptions): Attachment<T>`
`T extends HTMLElement = HTMLElement`.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `target` | `"self" \| "first-focusable" \| "last-focusable" \| string \| ((container: HTMLElement) => HTMLElement \| null)` | No | `"first-focusable"` (or `"self"`) | Element or strategy to focus. |
| `select` | `"all" \| "start" \| "end" \| [number, number] \| boolean` | No | `false` | Text selection or caret placement for inputs, textareas, and `contenteditable`. |
| `preventScroll` | `boolean` | No | `true` | Passes `{ preventScroll }` to `.focus()`. |
| `timing` | `"immediate" \| "microtask" \| "raf" \| "idle"` | No | `"raf"` | Scheduling strategy for the initial focus attempt. |
| `delay` | `number` | No | `0` | Delay in ms before attempting focus (overrides `timing` when `> 0`). |
| `restoreFocus` | `boolean \| HTMLElement \| (() => HTMLElement \| null)` | No | `false` | Restores focus on unmount (`true` snapshots `activeElement` at mount). |
| `retries` | `number` | No | `3` | Number of `requestAnimationFrame` retries if no focusable target is found yet. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. |
| `onSuccess` | `(event: AutoFocusSuccessEvent) => void` | No | `undefined` | Fired with `{ target, container }` on success. |
| `onError` | `(event: AutoFocusErrorEvent) => void` | No | `undefined` | Fired with `{ error, container }` on failure. |

**`data-*` attributes (`autoFocus`):** `data-autofocused` on success, `data-autofocus-failed` on failure.

### `focusTrap(options: FocusTrapOptions): Attachment<T>`
`T extends HTMLElement = HTMLElement`.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `initialFocus` | `FocusTrapTarget \| false` | Yes | — | Initial target (`"first-focusable" \| "last-focusable" \| "self" \| string \| fn`) or `false` to skip initial focus. |
| `fallbackFocus` | `FocusTrapTarget` | No | `"self"` | Fallback target if `initialFocus` resolves to `null`. |
| `restoreFocus` | `boolean \| HTMLElement \| (() => HTMLElement \| null)` | No | `true` | Restores focus on unmount (or hands off to parent trap if nested). |
| `preventScroll` | `boolean` | No | `true` | Passes `{ preventScroll }` to `.focus()`. |
| `timing` | `"immediate" \| "microtask" \| "raf" \| "idle"` | No | `"raf"` | Scheduling strategy for initial focus. |
| `delay` | `number` | No | `0` | Delay in ms before initial focus. |
| `retries` | `number` | No | `3` | Frame retries when resolving initial target. |
| `onEscape` | `(event: KeyboardEvent) => void` | No | `undefined` | Called on `Escape` keydown when this trap is topmost (calls `preventDefault()` and `stopPropagation()`). |
| `allowOutsideClick` | `boolean \| ((event: MouseEvent \| PointerEvent) => boolean)` | No | `false` | Whether pointerdowns outside the container are allowed. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. |
| `onActivate` | `(container: HTMLElement) => void` | No | `undefined` | Fired when the trap activates. |
| `onDeactivate` | `(container: HTMLElement) => void` | No | `undefined` | Fired on teardown. |
| `onSuccess` | `(event: FocusTrapSuccessEvent) => void` | No | `undefined` | Fired on initial focus success. |
| `onError` | `(event: FocusTrapErrorEvent) => void` | No | `undefined` | Fired on initial focus failure. |

**`data-*` attributes (`focusTrap`):** `data-focus-trapped`, `data-focus-trap-paused` (when occluded by a nested trap), `data-focus-trap-failed`.

## Examples

```svelte
<script lang="ts">
    import { autoFocus, focusTrap } from "cs/svelte/focus";
</script>

<input {@attach autoFocus({ select: "all" })} value="Rename me" />

<div role="dialog" aria-modal="true" {@attach focusTrap({ initialFocus: "first-focusable", onEscape: close })}>
    <button onclick={close}>Close</button>
</div>
```

## Behavior & Quirks
- **Nested traps:** `focusTrap` maintains a module-level stack; mounting a child trap automatically pauses the parent trap (`data-focus-trap-paused`) and resumes it when the child unmounts.
- **Temporary `tabindex="-1"`:** If a non-focusable target or container is focused, `tabindex="-1"` is added and deterministically removed on teardown.
