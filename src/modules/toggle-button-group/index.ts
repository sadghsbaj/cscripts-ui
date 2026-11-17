import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as ToggleButtonGroup } from "./ToggleButtonGroup.svelte";

export const TOGGLE_BUTTON_GROUP_TYPES = ["single", "multiple"] as const;
export type ToggleButtonGroupType = (typeof TOGGLE_BUTTON_GROUP_TYPES)[number];

export const TOGGLE_BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ToggleButtonGroupOrientation = (typeof TOGGLE_BUTTON_GROUP_ORIENTATIONS)[number];

export type ToggleButtonGroupSingleProps =
    | {
          type: "single";
          /** Bindable selected value. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
          value?: string;
          allowDeselect?: false;
          onValueChange?: (value: string) => void;
      }
    | {
          type: "single";
          /** Bindable selected value. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
          value?: string | undefined;
          allowDeselect: true;
          onValueChange?: (value: string | undefined) => void;
      };

export type ToggleButtonGroupMultipleProps = {
    type: "multiple";
    /** Bindable selected values. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
    value?: string[];
    allowDeselect?: never;
    onValueChange?: (value: string[]) => void;
};

export type ToggleButtonGroupTypeProps = ToggleButtonGroupSingleProps | ToggleButtonGroupMultipleProps;

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement> &
    ToggleButtonGroupTypeProps & {
        /** Bindable reference to the root `<div>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
        ref?: HTMLDivElement | null;
        orientation?: ToggleButtonGroupOrientation;
        /** Disables the group and all child `<ToggleButton>` items. */
        disabled?: boolean;
    };

export interface ToggleButtonGroupContext {
    readonly type: ToggleButtonGroupType;
    readonly orientation: ToggleButtonGroupOrientation;
    readonly disabled: boolean;
    isSelected(itemValue: string): boolean;
    toggle(itemValue: string): void;
}

export const [getToggleButtonGroupContext, setToggleButtonGroupContext, hasToggleButtonGroupContext] =
    createContext<ToggleButtonGroupContext>();
