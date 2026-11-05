import type { HTMLAttributes, HTMLImgAttributes } from "svelte/elements";

export { default as WorkAppFrame } from "./WorkAppFrame.svelte";
export { default as WorkAppHeader } from "./WorkAppHeader.svelte";
export { default as WorkAppMain } from "./WorkAppMain.svelte";
export { default as WorkAppSignature } from "./WorkAppSignature.svelte";
export { default as WorkAppBrand } from "./WorkAppBrand.svelte";

export type WorkAppFrameProps = HTMLAttributes<HTMLDivElement>;
export interface WorkAppHeaderProps extends HTMLAttributes<HTMLElement> {
    toolName?: string;
}
export type WorkAppMainProps = HTMLAttributes<HTMLElement>;
export type WorkAppSignatureProps = Omit<HTMLAttributes<HTMLSpanElement>, "children">;
export type WorkAppBrandProps = Omit<HTMLImgAttributes, "src" | "children">;
