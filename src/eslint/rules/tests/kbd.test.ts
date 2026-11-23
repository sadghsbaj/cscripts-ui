/* eslint-disable unicorn/no-incorrect-template-string-interpolation */
import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import {
    kbdNoComboTextRule,
    kbdNoMacosLabelsRule,
    kbdNoRawKbdRule,
    kbdNoUnicodeKeysRule,
    kbdPreferDefaultSeparatorRule,
    kbdRequireStandalonePropsRule,
} from "../kbd.ts";

const svelteRuleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
        parserOptions: {
            parser: ts.parser,
        },
    },
});

const tsRuleTester = new RuleTester({
    languageOptions: {
        parser: ts.parser,
    },
});

describe("kbd ESLint rules", () => {
    describe("kbd/no-unicode-keys", () => {
        it("forbids unicode key symbols in .ts literals and template elements", () => {
            tsRuleTester.run("kbd/no-unicode-keys (ts)", kbdNoUnicodeKeysRule, {
                valid: [
                    {
                        code: 'const shortcut = "Ctrl + K";',
                        filename: "src/shortcuts.ts",
                    },
                    {
                        code: "const hint = `Press Shift + Enter`;",
                        filename: "src/shortcuts.ts",
                    },
                    {
                        // Skips eslint internal files
                        code: 'const symbol = "⌘";',
                        filename: "src/eslint/rules/kbd.ts",
                    },
                    {
                        // Skips *.test.ts files
                        code: 'const symbol = "⌥";',
                        filename: "src/modules/kbd/kbd.test.ts",
                    },
                ],
                invalid: [
                    {
                        code: 'const key = "⌘";',
                        filename: "src/shortcuts.ts",
                        errors: [
                            {
                                messageId: "forbiddenUnicodeKey",
                                data: { key: "⌘" },
                            },
                        ],
                    },
                    {
                        code: 'const combo = "Press ⇧+K";',
                        filename: "src/shortcuts.ts",
                        errors: [
                            {
                                messageId: "forbiddenUnicodeKey",
                                data: { key: "⇧" },
                            },
                        ],
                    },
                    {
                        code: "const hint = `Use ⌥ to open`;",
                        filename: "src/shortcuts.ts",
                        errors: [
                            {
                                messageId: "forbiddenUnicodeKey",
                                data: { key: "⌥" },
                            },
                        ],
                    },
                ],
            });
        });

        it("forbids unicode key symbols in .svelte templates and scripts", () => {
            svelteRuleTester.run("kbd/no-unicode-keys (svelte)", kbdNoUnicodeKeysRule, {
                valid: [
                    {
                        code: '<Kbd variant="soft" size="md">Ctrl</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<KbdSymbol symbol="command" />',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Kbd variant="soft" size="md">⌘</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "forbiddenUnicodeKey",
                                data: { key: "⌘" },
                            },
                        ],
                    },
                    {
                        code: "<span>Press ⏎ to confirm</span>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "forbiddenUnicodeKey",
                                data: { key: "⏎" },
                            },
                        ],
                    },
                    {
                        code: "<span>Delete with ⌫ or ⌃</span>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "forbiddenUnicodeKey",
                                data: { key: "⌫" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("kbd/require-standalone-props", () => {
        it("requires explicit variant and size props on standalone <Kbd> outside <KbdGroup>", () => {
            svelteRuleTester.run("kbd/require-standalone-props", kbdRequireStandalonePropsRule, {
                valid: [
                    {
                        code: '<Kbd variant="soft" size="md">Ctrl</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Shorthand props
                        code: "<Kbd {variant} {size}>Ctrl</Kbd>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Mixed literal and shorthand prop
                        code: '<Kbd variant="outline" {size}>Ctrl</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside <KbdGroup>
                        code: `
                        <KbdGroup>
                            <Kbd>Ctrl</Kbd>
                            <KbdSeparator />
                            <Kbd>K</Kbd>
                        </KbdGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Nested inside <KbdGroup>
                        code: `
                        <KbdGroup>
                            <div>
                                <Kbd>Ctrl</Kbd>
                            </div>
                        </KbdGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Spread props
                        code: "<Kbd {...props}>Ctrl</Kbd>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: `
                        {#snippet keycap(label)}
                            <Kbd>{label}</Kbd>
                        {/snippet}
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Missing both variant and size
                        code: "<Kbd>Ctrl</Kbd>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant" and "size"' },
                            },
                        ],
                    },
                    {
                        // Missing size
                        code: '<Kbd variant="soft">Ctrl</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"size"' },
                            },
                        ],
                    },
                    {
                        // Missing variant
                        code: '<Kbd size="md">Ctrl</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant"' },
                            },
                        ],
                    },
                    {
                        // Missing variant with shorthand size
                        code: "<Kbd {size}>Ctrl</Kbd>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant"' },
                            },
                        ],
                    },
                    {
                        // Sibling outside <KbdGroup> still requires standalone props
                        code: "<KbdGroup><Kbd>Ctrl</Kbd></KbdGroup><Kbd>K</Kbd>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant" and "size"' },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("kbd/no-combo-text", () => {
        it("forbids infix '+' key combinations inside a single <Kbd>", () => {
            svelteRuleTester.run("kbd/no-combo-text", kbdNoComboTextRule, {
                valid: [
                    {
                        code: '<Kbd variant="soft" size="md">+</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Vol+</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Bright+</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Kbd variant="soft" size="md">{key}</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<div>Ctrl + C</div>",
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Kbd variant="soft" size="md">Ctrl + C</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noComboText",
                                data: { text: "Ctrl + C" },
                            },
                        ],
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Ctrl+K</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noComboText",
                                data: { text: "Ctrl+K" },
                            },
                        ],
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Fn) + F1</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noComboText",
                                data: { text: "Fn) + F1" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("kbd/no-raw-kbd", () => {
        it("forbids native <kbd> elements outside Kbd.svelte", () => {
            svelteRuleTester.run("kbd/no-raw-kbd", kbdNoRawKbdRule, {
                valid: [
                    {
                        code: '<Kbd variant="soft" size="md">K</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<kbd>K</kbd>",
                        filename: "src/eslint/Example.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<kbd>K</kbd>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noRawKbd" }],
                    },
                    {
                        code: '<kbd class="key">Ctrl</kbd>',
                        filename: "src/Other.svelte",
                        errors: [{ messageId: "noRawKbd" }],
                    },
                ],
            });
        });
    });

    describe("kbd/no-macos-labels", () => {
        it("forbids macOS-only key labels inside <Kbd>", () => {
            svelteRuleTester.run("kbd/no-macos-labels", kbdNoMacosLabelsRule, {
                valid: [
                    {
                        code: '<Kbd variant="soft" size="md">Ctrl</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<div>Command Palette</div>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Command Palette</Kbd>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Kbd variant="soft" size="md">{label}</Kbd>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Kbd variant="soft" size="md">Cmd</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noMacosLabel",
                                data: { label: "Cmd" },
                            },
                        ],
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Command</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noMacosLabel",
                                data: { label: "Command" },
                            },
                        ],
                    },
                    {
                        code: '<Kbd variant="soft" size="md">Option</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noMacosLabel",
                                data: { label: "Option" },
                            },
                        ],
                    },
                    {
                        code: '<Kbd variant="soft" size="md">opt</Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noMacosLabel",
                                data: { label: "opt" },
                            },
                        ],
                    },
                    {
                        code: '<Kbd variant="soft" size="md">  CMD  </Kbd>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "noMacosLabel",
                                data: { label: "CMD" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("kbd/prefer-default-separator", () => {
        it("prefers self-closing <KbdSeparator /> instead of <KbdSeparator>+</KbdSeparator>", () => {
            svelteRuleTester.run("kbd/prefer-default-separator", kbdPreferDefaultSeparatorRule, {
                valid: [
                    {
                        code: "<KbdSeparator />",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<KbdSeparator class="sep" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<KbdSeparator>/</KbdSeparator>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<KbdSeparator>{sep}</KbdSeparator>",
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<KbdSeparator>+</KbdSeparator>",
                        output: "<KbdSeparator />",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferDefaultSeparator" }],
                    },
                    {
                        code: "<KbdSeparator> + </KbdSeparator>",
                        output: "<KbdSeparator />",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferDefaultSeparator" }],
                    },
                    {
                        code: '<KbdSeparator class="sep">+</KbdSeparator>',
                        output: '<KbdSeparator class="sep" />',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferDefaultSeparator" }],
                    },
                    {
                        code: '<KbdSeparator class="sep" >+</KbdSeparator>',
                        output: '<KbdSeparator class="sep" />',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferDefaultSeparator" }],
                    },
                ],
            });
        });
    });
});
