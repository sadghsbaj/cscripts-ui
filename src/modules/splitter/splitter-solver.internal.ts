import type { SplitterExtent } from "./splitter.types.ts";

export interface ParsedExtent {
    unit: "px" | "%";
    value: number;
}

export interface SolverPaneState {
    id: string;
    hasExplicitId: boolean;
    extentPx: number | undefined;
    preCollapseExtentPx: number | undefined;
    specifiedExtent: SplitterExtent | undefined;
    isControlled: boolean;
    minPx: number;
    maxPx: number;
    collapsible: boolean;
    collapsed: boolean;
    collapsedExtentPx: number;
    collapseThreshold: number;
    unitPreference: "px" | "%";
}

export function parseExtent(extent: SplitterExtent): ParsedExtent {
    if (typeof extent === "number") {
        return { unit: "%", value: Number.isFinite(extent) ? extent : 0 };
    }
    const trimmed = extent.trim();
    if (trimmed.endsWith("px")) {
        const parsed = Number(trimmed.slice(0, -2));
        return { unit: "px", value: Number.isFinite(parsed) ? parsed : 0 };
    }
    if (trimmed.endsWith("%")) {
        const parsed = Number(trimmed.slice(0, -1));
        return { unit: "%", value: Number.isFinite(parsed) ? parsed : 0 };
    }
    const parsed = Number(trimmed);
    return { unit: "%", value: Number.isFinite(parsed) ? parsed : 0 };
}

export function resolveExtentPx(extent: SplitterExtent, availablePx: number): number {
    const parsed = parseExtent(extent);
    if (parsed.unit === "px") {
        return Math.max(0, parsed.value);
    }
    if (availablePx <= 0) return 0;
    return Math.max(0, (parsed.value / 100) * availablePx);
}

export function formatExtentForProp(
    px: number,
    template: SplitterExtent | undefined,
    availablePx: number,
): SplitterExtent {
    const roundedPx = Math.round(px * 100) / 100;
    if (typeof template === "string" && template.trimEnd().endsWith("px")) {
        return `${roundedPx}px`;
    }
    const pct = availablePx > 0 ? Math.round((px / availablePx) * 10_000) / 100 : 0;
    if (typeof template === "number") {
        return pct;
    }
    return `${pct}%`;
}

export function isZeroExtent(extent: SplitterExtent): boolean {
    return parseExtent(extent).value <= 0;
}

function getEffectiveBounds(
    pane: SolverPaneState,
    availablePx: number,
): { min: number; max: number } {
    if (pane.collapsed) {
        const collapsed = Math.min(pane.collapsedExtentPx, availablePx);
        return { min: collapsed, max: collapsed };
    }
    const min = Math.min(pane.minPx, availablePx);
    const max = Math.max(min, Math.min(pane.maxPx, availablePx));
    return { min, max };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Normalizes a list of pane extents so their sum matches `availablePx`
 * while respecting per-pane `[min, max]` bounds when possible, and
 * compressing proportionally below `min` if the container is smaller
 * than the sum of minimums.
 */
export function normalizeExtents(
    extents: number[],
    panes: SolverPaneState[],
    availablePx: number,
    fixedIndices: ReadonlySet<number> = new Set(),
): number[] {
    const next = extents.map((v, i) => {
        const pane = panes[i];
        if (!pane) return 0;
        const { min, max } = getEffectiveBounds(pane, availablePx);
        return clamp(v, min, max);
    });

    if (availablePx <= 0 || panes.length === 0) {
        return next.map(() => 0);
    }

    const total = next.reduce((acc, v) => acc + v, 0);
    let delta = availablePx - total;

    if (Math.abs(delta) < 0.01) {
        return next;
    }

    // First pass: distribute delta across non-fixed, expanded panes within bounds
    const adjustableIndices = panes
        .map((_, i) => i)
        .filter((i) => !fixedIndices.has(i) && !(panes[i]?.collapsed ?? true));

    delta = distributeDelta(next, panes, availablePx, adjustableIndices, delta);

    // Second pass: if fixed panes need to yield (e.g. only fixed panes exist), allow all expanded panes
    if (Math.abs(delta) >= 0.01) {
        const allExpanded = panes.map((_, i) => i).filter((i) => !(panes[i]?.collapsed ?? true));
        delta = distributeDelta(next, panes, availablePx, allExpanded, delta);
    }

    // Third pass: container is smaller than sum(min) — compress expanded panes proportionally toward 0
    if (delta < -0.01) {
        const expanded = panes.map((_, i) => i).filter((i) => !(panes[i]?.collapsed ?? true));
        const expandedSum = expanded.reduce((acc, i) => acc + (next[i] ?? 0), 0);
        if (expandedSum > 0) {
            const targetExpandedSum = Math.max(0, expandedSum + delta);
            const ratio = targetExpandedSum / expandedSum;
            for (const i of expanded) {
                next[i] = (next[i] ?? 0) * ratio;
            }
        }
    }

    return next;
}

function distributePass(
    extents: number[],
    panes: SolverPaneState[],
    availablePx: number,
    candidates: number[],
    remaining: number,
): { remaining: number; nextCandidates: number[] } {
    const weights = candidates.map((i) => {
        const pane = panes[i];
        if (!pane) return 0;
        const current = extents[i] ?? 0;
        const { min, max } = getEffectiveBounds(pane, availablePx);
        return remaining > 0 ? Math.max(0, max - current) : Math.max(0, current - min);
    });
    const totalRoom = weights.reduce((acc, w) => acc + w, 0);
    if (totalRoom <= 0) {
        return { remaining, nextCandidates: [] };
    }

    let consumed = 0;
    const nextCandidates: number[] = [];
    for (const [k, idx] of candidates.entries()) {
        const room = weights[k];
        if (room === undefined || room <= 0) continue;
        const pane = panes[idx];
        if (!pane) continue;

        const share = remaining * (room / totalRoom);
        const applied = remaining > 0 ? Math.min(room, share) : Math.max(-room, share);
        const updated = (extents[idx] ?? 0) + applied;
        extents[idx] = updated;
        consumed += applied;

        const { min, max } = getEffectiveBounds(pane, availablePx);
        if ((remaining > 0 && updated < max - 0.01) || (remaining < 0 && updated > min + 0.01)) {
            nextCandidates.push(idx);
        }
    }

    return { remaining: remaining - consumed, nextCandidates };
}

function distributeDelta(
    extents: number[],
    panes: SolverPaneState[],
    availablePx: number,
    indices: number[],
    delta: number,
): number {
    let remaining = delta;
    let candidates = indices;

    for (let pass = 0; pass < 4 && Math.abs(remaining) >= 0.01 && candidates.length > 0; pass++) {
        const result = distributePass(extents, panes, availablePx, candidates, remaining);
        if (result.nextCandidates.length === 0 && result.remaining === remaining) break;
        remaining = result.remaining;
        candidates = result.nextCandidates;
    }

    return remaining;
}

export function solveInitialAndMountExtents(
    panes: SolverPaneState[],
    availablePx: number,
    rememberedExtents: ReadonlyMap<string, number>,
): number[] {
    if (panes.length === 0) return [];
    if (availablePx <= 0) return panes.map(() => 0);

    const existingCount = panes.filter((p) => p.extentPx !== undefined).length;
    const isIncrementalMount = existingCount > 0 && existingCount < panes.length;

    if (isIncrementalMount) {
        return solveIncrementalMount(panes, availablePx, rememberedExtents);
    }

    const fixedIndices = new Set<number>();
    const raw: (number | null)[] = panes.map((pane, i) => {
        if (pane.collapsed) {
            fixedIndices.add(i);
            return pane.collapsedExtentPx;
        }
        if (pane.hasExplicitId && !pane.isControlled && rememberedExtents.has(pane.id)) {
            const remembered = rememberedExtents.get(pane.id);
            if (remembered !== undefined) {
                fixedIndices.add(i);
                return remembered;
            }
        }
        if (pane.specifiedExtent !== undefined) {
            fixedIndices.add(i);
            return resolveExtentPx(pane.specifiedExtent, availablePx);
        }
        return null;
    });

    const fixedSum = raw.reduce<number>((acc, v) => acc + (v ?? 0), 0);
    const flexCount = raw.filter((v) => v === null).length;
    const flexShare = flexCount > 0 ? Math.max(0, availablePx - fixedSum) / flexCount : 0;

    const extents = raw.map((v) => v ?? flexShare);
    return normalizeExtents(extents, panes, availablePx, fixedIndices);
}

function solveIncrementalMount(
    panes: SolverPaneState[],
    availablePx: number,
    rememberedExtents: ReadonlyMap<string, number>,
): number[] {
    const newIndices: number[] = [];
    const existingIndices: number[] = [];
    const extents = panes.map((pane, i) => {
        if (pane.extentPx !== undefined) {
            existingIndices.push(i);
            return pane.collapsed ? pane.collapsedExtentPx : pane.extentPx;
        }
        newIndices.push(i);
        if (pane.collapsed) return pane.collapsedExtentPx;
        if (pane.hasExplicitId && !pane.isControlled && rememberedExtents.has(pane.id)) {
            const remembered = rememberedExtents.get(pane.id);
            if (remembered !== undefined) return remembered;
        }
        if (pane.specifiedExtent !== undefined) {
            return resolveExtentPx(pane.specifiedExtent, availablePx);
        }
        return availablePx / panes.length;
    });

    const fixedNew = new Set<number>(newIndices);
    return normalizeExtents(extents, panes, availablePx, fixedNew);
}

export function solveContainerResize(
    panes: SolverPaneState[],
    availablePx: number,
): number[] {
    if (panes.length === 0) return [];
    if (availablePx <= 0) return panes.map(() => 0);

    const fixedIndices = new Set<number>();
    const extents = panes.map((pane, i) => {
        if (pane.collapsed) {
            fixedIndices.add(i);
            return pane.collapsedExtentPx;
        }
        if (pane.unitPreference === "px") {
            fixedIndices.add(i);
        }
        return pane.extentPx ?? availablePx / panes.length;
    });

    return normalizeExtents(extents, panes, availablePx, fixedIndices);
}

export interface PairResizeResult {
    leftPx: number;
    rightPx: number;
    leftCollapsed: boolean;
    rightCollapsed: boolean;
}

export function solvePairDrag(
    left: SolverPaneState,
    right: SolverPaneState,
    startLeftPx: number,
    startRightPx: number,
    totalDeltaPx: number,
    availablePx: number,
): PairResizeResult {
    const pairTotal = startLeftPx + startRightPx;
    let targetLeft = startLeftPx + totalDeltaPx;
    let targetRight = pairTotal - targetLeft;

    let leftCollapsed = left.collapsed;
    let rightCollapsed = right.collapsed;

    // Check left pane collapse/expand thresholds
    if (left.collapsible) {
        const thresholdPx =
            left.minPx > left.collapsedExtentPx
                ? left.collapsedExtentPx + (left.minPx - left.collapsedExtentPx) * left.collapseThreshold
                : left.collapsedExtentPx;

        if (!leftCollapsed && targetLeft < thresholdPx && totalDeltaPx < 0) {
            leftCollapsed = true;
        } else if (leftCollapsed && targetLeft >= thresholdPx && totalDeltaPx > 0) {
            leftCollapsed = false;
        }
    }

    // Check right pane collapse/expand thresholds
    if (right.collapsible) {
        const thresholdPx =
            right.minPx > right.collapsedExtentPx
                ? right.collapsedExtentPx +
                  (right.minPx - right.collapsedExtentPx) * right.collapseThreshold
                : right.collapsedExtentPx;

        if (!rightCollapsed && targetRight < thresholdPx && totalDeltaPx > 0) {
            rightCollapsed = true;
        } else if (rightCollapsed && targetRight >= thresholdPx && totalDeltaPx < 0) {
            rightCollapsed = false;
        }
    }

    const leftBounds = leftCollapsed
        ? { min: left.collapsedExtentPx, max: left.collapsedExtentPx }
        : getEffectiveBounds({ ...left, collapsed: false }, availablePx);
    const rightBounds = rightCollapsed
        ? { min: right.collapsedExtentPx, max: right.collapsedExtentPx }
        : getEffectiveBounds({ ...right, collapsed: false }, availablePx);

    const minLeft = Math.max(leftBounds.min, pairTotal - rightBounds.max);
    const maxLeft = Math.min(leftBounds.max, pairTotal - rightBounds.min);

    targetLeft = clamp(targetLeft, minLeft, Math.max(minLeft, maxLeft));
    targetRight = Math.max(0, pairTotal - targetLeft);

    return {
        leftPx: targetLeft,
        rightPx: targetRight,
        leftCollapsed,
        rightCollapsed,
    };
}
