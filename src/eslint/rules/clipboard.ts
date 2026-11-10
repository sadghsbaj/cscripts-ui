/**
 * Enforces standardized clipboard interactions across TypeScript and Svelte files:
 * - `no-native-clipboard`: Forbids direct `navigator.clipboard` or `document.execCommand("copy" | "cut" | "paste")`
 *   calls in favor of `copyOnClick`, `pasteOnClick`, `copyToClipboard`, and `readFromClipboard` from `cs/svelte/clipboard`.
 * - `prefer-clipboard-icons`: Forbids passing raw Lucide copy/paste icons (`Copy`, `Clipboard`, `ClipboardCopy`, `ClipboardPaste`)
 *   to `<ButtonIcon>` or `<ToggleButtonIcon>` when `<CopyIcon />` or `<PasteIcon />` should be used for animated state feedback.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { findAttribute, getElementName, shouldSkipFile } from "./utils.ts";

const CLIPBOARD_EXEC_COMMANDS = new Set(["copy", "cut", "paste"]);
const RAW_COPY_ICON_NAMES = new Set(["Copy", "ClipboardCopy", "ClipboardCheck"]);
const RAW_PASTE_ICON_NAMES = new Set(["Clipboard", "ClipboardPaste"]);

function isClipboardUtilsFile(context: Rule.RuleContext): boolean {
    const filename = (context.filename ?? "").replaceAll("\\", "/");
    return filename.endsWith("/clipboard/clipboard.utils.ts") || filename === "clipboard.utils.ts";
}

export const noNativeClipboardRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Forbid direct navigator.clipboard and document.execCommand clipboard calls in favor of cs/svelte/clipboard",
        },
        messages: {
            forbiddenNavigatorClipboard:
                'Direct use of "navigator.clipboard" is forbidden. Use "{@attach copyOnClick(...)}" / "{@attach pasteOnClick(...)}" (with "<CopyIcon />" / "<PasteIcon />") in components, or "copyToClipboard()" / "readFromClipboard()" from "cs/svelte/clipboard" in scripts.',
            forbiddenExecCommand:
                'Direct use of \'document.execCommand("{{command}}")\' is forbidden. Use "copyToClipboard()" or "{@attach copyOnClick(...)}" from "cs/svelte/clipboard" instead.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context) || isClipboardUtilsFile(context)) return {};

        return {
            MemberExpression(node: Rule.Node): void {
                const member = node as unknown as {
                    object?: {
                        type?: string;
                        name?: string;
                        object?: { type?: string; name?: string };
                        property?: { type?: string; name?: string };
                    };
                    property?: { type?: string; name?: string };
                };

                if (member.property?.type !== "Identifier" || member.property.name !== "clipboard") {
                    return;
                }

                const isNavigator =
                    (member.object?.type === "Identifier" && member.object.name === "navigator") ||
                    (member.object?.type === "MemberExpression" &&
                        member.object.object?.type === "Identifier" &&
                        (member.object.object.name === "window" || member.object.object.name === "globalThis") &&
                        member.object.property?.type === "Identifier" &&
                        member.object.property.name === "navigator");

                if (isNavigator) {
                    context.report({
                        node,
                        messageId: "forbiddenNavigatorClipboard",
                    });
                }
            },

            CallExpression(node: Rule.Node): void {
                const call = node as unknown as {
                    callee?: {
                        type?: string;
                        object?: { type?: string; name?: string };
                        property?: { type?: string; name?: string };
                    };
                    arguments?: Array<{ type?: string; value?: unknown }>;
                };

                if (
                    call.callee?.type === "MemberExpression" &&
                    call.callee.object?.type === "Identifier" &&
                    call.callee.object.name === "document" &&
                    call.callee.property?.type === "Identifier" &&
                    call.callee.property.name === "execCommand"
                ) {
                    const firstArg = call.arguments?.[0];
                    if (firstArg?.type === "Literal" && typeof firstArg.value === "string") {
                        const cmd = firstArg.value.toLowerCase();
                        if (CLIPBOARD_EXEC_COMMANDS.has(cmd)) {
                            context.report({
                                node,
                                messageId: "forbiddenExecCommand",
                                data: { command: firstArg.value },
                            });
                        }
                    }
                }
            },
        };
    },
};

export const preferClipboardIconsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce <CopyIcon /> and <PasteIcon /> from cs/svelte/clipboard instead of raw Lucide copy/paste icons inside <ButtonIcon> or <ToggleButtonIcon>",
        },
        messages: {
            preferCopyIcon:
                'Use "<CopyIcon />" from "cs/svelte/clipboard" instead of "<{{wrapper}} icon={{{icon}}} />" so copy feedback animations work automatically.',
            preferPasteIcon:
                'Use "<PasteIcon />" from "cs/svelte/clipboard" instead of "<{{wrapper}} icon={{{icon}}} />" so paste feedback animations work automatically.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                const tagName = getElementName(node);
                if (tagName !== "ButtonIcon" && tagName !== "ToggleButtonIcon") return;

                const iconAttr = findAttribute(node, "icon");
                if (!iconAttr) return;

                for (const val of iconAttr.value) {
                    if (val.type !== "SvelteMustacheTag" || val.expression.type !== "Identifier") continue;

                    const iconName = val.expression.name;
                    if (RAW_COPY_ICON_NAMES.has(iconName)) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "preferCopyIcon",
                            data: { wrapper: tagName, icon: iconName },
                        });
                    } else if (RAW_PASTE_ICON_NAMES.has(iconName)) {
                        context.report({
                            node: node.startTag as unknown as Rule.Node,
                            messageId: "preferPasteIcon",
                            data: { wrapper: tagName, icon: iconName },
                        });
                    }
                }
            },
        };
    },
};

export const clipboardConfig: Linter.Config = {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,svelte}"],
    plugins: {
        clipboard: {
            rules: {
                "no-native-clipboard": noNativeClipboardRule,
                "prefer-clipboard-icons": preferClipboardIconsRule,
            },
        },
    },
    rules: {
        "clipboard/no-native-clipboard": "error",
        "clipboard/prefer-clipboard-icons": "error",
    },
};
