import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import { noNativeClipboardRule, preferClipboardIconsRule } from "../clipboard.ts";

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

describe("clipboard ESLint rules", () => {
    describe("clipboard/no-native-clipboard", () => {
        it("forbids direct navigator.clipboard and document.execCommand calls in .ts and .svelte files", () => {
            tsRuleTester.run("clipboard/no-native-clipboard (ts)", noNativeClipboardRule, {
                valid: [
                    {
                        code: 'import { copyToClipboard } from "cs/svelte/clipboard"; await copyToClipboard("abc");',
                        filename: "src/feature.ts",
                    },
                    {
                        // Allowed inside clipboard.utils.ts implementation itself
                        code: 'await navigator.clipboard.writeText("abc"); document.execCommand("copy");',
                        filename: "src/svelte/primitives/clipboard/clipboard.utils.ts",
                    },
                ],
                invalid: [
                    {
                        code: 'await navigator.clipboard.writeText("secret");',
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenNavigatorClipboard" }],
                    },
                    {
                        code: "const text = await window.navigator.clipboard.readText();",
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenNavigatorClipboard" }],
                    },
                    {
                        code: 'document.execCommand("copy");',
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenExecCommand" }],
                    },
                ],
            });

            svelteRuleTester.run("clipboard/no-native-clipboard (svelte)", noNativeClipboardRule, {
                valid: [
                    {
                        code: '<Button variant="soft" color="base" size="md" {@attach copyOnClick("abc")}><CopyIcon /><ButtonLabel>Copy</ButtonLabel></Button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<button onclick={() => navigator.clipboard.writeText("abc")}>Copy</button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenNavigatorClipboard" }],
                    },
                    {
                        code: '<script lang="ts">function copy() { void navigator.clipboard.writeText("abc"); }</script><button onclick={copy}>Copy</button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenNavigatorClipboard" }],
                    },
                ],
            });
        });
    });

    describe("clipboard/prefer-clipboard-icons", () => {
        it("enforces <CopyIcon /> and <PasteIcon /> over raw Lucide clipboard icons in buttons", () => {
            svelteRuleTester.run("clipboard/prefer-clipboard-icons", preferClipboardIconsRule, {
                valid: [
                    {
                        code: '<Button variant="soft" color="base" size="md" iconOnly aria-label="Copy"><CopyIcon /><HitArea size="md" /></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="base" size="md" iconOnly aria-label="Paste"><PasteIcon /><HitArea size="md" /></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="base" size="md" iconOnly aria-label="Add"><ButtonIcon icon={Plus} /><HitArea size="md" /></Button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Button variant="soft" color="base" size="md" iconOnly aria-label="Copy"><ButtonIcon icon={Copy} /></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferCopyIcon" }],
                    },
                    {
                        code: '<Button variant="soft" color="base" size="md" iconOnly aria-label="Paste"><ButtonIcon icon={ClipboardPaste} /></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferPasteIcon" }],
                    },
                    {
                        code: '<ToggleButton variant="soft" color="base" size="md" iconOnly aria-label="Copy"><ToggleButtonIcon icon={ClipboardCopy} /></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "preferCopyIcon" }],
                    },
                ],
            });
        });
    });
});
