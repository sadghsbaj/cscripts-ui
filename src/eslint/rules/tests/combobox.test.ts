import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import { comboboxItemTextRule, comboboxStructureRule } from "../combobox.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
        parserOptions: {
            parser: ts.parser,
        },
    },
});

describe("combobox ESLint rules", () => {
    describe("combobox/require-structure", () => {
        it("enforces valid parent-child nesting for <Combobox> compound subcomponents", () => {
            ruleTester.run("combobox/require-structure", comboboxStructureRule, {
                valid: [
                    {
                        code: [
                            "<Combobox>",
                            "    <ComboboxControl>",
                            "        <ComboboxIcon icon={Search} />",
                            '        <ComboboxInput placeholder="Search..." />',
                            "        <ComboboxClear />",
                            "        <ComboboxTrigger />",
                            "    </ComboboxControl>",
                            "    <ComboboxContent>",
                            "        <ComboboxEmpty>No results</ComboboxEmpty>",
                            "        <ComboboxGroup>",
                            "            <ComboboxGroupLabel>Fruits</ComboboxGroupLabel>",
                            '            <ComboboxItem value="apple">',
                            "                <ComboboxItemIcon icon={Apple} />",
                            "                <ComboboxItemText>Apple</ComboboxItemText>",
                            "                <ComboboxItemDescription>Crisp fruit</ComboboxItemDescription>",
                            "            </ComboboxItem>",
                            "        </ComboboxGroup>",
                            "        <ComboboxSeparator />",
                            "    </ComboboxContent>",
                            "</Combobox>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: [
                            "{#snippet comboboxParts()}",
                            "    <ComboboxControl>",
                            "        <ComboboxInput />",
                            "        <ComboboxIcon icon={Search} />",
                            "        <ComboboxClear />",
                            "        <ComboboxTrigger />",
                            "    </ComboboxControl>",
                            "    <ComboboxContent>",
                            "        <ComboboxEmpty>Empty</ComboboxEmpty>",
                            "        <ComboboxGroup>",
                            "            <ComboboxGroupLabel>Group</ComboboxGroupLabel>",
                            "        </ComboboxGroup>",
                            '        <ComboboxItem value="a">',
                            "            <ComboboxItemIcon icon={Check} />",
                            "            <ComboboxItemText>A</ComboboxItemText>",
                            "            <ComboboxItemDescription>Desc</ComboboxItemDescription>",
                            "        </ComboboxItem>",
                            "        <ComboboxSeparator />",
                            "    </ComboboxContent>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<ComboboxControl><ComboboxInput /></ComboboxControl>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxControl", parent: "<Combobox>" },
                            },
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxInput", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxIcon icon={Search} />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxIcon", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxClear />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxClear", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxTrigger />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxTrigger", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxContent>Content</ComboboxContent>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxContent", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxEmpty>No results</ComboboxEmpty>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxEmpty", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxGroup>Group</ComboboxGroup>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxGroup", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: '<ComboboxItem value="a">A</ComboboxItem>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxItem", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        code: "<ComboboxSeparator />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxSeparator", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        // Mixed subcomponents: ComboboxItem inside SelectContent
                        code: '<Select><SelectContent><ComboboxItem value="a">A</ComboboxItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxItem", parent: "<Combobox>" },
                            },
                        ],
                    },
                    {
                        // ComboboxGroupLabel outside ComboboxGroup
                        code: "<Combobox><ComboboxContent><ComboboxGroupLabel>Label</ComboboxGroupLabel></ComboboxContent></Combobox>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxGroupLabel", parent: "<ComboboxGroup>" },
                            },
                        ],
                    },
                    {
                        // ComboboxItemText outside ComboboxItem
                        code: "<Combobox><ComboboxContent><ComboboxItemText>Orphan</ComboboxItemText></ComboboxContent></Combobox>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxItemText", parent: "<ComboboxItem>" },
                            },
                        ],
                    },
                    {
                        // ComboboxItemIcon outside ComboboxItem
                        code: "<Combobox><ComboboxContent><ComboboxItemIcon icon={Check} /></ComboboxContent></Combobox>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxItemIcon", parent: "<ComboboxItem>" },
                            },
                        ],
                    },
                    {
                        // ComboboxItemDescription outside ComboboxItem
                        code: "<Combobox><ComboboxContent><ComboboxItemDescription>Desc</ComboboxItemDescription></ComboboxContent></Combobox>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "ComboboxItemDescription", parent: "<ComboboxItem>" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("combobox/require-item-text", () => {
        it("requires <ComboboxItemText> when <ComboboxItem> contains child elements", () => {
            ruleTester.run("combobox/require-item-text", comboboxItemTextRule, {
                valid: [
                    {
                        // Plain text
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple">Apple</ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Mustache expression only
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple">{label}</ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Child elements with ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple"><ComboboxItemIcon icon={Apple} /><ComboboxItemText>Apple</ComboboxItemText></ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Description + ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple"><ComboboxItemText>Apple</ComboboxItemText><ComboboxItemDescription>Crisp</ComboboxItemDescription></ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Conditional child element + ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple">{#if showIcon}<ComboboxItemIcon icon={Apple} />{/if}<ComboboxItemText>Apple</ComboboxItemText></ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Spread attributes
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple" {...props}><Badge>New</Badge></ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: [
                            "{#snippet itemRow(opt)}",
                            "    <ComboboxItem value={opt.value}>",
                            "        <ComboboxItemIcon icon={opt.icon} />",
                            "        <ComboboxItemText>{opt.label}</ComboboxItemText>",
                            "    </ComboboxItem>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Child icon without ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple"><ComboboxItemIcon icon={Apple} />Apple</ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                    {
                        // Generic child element without ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple"><span>Apple</span></ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                    {
                        // Description without ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple"><ComboboxItemDescription>Crisp</ComboboxItemDescription>Apple</ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                    {
                        // Conditional child element without ComboboxItemText
                        code: '<Combobox><ComboboxContent><ComboboxItem value="apple">{#if isNew}<Badge>New</Badge>{/if}Apple</ComboboxItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                ],
            });
        });
    });
});
