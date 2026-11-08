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
             * SCROLLBAR VISIBILITY MODES (Stage 1: Edge-Glide Enter)
             * ========================================================= */
            &[data-scrollbar="always"] > .cs-scroll-area-track,
            &[data-scrollbar="hover"]:is(:hover, [data-scrolling], [data-dragging]) > .cs-scroll-area-track,
            &[data-scrollbar="scroll"]:is([data-scrolling], [data-dragging]) > .cs-scroll-area-track {
                opacity: 1;
                translate: 0 0;
                pointer-events: auto;
            }
        }

        /* =========================================================
         * OVERLAY SCROLLBAR TRACK & THUMB
         * ========================================================= */
        .cs-scroll-area-track {
            --_track-bg: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 6%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 8%, transparent)
            );
            --_thumb-bg: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 20%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 22%, transparent)
            );
            --_thumb-bg-track-hover: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 36%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 44%, transparent)
            );
            --_thumb-bg-thumb-hover: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 54%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 76%, transparent)
            );

            position: absolute;
            z-index: 30;
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            opacity: 0;
            translate: var(--_track-hide-translate);
            user-select: none;
            transition:
                opacity 220ms var(--cs-ease-cubic-out),
                translate 240ms var(--cs-ease-cubic-out);
            pointer-events: none;
            touch-action: none;

            /* Visual track pill that unfolds outward from the thumb's current position */
            &::before {
                content: "";
                position: absolute;
                inset: 0;
                background-color: var(--_track-bg);
                border-radius: inherit;
                corner-shape: inherit;
                opacity: 0;
                scale: var(--_track-folded-scale);
                transform-origin: var(--_track-unfold-origin);
                transition:
                    opacity 200ms var(--cs-ease-cubic-out),
                    scale 260ms var(--cs-ease-cubic-out);
                pointer-events: none;
            }

            &[data-orientation="vertical"] {
                --_track-hide-translate: 5px 0;
                --_track-hover-translate: -1.5px 0;
                --_track-unfold-origin: right calc(var(--_thumb-offset, 0px) + var(--_thumb-size, 0px) * 0.5);
                --_track-folded-scale: 0.45 0.25;
                --_thumb-drag-scale: 1.12 1;

                inset: 3px 2px var(--_track-end-inset, 3px) auto;
                width: var(--_track-size, 8px);

                .cs-scroll-area-thumb {
                    width: 100%;
                    height: var(--_thumb-size, 0px);
                    translate: 0 var(--_thumb-offset, 0px);
                    scale: 0.5 1;
                    transform-origin: right center;
                }
            }

            &[data-orientation="horizontal"] {
                --_track-hide-translate: 0 5px;
                --_track-hover-translate: 0 -1.5px;
                --_track-unfold-origin: calc(var(--_thumb-offset, 0px) + var(--_thumb-size, 0px) * 0.5) bottom;
                --_track-folded-scale: 0.25 0.45;
                --_thumb-drag-scale: 1 1.12;

                inset: auto var(--_track-end-inset, 3px) 2px 3px;
                height: var(--_track-size, 8px);

                .cs-scroll-area-thumb {
                    width: var(--_thumb-size, 0px);
                    height: 100%;
                    translate: var(--_thumb-offset, 0px) 0;
                    scale: 1 0.5;
                    transform-origin: center bottom;
                }
            }

            /* Stage 2: Track Hovered -> Inward Lift + Track Unfold + Elastic Thumb Pop */
            &:hover,
            &[data-dragging] {
                opacity: 1;
                translate: var(--_track-hover-translate);
                transition:
                    opacity 150ms var(--cs-ease-expo-out),
                    translate 180ms var(--cs-ease-expo-out);
                pointer-events: auto;

                &::before {
                    opacity: 1;
                    scale: 1;
                    transition:
                        opacity 140ms var(--cs-ease-quad-out),
                        scale 260ms var(--cs-ease-expo-out);
                }

                .cs-scroll-area-thumb {
                    background-color: var(--_thumb-bg-track-hover);
                    scale: 1;
                    transition:
                        scale 220ms var(--cs-ease-back-out),
                        background-color 140ms var(--cs-ease-quad-out);

                    /* Stage 3a: Thumb Directly Hovered -> High-Contrast Highlight */
                    &:hover {
                        background-color: var(--_thumb-bg-thumb-hover);
                    }
                }
            }

            /* Stage 3b: Active Drag -> High-Contrast Highlight + Tactile Grip */
            &[data-dragging] .cs-scroll-area-thumb {
                background-color: var(--_thumb-bg-thumb-hover);
                scale: var(--_thumb-drag-scale);
            }
        }

        .cs-scroll-area-thumb {
            position: relative;
            z-index: 1;
            background-color: var(--_thumb-bg);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            transition:
                scale 240ms var(--cs-ease-cubic-out),
                background-color 200ms var(--cs-ease-quad-out);
        }
    }
</style>
