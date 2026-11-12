/**
 * @description Svelte 5 attachment that applies dynamic, hardware-accelerated alpha fade masks to scrollable containers.
 * Driven entirely via CSS Scroll-Driven Animations and `@property` lengths on the GPU compositor thread.
 */

import type { Attachment } from "svelte/attachments";

import "./scroll-fade.attach.css";

export const SCROLL_FADE_DIRECTIONS = ["vertical", "horizontal", "both"] as const;
export const SCROLL_FADE_EDGES = ["both", "start", "end"] as const;
export const SCROLL_FADE_SIZES = ["sm", "md", "lg"] as const;

export type ScrollFadeDirection = (typeof SCROLL_FADE_DIRECTIONS)[number];
export type ScrollFadeEdge = (typeof SCROLL_FADE_EDGES)[number];
export type ScrollFadeSize = (typeof SCROLL_FADE_SIZES)[number];

export interface ScrollFadeOptions {
    /**
     * Whether the scroll fade effect is enabled.
     * @default true
     */
    enabled?: boolean;

    /**
     * Maximum depth/size of the fade gradient in presets ("sm" | "md" | "lg").
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
}

/**
 * Svelte 5 attachment that adds dynamic edge fade masks to any scrollable element.
 *
 * @example
 * ```svelte
 * <div class="overflow-y-auto max-h-80" {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}>
 *   {#each items as item}
 *     <div>{item}</div>
 *   {/each}
 * </div>
 * ```
 */
export function scrollFade(options: ScrollFadeOptions): Attachment<Element> {
    return (node: Element): (() => void) => {
        if (!(node instanceof HTMLElement)) {
            return (): void => {};
        }
        if (options.enabled === false) {
            return (): void => {};
        }

        node.classList.add("cs-scroll-fade");
        node.dataset.scrollFadeSize = options.size;
        node.dataset.scrollFadeDirection = options.direction;
        node.dataset.scrollFadeEdges = options.edges;

        return (): void => {
            node.classList.remove("cs-scroll-fade");
            delete node.dataset.scrollFadeSize;
            delete node.dataset.scrollFadeDirection;
            delete node.dataset.scrollFadeEdges;
        };
    };
}
