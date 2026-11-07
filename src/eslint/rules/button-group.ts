/**
 * Enforces design system constraints on <ButtonGroup> components:
 * - `no-solid-variant`: Disallows using <Button variant="solid"> inside <ButtonGroup>.
 *   ButtonGroup components are intended for grouped or segmented controls and must use "soft", "ghost", or "elevated".
 * - `uniform-buttons`: Enforces that all <Button> children within a <ButtonGroup> share
 *   identical visual props (`size`, `variant`, `color`).
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

interface PropSignature {
    key: string;
    display: string;
    attr?: AST.SvelteAttribute;
}

function getPropSignature(
    context: Rule.RuleContext,
    button: AST.SvelteElement,
    propName: string
): PropSignature {
    const attr = findAttribute(button, propName);
    if (!attr) {
        return { key: "omitted", display: "(omitted)" };
    }

    if (attr.boolean) {
        return { key: "boolean:true", display: "true", attr };
    }

    const firstVal = attr.value[0];
    if (!firstVal) {
        return { key: "omitted", display: "(omitted)", attr };
    }

    if (firstVal.type === "SvelteLiteral") {
        return { key: `literal:${firstVal.value}`, display: `"${firstVal.value}"`, attr };
    }

    if (firstVal.type === "SvelteMustacheTag") {
        const expr = firstVal.expression;
        if (expr.type === "Literal" && (typeof expr.value === "string" || typeof expr.value === "number")) {
            return { key: `literal:${expr.value}`, display: `"${expr.value}"`, attr };
        }
        if (expr.type === "Identifier") {
            return { key: `var:${expr.name}`, display: `{${expr.name}}`, attr };
        }
        const text = context.sourceCode.getText(expr as unknown as Rule.Node);
        return { key: `expr:${text}`, display: `{${text}}`, attr };
    }

    const rawText = context.sourceCode.getText(attr as unknown as Rule.Node);
    return { key: `raw:${rawText}`, display: rawText, attr };
}

function collectDirectGroupButtons(children: AST.SvelteElement["children"]): AST.SvelteElement[] {
    const buttons: AST.SvelteElement[] = [];

    for (const child of children) {
        if (child.type === "SvelteElement") {
            const name = getElementName(child);
            if (name === "ButtonGroup") {
                // Do not descend into nested groups
                continue;
            }
            if (name === "Button") {
                buttons.push(child);
                continue;
            }
            buttons.push(...collectDirectGroupButtons(child.children));
        } else if ("children" in child && Array.isArray(child.children)) {
            buttons.push(...collectDirectGroupButtons(child.children as AST.SvelteElement["children"]));
        }

        if (
            "else" in child &&
            child.else &&
            "children" in child.else &&
            Array.isArray(child.else.children)
        ) {
            buttons.push(...collectDirectGroupButtons(child.else.children as AST.SvelteElement["children"]));
        }
    }

    return buttons;
}

const CHECKED_PROPS = ["size", "variant", "color"] as const;

export const buttonGroupUniformButtonsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce consistent 'size', 'variant', and 'color' props across all <Button> elements in a <ButtonGroup>",
        },
        messages: {
            mismatchedButtonProp:
                "All <Button> components inside a <ButtonGroup> must have matching '{{propName}}' props. Expected {{expected}}, but found {{found}}.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "ButtonGroup") return;

                const buttons = collectDirectGroupButtons(node.children);
                if (buttons.length < 2) return;

                for (const propName of CHECKED_PROPS) {
                    const firstSig = getPropSignature(context, buttons[0], propName);

                    for (let i = 1; i < buttons.length; i++) {
                        const currentBtn = buttons[i];
                        const currentSig = getPropSignature(context, currentBtn, propName);

                        if (currentSig.key !== firstSig.key) {
                            context.report({
                                node: (currentSig.attr ?? currentBtn.startTag) as unknown as Rule.Node,
                                messageId: "mismatchedButtonProp",
                                data: {
                                    propName,
                                    expected: firstSig.display,
                                    found: currentSig.display,
                                },
                            });
                        }
                    }
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
                "uniform-buttons": buttonGroupUniformButtonsRule,
            },
        },
    },
    rules: {
        "button-group/no-solid-variant": "error",
        "button-group/uniform-buttons": "error",
    },
};
