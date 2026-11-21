import { untrack } from "svelte";

import {
    computeStackedSeries,
    partitionSeriesIntoStackSlots,
} from "./chart-geometry.internal.ts";
import { computeChartMargins, measureTextWidth } from "./chart-measure.internal.ts";
import {
    createNumericScale,
    createXScale,
    formatDefaultTick,
    formatPercentTick,
    inferXScaleType,
} from "./chart-scales.internal.ts";

export const CHART_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const;
export const CHART_SIZES = ["sm", "md", "lg"] as const;
export const CHART_PALETTES = ["categorical", "semantic"] as const;
export const CHART_MONOTONE_HUES = [
    "accent",
    "blue",
    "slate",
    "emerald",
    "teal",
    "violet",
    "amber",
    "rose",
] as const;
export const CHART_TONES = ["base", "accent", "positive", "caution", "negative"] as const;
export const CHART_CURVES = ["linear", "monotone", "step"] as const;
export const CHART_ORIENTATIONS = ["vertical", "horizontal"] as const;
export const CHART_BAR_MODES = ["grouped", "stacked", "percent"] as const;
export const CHART_BAR_PATTERNS = ["solid", "hatch", "outline"] as const;
export const CHART_BAR_VALUE_LABELS = ["none", "outside", "inside", "both"] as const;
export const CHART_BAR_INSIDE_LABEL_ORIENTATIONS = ["auto", "horizontal", "vertical"] as const;
export const CHART_BAR_LABEL_LAYOUTS = ["gutter", "above"] as const;
export const CHART_AREA_MODES = ["overlay", "stacked", "percent"] as const;
export const CHART_AXIS_POSITIONS = ["bottom", "left", "right"] as const;
export const CHART_LEGEND_POSITIONS = ["top", "bottom", "end", "none"] as const;
export const CHART_LEGEND_PLACEMENTS = ["top", "bottom", "end"] as const;
export const CHART_LEGEND_MARKERS = ["auto", "line", "bar", "dot", "dashed"] as const;
export const CHART_TOOLTIP_MODES = ["axis", "item", "none"] as const;
export const CHART_ZERO_LINE_STYLES = ["solid", "dashed", "strong"] as const;
export const CHART_X_SCALE_TYPES = ["auto", "band", "point", "time", "linear"] as const;
export const CHART_TICK_ANGLES = ["auto", 0, -35, -45] as const;
export const CHART_TITLE_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "div"] as const;
export const CHART_WATERFALL_ROW_TYPES = ["start", "delta", "subtotal", "total"] as const;
export const CHART_WATERFALL_TOTAL_TONES = ["base", "accent"] as const;
export const CHART_HEATMAP_MODES = ["sequential", "diverging"] as const;
export const CHART_HEATMAP_RAMPS = [
    "accent",
    "teal",
    "emerald",
    "slate",
    "amber",
    "rose",
    "diverging",
] as const;

export type ChartVariant = (typeof CHART_VARIANTS)[number];
export type ChartSize = (typeof CHART_SIZES)[number];
export type ChartPalette = (typeof CHART_PALETTES)[number];
export type ChartMonotoneHue = (typeof CHART_MONOTONE_HUES)[number];
export type ChartTone = (typeof CHART_TONES)[number];
export type ChartCurve = (typeof CHART_CURVES)[number];
export type ChartOrientation = (typeof CHART_ORIENTATIONS)[number];
export type ChartBarMode = (typeof CHART_BAR_MODES)[number];
export type ChartBarPattern = (typeof CHART_BAR_PATTERNS)[number];
export type ChartBarValueLabelsMode = (typeof CHART_BAR_VALUE_LABELS)[number];
export type ChartBarValueLabels = boolean | ChartBarValueLabelsMode;
export type ChartBarInsideLabelOrientation = (typeof CHART_BAR_INSIDE_LABEL_ORIENTATIONS)[number];
export type ChartBarLabelLayout = (typeof CHART_BAR_LABEL_LAYOUTS)[number];
export type ChartAreaMode = (typeof CHART_AREA_MODES)[number];
export type ChartAxisPosition = (typeof CHART_AXIS_POSITIONS)[number];
export type ChartLegendPosition = (typeof CHART_LEGEND_POSITIONS)[number];
export type ChartLegendPlacement = (typeof CHART_LEGEND_PLACEMENTS)[number];
export type ChartLegendMarker = (typeof CHART_LEGEND_MARKERS)[number];
export type ChartTooltipMode = (typeof CHART_TOOLTIP_MODES)[number];
export type ChartZeroLineStyle = (typeof CHART_ZERO_LINE_STYLES)[number];
export type ChartXScaleType = (typeof CHART_X_SCALE_TYPES)[number];
export type ChartResolvedXScaleType = Exclude<ChartXScaleType, "auto">;
export type ChartTickAngle = (typeof CHART_TICK_ANGLES)[number];
export type ChartTitleElement = (typeof CHART_TITLE_ELEMENTS)[number];
export type ChartWaterfallRowType = (typeof CHART_WATERFALL_ROW_TYPES)[number];
export type ChartWaterfallTotalTone = (typeof CHART_WATERFALL_TOTAL_TONES)[number];
export type ChartWaterfallBarKind = "start" | "positive" | "negative" | "subtotal" | "total";
export type ChartHeatmapMode = (typeof CHART_HEATMAP_MODES)[number];
export type ChartHeatmapRamp = (typeof CHART_HEATMAP_RAMPS)[number];

export type ChartDatum = Record<string, unknown>;
export type ChartXValue = string | number | Date;
export type ChartSeriesType = "line" | "area" | "bar";
export type ChartAxisDomainBound = number | "auto" | "dataMin" | "dataMax";
export type ChartAxisDomain = readonly [ChartAxisDomainBound, ChartAxisDomainBound];

export interface ChartMargins {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface ChartSvgRect {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
}

export interface ChartActiveAnchor {
    readonly plotX: number;
    readonly plotY: number;
    readonly clientX: number;
    readonly clientY: number;
}

export interface ChartXScale {
    readonly type: ChartResolvedXScaleType;
    readonly range: readonly [number, number];
    readonly domain: readonly ChartXValue[];
    readonly bandwidth: number;
    readonly step: number;
    scale: (value: ChartXValue) => number;
    center: (value: ChartXValue) => number;
    invert: (pixel: number) => ChartXValue | null;
    ticks: (count?: number) => readonly ChartXValue[];
}

export interface ChartNumericScale {
    readonly type: "linear";
    readonly domain: readonly [number, number];
    readonly range: readonly [number, number];
    readonly crossesZero: boolean;
    readonly baseline: number;
    scale: (value: number) => number;
    invert: (pixel: number) => number;
    ticks: (count?: number) => readonly number[];
}

export interface ChartSeries<TDatum = ChartDatum> {
    /** Unique series identifier (also default key on datum if `accessor` omitted). */
    id: string;
    /** Human-readable legend & tooltip label. */
    label: string;
    /** Value extractor. Falls back to `Number(datum[id])` (preserving `null`/`undefined` as gaps). */
    accessor?: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined);
    /** Target Y-axis (`"left"` primary or `"right"` secondary). @default "left" */
    yAxis?: "left" | "right";
    /** Optional stack group key. Series sharing a `stack` value stack together while distinct stacks sit side-by-side. */
    stack?: string;
    /** Mark type when used inside `ComposedChart`. @default "line" */
    type?: ChartSeriesType;
    /** Static or per-datum semantic status tone override (`base | accent | positive | caution | negative`). */
    tone?: ChartTone | ((datum: TDatum, index: number) => ChartTone | undefined);
    /** Static or per-datum explicit CSS color override (e.g. `"var(--cs-color-teal-500)"` or hex/oklch). */
    color?: string | ((datum: TDatum, index: number) => string | undefined);
    /** Static or per-datum IBCS scenario fill pattern (`solid` = Actual, `hatch` = Forecast, `outline` = Plan). @default "solid" */
    pattern?: ChartBarPattern | ((datum: TDatum, index: number) => ChartBarPattern | undefined);
    /** Optional dashed stroke style (Line / Area top stroke / Reference). */
    dashed?: boolean;
    /** Optional per-series value formatter (overrides axis/chart formatter in tooltips & value labels). */
    format?: (value: number, datum: TDatum) => string;
    /** Initial visibility. @default true */
    visible?: boolean;
}

export interface ChartAxisConfig {
    label?: string;
    show?: boolean;
    domain?: ChartAxisDomain;
    tickCount?: number;
    format?: (value: ChartXValue) => string;
    tickAngle?: ChartTickAngle;
    wrapTicks?: boolean;
    maxTickWidth?: number;
    includeZero?: boolean;
}

export interface ChartReferenceLineConfig {
    id?: string;
    axis: "x" | "y" | "y2";
    value: ChartXValue;
    label?: string;
    labelPosition?: "start" | "center" | "end";
    tone?: ChartTone;
    color?: string;
    dashed?: boolean;
}

export interface ChartReferenceBandConfig {
    id?: string;
    axis: "x" | "y" | "y2";
    from: ChartXValue;
    to: ChartXValue;
    label?: string;
    tone?: ChartTone;
    color?: string;
}

export interface ChartAnnotationConfig {
    id?: string;
    x: ChartXValue;
    y: number;
    yAxis?: "left" | "right";
    dx?: number;
    dy?: number;
    label: string;
    tone?: ChartTone;
    color?: string;
}

export interface ChartTooltipItem<TDatum = ChartDatum> {
    series: ChartSeries<TDatum>;
    value: number | null;
    formatted: string;
    color: string;
    share?: number;
    formattedShare?: string;
    pattern?: ChartBarPattern;
}

export interface ChartTooltipContext<TDatum = ChartDatum> {
    index: number;
    datum: TDatum;
    xValue: ChartXValue;
    xLabel: string;
    items: readonly ChartTooltipItem<TDatum>[];
    total?: number;
}

export interface ChartSlice<TDatum = ChartDatum> {
    id: string;
    label: string;
    index: number;
    value: number;
    share: number;
    color: string;
    datum: TDatum;
}

export interface ChartStateOptions<TDatum = ChartDatum> {
    variant?: ChartVariant;
    size?: ChartSize;
    palette?: ChartPalette;
    monotone?: ChartMonotoneHue;
    orientation?: ChartOrientation;
    data?: readonly TDatum[];
    x?: keyof TDatum | ((datum: TDatum, index: number) => ChartXValue);
    xScaleType?: ChartXScaleType;
    preferBandX?: boolean;
    series?: readonly ChartSeries<TDatum>[];
    xAxis?: ChartAxisConfig;
    yAxis?: ChartAxisConfig;
    y2Axis?: ChartAxisConfig;
    stacked?: boolean;
    percent?: boolean;
    directLabels?: boolean;
    width?: number;
    height?: number;
    margin?: Partial<ChartMargins>;
    hiddenSeriesIds?: readonly string[];
    activeIndex?: number | null;
    selectedIndex?: number | null;
    selectable?: boolean;
    hoveredSeriesId?: string | null;
    tooltipMode?: ChartTooltipMode;
}

const SEMANTIC_SERIES_TOKENS = [
    "var(--cs-chart-positive)",
    "var(--cs-chart-caution)",
    "var(--cs-chart-negative)",
] as const;

const CATEGORICAL_SLOT_COUNT = 10;
const MONOTONE_SLOT_COUNT = 6;

export function resolveToneColor(tone: ChartTone): string {
    switch (tone) {
        case "positive": {
            return "var(--cs-chart-positive)";
        }
        case "caution": {
            return "var(--cs-chart-caution)";
        }
        case "negative": {
            return "var(--cs-chart-negative)";
        }
        case "accent": {
            return "var(--cs-chart-series-1)";
        }
        case "base": {
            return "var(--cs-color-text-weak)";
        }
    }
}

export function resolveSeriesColor<TDatum = ChartDatum>(
    seriesItem: Pick<ChartSeries<TDatum>, "color" | "tone">,
    slotIndex: number,
    palette: ChartPalette = "categorical",
    monotone?: ChartMonotoneHue,
): string {
    if (typeof seriesItem.color === "string" && seriesItem.color.length > 0) {
        return seriesItem.color;
    }
    if (typeof seriesItem.tone === "string") {
        return resolveToneColor(seriesItem.tone);
    }

    const safeIndex = Math.max(0, Math.trunc(slotIndex));

    if (monotone) {
        const slot = (safeIndex % MONOTONE_SLOT_COUNT) + 1;
        return `var(--cs-chart-series-${slot})`;
    }

    if (palette === "semantic") {
        return SEMANTIC_SERIES_TOKENS[safeIndex % SEMANTIC_SERIES_TOKENS.length] ?? "var(--cs-chart-positive)";
    }

    const slot = (safeIndex % CATEGORICAL_SLOT_COUNT) + 1;
    return `var(--cs-chart-series-${slot})`;
}

export class ChartState<TDatum = ChartDatum> {
    variant = $state<ChartVariant>("elevated");
    size = $state<ChartSize>("md");
    palette = $state<ChartPalette>("categorical");
    monotone = $state<ChartMonotoneHue | undefined>(undefined);
    orientation = $state<ChartOrientation>("vertical");
    data = $state.raw<readonly TDatum[]>([]);
    xAccessor = $state<keyof TDatum | ((datum: TDatum, index: number) => ChartXValue) | undefined>(
        undefined,
    );
    xScaleType = $state<ChartXScaleType>("auto");
    preferBandX = $state<boolean>(true);
    series = $state.raw<readonly ChartSeries<TDatum>[]>([]);
    xAxis = $state<ChartAxisConfig>({});
    yAxis = $state<ChartAxisConfig>({});
    y2Axis = $state<ChartAxisConfig>({});
    stacked = $state<boolean>(false);
    stackedBar = $state<boolean | null>(null);
    stackedArea = $state<boolean | null>(null);
    percent = $state<boolean>(false);
    percentBar = $state<boolean | null>(null);
    percentArea = $state<boolean | null>(null);
    selectable = $state<boolean>(false);
    directLabels = $state<boolean>(false);
    containerWidth = $state<number>(0);
    containerHeight = $state<number>(0);
    marginOverrides = $state<Partial<ChartMargins>>({});
    hiddenSeriesIds = $state.raw<readonly string[]>([]);
    hoveredSeriesId = $state<string | null>(null);
    interactive = $state<boolean>(true);
    tooltipMode = $state<ChartTooltipMode>("axis");
    plotClipId = $state<string>("");
    svgRect = $state.raw<ChartSvgRect | null>(null);
    pointerPosition = $state.raw<{ readonly x: number; readonly y: number } | null>(null);
    externalYExtent = $state.raw<readonly [number, number] | null>(null);
    activeYResolver = $state.raw<((index: number) => number | null) | null>(null);
    liveAnnouncementFormatter = $state.raw<((index: number) => string) | null>(null);
    private axisOverrides = $state.raw<Partial<Record<ChartAxisPosition, ChartAxisConfig>>>({});
    private rawActiveIndex = $state<number | null>(null);
    private rawActiveSeriesId = $state<string | null>(null);
    private rawSelectedIndex = $state<number | null>(null);

    readonly visibleSeries = $derived.by((): readonly ChartSeries<TDatum>[] => {
        if (this.hiddenSeriesIds.length === 0) return this.series;
        return this.series.filter((item) => !this.hiddenSeriesIds.includes(item.id));
    });

    readonly leftSeries = $derived.by((): readonly ChartSeries<TDatum>[] =>
        this.visibleSeries.filter((item) => item.yAxis !== "right"),
    );

    readonly rightSeries = $derived.by((): readonly ChartSeries<TDatum>[] =>
        this.visibleSeries.filter((item) => item.yAxis === "right"),
    );

    readonly hasY2Axis = $derived(this.rightSeries.length > 0 && this.y2Axis.show !== false);
    readonly isPercent = $derived(
        this.percent || this.percentBar === true || this.percentArea === true,
    );
    readonly hasStackedMarks = $derived(
        this.stacked || this.stackedBar === true || this.stackedArea === true || this.isPercent,
    );
    readonly hasNamedStacks = $derived(
        this.visibleSeries.some((item) => item.stack !== undefined && item.stack.length > 0),
    );
    readonly isEmpty = $derived(this.data.length === 0);
    readonly allSeriesHidden = $derived(this.series.length > 0 && this.visibleSeries.length === 0);
    readonly scrubbing = $derived(this.activeIndex !== null);
    readonly hasSelection = $derived(this.selectedIndex !== null);

    readonly xValues = $derived.by((): readonly ChartXValue[] =>
        this.data.map((datum, index) => this.extractX(datum, index)),
    );

    private readonly leftValues = $derived.by((): readonly (number | null)[] => {
        const base = this.collectAxisValues(this.leftSeries, true);
        if (this.externalYExtent === null) return base;
        return base.length === 0
            ? [this.externalYExtent[0], this.externalYExtent[1]]
            : [...base, this.externalYExtent[0], this.externalYExtent[1]];
    });

    private readonly rightValues = $derived.by((): readonly (number | null)[] =>
        this.collectAxisValues(this.rightSeries, false),
    );

    private readonly probeYScale = $derived.by(
        (): ChartNumericScale =>
            createNumericScale({
                values: this.leftValues,
                range: [1, 0],
                includeZero: this.yAxis.includeZero ?? true,
                domain: this.yAxis.domain,
                tickCount: this.yAxis.tickCount ?? (this.isPercent ? (this.size === "sm" ? 2 : 4) : 5),
                percent: this.isPercent,
            }),
    );

    private readonly probeY2Scale = $derived.by((): ChartNumericScale | null => {
        if (!this.hasY2Axis) return null;
        return createNumericScale({
            values: this.rightValues,
            range: [1, 0],
            includeZero: this.y2Axis.includeZero ?? true,
            domain: this.y2Axis.domain,
            tickCount: this.y2Axis.tickCount ?? 5,
        });
    });

    private readonly directLabelsRightWidth = $derived.by((): number | undefined => {
        if (
            !this.directLabels ||
            this.orientation === "horizontal" ||
            this.hasY2Axis ||
            this.visibleSeries.length === 0 ||
            this.data.length === 0
        ) {
            return undefined;
        }

        const labelFont = { fontSize: 11, fontWeight: 600 };
        const valueFont = { fontSize: 11, fontWeight: 500 };
        const leftConfig = this.getEffectiveAxisConfig("left");
        const valueFmt = leftConfig.format ?? (this.isPercent ? formatPercentTick : formatDefaultTick);
        let maxWidth = 0;

        for (const seriesItem of this.visibleSeries) {
            const latestText = this.findLatestSeriesValueText(seriesItem, valueFmt);
            const nameW = measureTextWidth(seriesItem.label, labelFont);
            const valW = latestText ? measureTextWidth(latestText, valueFont) + 5 : 0;
            // 8px offset from plotRight + label + value + 8px trailing breathing room.
            const total = 8 + nameW + valW + 8;
            if (total > maxWidth) maxWidth = total;
        }

        const clamped = Math.max(88, Math.min(136, Math.ceil(maxWidth)));
        if (this.containerWidth > 0) {
            return Math.min(clamped, Math.max(64, Math.floor(this.containerWidth * 0.32)));
        }
        return clamped;
    });

    private readonly axisMarginInputs = $derived.by(() => {
        const fontSize = this.size === "lg" ? 12 : 11;
        const isHorizontal = this.orientation === "horizontal";
        const bottomConfig = this.getEffectiveAxisConfig("bottom");
        const leftConfig = this.getEffectiveAxisConfig("left");
        const rightConfig = this.getEffectiveAxisConfig("right");

        const defaultValueFormat = this.isPercent ? formatPercentTick : formatDefaultTick;
        const formatBottom = bottomConfig.format ?? (isHorizontal ? defaultValueFormat : formatDefaultTick);
        const formatLeft = leftConfig.format ?? (isHorizontal ? formatDefaultTick : defaultValueFormat);
        const formatRight = rightConfig.format ?? formatDefaultTick;

        const bottomTickLabels = isHorizontal
            ? this.probeYScale.ticks(bottomConfig.tickCount).map((tick) => formatBottom(tick))
            : this.xValues.map((value) => formatBottom(value));
        const leftTickLabels = isHorizontal
            ? this.xValues.map((value) => formatLeft(value))
            : this.probeYScale.ticks(leftConfig.tickCount).map((tick) => formatLeft(tick));
        const rightTickLabels = this.probeY2Scale
            ? this.probeY2Scale.ticks(rightConfig.tickCount).map((tick) => formatRight(tick))
            : [];

        return {
            fontSize,
            isHorizontal,
            bottomConfig,
            leftConfig,
            rightConfig,
            bottomTickLabels,
            leftTickLabels,
            rightTickLabels,
        };
    });

    private readonly sideMargins = $derived.by((): Pick<ChartMargins, "left" | "right"> => {
        const {
            fontSize,
            isHorizontal,
            leftConfig,
            rightConfig,
            leftTickLabels,
            rightTickLabels,
        } = this.axisMarginInputs;

        const computed = computeChartMargins({
            hasXAxis: false,
            hasYAxis: leftConfig.show !== false,
            hasY2Axis: this.hasY2Axis && rightConfig.show !== false,
            yTickLabels: leftTickLabels,
            y2TickLabels: rightTickLabels,
            yAxisLabel: leftConfig.label,
            y2AxisLabel: rightConfig.label,
            yMaxTickWidth: leftConfig.maxTickWidth ?? (isHorizontal ? 140 : undefined),
            directLabelsWidth: this.directLabelsRightWidth,
            font: { fontSize },
            overrides: this.marginOverrides,
        });

        return { left: computed.left, right: computed.right };
    });

    readonly resolvedBottomTickAngle = $derived.by((): number => {
        const { fontSize, isHorizontal, bottomConfig } = this.axisMarginInputs;
        const requested = bottomConfig.tickAngle ?? 0;
        if (requested !== "auto") return requested;

        if (isHorizontal || this.xValues.length === 0 || this.containerWidth <= 0) return 0;

        const xType = inferXScaleType(this.xValues, this.xScaleType, this.preferBandX);
        if (xType !== "band" && xType !== "point") return 0;

        const availableWidth = Math.max(
            0,
            this.containerWidth - this.sideMargins.left - this.sideMargins.right,
        );
        if (availableWidth <= 0) return 0;

        const probeScale = createXScale({
            values: this.xValues,
            range: [0, availableWidth],
            type: xType,
            preferBand: this.preferBandX,
            domain: this.xAxis.domain,
            tickCount: bottomConfig.tickCount,
        });
        const slotWidth = probeScale.bandwidth > 0 ? probeScale.bandwidth : probeScale.step;
        if (slotWidth <= 0) return 0;

        const formatter = bottomConfig.format ?? formatDefaultTick;
        const font = { fontSize };
        let maxWidth = 0;
        for (const tick of probeScale.ticks(bottomConfig.tickCount)) {
            const measured = measureTextWidth(formatter(tick), font);
            if (measured > maxWidth) maxWidth = measured;
        }

        return maxWidth > slotWidth - 6 ? -38 : 0;
    });

    readonly margins = $derived.by((): ChartMargins => {
        const {
            fontSize,
            isHorizontal,
            bottomConfig,
            leftConfig,
            rightConfig,
            bottomTickLabels,
            leftTickLabels,
            rightTickLabels,
        } = this.axisMarginInputs;

        return computeChartMargins({
            hasXAxis: bottomConfig.show !== false,
            hasYAxis: leftConfig.show !== false,
            hasY2Axis: this.hasY2Axis && rightConfig.show !== false,
            xTickLabels: bottomTickLabels,
            yTickLabels: leftTickLabels,
            y2TickLabels: rightTickLabels,
            xAxisLabel: bottomConfig.label,
            yAxisLabel: leftConfig.label,
            y2AxisLabel: rightConfig.label,
            xTickAngle: this.resolvedBottomTickAngle,
            xWrapTicks: bottomConfig.wrapTicks ?? false,
            xMaxTickWidth: bottomConfig.maxTickWidth,
            yMaxTickWidth: leftConfig.maxTickWidth ?? (isHorizontal ? 140 : undefined),
            directLabelsWidth: this.directLabelsRightWidth,
            font: { fontSize },
            overrides: this.marginOverrides,
        });
    });

    readonly plotWidth = $derived(
        Math.max(0, this.containerWidth - this.margins.left - this.margins.right),
    );

    readonly plotHeight = $derived(
        Math.max(0, this.containerHeight - this.margins.top - this.margins.bottom),
    );

    readonly hasSize = $derived(this.plotWidth > 0 && this.plotHeight > 0);

    readonly xScale = $derived.by((): ChartXScale => {
        const range: readonly [number, number] =
            this.orientation === "horizontal" ? [0, this.plotHeight] : [0, this.plotWidth];

        return createXScale({
            values: this.xValues,
            range,
            type: this.xScaleType,
            preferBand: this.preferBandX,
            domain: this.xAxis.domain,
            tickCount: this.xAxis.tickCount,
        });
    });

    readonly yScale = $derived.by((): ChartNumericScale => {
        const range: readonly [number, number] =
            this.orientation === "horizontal" ? [0, this.plotWidth] : [this.plotHeight, 0];

        return createNumericScale({
            values: this.leftValues,
            range,
            includeZero: this.yAxis.includeZero ?? true,
            domain: this.yAxis.domain,
            tickCount: this.yAxis.tickCount ?? (this.isPercent ? (this.size === "sm" ? 2 : 4) : 5),
            percent: this.isPercent,
        });
    });

    readonly y2Scale = $derived.by((): ChartNumericScale | null => {
        if (!this.hasY2Axis) return null;
        return createNumericScale({
            values: this.rightValues,
            range: [this.plotHeight, 0],
            includeZero: this.y2Axis.includeZero ?? true,
            domain: this.y2Axis.domain,
            tickCount: this.y2Axis.tickCount ?? 5,
        });
    });

    readonly activeAnchor = $derived.by((): ChartActiveAnchor | null => {
        const index = this.activeIndex;
        if (index === null || this.data.length === 0 || !this.hasSize) return null;

        const datum = this.data[index];
        if (datum === undefined) return null;

        const xValue = this.extractX(datum, index);
        let plotX: number;
        let plotY: number;

        const itemCoord = this.resolveActiveItemAnchorCoord(index, datum);
        if (itemCoord !== null) {
            if (this.orientation === "horizontal") {
                plotY = this.xScale.center(xValue);
                plotX = Math.max(0, Math.min(this.plotWidth, itemCoord));
            } else {
                plotX = this.xScale.center(xValue);
                plotY = Math.max(0, Math.min(this.plotHeight, itemCoord));
            }
        } else if (this.orientation === "horizontal") {
            plotY = this.xScale.center(xValue);
            const coords = this.collectActiveValueCoords(index, datum, true);
            plotX = coords.length > 0 ? Math.max(...coords) : this.plotWidth * 0.5;
        } else {
            plotX = this.xScale.center(xValue);
            const resolvedY = this.activeYResolver ? this.activeYResolver(index) : null;
            if (resolvedY !== null && Number.isFinite(resolvedY)) {
                plotY = Math.max(0, Math.min(this.plotHeight, resolvedY));
            } else {
                const coords = this.collectActiveValueCoords(index, datum, false);
                if (coords.length > 0) {
                    let sum = 0;
                    for (const coord of coords) sum += coord;
                    plotY = Math.max(0, Math.min(this.plotHeight, sum / coords.length));
                } else {
                    plotY = this.plotHeight * 0.35;
                }
            }
        }

        const rectLeft = this.svgRect?.left ?? 0;
        const rectTop = this.svgRect?.top ?? 0;

        return {
            plotX,
            plotY,
            clientX: rectLeft + this.margins.left + plotX,
            clientY: rectTop + this.margins.top + plotY,
        };
    });

    constructor(options: ChartStateOptions<TDatum> = {}) {
        if (options.variant !== undefined) this.variant = options.variant;
        if (options.size !== undefined) this.size = options.size;
        if (options.palette !== undefined) this.palette = options.palette;
        if (options.monotone !== undefined) this.monotone = options.monotone;
        if (options.orientation !== undefined) this.orientation = options.orientation;
        if (options.data !== undefined) this.data = options.data;
        if (options.x !== undefined) this.xAccessor = options.x;
        if (options.xScaleType !== undefined) this.xScaleType = options.xScaleType;
        if (options.preferBandX !== undefined) this.preferBandX = options.preferBandX;
        if (options.series !== undefined) this.series = options.series;
        if (options.xAxis !== undefined) this.xAxis = options.xAxis;
        if (options.yAxis !== undefined) this.yAxis = options.yAxis;
        if (options.y2Axis !== undefined) this.y2Axis = options.y2Axis;
        if (options.stacked !== undefined) this.stacked = options.stacked;
        if (options.percent !== undefined) this.percent = options.percent;
        if (options.directLabels !== undefined) this.directLabels = options.directLabels;
        if (options.selectable !== undefined) this.selectable = options.selectable;
        if (options.width !== undefined) this.containerWidth = options.width;
        if (options.height !== undefined) this.containerHeight = options.height;
        if (options.margin !== undefined) this.marginOverrides = options.margin;
        if (options.hoveredSeriesId !== undefined) this.hoveredSeriesId = options.hoveredSeriesId;
        if (options.tooltipMode !== undefined) this.tooltipMode = options.tooltipMode;

        const initialHidden: string[] = [];
        const providedHidden = options.hiddenSeriesIds ?? [];
        for (const id of providedHidden) {
            if (!initialHidden.includes(id)) {
                initialHidden.push(id);
            }
        }
        for (const item of this.series) {
            if (item.visible === false && !initialHidden.includes(item.id)) {
                initialHidden.push(item.id);
            }
        }
        this.hiddenSeriesIds = initialHidden;

        if (options.activeIndex !== undefined) {
            this.setActiveIndex(options.activeIndex);
        }
        if (options.selectedIndex !== undefined) {
            this.setSelectedIndex(options.selectedIndex);
        }
    }

    get activeIndex(): number | null {
        if (this.rawActiveIndex === null || this.data.length === 0) return null;
        return Math.max(0, Math.min(this.data.length - 1, this.rawActiveIndex));
    }

    set activeIndex(value: number | null) {
        this.setActiveIndex(value);
    }

    get selectedIndex(): number | null {
        if (this.rawSelectedIndex === null || this.data.length === 0) return null;
        return Math.max(0, Math.min(this.data.length - 1, this.rawSelectedIndex));
    }

    set selectedIndex(value: number | null) {
        this.setSelectedIndex(value);
    }

    get activeSeriesId(): string | null {
        if (this.tooltipMode !== "item" || this.activeIndex === null || this.rawActiveSeriesId === null) {
            return null;
        }
        return this.visibleSeries.some((item) => item.id === this.rawActiveSeriesId)
            ? this.rawActiveSeriesId
            : null;
    }

    set activeSeriesId(value: string | null) {
        this.setActiveSeries(value);
    }

    setActiveIndex(index: number | null): void {
        if (index === null || !Number.isFinite(index) || this.data.length === 0) {
            this.rawActiveIndex = null;
            this.rawActiveSeriesId = null;
            return;
        }
        this.rawActiveIndex = Math.max(0, Math.min(this.data.length - 1, Math.trunc(index)));
    }

    setSelectedIndex(index: number | null): void {
        if (index === null || !Number.isFinite(index) || this.data.length === 0) {
            this.rawSelectedIndex = null;
            return;
        }
        this.rawSelectedIndex = Math.max(0, Math.min(this.data.length - 1, Math.trunc(index)));
    }

    toggleSelectedIndex(index: number): void {
        if (!Number.isFinite(index) || this.data.length === 0) return;
        const clamped = Math.max(0, Math.min(this.data.length - 1, Math.trunc(index)));
        this.rawSelectedIndex = this.selectedIndex === clamped ? null : clamped;
    }

    setActiveSeries(id: string | null): void {
        if (id === null || this.tooltipMode !== "item" || this.hiddenSeriesIds.includes(id)) {
            this.rawActiveSeriesId = null;
            return;
        }
        this.rawActiveSeriesId = id;
    }

    stepActiveIndex(delta: number): void {
        if (this.data.length === 0) {
            this.rawActiveIndex = null;
            this.rawActiveSeriesId = null;
            return;
        }
        const current = this.activeIndex;
        if (current === null) {
            this.rawActiveIndex = delta >= 0 ? 0 : this.data.length - 1;
            return;
        }
        this.setActiveIndex(current + delta);
    }

    setHoveredSeries(seriesId: string | null): void {
        this.hoveredSeriesId = seriesId;
    }

    setDimensions(width: number, height: number): void {
        const safeWidth = Number.isFinite(width) && width > 0 ? Math.round(width) : 0;
        const safeHeight = Number.isFinite(height) && height > 0 ? Math.round(height) : 0;
        if (this.containerWidth !== safeWidth) this.containerWidth = safeWidth;
        if (this.containerHeight !== safeHeight) this.containerHeight = safeHeight;
    }

    setSvgRect(rect: ChartSvgRect | null): void {
        const current = untrack(() => this.svgRect);
        if (rect === null) {
            if (current !== null) this.svgRect = null;
            return;
        }
        if (
            current !== null &&
            current.left === rect.left &&
            current.top === rect.top &&
            current.width === rect.width &&
            current.height === rect.height
        ) {
            return;
        }
        this.svgRect = rect;
    }

    setPointerPosition(position: { readonly x: number; readonly y: number } | null): void {
        const current = untrack(() => this.pointerPosition);
        if (position === null) {
            if (current !== null) this.pointerPosition = null;
            return;
        }
        if (current !== null && current.x === position.x && current.y === position.y) {
            return;
        }
        this.pointerPosition = position;
    }

    isMarkTypePercent(type: ChartSeriesType | undefined): boolean {
        if (type === "line") return false;
        if (type === "bar") return this.percentBar ?? this.percent;
        if (type === "area") return this.percentArea ?? this.percent;
        if (this.percentBar !== null || this.percentArea !== null) return false;
        return this.percent;
    }

    isMarkTypeStacked(type: ChartSeriesType | undefined): boolean {
        if (this.isMarkTypePercent(type)) return true;
        if (type === "line") return false;
        if (type === "bar") return this.stackedBar ?? this.stacked;
        if (type === "area") return this.stackedArea ?? this.stacked;
        // When explicit per-mark-type stacking is active (e.g. ComposedChart),
        // untyped series default to "line" and must not inherit bar/area stacking.
        if (this.stackedBar !== null || this.stackedArea !== null) return false;
        return this.stacked;
    }

    partitionAxisSeriesByMarkType(
        axisSeries: readonly ChartSeries<TDatum>[],
    ): readonly {
        readonly markType: ChartSeriesType | undefined;
        readonly series: readonly ChartSeries<TDatum>[];
    }[] {
        if (axisSeries.length === 0) return [];
        const firstRawType = axisSeries[0]?.type;
        const hasMixedTypes = axisSeries.some((item) => item.type !== firstRawType);
        if (!hasMixedTypes) {
            return [{ markType: firstRawType, series: axisSeries }];
        }

        const barSeries = axisSeries.filter((item) => item.type === "bar");
        const areaSeries = axisSeries.filter((item) => item.type === "area");
        const lineSeries = axisSeries.filter(
            (item) => item.type === undefined || item.type === "line",
        );

        const groups: {
            readonly markType: ChartSeriesType | undefined;
            readonly series: readonly ChartSeries<TDatum>[];
        }[] = [];
        if (barSeries.length > 0) groups.push({ markType: "bar", series: barSeries });
        if (areaSeries.length > 0) groups.push({ markType: "area", series: areaSeries });
        if (lineSeries.length > 0) groups.push({ markType: "line", series: lineSeries });
        return groups;
    }

    private findLatestSeriesValueText(
        seriesItem: ChartSeries<TDatum>,
        valueFmt: (value: ChartXValue) => string,
    ): string {
        for (let index = this.data.length - 1; index >= 0; index--) {
            const datum = this.data[index];
            if (datum === undefined) continue;
            const val = this.extractSeriesValue(seriesItem, datum, index);
            if (val !== null) {
                return seriesItem.format
                    ? seriesItem.format(val, datum)
                    : this.isPercent
                      ? "100%"
                      : valueFmt(val);
            }
        }
        return "";
    }

    private collectAxisValues(
        axisSeries: readonly ChartSeries<TDatum>[],
        allowStacking: boolean,
    ): readonly (number | null)[] {
        if (axisSeries.length === 0) return [];

        const groups = this.partitionAxisSeriesByMarkType(axisSeries);
        const collected: (number | null)[] = [];

        for (const group of groups) {
            const normalized = allowStacking && this.isMarkTypePercent(group.markType);
            const stackUnstacked = allowStacking && this.isMarkTypeStacked(group.markType);
            const hasNamedStack = group.series.some(
                (item) => item.stack !== undefined && item.stack.length > 0,
            );

            if (stackUnstacked || hasNamedStack) {
                const slots = partitionSeriesIntoStackSlots(group.series, stackUnstacked);
                for (const slot of slots) {
                    const { extent } = computeStackedSeries(
                        slot.series.map((item) => ({
                            id: item.id,
                            values: this.data.map((datum, index) =>
                                this.extractSeriesValue(item, datum, index),
                            ),
                        })),
                        { normalized },
                    );
                    collected.push(extent[0], extent[1]);
                }
                continue;
            }

            for (const item of group.series) {
                for (let index = 0; index < this.data.length; index++) {
                    const datum = this.data[index];
                    if (datum !== undefined) {
                        collected.push(this.extractSeriesValue(item, datum, index));
                    }
                }
            }
        }

        return collected;
    }

    private resolveActiveItemAnchorCoord(index: number, datum: TDatum): number | null {
        if (this.tooltipMode !== "item" || this.activeSeriesId === null) return null;
        const seriesItem = this.visibleSeries.find((item) => item.id === this.activeSeriesId);
        if (!seriesItem) return null;

        const isRightAxis =
            this.orientation !== "horizontal" && seriesItem.yAxis === "right" && this.y2Scale !== null;
        const scale = isRightAxis && this.y2Scale ? this.y2Scale : this.yScale;
        const axisSeries = isRightAxis ? this.rightSeries : this.leftSeries;
        const stackUnstacked = !isRightAxis && this.isMarkTypeStacked(seriesItem.type);
        const hasNamedStack = Boolean(seriesItem.stack);

        if (hasNamedStack || stackUnstacked) {
            const matchingGroup =
                this.partitionAxisSeriesByMarkType(axisSeries).find((group) =>
                    group.series.some((item) => item.id === seriesItem.id),
                )?.series ?? axisSeries;
            const stackGroup = hasNamedStack
                ? matchingGroup.filter((item) => item.stack === seriesItem.stack)
                : matchingGroup.filter((item) => !item.stack);

            const normalized = !isRightAxis && this.isMarkTypePercent(seriesItem.type);
            let rowPositiveSum = 0;
            if (normalized) {
                for (const item of stackGroup) {
                    const val = this.extractSeriesValue(item, datum, index);
                    if (val !== null && val > 0) rowPositiveSum += val;
                }
            }

            let posSum = 0;
            let negSum = 0;
            for (const item of stackGroup) {
                const value = this.extractSeriesValue(item, datum, index);
                if (value === null) continue;
                let y0: number;
                let y1: number;
                if (normalized) {
                    const positive = Math.max(0, value);
                    y0 = rowPositiveSum > 0 ? posSum / rowPositiveSum : 0;
                    posSum += positive;
                    y1 = rowPositiveSum > 0 ? posSum / rowPositiveSum : 0;
                } else if (value >= 0) {
                    y0 = posSum;
                    y1 = posSum + value;
                    posSum = y1;
                } else {
                    y0 = negSum;
                    y1 = negSum + value;
                    negSum = y1;
                }
                if (item.id === seriesItem.id) {
                    const coord = scale.scale((y0 + y1) / 2);
                    return Number.isFinite(coord) ? coord : null;
                }
            }
            return null;
        }

        const value = this.extractSeriesValue(seriesItem, datum, index);
        if (value === null) return null;
        const coord = scale.scale(value);
        return Number.isFinite(coord) ? coord : null;
    }

    private pushAxisValueCoords(
        coords: number[],
        axisSeries: readonly ChartSeries<TDatum>[],
        scale: ChartNumericScale,
        index: number,
        datum: TDatum,
        allowStacking: boolean,
    ): void {
        const groups = this.partitionAxisSeriesByMarkType(axisSeries);

        for (const group of groups) {
            const stackUnstacked = allowStacking && this.isMarkTypeStacked(group.markType);
            const hasNamedStack = group.series.some(
                (item) => item.stack !== undefined && item.stack.length > 0,
            );

            if (!stackUnstacked && !hasNamedStack) {
                for (const item of group.series) {
                    const value = this.extractSeriesValue(item, datum, index);
                    if (value !== null) {
                        coords.push(scale.scale(value));
                    }
                }
                continue;
            }

            const normalized = allowStacking && this.isMarkTypePercent(group.markType);
            const slots = partitionSeriesIntoStackSlots(group.series, stackUnstacked);
            for (const slot of slots) {
                let positiveSum = 0;
                let negativeSum = 0;
                let hasPositive = false;
                let hasNegative = false;
                for (const item of slot.series) {
                    const value = this.extractSeriesValue(item, datum, index);
                    if (value !== null) {
                        if (value >= 0) {
                            positiveSum += value;
                            hasPositive = true;
                        } else if (!normalized) {
                            negativeSum += value;
                            hasNegative = true;
                        }
                    }
                }
                if (normalized) {
                    if (hasPositive) coords.push(scale.scale(positiveSum > 0 ? 1 : 0));
                } else {
                    if (hasPositive) coords.push(scale.scale(positiveSum));
                    if (hasNegative) coords.push(scale.scale(negativeSum));
                }
            }
        }
    }

    private collectActiveValueCoords(index: number, datum: TDatum, isHorizontal: boolean): number[] {
        const coords: number[] = [];

        if (this.leftSeries.length > 0) {
            this.pushAxisValueCoords(coords, this.leftSeries, this.yScale, index, datum, true);
        }

        if (!isHorizontal && this.y2Scale !== null && this.rightSeries.length > 0) {
            this.pushAxisValueCoords(coords, this.rightSeries, this.y2Scale, index, datum, false);
        }

        return coords;
    }

    setAxisOverride(position: ChartAxisPosition, override: ChartAxisConfig | null): void {
        const current = untrack(() => this.axisOverrides);
        const existing = current[position];
        if (override === null) {
            if (existing === undefined) return;
            const next = { ...current };
            delete next[position];
            this.axisOverrides = next;
            return;
        }

        if (
            existing !== undefined &&
            existing.label === override.label &&
            existing.show === override.show &&
            existing.tickCount === override.tickCount &&
            existing.format === override.format &&
            existing.tickAngle === override.tickAngle &&
            existing.wrapTicks === override.wrapTicks &&
            existing.maxTickWidth === override.maxTickWidth
        ) {
            return;
        }

        this.axisOverrides = { ...current, [position]: override };
    }

    getEffectiveAxisConfig(position: ChartAxisPosition): ChartAxisConfig {
        let base: ChartAxisConfig;
        if (position === "right") {
            base = this.y2Axis;
        } else if (this.orientation === "horizontal") {
            base = position === "bottom" ? this.yAxis : this.xAxis;
        } else {
            base = position === "bottom" ? this.xAxis : this.yAxis;
        }

        const override = this.axisOverrides[position];
        if (!override) return base;

        return {
            ...base,
            ...(override.label !== undefined && { label: override.label }),
            ...(override.show !== undefined && { show: override.show }),
            ...(override.tickCount !== undefined && { tickCount: override.tickCount }),
            ...(override.format !== undefined && { format: override.format }),
            ...(override.tickAngle !== undefined && { tickAngle: override.tickAngle }),
            ...(override.wrapTicks !== undefined && { wrapTicks: override.wrapTicks }),
            ...(override.maxTickWidth !== undefined && { maxTickWidth: override.maxTickWidth }),
        };
    }

    isSeriesHidden(seriesId: string): boolean {
        return this.hiddenSeriesIds.includes(seriesId);
    }

    isSeriesDimmed(seriesId: string): boolean {
        if (this.hoveredSeriesId !== null) {
            return this.hoveredSeriesId !== seriesId;
        }
        if (this.tooltipMode === "item" && this.activeSeriesId !== null) {
            return this.activeSeriesId !== seriesId;
        }
        return false;
    }

    toggleSeries(seriesId: string): void {
        const nextHidden = this.hiddenSeriesIds.includes(seriesId)
            ? this.hiddenSeriesIds.filter((id) => id !== seriesId)
            : [...this.hiddenSeriesIds, seriesId];
        this.hiddenSeriesIds = nextHidden;
        if (this.rawActiveSeriesId === seriesId && nextHidden.includes(seriesId)) {
            this.rawActiveSeriesId = null;
        }
    }

    showAllSeries(): void {
        this.hiddenSeriesIds = [];
    }

    getSeriesColor(seriesId: string): string {
        const registeredIndex = this.series.findIndex((item) => item.id === seriesId);
        const seriesItem = registeredIndex === -1 ? undefined : this.series[registeredIndex];
        return resolveSeriesColor(
            seriesItem ?? {},
            registeredIndex === -1 ? 0 : registeredIndex,
            this.palette,
            this.monotone,
        );
    }

    resolveDatumColor(seriesId: string, datum: TDatum, index: number): string {
        const registeredIndex = this.series.findIndex((item) => item.id === seriesId);
        const seriesItem = registeredIndex === -1 ? undefined : this.series[registeredIndex];
        if (!seriesItem) {
            return resolveSeriesColor({}, 0, this.palette, this.monotone);
        }

        if (typeof seriesItem.color === "function") {
            const dynamicColor = seriesItem.color(datum, index);
            if (typeof dynamicColor === "string" && dynamicColor.length > 0) {
                return dynamicColor;
            }
        } else if (typeof seriesItem.color === "string" && seriesItem.color.length > 0) {
            return seriesItem.color;
        }

        if (typeof seriesItem.tone === "function") {
            const dynamicTone = seriesItem.tone(datum, index);
            if (dynamicTone !== undefined) {
                return resolveToneColor(dynamicTone);
            }
        } else if (typeof seriesItem.tone === "string") {
            return resolveToneColor(seriesItem.tone);
        }

        return resolveSeriesColor(
            {},
            registeredIndex === -1 ? 0 : registeredIndex,
            this.palette,
            this.monotone,
        );
    }

    resolveSeriesPattern(seriesId: string): ChartBarPattern {
        const seriesItem = this.series.find((item) => item.id === seriesId);
        if (seriesItem && typeof seriesItem.pattern === "string") {
            return seriesItem.pattern;
        }
        return "solid";
    }

    resolveDatumPattern(seriesId: string, datum: TDatum, index: number): ChartBarPattern {
        const seriesItem = this.series.find((item) => item.id === seriesId);
        if (!seriesItem || seriesItem.pattern === undefined) return "solid";
        if (typeof seriesItem.pattern === "function") {
            return seriesItem.pattern(datum, index) ?? "solid";
        }
        return seriesItem.pattern;
    }

    extractX(datum: TDatum, index: number): ChartXValue {
        const accessor = this.xAccessor;
        if (typeof accessor === "function") {
            return accessor(datum, index);
        }
        if (accessor !== undefined && datum !== null && typeof datum === "object") {
            const raw = datum[accessor];
            if (raw instanceof Date || typeof raw === "string" || typeof raw === "number") {
                return raw;
            }
        }
        return index;
    }

    extractSeriesValue(
        seriesItem: ChartSeries<TDatum>,
        datum: TDatum,
        index: number,
    ): number | null {
        const accessor = seriesItem.accessor;
        let raw: unknown;

        if (typeof accessor === "function") {
            raw = accessor(datum, index);
        } else if (accessor !== undefined && datum !== null && typeof datum === "object") {
            raw = datum[accessor];
        } else if (datum !== null && typeof datum === "object") {
            raw = (datum as Record<string, unknown>)[seriesItem.id];
        }

        if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
            return null;
        }
        const numeric = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    getTooltipContext(index: number | null = this.activeIndex): ChartTooltipContext<TDatum> | null {
        if (index === null || this.data.length === 0) return null;
        const clamped = Math.max(0, Math.min(this.data.length - 1, Math.trunc(index)));
        const datum = this.data[clamped];
        if (datum === undefined) return null;

        const xValue = this.extractX(datum, clamped);
        const xAxisPosition: ChartAxisPosition =
            this.orientation === "horizontal" ? "left" : "bottom";
        const yAxisPosition: ChartAxisPosition =
            this.orientation === "horizontal" ? "bottom" : "left";
        const formatX = this.getEffectiveAxisConfig(xAxisPosition).format ?? formatDefaultTick;
        const yAxisFormat = this.getEffectiveAxisConfig(yAxisPosition).format;
        const y2AxisFormat = this.getEffectiveAxisConfig("right").format;
        const xLabel = formatX(xValue);

        const isItemMode = this.tooltipMode === "item" && this.activeSeriesId !== null;
        const targetSeries = isItemMode
            ? this.visibleSeries.filter((item) => item.id === this.activeSeriesId)
            : this.visibleSeries;

        let total = 0;
        let hasNumeric = false;

        const normalizedSumBySeriesId: Record<string, number> = Object.create(null);
        if (this.isPercent && this.leftSeries.length > 0) {
            const groups = this.partitionAxisSeriesByMarkType(this.leftSeries);
            for (const group of groups) {
                if (!this.isMarkTypePercent(group.markType)) continue;
                const slots = partitionSeriesIntoStackSlots(group.series, true);
                for (const slot of slots) {
                    let slotSum = 0;
                    for (const item of slot.series) {
                        const val = this.extractSeriesValue(item, datum, clamped);
                        if (val !== null && val > 0) slotSum += val;
                    }
                    for (const item of slot.series) {
                        normalizedSumBySeriesId[item.id] = slotSum;
                    }
                }
            }
        }

        const items = targetSeries.map((seriesItem) => {
            const value = this.extractSeriesValue(seriesItem, datum, clamped);
            const axisFormat = seriesItem.yAxis === "right" ? y2AxisFormat : yAxisFormat;
            const formatted =
                value === null
                    ? "\u{2014}"
                    : seriesItem.format
                      ? seriesItem.format(value, datum)
                      : axisFormat
                        ? axisFormat(value)
                        : formatDefaultTick(value);

            if (value !== null) {
                total += value;
                hasNumeric = true;
            }

            const isNormalizedItem =
                seriesItem.yAxis !== "right" && this.isMarkTypePercent(seriesItem.type);
            const slotSum = normalizedSumBySeriesId[seriesItem.id] ?? 0;
            const share =
                isNormalizedItem && value !== null
                    ? slotSum > 0
                        ? Math.max(0, value) / slotSum
                        : 0
                    : undefined;
            const formattedShare = share !== undefined ? `${Math.round(share * 100)}%` : undefined;
            const pattern = this.resolveDatumPattern(seriesItem.id, datum, clamped);

            return {
                series: seriesItem,
                value,
                formatted,
                color: this.resolveDatumColor(seriesItem.id, datum, clamped),
                ...(share !== undefined && { share, formattedShare }),
                ...(pattern !== "solid" && { pattern }),
            };
        });

        return {
            index: clamped,
            datum,
            xValue,
            xLabel,
            items,
            total: isItemMode ? undefined : hasNumeric ? total : undefined,
        };
    }
}
