/**
 * Enforces design system constraints on <ToggleButtonGroup> components:
 * - `no-regular-button`: Disallows using <Button> inside <ToggleButtonGroup> (and <ToggleButton> inside <ButtonGroup>).
 *   Group containers must use their respective button primitives.
 * - `uniform-buttons`: Enforces that all <ToggleButton> children within a <ToggleButtonGroup> share
 *   identical visual props (`size`, `variant`, `color`).
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { findAttribute, getElementName, shouldSkipFile } from "./utils.ts";

export const toggleButtonGroupNoRegularButtonRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow mixing <Button> and <ToggleButton> across group containers",
        },
        messages: {
            noRegularButtonInToggleButtonGroup:
                "<Button> is not permitted inside <ToggleButtonGroup>. Use <ToggleButton> for toggle button groups.",
            noToggleButtonInButtonGroup:
                "<ToggleButton> is not permitted inside <ButtonGroup>. Use <Button> for standard button groups.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (name === "Button") {
                    let current = (node as unknown as { parent?: AST.SvelteElement }).parent;
                    while (current) {
                        if (current.type === "SvelteElement" && getElementName(current) === "ToggleButtonGroup") {
                            context.report({
                                node: node.startTag as unknown as Rule.Node,
                                messageId: "noRegularButtonInToggleButtonGroup",
                            });
                            return;
                        }
                        current = (current as unknown as { parent?: AST.SvelteElement }).parent;
                    }
                } else if (name === "ToggleButton") {
                    let current = (node as unknown as { parent?: AST.SvelteElement }).parent;
                    while (current) {
                        if (current.type === "SvelteElement" && getElementName(current) === "ButtonGroup") {
                            context.report({
                                node: node.startTag as unknown as Rule.Node,
                                messageId: "noToggleButtonInButtonGroup",
                            });
                            return;
                        }
                        current = (current as unknown as { parent?: AST.SvelteElement }).parent;
                    }
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

function getPropSignature(context: Rule.RuleContext, button: AST.SvelteElement, propName: string): PropSignature {
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
            if (name === "ToggleButtonGroup" || name === "ButtonGroup") {
                // Do not descend into nested groups
                continue;
            }
            if (name === "ToggleButton") {
                buttons.push(child);
                continue;
            }
            buttons.push(...collectDirectGroupButtons(child.children));
        } else if ("children" in child && Array.isArray(child.children)) {
            buttons.push(...collectDirectGroupButtons(child.children as AST.SvelteElement["children"]));
        }

        if ("else" in child && child.else && "children" in child.else && Array.isArray(child.else.children)) {
            buttons.push(...collectDirectGroupButtons(child.else.children as AST.SvelteElement["children"]));
        }
    }

    return buttons;
}

const CHECKED_PROPS = ["size", "variant", "color"] as const;

export const toggleButtonGroupUniformButtonsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce consistent 'size', 'variant', and 'color' props across all <ToggleButton> elements in a <ToggleButtonGroup>",
        },
        messages: {
            mismatchedButtonProp:
                "All <ToggleButton> components inside a <ToggleButtonGroup> must have matching '{{propName}}' props. Expected {{expected}}, but found {{found}}.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "ToggleButtonGroup") return;

                const buttons = collectDirectGroupButtons(node.children);
                if (buttons.length < 2) return;

                const [firstBtn, ...remainingButtons] = buttons;
                if (!firstBtn) return;

                for (const propName of CHECKED_PROPS) {
                    const firstSig = getPropSignature(context, firstBtn, propName);

                    for (const currentBtn of remainingButtons) {
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

export const toggleButtonGroupConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "toggle-button-group": {
            rules: {
                "no-regular-button": toggleButtonGroupNoRegularButtonRule,
                "uniform-buttons": toggleButtonGroupUniformButtonsRule,
            },
        },
    },
    rules: {
        "toggle-button-group/no-regular-button": "error",
        "toggle-button-group/uniform-buttons": "error",
    },
};
