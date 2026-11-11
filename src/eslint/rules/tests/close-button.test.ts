import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { closeButtonHitAreaRule } from "../close-button.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("close-button ESLint rules", () => {
    describe("close-button/require-hit-area", () => {
        it("advises using <HitArea /> inside <CloseButton>", () => {
            ruleTester.run("close-button/require-hit-area", closeButtonHitAreaRule, {
                valid: [
                    {
                        code: '<CloseButton aria-label="Close dialog"><HitArea size="md" /></CloseButton>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside an #if block
                        code: '<CloseButton aria-label="Close">{#if true}<HitArea size="md" />{/if}</CloseButton>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<CloseButton aria-label="Close without hit area"></CloseButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingHitArea" }],
                    },
                ],
            });
        });
    });
});
