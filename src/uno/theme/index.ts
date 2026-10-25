import { colors } from "./colors.ts";
import { easeCurves } from "./easings.ts";

export const theme = {
    colors,
    ease: easeCurves(),
};

export { semanticColor, SHADES, colors } from "./colors.ts";
export { EASE_DIRS, EASE_FAMILIES, easeCurves } from "./easings.ts";

export { fonts } from "./fonts.ts";
