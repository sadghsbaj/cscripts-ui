import { describe, expect, test } from "vitest";

import {
    computeActiveSegmentCount,
    computeSegmentStagger,
    computeStaggerStepMs,
    normalizeProgress,
    resolveSegmentCount,
} from "./progress.internal.ts";

describe("progress.internal", () => {
    describe("normalizeProgress", () => {
        test("normalizes determinate values within default 0..100 range", () => {
            expect(normalizeProgress(0, 0, 100)).toEqual({
                isIndeterminate: false,
                safeMin: 0,
                safeMax: 100,
                clampedValue: 0,
                ratio: 0,
            });
            expect(normalizeProgress(50, 0, 100)).toEqual({
                isIndeterminate: false,
                safeMin: 0,
                safeMax: 100,
                clampedValue: 50,
                ratio: 0.5,
            });
            expect(normalizeProgress(100, 0, 100)).toEqual({
                isIndeterminate: false,
                safeMin: 0,
                safeMax: 100,
                clampedValue: 100,
                ratio: 1,
            });
        });

        test("clamps values below min and above max", () => {
            expect(normalizeProgress(-25, 0, 100)).toEqual({
                isIndeterminate: false,
                safeMin: 0,
                safeMax: 100,
                clampedValue: 0,
                ratio: 0,
            });
            expect(normalizeProgress(150, 0, 100)).toEqual({
                isIndeterminate: false,
                safeMin: 0,
                safeMax: 100,
                clampedValue: 100,
                ratio: 1,
            });
        });

        test("supports negative and custom min..max ranges", () => {
            expect(normalizeProgress(0, -50, 50)).toEqual({
                isIndeterminate: false,
                safeMin: -50,
                safeMax: 50,
                clampedValue: 0,
                ratio: 0.5,
            });
            expect(normalizeProgress(-60, -100, -20)).toEqual({
                isIndeterminate: false,
                safeMin: -100,
                safeMax: -20,
                clampedValue: -60,
                ratio: 0.5,
            });
            expect(normalizeProgress(5, 10, 30)).toEqual({
                isIndeterminate: false,
                safeMin: 10,
                safeMax: 30,
                clampedValue: 10,
                ratio: 0,
            });
            expect(normalizeProgress(40, 10, 30)).toEqual({
                isIndeterminate: false,
                safeMin: 10,
                safeMax: 30,
                clampedValue: 30,
                ratio: 1,
            });
        });

        test("guards degenerate ranges where min >= max without NaN", () => {
            expect(normalizeProgress(50, 50, 50)).toEqual({
                isIndeterminate: false,
                safeMin: 50,
                safeMax: 50,
                clampedValue: 50,
                ratio: 0,
            });
            expect(normalizeProgress(50, 100, 20)).toEqual({
                isIndeterminate: false,
                safeMin: 100,
                safeMax: 20,
                clampedValue: 100,
                ratio: 0,
            });
        });

        test("falls back non-finite min and max to 0 and 100", () => {
            expect(normalizeProgress(25, NaN, Infinity)).toEqual({
                isIndeterminate: false,
                safeMin: 0,
                safeMax: 100,
                clampedValue: 25,
                ratio: 0.25,
            });
        });

        test.each([undefined, null, NaN, Infinity, -Infinity])(
            "treats %p as indeterminate",
            (value) => {
                expect(normalizeProgress(value, 10, 90)).toEqual({
                    isIndeterminate: true,
                    safeMin: 10,
                    safeMax: 90,
                    clampedValue: undefined,
                    ratio: 0,
                });
            },
        );
    });

    describe("resolveSegmentCount", () => {
        test("returns 0 for bar appearance regardless of segments", () => {
            expect(resolveSegmentCount("bar")).toBe(0);
            expect(resolveSegmentCount("bar", 8)).toBe(0);
        });

        test("returns default segment counts for dashed (5) and dotted (10)", () => {
            expect(resolveSegmentCount("dashed")).toBe(5);
            expect(resolveSegmentCount("dotted")).toBe(10);
        });

        test("uses explicit finite segments and clamps <= 0 or fractional values", () => {
            expect(resolveSegmentCount("dashed", 8)).toBe(8);
            expect(resolveSegmentCount("dotted", 6)).toBe(6);
            expect(resolveSegmentCount("dashed", 0)).toBe(1);
            expect(resolveSegmentCount("dotted", -4)).toBe(1);
            expect(resolveSegmentCount("dashed", 3.9)).toBe(3);
            expect(resolveSegmentCount("dotted", 0.4)).toBe(1);
        });

        test("falls back to defaults when segments is NaN or non-finite", () => {
            expect(resolveSegmentCount("dashed", NaN)).toBe(5);
            expect(resolveSegmentCount("dotted", Infinity)).toBe(10);
        });
    });

    describe("computeActiveSegmentCount", () => {
        test("returns 0 for indeterminate, non-positive ratio, or zero segments", () => {
            expect(computeActiveSegmentCount(0.5, 5, true)).toBe(0);
            expect(computeActiveSegmentCount(0, 5, false)).toBe(0);
            expect(computeActiveSegmentCount(-0.2, 5, false)).toBe(0);
            expect(computeActiveSegmentCount(0.5, 0, false)).toBe(0);
        });

        test("lights at least 1 segment for any positive ratio and clamps to segmentCount", () => {
            expect(computeActiveSegmentCount(0.01, 5, false)).toBe(1);
            expect(computeActiveSegmentCount(0.4, 5, false)).toBe(2);
            expect(computeActiveSegmentCount(0.8, 5, false)).toBe(4);
            expect(computeActiveSegmentCount(1, 5, false)).toBe(5);
            expect(computeActiveSegmentCount(1.5, 5, false)).toBe(5);
            expect(computeActiveSegmentCount(0.5, 10, false)).toBe(5);
        });
    });

    describe("computeStaggerStepMs", () => {
        test("returns 0 when prevCount equals nextCount", () => {
            expect(computeStaggerStepMs(3, 3)).toBe(0);
            expect(computeStaggerStepMs(0, 0)).toBe(0);
        });

        test("clamps step duration between 16ms and 35ms across ~180ms total spread", () => {
            // diff = 2 -> 180/2 = 90 -> clamped to 35
            expect(computeStaggerStepMs(2, 4)).toBe(35);
            expect(computeStaggerStepMs(4, 2)).toBe(35);

            // diff = 7 -> 180/7 = 25.71
            expect(computeStaggerStepMs(0, 7)).toBe(25.71);

            // diff = 10 -> 180/10 = 18
            expect(computeStaggerStepMs(0, 10)).toBe(18);

            // diff = 20 -> 180/20 = 9 -> clamped to 16
            expect(computeStaggerStepMs(0, 20)).toBe(16);
        });
    });

    describe("computeSegmentStagger", () => {
        test("returns 0 when indeterminate or prevCount === nextCount", () => {
            for (let i = 0; i < 5; i++) {
                expect(computeSegmentStagger(i, 0, 4, true)).toBe(0);
                expect(computeSegmentStagger(i, 2, 2, false)).toBe(0);
            }
        });

        test("computes forward stagger (40% -> 80%, P=2 -> C=4)", () => {
            const steps = [0, 1, 2, 3, 4].map((i) => computeSegmentStagger(i, 2, 4, false));
            expect(steps).toEqual([0, 0, 0, 1, 0]);
        });

        test("computes backward stagger (80% -> 40%, P=4 -> C=2)", () => {
            const steps = [0, 1, 2, 3, 4].map((i) => computeSegmentStagger(i, 4, 2, false));
            expect(steps).toEqual([0, 0, 1, 0, 0]);
        });

        test("computes full sweep forward (0% -> 100%) and backward (100% -> 0%)", () => {
            const forward = [0, 1, 2, 3, 4].map((i) => computeSegmentStagger(i, 0, 5, false));
            expect(forward).toEqual([0, 1, 2, 3, 4]);

            const backward = [0, 1, 2, 3, 4].map((i) => computeSegmentStagger(i, 5, 0, false));
            expect(backward).toEqual([4, 3, 2, 1, 0]);
        });
    });
});
