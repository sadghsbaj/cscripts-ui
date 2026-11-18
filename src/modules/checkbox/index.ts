import type { HTMLInputAttributes, SVGAttributes } from "svelte/elements";

export { default as Checkbox } from "./Checkbox.svelte";
export { default as CheckboxMark } from "./CheckboxMark.svelte";

export const CHECKBOX_VARIANTS = ["soft", "elevated"] as const;
export const CHECKBOX_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type CheckboxVariant = (typeof CHECKBOX_VARIANTS)[number];
export type CheckboxSize = (typeof CHECKBOX_SIZES)[number];

export interface CheckboxProps extends Omit<HTMLInputAttributes, "size" | "type"> {
    /** Bindable reference to the `<input>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLInputElement | null;
    variant: CheckboxVariant;
    size: CheckboxSize;
    /** Bindable checked state. Use `bind:checked` or `bind:checked={get, set}`; do not pass a plain expression like `checked={fn()}`. */
    checked?: boolean;
    /** Fires with the next checked state after a user change when the value changes. */
    onCheckedChange?: (checked: boolean) => void;
    /** Bindable indeterminate state. Use `bind:indeterminate` or `bind:indeterminate={get, set}`; do not pass a plain expression like `indeterminate={fn()}`. */
    indeterminate?: boolean;
    /** Fires with the next indeterminate state after a user change when the value changes. */
    onIndeterminateChange?: (indeterminate: boolean) => void;
    invalid?: boolean;
}

export interface CheckboxMarkProps extends Omit<SVGAttributes<SVGSVGElement>, "children"> {
    /** Bindable reference to the `<svg>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: SVGSVGElement | null;
    /** @default false */
    checked?: boolean;
    /** @default false */
    indeterminate?: boolean;
}
