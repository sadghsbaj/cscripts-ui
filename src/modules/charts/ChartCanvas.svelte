<script lang="ts" generics="TDatum = ChartDatum">
    import { untrack } from "svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { bisectSortedValues, findNearestCoordinateIndex } from "./chart-geometry.internal.ts";
    import type { ChartDatum } from "./chart-state.svelte.ts";
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
        onPointClick,
        onpointerenter,
        onpointermove,
        onpointerleave,
        onclick,
        onkeydown,
        onfocus,
        onblur,
        class: className,
        children,
        overlay,
        ...rest
    }: ChartCanvasProps<TDatum> = $props();

    const chart = getChartContext<TDatum>();
    const uid = $props.id();
    const clipId = `cs-chart-clip-${uid}`;

    const resolvedHeight = $derived(typeof height === "number" ? `${height}px` : height);
    const resolvedLabel = $derived(label ?? rest["aria-label"] ?? undefined);
    const resolvedLabelledBy = $derived(labelledBy ?? rest["aria-labelledby"] ?? undefined);

    const xCoordinates = $derived.by((): readonly number[] => {
        if (!chart.hasSize || chart.xValues.length === 0) return [];
        return chart.xValues.map((value) => chart.xScale.center(value));
    });

    const isAscendingCoords = $derived.by((): boolean => {
        for (let index = 1; index < xCoordinates.length; index++) {
            const prev = xCoordinates[index - 1];
            const curr = xCoordinates[index];
            if (prev !== undefined && curr !== undefined && curr < prev) {
                return false;
            }
        }
        return true;
    });

    const liveAnnouncement = $derived.by((): string => {
        if (!interactive) return "";
        const ctx = chart.getTooltipContext();
        if (!ctx) return "";
        if (ctx.items.length === 0) return ctx.xLabel;
        const summary = ctx.items
            .map((item) => `${item.series.label} ${item.formatted}`)
            .join(", ");
        return `${ctx.xLabel}: ${summary}`;
    });

    function identityCoord(coord: number): number {
        return coord;
    }

    function syncSvgRect(): void {
        const target = svgRef ?? ref;
        if (!target) {
            chart.setSvgRect(null);
            return;
        }
        const rect = target.getBoundingClientRect();
        chart.setSvgRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        });
    }

    function resolveNearestIndex(axisCoord: number): number {
        if (xCoordinates.length === 0 || !Number.isFinite(axisCoord)) return -1;
        if (isAscendingCoords) {
            return bisectSortedValues(xCoordinates, axisCoord, identityCoord);
        }
        return findNearestCoordinateIndex(axisCoord, xCoordinates);
    }

    function resolvePointerPlotPoint(
        clientX: number,
        clientY: number,
    ): { plotX: number; plotY: number; index: number } | null {
        if (!chart.hasSize || chart.data.length === 0) return null;

        let rect = untrack(() => chart.svgRect);
        if (!rect) {
            syncSvgRect();
            rect = untrack(() => chart.svgRect);
        }
        if (!rect) return null;

        const plotX = clientX - rect.left - chart.margins.left;
        const plotY = clientY - rect.top - chart.margins.top;
        const edgeTolerance = 12;

        if (
            plotX < -edgeTolerance ||
            plotX > chart.plotWidth + edgeTolerance ||
            plotY < -edgeTolerance ||
            plotY > chart.plotHeight + edgeTolerance
        ) {
            return null;
        }

        const axisCoord = chart.orientation === "horizontal" ? plotY : plotX;
        const index = resolveNearestIndex(axisCoord);
        if (index < 0) return null;

        return { plotX, plotY, index };
    }

    function handlePointerEnter(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointerenter?.(event);
        if (!interactive) return;
        syncSvgRect();
    }

    function handlePointerMove(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointermove?.(event);
        if (!interactive) return;

        const hit = resolvePointerPlotPoint(event.clientX, event.clientY);
        if (!hit) {
            chart.setActiveIndex(null);
            chart.setPointerPosition(null);
            return;
        }

        chart.setActiveIndex(hit.index);
        chart.setPointerPosition({ x: hit.plotX, y: hit.plotY });
    }

    function handlePointerLeave(
        event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onpointerleave?.(event);
        if (!interactive) return;
        chart.setActiveIndex(null);
        chart.setPointerPosition(null);
    }

    function handleClick(
        event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onclick?.(event);
        if (!interactive || !onPointClick || chart.data.length === 0) return;

        let index = chart.activeIndex;
        if (index === null) {
            const hit = resolvePointerPlotPoint(event.clientX, event.clientY);
            index = hit ? hit.index : null;
        }
        if (index === null) return;

        const datum = chart.data[index];
        if (datum !== undefined) {
            onPointClick(datum, index);
        }
    }

    function handleFocus(
        event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onfocus?.(event);
        if (!interactive) return;
        syncSvgRect();
    }

    function handleBlur(
        event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onblur?.(event);
        if (!interactive) return;
        chart.setActiveIndex(null);
        chart.setPointerPosition(null);
    }

    function handleKeyDown(
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement },
    ): void {
        onkeydown?.(event);
        if (event.defaultPrevented || !interactive || chart.data.length === 0) return;

        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown": {
                event.preventDefault();
                syncSvgRect();
                chart.stepActiveIndex(1);
                return;
            }
            case "ArrowLeft":
            case "ArrowUp": {
                event.preventDefault();
                syncSvgRect();
                chart.stepActiveIndex(-1);
                return;
            }
            case "Home": {
                event.preventDefault();
                syncSvgRect();
                chart.setActiveIndex(0);
                return;
            }
            case "End": {
                event.preventDefault();
                syncSvgRect();
                chart.setActiveIndex(chart.data.length - 1);
                return;
            }
            case "Escape": {
                if (chart.activeIndex !== null) {
                    event.preventDefault();
                    chart.setActiveIndex(null);
                    chart.setPointerPosition(null);
                }
                return;
            }
            case "Enter":
            case " ": {
                if (chart.activeIndex !== null) {
                    event.preventDefault();
                    const datum = chart.data[chart.activeIndex];
                    if (datum !== undefined) {
                        onPointClick?.(datum, chart.activeIndex);
                    }
                }
                return;
            }
            default: {
                return;
            }
        }
    }

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
        syncSvgRect();

        let scrollRafId: number | null = null;
        function handleViewportShift(): void {
            if (scrollRafId !== null) return;
            scrollRafId = requestAnimationFrame(() => {
                scrollRafId = null;
                syncSvgRect();
            });
        }

        window.addEventListener("scroll", handleViewportShift, { passive: true, capture: true });
        window.addEventListener("resize", handleViewportShift, { passive: true });

        let resizeRafId: number | null = null;
        let pendingWidth = 0;
        let pendingHeight = 0;
        let observer: ResizeObserver | null = null;

        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (!entry) return;
                pendingWidth = entry.contentRect.width;
                pendingHeight = entry.contentRect.height;

                if (resizeRafId !== null) return;
                resizeRafId = requestAnimationFrame(() => {
                    resizeRafId = null;
                    chart.setDimensions(pendingWidth, pendingHeight);
                    syncSvgRect();
                });
            });

            observer.observe(el);
        }

        return () => {
            window.removeEventListener("scroll", handleViewportShift, { capture: true });
            window.removeEventListener("resize", handleViewportShift);
            observer?.disconnect();
            if (scrollRafId !== null) {
                cancelAnimationFrame(scrollRafId);
                scrollRafId = null;
            }
            if (resizeRafId !== null) {
                cancelAnimationFrame(resizeRafId);
                resizeRafId = null;
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
    data-scrubbing={chart.scrubbing ? "" : undefined}
    style:block-size={resolvedHeight}
    style:min-block-size={resolvedHeight ? "0px" : undefined}
    style:aspect-ratio={aspectRatio}
    onpointerenter={handlePointerEnter}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
    onclick={handleClick}
    onkeydown={handleKeyDown}
    onfocus={handleFocus}
    onblur={handleBlur}
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
    {#if interactive}
        <div class="cs-chart-sr-live" aria-live="polite" aria-atomic="true">
            {liveAnnouncement}
        </div>
    {/if}
</div>
