<script module lang="ts">
    export const id = "work-conflict-modal";
    export const label = "WorkConflictModal";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Overlay } from "cs/svelte/overlay";
    import { Switch } from "cs/svelte/switch";
    import {
        WorkConflictModal,
        type WorkConflictChoices,
        type WorkConflictField,
        type WorkConflictQueuePosition,
        type WorkConflictValueRenderContext,
    } from "cs/svelte/work";

    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    type ScenarioId = "whole-file" | "remote-deleted" | "single-field" | "multi-field" | "queue" | "reconflict";

    interface ActiveConflictState {
        scenario: ScenarioId;
        conflictKey: string;
        resourceLabel: string;
        remoteDeleted: boolean;
        fields: readonly WorkConflictField[] | null;
        showBaseValue: boolean;
        queuePosition: WorkConflictQueuePosition | null;
        useExcelRenderer: boolean;
        busy: boolean;
        errorMessage: string | null;
        reconflictAttempt: number;
    }

    interface ResolutionLogEntry {
        id: number;
        resource: string;
        outcome: string;
        choices?: WorkConflictChoices;
    }

    const currencyFormatter = new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
    });

    const dateFormatter = new Intl.DateTimeFormat("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    const STATUS_LABELS: Record<string, { text: string; tone: "positive" | "caution" | "neutral" }> = {
        freigegeben: { text: "Freigegeben", tone: "positive" },
        "in-pruefung": { text: "In Prüfung", tone: "caution" },
        entwurf: { text: "Entwurf", tone: "neutral" },
    };

    const SINGLE_FIELD_ITEMS: readonly WorkConflictField[] = [
        {
            id: "delivery-date",
            label: "Liefertermin",
            baseValue: "2026-12-08",
            localValue: "2026-12-12",
            remoteValue: "2026-12-15",
        },
    ];

    const MULTI_FIELD_ITEMS: readonly WorkConflictField[] = [
        {
            id: "contact",
            label: "Ansprechpartner",
            baseValue: "Thomas Weber",
            localValue: "Markus Weber",
            remoteValue: "Sabine Weber",
        },
        {
            id: "discount",
            label: "Rabatt (%)",
            baseValue: 5,
            localValue: 7.5,
            remoteValue: 6,
        },
        {
            id: "express",
            label: "Expresslieferung",
            baseValue: false,
            localValue: true,
            remoteValue: false,
        },
        {
            id: "delivery-note",
            label: "Lieferhinweis",
            baseValue: "Anlieferung über Hauptzufahrt.",
            localValue: "Anlieferung über Tor 3 (Nord).\nBitte 30 Min. vor Ankunft telefonisch melden.",
            remoteValue: "Anlieferung über Hauptzufahrt Werk II.\nLieferschein direkt im Versandbüro abgeben.",
        },
        {
            id: "special-terms",
            label: "Sonderkondition",
            conflictKind: "delete-edit",
            baseValue: "Rahmenvertrag 2025",
            localValue: "Rahmenvertrag 2026 (verlängert)",
            remoteValue: undefined,
        },
    ];

    const EXCEL_CELL_FIELDS: readonly WorkConflictField[] = [
        {
            id: "cell-d14",
            label: "Zelle D14 – Gesamtpreis",
            baseValue: 14_500,
            localValue: 14_850,
            remoteValue: 15_200,
        },
        {
            id: "cell-b8",
            label: "Zelle B8 – Liefertermin",
            baseValue: "2026-12-10",
            localValue: "2026-12-14",
            remoteValue: "2026-12-18",
        },
        {
            id: "cell-f3",
            label: "Zelle F3 – Freigabestatus",
            baseValue: "entwurf",
            localValue: "freigegeben",
            remoteValue: "in-pruefung",
        },
    ];

    const QUEUE_STEPS: readonly Omit<
        ActiveConflictState,
        "scenario" | "queuePosition" | "busy" | "errorMessage" | "reconflictAttempt"
    >[] = [
        {
            conflictKey: "queue-step-1",
            resourceLabel: "kalkulation-weber-2026.xlsx",
            remoteDeleted: false,
            fields: EXCEL_CELL_FIELDS,
            showBaseValue: true,
            useExcelRenderer: true,
        },
        {
            conflictKey: "queue-step-2",
            resourceLabel: "anhaenge/werkzeichnung-rev3.pdf",
            remoteDeleted: false,
            fields: null,
            showBaseValue: false,
            useExcelRenderer: false,
        },
        {
            conflictKey: "queue-step-3",
            resourceLabel: "entwuerfe/sonderposten-nord.json",
            remoteDeleted: true,
            fields: null,
            showBaseValue: false,
            useExcelRenderer: false,
        },
    ];

    const RECONFLICT_INITIAL_FIELDS: readonly WorkConflictField[] = [
        {
            id: "quantity",
            label: "Menge (Palette)",
            baseValue: 12,
            localValue: 16,
            remoteValue: 14,
        },
        {
            id: "status",
            label: "Auftragsstatus",
            baseValue: "Offen",
            localValue: "In Fertigung",
            remoteValue: "Freigegeben",
        },
    ];

    const RECONFLICT_UPDATED_FIELDS: readonly WorkConflictField[] = [
        {
            id: "quantity",
            label: "Menge (Palette)",
            baseValue: 14,
            localValue: 16,
            remoteValue: 18,
        },
        {
            id: "status",
            label: "Auftragsstatus",
            baseValue: "Freigegeben",
            localValue: "In Fertigung",
            remoteValue: "Versandbereit",
        },
    ];

    const uid = $props.id();
    const baseValueSwitchId = `${uid}-show-base`;

    let showBaseValue = $state(true);
    let activeConflict = $state<ActiveConflictState | null>(null);
    let queueIndex = $state(0);
    let modalRef = $state<{ nudge: () => void } | null>(null);
    let logEntries = $state<ResolutionLogEntry[]>([]);
    let nextLogId = 1;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    function clearSaveTimer(): void {
        if (saveTimer === null) return;
        clearTimeout(saveTimer);
        saveTimer = null;
    }

    $effect(() => clearSaveTimer);

    function recordResolution(
        resource: string,
        outcome: string,
        choices?: WorkConflictChoices,
    ): void {
        logEntries = [
            { id: nextLogId++, resource, outcome, choices },
            ...logEntries.slice(0, 7),
        ];
    }

    function openWholeFile(): void {
        clearSaveTimer();
        activeConflict = {
            scenario: "whole-file",
            conflictKey: `whole-file-${Date.now()}`,
            resourceLabel: "lieferplan-2026-q4.xlsx",
            remoteDeleted: false,
            fields: null,
            showBaseValue: false,
            queuePosition: null,
            useExcelRenderer: false,
            busy: false,
            errorMessage: null,
            reconflictAttempt: 0,
        };
    }

    function openRemoteDeleted(): void {
        clearSaveTimer();
        activeConflict = {
            scenario: "remote-deleted",
            conflictKey: `remote-deleted-${Date.now()}`,
            resourceLabel: "kunden/altbestand-2024.json",
            remoteDeleted: true,
            fields: null,
            showBaseValue: false,
            queuePosition: null,
            useExcelRenderer: false,
            busy: false,
            errorMessage: null,
            reconflictAttempt: 0,
        };
    }

    function openSingleField(): void {
        clearSaveTimer();
        activeConflict = {
            scenario: "single-field",
            conflictKey: `single-field-${Date.now()}`,
            resourceLabel: "Kunde: Weber Maschinenbau GmbH",
            remoteDeleted: false,
            fields: SINGLE_FIELD_ITEMS,
            showBaseValue,
            queuePosition: null,
            useExcelRenderer: false,
            busy: false,
            errorMessage: null,
            reconflictAttempt: 0,
        };
    }

    function openMultiField(): void {
        clearSaveTimer();
        activeConflict = {
            scenario: "multi-field",
            conflictKey: `multi-field-${Date.now()}`,
            resourceLabel: "Kunde: Weber Maschinenbau GmbH",
            remoteDeleted: false,
            fields: MULTI_FIELD_ITEMS,
            showBaseValue,
            queuePosition: null,
            useExcelRenderer: false,
            busy: false,
            errorMessage: null,
            reconflictAttempt: 0,
        };
    }

    function openQueueStep(index: number): void {
        const step = QUEUE_STEPS[index];
        if (!step) {
            activeConflict = null;
            return;
        }
        queueIndex = index;
        activeConflict = {
            ...step,
            scenario: "queue",
            queuePosition: { current: index + 1, total: QUEUE_STEPS.length },
            busy: false,
            errorMessage: null,
            reconflictAttempt: 0,
        };
    }

    function openQueue(): void {
        clearSaveTimer();
        openQueueStep(0);
    }

    function openReconflict(): void {
        clearSaveTimer();
        activeConflict = {
            scenario: "reconflict",
            conflictKey: "reconflict-v1",
            resourceLabel: "auftraege/2026-0815.json",
            remoteDeleted: false,
            fields: RECONFLICT_INITIAL_FIELDS,
            showBaseValue: true,
            queuePosition: null,
            useExcelRenderer: false,
            busy: false,
            errorMessage: null,
            reconflictAttempt: 0,
        };
    }

    function finishCurrentStep(): void {
        if (!activeConflict) return;
        if (activeConflict.scenario === "queue" && queueIndex + 1 < QUEUE_STEPS.length) {
            openQueueStep(queueIndex + 1);
            return;
        }
        activeConflict = null;
    }

    function handleKeepLocal(): void {
        if (!activeConflict) return;
        recordResolution(activeConflict.resourceLabel, "keep-local");
        finishCurrentStep();
    }

    function handleKeepRemote(): void {
        if (!activeConflict) return;
        const outcome = activeConflict.remoteDeleted ? "accept-deletion" : "keep-remote";
        recordResolution(activeConflict.resourceLabel, outcome);
        finishCurrentStep();
    }

    function handleApplyChoices(choices: WorkConflictChoices): void {
        if (!activeConflict) return;

        if (activeConflict.scenario === "reconflict") {
            const current = activeConflict;
            activeConflict = { ...current, busy: true, errorMessage: null };

            clearSaveTimer();
            saveTimer = setTimeout(() => {
                saveTimer = null;
                if (!activeConflict || activeConflict.scenario !== "reconflict") return;

                if (activeConflict.reconflictAttempt === 0) {
                    activeConflict = {
                        ...activeConflict,
                        conflictKey: "reconflict-v2",
                        fields: RECONFLICT_UPDATED_FIELDS,
                        busy: false,
                        errorMessage:
                            "Zwischenzeitlich wurde eine neuere Version gespeichert. Bitte erneut abgleichen.",
                        reconflictAttempt: 1,
                    };
                    modalRef?.nudge();
                    return;
                }

                recordResolution(activeConflict.resourceLabel, "apply-choices (retry)", choices);
                activeConflict = null;
            }, 600);
            return;
        }

        recordResolution(activeConflict.resourceLabel, "apply-choices", choices);
        finishCurrentStep();
    }

    function formatIsoDate(value: unknown): string {
        if (typeof value !== "string") return String(value);
        const parsed = new Date(`${value}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return value;
        return dateFormatter.format(parsed);
    }

    function formatChoicesSummary(choices: WorkConflictChoices): string {
        return Object.entries(choices)
            .map(([key, value]) => `${key}: ${typeof value === "string" ? value : "custom"}`)
            .join(", ");
    }
</script>

{#snippet renderExcelValue({ field, value }: WorkConflictValueRenderContext)}
    {#if field.id === "cell-d14" && typeof value === "number"}
        <span class="font-semibold tabular-nums">{currencyFormatter.format(value)}</span>
    {:else if field.id === "cell-b8"}
        <span class="tabular-nums">{formatIsoDate(value)}</span>
    {:else if field.id === "cell-f3" && typeof value === "string"}
        {let badge = $derived(STATUS_LABELS[value] ?? { text: value, tone: "neutral" })}
        <span
            class={[
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
                badge.tone === "positive" && "bg-positive-soft text-positive-soft-fg",
                badge.tone === "caution" && "bg-caution-soft text-caution-soft-fg",
                badge.tone === "neutral" && "bg-base-soft text-main",
            ]}
        >
            {badge.text}
        </span>
    {:else}
        {String(value)}
    {/if}
{/snippet}

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="WorkConflictModal"
        description="Blocking conflict resolution modal supporting whole-file and per-field merge decisions."
    />

    <PreviewSection
        title="Compact Mode"
        description="Unstructured whole-file conflicts and remote deletion prompts."
    >
        <div class="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="md" onclick={openWholeFile}>
                <ButtonLabel>Whole-File Conflict</ButtonLabel>
            </Button>

            <Button variant="secondary" negative size="md" onclick={openRemoteDeleted}>
                <ButtonLabel>Delete vs. Edit</ButtonLabel>
            </Button>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Field Mode"
        description="Structured records with single or multiple conflicting fields."
    >
        <div class="flex flex-wrap items-center gap-4">
            <div class="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="md" onclick={openSingleField}>
                    <ButtonLabel>Single Field</ButtonLabel>
                </Button>

                <Button variant="primary" size="md" onclick={openMultiField}>
                    <ButtonLabel>Multi-Field Record</ButtonLabel>
                </Button>
            </div>

            <div class="flex items-center gap-2.5">
                <Switch id={baseValueSwitchId} size="sm" bind:checked={showBaseValue} />
                <label
                    for={baseValueSwitchId}
                    class="text-sm text-weak select-none cursor-pointer"
                >
                    showBaseValue
                </label>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Custom Cells & Queue"
        description="Three-step queue combining formatted Excel cells, a binary file, and a deleted file."
    >
        <Button variant="primary" size="md" onclick={openQueue}>
            <ButtonLabel>Open Queue (1 von 3)</ButtonLabel>
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Async & Re-Conflict"
        description="Simulates a 600ms save that hits a newer remote revision before succeeding on retry."
    >
        <Button variant="secondary" size="md" onclick={openReconflict}>
            <ButtonLabel>Simulate Re-Conflict</ButtonLabel>
        </Button>
    </PreviewSection>

    {#if logEntries.length > 0}
        <PreviewSection title="Resolution Log">
            <div class="flex flex-col gap-2 w-full max-w-640px">
                <div class="flex flex-col gap-1.5">
                    {#each logEntries as entry (entry.id)}
                        <div
                            class="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 rounded-xl bg-sunken shadow-sunken text-xs"
                        >
                            <span class="font-semibold text-strong">{entry.resource}</span>
                            <span class="text-weak font-mono flex flex-wrap items-center gap-x-2">
                                <span>{entry.outcome}</span>
                                {#if entry.choices}
                                    <span class="text-weaker">({formatChoicesSummary(entry.choices)})</span>
                                {/if}
                            </span>
                        </div>
                    {/each}
                </div>

                <div class="flex justify-end">
                    <Button variant="ghost" size="xs" onclick={() => (logEntries = [])}>
                        <ButtonLabel>Clear log</ButtonLabel>
                    </Button>
                </div>
            </div>
        </PreviewSection>
    {/if}
</div>

{#if activeConflict}
    <Overlay
        variant="blur"
        onclick={(event) => {
            if (event.target === event.currentTarget) {
                modalRef?.nudge();
            }
        }}
    >
        <WorkConflictModal
            bind:this={modalRef}
            conflictKey={activeConflict.conflictKey}
            resourceLabel={activeConflict.resourceLabel}
            remoteDeleted={activeConflict.remoteDeleted}
            fields={activeConflict.fields}
            showBaseValue={activeConflict.showBaseValue}
            queuePosition={activeConflict.queuePosition}
            busy={activeConflict.busy}
            errorMessage={activeConflict.errorMessage}
            onKeepLocal={handleKeepLocal}
            onKeepRemote={handleKeepRemote}
            onApplyChoices={handleApplyChoices}
            renderValue={activeConflict.useExcelRenderer ? renderExcelValue : undefined}
        />
    </Overlay>
{/if}
