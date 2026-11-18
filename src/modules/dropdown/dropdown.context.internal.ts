import { createContext } from "svelte";

import type { DropdownSize } from "./index.ts";

export type DropdownOpenFocus = "first" | "last";

export interface DropdownOpenOptions {
    restoreFocus?: boolean;
    openFocus?: DropdownOpenFocus;
}

export interface DropdownContext {
    readonly size: DropdownSize;
    readonly open: boolean;
    readonly disabled: boolean;
    readonly triggerId: string;
    readonly menuId: string;
    readonly triggerRef: HTMLElement | null;
    readonly contentRef: HTMLDivElement | null;
    readonly openFocus: DropdownOpenFocus;
    registerTrigger: (el: HTMLElement | null) => () => void;
    registerTriggerId: (id: string | undefined) => () => void;
    registerContent: (el: HTMLDivElement | null) => () => void;
    registerMenuId: (id: string | undefined) => () => void;
    setOpen: (nextOpen: boolean, options?: DropdownOpenOptions) => void;
    syncPopoverOpen: (nextOpen: boolean) => void;
    beginPointerOpen: (clientX: number, clientY: number) => void;
    shouldCommitPointerRelease: (event: PointerEvent) => boolean;
    clearPointerOpen: () => void;
}

export interface DropdownGroupContext {
    registerLabel: (id: string) => () => void;
}

export interface DropdownItemContext {
    registerTextElement: (el: HTMLElement | null) => () => void;
    registerDescriptionElement: (el: HTMLElement | null) => () => void;
}

export interface DropdownRadioGroupContext<T extends string = string> {
    readonly value: T | undefined;
    selectValue: (value: T) => void;
}

export const [getDropdownContext, setDropdownContext, hasDropdownContext] = createContext<DropdownContext>();

export const [getDropdownGroupContext, setDropdownGroupContext, hasDropdownGroupContext] =
    createContext<DropdownGroupContext>();

export const [getDropdownItemContext, setDropdownItemContext, hasDropdownItemContext] =
    createContext<DropdownItemContext>();

const [getRawDropdownRadioGroupContext, setRawDropdownRadioGroupContext, hasDropdownRadioGroupContext] =
    createContext<DropdownRadioGroupContext>();

export function getDropdownRadioGroupContext<T extends string = string>(): DropdownRadioGroupContext<T> {
    return getRawDropdownRadioGroupContext() as unknown as DropdownRadioGroupContext<T>;
}

export function setDropdownRadioGroupContext<T extends string = string>(ctx: DropdownRadioGroupContext<T>): void {
    setRawDropdownRadioGroupContext(ctx as unknown as DropdownRadioGroupContext);
}

export { hasDropdownRadioGroupContext };
