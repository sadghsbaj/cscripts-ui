export const PREVIEW_CATEGORIES = ["modules", "work", "references"] as const;

export type PreviewCategory = (typeof PREVIEW_CATEGORIES)[number];

export type PreviewLayout = "default" | "stage";

export const PREVIEW_CATEGORY_LABELS: Record<PreviewCategory, string> = {
    modules: "Modules",
    work: "Work",
    references: "References",
};
