import type { HTMLInputAttributes } from "svelte/elements";

export { default as Checkbox } from "./Checkbox.svelte";

export const CHECKBOX_VARIANTS = ["soft", "elevated"] as const;
export const CHECKBOX_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type CheckboxVariant = (typeof CHECKBOX_VARIANTS)[number];
export type CheckboxSize = (typeof CHECKBOX_SIZES)[number];

export type CheckboxHitAreaSize = "sm" | "md" | "lg";

export interface CheckboxProps extends Omit<HTMLInputAttributes, "size" | "type"> {
    variant: CheckboxVariant;
    size: CheckboxSize;
    checked?: boolean;
    indeterminate?: boolean;
    invalid?: boolean;
    hitAreaSize?: CheckboxHitAreaSize;
}
