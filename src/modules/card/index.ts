import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

import type { CloseButtonProps, CloseButtonSize } from "../close-button/index.ts";

export { default as Card } from "./Card.svelte";
export { default as CardHeader } from "./CardHeader.svelte";
export { default as CardTitle } from "./CardTitle.svelte";
export { default as CardDescription } from "./CardDescription.svelte";
export { default as CardBody } from "./CardBody.svelte";
export { default as CardFooter } from "./CardFooter.svelte";
export { default as CardActions } from "./CardActions.svelte";
export { default as CardMedia } from "./CardMedia.svelte";
export { default as CardRail } from "./CardRail.svelte";
export { default as CardOrnament } from "./CardOrnament.svelte";
export { default as CardClose } from "./CardClose.svelte";

export const CARD_VARIANTS = ["elevated", "soft", "sunken", "transparent"] as const;
export const CARD_SIZES = ["sm", "md", "lg"] as const;
export const CARD_ORIENTATIONS = ["vertical", "horizontal"] as const;
export const CARD_TITLE_ELEMENTS = ["h2", "h3", "h4", "h5", "h6", "div"] as const;
export const CARD_ACTIONS_ALIGNS = ["start", "end", "stretch"] as const;
export const CARD_ACTIONS_ORIENTATIONS = ["horizontal", "vertical"] as const;
export const CARD_MEDIA_PLACEMENTS = ["top", "bottom", "start", "end"] as const;
export const CARD_MEDIA_RATIOS = ["auto", "1/1", "4/3", "16/9", "21/9"] as const;
export const CARD_MEDIA_FITS = ["cover", "contain"] as const;
export const CARD_RAIL_VARIANTS = ["sunken", "soft", "transparent"] as const;
export const CARD_RAIL_PLACEMENTS = ["start", "end"] as const;
export const CARD_RAIL_COLUMNS = [1, 2, "auto"] as const;
export const CARD_ORNAMENT_PLACEMENTS = ["bottom-left", "bottom-right", "top-right", "inset"] as const;
export const CARD_ORNAMENT_SHAPES = ["circle", "none"] as const;

export type CardVariant = (typeof CARD_VARIANTS)[number];
export type CardSize = (typeof CARD_SIZES)[number];
export type CardOrientation = (typeof CARD_ORIENTATIONS)[number];
export type CardTitleElement = (typeof CARD_TITLE_ELEMENTS)[number];
export type CardActionsAlign = (typeof CARD_ACTIONS_ALIGNS)[number];
export type CardActionsOrientation = (typeof CARD_ACTIONS_ORIENTATIONS)[number];
export type CardMediaPlacement = (typeof CARD_MEDIA_PLACEMENTS)[number];
export type CardMediaRatio = (typeof CARD_MEDIA_RATIOS)[number] | (string & {});
export type CardMediaFit = (typeof CARD_MEDIA_FITS)[number];
export type CardRailVariant = (typeof CARD_RAIL_VARIANTS)[number];
export type CardRailPlacement = (typeof CARD_RAIL_PLACEMENTS)[number];
export type CardRailColumns = (typeof CARD_RAIL_COLUMNS)[number];
export type CardOrnamentPlacement = (typeof CARD_ORNAMENT_PLACEMENTS)[number];
export type CardOrnamentShape = (typeof CARD_ORNAMENT_SHAPES)[number];

export type CardProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    variant: CardVariant;
    size: CardSize;
    orientation?: CardOrientation;
};

export type CardHeaderProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement | HTMLDivElement> & {
    ref?: HTMLHeadingElement | HTMLDivElement | null;
    as?: CardTitleElement;
};

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement> & {
    ref?: HTMLParagraphElement | null;
};

export type CardBodyProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type CardFooterProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
};

export type CardActionsProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    align?: CardActionsAlign;
    orientation?: CardActionsOrientation;
};

export type CardMediaProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    placement?: CardMediaPlacement;
    ratio?: CardMediaRatio;
    fit?: CardMediaFit;
    bleed?: boolean;
};

export type CardRailProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    variant: CardRailVariant;
    placement?: CardRailPlacement;
    columns?: CardRailColumns;
};

export type CardOrnamentProps = HTMLAttributes<HTMLDivElement> & {
    ref?: HTMLDivElement | null;
    placement?: CardOrnamentPlacement;
    shape?: CardOrnamentShape;
};

export type CardCloseProps = Omit<CloseButtonProps, "size"> & {
    size?: CloseButtonSize;
};

export interface CardContext {
    readonly variant: CardVariant;
    readonly size: CardSize;
    readonly orientation: CardOrientation;
}

export const [getCardContext, setCardContext, hasCardContext] = createContext<CardContext>();
