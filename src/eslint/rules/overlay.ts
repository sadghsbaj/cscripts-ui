/**
 * ESLint rules for `<Overlay>` primitive components.
 *
 * Advises against placing `{@attach focusTrap()}` directly onto `<Overlay>`,
 * recommending it on the inner dialog or card content element instead.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { getElementName, shouldSkipFile } from "./utils.ts";

function isFocusTrapAttachment(attr: AST.SvelteStartTag["attributes"][number]): boolean {
    if (attr.type === "SvelteAttachTag") {
        const expr = attr.expression;
        if (expr.type === "Identifier") {
            return expr.name === "focusTrap";
        }
        if (expr.type === "CallExpression") {
            if (expr.callee.type === "Identifier" && expr.callee.name === "focusTrap") {
                return true;
            }
            if (
                expr.callee.type === "MemberExpression" &&
                expr.callee.property.type === "Identifier" &&
                expr.callee.property.name === "focusTrap"
            ) {
                return true;
            }
        }
    }

    // Support legacy action directive syntax (use:focusTrap) if encountered
    if (attr.type === "SvelteDirective" && attr.kind === "Action" && "name" in attr.key) {
        if (typeof attr.key.name === "string") {
            return attr.key.name === "focusTrap";
        }
        if ("name" in attr.key.name) {
            return attr.key.name.name === "focusTrap";
        }
    }

    return false;
}

export const overlayPreferFocusTrapOnContentRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        docs: {
            description: "Advise attaching focusTrap to inner content rather than <Overlay> directly",
        },
        messages: {
            focusTrapOnOverlay:
                'Avoid attaching "focusTrap" directly to <Overlay>. Typically, focus traps should be attached to the inner dialog or card element to establish proper accessibility boundaries.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Overlay") return;

                for (const attr of node.startTag.attributes) {
                    if (isFocusTrapAttachment(attr)) {
                        context.report({
                            node: attr as unknown as Rule.Node,
                            messageId: "focusTrapOnOverlay",
                        });
                    }
                }
            },
        };
    },
};

export const overlayConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        overlay: {
            rules: {
                "prefer-focus-trap-on-content": overlayPreferFocusTrapOnContentRule,
            },
        },
    },
    rules: {
        "overlay/prefer-focus-trap-on-content": "warn",
    },
};
