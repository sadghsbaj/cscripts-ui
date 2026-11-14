<!--
@component
GTK4-style boundary overshoot indicator (`<ScrollAreaOvershoot />`) rendered inside `<ScrollArea />`.
-->
<script lang="ts">
    import { getScrollAreaContext } from "./index.ts";

    const scrollArea = getScrollAreaContext();
</script>

<div class="cs-scroll-area-overshoot" aria-hidden="true">
    {#each scrollArea.activeOvershootEdges as edge (edge)}
        {let value = $derived(scrollArea.overshootValues[edge])}

        <div class="cs-scroll-area-overshoot-edge" data-edge={edge} style:--cs-scroll-area-overshoot={value}></div>
    {/each}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area-overshoot {
            --cs-scroll-area-overshoot-tint: light-dark(
                color-mix(in oklab, var(--cs-color-base-800) 78%, var(--cs-color-accent-600)),
                color-mix(in oklab, var(--cs-color-base-100) 82%, var(--cs-color-accent-400))
            );
            --cs-scroll-area-overshoot-core-bg: light-dark(
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 24%, transparent),
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 22%, transparent)
            );
            --cs-scroll-area-overshoot-core-mid-bg: light-dark(
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 16%, transparent),
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 14%, transparent)
            );
            --cs-scroll-area-overshoot-glow-bg: light-dark(
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 14%, transparent),
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 10%, transparent)
            );
            --cs-scroll-area-overshoot-glow-mid-bg: light-dark(
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 8%, transparent),
                color-mix(in oklch, var(--cs-scroll-area-overshoot-tint) 6%, transparent)
            );

            position: absolute;
            inset: 0;
            z-index: 20;
            overflow: hidden;
            border-radius: inherit;
            user-select: none;
            pointer-events: none;
        }

        .cs-scroll-area-overshoot-edge {
            position: absolute;
            inset: var(--cs-scroll-area-overshoot-inset);
            background:
                radial-gradient(
                    var(--cs-scroll-area-overshoot-core-shape) at var(--cs-scroll-area-overshoot-origin),
                    var(--cs-scroll-area-overshoot-core-bg) 0%,
                    var(--cs-scroll-area-overshoot-core-mid-bg) 48%,
                    transparent 100%
                ),
                radial-gradient(
                    var(--cs-scroll-area-overshoot-glow-shape) at var(--cs-scroll-area-overshoot-origin),
                    var(--cs-scroll-area-overshoot-glow-bg) 0%,
                    var(--cs-scroll-area-overshoot-glow-mid-bg) 58%,
                    transparent 100%
                );
            opacity: var(--cs-scroll-area-overshoot, 0);
            transform-origin: var(--cs-scroll-area-overshoot-origin);
            user-select: none;
            transition:
                opacity 220ms var(--cs-ease-quad-out),
                scale 250ms var(--cs-ease-expo-out);
            pointer-events: none;

            &:is([data-edge="top"], [data-edge="bottom"]) {
                --cs-scroll-area-overshoot-core-shape: ellipse 44% 62%;
                --cs-scroll-area-overshoot-glow-shape: ellipse 49% 100%;
                height: 32px;
                scale: 1 calc(0.55 + var(--cs-scroll-area-overshoot, 0) * 0.45);
            }

            &:is([data-edge="left"], [data-edge="right"]) {
                --cs-scroll-area-overshoot-core-shape: ellipse 62% 44%;
                --cs-scroll-area-overshoot-glow-shape: ellipse 100% 49%;
                width: 32px;
                scale: calc(0.55 + var(--cs-scroll-area-overshoot, 0) * 0.45) 1;
            }

            &[data-edge="top"] {
                --cs-scroll-area-overshoot-inset: 0 0 auto 0;
                --cs-scroll-area-overshoot-origin: 50% 0%;
            }

            &[data-edge="bottom"] {
                --cs-scroll-area-overshoot-inset: auto 0 0 0;
                --cs-scroll-area-overshoot-origin: 50% 100%;
            }

            &[data-edge="left"] {
                --cs-scroll-area-overshoot-inset: 0 auto 0 0;
                --cs-scroll-area-overshoot-origin: 0% 50%;
            }

            &[data-edge="right"] {
                --cs-scroll-area-overshoot-inset: 0 0 0 auto;
                --cs-scroll-area-overshoot-origin: 100% 50%;
            }
        }
    }
</style>
