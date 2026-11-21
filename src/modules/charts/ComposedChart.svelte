<script lang="ts" generics="TDatum = ChartDatum">
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartAnnotation from "./ChartAnnotation.svelte";
    import ChartArea from "./ChartArea.svelte";
    import ChartAxis from "./ChartAxis.svelte";
    import ChartBar from "./ChartBar.svelte";
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
    import type { ComposedChartProps } from "./index.ts";

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
        barMode = "grouped",
        areaMode = "overlay",
        strokeWidth,
        showDots = "active",
        connectNulls = false,
        gradient = true,
        showAreaLine = true,
        barRadius,
        maxBarWidth,
        barGap,
        minBarLength = 2,
        segmentGap = 1.5,
        valueLabels = "none",
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
        selectable = false,
        onPointClick,
        hiddenSeriesIds = $bindable(),
        activeIndex = $bindable(),
        selectedIndex = $bindable(),
        hoveredSeriesId = $bindable(),
        label,
        labelledBy,
        children,
        overlay,
        ...rest
    }: ComposedChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    const areaSeriesIds = $derived(
        series.filter((item) => item.type === "area").map((item) => item.id),
    );
    const barSeriesIds = $derived(
        series.filter((item) => item.type === "bar").map((item) => item.id),
    );
    const lineSeriesIds = $derived(
        series
            .filter((item) => item.type === undefined || item.type === "line")
            .map((item) => item.id),
    );

    const hasBarSeries = $derived(barSeriesIds.length > 0);
    const hasVisibleAreaSeries = $derived(
        chartState.visibleSeries.some((item) => item.type === "area"),
    );
    const hasVisibleBarSeries = $derived(
        chartState.visibleSeries.some((item) => item.type === "bar"),
    );
    const hasVisibleLineSeries = $derived(
        chartState.visibleSeries.some((item) => item.type === undefined || item.type === "line"),
    );

    $effect.pre(() => {
        chartState.stackedBar = barMode === "stacked" || barMode === "percent";
        chartState.stackedArea = areaMode === "stacked" || areaMode === "percent";
        chartState.percentBar = barMode === "percent";
        chartState.percentArea = areaMode === "percent";
        return () => {
            chartState.stackedBar = null;
            chartState.stackedArea = null;
            chartState.percentBar = null;
            chartState.percentArea = null;
        };
    });

    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ?? (title !== undefined && label === undefined ? titleId : undefined),
    );
    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const isEmptyState = $derived(empty ?? (chartState.isEmpty || chartState.allSeriesHidden));
    const showLegend = $derived(
        legend !== "none" && series.length > 0 && !loading && !chartState.isEmpty,
    );
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
            shape="bars"
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

            {#if hasVisibleAreaSeries}
                <ChartArea
                    part="fill"
                    seriesIds={areaSeriesIds}
                    mode={areaMode}
                    {curve}
                    {gradient}
                    showLine={showAreaLine}
                    {strokeWidth}
                    {connectNulls}
                    {showDots}
                />
            {/if}

            {#if hasVisibleBarSeries}
                <ChartBar
                    seriesIds={barSeriesIds}
                    mode={barMode}
                    radius={barRadius}
                    {maxBarWidth}
                    {barGap}
                    {minBarLength}
                    {segmentGap}
                    {valueLabels}
                />
            {/if}

            {#if hasVisibleAreaSeries && (showAreaLine || showDots === true)}
                <ChartArea
                    part="line"
                    seriesIds={areaSeriesIds}
                    mode={areaMode}
                    {curve}
                    {gradient}
                    showLine={showAreaLine}
                    {strokeWidth}
                    {connectNulls}
                    {showDots}
                />
            {/if}

            {#if hasVisibleLineSeries}
                <ChartLine
                    seriesIds={lineSeriesIds}
                    {curve}
                    {strokeWidth}
                    {showDots}
                    {connectNulls}
                />
            {/if}

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

            {@render children?.()}

            <ChartAxis position="bottom" />
            <ChartAxis position="left" />
            {#if chartState.hasY2Axis}
                <ChartAxis position="right" />
            {/if}

            {#if interactive}
                <ChartCrosshair
                    band={hasVisibleBarSeries}
                    showDots={showDots !== false && (hasVisibleLineSeries || hasVisibleAreaSeries)}
                />
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
    preferBandX={hasBarSeries}
    {series}
    {xAxis}
    {yAxis}
    {y2Axis}
    stacked={false}
    {selectable}
    {margin}
    bind:hiddenSeriesIds
    bind:activeIndex
    bind:selectedIndex
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
        <ChartLegend position="top" marker="auto" {interactive} />
    {/if}

    {#if showLegend && legend === "end"}
        <div class="cs-chart-body">
            {@render plotStage()}
            <ChartLegend position="end" marker="auto" {interactive} />
        </div>
    {:else}
        {@render plotStage()}
    {/if}

    {#if showLegend && legend === "bottom"}
        <ChartLegend position="bottom" marker="auto" {interactive} />
    {/if}

    {#if showTooltip}
        <ChartTooltip {showTotal} children={customTooltip} />
    {/if}
</Chart>
