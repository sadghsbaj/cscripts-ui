<script module>
    export const id = "ref-08-comment-composer";
    export const label = "08 - Comment Composer";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import CommentComposer from "./CommentComposer.svelte";

    type PreviewMode = "empty" | "draft" | "submitting" | "disabled";

    const DRAFT_TEXT =
        "Looks great! One small note on the spacing between the footer actions:\nCould we tighten the gap slightly so the shortcut hint stays balanced with the send button?";

    let mode = $state<PreviewMode>("empty");
    let value = $state("");

    const submitting = $derived(mode === "submitting");
    const disabled = $derived(mode === "disabled");

    function handleModeChange(next: PreviewMode): void {
        if (next === "empty") {
            value = "";
            return;
        }

        value = DRAFT_TEXT;
    }

    async function handleSubmit(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        mode = "empty";
    }
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <CommentComposer bind:value {submitting} {disabled} onsubmit={handleSubmit} />

    <SegmentedControl
        size="sm"
        bind:value={mode}
        onValueChange={handleModeChange}
        aria-label="Comment composer state"
    >
        <SegmentedControlItem value="empty">
            <SegmentedControlLabel>Empty</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="draft">
            <SegmentedControlLabel>Draft</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="submitting">
            <SegmentedControlLabel>Submitting</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="disabled">
            <SegmentedControlLabel>Disabled</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
