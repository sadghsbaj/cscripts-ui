import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";

export interface DataTableScrollState {
    scrolledY: boolean;
    scrolledXStart: boolean;
    scrolledXEnd: boolean;
    isScrolling: boolean;
    viewportWidth: number;
}

export interface DataTableScrollOptions {
    enabled?: boolean | (() => boolean);
    onStateChange: (state: DataTableScrollState) => void;
}

const SCROLL_IDLE_MS = 140;

/**
 * Passive rAF-coalesced scroll and viewport width observer for `.cs-data-table-viewport`.
 */
export function dataTableScrollState(options: DataTableScrollOptions): Attachment<HTMLElement> {
    return (node) => {
        if (!(resolveGetter(options.enabled) ?? true)) {
            return () => {};
        }

        let rafId: number | null = null;
        let idleTimer: ReturnType<typeof setTimeout> | null = null;
        let isScrolling = false;

        let lastState: DataTableScrollState = {
            scrolledY: false,
            scrolledXStart: false,
            scrolledXEnd: false,
            isScrolling: false,
            viewportWidth: 0,
        };

        function emitIfChanged(next: DataTableScrollState): void {
            if (
                next.scrolledY === lastState.scrolledY &&
                next.scrolledXStart === lastState.scrolledXStart &&
                next.scrolledXEnd === lastState.scrolledXEnd &&
                next.isScrolling === lastState.isScrolling &&
                next.viewportWidth === lastState.viewportWidth
            ) {
                return;
            }
            lastState = next;
            options.onStateChange(next);
        }

        function measure(): void {
            const scrolledY = node.scrollTop > 0.5;
            const maxScrollX = Math.max(0, node.scrollWidth - node.clientWidth);

            let scrolledXStart = false;
            let scrolledXEnd = false;

            if (maxScrollX > 1) {
                // Math.abs handles negative RTL scrollLeft coordinates in modern Chromium.
                const offsetStart = Math.abs(node.scrollLeft);
                const offsetEnd = Math.max(0, maxScrollX - offsetStart);
                scrolledXStart = offsetStart > 1;
                scrolledXEnd = offsetEnd > 1;
            }

            emitIfChanged({
                scrolledY,
                scrolledXStart,
                scrolledXEnd,
                isScrolling,
                viewportWidth: node.clientWidth,
            });
        }

        function scheduleMeasure(): void {
            if (rafId !== null) return;
            if (typeof requestAnimationFrame === "undefined") {
                measure();
                return;
            }
            rafId = requestAnimationFrame(() => {
                rafId = null;
                measure();
            });
        }

        function handleScroll(): void {
            if (!isScrolling) {
                isScrolling = true;
                emitIfChanged({
                    ...lastState,
                    isScrolling: true,
                });
            }

            if (idleTimer !== null) {
                clearTimeout(idleTimer);
            }
            idleTimer = setTimeout(() => {
                idleTimer = null;
                isScrolling = false;
                measure();
            }, SCROLL_IDLE_MS);

            scheduleMeasure();
        }

        node.addEventListener("scroll", handleScroll, { passive: true });

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(() => {
                scheduleMeasure();
            });
            resizeObserver.observe(node);
            const canvas = node.firstElementChild;
            if (canvas instanceof HTMLElement) {
                resizeObserver.observe(canvas);
            }
        }

        measure();

        return () => {
            node.removeEventListener("scroll", handleScroll);
            resizeObserver?.disconnect();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            if (idleTimer !== null) {
                clearTimeout(idleTimer);
                idleTimer = null;
            }
        };
    };
}
