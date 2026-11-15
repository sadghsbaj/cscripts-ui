import type { Attachment } from "svelte/attachments";

import type { ScrollAreaDirection, ScrollAreaScrollbar, ScrollAreaSize } from "./index.ts";

export type ScrollbarAxis = "vertical" | "horizontal";

const MIN_THUMB_SIZE = 28;
const TRACK_START_INSET = 3;
const TRACK_END_INSET = 3;
const TRACK_CORNER_GAP = 6;
const TRACK_SIZE_PX: Record<ScrollAreaSize, number> = {
    sm: 6,
    md: 8,
    lg: 12,
};
const SCROLL_IDLE_DELAY_MS = 700;

export interface ScrollAreaStateOptions {
    getSize: () => ScrollAreaSize;
    getDirection: () => ScrollAreaDirection;
    getScrollbar: () => ScrollAreaScrollbar;
}

/**
 * Per-instance reactive state controller for `<ScrollArea />`.
 *
 * Architectural Notes:
 * - Native Scroll Preservation: All scrolling happens natively on `.cs-scroll-area-content`.
 *   JavaScript only observes scroll metrics to drive custom overlay thumb transforms.
 */
export class ScrollAreaManager {
    readonly #options: ScrollAreaStateOptions;

    canScrollY = $state(false);
    canScrollX = $state(false);
    thumbYSize = $state(0);
    thumbYOffset = $state(0);
    thumbXSize = $state(0);
    thumbXOffset = $state(0);
    isScrolling = $state(false);
    draggingAxis: ScrollbarAxis | null = $state(null);

    #contentEl: HTMLElement | null = null;
    #maxScrollTop = 0;
    #maxScrollLeft = 0;
    #maxThumbTop = 0;
    #maxThumbLeft = 0;
    #dragStartPointer = 0;
    #dragStartScroll = 0;
    #animationFrameId: number | null = null;
    #scrollingTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: ScrollAreaStateOptions) {
        this.#options = options;
    }

    get size(): ScrollAreaSize {
        return this.#options.getSize();
    }

    get direction(): ScrollAreaDirection {
        return this.#options.getDirection();
    }

    get scrollbar(): ScrollAreaScrollbar {
        return this.#options.getScrollbar();
    }

    get isVertical(): boolean {
        return this.direction === "vertical" || this.direction === "both";
    }

    get isHorizontal(): boolean {
        return this.direction === "horizontal" || this.direction === "both";
    }

    updateMetrics = (): void => {
        this.#animationFrameId = null;
        const el = this.#contentEl;
        if (!el) return;

        const clientHeight = el.clientHeight;
        const scrollHeight = el.scrollHeight;
        const clientWidth = el.clientWidth;
        const scrollWidth = el.scrollWidth;

        const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
        const maxScrollLeft = Math.max(0, scrollWidth - clientWidth);

        this.#maxScrollTop = maxScrollTop;
        this.#maxScrollLeft = maxScrollLeft;

        const canScrollY = this.isVertical && maxScrollTop > 1;
        const canScrollX = this.isHorizontal && maxScrollLeft > 1;

        this.canScrollY = canScrollY;
        this.canScrollX = canScrollX;

        const cornerInset = TRACK_SIZE_PX[this.size] + TRACK_CORNER_GAP;

        if (canScrollY) {
            const endInset = canScrollX ? cornerInset : TRACK_END_INSET;
            const trackHeight = Math.max(0, clientHeight - TRACK_START_INSET - endInset);
            const thumbHeight = Math.min(
                trackHeight,
                Math.max(MIN_THUMB_SIZE, Math.round((clientHeight / scrollHeight) * trackHeight))
            );
            const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
            const clampedScrollTop = Math.max(0, Math.min(el.scrollTop, maxScrollTop));

            this.#maxThumbTop = maxThumbTop;
            this.thumbYSize = thumbHeight;
            this.thumbYOffset =
                maxScrollTop > 0 ? Math.round((clampedScrollTop / maxScrollTop) * maxThumbTop * 100) / 100 : 0;
        } else {
            this.#maxThumbTop = 0;
            this.thumbYSize = 0;
            this.thumbYOffset = 0;
        }

        if (canScrollX) {
            const endInset = canScrollY ? cornerInset : TRACK_END_INSET;
            const trackWidth = Math.max(0, clientWidth - TRACK_START_INSET - endInset);
            const thumbWidth = Math.min(
                trackWidth,
                Math.max(MIN_THUMB_SIZE, Math.round((clientWidth / scrollWidth) * trackWidth))
            );
            const maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
            const clampedScrollLeft = Math.max(0, Math.min(Math.abs(el.scrollLeft), maxScrollLeft));

            this.#maxThumbLeft = maxThumbLeft;
            this.thumbXSize = thumbWidth;
            this.thumbXOffset =
                maxScrollLeft > 0 ? Math.round((clampedScrollLeft / maxScrollLeft) * maxThumbLeft * 100) / 100 : 0;
        } else {
            this.#maxThumbLeft = 0;
            this.thumbXSize = 0;
            this.thumbXOffset = 0;
        }
    };

    scheduleUpdate = (): void => {
        if (this.#animationFrameId === null) {
            this.#animationFrameId = requestAnimationFrame(this.updateMetrics);
        }
    };

    handleScroll = (): void => {
        this.isScrolling = true;
        if (this.#scrollingTimer !== null) {
            clearTimeout(this.#scrollingTimer);
        }
        this.#scrollingTimer = setTimeout(() => {
            this.#scrollingTimer = null;
            this.isScrolling = false;
        }, SCROLL_IDLE_DELAY_MS);

        this.scheduleUpdate();
    };

    handleTrackPointerDown = (axis: ScrollbarAxis, event: PointerEvent): void => {
        if (event.button !== 0 || event.target !== event.currentTarget || !this.#contentEl) return;
        event.preventDefault();

        const trackEl = event.currentTarget as HTMLElement;
        const rect = trackEl.getBoundingClientRect();

        if (axis === "vertical") {
            const clickOffset = event.clientY - rect.top - this.thumbYSize / 2;
            const progress = this.#maxThumbTop > 0 ? Math.max(0, Math.min(1, clickOffset / this.#maxThumbTop)) : 0;
            this.#contentEl.scrollTo({ top: progress * this.#maxScrollTop, behavior: "smooth" });
        } else {
            const clickOffset = event.clientX - rect.left - this.thumbXSize / 2;
            const progress = this.#maxThumbLeft > 0 ? Math.max(0, Math.min(1, clickOffset / this.#maxThumbLeft)) : 0;
            this.#contentEl.scrollTo({ left: progress * this.#maxScrollLeft, behavior: "smooth" });
        }
    };

    handleThumbPointerDown = (axis: ScrollbarAxis, event: PointerEvent): void => {
        if (event.button !== 0 || !this.#contentEl) return;
        event.preventDefault();
        event.stopPropagation();

        const thumbEl = event.currentTarget as HTMLElement;
        thumbEl.setPointerCapture(event.pointerId);

        this.draggingAxis = axis;
        this.#dragStartPointer = axis === "vertical" ? event.clientY : event.clientX;
        this.#dragStartScroll = axis === "vertical" ? this.#contentEl.scrollTop : this.#contentEl.scrollLeft;
    };

    handleThumbPointerMove = (axis: ScrollbarAxis, event: PointerEvent): void => {
        if (this.draggingAxis !== axis || !this.#contentEl) return;

        const currentPointer = axis === "vertical" ? event.clientY : event.clientX;
        const deltaPointer = currentPointer - this.#dragStartPointer;

        if (axis === "vertical") {
            const ratio = this.#maxThumbTop > 0 ? this.#maxScrollTop / this.#maxThumbTop : 0;
            this.#contentEl.scrollTop = this.#dragStartScroll + deltaPointer * ratio;
        } else {
            const ratio = this.#maxThumbLeft > 0 ? this.#maxScrollLeft / this.#maxThumbLeft : 0;
            this.#contentEl.scrollLeft = this.#dragStartScroll + deltaPointer * ratio;
        }
    };

    handleThumbPointerUp = (axis: ScrollbarAxis): void => {
        if (this.draggingAxis === axis) {
            this.draggingAxis = null;
        }
    };

    attachTrack =
        (axis: ScrollbarAxis): Attachment<HTMLElement> =>
        (node: HTMLElement) => {
            const onPointerDown = (event: PointerEvent): void => {
                this.handleTrackPointerDown(axis, event);
            };

            node.addEventListener("pointerdown", onPointerDown);
            return () => {
                node.removeEventListener("pointerdown", onPointerDown);
            };
        };

    attachThumb =
        (axis: ScrollbarAxis): Attachment<HTMLElement> =>
        (node: HTMLElement) => {
            const onPointerDown = (event: PointerEvent): void => {
                this.handleThumbPointerDown(axis, event);
            };
            const onPointerMove = (event: PointerEvent): void => {
                this.handleThumbPointerMove(axis, event);
            };
            const onPointerUp = (): void => {
                this.handleThumbPointerUp(axis);
            };

            node.addEventListener("pointerdown", onPointerDown);
            node.addEventListener("pointermove", onPointerMove);
            node.addEventListener("pointerup", onPointerUp);
            node.addEventListener("pointercancel", onPointerUp);
            node.addEventListener("lostpointercapture", onPointerUp);

            return () => {
                node.removeEventListener("pointerdown", onPointerDown);
                node.removeEventListener("pointermove", onPointerMove);
                node.removeEventListener("pointerup", onPointerUp);
                node.removeEventListener("pointercancel", onPointerUp);
                node.removeEventListener("lostpointercapture", onPointerUp);
            };
        };

    attachContent: Attachment<HTMLElement> = (node: HTMLElement) => {
        this.#contentEl = node;

        node.addEventListener("scroll", this.handleScroll, { passive: true });

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(this.scheduleUpdate);
            resizeObserver.observe(node);

            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i];
                if (child instanceof HTMLElement) {
                    resizeObserver.observe(child);
                }
            }
        }

        let mutationObserver: MutationObserver | null = null;
        if (typeof MutationObserver !== "undefined") {
            mutationObserver = new MutationObserver(() => {
                if (resizeObserver) {
                    for (let i = 0; i < node.children.length; i++) {
                        const child = node.children[i];
                        if (child instanceof HTMLElement) {
                            resizeObserver.observe(child);
                        }
                    }
                }
                this.scheduleUpdate();
            });

            mutationObserver.observe(node, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        this.updateMetrics();

        return () => {
            if (this.#animationFrameId !== null) {
                cancelAnimationFrame(this.#animationFrameId);
                this.#animationFrameId = null;
            }

            if (this.#scrollingTimer !== null) {
                clearTimeout(this.#scrollingTimer);
                this.#scrollingTimer = null;
            }

            node.removeEventListener("scroll", this.handleScroll);

            resizeObserver?.disconnect();
            mutationObserver?.disconnect();

            this.#contentEl = null;
        };
    };
}
