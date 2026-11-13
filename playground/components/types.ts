export const PREVIEW_CATEGORIES = ["primitives", "attachments", "work"] as const;

export type PreviewCategory = (typeof PREVIEW_CATEGORIES)[number];

export const PREVIEW_CATEGORY_LABELS: Record<PreviewCategory, string> = {
    primitives: "Primitives",
    attachments: "Attachments",
    work: "Work",
};
