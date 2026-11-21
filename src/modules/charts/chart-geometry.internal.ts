import { bisector } from "d3-array";
import { scaleLinear } from "d3-scale";
import {
    arc as d3Arc,
    area as d3Area,
    curveLinear,
    curveMonotoneX,
    curveStepAfter,
    line as d3Line,
    pie as d3Pie,
    stack as d3Stack,
    stackOffsetDiverging,
    stackOffsetExpand,
    type CurveFactory,
} from "d3-shape";

import type {
    ChartCurve,
    ChartHeatmapMode,
    ChartNumericScale,
    ChartOrientation,
    ChartSize,
    ChartWaterfallBarKind,
    ChartWaterfallRowType,
} from "./chart-state.svelte.ts";

export interface ChartLinePoint {
    x: number;
    y: number | null;
    defined?: boolean;
}

export interface ChartAreaPoint {
    x: number;
    y0: number | null;
    y1: number | null;
    defined?: boolean;
}

export interface ChartPathOptions {
    curve?: ChartCurve;
    connectNulls?: boolean;
}

export interface StackedSeriesInput {
    id: string;
    values: readonly (number | null | undefined)[];
}

export interface StackedDatum {
    index: number;
    y0: number;
    y1: number;
    value: number | null;
}

export interface StackedSeriesLayer {
    seriesId: string;
    points: readonly StackedDatum[];
}

export interface ComputeStackedSeriesOptions {
    normalized?: boolean;
}

export interface StackedSeriesResult {
    layers: readonly StackedSeriesLayer[];
    extent: readonly [number, number];
}

export type BarCapSide = "top" | "bottom" | "right" | "left" | "none";

export interface ChartBarRect {
    seriesId: string;
    index: number;
    value: number;
    share?: number;
    x: number;
    y: number;
    width: number;
    height: number;
    baseline: number;
    isNegative: boolean;
    capSide: BarCapSide;
    radius: number;
    path: string;
    stackKey?: string;
}

export interface GroupedBarSeriesInput {
    id: string;
    values: readonly (number | null | undefined)[];
    stack?: string;
}

export interface BarStackSlot<T extends { id: string; stack?: string }> {
    readonly key: string;
    readonly stackKey: string | undefined;
    readonly series: readonly T[];
}

export interface ComputeGroupedBarsOptions {
    series: readonly GroupedBarSeriesInput[];
    categoryStarts: readonly number[];
    bandwidth: number;
    valueScale: ChartNumericScale;
    orientation?: ChartOrientation;
    radius?: number;
    maxBarWidth?: number;
    barGap?: number;
    minBarLength?: number;
}

export interface ComputeStackedBarsOptions {
    series: readonly GroupedBarSeriesInput[];
    categoryStarts: readonly number[];
    bandwidth: number;
    valueScale: ChartNumericScale;
    orientation?: ChartOrientation;
    radius?: number;
    maxBarWidth?: number;
    segmentGap?: number;
    minBarLength?: number;
    normalized?: boolean;
}

export interface ComputeGroupedStackedBarsOptions extends ComputeStackedBarsOptions {
    barGap?: number;
    stackUnstacked?: boolean;
}

export interface PieSliceInput {
    id: string;
    label: string;
    value: number;
}

export interface ComputePieArcsOptions {
    slices: readonly PieSliceInput[];
    outerRadius: number;
    innerRadiusRatio?: number;
    gap?: number;
    padAngle?: number;
    cornerRadius?: number;
    hoverExpandPx?: number;
    selectedExpandPx?: number;
    sort?: boolean;
}

export interface ChartArcGeometry {
    id: string;
    label: string;
    index: number;
    value: number;
    share: number;
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
}

export interface WaterfallBarInput {
    readonly index: number;
    readonly label: string;
    readonly value: number | null | undefined;
    readonly type: ChartWaterfallRowType;
}

export interface WaterfallStepData {
    readonly index: number;
    readonly label: string;
    readonly type: ChartWaterfallRowType;
    readonly kind: ChartWaterfallBarKind;
    readonly value: number;
    readonly y0: number;
    readonly y1: number;
    readonly runningTotal: number;
    readonly isPositive: boolean;
    readonly isNegative: boolean;
    readonly isAnchor: boolean;
}

export interface WaterfallStepsResult {
    readonly steps: readonly WaterfallStepData[];
    readonly extent: readonly [number, number];
    readonly crossesZero: boolean;
}

export interface ComputeWaterfallBarsOptions {
    items: readonly WaterfallBarInput[];
    categoryStarts: readonly number[];
    bandwidth: number;
    valueScale: ChartNumericScale;
    radius?: number;
    originRadius?: number;
    maxBarWidth?: number;
    minBarLength?: number;
}

export interface ChartWaterfallConnector {
    readonly fromIndex: number;
    readonly toIndex: number;
    readonly x1: number;
    readonly x2: number;
    readonly y: number;
    readonly value: number;
}

export interface ChartWaterfallBarRect extends WaterfallStepData {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly baseline: number;
    readonly capSide: BarCapSide;
    readonly radius: number;
    readonly originRadius: number;
    readonly path: string;
}

export interface ComputeWaterfallBarsResult {
    readonly bars: readonly ChartWaterfallBarRect[];
    readonly connectors: readonly ChartWaterfallConnector[];
    readonly extent: readonly [number, number];
    readonly crossesZero: boolean;
}

/** Snap 1px SVG hairlines to device half-pixels to prevent 1x DPR blur. */
export function snapHalf(value: number): number {
    return Math.floor(value) + 0.5;
}

/** Snap bar edges, hover bands, and text anchors to integer pixels. */
export function snapInt(value: number): number {
    return Math.round(value);
}

export function clampBarRadius(radius: number, thickness: number, length: number): number {
    if (radius <= 0 || thickness <= 0 || length <= 0) return 0;
    return Math.min(radius, thickness / 2, length);
}

function resolveCurveFactory(curve: ChartCurve): CurveFactory {
    switch (curve) {
        case "linear": {
            return curveLinear;
        }
        case "step": {
            return curveStepAfter;
        }
        case "monotone": {
            return curveMonotoneX;
        }
    }
}

function isDefinedPoint(x: number, y: number | null, defined?: boolean): boolean {
    if (defined === false) return false;
    return y !== null && Number.isFinite(x) && Number.isFinite(y);
}

export function buildLinePath(
    points: readonly ChartLinePoint[],
    options: ChartPathOptions = {},
): string {
    const { curve = "monotone", connectNulls = false } = options;
    if (points.length === 0) return "";

    const source = connectNulls
        ? points.filter((point) => isDefinedPoint(point.x, point.y, point.defined))
        : points;

    if (source.length === 0) return "";

    const generator = d3Line<ChartLinePoint>()
        .curve(resolveCurveFactory(curve))
        .defined((point) => isDefinedPoint(point.x, point.y, point.defined))
        .x((point) => point.x)
        .y((point) => point.y ?? 0);

    return generator(source) ?? "";
}

export function buildAreaPath(
    points: readonly ChartAreaPoint[],
    options: ChartPathOptions = {},
): string {
    const { curve = "monotone", connectNulls = false } = options;
    if (points.length === 0) return "";

    const isAreaDefined = (point: ChartAreaPoint): boolean => {
        if (point.defined === false) return false;
        return (
            point.y0 !== null &&
            point.y1 !== null &&
            Number.isFinite(point.x) &&
            Number.isFinite(point.y0) &&
            Number.isFinite(point.y1)
        );
    };

    const source = connectNulls ? points.filter((point) => isAreaDefined(point)) : points;
    if (source.length === 0) return "";

    const generator = d3Area<ChartAreaPoint>()
        .curve(resolveCurveFactory(curve))
        .defined((point) => isAreaDefined(point))
        .x((point) => point.x)
        .y0((point) => point.y0 ?? 0)
        .y1((point) => point.y1 ?? 0);

    return generator(source) ?? "";
}

export function computeStackedSeries(
    series: readonly StackedSeriesInput[],
    options: ComputeStackedSeriesOptions = {},
): StackedSeriesResult {
    const { normalized = false } = options;

    if (series.length === 0) {
        return { layers: [], extent: [0, 0] };
    }

    let maxLength = 0;
    for (const item of series) {
        if (item.values.length > maxLength) maxLength = item.values.length;
    }

    if (maxLength === 0) {
        return {
            layers: series.map((item) => ({ seriesId: item.id, points: [] })),
            extent: [0, 0],
        };
    }

    const keys = series.map((item) => item.id);
    const rows: Record<string, number>[] = [];
    const rowHasPositiveSum: boolean[] = [];

    for (let index = 0; index < maxLength; index++) {
        const row: Record<string, number> = {};
        let rowSum = 0;
        for (const item of series) {
            const raw = item.values[index];
            const numeric = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
            const entry = normalized ? Math.max(0, numeric) : numeric;
            row[item.id] = entry;
            rowSum += entry;
        }
        rows.push(row);
        rowHasPositiveSum.push(rowSum > 0);
    }

    const offset = normalized ? stackOffsetExpand : stackOffsetDiverging;
    const stacked = d3Stack<Record<string, number>>().keys(keys).offset(offset)(rows);

    let minExtent = 0;
    let maxExtent = 0;

    const layers: StackedSeriesLayer[] = stacked.map((seriesStack, seriesIndex) => {
        const sourceSeries = series[seriesIndex];
        const points: StackedDatum[] = seriesStack.map((pair, index) => {
            // Guard all-zero categories in normalized mode so 0/0 never leaks NaN.
            const zeroNormalizedRow = normalized && !rowHasPositiveSum[index];
            const y0 = !zeroNormalizedRow && Number.isFinite(pair[0]) ? pair[0] : 0;
            const y1 = !zeroNormalizedRow && Number.isFinite(pair[1]) ? pair[1] : 0;
            if (y0 < minExtent) minExtent = y0;
            if (y1 < minExtent) minExtent = y1;
            if (y0 > maxExtent) maxExtent = y0;
            if (y1 > maxExtent) maxExtent = y1;

            const raw = sourceSeries?.values[index];
            const value = typeof raw === "number" && Number.isFinite(raw) ? raw : null;

            return { index, y0, y1, value };
        });

        return {
            seriesId: seriesStack.key,
            points,
        };
    });

    return {
        layers,
        extent: [minExtent, maxExtent],
    };
}

export function buildRoundedBarPath(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    capSide: BarCapSide,
): string {
    if (width <= 0 || height <= 0) return "";

    const thickness = capSide === "top" || capSide === "bottom" ? width : height;
    const length = capSide === "top" || capSide === "bottom" ? height : width;
    const r = clampBarRadius(radius, thickness, length);

    const x2 = x + width;
    const y2 = y + height;

    if (capSide === "none" || r <= 0) {
        return `M${x},${y}H${x2}V${y2}H${x}Z`;
    }

    switch (capSide) {
        case "top": {
            return (
                `M${x},${y + r}` +
                `A${r},${r} 0 0 1 ${x + r},${y}` +
                `H${x2 - r}` +
                `A${r},${r} 0 0 1 ${x2},${y + r}` +
                `V${y2}H${x}Z`
            );
        }
        case "bottom": {
            return (
                `M${x},${y}H${x2}V${y2 - r}` +
                `A${r},${r} 0 0 1 ${x2 - r},${y2}` +
                `H${x + r}` +
                `A${r},${r} 0 0 1 ${x},${y2 - r}Z`
            );
        }
        case "right": {
            return (
                `M${x},${y}H${x2 - r}` +
                `A${r},${r} 0 0 1 ${x2},${y + r}` +
                `V${y2 - r}` +
                `A${r},${r} 0 0 1 ${x2 - r},${y2}` +
                `H${x}Z`
            );
        }
        case "left": {
            return (
                `M${x + r},${y}H${x2}V${y2}H${x + r}` +
                `A${r},${r} 0 0 1 ${x},${y2 - r}` +
                `V${y + r}` +
                `A${r},${r} 0 0 1 ${x + r},${y}Z`
            );
        }
    }
}

function buildGroupedSeriesRects(
    seriesItem: GroupedBarSeriesInput,
    slotOffset: number,
    barThickness: number,
    baselineCoord: number,
    options: ComputeGroupedBarsOptions,
): ChartBarRect[] {
    const {
        categoryStarts,
        valueScale,
        orientation = "vertical",
        radius = 4,
        minBarLength = 2,
    } = options;

    const rects: ChartBarRect[] = [];

    for (const [index, categoryStart] of categoryStarts.entries()) {
        const raw = seriesItem.values[index];
        if (typeof raw !== "number" || !Number.isFinite(raw)) {
            continue;
        }

        const isNegative = raw < 0;
        const valueCoord = valueScale.scale(raw);
        let rawLength = Math.abs(valueCoord - baselineCoord);

        if (raw === 0) {
            rawLength = 0;
        } else if (rawLength < minBarLength) {
            rawLength = minBarLength;
        }

        let x: number;
        let y: number;
        let width: number;
        let height: number;
        let capSide: BarCapSide;
        let clampedRadius: number;

        if (orientation === "vertical") {
            x = snapInt(categoryStart + slotOffset);
            width = Math.max(1, snapInt(barThickness));
            height = snapInt(rawLength);
            y = isNegative ? baselineCoord : baselineCoord - height;
            capSide = height === 0 ? "none" : isNegative ? "bottom" : "top";
            clampedRadius = clampBarRadius(radius, width, height);
        } else {
            y = snapInt(categoryStart + slotOffset);
            height = Math.max(1, snapInt(barThickness));
            width = snapInt(rawLength);
            x = isNegative ? baselineCoord - width : baselineCoord;
            capSide = width === 0 ? "none" : isNegative ? "left" : "right";
            clampedRadius = clampBarRadius(radius, height, width);
        }

        rects.push({
            seriesId: seriesItem.id,
            index,
            value: raw,
            x,
            y,
            width,
            height,
            baseline: baselineCoord,
            isNegative,
            capSide,
            radius: clampedRadius,
            path: buildRoundedBarPath(x, y, width, height, clampedRadius, capSide),
        });
    }

    return rects;
}

export function computeGroupedBarRects(options: ComputeGroupedBarsOptions): ChartBarRect[] {
    const {
        series,
        categoryStarts,
        bandwidth,
        valueScale,
        maxBarWidth = 52,
        barGap = 4,
    } = options;

    if (series.length === 0 || categoryStarts.length === 0 || bandwidth <= 0) return [];

    const seriesCount = series.length;
    const totalGap = barGap * Math.max(0, seriesCount - 1);
    const availableThickness = Math.max(1, bandwidth - totalGap);
    const barThickness = Math.min(maxBarWidth, availableThickness / seriesCount);
    const groupThickness = barThickness * seriesCount + totalGap;
    const groupOffset = (bandwidth - groupThickness) / 2;
    const baselineCoord = snapInt(valueScale.baseline);

    const rects: ChartBarRect[] = [];

    for (const [seriesIndex, seriesItem] of series.entries()) {
        const slotOffset = groupOffset + seriesIndex * (barThickness + barGap);
        rects.push(
            ...buildGroupedSeriesRects(
                seriesItem,
                slotOffset,
                barThickness,
                baselineCoord,
                options,
            ),
        );
    }

    return rects;
}

interface StackLayerTrackers {
    outermostPositive: Map<number, number>;
    outermostNegative: Map<number, number>;
    positiveCount: Map<number, number>;
    negativeCount: Map<number, number>;
}

function recordLayerExtremes(
    layer: StackedSeriesLayer,
    layerIndex: number,
    trackers: StackLayerTrackers,
): void {
    for (const datum of layer.points) {
        if (datum.value === null || datum.value === 0) continue;
        if (datum.value > 0) {
            trackers.outermostPositive.set(datum.index, layerIndex);
            trackers.positiveCount.set(
                datum.index,
                (trackers.positiveCount.get(datum.index) ?? 0) + 1,
            );
        } else {
            trackers.outermostNegative.set(datum.index, layerIndex);
            trackers.negativeCount.set(
                datum.index,
                (trackers.negativeCount.get(datum.index) ?? 0) + 1,
            );
        }
    }
}

export function partitionSeriesIntoStackSlots<T extends { id: string; stack?: string }>(
    series: readonly T[],
    stackUnstacked = false,
): readonly BarStackSlot<T>[] {
    const slots: { key: string; stackKey: string | undefined; series: T[] }[] = [];
    const slotByKey = new Map<
        string,
        { key: string; stackKey: string | undefined; series: T[] }
    >();

    for (const item of series) {
        const hasNamedStack = typeof item.stack === "string" && item.stack.length > 0;
        const key = hasNamedStack
            ? `stack:${item.stack}`
            : stackUnstacked
              ? "default"
              : `series:${item.id}`;
        const stackKey = hasNamedStack ? item.stack : undefined;

        const existing = slotByKey.get(key);
        if (existing) {
            existing.series.push(item);
        } else {
            const slot = { key, stackKey, series: [item] };
            slotByKey.set(key, slot);
            slots.push(slot);
        }
    }

    return slots;
}

function buildStackedLayerRects(
    layer: StackedSeriesLayer,
    layerIndex: number,
    trackers: StackLayerTrackers,
    barOffset: number,
    barThickness: number,
    baselineCoord: number,
    options: ComputeStackedBarsOptions,
    stackKey?: string,
): ChartBarRect[] {
    const {
        categoryStarts,
        valueScale,
        orientation = "vertical",
        radius = 4,
        segmentGap = 1.5,
        minBarLength = 2,
        normalized = false,
    } = options;

    const rects: ChartBarRect[] = [];

    for (const datum of layer.points) {
        const categoryStart = categoryStarts[datum.index];
        if (categoryStart === undefined || datum.value === null) continue;

        const isNegative = !normalized && datum.value < 0;
        const share = normalized ? Math.max(0, datum.y1 - datum.y0) : undefined;
        const effectiveEmpty = (normalized ? share : datum.value) === 0;
        const outermostMap = isNegative ? trackers.outermostNegative : trackers.outermostPositive;
        const countMap = isNegative ? trackers.negativeCount : trackers.positiveCount;
        const isOutermost = outermostMap.get(datum.index) === layerIndex;
        const hasMultipleInDirection = (countMap.get(datum.index) ?? 0) > 1;

        const coord0 = valueScale.scale(datum.y0);
        const coord1 = valueScale.scale(datum.y1);

        if (orientation === "vertical") {
            const x = snapInt(categoryStart + barOffset);
            const width = Math.max(1, snapInt(barThickness));
            const rawTop = Math.min(coord0, coord1);
            const rawBottom = Math.max(coord0, coord1);
            const rawLength = rawBottom - rawTop;

            let height = effectiveEmpty ? 0 : Math.max(minBarLength, rawLength);
            let y = isNegative ? rawTop : rawBottom - height;

            // Apply subtle inter-segment gap on non-outermost sides when stacking multiple segments.
            if (hasMultipleInDirection && !isOutermost && height > segmentGap + minBarLength) {
                height -= segmentGap;
                if (!isNegative) {
                    y += segmentGap;
                }
            }

            const snappedY = snapInt(y);
            const snappedBottom = snapInt(y + height);
            const snappedHeight = Math.max(0, snappedBottom - snappedY);
            const capSide: BarCapSide =
                snappedHeight === 0 || !isOutermost ? "none" : isNegative ? "bottom" : "top";
            const clampedRadius =
                capSide === "none" ? 0 : clampBarRadius(radius, width, snappedHeight);

            rects.push({
                seriesId: layer.seriesId,
                index: datum.index,
                value: datum.value,
                ...(share !== undefined && { share }),
                x,
                y: snappedY,
                width,
                height: snappedHeight,
                baseline: baselineCoord,
                isNegative,
                capSide,
                radius: clampedRadius,
                path: buildRoundedBarPath(
                    x,
                    snappedY,
                    width,
                    snappedHeight,
                    clampedRadius,
                    capSide,
                ),
                ...(stackKey !== undefined && { stackKey }),
            });
        } else {
            const y = snapInt(categoryStart + barOffset);
            const height = Math.max(1, snapInt(barThickness));
            const rawLeft = Math.min(coord0, coord1);
            const rawRight = Math.max(coord0, coord1);
            const rawLength = rawRight - rawLeft;

            let width = effectiveEmpty ? 0 : Math.max(minBarLength, rawLength);
            let x = isNegative ? rawRight - width : rawLeft;

            if (hasMultipleInDirection && !isOutermost && width > segmentGap + minBarLength) {
                width -= segmentGap;
                if (isNegative) {
                    x += segmentGap;
                }
            }

            const snappedX = snapInt(x);
            const snappedRight = snapInt(x + width);
            const snappedWidth = Math.max(0, snappedRight - snappedX);
            const capSide: BarCapSide =
                snappedWidth === 0 || !isOutermost ? "none" : isNegative ? "left" : "right";
            const clampedRadius =
                capSide === "none" ? 0 : clampBarRadius(radius, height, snappedWidth);

            rects.push({
                seriesId: layer.seriesId,
                index: datum.index,
                value: datum.value,
                ...(share !== undefined && { share }),
                x: snappedX,
                y,
                width: snappedWidth,
                height,
                baseline: baselineCoord,
                isNegative,
                capSide,
                radius: clampedRadius,
                path: buildRoundedBarPath(
                    snappedX,
                    y,
                    snappedWidth,
                    height,
                    clampedRadius,
                    capSide,
                ),
                ...(stackKey !== undefined && { stackKey }),
            });
        }
    }

    return rects;
}

export function computeStackedBarRects(options: ComputeStackedBarsOptions): ChartBarRect[] {
    const {
        series,
        categoryStarts,
        bandwidth,
        valueScale,
        maxBarWidth = 52,
    } = options;

    if (series.length === 0 || categoryStarts.length === 0 || bandwidth <= 0) return [];

    const { layers } = computeStackedSeries(series, { normalized: options.normalized });
    const barThickness = Math.min(maxBarWidth, bandwidth);
    const barOffset = (bandwidth - barThickness) / 2;
    const baselineCoord = snapInt(valueScale.baseline);

    // Track outermost positive & negative layer indices per category so only outer caps round.
    const trackers: StackLayerTrackers = {
        outermostPositive: new Map(),
        outermostNegative: new Map(),
        positiveCount: new Map(),
        negativeCount: new Map(),
    };

    for (const [layerIndex, layer] of layers.entries()) {
        recordLayerExtremes(layer, layerIndex, trackers);
    }

    const rects: ChartBarRect[] = [];

    for (const [layerIndex, layer] of layers.entries()) {
        rects.push(
            ...buildStackedLayerRects(
                layer,
                layerIndex,
                trackers,
                barOffset,
                barThickness,
                baselineCoord,
                options,
            ),
        );
    }

    return rects;
}

export function computeGroupedStackedBarRects(
    options: ComputeGroupedStackedBarsOptions,
): ChartBarRect[] {
    const {
        series,
        categoryStarts,
        bandwidth,
        valueScale,
        maxBarWidth = 52,
        barGap = 4,
        stackUnstacked = false,
    } = options;

    if (series.length === 0 || categoryStarts.length === 0 || bandwidth <= 0) return [];

    const slots = partitionSeriesIntoStackSlots(series, stackUnstacked);
    if (slots.length === 0) return [];

    const slotCount = slots.length;
    const totalGap = barGap * Math.max(0, slotCount - 1);
    const availableThickness = Math.max(1, bandwidth - totalGap);
    const barThickness = Math.min(maxBarWidth, availableThickness / slotCount);
    const groupThickness = barThickness * slotCount + totalGap;
    const groupOffset = (bandwidth - groupThickness) / 2;
    const baselineCoord = snapInt(valueScale.baseline);

    const rects: ChartBarRect[] = [];

    for (const [slotIndex, slot] of slots.entries()) {
        const slotOffset = groupOffset + slotIndex * (barThickness + barGap);
        const { layers } = computeStackedSeries(slot.series, { normalized: options.normalized });

        const trackers: StackLayerTrackers = {
            outermostPositive: new Map(),
            outermostNegative: new Map(),
            positiveCount: new Map(),
            negativeCount: new Map(),
        };

        for (const [layerIndex, layer] of layers.entries()) {
            recordLayerExtremes(layer, layerIndex, trackers);
        }

        for (const [layerIndex, layer] of layers.entries()) {
            rects.push(
                ...buildStackedLayerRects(
                    layer,
                    layerIndex,
                    trackers,
                    slotOffset,
                    barThickness,
                    baselineCoord,
                    options,
                    slot.stackKey,
                ),
            );
        }
    }

    return rects;
}

export function computePieArcs(options: ComputePieArcsOptions): ChartArcGeometry[] {
    const {
        slices,
        outerRadius,
        innerRadiusRatio = 0.64,
        gap = 0,
        padAngle,
        cornerRadius,
        hoverExpandPx = 3,
        selectedExpandPx = 4,
        sort = false,
    } = options;

    if (slices.length === 0 || outerRadius <= 0) return [];

    const clampedRatio = Math.max(0, Math.min(0.95, innerRadiusRatio));
    const innerRadius = outerRadius * clampedRatio;

    const sanitized = slices.map((slice, index) => ({
        ...slice,
        index,
        safeValue: Number.isFinite(slice.value) && slice.value > 0 ? slice.value : 0,
    }));

    let total = 0;
    let positiveSliceCount = 0;
    for (const item of sanitized) {
        total += item.safeValue;
        if (item.safeValue > 0) positiveSliceCount++;
    }

    if (total <= 0) return [];

    const safeGap = Math.max(0, gap);
    const safePadAngle = padAngle !== undefined ? Math.max(0, padAngle) : 0;
    const hasMultipleSlices = positiveSliceCount > 1;
    const useParallelGap = hasMultipleSlices && safeGap > 0;
    const useExplicitPadAngle = hasMultipleSlices && !useParallelGap && safePadAngle > 0;

    // Single 100% ring must close seamlessly with zero corner notch or gap.
    const defaultCornerRadius =
        hasMultipleSlices && (safeGap > 0 || safePadAngle > 0) && innerRadius > 0
            ? Math.max(0, Math.min(4, Math.floor((outerRadius - innerRadius) / 4)))
            : 0;
    const effectiveCornerRadius = hasMultipleSlices
        ? cornerRadius !== undefined
            ? Math.max(0, cornerRadius)
            : defaultCornerRadius
        : 0;

    const pieGenerator = d3Pie<(typeof sanitized)[number]>()
        .value((item) => item.safeValue)
        .padAngle(useExplicitPadAngle ? safePadAngle : 0);

    if (!sort) {
        pieGenerator.sort(null);
    }

    type ArcDatum = { startAngle: number; endAngle: number; padAngle: number };

    // Keep padRadius anchored to outerRadius on both base & hover arcs so gaps never widen on hover.
    const baseArc = d3Arc<ArcDatum>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius)
        .padRadius(outerRadius)
        .cornerRadius(effectiveCornerRadius);

    const hoverArc = d3Arc<ArcDatum>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + hoverExpandPx)
        .padRadius(outerRadius)
        .cornerRadius(effectiveCornerRadius);

    const selectedArc = d3Arc<ArcDatum>()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + selectedExpandPx)
        .padRadius(outerRadius)
        .cornerRadius(effectiveCornerRadius);

    const ringRadius = outerRadius + selectedExpandPx + 2.5;
    const selectionRingArc = d3Arc<ArcDatum>()
        .innerRadius(ringRadius)
        .outerRadius(ringRadius)
        .padRadius(outerRadius)
        .cornerRadius(0);

    const pieArcs = pieGenerator(sanitized);

    return pieArcs
        .filter((entry) => entry.data.safeValue > 0)
        .map((entry) => {
            let slicePadAngle = 0;
            if (useParallelGap) {
                const refRadius = innerRadius > 0 ? innerRadius : outerRadius;
                const sliceSpan = entry.endAngle - entry.startAngle;
                const sliceGap = Math.min(safeGap, sliceSpan * refRadius * 0.4);
                slicePadAngle = outerRadius > 0 ? sliceGap / outerRadius : 0;
            } else if (useExplicitPadAngle) {
                slicePadAngle = entry.padAngle;
            }

            const angles: ArcDatum = {
                startAngle: entry.startAngle,
                endAngle: entry.endAngle,
                padAngle: slicePadAngle,
            };
            const [cx, cy] = baseArc.centroid(angles);
            return {
                id: entry.data.id,
                label: entry.data.label,
                index: entry.data.index,
                value: entry.data.safeValue,
                share: entry.data.safeValue / total,
                startAngle: entry.startAngle,
                endAngle: entry.endAngle,
                midAngle: (entry.startAngle + entry.endAngle) / 2,
                centroid: [Number.isFinite(cx) ? cx : 0, Number.isFinite(cy) ? cy : 0] as const,
                innerRadius,
                outerRadius,
                path: baseArc(angles) ?? "",
                hoverPath: hoverArc(angles) ?? "",
                selectedPath: selectedArc(angles) ?? "",
                selectionRingPath: selectionRingArc(angles) ?? "",
            };
        });
}

/** O(log n) nearest-index lookup for ascending sorted numeric/timestamp data. */
export function bisectSortedValues<T>(
    data: readonly T[],
    target: number,
    accessor: (item: T) => number,
): number {
    if (data.length === 0) return -1;
    if (data.length === 1) return 0;

    const bisect = bisector<T, number>(accessor).left;
    const insertionIndex = bisect(data, target);

    if (insertionIndex <= 0) return 0;
    if (insertionIndex >= data.length) return data.length - 1;

    const leftItem = data[insertionIndex - 1];
    const rightItem = data[insertionIndex];
    if (leftItem === undefined || rightItem === undefined) return insertionIndex - 1;

    const leftDistance = Math.abs(target - accessor(leftItem));
    const rightDistance = Math.abs(accessor(rightItem) - target);

    return rightDistance < leftDistance ? insertionIndex : insertionIndex - 1;
}

/** Nearest-index lookup across any array of screen coordinates (supports band centers & reversed ranges). */
export function findNearestCoordinateIndex(
    target: number,
    coordinates: readonly number[],
): number {
    if (coordinates.length === 0 || !Number.isFinite(target)) return -1;

    let bestIndex = -1;
    let bestDistance = Infinity;

    for (const [index, coord] of coordinates.entries()) {
        if (!Number.isFinite(coord)) continue;
        const distance = Math.abs(coord - target);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    }

    return bestIndex;
}

export function buildWaterfallBarPath(
    x: number,
    y: number,
    width: number,
    height: number,
    tipRadius: number,
    originRadius: number,
    capSide: BarCapSide,
): string {
    if (width <= 0 || height <= 0) return "";
    if (capSide === "none" || originRadius <= 0) {
        return buildRoundedBarPath(x, y, width, height, tipRadius, capSide);
    }

    const rTip = clampBarRadius(tipRadius, width, height);
    const rOrigin = Math.max(0, Math.min(originRadius, width / 2, height - rTip));
    if (rOrigin <= 0) {
        return buildRoundedBarPath(x, y, width, height, rTip, capSide);
    }

    const rTop = capSide === "top" ? rTip : rOrigin;
    const rBottom = capSide === "bottom" ? rTip : rOrigin;
    const x2 = x + width;
    const y2 = y + height;

    return (
        `M${x},${y + rTop}` +
        `A${rTop},${rTop} 0 0 1 ${x + rTop},${y}` +
        `H${x2 - rTop}` +
        `A${rTop},${rTop} 0 0 1 ${x2},${y + rTop}` +
        `V${y2 - rBottom}` +
        `A${rBottom},${rBottom} 0 0 1 ${x2 - rBottom},${y2}` +
        `H${x + rBottom}` +
        `A${rBottom},${rBottom} 0 0 1 ${x},${y2 - rBottom}Z`
    );
}

function resolveWaterfallStepValues(
    item: WaterfallBarInput,
    running: number,
): {
    readonly value: number;
    readonly y0: number;
    readonly y1: number;
    readonly nextRunning: number;
    readonly isAnchor: boolean;
} {
    const hasFiniteValue = typeof item.value === "number" && Number.isFinite(item.value);
    if (item.type === "start") {
        const value = hasFiniteValue ? (item.value as number) : 0;
        return { value, y0: 0, y1: value, nextRunning: value, isAnchor: true };
    }
    if (item.type === "subtotal" || item.type === "total") {
        const value = hasFiniteValue ? (item.value as number) : running;
        return { value, y0: 0, y1: value, nextRunning: value, isAnchor: true };
    }
    const value = hasFiniteValue ? (item.value as number) : 0;
    const y1 = running + value;
    return { value, y0: running, y1, nextRunning: y1, isAnchor: false };
}

export function computeWaterfallSteps(items: readonly WaterfallBarInput[]): WaterfallStepsResult {
    if (items.length === 0) {
        return { steps: [], extent: [0, 0], crossesZero: false };
    }

    let running = 0;
    let minExtent = 0;
    let maxExtent = 0;
    const steps: WaterfallStepData[] = [];

    for (const item of items) {
        const resolved = resolveWaterfallStepValues(item, running);
        const { value, y0, y1, isAnchor } = resolved;
        running = resolved.nextRunning;

        if (y0 < minExtent) minExtent = y0;
        if (y1 < minExtent) minExtent = y1;
        if (y0 > maxExtent) maxExtent = y0;
        if (y1 > maxExtent) maxExtent = y1;

        const isNegative = value < 0;
        const isPositive = isAnchor ? value >= 0 : value > 0;
        const kind: ChartWaterfallBarKind =
            item.type === "delta" ? (isNegative ? "negative" : "positive") : item.type;

        steps.push({
            index: item.index,
            label: item.label,
            type: item.type,
            kind,
            value,
            y0,
            y1,
            runningTotal: running,
            isPositive,
            isNegative,
            isAnchor,
        });
    }

    return {
        steps,
        extent: [minExtent, maxExtent],
        crossesZero: minExtent < 0 && maxExtent > 0,
    };
}

export function computeWaterfallBars(
    options: ComputeWaterfallBarsOptions,
): ComputeWaterfallBarsResult {
    const {
        items,
        categoryStarts,
        bandwidth,
        valueScale,
        radius = 4,
        originRadius = 1.5,
        maxBarWidth = 52,
        minBarLength = 2,
    } = options;

    const { steps, extent, crossesZero } = computeWaterfallSteps(items);
    if (steps.length === 0 || categoryStarts.length === 0 || bandwidth <= 0) {
        return { bars: [], connectors: [], extent, crossesZero };
    }

    const barWidth = Math.max(1, snapInt(Math.min(maxBarWidth, bandwidth)));
    const barOffset = (bandwidth - barWidth) / 2;
    const bars: ChartWaterfallBarRect[] = [];

    for (const step of steps) {
        const categoryStart = categoryStarts[step.index];
        if (categoryStart === undefined) continue;

        const x = snapInt(categoryStart + barOffset);
        const coord0 = valueScale.scale(step.y0);
        const coord1 = valueScale.scale(step.y1);
        const baseline = snapInt(coord0);
        const rawTop = Math.min(coord0, coord1);
        const rawBottom = Math.max(coord0, coord1);
        const rawLength = rawBottom - rawTop;

        let y: number;
        let height: number;

        if (step.y0 === step.y1) {
            height = 0;
            y = baseline;
        } else if (rawLength < minBarLength) {
            height = Math.max(1, snapInt(minBarLength));
            y = step.y1 < step.y0 ? baseline : baseline - height;
        } else {
            const snappedTop = snapInt(rawTop);
            const snappedBottom = snapInt(rawBottom);
            y = snappedTop;
            height = Math.max(minBarLength, snappedBottom - snappedTop);
        }

        const isDownward = step.y1 < step.y0;
        const capSide: BarCapSide = height === 0 ? "none" : isDownward ? "bottom" : "top";
        const clampedRadius = capSide === "none" ? 0 : clampBarRadius(radius, barWidth, height);
        const appliedOriginRadius =
            !step.isAnchor && height >= 6 && capSide !== "none"
                ? Math.max(0, Math.min(originRadius, barWidth / 2, height - clampedRadius))
                : 0;

        bars.push({
            ...step,
            x,
            y,
            width: barWidth,
            height,
            baseline,
            capSide,
            radius: clampedRadius,
            originRadius: appliedOriginRadius,
            path: buildWaterfallBarPath(
                x,
                y,
                barWidth,
                height,
                clampedRadius,
                appliedOriginRadius,
                capSide,
            ),
        });
    }

    const connectors: ChartWaterfallConnector[] = [];
    for (let i = 0; i < bars.length - 1; i++) {
        const current = bars[i];
        const next = bars[i + 1];
        if (!current || !next) continue;

        const x1 = current.x + current.width;
        const x2 = next.x;
        const connectorY = snapHalf(valueScale.scale(current.runningTotal));
        if (x2 <= x1 || !Number.isFinite(connectorY)) continue;

        connectors.push({
            fromIndex: current.index,
            toIndex: next.index,
            x1,
            x2,
            y: connectorY,
            value: current.runningTotal,
        });
    }

    return {
        bars,
        connectors,
        extent,
        crossesZero,
    };
}

export interface BulletSizeMetrics {
    readonly rowHeight: number;
    readonly rowGap: number;
    readonly trackHeight: number;
    readonly trackRadius: number;
    readonly barRadius: number;
    readonly labelFontSize: number;
    readonly tickFontSize: number;
}

export function getBulletSizeMetrics(size: ChartSize): BulletSizeMetrics {
    switch (size) {
        case "sm": {
            return {
                rowHeight: 34,
                rowGap: 8,
                trackHeight: 12,
                trackRadius: 4,
                barRadius: 2,
                labelFontSize: 11,
                tickFontSize: 10,
            };
        }
        case "lg": {
            return {
                rowHeight: 54,
                rowGap: 16,
                trackHeight: 20,
                trackRadius: 6,
                barRadius: 3,
                labelFontSize: 13,
                tickFontSize: 11,
            };
        }
        default: {
            return {
                rowHeight: 44,
                rowGap: 12,
                trackHeight: 16,
                trackRadius: 5,
                barRadius: 2.5,
                labelFontSize: 12,
                tickFontSize: 11,
            };
        }
    }
}

export interface BulletRangeInput {
    readonly to: number;
    readonly color?: string;
}

export interface BulletRowInput {
    readonly index: number;
    readonly label: string;
    readonly subtitle?: string;
    readonly unit?: string;
    readonly actual: number;
    readonly target: number;
    readonly comparative?: number | null;
    readonly ranges?: readonly (number | BulletRangeInput)[];
    readonly max?: number;
}

export interface ComputeBulletRowsOptions {
    readonly items: readonly BulletRowInput[];
    readonly width: number;
    readonly rowHeight?: number;
    readonly rowGap?: number;
    readonly trackHeight?: number;
    readonly trackRadius?: number;
    readonly barRadius?: number;
    readonly minBarLength?: number;
    readonly sharedScale?: boolean;
    readonly paddingLeft?: number;
    readonly paddingRight?: number;
    readonly paddingTop?: number;
}

export interface ChartBulletBandRect {
    readonly tier: 1 | 2 | 3;
    readonly from: number;
    readonly to: number;
    readonly x: number;
    readonly width: number;
    readonly color?: string;
}

export interface ChartBulletRowGeometry {
    readonly index: number;
    readonly label: string;
    readonly subtitle?: string;
    readonly unit?: string;
    readonly actual: number;
    readonly target: number;
    readonly comparative: number | null;
    readonly domainMax: number;
    readonly rowY: number;
    readonly rowHeight: number;
    readonly headerY: number;
    readonly trackX: number;
    readonly trackY: number;
    readonly trackWidth: number;
    readonly trackHeight: number;
    readonly trackRadius: number;
    readonly bands: readonly ChartBulletBandRect[];
    readonly barX: number;
    readonly barY: number;
    readonly barWidth: number;
    readonly barHeight: number;
    readonly barRadius: number;
    readonly barPath: string;
    readonly targetX: number;
    readonly targetY: number;
    readonly targetWidth: number;
    readonly targetHeight: number;
    readonly comparativeX: number | null;
    readonly comparativeY: number | null;
    readonly comparativeHeight: number | null;
}

export interface ChartBulletSharedTick {
    readonly value: number;
    readonly x: number;
}

export interface ComputeBulletRowsResult {
    readonly rows: readonly ChartBulletRowGeometry[];
    readonly sharedMax: number;
    readonly totalHeight: number;
    readonly sharedTicks: readonly ChartBulletSharedTick[];
}

const BULLET_SHARED_AXIS_HEIGHT = 22;
const BULLET_BOTTOM_CLEARANCE = 4;

function sanitizeBulletNonNegative(value: number | null | undefined): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return 0;
    return Math.max(0, value);
}

function normalizeBulletRangeInputs(
    rawRanges: readonly (number | BulletRangeInput)[] | undefined,
): readonly BulletRangeInput[] {
    if (!rawRanges || rawRanges.length === 0) return [];
    const normalized: BulletRangeInput[] = [];
    for (const entry of rawRanges) {
        if (typeof entry === "number") {
            if (Number.isFinite(entry) && entry > 0) {
                normalized.push({ to: entry });
            }
        } else if (Number.isFinite(entry.to) && entry.to > 0) {
            normalized.push(entry.color ? { to: entry.to, color: entry.color } : { to: entry.to });
        }
    }
    normalized.sort((a, b) => a.to - b.to);
    return normalized;
}

function computeBulletBands(
    ranges: readonly BulletRangeInput[],
    domainMax: number,
    trackX: number,
    trackWidth: number,
    scaleValue: (val: number) => number,
): readonly ChartBulletBandRect[] {
    const effectiveRanges: readonly BulletRangeInput[] =
        ranges.length > 0
            ? ranges
            : [
                  { to: domainMax * 0.6 },
                  { to: domainMax * 0.85 },
                  { to: domainMax },
              ];

    const bands: ChartBulletBandRect[] = [];
    let prevVal = 0;
    let prevX = trackX;

    for (const [bandIndex, range] of effectiveRanges.entries()) {
        const clampedTo = Math.min(domainMax, Math.max(prevVal, range.to));
        if (clampedTo <= prevVal) continue;

        const isAtEnd = clampedTo >= domainMax;
        const nextX = isAtEnd ? trackX + trackWidth : snapInt(scaleValue(clampedTo));
        const width = Math.max(0, nextX - prevX);
        const tier = Math.min(3, bandIndex + 1) as 1 | 2 | 3;

        if (width > 0) {
            bands.push({
                tier,
                from: prevVal,
                to: clampedTo,
                x: prevX,
                width,
                ...(range.color !== undefined && { color: range.color }),
            });
        }

        prevVal = clampedTo;
        prevX = nextX;
    }

    // Fill any remaining track span cleanly when actual/target exceeds the last qualitative range.
    if (prevVal < domainMax && prevX < trackX + trackWidth) {
        bands.push({
            tier: 3,
            from: prevVal,
            to: domainMax,
            x: prevX,
            width: Math.max(0, trackX + trackWidth - prevX),
        });
    }

    return bands;
}

export function computeBulletRows(options: ComputeBulletRowsOptions): ComputeBulletRowsResult {
    const {
        items,
        width,
        rowHeight = 44,
        rowGap = 12,
        trackHeight = 16,
        trackRadius = 5,
        barRadius = 2.5,
        minBarLength = 2,
        sharedScale = false,
        paddingLeft = 0,
        paddingRight = 0,
        paddingTop = 0,
    } = options;

    if (items.length === 0) {
        return { rows: [], sharedMax: 1, totalHeight: 0, sharedTicks: [] };
    }

    const totalHeight =
        paddingTop +
        items.length * rowHeight +
        Math.max(0, items.length - 1) * rowGap +
        (sharedScale ? BULLET_SHARED_AXIS_HEIGHT : BULLET_BOTTOM_CLEARANCE);

    const trackX = snapInt(paddingLeft);
    const trackWidth = Math.max(0, snapInt(width - paddingLeft - paddingRight));

    const prepared = items.map((item) => {
        const actual = sanitizeBulletNonNegative(item.actual);
        const target = sanitizeBulletNonNegative(item.target);
        const comparative =
            typeof item.comparative === "number" && Number.isFinite(item.comparative)
                ? Math.max(0, item.comparative)
                : null;
        const ranges = normalizeBulletRangeInputs(item.ranges);
        const maxRange = ranges.length > 0 ? (ranges.at(-1)?.to ?? 0) : 0;
        const explicitMax = sanitizeBulletNonNegative(item.max);
        const rawMax = Math.max(actual, target, comparative ?? 0, maxRange, explicitMax);
        return { item, actual, target, comparative, ranges, rawMax };
    });

    let globalMax = 0;
    for (const entry of prepared) {
        if (entry.rawMax > globalMax) globalMax = entry.rawMax;
    }
    const sharedMax = globalMax > 0 ? globalMax : 1;

    const clampedTrackRadius = Math.max(0, Math.min(trackRadius, trackHeight / 2));
    const barHeight = Math.max(2, Math.round(trackHeight * 0.5));
    const targetWidth = 2.5;
    const targetHeight = barHeight + 6;
    const comparativeHeight = barHeight + 2;

    const rows: ChartBulletRowGeometry[] = [];

    for (const [rowIndex, entry] of prepared.entries()) {
        const { item, actual, target, comparative, ranges, rawMax } = entry;
        const domainMax = sharedScale ? sharedMax : rawMax > 0 ? rawMax : 1;
        const rowY = snapInt(paddingTop + rowIndex * (rowHeight + rowGap));
        const trackY = snapInt(rowY + rowHeight - trackHeight);
        const headerY = snapInt(trackY - 5);

        const scaleValue = (val: number): number => {
            if (trackWidth <= 0 || domainMax <= 0) return trackX;
            const ratio = Math.max(0, Math.min(1, val / domainMax));
            return trackX + ratio * trackWidth;
        };

        const bands = computeBulletBands(ranges, domainMax, trackX, trackWidth, scaleValue);

        const barX = trackX;
        const barY = snapInt(trackY + (trackHeight - barHeight) / 2);
        let barWidth = 0;
        if (actual > 0 && trackWidth > 0) {
            const rawBarWidth = (Math.min(actual, domainMax) / domainMax) * trackWidth;
            barWidth = Math.min(trackWidth, Math.max(minBarLength, snapInt(rawBarWidth)));
        }

        const clampedBarRadius =
            barWidth === 0 ? 0 : Math.max(0, Math.min(barRadius, 3, barHeight / 2, barWidth));
        const barPath =
            barWidth > 0
                ? buildRoundedBarPath(barX, barY, barWidth, barHeight, clampedBarRadius, "right")
                : "";

        const targetX = snapHalf(scaleValue(target));
        const targetY = barY - 3;

        const comparativeX = comparative !== null ? snapHalf(scaleValue(comparative)) : null;
        const comparativeY = comparative !== null ? barY - 1 : null;

        rows.push({
            index: item.index,
            label: item.label,
            ...(item.subtitle !== undefined && { subtitle: item.subtitle }),
            ...(item.unit !== undefined && { unit: item.unit }),
            actual,
            target,
            comparative,
            domainMax,
            rowY,
            rowHeight,
            headerY,
            trackX,
            trackY,
            trackWidth,
            trackHeight,
            trackRadius: clampedTrackRadius,
            bands,
            barX,
            barY,
            barWidth,
            barHeight,
            barRadius: clampedBarRadius,
            barPath,
            targetX,
            targetY,
            targetWidth,
            targetHeight,
            comparativeX,
            comparativeY,
            comparativeHeight: comparative !== null ? comparativeHeight : null,
        });
    }

    const sharedTicks: ChartBulletSharedTick[] = [];
    if (sharedScale && trackWidth > 0) {
        const tickCount = trackWidth < 220 ? 3 : 4;
        const linear = scaleLinear().domain([0, sharedMax]).range([trackX, trackX + trackWidth]);
        for (const tickVal of linear.ticks(tickCount)) {
            if (tickVal < 0 || tickVal > sharedMax) continue;
            sharedTicks.push({
                value: tickVal,
                x: snapInt(linear(tickVal)),
            });
        }
    }

    return {
        rows,
        sharedMax,
        totalHeight,
        sharedTicks,
    };
}

export interface HeatmapSizeMetrics {
    readonly gap: number;
    readonly radius: number;
    readonly fontSize: number;
    readonly defaultCellHeight: number;
}

export function getHeatmapSizeMetrics(size: ChartSize): HeatmapSizeMetrics {
    switch (size) {
        case "sm": {
            return {
                gap: 2,
                radius: 4,
                fontSize: 10,
                defaultCellHeight: 28,
            };
        }
        case "lg": {
            return {
                gap: 3,
                radius: 6,
                fontSize: 11,
                defaultCellHeight: 40,
            };
        }
        default: {
            return {
                gap: 2.5,
                radius: 5,
                fontSize: 11,
                defaultCellHeight: 34,
            };
        }
    }
}

export interface HeatmapCellInput<TDatum = unknown> {
    readonly x: string;
    readonly y: string;
    readonly value: number | null | undefined;
    readonly datum?: TDatum;
}

export interface ComputeHeatmapGridOptions<TDatum = unknown> {
    readonly cells?: readonly HeatmapCellInput<TDatum>[];
    readonly xCategories?: readonly string[];
    readonly yCategories?: readonly string[];
    readonly width: number;
    readonly height: number;
    readonly size?: ChartSize;
    readonly gap?: number;
    readonly radius?: number;
    readonly mode?: ChartHeatmapMode;
    readonly domain?: readonly [number, number];
    readonly pivot?: number;
}

export interface ChartHeatmapCellGeometry<TDatum = unknown> {
    readonly index: number;
    readonly row: number;
    readonly col: number;
    readonly xCategory: string;
    readonly yCategory: string;
    readonly value: number | null;
    readonly isEmpty: boolean;
    readonly t: number | null;
    readonly invertFg: boolean;
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly rx: number;
    readonly centerX: number;
    readonly centerY: number;
    readonly datum: TDatum | null;
}

export interface ComputeHeatmapGridResult<TDatum = unknown> {
    readonly cells: readonly ChartHeatmapCellGeometry<TDatum>[];
    readonly xCategories: readonly string[];
    readonly yCategories: readonly string[];
    readonly colPositions: readonly {
        readonly category: string;
        readonly x: number;
        readonly width: number;
        readonly center: number;
    }[];
    readonly rowPositions: readonly {
        readonly category: string;
        readonly y: number;
        readonly height: number;
        readonly center: number;
    }[];
    readonly domain: readonly [number, number];
    readonly pivot: number;
    readonly mode: ChartHeatmapMode;
}

function deduplicateOrderedCategories(values: readonly string[]): readonly string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const raw of values) {
        const key = String(raw);
        if (!seen.has(key)) {
            seen.add(key);
            ordered.push(key);
        }
    }
    return ordered;
}

function computeBandTracks(
    count: number,
    totalSpan: number,
    gap: number,
): readonly { readonly start: number; readonly length: number; readonly center: number }[] {
    if (count <= 0) return [];
    const safeSpan = Math.max(0, totalSpan);
    const maxAllowedGap = count > 1 ? Math.max(0, (safeSpan - count) / (count - 1)) : 0;
    const effectiveGap = Math.max(0, Math.min(gap, maxAllowedGap));
    const totalGap = effectiveGap * Math.max(0, count - 1);
    const available = Math.max(0, safeSpan - totalGap);
    const bandLength = available / count;

    const tracks: { readonly start: number; readonly length: number; readonly center: number }[] =
        [];
    for (let i = 0; i < count; i++) {
        const rawStart = i * (bandLength + effectiveGap);
        const rawEnd = rawStart + bandLength;
        const start = snapInt(rawStart);
        const end = snapInt(rawEnd);
        const length = Math.max(1, end - start);
        tracks.push({
            start,
            length,
            center: start + length / 2,
        });
    }
    return tracks;
}

export function resolveHeatmapCellColor(
    t: number | null,
    ramp: "accent" | "teal" | "emerald" | "slate" | "amber" | "rose" | "diverging",
    mode: ChartHeatmapMode = "sequential",
): string {
    if (t === null || !Number.isFinite(t)) {
        return "var(--cs-chart-heatmap-empty)";
    }

    const clamped = Math.max(0, Math.min(1, t));
    const useDiverging = mode === "diverging" || ramp === "diverging";

    if (useDiverging) {
        if (clamped < 0.14) return "var(--cs-chart-heatmap-div-neg-3)";
        if (clamped < 0.28) return "var(--cs-chart-heatmap-div-neg-2)";
        if (clamped < 0.43) return "var(--cs-chart-heatmap-div-neg-1)";
        if (clamped <= 0.57) return "var(--cs-chart-heatmap-mid)";
        if (clamped <= 0.72) return "var(--cs-chart-heatmap-div-pos-1)";
        if (clamped <= 0.86) return "var(--cs-chart-heatmap-div-pos-2)";
        return "var(--cs-chart-heatmap-div-pos-3)";
    }

    const step = Math.max(1, Math.min(7, Math.floor(clamped * 7) + 1));
    return `var(--cs-chart-heatmap-${ramp}-${step})`;
}

export function deduplicateHeatmapCategories(values: readonly string[]): readonly string[] {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const raw of values) {
        const key = String(raw);
        if (!seen.has(key)) {
            seen.add(key);
            ordered.push(key);
        }
    }
    return ordered;
}

export function computeHeatmapGrid<TDatum = unknown>(
    options: ComputeHeatmapGridOptions<TDatum>,
): ComputeHeatmapGridResult<TDatum> {
    const {
        cells: rawCells = [],
        xCategories: explicitXCategories,
        yCategories: explicitYCategories,
        width,
        height,
        size = "md",
        gap,
        radius,
        mode = "sequential",
        domain: explicitDomain,
        pivot = 0,
    } = options;

    const metrics = getHeatmapSizeMetrics(size);
    const resolvedGap = gap !== undefined && Number.isFinite(gap) ? Math.max(0, gap) : metrics.gap;
    const requestedRadius =
        radius !== undefined && Number.isFinite(radius) ? Math.max(0, radius) : metrics.radius;
    const safePivot = Number.isFinite(pivot) ? pivot : 0;

    const xCategories = deduplicateOrderedCategories(
        explicitXCategories && explicitXCategories.length > 0
            ? explicitXCategories
            : rawCells.map((item) => item.x),
    );
    const yCategories = deduplicateOrderedCategories(
        explicitYCategories && explicitYCategories.length > 0
            ? explicitYCategories
            : rawCells.map((item) => item.y),
    );

    if (xCategories.length === 0 || yCategories.length === 0) {
        const fallbackDomain: readonly [number, number] =
            explicitDomain ?? (mode === "diverging" ? [safePivot - 1, safePivot + 1] : [0, 1]);
        return {
            cells: [],
            xCategories,
            yCategories,
            colPositions: [],
            rowPositions: [],
            domain: fallbackDomain,
            pivot: safePivot,
            mode,
        };
    }

    const cellLookup = new Map<string, { value: number | null; datum: TDatum | null }>();
    const numericValues: number[] = [];

    for (const item of rawCells) {
        const xKey = String(item.x);
        const yKey = String(item.y);
        const compositeKey = `${yKey}\0${xKey}`;
        const rawVal = item.value;
        const cleanVal =
            typeof rawVal === "number" && Number.isFinite(rawVal) ? rawVal : null;
        if (cleanVal !== null) {
            numericValues.push(cleanVal);
        }
        cellLookup.set(compositeKey, {
            value: cleanVal,
            datum: item.datum ?? null,
        });
    }

    let domainMin = 0;
    let domainMax = 1;

    if (
        explicitDomain &&
        Number.isFinite(explicitDomain[0]) &&
        Number.isFinite(explicitDomain[1])
    ) {
        domainMin = Math.min(explicitDomain[0], explicitDomain[1]);
        domainMax = Math.max(explicitDomain[0], explicitDomain[1]);
    } else if (numericValues.length > 0) {
        domainMin = Math.min(...numericValues);
        domainMax = Math.max(...numericValues);
        if (mode === "diverging") {
            domainMin = Math.min(domainMin, safePivot);
            domainMax = Math.max(domainMax, safePivot);
        }
    } else if (mode === "diverging") {
        domainMin = safePivot - 1;
        domainMax = safePivot + 1;
    }

    const colTracks = computeBandTracks(xCategories.length, width, resolvedGap);
    const rowTracks = computeBandTracks(yCategories.length, height, resolvedGap);

    const colPositions = xCategories.map((category, col) => {
        const track = colTracks[col] ?? { start: 0, length: 0, center: 0 };
        return {
            category,
            x: track.start,
            width: track.length,
            center: track.center,
        };
    });

    const rowPositions = yCategories.map((category, row) => {
        const track = rowTracks[row] ?? { start: 0, length: 0, center: 0 };
        return {
            category,
            y: track.start,
            height: track.length,
            center: track.center,
        };
    });

    const normalizeValue = (val: number): number => {
        if (mode === "diverging") {
            if (domainMin === domainMax) return 0.5;
            if (val < safePivot) {
                const negSpan = safePivot - domainMin;
                if (negSpan <= 0) return 0.5;
                const ratio = (val - domainMin) / negSpan;
                return Math.max(0, Math.min(0.5, ratio * 0.5));
            }
            if (val > safePivot) {
                const posSpan = domainMax - safePivot;
                if (posSpan <= 0) return 0.5;
                const ratio = (val - safePivot) / posSpan;
                return Math.max(0.5, Math.min(1, 0.5 + ratio * 0.5));
            }
            return 0.5;
        }

        if (domainMax <= domainMin) return 0.5;
        const ratio = (val - domainMin) / (domainMax - domainMin);
        return Math.max(0, Math.min(1, ratio));
    };

    const cells: ChartHeatmapCellGeometry<TDatum>[] = [];

    for (const [row, yCategory] of yCategories.entries()) {
        const rowPos = rowPositions[row] ?? { category: yCategory, y: 0, height: 0, center: 0 };
        for (const [col, xCategory] of xCategories.entries()) {
            const colPos = colPositions[col] ?? {
                category: xCategory,
                x: 0,
                width: 0,
                center: 0,
            };
            const index = row * xCategories.length + col;
            const entry = cellLookup.get(`${yCategory}\0${xCategory}`);
            const val = entry?.value ?? null;
            const isEmpty = val === null;
            const t = val !== null ? normalizeValue(val) : null;
            const invertFg =
                t !== null &&
                (mode === "diverging" ? Math.abs(t - 0.5) >= 0.28 : t >= 0.55);
            const rx = Math.max(
                0,
                Math.min(requestedRadius, colPos.width / 2, rowPos.height / 2),
            );

            cells.push({
                index,
                row,
                col,
                xCategory,
                yCategory,
                value: val,
                isEmpty,
                t,
                invertFg,
                x: colPos.x,
                y: rowPos.y,
                width: colPos.width,
                height: rowPos.height,
                rx,
                centerX: colPos.center,
                centerY: rowPos.center,
                datum: entry?.datum ?? null,
            });
        }
    }

    return {
        cells,
        xCategories,
        yCategories,
        colPositions,
        rowPositions,
        domain: [domainMin, domainMax],
        pivot: safePivot,
        mode,
    };
}
