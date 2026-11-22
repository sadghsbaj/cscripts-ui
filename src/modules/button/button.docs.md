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

## Usage Guidance
- **`primary`**: At most one visible per page/view for the single main action.
- **`secondary`**: Use sparingly — too many `secondary` buttons with accented text clutter a view.
- **`tertiary`**: Workhorse alongside `secondary` for standard actions.
- **`ghost`**: Avoid overusing (`ghost` everywhere feels unstructured); best for compact icon-only controls that should stay unobtrusive.
- **`elevated`**: Best suited on `canvas` or `sunken` surfaces.
- **Labels**: Keep button text short — ideally a single word (~4–8 characters), or at most two short words.

## API

### `Button` Props
Polymorphic over `as?: "button" | "a" | "label"` (defaults to `"button"`), forwarding native element attributes (`HTMLButtonAttributes`, `HTMLAnchorAttributes`, or `HTMLLabelAttributes` + `interestfor`).

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ButtonVariant` | Yes | — | Visual style: `"primary" \| "secondary" \| "tertiary" \| "ghost" \| "elevated"`. |
| `size` | `ButtonSize` | Yes | — | T-shirt size: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `negative` | `boolean` | No | `undefined` | Applies destructive/negative intent across all variants. |
| `as` | `"button" \| "a" \| "label"` | No | `"button"` | Rendered root tag. Enforces `type="button"` when `as === "button"` unless overridden in `rest`. |
| `iconOnly` | `boolean` | No | `undefined` | Locks square 1:1 proportions and scales direct `<ButtonIcon />` / `<CopyIcon />` / `<PasteIcon />` to 50%. |
| `ref` | `HTMLButtonElement \| HTMLAnchorElement \| HTMLLabelElement \| null` | No | `null` | `$bindable` reference to the root element. |

### Negative Intent Hierarchy
| Variant | Rest | Hover / `focus-visible` / Active | When to use |
| :--- | :--- | :--- | :--- |
| `primary` + `negative` | Solid red fill, white fg | Darker solid red fill, white fg | Irreversible or high-impact destructive actions (e.g. delete account, confirm deletion). |
| `secondary` + `negative` | `base-soft` bg, red fg | `base-soft-hover` bg, red fg | Secondary but visibly prominent negative actions. |
| `tertiary` + `negative` | Monotone (`base-soft` bg, neutral fg) | Monotone `base-soft-hover` bg, red fg | Pill buttons in toolbars or lists that should not scream at rest. |
| `elevated` + `negative` | Monotone (`--cs-color-elevated` bg, `--cs-color-text-strong` fg) | `--cs-color-elevated-hover` bg, negative fg, elevated hover shadow | Calm destructive action on `canvas` or sunken wells. |
| `ghost` + `negative` | Transparent, monotone neutral fg | Monotone `base-soft` bg, red fg | Calm inline or row actions (e.g. trash/remove icon buttons in lists). |

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
- **Disabled states:** Uses colorless `--cs-color-disabled-*` tokens rather than opacity dimming (`elevated` switches to `--cs-color-disabled-bg` with `shadow: none`).
- **Hit area:** Compact icon-only buttons (`xs` / `sm`) below `1936px²` should include `<HitArea size="md" />` when layout allows.
