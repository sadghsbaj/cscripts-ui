<script lang="ts">
    import { type ScrollAreaProps } from "./index.ts";
    import { setScrollAreaContext } from "./scroll-area.context.internal.ts";
    import { ScrollAreaManager } from "./scroll-area-state.internal.svelte.ts";

    let {
        ref = $bindable(null),
        size,
        direction,
        scrollbar = "hover",
        class: className,
        children,
        ...rest
    }: ScrollAreaProps = $props();

    const scrollArea = new ScrollAreaManager({
        getSize: () => size,
        getDirection: () => direction,
        getScrollbar: () => scrollbar,
    });

    setScrollAreaContext(scrollArea);

    $effect(() => {
        void size;
        void direction;
        scrollArea.scheduleUpdate();
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-scroll-area", className]}
    data-size={size}
    data-scrollbar={scrollbar}
    data-scrolling={scrollArea.isScrolling ? "" : undefined}
    data-dragging={scrollArea.draggingAxis ? "" : undefined}
    data-both-scrollable={scrollArea.canScrollY && scrollArea.canScrollX ? "" : undefined}
>
    {@render children?.()}

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
                style:--cs-scroll-area-thumb-length="{axis === 'vertical'
                    ? scrollArea.thumbYSize
                    : scrollArea.thumbXSize}px"
                style:--cs-scroll-area-thumb-offset="{axis === 'vertical'
                    ? scrollArea.thumbYOffset
                    : scrollArea.thumbXOffset}px"
            >
                <div {@attach scrollArea.attachThumb(axis)} class="cs-scroll-area-thumb"></div>
            </div>
        {/if}
    {/each}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area {
            --cs-scroll-area-track-end-inset: 3px;

            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;

            /* =========================================================
             * SIZES (Resting thumb is 0.5x -> sm: 3->6px, md: 4->8px, lg: 6->12px)
             * ========================================================= */
            &[data-size="sm"] {
                --cs-scroll-area-track-thickness: 6px;
            }

            &[data-size="md"] {
                --cs-scroll-area-track-thickness: 8px;
            }

            &[data-size="lg"] {
                --cs-scroll-area-track-thickness: 12px;
            }

            &[data-both-scrollable] {
                --cs-scroll-area-track-end-inset: calc(var(--cs-scroll-area-track-thickness, 8px) + 6px);
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
            --cs-scroll-area-track-bg: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 6%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 8%, transparent)
            );
            --cs-scroll-area-thumb-bg: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 20%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 22%, transparent)
            );
            --cs-scroll-area-thumb-bg-track-hover: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 36%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 44%, transparent)
            );
            --cs-scroll-area-thumb-bg-hover: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 54%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 76%, transparent)
            );

            position: absolute;
            z-index: 30;
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            opacity: 0;
            translate: var(--cs-scroll-area-track-hide-translate);
            user-select: none;
            transition:
                opacity var(--cs-dur-200) var(--cs-ease-cubic-out),
                translate var(--cs-dur-240) var(--cs-ease-cubic-out);
            pointer-events: none;
            touch-action: none;

            /* Visual track pill that unfolds outward from the thumb's current position */
            &::before {
                content: "";
                position: absolute;
                inset: 0;
                background-color: var(--cs-scroll-area-track-bg);
                border-radius: inherit;
                corner-shape: inherit;
                opacity: 0;
                scale: var(--cs-scroll-area-track-folded-scale);
                transform-origin: var(--cs-scroll-area-track-unfold-origin);
                transition:
                    opacity var(--cs-dur-200) var(--cs-ease-cubic-out),
                    scale var(--cs-dur-260) var(--cs-ease-cubic-out);
                pointer-events: none;
            }

            &[data-orientation="vertical"] {
                --cs-scroll-area-track-hide-translate: 5px 0;
                --cs-scroll-area-track-hover-translate: -1.5px 0;
                --cs-scroll-area-track-unfold-origin: right
                    calc(var(--cs-scroll-area-thumb-offset, 0px) + var(--cs-scroll-area-thumb-length, 0px) * 0.5);
                --cs-scroll-area-track-folded-scale: 0.45 0.25;
                --cs-scroll-area-thumb-drag-scale: 1.12 1;

                inset: 3px 2px var(--cs-scroll-area-track-end-inset, 3px) auto;
                width: var(--cs-scroll-area-track-thickness, 8px);

                .cs-scroll-area-thumb {
                    width: 100%;
                    height: var(--cs-scroll-area-thumb-length, 0px);
                    translate: 0 var(--cs-scroll-area-thumb-offset, 0px);
                    scale: 0.5 1;
                    transform-origin: right center;
                }
            }

            &[data-orientation="horizontal"] {
                --cs-scroll-area-track-hide-translate: 0 5px;
                --cs-scroll-area-track-hover-translate: 0 -1.5px;
                --cs-scroll-area-track-unfold-origin: calc(
                        var(--cs-scroll-area-thumb-offset, 0px) + var(--cs-scroll-area-thumb-length, 0px) * 0.5
                    )
                    bottom;
                --cs-scroll-area-track-folded-scale: 0.25 0.45;
                --cs-scroll-area-thumb-drag-scale: 1 1.12;

                inset: auto var(--cs-scroll-area-track-end-inset, 3px) 2px 3px;
                height: var(--cs-scroll-area-track-thickness, 8px);

                .cs-scroll-area-thumb {
                    width: var(--cs-scroll-area-thumb-length, 0px);
                    height: 100%;
                    translate: var(--cs-scroll-area-thumb-offset, 0px) 0;
                    scale: 1 0.5;
                    transform-origin: center bottom;
                }
            }

            /* Stage 2: Track Hovered -> Inward Lift + Track Unfold + Elastic Thumb Pop */
            &:hover,
            &[data-dragging] {
                opacity: 1;
                translate: var(--cs-scroll-area-track-hover-translate);
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
                    background-color: var(--cs-scroll-area-thumb-bg-track-hover);
                    scale: 1;
                    transition:
                        scale var(--cs-dur-200) var(--cs-ease-back-out),
                        background-color var(--cs-dur-140) var(--cs-ease-quad-out);

                    /* Stage 3a: Thumb Directly Hovered -> High-Contrast Highlight */
                    &:hover {
                        background-color: var(--cs-scroll-area-thumb-bg-hover);
                    }
                }
            }

            /* Stage 3b: Active Drag -> High-Contrast Highlight + Tactile Grip */
            &[data-dragging] .cs-scroll-area-thumb {
                background-color: var(--cs-scroll-area-thumb-bg-hover);
                scale: var(--cs-scroll-area-thumb-drag-scale);
            }
        }

        .cs-scroll-area-thumb {
            position: relative;
            z-index: 1;
            background-color: var(--cs-scroll-area-thumb-bg);
            border-radius: var(--cs-radius-full);
            corner-shape: var(--cs-squircle-soft);
            transition:
                scale var(--cs-dur-240) var(--cs-ease-cubic-out),
                background-color var(--cs-dur-200) var(--cs-ease-quad-out);
        }
    }
</style>
