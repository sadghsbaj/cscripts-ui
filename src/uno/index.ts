import extractorSvelte from "@unocss/extractor-svelte";
import { presetWind4, transformerDirectives, transformerVariantGroup, type Preset } from "unocss";

export function presetCS(): Preset {
    return {
        name: "preset-cs",
        presets: [presetWind4()],
        extractors: [extractorSvelte()],
        transformers: [transformerDirectives(), transformerVariantGroup()],
        theme: {
            colors: {},
        },
    };
}
