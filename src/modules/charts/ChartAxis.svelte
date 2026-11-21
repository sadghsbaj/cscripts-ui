<script lang="ts">
    import { untrack } from "svelte";

    import { snapHalf, snapInt } from "./chart-geometry.internal.ts";
    import {
        thinAxisTicks,
        truncateTextToWidth,
        wrapTickLabel,
    } from "./chart-measure.internal.ts";
    import { formatDefaultTick, formatPercentTick } from "./chart-scales.internal.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartAxisProps } from "./index.ts";

    interface PreparedTick {
        key: string;
        position: number;
        fullLabel: string;
        lines: readonly string[];
        truncated: boolean;
    }

    let {
        ref = $bindable(null),
        position,
        label,
        tickCount,
        format,
        tickAngle,
        wrapTicks,
        maxTickWidth,
        hideLine,
        class: className,
        ...rest
    }: ChartAxisProps = $props();

    const chart = getChartContext();

    // Register direct <ChartAxis> prop overrides so ChartState.margins stays in sync.
    $effect.pre(() => {
        const pos = position;
        const nextOverride = {
            label,
            tickCount,
            format,
            tickAngle,
            wrapTicks,
            maxTickWidth,
        };
        untrack(() => {
            chart.setAxisOverride(pos, nextOverride);
        });
        return () => {
            untrack(() => {
                chart.setAxisOverride(pos, null);
            });
        };
    });

    const axisConfig = $derived(chart.getEffectiveAxisConfig(position));

    const isAxisVisible = $derived(
        axisConfig.show !== false && (position !== "right" || chart.y2Scale !== null),
    );
    const resolvedHideLine = $derived(hideLine ?? position !== "bottom");
    const resolvedLabel = $derived(axisConfig.label);
    const resolvedWrapTicks = $derived(axisConfig.wrapTicks ?? false);
    const fontSize = $derived(chart.size === "lg" ? 12 : 11);
    const lineHeight = $derived(Math.ceil(fontSize * 1.3));
    const font = $derived({ fontSize });

    const rawTicks = $derived.by((): readonly { label: string; position: number; key: string }[] => {
        if (!chart.hasSize || !isAxisVisible) return [];

        const isHorizontal = chart.orientation === "horizontal";
        const useXScale =
            (position === "bottom" && !isHorizontal) || (position === "left" && isHorizontal);
        const formatter =
            axisConfig.format ??
            (!useXScale && position !== "right" && chart.isPercent
                ? formatPercentTick
                : formatDefaultTick);
        const requestedCount = axisConfig.tickCount;

        if (position === "right") {
            const scale = chart.y2Scale;
            if (!scale) return [];
            return scale.ticks(requestedCount).map((value, index) => ({
                key: `r-${index}-${String(value)}`,
                label: formatter(value),
                position: scale.scale(value),
            }));
        }

        if (useXScale) {
            return chart.xScale.ticks(requestedCount).map((value, index) => ({
                key: `x-${index}-${value instanceof Date ? value.getTime() : String(value)}`,
                label: formatter(value),
                position: chart.xScale.center(value),
            }));
        }

        return chart.yScale.ticks(requestedCount).map((value, index) => ({
            key: `y-${index}-${String(value)}`,
            label: formatter(value),
            position: chart.yScale.scale(value),
        }));
    });

    const resolvedAngle = $derived(position === "bottom" ? chart.resolvedBottomTickAngle : 0);

    const resolvedMaxTickWidth = $derived.by((): number | undefined => {
        if (axisConfig.maxTickWidth !== undefined) return axisConfig.maxTickWidth;

        if (position === "left" && chart.orientation === "horizontal") {
            return Math.min(140, Math.max(48, Math.floor(chart.plotWidth * 0.32)));
        }

        if (
            position === "bottom" &&
            chart.orientation !== "horizontal" &&
            chart.xScale.type === "band" &&
            chart.xScale.bandwidth > 0 &&
            resolvedAngle === 0
        ) {
            return Math.max(24, Math.floor(chart.xScale.bandwidth - 6));
        }

        return undefined;
    });

    const preparedTicks = $derived.by((): readonly PreparedTick[] => {
        if (rawTicks.length === 0) return [];

        let keptTicks = rawTicks;
        if (position === "bottom") {
            const keptIndices = thinAxisTicks(rawTicks, {
                minGutter: 12,
                font,
                tickAngle: resolvedAngle,
                maxTickWidth: resolvedMaxTickWidth,
            });
            const keptSet = new Set(keptIndices);
            keptTicks = rawTicks.filter((_, index) => keptSet.has(index));
        }

        return keptTicks.map((tick) => {
            if (
                position === "bottom" &&
                resolvedWrapTicks &&
                resolvedAngle === 0 &&
                resolvedMaxTickWidth !== undefined
            ) {
                const wrapped = wrapTickLabel(tick.label, resolvedMaxTickWidth, font, 2);
                return {
                    key: tick.key,
                    position: snapInt(tick.position),
                    fullLabel: tick.label,
                    lines: wrapped.lines.length > 0 ? wrapped.lines : [tick.label],
                    truncated: wrapped.truncated,
                };
            }

            if (resolvedMaxTickWidth !== undefined) {
                const truncated = truncateTextToWidth(tick.label, resolvedMaxTickWidth, font);
                return {
                    key: tick.key,
                    position: snapInt(tick.position),
                    fullLabel: tick.label,
                    lines: [truncated.text],
                    truncated: truncated.truncated,
                };
            }

            return {
                key: tick.key,
                position: snapInt(tick.position),
                fullLabel: tick.label,
                lines: [tick.label],
                truncated: false,
            };
        });
    });

    const bottomBaselineY = $derived(snapHalf(chart.plotHeight));
    const leftSpineX = $derived(snapHalf(0));
    const rightSpineX = $derived(snapHalf(chart.plotWidth));
</script>

{#if chart.hasSize && isAxisVisible}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-layer-axes", className]}
        data-position={position}
    >
        {#if position === "bottom"}
            {#if !resolvedHideLine}
                <line
                    class="cs-chart-axis-line"
                    x1="0"
                    x2={chart.plotWidth}
                    y1={bottomBaselineY}
                    y2={bottomBaselineY}
                    shape-rendering="crispEdges"
                />
            {/if}

            {#each preparedTicks as tick (tick.key)}
                {#if resolvedAngle !== 0}
                    <text
                        class="cs-chart-axis-tick-text"
                        transform="translate({tick.position}, {snapInt(chart.plotHeight + 8)}) rotate({resolvedAngle})"
                        text-anchor="end"
                        dy="4"
                    >
                        {#if tick.truncated}
                            <title>{tick.fullLabel}</title>
                        {/if}
                        {tick.lines[0]}
                    </text>
                {:else}
                    <text
                        class="cs-chart-axis-tick-text"
                        x={tick.position}
                        y={snapInt(chart.plotHeight + 10)}
                        text-anchor="middle"
                        dy={tick.lines.length > 1 ? undefined : "0.71em"}
                    >
                        {#if tick.truncated}
                            <title>{tick.fullLabel}</title>
                        {/if}
                        {#if tick.lines.length > 1}
                            {#each tick.lines as line, lineIndex (lineIndex)}
                                <tspan
                                    x={tick.position}
                                    dy={lineIndex === 0 ? "0.71em" : lineHeight}
                                >
                                    {line}
                                </tspan>
                            {/each}
                        {:else}
                            {tick.lines[0]}
                        {/if}
                    </text>
                {/if}
            {/each}

            {#if resolvedLabel}
                <text
                    class="cs-chart-axis-label"
                    x={snapInt(chart.plotWidth / 2)}
                    y={snapInt(chart.plotHeight + chart.margins.bottom - 4)}
                    text-anchor="middle"
                >
                    {resolvedLabel}
                </text>
            {/if}
        {:else if position === "left"}
            {#if !resolvedHideLine}
                <line
                    class="cs-chart-axis-line"
                    x1={leftSpineX}
                    x2={leftSpineX}
                    y1="0"
                    y2={chart.plotHeight}
                    shape-rendering="crispEdges"
                />
            {/if}

            {#each preparedTicks as tick (tick.key)}
                <text
                    class="cs-chart-axis-tick-text"
                    x={snapInt(-10)}
                    y={tick.position}
                    text-anchor="end"
                    dy="0.32em"
                >
                    {#if tick.truncated}
                        <title>{tick.fullLabel}</title>
                    {/if}
                    {tick.lines[0]}
                </text>
            {/each}

            {#if resolvedLabel}
                <text
                    class="cs-chart-axis-label"
                    transform="translate({snapInt(-chart.margins.left + 12)}, {snapInt(chart.plotHeight / 2)}) rotate(-90)"
                    text-anchor="middle"
                >
                    {resolvedLabel}
                </text>
            {/if}
        {:else}
            {#if !resolvedHideLine}
                <line
                    class="cs-chart-axis-line"
                    x1={rightSpineX}
                    x2={rightSpineX}
                    y1="0"
                    y2={chart.plotHeight}
                    shape-rendering="crispEdges"
                />
            {/if}

            {#each preparedTicks as tick (tick.key)}
                <text
                    class="cs-chart-axis-tick-text"
                    x={snapInt(chart.plotWidth + 10)}
                    y={tick.position}
                    text-anchor="start"
                    dy="0.32em"
                >
                    {#if tick.truncated}
                        <title>{tick.fullLabel}</title>
                    {/if}
                    {tick.lines[0]}
                </text>
            {/each}

            {#if resolvedLabel}
                <text
                    class="cs-chart-axis-label"
                    transform="translate({snapInt(chart.plotWidth + chart.margins.right - 12)}, {snapInt(chart.plotHeight / 2)}) rotate(90)"
                    text-anchor="middle"
                >
                    {resolvedLabel}
                </text>
            {/if}
        {/if}
    </g>
{/if}
