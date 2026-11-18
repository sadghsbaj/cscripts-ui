import { untrack } from "svelte";
import type { Attachment } from "svelte/attachments";
import { SvelteMap, SvelteSet } from "svelte/reactivity";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import { FenwickTree } from "./fenwick-tree.internal.ts";

export const VIRTUAL_SCROLL_ORIENTATIONS = ["vertical", "horizontal"] as const;
export const VIRTUAL_SCROLL_ALIGNS = ["auto", "start", "center", "end"] as const;
export const VIRTUAL_SCROLL_TARGETS = ["element", "window"] as const;

export type VirtualScrollOrientation = (typeof VIRTUAL_SCROLL_ORIENTATIONS)[number];
export type VirtualScrollAlign = (typeof VIRTUAL_SCROLL_ALIGNS)[number];
export type VirtualScrollTarget = (typeof VIRTUAL_SCROLL_TARGETS)[number];
export type MaybeGetter<T> = T | (() => T);
export type VirtualScrollKey = string | number;

export interface VirtualScrollRange {
    startIndex: number;
    endIndex: number;
}

export interface VirtualScrollItem {
    index: number;
    lane: number;
    start: number;
    size: number;
    key: VirtualScrollKey;
}

export interface VirtualScrollItemAriaOptions {
    role?: "listitem" | "option" | "row";
    headerRowCount?: number;
}

export interface VirtualScrollItemAriaProps {
    "aria-setsize"?: number;
    "aria-posinset"?: number;
    "aria-rowindex"?: number;
}

export interface VirtualScrollScrollToIndexOptions {
    align?: VirtualScrollAlign;
    behavior?: ScrollBehavior;
}

export interface VirtualScrollScrollToOffsetOptions {
    behavior?: ScrollBehavior;
}

export interface VirtualScrollOptions {
    count: MaybeGetter<number>;
    estimateSize: number | ((index: number) => number);
    fixed?: MaybeGetter<boolean>;
    orientation?: MaybeGetter<VirtualScrollOrientation>;
    overscan?: MaybeGetter<number>;
    gap?: MaybeGetter<number | undefined>;
    lanes?: MaybeGetter<number>;
    scrollTarget?: MaybeGetter<VirtualScrollTarget>;
    getItemKey?: (index: number) => VirtualScrollKey;
    initialViewportSize?: number;
    initialRenderCount?: number;
    onRangeChange?: (range: VirtualScrollRange) => void;
}

const SCROLL_IDLE_DELAY_MS = 150;
const SUBPIXEL_NOISE_THRESHOLD = 0.5;
const MAX_CONVERGENCE_PASSES = 3;

function defaultGetItemKey(index: number): number {
    return index;
}

function noop(): void {}

function parsePx(value: string): number {
    const trimmed = value.trim();
    if (trimmed === "") return 0;
    const numeric = trimmed.endsWith("px") ? trimmed.slice(0, -2) : trimmed;
    const parsed = Number(numeric);
    return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Headless reactive Svelte 5 controller for flow-preserving virtualized lists, grids, and tables.
 */
export class VirtualScrollController {
    readonly #options: VirtualScrollOptions;

    #items = $state.raw<readonly VirtualScrollItem[]>([]);
    #offsetBefore = $state(0);
    #offsetAfter = $state(0);
    #totalSize = $state(0);
    #startIndex = $state(0);
    #endIndex = $state(-1);
    #visibleRange = $state.raw<VirtualScrollRange>({ startIndex: 0, endIndex: -1 });
    #isScrolling = $state(false);
    #scrollOffset = $state(0);

    // Non-reactive internal geometry state
    #count = 0;
    #rowCount = 0;
    #lanes = 1;
    #gap = 0;
    #fixed = false;
    #orientation: VirtualScrollOrientation = "vertical";
    #overscan = 5;
    #scrollTarget: VirtualScrollTarget = "element";

    #itemSizes = new Float64Array(0);
    #itemMeasured = new Uint8Array(0);
    #rowHeights = new Float64Array(0);
    #rowMeasured = new Uint8Array(0);
    #tree = new FenwickTree(0);
    #measuredByKey = new SvelteMap<VirtualScrollKey, number>();

    // DOM & Observer state
    #viewportEl: HTMLElement | null = null;
    #listEl: HTMLElement | null = null;
    #viewportSize = 0;
    #rawScrollOffset = 0;
    #hasMounted = false;

    #basePaddingBlockStart = 0;
    #basePaddingBlockEnd = 0;
    #basePaddingInlineStart = 0;
    #basePaddingInlineEnd = 0;
    #cssGapVertical = 0;
    #cssGapHorizontal = 0;
    #appliedAxis: VirtualScrollOrientation | null = null;

    #itemResizeObserver: ResizeObserver | null = null;
    #itemElementIndex = new WeakMap<Element, number>();
    #observedItemElements = new SvelteSet<HTMLElement>();

    #scrollRafId: number | null = null;
    #scrollIdleTimer: ReturnType<typeof setTimeout> | null = null;
    #convergenceRafId: number | null = null;
    #isProgrammaticScroll = false;
    #programmaticTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(options: VirtualScrollOptions) {
        this.#options = options;
        this.#syncAndRebuild(true);

        // Register reactive tracking when instantiated inside a Svelte component or $effect.root
        try {
            $effect(() => {
                // Track only reactive option getters; #syncAndRebuild reads/writes $state fields.
                resolveGetter(this.#options.count);
                resolveGetter(this.#options.lanes);
                resolveGetter(this.#options.fixed);
                resolveGetter(this.#options.orientation);
                resolveGetter(this.#options.overscan);
                resolveGetter(this.#options.gap);
                resolveGetter(this.#options.scrollTarget);

                untrack(() => {
                    this.#syncAndRebuild(false);
                });
            });
        } catch {
            // Outside an active effect root (e.g. plain unit tests)
        }
    }

    get items(): readonly VirtualScrollItem[] {
        return this.#items;
    }

    get offsetBefore(): number {
        return this.#offsetBefore;
    }

    get offsetAfter(): number {
        return this.#offsetAfter;
    }

    get totalSize(): number {
        return this.#totalSize;
    }

    get startIndex(): number {
        return this.#startIndex;
    }

    get endIndex(): number {
        return this.#endIndex;
    }

    get visibleRange(): VirtualScrollRange {
        return this.#visibleRange;
    }

    get isScrolling(): boolean {
        return this.#isScrolling;
    }

    get scrollOffset(): number {
        return this.#scrollOffset;
    }

    #estimate(index: number): number {
        const raw =
            typeof this.#options.estimateSize === "function"
                ? this.#options.estimateSize(index)
                : this.#options.estimateSize;
        return Number.isFinite(raw) && raw > 0 ? raw : 0;
    }

    #getItemKey(index: number): VirtualScrollKey {
        return (this.#options.getItemKey ?? defaultGetItemKey)(index);
    }

    #resolveGap(orientation: VirtualScrollOrientation): number {
        if (this.#options.gap !== undefined) {
            const resolved = resolveGetter(this.#options.gap);
            if (resolved !== undefined) {
                return Math.max(0, resolved);
            }
        }
        return orientation === "vertical" ? this.#cssGapVertical : this.#cssGapHorizontal;
    }

    #syncAndRebuild(isInitial: boolean): void {
        const nextCount = Math.max(0, Math.floor(resolveGetter(this.#options.count)));
        const nextLanes = Math.max(1, Math.floor(resolveGetter(this.#options.lanes) ?? 1));
        const nextFixed = Boolean(resolveGetter(this.#options.fixed) ?? false);
        const nextOrientation: VirtualScrollOrientation = resolveGetter(this.#options.orientation) ?? "vertical";
        const nextOverscan = Math.max(0, Math.floor(resolveGetter(this.#options.overscan) ?? 5));
        const nextScrollTarget: VirtualScrollTarget = resolveGetter(this.#options.scrollTarget) ?? "element";
        const nextGap = this.#resolveGap(nextOrientation);

        const structureChanged =
            isInitial ||
            nextCount !== this.#count ||
            nextLanes !== this.#lanes ||
            nextGap !== this.#gap ||
            nextFixed !== this.#fixed;

        const orientationChanged = !isInitial && nextOrientation !== this.#orientation;

        this.#count = nextCount;
        this.#lanes = nextLanes;
        this.#gap = nextGap;
        this.#fixed = nextFixed;
        this.#orientation = nextOrientation;
        this.#overscan = nextOverscan;
        this.#scrollTarget = nextScrollTarget;
        this.#rowCount = nextCount === 0 ? 0 : Math.ceil(nextCount / nextLanes);

        if (orientationChanged && this.#viewportEl && this.#scrollTarget === "element") {
            this.#viewportEl.dataset.orientation = nextOrientation;
            this.#viewportSize =
                nextOrientation === "vertical" ? this.#viewportEl.clientHeight : this.#viewportEl.clientWidth;
            this.#rawScrollOffset = this.#readRawScrollOffset();
        }

        if (structureChanged && !this.#fixed) {
            this.#rebuildDynamicStructures();
        }

        this.#recomputeRange();
    }

    #rebuildDynamicStructures(): void {
        const count = this.#count;

        if (count === 0) {
            this.#itemSizes = new Float64Array(0);
            this.#itemMeasured = new Uint8Array(0);
            this.#rowHeights = new Float64Array(0);
            this.#rowMeasured = new Uint8Array(0);
            this.#tree.resize(0);
            return;
        }

        const rowCount = this.#rowCount;
        const lanes = this.#lanes;
        const gap = this.#gap;

        const prevSizes = this.#itemSizes;
        const prevMeasured = this.#itemMeasured;
        const hasCustomKey = this.#options.getItemKey !== undefined;

        const nextSizes = new Float64Array(count);
        const nextMeasured = new Uint8Array(count);

        for (let i = 0; i < count; i++) {
            if (hasCustomKey) {
                const cached = this.#measuredByKey.get(this.#getItemKey(i));
                if (cached !== undefined) {
                    nextSizes[i] = cached;
                    nextMeasured[i] = 1;
                    continue;
                }
            } else if (i < prevSizes.length && (prevMeasured[i] ?? 0) === 1) {
                nextSizes[i] = prevSizes[i] ?? 0;
                nextMeasured[i] = 1;
                continue;
            }
            nextSizes[i] = this.#estimate(i);
        }

        this.#itemSizes = nextSizes;
        this.#itemMeasured = nextMeasured;

        const rowHeights = new Float64Array(rowCount);
        const rowMeasured = new Uint8Array(rowCount);
        const rowTreeValues = new Float64Array(rowCount);

        for (let r = 0; r < rowCount; r++) {
            const start = r * lanes;
            const end = Math.min(count, start + lanes);
            let maxH = 0;
            let allMeasured = end > start;
            for (let i = start; i < end; i++) {
                const s = nextSizes[i] ?? 0;
                if (s > maxH) maxH = s;
                if ((nextMeasured[i] ?? 0) !== 1) {
                    allMeasured = false;
                }
            }
            rowHeights[r] = maxH;
            rowMeasured[r] = allMeasured ? 1 : 0;
            rowTreeValues[r] = maxH + gap;
        }

        this.#rowHeights = rowHeights;
        this.#rowMeasured = rowMeasured;
        this.#tree.build(rowTreeValues);
    }

    #getTotalSize(): number {
        if (this.#rowCount === 0) return 0;
        if (this.#fixed) {
            const rowSize = this.#estimate(0);
            return this.#rowCount * rowSize + (this.#rowCount - 1) * this.#gap;
        }
        return Math.max(0, this.#tree.total - this.#gap);
    }

    #getRowStart(row: number): number {
        if (row <= 0 || this.#rowCount === 0) return 0;
        if (this.#fixed) {
            return row * (this.#estimate(0) + this.#gap);
        }
        return this.#tree.sum(row);
    }

    #getRowHeight(row: number): number {
        if (row < 0 || row >= this.#rowCount) return 0;
        if (this.#fixed) {
            return this.#estimate(0);
        }
        return this.#rowHeights[row] ?? 0;
    }

    #rowAtOffset(offset: number): number {
        if (this.#rowCount === 0 || offset <= 0) return 0;
        if (this.#fixed) {
            const stride = this.#estimate(0) + this.#gap;
            if (stride <= 0) return 0;
            return Math.min(this.#rowCount - 1, Math.floor(offset / stride));
        }
        return Math.min(this.#rowCount - 1, this.#tree.lowerBound(offset));
    }

    #isRtl(): boolean {
        if (typeof window === "undefined") return false;
        const target = this.#scrollTarget === "window" ? this.#listEl ?? document.documentElement : this.#viewportEl;
        return target ? getComputedStyle(target).direction === "rtl" : false;
    }

    #readRawScrollOffset(): number {
        if (typeof window === "undefined") return 0;
        const isVertical = this.#orientation === "vertical";
        if (this.#scrollTarget === "window") {
            return isVertical ? window.scrollY : Math.abs(window.scrollX);
        }
        const el = this.#viewportEl;
        if (!el) return 0;
        return isVertical ? el.scrollTop : Math.abs(el.scrollLeft);
    }

    #getViewportSize(): number {
        if (typeof window === "undefined" || !this.#hasMounted) {
            return Math.max(0, this.#options.initialViewportSize ?? 0);
        }
        if (this.#scrollTarget === "window") {
            return this.#orientation === "vertical"
                ? window.innerHeight || document.documentElement.clientHeight
                : window.innerWidth || document.documentElement.clientWidth;
        }
        return this.#viewportSize;
    }

    #getListOffset(): number {
        if (typeof window === "undefined" || !this.#listEl) return 0;
        const isVertical = this.#orientation === "vertical";

        if (this.#scrollTarget === "window") {
            const rect = this.#listEl.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0) {
                return 0;
            }
            return isVertical ? rect.top + window.scrollY : rect.left + window.scrollX;
        }

        if (!this.#viewportEl || this.#viewportEl === this.#listEl) return 0;
        const listRect = this.#listEl.getBoundingClientRect();
        const vpRect = this.#viewportEl.getBoundingClientRect();
        // Environments without layout (e.g. happy-dom) report all-zero rects regardless of scrollTop
        if (
            vpRect.width === 0 &&
            vpRect.height === 0 &&
            listRect.width === 0 &&
            listRect.height === 0 &&
            vpRect.top === 0 &&
            listRect.top === 0 &&
            vpRect.left === 0 &&
            listRect.left === 0
        ) {
            return 0;
        }
        return isVertical
            ? listRect.top - vpRect.top + this.#viewportEl.scrollTop
            : listRect.left - vpRect.left + Math.abs(this.#viewportEl.scrollLeft);
    }

    #getFirstVisibleRow(): number {
        if (this.#rowCount === 0) return 0;
        const relativeScroll = Math.max(0, this.#rawScrollOffset - this.#getListOffset());
        return this.#rowAtOffset(relativeScroll);
    }

    #recomputeRange(): void {
        const count = this.#count;

        if (count === 0) {
            this.#commitState([], 0, 0, 0, 0, -1, 0, -1, 0);
            return;
        }

        const rowCount = this.#rowCount;
        const lanes = this.#lanes;
        const totalSize = this.#getTotalSize();

        const listOffset = this.#getListOffset();
        const relativeScroll = Math.max(0, this.#rawScrollOffset - listOffset);
        const isSsrOrPreMount = typeof window === "undefined" || !this.#hasMounted;

        // SSR / pre-mount initialRenderCount support
        if (isSsrOrPreMount) {
            const initialCount = Math.max(0, Math.floor(this.#options.initialRenderCount ?? 0));
            if (initialCount > 0) {
                const startIndex = 0;
                const endIndex = Math.min(count - 1, initialCount - 1);
                const endRow = Math.floor(endIndex / lanes);
                const renderedEnd =
                    endRow === rowCount - 1 ? totalSize : this.#getRowStart(endRow) + this.#getRowHeight(endRow);
                const offsetAfter = Math.max(0, totalSize - renderedEnd);
                const items = this.#buildItems(startIndex, endIndex);
                this.#commitState(items, 0, offsetAfter, totalSize, startIndex, endIndex, startIndex, endIndex, 0);
                return;
            }
        }

        const vpSize = this.#getViewportSize();

        // Hidden / zero-height container keeps measurements intact and renders nothing
        if (vpSize <= 0) {
            this.#commitState([], 0, totalSize, totalSize, 0, -1, 0, -1, relativeScroll);
            return;
        }

        const visibleStartRow = Math.min(rowCount - 1, Math.max(0, this.#rowAtOffset(relativeScroll)));
        const endOffset = Math.max(0, relativeScroll + vpSize - 0.001);
        const rawEndRow = Math.max(visibleStartRow, this.#rowAtOffset(endOffset));
        const visibleEndRow = Math.min(rowCount - 1, rawEndRow);

        const visStartIdx = visibleStartRow * lanes;
        const visEndIdx = Math.min(count - 1, (visibleEndRow + 1) * lanes - 1);

        const renderStartRow = Math.max(0, visibleStartRow - this.#overscan);
        const renderEndRow = Math.min(rowCount - 1, visibleEndRow + this.#overscan);

        const startIndex = renderStartRow * lanes;
        const endIndex = Math.min(count - 1, (renderEndRow + 1) * lanes - 1);

        const offsetBefore = renderStartRow === 0 ? 0 : this.#getRowStart(renderStartRow);
        const renderedEnd =
            renderEndRow === rowCount - 1
                ? totalSize
                : this.#getRowStart(renderEndRow) + this.#getRowHeight(renderEndRow);
        const offsetAfter = Math.max(0, totalSize - renderedEnd);

        const items = this.#buildItems(startIndex, endIndex);
        this.#commitState(
            items,
            offsetBefore,
            offsetAfter,
            totalSize,
            startIndex,
            endIndex,
            visStartIdx,
            visEndIdx,
            relativeScroll
        );
    }

    #buildItems(startIndex: number, endIndex: number): VirtualScrollItem[] {
        if (endIndex < startIndex) return [];
        const lanes = this.#lanes;
        const fixed = this.#fixed;
        const fixedSize = fixed ? this.#estimate(0) : 0;
        const result: VirtualScrollItem[] = [];

        let cachedRow = -1;
        let cachedRowStart = 0;

        for (let i = startIndex; i <= endIndex; i++) {
            const row = Math.floor(i / lanes);
            if (row !== cachedRow) {
                cachedRow = row;
                cachedRowStart = this.#getRowStart(row);
            }
            result.push({
                index: i,
                lane: i % lanes,
                start: cachedRowStart,
                size: fixed ? fixedSize : (this.#itemSizes[i] ?? this.#estimate(i)),
                key: this.#getItemKey(i),
            });
        }

        return result;
    }

    #commitState(
        items: VirtualScrollItem[],
        offsetBefore: number,
        offsetAfter: number,
        totalSize: number,
        startIndex: number,
        endIndex: number,
        visStartIdx: number,
        visEndIdx: number,
        scrollOffset: number
    ): void {
        if (this.#offsetBefore !== offsetBefore) this.#offsetBefore = offsetBefore;
        if (this.#offsetAfter !== offsetAfter) this.#offsetAfter = offsetAfter;
        if (this.#totalSize !== totalSize) this.#totalSize = totalSize;
        if (this.#startIndex !== startIndex) this.#startIndex = startIndex;
        if (this.#endIndex !== endIndex) this.#endIndex = endIndex;
        if (this.#scrollOffset !== scrollOffset) this.#scrollOffset = scrollOffset;

        // Replace items array when slice, keys, or measured sizes changed
        if (this.#itemsChanged(items)) {
            this.#items = items;
        }

        this.#applyListStyles();

        if (this.#visibleRange.startIndex !== visStartIdx || this.#visibleRange.endIndex !== visEndIdx) {
            const nextRange: VirtualScrollRange = { startIndex: visStartIdx, endIndex: visEndIdx };
            this.#visibleRange = nextRange;
            this.#options.onRangeChange?.(nextRange);
        }
    }

    #itemsChanged(next: VirtualScrollItem[]): boolean {
        const prev = this.#items;
        if (prev.length !== next.length) return true;
        for (const [i, b] of next.entries()) {
            const a = prev[i];
            if (!a || !b) return true;
            if (a.index !== b.index || a.key !== b.key || a.start !== b.start || a.size !== b.size) {
                return true;
            }
        }
        return false;
    }

    #applyListStyles(): void {
        const listEl = this.#listEl;
        if (!listEl) return;

        // Reset previous axis padding if orientation switched
        if (this.#appliedAxis && this.#appliedAxis !== this.#orientation) {
            if (this.#appliedAxis === "vertical") {
                listEl.style.paddingBlockStart = this.#basePaddingBlockStart ? `${this.#basePaddingBlockStart}px` : "";
                listEl.style.paddingBlockEnd = this.#basePaddingBlockEnd ? `${this.#basePaddingBlockEnd}px` : "";
            } else {
                listEl.style.paddingInlineStart = this.#basePaddingInlineStart ? `${this.#basePaddingInlineStart}px` : "";
                listEl.style.paddingInlineEnd = this.#basePaddingInlineEnd ? `${this.#basePaddingInlineEnd}px` : "";
            }
        }

        this.#appliedAxis = this.#orientation;

        listEl.style.setProperty("--cs-virtual-scroll-before", `${this.#offsetBefore}px`);
        listEl.style.setProperty("--cs-virtual-scroll-after", `${this.#offsetAfter}px`);
        listEl.style.setProperty("--cs-virtual-scroll-total-size", `${this.#totalSize}px`);

        if (this.#orientation === "vertical") {
            listEl.style.paddingBlockStart = `${this.#basePaddingBlockStart + this.#offsetBefore}px`;
            listEl.style.paddingBlockEnd = `${this.#basePaddingBlockEnd + this.#offsetAfter}px`;
        } else {
            listEl.style.paddingInlineStart = `${this.#basePaddingInlineStart + this.#offsetBefore}px`;
            listEl.style.paddingInlineEnd = `${this.#basePaddingInlineEnd + this.#offsetAfter}px`;
        }
    }

    #ensureItemResizeObserver(): ResizeObserver {
        if (!this.#itemResizeObserver) {
            this.#itemResizeObserver = new ResizeObserver(this.#handleItemResize);
        }
        return this.#itemResizeObserver;
    }

    #applyMeasuredSize(index: number, measuredSize: number, dirtyRows: number[]): boolean {
        const prevSize = this.#itemSizes[index] ?? 0;
        const wasMeasured = (this.#itemMeasured[index] ?? 0) === 1;

        if (wasMeasured && Math.abs(measuredSize - prevSize) < SUBPIXEL_NOISE_THRESHOLD) {
            return false;
        }

        this.#itemMeasured[index] = 1;
        if (this.#options.getItemKey) {
            this.#measuredByKey.set(this.#getItemKey(index), measuredSize);
        }

        if (!wasMeasured || Math.abs(measuredSize - prevSize) >= SUBPIXEL_NOISE_THRESHOLD) {
            const changed = this.#itemSizes[index] !== measuredSize;
            this.#itemSizes[index] = measuredSize;
            const row = Math.floor(index / this.#lanes);
            if (!dirtyRows.includes(row)) {
                dirtyRows.push(row);
            }
            return changed;
        }

        return false;
    }

    #handleItemResize = (entries: ResizeObserverEntry[]): void => {
        if (this.#fixed || this.#count === 0) return;

        const isVertical = this.#orientation === "vertical";
        const dirtyRows: number[] = [];
        let itemSizeChanged = false;

        for (const entry of entries) {
            const el = entry.target;
            const index = this.#itemElementIndex.get(el);
            if (index === undefined || index < 0 || index >= this.#count) continue;

            let measuredSize: number;
            const borderBox = entry.borderBoxSize?.[0];
            if (borderBox) {
                measuredSize = isVertical ? borderBox.blockSize : borderBox.inlineSize;
            } else {
                const rect = el.getBoundingClientRect();
                measuredSize = isVertical ? rect.height : rect.width;
            }

            if (this.#applyMeasuredSize(index, measuredSize, dirtyRows)) {
                itemSizeChanged = true;
            }
        }

        this.#commitDirtyRows(dirtyRows, itemSizeChanged);
    };

    #commitDirtyRows(dirtyRows: number[], itemSizeChanged = false): void {
        if (dirtyRows.length === 0 && !itemSizeChanged) return;

        const firstVisibleRow = this.#getFirstVisibleRow();
        const lanes = this.#lanes;
        const gap = this.#gap;
        let anchorDelta = 0;
        let rowDidChange = false;

        for (const row of dirtyRows) {
            if (row >= this.#rowCount) continue;
            const rowStartIdx = row * lanes;
            const rowEndIdx = Math.min(this.#count, rowStartIdx + lanes);
            let maxRowSize = 0;
            for (let i = rowStartIdx; i < rowEndIdx; i++) {
                const s = this.#itemSizes[i] ?? 0;
                if (s > maxRowSize) maxRowSize = s;
            }

            const oldRowSize = this.#rowHeights[row] ?? 0;
            const wasRowMeasured = (this.#rowMeasured[row] ?? 0) === 1;
            this.#rowMeasured[row] = 1;
            const rowDelta = maxRowSize - oldRowSize;
            if (oldRowSize === 0 || Math.abs(rowDelta) >= SUBPIXEL_NOISE_THRESHOLD) {
                this.#rowHeights[row] = maxRowSize;
                this.#tree.set(row, maxRowSize + gap);
                rowDidChange = true;

                // Only anchor scroll on subsequent resizes of already-measured rows above the viewport
                if (wasRowMeasured && row < firstVisibleRow) {
                    anchorDelta += rowDelta;
                }
            }
        }

        if (!rowDidChange && !itemSizeChanged) return;

        if (rowDidChange && anchorDelta !== 0 && !this.#isProgrammaticScroll && this.#scrollOffset > 0) {
            this.#applyScrollAnchor(anchorDelta);
        }

        this.#recomputeRange();
    }

    #applyScrollAnchor(delta: number): void {
        const isVertical = this.#orientation === "vertical";
        const signedDelta = isVertical ? delta : this.#isRtl() ? -delta : delta;

        if (this.#scrollTarget === "window") {
            if (typeof window !== "undefined") {
                window.scrollBy(isVertical ? 0 : signedDelta, isVertical ? signedDelta : 0);
                this.#rawScrollOffset = this.#readRawScrollOffset();
            }
            return;
        }

        if (this.#viewportEl) {
            if (isVertical) {
                this.#viewportEl.scrollTop += signedDelta;
            } else {
                this.#viewportEl.scrollLeft += signedDelta;
            }
            this.#rawScrollOffset = this.#readRawScrollOffset();
        }
    }

    #handleScroll = (): void => {
        this.#isScrolling = true;
        if (this.#viewportEl && this.#scrollTarget === "element") {
            this.#viewportEl.dataset.scrolling = "";
        }

        if (this.#scrollIdleTimer !== null) {
            clearTimeout(this.#scrollIdleTimer);
        }
        this.#scrollIdleTimer = setTimeout(() => {
            this.#scrollIdleTimer = null;
            this.#isScrolling = false;
            if (this.#viewportEl && this.#scrollTarget === "element") {
                delete this.#viewportEl.dataset.scrolling;
            }
        }, SCROLL_IDLE_DELAY_MS);

        if (this.#scrollRafId === null) {
            this.#scrollRafId = requestAnimationFrame(() => {
                this.#scrollRafId = null;
                this.#rawScrollOffset = this.#readRawScrollOffset();
                this.#recomputeRange();
            });
        }
    };

    #scrollToRawOffset(rawOffset: number, behavior: ScrollBehavior): void {
        const clamped = Math.max(0, rawOffset);
        const isVertical = this.#orientation === "vertical";
        const signedOffset = isVertical ? clamped : this.#isRtl() ? -clamped : clamped;

        if (this.#scrollTarget === "window") {
            if (typeof window !== "undefined") {
                window.scrollTo({
                    top: isVertical ? signedOffset : undefined,
                    left: isVertical ? undefined : signedOffset,
                    behavior,
                });
            }
        } else if (this.#viewportEl) {
            this.#viewportEl.scrollTo({
                top: isVertical ? signedOffset : undefined,
                left: isVertical ? undefined : signedOffset,
                behavior,
            });
        }

        if (behavior !== "smooth") {
            this.#rawScrollOffset = this.#readRawScrollOffset();
            this.#recomputeRange();
        }
    }

    #computeTargetScrollForIndex(index: number, align: VirtualScrollAlign): number | null {
        const row = Math.floor(index / this.#lanes);
        const itemStart = this.#getRowStart(row);
        const itemSize = this.#getRowHeight(row);
        const itemEnd = itemStart + itemSize;

        const listOffset = this.#getListOffset();
        const absStart = listOffset + itemStart;
        const absEnd = listOffset + itemEnd;

        let padStart = 0;
        let padEnd = 0;
        const scrollEl =
            this.#scrollTarget === "window"
                ? typeof document !== "undefined"
                    ? document.documentElement
                    : null
                : this.#viewportEl;

        if (scrollEl && typeof window !== "undefined") {
            const style = getComputedStyle(scrollEl);
            if (this.#orientation === "vertical") {
                padStart = parsePx(style.scrollPaddingBlockStart);
                padEnd = parsePx(style.scrollPaddingBlockEnd);
            } else {
                padStart = parsePx(style.scrollPaddingInlineStart);
                padEnd = parsePx(style.scrollPaddingInlineEnd);
            }
        }

        const vpSize = this.#getViewportSize();
        const currentScroll = this.#readRawScrollOffset();
        const effectiveVpSize = Math.max(0, vpSize - padStart - padEnd);

        if (align === "start") {
            return Math.max(0, absStart - padStart);
        }
        if (align === "end") {
            return Math.max(0, absEnd - vpSize + padEnd);
        }
        if (align === "center") {
            return Math.max(0, absStart - padStart - (effectiveVpSize - itemSize) / 2);
        }

        // align === "auto"
        const effectiveStart = currentScroll + padStart;
        const effectiveEnd = currentScroll + vpSize - padEnd;
        if (absStart >= effectiveStart && absEnd <= effectiveEnd) {
            return null;
        }
        if (absStart < effectiveStart) {
            return Math.max(0, absStart - padStart);
        }
        return Math.max(0, absEnd - vpSize + padEnd);
    }

    #cancelConvergence(): void {
        if (this.#convergenceRafId !== null) {
            cancelAnimationFrame(this.#convergenceRafId);
            this.#convergenceRafId = null;
        }
        if (this.#programmaticTimer !== null) {
            clearTimeout(this.#programmaticTimer);
            this.#programmaticTimer = null;
        }
    }

    /**
     * Scrolls so the item at `index` is aligned within the viewport.
     */
    scrollToIndex = (index: number, options?: VirtualScrollScrollToIndexOptions): void => {
        if (this.#count === 0) return;
        const clampedIndex = Math.max(0, Math.min(this.#count - 1, Math.floor(index)));
        const align = options?.align ?? "auto";
        const behavior = options?.behavior ?? "auto";

        this.#cancelConvergence();
        this.#isProgrammaticScroll = true;

        const target = this.#computeTargetScrollForIndex(clampedIndex, align);
        if (target !== null) {
            this.#scrollToRawOffset(target, behavior);
        }

        if (behavior !== "smooth" && !this.#fixed && typeof requestAnimationFrame !== "undefined") {
            let pass = 0;
            const converge = (): void => {
                this.#convergenceRafId = null;
                pass += 1;
                const nextTarget = this.#computeTargetScrollForIndex(clampedIndex, align);
                const current = this.#readRawScrollOffset();

                if (nextTarget !== null && Math.abs(nextTarget - current) >= 1) {
                    this.#scrollToRawOffset(nextTarget, "auto");
                }

                if (pass < MAX_CONVERGENCE_PASSES && nextTarget !== null && Math.abs(nextTarget - current) >= 1) {
                    this.#convergenceRafId = requestAnimationFrame(converge);
                } else {
                    this.#isProgrammaticScroll = false;
                }
            };
            this.#convergenceRafId = requestAnimationFrame(converge);
        } else {
            this.#programmaticTimer = setTimeout(
                () => {
                    this.#programmaticTimer = null;
                    this.#isProgrammaticScroll = false;
                },
                behavior === "smooth" ? 300 : 0
            );
        }
    };

    /**
     * Scrolls to a specific pixel `offset` relative to the start of the virtualized list.
     */
    scrollToOffset = (offset: number, options?: VirtualScrollScrollToOffsetOptions): void => {
        const behavior = options?.behavior ?? "auto";
        this.#cancelConvergence();
        this.#isProgrammaticScroll = true;

        this.#scrollToRawOffset(offset + this.#getListOffset(), behavior);

        this.#programmaticTimer = setTimeout(
            () => {
                this.#programmaticTimer = null;
                this.#isProgrammaticScroll = false;
            },
            behavior === "smooth" ? 300 : 0
        );
    };

    /**
     * Forces synchronous re-measurement of all currently mounted items.
     */
    measure = (): void => {
        if (this.#fixed || this.#count === 0) return;

        const isVertical = this.#orientation === "vertical";
        const dirtyRows: number[] = [];
        let itemSizeChanged = false;

        for (const el of this.#observedItemElements) {
            const index = this.#itemElementIndex.get(el);
            if (index === undefined || index < 0 || index >= this.#count) continue;

            const rect = el.getBoundingClientRect();
            const measuredSize = isVertical ? rect.height : rect.width;
            if (this.#applyMeasuredSize(index, measuredSize, dirtyRows)) {
                itemSizeChanged = true;
            }
        }

        this.#commitDirtyRows(dirtyRows, itemSizeChanged);
    };

    /**
     * Clears cached item measurements from `fromIndex` onward.
     */
    invalidate = (fromIndex = 0): void => {
        if (this.#fixed || this.#count === 0) return;
        const start = Math.max(0, Math.floor(fromIndex));
        if (start >= this.#count) return;

        let itemSizeChanged = false;
        for (let i = start; i < this.#count; i++) {
            const estimated = this.#estimate(i);
            if (this.#itemSizes[i] !== estimated) {
                itemSizeChanged = true;
            }
            this.#itemMeasured[i] = 0;
            this.#itemSizes[i] = estimated;
            if (this.#options.getItemKey) {
                this.#measuredByKey.delete(this.#getItemKey(i));
            }
        }

        const startRow = Math.floor(start / this.#lanes);
        const dirtyRows: number[] = [];
        for (let r = startRow; r < this.#rowCount; r++) {
            this.#rowMeasured[r] = 0;
            dirtyRows.push(r);
        }
        this.#commitDirtyRows(dirtyRows, itemSizeChanged);
    };

    /**
     * Returns ARIA attributes for a virtualized item at `index`.
     */
    getItemAriaProps = (index: number, options?: VirtualScrollItemAriaOptions): VirtualScrollItemAriaProps => {
        const role = options?.role ?? "listitem";
        if (role === "row") {
            return {
                "aria-rowindex": index + 1 + (options?.headerRowCount ?? 0),
            };
        }
        return {
            "aria-setsize": this.#count,
            "aria-posinset": index + 1,
        };
    };

    /**
     * Attachment for the scrollable viewport element (no-op for scroll listeners when `scrollTarget === "window"`).
     */
    attachViewport: Attachment<HTMLElement> = (node: HTMLElement) =>
        untrack(() => {
            this.#viewportEl = node;
            this.#hasMounted = true;
            node.dataset.virtualScrollViewport = "";
            node.dataset.orientation = this.#orientation;

            if (this.#scrollTarget === "window") {
                return () => {
                    if (this.#viewportEl === node) {
                        this.#viewportEl = null;
                    }
                };
            }

            const prevOverflowAnchor = node.style.overflowAnchor;
            node.style.overflowAnchor = "none";
            node.addEventListener("scroll", this.#handleScroll, { passive: true });

            let vpResizeObserver: ResizeObserver | null = null;
            if (typeof ResizeObserver !== "undefined") {
                vpResizeObserver = new ResizeObserver(() => {
                    const nextSize = this.#orientation === "vertical" ? node.clientHeight : node.clientWidth;
                    if (
                        Math.abs(nextSize - this.#viewportSize) >= SUBPIXEL_NOISE_THRESHOLD ||
                        nextSize !== this.#viewportSize
                    ) {
                        this.#viewportSize = nextSize;
                        this.#rawScrollOffset = this.#readRawScrollOffset();
                        this.#recomputeRange();
                    }
                });
                vpResizeObserver.observe(node);
            }

            this.#viewportSize = this.#orientation === "vertical" ? node.clientHeight : node.clientWidth;
            this.#rawScrollOffset = this.#readRawScrollOffset();
            this.#recomputeRange();

            return () => {
                node.removeEventListener("scroll", this.#handleScroll);
                vpResizeObserver?.disconnect();
                node.style.overflowAnchor = prevOverflowAnchor;

                if (this.#scrollRafId !== null) {
                    cancelAnimationFrame(this.#scrollRafId);
                    this.#scrollRafId = null;
                }
                if (this.#scrollIdleTimer !== null) {
                    clearTimeout(this.#scrollIdleTimer);
                    this.#scrollIdleTimer = null;
                }
                this.#cancelConvergence();

                if (this.#viewportEl === node) {
                    this.#viewportEl = null;
                }
            };
        });

    /**
     * Attachment for the inner list element (`<div>`, `<ul>`, `<ol>`).
     * Preserves initial computed padding, auto-reads CSS gap when omitted, and drives `window` scroll when `scrollTarget === "window"`.
     */
    attachList: Attachment<HTMLElement> = (node: HTMLElement) =>
        untrack(() => {
            this.#listEl = node;
            this.#hasMounted = true;
            node.dataset.virtualScrollList = "";

            const prevOverflowAnchor = node.style.overflowAnchor;
            node.style.overflowAnchor = "none";

            const computed = getComputedStyle(node);
            this.#basePaddingBlockStart = parsePx(computed.paddingBlockStart);
            this.#basePaddingBlockEnd = parsePx(computed.paddingBlockEnd);
            this.#basePaddingInlineStart = parsePx(computed.paddingInlineStart);
            this.#basePaddingInlineEnd = parsePx(computed.paddingInlineEnd);
            this.#cssGapVertical = parsePx(computed.rowGap);
            this.#cssGapHorizontal = parsePx(computed.columnGap);

            // Re-sync gap if `options.gap` was omitted and CSS gap was detected
            const resolvedGap = this.#resolveGap(this.#orientation);
            if (resolvedGap !== this.#gap) {
                this.#gap = resolvedGap;
                if (!this.#fixed) {
                    this.#rebuildDynamicStructures();
                }
            }

            const isWindowTarget = this.#scrollTarget === "window";
            const onWindowResize = (): void => {
                this.#rawScrollOffset = this.#readRawScrollOffset();
                this.#recomputeRange();
            };

            if (isWindowTarget && typeof window !== "undefined") {
                window.addEventListener("scroll", this.#handleScroll, { passive: true });
                window.addEventListener("resize", onWindowResize, { passive: true });
                this.#rawScrollOffset = this.#readRawScrollOffset();
            }

            this.#recomputeRange();
            this.#applyListStyles();

            return () => {
                if (isWindowTarget && typeof window !== "undefined") {
                    window.removeEventListener("scroll", this.#handleScroll);
                    window.removeEventListener("resize", onWindowResize);
                    if (this.#scrollRafId !== null) {
                        cancelAnimationFrame(this.#scrollRafId);
                        this.#scrollRafId = null;
                    }
                    if (this.#scrollIdleTimer !== null) {
                        clearTimeout(this.#scrollIdleTimer);
                        this.#scrollIdleTimer = null;
                    }
                    this.#cancelConvergence();
                }

                node.style.overflowAnchor = prevOverflowAnchor;
                node.style.removeProperty("--cs-virtual-scroll-before");
                node.style.removeProperty("--cs-virtual-scroll-after");
                node.style.removeProperty("--cs-virtual-scroll-total-size");
                node.style.paddingBlockStart = "";
                node.style.paddingBlockEnd = "";
                node.style.paddingInlineStart = "";
                node.style.paddingInlineEnd = "";

                if (this.#listEl === node) {
                    this.#listEl = null;
                    this.#appliedAxis = null;
                }
            };
        });

    /**
     * Attachment for each rendered virtualized item element.
     */
    attachItem = (index: number): Attachment<HTMLElement> => {
        return (node: HTMLElement) =>
            untrack(() => {
                node.dataset.virtualScrollItem = "";
                node.dataset.index = String(index);
                node.style.contain = "layout style";

                if (!this.#fixed && typeof ResizeObserver !== "undefined") {
                    const observer = this.#ensureItemResizeObserver();
                    this.#itemElementIndex.set(node, index);
                    this.#observedItemElements.add(node);
                    observer.observe(node);

                    return () => {
                        this.#itemElementIndex.delete(node);
                        this.#observedItemElements.delete(node);
                        observer.unobserve(node);
                    };
                }

                return noop;
            });
    };
}

/**
 * Creates a reactive `VirtualScrollController` for virtualized lists, grids, and tables.
 */
export function createVirtualScroll(options: VirtualScrollOptions): VirtualScrollController {
    return new VirtualScrollController(options);
}
