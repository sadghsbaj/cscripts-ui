import type { HTMLAttributes } from "svelte/elements";

export { default as Progress } from "./Progress.svelte";

export const PROGRESS_APPEARANCES = ["bar", "dashed", "dotted"] as const;
export const PROGRESS_VARIANTS = ["soft", "elevated"] as const;
export const PROGRESS_COLORS = ["base", "accent", "positive", "caution", "negative"] as const;
export const PROGRESS_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export const PROGRESS_ORIENTATIONS = ["horizontal", "vertical"] as const;

export type ProgressAppearance = (typeof PROGRESS_APPEARANCES)[number];
export type ProgressVariant = (typeof PROGRESS_VARIANTS)[number];
export type ProgressColor = (typeof PROGRESS_COLORS)[number];
export type ProgressSize = (typeof PROGRESS_SIZES)[number];
export type ProgressOrientation = (typeof PROGRESS_ORIENTATIONS)[number];

export type ProgressProps = Omit<HTMLAttributes<HTMLDivElement>, "color"> & {
    ref?: HTMLDivElement | null;
    appearance: ProgressAppearance;
    variant: ProgressVariant;
    size: ProgressSize;
    color?: ProgressColor;
    orientation?: ProgressOrientation;
    value?: number | null;
    min?: number;
    max?: number;
    segments?: number;
};
