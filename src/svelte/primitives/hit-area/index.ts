import type { HTMLAttributes } from "svelte/elements";

export { default as HitArea } from "./HitArea.svelte";

export const HIT_AREA_SIZES = ["sm", "md", "lg"] as const;

export type HitAreaSize = (typeof HIT_AREA_SIZES)[number];

export interface HitAreaProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    size: HitAreaSize;
}
