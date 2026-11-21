---
name: Charts
kind: hybrid
import: cs/svelte/charts
exports:
  - Chart
  - ChartHeader
  - ChartTitle
  - ChartDescription
  - ChartActions
  - ChartLegend
  - ChartCanvas
  - ChartGrid
  - ChartAxis
  - ChartLine
  - ChartArea
  - ChartBar
  - ChartArc
  - ChartReferenceLine
  - ChartReferenceBand
  - ChartAnnotation
  - ChartCrosshair
  - ChartTooltip
  - ChartOverlay
  - ChartEmpty
  - ChartLoading
  - LineChart
  - AreaChart
  - BarChart
  - ComposedChart
  - DonutChart
  - getChartContext
  - setChartContext
  - hasChartContext
  - ChartContext
  - ChartState
  - resolveSeriesColor
  - resolveToneColor
  - CHART_VARIANTS
  - CHART_SIZES
  - CHART_PALETTES
  - CHART_MONOTONE_HUES
  - CHART_TONES
  - CHART_CURVES
  - CHART_ORIENTATIONS
  - CHART_BAR_MODES
  - CHART_BAR_VALUE_LABELS
  - CHART_BAR_INSIDE_LABEL_ORIENTATIONS
  - CHART_BAR_LABEL_LAYOUTS
  - CHART_AREA_MODES
  - CHART_AXIS_POSITIONS
  - CHART_LEGEND_POSITIONS
  - CHART_LEGEND_PLACEMENTS
  - CHART_LEGEND_MARKERS
  - CHART_TOOLTIP_MODES
  - CHART_ZERO_LINE_STYLES
  - CHART_X_SCALE_TYPES
  - CHART_TICK_ANGLES
  - CHART_TITLE_ELEMENTS
  - CHART_LOADING_SHAPES
  - CHART_AREA_PARTS
  - CHART_REFERENCE_BAND_PARTS
  - CHART_DONUT_CENTER_MODES
  - ChartVariant
  - ChartSize
  - ChartPalette
  - ChartMonotoneHue
  - ChartTone
  - ChartCurve
  - ChartOrientation
  - ChartBarMode
  - ChartBarValueLabelsMode
  - ChartBarValueLabels
  - ChartBarInsideLabelOrientation
  - ChartBarLabelLayout
  - ChartAreaMode
  - ChartAxisPosition
  - ChartLegendPosition
  - ChartLegendPlacement
  - ChartLegendMarker
  - ChartTooltipMode
  - ChartZeroLineStyle
  - ChartXScaleType
  - ChartResolvedXScaleType
  - ChartTickAngle
  - ChartTitleElement
  - ChartDatum
  - ChartXValue
  - ChartSeriesType
  - ChartAxisDomainBound
  - ChartAxisDomain
  - ChartMargins
  - ChartSvgRect
  - ChartActiveAnchor
  - ChartXScale
  - ChartNumericScale
  - ChartSeries
  - ChartAxisConfig
  - ChartReferenceLineConfig
  - ChartReferenceBandConfig
  - ChartAnnotationConfig
  - ChartTooltipItem
  - ChartTooltipContext
  - ChartSlice
  - ChartStateOptions
  - ChartProps
  - ChartHeaderProps
  - ChartTitleProps
  - ChartDescriptionProps
  - ChartActionsProps
  - ChartCanvasProps
  - ChartLegendProps
  - ChartCrosshairProps
  - ChartTooltipProps
  - ChartOverlayProps
  - ChartGridProps
  - ChartAxisProps
  - ChartEmptyProps
  - ChartLoadingShape
  - ChartLoadingProps
  - ChartLineDotsMode
  - ChartGridConfig
  - ChartGridOption
  - ChartLineProps
  - ChartAreaPart
  - ChartAreaProps
  - ChartBarProps
  - ChartReferenceLineProps
  - ChartReferenceBandPart
  - ChartReferenceBandProps
  - ChartAnnotationProps
  - LineChartProps
  - AreaChartProps
  - BarChartProps
  - ComposedChartProps
  - ChartDonutCenterMode
  - ChartPolarSlice
  - ChartArcItem
  - ChartDonutCenterContext
  - ChartDonutTooltipContext
  - ChartArcProps
  - DonutChartProps
---

# Charts

## Overview

Responsive, pure-SVG data visualization system built on a two-tier architecture with borderless OKLCH surfaces, concentric squircle nesting, and top-layer floating tooltips:

- **Tier 2 — Batteries-Included Charts:** `LineChart`, `AreaChart`, `BarChart`, `ComposedChart`, and `DonutChart` (which also covers full Pie charts via `innerRadiusRatio={0}`). Built exclusively by composing Tier-1 primitives and accepting declarative `referenceLines`, `referenceBands`, `annotations`, custom `tooltip` snippets, and extra SVG `children` layers.
- **Tier 1 — Composable Primitives & Reactive Context:** `<Chart>`, `<ChartCanvas>`, SVG layers (`ChartGrid`, `ChartAxis`, `ChartLine`, `ChartArea`, `ChartBar`, `ChartArc`, `ChartCrosshair`, `ChartReferenceLine`, `ChartReferenceBand`, `ChartAnnotation`), and HTML chrome (`ChartHeader`, `ChartLegend`, `ChartTooltip`, `ChartOverlay`, `ChartEmpty`, `ChartLoading`) connected through reactive `ChartState` and `getChartContext()`. Any custom Svelte SVG layer can call `getChartContext()` to share the exact same scales, margins, colors, and scrubbing state.

## Usage Guidance

- **Surface Pairing & Concentric Nesting (`variant`, required):**
  - **`elevated`**: Primary standalone chart card on `--cs-color-canvas`. Never nest `elevated` inside an `elevated` `Card`.
  - **`soft`**: Quiet borderless tonal surface on `--cs-color-canvas` or inside an `elevated` `Card` without elevation shadow.
  - **`sunken`**: Recessed chart well nested inside an `elevated` `Card` or drawer without double-shadowing.
  - **`transparent`**: Frameless flush embedding inside a `Card` or `KpiCard` that already owns the outer shell (override `--cs-chart-backdrop-bg: var(--cs-color-elevated)` when placed on an elevated surface so active point halos and stacked gaps match the backdrop).
- **Density Scale (`size`, required):** `sm`, `md`, and `lg` mirror `Card` and `KpiCard` padding (`12px` / `16px` / `24px`), gaps (`8px` / `12px` / `16px`), and standalone squircle radii (`16px` / `24px` / `28px`) 1:1 while scaling plot height (`180px` / `260px` / `340px`), typography, strokes, and bar caps.
- **Donut vs. Pie (`DonutChart`):** There is intentionally no separate `PieChart` component. Use `DonutChart` with its default `innerRadiusRatio={0.68}` for donuts, or pass `innerRadiusRatio={0}` for a full Pie (automatically switches to `1.5px` `--cs-chart-point-ring-bg` slice seams).
- **Color Palettes:**
  - **`palette="categorical"`** _(default, 10 slots)_: Multi-series comparisons (regions, products, categories). Slot 1 tracks `--cs-color-accent-*`, followed by Teal, Amber, Violet, Rose, Sky, Emerald, Orange, Fuchsia, and Slate.
  - **`monotone="<hue>"`**: Interleaved single-hue lightness ramps (`accent`, `blue`, `slate`, `emerald`, `teal`, `violet`, `amber`, `rose`) for monochrome executive decks, cohort breakdowns, and stacked comparisons.
  - **`palette="semantic"`** or per-series `tone`: Intent-driven status tokens (`positive`, `caution`, `negative`) for variance bars, status distributions, and target corridors.

## API

### Core Data, Series & Configuration Contracts

#### `ChartSeries<TDatum>`

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | — | Unique series identifier (also default datum key if `accessor` is omitted). |
| `label` | `string` | Yes | — | Human-readable legend and tooltip label. |
| `accessor` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| null \| undefined)` | No | `datum[id]` | Value extractor; `null`/`undefined`/non-finite values render as gaps. |
| `yAxis` | `"left" \| "right"` | No | `"left"` | Target Y-axis (`"right"` activates the secondary Y2 axis). |
| `stack` | `string` | No | `undefined` | Named stack group key. Series sharing a `stack` stack together while distinct stacks sit side-by-side (Grouped + Stacked bars). |
| `type` | `"line" \| "area" \| "bar"` | No | `"line"` | Mark type when used inside `ComposedChart` (and for `ChartLegend marker="auto"`). |
| `tone` | `ChartTone` | No | `undefined` | Semantic status override (`"base" \| "accent" \| "positive" \| "caution" \| "negative"`). |
| `color` | `string` | No | `undefined` | Explicit CSS color override (takes precedence over `tone` and `palette`). |
| `dashed` | `boolean` | No | `false` | Renders dashed strokes on lines, area top strokes, and legend swatches. |
| `format` | `(value: number, datum: TDatum) => string` | No | Axis/default formatter | Per-series value formatter for tooltips and value labels. |
| `visible` | `boolean` | No | `true` | Initial visibility (`false` seeds `hiddenSeriesIds` on `ChartState` construction). |

#### `ChartAxisConfig`

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `label` | `string` | `undefined` | Axis title rendered outside tick labels. |
| `show` | `boolean` | `true` | Hides the axis and reclaims its margin when `false`. |
| `domain` | `readonly [ChartAxisDomainBound, ChartAxisDomainBound]` | `["auto", "auto"]` | Bounds (`number \| "auto" \| "dataMin" \| "dataMax"`). |
| `tickCount` | `number` | `5` (numeric) | Target tick count. |
| `format` | `(value: ChartXValue) => string` | Default tick formatter | Tick and tooltip value formatter. |
| `tickAngle` | `"auto" \| 0 \| -35 \| -45` | `0` | Bottom axis tick rotation (`"auto"` tilts dense categories to `-38deg`). |
| `wrapTicks` | `boolean` | `false` | Wraps long category labels onto up to 2 `<tspan>` lines. |
| `maxTickWidth` | `number` | `undefined` (`140` on horizontal Y) | Maximum tick label pixel width before truncation with `…`. |
| `includeZero` | `boolean` | `true` | Forces numeric scale domains to include `0`. |

#### Overlays (`ChartReferenceLineConfig`, `ChartReferenceBandConfig`, `ChartAnnotationConfig`)

- **`ChartReferenceLineConfig`**: `{ id?: string; axis: "x" | "y" | "y2"; value: ChartXValue; label?: string; labelPosition?: "start" | "center" | "end"; tone?: ChartTone; color?: string; dashed?: boolean }`
- **`ChartReferenceBandConfig`**: `{ id?: string; axis: "x" | "y" | "y2"; from: ChartXValue; to: ChartXValue; label?: string; tone?: ChartTone; color?: string }`
- **`ChartAnnotationConfig`**: `{ id?: string; x: ChartXValue; y: number; yAxis?: "left" | "right"; dx?: number; dy?: number; label: string; tone?: ChartTone; color?: string }`

---

### Tier-2 Batteries-Included Charts

#### Shared Cartesian Base Props (`LineChart`, `AreaChart`, `BarChart`, `ComposedChart`)

All four Cartesian Tier-2 components extend `Omit<HTMLAttributes<HTMLElement>, "children" | "title">` and share:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ChartVariant` | Yes | — | Surface variant: `"elevated" \| "soft" \| "sunken" \| "transparent"`. |
| `size` | `ChartSize` | Yes | — | Density scale: `"sm" \| "md" \| "lg"`. |
| `data` | `readonly TDatum[]` | Yes | — | Source dataset array. |
| `x` | `keyof TDatum \| ((datum: TDatum, index: number) => ChartXValue)` | Yes | — | X-value key or extractor (`Date`, `string`, or `number`). |
| `series` | `readonly ChartSeries<TDatum>[]` | Yes | — | Series definitions. |
| `xScaleType` | `ChartXScaleType` | No | `"auto"` | `"auto" \| "band" \| "point" \| "time" \| "linear"`. |
| `grid` | `ChartGridOption` | No | `true` | `boolean \| { horizontal?: boolean; vertical?: boolean; zeroLine?: boolean \| ChartZeroLineStyle }`. |
| `xAxis` / `yAxis` / `y2Axis` | `ChartAxisConfig` | No | `undefined` | Axis labels, formatting, domains, ticks, and rotation/wrapping. |
| `referenceLines` | `readonly ChartReferenceLineConfig[]` | No | `undefined` | Declarative threshold lines with optional inline SVG pills. |
| `referenceBands` | `readonly ChartReferenceBandConfig[]` | No | `undefined` | Declarative target corridors (fill behind marks, label pill above marks). |
| `annotations` | `readonly ChartAnnotationConfig[]` | No | `undefined` | Declarative pure-SVG data-coordinate callouts. |
| `legend` | `ChartLegendPosition` | No | `"top"` | `"top" \| "bottom" \| "end" \| "none"`. |
| `tooltip` | `boolean \| Snippet<[ChartTooltipContext<TDatum>]>` | No | `true` | Enables floating tooltip or supplies custom tooltip content snippet. |
| `tooltipMode` | `ChartTooltipMode` | No | `"axis"` | `"axis"` (all series at X-index), `"item"` (hovered series only), or `"none"`. |
| `showTotal` | `boolean` | No | `false` (`true` when stacked) | Displays summed total row in the tooltip. |
| `palette` | `ChartPalette` | No | `"categorical"` | `"categorical" \| "semantic"`. |
| `monotone` | `ChartMonotoneHue` | No | `undefined` | Overrides palette with an interleaved single-hue ramp. |
| `title` / `description` / `actions` | `string` / `string` / `Snippet` | No | `undefined` | Optional outer HTML header copy and trailing controls slot. |
| `height` / `aspectRatio` / `margin` | `number \| string` / `string` / `Partial<ChartMargins>` | No | Size token | Explicit plot height, CSS `aspect-ratio`, or margin overrides. |
| `loading` / `empty` / `emptyTitle` / `emptyDescription` | `boolean` / `boolean` / `string` / `string` | No | `false` / auto | Loading silhouette skeleton and empty state controls. |
| `interactive` | `boolean` | No | `true` | Enables pointer/keyboard scrubbing, tooltip, and interactive legend toggles. |
| `onPointClick` | `(datum: TDatum, index: number) => void` | No | `undefined` | Fired on click or `Enter`/`Space` while scrubbing a data point. |
| `hiddenSeriesIds` | `readonly string[]` | No | `undefined` | `$bindable` hidden series IDs. |
| `activeIndex` | `number \| null` | No | `undefined` | `$bindable` active scrubbed datum index. |
| `hoveredSeriesId` | `string \| null` | No | `undefined` | `$bindable` hovered/isolated series ID. |
| `label` / `labelledBy` | `string` | No | Auto from `title` | Accessible figure and SVG label. |
| `ref` / `svgRef` | `HTMLElement \| null` / `SVGSVGElement \| null` | No | `null` | `$bindable` root `<figure>` and inner `<svg>` element references. |
| `children` / `overlay` | `Snippet` | No | `undefined` | Extra SVG layers inside `<ChartCanvas>` / HTML overlay slot. |

#### `LineChart` Specific Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `curve` | `ChartCurve` | `"monotone"` | Interpolation: `"linear" \| "monotone" \| "step"`. |
| `strokeWidth` | `number` | CSS token | Line stroke width override in pixels. |
| `showDots` | `boolean \| "active"` | `"active"` | `"active"` shows dots only on scrub; `true` shows resting dots; `false` hides dots. |
| `connectNulls` | `boolean` | `false` | Connects line segments across `null`/`undefined` gaps when `true`. |
| `showLabels` | `boolean` | `false` | Renders direct SVG value labels above data points. |
| `formatLabel` | `(value: number, datum: TDatum, series: ChartSeries<TDatum>) => string` | Series/axis format | Custom direct value label formatter. |

#### `AreaChart` Specific Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `ChartAreaMode` | `"overlay"` | `"overlay"` (overlapping) or `"stacked"` (cumulative; defaults `showTotal` to `true`). |
| `curve` | `ChartCurve` | `"monotone"` | Interpolation: `"linear" \| "monotone" \| "step"`. |
| `gradient` | `boolean` | `true` | Uses a vertical linear gradient fill when `true`, or flat tinted fill when `false`. |
| `showLine` | `boolean` | `true` | Draws crisp top stroke along each area series. |
| `strokeWidth` | `number` | CSS token | Top stroke width override in pixels. |
| `showDots` | `boolean \| "active"` | `"active"` | Resting/active point dot visibility. |
| `connectNulls` | `boolean` | `false` | Bridges `null`/`undefined` gaps. |

#### `BarChart` Specific Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `orientation` | `ChartOrientation` | `"vertical"` | `"vertical"` (columns) or `"horizontal"` (horizontal bars). |
| `mode` | `ChartBarMode` | `"grouped"` | `"grouped"` or `"stacked"`. Named `series[].stack` keys enable Grouped + Stacked bars in either mode. |
| `radius` | `number` | CSS token | Outer cap corner radius in pixels (clamped automatically). |
| `maxBarWidth` | `number` | CSS token | Maximum bar thickness cap in pixels. |
| `barGap` | `number` | CSS token | Pixel gap between adjacent grouped bars/stacks within a category. |
| `minBarLength` | `number` | `2` | Minimum pixel length for non-zero values so tiny bars remain visible. |
| `segmentGap` | `number` | `1.5` | Pixel gap between stacked segments. |
| `valueLabels` | `boolean \| "none" \| "outside" \| "inside" \| "both"` | `"none"` | Direct bar value labels (`true` aliases `"outside"`, `"both"` shows inside segment labels + outside stack totals). |
| `insideLabelOrientation` | `"auto" \| "horizontal" \| "vertical"` | `"auto"` | Controls rotation of inside labels on narrow vertical bars. |
| `formatLabel` | `(value: number, datum: TDatum, series: ChartSeries<TDatum>) => string` | Series/axis format | Custom bar value label formatter. |
| `labelLayout` | `"gutter" \| "above"` | `"gutter"` | Horizontal bar category placement (`"above"` puts full-width labels above each bar and hides the left Y gutter). |

#### `ComposedChart` Specific Props

Combines `"bar"`, `"area"`, and `"line"` series (declared via `series[].type`, defaulting to `"line"`) with deterministic layer ordering (band fills -> area fills -> bars -> area strokes -> lines -> reference lines -> band labels -> annotations -> axes -> crosshair).

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `curve` | `ChartCurve` | `"monotone"` | Curve interpolation for line and area series. |
| `barMode` | `ChartBarMode` | `"grouped"` | Stacking mode for `"bar"` series (`"grouped" \| "stacked"`). |
| `areaMode` | `ChartAreaMode` | `"overlay"` | Stacking mode for `"area"` series (`"overlay" \| "stacked"`). |
| `strokeWidth` | `number` | CSS token | Line/area stroke width override. |
| `showDots` | `boolean \| "active"` | `"active"` | Dot display mode for line/area series. |
| `connectNulls` | `boolean` | `false` | Bridges null gaps in line/area series. |
| `gradient` | `boolean` | `true` | Vertical gradient fill for `"area"` series. |
| `showAreaLine` | `boolean` | `true` | Draws top stroke on `"area"` series. |
| `barRadius` / `maxBarWidth` / `barGap` / `minBarLength` / `segmentGap` / `valueLabels` | See `BarChart` | See `BarChart` | Bar geometry and value label controls for `"bar"` series. |

#### `DonutChart` Props

Extends `Omit<HTMLAttributes<HTMLElement>, "children" | "title" | "color">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ChartVariant` | Yes | — | Surface variant: `"elevated" \| "soft" \| "sunken" \| "transparent"`. |
| `size` | `ChartSize` | Yes | — | Density scale: `"sm" \| "md" \| "lg"`. |
| `data` | `readonly TDatum[]` | Yes | — | Source slice dataset (non-positive values are ignored). |
| `value` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| null \| undefined)` | Yes | — | Numeric slice value key or extractor. |
| `name` | `keyof TDatum \| ((datum: TDatum, index: number) => string)` | Yes | — | Slice label key or extractor. |
| `color` / `tone` | `keyof TDatum \| ((datum: TDatum, index: number) => ...)` | No | `undefined` | Optional per-slice CSS color or semantic `ChartTone` extractor. |
| `innerRadiusRatio` | `number` | No | `0.68` | Inner hole ratio (`0` = full Pie with `1.5px` slice seams; `>= 0.42` shows center KPI readout). |
| `gap` | `number` | No | `0` | Visual gap in pixels between slices (auto-computes `cornerRadius` when `gap > 0` and `innerRadiusRatio > 0`). |
| `padAngle` | `number` | No | Derived from `gap` | Explicit angular padding in radians between slices. |
| `cornerRadius` | `number` | No | Auto (`0` if seamless, up to `4` when gapped) | Arc corner rounding in pixels. |
| `hoverExpand` | `number` | No | `3` | Radial expansion in pixels on slice hover/focus. |
| `sort` | `boolean` | No | `false` | Sorts slices descending by value when `true`. |
| `centerMode` | `"auto" \| "total" \| "active"` | No | `"auto"` | Center readout behavior: `"auto"` shows total while hovering slices (tooltip handles slice detail) and active slice on legend hover or when tooltip is disabled; `"total"` locks to total; `"active"` always morphs to hovered slice. |
| `centerLabel` / `centerValue` | `string` / `number \| string` | No | `"Total"` / sum | Override center KPI label and resting value. |
| `center` | `Snippet<[ChartDonutCenterContext<TDatum>]>` | No | `undefined` | Custom center HTML snippet (`{ total, activeSlice, slices, formatValue }`). |
| `numberFormat` / `locales` / `formatValue` | `NumberMorphFormat` / `Intl.LocalesArgument` / `(value, datum?) => string` | No | Default tick format | Formatting for center `NumberMorph` and tooltip values. |
| `valueLabels` | `boolean` | No | `false` | Renders percentage labels inside sufficiently wide slices. |
| `legend` | `ChartLegendPosition` | No | `"end"` | `"top" \| "bottom" \| "end" \| "none"` (includes live percentage shares). |
| `tooltip` | `boolean \| Snippet<[ChartDonutTooltipContext<TDatum>]>` | No | `true` | Top-layer slice tooltip or custom snippet (`{ slice, total, formattedValue, formattedShare }`). |
| `tooltipMode` | `ChartTooltipMode` | No | `"item"` | `"item" \| "axis" \| "none"` (`"none"` disables tooltip). |
| `palette` / `monotone` | `ChartPalette` / `ChartMonotoneHue` | No | `"categorical"` / `undefined` | Slice color palette or monotone single-hue ramp. |
| `title` / `description` / `actions` | `string` / `string` / `Snippet` | No | `undefined` | Optional outer header chrome. |
| `height` / `aspectRatio` | `number \| string` / `string` | No | Size token | Stage height or CSS `aspect-ratio`. |
| `loading` / `empty` / `emptyTitle` / `emptyDescription` | `boolean` / `boolean` / `string` / `string` | No | `false` / auto | Donut loading silhouette and empty/all-hidden state. |
| `interactive` | `boolean` | No | `true` | Enables slice hover, keyboard stepping, and legend slice toggling. |
| `onSliceClick` | `(datum: TDatum, index: number, slice: ChartArcItem<TDatum>) => void` | No | `undefined` | Fired on slice click or `Enter`/`Space`. |
| `hiddenSliceIds` / `activeIndex` / `hoveredSliceId` | `readonly string[]` / `number \| null` / `string \| null` | No | `[]` / `null` / `null` | `$bindable` slice visibility and highlight state. |
| `ref` / `svgRef` / `label` / `labelledBy` / `children` | See base | No | — | Element bindings, ARIA label, and extra SVG layers inside the polar `<svg>`. |

---

### Tier-1 Composable Primitives

All DOM/SVG primitives expose `ref = $bindable(null)` and forward `{...rest}` attributes.

#### Shell & Header Chrome

- **`Chart<TDatum>`**: Root `<figure class="cs-chart">`. **Required:** `variant`, `size`. Optional: `palette` (`"categorical"`), `monotone`, `state` (external `ChartState<TDatum>`), `data`, `x`, `xScaleType`, `preferBandX`, `series`, `xAxis`, `yAxis`, `y2Axis`, `orientation`, `stacked`, `margin`, `$bindable hiddenSeriesIds`, `$bindable activeIndex`, `$bindable hoveredSeriesId`, `tooltipMode`, `loading`, `empty`, `label`, `labelledBy`, `children`. Participates in `createSurfaceRadius` for automatic concentric nesting.
- **`ChartHeader`**: `<div class="cs-chart-header">` grid layout pairing title/description with optional `ChartActions`.
- **`ChartTitle`**: `<svelte:element this={as} class="cs-chart-title">` (`as?: "h2" | "h3" | "h4" | "h5" | "h6" | "div"`, default `"h3"`).
- **`ChartDescription`**: `<p class="cs-chart-description">`.
- **`ChartActions`**: `<div class="cs-chart-actions">` trailing header controls container.

#### Plot Stage & HTML Chrome

- **`ChartCanvas<TDatum>`**: Responsive `ResizeObserver` plot container and `<svg class="cs-chart-svg">` host with pointer bisector and keyboard scrubbing. Props: `svgRef = $bindable(null)`, `height`, `aspectRatio`, `interactive` (`true`), `orientation`, `margin`, `label`, `labelledBy`, `onPointClick`, `children` (SVG layers), `overlay` (HTML overlay slot).
- **`ChartLegend`**: Interactive series toggle bar. Props: `position?: "top" | "bottom" | "end"` (`"top"`), `align?: "start" | "center" | "end"` (`"start"`), `interactive?: boolean` (`true`), `marker?: "auto" | "line" | "bar" | "dot" | "dashed"` (`"auto"`), `children`.
- **`ChartTooltip<TDatum>`**: Top-layer `popover="manual"` GPU-translated floating readout. Props: `showTotal` (`false`), `morph` (`true`, renders `<NumberMorph>` for numeric values), `formatX`, `formatTotal`, `numberFormat`, `locales`, `offset` (`12`), `children?: Snippet<[ChartTooltipContext<TDatum>]>`.
- **`ChartOverlay`**: Plot-box-aligned HTML overlay (`pointer-events: none` on wrapper; interactive children opt in).
- **`ChartEmpty`**: Calm empty state with subtle gridline backdrop and automatic one-click `"Show all"` reset button when all series are hidden. Props: `title`, `description`, `hideReset` (`false`), `onReset`, `children`.
- **`ChartLoading`**: Shimmering SVG silhouette skeleton. Props: `shape?: "bars" | "line" | "donut"` (`"bars"`), `label`, `children`.

#### SVG Layer Primitives (Rendered Inside `<ChartCanvas>`)

- **`ChartGrid`**: Horizontal/vertical hairlines and emphasized zero baseline. Props: `horizontal` (`true`), `vertical` (`false`), `zeroLine?: boolean | "solid" | "dashed" | "strong"` (`true`), `tickCount`.
- **`ChartAxis`**: X / Y / Y2 axes with smart tick thinning, truncation, rotation, and wrapping. **Required:** `position: "bottom" | "left" | "right"`. Optional: `label`, `tickCount`, `format`, `tickAngle`, `wrapTicks`, `maxTickWidth`, `hideLine`. Syncs prop overrides back to `ChartState` for dynamic margin computation.
- **`ChartLine<TDatum>`**: SVG line series layer. Props: `seriesId`, `seriesIds`, `curve` (`"monotone"`), `strokeWidth`, `dashed`, `connectNulls` (`false`), `showDots` (`"active"`), `showLabels` (`false`), `formatLabel`.
- **`ChartArea`**: SVG area fill + optional top stroke layer. Props: `seriesId`, `seriesIds`, `mode` (`"overlay"`), `part?: "all" | "fill" | "line"` (`"all"`), `curve` (`"monotone"`), `gradient` (`true`), `showLine` (`true`), `strokeWidth`, `dashed`, `connectNulls` (`false`), `showDots` (`"active"`).
- **`ChartBar<TDatum>`**: SVG column/horizontal bar layer (grouped, stacked, grouped+stacked, diverging negative). Props: `seriesId`, `seriesIds`, `mode` (`"grouped"`), `radius`, `maxBarWidth`, `barGap`, `minBarLength` (`2`), `segmentGap` (`1.5`), `valueLabels` (`"none"`), `insideLabelOrientation` (`"auto"`), `formatLabel`, `labelLayout` (`"gutter"`).
- **`ChartArc<TDatum>`**: Pure SVG polar arc layer usable standalone or inside `DonutChart`. Props: `slices`, `data`, `value`, `name`, `color`, `tone`, `width`, `height`, `innerRadiusRatio` (`0.68`), `gap` (`0`), `padAngle`, `cornerRadius`, `hoverExpand` (`3`), `sort` (`false`), `valueLabels` (`false`), `formatValue`, `interactive` (`true`), `activeIndex`, `hoveredSliceId`, `onSliceHover`, `onSliceClick`.
- **`ChartCrosshair`**: Active hairline rule, category hover band, and active point rings. Props: `vertical`, `horizontal`, `band`, `showDots` (`true`).
- **`ChartReferenceLine`**: Dashed/solid threshold line with inline SVG label pill. **Required:** `value`. Optional: `axis` (`"y"`), `label`, `labelPosition` (`"end"`), `tone`, `color`, `dashed` (`true`).
- **`ChartReferenceBand`**: Tinted target corridor with edge lines and corner tag. **Required:** `from`, `to`. Optional: `axis` (`"y"`), `part?: "all" | "fill" | "label"` (`"all"`), `label`, `tone`, `color`.
- **`ChartAnnotation`**: Pure-SVG data-coordinate callout (anchor dot + halo + leader + pill). **Required:** `x`, `y`, `label`. Optional: `yAxis` (`"left"`), `dx` (`0`), `dy` (`-32`), `tone`, `color`.

---

### `ChartState<TDatum>` & Context Helpers

- `getChartContext<TDatum>(): ChartState<TDatum>` — Reads the nearest ancestor `Chart` state (throws if called outside `<Chart>`).
- `setChartContext<TDatum>(state: ChartState<TDatum>): ChartState<TDatum>` — Provides a `ChartState` instance to descendants.
- `hasChartContext(): boolean` — Safely checks whether a `ChartContext` is present.
- `resolveSeriesColor(seriesItem, slotIndex, palette?, monotone?): string` / `resolveToneColor(tone): string` — Resolve CSS color strings using the built-in palette rules.

Key reactive getters and methods on `ChartState<TDatum>`:

| Member | Type | Description |
| :--- | :--- | :--- |
| `data` / `series` / `visibleSeries` | `readonly TDatum[]` / `readonly ChartSeries[]` | Source dataset, registered series, and currently visible series. |
| `leftSeries` / `rightSeries` / `hasY2Axis` | `readonly ChartSeries[]` / `boolean` | Series partitioned by `yAxis` and whether secondary axis is active. |
| `margins` / `plotWidth` / `plotHeight` / `hasSize` | `ChartMargins` / `number` / `boolean` | Dynamically measured margins and inner SVG plot box dimensions. |
| `xScale` / `yScale` / `y2Scale` | `ChartXScale` / `ChartNumericScale` / `ChartNumericScale \| null` | Encapsulated scale objects (`scale`, `center`, `invert`, `ticks`, `domain`, `range`, `bandwidth`, `crossesZero`, `baseline`). |
| `activeIndex` / `activeSeriesId` / `activeAnchor` / `scrubbing` | `number \| null` / `string \| null` / `ChartActiveAnchor \| null` / `boolean` | Current scrubbed datum, item-mode focused series, viewport/plot anchor coordinates, and active scrub state. |
| `hiddenSeriesIds` / `hoveredSeriesId` / `isEmpty` / `allSeriesHidden` | State & derived booleans | Series visibility, legend/mark isolation, and empty-state flags. |
| `setActiveIndex(i)` / `stepActiveIndex(delta)` / `setActiveSeries(id)` / `setHoveredSeries(id)` | Methods | Imperatively control scrubbing and series isolation. |
| `toggleSeries(id)` / `showAllSeries()` / `isSeriesHidden(id)` / `isSeriesDimmed(id)` | Methods | Toggle and query series visibility and dimming state. |
| `getSeriesColor(id)` / `extractX(datum, i)` / `extractSeriesValue(series, datum, i)` / `getTooltipContext(i?)` | Methods | Color resolution, datum extraction, and structured tooltip payload generation. |

---

### Color Palettes

| Mode | Configuration | Token Mapping |
| :--- | :--- | :--- |
| **Categorical** _(default)_ | `palette="categorical"` | 10 ordered OKLCH slots (`--cs-chart-series-1`..`10`): Accent, Teal, Amber, Violet, Rose, Sky, Emerald, Orange, Fuchsia, Slate. Calibrated `500`–`550` in light mode and `400`–`450` in dark mode (`>= 3:1` WCAG 1.4.11 contrast). |
| **Monotone** | `monotone="accent" \| "blue" \| "slate" \| "emerald" \| "teal" \| "violet" \| "amber" \| "rose"` | 6 interleaved lightness steps (`--cs-chart-series-1`..`6`) so 2–6 series maintain crisp perceptual separation (Light: `550 → 300 → 700 → 400 → 200 → 800`; Dark: `400 → 600 → 300 → 500 → 700 → 200`; `slate` shifts for neutral gray contrast). |
| **Semantic** | `palette="semantic"` or `tone="positive" \| "caution" \| "negative"` | `--cs-chart-positive`, `--cs-chart-caution`, `--cs-chart-negative` (plus `-soft` and `-fg` pairs for pills/bands), derived directly from `color-semantics.css`. |

---

### `data-*` Attributes

- **`.cs-chart` (`<figure>`):** `data-variant`, `data-size`, `data-palette`, `data-monotone`, `data-nested`, `data-loading`, `data-empty`, `data-scrubbing`.
- **`.cs-chart-series` / `.cs-chart-bar-rect` / `.cs-chart-arc-slice`:** `data-series-id`, `data-dimmed`, `data-active`, `data-orientation`, `data-tooltip-mode`.
- **`.cs-chart-arc`:** `data-pie` (when `innerRadiusRatio === 0`), `data-single` (single visible slice).
- **`.cs-chart-legend` / `.cs-chart-legend-item`:** `data-position`, `data-align`, `data-hidden`, `data-active`, `data-static`.
- **`.cs-chart-tooltip`:** `data-open`, `data-gliding`, `data-side="start" | "end"`.
- **`.cs-chart-grid-zero`:** `data-style="solid" | "dashed" | "strong"`.
- **`.cs-chart-ref-line` / `.cs-chart-ref-band` / `.cs-chart-annotation`:** `data-tone`, `data-custom-color`.
- **`.cs-chart-loading`:** `data-shape="bars" | "line" | "donut"`.

---

### CSS Custom Properties

| Variable | Description |
| :--- | :--- |
| `--cs-chart-bg` / `--cs-chart-fg` / `--cs-chart-shadow` | Shell surface fill, primary text (`--cs-color-text-main`), and elevation shadow. |
| `--cs-chart-backdrop-bg` / `--cs-chart-point-ring-bg` | Backing color for `transparent`/`soft` shells and opaque SVG cutout rings (point halos, stacked bar gaps, pie seams). |
| `--cs-chart-padding` / `--cs-chart-gap` / `--cs-chart-plot-height` | Shell padding (`12px`/`16px`/`24px`), section gap (`8px`/`12px`/`16px`), and default plot height (`180px`/`260px`/`340px`). |
| `--cs-chart-radius` / `--cs-chart-squircle` / `--cs-chart-nested-radius` | Outer squircle radius (`16px`/`24px`/`28px`, or concentric nested radius when `[data-nested]`). |
| `--cs-chart-title-fg` / `--cs-chart-subtitle-fg` / `--cs-chart-tick-fg` / `--cs-chart-label-fg` / `--cs-chart-inside-label-fg` | Typography colors across HTML header, SVG axis ticks, outside labels, and contrast-safe inside labels. |
| `--cs-chart-title-size` / `--cs-chart-subtitle-size` / `--cs-chart-tick-size` / `--cs-chart-value-label-size` / `--cs-chart-legend-font-size` | Size-scaled font sizes across shell header, ticks, direct labels, and legend. |
| `--cs-chart-center-value-size` / `--cs-chart-center-value-lh` / `--cs-chart-center-label-size` | `DonutChart` center KPI readout scale (`22px`/`26px`/`32px`). |
| `--cs-chart-grid` / `--cs-chart-axis` / `--cs-chart-zero-line` / `--cs-chart-zero-line-strong` | Structural gridline, axis hairline, and zero-baseline stroke colors. |
| `--cs-chart-crosshair` / `--cs-chart-hover-band` / `--cs-chart-dim-opacity` | Scrubbing hairline, bar category hover band, and sibling series dim opacity (`0.24`). |
| `--cs-chart-series-1` .. `--cs-chart-series-10` | Resolved categorical or monotone series color slots (overridable per instance). |
| `--cs-chart-positive` / `--cs-chart-caution` / `--cs-chart-negative` (and `-soft` / `-fg`) | Semantic status mark, pill, and reference band tokens. |
| `--cs-chart-stroke-width` / `--cs-chart-point-radius` / `--cs-chart-bar-radius` / `--cs-chart-bar-max-width` / `--cs-chart-bar-group-gap` | Mark geometry tokens scaled by `size`. |
| `--cs-chart-area-top-opacity` / `--cs-chart-area-bottom-opacity` / `--cs-chart-area-stacked-top-opacity` / `--cs-chart-area-stacked-bottom-opacity` / `--cs-chart-ref-band-opacity` | Area gradient and reference band fill opacities (automatically stepped up in dark mode). |
| `--cs-chart-tooltip-bg` / `--cs-chart-tooltip-shadow` / `--cs-chart-tooltip-radius` / `--cs-chart-tooltip-padding` | Floating top-layer tooltip surface and spacing. |
| `--cs-chart-dur-draw` / `--cs-chart-dur-bar` / `--cs-chart-dur-arc` / `--cs-chart-dur-update` / `--cs-chart-dur-scrub` / `--cs-chart-ease-data` / `--cs-chart-ease-draw` | Scoped data-draw, bar growth, arc sweep, update, and tooltip scrub choreography tokens. |

## Examples

### LineChart

```svelte
<script lang="ts">
    import { LineChart, type ChartSeries } from "cs/svelte/charts";

    const data = [
        { date: new Date(2026, 0, 1), actual: 410, forecast: 405 },
        { date: new Date(2026, 1, 1), actual: 438, forecast: 432 },
        { date: new Date(2026, 2, 1), actual: null, forecast: 460 },
        { date: new Date(2026, 3, 1), actual: 495, forecast: 488 },
    ];

    const series: ChartSeries<(typeof data)[number]>[] = [
        { id: "actual", label: "Actual ARR" },
        { id: "forecast", label: "Forecast", dashed: true },
    ];
</script>

<LineChart
    variant="elevated"
    size="md"
    title="Annual Recurring Revenue"
    description="Monthly actuals vs. baseline forecast ($k)"
    {data}
    x="date"
    {series}
    curve="monotone"
    height={280}
/>
```

### AreaChart (Stacked)

```svelte
<script lang="ts">
    import { AreaChart, type ChartSeries } from "cs/svelte/charts";

    const data = [
        { date: new Date(2026, 0, 1), enterprise: 320, growth: 180, starter: 95 },
        { date: new Date(2026, 1, 1), enterprise: 348, growth: 196, starter: 102 },
        { date: new Date(2026, 2, 1), enterprise: 382, growth: 215, starter: 114 },
    ];

    const series: ChartSeries<(typeof data)[number]>[] = [
        { id: "enterprise", label: "Enterprise" },
        { id: "growth", label: "Growth" },
        { id: "starter", label: "Starter" },
    ];
</script>

<AreaChart
    variant="elevated"
    size="md"
    title="Cloud Usage"
    description="Monthly compute units by tier"
    {data}
    x="date"
    {series}
    mode="stacked"
    height={280}
/>
```

### BarChart (Grouped + Stacked via `stack`)

```svelte
<script lang="ts">
    import { BarChart, type ChartSeries } from "cs/svelte/charts";

    const data = [
        { quarter: "Q1", planCloud: 280_000, planServices: 140_000, actualCloud: 310_000, actualServices: 155_000 },
        { quarter: "Q2", planCloud: 320_000, planServices: 160_000, actualCloud: 345_000, actualServices: 148_000 },
    ];

    const series: ChartSeries<(typeof data)[number]>[] = [
        { id: "planCloud", label: "Plan Cloud", stack: "plan" },
        { id: "planServices", label: "Plan Services", stack: "plan" },
        { id: "actualCloud", label: "Actual Cloud", stack: "actual" },
        { id: "actualServices", label: "Actual Services", stack: "actual" },
    ];
</script>

<BarChart
    variant="elevated"
    size="md"
    title="Plan vs. Actual"
    {data}
    x="quarter"
    {series}
    valueLabels="both"
    height={300}
/>
```

### ComposedChart (Dual Y-Axis + Overlays)

```svelte
<script lang="ts">
    import {
        ComposedChart,
        type ChartAnnotationConfig,
        type ChartReferenceBandConfig,
        type ChartReferenceLineConfig,
        type ChartSeries,
    } from "cs/svelte/charts";

    const data = [
        { month: "Apr", revenue: 296_000, costs: 91_800, marginPct: 69 },
        { month: "May", revenue: 338_000, costs: 98_000, marginPct: 71 },
        { month: "Jun", revenue: 395_000, costs: 106_700, marginPct: 73 },
    ];

    const series: ChartSeries<(typeof data)[number]>[] = [
        { id: "revenue", label: "Revenue", type: "bar" },
        { id: "costs", label: "Direct Costs", type: "area" },
        { id: "marginPct", label: "Gross Margin", type: "line", yAxis: "right" },
    ];

    const referenceBands: ChartReferenceBandConfig[] = [
        { axis: "y2", from: 68, to: 74, tone: "positive", label: "Target SLA" },
    ];

    const referenceLines: ChartReferenceLineConfig[] = [
        { axis: "y", value: 320_000, tone: "caution", label: "Budget $320k", labelPosition: "start" },
    ];

    const annotations: ChartAnnotationConfig[] = [
        { x: "Jun", y: 395_000, yAxis: "left", dx: 0, dy: -34, tone: "accent", label: "Enterprise Launch" },
    ];
</script>

<ComposedChart
    variant="elevated"
    size="md"
    title="Revenue & Margin"
    {data}
    x="month"
    {series}
    {referenceBands}
    {referenceLines}
    {annotations}
    yAxis={{ domain: [0, 480_000], label: "Revenue ($)" }}
    y2Axis={{ domain: [50, 80], label: "Gross Margin", format: (v) => `${v}%` }}
    height={320}
/>
```

### DonutChart (Donut, Full Pie, `gap` & `centerMode`)

```svelte
<script lang="ts">
    import { DonutChart } from "cs/svelte/charts";

    const data = [
        { segment: "Enterprise", revenue: 1_420_000 },
        { segment: "Mid-Market", revenue: 890_000 },
        { segment: "Self-Serve", revenue: 540_000 },
    ];
</script>

<!-- Donut with slice gaps and auto center readout -->
<DonutChart
    variant="elevated"
    size="md"
    title="Revenue by Segment"
    {data}
    name="segment"
    value="revenue"
    gap={4}
    centerMode="auto"
    centerLabel="Total ARR"
    numberFormat={{ style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }}
    locales="en-US"
    legend="end"
    height={280}
/>

<!-- Full Pie via innerRadiusRatio={0} -->
<DonutChart
    variant="soft"
    size="sm"
    {data}
    name="segment"
    value="revenue"
    innerRadiusRatio={0}
    valueLabels
    legend="bottom"
/>
```

### Custom SVG Layer Composition (`getChartContext()`)

Drop any custom SVG component directly inside a Tier-2 chart's `children` or a Tier-1 `<ChartCanvas>` to read live scales, margins, and scrubbing state:

```svelte
<!-- PeakMarkerLayer.svelte -->
<script lang="ts">
    import { getChartContext } from "cs/svelte/charts";

    interface Props {
        x: string | number | Date;
        y: number;
    }

    let { x, y }: Props = $props();
    const chart = getChartContext();

    const cx = $derived(Math.round(chart.xScale.center(x)));
    const cy = $derived(Math.round(chart.yScale.scale(y)));
</script>

{#if chart.hasSize}
    <g class="pointer-events-none" aria-hidden="true">
        <circle {cx} {cy} r="7" fill="var(--cs-chart-positive)" opacity="0.2" />
        <circle {cx} {cy} r="3.5" fill="var(--cs-chart-positive)" stroke="var(--cs-chart-point-ring-bg)" stroke-width="2" />
    </g>
{/if}
```

```svelte
<LineChart variant="elevated" size="md" {data} x="month" {series}>
    <PeakMarkerLayer x="Jun" y={748} />
</LineChart>
```

## Behavior & Quirks

- **Tooltip Modes & Top-Layer Positioning:**
  - `tooltipMode="axis"` _(default on Cartesian charts)_ snaps to the nearest X-index via bisector lookup and lists all visible series at that point. `tooltipMode="item"` _(default on `DonutChart`)_ tracks only the actively hovered bar/series/slice and dims siblings. `tooltipMode="none"` disables tooltip rendering completely.
  - `ChartTooltip` renders inside a native `popover="manual"` element so it is never clipped by parent `Card` or `ScrollArea` `overflow: clip`. Positioning uses cached SVG bounds and integer-snapped `translate3d(x, y, 0)` with instant placement on first open (never flying in from `(0, 0)`), smooth `--cs-chart-dur-scrub` gliding while open, and `16px` flip hysteresis at viewport edges.
  - Numeric readouts render directly via `<NumberMorph willChange={false} respectMotionPreference={true} />` unless a custom string formatter or `morph={false}` is provided.
- **Keyboard Scrubbing & Interactive Legend:**
  - When `interactive` is `true`, `.cs-chart-canvas` (and `.cs-chart-polar-stage` on `DonutChart`) is focusable (`tabindex="0"`). `ArrowLeft`/`ArrowRight` (and `ArrowUp`/`ArrowDown` on horizontal bars and donuts) step `activeIndex`, `Home`/`End` jump to ends, `Escape` clears scrubbing, and `Enter`/`Space` fires `onPointClick`/`onSliceClick`. Live updates are announced through a visually hidden `aria-live="polite"` region.
  - Clicking a `ChartLegend` button toggles that series in `hiddenSeriesIds` (`aria-pressed`), while hovering or focusing isolates that series and dims siblings to `--cs-chart-dim-opacity`. When all series are toggled off, `ChartEmpty` displays a localized one-click `"Show all"` reset button.
- **Export Readiness & Crisp SVG Geometry:**
  - Everything inside `<svg>` is 100% native vector SVG (`<path>`, `<rect>`, `<line>`, `<circle>`, `<text>`, `<tspan>`) with **zero `<foreignObject>`** and **zero `<filter>` drop shadows**, ensuring crisp rendering at any DPR, print scale, or SVG/PNG export.
  - Straight 1px hairlines snap to `Math.floor(v) + 0.5` (`shape-rendering="crispEdges"`); bars, hover bands, and `<text>` coordinates snap to integer pixels. Dynamic margins are measured via cached offscreen `CanvasRenderingContext2D.measureText()` with zero DOM reflow.
- **Reduced Motion & Theme Switching:**
  - CSS animations and transitions defer to global `prefers-reduced-motion: reduce` and `[data-theme-switching]` rules in `motion.css`. `<NumberMorph>` receives `respectMotionPreference={true}` so digits snap without rolling when reduced motion is enabled.
- **Data Edge Cases:**
  - `null`, `undefined`, and non-finite values break line/area paths cleanly (`connectNulls={false}` default) and display `—` in tooltips.
  - Negative stacked bars use `stackOffsetDiverging` so positive values stack upward from `0` and negative values stack downward from `0`, automatically emphasizing the zero baseline.
  - `ChartCanvas` guards SVG mark rendering until `width > 0 && height > 0`, safely handling SSR and initially hidden tabs without `NaN` coordinates.
