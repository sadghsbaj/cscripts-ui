import { beforeEach, describe, expect, test } from "vitest";

import {
    bisectSortedValues,
    buildAreaPath,
    buildLinePath,
    buildRoundedBarPath,
    clampBarRadius,
    computeGroupedBarRects,
    computeGroupedStackedBarRects,
    computePieArcs,
    computeStackedBarRects,
    computeStackedSeries,
    findNearestCoordinateIndex,
    partitionSeriesIntoStackSlots,
    snapHalf,
    snapInt,
} from "./chart-geometry.internal.ts";
import {
    clearMeasureCache,
    computeChartMargins,
    computeRotatedTickHeight,
    measureTextWidth,
    thinAxisTicks,
    truncateTextToWidth,
    wrapTickLabel,
} from "./chart-measure.internal.ts";
import {
    createNumericScale,
    createXScale,
    formatDefaultTick,
    inferXScaleType,
} from "./chart-scales.internal.ts";
import * as chartsExports from "./index.ts";
import {
    CHART_MONOTONE_HUES,
    CHART_PALETTES,
    CHART_SIZES,
    CHART_TONES,
    CHART_VARIANTS,
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
