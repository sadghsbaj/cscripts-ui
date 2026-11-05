/**
 * Advisory rule warning when `<CloseButton>` components omit a `<HitArea />` touch target expander.
 * Configured as a warning so developers can selectively disable it via `<!-- eslint-disable-next-line -->` where appropriate.
 */

import type { Linter, Rule } from "eslint";
import type { AST } from "svelte-eslint-parser";
import { getElementName, hasDescendantElement, shouldSkipFile } from "./utils";

export const closeButtonHitAreaRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise using <HitArea /> inside <CloseButton> to satisfy touch target guidelines",
        },
        messages: {
            missingHitArea:
                '<CloseButton> should contain a <HitArea size="md" /> (or "lg") child to guarantee a solid 44px+ touch target.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "CloseButton") return;

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

export const closeButtonConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        "close-button": {
            rules: {
                "require-hit-area": closeButtonHitAreaRule,
            },
        },
    },
    rules: {
        "close-button/require-hit-area": "warn",
    },
};
