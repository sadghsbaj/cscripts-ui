import type { Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { NumberMorphFormat } from "../number-morph/index.ts";
import type {
    ChartAnnotationConfig,
    ChartAreaMode,
    ChartAxisConfig,
    ChartAxisDomain,
    ChartAxisPosition,
    ChartBarInsideLabelOrientation,
    ChartBarLabelLayout,
    ChartBarMode,
    ChartBarPattern,
    ChartBarValueLabels,
    ChartCurve,
    ChartDatum,
    ChartHeatmapMode,
    ChartHeatmapRamp,
    ChartLegendMarker,
    ChartLegendPlacement,
    ChartLegendPosition,
    ChartMargins,
    ChartMonotoneHue,
    ChartOrientation,
    ChartPalette,
    ChartReferenceBandConfig,
    ChartReferenceLineConfig,
    ChartSeries,
    ChartSize,
    ChartState,
    ChartTickAngle,
    ChartTitleElement,
    ChartTone,
    ChartTooltipContext,
    ChartTooltipMode,
    ChartVariant,
    ChartWaterfallBarKind,
    ChartWaterfallRowType,
    ChartWaterfallTotalTone,
    ChartXScaleType,
    ChartXValue,
    ChartZeroLineStyle,
} from "./chart-state.svelte.ts";

export { default as Chart } from "./Chart.svelte";
export { default as ChartHeader } from "./ChartHeader.svelte";
export { default as ChartTitle } from "./ChartTitle.svelte";
export { default as ChartDescription } from "./ChartDescription.svelte";
export { default as ChartActions } from "./ChartActions.svelte";
export { default as ChartLegend } from "./ChartLegend.svelte";
export { default as ChartLegendItem } from "./ChartLegendItem.svelte";
export { default as ChartCanvas } from "./ChartCanvas.svelte";
export { default as ChartGrid } from "./ChartGrid.svelte";
export { default as ChartAxis } from "./ChartAxis.svelte";
export { default as ChartLine } from "./ChartLine.svelte";
export { default as ChartArea } from "./ChartArea.svelte";
export { default as ChartBar } from "./ChartBar.svelte";
export { default as ChartArc } from "./ChartArc.svelte";
export { default as ChartWaterfall } from "./ChartWaterfall.svelte";
export { default as ChartBullet } from "./ChartBullet.svelte";
export { default as ChartHeatmap } from "./ChartHeatmap.svelte";
export { default as ChartReferenceLine } from "./ChartReferenceLine.svelte";
export { default as ChartReferenceBand } from "./ChartReferenceBand.svelte";
export { default as ChartAnnotation } from "./ChartAnnotation.svelte";
export { default as ChartCrosshair } from "./ChartCrosshair.svelte";
export { default as ChartTooltip } from "./ChartTooltip.svelte";
export { default as ChartOverlay } from "./ChartOverlay.svelte";
export { default as ChartEmpty } from "./ChartEmpty.svelte";
export { default as ChartLoading } from "./ChartLoading.svelte";
export { default as LineChart } from "./LineChart.svelte";
export { default as AreaChart } from "./AreaChart.svelte";
export { default as BarChart } from "./BarChart.svelte";
export { default as ComposedChart } from "./ComposedChart.svelte";
export { default as DonutChart } from "./DonutChart.svelte";
export { default as Sparkline } from "./Sparkline.svelte";
export { default as WaterfallChart } from "./WaterfallChart.svelte";
export { default as BulletChart } from "./BulletChart.svelte";
export { default as HeatmapChart } from "./HeatmapChart.svelte";

export {
    getChartContext,
    setChartContext,
    hasChartContext,
    type ChartContext,
} from "./chart.context.ts";

export {
    ChartState,
    resolveSeriesColor,
    resolveToneColor,
    CHART_VARIANTS,
    CHART_SIZES,
    CHART_PALETTES,
    CHART_MONOTONE_HUES,
    CHART_TONES,
    CHART_CURVES,
    CHART_ORIENTATIONS,
    CHART_BAR_MODES,
    CHART_BAR_PATTERNS,
    CHART_BAR_VALUE_LABELS,
    CHART_BAR_INSIDE_LABEL_ORIENTATIONS,
    CHART_BAR_LABEL_LAYOUTS,
    CHART_AREA_MODES,
    CHART_AXIS_POSITIONS,
    CHART_LEGEND_POSITIONS,
    CHART_LEGEND_PLACEMENTS,
    CHART_LEGEND_MARKERS,
    CHART_TOOLTIP_MODES,
    CHART_ZERO_LINE_STYLES,
    CHART_X_SCALE_TYPES,
    CHART_TICK_ANGLES,
    CHART_TITLE_ELEMENTS,
    CHART_WATERFALL_ROW_TYPES,
    CHART_WATERFALL_TOTAL_TONES,
    CHART_HEATMAP_MODES,
    CHART_HEATMAP_RAMPS,
    type ChartVariant,
    type ChartSize,
    type ChartPalette,
    type ChartMonotoneHue,
    type ChartTone,
    type ChartCurve,
    type ChartOrientation,
    type ChartBarMode,
    type ChartBarPattern,
    type ChartBarValueLabelsMode,
    type ChartBarValueLabels,
    type ChartBarInsideLabelOrientation,
    type ChartBarLabelLayout,
    type ChartAreaMode,
    type ChartAxisPosition,
    type ChartLegendPosition,
    type ChartLegendPlacement,
    type ChartLegendMarker,
    type ChartTooltipMode,
    type ChartZeroLineStyle,
    type ChartXScaleType,
    type ChartResolvedXScaleType,
    type ChartTickAngle,
    type ChartTitleElement,
    type ChartWaterfallRowType,
    type ChartWaterfallTotalTone,
    type ChartWaterfallBarKind,
    type ChartHeatmapMode,
    type ChartHeatmapRamp,
    type ChartDatum,
    type ChartXValue,
    type ChartSeriesType,
    type ChartAxisDomainBound,
    type ChartAxisDomain,
    type ChartMargins,
    type ChartSvgRect,
    type ChartActiveAnchor,
    type ChartXScale,
    type ChartNumericScale,
    type ChartSeries,
    type ChartAxisConfig,
    type ChartReferenceLineConfig,
    type ChartReferenceBandConfig,
    type ChartAnnotationConfig,
    type ChartTooltipItem,
    type ChartTooltipContext,
    type ChartSlice,
    type ChartStateOptions,
} from "./chart-state.svelte.ts";

export type ChartProps<TDatum = ChartDatum> = Omit<HTMLAttributes<HTMLElement>, "children"> & {
    ref?: HTMLElement | null;
    variant: ChartVariant;
    size: ChartSize;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    state?: ChartState<TDatum>;
    data?: readonly TDatum[];
    x?: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    preferBandX?: boolean;
    series?: readonly ChartSeries<TDatum>[];
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    orientation?: ChartOrientation;
    stacked?: boolean;
    percent?: boolean;
    directLabels?: boolean;
    margin?: Partial<ChartMargins>;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    selectable?: boolean;
    hoveredSeriesId?: string | null;
    tooltipMode?: ChartTooltipMode;
    loading?: boolean;
    empty?: boolean;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
};

export type ChartHeaderProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ChartTitleProps = HTMLAttributes<HTMLHeadingElement | HTMLDivElement> & {
    ref?: HTMLHeadingElement | HTMLDivElement | null;
    as?: ChartTitleElement;
};

export type ChartDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
};

export type ChartActionsProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type ChartCanvasProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> & {
    ref?: HTMLDivElement | null;
    svgRef?: SVGSVGElement | null;
    height?: number | string;
    aspectRatio?: string;
    interactive?: boolean;
    orientation?: ChartOrientation;
    margin?: Partial<ChartMargins>;
    label?: string;
    labelledBy?: string;
    onPointClick?: (datum: TDatum, index: number) => void;
    children?: Snippet;
    overlay?: Snippet;
};

export type ChartLegendItemMarker = Exclude<ChartLegendMarker, "auto">;

export type ChartLegendItemProps = Omit<HTMLAttributes<HTMLElement>, "children" | "color"> & {
    ref?: HTMLButtonElement | HTMLSpanElement | null;
    label: string;
    color?: string;
    tone?: ChartTone;
    marker?: ChartLegendItemMarker;
    pattern?: ChartBarPattern;
    interactive?: boolean;
    pressed?: boolean;
    highlighted?: boolean;
};

export interface ChartLegendConfig<TDatum = ChartDatum> {
    position?: ChartLegendPosition;
    align?: "start" | "center" | "end";
    interactive?: boolean;
    marker?: ChartLegendMarker;
    include?: readonly string[];
    exclude?: readonly string[];
    filter?: (series: ChartSeries<TDatum>) => boolean;
    extra?: Snippet;
}

export type ChartLegendOption<TDatum = ChartDatum> =
    | ChartLegendPosition
    | ChartLegendConfig<TDatum>;

export type ChartLegendProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> & {
    ref?: HTMLDivElement | null;
    position?: ChartLegendPlacement;
    align?: "start" | "center" | "end";
    interactive?: boolean;
    marker?: ChartLegendMarker;
    include?: readonly string[];
    exclude?: readonly string[];
    filter?: (series: ChartSeries<TDatum>) => boolean;
    extra?: Snippet;
    children?: Snippet;
};

export type ChartCrosshairProps = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    vertical?: boolean;
    horizontal?: boolean;
    band?: boolean;
    showDots?: boolean;
};

export type ChartTooltipProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> & {
    ref?: HTMLDivElement | null;
    showTotal?: boolean;
    morph?: boolean;
    formatX?: (value: ChartXValue) => string;
    formatTotal?: (value: number) => string;
    numberFormat?: NumberMorphFormat;
    locales?: Intl.LocalesArgument;
    offset?: number;
    children?: Snippet<[ChartTooltipContext<TDatum>]>;
};

export type ChartOverlayProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    ref?: HTMLDivElement | null;
    children?: Snippet;
};

export type ChartGridProps = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    horizontal?: boolean;
    vertical?: boolean;
    zeroLine?: boolean | ChartZeroLineStyle;
    tickCount?: number;
};

export type ChartAxisProps = Omit<SVGAttributes<SVGGElement>, "children" | "format"> & {
    ref?: SVGGElement | null;
    position: ChartAxisPosition;
    label?: string;
    tickCount?: number;
    format?: (value: ChartXValue) => string;
    tickAngle?: ChartTickAngle;
    wrapTicks?: boolean;
    maxTickWidth?: number;
    hideLine?: boolean;
};

export type ChartEmptyProps = Omit<HTMLAttributes<HTMLDivElement>, "children" | "title"> & {
    ref?: HTMLDivElement | null;
    title?: string;
    description?: string;
    hideReset?: boolean;
    onReset?: () => void;
    children?: Snippet;
};

export const CHART_LOADING_SHAPES = ["bars", "line", "donut"] as const;
export type ChartLoadingShape = (typeof CHART_LOADING_SHAPES)[number];

export type ChartLoadingProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    ref?: HTMLDivElement | null;
    shape?: ChartLoadingShape;
    label?: string;
    children?: Snippet;
};

export type ChartLineDotsMode = boolean | "active";

export interface ChartGridConfig {
    horizontal?: boolean;
    vertical?: boolean;
    zeroLine?: boolean | ChartZeroLineStyle;
}

export type ChartGridOption = boolean | ChartGridConfig;

export type ChartLineProps<TDatum = ChartDatum> = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    seriesId?: string;
    seriesIds?: readonly string[];
    curve?: ChartCurve;
    strokeWidth?: number;
    dashed?: boolean;
    connectNulls?: boolean;
    showDots?: ChartLineDotsMode;
    showLabels?: boolean;
    directLabels?: boolean;
    formatLabel?: (value: number, datum: TDatum, series: ChartSeries<TDatum>) => string;
};

export const CHART_AREA_PARTS = ["all", "fill", "line"] as const;
export type ChartAreaPart = (typeof CHART_AREA_PARTS)[number];

export type ChartAreaProps = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    seriesId?: string;
    seriesIds?: readonly string[];
    mode?: ChartAreaMode;
    part?: ChartAreaPart;
    curve?: ChartCurve;
    gradient?: boolean;
    showLine?: boolean;
    strokeWidth?: number;
    dashed?: boolean;
    connectNulls?: boolean;
    showDots?: ChartLineDotsMode;
    directLabels?: boolean;
};

export type ChartBarProps<TDatum = ChartDatum> = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    seriesId?: string;
    seriesIds?: readonly string[];
    mode?: ChartBarMode;
    radius?: number;
    maxBarWidth?: number;
    barGap?: number;
    minBarLength?: number;
    segmentGap?: number;
    valueLabels?: ChartBarValueLabels;
    insideLabelOrientation?: ChartBarInsideLabelOrientation;
    formatLabel?: (value: number, datum: TDatum, series: ChartSeries<TDatum>) => string;
    labelLayout?: ChartBarLabelLayout;
};

export type ChartReferenceLineProps = Omit<SVGAttributes<SVGGElement>, "children" | "color"> & {
    ref?: SVGGElement | null;
    axis?: "x" | "y" | "y2";
    value: ChartXValue;
    label?: string;
    labelPosition?: "start" | "center" | "end";
    tone?: ChartTone;
    color?: string;
    dashed?: boolean;
};

export const CHART_REFERENCE_BAND_PARTS = ["all", "fill", "label"] as const;
export type ChartReferenceBandPart = (typeof CHART_REFERENCE_BAND_PARTS)[number];

export type ChartReferenceBandProps = Omit<
    SVGAttributes<SVGGElement>,
    "children" | "from" | "to" | "color"
> & {
    ref?: SVGGElement | null;
    axis?: "x" | "y" | "y2";
    part?: ChartReferenceBandPart;
    from: ChartXValue;
    to: ChartXValue;
    label?: string;
    tone?: ChartTone;
    color?: string;
};

export type ChartAnnotationProps = Omit<
    SVGAttributes<SVGGElement>,
    "children" | "x" | "y" | "dx" | "dy" | "color"
> & {
    ref?: SVGGElement | null;
    x: ChartXValue;
    y: number;
    yAxis?: "left" | "right";
    dx?: number;
    dy?: number;
    label: string;
    tone?: ChartTone;
    color?: string;
};

export type LineChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    x: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    series: readonly ChartSeries<TDatum>[];
    curve?: ChartCurve;
    strokeWidth?: number;
    showDots?: ChartLineDotsMode;
    connectNulls?: boolean;
    showLabels?: boolean;
    directLabels?: boolean;
    formatLabel?: (value: number, datum: TDatum, series: ChartSeries<TDatum>) => string;
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendOption<TDatum>;
    tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    showTotal?: boolean;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    margin?: Partial<ChartMargins>;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    selectable?: boolean;
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    hoveredSeriesId?: string | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
    overlay?: Snippet;
};

export type AreaChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    x: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    series: readonly ChartSeries<TDatum>[];
    mode?: ChartAreaMode;
    curve?: ChartCurve;
    gradient?: boolean;
    showLine?: boolean;
    strokeWidth?: number;
    showDots?: ChartLineDotsMode;
    connectNulls?: boolean;
    directLabels?: boolean;
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendOption<TDatum>;
    tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    showTotal?: boolean;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    margin?: Partial<ChartMargins>;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    selectable?: boolean;
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    hoveredSeriesId?: string | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
    overlay?: Snippet;
};

export type BarChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    x: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    series: readonly ChartSeries<TDatum>[];
    orientation?: ChartOrientation;
    mode?: ChartBarMode;
    radius?: number;
    maxBarWidth?: number;
    barGap?: number;
    minBarLength?: number;
    segmentGap?: number;
    valueLabels?: ChartBarValueLabels;
    insideLabelOrientation?: ChartBarInsideLabelOrientation;
    formatLabel?: (value: number, datum: TDatum, series: ChartSeries<TDatum>) => string;
    labelLayout?: ChartBarLabelLayout;
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendOption<TDatum>;
    tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    showTotal?: boolean;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    margin?: Partial<ChartMargins>;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    selectable?: boolean;
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    hoveredSeriesId?: string | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
    overlay?: Snippet;
};

export type ComposedChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    x: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    series: readonly ChartSeries<TDatum>[];
    curve?: ChartCurve;
    barMode?: ChartBarMode;
    areaMode?: ChartAreaMode;
    strokeWidth?: number;
    showDots?: ChartLineDotsMode;
    connectNulls?: boolean;
    gradient?: boolean;
    showAreaLine?: boolean;
    barRadius?: number;
    maxBarWidth?: number;
    barGap?: number;
    minBarLength?: number;
    segmentGap?: number;
    valueLabels?: ChartBarValueLabels;
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendOption<TDatum>;
    tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    showTotal?: boolean;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    margin?: Partial<ChartMargins>;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    selectable?: boolean;
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    hoveredSeriesId?: string | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
    overlay?: Snippet;
};

export const CHART_DONUT_CENTER_MODES = ["auto", "total", "active"] as const;
export type ChartDonutCenterMode = (typeof CHART_DONUT_CENTER_MODES)[number];

export interface ChartPolarSlice<TDatum = ChartDatum> {
    id: string;
    label: string;
    value: number;
    color?: string;
    tone?: ChartTone;
    datum?: TDatum;
}

export interface ChartArcItem<TDatum = ChartDatum> {
    id: string;
    label: string;
    index: number;
    value: number;
    share: number;
    color: string;
    startAngle: number;
    endAngle: number;
    midAngle: number;
    centroid: readonly [number, number];
    innerRadius: number;
    outerRadius: number;
    path: string;
    hoverPath: string;
    selectedPath: string;
    selectionRingPath: string;
    datum: TDatum;
}

export interface ChartDonutCenterContext<TDatum = ChartDatum> {
    total: number;
    activeSlice: ChartArcItem<TDatum> | null;
    slices: readonly ChartArcItem<TDatum>[];
    formatValue: (value: number, datum?: TDatum) => string;
}

export interface ChartDonutTooltipContext<TDatum = ChartDatum> {
    slice: ChartArcItem<TDatum>;
    total: number;
    formattedValue: string;
    formattedShare: string;
}

export type ChartArcProps<TDatum = ChartDatum> = Omit<
    SVGAttributes<SVGGElement>,
    "children" | "color" | "name" | "value"
> & {
    ref?: SVGGElement | null;
    slices?: readonly ChartPolarSlice<TDatum>[];
    data?: readonly TDatum[];
    value?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    name?: keyof TDatum | ((datum: TDatum, index: number) => string);
    color?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    tone?: keyof TDatum | ((datum: TDatum, index: number) => ChartTone | undefined);
    width?: number;
    height?: number;
    innerRadiusRatio?: number;
    gap?: number;
    padAngle?: number;
    cornerRadius?: number;
    hoverExpand?: number;
    sort?: boolean;
    valueLabels?: boolean;
    formatValue?: (value: number, datum: TDatum) => string;
    interactive?: boolean;
    selectable?: boolean;
    activeIndex?: number | null;
    selectedIndex?: number | null;
    hoveredSliceId?: string | null;
    onSliceHover?: (index: number | null, arc: ChartArcItem<TDatum> | null) => void;
    onSliceClick?: (datum: TDatum, index: number, slice: ChartArcItem<TDatum>) => void;
};

export type DonutChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title" | "color"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    value: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    name: keyof TDatum | ((datum: TDatum, index: number) => string);
    color?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    tone?: keyof TDatum | ((datum: TDatum, index: number) => ChartTone | undefined);
    innerRadiusRatio?: number;
    gap?: number;
    padAngle?: number;
    cornerRadius?: number;
    hoverExpand?: number;
    sort?: boolean;
    centerMode?: ChartDonutCenterMode;
    centerLabel?: string;
    centerValue?: number | string;
    center?: Snippet<[ChartDonutCenterContext<TDatum>]>;
    numberFormat?: NumberMorphFormat;
    locales?: Intl.LocalesArgument;
    formatValue?: (value: number, datum?: TDatum) => string;
    valueLabels?: boolean;
    legend?: ChartLegendPosition;
    tooltip?: boolean | Snippet<[ChartDonutTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    selectable?: boolean;
    onSliceClick?: (datum: TDatum, index: number, slice: ChartArcItem<TDatum>) => void;
    hiddenSliceIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    hoveredSliceId?: string | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
};

export const CHART_SPARKLINE_TYPES = ["line", "area", "bar"] as const;
export type ChartSparklineType = (typeof CHART_SPARKLINE_TYPES)[number];

export type SparklineProps<TDatum = number | null | undefined> = Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "color"
> & {
    ref?: HTMLDivElement | null;
    svgRef?: SVGSVGElement | null;
    data: readonly TDatum[];
    value?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    type?: ChartSparklineType;
    curve?: ChartCurve;
    strokeWidth?: number;
    tone?: ChartTone;
    color?: string;
    target?: number;
    showEndDot?: boolean;
    includeZero?: boolean;
    domain?: ChartAxisDomain;
    interactive?: boolean;
    activeIndex?: number | null;
    onHover?: (index: number | null, value: number | null, datum: TDatum | null) => void;
    height?: number | string;
    width?: number | string;
    label?: string;
};

export interface ChartWaterfallItem<TDatum = ChartDatum> {
    readonly index: number;
    readonly label: string;
    readonly xValue: ChartXValue;
    readonly type: ChartWaterfallRowType;
    readonly kind: ChartWaterfallBarKind;
    readonly value: number;
    readonly y0: number;
    readonly y1: number;
    readonly runningTotal: number;
    readonly isPositive: boolean;
    readonly isNegative: boolean;
    readonly color: string;
    readonly pattern: ChartBarPattern;
    readonly datum: TDatum;
}

export type ChartWaterfallBar<TDatum = ChartDatum> = ChartWaterfallItem<TDatum>;

export interface ChartWaterfallTooltipContext<TDatum = ChartDatum> {
    readonly index: number;
    readonly item: ChartWaterfallItem<TDatum>;
    readonly bar: ChartWaterfallItem<TDatum>;
    readonly formattedValue: string;
    readonly formattedRunningTotal: string;
}

export type ChartWaterfallProps<TDatum = ChartDatum> = Omit<
    SVGAttributes<SVGGElement>,
    "children" | "color" | "type" | "value"
> & {
    ref?: SVGGElement | null;
    value: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    type?: keyof TDatum | ((datum: TDatum, index: number) => ChartWaterfallRowType);
    color?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    tone?: keyof TDatum | ((datum: TDatum, index: number) => ChartTone | undefined);
    pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined);
    connectors?: boolean;
    valueLabels?: boolean;
    formatLabel?: (value: number, item: ChartWaterfallItem<TDatum>) => string;
    radius?: number;
    maxBarWidth?: number;
    minBarLength?: number;
    totalTone?: ChartWaterfallTotalTone;
};

export type WaterfallChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title" | "color" | "type"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    x: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    value: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    type?: keyof TDatum | ((datum: TDatum, index: number) => ChartWaterfallRowType);
    color?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    tone?: keyof TDatum | ((datum: TDatum, index: number) => ChartTone | undefined);
    pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined);
    connectors?: boolean;
    valueLabels?: boolean;
    formatLabel?: (value: number, item: ChartWaterfallItem<TDatum>) => string;
    radius?: number;
    maxBarWidth?: number;
    minBarLength?: number;
    totalTone?: ChartWaterfallTotalTone;
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    legend?: ChartLegendPosition;
    tooltip?: boolean | Snippet<[ChartWaterfallTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    numberFormat?: NumberMorphFormat;
    locales?: Intl.LocalesArgument;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    margin?: Partial<ChartMargins>;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    selectable?: boolean;
    onPointClick?: (datum: TDatum, index: number) => void;
    activeIndex?: number | null;
    selectedIndex?: number | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
    overlay?: Snippet;
};

export interface ChartBulletRange {
    readonly to: number;
    readonly tone?: ChartTone;
    readonly color?: string;
}

export interface ChartBulletItem<TDatum = ChartDatum> {
    readonly index?: number;
    readonly label: string;
    readonly subtitle?: string;
    readonly unit?: string;
    readonly actual: number;
    readonly target: number;
    readonly comparative?: number | null;
    readonly ranges?: readonly (number | ChartBulletRange)[];
    readonly max?: number;
    readonly tone?: ChartTone;
    readonly color?: string;
    readonly pattern?: ChartBarPattern;
    readonly datum?: TDatum;
}

export interface ChartBulletRow<TDatum = ChartDatum> {
    readonly index: number;
    readonly label: string;
    readonly subtitle?: string;
    readonly unit?: string;
    readonly actual: number;
    readonly target: number;
    readonly comparative: number | null;
    readonly ranges: readonly ChartBulletRange[];
    readonly max: number;
    readonly color: string;
    readonly pattern: ChartBarPattern;
    readonly datum: TDatum;
}

export interface ChartBulletTooltipContext<TDatum = ChartDatum> {
    readonly index: number;
    readonly row: ChartBulletRow<TDatum>;
    readonly variance: number;
    readonly variancePercent: number | null;
    readonly formattedActual: string;
    readonly formattedTarget: string;
    readonly formattedVariance: string;
    readonly formattedVariancePercent: string | null;
    readonly formattedComparative?: string;
}

export type ChartBulletProps<TDatum = ChartDatum> = Omit<
    SVGAttributes<SVGGElement>,
    "children" | "color"
> & {
    ref?: SVGGElement | null;
    items?: readonly ChartBulletItem<TDatum>[];
    data?: readonly TDatum[];
    label?: keyof TDatum | ((datum: TDatum, index: number) => string);
    subtitle?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    unit?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    actual?: keyof TDatum | ((datum: TDatum, index: number) => number);
    target?: keyof TDatum | ((datum: TDatum, index: number) => number);
    comparative?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    ranges?:
        | keyof TDatum
        | ((datum: TDatum, index: number) => readonly (number | ChartBulletRange)[] | undefined);
    max?: keyof TDatum | ((datum: TDatum, index: number) => number | undefined);
    tone?: ChartTone | ((datum: TDatum, index: number) => ChartTone | undefined);
    color?: string | ((datum: TDatum, index: number) => string | undefined);
    pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined);
    width?: number;
    size?: ChartSize;
    sharedScale?: boolean;
    showReadout?: boolean;
    showVariance?: boolean;
    minBarLength?: number;
    formatValue?: (value: number, datum?: TDatum) => string;
    interactive?: boolean;
    selectable?: boolean;
    activeIndex?: number | null;
    selectedIndex?: number | null;
    onRowHover?: (index: number | null, row: ChartBulletRow<TDatum> | null) => void;
    onRowClick?: (datum: TDatum, index: number, row: ChartBulletRow<TDatum>) => void;
};

export type BulletChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title" | "color"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    label: keyof TDatum | ((datum: TDatum, index: number) => string);
    subtitle?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    unit?: keyof TDatum | ((datum: TDatum, index: number) => string | undefined);
    actual: keyof TDatum | ((datum: TDatum, index: number) => number);
    target: keyof TDatum | ((datum: TDatum, index: number) => number);
    comparative?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    ranges?:
        | keyof TDatum
        | ((datum: TDatum, index: number) => readonly (number | ChartBulletRange)[] | undefined);
    max?: keyof TDatum | ((datum: TDatum, index: number) => number | undefined);
    tone?: ChartTone | ((datum: TDatum, index: number) => ChartTone | undefined);
    color?: string | ((datum: TDatum, index: number) => string | undefined);
    pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined);
    sharedScale?: boolean;
    showReadout?: boolean;
    showVariance?: boolean;
    minBarLength?: number;
    formatValue?: (value: number, datum?: TDatum) => string;
    numberFormat?: NumberMorphFormat;
    locales?: Intl.LocalesArgument;
    tooltip?: boolean | Snippet<[ChartBulletTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    selectable?: boolean;
    selectedIndex?: number | null;
    activeIndex?: number | null;
    onRowClick?: (datum: TDatum, index: number, row: ChartBulletRow<TDatum>) => void;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    labelledBy?: string;
    children?: Snippet;
};

export interface ChartHeatmapCellInput<TDatum = ChartDatum> {
    readonly x: string | number;
    readonly y: string | number;
    readonly value: number | null | undefined;
    readonly datum?: TDatum;
}

export interface ChartHeatmapCell<TDatum = ChartDatum> {
    readonly index: number;
    readonly row: number;
    readonly col: number;
    readonly xCategory: string;
    readonly yCategory: string;
    readonly value: number | null;
    readonly isEmpty: boolean;
    readonly t: number | null;
    readonly invertFg: boolean;
    readonly color: string;
    readonly formattedValue: string;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rx: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly datum: TDatum | null;
}

export interface ChartHeatmapTooltipContext<TDatum = ChartDatum> {
    readonly index: number;
    readonly row: number;
    readonly col: number;
    readonly cell: ChartHeatmapCell<TDatum>;
    readonly xLabel: string;
    readonly yLabel: string;
    readonly formattedValue: string;
}

export type ChartHeatmapProps<TDatum = ChartDatum> = Omit<
    SVGAttributes<SVGGElement>,
    "children" | "x" | "y" | "width" | "height"
> & {
    ref?: SVGGElement | null;
    cells?: readonly ChartHeatmapCellInput<TDatum>[];
    data?: readonly TDatum[];
    x?: keyof TDatum | ((datum: TDatum, index: number) => string | number);
    y?: keyof TDatum | ((datum: TDatum, index: number) => string | number);
    value?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    xCategories?: readonly string[];
    yCategories?: readonly string[];
    width?: number;
    height?: number;
    size?: ChartSize;
    mode?: ChartHeatmapMode;
    ramp?: ChartHeatmapRamp;
    domain?: readonly [number, number];
    pivot?: number;
    gap?: number;
    radius?: number;
    valueLabels?: boolean;
    formatValue?: (value: number, cell: ChartHeatmapCell<TDatum>) => string;
    interactive?: boolean;
    selectable?: boolean;
    activeCell?: number | { readonly row: number; readonly col: number } | null;
    selectedCell?: number | { readonly row: number; readonly col: number } | null;
    onCellHover?: (index: number | null, cell: ChartHeatmapCell<TDatum> | null) => void;
    onCellClick?: (cell: ChartHeatmapCell<TDatum>, index: number) => void;
};

export type HeatmapChartProps<TDatum = ChartDatum> = Omit<
    HTMLAttributes<HTMLElement>,
    "children" | "title"
> & {
    ref?: HTMLElement | null;
    svgRef?: SVGSVGElement | null;
    variant: ChartVariant;
    size: ChartSize;
    data: readonly TDatum[];
    x: keyof TDatum | ((datum: TDatum, index: number) => string | number);
    y: keyof TDatum | ((datum: TDatum, index: number) => string | number);
    value: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    xCategories?: readonly string[];
    yCategories?: readonly string[];
    mode?: ChartHeatmapMode;
    ramp?: ChartHeatmapRamp;
    domain?: readonly [number, number];
    pivot?: number;
    gap?: number;
    radius?: number;
    valueLabels?: boolean;
    formatValue?: (value: number, cell: ChartHeatmapCell<TDatum>) => string;
    numberFormat?: NumberMorphFormat;
    locales?: Intl.LocalesArgument;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    legend?: ChartLegendPosition;
    tooltip?: boolean | Snippet<[ChartHeatmapTooltipContext<TDatum>]>;
    tooltipMode?: ChartTooltipMode;
    selectable?: boolean;
    selectedIndex?: number | null;
    activeIndex?: number | null;
    onCellClick?: (cell: ChartHeatmapCell<TDatum>, index: number) => void;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    title?: string;
    description?: string;
    actions?: Snippet;
    height?: number | string;
    aspectRatio?: string;
    margin?: Partial<ChartMargins>;
    loading?: boolean;
    empty?: boolean;
    emptyTitle?: string;
    emptyDescription?: string;
    interactive?: boolean;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
};
