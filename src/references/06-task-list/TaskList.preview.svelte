<script module>
    export const id = "ref-06-task-list";
    export const label = "06 - Task List";
    export const layout = "stage";
</script>

<script lang="ts">
    import { SegmentedControl, SegmentedControlItem, SegmentedControlLabel } from "cs/svelte/segmented-control";
    import TaskList, { type TaskEntry } from "./TaskList.svelte";

    type PreviewMode = "active" | "done" | "disabled";

    const INITIAL_TASKS: TaskEntry[] = [
        { id: "brief", title: "Write project brief", done: false },
        { id: "tokens", title: "Review design tokens", done: false },
        { id: "release", title: "Confirm release date", done: false },
        { id: "invoice", title: "Send client invoice", done: true },
        { id: "archive", title: "Archive old branch", done: true },
    ];

    let mode = $state<PreviewMode>("active");
    let tasks = $state<TaskEntry[]>(INITIAL_TASKS.map((task) => ({ ...task })));

    const disabled = $derived(mode === "disabled");

    function handleModeChange(next: PreviewMode): void {
        if (next === "done") {
            tasks = tasks.map((task) => ({ ...task, done: true }));
            return;
        }

        if (next === "active" && tasks.every((task) => task.done)) {
            tasks = INITIAL_TASKS.map((task) => ({ ...task }));
        }
    }
</script>

<div class="min-h-full w-full flex-center flex-col bg-canvas p-8 gap-6">
    <div class="w-full max-w-[var(--cs-container-md)] min-h-[296px] flex flex-col">
        <TaskList bind:tasks {disabled} />
    </div>

    <SegmentedControl
        size="sm"
        bind:value={mode}
        onValueChange={handleModeChange}
        aria-label="Task list state"
    >
        <SegmentedControlItem value="active">
            <SegmentedControlLabel>Active</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="done">
            <SegmentedControlLabel>All done</SegmentedControlLabel>
        </SegmentedControlItem>
        <SegmentedControlItem value="disabled">
            <SegmentedControlLabel>Disabled</SegmentedControlLabel>
        </SegmentedControlItem>
    </SegmentedControl>
</div>
