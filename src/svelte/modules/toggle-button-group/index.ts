import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as ToggleButtonGroup } from "./ToggleButtonGroup.svelte";
export { default as ToggleButtonGroupSeparator } from "./ToggleButtonGroupSeparator.svelte";

export const TOGGLE_BUTTON_GROUP_TYPES = ["single", "multiple"] as const;
export type ToggleButtonGroupType = (typeof TOGGLE_BUTTON_GROUP_TYPES)[number];

export type ToggleButtonGroupTypeProps =
    | {
          type: "single";
          value?: string;
          allowDeselect?: boolean;
      }
    | {
          type: "multiple";
          value?: string[];
          allowDeselect?: never;
      };

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement> &
    ToggleButtonGroupTypeProps & {
        orientation?: "horizontal" | "vertical";
    };

export type ToggleButtonGroupSeparatorProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;

export interface ToggleButtonGroupContext {
    isSelected(itemValue: string | undefined): boolean;
    toggle(itemValue: string | undefined): void;
}

export const [getToggleButtonGroupContext, setToggleButtonGroupContext, hasToggleButtonGroupContext] =
    createContext<ToggleButtonGroupContext>();
