<!--
@component
Flexible layout segment (`<WorkAppHeaderSegment />`) for positioning custom controls
inside `<WorkAppHeader />`.

Architectural Notes:
- Alignment: Requires explicit `align` configuration ('start' | 'center' | 'end') without implicit fallback defaults.
- Center Centering: Center-aligned segments are geometrically centered to the header container.
- Island Surface: Optional `island={true}` applies the tactile elevated pill styling matching the tool identity and brand pills.
-->
<script lang="ts">
    import type { WorkAppHeaderSegmentProps } from "./index.ts";

    let { align, island = false, children, class: className, ...rest }: WorkAppHeaderSegmentProps = $props();
</script>

<div
    {...rest}
    class={["cs-work-app-header-segment", className]}
    data-alignment={align}
    data-island={island ? "" : undefined}
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
                padding-inline: 16px;
                background-color: var(--cs-color-elevation-1);
                border-radius: var(--cs-radius-full);
                corner-shape: var(--cs-squircle-smooth);
                box-shadow: var(--cs-shadow-elevation-1);
            }
        }
    }
</style>
