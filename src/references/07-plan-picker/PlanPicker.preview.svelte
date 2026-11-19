<script module>
    export const id = "ref-07-plan-picker";
    export const label = "07 - Plan Picker";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import PlanPicker, { type BillingPeriod } from "./PlanPicker.svelte";

    type PreviewMode = "monthly" | "yearly" | "selected" | "disabled";

    let mode = $state<PreviewMode>("monthly");
    let billing = $state<BillingPeriod>("monthly");
    let selectedPlan = $state<string | undefined>();

    const disabled = $derived(mode === "disabled");

    function handleModeChange(next: PreviewMode): void {
        if (next === "monthly") {
            billing = "monthly";
            selectedPlan = undefined;
            return;
        }

        if (next === "yearly") {
            billing = "yearly";
            selectedPlan = undefined;
            return;
        }

        if (next === "selected") {
            selectedPlan = "pro";
            return;
        }

        selectedPlan = undefined;
    }
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <PlanPicker bind:billing bind:selectedPlan {disabled} />

    <SegmentedControl
        size="sm"
        bind:value={mode}
        onValueChange={handleModeChange}
        aria-label="Plan picker state"
    >
        <SegmentedControlItem value="monthly">
            <SegmentedControlLabel>Monthly</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="yearly">
            <SegmentedControlLabel>Yearly</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="selected">
            <SegmentedControlLabel>Selected</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="disabled">
            <SegmentedControlLabel>Disabled</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
