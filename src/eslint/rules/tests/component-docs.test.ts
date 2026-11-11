import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { componentCommentRule } from "../component-docs.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("component-docs ESLint rules", () => {
    describe("component-docs/require-component-comment", () => {
        it("requires top-level <!-- @component --> in components and work folders", () => {
            ruleTester.run("component-docs/require-component-comment", componentCommentRule, {
                valid: [
                    {
                        // Component with @component JSDoc header
                        code: `<!--
@component
My Button component description.
-->
<script>
    let { children } = $props();
</script>
<button>{@render children?.()}</button>
`,
                        filename: "src/svelte/primitives/button/Button.svelte",
                    },
                    {
                        // Component in work/ folder with @component
                        code: `<!--
@component
Work App Header
-->
<header></header>
`,
                        filename: "src/svelte/work/app-layout/WorkAppHeader.svelte",
                    },
                    {
                        // Other svelte files (e.g. playground, App.svelte) are exempt
                        code: `<button>No comment needed</button>`,
                        filename: "playground/App.svelte",
                    },
                ],
                invalid: [
                    {
                        // Missing comment in components/
                        code: ["<script>", "    let { text } = $props();", "</script>", "<div>{text}</div>"].join("\n"),
                        filename: "src/svelte/primitives/card/Card.svelte",
                        errors: [{ messageId: "missingComponentComment" }],
                    },
                    {
                        // Regular HTML comment without @component
                        code: `<!-- Just a normal comment -->
<div>Content</div>
`,
                        filename: "src/svelte/work/WorkTest.svelte",
                        errors: [{ messageId: "missingComponentComment" }],
                    },
                ],
            });
        });
    });
});
