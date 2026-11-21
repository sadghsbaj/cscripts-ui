<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { NumberMorph, type NumberMorphProps } from "../number-morph/index.ts";
    import { formatDefaultTick } from "./chart-scales.internal.ts";
    import type { ChartDatum, ChartTooltipContext } from "./chart-state.svelte.ts";
    import { getChartContext } from "./chart.context.ts";
    import type { ChartTooltipProps } from "./index.ts";

    type MorphTiming = NonNullable<NumberMorphProps["transformTiming"]>;

    const EDGE_CLEARANCE = 8;
    const FLIP_HYSTERESIS = 16;

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
        showTotal = false,
        morph = true,
        formatX,
        formatTotal,
        numberFormat,
        locales,
        offset = 12,
        class: className,
        children,
        ...rest
    }: ChartTooltipProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();

    const tooltipContext = $derived.by((): ChartTooltipContext<TDatum> | null => {
        if (chart.tooltipMode === "none") return null;
        const ctx = chart.getTooltipContext();
        if (!ctx) return null;
        if (!formatX) return ctx;
        return {
            ...ctx,
            xLabel: formatX(ctx.xValue),
        };
    });

    const isOpen = $derived(
        chart.tooltipMode !== "none" && tooltipContext !== null && chart.activeAnchor !== null,
    );
    const isItemTooltip = $derived(chart.tooltipMode === "item" && chart.activeSeriesId !== null);
    const yAxisPosition = $derived(chart.orientation === "horizontal" ? "bottom" : "left");
    const effectiveYFormat = $derived(chart.getEffectiveAxisConfig(yAxisPosition).format);
    const effectiveY2Format = $derived(chart.getEffectiveAxisConfig("right").format);

    let coords = $state<{ readonly x: number; readonly y: number }>({ x: 0, y: 0 });
    let side = $state<"end" | "start">("end");
    let gliding = $state(false);
    let wasOpen = false;
    let glideRafId: number | null = null;

    function cancelGlideRaf(): void {
        if (glideRafId === null) return;
        cancelAnimationFrame(glideRafId);
        glideRafId = null;
    }

    function safeShowPopover(el: HTMLDivElement): void {
        if (typeof el.showPopover !== "function") return;
        try {
            if (!el.matches(":popover-open")) {
                el.showPopover();
            }
        } catch {
            // Ignore when the Popover API is unavailable or element is detached.
        }
    }

    function safeHidePopover(el: HTMLDivElement): void {
        if (typeof el.hidePopover !== "function") return;
        try {
            if (el.matches(":popover-open")) {
                el.hidePopover();
            }
        } catch {
            // Ignore when already closed or unsupported.
        }
    }

    function formatTotalFallback(value: number): string {
        if (formatTotal) return formatTotal(value);
        if (effectiveYFormat) return effectiveYFormat(value);
        return formatDefaultTick(value);
    }

    $effect(() => {
        const el = ref;
        const anchor = chart.activeAnchor;
        const open = isOpen;

        if (!el || !open || !anchor) {
            if (wasOpen) {
                cancelGlideRaf();
                wasOpen = false;
                gliding = false;
                side = "end";
                if (el) safeHidePopover(el);
            }
            return;
        }

        const isFirstOpen = !wasOpen;
        if (isFirstOpen) {
            safeShowPopover(el);
        }

        const tooltipWidth = el.offsetWidth > 0 ? el.offsetWidth : 168;
        const tooltipHeight = el.offsetHeight > 0 ? el.offsetHeight : 64;
        const viewportWidth = typeof window !== "undefined" && window.innerWidth > 0 ? window.innerWidth : 1024;
        const viewportHeight = typeof window !== "undefined" && window.innerHeight > 0 ? window.innerHeight : 768;

        const currentSide = untrack(() => side);
        let nextSide: "end" | "start" = currentSide;

        const rightEdge = anchor.clientX + offset + tooltipWidth + EDGE_CLEARANCE;
        const leftSpace = anchor.clientX - offset - EDGE_CLEARANCE;
        const rightSpace = viewportWidth - (anchor.clientX + offset + EDGE_CLEARANCE);

        if (currentSide === "end") {
            if (rightEdge > viewportWidth && (leftSpace >= tooltipWidth || leftSpace > rightSpace)) {
                nextSide = "start";
            }
        } else if (rightEdge + FLIP_HYSTERESIS <= viewportWidth) {
            nextSide = "end";
        }

        const rawX =
            nextSide === "end" ? anchor.clientX + offset : anchor.clientX - offset - tooltipWidth;
        const maxX = Math.max(EDGE_CLEARANCE, viewportWidth - tooltipWidth - EDGE_CLEARANCE);
        const clampedX = Math.max(EDGE_CLEARANCE, Math.min(maxX, rawX));

        const rawY = anchor.clientY - tooltipHeight / 2;
        const maxY = Math.max(EDGE_CLEARANCE, viewportHeight - tooltipHeight - EDGE_CLEARANCE);
        const clampedY = Math.max(EDGE_CLEARANCE, Math.min(maxY, rawY));

        const snappedX = Math.round(clampedX);
        const snappedY = Math.round(clampedY);

        if (!isFirstOpen) {
            coords = { x: snappedX, y: snappedY };
            side = nextSide;
            return;
        }

        // Snap coordinates immediately before enabling scrub glide so the tooltip never flies in from (0, 0).
        cancelGlideRaf();
        gliding = false;
        coords = { x: snappedX, y: snappedY };
        side = nextSide;
        wasOpen = true;

        if (typeof requestAnimationFrame !== "function") return;

        glideRafId = requestAnimationFrame(() => {
            glideRafId = null;
            if (wasOpen) {
                gliding = true;
            }
        });
    });

    function cleanupPopover(): void {
        cancelGlideRaf();
        wasOpen = false;
        gliding = false;
        side = "end";
        if (ref) safeHidePopover(ref);
    }

    $effect(() => cleanupPopover);
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-tooltip", className]}
    popover="manual"
    role="presentation"
    aria-hidden={!isOpen ? "true" : undefined}
    data-open={isOpen ? "" : undefined}
    data-gliding={gliding ? "" : undefined}
    data-side={side}
    style:transform="translate3d({coords.x}px, {coords.y}px, 0)"
>
    {#if tooltipContext}
        {#if children}
            {@render children(tooltipContext)}
        {:else}
            <div class="cs-chart-tooltip-header">{tooltipContext.xLabel}</div>

            {#if tooltipContext.items.length > 0}
                <div class="cs-chart-tooltip-list">
                    {#each tooltipContext.items as item (item.series.id)}
                        {const hasCustomFormat = $derived(
                            Boolean(
                                item.series.format ??
                                    (item.series.yAxis === "right"
                                        ? effectiveY2Format
                                        : effectiveYFormat),
                            ),
                        )}
                        <span
                            class="cs-chart-tooltip-swatch"
                            style:--cs-chart-swatch-color={item.color}
                            aria-hidden="true"
                        ></span>
                        <span class="cs-chart-tooltip-label">{item.series.label}</span>
                        <span class="cs-chart-tooltip-value">
                            {#if item.value === null}
                                &mdash;
                            {:else if morph && !hasCustomFormat}
                                <NumberMorph
                                    value={item.value}
                                    format={numberFormat}
                                    {locales}
                                    willChange={false}
                                    respectMotionPreference={true}
                                    transformTiming={TOOLTIP_MORPH_TIMING}
                                    spinTiming={TOOLTIP_MORPH_TIMING}
                                    opacityTiming={TOOLTIP_OPACITY_TIMING}
                                />
                            {:else}
                                {item.formatted}
                            {/if}
                        </span>
                    {/each}
                </div>
            {/if}

            {#if showTotal && tooltipContext.total !== undefined && !isItemTooltip}
                <div class="cs-chart-tooltip-total">
                    <span class="cs-chart-tooltip-total-label">
                        {t({ de: "Gesamt", en: "Total" })}
                    </span>
                    <span class="cs-chart-tooltip-total-value">
                        {#if morph && !formatTotal && !effectiveYFormat}
                            <NumberMorph
                                value={tooltipContext.total}
                                format={numberFormat}
                                {locales}
                                willChange={false}
                                respectMotionPreference={true}
                                transformTiming={TOOLTIP_MORPH_TIMING}
                                spinTiming={TOOLTIP_MORPH_TIMING}
                                opacityTiming={TOOLTIP_OPACITY_TIMING}
                            />
                        {:else}
                            {formatTotalFallback(tooltipContext.total)}
                        {/if}
                    </span>
                </div>
            {/if}
        {/if}
    {/if}
</div>
