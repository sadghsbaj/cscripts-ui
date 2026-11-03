/**
 * Enforces explicit configuration attributes and accessible touch targets on `.cs-button` elements:
 * - `require-attributes`: Ensures required `data-size`, `data-variant`, `data-color`, and text label / icon-only semantics.
 * - `require-hit-area`: Suggests adding `.cs-hit-area` to icon-only buttons to guarantee adequate touch target area.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";
import {
    checkEnumAttribute,
    findAttribute,
    findIcons,
    getImportedIconNames,
    getLiteralStringValue,
    hasClass,
    hasDescendantClass,
    isAriaHidden,
    shouldSkipFile,
} from "./utils.ts";

export const ALLOWED_BUTTON_SIZES = new Set(["xs", "sm", "md", "lg", "xl"]);
export const ALLOWED_BUTTON_VARIANTS = new Set(["solid", "soft", "ghost", "elevated"]);
export const ALLOWED_BUTTON_COLORS = new Set(["accent", "base", "danger"]);
export const ALLOWED_BUTTON_TYPES = new Set(["button", "submit", "reset"]);

export const buttonRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        fixable: "code",
        docs: {
            description: "Enforce required data attributes, explicit type, and label/icon structure for .cs-button elements",
        },
        messages: {
            missingType: 'Buttons with class "cs-button" must specify an explicit type attribute ("button" | "submit" | "reset").',
            invalidType: 'Invalid button type "{{value}}". Allowed types: button, submit, reset.',
            missingSize: 'Buttons with class "cs-button" must specify a data-size ("xs" | "sm" | "md" | "lg" | "xl").',
            invalidSize: 'Invalid data-size "{{value}}". Allowed sizes: xs, sm, md, lg, xl.',
            missingVariant: 'Buttons with class "cs-button" must specify a data-variant ("solid" | "soft" | "ghost" | "elevated").',
            invalidVariant: 'Invalid data-variant "{{value}}". Allowed variants: solid, soft, ghost, elevated.',
            missingColor: 'Buttons with class "cs-button" must specify a data-color ("accent" | "base" | "danger") unless variant is "elevated".',
            invalidColor: 'Invalid data-color "{{value}}". Allowed colors: accent, base, danger.',
            missingLabelOrIconOnly: 'Buttons with class "cs-button" must either specify "data-icon-only" or contain a child with class "cs-button-label".',
            missingIconOnlyAriaLabel: 'Icon-only buttons with "data-icon-only" must specify an accessible "aria-label" or "aria-labelledby".',
            missingIconAriaHidden: 'Icons inside buttons must have aria-hidden="true" to avoid confusing screen readers.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const iconNames = getImportedIconNames(context);

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-button")) return;

                // 1. Ensure explicit type on <button> tags to prevent accidental form submits
                const tagName = "name" in node.name ? node.name.name : "";
                if (tagName === "button") {
                    const typeAttr = findAttribute(node, "type");
                    if (!typeAttr) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingType",
                            fix(fixer) {
                                return fixer.insertTextAfter(
                                    node.name as unknown as Rule.Node,
                                    ' type="button"'
                                );
                            },
                        });
                    } else {
                        const typeVal = getLiteralStringValue(typeAttr);
                        if (typeVal !== undefined && !ALLOWED_BUTTON_TYPES.has(typeVal)) {
                            context.report({
                                node: typeAttr as unknown as Rule.Node,
                                messageId: "invalidType",
                                data: { value: typeVal },
                            });
                        }
                    }
                }

                // 2. Validate data-size
                checkEnumAttribute(context, node, "data-size", ALLOWED_BUTTON_SIZES, {
                    required: true,
                    missingMessageId: "missingSize",
                    invalidMessageId: "invalidSize",
                });

                // 3. Validate data-variant
                const variantVal = checkEnumAttribute(
                    context,
                    node,
                    "data-variant",
                    ALLOWED_BUTTON_VARIANTS,
                    {
                        required: true,
                        missingMessageId: "missingVariant",
                        invalidMessageId: "invalidVariant",
                    }
                );

                // 4. Validate data-color (exempt for elevated variants)
                if (variantVal !== "elevated") {
                    checkEnumAttribute(context, node, "data-color", ALLOWED_BUTTON_COLORS, {
                        required: true,
                        missingMessageId: "missingColor",
                        invalidMessageId: "invalidColor",
                    });
                }

                // 5. Ensure visual/accessible structure: text label or explicit icon-only indicator
                const hasIconOnly = Boolean(findAttribute(node, "data-icon-only"));
                if (!hasIconOnly && !hasDescendantClass(node.children, "cs-button-label")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingLabelOrIconOnly",
                    });
                }

                // 6. Icon-only buttons must specify an accessible name (aria-label or aria-labelledby)
                if (hasIconOnly) {
                    const ariaLabel = findAttribute(node, "aria-label");
                    const ariaLabelledBy = findAttribute(node, "aria-labelledby");
                    const hasValidLabel =
                        (ariaLabel && (getLiteralStringValue(ariaLabel)?.trim() || ariaLabel.value.some((v) => v.type === "SvelteMustacheTag"))) ||
                        (ariaLabelledBy && (getLiteralStringValue(ariaLabelledBy)?.trim() || ariaLabelledBy.value.some((v) => v.type === "SvelteMustacheTag")));

                    if (!hasValidLabel) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingIconOnlyAriaLabel",
                        });
                    }
                }

                // 7. Icons inside buttons (with label or icon-only) must have aria-hidden="true"
                const iconElements = findIcons(node.children, iconNames);
                for (const iconEl of iconElements) {
                    if (isAriaHidden(iconEl)) continue;

                    const ariaHiddenAttr = findAttribute(iconEl, "aria-hidden");
                    context.report({
                        node: iconEl.startTag as unknown as Rule.Node,
                        messageId: "missingIconAriaHidden",
                        fix(fixer) {
                            if (ariaHiddenAttr) {
                                return fixer.replaceText(
                                    ariaHiddenAttr as unknown as Rule.Node,
                                    'aria-hidden="true"'
                                );
                            }
                            return fixer.insertTextAfter(
                                iconEl.name as unknown as Rule.Node,
                                ' aria-hidden="true"'
                            );
                        },
                    });
                }
            },
        };
    },
};

/**
 * Advisory rule warning when icon-only buttons omit a .cs-hit-area touch target expander.
 * Even 44px (xl) circular/squircle buttons lose effective touch area in clipped corners.
 * Configured as a warning so developers can selectively disable it via <!-- eslint-disable-next-line --> where appropriate.
 */
export const buttonHitAreaRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise using .cs-hit-area on icon-only buttons to satisfy touch target guidelines",
        },
        messages: {
            missingHitArea:
                'Icon-only buttons should contain a <span class="cs-hit-area"> (data-size="md" or "lg") to guarantee a solid 44px+ touch target, especially on rounded/circular controls.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-button")) return;

                const hasIconOnly = Boolean(findAttribute(node, "data-icon-only"));
                if (!hasIconOnly) return;

                if (!hasDescendantClass(node.children, "cs-hit-area")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingHitArea",
                    });
                }
            },
        };
    },
};

export const buttonConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        button: {
            rules: {
                "require-attributes": buttonRule,
                "require-hit-area": buttonHitAreaRule,
            },
        },
    },
    rules: {
        "button/require-attributes": "error",
        "button/require-hit-area": "warn",
    },
};
