import { afterEach, describe, expect, test, vi } from "vitest";

import { POPOVER_PLACEMENTS, type PopoverPlacement } from ".";
import { findAnchorElement, resolvePopoverPlacement } from "./placement-flip.internal";

function rect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
    };
}

// Standard 100x40 anchor at (200, 200) -> right: 300, bottom: 240, center: (250, 220)
const ANCHOR = rect(200, 200, 100, 40);
const POPOVER_W = 160;
const POPOVER_H = 80;
const OFFSET = 8;

const NO_FLIP_CASES: Record<PopoverPlacement, DOMRectReadOnly> = {
    top: rect(170, 200 - OFFSET - POPOVER_H, POPOVER_W, POPOVER_H),
    "top-start": rect(200, 200 - OFFSET - POPOVER_H, POPOVER_W, POPOVER_H),
    "top-end": rect(300 - POPOVER_W, 200 - OFFSET - POPOVER_H, POPOVER_W, POPOVER_H),
    bottom: rect(170, 240 + OFFSET, POPOVER_W, POPOVER_H),
    "bottom-start": rect(200, 240 + OFFSET, POPOVER_W, POPOVER_H),
    "bottom-end": rect(300 - POPOVER_W, 240 + OFFSET, POPOVER_W, POPOVER_H),
    left: rect(200 - OFFSET - POPOVER_W, 180, POPOVER_W, POPOVER_H),
    "left-start": rect(200 - OFFSET - POPOVER_W, 200, POPOVER_W, POPOVER_H),
    "left-end": rect(200 - OFFSET - POPOVER_W, 240 - POPOVER_H, POPOVER_W, POPOVER_H),
    right: rect(300 + OFFSET, 180, POPOVER_W, POPOVER_H),
    "right-start": rect(300 + OFFSET, 200, POPOVER_W, POPOVER_H),
    "right-end": rect(300 + OFFSET, 240 - POPOVER_H, POPOVER_W, POPOVER_H),
};

const PRIMARY_FLIP_CASES: Array<[PopoverPlacement, PopoverPlacement]> = [
    ["top", "bottom"],
    ["top-start", "bottom-start"],
    ["top-end", "bottom-end"],
    ["bottom", "top"],
    ["bottom-start", "top-start"],
    ["bottom-end", "top-end"],
    ["left", "right"],
    ["left-start", "right-start"],
    ["left-end", "right-end"],
    ["right", "left"],
    ["right-start", "left-start"],
    ["right-end", "left-end"],
];

const CROSS_AXIS_FLIP_CASES: Array<[PopoverPlacement, PopoverPlacement]> = [
    ["top-start", "top-end"],
    ["top-end", "top-start"],
    ["bottom-start", "bottom-end"],
    ["bottom-end", "bottom-start"],
    ["left-start", "left-end"],
    ["left-end", "left-start"],
    ["right-start", "right-end"],
    ["right-end", "right-start"],
];

const DUAL_FLIP_CASES: Array<[PopoverPlacement, PopoverPlacement]> = [
    ["top-start", "bottom-end"],
    ["top-end", "bottom-start"],
    ["bottom-start", "top-end"],
    ["bottom-end", "top-start"],
    ["left-start", "right-end"],
    ["left-end", "right-start"],
    ["right-start", "left-end"],
    ["right-end", "left-start"],
];

describe("resolvePopoverPlacement", () => {
    test.each(POPOVER_PLACEMENTS)("returns %s unchanged when positioned on its requested side", (placement) => {
        expect(resolvePopoverPlacement(placement, ANCHOR, NO_FLIP_CASES[placement])).toBe(placement);
    });

    test("does not false-flip alignment when popover is narrower than anchor", () => {
        // 40x20 popover aligned to start (left=200) sits inside anchor's [200, 300] span
        expect(resolvePopoverPlacement("top-start", ANCHOR, rect(200, 172, 40, 20))).toBe("top-start");
        // 40x20 popover aligned to end (right=300) sits inside anchor's [200, 300] span
        expect(resolvePopoverPlacement("top-end", ANCHOR, rect(260, 172, 40, 20))).toBe("top-end");
        // 40x20 popover aligned to start on left side (top=200) sits inside anchor's [200, 240] span
        expect(resolvePopoverPlacement("left-start", ANCHOR, rect(152, 200, 40, 20))).toBe("left-start");
        // 40x20 popover aligned to end on left side (bottom=240) sits inside anchor's [200, 240] span
        expect(resolvePopoverPlacement("left-end", ANCHOR, rect(152, 220, 40, 20))).toBe("left-end");
    });

    test.each(PRIMARY_FLIP_CASES)("detects primary axis flip: %s -> %s", (requested, expected) => {
        expect(resolvePopoverPlacement(requested, ANCHOR, NO_FLIP_CASES[expected])).toBe(expected);
    });

    test.each(CROSS_AXIS_FLIP_CASES)("detects cross-axis flip: %s -> %s", (requested, expected) => {
        expect(resolvePopoverPlacement(requested, ANCHOR, NO_FLIP_CASES[expected])).toBe(expected);
    });

    test.each(DUAL_FLIP_CASES)("detects dual flip (primary + cross-axis): %s -> %s", (requested, expected) => {
        expect(resolvePopoverPlacement(requested, ANCHOR, NO_FLIP_CASES[expected])).toBe(expected);
    });

    test("guards against zero-sized popover", () => {
        // Even if placed on the opposite side, a 0x0 popover has not laid out yet.
        const zeroPopover = rect(200, 300, 0, 0);
        for (const placement of POPOVER_PLACEMENTS) {
            expect(resolvePopoverPlacement(placement, ANCHOR, zeroPopover)).toBe(placement);
        }
    });

    test("guards against unlaid-out anchor (0x0 at origin 0,0)", () => {
        const unlaidOutAnchor = rect(0, 0, 0, 0);
        const popover = rect(10, 10, 120, 60);
        for (const placement of POPOVER_PLACEMENTS) {
            expect(resolvePopoverPlacement(placement, unlaidOutAnchor, popover)).toBe(placement);
        }
    });

    test("handles 0x0 virtual anchor (e.g. ContextMenu) with offset", () => {
        const virtualAnchor = rect(300, 400, 0, 0);
        const offset = 8;

        // Requested bottom-start placed below-right of virtual anchor -> no flip
        expect(
            resolvePopoverPlacement("bottom-start", virtualAnchor, rect(300, 400 + offset, POPOVER_W, POPOVER_H)),
        ).toBe("bottom-start");

        // Flipped vertically to top-start
        expect(
            resolvePopoverPlacement(
                "bottom-start",
                virtualAnchor,
                rect(300, 400 - offset - POPOVER_H, POPOVER_W, POPOVER_H),
            ),
        ).toBe("top-start");

        // Dual flip to top-end
        expect(
            resolvePopoverPlacement(
                "bottom-start",
                virtualAnchor,
                rect(300 - POPOVER_W, 400 - offset - POPOVER_H, POPOVER_W, POPOVER_H),
            ),
        ).toBe("top-end");

        // Requested right-end placed right-above virtual anchor -> no flip
        expect(
            resolvePopoverPlacement("right-end", virtualAnchor, rect(300 + offset, 400 - POPOVER_H, POPOVER_W, POPOVER_H)),
        ).toBe("right-end");

        // Dual flip from right-end -> left-start
        expect(
            resolvePopoverPlacement("right-end", virtualAnchor, rect(300 - offset - POPOVER_W, 400, POPOVER_W, POPOVER_H)),
        ).toBe("left-start");
    });
});

describe("findAnchorElement", () => {
    afterEach(() => {
        document.body.replaceChildren();
        vi.restoreAllMocks();
    });

    test("fast-path returns source when inline anchor-name matches --anchor-${id}", () => {
        const popover = document.createElement("div");
        const source = document.createElement("button");
        source.style.setProperty("anchor-name", "--anchor-menu");

        expect(findAnchorElement(popover, "menu", source)).toBe(source);
    });

    test("fast-path matches comma-separated anchor names on source", () => {
        const popover = document.createElement("div");
        const source = document.createElement("button");
        source.style.setProperty("anchor-name", "--other-anchor, --anchor-menu, --third");

        expect(findAnchorElement(popover, "menu", source)).toBe(source);
    });

    test("fast-path matches computed anchor-name when not set inline", () => {
        const popover = document.createElement("div");
        const source = document.createElement("button");
        vi.spyOn(window, "getComputedStyle").mockReturnValue({
            getPropertyValue: (prop: string) => (prop === "anchor-name" ? "--first, --anchor-menu" : ""),
        } as CSSStyleDeclaration);

        expect(findAnchorElement(popover, "menu", source)).toBe(source);
    });

    test("falls back to getRootNode() query when source is null or undefined", () => {
        const anchor = document.createElement("button");
        anchor.style.setProperty("anchor-name", "--anchor-demo");
        const popover = document.createElement("div");
        document.body.append(anchor, popover);

        expect(findAnchorElement(popover, "demo", null)).toBe(anchor);
        expect(findAnchorElement(popover, "demo", undefined)).toBe(anchor);
    });

    test("falls back to getRootNode() query when source is a different element without the matching anchor-name", () => {
        const anchor = document.createElement("div");
        anchor.style.setProperty("anchor-name", "--anchor-demo");
        const unrelatedSource = document.createElement("button");
        unrelatedSource.style.setProperty("anchor-name", "--anchor-other");
        const popover = document.createElement("div");
        document.body.append(anchor, unrelatedSource, popover);

        expect(findAnchorElement(popover, "demo", unrelatedSource)).toBe(anchor);
    });

    test("does not false-match substring anchor names during fallback query", () => {
        const longerAnchor = document.createElement("button");
        longerAnchor.style.setProperty("anchor-name", "--anchor-demo-extra");
        const exactAnchor = document.createElement("button");
        exactAnchor.style.setProperty("anchor-name", "--anchor-demo");
        const popover = document.createElement("div");
        document.body.append(longerAnchor, exactAnchor, popover);

        expect(findAnchorElement(popover, "demo")).toBe(exactAnchor);
    });

    test("finds anchor inside ShadowRoot via getRootNode()", () => {
        const host = document.createElement("div");
        const shadow = host.attachShadow({ mode: "open" });
        const anchor = document.createElement("button");
        anchor.style.setProperty("anchor-name", "--anchor-shadow-pop");
        const popover = document.createElement("div");
        shadow.append(anchor, popover);
        document.body.append(host);

        expect(findAnchorElement(popover, "shadow-pop")).toBe(anchor);
    });

    test("handles special characters in id using CSS.escape", () => {
        const specialId = 'pop:1.2[a]"b';
        const anchor = document.createElement("button");
        anchor.style.setProperty("anchor-name", `--anchor-${specialId}`);
        const popover = document.createElement("div");
        document.body.append(anchor, popover);

        expect(findAnchorElement(popover, specialId)).toBe(anchor);
    });

    test("returns null when popover is detached and source does not match", () => {
        const popover = document.createElement("div");
        const unrelated = document.createElement("button");
        expect(findAnchorElement(popover, "missing", unrelated)).toBeNull();
    });
});
