<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import {
        NumberMorph,
        type NumberMorphFormat,
        type NumberMorphProps,
    } from "../number-morph/index.ts";
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartBullet from "./ChartBullet.svelte";
    import ChartDescription from "./ChartDescription.svelte";
    import ChartEmpty from "./ChartEmpty.svelte";
    import ChartHeader from "./ChartHeader.svelte";
    import ChartLoading from "./ChartLoading.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import {
        computeBulletRows,
        getBulletSizeMetrics,
        type BulletRangeInput,
        type BulletRowInput,
    } from "./chart-geometry.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import {
        CHART_BAR_PATTERNS,
        CHART_TONES,
        ChartState,
        resolveToneColor,
        type ChartBarPattern,
        type ChartDatum,
        type ChartSvgRect,
        type ChartTone,
    } from "./chart-state.svelte.ts";
    import type {
        BulletChartProps,
        ChartBulletItem,
        ChartBulletRange,
        ChartBulletRow,
        ChartBulletTooltipContext,
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

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        label,
        subtitle,
        unit,
        actual,
        target,
        comparative,
        ranges,
        max,
        tone,
        color,
        pattern,
        sharedScale = false,
        showReadout = true,
        showVariance = false,
        minBarLength = 2,
        formatValue,
        numberFormat,
        locales,
        tooltip = true,
        tooltipMode = "item",
        selectable = false,
        selectedIndex = $bindable<number | null>(null),
        activeIndex = $bindable<number | null>(null),
        onRowClick,
        palette = "categorical",
        monotone,
        title,
        description,
        actions,
        height,
        loading = false,
        empty,
        emptyTitle,
        emptyDescription,
        interactive = true,
        labelledBy,
        children,
        ...rest
    }: BulletChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    let stageRef = $state<HTMLDivElement | null>(null);
    let tooltipRef = $state<HTMLDivElement | null>(null);
    let stageWidth = $state(0);
    let svgRect = $state.raw<ChartSvgRect | null>(null);

    const metrics = $derived(getBulletSizeMetrics(size));

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractText(
        accessor: keyof TDatum | ((datum: TDatum, index: number) => string | undefined) | undefined,
        datum: TDatum,
        index: number,
    ): string | undefined {
        if (accessor === undefined) return undefined;
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined) return undefined;
        const str = String(raw).trim();
        return str.length > 0 ? str : undefined;
    }

    function extractNumber(
        accessor:
            | keyof TDatum
            | ((datum: TDatum, index: number) => number | null | undefined)
            | undefined,
        datum: TDatum,
        index: number,
    ): number | null {
        if (accessor === undefined) return null;
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
            return null;
        }
        const numeric = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    function extractRanges(
        datum: TDatum,
        index: number,
    ): readonly (number | ChartBulletRange)[] | undefined {
        if (ranges === undefined) return undefined;
        const raw = typeof ranges === "function" ? ranges(datum, index) : readKey(datum, ranges);
        if (!Array.isArray(raw)) return undefined;
        return raw as readonly (number | ChartBulletRange)[];
    }

    function extractColor(datum: TDatum, index: number): string | undefined {
        if (color === undefined) return undefined;
        const raw = typeof color === "function" ? color(datum, index) : color;
        return typeof raw === "string" && raw.length > 0 ? raw : undefined;
    }

    function extractTone(datum: TDatum, index: number): ChartTone | undefined {
        if (tone === undefined) return undefined;
        const raw = typeof tone === "function" ? tone(datum, index) : tone;
        if (typeof raw === "string" && (CHART_TONES as readonly string[]).includes(raw)) {
            return raw as ChartTone;
        }
        return undefined;
    }

    function extractPattern(datum: TDatum, index: number): ChartBarPattern {
        if (pattern === undefined) return "solid";
        const raw = typeof pattern === "function" ? pattern(datum, index) : pattern;
        if (
            typeof raw === "string" &&
            (CHART_BAR_PATTERNS as readonly string[]).includes(raw)
        ) {
            return raw as ChartBarPattern;
        }
        return "solid";
    }

    function resolveRowColor(datum: TDatum, index: number): string {
        const explicitColor = extractColor(datum, index);
        if (explicitColor !== undefined) return explicitColor;
        const explicitTone = extractTone(datum, index);
        if (explicitTone !== undefined) return resolveToneColor(explicitTone);
        return "var(--cs-chart-series-1)";
    }

    function normalizeRanges(
        rawRanges: readonly (number | ChartBulletRange)[] | undefined,
    ): {
        readonly publicRanges: readonly ChartBulletRange[];
        readonly inputs: readonly BulletRangeInput[];
    } {
        if (!rawRanges || rawRanges.length === 0) {
            return { publicRanges: [], inputs: [] };
        }
        const publicRanges: ChartBulletRange[] = [];
        for (const entry of rawRanges) {
            if (typeof entry === "number") {
                if (Number.isFinite(entry) && entry > 0) {
                    publicRanges.push({ to: entry });
                }
            } else if (Number.isFinite(entry.to) && entry.to > 0) {
                publicRanges.push(entry);
            }
        }
        publicRanges.sort((a, b) => a.to - b.to);

        const inputs: BulletRangeInput[] = publicRanges.map((entry) => {
            const resolvedColor =
                entry.color ?? (entry.tone !== undefined ? resolveToneColor(entry.tone) : undefined);
            return resolvedColor !== undefined
                ? { to: entry.to, color: resolvedColor }
                : { to: entry.to };
        });

        return { publicRanges, inputs };
    }

    const bulletItems = $derived.by((): readonly ChartBulletItem<TDatum>[] =>
        data.map((datum, index) => {
            const rowLabel = extractText(label, datum, index) ?? String(index + 1);
            const rowSubtitle = extractText(subtitle, datum, index);
            const rowUnit = extractText(unit, datum, index);
            const rowActual = Math.max(0, extractNumber(actual, datum, index) ?? 0);
            const rowTarget = Math.max(0, extractNumber(target, datum, index) ?? 0);
            const rawComp = extractNumber(comparative, datum, index);
            const rowComparative = rawComp !== null ? Math.max(0, rawComp) : null;
            const rawMax = extractNumber(max, datum, index);
            const rawRanges = extractRanges(datum, index);

            return {
                index,
                label: rowLabel,
                ...(rowSubtitle !== undefined && { subtitle: rowSubtitle }),
                ...(rowUnit !== undefined && { unit: rowUnit }),
                actual: rowActual,
                target: rowTarget,
                comparative: rowComparative,
                ...(rawRanges !== undefined && { ranges: rawRanges }),
                ...(rawMax !== null && { max: rawMax }),
                color: resolveRowColor(datum, index),
                pattern: extractPattern(datum, index),
                datum,
            };
        }),
    );

    const geometryInputs = $derived.by((): readonly BulletRowInput[] =>
        bulletItems.map((item, idx) => {
            const { inputs } = normalizeRanges(item.ranges);
            return {
                index: item.index ?? idx,
                label: item.label,
                ...(item.subtitle !== undefined && { subtitle: item.subtitle }),
                ...(item.unit !== undefined && { unit: item.unit }),
                actual: item.actual,
                target: item.target,
                comparative: item.comparative ?? null,
                ranges: inputs,
                ...(item.max !== undefined && { max: item.max }),
            };
        }),
    );

    const resolvedActiveIndex = $derived(
        activeIndex !== null && activeIndex >= 0 && activeIndex < bulletItems.length
            ? activeIndex
            : null,
    );
    const resolvedSelectedIndex = $derived(
        selectedIndex !== null && selectedIndex >= 0 && selectedIndex < bulletItems.length
            ? selectedIndex
            : null,
    );

    const layout = $derived.by(() => {
        const horizontalPad = selectable || resolvedSelectedIndex !== null ? 3 : 0;
        return computeBulletRows({
            items: geometryInputs,
            width: stageWidth,
            rowHeight: metrics.rowHeight,
            rowGap: metrics.rowGap,
            trackHeight: metrics.trackHeight,
            trackRadius: metrics.trackRadius,
            barRadius: metrics.barRadius,
            minBarLength,
            sharedScale,
            paddingLeft: horizontalPad,
            paddingRight: horizontalPad,
        });
    });

    const resolvedRows = $derived.by((): readonly ChartBulletRow<TDatum>[] =>
        layout.rows.map((rowGeom, idx) => {
            const item = bulletItems[idx];
            const datum = (item?.datum ?? data[idx]) as TDatum;
            const { publicRanges } = normalizeRanges(item?.ranges);
            return {
                index: rowGeom.index,
                label: rowGeom.label,
                ...(rowGeom.subtitle !== undefined && { subtitle: rowGeom.subtitle }),
                ...(rowGeom.unit !== undefined && { unit: rowGeom.unit }),
                actual: rowGeom.actual,
                target: rowGeom.target,
                comparative: rowGeom.comparative,
                ranges: publicRanges,
                max: rowGeom.domainMax,
                color: item?.color ?? "var(--cs-chart-series-1)",
                pattern: item?.pattern ?? "solid",
                datum,
            };
        }),
    );

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

    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ?? (title !== undefined && rest["aria-label"] === undefined ? titleId : undefined),
    );
    const isEmptyState = $derived(empty ?? data.length === 0);

    const intrinsicHeight = $derived(Math.max(metrics.rowHeight + 4, layout.totalHeight));
    const resolvedHeight = $derived(
        height !== undefined
            ? typeof height === "number"
                ? `${height}px`
                : height
            : `${intrinsicHeight}px`,
    );
    const svgHeight = $derived(
        typeof height === "number" ? Math.max(height, intrinsicHeight) : intrinsicHeight,
    );

    function formatNumericValue(num: number, datum?: TDatum): string {
        if (formatValue) return formatValue(num, datum);
        if (numberFormat !== undefined || locales !== undefined) {
            try {
                return new Intl.NumberFormat(locales, numberFormat).format(num);
            } catch {
                // Fall back to default formatting when Intl options are partial.
            }
        }
        return formatDefaultTick(num);
    }

    function formatSignedDelta(delta: number, datum?: TDatum): string {
        if (formatValue) {
            const absFormatted = formatValue(Math.abs(delta), datum);
            if (delta > 0) return `+${absFormatted}`;
            if (delta < 0) return `-${absFormatted}`;
            return absFormatted;
        }
        if (numberFormat !== undefined || locales !== undefined) {
            try {
                const signedFormat: NumberMorphFormat = {
                    ...numberFormat,
                    signDisplay: numberFormat?.signDisplay ?? "exceptZero",
                };
                return new Intl.NumberFormat(locales, signedFormat).format(delta);
            } catch {
                // Fall back to default formatting.
            }
        }
        const fallback = formatDefaultTick(Math.abs(delta));
        if (delta > 0) return `+${fallback}`;
        if (delta < 0) return `-${fallback}`;
        return fallback;
    }

    function formatVariancePercent(ratio: number): string {
        const pct = Math.abs(ratio) * 100;
        const maximumFractionDigits = pct > 0 && pct < 10 ? 1 : 0;
        try {
            return new Intl.NumberFormat(locales, {
                style: "percent",
                signDisplay: "exceptZero",
                maximumFractionDigits,
            }).format(ratio);
        } catch {
            const rounded = Math.round(ratio * 100);
            return rounded > 0 ? `+${rounded}%` : `${rounded}%`;
        }
    }

    const signedNumberFormat = $derived<NumberMorphFormat>({
        ...numberFormat,
        signDisplay: numberFormat?.signDisplay ?? "exceptZero",
    });

    const activeRow = $derived(
        resolvedActiveIndex !== null ? (resolvedRows[resolvedActiveIndex] ?? null) : null,
    );
    const activeRowGeometry = $derived(
        resolvedActiveIndex !== null ? (layout.rows[resolvedActiveIndex] ?? null) : null,
    );

    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const canShowTooltip = $derived(
        interactive && tooltip !== false && tooltipMode !== "none" && !loading && !isEmptyState,
    );

    const tooltipContext = $derived.by((): ChartBulletTooltipContext<TDatum> | null => {
        if (!canShowTooltip || !activeRow) return null;
        const variance = activeRow.actual - activeRow.target;
        const variancePercent = activeRow.target > 0 ? variance / activeRow.target : null;
        return {
            index: activeRow.index,
            row: activeRow,
            variance,
            variancePercent,
            formattedActual: formatNumericValue(activeRow.actual, activeRow.datum),
            formattedTarget: formatNumericValue(activeRow.target, activeRow.datum),
            formattedVariance: formatSignedDelta(variance, activeRow.datum),
            formattedVariancePercent:
                variancePercent !== null ? formatVariancePercent(variancePercent) : null,
            ...(activeRow.comparative !== null && {
                formattedComparative: formatNumericValue(activeRow.comparative, activeRow.datum),
            }),
        };
    });

    const isTooltipOpen = $derived(
        tooltipContext !== null && stageWidth > 0 && activeRowGeometry !== null,
    );

    const liveAnnouncement = $derived.by((): string => {
        if (!interactive || !activeRow) return "";
        const actualWord = t({ de: "Ist", en: "actual" });
        const targetWord = t({ de: "Ziel", en: "target" });
        const actualText = formatNumericValue(activeRow.actual, activeRow.datum);
        const targetText = formatNumericValue(activeRow.target, activeRow.datum);
        return `${activeRow.label}: ${actualWord} ${actualText}, ${targetWord} ${targetText}`;
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

    function handleRowHover(index: number | null): void {
        if (!interactive) return;
        syncSvgRect();
        activeIndex = index;
    }

    function handleRowSelect(datum: TDatum, index: number, row: ChartBulletRow<TDatum>): void {
        if (selectable) {
            selectedIndex = selectedIndex === index ? null : index;
        }
        onRowClick?.(datum, index, row);
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

    function stepActiveRow(delta: number): void {
        if (resolvedRows.length === 0) {
            activeIndex = null;
            return;
        }
        const current = resolvedActiveIndex;
        const nextIndex =
            current === null
                ? delta >= 0
                    ? 0
                    : resolvedRows.length - 1
                : Math.max(0, Math.min(resolvedRows.length - 1, current + delta));
        activeIndex = nextIndex;
    }

    function handleStageKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        if (event.defaultPrevented || !interactive || resolvedRows.length === 0) return;

        switch (event.key) {
            case "ArrowDown":
            case "ArrowRight": {
                event.preventDefault();
                syncSvgRect();
                stepActiveRow(1);
                return;
            }
            case "ArrowUp":
            case "ArrowLeft": {
                event.preventDefault();
                syncSvgRect();
                stepActiveRow(-1);
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
                activeIndex = resolvedRows.length - 1;
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
                if (activeRow !== null) {
                    event.preventDefault();
                    handleRowSelect(activeRow.datum, activeRow.index, activeRow);
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
        const rowGeom = activeRowGeometry;
        const open = isTooltipOpen;

        if (!el || !open || !rowGeom) {
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

        const barTipX = rowGeom.barX + rowGeom.barWidth;
        const anchorLocalX = Math.max(barTipX, rowGeom.targetX);
        const anchorX = (rect?.left ?? 0) + anchorLocalX;
        const anchorY = (rect?.top ?? 0) + rowGeom.trackY + rowGeom.trackHeight / 2;

        const tooltipWidth = el.offsetWidth > 0 ? el.offsetWidth : 180;
        const tooltipHeight = el.offsetHeight > 0 ? el.offsetHeight : 84;
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
        cancelTooltipGlideRaf();
        tooltipWasOpen = false;
        tooltipGliding = false;
        tooltipSide = "end";
        if (tooltipRef) safeHidePopover(tooltipRef);
    }

    $effect(() => cleanupTooltipPopover);
</script>

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

    {#if loading}
        <ChartLoading shape="bars" style="block-size: {resolvedHeight}" />
    {:else if isEmptyState}
        <ChartEmpty
            title={emptyTitle}
            description={emptyDescription}
            style="min-block-size: {resolvedHeight}"
        />
    {:else}
        <!-- role="application" is bound dynamically when interactive keyboard navigation is enabled. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div
            bind:this={stageRef}
            class="cs-chart-bullet-stage"
            role={interactive ? "application" : undefined}
            aria-roledescription={interactive
                ? t({ de: "Bullet-Diagramm", en: "bullet chart" })
                : undefined}
            aria-label={interactive && !resolvedLabelledBy
                ? (rest["aria-label"] ??
                      t({ de: "Interaktives Bullet-Diagramm", en: "Interactive bullet chart" }))
                : rest["aria-label"]}
            aria-labelledby={resolvedLabelledBy}
            tabindex={interactive ? 0 : undefined}
            data-interactive={interactive ? "" : undefined}
            data-scrubbing={activeRow !== null ? "" : undefined}
            data-has-selection={resolvedSelectedIndex !== null ? "" : undefined}
            style:block-size={resolvedHeight}
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
                role={rest["aria-label"] || resolvedLabelledBy ? "img" : undefined}
                aria-label={rest["aria-label"]}
                aria-labelledby={resolvedLabelledBy}
                aria-hidden={!rest["aria-label"] && !resolvedLabelledBy ? "true" : undefined}
            >
                {#if stageWidth > 0}
                    <ChartBullet
                        items={bulletItems}
                        width={stageWidth}
                        {size}
                        {sharedScale}
                        {showReadout}
                        {showVariance}
                        {minBarLength}
                        formatValue={formatNumericValue}
                        {interactive}
                        {selectable}
                        activeIndex={resolvedActiveIndex}
                        selectedIndex={resolvedSelectedIndex}
                        onRowHover={handleRowHover}
                        onRowClick={handleRowSelect}
                    />
                    {@render children?.()}
                {/if}
            </svg>

            {#if interactive}
                <div class="cs-chart-sr-live" aria-live="polite" aria-atomic="true">
                    {liveAnnouncement}
                </div>
            {/if}
        </div>
    {/if}

    {#if canShowTooltip}
        <div
            bind:this={tooltipRef}
            class="cs-chart-tooltip cs-chart-bullet-tooltip"
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
                        {tooltipContext.row.label}
                        {#if tooltipContext.row.subtitle ?? tooltipContext.row.unit}
                            <span class="cs-chart-bullet-tooltip-meta">
                                {tooltipContext.row.subtitle ?? tooltipContext.row.unit}
                            </span>
                        {/if}
                    </div>
                    <div class="cs-chart-tooltip-list">
                        <span
                            class="cs-chart-tooltip-swatch"
                            data-pattern={tooltipContext.row.pattern !== "solid"
                                ? tooltipContext.row.pattern
                                : undefined}
                            style:--cs-chart-swatch-color={tooltipContext.row.color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-tooltip-label">
                            {t({ de: "Ist", en: "Actual" })}
                        </span>
                        <span class="cs-chart-tooltip-value">
                            {#if formatValue}
                                {tooltipContext.formattedActual}
                            {:else}
                                <NumberMorph
                                    value={tooltipContext.row.actual}
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
                            class="cs-chart-tooltip-swatch cs-chart-bullet-tooltip-target-swatch"
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-tooltip-label">
                            {t({ de: "Ziel", en: "Target" })}
                        </span>
                        <span class="cs-chart-tooltip-value">
                            {#if formatValue}
                                {tooltipContext.formattedTarget}
                            {:else}
                                <NumberMorph
                                    value={tooltipContext.row.target}
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

                        {#if tooltipContext.row.comparative !== null}
                            <span
                                class="cs-chart-tooltip-swatch cs-chart-bullet-tooltip-comparative-swatch"
                                aria-hidden="true"
                            ></span>
                            <span class="cs-chart-tooltip-label">
                                {t({ de: "Vorperiode", en: "Prior" })}
                            </span>
                            <span class="cs-chart-tooltip-value">
                                {#if formatValue}
                                    {tooltipContext.formattedComparative}
                                {:else}
                                    <NumberMorph
                                        value={tooltipContext.row.comparative}
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
                        {/if}
                    </div>

                    <div class="cs-chart-tooltip-total">
                        <span class="cs-chart-tooltip-total-label">
                            {t({ de: "Abweichung", en: "Variance" })}
                        </span>
                        <span
                            class="cs-chart-tooltip-total-value cs-chart-bullet-tooltip-variance"
                            data-sign={tooltipContext.variance > 0
                                ? "positive"
                                : tooltipContext.variance < 0
                                  ? "negative"
                                  : "neutral"}
                        >
                            {#if formatValue}
                                {tooltipContext.formattedVariance}
                            {:else}
                                <NumberMorph
                                    value={tooltipContext.variance}
                                    format={signedNumberFormat}
                                    {locales}
                                    willChange={false}
                                    respectMotionPreference={true}
                                    transformTiming={MORPH_TIMING}
                                    spinTiming={MORPH_TIMING}
                                    opacityTiming={OPACITY_TIMING}
                                />
                            {/if}
                            {#if tooltipContext.formattedVariancePercent !== null}
                                <span class="cs-chart-tooltip-sep" aria-hidden="true"></span>
                                <span class="cs-chart-tooltip-share">
                                    {tooltipContext.formattedVariancePercent}
                                </span>
                            {/if}
                        </span>
                    </div>
                {/if}
            {/if}
        </div>
    {/if}
</Chart>
