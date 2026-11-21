<script lang="ts" generics="TDatum = ChartDatum">
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartArea from "./ChartArea.svelte";
    import ChartAxis from "./ChartAxis.svelte";
    import ChartCanvas from "./ChartCanvas.svelte";
    import ChartCrosshair from "./ChartCrosshair.svelte";
    import ChartDescription from "./ChartDescription.svelte";
    import ChartEmpty from "./ChartEmpty.svelte";
    import ChartGrid from "./ChartGrid.svelte";
    import ChartHeader from "./ChartHeader.svelte";
    import ChartLegend from "./ChartLegend.svelte";
    import ChartLoading from "./ChartLoading.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import ChartTooltip from "./ChartTooltip.svelte";
    import { ChartState, type ChartDatum } from "./chart-state.svelte.ts";
    import type { AreaChartProps } from "./index.ts";

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        x,
        xScaleType,
        series,
        mode = "overlay",
        curve = "monotone",
        gradient = true,
        showLine = true,
        strokeWidth,
        showDots = "active",
        connectNulls = false,
        grid = true,
        xAxis,
        yAxis,
        y2Axis,
        legend = "top",
        tooltip = true,
        showTotal,
        palette = "categorical",
        monotone,
        title,
        description,
        actions,
        height,
        aspectRatio,
        margin,
        loading = false,
        empty,
        emptyTitle,
        emptyDescription,
        interactive = true,
        onPointClick,
        hiddenSeriesIds = $bindable(),
        activeIndex = $bindable(),
        hoveredSeriesId = $bindable(),
        label,
        labelledBy,
        children,
        overlay,
        ...rest
    }: AreaChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ?? (title !== undefined && label === undefined ? titleId : undefined),
    );
    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const isEmptyState = $derived(empty ?? (chartState.isEmpty || chartState.allSeriesHidden));
    const showLegend = $derived(legend !== "none" && series.length > 0 && !loading && !chartState.isEmpty);
    const showGrid = $derived(grid !== false);
    const gridHorizontal = $derived(typeof grid === "object" ? (grid.horizontal ?? true) : true);
    const gridVertical = $derived(typeof grid === "object" ? (grid.vertical ?? false) : false);
    const gridZeroLine = $derived(typeof grid === "object" ? (grid.zeroLine ?? true) : true);
    const resolvedShowTotal = $derived(showTotal ?? mode === "stacked");
    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const showTooltip = $derived(interactive && tooltip !== false && !loading && !isEmptyState);
</script>

{#snippet plotStage()}
    {#if loading}
        <ChartLoading
            shape="line"
            style={resolvedHeight ? `block-size: ${resolvedHeight}` : undefined}
        />
    {:else if isEmptyState}
        <ChartEmpty
            title={emptyTitle}
            description={emptyDescription}
            style={resolvedHeight ? `min-block-size: ${resolvedHeight}` : undefined}
        />
    {:else}
        <ChartCanvas
            bind:svgRef
            {height}
            {aspectRatio}
            {interactive}
            {margin}
            {label}
            labelledBy={resolvedLabelledBy}
            {onPointClick}
            {overlay}
        >
            {#if showGrid}
                <ChartGrid
                    horizontal={gridHorizontal}
                    vertical={gridVertical}
                    zeroLine={gridZeroLine}
                />
            {/if}

            <ChartArea
                {mode}
                {curve}
                {gradient}
                {showLine}
                {strokeWidth}
                {showDots}
                {connectNulls}
            />

            <ChartAxis position="bottom" />
            <ChartAxis position="left" />
            {#if chartState.hasY2Axis}
                <ChartAxis position="right" />
            {/if}

            {@render children?.()}

            {#if interactive}
                <ChartCrosshair showDots={showDots !== false} />
            {/if}
        </ChartCanvas>
    {/if}
{/snippet}

<Chart
    bind:ref
    state={chartState}
    {variant}
    {size}
    {palette}
    {monotone}
    {data}
    {x}
    {xScaleType}
    preferBandX={false}
    {series}
    {xAxis}
    {yAxis}
    {y2Axis}
    stacked={mode === "stacked"}
    {margin}
    bind:hiddenSeriesIds
    bind:activeIndex
    bind:hoveredSeriesId
    {loading}
    empty={isEmptyState}
    {label}
    labelledBy={resolvedLabelledBy}
    {...rest}
>
    {#if hasHeader}
        <ChartHeader>
            {#if title !== undefined || description !== undefined}
                <div class="cs-chart-header-copy">
                    {#if title !== undefined}
                        <ChartTitle id={titleId}>{title}</ChartTitle>
                    {/if}
                    {#if description !== undefined}
                        <ChartDescription>{description}</ChartDescription>
                    {/if}
                </div>
            {/if}
            {#if actions}
                <ChartActions>
                    {@render actions()}
                </ChartActions>
            {/if}
        </ChartHeader>
    {/if}

    {#if showLegend && legend === "top"}
        <ChartLegend position="top" {interactive} />
    {/if}

    {#if showLegend && legend === "end"}
        <div class="cs-chart-body">
            {@render plotStage()}
            <ChartLegend position="end" {interactive} />
        </div>
    {:else}
        {@render plotStage()}
    {/if}

    {#if showLegend && legend === "bottom"}
        <ChartLegend position="bottom" {interactive} />
    {/if}

    {#if showTooltip}
        <ChartTooltip showTotal={resolvedShowTotal} children={customTooltip} />
    {/if}
</Chart>
