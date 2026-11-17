import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { numberMorphNoContinuousInGroupRule } from "../number-morph.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("number-morph ESLint rules", () => {
    describe("number-morph/no-continuous-in-group", () => {
        it("disallows continuous on <NumberMorph> inside <NumberMorphGroup>", () => {
            ruleTester.run("number-morph/no-continuous-in-group", numberMorphNoContinuousInGroupRule, {
                valid: [
                    {
                        code: "<NumberMorph value={x} continuous />",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<NumberMorph value={x} continuous={true} />",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<NumberMorphGroup><NumberMorph value={x} /><NumberMorph value={y} continuous={false} /></NumberMorphGroup>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<NumberMorphGroup><NumberMorph value={x} continuous={isContinuous} /></NumberMorphGroup>",
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<NumberMorphGroup><NumberMorph value={x} continuous /></NumberMorphGroup>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noContinuousInGroup" }],
                    },
                    {
                        code: "<NumberMorphGroup><NumberMorph value={x} continuous={true} /></NumberMorphGroup>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noContinuousInGroup" }],
                    },
                    {
                        code: "<NumberMorphGroup><div><NumberMorph value={x} continuous /></div></NumberMorphGroup>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noContinuousInGroup" }],
                    },
                ],
            });
        });
    });
});
