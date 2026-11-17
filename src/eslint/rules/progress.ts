/**
 * Enforces accessibility and prop-combination constraints on `<Progress>` components:
 * - `require-accessible-label`: `<Progress>` renders `role="progressbar"` without visible text and requires `aria-label` or `aria-labelledby` (unless `aria-hidden="true"` or spread props are present).
 * - `no-segments-on-bar`: Warns when `<Progress appearance="bar">` also specifies `segments`, which has no effect on bar appearance.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    findAttribute,
    getElementName,
    getLiteralStringValue,
    hasAccessibleLabel,
    isTruthyAttribute,
    shouldSkipFile,
} from "./utils.ts";

export const progressRequireAccessibleLabelRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                'Require an accessible "aria-label" or "aria-labelledby" on <Progress> unless hidden or using spread props',
        },
        messages: {
            missingAccessibleLabel:
                '<Progress> renders role="progressbar" without visible text and must specify "aria-label" or "aria-labelledby" (or aria-hidden="true").',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Progress") return;

                if (isTruthyAttribute(node, "aria-hidden")) return;
                if (node.startTag.attributes.some((attr) => attr.type === "SvelteSpreadAttribute")) return;

                if (!hasAccessibleLabel(node)) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingAccessibleLabel",
                    });
                }
            },
        };
    },
};

export const progressNoSegmentsOnBarRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: 'Warn when <Progress appearance="bar"> specifies a "segments" prop',
        },
        messages: {
            segmentsOnBar:
                'The "segments" prop has no effect when <Progress> has appearance="bar". Use appearance="dashed" or "dotted", or remove "segments".',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Progress") return;

                const appearanceAttr = findAttribute(node, "appearance");
                const appearance = appearanceAttr ? getLiteralStringValue(appearanceAttr) : undefined;
                if (appearance !== "bar") return;

                const segmentsAttr = findAttribute(node, "segments");
                if (segmentsAttr) {
                    context.report({
                        node: segmentsAttr as unknown as Rule.Node,
                        messageId: "segmentsOnBar",
                    });
                }
            },
        };
    },
};

export const progressConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        progress: {
            rules: {
                "require-accessible-label": progressRequireAccessibleLabelRule,
                "no-segments-on-bar": progressNoSegmentsOnBarRule,
            },
        },
    },
    rules: {
        "progress/require-accessible-label": "error",
        "progress/no-segments-on-bar": "warn",
    },
};
