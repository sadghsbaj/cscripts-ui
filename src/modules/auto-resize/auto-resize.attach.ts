import type { Attachment } from "svelte/attachments";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import "./auto-resize.attach.css";

const AUTO_RESIZE_CSS_VARS = [
    "--cs-auto-resize-min-rows",
    "--cs-auto-resize-max-rows",
    "--cs-auto-resize-min-height",
    "--cs-auto-resize-max-height",
    "--cs-auto-resize-min-width",
    "--cs-auto-resize-max-width",
    "--cs-auto-resize-chrome-block",
] as const;

export interface AutoResizeOptions {
    /**
     * Whether auto-resizing is enabled.
     * @default true
     */
    enabled?: boolean | (() => boolean);

    /**
     * Minimum number of visible text lines for `<textarea>` elements.
     * When omitted, defaults to the `<textarea>`'s explicit `rows` attribute (e.g. `rows={3}`),
     * or leaves the element's base `min-height` untouched if no `rows` attribute is set.
     * If `rows` changes dynamically, pass `minRows` explicitly to `autoResize({ minRows })` so Svelte tracks it.
     */
    minRows?: number;

    /**
     * Maximum number of visible text lines for `<textarea>` elements before vertical scrolling activates.
     * When omitted, the element grows without a line-count ceiling (unless `maxHeight` is set).
     */
    maxRows?: number;

    /**
     * Explicit minimum height (`px` number or CSS length string, e.g. `80`, `"5rem"`).
     * Overrides `minRows` when both are provided.
     */
    minHeight?: number | string;

    /**
     * Explicit maximum height (`px` number or CSS length string, e.g. `320`, `"40dvh"`).
     * Overrides `maxRows` when both are provided.
     */
    maxHeight?: number | string;

    /**
     * Explicit minimum width (`px` number or CSS length string, e.g. `64`, `"6ch"`).
     * Primarily used when auto-resizing `<input>` / `<TextInputField>` elements horizontally.
     */
    minWidth?: number | string;

    /**
     * Explicit maximum width (`px` number or CSS length string, e.g. `280`, `"100%"`).
     * Primarily used when auto-resizing `<input>` / `<TextInputField>` elements horizontally.
     */
    maxWidth?: number | string;
}

function formatCssLength(value: number | string | undefined): string | undefined {
    if (typeof value === "number") {
        return Number.isFinite(value) ? `${value}px` : undefined;
    }
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    return undefined;
}

function isPositiveRowCount(value: number | undefined): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 1;
}

function parsePx(value: string): number {
    return Number(value.replace(/px$/, "")) || 0;
}

/**
 * Svelte 5 attachment that dynamically sizes editable form controls (`<textarea>`, `<input>`)
 * to fit their content using native CSS `field-sizing: content`.
 *
 * @example
 * ```svelte
 * <TextArea rows={1} bind:value={prompt} {@attach autoResize({ maxRows: 6 })} />
 * ```
 */
export function autoResize(options?: AutoResizeOptions): Attachment<HTMLElement> {
    return (node: HTMLElement): (() => void) => {
        if (!(node instanceof HTMLElement)) {
            return (): void => {};
        }
        if (!(resolveGetter(options?.enabled) ?? true)) {
            return (): void => {};
        }

        node.classList.add("cs-auto-resize");
        node.dataset.autoResize = "";

        const minHeight = formatCssLength(options?.minHeight);
        const maxHeight = formatCssLength(options?.maxHeight);
        const minWidth = formatCssLength(options?.minWidth);
        const maxWidth = formatCssLength(options?.maxWidth);

        const rawRows = node instanceof HTMLTextAreaElement ? node.getAttribute("rows") : null;
        const attrRows = rawRows !== null && rawRows.trim().length > 0 ? Number(rawRows) : undefined;
        const resolvedMinRows = options?.minRows ?? attrRows;

        const hasMinRows = minHeight === undefined && isPositiveRowCount(resolvedMinRows);
        const hasMaxRows = maxHeight === undefined && isPositiveRowCount(options?.maxRows);

        if (minHeight !== undefined) {
            node.style.setProperty("--cs-auto-resize-min-height", minHeight);
        } else if (hasMinRows) {
            node.style.setProperty("--cs-auto-resize-min-rows", String(resolvedMinRows));
        }

        if (maxHeight !== undefined) {
            node.style.setProperty("--cs-auto-resize-max-height", maxHeight);
        } else if (hasMaxRows) {
            node.style.setProperty("--cs-auto-resize-max-rows", String(options?.maxRows));
        }

        if (
            node instanceof HTMLTextAreaElement &&
            !node.classList.contains("cs-text-area") &&
            (hasMinRows || hasMaxRows)
        ) {
            const style = getComputedStyle(node);
            const chromeBlock =
                parsePx(style.paddingTop) +
                parsePx(style.paddingBottom) +
                parsePx(style.borderTopWidth) +
                parsePx(style.borderBottomWidth);
            node.style.setProperty("--cs-auto-resize-chrome-block", `${chromeBlock}px`);
        }

        if (minWidth !== undefined) {
            node.style.setProperty("--cs-auto-resize-min-width", minWidth);
        }
        if (maxWidth !== undefined) {
            node.style.setProperty("--cs-auto-resize-max-width", maxWidth);
        }

        return (): void => {
            node.classList.remove("cs-auto-resize");
            delete node.dataset.autoResize;
            for (const cssVar of AUTO_RESIZE_CSS_VARS) {
                node.style.removeProperty(cssVar);
            }
        };
    };
}
