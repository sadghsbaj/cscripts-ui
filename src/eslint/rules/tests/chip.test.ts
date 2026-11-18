import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import { chipRequireStandalonePropsRule, chipStructureRule } from "../chip.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
        parserOptions: {
            parser: ts.parser,
        },
    },
});

describe("chip ESLint rules", () => {
    describe("chip/require-standalone-props", () => {
        it("requires explicit variant and size props on standalone <Chip> outside <ChipGroup>", () => {
            ruleTester.run("chip/require-standalone-props", chipRequireStandalonePropsRule, {
                valid: [
                    {
                        code: '<Chip variant="soft" size="md">Tag</Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Shorthand props
                        code: "<Chip {variant} {size}>Tag</Chip>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Mixed literal and shorthand prop
                        code: '<Chip variant="outline" {size}>Tag</Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Spread props
                        code: "<Chip {...props}>Tag</Chip>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside <ChipGroup>
                        code: `
                        <ChipGroup>
                            <Chip>Alpha</Chip>
                            <Chip>Beta</Chip>
                        </ChipGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Nested inside <ChipGroup>
                        code: `
                        <ChipGroup>
                            <div>
                                <Chip>Alpha</Chip>
                            </div>
                        </ChipGroup>
                        `,
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: [
                            "{#snippet chipItem(label)}",
                            "    <Chip>{label}</Chip>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Missing both variant and size
                        code: "<Chip>Tag</Chip>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant" and "size"' },
                            },
                        ],
                    },
                    {
                        // Missing size
                        code: '<Chip variant="soft">Tag</Chip>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"size"' },
                            },
                        ],
                    },
                    {
                        // Missing variant
                        code: '<Chip size="md">Tag</Chip>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant"' },
                            },
                        ],
                    },
                    {
                        // Missing variant with shorthand size
                        code: "<Chip {size}>Tag</Chip>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant"' },
                            },
                        ],
                    },
                    {
                        // Sibling outside <ChipGroup> still requires standalone props
                        code: "<ChipGroup><Chip>Alpha</Chip></ChipGroup><Chip>Beta</Chip>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "missingStandaloneProps",
                                data: { props: '"variant" and "size"' },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("chip/require-structure", () => {
        it("validates <Chip> subcomponent ownership and forbids <ChipLabel> inside <Chip iconOnly>", () => {
            ruleTester.run("chip/require-structure", chipStructureRule, {
                valid: [
                    {
                        code: '<Chip variant="soft" size="md"><ChipIcon icon={Tag} /><ChipLabel>Tag</ChipLabel><ChipRemove /></Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Chip variant="soft" size="md"><ChipTrigger>Action</ChipTrigger></Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Nested inside <Chip>
                        code: '<Chip variant="soft" size="md"><span><ChipLabel>Nested</ChipLabel></span></Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // iconOnly with <ChipIcon> is valid
                        code: '<Chip variant="soft" size="md" iconOnly aria-label="Filter"><ChipIcon icon={Filter} /></Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Falsy iconOnly allows <ChipLabel>
                        code: '<Chip variant="soft" size="md" iconOnly={false}><ChipLabel>Tag</ChipLabel></Chip>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: [
                            "{#snippet chipParts()}",
                            "    <ChipIcon icon={Tag} />",
                            "    <ChipLabel>Tag</ChipLabel>",
                            "    <ChipRemove />",
                            "    <ChipTrigger>Go</ChipTrigger>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<ChipLabel>Orphan</ChipLabel>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ChipLabel", parent: "<Chip>" },
                            },
                        ],
                    },
                    {
                        code: "<ChipIcon icon={Tag} />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ChipIcon", parent: "<Chip>" },
                            },
                        ],
                    },
                    {
                        code: "<ChipRemove />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ChipRemove", parent: "<Chip>" },
                            },
                        ],
                    },
                    {
                        code: "<ChipTrigger>Trigger</ChipTrigger>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ChipTrigger", parent: "<Chip>" },
                            },
                        ],
                    },
                    {
                        // Inside <ChipGroup> directly instead of <Chip>
                        code: "<ChipGroup><ChipLabel>Wrong parent</ChipLabel></ChipGroup>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ChipLabel", parent: "<Chip>" },
                            },
                        ],
                    },
                    {
                        // <Chip iconOnly> containing <ChipLabel>
                        code: '<Chip variant="soft" size="md" iconOnly aria-label="Filter"><ChipIcon icon={Filter} /><ChipLabel>Filter</ChipLabel></Chip>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "unexpectedLabelInIconOnly" }],
                    },
                    {
                        // <Chip iconOnly={true}> with nested <ChipLabel>
                        code: '<Chip variant="soft" size="md" iconOnly={true}><span><ChipLabel>Filter</ChipLabel></span></Chip>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "unexpectedLabelInIconOnly" }],
                    },
                ],
            });
        });
    });
});
