/**
 * Enforces compound component structure on `<Dropdown>` components:
 * - `require-structure`: Ensures `Dropdown*` subcomponents are nested inside their valid `<Dropdown>`,
 *   `<DropdownGroup>` / `<DropdownRadioGroup>`, or item parents.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { type ParentConstraint, checkRequiredParent, shouldSkipFile } from "./utils.ts";

const DROPDOWN_PARENT: ParentConstraint = { parents: new Set(["Dropdown"]), display: "<Dropdown>" };
const DROPDOWN_GROUP_PARENT: ParentConstraint = {
    parents: new Set(["DropdownGroup", "DropdownRadioGroup"]),
    display: "<DropdownGroup> or <DropdownRadioGroup>",
};
const DROPDOWN_RADIO_GROUP_PARENT: ParentConstraint = {
    parents: new Set(["DropdownRadioGroup"]),
    display: "<DropdownRadioGroup>",
};
const DROPDOWN_ITEM_PARENT: ParentConstraint = {
    parents: new Set(["DropdownItem", "DropdownCheckboxItem", "DropdownRadioItem"]),
    display: "<DropdownItem>, <DropdownCheckboxItem>, or <DropdownRadioItem>",
};

const DROPDOWN_PARENT_CONSTRAINTS: Record<string, ParentConstraint> = {
    DropdownContent: DROPDOWN_PARENT,
    DropdownHeader: DROPDOWN_PARENT,
    DropdownFooter: DROPDOWN_PARENT,
    DropdownGroup: DROPDOWN_PARENT,
    DropdownItem: DROPDOWN_PARENT,
    DropdownCheckboxItem: DROPDOWN_PARENT,
    DropdownRadioGroup: DROPDOWN_PARENT,
    DropdownSeparator: DROPDOWN_PARENT,
    DropdownGroupLabel: DROPDOWN_GROUP_PARENT,
    DropdownRadioItem: DROPDOWN_RADIO_GROUP_PARENT,
    DropdownItemIcon: DROPDOWN_ITEM_PARENT,
    DropdownItemText: DROPDOWN_ITEM_PARENT,
    DropdownItemDescription: DROPDOWN_ITEM_PARENT,
    DropdownItemShortcut: DROPDOWN_ITEM_PARENT,
};

export const dropdownStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce valid parent-child nesting for <Dropdown> compound subcomponents.",
        },
        messages: {
            invalidParent: "<{{child}}> must be used inside {{parent}}.",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                checkRequiredParent(context, node, DROPDOWN_PARENT_CONSTRAINTS, "invalidParent");
            },
        };
    },
};

export const dropdownConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        dropdown: {
            rules: {
                "require-structure": dropdownStructureRule,
            },
        },
    },
    rules: {
        "dropdown/require-structure": "error",
    },
};
