/**
 * Enforces `@layer attachments` on all standalone `.attach.css` files inside `primitives/` folders.
 */

import type { Linter, Rule } from "eslint";

export const attachmentCssParser = {
    meta: {
        name: "attachment-css-parser",
    },
    parseForESLint(code: string): {
        ast: {
            type: "Program";
            body: [];
            comments: [];
            tokens: [];
            loc: { start: { line: number; column: number }; end: { line: number; column: number } };
            range: [number, number];
        };
    } {
        return {
            ast: {
                type: "Program",
                body: [],
                comments: [],
                tokens: [],
                loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
                range: [0, code.length],
            },
        };
    },
};

export const attachmentLayerRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce @layer attachments on .attach.css files in primitives directories",
        },
        messages: {
            missingAttachmentLayer: "Attachment CSS must be wrapped in '@layer attachments { ... }'.",
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        const filename = context.filename ?? "";
        if (!filename.includes(".attach.css") || !filename.includes("svelte/primitives/")) return {};

        return {
            Program(node: unknown): void {
                const text = context.sourceCode.text;
                if (!/@layer\s+attachments\b/.test(text)) {
                    context.report({
                        node: node as Rule.Node,
                        messageId: "missingAttachmentLayer",
                    });
                }
            },
        };
    },
};

export const attachmentLayersConfig: Linter.Config = {
    files: ["**/*.attach.css"],
    languageOptions: {
        parser: attachmentCssParser,
    },
    plugins: {
        "attachment-layers": {
            rules: {
                "require-attachment-layer": attachmentLayerRule,
            },
        },
    },
    rules: {
        "attachment-layers/require-attachment-layer": "error",
    },
};
