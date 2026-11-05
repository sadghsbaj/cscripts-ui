<script module>
    import { WorkAppFrame, WorkAppHeader, WorkAppIntro, WorkAppMain, WorkAppSignature } from "cs/svelte/work";

    export const id = "work-app-layout";
    export const label = "App-Layout";
</script>

<script lang="ts">
</script>

<!-- "fixed" just to test the layout without preview peculiarities interfering -->
<div class="fixed inset-0">
    <WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen" persist={false}>
        <WorkAppFrame>
            <WorkAppHeader></WorkAppHeader>
            <WorkAppMain>Main content</WorkAppMain>

            <WorkAppSignature />
        </WorkAppFrame>
    </WorkAppIntro>
</div>
