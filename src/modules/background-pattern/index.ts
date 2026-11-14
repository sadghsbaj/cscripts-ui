import type { SVGAttributes } from "svelte/elements";

export { default as BackgroundPattern } from "./BackgroundPattern.svelte";
export { default as BackgroundPatternVariants } from "./BackgroundPatternVariants.svelte";

export const BACKGROUND_PATTERN_VARIANTS = ["dots", "grid", "lines", "crosses", "hexagons", "topography"] as const;
export const BACKGROUND_PATTERN_SIZES = ["sm", "md", "lg"] as const;

/** Tile spacing in px per size. Actual tile size is rounded to fit the container edge-to-edge. */
export const BACKGROUND_PATTERN_SPACING = { sm: 16, md: 24, lg: 32 } as const satisfies Record<
    (typeof BACKGROUND_PATTERN_SIZES)[number],
    number
>;

export type BackgroundPatternVariant = (typeof BACKGROUND_PATTERN_VARIANTS)[number];
export type BackgroundPatternSize = (typeof BACKGROUND_PATTERN_SIZES)[number];

export interface BackgroundPatternProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
    variant: BackgroundPatternVariant;
    size: BackgroundPatternSize;
}
