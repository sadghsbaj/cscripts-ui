import type { Component } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, MouseEventHandler, SVGAttributes } from "svelte/elements";

export { default as ToggleButton } from "./ToggleButton.svelte";
export { default as ToggleButtonLabel } from "./ToggleButtonLabel.svelte";
export { default as ToggleButtonIcon } from "./ToggleButtonIcon.svelte";

export const TOGGLE_BUTTON_COLORS = ["accent", "success", "warning", "danger"] as const;
export const TOGGLE_BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const TOGGLE_BUTTON_VARIANTS = ["soft", "ghost"] as const;

export type ToggleButtonColor = (typeof TOGGLE_BUTTON_COLORS)[number];
export type ToggleButtonSize = (typeof TOGGLE_BUTTON_SIZES)[number];
export type ToggleButtonVariant = (typeof TOGGLE_BUTTON_VARIANTS)[number];

export type ToggleButtonStateProps =
    | {
          value: string;
          pressed?: never;
      }
    | {
          value?: never;
          pressed?: boolean;
      };

export type ToggleButtonProps = Omit<HTMLButtonAttributes, "color" | "size" | "value"> &
    ToggleButtonStateProps & {
        variant: ToggleButtonVariant;
        color: ToggleButtonColor;
        size: ToggleButtonSize;
        iconOnly?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement>;
    };

export type ToggleButtonLabelProps = HTMLAttributes<HTMLSpanElement>;

export type ToggleButtonIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface ToggleButtonIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ToggleButtonIconComponentProps>;
}
