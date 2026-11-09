import type { HTMLAttributes } from "svelte/elements";

import type { ButtonProps } from "../../components/button/index.ts";

export { default as WorkAppFrame } from "./WorkAppFrame.svelte";
export { default as WorkAppHeader } from "./WorkAppHeader.svelte";
export { default as WorkAppHeaderSegment } from "./WorkAppHeaderSegment.svelte";
export { default as WorkAppThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppHeaderThemeButton } from "./WorkAppThemeButton.svelte";
export { default as WorkAppMain } from "./WorkAppMain.svelte";
export { default as WorkAppSignature } from "./WorkAppSignature.svelte";
export { default as WorkAppBrand } from "./WorkAppBrand.svelte";

export type WorkAppThemeButtonProps = Omit<ButtonProps, "children" | "color" | "iconOnly" | "size" | "variant"> & {
    "aria-label"?: string;
};

export const WORK_APP_HEADER_SEGMENT_ALIGNMENTS = ["start", "center", "end"] as const;
export type WorkAppHeaderSegmentAlignment = (typeof WORK_APP_HEADER_SEGMENT_ALIGNMENTS)[number];

export interface WorkAppHeaderSegmentProps extends HTMLAttributes<HTMLDivElement> {
    align: WorkAppHeaderSegmentAlignment;
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
export type WorkAppSignatureProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;
export type WorkAppBrandProps = Omit<HTMLAttributes<HTMLDivElement>, "children">;
