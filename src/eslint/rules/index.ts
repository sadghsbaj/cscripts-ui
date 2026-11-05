import type { Linter } from "eslint";

import { buttonConfig } from "./button.ts";
import { closeButtonConfig } from "./close-button.ts";
import { unicodeDotsConfig } from "./unicode-dots.ts";

export { buttonConfig, buttonHitAreaRule, buttonStructureRule } from "./button.ts";
export { closeButtonConfig, closeButtonHitAreaRule } from "./close-button.ts";
export { FORBIDDEN_DOTS_REGEX, unicodeDotsConfig, unicodeDotsRule } from "./unicode-dots.ts";
export * from "./utils.ts";

export const customRulesConfigs: Linter.Config[] = [
    unicodeDotsConfig,
    buttonConfig,
    closeButtonConfig,
];
