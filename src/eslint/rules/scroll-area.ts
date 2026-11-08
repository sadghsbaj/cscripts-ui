/**
 * Enforces compound structure and proper `scrollFade` attachment placement on `<ScrollArea>` components:
 * - `require-structure`: Ensures `<ScrollArea>` contains `<ScrollAreaContent>` and `<ScrollAreaContent>` is used inside `<ScrollArea>`.
 * - `scroll-fade-on-content`: Warns when `{@attach scrollFade(...)}` is placed on `<ScrollArea>` instead of `<ScrollAreaContent>`.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { getElementName, hasDescendantElement, shouldSkipFile } from "./utils.ts";

function hasAncestorElement(node: AST.SvelteElement, targetName: string): boolean {
    let current = node.parent as AST.SvelteNode | null | undefined;
    while (current) {
        if (current.type === "SvelteElement" && getElementName(current) === targetName) {
            return true;
        }
        current = current.parent as AST.SvelteNode | null | undefined;
    }
    return false;
}

function isScrollFadeAttachment(attr: AST.SvelteStartTag["attributes"][number]): boolean {
    if (attr.type !== "SvelteAttachTag") return false;
    const expr = attr.expression;
    if (expr.type === "Identifier") {
        return expr.name === "scrollFade";
    }
    if (expr.type === "CallExpression" && expr.callee.type === "Identifier") {
        return expr.callee.name === "scrollFade";
    }
    return false;
}

export const scrollAreaStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce <ScrollArea> and <ScrollAreaContent> compound structure",
        },
        messages: {
            missingContent: "<ScrollArea> must contain a <ScrollAreaContent> child.",
            orphanedContent: "<ScrollAreaContent> must be used inside a <ScrollArea> component.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (name === "ScrollArea" && !hasDescendantElement(node.children, "ScrollAreaContent")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingContent",
                    });
                } else if (name === "ScrollAreaContent" && !hasAncestorElement(node, "ScrollArea")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "orphanedContent",
                    });
                }
            },
        };
    },
};

export const scrollAreaScrollFadeOnContentRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise attaching scrollFade to <ScrollAreaContent> instead of the outer <ScrollArea>",
        },
        messages: {
            scrollFadeOnOuterWrapper:
                'Attach "scrollFade" to <ScrollAreaContent> instead of <ScrollArea> so the CSS mask does not clip the overlay scrollbars.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "ScrollArea") return;

                for (const attr of node.startTag.attributes) {
                    if (isScrollFadeAttachment(attr)) {
                        context.report({
                            node: attr as unknown as Rule.Node,
                            messageId: "scrollFadeOnOuterWrapper",
                        });
                    }
                }
            },
        };
    },
};

export const scrollAreaConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "scroll-area": {
            rules: {
                "require-structure": scrollAreaStructureRule,
                "scroll-fade-on-content": scrollAreaScrollFadeOnContentRule,
            },
        },
    },
    rules: {
        "scroll-area/require-structure": "error",
        "scroll-area/scroll-fade-on-content": "warn",
    },
};
