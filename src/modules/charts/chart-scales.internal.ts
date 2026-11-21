import { extent } from "d3-array";
import { scaleBand, scaleLinear, scalePoint, scaleTime } from "d3-scale";
import { timeDay, timeMinute, timeMonth, timeYear } from "d3-time";

import type {
    ChartAxisDomain,
    ChartNumericScale,
    ChartResolvedXScaleType,
    ChartXScale,
    ChartXScaleType,
    ChartXValue,
} from "./chart-state.svelte.ts";

export interface CreateXScaleOptions {
    values: readonly ChartXValue[];
    range: readonly [number, number];
    type?: ChartXScaleType;
    preferBand?: boolean;
    paddingInner?: number;
    paddingOuter?: number;
    pointPadding?: number;
    domain?: ChartAxisDomain;
    tickCount?: number;
}

export interface CreateNumericScaleOptions {
    values: readonly (number | null | undefined)[];
    range: readonly [number, number];
    includeZero?: boolean;
    paddingRatio?: number;
    domain?: ChartAxisDomain;
    nice?: boolean;
    tickCount?: number;
}

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

function toTimestamp(value: ChartXValue): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === "number") return value;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function toNumericValue(value: ChartXValue): number {
    if (typeof value === "number") return value;
    if (value instanceof Date) return value.getTime();
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
}

function deduplicateStrings(values: readonly ChartXValue[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const value of values) {
        const key = value instanceof Date ? value.toISOString() : String(value);
        if (!seen.has(key)) {
            seen.add(key);
            result.push(key);
        }
    }

    return result;
}

function findNearestCategorical(
    pixel: number,
    domain: readonly string[],
    getCenter: (value: string) => number,
): string | null {
    if (domain.length === 0) return null;

    let bestItem = domain[0] ?? null;
    let bestDistance = Infinity;

    for (const item of domain) {
        const distance = Math.abs(getCenter(item) - pixel);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestItem = item;
        }
    }

    return bestItem;
}

export function inferXScaleType(
    values: readonly ChartXValue[],
    requested: ChartXScaleType = "auto",
    preferBand = true,
): ChartResolvedXScaleType {
    if (requested !== "auto") return requested;

    for (const value of values) {
        if (value instanceof Date) return "time";
        if (typeof value === "string") return preferBand ? "band" : "point";
        if (typeof value === "number" && Number.isFinite(value)) return "linear";
    }

    return preferBand ? "band" : "linear";
}

function createEmptyXScale(
    type: ChartResolvedXScaleType,
    range: readonly [number, number],
): ChartXScale {
    const [rangeStart, rangeEnd] = range;
    const midpoint = (rangeStart + rangeEnd) / 2;

    return {
        type,
        range: [rangeStart, rangeEnd],
        domain: [],
        bandwidth: 0,
        step: 0,
        scale: () => rangeStart,
        center: () => midpoint,
        invert: () => null,
        ticks: () => [],
    };
}

export function createXScale(options: CreateXScaleOptions): ChartXScale {
    const {
        values,
        range,
        type = "auto",
        preferBand = true,
        paddingInner = 0.24,
        paddingOuter = 0.28,
        pointPadding = 0,
        domain: domainOverride,
        tickCount = 6,
    } = options;

    const resolvedType = inferXScaleType(values, type, preferBand);
    const [rangeStart, rangeEnd] = range;

    if (values.length === 0) {
        return createEmptyXScale(resolvedType, range);
    }

    if (resolvedType === "band") {
        const domain = deduplicateStrings(values);
        if (domain.length === 0) return createEmptyXScale("band", range);

        const band = scaleBand<string>()
            .domain(domain)
            .range([rangeStart, rangeEnd])
            .paddingInner(paddingInner)
            .paddingOuter(paddingOuter);

        const bandwidth = band.bandwidth();
        const step = band.step();
        const getStart = (value: ChartXValue): number => {
            const key = value instanceof Date ? value.toISOString() : String(value);
            return band(key) ?? rangeStart;
        };
        const getCenter = (value: ChartXValue): number => getStart(value) + bandwidth / 2;

        return {
            type: "band",
            range: [rangeStart, rangeEnd],
            domain,
            bandwidth,
            step,
            scale: getStart,
            center: getCenter,
            invert: (pixel) => findNearestCategorical(pixel, domain, getCenter),
            ticks: () => domain,
        };
    }

    if (resolvedType === "point") {
        const domain = deduplicateStrings(values);
        if (domain.length === 0) return createEmptyXScale("point", range);

        const point = scalePoint<string>()
            .domain(domain)
            .range([rangeStart, rangeEnd])
            .padding(pointPadding)
            .align(0.5);

        const step = point.step();
        const getCoord = (value: ChartXValue): number => {
            const key = value instanceof Date ? value.toISOString() : String(value);
            return point(key) ?? rangeStart;
        };

        return {
            type: "point",
            range: [rangeStart, rangeEnd],
            domain,
            bandwidth: 0,
            step,
            scale: getCoord,
            center: getCoord,
            invert: (pixel) => findNearestCategorical(pixel, domain, getCoord),
            ticks: () => domain,
        };
    }

    if (resolvedType === "time") {
        const timestamps: number[] = [];
        for (const value of values) {
            const ms = toTimestamp(value);
            if (Number.isFinite(ms)) timestamps.push(ms);
        }

        const [rawMin, rawMax] = extent(timestamps);
        if (rawMin === undefined || rawMax === undefined) {
            return createEmptyXScale("time", range);
        }

        const minMs = rawMin === rawMax ? rawMin - HALF_DAY_MS : rawMin;
        const maxMs = rawMin === rawMax ? rawMax + HALF_DAY_MS : rawMax;
        const domainDates: [Date, Date] = [new Date(minMs), new Date(maxMs)];

        const timeScale = scaleTime().domain(domainDates).range([rangeStart, rangeEnd]);

        const getCoord = (value: ChartXValue): number => {
            const ms = toTimestamp(value);
            if (!Number.isFinite(ms)) return rangeStart;
            return timeScale(new Date(ms));
        };

        const step =
            timestamps.length > 1
                ? Math.abs(rangeEnd - rangeStart) / (timestamps.length - 1)
                : Math.abs(rangeEnd - rangeStart);

        return {
            type: "time",
            range: [rangeStart, rangeEnd],
            domain: domainDates,
            bandwidth: 0,
            step,
            scale: getCoord,
            center: getCoord,
            invert: (pixel) => timeScale.invert(pixel),
            ticks: (count) => timeScale.ticks(count ?? tickCount),
        };
    }

    // Linear X scale
    const numericValues: number[] = [];
    for (const value of values) {
        const numeric = toNumericValue(value);
        if (Number.isFinite(numeric)) numericValues.push(numeric);
    }

    const [rawMin, rawMax] = extent(numericValues);
    if (rawMin === undefined || rawMax === undefined) {
        return createEmptyXScale("linear", range);
    }

    let minVal = rawMin;
    let maxVal = rawMax;

    if (domainOverride) {
        const [minSpec, maxSpec] = domainOverride;
        if (typeof minSpec === "number" && Number.isFinite(minSpec)) {
            minVal = minSpec;
        }
        if (typeof maxSpec === "number" && Number.isFinite(maxSpec)) {
            maxVal = maxSpec;
        }
    }

    if (minVal === maxVal) {
        const pad = minVal === 0 ? 1 : Math.abs(minVal) * 0.1;
        minVal -= pad;
        maxVal += pad;
    }

    const linear = scaleLinear().domain([minVal, maxVal]).range([rangeStart, rangeEnd]);
    const finalDomain = linear.domain();
    const resolvedDomain: [number, number] = [finalDomain[0] ?? minVal, finalDomain[1] ?? maxVal];

    const getCoord = (value: ChartXValue): number => {
        const numeric = toNumericValue(value);
        if (!Number.isFinite(numeric)) return rangeStart;
        return linear(numeric);
    };

    const step =
        numericValues.length > 1
            ? Math.abs(rangeEnd - rangeStart) / (numericValues.length - 1)
            : Math.abs(rangeEnd - rangeStart);

    return {
        type: "linear",
        range: [rangeStart, rangeEnd],
        domain: resolvedDomain,
        bandwidth: 0,
        step,
        scale: getCoord,
        center: getCoord,
        invert: (pixel) => linear.invert(pixel),
        ticks: (count) => linear.ticks(count ?? tickCount),
    };
}

export function createNumericScale(options: CreateNumericScaleOptions): ChartNumericScale {
    const {
        values,
        range,
        includeZero = true,
        paddingRatio = 0,
        domain: domainOverride,
        nice = true,
        tickCount = 5,
    } = options;

    const [rangeStart, rangeEnd] = range;
    const finiteValues: number[] = [];

    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value)) {
            finiteValues.push(value);
        }
    }

    const [extentMin, extentMax] = extent(finiteValues);
    const hasData = extentMin !== undefined && extentMax !== undefined;
    const dataMin = hasData ? extentMin : 0;
    const dataMax = hasData ? extentMax : 1;

    let minBound: number;
    let maxBound: number;

    if (!hasData || (dataMin === 0 && dataMax === 0)) {
        minBound = 0;
        maxBound = 1;
    } else if (dataMin === dataMax) {
        if (includeZero) {
            if (dataMin > 0) {
                minBound = 0;
                maxBound = dataMax * (1 + Math.max(0, paddingRatio));
            } else {
                minBound = dataMin * (1 + Math.max(0, paddingRatio));
                maxBound = 0;
            }
        } else {
            const delta = Math.abs(dataMin) * Math.max(0.1, paddingRatio) || 1;
            minBound = dataMin - delta;
            maxBound = dataMax + delta;
        }
    } else {
        const span = dataMax - dataMin;
        const pad = span * Math.max(0, paddingRatio);

        minBound = includeZero && dataMin > 0 ? 0 : dataMin - (dataMin < 0 || !includeZero ? pad : 0);
        maxBound = includeZero && dataMax < 0 ? 0 : dataMax + (dataMax > 0 || !includeZero ? pad : 0);
    }

    const minSpec = domainOverride?.[0] ?? "auto";
    const maxSpec = domainOverride?.[1] ?? "auto";

    if (typeof minSpec === "number" && Number.isFinite(minSpec)) {
        minBound = minSpec;
    } else if (minSpec === "dataMin") {
        minBound = dataMin;
    }

    if (typeof maxSpec === "number" && Number.isFinite(maxSpec)) {
        maxBound = maxSpec;
    } else if (maxSpec === "dataMax") {
        maxBound = dataMax;
    }

    if (minBound === maxBound) {
        const fallbackPad = minBound === 0 ? 1 : Math.abs(minBound) * 0.1;
        minBound -= fallbackPad;
        maxBound += fallbackPad;
    }

    const linear = scaleLinear().domain([minBound, maxBound]).range([rangeStart, rangeEnd]);

    if (nice && minSpec === "auto" && maxSpec === "auto") {
        linear.nice(tickCount);
    } else if (nice && (minSpec === "auto" || maxSpec === "auto")) {
        // Apply nice rounding only to the auto bound without shifting an explicit bound.
        const probe = scaleLinear().domain([minBound, maxBound]).nice(tickCount).domain();
        const niceMin = minSpec === "auto" ? (probe[0] ?? minBound) : minBound;
        const niceMax = maxSpec === "auto" ? (probe[1] ?? maxBound) : maxBound;
        linear.domain([niceMin, niceMax]);
    }

    const resolvedDomain = linear.domain();
    const finalMin = resolvedDomain[0] ?? minBound;
    const finalMax = resolvedDomain[1] ?? maxBound;
    const crossesZero = finalMin < 0 && finalMax > 0;

    let baselineValue: number;
    if (finalMin <= 0 && finalMax >= 0) {
        baselineValue = 0;
    } else if (finalMin > 0) {
        baselineValue = finalMin;
    } else {
        baselineValue = finalMax;
    }

    const baseline = linear(baselineValue);

    return {
        type: "linear",
        domain: [finalMin, finalMax],
        range: [rangeStart, rangeEnd],
        crossesZero,
        baseline,
        scale: (value) => linear(value),
        invert: (pixel) => linear.invert(pixel),
        ticks: (count) => linear.ticks(count ?? tickCount),
    };
}

export function formatDefaultTick(value: ChartXValue): string {
    if (value instanceof Date) {
        if (timeMinute(value).getTime() < value.getTime()) {
            return value.toLocaleTimeString(undefined, { minute: "2-digit", second: "2-digit" });
        }
        if (timeDay(value).getTime() < value.getTime()) {
            return value.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
        }
        if (timeMonth(value).getTime() < value.getTime()) {
            return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        }
        if (timeYear(value).getTime() < value.getTime()) {
            return value.toLocaleDateString(undefined, { month: "short" });
        }
        return String(value.getFullYear());
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value.toLocaleString() : "";
    }

    return value;
}
