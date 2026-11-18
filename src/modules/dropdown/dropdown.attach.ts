import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import { getDropdownContext } from "./dropdown.context.internal.ts";
import type { DropdownTriggerOptions } from "./index.ts";
import { popoverTrigger } from "../popover/index.ts";

export function dropdownTrigger(options?: DropdownTriggerOptions): Attachment<HTMLElement> {
    const dropdown = getDropdownContext();

    return (node) => {
        const isEnabled = (): boolean => (resolveGetter(options?.enabled) ?? true) && !dropdown.disabled;
        const triggerOn = options?.triggerOn ?? "pointerdown";
        const menuId = dropdown.menuId;

        const unregisterTrigger = dropdown.registerTrigger(node);
        const existingId = node.getAttribute("id");
        let unregisterTriggerId: (() => void) | undefined;
        let didSetId = false;

        if (existingId) {
            unregisterTriggerId = dropdown.registerTriggerId(existingId);
        } else {
            node.id = untrack(() => dropdown.triggerId);
            didSetId = true;
        }

        const isOpenInitial = untrack(() => dropdown.open);
        node.setAttribute("aria-haspopup", "menu");
        node.setAttribute("aria-controls", menuId);
        node.setAttribute("aria-expanded", isOpenInitial ? "true" : "false");
        if (isOpenInitial) {
            node.dataset.open = "";
        } else {
            delete node.dataset.open;
        }

        let suppressSpaceKeyUp = false;

        function handlePointerDown(event: PointerEvent): void {
            suppressSpaceKeyUp = false;
            if (!isEnabled() || triggerOn !== "pointerdown") return;
            if (event.pointerType !== "mouse" || event.button !== 0) return;

            if (!dropdown.open) {
                dropdown.beginPointerOpen(event.clientX, event.clientY);
            } else {
                dropdown.clearPointerOpen();
            }
        }

        function handleKeyDown(event: KeyboardEvent): void {
            if (event.defaultPrevented || !isEnabled()) return;

            if (dropdown.open) {
                if (event.key === "Escape") {
                    event.preventDefault();
                    dropdown.setOpen(false, { restoreFocus: true });
                }
                return;
            }

            if (event.key === "ArrowDown" || event.key === "Enter") {
                event.preventDefault();
                dropdown.setOpen(true, { openFocus: "first" });
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                dropdown.setOpen(true, { openFocus: "last" });
                return;
            }

            if (event.key === " ") {
                event.preventDefault();
                suppressSpaceKeyUp = true;
                dropdown.setOpen(true, { openFocus: "first" });
            }
        }

        function handleKeyUp(event: KeyboardEvent): void {
            if (event.key !== " " || !suppressSpaceKeyUp) return;
            suppressSpaceKeyUp = false;
            event.preventDefault();
        }

        // Register pointerdown before popoverTrigger so beginPointerOpen sees pre-toggle open state.
        node.addEventListener("pointerdown", handlePointerDown);
        node.addEventListener("keydown", handleKeyDown);
        node.addEventListener("keyup", handleKeyUp);

        const cleanupPopover = popoverTrigger({
            target: menuId,
            triggerOn,
            enabled: isEnabled,
        })(node);

        return () => {
            cleanupPopover?.();
            node.removeEventListener("pointerdown", handlePointerDown);
            node.removeEventListener("keydown", handleKeyDown);
            node.removeEventListener("keyup", handleKeyUp);
            node.removeAttribute("aria-haspopup");
            node.removeAttribute("aria-expanded");
            node.removeAttribute("aria-controls");
            delete node.dataset.open;
            if (didSetId) {
                node.removeAttribute("id");
            }
            unregisterTriggerId?.();
            unregisterTrigger();
        };
    };
}
