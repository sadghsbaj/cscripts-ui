<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import {
        NumberMorph,
        type NumberMorphProps,
    } from "../number-morph/index.ts";
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartDescription from "./ChartDescription.svelte";
    import ChartEmpty from "./ChartEmpty.svelte";
    import ChartHeader from "./ChartHeader.svelte";
    import ChartHeatmap from "./ChartHeatmap.svelte";
    import ChartLoading from "./ChartLoading.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import {
        computeHeatmapGrid,
        deduplicateHeatmapCategories,
        getHeatmapSizeMetrics,
        resolveHeatmapCellColor,
        snapInt,
        type HeatmapCellInput,
    } from "./chart-geometry.internal.ts";
    import {
        computeRotatedTickHeight,
        measureTextWidth,
        thinAxisTicks,
        truncateTextToWidth,
    } from "./chart-measure.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import {
        ChartState,
        type ChartDatum,
        type ChartHeatmapMode,
        type ChartHeatmapRamp,
        type ChartSvgRect,
    } from "./chart-state.svelte.ts";
    import type {
        ChartHeatmapCell,
        ChartHeatmapTooltipContext,
        HeatmapChartProps,
    } from "./index.ts";

    type MorphTiming = NonNullable<NumberMorphProps["transformTiming"]>;

    const EDGE_CLEARANCE = 8;
    const FLIP_HYSTERESIS = 16;
    const TOOLTIP_OFFSET = 12;

    const MORPH_TIMING: MorphTiming = {
        duration: 160,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    };

    const OPACITY_TIMING: MorphTiming = {
        duration: 100,
        easing: "cubic-bezier(0.5, 1, 0.89, 1)",
    };

    interface PreparedTickItem {
        readonly index: number;
        readonly category: string;
        readonly fullLabel: string;
        readonly text: string;
        readonly truncated: boolean;
        readonly position: number;
    }

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        x,
        y,
        value,
        xCategories,
        yCategories,
        mode = "sequential",
        ramp,
        domain,
        pivot = 0,
        gap,
        radius,
        valueLabels = true,
        formatValue,
        numberFormat,
        locales,
        xAxis,
        yAxis,
        legend = "bottom",
        tooltip = true,
        tooltipMode = "item",
        selectable = false,
        selectedIndex = $bindable<number | null>(null),
        activeIndex = $bindable<number | null>(null),
        onCellClick,
        palette = "categorical",
        monotone,
        title,
        description,
        actions,
        height,
        aspectRatio,
        margin,
        loading = false,
        empty,
        emptyTitle,
        emptyDescription,
        interactive = true,
        label,
        labelledBy,
        children,
        ...rest
    }: HeatmapChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    let stageRef = $state<HTMLDivElement | null>(null);
    let tooltipRef = $state<HTMLDivElement | null>(null);
    let stageWidth = $state(0);
    let svgRect = $state.raw<ChartSvgRect | null>(null);

    const metrics = $derived(getHeatmapSizeMetrics(size));
    const resolvedMode = $derived<ChartHeatmapMode>(
        ramp === "diverging" ? "diverging" : mode,
    );
    const resolvedRamp = $derived<ChartHeatmapRamp>(
        ramp ?? (resolvedMode === "diverging" ? "diverging" : "accent"),
    );

    const tickFontSize = $derived(size === "lg" ? 12 : 11);
    const tickFont = $derived({ fontSize: tickFontSize, fontWeight: 400 });

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractCategory(
        accessor: keyof TDatum | ((datum: TDatum, index: number) => string | number),
        datum: TDatum,
        index: number,
    ): string {
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined) return "";
        return String(raw);
    }

    function extractNumber(
        accessor: keyof TDatum | ((datum: TDatum, index: number) => number | null | undefined),
        datum: TDatum,
        index: number,
    ): number | null {
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
            return null;
        }
        const numeric = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    const cellInputs = $derived.by((): readonly HeatmapCellInput<TDatum>[] =>
        data.map((datum, index) => ({
            x: extractCategory(x, datum, index),
            y: extractCategory(y, datum, index),
            value: extractNumber(value, datum, index),
            datum,
        })),
    );

    const resolvedXCategories = $derived.by((): readonly string[] =>
        deduplicateHeatmapCategories(
            xCategories && xCategories.length > 0
                ? xCategories
                : cellInputs.map((item) => item.x),
        ),
    );

    const resolvedYCategories = $derived.by((): readonly string[] =>
        deduplicateHeatmapCategories(
            yCategories && yCategories.length > 0
                ? yCategories
                : cellInputs.map((item) => item.y),
        ),
    );

    const showXAxis = $derived(xAxis?.show !== false);
    const showYAxis = $derived(yAxis?.show !== false);

    function formatXCategory(cat: string): string {
        if (xAxis?.format) return xAxis.format(cat);
        return cat;
    }

    function formatYCategory(cat: string): string {
        if (yAxis?.format) return yAxis.format(cat);
        return cat;
    }

    const formattedXLabels = $derived(resolvedXCategories.map((cat) => formatXCategory(cat)));
    const formattedYLabels = $derived(resolvedYCategories.map((cat) => formatYCategory(cat)));

    const maxYTickAllowance = $derived.by((): number => {
        if (yAxis?.maxTickWidth !== undefined) return yAxis.maxTickWidth;
        if (stageWidth > 0) {
            return Math.min(136, Math.max(52, Math.floor(stageWidth * 0.28)));
        }
        return 112;
    });

    const maxXLabelWidth = $derived.by((): number => {
        let maxW = 0;
        for (const lbl of formattedXLabels) {
            const w = measureTextWidth(lbl, tickFont);
            if (w > maxW) maxW = w;
        }
        return maxW;
    });

    const resolvedLeftMargin = $derived.by((): number => {
        if (margin?.left !== undefined) return Math.max(0, Math.round(margin.left));
        if (!showYAxis || formattedYLabels.length === 0) return 6;

        let maxMeasured = 0;
        for (const lbl of formattedYLabels) {
            const fitted = truncateTextToWidth(lbl, maxYTickAllowance, tickFont);
            if (fitted.width > maxMeasured) maxMeasured = fitted.width;
        }
        const labelExtra = yAxis?.label ? tickFontSize + 10 : 0;
        return Math.ceil(maxMeasured) + 12 + labelExtra;
    });

    const resolvedRightMargin = $derived(
        margin?.right !== undefined ? Math.max(0, Math.round(margin.right)) : 8,
    );

    const plotWidth = $derived(
        Math.max(0, stageWidth - resolvedLeftMargin - resolvedRightMargin),
    );

    const approxColBandwidth = $derived(
        resolvedXCategories.length > 0 ? plotWidth / resolvedXCategories.length : 0,
    );

    const resolvedBottomTickAngle = $derived.by((): 0 | -35 | -45 => {
        if (!showXAxis || resolvedXCategories.length === 0) return 0;
        const requested = xAxis?.tickAngle ?? "auto";
        if (requested !== "auto") return requested;
        if (approxColBandwidth > 0 && maxXLabelWidth + 6 > approxColBandwidth) {
            return maxXLabelWidth > 72 ? -45 : -35;
        }
        return 0;
    });

    const maxXTickAllowance = $derived.by((): number => {
        if (xAxis?.maxTickWidth !== undefined) return xAxis.maxTickWidth;
        if (resolvedBottomTickAngle !== 0) return 96;
        if (approxColBandwidth > 0) {
            return Math.max(24, Math.floor(approxColBandwidth - 4));
        }
        return 84;
    });

    const resolvedTopMargin = $derived(
        margin?.top !== undefined ? Math.max(0, Math.round(margin.top)) : 6,
    );

    const resolvedBottomMargin = $derived.by((): number => {
        if (margin?.bottom !== undefined) return Math.max(0, Math.round(margin.bottom));
        if (!showXAxis || formattedXLabels.length === 0) return 6;

        const labelExtra = xAxis?.label ? tickFontSize + 10 : 0;
        if (resolvedBottomTickAngle !== 0) {
            const effectiveMaxW = Math.min(maxXLabelWidth, maxXTickAllowance);
            const rotatedH = computeRotatedTickHeight(
                effectiveMaxW,
                resolvedBottomTickAngle,
                tickFontSize,
            );
            return Math.max(28, rotatedH + 12 + labelExtra);
        }
        return Math.ceil(tickFontSize * 1.35) + 12 + labelExtra;
    });

    const intrinsicPlotHeight = $derived.by((): number => {
        const rowCount = Math.max(1, resolvedYCategories.length);
        const resolvedGap = gap !== undefined && Number.isFinite(gap) ? Math.max(0, gap) : metrics.gap;
        return Math.round(
            rowCount * metrics.defaultCellHeight + Math.max(0, rowCount - 1) * resolvedGap,
        );
    });

    const totalIntrinsicHeight = $derived(
        intrinsicPlotHeight + resolvedTopMargin + resolvedBottomMargin,
    );

    const resolvedHeight = $derived(
        height !== undefined
            ? typeof height === "number"
                ? `${height}px`
                : height
            : `${totalIntrinsicHeight}px`,
    );

    const svgHeight = $derived(
        typeof height === "number" ? Math.max(80, height) : totalIntrinsicHeight,
    );

    const plotHeight = $derived(
        Math.max(16, svgHeight - resolvedTopMargin - resolvedBottomMargin),
    );

    const gridLayout = $derived.by(() =>
        computeHeatmapGrid({
            cells: cellInputs,
            xCategories: resolvedXCategories,
            yCategories: resolvedYCategories,
            width: plotWidth,
            height: plotHeight,
            size,
            gap,
            radius,
            mode: resolvedMode,
            domain,
            pivot,
        }),
    );

    const totalCellCount = $derived(gridLayout.cells.length);

    const resolvedActiveIndex = $derived(
        activeIndex !== null && activeIndex >= 0 && activeIndex < totalCellCount
            ? activeIndex
            : null,
    );
    const resolvedSelectedIndex = $derived(
        selectedIndex !== null && selectedIndex >= 0 && selectedIndex < totalCellCount
            ? selectedIndex
            : null,
    );

    function formatNumericValue(
        num: number,
        cell?: ChartHeatmapCell<TDatum>,
    ): string {
        if (formatValue && cell) return formatValue(num, cell);
        if (numberFormat !== undefined || locales !== undefined) {
            try {
                return new Intl.NumberFormat(locales, numberFormat).format(num);
            } catch {
                // Fall back to default tick formatting when Intl options are partial.
            }
        }
        return formatDefaultTick(num);
    }

    const resolvedCells = $derived.by((): readonly ChartHeatmapCell<TDatum>[] =>
        gridLayout.cells.map((geom) => {
            const color = resolveHeatmapCellColor(geom.t, resolvedRamp, resolvedMode);
            const baseCell: ChartHeatmapCell<TDatum> = {
                ...geom,
                color,
                formattedValue: "",
            };
            const formattedValue =
                geom.value !== null ? formatNumericValue(geom.value, baseCell) : "";
            return {
                ...baseCell,
                formattedValue,
            };
        }),
    );

    const activeCellObj = $derived(
        resolvedActiveIndex !== null ? (resolvedCells[resolvedActiveIndex] ?? null) : null,
    );
    const activeColIndex = $derived(activeCellObj?.col ?? null);
    const activeRowIndex = $derived(activeCellObj?.row ?? null);

    // Keep <Chart>'s figure[data-scrubbing] and [data-has-selection] synced cleanly.
    $effect.pre(() => {
        const nextActive = resolvedActiveIndex;
        const nextSelected = resolvedSelectedIndex;
        const currentData = data;
        untrack(() => {
            if (chartState.data !== currentData) {
                chartState.data = currentData;
            }
            chartState.setActiveIndex(nextActive);
            chartState.setSelectedIndex(nextSelected);
        });
    });

    const preparedXTicks = $derived.by((): readonly PreparedTickItem[] => {
        if (!showXAxis || gridLayout.colPositions.length === 0) return [];

        const rawItems = gridLayout.colPositions.map((colPos, index) => {
            const fullLabel = formattedXLabels[index] ?? colPos.category;
            return {
                index,
                category: colPos.category,
                label: fullLabel,
                position: colPos.center,
            };
        });

        const keptIndices = thinAxisTicks(rawItems, {
            minGutter: 8,
            font: tickFont,
            tickAngle: resolvedBottomTickAngle,
            maxTickWidth: maxXTickAllowance,
        });

        return rawItems
            .filter(
                (item) =>
                    keptIndices.includes(item.index) || activeColIndex === item.index,
            )
            .map((item) => {
                const fitted = truncateTextToWidth(
                    item.label,
                    maxXTickAllowance,
                    tickFont,
                );
                return {
                    index: item.index,
                    category: item.category,
                    fullLabel: item.label,
                    text: fitted.text,
                    truncated: fitted.truncated,
                    position: snapInt(item.position),
                };
            });
    });

    const preparedYTicks = $derived.by((): readonly PreparedTickItem[] => {
        if (!showYAxis || gridLayout.rowPositions.length === 0) return [];

        return gridLayout.rowPositions.map((rowPos, index) => {
            const fullLabel = formattedYLabels[index] ?? rowPos.category;
            const fitted = truncateTextToWidth(fullLabel, maxYTickAllowance, tickFont);
            return {
                index,
                category: rowPos.category,
                fullLabel,
                text: fitted.text,
                truncated: fitted.truncated,
                position: snapInt(rowPos.center),
            };
        });
    });

    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ??
            (title !== undefined && label === undefined && rest["aria-label"] === undefined
                ? titleId
                : undefined),
    );
    const isEmptyState = $derived(
        empty ??
            (data.length === 0 ||
                resolvedXCategories.length === 0 ||
                resolvedYCategories.length === 0),
    );
    const showLegend = $derived(legend !== "none" && !loading && !isEmptyState);

    const formattedDomainMin = $derived(formatNumericValue(gridLayout.domain[0]));
    const formattedDomainMax = $derived(formatNumericValue(gridLayout.domain[1]));
    const formattedDomainPivot = $derived(formatNumericValue(gridLayout.pivot));
    const activeNotchPercent = $derived(
        activeCellObj !== null && activeCellObj.t !== null
            ? Math.max(0, Math.min(100, activeCellObj.t * 100))
            : null,
    );

    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const canShowTooltip = $derived(
        interactive && tooltip !== false && tooltipMode !== "none" && !loading && !isEmptyState,
    );

    const tooltipContext = $derived.by((): ChartHeatmapTooltipContext<TDatum> | null => {
        if (!canShowTooltip || !activeCellObj) return null;
        return {
            index: activeCellObj.index,
            row: activeCellObj.row,
            col: activeCellObj.col,
            cell: activeCellObj,
            xLabel: formattedXLabels[activeCellObj.col] ?? activeCellObj.xCategory,
            yLabel: formattedYLabels[activeCellObj.row] ?? activeCellObj.yCategory,
            formattedValue:
                activeCellObj.value !== null
                    ? activeCellObj.formattedValue
                    : t({ de: "Keine Daten", en: "No data" }),
        };
    });

    const isTooltipOpen = $derived(
        tooltipContext !== null && stageWidth > 0 && activeCellObj !== null,
    );

    const liveAnnouncement = $derived.by((): string => {
        if (!interactive || !tooltipContext) return "";
        return `${tooltipContext.yLabel}, ${tooltipContext.xLabel}: ${tooltipContext.formattedValue}`;
    });

    function syncSvgRect(): void {
        const targetEl = svgRef ?? stageRef;
        if (!targetEl) {
            svgRect = null;
            return;
        }
        const rect = targetEl.getBoundingClientRect();
        svgRect = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };
    }

    function handleCellHover(index: number | null): void {
        if (!interactive) return;
        syncSvgRect();
        activeIndex = index;
    }

    function handleCellSelect(cell: ChartHeatmapCell<TDatum>, index: number): void {
        if (selectable) {
            selectedIndex = selectedIndex === index ? null : index;
        }
        onCellClick?.(cell, index);
    }

    function handleStagePointerLeave(): void {
        if (!interactive) return;
        activeIndex = null;
    }

    function handleStageFocus(): void {
        if (!interactive) return;
        syncSvgRect();
    }

    function handleStageBlur(): void {
        if (!interactive) return;
        activeIndex = null;
    }

    function moveActiveCell2D(dRow: number, dCol: number): void {
        const colCount = resolvedXCategories.length;
        const rowCount = resolvedYCategories.length;
        if (colCount === 0 || rowCount === 0) {
            activeIndex = null;
            return;
        }

        const current = resolvedActiveIndex;
        if (current === null) {
            activeIndex = dRow < 0 || dCol < 0 ? rowCount * colCount - 1 : 0;
            return;
        }

        const curRow = Math.floor(current / colCount);
        const curCol = current % colCount;
        const nextRow = Math.max(0, Math.min(rowCount - 1, curRow + dRow));
        const nextCol = Math.max(0, Math.min(colCount - 1, curCol + dCol));
        activeIndex = nextRow * colCount + nextCol;
    }

    function handleStageKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        if (event.defaultPrevented || !interactive || totalCellCount === 0) return;

        switch (event.key) {
            case "ArrowRight": {
                event.preventDefault();
                syncSvgRect();
                moveActiveCell2D(0, 1);
                return;
            }
            case "ArrowLeft": {
                event.preventDefault();
                syncSvgRect();
                moveActiveCell2D(0, -1);
                return;
            }
            case "ArrowDown": {
                event.preventDefault();
                syncSvgRect();
                moveActiveCell2D(1, 0);
                return;
            }
            case "ArrowUp": {
                event.preventDefault();
                syncSvgRect();
                moveActiveCell2D(-1, 0);
                return;
            }
            case "Home": {
                event.preventDefault();
                syncSvgRect();
                activeIndex = 0;
                return;
            }
            case "End": {
                event.preventDefault();
                syncSvgRect();
                activeIndex = totalCellCount - 1;
                return;
            }
            case "Escape": {
                if (activeIndex !== null) {
                    event.preventDefault();
                    activeIndex = null;
                }
                return;
            }
            case "Enter":
            case " ": {
                if (activeCellObj !== null) {
                    event.preventDefault();
                    handleCellSelect(activeCellObj, activeCellObj.index);
                }
                return;
            }
            default: {
                return;
            }
        }
    }

    $effect(() => {
        const el = stageRef;
        if (!el) return;

        const initialRect = el.getBoundingClientRect();
        if (initialRect.width > 0) {
            const w = Math.round(initialRect.width);
            stageWidth = w;
            chartState.setDimensions(w, untrack(() => svgHeight));
        }
        syncSvgRect();

        let scrollRafId: number | null = null;
        function handleViewportShift(): void {
            if (scrollRafId !== null) return;
            scrollRafId = requestAnimationFrame(() => {
                scrollRafId = null;
                syncSvgRect();
            });
        }

        window.addEventListener("scroll", handleViewportShift, { passive: true, capture: true });
        window.addEventListener("resize", handleViewportShift, { passive: true });

        let resizeRafId: number | null = null;
        let pendingWidth = 0;
        let observer: ResizeObserver | null = null;

        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (!entry) return;
                pendingWidth = entry.contentRect.width;

                if (resizeRafId !== null) return;
                resizeRafId = requestAnimationFrame(() => {
                    resizeRafId = null;
                    const w = Math.round(pendingWidth);
                    stageWidth = w;
                    chartState.setDimensions(w, untrack(() => svgHeight));
                    syncSvgRect();
                });
            });

            observer.observe(el);
        }

        return () => {
            window.removeEventListener("scroll", handleViewportShift, { capture: true });
            window.removeEventListener("resize", handleViewportShift);
            observer?.disconnect();
            if (scrollRafId !== null) {
                cancelAnimationFrame(scrollRafId);
                scrollRafId = null;
            }
            if (resizeRafId !== null) {
                cancelAnimationFrame(resizeRafId);
                resizeRafId = null;
            }
        };
    });

    // Floating top-layer tooltip positioning (instant-first, glide-after)
    let tooltipCoords = $state<{ readonly x: number; readonly y: number }>({ x: 0, y: 0 });
    let tooltipSide = $state<"end" | "start">("end");
    let tooltipGliding = $state(false);
    let tooltipWasOpen = false;
    let tooltipGlideRafId: number | null = null;

    function cancelTooltipGlideRaf(): void {
        if (tooltipGlideRafId === null) return;
        cancelAnimationFrame(tooltipGlideRafId);
        tooltipGlideRafId = null;
    }

    function safeShowPopover(el: HTMLDivElement): void {
        if (typeof el.showPopover !== "function") return;
        try {
            if (!el.matches(":popover-open")) {
                el.showPopover();
            }
        } catch {
            // Ignore when Popover API is unavailable or element is detached.
        }
    }

    function safeHidePopover(el: HTMLDivElement): void {
        if (typeof el.hidePopover !== "function") return;
        try {
            if (el.matches(":popover-open")) {
                el.hidePopover();
            }
        } catch {
            // Ignore when already closed or unsupported.
        }
    }

    $effect(() => {
        const el = tooltipRef;
        const cell = activeCellObj;
        const open = isTooltipOpen;

        if (!el || !open || !cell) {
            if (tooltipWasOpen) {
                cancelTooltipGlideRaf();
                tooltipWasOpen = false;
                tooltipGliding = false;
                tooltipSide = "end";
                if (el) safeHidePopover(el);
            }
            return;
        }

        const rect = svgRect;
        const isFirstOpen = !tooltipWasOpen;
        if (isFirstOpen) {
            safeShowPopover(el);
        }

        const cellRightX = (rect?.left ?? 0) + resolvedLeftMargin + cell.x + cell.width;
        const cellLeftX = (rect?.left ?? 0) + resolvedLeftMargin + cell.x;
        const anchorY = (rect?.top ?? 0) + resolvedTopMargin + cell.centerY;

        const tooltipWidth = el.offsetWidth > 0 ? el.offsetWidth : 168;
        const tooltipHeight = el.offsetHeight > 0 ? el.offsetHeight : 68;
        const viewportWidth =
            typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : 1024;
        const viewportHeight =
            typeof window !== "undefined" && window.innerHeight > 0 ? window.innerHeight : 768;

        const currentSide = untrack(() => tooltipSide);
        let nextSide: "end" | "start" = currentSide;

        const rightEdge = cellRightX + TOOLTIP_OFFSET + tooltipWidth + EDGE_CLEARANCE;
        const leftSpace = cellLeftX - TOOLTIP_OFFSET - EDGE_CLEARANCE;
        const rightSpace = viewportWidth - (cellRightX + TOOLTIP_OFFSET + EDGE_CLEARANCE);

        if (currentSide === "end") {
            if (rightEdge > viewportWidth && (leftSpace >= tooltipWidth || leftSpace > rightSpace)) {
                nextSide = "start";
            }
        } else if (rightEdge + FLIP_HYSTERESIS <= viewportWidth) {
            nextSide = "end";
        }

        const rawX =
            nextSide === "end"
                ? cellRightX + TOOLTIP_OFFSET
                : cellLeftX - TOOLTIP_OFFSET - tooltipWidth;
        const maxX = Math.max(EDGE_CLEARANCE, viewportWidth - tooltipWidth - EDGE_CLEARANCE);
        const clampedX = Math.max(EDGE_CLEARANCE, Math.min(maxX, rawX));

        const rawY = anchorY - tooltipHeight / 2;
        const maxY = Math.max(EDGE_CLEARANCE, viewportHeight - tooltipHeight - EDGE_CLEARANCE);
        const clampedY = Math.max(EDGE_CLEARANCE, Math.min(maxY, rawY));

        const snappedX = Math.round(clampedX);
        const snappedY = Math.round(clampedY);

        if (!isFirstOpen) {
            tooltipCoords = { x: snappedX, y: snappedY };
            tooltipSide = nextSide;
            return;
        }

        cancelTooltipGlideRaf();
        tooltipGliding = false;
        tooltipCoords = { x: snappedX, y: snappedY };
        tooltipSide = nextSide;
        tooltipWasOpen = true;

        if (typeof requestAnimationFrame !== "function") return;

        tooltipGlideRafId = requestAnimationFrame(() => {
            tooltipGlideRafId = null;
            if (tooltipWasOpen) {
                tooltipGliding = true;
            }
        });
    });

    function cleanupTooltipPopover(): void {
        cancelTooltipGlideRaf();
        tooltipWasOpen = false;
        tooltipGliding = false;
        tooltipSide = "end";
        if (tooltipRef) safeHidePopover(tooltipRef);
    }

    $effect(() => cleanupTooltipPopover);
</script>

{#snippet heatmapLegend(position: "top" | "bottom" | "end")}
    <div
        class="cs-chart-legend cs-chart-heatmap-legend"
        data-position={position}
        data-mode={resolvedMode}
        data-ramp={resolvedRamp}
        role="img"
        aria-label={t({
            de: `Farbskala von ${formattedDomainMin} bis ${formattedDomainMax}`,
            en: `Color scale from ${formattedDomainMin} to ${formattedDomainMax}`,
        })}
    >
        <span class="cs-chart-heatmap-legend-bound">{formattedDomainMin}</span>
        <div
            class="cs-chart-heatmap-legend-bar"
            data-mode={resolvedMode}
            data-ramp={resolvedRamp}
        >
            {#if resolvedMode === "diverging"}
                <span class="cs-chart-heatmap-legend-pivot" aria-hidden="true"></span>
            {/if}
            {#if activeNotchPercent !== null}
                <span
                    class="cs-chart-heatmap-legend-notch"
                    style:inset-inline-start="{activeNotchPercent}%"
                    aria-hidden="true"
                ></span>
            {/if}
        </div>
        <span class="cs-chart-heatmap-legend-bound">{formattedDomainMax}</span>
        {#if resolvedMode === "diverging"}
            <span class="cs-chart-heatmap-legend-mid-label">
                ({t({ de: "Mitte", en: "Mid" })} {formattedDomainPivot})
            </span>
        {/if}
    </div>
{/snippet}

{#snippet heatmapStage()}
    {#if loading}
        <ChartLoading shape="bars" style="block-size: {resolvedHeight}" />
    {:else if isEmptyState}
        <ChartEmpty
            title={emptyTitle}
            description={emptyDescription}
            style="min-block-size: {resolvedHeight}"
        />
    {:else}
        <!-- role="application" is bound dynamically when interactive 2D keyboard navigation is enabled. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
            bind:this={stageRef}
            class="cs-chart-heatmap-stage"
            role={interactive ? "application" : undefined}
            aria-roledescription={interactive
                ? t({ de: "Heatmap-Matrix", en: "heatmap matrix" })
                : undefined}
            aria-label={interactive && !resolvedLabelledBy
                ? (label ??
                      rest["aria-label"] ??
                      t({ de: "Interaktive Heatmap", en: "Interactive heatmap" }))
                : (label ?? rest["aria-label"])}
            aria-labelledby={resolvedLabelledBy}
            tabindex={interactive ? 0 : undefined}
            data-interactive={interactive ? "" : undefined}
            data-scrubbing={activeCellObj !== null ? "" : undefined}
            data-has-selection={resolvedSelectedIndex !== null ? "" : undefined}
            style:block-size={resolvedHeight}
            style:aspect-ratio={aspectRatio}
            onpointerleave={handleStagePointerLeave}
            onkeydown={handleStageKeyDown}
            onfocus={handleStageFocus}
            onblur={handleStageBlur}
        >
            <svg
                bind:this={svgRef}
                class="cs-chart-svg"
                width={stageWidth}
                height={svgHeight}
                role={label || rest["aria-label"] || resolvedLabelledBy ? "img" : undefined}
                aria-label={label ?? rest["aria-label"]}
                aria-labelledby={resolvedLabelledBy}
                aria-hidden={!label && !rest["aria-label"] && !resolvedLabelledBy
                    ? "true"
                    : undefined}
            >
                {#if stageWidth > 0 && plotWidth > 0 && plotHeight > 0}
                    <g transform="translate({resolvedLeftMargin}, {resolvedTopMargin})">
                        <ChartHeatmap
                            cells={cellInputs}
                            xCategories={resolvedXCategories}
                            yCategories={resolvedYCategories}
                            width={plotWidth}
                            height={plotHeight}
                            {size}
                            mode={resolvedMode}
                            ramp={resolvedRamp}
                            {domain}
                            {pivot}
                            {gap}
                            {radius}
                            {valueLabels}
                            formatValue={formatNumericValue}
                            {interactive}
                            {selectable}
                            activeCell={resolvedActiveIndex}
                            selectedCell={resolvedSelectedIndex}
                            onCellHover={handleCellHover}
                            onCellClick={handleCellSelect}
                        />

                        {#if showYAxis}
                            <g class="cs-chart-layer-axes cs-chart-heatmap-axis-y" data-position="left">
                                {#each preparedYTicks as tick (tick.category)}
                                    <text
                                        class="cs-chart-axis-tick-text cs-chart-heatmap-tick"
                                        x="-8"
                                        y={tick.position}
                                        text-anchor="end"
                                        dominant-baseline="central"
                                        data-active={activeRowIndex === tick.index ? "" : undefined}
                                    >
                                        {#if tick.truncated}
                                            <title>{tick.fullLabel}</title>
                                        {/if}
                                        {tick.text}
                                    </text>
                                {/each}
                                {#if yAxis?.label}
                                    <text
                                        class="cs-chart-axis-label"
                                        transform="translate({-(resolvedLeftMargin - tickFontSize - 2)}, {snapInt(plotHeight / 2)}) rotate(-90)"
                                        text-anchor="middle"
                                    >
                                        {yAxis.label}
                                    </text>
                                {/if}
                            </g>
                        {/if}

                        {#if showXAxis}
                            <g class="cs-chart-layer-axes cs-chart-heatmap-axis-x" data-position="bottom">
                                {#each preparedXTicks as tick (tick.category)}
                                    {#if resolvedBottomTickAngle !== 0}
                                        <text
                                            class="cs-chart-axis-tick-text cs-chart-heatmap-tick"
                                            transform="translate({tick.position}, {snapInt(plotHeight + 8)}) rotate({resolvedBottomTickAngle})"
                                            text-anchor="end"
                                            dy="4"
                                            data-active={activeColIndex === tick.index
                                                ? ""
                                                : undefined}
                                        >
                                            {#if tick.truncated}
                                                <title>{tick.fullLabel}</title>
                                            {/if}
                                            {tick.text}
                                        </text>
                                    {:else}
                                        <text
                                            class="cs-chart-axis-tick-text cs-chart-heatmap-tick"
                                            x={tick.position}
                                            y={snapInt(plotHeight + 10)}
                                            text-anchor="middle"
                                            dy="0.71em"
                                            data-active={activeColIndex === tick.index
                                                ? ""
                                                : undefined}
                                        >
                                            {#if tick.truncated}
                                                <title>{tick.fullLabel}</title>
                                            {/if}
                                            {tick.text}
                                        </text>
                                    {/if}
                                {/each}
                                {#if xAxis?.label}
                                    <text
                                        class="cs-chart-axis-label"
                                        x={snapInt(plotWidth / 2)}
                                        y={snapInt(plotHeight + resolvedBottomMargin - 4)}
                                        text-anchor="middle"
                                    >
                                        {xAxis.label}
                                    </text>
                                {/if}
                            </g>
                        {/if}

                        {@render children?.()}
                    </g>
                {/if}
            </svg>

            {#if interactive}
                <div class="cs-chart-sr-live" aria-live="polite" aria-atomic="true">
                    {liveAnnouncement}
                </div>
            {/if}
        </div>
    {/if}
{/snippet}

<Chart
    bind:ref
    state={chartState}
    {variant}
    {size}
    {palette}
    {monotone}
    {data}
    {tooltipMode}
    {loading}
    empty={isEmptyState}
    {label}
    labelledBy={resolvedLabelledBy}
    {...rest}
>
    {#if hasHeader}
        <ChartHeader>
            {#if title !== undefined || description !== undefined}
                <div class="cs-chart-header-copy">
                    {#if title !== undefined}
                        <ChartTitle id={titleId}>{title}</ChartTitle>
                    {/if}
                    {#if description !== undefined}
                        <ChartDescription>{description}</ChartDescription>
                    {/if}
                </div>
            {/if}
            {#if actions}
                <ChartActions>
                    {@render actions()}
                </ChartActions>
            {/if}
        </ChartHeader>
    {/if}

    {#if showLegend && legend === "top"}
        {@render heatmapLegend("top")}
    {/if}

    {#if showLegend && legend === "end"}
        <div class="cs-chart-body">
            {@render heatmapStage()}
            {@render heatmapLegend("end")}
        </div>
    {:else}
        {@render heatmapStage()}
    {/if}

    {#if showLegend && legend === "bottom"}
        {@render heatmapLegend("bottom")}
    {/if}

    {#if canShowTooltip}
        <div
            bind:this={tooltipRef}
            class="cs-chart-tooltip cs-chart-heatmap-tooltip"
            popover="manual"
            role="presentation"
            aria-hidden={!isTooltipOpen ? "true" : undefined}
            data-open={isTooltipOpen ? "" : undefined}
            data-gliding={tooltipGliding ? "" : undefined}
            data-side={tooltipSide}
            style:transform="translate3d({tooltipCoords.x}px, {tooltipCoords.y}px, 0)"
        >
            {#if tooltipContext}
                {#if customTooltip}
                    {@render customTooltip(tooltipContext)}
                {:else}
                    <div class="cs-chart-tooltip-header">
                        {tooltipContext.yLabel}
                        <span class="cs-chart-tooltip-sep" aria-hidden="true"></span>
                        <span class="cs-chart-heatmap-tooltip-coord">
                            {tooltipContext.xLabel}
                        </span>
                    </div>
                    <div class="cs-chart-tooltip-list">
                        <span
                            class="cs-chart-tooltip-swatch"
                            style:--cs-chart-swatch-color={tooltipContext.cell.color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-tooltip-label">
                            {tooltipContext.xLabel}
                        </span>
                        <span class="cs-chart-tooltip-value">
                            {#if tooltipContext.cell.value === null}
                                {tooltipContext.formattedValue}
                            {:else if formatValue}
                                {tooltipContext.formattedValue}
                            {:else}
                                <NumberMorph
                                    value={tooltipContext.cell.value}
                                    format={numberFormat}
                                    {locales}
                                    willChange={false}
                                    respectMotionPreference={true}
                                    transformTiming={MORPH_TIMING}
                                    spinTiming={MORPH_TIMING}
                                    opacityTiming={OPACITY_TIMING}
                                />
                            {/if}
                        </span>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</Chart>
