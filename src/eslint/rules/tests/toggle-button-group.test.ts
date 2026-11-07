/* eslint-disable unicorn/no-incorrect-template-string-interpolation */
import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import {
    toggleButtonGroupNoRegularButtonRule,
    toggleButtonGroupUniformButtonsRule,
} from "../toggle-button-group.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("toggle-button-group ESLint rules", () => {
    describe("toggle-button-group/no-regular-button", () => {
        it("forbids <Button> inside <ToggleButtonGroup> and <ToggleButton> inside <ButtonGroup>", () => {
            ruleTester.run("toggle-button-group/no-regular-button", toggleButtonGroupNoRegularButtonRule, {
                valid: [
                    {
                        // Clean ToggleButtonGroup
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            <ToggleButtonGroupSeparator />
                            <ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Clean ButtonGroup
                        code: `
                        <ButtonGroup>
                            <Button variant="soft" color="accent" size="md"><ButtonLabel>One</ButtonLabel></Button>
                            <Button variant="soft" color="accent" size="md"><ButtonLabel>Two</ButtonLabel></Button>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Button inside ToggleButtonGroup
                        code: `
                        <ToggleButtonGroup>
                            <Button variant="soft" color="accent" size="md"><ButtonLabel>Invalid</ButtonLabel></Button>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noRegularButtonInToggleButtonGroup" }],
                    },
                    {
                        // ToggleButton inside ButtonGroup
                        code: `
                        <ButtonGroup>
                            <ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Invalid</ToggleButtonLabel></ToggleButton>
                        </ButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noToggleButtonInButtonGroup" }],
                    },
                    {
                        // Nested Button inside ToggleButtonGroup
                        code: `
                        <ToggleButtonGroup>
                            <div>
                                <Button variant="soft" color="accent" size="md"><ButtonLabel>Nested</ButtonLabel></Button>
                            </div>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "noRegularButtonInToggleButtonGroup" }],
                    },
                ],
            });
        });
    });

    describe("toggle-button-group/uniform-buttons", () => {
        it("enforces identical size, variant, and color across all toggle buttons in a ToggleButtonGroup", () => {
            ruleTester.run("toggle-button-group/uniform-buttons", toggleButtonGroupUniformButtonsRule, {
                valid: [
                    {
                        // Single button in group
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>Only</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Identical static literals
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            <ToggleButtonGroupSeparator />
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                            <ToggleButtonGroupSeparator />
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>Three</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Identical variables
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="md" {variant} {color}><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            <ToggleButton size="md" {variant} {color}><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Nested groups do not cross-pollinate
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="lg" variant="soft" color="accent"><ToggleButtonLabel>Outer 1</ToggleButtonLabel></ToggleButton>
                            <ToggleButtonGroup>
                                <ToggleButton size="sm" variant="ghost" color="danger"><ToggleButtonLabel>Inner 1</ToggleButtonLabel></ToggleButton>
                                <ToggleButton size="sm" variant="ghost" color="danger"><ToggleButtonLabel>Inner 2</ToggleButtonLabel></ToggleButton>
                            </ToggleButtonGroup>
                            <ToggleButton size="lg" variant="soft" color="accent"><ToggleButtonLabel>Outer 2</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Mismatched size
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            <ToggleButton size="lg" variant="soft" color="accent"><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "size", expected: '"md"', found: '"lg"' },
                            },
                        ],
                    },
                    {
                        // Mismatched variant
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            <ToggleButton size="md" variant="ghost" color="accent"><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
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
                        // Mismatched color
                        code: `
                        <ToggleButtonGroup>
                            <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            <ToggleButton size="md" variant="soft" color="danger"><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                        </ToggleButtonGroup>
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
                        // Nested inside wrapper elements
                        code: `
                        <ToggleButtonGroup>
                            <div>
                                <ToggleButton size="md" variant="soft" color="accent"><ToggleButtonLabel>One</ToggleButtonLabel></ToggleButton>
                            </div>
                            <section>
                                <ToggleButton size="sm" variant="soft" color="accent"><ToggleButtonLabel>Two</ToggleButtonLabel></ToggleButton>
                            </section>
                        </ToggleButtonGroup>
                        `,
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "mismatchedButtonProp",
                                data: { propName: "size", expected: '"md"', found: '"sm"' },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
