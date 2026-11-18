/**
 * Enforces compound component structure and item-text wrapping on `<Combobox>` components:
 * - `require-structure`: Ensures `Combobox*` subcomponents are nested inside their valid `<Combobox>` / `<ComboboxGroup>` / `<ComboboxItem>` parents.
 * - `require-item-text`: Requires `<ComboboxItemText>` when `<ComboboxItem>` contains child elements (icons, descriptions, badges, etc.).
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    type ParentConstraint,
    checkItemTextRequirement,
    checkRequiredParent,
    shouldSkipFile,
} from "./utils.ts";

const COMBOBOX_PARENT: ParentConstraint = { parents: new Set(["Combobox"]), display: "<Combobox>" };
const COMBOBOX_GROUP_PARENT: ParentConstraint = { parents: new Set(["ComboboxGroup"]), display: "<ComboboxGroup>" };
const COMBOBOX_ITEM_PARENT: ParentConstraint = { parents: new Set(["ComboboxItem"]), display: "<ComboboxItem>" };

const COMBOBOX_PARENT_CONSTRAINTS: Record<string, ParentConstraint> = {
    ComboboxControl: COMBOBOX_PARENT,
    ComboboxInput: COMBOBOX_PARENT,
    ComboboxIcon: COMBOBOX_PARENT,
    ComboboxClear: COMBOBOX_PARENT,
    ComboboxTrigger: COMBOBOX_PARENT,
    ComboboxContent: COMBOBOX_PARENT,
    ComboboxEmpty: COMBOBOX_PARENT,
    ComboboxGroup: COMBOBOX_PARENT,
    ComboboxItem: COMBOBOX_PARENT,
    ComboboxSeparator: COMBOBOX_PARENT,
    ComboboxGroupLabel: COMBOBOX_GROUP_PARENT,
    ComboboxItemIcon: COMBOBOX_ITEM_PARENT,
    ComboboxItemText: COMBOBOX_ITEM_PARENT,
    ComboboxItemDescription: COMBOBOX_ITEM_PARENT,
};

export const comboboxStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce valid parent-child nesting for <Combobox> compound subcomponents.",
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
                checkRequiredParent(context, node, COMBOBOX_PARENT_CONSTRAINTS, "invalidParent");
            },
        };
    },
};

export const comboboxItemTextRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Require <ComboboxItemText> when <ComboboxItem> contains child elements.",
        },
        messages: {
            missingItemText:
                "<ComboboxItem> with child elements (such as icons, descriptions, or badges) must wrap its primary label in <ComboboxItemText>.",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                checkItemTextRequirement(context, node, "ComboboxItem", "ComboboxItemText", "missingItemText");
            },
        };
    },
};

export const comboboxConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        combobox: {
            rules: {
                "require-structure": comboboxStructureRule,
                "require-item-text": comboboxItemTextRule,
            },
        },
    },
    rules: {
        "combobox/require-structure": "error",
        "combobox/require-item-text": "error",
    },
};
