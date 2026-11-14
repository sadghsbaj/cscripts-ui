export const PREVIEW_CATEGORIES = ["modules", "work"] as const;

export type PreviewCategory = (typeof PREVIEW_CATEGORIES)[number];

export const PREVIEW_CATEGORY_LABELS: Record<PreviewCategory, string> = {
    modules: "Modules",
    work: "Work",
};
