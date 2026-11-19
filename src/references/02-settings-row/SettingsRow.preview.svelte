<script module>
    export const id = "ref-02-settings-row";
    export const label = "02 - Settings Row";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import SettingsRow from "./SettingsRow.svelte";

    type PreviewMode = "normal" | "disabled";

    let mode = $state<PreviewMode>("normal");
    let emailDigest = $state(true);
    let pushAlerts = $state(true);
    let quietHours = $state<"off" | "nightly" | "weekends">("nightly");
    let productUpdates = $state(false);

    const disabled = $derived(mode === "disabled");
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <SettingsRow bind:emailDigest bind:pushAlerts bind:quietHours bind:productUpdates {disabled} />

    <SegmentedControl size="sm" bind:value={mode} aria-label="Settings row state">
        <SegmentedControlItem value="normal">
            <SegmentedControlLabel>Normal</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="disabled">
            <SegmentedControlLabel>Disabled</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
