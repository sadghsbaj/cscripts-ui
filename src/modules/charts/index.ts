import type { Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { NumberMorphFormat } from "../number-morph/index.ts";
import type {
    ChartAnnotationConfig,
    ChartAreaMode,
    ChartAxisConfig,
    ChartAxisPosition,
    ChartBarInsideLabelOrientation,
    ChartBarLabelLayout,
    ChartBarMode,
    ChartBarValueLabels,
    ChartCurve,
    ChartDatum,
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
export { default as ChartCanvas } from "./ChartCanvas.svelte";
export { default as ChartGrid } from "./ChartGrid.svelte";
export { default as ChartAxis } from "./ChartAxis.svelte";
export { default as ChartLine } from "./ChartLine.svelte";
export { default as ChartArea } from "./ChartArea.svelte";
export { default as ChartBar } from "./ChartBar.svelte";
export { default as ChartArc } from "./ChartArc.svelte";
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
    type ChartVariant,
    type ChartSize,
    type ChartPalette,
    type ChartMonotoneHue,
    type ChartTone,
    type ChartCurve,
    type ChartOrientation,
    type ChartBarMode,
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
    margin?: Partial<ChartMargins>;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
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

export type ChartLegendProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    ref?: HTMLDivElement | null;
    position?: ChartLegendPlacement;
    align?: "start" | "center" | "end";
    interactive?: boolean;
    marker?: ChartLegendMarker;
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
    formatLabel?: (value: number, datum: TDatum, series: ChartSeries<TDatum>) => string;
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendPosition;
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
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
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
    referenceLines?: readonly ChartReferenceLineConfig[];
    referenceBands?: readonly ChartReferenceBandConfig[];
    annotations?: readonly ChartAnnotationConfig[];
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendPosition;
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
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
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
    legend?: ChartLegendPosition;
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
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
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
    legend?: ChartLegendPosition;
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
    onPointClick?: (datum: TDatum, index: number) => void;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
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
    activeIndex?: number | null;
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
    onSliceClick?: (datum: TDatum, index: number, slice: ChartArcItem<TDatum>) => void;
    hiddenSliceIds?: readonly string[];
    activeIndex?: number | null;
    hoveredSliceId?: string | null;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
};
