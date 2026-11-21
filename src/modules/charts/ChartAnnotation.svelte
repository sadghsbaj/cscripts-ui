<script lang="ts">
    import { snapInt } from "./chart-geometry.internal.ts";
    import { measureTextWidth } from "./chart-measure.internal.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartAnnotationProps } from "./index.ts";

    const ANCHOR_RADIUS = 4;
    const ANCHOR_HALO_RADIUS = 8;
    const ANCHOR_RING_CLEARANCE = 6.5;
    const PILL_HEIGHT = 24;
    const PILL_RADIUS = 6;
    const TONE_DOT_RADIUS = 2.5;
    const PLOT_CLAMP_INSET = 4;

    let {
        ref = $bindable(null),
        x,
        y,
        yAxis = "left",
        dx = 0,
        dy = -32,
        label,
        tone,
        color,
        class: className,
        ...rest
    }: ChartAnnotationProps = $props();

    const chart = getChartContext();

    const geometry = $derived.by(() => {
        if (!chart.hasSize || label.length === 0) return null;

        const valueScale = yAxis === "right" ? chart.y2Scale : chart.yScale;
        if (valueScale === null) return null;

        const xCoord = chart.xScale.center(x);
        const yCoord = valueScale.scale(y);
        if (!Number.isFinite(xCoord) || !Number.isFinite(yCoord)) return null;

        const isHorizontal = chart.orientation === "horizontal";
        const anchorX = isHorizontal ? yCoord : xCoord;
        const anchorY = isHorizontal ? xCoord : yCoord;

        const pillW = Math.ceil(measureTextWidth(label, { fontSize: 11, fontWeight: 600 }) + 28);
        const maxPillX = Math.max(PLOT_CLAMP_INSET, chart.plotWidth - pillW - PLOT_CLAMP_INSET);
        const maxPillY = Math.max(
            PLOT_CLAMP_INSET,
            chart.plotHeight - PILL_HEIGHT - PLOT_CLAMP_INSET,
        );

        const rawPillX = anchorX + dx - pillW / 2;
        const rawPillY = anchorY + dy - PILL_HEIGHT / 2;

        const pillX = snapInt(Math.max(PLOT_CLAMP_INSET, Math.min(maxPillX, rawPillX)));
        const pillY = snapInt(Math.max(PLOT_CLAMP_INSET, Math.min(maxPillY, rawPillY)));

        const edgeX = Math.max(pillX, Math.min(pillX + pillW, anchorX));
        const edgeY = Math.max(pillY, Math.min(pillY + PILL_HEIGHT, anchorY));
        const vx = edgeX - anchorX;
        const vy = edgeY - anchorY;
        const dist = Math.hypot(vx, vy);

        let leaderPath: string | null = null;

        if (dist > ANCHOR_RING_CLEARANCE) {
            const pillMidY = pillY + PILL_HEIGHT / 2;
            const withinStemBand = anchorX >= pillX + 10 && anchorX <= pillX + pillW - 10;

            if (withinStemBand && Math.abs(vy) > ANCHOR_RING_CLEARANCE) {
                const dirY = edgeY < anchorY ? -1 : 1;
                const startY = anchorY + dirY * ANCHOR_RING_CLEARANCE;
                leaderPath = `M ${anchorX} ${startY} L ${anchorX} ${edgeY}`;
            } else if (
                (anchorX < pillX || anchorX > pillX + pillW) &&
                Math.abs(pillMidY - anchorY) > ANCHOR_RING_CLEARANCE + 4
            ) {
                const sideX = pillX > anchorX ? pillX : pillX + pillW;
                const dirX = sideX > anchorX ? 1 : -1;
                const dirY = pillMidY < anchorY ? -1 : 1;
                const startY = anchorY + dirY * ANCHOR_RING_CLEARANCE;
                const cornerR = Math.min(4, Math.abs(pillMidY - startY), Math.abs(sideX - anchorX));
                leaderPath =
                    `M ${anchorX} ${startY} ` +
                    `L ${anchorX} ${pillMidY - dirY * cornerR} ` +
                    `Q ${anchorX} ${pillMidY} ${anchorX + dirX * cornerR} ${pillMidY} ` +
                    `L ${sideX} ${pillMidY}`;
            } else {
                const startX = anchorX + (vx / dist) * ANCHOR_RING_CLEARANCE;
                const startY = anchorY + (vy / dist) * ANCHOR_RING_CLEARANCE;
                leaderPath = `M ${startX} ${startY} L ${edgeX} ${edgeY}`;
            }
        }

        return {
            anchorX,
            anchorY,
            pillX,
            pillY,
            pillW,
            pillH: PILL_HEIGHT,
            badgeDotX: pillX + 10.5,
            badgeDotY: pillY + PILL_HEIGHT / 2,
            textX: snapInt(pillX + 19),
            textY: snapInt(pillY + PILL_HEIGHT / 2),
            leaderPath,
        };
    });
</script>

{#if geometry}
    <g
        bind:this={ref}
        {...rest}
        class={["cs-chart-annotation", className]}
        data-tone={tone}
        data-custom-color={color ? "" : undefined}
        style:--cs-chart-annotation-color={color}
    >
        {#if geometry.leaderPath}
            <path class="cs-chart-annotation-leader" d={geometry.leaderPath} />
        {/if}

        <circle
            class="cs-chart-annotation-halo"
            cx={geometry.anchorX}
            cy={geometry.anchorY}
            r={ANCHOR_HALO_RADIUS}
        />

        <circle
            class="cs-chart-annotation-dot"
            cx={geometry.anchorX}
            cy={geometry.anchorY}
            r={ANCHOR_RADIUS}
        />

        <rect
            class="cs-chart-annotation-pill"
            x={geometry.pillX + 0.5}
            y={geometry.pillY + 0.5}
            width={geometry.pillW - 1}
            height={geometry.pillH - 1}
            rx={PILL_RADIUS}
        />

        <circle
            class="cs-chart-annotation-badge-dot"
            cx={geometry.badgeDotX}
            cy={geometry.badgeDotY}
            r={TONE_DOT_RADIUS}
        />

        <text
            class="cs-chart-annotation-text"
            x={geometry.textX}
            y={geometry.textY}
            text-anchor="start"
            dominant-baseline="central"
        >
            {label}
        </text>
    </g>
{/if}
