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
                background-color: var(--cs-color-elevated);
                border-radius: var(--cs-radius-full);
                corner-shape: var(--cs-squircle-soft);
                box-shadow: var(--cs-shadow-elevated);
            }
        }
    }
</style>
