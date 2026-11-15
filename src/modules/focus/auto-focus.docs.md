---
name: AutoFocus
kind: attachment
import: cs/svelte/focus
exports:
  - autoFocus
  - AutoFocusTarget
  - AutoFocusSelection
  - AutoFocusTiming
  - AutoFocusSuccessEvent
  - AutoFocusErrorEvent
  - AutoFocusOptions
---

# AutoFocus

## Overview
`autoFocus` is a Svelte 5 element attachment (`{@attach autoFocus(...)}`) for reliably focusing an element or descendant on mount, with optional text selection, frame retries for asynchronous renders, and focus restoration on unmount.

## API

### `autoFocus<T extends HTMLElement = HTMLElement>(options?: AutoFocusOptions): Attachment<T>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `target` | `AutoFocusTarget` | No | `"first-focusable"` | Element or strategy to focus (`"self"`, `"first-focusable"`, `"last-focusable"`, CSS selector string, or `(container) => HTMLElement \| null`). |
| `select` | `AutoFocusSelection` | No | `false` | Text selection or cursor placement (`true` \| `"all"`, `"start"`, `"end"`, `[start, end]`, or `false`). |
| `preventScroll` | `boolean` | No | `true` | Passed to `targetElement.focus({ preventScroll })` to prevent viewport jumps. |
| `timing` | `AutoFocusTiming` | No | `"raf"` | Scheduling strategy: `"immediate"`, `"microtask"`, `"raf"`, or `"idle"` (`requestIdleCallback` with `200` ms timeout). |
| `delay` | `number` | No | `0` | Delay in milliseconds before attempting focus; overrides `timing` when `> 0`. |
| `restoreFocus` | `boolean \| HTMLElement \| (() => HTMLElement \| null)` | No | `false` | Restores focus on unmount (`true` snapshots `getActiveElement()` at mount time; function is evaluated lazily on unmount). |
| `retries` | `number` | No | `3` | Number of `requestAnimationFrame` retries if no focusable target is resolved yet. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. Accepts a reactive getter. |
| `onSuccess` | `(event: AutoFocusSuccessEvent) => void` | No | `undefined` | Fired with `{ target, container }` when focus succeeds. |
| `onError` | `(event: AutoFocusErrorEvent) => void` | No | `undefined` | Fired with `{ error, container }` when target resolution or `.focus()` fails. |

### `data-*` Attributes

| Attribute | Target | Presence | Purpose |
| :--- | :--- | :--- | :--- |
| `data-autofocused` | `container` | `""` on success | Indicates initial focus succeeded; removed on teardown. |
| `data-autofocus-failed` | `container` | `""` on failure | Indicates target resolution or `.focus()` failed; cleared on success or teardown. |

### Exported Types

```ts
export type AutoFocusTarget =
    | "self"
    | "first-focusable"
    | "last-focusable"
    | (string & {})
    | ((container: HTMLElement) => HTMLElement | null);

export type AutoFocusSelection = "all" | "start" | "end" | [start: number, end: number] | boolean;

export type AutoFocusTiming = "immediate" | "microtask" | "raf" | "idle";

export interface AutoFocusSuccessEvent {
    target: HTMLElement;
    container: HTMLElement;
}

export interface AutoFocusErrorEvent {
    error: unknown;
    container: HTMLElement;
}
```

## Examples

```svelte
<script lang="ts">
    import { autoFocus } from "cs/svelte/focus";

    let open = $state(false);
</script>

<!-- Focus input and select all text on mount -->
<input {@attach autoFocus({ select: "all" })} value="Rename me" />

<!-- Focus first focusable descendant in a popover and restore focus on close -->
{#if open}
    <div {@attach autoFocus({ target: "first-focusable", restoreFocus: true })}>
        <input type="search" placeholder="Filter..." />
        <button type="button" onclick={() => (open = false)}>Close</button>
    </div>
{/if}

<!-- Conditionally enabled via reactive getter -->
<input {@attach autoFocus({ enabled: () => open, timing: "immediate" })} />
```

## Behavior & Quirks
- **Reactive `enabled` getter:** `resolveGetter(enabled)` is evaluated inside the attachment setup callback (which runs inside Svelte 5's attachment `$effect`). Passing a getter like `enabled: () => isReady` re-runs the attachment when `isReady` changes; when `false`, no timers are scheduled and a no-op cleanup is returned.
- **Target fallback:** When `target` is omitted, `"first-focusable"`, or `"last-focusable"`, `autoFocus` queries focusable descendants first and falls back to `container` itself if `container` is focusable.
- **Temporary `tabindex="-1"` cleanup:** If a resolved `targetElement` has no `tabindex` attribute and is not natively focusable (e.g., a `<div>` or `<h2>` targeted via `target: "self"` or a selector), `autoFocus` sets `tabindex="-1"` before calling `.focus()` and deterministically removes it on teardown if it is still `"-1"`.
- **Shadow DOM `activeElement` traversal:** `getActiveElement()` walks `active.shadowRoot.activeElement` recursively, so `restoreFocus: true` snapshots and skips redundant `.focus()` calls accurately even when focus lives inside a Shadow DOM.
- **Selection quirks:** For `<input>` and `<textarea>`, `select()` and `setSelectionRange()` are wrapped in `try/catch` to ignore input types that do not support selection ranges (such as `number` or `email` on some engines). For `contenteditable` elements, selection uses `window.getSelection()` and `document.createRange()`.
- **Restoration:** On teardown, `restoreFocus` always calls `.focus({ preventScroll: true })` and only restores if the target is still connected and not disabled or inert.
