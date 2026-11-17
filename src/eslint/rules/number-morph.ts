/**
 * Enforces constraints on `<NumberMorph>` and `<NumberMorphGroup>` components:
 * - `no-continuous-in-group`: Disallows `continuous` on `<NumberMorph>` inside `<NumberMorphGroup>`.
 *   In `@number-flow/svelte`, combining `NumberFlowGroup` with `continuous` causes unchanged sibling
 *   instances to re-spin whenever another instance in the group updates.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { findAttribute, getElementName, isTruthyAttribute, shouldSkipFile } from "./utils.ts";

export const numberMorphNoContinuousInGroupRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow using `continuous` on <NumberMorph> inside <NumberMorphGroup>",
        },
        messages: {
            noContinuousInGroup:
                'Avoid using "continuous" on <NumberMorph> inside <NumberMorphGroup>: due to a @number-flow/svelte bug, "continuous" inside a group causes unchanged sibling <NumberMorph> instances to re-spin. Remove "continuous", or replace <NumberMorphGroup> with a plain inline-flex container and use "minimumIntegerDigits".',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "NumberMorph") return;
                if (!isTruthyAttribute(node, "continuous")) return;

                let current = (node as unknown as { parent?: AST.SvelteElement }).parent;
                while (current) {
                    if (current.type === "SvelteElement" && getElementName(current) === "NumberMorphGroup") {
                        const continuousAttr = findAttribute(node, "continuous");
                        context.report({
                            node: (continuousAttr ?? node.startTag) as unknown as Rule.Node,
                            messageId: "noContinuousInGroup",
                        });
                        return;
                    }
                    current = (current as unknown as { parent?: AST.SvelteElement }).parent;
                }
            },
        };
    },
};

export const numberMorphConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "number-morph": {
            rules: {
                "no-continuous-in-group": numberMorphNoContinuousInGroupRule,
            },
        },
    },
    rules: {
        "number-morph/no-continuous-in-group": "error",
    },
};
