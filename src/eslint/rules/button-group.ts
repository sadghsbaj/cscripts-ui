/**
 * Enforces design system constraints on <ButtonGroup> components:
 * - `no-solid-variant`: Disallows using <Button variant="solid"> inside <ButtonGroup>.
 *   ButtonGroup components are intended for grouped or segmented controls and must use "soft", "ghost", or "elevated".
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { findAttribute, getElementName, getLiteralStringValue, shouldSkipFile } from "./utils.ts";

export const buttonGroupNoSolidRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow <Button variant='solid'> inside <ButtonGroup>",
        },
        messages: {
            noSolidInButtonGroup:
                '<Button variant="solid"> is not permitted inside <ButtonGroup>. Button groups must use "soft", "ghost", or "elevated" variants.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Button") return;

                const variantAttr = findAttribute(node, "variant");
                if (!variantAttr) return;

                const variant = getLiteralStringValue(variantAttr);
                if (variant !== "solid") return;

                let current = (node as unknown as { parent?: AST.SvelteElement }).parent;
                while (current) {
                    if (current.type === "SvelteElement" && getElementName(current) === "ButtonGroup") {
                        context.report({
                            node: variantAttr as unknown as Rule.Node,
                            messageId: "noSolidInButtonGroup",
                        });
                        return;
                    }
                    current = (current as unknown as { parent?: AST.SvelteElement }).parent;
                }
            },
        };
    },
};

export const buttonGroupConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "button-group": {
            rules: {
                "no-solid-variant": buttonGroupNoSolidRule,
            },
        },
    },
    rules: {
        "button-group/no-solid-variant": "error",
    },
};
