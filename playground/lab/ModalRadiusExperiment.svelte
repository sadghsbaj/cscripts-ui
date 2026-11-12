<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay } from "cs/svelte/overlay";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";

    import LabCompare, { type LabVariant } from "./LabCompare.svelte";

    let openMode = $state<"pill" | "squircle-px" | null>(null);
    let disableCornerShape = $state(false);

    const variants: readonly LabVariant[] = [
        { id: "pill", label: "Normale Rundung (Pill)", content: pillModalPreview },
        { id: "squircle-px", label: "Niedrigere Rundung (12px)", content: pxModalPreview },
    ];
</script>

{#snippet modalBox(mode: "pill" | "squircle-px", inOverlay: boolean)}
    <div
        role="dialog"
        aria-modal={inOverlay ? "true" : undefined}
        aria-labelledby="modal-title-{mode}-{inOverlay}"
        class={[
            "bg-elevation-1 shadow-elevation-1 rounded-3xl squircle w-full max-w-420px relative flex flex-col gap-4 p-6",
            mode === "squircle-px" && "lab-squircle-radius",
            disableCornerShape && "lab-no-corner-shape",
        ]}
    >
        <div class="flex items-start justify-between gap-4">
            <h3 id="modal-title-{mode}-{inOverlay}" class="title-xl pt-0.5">Änderungen speichern?</h3>

            <CloseButton
                variant="soft"
                size="sm"
                class="-mt-2 -mr-2"
                aria-label="Schließen"
                onclick={() => {
                    if (inOverlay) openMode = null;
                }}
            >
                <HitArea size="md" />
            </CloseButton>
        </div>

        <p class="text-sm text-main leading-relaxed">
            Es gibt ungespeicherte Anpassungen in diesem Dokument. Möchtest du sie übernehmen, bevor du fortfährst?
        </p>

        <div class="flex items-center justify-end gap-2 pt-2">
            <Button
                size="md"
                variant="soft"
                color="accent"
                class="lab-base-accent-btn"
                onclick={() => {
                    if (inOverlay) openMode = null;
                }}
            >
                <ButtonLabel>Abbrechen</ButtonLabel>
            </Button>

            <Button
                size="md"
                variant="solid"
                color="accent"
                onclick={() => {
                    if (inOverlay) openMode = null;
                }}
            >
                <ButtonLabel>Speichern</ButtonLabel>
            </Button>
        </div>
    </div>
{/snippet}

{#snippet pillModalPreview()}
    <div class="w-full flex flex-col items-center gap-4">
        {@render modalBox("pill", false)}
        <Button size="sm" variant="elevated" onclick={() => (openMode = "pill")}>
            <ButtonLabel>Im Overlay öffnen</ButtonLabel>
        </Button>
    </div>
{/snippet}

{#snippet pxModalPreview()}
    <div class="w-full flex flex-col items-center gap-4">
        {@render modalBox("squircle-px", false)}
        <Button size="sm" variant="elevated" onclick={() => (openMode = "squircle-px")}>
            <ButtonLabel>Im Overlay öffnen</ButtonLabel>
        </Button>
    </div>
{/snippet}

<div class="w-full flex flex-col items-center gap-4">
    <ToggleButton variant="soft" color="accent" size="sm" bind:pressed={disableCornerShape}>
        <ToggleButtonLabel>Corner-Shape aus (Fallback)</ToggleButtonLabel>
    </ToggleButton>

    <LabCompare {variants} />
</div>

{#if openMode}
    <Overlay
        variant="blur"
        onclick={(e) => {
            if (e.target === e.currentTarget) openMode = null;
        }}
    >
        {@render modalBox(openMode, true)}
    </Overlay>
{/if}

<style>
    :global(.lab-base-accent-btn) {
        --_bg: var(--cs-color-base-soft);
        --_bg-hover: var(--cs-color-base-soft-hover);
    }

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

    :global(.lab-no-corner-shape),
    .lab-no-corner-shape :global(.cs-button),
    .lab-no-corner-shape :global(.cs-close-button) {
        corner-shape: round !important;
    }
</style>
