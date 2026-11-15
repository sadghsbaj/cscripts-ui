<script lang="ts">
    import { ChevronLeft } from "@lucide/svelte";
    import type { MouseEventHandler } from "svelte/elements";

    import SegmentedControl from "./SegmentedControl.svelte";
    import SegmentedControlIcon from "./SegmentedControlIcon.svelte";
    import SegmentedControlItem from "./SegmentedControlItem.svelte";
    import SegmentedControlLabel from "./SegmentedControlLabel.svelte";
    import type { SegmentedControlSize, SegmentedControlWidth } from "./index.ts";

    export interface TestSegmentedItem {
        value: string;
        label?: string;
        disabled?: boolean;
        withIcon?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement>;
    }

    interface Props {
        value?: string;
        onValueChange?: (value: string) => void;
        size?: SegmentedControlSize;
        width?: SegmentedControlWidth;
        disabled?: boolean;
        name?: string;
        ref?: HTMLDivElement | null;
        items: TestSegmentedItem[];
    }

    let {
        value = $bindable(),
        onValueChange,
        size = "md",
        width = "content",
        disabled = false,
        name,
        ref = $bindable(null),
        items,
    }: Props = $props();
</script>

<SegmentedControl
    bind:ref
    bind:value
    {onValueChange}
    {size}
    {width}
    {disabled}
    {name}
>
    {#each items as item (item.value)}
        <SegmentedControlItem value={item.value} disabled={item.disabled} onclick={item.onclick}>
            {#if item.withIcon}
                <SegmentedControlIcon icon={ChevronLeft} />
            {/if}
            <SegmentedControlLabel>{item.label ?? item.value}</SegmentedControlLabel>
        </SegmentedControlItem>
    {/each}
</SegmentedControl>
