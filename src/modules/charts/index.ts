import type { Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

import type {
    ChartAxisConfig,
    ChartAxisPosition,
    ChartDatum,
    ChartMargins,
    ChartMonotoneHue,
    ChartOrientation,
    ChartPalette,
    ChartSeries,
    ChartSize,
    ChartState,
    ChartTickAngle,
    ChartTitleElement,
    ChartVariant,
    ChartXScaleType,
    ChartXValue,
} from "./chart-state.svelte.ts";

export { default as Chart } from "./Chart.svelte";
export { default as ChartHeader } from "./ChartHeader.svelte";
export { default as ChartTitle } from "./ChartTitle.svelte";
export { default as ChartDescription } from "./ChartDescription.svelte";
export { default as ChartActions } from "./ChartActions.svelte";
export { default as ChartCanvas } from "./ChartCanvas.svelte";
export { default as ChartGrid } from "./ChartGrid.svelte";
export { default as ChartAxis } from "./ChartAxis.svelte";
export { default as ChartEmpty } from "./ChartEmpty.svelte";
export { default as ChartLoading } from "./ChartLoading.svelte";

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
    type ChartXScaleType,
    type ChartResolvedXScaleType,
    type ChartTickAngle,
    type ChartTitleElement,
    type ChartDatum,
    type ChartXValue,
    type ChartAxisDomainBound,
    type ChartAxisDomain,
    type ChartMargins,
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

export type ChartCanvasProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    ref?: HTMLDivElement | null;
    svgRef?: SVGSVGElement | null;
    height?: number | string;
    aspectRatio?: string;
    interactive?: boolean;
    orientation?: ChartOrientation;
    margin?: Partial<ChartMargins>;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
    overlay?: Snippet;
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
