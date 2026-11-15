import { afterEach, describe, expect, test, vi } from "vitest";

import {
    getOverflowState,
    getScrollIntoViewDelta,
    getStepScrollDelta,
    isRtlViewport,
    resolveFadeReserve,
} from "./segmented-control-scroll.internal.ts";

function mockRect(left: number, width: number): DOMRect {
    return {
        left,
        right: left + width,
        top: 0,
        bottom: 32,
        width,
        height: 32,
        x: left,
        y: 0,
        toJSON: () => ({}),
    } as DOMRect;
}

function createMockViewport(opts: {
    left?: number;
    width: number;
    scrollWidth?: number;
    clientWidth?: number;
    scrollLeft?: number;
}): HTMLElement {
    const el = document.createElement("div");
    const left = opts.left ?? 0;
    const width = opts.width;
    el.getBoundingClientRect = () => mockRect(left, width);
    Object.defineProperties(el, {
        scrollWidth: { configurable: true, get: () => opts.scrollWidth ?? width },
        clientWidth: { configurable: true, get: () => opts.clientWidth ?? width },
        scrollLeft: { configurable: true, get: () => opts.scrollLeft ?? 0 },
    });
    return el;
}

function createMockItem(left: number, width: number): HTMLElement {
    const el = document.createElement("button");
    el.getBoundingClientRect = () => mockRect(left, width);
    return el;
}

describe("segmented-control-scroll.internal", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("resolveFadeReserve", () => {
        test("parses px and unitless --cs-scroll-fade-size custom property", () => {
            const viewport = document.createElement("div");
            vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
                getPropertyValue: (prop: string) => (prop === "--cs-scroll-fade-size" ? " 28px " : ""),
            } as CSSStyleDeclaration);

            expect(resolveFadeReserve(viewport)).toBe(28);

            vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
                getPropertyValue: (prop: string) => (prop === "--cs-scroll-fade-size" ? "36" : ""),
            } as CSSStyleDeclaration);

            expect(resolveFadeReserve(viewport)).toBe(36);
        });

        test("falls back to 40 when --cs-scroll-fade-size is missing, zero, negative, or non-numeric", () => {
            const viewport = document.createElement("div");

            for (const raw of ["", "0px", "-12px", "auto", "NaN"]) {
                vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
                    getPropertyValue: () => raw,
                } as unknown as CSSStyleDeclaration);
                expect(resolveFadeReserve(viewport)).toBe(40);
            }
        });
    });

    describe("isRtlViewport", () => {
        test("returns true when computed direction is rtl and false otherwise", () => {
            const viewport = document.createElement("div");
            vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
                direction: "rtl",
            } as CSSStyleDeclaration);
            expect(isRtlViewport(viewport)).toBe(true);

            vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
                direction: "ltr",
            } as CSSStyleDeclaration);
            expect(isRtlViewport(viewport)).toBe(false);
        });
    });

    describe("getOverflowState", () => {
        test("returns both false when there is no overflow or within 1px subpixel tolerance", () => {
            expect(getOverflowState(createMockViewport({ width: 200, scrollWidth: 200, clientWidth: 200 }))).toEqual({
                canScrollPrev: false,
                canScrollNext: false,
            });

            // 1px subpixel overflow is ignored by default tolerance
            expect(getOverflowState(createMockViewport({ width: 200, scrollWidth: 201, clientWidth: 200 }))).toEqual({
                canScrollPrev: false,
                canScrollNext: false,
            });

            // With tolerance = 0, 1px overflow is detected
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 201, clientWidth: 200 }), 0)
            ).toEqual({
                canScrollPrev: false,
                canScrollNext: true,
            });
        });

        test("respects 1px subpixel tolerance at start, middle, and end in LTR", () => {
            // Start: scrollLeft = 0 and scrollLeft = 1 both report canScrollPrev: false
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 0 }))
            ).toEqual({ canScrollPrev: false, canScrollNext: true });
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 1 }))
            ).toEqual({ canScrollPrev: false, canScrollNext: true });

            // Middle: scrollLeft = 2..98
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 2 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: true });
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 98 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: true });

            // End: scrollLeft = 99 (maxScroll - 1) and 100 both report canScrollNext: false
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 99 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: false });
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 100 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: false });
        });

        test("handles negative scrollLeft values in RTL viewports", () => {
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -1 }))
            ).toEqual({ canScrollPrev: false, canScrollNext: true });

            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -50 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: true });

            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -100 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: false });
        });
    });

    describe("getStepScrollDelta", () => {
        test("returns 0 when items array is empty", () => {
            const viewport = createMockViewport({ width: 200 });
            expect(getStepScrollDelta(viewport, [], "next", 40, false)).toBe(0);
            expect(getStepScrollDelta(viewport, [], "prev", 40, true)).toBe(0);
        });

        test("LTR next aligns clipped rightmost visible item past left fadeReserve without skipping", () => {
            // Viewport [0..200], fadeReserve = 40 -> right fade starts at 160, left safe edge is 40
            const viewport = createMockViewport({ width: 200 });
            const items = [
                createMockItem(0, 80), // [0..80]
                createMockItem(80, 80), // [80..160]
                createMockItem(160, 80), // [160..240] -> clipped in right fade zone
                createMockItem(240, 80), // [240..320] -> offscreen right
            ];

            // Candidate is item[2] (left: 160). Aligning its left to 40 gives delta = 120.
            // Item[2] lands at [40..120], and item[3] is now at [120..200] — nothing skipped.
            expect(getStepScrollDelta(viewport, items, "next", 40, false)).toBe(120);
        });

        test("LTR prev aligns clipped leftmost visible item past right fadeReserve without skipping", () => {
            // Viewport [0..200], fadeReserve = 40 -> left fade ends at 40, right safe edge is 160
            const viewport = createMockViewport({ width: 200 });
            const items = [
                createMockItem(-120, 80), // [-120..-40] -> offscreen left
                createMockItem(-40, 80), // [-40..40] -> clipped in left fade zone
                createMockItem(40, 80), // [40..120]
                createMockItem(120, 80), // [120..200]
            ];

            // Candidate is item[1] (right: 40). Aligning its right to 160 gives delta = -120.
            expect(getStepScrollDelta(viewport, items, "prev", 40, false)).toBe(-120);
        });

        test("RTL next moves visually left (negative delta) and RTL prev moves visually right (positive delta)", () => {
            const viewport = createMockViewport({ width: 200 });
            const items = [
                createMockItem(-40, 80), // [-40..40] -> clipped on visual left
                createMockItem(40, 80), // [40..120]
                createMockItem(120, 80), // [120..200]
            ];

            // In RTL, "next" advances visually left -> aligns item[0] right (40) to 160 -> -120
            expect(getStepScrollDelta(viewport, items, "next", 40, true)).toBe(-120);

            const itemsRightClipped = [
                createMockItem(0, 80),
                createMockItem(80, 80),
                createMockItem(160, 80), // clipped on visual right
            ];

            // In RTL, "prev" advances visually right -> aligns item[2] left (160) to 40 -> +120
            expect(getStepScrollDelta(viewport, itemsRightClipped, "prev", 40, true)).toBe(120);
        });

        test("wide-item fallback prevents scroll stalling when candidate already spans past target edge", () => {
            // Viewport [0..200], fadeReserve = 40 -> fallbackStep = max(200 - 80, 40) = 120
            const viewport = createMockViewport({ width: 200 });

            // Single wide item spanning [10..350]
            const wideRight = [createMockItem(10, 340)];
            // delta would be 10 - 40 = -30 (<= 1), so fallbackStep (+120) is used
            expect(getStepScrollDelta(viewport, wideRight, "next", 40, false)).toBe(120);

            // Single wide item spanning [-150..190]
            const wideLeft = [createMockItem(-150, 340)];
            // delta would be 190 - 160 = +30 (>= -1), so -fallbackStep (-120) is used
            expect(getStepScrollDelta(viewport, wideLeft, "prev", 40, false)).toBe(-120);

            // Narrow viewport where width - 2 * fadeReserve < DEFAULT_FADE_RESERVE (40)
            const narrowViewport = createMockViewport({ width: 100 });
            expect(getStepScrollDelta(narrowViewport, wideRight, "next", 40, false)).toBe(40);
            expect(getStepScrollDelta(narrowViewport, wideLeft, "prev", 40, false)).toBe(-40);
        });

        test("12px edge snapping snaps next near maxScroll and prev near 0 in LTR", () => {
            const rightItems = [
                createMockItem(0, 80),
                createMockItem(80, 80),
                createMockItem(160, 80), // rawDelta = 120
            ];

            // LTR next: scrollLeft = 20, step = 120, maxScroll = 142 -> remaining = 2px (<= 12) -> snaps to 122
            const nearEnd = createMockViewport({ width: 200, scrollWidth: 342, clientWidth: 200, scrollLeft: 20 });
            expect(getStepScrollDelta(nearEnd, rightItems, "next", 40, false)).toBe(122);

            // Exact 12px boundary still snaps (remaining = 152 - (20 + 120) = 12)
            const atSnapBoundary = createMockViewport({
                width: 200,
                scrollWidth: 352,
                clientWidth: 200,
                scrollLeft: 20,
            });
            expect(getStepScrollDelta(atSnapBoundary, rightItems, "next", 40, false)).toBe(132);

            // 13px remaining does not snap -> returns raw step 120
            const beyondSnap = createMockViewport({ width: 200, scrollWidth: 353, clientWidth: 200, scrollLeft: 20 });
            expect(getStepScrollDelta(beyondSnap, rightItems, "next", 40, false)).toBe(120);

            const leftItems = [
                createMockItem(-40, 80), // rawDelta = -120
                createMockItem(40, 80),
                createMockItem(120, 80),
            ];

            // LTR prev: scrollLeft = 122, step = 120 -> nextOffset = 2px (<= 12) -> snaps to -122
            const nearStart = createMockViewport({ width: 200, scrollWidth: 400, clientWidth: 200, scrollLeft: 122 });
            expect(getStepScrollDelta(nearStart, leftItems, "prev", 40, false)).toBe(-122);

            // Exact 12px boundary: scrollLeft = 132 -> nextOffset = 12 -> snaps to -132
            const atStartBoundary = createMockViewport({
                width: 200,
                scrollWidth: 400,
                clientWidth: 200,
                scrollLeft: 132,
            });
            expect(getStepScrollDelta(atStartBoundary, leftItems, "prev", 40, false)).toBe(-132);

            // 13px remaining does not snap -> returns raw step -120
            const beyondStartSnap = createMockViewport({
                width: 200,
                scrollWidth: 400,
                clientWidth: 200,
                scrollLeft: 133,
            });
            expect(getStepScrollDelta(beyondStartSnap, leftItems, "prev", 40, false)).toBe(-120);
        });

        test("12px edge snapping snaps next near maxScroll and prev near 0 in RTL", () => {
            const rtlNextItems = [
                createMockItem(-40, 80), // rawDelta = -120
                createMockItem(40, 80),
                createMockItem(120, 80),
            ];

            // RTL next: scrollLeft = -20, step = 120, maxScroll = 142 -> remaining = 2px -> snaps to -122
            const nearEndRtl = createMockViewport({ width: 200, scrollWidth: 342, clientWidth: 200, scrollLeft: -20 });
            expect(getStepScrollDelta(nearEndRtl, rtlNextItems, "next", 40, true)).toBe(-122);

            // RTL next beyond 12px threshold does not snap
            const beyondEndRtl = createMockViewport({
                width: 200,
                scrollWidth: 353,
                clientWidth: 200,
                scrollLeft: -20,
            });
            expect(getStepScrollDelta(beyondEndRtl, rtlNextItems, "next", 40, true)).toBe(-120);

            const rtlPrevItems = [
                createMockItem(0, 80),
                createMockItem(80, 80),
                createMockItem(160, 80), // rawDelta = +120
            ];

            // RTL prev: scrollLeft = -121, step = 120 -> nextOffset = 1px -> snaps to +121
            const nearStartRtl = createMockViewport({
                width: 200,
                scrollWidth: 400,
                clientWidth: 200,
                scrollLeft: -121,
            });
            expect(getStepScrollDelta(nearStartRtl, rtlPrevItems, "prev", 40, true)).toBe(121);

            // RTL prev beyond 12px threshold does not snap
            const beyondStartRtl = createMockViewport({
                width: 200,
                scrollWidth: 400,
                clientWidth: 200,
                scrollLeft: -133,
            });
            expect(getStepScrollDelta(beyondStartRtl, rtlPrevItems, "prev", 40, true)).toBe(120);
        });
    });

    describe("getScrollIntoViewDelta", () => {
        test("returns 0 when item is already within safe zone (including 1px tolerance)", () => {
            // Viewport [0..200], fadeReserve = 40 -> safe zone [40..160]
            const viewport = createMockViewport({ width: 200 });
            expect(getScrollIntoViewDelta(viewport, createMockItem(40, 80), 40, false)).toBe(0);
            expect(getScrollIntoViewDelta(viewport, createMockItem(39, 80), 40, false)).toBe(0);
            expect(getScrollIntoViewDelta(viewport, createMockItem(81, 80), 40, false)).toBe(0);
        });

        test("clears fadeReserve on left and right edges", () => {
            // Viewport [0..200], fadeReserve = 40 -> safe zone [40..160]
            const viewport = createMockViewport({ width: 200 });

            // Clipped on left: item [10..70] -> needs to shift left edge from 10 to 40 -> delta = -30
            expect(getScrollIntoViewDelta(viewport, createMockItem(10, 60), 40, false)).toBe(-30);

            // Clipped on right: item [130..190] -> needs to shift right edge from 190 to 160 -> delta = +30
            expect(getScrollIntoViewDelta(viewport, createMockItem(130, 60), 40, false)).toBe(30);
        });

        test("aligns wide items to safeLeft in LTR and safeRight in RTL", () => {
            // Viewport [0..200], fadeReserve = 40 -> safeLeft = 40, safeRight = 160, availableWidth = 120
            const viewport = createMockViewport({ width: 200 });
            const wideItem = createMockItem(60, 180); // [60..240], width 180 > 120

            // LTR aligns left (60) to safeLeft (40) -> +20
            expect(getScrollIntoViewDelta(viewport, wideItem, 40, false)).toBe(20);
            // RTL aligns right (240) to safeRight (160) -> +80
            expect(getScrollIntoViewDelta(viewport, wideItem, 40, true)).toBe(80);
        });

        test("snaps to maxScroll or 0 when remaining distance after clearing fadeReserve is <= fadeReserve", () => {
            // LTR near end: scrollLeft = 20, maxScroll = 100, item [140..200] -> raw delta = 40
            // nextOffset = 60, remaining = 40 (<= fadeReserve 40) -> snaps to 80
            const ltrNearEnd = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 20 });
            expect(getScrollIntoViewDelta(ltrNearEnd, createMockItem(140, 60), 40, false)).toBe(80);

            // LTR beyond fadeReserve: maxScroll = 101 -> remaining = 41 -> no snap (40)
            const ltrBeyondEnd = createMockViewport({ width: 200, scrollWidth: 301, clientWidth: 200, scrollLeft: 20 });
            expect(getScrollIntoViewDelta(ltrBeyondEnd, createMockItem(140, 60), 40, false)).toBe(40);

            // LTR near start: scrollLeft = 80, item [0..60] -> raw delta = -40
            // nextOffset = 40 (<= fadeReserve 40) -> snaps to -80
            const ltrNearStart = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 80 });
            expect(getScrollIntoViewDelta(ltrNearStart, createMockItem(0, 60), 40, false)).toBe(-80);

            // LTR beyond start: scrollLeft = 81 -> nextOffset = 41 -> no snap (-40)
            const ltrBeyondStart = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 81 });
            expect(getScrollIntoViewDelta(ltrBeyondStart, createMockItem(0, 60), 40, false)).toBe(-40);

            // RTL near end: scrollLeft = -20, maxScroll = 100, item [0..60] -> raw delta = -40
            // nextOffset = 60, remaining = 40 (<= fadeReserve 40) -> snaps to -80
            const rtlNearEnd = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -20 });
            expect(getScrollIntoViewDelta(rtlNearEnd, createMockItem(0, 60), 40, true)).toBe(-80);

            // RTL near start: scrollLeft = -80, item [140..200] -> raw delta = +40
            // nextOffset = 40 (<= fadeReserve 40) -> snaps to +80
            const rtlNearStart = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -80 });
            expect(getScrollIntoViewDelta(rtlNearStart, createMockItem(140, 60), 40, true)).toBe(80);
        });
    });
});
