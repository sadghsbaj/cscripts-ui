import type { HTMLAttributes, HTMLImgAttributes } from "svelte/elements";

export { default as WorkAppFrame } from "./WorkAppFrame.svelte";
export { default as WorkAppHeader } from "./WorkAppHeader.svelte";
export { default as WorkAppMain } from "./WorkAppMain.svelte";
export { default as WorkAppSignature } from "./WorkAppSignature.svelte";
export { default as WorkAppBrand } from "./WorkAppBrand.svelte";

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
export type WorkAppBrandProps = Omit<HTMLImgAttributes, "src" | "children">;
