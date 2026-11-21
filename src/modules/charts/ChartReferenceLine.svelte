<script lang="ts">
    import { snapHalf, snapInt } from "./chart-geometry.internal.ts";
    import { measureTextWidth } from "./chart-measure.internal.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartReferenceLineProps } from "./index.ts";

    const PILL_HEIGHT = 22;
    const PILL_RADIUS = 6;
    const PILL_PADDING_X = 16;
    const PILL_EDGE_INSET = 6;
    const PILL_LINE_GAP = 6;

    let {
        ref = $bindable(null),
        axis = "y",
        value,
        label,
        labelPosition = "end",
        tone,
        color,
        dashed = true,
        class: className,
        ...rest
    }: ChartReferenceLineProps = $props();

    const chart = getChartContext();

    function toFiniteNumber(input: unknown): number | null {
        if (typeof input === "number") return Number.isFinite(input) ? input : null;
        if (input instanceof Date) {
            const ms = input.getTime();
            return Number.isFinite(ms) ? ms : null;
        }
        const parsed = Number(input);
        return Number.isFinite(parsed) ? parsed : null;
    }

    const geometry = $derived.by(() => {
        if (!chart.hasSize) return null;

        const isHorizontalChart = chart.orientation === "horizontal";
        let isHorizontalLine: boolean;
        let rawCoord: number;

        if (axis === "x") {
            isHorizontalLine = isHorizontalChart;
            rawCoord = chart.xScale.center(value);
        } else {
            const numericScale = axis === "y2" ? chart.y2Scale : chart.yScale;
            if (numericScale === null) return null;
            const numericValue = toFiniteNumber(value);
            if (numericValue === null) return null;
            isHorizontalLine = !isHorizontalChart;
            rawCoord = numericScale.scale(numericValue);
        }

        const plotLimit = isHorizontalLine ? chart.plotHeight : chart.plotWidth;
        if (!Number.isFinite(rawCoord) || rawCoord < -1 || rawCoord > plotLimit + 1) return null;

        const coord = snapHalf(rawCoord);
        const line = isHorizontalLine
            ? { x1: 0, x2: chart.plotWidth, y1: coord, y2: coord }
            : { x1: coord, x2: coord, y1: 0, y2: chart.plotHeight };

        let pill: {
            readonly x: number;
            readonly y: number;
            readonly width: number;
            readonly height: number;
            readonly textX: number;
            readonly textY: number;
        } | null = null;

        if (label !== undefined && label.length > 0) {
            const pillW = Math.ceil(
                measureTextWidth(label, { fontSize: 11, fontWeight: 600 }) + PILL_PADDING_X,
            );
            const maxPillX = Math.max(0, chart.plotWidth - pillW);
            const maxPillY = Math.max(0, chart.plotHeight - PILL_HEIGHT);

            let rawPillX: number;
            let rawPillY: number;

            if (isHorizontalLine) {
                if (labelPosition === "start") {
                    rawPillX = PILL_EDGE_INSET;
                } else if (labelPosition === "center") {
                    rawPillX = (chart.plotWidth - pillW) / 2;
                } else {
                    rawPillX = chart.plotWidth - pillW - PILL_EDGE_INSET;
                }

                const aboveY = rawCoord - PILL_HEIGHT - PILL_LINE_GAP;
                rawPillY = aboveY >= 0 ? aboveY : rawCoord + PILL_LINE_GAP;
            } else {
                rawPillX = rawCoord - pillW / 2;
                if (labelPosition === "start") {
                    rawPillY = chart.plotHeight - PILL_HEIGHT - PILL_EDGE_INSET;
                } else if (labelPosition === "center") {
                    rawPillY = (chart.plotHeight - PILL_HEIGHT) / 2;
                } else {
                    rawPillY = PILL_EDGE_INSET;
                }
            }

            const pillX = snapInt(Math.max(0, Math.min(maxPillX, rawPillX)));
            const pillY = snapInt(Math.max(0, Math.min(maxPillY, rawPillY)));

            pill = {
                x: pillX,
                y: pillY,
                width: pillW,
                height: PILL_HEIGHT,
                textX: snapInt(pillX + pillW / 2),
                textY: snapInt(pillY + PILL_HEIGHT / 2),
            };
        }

        return { line, pill };
    });
</script>

{#if geometry}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-ref-line", className]}
        data-axis={axis}
        data-tone={tone}
        data-custom-color={color ? "" : undefined}
        style:--cs-chart-ref-color={color}
    >
        <line
            class="cs-chart-ref-line-rule"
            x1={geometry.line.x1}
            x2={geometry.line.x2}
            y1={geometry.line.y1}
            y2={geometry.line.y2}
            stroke-dasharray={dashed ? "4 3" : undefined}
        />

        {#if geometry.pill && label}
            <rect
                class="cs-chart-ref-line-pill"
                x={geometry.pill.x + 0.5}
                y={geometry.pill.y + 0.5}
                width={geometry.pill.width - 1}
                height={geometry.pill.height - 1}
                rx={PILL_RADIUS}
            />
            <text
                class="cs-chart-ref-line-label"
                x={geometry.pill.textX}
                y={geometry.pill.textY}
                text-anchor="middle"
                dominant-baseline="central"
            >
                {label}
            </text>
        {/if}
    </g>
{/if}
