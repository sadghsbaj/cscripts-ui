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
            style:--cs-scroll-area-overshoot={value}
        ></div>
    {/each}
</div>

<style>
    @layer components.composite {
        .cs-scroll-area-overshoot {
            --cs-scroll-area-overshoot-bg: light-dark(
                color-mix(in oklab, var(--cs-color-accent-500) 76%, var(--cs-color-base-900) 6%),
                color-mix(in oklab, var(--cs-color-base-100) 72%, var(--cs-color-accent-400))
            );
            --cs-scroll-area-overshoot-halo: light-dark(
                drop-shadow(0 0 5px color-mix(in oklch, var(--cs-color-accent-500) 28%, transparent)),
                drop-shadow(0 0 6px color-mix(in oklch, var(--cs-color-accent-400) 38%, transparent))
            );

            position: absolute;
            inset: 0;
            z-index: 20;
            overflow: hidden;
            border-radius: inherit;
            container-type: size;
            user-select: none;
            pointer-events: none;
        }

        .cs-scroll-area-overshoot-edge {
            position: absolute;
            inset: var(--cs-scroll-area-overshoot-inset);
            margin: auto;
            border-radius: var(--cs-radius-full);
            background: linear-gradient(
                var(--cs-scroll-area-overshoot-dir),
                transparent 0%,
                var(--cs-scroll-area-overshoot-bg) 18%,
                var(--cs-scroll-area-overshoot-bg) 82%,
                transparent 100%
            );
            opacity: min(1, calc(var(--cs-scroll-area-overshoot, 0) * 1.15));
            filter: var(--cs-scroll-area-overshoot-halo);
            transform: var(--cs-scroll-area-overshoot-transform);
            corner-shape: var(--cs-squircle-soft);
            user-select: none;
            transition:
                opacity 260ms var(--cs-ease-quad-out),
                transform 340ms var(--cs-spring-snappy);
            pointer-events: none;

            &[data-active] {
                transition:
                    opacity 140ms var(--cs-ease-quad-out),
                    transform 220ms var(--cs-ease-cubic-out);
            }

            &:is([data-edge="top"], [data-edge="bottom"]) {
                --cs-scroll-area-overshoot-dir: to right;
                width: clamp(min(18px, 55cqw), 26cqw, 112px);
                height: 3px;
            }

            &:is([data-edge="left"], [data-edge="right"]) {
                --cs-scroll-area-overshoot-dir: to bottom;
                width: 3px;
                height: clamp(min(16px, 55cqh), 30cqh, 96px);
            }

            &[data-edge="top"] {
                --cs-scroll-area-overshoot-inset: 5px 0 auto 0;
                --cs-scroll-area-overshoot-transform: translateY(calc(var(--cs-scroll-area-overshoot, 0) * 2.5px))
                    scaleX(calc(0.5 + var(--cs-scroll-area-overshoot, 0) * 0.5))
                    scaleY(calc(0.75 + var(--cs-scroll-area-overshoot, 0) * 0.25));
            }

            &[data-edge="bottom"] {
                --cs-scroll-area-overshoot-inset: auto 0 5px 0;
                --cs-scroll-area-overshoot-transform: translateY(calc(var(--cs-scroll-area-overshoot, 0) * -2.5px))
                    scaleX(calc(0.5 + var(--cs-scroll-area-overshoot, 0) * 0.5))
                    scaleY(calc(0.75 + var(--cs-scroll-area-overshoot, 0) * 0.25));
            }

            &[data-edge="left"] {
                --cs-scroll-area-overshoot-inset: 0 auto 0 5px;
                --cs-scroll-area-overshoot-transform: translateX(calc(var(--cs-scroll-area-overshoot, 0) * 2.5px))
                    scaleX(calc(0.75 + var(--cs-scroll-area-overshoot, 0) * 0.25))
                    scaleY(calc(0.5 + var(--cs-scroll-area-overshoot, 0) * 0.5));
            }

            &[data-edge="right"] {
                --cs-scroll-area-overshoot-inset: 0 5px 0 auto;
                --cs-scroll-area-overshoot-transform: translateX(calc(var(--cs-scroll-area-overshoot, 0) * -2.5px))
                    scaleX(calc(0.75 + var(--cs-scroll-area-overshoot, 0) * 0.25))
                    scaleY(calc(0.5 + var(--cs-scroll-area-overshoot, 0) * 0.5));
            }
        }
    }
</style>
