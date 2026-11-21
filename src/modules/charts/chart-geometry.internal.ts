import { bisector } from "d3-array";
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
    type CurveFactory,
} from "d3-shape";

import type { ChartCurve, ChartNumericScale, ChartOrientation } from "./chart-state.svelte.ts";

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

export interface StackedSeriesResult {
    layers: readonly StackedSeriesLayer[];
    extent: readonly [number, number];
}

export type BarCapSide = "top" | "bottom" | "right" | "left" | "none";

export interface ChartBarRect {
    seriesId: string;
    index: number;
    value: number;
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

export function computeStackedSeries(series: readonly StackedSeriesInput[]): StackedSeriesResult {
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

    for (let index = 0; index < maxLength; index++) {
        const row: Record<string, number> = {};
        for (const item of series) {
            const raw = item.values[index];
            row[item.id] = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
        }
        rows.push(row);
    }

    const stacked = d3Stack<Record<string, number>>().keys(keys).offset(stackOffsetDiverging)(rows);

    let minExtent = 0;
    let maxExtent = 0;

    const layers: StackedSeriesLayer[] = stacked.map((seriesStack, seriesIndex) => {
        const sourceSeries = series[seriesIndex];
        const points: StackedDatum[] = seriesStack.map((pair, index) => {
            const y0 = Number.isFinite(pair[0]) ? pair[0] : 0;
            const y1 = Number.isFinite(pair[1]) ? pair[1] : 0;
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
    } = options;

    const rects: ChartBarRect[] = [];

    for (const datum of layer.points) {
        const categoryStart = categoryStarts[datum.index];
        if (categoryStart === undefined || datum.value === null) continue;

        const isNegative = datum.value < 0;
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

            let height = datum.value === 0 ? 0 : Math.max(minBarLength, rawLength);
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

            let width = datum.value === 0 ? 0 : Math.max(minBarLength, rawLength);
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

    const { layers } = computeStackedSeries(series);
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
        const { layers } = computeStackedSeries(slot.series);

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
