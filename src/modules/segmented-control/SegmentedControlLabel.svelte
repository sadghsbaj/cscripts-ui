<script lang="ts">
    import type { SegmentedControlLabelProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: SegmentedControlLabelProps = $props();
</script>

<span bind:this={ref} {...rest} class={["cs-segmented-control-label", className]}>
    {@render children?.()}
</span>

<style>
    @layer components.composite {
        .cs-segmented-control-label {
            min-width: 0;
            overflow-x: clip;
            overflow-y: visible;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-box: trim-both cap alphabetic;
        }
    }
</style>
