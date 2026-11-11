<script module lang="ts">
    export const id = "overlay";
    export const label = "Overlay";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay, OVERLAY_VARIANTS, type OverlayVariant } from "cs/svelte/overlay";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";

    let isOpen = $state(false);
    let selectedVariant = $state<string>("blur");
</script>

<div class="flex-center size-full min-h-400px">
    <div
        class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 flex flex-col items-center gap-6 min-w-340px"
    >
        <div class="flex flex-col items-center gap-1">
            <h2 class="title-xl">Overlay</h2>
            <span class="description-sm whitespace-nowrap">Variante wählen & testen</span>
        </div>

        <ToggleButtonGroup type="single" bind:value={selectedVariant} orientation="horizontal">
            {#each OVERLAY_VARIANTS as variant (variant)}
                <ToggleButton value={variant} variant="soft" color="accent" size="md" class="w-28">
                    <ToggleButtonLabel>{variant}</ToggleButtonLabel>
                </ToggleButton>
            {/each}
        </ToggleButtonGroup>

        <Button variant="solid" color="accent" size="lg" onclick={() => (isOpen = true)}>
            <ButtonLabel>Open</ButtonLabel>
        </Button>
    </div>
</div>

{#if isOpen}
    <Overlay variant={selectedVariant as OverlayVariant} onclick={() => (isOpen = false)}>
        <CloseButton variant="elevated" size="xl" class="absolute top-32px right-32px" onclick={() => (isOpen = false)}>
            <HitArea size="md" />
        </CloseButton>
    </Overlay>
{/if}
