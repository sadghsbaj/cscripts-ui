import type { Linter } from "eslint";

import { attachmentLayersConfig } from "./attachment-layers.ts";
import { badgeConfig } from "./badge.ts";
import { browserStorageConfig } from "./browser-storage.ts";
import { buttonMorphConfig } from "./button-morph.ts";
import { buttonConfig } from "./button.ts";
import { cardConfig } from "./card.ts";
import { clipboardConfig } from "./clipboard.ts";
import { closeButtonConfig } from "./close-button.ts";
import { componentLayersConfig } from "./component-layers.ts";
import { cssSafetyConfigs } from "./css-safety.ts";
import { kbdConfigs } from "./kbd.ts";
import { numberMorphConfig } from "./number-morph.ts";
import { numberStepperConfig } from "./number-stepper.ts";
import { overlayConfig } from "./overlay.ts";
import { progressConfig } from "./progress.ts";
import { scrollAreaConfig } from "./scroll-area.ts";
import { segmentedControlConfig } from "./segmented-control.ts";
import { titleAttributeConfig } from "./title-attribute.ts";
import { toggleButtonGroupConfig } from "./toggle-button-group.ts";
import { toggleButtonConfig } from "./toggle-button.ts";
import { unicodeDotsConfig } from "./unicode-dots.ts";

export { attachmentCssParser, attachmentLayerRule, attachmentLayersConfig } from "./attachment-layers.ts";
export { badgeConfig, badgeStructureRule } from "./badge.ts";
export { browserStorageConfig, noNativeStorageRule, requireStoragePrefixRule } from "./browser-storage.ts";
export { buttonConfig, buttonHitAreaRule, buttonStructureRule, buttonTooltipRule } from "./button.ts";
export {
    buttonMorphConfig,
    buttonMorphRequireButtonChildRule,
    buttonMorphRequireItemsRule,
} from "./button-morph.ts";
export { cardConfig, cardStructureRule } from "./card.ts";
export { clipboardConfig, noNativeClipboardRule, preferClipboardIconsRule } from "./clipboard.ts";
export { closeButtonConfig, closeButtonHitAreaRule } from "./close-button.ts";
export { componentLayersConfig, componentLayersRule } from "./component-layers.ts";
export { cssSafetyConfigs, noOklchNeutralMixRule, vendorPrefixOrderRule } from "./css-safety.ts";
export {
    FORBIDDEN_UNICODE_KEYS_REGEX,
    kbdConfigs,
    kbdNoComboTextRule,
    kbdNoMacosLabelsRule,
    kbdNoRawKbdRule,
    kbdNoUnicodeKeysRule,
    kbdPreferDefaultSeparatorRule,
    kbdRequireStandalonePropsRule,
} from "./kbd.ts";
export { numberMorphConfig, numberMorphNoContinuousInGroupRule } from "./number-morph.ts";
export { numberStepperConfig, numberStepperNoMiddleInVerticalRule } from "./number-stepper.ts";
export { overlayConfig, overlayPreferFocusTrapOnContentRule } from "./overlay.ts";
export { progressConfig, progressNoSegmentsOnBarRule, progressRequireAccessibleLabelRule } from "./progress.ts";
export {
    scrollAreaConfig,
    scrollAreaNoOuterContentClassesRule,
    scrollAreaScrollFadeOnContentRule,
    scrollAreaStructureRule,
} from "./scroll-area.ts";
export { segmentedControlConfig, segmentedControlStructureRule } from "./segmented-control.ts";
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
    badgeConfig,
    buttonConfig,
    buttonMorphConfig,
    cardConfig,
    clipboardConfig,
    closeButtonConfig,
    progressConfig,
    toggleButtonConfig,
    toggleButtonGroupConfig,
    scrollAreaConfig,
    segmentedControlConfig,
    componentLayersConfig,
    ...cssSafetyConfigs,
    ...kbdConfigs,
    numberMorphConfig,
    numberStepperConfig,
    attachmentLayersConfig,
    overlayConfig,
    titleAttributeConfig,
];
