<script lang="ts">
    import type { WorkAppIntroPhase } from "./index.ts";
    import WorkAppIntro from "./WorkAppIntro.svelte";
    import WorkAppIntroTestProbe from "./WorkAppIntroTestProbe.internal.svelte";

    let {
        toolCategory = "Operations",
        toolName = "Planner",
        persist = false,
        phase = $bindable<WorkAppIntroPhase>("idle"),
        settled = $bindable(false),
    }: {
        toolCategory?: string;
        toolName?: string;
        persist?: boolean;
        phase?: WorkAppIntroPhase;
        settled?: boolean;
    } = $props();
</script>

<WorkAppIntro {toolCategory} {toolName} {persist} bind:phase bind:settled>
    <WorkAppIntroTestProbe />
</WorkAppIntro>
