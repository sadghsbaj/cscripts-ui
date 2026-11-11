/**
 * Enforces compound component structure and state slot integrity on `<ButtonMorph>` and `<ButtonMorphItem>`:
 * - `require-items`: Ensures `<ButtonMorph>` contains at least 2 `<ButtonMorphItem>` children (or a dynamic `{#each}` loop)
 *   and validates that every `<ButtonMorphItem>` defines a unique, non-empty `value` prop.
 * - `require-button-child`: Ensures every `<ButtonMorphItem>` wraps an interactive button primitive
 *   (`<Button>`, `<ToggleButton>`, or `<CloseButton>`) and forbids placing unwrapped buttons directly inside `<ButtonMorph>`.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    findAttribute,
    getElementName,
    getLiteralStringValue,
    hasDescendantElement,
    shouldSkipFile,
} from "./utils.ts";

const VALID_MORPH_BUTTON_NAMES = new Set(["Button", "ToggleButton", "CloseButton"]);

interface CollectedMorphItems {
    items: AST.SvelteElement[];
    hasEachBlock: boolean;
}

function collectDirectMorphItems(children: AST.SvelteElement["children"]): CollectedMorphItems {
    const items: AST.SvelteElement[] = [];
    let hasEachBlock = false;

    for (const child of children) {
        if (child.type === "SvelteEachBlock") {
            hasEachBlock = true;
        }

        if (child.type === "SvelteElement") {
            const name = getElementName(child);
            if (name === "ButtonMorph") {
                continue;
            }
            if (name === "ButtonMorphItem") {
                items.push(child);
                continue;
            }
            const nested = collectDirectMorphItems(child.children);
            items.push(...nested.items);
            if (nested.hasEachBlock) {
                hasEachBlock = true;
            }
        } else if ("children" in child && Array.isArray(child.children)) {
            const nested = collectDirectMorphItems(child.children as AST.SvelteElement["children"]);
            items.push(...nested.items);
            if (nested.hasEachBlock) {
                hasEachBlock = true;
            }
        }

        if ("else" in child && child.else && "children" in child.else && Array.isArray(child.else.children)) {
            const nested = collectDirectMorphItems(child.else.children as AST.SvelteElement["children"]);
            items.push(...nested.items);
            if (nested.hasEachBlock) {
                hasEachBlock = true;
            }
        }
    }

    return { items, hasEachBlock };
}

function findUnwrappedButtons(children: AST.SvelteElement["children"]): AST.SvelteElement[] {
    const unwrapped: AST.SvelteElement[] = [];

    for (const child of children) {
        if (child.type === "SvelteElement") {
            const name = getElementName(child);
            if (name === "ButtonMorphItem" || name === "ButtonMorph") {
                continue;
            }
            if (VALID_MORPH_BUTTON_NAMES.has(name)) {
                unwrapped.push(child);
                continue;
            }
            unwrapped.push(...findUnwrappedButtons(child.children));
        } else if ("children" in child && Array.isArray(child.children)) {
            unwrapped.push(...findUnwrappedButtons(child.children as AST.SvelteElement["children"]));
        }

        if ("else" in child && child.else && "children" in child.else && Array.isArray(child.else.children)) {
            unwrapped.push(...findUnwrappedButtons(child.else.children as AST.SvelteElement["children"]));
        }
    }

    return unwrapped;
}

function hasValidValueAttribute(node: AST.SvelteElement): boolean {
    const valueAttr = findAttribute(node, "value");
    if (!valueAttr || valueAttr.boolean) return false;

    const literal = getLiteralStringValue(valueAttr);
    if (literal !== undefined) {
        return literal.trim().length > 0;
    }

    return valueAttr.value.some((v) => v.type === "SvelteMustacheTag");
}

function hasMorphButtonChild(children: AST.SvelteElement["children"]): boolean {
    for (const buttonName of VALID_MORPH_BUTTON_NAMES) {
        if (hasDescendantElement(children, buttonName)) {
            return true;
        }
    }
    return false;
}

export const buttonMorphRequireItemsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce at least two <ButtonMorphItem value='...'> slots with unique non-empty values inside <ButtonMorph>",
        },
        messages: {
            minItems: "<ButtonMorph> must contain at least 2 <ButtonMorphItem> state slots.",
            missingItemValue: '<ButtonMorphItem> must specify a non-empty "value" prop.',
            duplicateItemValue:
                'Duplicate <ButtonMorphItem value="{{value}}">. Each state slot inside <ButtonMorph> must have a unique value.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (name === "ButtonMorphItem") {
                    if (!hasValidValueAttribute(node)) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingItemValue",
                        });
                    }
                    return;
                }

                if (name !== "ButtonMorph") return;

                const { items, hasEachBlock } = collectDirectMorphItems(node.children);

                if (!hasEachBlock && items.length < 2) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "minItems",
                    });
                }

                const seenValues = new Set<string>();
                for (const item of items) {
                    const valueAttr = findAttribute(item, "value");
                    if (!valueAttr) continue;

                    const literal = getLiteralStringValue(valueAttr)?.trim();
                    if (!literal) continue;

                    if (seenValues.has(literal)) {
                        context.report({
                            node: valueAttr as unknown as Rule.Node,
                            messageId: "duplicateItemValue",
                            data: { value: literal },
                        });
                    } else {
                        seenValues.add(literal);
                    }
                }
            },
        };
    },
};

export const buttonMorphRequireButtonChildRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce that every <ButtonMorphItem> wraps a <Button>, <ToggleButton>, or <CloseButton> and forbid unwrapped buttons inside <ButtonMorph>",
        },
        messages: {
            missingButtonChild:
                "<ButtonMorphItem> must contain a <Button>, <ToggleButton>, or <CloseButton> child.",
            unwrappedButtonInMorph:
                'Wrap <{{name}}> in a <ButtonMorphItem value="..."> slot instead of placing it directly inside <ButtonMorph>.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (name === "ButtonMorphItem") {
                    if (!hasMorphButtonChild(node.children)) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingButtonChild",
                        });
                    }
                    return;
                }

                if (name !== "ButtonMorph") return;

                const unwrappedButtons = findUnwrappedButtons(node.children);
                for (const btn of unwrappedButtons) {
                    context.report({
                        node: btn.startTag as unknown as Rule.Node,
                        messageId: "unwrappedButtonInMorph",
                        data: { name: getElementName(btn) },
                    });
                }
            },
        };
    },
};

export const buttonMorphConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "button-morph": {
            rules: {
                "require-items": buttonMorphRequireItemsRule,
                "require-button-child": buttonMorphRequireButtonChildRule,
            },
        },
    },
    rules: {
        "button-morph/require-items": "error",
        "button-morph/require-button-child": "error",
    },
};
