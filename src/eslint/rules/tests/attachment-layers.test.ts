import { describe, expect, it } from "vitest";
import { Linter, RuleTester } from "eslint";

import { attachmentCssParser, attachmentLayerRule } from "../attachment-layers.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: attachmentCssParser,
    },
});

describe("attachment-layers ESLint rules", () => {
    describe("attachment-layers/require-attachment-layer", () => {
        it("enforces @layer attachments on .attach.css files in modules directories", () => {
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
                        filename: "src/modules/fade-mask/fade-mask.attach.css",
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
                        filename: "src/modules/fade-mask/fade-mask.attach.css",
                        errors: [{ messageId: "missingAttachmentLayer" }],
                    },
                    {
                        // Wrong layer
                        code: `
@layer components.primitive {
    .cs-fade-mask { color: red; }
}
`,
                        filename: "src/modules/fade-mask/fade-mask.attach.css",
                        errors: [{ messageId: "missingAttachmentLayer" }],
                    },
                ],
            });
        });

        it("does not report when parent directory above cwd contains 'modules'", () => {
            const linter = new Linter({ cwd: "/home/user/modules/my-app" });
            const messages = linter.verify(
                `
.cs-fade-mask {
    mask-repeat: no-repeat;
}
`,
                [
                    {
                        files: ["**/*.attach.css"],
                        languageOptions: { parser: attachmentCssParser },
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
                    },
                ],
                "/home/user/modules/my-app/src/foo.attach.css"
            );
            expect(messages).toEqual([]);
        });
    });
});
