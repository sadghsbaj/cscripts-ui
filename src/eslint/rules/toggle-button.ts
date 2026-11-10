/**
 * Enforces compound component structure and accessible touch targets on `<ToggleButton>` components:
 * - `require-structure`: Ensures `<ToggleButtonLabel>` / `<ToggleButtonIcon>` usage and accessible naming on `iconOnly` toggle buttons.
 * - `require-hit-area`: Suggests adding `<HitArea />` to `iconOnly` toggle buttons to guarantee adequate touch target area.
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

export const toggleButtonStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce <ToggleButtonLabel> / <ToggleButtonIcon> compound structure and accessible naming on <ToggleButton> components",
        },
        messages: {
            missingLabelOrIconOnly:
                '<ToggleButton> must either specify "iconOnly" or contain a <ToggleButtonLabel> child.',
            missingIconOnlyAriaLabel:
                'Icon-only <ToggleButton iconOnly> must specify an accessible "aria-label" or "aria-labelledby".',
            missingIconInIconOnly:
                "Icon-only <ToggleButton iconOnly> must contain a <ToggleButtonIcon icon={...} /> child.",
            unexpectedLabelInIconOnly:
                "Icon-only <ToggleButton iconOnly> must not contain a <ToggleButtonLabel> child.",
            rawIconInButton:
                "Use <ToggleButtonIcon icon={{{name}}} /> instead of placing <{{name}}> directly inside <ToggleButton>.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const iconNames = getImportedIconNames(context);

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "ToggleButton") return;

                const isIconOnly = isTruthyAttribute(node, "iconOnly");
                const hasLabel = hasDescendantElement(node.children, "ToggleButtonLabel");
                const hasButtonIcon =
                    hasDescendantElement(node.children, "ToggleButtonIcon") ||
                    hasDescendantElement(node.children, "CopyIcon") ||
                    hasDescendantElement(node.children, "PasteIcon");

                if (isIconOnly) {
                    if (!hasAccessibleLabel(node)) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingIconOnlyAriaLabel",
                        });
                    }
                    if (!hasButtonIcon) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "missingIconInIconOnly",
                        });
                    }
                    if (hasLabel) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "unexpectedLabelInIconOnly",
                        });
                    }
                } else if (!hasLabel) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingLabelOrIconOnly",
                    });
                }

                const rawIcons = findRawIcons(node.children, iconNames);
                for (const rawIcon of rawIcons) {
                    context.report({
                        node: rawIcon.startTag as unknown as Rule.Node,
                        messageId: "rawIconInButton",
                        data: { name: getElementName(rawIcon) },
                    });
                }
            },
        };
    },
};

/**
 * Advisory rule warning when icon-only `<ToggleButton iconOnly>` components omit a `<HitArea />` touch target expander.
 * Configured as a warning so developers can selectively disable it via `<!-- eslint-disable-next-line -->` where appropriate.
 */
export const toggleButtonHitAreaRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise using <HitArea /> inside <ToggleButton iconOnly> to satisfy touch target guidelines",
        },
        messages: {
            missingHitArea:
                'Icon-only <ToggleButton iconOnly> should contain a <HitArea size="md" /> (or "lg") child to guarantee a solid 44px+ touch target, especially on rounded/squircle controls.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "ToggleButton") return;
                if (!isTruthyAttribute(node, "iconOnly")) return;

                if (!hasDescendantElement(node.children, "HitArea")) {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "missingHitArea",
                    });
                }
            },
        };
    },
};

export const toggleButtonConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "toggle-button": {
            rules: {
                "require-structure": toggleButtonStructureRule,
                "require-hit-area": toggleButtonHitAreaRule,
            },
        },
    },
    rules: {
        "toggle-button/require-structure": "error",
        "toggle-button/require-hit-area": "warn",
    },
};
