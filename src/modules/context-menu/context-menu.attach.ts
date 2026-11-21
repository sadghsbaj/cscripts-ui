import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import { getContextMenuContext } from "./context-menu.context.internal.ts";
import type { ContextMenuTriggerOptions } from "./index.ts";

export function contextMenuTrigger(options?: ContextMenuTriggerOptions): Attachment<HTMLElement> {
    const contextMenu = getContextMenuContext();
    const isEnabled = (): boolean => (resolveGetter(options?.enabled) ?? true) && !contextMenu.disabled;

    return (node) => {

        function handleContextMenu(event: MouseEvent): void {
            if (event.defaultPrevented || !isEnabled()) return;
            event.preventDefault();
            contextMenu.openAt(node, event.clientX, event.clientY, "pointer", event, options?.onOpen);
        }

        function handleKeyDown(event: KeyboardEvent): void {
            if (event.defaultPrevented || !isEnabled()) return;
            const isContextShortcut = (event.shiftKey && event.key === "F10") || event.key === "ContextMenu";
            if (!isContextShortcut) return;

            event.preventDefault();
            const activeEl = typeof document !== "undefined" ? document.activeElement : null;
            const target = activeEl instanceof HTMLElement && node.contains(activeEl) ? activeEl : node;
            const rect = target.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            contextMenu.openAt(node, x, y, "keyboard", event, options?.onOpen);
        }

        node.addEventListener("contextmenu", handleContextMenu);
        node.addEventListener("keydown", handleKeyDown);

        return () => {
            node.removeEventListener("contextmenu", handleContextMenu);
            node.removeEventListener("keydown", handleKeyDown);
            contextMenu.unregisterTrigger(node);
        };
    };
}
