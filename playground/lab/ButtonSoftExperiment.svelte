<script lang="ts">
    import { Plus, Trash2 } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";

    import LabCompare, { type LabVariant } from "./LabCompare.svelte";

    const sizes = ["sm", "md", "lg"] as const;

    const variants: readonly LabVariant[] = [
        { id: "current", label: "Aktuell (Soft Farbig)", content: currentSoft },
        { id: "neutral-bg", label: "Neutral-Base + Farb-Text", content: neutralBgSoft },
    ];
</script>

{#snippet buttonRows()}
    <div class="w-full flex flex-col gap-4">
        <div class="flex flex-col gap-2">
            <span class="text-xs text-weak">Accent</span>
            {#each sizes as size (size)}
                <div class="flex items-center justify-between gap-3">
                    <Button {size} variant="soft" color="accent">
                        <ButtonLabel>Speichern</ButtonLabel>
                    </Button>
                    <Button
                        {size}
                        variant="soft"
                        color="accent"
                        iconOnly
                        aria-label="Hinzufügen"
                        {@attach tooltip("Hinzufügen")}
                    >
                        <ButtonIcon icon={Plus} />
                        <HitArea size="md" />
                    </Button>
                </div>
            {/each}
        </div>

        <div class="flex flex-col gap-2">
            <span class="text-xs text-weak">Danger</span>
            {#each sizes as size (size)}
                <div class="flex items-center justify-between gap-3">
                    <Button {size} variant="soft" color="danger">
                        <ButtonLabel>Löschen</ButtonLabel>
                    </Button>
                    <Button
                        {size}
                        variant="soft"
                        color="danger"
                        iconOnly
                        aria-label="Löschen"
                        {@attach tooltip("Löschen")}
                    >
                        <ButtonIcon icon={Trash2} />
                        <HitArea size="md" />
                    </Button>
                </div>
            {/each}
        </div>
    </div>
{/snippet}

{#snippet currentSoft()}
    {@render buttonRows()}
{/snippet}

{#snippet neutralBgSoft()}
    <div class="lab-neutral-soft w-full">
        {@render buttonRows()}
    </div>
{/snippet}

<LabCompare {variants} />

<style>
    .lab-neutral-soft :global(.cs-button[data-variant="soft"]) {
        --_bg: var(--cs-color-base-soft);
        --_bg-hover: var(--cs-color-base-soft-hover);
    }
</style>
