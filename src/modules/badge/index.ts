import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

export { default as Badge } from "./Badge.svelte";
export { default as BadgeLabel } from "./BadgeLabel.svelte";
export { default as BadgeIcon } from "./BadgeIcon.svelte";

export const BADGE_VARIANTS = ["soft", "solid", "dot"] as const;
export const BADGE_COLORS = ["base", "accent", "positive", "caution", "negative"] as const;
export const BADGE_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type BadgeVariant = (typeof BADGE_VARIANTS)[number];
export type BadgeColor = (typeof BADGE_COLORS)[number];
export type BadgeSize = (typeof BADGE_SIZES)[number];

export type BadgeProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
    ref?: HTMLSpanElement | null;
    variant: BadgeVariant;
    color: BadgeColor;
    size: BadgeSize;
    iconOnly?: boolean;
    children?: Snippet;
};

export type BadgeLabelProps = HTMLAttributes<HTMLSpanElement> & {
    ref?: HTMLSpanElement | null;
    children?: Snippet;
};

export type BadgeIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface BadgeIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<BadgeIconComponentProps>;
    color?: string;
    strokeWidth?: number | string;
}
