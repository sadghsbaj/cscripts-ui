<script lang="ts">
    import { Info, Plus, Save } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { TooltipIcon, TooltipKbd, TooltipText } from "cs/svelte/tooltip";

    import LabCompare, { type LabVariant } from "./LabCompare.svelte";

    const variants: readonly LabVariant[] = [
        { id: "smooth", label: "Aktuell (squircle-smooth / 1.6)", content: currentTooltips },
        { id: "soft", label: "Mit squircle-soft (1.2)", content: softTooltips },
    ];
</script>

{#snippet tooltipSamples()}
    <div class="w-full flex flex-col gap-6 items-start">
        <!-- 1. Nur Text -->
        <div class="flex flex-col items-center gap-2">
            <div role="tooltip" class="cs-tooltip lab-static-tooltip">
                <TooltipText>Kopieren</TooltipText>
            </div>
            <Button size="md" variant="tertiary" iconOnly aria-label="Kopieren">
                <ButtonIcon icon={Plus} />
                <HitArea size="md" />
            </Button>
        </div>

        <!-- 2. Icon + Text -->
        <div class="flex flex-col items-center gap-2">
            <div role="tooltip" class="cs-tooltip lab-static-tooltip">
                <TooltipIcon icon={Info} />
                <TooltipText>Einstellungen öffnen</TooltipText>
            </div>
            <Button size="md" variant="secondary">
                <ButtonLabel>Einstellungen</ButtonLabel>
            </Button>
        </div>

        <!-- 3. Icon + Text + Shortcut -->
        <div class="flex flex-col items-center gap-2">
            <div role="tooltip" class="cs-tooltip lab-static-tooltip">
                <TooltipIcon icon={Save} />
                <TooltipText>Änderungen speichern</TooltipText>
                <span class="cs-tooltip-shortcuts">
                    <TooltipKbd>Ctrl + S</TooltipKbd>
                </span>
            </div>
            <Button size="md" variant="primary">
                <ButtonLabel>Speichern</ButtonLabel>
            </Button>
        </div>

        <!-- 4. Längerer Text -->
        <div class="flex flex-col items-start gap-2">
            <div role="tooltip" class="cs-tooltip lab-static-tooltip">
                <TooltipText>Alle ungespeicherten Entwürfe verwerfen</TooltipText>
            </div>
            <Button size="sm" variant="secondary" danger>
                <ButtonLabel>Verwerfen</ButtonLabel>
            </Button>
        </div>
    </div>
{/snippet}

{#snippet currentTooltips()}
    {@render tooltipSamples()}
{/snippet}

{#snippet softTooltips()}
    <div class="lab-tooltip-soft w-full">
        {@render tooltipSamples()}
    </div>
{/snippet}

<LabCompare {variants} />

<style>
    .lab-static-tooltip {
        display: inline-flex;
        position: static;
        margin: 0;
        background-color: var(--cs-color-elevation-1);
        border-radius: var(--cs-radius-full);
        corner-shape: var(--cs-squircle-smooth);
        box-shadow: var(--cs-shadow-elevation-1);
        block-size: 26px;
        padding-inline: 8px;
        gap: 6px;
        align-items: center;
        justify-content: center;
        --_fs: 13px;
    }

    .lab-tooltip-soft .lab-static-tooltip {
        corner-shape: var(--cs-squircle-soft);
    }

    .lab-static-tooltip :global(.cs-tooltip-shortcuts) {
        display: inline-flex;
        gap: 2px;
        align-items: center;
        margin-inline-start: 2px;
    }
</style>
