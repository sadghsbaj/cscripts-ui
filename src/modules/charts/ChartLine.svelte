<script lang="ts" generics="TDatum = ChartDatum">
    import { buildLinePath, snapInt, type ChartLinePoint } from "./chart-geometry.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import type { ChartDatum, ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartLineProps } from "./index.ts";

    interface LineDot {
        readonly index: number;
        readonly cx: number;
        readonly cy: number;
    }

    interface LineValueLabel {
        readonly index: number;
        readonly x: number;
        readonly y: number;
        readonly text: string;
    }

    interface PreparedLineSeries {
        readonly id: string;
        readonly color: string;
        readonly dimmed: boolean;
        readonly dashed: boolean;
        readonly path: string;
        readonly dots: readonly LineDot[];
        readonly labels: readonly LineValueLabel[];
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
        formatLabel,
        class: className,
        ...rest
    }: ChartLineProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();
    const uid = $props.id();
    const revealClipId = `cs-chart-line-reveal-${uid}`;

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

            for (let index = 0; index < points.length; index++) {
                const point = points[index];
                if (!point || !point.defined || point.y === null || point.value === null) continue;

                const isIsolated =
                    definedCount === 1 ||
                    (!connectNulls && !points[index - 1]?.defined && !points[index + 1]?.defined);

                if (showDots === true || isIsolated) {
                    dots.push({
                        index: point.index,
                        cx: point.x,
                        cy: point.y,
                    });
                }

                if (showLabels) {
                    const text = formatLabel
                        ? formatLabel(point.value, point.datum, seriesItem)
                        : seriesItem.format
                          ? seriesItem.format(point.value, point.datum)
                          : axisFormat
                            ? axisFormat(point.value)
                            : formatDefaultTick(point.value);

                    labels.push({
                        index: point.index,
                        x: snapInt(point.x),
                        y: snapInt(point.y - 8),
                        text,
                    });
                }
            }

            return {
                id: seriesItem.id,
                color,
                dimmed: chart.isSeriesDimmed(seriesItem.id),
                dashed: Boolean(dashed ?? seriesItem.dashed),
                path,
                dots,
                labels,
            };
        });
    });
</script>

{#if chart.hasSize && preparedSeries.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-line", className]}
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
                        <circle
                            class="cs-chart-line-dot"
                            cx={dot.cx}
                            cy={dot.cy}
                            style:fill={item.color}
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
    </g>
{/if}
