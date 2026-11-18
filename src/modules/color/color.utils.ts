import {
    buildParsedColorFromSrgb,
    clamp01,
    clampParsedToGamut,
    computeContrastRatio,
    computeRelativeLuminance,
    formatParsedColor,
    isParsedInGamut,
    oklabToOklch,
    parseCssColor,
    srgbToHsl,
    srgbToHsv,
} from "./color-math.internal.ts";

export const COLOR_FORMATS = ["auto", "hex", "hex8", "rgb", "hsl", "oklch", "p3"] as const;
export const COLOR_ALPHA_FORMATS = ["auto", "always", "never"] as const;
export const COLOR_SPACES = ["srgb", "hsl", "hsv", "oklch", "oklab", "p3"] as const;
export const COLOR_GAMUTS = ["srgb", "p3"] as const;

export const COLOR_CHANNELS = [
    "hue",
    "saturation",
    "value",
    "hsl-saturation",
    "lightness",
    "red",
    "green",
    "blue",
    "oklch-lightness",
    "chroma",
    "oklch-hue",
    "alpha",
] as const;

export type ColorFormat = (typeof COLOR_FORMATS)[number];
export type ConcreteColorFormat = Exclude<ColorFormat, "auto">;
export type ColorAlphaFormat = (typeof COLOR_ALPHA_FORMATS)[number];
export type ColorSpace = (typeof COLOR_SPACES)[number];
export type ColorGamut = (typeof COLOR_GAMUTS)[number];
export type ColorChannel = (typeof COLOR_CHANNELS)[number];

export interface ParsedColor {
    /** Source color space detected during parsing ("srgb" for hex/rgb/named). */
    readonly space: ColorSpace;
    /** Normalized source format when parsed from CSS text. */
    readonly sourceFormat: ConcreteColorFormat;
    /** Unclamped gamma-encoded sRGB channels in [0..1] (values outside [0..1] represent out-of-sRGB wide-gamut colors). */
    readonly rgb: readonly [r: number, g: number, b: number];
    /** Gamma-encoded Display P3 channels in [0..1] (same sRGB OETF as CSS `color(display-p3 ...)`). */
    readonly p3: readonly [r: number, g: number, b: number];
    /** Perceptual OKLab coordinates: L in [0..1], a/b unbounded (typically [-0.4..0.4]). */
    readonly oklab: readonly [l: number, a: number, b: number];
    /** Alpha channel clamped to [0..1]. */
    readonly alpha: number;
}

export interface FormatColorOptions {
    /** Alpha emission rule: `"auto"` omits alpha when opaque, `"always"` forces it, `"never"` omits it. */
    alpha?: ColorAlphaFormat;
    /** Decimal precision override for floating-point channels. */
    precision?: number;
    /** Optional target gamut clamp applied before formatting. */
    gamut?: ColorGamut;
}

export type ColorChannelsTuple = readonly [number, number, number];

const FALLBACK_BLACK: ParsedColor = buildParsedColorFromSrgb([0, 0, 0], 1, "srgb", "hex");

function resolveColorInput(color: ParsedColor | string): ParsedColor | null {
    return typeof color === "string" ? parseCssColor(color) : color;
}

/**
 * Parses a CSS color string (`#hex`, `rgb()`, `hsl()`, `hwb()`, `oklab()`, `oklch()`,
 * `color(srgb ...)`, `color(display-p3 ...)`, or standard CSS named color) into a high-precision `ParsedColor`.
 * Returns `null` on invalid input without throwing.
 */
export function parseColor(input: string): ParsedColor | null {
    return parseCssColor(input);
}

/**
 * Formats a `ParsedColor` or valid CSS color string into the specified output format.
 * Defaults to `parsed.sourceFormat` when `format` is omitted.
 */
export function formatColor(
    color: ParsedColor | string,
    format?: ConcreteColorFormat,
    options?: FormatColorOptions
): string {
    const parsed = resolveColorInput(color);
    if (!parsed) return "";
    return formatParsedColor(parsed, format, options);
}

/**
 * Converts a color into a 3-channel tuple for `targetSpace`:
 * - `"srgb"`: `[r, g, b]` in `0..255`
 * - `"hsl"`: `[h (0..360), s (0..100), l (0..100)]`
 * - `"hsv"`: `[h (0..360), s (0..100), v (0..100)]`
 * - `"oklch"`: `[l (0..1), c (0..0.4+), h (0..360)]`
 * - `"oklab"`: `[l (0..1), a, b]`
 * - `"p3"`: `[r, g, b]` in gamma-encoded Display P3 `0..1`
 */
export function convertColor(color: ParsedColor | string, targetSpace: ColorSpace): ColorChannelsTuple {
    const parsed = resolveColorInput(color);
    if (!parsed) return [0, 0, 0];

    switch (targetSpace) {
        case "srgb": {
            return [parsed.rgb[0] * 255, parsed.rgb[1] * 255, parsed.rgb[2] * 255];
        }
        case "hsl": {
            const inSrgb = isParsedInGamut(parsed, "srgb") ? parsed : clampParsedToGamut(parsed, "srgb");
            return srgbToHsl([clamp01(inSrgb.rgb[0]), clamp01(inSrgb.rgb[1]), clamp01(inSrgb.rgb[2])]);
        }
        case "hsv": {
            const inSrgb = isParsedInGamut(parsed, "srgb") ? parsed : clampParsedToGamut(parsed, "srgb");
            return srgbToHsv([clamp01(inSrgb.rgb[0]), clamp01(inSrgb.rgb[1]), clamp01(inSrgb.rgb[2])]);
        }
        case "oklch": {
            return oklabToOklch(parsed.oklab);
        }
        case "oklab": {
            return parsed.oklab;
        }
        case "p3": {
            return parsed.p3;
        }
    }
}

/**
 * Checks whether a color fits inside the `"srgb"` or `"p3"` gamut within a `1e-5` floating-point epsilon.
 */
export function isInGamut(color: ParsedColor | string, gamut: ColorGamut): boolean {
    const parsed = resolveColorInput(color);
    if (!parsed) return false;
    return isParsedInGamut(parsed, gamut);
}

/**
 * Perceptually clamps an out-of-gamut color into `"srgb"` or `"p3"` using CSS Color Level 4
 * OKLCH chroma binary search while holding lightness and hue constant.
 */
export function clampToGamut(color: ParsedColor | string, gamut: ColorGamut): ParsedColor {
    const parsed = resolveColorInput(color);
    if (!parsed) return FALLBACK_BLACK;
    return clampParsedToGamut(parsed, gamut);
}

/**
 * Computes WCAG 2.x relative luminance in `[0..1]` for the sRGB-clamped color.
 */
export function getRelativeLuminance(color: ParsedColor | string): number {
    const parsed = resolveColorInput(color);
    if (!parsed) return 0;
    return computeRelativeLuminance(parsed.rgb);
}

/**
 * Computes WCAG 2.x contrast ratio in `[1..21]` between foreground and background colors,
 * alpha-compositing translucent foregrounds over the background.
 */
export function getContrastRatio(fg: ParsedColor | string, bg: ParsedColor | string): number {
    const fgParsed = resolveColorInput(fg);
    const bgParsed = resolveColorInput(bg);
    if (!fgParsed || !bgParsed) return 1;
    return computeContrastRatio(fgParsed, bgParsed);
}

/**
 * SSR-safe capability check for the Chromium `EyeDropper` API.
 */
export function isEyeDropperSupported(): boolean {
    return typeof window !== "undefined" && "EyeDropper" in window;
}
