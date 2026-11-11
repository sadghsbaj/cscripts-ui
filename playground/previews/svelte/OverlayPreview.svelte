<script module lang="ts">
    export const id = "overlay";
    export const label = "Overlay";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
    import { Overlay, OVERLAY_VARIANTS, type OverlayVariant } from "cs/svelte/overlay";
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";

    let isOpen = $state(false);
    let selectedVariant = $state<string>("blur");
    let isLongContent = $state(false);
</script>

<div class="flex flex-col items-center gap-8 size-full py-12">
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

        <div class="flex items-center gap-3">
            <ToggleButton
                variant="soft"
                color="accent"
                size="md"
                bind:pressed={isLongContent}
            >
                <ToggleButtonLabel>Hintergrund scrollbar</ToggleButtonLabel>
            </ToggleButton>

            <Button variant="solid" color="accent" size="md" onclick={() => (isOpen = true)}>
                <ButtonLabel>Open</ButtonLabel>
            </Button>
        </div>
    </div>

    {#if isLongContent}
        <div class="h-1400px w-full max-w-600px flex flex-col gap-4 items-center justify-between py-8 opacity-40">
            <span class="caption">Hintergrund-Scrollbereich Anfang</span>
            <div class="h-200px w-full rounded-3xl squircle bg-elevation-1"></div>
            <div class="h-200px w-full rounded-3xl squircle bg-elevation-1"></div>
            <div class="h-200px w-full rounded-3xl squircle bg-elevation-1"></div>
            <span class="caption">Hintergrund-Scrollbereich Ende</span>
        </div>
    {/if}
</div>

{#if isOpen}
    <Overlay variant={selectedVariant as OverlayVariant} onclick={() => (isOpen = false)}>
        <CloseButton
            variant="elevated"
            size="xl"
            class="absolute top-32px right-32px"
            onclick={() => (isOpen = false)}
        >
            <HitArea size="md" />
        </CloseButton>

        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-6 flex flex-col gap-4 w-360px h-320px relative"
        >
            <ScrollArea size="sm" direction="vertical" class="size-full">
                <ScrollAreaContent
                    class="flex flex-col gap-3 py-1"
                    {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
                >
                    {#each Array.from({ length: 8 }) as _, i (i)}
                        <div class="bg-elevation-2 rounded-3xl squircle h-16 w-full shrink-0"></div>
                    {/each}
                </ScrollAreaContent>
            </ScrollArea>
        </div>
    </Overlay>
{/if}
