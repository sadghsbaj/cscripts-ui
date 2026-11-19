<script module lang="ts">
    import { BookOpen, FolderOpen, Table2 } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { popoverTrigger } from "cs/svelte/popover";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import {
        WORKSPACE_ACCESS_DOT_STATUS_MAP,
        WorkAppDocs,
        WorkAppDocsCallout,
        WorkAppDocsCard,
        WorkAppDocsCardGrid,
        WorkAppDocsChapter,
        WorkAppDocsCode,
        WorkAppDocsContent,
        WorkAppDocsHeader,
        WorkAppDocsKbd,
        WorkAppDocsMark,
        WorkAppDocsSection,
        WorkAppDocsTable,
        WorkAppDocsTableBody,
        WorkAppDocsTableCell,
        WorkAppDocsTableHead,
        WorkAppDocsTableHeaderCell,
        WorkAppDocsTableRow,
        WorkAppDocsTabs,
        WorkAppFrame,
        WorkAppHeader,
        WorkAppHeaderSegment,
        WorkAppHelpButton,
        WorkAppIntro,
        WorkAppMain,
        WorkAppStatusDot,
        WorkAppThemeButton,
        WorkWorkspaceGate,
        WorkWorkspaceMenu,
        type WorkspaceAccessStatus,
    } from "cs/svelte/work";

    export const id = "work-app-layout";
    export const label = "App-Layout";
</script>

<script lang="ts">
    let activeTab = $state("Übersicht");
    let showDocs = $state(false);

    const uid = $props.id();
    const menuId = `${uid}-workspace-menu`;
    let workspaceStatus = $state<WorkspaceAccessStatus>("ready");
    let directoryName = $state<string | null>("Holzanalysen-Daten");
    let headerSegmentRef = $state<HTMLElement | null>(null);
    let gateRef = $state<{ nudge: () => void } | null>(null);

    function handleWorkspaceConnect(): void {
        workspaceStatus = "ready";
        directoryName = "Holzanalysen-Daten";
    }

    function handleWorkspaceDisconnect(): void {
        workspaceStatus = "unlinked";
        directoryName = null;
    }
</script>

<!-- "fixed" just to test the layout without preview peculiarities interfering -->
<div class="fixed inset-0">
    <WorkAppIntro toolCategory="Holzeinkauf" toolName="Holzanalysen" persist={false}>
        <ScrollArea size="lg" direction="vertical" class="size-full">
            <ScrollAreaContent {@attach scrollFade({ size: "lg", direction: "vertical", edges: "both" })}>
                <WorkAppFrame>
                    <WorkAppHeader>
                        <WorkAppHeaderSegment align="before" renderIsland bind:ref={headerSegmentRef}>
                            <WorkAppStatusDot
                                status={WORKSPACE_ACCESS_DOT_STATUS_MAP[workspaceStatus]}
                                pulse={workspaceStatus !== "ready"}
                                {@attach popoverTrigger({
                                    target: menuId,
                                    triggerOn: "pointerdown",
                                    anchor: () => headerSegmentRef,
                                })}
                            >
                                <HitArea size="md" />
                            </WorkAppStatusDot>

                            <WorkWorkspaceMenu
                                id={menuId}
                                offset="8px"
                                status={workspaceStatus}
                                {directoryName}
                                onselect={handleWorkspaceConnect}
                                ongrant={handleWorkspaceConnect}
                                ondisconnect={handleWorkspaceDisconnect}
                            />
                        </WorkAppHeaderSegment>

                        <WorkAppHeaderSegment align="end">
                            <WorkAppHelpButton bind:pressed={showDocs} />
                            <WorkAppThemeButton />
                        </WorkAppHeaderSegment>
                    </WorkAppHeader>
                    <WorkAppMain>
                        {#if showDocs}
                            <WorkAppDocs defaultChapter="einstieg">
                                <WorkAppDocsHeader
                                    title="Holzanalysen"
                                    lead="Labor- und Eingangsproben erfassen, prüfen und exportieren."
                                />

                                <WorkAppDocsTabs />

                                <WorkAppDocsContent>
                                    <WorkAppDocsChapter
                                        id="einstieg"
                                        title="Einstieg"
                                        icon={BookOpen}
                                        lead="Alle Messreihen liegen direkt im verknüpften Arbeitsverzeichnis."
                                    >
                                        <p>
                                            Nach dem Verknüpfen des lokalen <WorkAppDocsMark>Arbeitsordners</WorkAppDocsMark>
                                            stehen bestehende Proben sofort in der Übersicht bereit. Neue
                                            Datensätze landen automatisch in
                                            <WorkAppDocsCode>proben-2026.csv</WorkAppDocsCode>.
                                        </p>

                                        <WorkAppDocsCallout variant="note" title="Automatische Sicherung">
                                            <p>
                                                Jede bestätigte Eingabe wird ohne separates Speichern direkt
                                                im Arbeitsordner fortgeschrieben.
                                            </p>
                                        </WorkAppDocsCallout>
                                    </WorkAppDocsChapter>

                                    <WorkAppDocsChapter
                                        id="arbeitsweise"
                                        title="Arbeitsweise"
                                        icon={FolderOpen}
                                        lead="Wiegescheine, Feuchtemessung und Freigabe greifen ineinander."
                                    >
                                        <WorkAppDocsCardGrid>
                                            <WorkAppDocsCard
                                                title="Schnelle Erfassung"
                                                description="Durchgängige Tastatursteuerung für laufende Wiegescheine."
                                            />
                                            <WorkAppDocsCard
                                                title="Direkter Abgleich"
                                                description="Auffällige Abweichungen werden direkt bei der Eingabe markiert."
                                            />
                                        </WorkAppDocsCardGrid>

                                        <WorkAppDocsSection title="Tastenkürzel" level={3}>
                                            <p>
                                                Mit <WorkAppDocsKbd>Alt</WorkAppDocsKbd> +
                                                <WorkAppDocsKbd>N</WorkAppDocsKbd> öffnest du eine neue
                                                Probenmaske, <WorkAppDocsKbd>Strg</WorkAppDocsKbd> +
                                                <WorkAppDocsKbd>Enter</WorkAppDocsKbd> übernimmt den Datensatz.
                                            </p>
                                        </WorkAppDocsSection>
                                    </WorkAppDocsChapter>

                                    <WorkAppDocsChapter
                                        id="referenz"
                                        title="Referenz"
                                        icon={Table2}
                                        lead="Grenzwerte für die reguläre Eingangskontrolle."
                                    >
                                        <WorkAppDocsTable caption="Zulässige Zielwerte">
                                            <WorkAppDocsTableHead>
                                                <WorkAppDocsTableRow>
                                                    <WorkAppDocsTableHeaderCell>Parameter</WorkAppDocsTableHeaderCell>
                                                    <WorkAppDocsTableHeaderCell align="end">Zielwert</WorkAppDocsTableHeaderCell>
                                                </WorkAppDocsTableRow>
                                            </WorkAppDocsTableHead>
                                            <WorkAppDocsTableBody>
                                                <WorkAppDocsTableRow>
                                                    <WorkAppDocsTableCell>Eingangsfeuchte</WorkAppDocsTableCell>
                                                    <WorkAppDocsTableCell align="end">max. 18 %</WorkAppDocsTableCell>
                                                </WorkAppDocsTableRow>
                                                <WorkAppDocsTableRow>
                                                    <WorkAppDocsTableCell>Fremdstoffanteil</WorkAppDocsTableCell>
                                                    <WorkAppDocsTableCell align="end">&lt; 0,5 %</WorkAppDocsTableCell>
                                                </WorkAppDocsTableRow>
                                            </WorkAppDocsTableBody>
                                        </WorkAppDocsTable>
                                    </WorkAppDocsChapter>
                                </WorkAppDocsContent>
                            </WorkAppDocs>
                        {:else}
                            <div class="bg-elevated shadow-elevated rounded-2xl squircle p-6 flex flex-col gap-4">
                                <h2 class="title-lg">{activeTab}</h2>
                                <p class="text-weak">Work application shell with segmented header controls.</p>
                            </div>

                            <div class="min-h-300dvh bg-elevated shadow-elevated rounded-2xl squircle"></div>
                        {/if}
                    </WorkAppMain>
                </WorkAppFrame>
            </ScrollAreaContent>
        </ScrollArea>
    </WorkAppIntro>

    {#if workspaceStatus !== "ready"}
        <Overlay
            variant="blur"
            onclick={(event) => {
                if (event.target === event.currentTarget) {
                    gateRef?.nudge();
                }
            }}
        >
            <WorkWorkspaceGate
                bind:this={gateRef}
                status={workspaceStatus}
                {directoryName}
                onselect={handleWorkspaceConnect}
                ongrant={handleWorkspaceConnect}
            />
        </Overlay>
    {/if}
</div>
