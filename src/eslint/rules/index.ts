import type { Linter } from "eslint";

import { attachmentLayersConfig } from "./attachment-layers.ts";
import { buttonGroupConfig } from "./button-group.ts";
import { buttonConfig } from "./button.ts";
import { closeButtonConfig } from "./close-button.ts";
import { componentDocsConfig } from "./component-docs.ts";
import { componentLayersConfig } from "./component-layers.ts";
import { scrollAreaConfig } from "./scroll-area.ts";
import { toggleButtonGroupConfig } from "./toggle-button-group.ts";
import { toggleButtonConfig } from "./toggle-button.ts";
import { unicodeDotsConfig } from "./unicode-dots.ts";

export { attachmentCssParser, attachmentLayerRule, attachmentLayersConfig } from "./attachment-layers.ts";
export { buttonConfig, buttonHitAreaRule, buttonStructureRule } from "./button.ts";
export { buttonGroupConfig, buttonGroupNoSolidRule, buttonGroupUniformButtonsRule } from "./button-group.ts";
export { closeButtonConfig, closeButtonHitAreaRule } from "./close-button.ts";
export { componentCommentRule, componentDocsConfig } from "./component-docs.ts";
export { componentLayersConfig, componentLayersRule } from "./component-layers.ts";
export {
    scrollAreaConfig,
    scrollAreaScrollFadeOnContentRule,
    scrollAreaStructureRule,
} from "./scroll-area.ts";
export {
    toggleButtonGroupConfig,
    toggleButtonGroupNoRegularButtonRule,
    toggleButtonGroupUniformButtonsRule,
} from "./toggle-button-group.ts";
export { toggleButtonConfig, toggleButtonHitAreaRule, toggleButtonStructureRule } from "./toggle-button.ts";
export { FORBIDDEN_DOTS_REGEX, unicodeDotsConfig, unicodeDotsRule } from "./unicode-dots.ts";
export * from "./utils.ts";

export const customRulesConfigs: Linter.Config[] = [
    unicodeDotsConfig,
    buttonConfig,
    buttonGroupConfig,
    closeButtonConfig,
    toggleButtonConfig,
    toggleButtonGroupConfig,
    scrollAreaConfig,
    componentDocsConfig,
    componentLayersConfig,
    attachmentLayersConfig,
];
