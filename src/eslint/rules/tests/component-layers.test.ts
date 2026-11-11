import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { componentLayersRule } from "../component-layers.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("component-layers ESLint rules", () => {
    describe("component-layers/valid-style-layer", () => {
        it("enforces @layer components.primitive or @layer components.composite", () => {
            ruleTester.run("component-layers/valid-style-layer", componentLayersRule, {
                valid: [
                    {
                        code: `
<div></div>
<style>
    @layer components.primitive {
        div { color: red; }
    }
</style>
`,
                        filename: "src/svelte/primitives/button/Button.svelte",
                    },
                    {
                        code: `
<div></div>
<style>
    @layer components.composite {
        div { display: flex; }
    }
</style>
`,
                        filename: "src/svelte/primitives/button-group/ButtonGroup.svelte",
                    },
                    {
                        // Component without <style> is allowed
                        code: `<div>No style</div>`,
                        filename: "src/svelte/primitives/icon/Icon.svelte",
                    },
                    {
                        // Playground files are exempt
                        code: `<div></div><style>div { color: blue; }</style>`,
                        filename: "playground/App.svelte",
                    },
                ],
                invalid: [
                    {
                        // Unlayered style
                        code: `
<div></div>
<style>
    div { color: red; }
</style>
`,
                        filename: "src/svelte/primitives/button/Button.svelte",
                        errors: [{ messageId: "missingLayer" }],
                    },
                    {
                        // Bare @layer components
                        code: `
<div></div>
<style>
    @layer components {
        div { color: red; }
    }
</style>
`,
                        filename: "src/svelte/work/WorkCard.svelte",
                        errors: [{ messageId: "forbiddenBareComponents" }],
                    },
                    {
                        // Invalid layer name
                        code: `
<div></div>
<style>
    @layer utilities {
        div { color: red; }
    }
</style>
`,
                        filename: "src/svelte/primitives/badge/Badge.svelte",
                        errors: [
                            {
                                messageId: "invalidLayer",
                                data: { layer: "utilities" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
