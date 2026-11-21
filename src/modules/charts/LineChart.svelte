<script lang="ts" generics="TDatum = ChartDatum">
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartAnnotation from "./ChartAnnotation.svelte";
    import ChartAxis from "./ChartAxis.svelte";
    import ChartCanvas from "./ChartCanvas.svelte";
    import ChartCrosshair from "./ChartCrosshair.svelte";
    import ChartDescription from "./ChartDescription.svelte";
    import ChartEmpty from "./ChartEmpty.svelte";
    import ChartGrid from "./ChartGrid.svelte";
    import ChartHeader from "./ChartHeader.svelte";
    import ChartLegend from "./ChartLegend.svelte";
    import ChartLine from "./ChartLine.svelte";
    import ChartLoading from "./ChartLoading.svelte";
    import ChartReferenceBand from "./ChartReferenceBand.svelte";
    import ChartReferenceLine from "./ChartReferenceLine.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import ChartTooltip from "./ChartTooltip.svelte";
    import { ChartState, type ChartDatum } from "./chart-state.svelte.ts";
    import type { LineChartProps } from "./index.ts";

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        x,
        xScaleType,
        series,
        curve = "monotone",
        strokeWidth,
        showDots = "active",
        connectNulls = false,
        showLabels = false,
        formatLabel,
        referenceLines,
        referenceBands,
        annotations,
        grid = true,
        xAxis,
        yAxis,
        y2Axis,
        legend = "top",
        tooltip = true,
        tooltipMode = "axis",
        showTotal = false,
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
    }: LineChartProps<TDatum> = $props();

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
    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const showTooltip = $derived(
        interactive && tooltip !== false && tooltipMode !== "none" && !loading && !isEmptyState,
    );
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

            {#if referenceBands}
                {#each referenceBands as band, index (band.id ?? `band-${index}`)}
                    <ChartReferenceBand
                        part="fill"
                        axis={band.axis}
                        from={band.from}
                        to={band.to}
                        label={band.label}
                        tone={band.tone}
                        color={band.color}
                    />
                {/each}
            {/if}

            <ChartLine
                {curve}
                {strokeWidth}
                {showDots}
                {connectNulls}
                {showLabels}
                {formatLabel}
            />

            {#if referenceLines}
                {#each referenceLines as line, index (line.id ?? `ref-${index}`)}
                    <ChartReferenceLine
                        axis={line.axis}
                        value={line.value}
                        label={line.label}
                        labelPosition={line.labelPosition}
                        tone={line.tone}
                        color={line.color}
                        dashed={line.dashed}
                    />
                {/each}
            {/if}

            {#if referenceBands}
                {#each referenceBands as band, index (band.id ?? `band-label-${index}`)}
                    <ChartReferenceBand
                        part="label"
                        axis={band.axis}
                        from={band.from}
                        to={band.to}
                        label={band.label}
                        tone={band.tone}
                        color={band.color}
                    />
                {/each}
            {/if}

            {#if annotations}
                {#each annotations as annotation, index (annotation.id ?? `ann-${index}`)}
                    <ChartAnnotation
                        x={annotation.x}
                        y={annotation.y}
                        yAxis={annotation.yAxis}
                        dx={annotation.dx}
                        dy={annotation.dy}
                        label={annotation.label}
                        tone={annotation.tone}
                        color={annotation.color}
                    />
                {/each}
            {/if}

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
    {margin}
    bind:hiddenSeriesIds
    bind:activeIndex
    bind:hoveredSeriesId
    {tooltipMode}
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
        <ChartTooltip {showTotal} children={customTooltip} />
    {/if}
</Chart>
