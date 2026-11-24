import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import type { CommandPaletteShortcutConfig, CommandPaletteShortcutOptions } from "./index.ts";
import { isEditableTarget, isMacLikePlatform } from "./command-palette-utils.internal.ts";

export function matchesCommandPaletteShortcut(
    event: KeyboardEvent,
    config?: CommandPaletteShortcutConfig
): boolean {
    if (event.isComposing) return false;

    const targetKey = (config?.key ?? "k").toLowerCase();
    if (event.key.toLowerCase() !== targetKey) return false;

    const requireShift = config?.shiftKey ?? false;
    if (event.shiftKey !== requireShift) return false;

    const requireAlt = config?.altKey ?? false;
    if (event.altKey !== requireAlt) return false;

    const requireMod = config?.mod ?? true;
    if (requireMod) {
        const isMac = isMacLikePlatform();
        const modPressed = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
        if (!modPressed) return false;
    } else if (event.metaKey || event.ctrlKey) {
        return false;
    }

    const ignoreInputs = config?.ignoreInputs ?? true;
    return !(ignoreInputs && isEditableTarget(event.target));
}

export function commandPaletteShortcut(options?: CommandPaletteShortcutOptions): Attachment<HTMLElement> {
    function handleKeyDown(event: KeyboardEvent): void {
        if (!resolveGetter(options?.enabled ?? true)) return;
        if (!matchesCommandPaletteShortcut(event, options)) return;

        event.preventDefault();
        options?.onTrigger?.(event);
    }

    return (node) => {
        const targetWindow = node.ownerDocument.defaultView;
        if (!targetWindow) return;

        targetWindow.addEventListener("keydown", handleKeyDown);

        return () => {
            targetWindow.removeEventListener("keydown", handleKeyDown);
        };
    };
}
