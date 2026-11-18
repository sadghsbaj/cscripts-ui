---
name: KpiCard
kind: component
import: cs/svelte/kpi-card
exports:
    - KpiCard
    - KpiCardHeader
    - KpiCardIcon
    - KpiCardLabel
    - KpiCardMetric
    - KpiCardValue
    - KpiCardDelta
    - KpiCardComparison
    - KpiCardTarget
    - KpiCardVisual
    - KpiCardBreakdown
    - KpiCardBreakdownItem
    - KpiCardBody
    - KpiCardFooter
    - KpiCardActions
    - KpiCardOrnament
    - KpiCardClose
    - KpiCardGroup
    - KPI_CARD_VARIANTS
    - KPI_CARD_SIZES
    - KPI_CARD_LAYOUTS
    - KPI_CARD_LABEL_ELEMENTS
    - KPI_CARD_COLORS
    - KPI_CARD_DELTA_VARIANTS
    - KPI_CARD_DELTA_TRENDS
    - KPI_CARD_VISUAL_PLACEMENTS
    - KPI_CARD_VISUAL_VARIANTS
    - KPI_CARD_VISUAL_RATIOS
    - KPI_CARD_BREAKDOWN_VARIANTS
    - KPI_CARD_BREAKDOWN_COLUMNS
    - KPI_CARD_ACTIONS_ALIGNS
    - KPI_CARD_ACTIONS_ORIENTATIONS
    - KPI_CARD_ORNAMENT_PLACEMENTS
    - KPI_CARD_ORNAMENT_SHAPES
    - KPI_CARD_GROUP_COLUMNS
    - KpiCardVariant
    - KpiCardSize
    - KpiCardLayout
    - KpiCardLabelElement
    - KpiCardColor
    - KpiCardDeltaVariant
    - KpiCardDeltaTrend
    - KpiCardVisualPlacement
    - KpiCardVisualVariant
    - KpiCardVisualRatio
    - KpiCardBreakdownVariant
    - KpiCardBreakdownColumns
    - KpiCardActionsAlign
    - KpiCardActionsOrientation
    - KpiCardOrnamentPlacement
    - KpiCardOrnamentShape
    - KpiCardGroupColumns
    - KpiCardIconComponentProps
    - KpiCardProps
    - KpiCardHeaderProps
    - KpiCardIconProps
    - KpiCardLabelProps
    - KpiCardMetricProps
    - KpiCardValueProps
    - KpiCardDeltaProps
    - KpiCardComparisonProps
    - KpiCardTargetProps
    - KpiCardVisualProps
    - KpiCardBreakdownProps
    - KpiCardBreakdownItemProps
    - KpiCardBodyProps
    - KpiCardFooterProps
    - KpiCardActionsProps
    - KpiCardOrnamentProps
    - KpiCardCloseProps
    - KpiCardGroupProps
    - KpiCardContext
    - getKpiCardContext
    - setKpiCardContext
    - hasKpiCardContext
---

# KpiCard

## Overview

A borderless-first, composable analytics and metric evaluation container (`<KpiCard />`) built on monochrome surface tokens, superellipse squircles, and automatic concentric radius nesting shared with `Card`. Provides four layout presets (`stack`, `split`, `inline`, `hero`) and structured metric subcomponents for hero values (`NumberMorph`-ready), intent-driven trend deltas, target progress meters, visual/sparkline slots, attribution breakdowns, and responsive KPI grids.

## Usage Guidance

- **The 3-to-4 Signal Rule:** Keep each KPI card focused on **3–4 visual signals**: `KpiCardLabel` + `KpiCardValue` + at most 1–2 supporting signals (`KpiCardDelta` paired with `KpiCardVisual`, `KpiCardTarget`, `KpiCardComparison`, or `KpiCardBreakdown`). When a section needs narrative context, wrap a `KpiCardGroup` inside a standard `Card` using `CardHeader` and `CardDescription`.
- **Typographic Headers & `KpiCardIcon`:** Default to pure typographic headers (`KpiCardLabel` alone, optionally paired with a trailing `Badge`). `KpiCardIcon` renders exclusively as a subtle `plain` glyph (`14px`/`16px`/`18px`); place it **after** `KpiCardLabel` for a quiet trailing marker in the top-right corner, or before `KpiCardLabel` only when inline category scanning is needed.
- **`variant` (required):**
    - **`elevated`** _(recommended primary)_: Default dashboard surface on `canvas` or `sunken` backgrounds.
    - **`sunken`**: Recessed well for nested sub-KPIs inside `elevated` parent cards or inset telemetry pockets.
    - **`soft`**: Low-contrast secondary tiles inside `elevated` containers when `sunken` feels too heavy; avoid pairing with `elevated` interactive controls in dark mode.
    - **`transparent`**: Unboxed metric grouping without a backdrop plate over an existing surface.
- **`size` (required):**
    - **`sm` / `md` / `lg`**: Mirrors `Card` padding (`12px`/`16px`/`24px`), gaps (`8px`/`12px`/`16px`), and radii (`16px`/`24px`/`28px`) 1:1 while proportionally scaling KPI typography and visual slots.
- **`layout`:**
    - **`stack`** _(default)_: Vertical cadence for standard 2–4 column KPI grids.
    - **`split`**: Two-column composition pairing metric identity and value on the start track with a side `KpiCardVisual` (`end` or `start`); automatically collapses to single-column below `300px` (`sm`/`md`) or `360px` (`lg`).
    - **`inline`**: Single-band horizontal strip for compact toolbars or summary rows, stepping down value scale and defaulting `KpiCardDelta` to `"plain"`.
    - **`hero`**: Executive spotlight card with stepped-up display value sizes, tighter tracking, and wider section spacing.
- **Inverted Metrics (`KpiCardDelta`):** Separate `trend` (`"up" | "down" | "flat"`) from semantic `color` (`"positive" | "caution" | "negative" | "base"`) for "lower is better" metrics (for example `trend="down" color="positive"` on P95 latency, or `trend="up" color="negative"` on churn). Keep `KpiCardDelta` concise (`+14.2%`) and place comparison timeframes in `KpiCardComparison` only when no visual or target is present.
- **DOM Order & Accessibility:** Keep `KpiCardHeader` -> `KpiCardClose` -> `KpiCardMetric`/`KpiCardValue` -> `KpiCardComparison` -> `KpiCardTarget` -> `KpiCardVisual` -> `KpiCardBreakdown`/`KpiCardBody` -> `KpiCardFooter` in logical DOM order so keyboard `Tab` flow matches visual scanning.
- **Cross-Nesting & `NumberMorph`:** `KpiCard` and `Card` share the same internal surface-radius context, so nesting `KpiCard` inside `Card` or `KpiCardGroup` automatically applies `data-nested`, concentric corner radii, and stepped-down sub-KPI typography. Wrap `KpiCardMetric` content in `<NumberMorphGroup />` when `<NumberMorph />` sits beside an inline `<KpiCardDelta />` so sibling pills glide smoothly on digit-count changes.

## API

### `KpiCard` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-kpi-card">`.

| Prop       | Type                     | Required | Default     | Description                                                            |
| :--------- | :----------------------- | :------- | :---------- | :--------------------------------------------------------------------- |
| `variant`  | `KpiCardVariant`         | Yes      | —           | Surface style: `"elevated" \| "soft" \| "sunken" \| "transparent"`.    |
| `size`     | `KpiCardSize`            | Yes      | —           | Spatial density, typography, and radius scale: `"sm" \| "md" \| "lg"`. |
| `layout`   | `KpiCardLayout`          | No       | `"stack"`   | Grid arrangement preset: `"stack" \| "split" \| "inline" \| "hero"`.   |
| `children` | `Snippet`                | No       | `undefined` | Composed KPI subcomponents and arbitrary content.                      |
| `ref`      | `HTMLDivElement \| null` | No       | `null`      | `$bindable` reference to the root `<div>`.                             |

### Identity & Header Subcomponents

- **`KpiCardHeader`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-kpi-card-header">` (`ref = $bindable(null)`, `...rest`) as a single-row CSS Grid aligning `KpiCardLabel`, an optional leading `KpiCardIcon` (`:first-child`), and any trailing element (`Badge`, `KpiCardActions`, `KpiCardDelta`, or a trailing `KpiCardIcon` placed after `KpiCardLabel`).
- **`KpiCardLabel`**: Extends `HTMLAttributes<HTMLHeadingElement | HTMLSpanElement | HTMLDivElement>` with `{ as?: KpiCardLabelElement }` (default `"h3"`, `"h2" | "h3" | "h4" | "h5" | "h6" | "span" | "div"`). Renders `<svelte:element this={as} class="cs-kpi-card-label">` (`ref = $bindable(null)`, `...rest`). Uses `text-wrap: balance` normally and single-line ellipsis clipping in `layout="inline"`.

#### `KpiCardIcon` Props

Extends `Omit<HTMLAttributes<HTMLSpanElement>, "color">` and renders `<span aria-hidden="true" class="cs-kpi-card-icon">` as a bare, borderless `plain` glyph (`14px` at `sm`, `16px` at `md`, `18px` at `lg`).

| Prop          | Type                                   | Required | Default    | Description                                                                   |
| :------------ | :------------------------------------- | :------- | :--------- | :---------------------------------------------------------------------------- |
| `icon`        | `Component<KpiCardIconComponentProps>` | Yes      | —          | Icon component (for example from `@lucide/svelte`).                           |
| `color`       | `KpiCardColor`                         | No       | `"base"`   | Semantic tint: `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `strokeWidth` | `number \| string`                     | No       | Contextual | Defaults to `2` inside a `lg` `KpiCard`, otherwise `2.25`.                    |
| `ref`         | `HTMLSpanElement \| null`              | No       | `null`     | `$bindable` reference to the `<span>`.                                        |

### Metric & Delta Subcomponents

- **`KpiCardMetric`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-kpi-card-metric">` (`ref = $bindable(null)`, `...rest`) as a wrapping baseline flex row (`justify-content: flex-end` in `layout="inline"`).
- **`KpiCardComparison`**: Extends `HTMLAttributes<HTMLParagraphElement>`. Renders `<p class="cs-kpi-card-comparison">` (`ref = $bindable(null)`, `...rest`) with `tabular-nums lining-nums`.

#### `KpiCardValue` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "prefix">` and renders `<div class="cs-kpi-card-value">`. Keeps all integer, decimal, and fractional digits unified in `--cs-color-text-strong` at `600` weight and sets `--cs-number-morph-*` tokens for seamless `<NumberMorph />` composition.

| Prop       | Type                     | Required | Default     | Description                                                   |
| :--------- | :----------------------- | :------- | :---------- | :------------------------------------------------------------ |
| `prefix`   | `string`                 | No       | `undefined` | Baseline-aligned leading affix (e.g. `"$"`, `"~"`).           |
| `suffix`   | `string`                 | No       | `undefined` | Baseline-aligned trailing unit (e.g. `"ms"`, `"%"`, `"/ mo"`). |
| `children` | `Snippet`                | No       | `undefined` | Formatted numeric text or `<NumberMorph />`.                  |
| `ref`      | `HTMLDivElement \| null` | No       | `null`      | `$bindable` reference to the `<div>`.                         |

#### `KpiCardDelta` Props

Extends `Omit<HTMLAttributes<HTMLSpanElement>, "color">` and renders `<span class="cs-kpi-card-delta">`.

| Prop       | Type                                   | Required | Default     | Description                                                                                                                                               |
| :--------- | :------------------------------------- | :------- | :---------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trend`    | `KpiCardDeltaTrend`                    | No       | `undefined` | Direction indicator: `"up" \| "down" \| "flat"`. Maps default icon (`TrendingUp`, `TrendingDown`, `Minus`).                                               |
| `color`    | `KpiCardColor`                         | No       | Contextual  | `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. Resolves from `trend` (`up -> positive`, `down -> negative`, `flat -> base`) when omitted. |
| `variant`  | `KpiCardDeltaVariant`                  | No       | Contextual  | `"soft" \| "plain" \| "dot"`. Defaults to `"plain"` inside `layout="inline"` or `data-nested`, otherwise `"soft"`.                                        |
| `showIcon` | `boolean`                              | No       | `true`      | Renders the trend icon when `trend` or `icon` is set and `variant !== "dot"`.                                                                             |
| `icon`     | `Component<KpiCardIconComponentProps>` | No       | `undefined` | Custom icon overriding the default trend icon.                                                                                                            |
| `children` | `Snippet`                              | No       | `undefined` | Signed delta text or `<NumberMorph />`.                                                                                                                   |
| `ref`      | `HTMLSpanElement \| null`              | No       | `null`      | `$bindable` reference to the `<span>`.                                                                                                                    |

### Target, Visual & Breakdown Subcomponents

#### `KpiCardTarget` Props

Extends `Omit<HTMLAttributes<HTMLDivElement>, "color">` and renders `<div class="cs-kpi-card-target">`. Composes native `<Progress />` cleanly when `value !== undefined || !children`.

| Prop         | Type                     | Required | Default     | Description                                                                                       |
| :----------- | :----------------------- | :------- | :---------- | :------------------------------------------------------------------------------------------------ |
| `value`      | `number \| null`         | No       | `undefined` | Current progress value forwarded to `<Progress />`.                                               |
| `min`        | `number`                 | No       | `0`         | Minimum progress value.                                                                           |
| `max`        | `number`                 | No       | `100`       | Maximum progress value.                                                                           |
| `appearance` | `ProgressAppearance`     | No       | `"bar"`     | Progress style: `"bar" \| "dashed" \| "dotted"`.                                                  |
| `variant`    | `ProgressVariant`        | No       | Contextual  | `"soft" \| "elevated"`. Defaults to `"elevated"` inside `sunken`/`soft` `KpiCard`, else `"soft"`. |
| `color`      | `ProgressColor`          | No       | `"accent"`  | Semantic progress color (`"base" \| "accent" \| "positive" \| "caution" \| "negative"`).          |
| `size`       | `ProgressSize`           | No       | Contextual  | Defaults to `"md"` inside `lg` `KpiCard`, otherwise `"sm"`.                                       |
| `segments`   | `number`                 | No       | `undefined` | Segment count forwarded to `<Progress />` for `"dashed"` / `"dotted"`.                            |
| `label`      | `string`                 | No       | `undefined` | Start-aligned label wired to `<Progress />` via `aria-labelledby`.                                |
| `target`     | `string`                 | No       | `undefined` | End-aligned tabular readout (e.g. `"84%"`, `"118 / 200 ms"`).                                     |
| `children`   | `Snippet`                | No       | `undefined` | Optional custom progress or benchmark markup.                                                     |
| `ref`        | `HTMLDivElement \| null` | No       | `null`      | `$bindable` reference to the `<div>`.                                                             |

#### `KpiCardVisual` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-kpi-card-visual">`.

| Prop        | Type                     | Required | Default         | Description                                                                                                    |
| :---------- | :----------------------- | :------- | :-------------- | :------------------------------------------------------------------------------------------------------------- |
| `placement` | `KpiCardVisualPlacement` | No       | Contextual      | `"bottom" \| "top" \| "end" \| "start"`. Defaults to `"end"` in `split`/`inline` layouts, else `"bottom"`.     |
| `variant`   | `KpiCardVisualVariant`   | No       | `"transparent"` | Container well surface: `"transparent" \| "soft" \| "sunken"`.                                                 |
| `ratio`     | `KpiCardVisualRatio`     | No       | `"auto"`        | Aspect ratio: `"auto" \| "16/9" \| "21/9" \| "4/3" \| "3/1" \| "1/1"` or any custom CSS `aspect-ratio` string. |
| `bleed`     | `boolean`                | No       | `false`         | Extends the visual flush to the card edge (`overflow: clip`), removing inner corner rounding.                  |
| `children`  | `Snippet`                | No       | `undefined`     | Sparkline SVG, chart, or gauge markup.                                                                         |
| `ref`       | `HTMLDivElement \| null` | No       | `null`          | `$bindable` reference to the `<div>`.                                                                          |

#### `KpiCardBreakdown` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-kpi-card-breakdown">`.

| Prop       | Type                      | Required | Default     | Description                                                                                                                |
| :--------- | :------------------------ | :------- | :---------- | :------------------------------------------------------------------------------------------------------------------------- |
| `variant`  | `KpiCardBreakdownVariant` | No       | `"plain"`   | Surface style: `"plain" \| "soft" \| "sunken"`. When `"plain"` with `columns={1}`, renders hairline dividers between rows. |
| `columns`  | `KpiCardBreakdownColumns` | No       | `"auto"`    | Grid layout: `1 \| 2 \| 3 \| 4 \| "auto"` (`columns={1}` switches items to horizontal key-value rows).                     |
| `children` | `Snippet`                 | No       | `undefined` | Child `<KpiCardBreakdownItem />` entries.                                                                                  |
| `ref`      | `HTMLDivElement \| null`  | No       | `null`      | `$bindable` reference to the `<div>`.                                                                                      |

#### `KpiCardBreakdownItem` Props

Extends `HTMLAttributes<HTMLDivElement>` and renders `<div class="cs-kpi-card-breakdown-item">`.

| Prop       | Type                     | Required | Default     | Description                                                                               |
| :--------- | :----------------------- | :------- | :---------- | :---------------------------------------------------------------------------------------- |
| `label`    | `string`                 | No       | `undefined` | Breakdown category or segment label.                                                      |
| `value`    | `string \| number`       | No       | `undefined` | Primary tabular readout.                                                                  |
| `share`    | `string`                 | No       | `undefined` | Secondary percentage or share readout.                                                    |
| `dotColor` | `KpiCardColor`           | No       | `undefined` | Optional `6px` status dot: `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `children` | `Snippet`                | No       | `undefined` | Custom inline or supplementary content.                                                   |
| `ref`      | `HTMLDivElement \| null` | No       | `null`      | `$bindable` reference to the `<div>`.                                                     |

### Structural, Action, Ornament & Group Subcomponents

- **`KpiCardBody`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-kpi-card-body">` (`ref = $bindable(null)`, `...rest`) as a flex column with `gap: var(--cs-kpi-card-gap)`.
- **`KpiCardFooter`**: Extends `HTMLAttributes<HTMLDivElement>`. Renders `<div class="cs-kpi-card-footer">` (`ref = $bindable(null)`, `...rest`) as a wrapping horizontal flex row (`justify-content: space-between; align-items: center`).
- **`KpiCardActions`**: Extends `HTMLAttributes<HTMLDivElement>` with `{ align?: KpiCardActionsAlign; orientation?: KpiCardActionsOrientation }` (defaults `"end"`, `"horizontal"`). Renders `<div class="cs-kpi-card-actions">` (`ref = $bindable(null)`, `...rest`).
- **`KpiCardOrnament`**: Extends `HTMLAttributes<HTMLDivElement>` with `{ placement?: KpiCardOrnamentPlacement; shape?: KpiCardOrnamentShape }` (defaults `"bottom-left"`, `"none"`). Renders `<div aria-hidden="true" class="cs-kpi-card-ornament">` (`ref = $bindable(null)`, `...rest`) clipped inside the card boundary.
- **`KpiCardClose`**: Extends `Omit<CloseButtonProps, "size"> & { size?: CloseButtonSize }` (`variant` required: `"soft" | "ghost" | "elevated"`; `size` defaults contextually from `KpiCard`: `sm -> "xs"`, `md -> "sm"`, `lg -> "md"`, or `"sm"` standalone). Wraps `<CloseButton class="cs-kpi-card-close">` with `<HitArea size="md" />`.
- **`KpiCardGroup`**: Extends `HTMLAttributes<HTMLDivElement>` with `{ columns?: KpiCardGroupColumns }` (default `"auto"`, `1 | 2 | 3 | 4 | "auto"`). Renders `<div class="cs-kpi-card-group">` (`ref = $bindable(null)`, `...rest`). When nested inside `Card` or `KpiCard`, sets `data-nested` and lowers `columns="auto"` minimum track width from `220px` to `132px`.

### Constants & Context Helpers

- `KPI_CARD_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const`
- `KPI_CARD_SIZES = ["sm", "md", "lg"] as const`
- `KPI_CARD_LAYOUTS = ["stack", "split", "inline", "hero"] as const`
- `KPI_CARD_LABEL_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "span", "div"] as const`
- `KPI_CARD_COLORS = ["base", "accent", "positive", "caution", "negative"] as const`
- `KPI_CARD_DELTA_VARIANTS = ["soft", "plain", "dot"] as const`
- `KPI_CARD_DELTA_TRENDS = ["up", "down", "flat"] as const`
- `KPI_CARD_VISUAL_PLACEMENTS = ["bottom", "top", "end", "start"] as const`
- `KPI_CARD_VISUAL_VARIANTS = ["transparent", "soft", "sunken"] as const`
- `KPI_CARD_VISUAL_RATIOS = ["auto", "16/9", "21/9", "4/3", "3/1", "1/1"] as const`
- `KPI_CARD_BREAKDOWN_VARIANTS = ["plain", "soft", "sunken"] as const`
- `KPI_CARD_BREAKDOWN_COLUMNS = [1, 2, 3, 4, "auto"] as const`
- `KPI_CARD_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const`
- `KPI_CARD_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const`
- `KPI_CARD_ORNAMENT_PLACEMENTS = ["bottom-left", "bottom-right", "top-right", "inset"] as const`
- `KPI_CARD_ORNAMENT_SHAPES = ["circle", "none"] as const`
- `KPI_CARD_GROUP_COLUMNS = [1, 2, 3, 4, "auto"] as const`
- `getKpiCardContext(): KpiCardContext`, `setKpiCardContext(value: KpiCardContext): KpiCardContext`, `hasKpiCardContext(): boolean` — reads/sets `{ readonly variant: KpiCardVariant; readonly size: KpiCardSize; readonly layout: KpiCardLayout; readonly nested: boolean }`.

### `data-*` Attributes

- **`KpiCard`**: `data-variant={variant}`, `data-size={size}`, `data-layout={layout}`, `data-nested` (present when inside an ancestor `Card` or `KpiCard`).
- **`KpiCardIcon`**: `data-color={color}`.
- **`KpiCardDelta`**: `data-variant={resolvedVariant}`, `data-color={resolvedColor}`, `data-trend={trend}`.
- **`KpiCardVisual`**: `data-placement={resolvedPlacement}`, `data-variant={variant}`, `data-ratio="auto"` (present only when `ratio === "auto"`), `data-bleed` (present when `bleed` is truthy).
- **`KpiCardBreakdown`**: `data-variant={variant}`, `data-columns={columns}`.
- **`KpiCardBreakdownItem`**: `data-dot-color={dotColor}`.
- **`KpiCardActions`**: `data-align={align}`, `data-orientation={orientation}`.
- **`KpiCardOrnament`**: `data-placement={placement}`, `data-shape={shape}`.
- **`KpiCardClose`**: Inherits `data-variant` and `data-size` from `CloseButton`.
- **`KpiCardGroup`**: `data-columns={columns}`, `data-nested` (present when inside an ancestor `Card` or `KpiCard`).

### CSS Custom Properties

| Variable                                                                                                                                                                                                                                                                                                                                                  | Description                                                                                                                                                                                                                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--cs-kpi-card-bg` / `--cs-kpi-card-fg` / `--cs-kpi-card-affix-fg` / `--cs-kpi-card-shadow`                                                                                                                                                                                                                                                              | Surface background, text color (`--cs-color-text-main`), prefix/suffix color (`--cs-color-text-weak`), and box-shadow.                                                                                                      |
| `--cs-kpi-card-padding` / `--cs-kpi-card-gap` / `--cs-kpi-card-section-gap`                                                                                                                                                                                                                                                                               | Card padding (`12px`/`16px`/`24px`), grid gap (`8px`/`12px`/`16px`), and `hero` layout section gap (`12px`/`16px`/`20px`).                                                                                                  |
| `--cs-kpi-card-header-gap` / `--cs-kpi-card-header-col-gap`                                                                                                                                                                                                                                                                                               | Header row gap (`2px`/`3px`/`4px`) and column gap (`6px`/`8px`/`10px`).                                                                                                                                                     |
| `--cs-kpi-card-radius` / `--cs-kpi-card-squircle`                                                                                                                                                                                                                                                                                                         | Outer radius (`--cs-radius-2xl`/`--cs-radius-3xl`/`28px`, or `--cs-kpi-card-nested-radius`) and `corner-shape`.                                                                                                             |
| `--cs-kpi-card-inner-radius` / `--cs-kpi-card-inner-radius-base` / `--cs-kpi-card-nested-radius`                                                                                                                                                                                                                                                          | Concentric inner radius (`max(var(--cs-kpi-card-inner-radius-base, var(--cs-radius-lg)), calc(var(--cs-kpi-card-radius) - var(--cs-kpi-card-padding)))`) and ancestor-provided nested radius.                                |
| `--cs-kpi-card-label-size` / `--cs-kpi-card-label-lh`                                                                                                                                                                                                                                                                                                     | Typography scale for `KpiCardLabel` (`12px`/`13px`/`14px`) and line-height (`16px`/`18px`/`20px`).                                                                                                                         |
| `--cs-kpi-card-comparison-size` / `--cs-kpi-card-comparison-lh`                                                                                                                                                                                                                                                                                           | Typography scale for `KpiCardComparison` and `KpiCardTarget` metadata (`11px`/`12px`/`13px`).                                                                                                                               |
| `--cs-kpi-card-value-size` / `--cs-kpi-card-value-lh` / `--cs-kpi-card-value-weight` / `--cs-kpi-card-value-tracking` / `--cs-kpi-card-value-affix-gap` / `--cs-kpi-card-metric-gap`                                                                                                                                                                      | Hero readout scale (`22px`/`28px`/`34px`, stepped up in `hero` and down in `inline`/`[data-nested]`), weight (`600`), tracking, suffix gap, and `KpiCardMetric` column gap.                                                 |
| `--cs-kpi-card-icon-fg` / `--cs-kpi-card-icon-size`                                                                                                                                                                                                                                                                                                       | `KpiCardIcon` glyph color and size (`14px`/`16px`/`18px`).                                                                                                                                                                  |
| `--cs-kpi-card-delta-bg` / `--cs-kpi-card-delta-fg` / `--cs-kpi-card-delta-dot-bg` / `--cs-kpi-card-delta-height` / `--cs-kpi-card-delta-px` / `--cs-kpi-card-delta-font-size` / `--cs-kpi-card-delta-icon-size` / `--cs-kpi-card-delta-gap` / `--cs-kpi-card-delta-dot-size`                                                                             | `KpiCardDelta` surface fill, foreground, dot color, height (`20px`/`24px`), horizontal padding, font size, icon size, gap, and dot diameter.                                                                                |
| `--cs-kpi-card-visual-bg` / `--cs-kpi-card-visual-shadow` / `--cs-kpi-card-visual-radius` / `--cs-kpi-card-visual-padding` / `--cs-kpi-card-visual-inline-size` / `--cs-kpi-card-visual-inline-block-size` / `--cs-kpi-card-visual-min-block-size` / `--cs-kpi-card-visual-ratio` / `--cs-kpi-card-visual-bleed-start` / `--cs-kpi-card-visual-bleed-end` | `KpiCardVisual` surface fill, shadow, radius (`--cs-kpi-card-inner-radius`), padding (`8px`/`10px`/`12px`), side track width (`104px`/`144px`/`192px`, or `72px` in `inline`), inline height (`24px`/`28px`/`32px`), min-height, aspect ratio, and bleed offsets. |
| `--cs-kpi-card-breakdown-bg` / `--cs-kpi-card-breakdown-shadow` / `--cs-kpi-card-breakdown-radius` / `--cs-kpi-card-breakdown-padding` / `--cs-kpi-card-breakdown-gap` / `--cs-kpi-card-breakdown-font-size` / `--cs-kpi-card-breakdown-row-height` / `--cs-kpi-card-breakdown-dot-bg`                                                                    | `KpiCardBreakdown` and `KpiCardBreakdownItem` plate fill, shadow, radius, padding, gap, font size, single-column row min-height, and dot color.                                                                             |
| `--cs-kpi-card-close-offset` / `--cs-kpi-card-close-size`                                                                                                                                                                                                                                                                                                 | Corner inset (`8px`/`10px`/`12px`) and header clearance width (`16px`/`24px`/`32px`) for `KpiCardClose`.                                                                                                                    |
| `--cs-kpi-card-ornament-color` / `--cs-kpi-card-ornament-tint` / `--cs-kpi-card-ornament-size` / `--cs-kpi-card-ornament-icon-size`                                                                                                                                                                                                                       | Circle ornament color (defaults to `--cs-color-accent-500`), `oklab` mix, diameter (`88px`/`104px`/`124px`), and icon size (`40%`).                                                                                         |
| `--cs-kpi-card-group-gap` / `--cs-kpi-card-group-min-size`                                                                                                                                                                                                                                                                                                | `KpiCardGroup` gap (`12px` default; `8px` inside `sm`, `12px` inside `md`/`lg` `KpiCard`) and `columns="auto"` minimum track size (`220px`, or `132px` when nested).                                                        |

## Examples

### Standard KPI with Live `NumberMorph` & Sparkline

```svelte
<script lang="ts">
    import { Activity } from "@lucide/svelte";
    import {
        KpiCard,
        KpiCardDelta,
        KpiCardHeader,
        KpiCardIcon,
        KpiCardLabel,
        KpiCardMetric,
        KpiCardValue,
        KpiCardVisual,
    } from "cs/svelte/kpi-card";
    import { NumberMorph, NumberMorphGroup } from "cs/svelte/number-morph";

    let revenue = $state(148_920.45);
</script>

<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>Monthly Revenue</KpiCardLabel>
        <KpiCardIcon icon={Activity} />
    </KpiCardHeader>

    <KpiCardMetric>
        <NumberMorphGroup class="items-baseline gap-2">
            <KpiCardValue>
                <NumberMorph value={revenue} locales="en-US" format={{ style: "currency", currency: "USD" }} />
            </KpiCardValue>
            <KpiCardDelta trend="up">+14.2%</KpiCardDelta>
        </NumberMorphGroup>
    </KpiCardMetric>

    <KpiCardVisual placement="bottom" bleed>
        <!-- sparkline SVG -->
    </KpiCardVisual>
</KpiCard>
```

### Inverted Semantics & Clean Target Progress (Lower Is Better)

```svelte
<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>P95 API Latency</KpiCardLabel>
    </KpiCardHeader>

    <KpiCardMetric>
        <KpiCardValue suffix="ms">118</KpiCardValue>
        <KpiCardDelta trend="down" color="positive">-24 ms</KpiCardDelta>
    </KpiCardMetric>

    <KpiCardTarget
        value={118}
        max={200}
        appearance="dashed"
        segments={12}
        color="positive"
        label="SLA budget"
        target="118 / 200 ms"
    />
</KpiCard>
```

### Nested Sub-KPIs inside `KpiCard` & `Card`

```svelte
<KpiCard variant="elevated" size="lg" layout="hero">
    <KpiCardHeader>
        <KpiCardLabel>Platform Throughput</KpiCardLabel>
    </KpiCardHeader>

    <KpiCardMetric>
        <KpiCardValue suffix="req/h">1.42M</KpiCardValue>
        <KpiCardDelta trend="up">+11.4%</KpiCardDelta>
    </KpiCardMetric>

    <KpiCardGroup columns={3}>
        <KpiCard variant="sunken" size="sm">
            <KpiCardHeader>
                <KpiCardLabel>Edge Cache Hit</KpiCardLabel>
            </KpiCardHeader>
            <KpiCardMetric>
                <KpiCardValue suffix="%">96.4</KpiCardValue>
                <KpiCardDelta trend="up">+0.8%</KpiCardDelta>
            </KpiCardMetric>
        </KpiCard>
        <!-- additional sunken sub-KPIs -->
    </KpiCardGroup>
</KpiCard>
```

## Behavior & Quirks

- **Intrinsic tracks without outer containment:** `stack`, `hero`, and `inline` layouts avoid `container-type: inline-size` on `.cs-kpi-card` so intrinsic sizing, `KpiCardGroup`, and descendant popovers/tooltips behave predictably. Only `layout="split"` uses `container-type: inline-size` with an inner `.cs-kpi-card-split` grid so side visuals (`start`/`end`) automatically collapse to a single column below `300px` (`sm`/`md`) or `360px` (`lg`).
- **Contextual subcomponent defaults:** Inside `layout="inline"` or `data-nested`, `KpiCardDelta` automatically defaults to `variant="plain"` (while `soft` pills inside a `soft` `KpiCard` with `color="base"` step up to `--cs-color-base-soft-hover` so they remain visible). `KpiCardTarget` automatically sets `Progress` to `variant="elevated"` inside `sunken` or `soft` cards and `size="md"` inside `lg` cards.
- **Automatic `KpiCardClose` clearance:** When a direct `KpiCardClose` is present without an `end`-placed `KpiCardVisual`, `KpiCard` adds inline-end clearance padding to `KpiCardHeader` (or to the metric/value/delta track in `layout="inline"`).
- **Concentric radius context (`Card <-> KpiCard`):** Both `KpiCard` and `Card` share the same internal `surface-radius` context, so nesting in any combination (`KpiCard > KpiCard`, `Card > KpiCard`, `KpiCard > Card`) marks the child `data-nested` and passes `--cs-kpi-card-nested-radius` down to an `8px` floor.
- **Direct-child metric placement in `inline` layout:** Placing `KpiCardValue` and `KpiCardDelta` directly inside `KpiCard layout="inline"` (or wrapped in `KpiCardMetric`) automatically allocates end-aligned grid tracks, while `KpiCardTarget`, `KpiCardBreakdown`, `KpiCardBody`, `KpiCardFooter`, and bottom visuals span `1 / -1` underneath.
