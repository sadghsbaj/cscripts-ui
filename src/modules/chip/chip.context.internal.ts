import { createContext } from "svelte";

import type { ChipSize, ChipVariant } from "./index.ts";

export interface ChipGroupContext {
    readonly variant: ChipVariant | undefined;
    readonly size: ChipSize | undefined;
    readonly disabled: boolean;
    isSelected(itemValue: string): boolean;
    toggle(itemValue: string): void;
}

export const [getChipGroupContext, setChipGroupContext, hasChipGroupContext] = createContext<ChipGroupContext>();

export interface ChipContext {
    readonly variant: ChipVariant;
    readonly size: ChipSize;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly pressed: boolean;
    readonly hasTrigger: boolean;
    readonly hasRemove: boolean;
    registerTrigger(): () => void;
    registerRemove(): () => void;
    setTriggerPressed(next: boolean): void;
}

export const [getChipContext, setChipContext, hasChipContext] = createContext<ChipContext>();

export interface ChipTriggerContext {
    readonly insideTrigger: true;
}

export const [getChipTriggerContext, setChipTriggerContext, hasChipTriggerContext] =
    createContext<ChipTriggerContext>();
