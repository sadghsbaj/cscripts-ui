import type { Snippet } from "svelte";
import type { ClassValue, HTMLAttributes } from "svelte/elements";

export { default as Collapsible } from "./Collapsible.svelte";

export const COLLAPSIBLE_AXES = ["vertical", "horizontal"] as const;
export type CollapsibleAxis = (typeof COLLAPSIBLE_AXES)[number];

export const COLLAPSIBLE_MOTIONS = ["slide", "swell", "fade", "none"] as const;
export type CollapsibleMotion = (typeof COLLAPSIBLE_MOTIONS)[number];

export type CollapsibleState = "opening" | "open" | "closing" | "closed";

export interface CollapsibleProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    open?: boolean;
    axis?: CollapsibleAxis;
    motion?: CollapsibleMotion;
    animate?: boolean;
    collapsedSize?: string;
    fadeMask?: boolean;
    keepMounted?: boolean;
    disabled?: boolean;
    id?: string;
    class?: ClassValue;
    style?: string;
    children?: Snippet;
}
