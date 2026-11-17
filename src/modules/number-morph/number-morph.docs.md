---
name: NumberMorph
kind: component
import: cs/svelte/number-morph
exports:
  - NumberMorph
  - NumberMorphGroup
  - CS_NUMBER_MORPH_TRANSFORM_TIMING
  - CS_NUMBER_MORPH_SPIN_TIMING
  - CS_NUMBER_MORPH_OPACITY_TIMING
  - NumberMorphValue
  - NumberMorphFormat
  - NumberMorphTrend
  - NumberMorphDigits
  - NumberMorphProps
  - NumberMorphGroupProps
---

# NumberMorph

## Overview
Animated numeric readout (`<NumberMorph />`) and sibling layout-sync wrapper (`<NumberMorphGroup />`) built around `@number-flow/svelte`. Provides `cscripts-ui` motion defaults, `tabular-nums` alignment, `currentColor` affix inheritance, and `--cs-number-morph-*` CSS hooks for counters, currency, compact metrics, and timers.

> **Prerequisite (Optional Peer Dependency):** Consuming apps that import `cs/svelte/number-morph` must install `@number-flow/svelte` (`bun add @number-flow/svelte`). Apps that do not import `cs/svelte/number-morph` are completely unaffected and incur zero dependency or bundle cost.

## API

### `NumberMorph` Props
Extends `Omit<HTMLAttributes<HTMLSpanElement>, "children" | "prefix">` and renders `<span class="cs-number-morph">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `value` | `NumberMorphValue` (`number \| string`) | Yes | — | Numeric value to format and animate. |
| `locales` | `Intl.LocalesArgument` | No | `undefined` | Locale(s) passed to `Intl.NumberFormat`. |
| `format` | `NumberMorphFormat` | No | `undefined` | `Intl.NumberFormatOptions` (excluding unsupported `scientific` and `engineering` notations). |
| `prefix` | `string` | No | `undefined` | Static prefix rendered before the formatted number. |
| `suffix` | `string` | No | `undefined` | Static suffix rendered after the formatted number. |
| `trend` | `NumberMorphTrend` (`number \| ((oldValue: number, value: number) => number)`) | No | `undefined` | Controls digit roll direction (`1` = up, `-1` = down, `0` = shortest/auto). |
| `animated` | `boolean` | No | `true` | Enables or disables digit transitions. |
| `digits` | `NumberMorphDigits` (`Record<number, { max?: number }>`) | No | `undefined` | Per-place digit constraints (e.g. `{ 1: { max: 5 } }` for `mm:ss` seconds). |
| `continuous` | `boolean` | No | `false` | Rolls digits sequentially through intermediate values via `@number-flow/svelte`'s `continuous` plugin. |
| `willChange` | `boolean` | No | `false` | Hints `will-change` on animated layers for high-frequency updates. |
| `respectMotionPreference` | `boolean` | No | `true` | Respects `prefers-reduced-motion: reduce` in WAAPI animations. |
| `transformTiming` | `EffectTiming` | No | `CS_NUMBER_MORPH_TRANSFORM_TIMING` | WAAPI timing for horizontal width/position shifts. |
| `spinTiming` | `EffectTiming` | No | `CS_NUMBER_MORPH_SPIN_TIMING` | WAAPI timing for vertical digit column spins. |
| `opacityTiming` | `EffectTiming` | No | `CS_NUMBER_MORPH_OPACITY_TIMING` | WAAPI timing for entering/exiting digit and symbol fades. |
| `onanimationsstart` | `() => void` | No | `undefined` | Callback fired when NumberFlow animations start. |
| `onanimationsfinish` | `() => void` | No | `undefined` | Callback fired when NumberFlow animations finish. |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the root `<span>` element. |

### `NumberMorphGroup` Props
Extends `HTMLAttributes<HTMLSpanElement>` and renders `<span class="cs-number-morph-group">`. Synchronizes layout shifts across descendant `NumberMorph` instances and adjacent inline siblings.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `children` | `Snippet` | No | `undefined` | Descendant `NumberMorph` instances and sibling inline content. |
| `ref` | `HTMLSpanElement \| null` | No | `null` | `$bindable` reference to the root `<span>` element. |

### Timing Constants
Aligned with `motion.css` (`--cs-dur-380`, `--cs-ease-quint-out`, `--cs-dur-160`, `--cs-ease-effect`):
- `CS_NUMBER_MORPH_TRANSFORM_TIMING = { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }`
- `CS_NUMBER_MORPH_SPIN_TIMING = { duration: 380, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }`
- `CS_NUMBER_MORPH_OPACITY_TIMING = { duration: 160, easing: "cubic-bezier(0.5, 1, 0.89, 1)" }`

### Exported Types
- `NumberMorphValue`, `NumberMorphFormat`, `NumberMorphTrend`, `NumberMorphDigits`, `NumberMorphProps`, `NumberMorphGroupProps`

### `data-*` Attributes
- On `NumberMorph`: `data-animated` (present when `animated` is truthy), `data-continuous` (present when `continuous` is truthy).

### CSS Custom Properties & Shadow DOM `::part(...)`
| Variable | Default | Description |
| :--- | :--- | :--- |
| `--cs-number-morph-char-height` | `1em` | Maps to `--number-flow-char-height` (digit column height). |
| `--cs-number-morph-mask-height` | `0.25em` | Maps to `--number-flow-mask-height` (top/bottom fade mask). |
| `--cs-number-morph-mask-width` | `0.5em` | Maps to `--number-flow-mask-width` (horizontal mask fade). |
| `--cs-number-morph-affix-fg` | `currentColor` | Foreground color applied to `::part(prefix)` and `::part(suffix)`. |

`@number-flow/svelte` renders a `<number-flow-svelte>` custom element with an open Shadow Root. Inherited properties (`color`, `font-family`, `font-size`, `font-weight`, `line-height`, `letter-spacing`, `font-variant-numeric`, CSS custom properties) cross the Shadow DOM boundary automatically. To style internal Shadow DOM parts (`prefix`, `suffix`, `integer`, `fraction`, `decimal`, `symbol`) from a Svelte `<style>` block, use `:global(::part(...))` scoped under a parent class:

```css
.kpi-value :global(::part(fraction)) {
    font-size: 0.75em;
    color: var(--cs-color-text-weak);
}
```

## Examples

```svelte
<script lang="ts">
    import { Badge } from "cs/svelte/badge";
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { NumberMorph, NumberMorphGroup } from "cs/svelte/number-morph";

    let count = $state(42);
    let price = $state(1240.5);
    let delta = $state(0.048);
    let seconds = $state(58);
</script>

<!-- Basic counter -->
<NumberMorph value={count} />

<!-- Currency & compact notation -->
<NumberMorph
    value={price}
    locales="en-US"
    format={{ style: "currency", currency: "USD" }}
/>

<NumberMorph
    value={1_480_000}
    locales="en-US"
    format={{ notation: "compact", maximumFractionDigits: 1 }}
/>

<!-- Continuous rolling mode & digits constraint (mm:ss seconds) -->
<NumberMorph
    value={seconds}
    continuous
    format={{ minimumIntegerDigits: 2 }}
    digits={{ 1: { max: 5 } }}
/>

<!-- Synchronized layout transitions across siblings -->
<NumberMorphGroup class="gap-2">
    <NumberMorph
        value={price}
        format={{ style: "currency", currency: "USD" }}
        class="text-xl font-semibold"
    />
    <Badge variant="soft" color={delta >= 0 ? "positive" : "negative"} size="sm">
        <NumberMorph
            value={delta}
            format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "always" }}
        />
    </Badge>
</NumberMorphGroup>

<!-- Composition inside Button / Badge (inherits currentColor) -->
<Button variant="primary" size="md" onclick={() => (count += 1)}>
    <ButtonLabel>Stars</ButtonLabel>
    <Badge variant="solid" color="accent" size="sm">
        <NumberMorph value={count} />
    </Badge>
</Button>
```

## Behavior & Quirks
- **Pure typographic inline primitive:** `NumberMorph` intentionally omits `variant` and `size` props; it inherits `font-size`, `font-weight`, `line-height`, and `color` from its host heading, KPI card, `<Badge>`, or `<Button>`.
- **`tabular-nums` & `currentColor` by default:** `.cs-number-morph` enforces `font-variant-numeric: tabular-nums` to prevent horizontal jitter during digit rolls, and defaults `::part(prefix)` / `::part(suffix)` to `currentColor` so affixes stay legible on `solid` badges and primary buttons.
- **`NumberMorphGroup` box layout:** Wraps `@number-flow/svelte`'s context-only `<NumberFlowGroup>` in `<span class="cs-number-morph-group">` (`display: inline-flex; align-items: baseline;`) so `ref`, `{...rest}`, `gap`, and baseline alignment work predictably. Override with `class="contents"` if transparent grid-cell participation is needed.
- **Avoid `NumberMorphGroup` + `continuous` on timers:** In `@number-flow/svelte@0.4.2`, combining `continuous` with `NumberMorphGroup` can cause an unchanged sibling's previously updated digit to re-spin when another sibling updates. For fixed-width `mm:ss` timers, prefer `tabular-nums` + `format={{ minimumIntegerDigits: 2 }}` inside a plain `inline-flex items-baseline` container without `NumberMorphGroup`.
- **WAAPI & `prefers-reduced-motion`:** Because NumberFlow animates via `element.animate()` rather than CSS transitions, `motion.css` reduced-motion rules do not apply automatically; keep `respectMotionPreference={true}` (default) so NumberFlow honors `prefers-reduced-motion: reduce`.
- **Accessibility:** `<number-flow-svelte>` sets `role="img"` and `aria-label` to the formatted value while hiding spinning digit columns from assistive technology. Pass `aria-live="polite"` or `role="status"` via `{...rest}` only when live announcements are desired.
- **Vite pre-bundling:** If a consuming app encounters Vite pre-bundling issues with `@number-flow/svelte`'s custom element registration, add `optimizeDeps: { exclude: ["@number-flow/svelte"] }` in `vite.config.ts`.
