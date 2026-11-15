---
name: Tooltip
kind: hybrid
import: cs/svelte/tooltip
exports:
  - Tooltip
  - TooltipText
  - TooltipIcon
  - TooltipKbd
  - tooltip
  - TooltipIconConfig
  - TooltipProps
  - TooltipTextProps
  - TooltipIconComponentProps
  - TooltipIconProps
  - TooltipKbdProps
  - TooltipBaseOptions
  - TooltipOptions
---

# Tooltip

## Overview
Lightweight tooltip surface (`<Tooltip />`) and Svelte 5 attachment (`tooltip`) built on `<Popover popover="hint">` and `popoverTrigger({ mode: "hint" })`. Supports both zero-boilerplate inline `text`/`icon`/`shortcut` tooltips and custom compound `<Tooltip />` surfaces paired by `target` ID.

## API

### `tooltip(options: TooltipOptions): Attachment<HTMLElement>`
Two mutually exclusive modes:
- **Inline auto-mounted mode:** `{ text: string; icon?: TooltipIconConfig; shortcut?: string | string[]; placement?; offset?; delay?; enabled? }`
- **Custom target mode:** `{ target: string; placement?; offset?; delay?; enabled? }`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | Inline mode | — | Auto-mounts a `<Tooltip />` into `document.body` with this text. |
| `icon` | `Component \| { component: Component; position?: "start" \| "end" }` | No | `undefined` | Optional icon in inline mode. |
| `shortcut` | `string \| string[]` | No | `undefined` | Optional keycap badge(s) in inline mode. |
| `target` | `string` | Target mode | — | ID of a manually rendered `<Tooltip id="..." />` element. |
| `placement` | `PopoverPlacement` | No | `"top"` | Anchor placement. |
| `offset` | `string` | No | `"8px"` (from `Popover`) | Gap between trigger and tooltip. |
| `delay` | `string` | No | `"400ms 150ms"` | Native `interest-delay` (`"<open> <close>"`). |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the tooltip attachment. |

### `<Tooltip />` & Subcomponents
- `Tooltip`: Extends `Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover" | "role">`. Props: `id: string` (required), `text?: string`, `icon?: TooltipIconConfig`, `shortcut?: string | string[]`, `ref = $bindable(null)`. Renders `role="tooltip"` with `popover="hint"`, `width="content"`, `placement="top"`.
- `TooltipText`: `text?: string`, `ref = $bindable(null)`, `children`.
- `TooltipIcon`: `icon: Component<TooltipIconComponentProps>`, `color?: string`.
- `TooltipKbd`: `key?: string`, `ref = $bindable(null)`, `children`.

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-tooltip-font-size` | `13px` | Font size for `TooltipText` and icon sizing in `TooltipIcon`. |

## Examples

```svelte
<script lang="ts">
    import { Copy } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { Tooltip, TooltipKbd, TooltipText, tooltip } from "cs/svelte/tooltip";
</script>

<!-- Inline mode -->
<Button variant="secondary" size="md" iconOnly aria-label="Copy" {@attach tooltip({ text: "Copy", icon: Copy, shortcut: ["⌘", "C"] })}>
    <ButtonIcon icon={Copy} />
</Button>

<!-- Custom compound mode -->
<Button variant="ghost" size="md" {@attach tooltip({ target: "custom-tip", placement: "bottom" })}>
    Hover me
</Button>

<Tooltip id="custom-tip">
    <TooltipText>Custom tooltip</TooltipText>
    <TooltipKbd>Esc</TooltipKbd>
</Tooltip>
```

## Behavior & Quirks
- **Automatic `aria-describedby`:** The `tooltip` attachment automatically wires `aria-describedby={id}` on the trigger element and cleans it up on unmount.
- **Warmup scrubbing:** Inherits `popoverTrigger({ mode: "hint" })` warmup (`data-hint-warm`), so moving between adjacent tooltip triggers opens subsequent tooltips with `0ms` delay and instant transitions.
- **Auto-unmount lifecycle:** Inline `<Tooltip />` instances mounted to `document.body` are cleaned up in a microtask only when the trigger disconnects or loses `aria-describedby`, surviving reactive attachment re-runs without flickering.
