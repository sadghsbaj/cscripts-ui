import { createContext } from "svelte";
import type { CollapsibleMotion } from "../collapsible/index.ts";

export interface AccordionContext {
    readonly disabled: boolean;
    readonly keepMounted: boolean;
    readonly motion: CollapsibleMotion;
    readonly animate: boolean;
    isOpen(itemValue: string): boolean;
    toggle(itemValue: string): void;
    registerTrigger(element: HTMLButtonElement): () => void;
    navigateTrigger(current: HTMLButtonElement, key: string): boolean;
}

export interface AccordionItemContext {
    readonly value: string;
    readonly open: boolean;
    readonly disabled: boolean;
    readonly instant: boolean;
    readonly triggerId: string;
    readonly contentId: string;
    toggle(): void;
}

export const [getAccordionContext, setAccordionContext, hasAccordionContext] =
    createContext<AccordionContext>();

export const [getAccordionItemContext, setAccordionItemContext, hasAccordionItemContext] =
    createContext<AccordionItemContext>();
