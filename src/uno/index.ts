import extractorSvelte from "@unocss/extractor-svelte";
import { presetWind4, transformerDirectives, transformerVariantGroup, type Preset } from "unocss";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const EASE_FAMILIES = ["sine", "quad", "cubic", "quart", "quint", "expo", "circ", "back"] as const;
const EASE_DIRS = ["in", "out", "in-out"] as const;

function semanticColor(name: string) {
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

function easeCurves() {
    const curves: Record<string, string> = {};

    for (const family of EASE_FAMILIES) {
        for (const dir of EASE_DIRS) {
            const key = `${family}-${dir}`;
            curves[key] = `var(--cs-ease-${key})`;
        }
    }

    return curves;
}

export function presetCS(): Preset {
    return {
        name: "preset-cs",
        presets: [presetWind4()],
        extractors: [extractorSvelte()],
        transformers: [transformerDirectives(), transformerVariantGroup()],
        theme: {
            font: {
                sans: "var(--cs-font-sans)",
                mono: "var(--cs-font-mono)",
            },
            colors: {
                base: semanticColor("base"),
                accent: semanticColor("accent"),
                success: semanticColor("success"),
                warning: semanticColor("warning"),
                danger: semanticColor("danger"),
                info: semanticColor("info"),
            },
            ease: easeCurves(),
        },
        rules: [
            [/^text-(strong|main|weak|weaker)$/, ([, level]) => ({ color: `var(--cs-color-text-${level})` })],

            [/^bg-elevation-([012])$/, ([, level]) => ({ "background-color": `var(--cs-color-elevation-${level})` })],

            [
                /^squircle(?:-(smooth|soft))?$/,
                ([, type]) => ({ "corner-shape": `var(--cs-squircle${type ? `-${type}` : ""})` }),
            ],
        ],
    };
}
