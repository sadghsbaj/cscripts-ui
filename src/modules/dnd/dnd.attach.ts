import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import type { DragHandleOptions } from "./dnd.types.ts";
import "./dnd.attach.css";

/**
 * Standalone Svelte 5 attachment that marks an element as an explicit drag handle.
 * Works in decoupled child components without requiring `getDndContext()`.
 */
export function dragHandle(options?: DragHandleOptions): Attachment<HTMLElement> {
    return (node: HTMLElement): (() => void) => {
        const isEnabled = resolveGetter(options?.enabled) ?? true;
        if (!isEnabled) {
            return (): void => {};
        }

        node.dataset.dndHandle = "";

        return (): void => {
            delete node.dataset.dndHandle;
        };
    };
}
