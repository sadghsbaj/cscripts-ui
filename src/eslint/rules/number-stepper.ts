/**
 * Enforces structural constraints on `<NumberStepper>` components:
 * - `no-middle-in-vertical`: Disallows `<NumberStepperValue>` and `<NumberStepperInput>`
 *   inside `<NumberStepper orientation="vertical">`, which is strictly icon-only.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { findAttribute, getElementName, getLiteralStringValue, shouldSkipFile } from "./utils.ts";

const FORBIDDEN_IN_VERTICAL = new Set(["NumberStepperValue", "NumberStepperInput"]);
const SVELTE_BLOCK_TYPES = new Set([
    "SvelteIfBlock",
    "SvelteEachBlock",
    "SvelteAwaitBlock",
    "SvelteKeyBlock",
    "SvelteSnippetBlock",
]);

function findForbiddenMiddleElements(children: AST.SvelteElement["children"]): AST.SvelteElement[] {
    const matches: AST.SvelteElement[] = [];

    for (const child of children) {
        if (child.type === "SvelteElement") {
            const name = getElementName(child);
            if (FORBIDDEN_IN_VERTICAL.has(name)) {
                matches.push(child);
                continue;
            }
            if (name === "NumberStepper") continue;
            matches.push(...findForbiddenMiddleElements(child.children));
        } else if (SVELTE_BLOCK_TYPES.has(child.type)) {
            const block = child as unknown as {
                children?: AST.SvelteElement["children"];
                else?: { children?: AST.SvelteElement["children"] } | null;
                pending?: { children?: AST.SvelteElement["children"] } | null;
                then?: { children?: AST.SvelteElement["children"] } | null;
                catch?: { children?: AST.SvelteElement["children"] } | null;
            };
            for (const branch of [
                block.children,
                block.else?.children,
                block.pending?.children,
                block.then?.children,
                block.catch?.children,
            ]) {
                if (branch) {
                    matches.push(...findForbiddenMiddleElements(branch));
                }
            }
        }
    }

    return matches;
}

export const numberStepperNoMiddleInVerticalRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                'Disallow <NumberStepperValue> and <NumberStepperInput> inside <NumberStepper orientation="vertical">',
        },
        messages: {
            noMiddleInVertical:
                '<{{name}}> cannot be used inside <NumberStepper orientation="vertical">. Vertical steppers are strictly icon-only (<NumberStepperDecrement> and <NumberStepperIncrement>).',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "NumberStepper") return;

                const orientationAttr = findAttribute(node, "orientation");
                if (!orientationAttr) return;
                if (getLiteralStringValue(orientationAttr) !== "vertical") return;

                const forbidden = findForbiddenMiddleElements(node.children);
                for (const el of forbidden) {
                    context.report({
                        node: el.startTag as unknown as Rule.Node,
                        messageId: "noMiddleInVertical",
                        data: { name: getElementName(el) },
                    });
                }
            },
        };
    },
};

export const numberStepperConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "number-stepper": {
            rules: {
                "no-middle-in-vertical": numberStepperNoMiddleInVerticalRule,
            },
        },
    },
    rules: {
        "number-stepper/no-middle-in-vertical": "error",
    },
};
