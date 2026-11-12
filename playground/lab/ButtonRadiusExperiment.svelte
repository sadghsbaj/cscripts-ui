<script lang="ts">
    import { Plus, Sparkles } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";

    import LabCompare, { type LabVariant } from "./LabCompare.svelte";

    const rows = [
        { size: "sm", radiusLabel: "10px" },
        { size: "md", radiusLabel: "12px" },
        { size: "lg", radiusLabel: "14px" },
        { size: "xl", radiusLabel: "16px" },
    ] as const;

    const variants: readonly LabVariant[] = [
        { id: "pill", label: "Aktuell (Pill / height ÷ 2)", content: pillButtons },
        { id: "squircle-px", label: "Corner-Shape + 10/12/14/16px", content: pxRadiusButtons },
    ];
</script>

{#snippet buttonExamples()}
    <div class="w-full flex flex-col gap-3">
        {#each rows as row (row.size)}
            <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                    <Button size={row.size} variant="solid" color="accent">
                        <ButtonIcon icon={Sparkles} />
                        <ButtonLabel>Speichern ({row.size})</ButtonLabel>
                    </Button>
                    <Button size={row.size} variant="soft" color="base">
                        <ButtonLabel>Abbrechen</ButtonLabel>
                    </Button>
                    <Button size={row.size} variant="elevated">
                        <ButtonLabel>Option</ButtonLabel>
                    </Button>
                </div>

                <Button
                    size={row.size}
                    variant="soft"
                    color="accent"
                    iconOnly
                    aria-label="Hinzufügen"
                    {@attach tooltip(`${row.size} (${row.radiusLabel})`)}
                >
                    <ButtonIcon icon={Plus} />
                    <HitArea size="md" />
                </Button>
            </div>
        {/each}
    </div>
{/snippet}

{#snippet pillButtons()}
    {@render buttonExamples()}
{/snippet}

{#snippet pxRadiusButtons()}
    <div class="lab-squircle-radius w-full">
        {@render buttonExamples()}
    </div>
{/snippet}

<LabCompare {variants} />

<style>
    .lab-squircle-radius :global(.cs-button[data-size="sm"]) {
        border-radius: 10px;
    }

    .lab-squircle-radius :global(.cs-button[data-size="md"]) {
        border-radius: 12px;
    }

    .lab-squircle-radius :global(.cs-button[data-size="lg"]) {
        border-radius: 14px;
    }

    .lab-squircle-radius :global(.cs-button[data-size="xl"]) {
        border-radius: 16px;
    }
</style>
