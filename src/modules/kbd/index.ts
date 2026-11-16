import type { Component, Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";
import type { KbdIconComponentProps, KbdKey } from "./keys.ts";

export { default as Kbd } from "./Kbd.svelte";
export { default as KbdGroup } from "./KbdGroup.svelte";
export { default as KbdSeparator } from "./KbdSeparator.svelte";
export { default as KbdSymbol } from "./KbdSymbol.svelte";
export { KBD_KEYS, type KbdIconComponentProps, type KbdKey, type KbdKeyDefinition } from "./keys.ts";

export const KBD_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const KBD_VARIANTS = ["soft", "ghost", "keycap"] as const;
export const KBD_SYMBOL_DISPLAYS = ["auto", "icon", "text", "both"] as const;

export type KbdSize = (typeof KBD_SIZES)[number];
export type KbdVariant = (typeof KBD_VARIANTS)[number];
export type KbdSymbolDisplay = (typeof KBD_SYMBOL_DISPLAYS)[number];

export type KbdProps = HTMLAttributes<HTMLElement> & {
    ref?: HTMLElement | null;
    /** Required when used standalone; inherited from `<KbdGroup>` when nested. */
    variant?: KbdVariant;
    /** Required when used standalone; inherited from `<KbdGroup>` when nested. */
    size?: KbdSize;
    symbol?: KbdKey;
    display?: KbdSymbolDisplay;
    children?: Snippet;
};

export type KbdGroupProps = HTMLAttributes<HTMLSpanElement> & {
    ref?: HTMLSpanElement | null;
    variant: KbdVariant;
    size: KbdSize;
};

export type KbdSeparatorProps = HTMLAttributes<HTMLSpanElement> & {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
};

export type KbdSymbolProps =
    | {
          symbol: KbdKey;
          display?: KbdSymbolDisplay;
          icon?: never;
          label?: never;
      }
    | {
          icon: Component<KbdIconComponentProps>;
          label?: string;
          symbol?: never;
          display?: never;
      };
