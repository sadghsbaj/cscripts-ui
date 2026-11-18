import { createContext, type Component } from "svelte";

import type { ComboboxFilterFn, ComboboxIconComponentProps, ComboboxSize, ComboboxVariant } from "./index.ts";

export type ComboboxOpenFocus = "selected" | "first" | "last";

export interface ComboboxOpenOptions {
    filter?: boolean;
    openFocus?: ComboboxOpenFocus;
}

export interface ComboboxRegisteredItem<T extends string = string> {
    value: T;
    label: string;
    keywords?: string[];
    disabled: boolean;
    visible: boolean;
    id: string;
    element: HTMLDivElement | null;
    icon?: Component<ComboboxIconComponentProps>;
    iconColor?: string;
}

export interface ComboboxContext<T extends string = string> {
    readonly variant: ComboboxVariant;
    readonly size: ComboboxSize;
    readonly value: T | undefined;
    readonly inputValue: string;
    readonly open: boolean;
    readonly disabled: boolean;
    readonly readonly: boolean;
    readonly invalid: boolean;
    readonly required: boolean;
    readonly filter: boolean | ComboboxFilterFn<T>;
    readonly allowCustomValue: boolean;
    readonly openOnFocus: boolean;
    readonly isFiltering: boolean;
    readonly isKeyboardNav: boolean;
    readonly controlId: string;
    readonly inputId: string;
    readonly listboxId: string;
    readonly controlRef: HTMLDivElement | null;
    readonly inputRef: HTMLInputElement | null;
    readonly contentRef: HTMLDivElement | null;
    readonly highlightedValue: T | undefined;
    readonly highlightedItemId: string | undefined;
    readonly visibleItemCount: number;
    readonly selectedItem: ComboboxRegisteredItem<T> | undefined;
    registerControl: (el: HTMLDivElement | null) => () => void;
    registerInput: (el: HTMLInputElement | null) => () => void;
    registerInputId: (id: string | undefined) => () => void;
    registerContent: (el: HTMLDivElement | null) => () => void;
    registerListboxId: (id: string | undefined) => () => void;
    registerItem: (meta: ComboboxRegisteredItem<T>) => () => void;
    isItemVisible: (label: string, itemValue: T, keywords?: string[]) => boolean;
    isSelected: (itemValue: T) => boolean;
    isHighlighted: (itemValue: T) => boolean;
    setInputValue: (nextInputValue: string, options?: { filter?: boolean; open?: boolean }) => void;
    setHighlightedValue: (nextValue: T | undefined, options?: { keyboard?: boolean }) => void;
    setKeyboardNav: (keyboard: boolean) => void;
    moveHighlight: (direction: 1 | -1) => void;
    select: (itemValue: T) => void;
    commitCustomValue: () => void;
    clear: () => void;
    setOpen: (nextOpen: boolean, options?: ComboboxOpenOptions) => void;
    syncPopoverOpen: (nextOpen: boolean) => void;
    beginPointerOpen: (clientX: number, clientY: number) => void;
    shouldCommitPointerRelease: (event: PointerEvent) => boolean;
    clearPointerOpen: () => void;
    handleInputBlur: () => void;
}

export interface ComboboxGroupContext {
    registerLabel: (id: string) => () => void;
}

export interface ComboboxItemContext {
    registerTextElement: (el: HTMLElement | null) => () => void;
    registerDescriptionElement: (el: HTMLElement | null) => () => void;
    registerIcon: (icon: Component<ComboboxIconComponentProps>, color?: string) => () => void;
}

const [getRawComboboxContext, setRawComboboxContext, hasComboboxContext] = createContext<ComboboxContext>();

export function getComboboxContext<T extends string = string>(): ComboboxContext<T> {
    return getRawComboboxContext() as unknown as ComboboxContext<T>;
}

export function setComboboxContext<T extends string = string>(ctx: ComboboxContext<T>): void {
    setRawComboboxContext(ctx as unknown as ComboboxContext);
}

export { hasComboboxContext };

export const [getComboboxGroupContext, setComboboxGroupContext, hasComboboxGroupContext] =
    createContext<ComboboxGroupContext>();

export const [getComboboxItemContext, setComboboxItemContext, hasComboboxItemContext] =
    createContext<ComboboxItemContext>();
