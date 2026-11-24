<script lang="ts">
    import type { Snippet } from "svelte";

    import {
        Chart,
        ChartCanvas,
        ChartLegend,
        ChartLegendItem,
        type ChartDatum,
        type ChartLegendMarker,
        type ChartLegendPlacement,
        type ChartSeries,
    } from "./index.ts";

    interface Props {
        data: readonly ChartDatum[];
        x?: string;
        series: readonly ChartSeries<ChartDatum>[];
        position?: ChartLegendPlacement;
        align?: "start" | "center" | "end";
        interactive?: boolean;
        marker?: ChartLegendMarker;
        include?: readonly string[];
        exclude?: readonly string[];
        filter?: (series: ChartSeries<ChartDatum>) => boolean;
        customChildLabel?: string;
        extraText?: string;
    }

    let {
        data,
        x = "month",
        series,
        position = "top",
        align = "start",
        interactive = true,
        marker = "auto",
        include,
        exclude,
        filter,
        customChildLabel,
        extraText,
    }: Props = $props();
</script>

{#snippet extraSnippet()}
    <span class="cs-test-legend-extra">{extraText}</span>
{/snippet}

{#snippet customChildren()}
    <ChartLegendItem label={customChildLabel ?? ""} interactive={false} />
{/snippet}

<Chart variant="soft" size="md" {data} {x} {series}>
    <ChartLegend
        {position}
        {align}
        {interactive}
        {marker}
        {include}
        {exclude}
        {filter}
        extra={extraText !== undefined ? extraSnippet : undefined}
        children={customChildLabel !== undefined ? (customChildren as Snippet) : undefined}
    />
    <ChartCanvas />
</Chart>
