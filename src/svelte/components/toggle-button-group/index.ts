import type { HTMLAttributes } from "svelte/elements";

export { default as ToggleButtonGroup } from "./ToggleButtonGroup.svelte";
export { default as ToggleButtonGroupSeparator } from "./ToggleButtonGroupSeparator.svelte";

export interface ToggleButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
    orientation?: "horizontal" | "vertical";
}

export type ToggleButtonGroupSeparatorProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;
