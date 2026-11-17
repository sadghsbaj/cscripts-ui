/**
 * Enforces compound component structure and accessible naming on `<Badge>` components:
 * - `require-structure`: Prevents raw icons inside `<Badge>` (use `<BadgeIcon icon={...} />`), and on `iconOnly` badges requires `<BadgeIcon>`, forbids `<BadgeLabel>`, and requires `aria-label` or `aria-labelledby` (unless `aria-hidden="true"`).
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    findRawIcons,
    getElementName,
    getImportedIconNames,
    hasAccessibleLabel,
    hasDescendantElement,
    isTruthyAttribute,
    shouldSkipFile,
} from "./utils.ts";

export const badgeStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce <BadgeIcon> usage for icons and accessible naming on icon-only <Badge> components",
        },
        messages: {
            missingIconOnlyAriaLabel:
                'Icon-only <Badge iconOnly> must specify an accessible "aria-label" or "aria-labelledby" (or aria-hidden="true").',
            missingIconInIconOnly: "Icon-only <Badge iconOnly> must contain a <BadgeIcon icon={...} /> child.",
            unexpectedLabelInIconOnly: "Icon-only <Badge iconOnly> must not contain a <BadgeLabel> child.",
            rawIconInBadge:
                "Use <BadgeIcon icon={{{name}}} /> instead of placing <{{name}}> directly inside <Badge>.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const iconNames = getImportedIconNames(context);

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Badge") return;

                const isIconOnly = isTruthyAttribute(node, "iconOnly");
                if (isIconOnly) {
                    const hasSpread = node.startTag.attributes.some(
                        (attr) => attr.type === "SvelteSpreadAttribute"
                    );
                    if (!isTruthyAttribute(node, "aria-hidden") && !hasSpread && !hasAccessibleLabel(node)) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingIconOnlyAriaLabel",
                        });
                    }
                    if (!hasDescendantElement(node.children, "BadgeIcon")) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingIconInIconOnly",
                        });
                    }
                    if (hasDescendantElement(node.children, "BadgeLabel")) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "unexpectedLabelInIconOnly",
                        });
                    }
                }

                const rawIcons = findRawIcons(node.children, iconNames);
                for (const rawIcon of rawIcons) {
                    context.report({
                        node: rawIcon.startTag as unknown as Rule.Node,
                        messageId: "rawIconInBadge",
                        data: { name: getElementName(rawIcon) },
                    });
                }
            },
        };
    },
};

export const badgeConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        badge: {
            rules: {
                "require-structure": badgeStructureRule,
            },
        },
    },
    rules: {
        "badge/require-structure": "error",
    },
};
