export interface OverflowState {
    canScrollPrev: boolean;
    canScrollNext: boolean;
}

export type ScrollStepDirection = "prev" | "next";

const DEFAULT_FADE_RESERVE = 40;
const SUBPIXEL_TOLERANCE = 1;
const EDGE_SNAP_THRESHOLD = 12;

function parseCssPx(raw: string): number {
    const trimmed = raw.trim();
    const parsed = Number(trimmed.endsWith("px") ? trimmed.slice(0, -2) : trimmed);
    return Number.isFinite(parsed) ? parsed : NaN;
}

export function resolveFadeReserve(viewport: HTMLElement): number {
    if (typeof getComputedStyle !== "function") {
        return DEFAULT_FADE_RESERVE;
    }
    const parsed = parseCssPx(getComputedStyle(viewport).getPropertyValue("--cs-scroll-fade-size"));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FADE_RESERVE;
}

export function isRtlViewport(viewport: HTMLElement): boolean {
    if (typeof getComputedStyle === "function") {
        return getComputedStyle(viewport).direction === "rtl";
    }
    return false;
}

export function getOverflowState(viewport: HTMLElement, tolerance = SUBPIXEL_TOLERANCE): OverflowState {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (maxScroll <= tolerance) {
        return { canScrollPrev: false, canScrollNext: false };
    }

    const offset = Math.min(maxScroll, Math.max(0, Math.abs(viewport.scrollLeft)));
    return {
        canScrollPrev: offset > tolerance,
        canScrollNext: offset < maxScroll - tolerance,
    };
}

/**
 * Computes the horizontal scroll delta (`scrollBy({ left: delta })`) for a smart step-scroll
 * so that the item clipped by the fade zone aligns cleanly past the opposite chevron.
 */
export function getStepScrollDelta(
    viewport: HTMLElement,
    items: HTMLElement[],
    direction: ScrollStepDirection,
    fadeReserve: number,
    isRtl: boolean
): number {
    if (items.length === 0) return 0;

    const vpRect = viewport.getBoundingClientRect();
    const fallbackStep = Math.max(vpRect.width - 2 * fadeReserve, DEFAULT_FADE_RESERVE);

    // Physical visual direction: in RTL, "next" advances visually left and "prev" advances visually right.
    const moveVisualRight = direction === (isRtl ? "prev" : "next");

    let delta: number;
    let candidate: HTMLElement | null = null;
    if (moveVisualRight) {
        let maxRight = -Infinity;
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (
                rect.left < vpRect.right - SUBPIXEL_TOLERANCE &&
                rect.right > vpRect.right - fadeReserve + SUBPIXEL_TOLERANCE &&
                rect.right > maxRight
            ) {
                candidate = item;
                maxRight = rect.right;
            }
        }
        if (!candidate) {
            delta = fallbackStep;
        } else {
            const rawDelta = candidate.getBoundingClientRect().left - (vpRect.left + fadeReserve);
            delta = rawDelta > SUBPIXEL_TOLERANCE ? rawDelta : fallbackStep;
        }
    } else {
        let minLeft = Infinity;
        for (const item of items) {
            const rect = item.getBoundingClientRect();
            if (
                rect.right > vpRect.left + SUBPIXEL_TOLERANCE &&
                rect.left < vpRect.left + fadeReserve - SUBPIXEL_TOLERANCE &&
                rect.left < minLeft
            ) {
                candidate = item;
                minLeft = rect.left;
            }
        }
        if (!candidate) {
            delta = -fallbackStep;
        } else {
            const rawDelta = candidate.getBoundingClientRect().right - (vpRect.right - fadeReserve);
            delta = rawDelta < -SUBPIXEL_TOLERANCE ? rawDelta : -fallbackStep;
        }
    }

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (maxScroll > SUBPIXEL_TOLERANCE) {
        const currentOffset = Math.min(maxScroll, Math.max(0, Math.abs(viewport.scrollLeft)));
        const step = Math.abs(delta);
        if (direction === "next") {
            const remaining = maxScroll - (currentOffset + step);
            if (remaining <= EDGE_SNAP_THRESHOLD) {
                const snapped = Math.max(0, maxScroll - currentOffset);
                if (snapped === 0) return 0;
                return moveVisualRight ? snapped : -snapped;
            }
        } else {
            const nextOffset = currentOffset - step;
            if (nextOffset <= EDGE_SNAP_THRESHOLD) {
                if (currentOffset === 0) return 0;
                return moveVisualRight ? currentOffset : -currentOffset;
            }
        }
    }

    return delta;
}

/**
 * Computes the horizontal scroll delta needed to bring `item` fully into view while clearing `fadeReserve`,
 * snapping to the nearest scroll edge when the remaining distance is within `fadeReserve`.
 */
export function getScrollIntoViewDelta(
    viewport: HTMLElement,
    item: HTMLElement,
    fadeReserve: number,
    isRtl: boolean
): number {
    const vpRect = viewport.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const safeLeft = vpRect.left + fadeReserve;
    const safeRight = vpRect.right - fadeReserve;
    const availableWidth = safeRight - safeLeft;

    let delta = 0;
    if (itemRect.width > availableWidth) {
        delta = isRtl ? itemRect.right - safeRight : itemRect.left - safeLeft;
    } else if (itemRect.left < safeLeft - SUBPIXEL_TOLERANCE) {
        delta = itemRect.left - safeLeft;
    } else if (itemRect.right > safeRight + SUBPIXEL_TOLERANCE) {
        delta = itemRect.right - safeRight;
    }

    if (delta === 0) return 0;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (maxScroll > SUBPIXEL_TOLERANCE) {
        const currentOffset = Math.min(maxScroll, Math.max(0, Math.abs(viewport.scrollLeft)));
        const movingTowardEnd = isRtl ? delta < 0 : delta > 0;
        if (movingTowardEnd) {
            const remaining = maxScroll - (currentOffset + Math.abs(delta));
            if (remaining <= fadeReserve) {
                const snapped = Math.max(0, maxScroll - currentOffset);
                if (snapped === 0) return 0;
                return delta > 0 ? snapped : -snapped;
            }
        } else {
            const nextOffset = currentOffset - Math.abs(delta);
            if (nextOffset <= fadeReserve) {
                if (currentOffset === 0) return 0;
                return delta > 0 ? currentOffset : -currentOffset;
            }
        }
    }

    return delta;
}
