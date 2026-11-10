/**
 * @description Svelte 5 DOM attachment that wires trigger elements to `<Popover />` surfaces.
 * Automatically derives the matching `--anchor-${target}` name and binds popover target
 * attributes (`popovertarget` / `interestfor`) using only the shared `target` ID.
 */

import type { Attachment } from "svelte/attachments";

export type PopoverTriggerOptions =
    | {
          target: string;
          mode?: "auto" | "hint";
      }
    | {
          target: string;
          mode: "manual";
      };

export function popoverTrigger(options: PopoverTriggerOptions): Attachment<HTMLElement> {
    return (node) => {
        node.style.setProperty("anchor-name", `--anchor-${options.target}`);

        if (options.mode !== "manual") {
            const attr = options.mode === "hint" ? "interestfor" : "popovertarget";
            node.setAttribute(attr, options.target);
        }

        return () => {
            node.style.removeProperty("anchor-name");
            node.removeAttribute("popovertarget");
            node.removeAttribute("interestfor");
        };
    };
}
