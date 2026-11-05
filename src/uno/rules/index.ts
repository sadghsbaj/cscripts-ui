import type { Rule } from "unocss";

import { colorRules } from "./colors.ts";
import { scrollbarRules } from "./scrollbar.ts";
import { shapeRules } from "./shapes.ts";
import { typographyRules } from "./typography.ts";

export const rules: Rule[] = [...colorRules, ...shapeRules, ...typographyRules, ...scrollbarRules];

export { colorRules } from "./colors.ts";
export { scrollbarRules } from "./scrollbar.ts";
export { shapeRules } from "./shapes.ts";
export { typographyRules } from "./typography.ts";
