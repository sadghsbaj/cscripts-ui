<script lang="ts">
    import type { SegmentedControlIconProps } from "./index.ts";

    let { icon: Icon, class: className, ...rest }: SegmentedControlIconProps = $props();
</script>

<Icon {...rest} aria-hidden="true" class={["cs-segmented-control-icon", className]} />

<style>
    @layer components.composite {
        :global(.cs-segmented-control-icon) {
            flex-shrink: 0;
            width: calc(1em + 2px);
            height: calc(1em + 2px);
            stroke-width: 2.5;
            pointer-events: none;
        }
    }
</style>
