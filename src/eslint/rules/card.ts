/**
 * Enforces direct-child structural placement for `<Card>` subcomponents:
 * - `CardHeader`, `CardBody`, `CardFooter`, `CardMedia`, `CardRail`, `CardOrnament`, and `CardClose` must have `<Card>` as their direct element ancestor (Svelte control-flow blocks are transparent).
 * - `CardTitle` and `CardDescription` must have `<CardHeader>` or `<Card>` as their direct element ancestor.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { getElementName, shouldSkipFile } from "./utils.ts";

const CARD_DIRECT_CHILDREN = new Set([
    "CardHeader",
    "CardBody",
    "CardFooter",
    "CardMedia",
    "CardRail",
    "CardOrnament",
    "CardClose",
]);

const CARD_HEADER_OR_CARD_CHILDREN = new Set(["CardTitle", "CardDescription"]);

const CONTROL_FLOW_BLOCK_TYPES = new Set([
    "SvelteIfBlock",
    "SvelteElseBlock",
    "SvelteEachBlock",
    "SvelteAwaitBlock",
    "SvelteAwaitPendingBlock",
    "SvelteAwaitThenBlock",
    "SvelteAwaitCatchBlock",
    "SvelteKeyBlock",
]);

type AncestorResult =
    | { kind: "element"; element: AST.SvelteElement }
    | { kind: "snippet" }
    | { kind: "none" };

function getDirectElementAncestor(node: AST.SvelteElement): AncestorResult {
    let current = (node as unknown as { parent?: { type: string } }).parent;
    while (current) {
        if (current.type === "SvelteElement") {
            return { kind: "element", element: current as unknown as AST.SvelteElement };
        }
        if (current.type === "SvelteSnippetBlock") {
            return { kind: "snippet" };
        }
        if (!CONTROL_FLOW_BLOCK_TYPES.has(current.type)) {
            return { kind: "none" };
        }
        current = (current as { parent?: { type: string } }).parent;
    }
    return { kind: "none" };
}

export const cardStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce direct-child placement of <Card> subcomponents",
        },
        messages: {
            requireDirectCardParent:
                "<{{name}}> must be a direct child of <Card> (wrapping elements break .cs-card > ... CSS Grid tracks and CardClose clearance).",
            requireDirectCardOrHeaderParent:
                "<{{name}}> must be a direct child of <CardHeader> or <Card>.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (CARD_DIRECT_CHILDREN.has(name)) {
                    const ancestor = getDirectElementAncestor(node);
                    if (ancestor.kind === "snippet") return;
                    if (ancestor.kind !== "element" || getElementName(ancestor.element) !== "Card") {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "requireDirectCardParent",
                            data: { name },
                        });
                    }
                } else if (CARD_HEADER_OR_CARD_CHILDREN.has(name)) {
                    const ancestor = getDirectElementAncestor(node);
                    if (ancestor.kind === "snippet") return;
                    const parentName = ancestor.kind === "element" ? getElementName(ancestor.element) : "";
                    if (parentName !== "CardHeader" && parentName !== "Card") {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "requireDirectCardOrHeaderParent",
                            data: { name },
                        });
                    }
                }
            },
        };
    },
};

export const cardConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        card: {
            rules: {
                "require-structure": cardStructureRule,
            },
        },
    },
    rules: {
        "card/require-structure": "error",
    },
};
