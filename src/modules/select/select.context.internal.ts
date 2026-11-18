import { createContext, type Component } from "svelte";

import type { SelectIconComponentProps, SelectSelectedItem, SelectSize, SelectVariant } from "./index.ts";

export type SelectOpenFocus = "selected" | "first" | "last";

export interface SelectOpenOptions {
    restoreFocus?: boolean;
    openFocus?: SelectOpenFocus;
}

export interface SelectRegisteredItem<T extends string = string> extends SelectSelectedItem<T> {
    disabled: boolean;
    element: HTMLDivElement | null;
}

export interface SelectContext<T extends string = string> {
    readonly variant: SelectVariant;
    readonly size: SelectSize;
    readonly value: T | undefined;
    readonly open: boolean;
    readonly disabled: boolean;
    readonly invalid: boolean;
    readonly required: boolean;
    readonly triggerId: string;
    readonly listboxId: string;
    readonly triggerRef: HTMLButtonElement | null;
    readonly contentRef: HTMLDivElement | null;
    readonly selectedItem: SelectSelectedItem<T> | undefined;
    readonly openFocus: SelectOpenFocus;
    registerTrigger: (el: HTMLButtonElement | null) => () => void;
    registerTriggerId: (id: string | undefined) => () => void;
    registerContent: (el: HTMLDivElement | null) => () => void;
    registerListboxId: (id: string | undefined) => () => void;
    registerItem: (meta: SelectRegisteredItem<T>) => () => void;
    getOrderedEnabledItems: () => SelectRegisteredItem<T>[];
    isSelected: (itemValue: T) => boolean;
    select: (itemValue: T) => void;
    selectWithoutToggle: (itemValue: T) => void;
    setOpen: (nextOpen: boolean, options?: SelectOpenOptions) => void;
    syncPopoverOpen: (nextOpen: boolean) => void;
    beginPointerOpen: (clientX: number, clientY: number) => void;
    shouldCommitPointerRelease: (event: PointerEvent) => boolean;
    clearPointerOpen: () => void;
}

export interface SelectGroupContext {
    registerLabel: (id: string) => () => void;
}

export interface SelectItemContext {
    registerTextElement: (el: HTMLElement | null) => () => void;
    registerDescriptionElement: (el: HTMLElement | null) => () => void;
    registerIcon: (icon: Component<SelectIconComponentProps>, color?: string) => () => void;
}

const [getRawSelectContext, setRawSelectContext, hasSelectContext] = createContext<SelectContext>();

export function getSelectContext<T extends string = string>(): SelectContext<T> {
    return getRawSelectContext() as unknown as SelectContext<T>;
}

export function setSelectContext<T extends string = string>(ctx: SelectContext<T>): void {
    setRawSelectContext(ctx as unknown as SelectContext);
}

export { hasSelectContext };

export const [getSelectGroupContext, setSelectGroupContext, hasSelectGroupContext] =
    createContext<SelectGroupContext>();

export const [getSelectItemContext, setSelectItemContext, hasSelectItemContext] = createContext<SelectItemContext>();
