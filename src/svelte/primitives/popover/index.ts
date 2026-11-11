import type { HTMLAttributes } from "svelte/elements";

export { default as Popover } from "./Popover.svelte";
export * from "./popover.attach";

export const POPOVER_PLACEMENTS = [
    "top",
    "top-start",
    "top-end",
    "right",
    "right-start",
    "right-end",
    "bottom",
    "bottom-start",
    "bottom-end",
    "left",
    "left-start",
    "left-end",
] as const;
export type PopoverPlacement = (typeof POPOVER_PLACEMENTS)[number];

export const POPOVER_SIZES = ["content", "anchor", "min-anchor"] as const;
export type PopoverSize = (typeof POPOVER_SIZES)[number];

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover"> {
    id: string;
    popover?: "" | "auto" | "manual" | "hint";
    animate?: boolean;
    placement: PopoverPlacement;
    size: PopoverSize;
    offset?: string;
}
