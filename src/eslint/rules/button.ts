/**
 * Enforces explicit configuration attributes and accessible content structure on `.cs-button` elements.
 * Pure CSS components deliberately avoid fallback defaults, requiring explicit state and semantics.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

export const ALLOWED_BUTTON_SIZES = new Set(["xs", "sm", "md", "lg", "xl"]);
export const ALLOWED_BUTTON_VARIANTS = new Set(["solid", "soft", "ghost", "elevated"]);
export const ALLOWED_BUTTON_COLORS = new Set(["accent", "base", "danger"]);

function hasClass(node: AST.SvelteElement, targetClass: string): boolean {
    for (const attr of node.startTag.attributes) {
        if (attr.type === "SvelteAttribute" && attr.key.name === "class") {
            const classText = attr.value
                .filter((v): v is AST.SvelteLiteral => v.type === "SvelteLiteral")
                .map((v) => v.value)
                .join(" ");

            if (classText.split(/\s+/).includes(targetClass)) {
                return true;
            }
        }

        if (attr.type === "SvelteDirective" && attr.kind === "Class" && attr.key.name.name === targetClass) {
            return true;
        }
    }

    return false;
}

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

function findAttribute(node: AST.SvelteElement, name: string): AST.SvelteAttribute | undefined {
    return node.startTag.attributes.find(
        (attr): attr is AST.SvelteAttribute => attr.type === "SvelteAttribute" && attr.key.name === name
    );
}

function getLiteralStringValue(attr: AST.SvelteAttribute): string | undefined {
    if (attr.boolean) return "";
    const firstVal = attr.value[0];
    if (firstVal && firstVal.type === "SvelteLiteral") {
        return firstVal.value;
    }
    return undefined;
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
            missingVariant:
                'Buttons with class "cs-button" must specify a data-variant ("solid" | "soft" | "ghost" | "elevated").',
            invalidVariant: 'Invalid data-variant "{{value}}". Allowed variants: solid, soft, ghost, elevated.',
            missingColor:
                'Buttons with class "cs-button" must specify a data-color ("accent" | "base" | "danger") unless variant is "elevated".',
            invalidColor: 'Invalid data-color "{{value}}". Allowed colors: accent, base, danger.',
            missingLabelOrIconOnly:
                'Buttons with class "cs-button" must either specify "data-icon-only" or contain a child with class "cs-button-label".',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        const filename = context.filename ?? "";

        if (filename.includes("eslint/") || filename.endsWith(".test.ts") || filename.endsWith(".spec.ts")) {
            return {};
        }

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (!hasClass(node, "cs-button")) return;

                // 1. Validate data-size
                const sizeAttr = findAttribute(node, "data-size");
                if (!sizeAttr) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingSize",
                    });
                } else {
                    const sizeVal = getLiteralStringValue(sizeAttr);
                    if (sizeVal !== undefined && !ALLOWED_BUTTON_SIZES.has(sizeVal)) {
                        context.report({
                            node: sizeAttr as unknown as Rule.Node,
                            messageId: "invalidSize",
                            data: { value: sizeVal },
                        });
                    }
                }

                // 2. Validate data-variant
                const variantAttr = findAttribute(node, "data-variant");
                let isElevated = false;

                if (!variantAttr) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingVariant",
                    });
                } else {
                    const variantVal = getLiteralStringValue(variantAttr);
                    if (variantVal !== undefined) {
                        if (!ALLOWED_BUTTON_VARIANTS.has(variantVal)) {
                            context.report({
                                node: variantAttr as unknown as Rule.Node,
                                messageId: "invalidVariant",
                                data: { value: variantVal },
                            });
                        }
                        if (variantVal === "elevated") {
                            isElevated = true;
                        }
                    }
                }

                // 3. Validate data-color (exempt for elevated variants)
                if (!isElevated) {
                    const colorAttr = findAttribute(node, "data-color");
                    if (!colorAttr) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingColor",
                        });
                    } else {
                        const colorVal = getLiteralStringValue(colorAttr);
                        if (colorVal !== undefined && !ALLOWED_BUTTON_COLORS.has(colorVal)) {
                            context.report({
                                node: colorAttr as unknown as Rule.Node,
                                messageId: "invalidColor",
                                data: { value: colorVal },
                            });
                        }
                    }
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
