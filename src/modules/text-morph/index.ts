import type { HTMLAttributes } from "svelte/elements";
import type { SpringParams } from "torph";

export { default as TextMorph } from "./TextMorph.svelte";

export const CS_TEXT_MORPH_DUR = 380;
export const CS_TEXT_MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export type TextMorphValue = string | number;
export type TextMorphSpringParams = SpringParams;
export type TextMorphEase = string | TextMorphSpringParams;

export type TextMorphProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
    ref?: HTMLElement | null;
    as?: keyof HTMLElementTagNameMap;
    text: TextMorphValue;
    locales?: Intl.LocalesArgument;
    decimals?: number;
    cursorIndex?: number;
    numbers?: boolean;
    scale?: boolean;
    tabular?: boolean;
    animated?: boolean;
    respectMotionPreference?: boolean;
    duration?: number;
    ease?: TextMorphEase;
    debug?: boolean;
    onanimationsstart?: () => void;
    onanimationsfinish?: () => void;
    onanimationscancel?: () => void;
};
