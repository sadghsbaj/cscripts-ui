import type { HTMLButtonAttributes } from "svelte/elements";

export { default as CloseButton } from "./CloseButton.svelte";

export const CLOSE_BUTTON_VARIANTS = ["soft", "ghost", "elevated"] as const;
export const CLOSE_BUTTON_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

export type CloseButtonVariant = (typeof CLOSE_BUTTON_VARIANTS)[number];
export type CloseButtonSize = (typeof CLOSE_BUTTON_SIZES)[number];

export interface CloseButtonProps extends Omit<HTMLButtonAttributes, "type"> {
    variant: CloseButtonVariant;
    size: CloseButtonSize;
}
