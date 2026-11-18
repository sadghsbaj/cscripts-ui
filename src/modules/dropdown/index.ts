import type { Component, Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { PopoverPlacement, PopoverProps, PopoverWidth } from "../popover/index.ts";
import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";

export { dropdownTrigger } from "./dropdown.attach.ts";
export { default as Dropdown } from "./Dropdown.svelte";
export { default as DropdownContent } from "./DropdownContent.svelte";
export { default as DropdownHeader } from "./DropdownHeader.svelte";
export { default as DropdownFooter } from "./DropdownFooter.svelte";
export { default as DropdownGroup } from "./DropdownGroup.svelte";
export { default as DropdownGroupLabel } from "./DropdownGroupLabel.svelte";
export { default as DropdownItem } from "./DropdownItem.svelte";
export { default as DropdownCheckboxItem } from "./DropdownCheckboxItem.svelte";
export { default as DropdownRadioGroup } from "./DropdownRadioGroup.svelte";
export { default as DropdownRadioItem } from "./DropdownRadioItem.svelte";
export { default as DropdownItemIcon } from "./DropdownItemIcon.svelte";
export { default as DropdownItemText } from "./DropdownItemText.svelte";
export { default as DropdownItemDescription } from "./DropdownItemDescription.svelte";
export { default as DropdownItemShortcut } from "./DropdownItemShortcut.svelte";
export { default as DropdownSeparator } from "./DropdownSeparator.svelte";

export const DROPDOWN_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type DropdownSize = (typeof DROPDOWN_SIZES)[number];
export type DropdownTriggerOn = "pointerdown" | "click";

export interface DropdownTriggerOptions {
    /**
     * Interaction event used to open/toggle the menu:
     * - `"pointerdown"`: Opens immediately on mouse down with press-drag-release support (touch/keyboard activate on click).
     * - `"click"`: Standard activation on pointerup / click release.
     * @default "pointerdown"
     */
    triggerOn?: DropdownTriggerOn;
    /**
     * Whether the trigger attachment is active.
     * @default true
     */
    enabled?: boolean | (() => boolean);
}

export type DropdownIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface DropdownProps {
    /** Two-way bindable popover open state. Use `bind:open` or `bind:open={get, set}`. */
    open?: boolean;
    /** Fires whenever the open state changes. */
    onOpenChange?: (open: boolean) => void;
    /** T-shirt scale matching Select, Combobox, and Button ("xs".."xl"). Required. */
    size: DropdownSize;
    /** Disables trigger opening and all items. @default false */
    disabled?: boolean;
    /** Optional explicit ID base for trigger/menu ARIA wiring (falls back to $props.id()). */
    id?: string;
    children?: Snippet;
}

export interface DropdownContentProps extends Omit<PopoverProps, "id" | "placement" | "width" | "offset"> {
    ref?: HTMLDivElement | null;
    /** Optional ID override for the floating menu popover. */
    id?: string;
    /** Anchor placement relative to the trigger. @default "bottom-start" */
    placement?: PopoverPlacement;
    /** Width strategy relative to the trigger. @default "content" */
    width?: PopoverWidth;
    /** Distance from the trigger. @default "8px" */
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

export interface DropdownHeaderProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface DropdownFooterProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface DropdownGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface DropdownGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface DropdownItemProps
    extends
        Omit<HTMLAttributes<HTMLElement>, "children">,
        Pick<HTMLAnchorAttributes, "href" | "target" | "rel" | "download" | "hreflang" | "referrerpolicy"> {
    ref?: HTMLElement | null;
    /** Shorthand leading icon component (alternative to <DropdownItemIcon>). */
    icon?: Component<DropdownIconComponentProps>;
    /** Explicit typeahead label override (falls back to DropdownItemText / textContent). */
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

export interface DropdownCheckboxItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** Two-way bindable checked state. */
    checked?: boolean;
    /** Fires when the checked state toggles. */
    onCheckedChange?: (checked: boolean) => void;
    /** Sets `aria-checked="mixed"` when true. @default false */
    indeterminate?: boolean;
    /** Shorthand icon component inside the item content. */
    icon?: Component<DropdownIconComponentProps>;
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

export interface DropdownRadioGroupProps<T extends string = string> extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    /** Two-way bindable selected radio value. */
    value?: T;
    /** Fires when the selected radio value changes. */
    onValueChange?: (value: T) => void;
    children?: Snippet;
}

export interface DropdownRadioItemProps<T extends string = string> extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> {
    ref?: HTMLDivElement | null;
    /** Radio option value emitted when selected. */
    value: T;
    /** Shorthand icon component inside the item content. */
    icon?: Component<DropdownIconComponentProps>;
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

export interface DropdownItemIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<DropdownIconComponentProps>;
    color?: string;
}

export interface DropdownItemTextProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface DropdownItemDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    ref?: HTMLParagraphElement | null;
    children?: Snippet;
}

export interface DropdownItemShortcutProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface DropdownSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
}
