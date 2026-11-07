/* eslint-disable unicorn/no-incorrect-template-string-interpolation */
import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import { buttonGroupNoSolidRule, buttonGroupUniformButtonsRule } from "../button-group.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("button-group ESLint rules", () => {
    describe("button-group/no-solid-variant", () => {
        it("forbids variant='solid' inside ButtonGroup but allows it elsewhere", () => {
            ruleTester.run("button-group/no-solid-variant", buttonGroupNoSolidRule, {
                valid: [
                    {
                        // Solid button outside ButtonGroup is allowed
                        code: '<Button variant="solid" color="accent" size="md"><ButtonLabel>Click</ButtonLabel></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Group with soft, ghost and elevated buttons
                        code: `
                        <ButtonGroup>
                            <Button variant="soft" color="accent" size="md"><ButtonLabel>One</ButtonLabel></Button>
                            <Button variant="ghost" color="accent" size="md"><ButtonLabel>Two</ButtonLabel></Button>
                            <Button variant="elevated" size="md"><ButtonLabel>Three</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Direct child Button with variant="solid"
                        code: `
                        <ButtonGroup>
                            <Button variant="solid" color="accent" size="md"><ButtonLabel>Invalid</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noSolidInButtonGroup" }],
                    },
                    {
                        // Nested inside wrapper or conditional
                        code: `
                        <ButtonGroup>
                            <div>
                                <Button variant={"solid"} color="accent" size="md"><ButtonLabel>Invalid Nested</ButtonLabel></Button>
                            </div>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noSolidInButtonGroup" }],
                    },
                ],
            });
        });
    });

    describe("button-group/uniform-buttons", () => {
        it("enforces identical size, variant, and color across all buttons in a ButtonGroup", () => {
            ruleTester.run("button-group/uniform-buttons", buttonGroupUniformButtonsRule, {
                valid: [
                    {
                        // Single button in group
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>Only</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Identical static literals
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>Two</ButtonLabel></Button>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>Three</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Identical variables and shorthand
                        code: `
                        <ButtonGroup>
                            <Button size="md" {variant} {color}><ButtonLabel>One</ButtonLabel></Button>
                            <ButtonGroupSeparator />
                            <Button size="md" {variant} {color}><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Elevated buttons with no color
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="elevated"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="md" variant="elevated"><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Buttons outside ButtonGroup can have differing props
                        code: `
                        <div>
                            <Button size="sm" variant="soft" color="accent"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="lg" variant="ghost" color="danger"><ButtonLabel>Two</ButtonLabel></Button>
                        </div>
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Size mismatch
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="sm" variant="soft" color="accent"><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "size", expected: '"md"', found: '"sm"' },
                            },
                        ],
                    },
                    {
                        // Variant mismatch
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="md" variant="ghost" color="accent"><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "variant", expected: '"soft"', found: '"ghost"' },
                            },
                        ],
                    },
                    {
                        // Color mismatch
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="md" variant="soft" color="danger"><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "color", expected: '"accent"', found: '"danger"' },
                            },
                        ],
                    },
                    {
                        // Variable vs literal mismatch
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color="accent"><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="md" variant="soft" color={color}><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "color", expected: '"accent"', found: "{color}" },
                            },
                        ],
                    },
                    {
                        // Different variables
                        code: `
                        <ButtonGroup>
                            <Button size="md" variant="soft" color={primaryColor}><ButtonLabel>One</ButtonLabel></Button>
                            <Button size="md" variant="soft" color={secondaryColor}><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "color", expected: "{primaryColor}", found: "{secondaryColor}" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
