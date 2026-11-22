import type { Component } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, MouseEventHandler, SVGAttributes } from "svelte/elements";

export { default as ToggleButton } from "./ToggleButton.svelte";
export { default as ToggleButtonGroup } from "./ToggleButtonGroup.svelte";
export { default as ToggleButtonLabel } from "./ToggleButtonLabel.svelte";
export { default as ToggleButtonIcon } from "./ToggleButtonIcon.svelte";

export const TOGGLE_BUTTON_COLORS = ["accent", "positive", "caution", "negative"] as const;
export const TOGGLE_BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const TOGGLE_BUTTON_VARIANTS = ["soft", "ghost", "elevated"] as const;

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

export const TOGGLE_BUTTON_GROUP_TYPES = ["single", "multiple"] as const;
export type ToggleButtonGroupType = (typeof TOGGLE_BUTTON_GROUP_TYPES)[number];

export const TOGGLE_BUTTON_GROUP_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type ToggleButtonGroupOrientation = (typeof TOGGLE_BUTTON_GROUP_ORIENTATIONS)[number];

export type ToggleButtonGroupSingleProps =
    | {
          type: "single";
          /** Bindable selected value. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
          value?: string;
          allowDeselect?: false;
          onValueChange?: (value: string) => void;
      }
    | {
          type: "single";
          /** Bindable selected value. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
          value?: string | undefined;
          allowDeselect: true;
          onValueChange?: (value: string | undefined) => void;
      };

export type ToggleButtonGroupMultipleProps = {
    type: "multiple";
    /** Bindable selected values. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
    value?: string[];
    allowDeselect?: never;
    onValueChange?: (value: string[]) => void;
};

export type ToggleButtonGroupTypeProps = ToggleButtonGroupSingleProps | ToggleButtonGroupMultipleProps;

export type ToggleButtonGroupProps = HTMLAttributes<HTMLDivElement> &
    ToggleButtonGroupTypeProps & {
        /** Bindable reference to the root `<div>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
        ref?: HTMLDivElement | null;
        orientation?: ToggleButtonGroupOrientation;
        /** Disables the group and all child `<ToggleButton>` items. */
        disabled?: boolean;
    };
