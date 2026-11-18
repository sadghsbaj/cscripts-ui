import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

import type {
    VirtualScrollController,
    VirtualScrollKey,
    VirtualScrollOrientation,
    VirtualScrollRange,
    VirtualScrollTarget,
} from "./virtual-scroll.svelte.ts";

export { default as VirtualScroll } from "./VirtualScroll.svelte";

export {
    createVirtualScroll,
    VirtualScrollController,
    VIRTUAL_SCROLL_ALIGNS,
    VIRTUAL_SCROLL_ORIENTATIONS,
    VIRTUAL_SCROLL_TARGETS,
    type MaybeGetter,
    type VirtualScrollAlign,
    type VirtualScrollItem,
    type VirtualScrollItemAriaOptions,
    type VirtualScrollItemAriaProps,
    type VirtualScrollKey,
    type VirtualScrollOptions,
    type VirtualScrollOrientation,
    type VirtualScrollRange,
    type VirtualScrollScrollToIndexOptions,
    type VirtualScrollScrollToOffsetOptions,
    type VirtualScrollTarget,
} from "./virtual-scroll.svelte.ts";

export interface VirtualScrollProps<T = unknown> extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
    ref?: HTMLDivElement | null;
    listRef?: HTMLElement | null;
    controller?: VirtualScrollController | null;
    items: readonly T[];
    as?: "div" | "ul" | "ol";
    role?: HTMLAttributes<HTMLElement>["role"];
    listClass?: string;
    estimateSize: number | ((index: number) => number);
    fixed?: boolean;
    orientation?: VirtualScrollOrientation;
    overscan?: number;
    gap?: number;
    lanes?: number;
    scrollTarget?: VirtualScrollTarget;
    getItemKey?: (index: number) => VirtualScrollKey;
    initialViewportSize?: number;
    initialRenderCount?: number;
    onRangeChange?: (range: VirtualScrollRange) => void;
    children: Snippet<[item: T, index: number]>;
}
