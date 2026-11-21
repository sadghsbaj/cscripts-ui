<script lang="ts" generics="TDatum = number | null | undefined">
    import "./charts.css";

    import {
        buildAreaPath,
        buildLinePath,
        buildRoundedBarPath,
        clampBarRadius,
        findNearestCoordinateIndex,
        snapHalf,
        snapInt,
        type BarCapSide,
        type ChartAreaPoint,
        type ChartLinePoint,
    } from "./chart-geometry.internal.ts";
    import { resolveToneColor } from "./chart-state.svelte.ts";
    import type { SparklineProps } from "./index.ts";

    interface SparklinePoint {
        readonly index: number;
        readonly x: number;
        readonly y: number;
        readonly value: number;
    }

    interface SparklineBar {
        readonly index: number;
        readonly x: number;
        readonly y: number;
        readonly width: number;
        readonly height: number;
        readonly centerX: number;
        readonly baseline: number;
        readonly value: number;
        readonly path: string;
        readonly delayMs: number;
    }

    let {
        ref = $bindable(null),
        svgRef = $bindable(null),
        data,
        value,
        type = "line",
        curve = "monotone",
        strokeWidth = 1.5,
        tone = "accent",
        color,
        target,
        showEndDot,
        includeZero,
        domain,
        interactive = false,
        activeIndex = $bindable<number | null>(null),
        onHover,
        height = 32,
        width = "100%",
        label,
        "aria-label": ariaLabel,
        onpointermove,
        onpointerleave,
        class: className,
        ...rest
    }: SparklineProps<TDatum> = $props();

    const uid = $props.id();
    const gradientId = `cs-chart-sparkline-grad-${uid}`;
    const revealClipId = `cs-chart-sparkline-reveal-${uid}`;

    let observedWidth = $state(0);
    let observedHeight = $state(0);
    let hasInteracted = $state(false);

    const resolvedShowEndDot = $derived(showEndDot ?? type !== "bar");
    const resolvedIncludeZero = $derived(includeZero ?? type === "bar");
    const resolvedColor = $derived(
        typeof color === "string" && color.length > 0 ? color : resolveToneColor(tone),
    );
    const resolvedHeightCss = $derived(typeof height === "number" ? `${height}px` : height);
    const resolvedWidthCss = $derived(typeof width === "number" ? `${width}px` : width);
    const resolvedLabel = $derived(label ?? ariaLabel ?? undefined);

    const resolvedWidth = $derived(
        observedWidth > 0
            ? Math.round(observedWidth)
            : typeof width === "number" && Number.isFinite(width) && width > 0
              ? Math.round(width)
              : 0,
    );
    const resolvedHeight = $derived(
        observedHeight > 0
            ? Math.round(observedHeight)
            : typeof height === "number" && Number.isFinite(height) && height > 0
              ? Math.round(height)
              : 0,
    );
    const hasSize = $derived(resolvedWidth > 0 && resolvedHeight > 0);

    const values = $derived.by((): readonly (number | null)[] => {
        const result: (number | null)[] = [];
        for (const [index, datum] of data.entries()) {
            let raw: unknown;
            if (typeof value === "function") {
                raw = value(datum, index);
            } else if (value !== undefined && datum !== null && typeof datum === "object") {
                raw = (datum as Record<PropertyKey, unknown>)[value];
            } else {
                raw = datum;
            }
            result.push(typeof raw === "number" && Number.isFinite(raw) ? raw : null);
        }
        return result;
    });

    const finiteStats = $derived.by(() => {
        let min = Infinity;
        let max = -Infinity;
        let count = 0;

        for (const entry of values) {
            if (entry === null) continue;
            if (entry < min) min = entry;
            if (entry > max) max = entry;
            count++;
        }

        return { min, max, count };
    });

    const yDomain = $derived.by((): readonly [number, number] | null => {
        const hasTarget = target !== undefined && Number.isFinite(target);
        if (finiteStats.count === 0 && !hasTarget) return null;

        let minVal = finiteStats.count > 0 ? finiteStats.min : (target ?? 0);
        let maxVal = finiteStats.count > 0 ? finiteStats.max : (target ?? 0);

        if (hasTarget && target !== undefined) {
            if (target < minVal) minVal = target;
            if (target > maxVal) maxVal = target;
        }

        if (resolvedIncludeZero) {
            if (minVal > 0) minVal = 0;
            if (maxVal < 0) maxVal = 0;
        }

        if (domain) {
            const [low, high] = domain;
            if (typeof low === "number" && Number.isFinite(low)) {
                minVal = low;
            } else if (low === "dataMin" && finiteStats.count > 0) {
                minVal = finiteStats.min;
            }
            if (typeof high === "number" && Number.isFinite(high)) {
                maxVal = high;
            } else if (high === "dataMax" && finiteStats.count > 0) {
                maxVal = finiteStats.max;
            }
        }

        if (minVal > maxVal) {
            const swap = minVal;
            minVal = maxVal;
            maxVal = swap;
        }

        // Expand degenerate flat domains so equal/single-point lines center cleanly at 50% height.
        if (minVal === maxVal) {
            if (type === "bar" && resolvedIncludeZero) {
                if (minVal === 0) return [0, 1];
                return minVal > 0 ? [0, maxVal] : [minVal, 0];
            }
            return [minVal - 1, maxVal + 1];
        }

        return [minVal, maxVal];
    });

    const padTop = $derived(
        type === "bar"
            ? Math.min(2, Math.floor(resolvedHeight / 6))
            : Math.min(4, Math.floor(resolvedHeight / 4)),
    );
    const padBottom = $derived(padTop);
    const padLeft = $derived(
        type === "bar" ? 0 : Math.min(interactive ? 4 : 1, Math.floor(resolvedWidth / 6)),
    );
    const padRight = $derived(
        type === "bar"
            ? 0
            : Math.min(resolvedShowEndDot || interactive ? 4 : 1, Math.floor(resolvedWidth / 6)),
    );
    const plotWidth = $derived(Math.max(1, resolvedWidth - padLeft - padRight));
    const plotHeight = $derived(Math.max(1, resolvedHeight - padTop - padBottom));

    function mapY(numeric: number): number {
        if (!yDomain) return padTop + plotHeight / 2;
        const [minVal, maxVal] = yDomain;
        const span = maxVal - minVal;
        if (!Number.isFinite(numeric) || !Number.isFinite(span) || span === 0) {
            return padTop + plotHeight / 2;
        }
        const ratio = (numeric - minVal) / span;
        return padTop + (1 - ratio) * plotHeight;
    }

    const lineGeometry = $derived.by(() => {
        if (!hasSize || !yDomain || values.length === 0 || type === "bar") {
            return {
                linePath: "",
                areaPath: "",
                points: [] as readonly (SparklinePoint | null)[],
                xCoords: [] as readonly number[],
                endPoint: null as SparklinePoint | null,
            };
        }

        const count = values.length;
        const areaBaseline = padTop + plotHeight;
        const linePoints: ChartLinePoint[] = [];
        const areaPoints: ChartAreaPoint[] = [];
        const points: (SparklinePoint | null)[] = [];
        const xCoords: number[] = [];
        let endPoint: SparklinePoint | null = null;

        for (const [index, entry] of values.entries()) {
            const x =
                padLeft + (count === 1 ? plotWidth / 2 : (index / (count - 1)) * plotWidth);
            xCoords.push(x);

            if (entry === null) {
                linePoints.push({ x, y: null, defined: false });
                areaPoints.push({ x, y0: null, y1: null, defined: false });
                points.push(null);
                continue;
            }

            const y = mapY(entry);
            linePoints.push({ x, y, defined: true });
            areaPoints.push({ x, y0: areaBaseline, y1: y, defined: true });
            const point: SparklinePoint = { index, x, y, value: entry };
            points.push(point);
            endPoint = point;
        }

        return {
            linePath: buildLinePath(linePoints, { curve, connectNulls: false }),
            areaPath:
                type === "area" ? buildAreaPath(areaPoints, { curve, connectNulls: false }) : "",
            points,
            xCoords,
            endPoint,
        };
    });

    const barGeometry = $derived.by(() => {
        if (!hasSize || !yDomain || values.length === 0 || type !== "bar") {
            return {
                bars: [] as readonly SparklineBar[],
                xCoords: [] as readonly number[],
            };
        }

        const count = values.length;
        const [minVal, maxVal] = yDomain;
        const gap = count <= 1 ? 0 : plotWidth / count >= 5 ? 2 : plotWidth / count >= 3 ? 1 : 0;
        const totalGap = gap * Math.max(0, count - 1);
        const rawBarWidth = (plotWidth - totalGap) / count;
        const barWidth = Math.max(1, rawBarWidth);
        const baselineY =
            minVal <= 0 && maxVal >= 0 ? mapY(0) : minVal > 0 ? padTop + plotHeight : padTop;
        const snappedBaseline = snapInt(baselineY);
        const bottomEdge = padTop + plotHeight;

        const bars: SparklineBar[] = [];
        const xCoords: number[] = [];

        for (const [index, entry] of values.entries()) {
            const xStart = padLeft + index * (barWidth + gap);
            const x = snapInt(xStart);
            const xNext = snapInt(xStart + barWidth);
            const w = Math.max(1, xNext - x);
            const centerX = x + w / 2;
            xCoords.push(centerX);

            if (entry === null) continue;

            const isNegative = entry < 0;
            const rawHeight = Math.abs(mapY(entry) - baselineY);
            let h = entry === 0 ? 0 : rawHeight < 2 ? 2 : snapInt(rawHeight);
            let y: number;

            if (isNegative) {
                y = snappedBaseline;
                h = Math.min(h, Math.max(0, bottomEdge - y));
            } else {
                y = Math.max(padTop, snappedBaseline - h);
                h = Math.max(0, snappedBaseline - y);
            }

            const capSide: BarCapSide = h === 0 ? "none" : isNegative ? "bottom" : "top";
            const radius = clampBarRadius(2, w, h);
            const path = buildRoundedBarPath(x, y, w, h, radius, capSide);

            bars.push({
                index,
                x,
                y,
                width: w,
                height: h,
                centerX,
                baseline: snappedBaseline,
                value: entry,
                path,
                delayMs: Math.min(index * 10, 100),
            });
        }

        return { bars, xCoords };
    });

    const targetY = $derived.by((): number | null => {
        if (!hasSize || !yDomain || target === undefined || !Number.isFinite(target)) return null;
        const mapped = snapHalf(mapY(target));
        if (!Number.isFinite(mapped) || mapped < 0 || mapped > resolvedHeight) return null;
        return mapped;
    });

    const scrubCoordinates = $derived(
        type === "bar" ? barGeometry.xCoords : lineGeometry.xCoords,
    );

    const resolvedActiveIndex = $derived.by((): number | null => {
        if (!interactive || activeIndex === null) return null;
        if (activeIndex < 0 || activeIndex >= values.length) return null;
        return activeIndex;
    });

    const activeLinePoint = $derived.by((): SparklinePoint | null => {
        if (type === "bar" || resolvedActiveIndex === null) return null;
        return lineGeometry.points[resolvedActiveIndex] ?? null;
    });

    const activeCrosshairX = $derived.by((): number | null => {
        if (type === "bar" || resolvedActiveIndex === null) return null;
        const coord = lineGeometry.xCoords[resolvedActiveIndex];
        return coord !== undefined && Number.isFinite(coord) ? snapHalf(coord) : null;
    });

    function handlePointerMove(event: PointerEvent): void {
        onpointermove?.(
            event as PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
        );
        if (!interactive || !hasSize || scrubCoordinates.length === 0) return;

        const host = svgRef ?? ref;
        if (!host) return;
        const rect = host.getBoundingClientRect();
        const localX = event.clientX - rect.left;
        const nearest = findNearestCoordinateIndex(localX, scrubCoordinates);

        if (nearest >= 0) {
            hasInteracted = true;
            if (nearest !== activeIndex) {
                activeIndex = nearest;
                onHover?.(nearest, values[nearest] ?? null, data[nearest] ?? null);
            }
        }
    }

    function handlePointerLeave(event: PointerEvent): void {
        onpointerleave?.(
            event as PointerEvent & { currentTarget: EventTarget & HTMLDivElement },
        );
        if (!interactive) return;
        if (activeIndex !== null) {
            activeIndex = null;
            onHover?.(null, null, null);
        }
    }

    $effect(() => {
        const el = ref;
        if (!el) return;

        const initialRect = el.getBoundingClientRect();
        if (initialRect.width > 0) observedWidth = initialRect.width;
        if (initialRect.height > 0) observedHeight = initialRect.height;

        let rafId: number | null = null;
        let pendingWidth = 0;
        let pendingHeight = 0;
        let observer: ResizeObserver | null = null;

        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver((entries) => {
                const entry = entries[0];
                if (!entry) return;
                pendingWidth = entry.contentRect.width;
                pendingHeight = entry.contentRect.height;

                if (rafId !== null) return;
                rafId = requestAnimationFrame(() => {
                    rafId = null;
                    observedWidth = pendingWidth;
                    observedHeight = pendingHeight;
                });
            });

            observer.observe(el);
        }

        return () => {
            observer?.disconnect();
            if (rafId !== null) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
        };
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-chart-sparkline", className]}
    data-type={type}
    data-tone={tone}
    data-interactive={interactive ? "" : undefined}
    data-has-active={resolvedActiveIndex !== null ? "" : undefined}
    style:block-size={resolvedHeightCss}
    style:inline-size={resolvedWidthCss}
    onpointermove={handlePointerMove}
    onpointerleave={handlePointerLeave}
>
    <svg
        bind:this={svgRef}
        class="cs-chart-sparkline-svg"
        width={resolvedWidth}
        height={resolvedHeight}
        viewBox={hasSize ? `0 0 ${resolvedWidth} ${resolvedHeight}` : undefined}
        role={resolvedLabel ? "img" : undefined}
        aria-label={resolvedLabel}
        aria-hidden={!resolvedLabel && !interactive ? "true" : undefined}
    >
        {#if hasSize}
            {#if type !== "bar"}
                <defs>
                    {#if type === "area"}
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop
                                class="cs-chart-sparkline-stop-top"
                                offset="0%"
                                stop-color={resolvedColor}
                            />
                            <stop
                                class="cs-chart-sparkline-stop-bottom"
                                offset="100%"
                                stop-color={resolvedColor}
                            />
                        </linearGradient>
                    {/if}
                    <clipPath id={revealClipId}>
                        <rect
                            class="cs-chart-sparkline-reveal-rect"
                            x="0"
                            y="0"
                            width={resolvedWidth}
                            height={resolvedHeight}
                        />
                    </clipPath>
                </defs>
            {/if}

            {#if targetY !== null}
                <line
                    class="cs-chart-sparkline-target"
                    x1={padLeft}
                    x2={padLeft + plotWidth}
                    y1={targetY}
                    y2={targetY}
                    stroke-dasharray="3 2"
                    shape-rendering="crispEdges"
                />
            {/if}

            {#if type === "bar"}
                <g class="cs-chart-sparkline-bars">
                    {#each barGeometry.bars as bar (bar.index)}
                        {#if bar.path}
                            <path
                                class="cs-chart-sparkline-bar"
                                d={bar.path}
                                fill={resolvedColor}
                                data-index={bar.index}
                                data-active={resolvedActiveIndex === bar.index ? "" : undefined}
                                style:--cs-chart-bar-origin="{bar.x}px {bar.baseline}px"
                                style:--cs-chart-bar-delay="{bar.delayMs}ms"
                            />
                        {/if}
                    {/each}
                </g>
            {:else}
                <g clip-path="url(#{revealClipId})">
                    {#if type === "area" && lineGeometry.areaPath}
                        <path
                            class="cs-chart-sparkline-area"
                            d={lineGeometry.areaPath}
                            fill="url(#{gradientId})"
                        />
                    {/if}
                    {#if lineGeometry.linePath}
                        <path
                            class="cs-chart-sparkline-line"
                            d={lineGeometry.linePath}
                            stroke={resolvedColor}
                            stroke-width={strokeWidth}
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    {/if}
                </g>

                {#if activeCrosshairX !== null}
                    <line
                        class="cs-chart-sparkline-crosshair"
                        x1={activeCrosshairX}
                        x2={activeCrosshairX}
                        y1={padTop}
                        y2={padTop + plotHeight}
                        shape-rendering="crispEdges"
                    />
                {/if}

                {#if resolvedShowEndDot && lineGeometry.endPoint !== null && resolvedActiveIndex !== lineGeometry.endPoint.index}
                    <circle
                        class="cs-chart-sparkline-dot"
                        data-settled={hasInteracted ? "" : undefined}
                        cx={lineGeometry.endPoint.x}
                        cy={lineGeometry.endPoint.y}
                        r="2.5"
                        fill={resolvedColor}
                    />
                {/if}

                {#if activeLinePoint !== null}
                    <circle
                        class="cs-chart-sparkline-dot"
                        data-active=""
                        cx={activeLinePoint.x}
                        cy={activeLinePoint.y}
                        r="2.5"
                        fill={resolvedColor}
                    />
                {/if}
            {/if}
        {/if}
    </svg>
</div>
