import type { TabsOrientation } from "./tabs.types.ts";

export interface IndicatorMetrics {
    start: number;
    size: number;
    trackSize: number;
}

export interface ClipOffsets {
    start: number;
    end: number;
}

export interface PushPullKeyframes {
    keyframes: Keyframe[];
    durationMs: number;
}

function clamp(min: number, value: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function measureIndicatorMetrics(
    activeEl: HTMLElement,
    trackEl: HTMLElement,
    orientation: TabsOrientation
): IndicatorMetrics {
    if (orientation === "vertical") {
        return {
            start: activeEl.offsetTop,
            size: activeEl.offsetHeight,
            trackSize: trackEl.scrollHeight,
        };
    }

    return {
        start: activeEl.offsetLeft,
        size: activeEl.offsetWidth,
        trackSize: trackEl.scrollWidth,
    };
}

export function computeClipOffsets(metrics: IndicatorMetrics): ClipOffsets {
    const start = Math.max(0, metrics.start);
    const end = Math.max(0, metrics.trackSize - (metrics.start + metrics.size));
    return { start, end };
}

const PUSH_PULL_STEPS = 16;

export function buildPushPullKeyframes(
    prev: IndicatorMetrics,
    next: IndicatorMetrics,
    orientation: TabsOrientation
): PushPullKeyframes | null {
    const c1 = prev.start + prev.size / 2;
    const c2 = next.start + next.size / 2;
    const delta = Math.abs(c2 - c1);

    if (delta < 1 && Math.abs(prev.size - next.size) < 1) {
        return null;
    }

    const durationMs = Math.round(clamp(280, 260 + 0.17 * delta, 400));
    const maxExtra = Math.min(delta * 0.85, 115);
    const end1 = prev.start + prev.size;
    const end2 = next.start + next.size;
    const isForward = c2 >= c1;

    const keyframes: Keyframe[] = [];

    for (let i = 0; i <= PUSH_PULL_STEPS; i++) {
        const t = i / PUSH_PULL_STEPS;
        const leadT = 1 - Math.pow(1 - t, 3);
        const tt = clamp(0, (t - 0.12) / 0.88, 1);
        const trailT = tt * tt * (3 - 2 * tt);
        const baseSize = prev.size + (next.size - prev.size) * leadT;

        let frameOffsets: ClipOffsets;

        if (isForward) {
            const leadEdge = end1 + (end2 - end1) * leadT;
            let trailEdge = prev.start + (next.start - prev.start) * trailT;
            // Rope constraint prevents full-width ballooning on long jumps while preserving short-jump inertia.
            trailEdge = Math.max(trailEdge, leadEdge - (baseSize + maxExtra));
            trailEdge = clamp(Math.min(prev.start, next.start), trailEdge, Math.max(prev.start, next.start));
            frameOffsets = computeClipOffsets({
                start: trailEdge,
                size: Math.max(0, leadEdge - trailEdge),
                trackSize: next.trackSize,
            });
        } else {
            const leadEdge = prev.start + (next.start - prev.start) * leadT;
            let trailEdge = end1 + (end2 - end1) * trailT;
            trailEdge = Math.min(trailEdge, leadEdge + (baseSize + maxExtra));
            trailEdge = clamp(Math.min(end2, end1), trailEdge, Math.max(end2, end1));
            frameOffsets = computeClipOffsets({
                start: leadEdge,
                size: Math.max(0, trailEdge - leadEdge),
                trackSize: next.trackSize,
            });
        }

        keyframes.push({
            clipPath: formatClipPathInset(frameOffsets, orientation),
            offset: t,
        });
    }

    return {
        keyframes,
        durationMs,
    };
}

function parsePxValue(token: string): number | null {
    if (token === "0") return 0;
    const match = /^(-?\d+(?:\.\d+)?)(?:px)?$/.exec(token);
    if (!match) return null;
    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
}

export function parseComputedClipPath(
    clipPath: string,
    orientation: TabsOrientation
): ClipOffsets | null {
    const insetMatch = /^inset\(\s*(.+?)\s*\)$/.exec(clipPath.trim());
    const rawInner = insetMatch?.[1];
    if (!rawInner) return null;

    const lengthsPart = (rawInner.split(/\bround\b/i, 1)[0] ?? "").trim();
    if (!lengthsPart) return null;

    const parts = lengthsPart.split(/\s+/);
    if (parts.length === 0 || parts.length > 4) return null;

    const values: number[] = [];
    for (const part of parts) {
        const parsed = parsePxValue(part);
        if (parsed === null) return null;
        values.push(parsed);
    }

    const [v0, v1, v2, v3] = values;
    if (v0 === undefined) return null;

    let top: number;
    let right: number;
    let bottom: number;
    let left: number;

    if (values.length === 1) {
        top = right = bottom = left = v0;
    } else if (values.length === 2 && v1 !== undefined) {
        top = bottom = v0;
        right = left = v1;
    } else if (values.length === 3 && v1 !== undefined && v2 !== undefined) {
        top = v0;
        right = left = v1;
        bottom = v2;
    } else if (values.length === 4 && v1 !== undefined && v2 !== undefined && v3 !== undefined) {
        top = v0;
        right = v1;
        bottom = v2;
        left = v3;
    } else {
        return null;
    }

    return orientation === "vertical"
        ? { start: top, end: bottom }
        : { start: left, end: right };
}

export function formatClipPathInset(
    offsets: ClipOffsets,
    orientation: TabsOrientation
): string {
    if (orientation === "vertical") {
        return `inset(${offsets.start}px 0px ${offsets.end}px 0px round 9999px)`;
    }
    return `inset(0px ${offsets.end}px 0px ${offsets.start}px round 9999px)`;
}
