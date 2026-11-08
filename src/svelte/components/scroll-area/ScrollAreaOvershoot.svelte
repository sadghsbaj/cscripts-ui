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
        {let depthScale = $derived(0.55 + value * 0.45)}
        {let isVerticalEdge = $derived(edge === "top" || edge === "bottom")}

        <div
            class="cs-scroll-area-overshoot-edge"
            data-edge={edge}
            style:opacity={value}
            style:scale={isVerticalEdge ? `1 ${depthScale}` : `${depthScale} 1`}
        ></div>
    {/each}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area-overshoot {
            --_overshoot-tint: light-dark(
                color-mix(in oklch, var(--cs-color-base-800) 78%, var(--cs-color-accent-600)),
                color-mix(in oklch, var(--cs-color-base-100) 82%, var(--cs-color-accent-400))
            );
            --_overshoot-core-color: light-dark(
                color-mix(in oklch, var(--_overshoot-tint) 24%, transparent),
                color-mix(in oklch, var(--_overshoot-tint) 22%, transparent)
            );
            --_overshoot-core-mid-color: light-dark(
                color-mix(in oklch, var(--_overshoot-tint) 16%, transparent),
                color-mix(in oklch, var(--_overshoot-tint) 14%, transparent)
            );
            --_overshoot-glow-color: light-dark(
                color-mix(in oklch, var(--_overshoot-tint) 14%, transparent),
                color-mix(in oklch, var(--_overshoot-tint) 10%, transparent)
            );
            --_overshoot-glow-mid-color: light-dark(
                color-mix(in oklch, var(--_overshoot-tint) 8%, transparent),
                color-mix(in oklch, var(--_overshoot-tint) 6%, transparent)
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
            inset: var(--_inset);
            background:
                radial-gradient(
                    var(--_core-shape) at var(--_origin),
                    var(--_overshoot-core-color) 0%,
                    var(--_overshoot-core-mid-color) 48%,
                    transparent 100%
                ),
                radial-gradient(
                    var(--_glow-shape) at var(--_origin),
                    var(--_overshoot-glow-color) 0%,
                    var(--_overshoot-glow-mid-color) 58%,
                    transparent 100%
                );
            opacity: 0;
            transform-origin: var(--_origin);
            user-select: none;
            transition:
                opacity 220ms var(--cs-ease-quad-out),
                scale 250ms var(--cs-ease-expo-out);
            pointer-events: none;

            &:is([data-edge="top"], [data-edge="bottom"]) {
                --_core-shape: ellipse 44% 62%;
                --_glow-shape: ellipse 49% 100%;
                height: 32px;
                scale: 1 0.55;
            }

            &:is([data-edge="left"], [data-edge="right"]) {
                --_core-shape: ellipse 62% 44%;
                --_glow-shape: ellipse 100% 49%;
                width: 32px;
                scale: 0.55 1;
            }

            &[data-edge="top"] {
                --_inset: 0 0 auto 0;
                --_origin: 50% 0%;
            }

            &[data-edge="bottom"] {
                --_inset: auto 0 0 0;
                --_origin: 50% 100%;
            }

            &[data-edge="left"] {
                --_inset: 0 auto 0 0;
                --_origin: 0% 50%;
            }

            &[data-edge="right"] {
                --_inset: 0 0 0 auto;
                --_origin: 100% 50%;
            }
        }
    }
</style>
