<script lang="ts">
    import { Bold, Italic, Star, Underline } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import { ToggleButton, ToggleButtonIcon, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup, ToggleButtonGroupSeparator } from "cs/svelte/toggle-button-group";
    import { tooltip } from "cs/svelte/tooltip";

    import LabCompare, { type LabVariant } from "./LabCompare.svelte";

    let selectedTabPill = $state<string>("all");
    let selectedTabPx = $state<string>("all");
    let activeFormatPill = $state<string[]>(["bold"]);
    let activeFormatPx = $state<string[]>(["bold"]);

    const sizes = ["sm", "md", "lg"] as const;

    const variants: readonly LabVariant[] = [
        { id: "pill", label: "Aktuell (Pill / height ÷ 2)", content: pillToggles },
        { id: "squircle-px", label: "Corner-Shape + 10/12/14px", content: pxRadiusToggles },
    ];
</script>

{#snippet standaloneRows()}
    <div class="flex flex-col gap-3">
        <span class="text-xs text-weak">Einzelne ToggleButtons</span>
        {#each sizes as size (size)}
            <div class="flex items-center justify-between gap-3">
                <ToggleButton {size} variant="soft" color="accent" pressed={size === "md"}>
                    <ToggleButtonIcon icon={Star} />
                    <ToggleButtonLabel>Favorit ({size})</ToggleButtonLabel>
                </ToggleButton>

                <ToggleButton
                    {size}
                    variant="soft"
                    color="accent"
                    pressed={size === "md"}
                    iconOnly
                    aria-label="Favorit"
                    {@attach tooltip(`Favorit (${size})`)}
                >
                    <ToggleButtonIcon icon={Star} />
                    <HitArea size="md" />
                </ToggleButton>
            </div>
        {/each}
    </div>
{/snippet}

{#snippet pillToggles()}
    <div class="w-full flex flex-col gap-6">
        {@render standaloneRows()}

        <div class="flex flex-col gap-3">
            <span class="text-xs text-weak">ToggleButtonGroup (Single & Multiple)</span>
            <ToggleButtonGroup type="single" orientation="horizontal" bind:value={selectedTabPill}>
                <ToggleButton value="all" variant="soft" color="accent" size="md">
                    <ToggleButtonLabel>Alle</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="active" variant="soft" color="accent" size="md">
                    <ToggleButtonLabel>Aktiv</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="done" variant="soft" color="accent" size="md">
                    <ToggleButtonLabel>Fertig</ToggleButtonLabel>
                </ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup type="multiple" orientation="horizontal" bind:value={activeFormatPill}>
                <ToggleButton
                    value="bold"
                    variant="soft"
                    color="accent"
                    size="md"
                    iconOnly
                    aria-label="Fett"
                    {@attach tooltip("Fett")}
                >
                    <ToggleButtonIcon icon={Bold} />
                    <HitArea size="md" />
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton
                    value="italic"
                    variant="soft"
                    color="accent"
                    size="md"
                    iconOnly
                    aria-label="Kursiv"
                    {@attach tooltip("Kursiv")}
                >
                    <ToggleButtonIcon icon={Italic} />
                    <HitArea size="md" />
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton
                    value="underline"
                    variant="soft"
                    color="accent"
                    size="md"
                    iconOnly
                    aria-label="Unterstrichen"
                    {@attach tooltip("Unterstrichen")}
                >
                    <ToggleButtonIcon icon={Underline} />
                    <HitArea size="md" />
                </ToggleButton>
            </ToggleButtonGroup>
        </div>
    </div>
{/snippet}

{#snippet pxRadiusToggles()}
    <div class="lab-squircle-radius w-full flex flex-col gap-6">
        {@render standaloneRows()}

        <div class="flex flex-col gap-3">
            <span class="text-xs text-weak">ToggleButtonGroup (Single & Multiple)</span>
            <ToggleButtonGroup type="single" orientation="horizontal" bind:value={selectedTabPx}>
                <ToggleButton value="all" variant="soft" color="accent" size="md">
                    <ToggleButtonLabel>Alle</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="active" variant="soft" color="accent" size="md">
                    <ToggleButtonLabel>Aktiv</ToggleButtonLabel>
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton value="done" variant="soft" color="accent" size="md">
                    <ToggleButtonLabel>Fertig</ToggleButtonLabel>
                </ToggleButton>
            </ToggleButtonGroup>

            <ToggleButtonGroup type="multiple" orientation="horizontal" bind:value={activeFormatPx}>
                <ToggleButton
                    value="bold"
                    variant="soft"
                    color="accent"
                    size="md"
                    iconOnly
                    aria-label="Fett"
                    {@attach tooltip("Fett")}
                >
                    <ToggleButtonIcon icon={Bold} />
                    <HitArea size="md" />
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton
                    value="italic"
                    variant="soft"
                    color="accent"
                    size="md"
                    iconOnly
                    aria-label="Kursiv"
                    {@attach tooltip("Kursiv")}
                >
                    <ToggleButtonIcon icon={Italic} />
                    <HitArea size="md" />
                </ToggleButton>
                <ToggleButtonGroupSeparator />
                <ToggleButton
                    value="underline"
                    variant="soft"
                    color="accent"
                    size="md"
                    iconOnly
                    aria-label="Unterstrichen"
                    {@attach tooltip("Unterstrichen")}
                >
                    <ToggleButtonIcon icon={Underline} />
                    <HitArea size="md" />
                </ToggleButton>
            </ToggleButtonGroup>
        </div>
    </div>
{/snippet}

<LabCompare {variants} />

<style>
    .lab-squircle-radius :global(.cs-toggle-button[data-size="sm"]:not(.cs-toggle-button-group > *)) {
        border-radius: 10px;
    }

    .lab-squircle-radius :global(.cs-toggle-button[data-size="md"]:not(.cs-toggle-button-group > *)) {
        border-radius: 12px;
    }

    .lab-squircle-radius :global(.cs-toggle-button[data-size="lg"]:not(.cs-toggle-button-group > *)) {
        border-radius: 14px;
    }

    .lab-squircle-radius :global(.cs-toggle-button-group) {
        --_pill-radius: 12px;
    }
</style>
