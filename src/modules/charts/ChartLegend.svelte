<script lang="ts" generics="TDatum = ChartDatum">
    import ChartLegendItem from "./ChartLegendItem.svelte";
    import { filterLegendSeries } from "./chart-legend.internal.ts";
    import type { ChartDatum, ChartLegendMarker, ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartLegendItemMarker, ChartLegendProps } from "./index.ts";

    let {
        ref = $bindable(null),
        position = "top",
        align = "start",
        interactive = true,
        marker = "auto",
        include,
        exclude,
        filter,
        extra,
        class: className,
        children,
        ...rest
    }: ChartLegendProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();

    const filteredSeries = $derived(
        filterLegendSeries(chart.series, { include, exclude, filter }),
    );
    const hasContent = $derived(
        Boolean(children) || filteredSeries.length > 0 || Boolean(extra),
    );

    function resolveSwatchKind(
        seriesItem: ChartSeries<TDatum>,
        requested: ChartLegendMarker,
    ): ChartLegendItemMarker {
        if (requested !== "auto") return requested;
        if (seriesItem.dashed) return "dashed";
        if (seriesItem.type === "bar") return "bar";
        if (seriesItem.type === "line" || seriesItem.type === "area") return "line";
        return "line";
    }

    function handleToggle(seriesId: string): void {
        if (!interactive) return;
        chart.toggleSeries(seriesId);
        if (chart.isSeriesHidden(seriesId) && chart.hoveredSeriesId === seriesId) {
            chart.setHoveredSeries(null);
        }
    }

    function handleHighlightStart(seriesId: string, isHidden: boolean): void {
        if (!interactive || isHidden) return;
        chart.setHoveredSeries(seriesId);
    }

    function handleHighlightEnd(seriesId: string): void {
        if (!interactive) return;
        if (chart.hoveredSeriesId === seriesId) {
            chart.setHoveredSeries(null);
        }
    }
</script>

{#if hasContent}
    <div
        bind:this={ref}
        {...rest}
        class={["cs-chart-legend", className]}
        role={rest.role ?? "list"}
        data-position={position}
        data-align={align}
    >
        {#if children}
            {@render children()}
        {:else}
            {#each filteredSeries as item (item.id)}
                {let isHidden = $derived(chart.isSeriesHidden(item.id))}
                {let isActive = $derived(interactive && chart.hoveredSeriesId === item.id)}
                {let color = $derived(chart.getSeriesColor(item.id))}
                {let swatchKind = $derived(resolveSwatchKind(item, marker))}
                {let pattern = $derived(chart.resolveSeriesPattern(item.id))}

                <ChartLegendItem
                    label={item.label}
                    {color}
                    marker={swatchKind}
                    {pattern}
                    {interactive}
                    pressed={!isHidden}
                    highlighted={isActive}
                    onclick={() => handleToggle(item.id)}
                    onpointerenter={() => handleHighlightStart(item.id, isHidden)}
                    onpointerleave={() => handleHighlightEnd(item.id)}
                    onfocus={() => handleHighlightStart(item.id, isHidden)}
                    onblur={() => handleHighlightEnd(item.id)}
                />
            {/each}
        {/if}
        {@render extra?.()}
    </div>
{/if}
