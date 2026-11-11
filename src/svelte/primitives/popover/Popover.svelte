<!--
@component
Low-level floating surface primitive (`<Popover />`) providing the architectural foundation
for floating UI (tooltips, dropdown menus, context menus, and custom popovers).

Abstracts repetitive boilerplate around the HTML Popover API (`popover="auto" | "hint" | "manual"`)
and native CSS Anchor Positioning (`position-anchor`, `position-area`, adaptive fallback flips,
and sizing constraints).

Architectural Notes:
- Automatic Anchor Linking: Establishes `--anchor-${id}` automatically from its `id`,
  seamlessly pairing with `popoverTrigger({ target: id })` without manual anchor declarations.
- Centralized Directional Motion: Ships with built-in spring motion (`animate = true` by default)
  powered by spatial unit vectors (`--popover-dir-x`, `--popover-dir-y`) and `--popover-origin` derived
  from `placement`. Consuming surfaces (like Tooltip or dropdown menus) can fine-tune motion by overriding
  `--popover-anim-*` custom properties or disable it entirely via `animate={false}`.
-->

<script lang="ts">
    import { type PopoverProps } from ".";

    let {
        id,
        placement,
        size,
        offset = "8px",
        popover = "auto",
        animate = true,
        class: className,
        children,
        ...rest
    }: PopoverProps = $props();
</script>

<div
    {...rest}
    {id}
    {popover}
    class={["cs-popover", className]}
    data-size={size}
    data-placement={placement}
    data-animate={animate ? "" : undefined}
    style:--popover-anchor={`--anchor-${id}`}
    style:--popover-offset={offset}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-popover {
            /* Spatial unit vectors (-1 | 0 | 1) pointing toward the trigger anchor.
            * Consumed by built-in [data-animate] or custom composite transitions (e.g. Tooltip). */
            --popover-dir-x: 0;
            --popover-dir-y: 1;
            --popover-origin: bottom center;

            position-anchor: var(--popover-anchor);
            position-visibility: anchors-visible;
            position: fixed;
            inset: auto;
            margin: 0;
            max-inline-size: calc(100vw - 32px);
            max-block-size: calc(100vh - 32px);
            overflow: auto;
            transform-origin: var(--popover-origin);
        }

        /* =========================================================
        * HINT WARMUP ACCELERATION
        * Eliminates open-delay across adjacent hint triggers while
        * a hint popover is open or during the 300ms warmup window.
        * ========================================================= */
        :global(:root[data-cs-hint-warm] [interestfor]) {
            interest-delay: 0ms var(--_hint-close-delay, 150ms) !important;
        }

        /* =========================================================
        * SIZES
        * ========================================================= */
        .cs-popover[data-size="content"] {
            inline-size: max-content;
        }

        .cs-popover[data-size="anchor"] {
            inline-size: anchor-size(inline);
        }

        .cs-popover[data-size="min-anchor"] {
            inline-size: max-content;
            min-inline-size: anchor-size(inline);
        }

        /* =========================================================
        * PLACEMENTS
        * ========================================================= */

        /* TOP */
        .cs-popover[data-placement^="top"] {
            --popover-dir-x: 0;
            --popover-dir-y: 1;
            margin-block-end: var(--popover-offset);
        }

        .cs-popover[data-placement="top"] {
            --popover-origin: bottom center;
            position-area: block-start;
            position-try-fallbacks: flip-block;
        }

        .cs-popover[data-placement="top-start"] {
            --popover-origin: bottom left;
            position-area: block-start span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover[data-placement="top-end"] {
            --popover-origin: bottom right;
            position-area: block-start span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        /* BOTTOM */
        .cs-popover[data-placement^="bottom"] {
            --popover-dir-x: 0;
            --popover-dir-y: -1;
            margin-block-start: var(--popover-offset);
        }

        .cs-popover[data-placement="bottom"] {
            --popover-origin: top center;
            position-area: block-end;
            position-try-fallbacks: flip-block;
        }

        .cs-popover[data-placement="bottom-start"] {
            --popover-origin: top left;
            position-area: block-end span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover[data-placement="bottom-end"] {
            --popover-origin: top right;
            position-area: block-end span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        /* LEFT */
        .cs-popover[data-placement^="left"] {
            --popover-dir-x: 1;
            --popover-dir-y: 0;
            margin-inline-end: var(--popover-offset);
        }

        .cs-popover[data-placement="left"] {
            --popover-origin: center right;
            position-area: inline-start;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover[data-placement="left-start"] {
            --popover-origin: top right;
            position-area: inline-start span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover[data-placement="left-end"] {
            --popover-origin: bottom right;
            position-area: inline-start span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        /* RIGHT */
        .cs-popover[data-placement^="right"] {
            --popover-dir-x: -1;
            --popover-dir-y: 0;
            margin-inline-start: var(--popover-offset);
        }

        .cs-popover[data-placement="right"] {
            --popover-origin: center left;
            position-area: inline-end;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover[data-placement="right-start"] {
            --popover-origin: top left;
            position-area: inline-end span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover[data-placement="right-end"] {
            --popover-origin: bottom left;
            position-area: inline-end span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        /* =========================================================
        * MOTION (`animate = true` by default)
        * Tuned by default for medium/large floating surfaces (menus, pickers).
        * Micro-surfaces (like Tooltip) can override `--popover-anim-*` tokens.
        * ========================================================= */
        .cs-popover[data-animate] {
            /* Tunable motion tokens (Default = rich menu/picker physics) */
            --_distance: var(--popover-anim-distance, 8px);
            --_scale-start: var(--popover-anim-scale-start, 0.9);
            --_scale-exit: var(--popover-anim-scale-exit, 0.95);
            --_blur-start: var(--popover-anim-blur-start, 3.5px);
            --_blur-exit: var(--popover-anim-blur-exit, 2px);
            --_dur-in: var(--popover-anim-dur-in, 380ms);
            --_dur-fade-in: var(--popover-anim-dur-fade-in, 160ms);
            --_dur-blur-in: var(--popover-anim-dur-blur-in, 190ms);
            --_dur-out: var(--popover-anim-dur-out, 120ms);

            opacity: 0;
            filter: blur(var(--_blur-exit));
            translate: calc(var(--popover-dir-x) * var(--_distance) * 0.5)
                calc(var(--popover-dir-y) * var(--_distance) * 0.5);
            scale: var(--_scale-exit);

            transition:
                opacity var(--_dur-out) var(--cs-ease-quad-in),
                scale var(--_dur-out) var(--cs-ease-quad-in),
                translate var(--_dur-out) var(--cs-ease-quad-in),
                filter calc(var(--_dur-out) * 0.8) var(--cs-ease-quad-in),
                display var(--_dur-out) allow-discrete,
                overlay var(--_dur-out) allow-discrete;
        }

        .cs-popover[data-animate]:popover-open {
            opacity: 1;
            filter: blur(0px);
            translate: 0 0;
            scale: 1;

            transition:
                opacity var(--_dur-fade-in) var(--cs-ease-quart-out),
                filter var(--_dur-blur-in) var(--cs-ease-quart-out),
                scale var(--_dur-in) var(--cs-spring-snappy),
                translate var(--_dur-in) var(--cs-spring-snappy),
                display var(--_dur-in) allow-discrete,
                overlay var(--_dur-in) allow-discrete;
        }

        @starting-style {
            .cs-popover[data-animate]:popover-open {
                opacity: 0;
                filter: blur(var(--_blur-start));
                translate: calc(var(--popover-dir-x) * var(--_distance)) calc(var(--popover-dir-y) * var(--_distance));
                scale: var(--_scale-start);
            }
        }
    }
</style>
