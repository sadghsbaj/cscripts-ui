/**
 * Custom ESLint rule warning against overusing UnoCSS `dot-*` separator utilities.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { shouldSkipFile } from "./utils.ts";

export const DOT_UTILITY_REGEX = /(?:^|\s)dot(?:-(?:2xs|xs|sm|md|lg|xl|2xl))?(?=\s|$)/;

function collectExpressionNodes(
    expr: unknown,
    checkText: (node: Rule.Node, text: string | null | undefined) => void
): void {
    if (!expr || typeof expr !== "object") return;

    const node = expr as {
        type?: string;
        value?: unknown;
        quasis?: unknown[];
        expressions?: unknown[];
        elements?: unknown[];
        consequent?: unknown;
        alternate?: unknown;
        left?: unknown;
        right?: unknown;
        arguments?: unknown[];
        properties?: unknown[];
    };

    if (node.type === "Literal" && typeof node.value === "string") {
        checkText(expr as Rule.Node, node.value);
    } else if (node.type === "TemplateElement") {
        const templateEl = expr as Rule.Node & { value?: { raw?: string } };
        checkText(templateEl, templateEl.value?.raw);
    } else if (node.type === "TemplateLiteral") {
        const quasis = node.quasis ?? [];
        for (const quasi of quasis) {
            collectExpressionNodes(quasi, checkText);
        }
        const expressions = node.expressions ?? [];
        for (const subExpr of expressions) {
            collectExpressionNodes(subExpr, checkText);
        }
    } else if (node.type === "ArrayExpression" && Array.isArray(node.elements)) {
        for (const el of node.elements) {
            collectExpressionNodes(el, checkText);
        }
    } else if (node.type === "ConditionalExpression") {
        collectExpressionNodes(node.consequent, checkText);
        collectExpressionNodes(node.alternate, checkText);
    } else if (node.type === "LogicalExpression" || node.type === "BinaryExpression") {
        collectExpressionNodes(node.left, checkText);
        collectExpressionNodes(node.right, checkText);
    } else if (node.type === "CallExpression" && Array.isArray(node.arguments)) {
        for (const arg of node.arguments) {
            collectExpressionNodes(arg, checkText);
        }
    } else if (node.type === "ObjectExpression" && Array.isArray(node.properties)) {
        for (const prop of node.properties) {
            if (!prop || typeof prop !== "object" || !("key" in prop)) continue;
            const property = prop as { key?: unknown; computed?: boolean; value?: unknown };
            collectExpressionNodes(property.key, checkText);
            if (property.computed) {
                collectExpressionNodes(property.value, checkText);
            }
        }
    }
}

export const dotUtilityWarnRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Warn against overusing UnoCSS 'dot-*' separator utilities.",
        },
        messages: {
            preferSparingly:
                "Avoid overusing 'dot-*' separator utilities. Ask the user explicitly whether a dot is wanted here: if yes, suppress this line with an eslint-disable comment (dots/prefer-sparingly); if no, implement without a dot.",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        function checkText(node: Rule.Node, text: string | null | undefined): void {
            if (!text) return;
            if (DOT_UTILITY_REGEX.test(text)) {
                context.report({
                    node,
                    messageId: "preferSparingly",
                });
            }
        }

        return {
            "SvelteAttribute[key.name='class']"(rawNode: Rule.Node): void {
                const attr = rawNode as unknown as AST.SvelteAttribute;
                for (const part of attr.value) {
                    if (part.type === "SvelteLiteral") {
                        checkText(part as unknown as Rule.Node, part.value);
                    } else if (part.type === "SvelteMustacheTag") {
                        collectExpressionNodes(part.expression, checkText);
                    }
                }
            },
        };
    },
};

export const dotsConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        dots: {
            rules: {
                "prefer-sparingly": dotUtilityWarnRule,
            },
        },
    },
    rules: {
        "dots/prefer-sparingly": "warn",
    },
};
