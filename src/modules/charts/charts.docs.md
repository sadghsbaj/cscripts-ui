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
  - ChartWaterfall
  - ChartBullet
  - ChartHeatmap
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
  - Sparkline
  - WaterfallChart
  - BulletChart
  - HeatmapChart
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
  - CHART_BAR_PATTERNS
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
  - CHART_WATERFALL_ROW_TYPES
  - CHART_WATERFALL_TOTAL_TONES
  - CHART_HEATMAP_MODES
  - CHART_HEATMAP_RAMPS
  - CHART_LOADING_SHAPES
  - CHART_AREA_PARTS
  - CHART_REFERENCE_BAND_PARTS
  - CHART_DONUT_CENTER_MODES
  - CHART_SPARKLINE_TYPES
  - ChartVariant
  - ChartSize
  - ChartPalette
  - ChartMonotoneHue
  - ChartTone
  - ChartCurve
  - ChartOrientation
  - ChartBarMode
  - ChartBarPattern
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
  - ChartWaterfallRowType
  - ChartWaterfallTotalTone
  - ChartWaterfallBarKind
  - ChartHeatmapMode
  - ChartHeatmapRamp
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
  - ChartSparklineType
  - SparklineProps
  - ChartWaterfallItem
  - ChartWaterfallBar
  - ChartWaterfallTooltipContext
  - ChartWaterfallProps
  - WaterfallChartProps
  - ChartBulletRange
  - ChartBulletItem
  - ChartBulletRow
  - ChartBulletTooltipContext
  - ChartBulletProps
  - BulletChartProps
  - ChartHeatmapCellInput
  - ChartHeatmapCell
  - ChartHeatmapTooltipContext
  - ChartHeatmapProps
  - HeatmapChartProps
---

# Charts

## Overview

Responsive, pure-SVG data visualization system built on a two-tier architecture with borderless OKLCH surfaces, concentric squircle nesting, and top-layer floating tooltips:

- **Tier 2 — Batteries-Included Charts:** `LineChart`, `AreaChart`, `BarChart`, `ComposedChart`, `DonutChart` (which also covers full Pie charts via `innerRadiusRatio={0}`), `WaterfallChart`, `BulletChart`, `HeatmapChart`, and zero-chrome `Sparkline`. Built by composing Tier-1 primitives and accepting declarative overlays, custom `tooltip` snippets, and extra SVG `children` layers.
- **Tier 1 — Composable Primitives & Reactive Context:** `<Chart>`, `<ChartCanvas>`, SVG layers (`ChartGrid`, `ChartAxis`, `ChartLine`, `ChartArea`, `ChartBar`, `ChartArc`, `ChartWaterfall`, `ChartBullet`, `ChartHeatmap`, `ChartCrosshair`, `ChartReferenceLine`, `ChartReferenceBand`, `ChartAnnotation`), and HTML chrome (`ChartHeader`, `ChartLegend`, `ChartTooltip`, `ChartOverlay`, `ChartEmpty`, `ChartLoading`) connected through reactive `ChartState` and `getChartContext()`. Any custom Svelte SVG layer can call `getChartContext()` to share the exact same scales, margins, colors, and scrubbing state.

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
| `tone` | `ChartTone \| ((datum: TDatum, index: number) => ChartTone \| undefined)` | No | `undefined` | Static or per-datum semantic status override (`"base" \| "accent" \| "positive" \| "caution" \| "negative"`). |
| `color` | `string \| ((datum: TDatum, index: number) => string \| undefined)` | No | `undefined` | Static or per-datum explicit CSS color override (takes precedence over `tone` and `palette`). |
| `pattern` | `ChartBarPattern \| ((datum: TDatum, index: number) => ChartBarPattern \| undefined)` | No | `"solid"` | Static or per-datum IBCS scenario fill pattern (`"solid"` = Actual, `"hatch"` = Forecast, `"outline"` = Plan). |
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
| `selectable` | `boolean` | No | `false` | Enables click/keyboard toggle selection of `selectedIndex` with non-selected mark dimming. |
| `onPointClick` | `(datum: TDatum, index: number) => void` | No | `undefined` | Fired on click or `Enter`/`Space` while scrubbing a data point. |
| `hiddenSeriesIds` | `readonly string[]` | No | `undefined` | `$bindable` hidden series IDs. |
| `activeIndex` | `number \| null` | No | `undefined` | `$bindable` active scrubbed datum index. |
| `selectedIndex` | `number \| null` | No | `undefined` | `$bindable` pinned/selected datum index (toggled on click when `selectable={true}`). |
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
| `directLabels` | `boolean` | `false` | Renders collision-resolved end-of-series labels (`Series Name + Latest Value`) in the right margin gutter. |
| `formatLabel` | `(value: number, datum: TDatum, series: ChartSeries<TDatum>) => string` | Series/axis format | Custom direct value label formatter. |

#### `AreaChart` Specific Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `mode` | `ChartAreaMode` | `"overlay"` | `"overlay"` (overlapping), `"stacked"` (cumulative; defaults `showTotal` to `true`), or `"percent"` (`0%`–`100%` normalized stack with share readouts). |
| `curve` | `ChartCurve` | `"monotone"` | Interpolation: `"linear" \| "monotone" \| "step"`. |
| `gradient` | `boolean` | `true` | Uses a vertical linear gradient fill when `true`, or flat tinted fill when `false`. |
| `showLine` | `boolean` | `true` | Draws crisp top stroke along each area series. |
| `strokeWidth` | `number` | CSS token | Top stroke width override in pixels. |
| `showDots` | `boolean \| "active"` | `"active"` | Resting/active point dot visibility. |
| `connectNulls` | `boolean` | `false` | Bridges `null`/`undefined` gaps. |
| `directLabels` | `boolean` | `false` | Renders collision-resolved end-of-series labels in the right margin gutter. |

#### `BarChart` Specific Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `orientation` | `ChartOrientation` | `"vertical"` | `"vertical"` (columns) or `"horizontal"` (horizontal bars). |
| `mode` | `ChartBarMode` | `"grouped"` | `"grouped"`, `"stacked"`, or `"percent"` (`0%`–`100%` normalized stack). Named `series[].stack` keys enable Grouped + Stacked bars. |
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
| `barMode` | `ChartBarMode` | `"grouped"` | Stacking mode for `"bar"` series (`"grouped" \| "stacked" \| "percent"`). |
| `areaMode` | `ChartAreaMode` | `"overlay"` | Stacking mode for `"area"` series (`"overlay" \| "stacked" \| "percent"`). |
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
| `interactive` / `selectable` | `boolean` / `boolean` | No | `true` / `false` | Enables slice hover, keyboard stepping, legend toggling, and click-to-select slice pinning. |
| `onSliceClick` | `(datum: TDatum, index: number, slice: ChartArcItem<TDatum>) => void` | No | `undefined` | Fired on slice click or `Enter`/`Space`. |
| `hiddenSliceIds` / `activeIndex` / `selectedIndex` / `hoveredSliceId` | `readonly string[]` / `number \| null` / `number \| null` / `string \| null` | No | `[]` / `null` / `null` / `null` | `$bindable` slice visibility, active hover, selection, and highlight state. |
| `ref` / `svgRef` / `label` / `labelledBy` / `children` | See base | No | — | Element bindings, ARIA label, and extra SVG layers inside the polar `<svg>`. |

#### `Sparkline` Props

Zero-chrome micro-chart (`<div class="cs-chart-sparkline">`) designed to embed inside `KpiCardVisual`, table cells, and compact telemetry strips without `<Chart>` shell overhead. Extends `Omit<HTMLAttributes<HTMLDivElement>, "children" | "color">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `readonly TDatum[]` | Yes | — | Array of numbers (`number \| null \| undefined`) or datum objects. |
| `value` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| null \| undefined)` | No | Identity | Value extractor when `data` contains objects. |
| `type` | `ChartSparklineType` | No | `"line"` | Mark type: `"line" \| "area" \| "bar"`. |
| `curve` | `ChartCurve` | No | `"monotone"` | Line/area interpolation: `"linear" \| "monotone" \| "step"`. |
| `strokeWidth` | `number` | No | `1.5` | Stroke width in pixels for `"line"` and `"area"`. |
| `tone` | `ChartTone` | No | `"accent"` | Semantic color tone (`"base" \| "accent" \| "positive" \| "caution" \| "negative"`). |
| `color` | `string` | No | `undefined` | Explicit CSS color override. |
| `target` | `number` | No | `undefined` | Optional horizontal dashed reference threshold line. |
| `showEndDot` | `boolean` | No | `true` (`false` for `"bar"`) | Renders a resting dot on the last valid point of `"line"`/`"area"` sparklines. |
| `includeZero` | `boolean` | No | `false` (`true` for `"bar"`) | Forces Y domain to include `0`. |
| `domain` | `ChartAxisDomain` | No | `["auto", "auto"]` | Explicit Y domain bounds. |
| `interactive` | `boolean` | No | `false` | Enables lightweight pointer scrubbing, crosshair dot/bar highlight, and `onHover`. |
| `activeIndex` | `number \| null` | No | `null` | `$bindable` active scrubbed point index. |
| `onHover` | `(index: number \| null, value: number \| null, datum: TDatum \| null) => void` | No | `undefined` | Callback fired while scrubbing or leaving the sparkline. |
| `height` / `width` | `number \| string` | No | `32` / `"100%"` | Block and inline dimensions. |
| `label` | `string` | No | `undefined` | Accessible SVG `aria-label` (renders `aria-hidden="true"` when omitted and non-interactive). |
| `ref` / `svgRef` | `HTMLDivElement \| null` / `SVGSVGElement \| null` | No | `null` | `$bindable` root `<div>` and `<svg>` element references. |

#### `WaterfallChart` Props

Cumulative financial and operational bridge chart (`start`, positive/negative `delta`, `subtotal`, `total`). Extends `Omit<HTMLAttributes<HTMLElement>, "children" | "title" | "color" | "type">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ChartVariant` | Yes | — | Surface variant: `"elevated" \| "soft" \| "sunken" \| "transparent"`. |
| `size` | `ChartSize` | Yes | — | Density scale: `"sm" \| "md" \| "lg"`. |
| `data` | `readonly TDatum[]` | Yes | — | Ordered step dataset. |
| `x` | `keyof TDatum \| ((datum: TDatum, index: number) => ChartXValue)` | Yes | — | Step category label key or extractor. |
| `value` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| null \| undefined)` | Yes | — | Numeric step delta or total value (`subtotal`/`total` rows auto-compute from the running sum when `null`/`undefined`). |
| `type` | `keyof TDatum \| ((datum: TDatum, index: number) => ChartWaterfallRowType)` | No | `"delta"` | Row kind extractor: `"start" \| "delta" \| "subtotal" \| "total"`. |
| `color` / `tone` | `keyof TDatum \| ((datum: TDatum, index: number) => ...)` | No | Auto by kind | Optional per-step CSS color or semantic `ChartTone` override. |
| `pattern` | `ChartBarPattern \| ((datum: TDatum, index: number) => ChartBarPattern \| undefined)` | No | `"solid"` | Static or per-step IBCS fill pattern (`"solid" \| "hatch" \| "outline"`). |
| `connectors` | `boolean` | No | `true` | Draws crisp `1px` dashed horizontal connector lines bridging consecutive steps. |
| `valueLabels` | `boolean` | No | `true` | Renders formatted step values (`+` prefix on positive deltas) above/below each bar. |
| `formatLabel` | `(value: number, item: ChartWaterfallItem<TDatum>) => string` | No | `numberFormat` / axis format | Custom bar value label formatter. |
| `totalTone` | `ChartWaterfallTotalTone` | No | `"base"` | Color tone for `"start"`, `"subtotal"`, and `"total"` bars (`"base" \| "accent"`). |
| `radius` / `maxBarWidth` / `minBarLength` | `number` | No | CSS token / `2` | Bar corner rounding, maximum width cap, and minimum non-zero pixel height. |
| `numberFormat` / `locales` | `NumberMorphFormat` / `Intl.LocalesArgument` | No | `undefined` | Intl formatting for `NumberMorph` tooltip values, running totals, and default labels. |
| `legend` | `ChartLegendPosition` | No | `"top"` | `"top" \| "bottom" \| "end" \| "none"` (displays Increase / Decrease / Total key). |
| `tooltip` | `boolean \| Snippet<[ChartWaterfallTooltipContext<TDatum>]>` | No | `true` | Floating tooltip showing step delta + running total, or custom snippet. |
| `selectable` / `selectedIndex` / `activeIndex` / `onPointClick` | See Cartesian base | No | — | Interactive scrubbing and click-to-select step pinning. |
| `grid` / `xAxis` / `yAxis` / `referenceLines` / `referenceBands` / `annotations` | See Cartesian base | No | — | Axes, gridlines, and reference overlays. |
| `title` / `description` / `actions` / `height` / `aspectRatio` / `margin` / `loading` / `empty` | See Cartesian base | No | — | Header chrome, sizing, and state handling. |

#### `BulletChart` Props

Multi-row horizontal target-vs-actual KPI scorecard with 3-tier qualitative range backdrops, actual progress bar, comparative prior-period tick, and prominent target crossbar. Extends `Omit<HTMLAttributes<HTMLElement>, "children" | "title" | "color">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ChartVariant` | Yes | — | Surface variant: `"elevated" \| "soft" \| "sunken" \| "transparent"`. |
| `size` | `ChartSize` | Yes | — | Density scale: `"sm" \| "md" \| "lg"`. |
| `data` | `readonly TDatum[]` | Yes | — | Source KPI row dataset. |
| `label` | `keyof TDatum \| ((datum: TDatum, index: number) => string)` | Yes | — | Row metric label key or extractor. |
| `actual` | `keyof TDatum \| ((datum: TDatum, index: number) => number)` | Yes | — | Actual value key or extractor. |
| `target` | `keyof TDatum \| ((datum: TDatum, index: number) => number)` | Yes | — | Target benchmark value key or extractor. |
| `subtitle` / `unit` | `keyof TDatum \| ((datum: TDatum, index: number) => string \| undefined)` | No | `undefined` | Optional secondary label or unit suffix (e.g. `"%"`, `"t/h"`). |
| `comparative` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| null \| undefined)` | No | `undefined` | Optional prior-period / comparative benchmark marker value. |
| `ranges` | `keyof TDatum \| ((datum: TDatum, index: number) => readonly (number \| ChartBulletRange)[] \| undefined)` | No | Auto from `max` | Up to 3 qualitative range upper bounds (`[poor, satisfactory, good]`) or `ChartBulletRange` objects. |
| `max` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| undefined)` | No | Auto (`max(actual, target, ...ranges)`) | Explicit row scale maximum. |
| `tone` / `color` / `pattern` | Static or per-row extractor | No | `"accent"` / `"solid"` | Semantic tone (`"positive" \| "caution" \| "negative" \| "accent" \| "base"`), CSS color, or IBCS bar pattern. |
| `sharedScale` | `boolean` | No | `false` | Normalizes all rows to a single shared horizontal domain and renders a bottom axis when `true`. |
| `showReadout` / `showVariance` | `boolean` | No | `true` / `false` | Displays right-aligned `Actual / Target` readout column and optional signed variance delta. |
| `minBarLength` | `number` | No | `2` | Minimum pixel length for non-zero actual bars. |
| `formatValue` / `numberFormat` / `locales` | `(value, datum?) => string` / `NumberMorphFormat` / `Intl.LocalesArgument` | No | Default tick format | Formatting for readouts, axis ticks, and `NumberMorph` tooltips. |
| `tooltip` / `tooltipMode` | `boolean \| Snippet<[ChartBulletTooltipContext<TDatum>]>` / `ChartTooltipMode` | No | `true` / `"item"` | Floating tooltip showing Actual, Target, Variance (`Δ` and `%`), and Comparative values. |
| `selectable` / `selectedIndex` / `activeIndex` / `onRowClick` | `boolean` / `number \| null` / `number \| null` / `(datum, index, row) => void` | No | `false` / `null` / `null` / `undefined` | Keyboard/pointer row scrubbing and click-to-select row pinning. |
| `title` / `description` / `actions` / `height` / `loading` / `empty` / `interactive` | See base | No | — | Header chrome, intrinsic or fixed height, and state controls. |

#### `HeatmapChart` Props

2D categorical matrix (`x × y → value`) with sequential single-hue and diverging (`negative ↔ neutral ↔ positive`) OKLCH color ramps, contrast-safe cell value labels, continuous ramp legend with gliding active notch, and 2D keyboard navigation. Extends `Omit<HTMLAttributes<HTMLElement>, "children" | "title">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `ChartVariant` | Yes | — | Surface variant: `"elevated" \| "soft" \| "sunken" \| "transparent"`. |
| `size` | `ChartSize` | Yes | — | Density scale: `"sm" \| "md" \| "lg"`. |
| `data` | `readonly TDatum[]` | Yes | — | Flat cell dataset (missing `x × y` intersections automatically render as dashed empty cells). |
| `x` | `keyof TDatum \| ((datum: TDatum, index: number) => string \| number)` | Yes | — | Column category key or extractor. |
| `y` | `keyof TDatum \| ((datum: TDatum, index: number) => string \| number)` | Yes | — | Row category key or extractor. |
| `value` | `keyof TDatum \| ((datum: TDatum, index: number) => number \| null \| undefined)` | Yes | — | Cell numeric value key or extractor (`null`/`undefined` renders as an empty cell). |
| `xCategories` / `yCategories` | `readonly string[]` | No | Deduplicated order from `data` | Explicit column and row category order. |
| `mode` | `ChartHeatmapMode` | No | `"sequential"` | `"sequential"` (`min..max` → `0..1`) or `"diverging"` (symmetric around `pivot` → `0..0.5..1`). |
| `ramp` | `ChartHeatmapRamp` | No | `"accent"` (`"diverging"` when `mode="diverging"`) | Color ramp: `"accent" \| "teal" \| "emerald" \| "slate" \| "amber" \| "rose" \| "diverging"`. |
| `domain` | `readonly [number, number]` | No | Auto `[min, max]` | Explicit numeric color scale bounds. |
| `pivot` | `number` | No | `0` | Midpoint value for `mode="diverging"`. |
| `gap` / `radius` | `number` | No | Size token (`2`/`3`/`4`px, `3`/`4`/`6`px) | Pixel gap between cells and cell corner rounding. |
| `valueLabels` | `boolean` | No | `true` | Renders formatted values inside cells whenever the cell is wide/tall enough; automatically flips text to `--cs-chart-heatmap-cell-fg-invert` on intense cells (`t >= 0.56` or diverging extremes). |
| `formatValue` / `numberFormat` / `locales` | `(value, cell) => string` / `NumberMorphFormat` / `Intl.LocalesArgument` | No | Default tick format | Cell label, legend bound, and `<NumberMorph>` tooltip formatting. |
| `xAxis` / `yAxis` | `ChartAxisConfig` | No | `undefined` | Category axis formatting, title labels, truncation (`maxTickWidth`), and rotation (`tickAngle`). |
| `legend` | `ChartLegendPosition` | No | `"bottom"` | `"top" \| "bottom" \| "end" \| "none"` continuous color ramp legend with min/max bounds, diverging midpoint marker, and gliding active cell notch. |
| `tooltip` / `tooltipMode` | `boolean \| Snippet<[ChartHeatmapTooltipContext<TDatum>]>` / `ChartTooltipMode` | No | `true` / `"item"` | Floating top-layer tooltip (`Row · Column` header, cell color swatch, and `<NumberMorph>` value). |
| `selectable` / `selectedIndex` / `activeIndex` / `onCellClick` | `boolean` / `number \| null` / `number \| null` / `(cell, index) => void` | No | `false` / `null` / `null` / `undefined` | `$bindable` active/selected cell indices (`row * colCount + col`) and click handler. |
| `title` / `description` / `actions` / `height` / `aspectRatio` / `margin` / `loading` / `empty` / `interactive` | See base | No | — | Header chrome, intrinsic row-based height or fixed height, and state controls. |

---

### Tier-1 Composable Primitives

All DOM/SVG primitives expose `ref = $bindable(null)` and forward `{...rest}` attributes.

#### Shell & Header Chrome

- **`Chart<TDatum>`**: Root `<figure class="cs-chart">`. **Required:** `variant`, `size`. Optional: `palette` (`"categorical"`), `monotone`, `state` (external `ChartState<TDatum>`), `data`, `x`, `xScaleType`, `preferBandX`, `series`, `xAxis`, `yAxis`, `y2Axis`, `orientation`, `stacked`, `percent`, `directLabels`, `margin`, `$bindable hiddenSeriesIds`, `$bindable activeIndex`, `$bindable selectedIndex`, `selectable`, `$bindable hoveredSeriesId`, `tooltipMode`, `loading`, `empty`, `label`, `labelledBy`, `children`. Participates in `createSurfaceRadius` for automatic concentric nesting.
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

#### SVG Layer Primitives (Rendered Inside `<ChartCanvas>` or Custom `<svg>`)

- **`ChartGrid`**: Horizontal/vertical hairlines and emphasized zero baseline. Props: `horizontal` (`true`), `vertical` (`false`), `zeroLine?: boolean | "solid" | "dashed" | "strong"` (`true`), `tickCount`.
- **`ChartAxis`**: X / Y / Y2 axes with smart tick thinning, truncation, rotation, and wrapping. **Required:** `position: "bottom" | "left" | "right"`. Optional: `label`, `tickCount`, `format`, `tickAngle`, `wrapTicks`, `maxTickWidth`, `hideLine`. Syncs prop overrides back to `ChartState` for dynamic margin computation.
- **`ChartLine<TDatum>`**: SVG line series layer. Props: `seriesId`, `seriesIds`, `curve` (`"monotone"`), `strokeWidth`, `dashed`, `connectNulls` (`false`), `showDots` (`"active"`), `showLabels` (`false`), `directLabels` (`false`), `formatLabel`.
- **`ChartArea`**: SVG area fill + optional top stroke layer. Props: `seriesId`, `seriesIds`, `mode` (`"overlay" | "stacked" | "percent"`), `part?: "all" | "fill" | "line"` (`"all"`), `curve` (`"monotone"`), `gradient` (`true`), `showLine` (`true`), `strokeWidth`, `dashed`, `connectNulls` (`false`), `showDots` (`"active"`), `directLabels` (`false`).
- **`ChartBar<TDatum>`**: SVG column/horizontal bar layer (grouped, stacked, 100% percent, grouped+stacked, diverging negative, IBCS hatch/outline patterns). Props: `seriesId`, `seriesIds`, `mode` (`"grouped" | "stacked" | "percent"`), `radius`, `maxBarWidth`, `barGap`, `minBarLength` (`2`), `segmentGap` (`1.5`), `valueLabels` (`"none"`), `insideLabelOrientation` (`"auto"`), `formatLabel`, `labelLayout` (`"gutter"`).
- **`ChartArc<TDatum>`**: Pure SVG polar arc layer usable standalone or inside `DonutChart`. Props: `slices`, `data`, `value`, `name`, `color`, `tone`, `width`, `height`, `innerRadiusRatio` (`0.68`), `gap` (`0`), `padAngle`, `cornerRadius`, `hoverExpand` (`3`), `sort` (`false`), `valueLabels` (`false`), `formatValue`, `interactive` (`true`), `selectable` (`false`), `activeIndex`, `selectedIndex`, `hoveredSliceId`, `onSliceHover`, `onSliceClick`.
- **`ChartWaterfall<TDatum>`**: Pure SVG waterfall bridge layer usable inside `<ChartCanvas>`. Props: `value`, `type`, `color`, `tone`, `pattern`, `connectors` (`true`), `valueLabels` (`true`), `formatLabel`, `radius`, `maxBarWidth`, `minBarLength` (`2`), `totalTone` (`"base"`).
- **`ChartBullet<TDatum>`**: Pure SVG bullet scorecard layer usable standalone or inside `BulletChart`. Props: `items`, `data`, `label`, `subtitle`, `unit`, `actual`, `target`, `comparative`, `ranges`, `max`, `tone`, `color`, `pattern`, `width`, `size`, `sharedScale` (`false`), `showReadout` (`true`), `showVariance` (`false`), `minBarLength` (`2`), `formatValue`, `interactive` (`true`), `selectable` (`false`), `activeIndex`, `selectedIndex`, `onRowHover`, `onRowClick`.
- **`ChartHeatmap<TDatum>`**: Pure SVG 2D matrix cell layer usable standalone or inside `HeatmapChart`. Props: `cells`, `data`, `x`, `y`, `value`, `xCategories`, `yCategories`, `width`, `height`, `size`, `mode` (`"sequential"`), `ramp`, `domain`, `pivot` (`0`), `gap`, `radius`, `valueLabels` (`true`), `formatValue`, `interactive` (`true`), `selectable` (`false`), `activeCell`, `selectedCell`, `onCellHover`, `onCellClick`.
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
| `activeIndex` / `selectedIndex` / `activeSeriesId` / `activeAnchor` / `scrubbing` / `hasSelection` | `number \| null` / `number \| null` / `string \| null` / `ChartActiveAnchor \| null` / `boolean` / `boolean` | Current scrubbed datum, pinned selected datum, item-mode focused series, viewport/plot anchor coordinates, and interaction flags. |
| `hiddenSeriesIds` / `hoveredSeriesId` / `isEmpty` / `allSeriesHidden` | State & derived booleans | Series visibility, legend/mark isolation, and empty-state flags. |
| `setActiveIndex(i)` / `stepActiveIndex(delta)` / `setSelectedIndex(i)` / `toggleSelectedIndex(i)` / `setActiveSeries(id)` / `setHoveredSeries(id)` | Methods | Imperatively control scrubbing, click-to-select pinning, and series isolation. |
| `toggleSeries(id)` / `showAllSeries()` / `isSeriesHidden(id)` / `isSeriesDimmed(id)` | Methods | Toggle and query series visibility and dimming state. |
| `getSeriesColor(id)` / `getDatumColor(series, datum, i)` / `getDatumPattern(series, datum, i)` / `extractX(datum, i)` / `extractSeriesValue(series, datum, i)` / `getTooltipContext(i?)` | Methods | Per-series and per-datum color/pattern resolution, datum extraction, and structured tooltip payload generation. |

---

### Color Palettes

| Mode | Configuration | Token Mapping |
| :--- | :--- | :--- |
| **Categorical** _(default)_ | `palette="categorical"` | 10 ordered OKLCH slots (`--cs-chart-series-1`..`10`): Accent, Teal, Amber, Violet, Rose, Sky, Emerald, Orange, Fuchsia, Slate. Calibrated `500`–`550` in light mode and `400`–`450` in dark mode (`>= 3:1` WCAG 1.4.11 contrast). |
| **Monotone** | `monotone="accent" \| "blue" \| "slate" \| "emerald" \| "teal" \| "violet" \| "amber" \| "rose"` | 6 interleaved lightness steps (`--cs-chart-series-1`..`6`) so 2–6 series maintain crisp perceptual separation (Light: `550 → 300 → 700 → 400 → 200 → 800`; Dark: `400 → 600 → 300 → 500 → 700 → 200`; `slate` shifts for neutral gray contrast). |
| **Semantic** | `palette="semantic"` or `tone="positive" \| "caution" \| "negative"` | `--cs-chart-positive`, `--cs-chart-caution`, `--cs-chart-negative` (plus `-soft` and `-fg` pairs for pills/bands), derived directly from `color-semantics.css`. |

---

### `data-*` Attributes

- **`.cs-chart` (`<figure>`):** `data-variant`, `data-size`, `data-palette`, `data-monotone`, `data-nested`, `data-loading`, `data-empty`, `data-scrubbing`, `data-has-selection`.
- **`.cs-chart-series` / `.cs-chart-bar-rect` / `.cs-chart-arc-slice` / `.cs-chart-waterfall-bar`:** `data-series-id`, `data-pattern`, `data-kind`, `data-dimmed`, `data-active`, `data-selected`, `data-orientation`, `data-tooltip-mode`.
- **`.cs-chart-arc`:** `data-pie` (when `innerRadiusRatio === 0`), `data-single` (single visible slice), `data-has-selection`.
- **`.cs-chart-sparkline`:** `data-type="line" | "area" | "bar"`, `data-tone`, `data-interactive`, `data-has-active`.
- **`.cs-chart-bullet` / `.cs-chart-bullet-row`:** `data-size`, `data-has-selection`, `data-active`, `data-selected`.
- **`.cs-chart-heatmap` / `.cs-chart-heatmap-cell`:** `data-size`, `data-mode="sequential" | "diverging"`, `data-ramp`, `data-row`, `data-col`, `data-index`, `data-empty`, `data-active`, `data-selected`, `data-dimmed`.
- **`.cs-chart-legend` / `.cs-chart-legend-item`:** `data-position`, `data-align`, `data-hidden`, `data-active`, `data-selected`, `data-static`.
- **`.cs-chart-tooltip`:** `data-open`, `data-gliding`, `data-side="start" | "end"`.
- **`.cs-chart-grid-zero`:** `data-style="solid" | "dashed" | "strong"`.
- **`.cs-chart-ref-line` / `.cs-chart-ref-band` / `.cs-chart-annotation`:** `data-tone`, `data-custom-color`.
- **`.cs-chart-loading`:** `data-shape="bars" | "line" | "donut"`.

---

### CSS Custom Properties

| Variable | Description |
| :--- | :--- |
| `--cs-chart-bg` / `--cs-chart-fg` / `--cs-chart-shadow` | Shell surface fill, primary text (`--cs-color-text-main`), and elevation shadow. |
| `--cs-chart-backdrop-bg` / `--cs-chart-point-ring-bg` | Backing color for `transparent`/`soft` shells and opaque SVG cutout rings (point halos, stacked bar gaps, pie seams, heatmap focus rings). |
| `--cs-chart-padding` / `--cs-chart-gap` / `--cs-chart-plot-height` | Shell padding (`12px`/`16px`/`24px`), section gap (`8px`/`12px`/`16px`), and default plot height (`180px`/`260px`/`340px`). |
| `--cs-chart-radius` / `--cs-chart-squircle` / `--cs-chart-nested-radius` | Outer squircle radius (`16px`/`24px`/`28px`, or concentric nested radius when `[data-nested]`). |
| `--cs-chart-title-fg` / `--cs-chart-subtitle-fg` / `--cs-chart-tick-fg` / `--cs-chart-label-fg` / `--cs-chart-inside-label-fg` | Typography colors across HTML header, SVG axis ticks, outside labels, and contrast-safe inside labels. |
| `--cs-chart-title-size` / `--cs-chart-subtitle-size` / `--cs-chart-tick-size` / `--cs-chart-value-label-size` / `--cs-chart-legend-font-size` | Size-scaled font sizes across shell header, ticks, direct labels, and legend. |
| `--cs-chart-center-value-size` / `--cs-chart-center-value-lh` / `--cs-chart-center-label-size` | `DonutChart` center KPI readout scale (`22px`/`26px`/`32px`). |
| `--cs-chart-grid` / `--cs-chart-axis` / `--cs-chart-zero-line` / `--cs-chart-zero-line-strong` | Structural gridline, axis hairline, and zero-baseline stroke colors. |
| `--cs-chart-crosshair` / `--cs-chart-hover-band` / `--cs-chart-dim-opacity` / `--cs-chart-unselected-opacity` / `--cs-chart-selected-ring` | Scrubbing hairline, bar category hover band, sibling series dim opacity (`0.24`), unselected mark opacity (`0.38`), and selection ring stroke. |
| `--cs-chart-series-1` .. `--cs-chart-series-10` | Resolved categorical or monotone series color slots (overridable per instance). |
| `--cs-chart-positive` / `--cs-chart-caution` / `--cs-chart-negative` (and `-soft` / `-fg`) | Semantic status mark, pill, and reference band tokens. |
| `--cs-chart-waterfall-total` / `--cs-chart-waterfall-connector` | `WaterfallChart` total/subtotal bar fill and step connector stroke. |
| `--cs-chart-bullet-range-1`..`3` / `--cs-chart-bullet-target` / `--cs-chart-bullet-comparative` | `BulletChart` qualitative range band fills, target crossbar fill, and comparative marker fill. |
| `--cs-chart-heatmap-<ramp>-1`..`7` / `--cs-chart-heatmap-div-neg-1`..`3` / `--cs-chart-heatmap-mid` / `--cs-chart-heatmap-div-pos-1`..`3` / `--cs-chart-heatmap-empty-bg` / `--cs-chart-heatmap-cell-fg` / `--cs-chart-heatmap-cell-fg-invert` | `HeatmapChart` 7-stop sequential ramps, 7-stop diverging ramp, empty cell surface, and contrast-safe cell label colors. |
| `--cs-chart-stroke-width` / `--cs-chart-point-radius` / `--cs-chart-bar-radius` / `--cs-chart-bar-max-width` / `--cs-chart-bar-group-gap` | Mark geometry tokens scaled by `size`. |
| `--cs-chart-area-top-opacity` / `--cs-chart-area-bottom-opacity` / `--cs-chart-area-stacked-top-opacity` / `--cs-chart-area-stacked-bottom-opacity` / `--cs-chart-ref-band-opacity` | Area gradient and reference band fill opacities (automatically stepped up in dark mode). |
| `--cs-chart-tooltip-bg` / `--cs-chart-tooltip-shadow` / `--cs-chart-tooltip-radius` / `--cs-chart-tooltip-padding` | Floating top-layer tooltip surface and spacing. |
| `--cs-chart-dur-draw` / `--cs-chart-dur-bar` / `--cs-chart-dur-arc` / `--cs-chart-dur-update` / `--cs-chart-dur-scrub` / `--cs-chart-ease-data` / `--cs-chart-ease-draw` | Scoped data-draw, bar growth, arc sweep, update, and tooltip scrub choreography tokens. |

## Examples

### LineChart (with `directLabels`)

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
    directLabels
    legend="none"
    height={280}
/>
```

### AreaChart (Stacked & 100% Percent)

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
    description="Monthly compute share by tier"
    {data}
    x="date"
    {series}
    mode="percent"
    height={280}
/>
```

### BarChart (Grouped + Stacked via `stack`, IBCS `pattern`, Per-Datum `tone` & `selectable`)

```svelte
<script lang="ts">
    import { BarChart, type ChartSeries } from "cs/svelte/charts";

    const data = [
        { month: "Sep", revenue: 418_000, isForecast: false, attainment: 105 },
        { month: "Oct", revenue: 436_000, isForecast: true, attainment: 101 },
        { month: "Nov", revenue: 454_000, isForecast: true, attainment: 88 },
    ];

    let selectedIndex = $state<number | null>(null);

    const series: ChartSeries<(typeof data)[number]>[] = [
        {
            id: "revenue",
            label: "Revenue",
            pattern: (d) => (d.isForecast ? "hatch" : "solid"),
            tone: (d) => (d.attainment >= 100 ? "positive" : "caution"),
        },
    ];
</script>

<BarChart
    variant="elevated"
    size="md"
    title="Revenue Actual vs. Forecast"
    {data}
    x="month"
    {series}
    selectable
    bind:selectedIndex
    height={260}
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

### Sparkline (Inside `KpiCardVisual` & Interactive Scrubbing)

```svelte
<script lang="ts">
    import { Sparkline } from "cs/svelte/charts";
    import {
        KpiCard,
        KpiCardDelta,
        KpiCardHeader,
        KpiCardLabel,
        KpiCardMetric,
        KpiCardValue,
        KpiCardVisual,
    } from "cs/svelte/kpi-card";

    const latency = [148, 144, 152, 139, 136, 142, 134, 129, 126, 121, 118];
    let activeIndex = $state<number | null>(null);
</script>

<KpiCard variant="elevated" size="md">
    <KpiCardHeader>
        <KpiCardLabel>API Latency (p95)</KpiCardLabel>
    </KpiCardHeader>
    <KpiCardMetric>
        <KpiCardValue>{latency[activeIndex ?? latency.length - 1]} ms</KpiCardValue>
        <KpiCardDelta trend="down" color="positive">-8.2%</KpiCardDelta>
    </KpiCardMetric>
    <KpiCardVisual>
        <Sparkline
            data={latency}
            type="area"
            tone="positive"
            target={140}
            height={52}
            interactive
            bind:activeIndex
        />
    </KpiCardVisual>
</KpiCard>
```

### WaterfallChart (ARR Financial Bridge)

```svelte
<script lang="ts">
    import { WaterfallChart, type ChartWaterfallRowType } from "cs/svelte/charts";

    const data: { step: string; amount: number | null; type: ChartWaterfallRowType }[] = [
        { step: "Opening ARR", amount: 2_400_000, type: "start" },
        { step: "New Logos", amount: 680_000, type: "delta" },
        { step: "Expansion", amount: 420_000, type: "delta" },
        { step: "Gross ARR", amount: null, type: "subtotal" },
        { step: "Contraction", amount: -165_000, type: "delta" },
        { step: "Churn", amount: -235_000, type: "delta" },
        { step: "Net ARR", amount: null, type: "total" },
    ];
</script>

<WaterfallChart
    variant="elevated"
    size="md"
    title="ARR Bridge"
    {data}
    x="step"
    value="amount"
    type="type"
    connectors
    valueLabels
    numberFormat={{ style: "currency", currency: "USD", maximumFractionDigits: 0 }}
    locales="en-US"
    height={300}
/>
```

### BulletChart (Target vs. Actual KPI Scorecard)

```svelte
<script lang="ts">
    import { BulletChart } from "cs/svelte/charts";

    const kpis = [
        { metric: "OEE", unit: "%", actual: 86, target: 85, prior: 81, ranges: [60, 80, 100], max: 100 },
        { metric: "Throughput", unit: "t/h", actual: 142, target: 150, prior: 136, ranges: [90, 130, 180], max: 180 },
        { metric: "First-Pass Yield", unit: "%", actual: 97.4, target: 96, prior: 94.8, ranges: [80, 92, 100], max: 100 },
    ];
</script>

<BulletChart
    variant="elevated"
    size="md"
    title="Plant Operations KPIs"
    data={kpis}
    label="metric"
    unit="unit"
    actual="actual"
    target="target"
    comparative="prior"
    ranges="ranges"
    max="max"
    tone={(d) => (d.actual >= d.target ? "positive" : d.actual >= d.target * 0.9 ? "caution" : "negative")}
    numberFormat={{ maximumFractionDigits: 1 }}
    locales="en-US"
/>
```

### HeatmapChart (Sequential & Diverging Matrices)

```svelte
<script lang="ts">
    import { HeatmapChart } from "cs/svelte/charts";

    const cohortRetention = [
        { cohort: "Jan '26", month: "M0", retention: 100 },
        { cohort: "Jan '26", month: "M1", retention: 94 },
        { cohort: "Jan '26", month: "M2", retention: 89 },
        { cohort: "Feb '26", month: "M0", retention: 100 },
        { cohort: "Feb '26", month: "M1", retention: 92 },
        { cohort: "Feb '26", month: "M2", retention: null },
    ];
</script>

<HeatmapChart
    variant="elevated"
    size="md"
    title="Cohort Retention Matrix"
    data={cohortRetention}
    x="month"
    y="cohort"
    value="retention"
    mode="sequential"
    ramp="accent"
    domain={[75, 100]}
    valueLabels
    numberFormat={{ maximumFractionDigits: 0 }}
    locales="en-US"
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
  - `tooltipMode="axis"` _(default on Cartesian charts and `WaterfallChart`)_ snaps to the nearest X-index via bisector lookup and lists all visible series at that point. `tooltipMode="item"` _(default on `DonutChart`, `BulletChart`, and `HeatmapChart`)_ tracks only the actively hovered bar/series/slice/row/cell and dims siblings. `tooltipMode="none"` disables tooltip rendering completely.
  - `ChartTooltip` (and the dedicated top-layer tooltips on `DonutChart`, `BulletChart`, and `HeatmapChart`) renders inside a native `popover="manual"` element so it is never clipped by parent `Card` or `ScrollArea` `overflow: clip`. Positioning uses cached SVG bounds and integer-snapped `translate3d(x, y, 0)` with instant placement on first open (never flying in from `(0, 0)`), smooth `--cs-chart-dur-scrub` gliding while open, and `16px` flip hysteresis at viewport edges.
  - Numeric readouts render directly via `<NumberMorph willChange={false} respectMotionPreference={true} />` unless a custom string formatter or `morph={false}` is provided.
- **Keyboard Scrubbing, 2D Matrix Navigation & Click-to-Select:**
  - When `interactive` is `true`, `.cs-chart-canvas`, `.cs-chart-polar-stage`, `.cs-chart-bullet-stage`, and `.cs-chart-heatmap-stage` are focusable (`tabindex="0"`). `ArrowLeft`/`ArrowRight` (and `ArrowUp`/`ArrowDown` on horizontal bars, donuts, bullet rows, and 2D heatmap grids) step `activeIndex`, `Home`/`End` jump to ends, `Escape` clears scrubbing, and `Enter`/`Space` triggers selection or click callbacks. Live updates are announced through a visually hidden `aria-live="polite"` region.
  - When `selectable={true}`, clicking a mark (or pressing `Enter`/`Space`) toggles `selectedIndex` (`$bindable`), dimming non-selected marks to `--cs-chart-unselected-opacity` (`0.38`) and rendering a contrast-safe selection ring so two or more charts can share a bound `selectedIndex` for synchronized cross-filtering.
  - Clicking a `ChartLegend` button toggles that series in `hiddenSeriesIds` (`aria-pressed`), while hovering or focusing isolates that series and dims siblings to `--cs-chart-dim-opacity`. When all series are toggled off, `ChartEmpty` displays a localized one-click `"Show all"` reset button.
- **Export Readiness & Crisp SVG Geometry:**
  - Everything inside `<svg>` is 100% native vector SVG (`<path>`, `<rect>`, `<line>`, `<circle>`, `<text>`, `<tspan>`, `<pattern>`) with **zero `<foreignObject>`** and **zero `<filter>` drop shadows**, ensuring crisp rendering at any DPR, print scale, or SVG/PNG export.
  - Straight 1px hairlines snap to `Math.floor(v) + 0.5` (`shape-rendering="crispEdges"`); bars, heatmap cells, hover bands, and `<text>` coordinates snap to integer pixels. Dynamic margins and direct-label collision resolution are measured via cached offscreen `CanvasRenderingContext2D.measureText()` with zero DOM reflow.
- **Reduced Motion & Theme Switching:**
  - CSS animations and transitions defer to global `prefers-reduced-motion: reduce` and `[data-theme-switching]` rules in `motion.css`. `<NumberMorph>` receives `respectMotionPreference={true}` so digits snap without rolling when reduced motion is enabled.
- **Data Edge Cases:**
  - `null`, `undefined`, and non-finite values break line/area paths cleanly (`connectNulls={false}` default), render as dashed empty cells in `HeatmapChart`, and display `—` / localized `"No data"` in tooltips.
  - Negative stacked bars use `stackOffsetDiverging` so positive values stack upward from `0` and negative values stack downward from `0`, automatically emphasizing the zero baseline.
  - `ChartCanvas`, `Sparkline`, `BulletChart`, and `HeatmapChart` guard SVG mark rendering until `width > 0 && height > 0`, safely handling SSR and initially hidden tabs without `NaN` coordinates.
