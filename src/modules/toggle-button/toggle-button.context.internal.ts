import { createContext } from "svelte";
import type { ToggleButtonGroupOrientation, ToggleButtonGroupType } from "./index.ts";

export interface ToggleButtonGroupContext {
    readonly type: ToggleButtonGroupType;
    readonly orientation: ToggleButtonGroupOrientation;
    readonly disabled: boolean;
    isSelected(itemValue: string): boolean;
    toggle(itemValue: string): void;
}

export const [getToggleButtonGroupContext, setToggleButtonGroupContext, hasToggleButtonGroupContext] =
    createContext<ToggleButtonGroupContext>();
