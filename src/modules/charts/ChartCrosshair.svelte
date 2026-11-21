<script lang="ts">
    import { computeStackedSeries, snapHalf, snapInt } from "./chart-geometry.internal.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartCrosshairProps } from "./index.ts";

    interface ActivePointDot {
        readonly seriesId: string;
        readonly cx: number;
        readonly cy: number;
        readonly color: string;
        readonly dimmed: boolean;
    }

    let {
        ref = $bindable(null),
        vertical,
        horizontal,
        band,
        showDots = true,
        class: className,
        ...rest
    }: ChartCrosshairProps = $props();

    const chart = getChartContext();

    const isHorizontal = $derived(chart.orientation === "horizontal");
    const showVertical = $derived(vertical ?? !isHorizontal);
    const showHorizontal = $derived(horizontal ?? isHorizontal);
    const showBand = $derived(band ?? chart.xScale.type === "band");

    const activeXValue = $derived.by(() => {
        const index = chart.activeIndex;
        if (index === null || !chart.hasSize) return null;
        const datum = chart.data[index];
        if (datum === undefined) return null;
        return chart.extractX(datum, index);
    });

    const bandRect = $derived.by(() => {
        if (!showBand || activeXValue === null || chart.xScale.bandwidth <= 0) return null;
        const start = chart.xScale.scale(activeXValue);
        const bandwidth = chart.xScale.bandwidth;
        if (!Number.isFinite(start) || !Number.isFinite(bandwidth)) return null;

        if (isHorizontal) {
            return {
                x: 0,
                y: snapInt(start),
                width: chart.plotWidth,
                height: Math.max(1, snapInt(bandwidth)),
            };
        }

        return {
            x: snapInt(start),
            y: 0,
            width: Math.max(1, snapInt(bandwidth)),
            height: chart.plotHeight,
        };
    });

    const verticalLineX = $derived.by((): number | null => {
        if (!showVertical || activeXValue === null) return null;
        const coord = isHorizontal
            ? (chart.activeAnchor?.plotX ?? null)
            : chart.xScale.center(activeXValue);
        return coord !== null && Number.isFinite(coord) ? snapHalf(coord) : null;
    });

    const horizontalLineY = $derived.by((): number | null => {
        if (!showHorizontal || activeXValue === null) return null;
        const coord = isHorizontal
            ? chart.xScale.center(activeXValue)
            : (chart.activeAnchor?.plotY ?? null);
        return coord !== null && Number.isFinite(coord) ? snapHalf(coord) : null;
    });

    const stackedLeftLookup = $derived.by((): Readonly<Record<string, number>> | null => {
        if (!showDots || chart.activeIndex === null || chart.leftSeries.length === 0) {
            return null;
        }
        const stackableLeft = chart.leftSeries.filter(
            (item) => item.type !== "bar" && chart.isMarkTypeStacked(item.type),
        );
        if (stackableLeft.length === 0) return null;

        const index = chart.activeIndex;
        const { layers } = computeStackedSeries(
            stackableLeft.map((item) => ({
                id: item.id,
                values: chart.data.map((datum, datumIndex) =>
                    chart.extractSeriesValue(item, datum, datumIndex),
                ),
            })),
            { normalized: chart.isMarkTypePercent("area") },
        );
        const lookup: Record<string, number> = {};
        for (const layer of layers) {
            const point = layer.points[index];
            if (point && point.value !== null) {
                lookup[layer.seriesId] = point.y1;
            }
        }
        return lookup;
    });

    const activeDots = $derived.by((): readonly ActivePointDot[] => {
        const index = chart.activeIndex;
        if (!showDots || index === null || activeXValue === null || !chart.hasSize) return [];

        const datum = chart.data[index];
        if (datum === undefined) return [];

        const xCenter = chart.xScale.center(activeXValue);
        const dots: ActivePointDot[] = [];
        const targetSeries =
            chart.tooltipMode === "item" && chart.activeSeriesId !== null
                ? chart.visibleSeries.filter((item) => item.id === chart.activeSeriesId)
                : chart.visibleSeries;

        for (const seriesItem of targetSeries) {
            if (seriesItem.type === "bar") continue;
            const rawValue = chart.extractSeriesValue(seriesItem, datum, index);
            if (rawValue === null) continue;

            const isRightAxis = seriesItem.yAxis === "right" && chart.y2Scale !== null;
            const valueScale = isRightAxis && chart.y2Scale ? chart.y2Scale : chart.yScale;
            const stackedVal =
                !isRightAxis && stackedLeftLookup !== null
                    ? stackedLeftLookup[seriesItem.id]
                    : undefined;
            const plottedValue = stackedVal ?? rawValue;
            const valueCoord = valueScale.scale(plottedValue);

            if (!Number.isFinite(valueCoord) || !Number.isFinite(xCenter)) continue;

            dots.push({
                seriesId: seriesItem.id,
                cx: isHorizontal ? valueCoord : xCenter,
                cy: isHorizontal ? xCenter : valueCoord,
                color: chart.resolveDatumColor(seriesItem.id, datum, index),
                dimmed: chart.isSeriesDimmed(seriesItem.id),
            });
        }

        return dots;
    });
</script>

{#if chart.hasSize && chart.activeIndex !== null}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-layer-crosshair", className]}
        aria-hidden="true"
    >
        {#if bandRect}
            <rect
                class="cs-chart-hover-band"
                x={bandRect.x}
                y={bandRect.y}
                width={bandRect.width}
                height={bandRect.height}
            />
        {/if}

        {#if verticalLineX !== null}
            <line
                class="cs-chart-crosshair"
                x1={verticalLineX}
                x2={verticalLineX}
                y1="0"
                y2={chart.plotHeight}
                shape-rendering="crispEdges"
            />
        {/if}

        {#if horizontalLineY !== null}
            <line
                class="cs-chart-crosshair"
                x1="0"
                x2={chart.plotWidth}
                y1={horizontalLineY}
                y2={horizontalLineY}
                shape-rendering="crispEdges"
            />
        {/if}

        {#each activeDots as dot (dot.seriesId)}
            <g
                class="cs-chart-point-group"
                data-series-id={dot.seriesId}
                data-dimmed={dot.dimmed ? "" : undefined}
            >
                <circle
                    class="cs-chart-point-halo"
                    cx={dot.cx}
                    cy={dot.cy}
                    style:fill={dot.color}
                />
                <circle
                    class="cs-chart-point-dot"
                    cx={dot.cx}
                    cy={dot.cy}
                    style:fill={dot.color}
                />
            </g>
        {/each}
    </g>
{/if}
