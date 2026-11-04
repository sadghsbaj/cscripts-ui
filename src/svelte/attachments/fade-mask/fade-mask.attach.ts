/**
 * @description Svelte 5 attachment that applies static alpha fade masks (radial, directional, symmetrical)
 * to HTML and SVG elements using modern CSS oklch gradients.
 */

import type { Attachment } from "svelte/attachments";

import "./fade-mask.css";

export const FADE_MASK_VARIANTS = ["radial", "top", "bottom", "left", "right", "block", "inline"] as const;
export const FADE_MASK_STRENGTHS = ["sm", "md", "lg"] as const;

export type FadeMaskVariant = (typeof FADE_MASK_VARIANTS)[number];
export type FadeMaskStrength = (typeof FADE_MASK_STRENGTHS)[number];

export interface FadeMaskOptions {
    /**
     * @default true
     */
    enabled?: boolean;

    /**
     * The shape and direction of the fade mask:
     * - `"radial"`: Centered vignette fading outwards to all edges.
     * - `"top"`: Linear fade towards the top edge.
     * - `"bottom"`: Linear fade towards the bottom edge.
     * - `"left"`: Linear fade towards the left edge.
     * - `"right"`: Linear fade towards the right edge.
     * - `"block"`: Symmetrical vertical fade on both top and bottom edges.
     * - `"inline"`: Symmetrical horizontal fade on both left and right edges.
     */
    variant: FadeMaskVariant;

    /**
     * Falloff strength / opacity curve preset:
     * - `"sm"`: Subtle edge softening (60% core, 100% boundary).
     * - `"md"`: Balanced natural vignette / fade (30% core, 90% boundary).
     * - `"lg"`: Dramatic focus fade (0% core, 75% boundary).
     */
    strength: FadeMaskStrength;
}

/**
 * Svelte 5 attachment that applies a hardware-accelerated CSS alpha gradient mask to any HTML or SVG element.
 *
 * @example
 * ```svelte
 * <div {@attach fadeMask({ variant: "radial", strength: "lg" })}>
 *   <BackgroundPattern variant="grid" size="md" />
 * </div>
 * ```
 */
export function fadeMask(options: FadeMaskOptions): Attachment<Element> {
    return (node: Element) => {
        if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
            return () => {};
        }
        if (options.enabled === false) {
            return () => {};
        }

        node.classList.add("cs-fade-mask");
        node.dataset.fadeMaskVariant = options.variant;
        node.dataset.fadeMaskStrength = options.strength;

        // Cleanup on unmount
        return () => {
            node.classList.remove("cs-fade-mask");
            delete node.dataset.fadeMaskVariant;
            delete node.dataset.fadeMaskStrength;
        };
    };
}
