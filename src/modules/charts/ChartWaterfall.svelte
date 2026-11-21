<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import {
        buildWaterfallBarPath,
        computeWaterfallBars,
        computeWaterfallSteps,
        snapInt,
        type ChartWaterfallBarRect,
        type ComputeWaterfallBarsResult,
        type WaterfallBarInput,
    } from "./chart-geometry.internal.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import {
        CHART_BAR_PATTERNS,
        CHART_TONES,
        CHART_WATERFALL_ROW_TYPES,
        resolveToneColor,
        type ChartBarPattern,
        type ChartDatum,
        type ChartTone,
        type ChartWaterfallBarKind,
        type ChartWaterfallRowType,
    } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartWaterfallItem, ChartWaterfallProps } from "./index.ts";

    interface HatchPatternDef {
        readonly id: string;
        readonly color: string;
    }

    interface PreparedWaterfallBar {
        readonly bar: ChartWaterfallBarRect;
        readonly item: ChartWaterfallItem<TDatum>;
        readonly renderPath: string;
        readonly selectionRingPath: string | null;
        readonly color: string;
        readonly pattern: ChartBarPattern;
        readonly hatchPatternId: string | null;
        readonly active: boolean;
        readonly selected: boolean;
        readonly origin: string;
        readonly delay: string;
    }

    interface WaterfallValueLabel {
        readonly index: number;
        readonly kind: ChartWaterfallBarKind;
        readonly x: number;
        readonly y: number;
        readonly dy?: string;
        readonly text: string;
        readonly selected: boolean;
    }

    let {
        ref = $bindable(null),
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
        class: className,
        ...rest
    }: ChartWaterfallProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();
    const uid = $props.id();

    const resolvedRadius = $derived(
        radius ?? (chart.size === "sm" ? 3 : chart.size === "lg" ? 5 : 4),
    );
    const resolvedMaxBarWidth = $derived(
        maxBarWidth ?? (chart.size === "sm" ? 40 : chart.size === "lg" ? 64 : 52),
    );
    const yAxisFormat = $derived(chart.getEffectiveAxisConfig("left").format);
    const xAxisFormat = $derived(chart.getEffectiveAxisConfig("bottom").format);

    function readKey(datum: TDatum, key: keyof TDatum): unknown {
        if (typeof datum === "object" && datum !== null) {
            return (datum as Record<keyof TDatum, unknown>)[key];
        }
        return undefined;
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

    function resolveBarColor(
        rowType: ChartWaterfallRowType,
        barValue: number,
        datum: TDatum,
        index: number,
    ): string {
        const explicitColor = extractColor(datum, index);
        if (explicitColor !== undefined) return explicitColor;

        const explicitTone = extractTone(datum, index);
        if (explicitTone !== undefined) return resolveToneColor(explicitTone);

        if (rowType !== "delta") {
            return totalTone === "accent"
                ? "var(--cs-chart-series-1)"
                : "var(--cs-chart-waterfall-total)";
        }

        return barValue < 0 ? "var(--cs-chart-negative)" : "var(--cs-chart-positive)";
    }

    function formatSignedValue(barValue: number, rowType: ChartWaterfallRowType): string {
        const formatted = yAxisFormat ? yAxisFormat(barValue) : formatDefaultTick(barValue);
        if (rowType !== "delta") return formatted;
        if (barValue > 0 && !formatted.startsWith("+") && !formatted.startsWith("-")) {
            return `+${formatted}`;
        }
        return formatted;
    }

    function buildInsetBarPath(bar: ChartWaterfallBarRect, inset: number): string {
        if (bar.width <= inset * 2 || bar.height <= inset * 2) return bar.path;
        return buildWaterfallBarPath(
            bar.x + inset,
            bar.y + inset,
            bar.width - inset * 2,
            bar.height - inset * 2,
            Math.max(0, bar.radius - inset),
            Math.max(0, bar.originRadius - inset),
            bar.capSide,
        );
    }

    const waterfallInputs = $derived.by((): readonly WaterfallBarInput[] =>
        chart.data.map((datum, index) => {
            const xVal = chart.extractX(datum, index);
            const label = xAxisFormat ? xAxisFormat(xVal) : formatDefaultTick(xVal);
            return {
                index,
                label,
                value: extractValue(datum, index),
                type: extractRowType(datum, index),
            };
        }),
    );

    const stepSummary = $derived(computeWaterfallSteps(waterfallInputs));

    // Register computed cumulative extent on ChartState so standalone Tier-1 usage scales Y accurately.
    $effect.pre(() => {
        const extent = stepSummary.extent;
        const current = untrack(() => chart.externalYExtent);
        if (current === null || current[0] !== extent[0] || current[1] !== extent[1]) {
            chart.externalYExtent = extent;
        }
    });

    function clearExternalYExtent(): void {
        chart.externalYExtent = null;
    }

    $effect.pre(() => clearExternalYExtent);

    const categoryGeometry = $derived.by((): {
        readonly starts: readonly number[];
        readonly bandwidth: number;
    } => {
        if (!chart.hasSize || chart.data.length === 0) {
            return { starts: [], bandwidth: 0 };
        }

        const xScale = chart.xScale;
        const rawBandwidth =
            xScale.bandwidth > 0
                ? xScale.bandwidth
                : Math.max(8, xScale.step > 0 ? xScale.step * 0.72 : 24);

        const rawStarts = chart.xValues.map((xVal) =>
            xScale.bandwidth > 0 ? xScale.scale(xVal) : xScale.center(xVal) - rawBandwidth / 2,
        );

        return { starts: rawStarts, bandwidth: rawBandwidth };
    });

    const geometry = $derived.by((): ComputeWaterfallBarsResult => {
        if (!chart.hasSize || categoryGeometry.starts.length === 0) {
            return {
                bars: [],
                connectors: [],
                extent: stepSummary.extent,
                crossesZero: stepSummary.crossesZero,
            };
        }

        return computeWaterfallBars({
            items: waterfallInputs,
            categoryStarts: categoryGeometry.starts,
            bandwidth: categoryGeometry.bandwidth,
            valueScale: chart.yScale,
            radius: resolvedRadius,
            maxBarWidth: resolvedMaxBarWidth,
            minBarLength,
        });
    });

    $effect.pre(() => {
        chart.activeYResolver = (index: number): number | null => {
            const step = stepSummary.steps[index];
            if (!step) return null;
            return chart.yScale.scale((step.y0 + step.y1) / 2);
        };
        return () => {
            chart.activeYResolver = null;
        };
    });

    const preparedData = $derived.by((): {
        readonly bars: readonly PreparedWaterfallBar[];
        readonly hatchPatterns: readonly HatchPatternDef[];
    } => {
        const hatchPatterns: HatchPatternDef[] = [];
        const hatchIdByColor: Record<string, string> = Object.create(null);
        const bars: PreparedWaterfallBar[] = [];

        for (const bar of geometry.bars) {
            if (bar.path.length === 0) continue;

            const datum = chart.data[bar.index];
            if (datum === undefined) continue;

            const barColor = resolveBarColor(bar.type, bar.value, datum, bar.index);
            const barPattern = extractPattern(datum, bar.index);

            let hatchPatternId: string | null = null;
            if (barPattern === "hatch") {
                const existing = hatchIdByColor[barColor];
                if (existing !== undefined) {
                    hatchPatternId = existing;
                } else {
                    const nextId = `cs-chart-waterfall-hatch-${uid}-${hatchPatterns.length}`;
                    hatchIdByColor[barColor] = nextId;
                    hatchPatterns.push({ id: nextId, color: barColor });
                    hatchPatternId = nextId;
                }
            }

            const renderPath =
                barPattern === "outline"
                    ? buildInsetBarPath(bar, 0.75)
                    : barPattern === "hatch"
                      ? buildInsetBarPath(bar, 0.5)
                      : bar.path;

            const selected = chart.selectedIndex === bar.index;
            const selectionRingPath = selected
                ? buildWaterfallBarPath(
                      bar.x - 2.5,
                      bar.y - 2.5,
                      bar.width + 5,
                      bar.height + 5,
                      bar.radius > 0 ? bar.radius + 2.5 : 2.5,
                      bar.originRadius > 0 ? bar.originRadius + 2.5 : 0,
                      bar.capSide,
                  )
                : null;

            const item: ChartWaterfallItem<TDatum> = {
                index: bar.index,
                label: bar.label,
                xValue: chart.extractX(datum, bar.index),
                type: bar.type,
                kind: bar.kind,
                value: bar.value,
                y0: bar.y0,
                y1: bar.y1,
                runningTotal: bar.runningTotal,
                isPositive: bar.isPositive,
                isNegative: bar.isNegative,
                color: barColor,
                pattern: barPattern,
                datum,
            };

            bars.push({
                bar,
                item,
                renderPath,
                selectionRingPath,
                color: barColor,
                pattern: barPattern,
                hatchPatternId,
                active: chart.activeIndex === bar.index,
                selected,
                origin: `0px ${bar.baseline}px`,
                delay: `${Math.min(bar.index * 32, 260)}ms`,
            });
        }

        return { bars, hatchPatterns };
    });

    const preparedBars = $derived(preparedData.bars);
    const hatchPatterns = $derived(preparedData.hatchPatterns);

    const labels = $derived.by((): readonly WaterfallValueLabel[] => {
        if (!valueLabels || !chart.hasSize) return [];

        const result: WaterfallValueLabel[] = [];
        for (const prepared of preparedBars) {
            const { bar, item } = prepared;
            const text = formatLabel
                ? formatLabel(bar.value, item)
                : formatSignedValue(bar.value, bar.type);

            const isDownward = bar.y1 < bar.y0;
            const bottomClearance = chart.plotHeight - (bar.y + bar.height);
            // Place below negative bars unless too close to X-axis ticks (< 14px).
            const placeBelow = isDownward && bottomClearance >= 14;

            result.push({
                index: bar.index,
                kind: bar.kind,
                x: snapInt(bar.x + bar.width / 2),
                y: snapInt(placeBelow ? bar.y + bar.height + 6 : bar.y - 6),
                dy: placeBelow ? "0.85em" : undefined,
                text,
                selected: prepared.selected,
            });
        }
        return result;
    });
</script>

{#if chart.hasSize && geometry.bars.length > 0}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-waterfall", className]}
        data-has-selection={chart.hasSelection ? "" : undefined}
    >
        {#if hatchPatterns.length > 0}
            <defs>
                {#each hatchPatterns as def (def.id)}
                    <pattern
                        id={def.id}
                        width="8"
                        height="8"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                    >
                        <rect
                            width="8"
                            height="8"
                            class="cs-chart-hatch-bg"
                            style:fill={def.color}
                        />
                        <rect
                            x="0"
                            y="0"
                            width="2.25"
                            height="8"
                            class="cs-chart-hatch-stripe"
                            style:fill={def.color}
                        />
                    </pattern>
                {/each}
            </defs>
        {/if}

        {#if connectors}
            {#each geometry.connectors as conn (`${conn.fromIndex}-${conn.toIndex}`)}
                <line
                    class="cs-chart-waterfall-connector"
                    x1={conn.x1}
                    x2={conn.x2}
                    y1={conn.y}
                    y2={conn.y}
                    stroke-dasharray="3 2"
                    shape-rendering="crispEdges"
                    aria-hidden="true"
                />
            {/each}
        {/if}

        {#each preparedBars as prepared (prepared.bar.index)}
            <path
                class="cs-chart-waterfall-bar"
                role="presentation"
                d={prepared.renderPath}
                data-kind={prepared.bar.kind}
                data-type={prepared.bar.type}
                data-index={prepared.bar.index}
                data-pattern={prepared.pattern !== "solid" ? prepared.pattern : undefined}
                data-negative={prepared.bar.isNegative ? "" : undefined}
                data-active={prepared.active ? "" : undefined}
                data-selected={prepared.selected ? "" : undefined}
                fill={prepared.hatchPatternId ? `url(#${prepared.hatchPatternId})` : undefined}
                style:fill={prepared.hatchPatternId ? undefined : prepared.color}
                style:stroke={prepared.pattern !== "solid" ? prepared.color : undefined}
                style:--cs-chart-bar-origin={prepared.origin}
                style:--cs-chart-bar-delay={prepared.delay}
            />
            {#if prepared.selectionRingPath}
                <path
                    class="cs-chart-selection-ring"
                    d={prepared.selectionRingPath}
                    aria-hidden="true"
                />
            {/if}
        {/each}

        {#each labels as label (label.index)}
            <text
                class="cs-chart-waterfall-label"
                x={label.x}
                y={label.y}
                text-anchor="middle"
                dy={label.dy}
                data-kind={label.kind}
                data-index={label.index}
                data-selected={label.selected ? "" : undefined}
            >
                {label.text}
            </text>
        {/each}
    </g>
{/if}
