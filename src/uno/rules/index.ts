import type { Rule } from "unocss";

import { colorRules } from "./colors";
import { scrollbarRules } from "./scrollbar";
import { shapeRules } from "./shapes";
import { typographyRules } from "./typography";

export const rules: Rule[] = [...colorRules, ...shapeRules, ...typographyRules, ...scrollbarRules];

export { colorRules } from "./colors";
export { scrollbarRules } from "./scrollbar";
export { shapeRules } from "./shapes";
export { typographyRules } from "./typography";
