/**
 * Enforces design system constraints on `<Kbd>` keyboard shortcut components:
 * - `no-unicode-keys`: Forbids raw macOS/keycap Unicode symbols in favor of `<KbdSymbol />` or ASCII labels.
 * - `require-standalone-props`: Requires explicit `variant` and `size` on `<Kbd>` outside `<KbdGroup>`.
 * - `no-combo-text`: Forbids infix `+` key combinations inside a single `<Kbd>`.
 * - `no-raw-kbd`: Forbids native `<kbd>` elements in `.svelte` templates (outside `Kbd.svelte`).
 * - `no-macos-labels`: Forbids macOS-only key labels (`Cmd`, `Command`, `Option`, `Opt`) inside `<Kbd>`.
 * - `prefer-default-separator`: Enforces `<KbdSeparator />` instead of `<KbdSeparator>+</KbdSeparator>`.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { getElementName, shouldSkipFile } from "./utils.ts";

export const FORBIDDEN_UNICODE_KEYS_REGEX = /[\u{2318}\u{2325}\u{21E7}\u{2303}\u{23CE}\u{232B}\u{238B}\u{21E5}\u{21EA}\u{2326}]/u;

function hasProp(node: AST.SvelteElement, name: string): boolean {
    return node.startTag.attributes.some(
        (attr) =>
            (attr.type === "SvelteAttribute" || attr.type === "SvelteShorthandAttribute") &&
            attr.key.name === name
    );
}

const COMBO_TEXT_REGEX = /[A-Za-z0-9)]\s*\+\s*[A-Za-z0-9]/;
const MACOS_LABEL_REGEX = /^(?:cmd|command|option|opt)$/i;

export const kbdNoUnicodeKeysRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow unicode key symbols (e.g. ⌘, ⌥, ⇧, ⌃, ⏎) in favor of <KbdSymbol /> or ASCII key labels.",
        },
        messages: {
            forbiddenUnicodeKey:
                'Unicode key symbol "{{key}}" is forbidden. Use <KbdSymbol symbol="..." /> or ASCII key labels (e.g. "Ctrl", "Shift", "Enter") instead.',
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        function checkNode(node: Rule.Node, text: string | null | undefined): void {
            if (!text) return;
            const match = text.match(FORBIDDEN_UNICODE_KEYS_REGEX);
            if (match) {
                context.report({
                    node,
                    messageId: "forbiddenUnicodeKey",
                    data: { key: match[0] },
                });
            }
        }

        return {
            SvelteText(node: Rule.Node & { value?: string }): void {
                checkNode(node, node.value);
            },
            Literal(node: Rule.Node & { value?: unknown }): void {
                if (typeof node.value === "string") {
                    checkNode(node, node.value);
                }
            },
            TemplateElement(node: Rule.Node & { value?: { raw?: string } }): void {
                checkNode(node, node.value?.raw);
            },
        };
    },
};

export const kbdRequireStandalonePropsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Require explicit 'variant' and 'size' props on standalone <Kbd> outside <KbdGroup>.",
        },
        messages: {
            missingStandaloneProps:
                "Standalone <Kbd> outside <KbdGroup> must specify explicit {{props}} prop(s).",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Kbd") return;

                if (node.startTag.attributes.some((attr) => attr.type === "SvelteSpreadAttribute")) {
                    return;
                }

                let current = (node as unknown as { parent?: { type: string } }).parent;
                while (current) {
                    if (current.type === "SvelteSnippetBlock") {
                        return;
                    }
                    if (
                        current.type === "SvelteElement" &&
                        getElementName(current as unknown as AST.SvelteElement) === "KbdGroup"
                    ) {
                        return;
                    }
                    current = (current as { parent?: { type: string } }).parent;
                }

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

export const kbdNoComboTextRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow infix '+' key combinations inside a single <Kbd>.",
        },
        messages: {
            noComboText:
                'Do not put key combinations ("{{text}}") inside a single <Kbd>. Use <KbdGroup> with separate <Kbd> elements and <KbdSeparator /> instead.',
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Kbd") return;

                for (const child of node.children) {
                    if (child.type === "SvelteText" && COMBO_TEXT_REGEX.test(child.value)) {
                        context.report({
                            node: child as unknown as Rule.Node,
                            messageId: "noComboText",
                            data: { text: child.value.trim() },
                        });
                    }
                }
            },
        };
    },
};

export const kbdNoRawKbdRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow native <kbd> elements in .svelte templates in favor of <Kbd>.",
        },
        messages: {
            noRawKbd: 'Native <kbd> element is forbidden. Use the <Kbd> component from "cs/svelte/kbd" instead.',
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (node.kind === "html" && getElementName(node) === "kbd") {
                    context.report({
                        node: node.startTag as unknown as Rule.Node,
                        messageId: "noRawKbd",
                    });
                }
            },
        };
    },
};

export const kbdNoMacosLabelsRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Disallow macOS-only key labels (Cmd, Command, Option, Opt) inside <Kbd>.",
        },
        messages: {
            noMacosLabel:
                'Platform-specific macOS key label "{{label}}" is forbidden inside <Kbd>. Use cross-platform labels like "Ctrl" or "Alt" instead.',
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "Kbd") return;

                for (const child of node.children) {
                    if (child.type !== "SvelteText") continue;
                    const trimmed = child.value.trim();
                    if (MACOS_LABEL_REGEX.test(trimmed)) {
                        context.report({
                            node: child as unknown as Rule.Node,
                            messageId: "noMacosLabel",
                            data: { label: trimmed },
                        });
                    }
                }
            },
        };
    },
};

export const kbdPreferDefaultSeparatorRule: Rule.RuleModule = {
    meta: {
        type: "suggestion",
        fixable: "code",
        docs: {
            description: 'Prefer self-closing <KbdSeparator /> instead of <KbdSeparator>+</KbdSeparator>.',
        },
        messages: {
            preferDefaultSeparator:
                'Use self-closing <KbdSeparator /> instead of <KbdSeparator>+</KbdSeparator> ("+" is the default separator).',
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                if (getElementName(node) !== "KbdSeparator") return;
                if (node.children.length !== 1) return;

                const [child] = node.children;
                if (!child || child.type !== "SvelteText" || child.value.trim() !== "+") return;

                const endTag = node.endTag;
                context.report({
                    node: node as unknown as Rule.Node,
                    messageId: "preferDefaultSeparator",
                    fix: endTag
                        ? (fixer): Rule.Fix => {
                              const hasLeadingSpace =
                                  context.sourceCode.text[node.startTag.range[1] - 2] === " ";
                              return fixer.replaceTextRange(
                                  [node.startTag.range[1] - 1, endTag.range[1]],
                                  hasLeadingSpace ? "/>" : " />"
                              );
                          }
                        : undefined,
                });
            },
        };
    },
};

const kbdPlugin = {
    rules: {
        "no-unicode-keys": kbdNoUnicodeKeysRule,
        "require-standalone-props": kbdRequireStandalonePropsRule,
        "no-combo-text": kbdNoComboTextRule,
        "no-raw-kbd": kbdNoRawKbdRule,
        "no-macos-labels": kbdNoMacosLabelsRule,
        "prefer-default-separator": kbdPreferDefaultSeparatorRule,
    },
};

export const kbdConfigs: Linter.Config[] = [
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts,svelte}"],
        plugins: { kbd: kbdPlugin },
        rules: {
            "kbd/no-unicode-keys": "error",
        },
    },
    {
        files: ["**/*.svelte"],
        plugins: { kbd: kbdPlugin },
        rules: {
            "kbd/require-standalone-props": "error",
            "kbd/no-combo-text": "error",
            "kbd/no-raw-kbd": "error",
            "kbd/no-macos-labels": "error",
            "kbd/prefer-default-separator": "error",
        },
    },
];
