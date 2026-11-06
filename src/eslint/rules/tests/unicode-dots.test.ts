import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import { unicodeDotsRule } from "../unicode-dots.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("unicode-dots ESLint rules", () => {
    describe("unicode-dots/no-unicode-dots", () => {
        it("forbids raw unicode separator dots in templates and strings", () => {
            ruleTester.run("unicode-dots/no-unicode-dots", unicodeDotsRule, {
                valid: [
                    {
                        code: '<span>Item 1</span><span class="dot-sm"></span><span>Item 2</span>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: 'const label = "Clean text without dots";',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Svelte text node with middle dot
                        code: "<span>Item 1 · Item 2</span>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "forbiddenDot",
                                data: { dot: "·" },
                            },
                        ],
                    },
                    {
                        // String literal with bullet dot
                        code: 'const text = "Item • Item";',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "forbiddenDot",
                                data: { dot: "•" },
                            },
                        ],
                    },
                    {
                        // Template literal
                        code: "const text = `Price ∙ Details`;",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "forbiddenDot",
                                data: { dot: "∙" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
