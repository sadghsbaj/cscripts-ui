<script lang="ts">
    import { getChartContext } from "./chart.context.ts";
    import type { ChartOverlayProps } from "./index.ts";

    let {
        ref = $bindable(null),
        class: className,
        children,
        ...rest
    }: ChartOverlayProps = $props();

    const chart = getChartContext();
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-overlay", className]}
    style:inset-block-start="{chart.margins.top}px"
    style:inset-inline-start="{chart.margins.left}px"
    style:inline-size="{chart.plotWidth}px"
    style:block-size="{chart.plotHeight}px"
>
    {#if chart.hasSize}
        {@render children?.()}
    {/if}
</div>
