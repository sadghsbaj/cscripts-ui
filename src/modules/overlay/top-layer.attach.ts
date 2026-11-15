import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";

export interface TopLayerOptions {
    /**
     * Whether the top-layer promotion is active.
     * @default true
     */
    enabled?: boolean | (() => boolean);
}

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
export function topLayer(options?: TopLayerOptions): Attachment<HTMLElement> {
    return (node: HTMLElement) => {
        if (!(resolveGetter(options?.enabled) ?? true)) {
            return () => {};
        }
        return attachTopLayer(node);
    };
}
