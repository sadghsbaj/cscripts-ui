import { createContext } from "svelte";

import type {
    CommandPaletteCloseReason,
    CommandPaletteContext,
    CommandPaletteFilterCandidate,
    CommandPaletteFilterFn,
    CommandPalettePlugin,
    CommandPalettePushPageOptions,
    CommandPaletteSize,
} from "./index.ts";

export interface CommandPaletteRegisteredItem {
    value: string;
    label: string;
    keywords?: readonly string[];
    groupLabel?: string;
    disabled: boolean;
    visible: boolean;
    id: string;
    element: HTMLElement | null;
    select: (event: MouseEvent | KeyboardEvent) => void;
}

export interface CommandPaletteRegisteredPage {
    value: string;
    label?: string;
    filter?: boolean | CommandPaletteFilterFn;
    inList: boolean;
}

export interface CommandPaletteInternalContext extends CommandPaletteContext {
    readonly size: CommandPaletteSize;
    readonly listboxId: string;
    readonly inputId: string;
    readonly isKeyboardNav: boolean;
    readonly hasListMounted: boolean;
    readonly hasExternalActivePage: boolean;
    readonly highlightedItemId: string | undefined;
    readonly visibleItemCount: number;
    readonly visibleWidgetCount: number;
    readonly popPageOnBackspace: boolean;
    readonly activePrefixPlugin: CommandPalettePlugin | undefined;
    readonly activeScopeLabel: string | undefined;
    readonly effectiveQuery: string;
    readonly allPlugins: readonly CommandPalettePlugin[];
    readonly hasManualScope: boolean;
    readonly pageMutationVersion: number;
    readonly publicContext: CommandPaletteContext;
    registerInput: (el: HTMLInputElement | null) => () => void;
    registerInputId: (id: string | undefined) => () => void;
    registerList: (el: HTMLElement | null, id: string | undefined) => () => void;
    registerItem: (meta: CommandPaletteRegisteredItem) => () => void;
    registerWidget: (id: string) => () => void;
    registerPage: (meta: CommandPaletteRegisteredPage) => () => void;
    registerManualScope: (id: string) => () => void;
    isItemVisible: (
        candidate: CommandPaletteFilterCandidate,
        pageValue: string | undefined,
        overrideFilter?: boolean | CommandPaletteFilterFn,
        isPrefixPluginItem?: boolean
    ) => boolean;
    isHighlighted: (itemValue: string) => boolean;
    setHighlightedValue: (nextValue: string | undefined, options?: { keyboard?: boolean }) => void;
    setKeyboardNav: (keyboard: boolean) => void;
    moveHighlight: (direction: 1 | -1) => void;
    highlightEdge: (edge: "first" | "last") => void;
    activateHighlighted: (event: KeyboardEvent) => boolean;
    clearInput: () => void;
    clearScope: () => void;
    focusInput: () => void;
    requestClose: (reason?: CommandPaletteCloseReason) => Promise<boolean>;
    pushPage: (pageId: string, options?: CommandPalettePushPageOptions) => void;
    popPage: () => void;
    resetPages: () => void;
}

export interface CommandPaletteGroupContext {
    readonly label: string | undefined;
    registerLabel: (id: string, text: string | undefined) => () => void;
}

export interface CommandPaletteItemContext {
    registerTextElement: (el: HTMLElement | null) => () => void;
    registerDescriptionElement: (el: HTMLElement | null) => () => void;
}

export interface CommandPalettePageContext {
    readonly value: string | undefined;
    readonly filter: boolean | CommandPaletteFilterFn | undefined;
    readonly isPrefixPlugin?: boolean;
}

export interface CommandPaletteListContext {
    readonly isInsideList: boolean;
}

export const [getInternalCommandPaletteContext, setInternalCommandPaletteContext] =
    createContext<CommandPaletteInternalContext>();

export const [getCommandPaletteGroupContext, setCommandPaletteGroupContext, hasCommandPaletteGroupContext] =
    createContext<CommandPaletteGroupContext>();

export const [getCommandPaletteItemContext, setCommandPaletteItemContext, hasCommandPaletteItemContext] =
    createContext<CommandPaletteItemContext>();

export const [getCommandPalettePageContext, setCommandPalettePageContext, hasCommandPalettePageContext] =
    createContext<CommandPalettePageContext>();

export const [getCommandPaletteListContext, setCommandPaletteListContext, hasCommandPaletteListContext] =
    createContext<CommandPaletteListContext>();
