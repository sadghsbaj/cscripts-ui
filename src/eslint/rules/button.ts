/**
 * Enforces explicit configuration attributes and accessible content structure on `.cs-button` elements.
 * Pure CSS components deliberately avoid fallback defaults, requiring explicit state and semantics.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";
import { checkEnumAttribute, findAttribute, hasClass, shouldSkipFile } from "./utils.ts";

export const ALLOWED_BUTTON_SIZES = new Set(["xs", "sm", "md", "lg", "xl"]);
export const ALLOWED_BUTTON_VARIANTS = new Set(["solid", "soft", "ghost", "elevated"]);
export const ALLOWED_BUTTON_COLORS = new Set(["accent", "base", "danger"]);

function hasButtonLabel(children: AST.SvelteElement["children"]): boolean {
    for (const child of children) {
        if (child.type === "SvelteElement") {
            if (hasClass(child, "cs-button-label")) {
                return true;
            }
            if (hasButtonLabel(child.children)) {
                return true;
            }
        } else if (
            "children" in child &&
            Array.isArray(child.children) &&
            hasButtonLabel(child.children as AST.SvelteElement["children"])
        ) {
            return true;
        }

        // Traverse conditional branches (e.g. {#if} / {:else})
        if (
            "else" in child &&
            child.else &&
            "children" in child.else &&
            Array.isArray(child.else.children) &&
            hasButtonLabel(child.else.children as AST.SvelteElement["children"])
        ) {
            return true;
        }
    }

    return false;
}

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
                if (!hasIconOnly && !hasButtonLabel(node.children)) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingLabelOrIconOnly",
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
            },
        },
    },
    rules: {
        "button/require-attributes": "error",
    },
};
