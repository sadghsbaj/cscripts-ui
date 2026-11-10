import type { HTMLAttributes } from "svelte/elements";

export { default as Tooltip } from "./Tooltip.svelte";
export * from "./tooltip.attach.svelte";

export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, "id" | "popover" | "role"> {
    id: string;
    text?: string;
}
