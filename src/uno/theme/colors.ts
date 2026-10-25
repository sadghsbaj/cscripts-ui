export const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

/** Maps a semantic color family onto its `--cs-color-*` CSS variables (shades + soft/solid scale). */
export function semanticColor(name: string): Record<string, string> {
    const scale: Record<string, string> = {
        soft: `var(--cs-color-${name}-soft)`,
        "soft-hover": `var(--cs-color-${name}-soft-hover)`,
        solid: `var(--cs-color-${name}-solid)`,
        "solid-hover": `var(--cs-color-${name}-solid-hover)`,
    };

    for (const shade of SHADES) {
        scale[shade] = `var(--cs-color-${name}-${shade})`;
    }

    return scale;
}

export const colors = {
    base: semanticColor("base"),
    accent: semanticColor("accent"),
    success: semanticColor("success"),
    warning: semanticColor("warning"),
    danger: semanticColor("danger"),
    info: semanticColor("info"),
};
