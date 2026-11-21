<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartCanvasProps } from "./index.ts";

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        height,
        aspectRatio,
        interactive = true,
        orientation,
        margin,
        label,
        labelledBy,
        class: className,
        children,
        overlay,
        ...rest
    }: ChartCanvasProps = $props();

    const chart = getChartContext();
    const uid = $props.id();
    const clipId = `cs-chart-clip-${uid}`;

    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const resolvedLabel = $derived(label ?? rest["aria-label"] ?? undefined);
    const resolvedLabelledBy = $derived(labelledBy ?? rest["aria-labelledby"] ?? undefined);

    $effect.pre(() => {
        chart.plotClipId = clipId;
        if (orientation !== undefined) {
            chart.orientation = orientation;
        }
        if (margin !== undefined) {
            chart.marginOverrides = margin;
        }
    });

    $effect(() => {
        const el = ref;
        if (!el) return;

        // Seed initial dimensions synchronously when layout is available so the first paint avoids a 0x0 flash.
        const initialRect = el.getBoundingClientRect();
        if (initialRect.width > 0 && initialRect.height > 0) {
            chart.setDimensions(initialRect.width, initialRect.height);
        }

        if (typeof ResizeObserver === "undefined") return;

        let rafId: number | null = null;
        let pendingWidth = 0;
        let pendingHeight = 0;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            pendingWidth = entry.contentRect.width;
            pendingHeight = entry.contentRect.height;

            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                rafId = null;
                chart.setDimensions(pendingWidth, pendingHeight);
            });
        });

        observer.observe(el);

        return () => {
            observer.disconnect();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };
    });
</script>

<!-- role="application" is bound dynamically when interactive keyboard scrubbing is enabled. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-canvas", className]}
    role={interactive ? "application" : rest.role}
    aria-roledescription={interactive ? t({ de: "Diagramm", en: "chart" }) : rest["aria-roledescription"]}
    aria-label={interactive && !resolvedLabelledBy
        ? (resolvedLabel ?? t({ de: "Interaktives Diagramm", en: "Interactive chart" }))
        : resolvedLabel}
    aria-labelledby={resolvedLabelledBy}
    tabindex={interactive ? 0 : rest.tabindex}
    data-interactive={interactive ? "" : undefined}
    style:block-size={resolvedHeight}
    style:min-block-size={resolvedHeight ? "0px" : undefined}
    style:aspect-ratio={aspectRatio}
>
    <svg
        bind:this={svgRef}
        class="cs-chart-svg"
        width={chart.containerWidth}
        height={chart.containerHeight}
        role={label || labelledBy ? "img" : undefined}
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-hidden={!label && !labelledBy ? "true" : undefined}
    >
        {#if chart.hasSize}
            <defs>
                <clipPath id={clipId}>
                    <rect x="0" y="0" width={chart.plotWidth} height={chart.plotHeight} />
                </clipPath>
            </defs>
            <g
                class="cs-chart-plot"
                transform="translate({chart.margins.left}, {chart.margins.top})"
            >
                {@render children?.()}
            </g>
        {/if}
    </svg>
    {@render overlay?.()}
</div>
