import { describe, expect, test } from "vitest";

import {
    INDICATOR_SLIDE_DURATION_MS,
    INDICATOR_SLIDE_EASING,
    buildSlideKeyframes,
    computeClipOffsets,
    formatClipPathInset,
    measureIndicatorMetrics,
    parseComputedClipPath,
    type ClipOffsets,
} from "./tabs-indicator.internal.ts";

function createMockMeasureElements(opts: {
    offsetLeft?: number;
    offsetWidth?: number;
    offsetTop?: number;
    offsetHeight?: number;
    scrollWidth?: number;
    scrollHeight?: number;
}): { activeEl: HTMLButtonElement; trackEl: HTMLDivElement } {
    const activeEl = document.createElement("button");
    const trackEl = document.createElement("div");

    Object.defineProperties(activeEl, {
        offsetLeft: { configurable: true, get: () => opts.offsetLeft ?? 0 },
        offsetWidth: { configurable: true, get: () => opts.offsetWidth ?? 0 },
        offsetTop: { configurable: true, get: () => opts.offsetTop ?? 0 },
        offsetHeight: { configurable: true, get: () => opts.offsetHeight ?? 0 },
    });

    Object.defineProperties(trackEl, {
        scrollWidth: { configurable: true, get: () => opts.scrollWidth ?? 0 },
        scrollHeight: { configurable: true, get: () => opts.scrollHeight ?? 0 },
    });

    return { activeEl, trackEl };
}

describe("tabs-indicator.internal", () => {
    describe("measureIndicatorMetrics", () => {
        test("reads horizontal and vertical offset/track dimensions", () => {
            const { activeEl, trackEl } = createMockMeasureElements({
                offsetLeft: 40,
                offsetWidth: 96,
                offsetTop: 32,
                offsetHeight: 36,
                scrollWidth: 400,
                scrollHeight: 200,
            });

            expect(measureIndicatorMetrics(activeEl, trackEl, "horizontal")).toEqual({
                start: 40,
                size: 96,
                trackSize: 400,
            });

            expect(measureIndicatorMetrics(activeEl, trackEl, "vertical")).toEqual({
                start: 32,
                size: 36,
                trackSize: 200,
            });
        });
    });

    describe("computeClipOffsets", () => {
        test("computes start and end clip insets and clamps negative values to 0", () => {
            expect(computeClipOffsets({ start: 50, size: 100, trackSize: 300 })).toEqual({
                start: 50,
                end: 150,
            });

            expect(computeClipOffsets({ start: -10, size: 100, trackSize: 80 })).toEqual({
                start: 0,
                end: 0,
            });
        });
    });

    describe("formatClipPathInset", () => {
        test("formats horizontal and vertical inset strings with pill rounding", () => {
            expect(formatClipPathInset({ start: 24, end: 120 }, "horizontal")).toBe(
                "inset(0px 120px 0px 24px round 9999px)"
            );
            expect(formatClipPathInset({ start: 16, end: 64 }, "vertical")).toBe(
                "inset(16px 0px 64px 0px round 9999px)"
            );
        });
    });

    describe("parseComputedClipPath", () => {
        test("parses 1, 2, 3, and 4 length values with or without round suffix", () => {
            // 1 value
            expect(parseComputedClipPath("inset(10px)", "horizontal")).toEqual({ start: 10, end: 10 });
            expect(parseComputedClipPath("inset(10px round 9999px)", "vertical")).toEqual({ start: 10, end: 10 });

            // 2 values (top/bottom, right/left)
            expect(parseComputedClipPath("inset(12px 30px round 9999px)", "horizontal")).toEqual({
                start: 30,
                end: 30,
            });
            expect(parseComputedClipPath("inset(12px 30px round 9999px)", "vertical")).toEqual({
                start: 12,
                end: 12,
            });

            // 3 values (top, right/left, bottom)
            expect(parseComputedClipPath("inset(8px 24px 40px round 9999px)", "horizontal")).toEqual({
                start: 24,
                end: 24,
            });
            expect(parseComputedClipPath("inset(8px 24px 40px round 9999px)", "vertical")).toEqual({
                start: 8,
                end: 40,
            });

            // 4 values (top, right, bottom, left)
            expect(parseComputedClipPath("inset(0px 120px 0px 45.5px round 9999px)", "horizontal")).toEqual({
                start: 45.5,
                end: 120,
            });
            expect(parseComputedClipPath("inset(14px 0 86px 0 round 9999px)", "vertical")).toEqual({
                start: 14,
                end: 86,
            });
        });

        test("returns null for invalid or non-px clip-path values", () => {
            expect(parseComputedClipPath("", "horizontal")).toBeNull();
            expect(parseComputedClipPath("none", "horizontal")).toBeNull();
            expect(parseComputedClipPath("inset()", "horizontal")).toBeNull();
            expect(parseComputedClipPath("inset(10% 20px)", "horizontal")).toBeNull();
            expect(parseComputedClipPath("inset(1px 2px 3px 4px 5px)", "horizontal")).toBeNull();
            expect(parseComputedClipPath("circle(50%)", "horizontal")).toBeNull();
        });
    });

    describe("slide constants", () => {
        test("exports expected duration and easing tokens", () => {
            expect(INDICATOR_SLIDE_DURATION_MS).toBe(200);
            expect(INDICATOR_SLIDE_EASING).toBe("cubic-bezier(0.25, 1, 0.5, 1)");
        });
    });

    describe("buildSlideKeyframes", () => {
        test("returns null when both start and end deltas are below 0.5px", () => {
            const from: ClipOffsets = { start: 40, end: 180 };
            expect(buildSlideKeyframes(from, { start: 40, end: 180 }, "horizontal")).toBeNull();
            expect(buildSlideKeyframes(from, { start: 40.49, end: 179.51 }, "horizontal")).toBeNull();
            expect(buildSlideKeyframes(from, { start: 39.6, end: 180.4 }, "vertical")).toBeNull();
        });

        test("returns 2 keyframes when either start or end delta is >= 0.5px", () => {
            const from: ClipOffsets = { start: 40, end: 180 };

            const startOnly = buildSlideKeyframes(from, { start: 40.5, end: 180 }, "horizontal");
            expect(startOnly).toHaveLength(2);

            const endOnly = buildSlideKeyframes(from, { start: 40, end: 180.5 }, "vertical");
            expect(endOnly).toHaveLength(2);
        });

        test("generates 2 direct from -> to keyframes for horizontal forward and backward slides without stretch", () => {
            const from: ClipOffsets = { start: 20, end: 300 };
            const to: ClipOffsets = { start: 180, end: 120 };

            const forward = buildSlideKeyframes(from, to, "horizontal");
            expect(forward).toEqual([
                { clipPath: "inset(0px 300px 0px 20px round 9999px)" },
                { clipPath: "inset(0px 120px 0px 180px round 9999px)" },
            ]);

            const backward = buildSlideKeyframes(to, from, "horizontal");
            expect(backward).toEqual([
                { clipPath: "inset(0px 120px 0px 180px round 9999px)" },
                { clipPath: "inset(0px 300px 0px 20px round 9999px)" },
            ]);
        });

        test("generates 2 direct from -> to keyframes for vertical slides with symmetric endpoints", () => {
            const from: ClipOffsets = { start: 16, end: 140 };
            const to: ClipOffsets = { start: 96, end: 48 };

            const forward = buildSlideKeyframes(from, to, "vertical");
            expect(forward).toEqual([
                { clipPath: formatClipPathInset(from, "vertical") },
                { clipPath: formatClipPathInset(to, "vertical") },
            ]);
            expect(forward?.[0]?.clipPath).toBe("inset(16px 0px 140px 0px round 9999px)");
            expect(forward?.[1]?.clipPath).toBe("inset(96px 0px 48px 0px round 9999px)");

            const backward = buildSlideKeyframes(to, from, "vertical");
            expect(backward).toEqual([
                { clipPath: formatClipPathInset(to, "vertical") },
                { clipPath: formatClipPathInset(from, "vertical") },
            ]);
        });
    });
});
