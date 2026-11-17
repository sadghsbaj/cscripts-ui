import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { badgeStructureRule } from "../badge.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("badge ESLint rules", () => {
    describe("badge/require-structure", () => {
        it("validates badge compound structure, raw icons, and iconOnly accessibility", () => {
            ruleTester.run("badge/require-structure", badgeStructureRule, {
                valid: [
                    {
                        code: "<Badge>New</Badge>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Badge><BadgeIcon icon={Check} /><BadgeLabel>Ok</BadgeLabel></Badge>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Badge iconOnly aria-label="Verified"><BadgeIcon icon={Check} /></Badge>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Badge iconOnly aria-labelledby="status-id"><BadgeIcon icon={Check} /></Badge>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Badge iconOnly aria-hidden="true"><BadgeIcon icon={Check} /></Badge>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Badge iconOnly {...props}><BadgeIcon icon={Check} /></Badge>",
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Raw imported Lucide icon inside Badge
                        code: '<script>import { Check } from "@lucide/svelte";</script><Badge><Check /></Badge>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInBadge",
                                data: { name: "Check" },
                            },
                        ],
                    },
                    {
                        // Raw SVG inside Badge
                        code: "<Badge><svg></svg></Badge>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInBadge",
                                data: { name: "svg" },
                            },
                        ],
                    },
                    {
                        // iconOnly without BadgeIcon
                        code: '<Badge iconOnly aria-label="Verified"></Badge>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconInIconOnly" }],
                    },
                    {
                        // iconOnly containing BadgeLabel
                        code: '<Badge iconOnly aria-label="Verified"><BadgeIcon icon={Check} /><BadgeLabel>Ok</BadgeLabel></Badge>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "unexpectedLabelInIconOnly" }],
                    },
                    {
                        // iconOnly without aria-label / aria-labelledby / aria-hidden
                        code: "<Badge iconOnly><BadgeIcon icon={Check} /></Badge>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconOnlyAriaLabel" }],
                    },
                    {
                        // iconOnly with falsy aria-hidden and no label
                        code: "<Badge iconOnly aria-hidden={false}><BadgeIcon icon={Check} /></Badge>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconOnlyAriaLabel" }],
                    },
                ],
            });
        });
    });
});
