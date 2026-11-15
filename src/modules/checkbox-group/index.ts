import type { HTMLAttributes } from "svelte/elements";
import type { CheckboxProps } from "../checkbox/index.ts";

export { default as CheckboxGroup } from "./CheckboxGroup.svelte";
export { default as CheckboxGroupSelectAll } from "./CheckboxGroupSelectAll.svelte";
export {
    getCheckboxGroupContext,
    setCheckboxGroupContext,
    hasCheckboxGroupContext,
    type CheckboxGroupContext,
} from "./checkbox-group.context.ts";

export interface CheckboxGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    /** Bindable array of selected item values. Supports `bind:value` and `bind:value={get, set}`. */
    value?: string[];
    /** Fires with the next selected values array when an item or select-all changes. */
    onValueChange?: (value: string[]) => void;
    /** Shared form field name propagated to child `<Checkbox>` items. */
    name?: string;
    disabled?: boolean;
    invalid?: boolean;
}

export interface CheckboxGroupSelectAllProps
    extends Omit<
        CheckboxProps,
        "value" | "name" | "checked" | "onCheckedChange" | "indeterminate" | "onIndeterminateChange"
    > {
    ref?: HTMLInputElement | null;
}
