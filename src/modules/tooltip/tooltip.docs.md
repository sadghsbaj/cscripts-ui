---
name: Tooltip
kind: hybrid
import: cs/svelte/tooltip
exports:
  - Tooltip
  - TooltipText
  - TooltipIcon
  - tooltip
  - TooltipIconConfig
  - TooltipProps
  - TooltipTextProps
  - TooltipIconComponentProps
  - TooltipIconProps
  - TooltipBaseOptions
  - TooltipOptions
---

# Tooltip

## Overview
Lightweight tooltip surface (`<Tooltip />`) and Svelte 5 attachment (`tooltip`) built on `<Popover popover="manual">` and `popoverTrigger({ triggerOn: "hover" })`. Supports both zero-boilerplate inline `text`/`icon` tooltips and custom compound `<Tooltip />` surfaces paired by `target` ID.

## Usage Guidance
- **Don't force tooltips everywhere**: Even though ESLint flags unlabeled icon buttons (suppressible via ignore comment when intentional), self-explanatory controls like a close button or a standard three-dot menu button in a list/chat item do not need a tooltip.
- **When to add one**: Use tooltips when an icon is not 100% self-explanatory, or when a menu/action button hides domain-specific settings (briefly describe what is inside, e.g., `"Workspace settings"`, rather than listing options).
- **Copy length**: Keep tooltip text short and concise — avoid long sentences.

## API

### `tooltip(options: TooltipOptions): Attachment<HTMLElement>`
Two mutually exclusive modes:
- **Inline auto-mounted mode:** `{ text: string; icon?: TooltipIconConfig; placement?; offset?; delay?; enabled? }`
- **Custom target mode:** `{ target: string; placement?; offset?; delay?; enabled? }`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `text` | `string` | Inline mode | — | Auto-mounts a `<Tooltip />` into `document.body` with this text. |
| `icon` | `Component \| { component: Component; position?: "start" \| "end" }` | No | `undefined` | Optional icon in inline mode. |
| `target` | `string` | Target mode | — | ID of a manually rendered `<Tooltip id="..." />` element. |
| `placement` | `PopoverPlacement` | No | `"top"` | Anchor placement. |
| `offset` | `string` | No | `"8px"` (from `Popover`) | Gap between trigger and tooltip. |
| `delay` | `[number, number]` | No | `[400, 150]` | Open and close delays in milliseconds (`[openMs, closeMs]`). |
| `enabled` | `boolean \| (() => boolean)` | No | `true` | Enables or disables the tooltip attachment. |

### `<Tooltip />` & Subcomponents
- `Tooltip`: Extends `Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover" | "role">`. Props: `id: string` (required), `text?: string`, `icon?: TooltipIconConfig`, `ref = $bindable(null)`. Renders `role="tooltip"` with `popover="manual"`, `width="content"`, `placement="top"`.
- `TooltipText`: `text?: string`, `ref = $bindable(null)`, `children`.
- `TooltipIcon`: `icon: Component<TooltipIconComponentProps>`, `color?: string`.

> **Keyboard shortcuts inside `<Tooltip>`:** Compose `Kbd` / `KbdGroup` from `cs/svelte/kbd` inside compound tooltips, and always use `variant="soft"` with `size="sm"` (`20px` height fits concentrically inside the `26px` tooltip pill; `size="xs"` is too small against `13px` semibold text, and `variant="keycap"` is too heavy with its `2px` bottom lip).

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-tooltip-font-size` | `13px` | Font size for `TooltipText` and icon sizing in `TooltipIcon`. |

## Examples

```svelte
<script lang="ts">
    import { Copy } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Kbd, KbdGroup, KbdSeparator } from "cs/svelte/kbd";
    import { Tooltip, TooltipText, tooltip } from "cs/svelte/tooltip";
</script>

<!-- Inline mode -->
<Button variant="secondary" size="md" iconOnly aria-label="Copy" {@attach tooltip({ text: "Copy", icon: Copy })}>
    <ButtonIcon icon={Copy} />
</Button>

<!-- Custom compound mode with shortcut -->
<Button variant="ghost" size="md" {@attach tooltip({ target: "copy-tip", placement: "bottom" })}>
    <ButtonLabel>Copy</ButtonLabel>
</Button>

<Tooltip id="copy-tip">
    <TooltipText>Copy</TooltipText>
    <KbdGroup variant="soft" size="sm">
        <Kbd symbol="ctrl" />
        <KbdSeparator />
        <Kbd>C</Kbd>
    </KbdGroup>
</Tooltip>

<!-- Single key shortcut -->
<Button variant="ghost" size="md" {@attach tooltip({ target: "close-tip", placement: "bottom" })}>
    <ButtonLabel>Close</ButtonLabel>
</Button>

<Tooltip id="close-tip">
    <TooltipText>Close</TooltipText>
    <Kbd variant="soft" size="sm" symbol="esc" />
</Tooltip>
```

## Behavior & Quirks
- **Automatic `aria-describedby`:** The `tooltip` attachment automatically wires `aria-describedby={id}` on the trigger element and cleans it up on unmount.
- **Warmup scrubbing:** Inherits `popoverTrigger({ triggerOn: "hover" })` warmup (`data-warm` / `data-instant`), so moving between adjacent tooltip triggers opens subsequent tooltips with `0ms` delay and instant transitions.
- **Auto-unmount lifecycle:** Inline `<Tooltip />` instances mounted to `document.body` are cleaned up in a microtask only when the trigger disconnects or loses `aria-describedby`, surviving reactive attachment re-runs without flickering.
