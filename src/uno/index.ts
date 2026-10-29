import extractorSvelte from "@unocss/extractor-svelte";
import { presetWind4, transformerDirectives, transformerVariantGroup, type Preset } from "unocss";

import { rules } from "./rules/index.ts";
import { shortcuts } from "./shortcuts/index.ts";
import { fonts, theme } from "./theme/index.ts";
import { variants } from "./variants/index.ts";

export function presetCS(): Preset {
    return {
        name: "preset-cs",
        presets: [
            presetWind4({
                preflights: {
                    reset: false,
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

export { rules } from "./rules/index.ts";
export { shortcuts } from "./shortcuts/index.ts";
export { theme } from "./theme/index.ts";
export { variants } from "./variants/index.ts";
