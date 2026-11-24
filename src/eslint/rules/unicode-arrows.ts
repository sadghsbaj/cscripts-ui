/**
 * Custom ESLint rule forbidding unicode arrows in favor of Lucide icons or <KbdSymbol />.
 */

import type { Linter, Rule } from "eslint";

import { shouldSkipFile } from "./utils.ts";

export const FORBIDDEN_ARROWS_REGEX = /[\u{2190}-\u{2199}\u{21A9}\u{21AA}\u{21D0}\u{21D2}\u{21D4}\u{25B4}\u{25B8}\u{25BE}\u{25C2}\u{2794}\u{279C}\u{27A4}]/u;

export const unicodeArrowsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow unicode arrows in favor of Lucide icons or <KbdSymbol />.",
        },
        messages: {
            forbiddenArrow:
                'Unicode arrow "{{arrow}}" is forbidden. Use Lucide icons (e.g. ArrowRight, ChevronRight) or <KbdSymbol /> instead.',
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        function checkNode(node: Rule.Node, text: string | null | undefined): void {
            if (!text) return;
            const match = text.match(FORBIDDEN_ARROWS_REGEX);
            if (match) {
                context.report({
                    node,
                    messageId: "forbiddenArrow",
                    data: { arrow: match[0] },
                });
            }
        }

        return {
            SvelteText(node: Rule.Node & { value?: string }): void {
                checkNode(node, node.value);
            },
            Literal(node: Rule.Node & { value?: unknown }): void {
                if (typeof node.value === "string") {
                    checkNode(node, node.value);
                }
            },
            TemplateElement(node: Rule.Node & { value?: { raw?: string } }): void {
                checkNode(node, node.value?.raw);
            },
        };
    },
};

export const unicodeArrowsConfig: Linter.Config = {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,svelte}"],
    plugins: {
        "unicode-arrows": {
            rules: {
                "no-unicode-arrows": unicodeArrowsRule,
            },
        },
    },
    rules: {
        "unicode-arrows/no-unicode-arrows": "error",
    },
};
