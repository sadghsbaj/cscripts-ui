<script lang="ts">
    import {
        SegmentedControlIcon,
        SegmentedControlItem,
        SegmentedControlLabel,
    } from "../../modules/segmented-control/index.ts";
    import type { WorkAppDocsTabProps } from "./index.ts";

    let { ref = $bindable(null), value, icon, children, ...rest }: WorkAppDocsTabProps = $props();
</script>

<SegmentedControlItem {...rest} bind:ref {value}>
    {#if icon}
        <SegmentedControlIcon {icon} />
    {/if}
    {#if children}
        <SegmentedControlLabel>
            {@render children()}
        </SegmentedControlLabel>
    {/if}
</SegmentedControlItem>
