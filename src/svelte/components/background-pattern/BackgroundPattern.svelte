<!--
@component
Backgroundpattern component (SVG based).

Architectural Notes:
- Defaults & Resets: Requires explicit `variant` and `size` props.
  See `../../explanations/component-defaults-and-globals.md`
- Tile shapes live in `BackgroundPatternVariants.svelte`, styling lives in CSS variables below.
-->
<script lang="ts">
    import * as variants from "./BackgroundPatternVariants.svelte";
    import { BACKGROUND_PATTERN_SPACING, type BackgroundPatternProps } from "./index.ts";

    // Unique per instance so multiple patterns don't collide in the DOM
    const uid = $props.id();
    const patternId = `cs-background-pattern-${uid}`;

    let { variant, size, class: className, ...rest }: BackgroundPatternProps = $props();

    // Live container size, used to emulate CSS `background-repeat: round`
    let width = $state(0);
    let height = $state(0);

    let spacing = $derived(BACKGROUND_PATTERN_SPACING[size]);

    // Divide the container by an integer tile count -> pattern always ends cleanly at the edges
    let spaceX = $derived(width > 0 ? width / (Math.round(width / spacing) || 1) : spacing);
    // Hexagons lock to sqrt(3) so they interlock without distortion
    let spaceY = $derived(
        variant === "hexagons"
            ? spaceX * Math.sqrt(3)
            : height > 0
              ? height / (Math.round(height / spacing) || 1)
              : spacing
    );

    // Crosses never get longer than a quarter tile (but at least 4px so they stay visible)
    let crossLength = $derived(Math.max(4, spacing * 0.25));

    let offset = $derived(variants.OFFSET_VARIANTS.has(variant));
</script>

<svg
    {...rest}
    bind:clientWidth={width}
    bind:clientHeight={height}
    aria-hidden="true"
    class={["cs-background-pattern", className]}
    data-variant={variant}
    data-size={size}
>
    <defs>
        <pattern
            id={patternId}
            width={spaceX}
            height={spaceY}
            x={offset ? spaceX / 2 : 0}
            y={offset ? spaceY / 2 : 0}
            patternUnits="userSpaceOnUse"
        >
            {@render variants[variant]({ spaceX, spaceY, crossLength })}
        </pattern>
    </defs>

    <rect width="100%" height="100%" fill="url(#{patternId})" />
</svg>

<style>
    @layer components {
        /* =========================================================
         * ANCHOR CONTEXT AUTO-ESTABLISHMENT (:has)
         * ---------------------------------------------------------
         * Automatically establishes a containing block for host bounds.
         * See ../../explanations/anchor-context-auto-establishment.md
         * ========================================================= */
        :global(:has(> .cs-background-pattern)) {
            contain: layout;
        }

        .cs-background-pattern {
            /* Public tokens - override these from outside */
            --cs-background-pattern-color: light-dark(
                color-mix(in oklch, var(--cs-color-base-900) 12%, transparent),
                color-mix(in oklch, var(--cs-color-base-100) 16%, transparent)
            );
            --cs-background-pattern-line-width: 1px;
            --cs-background-pattern-dot-radius: 1.5px;

            position: absolute;
            inset: 0;
            z-index: -1;

            display: block;
            width: 100%;
            height: 100%;
            color: var(--cs-background-pattern-color);
            border-radius: inherit;
            corner-shape: inherit;
            pointer-events: none;

            /* Shapes drawn by the variant snippets (rendered in another component -> :global) */
            & :global(.cs-background-pattern-stroke) {
                fill: none;
                stroke: currentColor;
                stroke-width: var(--cs-background-pattern-line-width);
            }

            & :global(.cs-background-pattern-dot) {
                r: var(--cs-background-pattern-dot-radius);
                fill: currentColor;
            }
        }
    }
</style>
