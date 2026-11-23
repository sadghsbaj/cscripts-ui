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

/** Matches `--cs-dur-200` in `src/css/foundation/motion.css`. */
export const INDICATOR_SLIDE_DURATION_MS = 200;
/** Matches `--cs-ease-quart-out` in `src/css/foundation/motion.css`. */
export const INDICATOR_SLIDE_EASING = "cubic-bezier(0.25, 1, 0.5, 1)";

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

export function buildSlideKeyframes(
    fromOffsets: ClipOffsets,
    toOffsets: ClipOffsets,
    orientation: TabsOrientation
): Keyframe[] | null {
    if (
        Math.abs(fromOffsets.start - toOffsets.start) < 0.5 &&
        Math.abs(fromOffsets.end - toOffsets.end) < 0.5
    ) {
        return null;
    }

    return [
        { clipPath: formatClipPathInset(fromOffsets, orientation) },
        { clipPath: formatClipPathInset(toOffsets, orientation) },
    ];
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
