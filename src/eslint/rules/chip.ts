/**
 * Enforces design system and compound structure constraints on `<Chip>` components:
 * - `require-standalone-props`: Requires explicit `variant` and `size` on `<Chip>` outside `<ChipGroup>`.
 * - `require-structure`: Ensures `<ChipLabel>`, `<ChipIcon>`, `<ChipRemove>`, and `<ChipTrigger>` are used inside `<Chip>`,
 *   and forbids `<ChipLabel>` inside `<Chip iconOnly>`.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    type ParentConstraint,
    checkRequiredParent,
    getElementName,
    hasAncestorOrSnippet,
    hasDescendantElement,
    hasProp,
    hasSpreadAttribute,
    isTruthyAttribute,
    shouldSkipFile,
} from "./utils.ts";

const CHIP_GROUP_ANCESTORS = new Set(["ChipGroup"]);
const CHIP_PARENT: ParentConstraint = { parents: new Set(["Chip"]), display: "<Chip>" };

const CHIP_PARENT_CONSTRAINTS: Record<string, ParentConstraint> = {
    ChipLabel: CHIP_PARENT,
    ChipIcon: CHIP_PARENT,
    ChipRemove: CHIP_PARENT,
    ChipTrigger: CHIP_PARENT,
};

export const chipRequireStandalonePropsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Require explicit 'variant' and 'size' props on standalone <Chip> outside <ChipGroup>.",
        },
        messages: {
            missingStandaloneProps:
                "Standalone <Chip> outside <ChipGroup> must specify explicit {{props}} prop(s).",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Chip") return;
                if (hasSpreadAttribute(node)) return;
                if (hasAncestorOrSnippet(node, CHIP_GROUP_ANCESTORS)) return;

                const missing: string[] = [];
                if (!hasProp(node, "variant")) missing.push('"variant"');
                if (!hasProp(node, "size")) missing.push('"size"');

                if (missing.length > 0) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingStandaloneProps",
                        data: { props: missing.join(" and ") },
                    });
                }
            },
        };
    },
};

export const chipStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce compound ownership for <Chip> subcomponents and forbid <ChipLabel> inside <Chip iconOnly>.",
        },
        messages: {
            invalidParent: "<{{child}}> must be used inside {{parent}}.",
            unexpectedLabelInIconOnly: "Icon-only <Chip iconOnly> must not contain a <ChipLabel> child.",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const name = getElementName(node);

                if (name === "Chip") {
                    if (isTruthyAttribute(node, "iconOnly") && hasDescendantElement(node.children, "ChipLabel")) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "unexpectedLabelInIconOnly",
                        });
                    }
                    return;
                }

                checkRequiredParent(context, node, CHIP_PARENT_CONSTRAINTS, "invalidParent");
            },
        };
    },
};

export const chipConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        chip: {
            rules: {
                "require-standalone-props": chipRequireStandalonePropsRule,
                "require-structure": chipStructureRule,
            },
        },
    },
    rules: {
        "chip/require-standalone-props": "error",
        "chip/require-structure": "error",
    },
};
