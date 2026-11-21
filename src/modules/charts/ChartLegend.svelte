<script lang="ts">
    import { HitArea } from "../hit-area/index.ts";
    import type { ChartLegendMarker, ChartSeries } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartLegendProps } from "./index.ts";

    type ResolvedSwatchKind = Exclude<ChartLegendMarker, "auto">;

    let {
        ref = $bindable(null),
        position = "top",
        align = "start",
        interactive = true,
        marker = "auto",
        class: className,
        children,
        ...rest
    }: ChartLegendProps = $props();

    const chart = getChartContext();

    function resolveSwatchKind(
        seriesItem: ChartSeries,
        requested: ChartLegendMarker,
    ): ResolvedSwatchKind {
        if (requested !== "auto") return requested;
        if (seriesItem.dashed) return "dashed";
        if (seriesItem.type === "bar") return "bar";
        if (seriesItem.type === "line" || seriesItem.type === "area") return "line";
        return "line";
    }

    function handleToggle(seriesId: string): void {
        chart.toggleSeries(seriesId);
        if (chart.isSeriesHidden(seriesId) && chart.hoveredSeriesId === seriesId) {
            chart.setHoveredSeries(null);
        }
    }

    function handleHighlightStart(seriesId: string, isHidden: boolean): void {
        if (isHidden) return;
        chart.setHoveredSeries(seriesId);
    }

    function handleHighlightEnd(seriesId: string): void {
        if (chart.hoveredSeriesId === seriesId) {
            chart.setHoveredSeries(null);
        }
    }
</script>

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
        {#each chart.series as item (item.id)}
            {const isHidden = $derived(chart.isSeriesHidden(item.id))}
            {const isActive = $derived(chart.hoveredSeriesId === item.id)}
            {const color = $derived(chart.getSeriesColor(item.id))}
            {const swatchKind = $derived(resolveSwatchKind(item, marker))}

            <div class="cs-chart-legend-entry" role="listitem">
                {#if interactive}
                    <button
                        class="cs-chart-legend-item"
                        aria-pressed={!isHidden}
                        data-hidden={isHidden ? "" : undefined}
                        data-active={isActive ? "" : undefined}
                        onclick={() => handleToggle(item.id)}
                        onpointerenter={() => handleHighlightStart(item.id, isHidden)}
                        onpointerleave={() => handleHighlightEnd(item.id)}
                        onfocus={() => handleHighlightStart(item.id, isHidden)}
                        onblur={() => handleHighlightEnd(item.id)}
                        type="button"
                    >
                        <HitArea size="sm" />
                        <span
                            class="cs-chart-legend-swatch"
                            data-kind={swatchKind}
                            style:--cs-chart-swatch-color={color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-legend-label">{item.label}</span>
                    </button>
                {:else}
                    <span
                        class="cs-chart-legend-item"
                        data-static=""
                        data-hidden={isHidden ? "" : undefined}
                    >
                        <span
                            class="cs-chart-legend-swatch"
                            data-kind={swatchKind}
                            style:--cs-chart-swatch-color={color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-legend-label">{item.label}</span>
                    </span>
                {/if}
            </div>
        {/each}
    {/if}
</div>
