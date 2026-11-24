import type { Component, Snippet } from "svelte";
import type {
    HTMLAnchorAttributes,
    HTMLAttributes,
    HTMLButtonAttributes,
    HTMLInputAttributes,
    SVGAttributes,
} from "svelte/elements";

import type { FocusTrapTarget } from "../focus/index.ts";
import type { OverlayVariant } from "../overlay/index.ts";
import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";

export { default as CommandPalette } from "./CommandPalette.svelte";
export { default as CommandPaletteBar } from "./CommandPaletteBar.svelte";
export { default as CommandPaletteIcon } from "./CommandPaletteIcon.svelte";
export { default as CommandPaletteScope } from "./CommandPaletteScope.svelte";
export { default as CommandPaletteInput } from "./CommandPaletteInput.svelte";
export { default as CommandPaletteClear } from "./CommandPaletteClear.svelte";
export { default as CommandPaletteBody } from "./CommandPaletteBody.svelte";
export { default as CommandPaletteList } from "./CommandPaletteList.svelte";
export { default as CommandPalettePreview } from "./CommandPalettePreview.svelte";
export { default as CommandPalettePage } from "./CommandPalettePage.svelte";
export { default as CommandPaletteWidget } from "./CommandPaletteWidget.svelte";
export { default as CommandPaletteFooter } from "./CommandPaletteFooter.svelte";
export { default as CommandPaletteEmpty } from "./CommandPaletteEmpty.svelte";
export { default as CommandPaletteGroup } from "./CommandPaletteGroup.svelte";
export { default as CommandPaletteGroupLabel } from "./CommandPaletteGroupLabel.svelte";
export { default as CommandPaletteSeparator } from "./CommandPaletteSeparator.svelte";
export { default as CommandPaletteItem } from "./CommandPaletteItem.svelte";
export { default as CommandPaletteItemIcon } from "./CommandPaletteItemIcon.svelte";
export { default as CommandPaletteItemText } from "./CommandPaletteItemText.svelte";
export { default as CommandPaletteItemDescription } from "./CommandPaletteItemDescription.svelte";
export { default as CommandPaletteItemShortcut } from "./CommandPaletteItemShortcut.svelte";

export { commandPaletteShortcut } from "./command-palette-shortcut.attach.ts";
export { createCommandPaletteRegistry } from "./command-palette-registry.svelte.ts";
export { scoreCommandPaletteMatch } from "./command-palette-score.ts";
export { getCommandPaletteContext, hasCommandPaletteContext } from "./command-palette.context.ts";

export const COMMAND_PALETTE_SIZES = ["sm", "md", "lg"] as const;
export const COMMAND_PALETTE_CLOSE_REASONS = [
    "escape",
    "outside-click",
    "close-button",
    "select",
    "shortcut",
    "programmatic",
] as const;

export type CommandPaletteSize = (typeof COMMAND_PALETTE_SIZES)[number];
export type CommandPaletteCloseReason = (typeof COMMAND_PALETTE_CLOSE_REASONS)[number];

export type CommandPaletteIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface CommandPaletteFilterCandidate {
    value: string;
    label: string;
    keywords?: readonly string[];
    groupLabel?: string;
}

export type CommandPaletteFilterFn = (candidate: CommandPaletteFilterCandidate, query: string) => boolean;

export interface CommandPaletteShortcutConfig {
    key?: string;
    mod?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    ignoreInputs?: boolean;
}

export interface CommandPaletteShortcutOptions extends CommandPaletteShortcutConfig {
    enabled?: boolean | (() => boolean);
    onTrigger?: (event: KeyboardEvent) => void;
}

export interface CommandPalettePageEntry {
    value: string;
    label?: string;
}

export interface CommandPalettePushPageOptions {
    label?: string;
    inputValue?: string;
}

export interface CommandPaletteQueryContext {
    query: string;
    rawQuery: string;
    activePage: string | undefined;
    pages: readonly string[];
    prefix: string | undefined;
}

export interface CommandPalettePluginRenderContext extends CommandPaletteQueryContext {
    palette: CommandPaletteContext;
}

export interface CommandPaletteCommand {
    value: string;
    label: string;
    description?: string;
    keywords?: readonly string[];
    group?: string;
    icon?: Component<CommandPaletteIconComponentProps>;
    shortcut?: readonly string[] | string;
    href?: string;
    target?: string;
    rel?: string;
    negative?: boolean;
    disabled?: boolean;
    closeOnSelect?: boolean;
    onSelect?: (event: MouseEvent | KeyboardEvent) => void;
}

export interface CommandPalettePlugin {
    id: string;
    label?: string;
    prefix?: string;
    page?: string;
    priority?: number;
    filter?: boolean;
    items?: readonly CommandPaletteCommand[] | ((ctx: CommandPaletteQueryContext) => readonly CommandPaletteCommand[]);
    widget?: Snippet<[CommandPalettePluginRenderContext]>;
    pageView?: Snippet<[CommandPalettePluginRenderContext]>;
    onOpen?: (palette: CommandPaletteContext) => void | (() => void);
}

export interface CommandPaletteRegisterCommandsOptions {
    group?: string;
    page?: string;
    priority?: number;
}

export interface CommandPaletteRegistry {
    readonly plugins: ReadonlyMap<string, CommandPalettePlugin>;
    register: (plugin: CommandPalettePlugin) => () => void;
    registerCommands: (
        commands: readonly CommandPaletteCommand[],
        options?: CommandPaletteRegisterCommandsOptions
    ) => () => void;
    unregister: (pluginId: string) => void;
}

export interface CommandPaletteContext {
    readonly open: boolean;
    readonly size: CommandPaletteSize;
    readonly inputValue: string;
    readonly highlightedValue: string | undefined;
    readonly pages: readonly string[];
    readonly activePage: string | undefined;
    readonly activePrefix: string | undefined;
    readonly visibleItemCount: number;
    readonly visibleWidgetCount: number;
    setInputValue: (nextValue: string) => void;
    setHighlightedValue: (nextValue: string | undefined) => void;
    pushPage: (pageId: string, options?: CommandPalettePushPageOptions) => void;
    popPage: () => void;
    resetPages: () => void;
    focusInput: () => void;
    close: (reason?: CommandPaletteCloseReason) => void;
}

export interface CommandPaletteProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    ref?: HTMLDivElement | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    size: CommandPaletteSize;
    inputValue?: string;
    onInputValueChange?: (inputValue: string) => void;
    highlightedValue?: string | undefined;
    onHighlightedValueChange?: (value: string | undefined) => void;
    pages?: string[];
    onPagesChange?: (pages: string[]) => void;
    filter?: boolean | CommandPaletteFilterFn;
    loop?: boolean;
    resetOnClose?: boolean;
    popPageOnEscape?: boolean;
    popPageOnBackspace?: boolean;
    shortcut?: boolean | CommandPaletteShortcutConfig;
    registry?: CommandPaletteRegistry;
    plugins?: readonly CommandPalettePlugin[];
    overlayVariant?: OverlayVariant;
    lockScroll?: boolean;
    dismissible?: boolean;
    closeOnEscape?: boolean;
    focusTrap?: boolean;
    initialFocus?: FocusTrapTarget | false;
    restoreFocus?: boolean | HTMLElement | (() => HTMLElement | null);
    onBeforeClose?: (reason: CommandPaletteCloseReason) => boolean | void | Promise<boolean | void>;
    onClose?: (reason: CommandPaletteCloseReason) => void;
    id?: string;
    children?: Snippet;
}

export interface CommandPaletteBarProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    showScope?: boolean;
    children?: Snippet;
}

export interface CommandPaletteIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon?: Component<CommandPaletteIconComponentProps>;
    color?: string;
}

export interface CommandPaletteScopeProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    label?: string;
    children?: Snippet;
}

export interface CommandPaletteInputProps extends Omit<HTMLInputAttributes, "size" | "children" | "value"> {
    ref?: HTMLInputElement | null;
    disabled?: boolean;
}

export interface CommandPaletteClearProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    icon?: Component<CommandPaletteIconComponentProps>;
    disabled?: boolean;
}

export interface CommandPaletteBodyProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPaletteListProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    maxHeight?: string;
    scrollbar?: ScrollAreaScrollbar;
    children?: Snippet;
}

export interface CommandPalettePreviewProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPalettePageProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    value: string;
    label?: string;
    filter?: boolean | CommandPaletteFilterFn;
    children?: Snippet;
}

export interface CommandPaletteWidgetProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPaletteFooterProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPaletteEmptyProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPaletteGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPaletteGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface CommandPaletteSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
}

export interface CommandPaletteItemProps
    extends
        Omit<HTMLAttributes<HTMLElement>, "children">,
        Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy"> {
    ref?: HTMLElement | null;
    value?: string;
    label?: string;
    keywords?: readonly string[];
    icon?: Component<CommandPaletteIconComponentProps>;
    negative?: boolean;
    disabled?: boolean;
    closeOnSelect?: boolean;
    onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    children?: Snippet;
}

export interface CommandPaletteItemIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<CommandPaletteIconComponentProps>;
    color?: string;
}

export interface CommandPaletteItemTextProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface CommandPaletteItemDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    ref?: HTMLParagraphElement | null;
    children?: Snippet;
}

export interface CommandPaletteItemShortcutProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}
