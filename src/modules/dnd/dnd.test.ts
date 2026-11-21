import { afterEach, describe, expect, it, vi } from "vitest";

import { AutoScrollEngine } from "./auto-scroll.internal.ts";
import {
    createCollisionState,
    findDroppableAtPoint,
    isAncestorOrSelf,
    resolveCollision,
    updatePointerDirection,
    type RegisteredDroppable,
    type RegisteredItem,
} from "./collision.internal.ts";
import type { DndActiveItem, DndId } from "./dnd.types.ts";
import { arrayMove, arrayTransfer } from "./dnd-utils.ts";
import { ThumbnailManager } from "./thumbnail.internal.ts";
import { getRestingRect, WaapiFlipEngine } from "./waapi-flip.internal.ts";

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
    return {
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({ left, top, width, height, right: left + width, bottom: top + height }),
    } as DOMRect;
}

function mockElementRect(el: HTMLElement, rect: DOMRect): void {
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
}

interface MockAnimationHandle {
    animation: Animation;
    keyframes: Keyframe[];
    options: KeyframeAnimationOptions;
    setProgress: (value: number | null) => void;
    finish: () => void;
    cancelSpy: ReturnType<typeof vi.fn>;
}

function createMockAnimation(
    keyframes: Keyframe[],
    options: KeyframeAnimationOptions,
    initialProgress: number | null = 0,
): MockAnimationHandle {
    let progress = initialProgress;
    const listeners = new Map<string, Set<() => void>>();
    let resolveFinished!: () => void;
    const finished = new Promise<Animation>((resolve) => {
        resolveFinished = () => resolve(animation);
    });

    const dispatch = (type: string): void => {
        const set = listeners.get(type);
        if (!set) return;
        for (const fn of set) {
            fn();
        }
        listeners.delete(type);
    };

    const cancelSpy = vi.fn(() => {
        dispatch("cancel");
        resolveFinished();
    });

    const animation = {
        effect: {
            getComputedTiming: () => ({ progress }),
        },
        finished,
        cancel: cancelSpy,
        addEventListener: (type: string, cb: EventListenerOrEventListenerObject) => {
            const fn = typeof cb === "function" ? () => cb(new Event(type)) : () => cb.handleEvent(new Event(type));
            const set = listeners.get(type) ?? new Set<() => void>();
            set.add(fn);
            listeners.set(type, set);
        },
    } as unknown as Animation;

    return {
        animation,
        keyframes,
        options,
        setProgress: (value: number | null) => {
            progress = value;
        },
        finish: () => {
            progress = 1;
            dispatch("finish");
            resolveFinished();
        },
        cancelSpy,
    };
}

function stubMatchMedia(reducedMotion: boolean): void {
    vi.stubGlobal(
        "matchMedia",
        vi.fn((query: string) => ({
            matches: query.includes("prefers-reduced-motion") ? reducedMotion : false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    );
}

function makeRegisteredItem(
    overrides: Partial<RegisteredItem<unknown>> & { id: DndId; rect: DOMRect },
): RegisteredItem<unknown> {
    const el = overrides.element ?? document.createElement("div");
    mockElementRect(el, overrides.rect);
    return {
        id: overrides.id,
        element: el,
        type: overrides.type,
        data: overrides.data ?? null,
        containerId: overrides.containerId ?? null,
        index: overrides.index ?? null,
        parentId: overrides.parentId ?? null,
        depth: overrides.depth,
        canNest: overrides.canNest ?? false,
        expanded: overrides.expanded ?? false,
        axis: overrides.axis ?? "both",
        requiresHandle: overrides.requiresHandle,
        activation: overrides.activation,
        label: overrides.label ?? String(overrides.id),
        disabled: overrides.disabled ?? false,
    };
}

function makeRegisteredDroppable(
    overrides: Partial<RegisteredDroppable<unknown, unknown>> & { id: DndId; rect: DOMRect },
): RegisteredDroppable<unknown, unknown> {
    const el = overrides.element ?? document.createElement("div");
    mockElementRect(el, overrides.rect);
    return {
        id: overrides.id,
        element: el,
        layout: overrides.layout ?? "free",
        orientation: overrides.orientation ?? "vertical",
        data: overrides.data,
        accepts: overrides.accepts,
        animate: overrides.animate ?? true,
        indicator: overrides.indicator ?? overrides.layout === "tree",
        edgeZoneRatio: overrides.edgeZoneRatio ?? 0.25,
        expandDelay: overrides.expandDelay ?? 500,
        onExpandNode: overrides.onExpandNode,
        disabled: overrides.disabled ?? false,
    };
}

function makeActiveItem(overrides: Partial<DndActiveItem<unknown>> & { id: DndId }): DndActiveItem<unknown> {
    return {
        id: overrides.id,
        type: overrides.type,
        data: overrides.data ?? null,
        containerId: overrides.containerId ?? null,
        index: overrides.index ?? null,
        originContainerId: overrides.originContainerId ?? overrides.containerId ?? null,
        originIndex: overrides.originIndex ?? overrides.index ?? null,
        label: overrides.label ?? String(overrides.id),
    };
}

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
});

describe("dnd-utils: arrayMove & arrayTransfer", () => {
    it("arrayMove moves items immutably and handles same-index and out-of-bounds", () => {
        const original = ["a", "b", "c", "d"] as const;

        const movedForward = arrayMove(original, 0, 2);
        expect(movedForward).toEqual(["b", "c", "a", "d"]);
        expect(original).toEqual(["a", "b", "c", "d"]);
        expect(movedForward).not.toBe(original);

        const movedBackward = arrayMove(original, 3, 1);
        expect(movedBackward).toEqual(["a", "d", "b", "c"]);

        const sameIndex = arrayMove(original, 2, 2);
        expect(sameIndex).toEqual(["a", "b", "c", "d"]);
        expect(sameIndex).not.toBe(original);

        // Out-of-bounds fromIndex returns shallow copy without mutating
        expect(arrayMove(original, -1, 2)).toEqual(["a", "b", "c", "d"]);
        expect(arrayMove(original, 99, 0)).toEqual(["a", "b", "c", "d"]);
        expect(arrayMove([], 0, 0)).toEqual([]);

        // Out-of-bounds toIndex clamps to [0, length - 1]
        expect(arrayMove(original, 2, -10)).toEqual(["c", "a", "b", "d"]);
        expect(arrayMove(original, 0, 99)).toEqual(["b", "c", "d", "a"]);
    });

    it("arrayTransfer transfers immutably across arrays, empty target, and clamps indices", () => {
        const src = ["a", "b", "c"] as const;
        const dst = ["x", "y"] as const;

        const transferred = arrayTransfer(src, dst, 1, 1);
        expect(transferred).toEqual({ source: ["a", "c"], target: ["x", "b", "y"] });
        expect(src).toEqual(["a", "b", "c"]);
        expect(dst).toEqual(["x", "y"]);

        // Empty target
        const toEmpty = arrayTransfer(src, [], 2, 0);
        expect(toEmpty).toEqual({ source: ["a", "b"], target: ["c"] });

        // Clamping toIndex
        expect(arrayTransfer(src, dst, 0, -5)).toEqual({ source: ["b", "c"], target: ["a", "x", "y"] });
        expect(arrayTransfer(src, dst, 0, 99)).toEqual({ source: ["b", "c"], target: ["x", "y", "a"] });

        // Out-of-bounds fromIndex is a no-op returning fresh copies
        const noop = arrayTransfer(src, dst, -1, 0);
        expect(noop).toEqual({ source: ["a", "b", "c"], target: ["x", "y"] });
        expect(noop.source).not.toBe(src);
        expect(noop.target).not.toBe(dst);
        expect(arrayTransfer(src, dst, 3, 0)).toEqual({ source: ["a", "b", "c"], target: ["x", "y"] });
    });
});

describe("collision.internal", () => {
    it("1D vertical list: directional crossing and hysteresis deadzone prevent 1mm oscillation", () => {
        const list = makeRegisteredDroppable({ id: "list", layout: "list", rect: makeRect(0, 0, 200, 300) });
        const itemA = makeRegisteredItem({ id: "a", containerId: "list", index: 0, rect: makeRect(0, 0, 200, 60) });
        const itemB = makeRegisteredItem({ id: "b", containerId: "list", index: 1, rect: makeRect(0, 60, 200, 60) });
        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["a", itemA],
            ["b", itemB],
        ]);
        const active = makeActiveItem({ id: "a", containerId: "list", index: 0 });
        const state = createCollisionState();

        // Start moving downward toward itemB (midpoint = 90, hysteresis = 6 -> threshold = 96)
        updatePointerDirection(state, { x: 50, y: 30 });
        updatePointerDirection(state, { x: 50, y: 92 });
        expect(state.dirY).toBe(1);

        // Inside deadzone (92 < 96): must NOT swap
        const insideDeadzone = resolveCollision({
            pointer: { x: 50, y: 92 },
            active,
            activeElement: itemA.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(insideDeadzone.reorderToIndex).toBeNull();

        // Crosses threshold (96 >= 96): swaps forward to index 1
        updatePointerDirection(state, { x: 50, y: 97 });
        const crossed = resolveCollision({
            pointer: { x: 50, y: 97 },
            active,
            activeElement: itemA.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(crossed.reorderToIndex).toBe(1);

        // Moving backward (up) from index 1 across itemA (midpoint = 30, threshold = 24)
        const activeAt1 = makeActiveItem({ id: "b", containerId: "list", index: 1 });
        updatePointerDirection(state, { x: 50, y: 80 });
        updatePointerDirection(state, { x: 50, y: 26 });
        expect(state.dirY).toBe(-1);

        const backwardDeadzone = resolveCollision({
            pointer: { x: 50, y: 26 },
            active: activeAt1,
            activeElement: itemB.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(backwardDeadzone.reorderToIndex).toBeNull();

        updatePointerDirection(state, { x: 50, y: 23 });
        const crossedBackward = resolveCollision({
            pointer: { x: 50, y: 23 },
            active: activeAt1,
            activeElement: itemB.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(crossedBackward.reorderToIndex).toBe(0);
    });

    it("1D horizontal list: directional crossing along X axis", () => {
        const list = makeRegisteredDroppable({
            id: "tabs",
            layout: "list",
            orientation: "horizontal",
            rect: makeRect(0, 0, 300, 40),
        });
        const itemA = makeRegisteredItem({ id: "a", containerId: "tabs", index: 0, rect: makeRect(0, 0, 100, 40) });
        const itemB = makeRegisteredItem({ id: "b", containerId: "tabs", index: 1, rect: makeRect(100, 0, 100, 40) });
        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["a", itemA],
            ["b", itemB],
        ]);
        const active = makeActiveItem({ id: "a", containerId: "tabs", index: 0 });
        const state = createCollisionState();

        updatePointerDirection(state, { x: 40, y: 20 });
        updatePointerDirection(state, { x: 152, y: 20 }); // mid=150, threshold=156
        expect(
            resolveCollision({
                pointer: { x: 152, y: 20 },
                active,
                activeElement: itemA.element,
                droppables: [list],
                itemsById,
                state,
                hysteresisPx: 6,
            }).reorderToIndex,
        ).toBeNull();

        updatePointerDirection(state, { x: 158, y: 20 });
        expect(
            resolveCollision({
                pointer: { x: 158, y: 20 },
                active,
                activeElement: itemA.element,
                droppables: [list],
                itemsById,
                state,
                hysteresisPx: 6,
            }).reorderToIndex,
        ).toBe(1);
    });

    it("1D unequal-size post-swap guard blocks reverse oscillation using engine-produced nextSwapGuard until crossing boundary or exiting band", () => {
        const list = makeRegisteredDroppable({ id: "list", layout: "list", rect: makeRect(0, 0, 200, 300) });
        // Short active item (40px) swapping forward over tall neighbor (120px)
        const shortItem = makeRegisteredItem({ id: "short", containerId: "list", index: 0, rect: makeRect(0, 0, 200, 40) });
        const tallItem = makeRegisteredItem({ id: "tall", containerId: "list", index: 1, rect: makeRect(0, 40, 200, 120) });
        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["short", shortItem],
            ["tall", tallItem],
        ]);
        const active = makeActiveItem({ id: "short", containerId: "list", index: 0 });
        const state = createCollisionState();

        // Cross tallItem midpoint (40 + 60 = 100) + hysteresis 6 = 106
        updatePointerDirection(state, { x: 50, y: 20 });
        updatePointerDirection(state, { x: 50, y: 110 });
        const firstSwap = resolveCollision({
            pointer: { x: 50, y: 110 },
            active,
            activeElement: shortItem.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(firstSwap.reorderToIndex).toBe(1);
        expect(firstSwap.nextSwapGuard).toEqual({
            activeId: "short",
            targetId: "tall",
            direction: 1,
            axis: "y",
            boundary: 40,
            overlapStart: 0,
            overlapEnd: 120,
        });
        state.swapGuard = firstSwap.nextSwapGuard;

        // Post-swap DOM layout: tallItem now at [0..120], shortItem at [120..160]
        tallItem.index = 0;
        shortItem.index = 1;
        mockElementRect(tallItem.element, makeRect(0, 0, 200, 120));
        mockElementRect(shortItem.element, makeRect(0, 120, 200, 40));
        active.index = 1;

        // Upward jitter to y = 50 crosses tallItem post-swap mid(60) - 6 = 54,
        // but 50 > boundary(40) inside overlap [0..120] -> blocked by engine guard!
        updatePointerDirection(state, { x: 50, y: 50 });
        const blockedReverse = resolveCollision({
            pointer: { x: 50, y: 50 },
            active,
            activeElement: shortItem.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(blockedReverse.reorderToIndex).toBeNull();
        expect(state.swapGuard).not.toBeNull();

        // Crossing past smaller item's far boundary (38 <= 40) unlocks and clears guard
        updatePointerDirection(state, { x: 50, y: 38 });
        const unlockedReverse = resolveCollision({
            pointer: { x: 50, y: 38 },
            active,
            activeElement: shortItem.element,
            droppables: [list],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(unlockedReverse.reorderToIndex).toBe(0);
        expect(state.swapGuard).toBeNull();
    });

    it("2D grid unequal-size post-swap guard blocks reverse swap until crossing boundary or exiting band", () => {
        const grid = makeRegisteredDroppable({ id: "grid", layout: "grid", rect: makeRect(0, 0, 200, 200) });
        const shortTile = makeRegisteredItem({ id: "t0", containerId: "grid", index: 0, rect: makeRect(0, 0, 100, 40) });
        const tallTile = makeRegisteredItem({ id: "t1", containerId: "grid", index: 1, rect: makeRect(0, 40, 100, 120) });
        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["t0", shortTile],
            ["t1", tallTile],
        ]);
        const active = makeActiveItem({ id: "t0", containerId: "grid", index: 0 });
        const state = createCollisionState();

        // Enter core of tallTile -> forward swap to index 1 with engine-produced guard
        const firstSwap = resolveCollision({
            pointer: { x: 50, y: 100 },
            active,
            activeElement: shortTile.element,
            droppables: [grid],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(firstSwap.reorderToIndex).toBe(1);
        expect(firstSwap.nextSwapGuard).toEqual({
            activeId: "t0",
            targetId: "t1",
            direction: 1,
            axis: "y",
            boundary: 40,
            overlapStart: 0,
            overlapEnd: 120,
        });
        state.swapGuard = firstSwap.nextSwapGuard;

        // Post-swap layout: tallTile at [0..120], shortTile at [120..160]
        tallTile.index = 0;
        shortTile.index = 1;
        mockElementRect(tallTile.element, makeRect(0, 0, 100, 120));
        mockElementRect(shortTile.element, makeRect(0, 120, 100, 40));
        active.index = 1;

        // Still inside tallTile core at y = 60 (> boundary 40) -> blocked
        const blocked = resolveCollision({
            pointer: { x: 50, y: 60 },
            active,
            activeElement: shortTile.element,
            droppables: [grid],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(blocked.reorderToIndex).toBeNull();

        // Crossing past boundary (y = 35 <= 40, inside core) -> unlocks reverse swap
        const unlocked = resolveCollision({
            pointer: { x: 50, y: 35 },
            active,
            activeElement: shortTile.element,
            droppables: [grid],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(unlocked.reorderToIndex).toBe(0);
        expect(state.swapGuard).toBeNull();
    });

    it("2D grid collision respects core hysteresis inset and handles cross-container & empty grid", () => {
        const gridA = makeRegisteredDroppable({ id: "gridA", layout: "grid", rect: makeRect(0, 0, 220, 220) });
        const gridB = makeRegisteredDroppable({ id: "gridB", layout: "grid", rect: makeRect(250, 0, 220, 220) });
        const cell0 = makeRegisteredItem({ id: "c0", containerId: "gridA", index: 0, rect: makeRect(0, 0, 100, 100) });
        const cell1 = makeRegisteredItem({ id: "c1", containerId: "gridA", index: 1, rect: makeRect(110, 0, 100, 100) });
        const cell2 = makeRegisteredItem({ id: "c2", containerId: "gridA", index: 2, rect: makeRect(0, 110, 100, 100) });
        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["c0", cell0],
            ["c1", cell1],
            ["c2", cell2],
        ]);
        const active = makeActiveItem({ id: "c0", containerId: "gridA", index: 0 });
        const state = createCollisionState();

        // Hovering in outer 6px edge inset of cell1 (x=112, left=110) does NOT reorder
        const edgeHover = resolveCollision({
            pointer: { x: 112, y: 50 },
            active,
            activeElement: cell0.element,
            droppables: [gridA, gridB],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(edgeHover.reorderToIndex).toBeNull();

        // Hovering inside core of cell2 reorders to index 2
        const coreHover = resolveCollision({
            pointer: { x: 50, y: 150 },
            active,
            activeElement: cell0.element,
            droppables: [gridA, gridB],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(coreHover.reorderToIndex).toBe(2);

        // Hovering empty gridB resolves index: 0
        const emptyGrid = resolveCollision({
            pointer: { x: 300, y: 50 },
            active,
            activeElement: cell0.element,
            droppables: [gridA, gridB],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(emptyGrid.over?.containerId).toBe("gridB");
        expect(emptyGrid.reorderToIndex).toBe(0);
    });

    it("multi-container: empty container resolves index 0 and below-last-item appends at items.length", () => {
        const colA = makeRegisteredDroppable({ id: "colA", layout: "list", rect: makeRect(0, 0, 200, 300) });
        const colB = makeRegisteredDroppable({ id: "colB", layout: "list", rect: makeRect(220, 0, 200, 300) });
        const colEmpty = makeRegisteredDroppable({ id: "colEmpty", layout: "list", rect: makeRect(440, 0, 200, 300) });

        const a0 = makeRegisteredItem({ id: "a0", containerId: "colA", index: 0, rect: makeRect(0, 0, 200, 50) });
        const b0 = makeRegisteredItem({ id: "b0", containerId: "colB", index: 0, rect: makeRect(220, 0, 200, 50) });
        const b1 = makeRegisteredItem({ id: "b1", containerId: "colB", index: 1, rect: makeRect(220, 50, 200, 50) });
        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["a0", a0],
            ["b0", b0],
            ["b1", b1],
        ]);
        const active = makeActiveItem({ id: "a0", containerId: "colA", index: 0 });
        const state = createCollisionState();

        // Empty container drop -> index 0
        const emptyRes = resolveCollision({
            pointer: { x: 500, y: 100 },
            active,
            activeElement: a0.element,
            droppables: [colA, colB, colEmpty],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(emptyRes.over?.containerId).toBe("colEmpty");
        expect(emptyRes.over?.index).toBe(0);
        expect(emptyRes.reorderToIndex).toBe(0);

        // Below last item in colB (y=200 > b1 mid=75) -> append at index 2
        const appendRes = resolveCollision({
            pointer: { x: 300, y: 200 },
            active,
            activeElement: a0.element,
            droppables: [colA, colB, colEmpty],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(appendRes.over?.containerId).toBe("colB");
        expect(appendRes.over?.index).toBe(2);
        expect(appendRes.reorderToIndex).toBe(2);
    });

    it("tree collision: 3-zone before/inside/after, !canNest 50/50 split, ancestor-cycle & self-drop blocking", () => {
        const tree = makeRegisteredDroppable({
            id: "tree",
            layout: "tree",
            edgeZoneRatio: 0.25,
            rect: makeRect(0, 0, 250, 300),
        });
        const folder = makeRegisteredItem({
            id: "folder",
            containerId: "tree",
            index: 0,
            parentId: null,
            canNest: true,
            rect: makeRect(0, 0, 250, 40),
        });
        const child = makeRegisteredItem({
            id: "child",
            containerId: "tree",
            index: 1,
            parentId: "folder",
            canNest: true,
            rect: makeRect(0, 40, 250, 40),
        });
        const leaf = makeRegisteredItem({
            id: "leaf",
            containerId: "tree",
            index: 2,
            parentId: "child",
            canNest: false,
            rect: makeRect(0, 80, 250, 40),
        });
        const other = makeRegisteredItem({
            id: "other",
            containerId: "tree",
            index: 3,
            parentId: null,
            canNest: false,
            rect: makeRect(0, 120, 250, 40),
        });

        const itemsById = new Map<DndId, RegisteredItem<unknown>>([
            ["folder", folder],
            ["child", child],
            ["leaf", leaf],
            ["other", other],
        ]);
        const state = createCollisionState();

        // Ancestor-cycle helper
        expect(isAncestorOrSelf(itemsById, "folder", "folder")).toBe(true);
        expect(isAncestorOrSelf(itemsById, "leaf", "folder")).toBe(true);
        expect(isAncestorOrSelf(itemsById, "other", "folder")).toBe(false);

        // Dragging `other` over `folder` (canNest: true, height 40, edgeRatio 0.25 => <10 before, 10..30 inside, >30 after)
        const activeOther = makeActiveItem({ id: "other", containerId: "tree", index: 3 });

        const resBefore = resolveCollision({
            pointer: { x: 50, y: 5 },
            active: activeOther,
            activeElement: other.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(resBefore.over?.position).toBe("before");
        expect(resBefore.over?.isValid).toBe(true);
        expect(resBefore.reorderToIndex).toBeNull();

        const resInside = resolveCollision({
            pointer: { x: 50, y: 20 },
            active: activeOther,
            activeElement: other.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(resInside.over?.position).toBe("inside");
        expect(resInside.over?.isValid).toBe(true);

        const resAfter = resolveCollision({
            pointer: { x: 50, y: 35 },
            active: activeOther,
            activeElement: other.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(resAfter.over?.position).toBe("after");
        expect(resAfter.over?.isValid).toBe(true);

        // Dragging `other` over `leaf` (!canNest): clean 50/50 split (top=80, height=40, mid=100)
        const leafTopHalf = resolveCollision({
            pointer: { x: 50, y: 99 },
            active: activeOther,
            activeElement: other.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(leafTopHalf.over?.position).toBe("before");

        const leafBottomHalf = resolveCollision({
            pointer: { x: 50, y: 100 },
            active: activeOther,
            activeElement: other.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(leafBottomHalf.over?.position).toBe("after");

        // Dragging `folder` onto its own grandchild `leaf` -> ancestor-cycle blocked (isValid: false)
        const activeFolder = makeActiveItem({ id: "folder", containerId: "tree", index: 0 });
        const cycleRes = resolveCollision({
            pointer: { x: 50, y: 100 },
            active: activeFolder,
            activeElement: folder.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(cycleRes.over?.itemId).toBe("leaf");
        expect(cycleRes.over?.isValid).toBe(false);

        // Self-drop onto `folder` itself -> blocked (isValid: false)
        const selfRes = resolveCollision({
            pointer: { x: 50, y: 20 },
            active: activeFolder,
            activeElement: folder.element,
            droppables: [tree],
            itemsById,
            state,
            hysteresisPx: 6,
        });
        expect(selfRes.over?.itemId).toBe("folder");
        expect(selfRes.over?.isValid).toBe(false);
    });

    it("free dropzones prefer innermost nested droppable and validate accepts", () => {
        const outerEl = document.createElement("div");
        const innerEl = document.createElement("div");
        outerEl.append(innerEl);
        document.body.append(outerEl);

        const outer = makeRegisteredDroppable({
            id: "outer",
            element: outerEl,
            layout: "free",
            rect: makeRect(0, 0, 300, 300),
            accepts: ["card"],
        });
        const inner = makeRegisteredDroppable({
            id: "inner",
            element: innerEl,
            layout: "free",
            rect: makeRect(50, 50, 100, 100),
            accepts: ["badge"],
        });

        expect(findDroppableAtPoint([outer, inner], { x: 80, y: 80 })?.id).toBe("inner");
        expect(findDroppableAtPoint([inner, outer], { x: 80, y: 80 })?.id).toBe("inner");
        expect(findDroppableAtPoint([outer, inner], { x: 10, y: 10 })?.id).toBe("outer");

        const activeCard = makeActiveItem({ id: "c1", type: "card" });
        const state = createCollisionState();

        const overInner = resolveCollision({
            pointer: { x: 80, y: 80 },
            active: activeCard,
            activeElement: null,
            droppables: [outer, inner],
            itemsById: new Map(),
            state,
            hysteresisPx: 6,
        });
        expect(overInner.over?.droppableId).toBe("inner");
        expect(overInner.over?.isValid).toBe(false);

        const overOuter = resolveCollision({
            pointer: { x: 10, y: 10 },
            active: activeCard,
            activeElement: null,
            droppables: [outer, inner],
            itemsById: new Map(),
            state,
            hysteresisPx: 6,
        });
        expect(overOuter.over?.droppableId).toBe("outer");
        expect(overOuter.over?.isValid).toBe(true);
    });
});

describe("waapi-flip.internal", () => {
    it("WeakMap fast-path returns resting rect without getComputedStyle when idle", () => {
        const el = document.createElement("div");
        mockElementRect(el, makeRect(20, 40, 100, 50));
        const styleSpy = vi.spyOn(window, "getComputedStyle");

        const rect = getRestingRect(el);
        expect(rect.left).toBe(20);
        expect(rect.top).toBe(40);
        expect(styleSpy).not.toHaveBeenCalled();
    });

    it("subtracts remaining FLIP offset using getComputedTiming().progress and normalizes ancestor scale", () => {
        stubMatchMedia(false);
        const engine = new WaapiFlipEngine();
        const el = document.createElement("div");
        document.body.append(el);

        // Ancestor CSS scale = 2: offsetWidth = 50, rect.width = 100
        Object.defineProperties(el, {
            offsetWidth: { configurable: true, get: () => 50 },
            offsetHeight: { configurable: true, get: () => 25 },
        });

        let currentRect = makeRect(0, 0, 100, 50);
        vi.spyOn(el, "getBoundingClientRect").mockImplementation(() => currentRect);

        const handles: MockAnimationHandle[] = [];
        el.animate = vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) => {
            const handle = createMockAnimation(
                (keyframes as Keyframe[]) ?? [],
                (options as KeyframeAnimationOptions) ?? {},
                0.25,
            );
            handles.push(handle);
            return handle.animation;
        }) as unknown as typeof el.animate;

        const snapshots = engine.snapshot([el]);

        // Element moved in layout by +40px X, +80px Y in viewport pixels
        // Local delta = (-40 / 2, -80 / 2) = (-20, -40)
        currentRect = makeRect(40, 80, 100, 50);
        engine.play(snapshots, [el], { animate: true });

        expect(handles).toHaveLength(1);
        const first = handles[0];
        expect(first).toBeDefined();
        if (!first) return;
        expect(first.keyframes).toEqual([{ translate: "-20px -40px 0px" }, { translate: "0px 0px 0px" }]);
        expect(first.options.composite).toBe("add");
        expect(first.options.easing).toBe("cubic-bezier(0.25, 1, 0.5, 1)");

        // At progress = 0.25, remaining = 0.75:
        // Visual rect is shifted by remDx = -20 * 0.75 * 2 = -30, remDy = -40 * 0.75 * 2 = -60
        // So live visual rect is at (40 - 30, 80 - 60) = (10, 20)
        currentRect = makeRect(10, 20, 100, 50);
        const resting = getRestingRect(el);
        expect(resting.left).toBeCloseTo(40, 5);
        expect(resting.top).toBeCloseTo(80, 5);

        // Mid-flight interruption: snapshot captures live visual (10, 20), play cancels previous synchronously
        const midSnapshots = engine.snapshot([el]);
        currentRect = makeRect(100, 120, 100, 50);
        engine.play(midSnapshots, [el], { animate: true });

        expect(first.cancelSpy).toHaveBeenCalledTimes(1);
        expect(handles).toHaveLength(2);
        // Delta from visual (10, 20) to resting (100, 120) = (-90, -100) / scale(2) = (-45, -50)
        expect(handles[1]?.keyframes).toEqual([{ translate: "-45px -50px 0px" }, { translate: "0px 0px 0px" }]);

        // Finishing cleans up WeakMap
        handles[1]?.finish();
        currentRect = makeRect(100, 120, 100, 50);
        const afterFinish = getRestingRect(el);
        expect(afterFinish.left).toBe(100);
        expect(afterFinish.top).toBe(120);
    });

    it("compresses settle flight < 24px down to 120ms floor and bypasses under prefers-reduced-motion", async () => {
        stubMatchMedia(false);
        const engine = new WaapiFlipEngine();
        const thumb = document.createElement("div");
        document.body.append(thumb);

        const durations: number[] = [];
        thumb.animate = vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) => {
            const opts = (options as KeyframeAnimationOptions) ?? {};
            durations.push(Number(opts.duration));
            const handle = createMockAnimation((keyframes as Keyframe[]) ?? [], opts, 1);
            queueMicrotask(() => handle.finish());
            return handle.animation;
        }) as unknown as typeof thumb.animate;

        // 0px micro-drop -> 120ms floor
        await engine.animateFlight(thumb, {
            fromX: 100,
            fromY: 100,
            toX: 100,
            toY: 100,
            fromScale: 1.02,
            rotate: "0deg",
            kind: "settle",
            animate: true,
        });
        expect(durations[0]).toBe(120);

        // 12px half-threshold drop -> 120 + (200 - 120) * 0.5 = 160ms
        await engine.animateFlight(thumb, {
            fromX: 100,
            fromY: 100,
            toX: 112,
            toY: 100,
            fromScale: 1.02,
            rotate: "0deg",
            kind: "settle",
            animate: true,
        });
        expect(durations[1]).toBe(160);

        // 40px normal settle -> full 200ms
        await engine.animateFlight(thumb, {
            fromX: 100,
            fromY: 100,
            toX: 140,
            toY: 100,
            fromScale: 1.02,
            rotate: "0deg",
            kind: "settle",
            animate: true,
        });
        expect(durations[2]).toBe(200);

        // Reduced motion: 0ms bypass without calling animate()
        stubMatchMedia(true);
        const animateSpy = vi.fn();
        thumb.animate = animateSpy as unknown as typeof thumb.animate;

        await engine.animateFlight(thumb, {
            fromX: 10,
            fromY: 20,
            toX: 80.4,
            toY: 90.6,
            fromScale: 1.02,
            rotate: "0deg",
            kind: "settle",
            animate: true,
        });
        expect(animateSpy).not.toHaveBeenCalled();
        expect(thumb.style.transform).toBe("translate3d(80px, 91px, 0)");
        expect(thumb.style.scale).toBe("1");
        expect(thumb.style.rotate).toBe("0deg");
    });

    it("animatePickup animates only scale, rotate, and boxShadow (never transform) so pointermove translation stays unblocked", () => {
        stubMatchMedia(false);
        const engine = new WaapiFlipEngine();
        const thumb = document.createElement("div");
        document.body.append(thumb);

        let capturedKeyframes: Keyframe[] = [];
        let capturedOptions: KeyframeAnimationOptions = {};
        thumb.animate = vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) => {
            capturedKeyframes = (keyframes as Keyframe[]) ?? [];
            capturedOptions = (options as KeyframeAnimationOptions) ?? {};
            return createMockAnimation(capturedKeyframes, capturedOptions, 0).animation;
        }) as unknown as typeof thumb.animate;

        engine.animatePickup(thumb, { animate: true, scale: 1.02, rotate: "1.5deg" });

        expect(capturedKeyframes).toHaveLength(2);
        for (const frame of capturedKeyframes) {
            expect("transform" in frame).toBe(false);
            expect("translate" in frame).toBe(false);
            expect("scale" in frame).toBe(true);
            expect("rotate" in frame).toBe(true);
            expect("boxShadow" in frame).toBe(true);
        }
        expect(capturedKeyframes[0]?.scale).toBe("1");
        expect(capturedKeyframes[0]?.rotate).toBe("0deg");
        expect(capturedKeyframes[1]?.scale).toBe("1.02");
        expect(capturedKeyframes[1]?.rotate).toBe("1.5deg");
        expect(capturedOptions.duration).toBe(160);
    });

    it("animateFlight includes paddingInlineStart keyframes only when targetPaddingInlineStart differs from current", async () => {
        stubMatchMedia(false);
        const engine = new WaapiFlipEngine();
        const thumb = document.createElement("div");
        thumb.style.paddingInlineStart = "12px";
        document.body.append(thumb);

        const captured: Keyframe[][] = [];
        thumb.animate = vi.fn((keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) => {
            const frames = (keyframes as Keyframe[]) ?? [];
            captured.push(frames);
            const handle = createMockAnimation(frames, (options as KeyframeAnimationOptions) ?? {}, 1);
            queueMicrotask(() => handle.finish());
            return handle.animation;
        }) as unknown as typeof thumb.animate;

        // Different target padding (12px -> 36px): includes paddingInlineStart keyframes
        await engine.animateFlight(thumb, {
            fromX: 0,
            fromY: 0,
            toX: 40,
            toY: 0,
            fromScale: 1.02,
            rotate: "0deg",
            kind: "settle",
            animate: true,
            targetPaddingInlineStart: "36px",
        });

        expect(captured[0]?.[0]?.paddingInlineStart).toBe("12px");
        expect(captured[0]?.[1]?.paddingInlineStart).toBe("36px");

        // Matching target padding (12px -> 12px): omits paddingInlineStart keyframes
        await engine.animateFlight(thumb, {
            fromX: 0,
            fromY: 0,
            toX: 40,
            toY: 0,
            fromScale: 1.02,
            rotate: "0deg",
            kind: "settle",
            animate: true,
            targetPaddingInlineStart: "12px",
        });

        expect("paddingInlineStart" in (captured[1]?.[0] ?? {})).toBe(false);
        expect("paddingInlineStart" in (captured[1]?.[1] ?? {})).toBe(false);
    });
});

describe("auto-scroll.internal", () => {
    it("discovers overflow: auto scroll ancestor, applies quadratic speed curve, and enforces initialEdgeGuard", () => {
        const scrollBox = document.createElement("div");
        scrollBox.className = "cs-scroll-area-content";
        scrollBox.style.overflowY = "auto";
        const item = document.createElement("div");
        scrollBox.append(item);
        document.body.append(scrollBox);

        let scrollTop = 0;
        Object.defineProperties(scrollBox, {
            scrollHeight: { configurable: true, get: () => 1000 },
            clientHeight: { configurable: true, get: () => 200 },
            scrollWidth: { configurable: true, get: () => 200 },
            clientWidth: { configurable: true, get: () => 200 },
            scrollTop: {
                configurable: true,
                get: () => scrollTop,
                set: (v: number) => {
                    scrollTop = Math.max(0, Math.min(800, v));
                },
            },
        });
        mockElementRect(scrollBox, makeRect(0, 0, 200, 200));

        const rafQueue: FrameRequestCallback[] = [];
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });
        vi.stubGlobal("cancelAnimationFrame", vi.fn());

        let now = 1000;
        vi.spyOn(performance, "now").mockImplementation(() => now);

        const onScrollTick = vi.fn();
        const engine = new AutoScrollEngine();

        // Start inside bottom edge zone (bounds.bottom = 200, effEdgeY = 48 -> distBottom = 20 < 48)
        engine.start({ x: 50, y: 180 }, item, { edgeSize: 48, minSpeed: 60, maxSpeed: 900, initialEdgeGuard: true }, onScrollTick);

        const stepFrame = (deltaMs: number): void => {
            now += deltaMs;
            const cb = rafQueue.shift();
            cb?.(now);
        };

        // Guarded at initial position (distBottom = 20): must NOT scroll
        stepFrame(50);
        expect(scrollTop).toBe(0);
        expect(onScrollTick).not.toHaveBeenCalled();

        // Advance only 4px deeper (distBottom = 16, travel = 4 < 8): still locked
        engine.updatePointer({ x: 50, y: 184 });
        stepFrame(50);
        expect(scrollTop).toBe(0);

        // Advance >= 8px deeper (distBottom = 12, travel = 8): unlocks and scrolls!
        // penetration = 1 - 12/48 = 0.75 => speed = 60 + 840 * 0.5625 = 532.5 px/s
        // dt = 0.05s => delta = 532.5 * 0.05 = 26.625px
        engine.updatePointer({ x: 50, y: 188 });
        stepFrame(50);
        expect(scrollTop).toBeCloseTo(26.625, 3);
        expect(onScrollTick).toHaveBeenCalledTimes(1);

        // Flush at bottom edge (y = 200, distBottom = 0, p = 1.0 => speed = 900 px/s, dt = 0.05s => +45px)
        const beforeFlush = scrollTop;
        engine.updatePointer({ x: 50, y: 200 });
        stepFrame(50);
        expect(scrollTop - beforeFlush).toBeCloseTo(45, 3);

        // Also verify unlocking via exiting the edge zone completely then re-entering
        engine.stop();
        scrollTop = 0;
        rafQueue.length = 0;
        engine.start({ x: 50, y: 180 }, item, { edgeSize: 48, minSpeed: 60, maxSpeed: 900, initialEdgeGuard: true }, onScrollTick);
        // Move to center (y = 100) to exit edge zone and clear lock
        engine.updatePointer({ x: 50, y: 100 });
        stepFrame(50);
        expect(scrollTop).toBe(0);
        // Re-enter at y = 180 (same position that was previously locked): now scrolls immediately
        engine.updatePointer({ x: 50, y: 180 });
        stepFrame(50);
        expect(scrollTop).toBeGreaterThan(0);

        engine.stop();
    });
});

describe("thumbnail.internal", () => {
    it("auto-clone strips id/data-dragging/data-pending, locks integer box, and snaps translate3d", () => {
        const source = document.createElement("div");
        source.id = "card-1";
        source.dataset.dragging = "";
        source.dataset.pending = "";
        source.innerHTML = `<span id="child-1" data-dragging="" data-pending="">Hello</span>`;
        document.body.append(source);
        mockElementRect(source, makeRect(10.4, 20.6, 149.7, 42.3));

        const manager = new ThumbnailManager();
        const clone = manager.mountAutoClone(source, { x: 25.4, y: 30.6 });

        expect(clone.classList.contains("cs-dnd-thumbnail")).toBe(true);
        expect(clone.getAttribute("id")).toBeNull();
        expect("dragging" in clone.dataset).toBe(false);
        expect("pending" in clone.dataset).toBe(false);
        const child = clone.querySelector("span");
        expect(child?.getAttribute("id")).toBeNull();
        expect(child && "dragging" in child.dataset).toBe(false);
        expect(child && "pending" in child.dataset).toBe(false);

        expect(clone.style.width).toBe("150px");
        expect(clone.style.height).toBe("42px");
        expect(clone.style.transform).toContain("translate3d(10px, 21px, 0)");

        // Fractional pointer movement snaps to integers and respects axis lock
        manager.updatePosition({ x: 55.8, y: 80.2 }, "both");
        expect(clone.style.transform).toContain("translate3d(41px, 70px, 0)");

        manager.updatePosition({ x: 99.9, y: 120.4 }, "x");
        expect(clone.style.transform).toContain("translate3d(85px, 21px, 0)");

        manager.destroy();
    });

    it("wraps <tr> auto-clone in table/tbody shell, locks cell widths, and copies border & typography styles", () => {
        const table = document.createElement("table");
        table.style.borderCollapse = "separate";
        table.style.borderSpacing = "4px 6px";
        table.style.fontSize = "13px";
        table.style.textAlign = "right";
        table.style.color = "rgb(10, 20, 30)";
        const tbody = document.createElement("tbody");
        const row = document.createElement("tr");
        row.id = "row-1";
        row.dataset.dragging = "";
        const th = document.createElement("th");
        const td = document.createElement("td");
        th.textContent = "A";
        td.textContent = "B";
        row.append(th, td);
        tbody.append(row);
        table.append(tbody);
        document.body.append(table);

        mockElementRect(row, makeRect(0, 0, 300.2, 36.4));
        mockElementRect(th, makeRect(0, 0, 100.4, 36.4));
        mockElementRect(td, makeRect(100, 0, 199.6, 36.4));

        const manager = new ThumbnailManager();
        const shell = manager.mountAutoClone(row, { x: 10, y: 10 });

        expect(shell.tagName).toBe("TABLE");
        expect(shell.className).toBe("cs-dnd-thumbnail cs-dnd-thumbnail-table");
        expect(shell.style.tableLayout).toBe("fixed");
        expect(shell.style.width).toBe("300px");
        expect(shell.style.height).toBe("36px");
        expect(shell.style.borderCollapse).toBe("separate");
        expect(shell.style.borderSpacing).toBe("4px 6px");
        expect(shell.style.fontSize).toBe("13px");
        expect(shell.style.textAlign).toBe("right");
        expect(shell.style.color).toBe("rgb(10, 20, 30)");

        const clonedRow = shell.querySelector(":scope > tbody > tr");
        expect(clonedRow).not.toBeNull();
        expect(clonedRow?.getAttribute("id")).toBeNull();
        expect(clonedRow instanceof HTMLElement && "dragging" in clonedRow.dataset).toBe(false);

        const clonedTh = shell.querySelector("th");
        const clonedTd = shell.querySelector("td");
        expect(clonedTh?.style.width).toBe("100px");
        expect(clonedTh?.style.minWidth).toBe("100px");
        expect(clonedTh?.style.maxWidth).toBe("100px");
        expect(clonedTh?.style.boxSizing).toBe("border-box");
        expect(clonedTd?.style.width).toBe("200px");

        manager.destroy();
    });

    it("degrades gracefully when showPopover is unavailable", () => {
        const source = document.createElement("div");
        document.body.append(source);
        mockElementRect(source, makeRect(0, 0, 100, 40));

        // Ensure showPopover is undefined on created host
        const origDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover");
        Object.defineProperty(HTMLElement.prototype, "showPopover", {
            configurable: true,
            value: undefined,
        });

        try {
            const manager = new ThumbnailManager();
            const clone = manager.mountAutoClone(source, { x: 10, y: 10 });
            const host = document.querySelector<HTMLDivElement>(".cs-dnd-thumbnail-host");
            expect(host).not.toBeNull();
            expect(host?.getAttribute("popover")).toBe("manual");
            expect(host?.contains(clone)).toBe(true);
            manager.destroy();
        } finally {
            if (origDesc) {
                Object.defineProperty(HTMLElement.prototype, "showPopover", origDesc);
            } else {
                delete (HTMLElement.prototype as { showPopover?: unknown }).showPopover;
            }
        }
    });
});
