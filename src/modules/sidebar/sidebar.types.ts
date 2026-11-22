import type { Component, Snippet } from "svelte";
import type {
    ClassValue,
    HTMLAnchorAttributes,
    HTMLAttributes,
    HTMLButtonAttributes,
    SVGAttributes,
} from "svelte/elements";

import type { ButtonSize, ButtonVariant } from "../button/index.ts";
import type { CollapsibleProps } from "../collapsible/index.ts";
import type { OverlayVariant } from "../overlay/index.ts";
import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";
import type { ScrollFadeSize } from "../scroll-fade/index.ts";

export const SIDEBAR_VARIANTS = ["elevated", "floating", "transparent"] as const;
export type SidebarVariant = (typeof SIDEBAR_VARIANTS)[number];

export const SIDEBAR_SIZES = ["sm", "md", "lg"] as const;
export type SidebarSize = (typeof SIDEBAR_SIZES)[number];

export const SIDEBAR_SIDES = ["start", "end"] as const;
export type SidebarSide = (typeof SIDEBAR_SIDES)[number];

export const SIDEBAR_BEHAVIORS = ["inline", "overlay"] as const;
export type SidebarBehavior = (typeof SIDEBAR_BEHAVIORS)[number];

export const SIDEBAR_COLLAPSE_MODES = ["hidden", "rail"] as const;
export type SidebarCollapseMode = (typeof SIDEBAR_COLLAPSE_MODES)[number];

export const SIDEBAR_ELEMENTS = ["aside", "nav"] as const;
export type SidebarElement = (typeof SIDEBAR_ELEMENTS)[number];

export const SIDEBAR_VIEW_TRANSITIONS = ["slide", "fade", "none"] as const;
export type SidebarViewTransition = (typeof SIDEBAR_VIEW_TRANSITIONS)[number];

export const SIDEBAR_VIEW_DIRECTIONS = ["auto", "forward", "backward"] as const;
export type SidebarViewDirection = (typeof SIDEBAR_VIEW_DIRECTIONS)[number];

export type SidebarState = "open" | "opening" | "closing" | "closed";

export type SidebarAriaCurrent = boolean | "page" | "step" | "location" | "date" | "time" | "true";

export type SidebarSubheaderRailBehavior = "collapse" | "keep";

export type SidebarSectionLabelElement = "div" | "h2" | "h3" | "h4" | "span";

export type SidebarViewInitialFocus = "auto" | "none" | HTMLElement | (() => HTMLElement | null);

export type SidebarIconComponentProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown> & {
        color?: string;
    };

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    ref?: HTMLElement | null;
    variant: SidebarVariant;
    size: SidebarSize;
    as?: SidebarElement;
    side?: SidebarSide;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    behavior?: SidebarBehavior;
    collapseMode?: SidebarCollapseMode;
    width?: "fill" | (string & {}) | undefined;
    railWidth?: string | undefined;
    overlayVariant?: OverlayVariant;
    animate?: boolean;
    id?: string;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarHeaderProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarSubheaderProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    railBehavior?: SidebarSubheaderRailBehavior;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarBodyProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    scrollable?: boolean;
    scrollbar?: ScrollAreaScrollbar;
    fade?: boolean | ScrollFadeSize;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarPinnedProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarFooterProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarSectionProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    collapsible?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    animate?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarSectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarSectionLabelProps extends HTMLAttributes<HTMLElement> {
    ref?: HTMLElement | null;
    as?: SidebarSectionLabelElement;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarGroupProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    disabled?: boolean;
    keepMounted?: boolean;
    animate?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarGroupTriggerProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    icon?: Component<SidebarIconComponentProps>;
    indicator?: Snippet<[{ open: boolean }]> | false;
    tooltip?: string | boolean;
    iconOnly?: boolean;
    current?: SidebarAriaCurrent;
    disabled?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarGroupContentProps extends Omit<CollapsibleProps, "open"> {
    ref?: HTMLDivElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarItemRowProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarItemBaseProps {
    current?: SidebarAriaCurrent;
    negative?: boolean;
    disabled?: boolean;
    icon?: Component<SidebarIconComponentProps>;
    badge?: Snippet;
    tooltip?: string | boolean;
    class?: ClassValue;
    children?: Snippet;
}

export type SidebarItemProps =
    | (Omit<HTMLAnchorAttributes, "color" | "children"> &
          SidebarItemBaseProps & {
              href: string;
              ref?: HTMLAnchorElement | null;
          })
    | (Omit<HTMLButtonAttributes, "type" | "color" | "children"> &
          SidebarItemBaseProps & {
              href?: undefined;
              ref?: HTMLButtonElement | null;
          });

export interface SidebarItemIconProps extends Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> {
    icon: Component<SidebarIconComponentProps>;
    color?: string;
    strokeWidth?: number | string;
}

export interface SidebarItemLabelProps extends HTMLAttributes<HTMLSpanElement> {
    ref?: HTMLSpanElement | null;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarItemActionsProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    alwaysVisible?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarToggleProps extends Omit<HTMLButtonAttributes, "type"> {
    ref?: HTMLButtonElement | null;
    open?: boolean;
    sidebarId?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    iconOnly?: boolean;
    label?: string;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarViewsProps<T extends string = string>
    extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    value: T;
    onValueChange?: (value: T) => void;
    transition?: SidebarViewTransition;
    direction?: SidebarViewDirection;
    keepMounted?: boolean;
    animate?: boolean;
    class?: ClassValue;
    children?: Snippet;
}

export interface SidebarViewProps<T extends string = string>
    extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    value: T;
    label?: string;
    initialFocus?: SidebarViewInitialFocus;
    class?: ClassValue;
    children?: Snippet;
}
