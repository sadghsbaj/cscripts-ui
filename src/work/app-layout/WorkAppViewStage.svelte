<script lang="ts">
    import { SvelteMap } from "svelte/reactivity";
    import type { WorkAppViewKey, WorkAppViewStageProps } from "./index.ts";

    let {
        activeKey,
        scrollContainer,
        restoreScroll = true,
        ref = $bindable(null),
        children,
        class: className,
        ...rest
    }: WorkAppViewStageProps = $props();

    const scrollPositions = new SvelteMap<WorkAppViewKey, number>();

    let hasMounted = false;
    let previousKey: WorkAppViewKey | undefined;
    let pendingRestoreKey: WorkAppViewKey | undefined;
    let prevScrollTop = 0;
    let pendingOutgoingEl: HTMLElement | null = null;

    function resolveScrollContainer(
        stage: HTMLElement | null,
        explicit?: HTMLElement | Window | null,
    ): HTMLElement | Window | null {
        if (explicit !== undefined) return explicit;
        if (!stage) return null;

        const scrollAreaContent = stage.closest<HTMLElement>(".cs-scroll-area-content");
        if (scrollAreaContent) return scrollAreaContent;

        let current = stage.parentElement;
        while (current) {
            const { overflowY } = getComputedStyle(current);
            if (overflowY === "auto" || overflowY === "scroll") {
                return current;
            }
            current = current.parentElement;
        }

        return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null;
    }

    function getScrollTop(scroller: HTMLElement | Window): number {
        return scroller instanceof Window ? scroller.scrollY : scroller.scrollTop;
    }

    function setScrollTop(scroller: HTMLElement | Window, top: number): void {
        scroller.scrollTo({ top, behavior: "instant" });
    }

    $effect.pre(() => {
        const currentKey = activeKey;

        if (!hasMounted) {
            hasMounted = true;
            previousKey = currentKey;
            return;
        }

        if (currentKey === previousKey) return;

        if (restoreScroll) {
            const scroller = resolveScrollContainer(ref, scrollContainer);
            if (scroller) {
                prevScrollTop = getScrollTop(scroller);
                if (previousKey !== undefined) {
                    scrollPositions.set(previousKey, prevScrollTop);
                }
            } else {
                prevScrollTop = 0;
            }

            pendingOutgoingEl = ref
                ? ([...ref.children].find(
                      (child): child is HTMLElement =>
                          child instanceof HTMLElement && !("exiting" in child.dataset),
                  ) ?? null)
                : null;
        } else {
            prevScrollTop = 0;
            pendingOutgoingEl = null;
        }

        previousKey = currentKey;
        pendingRestoreKey = restoreScroll ? currentKey : undefined;
    });

    $effect(() => {
        const currentKey = activeKey;
        const shouldRestore = restoreScroll;

        if (!shouldRestore || currentKey === undefined || pendingRestoreKey !== currentKey) {
            return;
        }

        pendingRestoreKey = undefined;
        const outgoingEl = pendingOutgoingEl;
        pendingOutgoingEl = null;

        const scroller = resolveScrollContainer(ref, scrollContainer);
        if (!scroller) return;

        const nextScrollTop = scrollPositions.get(currentKey) ?? 0;
        setScrollTop(scroller, nextScrollTop);

        // Keep the outgoing view pixel-locked at its own scroll position while fading out.
        const scrollDelta = nextScrollTop - prevScrollTop;
        if (outgoingEl && outgoingEl.isConnected && "exiting" in outgoingEl.dataset && scrollDelta !== 0) {
            outgoingEl.style.translate = `0 ${scrollDelta}px`;
        }
    });
</script>

<div
    {...rest}
    bind:this={ref}
    class={["cs-work-app-view-stage", className]}
    data-active-key={activeKey !== undefined ? String(activeKey) : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-work-app-view-stage {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            align-items: start;
            width: 100%;
            min-width: 0;
        }

        /* Overlap exiting and entering views in the same grid cell so container height stays max(out, in) */
        .cs-work-app-view-stage > :global(*) {
            grid-area: 1 / 1;
            align-self: start;
            width: 100%;
            min-width: 0;
        }
    }
</style>
