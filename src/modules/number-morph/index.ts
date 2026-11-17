import type { Format, Trend, Value } from "@number-flow/svelte";
import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

export { default as NumberMorph } from "./NumberMorph.svelte";
export { default as NumberMorphGroup } from "./NumberMorphGroup.svelte";

export type NumberMorphValue = Value;
export type NumberMorphFormat = Format;
export type NumberMorphTrend = Trend;
export type NumberMorphDigits = Record<number, { max?: number }>;

export const CS_NUMBER_MORPH_TRANSFORM_TIMING: EffectTiming = {
    duration: 380,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export const CS_NUMBER_MORPH_SPIN_TIMING: EffectTiming = {
    duration: 380,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export const CS_NUMBER_MORPH_OPACITY_TIMING: EffectTiming = {
    duration: 160,
    easing: "cubic-bezier(0.5, 1, 0.89, 1)",
};

export type NumberMorphProps = Omit<HTMLAttributes<HTMLSpanElement>, "children" | "prefix"> & {
    ref?: HTMLSpanElement | null;
    value: NumberMorphValue;
    locales?: Intl.LocalesArgument;
    format?: NumberMorphFormat;
    prefix?: string;
    suffix?: string;
    trend?: NumberMorphTrend;
    animated?: boolean;
    digits?: NumberMorphDigits;
    continuous?: boolean;
    willChange?: boolean;
    respectMotionPreference?: boolean;
    transformTiming?: EffectTiming;
    spinTiming?: EffectTiming;
    opacityTiming?: EffectTiming;
    onanimationsstart?: () => void;
    onanimationsfinish?: () => void;
};

export type NumberMorphGroupProps = HTMLAttributes<HTMLSpanElement> & {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
};
