import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, SVGAttributes } from "svelte/elements";

export { default as SegmentedControl } from "./SegmentedControl.svelte";
export { default as SegmentedControlItem } from "./SegmentedControlItem.svelte";
export { default as SegmentedControlLabel } from "./SegmentedControlLabel.svelte";
export { default as SegmentedControlIcon } from "./SegmentedControlIcon.svelte";

export {
    getSegmentedControlContext,
    setSegmentedControlContext,
    hasSegmentedControlContext,
    type SegmentedControlContext,
} from "./segmented-control.context.ts";

export const SEGMENTED_CONTROL_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const SEGMENTED_CONTROL_WIDTHS = ["content", "equal"] as const;

export type SegmentedControlSize = (typeof SEGMENTED_CONTROL_SIZES)[number];
export type SegmentedControlWidth = (typeof SEGMENTED_CONTROL_WIDTHS)[number];

export interface SegmentedControlProps<T extends string = string>
    extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Bindable selected value. Use `bind:value` or `bind:value={get, set}`; do not pass a plain expression like `value={fn()}`. */
    value?: T;
    onValueChange?: (value: T) => void;
    size: SegmentedControlSize;
    width?: SegmentedControlWidth;
    disabled?: boolean;
    name?: string;
    /** Bindable reference to the root `<div>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface SegmentedControlItemProps<T extends string = string>
    extends Omit<HTMLButtonAttributes, "value" | "type"> {
    value: T;
    disabled?: boolean;
    /** Bindable reference to the item `<button>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLButtonElement | null;
    children?: Snippet;
}

export interface SegmentedControlLabelProps extends HTMLAttributes<HTMLSpanElement> {
    /** Bindable reference to the root `<span>`. Use `bind:ref` or `bind:ref={get, set}`; do not pass a plain expression like `ref={fn()}`. */
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export type SegmentedControlIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface SegmentedControlIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<SegmentedControlIconComponentProps>;
    color?: string;
}
