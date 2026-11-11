import type { HTMLAttributes } from "svelte/elements";

export { default as Overlay } from "./Overlay.svelte";
export * from "./top-layer.attach.ts";

export const OVERLAY_VARIANTS = ["blur", "dim", "subtle", "opaque", "transparent"] as const;
export type OverlayVariant = (typeof OVERLAY_VARIANTS)[number];

export interface OverlayProps extends Omit<HTMLAttributes<HTMLDivElement>, "popover"> {
    variant: OverlayVariant;
}
