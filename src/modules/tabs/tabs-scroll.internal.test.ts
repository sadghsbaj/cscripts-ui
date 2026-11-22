import { afterEach, describe, expect, test, vi } from "vitest";

import {
    getOverflowState,
    getScrollIntoViewDelta,
    getStepScrollDelta,
    isRtlViewport,
    resolveFadeReserve,
} from "./tabs-scroll.internal.ts";

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

describe("tabs-scroll.internal", () => {
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

            expect(getOverflowState(createMockViewport({ width: 200, scrollWidth: 201, clientWidth: 200 }))).toEqual({
                canScrollPrev: false,
                canScrollNext: false,
            });

            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 201, clientWidth: 200 }), 0)
            ).toEqual({
                canScrollPrev: false,
                canScrollNext: true,
            });
        });

        test("respects 1px subpixel tolerance at start, middle, and end in LTR", () => {
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 0 }))
            ).toEqual({ canScrollPrev: false, canScrollNext: true });
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 1 }))
            ).toEqual({ canScrollPrev: false, canScrollNext: true });

            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 2 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: true });
            expect(
                getOverflowState(createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 98 }))
            ).toEqual({ canScrollPrev: true, canScrollNext: true });

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

        test("LTR next and prev align clipped items past opposite fadeReserve", () => {
            const viewport = createMockViewport({ width: 200 });
            const rightClipped = [
                createMockItem(0, 80),
                createMockItem(80, 80),
                createMockItem(160, 80),
                createMockItem(240, 80),
            ];
            expect(getStepScrollDelta(viewport, rightClipped, "next", 40, false)).toBe(120);

            const leftClipped = [
                createMockItem(-120, 80),
                createMockItem(-40, 80),
                createMockItem(40, 80),
                createMockItem(120, 80),
            ];
            expect(getStepScrollDelta(viewport, leftClipped, "prev", 40, false)).toBe(-120);
        });

        test("RTL next moves visually left (negative) and RTL prev moves visually right (positive)", () => {
            const viewport = createMockViewport({ width: 200 });
            const itemsLeftClipped = [
                createMockItem(-40, 80),
                createMockItem(40, 80),
                createMockItem(120, 80),
            ];
            expect(getStepScrollDelta(viewport, itemsLeftClipped, "next", 40, true)).toBe(-120);

            const itemsRightClipped = [
                createMockItem(0, 80),
                createMockItem(80, 80),
                createMockItem(160, 80),
            ];
            expect(getStepScrollDelta(viewport, itemsRightClipped, "prev", 40, true)).toBe(120);
        });

        test("wide-item fallback prevents scroll stalling when candidate spans past target edge", () => {
            const viewport = createMockViewport({ width: 200 });
            expect(getStepScrollDelta(viewport, [createMockItem(10, 340)], "next", 40, false)).toBe(120);
            expect(getStepScrollDelta(viewport, [createMockItem(-150, 340)], "prev", 40, false)).toBe(-120);

            const narrowViewport = createMockViewport({ width: 100 });
            expect(getStepScrollDelta(narrowViewport, [createMockItem(10, 340)], "next", 40, false)).toBe(40);
            expect(getStepScrollDelta(narrowViewport, [createMockItem(-150, 340)], "prev", 40, false)).toBe(-40);
        });

        test("12px edge snapping snaps next near maxScroll and prev near 0 in LTR and RTL", () => {
            const rightItems = [createMockItem(0, 80), createMockItem(80, 80), createMockItem(160, 80)];
            const leftItems = [createMockItem(-40, 80), createMockItem(40, 80), createMockItem(120, 80)];

            // LTR next
            const nearEndLtr = createMockViewport({ width: 200, scrollWidth: 342, clientWidth: 200, scrollLeft: 20 });
            expect(getStepScrollDelta(nearEndLtr, rightItems, "next", 40, false)).toBe(122);

            const beyondEndLtr = createMockViewport({ width: 200, scrollWidth: 353, clientWidth: 200, scrollLeft: 20 });
            expect(getStepScrollDelta(beyondEndLtr, rightItems, "next", 40, false)).toBe(120);

            // LTR prev
            const nearStartLtr = createMockViewport({ width: 200, scrollWidth: 400, clientWidth: 200, scrollLeft: 122 });
            expect(getStepScrollDelta(nearStartLtr, leftItems, "prev", 40, false)).toBe(-122);

            const beyondStartLtr = createMockViewport({
                width: 200,
                scrollWidth: 400,
                clientWidth: 200,
                scrollLeft: 133,
            });
            expect(getStepScrollDelta(beyondStartLtr, leftItems, "prev", 40, false)).toBe(-120);

            // RTL next
            const nearEndRtl = createMockViewport({ width: 200, scrollWidth: 342, clientWidth: 200, scrollLeft: -20 });
            expect(getStepScrollDelta(nearEndRtl, leftItems, "next", 40, true)).toBe(-122);

            // RTL prev
            const nearStartRtl = createMockViewport({
                width: 200,
                scrollWidth: 400,
                clientWidth: 200,
                scrollLeft: -121,
            });
            expect(getStepScrollDelta(nearStartRtl, rightItems, "prev", 40, true)).toBe(121);
        });
    });

    describe("getScrollIntoViewDelta", () => {
        test("returns 0 when item is already within safe zone (including 1px tolerance)", () => {
            const viewport = createMockViewport({ width: 200 });
            expect(getScrollIntoViewDelta(viewport, createMockItem(40, 80), 40, false)).toBe(0);
            expect(getScrollIntoViewDelta(viewport, createMockItem(39, 80), 40, false)).toBe(0);
            expect(getScrollIntoViewDelta(viewport, createMockItem(81, 80), 40, false)).toBe(0);
        });

        test("clears fadeReserve on left and right edges", () => {
            const viewport = createMockViewport({ width: 200 });
            expect(getScrollIntoViewDelta(viewport, createMockItem(10, 60), 40, false)).toBe(-30);
            expect(getScrollIntoViewDelta(viewport, createMockItem(130, 60), 40, false)).toBe(30);
        });

        test("aligns wide items to safeLeft in LTR and safeRight in RTL", () => {
            const viewport = createMockViewport({ width: 200 });
            const wideItem = createMockItem(60, 180);

            expect(getScrollIntoViewDelta(viewport, wideItem, 40, false)).toBe(20);
            expect(getScrollIntoViewDelta(viewport, wideItem, 40, true)).toBe(80);
        });

        test("snaps to maxScroll or 0 when remaining distance after clearing fadeReserve is <= fadeReserve", () => {
            const ltrNearEnd = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 20 });
            expect(getScrollIntoViewDelta(ltrNearEnd, createMockItem(140, 60), 40, false)).toBe(80);

            const ltrBeyondEnd = createMockViewport({ width: 200, scrollWidth: 301, clientWidth: 200, scrollLeft: 20 });
            expect(getScrollIntoViewDelta(ltrBeyondEnd, createMockItem(140, 60), 40, false)).toBe(40);

            const ltrNearStart = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: 80 });
            expect(getScrollIntoViewDelta(ltrNearStart, createMockItem(0, 60), 40, false)).toBe(-80);

            const rtlNearEnd = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -20 });
            expect(getScrollIntoViewDelta(rtlNearEnd, createMockItem(0, 60), 40, true)).toBe(-80);

            const rtlNearStart = createMockViewport({ width: 200, scrollWidth: 300, clientWidth: 200, scrollLeft: -80 });
            expect(getScrollIntoViewDelta(rtlNearStart, createMockItem(140, 60), 40, true)).toBe(80);
        });
    });
});
