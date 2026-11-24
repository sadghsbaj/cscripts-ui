<script lang="ts" generics="TDatum = ChartDatum">
    import Chart from "./Chart.svelte";
    import ChartActions from "./ChartActions.svelte";
    import ChartAnnotation from "./ChartAnnotation.svelte";
    import ChartAxis from "./ChartAxis.svelte";
    import ChartBar from "./ChartBar.svelte";
    import ChartCanvas from "./ChartCanvas.svelte";
    import ChartCrosshair from "./ChartCrosshair.svelte";
    import ChartDescription from "./ChartDescription.svelte";
    import ChartEmpty from "./ChartEmpty.svelte";
    import ChartGrid from "./ChartGrid.svelte";
    import ChartHeader from "./ChartHeader.svelte";
    import ChartLegend from "./ChartLegend.svelte";
    import ChartLoading from "./ChartLoading.svelte";
    import ChartReferenceBand from "./ChartReferenceBand.svelte";
    import ChartReferenceLine from "./ChartReferenceLine.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import ChartTooltip from "./ChartTooltip.svelte";
    import { partitionSeriesIntoStackSlots } from "./chart-geometry.internal.ts";
    import { resolveLegendConfig } from "./chart-legend.internal.ts";
    import { ChartState, type ChartAxisConfig, type ChartDatum, type ChartMargins } from "./chart-state.svelte.ts";
    import type { BarChartProps } from "./index.ts";

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        x,
        xScaleType,
        series,
        orientation = "vertical",
        mode = "grouped",
        radius,
        maxBarWidth,
        barGap,
        minBarLength = 2,
        segmentGap = 1.5,
        valueLabels = "none",
        insideLabelOrientation = "auto",
        formatLabel,
        labelLayout = "gutter",
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
    }: BarChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    const isHorizontal = $derived(orientation === "horizontal");
    const isAboveLayout = $derived(isHorizontal && labelLayout === "above");
    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ?? (title !== undefined && label === undefined ? titleId : undefined),
    );
    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const isEmptyState = $derived(empty ?? (chartState.isEmpty || chartState.allSeriesHidden));
    const legendConfig = $derived(resolveLegendConfig(legend));
    const showLegend = $derived(
        legendConfig.position !== "none" &&
            (series.length > 0 || legendConfig.extra !== undefined) &&
            !loading &&
            !chartState.isEmpty,
    );
    const showGrid = $derived(grid !== false);
    const gridHorizontal = $derived(
        typeof grid === "object" ? (grid.horizontal ?? !isHorizontal) : !isHorizontal,
    );
    const gridVertical = $derived(
        typeof grid === "object" ? (grid.vertical ?? isHorizontal) : isHorizontal,
    );
    const isStacked = $derived(mode === "stacked" || mode === "percent");
    const gridZeroLine = $derived(typeof grid === "object" ? (grid.zeroLine ?? true) : true);
    const resolvedShowTotal = $derived(showTotal ?? isStacked);
    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const showTooltip = $derived(
        interactive && tooltip !== false && tooltipMode !== "none" && !loading && !isEmptyState,
    );

    const effectiveXAxis = $derived<ChartAxisConfig>(
        isAboveLayout ? { ...xAxis, show: false } : (xAxis ?? {}),
    );

    const resolvedMargin = $derived.by((): Partial<ChartMargins> => {
        const baseMargin = margin ?? {};
        const normalizedLabels =
            valueLabels === true ? "outside" : valueLabels === false ? "none" : valueLabels;
        const hasOutsideLabels = normalizedLabels === "outside" || normalizedLabels === "both";
        if (!hasOutsideLabels) return baseMargin;
        if (!isHorizontal) {
            if (baseMargin.top !== undefined) return baseMargin;
            return { ...baseMargin, top: 24 };
        }
        const visibleBarSeries = chartState.visibleSeries.filter(
            (item) => item.type === undefined || item.type === "bar",
        );
        const effectiveSeries = visibleBarSeries.length > 0 ? visibleBarSeries : series;
        const stackSlots = partitionSeriesIntoStackSlots(effectiveSeries, isStacked);
        const isSingleColumnSlot = stackSlots.length <= 1;
        const isSingleStackedSlot =
            isSingleColumnSlot &&
            (isStacked || (stackSlots[0]?.series.length ?? 0) > 1);
        const usesAboveHeaderValue =
            isAboveLayout &&
            ((normalizedLabels === "outside" && isSingleColumnSlot) ||
                (normalizedLabels === "both" && isSingleStackedSlot));
        if (!usesAboveHeaderValue) {
            if (baseMargin.right !== undefined) return baseMargin;
            return { ...baseMargin, right: 44 };
        }
        return baseMargin;
    });
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
            {orientation}
            margin={resolvedMargin}
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

            {#if interactive}
                <ChartCrosshair vertical={false} horizontal={false} band={true} showDots={false} />
            {/if}

            <ChartBar
                {mode}
                {radius}
                {maxBarWidth}
                {barGap}
                {minBarLength}
                {segmentGap}
                {valueLabels}
                {insideLabelOrientation}
                {formatLabel}
                {labelLayout}
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
            {#if !isAboveLayout}
                <ChartAxis position="left" />
            {/if}
            {#if chartState.hasY2Axis && !isHorizontal}
                <ChartAxis position="right" />
            {/if}

            {@render children?.()}
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
    preferBandX={true}
    {series}
    xAxis={effectiveXAxis}
    {yAxis}
    {y2Axis}
    {orientation}
    stacked={isStacked}
    percent={mode === "percent"}
    {selectable}
    margin={resolvedMargin}
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

    {#if showLegend && legendConfig.position === "top"}
        <ChartLegend
            position="top"
            align={legendConfig.align}
            interactive={legendConfig.interactive ?? interactive}
            marker={legendConfig.marker ?? "bar"}
            include={legendConfig.include}
            exclude={legendConfig.exclude}
            filter={legendConfig.filter}
            extra={legendConfig.extra}
        />
    {/if}

    {#if showLegend && legendConfig.position === "end"}
        <div class="cs-chart-body">
            {@render plotStage()}
            <ChartLegend
                position="end"
                align={legendConfig.align}
                interactive={legendConfig.interactive ?? interactive}
                marker={legendConfig.marker ?? "bar"}
                include={legendConfig.include}
                exclude={legendConfig.exclude}
                filter={legendConfig.filter}
                extra={legendConfig.extra}
            />
        </div>
    {:else}
        {@render plotStage()}
    {/if}

    {#if showLegend && legendConfig.position === "bottom"}
        <ChartLegend
            position="bottom"
            align={legendConfig.align}
            interactive={legendConfig.interactive ?? interactive}
            marker={legendConfig.marker ?? "bar"}
            include={legendConfig.include}
            exclude={legendConfig.exclude}
            filter={legendConfig.filter}
            extra={legendConfig.extra}
        />
    {/if}

    {#if showTooltip}
        <ChartTooltip showTotal={resolvedShowTotal} children={customTooltip} />
    {/if}
</Chart>
