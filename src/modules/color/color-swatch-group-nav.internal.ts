import { parseColor } from "./color.utils.ts";

export interface RegisteredSwatch {
    readonly element: HTMLElement;
    readonly getColor: () => string | undefined;
}

const COLOR_MATCH_EPSILON = 0.002;

/**
 * Matches two CSS color strings perceptually via OKLab + alpha so equivalent
 * values across hex, sRGB, and OKLCH formats highlight the same preset swatch.
 */
export function areColorsEquivalent(swatchColor: string, resolvedValue: string | undefined): boolean {
    if (resolvedValue === undefined) return false;

    const normalizedSwatch = swatchColor.trim().toLowerCase();
    const normalizedValue = resolvedValue.trim().toLowerCase();
    if (normalizedSwatch === normalizedValue) return true;

    const parsedSwatch = parseColor(swatchColor);
    const parsedValue = parseColor(resolvedValue);
    if (!parsedSwatch || !parsedValue) return false;

    if (Math.abs(parsedSwatch.alpha - parsedValue.alpha) > COLOR_MATCH_EPSILON) return false;
    if (parsedSwatch.alpha === 0 && parsedValue.alpha === 0) return true;

    return (
        Math.abs(parsedSwatch.oklab[0] - parsedValue.oklab[0]) <= COLOR_MATCH_EPSILON &&
        Math.abs(parsedSwatch.oklab[1] - parsedValue.oklab[1]) <= COLOR_MATCH_EPSILON &&
        Math.abs(parsedSwatch.oklab[2] - parsedValue.oklab[2]) <= COLOR_MATCH_EPSILON
    );
}

export function sortRegisteredSwatches(items: readonly RegisteredSwatch[]): RegisteredSwatch[] {
    return items.toSorted((a, b) => {
        if (a.element === b.element) return 0;
        const pos = a.element.compareDocumentPosition(b.element);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    });
}

interface MeasuredSwatch {
    readonly item: RegisteredSwatch;
    readonly centerX: number;
    readonly centerY: number;
    readonly height: number;
}

/**
 * Resolves 2D ArrowUp / ArrowDown navigation across visual rows (explicit grids
 * or wrapped flex rows) by clustering items on Y proximity and matching nearest X.
 */
export function findVerticalGridTarget(
    items: readonly RegisteredSwatch[],
    current: RegisteredSwatch,
    direction: "up" | "down"
): RegisteredSwatch | null {
    if (items.length <= 1) return null;

    const measured: MeasuredSwatch[] = items
        .map((item) => {
            const rect = item.element.getBoundingClientRect();
            return {
                item,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2,
                height: rect.height,
            };
        })
        .toSorted((a, b) => a.centerY - b.centerY || a.centerX - b.centerX);

    const rows: MeasuredSwatch[][] = [];
    for (const entry of measured) {
        const currentRow = rows.at(-1);
        if (!currentRow) {
            rows.push([entry]);
            continue;
        }
        const anchor = currentRow[0];
        if (!anchor) continue;
        const rowTolerance = Math.max(4, anchor.height * 0.5);
        if (Math.abs(entry.centerY - anchor.centerY) <= rowTolerance) {
            currentRow.push(entry);
        } else {
            rows.push([entry]);
        }
    }

    if (rows.length <= 1) return null;

    const currentRowIndex = rows.findIndex((row) => row.some((entry) => entry.item === current));
    if (currentRowIndex === -1) return null;

    const currentMeasured = rows[currentRowIndex]?.find((entry) => entry.item === current);
    if (!currentMeasured) return null;

    const delta = direction === "down" ? 1 : -1;
    const targetRowIndex = (currentRowIndex + delta + rows.length) % rows.length;
    const targetRow = rows[targetRowIndex];
    if (!targetRow || targetRow.length === 0) return null;

    let closest = targetRow[0];
    if (!closest) return null;
    let closestDist = Math.abs(closest.centerX - currentMeasured.centerX);

    for (let i = 1; i < targetRow.length; i++) {
        const candidate = targetRow[i];
        if (!candidate) continue;
        const dist = Math.abs(candidate.centerX - currentMeasured.centerX);
        if (dist < closestDist) {
            closest = candidate;
            closestDist = dist;
        }
    }

    return closest.item;
}
