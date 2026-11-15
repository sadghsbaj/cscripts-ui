---
name: FocusTrap
kind: attachment
import: cs/svelte/focus
exports:
  - focusTrap
  - FocusTrapTarget
  - FocusTrapTiming
  - FocusTrapSuccessEvent
  - FocusTrapErrorEvent
  - FocusTrapOptions
---

# FocusTrap

## Overview
`focusTrap` is a Svelte 5 element attachment (`{@attach focusTrap(...)}`) implementing the W3C APG modal dialog focus containment pattern, including cyclical `Tab` / `Shift+Tab` wrapping, outside-click/focus guards, `Escape` handling, and nested trap stacking.

## API

### `focusTrap<T extends HTMLElement = HTMLElement>(options: FocusTrapOptions): Attachment<T>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `initialFocus` | `FocusTrapTarget \| false` | Yes | — | Initial target (`"first-focusable"`, `"last-focusable"`, `"self"`, CSS selector, or resolver function) or `false` to skip initial focus. |
| `fallbackFocus` | `FocusTrapTarget` | No | `"self"` | Fallback target if `initialFocus` resolves to `null`. |
| `restoreFocus` | `boolean \| HTMLElement \| (() => HTMLElement \| null)` | No | `true` | Restores focus on unmount (`true` snapshots `getActiveElement()` at mount) or hands off to the parent trap when nested. |
| `preventScroll` | `boolean` | No | `true` | Passed to `targetElement.focus({ preventScroll })`. |
| `timing` | `FocusTrapTiming` | No | `"raf"` | Scheduling strategy for initial focus: `"immediate"`, `"microtask"`, `"raf"`, or `"idle"`. |
| `delay` | `number` | No | `0` | Delay in milliseconds before initial focus; overrides `timing` when `> 0`. |
| `retries` | `number` | No | `3` | Number of `requestAnimationFrame` retries if initial/fallback target is not resolved yet. |
| `onEscape` | `(event: KeyboardEvent) => void` | No | `undefined` | Called on `Escape` keydown when this trap is topmost (automatically calls `preventDefault()` and `stopPropagation()`). |
| `allowOutsideClick` | `boolean \| ((event: MouseEvent \| PointerEvent) => boolean)` | No | `false` | Controls whether pointerdowns outside `container` are allowed (`false` intercepts and returns focus; `true` also allows external `focusin`). |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the trap. Accepts a reactive getter. |
| `onActivate` | `(container: HTMLElement) => void` | No | `undefined` | Fired when initial focus completes (or immediately when `initialFocus: false`). |
| `onDeactivate` | `(container: HTMLElement) => void` | No | `undefined` | Fired on teardown before focus restoration. |
| `onSuccess` | `(event: FocusTrapSuccessEvent) => void` | No | `undefined` | Fired with `{ target, container }` on initial focus success. |
| `onError` | `(event: FocusTrapErrorEvent) => void` | No | `undefined` | Fired with `{ error, container }` on initial focus failure. |

### `data-*` Attributes

| Attribute | Target | Presence | Purpose |
| :--- | :--- | :--- | :--- |
| `data-focus-trapped` | `container` | `""` when active | Marks an active focus trap; removed on teardown. |
| `data-focus-trap-paused` | `container` | `""` when occluded | Added when a nested child trap is pushed onto `trapStack`; removed when resumed or torn down. |
| `data-focus-trap-failed` | `container` | `""` on failure | Added if initial/fallback focus resolution fails; cleared on success or teardown. |

### Exported Types

```ts
export type FocusTrapTarget =
    | "first-focusable"
    | "last-focusable"
    | "self"
    | (string & {})
    | ((container: HTMLElement) => HTMLElement | null);

export type FocusTrapTiming = "immediate" | "microtask" | "raf" | "idle";

export interface FocusTrapSuccessEvent {
    target: HTMLElement;
    container: HTMLElement;
}

export interface FocusTrapErrorEvent {
    error: unknown;
    container: HTMLElement;
}
```

## Examples

```svelte
<script lang="ts">
    import { focusTrap } from "cs/svelte/focus";

    let open = $state(false);
</script>

{#if open}
    <div
        role="dialog"
        aria-modal="true"
        {@attach focusTrap({
            initialFocus: "first-focusable",
            onEscape: () => (open = false),
        })}
    >
        <h2>Confirm Action</h2>
        <button type="button" onclick={() => (open = false)}>Cancel</button>
        <button type="button" onclick={() => (open = false)}>Confirm</button>
    </div>
{/if}
```

## Behavior & Quirks
- **Nested `trapStack` pause/resume handoff:** `focusTrap` maintains a module-level `trapStack`. Mounting a child trap pauses the previous topmost trap (`data-focus-trap-paused`). When the child unmounts, it pops itself and calls `nextTop.resume(validRestoreTarget)` on the parent trap—focusing `validRestoreTarget` if it resides inside the parent container, otherwise falling back to the parent's `lastFocusedElement`, first focusable descendant, or container.
- **Document-capture listeners:** `keydown`, `pointerdown`, and `focusin` listeners are registered on `document` with `{ capture: true }` so focus containment works reliably before inner handlers run, and only the topmost, non-paused trap handles events.
- **Temporary `tabindex="-1"` cleanup:** When `focusTrap` falls back to focusing `container` itself and `container` has no `tabindex` attribute, it sets `tabindex="-1"` and removes it on teardown if still `"-1"`.
- **Empty containers:** If a trap contains no focusable descendants, `Tab` / `Shift+Tab` prevents default and locks focus to `container`.
- **Outside clicks & `focusin`:** When `allowOutsideClick` is `false` (default), `pointerdown` outside `container` calls `preventDefault()`, `stopImmediatePropagation()`, and returns focus into the trap; external `focusin` events also pull focus back unless `allowOutsideClick === true`.
