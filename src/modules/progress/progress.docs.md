---
name: Progress
kind: component
import: cs/svelte/progress
exports:
  - Progress
  - PROGRESS_APPEARANCES
  - PROGRESS_VARIANTS
  - PROGRESS_COLORS
  - PROGRESS_SIZES
  - PROGRESS_ORIENTATIONS
  - ProgressAppearance
  - ProgressVariant
  - ProgressColor
  - ProgressSize
  - ProgressOrientation
  - ProgressProps
---

# Progress

## Overview
Non-interactive, read-only linear indicator (`<Progress />`, `role="progressbar"`) for communicating completion, capacity, or ongoing indeterminate activity across `bar`, `dashed`, and `dotted` forms.

## Usage Guidance
- **Surface (`variant`):** Both `soft` and `elevated` are first-class default options — use `soft` on a `Card` or `elevated` container, and `elevated` on `sunken` or `canvas` surfaces.
- **Appearance (`appearance`):**
  - Prefer `bar` for exact, continuous progress.
  - Prefer `dashed` when progress naturally divides into discrete segments.
  - `dotted` is the weakest option and intended for special edge cases where `dashed` does not fit visually or looks awkward.
- **Indeterminate:** Omit `value` or pass `null` when the loading or progress duration is unknown.

## API

### `Progress` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "color">` and renders `<div class="cs-progress" role="progressbar">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `appearance` | `ProgressAppearance` | Yes | — | Linear form: `"bar" \| "dashed" \| "dotted"`. |
| `variant` | `ProgressVariant` | Yes | — | Surface treatment: `"soft" \| "elevated"`. |
| `size` | `ProgressSize` | Yes | — | T-shirt thickness / dot diameter scale: `"xs" \| "sm" \| "md" \| "lg" \| "xl"` (`4px`, `6px`, `8px`, `12px`, `16px`). |
| `color` | `ProgressColor` | No | `"accent"` | Fill color token: `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `orientation` | `ProgressOrientation` | No | `"horizontal"` | Layout axis: `"horizontal" \| "vertical"`. |
| `value` | `number \| null` | No | `undefined` | Current progress value. `undefined`, `null`, or non-finite values activate indeterminate mode. |
| `min` | `number` | No | `0` | Minimum range bound. |
| `max` | `number` | No | `100` | Maximum range bound. |
| `segments` | `number` | No | `5` (`dashed`) / `10` (`dotted`) | Segment count for `dashed` and `dotted` forms (floored to an integer $\ge 1$); ignored when `appearance="bar"`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the root `<div>` element. |

### Constants
- `PROGRESS_APPEARANCES = ["bar", "dashed", "dotted"] as const`
- `PROGRESS_VARIANTS = ["soft", "elevated"] as const`
- `PROGRESS_COLORS = ["base", "accent", "positive", "caution", "negative"] as const`
- `PROGRESS_SIZES = ["xs", "sm", "md", "lg", "xl"] as const`
- `PROGRESS_ORIENTATIONS = ["horizontal", "vertical"] as const`

### `data-*` Attributes
- `data-appearance={appearance}`
- `data-variant={variant}`
- `data-color={color}`
- `data-size={size}`
- `data-orientation={orientation}`
- `data-indeterminate` (present when `value` is `undefined`, `null`, or non-finite)
- On `.cs-progress-segment` (`dashed` / `dotted`): `data-active` (present on active determinate segments) and `data-activating` (present on newly activated segments during a determinate increase).

### CSS Custom Properties
| Variable | Description |
| :--- | :--- |
| `--cs-progress-thickness` | Track block-size (`bar`, `dashed`) or dot diameter (`dotted`), set per `data-size` (`4px`, `6px`, `8px`, `12px`, `16px` across `xs`–`xl`). |
| `--cs-progress-gap` | Gap between segments (`dashed`) or minimum gap floor (`dotted`), set per `data-size` (`2px`, `3px`, `4px`, `5px`, `6px` across `xs`–`xl`). |
| `--cs-progress-radius` | Track, fill, and segment corner radius (default `var(--cs-radius-full)`). |
| `--cs-progress-track-bg` | Inactive track or segment background (`var(--cs-color-base-soft)` for `soft`, `var(--cs-color-elevated)` for `elevated`). |
| `--cs-progress-track-shadow` | Inactive track or segment shadow (`none` for `soft`, `var(--cs-shadow-elevated)` for `elevated`). |
| `--cs-progress-fill-bg` | Active fill or segment background resolved from `data-color` (`var(--cs-color-<color>-solid)`). |
| `--cs-progress-fill-shadow` | Active fill or segment shadow (`none` for `soft`, `var(--cs-shadow-solid-active)` for `elevated`). |
| `--cs-progress-dir` | Horizontal direction multiplier (`1` in LTR, `-1` under `:dir(rtl)`). |
| `--cs-progress-ratio` | Normalized determinate ratio (`0`–`1`) applied inline for `appearance="bar"`. |
| `--cs-progress-segments` | Resolved integer segment count applied inline for `dashed` and `dotted`. |
| `--cs-progress-index` | 0-based segment index applied inline to each `.cs-progress-segment`. |
| `--cs-progress-stagger` | Non-negative relative stagger step applied inline to transitioning segments. |
| `--cs-progress-stagger-step` | Per-step cascade duration (`clamp(16ms, 180ms / max(1, abs(next - prev)), 35ms)`) applied inline during discrete transitions. |

## Examples

```svelte
<script lang="ts">
    import { Progress } from "cs/svelte/progress";
</script>

<!-- Continuous bar on a card / elevated container -->
<Progress appearance="bar" variant="soft" size="md" value={64} aria-label="Upload progress" />

<!-- Elevated surface on canvas / sunken background -->
<Progress
    appearance="bar"
    variant="elevated"
    size="md"
    color="positive"
    value={100}
    aria-label="Sync complete"
/>

<!-- Discrete dashed progress with custom segment count and range -->
<Progress
    appearance="dashed"
    variant="soft"
    size="md"
    segments={4}
    min={0}
    max={4}
    value={3}
    aria-label="Checklist completion"
/>

<!-- Dotted progress -->
<Progress
    appearance="dotted"
    variant="soft"
    size="sm"
    color="base"
    value={40}
    aria-label="Step progress"
/>

<!-- Indeterminate loading state (omit value or pass null) -->
<Progress appearance="bar" variant="soft" size="sm" aria-label="Loading data" />
<Progress appearance="dashed" variant="elevated" size="sm" value={null} aria-label="Connecting" />

<!-- Vertical orientation -->
<div class="h-32 flex items-end gap-4">
    <Progress
        appearance="bar"
        variant="soft"
        size="md"
        orientation="vertical"
        color="caution"
        value={75}
        aria-label="Storage usage"
    />
    <Progress
        appearance="dashed"
        variant="soft"
        size="md"
        orientation="vertical"
        color="negative"
        value={90}
        aria-label="Memory pressure"
    />
</div>
```

## Behavior & Quirks
- **Read-only ARIA semantics:** `role="progressbar"` is applied after `{...rest}` so native progressbar semantics cannot be overridden. In determinate mode, `aria-valuenow` (clamped to `[safeMin, safeMax]`), `aria-valuemin`, and `aria-valuemax` are emitted; in indeterminate mode (`value == null` or non-finite), all three `aria-value*` attributes are omitted per WAI-ARIA. `aria-orientation` is intentionally omitted because WAI-ARIA 1.2 does not define it on `role="progressbar"`. Provide an accessible name via `aria-label` or `aria-labelledby` (and optionally `aria-valuetext`).
- **Bounds & degenerate range handling:** Non-finite `min` or `max` values fall back to `0` and `100`. When `safeMax <= safeMin`, `ratio` resolves to `0` and `clampedValue` resolves to `safeMin` (preventing `NaN` or division by zero).
- **Discrete segment rounding (`dashed` & `dotted`):** `segments` defaults to `5` (`dashed`) and `10` (`dotted`), and explicit finite values are floored and clamped to at least `1`. Any positive determinate ratio (`> 0`) lights at least `1` segment (`Math.min(segmentCount, Math.max(1, Math.round(ratio * segmentCount)))`), whereas `0` or indeterminate activates `0`.
- **Compositor-only `bar` fill & RTL:** `.cs-progress-fill` spans `100%` inside `overflow: clip` and translates via `transform` (`translateX` / `translateY`) over `var(--cs-dur-280)` `var(--cs-ease-quart-out)` without layout reflow or squashed leading caps. Horizontal progress flips automatically under `:dir(rtl)` via `--cs-progress-dir: -1`; vertical progress fills bottom-to-top with a `min-block-size: 48px` fallback.
- **Directional segment stagger & SSR safety:** `dashed` and `dotted` keep all segments mounted and cascade activation/deactivation delays across newly toggled segments (`clamp(16ms, 180ms / diff, 35ms)` per step) with a subtle `scale` pop (`--cs-dur-200` `--cs-spring-snappy`) on activation. Comparing against a non-reactive `prevActiveCount` updated in `$effect` prevents mount-time animations, SSR stagger mismatches, and reactive effect loops.
