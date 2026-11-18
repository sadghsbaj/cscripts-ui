import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import { selectItemTextRule, selectStructureRule } from "../select.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
        parserOptions: {
            parser: ts.parser,
        },
    },
});

describe("select ESLint rules", () => {
    describe("select/require-structure", () => {
        it("enforces valid parent-child nesting for <Select> compound subcomponents", () => {
            ruleTester.run("select/require-structure", selectStructureRule, {
                valid: [
                    {
                        code: [
                            "<Select>",
                            "    <SelectTrigger>",
                            '        <SelectValue placeholder="Choose..." />',
                            "    </SelectTrigger>",
                            "    <SelectContent>",
                            "        <SelectGroup>",
                            "            <SelectGroupLabel>Fruits</SelectGroupLabel>",
                            '            <SelectItem value="apple">',
                            "                <SelectItemIcon icon={Apple} />",
                            "                <SelectItemText>Apple</SelectItemText>",
                            "                <SelectItemDescription>Crisp fruit</SelectItemDescription>",
                            "            </SelectItem>",
                            "        </SelectGroup>",
                            "        <SelectSeparator />",
                            "    </SelectContent>",
                            "</Select>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Nested inside {#snippet}
                        code: [
                            "{#snippet selectParts()}",
                            "    <SelectTrigger><SelectValue /></SelectTrigger>",
                            "    <SelectContent>",
                            "        <SelectGroup>",
                            "            <SelectGroupLabel>Group</SelectGroupLabel>",
                            "        </SelectGroup>",
                            '        <SelectItem value="a">',
                            "            <SelectItemIcon icon={Check} />",
                            "            <SelectItemText>A</SelectItemText>",
                            "            <SelectItemDescription>Desc</SelectItemDescription>",
                            "        </SelectItem>",
                            "        <SelectSeparator />",
                            "    </SelectContent>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Skips SelectTrigger.svelte internal implementation
                        code: "<SelectValue />",
                        filename: "src/modules/select/SelectTrigger.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<SelectTrigger>Open</SelectTrigger>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectTrigger", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        code: "<SelectValue />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectValue", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        code: "<SelectContent>Items</SelectContent>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectContent", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        code: "<SelectGroup>Group</SelectGroup>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectGroup", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        code: '<SelectItem value="a">A</SelectItem>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectItem", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        code: "<SelectSeparator />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectSeparator", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        // Mixed subcomponents: SelectItem inside ComboboxContent
                        code: '<Combobox><ComboboxContent><SelectItem value="a">A</SelectItem></ComboboxContent></Combobox>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectItem", parent: "<Select>" },
                            },
                        ],
                    },
                    {
                        // SelectGroupLabel outside SelectGroup (directly in SelectContent)
                        code: "<Select><SelectContent><SelectGroupLabel>Label</SelectGroupLabel></SelectContent></Select>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectGroupLabel", parent: "<SelectGroup>" },
                            },
                        ],
                    },
                    {
                        // SelectItemText outside SelectItem
                        code: "<Select><SelectContent><SelectItemText>Orphan</SelectItemText></SelectContent></Select>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectItemText", parent: "<SelectItem>" },
                            },
                        ],
                    },
                    {
                        // SelectItemIcon outside SelectItem
                        code: "<Select><SelectContent><SelectItemIcon icon={Check} /></SelectContent></Select>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectItemIcon", parent: "<SelectItem>" },
                            },
                        ],
                    },
                    {
                        // SelectItemDescription outside SelectItem
                        code: "<Select><SelectContent><SelectItemDescription>Desc</SelectItemDescription></SelectContent></Select>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "SelectItemDescription", parent: "<SelectItem>" },
                            },
                        ],
                    },
                ],
            });
        });
    });

    describe("select/require-item-text", () => {
        it("requires <SelectItemText> when <SelectItem> contains child elements", () => {
            ruleTester.run("select/require-item-text", selectItemTextRule, {
                valid: [
                    {
                        // Plain text
                        code: '<Select><SelectContent><SelectItem value="apple">Apple</SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Mustache expression only
                        code: '<Select><SelectContent><SelectItem value="apple">{label}</SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Child elements with SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple"><SelectItemIcon icon={Apple} /><SelectItemText>Apple</SelectItemText></SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Description + SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple"><SelectItemText>Apple</SelectItemText><SelectItemDescription>Crisp</SelectItemDescription></SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Conditional child element + SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple">{#if showIcon}<SelectItemIcon icon={Apple} />{/if}<SelectItemText>Apple</SelectItemText></SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Spread attributes
                        code: '<Select><SelectContent><SelectItem value="apple" {...props}><Badge>New</Badge></SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: [
                            "{#snippet itemRow(opt)}",
                            "    <SelectItem value={opt.value}>",
                            "        <SelectItemIcon icon={opt.icon} />",
                            "        <SelectItemText>{opt.label}</SelectItemText>",
                            "    </SelectItem>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Child icon without SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple"><SelectItemIcon icon={Apple} />Apple</SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                    {
                        // Generic child element without SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple"><span>Apple</span></SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                    {
                        // Description without SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple"><SelectItemDescription>Crisp</SelectItemDescription>Apple</SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                    {
                        // Conditional child element without SelectItemText
                        code: '<Select><SelectContent><SelectItem value="apple">{#if isNew}<Badge>New</Badge>{/if}Apple</SelectItem></SelectContent></Select>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingItemText" }],
                    },
                ],
            });
        });
    });
});
