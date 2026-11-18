import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, SVGAttributes } from "svelte/elements";

import type { PopoverPlacement, PopoverProps, PopoverWidth } from "../popover/index.ts";
import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";

export { default as Select } from "./Select.svelte";
export { default as SelectTrigger } from "./SelectTrigger.svelte";
export { default as SelectValue } from "./SelectValue.svelte";
export { default as SelectContent } from "./SelectContent.svelte";
export { default as SelectGroup } from "./SelectGroup.svelte";
export { default as SelectGroupLabel } from "./SelectGroupLabel.svelte";
export { default as SelectItem } from "./SelectItem.svelte";
export { default as SelectItemIcon } from "./SelectItemIcon.svelte";
export { default as SelectItemText } from "./SelectItemText.svelte";
export { default as SelectItemDescription } from "./SelectItemDescription.svelte";
export { default as SelectSeparator } from "./SelectSeparator.svelte";

export const SELECT_VARIANTS = ["soft", "elevated"] as const;
export const SELECT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type SelectVariant = (typeof SELECT_VARIANTS)[number];
export type SelectSize = (typeof SELECT_SIZES)[number];

export type SelectIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface SelectSelectedItem<T extends string = string> {
    value: T;
    label: string;
    icon?: Component<SelectIconComponentProps>;
    iconColor?: string;
}

export interface SelectProps<T extends string = string> {
    /** Two-way bindable selected value. Use `bind:value` or `bind:value={get, set}`. */
    value?: T;
    /** Fires when the user selects a new value. */
    onValueChange?: (value: T) => void;

    /** Two-way bindable popover open state. Use `bind:open` or `bind:open={get, set}`. */
    open?: boolean;
    /** Fires whenever the open state changes. */
    onOpenChange?: (open: boolean) => void;

    /** Surface treatment matching TextInput ("soft" | "elevated"). Required. */
    variant: SelectVariant;
    /** T-shirt scale matching TextInput and Button ("xs".."xl"). Required. */
    size: SelectSize;

    /** Disables trigger interaction and option selection. */
    disabled?: boolean;
    /** Applies validation error ring and aria-invalid="true" on SelectTrigger. */
    invalid?: boolean;
    /** Marks the control as required (aria-required="true" on trigger). */
    required?: boolean;
    /** Form field name; renders a hidden <input> when provided. */
    name?: string;

    /** Optional explicit ID base for trigger/listbox ARIA wiring (falls back to $props.id()). */
    id?: string;
    children?: Snippet;
}

export interface SelectTriggerProps extends Omit<HTMLButtonAttributes, "type" | "value"> {
    ref?: HTMLButtonElement | null;
    /** Overrides Select-level disabled state for the trigger. */
    disabled?: boolean;
    /** Overrides Select-level invalid state for the trigger. */
    invalid?: boolean;
    /** Hides the built-in trailing chevron indicator when rendering custom trigger chrome. @default false */
    hideIndicator?: boolean;
    children?: Snippet;
}

export interface SelectValueProps<T extends string = string> extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
    ref?: HTMLSpanElement | null;
    /** Placeholder text rendered when no value is selected. Defaults to localized "Select…". */
    placeholder?: string;
    /** Whether to mirror the selected item's icon (when present) into the trigger. @default true */
    showIcon?: boolean;
    /** Optional custom render snippet receiving the resolved selected item metadata (or undefined). */
    children?: Snippet<[SelectSelectedItem<T> | undefined]>;
}

export interface SelectContentProps extends Omit<PopoverProps, "id" | "placement" | "width" | "offset"> {
    ref?: HTMLDivElement | null;
    /** Optional ID override for the floating listbox popover. */
    id?: string;
    /** Anchor placement relative to SelectTrigger. @default "bottom-start" */
    placement?: PopoverPlacement;
    /** Width strategy relative to SelectTrigger. @default "min-anchor" */
    width?: PopoverWidth;
    /** Distance from SelectTrigger (matches Popover default and clears :focus-visible outlines). @default "8px" */
    offset?: string;
    /** Maximum block size before internal ScrollArea activates. @default "min(320px, 60dvh)" */
    maxHeight?: string;
    /** ScrollArea scrollbar visibility mode. @default "hover" */
    scrollbar?: ScrollAreaScrollbar;
    children?: Snippet;
}

export interface SelectGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface SelectGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface SelectItemProps<T extends string = string> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** Unique option value emitted on selection. */
    value: T;
    /**
     * Explicit canonical label used by SelectValue and typeahead search.
     * Recommended for SSR-critical forms and complex items; falls back to SelectItemText / textContent.
     */
    label?: string;
    /** Shorthand leading icon component (alternative to <SelectItemIcon>). */
    icon?: Component<SelectIconComponentProps>;
    /** Prevents focus, hover highlight, and selection of this option. */
    disabled?: boolean;
    /** Hides the built-in selection checkmark indicator. @default false */
    hideIndicator?: boolean;
    children?: Snippet;
}

export interface SelectItemIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<SelectIconComponentProps>;
    color?: string;
}

export interface SelectItemTextProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface SelectItemDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    ref?: HTMLParagraphElement | null;
    children?: Snippet;
}

export interface SelectSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
}
