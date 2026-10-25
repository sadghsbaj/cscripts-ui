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

function semanticColor(name: string): Record<string, string> {
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

function easeCurves(): Record<string, string> {
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
        shortcuts: {
            // --- Layout & Indicators ---
            "flex-center": "flex justify-center items-center",
            "absolute-center": "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "dot-sm": "inline-block align-middle size-3px rounded-full bg-current opacity-40 shrink-0 select-none",
            "dot-md": "inline-block align-middle size-4px rounded-full bg-current opacity-40 shrink-0 select-none",
            "dot-lg": "inline-block align-middle size-5px rounded-full bg-current opacity-40 shrink-0 select-none",

            // --- Titles ---
            "title-xs": "text-xs font-600 leading-snug tracking-tight text-strong",
            "title-sm": "text-sm font-600 leading-snug tracking-tight text-strong",
            "title-md": "text-base font-600 leading-snug tracking-tight text-strong",
            "title-lg": "text-lg font-700 leading-tight tracking-tight text-strong",
            "title-xl": "text-xl font-700 leading-tight tracking-tight text-strong",
            "title-2xl": "text-2xl font-700 leading-tight tracking-tight text-strong",
            "title-3xl": "text-3xl font-700 leading-none tracking-tight text-strong",

            // --- Subtitles ---
            "subtitle-xs": "text-11px font-400 leading-normal text-weak",
            "subtitle-sm": "text-xs font-400 leading-normal text-weak",
            "subtitle-md": "text-sm font-400 leading-normal text-weak",
            "subtitle-lg": "text-base font-400 leading-relaxed text-weak",
            "subtitle-xl": "text-lg font-400 leading-relaxed text-weak",

            // --- Labels (Form Controls, Interactive Elements) ---
            "label-xs": "text-[11px] font-500 leading-none select-none text-strong",
            "label-sm": "text-xs font-500 leading-none select-none text-strong",
            "label-md": "text-sm font-500 leading-none select-none text-strong",
            "label-lg": "text-base font-500 leading-none select-none text-strong",

            // --- Descriptions / Hints ---
            "description-xs": "text-11px font-400 leading-normal text-weak",
            "description-sm": "text-xs font-400 leading-normal text-weak",
            "description-md": "text-sm font-400 leading-relaxed text-weak",
            "description-lg": "text-base font-400 leading-relaxed text-weak",

            // --- Body Copy ---
            "body-xs": "text-xs font-400 leading-normal text-main",
            "body-sm": "text-sm font-400 leading-relaxed text-main",
            "body-md": "text-base font-400 leading-relaxed text-main",
            "body-lg": "text-lg font-400 leading-relaxed text-main",
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
