import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import { attachmentCssParser, attachmentLayerRule } from "../attachment-layers.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: attachmentCssParser,
    },
});

describe("attachment-layers ESLint rules", () => {
    describe("attachment-layers/require-attachment-layer", () => {
        it("enforces @layer attachments on .attach.css files in primitives directories", () => {
            ruleTester.run("attachment-layers/require-attachment-layer", attachmentLayerRule, {
                valid: [
                    {
                        code: `
@layer attachments {
    .cs-fade-mask {
        mask-repeat: no-repeat;
    }
}
`,
                        filename: "src/svelte/primitives/fade-mask/fade-mask.attach.css",
                    },
                    {
                        // Non-attachment CSS files are exempt
                        code: `
@layer foundation {
    :root { --color: red; }
}
`,
                        filename: "src/css/index.css",
                    },
                ],
                invalid: [
                    {
                        // Missing @layer attachments
                        code: `
.cs-fade-mask {
    mask-repeat: no-repeat;
}
`,
                        filename: "src/svelte/primitives/fade-mask/fade-mask.attach.css",
                        errors: [{ messageId: "missingAttachmentLayer" }],
                    },
                    {
                        // Wrong layer
                        code: `
@layer components.primitive {
    .cs-fade-mask { color: red; }
}
`,
                        filename: "src/svelte/primitives/fade-mask/fade-mask.attach.css",
                        errors: [{ messageId: "missingAttachmentLayer" }],
                    },
                ],
            });
        });
    });
});
