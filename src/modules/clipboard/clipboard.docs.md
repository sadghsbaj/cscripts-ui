---
name: Clipboard
kind: hybrid
import: cs/svelte/clipboard
exports:
  - copyOnClick
  - pasteOnClick
  - copyToClipboard
  - readFromClipboard
  - CopyIcon
  - PasteIcon
  - COPY_ICON_STATUSES
  - PASTE_ICON_STATUSES
  - CopyIconStatus
  - PasteIconStatus
  - CopyIconProps
  - PasteIconProps
  - CopySource
  - CopyOnClickSuccessEvent
  - CopyOnClickErrorEvent
  - CopyOnClickOptions
  - PasteTarget
  - PasteTargetSupplier
  - PasteCallback
  - PasteSource
  - PasteMode
  - PasteOnClickSuccessEvent
  - PasteOnClickErrorEvent
  - PasteOnClickEmptyEvent
  - PasteOnClickOptions
---

# Clipboard

## Overview
Complete clipboard module combining `copyOnClick` and `pasteOnClick` Svelte 5 attachments, low-level `copyToClipboard` / `readFromClipboard` helpers, and animated `<CopyIcon />` / `<PasteIcon />` feedback icons.

## API

### `copyOnClick(options?: CopyOnClickOptions)`
Attachment for `HTMLElement | SVGElement`.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string \| (() => string \| Promise<string>) \| HTMLElement \| SVGElement` | No | Attached node's `value` or `textContent` | Source text, sync/async supplier, or element to copy from. |
| `feedbackDuration` | `number` | No | `2000` | Ms to keep `data-copied` or `data-copy-error` on the host. |
| `onSuccess` | `(event: CopyOnClickSuccessEvent) => void` | No | `undefined` | Fired with `{ text, node, event }` on success. |
| `onError` | `(event: CopyOnClickErrorEvent) => void` | No | `undefined` | Fired with `{ error, node, event }` on failure. |
| `preventDefault` | `boolean` | No | `false` | Calls `event.preventDefault()` on trigger. |
| `stopPropagation` | `boolean` | No | `false` | Calls `event.stopPropagation()` on trigger. |
| `keyboard` | `boolean` | No | `true` | Enables `Enter`/`Space` activation on non-native interactive elements. |
| `ignoreDisabled` | `boolean` | No | `true` | Ignores triggers when the node or ancestor is `:disabled`, `[aria-disabled="true"]`, or `[inert]`. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. |

### `pasteOnClick(options?: PasteOnClickOptions)`
Attachment for `HTMLElement | SVGElement`.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `target` | `PasteTarget \| (() => PasteTarget \| null \| undefined) \| ((e: PasteOnClickSuccessEvent) => void \| Promise<void>)` | No | Attached node | Target element, lazy getter, or callback receiving `{ text, node, event }`. |
| `mode` | `"insert" \| "replace"` | No | `"insert"` | Inserts at cursor selection or replaces entire value/content. |
| `feedbackDuration` | `number` | No | `2000` | Ms to keep `data-pasted`, `data-paste-error`, or `data-paste-empty`. |
| `focusTarget` | `boolean` | No | `true` | Focuses `target` after pasting. |
| `onSuccess` | `(event: PasteOnClickSuccessEvent) => void` | No | `undefined` | Fired on successful paste. |
| `onError` | `(event: PasteOnClickErrorEvent) => void` | No | `undefined` | Fired when clipboard read fails or permission is denied. |
| `onEmpty` | `(event: PasteOnClickEmptyEvent) => void` | No | `undefined` | Fired when clipboard text is `""`. |
| `preventDefault` | `boolean` | No | `false` | Calls `event.preventDefault()` on trigger. |
| `stopPropagation` | `boolean` | No | `false` | Calls `event.stopPropagation()` on trigger. |
| `keyboard` | `boolean` | No | `true` | Enables `Enter`/`Space` activation on non-native elements. |
| `ignoreDisabled` | `boolean` | No | `true` | Ignores disabled/inert triggers. |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. |

### `<CopyIcon />` & `<PasteIcon />` Props
Both extend `Omit<HTMLAttributes<HTMLSpanElement>, "children">` with `ref = $bindable(null)`.
- `CopyIcon`: `status?: "idle" | "pending" | "copied" | "error"`, `copied?: boolean`, `error?: boolean`, `pending?: boolean`.
- `PasteIcon`: `status?: "idle" | "pending" | "pasted" | "empty" | "error"`, `pasted?: boolean`, `empty?: boolean`, `error?: boolean`, `pending?: boolean`.
- Both automatically react to ancestor `data-copied` / `data-copy-error` / `data-copy-pending` (or `data-pasted` / `data-paste-empty` / `data-paste-error` / `data-paste-pending`) attributes set by `copyOnClick` / `pasteOnClick`.

### Utilities
- `copyToClipboard(text: string): Promise<boolean>` — Uses `navigator.clipboard.writeText` with a `textarea` + `execCommand("copy")` fallback for `file://` and non-HTTPS contexts while restoring focus.
- `readFromClipboard(): Promise<string | null>` — Uses `navigator.clipboard.readText`; returns `null` if unsupported or denied.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-copy-icon-fg-positive` | `var(--cs-color-positive-500)` (or `currentColor` inside `primary` buttons) | Checkmark & sparkle color for `CopyIcon`. |
| `--cs-copy-icon-fg-negative` | `var(--cs-color-negative-500)` (or `currentColor` inside `primary` buttons) | Error glyph & sparkle color for `CopyIcon`. |
| `--cs-paste-icon-fg-positive` | `var(--cs-color-positive-500)` (or `currentColor` inside `primary` buttons) | Checkmark & sparkle color for `PasteIcon`. |
| `--cs-paste-icon-fg-negative` | `var(--cs-color-negative-500)` (or `currentColor` inside `primary` buttons) | Error glyph & sparkle color for `PasteIcon`. |

## Examples

```svelte
<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CopyIcon, PasteIcon, copyOnClick, pasteOnClick } from "cs/svelte/clipboard";

    let value = $state("");
    let inputEl = $state<HTMLInputElement | null>(null);
</script>

<input bind:this={inputEl} bind:value />

<Button variant="secondary" size="md" {@attach copyOnClick({ text: () => value })}>
    <CopyIcon />
    <ButtonLabel>Copy</ButtonLabel>
</Button>

<Button variant="secondary" size="md" {@attach pasteOnClick({ target: () => inputEl })}>
    <PasteIcon />
    <ButtonLabel>Paste</ButtonLabel>
</Button>
```

## Behavior & Quirks
- **Svelte 5 reactivity on paste:** Dispatches bubbling `input` and `change` events after updating `<input>` / `<textarea>` values so `bind:value` stays synchronized.
- **Zero-arg vs 1-arg `pasteOnClick` `target` function:** Zero-argument functions (`() => inputEl`) are treated as element suppliers (or async handlers if returning a `Promise`); functions accepting `(event)` (`fn.length > 0`) are invoked as custom paste callbacks.
- **Icon-only scaling:** Inside `Button` or `ToggleButton` with `iconOnly`, `CopyIcon` and `PasteIcon` automatically size to `50%` width/height.
