import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, HTMLInputAttributes, SVGAttributes } from "svelte/elements";

export { default as NumberStepper } from "./NumberStepper.svelte";
export { default as NumberStepperDecrement } from "./NumberStepperDecrement.svelte";
export { default as NumberStepperIncrement } from "./NumberStepperIncrement.svelte";
export { default as NumberStepperInput } from "./NumberStepperInput.svelte";
export { default as NumberStepperValue } from "./NumberStepperValue.svelte";

export {
    getNumberStepperContext,
    setNumberStepperContext,
    hasNumberStepperContext,
    type NumberStepperContext,
} from "./number-stepper.context.ts";

export const NUMBER_STEPPER_VARIANTS = ["soft", "elevated"] as const;
export const NUMBER_STEPPER_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const NUMBER_STEPPER_ORIENTATIONS = ["horizontal", "vertical"] as const;

export type NumberStepperVariant = (typeof NUMBER_STEPPER_VARIANTS)[number];
export type NumberStepperSize = (typeof NUMBER_STEPPER_SIZES)[number];
export type NumberStepperOrientation = (typeof NUMBER_STEPPER_ORIENTATIONS)[number];

export interface NumberStepperProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    variant: NumberStepperVariant;
    size: NumberStepperSize;
    orientation: NumberStepperOrientation;
    /** Bindable numeric value. Use `bind:value` or `bind:value={get, set}`. */
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    disabled?: boolean;
    invalid?: boolean;
    /** Bindable reference to the root `<div>`. */
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export type NumberStepperIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface NumberStepperButtonProps extends Omit<HTMLButtonAttributes, "type"> {
    icon?: Component<NumberStepperIconComponentProps>;
    disabled?: boolean;
    /** Bindable reference to the `<button>`. */
    ref?: HTMLButtonElement | null;
    children?: Snippet;
}

export type NumberStepperDecrementProps = NumberStepperButtonProps;
export type NumberStepperIncrementProps = NumberStepperButtonProps;

export interface NumberStepperInputProps extends Omit<HTMLInputAttributes, "size" | "value" | "children" | "type"> {
    prefix?: string;
    suffix?: string;
    disabled?: boolean;
    readonly?: boolean;
    /** Bindable reference to the `<input>`. */
    ref?: HTMLInputElement | null;
}

export interface NumberStepperValueProps extends HTMLAttributes<HTMLElement> {
    prefix?: string;
    suffix?: string;
    format?: Intl.NumberFormatOptions;
    locales?: Intl.LocalesArgument;
    /** Bindable reference to the rendered `<button>` or `<span>`. */
    ref?: HTMLElement | null;
    children?: Snippet;
}
