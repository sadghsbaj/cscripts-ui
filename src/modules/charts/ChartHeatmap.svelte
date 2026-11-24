<script lang="ts" generics="TDatum = ChartDatum">
    import {
        computeHeatmapGrid,
        getHeatmapSizeMetrics,
        resolveHeatmapCellColor,
        type ChartHeatmapCellGeometry,
        type HeatmapCellInput,
    } from "./chart-geometry.internal.ts";
    import { measureTextWidth } from "./chart-measure.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import type {
        ChartDatum,
        ChartHeatmapMode,
        ChartHeatmapRamp,
        ChartSize,
    } from "./chart-state.svelte.ts";
    import { getChartContext, hasChartContext } from "./chart.context.ts";
    import type { ChartHeatmapCell, ChartHeatmapProps } from "./index.ts";

    interface PreparedHeatmapCell {
        readonly geometry: ChartHeatmapCellGeometry<TDatum>;
        readonly cell: ChartHeatmapCell<TDatum>;
        readonly fill: string;
        readonly formattedValue: string;
        readonly showLabel: boolean;
        readonly active: boolean;
        readonly selected: boolean;
        readonly dimmed: boolean;
        readonly delay: string;
    }

    let {
        ref = $bindable(null),
        cells,
        data,
        x,
        y,
        value,
        xCategories,
        yCategories,
        width,
        height,
        size,
        mode = "sequential",
        ramp,
        domain,
        pivot = 0,
        gap,
        radius,
        valueLabels = true,
        formatValue,
        interactive = true,
        selectable = false,
        activeCell = null,
        selectedCell = null,
        onCellHover,
        onCellClick,
        class: className,
        ...rest
    }: ChartHeatmapProps<TDatum> = $props();

    const chart = hasChartContext() ? getChartContext<TDatum>() : undefined;

    const resolvedSize = $derived<ChartSize>(size ?? chart?.size ?? "md");
    const resolvedMode = $derived<ChartHeatmapMode>(
        ramp === "diverging" ? "diverging" : mode,
    );
    const resolvedRamp = $derived<ChartHeatmapRamp>(
        ramp ?? (resolvedMode === "diverging" ? "diverging" : "accent"),
    );
    const metrics = $derived(getHeatmapSizeMetrics(resolvedSize));

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

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
    }

    function extractCategory(
        accessor:
            | keyof TDatum
            | ((datum: TDatum, index: number) => string | number)
            | undefined,
        datum: TDatum,
        index: number,
    ): string {
        if (accessor === undefined) return String(index + 1);
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined) return "";
        return String(raw);
    }

    function extractNumber(
        accessor:
            | keyof TDatum
            | ((datum: TDatum, index: number) => number | null | undefined)
            | undefined,
        datum: TDatum,
        index: number,
    ): number | null {
        if (accessor === undefined) return null;
        const raw = typeof accessor === "function" ? accessor(datum, index) : readKey(datum, accessor);
        if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
            return null;
        }
        const numeric = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(numeric) ? numeric : null;
    }

    const cellInputs = $derived.by((): readonly HeatmapCellInput<TDatum>[] => {
        if (cells && cells.length > 0) {
            return cells.map((entry) => ({
                x: String(entry.x),
                y: String(entry.y),
                value: entry.value,
                ...(entry.datum !== undefined && { datum: entry.datum }),
            }));
        }

        const sourceData = data ?? chart?.data ?? [];
        if (sourceData.length === 0) return [];

        return sourceData.map((datum, index) => ({
            x: extractCategory(x, datum, index),
            y: extractCategory(y, datum, index),
            value: extractNumber(value, datum, index),
            datum,
        }));
    });

    const gridLayout = $derived.by(() =>
        computeHeatmapGrid({
            cells: cellInputs,
            xCategories,
            yCategories,
            width: resolvedWidth,
            height: resolvedHeight,
            size: resolvedSize,
            gap,
            radius,
            mode: resolvedMode,
            domain,
            pivot,
        }),
    );

    const effectiveActiveIndex = $derived.by((): number | null => {
        if (typeof activeCell === "number") return activeCell;
        if (activeCell && typeof activeCell === "object") {
            return activeCell.row * gridLayout.xCategories.length + activeCell.col;
        }
        return chart?.activeIndex ?? null;
    });

    const effectiveSelectedIndex = $derived.by((): number | null => {
        if (typeof selectedCell === "number") return selectedCell;
        if (selectedCell && typeof selectedCell === "object") {
            return selectedCell.row * gridLayout.xCategories.length + selectedCell.col;
        }
        return chart?.selectedIndex ?? null;
    });

    const hasSelection = $derived(effectiveSelectedIndex !== null);

    function formatCellValue(val: number, cell: ChartHeatmapCell<TDatum>): string {
        if (formatValue) return formatValue(val, cell);
        return formatDefaultTick(val);
    }

    const preparedCells = $derived.by((): readonly PreparedHeatmapCell[] => {
        const labelFont = { fontSize: metrics.fontSize, fontWeight: 500 };

        return gridLayout.cells.map((geom) => {
            const fill = resolveHeatmapCellColor(geom.t, resolvedRamp, resolvedMode);
            const cellObj: ChartHeatmapCell<TDatum> = {
                ...geom,
                color: fill,
                formattedValue: "",
            };
            const formattedValue =
                geom.value !== null ? formatCellValue(geom.value, cellObj) : "";
            const finalCell: ChartHeatmapCell<TDatum> = {
                ...cellObj,
                formattedValue,
            };

            let showLabel = false;
            if (valueLabels && geom.value !== null && geom.height >= 16) {
                const labelWidth = measureTextWidth(formattedValue, labelFont);
                showLabel = geom.width >= labelWidth + 8;
            }

            const isActive = effectiveActiveIndex === geom.index;
            const isSelected = effectiveSelectedIndex === geom.index;
            const isDimmed = hasSelection && !isSelected;
            const delayMs = Math.min((geom.row + geom.col) * 14, 220);

            return {
                geometry: geom,
                cell: finalCell,
                fill,
                formattedValue,
                showLabel,
                active: isActive,
                selected: isSelected,
                dimmed: isDimmed,
                delay: `${delayMs}ms`,
            };
        });
    });

    const highlightedCells = $derived.by((): readonly {
        readonly key: string;
        readonly kind: "selected" | "active";
        readonly cell: PreparedHeatmapCell;
    }[] => {
        const result: {
            readonly key: string;
            readonly kind: "selected" | "active";
            readonly cell: PreparedHeatmapCell;
        }[] = [];

        if (effectiveSelectedIndex !== null) {
            const selected = preparedCells[effectiveSelectedIndex];
            if (selected) {
                result.push({
                    key: `selected-${selected.geometry.index}`,
                    kind: "selected",
                    cell: selected,
                });
            }
        }

        if (
            effectiveActiveIndex !== null &&
            effectiveActiveIndex !== effectiveSelectedIndex
        ) {
            const active = preparedCells[effectiveActiveIndex];
            if (active) {
                result.push({
                    key: `active-${active.geometry.index}`,
                    kind: "active",
                    cell: active,
                });
            }
        }

        return result;
    });

    function handleCellPointerEnter(item: PreparedHeatmapCell): void {
        if (!interactive) return;
        chart?.setActiveIndex(item.geometry.index);
        onCellHover?.(item.geometry.index, item.cell);
    }

    function handleCellPointerLeave(item: PreparedHeatmapCell): void {
        if (!interactive) return;
        if (chart?.activeIndex === item.geometry.index) {
            chart.setActiveIndex(null);
        }
        onCellHover?.(null, null);
    }

    function handleCellClick(item: PreparedHeatmapCell): void {
        if (!interactive) return;
        if (selectable && chart) {
            chart.toggleSelectedIndex(item.geometry.index);
        }
        onCellClick?.(item.cell, item.geometry.index);
    }
</script>

{#if preparedCells.length > 0 && resolvedWidth > 0 && resolvedHeight > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-layer-marks", "cs-chart-heatmap", className]}
        data-size={resolvedSize}
        data-mode={resolvedMode}
        data-ramp={resolvedRamp}
        data-has-selection={hasSelection ? "" : undefined}
    >
        {#each preparedCells as item (item.geometry.index)}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <g
                class="cs-chart-heatmap-cell-group"
                data-row={item.geometry.row}
                data-col={item.geometry.col}
                data-index={item.geometry.index}
                data-empty={item.geometry.isEmpty ? "" : undefined}
                data-active={item.active ? "" : undefined}
                data-selected={item.selected ? "" : undefined}
                data-dimmed={item.dimmed ? "" : undefined}
                onpointerenter={() => handleCellPointerEnter(item)}
                onpointerleave={() => handleCellPointerLeave(item)}
                onclick={() => handleCellClick(item)}
            >
                <rect
                    class="cs-chart-heatmap-cell"
                    x={item.geometry.x}
                    y={item.geometry.y}
                    width={item.geometry.width}
                    height={item.geometry.height}
                    rx={item.geometry.rx}
                    fill={item.fill}
                    data-row={item.geometry.row}
                    data-col={item.geometry.col}
                    data-index={item.geometry.index}
                    data-empty={item.geometry.isEmpty ? "" : undefined}
                    data-active={item.active ? "" : undefined}
                    data-selected={item.selected ? "" : undefined}
                    data-dimmed={item.dimmed ? "" : undefined}
                    style:--cs-chart-heatmap-delay={item.delay}
                />

                {#if item.showLabel}
                    <text
                        class="cs-chart-heatmap-value"
                        x={item.geometry.centerX}
                        y={item.geometry.centerY}
                        text-anchor="middle"
                        dominant-baseline="central"
                        data-invert-fg={item.geometry.invertFg ? "" : undefined}
                        data-active={item.active ? "" : undefined}
                        data-selected={item.selected ? "" : undefined}
                        data-dimmed={item.dimmed ? "" : undefined}
                        style:--cs-chart-heatmap-delay={item.delay}
                    >
                        {item.formattedValue}
                    </text>
                {/if}
            </g>
        {/each}

        {#if highlightedCells.length > 0}
            <g class="cs-chart-heatmap-focus" pointer-events="none">
                {#each highlightedCells as highlight (highlight.key)}
                    {let geom = $derived(highlight.cell.geometry)}
                    <rect
                        class="cs-chart-heatmap-ring-inner"
                        data-kind={highlight.kind}
                        x={geom.x - 0.75}
                        y={geom.y - 0.75}
                        width={geom.width + 1.5}
                        height={geom.height + 1.5}
                        rx={geom.rx + 0.75}
                    />
                    <rect
                        class="cs-chart-heatmap-ring-outer"
                        data-kind={highlight.kind}
                        x={geom.x - 2}
                        y={geom.y - 2}
                        width={geom.width + 4}
                        height={geom.height + 4}
                        rx={geom.rx + 2}
                    />
                {/each}
            </g>
        {/if}
    </g>
{/if}
