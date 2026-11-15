import { createContext } from "svelte";

export interface SegmentedControlContext {
    readonly value: string | undefined;
    readonly disabled: boolean;
    isSelected(itemValue: string): boolean;
    select(itemValue: string): void;
    registerItem(itemValue: string, element: HTMLElement): () => void;
}

export const [getSegmentedControlContext, setSegmentedControlContext, hasSegmentedControlContext] =
    createContext<SegmentedControlContext>();
