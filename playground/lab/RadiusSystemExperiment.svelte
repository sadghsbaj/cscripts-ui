<script lang="ts">
    import { Plus, Settings, Sparkles } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { Checkbox } from "cs/svelte/checkbox";
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";

    import LabCompare, { type LabVariant } from "./LabCompare.svelte";

    const rows = [
        { size: "sm", btnRadius: "10px", cbRadius: "5px" },
        { size: "md", btnRadius: "12px", cbRadius: "6px" },
        { size: "lg", btnRadius: "14px", cbRadius: "7px" },
    ] as const;

    const variants: readonly LabVariant[] = [
        { id: "current", label: "Aktuell (Pill + 40% Checkbox)", content: currentSystem },
        { id: "adult", label: "Erwachsener (10/12/14px + 5/6/7px)", content: adultSystem },
    ];
</script>

{#snippet controlsDemo(showRadiusHint: boolean)}
    <div class="w-full flex flex-col gap-5">
        <div class="flex items-center justify-between gap-2 pb-1">
            <span class="text-xs text-weak">CloseButton bleibt rund</span>
            <CloseButton variant="soft" size="md" aria-label="Schließen">
                <HitArea size="md" />
            </CloseButton>
        </div>

        <div class="flex flex-col gap-3">
            {#each rows as row (row.size)}
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2">
                        <Button size={row.size} variant="primary">
                            <ButtonIcon icon={Sparkles} />
                            <ButtonLabel>Speichern</ButtonLabel>
                        </Button>
                        <Button size={row.size} variant="secondary">
                            <ButtonLabel>Bearbeiten</ButtonLabel>
                        </Button>
                        <Button size={row.size} variant="tertiary">
                            <ButtonLabel>Abbrechen</ButtonLabel>
                        </Button>
                    </div>

                    <div class="flex items-center gap-2">
                        <Button
                            size={row.size}
                            variant="tertiary"
                            iconOnly
                            aria-label="Hinzufügen"
                            {@attach tooltip(showRadiusHint ? `${row.size}: ${row.btnRadius}` : `Pill (${row.size})`)}
                        >
                            <ButtonIcon icon={Plus} />
                            <HitArea size="md" />
                        </Button>
                        <Button
                            size={row.size}
                            variant="secondary"
                            iconOnly
                            aria-label="Einstellungen"
                            {@attach tooltip(showRadiusHint ? `${row.size}: ${row.btnRadius}` : `Pill (${row.size})`)}
                        >
                            <ButtonIcon icon={Settings} />
                            <HitArea size="md" />
                        </Button>
                    </div>
                </div>
            {/each}
        </div>

        <div class="flex items-center justify-between gap-4 pt-2">
            <span class="text-xs text-weak">Checkboxen (sm / md / lg)</span>
            <div class="flex items-center gap-4">
                {#each rows as row (row.size)}
                    <div class="flex items-center gap-2">
                        <Checkbox variant="soft" size={row.size} />
                        <Checkbox variant="soft" size={row.size} checked />
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/snippet}

{#snippet currentSystem()}
    {@render controlsDemo(false)}
{/snippet}

{#snippet adultSystem()}
    <div class="lab-adult-system w-full">
        {@render controlsDemo(true)}
    </div>
{/snippet}

<LabCompare {variants} />

<style>
    .lab-adult-system :global(.cs-button[data-size="sm"]) {
        border-radius: 10px;
        corner-shape: var(--cs-squircle-smooth);
    }

    .lab-adult-system :global(.cs-button[data-size="md"]) {
        border-radius: 12px;
        corner-shape: var(--cs-squircle-smooth);
    }

    .lab-adult-system :global(.cs-button[data-size="lg"]) {
        border-radius: 14px;
        corner-shape: var(--cs-squircle-smooth);
    }

    .lab-adult-system :global(.cs-checkbox[data-size="sm"]) {
        border-radius: 5px;
    }

    .lab-adult-system :global(.cs-checkbox[data-size="md"]) {
        border-radius: 6px;
    }

    .lab-adult-system :global(.cs-checkbox[data-size="lg"]) {
        border-radius: 7px;
    }
</style>
