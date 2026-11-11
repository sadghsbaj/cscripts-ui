import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import { buttonHitAreaRule, buttonStructureRule, buttonTooltipRule } from "../button.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("button ESLint rules", () => {
    describe("button/require-structure", () => {
        it("validates button compound structure and accessibility", () => {
            ruleTester.run("button/require-structure", buttonStructureRule, {
                valid: [
                    {
                        code: '<Button variant="soft" color="accent" size="md"><ButtonLabel>Click me</ButtonLabel></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Close"><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-labelledby="heading-id"><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Missing both iconOnly and ButtonLabel
                        code: '<Button variant="soft" color="accent" size="md">Just text</Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingLabelOrIconOnly" }],
                    },
                    {
                        // iconOnly without aria-label
                        code: '<Button variant="soft" color="accent" size="md" iconOnly><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconOnlyAriaLabel" }],
                    },
                    {
                        // iconOnly without ButtonIcon
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Action"></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconInIconOnly" }],
                    },
                    {
                        // iconOnly containing ButtonLabel
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Action"><ButtonLabel>Text</ButtonLabel><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "unexpectedLabelInIconOnly" }],
                    },
                    {
                        // Raw SVG inside Button
                        code: '<Button variant="soft" color="accent" size="md"><ButtonLabel>Text</ButtonLabel><svg></svg></Button>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInButton",
                                data: { name: "svg" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("button/require-hit-area", () => {
        it("checks touch target requirement on icon-only buttons", () => {
            ruleTester.run("button/require-hit-area", buttonHitAreaRule, {
                valid: [
                    {
                        code: '<Button variant="soft" color="accent" size="md"><ButtonLabel>Normal</ButtonLabel></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Close"><HitArea size="md" /><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Close"><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingHitArea" }],
                    },
                ],
            });
        });
    });

    describe("button/require-tooltip", () => {
        it("advises tooltip attachment on icon-only buttons", () => {
            ruleTester.run("button/require-tooltip", buttonTooltipRule, {
                valid: [
                    {
                        code: '<Button variant="soft" color="accent" size="md"><ButtonLabel>Normal</ButtonLabel></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Close" {@attach tooltip("Close")}><HitArea size="md" /><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Close" {@attach tooltip({ text: "Close" })}><HitArea size="md" /><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Button variant="soft" color="accent" size="md" iconOnly aria-label="Close"><ButtonIcon icon={X} /></Button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingTooltip" }],
                    },
                ],
            });
        });
    });
});
