---
name: HitArea
kind: component
import: cs/svelte/hit-area
exports:
  - HitArea
  - HIT_AREA_SIZES
  - HitAreaSize
  - HitAreaProps
---

# HitArea

## Overview
Invisible touch/click target expander (`<HitArea />`) that enlarges the interactive surface of compact controls (icon buttons, close buttons, status dots) to meet accessibility and touch guidelines (`40px`–`48px`) without changing visual layout or claiming `::before`/`::after` pseudo-elements.

## API

### `HitArea` Props
Extends `Omit<HTMLAttributes<HTMLSpanElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `size` | `HitAreaSize` | Yes | — | Target minimum square size: `"sm"` (40px), `"md"` (44px, Apple HIG), `"lg"` (48px, WCAG AAA / Material). |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the `<span>` element. |

### `data-*` Attributes
- `data-size={size}`

## Examples

```svelte
<script lang="ts">
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
</script>

<CloseButton variant="soft" size="sm" onclick={close}>
    <HitArea size="md" />
</CloseButton>
```

## Behavior & Quirks
- **Auto-containment:** Automatically sets `contain: layout` on its direct parent via `:global(:has(> .cs-hit-area))` so the centered `position: absolute` span anchors to the control without requiring `position: relative` on the host.
- **Scales up with host:** Sets `min-width: 100%; min-height: 100%;` so if the host is already larger than the target size, the hit area never shrinks below the host's bounds.
- **Zero-slot collision:** Renders an `aria-hidden="true"` `<span>` instead of using `::before` or `::after`, leaving both pseudo-elements free for elastic surfaces and badges.
