<script lang="ts">
    import { type PopoverProps } from ".";

    let {
        ref = $bindable(null),
        id,
        placement,
        width,
        offset = "8px",
        popover = "auto",
        animate = true,
        class: className,
        children,
        ...rest
    }: PopoverProps = $props();
</script>

<div
    bind:this={ref}
    {...rest}
    {id}
    {popover}
    class={["cs-popover", className]}
    data-width={width}
    data-placement={placement}
    data-animate={animate ? "" : undefined}
    style:--cs-popover-anchor={`--anchor-${id}`}
    style:--cs-popover-offset={offset}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-popover {
            /* Spatial unit vectors (-1 | 0 | 1) pointing toward the trigger anchor.
            * Consumed by built-in [data-animate] or custom composite transitions (e.g. Tooltip). */
            --cs-popover-dir-x: 0;
            --cs-popover-dir-y: 1;
            --cs-popover-origin: bottom center;

            position-anchor: var(--cs-popover-anchor);
            position-visibility: anchors-visible;
            position: fixed;
            inset: auto;
            margin: 0;
            max-inline-size: calc(100vw - 32px);
            max-block-size: calc(100vh - 32px);
            overflow: auto;
            transform-origin: var(--cs-popover-origin);
        }

        /* =========================================================
        * WIDTHS
        * ========================================================= */
        .cs-popover[data-width="content"] {
            inline-size: max-content;
        }

        .cs-popover[data-width="anchor"] {
            inline-size: anchor-size(inline);
        }

        .cs-popover[data-width="min-anchor"] {
            inline-size: max-content;
            min-inline-size: anchor-size(inline);
        }

        /* =========================================================
        * PLACEMENTS
        * ========================================================= */

        /* TOP */
        .cs-popover[data-placement^="top"] {
            --cs-popover-dir-x: 0;
            --cs-popover-dir-y: 1;
            margin-block-end: var(--cs-popover-offset);
        }

        .cs-popover[data-placement="top"] {
            --cs-popover-origin: bottom center;
            position-area: block-start;
            position-try-fallbacks: flip-block;
        }

        .cs-popover[data-placement="top-start"] {
            --cs-popover-origin: bottom left;
            position-area: block-start span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover[data-placement="top-end"] {
            --cs-popover-origin: bottom right;
            position-area: block-start span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        /* BOTTOM */
        .cs-popover[data-placement^="bottom"] {
            --cs-popover-dir-x: 0;
            --cs-popover-dir-y: -1;
            margin-block-start: var(--cs-popover-offset);
        }

        .cs-popover[data-placement="bottom"] {
            --cs-popover-origin: top center;
            position-area: block-end;
            position-try-fallbacks: flip-block;
        }

        .cs-popover[data-placement="bottom-start"] {
            --cs-popover-origin: top left;
            position-area: block-end span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover[data-placement="bottom-end"] {
            --cs-popover-origin: top right;
            position-area: block-end span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        /* LEFT */
        .cs-popover[data-placement^="left"] {
            --cs-popover-dir-x: 1;
            --cs-popover-dir-y: 0;
            margin-inline-end: var(--cs-popover-offset);
        }

        .cs-popover[data-placement="left"] {
            --cs-popover-origin: center right;
            position-area: inline-start;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover[data-placement="left-start"] {
            --cs-popover-origin: top right;
            position-area: inline-start span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover[data-placement="left-end"] {
            --cs-popover-origin: bottom right;
            position-area: inline-start span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        /* RIGHT */
        .cs-popover[data-placement^="right"] {
            --cs-popover-dir-x: -1;
            --cs-popover-dir-y: 0;
            margin-inline-start: var(--cs-popover-offset);
        }

        .cs-popover[data-placement="right"] {
            --cs-popover-origin: center left;
            position-area: inline-end;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover[data-placement="right-start"] {
            --cs-popover-origin: top left;
            position-area: inline-end span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover[data-placement="right-end"] {
            --cs-popover-origin: bottom left;
            position-area: inline-end span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        /* =========================================================
        * MOTION (`animate = true` by default)
        * Tuned by default for medium/large floating surfaces (menus, pickers).
        * Micro-surfaces (like Tooltip) can override `--cs-popover-anim-*` tokens.
        * ========================================================= */
        .cs-popover[data-animate] {
            /* Tunable motion tokens (Default = rich menu/picker physics) */
            --cs-popover-distance: var(--cs-popover-anim-distance, 8px);
            --cs-popover-scale-start: var(--cs-popover-anim-scale-start, 0.9);
            --cs-popover-scale-exit: var(--cs-popover-anim-scale-exit, 0.95);
            --cs-popover-blur-start: var(--cs-popover-anim-blur-start, 3.5px);
            --cs-popover-blur-exit: var(--cs-popover-anim-blur-exit, 2px);
            --cs-popover-dur-in: var(--cs-popover-anim-dur-in, var(--cs-dur-enter-md));
            --cs-popover-dur-fade-in: var(--cs-popover-anim-dur-fade-in, var(--cs-dur-effect));
            --cs-popover-dur-blur-in: var(--cs-popover-anim-dur-blur-in, calc(var(--cs-dur-enter-md) * 0.5));
            --cs-popover-dur-out: var(--cs-popover-anim-dur-out, var(--cs-dur-exit-md));

            opacity: 0;
            filter: blur(var(--cs-popover-blur-exit));
            translate: calc(var(--cs-popover-dir-x) * var(--cs-popover-distance) * 0.5)
                calc(var(--cs-popover-dir-y) * var(--cs-popover-distance) * 0.5);
            scale: var(--cs-popover-scale-exit);

            transition:
                opacity var(--cs-popover-dur-out) var(--cs-ease-exit),
                scale var(--cs-popover-dur-out) var(--cs-ease-exit),
                translate var(--cs-popover-dur-out) var(--cs-ease-exit),
                filter calc(var(--cs-popover-dur-out) * 0.8) var(--cs-ease-exit),
                display var(--cs-popover-dur-out) allow-discrete,
                overlay var(--cs-popover-dur-out) allow-discrete;
        }

        .cs-popover[data-animate]:popover-open {
            opacity: 1;
            filter: blur(0px);
            translate: 0 0;
            scale: 1;

            transition:
                opacity var(--cs-popover-dur-fade-in) var(--cs-ease-effect),
                filter var(--cs-popover-dur-blur-in) var(--cs-ease-effect),
                scale var(--cs-popover-dur-in) var(--cs-ease-enter),
                translate var(--cs-popover-dur-in) var(--cs-ease-enter),
                display var(--cs-popover-dur-in) allow-discrete,
                overlay var(--cs-popover-dur-in) allow-discrete;
        }

        .cs-popover[data-animate][data-warm]:popover-open,
        .cs-popover[data-animate][data-instant] {
            --cs-popover-dur-in: 0s;
            --cs-popover-dur-fade-in: 0s;
            --cs-popover-dur-blur-in: 0s;
            --cs-popover-dur-out: 0s;
            transition: none !important;
        }

        @starting-style {
            .cs-popover[data-animate]:popover-open {
                opacity: 0;
                filter: blur(var(--cs-popover-blur-start));
                translate: calc(var(--cs-popover-dir-x) * var(--cs-popover-distance))
                    calc(var(--cs-popover-dir-y) * var(--cs-popover-distance));
                scale: var(--cs-popover-scale-start);
            }
        }
    }
</style>
