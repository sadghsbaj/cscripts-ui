import type { HTMLInputAttributes } from "svelte/elements";

export { default as Switch } from "./Switch.svelte";

export const SWITCH_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type SwitchSize = (typeof SWITCH_SIZES)[number];

export interface SwitchProps extends Omit<HTMLInputAttributes, "size" | "type" | "role"> {
    ref?: HTMLInputElement | null;
    size: SwitchSize;
    /** Bindable checked state. Supports `bind:checked` and `bind:checked={get, set}`. */
    checked?: boolean;
    /** Fires with the next checked state after a user change when the value changes. */
    onCheckedChange?: (checked: boolean) => void;
}
