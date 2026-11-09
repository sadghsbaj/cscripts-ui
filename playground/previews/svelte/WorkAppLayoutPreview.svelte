<script module>
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppIntro,
        WorkAppMain,
        WorkAppThemeButton,
    } from "cs/svelte/work";

    export const id = "work-app-layout";
    export const label = "App-Layout";
</script>

<script lang="ts">
    let activeTab = $state("Übersicht");
</script>

<!-- "fixed" just to test the layout without preview peculiarities interfering -->
<div class="fixed inset-0">
    <WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen" persist={false}>
        <WorkAppFrame>
            <WorkAppHeader>
                <WorkAppHeaderSegment align="end">
                    <WorkAppThemeButton />
                </WorkAppHeaderSegment>
            </WorkAppHeader>
            <WorkAppMain>
                <div class="bg-elevation-1 shadow-elevation-1 rounded-2xl squircle p-6 flex flex-col gap-4">
                    <h2 class="title-lg">{activeTab}</h2>
                    <p class="text-weak">Work application shell with segmented header controls.</p>
                </div>
            </WorkAppMain>
        </WorkAppFrame>
    </WorkAppIntro>
</div>
