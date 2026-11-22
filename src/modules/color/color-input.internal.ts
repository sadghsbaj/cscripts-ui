import { clampChannel, getChannelMeta, roundToPrecision } from "./color-channel.internal.ts";
import {
    formatColor,
    parseColor,
    type ColorAlphaFormat,
    type ColorChannel,
    type ColorFormat,
    type ConcreteColorFormat,
    type ParsedColor,
} from "./color.utils.ts";

const BARE_HEX_RE = /^[\da-f]{3,4}$|^[\da-f]{6}$|^[\da-f]{8}$/i;
const STRICT_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function isHexColorFormat(format: ConcreteColorFormat): boolean {
    return format === "hex" || format === "hex8";
}

export function resolveColorInputFormat(
    formatProp: ColorFormat | undefined,
    pickerFormat: ColorFormat | undefined,
    parsedSourceFormat?: ConcreteColorFormat
): ConcreteColorFormat {
    if (formatProp && formatProp !== "auto") {
        return formatProp;
    }
    if (pickerFormat && pickerFormat !== "auto") {
        return pickerFormat;
    }
    return parsedSourceFormat ?? "hex";
}

export function parseFullColorInput(raw: string, allowBareHex: boolean): ParsedColor | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (allowBareHex && !trimmed.startsWith("#") && BARE_HEX_RE.test(trimmed)) {
        return parseColor(`#${trimmed}`);
    }

    return parseColor(trimmed);
}

export function formatFullColorValue(
    color: ParsedColor | string,
    format: ConcreteColorFormat,
    alpha: ColorAlphaFormat
): string {
    return formatColor(color, format, { alpha });
}

export function stripHexPrefix(formatted: string, strip: boolean): string {
    if (strip && formatted.startsWith("#")) {
        return formatted.slice(1);
    }
    return formatted;
}

export function isPercentScaledChannel(channel: ColorChannel): boolean {
    return channel === "alpha" || channel === "oklch-lightness";
}

export function getChannelUnit(channel: ColorChannel): string {
    switch (channel) {
        case "hue":
        case "oklch-hue": {
            return "°";
        }
        case "saturation":
        case "value":
        case "hsl-saturation":
        case "lightness":
        case "oklch-lightness":
        case "alpha": {
            return "%";
        }
        case "red":
        case "green":
        case "blue":
        case "chroma": {
            return "";
        }
    }
}

export function formatChannelDisplay(channel: ColorChannel, rawValue: number, showUnit: boolean): string {
    const clamped = clampChannel(channel, rawValue);
    const meta = getChannelMeta(channel);
    const unit = showUnit ? getChannelUnit(channel) : "";

    if (isPercentScaledChannel(channel)) {
        const percent = roundToPrecision(clamped * 100, 0);
        return `${percent}${unit}`;
    }

    if (meta.precision > 0) {
        return `${clamped.toFixed(meta.precision)}${unit}`;
    }

    return `${roundToPrecision(clamped, 0)}${unit}`;
}

export function parseChannelInput(channel: ColorChannel, raw: string): number | null {
    const cleaned = raw
        .trim()
        .replace(/[%°]\s*$/, "")
        .trim();
    if (!cleaned || !STRICT_NUMBER_RE.test(cleaned)) {
        return null;
    }

    const numeric = Number(cleaned);
    if (!Number.isFinite(numeric)) {
        return null;
    }

    const scaled = isPercentScaledChannel(channel) ? numeric / 100 : numeric;
    return clampChannel(channel, scaled);
}
