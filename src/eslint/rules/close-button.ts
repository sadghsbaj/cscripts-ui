/**
 * Enforces explicit configuration attributes, accessible naming, and touch targets on `.cs-close-button` elements:
 * - `require-attributes`: Ensures required `data-size`, `data-variant`, `aria-label` on host, and `aria-hidden` on the close icon.
 * - `require-hit-area`: Suggests adding `.cs-hit-area` to guarantee adequate touch target area.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";
import {
    checkEnumAttribute,
    findAttribute,
    hasClass,
    hasDescendantClass,
    shouldSkipFile,
} from "./utils.ts";

export const ALLOWED_CLOSE_BUTTON_SIZES = new Set(["xs", "sm", "md", "lg", "xl"]);
export const ALLOWED_CLOSE_BUTTON_VARIANTS = new Set(["soft", "ghost", "elevated"]);

/**
 * Searches for a close icon element (Lucide <X />, standard <svg>, or custom close icon tags).
 */
function findCloseIcon(children: AST.SvelteElement["children"]): AST.SvelteElement | undefined {
    for (const child of children) {
        if (child.type === "SvelteElement") {
            const tagName = "name" in child.name ? child.name.name : "";
            if (tagName === "X" || tagName === "svg" || tagName.toLowerCase().includes("close")) {
                return child;
            }
            const nested = findCloseIcon(child.children);
            if (nested) return nested;
        } else if (
            "children" in child &&
            Array.isArray(child.children)
        ) {
            const nested = findCloseIcon(child.children as AST.SvelteElement["children"]);
            if (nested) return nested;
        }

        if (
            "else" in child &&
            child.else &&
            "children" in child.else &&
            Array.isArray(child.else.children)
        ) {
            const nested = findCloseIcon(child.else.children as AST.SvelteElement["children"]);
            if (nested) return nested;
        }
    }

    return undefined;
}

export const closeButtonRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        fixable: "code",
        docs: {
            description: "Enforce required data attributes, accessible name, and hidden icon for .cs-close-button elements",
        },
        messages: {
            missingSize: 'Buttons with class "cs-close-button" must specify a data-size ("xs" | "sm" | "md" | "lg" | "xl").',
            invalidSize: 'Invalid data-size "{{value}}". Allowed sizes: xs, sm, md, lg, xl.',
            missingVariant: 'Buttons with class "cs-close-button" must specify a data-variant ("soft" | "ghost" | "elevated").',
            invalidVariant: 'Invalid data-variant "{{value}}". Allowed variants: soft, ghost, elevated.',
            missingAriaLabel: 'Buttons with class "cs-close-button" must specify an "aria-label" (e.g. "Schließen").',
            missingIcon: 'Buttons with class "cs-close-button" must contain a close icon child (e.g. <X /> or <svg>).',
            missingIconAriaHidden: 'Close icon inside "cs-close-button" must have aria-hidden="true" to avoid double announcement with aria-label.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-close-button")) return;

                // 1. Validate data-size
                checkEnumAttribute(context, node, "data-size", ALLOWED_CLOSE_BUTTON_SIZES, {
                    required: true,
                    missingMessageId: "missingSize",
                    invalidMessageId: "invalidSize",
                });

                // 2. Validate data-variant
                checkEnumAttribute(context, node, "data-variant", ALLOWED_CLOSE_BUTTON_VARIANTS, {
                    required: true,
                    missingMessageId: "missingVariant",
                    invalidMessageId: "invalidVariant",
                });

                // 3. Ensure accessible name via aria-label (autofixes default "Schließen" if omitted)
                const ariaLabelAttr = findAttribute(node, "aria-label");
                if (!ariaLabelAttr) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingAriaLabel",
                        fix(fixer) {
                            return fixer.insertTextAfter(
                                node.name as unknown as Rule.Node,
                                ' aria-label="Schließen"'
                            );
                        },
                    });
                }

                // 4. Validate icon child & ensure it is aria-hidden
                const iconNode = findCloseIcon(node.children);
                if (!iconNode) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingIcon",
                    });
                } else {
                    const ariaHiddenAttr = findAttribute(iconNode, "aria-hidden");
                    const isAriaHidden = Boolean(
                        ariaHiddenAttr &&
                            (ariaHiddenAttr.boolean ||
                                ariaHiddenAttr.value.some(
                                    (v) =>
                                        (v.type === "SvelteLiteral" && v.value === "true") ||
                                        (v.type === "SvelteMustacheTag" &&
                                            v.expression.type === "Literal" &&
                                            v.expression.value === true)
                                ))
                    );

                    if (!isAriaHidden) {
                        context.report({
                            node: iconNode.startTag as unknown as Rule.Node,
                            messageId: "missingIconAriaHidden",
                            fix(fixer) {
                                if (ariaHiddenAttr) {
                                    return fixer.replaceText(
                                        ariaHiddenAttr as unknown as Rule.Node,
                                        'aria-hidden="true"'
                                    );
                                }
                                return fixer.insertTextAfter(
                                    iconNode.name as unknown as Rule.Node,
                                    ' aria-hidden="true"'
                                );
                            },
                        });
                    }
                }
            },
        };
    },
};

/**
 * Advisory rule warning when close buttons omit a .cs-hit-area touch target expander.
 * Configured as a warning so developers can selectively disable it via <!-- eslint-disable-next-line --> where appropriate.
 */
export const closeButtonHitAreaRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise using .cs-hit-area on close buttons to satisfy touch target guidelines",
        },
        messages: {
            missingHitArea:
                'Close buttons should contain a <span class="cs-hit-area"> (data-size="md" or "lg") to guarantee a solid 44px+ touch target.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-close-button")) return;

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

export const closeButtonConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "close-button": {
            rules: {
                "require-attributes": closeButtonRule,
                "require-hit-area": closeButtonHitAreaRule,
            },
        },
    },
    rules: {
        "close-button/require-attributes": "error",
        "close-button/require-hit-area": "warn",
    },
};
