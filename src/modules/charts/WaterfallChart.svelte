<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import {
        NumberMorph,
        type NumberMorphFormat,
        type NumberMorphProps,
    } from "../number-morph/index.ts";
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
    import ChartLoading from "./ChartLoading.svelte";
    import ChartReferenceBand from "./ChartReferenceBand.svelte";
    import ChartReferenceLine from "./ChartReferenceLine.svelte";
    import ChartTitle from "./ChartTitle.svelte";
    import ChartTooltip from "./ChartTooltip.svelte";
    import ChartWaterfall from "./ChartWaterfall.svelte";
    import { computeWaterfallSteps, type WaterfallBarInput } from "./chart-geometry.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import {
        CHART_BAR_PATTERNS,
        CHART_TONES,
        CHART_WATERFALL_ROW_TYPES,
        ChartState,
        resolveToneColor,
        type ChartBarPattern,
        type ChartDatum,
        type ChartMargins,
        type ChartTone,
        type ChartWaterfallRowType,
        type ChartXValue,
    } from "./chart-state.svelte.ts";
    import type {
        ChartWaterfallItem,
        ChartWaterfallTooltipContext,
        WaterfallChartProps,
    } from "./index.ts";

    type MorphTiming = NonNullable<NumberMorphProps["transformTiming"]>;

    const TOOLTIP_MORPH_TIMING: MorphTiming = {
        duration: 160,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    };

    const TOOLTIP_OPACITY_TIMING: MorphTiming = {
        duration: 100,
        easing: "cubic-bezier(0.5, 1, 0.89, 1)",
    };

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        variant,
        size,
        data,
        x,
        xScaleType,
        value,
        type,
        color,
        tone,
        pattern,
        connectors = true,
        valueLabels = true,
        formatLabel,
        radius,
        maxBarWidth,
        minBarLength = 2,
        totalTone = "base",
        referenceLines,
        referenceBands,
        annotations,
        grid = true,
        xAxis,
        yAxis,
        legend = "top",
        tooltip = true,
        tooltipMode = "axis",
        numberFormat,
        locales,
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
        activeIndex = $bindable(),
        selectedIndex = $bindable(),
        label,
        labelledBy,
        children,
        overlay,
        ...rest
    }: WaterfallChartProps<TDatum> = $props();

    const chartState = new ChartState<TDatum>();
    const uid = $props.id();
    const titleId = `cs-chart-title-${uid}`;

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractXValue(datum: TDatum, index: number): ChartXValue {
        if (typeof x === "function") return x(datum, index);
        const raw = readKey(datum, x);
        if (raw instanceof Date || typeof raw === "string" || typeof raw === "number") {
            return raw;
        }
        return index;
    }

    function extractValue(datum: TDatum, index: number): number | null {
        const raw = typeof value === "function" ? value(datum, index) : readKey(datum, value);
        if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
            return null;
        }
        const numeric = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    function extractRowType(datum: TDatum, index: number): ChartWaterfallRowType {
        if (type === undefined) return "delta";
        const raw = typeof type === "function" ? type(datum, index) : readKey(datum, type);
        if (
            typeof raw === "string" &&
            (CHART_WATERFALL_ROW_TYPES as readonly string[]).includes(raw)
        ) {
            return raw as ChartWaterfallRowType;
        }
        return "delta";
    }

    function extractColor(datum: TDatum, index: number): string | undefined {
        if (color === undefined) return undefined;
        const raw = typeof color === "function" ? color(datum, index) : readKey(datum, color);
        return typeof raw === "string" && raw.length > 0 ? raw : undefined;
    }

    function extractTone(datum: TDatum, index: number): ChartTone | undefined {
        if (tone === undefined) return undefined;
        const raw = typeof tone === "function" ? tone(datum, index) : readKey(datum, tone);
        if (typeof raw === "string" && (CHART_TONES as readonly string[]).includes(raw)) {
            return raw as ChartTone;
        }
        return undefined;
    }

    function extractPattern(datum: TDatum, index: number): ChartBarPattern {
        if (pattern === undefined) return "solid";
        const raw = typeof pattern === "function" ? pattern(datum, index) : pattern;
        if (
            typeof raw === "string" &&
            (CHART_BAR_PATTERNS as readonly string[]).includes(raw)
        ) {
            return raw as ChartBarPattern;
        }
        return "solid";
    }

    const totalColor = $derived(
        totalTone === "accent"
            ? "var(--cs-chart-series-1)"
            : "var(--cs-chart-waterfall-total)",
    );

    function resolveItemColor(
        rowType: ChartWaterfallRowType,
        itemValue: number,
        datum: TDatum,
        index: number,
    ): string {
        const explicitColor = extractColor(datum, index);
        if (explicitColor !== undefined) return explicitColor;
        const explicitTone = extractTone(datum, index);
        if (explicitTone !== undefined) return resolveToneColor(explicitTone);
        if (rowType !== "delta") {
            return totalColor;
        }
        return itemValue < 0 ? "var(--cs-chart-negative)" : "var(--cs-chart-positive)";
    }

    function formatRoleLabel(rowType: ChartWaterfallRowType): string {
        switch (rowType) {
            case "start": {
                return t({ de: "Start", en: "Start" });
            }
            case "subtotal": {
                return t({ de: "Zwischensumme", en: "Subtotal" });
            }
            case "total": {
                return t({ de: "Gesamt", en: "Total" });
            }
            case "delta": {
                return t({ de: "Veränderung", en: "Change" });
            }
        }
    }

    const waterfallInputs = $derived.by((): readonly WaterfallBarInput[] => {
        const xFmt = xAxis?.format;
        return data.map((datum, index) => {
            const xVal = extractXValue(datum, index);
            return {
                index,
                label: xFmt ? xFmt(xVal) : formatDefaultTick(xVal),
                value: extractValue(datum, index),
                type: extractRowType(datum, index),
            };
        });
    });

    const stepSummary = $derived(computeWaterfallSteps(waterfallInputs));

    const waterfallItems = $derived.by((): readonly ChartWaterfallItem<TDatum>[] => {
        const items: ChartWaterfallItem<TDatum>[] = [];
        for (const step of stepSummary.steps) {
            const datum = data[step.index];
            if (datum === undefined) continue;
            items.push({
                index: step.index,
                label: step.label,
                xValue: extractXValue(datum, step.index),
                type: step.type,
                kind: step.kind,
                value: step.value,
                y0: step.y0,
                y1: step.y1,
                runningTotal: step.runningTotal,
                isPositive: step.isPositive,
                isNegative: step.isNegative,
                color: resolveItemColor(step.type, step.value, datum, step.index),
                pattern: extractPattern(datum, step.index),
                datum,
            });
        }
        return items;
    });

    function formatNumericValue(num: number, signed: boolean, item?: ChartWaterfallItem<TDatum>): string {
        if (formatLabel && item) return formatLabel(num, item);
        if (yAxis?.format) {
            const formatted = yAxis.format(num);
            if (signed && num > 0 && !formatted.startsWith("+") && !formatted.startsWith("-")) {
                return `+${formatted}`;
            }
            return formatted;
        }
        if (numberFormat !== undefined || locales !== undefined) {
            try {
                const resolvedFormat: NumberMorphFormat = signed
                    ? { ...numberFormat, signDisplay: numberFormat?.signDisplay ?? "exceptZero" }
                    : (numberFormat ?? {});
                return new Intl.NumberFormat(locales, resolvedFormat).format(num);
            } catch {
                // Fall back to default formatting when Intl options are partial.
            }
        }
        const fallback = formatDefaultTick(num);
        if (signed && num > 0 && !fallback.startsWith("+") && !fallback.startsWith("-")) {
            return `+${fallback}`;
        }
        return fallback;
    }

    function buildTooltipContext(index: number): ChartWaterfallTooltipContext<TDatum> | null {
        const item = waterfallItems[index];
        if (!item) return null;
        const isDelta = item.type === "delta";
        return {
            index,
            item,
            bar: item,
            formattedValue: formatNumericValue(item.value, isDelta, item),
            formattedRunningTotal: formatNumericValue(item.runningTotal, false),
        };
    }

    $effect.pre(() => {
        const extent = stepSummary.extent;
        const current = untrack(() => chartState.externalYExtent);
        if (current === null || current[0] !== extent[0] || current[1] !== extent[1]) {
            chartState.externalYExtent = extent;
        }
    });

    $effect.pre(() => {
        chartState.liveAnnouncementFormatter = (index: number): string => {
            const ctx = buildTooltipContext(index);
            if (!ctx) return "";
            const roleLabel = formatRoleLabel(ctx.item.type);
            const totalWord = t({ de: "Summe", en: "total" });
            return `${ctx.item.label}, ${roleLabel}: ${ctx.formattedValue}, ${totalWord} ${ctx.formattedRunningTotal}`;
        };
        return () => {
            chartState.liveAnnouncementFormatter = null;
        };
    });

    const hasHeader = $derived(
        title !== undefined || description !== undefined || actions !== undefined,
    );
    const resolvedLabelledBy = $derived(
        labelledBy ?? (title !== undefined && label === undefined ? titleId : undefined),
    );
    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const isEmptyState = $derived(empty ?? data.length === 0);
    const showLegend = $derived(legend !== "none" && !loading && !isEmptyState);
    const showGrid = $derived(grid !== false);
    const gridHorizontal = $derived(typeof grid === "object" ? (grid.horizontal ?? true) : true);
    const gridVertical = $derived(typeof grid === "object" ? (grid.vertical ?? false) : false);
    const gridZeroLine = $derived(
        typeof grid === "object"
            ? (grid.zeroLine ?? (stepSummary.crossesZero ? "strong" : true))
            : stepSummary.crossesZero
              ? "strong"
              : true,
    );
    const customTooltip = $derived(typeof tooltip === "function" ? tooltip : undefined);
    const showTooltip = $derived(
        interactive && tooltip !== false && tooltipMode !== "none" && !loading && !isEmptyState,
    );
    const hasCustomFormatter = $derived(Boolean(formatLabel ?? yAxis?.format));
    const deltaNumberFormat = $derived<NumberMorphFormat>({
        ...numberFormat,
        signDisplay: numberFormat?.signDisplay ?? "exceptZero",
    });

    const hasNegativeBars = $derived(
        stepSummary.steps.some((step) => step.isNegative || step.y1 < step.y0),
    );

    const resolvedMargin = $derived.by((): Partial<ChartMargins> => {
        const baseMargin = margin ?? {};
        if (!valueLabels) return baseMargin;

        const next: Partial<ChartMargins> = { ...baseMargin };
        if (next.top === undefined) {
            next.top = 24;
        }
        if (hasNegativeBars && xAxis?.show === false && next.bottom === undefined) {
            next.bottom = 24;
        }
        return next;
    });

    const legendItems = $derived([
        {
            id: "increase",
            label: t({ de: "Zunahme", en: "Increase" }),
            color: "var(--cs-chart-positive)",
        },
        {
            id: "decrease",
            label: t({ de: "Abnahme", en: "Decrease" }),
            color: "var(--cs-chart-negative)",
        },
        {
            id: "total",
            label: t({ de: "Summe", en: "Total" }),
            color: totalColor,
        },
    ] as const);
</script>

{#snippet waterfallLegend(position: "top" | "bottom" | "end")}
    <ChartLegend {position} interactive={false} marker="bar">
        {#each legendItems as entry (entry.id)}
            <div class="cs-chart-legend-entry" role="listitem">
                <span class="cs-chart-legend-item" data-static="">
                    <span
                        class="cs-chart-legend-swatch"
                        data-kind="bar"
                        style:--cs-chart-swatch-color={entry.color}
                        aria-hidden="true"
                    ></span>
                    <span class="cs-chart-legend-label">{entry.label}</span>
                </span>
            </div>
        {/each}
    </ChartLegend>
{/snippet}

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

            <ChartWaterfall
                {value}
                {type}
                {color}
                {tone}
                {pattern}
                {connectors}
                {valueLabels}
                {formatLabel}
                {radius}
                {maxBarWidth}
                {minBarLength}
                {totalTone}
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
    {xAxis}
    {yAxis}
    {selectable}
    margin={resolvedMargin}
    bind:activeIndex
    bind:selectedIndex
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
        {@render waterfallLegend("top")}
    {/if}

    {#if showLegend && legend === "end"}
        <div class="cs-chart-body">
            {@render plotStage()}
            {@render waterfallLegend("end")}
        </div>
    {:else}
        {@render plotStage()}
    {/if}

    {#if showLegend && legend === "bottom"}
        {@render waterfallLegend("bottom")}
    {/if}

    {#if showTooltip}
        <ChartTooltip {numberFormat} {locales}>
            {#snippet children(ctx)}
                {let wfCtx = $derived(buildTooltipContext(ctx.index))}
                {#if wfCtx}
                    {#if customTooltip}
                        {@render customTooltip(wfCtx)}
                    {:else}
                        <div class="cs-chart-tooltip-header">{wfCtx.item.label}</div>
                        <div class="cs-chart-tooltip-list">
                            <span
                                class="cs-chart-tooltip-swatch"
                                data-pattern={wfCtx.item.pattern !== "solid"
                                    ? wfCtx.item.pattern
                                    : undefined}
                                style:--cs-chart-swatch-color={wfCtx.item.color}
                                aria-hidden="true"
                            ></span>
                            <span class="cs-chart-tooltip-label">
                                {formatRoleLabel(wfCtx.item.type)}
                            </span>
                            <span class="cs-chart-tooltip-value">
                                {#if !hasCustomFormatter}
                                    <NumberMorph
                                        value={wfCtx.item.value}
                                        format={wfCtx.item.type === "delta"
                                            ? deltaNumberFormat
                                            : numberFormat}
                                        {locales}
                                        willChange={false}
                                        respectMotionPreference={true}
                                        transformTiming={TOOLTIP_MORPH_TIMING}
                                        spinTiming={TOOLTIP_MORPH_TIMING}
                                        opacityTiming={TOOLTIP_OPACITY_TIMING}
                                    />
                                {:else}
                                    {wfCtx.formattedValue}
                                {/if}
                            </span>
                        </div>
                        {#if wfCtx.item.type === "delta"}
                            <div class="cs-chart-tooltip-total">
                                <span class="cs-chart-tooltip-total-label">
                                    {t({ de: "Laufend", en: "Running total" })}
                                </span>
                                <span class="cs-chart-tooltip-total-value">
                                    {#if !hasCustomFormatter}
                                        <NumberMorph
                                            value={wfCtx.item.runningTotal}
                                            format={numberFormat}
                                            {locales}
                                            willChange={false}
                                            respectMotionPreference={true}
                                            transformTiming={TOOLTIP_MORPH_TIMING}
                                            spinTiming={TOOLTIP_MORPH_TIMING}
                                            opacityTiming={TOOLTIP_OPACITY_TIMING}
                                        />
                                    {:else}
                                        {wfCtx.formattedRunningTotal}
                                    {/if}
                                </span>
                            </div>
                        {/if}
                    {/if}
                {/if}
            {/snippet}
        </ChartTooltip>
    {/if}
</Chart>
