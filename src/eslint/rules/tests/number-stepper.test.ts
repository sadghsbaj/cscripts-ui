import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { numberStepperNoMiddleInVerticalRule } from "../number-stepper.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("number-stepper ESLint rules", () => {
    describe("number-stepper/no-middle-in-vertical", () => {
        it('disallows <NumberStepperInput> and <NumberStepperValue> inside <NumberStepper orientation="vertical">', () => {
            ruleTester.run("number-stepper/no-middle-in-vertical", numberStepperNoMiddleInVerticalRule, {
                valid: [
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="horizontal"><NumberStepperDecrement /><NumberStepperInput /><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="horizontal"><NumberStepperDecrement /><NumberStepperValue /><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical"><NumberStepperDecrement /><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation={dir}><NumberStepperDecrement /><NumberStepperInput /><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical"><NumberStepperDecrement /><NumberStepper variant="soft" size="sm" orientation="horizontal"><NumberStepperInput /></NumberStepper><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical"><NumberStepperDecrement /><NumberStepperInput /><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noMiddleInVertical", data: { name: "NumberStepperInput" } }],
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical"><NumberStepperDecrement /><NumberStepperValue /><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noMiddleInVertical", data: { name: "NumberStepperValue" } }],
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical"><NumberStepperDecrement /><div><NumberStepperInput /></div><NumberStepperIncrement /></NumberStepper>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noMiddleInVertical", data: { name: "NumberStepperInput" } }],
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical">{#if show}<NumberStepperValue />{/if}</NumberStepper>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noMiddleInVertical", data: { name: "NumberStepperValue" } }],
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical">{#await promise}<NumberStepperValue />{:then}<NumberStepperInput />{:catch}<NumberStepperValue />{/await}</NumberStepper>',
                        filename: "src/Component.svelte",
                        errors: [
                            { messageId: "noMiddleInVertical", data: { name: "NumberStepperValue" } },
                            { messageId: "noMiddleInVertical", data: { name: "NumberStepperInput" } },
                            { messageId: "noMiddleInVertical", data: { name: "NumberStepperValue" } },
                        ],
                    },
                    {
                        code: '<NumberStepper variant="soft" size="md" orientation="vertical"><NumberStepperInput /><NumberStepperValue /></NumberStepper>',
                        filename: "src/Component.svelte",
                        errors: [
                            { messageId: "noMiddleInVertical", data: { name: "NumberStepperInput" } },
                            { messageId: "noMiddleInVertical", data: { name: "NumberStepperValue" } },
                        ],
                    },
                ],
            });
        });
    });
});
