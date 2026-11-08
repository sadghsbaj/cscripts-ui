<!--
@component
GTK4-style boundary overshoot claw indicator (`<ScrollAreaOvershoot />`) rendered inside `<ScrollArea />`.
-->
<script lang="ts">
    import { getScrollAreaContext } from "./index.ts";

    const scrollArea = getScrollAreaContext();
</script>

<div class="cs-scroll-area-overshoot" aria-hidden="true">
    {#each scrollArea.activeOvershootEdges as edge (edge)}
        {let value = $derived(scrollArea.overshootValues[edge])}

        <div
            class="cs-scroll-area-overshoot-edge"
            data-edge={edge}
            data-active={value > 0 ? "" : undefined}
            style:--_overshoot={value}
        ></div>
    {/each}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area-overshoot {
            --_overshoot-pill-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 45%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 75%, transparent)
            );
            --_overshoot-glow-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 14%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 28%, transparent)
            );

            position: absolute;
            inset: 0;
            z-index: 20;
            overflow: hidden;
            border-radius: inherit;
            pointer-events: none;
            user-select: none;
        }

        .cs-scroll-area-overshoot-edge {
            position: absolute;
            inset: var(--_inset);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            background: radial-gradient(
                var(--_radial-shape) at var(--_origin),
                var(--_overshoot-glow-color) 0%,
                transparent 100%
            );
            pointer-events: none;
            user-select: none;
            transition: opacity 220ms var(--cs-ease-quad-out);

            &[data-active] {
                opacity: var(--_overshoot, 0);
            }

            &::after {
                content: "";
                border-radius: var(--cs-radius-full);
                background-color: var(--_overshoot-pill-color);
                box-shadow: 0 0 6px var(--_overshoot-glow-color);
                transition: scale 250ms var(--cs-ease-expo-out);
            }

            &:is([data-edge="top"], [data-edge="bottom"]) {
                --_radial-shape: ellipse 60% 100%;
                height: 24px;

                &::after {
                    width: 96px;
                    max-width: 75%;
                    height: 3px;
                    scale: 0.5 1;
                }

                &[data-active]::after {
                    scale: calc(0.5 + var(--_overshoot, 0) * 0.5) 1;
                }
            }

            &:is([data-edge="left"], [data-edge="right"]) {
                --_radial-shape: ellipse 100% 60%;
                width: 24px;

                &::after {
                    width: 3px;
                    height: 96px;
                    max-height: 75%;
                    scale: 1 0.5;
                }

                &[data-active]::after {
                    scale: 1 calc(0.5 + var(--_overshoot, 0) * 0.5);
                }
            }

            &[data-edge="top"] {
                --_inset: 0 0 auto 0;
                --_origin: 50% 0%;
                align-items: flex-start;
            }

            &[data-edge="bottom"] {
                --_inset: auto 0 0 0;
                --_origin: 50% 100%;
                align-items: flex-end;
            }

            &[data-edge="left"] {
                --_inset: 0 auto 0 0;
                --_origin: 0% 50%;
                justify-content: flex-start;
            }

            &[data-edge="right"] {
                --_inset: 0 0 0 auto;
                --_origin: 100% 50%;
                justify-content: flex-end;
            }
        }
    }
</style>
