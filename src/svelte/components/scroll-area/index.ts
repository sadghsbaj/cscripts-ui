import { createContext } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

import type { ScrollAreaManager } from "./scrollAreaState.svelte.ts";

export { default as ScrollArea } from "./ScrollArea.svelte";
export { default as ScrollAreaContent } from "./ScrollAreaContent.svelte";

export const SCROLL_AREA_SIZES = ["sm", "md", "lg"] as const;
export const SCROLL_AREA_DIRECTIONS = ["vertical", "horizontal", "both"] as const;
export const SCROLL_AREA_SCROLLBARS = ["hover", "scroll", "always", "never"] as const;

export type ScrollAreaSize = (typeof SCROLL_AREA_SIZES)[number];
export type ScrollAreaDirection = (typeof SCROLL_AREA_DIRECTIONS)[number];
export type ScrollAreaScrollbar = (typeof SCROLL_AREA_SCROLLBARS)[number];

export interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {
    size: ScrollAreaSize;
    direction: ScrollAreaDirection;
    scrollbar?: ScrollAreaScrollbar;
    overshoot?: boolean;
}

export type ScrollAreaContentProps = HTMLAttributes<HTMLDivElement>;

export const [getScrollAreaContext, setScrollAreaContext, hasScrollAreaContext] =
    createContext<ScrollAreaManager>();
