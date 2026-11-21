import type { Snippet } from "svelte";
import type { ClassValue, HTMLAttributes } from "svelte/elements";

export const SPLITTER_ORIENTATIONS = ["horizontal", "vertical"] as const;
export type SplitterOrientation = (typeof SPLITTER_ORIENTATIONS)[number];

export const SPLITTER_VARIANTS = ["subtle", "elevated", "transparent"] as const;
export type SplitterVariant = (typeof SPLITTER_VARIANTS)[number];

export const SPLITTER_SIZES = ["sm", "md", "lg"] as const;
export type SplitterSize = (typeof SPLITTER_SIZES)[number];

export const SPLITTER_DOUBLE_CLICK_ACTIONS = ["reset", "collapse", "none"] as const;
export type SplitterDoubleClickAction = (typeof SPLITTER_DOUBLE_CLICK_ACTIONS)[number];

export type SplitterExtent = number | `${number}px` | `${number}%`;

export interface SplitterPaneSnapshot {
    id: string;
    extentPx: number;
    extentPercent: number;
    collapsed: boolean;
}

export interface SplitterResizeEvent {
    panes: SplitterPaneSnapshot[];
}

export interface SplitterProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    variant: SplitterVariant;
    size: SplitterSize;
    orientation?: SplitterOrientation;
    animate?: boolean;
    disabled?: boolean;
    onResize?: (event: SplitterResizeEvent) => void;
    onResizeEnd?: (event: SplitterResizeEvent) => void;
    class?: ClassValue;
    children?: Snippet;
}

export interface SplitterPaneProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    id?: string;
    extent?: SplitterExtent;
    defaultExtent?: SplitterExtent;
    min?: SplitterExtent;
    max?: SplitterExtent;
    collapsible?: boolean;
    collapsed?: boolean;
    collapsedExtent?: SplitterExtent;
    collapseThreshold?: number;
    onCollapseChange?: (collapsed: boolean) => void;
    class?: ClassValue;
    children?: Snippet;
}

export interface SplitterHandleProps extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "role"
> {
    ref?: HTMLDivElement | null;
    variant?: SplitterVariant;
    size?: SplitterSize;
    disabled?: boolean;
    keyboardStep?: SplitterExtent;
    keyboardStepLarge?: SplitterExtent;
    doubleClickAction?: SplitterDoubleClickAction;
    label?: string;
    class?: ClassValue;
    children?: Snippet<[{ dragging: boolean; orientation: SplitterOrientation }]>;
}
