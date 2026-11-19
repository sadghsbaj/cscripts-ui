<script module>
    export const id = "ref-05-upload-item";
    export const label = "05 - Upload Item";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import UploadItem, { type UploadEntry, type UploadStatus } from "./UploadItem.svelte";

    type PreviewMode = "active" | "error" | "complete";

    let mode = $state<PreviewMode>("active");
    let reportProgress = $state(62);
    let reportStatus = $state<UploadStatus>("uploading");

    const items = $derived<UploadEntry[]>([
        {
            id: "report-q3",
            name: "report-q3.pdf",
            sizeLabel: "4.2 MB",
            progress: reportProgress,
            status: reportStatus,
        },
        {
            id: "photo-png",
            name: "photo.png",
            sizeLabel: "1.1 MB",
            progress: 100,
            status: "done",
        },
    ]);

    $effect(() => {
        if (mode !== "active" || reportStatus !== "uploading") return;

        const timer = setInterval(() => {
            if (reportProgress >= 100) {
                reportProgress = 100;
                reportStatus = "done";
                mode = "complete";
                return;
            }

            reportProgress = Math.min(100, reportProgress + 2);
        }, 120);

        return () => clearInterval(timer);
    });

    function handleModeChange(next: PreviewMode): void {
        if (next === "active") {
            reportProgress = 62;
            reportStatus = "uploading";
            return;
        }

        if (next === "error") {
            reportProgress = 62;
            reportStatus = "error";
            return;
        }

        reportProgress = 100;
        reportStatus = "done";
    }

    function handleCancel(itemId: string): void {
        if (itemId !== "report-q3") return;
        mode = "error";
        reportStatus = "error";
    }

    function handleRetry(itemId: string): void {
        if (itemId !== "report-q3") return;
        if (reportProgress >= 100) {
            reportProgress = 62;
        }
        mode = "active";
        reportStatus = "uploading";
    }
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <div class="w-full max-w-[var(--cs-container-md)] min-h-220px flex flex-col">
        <UploadItem {items} oncancel={handleCancel} onretry={handleRetry} />
    </div>

    <SegmentedControl
        size="sm"
        bind:value={mode}
        onValueChange={handleModeChange}
        aria-label="Upload item state"
    >
        <SegmentedControlItem value="active">
            <SegmentedControlLabel>Active</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="error">
            <SegmentedControlLabel>Error</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="complete">
            <SegmentedControlLabel>Complete</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
