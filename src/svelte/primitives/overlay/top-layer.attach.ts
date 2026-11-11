/**
 * @description Svelte 5 DOM attachment that automatically promotes an element with `[popover]`
 * to the browser's Top Layer upon mounting, and cleanly dismisses it upon unmount.
 */

import type { Attachment } from "svelte/attachments";

function attachTopLayer(node: HTMLElement): () => void {
    if (typeof node.showPopover === "function") {
        try {
            node.showPopover();
        } catch {
            // Ignore InvalidStateError if already open
        }
    }

    return () => {
        if (typeof node.hidePopover === "function") {
            try {
                if (node.matches?.(":popover-open")) {
                    node.hidePopover();
                }
            } catch {
                // Ignore InvalidStateError if already closed or detached
            }
        }
    };
}

/**
 * Automatically opens any `[popover]` element in the browser's Top Layer when mounted.
 *
 * @example
 * ```svelte
 * <div popover="manual" {@attach topLayer()}>
 *     ...
 * </div>
 * ```
 */
export function topLayer(): Attachment<HTMLElement> {
    return attachTopLayer;
}
