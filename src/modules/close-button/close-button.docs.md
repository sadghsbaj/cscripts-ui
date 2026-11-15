---
name: CloseButton
kind: component
import: cs/svelte/close-button
exports:
  - CloseButton
  - CLOSE_BUTTON_VARIANTS
  - CLOSE_BUTTON_SIZES
  - CloseButtonVariant
  - CloseButtonSize
  - CloseButtonProps
---

# CloseButton

## Overview
Compact circular/squircle dismiss trigger (`<CloseButton />`) rendering an `X` icon with subordinate `text-weak` → `text-main` contrast and spring-physics press feedback.

## API

### `CloseButton` Props
Extends `Omit<HTMLButtonAttributes, "type">` (always sets `type="button"` and defaults `aria-label="Close"` unless overridden in `rest`).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `CloseButtonVariant` | Yes | — | Surface style: `"soft" \| "ghost" \| "elevated"`. |
| `size` | `CloseButtonSize` | Yes | — | T-shirt size: `"xs"` (16px), `"sm"` (24px), `"md"` (32px), `"lg"` (40px), `"xl"` (48px). |
| `ref` | `HTMLButtonElement \| null` | No | `null` | `$bindable` reference to the `<button>` element. |

### `data-*` Attributes
- `data-variant={variant}`
- `data-size={size}`

### CSS Custom Properties
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-close-button-fg` | `var(--cs-color-text-weak)` | Resting icon color. |
| `--cs-close-button-fg-hover` | `var(--cs-color-text-main)` | Hover/active icon color. |
| `--cs-close-button-bg` / `--cs-close-button-bg-hover` | Variant-dependent | Surface fill at rest and on hover. |
| `--cs-close-button-shadow` / `--cs-close-button-shadow-hover` / `--cs-close-button-shadow-active` | Variant-dependent | Surface shadow across states. |
| `--cs-close-button-squash-active` | `var(--cs-squash-default)` | Pointer `:active` squash scale on `::before`. |

## Examples

```svelte
<script lang="ts">
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
</script>

<CloseButton variant="soft" size="sm" onclick={handleClose}>
    <HitArea size="md" />
</CloseButton>
```

## Behavior & Quirks
- **Hit area:** Sizes `xs` (16px), `sm` (24px), `md` (32px), and `lg` (40px) are under `1936px²`; pass `<HitArea size="md" />` (or `"sm"`/`"lg"`) as a child when touch ergonomics apply.
- **Tactile glyph recession:** On `:active`, the `::before` surface squashes while the inner `X` icon recedes (`scale: 0.9`).
