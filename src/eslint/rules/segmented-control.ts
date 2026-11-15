/**
 * Enforces compound component structure and accessible naming on `<SegmentedControlItem>` components:
 * - `require-structure`: Ensures `<SegmentedControlLabel>` / `<SegmentedControlIcon>` usage and accessible naming on icon-only segments.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    findRawIcons,
    getElementName,
    getImportedIconNames,
    hasAccessibleLabel,
    hasDescendantElement,
    shouldSkipFile,
} from "./utils.ts";

export const segmentedControlStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce <SegmentedControlLabel> / <SegmentedControlIcon> compound structure and accessible naming on <SegmentedControlItem> components",
        },
        messages: {
            missingLabelOrIcon:
                "<SegmentedControlItem> must contain a <SegmentedControlLabel> or <SegmentedControlIcon> child.",
            missingIconOnlyAriaLabel:
                'Icon-only <SegmentedControlItem> must specify an accessible "aria-label" or "aria-labelledby".',
            rawIconInItem:
                "Use <SegmentedControlIcon icon={{{name}}} /> instead of placing <{{name}}> directly inside <SegmentedControlItem>.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const iconNames = getImportedIconNames(context);

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "SegmentedControlItem") return;

                const hasLabel = hasDescendantElement(node.children, "SegmentedControlLabel");
                const hasIcon = hasDescendantElement(node.children, "SegmentedControlIcon");

                if (!hasLabel && !hasIcon) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingLabelOrIcon",
                    });
                } else if (hasIcon && !hasLabel && !hasAccessibleLabel(node)) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingIconOnlyAriaLabel",
                    });
                }

                const rawIcons = findRawIcons(node.children, iconNames);
                for (const rawIcon of rawIcons) {
                    context.report({
                        node: rawIcon.startTag as unknown as Rule.Node,
                        messageId: "rawIconInItem",
                        data: { name: getElementName(rawIcon) },
                    });
                }
            },
        };
    },
};

export const segmentedControlConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "segmented-control": {
            rules: {
                "require-structure": segmentedControlStructureRule,
            },
        },
    },
    rules: {
        "segmented-control/require-structure": "error",
    },
};
