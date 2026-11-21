import { describe, expect, test } from "vitest";

import type { SplitterExtent } from "./splitter.types.ts";
import {
    formatExtentForProp,
    isZeroExtent,
    normalizeExtents,
    parseExtent,
    resolveExtentPx,
    solveContainerResize,
    solveInitialAndMountExtents,
    solvePairDrag,
    type SolverPaneState,
} from "./splitter-solver.internal.ts";

function makePane(overrides: Partial<SolverPaneState> & { id: string }): SolverPaneState {
    return {
        hasExplicitId: true,
        extentPx: undefined,
        preCollapseExtentPx: undefined,
        specifiedExtent: undefined,
        isControlled: false,
        minPx: 0,
        maxPx: 1000,
        collapsible: false,
        collapsed: false,
        collapsedExtentPx: 0,
        collapseThreshold: 0.5,
        unitPreference: "%",
        ...overrides,
    };
}

describe("splitter-solver.internal", () => {
    describe("parseExtent & resolveExtentPx", () => {
        test("parses number, px, and % extents including whitespace and non-finite inputs", () => {
            expect(parseExtent(25)).toEqual({ unit: "%", value: 25 });
            expect(parseExtent(" 240px " as SplitterExtent)).toEqual({ unit: "px", value: 240 });
            expect(parseExtent(" 33.5% " as SplitterExtent)).toEqual({ unit: "%", value: 33.5 });
            expect(parseExtent(Number.isNaN(NaN) ? NaN : 0)).toEqual({ unit: "%", value: 0 });
            expect(parseExtent("badpx" as `${number}px`)).toEqual({ unit: "px", value: 0 });
        });

        test("resolves px and % against availablePx and clamps negatives to 0", () => {
            expect(resolveExtentPx("240px", 1000)).toBe(240);
            expect(resolveExtentPx("-20px", 1000)).toBe(0);
            expect(resolveExtentPx("25%", 800)).toBe(200);
            expect(resolveExtentPx(50, 800)).toBe(400);
            expect(resolveExtentPx("50%", 0)).toBe(0);
        });
    });

    describe("formatExtentForProp & isZeroExtent", () => {
        test("preserves template unit (px, number, %)", () => {
            expect(formatExtentForProp(240.126, "200px", 1000)).toBe("240.13px");
            expect(formatExtentForProp(250, 20, 1000)).toBe(25);
            expect(formatExtentForProp(250, "20%", 1000)).toBe("25%");
            expect(formatExtentForProp(250, undefined, 1000)).toBe("25%");
            expect(formatExtentForProp(100, "20%", 0)).toBe("0%");
        });

        test("detects zero and negative extents", () => {
            expect(isZeroExtent(0)).toBe(true);
            expect(isZeroExtent("0px")).toBe(true);
            expect(isZeroExtent("0%")).toBe(true);
            expect(isZeroExtent("-5px")).toBe(true);
            expect(isZeroExtent("1px")).toBe(false);
            expect(isZeroExtent(1)).toBe(false);
        });
    });

    describe("normalizeExtents", () => {
        test("clamps panes to [min, max] and redistributes surplus/deficit across 2 and 3 panes", () => {
            // AI chatboard: left sidebar (min 180, max 360), main (min 300, max 1000), right panel (min 200, max 400)
            const panes = [
                makePane({ id: "left", minPx: 180, maxPx: 360 }),
                makePane({ id: "main", minPx: 300, maxPx: 1000 }),
                makePane({ id: "right", minPx: 200, maxPx: 400 }),
            ];

            // Raw extents sum to 1150 in a 1000px container, with left fixed at 240
            const result = normalizeExtents([240, 610, 300], panes, 1000, new Set([0]));
            expect(result[0]).toBe(240);
            expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 1);
            for (const [i, pane] of panes.entries()) {
                expect(result[i]).toBeGreaterThanOrEqual(pane.minPx - 0.01);
                expect(result[i]).toBeLessThanOrEqual(pane.maxPx + 0.01);
            }
        });

        test("yields fixed panes in second pass when non-fixed panes hit bounds", () => {
            const panes = [
                makePane({ id: "a", minPx: 100, maxPx: 600 }),
                makePane({ id: "b", minPx: 100, maxPx: 200 }),
            ];
            // Both fixed or b capped at 200 while a is fixed at 500 in 1000px -> a must expand to 800 (clamped to max 600)
            const result = normalizeExtents([500, 150], panes, 1000, new Set([0]));
            expect(result[1]).toBeCloseTo(200, 1);
            expect(result[0]).toBeCloseTo(600, 1);
        });

        test("compresses expanded panes proportionally below min when container is smaller than sum(min)", () => {
            const panes = [
                makePane({ id: "left", minPx: 200, maxPx: 500 }),
                makePane({ id: "main", minPx: 400, maxPx: 800 }),
                makePane({ id: "collapsed", collapsed: true, collapsedExtentPx: 0 }),
            ];
            // getEffectiveBounds clamps each pane's min to availablePx (300) -> [200, 300, 0], then scales by 300/500 = 0.6
            const result = normalizeExtents([200, 400, 0], panes, 300);
            expect(result[0]).toBeCloseTo(120, 1);
            expect(result[1]).toBeCloseTo(180, 1);
            expect(result[2]).toBe(0);
        });

        test("returns zeros when availablePx <= 0", () => {
            const panes = [makePane({ id: "a" }), makePane({ id: "b" })];
            expect(normalizeExtents([100, 100], panes, 0)).toEqual([0, 0]);
        });
    });

    describe("solveInitialAndMountExtents", () => {
        test("splits equally when no extents are specified", () => {
            const panes = [makePane({ id: "a" }), makePane({ id: "b" }), makePane({ id: "c" })];
            const result = solveInitialAndMountExtents(panes, 900, new Map());
            expect(result).toEqual([300, 300, 300]);
        });

        test("allocates specified px/% extents and gives remaining space to flex panes", () => {
            const panes = [
                makePane({ id: "left", specifiedExtent: "240px", unitPreference: "px" }),
                makePane({ id: "main" }),
                makePane({ id: "right", specifiedExtent: "26%", unitPreference: "%" }),
            ];
            const result = solveInitialAndMountExtents(panes, 1000, new Map());
            expect(result[0]).toBeCloseTo(240, 1);
            expect(result[2]).toBeCloseTo(260, 1);
            expect(result[1]).toBeCloseTo(500, 1);
        });

        test("restores remembered extent only for uncontrolled panes with explicit id", () => {
            const remembered = new Map<string, number>([
                ["explicit-uncontrolled", 320],
                ["explicit-controlled", 320],
                ["auto-id", 320],
            ]);

            const panes = [
                makePane({
                    id: "explicit-uncontrolled",
                    hasExplicitId: true,
                    isControlled: false,
                    specifiedExtent: "200px",
                }),
                makePane({
                    id: "explicit-controlled",
                    hasExplicitId: true,
                    isControlled: true,
                    specifiedExtent: "200px",
                }),
                makePane({
                    id: "auto-id",
                    hasExplicitId: false,
                    isControlled: false,
                    specifiedExtent: "200px",
                }),
                makePane({ id: "flex" }),
            ];

            const result = solveInitialAndMountExtents(panes, 1000, remembered);
            expect(result[0]).toBeCloseTo(320, 1);
            expect(result[1]).toBeCloseTo(200, 1);
            expect(result[2]).toBeCloseTo(200, 1);
            expect(result[3]).toBeCloseTo(280, 1);
        });

        test("handles incremental mount (toggling a 3rd sidebar pane into an existing 2-pane layout)", () => {
            const remembered = new Map<string, number>([["inspector", 280]]);
            const panes = [
                makePane({ id: "left", extentPx: 240, minPx: 150, maxPx: 400 }),
                makePane({ id: "main", extentPx: 760, minPx: 200, maxPx: 1000 }),
                makePane({
                    id: "inspector",
                    hasExplicitId: true,
                    specifiedExtent: "200px",
                    minPx: 150,
                    maxPx: 400,
                }),
            ];

            const result = solveInitialAndMountExtents(panes, 1000, remembered);
            expect(result[2]).toBeCloseTo(280, 1);
            expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 1);
            expect(result[0]).toBeGreaterThanOrEqual(150);
            expect(result[1]).toBeGreaterThanOrEqual(200);
        });
    });

    describe("solveContainerResize", () => {
        test("keeps px-pinned and collapsed panes fixed while flexible panes absorb container delta", () => {
            const panes = [
                makePane({
                    id: "sidebar",
                    extentPx: 240,
                    minPx: 180,
                    maxPx: 400,
                    unitPreference: "px",
                }),
                makePane({
                    id: "main",
                    extentPx: 560,
                    minPx: 200,
                    maxPx: 2000,
                    unitPreference: "%",
                }),
                makePane({
                    id: "drawer",
                    extentPx: 0,
                    collapsed: true,
                    collapsedExtentPx: 0,
                    unitPreference: "px",
                }),
            ];

            const expanded = solveContainerResize(panes, 1200);
            expect(expanded[0]).toBeCloseTo(240, 1);
            expect(expanded[1]).toBeCloseTo(960, 1);
            expect(expanded[2]).toBe(0);

            const shrunk = solveContainerResize(panes, 600);
            expect(shrunk[0]).toBeCloseTo(240, 1);
            expect(shrunk[1]).toBeCloseTo(360, 1);
            expect(shrunk[2]).toBe(0);
        });
    });

    describe("solvePairDrag", () => {
        test("resizes within bounds and clamps at min/max", () => {
            const left = makePane({ id: "left", minPx: 150, maxPx: 400 });
            const right = makePane({ id: "right", minPx: 200, maxPx: 800 });

            const mid = solvePairDrag(left, right, 250, 550, 100, 800);
            expect(mid).toEqual({
                leftPx: 350,
                rightPx: 450,
                leftCollapsed: false,
                rightCollapsed: false,
            });

            const clampedMax = solvePairDrag(left, right, 250, 550, 500, 800);
            expect(clampedMax.leftPx).toBe(400);
            expect(clampedMax.rightPx).toBe(400);

            const clampedMin = solvePairDrag(left, right, 250, 550, -500, 800);
            expect(clampedMin.leftPx).toBe(150);
            expect(clampedMin.rightPx).toBe(650);
        });

        test("snaps left pane to collapsedExtentPx past collapseThreshold and expands back past threshold", () => {
            // minPx = 200, collapsedExtentPx = 0, threshold = 0.5 -> thresholdPx = 100
            const left = makePane({
                id: "left",
                minPx: 200,
                maxPx: 500,
                collapsible: true,
                collapsed: false,
                collapsedExtentPx: 0,
                collapseThreshold: 0.5,
            });
            const right = makePane({ id: "right", minPx: 200, maxPx: 900 });

            // Dragging to 120px stays clamped at minPx (200) without collapsing
            const stillOpen = solvePairDrag(left, right, 250, 550, -130, 800);
            expect(stillOpen.leftCollapsed).toBe(false);
            expect(stillOpen.leftPx).toBe(200);

            // Dragging to 90px (< 100px threshold) snaps to collapsed (0px)
            const collapsed = solvePairDrag(left, right, 250, 550, -160, 800);
            expect(collapsed.leftCollapsed).toBe(true);
            expect(collapsed.leftPx).toBe(0);
            expect(collapsed.rightPx).toBe(800);

            // Dragging right from collapsed: below threshold (80px) stays collapsed
            const leftCollapsedPane = { ...left, collapsed: true };
            const stayCollapsed = solvePairDrag(leftCollapsedPane, right, 0, 800, 80, 800);
            expect(stayCollapsed.leftCollapsed).toBe(true);
            expect(stayCollapsed.leftPx).toBe(0);

            // Dragging right past threshold (110px >= 100px) expands and clamps to minPx (200)
            const expanded = solvePairDrag(leftCollapsedPane, right, 0, 800, 110, 800);
            expect(expanded.leftCollapsed).toBe(false);
            expect(expanded.leftPx).toBe(200);
            expect(expanded.rightPx).toBe(600);
        });

        test("snaps right pane to collapsedExtentPx past collapseThreshold and expands back", () => {
            const left = makePane({ id: "left", minPx: 200, maxPx: 900 });
            const right = makePane({
                id: "right",
                minPx: 200,
                maxPx: 500,
                collapsible: true,
                collapsed: false,
                collapsedExtentPx: 40,
                collapseThreshold: 0.5, // 40 + (200 - 40) * 0.5 = 120px
            });

            // Dragging right by +140: targetRight = 250 - 140 = 110 (< 120) -> collapses to 40
            const collapsed = solvePairDrag(left, right, 550, 250, 140, 800);
            expect(collapsed.rightCollapsed).toBe(true);
            expect(collapsed.rightPx).toBe(40);
            expect(collapsed.leftPx).toBe(760);

            // Expanding back: delta = -90 -> targetRight = 40 + 90 = 130 (>= 120) -> expands to minPx 200
            const rightCollapsedPane = { ...right, collapsed: true };
            const expanded = solvePairDrag(left, rightCollapsedPane, 760, 40, -90, 800);
            expect(expanded.rightCollapsed).toBe(false);
            expect(expanded.rightPx).toBe(200);
            expect(expanded.leftPx).toBe(600);
        });
    });
});
