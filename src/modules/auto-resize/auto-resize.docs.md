---
name: AutoResize
kind: attachment
import: cs/svelte/auto-resize
exports:
  - autoResize
  - AutoResizeOptions
---

# AutoResize

## Overview
Svelte 5 attachment (`autoResize`) that dynamically sizes editable form controls (`<textarea>`, `<input>`, `<TextArea>`, and `<TextInputField>`) to fit their content using native CSS `field-sizing: content` with zero JavaScript event listeners or `ResizeObserver` instances.

## API

### `autoResize(options?: AutoResizeOptions): Attachment<HTMLElement>`

All options are optional; `{@attach autoResize()}` works with zero arguments.

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the attachment. Pass a getter `() => condition` for reactive toggling. |
| `minRows` | `number` | No | Inferred from `rows` | Minimum visible text lines (`>= 1` integer) for `<textarea>`. Defaults to the element's `rows` attribute when omitted, or leaves base `min-height` untouched if `rows` is absent. |
| `maxRows` | `number` | No | `undefined` | Maximum visible text lines (`>= 1` integer) for `<textarea>` before vertical scrolling activates. |
| `minHeight` | `number \| string` | No | `undefined` | Explicit minimum height (`px` number or CSS length string, e.g. `80`, `"5rem"`). Overrides `minRows` when both are set. |
| `maxHeight` | `number \| string` | No | `undefined` | Explicit maximum height (`px` number or CSS length string, e.g. `320`, `"40dvh"`). Overrides `maxRows` when both are set. |
| `minWidth` | `number \| string` | No | `undefined` | Explicit minimum width (`px` number or CSS length string, e.g. `80`, `"6ch"`), primarily for horizontal `<input>` / `<TextInputField>` auto-resizing. |
| `maxWidth` | `number \| string` | No | `undefined` | Explicit maximum width (`px` number or CSS length string, e.g. `260`, `"100%"`), primarily for horizontal `<input>` / `<TextInputField>` auto-resizing. |

### Applied Class, `data-*` Attributes & CSS Custom Properties
- Class: `.cs-auto-resize`
- Attribute: `data-auto-resize=""`
- Inline CSS variables set when resolved:
  - `--cs-auto-resize-min-rows` / `--cs-auto-resize-max-rows`
  - `--cs-auto-resize-min-height` / `--cs-auto-resize-max-height`
  - `--cs-auto-resize-min-width` / `--cs-auto-resize-max-width`
  - `--cs-auto-resize-chrome-block` (measured once on raw `<textarea>` elements without `.cs-text-area` when `minRows` or `maxRows` is active)

## Examples

### Chat / Prompt Composer (`rows={1}`)
```svelte
<script lang="ts">
    import { ArrowUp } from "@lucide/svelte";
    import { autoResize } from "cs/svelte/auto-resize";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { TextArea } from "cs/svelte/text-area";

    let prompt = $state("");
</script>

<div class="w-full flex items-end gap-2">
    <TextArea
        variant="elevated"
        size="md"
        rows={1}
        class="flex-1"
        bind:value={prompt}
        placeholder="Ask anything..."
        {@attach autoResize({ maxRows: 6 })}
    />
    <Button variant="primary" size="md" iconOnly aria-label="Send message">
        <ButtonIcon icon={ArrowUp} />
    </Button>
</div>
```

### Bounded Comment Field (`rows={3}`)
```svelte
<script lang="ts">
    import { autoResize } from "cs/svelte/auto-resize";
    import { TextArea } from "cs/svelte/text-area";

    let comment = $state("");
</script>

<TextArea
    variant="soft"
    size="md"
    rows={3}
    bind:value={comment}
    placeholder="Add a comment..."
    {@attach autoResize({ maxRows: 6 })}
/>
```

### Horizontal Auto-Width `TextInputField`
```svelte
<script lang="ts">
    import { Tag } from "@lucide/svelte";
    import { autoResize } from "cs/svelte/auto-resize";
    import { TextInput, TextInputField, TextInputIcon } from "cs/svelte/text-input";

    let tagName = $state("design-tokens");
</script>

<TextInput variant="soft" size="sm" class="w-auto">
    <TextInputIcon icon={Tag} />
    <TextInputField
        bind:value={tagName}
        placeholder="Tag..."
        {@attach autoResize({ minWidth: "80px", maxWidth: "260px" })}
    />
</TextInput>
```

## Behavior & Quirks
- **Zero JS measurement:** Uses native CSS `field-sizing: content`, so typing, pasting, programmatic `bind:value` updates (such as resetting `prompt = ""` on submit), and container width reflows resize in the same layout pass without `scrollHeight` reads or `input` listeners.
- **`rows` inference & dynamic `minRows`:** When `minRows` is omitted on a `<textarea>`, `autoResize` reads its initial `rows` attribute once on attach (for example, `<TextArea rows={3}>` infers `minRows = 3`, while `rows={1}` overrides `<TextArea>`'s default `2lh` floor to start at a single-line height). If `rows` changes dynamically at runtime, pass `minRows` explicitly (`autoResize({ minRows })`) so Svelte re-runs the attachment when the value changes.
- **Manual `resize` disabled while active:** `.cs-auto-resize` sets `resize: none` (and `<TextArea>` coordinates via `[data-auto-resize]`) so manual drag-resizing cannot inject conflicting inline `height` styles.
- **`TextInputField` horizontal sizing:** Inside `<TextInput class="w-auto">`, `[data-auto-resize]` switches `.cs-text-input-field` to `flex: 1 1 auto; width: auto; max-width: var(--cs-auto-resize-max-width, 100%)` so the field shrink-wraps its content between `minWidth` and `maxWidth`.
- **Reactive `enabled`:** Because plain object literals are not tracked reactively by attachments unless a getter is read inside the attachment body, pass `enabled: () => isEnabled` when toggling `autoResize` dynamically. When `enabled` becomes `false`, the attachment removes `.cs-auto-resize`, `data-auto-resize`, and all `--cs-auto-resize-*` inline styles.
