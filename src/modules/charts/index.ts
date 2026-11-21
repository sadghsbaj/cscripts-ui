import type { Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { NumberMorphFormat } from "../number-morph/index.ts";
import type {
    ChartAreaMode,
    ChartAxisConfig,
    ChartAxisPosition,
    ChartCurve,
    ChartDatum,
    ChartLegendMarker,
    ChartLegendPlacement,
    ChartLegendPosition,
    ChartMargins,
    ChartMonotoneHue,
    ChartOrientation,
    ChartPalette,
    ChartSeries,
    ChartSize,
    ChartState,
    ChartTickAngle,
    ChartTitleElement,
    ChartTooltipContext,
    ChartVariant,
    ChartXScaleType,
    ChartXValue,
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
export { default as ChartCrosshair } from "./ChartCrosshair.svelte";
export { default as ChartTooltip } from "./ChartTooltip.svelte";
export { default as ChartOverlay } from "./ChartOverlay.svelte";
export { default as ChartEmpty } from "./ChartEmpty.svelte";
export { default as ChartLoading } from "./ChartLoading.svelte";
export { default as LineChart } from "./LineChart.svelte";
export { default as AreaChart } from "./AreaChart.svelte";

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
    CHART_AREA_MODES,
    CHART_AXIS_POSITIONS,
    CHART_LEGEND_POSITIONS,
    CHART_LEGEND_PLACEMENTS,
    CHART_LEGEND_MARKERS,
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
    type ChartAreaMode,
    type ChartAxisPosition,
    type ChartLegendPosition,
    type ChartLegendPlacement,
    type ChartLegendMarker,
    type ChartXScaleType,
    type ChartResolvedXScaleType,
    type ChartTickAngle,
    type ChartTitleElement,
    type ChartDatum,
    type ChartXValue,
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
    zeroLine?: boolean;
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

export type ChartGridOption =
    | boolean
    | {
          horizontal?: boolean;
          vertical?: boolean;
          zeroLine?: boolean;
      };

export type ChartLineProps<TDatum = ChartDatum> = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    seriesId?: string;
    curve?: ChartCurve;
    strokeWidth?: number;
    dashed?: boolean;
    connectNulls?: boolean;
    showDots?: ChartLineDotsMode;
    showLabels?: boolean;
    formatLabel?: (value: number, datum: TDatum, series: ChartSeries<TDatum>) => string;
};

export type ChartAreaProps = Omit<SVGAttributes<SVGGElement>, "children"> & {
    ref?: SVGGElement | null;
    seriesId?: string;
    mode?: ChartAreaMode;
    curve?: ChartCurve;
    gradient?: boolean;
    showLine?: boolean;
    strokeWidth?: number;
    dashed?: boolean;
    connectNulls?: boolean;
    showDots?: ChartLineDotsMode;
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
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendPosition;
    tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>;
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
    grid?: ChartGridOption;
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    legend?: ChartLegendPosition;
    tooltip?: boolean | Snippet<[ChartTooltipContext<TDatum>]>;
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
