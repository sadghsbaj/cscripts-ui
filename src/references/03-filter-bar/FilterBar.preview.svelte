<script module>
    export const id = "ref-03-filter-bar";
    export const label = "03 - Filter Bar";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import FilterBar from "./FilterBar.svelte";

    type PreviewMode = "default" | "filtered" | "disabled";

    let mode = $state<PreviewMode>("default");
    let query = $state("");
    let status = $state<"all" | "open" | "done">("all");
    let ownerOnly = $state(false);
    let highPriority = $state(false);
    let sort = $state<"updated" | "title">("updated");

    const disabled = $derived(mode === "disabled");

    function handleModeChange(next: PreviewMode): void {
        if (next === "filtered") {
            ownerOnly = true;
            return;
        }
        if (next === "default") {
            ownerOnly = false;
            highPriority = false;
        }
    }
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <div class="w-full max-w-[var(--cs-container-2xl)] min-h-340px flex flex-col">
        <FilterBar bind:query bind:status bind:ownerOnly bind:highPriority bind:sort {disabled} />
    </div>

    <SegmentedControl
        size="sm"
        bind:value={mode}
        onValueChange={handleModeChange}
        aria-label="Filter bar state"
    >
        <SegmentedControlItem value="default">
            <SegmentedControlLabel>Default</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="filtered">
            <SegmentedControlLabel>Filtered</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="disabled">
            <SegmentedControlLabel>Disabled</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
