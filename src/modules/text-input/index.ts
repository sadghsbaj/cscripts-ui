import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, HTMLInputAttributes, SVGAttributes } from "svelte/elements";

export { default as TextInput } from "./TextInput.svelte";
export { default as TextInputField } from "./TextInputField.svelte";
export { default as TextInputIcon } from "./TextInputIcon.svelte";
export { default as TextInputAction } from "./TextInputAction.svelte";
export {
    getTextInputContext,
    setTextInputContext,
    hasTextInputContext,
    type TextInputContext,
} from "./text-input.context.ts";

export const TEXT_INPUT_VARIANTS = ["soft", "elevated"] as const;
export const TEXT_INPUT_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type TextInputVariant = (typeof TEXT_INPUT_VARIANTS)[number];
export type TextInputSize = (typeof TEXT_INPUT_SIZES)[number];

export interface TextInputProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    variant: TextInputVariant;
    size: TextInputSize;
    invalid?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface TextInputFieldProps extends Omit<HTMLInputAttributes, "size" | "children" | "value"> {
    value?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    ref?: HTMLInputElement | null;
}

export type TextInputIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface TextInputIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<TextInputIconComponentProps>;
    color?: string;
}

export interface TextInputActionProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    icon?: Component<TextInputIconComponentProps>;
    visible?: boolean;
    disabled?: boolean;
    children?: Snippet;
}
