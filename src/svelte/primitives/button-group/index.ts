import type { HTMLAttributes } from "svelte/elements";

export { default as ButtonGroup } from "./ButtonGroup.svelte";
export { default as ButtonGroupSeparator } from "./ButtonGroupSeparator.svelte";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
    orientation?: "horizontal" | "vertical";
}

export type ButtonGroupSeparatorProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;
