import type { Linter } from "eslint";

import { attachmentLayersConfig } from "./attachment-layers.ts";
import { browserStorageConfig } from "./browser-storage.ts";
import { buttonMorphConfig } from "./button-morph.ts";
import { buttonConfig } from "./button.ts";
import { clipboardConfig } from "./clipboard.ts";
import { closeButtonConfig } from "./close-button.ts";
import { componentDocsConfig } from "./component-docs.ts";
import { componentLayersConfig } from "./component-layers.ts";
import { overlayConfig } from "./overlay.ts";
import { scrollAreaConfig } from "./scroll-area.ts";
import { titleAttributeConfig } from "./title-attribute.ts";
import { toggleButtonGroupConfig } from "./toggle-button-group.ts";
import { toggleButtonConfig } from "./toggle-button.ts";
import { unicodeDotsConfig } from "./unicode-dots.ts";

export { attachmentCssParser, attachmentLayerRule, attachmentLayersConfig } from "./attachment-layers.ts";
export { browserStorageConfig, noNativeStorageRule, requireStoragePrefixRule } from "./browser-storage.ts";
export { buttonConfig, buttonHitAreaRule, buttonStructureRule, buttonTooltipRule } from "./button.ts";
export {
    buttonMorphConfig,
    buttonMorphRequireButtonChildRule,
    buttonMorphRequireItemsRule,
} from "./button-morph.ts";
export { clipboardConfig, noNativeClipboardRule, preferClipboardIconsRule } from "./clipboard.ts";
export { closeButtonConfig, closeButtonHitAreaRule } from "./close-button.ts";
export { componentCommentRule, componentDocsConfig } from "./component-docs.ts";
export { componentLayersConfig, componentLayersRule } from "./component-layers.ts";
export { overlayConfig, overlayPreferFocusTrapOnContentRule } from "./overlay.ts";
export {
    scrollAreaConfig,
    scrollAreaNoOuterContentClassesRule,
    scrollAreaScrollFadeOnContentRule,
    scrollAreaStructureRule,
} from "./scroll-area.ts";
export { noTitleAttributeRule, titleAttributeConfig } from "./title-attribute.ts";
export {
    toggleButtonGroupConfig,
    toggleButtonGroupNoRegularButtonRule,
    toggleButtonGroupUniformButtonsRule,
} from "./toggle-button-group.ts";
export {
    toggleButtonConfig,
    toggleButtonHitAreaRule,
    toggleButtonStructureRule,
    toggleButtonTooltipRule,
} from "./toggle-button.ts";
export { FORBIDDEN_DOTS_REGEX, unicodeDotsConfig, unicodeDotsRule } from "./unicode-dots.ts";
export * from "./utils.ts";

export const customRulesConfigs: Linter.Config[] = [
    unicodeDotsConfig,
    browserStorageConfig,
    buttonConfig,
    buttonMorphConfig,
    clipboardConfig,
    closeButtonConfig,
    toggleButtonConfig,
    toggleButtonGroupConfig,
    scrollAreaConfig,
    componentDocsConfig,
    componentLayersConfig,
    attachmentLayersConfig,
    overlayConfig,
    titleAttributeConfig,
];
