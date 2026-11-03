import type { Linter } from "eslint";

import { buttonConfig } from "./button.ts";
import { hitAreaConfig } from "./hit-area.ts";
import { unicodeDotsConfig } from "./unicode-dots.ts";

export {
    ALLOWED_BUTTON_COLORS,
    ALLOWED_BUTTON_SIZES,
    ALLOWED_BUTTON_VARIANTS,
    buttonConfig,
    buttonRule,
} from "./button.ts";
export { ALLOWED_HIT_AREA_SIZES, hitAreaConfig, hitAreaRule } from "./hit-area.ts";
export { FORBIDDEN_DOTS_REGEX, unicodeDotsConfig, unicodeDotsRule } from "./unicode-dots.ts";

export const customRulesConfigs: Linter.Config[] = [
    unicodeDotsConfig,
    hitAreaConfig,
    buttonConfig,
];
