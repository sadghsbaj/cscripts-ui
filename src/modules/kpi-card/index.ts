import { createContext, type Component, type Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { CloseButtonProps, CloseButtonSize } from "../close-button/index.ts";
import type { ProgressAppearance, ProgressColor, ProgressSize, ProgressVariant } from "../progress/index.ts";

export { default as KpiCard } from "./KpiCard.svelte";
export { default as KpiCardHeader } from "./KpiCardHeader.svelte";
export { default as KpiCardIcon } from "./KpiCardIcon.svelte";
export { default as KpiCardLabel } from "./KpiCardLabel.svelte";
export { default as KpiCardMetric } from "./KpiCardMetric.svelte";
export { default as KpiCardValue } from "./KpiCardValue.svelte";
export { default as KpiCardDelta } from "./KpiCardDelta.svelte";
export { default as KpiCardComparison } from "./KpiCardComparison.svelte";
export { default as KpiCardTarget } from "./KpiCardTarget.svelte";
export { default as KpiCardVisual } from "./KpiCardVisual.svelte";
export { default as KpiCardBreakdown } from "./KpiCardBreakdown.svelte";
export { default as KpiCardBreakdownItem } from "./KpiCardBreakdownItem.svelte";
export { default as KpiCardBody } from "./KpiCardBody.svelte";
export { default as KpiCardFooter } from "./KpiCardFooter.svelte";
export { default as KpiCardActions } from "./KpiCardActions.svelte";
export { default as KpiCardOrnament } from "./KpiCardOrnament.svelte";
export { default as KpiCardClose } from "./KpiCardClose.svelte";
export { default as KpiCardGroup } from "./KpiCardGroup.svelte";

export const KPI_CARD_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const;
export const KPI_CARD_SIZES = ["sm", "md", "lg"] as const;
export const KPI_CARD_LAYOUTS = ["stack", "split", "inline", "hero"] as const;
export const KPI_CARD_LABEL_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "span", "div"] as const;
export const KPI_CARD_COLORS = ["base", "accent", "positive", "caution", "negative"] as const;
export const KPI_CARD_DELTA_VARIANTS = ["soft", "plain", "dot"] as const;
export const KPI_CARD_DELTA_TRENDS = ["up", "down", "flat"] as const;
export const KPI_CARD_VISUAL_PLACEMENTS = ["bottom", "top", "end", "start"] as const;
export const KPI_CARD_VISUAL_VARIANTS = ["transparent", "soft", "sunken"] as const;
export const KPI_CARD_VISUAL_RATIOS = ["auto", "16/9", "21/9", "4/3", "3/1", "1/1"] as const;
export const KPI_CARD_BREAKDOWN_VARIANTS = ["plain", "soft", "sunken"] as const;
export const KPI_CARD_BREAKDOWN_COLUMNS = [1, 2, 3, 4, "auto"] as const;
export const KPI_CARD_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const;
export const KPI_CARD_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const KPI_CARD_ORNAMENT_PLACEMENTS = ["bottom-left", "bottom-right", "top-right", "inset"] as const;
export const KPI_CARD_ORNAMENT_SHAPES = ["circle", "none"] as const;
export const KPI_CARD_GROUP_COLUMNS = [1, 2, 3, 4, "auto"] as const;

export type KpiCardVariant = (typeof KPI_CARD_VARIANTS)[number];
export type KpiCardSize = (typeof KPI_CARD_SIZES)[number];
export type KpiCardLayout = (typeof KPI_CARD_LAYOUTS)[number];
export type KpiCardLabelElement = (typeof KPI_CARD_LABEL_ELEMENTS)[number];
export type KpiCardColor = (typeof KPI_CARD_COLORS)[number];
export type KpiCardDeltaVariant = (typeof KPI_CARD_DELTA_VARIANTS)[number];
export type KpiCardDeltaTrend = (typeof KPI_CARD_DELTA_TRENDS)[number];
export type KpiCardVisualPlacement = (typeof KPI_CARD_VISUAL_PLACEMENTS)[number];
export type KpiCardVisualVariant = (typeof KPI_CARD_VISUAL_VARIANTS)[number];
export type KpiCardVisualRatio = (typeof KPI_CARD_VISUAL_RATIOS)[number] | (string & {});
export type KpiCardBreakdownVariant = (typeof KPI_CARD_BREAKDOWN_VARIANTS)[number];
export type KpiCardBreakdownColumns = (typeof KPI_CARD_BREAKDOWN_COLUMNS)[number];
export type KpiCardActionsAlign = (typeof KPI_CARD_ACTIONS_ALIGNS)[number];
export type KpiCardActionsOrientation = (typeof KPI_CARD_ACTIONS_ORIENTATIONS)[number];
export type KpiCardOrnamentPlacement = (typeof KPI_CARD_ORNAMENT_PLACEMENTS)[number];
export type KpiCardOrnamentShape = (typeof KPI_CARD_ORNAMENT_SHAPES)[number];
export type KpiCardGroupColumns = (typeof KPI_CARD_GROUP_COLUMNS)[number];

export type KpiCardIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export type KpiCardProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    variant: KpiCardVariant;
    size: KpiCardSize;
    layout?: KpiCardLayout;
    children?: Snippet;
};

export type KpiCardHeaderProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    children?: Snippet;
};

export type KpiCardIconProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
    ref?: HTMLSpanElement | null;
    icon: Component<KpiCardIconComponentProps>;
    color?: KpiCardColor;
    strokeWidth?: number | string;
};

export type KpiCardLabelProps = HTMLAttributes<HTMLHeadingElement | HTMLSpanElement | HTMLDivElement> & {
    ref?: HTMLHeadingElement | HTMLSpanElement | HTMLDivElement | null;
    as?: KpiCardLabelElement;
    children?: Snippet;
};

export type KpiCardMetricProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    children?: Snippet;
};

export type KpiCardValueProps = Omit<HTMLAttributes<HTMLDivElement>, "prefix"> & {
    ref?: HTMLDivElement | null;
    prefix?: string;
    suffix?: string;
    children?: Snippet;
};

export type KpiCardDeltaProps = Omit<HTMLAttributes<HTMLSpanElement>, "color"> & {
    ref?: HTMLSpanElement | null;
    trend?: KpiCardDeltaTrend;
    color?: KpiCardColor;
    variant?: KpiCardDeltaVariant;
    showIcon?: boolean;
    icon?: Component<KpiCardIconComponentProps>;
    children?: Snippet;
};

export type KpiCardComparisonProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
    children?: Snippet;
};

export type KpiCardTargetProps = Omit<HTMLAttributes<HTMLDivElement>, "color"> & {
    ref?: HTMLDivElement | null;
    value?: number | null;
    min?: number;
    max?: number;
    appearance?: ProgressAppearance;
    variant?: ProgressVariant;
    color?: ProgressColor;
    size?: ProgressSize;
    segments?: number;
    label?: string;
    target?: string;
    children?: Snippet;
};

export type KpiCardVisualProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    placement?: KpiCardVisualPlacement;
    variant?: KpiCardVisualVariant;
    ratio?: KpiCardVisualRatio;
    bleed?: boolean;
    children?: Snippet;
};

export type KpiCardBreakdownProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    variant?: KpiCardBreakdownVariant;
    columns?: KpiCardBreakdownColumns;
    children?: Snippet;
};

export type KpiCardBreakdownItemProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    label?: string;
    value?: string | number;
    share?: string;
    dotColor?: KpiCardColor;
    children?: Snippet;
};

export type KpiCardBodyProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    children?: Snippet;
};

export type KpiCardFooterProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    children?: Snippet;
};

export type KpiCardActionsProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    align?: KpiCardActionsAlign;
    orientation?: KpiCardActionsOrientation;
    children?: Snippet;
};

export type KpiCardOrnamentProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    placement?: KpiCardOrnamentPlacement;
    shape?: KpiCardOrnamentShape;
    children?: Snippet;
};

export type KpiCardCloseProps = Omit<CloseButtonProps, "size"> & {
    size?: CloseButtonSize;
};

export type KpiCardGroupProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    columns?: KpiCardGroupColumns;
    children?: Snippet;
};

export interface KpiCardContext {
    readonly variant: KpiCardVariant;
    readonly size: KpiCardSize;
    readonly layout: KpiCardLayout;
    readonly nested: boolean;
}

export const [getKpiCardContext, setKpiCardContext, hasKpiCardContext] = createContext<KpiCardContext>();
