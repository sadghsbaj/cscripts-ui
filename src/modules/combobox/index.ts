import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, HTMLInputAttributes, SVGAttributes } from "svelte/elements";

import type { PopoverPlacement, PopoverProps, PopoverWidth } from "../popover/index.ts";
import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";

export { default as Combobox } from "./Combobox.svelte";
export { default as ComboboxControl } from "./ComboboxControl.svelte";
export { default as ComboboxInput } from "./ComboboxInput.svelte";
export { default as ComboboxIcon } from "./ComboboxIcon.svelte";
export { default as ComboboxClear } from "./ComboboxClear.svelte";
export { default as ComboboxTrigger } from "./ComboboxTrigger.svelte";
export { default as ComboboxContent } from "./ComboboxContent.svelte";
export { default as ComboboxEmpty } from "./ComboboxEmpty.svelte";
export { default as ComboboxGroup } from "./ComboboxGroup.svelte";
export { default as ComboboxGroupLabel } from "./ComboboxGroupLabel.svelte";
export { default as ComboboxItem } from "./ComboboxItem.svelte";
export { default as ComboboxItemIcon } from "./ComboboxItemIcon.svelte";
export { default as ComboboxItemText } from "./ComboboxItemText.svelte";
export { default as ComboboxItemDescription } from "./ComboboxItemDescription.svelte";
export { default as ComboboxSeparator } from "./ComboboxSeparator.svelte";

export const COMBOBOX_VARIANTS = ["soft", "elevated"] as const;
export const COMBOBOX_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type ComboboxVariant = (typeof COMBOBOX_VARIANTS)[number];
export type ComboboxSize = (typeof COMBOBOX_SIZES)[number];

export type ComboboxIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export type ComboboxFilterFn<T extends string = string> = (label: string, query: string, value: T) => boolean;

export interface ComboboxProps<T extends string = string> {
    value?: T;
    onValueChange?: (value: T | undefined) => void;
    inputValue?: string;
    onInputValueChange?: (inputValue: string) => void;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    variant: ComboboxVariant;
    size: ComboboxSize;
    filter?: boolean | ComboboxFilterFn<T>;
    allowCustomValue?: boolean;
    openOnFocus?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    required?: boolean;
    name?: string;
    id?: string;
    children?: Snippet;
}

export interface ComboboxControlProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    children?: Snippet;
}

export interface ComboboxInputProps extends Omit<HTMLInputAttributes, "size" | "children" | "value"> {
    ref?: HTMLInputElement | null;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
}

export interface ComboboxIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ComboboxIconComponentProps>;
    color?: string;
}

export interface ComboboxClearProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    icon?: Component<ComboboxIconComponentProps>;
    disabled?: boolean;
}

export interface ComboboxTriggerProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    disabled?: boolean;
    children?: Snippet;
}

export interface ComboboxContentProps extends Omit<PopoverProps, "id" | "placement" | "width" | "offset"> {
    ref?: HTMLDivElement | null;
    id?: string;
    placement?: PopoverPlacement;
    width?: PopoverWidth;
    offset?: string;
    maxHeight?: string;
    scrollbar?: ScrollAreaScrollbar;
    animate?: boolean;
    children?: Snippet;
}

export interface ComboboxEmptyProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ComboboxGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ComboboxGroupLabelProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface ComboboxItemProps<T extends string = string> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    value: T;
    label?: string;
    keywords?: string[];
    icon?: Component<ComboboxIconComponentProps>;
    disabled?: boolean;
    hideIndicator?: boolean;
    children?: Snippet;
}

export interface ComboboxItemIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ComboboxIconComponentProps>;
    color?: string;
}

export interface ComboboxItemTextProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export interface ComboboxItemDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
    ref?: HTMLParagraphElement | null;
    children?: Snippet;
}

export interface ComboboxSeparatorProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
}
