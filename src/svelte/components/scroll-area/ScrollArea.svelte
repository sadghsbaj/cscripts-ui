<!--
@component
Scroll container wrapper (`<ScrollArea />`) providing custom OS-independent overlay scrollbars
and GTK4-style boundary overshoot indicators around `<ScrollAreaContent />`.

Architectural Notes:
- Outer Chrome Separation: Overlay scrollbars and overshoot indicators are mounted inside the
  stationary `.cs-scroll-area` wrapper rather than inside the scrolling `<ScrollAreaContent />`
  viewport. This prevents CSS `mask-image` (from `scrollFade`) from clipping the scrollbar
  near fade edges and eliminates async compositor scroll jitter.
- GPU Thumb Physics: Scrollbar thumbs use independent `translate` (for 0ms scroll tracking)
  and `scale` (for smooth 4px -> 8px cross-axis expansion on hover/drag) properties so thumb
  width transitions never lag behind native scroll positions.
-->
<script lang="ts">
    import { setScrollAreaContext, type ScrollAreaProps } from "./index.ts";
    import ScrollAreaOvershoot from "./ScrollAreaOvershoot.svelte";
    import { ScrollAreaManager } from "./scrollAreaState.svelte.ts";

    let {
        size,
        direction,
        scrollbar = "hover",
        overshoot = true,
        class: className,
        children,
        ...rest
    }: ScrollAreaProps = $props();

    const scrollArea = new ScrollAreaManager({
        getSize: () => size,
        getDirection: () => direction,
        getScrollbar: () => scrollbar,
        getOvershoot: () => overshoot,
    });

    setScrollAreaContext(scrollArea);

    $effect(() => {
        void size;
        void direction;
        scrollArea.scheduleUpdate();
    });
</script>

<div
    {...rest}
    class={["cs-scroll-area", className]}
    data-size={size}
    data-scrollbar={scrollbar}
    data-scrolling={scrollArea.isScrolling ? "" : undefined}
    data-dragging={scrollArea.draggingAxis ? "" : undefined}
    data-both-scrollable={scrollArea.canScrollY && scrollArea.canScrollX ? "" : undefined}
>
    {@render children?.()}

    {#if overshoot}
        <ScrollAreaOvershoot />
    {/if}

    {#each ["vertical", "horizontal"] as const as axis (axis)}
        {let isVisible = $derived(
            scrollbar !== "never" &&
                (axis === "vertical"
                    ? scrollArea.isVertical && scrollArea.canScrollY
                    : scrollArea.isHorizontal && scrollArea.canScrollX)
        )}

        {#if isVisible}
            <div
                {@attach scrollArea.attachTrack(axis)}
                aria-hidden="true"
                class="cs-scroll-area-track"
                data-orientation={axis}
                data-dragging={scrollArea.draggingAxis === axis ? "" : undefined}
                style:--_thumb-size="{axis === 'vertical' ? scrollArea.thumbYSize : scrollArea.thumbXSize}px"
                style:--_thumb-offset="{axis === 'vertical' ? scrollArea.thumbYOffset : scrollArea.thumbXOffset}px"
            >
                <div {@attach scrollArea.attachThumb(axis)} class="cs-scroll-area-thumb"></div>
            </div>
        {/if}
    {/each}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area {
            --_track-end-inset: 3px;

            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;

            /* =========================================================
             * SIZES (Resting thumb is 0.5x -> sm: 3->6px, md: 4->8px, lg: 6->12px)
             * ========================================================= */
            &[data-size="sm"] {
                --_track-size: 6px;
            }

            &[data-size="md"] {
                --_track-size: 8px;
            }

            &[data-size="lg"] {
                --_track-size: 12px;
            }

            &[data-both-scrollable] {
                --_track-end-inset: calc(var(--_track-size, 8px) + 6px);
            }

            /* =========================================================
             * SCROLLBAR VISIBILITY MODES
             * ========================================================= */
            &[data-scrollbar="always"] > .cs-scroll-area-track,
            &[data-scrollbar="hover"]:is(:hover, [data-scrolling], [data-dragging]) > .cs-scroll-area-track,
            &[data-scrollbar="scroll"]:is([data-scrolling], [data-dragging]) > .cs-scroll-area-track {
                opacity: 1;
                pointer-events: auto;
            }
        }

        /* =========================================================
         * OVERLAY SCROLLBAR TRACK & THUMB
         * ========================================================= */
        .cs-scroll-area-track {
            position: absolute;
            z-index: 30;
            border-radius: var(--cs-radius-full);
            opacity: 0;
            pointer-events: none;
            user-select: none;
            touch-action: none;
            transition:
                opacity 200ms var(--cs-ease-quad-out),
                background-color 160ms var(--cs-ease-quad-out);

            &[data-orientation="vertical"] {
                inset: 3px 2px var(--_track-end-inset, 3px) auto;
                width: var(--_track-size, 8px);

                .cs-scroll-area-thumb {
                    width: 100%;
                    height: var(--_thumb-size, 0px);
                    translate: 0 var(--_thumb-offset, 0px);
                    transform-origin: right center;
                    scale: 0.5 1;
                }
            }

            &[data-orientation="horizontal"] {
                inset: auto var(--_track-end-inset, 3px) 2px 3px;
                height: var(--_track-size, 8px);

                .cs-scroll-area-thumb {
                    width: var(--_thumb-size, 0px);
                    height: 100%;
                    translate: var(--_thumb-offset, 0px) 0;
                    transform-origin: center bottom;
                    scale: 1 0.5;
                }
            }

            &:hover,
            &[data-dragging] {
                opacity: 1;
                pointer-events: auto;
                background-color: light-dark(
                    color-mix(in oklch, var(--cs-color-base-900) 5%, transparent),
                    color-mix(in oklch, var(--cs-color-base-100) 6%, transparent)
                );

                .cs-scroll-area-thumb {
                    scale: 1;
                    background-color: var(--cs-scrollbar-thumb-hover);
                }
            }

            &[data-dragging] .cs-scroll-area-thumb {
                background-color: light-dark(
                    color-mix(in oklch, var(--cs-color-base-900) 48%, transparent),
                    color-mix(in oklch, var(--cs-color-base-100) 52%, transparent)
                );
            }
        }

        .cs-scroll-area-thumb {
            border-radius: var(--cs-radius-full);
            background-color: var(--cs-scrollbar-thumb);
            transition:
                scale 240ms var(--cs-ease-expo-out),
                background-color 160ms var(--cs-ease-quad-out);
        }
    }
</style>
