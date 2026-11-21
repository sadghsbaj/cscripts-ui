<script lang="ts">
    import { snapHalf, snapInt } from "./chart-geometry.internal.ts";
    import { measureTextWidth } from "./chart-measure.internal.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartReferenceBandProps } from "./index.ts";

    const TAG_HEIGHT = 20;
    const TAG_RADIUS = 5;
    const TAG_PADDING_X = 14;
    const TAG_INSET = 6;

    interface BandEdgeLine {
        readonly key: string;
        readonly x1: number;
        readonly x2: number;
        readonly y1: number;
        readonly y2: number;
    }

    let {
        ref = $bindable(null),
        axis = "y",
        part = "all",
        from,
        to,
        label,
        tone,
        color,
        class: className,
        ...rest
    }: ChartReferenceBandProps = $props();

    const chart = getChartContext();
    const renderFill = $derived(part === "all" || part === "fill");
    const renderLabel = $derived(part === "all" || part === "label");

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
        let isHorizontalBand: boolean;
        let rawStart: number;
        let rawEnd: number;

        if (axis === "x") {
            isHorizontalBand = isHorizontalChart;
            if (chart.xScale.type === "band" && chart.xScale.bandwidth > 0) {
                const s1 = chart.xScale.scale(from);
                const s2 = chart.xScale.scale(to);
                if (!Number.isFinite(s1) || !Number.isFinite(s2)) return null;
                rawStart = Math.min(s1, s2);
                rawEnd = Math.max(s1, s2) + chart.xScale.bandwidth;
            } else {
                const c1 = chart.xScale.center(from);
                const c2 = chart.xScale.center(to);
                if (!Number.isFinite(c1) || !Number.isFinite(c2)) return null;
                rawStart = Math.min(c1, c2);
                rawEnd = Math.max(c1, c2);
            }
        } else {
            const numericScale = axis === "y2" ? chart.y2Scale : chart.yScale;
            if (numericScale === null) return null;
            const fromNum = toFiniteNumber(from);
            const toNum = toFiniteNumber(to);
            if (fromNum === null || toNum === null) return null;
            isHorizontalBand = !isHorizontalChart;
            const c1 = numericScale.scale(fromNum);
            const c2 = numericScale.scale(toNum);
            if (!Number.isFinite(c1) || !Number.isFinite(c2)) return null;
            rawStart = Math.min(c1, c2);
            rawEnd = Math.max(c1, c2);
        }

        let x: number;
        let y: number;
        let width: number;
        let height: number;
        const edges: BandEdgeLine[] = [];

        if (isHorizontalBand) {
            const clampedStart = Math.max(0, Math.min(chart.plotHeight, rawStart));
            const clampedEnd = Math.max(0, Math.min(chart.plotHeight, rawEnd));
            x = 0;
            y = snapInt(clampedStart);
            width = snapInt(chart.plotWidth);
            height = Math.max(0, snapInt(clampedEnd) - y);

            if (rawStart >= 0) {
                const topY = snapHalf(y);
                edges.push({ key: "top", x1: x, x2: x + width, y1: topY, y2: topY });
            }
            if (rawEnd <= chart.plotHeight) {
                const bottomY = snapHalf(y + height);
                edges.push({ key: "bottom", x1: x, x2: x + width, y1: bottomY, y2: bottomY });
            }
        } else {
            const clampedStart = Math.max(0, Math.min(chart.plotWidth, rawStart));
            const clampedEnd = Math.max(0, Math.min(chart.plotWidth, rawEnd));
            x = snapInt(clampedStart);
            y = 0;
            width = Math.max(0, snapInt(clampedEnd) - x);
            height = snapInt(chart.plotHeight);

            if (rawStart >= 0) {
                const leftX = snapHalf(x);
                edges.push({ key: "left", x1: leftX, x2: leftX, y1: y, y2: y + height });
            }
            if (rawEnd <= chart.plotWidth) {
                const rightX = snapHalf(x + width);
                edges.push({ key: "right", x1: rightX, x2: rightX, y1: y, y2: y + height });
            }
        }

        if (width <= 0 || height <= 0) return null;

        let tag: {
            readonly x: number;
            readonly y: number;
            readonly width: number;
            readonly height: number;
            readonly textX: number;
            readonly textY: number;
        } | null = null;

        if (label !== undefined && label.length > 0) {
            const tagW = Math.ceil(
                measureTextWidth(label, { fontSize: 10.5, fontWeight: 500 }) + TAG_PADDING_X,
            );

            if (width >= tagW + TAG_INSET * 2 && height >= TAG_HEIGHT + 4) {
                const tagX = snapInt(
                    isHorizontalBand ? x + width - tagW - TAG_INSET : x + TAG_INSET,
                );
                const tagY = snapInt(y + Math.min(TAG_INSET, (height - TAG_HEIGHT) / 2));

                tag = {
                    x: tagX,
                    y: tagY,
                    width: tagW,
                    height: TAG_HEIGHT,
                    textX: snapInt(tagX + tagW / 2),
                    textY: snapInt(tagY + TAG_HEIGHT / 2),
                };
            }
        }

        return { x, y, width, height, edges, tag };
    });
</script>

{#if geometry && (renderFill || (renderLabel && geometry.tag !== null))}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-ref-band", className]}
        data-axis={axis}
        data-part={part}
        data-tone={tone}
        data-custom-color={color ? "" : undefined}
        style:--cs-chart-ref-color={color}
    >
        {#if renderFill}
            <rect
                class="cs-chart-ref-band-rect"
                x={geometry.x}
                y={geometry.y}
                width={geometry.width}
                height={geometry.height}
            />

            {#each geometry.edges as edge (edge.key)}
                <line
                    class="cs-chart-ref-band-edge"
                    x1={edge.x1}
                    x2={edge.x2}
                    y1={edge.y1}
                    y2={edge.y2}
                    shape-rendering="crispEdges"
                />
            {/each}
        {/if}

        {#if renderLabel && geometry.tag && label}
            <rect
                class="cs-chart-ref-band-tag"
                x={geometry.tag.x + 0.5}
                y={geometry.tag.y + 0.5}
                width={geometry.tag.width - 1}
                height={geometry.tag.height - 1}
                rx={TAG_RADIUS}
            />
            <text
                class="cs-chart-ref-band-label"
                x={geometry.tag.textX}
                y={geometry.tag.textY}
                text-anchor="middle"
                dominant-baseline="central"
            >
                {label}
            </text>
        {/if}
    </g>
{/if}
