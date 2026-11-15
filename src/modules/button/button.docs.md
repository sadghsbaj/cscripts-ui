---
name: Button
kind: component
import: cs/svelte/button
exports:
  - Button
  - ButtonLabel
  - ButtonIcon
  - BUTTON_SIZES
  - BUTTON_VARIANTS
  - ButtonSize
  - ButtonVariant
  - ButtonElement
  - ButtonVariantProps
  - ButtonProps
  - ButtonLabelProps
  - ButtonIconComponentProps
  - ButtonIconProps
---

# Button

## Overview
Primary interactive button primitive with polymorphic element rendering (`button`, `a`, `label`), explicit `variant` and `size` selection, optional `negative` intent, and spring-physics press feedback. Pairs with `<ButtonLabel />` and `<ButtonIcon />` for optical icon/text alignment.

## API

### `Button` Props
Polymorphic over `as?: "button" | "a" | "label"` (defaults to `"button"`), forwarding native element attributes (`HTMLButtonAttributes`, `HTMLAnchorAttributes`, or `HTMLLabelAttributes` + `interestfor`).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ButtonVariant` | Yes | — | Visual style: `"primary" \| "secondary" \| "tertiary" \| "ghost" \| "elevated"`. |
| `size` | `ButtonSize` | Yes | — | T-shirt size: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `negative` | `boolean` | No | `undefined` | Applies destructive/negative intent. Only valid on `"primary"`, `"secondary"`, and `"ghost"` (`never` on `"tertiary"` and `"elevated"`). |
| `as` | `"button" \| "a" \| "label"` | No | `"button"` | Rendered root tag. Enforces `type="button"` when `as === "button"` unless overridden in `rest`. |
| `iconOnly` | `boolean` | No | `undefined` | Locks square 1:1 proportions and scales direct `<ButtonIcon />` / `<CopyIcon />` / `<PasteIcon />` to 50%. |
| `ref` | `HTMLButtonElement \| HTMLAnchorElement \| HTMLLabelElement \| null` | No | `null` | `$bindable` reference to the root element. |

### `ButtonLabel` & `ButtonIcon`
- `ButtonLabel`: Renders `<span class="cs-button-label cs-button-control-label">` with `ref = $bindable(null)` and `...rest`.
- `ButtonIcon`: Props `{ icon: Component<ButtonIconComponentProps>; color?: string; ...SVGAttributes }`. Renders `<Icon {...rest} aria-hidden="true" class="cs-button-icon cs-button-control-icon" />`.

### `data-*` Attributes
- `data-variant={variant}`
- `data-size={size}`
- `data-negative` (present when `negative` is truthy)
- `data-icon-only` (present when `iconOnly` is truthy)

### CSS Custom Properties
| Variable | Description |
| :--- | :--- |
| `--cs-button-height` | Overrides the resolved button height (defaults to size height). |
| `--cs-button-fg` / `--cs-button-fg-hover` | Foreground text/icon color at rest and on hover. |
| `--cs-button-bg` / `--cs-button-bg-hover` | Surface background color at rest and on hover. |
| `--cs-button-shadow` / `--cs-button-shadow-hover` / `--cs-button-shadow-active` | Surface box-shadow across states. |
| `--cs-button-squash-active` | Pointer `:active` squash scale on `::before` (defaults to `--cs-squash-subtle`). |
| `--cs-button-focus-scale-active` | Keyboard `:focus-visible:active` scale (defaults to `0.97`). |

## Examples

```svelte
<script lang="ts">
    import { Plus, Trash2 } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
</script>

<Button variant="primary" size="md" onclick={() => console.log("clicked")}>
    <ButtonIcon icon={Plus} />
    <ButtonLabel>Create Item</ButtonLabel>
</Button>

<Button variant="ghost" size="sm" negative iconOnly aria-label="Delete">
    <ButtonIcon icon={Trash2} />
</Button>
```

## Behavior & Quirks
- **No implicit defaults:** Both `variant` and `size` are required at every call site.
- **Interaction modality split:** Pointer `:active` squashes only the `::before` surface layer (`--cs-squash-subtle`) while keeping text/icons steady; keyboard `:focus-visible:active` uniformly scales the whole control (`0.97`).
- **Disabled states:** Uses colorless `--cs-color-disabled-*` tokens rather than opacity dimming (`elevated` switches to `--cs-color-disabled-bg-elevated` with a 1px `--cs-color-disabled-border` ring).
- **Hit area:** Compact icon-only buttons (`xs` / `sm`) below `1936px²` should include `<HitArea size="md" />` when layout allows.
