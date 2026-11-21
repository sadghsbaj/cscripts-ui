import type { Component, Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { PopoverPlacement, PopoverProps } from "../popover/index.ts";
import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";

export { contextMenuTrigger } from "./context-menu.attach.ts";
export { default as ContextMenu } from "./ContextMenu.svelte";
export { default as ContextMenuContent } from "./ContextMenuContent.svelte";
export { default as ContextMenuHeader } from "./ContextMenuHeader.svelte";
export { default as ContextMenuFooter } from "./ContextMenuFooter.svelte";
export { default as ContextMenuGroup } from "./ContextMenuGroup.svelte";
export { default as ContextMenuGroupLabel } from "./ContextMenuGroupLabel.svelte";
export { default as ContextMenuItem } from "./ContextMenuItem.svelte";
export { default as ContextMenuCheckboxItem } from "./ContextMenuCheckboxItem.svelte";
export { default as ContextMenuRadioGroup } from "./ContextMenuRadioGroup.svelte";
export { default as ContextMenuRadioItem } from "./ContextMenuRadioItem.svelte";
export { default as ContextMenuItemIcon } from "./ContextMenuItemIcon.svelte";
export { default as ContextMenuItemText } from "./ContextMenuItemText.svelte";
export { default as ContextMenuItemDescription } from "./ContextMenuItemDescription.svelte";
export { default as ContextMenuItemShortcut } from "./ContextMenuItemShortcut.svelte";
export { default as ContextMenuSeparator } from "./ContextMenuSeparator.svelte";

export const CONTEXT_MENU_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type ContextMenuSize = (typeof CONTEXT_MENU_SIZES)[number];

export interface ContextMenuTriggerOptions {
    /**
     * Whether the trigger attachment intercepts `contextmenu` and `Shift+F10` / `ContextMenu`.
     * @default true
     */
    enabled?: boolean | (() => boolean);
    /**
     * Optional callback invoked when this trigger opens the menu.
     */
    onOpen?: (event: MouseEvent | KeyboardEvent) => void;
}

export type ContextMenuIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface ContextMenuProps {
    /** Two-way bindable popover open state. Use `bind:open` or `bind:open={get, set}`. */
    open?: boolean;
    /** Fires whenever the open state changes. */
    onOpenChange?: (open: boolean) => void;
    /** T-shirt scale matching Dropdown, Select, Combobox, and Button ("xs".."xl"). Required. */
    size: ContextMenuSize;
    /** Disables trigger interception and all items. @default false */
    disabled?: boolean;
    /** Optional explicit ID base for virtual anchor / menu ARIA wiring (falls back to $props.id()). */
    id?: string;
    children?: Snippet;
}

export interface ContextMenuContentProps extends Omit<PopoverProps, "id" | "placement" | "width" | "offset"> {
    ref?: HTMLDivElement | null;
    /** Optional ID override for the floating menu popover. */
    id?: string;
    /** Anchor placement relative to the virtual cursor point. @default "bottom-start" */
    placement?: PopoverPlacement;
    /** Distance from the virtual cursor point. @default "2px" */
    offset?: string;
    /** Maximum block size before internal ScrollArea activates. @default "min(320px, 60dvh)" */
    maxHeight?: string;
    /** ScrollArea scrollbar visibility mode. @default "hover" */
    scrollbar?: ScrollAreaScrollbar;
    /** Optional pinned header rendered above ScrollArea. */
    header?: Snippet;
    /** Optional pinned footer rendered below ScrollArea. */
    footer?: Snippet;
    children?: Snippet;
}

export interface ContextMenuHeaderProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ContextMenuFooterProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ContextMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ContextMenuGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ContextMenuItemProps
    extends
        Omit<HTMLAttributes<HTMLElement>, "children">,
        Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy"> {
    ref?: HTMLElement | null;
    /** Shorthand leading icon component (alternative to <ContextMenuItemIcon>). */
    icon?: Component<ContextMenuIconComponentProps>;
    /** Explicit typeahead label override (falls back to ContextMenuItemText / textContent). */
    label?: string;
    /** Marks the item as a destructive/negative action. @default false */
    negative?: boolean;
    /** Prevents focus, hover highlight, and activation of this item. @default false */
    disabled?: boolean;
    /** Closes the menu after `onSelect` unless `false` or `event.preventDefault()` is called. @default true */
    closeOnSelect?: boolean;
    /** Fires when the item is activated via click, drag-release, Enter, or Space. */
    onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    children?: Snippet;
}

export interface ContextMenuCheckboxItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** Two-way bindable checked state. */
    checked?: boolean;
    /** Fires when the checked state toggles. */
    onCheckedChange?: (checked: boolean) => void;
    /** Sets `aria-checked="mixed"` when true. @default false */
    indeterminate?: boolean;
    /** Shorthand icon component inside the item content. */
    icon?: Component<ContextMenuIconComponentProps>;
    /** Explicit typeahead label override. */
    label?: string;
    /** Prevents focus, hover highlight, and toggling. @default false */
    disabled?: boolean;
    /** Closes the menu after toggling. @default false */
    closeOnSelect?: boolean;
    /** Fires when the item is activated before toggling. */
    onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    children?: Snippet;
}

export interface ContextMenuRadioGroupProps<T extends string = string> extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    /** Two-way bindable selected radio value. */
    value?: T;
    /** Fires when the selected radio value changes. */
    onValueChange?: (value: T) => void;
    children?: Snippet;
}

export interface ContextMenuRadioItemProps<T extends string = string> extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> {
    ref?: HTMLDivElement | null;
    /** Radio option value emitted when selected. */
    value: T;
    /** Shorthand icon component inside the item content. */
    icon?: Component<ContextMenuIconComponentProps>;
    /** Explicit typeahead label override. */
    label?: string;
    /** Prevents focus, hover highlight, and selection. @default false */
    disabled?: boolean;
    /** Closes the menu after selection. @default false */
    closeOnSelect?: boolean;
    /** Fires when the item is activated before selecting. */
    onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    children?: Snippet;
}

export interface ContextMenuItemIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ContextMenuIconComponentProps>;
    color?: string;
}

export interface ContextMenuItemTextProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface ContextMenuItemDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    ref?: HTMLParagraphElement | null;
    children?: Snippet;
}

export interface ContextMenuItemShortcutProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface ContextMenuSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
}
