<script lang="ts" generics="T extends string = string">
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";
    import { SvelteMap } from "svelte/reactivity";

    import { rovingFocus } from "../focus/roving-focus.attach.ts";
    import { scrollFade } from "../scroll-fade/scroll-fade.attach.ts";
    import { setSegmentedControlContext, type SegmentedControlProps } from "./index.ts";
    import {
        getOverflowState,
        getScrollIntoViewDelta,
        getStepScrollDelta,
        isRtlViewport,
        resolveFadeReserve,
        type ScrollStepDirection,
    } from "./segmented-control-scroll.internal.ts";

    let {
        ref = $bindable(null),
        value = $bindable(),
        onValueChange,
        size,
        width = "content",
        disabled = false,
        name,
        class: className,
        children,
        onfocusout,
        onpointerdown,
        ...rest
    }: SegmentedControlProps<T> = $props();

    const itemElements = new SvelteMap<string, HTMLElement>();

    let viewportEl = $state<HTMLDivElement | null>(null);
    let trackEl = $state<HTMLDivElement | null>(null);
    let indicatorX = $state(0);
    let indicatorW = $state(0);
    let hasActiveIndicator = $state(false);
    let hasInitialized = $state(false);
    let canScrollPrev = $state(false);
    let canScrollNext = $state(false);
    let isArrowNav = $state(false);

    setSegmentedControlContext({
        get value() {
            return value;
        },
        get disabled() {
            return Boolean(disabled);
        },
        isSelected(itemValue: string): boolean {
            return value === itemValue;
        },
        select(itemValue: string): void {
            if (disabled) return;
            if (value === itemValue) return;
            const next = itemValue as T;
            value = next;
            onValueChange?.(next);
        },
        registerItem(itemValue: string, element: HTMLElement): () => void {
            itemElements.set(itemValue, element);
            return () => {
                if (itemElements.get(itemValue) === element) {
                    itemElements.delete(itemValue);
                }
            };
        },
    });

    function syncIndicator(): void {
        if (value === undefined) {
            hasActiveIndicator = false;
            return;
        }
        const activeEl = itemElements.get(value);
        if (!activeEl) {
            hasActiveIndicator = false;
            return;
        }
        indicatorX = activeEl.offsetLeft;
        indicatorW = activeEl.offsetWidth;
        hasActiveIndicator = true;
    }

    function syncOverflow(): void {
        if (!viewportEl) return;
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
            viewportEl.scrollBy({ left: delta, behavior: "smooth" });
        }
    }

    function handleStepScroll(direction: ScrollStepDirection): void {
        if (!viewportEl || !trackEl) return;
        const items = [...trackEl.querySelectorAll<HTMLElement>(".cs-segmented-control-item")];
        const fadeReserve = resolveFadeReserve(viewportEl);
        const isRtl = isRtlViewport(viewportEl);
        const delta = getStepScrollDelta(viewportEl, items, direction, fadeReserve, isRtl);
        if (Math.abs(delta) > 1) {
            viewportEl.scrollBy({ left: delta, behavior: "smooth" });
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

    // Sync indicator synchronously on value/item/layout changes and enable transitions only after first paint.
    $effect(() => {
        void value;
        void width;
        void size;
        void itemElements.size;
        syncIndicator();

        if (!hasInitialized && typeof requestAnimationFrame === "function") {
            const frame = requestAnimationFrame(() => {
                hasInitialized = true;
            });
            return () => cancelAnimationFrame(frame);
        }
    });

    $effect(() => {
        if (!viewportEl || !trackEl) return;

        syncOverflow();

        if (typeof ResizeObserver !== "function") return;
        const activeEl = value !== undefined ? itemElements.get(value) : undefined;
        const observer = new ResizeObserver(() => {
            syncIndicator();
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
    role="radiogroup"
    {...rest}
    aria-disabled={disabled ? "true" : undefined}
    class={["cs-segmented-control", className]}
    data-size={size}
    data-width={width}
    data-disabled={disabled ? "" : undefined}
    data-arrow-nav={isArrowNav ? "" : undefined}
    onfocusout={handleFocusOut}
    onpointerdown={handlePointerDown}
>
    <div
        bind:this={viewportEl}
        class="cs-segmented-control-viewport"
        data-scroll-prev={canScrollPrev ? "" : undefined}
        data-scroll-next={canScrollNext ? "" : undefined}
        onscroll={syncOverflow}
        {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
        {@attach rovingFocus({
            orientation: "horizontal",
            loop: false,
            homeEnd: true,
            preventScroll: true,
            enabled: () => !disabled,
            items: ".cs-segmented-control-item",
            initialActive: (items) =>
                items.find((el) => el.getAttribute("aria-checked") === "true") ?? items[0] ?? null,
            onActiveChange: ({ activeItem, reason }) => {
                if (reason !== "keyboard") return;
                isArrowNav = true;
                const nextValue = activeItem.dataset.value as T | undefined;
                if (nextValue !== undefined && value !== nextValue) {
                    value = nextValue;
                    onValueChange?.(nextValue);
                }
                scrollItemIntoView(activeItem);
            },
        })}
    >
        <div bind:this={trackEl} class="cs-segmented-control-track">
            <div
                aria-hidden="true"
                class="cs-segmented-control-indicator"
                data-active={hasActiveIndicator ? "" : undefined}
                data-ready={hasInitialized ? "" : undefined}
                style:--cs-segmented-control-indicator-x={`${indicatorX}px`}
                style:--cs-segmented-control-indicator-w={`${indicatorW}px`}
            ></div>
            {@render children?.()}
        </div>
    </div>

    <button
        type="button"
        class="cs-segmented-control-scroll-btn"
        data-direction="prev"
        data-visible={canScrollPrev ? "" : undefined}
        tabindex="-1"
        aria-hidden="true"
        onclick={() => handleStepScroll("prev")}
    >
        <ChevronLeft aria-hidden="true" class="cs-segmented-control-scroll-icon" />
    </button>

    <button
        type="button"
        class="cs-segmented-control-scroll-btn"
        data-direction="next"
        data-visible={canScrollNext ? "" : undefined}
        tabindex="-1"
        aria-hidden="true"
        onclick={() => handleStepScroll("next")}
    >
        <ChevronRight aria-hidden="true" class="cs-segmented-control-scroll-icon" />
    </button>

    {#if name}
        <input type="hidden" {name} value={value ?? ""} {disabled} />
    {/if}
</div>

<style>
    @property --cs-segmented-control-mask-left {
        syntax: "<length>";
        inherits: false;
        initial-value: 0px;
    }

    @property --cs-segmented-control-mask-right {
        syntax: "<length>";
        inherits: false;
        initial-value: 0px;
    }

    @layer components.composite {
        .cs-segmented-control {
            --cs-segmented-control-bg: var(--cs-color-base-soft);
            --cs-segmented-control-indicator-bg: light-dark(white, var(--cs-color-base-800));
            --cs-segmented-control-indicator-shadow: light-dark(0 1px 2px rgb(0 0 0 / 0.08), none);
            --cs-segmented-control-fg: var(--cs-color-text-weak);
            --cs-segmented-control-fg-hover: var(--cs-color-text-strong);
            --cs-segmented-control-fg-active: var(--cs-color-text-strong);

            position: relative;
            display: inline-flex;
            align-items: center;
            width: fit-content;
            max-width: 100%;
            height: var(--cs-segmented-control-height);
            background-color: var(--cs-segmented-control-bg);
            border-radius: calc(var(--cs-segmented-control-height) / 2);
            corner-shape: var(--cs-squircle-soft);
            cursor: default;
            user-select: none;

            &[data-width="equal"] {
                display: flex;
                width: 100%;
            }

            /* =========================================================
             * SIZES (xs - xl, matching Button outer heights 28-44px)
             * ========================================================= */
            &[data-size="xs"] {
                --cs-segmented-control-height: 28px;
                --cs-segmented-control-pad: 3px;
                --cs-segmented-control-item-px: 8px;
                --cs-segmented-control-gap: 4px;
                --cs-segmented-control-fade-size: 50px;
                font-size: var(--cs-text-xs);
            }

            &[data-size="sm"] {
                --cs-segmented-control-height: 32px;
                --cs-segmented-control-pad: 3px;
                --cs-segmented-control-item-px: 10px;
                --cs-segmented-control-gap: 4px;
                --cs-segmented-control-fade-size: 50px;
                font-size: var(--cs-text-xs);
            }

            &[data-size="md"] {
                --cs-segmented-control-height: 36px;
                --cs-segmented-control-pad: 3px;
                --cs-segmented-control-item-px: 12px;
                --cs-segmented-control-gap: 6px;
                --cs-segmented-control-fade-size: 56px;
                font-size: var(--cs-text-sm);
            }

            &[data-size="lg"] {
                --cs-segmented-control-height: 40px;
                --cs-segmented-control-pad: 4px;
                --cs-segmented-control-item-px: 14px;
                --cs-segmented-control-gap: 6px;
                --cs-segmented-control-fade-size: 56px;
                font-size: var(--cs-text-sm);
            }

            &[data-size="xl"] {
                --cs-segmented-control-height: 44px;
                --cs-segmented-control-pad: 4px;
                --cs-segmented-control-item-px: 16px;
                --cs-segmented-control-gap: 6px;
                --cs-segmented-control-fade-size: 56px;
                font-size: var(--cs-text-base);
            }

            &[data-disabled] {
                --cs-disabled-opacity: 1;
                --cs-segmented-control-indicator-bg: var(--cs-color-disabled-bg-elevated);
                --cs-segmented-control-indicator-shadow: none;
            }

            /* Arrow navigation transfers visual feedback cleanly to the sliding indicator */
            &[data-arrow-nav] :global(.cs-segmented-control-item:focus-visible) {
                outline: none;
            }
        }

        .cs-segmented-control-viewport {
            --cs-scroll-fade-size: var(--cs-segmented-control-fade-size);
            --cs-segmented-control-lane: calc(var(--cs-segmented-control-height) - var(--cs-segmented-control-pad) + 20px);

            flex: 1 1 auto;
            min-width: 0;
            width: 100%;
            /* Expand vertical clip box by 4px so :focus-visible rings aren't clipped by overflow-y: hidden */
            box-sizing: content-box;
            height: 100%;
            padding-block: 4px;
            margin-block: -4px;
            overflow-x: auto;
            overflow-y: hidden;
            scrollbar-width: none;
            border-radius: inherit;
            corner-shape: inherit;
            transition:
                --cs-segmented-control-mask-left var(--cs-dur-140) var(--cs-ease-quad-out),
                --cs-segmented-control-mask-right var(--cs-dur-140) var(--cs-ease-quad-out);
            mask-image: linear-gradient(
                to right,
                transparent 0px,
                transparent max(0px, calc(var(--cs-segmented-control-mask-left) - 20px)),
                black var(--cs-segmented-control-mask-left),
                black calc(100% - var(--cs-segmented-control-mask-right)),
                transparent calc(100% - max(0px, calc(var(--cs-segmented-control-mask-right) - 20px))),
                transparent 100%
            );

            &:dir(ltr) {
                &[data-scroll-prev] {
                    --cs-segmented-control-mask-left: var(--cs-segmented-control-lane);
                }

                &[data-scroll-next] {
                    --cs-segmented-control-mask-right: var(--cs-segmented-control-lane);
                }
            }

            &:dir(rtl) {
                &[data-scroll-prev] {
                    --cs-segmented-control-mask-right: var(--cs-segmented-control-lane);
                }

                &[data-scroll-next] {
                    --cs-segmented-control-mask-left: var(--cs-segmented-control-lane);
                }
            }

            &::-webkit-scrollbar {
                display: none;
            }
        }

        .cs-segmented-control-track {
            position: relative;
            display: inline-flex;
            align-items: stretch;
            height: 100%;
            padding: var(--cs-segmented-control-pad);

            .cs-segmented-control[data-width="equal"] & {
                display: grid;
                grid-auto-flow: column;
                grid-auto-columns: 1fr;
                min-width: 100%;
            }
        }

        .cs-segmented-control-indicator {
            position: absolute;
            inset-block: var(--cs-segmented-control-pad);
            left: 0;
            z-index: 0;
            width: var(--cs-segmented-control-indicator-w, 0px);
            translate: var(--cs-segmented-control-indicator-x, 0px) 0;
            background-color: var(--cs-segmented-control-indicator-bg);
            border-radius: calc((var(--cs-segmented-control-height) - var(--cs-segmented-control-pad) * 2) / 2);
            corner-shape: var(--cs-squircle-soft);
            box-shadow: var(--cs-segmented-control-indicator-shadow);
            pointer-events: none;
            opacity: 0;

            &[data-active] {
                opacity: 1;
            }

            &[data-ready] {
                transition:
                    translate var(--cs-dur-180) var(--cs-ease-quart-out),
                    width var(--cs-dur-180) var(--cs-ease-quart-out),
                    opacity var(--cs-dur-effect-fast) var(--cs-ease-effect);
            }
        }

        .cs-segmented-control-scroll-btn {
            isolation: isolate;
            position: absolute;
            inset-block: var(--cs-segmented-control-pad);
            z-index: 2;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            aspect-ratio: 1;
            padding: 0;
            color: var(--cs-color-text-weak);
            background: transparent;
            border: none;
            border-radius: 50%;
            cursor: default;
            opacity: 0;
            scale: 0.8;
            pointer-events: none;
            transition:
                opacity var(--cs-dur-140) var(--cs-ease-quad-out),
                scale var(--cs-dur-140) var(--cs-ease-quad-out),
                color var(--cs-dur-effect-fast) var(--cs-ease-effect);

            &[data-direction="prev"] {
                inset-inline-start: var(--cs-segmented-control-pad);
            }

            &[data-direction="next"] {
                inset-inline-end: var(--cs-segmented-control-pad);
            }

            &[data-visible] {
                opacity: 1;
                scale: 1;
                pointer-events: auto;
            }

            &::before {
                content: "";
                position: absolute;
                inset: 0;
                z-index: -1;
                border-radius: inherit;
                background-color: transparent;
                box-shadow: none;
                transition:
                    background-color var(--cs-dur-effect-fast) var(--cs-ease-effect),
                    box-shadow var(--cs-dur-effect-fast) var(--cs-ease-effect),
                    scale var(--cs-dur-press) var(--cs-ease-press);
            }

            @media (hover: hover) {
                &:hover {
                    color: var(--cs-color-text-strong);

                    &::before {
                        background-color: light-dark(rgb(255 255 255 / 0.85), rgb(255 255 255 / 0.14));
                        box-shadow: var(--cs-shadow-xs);
                    }
                }
            }

            &:active::before {
                scale: 0.92;
            }

            > :global(.cs-segmented-control-scroll-icon) {
                width: calc(1em + 2px);
                height: calc(1em + 2px);
                stroke-width: 2.5;
                pointer-events: none;
            }

            &:dir(rtl) > :global(.cs-segmented-control-scroll-icon) {
                scale: -1 1;
            }
        }
    }
</style>
