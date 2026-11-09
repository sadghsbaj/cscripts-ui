<script module>
    import { scrollFade } from "cs/svelte/attachments";
    import { HitArea, ScrollArea, ScrollAreaContent } from "cs/svelte/components";
    import {
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
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
        <ScrollArea size="lg" direction="vertical" class="size-full">
            <ScrollAreaContent {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}>
                <WorkAppFrame>
                    <WorkAppHeader>
                        <WorkAppHeaderSegment align="before" renderIsland>
                            <WorkAppStatusDot
                                status="success"
                                onclick={() => alert("Dateisystem-Verbindung ausgewählt")}
                            >
                                <HitArea size="md" />
                            </WorkAppStatusDot>
                        </WorkAppHeaderSegment>

                        <WorkAppHeaderSegment align="end">
                            <WorkAppHelpButton onclick={() => alert("Handbuch / Hilfe geöffnet")} />
                            <WorkAppThemeButton />
                        </WorkAppHeaderSegment>
                    </WorkAppHeader>
                    <WorkAppMain>
                        <div class="bg-elevation-1 shadow-elevation-1 rounded-2xl squircle p-6 flex flex-col gap-4">
                            <h2 class="title-lg">{activeTab}</h2>
                            <p class="text-weak">Work application shell with segmented header controls.</p>
                        </div>

                        <div class="min-h-300dvh bg-elevation-1 shadow-elevation-1 rounded-2xl squircle"></div>
                    </WorkAppMain>
                </WorkAppFrame>
            </ScrollAreaContent>
        </ScrollArea>
    </WorkAppIntro>
</div>
