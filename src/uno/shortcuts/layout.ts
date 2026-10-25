/** Layout helpers. Also drives the eslint `enforce-shortcuts` rule (`src/eslint/shortcuts.ts`). */
export const layoutShortcuts: Record<string, string> = {
    "flex-center": "flex justify-center items-center",
    "absolute-center": "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};
