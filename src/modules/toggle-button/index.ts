import type { Component } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, MouseEventHandler, SVGAttributes } from "svelte/elements";

export { default as ToggleButton } from "./ToggleButton.svelte";
export { default as ToggleButtonLabel } from "./ToggleButtonLabel.svelte";
export { default as ToggleButtonIcon } from "./ToggleButtonIcon.svelte";

export const TOGGLE_BUTTON_COLORS = ["accent", "positive", "caution", "negative"] as const;
export const TOGGLE_BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const TOGGLE_BUTTON_VARIANTS = ["soft", "ghost"] as const;

export type ToggleButtonColor = (typeof TOGGLE_BUTTON_COLORS)[number];
export type ToggleButtonSize = (typeof TOGGLE_BUTTON_SIZES)[number];
export type ToggleButtonVariant = (typeof TOGGLE_BUTTON_VARIANTS)[number];

export type ToggleButtonStateProps =
    | {
          /** Item identifier inside `<ToggleButtonGroup>`. Forbidden standalone. */
          value: string;
          pressed?: never;
          onPressedChange?: never;
      }
    | {
          value?: never;
          /** Bindable pressed state (standalone only). Use `bind:pressed` or `bind:pressed={get, set}`; do not pass a plain expression like `pressed={fn()}`. */
          pressed?: boolean;
          /** Fires with the next pressed state after a user toggle (standalone only). */
          onPressedChange?: (pressed: boolean) => void;
      };

export type ToggleButtonProps = Omit<HTMLButtonAttributes, "color" | "size" | "value"> &
    ToggleButtonStateProps & {
        /** Bindable reference to the root `<button>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
        ref?: HTMLButtonElement | null;
        variant: ToggleButtonVariant;
        color: ToggleButtonColor;
        size: ToggleButtonSize;
        iconOnly?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement>;
    };

export type ToggleButtonLabelProps = HTMLAttributes<HTMLSpanElement> & {
    /** Bindable reference to the root `<span>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLSpanElement | null;
};

export type ToggleButtonIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface ToggleButtonIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<ToggleButtonIconComponentProps>;
}
