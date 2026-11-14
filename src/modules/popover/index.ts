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

export const POPOVER_WIDTHS = ["content", "anchor", "min-anchor"] as const;
export type PopoverWidth = (typeof POPOVER_WIDTHS)[number];

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover"> {
    ref?: HTMLDivElement | null;
    id: string;
    popover?: "" | "auto" | "manual" | "hint";
    /** Whether to enable built-in directional spring animation. Defaults to `true`. */
    animate?: boolean;
    placement: PopoverPlacement;
    width: PopoverWidth;
    offset?: string;
}
