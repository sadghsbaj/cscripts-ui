/**
 * Enforces compound component structure and accessible touch targets on `<Button>` components:
 * - `require-structure`: Ensures `<ButtonLabel>` / `<ButtonIcon>` usage and accessible naming on `iconOnly` buttons.
 * - `require-hit-area`: Suggests adding `<HitArea />` to `iconOnly` buttons to guarantee adequate touch target area.
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

export const buttonStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce <ButtonLabel> / <ButtonIcon> compound structure and accessible naming on <Button> components",
        },
        messages: {
            missingLabelOrIconOnly: '<Button> must either specify "iconOnly" or contain a <ButtonLabel> child.',
            missingIconOnlyAriaLabel:
                'Icon-only <Button iconOnly> must specify an accessible "aria-label" or "aria-labelledby".',
            missingIconInIconOnly: "Icon-only <Button iconOnly> must contain a <ButtonIcon icon={...} /> child.",
            unexpectedLabelInIconOnly: "Icon-only <Button iconOnly> must not contain a <ButtonLabel> child.",
            rawIconInButton:
                "Use <ButtonIcon icon={{{name}}} /> instead of placing <{{name}}> directly inside <Button>.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const iconNames = getImportedIconNames(context);

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Button") return;

                const isIconOnly = isTruthyAttribute(node, "iconOnly");
                const hasLabel = hasDescendantElement(node.children, "ButtonLabel");
                const hasButtonIcon = hasDescendantElement(node.children, "ButtonIcon");

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
 * Advisory rule warning when icon-only `<Button iconOnly>` components omit a `<HitArea />` touch target expander.
 * Configured as a warning so developers can selectively disable it via `<!-- eslint-disable-next-line -->` where appropriate.
 */
export const buttonHitAreaRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise using <HitArea /> inside <Button iconOnly> to satisfy touch target guidelines",
        },
        messages: {
            missingHitArea:
                'Icon-only <Button iconOnly> should contain a <HitArea size="md" /> (or "lg") child to guarantee a solid 44px+ touch target, especially on rounded/squircle controls.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Button") return;
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

export const buttonConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        button: {
            rules: {
                "require-structure": buttonStructureRule,
                "require-hit-area": buttonHitAreaRule,
            },
        },
    },
    rules: {
        "button/require-structure": "error",
        "button/require-hit-area": "warn",
    },
};
