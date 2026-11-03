/**
 * Enforces explicit configuration attributes and accessibility on `.cs-hit-area` elements:
 * - Requires explicit `data-size` ("sm" | "md" | "lg") to avoid unintended sizing fallbacks.
 * - Enforces `aria-hidden="true"` to prevent invisible pointer targets from polluting the accessibility tree.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";

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
        const filename = context.filename ?? "";

        if (
            filename.includes("eslint/") ||
            filename.endsWith(".test.ts") ||
            filename.endsWith(".spec.ts")
        ) {
            return {};
        }

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const attributes = node.startTag.attributes;

                const hasHitAreaClass = attributes.some((attr) => {
                    if (attr.type === "SvelteAttribute" && attr.key.name === "class") {
                        const classText = attr.value
                            .filter((v): v is AST.SvelteLiteral => v.type === "SvelteLiteral")
                            .map((v) => v.value)
                            .join(" ");

                        return classText.split(/\s+/).includes("cs-hit-area");
                    }

                    return (
                        attr.type === "SvelteDirective" &&
                        attr.kind === "Class" &&
                        attr.key.name.name === "cs-hit-area"
                    );
                });

                if (!hasHitAreaClass) return;

                // 1. Validate data-size
                const sizeAttr = attributes.find(
                    (attr): attr is AST.SvelteAttribute =>
                        attr.type === "SvelteAttribute" && attr.key.name === "data-size"
                );

                if (!sizeAttr) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingSize",
                    });
                } else {
                    const firstVal = sizeAttr.value[0];
                    if (
                        firstVal &&
                        firstVal.type === "SvelteLiteral" &&
                        !ALLOWED_HIT_AREA_SIZES.has(firstVal.value)
                    ) {
                        context.report({
                            node: sizeAttr as unknown as Rule.Node,
                            messageId: "invalidSize",
                            data: { value: firstVal.value },
                        });
                    }
                }

                // 2. Validate aria-hidden
                const ariaHiddenAttr = attributes.find(
                    (attr): attr is AST.SvelteAttribute =>
                        attr.type === "SvelteAttribute" && attr.key.name === "aria-hidden"
                );

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
