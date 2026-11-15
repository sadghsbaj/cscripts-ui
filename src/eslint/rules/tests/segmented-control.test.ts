import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { segmentedControlStructureRule } from "../segmented-control.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("segmented-control ESLint rules", () => {
    describe("segmented-control/require-structure", () => {
        it("validates segmented control item compound structure and accessibility", () => {
            ruleTester.run("segmented-control/require-structure", segmentedControlStructureRule, {
                valid: [
                    {
                        code: '<SegmentedControlItem value="list"><SegmentedControlLabel>List</SegmentedControlLabel></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<SegmentedControlItem value="list"><SegmentedControlIcon icon={List} /><SegmentedControlLabel>List</SegmentedControlLabel></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<SegmentedControlItem value="left" aria-label="Align left"><SegmentedControlIcon icon={AlignLeft} /></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<SegmentedControlItem value="left" aria-labelledby="align-left-heading"><SegmentedControlIcon icon={AlignLeft} /></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Non-SegmentedControlItem elements are ignored
                        code: '<SegmentedControl value="list"><div>Just text</div><svg></svg></SegmentedControl>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Bare text without SegmentedControlLabel or SegmentedControlIcon
                        code: '<SegmentedControlItem value="list">List</SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingLabelOrIcon" }],
                    },
                    {
                        // Empty SegmentedControlItem without SegmentedControlLabel or SegmentedControlIcon
                        code: '<SegmentedControlItem value="list"></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingLabelOrIcon" }],
                    },
                    {
                        // Icon-only without aria-label or aria-labelledby
                        code: '<SegmentedControlItem value="left"><SegmentedControlIcon icon={AlignLeft} /></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconOnlyAriaLabel" }],
                    },
                    {
                        // Icon-only with whitespace-only aria-label
                        code: '<SegmentedControlItem value="left" aria-label="   "><SegmentedControlIcon icon={AlignLeft} /></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingIconOnlyAriaLabel" }],
                    },
                    {
                        // Raw Lucide icon without SegmentedControlLabel or SegmentedControlIcon
                        code: '<script>import { List } from "@lucide/svelte";</script><SegmentedControlItem value="list"><List /></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [
                            { messageId: "missingLabelOrIcon" },
                            {
                                messageId: "rawIconInItem",
                                data: { name: "List" },
                            },
                        ],
                    },
                    {
                        // Raw Lucide icon alongside SegmentedControlLabel
                        code: '<script>import { List } from "@lucide/svelte";</script><SegmentedControlItem value="list"><List /><SegmentedControlLabel>List</SegmentedControlLabel></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInItem",
                                data: { name: "List" },
                            },
                        ],
                    },
                    {
                        // Raw SVG inside SegmentedControlItem
                        code: '<SegmentedControlItem value="list"><svg></svg><SegmentedControlLabel>List</SegmentedControlLabel></SegmentedControlItem>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "rawIconInItem",
                                data: { name: "svg" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
