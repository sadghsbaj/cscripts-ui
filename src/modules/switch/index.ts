import type { HTMLInputAttributes } from "svelte/elements";

export { default as Switch } from "./Switch.svelte";

export const SWITCH_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type SwitchSize = (typeof SWITCH_SIZES)[number];

export interface SwitchProps extends Omit<HTMLInputAttributes, "size" | "type" | "role"> {
    /** Bindable reference to the `<input>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLInputElement | null;
    size: SwitchSize;
    /** Bindable checked state. Use `bind:checked` or `bind:checked={get, set}`; do not pass a plain expression like `checked={fn()}`. */
    checked?: boolean;
    /** Fires with the next checked state after a user change when the value changes. */
    onCheckedChange?: (checked: boolean) => void;
}
