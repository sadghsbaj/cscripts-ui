<script lang="ts">
    import { untrack } from "svelte";

    import {
        buildAreaPath,
        buildLinePath,
        computeStackedSeries,
        type ChartAreaPoint,
        type ChartLinePoint,
        type StackedSeriesLayer,
    } from "./chart-geometry.internal.ts";
    import type { ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartAreaProps } from "./index.ts";

    interface AreaDot {
        readonly index: number;
        readonly cx: number;
        readonly cy: number;
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
    }

    let {
        ref = $bindable(null),
        seriesId,
        mode = "overlay",
        curve = "monotone",
        gradient = true,
        showLine = true,
        strokeWidth,
        dashed,
        connectNulls = false,
        showDots = "active",
        class: className,
        ...rest
    }: ChartAreaProps = $props();

    const chart = getChartContext();
    const uid = $props.id();
    const revealClipId = `cs-chart-area-reveal-${uid}`;

    $effect.pre(() => {
        if (mode !== "stacked") return;
        if (untrack(() => chart.stacked)) return;
        chart.stacked = true;
        return () => {
            chart.stacked = false;
        };
    });

    const targetSeries = $derived.by((): readonly ChartSeries[] => {
        if (seriesId !== undefined) {
            return chart.visibleSeries.filter((item) => item.id === seriesId);
        }
        return chart.visibleSeries.filter(
            (item) => item.type === undefined || item.type === "area",
        );
    });

    const stackedLayerLookup = $derived.by(
        (): Readonly<Record<string, StackedSeriesLayer>> | null => {
            if (mode !== "stacked" || targetSeries.length === 0 || chart.data.length === 0) {
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
            const color = chart.getSeriesColor(seriesItem.id);
            const stackedLayer =
                !isRightAxis && stackedLayerLookup !== null
                    ? stackedLayerLookup[seriesItem.id]
                    : undefined;

            const areaPoints: (ChartAreaPoint & { readonly index: number })[] = [];
            const linePoints: (ChartLinePoint & { readonly index: number })[] = [];
            let definedCount = 0;

            for (let index = 0; index < chart.data.length; index++) {
                const datum = chart.data[index];
                if (datum === undefined) continue;
                const xValue = chart.extractX(datum, index);
                const xCoord = chart.xScale.center(xValue);

                let y0Coord: number | null;
                let y1Coord: number | null;
                let hasValue: boolean;

                if (stackedLayer !== undefined) {
                    const stackedPoint = stackedLayer.points[index];
                    hasValue = stackedPoint !== undefined && stackedPoint.value !== null;
                    y0Coord = stackedPoint ? valueScale.scale(stackedPoint.y0) : null;
                    y1Coord = stackedPoint ? valueScale.scale(stackedPoint.y1) : null;
                } else {
                    const rawValue = chart.extractSeriesValue(seriesItem, datum, index);
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
                });
            }

            const areaPath = buildAreaPath(areaPoints, { curve, connectNulls });
            const linePath = showLine ? buildLinePath(linePoints, { curve, connectNulls }) : "";
            const dots: AreaDot[] = [];

            for (let index = 0; index < linePoints.length; index++) {
                const point = linePoints[index];
                if (!point || !point.defined || point.y === null) continue;

                const isIsolated =
                    definedCount === 1 ||
                    (!connectNulls &&
                        !linePoints[index - 1]?.defined &&
                        !linePoints[index + 1]?.defined);

                if (showDots === true || isIsolated) {
                    dots.push({
                        index: point.index,
                        cx: point.x,
                        cy: point.y,
                    });
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
            };
        });
    });
</script>

{#if chart.hasSize && preparedSeries.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-area", className]}
        data-mode={mode}
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

            {#if gradient}
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

        {#each preparedSeries as item (item.id)}
            <g
                class="cs-chart-series cs-chart-area-series"
                data-series={item.id}
                data-series-id={item.id}
                data-dimmed={item.dimmed ? "" : undefined}
            >
                {#if item.areaPath}
                    <path
                        class="cs-chart-area-fill"
                        d={item.areaPath}
                        data-mode={mode}
                        data-solid={!gradient ? "" : undefined}
                        fill={gradient ? `url(#${item.gradientId})` : undefined}
                        style:fill={!gradient ? item.color : undefined}
                    />
                {/if}

                {#if item.linePath || item.dots.length > 0}
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
                            <circle
                                class="cs-chart-line-dot"
                                cx={dot.cx}
                                cy={dot.cy}
                                style:fill={item.color}
                            />
                        {/each}
                    </g>
                {/if}
            </g>
        {/each}
    </g>
{/if}
