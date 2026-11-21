<script lang="ts">
    import { snapHalf } from "./chart-geometry.internal.ts";
    import type { ChartZeroLineStyle } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartGridProps } from "./index.ts";

    let {
        ref = $bindable(null),
        horizontal = true,
        vertical = false,
        zeroLine = true,
        tickCount,
        class: className,
        ...rest
    }: ChartGridProps = $props();

    const chart = getChartContext();

    const resolvedZeroLineStyle = $derived<ChartZeroLineStyle | null>(
        zeroLine === false ? null : zeroLine === true ? "solid" : zeroLine,
    );
    const showZeroBaseline = $derived(resolvedZeroLineStyle !== null && chart.yScale.crossesZero);

    const horizontalCoords = $derived.by((): readonly number[] => {
        if (!horizontal || !chart.hasSize) return [];

        if (chart.orientation === "horizontal") {
            return chart.xScale
                .ticks(tickCount ?? chart.xAxis.tickCount)
                .map((tick) => snapHalf(chart.xScale.center(tick)));
        }

        return chart.yScale
            .ticks(tickCount ?? chart.yAxis.tickCount)
            .filter((tick) => !(showZeroBaseline && tick === 0))
            .map((tick) => snapHalf(chart.yScale.scale(tick)));
    });

    const verticalCoords = $derived.by((): readonly number[] => {
        if (!vertical || !chart.hasSize) return [];

        if (chart.orientation === "horizontal") {
            return chart.yScale
                .ticks(tickCount ?? chart.yAxis.tickCount)
                .filter((tick) => !(showZeroBaseline && tick === 0))
                .map((tick) => snapHalf(chart.yScale.scale(tick)));
        }

        return chart.xScale
            .ticks(tickCount ?? chart.xAxis.tickCount)
            .map((tick) => snapHalf(chart.xScale.center(tick)));
    });

    const zeroCoord = $derived(showZeroBaseline && chart.hasSize ? snapHalf(chart.yScale.scale(0)) : null);
</script>

{#if chart.hasSize}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-layer-grid", className]}
        aria-hidden="true"
    >
        {#each horizontalCoords as yCoord, index (index)}
            <line
                class="cs-chart-grid-line"
                x1="0"
                x2={chart.plotWidth}
                y1={yCoord}
                y2={yCoord}
                shape-rendering="crispEdges"
            />
        {/each}

        {#each verticalCoords as xCoord, index (index)}
            <line
                class="cs-chart-grid-line"
                x1={xCoord}
                x2={xCoord}
                y1="0"
                y2={chart.plotHeight}
                shape-rendering="crispEdges"
            />
        {/each}

        {#if zeroCoord !== null}
            {#if chart.orientation === "horizontal"}
                <line
                    class="cs-chart-grid-zero"
                    data-style={resolvedZeroLineStyle ?? undefined}
                    x1={zeroCoord}
                    x2={zeroCoord}
                    y1="0"
                    y2={chart.plotHeight}
                    shape-rendering="crispEdges"
                />
            {:else}
                <line
                    class="cs-chart-grid-zero"
                    data-style={resolvedZeroLineStyle ?? undefined}
                    x1="0"
                    x2={chart.plotWidth}
                    y1={zeroCoord}
                    y2={zeroCoord}
                    shape-rendering="crispEdges"
                />
            {/if}
        {/if}
    </g>
{/if}
