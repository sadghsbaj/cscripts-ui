import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FenwickTree } from "./fenwick-tree.internal.ts";
import { createVirtualScroll, VirtualScrollController, type VirtualScrollRange } from "./virtual-scroll.svelte.ts";

function stubResizeObserver(): ResizeObserverCallback[] {
    const callbacks: ResizeObserverCallback[] = [];
    class MockResizeObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();

        constructor(cb: ResizeObserverCallback) {
            callbacks.push(cb);
        }
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    return callbacks;
}

describe("FenwickTree", () => {
    it("handles empty initialization and out-of-bounds queries", () => {
        const tree = new FenwickTree();
        expect(tree.length).toBe(0);
        expect(tree.total).toBe(0);
        expect(tree.get(0)).toBe(0);
        expect(tree.get(-1)).toBe(0);
        expect(tree.sum(0)).toBe(0);
        expect(tree.sum(10)).toBe(0);
        expect(tree.lowerBound(0)).toBe(0);
        expect(tree.lowerBound(100)).toBe(0);
        expect(tree.set(0, 50)).toBe(0);
        tree.add(0, 25);
        expect(tree.total).toBe(0);
    });

    it("builds in O(N) and computes exact prefix sums and gets", () => {
        const tree = new FenwickTree();
        tree.build([10, 20, 30, 40, 50]);

        expect(tree.length).toBe(5);
        expect(tree.total).toBe(150);
        expect(tree.get(0)).toBe(10);
        expect(tree.get(4)).toBe(50);
        expect(tree.get(-1)).toBe(0);
        expect(tree.get(5)).toBe(0);

        expect(tree.sum(-3)).toBe(0);
        expect(tree.sum(0)).toBe(0);
        expect(tree.sum(1)).toBe(10);
        expect(tree.sum(2)).toBe(30);
        expect(tree.sum(3)).toBe(60);
        expect(tree.sum(4)).toBe(100);
        expect(tree.sum(5)).toBe(150);
        expect(tree.sum(99)).toBe(150);
    });

    it("supports set() and add() updates with accurate delta returns", () => {
        const tree = new FenwickTree();
        tree.build([10, 20, 30, 40]);

        expect(tree.set(1, 20)).toBe(0);
        expect(tree.set(1, 50)).toBe(30);
        expect(tree.get(1)).toBe(50);
        expect(tree.total).toBe(130);
        expect(tree.sum(2)).toBe(60);
        expect(tree.sum(4)).toBe(130);

        tree.add(2, -10);
        expect(tree.get(2)).toBe(20);
        expect(tree.total).toBe(120);
        expect(tree.sum(3)).toBe(80);

        tree.add(2, 0);
        expect(tree.total).toBe(120);
    });

    it("computes lowerBound() accurately including exact boundaries and zero-sized rows", () => {
        const tree = new FenwickTree();
        tree.build([10, 20, 30, 40]);

        expect(tree.lowerBound(-5)).toBe(0);
        expect(tree.lowerBound(0)).toBe(0);
        expect(tree.lowerBound(9.99)).toBe(0);
        expect(tree.lowerBound(10)).toBe(1);
        expect(tree.lowerBound(29.5)).toBe(1);
        expect(tree.lowerBound(30)).toBe(2);
        expect(tree.lowerBound(59)).toBe(2);
        expect(tree.lowerBound(60)).toBe(3);
        expect(tree.lowerBound(99.9)).toBe(3);
        expect(tree.lowerBound(100)).toBe(4);
        expect(tree.lowerBound(500)).toBe(4);

        // Zero-height rows: prefix sums [0, 0, 20, 20, 50]
        tree.build([0, 20, 0, 30]);
        expect(tree.lowerBound(0)).toBe(0);
        expect(tree.lowerBound(19)).toBe(1);
        expect(tree.lowerBound(20)).toBe(3);
        expect(tree.lowerBound(49)).toBe(3);
        expect(tree.lowerBound(50)).toBe(4);
    });

    it("resizes and rebuilds cleanly without leaking stale values", () => {
        const tree = new FenwickTree(4);
        expect(tree.length).toBe(4);
        expect(tree.total).toBe(0);

        tree.build([10, 20, 30, 40, 50]);
        expect(tree.total).toBe(150);

        tree.resize(3);
        expect(tree.length).toBe(3);
        expect(tree.total).toBe(0);
        expect(tree.sum(3)).toBe(0);

        tree.build([5, 15]);
        expect(tree.length).toBe(2);
        expect(tree.total).toBe(20);
        expect(tree.sum(2)).toBe(20);
    });

    it("handles 100k-item build, updates, prefix sums, and lowerBound lookups", () => {
        const count = 100_000;
        const sizes = new Float64Array(count);
        for (let i = 0; i < count; i++) {
            sizes[i] = 20 + (i % 5) * 10;
        }

        const start = performance.now();
        const tree = new FenwickTree();
        tree.build(sizes);

        // Spot-check prefix sum
        let expectedSum = 0;
        for (let i = 0; i < 50_000; i++) {
            expectedSum += sizes[i] ?? 0;
        }
        expect(tree.sum(50_000)).toBe(expectedSum);

        // Perform 1,000 point updates and verify lowerBound invariants
        for (let i = 0; i < 1000; i++) {
            const idx = i * 97;
            tree.set(idx, 100);
        }

        const probeOffset = tree.sum(75_000) + 5;
        const foundRow = tree.lowerBound(probeOffset);
        expect(tree.sum(foundRow)).toBeLessThanOrEqual(probeOffset);
        expect(tree.sum(foundRow + 1)).toBeGreaterThan(probeOffset);

        const elapsed = performance.now() - start;
        expect(elapsed).toBeLessThan(1000);
    });
});

describe("VirtualScrollController", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it("returns empty state when count === 0", () => {
        const controller = createVirtualScroll({
            count: 0,
            estimateSize: 40,
            initialViewportSize: 400,
        });

        expect(controller.items).toEqual([]);
        expect(controller.offsetBefore).toBe(0);
        expect(controller.offsetAfter).toBe(0);
        expect(controller.totalSize).toBe(0);
        expect(controller.startIndex).toBe(0);
        expect(controller.endIndex).toBe(-1);
        expect(controller.visibleRange).toEqual({ startIndex: 0, endIndex: -1 });
        expect(controller.scrollOffset).toBe(0);

        // Safe no-ops on empty list
        controller.scrollToIndex(5);
        controller.invalidate(0);
        controller.measure();
        expect(controller.items).toEqual([]);
    });

    it("supports SSR initialRenderCount and initialViewportSize before mount", () => {
        const ssrController = new VirtualScrollController({
            count: 100,
            estimateSize: 50,
            initialRenderCount: 6,
            initialViewportSize: 200,
        });

        expect(ssrController.items).toHaveLength(6);
        expect(ssrController.startIndex).toBe(0);
        expect(ssrController.endIndex).toBe(5);
        expect(ssrController.offsetBefore).toBe(0);
        expect(ssrController.totalSize).toBe(5000);
        expect(ssrController.offsetAfter).toBe(4700);
        expect(ssrController.visibleRange).toEqual({ startIndex: 0, endIndex: 5 });

        const vpOnlyController = createVirtualScroll({
            count: 50,
            estimateSize: 40,
            initialViewportSize: 120,
            overscan: 2,
        });
        // Visible rows: 0, 1, 2 (120px) + overscan 2 => rows 0..4
        expect(vpOnlyController.startIndex).toBe(0);
        expect(vpOnlyController.endIndex).toBe(4);
        expect(vpOnlyController.offsetBefore).toBe(0);
        expect(vpOnlyController.offsetAfter).toBe(45 * 40);

        const hiddenController = createVirtualScroll({
            count: 50,
            estimateSize: 40,
            initialViewportSize: 0,
        });
        expect(hiddenController.items).toEqual([]);
        expect(hiddenController.totalSize).toBe(2000);
        expect(hiddenController.offsetAfter).toBe(2000);
    });

    it("computes fixed: true arithmetic with gap and ignores invalidate()", () => {
        const controller = createVirtualScroll({
            count: 20,
            estimateSize: 30,
            fixed: true,
            gap: 10,
            overscan: 1,
            initialViewportSize: 100,
        });

        // 20 * 30 + 19 * 10 = 790
        expect(controller.totalSize).toBe(790);
        // Viewport 100px at 0: row 0 (0..30), row 1 (40..70), row 2 (80..110) + overscan 1 => row 3
        expect(controller.startIndex).toBe(0);
        expect(controller.endIndex).toBe(3);
        expect(controller.items.map((item) => ({ index: item.index, start: item.start, size: item.size }))).toEqual([
            { index: 0, start: 0, size: 30 },
            { index: 1, start: 40, size: 30 },
            { index: 2, start: 80, size: 30 },
            { index: 3, start: 120, size: 30 },
        ]);

        controller.invalidate(0);
        expect(controller.totalSize).toBe(790);
    });

    it("handles lanes > 1 with mixed item heights in the same row and gap", () => {
        const heights = [20, 50, 30, 40, 10, 60, 25];
        const controller = createVirtualScroll({
            count: heights.length,
            estimateSize: (i) => heights[i] ?? 20,
            lanes: 3,
            gap: 10,
            overscan: 0,
            initialViewportSize: 500,
        });

        // Row 0: max(20,50,30)=50, Row 1: max(40,10,60)=60, Row 2: max(25)=25
        // Total: 50 + 10 + 60 + 10 + 25 = 155
        expect(controller.totalSize).toBe(155);
        expect(controller.items).toEqual([
            { index: 0, lane: 0, start: 0, size: 20, key: 0 },
            { index: 1, lane: 1, start: 0, size: 50, key: 1 },
            { index: 2, lane: 2, start: 0, size: 30, key: 2 },
            { index: 3, lane: 0, start: 60, size: 40, key: 3 },
            { index: 4, lane: 1, start: 60, size: 10, key: 4 },
            { index: 5, lane: 2, start: 60, size: 60, key: 5 },
            { index: 6, lane: 0, start: 130, size: 25, key: 6 },
        ]);
    });

    it("updates row height in lanes > 1 only when max item height in row changes", () => {
        const resizeCallbacks = stubResizeObserver();

        const controller = createVirtualScroll({
            count: 6,
            estimateSize: (i) => (i === 1 ? 50 : 20),
            lanes: 3,
            gap: 10,
            initialViewportSize: 300,
        });

        const item0 = document.createElement("div");
        const item1 = document.createElement("div");
        const clean0 = controller.attachItem(0)(item0);
        const clean1 = controller.attachItem(1)(item1);

        // Row 0 max=50, Row 1 max=20, gap=10 => total 80
        expect(controller.totalSize).toBe(80);

        const itemObserverCb = resizeCallbacks[0];
        expect(itemObserverCb).toBeDefined();

        // Item 0 grows from 20 to 40 -> still <= 50, row height unchanged
        itemObserverCb?.(
            [{ target: item0, borderBoxSize: [{ blockSize: 40, inlineSize: 100 }] } as unknown as ResizeObserverEntry],
            {} as ResizeObserver
        );
        expect(controller.totalSize).toBe(80);
        expect(controller.items[0]?.size).toBe(40);
        expect(controller.items[3]?.start).toBe(60);

        // Item 0 grows to 80 -> row 0 max becomes 80, total grows by 30 to 110
        itemObserverCb?.(
            [{ target: item0, borderBoxSize: [{ blockSize: 80, inlineSize: 100 }] } as unknown as ResizeObserverEntry],
            {} as ResizeObserver
        );
        expect(controller.totalSize).toBe(110);
        expect(controller.items[3]?.start).toBe(90);

        clean0?.();
        clean1?.();
    });

    it("populates custom keys via getItemKey and updates sizes via measure()", () => {
        const keys = ["alpha", "beta", "gamma"];
        const controller = createVirtualScroll({
            count: keys.length,
            estimateSize: 30,
            getItemKey: (i) => keys[i] ?? i,
            initialViewportSize: 500,
        });

        expect(controller.items.map((item) => item.key)).toEqual(["alpha", "beta", "gamma"]);

        const elBeta = document.createElement("div");
        elBeta.getBoundingClientRect = () =>
            ({ height: 95, width: 200, top: 0, left: 0, bottom: 95, right: 200 }) as DOMRect;

        const cleanBeta = controller.attachItem(1)(elBeta);
        controller.measure();

        expect(controller.totalSize).toBe(30 + 95 + 30);
        expect(controller.items[1]?.size).toBe(95);
        expect(controller.items[2]?.start).toBe(125);

        cleanBeta?.();
    });

    it("supports invalidate(fromIndex) to reset measurements selectively", () => {
        const resizeCallbacks = stubResizeObserver();

        const controller = createVirtualScroll({
            count: 4,
            estimateSize: 40,
            getItemKey: (i) => `k-${i}`,
            initialViewportSize: 500,
        });

        const el0 = document.createElement("div");
        const el1 = document.createElement("div");
        const el2 = document.createElement("div");
        const c0 = controller.attachItem(0)(el0);
        const c1 = controller.attachItem(1)(el1);
        const c2 = controller.attachItem(2)(el2);

        resizeCallbacks[0]?.(
            [
                { target: el0, borderBoxSize: [{ blockSize: 100, inlineSize: 100 }] } as unknown as ResizeObserverEntry,
                { target: el1, borderBoxSize: [{ blockSize: 100, inlineSize: 100 }] } as unknown as ResizeObserverEntry,
                { target: el2, borderBoxSize: [{ blockSize: 100, inlineSize: 100 }] } as unknown as ResizeObserverEntry,
            ],
            {} as ResizeObserver
        );
        // 100 + 100 + 100 + 40 = 340
        expect(controller.totalSize).toBe(340);

        controller.invalidate(1);
        // Item 0 stays 100; items 1..3 revert to 40 => 100 + 40 + 40 + 40 = 220
        expect(controller.totalSize).toBe(220);
        expect(controller.items[0]?.size).toBe(100);
        expect(controller.items[1]?.size).toBe(40);
        expect(controller.items[2]?.size).toBe(40);

        controller.invalidate();
        expect(controller.totalSize).toBe(160);

        c0?.();
        c1?.();
        c2?.();
    });

    it("returns correct ARIA props for list/listbox and table/grid rows", () => {
        const controller = createVirtualScroll({
            count: 250,
            estimateSize: 32,
        });

        expect(controller.getItemAriaProps(0)).toEqual({
            "aria-setsize": 250,
            "aria-posinset": 1,
        });
        expect(controller.getItemAriaProps(41, { role: "option" })).toEqual({
            "aria-setsize": 250,
            "aria-posinset": 42,
        });
        expect(controller.getItemAriaProps(9, { role: "row" })).toEqual({
            "aria-rowindex": 10,
        });
        expect(controller.getItemAriaProps(9, { role: "row", headerRowCount: 2 })).toEqual({
            "aria-rowindex": 12,
        });
    });

    it("scrollToOffset() updates range and fires onRangeChange only when visibleRange changes", () => {
        const ranges: VirtualScrollRange[] = [];
        const controller = createVirtualScroll({
            count: 100,
            estimateSize: 50,
            overscan: 1,
            onRangeChange: (range) => {
                ranges.push(range);
            },
        });

        const vp = document.createElement("div");
        // 140px viewport so scrolling 10px ([10, 150)) stays within rows 0..2 without touching row 3
        Object.defineProperty(vp, "clientHeight", { value: 140, configurable: true });
        let scrollTop = 0;
        Object.defineProperty(vp, "scrollTop", {
            get: () => scrollTop,
            set: (v: number) => {
                scrollTop = v;
            },
            configurable: true,
        });
        vp.scrollTo = ((options?: ScrollToOptions) => {
            if (typeof options?.top === "number") {
                scrollTop = options.top;
            }
        }) as typeof vp.scrollTo;

        const cleanVp = controller.attachViewport(vp);
        // Initial mount range: 0..2 (150px / 50px)
        expect(ranges).toEqual([{ startIndex: 0, endIndex: 2 }]);
        expect(controller.startIndex).toBe(0);
        expect(controller.endIndex).toBe(3); // +1 overscan

        // Scroll by 10px: still row 0..2 -> onRangeChange must NOT fire again
        controller.scrollToOffset(10);
        expect(ranges).toHaveLength(1);

        // Scroll to 500px: visible rows 10..12, rendered rows 9..13
        controller.scrollToOffset(500);
        expect(controller.scrollOffset).toBe(500);
        expect(controller.visibleRange).toEqual({ startIndex: 10, endIndex: 12 });
        expect(controller.startIndex).toBe(9);
        expect(controller.endIndex).toBe(13);
        expect(controller.offsetBefore).toBe(9 * 50);
        expect(controller.offsetAfter).toBe(5000 - 14 * 50);
        expect(ranges).toEqual([
            { startIndex: 0, endIndex: 2 },
            { startIndex: 10, endIndex: 12 },
        ]);

        cleanVp?.();
    });

    it("scrollToIndex() supports center, end, and auto alignment (no-op when in view, scrolls when out of view)", () => {
        const controller = createVirtualScroll({
            count: 20,
            estimateSize: 50,
            fixed: true,
            overscan: 0,
        });

        const vp = document.createElement("div");
        Object.defineProperty(vp, "clientHeight", { value: 200, configurable: true });
        let scrollTop = 0;
        Object.defineProperty(vp, "scrollTop", {
            get: () => scrollTop,
            set: (v: number) => {
                scrollTop = v;
            },
            configurable: true,
        });
        const scrollToSpy = vi.fn((options?: ScrollToOptions) => {
            if (typeof options?.top === "number") {
                scrollTop = options.top;
            }
        });
        vp.scrollTo = scrollToSpy as typeof vp.scrollTo;

        const cleanVp = controller.attachViewport(vp);

        // Item 10: start=500, size=50, end=550; vp=200
        // align: "center" -> 500 - (200 - 50) / 2 = 425
        controller.scrollToIndex(10, { align: "center" });
        expect(scrollTop).toBe(425);
        expect(controller.scrollOffset).toBe(425);
        expect(scrollToSpy).toHaveBeenCalledTimes(1);

        // align: "end" -> 550 - 200 = 350
        controller.scrollToIndex(10, { align: "end" });
        expect(scrollTop).toBe(350);
        expect(controller.scrollOffset).toBe(350);
        expect(scrollToSpy).toHaveBeenCalledTimes(2);

        // align: "auto" when item is already in view [350, 550] -> no-op
        // Item 8: start=400, end=450 is strictly inside [350, 550]
        controller.scrollToIndex(8, { align: "auto" });
        expect(scrollTop).toBe(350);
        expect(controller.scrollOffset).toBe(350);
        expect(scrollToSpy).toHaveBeenCalledTimes(2);

        // Item 10 at [500, 550] is at the end edge of [350, 550] -> still in view, no-op
        controller.scrollToIndex(10, { align: "auto" });
        expect(scrollTop).toBe(350);
        expect(scrollToSpy).toHaveBeenCalledTimes(2);

        // align: "auto" when item is above viewport -> aligns to start
        // Item 2: start=100, end=150 < 350 -> scrolls to 100
        controller.scrollToIndex(2, { align: "auto" });
        expect(scrollTop).toBe(100);
        expect(controller.scrollOffset).toBe(100);
        expect(scrollToSpy).toHaveBeenCalledTimes(3);

        // align: "auto" when item is below viewport -> aligns to end
        // Viewport is [100, 300]; Item 12: start=600, end=650 > 300 -> scrolls to 650 - 200 = 450
        controller.scrollToIndex(12, { align: "auto" });
        expect(scrollTop).toBe(450);
        expect(controller.scrollOffset).toBe(450);
        expect(scrollToSpy).toHaveBeenCalledTimes(4);

        vi.runAllTimers();
        cleanVp?.();
    });
});
