/**
 * Enforces compound component structure and item-text wrapping on `<Select>` components:
 * - `require-structure`: Ensures `Select*` subcomponents are nested inside their valid `<Select>` / `<SelectGroup>` / `<SelectItem>` parents.
 * - `require-item-text`: Requires `<SelectItemText>` when `<SelectItem>` contains child elements (icons, descriptions, badges, etc.).
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import {
    type ParentConstraint,
    checkItemTextRequirement,
    checkRequiredParent,
    shouldSkipFile,
} from "./utils.ts";

const SELECT_PARENT: ParentConstraint = { parents: new Set(["Select"]), display: "<Select>" };
const SELECT_GROUP_PARENT: ParentConstraint = { parents: new Set(["SelectGroup"]), display: "<SelectGroup>" };
const SELECT_ITEM_PARENT: ParentConstraint = { parents: new Set(["SelectItem"]), display: "<SelectItem>" };

const SELECT_PARENT_CONSTRAINTS: Record<string, ParentConstraint> = {
    SelectTrigger: SELECT_PARENT,
    SelectValue: SELECT_PARENT,
    SelectContent: SELECT_PARENT,
    SelectGroup: SELECT_PARENT,
    SelectItem: SELECT_PARENT,
    SelectSeparator: SELECT_PARENT,
    SelectGroupLabel: SELECT_GROUP_PARENT,
    SelectItemIcon: SELECT_ITEM_PARENT,
    SelectItemText: SELECT_ITEM_PARENT,
    SelectItemDescription: SELECT_ITEM_PARENT,
};

export const selectStructureRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Enforce valid parent-child nesting for <Select> compound subcomponents.",
        },
        messages: {
            invalidParent: "<{{child}}> must be used inside {{parent}}.",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const normalizedFilename = (context.filename ?? "").replaceAll("\\", "/");
        if (normalizedFilename.endsWith("modules/select/SelectTrigger.svelte")) {
            return {};
        }

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                checkRequiredParent(context, node, SELECT_PARENT_CONSTRAINTS, "invalidParent");
            },
        };
    },
};

export const selectItemTextRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description: "Require <SelectItemText> when <SelectItem> contains child elements.",
        },
        messages: {
            missingItemText:
                "<SelectItem> with child elements (such as icons, descriptions, or badges) must wrap its primary label in <SelectItemText>.",
        },
        schema: [],
    },
    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const normalizedFilename = (context.filename ?? "").replaceAll("\\", "/");
        if (normalizedFilename.endsWith("modules/select/SelectTrigger.svelte")) {
            return {};
        }

        return {
            SvelteElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteElement;
                checkItemTextRequirement(context, node, "SelectItem", "SelectItemText", "missingItemText");
            },
        };
    },
};

export const selectConfig: Linter.Config = {
    files: ["**/*.svelte"],
    plugins: {
        select: {
            rules: {
                "require-structure": selectStructureRule,
                "require-item-text": selectItemTextRule,
            },
        },
    },
    rules: {
        "select/require-structure": "error",
        "select/require-item-text": "error",
    },
};
