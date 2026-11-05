import type { Linter } from "eslint";

import { buttonConfig } from "./button";
import { closeButtonConfig } from "./close-button";
import { unicodeDotsConfig } from "./unicode-dots";

export { buttonConfig, buttonHitAreaRule, buttonStructureRule } from "./button";
export { closeButtonConfig, closeButtonHitAreaRule } from "./close-button";
export { FORBIDDEN_DOTS_REGEX, unicodeDotsConfig, unicodeDotsRule } from "./unicode-dots";
export * from "./utils";

export const customRulesConfigs: Linter.Config[] = [
    unicodeDotsConfig,
    buttonConfig,
    closeButtonConfig,
];
