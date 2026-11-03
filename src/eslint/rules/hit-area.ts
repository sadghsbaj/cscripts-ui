/**
 * Enforces explicit configuration attributes and accessibility on `.cs-hit-area` elements:
 * - Requires explicit `data-size` ("sm" | "md" | "lg") to avoid unintended sizing fallbacks.
 * - Enforces `aria-hidden="true"` to prevent invisible pointer targets from polluting the accessibility tree.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";
import { checkEnumAttribute, findAttribute, hasClass, shouldSkipFile } from "./utils.ts";

export const ALLOWED_HIT_AREA_SIZES = new Set(["sm", "md", "lg"]);

export const hitAreaRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        fixable: "code",
        docs: {
            description: "Enforce required data-size and aria-hidden='true' on .cs-hit-area elements",
        },
        messages: {
            missingSize: 'Elements with class "cs-hit-area" must specify a data-size ("sm" | "md" | "lg").',
            invalidSize: 'Invalid data-size "{{value}}". Allowed sizes: sm, md, lg.',
            forgotAriaHidden: 'Using hit-area without aria-hidden="true" is forbidden.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-hit-area")) return;

                checkEnumAttribute(context, node, "data-size", ALLOWED_HIT_AREA_SIZES, {
                    required: true,
                    missingMessageId: "missingSize",
                    invalidMessageId: "invalidSize",
                });

                const ariaHiddenAttr = findAttribute(node, "aria-hidden");
                const isAriaHiddenValid = Boolean(
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

                if (isAriaHiddenValid) return;

                context.report({
                    node: node.startTag as unknown as Rule.Node,
                    messageId: "forgotAriaHidden",
                    fix(fixer) {
                        if (ariaHiddenAttr) {
                            return fixer.replaceText(
                                ariaHiddenAttr as unknown as Rule.Node,
                                'aria-hidden="true"'
                            );
                        }

                        // Inserting right after the tag name avoids clashing with multi-line attributes or spread syntax.
                        return fixer.insertTextAfter(
                            node.name as unknown as Rule.Node,
                            ' aria-hidden="true"'
                        );
                    },
                });
            },
        };
    },
};

export const hitAreaConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "hit-area": {
            rules: {
                "require-attributes": hitAreaRule,
            },
        },
    },
    rules: {
        "hit-area/require-attributes": "error",
    },
};
