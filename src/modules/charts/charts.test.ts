import { beforeEach, describe, expect, test } from "vitest";

import {
    bisectSortedValues,
    buildAreaPath,
    buildLinePath,
    buildRoundedBarPath,
    buildWaterfallBarPath,
    clampBarRadius,
    computeBulletRows,
    computeGroupedBarRects,
    computeGroupedStackedBarRects,
    computeHeatmapGrid,
    computePieArcs,
    computeStackedBarRects,
    computeStackedSeries,
    computeWaterfallBars,
    computeWaterfallSteps,
    deduplicateHeatmapCategories,
    findNearestCoordinateIndex,
    getBulletSizeMetrics,
    getHeatmapSizeMetrics,
    partitionSeriesIntoStackSlots,
    resolveHeatmapCellColor,
    snapHalf,
    snapInt,
    type BulletRowInput,
    type HeatmapCellInput,
    type WaterfallBarInput,
} from "./chart-geometry.internal.ts";
import {
    clearMeasureCache,
    computeChartMargins,
    computeRotatedTickHeight,
    measureTextWidth,
    resolveDirectLabelPositions,
    thinAxisTicks,
    truncateTextToWidth,
    wrapTickLabel,
} from "./chart-measure.internal.ts";
import {
    createNumericScale,
    createXScale,
    formatDefaultTick,
    formatPercentTick,
    inferXScaleType,
} from "./chart-scales.internal.ts";
import * as chartsExports from "./index.ts";
import {
    CHART_HEATMAP_MODES,
    CHART_HEATMAP_RAMPS,
    CHART_MONOTONE_HUES,
    CHART_PALETTES,
    CHART_SIZES,
    CHART_TONES,
    CHART_VARIANTS,
    CHART_WATERFALL_ROW_TYPES,
    CHART_WATERFALL_TOTAL_TONES,
    ChartState,
    resolveSeriesColor,
    resolveToneColor,
    type ChartSeries,
} from "./index.ts";

function countMoveCommands(path: string): number {
    return path.match(/M/g)?.length ?? 0;
}

function getItemX(item: { x: number }): number {
    return item.x;
}

function requireBarRect<T extends { seriesId: string; index: number }>(
    rects: readonly T[],
    seriesId: string,
    index: number,
): T {
    const match = rects.find((rect) => rect.seriesId === seriesId && rect.index === index);
    if (!match) {
        throw new Error(`Expected bar rect for series "${seriesId}" at index ${index}`);
    }
    return match;
}

describe("Charts M0 — Scales (chart-scales.internal.ts)", () => {
    describe("inferXScaleType", () => {
        test("infers time for Date, band/point for string, and linear for number", () => {
            expect(inferXScaleType([new Date(2026, 0, 1), new Date(2026, 1, 1)])).toBe("time");
            expect(inferXScaleType(["Jan", "Feb", "Mar"], "auto", true)).toBe("band");
            expect(inferXScaleType(["Jan", "Feb", "Mar"], "auto", false)).toBe("point");
            expect(inferXScaleType([1, 2, 3])).toBe("linear");
        });

        test("handles empty, non-finite, mixed values, and explicit overrides", () => {
            expect(inferXScaleType([], "auto", true)).toBe("band");
            expect(inferXScaleType([], "auto", false)).toBe("linear");
            expect(inferXScaleType([NaN, Infinity], "auto", false)).toBe(
                "linear",
            );
            expect(inferXScaleType([NaN, "Q1"], "auto", true)).toBe("band");
            expect(inferXScaleType([new Date(2026, 0, 1), "Q1"])).toBe("time");
            expect(inferXScaleType(["Jan", "Feb"], "point")).toBe("point");
            expect(inferXScaleType([], "time")).toBe("time");
        });
    });

    describe("createXScale", () => {
        test("returns safe empty scale when values are empty or all invalid", () => {
            const emptyBand = createXScale({ values: [], range: [0, 400] });
            expect(emptyBand.type).toBe("band");
            expect(emptyBand.domain).toEqual([]);
            expect(emptyBand.bandwidth).toBe(0);
            expect(emptyBand.step).toBe(0);
            expect(emptyBand.scale("Jan")).toBe(0);
            expect(emptyBand.center("Jan")).toBe(200);
            expect(emptyBand.invert(150)).toBeNull();
            expect(emptyBand.ticks()).toEqual([]);

            const invalidLinear = createXScale({
                values: [NaN],
                range: [10, 210],
                type: "linear",
            });
            expect(invalidLinear.domain).toEqual([]);
            expect(invalidLinear.scale(5)).toBe(10);
            expect(invalidLinear.invert(100)).toBeNull();

            const invalidTime = createXScale({
                values: ["not-a-date"],
                range: [0, 300],
                type: "time",
            });
            expect(invalidTime.domain).toEqual([]);
            expect(invalidTime.invert(150)).toBeNull();
        });

        test("builds band and point scales with deduplicated domains and nearest invert", () => {
            const band = createXScale({
                values: ["Q1", "Q2", "Q2", "Q3"],
                range: [0, 300],
                type: "band",
            });
            expect(band.domain).toEqual(["Q1", "Q2", "Q3"]);
            expect(band.bandwidth).toBeGreaterThan(0);
            expect(band.step).toBeGreaterThan(band.bandwidth);
            expect(band.center("Q2")).toBeCloseTo(band.scale("Q2") + band.bandwidth / 2, 6);
            expect(band.invert(band.center("Q1"))).toBe("Q1");
            expect(band.invert(band.center("Q3"))).toBe("Q3");
            expect(band.ticks()).toEqual(["Q1", "Q2", "Q3"]);

            const point = createXScale({
                values: ["A", "B", "C"],
                range: [0, 200],
                preferBand: false,
            });
            expect(point.type).toBe("point");
            expect(point.bandwidth).toBe(0);
            expect(point.scale("A")).toBe(0);
            expect(point.scale("B")).toBe(100);
            expect(point.scale("C")).toBe(200);
            expect(point.center("B")).toBe(point.scale("B"));
            expect(point.invert(110)).toBe("B");
        });

        test("builds time scales including single-datum 24h padding", () => {
            const d1 = new Date(Date.UTC(2026, 0, 1));
            const d2 = new Date(Date.UTC(2026, 0, 11));
            const multi = createXScale({ values: [d1, d2], range: [0, 500] });

            expect(multi.type).toBe("time");
            expect(multi.scale(d1)).toBeCloseTo(0, 6);
            expect(multi.scale(d2)).toBeCloseTo(500, 6);
            expect(multi.invert(250)).toBeInstanceOf(Date);
            expect(multi.ticks().length).toBeGreaterThan(0);

            const single = createXScale({ values: [d1], range: [0, 400] });
            expect(single.type).toBe("time");
            expect(single.scale(d1)).toBeCloseTo(200, 6);
            const [startDate, endDate] = single.domain as readonly [Date, Date];
            expect(endDate.getTime() - startDate.getTime()).toBe(24 * 60 * 60 * 1000);
        });

        test("builds linear X scales with single-datum expansion and domain overrides", () => {
            const single = createXScale({ values: [50], range: [0, 200] });
            expect(single.type).toBe("linear");
            expect(single.domain).toEqual([45, 55]);
            expect(single.scale(50)).toBeCloseTo(100, 6);

            const singleZero = createXScale({ values: [0], range: [0, 200] });
            expect(singleZero.domain).toEqual([-1, 1]);

            const overridden = createXScale({
                values: [10, 20, 30],
                range: [0, 300],
                domain: [0, 60],
            });
            expect(overridden.domain).toEqual([0, 60]);
            expect(overridden.scale(30)).toBeCloseTo(150, 6);
            expect(overridden.invert(150)).toBeCloseTo(30, 6);
        });
    });

    describe("createNumericScale", () => {
        test("handles empty data and all-zero datasets without NaN or zero-span domains", () => {
            const empty = createNumericScale({
                values: [null, undefined, NaN],
                range: [200, 0],
            });
            expect(empty.domain).toEqual([0, 1]);
            expect(empty.crossesZero).toBe(false);
            expect(empty.baseline).toBeCloseTo(200, 6);

            const zeros = createNumericScale({ values: [0, 0, 0], range: [200, 0] });
            expect(zeros.domain).toEqual([0, 1]);
            expect(zeros.crossesZero).toBe(false);
            expect(zeros.baseline).toBeCloseTo(200, 6);
        });

        test("handles single positive and single negative datum with includeZero true vs false", () => {
            const posZero = createNumericScale({
                values: [42],
                range: [200, 0],
                includeZero: true,
            });
            expect(posZero.domain[0]).toBe(0);
            expect(posZero.domain[1]).toBeGreaterThanOrEqual(42);
            expect(posZero.crossesZero).toBe(false);
            expect(posZero.baseline).toBeCloseTo(posZero.scale(0), 6);

            const posNoZero = createNumericScale({
                values: [42],
                range: [200, 0],
                includeZero: false,
                nice: false,
            });
            expect(posNoZero.domain[0]).toBeGreaterThan(0);
            expect(posNoZero.domain[0]).toBeLessThan(42);
            expect(posNoZero.domain[1]).toBeGreaterThan(42);
            expect(posNoZero.baseline).toBeCloseTo(posNoZero.scale(posNoZero.domain[0]), 6);

            const negZero = createNumericScale({
                values: [-42],
                range: [200, 0],
                includeZero: true,
            });
            expect(negZero.domain[0]).toBeLessThanOrEqual(-42);
            expect(negZero.domain[1]).toBe(0);
            expect(negZero.crossesZero).toBe(false);
            expect(negZero.baseline).toBeCloseTo(negZero.scale(0), 6);

            const negNoZero = createNumericScale({
                values: [-42],
                range: [200, 0],
                includeZero: false,
                nice: false,
            });
            expect(negNoZero.domain[0]).toBeLessThan(-42);
            expect(negNoZero.domain[1]).toBeLessThan(0);
            expect(negNoZero.baseline).toBeCloseTo(negNoZero.scale(negNoZero.domain[1]), 6);
        });

        test("handles all-negative and negative-to-positive zero-crossing domains", () => {
            const allNeg = createNumericScale({
                values: [-80, -20],
                range: [200, 0],
                includeZero: true,
            });
            expect(allNeg.domain[0]).toBeLessThanOrEqual(-80);
            expect(allNeg.domain[1]).toBe(0);
            expect(allNeg.crossesZero).toBe(false);
            expect(allNeg.baseline).toBeCloseTo(0, 6);

            const crossing = createNumericScale({
                values: [-40, 60],
                range: [200, 0],
                nice: false,
            });
            expect(crossing.domain).toEqual([-40, 60]);
            expect(crossing.crossesZero).toBe(true);
            expect(crossing.baseline).toBeCloseTo(crossing.scale(0), 6);
            expect(crossing.baseline).toBeCloseTo(120, 6);
        });

        test("respects includeZero, explicit domain overrides, and nice ticks", () => {
            const withZero = createNumericScale({
                values: [110, 145],
                range: [200, 0],
                includeZero: true,
            });
            expect(withZero.domain[0]).toBe(0);

            const withoutZero = createNumericScale({
                values: [110, 145],
                range: [200, 0],
                includeZero: false,
                nice: false,
            });
            expect(withoutZero.domain).toEqual([110, 145]);

            const explicit = createNumericScale({
                values: [10, 90],
                range: [200, 0],
                domain: [17, 83],
                nice: true,
            });
            expect(explicit.domain).toEqual([17, 83]);

            const dataBounds = createNumericScale({
                values: [13, 87],
                range: [200, 0],
                domain: ["dataMin", "dataMax"],
                nice: true,
            });
            expect(dataBounds.domain).toEqual([13, 87]);

            const mixed = createNumericScale({
                values: [13, 87],
                range: [200, 0],
                domain: [10, "auto"],
                nice: true,
            });
            expect(mixed.domain[0]).toBe(10);
            expect(mixed.domain[1]).toBeGreaterThanOrEqual(87);

            const collapsedOverride = createNumericScale({
                values: [10, 20],
                range: [200, 0],
                domain: [50, 50],
                nice: false,
            });
            expect(collapsedOverride.domain).toEqual([45, 55]);

            const niceScale = createNumericScale({
                values: [0, 93],
                range: [200, 0],
                nice: true,
                tickCount: 5,
            });
            expect(niceScale.domain[1]).toBe(100);
            expect(niceScale.ticks(5)).toEqual([0, 20, 40, 60, 80, 100]);
        });

        test("supports independent dual Y and Y2 scales", () => {
            const yLeft = createNumericScale({ values: [120_000, 480_000], range: [240, 0] });
            const yRight = createNumericScale({
                values: [0.12, 0.38],
                range: [240, 0],
                domain: [0, 1],
            });

            expect(yLeft.domain[0]).toBe(0);
            expect(yLeft.domain[1]).toBeGreaterThanOrEqual(480_000);
            expect(yRight.domain).toEqual([0, 1]);
            expect(yRight.scale(0.5)).toBeCloseTo(120, 6);
            expect(yLeft.scale(yLeft.domain[1] / 2)).toBeCloseTo(120, 6);
        });
    });

    describe("formatDefaultTick", () => {
        test("formats strings, finite numbers, non-finite numbers, and Date ticks", () => {
            expect(formatDefaultTick("Revenue")).toBe("Revenue");
            expect(formatDefaultTick(NaN)).toBe("");
            expect(formatDefaultTick(1200)).toBe((1200).toLocaleString());
            expect(formatDefaultTick(new Date(2026, 0, 1, 0, 0, 0))).toBe("2026");
            expect(formatDefaultTick(new Date(2026, 3, 1, 0, 0, 0)).length).toBeGreaterThan(0);
            expect(formatDefaultTick(new Date(2026, 3, 15, 0, 0, 0)).length).toBeGreaterThan(0);
            expect(formatDefaultTick(new Date(2026, 3, 15, 14, 30, 0)).length).toBeGreaterThan(0);
            expect(formatDefaultTick(new Date(2026, 3, 15, 14, 30, 45)).length).toBeGreaterThan(0);
        });
    });
});

describe("Charts M0 — Geometry (chart-geometry.internal.ts)", () => {
    describe("snapHalf, snapInt, and clampBarRadius", () => {
        test("snapHalf always yields n + 0.5 and snapInt always yields an integer", () => {
            for (const value of [-10.7, -0.1, 0, 0.4, 12.2, 12.9, 100.5]) {
                const half = snapHalf(value);
                expect(Number.isSafeInteger(half - 0.5)).toBe(true);
                expect(half).toBe(Math.floor(value) + 0.5);

                const whole = snapInt(value);
                expect(Number.isSafeInteger(whole)).toBe(true);
                expect(whole).toBe(Math.round(value));
            }
        });

        test("clampBarRadius clamps to min(radius, thickness / 2, length) and guards non-positive inputs", () => {
            expect(clampBarRadius(8, 20, 40)).toBe(8);
            expect(clampBarRadius(12, 10, 40)).toBe(5);
            expect(clampBarRadius(8, 20, 3)).toBe(3);
            expect(clampBarRadius(0, 20, 40)).toBe(0);
            expect(clampBarRadius(4, 0, 40)).toBe(0);
            expect(clampBarRadius(4, 20, -2)).toBe(0);
        });
    });

    describe("buildLinePath & buildAreaPath", () => {
        const linePoints = [
            { x: 0, y: 100 },
            { x: 50, y: 40 },
            { x: 100, y: 80 },
            { x: 150, y: 20 },
        ];

        test("generates distinct paths for linear, monotone, and step curves", () => {
            const linear = buildLinePath(linePoints, { curve: "linear" });
            const monotone = buildLinePath(linePoints, { curve: "monotone" });
            const step = buildLinePath(linePoints, { curve: "step" });

            expect(linear).toMatch(/^M/);
            expect(monotone).toMatch(/^M/);
            expect(step).toMatch(/^M/);
            expect(monotone).not.toBe(linear);
            expect(step).not.toBe(linear);
            expect(monotone).toContain("C");
            expect(buildLinePath([])).toBe("");
        });

        test("breaks line path on null, NaN, and defined: false when connectNulls is false and bridges when true", () => {
            const gapped = [
                { x: 0, y: 100 },
                { x: 40, y: 60 },
                { x: 80, y: null },
                { x: 120, y: NaN },
                { x: 160, y: 50 },
                { x: 200, y: 30, defined: false },
                { x: 240, y: 10 },
                { x: 280, y: 20 },
            ];

            const broken = buildLinePath(gapped, { curve: "linear", connectNulls: false });
            const bridged = buildLinePath(gapped, { curve: "linear", connectNulls: true });

            expect(countMoveCommands(broken)).toBe(3);
            expect(countMoveCommands(bridged)).toBe(1);
            expect(bridged).not.toContain("NaN");
            expect(
                buildLinePath([
                    { x: 0, y: null },
                    { x: 10, y: NaN },
                ]),
            ).toBe("");
        });

        test("generates area paths for curves and handles null gaps with connectNulls false vs true", () => {
            const gappedArea = [
                { x: 0, y0: 200, y1: 120 },
                { x: 50, y0: 200, y1: 80 },
                { x: 100, y0: 200, y1: null },
                { x: 150, y0: 200, y1: 60 },
                { x: 200, y0: 200, y1: 40 },
            ];

            const broken = buildAreaPath(gappedArea, { curve: "linear", connectNulls: false });
            const bridged = buildAreaPath(gappedArea, { curve: "linear", connectNulls: true });
            const monotone = buildAreaPath(gappedArea, { curve: "monotone", connectNulls: true });
            const step = buildAreaPath(gappedArea, { curve: "step", connectNulls: true });

            expect(countMoveCommands(broken)).toBe(2);
            expect(countMoveCommands(bridged)).toBe(1);
            expect(monotone).toContain("C");
            expect(step).not.toBe(bridged);
            expect(buildAreaPath([])).toBe("");
        });
    });

    describe("computeStackedSeries (stackOffsetDiverging)", () => {
        test("stacks positive values upward and negative values downward from 0", () => {
            const result = computeStackedSeries([
                { id: "a", values: [10, -5, null] },
                { id: "b", values: [20, 15, -10] },
                { id: "c", values: [-8, -12, 5] },
            ]);

            expect(result.extent).toEqual([-17, 30]);
            expect(result.layers).toHaveLength(3);

            const [layerA, layerB, layerC] = result.layers;
            // Index 0: a=+10 [0,10], b=+20 [10,30], c=-8 [-8,0]
            expect(layerA?.points[0]).toEqual({ index: 0, y0: 0, y1: 10, value: 10 });
            expect(layerB?.points[0]).toEqual({ index: 0, y0: 10, y1: 30, value: 20 });
            expect(layerC?.points[0]).toEqual({ index: 0, y0: -8, y1: 0, value: -8 });

            // Index 1: a=-5 [-5,0], b=+15 [0,15], c=-12 [-17,-5]
            expect(layerA?.points[1]).toEqual({ index: 1, y0: -5, y1: 0, value: -5 });
            expect(layerB?.points[1]).toEqual({ index: 1, y0: 0, y1: 15, value: 15 });
            expect(layerC?.points[1]).toEqual({ index: 1, y0: -17, y1: -5, value: -12 });

            // Index 2: null value preserved as null while contributing 0 to stack
            expect(layerA?.points[2]?.value).toBeNull();
        });

        test("handles empty series and empty value arrays", () => {
            expect(computeStackedSeries([])).toEqual({ layers: [], extent: [0, 0] });
            expect(computeStackedSeries([{ id: "a", values: [] }])).toEqual({
                layers: [{ seriesId: "a", points: [] }],
                extent: [0, 0],
            });
        });
    });

    describe("computeGroupedBarRects & computeStackedBarRects", () => {
        test("computes vertical grouped bars with negative cap flip, maxBarWidth, clamped radius, and zero/tiny guards", () => {
            const yScale = createNumericScale({
                values: [-50, 100],
                range: [150, 0],
                nice: false,
            });

            const rects = computeGroupedBarRects({
                series: [
                    { id: "a", values: [100, -50, 0, 0.2, null] },
                    { id: "b", values: [50, 20, -25, 10, 30] },
                ],
                categoryStarts: [0, 120, 240, 360, 480],
                bandwidth: 100,
                valueScale: yScale,
                orientation: "vertical",
                radius: 8,
                maxBarWidth: 20,
                barGap: 4,
                minBarLength: 2,
            });

            // 5 categories * 2 series - 1 null = 9 rects
            expect(rects).toHaveLength(9);

            for (const rect of rects) {
                expect(Number.isSafeInteger(rect.x)).toBe(true);
                expect(Number.isSafeInteger(rect.y)).toBe(true);
                expect(Number.isSafeInteger(rect.width)).toBe(true);
                expect(Number.isSafeInteger(rect.height)).toBe(true);
                expect(rect.width).toBeLessThanOrEqual(20);
            }

            const posA = requireBarRect(rects, "a", 0);
            expect(posA.isNegative).toBe(false);
            expect(posA.capSide).toBe("top");
            expect(posA.radius).toBe(8);
            expect(posA.y + posA.height).toBe(posA.baseline);

            const negA = requireBarRect(rects, "a", 1);
            expect(negA.isNegative).toBe(true);
            expect(negA.capSide).toBe("bottom");
            expect(negA.y).toBe(negA.baseline);

            const zeroA = requireBarRect(rects, "a", 2);
            expect(zeroA.height).toBe(0);
            expect(zeroA.capSide).toBe("none");
            expect(zeroA.path).toBe("");

            const tinyA = requireBarRect(rects, "a", 3);
            expect(tinyA.height).toBe(2);
            expect(tinyA.radius).toBe(2); // clamped to min(8, 20/2, 2)
        });

        test("computes horizontal grouped bars with right/left cap flip", () => {
            const xValScale = createNumericScale({
                values: [-50, 100],
                range: [0, 300],
                nice: false,
            });

            const rects = computeGroupedBarRects({
                series: [{ id: "profit", values: [100, -50] }],
                categoryStarts: [0, 60],
                bandwidth: 40,
                valueScale: xValScale,
                orientation: "horizontal",
                radius: 6,
                maxBarWidth: 24,
            });

            expect(rects).toHaveLength(2);
            const [pos, neg] = rects;
            expect(pos?.capSide).toBe("right");
            expect(pos?.x).toBe(pos?.baseline);
            expect(pos?.height).toBe(24);
            expect(neg?.capSide).toBe("left");
            expect(neg?.isNegative).toBe(true);
            expect((neg?.x ?? 0) + (neg?.width ?? 0)).toBe(neg?.baseline);
        });

        test("computes vertical & horizontal stacked bars with outer-cap-only rounding and diverging signs", () => {
            const vScale = createNumericScale({
                values: [-40, 60],
                range: [200, 0],
                nice: false,
            });

            const vRects = computeStackedBarRects({
                series: [
                    { id: "s1", values: [20, -15] },
                    { id: "s2", values: [40, -25] },
                    { id: "s3", values: [-20, 30] },
                ],
                categoryStarts: [10, 110],
                bandwidth: 60,
                valueScale: vScale,
                orientation: "vertical",
                radius: 6,
                maxBarWidth: 32,
            });

            // Category 0: s1 (+20, inner), s2 (+40, outermost positive), s3 (-20, outermost negative)
            const c0s1 = requireBarRect(vRects, "s1", 0);
            const c0s2 = requireBarRect(vRects, "s2", 0);
            const c0s3 = requireBarRect(vRects, "s3", 0);
            expect(c0s1.capSide).toBe("none");
            expect(c0s1.radius).toBe(0);
            expect(c0s2.capSide).toBe("top");
            expect(c0s2.radius).toBe(6);
            expect(c0s3.capSide).toBe("bottom");
            expect(c0s3.radius).toBe(6);
            expect(c0s1.width).toBe(32);

            // Category 1: s1 (-15, inner negative), s2 (-25, outermost negative), s3 (+30, outermost positive)
            const c1s1 = requireBarRect(vRects, "s1", 1);
            const c1s2 = requireBarRect(vRects, "s2", 1);
            const c1s3 = requireBarRect(vRects, "s3", 1);
            expect(c1s1.capSide).toBe("none");
            expect(c1s2.capSide).toBe("bottom");
            expect(c1s3.capSide).toBe("top");

            const hScale = createNumericScale({
                values: [-40, 60],
                range: [0, 200],
                nice: false,
            });
            const hRects = computeStackedBarRects({
                series: [
                    { id: "s1", values: [20] },
                    { id: "s2", values: [40] },
                    { id: "s3", values: [-30] },
                ],
                categoryStarts: [0],
                bandwidth: 40,
                valueScale: hScale,
                orientation: "horizontal",
                radius: 5,
            });

            expect(hRects.find((r) => r.seriesId === "s1")?.capSide).toBe("none");
            expect(hRects.find((r) => r.seriesId === "s2")?.capSide).toBe("right");
            expect(hRects.find((r) => r.seriesId === "s3")?.capSide).toBe("left");

            expect(buildRoundedBarPath(0, 0, 20, 0, 4, "top")).toBe("");
            expect(buildRoundedBarPath(0, 0, 20, 40, 4, "none")).toBe("M0,0H20V40H0Z");
        });

        test("keeps inner stacked segments flush with baseline under fractional segmentGap and anchors tiny segments on the correct side", () => {
            const posScale = createNumericScale({
                values: [0, 100],
                range: [200, 0],
                nice: false,
            });
            const stacked = computeStackedBarRects({
                series: [
                    { id: "inner", values: [40] },
                    { id: "outer", values: [60] },
                ],
                categoryStarts: [0],
                bandwidth: 40,
                valueScale: posScale,
                orientation: "vertical",
                segmentGap: 1.5,
            });

            const inner = requireBarRect(stacked, "inner", 0);
            expect(inner.y + inner.height).toBe(inner.baseline);

            // Tiny vertical positive segment stays above/flush with baseline (no downward overshoot)
            const vDiverging = createNumericScale({
                values: [-50, 100],
                range: [150, 0],
                nice: false,
            });
            const tinyVert = computeStackedBarRects({
                series: [{ id: "tinyPos", values: [0.2] }],
                categoryStarts: [0],
                bandwidth: 40,
                valueScale: vDiverging,
                orientation: "vertical",
                minBarLength: 2,
            });
            const tinyVertRect = requireBarRect(tinyVert, "tinyPos", 0);
            expect(tinyVertRect.height).toBe(2);
            expect(tinyVertRect.y + tinyVertRect.height).toBe(tinyVertRect.baseline);
            expect(tinyVertRect.y).toBeLessThan(tinyVertRect.baseline);

            // Tiny horizontal negative segment stays left of/flush with baseline (no rightward overshoot)
            const hDiverging = createNumericScale({
                values: [-100, 100],
                range: [0, 200],
                nice: false,
            });
            const tinyHoriz = computeStackedBarRects({
                series: [{ id: "tinyNeg", values: [-0.2] }],
                categoryStarts: [0],
                bandwidth: 40,
                valueScale: hDiverging,
                orientation: "horizontal",
                minBarLength: 2,
            });
            const tinyHorizRect = requireBarRect(tinyHoriz, "tinyNeg", 0);
            expect(tinyHorizRect.width).toBe(2);
            expect(tinyHorizRect.x + tinyHorizRect.width).toBe(tinyHorizRect.baseline);
            expect(tinyHorizRect.x).toBeLessThan(tinyHorizRect.baseline);
        });
    });

    describe("partitionSeriesIntoStackSlots & computeGroupedStackedBarRects", () => {
        test("partitionSeriesIntoStackSlots preserves first-seen order, groups by stack key, and handles unstacked series for stackUnstacked false vs true", () => {
            const mixed = [
                { id: "planBase", stack: "plan" },
                { id: "soloA" },
                { id: "actualBase", stack: "actual" },
                { id: "planBonus", stack: "plan" },
                { id: "soloB", stack: "" },
                { id: "actualBonus", stack: "actual" },
            ];

            // stackUnstacked: false -> each unstacked series (including empty string "") gets its own slot
            const groupedSlots = partitionSeriesIntoStackSlots(mixed, false);
            expect(groupedSlots.map((slot) => slot.key)).toEqual([
                "stack:plan",
                "series:soloA",
                "stack:actual",
                "series:soloB",
            ]);
            expect(groupedSlots.map((slot) => slot.stackKey)).toEqual([
                "plan",
                undefined,
                "actual",
                undefined,
            ]);
            expect(groupedSlots[0]?.series.map((s) => s.id)).toEqual(["planBase", "planBonus"]);
            expect(groupedSlots[1]?.series.map((s) => s.id)).toEqual(["soloA"]);
            expect(groupedSlots[2]?.series.map((s) => s.id)).toEqual(["actualBase", "actualBonus"]);
            expect(groupedSlots[3]?.series.map((s) => s.id)).toEqual(["soloB"]);

            // stackUnstacked: true -> all unstacked series share one "default" slot at first-seen unstacked position
            const stackedSlots = partitionSeriesIntoStackSlots(mixed, true);
            expect(stackedSlots.map((slot) => slot.key)).toEqual([
                "stack:plan",
                "default",
                "stack:actual",
            ]);
            expect(stackedSlots.map((slot) => slot.stackKey)).toEqual(["plan", undefined, "actual"]);
            expect(stackedSlots[1]?.series.map((s) => s.id)).toEqual(["soloA", "soloB"]);

            // Explicit stack: "default" never collides with the unstacked "default" slot under stackUnstacked: true
            const collisionSlots = partitionSeriesIntoStackSlots(
                [
                    { id: "namedDefaultA", stack: "default" },
                    { id: "unstackedA" },
                    { id: "namedDefaultB", stack: "default" },
                    { id: "unstackedB" },
                ],
                true,
            );
            expect(collisionSlots.map((slot) => slot.key)).toEqual(["stack:default", "default"]);
            expect(collisionSlots.map((slot) => slot.stackKey)).toEqual(["default", undefined]);
            expect(collisionSlots[0]?.series.map((s) => s.id)).toEqual([
                "namedDefaultA",
                "namedDefaultB",
            ]);
            expect(collisionSlots[1]?.series.map((s) => s.id)).toEqual([
                "unstackedA",
                "unstackedB",
            ]);

            expect(partitionSeriesIntoStackSlots([])).toEqual([]);
        });

        test("computeGroupedStackedBarRects places named stacks side-by-side in vertical & horizontal orientations with diverging segments, outer-cap-only radii, integer snapping, and zero baseline overshoot", () => {
            const vScale = createNumericScale({
                values: [-60, 140],
                range: [200, 0],
                nice: false,
            });

            const vRects = computeGroupedStackedBarRects({
                series: [
                    { id: "planCore", stack: "plan", values: [40, -20] },
                    { id: "planAddon", stack: "plan", values: [60, -30] },
                    { id: "actualCore", stack: "actual", values: [50, 70] },
                    { id: "actualAddon", stack: "actual", values: [80, -40] },
                ],
                categoryStarts: [10, 150],
                bandwidth: 100,
                valueScale: vScale,
                orientation: "vertical",
                radius: 6,
                maxBarWidth: 36,
                barGap: 8,
                segmentGap: 1.5,
                minBarLength: 2,
            });

            expect(vRects).toHaveLength(8);
            for (const rect of vRects) {
                expect(Number.isSafeInteger(rect.x)).toBe(true);
                expect(Number.isSafeInteger(rect.y)).toBe(true);
                expect(Number.isSafeInteger(rect.width)).toBe(true);
                expect(Number.isSafeInteger(rect.height)).toBe(true);
                expect(rect.width).toBeLessThanOrEqual(36);
            }

            // Category 0: plan (+40 inner, +60 outer) left of actual (+50 inner, +80 outer) separated by barGap=8
            const pCore0 = requireBarRect(vRects, "planCore", 0);
            const pAddon0 = requireBarRect(vRects, "planAddon", 0);
            const aCore0 = requireBarRect(vRects, "actualCore", 0);
            const aAddon0 = requireBarRect(vRects, "actualAddon", 0);

            expect(pCore0.stackKey).toBe("plan");
            expect(pAddon0.stackKey).toBe("plan");
            expect(aCore0.stackKey).toBe("actual");
            expect(aAddon0.stackKey).toBe("actual");

            // Segments within the same stack share exact X & width
            expect(pCore0.x).toBe(pAddon0.x);
            expect(pCore0.width).toBe(pAddon0.width);
            expect(aCore0.x).toBe(aAddon0.x);
            expect(aCore0.width).toBe(aAddon0.width);

            // "plan" sits strictly left of "actual" with barGap=8
            expect(aCore0.x - (pCore0.x + pCore0.width)).toBe(8);

            // Outer-cap-only rounding & segmentGap separation within each positive stack
            expect(pCore0.capSide).toBe("none");
            expect(pCore0.radius).toBe(0);
            expect(pAddon0.capSide).toBe("top");
            expect(pAddon0.radius).toBe(6);
            expect(aCore0.capSide).toBe("none");
            expect(aCore0.radius).toBe(0);
            expect(aAddon0.capSide).toBe("top");
            expect(aAddon0.radius).toBe(6);

            // Positive stack: inner segment stays flush with baseline (zero overshoot) and outer sits strictly above it
            expect(pCore0.y + pCore0.height).toBe(pCore0.baseline);
            expect(aCore0.y + aCore0.height).toBe(aCore0.baseline);
            expect(pAddon0.y + pAddon0.height).toBeLessThan(pCore0.y);
            expect(aAddon0.y + aAddon0.height).toBeLessThan(aCore0.y);

            // Category 1: plan diverges negatively (-20 inner, -30 outer); actual splits (+70 top, -40 bottom)
            const pCore1 = requireBarRect(vRects, "planCore", 1);
            const pAddon1 = requireBarRect(vRects, "planAddon", 1);
            const aCore1 = requireBarRect(vRects, "actualCore", 1);
            const aAddon1 = requireBarRect(vRects, "actualAddon", 1);

            expect(pCore1.isNegative).toBe(true);
            expect(pCore1.capSide).toBe("none");
            expect(pCore1.radius).toBe(0);
            expect(pCore1.y).toBe(pCore1.baseline); // flush with baseline, no upward overshoot

            expect(pAddon1.isNegative).toBe(true);
            expect(pAddon1.capSide).toBe("bottom");
            expect(pAddon1.radius).toBe(6);
            expect(pAddon1.y).toBeGreaterThan(pCore1.y + pCore1.height);

            expect(aCore1.isNegative).toBe(false);
            expect(aCore1.capSide).toBe("top");
            expect(aCore1.y + aCore1.height).toBe(aCore1.baseline);

            expect(aAddon1.isNegative).toBe(true);
            expect(aAddon1.capSide).toBe("bottom");
            expect(aAddon1.y).toBe(aAddon1.baseline);

            // Horizontal orientation: "plan" sits above "actual" separated by barGap, positive right / negative left
            const hScale = createNumericScale({
                values: [-60, 140],
                range: [0, 200],
                nice: false,
            });
            const hRects = computeGroupedStackedBarRects({
                series: [
                    { id: "planCore", stack: "plan", values: [40] },
                    { id: "planAddon", stack: "plan", values: [60] },
                    { id: "actualCore", stack: "actual", values: [-20] },
                    { id: "actualAddon", stack: "actual", values: [-30] },
                ],
                categoryStarts: [0],
                bandwidth: 60,
                valueScale: hScale,
                orientation: "horizontal",
                radius: 5,
                maxBarWidth: 24,
                barGap: 6,
                segmentGap: 1.5,
            });

            const hpCore = requireBarRect(hRects, "planCore", 0);
            const hpAddon = requireBarRect(hRects, "planAddon", 0);
            const haCore = requireBarRect(hRects, "actualCore", 0);
            const haAddon = requireBarRect(hRects, "actualAddon", 0);

            expect(hpCore.y).toBe(hpAddon.y);
            expect(haCore.y).toBe(haAddon.y);
            expect(haCore.y - (hpCore.y + hpCore.height)).toBe(6);

            expect(hpCore.capSide).toBe("none");
            expect(hpCore.x).toBe(hpCore.baseline);
            expect(hpAddon.capSide).toBe("right");
            expect(hpAddon.x).toBeGreaterThan(hpCore.x + hpCore.width);

            expect(haCore.capSide).toBe("none");
            expect(haCore.x + haCore.width).toBe(haCore.baseline);
            expect(haAddon.capSide).toBe("left");
            expect(haAddon.x + haAddon.width).toBeLessThan(haCore.x);

            // Empty / zero-bandwidth guards
            expect(
                computeGroupedStackedBarRects({
                    series: [],
                    categoryStarts: [0],
                    bandwidth: 60,
                    valueScale: vScale,
                }),
            ).toEqual([]);
            expect(
                computeGroupedStackedBarRects({
                    series: [{ id: "a", stack: "s", values: [10] }],
                    categoryStarts: [0],
                    bandwidth: 0,
                    valueScale: vScale,
                }),
            ).toEqual([]);
        });
    });

    describe("computePieArcs", () => {
        test("supports full pie (innerRadiusRatio=0) and donut (innerRadiusRatio=0.68)", () => {
            const slices = [
                { id: "a", label: "Direct", value: 60 },
                { id: "b", label: "Organic", value: 40 },
            ];

            const pieArcs = computePieArcs({
                slices,
                outerRadius: 100,
                innerRadiusRatio: 0,
            });
            expect(pieArcs).toHaveLength(2);
            expect(pieArcs[0]?.innerRadius).toBe(0);
            expect(pieArcs[0]?.share).toBeCloseTo(0.6, 6);
            expect(pieArcs[1]?.share).toBeCloseTo(0.4, 6);
            expect(pieArcs[0]?.path).not.toBe(pieArcs[0]?.hoverPath);

            const donutArcs = computePieArcs({
                slices,
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                padAngle: 0.04,
                cornerRadius: 5,
            });
            expect(donutArcs).toHaveLength(2);
            expect(donutArcs[0]?.innerRadius).toBeCloseTo(68, 6);
            expect(donutArcs[0]?.path.length).toBeGreaterThan(0);
            expect(donutArcs[0]?.hoverPath.length).toBeGreaterThan(0);
            expect(donutArcs[0]?.path).not.toContain("NaN");
        });

        test("guards zero, negative, NaN, empty, and single-slice inputs", () => {
            expect(computePieArcs({ slices: [], outerRadius: 100 })).toEqual([]);
            expect(
                computePieArcs({
                    slices: [{ id: "a", label: "A", value: 10 }],
                    outerRadius: 0,
                }),
            ).toEqual([]);
            expect(
                computePieArcs({
                    slices: [
                        { id: "z", label: "Zero", value: 0 },
                        { id: "n", label: "Neg", value: -15 },
                        { id: "nan", label: "NaN", value: NaN },
                    ],
                    outerRadius: 80,
                }),
            ).toEqual([]);

            const singlePositive = computePieArcs({
                slices: [
                    { id: "neg", label: "Neg", value: -10 },
                    { id: "only", label: "Only", value: 50 },
                    { id: "zero", label: "Zero", value: 0 },
                ],
                outerRadius: 80,
                innerRadiusRatio: 0.64,
                padAngle: 0.05,
            });
            expect(singlePositive).toHaveLength(1);
            expect(singlePositive[0]?.id).toBe("only");
            expect(singlePositive[0]?.index).toBe(1);
            expect(singlePositive[0]?.share).toBe(1);
            expect(
                (singlePositive[0]?.endAngle ?? 0) - (singlePositive[0]?.startAngle ?? 0),
            ).toBeCloseTo(Math.PI * 2, 5);
        });

        test("produces separated parallel-gap paths for gap > 0, enforces 40% tiny-slice guard, and forces zero gap & corner radius on a single 100% slice", () => {
            const slices = [
                { id: "a", label: "Direct", value: 60 },
                { id: "b", label: "Organic", value: 40 },
            ];

            // 1. gap > 0 produces genuinely separated paths distinct from gap: 0 (donut & full pie)
            const noGapDonut = computePieArcs({
                slices,
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                gap: 0,
            });
            const gappedDonut = computePieArcs({
                slices,
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                gap: 4,
            });
            expect(gappedDonut).toHaveLength(2);
            for (let i = 0; i < 2; i++) {
                expect(gappedDonut[i]?.path).not.toBe("");
                expect(gappedDonut[i]?.path).not.toContain("NaN");
                expect(gappedDonut[i]?.hoverPath).not.toContain("NaN");
                expect(gappedDonut[i]?.path).not.toBe(noGapDonut[i]?.path);
                expect(gappedDonut[i]?.hoverPath).not.toBe(noGapDonut[i]?.hoverPath);
                expect(gappedDonut[i]?.hoverPath).not.toBe(gappedDonut[i]?.path);
            }

            const noGapPie = computePieArcs({
                slices,
                outerRadius: 100,
                innerRadiusRatio: 0,
                gap: 0,
            });
            const gappedPie = computePieArcs({
                slices,
                outerRadius: 100,
                innerRadiusRatio: 0,
                gap: 4,
            });
            expect(gappedPie[0]?.path).not.toBe(noGapPie[0]?.path);
            expect(gappedPie[0]?.path).not.toContain("NaN");

            // 2. 40% tiny-slice guard: 1% slice alongside 99% slice with large gap (8px) still produces a valid non-empty path
            const extremeSlices = [
                { id: "tiny", label: "Tiny", value: 1 },
                { id: "huge", label: "Huge", value: 99 },
            ];
            const extremeNoGap = computePieArcs({
                slices: extremeSlices,
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                gap: 0,
            });
            const extremeGapped = computePieArcs({
                slices: extremeSlices,
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                gap: 8,
            });
            expect(extremeGapped).toHaveLength(2);
            expect(extremeGapped[0]?.share).toBeCloseTo(0.01, 6);
            expect(extremeGapped[1]?.share).toBeCloseTo(0.99, 6);
            expect(extremeGapped[0]?.path.length).toBeGreaterThan(0);
            expect(extremeGapped[0]?.hoverPath.length).toBeGreaterThan(0);
            expect(extremeGapped[0]?.path).not.toContain("NaN");
            expect(extremeGapped[0]?.hoverPath).not.toContain("NaN");
            expect(extremeGapped[0]?.path).not.toBe(extremeNoGap[0]?.path);
            expect(extremeGapped[1]?.path.length).toBeGreaterThan(0);
            expect(extremeGapped[1]?.path).not.toContain("NaN");

            // 3. Single 100% slice forces 0 gap and 0 corner radius even when gap, padAngle, and cornerRadius are passed
            const singleBaseline = computePieArcs({
                slices: [{ id: "only", label: "Only", value: 100 }],
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                gap: 0,
                padAngle: 0,
                cornerRadius: 0,
            });
            const singleWithGapAndCorners = computePieArcs({
                slices: [
                    { id: "only", label: "Only", value: 100 },
                    { id: "zero", label: "Zero", value: 0 },
                ],
                outerRadius: 100,
                innerRadiusRatio: 0.68,
                gap: 6,
                padAngle: 0.08,
                cornerRadius: 8,
            });
            expect(singleWithGapAndCorners).toHaveLength(1);
            expect(singleWithGapAndCorners[0]?.path).toBe(singleBaseline[0]?.path);
            expect(singleWithGapAndCorners[0]?.hoverPath).toBe(singleBaseline[0]?.hoverPath);
        });
    });

    describe("bisectSortedValues & findNearestCoordinateIndex", () => {
        test("bisectSortedValues handles empty, single, boundaries, exact matches, and midpoints", () => {
            expect(bisectSortedValues([], 10, (v: number) => v)).toBe(-1);
            expect(bisectSortedValues([42], 999, (v) => v)).toBe(0);

            const items = [{ x: 10 }, { x: 20 }, { x: 40 }, { x: 100 }];

            expect(bisectSortedValues(items, -5, getItemX)).toBe(0);
            expect(bisectSortedValues(items, 10, getItemX)).toBe(0);
            expect(bisectSortedValues(items, 14, getItemX)).toBe(0);
            expect(bisectSortedValues(items, 15, getItemX)).toBe(0); // exact midpoint favors left
            expect(bisectSortedValues(items, 16, getItemX)).toBe(1);
            expect(bisectSortedValues(items, 40, getItemX)).toBe(2);
            expect(bisectSortedValues(items, 500, getItemX)).toBe(3);
        });

        test("findNearestCoordinateIndex handles empty, boundaries, reversed arrays, and non-finite entries", () => {
            expect(findNearestCoordinateIndex(50, [])).toBe(-1);
            expect(findNearestCoordinateIndex(0, [20, 60, 100])).toBe(0);
            expect(findNearestCoordinateIndex(40, [20, 60, 100])).toBe(0); // exact midpoint favors first
            expect(findNearestCoordinateIndex(41, [20, 60, 100])).toBe(1);
            expect(findNearestCoordinateIndex(180, [20, 60, 100])).toBe(2);
            expect(findNearestCoordinateIndex(210, [300, 200, 100, 0])).toBe(1);
            expect(findNearestCoordinateIndex(95, [NaN, 100, Infinity])).toBe(
                1,
            );
            expect(findNearestCoordinateIndex(50, [NaN, Infinity, -Infinity])).toBe(-1);
            expect(findNearestCoordinateIndex(NaN, [10, 20, 30])).toBe(-1);
            expect(findNearestCoordinateIndex(Infinity, [10, 20, 30])).toBe(-1);
        });
    });
});

describe("Charts M0 — Measurement (chart-measure.internal.ts)", () => {
    beforeEach(() => {
        clearMeasureCache();
    });

    test("measures text deterministically in happy-dom and caches results", () => {
        expect(measureTextWidth("")).toBe(0);

        const narrow = measureTextWidth("iii");
        const wide = measureTextWidth("WWW");
        expect(narrow).toBeGreaterThan(0);
        expect(wide).toBeGreaterThan(narrow);

        const regular = measureTextWidth("Revenue", { fontSize: 12, fontWeight: 400 });
        const bold = measureTextWidth("Revenue", { fontSize: 12, fontWeight: 700 });
        expect(bold).toBeGreaterThan(regular);

        // Repeat call hits cache and remains deterministic after cache clear
        const repeat = measureTextWidth("Revenue", { fontSize: 12, fontWeight: 400 });
        expect(repeat).toBe(regular);
        clearMeasureCache();
        expect(measureTextWidth("Revenue", { fontSize: 12, fontWeight: 400 })).toBe(regular);
    });

    test("truncateTextToWidth appends ellipsis within budget and handles tiny budgets safely", () => {
        expect(truncateTextToWidth("", 100)).toEqual({ text: "", truncated: false, width: 0 });

        const fits = truncateTextToWidth("Jan", 100);
        expect(fits.truncated).toBe(false);
        expect(fits.text).toBe("Jan");

        const budget = 55;
        const truncated = truncateTextToWidth("Enterprise Annual Recurring Revenue", budget);
        expect(truncated.truncated).toBe(true);
        expect(truncated.text.endsWith("\u{2026}")).toBe(true);
        expect(truncated.width).toBeLessThanOrEqual(budget);

        expect(truncateTextToWidth("Overflow", 0)).toEqual({ text: "", truncated: true, width: 0 });
        expect(truncateTextToWidth("Overflow", -10)).toEqual({
            text: "",
            truncated: true,
            width: 0,
        });

        const tinyBudget = truncateTextToWidth("Overflow", 2);
        expect(tinyBudget.truncated).toBe(true);
        expect(tinyBudget.text).toBe("\u{2026}");
    });

    test("thinAxisTicks guarantees minimum gutter between retained ticks", () => {
        expect(thinAxisTicks([])).toEqual([]);

        const minGutter = 12;
        const ticks = Array.from({ length: 12 }, (_, index) => ({
            label: `Month ${index + 1}`,
            position: index * 24,
        }));

        const kept = thinAxisTicks(ticks, { minGutter });
        expect(kept.length).toBeGreaterThan(0);
        expect(kept.length).toBeLessThan(ticks.length);
        expect(kept[0]).toBe(0);

        for (let i = 1; i < kept.length; i++) {
            const prevIndex = kept[i - 1];
            const currIndex = kept[i];
            const prev = prevIndex === undefined ? undefined : ticks[prevIndex];
            const curr = currIndex === undefined ? undefined : ticks[currIndex];
            expect(prev).toBeDefined();
            expect(curr).toBeDefined();
            if (!prev || !curr) continue;
            const prevHalf = measureTextWidth(prev.label) / 2;
            const currHalf = measureTextWidth(curr.label) / 2;
            const gap = curr.position - currHalf - (prev.position + prevHalf);
            expect(gap).toBeGreaterThanOrEqual(minGutter - 1e-6);
        }

        // Unsorted positions still thin cleanly in spatial order
        const unsorted = [
            { label: "Late", position: 200 },
            { label: "Early", position: 0 },
            { label: "TooClose", position: 10 },
        ];
        const keptUnsorted = thinAxisTicks(unsorted, { minGutter: 12 });
        expect(keptUnsorted).toEqual([1, 0]);
    });

    test("wrapTickLabel wraps onto at most 2 lines and adds ellipsis on overflow", () => {
        expect(wrapTickLabel(" ".repeat(3), 80)).toEqual({ lines: [], truncated: false });
        expect(wrapTickLabel("Revenue", 80, undefined, 0)).toEqual({ lines: [], truncated: false });

        const single = wrapTickLabel("Q1", 100);
        expect(single).toEqual({ lines: ["Q1"], truncated: false });

        const twoLine = wrapTickLabel("North America", 55);
        expect(twoLine.lines).toEqual(["North", "America"]);
        expect(twoLine.truncated).toBe(false);

        const overflow = wrapTickLabel("Enterprise Subscription Expansion Revenue", 60, undefined, 2);
        expect(overflow.lines).toHaveLength(2);
        expect(overflow.truncated).toBe(true);
        expect(overflow.lines[1]?.endsWith("\u{2026}")).toBe(true);

        const oneLineMax = wrapTickLabel("North America Region", 50, undefined, 1);
        expect(oneLineMax.lines).toHaveLength(1);
        expect(oneLineMax.truncated).toBe(true);

        // First word overflows and truncates, second word fits cleanly -> truncated must remain true
        const firstWordOverflow = wrapTickLabel("Supercalifragilistic Q1", 55, undefined, 2);
        expect(firstWordOverflow.lines).toHaveLength(2);
        expect(firstWordOverflow.lines[0]?.endsWith("\u{2026}")).toBe(true);
        expect(firstWordOverflow.lines[1]).toBe("Q1");
        expect(firstWordOverflow.truncated).toBe(true);
    });

    test("computeRotatedTickHeight and computeChartMargins expand for rotated ticks and long Y/Y2 labels", () => {
        expect(computeRotatedTickHeight(80, 0, 15)).toBe(15);

        const h35 = computeRotatedTickHeight(80, -35, 15);
        const h45 = computeRotatedTickHeight(80, -45, 15);
        expect(h35).toBeGreaterThan(15);
        expect(h45).toBeGreaterThan(h35);

        const baseMargins = computeChartMargins({
            xTickLabels: ["January 2026", "February 2026"],
            yTickLabels: ["0", "50", "100"],
            xTickAngle: 0,
        });
        const rotatedMargins = computeChartMargins({
            xTickLabels: ["January 2026", "February 2026"],
            yTickLabels: ["0", "50", "100"],
            xTickAngle: -45,
        });
        expect(rotatedMargins.bottom).toBeGreaterThan(baseMargins.bottom);

        const wrappedMargins = computeChartMargins({
            xTickLabels: ["January 2026", "February 2026"],
            yTickLabels: ["0", "50", "100"],
            xWrapTicks: true,
        });
        expect(wrappedMargins.bottom).toBeGreaterThan(baseMargins.bottom);

        const longYMargins = computeChartMargins({
            yTickLabels: ["€0", "€1,250,000"],
            yAxisLabel: "Revenue",
            hasY2Axis: true,
            y2TickLabels: ["0%", "100.0%"],
            y2AxisLabel: "Margin",
        });
        expect(longYMargins.left).toBeGreaterThan(baseMargins.left);
        expect(longYMargins.right).toBeGreaterThan(baseMargins.right);

        const overridden = computeChartMargins({
            yTickLabels: ["€1,250,000"],
            overrides: { top: 4, right: 8, bottom: 12, left: 16 },
        });
        expect(overridden).toEqual({ top: 4, right: 8, bottom: 12, left: 16 });
    });
});

describe("Charts M0 — ChartState & Public Exports (chart-state.svelte.ts & index.ts)", () => {
    interface SalesDatum {
        month: string;
        revenue: number | null;
        cost: number | null;
        margin: number | null;
    }

    const sampleData: readonly SalesDatum[] = [
        { month: "Jan", revenue: 100, cost: 40, margin: 0.6 },
        { month: "Feb", revenue: 200, cost: 90, margin: 0.55 },
        { month: "Mar", revenue: null, cost: 50, margin: null },
    ];

    const sampleSeries: readonly ChartSeries<SalesDatum>[] = [
        { id: "revenue", label: "Revenue" },
        { id: "cost", label: "Cost" },
        { id: "margin", label: "Margin", yAxis: "right", format: (v) => `${Math.round(v * 100)}%` },
    ];

    test("public barrel exports expected API and zero internal kernel helpers", () => {
        expect(CHART_VARIANTS).toEqual(["elevated", "soft", "sunken", "transparent"]);
        expect(CHART_SIZES).toEqual(["sm", "md", "lg"]);
        expect(CHART_PALETTES).toEqual(["categorical", "semantic"]);
        expect(CHART_MONOTONE_HUES.length).toBeGreaterThan(0);
        expect(CHART_TONES).toEqual(["base", "accent", "positive", "caution", "negative"]);

        const exportedKeys = Object.keys(chartsExports);
        expect(exportedKeys).toContain("ChartState");
        expect(exportedKeys).toContain("getChartContext");
        expect(exportedKeys).toContain("setChartContext");
        expect(exportedKeys).toContain("hasChartContext");
        expect(exportedKeys).not.toContain("createXScale");
        expect(exportedKeys).not.toContain("buildLinePath");
        expect(exportedKeys).not.toContain("measureTextWidth");
        expect(exportedKeys).not.toContain("snapHalf");
    });

    test("initializes clean defaults and respects visible: false on series", () => {
        const empty = new ChartState();
        expect(empty.isEmpty).toBe(true);
        expect(empty.hasSize).toBe(false);
        expect(empty.activeIndex).toBeNull();
        expect(empty.hoveredSeriesId).toBeNull();
        expect(empty.hiddenSeriesIds).toEqual([]);
        expect(empty.allSeriesHidden).toBe(false);

        const withInitialHidden = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: [
                { id: "revenue", label: "Revenue", visible: false },
                { id: "cost", label: "Cost" },
            ],
            hiddenSeriesIds: ["revenue"],
        });
        expect(withInitialHidden.hiddenSeriesIds).toEqual(["revenue"]);
        expect(withInitialHidden.visibleSeries.map((s) => s.id)).toEqual(["cost"]);
    });

    test("toggling hiddenSeriesIds updates visible series, dual Y/Y2 scales, and domains", () => {
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: sampleSeries,
            width: 600,
            height: 300,
        });

        expect(state.hasSize).toBe(true);
        expect(state.hasY2Axis).toBe(true);
        expect(state.y2Scale).not.toBeNull();
        const initialYMax = state.yScale.domain[1];
        expect(initialYMax).toBeGreaterThanOrEqual(200);

        // Hide high-value left series -> Y domain shrinks to fit remaining "cost" series (max 90)
        state.toggleSeries("revenue");
        expect(state.isSeriesHidden("revenue")).toBe(true);
        expect(state.visibleSeries.map((s) => s.id)).toEqual(["cost", "margin"]);
        expect(state.yScale.domain[1]).toBeLessThan(initialYMax);
        expect(state.yScale.domain[1]).toBeGreaterThanOrEqual(90);

        // Hide right-axis series -> hasY2Axis becomes false and y2Scale becomes null
        state.toggleSeries("margin");
        expect(state.hasY2Axis).toBe(false);
        expect(state.y2Scale).toBeNull();

        // Hide last remaining series -> allSeriesHidden becomes true
        state.toggleSeries("cost");
        expect(state.allSeriesHidden).toBe(true);
        expect(state.visibleSeries).toEqual([]);

        // showAllSeries restores everything
        state.showAllSeries();
        expect(state.allSeriesHidden).toBe(false);
        expect(state.visibleSeries).toHaveLength(3);
        expect(state.hasY2Axis).toBe(true);
        expect(state.yScale.domain[1]).toBe(initialYMax);
    });

    test("updates stacked Y domain when toggling series", () => {
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: [
                { id: "revenue", label: "Revenue" },
                { id: "cost", label: "Cost" },
            ],
            stacked: true,
            width: 500,
            height: 260,
        });

        // Feb stacked total is 200 + 90 = 290
        expect(state.yScale.domain[1]).toBeGreaterThanOrEqual(290);

        state.toggleSeries("cost");
        // Only revenue remains (max 200)
        expect(state.yScale.domain[1]).toBeLessThan(290);
        expect(state.yScale.domain[1]).toBeGreaterThanOrEqual(200);
    });

    test("hoveredSeriesId dims sibling series without dimming the hovered series", () => {
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: sampleSeries,
        });

        expect(state.isSeriesDimmed("revenue")).toBe(false);
        expect(state.isSeriesDimmed("cost")).toBe(false);

        state.setHoveredSeries("revenue");
        expect(state.isSeriesDimmed("revenue")).toBe(false);
        expect(state.isSeriesDimmed("cost")).toBe(true);
        expect(state.isSeriesDimmed("margin")).toBe(true);

        state.setHoveredSeries(null);
        expect(state.isSeriesDimmed("cost")).toBe(false);
    });

    test("clamps activeIndex across setters, stepping, and dynamic data shrinking", () => {
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: sampleSeries,
        });

        // Stepping from null forward starts at 0; backward starts at last index
        state.stepActiveIndex(1);
        expect(state.activeIndex).toBe(0);
        state.setActiveIndex(null);
        state.stepActiveIndex(-1);
        expect(state.activeIndex).toBe(2);

        // Clamps at bounds
        state.stepActiveIndex(1);
        expect(state.activeIndex).toBe(2);
        state.setActiveIndex(-10);
        expect(state.activeIndex).toBe(0);
        state.stepActiveIndex(-1);
        expect(state.activeIndex).toBe(0);

        // Setter truncation & NaN reset
        state.activeIndex = 1.9;
        expect(state.activeIndex).toBe(1);
        state.setActiveIndex(NaN);
        expect(state.activeIndex).toBeNull();

        // Dynamic data shrinking clamps activeIndex automatically
        state.setActiveIndex(2);
        expect(state.activeIndex).toBe(2);
        state.data = sampleData.slice(0, 1);
        expect(state.activeIndex).toBe(0);
        state.data = [];
        expect(state.activeIndex).toBeNull();
        state.stepActiveIndex(1);
        expect(state.activeIndex).toBeNull();
    });

    test("resolveToneColor and resolveSeriesColor handle categorical, monotone, semantic, and overrides", () => {
        expect(resolveToneColor("positive")).toBe("var(--cs-chart-positive)");
        expect(resolveToneColor("caution")).toBe("var(--cs-chart-caution)");
        expect(resolveToneColor("negative")).toBe("var(--cs-chart-negative)");
        expect(resolveToneColor("accent")).toBe("var(--cs-chart-series-1)");
        expect(resolveToneColor("base")).toBe("var(--cs-color-text-weak)");

        // Categorical 10-slot cycling
        expect(resolveSeriesColor({}, 0, "categorical")).toBe("var(--cs-chart-series-1)");
        expect(resolveSeriesColor({}, 9, "categorical")).toBe("var(--cs-chart-series-10)");
        expect(resolveSeriesColor({}, 10, "categorical")).toBe("var(--cs-chart-series-1)");
        expect(resolveSeriesColor({}, -3, "categorical")).toBe("var(--cs-chart-series-1)");

        // Monotone 6-slot cycling
        expect(resolveSeriesColor({}, 0, "categorical", "blue")).toBe("var(--cs-chart-series-1)");
        expect(resolveSeriesColor({}, 5, "categorical", "blue")).toBe("var(--cs-chart-series-6)");
        expect(resolveSeriesColor({}, 6, "categorical", "blue")).toBe("var(--cs-chart-series-1)");

        // Semantic 3-slot cycling
        expect(resolveSeriesColor({}, 0, "semantic")).toBe("var(--cs-chart-positive)");
        expect(resolveSeriesColor({}, 1, "semantic")).toBe("var(--cs-chart-caution)");
        expect(resolveSeriesColor({}, 2, "semantic")).toBe("var(--cs-chart-negative)");
        expect(resolveSeriesColor({}, 3, "semantic")).toBe("var(--cs-chart-positive)");

        // Precedence: explicit color > tone > monotone > palette
        expect(
            resolveSeriesColor({ color: "#ff00aa", tone: "negative" }, 2, "semantic", "violet"),
        ).toBe("#ff00aa");
        expect(resolveSeriesColor({ tone: "caution" }, 2, "categorical", "violet")).toBe(
            "var(--cs-chart-caution)",
        );

        // ChartState keeps registered color slots stable when earlier series are hidden
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: sampleSeries,
        });
        expect(state.getSeriesColor("cost")).toBe("var(--cs-chart-series-2)");
        state.toggleSeries("revenue");
        expect(state.getSeriesColor("cost")).toBe("var(--cs-chart-series-2)");
    });

    test("getTooltipContext returns accurate datum, formatted items, totals, and null when inactive", () => {
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: sampleSeries,
            yAxis: { format: (v) => `$${String(v)}` },
        });

        expect(state.getTooltipContext()).toBeNull();

        state.setActiveIndex(0);
        const ctx0 = state.getTooltipContext();
        expect(ctx0).not.toBeNull();
        expect(ctx0?.index).toBe(0);
        expect(ctx0?.xValue).toBe("Jan");
        expect(ctx0?.xLabel).toBe("Jan");
        expect(ctx0?.datum).toBe(sampleData[0]);
        expect(ctx0?.items).toHaveLength(3);
        expect(ctx0?.items[0]?.formatted).toBe("$100");
        expect(ctx0?.items[1]?.formatted).toBe("$40");
        expect(ctx0?.items[2]?.formatted).toBe("60%"); // series.format overrides axis format
        expect(ctx0?.total).toBeCloseTo(140.6, 6);

        // Null values format as em-dash and hidden series are omitted
        state.toggleSeries("cost");
        const ctx2 = state.getTooltipContext(2);
        expect(ctx2?.items.map((item) => item.series.id)).toEqual(["revenue", "margin"]);
        expect(ctx2?.items[0]?.value).toBeNull();
        expect(ctx2?.items[0]?.formatted).toBe("\u{2014}");
        expect(ctx2?.total).toBeUndefined();
    });

    test("setDimensions sanitizes invalid sizes and horizontal orientation swaps axis ranges", () => {
        const state = new ChartState<SalesDatum>({
            data: sampleData,
            x: "month",
            series: [{ id: "revenue", label: "Revenue" }],
            orientation: "horizontal",
        });

        state.setDimensions(-100, NaN);
        expect(state.containerWidth).toBe(0);
        expect(state.containerHeight).toBe(0);
        expect(state.hasSize).toBe(false);

        state.setDimensions(500.4, 300.6);
        expect(state.containerWidth).toBe(500);
        expect(state.containerHeight).toBe(301);
        expect(state.hasSize).toBe(true);
        expect(state.xScale.range).toEqual([0, state.plotHeight]);
        expect(state.yScale.range).toEqual([0, state.plotWidth]);
    });

    test("treats empty-string and boolean cells as missing values rather than coercing to 0 or 1", () => {
        const dirtyData = [
            { label: "Row 1", empty: "", flagTrue: true, flagFalse: false, valid: 25 },
        ];
        const dirtySeries: readonly ChartSeries<(typeof dirtyData)[number]>[] = [
            { id: "empty", label: "Empty" },
            { id: "flagTrue", label: "Flag True" },
            { id: "flagFalse", label: "Flag False" },
            { id: "valid", label: "Valid" },
        ];
        const state = new ChartState({
            data: dirtyData,
            x: "label",
            series: dirtySeries,
        });

        const datum = dirtyData[0];
        const [emptySeries, trueSeries, falseSeries, validSeries] = dirtySeries;
        expect(datum).toBeDefined();
        if (datum && emptySeries && trueSeries && falseSeries && validSeries) {
            expect(state.extractSeriesValue(emptySeries, datum, 0)).toBeNull();
            expect(state.extractSeriesValue(trueSeries, datum, 0)).toBeNull();
            expect(state.extractSeriesValue(falseSeries, datum, 0)).toBeNull();
            expect(state.extractSeriesValue(validSeries, datum, 0)).toBe(25);
        }

        state.setActiveIndex(0);
        const tooltip = state.getTooltipContext();
        expect(tooltip?.items.map((item) => item.value)).toEqual([null, null, null, 25]);
        expect(tooltip?.items.slice(0, 3).map((item) => item.formatted)).toEqual([
            "\u{2014}",
            "\u{2014}",
            "\u{2014}",
        ]);
        expect(tooltip?.total).toBe(25);
    });

    test("tracks hasNamedStacks, sizes yScale.domain to the tallest individual stack (not combined side-by-side stacks), and updates domain when hiding a stack", () => {
        interface BudgetRow {
            quarter: string;
            planCore: number;
            planBonus: number;
            actualCore: number;
            actualBonus: number;
        }

        const budgetData: readonly BudgetRow[] = [
            { quarter: "Q1", planCore: 60, planBonus: 40, actualCore: 80, actualBonus: 70 },
            { quarter: "Q2", planCore: 50, planBonus: 50, actualCore: 90, actualBonus: 90 },
        ];

        const budgetSeries: readonly ChartSeries<BudgetRow>[] = [
            { id: "planCore", label: "Plan Core", stack: "plan" },
            { id: "planBonus", label: "Plan Bonus", stack: "plan" },
            { id: "actualCore", label: "Actual Core", stack: "actual" },
            { id: "actualBonus", label: "Actual Bonus", stack: "actual" },
        ];

        const state = new ChartState<BudgetRow>({
            data: budgetData,
            x: "quarter",
            series: budgetSeries,
            width: 560,
            height: 280,
            tooltipMode: "item",
        });

        expect(state.hasNamedStacks).toBe(true);

        // Tallest individual stack is Q2 "actual" = 90 + 90 = 180.
        // Combined side-by-side sum would be 280 — domain must fit 180 and NOT expand to 280.
        expect(state.yScale.domain[0]).toBe(0);
        expect(state.yScale.domain[1]).toBeGreaterThanOrEqual(180);
        expect(state.yScale.domain[1]).toBeLessThan(280);

        // Item-mode activeAnchor for actualBonus at Q1 (actualCore=80, actualBonus=70 -> midpoint 115)
        // must be computed strictly within the "actual" stack, ignoring "plan".
        state.setActiveIndex(0);
        state.setActiveSeries("actualBonus");
        expect(state.activeAnchor).not.toBeNull();
        expect(state.activeAnchor?.plotY).toBeCloseTo(state.yScale.scale(115), 3);

        // Hiding both series in "actual" removes "actual" from the domain calculation -> max drops to "plan" = 100
        state.toggleSeries("actualCore");
        state.toggleSeries("actualBonus");
        expect(state.hasNamedStacks).toBe(true);
        expect(state.yScale.domain[1]).toBeGreaterThanOrEqual(100);
        expect(state.yScale.domain[1]).toBeLessThan(180);

        // Hiding all named-stack series sets hasNamedStacks to false
        state.toggleSeries("planCore");
        state.toggleSeries("planBonus");
        expect(state.hasNamedStacks).toBe(false);

        // showAllSeries restores named stacks and full domain
        state.showAllSeries();
        expect(state.hasNamedStacks).toBe(true);
        expect(state.yScale.domain[1]).toBeGreaterThanOrEqual(180);
        expect(state.yScale.domain[1]).toBeLessThan(280);
    });
});

describe("Charts M8 — Normalized Stacking, Direct Labels & IBCS State", () => {
    describe("computeStackedSeries & computeStackedBarRects (normalized: true)", () => {
        test("normalizes positive stacks to [0, 1], guards all-zero categories without NaN, and clamps negative values to 0", () => {
            const result = computeStackedSeries(
                [
                    { id: "a", values: [25, 0, -20, null] },
                    { id: "b", values: [75, 0, 50, 0] },
                    { id: "c", values: [0, 0, 50, 0] },
                ],
                { normalized: true },
            );

            expect(result.extent).toEqual([0, 1]);
            expect(result.layers).toHaveLength(3);

            const [layerA, layerB, layerC] = result.layers;

            // Index 0: 25 / 100 = 0.25, 75 / 100 = 0.75, 0 / 100 = 0
            expect(layerA?.points[0]?.y0).toBeCloseTo(0, 6);
            expect(layerA?.points[0]?.y1).toBeCloseTo(0.25, 6);
            expect(layerB?.points[0]?.y0).toBeCloseTo(0.25, 6);
            expect(layerB?.points[0]?.y1).toBeCloseTo(1, 6);
            expect(layerC?.points[0]?.y0).toBeCloseTo(1, 6);
            expect(layerC?.points[0]?.y1).toBeCloseTo(1, 6);

            // Index 1: all-zero category must never emit NaN
            for (const layer of result.layers) {
                const pt = layer.points[1];
                expect(pt?.y0).toBe(0);
                expect(pt?.y1).toBe(0);
                expect(Number.isFinite(pt?.y0)).toBe(true);
                expect(Number.isFinite(pt?.y1)).toBe(true);
            }

            // Index 2: negative value clamped to 0 so b=50 and c=50 each take 50%
            expect(layerA?.points[2]?.y0).toBe(0);
            expect(layerA?.points[2]?.y1).toBe(0);
            expect(layerB?.points[2]?.y0).toBeCloseTo(0, 6);
            expect(layerB?.points[2]?.y1).toBeCloseTo(0.5, 6);
            expect(layerC?.points[2]?.y0).toBeCloseTo(0.5, 6);
            expect(layerC?.points[2]?.y1).toBeCloseTo(1, 6);

            // Index 3: null + zeros -> safe 0 without NaN
            expect(layerA?.points[3]?.value).toBeNull();
            expect(layerA?.points[3]?.y0).toBe(0);
            expect(layerA?.points[3]?.y1).toBe(0);

            // Completely zero dataset has [0, 0] extent and zero NaNs
            const allZero = computeStackedSeries(
                [
                    { id: "x", values: [0, 0] },
                    { id: "y", values: [0, null] },
                ],
                { normalized: true },
            );
            expect(allZero.extent).toEqual([0, 0]);
            for (const layer of allZero.layers) {
                for (const pt of layer.points) {
                    expect(pt.y0).toBe(0);
                    expect(pt.y1).toBe(0);
                }
            }
        });

        test("computeStackedBarRects with normalized: true computes accurate shares, safe all-zero geometry, and outer-cap-only rounding", () => {
            const pctScale = createNumericScale({
                values: [0, 1],
                range: [200, 0],
                percent: true,
            });

            expect(pctScale.domain).toEqual([0, 1]);
            expect(pctScale.ticks(5)).toEqual([0, 0.25, 0.5, 0.75, 1]);
            expect(pctScale.ticks(3)).toEqual([0, 0.5, 1]);
            expect(formatPercentTick(0)).toBe("0%");
            expect(formatPercentTick(0.25)).toBe("25%");
            expect(formatPercentTick(1)).toBe("100%");
            expect(formatPercentTick("Q1")).toBe("Q1");

            const rects = computeStackedBarRects({
                series: [
                    { id: "a", values: [25, 0, 10] },
                    { id: "b", values: [75, 0, 30] },
                ],
                categoryStarts: [0, 80, 160],
                bandwidth: 60,
                valueScale: pctScale,
                orientation: "vertical",
                radius: 6,
                segmentGap: 0,
                normalized: true,
            });

            expect(rects).toHaveLength(6);

            // Category 0: a = 25%, b = 75%
            const c0a = requireBarRect(rects, "a", 0);
            const c0b = requireBarRect(rects, "b", 0);
            expect(c0a.share).toBeCloseTo(0.25, 6);
            expect(c0b.share).toBeCloseTo(0.75, 6);
            expect((c0a.share ?? 0) + (c0b.share ?? 0)).toBeCloseTo(1, 6);
            expect(c0a.isNegative).toBe(false);
            expect(c0b.isNegative).toBe(false);
            expect(c0a.capSide).toBe("none");
            expect(c0b.capSide).toBe("top");
            expect(c0a.height).toBe(50);
            expect(c0b.height).toBe(150);

            // Category 1: all-zero -> share 0, height 0, empty path, no NaN
            const c1a = requireBarRect(rects, "a", 1);
            const c1b = requireBarRect(rects, "b", 1);
            expect(c1a.share).toBe(0);
            expect(c1b.share).toBe(0);
            expect(c1a.height).toBe(0);
            expect(c1b.height).toBe(0);
            expect(c1a.path).toBe("");
            expect(c1b.path).toBe("");

            // Horizontal normalized stacked bars also compute share and right cap on outermost segment
            const hScale = createNumericScale({ values: [0, 1], range: [0, 200], percent: true });
            const hRects = computeStackedBarRects({
                series: [
                    { id: "a", values: [40] },
                    { id: "b", values: [60] },
                ],
                categoryStarts: [0],
                bandwidth: 40,
                valueScale: hScale,
                orientation: "horizontal",
                segmentGap: 0,
                normalized: true,
            });
            const ha = requireBarRect(hRects, "a", 0);
            const hb = requireBarRect(hRects, "b", 0);
            expect(ha.share).toBeCloseTo(0.4, 6);
            expect(hb.share).toBeCloseTo(0.6, 6);
            expect(ha.capSide).toBe("none");
            expect(hb.capSide).toBe("right");
            expect(ha.width).toBe(80);
            expect(hb.width).toBe(120);
        });
    });

    describe("resolveDirectLabelPositions (chart-measure.internal.ts)", () => {
        test("returns empty array for empty input and leaves well-separated labels un-nudged", () => {
            expect(resolveDirectLabelPositions([], 200)).toEqual([]);

            const placed = resolveDirectLabelPositions(
                [
                    { id: "top", y: 30 },
                    { id: "mid", y: 100 },
                    { id: "bot", y: 170 },
                ],
                200,
                14,
                8,
            );

            expect(placed).toEqual([
                { id: "top", yTrue: 30, y: 30, nudged: false },
                { id: "mid", yTrue: 100, y: 100, nudged: false },
                { id: "bot", yTrue: 170, y: 170, nudged: false },
            ]);
        });

        test("enforces minGap vertical separation on colliding endpoints and sets nudged when displaced > 3px", () => {
            const placed = resolveDirectLabelPositions(
                [
                    { id: "s1", y: 100 },
                    { id: "s2", y: 100 },
                    { id: "s3", y: 102 },
                ],
                200,
                14,
                8,
            );

            expect(placed.map((p) => p.id)).toEqual(["s1", "s2", "s3"]);
            for (let i = 1; i < placed.length; i++) {
                const prev = placed[i - 1];
                const curr = placed[i];
                expect((curr?.y ?? 0) - (prev?.y ?? 0)).toBeGreaterThanOrEqual(14);
            }
            // s1 stays at 100 (0px displacement -> nudged: false); s2 pushed +14px, s3 pushed +26px -> nudged: true
            expect(placed[0]?.nudged).toBe(false);
            expect(placed[1]?.nudged).toBe(true);
            expect(placed[2]?.nudged).toBe(true);

            // Displacement <= 3px does NOT mark nudged
            const tinyNudge = resolveDirectLabelPositions(
                [
                    { id: "a", y: 50 },
                    { id: "b", y: 61 }, // pushed to 64 -> delta = 3px (not > 3)
                ],
                200,
                14,
                8,
            );
            expect(tinyNudge[1]?.y).toBe(64);
            expect(tinyNudge[1]?.nudged).toBe(false);
        });

        test("clamps placements within [padding, plotHeight - padding] including bottom-edge backward pass and overcrowded plots", () => {
            const bottomCluster = resolveDirectLabelPositions(
                [
                    { id: "a", y: 190 },
                    { id: "b", y: 195 },
                    { id: "c", y: 205 },
                ],
                200,
                14,
                8,
            );

            for (const entry of bottomCluster) {
                expect(entry.y).toBeGreaterThanOrEqual(8);
                expect(entry.y).toBeLessThanOrEqual(192);
            }
            expect(bottomCluster[2]?.y).toBe(192);
            expect(bottomCluster[1]?.y).toBe(178);
            expect(bottomCluster[0]?.y).toBe(164);
            expect(bottomCluster[0]?.nudged).toBe(true);
            expect(bottomCluster[2]?.nudged).toBe(true);

            // Top-edge clamp: y < padding pushed inside [8, 192]
            const topEdge = resolveDirectLabelPositions([{ id: "top", y: 0 }], 200, 14, 8);
            expect(topEdge[0]?.y).toBe(8);
            expect(topEdge[0]?.nudged).toBe(true);

            // Overcrowded plot (5 labels needing 56px inside a 30px tall plot) still clamps cleanly without NaN
            const overcrowded = resolveDirectLabelPositions(
                [
                    { id: "1", y: 10 },
                    { id: "2", y: 10 },
                    { id: "3", y: 10 },
                    { id: "4", y: 10 },
                    { id: "5", y: 10 },
                ],
                30,
                14,
                8,
            );
            for (const entry of overcrowded) {
                expect(Number.isFinite(entry.y)).toBe(true);
                expect(entry.y).toBeGreaterThanOrEqual(8);
                expect(entry.y).toBeLessThanOrEqual(22);
            }
        });
    });

    describe("ChartState M8 extensions", () => {
        interface ScenarioRow {
            month: string;
            val: number;
            other: number;
            phase: "actual" | "forecast" | "plan";
        }

        const scenarioData: readonly ScenarioRow[] = [
            { month: "Jan", val: 40, other: 60, phase: "actual" },
            { month: "Feb", val: -20, other: 80, phase: "forecast" },
            { month: "Mar", val: 0, other: 0, phase: "plan" },
        ];

        test("resolves per-datum color, tone, and pattern callbacks with proper precedence and fallbacks", () => {
            const state = new ChartState<ScenarioRow>({
                data: scenarioData,
                x: "month",
                series: [
                    {
                        id: "val",
                        label: "Variance",
                        color: (d) => (d.phase === "plan" ? "#334155" : undefined),
                        tone: (d) => (d.val >= 0 ? "positive" : "negative"),
                        pattern: (d) =>
                            d.phase === "forecast"
                                ? "hatch"
                                : d.phase === "plan"
                                  ? "outline"
                                  : "solid",
                    },
                    {
                        id: "other",
                        label: "Baseline",
                        pattern: "hatch",
                    },
                ],
            });

            const [row0, row1, row2] = scenarioData;
            if (!row0 || !row1 || !row2) {
                throw new Error("Expected 3 scenario rows");
            }

            // Datum 0: color callback returns undefined -> falls back to tone callback ("positive")
            expect(state.resolveDatumColor("val", row0, 0)).toBe("var(--cs-chart-positive)");
            expect(state.resolveDatumPattern("val", row0, 0)).toBe("solid");

            // Datum 1: negative -> tone callback ("negative"), pattern callback ("hatch")
            expect(state.resolveDatumColor("val", row1, 1)).toBe("var(--cs-chart-negative)");
            expect(state.resolveDatumPattern("val", row1, 1)).toBe("hatch");

            // Datum 2: color callback takes precedence over tone callback, pattern callback ("outline")
            expect(state.resolveDatumColor("val", row2, 2)).toBe("#334155");
            expect(state.resolveDatumPattern("val", row2, 2)).toBe("outline");

            // Static vs callback resolveSeriesPattern
            expect(state.resolveSeriesPattern("val")).toBe("solid");
            expect(state.resolveSeriesPattern("other")).toBe("hatch");
            expect(state.resolveDatumPattern("other", row0, 0)).toBe("hatch");

            // Unknown series id falls back safely
            expect(state.resolveDatumPattern("missing", row0, 0)).toBe("solid");
            expect(state.resolveDatumColor("missing", row0, 0)).toBe(
                "var(--cs-chart-series-1)",
            );

            // Tooltip context carries per-datum resolved color & non-solid pattern
            const ctx1 = state.getTooltipContext(1);
            expect(ctx1?.items[0]?.color).toBe("var(--cs-chart-negative)");
            expect(ctx1?.items[0]?.pattern).toBe("hatch");
            expect(ctx1?.items[1]?.pattern).toBe("hatch");

            const ctx0 = state.getTooltipContext(0);
            expect(ctx0?.items[0]?.color).toBe("var(--cs-chart-positive)");
            expect(ctx0?.items[0]?.pattern).toBeUndefined();
        });

        test("locks yScale domain to [0, 1] in isPercent mode and recalculates tooltip shares when toggling series", () => {
            const state = new ChartState<ScenarioRow>({
                data: [
                    { month: "Jan", val: 25, other: 75, phase: "actual" },
                    { month: "Feb", val: 0, other: 0, phase: "actual" },
                ],
                x: "month",
                series: [
                    { id: "val", label: "A" },
                    { id: "other", label: "B" },
                ],
                percent: true,
                width: 480,
                height: 260,
            });

            expect(state.isPercent).toBe(true);
            expect(state.hasStackedMarks).toBe(true);
            expect(state.yScale.domain).toEqual([0, 1]);

            const ctx0 = state.getTooltipContext(0);
            expect(ctx0?.items[0]?.share).toBeCloseTo(0.25, 6);
            expect(ctx0?.items[0]?.formattedShare).toBe("25%");
            expect(ctx0?.items[1]?.share).toBeCloseTo(0.75, 6);
            expect(ctx0?.items[1]?.formattedShare).toBe("75%");

            // All-zero category yields 0% without NaN
            const ctx1 = state.getTooltipContext(1);
            expect(ctx1?.items[0]?.share).toBe(0);
            expect(ctx1?.items[0]?.formattedShare).toBe("0%");

            // Toggling "other" off recalculates "val" share to 100%
            state.toggleSeries("other");
            const ctx0AfterToggle = state.getTooltipContext(0);
            expect(ctx0AfterToggle?.items).toHaveLength(1);
            expect(ctx0AfterToggle?.items[0]?.share).toBeCloseTo(1, 6);
            expect(ctx0AfterToggle?.items[0]?.formattedShare).toBe("100%");

            state.showAllSeries();
            expect(state.getTooltipContext(0)?.items[0]?.formattedShare).toBe("25%");
        });

        test("clamps selectedIndex, toggles off on repeat click, switches directly, and handles empty/shrinking data", () => {
            const state = new ChartState<ScenarioRow>({
                data: scenarioData,
                x: "month",
                series: [{ id: "val", label: "Val" }],
                selectable: true,
                selectedIndex: 99,
            });

            // Constructor clamps out-of-range selectedIndex to data.length - 1
            expect(state.selectedIndex).toBe(2);
            expect(state.hasSelection).toBe(true);

            // Negative clamps to 0; float truncates
            state.setSelectedIndex(-5);
            expect(state.selectedIndex).toBe(0);
            state.setSelectedIndex(1.9);
            expect(state.selectedIndex).toBe(1);

            // Toggle same index clears to null
            state.toggleSelectedIndex(1);
            expect(state.selectedIndex).toBeNull();
            expect(state.hasSelection).toBe(false);

            // Toggle pins new index, then switches directly to another index
            state.toggleSelectedIndex(0);
            expect(state.selectedIndex).toBe(0);
            state.toggleSelectedIndex(2);
            expect(state.selectedIndex).toBe(2);

            // Shrinking data clamps getter; empty data returns null
            state.data = scenarioData.slice(0, 1);
            expect(state.selectedIndex).toBe(0);
            state.data = [];
            expect(state.selectedIndex).toBeNull();
            expect(state.hasSelection).toBe(false);

            // NaN / Infinity / null clear selection
            state.data = scenarioData;
            state.setSelectedIndex(1);
            state.setSelectedIndex(NaN);
            expect(state.selectedIndex).toBeNull();
            state.setSelectedIndex(1);
            state.setSelectedIndex(null);
            expect(state.selectedIndex).toBeNull();
        });

        test("expands margins.right automatically when directLabels is enabled and respects horizontal/y2/override guards", () => {
            const state = new ChartState<ScenarioRow>({
                data: scenarioData,
                x: "month",
                series: [
                    { id: "val", label: "Actual Revenue" },
                    { id: "other", label: "Baseline" },
                ],
                width: 600,
                height: 280,
                directLabels: false,
            });

            const defaultRight = state.margins.right;
            expect(defaultRight).toBe(12);

            state.directLabels = true;
            const expandedRight = state.margins.right;
            expect(expandedRight).toBeGreaterThanOrEqual(88);
            expect(expandedRight).toBeLessThanOrEqual(136);
            expect(state.plotWidth).toBeLessThan(600 - state.margins.left - defaultRight);

            // Narrow container caps directLabels right margin at max(64, floor(width * 0.32))
            state.setDimensions(240, 200);
            expect(state.margins.right).toBeLessThanOrEqual(Math.max(64, Math.floor(240 * 0.32)));

            // Horizontal orientation disables direct-label right margin expansion
            state.setDimensions(600, 280);
            state.orientation = "horizontal";
            expect(state.margins.right).toBe(12);
            state.orientation = "vertical";
            expect(state.margins.right).toBe(expandedRight);

            // Explicit marginOverrides.right overrides automatic expansion
            state.marginOverrides = { right: 50 };
            expect(state.margins.right).toBe(50);
            state.marginOverrides = {};

            // Y2 axis takes precedence over directLabels width
            state.series = [
                { id: "val", label: "Actual Revenue", yAxis: "left" },
                { id: "other", label: "Rate", yAxis: "right" },
            ];
            expect(state.hasY2Axis).toBe(true);
            expect(state.margins.right).not.toBe(expandedRight);
        });
    });
});

describe("Charts M10 — Waterfall Geometry & Exports", () => {
    describe("public barrel exports", () => {
        test("exports waterfall components and constants without leaking internal geometry helpers", () => {
            expect(CHART_WATERFALL_ROW_TYPES).toEqual(["start", "delta", "subtotal", "total"]);
            expect(CHART_WATERFALL_TOTAL_TONES).toEqual(["base", "accent"]);

            const exportedKeys = Object.keys(chartsExports);
            expect(exportedKeys).toContain("ChartWaterfall");
            expect(exportedKeys).toContain("WaterfallChart");
            expect(exportedKeys).toContain("CHART_WATERFALL_ROW_TYPES");
            expect(exportedKeys).toContain("CHART_WATERFALL_TOTAL_TONES");
            expect(exportedKeys).not.toContain("computeWaterfallSteps");
            expect(exportedKeys).not.toContain("computeWaterfallBars");
            expect(exportedKeys).not.toContain("buildWaterfallBarPath");
        });
    });

    describe("computeWaterfallSteps", () => {
        test("computes running cumulative base math across start, positive/negative deltas, subtotal, and total", () => {
            const inputs: readonly WaterfallBarInput[] = [
                { index: 0, label: "Revenue", value: 1000, type: "start" },
                { index: 1, label: "COGS", value: -350, type: "delta" },
                { index: 2, label: "Gross Profit", value: null, type: "subtotal" },
                { index: 3, label: "Services", value: 150, type: "delta" },
                { index: 4, label: "OpEx", value: -280, type: "delta" },
                { index: 5, label: "Net Income", value: undefined, type: "total" },
            ];

            const result = computeWaterfallSteps(inputs);
            expect(result.extent).toEqual([0, 1000]);
            expect(result.crossesZero).toBe(false);
            expect(result.steps).toHaveLength(6);

            // Start: anchors at 0 -> 1000
            expect(result.steps[0]).toMatchObject({
                index: 0,
                type: "start",
                kind: "start",
                value: 1000,
                y0: 0,
                y1: 1000,
                runningTotal: 1000,
                isAnchor: true,
                isPositive: true,
                isNegative: false,
            });

            // Negative delta: 1000 -> 650
            expect(result.steps[1]).toMatchObject({
                index: 1,
                type: "delta",
                kind: "negative",
                value: -350,
                y0: 1000,
                y1: 650,
                runningTotal: 650,
                isAnchor: false,
                isPositive: false,
                isNegative: true,
            });

            // Omitted subtotal: inherits running (650), anchors 0 -> 650
            expect(result.steps[2]).toMatchObject({
                index: 2,
                type: "subtotal",
                kind: "subtotal",
                value: 650,
                y0: 0,
                y1: 650,
                runningTotal: 650,
                isAnchor: true,
                isPositive: true,
                isNegative: false,
            });

            // Positive delta: 650 -> 800
            expect(result.steps[3]).toMatchObject({
                index: 3,
                type: "delta",
                kind: "positive",
                value: 150,
                y0: 650,
                y1: 800,
                runningTotal: 800,
                isAnchor: false,
                isPositive: true,
                isNegative: false,
            });

            // Negative delta: 800 -> 520
            expect(result.steps[4]).toMatchObject({
                index: 4,
                type: "delta",
                kind: "negative",
                value: -280,
                y0: 800,
                y1: 520,
                runningTotal: 520,
                isAnchor: false,
                isPositive: false,
                isNegative: true,
            });

            // Omitted total: inherits running (520), anchors 0 -> 520
            expect(result.steps[5]).toMatchObject({
                index: 5,
                type: "total",
                kind: "total",
                value: 520,
                y0: 0,
                y1: 520,
                runningTotal: 520,
                isAnchor: true,
                isPositive: true,
                isNegative: false,
            });
        });

        test("syncs running total when subtotal or total provides an explicit finite value", () => {
            const inputs: readonly WaterfallBarInput[] = [
                { index: 0, label: "Start", value: 100, type: "start" },
                { index: 1, label: "Up", value: 40, type: "delta" },
                // Explicit subtotal overrides running 140 -> 150 (e.g. rounding adjustment)
                { index: 2, label: "Adjusted Sub", value: 150, type: "subtotal" },
                // Next delta builds from synced 150 -> 125
                { index: 3, label: "Down", value: -25, type: "delta" },
                // Explicit total overrides running 125 -> 130
                { index: 4, label: "Final Total", value: 130, type: "total" },
            ];

            const result = computeWaterfallSteps(inputs);
            expect(result.steps[2]).toMatchObject({
                value: 150,
                y0: 0,
                y1: 150,
                runningTotal: 150,
            });
            expect(result.steps[3]).toMatchObject({
                value: -25,
                y0: 150,
                y1: 125,
                runningTotal: 125,
            });
            expect(result.steps[4]).toMatchObject({
                value: 130,
                y0: 0,
                y1: 130,
                runningTotal: 130,
            });
            expect(result.extent).toEqual([0, 150]);
        });

        test("tracks zero-crossing negative deltas, running extremes in extent, and crossesZero flag", () => {
            const inputs: readonly WaterfallBarInput[] = [
                { index: 0, label: "Start", value: 60, type: "start" },
                // Crosses from +60 through 0 down to -40
                { index: 1, label: "Write-off", value: -100, type: "delta" },
                // Deeper negative: -40 -> -75
                { index: 2, label: "Penalty", value: -35, type: "delta" },
                // Recovers back across 0: -75 -> +25
                { index: 3, label: "Recovery", value: 100, type: "delta" },
                { index: 4, label: "Ending", value: null, type: "total" },
            ];

            const result = computeWaterfallSteps(inputs);
            expect(result.crossesZero).toBe(true);
            expect(result.extent).toEqual([-75, 60]);

            expect(result.steps[1]).toMatchObject({
                y0: 60,
                y1: -40,
                runningTotal: -40,
                kind: "negative",
                isNegative: true,
            });
            expect(result.steps[2]).toMatchObject({
                y0: -40,
                y1: -75,
                runningTotal: -75,
                kind: "negative",
            });
            expect(result.steps[3]).toMatchObject({
                y0: -75,
                y1: 25,
                runningTotal: 25,
                kind: "positive",
                isPositive: true,
            });
            expect(result.steps[4]).toMatchObject({
                y0: 0,
                y1: 25,
                runningTotal: 25,
                kind: "total",
            });

            // All-negative bridge does NOT cross zero (maxExtent === 0)
            const allNegative = computeWaterfallSteps([
                { index: 0, label: "Deficit", value: -50, type: "start" },
                { index: 1, label: "Cost", value: -20, type: "delta" },
                { index: 2, label: "Total", value: null, type: "total" },
            ]);
            expect(allNegative.extent).toEqual([-70, 0]);
            expect(allNegative.crossesZero).toBe(false);
            expect(allNegative.steps[2]).toMatchObject({
                value: -70,
                y0: 0,
                y1: -70,
                runningTotal: -70,
                isNegative: true,
                isPositive: false,
            });
        });

        test("handles empty input and null/NaN values safely without NaN leakage", () => {
            expect(computeWaterfallSteps([])).toEqual({
                steps: [],
                extent: [0, 0],
                crossesZero: false,
            });

            const safe = computeWaterfallSteps([
                { index: 0, label: "Start", value: NaN, type: "start" },
                { index: 1, label: "Missing", value: null, type: "delta" },
                { index: 2, label: "Gain", value: 25, type: "delta" },
                { index: 3, label: "End", value: Infinity, type: "total" },
            ]);
            expect(safe.extent).toEqual([0, 25]);
            expect(safe.steps[0]?.value).toBe(0);
            expect(safe.steps[1]?.value).toBe(0);
            expect(safe.steps[2]?.runningTotal).toBe(25);
            expect(safe.steps[3]?.value).toBe(25);
        });
    });

    describe("computeWaterfallBars & buildWaterfallBarPath", () => {
        test("snaps bar coordinates to integers, centers maxBarWidth, and generates half-pixel dashed connectors", () => {
            const items: readonly WaterfallBarInput[] = [
                { index: 0, label: "Start", value: 100, type: "start" },
                { index: 1, label: "Up", value: 40, type: "delta" },
                { index: 2, label: "Down", value: -60, type: "delta" },
                { index: 3, label: "Total", value: null, type: "total" },
            ];
            const valueScale = createNumericScale({
                values: [0, 140],
                range: [200, 0],
                includeZero: true,
                nice: false,
            });

            const result = computeWaterfallBars({
                items,
                categoryStarts: [10.4, 90.6, 170.2, 250.8],
                bandwidth: 64,
                valueScale,
                maxBarWidth: 40,
                radius: 4,
            });

            expect(result.bars).toHaveLength(4);
            expect(result.connectors).toHaveLength(3);

            for (const bar of result.bars) {
                expect(Number.isSafeInteger(bar.x)).toBe(true);
                expect(Number.isSafeInteger(bar.y)).toBe(true);
                expect(Number.isSafeInteger(bar.width)).toBe(true);
                expect(Number.isSafeInteger(bar.height)).toBe(true);
                expect(Number.isSafeInteger(bar.baseline)).toBe(true);
                expect(bar.width).toBe(40);
                expect(bar.path.length).toBeGreaterThan(0);
                expect(bar.path).not.toContain("NaN");
            }

            // Cap directions & anchor vs floating originRadius
            expect(result.bars[0]?.capSide).toBe("top");
            expect(result.bars[0]?.originRadius).toBe(0);
            expect(result.bars[1]?.capSide).toBe("top");
            expect(result.bars[1]?.originRadius).toBeGreaterThan(0);
            expect(result.bars[2]?.capSide).toBe("bottom");
            expect(result.bars[2]?.originRadius).toBeGreaterThan(0);
            expect(result.bars[3]?.capSide).toBe("top");
            expect(result.bars[3]?.originRadius).toBe(0);

            // Connectors bridge bar i right edge to bar i+1 left edge at snapHalf(runningTotal)
            for (let i = 0; i < result.connectors.length; i++) {
                const conn = result.connectors[i];
                const curr = result.bars[i];
                const next = result.bars[i + 1];
                expect(conn).toBeDefined();
                expect(curr).toBeDefined();
                expect(next).toBeDefined();
                if (!conn || !curr || !next) continue;

                expect(conn.fromIndex).toBe(curr.index);
                expect(conn.toIndex).toBe(next.index);
                expect(conn.x1).toBe(curr.x + curr.width);
                expect(conn.x2).toBe(next.x);
                expect(conn.value).toBe(curr.runningTotal);
                expect(conn.y).toBe(snapHalf(valueScale.scale(curr.runningTotal)));
                expect(Number.isSafeInteger(conn.y - 0.5)).toBe(true);
            }
        });

        test("enforces minBarLength (2px) for tiny non-zero deltas, keeps exact 0 at height 0, and clamps cap radii", () => {
            const items: readonly WaterfallBarInput[] = [
                { index: 0, label: "Start", value: 1000, type: "start" },
                { index: 1, label: "Tiny Up", value: 0.2, type: "delta" },
                { index: 2, label: "Tiny Down", value: -0.2, type: "delta" },
                { index: 3, label: "Zero Delta", value: 0, type: "delta" },
                { index: 4, label: "Normal", value: 200, type: "delta" },
            ];
            const valueScale = createNumericScale({
                values: [0, 1200],
                range: [200, 0],
                includeZero: true,
                nice: false,
            });

            const result = computeWaterfallBars({
                items,
                categoryStarts: [0, 60, 120, 180, 240],
                bandwidth: 40,
                valueScale,
                radius: 20, // deliberately larger than bar dimensions to verify clamping
                minBarLength: 2,
            });

            const tinyUp = result.bars[1];
            const tinyDown = result.bars[2];
            const zeroBar = result.bars[3];
            const normalBar = result.bars[4];

            expect(tinyUp?.height).toBe(2);
            expect(tinyUp?.capSide).toBe("top");
            expect(tinyUp?.y).toBe((tinyUp?.baseline ?? 0) - 2);
            expect(tinyUp?.radius).toBe(clampBarRadius(20, 40, 2));
            expect(tinyUp?.originRadius).toBe(0); // height < 6 disables originRadius

            expect(tinyDown?.height).toBe(2);
            expect(tinyDown?.capSide).toBe("bottom");
            expect(tinyDown?.y).toBe(tinyDown?.baseline);
            expect(tinyDown?.radius).toBe(clampBarRadius(20, 40, 2));
            expect(tinyDown?.originRadius).toBe(0);

            expect(zeroBar?.height).toBe(0);
            expect(zeroBar?.capSide).toBe("none");
            expect(zeroBar?.radius).toBe(0);
            expect(zeroBar?.originRadius).toBe(0);
            expect(zeroBar?.path).toBe("");

            expect(normalBar?.radius).toBe(
                clampBarRadius(20, normalBar?.width ?? 0, normalBar?.height ?? 0),
            );
            expect(normalBar?.radius).toBeLessThanOrEqual((normalBar?.width ?? 0) / 2);
            expect(normalBar?.radius).toBeLessThanOrEqual(normalBar?.height ?? 0);
        });

        test("handles empty inputs, zero bandwidth, touching bars, and zero-size path helper safely", () => {
            const valueScale = createNumericScale({ values: [0, 100], range: [100, 0] });

            expect(
                computeWaterfallBars({
                    items: [],
                    categoryStarts: [],
                    bandwidth: 40,
                    valueScale,
                }),
            ).toEqual({ bars: [], connectors: [], extent: [0, 0], crossesZero: false });

            expect(
                computeWaterfallBars({
                    items: [{ index: 0, label: "Start", value: 50, type: "start" }],
                    categoryStarts: [10],
                    bandwidth: 0,
                    valueScale,
                }),
            ).toEqual({ bars: [], connectors: [], extent: [0, 50], crossesZero: false });

            // Touching bars (x2 <= x1) emit zero connectors
            const touching = computeWaterfallBars({
                items: [
                    { index: 0, label: "A", value: 40, type: "start" },
                    { index: 1, label: "B", value: 20, type: "delta" },
                ],
                categoryStarts: [0, 40],
                bandwidth: 40,
                maxBarWidth: 40,
                valueScale,
            });
            expect(touching.bars).toHaveLength(2);
            expect(touching.connectors).toHaveLength(0);

            // buildWaterfallBarPath guards zero/negative dimensions
            expect(buildWaterfallBarPath(0, 0, 0, 20, 4, 1.5, "top")).toBe("");
            expect(buildWaterfallBarPath(0, 0, 20, 0, 4, 1.5, "bottom")).toBe("");
            const dualRadiusPath = buildWaterfallBarPath(10, 20, 30, 40, 4, 1.5, "top");
            expect(dualRadiusPath).toContain("A4,4");
            expect(dualRadiusPath).toContain("A1.5,1.5");
            expect(dualRadiusPath).not.toContain("NaN");
        });
    });
});

describe("Charts M11 — Bullet Geometry & Public Exports", () => {
    test("public barrel exports ChartBullet & BulletChart and does not leak internal bullet helpers", () => {
        const exportedKeys = Object.keys(chartsExports);
        expect(exportedKeys).toContain("ChartBullet");
        expect(exportedKeys).toContain("BulletChart");
        expect(exportedKeys).not.toContain("computeBulletRows");
        expect(exportedKeys).not.toContain("getBulletSizeMetrics");
    });

    test("getBulletSizeMetrics returns monotonic size metrics for sm, md, and lg", () => {
        const sm = getBulletSizeMetrics("sm");
        const md = getBulletSizeMetrics("md");
        const lg = getBulletSizeMetrics("lg");

        expect(sm.rowHeight).toBeLessThan(md.rowHeight);
        expect(md.rowHeight).toBeLessThan(lg.rowHeight);
        expect(sm.rowGap).toBeLessThan(md.rowGap);
        expect(md.rowGap).toBeLessThan(lg.rowGap);
        expect(sm.trackHeight).toBeLessThan(md.trackHeight);
        expect(md.trackHeight).toBeLessThan(lg.trackHeight);
        expect(sm.trackRadius).toBeLessThan(md.trackRadius);
        expect(md.trackRadius).toBeLessThan(lg.trackRadius);
        expect(sm.barRadius).toBeLessThan(md.barRadius);
        expect(md.barRadius).toBeLessThan(lg.barRadius);
        expect(sm.labelFontSize).toBeLessThan(md.labelFontSize);
        expect(md.labelFontSize).toBeLessThan(lg.labelFontSize);
    });

    describe("computeBulletRows", () => {
        test("computes per-row domains vs sharedScale domain + sharedTicks and totalHeight", () => {
            const items: readonly BulletRowInput[] = [
                {
                    index: 0,
                    label: "Revenue",
                    actual: 270,
                    target: 250,
                    ranges: [150, 225, 300],
                },
                {
                    index: 1,
                    label: "Margin",
                    actual: 62,
                    target: 65,
                    ranges: [50, 60, 75],
                },
            ];

            // Per-row scale
            const perRow = computeBulletRows({
                items,
                width: 400,
                rowHeight: 44,
                rowGap: 12,
                trackHeight: 16,
                sharedScale: false,
            });
            expect(perRow.rows).toHaveLength(2);
            expect(perRow.sharedMax).toBe(300);
            expect(perRow.sharedTicks).toEqual([]);
            expect(perRow.totalHeight).toBe(44 * 2 + 12 + 4);
            expect(perRow.rows[0]?.domainMax).toBe(300);
            expect(perRow.rows[1]?.domainMax).toBe(75);
            // Margin 62/75 (~82.7%) fills most of the 400px track in per-row mode
            expect(perRow.rows[1]?.barWidth).toBe(Math.round((62 / 75) * 400));

            // Shared scale
            const shared = computeBulletRows({
                items,
                width: 400,
                rowHeight: 44,
                rowGap: 12,
                trackHeight: 16,
                sharedScale: true,
            });
            expect(shared.sharedMax).toBe(300);
            expect(shared.totalHeight).toBe(44 * 2 + 12 + 22);
            expect(shared.rows[0]?.domainMax).toBe(300);
            expect(shared.rows[1]?.domainMax).toBe(300);
            // Margin 62/300 (~20.7%) is proportionally shorter under sharedScale
            expect(shared.rows[1]?.barWidth).toBe(Math.round((62 / 300) * 400));
            expect(shared.sharedTicks.length).toBeGreaterThanOrEqual(2);
            for (const tick of shared.sharedTicks) {
                expect(Number.isSafeInteger(tick.x)).toBe(true);
                expect(tick.value).toBeGreaterThanOrEqual(0);
                expect(tick.value).toBeLessThanOrEqual(300);
                expect(tick.x).toBeGreaterThanOrEqual(0);
                expect(tick.x).toBeLessThanOrEqual(400);
            }
        });

        test("auto-sorts unsorted ranges ascending, synthesizes default 3-tier ranges when omitted, and extends track cleanly when actual/target exceeds last range", () => {
            const result = computeBulletRows({
                items: [
                    // Unsorted ranges with invalid entries (0, -20, NaN) and explicit color
                    {
                        index: 0,
                        label: "Unsorted",
                        actual: 180,
                        target: 200,
                        ranges: [
                            { to: 300, color: "#cccccc" },
                            0,
                            -20,
                            NaN,
                            120,
                            { to: 210, color: "#dddddd" },
                        ],
                    },
                    // Omitted ranges -> default 3-tier (60% / 85% / 100%)
                    {
                        index: 1,
                        label: "Default Ranges",
                        actual: 80,
                        target: 100,
                    },
                    // Actual (260) exceeds last range (200) -> extends domainMax to 260 and fills remaining track
                    {
                        index: 2,
                        label: "Overflow Actual",
                        actual: 260,
                        target: 180,
                        ranges: [100, 150, 200],
                    },
                    // Target (250) exceeds last range (200) -> extends domainMax to 250 and fills remaining track
                    {
                        index: 3,
                        label: "Overflow Target",
                        actual: 190,
                        target: 250,
                        ranges: [100, 150, 200],
                    },
                ],
                width: 300,
            });

            // 1. Unsorted ranges normalized & sorted ascending
            const unsortedRow = result.rows[0];
            expect(unsortedRow?.domainMax).toBe(300);
            expect(unsortedRow?.bands).toHaveLength(3);
            expect(unsortedRow?.bands.map((b) => [b.tier, b.from, b.to])).toEqual([
                [1, 0, 120],
                [2, 120, 210],
                [3, 210, 300],
            ]);
            expect(unsortedRow?.bands[1]?.color).toBe("#dddddd");
            expect(unsortedRow?.bands[2]?.color).toBe("#cccccc");
            const lastUnsorted = unsortedRow?.bands.at(-1);
            expect((lastUnsorted?.x ?? 0) + (lastUnsorted?.width ?? 0)).toBe(300);

            // 2. Default 3-tier ranges when omitted
            const defaultRow = result.rows[1];
            expect(defaultRow?.domainMax).toBe(100);
            expect(defaultRow?.bands).toHaveLength(3);
            expect(defaultRow?.bands.map((b) => [b.tier, b.from, b.to])).toEqual([
                [1, 0, 60],
                [2, 60, 85],
                [3, 85, 100],
            ]);

            // 3. Actual exceeding last range extends domainMax and covers full track width
            const overflowActual = result.rows[2];
            expect(overflowActual?.domainMax).toBe(260);
            expect(overflowActual?.barWidth).toBe(300);
            expect(overflowActual?.bands).toHaveLength(4);
            expect(overflowActual?.bands[3]).toMatchObject({
                tier: 3,
                from: 200,
                to: 260,
            });
            const lastOverflowActual = overflowActual?.bands.at(-1);
            expect((lastOverflowActual?.x ?? 0) + (lastOverflowActual?.width ?? 0)).toBe(300);

            // 4. Target exceeding last range extends domainMax and places target at right edge
            const overflowTarget = result.rows[3];
            expect(overflowTarget?.domainMax).toBe(250);
            expect(overflowTarget?.targetX).toBe(snapHalf(300));
            const lastOverflowTarget = overflowTarget?.bands.at(-1);
            expect((lastOverflowTarget?.x ?? 0) + (lastOverflowTarget?.width ?? 0)).toBe(300);
        });

        test("centers barHeight = Math.round(trackHeight * 0.5), enforces minBarLength (2px) vs 0px for 0, snaps targetX & optional comparativeX to half-pixel", () => {
            const result = computeBulletRows({
                items: [
                    // Tiny non-zero actual (0.1 out of 1000) -> clamped to minBarLength=2
                    {
                        index: 0,
                        label: "Tiny",
                        actual: 0.1,
                        target: 500,
                        comparative: 420,
                        ranges: [600, 800, 1000],
                    },
                    // Exact 0 actual -> barWidth=0, barPath="", no comparative
                    {
                        index: 1,
                        label: "Zero",
                        actual: 0,
                        target: 250,
                        ranges: [500],
                    },
                    // Negative / NaN sanitized to 0
                    {
                        index: 2,
                        label: "Sanitized",
                        actual: -15,
                        target: NaN,
                        comparative: null,
                        ranges: [100],
                    },
                ],
                width: 400,
                trackHeight: 16,
                minBarLength: 2,
            });

            const tiny = result.rows[0];
            expect(tiny).toBeDefined();
            if (tiny) {
                expect(tiny.barHeight).toBe(Math.round(16 * 0.5));
                expect(tiny.barY).toBe(snapInt(tiny.trackY + (tiny.trackHeight - tiny.barHeight) / 2));
                expect(tiny.barWidth).toBe(2);
                expect(tiny.barPath.length).toBeGreaterThan(0);
                expect(tiny.barPath).not.toContain("NaN");

                expect(tiny.targetX).toBe(snapHalf(200));
                expect(Number.isSafeInteger(tiny.targetX - 0.5)).toBe(true);
                expect(tiny.targetY).toBe(tiny.barY - 3);
                expect(tiny.targetHeight).toBe(tiny.barHeight + 6);

                expect(tiny.comparativeX).toBe(snapHalf((420 / 1000) * 400));
                expect(Number.isSafeInteger((tiny.comparativeX ?? 0) - 0.5)).toBe(true);
                expect(tiny.comparativeY).toBe(tiny.barY - 1);
                expect(tiny.comparativeHeight).toBe(tiny.barHeight + 2);
            }

            const zero = result.rows[1];
            expect(zero?.barWidth).toBe(0);
            expect(zero?.barRadius).toBe(0);
            expect(zero?.barPath).toBe("");
            expect(zero?.comparativeX).toBeNull();
            expect(zero?.comparativeY).toBeNull();
            expect(zero?.comparativeHeight).toBeNull();

            const sanitized = result.rows[2];
            expect(sanitized?.actual).toBe(0);
            expect(sanitized?.target).toBe(0);
            expect(sanitized?.barWidth).toBe(0);
            expect(sanitized?.barPath).toBe("");
            expect(sanitized?.comparativeX).toBeNull();
        });

        test("handles empty items and 0px-width / over-padded tracks safely without NaN", () => {
            expect(computeBulletRows({ items: [], width: 400 })).toEqual({
                rows: [],
                sharedMax: 1,
                totalHeight: 0,
                sharedTicks: [],
            });

            const zeroWidth = computeBulletRows({
                items: [
                    {
                        index: 0,
                        label: "Revenue",
                        actual: 120,
                        target: 100,
                        comparative: 90,
                        ranges: [80, 120, 150],
                    },
                ],
                width: 0,
                sharedScale: true,
            });
            expect(zeroWidth.rows).toHaveLength(1);
            expect(zeroWidth.rows[0]?.trackWidth).toBe(0);
            expect(zeroWidth.rows[0]?.barWidth).toBe(0);
            expect(zeroWidth.rows[0]?.barPath).toBe("");
            expect(zeroWidth.rows[0]?.bands).toEqual([]);
            expect(zeroWidth.sharedTicks).toEqual([]);

            const overPadded = computeBulletRows({
                items: [{ index: 0, label: "A", actual: 50, target: 40 }],
                width: 4,
                paddingLeft: 3,
                paddingRight: 3,
            });
            expect(overPadded.rows[0]?.trackWidth).toBe(0);
            expect(overPadded.rows[0]?.barWidth).toBe(0);
            expect(overPadded.rows[0]?.barPath).toBe("");
        });
    });
});

describe("Charts M12 — Heatmap Geometry & Public Exports", () => {
    test("public barrel exports ChartHeatmap, HeatmapChart, CHART_HEATMAP_MODES, and CHART_HEATMAP_RAMPS without leaking internal helpers", () => {
        expect(CHART_HEATMAP_MODES).toEqual(["sequential", "diverging"]);
        expect(CHART_HEATMAP_RAMPS).toEqual([
            "accent",
            "teal",
            "emerald",
            "slate",
            "amber",
            "rose",
            "diverging",
        ]);

        const exportedKeys = Object.keys(chartsExports);
        expect(exportedKeys).toContain("ChartHeatmap");
        expect(exportedKeys).toContain("HeatmapChart");
        expect(exportedKeys).toContain("CHART_HEATMAP_MODES");
        expect(exportedKeys).toContain("CHART_HEATMAP_RAMPS");
        expect(exportedKeys).not.toContain("getHeatmapSizeMetrics");
        expect(exportedKeys).not.toContain("computeHeatmapGrid");
        expect(exportedKeys).not.toContain("resolveHeatmapCellColor");
        expect(exportedKeys).not.toContain("deduplicateHeatmapCategories");
    });

    test("getHeatmapSizeMetrics returns monotonic size metrics for sm, md, and lg", () => {
        const sm = getHeatmapSizeMetrics("sm");
        const md = getHeatmapSizeMetrics("md");
        const lg = getHeatmapSizeMetrics("lg");

        expect(sm).toEqual({ gap: 2, radius: 4, fontSize: 10, defaultCellHeight: 28 });
        expect(md).toEqual({ gap: 2.5, radius: 5, fontSize: 11, defaultCellHeight: 34 });
        expect(lg).toEqual({ gap: 3, radius: 6, fontSize: 11, defaultCellHeight: 40 });
        expect(sm.gap).toBeLessThan(md.gap);
        expect(md.gap).toBeLessThan(lg.gap);
        expect(sm.radius).toBeLessThan(md.radius);
        expect(md.radius).toBeLessThan(lg.radius);
        expect(sm.defaultCellHeight).toBeLessThan(md.defaultCellHeight);
        expect(md.defaultCellHeight).toBeLessThan(lg.defaultCellHeight);
    });

    test("resolveHeatmapCellColor maps sequential ramps to 7 stepped tokens, diverging mode to 7 diverging tokens, and null/NaN to empty token", () => {
        expect(resolveHeatmapCellColor(null, "accent", "sequential")).toBe(
            "var(--cs-chart-heatmap-empty)",
        );
        expect(resolveHeatmapCellColor(NaN, "teal", "sequential")).toBe(
            "var(--cs-chart-heatmap-empty)",
        );

        for (const ramp of ["accent", "teal", "emerald", "slate", "amber", "rose"] as const) {
            expect(resolveHeatmapCellColor(0, ramp, "sequential")).toBe(
                `var(--cs-chart-heatmap-${ramp}-1)`,
            );
            expect(resolveHeatmapCellColor(0.5, ramp, "sequential")).toBe(
                `var(--cs-chart-heatmap-${ramp}-4)`,
            );
            expect(resolveHeatmapCellColor(1, ramp, "sequential")).toBe(
                `var(--cs-chart-heatmap-${ramp}-7)`,
            );
            // Clamps out-of-range values
            expect(resolveHeatmapCellColor(-0.5, ramp, "sequential")).toBe(
                `var(--cs-chart-heatmap-${ramp}-1)`,
            );
            expect(resolveHeatmapCellColor(1.5, ramp, "sequential")).toBe(
                `var(--cs-chart-heatmap-${ramp}-7)`,
            );
        }

        // Diverging mode (or ramp="diverging")
        expect(resolveHeatmapCellColor(0, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-div-neg-3)",
        );
        expect(resolveHeatmapCellColor(0.2, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-div-neg-2)",
        );
        expect(resolveHeatmapCellColor(0.35, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-div-neg-1)",
        );
        expect(resolveHeatmapCellColor(0.5, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-mid)",
        );
        expect(resolveHeatmapCellColor(0.65, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-div-pos-1)",
        );
        expect(resolveHeatmapCellColor(0.8, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-div-pos-2)",
        );
        expect(resolveHeatmapCellColor(1, "diverging", "diverging")).toBe(
            "var(--cs-chart-heatmap-div-pos-3)",
        );
        // ramp="diverging" activates diverging tokens even if mode defaults to "sequential"
        expect(resolveHeatmapCellColor(0.5, "diverging", "sequential")).toBe(
            "var(--cs-chart-heatmap-mid)",
        );
    });

    describe("computeHeatmapGrid", () => {
        test("computes integer-snapped 2D cell bounds, centers, clamped corner radius (rx), sequential normalization t ∈ [0, 1], and contrast-safe invertFg", () => {
            const cells: readonly HeatmapCellInput<{ id: string }>[] = [
                { x: "Mon", y: "Morning", value: 0, datum: { id: "0,0" } },
                { x: "Tue", y: "Morning", value: 54, datum: { id: "0,1" } },
                { x: "Wed", y: "Morning", value: 55, datum: { id: "0,2" } },
                { x: "Mon", y: "Evening", value: 100, datum: { id: "1,0" } },
                // (Evening, Tue) intentionally omitted -> missing cell
                { x: "Wed", y: "Evening", value: null, datum: { id: "1,2" } },
            ];

            const grid = computeHeatmapGrid({
                cells,
                width: 300,
                height: 120,
                size: "md",
                gap: 4,
                radius: 5,
                mode: "sequential",
            });

            expect(grid.xCategories).toEqual(["Mon", "Tue", "Wed"]);
            expect(grid.yCategories).toEqual(["Morning", "Evening"]);
            expect(grid.domain).toEqual([0, 100]);
            expect(grid.mode).toBe("sequential");
            expect(grid.colPositions).toHaveLength(3);
            expect(grid.rowPositions).toHaveLength(2);
            expect(grid.cells).toHaveLength(6);

            for (const cell of grid.cells) {
                expect(Number.isSafeInteger(cell.x)).toBe(true);
                expect(Number.isSafeInteger(cell.y)).toBe(true);
                expect(Number.isSafeInteger(cell.width)).toBe(true);
                expect(Number.isSafeInteger(cell.height)).toBe(true);
                expect(cell.width).toBeGreaterThanOrEqual(1);
                expect(cell.height).toBeGreaterThanOrEqual(1);
                expect(cell.centerX).toBe(cell.x + cell.width / 2);
                expect(cell.centerY).toBe(cell.y + cell.height / 2);
                expect(cell.rx).toBe(5);
            }

            // (0,0) value=0 -> t=0, invertFg=false
            expect(grid.cells[0]).toMatchObject({
                index: 0,
                row: 0,
                col: 0,
                xCategory: "Mon",
                yCategory: "Morning",
                value: 0,
                isEmpty: false,
                t: 0,
                invertFg: false,
                datum: { id: "0,0" },
            });

            // (0,1) value=54 -> t=0.54 (< 0.55 threshold) -> invertFg=false
            expect(grid.cells[1]?.t).toBeCloseTo(0.54, 6);
            expect(grid.cells[1]?.invertFg).toBe(false);

            // (0,2) value=55 -> t=0.55 (>= 0.55 threshold) -> invertFg=true
            expect(grid.cells[2]?.t).toBeCloseTo(0.55, 6);
            expect(grid.cells[2]?.invertFg).toBe(true);

            // (1,0) value=100 -> t=1.0 -> invertFg=true
            expect(grid.cells[3]?.t).toBe(1);
            expect(grid.cells[3]?.invertFg).toBe(true);

            // (1,1) omitted cell -> value=null, isEmpty=true, t=null, invertFg=false, datum=null
            expect(grid.cells[4]).toMatchObject({
                index: 4,
                row: 1,
                col: 1,
                xCategory: "Tue",
                yCategory: "Evening",
                value: null,
                isEmpty: true,
                t: null,
                invertFg: false,
                datum: null,
            });

            // (1,2) explicit value=null -> isEmpty=true, t=null, invertFg=false, preserves datum
            expect(grid.cells[5]).toMatchObject({
                index: 5,
                row: 1,
                col: 2,
                xCategory: "Wed",
                yCategory: "Evening",
                value: null,
                isEmpty: true,
                t: null,
                invertFg: false,
                datum: { id: "1,2" },
            });
        });

        test("guards single-value and all-equal sequential datasets with t = 0.5 and clamps excessive corner radius (rx) & gap", () => {
            const single = computeHeatmapGrid({
                cells: [
                    { x: "A", y: "R1", value: 42 },
                    { x: "B", y: "R1", value: 42 },
                ],
                width: 20,
                height: 8,
                gap: 50, // gap larger than width is safely clamped so bands stay >= 1px
                radius: 20, // radius larger than cell height (8px) clamps to min(width/2, height/2)
                mode: "sequential",
            });

            expect(single.domain).toEqual([42, 42]);
            expect(single.cells).toHaveLength(2);
            for (const cell of single.cells) {
                expect(cell.t).toBe(0.5);
                expect(cell.invertFg).toBe(false);
                expect(cell.width).toBeGreaterThanOrEqual(1);
                expect(cell.height).toBe(8);
                expect(cell.rx).toBeLessThanOrEqual(cell.width / 2);
                expect(cell.rx).toBeLessThanOrEqual(cell.height / 2);
            }
        });

        test("normalizes diverging mode around pivot = 0 (negative → [0, 0.5], 0 → 0.5, positive → [0.5, 1]) and applies diverging invertFg threshold (|t - 0.5| >= 0.28)", () => {
            const diverging = computeHeatmapGrid({
                cells: [
                    { x: "C1", y: "R1", value: -100 }, // t = 0.0 -> |t - 0.5| = 0.5 >= 0.28 -> invertFg = true
                    { x: "C2", y: "R1", value: -56 }, // t = 0.22 -> |0.22 - 0.5| = 0.28 >= 0.28 -> invertFg = true
                    { x: "C3", y: "R1", value: -50 }, // t = 0.25 -> |0.25 - 0.5| = 0.25 < 0.28 -> invertFg = false
                    { x: "C4", y: "R1", value: 0 }, // t = 0.5 -> invertFg = false
                    { x: "C5", y: "R1", value: 25 }, // t = 0.75 (since max=50) -> |0.75 - 0.5| = 0.25 < 0.28 -> invertFg = false
                    { x: "C6", y: "R1", value: 30 }, // t = 0.80 -> |0.80 - 0.5| = 0.30 >= 0.28 -> invertFg = true
                    { x: "C7", y: "R1", value: 50 }, // t = 1.0 -> invertFg = true
                ],
                width: 350,
                height: 40,
                mode: "diverging",
                pivot: 0,
            });

            expect(diverging.domain).toEqual([-100, 50]);
            expect(diverging.pivot).toBe(0);
            expect(diverging.mode).toBe("diverging");

            expect(diverging.cells[0]?.t).toBeCloseTo(0, 6);
            expect(diverging.cells[0]?.invertFg).toBe(true);

            expect(diverging.cells[1]?.t).toBeCloseTo(0.22, 6);
            expect(diverging.cells[1]?.invertFg).toBe(true);

            expect(diverging.cells[2]?.t).toBeCloseTo(0.25, 6);
            expect(diverging.cells[2]?.invertFg).toBe(false);

            expect(diverging.cells[3]?.t).toBeCloseTo(0.5, 6);
            expect(diverging.cells[3]?.invertFg).toBe(false);

            expect(diverging.cells[4]?.t).toBeCloseTo(0.75, 6);
            expect(diverging.cells[4]?.invertFg).toBe(false);

            expect(diverging.cells[5]?.t).toBeCloseTo(0.8, 6);
            expect(diverging.cells[5]?.invertFg).toBe(true);

            expect(diverging.cells[6]?.t).toBeCloseTo(1, 6);
            expect(diverging.cells[6]?.invertFg).toBe(true);

            // All-equal at pivot in diverging mode returns t = 0.5 safely
            const allZeroDiv = computeHeatmapGrid({
                cells: [{ x: "C1", y: "R1", value: 0 }],
                width: 80,
                height: 40,
                mode: "diverging",
                pivot: 0,
            });
            expect(allZeroDiv.cells[0]?.t).toBe(0.5);
            expect(allZeroDiv.cells[0]?.invertFg).toBe(false);
        });

        test("respects explicit xCategories, yCategories, custom domain, deduplicateHeatmapCategories, and empty inputs", () => {
            expect(deduplicateHeatmapCategories(["Q1", "Q2", "Q1", "Q3", "Q2"])).toEqual([
                "Q1",
                "Q2",
                "Q3",
            ]);

            const emptySeq = computeHeatmapGrid({
                cells: [],
                width: 300,
                height: 150,
                mode: "sequential",
            });
            expect(emptySeq.cells).toEqual([]);
            expect(emptySeq.domain).toEqual([0, 1]);

            const emptyDiv = computeHeatmapGrid({
                cells: [],
                width: 300,
                height: 150,
                mode: "diverging",
                pivot: 10,
            });
            expect(emptyDiv.cells).toEqual([]);
            expect(emptyDiv.domain).toEqual([9, 11]);
            expect(emptyDiv.pivot).toBe(10);

            // Explicit categories & reversed domain [100, 0] normalize cleanly
            const custom = computeHeatmapGrid({
                cells: [{ x: "B", y: "Y2", value: 75 }],
                xCategories: ["A", "B"],
                yCategories: ["Y1", "Y2"],
                domain: [100, 0],
                width: 200,
                height: 100,
            });
            expect(custom.domain).toEqual([0, 100]);
            expect(custom.cells).toHaveLength(4);
            expect(custom.cells[0]?.isEmpty).toBe(true); // (Y1, A)
            expect(custom.cells[3]?.xCategory).toBe("B");
            expect(custom.cells[3]?.yCategory).toBe("Y2");
            expect(custom.cells[3]?.t).toBeCloseTo(0.75, 6);
        });
    });
});
