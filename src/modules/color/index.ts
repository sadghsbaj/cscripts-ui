import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

import type { ColorSwatchGroupOrientation } from "./color.context.ts";
import type { ColorChannel } from "./color.utils.ts";

export * from "./color.utils.ts";

export { default as ColorSlider } from "./ColorSlider.svelte";
export { default as ColorSwatch } from "./ColorSwatch.svelte";
export { default as ColorSwatchGroup } from "./ColorSwatchGroup.svelte";

export {
    ColorState,
    createColorState,
    type ColorChannelMutationOptions,
    type ColorChannelSnapshot,
    type CreateColorStateOptions,
} from "./color-state.svelte.ts";

export {
    COLOR_SWATCH_GROUP_ORIENTATIONS,
    getColorPickerContext,
    setColorPickerContext,
    hasColorPickerContext,
    getColorSwatchGroupContext,
    setColorSwatchGroupContext,
    hasColorSwatchGroupContext,
    type ColorPickerContext,
    type ColorSwatchGroupContext,
    type ColorSwatchGroupOrientation,
} from "./color.context.ts";

export const COLOR_AREA_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_SLIDER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_SLIDER_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const COLOR_SWATCH_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_INPUT_VARIANTS = ["soft", "elevated"] as const;
export const COLOR_INPUT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_EYE_DROPPER_VARIANTS = ["primary", "secondary", "tertiary", "ghost", "elevated"] as const;
export const COLOR_EYE_DROPPER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type ColorAreaSize = (typeof COLOR_AREA_SIZES)[number];
export type ColorSliderSize = (typeof COLOR_SLIDER_SIZES)[number];
export type ColorSliderOrientation = (typeof COLOR_SLIDER_ORIENTATIONS)[number];
export type ColorSwatchSize = (typeof COLOR_SWATCH_SIZES)[number];
export type ColorInputVariant = (typeof COLOR_INPUT_VARIANTS)[number];
export type ColorInputSize = (typeof COLOR_INPUT_SIZES)[number];
export type ColorEyeDropperVariant = (typeof COLOR_EYE_DROPPER_VARIANTS)[number];
export type ColorEyeDropperSize = (typeof COLOR_EYE_DROPPER_SIZES)[number];

export interface ColorSwatchProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    /** T-shirt scale controlling swatch dimensions and corner radius. Required. */
    size: ColorSwatchSize;
    /**
     * CSS color string displayed by this swatch.
     * - Inside ColorSwatchGroup: preset value.
     * - Inside ColorPicker (outside SwatchGroup): defaults to the active picker color.
     * - Standalone: preview color.
     */
    color?: string;
    /** Human-readable color name used for aria-label (falls back to formatted color string). */
    label?: string;
    /**
     * Interaction mode:
     * - "auto" (default): "radio" inside ColorSwatchGroup, "preview" otherwise.
     * - "preview": non-interactive <span>.
     * - "button": standalone clickable <button type="button">.
     */
    mode?: "auto" | "preview" | "button";
    /** Optional standalone selection override (falls back to ColorSwatchGroup selection when nested). */
    selected?: boolean;
    /** Shows a contrasted selection checkmark when selected (standalone or inside ColorSwatchGroup). @default true */
    showCheck?: boolean;
    /** Marks a non-decorative preview swatch as aria-hidden when paired with adjacent visible color text. */
    decorative?: boolean;
    disabled?: boolean;
    onclick?: (event: MouseEvent & { currentTarget: EventTarget & HTMLElement }) => void;
    children?: Snippet;
}

export interface ColorSwatchGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** Selected color string. Supports `bind:value` and `bind:value={get, set}`. */
    value?: string;
    /** Fires when a swatch is selected via pointer or keyboard. */
    onValueChange?: (value: string) => void;
    /** Controls arrow-key axes and default flex direction. @default "both" */
    orientation?: ColorSwatchGroupOrientation;
    /** Positive integer (>= 1). Switches layout from flex-wrap to a fixed-column CSS Grid. */
    columns?: number;
    /** Disables all child swatches and keyboard navigation. */
    disabled?: boolean;
    children?: Snippet;
}

export interface ColorSliderProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** T-shirt scale controlling track thickness, thumb diameter, and hit-target padding. Required. */
    size: ColorSliderSize;
    /** Color channel axis controlled by this slider. Required. */
    channel: ColorChannel;
    /** Slider axis. @default "horizontal" */
    orientation?: ColorSliderOrientation;
    /** Numeric channel value for controlled/uncontrolled standalone usage. */
    value?: number;
    /** Fires on every value change during pointer drag or keyboard stepping. */
    onValueChange?: (value: number) => void;
    /** Fires when an interaction commits (pointerup, pointercancel, or keyboard stepping). */
    onCommit?: (value: number) => void;
    /** Optional base CSS color string for standalone contextual gradients. */
    color?: string;
    /** Accessible name override for the role="slider" thumb. */
    label?: string;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    /** Reverses the visual/interaction axis (e.g. max on inline-start / bottom). */
    inverted?: boolean;
}
