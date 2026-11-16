---
name: Badge
kind: component
import: cs/svelte/badge
exports:
  - Badge
  - BadgeLabel
  - BadgeIcon
  - BADGE_VARIANTS
  - BADGE_COLORS
  - BADGE_SIZES
  - BadgeVariant
  - BadgeColor
  - BadgeSize
  - BadgeProps
  - BadgeLabelProps
  - BadgeIconComponentProps
  - BadgeIconProps
---

# Badge

## Overview
Non-interactive inline indicator (`<Badge />`) for semantic status, live counts, and short metadata labels. Composes with `<BadgeLabel />` and `<BadgeIcon />` for optical icon/text alignment and tabular numeric stability.

## Usage Guidance
- **Do not overuse:** Having `Badge` available does not mean wrapping every tiny or arbitrary piece of information in a badge. Much metadata is cleaner as plain typography and visual hierarchy — use badges sparingly where status, count, or compact categorization genuinely adds clarity.
- **`soft`** *(recommended default)*: Calm default for general status and metadata.
- **`solid`**: Reserve for high-emphasis counts or urgent alerts — never spam multiple `solid` badges together (same visual restraint principle as primary `Button`s).
- **`dot`**: Best suited for dense tables and lists where filled pills would create visual noise.
- **`color` semantics**: Use `base` as the neutral workhorse for non-status metadata (`v2.4`, `Draft`, `12`); `accent` for active highlights or unread counts; and `positive`, `caution`, or `negative` strictly for semantic status.
- **Composition inside other elements**: `Badge` can be composed inside other compound controls when needed — for example inside a `<Button />` alongside `<ButtonLabel />`, or paired with `<Kbd />` or `<Tooltip />`.

## API

### `Badge` Props
Extends `Omit<HTMLAttributes<HTMLSpanElement>, "color">` and renders `<span class="cs-badge">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `BadgeVariant` | Yes | — | Surface style: `"soft" \| "solid" \| "dot"`. |
| `color` | `BadgeColor` | Yes | — | Semantic intent: `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `size` | `BadgeSize` | Yes | — | T-shirt size: `"xs" \| "sm" \| "md" \| "lg" \| "xl"`. |
| `iconOnly` | `boolean` | No | `false` | Locks symmetrical 1:1 proportions (`aspect-ratio: 1; padding-inline: 0`). |
| `children` | `Snippet` | No | `undefined` | Badge content (`<BadgeLabel />`, `<BadgeIcon />`, or plain text/count). |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the `<span>` element. |

### `BadgeLabel` & `BadgeIcon`
- `BadgeLabel`: Extends `HTMLAttributes<HTMLSpanElement>`. Renders `<span class="cs-badge-label">` with `ref = $bindable(null)` and `...rest`, applying `text-box-trim` optical centering and horizontal-only ellipsis truncation.
- `BadgeIcon`: Extends `Omit<SVGAttributes<SVGSVGElement>, "children" | "color">` with `{ icon: Component<BadgeIconComponentProps>; color?: string; strokeWidth?: number | string }`. Renders `<Icon {...rest} strokeWidth={resolvedStrokeWidth} aria-hidden="true" class="cs-badge-icon" />`. Defaults `strokeWidth` to `2.25` (`2.5` inside `solid` `xs`/`sm` badges via context) unless explicitly overridden.

### Constants
- `BADGE_VARIANTS = ["soft", "solid", "dot"] as const`
- `BADGE_COLORS = ["base", "accent", "positive", "caution", "negative"] as const`
- `BADGE_SIZES = ["xs", "sm", "md", "lg", "xl"] as const`

### `data-*` Attributes
- `data-variant={variant}`
- `data-color={color}`
- `data-size={size}`
- `data-icon-only` (present when `iconOnly` is truthy)

### CSS Custom Properties
| Variable | Description |
| :--- | :--- |
| `--cs-badge-height` | Block size and `min-inline-size` (`18px`, `20px`, `24px`, `28px`, `32px` across `xs`–`xl`). |
| `--cs-badge-px` | Base inline padding (`5px`, `6px`, `8px`, `10px`, `12px` across `xs`–`xl`). |
| `--cs-badge-font-size` | Label font size (`10px`, `11px`, `--cs-text-xs`, `13px`, `--cs-text-sm`). |
| `--cs-badge-icon-size` | `BadgeIcon` width and height (`11px`, `12px`, `14px`, `15px`, `16px`). |
| `--cs-badge-gap` | Flex gap between dot/icon and label (`3px`, `3px`, `4px`, `5px`, `6px`). |
| `--cs-badge-dot-size` | Diameter of `.cs-badge-dot` (`5px`, `6px`, `6px`, `7px`, `8px`). |
| `--cs-badge-bg` / `--cs-badge-fg` | Surface background fill and foreground text/icon color. |
| `--cs-badge-shadow` | Surface shadow (`none` for `soft`/`dot`, `--cs-shadow-solid-active` for `solid`). |
| `--cs-badge-dot-bg` | Fill color for `.cs-badge-dot` (`--cs-color-text-weak` for `base`, `--cs-color-<color>-solid` otherwise). |
| `--cs-badge-selection-bg` / `--cs-badge-selection-fg` | Text selection colors applied on chromatic `soft` badges. |

## Examples

```svelte
<script lang="ts">
    import { Check, Sparkles } from "@lucide/svelte";
    import { Badge, BadgeIcon, BadgeLabel } from "cs/svelte/badge";
    import { Button, ButtonLabel } from "cs/svelte/button";
</script>

<!-- Calm default: soft -->
<Badge variant="soft" color="base" size="md">
    <BadgeLabel>v2.4</BadgeLabel>
</Badge>

<!-- High-emphasis count: solid -->
<Badge variant="solid" color="accent" size="sm">12</Badge>

<!-- Low-noise status for dense tables/lists: dot -->
<Badge variant="dot" color="positive" size="md">
    <BadgeLabel>Healthy</BadgeLabel>
</Badge>

<!-- Leading icon & icon-only -->
<Badge variant="soft" color="accent" size="md">
    <BadgeIcon icon={Sparkles} />
    <BadgeLabel>New</BadgeLabel>
</Badge>

<Badge variant="soft" color="positive" size="sm" iconOnly aria-label="Verified">
    <BadgeIcon icon={Check} />
</Badge>

<!-- Composed inside a Button -->
<Button variant="tertiary" size="md">
    <ButtonLabel>Inbox</ButtonLabel>
    <Badge variant="soft" color="accent" size="sm">3</Badge>
</Button>
```

## Behavior & Quirks
- **Strictly non-interactive:** Renders a static `<span>` with no hover/active states, no `tabindex`, and `transition: none` so badges inside animated `Popover` or `Tooltip` layers scale cleanly without compositor rasterization blur.
- **Automatic dot & optical padding:** `variant="dot"` automatically renders `<span class="cs-badge-dot" aria-hidden="true"></span>` before `children`. When not `iconOnly`, leading icon/dot or trailing icon sides tighten inline padding by `1px` (`calc(var(--cs-badge-px) - 1px)`).
- **1:1 floor & `tabular-nums`:** `min-inline-size: var(--cs-badge-height)` keeps single-character counts balanced as circular squircles, while `font-variant-numeric: tabular-nums` prevents horizontal layout jitter on live-updating counters.
- **Icon-only accessibility:** Because `BadgeIcon` and `.cs-badge-dot` set `aria-hidden="true"`, `iconOnly` badges without visible text must provide an accessible name via `aria-label` (or `aria-labelledby`) on `<Badge />`.
- **Size calibration & `Tooltip` nesting:** Calibrated to match `Kbd` (`18px`–`32px`). When nesting `<Badge size="sm" />` at the trailing edge of a `Tooltip`, apply `padding-inline-end: 4px` on the host `Tooltip` for concentric spacing.
