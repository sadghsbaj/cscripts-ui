import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import { buttonGroupNoSolidRule } from "../button-group.ts";

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
});
