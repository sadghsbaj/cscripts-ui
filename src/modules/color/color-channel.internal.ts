import { t } from "../../shared/lang.internal.ts";
import {
    buildParsedColorFromOklab,
    buildParsedColorFromSrgb,
    clamp,
    clamp01,
    clampParsedToGamut,
    hslToSrgb,
    hsvToSrgb,
    isParsedInGamut,
    normalizeHue,
    oklabToOklch,
    oklchToOklab,
    parseCssColor,
    srgbToHsl,
    srgbToHsv,
    type Vec3,
} from "./color-math.internal.ts";
import type { ColorChannelSnapshot } from "./color-state.svelte.ts";
import type { ColorChannel, ParsedColor } from "./color.utils.ts";

export interface ColorChannelMeta {
    readonly min: number;
    readonly max: number;
    readonly step: number;
    readonly largeStep: number;
    readonly precision: number;
    readonly defaultValue: number;
    readonly label: string;
    readonly formatValueText: (value: number) => string;
}

export type SliderGradientDirection = "to right" | "to left" | "to top" | "to bottom";

const DEFAULT_FALLBACK_COLOR = "#3B82F6";

export const COLOR_CHANNEL_META: Readonly<Record<ColorChannel, ColorChannelMeta>> = {
    hue: {
        min: 0,
        max: 360,
        step: 1,
        largeStep: 15,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Farbton", en: "Hue" }),
        formatValueText: (value) => `${Math.round(value)}°`,
    },
    saturation: {
        min: 0,
        max: 100,
        step: 1,
        largeStep: 10,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Sättigung", en: "Saturation" }),
        formatValueText: (value) => `${Math.round(value)}%`,
    },
    value: {
        min: 0,
        max: 100,
        step: 1,
        largeStep: 10,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Helligkeit", en: "Value" }),
        formatValueText: (value) => `${Math.round(value)}%`,
    },
    "hsl-saturation": {
        min: 0,
        max: 100,
        step: 1,
        largeStep: 10,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Sättigung", en: "Saturation" }),
        formatValueText: (value) => `${Math.round(value)}%`,
    },
    lightness: {
        min: 0,
        max: 100,
        step: 1,
        largeStep: 10,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Helligkeit", en: "Lightness" }),
        formatValueText: (value) => `${Math.round(value)}%`,
    },
    red: {
        min: 0,
        max: 255,
        step: 1,
        largeStep: 15,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Rot", en: "Red" }),
        formatValueText: (value) => `${Math.round(value)}`,
    },
    green: {
        min: 0,
        max: 255,
        step: 1,
        largeStep: 15,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Grün", en: "Green" }),
        formatValueText: (value) => `${Math.round(value)}`,
    },
    blue: {
        min: 0,
        max: 255,
        step: 1,
        largeStep: 15,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Blau", en: "Blue" }),
        formatValueText: (value) => `${Math.round(value)}`,
    },
    "oklch-lightness": {
        min: 0,
        max: 1,
        step: 0.01,
        largeStep: 0.1,
        precision: 2,
        defaultValue: 0,
        label: t({ de: "Helligkeit", en: "Lightness" }),
        formatValueText: (value) => `${Math.round(value * 100)}%`,
    },
    chroma: {
        min: 0,
        max: 0.4,
        step: 0.005,
        largeStep: 0.02,
        precision: 3,
        defaultValue: 0,
        label: t({ de: "Chroma", en: "Chroma" }),
        formatValueText: (value) => value.toFixed(3),
    },
    "oklch-hue": {
        min: 0,
        max: 360,
        step: 1,
        largeStep: 15,
        precision: 0,
        defaultValue: 0,
        label: t({ de: "Farbton", en: "Hue" }),
        formatValueText: (value) => `${Math.round(value)}°`,
    },
    alpha: {
        min: 0,
        max: 1,
        step: 0.01,
        largeStep: 0.1,
        precision: 2,
        defaultValue: 1,
        label: t({ de: "Deckkraft", en: "Alpha" }),
        formatValueText: (value) => `${Math.round(value * 100)}%`,
    },
};

export function getChannelMeta(channel: ColorChannel): ColorChannelMeta {
    return COLOR_CHANNEL_META[channel];
}

export function roundToPrecision(value: number, precision: number): number {
    if (!Number.isFinite(value)) return 0;
    const factor = 10 ** precision;
    const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
    return Object.is(rounded, -0) ? 0 : rounded;
}

export function clampChannel(channel: ColorChannel, value: number): number {
    const meta = COLOR_CHANNEL_META[channel];
    if (!Number.isFinite(value)) return meta.defaultValue;
    return roundToPrecision(clamp(value, meta.min, meta.max), meta.precision);
}

export function stepChannelValue(channel: ColorChannel, current: number, delta: number): number {
    const meta = COLOR_CHANNEL_META[channel];
    return roundToPrecision(clamp(current + delta, meta.min, meta.max), meta.precision);
}

export function extractChannelFromSnapshot(channel: ColorChannel, snapshot: ColorChannelSnapshot): number {
    switch (channel) {
        case "hue": {
            return snapshot.hsv.h;
        }
        case "saturation": {
            return snapshot.hsv.s;
        }
        case "value": {
            return snapshot.hsv.v;
        }
        case "hsl-saturation": {
            return snapshot.hsl.s;
        }
        case "lightness": {
            return snapshot.hsl.l;
        }
        case "red": {
            return snapshot.rgb.r;
        }
        case "green": {
            return snapshot.rgb.g;
        }
        case "blue": {
            return snapshot.rgb.b;
        }
        case "oklch-lightness": {
            return snapshot.oklch.l;
        }
        case "chroma": {
            return snapshot.oklch.c;
        }
        case "oklch-hue": {
            return snapshot.oklch.h;
        }
        case "alpha": {
            return snapshot.alpha;
        }
    }
}

export function buildSnapshotFromColor(colorString?: string): ColorChannelSnapshot {
    const parsed: ParsedColor =
        (colorString ? parseCssColor(colorString) : null) ??
        parseCssColor(DEFAULT_FALLBACK_COLOR) ??
        buildParsedColorFromSrgb([0.231, 0.51, 0.965], 1, "srgb", "hex");

    const srgbInGamut = isParsedInGamut(parsed, "srgb") ? parsed : clampParsedToGamut(parsed, "srgb");
    const srgb01: Vec3 = [
        clamp01(srgbInGamut.rgb[0]),
        clamp01(srgbInGamut.rgb[1]),
        clamp01(srgbInGamut.rgb[2]),
    ];

    const [hsvH, hsvS, hsvV] = srgbToHsv(srgb01);
    const [hslH, hslS, hslL] = srgbToHsl(srgb01);
    const [oklchL, oklchC, oklchH] = oklabToOklch(parsed.oklab);

    return {
        hsv: { h: hsvH, s: hsvS, v: hsvV },
        hsl: { h: hslH, s: hslS, l: hslL },
        oklch: { l: clamp01(oklchL), c: Math.max(0, oklchC), h: oklchH },
        rgb: {
            r: clamp(parsed.rgb[0] * 255, 0, 255),
            g: clamp(parsed.rgb[1] * 255, 0, 255),
            b: clamp(parsed.rgb[2] * 255, 0, 255),
        },
        p3: {
            r: parsed.p3[0],
            g: parsed.p3[1],
            b: parsed.p3[2],
        },
        alpha: parsed.alpha,
    };
}

export function mergeChannelIntoSnapshot(
    snapshot: ColorChannelSnapshot,
    channel: ColorChannel,
    nextValue: number
): ColorChannelSnapshot {
    const val = clampChannel(channel, nextValue);

    switch (channel) {
        case "hue": {
            const h = normalizeHue(val);
            const srgb = hsvToSrgb(h, snapshot.hsv.s, snapshot.hsv.v);
            const parsed = buildParsedColorFromSrgb(srgb, snapshot.alpha, "hsv", "hsl");
            const oklch = oklabToOklch(parsed.oklab);
            return {
                ...snapshot,
                hsv: { ...snapshot.hsv, h },
                hsl: { ...snapshot.hsl, h },
                oklch: { l: oklch[0], c: oklch[1], h: oklch[2] },
                rgb: { r: srgb[0] * 255, g: srgb[1] * 255, b: srgb[2] * 255 },
            };
        }
        case "saturation": {
            const srgb = hsvToSrgb(snapshot.hsv.h, val, snapshot.hsv.v);
            const hsl = srgbToHsl(srgb);
            return {
                ...snapshot,
                hsv: { ...snapshot.hsv, s: val },
                hsl: { h: hsl[0], s: hsl[1], l: hsl[2] },
                rgb: { r: srgb[0] * 255, g: srgb[1] * 255, b: srgb[2] * 255 },
            };
        }
        case "value": {
            const srgb = hsvToSrgb(snapshot.hsv.h, snapshot.hsv.s, val);
            const hsl = srgbToHsl(srgb);
            return {
                ...snapshot,
                hsv: { ...snapshot.hsv, v: val },
                hsl: { h: hsl[0], s: hsl[1], l: hsl[2] },
                rgb: { r: srgb[0] * 255, g: srgb[1] * 255, b: srgb[2] * 255 },
            };
        }
        case "hsl-saturation": {
            const srgb = hslToSrgb(snapshot.hsl.h, val, snapshot.hsl.l);
            const hsv = srgbToHsv(srgb);
            return {
                ...snapshot,
                hsl: { ...snapshot.hsl, s: val },
                hsv: { h: hsv[0], s: hsv[1], v: hsv[2] },
                rgb: { r: srgb[0] * 255, g: srgb[1] * 255, b: srgb[2] * 255 },
            };
        }
        case "lightness": {
            const srgb = hslToSrgb(snapshot.hsl.h, snapshot.hsl.s, val);
            const hsv = srgbToHsv(srgb);
            return {
                ...snapshot,
                hsl: { ...snapshot.hsl, l: val },
                hsv: { h: hsv[0], s: hsv[1], v: hsv[2] },
                rgb: { r: srgb[0] * 255, g: srgb[1] * 255, b: srgb[2] * 255 },
            };
        }
        case "red":
        case "green":
        case "blue": {
            const r = channel === "red" ? val : snapshot.rgb.r;
            const g = channel === "green" ? val : snapshot.rgb.g;
            const b = channel === "blue" ? val : snapshot.rgb.b;
            const srgb: Vec3 = [r / 255, g / 255, b / 255];
            const parsed = buildParsedColorFromSrgb(srgb, snapshot.alpha, "srgb", "rgb");
            const hsv = srgbToHsv(srgb);
            const hsl = srgbToHsl(srgb);
            const oklch = oklabToOklch(parsed.oklab);
            return {
                ...snapshot,
                rgb: { r, g, b },
                hsv: { h: hsv[0], s: hsv[1], v: hsv[2] },
                hsl: { h: hsl[0], s: hsl[1], l: hsl[2] },
                oklch: { l: oklch[0], c: oklch[1], h: oklch[2] },
            };
        }
        case "oklch-lightness":
        case "chroma":
        case "oklch-hue": {
            const l = channel === "oklch-lightness" ? val : snapshot.oklch.l;
            const c = channel === "chroma" ? val : snapshot.oklch.c;
            const h = channel === "oklch-hue" ? normalizeHue(val) : snapshot.oklch.h;
            const oklab = oklchToOklab([l, c, h]);
            const parsed = buildParsedColorFromOklab(oklab, snapshot.alpha, "oklch", "oklch");
            const clamped = clampParsedToGamut(parsed, "srgb");
            return {
                ...snapshot,
                oklch: { l, c, h },
                rgb: {
                    r: clamped.rgb[0] * 255,
                    g: clamped.rgb[1] * 255,
                    b: clamped.rgb[2] * 255,
                },
            };
        }
        case "alpha": {
            return {
                ...snapshot,
                alpha: val,
            };
        }
    }
}

function formatRgbCss(srgb01: Vec3, alpha?: number): string {
    const r = Math.round(clamp01(srgb01[0]) * 255);
    const g = Math.round(clamp01(srgb01[1]) * 255);
    const b = Math.round(clamp01(srgb01[2]) * 255);
    if (alpha !== undefined && alpha < 1) {
        return `rgb(${r} ${g} ${b} / ${roundToPrecision(clamp01(alpha), 3)})`;
    }
    return `rgb(${r} ${g} ${b})`;
}

export function buildSliderGradient(
    channel: ColorChannel,
    snapshot: ColorChannelSnapshot,
    direction: SliderGradientDirection
): string {
    switch (channel) {
        case "hue": {
            return `linear-gradient(${direction}, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)`;
        }
        case "oklch-hue": {
            return `linear-gradient(${direction} in oklch longer hue, oklch(0.7 0.16 0), oklch(0.7 0.16 360))`;
        }
        case "alpha": {
            const r = Math.round(clamp(snapshot.rgb.r, 0, 255));
            const g = Math.round(clamp(snapshot.rgb.g, 0, 255));
            const b = Math.round(clamp(snapshot.rgb.b, 0, 255));
            return `linear-gradient(${direction}, transparent, rgb(${r} ${g} ${b}))`;
        }
        case "saturation": {
            const start = formatRgbCss(hsvToSrgb(snapshot.hsv.h, 0, snapshot.hsv.v));
            const end = formatRgbCss(hsvToSrgb(snapshot.hsv.h, 100, snapshot.hsv.v));
            return `linear-gradient(${direction}, ${start}, ${end})`;
        }
        case "value": {
            const start = formatRgbCss(hsvToSrgb(snapshot.hsv.h, snapshot.hsv.s, 0));
            const end = formatRgbCss(hsvToSrgb(snapshot.hsv.h, snapshot.hsv.s, 100));
            return `linear-gradient(${direction}, ${start}, ${end})`;
        }
        case "hsl-saturation": {
            const start = formatRgbCss(hslToSrgb(snapshot.hsl.h, 0, snapshot.hsl.l));
            const end = formatRgbCss(hslToSrgb(snapshot.hsl.h, 100, snapshot.hsl.l));
            return `linear-gradient(${direction}, ${start}, ${end})`;
        }
        case "lightness": {
            const start = formatRgbCss(hslToSrgb(snapshot.hsl.h, snapshot.hsl.s, 0));
            const mid = formatRgbCss(hslToSrgb(snapshot.hsl.h, snapshot.hsl.s, 50));
            const end = formatRgbCss(hslToSrgb(snapshot.hsl.h, snapshot.hsl.s, 100));
            return `linear-gradient(${direction}, ${start}, ${mid}, ${end})`;
        }
        case "red": {
            const g = Math.round(clamp(snapshot.rgb.g, 0, 255));
            const b = Math.round(clamp(snapshot.rgb.b, 0, 255));
            return `linear-gradient(${direction}, rgb(0 ${g} ${b}), rgb(255 ${g} ${b}))`;
        }
        case "green": {
            const r = Math.round(clamp(snapshot.rgb.r, 0, 255));
            const b = Math.round(clamp(snapshot.rgb.b, 0, 255));
            return `linear-gradient(${direction}, rgb(${r} 0 ${b}), rgb(${r} 255 ${b}))`;
        }
        case "blue": {
            const r = Math.round(clamp(snapshot.rgb.r, 0, 255));
            const g = Math.round(clamp(snapshot.rgb.g, 0, 255));
            return `linear-gradient(${direction}, rgb(${r} ${g} 0), rgb(${r} ${g} 255))`;
        }
        case "oklch-lightness": {
            const c = roundToPrecision(snapshot.oklch.c, 4);
            const h = roundToPrecision(snapshot.oklch.h, 2);
            const stops = [0, 0.2, 0.4, 0.6, 0.8, 1].map((l) => `oklch(${l} ${c} ${h})`).join(", ");
            return `linear-gradient(${direction}, ${stops})`;
        }
        case "chroma": {
            const l = roundToPrecision(snapshot.oklch.l, 4);
            const h = roundToPrecision(snapshot.oklch.h, 2);
            const stops = [0, 0.08, 0.16, 0.24, 0.32, 0.4].map((c) => `oklch(${l} ${c} ${h})`).join(", ");
            return `linear-gradient(${direction}, ${stops})`;
        }
    }
}

export function resolveThumbColor(channel: ColorChannel, snapshot: ColorChannelSnapshot): string {
    switch (channel) {
        case "hue": {
            return `hsl(${roundToPrecision(snapshot.hsv.h, 2)} 100% 50%)`;
        }
        case "oklch-hue": {
            return `oklch(0.7 0.16 ${roundToPrecision(snapshot.oklch.h, 2)})`;
        }
        case "alpha": {
            return formatRgbCss(
                [snapshot.rgb.r / 255, snapshot.rgb.g / 255, snapshot.rgb.b / 255],
                snapshot.alpha
            );
        }
        case "saturation":
        case "value": {
            return formatRgbCss(hsvToSrgb(snapshot.hsv.h, snapshot.hsv.s, snapshot.hsv.v));
        }
        case "hsl-saturation":
        case "lightness": {
            return formatRgbCss(hslToSrgb(snapshot.hsl.h, snapshot.hsl.s, snapshot.hsl.l));
        }
        case "red":
        case "green":
        case "blue": {
            return formatRgbCss([snapshot.rgb.r / 255, snapshot.rgb.g / 255, snapshot.rgb.b / 255]);
        }
        case "oklch-lightness":
        case "chroma": {
            return `oklch(${roundToPrecision(snapshot.oklch.l, 4)} ${roundToPrecision(snapshot.oklch.c, 4)} ${roundToPrecision(snapshot.oklch.h, 2)})`;
        }
    }
}
