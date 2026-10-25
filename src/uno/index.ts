import extractorSvelte from "@unocss/extractor-svelte";
import { presetWind4, transformerDirectives, transformerVariantGroup, type Preset, type Variant } from "unocss";

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const EASE_FAMILIES = ["sine", "quad", "cubic", "quart", "quint", "expo", "circ", "back"] as const;
const EASE_DIRS = ["in", "out", "in-out"] as const;

const SCROLLBAR_SIZE_MAP = {
    sm: { size: "8px", firefoxWidth: "thin" },
    md: { size: "10px", firefoxWidth: "auto" },
    lg: { size: "12px", firefoxWidth: "auto" },
} as const;

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

const variantsConfig: Variant[] = [
    // Hover: High priority over presetWind4, fine pointer media query, excluding disabled and busy states
    {
        name: "cs-hover",
        order: -1,
        match(matcher) {
            if (!matcher.startsWith("hover:")) return;
            return {
                matcher: matcher.slice(6),
                parent: "@media (hover: hover) and (pointer: fine)",
                selector: (s) => `${s}:hover:not([aria-disabled="true"], [aria-busy="true"], :disabled)`,
            };
        },
    },

    // Active: High priority over presetWind4, excluding disabled and busy states
    {
        name: "cs-active",
        order: -1,
        match(matcher) {
            if (!matcher.startsWith("active:")) return;
            return {
                matcher: matcher.slice(7),
                selector: (s) => `${s}:active:not([aria-disabled="true"], [aria-busy="true"], :disabled)`,
            };
        },
    },

    // Disabled: High priority over presetWind4, matching native disabled and aria-disabled
    {
        name: "cs-disabled",
        order: -1,
        match(matcher) {
            if (!matcher.startsWith("disabled:")) return;
            return {
                matcher: matcher.slice(9),
                selector: (s) => `${s}:is(:disabled, [aria-disabled="true"])`,
            };
        },
    },
];

export function presetCS(): Preset {
    return {
        name: "preset-cs",
        presets: [presetWind4()],
        extractors: [extractorSvelte()],
        transformers: [transformerDirectives(), transformerVariantGroup()],
        variants: variantsConfig,
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

            [
                "text-trim",
                {
                    "text-box-trim": "trim-both",
                    "text-box-edge": "cap alphabetic",
                    "text-box": "trim-both cap alphabetic",
                },
            ],

            [
                "text-trim-truncate",
                {
                    "text-box-trim": "trim-both",
                    "text-box-edge": "cap alphabetic",
                    "text-box": "trim-both cap alphabetic",
                    "min-width": "0",
                    "overflow-x": "clip",
                    "overflow-y": "visible",
                    "text-overflow": "ellipsis",
                    "white-space": "nowrap",
                },
            ],

            [
                /^scrollbar-(sm|md|lg)$/,
                ([, size], { symbols }) => {
                    const values = SCROLLBAR_SIZE_MAP[size as keyof typeof SCROLLBAR_SIZE_MAP];
                    return [
                        {
                            "--cs-scrollbar-size": values.size,
                        },
                        {
                            [symbols.parent]: "@supports (-moz-appearance: none)",
                            "scrollbar-width": values.firefoxWidth,
                        },
                        {
                            [symbols.selector]: (s: string) => `${s}::-webkit-scrollbar`,
                            width: values.size,
                            height: values.size,
                        },
                    ];
                },
                { autocomplete: "scrollbar-(sm|md|lg)" },
            ],

            [
                /^(?:no-scrollbar|scrollbar-none)$/,
                (_, { symbols }) => [
                    {
                        "-ms-overflow-style": "none",
                        "scrollbar-width": "none",
                    },
                    {
                        [symbols.selector]: (s: string) => `${s}::-webkit-scrollbar`,
                        display: "none",
                    },
                ],
                { autocomplete: ["no-scrollbar", "scrollbar-none"] },
            ],
        ],
    };
}
