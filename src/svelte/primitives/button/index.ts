import type { Component } from "svelte";
import type {
    HTMLAnchorAttributes,
    HTMLAttributes,
    HTMLButtonAttributes,
    HTMLLabelAttributes,
    SVGAttributes,
} from "svelte/elements";

export { default as Button } from "./Button.svelte";
export { default as ButtonLabel } from "./ButtonLabel.svelte";
export { default as ButtonIcon } from "./ButtonIcon.svelte";

export const BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const BUTTON_VARIANTS = ["primary", "secondary", "tertiary", "ghost", "elevated"] as const;

export type ButtonSize = (typeof BUTTON_SIZES)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonElement = "button" | "a" | "label";

type InterestAttributes = {
    interestfor?: string;
};

export type ButtonVariantProps =
    | {
          variant: "primary" | "secondary" | "ghost";
          danger?: boolean;
      }
    | {
          variant: "tertiary" | "elevated";
          danger?: never;
      };

export type ButtonProps = (
    | (Omit<HTMLButtonAttributes, "color" | "size"> & { as?: "button" })
    | (Omit<HTMLAnchorAttributes, "color" | "size"> & { as: "a" })
    | ((Omit<HTMLLabelAttributes, "color" | "size"> & { as: "label" }) & InterestAttributes)
) &
    ButtonVariantProps & {
        size: ButtonSize;
        iconOnly?: boolean;
    };

export type ButtonLabelProps = HTMLAttributes<HTMLSpanElement>;

export type ButtonIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface ButtonIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ButtonIconComponentProps>;
    color?: string;
}
