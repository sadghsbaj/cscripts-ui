<script lang="ts">
    import { untrack } from "svelte";

    import {
        buildAreaPath,
        buildLinePath,
        computeStackedSeries,
        snapHalf,
        snapInt,
        type ChartAreaPoint,
        type ChartLinePoint,
        type StackedSeriesLayer,
    } from "./chart-geometry.internal.ts";
    import {
        measureTextWidth,
        resolveDirectLabelPositions,
        truncateTextToWidth,
    } from "./chart-measure.internal.ts";
    import { formatDefaultTick, formatPercentTick } from "./chart-scales.internal.ts";
    import type { ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartAreaProps } from "./index.ts";

    interface AreaDot {
        readonly index: number;
        readonly cx: number;
        readonly cy: number;
        readonly color: string;
        readonly selected: boolean;
    }

    interface AreaEndpoint {
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

    interface PreparedAreaSeries {
        readonly id: string;
        readonly gradientId: string;
        readonly color: string;
        readonly dimmed: boolean;
        readonly dashed: boolean;
        readonly areaPath: string;
        readonly linePath: string;
        readonly dots: readonly AreaDot[];
        readonly endpoint: AreaEndpoint | null;
    }

    let {
        ref = $bindable(null),
        seriesId,
        seriesIds,
        mode = "overlay",
        part = "all",
        curve = "monotone",
        gradient = true,
        showLine = true,
        strokeWidth,
        dashed,
        connectNulls = false,
        showDots = "active",
        directLabels = false,
        class: className,
        ...rest
    }: ChartAreaProps = $props();

    const chart = getChartContext();
    const uid = $props.id();
    const revealClipId = `cs-chart-area-reveal-${uid}`;

    const renderFill = $derived(part === "all" || part === "fill");
    const renderLine = $derived(part === "all" || part === "line");
    const isStacked = $derived(mode === "stacked" || mode === "percent");
    const isNormalized = $derived(mode === "percent");

    $effect.pre(() => {
        if (!isStacked || part === "line") return;
        const shouldSetStacked = !untrack(() => chart.stacked || chart.stackedArea !== null);
        const shouldSetPercent =
            isNormalized && !untrack(() => chart.percent || chart.percentArea !== null);
        if (!shouldSetStacked && !shouldSetPercent) return;

        if (shouldSetStacked) chart.stacked = true;
        if (shouldSetPercent) chart.percent = true;
        return () => {
            if (shouldSetStacked) chart.stacked = false;
            if (shouldSetPercent) chart.percent = false;
        };
    });

    $effect.pre(() => {
        if (!directLabels || part === "fill") return;
        if (untrack(() => chart.directLabels)) return;
        chart.directLabels = true;
        return () => {
            chart.directLabels = false;
        };
    });

    const targetSeries = $derived.by((): readonly ChartSeries[] => {
        if (seriesId !== undefined) {
            return chart.visibleSeries.filter((item) => item.id === seriesId);
        }
        if (seriesIds !== undefined) {
            return chart.visibleSeries.filter((item) => seriesIds.includes(item.id));
        }
        return chart.visibleSeries.filter(
            (item) => item.type === undefined || item.type === "area",
        );
    });

    const leftAxisFormat = $derived(chart.getEffectiveAxisConfig("left").format);
    const rightAxisFormat = $derived(chart.getEffectiveAxisConfig("right").format);

    const stackedLayerLookup = $derived.by(
        (): Readonly<Record<string, StackedSeriesLayer>> | null => {
            if (!isStacked || targetSeries.length === 0 || chart.data.length === 0) {
                return null;
            }
            const leftTarget = targetSeries.filter((item) => item.yAxis !== "right");
            if (leftTarget.length === 0) return null;

            const { layers } = computeStackedSeries(
                leftTarget.map((item) => ({
                    id: item.id,
                    values: chart.data.map((datum, index) =>
                        chart.extractSeriesValue(item, datum, index),
                    ),
                })),
                { normalized: isNormalized },
            );

            const lookup: Record<string, StackedSeriesLayer> = {};
            for (const layer of layers) {
                lookup[layer.seriesId] = layer;
            }
            return lookup;
        },
    );

    const preparedSeries = $derived.by((): readonly PreparedAreaSeries[] => {
        if (!chart.hasSize || targetSeries.length === 0 || chart.data.length === 0) return [];

        return targetSeries.map((seriesItem, seriesIndex) => {
            const isRightAxis = seriesItem.yAxis === "right" && chart.y2Scale !== null;
            const valueScale = isRightAxis && chart.y2Scale ? chart.y2Scale : chart.yScale;
            const axisFormat = isRightAxis ? rightAxisFormat : leftAxisFormat;
            const color = chart.getSeriesColor(seriesItem.id);
            const stackedLayer =
                !isRightAxis && stackedLayerLookup !== null
                    ? stackedLayerLookup[seriesItem.id]
                    : undefined;

            const areaPoints: (ChartAreaPoint & { readonly index: number })[] = [];
            const linePoints: (ChartLinePoint & {
                readonly index: number;
                readonly datum: Record<string, unknown>;
                readonly rawValue: number | null;
                readonly share?: number;
            })[] = [];
            let definedCount = 0;

            for (let index = 0; index < chart.data.length; index++) {
                const datum = chart.data[index];
                if (datum === undefined) continue;
                const xValue = chart.extractX(datum, index);
                const xCoord = chart.xScale.center(xValue);

                let y0Coord: number | null;
                let y1Coord: number | null;
                let hasValue: boolean;
                let rawValue: number | null;
                let share: number | undefined;

                if (stackedLayer !== undefined) {
                    const stackedPoint = stackedLayer.points[index];
                    rawValue = stackedPoint?.value ?? null;
                    hasValue = stackedPoint !== undefined && stackedPoint.value !== null;
                    y0Coord = stackedPoint ? valueScale.scale(stackedPoint.y0) : null;
                    y1Coord = stackedPoint ? valueScale.scale(stackedPoint.y1) : null;
                    if (isNormalized && stackedPoint) {
                        share = Math.max(0, stackedPoint.y1 - stackedPoint.y0);
                    }
                } else {
                    rawValue = chart.extractSeriesValue(seriesItem, datum, index);
                    hasValue = rawValue !== null;
                    y0Coord = valueScale.baseline;
                    y1Coord = rawValue === null ? null : valueScale.scale(rawValue);
                }

                const isDefined =
                    hasValue &&
                    y0Coord !== null &&
                    y1Coord !== null &&
                    Number.isFinite(xCoord) &&
                    Number.isFinite(y0Coord) &&
                    Number.isFinite(y1Coord);

                if (isDefined) definedCount++;

                areaPoints.push({
                    index,
                    x: xCoord,
                    y0: y0Coord,
                    y1: y1Coord,
                    defined: isDefined,
                });

                linePoints.push({
                    index,
                    x: xCoord,
                    y: y1Coord,
                    defined: isDefined,
                    datum,
                    rawValue,
                    share,
                });
            }

            const areaPath = renderFill ? buildAreaPath(areaPoints, { curve, connectNulls }) : "";
            const linePath =
                renderLine && showLine ? buildLinePath(linePoints, { curve, connectNulls }) : "";
            const dots: AreaDot[] = [];
            let endpoint: AreaEndpoint | null = null;

            if (renderLine) {
                for (let index = 0; index < linePoints.length; index++) {
                    const point = linePoints[index];
                    if (!point || !point.defined || point.y === null) continue;

                    const isIsolated =
                        definedCount === 1 ||
                        (!connectNulls &&
                            !linePoints[index - 1]?.defined &&
                            !linePoints[index + 1]?.defined);
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

                    const formattedValue =
                        isNormalized && point.share !== undefined
                            ? formatPercentTick(point.share)
                            : point.rawValue === null
                              ? ""
                              : seriesItem.format
                                ? seriesItem.format(point.rawValue, point.datum)
                                : axisFormat
                                  ? axisFormat(point.rawValue)
                                  : formatDefaultTick(point.rawValue);

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
            }

            return {
                id: seriesItem.id,
                gradientId: `cs-chart-area-grad-${uid}-${seriesIndex}`,
                color,
                dimmed: chart.isSeriesDimmed(seriesItem.id),
                dashed: Boolean(dashed ?? seriesItem.dashed),
                areaPath,
                linePath,
                dots,
                endpoint,
            };
        });
    });

    const preparedDirectLabels = $derived.by((): readonly PreparedDirectLabel[] => {
        if (
            !renderLine ||
            !directLabels ||
            !chart.hasSize ||
            chart.hasY2Axis ||
            preparedSeries.length === 0
        ) {
            return [];
        }

        const endpoints: AreaEndpoint[] = [];
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

        const endpointById: Record<string, AreaEndpoint> = Object.create(null);
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
        class={["cs-chart-area", className]}
        data-mode={mode}
        data-part={part}
    >
        {#if renderLine || (renderFill && gradient)}
            <defs>
                {#if renderLine}
                    <clipPath id={revealClipId}>
                        <rect
                            class="cs-chart-reveal-rect"
                            x={-12}
                            y={-24}
                            width={chart.plotWidth + 24}
                            height={chart.plotHeight + 48}
                        />
                    </clipPath>
                {/if}

                {#if renderFill && gradient}
                    {#each preparedSeries as item (item.id)}
                        <linearGradient id={item.gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop
                                offset="0%"
                                class="cs-chart-area-stop-top"
                                data-mode={mode}
                                style:stop-color={item.color}
                            />
                            <stop
                                offset="100%"
                                class="cs-chart-area-stop-bottom"
                                data-mode={mode}
                                style:stop-color={item.color}
                            />
                        </linearGradient>
                    {/each}
                {/if}
            </defs>
        {/if}

        {#each preparedSeries as item (item.id)}
            <g
                class="cs-chart-series cs-chart-area-series"
                data-series={item.id}
                data-series-id={item.id}
                data-dimmed={item.dimmed ? "" : undefined}
            >
                {#if renderFill && item.areaPath}
                    <path
                        class="cs-chart-area-fill"
                        d={item.areaPath}
                        data-mode={mode}
                        data-solid={!gradient ? "" : undefined}
                        fill={gradient ? `url(#${item.gradientId})` : undefined}
                        style:fill={!gradient ? item.color : undefined}
                    />
                {/if}

                {#if renderLine && (item.linePath || item.dots.length > 0)}
                    <g clip-path={`url(#${revealClipId})`}>
                        {#if item.linePath}
                            <path
                                class="cs-chart-line-path"
                                d={item.linePath}
                                data-area-mode={mode}
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
                    </g>
                {/if}
            </g>
        {/each}

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
