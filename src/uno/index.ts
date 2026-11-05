import extractorSvelte from "@unocss/extractor-svelte";
import { presetWind4, transformerDirectives, transformerVariantGroup, type Preset } from "unocss";

import { rules } from "./rules/index";
import { shortcuts } from "./shortcuts/index";
import { fonts, theme } from "./theme/index";
import { variants } from "./variants/index";

export function presetCS(): Preset {
    return {
        name: "preset-cs",
        presets: [
            presetWind4({
                preflights: {
                    reset: false,
                },
                dark: {
                    dark: '[data-theme="dark"]',
                    light: '[data-theme="light"]',
                },
            }),
        ],
        extractors: [extractorSvelte()],
        transformers: [transformerDirectives(), transformerVariantGroup()],
        variants,
        theme,
        // presetWind4 ships its font stacks as arrays and keeps them when merged, so enforce ours afterwards.
        extendTheme: (base) => {
            Object.assign((base as { font: Record<string, string> }).font, fonts);
        },
        shortcuts,
        rules,
    };
}

export { rules } from "./rules/index";
export { shortcuts } from "./shortcuts/index";
export { theme } from "./theme/index";
export { variants } from "./variants/index";
