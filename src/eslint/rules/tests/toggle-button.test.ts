import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { toggleButtonHitAreaRule, toggleButtonStructureRule, toggleButtonTooltipRule } from "../toggle-button.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("toggle-button ESLint rules", () => {
    describe("toggle-button/require-structure", () => {
        it("validates toggle button compound structure and accessibility", () => {
            ruleTester.run("toggle-button/require-structure", toggleButtonStructureRule, {
                valid: [
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Click me</ToggleButtonLabel></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Bookmark"><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-labelledby="heading-id"><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Missing both iconOnly and ToggleButtonLabel
                        code: '<ToggleButton variant="soft" color="accent" size="md">Just text</ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingLabelOrIconOnly" }],
                    },
                    {
                        // iconOnly without aria-label
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconOnlyAriaLabel" }],
                    },
                    {
                        // iconOnly without ToggleButtonIcon
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Action"></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconInIconOnly" }],
                    },
                    {
                        // iconOnly containing ToggleButtonLabel
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Action"><ToggleButtonLabel>Text</ToggleButtonLabel><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "unexpectedLabelInIconOnly" }],
                    },
                    {
                        // Raw SVG inside ToggleButton
                        code: '<ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Text</ToggleButtonLabel><svg></svg></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInButton",
                                data: { name: "svg" },
                            },
                        ],
                    },
                    {
                        // Direct Lucide icon without ToggleButtonIcon
                        code: '<script>import { Bookmark } from "@lucide/svelte";</script><ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Text</ToggleButtonLabel><Bookmark /></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInButton",
                                data: { name: "Bookmark" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("toggle-button/require-hit-area", () => {
        it("checks touch target requirement on icon-only toggle buttons", () => {
            ruleTester.run("toggle-button/require-hit-area", toggleButtonHitAreaRule, {
                valid: [
                    {
                        // iconOnly with HitArea
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Add"><ToggleButtonIcon icon={Bookmark} /><HitArea /></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Standard button with label does not require HitArea
                        code: '<ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Add</ToggleButtonLabel></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // iconOnly without HitArea
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Add"><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingHitArea" }],
                    },
                ],
            });
        });
    });

    describe("toggle-button/require-tooltip", () => {
        it("advises tooltip attachment on icon-only toggle buttons", () => {
            ruleTester.run("toggle-button/require-tooltip", toggleButtonTooltipRule, {
                valid: [
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md"><ToggleButtonLabel>Add</ToggleButtonLabel></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Bookmark" {@attach tooltip("Bookmark")}><HitArea /><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Bookmark" {@attach tooltip({ text: "Bookmark" })}><HitArea /><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<ToggleButton variant="soft" color="accent" size="md" iconOnly aria-label="Bookmark"><ToggleButtonIcon icon={Bookmark} /></ToggleButton>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingTooltip" }],
                    },
                ],
            });
        });
    });
});
