<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import "./charts.css";

    import { createSurfaceRadius } from "../../shared/surface-radius/index.ts";
    import { ChartState, type ChartDatum } from "./chart-state.svelte.ts";
    import { setChartContext } from "./chart.context.ts";
    import type { ChartProps } from "./index.ts";

    let {
        ref = $bindable(null),
        variant,
        size,
        palette = "categorical",
        monotone,
        state: externalState,
        data,
        x,
        xScaleType,
        preferBandX,
        series,
        xAxis,
        yAxis,
        y2Axis,
        orientation,
        stacked,
        margin,
        hiddenSeriesIds = $bindable(),
        activeIndex = $bindable(),
        hoveredSeriesId = $bindable(),
        tooltipMode,
        loading = false,
        empty,
        label,
        labelledBy,
        class: className,
        children,
        ...rest
    }: ChartProps<TDatum> = $props();

    const surfaceRadius = createSurfaceRadius(() => size);
    const chartState = untrack(() => externalState ?? new ChartState<TDatum>());

    setChartContext<TDatum>(chartState);

    $effect.pre(() => {
        chartState.variant = variant;
        chartState.size = size;
        chartState.palette = palette;
        chartState.monotone = monotone;

        if (data !== undefined) chartState.data = data;
        if (x !== undefined) chartState.xAccessor = x;
        if (xScaleType !== undefined) chartState.xScaleType = xScaleType;
        if (preferBandX !== undefined) chartState.preferBandX = preferBandX;
        if (series !== undefined) chartState.series = series;
        if (xAxis !== undefined) chartState.xAxis = xAxis;
        if (yAxis !== undefined) chartState.yAxis = yAxis;
        if (y2Axis !== undefined) chartState.y2Axis = y2Axis;
        if (orientation !== undefined) chartState.orientation = orientation;
        if (stacked !== undefined) chartState.stacked = stacked;
        if (margin !== undefined) chartState.marginOverrides = margin;
        if (tooltipMode !== undefined) chartState.tooltipMode = tooltipMode;
    });

    $effect.pre(() => {
        const next = hiddenSeriesIds;
        if (next !== undefined && next !== untrack(() => chartState.hiddenSeriesIds)) {
            chartState.hiddenSeriesIds = next;
        }
    });

    let lastHiddenState: readonly string[] | undefined;
    $effect(() => {
        const current = chartState.hiddenSeriesIds;
        const prev = lastHiddenState;
        lastHiddenState = current;
        if (prev === undefined || prev === current) return;
        const propValue = untrack(() => hiddenSeriesIds);
        if (propValue !== undefined && propValue !== current) {
            hiddenSeriesIds = current;
        }
    });

    $effect.pre(() => {
        const next = activeIndex;
        if (next !== undefined && next !== untrack(() => chartState.activeIndex)) {
            chartState.setActiveIndex(next);
        }
    });

    let lastActiveIndexState: number | null | undefined;
    $effect(() => {
        const current = chartState.activeIndex;
        const prev = lastActiveIndexState;
        lastActiveIndexState = current;
        if (prev === undefined || prev === current) return;
        const propValue = untrack(() => activeIndex);
        if (propValue !== undefined && propValue !== current) {
            activeIndex = current;
        }
    });

    $effect.pre(() => {
        const next = hoveredSeriesId;
        if (next !== undefined && next !== untrack(() => chartState.hoveredSeriesId)) {
            chartState.setHoveredSeries(next);
        }
    });

    let lastHoveredSeriesState: string | null | undefined;
    $effect(() => {
        const current = chartState.hoveredSeriesId;
        const prev = lastHoveredSeriesState;
        lastHoveredSeriesState = current;
        if (prev === undefined || prev === current) return;
        const propValue = untrack(() => hoveredSeriesId);
        if (propValue !== undefined && propValue !== current) {
            hoveredSeriesId = current;
        }
    });

    const isEmptyState = $derived(empty ?? (chartState.isEmpty || chartState.allSeriesHidden));
</script>

<figure
    bind:this={ref}
    {...rest}
    class={["cs-chart", className]}
    data-variant={variant}
    data-size={size}
    data-palette={palette}
    data-monotone={monotone}
    data-nested={surfaceRadius.isNested ? "" : undefined}
    data-loading={loading ? "" : undefined}
    data-empty={isEmptyState ? "" : undefined}
    data-scrubbing={chartState.activeIndex !== null ? "" : undefined}
    style:--cs-chart-nested-radius={surfaceRadius.nestedRadius}
    aria-label={label ?? rest["aria-label"]}
    aria-labelledby={labelledBy ?? rest["aria-labelledby"]}
    aria-busy={loading ? "true" : rest["aria-busy"]}
>
    {@render children?.()}
</figure>
