/* eslint-disable unicorn/no-incorrect-template-string-interpolation */
import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { buttonMorphRequireButtonChildRule, buttonMorphRequireItemsRule } from "../button-morph.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("button-morph ESLint rules", () => {
    describe("button-morph/require-items", () => {
        it("enforces at least two ButtonMorphItem children with unique non-empty values", () => {
            ruleTester.run("button-morph/require-items", buttonMorphRequireItemsRule, {
                valid: [
                    {
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <ButtonMorphItem value="idle">
                                <Button variant="soft" color="danger" size="md"><ButtonLabel>Löschen</ButtonLabel></Button>
                            </ButtonMorphItem>
                            <ButtonMorphItem value="confirm">
                                <Button variant="solid" color="danger" size="md"><ButtonLabel>Wirklich?</ButtonLabel></Button>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        code: `
                        <ButtonMorph bind:value={step}>
                            {#each steps as item (item.id)}
                                <ButtonMorphItem value={item.id}>
                                    <Button variant="soft" color="base" size="md"><ButtonLabel>{item.label}</ButtonLabel></Button>
                                </ButtonMorphItem>
                            {/each}
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Fewer than 2 items
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <ButtonMorphItem value="idle">
                                <Button variant="soft" color="danger" size="md"><ButtonLabel>Löschen</ButtonLabel></Button>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "minItems" }],
                    },
                    {
                        // Missing value prop on ButtonMorphItem
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <ButtonMorphItem>
                                <Button variant="soft" color="danger" size="md"><ButtonLabel>Löschen</ButtonLabel></Button>
                            </ButtonMorphItem>
                            <ButtonMorphItem value="confirm">
                                <Button variant="solid" color="danger" size="md"><ButtonLabel>Wirklich?</ButtonLabel></Button>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemValue" }],
                    },
                    {
                        // Duplicate value prop
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <ButtonMorphItem value="idle">
                                <Button variant="soft" color="danger" size="md"><ButtonLabel>Löschen</ButtonLabel></Button>
                            </ButtonMorphItem>
                            <ButtonMorphItem value="idle">
                                <Button variant="solid" color="danger" size="md"><ButtonLabel>Wirklich?</ButtonLabel></Button>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "duplicateItemValue", data: { value: "idle" } }],
                    },
                ],
            });
        });
    });

    describe("button-morph/require-button-child", () => {
        it("requires Button, ToggleButton, or CloseButton inside ButtonMorphItem and forbids unwrapped buttons", () => {
            ruleTester.run("button-morph/require-button-child", buttonMorphRequireButtonChildRule, {
                valid: [
                    {
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <ButtonMorphItem value="idle">
                                <CloseButton variant="soft" size="md" />
                            </ButtonMorphItem>
                            <ButtonMorphItem value="confirm">
                                <Button variant="solid" color="danger" size="sm"><ButtonLabel>Verwerfen?</ButtonLabel></Button>
                            </ButtonMorphItem>
                            <ButtonMorphItem value="toggle">
                                <ToggleButton variant="soft" color="accent" size="sm"><ToggleButtonLabel>Aktiv</ToggleButtonLabel></ToggleButton>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // ButtonMorphItem without button child
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <ButtonMorphItem value="idle">
                                <span>Kein Button</span>
                            </ButtonMorphItem>
                            <ButtonMorphItem value="confirm">
                                <Button variant="solid" color="danger" size="sm"><ButtonLabel>Verwerfen?</ButtonLabel></Button>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingButtonChild" }],
                    },
                    {
                        // Unwrapped Button directly inside ButtonMorph
                        code: `
                        <ButtonMorph bind:value={mode}>
                            <Button variant="soft" color="danger" size="md"><ButtonLabel>Löschen</ButtonLabel></Button>
                            <ButtonMorphItem value="confirm">
                                <Button variant="solid" color="danger" size="md"><ButtonLabel>Wirklich?</ButtonLabel></Button>
                            </ButtonMorphItem>
                        </ButtonMorph>
                        `,
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "unwrappedButtonInMorph", data: { name: "Button" } }],
                    },
                ],
            });
        });
    });
});
