import { type Component, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    arrayMove,
    arrayTransfer,
    createDnd,
    dragHandle,
    getDndContext,
    setDndContext,
    type DndController,
    type DndDragCancelEvent,
    type DndDragEndEvent,
    type DndDragOverEvent,
    type DndDragStartEvent,
    type DndDropEvent,
    type DndReorderEvent,
} from "./index.ts";

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

function mockRect(el: HTMLElement, rect: DOMRect): void {
    vi.spyOn(el, "getBoundingClientRect").mockReturnValue(rect);
}

function dispatchPointer(
    target: EventTarget,
    type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    coords: { x: number; y: number; button?: number; pointerId?: number; pointerType?: string },
): PointerEvent {
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: coords.x,
        clientY: coords.y,
        button: coords.button ?? 0,
        pointerId: coords.pointerId ?? 1,
        pointerType: coords.pointerType ?? "mouse",
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key,
    });
    target.dispatchEvent(event);
    return event;
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
}

function getRequired<K, V>(map: Map<K, V>, key: K): V {
    const value = map.get(key);
    if (value === undefined) {
        throw new Error(`Missing map entry for key "${String(key)}"`);
    }
    return value;
}

describe("dnd Svelte 5 controller, attachments & DOM lifecycle", () => {
    let root: HTMLDivElement;

    beforeEach(() => {
        root = document.createElement("div");
        document.body.append(root);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        delete document.documentElement.dataset.dndActive;
        document.body.replaceChildren();
    });

    it("drives full FSM (idle -> pending -> dragging -> settling -> idle), keeping dnd.active populated through settling and html[data-dnd-active] strictly pointer-dragging only", async () => {
        let resolveFlight!: () => void;
        const flightPromise = new Promise<Animation>((resolve) => {
            resolveFlight = () => resolve({} as Animation);
        });

        // Stub Element.prototype.animate so settle flight pauses in "settling" until we resolve it
        let flightStarted = false;
        const animateSpy = vi.fn((_keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: KeyframeAnimationOptions | number) => {
            const opts = typeof options === "object" && options !== null ? options : {};
            const isSettle = opts.fill === "forwards";
            if (isSettle) {
                flightStarted = true;
            }
            return {
                effect: { getComputedTiming: () => ({ progress: 0 }) },
                finished: isSettle ? flightPromise : Promise.resolve({} as Animation),
                cancel: vi.fn(),
                addEventListener: vi.fn(),
            } as unknown as Animation;
        });
        vi.spyOn(HTMLElement.prototype, "animate").mockImplementation(
            animateSpy as unknown as typeof HTMLElement.prototype.animate,
        );

        const onDragStart = vi.fn<(e: DndDragStartEvent<{ name: string }>) => void>();
        const onDrop = vi.fn<(e: DndDropEvent<{ name: string }, { zone: string }>) => void>();
        const onDragEnd = vi.fn<(e: DndDragEndEvent<{ name: string }, { zone: string }>) => void>();

        const zoneEl = document.createElement("div");
        const itemEl = document.createElement("div");
        itemEl.textContent = "Card A";
        root.append(zoneEl, itemEl);
        mockRect(itemEl, makeRect(10, 10, 100, 40));
        mockRect(zoneEl, makeRect(200, 0, 200, 200));

        const dnd = createDnd<{ name: string }, { zone: string }>({
            onDragStart,
            onDrop,
            onDragEnd,
        });

        const cleanZone = dnd.droppable({ id: "z1", layout: "free", data: { zone: "inbox" } })(zoneEl);
        const cleanItem = dnd.draggable({ id: "card-a", data: { name: "Card A" } })(itemEl);

        // Initial idle state
        expect(dnd.status).toBe("idle");
        expect(dnd.isDragging).toBe(false);
        expect(dnd.isSettling).toBe(false);
        expect(dnd.active).toBeNull();
        expect(dnd.over).toBeNull();
        expect(dnd.pointer).toBeNull();
        expect(dnd.inputMethod).toBeNull();
        expect("dndActive" in document.documentElement.dataset).toBe(false);

        // pointerdown -> pending
        dispatchPointer(itemEl, "pointerdown", { x: 20, y: 20 });
        expect(dnd.status).toBe("pending");
        expect(dnd.active).toBeNull();
        expect("dndActive" in document.documentElement.dataset).toBe(false);
        expect("pending" in itemEl.dataset).toBe(false); // delay === 0 must NOT emit data-pending
        expect(onDragStart).not.toHaveBeenCalled();

        // pointermove >= 6px -> dragging
        dispatchPointer(window, "pointermove", { x: 30, y: 20 });
        expect(dnd.status).toBe("dragging");
        expect(dnd.isDragging).toBe(true);
        expect(dnd.inputMethod).toBe("pointer");
        expect(dnd.active?.id).toBe("card-a");
        expect(dnd.isDraggingItem("card-a")).toBe(true);
        expect(itemEl.dataset.dragging).toBe("");
        expect(document.documentElement.dataset.dndActive).toBe("");
        expect(onDragStart).toHaveBeenCalledTimes(1);

        // Move over free dropzone
        dispatchPointer(window, "pointermove", { x: 250, y: 50 });
        expect(dnd.isOver("z1")).toBe(true);

        // pointerup -> settling (stays settling while WAAPI flight is pending)
        dispatchPointer(window, "pointerup", { x: 250, y: 50 });
        await flushMicrotasks();

        expect(flightStarted).toBe(true);
        expect(dnd.status).toBe("settling");
        expect(dnd.isSettling).toBe(true);
        expect(dnd.isDragging).toBe(false);
        // dnd.active stays populated through settling so `{#if dnd.active}` thumbnails stay mounted
        expect(dnd.active?.id).toBe("card-a");
        expect(dnd.isDraggingItem("card-a")).toBe(true);
        // Global cursor lock must already be cleared during settling
        expect("dndActive" in document.documentElement.dataset).toBe(false);
        const thumb = document.querySelector<HTMLElement>(".cs-dnd-thumbnail");
        expect(thumb?.dataset.status).toBe("settling");
        expect(onDrop).toHaveBeenCalledTimes(1);
        expect(onDragEnd).not.toHaveBeenCalled();

        // Finish settle animation -> idle
        resolveFlight();
        await flushMicrotasks();

        expect(dnd.status).toBe("idle");
        expect(dnd.isSettling).toBe(false);
        expect(dnd.active).toBeNull();
        expect(dnd.isDraggingItem("card-a")).toBe(false);
        expect("dragging" in itemEl.dataset).toBe(false);
        expect(onDragEnd).toHaveBeenCalledTimes(1);
        expect(onDragEnd.mock.calls[0]?.[0].dropped).toBe(true);

        cleanItem?.();
        cleanZone?.();
        dnd.destroy();
    });

    it("enforces distance threshold, delay + tolerance + data-pending, interactive-element guard, dragHandle, and post-drag click suppression", async () => {
        vi.useFakeTimers();

        const onDragStart = vi.fn();
        const onDrop = vi.fn();
        const onDragEnd = vi.fn();
        const dnd = createDnd({
            animate: false,
            activation: { distance: 6 },
            onDragStart,
            onDrop,
            onDragEnd,
        });

        // 1. Micro-movement (< 6px) does NOT start drag
        const card = document.createElement("div");
        const innerBtn = document.createElement("button");
        const innerInput = document.createElement("input");
        const innerLink = document.createElement("a");
        innerLink.href = "#test";
        const noDragZone = document.createElement("span");
        noDragZone.dataset.dndNoDrag = "";
        card.append(innerBtn, innerInput, innerLink, noDragZone);
        root.append(card);
        mockRect(card, makeRect(0, 0, 150, 50));

        const cleanCard = dnd.draggable({ id: "c1" })(card);

        dispatchPointer(card, "pointerdown", { x: 10, y: 10 });
        expect(dnd.status).toBe("pending");
        dispatchPointer(window, "pointermove", { x: 14, y: 12 }); // hypot(4, 2) ≈ 4.47 < 6
        expect(dnd.status).toBe("pending");
        dispatchPointer(window, "pointerup", { x: 14, y: 12 });
        expect(dnd.status).toBe("idle");
        expect(onDragStart).not.toHaveBeenCalled();

        // 2. Interactive-element guard blocks button, input, a[href], and [data-dnd-no-drag]
        for (const el of [innerBtn, innerInput, innerLink, noDragZone]) {
            dispatchPointer(el, "pointerdown", { x: 10, y: 10 });
            expect(dnd.status).toBe("idle");
        }

        // 3. Delay + tolerance + [data-pending]
        const delayedCard = document.createElement("div");
        root.append(delayedCard);
        mockRect(delayedCard, makeRect(0, 60, 150, 50));
        const cleanDelayed = dnd.draggable({
            id: "c-delay",
            activation: { delay: 180, tolerance: 6 },
        })(delayedCard);

        // Drift > tolerance aborts pending and clears data-pending
        dispatchPointer(delayedCard, "pointerdown", { x: 20, y: 80 });
        expect(dnd.status).toBe("pending");
        expect(delayedCard.dataset.pending).toBe("");
        dispatchPointer(window, "pointermove", { x: 28, y: 80 }); // 8px > 6px
        expect(dnd.status).toBe("idle");
        expect("pending" in delayedCard.dataset).toBe(false);
        vi.advanceTimersByTime(200);
        expect(dnd.status).toBe("idle");

        // Hold within tolerance for delay ms -> dragging
        dispatchPointer(delayedCard, "pointerdown", { x: 20, y: 80 });
        expect(delayedCard.dataset.pending).toBe("");
        dispatchPointer(window, "pointermove", { x: 23, y: 82 }); // ~3.6px <= 6px
        vi.advanceTimersByTime(180);
        expect(dnd.status).toBe("dragging");
        expect("pending" in delayedCard.dataset).toBe(false);
        expect(dnd.active?.id).toBe("c-delay");

        // Cancel drag and verify post-drag one-shot click suppression
        const cardClickSpy = vi.fn();
        delayedCard.addEventListener("click", cardClickSpy);
        dispatchPointer(window, "pointerup", { x: 23, y: 82 });
        await flushMicrotasks();

        const suppressedClick = new MouseEvent("click", { bubbles: true, cancelable: true });
        delayedCard.dispatchEvent(suppressedClick);
        expect(suppressedClick.defaultPrevented).toBe(true);
        expect(cardClickSpy).not.toHaveBeenCalled();

        // After setTimeout(0) cleanup, subsequent clicks work normally
        vi.advanceTimersByTime(1);
        const normalClick = new MouseEvent("click", { bubbles: true, cancelable: true });
        delayedCard.dispatchEvent(normalClick);
        expect(normalClick.defaultPrevented).toBe(false);
        expect(cardClickSpy).toHaveBeenCalledTimes(1);

        // 4. Explicit dragHandle auto-detection (handle button initiates drag; body does not)
        const handleRow = document.createElement("div");
        const gripBtn = document.createElement("button");
        gripBtn.type = "button";
        handleRow.append(gripBtn);
        root.append(handleRow);
        mockRect(handleRow, makeRect(0, 120, 150, 40));

        const cleanGrip = dragHandle()(gripBtn);
        const cleanRow = dnd.draggable({ id: "c-handle" })(handleRow);
        expect(gripBtn.dataset.dndHandle).toBe("");

        // Clicking body of row is ignored because enabled handle exists
        dispatchPointer(handleRow, "pointerdown", { x: 100, y: 130 });
        expect(dnd.status).toBe("idle");

        // Clicking handle <button> initiates drag despite being a <button>
        dispatchPointer(gripBtn, "pointerdown", { x: 10, y: 130 });
        expect(dnd.status).toBe("pending");
        dispatchPointer(window, "pointermove", { x: 20, y: 130 });
        expect(dnd.status).toBe("dragging");
        expect(dnd.active?.id).toBe("c-handle");

        dnd.cancel();
        await flushMicrotasks();

        cleanRow?.();
        cleanGrip?.();
        cleanDelayed?.();
        cleanCard?.();
        dnd.destroy();
    });

    it("free dropzone mode: data-over, data-drop-valid/invalid, accepts, isOver(), onDrop, and never fires onReorder", async () => {
        const onDragOver = vi.fn<(e: DndDragOverEvent<unknown, unknown>) => void>();
        const onReorder = vi.fn();
        const onDrop = vi.fn<(e: DndDropEvent<unknown, unknown>) => void>();
        const onDragCancel = vi.fn<(e: DndDragCancelEvent<unknown>) => void>();
        const onDragEnd = vi.fn<(e: DndDragEndEvent<unknown, unknown>) => void>();

        const dnd = createDnd({
            animate: false,
            onDragOver,
            onReorder,
            onDrop,
            onDragCancel,
            onDragEnd,
        });

        const itemEl = document.createElement("div");
        const validZone = document.createElement("div");
        const invalidZone = document.createElement("div");
        root.append(itemEl, validZone, invalidZone);
        mockRect(itemEl, makeRect(0, 0, 80, 40));
        mockRect(validZone, makeRect(100, 0, 120, 120));
        mockRect(invalidZone, makeRect(250, 0, 120, 120));

        const cleanItem = dnd.draggable({ id: "f1", type: "file", data: { size: 42 } })(itemEl);
        const cleanValid = dnd.droppable({ id: "bucket", layout: "free", accepts: ["file"], data: { kind: "ok" } })(validZone);
        const cleanInvalid = dnd.droppable({ id: "trash", layout: "free", accepts: ["image"] })(invalidZone);

        expect(validZone.dataset.layout).toBe("free");

        // Start drag and move over valid zone
        dispatchPointer(itemEl, "pointerdown", { x: 20, y: 20 });
        dispatchPointer(window, "pointermove", { x: 150, y: 50 });

        expect(dnd.isOver("bucket")).toBe(true);
        expect(validZone.dataset.over).toBe("");
        expect(validZone.dataset.dropValid).toBe("");
        expect("dropInvalid" in validZone.dataset).toBe(false);
        const overCallsAfterFirst = onDragOver.mock.calls.length;

        // Moving inside same valid zone does NOT spam onDragOver
        dispatchPointer(window, "pointermove", { x: 160, y: 60 });
        expect(onDragOver).toHaveBeenCalledTimes(overCallsAfterFirst);

        // Move over invalid zone
        dispatchPointer(window, "pointermove", { x: 300, y: 50 });
        expect(dnd.isOver("trash")).toBe(true);
        expect("over" in validZone.dataset).toBe(false);
        expect(invalidZone.dataset.over).toBe("");
        expect(invalidZone.dataset.dropInvalid).toBe("");
        expect("dropValid" in invalidZone.dataset).toBe(false);

        // Dropping on invalid zone triggers invalid-drop cancel
        dispatchPointer(window, "pointerup", { x: 300, y: 50 });
        await flushMicrotasks();

        expect(onDrop).not.toHaveBeenCalled();
        expect(onDragCancel).toHaveBeenCalledTimes(1);
        expect(onDragCancel.mock.calls[0]?.[0].reason).toBe("invalid-drop");
        expect(onDragEnd).toHaveBeenCalledWith(expect.objectContaining({ dropped: false, cancelReason: "invalid-drop" }));

        // Second drag: drop on valid zone
        dispatchPointer(itemEl, "pointerdown", { x: 20, y: 20 });
        dispatchPointer(window, "pointermove", { x: 150, y: 50 });
        dispatchPointer(window, "pointerup", { x: 150, y: 50 });
        await flushMicrotasks();

        expect(onDrop).toHaveBeenCalledTimes(1);
        expect(onDrop.mock.calls[0]?.[0]).toMatchObject({
            droppableId: "bucket",
            droppableData: { kind: "ok" },
            didMove: true,
        });
        expect(onReorder).not.toHaveBeenCalled();

        cleanItem?.();
        cleanValid?.();
        cleanInvalid?.();
        dnd.destroy();
    });

    it("1D list mode: live onReorder updates $state and final onDrop reports didMove", async () => {
        const initialItems = [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
        ];
        const listState = $state({ items: [...initialItems] });

        const reorders: DndReorderEvent<{ id: string; label: string }>[] = [];
        const drops: DndDropEvent<{ id: string; label: string }, unknown>[] = [];

        const dnd = createDnd<{ id: string; label: string }>({
            animate: false,
            onReorder: (e) => {
                reorders.push(e);
                listState.items = arrayMove(listState.items, e.fromIndex, e.toIndex);
            },
            onDrop: (e) => {
                drops.push(e);
            },
        });

        const listEl = document.createElement("ul");
        root.append(listEl);
        mockRect(listEl, makeRect(0, 0, 200, 180));

        const rowEls = new Map<string, HTMLLIElement>();
        for (const item of initialItems) {
            const li = document.createElement("li");
            li.textContent = item.label;
            listEl.append(li);
            rowEls.set(item.id, li);
        }

        const updateRowRects = (): void => {
            for (const [idx, item] of listState.items.entries()) {
                const el = getRequired(rowEls, item.id);
                mockRect(el, makeRect(0, idx * 60, 200, 60));
            }
        };
        updateRowRects();

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.droppable({ id: "list", layout: "list" })(listEl));
            $effect(() => {
                const cleanups: Array<(() => void) | void> = [];
                updateRowRects();
                for (const [idx, item] of listState.items.entries()) {
                    const el = getRequired(rowEls, item.id);
                    cleanups.push(dnd.sortable({ id: item.id, containerId: "list", index: idx, data: item })(el));
                }
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        const elA = getRequired(rowEls, "a");
        dispatchPointer(elA, "pointerdown", { x: 50, y: 20 });
        // Move down past item B midpoint (90) + hysteresis (6) = 96
        dispatchPointer(window, "pointermove", { x: 50, y: 100 });
        flushSync();

        expect(reorders).toHaveLength(1);
        expect(reorders[0]).toMatchObject({
            fromContainerId: "list",
            toContainerId: "list",
            fromIndex: 0,
            toIndex: 1,
        });
        expect(listState.items.map((i) => i.id)).toEqual(["b", "a", "c"]);
        // Active element must keep data-dragging across Svelte re-attachment
        expect(elA.dataset.dragging).toBe("");

        dispatchPointer(window, "pointerup", { x: 50, y: 100 });
        await flushMicrotasks();

        expect(drops).toHaveLength(1);
        expect(drops[0]).toMatchObject({
            originContainerId: "list",
            originIndex: 0,
            targetContainerId: "list",
            targetIndex: 1,
            didMove: true,
        });

        stopRoot();
        dnd.destroy();
    });

    it("multi-container Kanban mode: cross-container onReorder + empty-container drop", async () => {
        const board = $state<{
            todo: Array<{ id: string; label: string }>;
            done: Array<{ id: string; label: string }>;
        }>({
            todo: [{ id: "t1", label: "Task 1" }],
            done: [],
        });

        const reorders: DndReorderEvent<{ id: string; label: string }>[] = [];
        const drops: DndDropEvent<{ id: string; label: string }, unknown>[] = [];

        const dnd = createDnd<{ id: string; label: string }>({
            animate: false,
            onReorder: (e) => {
                reorders.push(e);
                if (e.fromContainerId === "todo" && e.toContainerId === "done") {
                    const res = arrayTransfer(board.todo, board.done, e.fromIndex, e.toIndex);
                    board.todo = res.source;
                    board.done = res.target;
                }
            },
            onDrop: (e) => {
                drops.push(e);
            },
        });

        const todoEl = document.createElement("div");
        const doneEl = document.createElement("div");
        const t1El = document.createElement("div");
        todoEl.append(t1El);
        root.append(todoEl, doneEl);

        mockRect(todoEl, makeRect(0, 0, 200, 300));
        mockRect(doneEl, makeRect(220, 0, 200, 300));
        mockRect(t1El, makeRect(0, 0, 200, 50));

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.droppable({ id: "todo", layout: "list" })(todoEl));
            $effect(() => dnd.droppable({ id: "done", layout: "list" })(doneEl));
            $effect(() => {
                const cleanups = [
                    ...board.todo.map((item, idx) =>
                        dnd.sortable({ id: item.id, containerId: "todo", index: idx, data: item })(t1El),
                    ),
                    ...board.done.map((item, idx) =>
                        dnd.sortable({ id: item.id, containerId: "done", index: idx, data: item })(t1El),
                    ),
                ];
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        dispatchPointer(t1El, "pointerdown", { x: 50, y: 25 });
        dispatchPointer(window, "pointermove", { x: 280, y: 60 });
        flushSync();

        expect(reorders).toHaveLength(1);
        expect(reorders[0]).toMatchObject({
            fromContainerId: "todo",
            toContainerId: "done",
            fromIndex: 0,
            toIndex: 0,
        });
        expect(board.todo).toEqual([]);
        expect(board.done.map((i) => i.id)).toEqual(["t1"]);

        dispatchPointer(window, "pointerup", { x: 280, y: 60 });
        await flushMicrotasks();

        expect(drops).toHaveLength(1);
        expect(drops[0]).toMatchObject({
            originContainerId: "todo",
            originIndex: 0,
            targetContainerId: "done",
            targetIndex: 0,
            didMove: true,
        });

        stopRoot();
        dnd.destroy();
    });

    it("tree mode: data-drop-position before/inside/after, cycle prevention, expandDelay -> onExpandNode, onDrop without onReorder", async () => {
        vi.useFakeTimers();

        const onReorder = vi.fn();
        const onDrop = vi.fn<(e: DndDropEvent<unknown, unknown>) => void>();
        const onDragCancel = vi.fn<(e: DndDragCancelEvent<unknown>) => void>();
        const onExpandNode = vi.fn();

        const dnd = createDnd({
            animate: false,
            onReorder,
            onDrop,
            onDragCancel,
        });

        const treeEl = document.createElement("div");
        const folderEl = document.createElement("div");
        const childEl = document.createElement("div");
        const itemEl = document.createElement("div");
        treeEl.append(folderEl, childEl, itemEl);
        root.append(treeEl);

        mockRect(treeEl, makeRect(0, 0, 240, 200));
        mockRect(folderEl, makeRect(0, 0, 240, 40));
        mockRect(childEl, makeRect(0, 40, 240, 40));
        mockRect(itemEl, makeRect(0, 80, 240, 40));

        const cleanTree = dnd.droppable({
            id: "tree",
            layout: "tree",
            edgeZoneRatio: 0.25,
            expandDelay: 300,
            onExpandNode,
        })(treeEl);
        const cleanFolder = dnd.sortable({
            id: "folder",
            containerId: "tree",
            index: 0,
            parentId: null,
            canNest: true,
            expanded: false,
        })(folderEl);
        const cleanChild = dnd.sortable({
            id: "child",
            containerId: "tree",
            index: 1,
            parentId: "folder",
            canNest: false,
        })(childEl);
        const cleanItem = dnd.sortable({
            id: "item",
            containerId: "tree",
            index: 2,
            parentId: null,
            canNest: false,
        })(itemEl);

        // Drag `item` over `folder`: before -> inside (triggers expandDelay) -> after
        dispatchPointer(itemEl, "pointerdown", { x: 50, y: 100 });
        dispatchPointer(window, "pointermove", { x: 50, y: 5 }); // top 25% of folder -> before
        expect(folderEl.dataset.dropPosition).toBe("before");

        dispatchPointer(window, "pointermove", { x: 50, y: 20 }); // middle 50% of folder -> inside
        expect(folderEl.dataset.dropPosition).toBe("inside");

        vi.advanceTimersByTime(300);
        expect(onExpandNode).toHaveBeenCalledTimes(1);
        expect(onExpandNode).toHaveBeenCalledWith("folder");

        dispatchPointer(window, "pointermove", { x: 50, y: 36 }); // bottom 25% of folder -> after
        expect(folderEl.dataset.dropPosition).toBe("after");

        // Drop on `folder` at "after"
        dispatchPointer(window, "pointerup", { x: 50, y: 36 });
        await flushMicrotasks();

        expect(onReorder).not.toHaveBeenCalled();
        expect(onDrop).toHaveBeenCalledTimes(1);
        expect(onDrop.mock.calls[0]?.[0]).toMatchObject({
            droppableId: "tree",
            targetItemId: "folder",
            position: "after",
            didMove: true,
        });

        // Cycle prevention: dragging `folder` onto its own `child` marks invalid and blocks drop
        dispatchPointer(folderEl, "pointerdown", { x: 50, y: 20 });
        dispatchPointer(window, "pointermove", { x: 50, y: 60 });
        expect(treeEl.dataset.dropInvalid).toBe("");
        expect("dropPosition" in childEl.dataset).toBe(false);

        dispatchPointer(window, "pointerup", { x: 50, y: 60 });
        await flushMicrotasks();

        expect(onDragCancel).toHaveBeenCalledTimes(1);
        expect(onDragCancel.mock.calls[0]?.[0].reason).toBe("invalid-drop");
        expect(onReorder).not.toHaveBeenCalled();

        cleanItem?.();
        cleanChild?.();
        cleanFolder?.();
        cleanTree?.();
        dnd.destroy();
    });

    it("cancel paths (Escape, pointercancel, dnd.cancel()) fire onDragCancel + onDragEnd", async () => {
        const cancels: DndDragCancelEvent<unknown>[] = [];
        const ends: DndDragEndEvent<unknown, unknown>[] = [];
        const dnd = createDnd({
            animate: false,
            onDragCancel: (e) => {
                cancels.push(e);
            },
            onDragEnd: (e) => {
                ends.push(e);
            },
        });

        const itemEl = document.createElement("div");
        root.append(itemEl);
        mockRect(itemEl, makeRect(0, 0, 100, 40));
        const clean = dnd.draggable({ id: "x" })(itemEl);

        // Escape
        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        dispatchPointer(window, "pointermove", { x: 30, y: 10 });
        dispatchKey(window, "Escape");
        await flushMicrotasks();
        expect(cancels.at(-1)?.reason).toBe("escape");
        expect(ends.at(-1)).toMatchObject({ dropped: false, cancelReason: "escape" });

        // pointercancel
        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        dispatchPointer(window, "pointermove", { x: 30, y: 10 });
        dispatchPointer(window, "pointercancel", { x: 30, y: 10 });
        await flushMicrotasks();
        expect(cancels.at(-1)?.reason).toBe("pointer-cancel");
        expect(ends.at(-1)).toMatchObject({ dropped: false, cancelReason: "pointer-cancel" });

        // programmatic dnd.cancel()
        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        dispatchPointer(window, "pointermove", { x: 30, y: 10 });
        dnd.cancel();
        await flushMicrotasks();
        expect(cancels.at(-1)?.reason).toBe("programmatic");
        expect(ends.at(-1)).toMatchObject({ dropped: false, cancelReason: "programmatic" });

        // dnd.cancel() during pending aborts silently to idle
        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        expect(dnd.status).toBe("pending");
        dnd.cancel();
        expect(dnd.status).toBe("idle");
        expect(cancels).toHaveLength(3);

        clean?.();
        dnd.destroy();
    });

    it("keyboard DnD: Space/Enter pick up & drop, Arrow keys reorder, Escape cancel, aria-live updates, and no html[data-dnd-active]", async () => {
        const initialLabels = ["Alpha", "Beta", "Gamma"];
        const kbState = $state({ items: [...initialLabels] });
        const onDrop = vi.fn();
        const onDragCancel = vi.fn();

        const dnd = createDnd({
            animate: false,
            onReorder: ({ fromIndex, toIndex }) => {
                kbState.items = arrayMove(kbState.items, fromIndex, toIndex);
            },
            onDrop,
            onDragCancel,
        });

        const listEl = document.createElement("ul");
        root.append(listEl);
        const els = new Map<string, HTMLLIElement>();
        for (const label of initialLabels) {
            const li = document.createElement("li");
            li.textContent = label;
            listEl.append(li);
            els.set(label, li);
        }

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.droppable({ id: "klist", layout: "list" })(listEl));
            $effect(() => {
                const cleanups: Array<(() => void) | void> = [];
                for (const [idx, label] of kbState.items.entries()) {
                    const el = getRequired(els, label);
                    cleanups.push(dnd.sortable({ id: label, containerId: "klist", index: idx, label })(el));
                }
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        const alphaEl = getRequired(els, "Alpha");
        expect(alphaEl.getAttribute("tabindex")).toBe("0");
        expect(alphaEl.getAttribute("aria-roledescription")).toBeTruthy();
        expect(alphaEl.getAttribute("aria-describedby")).toBeTruthy();

        alphaEl.focus();
        // Space picks up
        dispatchKey(alphaEl, " ");
        await flushMicrotasks();

        expect(dnd.status).toBe("dragging");
        expect(dnd.inputMethod).toBe("keyboard");
        expect(dnd.active?.id).toBe("Alpha");
        // html[data-dnd-active] MUST be absent during keyboard drag
        expect("dndActive" in document.documentElement.dataset).toBe(false);

        const announcer = document.querySelector<HTMLDivElement>('.cs-dnd-announcer[aria-live="assertive"]');
        expect(announcer?.textContent).toContain("Alpha");

        // ArrowDown moves Alpha from index 0 -> 1
        dispatchKey(alphaEl, "ArrowDown");
        flushSync();
        await flushMicrotasks();

        expect(kbState.items).toEqual(["Beta", "Alpha", "Gamma"]);
        expect(announcer?.textContent).toContain("2");

        // Enter drops
        dispatchKey(alphaEl, "Enter");
        await flushMicrotasks();

        expect(dnd.status).toBe("idle");
        expect(onDrop).toHaveBeenCalledTimes(1);
        expect(onDrop.mock.calls[0]?.[0]).toMatchObject({ originIndex: 0, targetIndex: 1, didMove: true });

        // Pick up again and Escape cancels + restores focus
        dispatchKey(alphaEl, " ");
        expect(dnd.status).toBe("dragging");
        dispatchKey(alphaEl, "Escape");
        await flushMicrotasks();

        expect(dnd.status).toBe("idle");
        expect(onDragCancel).toHaveBeenCalledTimes(1);
        expect(onDragCancel.mock.calls[0]?.[0].reason).toBe("escape");
        expect(document.activeElement).toBe(alphaEl);

        stopRoot();
        dnd.destroy();
    });

    it("supports custom dnd.dragThumbnail() attachment lifecycle and reactive enabled getter toggling", async () => {
        const dnd = createDnd({ animate: false });

        let isEnabled = $state(true);
        const itemEl = document.createElement("div");
        const zoneEl = document.createElement("div");
        const handleEl = document.createElement("button");
        const customThumbParent = document.createElement("div");
        const customThumbEl = document.createElement("div");
        customThumbEl.textContent = "Custom Ghost";
        customThumbParent.append(customThumbEl);
        itemEl.append(handleEl);
        root.append(itemEl, zoneEl, customThumbParent);

        mockRect(itemEl, makeRect(10, 10, 120, 40));
        mockRect(zoneEl, makeRect(200, 0, 120, 120));
        mockRect(customThumbEl, makeRect(0, 0, 100, 32));

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.dragHandle({ enabled: () => isEnabled })(handleEl));
            $effect(() => dnd.draggable({ id: "custom-item", enabled: () => isEnabled })(itemEl));
            $effect(() => dnd.droppable({ id: "custom-zone", layout: "free", enabled: () => isEnabled })(zoneEl));
            $effect(() => {
                if (dnd.active) {
                    return dnd.dragThumbnail({ align: "cursor" })(customThumbEl);
                }
                return;
            });
        });
        flushSync();

        expect(handleEl.dataset.dndHandle).toBe("");
        expect("disabled" in itemEl.dataset).toBe(false);
        expect("disabled" in zoneEl.dataset).toBe(false);

        // Start drag -> custom thumbnail promotes into Top-Layer host
        dispatchPointer(handleEl, "pointerdown", { x: 20, y: 20 });
        dispatchPointer(window, "pointermove", { x: 40, y: 20 });
        flushSync();

        const host = document.querySelector<HTMLDivElement>(".cs-dnd-thumbnail-host");
        expect(host?.contains(customThumbEl)).toBe(true);
        expect(customThumbEl.classList.contains("cs-dnd-thumbnail")).toBe(true);
        expect(customThumbEl.dataset.status).toBe("dragging");

        // End drag -> custom thumbnail restores cleanly to original parent
        dispatchPointer(window, "pointerup", { x: 250, y: 50 });
        await flushMicrotasks();
        flushSync();

        expect(customThumbParent.contains(customThumbEl)).toBe(true);
        expect(customThumbEl.classList.contains("cs-dnd-thumbnail")).toBe(false);
        expect("status" in customThumbEl.dataset).toBe(false);

        // Toggle enabled -> false: sets data-disabled, removes data-dnd-handle, blocks drag
        isEnabled = false;
        flushSync();

        expect("dndHandle" in handleEl.dataset).toBe(false);
        expect(itemEl.dataset.disabled).toBe("");
        expect(zoneEl.dataset.disabled).toBe("");

        dispatchPointer(handleEl, "pointerdown", { x: 20, y: 20 });
        expect(dnd.status).toBe("idle");

        // Toggle enabled -> true: restores full dragging
        isEnabled = true;
        flushSync();

        expect(handleEl.dataset.dndHandle).toBe("");
        expect("disabled" in itemEl.dataset).toBe(false);
        expect("disabled" in zoneEl.dataset).toBe(false);

        dispatchPointer(handleEl, "pointerdown", { x: 20, y: 20 });
        dispatchPointer(window, "pointermove", { x: 40, y: 20 });
        expect(dnd.status).toBe("dragging");

        // destroy() cleans up active drag, host, and announcer
        dnd.destroy();
        expect(dnd.status).toBe("idle");
        expect("dndActive" in document.documentElement.dataset).toBe(false);
        expect(document.querySelector(".cs-dnd-thumbnail-host")).toBeNull();
        expect(document.querySelector(".cs-dnd-announcer")).toBeNull();

        stopRoot();
    });

    it("supports A -> B -> A live reorder round-trip and cancel-after-live-reorder with distinct origin vs current indices", async () => {
        const initialItems = [
            { id: "a", label: "A" },
            { id: "b", label: "B" },
            { id: "c", label: "C" },
        ];
        const listState = $state({ items: [...initialItems] });
        const drops: DndDropEvent<{ id: string; label: string }, unknown>[] = [];
        const cancels: DndDragCancelEvent<{ id: string; label: string }>[] = [];

        const dnd = createDnd<{ id: string; label: string }>({
            animate: false,
            onReorder: (e) => {
                listState.items = arrayMove(listState.items, e.fromIndex, e.toIndex);
            },
            onDrop: (e) => {
                drops.push(e);
            },
            onDragCancel: (e) => {
                cancels.push(e);
                if (e.originIndex !== null && e.currentIndex !== null) {
                    listState.items = arrayMove(listState.items, e.currentIndex, e.originIndex);
                }
            },
        });

        const listEl = document.createElement("ul");
        root.append(listEl);
        mockRect(listEl, makeRect(0, 0, 200, 180));

        const rowEls = new Map<string, HTMLLIElement>();
        for (const item of initialItems) {
            const li = document.createElement("li");
            li.textContent = item.label;
            listEl.append(li);
            rowEls.set(item.id, li);
        }

        const updateRowRects = (): void => {
            for (const [idx, item] of listState.items.entries()) {
                mockRect(getRequired(rowEls, item.id), makeRect(0, idx * 60, 200, 60));
            }
        };
        updateRowRects();

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.droppable({ id: "list", layout: "list" })(listEl));
            $effect(() => {
                updateRowRects();
                const cleanups = listState.items.map((item, idx) =>
                    dnd.sortable({ id: item.id, containerId: "list", index: idx, data: item })(getRequired(rowEls, item.id)),
                );
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        const elA = getRequired(rowEls, "a");

        // A -> B -> A round-trip: move index 0 -> 1, then back 1 -> 0, and drop
        dispatchPointer(elA, "pointerdown", { x: 50, y: 20 });
        dispatchPointer(window, "pointermove", { x: 50, y: 100 }); // swaps to index 1: [b, a, c]
        flushSync();
        expect(listState.items.map((i) => i.id)).toEqual(["b", "a", "c"]);

        dispatchPointer(window, "pointermove", { x: 50, y: 20 }); // swaps back to index 0: [a, b, c]
        flushSync();
        expect(listState.items.map((i) => i.id)).toEqual(["a", "b", "c"]);

        dispatchPointer(window, "pointerup", { x: 50, y: 20 });
        await flushMicrotasks();

        expect(drops).toHaveLength(1);
        expect(drops[0]).toMatchObject({
            originContainerId: "list",
            originIndex: 0,
            targetContainerId: "list",
            targetIndex: 0,
            didMove: false,
        });

        // Cancel-after-live-reorder: move index 0 -> 1, then press Escape
        dispatchPointer(elA, "pointerdown", { x: 50, y: 20 });
        dispatchPointer(window, "pointermove", { x: 50, y: 100 }); // index 0 -> 1
        flushSync();
        expect(listState.items.map((i) => i.id)).toEqual(["b", "a", "c"]);

        dispatchKey(window, "Escape");
        await flushMicrotasks();
        flushSync();

        expect(cancels).toHaveLength(1);
        expect(cancels[0]).toMatchObject({
            originContainerId: "list",
            originIndex: 0,
            currentContainerId: "list",
            currentIndex: 1,
            reason: "escape",
        });
        expect(listState.items.map((i) => i.id)).toEqual(["a", "b", "c"]);

        stopRoot();
        dnd.destroy();
    });

    it("keyboard DnD fires onDragStart before onDragOver and supports Kanban, 2D grid, tree, and free dropzones", async () => {
        // 1. Lifecycle order (onDragStart BEFORE onDragOver) + multi-container Kanban ArrowRight/ArrowLeft
        const callOrder: string[] = [];
        const board = $state({
            colA: ["k1"],
            colB: [] as string[],
        });

        const kanbanDnd = createDnd({
            animate: false,
            onDragStart: () => {
                callOrder.push("start");
            },
            onDragOver: () => {
                callOrder.push("over");
            },
            onReorder: ({ fromContainerId, toContainerId, fromIndex, toIndex }) => {
                if (fromContainerId === "colA" && toContainerId === "colB") {
                    const res = arrayTransfer(board.colA, board.colB, fromIndex, toIndex);
                    board.colA = res.source;
                    board.colB = res.target;
                } else if (fromContainerId === "colB" && toContainerId === "colA") {
                    const res = arrayTransfer(board.colB, board.colA, fromIndex, toIndex);
                    board.colB = res.source;
                    board.colA = res.target;
                }
            },
        });

        const colAEl = document.createElement("div");
        const colBEl = document.createElement("div");
        const k1El = document.createElement("div");
        colAEl.append(k1El);
        root.append(colAEl, colBEl);

        const stopKanban = $effect.root(() => {
            $effect(() => kanbanDnd.droppable({ id: "colA", layout: "list" })(colAEl));
            $effect(() => kanbanDnd.droppable({ id: "colB", layout: "list" })(colBEl));
            $effect(() => {
                const cleanups = [
                    ...board.colA.map((id, idx) => kanbanDnd.sortable({ id, containerId: "colA", index: idx })(k1El)),
                    ...board.colB.map((id, idx) => kanbanDnd.sortable({ id, containerId: "colB", index: idx })(k1El)),
                ];
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        dispatchKey(k1El, " ");
        expect(callOrder.slice(0, 2)).toEqual(["start", "over"]);

        // ArrowRight jumps from colA -> colB
        dispatchKey(k1El, "ArrowRight");
        flushSync();
        expect(board.colA).toEqual([]);
        expect(board.colB).toEqual(["k1"]);

        // ArrowLeft jumps back from colB -> colA
        dispatchKey(k1El, "ArrowLeft");
        flushSync();
        expect(board.colA).toEqual(["k1"]);
        expect(board.colB).toEqual([]);

        dispatchKey(k1El, " ");
        await flushMicrotasks();
        stopKanban();
        kanbanDnd.destroy();

        // 2. 2D Grid ArrowDown / ArrowUp spatial row jump
        const gridState = $state({ tiles: ["g0", "g1", "g2", "g3"] });
        const gridDnd = createDnd({
            animate: false,
            onReorder: ({ fromIndex, toIndex }) => {
                gridState.tiles = arrayMove(gridState.tiles, fromIndex, toIndex);
            },
        });

        const gridEl = document.createElement("div");
        root.append(gridEl);
        const tileEls = new Map<string, HTMLDivElement>();
        for (const id of ["g0", "g1", "g2", "g3"]) {
            const el = document.createElement("div");
            gridEl.append(el);
            tileEls.set(id, el);
        }
        const updateGridRects = (): void => {
            for (const [idx, id] of gridState.tiles.entries()) {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                mockRect(getRequired(tileEls, id), makeRect(col * 100, row * 100, 90, 90));
            }
        };
        updateGridRects();

        const stopGrid = $effect.root(() => {
            $effect(() => gridDnd.droppable({ id: "grid", layout: "grid" })(gridEl));
            $effect(() => {
                updateGridRects();
                const cleanups = gridState.tiles.map((id, idx) =>
                    gridDnd.sortable({ id, containerId: "grid", index: idx })(getRequired(tileEls, id)),
                );
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        const g0El = getRequired(tileEls, "g0");
        dispatchKey(g0El, " ");
        // ArrowDown from row 0 col 0 (index 0) jumps to row 1 col 0 (index 2)
        dispatchKey(g0El, "ArrowDown");
        flushSync();
        expect(gridState.tiles).toEqual(["g1", "g2", "g0", "g3"]);

        // ArrowUp from row 1 col 0 (index 2) jumps back to row 0 col 0 (index 0)
        dispatchKey(g0El, "ArrowUp");
        flushSync();
        expect(gridState.tiles).toEqual(["g0", "g1", "g2", "g3"]);

        dispatchKey(g0El, " ");
        await flushMicrotasks();
        stopGrid();
        gridDnd.destroy();

        // 3. Tree keyboard navigation: before/inside/after, ArrowRight expand/nest, descendant skipping
        const onExpandNode = vi.fn();
        const treeDrops: DndDropEvent<unknown, unknown>[] = [];
        const treeDnd = createDnd({
            animate: false,
            onDrop: (e) => {
                treeDrops.push(e);
            },
        });

        const treeEl = document.createElement("div");
        const folderAEl = document.createElement("div");
        const childAEl = document.createElement("div");
        const folderBEl = document.createElement("div");
        treeEl.append(folderAEl, childAEl, folderBEl);
        root.append(treeEl);

        const cleanTree = treeDnd.droppable({ id: "tree", layout: "tree", onExpandNode })(treeEl);
        const cleanFolderA = treeDnd.sortable({
            id: "folderA",
            containerId: "tree",
            index: 0,
            parentId: null,
            canNest: true,
        })(folderAEl);
        const cleanChildA = treeDnd.sortable({
            id: "childA",
            containerId: "tree",
            index: 1,
            parentId: "folderA",
            canNest: false,
        })(childAEl);
        const cleanFolderB = treeDnd.sortable({
            id: "folderB",
            containerId: "tree",
            index: 2,
            parentId: null,
            canNest: true,
            expanded: false,
        })(folderBEl);

        // Pick up `folderA`: descendant `childA` MUST be skipped, leaving only `folderB` slots
        dispatchKey(folderAEl, " ");
        dispatchKey(folderAEl, "ArrowDown");
        expect(treeDnd.over?.itemId).toBe("folderB");
        expect(treeDnd.over?.position).toBe("before");

        // ArrowRight on collapsed canNest `folderB` calls onExpandNode and targets "inside"
        dispatchKey(folderAEl, "ArrowRight");
        expect(onExpandNode).toHaveBeenCalledWith("folderB");
        expect(treeDnd.over?.itemId).toBe("folderB");
        expect(treeDnd.over?.position).toBe("inside");

        // ArrowDown advances to "after"
        dispatchKey(folderAEl, "ArrowDown");
        expect(treeDnd.over?.position).toBe("after");

        dispatchKey(folderAEl, " ");
        await flushMicrotasks();
        expect(treeDrops[0]).toMatchObject({ targetItemId: "folderB", position: "after", didMove: true });

        cleanFolderB?.();
        cleanChildA?.();
        cleanFolderA?.();
        cleanTree?.();
        treeDnd.destroy();

        // 4. Free dropzones: Arrow key cycling + accepts validation
        const freeDnd = createDnd({ animate: false });
        const freeItemEl = document.createElement("div");
        const zValidEl = document.createElement("div");
        const zInvalidEl = document.createElement("div");
        root.append(freeItemEl, zValidEl, zInvalidEl);

        const cleanFreeItem = freeDnd.draggable({ id: "fi", type: "doc" })(freeItemEl);
        const cleanZValid = freeDnd.droppable({ id: "zValid", layout: "free", accepts: ["doc"] })(zValidEl);
        const cleanZInvalid = freeDnd.droppable({ id: "zInvalid", layout: "free", accepts: ["img"] })(zInvalidEl);

        dispatchKey(freeItemEl, " ");
        dispatchKey(freeItemEl, "ArrowDown");
        expect(freeDnd.over).toMatchObject({ droppableId: "zValid", isValid: true });

        dispatchKey(freeItemEl, "ArrowDown");
        expect(freeDnd.over).toMatchObject({ droppableId: "zInvalid", isValid: false });

        dispatchKey(freeItemEl, "Escape");
        await flushMicrotasks();

        cleanZInvalid?.();
        cleanZValid?.();
        cleanFreeItem?.();
        freeDnd.destroy();
    });

    it("cancels active drag on window blur and document visibilitychange (hidden)", async () => {
        const cancels: DndDragCancelEvent<unknown>[] = [];
        const dnd = createDnd({
            animate: false,
            onDragCancel: (e) => {
                cancels.push(e);
            },
        });

        const itemEl = document.createElement("div");
        root.append(itemEl);
        mockRect(itemEl, makeRect(0, 0, 100, 40));
        const clean = dnd.draggable({ id: "b1" })(itemEl);

        // Window blur during active drag
        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        dispatchPointer(window, "pointermove", { x: 30, y: 10 });
        expect(dnd.status).toBe("dragging");

        window.dispatchEvent(new Event("blur"));
        await flushMicrotasks();
        expect(dnd.status).toBe("idle");
        expect(cancels).toHaveLength(1);
        expect(cancels[0]?.reason).toBe("pointer-cancel");

        // Document visibilitychange to hidden during active drag
        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        dispatchPointer(window, "pointermove", { x: 30, y: 10 });
        expect(dnd.status).toBe("dragging");

        const origVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
        Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
        try {
            document.dispatchEvent(new Event("visibilitychange"));
            await flushMicrotasks();
            expect(dnd.status).toBe("idle");
            expect(cancels).toHaveLength(2);
            expect(cancels[1]?.reason).toBe("pointer-cancel");
        } finally {
            if (origVisibility) {
                Object.defineProperty(document, "visibilityState", origVisibility);
            } else {
                delete (document as { visibilityState?: DocumentVisibilityState }).visibilityState;
            }
        }

        clean?.();
        dnd.destroy();
    });

    it("destroy() called mid-settling cleans up without firing post-destroy onDragEnd", async () => {
        let resolveFlight!: () => void;
        const flightPromise = new Promise<Animation>((resolve) => {
            resolveFlight = () => resolve({} as Animation);
        });

        vi.spyOn(HTMLElement.prototype, "animate").mockImplementation(
            ((_keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: KeyframeAnimationOptions | number) => {
                const opts = typeof options === "object" && options !== null ? options : {};
                return {
                    effect: { getComputedTiming: () => ({ progress: 0 }) },
                    finished: opts.fill === "forwards" ? flightPromise : Promise.resolve({} as Animation),
                    cancel: vi.fn(),
                    addEventListener: vi.fn(),
                } as unknown as Animation;
            }) as unknown as typeof HTMLElement.prototype.animate,
        );

        const onDragEnd = vi.fn();
        const dnd = createDnd({ onDragEnd });

        const zoneEl = document.createElement("div");
        const itemEl = document.createElement("div");
        root.append(zoneEl, itemEl);
        mockRect(itemEl, makeRect(0, 0, 100, 40));
        mockRect(zoneEl, makeRect(150, 0, 150, 150));

        const cleanZone = dnd.droppable({ id: "z", layout: "free" })(zoneEl);
        const cleanItem = dnd.draggable({ id: "i" })(itemEl);

        dispatchPointer(itemEl, "pointerdown", { x: 10, y: 10 });
        dispatchPointer(window, "pointermove", { x: 200, y: 50 });
        dispatchPointer(window, "pointerup", { x: 200, y: 50 });
        await flushMicrotasks();

        expect(dnd.status).toBe("settling");
        expect(onDragEnd).not.toHaveBeenCalled();

        // Destroy mid-settling, then resolve the pending WAAPI flight
        dnd.destroy();
        expect(dnd.status).toBe("idle");
        expect(document.querySelector(".cs-dnd-thumbnail-host")).toBeNull();

        resolveFlight();
        await flushMicrotasks();

        expect(onDragEnd).not.toHaveBeenCalled();
        expect(dnd.status).toBe("idle");

        cleanItem?.();
        cleanZone?.();
    });

    it("setDndContext / getDndContext round-trips controller instance and emits/cleans data-dnd-item & data-dnd-droppable", () => {
        const dnd = createDnd<{ label: string }>();
        let received: DndController<{ label: string }> | null = null;

        const ContextHarness = (() => {
            setDndContext(dnd);
            received = getDndContext<{ label: string }>();
        }) as unknown as Component;

        const instance = mount(ContextHarness, { target: root });
        expect(received).toBe(dnd);
        unmount(instance);

        const dropEl = document.createElement("div");
        const itemEl = document.createElement("div");
        root.append(dropEl, itemEl);

        const cleanDrop = dnd.droppable({ id: "d1", layout: "free" })(dropEl);
        const cleanItem = dnd.draggable({ id: "i1" })(itemEl);

        expect(dropEl.dataset.dndDroppable).toBe("");
        expect(itemEl.dataset.dndItem).toBe("");

        cleanItem?.();
        cleanDrop?.();

        expect("dndDroppable" in dropEl.dataset).toBe(false);
        expect("dndItem" in itemEl.dataset).toBe(false);

        dnd.destroy();
    });

    it("custom dragThumbnail never unmounts, re-appends, or re-animates on subsequent pointermove events", async () => {
        const dnd = createDnd({ animate: true });
        const itemEl = document.createElement("div");
        const customThumbParent = document.createElement("div");
        const customThumbEl = document.createElement("div");
        customThumbParent.append(customThumbEl);
        root.append(itemEl, customThumbParent);

        mockRect(itemEl, makeRect(10, 10, 120, 40));
        mockRect(customThumbEl, makeRect(0, 0, 100, 32));

        const animateSpy = vi.fn(
            () =>
                ({
                    effect: { getComputedTiming: () => ({ progress: 1 }) },
                    finished: Promise.resolve({} as Animation),
                    cancel: vi.fn(),
                    addEventListener: vi.fn(),
                }) as unknown as Animation,
        );
        customThumbEl.animate = animateSpy as unknown as typeof customThumbEl.animate;

        let attachRuns = 0;
        const stopRoot = $effect.root(() => {
            $effect(() => dnd.draggable({ id: "t-item" })(itemEl));
            $effect(() => {
                if (dnd.active) {
                    attachRuns += 1;
                    return dnd.dragThumbnail({ align: "cursor" })(customThumbEl);
                }
                return;
            });
        });
        flushSync();

        dispatchPointer(itemEl, "pointerdown", { x: 20, y: 20 });
        dispatchPointer(window, "pointermove", { x: 35, y: 20 });
        flushSync();

        const host = document.querySelector<HTMLDivElement>(".cs-dnd-thumbnail-host");
        expect(host).not.toBeNull();
        expect(host?.contains(customThumbEl)).toBe(true);
        expect(attachRuns).toBe(1);

        const appendSpy = vi.spyOn(host as HTMLDivElement, "append");
        const removeSpy = vi.spyOn(customThumbEl, "remove");
        const animateCallsBeforeMoves = animateSpy.mock.calls.length;

        // Dispatch multiple pointermove events: must NOT re-run attachment, re-append, or re-animate
        for (let step = 1; step <= 5; step++) {
            dispatchPointer(window, "pointermove", { x: 35 + step * 15, y: 20 + step * 5 });
            flushSync();
        }

        expect(attachRuns).toBe(1);
        expect(appendSpy).not.toHaveBeenCalled();
        expect(removeSpy).not.toHaveBeenCalled();
        expect(animateSpy).toHaveBeenCalledTimes(animateCallsBeforeMoves);
        expect(host?.contains(customThumbEl)).toBe(true);

        dnd.cancel();
        await flushMicrotasks();
        stopRoot();
        dnd.destroy();
    });

    it("axis-projected collision keeps horizontal axis='x' tab reordering working even when clientY leaves the tab bar", async () => {
        const tabsState = $state({ tabs: ["tab-0", "tab-1", "tab-2"] });
        const drops: DndDropEvent<unknown, unknown>[] = [];

        const dnd = createDnd({
            animate: false,
            onReorder: ({ fromIndex, toIndex }) => {
                tabsState.tabs = arrayMove(tabsState.tabs, fromIndex, toIndex);
            },
            onDrop: (e) => {
                drops.push(e);
            },
        });

        const barEl = document.createElement("div");
        root.append(barEl);
        mockRect(barEl, makeRect(0, 0, 300, 40));

        const tabEls = new Map<string, HTMLDivElement>();
        for (const id of ["tab-0", "tab-1", "tab-2"]) {
            const el = document.createElement("div");
            barEl.append(el);
            tabEls.set(id, el);
        }

        const updateTabRects = (): void => {
            for (const [idx, id] of tabsState.tabs.entries()) {
                mockRect(getRequired(tabEls, id), makeRect(idx * 100, 0, 100, 40));
            }
        };
        updateTabRects();

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.droppable({ id: "tabs", layout: "list", orientation: "horizontal" })(barEl));
            $effect(() => {
                updateTabRects();
                const cleanups = tabsState.tabs.map((id, idx) =>
                    dnd.sortable({ id, containerId: "tabs", index: idx, axis: "x" })(getRequired(tabEls, id)),
                );
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        const tab0El = getRequired(tabEls, "tab-0");
        dispatchPointer(tab0El, "pointerdown", { x: 30, y: 20 });
        // Move horizontally past tab-1 midpoint (150) + hysteresis (6) = 156, while clientY = 400 is far below bar bottom (40)!
        dispatchPointer(window, "pointermove", { x: 180, y: 400 });
        flushSync();

        expect(tabsState.tabs).toEqual(["tab-1", "tab-0", "tab-2"]);

        dispatchPointer(window, "pointerup", { x: 180, y: 400 });
        await flushMicrotasks();

        expect(drops).toHaveLength(1);
        expect(drops[0]).toMatchObject({
            droppableId: "tabs",
            originIndex: 0,
            targetIndex: 1,
            didMove: true,
        });

        stopRoot();
        dnd.destroy();
    });

    it("tree sets depth-aware --cs-dnd-target-depth for expanded vs collapsed folders and cleans up on leave", async () => {
        const dnd = createDnd({ animate: false });

        const treeEl = document.createElement("div");
        const expandedFolderEl = document.createElement("div");
        const collapsedFolderEl = document.createElement("div");
        const fileEl = document.createElement("div");
        const draggedEl = document.createElement("div");
        treeEl.append(expandedFolderEl, collapsedFolderEl, fileEl, draggedEl);
        root.append(treeEl);

        mockRect(treeEl, makeRect(0, 0, 240, 200));
        mockRect(expandedFolderEl, makeRect(0, 0, 240, 40));
        mockRect(collapsedFolderEl, makeRect(0, 40, 240, 40));
        mockRect(fileEl, makeRect(0, 80, 240, 40));
        mockRect(draggedEl, makeRect(0, 120, 240, 40));

        const cleanTree = dnd.droppable({ id: "tree", layout: "tree", edgeZoneRatio: 0.25 })(treeEl);
        const cleanExp = dnd.sortable({
            id: "exp",
            containerId: "tree",
            index: 0,
            depth: 0,
            canNest: true,
            expanded: true,
        })(expandedFolderEl);
        const cleanCol = dnd.sortable({
            id: "col",
            containerId: "tree",
            index: 1,
            depth: 0,
            canNest: true,
            expanded: false,
        })(collapsedFolderEl);
        const cleanFile = dnd.sortable({
            id: "file",
            containerId: "tree",
            index: 2,
            depth: 1,
            canNest: false,
        })(fileEl);
        const cleanDrag = dnd.sortable({
            id: "drag",
            containerId: "tree",
            index: 3,
            depth: 0,
            canNest: false,
        })(draggedEl);

        dispatchPointer(draggedEl, "pointerdown", { x: 50, y: 140 });

        // Hover `after` on expanded folder (depth 0, expanded: true) -> depth + 1 = "1"
        dispatchPointer(window, "pointermove", { x: 50, y: 36 });
        expect(expandedFolderEl.dataset.dropPosition).toBe("after");
        expect(expandedFolderEl.style.getPropertyValue("--cs-dnd-target-depth")).toBe("1");

        // Hover `after` on collapsed folder (depth 0, expanded: false) -> depth = "0"
        dispatchPointer(window, "pointermove", { x: 50, y: 76 });
        expect(expandedFolderEl.style.getPropertyValue("--cs-dnd-target-depth")).toBe("");
        expect(collapsedFolderEl.dataset.dropPosition).toBe("after");
        expect(collapsedFolderEl.style.getPropertyValue("--cs-dnd-target-depth")).toBe("0");

        // Hover `after` on file (depth 1, canNest: false) -> depth = "1"
        dispatchPointer(window, "pointermove", { x: 50, y: 116 });
        expect(collapsedFolderEl.style.getPropertyValue("--cs-dnd-target-depth")).toBe("");
        expect(fileEl.dataset.dropPosition).toBe("after");
        expect(fileEl.style.getPropertyValue("--cs-dnd-target-depth")).toBe("1");

        // Move outside tree -> cleans up --cs-dnd-target-depth
        dispatchPointer(window, "pointermove", { x: 500, y: 500 });
        expect(fileEl.style.getPropertyValue("--cs-dnd-target-depth")).toBe("");

        dnd.cancel();
        await flushMicrotasks();

        cleanDrag?.();
        cleanFile?.();
        cleanCol?.();
        cleanExp?.();
        cleanTree?.();
        dnd.destroy();
    });

    it("Kanban cross-container velocity gating suppresses fast pass-through sweeps, commits on dwell, and flushes fast flicks on pointerup", async () => {
        vi.useFakeTimers();
        let now = 1000;
        vi.spyOn(performance, "now").mockImplementation(() => now);

        const board = $state({
            todo: ["card-1"],
            doing: [] as string[],
            done: [] as string[],
        });
        const events: string[] = [];
        const reorders: DndReorderEvent<unknown>[] = [];

        const dnd = createDnd({
            animate: false,
            onReorder: (e) => {
                events.push(`reorder:${String(e.fromContainerId)}->${String(e.toContainerId)}`);
                reorders.push(e);
                const src = e.fromContainerId === "todo" ? board.todo : e.fromContainerId === "doing" ? board.doing : board.done;
                const dst = e.toContainerId === "todo" ? board.todo : e.toContainerId === "doing" ? board.doing : board.done;
                const res = arrayTransfer(src, dst, e.fromIndex, e.toIndex);
                if (e.fromContainerId === "todo") board.todo = res.source;
                else if (e.fromContainerId === "doing") board.doing = res.source;
                else board.done = res.source;

                if (e.toContainerId === "todo") board.todo = res.target;
                else if (e.toContainerId === "doing") board.doing = res.target;
                else board.done = res.target;
            },
            onDrop: (e) => {
                events.push(`drop:${String(e.targetContainerId)}`);
            },
        });

        const todoEl = document.createElement("div");
        const doingEl = document.createElement("div");
        const doneEl = document.createElement("div");
        const cardEl = document.createElement("div");
        todoEl.append(cardEl);
        root.append(todoEl, doingEl, doneEl);

        mockRect(todoEl, makeRect(0, 0, 200, 300));
        mockRect(doingEl, makeRect(220, 0, 200, 300));
        mockRect(doneEl, makeRect(440, 0, 200, 300));
        mockRect(cardEl, makeRect(0, 0, 200, 50));

        const stopRoot = $effect.root(() => {
            $effect(() => dnd.droppable({ id: "todo", layout: "list" })(todoEl));
            $effect(() => dnd.droppable({ id: "doing", layout: "list" })(doingEl));
            $effect(() => dnd.droppable({ id: "done", layout: "list" })(doneEl));
            $effect(() => {
                const cleanups = [
                    ...board.todo.map((id, idx) => dnd.sortable({ id, containerId: "todo", index: idx })(cardEl)),
                    ...board.doing.map((id, idx) => dnd.sortable({ id, containerId: "doing", index: idx })(cardEl)),
                    ...board.done.map((id, idx) => dnd.sortable({ id, containerId: "done", index: idx })(cardEl)),
                ];
                return () => {
                    for (const c of cleanups) c?.();
                };
            });
        });
        flushSync();

        // 1. Fast cross-axis sweep across middle column `doing` (dx=80px in 16ms -> inst 5000px/s, EMA >> 320px/s)
        dispatchPointer(cardEl, "pointerdown", { x: 100, y: 50 });
        now += 16;
        dispatchPointer(window, "pointermove", { x: 180, y: 50 }); // enters dragging in `todo`
        now += 16;
        dispatchPointer(window, "pointermove", { x: 260, y: 50 }); // fast sweep into `doing`
        now += 16;
        dispatchPointer(window, "pointermove", { x: 360, y: 50 }); // fast sweep across `doing`
        flushSync();

        // Middle column `doing` must NOT receive live onReorder during fast sweep!
        expect(reorders).toHaveLength(0);
        expect(board.doing).toEqual([]);

        // 2. Sweep into `done`, then decelerate to moderate vertical speed (~160px/s) so dwell timer arms
        now += 16;
        dispatchPointer(window, "pointermove", { x: 500, y: 50 }); // enters `done` fast -> suppressed
        expect(reorders).toHaveLength(0);

        // Idle decay (> 40ms) resets velocity, then gentle vertical movement inside `done` (dy=8px in 20ms -> inst 400px/s * 0.3 = 120px/s)
        now += 60;
        dispatchPointer(window, "pointermove", { x: 500, y: 50 });
        // Note: 0px move after idle decay has speed 0 -> commits immediately if we don't move;
        // instead test moderate speed (120..240px/s) directly from a fresh drag into `doing`!
        flushSync();
        expect(board.done).toEqual(["card-1"]);
        dispatchPointer(window, "pointerup", { x: 500, y: 50 });
        await flushMicrotasks();

        // 3. Dwell confirmation (45ms) at moderate vertical speed (~180 px/s) from `done` -> `doing`
        events.length = 0;
        reorders.length = 0;
        mockRect(cardEl, makeRect(440, 0, 200, 50));
        now += 100;
        dispatchPointer(cardEl, "pointerdown", { x: 450, y: 50 });
        now += 16;
        dispatchPointer(window, "pointermove", { x: 450, y: 60 }); // enters dragging in `done`
        now += 16;
        // Move into `doing` with small dx=-32, dy=40 in 35ms? Wait: let's keep |vx| <= |vy| * 1.15 and speed ~180px/s:
        // First build vertical speed in `done` (dy=12 in 20ms -> inst 600, EMA=180px/s)
        now += 20;
        dispatchPointer(window, "pointermove", { x: 450, y: 72 });
        now += 20;
        // Step just across into `doing` (dx=-35? Too fast! Use card near border x=425 -> x=415: dx=-10, dy=12 in 20ms)
        // Wait: card started at x=450, so let's move gently to x=425 first, then step x=415
        dispatchPointer(window, "pointermove", { x: 425, y: 84 }); // in gap [420..440]
        now += 60; // reset velocity after reaching edge
        dispatchPointer(window, "pointermove", { x: 424, y: 84 }); // still in gap
        now += 20;
        // Cross into `doing` at x=418 (dx=-6, dy=10 in 20ms => instVx=-300, instVy=500 => EMA vx=-90, vy=150, speed=175px/s <= 240, |vx| < |vy|*1.15)
        dispatchPointer(window, "pointermove", { x: 418, y: 94 });
        flushSync();

        // Should be waiting on 45ms confirm timer (not yet committed)
        expect(reorders).toHaveLength(0);
        vi.advanceTimersByTime(45);
        flushSync();
        expect(reorders).toHaveLength(1);
        expect(board.doing).toEqual(["card-1"]);

        // 4. Fast flick from `doing` -> `todo` followed by immediate pointerup flushes onReorder BEFORE onDrop!
        events.length = 0;
        reorders.length = 0;
        now += 16;
        dispatchPointer(window, "pointermove", { x: 300, y: 94 });
        now += 16;
        dispatchPointer(window, "pointermove", { x: 100, y: 94 }); // fast flick into `todo` (speed >> 320px/s)
        flushSync();

        // Suppressed during flight
        expect(reorders).toHaveLength(0);
        expect(board.todo).toEqual([]);

        // Immediate pointerup flushes onReorder synchronously before onDrop
        dispatchPointer(window, "pointerup", { x: 100, y: 94 });
        await flushMicrotasks();
        flushSync();

        expect(board.todo).toEqual(["card-1"]);
        expect(events).toEqual(["reorder:doing->todo", "drop:todo"]);

        stopRoot();
        dnd.destroy();
    });
});
