import type {
    DndActiveItem,
    DndAxis,
    DndDropPosition,
    DndId,
    DndLayout,
    DndOrientation,
    DndOverTarget,
    DndPoint,
    DragActivationOptions,
} from "./dnd.types.ts";
import { getRestingRect, type RectLike } from "./waapi-flip.internal.ts";

export interface RegisteredItem<TData = unknown> {
    id: DndId;
    element: HTMLElement;
    type: string | undefined;
    data: TData;
    containerId: DndId | null;
    index: number | null;
    parentId: DndId | null;
    depth: number | undefined;
    canNest: boolean;
    expanded: boolean;
    axis: DndAxis;
    requiresHandle: boolean | undefined;
    activation: Partial<DragActivationOptions> | undefined;
    label: string;
    disabled: boolean;
}

export interface RegisteredDroppable<TData = unknown, TDropData = unknown> {
    id: DndId;
    element: HTMLElement;
    layout: DndLayout;
    orientation: DndOrientation;
    data: TDropData | undefined;
    accepts: readonly string[] | ((item: DndActiveItem<TData>, target: DndOverTarget<TDropData>) => boolean) | undefined;
    animate: boolean;
    indicator: boolean;
    edgeZoneRatio: number;
    expandDelay: number;
    onExpandNode: ((nodeId: DndId) => void) | undefined;
    disabled: boolean;
}

export interface SwapGuard {
    activeId: DndId;
    targetId: DndId;
    direction: 1 | -1;
    axis: "x" | "y";
    /** Pointer must cross this coordinate in the opposite direction or leave the overlap band to unlock. */
    boundary: number;
    overlapStart: number;
    overlapEnd: number;
}

export interface CollisionState {
    lastPointer: DndPoint | null;
    lastTimestamp: number;
    dirX: number;
    dirY: number;
    vx: number;
    vy: number;
    speed: number;
    swapGuard: SwapGuard | null;
}

export interface CollisionResult<TDropData = unknown> {
    over: DndOverTarget<TDropData> | null;
    droppable: RegisteredDroppable<unknown, TDropData> | null;
    /** Target reorder index when live-reordering a `list` or `grid` container. */
    reorderToIndex: number | null;
    /** Optional swap guard to record when an unequal-size swap is committed. */
    nextSwapGuard: SwapGuard | null;
}

const VELOCITY_EMA_ALPHA = 0.3;
const VELOCITY_IDLE_DECAY_MS = 40;

export function createCollisionState(): CollisionState {
    return {
        lastPointer: null,
        lastTimestamp: 0,
        dirX: 0,
        dirY: 0,
        vx: 0,
        vy: 0,
        speed: 0,
        swapGuard: null,
    };
}

/**
 * Updates smoothed pointer movement direction and EMA-smoothed velocity (`px/s`)
 * so micro-tremors do not invert swap intent and fast cross-container sweeps can be gated.
 */
export function updatePointerDirection(state: CollisionState, pointer: DndPoint): void {
    const now = typeof performance === "undefined" ? 0 : performance.now();

    if (!state.lastPointer) {
        state.lastPointer = { x: pointer.x, y: pointer.y };
        state.lastTimestamp = now;
        return;
    }

    const dx = pointer.x - state.lastPointer.x;
    const dy = pointer.y - state.lastPointer.y;
    const dtMs = state.lastTimestamp > 0 ? now - state.lastTimestamp : 0;

    if (Math.abs(dx) >= 1) {
        state.dirX = dx > 0 ? 1 : -1;
    }
    if (Math.abs(dy) >= 1) {
        state.dirY = dy > 0 ? 1 : -1;
    }

    if (dtMs > VELOCITY_IDLE_DECAY_MS) {
        state.vx = 0;
        state.vy = 0;
        state.speed = 0;
    } else if (dtMs > 0) {
        const instVx = (dx / dtMs) * 1000;
        const instVy = (dy / dtMs) * 1000;
        state.vx = state.vx * (1 - VELOCITY_EMA_ALPHA) + instVx * VELOCITY_EMA_ALPHA;
        state.vy = state.vy * (1 - VELOCITY_EMA_ALPHA) + instVy * VELOCITY_EMA_ALPHA;
        state.speed = Math.hypot(state.vx, state.vy);
    }

    state.lastPointer = { x: pointer.x, y: pointer.y };
    state.lastTimestamp = now;
}

/**
 * Returns `true` if `candidateId === potentialAncestorId` or `potentialAncestorId` is
 * reachable by walking `parentId` links upward from `candidateId`.
 */
export function isAncestorOrSelf<TData>(
    itemsById: ReadonlyMap<DndId, RegisteredItem<TData>>,
    candidateId: DndId,
    potentialAncestorId: DndId,
): boolean {
    if (candidateId === potentialAncestorId) {
        return true;
    }

    const visited = new Set<DndId>([candidateId]);
    let current = itemsById.get(candidateId);

    while (current && current.parentId !== null) {
        if (current.parentId === potentialAncestorId) {
            return true;
        }
        if (visited.has(current.parentId)) {
            return false;
        }
        visited.add(current.parentId);
        current = itemsById.get(current.parentId);
    }

    return false;
}

function pointInRect(point: DndPoint, rect: RectLike): boolean {
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
}

/**
 * Finds the innermost enabled droppable whose resting rect contains `point`.
 */
export function findDroppableAtPoint<TData, TDropData>(
    droppables: Iterable<RegisteredDroppable<TData, TDropData>>,
    point: DndPoint,
): RegisteredDroppable<TData, TDropData> | null {
    let best: RegisteredDroppable<TData, TDropData> | null = null;
    let bestArea = Infinity;

    for (const droppable of droppables) {
        if (droppable.disabled) continue;

        const rect = getRestingRect(droppable.element);
        if (!pointInRect(point, rect)) continue;

        if (!best) {
            best = droppable;
            bestArea = rect.width * rect.height;
            continue;
        }

        // Prefer DOM descendant when droppables are nested; otherwise smaller area.
        if (best.element.contains(droppable.element)) {
            best = droppable;
            bestArea = rect.width * rect.height;
        } else if (!droppable.element.contains(best.element)) {
            const area = rect.width * rect.height;
            if (area < bestArea) {
                best = droppable;
                bestArea = area;
            }
        }
    }

    return best;
}

function validateAccepts<TData, TDropData>(
    droppable: RegisteredDroppable<TData, TDropData>,
    active: DndActiveItem<TData>,
    target: DndOverTarget<TDropData>,
): boolean {
    const { accepts } = droppable;
    if (!accepts) return true;
    if (Array.isArray(accepts)) {
        return active.type !== undefined && accepts.includes(active.type);
    }
    if (typeof accepts === "function") {
        return accepts(active, target);
    }
    return true;
}

function createUnequalSizeSwapGuard(params: {
    activeId: DndId;
    targetId: DndId;
    direction: 1 | -1;
    axis: "x" | "y";
    activeRect: RectLike;
    targetRect: RectLike;
}): SwapGuard | null {
    const { activeId, targetId, direction, axis, activeRect, targetRect } = params;
    const activeStart = axis === "x" ? activeRect.left : activeRect.top;
    const activeEnd = axis === "x" ? activeRect.right : activeRect.bottom;
    const activeSize = axis === "x" ? activeRect.width : activeRect.height;

    const targetStart = axis === "x" ? targetRect.left : targetRect.top;
    const targetEnd = axis === "x" ? targetRect.right : targetRect.bottom;
    const targetSize = axis === "x" ? targetRect.width : targetRect.height;

    if (activeSize <= 0 || Math.abs(activeSize - targetSize) < 2) {
        return null;
    }

    const pairStart = Math.min(activeStart, targetStart);
    const pairEnd = Math.max(activeEnd, targetEnd);
    const smaller = Math.min(activeSize, targetSize);

    // Post-swap coordinates of `target`:
    // - Forward swap (A before B -> B before A): B' occupies [pairStart, pairStart + targetSize],
    //   and reversing back requires pointer <= pairStart + smaller or leaving B'.
    // - Backward swap (B before A -> A before B): B' occupies [pairEnd - targetSize, pairEnd],
    //   and reversing forward requires pointer >= pairEnd - smaller or leaving B'.
    if (direction === 1) {
        return {
            activeId,
            targetId,
            direction,
            axis,
            boundary: pairStart + smaller,
            overlapStart: pairStart,
            overlapEnd: pairStart + targetSize,
        };
    }

    return {
        activeId,
        targetId,
        direction,
        axis,
        boundary: pairEnd - smaller,
        overlapStart: pairEnd - targetSize,
        overlapEnd: pairEnd,
    };
}

function isBlockedBySwapGuard(
    state: CollisionState,
    targetId: DndId,
    intendedDirection: 1 | -1,
    pointerCoord: number,
): boolean {
    const guard = state.swapGuard;
    if (!guard || guard.targetId !== targetId) {
        return false;
    }

    // Unlock and clear guard once pointer exits the post-swap target overlap band.
    if (pointerCoord < guard.overlapStart || pointerCoord > guard.overlapEnd) {
        state.swapGuard = null;
        return false;
    }

    // Only blocks an immediate reverse swap back across the just-swapped unequal-size neighbor.
    if (intendedDirection === guard.direction) {
        return false;
    }

    // Unlock once pointer reverses past the smaller item's far boundary.
    if (intendedDirection === -1 && pointerCoord <= guard.boundary) {
        state.swapGuard = null;
        return false;
    }
    if (intendedDirection === 1 && pointerCoord >= guard.boundary) {
        state.swapGuard = null;
        return false;
    }

    return true;
}

function getContainerItems<TData>(
    itemsById: ReadonlyMap<DndId, RegisteredItem<TData>>,
    containerId: DndId,
): RegisteredItem<TData>[] {
    const list: RegisteredItem<TData>[] = [];
    for (const item of itemsById.values()) {
        if (!item.disabled && item.containerId === containerId && item.index !== null) {
            list.push(item);
        }
    }
    list.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    return list;
}

/**
 * Resolves the active collision target (free dropzone, 1D list slot, 2D grid cell,
 * or 3-zone tree target) using invariant resting rects.
 */
export function resolveCollision<TData, TDropData>(params: {
    pointer: DndPoint;
    active: DndActiveItem<TData>;
    activeElement: HTMLElement | null;
    droppables: Iterable<RegisteredDroppable<TData, TDropData>>;
    itemsById: ReadonlyMap<DndId, RegisteredItem<TData>>;
    state: CollisionState;
    hysteresisPx: number;
}): CollisionResult<TDropData> {
    const { pointer, active, activeElement, droppables, itemsById, state, hysteresisPx } = params;
    const droppable = findDroppableAtPoint(droppables, pointer);

    if (!droppable) {
        return { over: null, droppable: null, reorderToIndex: null, nextSwapGuard: null };
    }

    if (droppable.layout === "free") {
        const candidate: DndOverTarget<TDropData> = {
            droppableId: droppable.id,
            itemId: null,
            containerId: null,
            index: null,
            position: null,
            isValid: true,
            data: droppable.data,
        };
        candidate.isValid = validateAccepts(droppable, active, candidate);
        return {
            over: candidate,
            droppable: droppable as RegisteredDroppable<unknown, TDropData>,
            reorderToIndex: null,
            nextSwapGuard: null,
        };
    }

    const containerItems = getContainerItems(itemsById, droppable.id);

    if (droppable.layout === "tree") {
        return resolveTreeCollision(droppable, containerItems, pointer, active, itemsById);
    }

    if (droppable.layout === "grid") {
        return resolveGridCollision(droppable, containerItems, pointer, active, activeElement, state, hysteresisPx);
    }

    return resolveListCollision(droppable, containerItems, pointer, active, activeElement, state, hysteresisPx);
}

function resolveListCollision<TData, TDropData>(
    droppable: RegisteredDroppable<TData, TDropData>,
    containerItems: RegisteredItem<TData>[],
    pointer: DndPoint,
    active: DndActiveItem<TData>,
    activeElement: HTMLElement | null,
    state: CollisionState,
    hysteresisPx: number,
): CollisionResult<TDropData> {
    const isHorizontal = droppable.orientation === "horizontal";
    const axis: "x" | "y" = isHorizontal ? "x" : "y";
    const pointerCoord = isHorizontal ? pointer.x : pointer.y;
    const pointerDir = isHorizontal ? state.dirX : state.dirY;
    const isSameContainer = active.containerId === droppable.id;

    // Empty container resolves cleanly to index 0.
    if (containerItems.length === 0) {
        const candidate: DndOverTarget<TDropData> = {
            droppableId: droppable.id,
            itemId: null,
            containerId: droppable.id,
            index: 0,
            position: null,
            isValid: true,
            data: droppable.data,
        };
        candidate.isValid = validateAccepts(droppable, active, candidate);
        return {
            over: candidate,
            droppable: droppable as RegisteredDroppable<unknown, TDropData>,
            reorderToIndex: candidate.isValid && !isSameContainer ? 0 : null,
            nextSwapGuard: null,
        };
    }

    // Cross-container insertion: find insertion slot [0..items.length] against sibling midpoints.
    if (!isSameContainer) {
        let insertIndex = containerItems.length;
        let targetItemId: DndId | null = null;
        let dropPosition: DndDropPosition | null = null;

        for (const [i, item] of containerItems.entries()) {
            const rect = getRestingRect(item.element);
            const mid = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
            if (pointerCoord < mid) {
                insertIndex = i;
                targetItemId = item.id;
                dropPosition = "before";
                break;
            }
            targetItemId = item.id;
            dropPosition = "after";
        }

        const candidate: DndOverTarget<TDropData> = {
            droppableId: droppable.id,
            itemId: droppable.indicator ? targetItemId : null,
            containerId: droppable.id,
            index: insertIndex,
            position: droppable.indicator ? dropPosition : null,
            isValid: true,
            data: droppable.data,
        };
        candidate.isValid = validateAccepts(droppable, active, candidate);

        return {
            over: candidate,
            droppable: droppable as RegisteredDroppable<unknown, TDropData>,
            reorderToIndex: candidate.isValid ? insertIndex : null,
            nextSwapGuard: null,
        };
    }

    // Same-container 1D sorting with directional crossing, hysteresis deadzone, and unequal-size swap guard.
    const activeIndex = active.index ?? 0;
    const activeRect = activeElement ? getRestingRect(activeElement) : null;

    let reorderToIndex: number | null = null;
    let nextSwapGuard: SwapGuard | null = null;
    let indicatorItemId: DndId | null = null;
    let indicatorPosition: DndDropPosition | null = null;

    for (const item of containerItems) {
        if (item.id === active.id || item.index === null) continue;

        const rect = getRestingRect(item.element);
        const start = isHorizontal ? rect.left : rect.top;
        const end = isHorizontal ? rect.right : rect.bottom;
        const size = isHorizontal ? rect.width : rect.height;
        const mid = start + size / 2;
        const clampedHysteresis = Math.min(hysteresisPx, size * 0.2);

        if (pointerCoord >= start && pointerCoord <= end) {
            indicatorItemId = item.id;
            indicatorPosition = pointerCoord < mid ? "before" : "after";
        }

        if (item.index > activeIndex) {
            // Moving forward (down/right): must cross midpoint + hysteresis in forward direction.
            const threshold = mid + clampedHysteresis;
            const crossedForward = pointerCoord >= threshold && (pointerDir >= 0 || pointerCoord >= end);
            if (crossedForward && !isBlockedBySwapGuard(state, item.id, 1, pointerCoord)) {
                reorderToIndex = item.index;
                if (activeRect) {
                    nextSwapGuard = createUnequalSizeSwapGuard({
                        activeId: active.id,
                        targetId: item.id,
                        direction: 1,
                        axis,
                        activeRect,
                        targetRect: rect,
                    });
                }
            }
        } else if (item.index < activeIndex) {
            // Moving backward (up/left): must cross midpoint - hysteresis in reverse direction.
            const threshold = mid - clampedHysteresis;
            const crossedBackward = pointerCoord <= threshold && (pointerDir <= 0 || pointerCoord <= start);
            if (
                crossedBackward &&
                !isBlockedBySwapGuard(state, item.id, -1, pointerCoord) &&
                (reorderToIndex === null || item.index < reorderToIndex)
            ) {
                reorderToIndex = item.index;
                if (activeRect) {
                    nextSwapGuard = createUnequalSizeSwapGuard({
                        activeId: active.id,
                        targetId: item.id,
                        direction: -1,
                        axis,
                        activeRect,
                        targetRect: rect,
                    });
                }
            }
        }
    }

    const candidate: DndOverTarget<TDropData> = {
        droppableId: droppable.id,
        itemId: droppable.indicator ? indicatorItemId : null,
        containerId: droppable.id,
        index: reorderToIndex ?? activeIndex,
        position: droppable.indicator ? indicatorPosition : null,
        isValid: true,
        data: droppable.data,
    };
    candidate.isValid = validateAccepts(droppable, active, candidate);

    return {
        over: candidate,
        droppable: droppable as RegisteredDroppable<unknown, TDropData>,
        reorderToIndex: candidate.isValid ? reorderToIndex : null,
        nextSwapGuard: candidate.isValid ? nextSwapGuard : null,
    };
}

function resolveGridCollision<TData, TDropData>(
    droppable: RegisteredDroppable<TData, TDropData>,
    containerItems: RegisteredItem<TData>[],
    pointer: DndPoint,
    active: DndActiveItem<TData>,
    activeElement: HTMLElement | null,
    state: CollisionState,
    hysteresisPx: number,
): CollisionResult<TDropData> {
    const isSameContainer = active.containerId === droppable.id;

    if (containerItems.length === 0) {
        const candidate: DndOverTarget<TDropData> = {
            droppableId: droppable.id,
            itemId: null,
            containerId: droppable.id,
            index: 0,
            position: null,
            isValid: true,
            data: droppable.data,
        };
        candidate.isValid = validateAccepts(droppable, active, candidate);
        return {
            over: candidate,
            droppable: droppable as RegisteredDroppable<unknown, TDropData>,
            reorderToIndex: candidate.isValid && !isSameContainer ? 0 : null,
            nextSwapGuard: null,
        };
    }

    // Find sibling whose resting rect contains the pointer (with hysteresis inset from edges).
    let hoveredItem: RegisteredItem<TData> | null = null;
    let hoveredRect: RectLike | null = null;

    for (const item of containerItems) {
        const rect = getRestingRect(item.element);
        if (pointInRect(pointer, rect)) {
            hoveredItem = item;
            hoveredRect = rect;
            break;
        }
    }

    // If pointer is in a grid gap when entering from another container, pick nearest sibling center.
    if (!hoveredItem && !isSameContainer) {
        let bestDist = Infinity;
        for (const item of containerItems) {
            const rect = getRestingRect(item.element);
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const dist = Math.hypot(pointer.x - cx, pointer.y - cy);
            if (dist < bestDist) {
                bestDist = dist;
                hoveredItem = item;
                hoveredRect = rect;
            }
        }
    }

    const activeIndex = active.index ?? 0;
    let reorderToIndex: number | null = null;
    let nextSwapGuard: SwapGuard | null = null;

    if (hoveredItem && hoveredRect && hoveredItem.index !== null) {
        if (!isSameContainer) {
            const midX = hoveredRect.left + hoveredRect.width / 2;
            reorderToIndex = pointer.x < midX ? hoveredItem.index : hoveredItem.index + 1;
        } else if (hoveredItem.id !== active.id) {
            const insetX = Math.min(hysteresisPx, hoveredRect.width * 0.2);
            const insetY = Math.min(hysteresisPx, hoveredRect.height * 0.2);
            const insideCore =
                pointer.x >= hoveredRect.left + insetX &&
                pointer.x <= hoveredRect.right - insetX &&
                pointer.y >= hoveredRect.top + insetY &&
                pointer.y <= hoveredRect.bottom - insetY;

            const intendedDirection: 1 | -1 = hoveredItem.index > activeIndex ? 1 : -1;
            const guardCoord = state.swapGuard?.axis === "x" ? pointer.x : pointer.y;

            if (insideCore && !isBlockedBySwapGuard(state, hoveredItem.id, intendedDirection, guardCoord)) {
                reorderToIndex = hoveredItem.index;
                const activeRect = activeElement ? getRestingRect(activeElement) : null;
                if (activeRect) {
                    const preferY =
                        Math.abs(activeRect.height - hoveredRect.height) >=
                        Math.abs(activeRect.width - hoveredRect.width);
                    nextSwapGuard = createUnequalSizeSwapGuard({
                        activeId: active.id,
                        targetId: hoveredItem.id,
                        direction: intendedDirection,
                        axis: preferY ? "y" : "x",
                        activeRect,
                        targetRect: hoveredRect,
                    });
                }
            }
        }
    }

    const candidate: DndOverTarget<TDropData> = {
        droppableId: droppable.id,
        itemId: droppable.indicator && hoveredItem ? hoveredItem.id : null,
        containerId: droppable.id,
        index: reorderToIndex ?? (isSameContainer ? activeIndex : containerItems.length),
        position: null,
        isValid: true,
        data: droppable.data,
    };
    candidate.isValid = validateAccepts(droppable, active, candidate);

    return {
        over: candidate,
        droppable: droppable as RegisteredDroppable<unknown, TDropData>,
        reorderToIndex: candidate.isValid ? reorderToIndex : null,
        nextSwapGuard: candidate.isValid ? nextSwapGuard : null,
    };
}

function resolveTreeCollision<TData, TDropData>(
    droppable: RegisteredDroppable<TData, TDropData>,
    containerItems: RegisteredItem<TData>[],
    pointer: DndPoint,
    active: DndActiveItem<TData>,
    itemsById: ReadonlyMap<DndId, RegisteredItem<TData>>,
): CollisionResult<TDropData> {
    if (containerItems.length === 0) {
        const candidate: DndOverTarget<TDropData> = {
            droppableId: droppable.id,
            itemId: null,
            containerId: droppable.id,
            index: 0,
            position: "inside",
            isValid: true,
            data: droppable.data,
        };
        candidate.isValid = validateAccepts(droppable, active, candidate);
        return {
            over: candidate,
            droppable: droppable as RegisteredDroppable<unknown, TDropData>,
            reorderToIndex: null,
            nextSwapGuard: null,
        };
    }

    // Pick the tree row whose resting rect contains pointer.y, or the vertically nearest row.
    let targetItem: RegisteredItem<TData> | null = null;
    let targetRect: RectLike | null = null;
    let bestDist = Infinity;

    for (const item of containerItems) {
        const rect = getRestingRect(item.element);
        if (pointer.y >= rect.top && pointer.y <= rect.bottom) {
            targetItem = item;
            targetRect = rect;
            break;
        }
        const dist = pointer.y < rect.top ? rect.top - pointer.y : pointer.y - rect.bottom;
        if (dist < bestDist) {
            bestDist = dist;
            targetItem = item;
            targetRect = rect;
        }
    }

    if (!targetItem || !targetRect) {
        return { over: null, droppable: null, reorderToIndex: null, nextSwapGuard: null };
    }

    const ratio = Math.max(0, Math.min(1, (pointer.y - targetRect.top) / Math.max(targetRect.height, 1)));
    const edgeRatio = Math.max(0.05, Math.min(0.45, droppable.edgeZoneRatio));

    let position: DndDropPosition;
    if (targetItem.canNest) {
        if (ratio < edgeRatio) {
            position = "before";
        } else if (ratio > 1 - edgeRatio) {
            position = "after";
        } else {
            position = "inside";
        }
    } else {
        position = ratio < 0.5 ? "before" : "after";
    }

    const cycleDetected = isAncestorOrSelf(itemsById, targetItem.id, active.id);
    const candidate: DndOverTarget<TDropData> = {
        droppableId: droppable.id,
        itemId: targetItem.id,
        containerId: droppable.id,
        index: targetItem.index,
        position,
        isValid: !cycleDetected,
        data: droppable.data,
    };

    if (candidate.isValid) {
        candidate.isValid = validateAccepts(droppable, active, candidate);
    }

    // Trees never live-mutate via onReorder during hover; they commit once in onDrop.
    return {
        over: candidate,
        droppable: droppable as RegisteredDroppable<unknown, TDropData>,
        reorderToIndex: null,
        nextSwapGuard: null,
    };
}
