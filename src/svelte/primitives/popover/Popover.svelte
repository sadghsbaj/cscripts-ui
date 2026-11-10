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
- Structural Primitive: Handles anchoring and viewport-aware positioning while leaving visual styling
  and transition animations completely open to consuming components.
-->

<script lang="ts">
    import { type PopoverProps } from ".";

    let {
        id,
        placement,
        size,
        offset = "8px",
        popover = "auto",
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
    style:--popover-anchor={`--anchor-${id}`}
    style:--popover-offset={offset}
>
    {@render children?.()}
</div>

<style>
    @layer components.primitive {
        .cs-popover[popover]:not(:popover-open) {
            display: none;
        }

        .cs-popover {
            position-anchor: var(--popover-anchor);
            position-visibility: anchors-visible;
            position: fixed;
            inset: auto;
            margin: 0;
            max-inline-size: calc(100vw - 32px);
            max-block-size: calc(100vh - 32px);
            overflow: auto;
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
            margin-block-end: var(--popover-offset);
        }

        .cs-popover[data-placement="top"] {
            position-area: block-start;
            position-try-fallbacks: flip-block;
        }

        .cs-popover[data-placement="top-start"] {
            position-area: block-start span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover[data-placement="top-end"] {
            position-area: block-start span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        /* BOTTOM */
        .cs-popover[data-placement^="bottom"] {
            margin-block-start: var(--popover-offset);
        }

        .cs-popover[data-placement="bottom"] {
            position-area: block-end;
            position-try-fallbacks: flip-block;
        }

        .cs-popover[data-placement="bottom-start"] {
            position-area: block-end span-inline-end;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        .cs-popover[data-placement="bottom-end"] {
            position-area: block-end span-inline-start;
            position-try-fallbacks:
                flip-block,
                flip-inline,
                flip-block flip-inline;
        }

        /* LEFT */
        .cs-popover[data-placement^="left"] {
            margin-inline-end: var(--popover-offset);
        }

        .cs-popover[data-placement="left"] {
            position-area: inline-start;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover[data-placement="left-start"] {
            position-area: inline-start span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover[data-placement="left-end"] {
            position-area: inline-start span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        /* RIGHT */
        .cs-popover[data-placement^="right"] {
            margin-inline-start: var(--popover-offset);
        }

        .cs-popover[data-placement="right"] {
            position-area: inline-end;
            position-try-fallbacks: flip-inline;
        }

        .cs-popover[data-placement="right-start"] {
            position-area: inline-end span-block-end;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }

        .cs-popover[data-placement="right-end"] {
            position-area: inline-end span-block-start;
            position-try-fallbacks:
                flip-inline,
                flip-block,
                flip-inline flip-block;
        }
    }
</style>
