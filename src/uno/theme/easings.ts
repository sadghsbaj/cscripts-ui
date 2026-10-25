export const EASE_FAMILIES = ["sine", "quad", "cubic", "quart", "quint", "expo", "circ", "back"] as const;
export const EASE_DIRS = ["in", "out", "in-out"] as const;

/** Maps every easing family/direction onto its `--cs-ease-*` CSS variable. */
export function easeCurves(): Record<string, string> {
    const curves: Record<string, string> = {};

    for (const family of EASE_FAMILIES) {
        for (const dir of EASE_DIRS) {
            const key = `${family}-${dir}`;
            curves[key] = `var(--cs-ease-${key})`;
        }
    }

    return curves;
}
