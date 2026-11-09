<!--
@component
Flexible layout segment (`<WorkAppHeaderSegment />`) for positioning custom controls
inside `<WorkAppHeader />`.

Architectural Notes:
- Alignment: Requires explicit `align` configuration ('before' | 'start' | 'center' | 'end' | 'after').
  - 'before': Positioned on the outer left edge before the tool name.
  - 'start': Positioned after the tool name, before the spacer.
  - 'center': Geometrically centered to the header container.
  - 'end': Positioned after the spacer, before the brand badge.
  - 'after': Positioned on the outer right edge after the brand badge.
- Island Surface: Optional `renderIsland={true}` applies the tactile elevated pill styling matching the tool identity and brand pills.
-->
<script lang="ts">
    import type { WorkAppHeaderSegmentProps } from "./index.ts";

    let {
        align,
        renderIsland,
        island = false,
        children,
        class: className,
        ...rest
    }: WorkAppHeaderSegmentProps = $props();

    const isIsland = $derived(renderIsland ?? island);
</script>

<div
    {...rest}
    class={["cs-work-app-header-segment", className]}
    data-alignment={align}
    data-island={isIsland ? "" : undefined}
>
    {@render children?.()}
</div>

<style>
    @layer components.composite {
        .cs-work-app-header-segment {
            display: inline-flex;
            flex-shrink: 0;
            gap: 8px;
            align-items: center;
            height: 100%;

            &[data-island] {
                padding-inline: 14px;
                background-color: var(--cs-color-elevation-1);
                border-radius: var(--cs-radius-full);
                corner-shape: var(--cs-squircle-smooth);
                box-shadow: var(--cs-shadow-elevation-1);
            }
        }
    }
</style>
