/**
 * @description Svelte 5 attachment that applies dynamic, hardware-accelerated alpha fade masks to scrollable containers.
 * Detects scroll position, container resizing, and dynamic content changes to smoothly blend content at scroll boundaries.
 */

import type { Attachment } from "svelte/attachments";

import "./scroll-fade.css";

export const SCROLL_FADE_DIRECTIONS = ["vertical", "horizontal", "both"] as const;
export const SCROLL_FADE_EDGES = ["both", "start", "end"] as const;
export const SCROLL_FADE_SIZES = ["sm", "md", "lg"] as const;

export type ScrollFadeDirection = (typeof SCROLL_FADE_DIRECTIONS)[number];
export type ScrollFadeEdge = (typeof SCROLL_FADE_EDGES)[number];
export type ScrollFadeSize = (typeof SCROLL_FADE_SIZES)[number];

export interface ScrollFadeState {
    canScrollStart: boolean;
    canScrollEnd: boolean;
    isScrollable: boolean;
    startFade: number;
    endFade: number;
}

export interface ScrollFadeDetail {
    element: HTMLElement;
    vertical: ScrollFadeState;
    horizontal: ScrollFadeState;
}

export interface ScrollFadeOptions {
    /**
     * Whether the scroll fade effect is enabled.
     * @default true
     */
    enabled?: boolean;

    /**
     * Maximum depth/size of the fade gradient in pixels or a preset ("sm" | "md" | "lg").
     * - `"sm"`: 24px (compact, ideal for dropdowns & tab strips)
     * - `"md"`: 40px (standard, balanced for cards and dialogs)
     * - `"lg"`: 64px (deep, prominent for full-height views)
     */
    size: ScrollFadeSize;

    /**
     * Scroll direction to observe and mask:
     * - `"vertical"`: Top and bottom edge fades (standard for vertical scrolling).
     * - `"horizontal"`: Left and right edge fades (ideal for carousels / tab strips).
     * - `"both"`: Both vertical and horizontal fades combined.
     */
    direction: ScrollFadeDirection;

    /**
     * Which edges should receive a fade mask:
     * - `"both"`: Fades both the start (top/left) and end (bottom/right) edges when scrolled.
     * - `"start"`: Fades only the start (top/left) edge.
     * - `"end"`: Fades only the end (bottom/right) edge.
     */
    edges: ScrollFadeEdge;

    /**
     * Distance in pixels before an edge is considered scrolled away from boundary.
     * @default 1
     */
    threshold?: number;

    /**
     * Smoothly scales the fade size from 0px up to `size` as the user scrolls away from the edge,
     * preventing abrupt binary mask popping.
     * @default true
     */
    smooth?: boolean;

    /**
     * Callback fired whenever the scroll fade states update.
     */
    onFadeChange?: (detail: ScrollFadeDetail) => void;
}

const DEFAULT_OPTIONS: Required<Omit<ScrollFadeOptions, "onFadeChange" | "size" | "direction" | "edges">> = {
    enabled: true,
    threshold: 1,
    smooth: true,
};

/**
 * Svelte 5 attachment that adds dynamic edge fade masks to any scrollable element.
 *
 * @example
 * ```svelte
 * <div class="overflow-y-auto max-h-80" {@attach scrollFade({ size: "md", direction: "vertical", edges: "both"  })}>
 *   {#each items as item}
 *     <div>{item}</div>
 *   {/each}
 * </div>
 * ```
 */
export function scrollFade(options: ScrollFadeOptions): Attachment<Element> {
    return (node: Element) => {
        if (!(node instanceof HTMLElement)) {
            return () => {};
        }
        if (options.enabled === false) {
            return () => {};
        }

        const opts = { ...DEFAULT_OPTIONS, ...options };

        // Cache last written CSS variables and data attributes to prevent unnecessary DOM mutations during scroll
        let lastTop = -1;
        let lastBottom = -1;
        let lastLeft = -1;
        let lastRight = -1;
        let lastCanScrollStart: boolean | null = null;
        let lastCanScrollEnd: boolean | null = null;
        let animationFrameId: number | null = null;

        node.classList.add("cs-scroll-fade");
        node.dataset.scrollFadeSize = opts.size;
        node.dataset.scrollFadeDirection = opts.direction;
        node.dataset.scrollFadeEdges = opts.edges;

        let fadeSize = 0;

        const readFadeSize = (): void => {
            const raw = getComputedStyle(node).getPropertyValue("--cs-scroll-fade-size");
            // eslint-disable-next-line unicorn/prefer-number-coercion
            fadeSize = Number.parseFloat(raw) || 0;
        };

        readFadeSize();

        /**
         * Calculates fade pixel values based on current scroll metrics.
         */
        const updateFades = (): void => {
            animationFrameId = null;

            const isVertical = opts.direction === "vertical" || opts.direction === "both";
            const isHorizontal = opts.direction === "horizontal" || opts.direction === "both";

            let topFade = 0;
            let bottomFade = 0;
            let leftFade = 0;
            let rightFade = 0;

            let canScrollTop = false;
            let canScrollBottom = false;
            let canScrollLeft = false;
            let canScrollRight = false;
            let isVerticallyScrollable = false;
            let isHorizontallyScrollable = false;

            // 1. Vertical calculation
            if (isVertical) {
                const scrollHeight = node.scrollHeight;
                const clientHeight = node.clientHeight;
                const rawScrollTop = node.scrollTop;
                const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
                isVerticallyScrollable = maxScrollTop > opts.threshold;

                if (isVerticallyScrollable) {
                    // Clamp scrollTop to [0, maxScrollTop] to guard against iOS/Safari rubber-band bounce
                    const clampedScrollTop = Math.max(0, Math.min(rawScrollTop, maxScrollTop));

                    if ((opts.edges === "both" || opts.edges === "start") && clampedScrollTop > opts.threshold) {
                        canScrollTop = true;
                        topFade = opts.smooth ? Math.min(fadeSize, clampedScrollTop) : fadeSize;
                    }

                    const remaining = maxScrollTop - clampedScrollTop;
                    if ((opts.edges === "both" || opts.edges === "end") && remaining > opts.threshold) {
                        canScrollBottom = true;
                        bottomFade = opts.smooth ? Math.min(fadeSize, remaining) : fadeSize;
                    }
                }

                // Write top/bottom CSS variables only when changed
                if (topFade !== lastTop) {
                    node.style.setProperty("--cs-scroll-fade-top", `${topFade}px`);
                    lastTop = topFade;
                }
                if (bottomFade !== lastBottom) {
                    node.style.setProperty("--cs-scroll-fade-bottom", `${bottomFade}px`);
                    lastBottom = bottomFade;
                }
            }

            // 2. Horizontal calculation
            if (isHorizontal) {
                const scrollWidth = node.scrollWidth;
                const clientWidth = node.clientWidth;
                // Use absolute value to safely support RTL and non-standard scroll metrics
                const rawScrollLeft = Math.abs(node.scrollLeft);
                const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);
                isHorizontallyScrollable = maxScrollLeft > opts.threshold;

                if (isHorizontallyScrollable) {
                    // Clamp scrollLeft to [0, maxScrollLeft] to guard against momentum bounce
                    const clampedScrollLeft = Math.max(0, Math.min(rawScrollLeft, maxScrollLeft));

                    if ((opts.edges === "both" || opts.edges === "start") && clampedScrollLeft > opts.threshold) {
                        canScrollLeft = true;
                        leftFade = opts.smooth ? Math.min(fadeSize, clampedScrollLeft) : fadeSize;
                    }

                    const remaining = maxScrollLeft - clampedScrollLeft;
                    if ((opts.edges === "both" || opts.edges === "end") && remaining > opts.threshold) {
                        canScrollRight = true;
                        rightFade = opts.smooth ? Math.min(fadeSize, remaining) : fadeSize;
                    }
                }

                // Write left/right CSS variables only when changed
                if (leftFade !== lastLeft) {
                    node.style.setProperty("--cs-scroll-fade-left", `${leftFade}px`);
                    lastLeft = leftFade;
                }
                if (rightFade !== lastRight) {
                    node.style.setProperty("--cs-scroll-fade-right", `${rightFade}px`);
                    lastRight = rightFade;
                }
            }

            const canScrollStart = canScrollTop || canScrollLeft;
            const canScrollEnd = canScrollBottom || canScrollRight;

            if (canScrollStart !== lastCanScrollStart) {
                node.dataset.scrollFadeCanScrollStart = String(canScrollStart);
                lastCanScrollStart = canScrollStart;
            }
            if (canScrollEnd !== lastCanScrollEnd) {
                node.dataset.scrollFadeCanScrollEnd = String(canScrollEnd);
                lastCanScrollEnd = canScrollEnd;
            }

            // Optional callback notification
            if (opts.onFadeChange) {
                opts.onFadeChange({
                    element: node,
                    vertical: {
                        canScrollStart: canScrollTop,
                        canScrollEnd: canScrollBottom,
                        isScrollable: isVerticallyScrollable,
                        startFade: topFade,
                        endFade: bottomFade,
                    },
                    horizontal: {
                        canScrollStart: canScrollLeft,
                        canScrollEnd: canScrollRight,
                        isScrollable: isHorizontallyScrollable,
                        startFade: leftFade,
                        endFade: rightFade,
                    },
                });
            }
        };

        const scheduleUpdate = (): void => {
            if (animationFrameId === null) {
                animationFrameId = requestAnimationFrame(updateFades);
            }
        };

        // Scroll listener (passive for native 60/120fps scrolling performance)
        node.addEventListener("scroll", scheduleUpdate, { passive: true });

        // ResizeObserver to detect dimension changes of the container and its content
        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                readFadeSize();
                scheduleUpdate();
            });
            resizeObserver.observe(node);

            // Also observe direct children to catch content size changes (e.g. accordions, items)
            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child instanceof HTMLElement) {
                    resizeObserver.observe(child);
                }
            }
        }

        // MutationObserver to track elements dynamically appended or removed from children
        let mutationObserver: MutationObserver | null = null;
        if (typeof MutationObserver !== "undefined") {
            mutationObserver = new MutationObserver(() => {
                // Re-observe any new children in ResizeObserver
                if (resizeObserver) {
                    for (let i = 0; i < node.children.length; i++) {
                        const child = node.children[i];
                        if (child instanceof HTMLElement) {
                            resizeObserver.observe(child);
                        }
                    }
                }
                scheduleUpdate();
            });

            mutationObserver.observe(node, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        // Initial measurement
        updateFades();

        // Teardown / Cleanup on element destruction
        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }

            node.removeEventListener("scroll", scheduleUpdate);

            if (resizeObserver) {
                resizeObserver.disconnect();
                resizeObserver = null;
            }

            if (mutationObserver) {
                mutationObserver.disconnect();
                mutationObserver = null;
            }

            // Remove applied styles
            node.classList.remove("cs-scroll-fade");
            delete node.dataset.scrollFadeSize;
            delete node.dataset.scrollFadeDirection;
            delete node.dataset.scrollFadeEdges;
            delete node.dataset.scrollFadeCanScrollStart;
            delete node.dataset.scrollFadeCanScrollEnd;
            node.style.removeProperty("--cs-scroll-fade-top");
            node.style.removeProperty("--cs-scroll-fade-bottom");
            node.style.removeProperty("--cs-scroll-fade-left");
            node.style.removeProperty("--cs-scroll-fade-right");
        };
    };
}
