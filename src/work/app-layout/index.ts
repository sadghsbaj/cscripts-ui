import type { HTMLAttributes } from "svelte/elements";

export { default as WorkAppFrame } from "./WorkAppFrame.svelte";
export { default as WorkAppHeader } from "./WorkAppHeader.svelte";
export { default as WorkAppHeaderSegment } from "./WorkAppHeaderSegment.svelte";
export { default as WorkAppMain } from "./WorkAppMain.svelte";
export { default as WorkAppSignature } from "./WorkAppSignature.svelte";
export { default as WorkAppBrand } from "./WorkAppBrand.svelte";
export { default as WorkAppViewStage } from "./WorkAppViewStage.svelte";
export {
    WORK_APP_VIEW_TRANSITION_AXES,
    WORK_APP_VIEW_TRANSITION_DIRECTIONS,
    workAppViewIn,
    workAppViewOut,
    type WorkAppViewTransitionAxis,
    type WorkAppViewTransitionDirection,
    type WorkAppViewTransitionOptions,
} from "./work-app-view-transition.ts";

export type WorkAppViewKey = string | number;

export interface WorkAppViewStageProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLElement | null;
    activeKey?: WorkAppViewKey;
    scrollContainer?: HTMLElement | Window | null;
    restoreScroll?: boolean;
}

export const WORK_APP_HEADER_SEGMENT_ALIGNMENTS = ["before", "start", "center", "end", "after"] as const;
export type WorkAppHeaderSegmentAlignment = (typeof WORK_APP_HEADER_SEGMENT_ALIGNMENTS)[number];

export interface WorkAppHeaderSegmentProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLElement | null;
    align: WorkAppHeaderSegmentAlignment;
    renderIsland?: boolean;
    /** @deprecated Use `renderIsland` instead. */
    island?: boolean;
}

export interface WorkAppFrameProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Whether to render the bottom-right `<WorkAppSignature />` watermark automatically.
     * @default true
     */
    showSignature?: boolean;
}

export interface WorkAppHeaderProps extends HTMLAttributes<HTMLElement> {
    toolName?: string;
    /**
     * Whether to render the right-aligned `<WorkAppBrand />` Pfleiderer badge automatically.
     * @default true
     */
    showBrand?: boolean;
}

export type WorkAppMainProps = HTMLAttributes<HTMLElement>;
export interface WorkAppSignatureProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
    /**
     * Tooltip text displayed when hovering the creator info button.
     * @default "Entwickelt von Colin Schäfer"
     */
    text?: string;
}
export type WorkAppBrandProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;
