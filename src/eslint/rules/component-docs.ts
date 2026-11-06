/**
 * Enforces top-level `@component` documentation comments on all `.svelte` components
 * located in `svelte/components/` and `svelte/work/`.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { shouldSkipFile } from "./utils.ts";

export const componentCommentRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce top-level <!-- @component --> JSDoc comment in component libraries",
        },
        messages: {
            missingComponentComment:
                "Component must start with a top-level '<!-- @component ... -->' documentation comment.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        const filename = context.filename ?? "";
        if (!filename.includes("svelte/components/") && !filename.includes("svelte/work/")) {
            return {};
        }

        if (shouldSkipFile(context)) return {};

        return {
            Program(rawNode: unknown): void {
                const node = rawNode as AST.SvelteProgram;

                const firstSignificant = node.body.find(
                    (child) => child.type !== "SvelteText" || child.value.trim().length > 0
                );

                const hasValidComponentComment =
                    firstSignificant?.type === "SvelteHTMLComment" && firstSignificant.value.includes("@component");

                if (!hasValidComponentComment) {
                    context.report({
                        node: (firstSignificant ?? rawNode) as unknown as Rule.Node,
                        messageId: "missingComponentComment",
                    });
                }
            },
        };
    },
};

export const componentDocsConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "component-docs": {
            rules: {
                "require-component-comment": componentCommentRule,
            },
        },
    },
    rules: {
        "component-docs/require-component-comment": "error",
    },
};
