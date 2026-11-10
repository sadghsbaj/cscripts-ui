/**
 * Enforces compound structure, class placement, and `scrollFade` attachment usage on `<ScrollArea>` components:
 * - `require-structure`: Ensures `<ScrollArea>` contains `<ScrollAreaContent>`, `<ScrollAreaContent>` is used inside `<ScrollArea>`, and `<ScrollAreaOvershoot>` is not mounted manually.
 * - `no-outer-content-classes`: Forbids padding (`p-*`), gap/space (`gap-*`, `space-*`), and manual overflow/scrollbar utilities on the outer `<ScrollArea>` wrapper (they belong on `<ScrollAreaContent>`).
 * - `scroll-fade-on-content`: Warns when `{@attach scrollFade(...)}` is placed on `<ScrollArea>` instead of `<ScrollAreaContent>`, or when its `direction` conflicts with `<ScrollArea direction="...">`.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { findAttribute, getElementName, getLiteralStringValue, hasDescendantElement, shouldSkipFile } from "./utils.ts";

const PADDING_UTILITY_REGEX = /^p[xytblrse]?-(?:\d+(?:\.\d+)?|px|full|auto|\[.+\])$/;
const GAP_SPACE_UTILITY_REGEX =
    /^(?:gap-(?:[xy]-)?(?:\d+(?:\.\d+)?|px|\[.+\])|space-[xy]-(?:\d+(?:\.\d+)?|px|reverse|\[.+\]))$/;
const OVERFLOW_SCROLLBAR_UTILITY_REGEX =
    /^(?:overflow-(?:[xy]-)?(?:auto|scroll|hidden|clip|visible)|scrollbar-(?:sm|md|lg|none)|no-scrollbar)$/;

function findAncestorElement(node: AST.SvelteElement, targetName: string): AST.SvelteElement | undefined {
    let current = node.parent as AST.SvelteNode | null | undefined;
    while (current) {
        if (current.type === "SvelteElement" && getElementName(current) === targetName) {
            return current;
        }
        current = current.parent as AST.SvelteNode | null | undefined;
    }
    return undefined;
}

function isScrollFadeAttachment(attr: AST.SvelteStartTag["attributes"][number]): attr is AST.SvelteAttachTag {
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

function extractScrollFadeDirection(attr: AST.SvelteAttachTag): string | undefined {
    const expr = attr.expression;
    if (expr.type !== "CallExpression" || expr.arguments.length === 0) return undefined;
    const firstArg = expr.arguments[0];
    if (!firstArg || firstArg.type !== "ObjectExpression") return undefined;

    for (const prop of firstArg.properties) {
        if (
            prop.type === "Property" &&
            prop.key.type === "Identifier" &&
            prop.key.name === "direction" &&
            prop.value.type === "Literal" &&
            typeof prop.value.value === "string"
        ) {
            return prop.value.value;
        }
    }
    return undefined;
}

function extractClassTokensFromExpression(expr: unknown, out: string[]): void {
    if (!expr || typeof expr !== "object") return;
    const node = expr as {
        type?: string;
        value?: unknown;
        elements?: unknown[];
        consequent?: unknown;
        alternate?: unknown;
        left?: unknown;
        right?: unknown;
    };

    if (node.type === "Literal" && typeof node.value === "string") {
        for (const token of node.value.split(/\s+/)) {
            if (token) out.push(token);
        }
    } else if (node.type === "ArrayExpression" && Array.isArray(node.elements)) {
        for (const el of node.elements) {
            extractClassTokensFromExpression(el, out);
        }
    } else if (node.type === "ConditionalExpression") {
        extractClassTokensFromExpression(node.consequent, out);
        extractClassTokensFromExpression(node.alternate, out);
    } else if (node.type === "LogicalExpression") {
        extractClassTokensFromExpression(node.left, out);
        extractClassTokensFromExpression(node.right, out);
    }
}

function extractClassTokens(attr: AST.SvelteAttribute): string[] {
    const tokens: string[] = [];
    for (const part of attr.value) {
        if (part.type === "SvelteLiteral") {
            for (const token of part.value.split(/\s+/)) {
                if (token) tokens.push(token);
            }
        } else if (part.type === "SvelteMustacheTag") {
            extractClassTokensFromExpression(part.expression, tokens);
        }
    }
    return tokens;
}

function stripUtilityVariants(token: string): string {
    // Strip responsive/state variant prefixes (e.g. "lg:p-16", "dark:hover:p-4") outside bracket expressions
    let base = token;
    let bracketDepth = 0;
    let lastColonIndex = -1;

    for (const [i, ch] of [...token].entries()) {
        if (ch === "[") bracketDepth++;
        else if (ch === "]" && bracketDepth > 0) bracketDepth--;
        else if (ch === ":" && bracketDepth === 0) lastColonIndex = i;
    }

    if (lastColonIndex !== -1) {
        base = token.slice(lastColonIndex + 1);
    }

    // Strip leading important (!) or negative (-) modifiers
    return base.replace(/^[!-]+/, "");
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
            manualOvershoot:
                '<ScrollAreaOvershoot> is rendered internally by <ScrollArea>; configure it via the "overshoot" prop on <ScrollArea> instead.',
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
                } else if (name === "ScrollAreaContent" && !findAncestorElement(node, "ScrollArea")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "orphanedContent",
                    });
                } else if (name === "ScrollAreaOvershoot" && !context.filename?.endsWith("ScrollArea.svelte")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "manualOvershoot",
                    });
                }
            },
        };
    },
};

export const scrollAreaNoOuterContentClassesRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Forbid padding, gap/space, and overflow/scrollbar utilities on <ScrollArea> that belong on <ScrollAreaContent>",
        },
        messages: {
            paddingOnOuterWrapper:
                'Move padding utility "{{className}}" from <ScrollArea> to <ScrollAreaContent> so scrolling content is not clipped inside the padding box and overlay scrollbars reach the container edges.',
            gapOnOuterWrapper:
                'Move spacing utility "{{className}}" from <ScrollArea> to <ScrollAreaContent>; item layout belongs on the scrolling content container.',
            overflowOnOuterWrapper:
                'Remove "{{className}}" from <ScrollArea>; overflow and scrollbar behavior are managed automatically via the "direction" and "scrollbar" props.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "ScrollArea") return;

                const classAttr = findAttribute(node, "class");
                if (!classAttr) return;

                const tokens = extractClassTokens(classAttr);
                for (const token of tokens) {
                    const base = stripUtilityVariants(token);

                    if (PADDING_UTILITY_REGEX.test(base)) {
                        context.report({
                            node: classAttr as unknown as Rule.Node,
                            messageId: "paddingOnOuterWrapper",
                            data: { className: token },
                        });
                    } else if (GAP_SPACE_UTILITY_REGEX.test(base)) {
                        context.report({
                            node: classAttr as unknown as Rule.Node,
                            messageId: "gapOnOuterWrapper",
                            data: { className: token },
                        });
                    } else if (OVERFLOW_SCROLLBAR_UTILITY_REGEX.test(base)) {
                        context.report({
                            node: classAttr as unknown as Rule.Node,
                            messageId: "overflowOnOuterWrapper",
                            data: { className: token },
                        });
                    }
                }
            },
        };
    },
};

export const scrollAreaScrollFadeOnContentRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description:
                "Advise attaching scrollFade to <ScrollAreaContent> instead of <ScrollArea> and keeping its direction aligned",
        },
        messages: {
            scrollFadeOnOuterWrapper:
                'Attach "scrollFade" to <ScrollAreaContent> instead of <ScrollArea> so the CSS mask does not clip the overlay scrollbars.',
            directionMismatch:
                'scrollFade direction "{{fadeDirection}}" does not match parent <ScrollArea direction="{{areaDirection}}">.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (name === "ScrollArea") {
                    for (const attr of node.startTag.attributes) {
                        if (isScrollFadeAttachment(attr)) {
                            context.report({
                                node: attr as unknown as Rule.Node,
                                messageId: "scrollFadeOnOuterWrapper",
                            });
                        }
                    }
                } else if (name === "ScrollAreaContent") {
                    const parentScrollArea = findAncestorElement(node, "ScrollArea");
                    if (!parentScrollArea) return;

                    const areaDirectionAttr = findAttribute(parentScrollArea, "direction");
                    const areaDirection = areaDirectionAttr ? getLiteralStringValue(areaDirectionAttr) : undefined;
                    if (!areaDirection) return;

                    for (const attr of node.startTag.attributes) {
                        if (!isScrollFadeAttachment(attr)) continue;

                        const fadeDirection = extractScrollFadeDirection(attr);
                        if (fadeDirection && fadeDirection !== areaDirection) {
                            context.report({
                                node: attr as unknown as Rule.Node,
                                messageId: "directionMismatch",
                                data: {
                                    fadeDirection,
                                    areaDirection,
                                },
                            });
                        }
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
                "no-outer-content-classes": scrollAreaNoOuterContentClassesRule,
                "scroll-fade-on-content": scrollAreaScrollFadeOnContentRule,
            },
        },
    },
    rules: {
        "scroll-area/require-structure": "error",
        "scroll-area/no-outer-content-classes": "error",
        "scroll-area/scroll-fade-on-content": "warn",
    },
};
