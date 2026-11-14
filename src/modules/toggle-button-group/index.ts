import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as ToggleButtonGroup } from "./ToggleButtonGroup.svelte";
export { default as ToggleButtonGroupSeparator } from "./ToggleButtonGroupSeparator.svelte";

export const TOGGLE_BUTTON_GROUP_TYPES = ["single", "multiple"] as const;
export type ToggleButtonGroupType = (typeof TOGGLE_BUTTON_GROUP_TYPES)[number];

export const TOGGLE_BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ToggleButtonGroupOrientation = (typeof TOGGLE_BUTTON_GROUP_ORIENTATIONS)[number];

export type ToggleButtonGroupSingleProps =
    | {
          type: "single";
          value?: string;
          allowDeselect?: false;
          onValueChange?: (value: string) => void;
      }
    | {
          type: "single";
          value?: string | undefined;
          allowDeselect: true;
          onValueChange?: (value: string | undefined) => void;
      };

export type ToggleButtonGroupMultipleProps = {
    type: "multiple";
    value?: string[];
    allowDeselect?: never;
    onValueChange?: (value: string[]) => void;
};

export type ToggleButtonGroupTypeProps = ToggleButtonGroupSingleProps | ToggleButtonGroupMultipleProps;

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement> &
    ToggleButtonGroupTypeProps & {
        ref?: HTMLDivElement | null;
        orientation?: ToggleButtonGroupOrientation;
        /** Disables the group and all child `<ToggleButton>` items. */
        disabled?: boolean;
    };

export type ToggleButtonGroupSeparatorProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
    ref?: HTMLSpanElement | null;
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
