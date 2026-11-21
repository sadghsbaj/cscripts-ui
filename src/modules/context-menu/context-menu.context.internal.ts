import { createContext } from "svelte";

import type { ContextMenuSize } from "./index.ts";

export type ContextMenuOpenOrigin = "pointer" | "keyboard";

export interface ContextMenuOpenOptions {
    restoreFocus?: boolean;
}

export interface ContextMenuContext {
    readonly size: ContextMenuSize;
    readonly open: boolean;
    readonly disabled: boolean;
    readonly menuId: string;
    readonly activeTriggerRef: HTMLElement | null;
    readonly contentRef: HTMLDivElement | null;
    readonly anchorX: number;
    readonly anchorY: number;
    readonly openOrigin: ContextMenuOpenOrigin;
    readonly openSequence: number;
    readonly isInstantReposition: boolean;
    registerContent: (el: HTMLDivElement | null) => () => void;
    registerMenuId: (id: string | undefined) => () => void;
    unregisterTrigger: (el: HTMLElement) => void;
    openAt: (
        trigger: HTMLElement,
        clientX: number,
        clientY: number,
        origin: ContextMenuOpenOrigin,
        event: MouseEvent | KeyboardEvent,
        onOpen?: (event: MouseEvent | KeyboardEvent) => void
    ) => void;
    setOpen: (nextOpen: boolean, options?: ContextMenuOpenOptions) => void;
    syncPopoverOpen: (nextOpen: boolean) => void;
    restoreFocus: () => void;
    shouldCommitPointerRelease: (event: PointerEvent) => boolean;
    clearPointerOpen: () => void;
}

export interface ContextMenuGroupContext {
    registerLabel: (id: string) => () => void;
}

export interface ContextMenuItemContext {
    registerTextElement: (el: HTMLElement | null) => () => void;
    registerDescriptionElement: (el: HTMLElement | null) => () => void;
}

export interface ContextMenuRadioGroupContext<T extends string = string> {
    readonly value: T | undefined;
    selectValue: (value: T) => void;
}

export const [getContextMenuContext, setContextMenuContext, hasContextMenuContext] =
    createContext<ContextMenuContext>();

export const [getContextMenuGroupContext, setContextMenuGroupContext, hasContextMenuGroupContext] =
    createContext<ContextMenuGroupContext>();

export const [getContextMenuItemContext, setContextMenuItemContext, hasContextMenuItemContext] =
    createContext<ContextMenuItemContext>();

const [getRawContextMenuRadioGroupContext, setRawContextMenuRadioGroupContext, hasContextMenuRadioGroupContext] =
    createContext<ContextMenuRadioGroupContext>();

export function getContextMenuRadioGroupContext<T extends string = string>(): ContextMenuRadioGroupContext<T> {
    return getRawContextMenuRadioGroupContext() as unknown as ContextMenuRadioGroupContext<T>;
}

export function setContextMenuRadioGroupContext<T extends string = string>(
    ctx: ContextMenuRadioGroupContext<T>
): void {
    setRawContextMenuRadioGroupContext(ctx as unknown as ContextMenuRadioGroupContext);
}

export { hasContextMenuRadioGroupContext };
