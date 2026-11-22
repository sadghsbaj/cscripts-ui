<script lang="ts">
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";

    import { t } from "../../shared/lang.internal.ts";
    import { rovingFocus } from "../focus/index.ts";
    import { HitArea } from "../hit-area/index.ts";
    import { scrollFade } from "../scroll-fade/index.ts";
    import {
        buildPushPullKeyframes,
        computeClipOffsets,
        measureIndicatorMetrics,
        parseComputedClipPath,
        type IndicatorMetrics,
    } from "./tabs-indicator.internal.ts";
    import {
        getOverflowState,
        getScrollIntoViewDelta,
        getStepScrollDelta,
        isRtlViewport,
        resolveFadeReserve,
        type ScrollStepDirection,
    } from "./tabs-scroll.internal.ts";
    import { getTabsContext } from "./tabs.context.ts";
    import type { TabsListProps, TabsOrientation } from "./tabs.types.ts";

    let {
        ref = $bindable(null),
        class: className,
        role = "tablist",
        children,
        onfocusout,
        onpointerdown,
        ...rest
    }: TabsListProps = $props();

    const tabs = getTabsContext();

    let viewportEl = $state<HTMLDivElement | null>(null);
    let trackEl = $state<HTMLDivElement | null>(null);
    let indicatorEl = $state<HTMLDivElement | null>(null);

    let clipStart = $state(0);
    let clipEnd = $state(0);
    let hasActiveIndicator = $state(false);
    let canScrollPrev = $state(false);
    let canScrollNext = $state(false);
    let isArrowNav = $state(false);

    let prevMetrics: IndicatorMetrics | null = null;
    let prevOrientation: TabsOrientation | null = null;
    let prevValue: string | undefined;
    let activeAnimation: Animation | null = null;

    function isReducedMotion(): boolean {
        return (
            typeof window !== "undefined" &&
            typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    function metricsEqual(a: IndicatorMetrics, b: IndicatorMetrics): boolean {
        return (
            Math.abs(a.start - b.start) < 0.5 &&
            Math.abs(a.size - b.size) < 0.5 &&
            Math.abs(a.trackSize - b.trackSize) < 0.5
        );
    }

    function cancelActiveAnimation(): void {
        if (!activeAnimation) return;
        const anim = activeAnimation;
        activeAnimation = null;
        anim.cancel();
    }

    function syncIndicator(allowAnimation: boolean): void {
        if (tabs.value === undefined || !trackEl) {
            cancelActiveAnimation();
            hasActiveIndicator = false;
            prevMetrics = null;
            prevValue = tabs.value;
            return;
        }
        const activeEl = tabs.getTriggerElement(tabs.value);
        if (!activeEl) {
            cancelActiveAnimation();
            hasActiveIndicator = false;
            prevMetrics = null;
            prevValue = tabs.value;
            return;
        }

        const nextMetrics = measureIndicatorMetrics(activeEl, trackEl, tabs.orientation);
        const offsets = computeClipOffsets(nextMetrics);

        // ResizeObserver fires an initial callback on observe(); preserve running tab animations when geometry is unchanged.
        if (
            !allowAnimation &&
            prevMetrics &&
            prevOrientation === tabs.orientation &&
            metricsEqual(prevMetrics, nextMetrics)
        ) {
            return;
        }

        const canAnimate =
            allowAnimation &&
            prevMetrics !== null &&
            prevOrientation === tabs.orientation &&
            indicatorEl !== null &&
            typeof indicatorEl.animate === "function" &&
            !isReducedMotion();

        if (!canAnimate || !prevMetrics || !indicatorEl) {
            cancelActiveAnimation();
            clipStart = offsets.start;
            clipEnd = offsets.end;
        } else {
            let effectivePrevMetrics: IndicatorMetrics;

            if (activeAnimation) {
                const currentOffsets = parseComputedClipPath(
                    getComputedStyle(indicatorEl).clipPath,
                    tabs.orientation
                ) ?? { start: clipStart, end: clipEnd };
                cancelActiveAnimation();
                effectivePrevMetrics = {
                    start: currentOffsets.start,
                    size: Math.max(0, nextMetrics.trackSize - currentOffsets.start - currentOffsets.end),
                    trackSize: nextMetrics.trackSize,
                };
            } else {
                effectivePrevMetrics = prevMetrics;
            }

            const animParams = buildPushPullKeyframes(effectivePrevMetrics, nextMetrics, tabs.orientation);
            clipStart = offsets.start;
            clipEnd = offsets.end;

            if (animParams) {
                const anim = indicatorEl.animate(animParams.keyframes, {
                    duration: animParams.durationMs,
                    easing: "linear",
                    fill: "none",
                });
                activeAnimation = anim;
                const clearIfCurrent = (): void => {
                    if (activeAnimation === anim) activeAnimation = null;
                };
                anim.addEventListener("finish", clearIfCurrent);
                anim.addEventListener("cancel", clearIfCurrent);
            }
        }

        prevMetrics = nextMetrics;
        prevOrientation = tabs.orientation;
        prevValue = tabs.value;
        hasActiveIndicator = true;
    }

    function syncOverflow(): void {
        if (tabs.orientation !== "horizontal" || !viewportEl) {
            canScrollPrev = false;
            canScrollNext = false;
            return;
        }
        const state = getOverflowState(viewportEl);
        canScrollPrev = state.canScrollPrev;
        canScrollNext = state.canScrollNext;
    }

    function scrollItemIntoView(item: HTMLElement): void {
        if (!viewportEl) return;
        const fadeReserve = resolveFadeReserve(viewportEl);
        const isRtl = isRtlViewport(viewportEl);
        const delta = getScrollIntoViewDelta(viewportEl, item, fadeReserve, isRtl);
        if (Math.abs(delta) > 1) {
            viewportEl.scrollBy({ left: delta, behavior: isReducedMotion() ? "auto" : "smooth" });
        }
    }

    function handleStepScroll(direction: ScrollStepDirection): void {
        if (!viewportEl || !trackEl) return;
        const items = [...trackEl.querySelectorAll<HTMLElement>(".cs-tabs-trigger")].filter(
            (el) => el.closest(".cs-tabs-list") === trackEl
        );
        const fadeReserve = resolveFadeReserve(viewportEl);
        const isRtl = isRtlViewport(viewportEl);
        const delta = getStepScrollDelta(viewportEl, items, direction, fadeReserve, isRtl);
        if (Math.abs(delta) > 1) {
            viewportEl.scrollBy({ left: delta, behavior: isReducedMotion() ? "auto" : "smooth" });
        }
    }

    function handleFocusOut(event: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onfocusout?.(event);
        const related = event.relatedTarget;
        if (!(related instanceof Node) || !event.currentTarget.contains(related)) {
            isArrowNav = false;
        }
    }

    function handlePointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointerdown?.(event);
        isArrowNav = false;
    }

    const isOverflowing = $derived(canScrollPrev || canScrollNext);

    // Sync indicator synchronously on value/item/layout changes; animate only on value changes.
    $effect(() => {
        const nextValue = tabs.value;
        void tabs.orientation;
        void tabs.width;
        void tabs.size;
        void tabs.triggerCount;
        syncIndicator(nextValue !== prevValue);
    });

    $effect(() => {
        if (!viewportEl || !trackEl) return;

        syncOverflow();

        if (typeof ResizeObserver !== "function") return;
        const activeEl = tabs.value !== undefined ? tabs.getTriggerElement(tabs.value) : undefined;
        const observer = new ResizeObserver(() => {
            syncIndicator(false);
            syncOverflow();
        });

        observer.observe(viewportEl);
        observer.observe(trackEl);
        if (activeEl) {
            observer.observe(activeEl);
        }

        return () => observer.disconnect();
    });
</script>

<div
    bind:this={ref}
    class={["cs-tabs-list-shell", className]}
    data-overflowing={isOverflowing ? "" : undefined}
>
    {#if tabs.orientation === "horizontal"}
        <button
            type="button"
            class="cs-tabs-scroll-btn"
            data-direction="prev"
            data-visible={canScrollPrev ? "" : undefined}
            tabindex="-1"
            aria-label={t({ de: "Vorherige Tabs", en: "Previous tabs" })}
            onclick={() => handleStepScroll("prev")}
        >
            <HitArea size="sm" />
            <ChevronLeft aria-hidden="true" class="cs-tabs-scroll-icon" />
        </button>
    {/if}

    <div
        bind:this={viewportEl}
        class="cs-tabs-viewport"
        data-scroll-prev={canScrollPrev ? "" : undefined}
        data-scroll-next={canScrollNext ? "" : undefined}
        onscroll={syncOverflow}
        {@attach scrollFade({
            size: "md",
            direction: "horizontal",
            edges: "both",
            enabled: () => tabs.orientation === "horizontal",
        })}
    >
        <div
            bind:this={trackEl}
            {...rest}
            {role}
            aria-orientation={role === "tablist" ? tabs.orientation : undefined}
            class="cs-tabs-list"
            data-arrow-nav={isArrowNav ? "" : undefined}
            onfocusout={handleFocusOut}
            onpointerdown={handlePointerDown}
            {@attach rovingFocus({
                orientation: () => tabs.orientation,
                loop: () => tabs.loop,
                homeEnd: true,
                dir: "auto",
                preventScroll: true,
                enabled: () => !tabs.disabled,
                items: ":scope > .cs-tabs-trigger:not(:disabled, [aria-disabled='true'])",
                initialActive: (items) =>
                    items.find(
                        (el) =>
                            el.getAttribute("aria-selected") === "true" ||
                            el.getAttribute("aria-current") === "page"
                    ) ??
                    items[0] ??
                    null,
                onActiveChange: ({ activeItem, reason }) => {
                    if (reason !== "keyboard") return;
                    isArrowNav = true;
                    if (tabs.orientation === "horizontal") {
                        scrollItemIntoView(activeItem);
                    } else {
                        activeItem.scrollIntoView({ block: "nearest" });
                    }
                    if (
                        tabs.activationMode === "automatic" &&
                        !(activeItem instanceof HTMLAnchorElement && activeItem.hasAttribute("href"))
                    ) {
                        const nextValue = activeItem.dataset.value;
                        if (nextValue !== undefined) {
                            tabs.select(nextValue);
                        }
                    }
                },
            })}
        >
            <div
                bind:this={indicatorEl}
                aria-hidden="true"
                class="cs-tabs-indicator"
                data-active={hasActiveIndicator ? "" : undefined}
                style:--cs-tabs-clip-start={`${clipStart}px`}
                style:--cs-tabs-clip-end={`${clipEnd}px`}
            ></div>
            {@render children?.()}
        </div>
    </div>

    {#if tabs.orientation === "horizontal"}
        <button
            type="button"
            class="cs-tabs-scroll-btn"
            data-direction="next"
            data-visible={canScrollNext ? "" : undefined}
            tabindex="-1"
            aria-label={t({ de: "Nächste Tabs", en: "Next tabs" })}
            onclick={() => handleStepScroll("next")}
        >
            <HitArea size="sm" />
            <ChevronRight aria-hidden="true" class="cs-tabs-scroll-icon" />
        </button>
    {/if}
</div>
