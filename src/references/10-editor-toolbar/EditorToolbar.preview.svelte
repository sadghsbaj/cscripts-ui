<script module>
    export const id = "ref-10-editor-toolbar";
    export const label = "10 - Editor Toolbar";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import EditorToolbar from "./EditorToolbar.svelte";

    type PreviewMode = "default" | "disabled";

    let mode = $state<PreviewMode>("default");
    const disabled = $derived(mode === "disabled");
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-8">
    <EditorToolbar {disabled} />

    <SegmentedControl size="sm" bind:value={mode} aria-label="Editor toolbar state">
        <SegmentedControlItem value="default">
            <SegmentedControlLabel>Default</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="disabled">
            <SegmentedControlLabel>Disabled</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
