import type { HTMLAttributes } from "svelte/elements";
import type { SwitchProps } from "../switch/index.ts";

export { default as SwitchGroup } from "./SwitchGroup.svelte";
export { default as SwitchGroupSelectAll } from "./SwitchGroupSelectAll.svelte";
export {
    getSwitchGroupContext,
    setSwitchGroupContext,
    hasSwitchGroupContext,
    type SwitchGroupContext,
} from "./switch-group.context.ts";

export interface SwitchGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    /** Bindable array of selected item values. Supports `bind:value` and `bind:value={get, set}`. */
    value?: string[];
    /** Fires with the next selected values array when an item or select-all changes. */
    onValueChange?: (value: string[]) => void;
    /** Shared form field name propagated to child `<Switch>` items. */
    name?: string;
    disabled?: boolean;
}

export interface SwitchGroupSelectAllProps
    extends Omit<SwitchProps, "value" | "name" | "checked" | "onCheckedChange"> {
    ref?: HTMLInputElement | null;
}
