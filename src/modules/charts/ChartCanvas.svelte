<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import {
        bisectSortedValues,
        findNearestCoordinateIndex,
        partitionSeriesIntoStackSlots,
    } from "./chart-geometry.internal.ts";
    import type { ChartDatum, ChartNumericScale, ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartCanvasProps } from "./index.ts";

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        height,
        aspectRatio,
        interactive = true,
        orientation,
        margin,
        label,
        labelledBy,
        onPointClick,
        onpointerenter,
        onpointermove,
        onpointerleave,
        onclick,
        onkeydown,
        onfocus,
        onblur,
        class: className,
        children,
        overlay,
        ...rest
    }: ChartCanvasProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();
    const uid = $props.id();
    const clipId = `cs-chart-clip-${uid}`;

    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const resolvedLabel = $derived(label ?? rest["aria-label"] ?? undefined);
    const resolvedLabelledBy = $derived(labelledBy ?? rest["aria-labelledby"] ?? undefined);

    const xCoordinates = $derived.by((): readonly number[] => {
        if (!chart.hasSize || chart.xValues.length === 0) return [];
        return chart.xValues.map((value) => chart.xScale.center(value));
    });

    const isAscendingCoords = $derived.by((): boolean => {
        for (let index = 1; index < xCoordinates.length; index++) {
            const prev = xCoordinates[index - 1];
            const curr = xCoordinates[index];
            if (prev !== undefined && curr !== undefined && curr < prev) {
                return false;
            }
        }
        return true;
    });

    const liveAnnouncement = $derived.by((): string => {
        if (!interactive) return "";
        if (chart.activeIndex !== null && chart.liveAnnouncementFormatter) {
            return chart.liveAnnouncementFormatter(chart.activeIndex);
        }
        const ctx = chart.getTooltipContext();
        if (!ctx) return "";
        if (ctx.items.length === 0) return ctx.xLabel;
        const summary = ctx.items
            .map((item) => `${item.series.label} ${item.formatted}`)
            .join(", ");
        return `${ctx.xLabel}: ${summary}`;
    });

    function identityCoord(coord: number): number {
        return coord;
    }

    function syncSvgRect(): void {
        const target = svgRef ?? ref;
        if (!target) {
            chart.setSvgRect(null);
            return;
        }
        const rect = target.getBoundingClientRect();
        chart.setSvgRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        });
    }

    function resolveNearestIndex(axisCoord: number): number {
        if (xCoordinates.length === 0 || !Number.isFinite(axisCoord)) return -1;
        if (isAscendingCoords) {
            return bisectSortedValues(xCoordinates, axisCoord, identityCoord);
        }
        return findNearestCoordinateIndex(axisCoord, xCoordinates);
    }

    function resolvePointerPlotPoint(
        clientX: number,
        clientY: number,
    ): { plotX: number; plotY: number; index: number } | null {
        if (!chart.hasSize || chart.data.length === 0) return null;

        let rect = untrack(() => chart.svgRect);
        if (!rect) {
            syncSvgRect();
            rect = untrack(() => chart.svgRect);
        }
        if (!rect) return null;

        const plotX = clientX - rect.left - chart.margins.left;
        const plotY = clientY - rect.top - chart.margins.top;
        const edgeTolerance = 12;

        if (
            plotX < -edgeTolerance ||
            plotX > chart.plotWidth + edgeTolerance ||
            plotY < -edgeTolerance ||
            plotY > chart.plotHeight + edgeTolerance
        ) {
            return null;
        }

        const axisCoord = chart.orientation === "horizontal" ? plotY : plotX;
        const index = resolveNearestIndex(axisCoord);
        if (index < 0) return null;

        return { plotX, plotY, index };
    }

    function resolveNearestSeriesId(index: number, plotX: number, plotY: number): string | null {
        const datum = chart.data[index];
        if (datum === undefined || chart.visibleSeries.length === 0) return null;

        const isHorizontal = chart.orientation === "horizontal";
        const pointerCoord = isHorizontal ? plotX : plotY;

        if ((chart.hasStackedMarks || chart.hasNamedStacks) && chart.visibleSeries.length > 0) {
            let bestBandId: string | null = null;
            let bestBandDist = Infinity;
            let bestId: string | null = null;
            let bestDist = Infinity;

            const evaluateStackedSlot = (
                slotSeries: readonly ChartSeries<TDatum>[],
                scale: ChartNumericScale,
            ): void => {
                let posSum = 0;
                let negSum = 0;
                for (const seriesItem of slotSeries) {
                    const value = chart.extractSeriesValue(seriesItem, datum, index);
                    if (value === null) continue;

                    let y0: number;
                    let y1: number;
                    if (value >= 0) {
                        y0 = posSum;
                        y1 = posSum + value;
                        posSum = y1;
                    } else {
                        y0 = negSum;
                        y1 = negSum + value;
                        negSum = y1;
                    }

                    const c0 = scale.scale(y0);
                    const c1 = scale.scale(y1);
                    if (!Number.isFinite(c0) || !Number.isFinite(c1)) continue;

                    const minC = Math.min(c0, c1);
                    const maxC = Math.max(c0, c1);
                    const center = (minC + maxC) / 2;
                    const dist = Math.abs(pointerCoord - center);

                    if (pointerCoord >= minC && pointerCoord <= maxC && dist < bestBandDist) {
                        bestBandDist = dist;
                        bestBandId = seriesItem.id;
                    }

                    if (dist < bestDist) {
                        bestDist = dist;
                        bestId = seriesItem.id;
                    }
                }
            };

            const evaluateGroup = (
                groupSeries: readonly ChartSeries<TDatum>[],
                scale: ChartNumericScale,
                stackUnstacked: boolean,
            ): void => {
                const slots = partitionSeriesIntoStackSlots(groupSeries, stackUnstacked);
                for (const slot of slots) {
                    const isStackedSlot =
                        slot.series.length > 1 || Boolean(slot.stackKey) || stackUnstacked;

                    if (isStackedSlot) {
                        evaluateStackedSlot(slot.series, scale);
                        continue;
                    }

                    const seriesItem = slot.series[0];
                    if (!seriesItem) continue;
                    const value = chart.extractSeriesValue(seriesItem, datum, index);
                    if (value === null) continue;
                    const coord = scale.scale(value);
                    if (!Number.isFinite(coord)) continue;
                    const dist = Math.abs(coord - pointerCoord);
                    if (dist < bestDist) {
                        bestDist = dist;
                        bestId = seriesItem.id;
                    }
                }
            };

            const evaluateAxis = (
                axisSeries: readonly ChartSeries<TDatum>[],
                scale: ChartNumericScale,
                allowStacking: boolean,
            ): void => {
                const groups = chart.partitionAxisSeriesByMarkType(axisSeries);
                for (const group of groups) {
                    const stackUnstacked = allowStacking && chart.isMarkTypeStacked(group.markType);
                    evaluateGroup(group.series, scale, stackUnstacked);
                }
            };

            if (chart.leftSeries.length > 0) {
                evaluateAxis(chart.leftSeries, chart.yScale, true);
            }

            if (!isHorizontal && chart.y2Scale !== null && chart.rightSeries.length > 0) {
                evaluateAxis(chart.rightSeries, chart.y2Scale, false);
            }

            const stackedHit = bestBandId ?? bestId;
            if (stackedHit !== null) return stackedHit;
        }

        let bestId: string | null = null;
        let bestDist = Infinity;

        for (const seriesItem of chart.visibleSeries) {
            const value = chart.extractSeriesValue(seriesItem, datum, index);
            if (value === null) continue;

            const isRightAxis =
                !isHorizontal && seriesItem.yAxis === "right" && chart.y2Scale !== null;
            const scale = isRightAxis && chart.y2Scale ? chart.y2Scale : chart.yScale;
            const coord = scale.scale(value);
            if (!Number.isFinite(coord)) continue;

            const dist = Math.abs(coord - pointerCoord);
            if (dist < bestDist) {
                bestDist = dist;
                bestId = seriesItem.id;
            }
        }

        return bestId;
    }

    function ensureActiveSeriesForItemMode(): void {
        if (chart.tooltipMode !== "item") return;
        if (chart.activeSeriesId !== null) return;
        const first = chart.visibleSeries[0];
        if (first) {
            chart.setActiveSeries(first.id);
        }
    }

    function cycleActiveSeries(delta: number): void {
        const seriesList = chart.visibleSeries;
        if (seriesList.length === 0) return;

        const currentId = chart.activeSeriesId;
        const currentIdx =
            currentId === null ? -1 : seriesList.findIndex((item) => item.id === currentId);
        const nextIdx =
            currentIdx === -1
                ? delta >= 0
                    ? 0
                    : seriesList.length - 1
                : (currentIdx + delta + seriesList.length) % seriesList.length;

        const nextSeries = seriesList[nextIdx];
        if (nextSeries) {
            chart.setActiveSeries(nextSeries.id);
        }
    }

    function handlePointerEnter(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointerenter?.(event);
        if (!interactive) return;
        syncSvgRect();
    }

    function handlePointerMove(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointermove?.(event);
        if (!interactive) return;

        const isDirectBarHit =
            chart.tooltipMode === "item" &&
            event.target instanceof Element &&
            event.target.closest(".cs-chart-bar-rect") !== null;

        const hit = resolvePointerPlotPoint(event.clientX, event.clientY);
        if (!hit) {
            if (!isDirectBarHit) {
                chart.setActiveIndex(null);
                chart.setActiveSeries(null);
                chart.setPointerPosition(null);
            }
            return;
        }

        chart.setPointerPosition({ x: hit.plotX, y: hit.plotY });
        if (isDirectBarHit) return;

        chart.setActiveIndex(hit.index);
        if (chart.tooltipMode === "item") {
            chart.setActiveSeries(resolveNearestSeriesId(hit.index, hit.plotX, hit.plotY));
        }
    }

    function handlePointerLeave(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointerleave?.(event);
        if (!interactive) return;
        chart.setActiveIndex(null);
        chart.setActiveSeries(null);
        chart.setPointerPosition(null);
    }

    function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onclick?.(event);
        if (!interactive || (!onPointClick && !chart.selectable) || chart.data.length === 0) return;

        let index = chart.activeIndex;
        if (index === null) {
            const hit = resolvePointerPlotPoint(event.clientX, event.clientY);
            index = hit ? hit.index : null;
        }
        if (index === null) return;

        if (chart.selectable) {
            chart.toggleSelectedIndex(index);
        }

        const datum = chart.data[index];
        if (datum !== undefined) {
            onPointClick?.(datum, index);
        }
    }

    function handleFocus(
        event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onfocus?.(event);
        if (!interactive) return;
        syncSvgRect();
    }

    function handleBlur(
        event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onblur?.(event);
        if (!interactive) return;
        chart.setActiveIndex(null);
        chart.setActiveSeries(null);
        chart.setPointerPosition(null);
    }

    function handleKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onkeydown?.(event);
        if (event.defaultPrevented || !interactive || chart.data.length === 0) return;

        const isItemMode = chart.tooltipMode === "item";
        const isHorizontal = chart.orientation === "horizontal";

        switch (event.key) {
            case "ArrowRight": {
                event.preventDefault();
                syncSvgRect();
                if (isItemMode && isHorizontal) {
                    if (chart.activeIndex === null) {
                        chart.stepActiveIndex(1);
                        ensureActiveSeriesForItemMode();
                    } else {
                        cycleActiveSeries(1);
                    }
                } else {
                    chart.stepActiveIndex(1);
                    ensureActiveSeriesForItemMode();
                }
                return;
            }
            case "ArrowDown": {
                event.preventDefault();
                syncSvgRect();
                if (isItemMode && !isHorizontal) {
                    if (chart.activeIndex === null) {
                        chart.stepActiveIndex(1);
                        ensureActiveSeriesForItemMode();
                    } else {
                        cycleActiveSeries(1);
                    }
                } else {
                    chart.stepActiveIndex(1);
                    ensureActiveSeriesForItemMode();
                }
                return;
            }
            case "ArrowLeft": {
                event.preventDefault();
                syncSvgRect();
                if (isItemMode && isHorizontal) {
                    if (chart.activeIndex === null) {
                        chart.stepActiveIndex(-1);
                        ensureActiveSeriesForItemMode();
                    } else {
                        cycleActiveSeries(-1);
                    }
                } else {
                    chart.stepActiveIndex(-1);
                    ensureActiveSeriesForItemMode();
                }
                return;
            }
            case "ArrowUp": {
                event.preventDefault();
                syncSvgRect();
                if (isItemMode && !isHorizontal) {
                    if (chart.activeIndex === null) {
                        chart.stepActiveIndex(-1);
                        ensureActiveSeriesForItemMode();
                    } else {
                        cycleActiveSeries(-1);
                    }
                } else {
                    chart.stepActiveIndex(-1);
                    ensureActiveSeriesForItemMode();
                }
                return;
            }
            case "Home": {
                event.preventDefault();
                syncSvgRect();
                chart.setActiveIndex(0);
                ensureActiveSeriesForItemMode();
                return;
            }
            case "End": {
                event.preventDefault();
                syncSvgRect();
                chart.setActiveIndex(chart.data.length - 1);
                ensureActiveSeriesForItemMode();
                return;
            }
            case "Escape": {
                if (chart.activeIndex !== null || chart.activeSeriesId !== null) {
                    event.preventDefault();
                    chart.setActiveIndex(null);
                    chart.setActiveSeries(null);
                    chart.setPointerPosition(null);
                }
                return;
            }
            case "Enter":
            case " ": {
                if (chart.activeIndex !== null) {
                    event.preventDefault();
                    if (chart.selectable) {
                        chart.toggleSelectedIndex(chart.activeIndex);
                    }
                    const datum = chart.data[chart.activeIndex];
                    if (datum !== undefined) {
                        onPointClick?.(datum, chart.activeIndex);
                    }
                }
                return;
            }
            default: {
                return;
            }
        }
    }

    $effect.pre(() => {
        chart.plotClipId = clipId;
        if (untrack(() => chart.interactive) !== interactive) {
            chart.interactive = interactive;
        }
        if (orientation !== undefined) {
            chart.orientation = orientation;
        }
        if (margin !== undefined) {
            chart.marginOverrides = margin;
        }
    });

    $effect(() => {
        const el = ref;
        if (!el) return;

        // Seed initial dimensions synchronously when layout is available so the first paint avoids a 0x0 flash.
        const initialRect = el.getBoundingClientRect();
        if (initialRect.width > 0 && initialRect.height > 0) {
            chart.setDimensions(initialRect.width, initialRect.height);
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
                    chart.setDimensions(pendingWidth, pendingHeight);
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
</script>

<!-- role="application" is bound dynamically when interactive keyboard scrubbing is enabled. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-canvas", className]}
    role={interactive ? "application" : rest.role}
    aria-roledescription={interactive ? t({ de: "Diagramm", en: "chart" }) : rest["aria-roledescription"]}
    aria-label={interactive && !resolvedLabelledBy
        ? (resolvedLabel ?? t({ de: "Interaktives Diagramm", en: "Interactive chart" }))
        : resolvedLabel}
    aria-labelledby={resolvedLabelledBy}
    tabindex={interactive ? 0 : rest.tabindex}
    data-interactive={interactive ? "" : undefined}
    data-scrubbing={chart.scrubbing ? "" : undefined}
    data-has-selection={chart.hasSelection ? "" : undefined}
    style:block-size={resolvedHeight}
    style:min-block-size={resolvedHeight ? "0px" : undefined}
    style:aspect-ratio={aspectRatio}
    onpointerenter={handlePointerEnter}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    onclick={handleClick}
    onkeydown={handleKeyDown}
    onfocus={handleFocus}
    onblur={handleBlur}
>
    <svg
        bind:this={svgRef}
        class="cs-chart-svg"
        width={chart.containerWidth}
        height={chart.containerHeight}
        role={label || labelledBy ? "img" : undefined}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-hidden={!label && !labelledBy ? "true" : undefined}
    >
        {#if chart.hasSize}
            <defs>
                <clipPath id={clipId}>
                    <rect x="0" y="0" width={chart.plotWidth} height={chart.plotHeight} />
                </clipPath>
            </defs>
            <g
                class="cs-chart-plot"
                transform="translate({chart.margins.left}, {chart.margins.top})"
            >
                {@render children?.()}
            </g>
        {/if}
    </svg>
    {@render overlay?.()}
    {#if interactive}
        <div class="cs-chart-sr-live" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
        </div>
    {/if}
</div>
