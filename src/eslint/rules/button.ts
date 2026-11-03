/**
 * Enforces explicit configuration attributes and accessible touch targets on `.cs-button` elements:
 * - `require-attributes`: Ensures required `data-size`, `data-variant`, `data-color`, and text label / icon-only semantics.
 * - `require-hit-area`: Suggests adding `.cs-hit-area` to compact icon-only buttons (< 44px) to meet WCAG touch target guidelines.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";
import {
    checkEnumAttribute,
    findAttribute,
    getLiteralStringValue,
    hasClass,
    hasDescendantClass,
    shouldSkipFile,
} from "./utils.ts";

export const ALLOWED_BUTTON_SIZES = new Set(["xs", "sm", "md", "lg", "xl"]);
export const COMPACT_BUTTON_SIZES = new Set(["xs", "sm", "md", "lg"]);
export const ALLOWED_BUTTON_VARIANTS = new Set(["solid", "soft", "ghost", "elevated"]);
export const ALLOWED_BUTTON_COLORS = new Set(["accent", "base", "danger"]);

export const buttonRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        // No autofix: the linter cannot infer intended sizes, colors, or whether a label was forgotten vs. an icon-only button intended.
        docs: {
            description: "Enforce required data attributes and label/icon structure for .cs-button elements",
        },
        messages: {
            missingSize: 'Buttons with class "cs-button" must specify a data-size ("xs" | "sm" | "md" | "lg" | "xl").',
            invalidSize: 'Invalid data-size "{{value}}". Allowed sizes: xs, sm, md, lg, xl.',
            missingVariant: 'Buttons with class "cs-button" must specify a data-variant ("solid" | "soft" | "ghost" | "elevated").',
            invalidVariant: 'Invalid data-variant "{{value}}". Allowed variants: solid, soft, ghost, elevated.',
            missingColor: 'Buttons with class "cs-button" must specify a data-color ("accent" | "base" | "danger") unless variant is "elevated".',
            invalidColor: 'Invalid data-color "{{value}}". Allowed colors: accent, base, danger.',
            missingLabelOrIconOnly: 'Buttons with class "cs-button" must either specify "data-icon-only" or contain a child with class "cs-button-label".',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-button")) return;

                // 1. Validate data-size
                checkEnumAttribute(context, node, "data-size", ALLOWED_BUTTON_SIZES, {
                    required: true,
                    missingMessageId: "missingSize",
                    invalidMessageId: "invalidSize",
                });

                // 2. Validate data-variant
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

                // 3. Validate data-color (exempt for elevated variants)
                if (variantVal !== "elevated") {
                    checkEnumAttribute(context, node, "data-color", ALLOWED_BUTTON_COLORS, {
                        required: true,
                        missingMessageId: "missingColor",
                        invalidMessageId: "invalidColor",
                    });
                }

                // 4. Ensure visual/accessible structure: text label or explicit icon-only indicator
                const hasIconOnly = Boolean(findAttribute(node, "data-icon-only"));
                if (!hasIconOnly && !hasDescendantClass(node.children, "cs-button-label")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingLabelOrIconOnly",
                    });
                }
            },
        };
    },
};

/**
 * Advisory rule warning when compact icon-only buttons (< 44px) omit a .cs-hit-area touch target expander.
 * Configured as a warning so developers can selectively disable it via <!-- eslint-disable-next-line --> where appropriate.
 */
export const buttonHitAreaRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise using .cs-hit-area on compact icon-only buttons to satisfy 44px touch target guidelines",
        },
        messages: {
            missingHitArea: 'Icon-only button with size "{{size}}" (< 44px) should contain a <span class="cs-hit-area"> (data-size="md" or "lg") to guarantee a minimum 44px touch target.',
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

                const sizeAttr = findAttribute(node, "data-size");
                if (!sizeAttr) return;

                const sizeVal = getLiteralStringValue(sizeAttr);
                // Size 'xl' is already 44px; sizes below xl need a hit-area to meet touch target recommendations.
                if (!sizeVal || !COMPACT_BUTTON_SIZES.has(sizeVal)) return;

                if (!hasDescendantClass(node.children, "cs-hit-area")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingHitArea",
                        data: { size: sizeVal },
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
