import type { HTMLAttributes } from "svelte/elements";

export { default as ButtonGroup } from "./ButtonGroup.svelte";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
    orientation?: "horizontal" | "vertical";
    separators?: boolean;
}
