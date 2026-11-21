<script lang="ts" generics="TDatum = ChartDatum">
    import { computePieArcs, snapInt } from "./chart-geometry.internal.ts";
    import {
        CHART_TONES,
        resolveSeriesColor,
        type ChartDatum,
        type ChartTone,
    } from "./chart-state.svelte.ts";
    import { getChartContext, hasChartContext } from "./chart.context.ts";
    import type { ChartArcItem, ChartArcProps, ChartPolarSlice } from "./index.ts";

    const MIN_LABEL_ANGLE_RAD = 0.32;
    const MIN_DONUT_RING_THICKNESS = 20;
    const MIN_PIE_LABEL_RADIUS = 44;

    let {
        ref = $bindable(null),
        slices,
        data,
        value,
        name,
        color,
        tone,
        width,
        height,
        innerRadiusRatio = 0.68,
        gap = 0,
        padAngle,
        cornerRadius,
        hoverExpand = 3,
        sort = false,
        valueLabels = false,
        formatValue,
        interactive = true,
        selectable = false,
        activeIndex,
        selectedIndex,
        hoveredSliceId,
        onSliceHover,
        onSliceClick,
        class: className,
        ...rest
    }: ChartArcProps<TDatum> = $props();

    const chart = hasChartContext() ? getChartContext<TDatum>() : undefined;

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractValue(datum: TDatum, index: number): number {
        if (value === undefined) return 0;
        const raw = typeof value === "function" ? value(datum, index) : readKey(datum, value);
        if (typeof raw === "number" && Number.isFinite(raw)) return raw;
        return 0;
    }

    function extractName(datum: TDatum, index: number): string {
        if (name === undefined) return String(index + 1);
        const raw = typeof name === "function" ? name(datum, index) : readKey(datum, name);
        if (raw === null || raw === undefined) return String(index + 1);
        return String(raw);
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

    const resolvedWidth = $derived.by((): number => {
        if (width !== undefined) return width;
        if (!chart) return 0;
        return chart.plotWidth > 0 ? chart.plotWidth : chart.containerWidth;
    });

    const resolvedHeight = $derived.by((): number => {
        if (height !== undefined) return height;
        if (!chart) return 0;
        return chart.plotHeight > 0 ? chart.plotHeight : chart.containerHeight;
    });

    const cx = $derived(snapInt(resolvedWidth / 2));
    const cy = $derived(snapInt(resolvedHeight / 2));
    const safeHoverExpand = $derived(Math.max(0, hoverExpand));
    const minDimension = $derived(Math.min(resolvedWidth, resolvedHeight));
    const effectiveSelectedIndex = $derived(
        selectedIndex !== undefined ? selectedIndex : (chart?.selectedIndex ?? null),
    );
    const outerMargin = $derived(
        selectable || effectiveSelectedIndex !== null
            ? Math.max(safeHoverExpand + 2, 8)
            : safeHoverExpand + 2,
    );
    const outerRadius = $derived(Math.max(0, Math.floor(minDimension / 2) - outerMargin));
    const clampedRatio = $derived(Math.max(0, Math.min(0.95, innerRadiusRatio)));
    const isFullPie = $derived(clampedRatio <= 0);
    const palette = $derived(chart?.palette ?? "categorical");
    const monotone = $derived(chart?.monotone);

    interface NormalizedSlice {
        readonly id: string;
        readonly label: string;
        readonly value: number;
        readonly color: string;
        readonly datum: TDatum;
    }

    const normalizedSlices = $derived.by((): readonly NormalizedSlice[] => {
        if (slices !== undefined) {
            return slices.map((slice: ChartPolarSlice<TDatum>, index: number) => ({
                id: slice.id,
                label: slice.label,
                value: slice.value,
                color: resolveSeriesColor(
                    { color: slice.color, tone: slice.tone },
                    index,
                    palette,
                    monotone,
                ),
                datum: (slice.datum ?? (slice as unknown as TDatum)),
            }));
        }

        const source = data ?? chart?.data ?? [];
        const seenIds: Record<string, boolean> = Object.create(null);

        return source.map((datum, index) => {
            const label = extractName(datum, index);
            const baseId = label.length > 0 ? label : `slice-${index}`;
            const id = seenIds[baseId] ? `${baseId}-${index}` : baseId;
            seenIds[baseId] = true;
            seenIds[id] = true;

            return {
                id,
                label,
                value: extractValue(datum, index),
                color: resolveSeriesColor(
                    { color: extractColor(datum, index), tone: extractTone(datum, index) },
                    index,
                    palette,
                    monotone,
                ),
                datum,
            };
        });
    });

    const safeGap = $derived(Math.max(0, gap));

    const arcs = $derived.by((): readonly ChartArcItem<TDatum>[] => {
        if (outerRadius <= 0 || normalizedSlices.length === 0) return [];

        const geometries = computePieArcs({
            slices: normalizedSlices.map((item) => ({
                id: item.id,
                label: item.label,
                value: item.value,
            })),
            outerRadius,
            innerRadiusRatio: clampedRatio,
            gap: safeGap,
            padAngle,
            cornerRadius,
            hoverExpandPx: safeHoverExpand,
            sort,
        });

        const result: ChartArcItem<TDatum>[] = [];
        for (const geometry of geometries) {
            const source = normalizedSlices[geometry.index];
            if (!source) continue;
            result.push({
                ...geometry,
                color: source.color,
                datum: source.datum,
            });
        }
        return result;
    });

    const effectiveActiveIndex = $derived(
        activeIndex !== undefined ? activeIndex : (chart?.activeIndex ?? null),
    );
    const effectiveHoveredId = $derived(
        hoveredSliceId !== undefined ? hoveredSliceId : (chart?.hoveredSeriesId ?? null),
    );
    const hasFocus = $derived(effectiveActiveIndex !== null || effectiveHoveredId !== null);
    const hasSelection = $derived(effectiveSelectedIndex !== null);
    const isSingleSlice = $derived(arcs.length === 1);

    function isSliceActive(arc: ChartArcItem<TDatum>): boolean {
        if (effectiveActiveIndex !== null && arc.index === effectiveActiveIndex) return true;
        if (effectiveHoveredId !== null && arc.id === effectiveHoveredId) return true;
        return false;
    }

    function isSliceSelected(arc: ChartArcItem<TDatum>): boolean {
        return effectiveSelectedIndex !== null && arc.index === effectiveSelectedIndex;
    }

    function canFitValueLabel(arc: ChartArcItem<TDatum>): boolean {
        if (!valueLabels) return false;
        if (arc.endAngle - arc.startAngle < MIN_LABEL_ANGLE_RAD) return false;
        if (isFullPie) return arc.outerRadius >= MIN_PIE_LABEL_RADIUS;
        return arc.outerRadius - arc.innerRadius >= MIN_DONUT_RING_THICKNESS;
    }

    function formatSliceLabel(arc: ChartArcItem<TDatum>): string {
        if (formatValue) return formatValue(arc.value, arc.datum);
        return `${Math.round(arc.share * 100)}%`;
    }

    function handleSliceEnter(arc: ChartArcItem<TDatum>): void {
        if (!interactive) return;
        if (onSliceHover) {
            onSliceHover(arc.index, arc);
            return;
        }
        chart?.setActiveIndex(arc.index);
    }

    function handleSliceLeave(arc: ChartArcItem<TDatum>): void {
        if (!interactive) return;
        if (onSliceHover) {
            onSliceHover(null, null);
            return;
        }
        if (chart?.activeIndex === arc.index) {
            chart.setActiveIndex(null);
        }
    }

    function handleSliceClick(arc: ChartArcItem<TDatum>): void {
        if (!interactive) return;
        if ((selectable || chart?.selectable) && selectedIndex === undefined) {
            chart?.toggleSelectedIndex(arc.index);
        }
        onSliceClick?.(arc.datum, arc.index, arc);
    }
</script>

{#if outerRadius > 0 && arcs.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-arc", className]}
        transform="translate({cx}, {cy})"
        data-pie={isFullPie ? "" : undefined}
        data-single={isSingleSlice ? "" : undefined}
        data-interactive={interactive ? "" : undefined}
        data-has-selection={hasSelection ? "" : undefined}
    >
        <g class="cs-chart-arc-group">
            {#each arcs as arc (arc.id)}
                {const active = $derived(isSliceActive(arc))}
                {const selected = $derived(isSliceSelected(arc))}
                {const dimmed = $derived(hasFocus && !active && !selected)}
                <!-- Keyboard navigation lives on the parent polar stage (role="application"). -->
                <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                <path
                    class="cs-chart-arc-slice"
                    d={selected ? arc.selectedPath : active ? arc.hoverPath : arc.path}
                    fill={arc.color}
                    data-slice-id={arc.id}
                    data-slice-index={arc.index}
                    data-active={active ? "" : undefined}
                    data-selected={selected ? "" : undefined}
                    data-dimmed={dimmed ? "" : undefined}
                    onpointerenter={() => handleSliceEnter(arc)}
                    onpointerleave={() => handleSliceLeave(arc)}
                    onclick={() => handleSliceClick(arc)}
                />
                {#if selected && arc.selectionRingPath}
                    <path
                        class="cs-chart-arc-selection-ring"
                        d={arc.selectionRingPath}
                        aria-hidden="true"
                    />
                {/if}
            {/each}

            {#if valueLabels}
                {#each arcs as arc (arc.id)}
                    {#if canFitValueLabel(arc)}
                        {const active = $derived(isSliceActive(arc))}
                        {const selected = $derived(isSliceSelected(arc))}
                        {const dimmed = $derived(hasFocus && !active && !selected)}
                        <text
                            class="cs-chart-arc-label"
                            x={snapInt(arc.centroid[0])}
                            y={snapInt(arc.centroid[1])}
                            text-anchor="middle"
                            dominant-baseline="central"
                            data-selected={selected ? "" : undefined}
                            data-dimmed={dimmed ? "" : undefined}
                        >
                            {formatSliceLabel(arc)}
                        </text>
                    {/if}
                {/each}
            {/if}
        </g>
    </g>
{/if}
