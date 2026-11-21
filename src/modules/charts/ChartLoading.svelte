<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import type { ChartLoadingProps } from "./index.ts";

    const BAR_VIEWBOX_HEIGHT = 180;
    const BAR_WIDTH = 40;
    const BAR_GAP = 20;
    const BAR_INSET_X = 10;
    const BAR_RADIUS = 4;
    const BAR_HEIGHT_RATIOS = [0.38, 0.62, 0.48, 0.78, 0.55, 0.86, 0.64] as const;

    const BAR_PATHS = BAR_HEIGHT_RATIOS.map((ratio, index) => {
        const x = BAR_INSET_X + index * (BAR_WIDTH + BAR_GAP);
        const h = BAR_VIEWBOX_HEIGHT * ratio;
        const y = BAR_VIEWBOX_HEIGHT - h;
        const r = Math.min(BAR_RADIUS, BAR_WIDTH / 2, h);
        return `M${x},${BAR_VIEWBOX_HEIGHT} V${y + r} Q${x},${y} ${x + r},${y} H${x + BAR_WIDTH - r} Q${x + BAR_WIDTH},${y} ${x + BAR_WIDTH},${y + r} V${BAR_VIEWBOX_HEIGHT} Z`;
    });

    const LINE_AREA_PATH =
        "M0,128 C35,112 45,94 75,96 C105,98 115,118 145,114 C175,110 185,60 218,62 C251,64 260,88 292,84 C324,80 336,36 368,38 C392,40 406,48 420,54 L420,180 L0,180 Z";

    // Outer circle clockwise + inner circle counter-clockwise at innerRadiusRatio 0.68 (51.68 / 76).
    const DONUT_RING_PATH =
        "M90,14 A76,76 0 1,1 90,166 A76,76 0 1,1 90,14 Z M90,38.32 A51.68,51.68 0 1,0 90,141.68 A51.68,51.68 0 1,0 90,38.32 Z";

    let {
        ref = $bindable(null),
        shape = "bars",
        label,
        class: className,
        children,
        ...rest
    }: ChartLoadingProps = $props();

    const uid = $props.id();
    const clipId = `${uid}-clip`;
    const gradientId = `${uid}-shimmer`;

    const resolvedLabel = $derived(
        label ?? t({ de: "Diagramm wird geladen", en: "Loading chart" }),
    );

    const viewBox = $derived(shape === "donut" ? "0 0 180 180" : "0 0 420 180");
    const preserveAspectRatio = $derived(
        shape === "line"
            ? "none"
            : shape === "donut"
              ? "xMidYMid meet"
              : "xMidYMax meet",
    );
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-loading", className]}
    data-shape={shape}
    role="status"
    aria-busy="true"
    aria-label={resolvedLabel}
>
    {#if children}
        {@render children()}
    {:else}
        <svg
            class="cs-chart-loading-svg"
            {viewBox}
            {preserveAspectRatio}
            aria-hidden="true"
        >
            <defs>
                <clipPath id={clipId}>
                    {#if shape === "bars"}
                        {#each BAR_PATHS as d, index (index)}
                            <path class="cs-chart-loading-bar" {d} />
                        {/each}
                    {:else if shape === "line"}
                        <path class="cs-chart-loading-line" d={LINE_AREA_PATH} />
                    {:else}
                        <path
                            class="cs-chart-loading-donut"
                            clip-rule="evenodd"
                            d={DONUT_RING_PATH}
                        />
                    {/if}
                </clipPath>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" class="cs-chart-loading-stop-base" />
                    <stop offset="34%" class="cs-chart-loading-stop-base" />
                    <stop offset="50%" class="cs-chart-loading-stop-shimmer" />
                    <stop offset="66%" class="cs-chart-loading-stop-base" />
                    <stop offset="100%" class="cs-chart-loading-stop-base" />
                </linearGradient>
            </defs>
            <g clip-path={`url(#${clipId})`}>
                <!-- 300% width keeps the shimmer band off-viewport at both animation endpoints so reduced-motion rests on flat --cs-chart-loading-bg. -->
                <rect
                    class="cs-chart-loading-shimmer"
                    x="-100%"
                    y="0"
                    width="300%"
                    height="100%"
                    fill={`url(#${gradientId})`}
                />
            </g>
        </svg>
    {/if}
</div>
