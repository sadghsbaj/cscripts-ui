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
    value?: T;
    onValueChange?: (value: T) => void;
    size: SegmentedControlSize;
    width?: SegmentedControlWidth;
    disabled?: boolean;
    name?: string;
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface SegmentedControlItemProps<T extends string = string>
    extends Omit<HTMLButtonAttributes, "value" | "type"> {
    value: T;
    disabled?: boolean;
    ref?: HTMLButtonElement | null;
    children?: Snippet;
}

export interface SegmentedControlLabelProps extends HTMLAttributes<HTMLSpanElement> {
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
