import {
    clampChannel,
    getChannelMeta,
    mergeChannelIntoSnapshot,
    roundToPrecision,
    type SliderGradientDirection,
} from "./color-channel.internal.ts";
import {
    buildParsedColorFromOklab,
    clamp,
    clamp01,
    clampParsedToGamut,
    hslToSrgb,
    hsvToSrgb,
    oklchToOklab,
    type Vec3,
} from "./color-math.internal.ts";
import type { ColorChannelSnapshot } from "./color-state.svelte.ts";
import type { ColorChannel } from "./color.utils.ts";

export interface ColorAreaLayer {
    readonly backgroundImage: string;
    readonly blendMode?: "screen";
}

export type ColorAreaPlaneConfig =
    | {
          readonly kind: "css";
          readonly baseColor: string;
          readonly layers: readonly ColorAreaLayer[];
      }
    | {
          readonly kind: "canvas";
      };

const HSV_CHANNELS = new Set<ColorChannel>(["hue", "saturation", "value"]);
const HSL_CHANNELS = new Set<ColorChannel>(["hue", "hsl-saturation", "lightness"]);
const RGB_CHANNELS = new Set<ColorChannel>(["red", "green", "blue"]);
const OKLCH_CHANNELS = new Set<ColorChannel>(["oklch-lightness", "chroma", "oklch-hue"]);

function formatRgbCss(srgb01: Vec3, alpha?: number): string {
    const r = Math.round(clamp01(srgb01[0]) * 255);
    const g = Math.round(clamp01(srgb01[1]) * 255);
    const b = Math.round(clamp01(srgb01[2]) * 255);
    if (alpha !== undefined && alpha < 1) {
        return `rgb(${r} ${g} ${b} / ${roundToPrecision(clamp01(alpha), 3)})`;
    }
    return `rgb(${r} ${g} ${b})`;
}

export function resolveColorAreaChannels(
    space: "hsv" | "hsl" | "oklch" | undefined,
    xChannel: ColorChannel | undefined,
    yChannel: ColorChannel | undefined
): { xChannel: ColorChannel; yChannel: ColorChannel } {
    let defaultX: ColorChannel = "saturation";
    let defaultY: ColorChannel = "value";

    if (space === "hsl") {
        defaultX = "hsl-saturation";
        defaultY = "lightness";
    } else if (space === "oklch") {
        defaultX = "chroma";
        defaultY = "oklch-lightness";
    }

    return {
        xChannel: xChannel ?? defaultX,
        yChannel: yChannel ?? defaultY,
    };
}

export function resolveColorAreaPlane(
    xChannel: ColorChannel,
    yChannel: ColorChannel,
    snapshot: ColorChannelSnapshot,
    isRtl: boolean
): ColorAreaPlaneConfig {
    const inlineDir: SliderGradientDirection = isRtl ? "to left" : "to right";

    // HSV fast-path (saturation × value in either axis order)
    if (
        (xChannel === "saturation" && yChannel === "value") ||
        (xChannel === "value" && yChannel === "saturation")
    ) {
        const hue = roundToPrecision(snapshot.hsv.h, 2);
        const satDir: SliderGradientDirection = xChannel === "saturation" ? inlineDir : "to top";
        const valDir: SliderGradientDirection = yChannel === "value" ? "to top" : inlineDir;

        return {
            kind: "css",
            baseColor: "transparent",
            layers: [
                {
                    backgroundImage: `linear-gradient(${valDir}, #000, transparent), linear-gradient(${satDir}, #fff, hsl(${hue} 100% 50%))`,
                },
            ],
        };
    }

    // HSL fast-path (hsl-saturation × lightness in either axis order)
    if (
        (xChannel === "hsl-saturation" && yChannel === "lightness") ||
        (xChannel === "lightness" && yChannel === "hsl-saturation")
    ) {
        const hue = roundToPrecision(snapshot.hsl.h, 2);
        const inlineOppositeDir: SliderGradientDirection = isRtl ? "to right" : "to left";
        const satDir: SliderGradientDirection = xChannel === "hsl-saturation" ? inlineDir : "to top";
        const darkDir: SliderGradientDirection = yChannel === "lightness" ? "to top" : inlineDir;
        const lightDir: SliderGradientDirection = yChannel === "lightness" ? "to bottom" : inlineOppositeDir;

        return {
            kind: "css",
            baseColor: "transparent",
            layers: [
                { backgroundImage: `linear-gradient(${satDir}, #808080, hsl(${hue} 100% 50%))` },
                { backgroundImage: `linear-gradient(${darkDir}, #000, transparent 50%)` },
                { backgroundImage: `linear-gradient(${lightDir}, #fff, transparent 50%)` },
            ],
        };
    }

    // sRGB pair fast-path (red/green/blue with mix-blend-mode: screen)
    if (RGB_CHANNELS.has(xChannel) && RGB_CHANNELS.has(yChannel) && xChannel !== yChannel) {
        const fixedR = xChannel === "red" || yChannel === "red" ? 0 : Math.round(clamp(snapshot.rgb.r, 0, 255));
        const fixedG = xChannel === "green" || yChannel === "green" ? 0 : Math.round(clamp(snapshot.rgb.g, 0, 255));
        const fixedB = xChannel === "blue" || yChannel === "blue" ? 0 : Math.round(clamp(snapshot.rgb.b, 0, 255));

        const channelMaxColor = (ch: ColorChannel): string => {
            if (ch === "red") return "rgb(255 0 0)";
            if (ch === "green") return "rgb(0 255 0)";
            return "rgb(0 0 255)";
        };

        return {
            kind: "css",
            baseColor: `rgb(${fixedR} ${fixedG} ${fixedB})`,
            layers: [
                {
                    backgroundImage: `linear-gradient(${inlineDir}, rgb(0 0 0), ${channelMaxColor(xChannel)})`,
                    blendMode: "screen",
                },
                {
                    backgroundImage: `linear-gradient(to top, rgb(0 0 0), ${channelMaxColor(yChannel)})`,
                    blendMode: "screen",
                },
            ],
        };
    }

    return { kind: "canvas" };
}

export function buildCanvasPlaneSignature(
    xChannel: ColorChannel,
    yChannel: ColorChannel,
    snapshot: ColorChannelSnapshot,
    isRtl: boolean
): string {
    if (OKLCH_CHANNELS.has(xChannel) && OKLCH_CHANNELS.has(yChannel)) {
        const l = xChannel === "oklch-lightness" || yChannel === "oklch-lightness" ? "_" : roundToPrecision(snapshot.oklch.l, 4);
        const c = xChannel === "chroma" || yChannel === "chroma" ? "_" : roundToPrecision(snapshot.oklch.c, 4);
        const h = xChannel === "oklch-hue" || yChannel === "oklch-hue" ? "_" : roundToPrecision(snapshot.oklch.h, 2);
        return `oklch|${xChannel}|${yChannel}|${isRtl}|${l}|${c}|${h}`;
    }

    const fixedParts = [
        xChannel,
        yChannel,
        String(isRtl),
        xChannel === "hue" || yChannel === "hue" ? "_" : String(roundToPrecision(snapshot.hsv.h, 2)),
        xChannel === "saturation" || yChannel === "saturation" ? "_" : String(roundToPrecision(snapshot.hsv.s, 2)),
        xChannel === "value" || yChannel === "value" ? "_" : String(roundToPrecision(snapshot.hsv.v, 2)),
        xChannel === "hsl-saturation" || yChannel === "hsl-saturation" ? "_" : String(roundToPrecision(snapshot.hsl.s, 2)),
        xChannel === "lightness" || yChannel === "lightness" ? "_" : String(roundToPrecision(snapshot.hsl.l, 2)),
        xChannel === "red" || yChannel === "red" ? "_" : String(Math.round(snapshot.rgb.r)),
        xChannel === "green" || yChannel === "green" ? "_" : String(Math.round(snapshot.rgb.g)),
        xChannel === "blue" || yChannel === "blue" ? "_" : String(Math.round(snapshot.rgb.b)),
        xChannel === "oklch-lightness" || yChannel === "oklch-lightness" ? "_" : String(roundToPrecision(snapshot.oklch.l, 4)),
        xChannel === "chroma" || yChannel === "chroma" ? "_" : String(roundToPrecision(snapshot.oklch.c, 4)),
        xChannel === "oklch-hue" || yChannel === "oklch-hue" ? "_" : String(roundToPrecision(snapshot.oklch.h, 2)),
    ];
    return fixedParts.join("|");
}

export function renderColorAreaCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    xChannel: ColorChannel,
    yChannel: ColorChannel,
    snapshot: ColorChannelSnapshot,
    isRtl: boolean
): void {
    if (width <= 0 || height <= 0) return;

    const xMeta = getChannelMeta(xChannel);
    const yMeta = getChannelMeta(yChannel);
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    const isOklchPair = OKLCH_CHANNELS.has(xChannel) && OKLCH_CHANNELS.has(yChannel);
    const hasAlphaAxis = xChannel === "alpha" || yChannel === "alpha";

    for (let py = 0; py < height; py++) {
        const yRatio = height > 1 ? 1 - py / (height - 1) : 0;
        const yVal = yMeta.min + yRatio * (yMeta.max - yMeta.min);

        for (let px = 0; px < width; px++) {
            const rawX = width > 1 ? px / (width - 1) : 0;
            const xRatio = isRtl ? 1 - rawX : rawX;
            const xVal = xMeta.min + xRatio * (xMeta.max - xMeta.min);

            const idx = (py * width + px) * 4;

            if (isOklchPair) {
                const l =
                    xChannel === "oklch-lightness"
                        ? xVal
                        : yChannel === "oklch-lightness"
                          ? yVal
                          : snapshot.oklch.l;
                const c = xChannel === "chroma" ? xVal : yChannel === "chroma" ? yVal : snapshot.oklch.c;
                const h = xChannel === "oklch-hue" ? xVal : yChannel === "oklch-hue" ? yVal : snapshot.oklch.h;

                const oklab = oklchToOklab([l, c, h]);
                const parsed = buildParsedColorFromOklab(oklab, 1, "oklch", "oklch");
                const clamped = clampParsedToGamut(parsed, "srgb");

                data[idx] = Math.round(clamp01(clamped.rgb[0]) * 255);
                data[idx + 1] = Math.round(clamp01(clamped.rgb[1]) * 255);
                data[idx + 2] = Math.round(clamp01(clamped.rgb[2]) * 255);
                data[idx + 3] = 255;
            } else {
                const withX = mergeChannelIntoSnapshot(snapshot, xChannel, clampChannel(xChannel, xVal));
                const withXY = mergeChannelIntoSnapshot(withX, yChannel, clampChannel(yChannel, yVal));

                data[idx] = Math.round(clamp(withXY.rgb.r, 0, 255));
                data[idx + 1] = Math.round(clamp(withXY.rgb.g, 0, 255));
                data[idx + 2] = Math.round(clamp(withXY.rgb.b, 0, 255));
                data[idx + 3] = hasAlphaAxis ? Math.round(clamp01(withXY.alpha) * 255) : 255;
            }
        }
    }

    ctx.putImageData(imageData, 0, 0);
}

export function resolveColorAreaThumbColor(
    xChannel: ColorChannel,
    yChannel: ColorChannel,
    snapshot: ColorChannelSnapshot
): string {
    if (xChannel === "alpha" || yChannel === "alpha") {
        return formatRgbCss(
            [snapshot.rgb.r / 255, snapshot.rgb.g / 255, snapshot.rgb.b / 255],
            snapshot.alpha
        );
    }

    if (OKLCH_CHANNELS.has(xChannel) && OKLCH_CHANNELS.has(yChannel)) {
        return `oklch(${roundToPrecision(snapshot.oklch.l, 4)} ${roundToPrecision(snapshot.oklch.c, 4)} ${roundToPrecision(snapshot.oklch.h, 2)})`;
    }

    if (HSV_CHANNELS.has(xChannel) && HSV_CHANNELS.has(yChannel)) {
        return formatRgbCss(hsvToSrgb(snapshot.hsv.h, snapshot.hsv.s, snapshot.hsv.v));
    }

    if (HSL_CHANNELS.has(xChannel) && HSL_CHANNELS.has(yChannel)) {
        return formatRgbCss(hslToSrgb(snapshot.hsl.h, snapshot.hsl.s, snapshot.hsl.l));
    }

    return formatRgbCss([snapshot.rgb.r / 255, snapshot.rgb.g / 255, snapshot.rgb.b / 255]);
}
