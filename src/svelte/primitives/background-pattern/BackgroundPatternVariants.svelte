<!--
@component
SVG tile snippets for every `BackgroundPattern` variant.

Each snippet draws ONE tile inside an SVG `<pattern>`. Styling (color, stroke width,
dot radius) is intentionally NOT done here but via CSS variables / classes in
`BackgroundPattern.svelte`:
- `.cs-background-pattern-stroke` -> stroke with `--cs-background-pattern-line-width`
- `.cs-background-pattern-dot`    -> fill with `--cs-background-pattern-dot-radius`
-->
<script module lang="ts">
    /** Geometry handed to every variant snippet (all values in px). */
    export interface BackgroundPatternVariantContext {
        spaceX: number;
        spaceY: number;
        crossLength: number;
    }

    /** Variants whose tile has to be shifted by half a tile so shapes sit centered. */
    export const OFFSET_VARIANTS = new Set(["grid", "crosses", "hexagons", "topography"]);

    export { dots, grid, crosses, lines, hexagons, topography };
</script>

{#snippet dots({ spaceX, spaceY }: BackgroundPatternVariantContext)}
    <circle class="cs-background-pattern-dot" cx={spaceX / 2} cy={spaceY / 2} />
{/snippet}

{#snippet grid({ spaceX, spaceY }: BackgroundPatternVariantContext)}
    <path class="cs-background-pattern-stroke" d={`M ${spaceX} 0 L 0 0 L 0 ${spaceY}`} />
{/snippet}

{#snippet crosses({ spaceX, spaceY, crossLength }: BackgroundPatternVariantContext)}
    <path
        class="cs-background-pattern-stroke"
        d={`M ${spaceX / 2 - crossLength / 2} ${spaceY / 2} H ${spaceX / 2 + crossLength / 2}
            M ${spaceX / 2} ${spaceY / 2 - crossLength / 2} V ${spaceY / 2 + crossLength / 2}`}
    />
{/snippet}

{#snippet lines({ spaceX, spaceY }: BackgroundPatternVariantContext)}
    <path class="cs-background-pattern-stroke" d={`M 0 ${spaceY / 2} L ${spaceX} ${spaceY / 2}`} />
{/snippet}

{#snippet hexagons({ spaceX, spaceY }: BackgroundPatternVariantContext)}
    <path
        class="cs-background-pattern-stroke"
        d={`M ${spaceX / 2} 0 L ${spaceX} ${spaceY / 6} V ${spaceY / 2} L ${spaceX / 2} ${(spaceY * 2) / 3}
            L 0 ${spaceY / 2} V ${spaceY / 6} Z
            M ${spaceX / 2} ${(spaceY * 2) / 3} V ${spaceY}`}
    />
{/snippet}

{#snippet topography({ spaceX, spaceY }: BackgroundPatternVariantContext)}
    <path
        class="cs-background-pattern-stroke"
        d={`M 0 ${spaceY * 0.15} C ${spaceX * 0.3} ${spaceY * 0.02}, ${spaceX * 0.6} ${spaceY * 0.28}, ${spaceX} ${spaceY * 0.15}
            M 0 ${spaceY * 0.4} C ${spaceX * 0.35} ${spaceY * 0.22}, ${spaceX * 0.65} ${spaceY * 0.58}, ${spaceX} ${spaceY * 0.4}
            M 0 ${spaceY * 0.65} C ${spaceX * 0.3} ${spaceY * 0.48}, ${spaceX * 0.7} ${spaceY * 0.82}, ${spaceX} ${spaceY * 0.65}
            M 0 ${spaceY * 0.9} C ${spaceX * 0.35} ${spaceY * 0.78}, ${spaceX * 0.6} ${spaceY * 1.02}, ${spaceX} ${spaceY * 0.9}`}
    />
{/snippet}
