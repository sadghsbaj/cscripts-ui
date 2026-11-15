import type { HTMLInputAttributes } from "svelte/elements";

export { default as Checkbox } from "./Checkbox.svelte";

export const CHECKBOX_VARIANTS = ["soft", "elevated"] as const;
export const CHECKBOX_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type CheckboxVariant = (typeof CHECKBOX_VARIANTS)[number];
export type CheckboxSize = (typeof CHECKBOX_SIZES)[number];

export interface CheckboxProps extends Omit<HTMLInputAttributes, "size" | "type"> {
    ref?: HTMLInputElement | null;
    variant: CheckboxVariant;
    size: CheckboxSize;
    /** Bindable checked state. Supports `bind:checked` and `bind:checked={get, set}`. */
    checked?: boolean;
    /** Fires with the next checked state after a user change when the value changes. */
    onCheckedChange?: (checked: boolean) => void;
    /** Bindable indeterminate state. Supports `bind:indeterminate` and `bind:indeterminate={get, set}`. */
    indeterminate?: boolean;
    /** Fires with the next indeterminate state after a user change when the value changes. */
    onIndeterminateChange?: (indeterminate: boolean) => void;
    invalid?: boolean;
}
