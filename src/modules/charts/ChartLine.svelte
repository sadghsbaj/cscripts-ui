<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import {
        buildLinePath,
        snapHalf,
        snapInt,
        type ChartLinePoint,
    } from "./chart-geometry.internal.ts";
    import {
        measureTextWidth,
        resolveDirectLabelPositions,
        truncateTextToWidth,
    } from "./chart-measure.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import type { ChartDatum, ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartLineProps } from "./index.ts";

    interface LineDot {
        readonly index: number;
        readonly cx: number;
        readonly cy: number;
        readonly color: string;
        readonly selected: boolean;
    }

    interface LineValueLabel {
        readonly index: number;
        readonly x: number;
        readonly y: number;
        readonly text: string;
    }

    interface SeriesEndpoint {
        readonly id: string;
        readonly label: string;
        readonly color: string;
        readonly dimmed: boolean;
        readonly xEnd: number;
        readonly yEnd: number;
        readonly valueText: string;
    }

    interface PreparedDirectLabel {
        readonly id: string;
        readonly name: string;
        readonly fullLabel: string;
        readonly truncated: boolean;
        readonly valueText: string;
        readonly color: string;
        readonly dimmed: boolean;
        readonly x: number;
        readonly y: number;
        readonly leaderPath: string | null;
    }

    interface PreparedLineSeries {
        readonly id: string;
        readonly color: string;
        readonly dimmed: boolean;
        readonly dashed: boolean;
        readonly path: string;
        readonly dots: readonly LineDot[];
        readonly labels: readonly LineValueLabel[];
        readonly endpoint: SeriesEndpoint | null;
    }

    let {
        ref = $bindable(null),
        seriesId,
        seriesIds,
        curve = "monotone",
        strokeWidth,
        dashed,
        connectNulls = false,
        showDots = "active",
        showLabels = false,
        directLabels = false,
        formatLabel,
        class: className,
        ...rest
    }: ChartLineProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();
    const uid = $props.id();
    const revealClipId = `cs-chart-line-reveal-${uid}`;

    $effect.pre(() => {
        if (!directLabels) return;
        if (untrack(() => chart.directLabels)) return;
        chart.directLabels = true;
        return () => {
            chart.directLabels = false;
        };
    });

    const targetSeries = $derived.by((): readonly ChartSeries<TDatum>[] => {
        if (seriesId !== undefined) {
            return chart.visibleSeries.filter((item) => item.id === seriesId);
        }
        if (seriesIds !== undefined) {
            return chart.visibleSeries.filter((item) => seriesIds.includes(item.id));
        }
        return chart.visibleSeries.filter(
            (item) => item.type === undefined || item.type === "line",
        );
    });

    const leftAxisFormat = $derived(chart.getEffectiveAxisConfig("left").format);
    const rightAxisFormat = $derived(chart.getEffectiveAxisConfig("right").format);

    const preparedSeries = $derived.by((): readonly PreparedLineSeries[] => {
        if (!chart.hasSize || targetSeries.length === 0 || chart.data.length === 0) return [];

        return targetSeries.map((seriesItem) => {
            const isRightAxis = seriesItem.yAxis === "right" && chart.y2Scale !== null;
            const valueScale = isRightAxis && chart.y2Scale ? chart.y2Scale : chart.yScale;
            const axisFormat = isRightAxis ? rightAxisFormat : leftAxisFormat;
            const color = chart.getSeriesColor(seriesItem.id);

            const points: (ChartLinePoint & {
                readonly index: number;
                readonly value: number | null;
                readonly datum: TDatum;
            })[] = [];
            let definedCount = 0;

            for (let index = 0; index < chart.data.length; index++) {
                const datum = chart.data[index];
                if (datum === undefined) continue;
                const xValue = chart.extractX(datum, index);
                const xCoord = chart.xScale.center(xValue);
                const rawValue = chart.extractSeriesValue(seriesItem, datum, index);
                const yCoord = rawValue === null ? null : valueScale.scale(rawValue);
                const isDefined =
                    yCoord !== null && Number.isFinite(xCoord) && Number.isFinite(yCoord);

                if (isDefined) definedCount++;

                points.push({
                    index,
                    x: xCoord,
                    y: yCoord,
                    defined: isDefined,
                    value: rawValue,
                    datum,
                });
            }

            const path = buildLinePath(points, { curve, connectNulls });
            const dots: LineDot[] = [];
            const labels: LineValueLabel[] = [];
            let endpoint: SeriesEndpoint | null = null;

            for (let index = 0; index < points.length; index++) {
                const point = points[index];
                if (!point || !point.defined || point.y === null || point.value === null) continue;

                const isIsolated =
                    definedCount === 1 ||
                    (!connectNulls && !points[index - 1]?.defined && !points[index + 1]?.defined);
                const isSelected = chart.selectedIndex === point.index;

                if (showDots === true || isIsolated || isSelected) {
                    dots.push({
                        index: point.index,
                        cx: point.x,
                        cy: point.y,
                        color: chart.resolveDatumColor(seriesItem.id, point.datum, point.index),
                        selected: isSelected,
                    });
                }

                const formattedValue = formatLabel
                    ? formatLabel(point.value, point.datum, seriesItem)
                    : seriesItem.format
                      ? seriesItem.format(point.value, point.datum)
                      : axisFormat
                        ? axisFormat(point.value)
                        : formatDefaultTick(point.value);

                if (showLabels) {
                    labels.push({
                        index: point.index,
                        x: snapInt(point.x),
                        y: snapInt(point.y - 8),
                        text: formattedValue,
                    });
                }

                endpoint = {
                    id: seriesItem.id,
                    label: seriesItem.label,
                    color,
                    dimmed: chart.isSeriesDimmed(seriesItem.id),
                    xEnd: point.x,
                    yEnd: point.y,
                    valueText: formattedValue,
                };
            }

            return {
                id: seriesItem.id,
                color,
                dimmed: chart.isSeriesDimmed(seriesItem.id),
                dashed: Boolean(dashed ?? seriesItem.dashed),
                path,
                dots,
                labels,
                endpoint,
            };
        });
    });

    const preparedDirectLabels = $derived.by((): readonly PreparedDirectLabel[] => {
        if (!directLabels || !chart.hasSize || chart.hasY2Axis || preparedSeries.length === 0) {
            return [];
        }

        const endpoints: SeriesEndpoint[] = [];
        for (const item of preparedSeries) {
            if (item.endpoint) endpoints.push(item.endpoint);
        }
        if (endpoints.length === 0) return [];

        const minGap = chart.size === "lg" ? 16 : 14;
        const placements = resolveDirectLabelPositions(
            endpoints.map((ep) => ({ id: ep.id, y: ep.yEnd })),
            chart.plotHeight,
            minGap,
            8,
        );

        const endpointById: Record<string, SeriesEndpoint> = Object.create(null);
        for (const ep of endpoints) endpointById[ep.id] = ep;

        const labelFont = { fontSize: 11, fontWeight: 600 };
        const valueFont = { fontSize: 11, fontWeight: 500 };
        const maxTotalWidth = Math.max(48, chart.margins.right - 12);
        const labelX = snapInt(chart.plotWidth + 8);
        const elbowEndX = snapInt(chart.plotWidth + 6);

        const result: PreparedDirectLabel[] = [];
        for (const placed of placements) {
            const ep = endpointById[placed.id];
            if (!ep) continue;

            const valueWidth = ep.valueText ? measureTextWidth(ep.valueText, valueFont) + 5 : 0;
            const nameBudget = Math.max(24, maxTotalWidth - valueWidth);
            const fitted = truncateTextToWidth(ep.label, nameBudget, labelFont);

            const startX = snapInt(Math.min(ep.xEnd + 2, chart.plotWidth + 2));
            const leaderPath = placed.nudged
                ? `M${startX},${snapHalf(placed.yTrue)}L${elbowEndX},${snapHalf(placed.y)}`
                : null;

            result.push({
                id: ep.id,
                name: fitted.text,
                fullLabel: ep.label,
                truncated: fitted.truncated,
                valueText: ep.valueText,
                color: ep.color,
                dimmed: ep.dimmed,
                x: labelX,
                y: snapInt(placed.y),
                leaderPath,
            });
        }

        return result;
    });
</script>

{#if chart.hasSize && preparedSeries.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-line", className]}
        data-has-selection={chart.hasSelection ? "" : undefined}
    >
        <defs>
            <clipPath id={revealClipId}>
                <rect
                    class="cs-chart-reveal-rect"
                    x={-12}
                    y={-24}
                    width={chart.plotWidth + 24}
                    height={chart.plotHeight + 48}
                />
            </clipPath>
        </defs>

        <g clip-path={`url(#${revealClipId})`}>
            {#each preparedSeries as item (item.id)}
                <g
                    class="cs-chart-series cs-chart-line-series"
                    data-series={item.id}
                    data-series-id={item.id}
                    data-dimmed={item.dimmed ? "" : undefined}
                >
                    {#if item.path}
                        <path
                            class="cs-chart-line-path"
                            d={item.path}
                            style:stroke={item.color}
                            style:stroke-width={strokeWidth !== undefined
                                ? `${strokeWidth}px`
                                : undefined}
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-dasharray={item.dashed ? "5 4" : undefined}
                        />
                    {/if}

                    {#each item.dots as dot (dot.index)}
                        {#if dot.selected}
                            <circle
                                class="cs-chart-selected-point-ring"
                                cx={dot.cx}
                                cy={dot.cy}
                                aria-hidden="true"
                            />
                        {/if}
                        <circle
                            class="cs-chart-line-dot"
                            cx={dot.cx}
                            cy={dot.cy}
                            data-index={dot.index}
                            data-selected={dot.selected ? "" : undefined}
                            style:fill={dot.color}
                        />
                    {/each}

                    {#each item.labels as label (label.index)}
                        <text
                            class="cs-chart-value-label"
                            x={label.x}
                            y={label.y}
                            text-anchor="middle"
                        >
                            {label.text}
                        </text>
                    {/each}
                </g>
            {/each}
        </g>

        {#if preparedDirectLabels.length > 0}
            <g class="cs-chart-direct-labels">
                {#each preparedDirectLabels as label (label.id)}
                    <g
                        class="cs-chart-direct-label-item"
                        data-series-id={label.id}
                        data-dimmed={label.dimmed ? "" : undefined}
                    >
                        {#if label.leaderPath}
                            <path
                                class="cs-chart-direct-leader"
                                d={label.leaderPath}
                                style:stroke={label.color}
                                aria-hidden="true"
                            />
                        {/if}
                        <text
                            class="cs-chart-direct-label"
                            x={label.x}
                            y={label.y}
                            text-anchor="start"
                            dominant-baseline="central"
                        >
                            {#if label.truncated}
                                <title>{label.fullLabel}</title>
                            {/if}
                            <tspan class="cs-chart-direct-label-name" style:fill={label.color}>
                                {label.name}
                            </tspan>
                            {#if label.valueText}
                                <tspan class="cs-chart-direct-label-value" dx="5">
                                    {label.valueText}
                                </tspan>
                            {/if}
                        </text>
                    </g>
                {/each}
            </g>
        {/if}
    </g>
{/if}
