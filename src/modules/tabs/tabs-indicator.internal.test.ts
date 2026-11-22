import { describe, expect, test } from "vitest";

import {
    buildPushPullKeyframes,
    computeClipOffsets,
    formatClipPathInset,
    measureIndicatorMetrics,
    parseComputedClipPath,
    type IndicatorMetrics,
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

    describe("buildPushPullKeyframes", () => {
        test("returns null when position and size are effectively identical (< 1px)", () => {
            const prev: IndicatorMetrics = { start: 40, size: 80, trackSize: 300 };
            expect(buildPushPullKeyframes(prev, { start: 40, size: 80, trackSize: 300 }, "horizontal")).toBeNull();
            expect(buildPushPullKeyframes(prev, { start: 40.4, size: 80.3, trackSize: 300 }, "horizontal")).toBeNull();
        });

        test("generates keyframes for size-only changes when center delta < 1px", () => {
            const prev: IndicatorMetrics = { start: 40, size: 80, trackSize: 300 };
            const next: IndicatorMetrics = { start: 30, size: 100, trackSize: 300 }; // center is 80 for both
            const result = buildPushPullKeyframes(prev, next, "horizontal");
            expect(result).not.toBeNull();
            expect(result?.keyframes[0]?.clipPath).toBe("inset(0px 180px 0px 40px round 9999px)");
            expect(result?.keyframes.at(-1)?.clipPath).toBe("inset(0px 170px 0px 30px round 9999px)");
        });

        test("clamps durationMs between 280ms and 400ms based on jump distance", () => {
            const short = buildPushPullKeyframes(
                { start: 0, size: 60, trackSize: 500 },
                { start: 20, size: 60, trackSize: 500 },
                "horizontal"
            );
            expect(short?.durationMs).toBe(280);

            const medium = buildPushPullKeyframes(
                { start: 0, size: 60, trackSize: 500 },
                { start: 200, size: 60, trackSize: 500 },
                "horizontal"
            );
            expect(medium?.durationMs).toBe(Math.round(260 + 0.17 * 200));

            const long = buildPushPullKeyframes(
                { start: 0, size: 60, trackSize: 1500 },
                { start: 1000, size: 60, trackSize: 1500 },
                "horizontal"
            );
            expect(long?.durationMs).toBe(400);
        });

        test("forward and backward keyframes start and end at exact offsets with start-inertia", () => {
            const prev: IndicatorMetrics = { start: 20, size: 80, trackSize: 400 };
            const next: IndicatorMetrics = { start: 180, size: 100, trackSize: 400 };

            // Forward
            const forward = buildPushPullKeyframes(prev, next, "horizontal");
            expect(forward).not.toBeNull();
            if (!forward) return;
            expect(forward.keyframes).toHaveLength(17);
            expect(forward.keyframes[0]).toEqual({
                clipPath: formatClipPathInset(computeClipOffsets(prev), "horizontal"),
                offset: 0,
            });
            expect(forward.keyframes.at(-1)).toEqual({
                clipPath: formatClipPathInset(computeClipOffsets(next), "horizontal"),
                offset: 1,
            });

            // At t = 1/16 (0.0625 <= 0.12), trailing edge stays anchored at prev.start while lead edge moves forward
            const earlyForwardFrame = forward.keyframes[1];
            expect(earlyForwardFrame).toBeDefined();
            const earlyForward = parseComputedClipPath(String(earlyForwardFrame?.clipPath), "horizontal");
            expect(earlyForward).not.toBeNull();
            if (!earlyForward) return;
            expect(earlyForward.start).toBe(20);
            expect(earlyForward.end).toBeLessThan(computeClipOffsets(prev).end);

            // Backward (vertical)
            const backward = buildPushPullKeyframes(next, prev, "vertical");
            expect(backward).not.toBeNull();
            if (!backward) return;
            expect(backward.keyframes).toHaveLength(17);
            expect(backward.keyframes[0]).toEqual({
                clipPath: formatClipPathInset(computeClipOffsets(next), "vertical"),
                offset: 0,
            });
            expect(backward.keyframes.at(-1)).toEqual({
                clipPath: formatClipPathInset(computeClipOffsets(prev), "vertical"),
                offset: 1,
            });

            // At t = 1/16, trailing edge (end) stays anchored at next's end offset while start moves backward
            const earlyBackwardFrame = backward.keyframes[1];
            expect(earlyBackwardFrame).toBeDefined();
            const earlyBackward = parseComputedClipPath(String(earlyBackwardFrame?.clipPath), "vertical");
            expect(earlyBackward).not.toBeNull();
            if (!earlyBackward) return;
            expect(earlyBackward.end).toBe(computeClipOffsets(next).end);
            expect(earlyBackward.start).toBeLessThan(next.start);
        });

        test("caps stretch to maxExtra <= 115px on an 800px jump (no full-width overshoot)", () => {
            const trackSize = 1000;
            const prev: IndicatorMetrics = { start: 0, size: 80, trackSize };
            const next: IndicatorMetrics = { start: 800, size: 80, trackSize };

            for (const [from, to] of [
                [prev, next],
                [next, prev],
            ] as const) {
                const result = buildPushPullKeyframes(from, to, "horizontal");
                expect(result).not.toBeNull();
                if (!result) continue;

                for (const frame of result.keyframes) {
                    const parsed = parseComputedClipPath(String(frame.clipPath), "horizontal");
                    expect(parsed).not.toBeNull();
                    if (parsed) {
                        const visibleWidth = trackSize - parsed.start - parsed.end;
                        expect(visibleWidth).toBeLessThanOrEqual(80 + 115 + 0.001);
                        expect(visibleWidth).toBeGreaterThanOrEqual(80 - 0.001);
                    }
                }
            }
        });
    });
});
