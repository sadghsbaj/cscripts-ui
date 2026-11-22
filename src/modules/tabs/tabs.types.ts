import type { Component, Snippet } from "svelte";
import type { HTMLAnchorAttributes, HTMLAttributes, HTMLButtonAttributes, SVGAttributes } from "svelte/elements";

export const TABS_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const TABS_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const TABS_WIDTHS = ["content", "equal"] as const;
export const TABS_BASELINES = ["full", "content", "none"] as const;
export const TABS_ACTIVATION_MODES = ["automatic", "manual"] as const;

export type TabsOrientation = (typeof TABS_ORIENTATIONS)[number];
export type TabsSize = (typeof TABS_SIZES)[number];
export type TabsWidth = (typeof TABS_WIDTHS)[number];
export type TabsBaseline = (typeof TABS_BASELINES)[number];
export type TabsActivationMode = (typeof TABS_ACTIVATION_MODES)[number];

export interface TabsProps<T extends string = string> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Bindable reference to the root `.cs-tabs` `<div>`. */
    ref?: HTMLDivElement | null;
    /** Bindable active tab value. */
    value?: T;
    onValueChange?: (value: T) => void;
    size: TabsSize;
    orientation?: TabsOrientation;
    width?: TabsWidth;
    baseline?: TabsBaseline;
    activationMode?: TabsActivationMode;
    loop?: boolean;
    disabled?: boolean;
    keepMounted?: boolean;
    children?: Snippet;
}

export interface TabsListProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Bindable reference to the `.cs-tabs-list-shell` `<div>`. */
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

interface TabsTriggerBaseProps<T extends string = string> {
    value: T;
    disabled?: boolean;
    children?: Snippet;
}

export interface TabsTriggerButtonProps<T extends string = string>
    extends TabsTriggerBaseProps<T>,
        Omit<HTMLButtonAttributes, "value" | "type" | "children" | "disabled"> {
    href?: undefined;
    /** Bindable reference to the `<button>` trigger. */
    ref?: HTMLButtonElement | null;
}

export interface TabsTriggerLinkProps<T extends string = string>
    extends TabsTriggerBaseProps<T>,
        Omit<HTMLAnchorAttributes, "href" | "children"> {
    href: string;
    /** Bindable reference to the `<a>` trigger. */
    ref?: HTMLAnchorElement | null;
}

export type TabsTriggerProps<T extends string = string> =
    | TabsTriggerButtonProps<T>
    | TabsTriggerLinkProps<T>;

export interface TabsPanelProps<T extends string = string> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    /** Bindable reference to the `.cs-tabs-panel` `<div>`. */
    ref?: HTMLDivElement | null;
    value: T;
    keepMounted?: boolean;
    children?: Snippet;
}

export interface TabsLabelProps extends HTMLAttributes<HTMLSpanElement> {
    /** Bindable reference to the `.cs-tabs-label` `<span>`. */
    ref?: HTMLSpanElement | null;
    children?: Snippet;
}

export type TabsIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface TabsIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<TabsIconComponentProps>;
    color?: string;
    strokeWidth?: number | string;
}
