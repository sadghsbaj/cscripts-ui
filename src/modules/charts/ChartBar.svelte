<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import {
        computeGroupedBarRects,
        computeGroupedStackedBarRects,
        computeStackedBarRects,
        partitionSeriesIntoStackSlots,
        snapInt,
        type BarStackSlot,
        type ChartBarRect,
    } from "./chart-geometry.internal.ts";
    import { measureTextWidth, truncateTextToWidth } from "./chart-measure.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import type { ChartBarValueLabelsMode, ChartDatum, ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartBarProps } from "./index.ts";

    interface PreparedBar {
        readonly key: string;
        readonly rect: ChartBarRect;
        readonly color: string;
        readonly dimmed: boolean;
        readonly active: boolean;
        readonly origin: string;
        readonly delay: string;
    }

    interface BarOutsideLabel {
        readonly key: string;
        readonly seriesId: string;
        readonly index: number;
        readonly x: number;
        readonly y: number;
        readonly textAnchor: "start" | "middle" | "end";
        readonly dy?: string;
        readonly text: string;
        readonly dimmed: boolean;
    }

    interface BarInsideLabel {
        readonly key: string;
        readonly seriesId: string;
        readonly index: number;
        readonly x: number;
        readonly y: number;
        readonly text: string;
        readonly rotated: boolean;
        readonly dimmed: boolean;
    }

    interface AboveBarRow {
        readonly index: number;
        readonly y: number;
        readonly categoryText: string;
        readonly fullCategory: string;
        readonly truncated: boolean;
        readonly valueText: string | null;
        readonly active: boolean;
    }

    let {
        ref = $bindable(null),
        seriesId,
        seriesIds,
        mode = "grouped",
        radius,
        maxBarWidth,
        barGap,
        minBarLength = 2,
        segmentGap = 1.5,
        valueLabels = "none",
        insideLabelOrientation = "auto",
        formatLabel,
        labelLayout = "gutter",
        class: className,
        ...rest
    }: ChartBarProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();

    $effect.pre(() => {
        if (mode !== "stacked") return;
        if (untrack(() => chart.stacked || chart.stackedBar !== null)) return;
        chart.stacked = true;
        return () => {
            chart.stacked = false;
        };
    });

    const orientation = $derived(chart.orientation);
    const isHorizontal = $derived(orientation === "horizontal");
    const isAboveLayout = $derived(isHorizontal && labelLayout === "above");

    const resolvedRadius = $derived(
        radius ?? (chart.size === "sm" ? 3 : chart.size === "lg" ? 5 : 4),
    );
    const resolvedMaxBarWidth = $derived(
        maxBarWidth ?? (chart.size === "sm" ? 40 : chart.size === "lg" ? 64 : 52),
    );
    const resolvedBarGap = $derived(
        barGap ?? (chart.size === "sm" ? 3 : chart.size === "lg" ? 5 : 4),
    );
    const resolvedValueLabels = $derived<ChartBarValueLabelsMode>(
        valueLabels === true ? "outside" : valueLabels === false ? "none" : valueLabels,
    );
    const valueLabelFontSize = $derived(chart.size === "sm" ? 10 : 11);
    const aboveLabelFontSize = $derived(chart.size === "sm" ? 11 : 12);

    const targetSeries = $derived.by((): readonly ChartSeries<TDatum>[] => {
        if (seriesId !== undefined) {
            return chart.visibleSeries.filter((item) => item.id === seriesId);
        }
        if (seriesIds !== undefined) {
            return chart.visibleSeries.filter((item) => seriesIds.includes(item.id));
        }
        return chart.visibleSeries.filter(
            (item) => item.type === undefined || item.type === "bar",
        );
    });

    const hasNamedStacks = $derived(
        targetSeries.some((item) => item.stack !== undefined && item.stack.length > 0),
    );

    const stackSlots = $derived.by(
        (): readonly BarStackSlot<ChartSeries<TDatum>>[] =>
            partitionSeriesIntoStackSlots(targetSeries, mode === "stacked"),
    );

    const slotBySeriesId = $derived.by(
        (): Readonly<Record<string, BarStackSlot<ChartSeries<TDatum>>>> => {
            const map: Record<string, BarStackSlot<ChartSeries<TDatum>>> = {};
            for (const slot of stackSlots) {
                for (const item of slot.series) {
                    map[item.id] = slot;
                }
            }
            return map;
        },
    );

    const seriesLookup = $derived.by((): Readonly<Record<string, ChartSeries<TDatum>>> => {
        const lookup: Record<string, ChartSeries<TDatum>> = {};
        for (const item of targetSeries) {
            lookup[item.id] = item;
        }
        return lookup;
    });

    const valueAxisFormat = $derived(
        chart.getEffectiveAxisConfig(isHorizontal ? "bottom" : "left").format,
    );
    const categoryAxisFormat = $derived(
        chart.getEffectiveAxisConfig(isHorizontal ? "left" : "bottom").format,
    );

    const categoryGeometry = $derived.by((): {
        readonly starts: readonly number[];
        readonly bandwidth: number;
    } => {
        if (!chart.hasSize || chart.data.length === 0) {
            return { starts: [], bandwidth: 0 };
        }

        const xScale = chart.xScale;
        const rawBandwidth =
            xScale.bandwidth > 0
                ? xScale.bandwidth
                : Math.max(8, xScale.step > 0 ? xScale.step * 0.72 : 24);

        const rawStarts = chart.xValues.map((value) =>
            xScale.bandwidth > 0 ? xScale.scale(value) : xScale.center(value) - rawBandwidth / 2,
        );

        if (isAboveLayout) {
            // Reserve top band space for the inline category header row above horizontal bars.
            const aboveReserve = Math.min(18, Math.max(12, Math.floor(rawBandwidth * 0.42)));
            const barBandwidth = Math.max(6, rawBandwidth - aboveReserve);
            const barStarts = rawStarts.map((start) => start + aboveReserve);
            return { starts: barStarts, bandwidth: barBandwidth };
        }

        return { starts: rawStarts, bandwidth: rawBandwidth };
    });

    const barRects = $derived.by((): readonly ChartBarRect[] => {
        if (!chart.hasSize || targetSeries.length === 0 || categoryGeometry.starts.length === 0) {
            return [];
        }

        const seriesInputs = targetSeries.map((seriesItem) => ({
            id: seriesItem.id,
            stack: seriesItem.stack,
            values: chart.data.map((datum, index) =>
                chart.extractSeriesValue(seriesItem, datum, index),
            ),
        }));

        if (hasNamedStacks) {
            return computeGroupedStackedBarRects({
                series: seriesInputs,
                categoryStarts: categoryGeometry.starts,
                bandwidth: categoryGeometry.bandwidth,
                valueScale: chart.yScale,
                orientation,
                radius: resolvedRadius,
                maxBarWidth: resolvedMaxBarWidth,
                barGap: resolvedBarGap,
                segmentGap,
                minBarLength,
                stackUnstacked: mode === "stacked",
            });
        }

        if (mode === "stacked") {
            return computeStackedBarRects({
                series: seriesInputs,
                categoryStarts: categoryGeometry.starts,
                bandwidth: categoryGeometry.bandwidth,
                valueScale: chart.yScale,
                orientation,
                radius: resolvedRadius,
                maxBarWidth: resolvedMaxBarWidth,
                segmentGap,
                minBarLength,
            });
        }

        return computeGroupedBarRects({
            series: seriesInputs,
            categoryStarts: categoryGeometry.starts,
            bandwidth: categoryGeometry.bandwidth,
            valueScale: chart.yScale,
            orientation,
            radius: resolvedRadius,
            maxBarWidth: resolvedMaxBarWidth,
            barGap: resolvedBarGap,
            minBarLength,
        });
    });

    const preparedBars = $derived.by((): readonly PreparedBar[] =>
        barRects
            .filter((rect) => rect.path.length > 0)
            .map((rect) => ({
                key: `${rect.seriesId}-${rect.index}`,
                rect,
                color: chart.getSeriesColor(rect.seriesId),
                dimmed: chart.isSeriesDimmed(rect.seriesId),
                active: chart.activeIndex === rect.index,
                origin: isHorizontal ? `${rect.baseline}px 0px` : `0px ${rect.baseline}px`,
                delay: `${Math.min(rect.index * 18, 220)}ms`,
            })),
    );

    function formatValueText(
        value: number,
        datum: TDatum,
        seriesItem: ChartSeries<TDatum>,
    ): string {
        if (formatLabel) return formatLabel(value, datum, seriesItem);
        if (seriesItem.format) return seriesItem.format(value, datum);
        if (valueAxisFormat) return valueAxisFormat(value);
        return formatDefaultTick(value);
    }

    function computeDirectionalStackTotal(
        index: number,
        isNegative: boolean,
        slotSeries: readonly ChartSeries<TDatum>[] = targetSeries,
    ): number {
        const datum = chart.data[index];
        if (datum === undefined) return 0;

        let total = 0;
        for (const seriesItem of slotSeries) {
            const val = chart.extractSeriesValue(seriesItem, datum, index);
            if (val === null) continue;
            if (isNegative && val < 0) total += val;
            if (!isNegative && val > 0) total += val;
        }
        return total;
    }

    const isSingleColumnSlot = $derived(stackSlots.length === 1);
    const isSingleStackedSlot = $derived(
        isSingleColumnSlot && (mode === "stacked" || (stackSlots[0]?.series.length ?? 0) > 1),
    );

    const useAboveHeaderValue = $derived(
        isAboveLayout &&
            ((resolvedValueLabels === "outside" && isSingleColumnSlot) ||
                (resolvedValueLabels === "both" && isSingleStackedSlot)),
    );

    const insideLabels = $derived.by((): readonly BarInsideLabel[] => {
        if (resolvedValueLabels !== "inside" && resolvedValueLabels !== "both") return [];

        const font = { fontSize: valueLabelFontSize, fontWeight: 500 };
        const labels: BarInsideLabel[] = [];

        for (const item of preparedBars) {
            const { rect } = item;
            if (rect.width <= 0 || rect.height <= 0) continue;

            const datum = chart.data[rect.index];
            const seriesItem = seriesLookup[rect.seriesId];
            if (datum === undefined || !seriesItem) continue;

            const text = formatValueText(rect.value, datum, seriesItem);
            const labelWidth = measureTextWidth(text, font);
            const barThickness = isHorizontal ? rect.height : rect.width;

            const fitsHorizontal =
                rect.width >= labelWidth + 6 && rect.height >= 16 && barThickness >= 16;
            const fitsVertical = !isHorizontal && rect.height >= labelWidth + 8 && rect.width >= 16;

            let fits = false;
            let rotated = false;

            if (insideLabelOrientation === "horizontal") {
                fits = fitsHorizontal;
            } else if (insideLabelOrientation === "vertical") {
                fits = fitsVertical;
                rotated = true;
            } else if (fitsHorizontal) {
                fits = true;
            } else if (fitsVertical) {
                fits = true;
                rotated = true;
            }

            if (!fits) continue;

            labels.push({
                key: item.key,
                seriesId: rect.seriesId,
                index: rect.index,
                x: snapInt(rect.x + rect.width / 2),
                y: snapInt(rect.y + rect.height / 2),
                text,
                rotated,
                dimmed: item.dimmed,
            });
        }

        return labels;
    });

    const insideLabelKeys = $derived.by((): Readonly<Record<string, true>> => {
        const keys: Record<string, true> = {};
        for (const label of insideLabels) {
            keys[label.key] = true;
        }
        return keys;
    });

    const outsideLabels = $derived.by((): readonly BarOutsideLabel[] => {
        if (
            (resolvedValueLabels !== "outside" && resolvedValueLabels !== "both") ||
            useAboveHeaderValue
        ) {
            return [];
        }

        const labels: BarOutsideLabel[] = [];

        for (const item of preparedBars) {
            const { rect } = item;
            if (rect.width <= 0 || rect.height <= 0) continue;

            const slot = slotBySeriesId[rect.seriesId];
            const isMultiSeriesStackSlot = hasNamedStacks
                ? (slot?.series.length ?? 0) > 1
                : mode === "stacked";

            if (isMultiSeriesStackSlot && rect.capSide === "none") continue;
            // In grouped / single-series `both` mode, only fall back to an outside label when the inside label did not fit.
            if (resolvedValueLabels === "both" && !isMultiSeriesStackSlot && insideLabelKeys[item.key]) {
                continue;
            }

            const datum = chart.data[rect.index];
            const seriesItem = seriesLookup[rect.seriesId];
            if (datum === undefined || !seriesItem) continue;

            const labelValue = isMultiSeriesStackSlot
                ? computeDirectionalStackTotal(rect.index, rect.isNegative, slot?.series ?? targetSeries)
                : rect.value;
            const text = formatValueText(labelValue, datum, seriesItem);

            if (isHorizontal) {
                labels.push({
                    key: item.key,
                    seriesId: rect.seriesId,
                    index: rect.index,
                    x: snapInt(rect.isNegative ? rect.x - 6 : rect.x + rect.width + 6),
                    y: snapInt(rect.y + rect.height / 2),
                    textAnchor: rect.isNegative ? "end" : "start",
                    dy: "0.35em",
                    text,
                    dimmed: item.dimmed,
                });
            } else {
                labels.push({
                    key: item.key,
                    seriesId: rect.seriesId,
                    index: rect.index,
                    x: snapInt(rect.x + rect.width / 2),
                    y: snapInt(rect.isNegative ? rect.y + rect.height + 6 : rect.y - 6),
                    textAnchor: "middle",
                    dy: rect.isNegative ? "0.85em" : undefined,
                    text,
                    dimmed: item.dimmed,
                });
            }
        }

        return labels;
    });

    function handleBarPointer(rect: ChartBarRect): void {
        if (!chart.interactive || chart.tooltipMode !== "item") return;
        chart.setActiveIndex(rect.index);
        chart.setActiveSeries(rect.seriesId);
    }

    const aboveRows = $derived.by((): readonly AboveBarRow[] => {
        if (!isAboveLayout || !chart.hasSize || chart.data.length === 0) return [];

        const topByCategory: Record<number, number> = {};
        for (const item of preparedBars) {
            const existing = topByCategory[item.rect.index];
            if (existing === undefined || item.rect.y < existing) {
                topByCategory[item.rect.index] = item.rect.y;
            }
        }

        const labelFont = { fontSize: aboveLabelFontSize, fontWeight: 400 };
        const valueFont = { fontSize: aboveLabelFontSize, fontWeight: 600 };
        const rows: AboveBarRow[] = [];

        for (let index = 0; index < chart.data.length; index++) {
            const datum = chart.data[index];
            if (datum === undefined) continue;

            const xValue = chart.extractX(datum, index);
            const fullCategory = categoryAxisFormat
                ? categoryAxisFormat(xValue)
                : formatDefaultTick(xValue);

            const barTop = topByCategory[index] ?? categoryGeometry.starts[index] ?? 0;
            const y = snapInt(barTop - 5);

            let valueText: string | null = null;
            let valueWidth = 0;

            if (useAboveHeaderValue && targetSeries.length > 0) {
                const primarySeries = targetSeries[0];
                if (primarySeries) {
                    let rowTotal = 0;
                    let hasNumeric = false;
                    for (const seriesItem of targetSeries) {
                        const val = chart.extractSeriesValue(seriesItem, datum, index);
                        if (val !== null) {
                            rowTotal += val;
                            hasNumeric = true;
                        }
                    }
                    if (hasNumeric) {
                        valueText = formatValueText(rowTotal, datum, primarySeries);
                        valueWidth = measureTextWidth(valueText, valueFont);
                    }
                }
            }

            const availableWidth = Math.max(
                24,
                chart.plotWidth - (valueWidth > 0 ? valueWidth + 12 : 0),
            );
            const truncated = truncateTextToWidth(fullCategory, availableWidth, labelFont);

            rows.push({
                index,
                y,
                categoryText: truncated.text,
                fullCategory,
                truncated: truncated.truncated,
                valueText,
                active: chart.activeIndex === index,
            });
        }

        return rows;
    });
</script>

{#if chart.hasSize && targetSeries.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-bar", className]}
        data-mode={mode}
        data-orientation={orientation}
        data-label-layout={labelLayout}
        data-tooltip-mode={chart.interactive ? chart.tooltipMode : undefined}
    >
        {#each preparedBars as item (item.key)}
            <path
                class="cs-chart-bar-rect"
                role="presentation"
                d={item.rect.path}
                data-series-id={item.rect.seriesId}
                data-stack={item.rect.stackKey}
                data-index={item.rect.index}
                data-orientation={orientation}
                data-negative={item.rect.isNegative ? "" : undefined}
                data-dimmed={item.dimmed ? "" : undefined}
                data-active={item.active ? "" : undefined}
                style:fill={item.color}
                style:--cs-chart-bar-origin={item.origin}
                style:--cs-chart-bar-delay={item.delay}
                onpointerenter={() => handleBarPointer(item.rect)}
                onpointermove={() => handleBarPointer(item.rect)}
            />
        {/each}

        {#each outsideLabels as label (label.key)}
            <text
                class="cs-chart-bar-value-label"
                x={label.x}
                y={label.y}
                text-anchor={label.textAnchor}
                dy={label.dy}
                data-series-id={label.seriesId}
                data-index={label.index}
                data-dimmed={label.dimmed ? "" : undefined}
            >
                {label.text}
            </text>
        {/each}

        {#each insideLabels as label (label.key)}
            <text
                class="cs-chart-bar-inside-label"
                x={label.rotated ? 0 : label.x}
                y={label.rotated ? 0 : label.y}
                transform={label.rotated ? `translate(${label.x}, ${label.y}) rotate(-90)` : undefined}
                text-anchor="middle"
                dy="0.35em"
                data-series-id={label.seriesId}
                data-index={label.index}
                data-orientation={label.rotated ? "vertical" : "horizontal"}
                data-dimmed={label.dimmed ? "" : undefined}
            >
                {label.text}
            </text>
        {/each}

        {#each aboveRows as row (row.index)}
            <text
                class="cs-chart-bar-above-label"
                x="0"
                y={row.y}
                text-anchor="start"
                data-index={row.index}
                data-active={row.active ? "" : undefined}
            >
                {#if row.truncated}
                    <title>{row.fullCategory}</title>
                {/if}
                {row.categoryText}
            </text>

            {#if row.valueText !== null}
                <text
                    class="cs-chart-bar-above-value"
                    x={snapInt(chart.plotWidth)}
                    y={row.y}
                    text-anchor="end"
                    data-index={row.index}
                    data-active={row.active ? "" : undefined}
                >
                    {row.valueText}
                </text>
            {/if}
        {/each}
    </g>
{/if}
