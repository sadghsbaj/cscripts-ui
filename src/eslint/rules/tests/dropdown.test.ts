import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import { dropdownStructureRule } from "../dropdown.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
        parserOptions: {
            parser: ts.parser,
        },
    },
});

describe("dropdown ESLint rules", () => {
    describe("dropdown/require-structure", () => {
        it("enforces valid parent-child nesting for <Dropdown> compound subcomponents", () => {
            ruleTester.run("dropdown/require-structure", dropdownStructureRule, {
                valid: [
                    {
                        code: [
                            "<Dropdown>",
                            "    <DropdownContent>",
                            "        <DropdownHeader>Account</DropdownHeader>",
                            "        <DropdownGroup>",
                            "            <DropdownGroupLabel>Actions</DropdownGroupLabel>",
                            "            <DropdownItem>",
                            "                <DropdownItemIcon icon={Edit} />",
                            "                <DropdownItemText>Edit</DropdownItemText>",
                            "                <DropdownItemDescription>Modify item</DropdownItemDescription>",
                            "                <DropdownItemShortcut>Ctrl+E</DropdownItemShortcut>",
                            "            </DropdownItem>",
                            "            <DropdownCheckboxItem checked>",
                            "                <DropdownItemIcon icon={Eye} />",
                            "                <DropdownItemText>Show preview</DropdownItemText>",
                            "                <DropdownItemDescription>Toggle panel</DropdownItemDescription>",
                            "                <DropdownItemShortcut>Ctrl+P</DropdownItemShortcut>",
                            "            </DropdownCheckboxItem>",
                            "        </DropdownGroup>",
                            "        <DropdownSeparator />",
                            '        <DropdownRadioGroup value="asc">',
                            "            <DropdownGroupLabel>Sort Order</DropdownGroupLabel>",
                            '            <DropdownRadioItem value="asc">',
                            "                <DropdownItemIcon icon={ArrowUp} />",
                            "                <DropdownItemText>Ascending</DropdownItemText>",
                            "                <DropdownItemDescription>A to Z</DropdownItemDescription>",
                            "                <DropdownItemShortcut>1</DropdownItemShortcut>",
                            "            </DropdownRadioItem>",
                            "        </DropdownRadioGroup>",
                            "        <DropdownFooter>v1.0</DropdownFooter>",
                            "    </DropdownContent>",
                            "</Dropdown>",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                    {
                        // Inside {#snippet}
                        code: [
                            "{#snippet dropdownParts()}",
                            "    <DropdownContent>",
                            "        <DropdownHeader>Header</DropdownHeader>",
                            "        <DropdownGroup>",
                            "            <DropdownGroupLabel>Group</DropdownGroupLabel>",
                            "            <DropdownItem>",
                            "                <DropdownItemIcon icon={Edit} />",
                            "                <DropdownItemText>Edit</DropdownItemText>",
                            "                <DropdownItemDescription>Desc</DropdownItemDescription>",
                            "                <DropdownItemShortcut>E</DropdownItemShortcut>",
                            "            </DropdownItem>",
                            "        </DropdownGroup>",
                            "        <DropdownRadioGroup>",
                            '            <DropdownRadioItem value="a">A</DropdownRadioItem>',
                            "        </DropdownRadioGroup>",
                            "        <DropdownCheckboxItem>Check</DropdownCheckboxItem>",
                            "        <DropdownSeparator />",
                            "        <DropdownFooter>Footer</DropdownFooter>",
                            "    </DropdownContent>",
                            "{/snippet}",
                        ].join("\n"),
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<DropdownContent>Items</DropdownContent>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownContent", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownHeader>Header</DropdownHeader>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownHeader", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownFooter>Footer</DropdownFooter>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownFooter", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownGroup>Group</DropdownGroup>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownGroup", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownItem>Item</DropdownItem>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownItem", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownCheckboxItem>Check</DropdownCheckboxItem>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownCheckboxItem", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownRadioGroup>Radio</DropdownRadioGroup>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownRadioGroup", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        code: "<DropdownSeparator />",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownSeparator", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        // Mixed subcomponents: DropdownItem inside SelectContent
                        code: "<Select><SelectContent><DropdownItem>Item</DropdownItem></SelectContent></Select>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownItem", parent: "<Dropdown>" },
                            },
                        ],
                    },
                    {
                        // DropdownRadioItem outside DropdownRadioGroup (directly in DropdownContent)
                        code: '<Dropdown><DropdownContent><DropdownRadioItem value="a">A</DropdownRadioItem></DropdownContent></Dropdown>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownRadioItem", parent: "<DropdownRadioGroup>" },
                            },
                        ],
                    },
                    {
                        // DropdownRadioItem inside DropdownGroup instead of DropdownRadioGroup
                        code: '<Dropdown><DropdownContent><DropdownGroup><DropdownRadioItem value="a">A</DropdownRadioItem></DropdownGroup></DropdownContent></Dropdown>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: { child: "DropdownRadioItem", parent: "<DropdownRadioGroup>" },
                            },
                        ],
                    },
                    {
                        // DropdownGroupLabel outside DropdownGroup / DropdownRadioGroup
                        code: "<Dropdown><DropdownContent><DropdownGroupLabel>Label</DropdownGroupLabel></DropdownContent></Dropdown>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: {
                                    child: "DropdownGroupLabel",
                                    parent: "<DropdownGroup> or <DropdownRadioGroup>",
                                },
                            },
                        ],
                    },
                    {
                        // DropdownItemText outside item
                        code: "<Dropdown><DropdownContent><DropdownItemText>Orphan</DropdownItemText></DropdownContent></Dropdown>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: {
                                    child: "DropdownItemText",
                                    parent: "<DropdownItem>, <DropdownCheckboxItem>, or <DropdownRadioItem>",
                                },
                            },
                        ],
                    },
                    {
                        // DropdownItemIcon outside item
                        code: "<Dropdown><DropdownContent><DropdownItemIcon icon={Edit} /></DropdownContent></Dropdown>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: {
                                    child: "DropdownItemIcon",
                                    parent: "<DropdownItem>, <DropdownCheckboxItem>, or <DropdownRadioItem>",
                                },
                            },
                        ],
                    },
                    {
                        // DropdownItemDescription outside item
                        code: "<Dropdown><DropdownContent><DropdownItemDescription>Desc</DropdownItemDescription></DropdownContent></Dropdown>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: {
                                    child: "DropdownItemDescription",
                                    parent: "<DropdownItem>, <DropdownCheckboxItem>, or <DropdownRadioItem>",
                                },
                            },
                        ],
                    },
                    {
                        // DropdownItemShortcut outside item
                        code: "<Dropdown><DropdownContent><DropdownItemShortcut>Ctrl+K</DropdownItemShortcut></DropdownContent></Dropdown>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "invalidParent",
                                data: {
                                    child: "DropdownItemShortcut",
                                    parent: "<DropdownItem>, <DropdownCheckboxItem>, or <DropdownRadioItem>",
                                },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
