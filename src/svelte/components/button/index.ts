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

export const BUTTON_COLORS = ["accent", "base", "danger"] as const;
export const BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const BUTTON_VARIANTS = ["solid", "soft", "ghost", "elevated"] as const;

export type ButtonColor = (typeof BUTTON_COLORS)[number];
export type ButtonSize = (typeof BUTTON_SIZES)[number];
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
export type ButtonElement = "button" | "a" | "label";

export type ButtonVariantProps =
    | {
          variant: Exclude<ButtonVariant, "elevated">;
          color: ButtonColor;
      }
    | {
          variant: "elevated";
          color?: never;
      };

export type ButtonProps = Omit<HTMLButtonAttributes, "color" | "size"> &
    Omit<HTMLAnchorAttributes, "color" | "size"> &
    Omit<HTMLLabelAttributes, "color" | "size"> &
    ButtonVariantProps & {
        size: ButtonSize;
        as?: ButtonElement;
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
