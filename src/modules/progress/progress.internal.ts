import type { ProgressAppearance } from "./index.ts";

export interface NormalizedProgress {
    isIndeterminate: boolean;
    safeMin: number;
    safeMax: number;
    clampedValue: number | undefined;
    ratio: number;
}

const DEFAULT_SEGMENTS: Record<Exclude<ProgressAppearance, "bar">, number> = {
    dashed: 5,
    dotted: 10,
};

const STAGGER_TOTAL_SPREAD_MS = 180;
const STAGGER_MIN_STEP_MS = 16;
const STAGGER_MAX_STEP_MS = 35;

export function normalizeProgress(
    value: number | null | undefined,
    min: number,
    max: number,
): NormalizedProgress {
    const safeMin = Number.isFinite(min) ? min : 0;
    const safeMax = Number.isFinite(max) ? max : 100;
    const isIndeterminate = value === null || value === undefined || !Number.isFinite(value);

    if (isIndeterminate) {
        return {
            isIndeterminate: true,
            safeMin,
            safeMax,
            clampedValue: undefined,
            ratio: 0,
        };
    }

    if (safeMax <= safeMin) {
        return {
            isIndeterminate: false,
            safeMin,
            safeMax,
            clampedValue: safeMin,
            ratio: 0,
        };
    }

    const clampedValue = Math.min(safeMax, Math.max(safeMin, value));
    const ratio = (clampedValue - safeMin) / (safeMax - safeMin);

    return {
        isIndeterminate: false,
        safeMin,
        safeMax,
        clampedValue,
        ratio,
    };
}

export function resolveSegmentCount(appearance: ProgressAppearance, segments?: number): number {
    if (appearance === "bar") {
        return 0;
    }

    if (segments !== undefined && Number.isFinite(segments)) {
        return Math.max(1, Math.floor(segments));
    }

    return DEFAULT_SEGMENTS[appearance];
}

export function computeActiveSegmentCount(
    ratio: number,
    segmentCount: number,
    isIndeterminate: boolean,
): number {
    if (isIndeterminate || ratio <= 0 || segmentCount <= 0) {
        return 0;
    }

    return Math.min(segmentCount, Math.max(1, Math.round(ratio * segmentCount)));
}

export function computeStaggerStepMs(prevCount: number, nextCount: number): number {
    const diff = Math.abs(nextCount - prevCount);
    if (diff === 0) {
        return 0;
    }

    const raw = STAGGER_TOTAL_SPREAD_MS / diff;
    return Math.round(Math.min(STAGGER_MAX_STEP_MS, Math.max(STAGGER_MIN_STEP_MS, raw)) * 100) / 100;
}

export function computeSegmentStagger(
    index: number,
    prevCount: number,
    nextCount: number,
    isIndeterminate: boolean,
): number {
    if (isIndeterminate || prevCount === nextCount) {
        return 0;
    }

    if (nextCount > prevCount) {
        return index >= prevCount && index < nextCount ? index - prevCount : 0;
    }

    return index >= nextCount && index < prevCount ? prevCount - 1 - index : 0;
}
