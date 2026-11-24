<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { NumberMorph, type NumberMorphProps } from "../number-morph/index.ts";
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartArc from "./ChartArc.svelte";
    import ChartDescription from "./ChartDescription.svelte";
    import ChartEmpty from "./ChartEmpty.svelte";
    import ChartHeader from "./ChartHeader.svelte";
    import ChartLoading from "./ChartLoading.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import { computePieArcs, snapInt } from "./chart-geometry.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import {
        CHART_TONES,
        ChartState,
        resolveSeriesColor,
        type ChartDatum,
        type ChartSvgRect,
        type ChartTone,
    } from "./chart-state.svelte.ts";
    import type {
        ChartArcItem,
        ChartDonutCenterContext,
        ChartDonutTooltipContext,
        ChartPolarSlice,
        DonutChartProps,
    } from "./index.ts";

    type MorphTiming = NonNullable<NumberMorphProps["transformTiming"]>;

    const EDGE_CLEARANCE = 8;
    const FLIP_HYSTERESIS = 16;
    const TOOLTIP_OFFSET = 12;
    const MIN_CENTER_INNER_RATIO = 0.42;
    const MIN_CENTER_SHARE_RADIUS = 48;
    const LEGEND_LEAVE_GRACE_MS = 60;

    const MORPH_TIMING: MorphTiming = {
        duration: 180,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    };

    const OPACITY_TIMING: MorphTiming = {
        duration: 110,
        easing: "cubic-bezier(0.5, 1, 0.89, 1)",
    };

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        value,
        name,
        color,
        tone,
        innerRadiusRatio = 0.68,
        gap = 0,
        padAngle,
        cornerRadius,
        hoverExpand = 3,
        sort = false,
        centerMode = "auto",
        centerLabel,
        centerValue,
        center,
        numberFormat,
        locales,
        formatValue,
        valueLabels = false,
        legend = "end",
        tooltip = true,
        tooltipMode = "item",
        palette = "categorical",
        monotone,
        title,
        description,
        actions,
        height,
        aspectRatio,
        loading = false,
        empty,
        emptyTitle,
        emptyDescription,
        interactive = true,
        selectable = false,
        onSliceClick,
        hiddenSliceIds = $bindable<readonly string[]>([]),
        activeIndex = $bindable<number | null>(null),
        selectedIndex = $bindable<number | null>(null),
        hoveredSliceId = $bindable<string | null>(null),
        label,
        labelledBy,
        children,
        ...rest
    }: DonutChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    let stageRef = $state<HTMLDivElement | null>(null);
    let tooltipRef = $state<HTMLDivElement | null>(null);
    let stageWidth = $state(0);
    let stageHeight = $state(0);
    let svgRect = $state.raw<ChartSvgRect | null>(null);
    let legendHoveredSliceId = $state<string | null>(null);
    let legendLeaveTimer: ReturnType<typeof setTimeout> | null = null;

    function cancelLegendLeaveTimer(): void {
        if (legendLeaveTimer === null) return;
        clearTimeout(legendLeaveTimer);
        legendLeaveTimer = null;
    }

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractValue(datum: TDatum, index: number): number {
        const raw = typeof value === "function" ? value(datum, index) : readKey(datum, value);
        if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
        return 0;
    }

    function extractName(datum: TDatum, index: number): string {
        const raw = typeof name === "function" ? name(datum, index) : readKey(datum, name);
        if (raw === null || raw === undefined) return String(index + 1);
        return String(raw);
    }

    function extractColor(datum: TDatum, index: number): string | undefined {
        if (color === undefined) return undefined;
        const raw = typeof color === "function" ? color(datum, index) : readKey(datum, color);
        return typeof raw === "string" && raw.length > 0 ? raw : undefined;
    }

    function extractTone(datum: TDatum, index: number): ChartTone | undefined {
        if (tone === undefined) return undefined;
        const raw = typeof tone === "function" ? tone(datum, index) : readKey(datum, tone);
        if (typeof raw === "string" && (CHART_TONES as readonly string[]).includes(raw)) {
            return raw as ChartTone;
        }
        return undefined;
    }

    function formatNumericValue(num: number, datum?: TDatum): string {
        if (formatValue) return formatValue(num, datum);
        if (numberFormat !== undefined || locales !== undefined) {
            try {
                return new Intl.NumberFormat(locales, numberFormat).format(num);
            } catch {
                // Fall back to default tick formatting when Intl options are partial.
            }
        }
        return formatDefaultTick(num);
    }

    function formatShare(share: number): string {
        if (!Number.isFinite(share) || share <= 0) return "0%";
        const pct = share * 100;
        const maximumFractionDigits = pct > 0 && pct < 10 ? 1 : 0;
        try {
            return new Intl.NumberFormat(locales, {
                style: "percent",
                maximumFractionDigits,
            }).format(share);
        } catch {
            return `${Math.round(pct)}%`;
        }
    }

    interface ResolvedSlice {
        readonly id: string;
        readonly label: string;
        readonly value: number;
        readonly color: string;
        readonly datum: TDatum;
    }

    const allSlices = $derived.by((): readonly ResolvedSlice[] => {
        const seenIds: Record<string, boolean> = Object.create(null);
        return data.map((datum, index) => {
            const sliceLabel = extractName(datum, index);
            const baseId = sliceLabel.length > 0 ? sliceLabel : `slice-${index}`;
            const id = seenIds[baseId] ? `${baseId}-${index}` : baseId;
            seenIds[baseId] = true;
            seenIds[id] = true;

            return {
                id,
                label: sliceLabel,
                value: extractValue(datum, index),
                color: resolveSeriesColor(
                    { color: extractColor(datum, index), tone: extractTone(datum, index) },
                    index,
                    palette,
                    monotone,
                ),
                datum,
            };
        });
    });

    const positiveSlices = $derived(allSlices.filter((item) => item.value > 0));
    const visibleSlices = $derived(
        positiveSlices.filter((item) => !hiddenSliceIds.includes(item.id)),
    );

    const visiblePolarSlices = $derived<readonly ChartPolarSlice<TDatum>[]>(
        visibleSlices.map((item) => ({
            id: item.id,
            label: item.label,
            value: item.value,
            color: item.color,
            datum: item.datum,
        })),
    );

    const total = $derived.by((): number => {
        let sum = 0;
        for (const item of visibleSlices) sum += item.value;
        return sum;
    });

    const allSlicesHidden = $derived(positiveSlices.length > 0 && visibleSlices.length === 0);
    const isEmptyState = $derived(empty ?? (positiveSlices.length === 0 || allSlicesHidden));

    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ?? (title !== undefined && label === undefined ? titleId : undefined),
    );
    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const showLegend = $derived(legend !== "none" && positiveSlices.length > 0 && !loading);

    const safeHoverExpand = $derived(Math.max(0, hoverExpand));
    const safeGap = $derived(Math.max(0, gap));
    const clampedRatio = $derived(Math.max(0, Math.min(0.95, innerRadiusRatio)));
    const cx = $derived(snapInt(stageWidth / 2));
    const cy = $derived(snapInt(stageHeight / 2));
    const minStageDimension = $derived(Math.min(stageWidth, stageHeight));
    const outerMargin = $derived(
        selectable || selectedIndex !== null ? Math.max(safeHoverExpand + 2, 8) : safeHoverExpand + 2,
    );
    const outerRadius = $derived(Math.max(0, Math.floor(minStageDimension / 2) - outerMargin));
    const innerRadius = $derived(outerRadius * clampedRatio);
    const showCenter = $derived(clampedRatio >= MIN_CENTER_INNER_RATIO && outerRadius > 0);
    const centerMaxWidth = $derived(Math.max(0, Math.floor(innerRadius * 2 - 12)));

    const arcs = $derived.by((): readonly ChartArcItem<TDatum>[] => {
        if (outerRadius <= 0 || visibleSlices.length === 0) return [];
        const geometries = computePieArcs({
            slices: visibleSlices.map((item) => ({
                id: item.id,
                label: item.label,
                value: item.value,
            })),
            outerRadius,
            innerRadiusRatio: clampedRatio,
            gap: safeGap,
            padAngle,
            cornerRadius,
            hoverExpandPx: safeHoverExpand,
            sort,
        });

        const result: ChartArcItem<TDatum>[] = [];
        for (const geometry of geometries) {
            const source = visibleSlices[geometry.index];
            if (!source) continue;
            result.push({
                ...geometry,
                color: source.color,
                datum: source.datum,
            });
        }
        return result;
    });

    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const canShowTooltip = $derived(
        interactive && tooltip !== false && tooltipMode !== "none" && !loading && !isEmptyState,
    );

    const resolvedActiveIndex = $derived(
        activeIndex !== null && activeIndex >= 0 && activeIndex < arcs.length ? activeIndex : null,
    );

    const activeArc = $derived.by((): ChartArcItem<TDatum> | null => {
        if (resolvedActiveIndex === null) return null;
        return arcs.find((item) => item.index === resolvedActiveIndex) ?? null;
    });

    const resolvedSelectedIndex = $derived(
        selectedIndex !== null && selectedIndex >= 0 && selectedIndex < arcs.length
            ? selectedIndex
            : null,
    );

    const selectedArc = $derived.by((): ChartArcItem<TDatum> | null => {
        if (resolvedSelectedIndex === null) return null;
        return arcs.find((item) => item.index === resolvedSelectedIndex) ?? null;
    });

    // Keep <Chart>'s figure[data-scrubbing] and [data-has-selection] synced with active/selected slice.
    $effect.pre(() => {
        const nextIndex = activeArc !== null ? activeArc.index : null;
        const nextSelected = selectedArc !== null ? selectedArc.index : null;
        const currentData = data;
        untrack(() => {
            if (chartState.data !== currentData) {
                chartState.data = currentData;
            }
            chartState.setActiveIndex(nextIndex);
            chartState.setSelectedIndex(nextSelected);
        });
    });

    const legendHoveredArc = $derived.by((): ChartArcItem<TDatum> | null => {
        if (legendHoveredSliceId === null) return null;
        return arcs.find((item) => item.id === legendHoveredSliceId) ?? null;
    });

    const focusedArc = $derived.by((): ChartArcItem<TDatum> | null => {
        if (activeArc !== null) return activeArc;
        if (legendHoveredArc !== null) return legendHoveredArc;
        if (hoveredSliceId === null) return null;
        return arcs.find((item) => item.id === hoveredSliceId) ?? null;
    });

    const highlightedSliceId = $derived(focusedArc?.id ?? hoveredSliceId);

    const centerArc = $derived.by((): ChartArcItem<TDatum> | null => {
        if (centerMode === "total") return null;
        if (centerMode === "active") return focusedArc ?? selectedArc;
        if (legendHoveredArc !== null) return legendHoveredArc;
        if (!canShowTooltip && focusedArc !== null) return focusedArc;
        if (focusedArc === null && selectedArc !== null) return selectedArc;
        return null;
    });

    const centerContext = $derived<ChartDonutCenterContext<TDatum>>({
        total,
        activeSlice: centerArc,
        slices: arcs,
        formatValue: formatNumericValue,
    });

    const defaultCenterLabel = $derived(
        centerLabel ?? t({ de: "Gesamt", en: "Total" }),
    );

    const displayCenterLabel = $derived(centerArc ? centerArc.label : defaultCenterLabel);

    const displayCenterNumericValue = $derived.by((): number | null => {
        if (centerArc) return centerArc.value;
        if (typeof centerValue === "string") return null;
        if (typeof centerValue === "number") return centerValue;
        return total;
    });

    const displayCenterStringValue = $derived.by((): string | null => {
        if (centerArc) {
            return formatValue ? formatValue(centerArc.value, centerArc.datum) : null;
        }
        if (typeof centerValue === "string") return centerValue;
        if (formatValue) {
            const numeric = typeof centerValue === "number" ? centerValue : total;
            return formatValue(numeric);
        }
        return null;
    });

    const centerShareText = $derived(
        centerArc && innerRadius >= MIN_CENTER_SHARE_RADIUS ? formatShare(centerArc.share) : "",
    );

    const tooltipContext = $derived.by((): ChartDonutTooltipContext<TDatum> | null => {
        if (!canShowTooltip || !activeArc) return null;
        return {
            slice: activeArc,
            total,
            formattedValue: formatNumericValue(activeArc.value, activeArc.datum),
            formattedShare: formatShare(activeArc.share),
        };
    });

    const isTooltipOpen = $derived(tooltipContext !== null && stageWidth > 0 && stageHeight > 0);

    const liveAnnouncement = $derived.by((): string => {
        if (!interactive || !focusedArc) return "";
        return `${focusedArc.label}: ${formatNumericValue(focusedArc.value, focusedArc.datum)} (${formatShare(focusedArc.share)})`;
    });

    const resolvedEmptyTitle = $derived.by((): string | undefined => {
        if (emptyTitle !== undefined) return emptyTitle;
        if (allSlicesHidden) {
            return t({ de: "Alle Segmente ausgeblendet", en: "All slices hidden" });
        }
        return undefined;
    });

    function syncSvgRect(): void {
        const target = svgRef ?? stageRef;
        if (!target) {
            svgRect = null;
            return;
        }
        const rect = target.getBoundingClientRect();
        svgRect = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };
    }

    function handleSliceHover(index: number | null, arc: ChartArcItem<TDatum> | null): void {
        if (!interactive) return;
        cancelLegendLeaveTimer();
        legendHoveredSliceId = null;
        syncSvgRect();
        activeIndex = index;
        hoveredSliceId = arc?.id ?? null;
    }

    function handleStagePointerLeave(): void {
        if (!interactive) return;
        activeIndex = null;
        if (legendHoveredSliceId === null) {
            hoveredSliceId = null;
        }
    }

    function handleStageFocus(): void {
        if (!interactive) return;
        syncSvgRect();
    }

    function handleStageBlur(): void {
        if (!interactive) return;
        activeIndex = null;
        if (legendHoveredSliceId === null) {
            hoveredSliceId = null;
        }
    }

    function stepActiveSlice(delta: number): void {
        cancelLegendLeaveTimer();
        legendHoveredSliceId = null;
        if (arcs.length === 0) {
            activeIndex = null;
            hoveredSliceId = null;
            return;
        }
        const current = resolvedActiveIndex;
        const nextIndex =
            current === null
                ? delta >= 0
                    ? 0
                    : arcs.length - 1
                : Math.max(0, Math.min(arcs.length - 1, current + delta));
        const nextArc = arcs[nextIndex];
        activeIndex = nextArc ? nextArc.index : nextIndex;
        hoveredSliceId = nextArc?.id ?? null;
    }

    function handleSliceSelect(datum: TDatum, index: number, slice: ChartArcItem<TDatum>): void {
        if (selectable) {
            selectedIndex = selectedIndex === index ? null : index;
        }
        onSliceClick?.(datum, index, slice);
    }

    function handleStageKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        if (event.defaultPrevented || !interactive || arcs.length === 0) return;

        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown": {
                event.preventDefault();
                syncSvgRect();
                stepActiveSlice(1);
                return;
            }
            case "ArrowLeft":
            case "ArrowUp": {
                event.preventDefault();
                syncSvgRect();
                stepActiveSlice(-1);
                return;
            }
            case "Home": {
                event.preventDefault();
                cancelLegendLeaveTimer();
                legendHoveredSliceId = null;
                syncSvgRect();
                const first = arcs[0];
                if (first) {
                    activeIndex = first.index;
                    hoveredSliceId = first.id;
                }
                return;
            }
            case "End": {
                event.preventDefault();
                cancelLegendLeaveTimer();
                legendHoveredSliceId = null;
                syncSvgRect();
                const last = arcs.at(-1);
                if (last) {
                    activeIndex = last.index;
                    hoveredSliceId = last.id;
                }
                return;
            }
            case "Escape": {
                if (activeIndex !== null || hoveredSliceId !== null || legendHoveredSliceId !== null) {
                    event.preventDefault();
                    cancelLegendLeaveTimer();
                    legendHoveredSliceId = null;
                    activeIndex = null;
                    hoveredSliceId = null;
                }
                return;
            }
            case "Enter":
            case " ": {
                if (activeArc !== null) {
                    event.preventDefault();
                    handleSliceSelect(activeArc.datum, activeArc.index, activeArc);
                }
                return;
            }
            default: {
                return;
            }
        }
    }

    function handleLegendToggle(sliceId: string): void {
        const prevSelectedId = selectedArc?.id ?? null;
        const isCurrentlyHidden = hiddenSliceIds.includes(sliceId);
        const nextHidden = isCurrentlyHidden
            ? hiddenSliceIds.filter((id) => id !== sliceId)
            : [...hiddenSliceIds, sliceId];

        hiddenSliceIds = nextHidden;

        if (!isCurrentlyHidden) {
            cancelLegendLeaveTimer();
            if (legendHoveredSliceId === sliceId) legendHoveredSliceId = null;
            if (hoveredSliceId === sliceId) hoveredSliceId = null;
            if (activeIndex !== null) activeIndex = null;
        }

        if (prevSelectedId !== null) {
            if (nextHidden.includes(prevSelectedId)) {
                selectedIndex = null;
            } else {
                const nextVisible = positiveSlices.filter((item) => !nextHidden.includes(item.id));
                const remapped = nextVisible.findIndex((item) => item.id === prevSelectedId);
                selectedIndex = remapped === -1 ? null : remapped;
            }
        }
    }

    function handleLegendEnter(sliceId: string, isHidden: boolean): void {
        if (isHidden) return;
        cancelLegendLeaveTimer();
        legendHoveredSliceId = sliceId;
        hoveredSliceId = sliceId;
    }

    function handleLegendLeave(sliceId: string): void {
        cancelLegendLeaveTimer();
        legendLeaveTimer = setTimeout(() => {
            legendLeaveTimer = null;
            if (legendHoveredSliceId === sliceId) {
                legendHoveredSliceId = null;
            }
            if (hoveredSliceId === sliceId && activeIndex === null) {
                hoveredSliceId = null;
            }
        }, LEGEND_LEAVE_GRACE_MS);
    }

    function handleShowAll(): void {
        hiddenSliceIds = [];
    }

    $effect(() => {
        const el = stageRef;
        if (!el) return;

        const initialRect = el.getBoundingClientRect();
        if (initialRect.width > 0 && initialRect.height > 0) {
            const w = Math.round(initialRect.width);
            const h = Math.round(initialRect.height);
            stageWidth = w;
            stageHeight = h;
            chartState.setDimensions(w, h);
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
        let pendingHeight = 0;
        let observer: ResizeObserver | null = null;

        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (!entry) return;
                pendingWidth = entry.contentRect.width;
                pendingHeight = entry.contentRect.height;

                if (resizeRafId !== null) return;
                resizeRafId = requestAnimationFrame(() => {
                    resizeRafId = null;
                    const w = Math.round(pendingWidth);
                    const h = Math.round(pendingHeight);
                    stageWidth = w;
                    stageHeight = h;
                    chartState.setDimensions(w, h);
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
        const arc = activeArc;
        const open = isTooltipOpen;

        if (!el || !open || !arc) {
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
        const centerX = cx;
        const centerY = cy;

        const isFirstOpen = !tooltipWasOpen;
        if (isFirstOpen) {
            safeShowPopover(el);
        }

        const anchorX = (rect?.left ?? 0) + centerX + arc.centroid[0];
        const anchorY = (rect?.top ?? 0) + centerY + arc.centroid[1];

        const tooltipWidth = el.offsetWidth > 0 ? el.offsetWidth : 168;
        const tooltipHeight = el.offsetHeight > 0 ? el.offsetHeight : 56;
        const viewportWidth =
            typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : 1024;
        const viewportHeight =
            typeof window !== "undefined" && window.innerHeight > 0 ? window.innerHeight : 768;

        const currentSide = untrack(() => tooltipSide);
        let nextSide: "end" | "start" = currentSide;

        const rightEdge = anchorX + TOOLTIP_OFFSET + tooltipWidth + EDGE_CLEARANCE;
        const leftSpace = anchorX - TOOLTIP_OFFSET - EDGE_CLEARANCE;
        const rightSpace = viewportWidth - (anchorX + TOOLTIP_OFFSET + EDGE_CLEARANCE);

        if (currentSide === "end") {
            if (rightEdge > viewportWidth && (leftSpace >= tooltipWidth || leftSpace > rightSpace)) {
                nextSide = "start";
            }
        } else if (rightEdge + FLIP_HYSTERESIS <= viewportWidth) {
            nextSide = "end";
        }

        const rawX =
            nextSide === "end" ? anchorX + TOOLTIP_OFFSET : anchorX - TOOLTIP_OFFSET - tooltipWidth;
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
        cancelLegendLeaveTimer();
        cancelTooltipGlideRaf();
        tooltipWasOpen = false;
        tooltipGliding = false;
        tooltipSide = "end";
        if (tooltipRef) safeHidePopover(tooltipRef);
    }

    $effect(() => cleanupTooltipPopover);
</script>

{#snippet donutLegend(position: "top" | "bottom" | "end")}
    <div
        class="cs-chart-legend cs-chart-donut-legend"
        role="list"
        data-position={position}
        data-align={position === "end" ? "start" : "center"}
    >
        {#each positiveSlices as slice (slice.id)}
            {let isHidden = $derived(hiddenSliceIds.includes(slice.id))}
            {let isHighlighted = $derived(!isHidden && highlightedSliceId === slice.id)}
            {let isSelected = $derived(!isHidden && selectedArc?.id === slice.id)}
            {let shareText = $derived(
                isHidden || total <= 0 ? "—" : formatShare(slice.value / total),
            )}

            <div class="cs-chart-legend-entry" role="listitem">
                {#if interactive}
                    <button
                        class="cs-chart-legend-item cs-chart-donut-legend-item"
                        aria-pressed={!isHidden}
                        data-hidden={isHidden ? "" : undefined}
                        data-active={isHighlighted ? "" : undefined}
                        data-selected={isSelected ? "" : undefined}
                        onclick={() => handleLegendToggle(slice.id)}
                        onpointerenter={() => handleLegendEnter(slice.id, isHidden)}
                        onpointerleave={() => handleLegendLeave(slice.id)}
                        onfocus={() => handleLegendEnter(slice.id, isHidden)}
                        onblur={() => handleLegendLeave(slice.id)}
                        type="button"
                    >
                        <HitArea size="sm" />
                        <span
                            class="cs-chart-legend-swatch"
                            data-kind="dot"
                            style:--cs-chart-swatch-color={slice.color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-legend-label">{slice.label}</span>
                        <span class="cs-chart-donut-legend-share">{shareText}</span>
                    </button>
                {:else}
                    <span
                        class="cs-chart-legend-item cs-chart-donut-legend-item"
                        data-static=""
                        data-hidden={isHidden ? "" : undefined}
                    >
                        <span
                            class="cs-chart-legend-swatch"
                            data-kind="dot"
                            style:--cs-chart-swatch-color={slice.color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-legend-label">{slice.label}</span>
                        <span class="cs-chart-donut-legend-share">{shareText}</span>
                    </span>
                {/if}
            </div>
        {/each}
    </div>
{/snippet}

{#snippet polarStage()}
    {#if loading}
        <ChartLoading
            shape="donut"
            style={resolvedHeight ? `block-size: ${resolvedHeight}` : undefined}
        />
    {:else if isEmptyState}
        <ChartEmpty
            title={resolvedEmptyTitle}
            description={emptyDescription}
            onReset={allSlicesHidden ? handleShowAll : undefined}
            style={resolvedHeight ? `min-block-size: ${resolvedHeight}` : undefined}
        />
    {:else}
        <!-- role="application" is bound dynamically when interactive keyboard scrubbing is enabled. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
            bind:this={stageRef}
            class="cs-chart-polar-stage"
            role={interactive ? "application" : undefined}
            aria-roledescription={interactive
                ? t(
                      clampedRatio <= 0
                          ? { de: "Kreisdiagramm", en: "pie chart" }
                          : { de: "Ringdiagramm", en: "donut chart" },
                  )
                : undefined}
            aria-label={interactive && !resolvedLabelledBy
                ? (label ??
                      t(
                          clampedRatio <= 0
                              ? { de: "Interaktives Kreisdiagramm", en: "Interactive pie chart" }
                              : { de: "Interaktives Ringdiagramm", en: "Interactive donut chart" },
                      ))
                : label}
            aria-labelledby={resolvedLabelledBy}
            tabindex={interactive ? 0 : undefined}
            data-interactive={interactive ? "" : undefined}
            data-scrubbing={focusedArc !== null ? "" : undefined}
            data-has-selection={selectedArc !== null ? "" : undefined}
            style:block-size={resolvedHeight}
            style:min-block-size={resolvedHeight ? "0px" : undefined}
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
                height={stageHeight}
                role={label || resolvedLabelledBy ? "img" : undefined}
                aria-label={label}
                aria-labelledby={resolvedLabelledBy}
                aria-hidden={!label && !resolvedLabelledBy ? "true" : undefined}
            >
                {#if stageWidth > 0 && stageHeight > 0}
                    <ChartArc
                        slices={visiblePolarSlices}
                        width={stageWidth}
                        height={stageHeight}
                        innerRadiusRatio={clampedRatio}
                        gap={safeGap}
                        {padAngle}
                        {cornerRadius}
                        hoverExpand={safeHoverExpand}
                        {sort}
                        {valueLabels}
                        {formatValue}
                        {interactive}
                        {selectable}
                        activeIndex={resolvedActiveIndex}
                        selectedIndex={resolvedSelectedIndex}
                        hoveredSliceId={highlightedSliceId}
                        onSliceHover={handleSliceHover}
                        onSliceClick={handleSliceSelect}
                    />
                    {@render children?.()}
                {/if}
            </svg>

            {#if showCenter}
                <div
                    class="cs-chart-center"
                    style:inset-inline-start="{cx}px"
                    style:inset-block-start="{cy}px"
                    style:max-inline-size="{centerMaxWidth}px"
                >
                    {#if center}
                        {@render center(centerContext)}
                    {:else}
                        <span class="cs-chart-center-label">{displayCenterLabel}</span>
                        <span class="cs-chart-center-value">
                            {#if displayCenterStringValue !== null}
                                {displayCenterStringValue}
                            {:else if displayCenterNumericValue !== null}
                                <NumberMorph
                                    value={displayCenterNumericValue}
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
                        <span
                            class="cs-chart-center-share"
                            data-empty={!centerShareText ? "" : undefined}
                            aria-hidden={!centerShareText ? "true" : undefined}
                        >
                            {centerShareText}
                        </span>
                    {/if}
                </div>
            {/if}

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
        {@render donutLegend("top")}
    {/if}

    {#if showLegend && legend === "end"}
        <div class="cs-chart-body cs-chart-polar-body">
            {@render polarStage()}
            {@render donutLegend("end")}
        </div>
    {:else}
        {@render polarStage()}
    {/if}

    {#if showLegend && legend === "bottom"}
        {@render donutLegend("bottom")}
    {/if}

    {#if canShowTooltip}
        <div
            bind:this={tooltipRef}
            class="cs-chart-tooltip cs-chart-donut-tooltip"
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
                    <div class="cs-chart-tooltip-list">
                        <span
                            class="cs-chart-tooltip-swatch"
                            style:--cs-chart-swatch-color={tooltipContext.slice.color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-tooltip-label">{tooltipContext.slice.label}</span>
                        <span class="cs-chart-tooltip-value">
                            {#if formatValue}
                                {tooltipContext.formattedValue}
                            {:else}
                                <NumberMorph
                                    value={tooltipContext.slice.value}
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
                    <div class="cs-chart-donut-tooltip-share">
                        <span>{t({ de: "Anteil", en: "Share" })}</span>
                        <span class="cs-chart-donut-tooltip-share-value">
                            {tooltipContext.formattedShare}
                        </span>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</Chart>
