import type { ChartMargins } from "./chart-state.svelte.ts";

export interface ChartMeasureFont {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number | string;
}

export interface TruncatedTextResult {
    text: string;
    truncated: boolean;
    width: number;
}

export interface WrappedTextResult {
    lines: readonly string[];
    truncated: boolean;
}

export interface AxisTickMeasureItem {
    label: string;
    position: number;
}

export interface ThinAxisTicksOptions {
    minGutter?: number;
    font?: ChartMeasureFont;
    tickAngle?: number;
    maxTickWidth?: number;
}

export interface ComputeChartMarginsOptions {
    hasXAxis?: boolean;
    hasYAxis?: boolean;
    hasY2Axis?: boolean;
    xTickLabels?: readonly string[];
    yTickLabels?: readonly string[];
    y2TickLabels?: readonly string[];
    xAxisLabel?: string;
    yAxisLabel?: string;
    y2AxisLabel?: string;
    xTickAngle?: number;
    xWrapTicks?: boolean;
    xMaxTickWidth?: number;
    yMaxTickWidth?: number;
    hasTopValueLabels?: boolean;
    hasRightValueLabels?: boolean;
    font?: ChartMeasureFont;
    overrides?: Partial<ChartMargins>;
}

const DEFAULT_FONT_SIZE = 11;
const DEFAULT_FONT_FAMILY = "Inter, system-ui, -apple-system, sans-serif";
const DEFAULT_FONT_WEIGHT = 400;
const MAX_CACHE_ENTRIES = 2048;
const ELLIPSIS = "\u{2026}";

let cachedContext: CanvasRenderingContext2D | null | undefined;
const widthCache = new Map<string, number>();

function getCanvasContext(): CanvasRenderingContext2D | null {
    if (cachedContext !== undefined) return cachedContext;

    if (typeof document === "undefined") {
        cachedContext = null;
        return null;
    }

    try {
        const canvas = document.createElement("canvas");
        cachedContext = canvas.getContext("2d");
    } catch {
        cachedContext = null;
    }

    return cachedContext;
}

function resolveFontSpec(font?: ChartMeasureFont): {
    fontSize: number;
    fontWeight: number | string;
    cssFont: string;
} {
    const fontSize = font?.fontSize ?? DEFAULT_FONT_SIZE;
    const fontFamily = font?.fontFamily ?? DEFAULT_FONT_FAMILY;
    const fontWeight = font?.fontWeight ?? DEFAULT_FONT_WEIGHT;
    return {
        fontSize,
        fontWeight,
        cssFont: `${fontWeight} ${fontSize}px ${fontFamily}`,
    };
}

/** Deterministic width estimate used when Canvas 2D context is unavailable (e.g. happy-dom / SSR). */
function estimateTextWidthFallback(
    text: string,
    fontSize: number,
    fontWeight: number | string,
): number {
    const numericWeight = typeof fontWeight === "number" ? fontWeight : Number(fontWeight);
    const weightScale =
        fontWeight === "bold" || (Number.isFinite(numericWeight) && numericWeight >= 600)
            ? 1.06
            : 1;

    let total = 0;

    for (const char of text) {
        if (char === " ") {
            total += 0.28;
        } else if ("ilI1.,:;|!'`".includes(char)) {
            total += 0.32;
        } else if ("fjrt()[]{}-/".includes(char)) {
            total += 0.4;
        } else if ("WMmw@%".includes(char)) {
            total += 0.85;
        } else if (char === ELLIPSIS) {
            total += 0.78;
        } else if (char >= "0" && char <= "9") {
            total += 0.6;
        } else if (char >= "A" && char <= "Z") {
            total += 0.66;
        } else {
            total += 0.56;
        }
    }

    return total * fontSize * weightScale;
}

export function clearMeasureCache(): void {
    widthCache.clear();
}

export function measureTextWidth(text: string, font?: ChartMeasureFont): number {
    if (text.length === 0) return 0;

    const { fontSize, fontWeight, cssFont } = resolveFontSpec(font);
    const cacheKey = `${cssFont}\0${text}`;
    const cached = widthCache.get(cacheKey);
    if (cached !== undefined) return cached;

    let measured: number;
    const context = getCanvasContext();

    if (context) {
        context.font = cssFont;
        const metrics = context.measureText(text);
        measured =
            Number.isFinite(metrics.width) && metrics.width > 0
                ? metrics.width
                : estimateTextWidthFallback(text, fontSize, fontWeight);
    } else {
        measured = estimateTextWidthFallback(text, fontSize, fontWeight);
    }

    if (widthCache.size >= MAX_CACHE_ENTRIES) {
        widthCache.clear();
    }
    widthCache.set(cacheKey, measured);

    return measured;
}

export function truncateTextToWidth(
    text: string,
    maxWidth: number,
    font?: ChartMeasureFont,
): TruncatedTextResult {
    if (text.length === 0) {
        return { text: "", truncated: false, width: 0 };
    }

    const fullWidth = measureTextWidth(text, font);
    if (fullWidth <= maxWidth) {
        return { text, truncated: false, width: fullWidth };
    }

    if (maxWidth <= 0) {
        return { text: "", truncated: true, width: 0 };
    }

    const ellipsisWidth = measureTextWidth(ELLIPSIS, font);
    if (ellipsisWidth > maxWidth) {
        return { text: ELLIPSIS, truncated: true, width: ellipsisWidth };
    }

    // Binary search for the longest prefix that fits with a trailing ellipsis.
    let low = 0;
    let high = text.length;
    let bestText = ELLIPSIS;
    let bestWidth = ellipsisWidth;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = `${text.slice(0, mid).trimEnd()}${ELLIPSIS}`;
        const candidateWidth = measureTextWidth(candidate, font);

        if (candidateWidth <= maxWidth) {
            bestText = candidate;
            bestWidth = candidateWidth;
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return { text: bestText, truncated: true, width: bestWidth };
}

function fitLineWords(
    words: readonly string[],
    startIndex: number,
    maxWidth: number,
    font?: ChartMeasureFont,
): { line: string; nextIndex: number } {
    let currentLine = words[startIndex] ?? "";
    let index = startIndex + 1;

    while (index < words.length) {
        const nextWord = words[index] ?? "";
        const candidate = `${currentLine} ${nextWord}`;
        if (measureTextWidth(candidate, font) > maxWidth) {
            return { line: currentLine, nextIndex: index };
        }
        currentLine = candidate;
        index += 1;
    }

    return { line: currentLine, nextIndex: index };
}

export function wrapTickLabel(
    text: string,
    maxWidth: number,
    font?: ChartMeasureFont,
    maxLines = 2,
): WrappedTextResult {
    const trimmed = text.trim();
    if (trimmed.length === 0 || maxLines <= 0) {
        return { lines: [], truncated: false };
    }

    if (maxLines === 1 || measureTextWidth(trimmed, font) <= maxWidth) {
        if (measureTextWidth(trimmed, font) <= maxWidth) {
            return { lines: [trimmed], truncated: false };
        }
        const single = truncateTextToWidth(trimmed, maxWidth, font);
        return { lines: [single.text], truncated: single.truncated };
    }

    const words = trimmed.split(/\s+/);
    const lines: string[] = [];
    let wordIndex = 0;
    let truncated = false;

    while (wordIndex < words.length && lines.length < maxLines) {
        const isLastLine = lines.length === maxLines - 1;

        if (isLastLine) {
            const remainder = words.slice(wordIndex).join(" ");
            const fitted = truncateTextToWidth(remainder, maxWidth, font);
            lines.push(fitted.text);
            truncated ||= fitted.truncated;
            break;
        }

        const firstWord = words[wordIndex] ?? "";
        if (measureTextWidth(firstWord, font) > maxWidth) {
            const fitted = truncateTextToWidth(firstWord, maxWidth, font);
            lines.push(fitted.text);
            truncated = true;
            wordIndex += 1;
            continue;
        }

        const fittedLine = fitLineWords(words, wordIndex, maxWidth, font);
        lines.push(fittedLine.line);
        wordIndex = fittedLine.nextIndex;
    }

    return { lines, truncated };
}

export function computeRotatedTickHeight(
    maxLabelWidth: number,
    angleDegrees: number,
    lineHeight: number,
): number {
    if (angleDegrees === 0) return Math.ceil(lineHeight);
    const radians = (Math.abs(angleDegrees) * Math.PI) / 180;
    return Math.ceil(maxLabelWidth * Math.sin(radians) + lineHeight * Math.cos(radians));
}

export function thinAxisTicks(
    ticks: readonly AxisTickMeasureItem[],
    options: ThinAxisTicksOptions = {},
): readonly number[] {
    if (ticks.length === 0) return [];

    const { minGutter = 12, font, tickAngle = 0, maxTickWidth } = options;
    const fontSize = font?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = Math.ceil(fontSize * 1.3);
    const isRotated = tickAngle !== 0;
    const radians = (Math.abs(tickAngle) * Math.PI) / 180;
    const rotatedFootprint = isRotated
        ? Math.max(lineHeight, lineHeight / Math.max(0.25, Math.sin(radians)))
        : 0;

    const indexed = ticks
        .map((tick, index) => ({
            index,
            position: tick.position,
            label: tick.label,
        }))
        .toSorted((a, b) => a.position - b.position);

    const keptIndices: number[] = [];
    let lastRightEdge = -Infinity;

    for (const item of indexed) {
        const rawWidth = measureTextWidth(item.label, font);
        const labelWidth =
            maxTickWidth !== undefined ? Math.min(rawWidth, maxTickWidth) : rawWidth;
        const footprint = isRotated ? rotatedFootprint : labelWidth;
        const leftEdge = item.position - footprint / 2;
        const rightEdge = item.position + footprint / 2;

        if (keptIndices.length === 0 || leftEdge >= lastRightEdge + minGutter) {
            keptIndices.push(item.index);
            lastRightEdge = rightEdge;
        }
    }

    return keptIndices;
}

export function computeChartMargins(options: ComputeChartMarginsOptions): ChartMargins {
    const {
        hasXAxis = true,
        hasYAxis = true,
        hasY2Axis = false,
        xTickLabels = [],
        yTickLabels = [],
        y2TickLabels = [],
        xAxisLabel,
        yAxisLabel,
        y2AxisLabel,
        xTickAngle = 0,
        xWrapTicks = false,
        xMaxTickWidth,
        yMaxTickWidth,
        hasTopValueLabels = false,
        hasRightValueLabels = false,
        font,
        overrides,
    } = options;

    const fontSize = font?.fontSize ?? DEFAULT_FONT_SIZE;
    const lineHeight = Math.ceil(fontSize * 1.3);
    const axisTitleSize = 20;
    const tickGap = 10;

    let maxYWidth = 0;
    for (const label of yTickLabels) {
        const width = measureTextWidth(label, font);
        if (width > maxYWidth) maxYWidth = width;
    }
    if (yMaxTickWidth !== undefined && maxYWidth > yMaxTickWidth) {
        maxYWidth = yMaxTickWidth;
    }

    let maxY2Width = 0;
    for (const label of y2TickLabels) {
        const width = measureTextWidth(label, font);
        if (width > maxY2Width) maxY2Width = width;
    }

    let maxXWidth = 0;
    for (const label of xTickLabels) {
        const width = measureTextWidth(label, font);
        if (width > maxXWidth) maxXWidth = width;
    }
    if (xMaxTickWidth !== undefined && maxXWidth > xMaxTickWidth) {
        maxXWidth = xMaxTickWidth;
    }

    const computedTop = hasTopValueLabels ? 24 : hasYAxis || hasY2Axis ? Math.ceil(lineHeight / 2) + 4 : 8;

    const computedLeft = hasYAxis
        ? Math.ceil(maxYWidth + tickGap + (yAxisLabel ? axisTitleSize : 0) + 4)
        : 8;

    let computedRight = 12;
    if (hasY2Axis) {
        computedRight = Math.ceil(maxY2Width + tickGap + (y2AxisLabel ? axisTitleSize : 0) + 4);
    } else if (hasRightValueLabels) {
        computedRight = 36;
    }

    let computedBottom = 8;
    if (hasXAxis) {
        let tickBlockHeight: number;
        if (xTickAngle !== 0) {
            tickBlockHeight = computeRotatedTickHeight(maxXWidth, xTickAngle, lineHeight);
        } else if (xWrapTicks) {
            tickBlockHeight = lineHeight * 2;
        } else {
            tickBlockHeight = lineHeight;
        }
        computedBottom = Math.ceil(tickBlockHeight + 8 + (xAxisLabel ? axisTitleSize : 0) + 4);
    }

    return {
        top: overrides?.top ?? computedTop,
        right: overrides?.right ?? computedRight,
        bottom: overrides?.bottom ?? computedBottom,
        left: overrides?.left ?? computedLeft,
    };
}
