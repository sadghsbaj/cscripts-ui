import type { DndAutoScrollOptions, DndPoint } from "./dnd.types.ts";

interface LockedEdges {
    top: number | null;
    bottom: number | null;
    left: number | null;
    right: number | null;
}

interface ScrollTarget {
    element: HTMLElement;
    isViewport: boolean;
    locked: LockedEdges;
}

const DEFAULT_EDGE_SIZE = 48;
const DEFAULT_MIN_SPEED = 60;
const DEFAULT_MAX_SPEED = 900;
const MAX_DT_SECONDS = 0.05;
const EDGE_UNLOCK_TRAVEL_PX = 8;

const SCROLLABLE_OVERFLOWS = new Set(["auto", "scroll", "overlay"]);

function isScrollableOverflow(value: string): boolean {
    return SCROLLABLE_OVERFLOWS.has(value);
}

function getScrollBounds(target: ScrollTarget): { left: number; top: number; right: number; bottom: number } {
    if (target.isViewport) {
        return {
            left: 0,
            top: 0,
            right: window.innerWidth,
            bottom: window.innerHeight,
        };
    }
    const rect = target.element.getBoundingClientRect();
    return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
    };
}

function discoverScrollAncestors(originElement: HTMLElement | null): ScrollTarget[] {
    const targets: ScrollTarget[] = [];
    const seen = new Set<HTMLElement>();

    let current: HTMLElement | null = originElement;
    while (current && current !== document.body && current !== document.documentElement) {
        const style = window.getComputedStyle(current);
        const canScrollY = isScrollableOverflow(style.overflowY) && current.scrollHeight > current.clientHeight;
        const canScrollX = isScrollableOverflow(style.overflowX) && current.scrollWidth > current.clientWidth;

        if ((canScrollY || canScrollX) && !seen.has(current)) {
            seen.add(current);
            targets.push({
                element: current,
                isViewport: false,
                locked: { top: null, bottom: null, left: null, right: null },
            });
        }
        current = current.parentElement;
    }

    const docEl = document.scrollingElement;
    if (
        docEl instanceof HTMLElement &&
        !seen.has(docEl) &&
        (docEl.scrollHeight > window.innerHeight || docEl.scrollWidth > window.innerWidth)
    ) {
        targets.push({
            element: docEl,
            isViewport: true,
            locked: { top: null, bottom: null, left: null, right: null },
        });
    }

    return targets;
}

/**
 * Delta-time normalized RAF auto-scroll engine with quadratic edge acceleration
 * and initial-edge guard. Works seamlessly with native overflow containers and
 * `ScrollAreaContent` (`.cs-scroll-area-content`) with zero cross-module coupling.
 */
export class AutoScrollEngine {
    private rafId: number | null = null;
    private lastTimestamp = 0;
    private pointer: DndPoint = { x: 0, y: 0 };
    private targets: ScrollTarget[] = [];
    private edgeSize = DEFAULT_EDGE_SIZE;
    private minSpeed = DEFAULT_MIN_SPEED;
    private maxSpeed = DEFAULT_MAX_SPEED;
    private initialEdgeGuard = true;
    private onScrollTick: (() => void) | null = null;

    start(
        initialPointer: DndPoint,
        originElement: HTMLElement | null,
        options: DndAutoScrollOptions,
        onScrollTick: () => void,
    ): void {
        this.stop();

        this.pointer = { x: initialPointer.x, y: initialPointer.y };
        this.edgeSize = options.edgeSize ?? DEFAULT_EDGE_SIZE;
        this.minSpeed = options.minSpeed ?? DEFAULT_MIN_SPEED;
        this.maxSpeed = options.maxSpeed ?? DEFAULT_MAX_SPEED;
        this.initialEdgeGuard = options.initialEdgeGuard ?? true;
        this.onScrollTick = onScrollTick;
        this.targets = discoverScrollAncestors(originElement);

        if (this.initialEdgeGuard) {
            this.recordInitialEdges(initialPointer);
        }

        if (this.targets.length === 0) return;

        this.lastTimestamp = performance.now();
        this.rafId = requestAnimationFrame(this.tick);
    }

    updatePointer(pointer: DndPoint, hoveredElement?: HTMLElement | null): void {
        this.pointer = { x: pointer.x, y: pointer.y };

        if (hoveredElement) {
            const discovered = discoverScrollAncestors(hoveredElement);
            for (const nextTarget of discovered) {
                if (this.targets.every((existing) => existing.element !== nextTarget.element)) {
                    this.targets.push(nextTarget);
                }
            }
            if (this.targets.length > 0 && this.rafId === null && this.onScrollTick) {
                this.lastTimestamp = performance.now();
                this.rafId = requestAnimationFrame(this.tick);
            }
        }
    }

    stop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.targets = [];
        this.onScrollTick = null;
    }

    private recordInitialEdges(pointer: DndPoint): void {
        for (const target of this.targets) {
            const bounds = getScrollBounds(target);
            const width = bounds.right - bounds.left;
            const height = bounds.bottom - bounds.top;
            const effEdgeX = Math.min(this.edgeSize, width * 0.25);
            const effEdgeY = Math.min(this.edgeSize, height * 0.25);

            const distTop = pointer.y - bounds.top;
            const distBottom = bounds.bottom - pointer.y;
            const distLeft = pointer.x - bounds.left;
            const distRight = bounds.right - pointer.x;

            if (distTop >= 0 && distTop < effEdgeY) {
                target.locked.top = distTop;
            }
            if (distBottom >= 0 && distBottom < effEdgeY) {
                target.locked.bottom = distBottom;
            }
            if (distLeft >= 0 && distLeft < effEdgeX) {
                target.locked.left = distLeft;
            }
            if (distRight >= 0 && distRight < effEdgeX) {
                target.locked.right = distRight;
            }
        }
    }

    private computeEdgeVelocity(
        distanceFromEdge: number,
        effectiveEdge: number,
        lockedDistance: number | null,
        onUnlock: () => void,
    ): number {
        if (distanceFromEdge >= effectiveEdge) {
            if (lockedDistance !== null) {
                onUnlock();
            }
            return 0;
        }

        if (lockedDistance !== null) {
            // Unlock once pointer moves >= 8px deeper toward the edge.
            if (distanceFromEdge <= lockedDistance - EDGE_UNLOCK_TRAVEL_PX) {
                onUnlock();
            } else {
                return 0;
            }
        }

        const clampedDist = Math.max(0, distanceFromEdge);
        const penetration = 1 - clampedDist / Math.max(effectiveEdge, 1);
        return this.minSpeed + (this.maxSpeed - this.minSpeed) * penetration * penetration;
    }

    private tick = (now: number): void => {
        const dt = Math.min(Math.max((now - this.lastTimestamp) / 1000, 0), MAX_DT_SECONDS);
        this.lastTimestamp = now;

        let didScroll = false;

        for (const target of this.targets) {
            const bounds = getScrollBounds(target);
            if (
                this.pointer.x < bounds.left - this.edgeSize ||
                this.pointer.x > bounds.right + this.edgeSize ||
                this.pointer.y < bounds.top - this.edgeSize ||
                this.pointer.y > bounds.bottom + this.edgeSize
            ) {
                continue;
            }

            const width = bounds.right - bounds.left;
            const height = bounds.bottom - bounds.top;
            const effEdgeX = Math.min(this.edgeSize, width * 0.25);
            const effEdgeY = Math.min(this.edgeSize, height * 0.25);

            const el = target.element;
            let vy = 0;
            let vx = 0;

            const distTop = this.pointer.y - bounds.top;
            const distBottom = bounds.bottom - this.pointer.y;
            if (distTop < effEdgeY && el.scrollTop > 0) {
                vy = -this.computeEdgeVelocity(distTop, effEdgeY, target.locked.top, () => {
                    target.locked.top = null;
                });
            } else if (distBottom < effEdgeY && el.scrollTop < el.scrollHeight - el.clientHeight) {
                vy = this.computeEdgeVelocity(distBottom, effEdgeY, target.locked.bottom, () => {
                    target.locked.bottom = null;
                });
            } else {
                target.locked.top = null;
                target.locked.bottom = null;
            }

            const distLeft = this.pointer.x - bounds.left;
            const distRight = bounds.right - this.pointer.x;
            if (distLeft < effEdgeX && el.scrollLeft > 0) {
                vx = -this.computeEdgeVelocity(distLeft, effEdgeX, target.locked.left, () => {
                    target.locked.left = null;
                });
            } else if (distRight < effEdgeX && el.scrollLeft < el.scrollWidth - el.clientWidth) {
                vx = this.computeEdgeVelocity(distRight, effEdgeX, target.locked.right, () => {
                    target.locked.right = null;
                });
            } else {
                target.locked.left = null;
                target.locked.right = null;
            }

            if (vy !== 0) {
                const prevTop = el.scrollTop;
                el.scrollTop = prevTop + vy * dt;
                if (el.scrollTop !== prevTop) {
                    didScroll = true;
                }
            }

            if (vx !== 0) {
                const prevLeft = el.scrollLeft;
                el.scrollLeft = prevLeft + vx * dt;
                if (el.scrollLeft !== prevLeft) {
                    didScroll = true;
                }
            }
        }

        if (didScroll) {
            this.onScrollTick?.();
        }

        this.rafId = requestAnimationFrame(this.tick);
    };
}
