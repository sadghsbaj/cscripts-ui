import type { Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes } from "svelte/elements";

import { SELECT_SIZES, SELECT_VARIANTS } from "../select/index.ts";
import type { ColorPickerContext, ColorSwatchGroupOrientation } from "./color.context.ts";
import type { ColorAlphaFormat, ColorChannel, ColorFormat, ColorGamut } from "./color.utils.ts";

export * from "./color.utils.ts";

export { default as ColorArea } from "./ColorArea.svelte";
export { default as ColorEyeDropper } from "./ColorEyeDropper.svelte";
export { default as ColorFormatSelect } from "./ColorFormatSelect.svelte";
export { default as ColorInput } from "./ColorInput.svelte";
export { default as ColorPicker } from "./ColorPicker.svelte";
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

export const COLOR_PICKER_SPACES = ["hsv", "hsl", "oklch"] as const;
export const COLOR_AREA_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_SLIDER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_SLIDER_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const COLOR_SWATCH_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_INPUT_VARIANTS = ["soft", "elevated"] as const;
export const COLOR_INPUT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_FORMAT_SELECT_VARIANTS = SELECT_VARIANTS;
export const COLOR_FORMAT_SELECT_SIZES = SELECT_SIZES;
export const COLOR_FORMAT_SELECT_DEFAULTS = ["hex", "rgb", "hsl", "oklch"] as const;
export const COLOR_EYE_DROPPER_VARIANTS = ["primary", "secondary", "tertiary", "ghost", "elevated"] as const;
export const COLOR_EYE_DROPPER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const COLOR_EYE_DROPPER_UNSUPPORTED_BEHAVIORS = ["hide", "disable"] as const;

export type ColorPickerSpace = (typeof COLOR_PICKER_SPACES)[number];
export type ColorAreaSize = (typeof COLOR_AREA_SIZES)[number];
export type ColorSliderSize = (typeof COLOR_SLIDER_SIZES)[number];
export type ColorSliderOrientation = (typeof COLOR_SLIDER_ORIENTATIONS)[number];
export type ColorSwatchSize = (typeof COLOR_SWATCH_SIZES)[number];
export type ColorInputVariant = (typeof COLOR_INPUT_VARIANTS)[number];
export type ColorInputSize = (typeof COLOR_INPUT_SIZES)[number];
export type ColorFormatSelectVariant = (typeof COLOR_FORMAT_SELECT_VARIANTS)[number];
export type ColorFormatSelectSize = (typeof COLOR_FORMAT_SELECT_SIZES)[number];
export type ColorEyeDropperVariant = (typeof COLOR_EYE_DROPPER_VARIANTS)[number];
export type ColorEyeDropperSize = (typeof COLOR_EYE_DROPPER_SIZES)[number];
export type ColorEyeDropperUnsupportedBehavior = (typeof COLOR_EYE_DROPPER_UNSUPPORTED_BEHAVIORS)[number];

export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** Controlled CSS color string. Supports `bind:value` and `bind:value={get, set}`. */
    value?: string;
    /** Initial CSS color string for uncontrolled usage. @default "#3b82f6" */
    defaultValue?: string;
    /** Fires on every color mutation (including live pointer drags and typing). */
    onValueChange?: (value: string) => void;
    /** Fires when an interaction commits. */
    onCommit?: (value: string) => void;
    /** Controlled output/editing format. Supports `bind:format`. */
    format?: ColorFormat;
    /** Initial format when `format` is uncontrolled. @default "auto" */
    defaultFormat?: ColorFormat;
    /** Fires when `setFormat` is called. */
    onFormatChange?: (format: ColorFormat) => void;
    /** Editing color space exposed via `ColorPickerContext.space`. @default "hsv" */
    space?: ColorPickerSpace;
    /** Controls alpha channel emission in `ColorState` formatted output strings. @default "auto" */
    alphaFormat?: ColorAlphaFormat;
    /** Optional target gamut clamping applied by `ColorState`. */
    gamut?: ColorGamut;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    /** Accessible group name (`aria-label`). */
    label?: string;
    children?: Snippet<[ColorPickerContext]>;
}

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

export interface ColorAreaProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    /** T-shirt scale controlling default area height, thumb diameter, corner radius, and checkerboard tile size. Required. */
    size: ColorAreaSize;
    /** Horizontal (inline) color channel. Defaults based on ColorPickerContext space. */
    xChannel?: ColorChannel;
    /** Vertical (block) color channel. Defaults based on ColorPickerContext space. */
    yChannel?: ColorChannel;
    /** Controlled/uncontrolled X-axis numeric value. */
    xValue?: number;
    /** Controlled/uncontrolled Y-axis numeric value. */
    yValue?: number;
    /** Fires on every coordinate change during pointer drag or keyboard stepping. */
    onValueChange?: (x: number, y: number) => void;
    /** Fires when an interaction commits (pointerup, pointercancel, lostpointercapture, or keyboard stepping). */
    onCommit?: (x: number, y: number) => void;
    /** Optional base CSS color string for standalone usage. */
    color?: string;
    /** Accessible name override for the role="slider" thumb. */
    label?: string;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
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

export interface ColorInputBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Bindable reference to the root `TextInput` shell `<div>`. */
    ref?: HTMLDivElement | null;
    /** Bindable reference to the inner `TextInputField` `<input>`. */
    inputRef?: HTMLInputElement | null;
    /** Visual shell style forwarded to `TextInput`. Required. */
    variant: ColorInputVariant;
    /** T-shirt scale forwarded to `TextInput` (28-44px height). Required. */
    size: ColorInputSize;
    placeholder?: string;
    /** Accessible name (`aria-label`) for the inner `<input>`. */
    label?: string;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    children?: Snippet;
}

export interface ColorInputFullProps extends ColorInputBaseProps {
    channel?: undefined;
    /** CSS color string for standalone controlled/uncontrolled usage. */
    value?: string;
    onValueChange?: (value: string) => void;
    onCommit?: (value: string) => void;
    /** Output format ("auto" resolves to pickerCtx.format, parsed.sourceFormat, then "hex"). */
    format?: ColorFormat;
    /** Controls alpha emission in `formatColor`. @default "auto" */
    alpha?: ColorAlphaFormat;
    /** Renders a compact decorative `ColorSwatch` preview as a leading prefix. @default false */
    showSwatch?: boolean;
    /** Renders `#` as a muted leading prefix span in hex/hex8 modes. @default true */
    showPrefix?: boolean;
}

export interface ColorInputChannelProps extends ColorInputBaseProps {
    /** Selects Single-Channel Numeric Mode. Required. */
    channel: ColorChannel;
    /** Underlying numeric channel value (e.g. `0..1` for `alpha`, `0..360` for `hue`). */
    value?: number;
    onValueChange?: (value: number) => void;
    onCommit?: (value: number) => void;
    /** Optional base CSS color string for standalone usage when `value` and `pickerCtx` are absent. */
    color?: string;
    /** Appends channel unit (`%` or `°`) to the formatted display string. @default true */
    showUnit?: boolean;
}

export type ColorInputProps = ColorInputFullProps | ColorInputChannelProps;

export interface ColorFormatSelectProps extends Omit<HTMLButtonAttributes, "type" | "value" | "children"> {
    ref?: HTMLButtonElement | null;
    /** Visual shell style forwarded to `Select` ("soft" | "elevated"). Required. */
    variant: ColorFormatSelectVariant;
    /** T-shirt scale forwarded to `Select` (28-44px height). Required. */
    size: ColorFormatSelectSize;
    /** Controlled/standalone selected format. Supports `bind:value`. */
    value?: ColorFormat;
    onValueChange?: (format: ColorFormat) => void;
    /** Controlled/uncontrolled popover open state forwarded to `Select`. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Ordered list of selectable formats. @default COLOR_FORMAT_SELECT_DEFAULTS */
    formats?: readonly ColorFormat[];
    disabled?: boolean;
    invalid?: boolean;
    /** Accessible name (`aria-label`) for `SelectTrigger`. */
    label?: string;
    name?: string;
    required?: boolean;
}

export interface ColorEyeDropperProps extends Omit<HTMLButtonAttributes, "type" | "color" | "size" | "value"> {
    ref?: HTMLButtonElement | null;
    /** Visual style forwarded 1:1 to `Button`. Required. */
    variant: ColorEyeDropperVariant;
    /** T-shirt scale forwarded 1:1 to `Button` (28-44px height). Required. */
    size: ColorEyeDropperSize;
    /** Optional bindable CSS color string for standalone usage; updated to `result.sRGBHex` on pick. */
    value?: string;
    /** Fires with the picked `sRGBHex` string when sampling succeeds. */
    onPick?: (color: string) => void;
    /** Optional handler for non-abort `EyeDropper.open()` failures. */
    onError?: (error: unknown) => void;
    /** Behavior when `EyeDropper` is unavailable. @default "hide" */
    unsupportedBehavior?: ColorEyeDropperUnsupportedBehavior;
    disabled?: boolean;
    /** Accessible name (`aria-label`). */
    label?: string;
    children?: Snippet;
}
