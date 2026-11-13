/**
 * Forbids native `title` attributes on HTML and Svelte elements in favor of the `tooltip` primitive.
 */

import * as svelteParser from "svelte-eslint-parser";
import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { shouldSkipFile } from "./utils.ts";

export const noTitleAttributeRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Forbid native 'title' attributes in favor of the 'tooltip' attachment primitive",
        },
        messages: {
            forbiddenTitleAttribute:
                'The native "title" attribute is forbidden. Use the "tooltip" attachment (e.g. \'{@attach tooltip("...")}\' from "cs/svelte/tooltip") instead for styled, accessible tooltips.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteAttribute(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteAttribute & {
                    parent?: AST.SvelteStartTag & { parent?: AST.SvelteElement };
                };
                if (node.parent?.parent?.kind === "component") return;
                if (node.key?.name === "title") {
                    context.report({
                        node: rawNode,
                        messageId: "forbiddenTitleAttribute",
                    });
                }
            },
            JSXAttribute(rawNode: Rule.Node): void {
                const node = rawNode as unknown as { name?: { name?: string } };
                if (node.name?.name === "title") {
                    context.report({
                        node: rawNode,
                        messageId: "forbiddenTitleAttribute",
                    });
                }
            },
        };
    },
};

export const titleAttributeConfig: Linter.Config = {
    files: ["**/*.svelte", "**/*.html"],
    languageOptions: {
        parser: svelteParser,
    },
    plugins: {
        "title-attribute": {
            rules: {
                "no-title-attribute": noTitleAttributeRule,
            },
        },
    },
    rules: {
        "title-attribute/no-title-attribute": "error",
    },
};
