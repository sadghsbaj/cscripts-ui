import type { Snippet } from "svelte";
import type { ClassValue, HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";
import type { CollapsibleMotion, CollapsibleProps } from "../collapsible/index.ts";

export { default as Accordion } from "./Accordion.svelte";
export { default as AccordionItem } from "./AccordionItem.svelte";
export { default as AccordionHeader } from "./AccordionHeader.svelte";
export { default as AccordionTrigger } from "./AccordionTrigger.svelte";
export { default as AccordionContent } from "./AccordionContent.svelte";

export const ACCORDION_VARIANTS = ["flush", "elevated", "separated"] as const;
export type AccordionVariant = (typeof ACCORDION_VARIANTS)[number];

export const ACCORDION_SIZES = ["sm", "md", "lg"] as const;
export type AccordionSize = (typeof ACCORDION_SIZES)[number];

export const ACCORDION_HEADER_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "div"] as const;
export type AccordionHeaderElement = (typeof ACCORDION_HEADER_ELEMENTS)[number];

export interface AccordionBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    variant: AccordionVariant;
    size: AccordionSize;
    disabled?: boolean;
    keepMounted?: boolean;
    motion?: CollapsibleMotion;
    animate?: boolean;
    loop?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface AccordionSingleProps<T extends string = string> extends AccordionBaseProps {
    multiple?: false;
    value?: T;
    onValueChange?: (value: T | undefined) => void;
    collapsible?: boolean;
}

export interface AccordionMultipleProps<T extends string = string> extends AccordionBaseProps {
    multiple: true;
    value?: T[];
    onValueChange?: (value: T[]) => void;
    collapsible?: never;
}

export type AccordionProps<T extends string = string> =
    | AccordionSingleProps<T>
    | AccordionMultipleProps<T>;

export interface AccordionItemProps<T extends string = string>
    extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    value: T;
    disabled?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface AccordionHeaderProps extends HTMLAttributes<HTMLHeadingElement | HTMLDivElement> {
    ref?: HTMLHeadingElement | HTMLDivElement | null;
    as?: AccordionHeaderElement;
    class?: ClassValue;
    children?: Snippet;
}

export interface AccordionTriggerProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    leading?: Snippet;
    subtitle?: string;
    indicator?: Snippet<[{ open: boolean }]> | false;
    class?: ClassValue;
    children?: Snippet;
}

export interface AccordionContentProps extends Omit<CollapsibleProps, "open"> {
    ref?: HTMLDivElement | null;
    padded?: boolean;
    region?: boolean;
    class?: ClassValue;
    children?: Snippet;
}
