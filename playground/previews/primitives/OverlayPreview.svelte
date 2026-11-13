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
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let isOpen = $state(false);
    let selectedVariant = $state<string>("blur");
    let isLongContent = $state(false);

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { Overlay } from "cs/svelte/overlay";
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";

    let isOpen = $state(false);
${closeScript}

{#if isOpen}
    <Overlay variant="blur" onclick={() => (isOpen = false)}>
        <CloseButton
            variant="elevated"
            size="xl"
            class="absolute top-32px right-32px"
            onclick={() => (isOpen = false)}
        >
            <HitArea size="md" />
        </CloseButton>

        <div class="bg-elevated shadow-elevated rounded-3xl squircle p-6 w-360px">
            Overlay content
        </div>
    </Overlay>
{/if}`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Overlay"
        description="Full-viewport backdrop layer with blur, dim, and solid variants plus automatic scroll locking."
    />

    <PreviewSection
        title="Interactive Demo"
        description="Select a backdrop variant and optionally enable page overflow to verify background scroll locking."
        code={basicCode}
    >
        <div class="flex flex-col items-center gap-5">
            <ToggleButtonGroup type="single" bind:value={selectedVariant} orientation="horizontal">
                {#each OVERLAY_VARIANTS as variant (variant)}
                    <ToggleButton value={variant} variant="soft" color="accent" size="md" class="w-24">
                        <ToggleButtonLabel>{variant}</ToggleButtonLabel>
                    </ToggleButton>
                {/each}
            </ToggleButtonGroup>

            <div class="flex items-center gap-3">
                <ToggleButton variant="soft" color="accent" size="md" bind:pressed={isLongContent}>
                    <ToggleButtonLabel>Scrollable page</ToggleButtonLabel>
                </ToggleButton>

                <Button variant="primary" size="md" onclick={() => (isOpen = true)}>
                    <ButtonLabel>Open overlay</ButtonLabel>
                </Button>
            </div>
        </div>
    </PreviewSection>

    {#if isLongContent}
        <div class="h-1400px w-full flex flex-col gap-4 items-center justify-between py-8 opacity-40">
            <span class="text-xs text-weak">Background scroll area start</span>
            <div class="h-200px w-full rounded-3xl squircle bg-elevated"></div>
            <div class="h-200px w-full rounded-3xl squircle bg-elevated"></div>
            <div class="h-200px w-full rounded-3xl squircle bg-elevated"></div>
            <span class="text-xs text-weak">Background scroll area end</span>
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
            class="bg-elevated shadow-elevated rounded-3xl squircle p-6 flex flex-col gap-4 w-360px h-320px relative"
        >
            <ScrollArea size="sm" direction="vertical" class="size-full">
                <ScrollAreaContent
                    class="flex flex-col gap-3 py-1"
                    {@attach scrollFade({ size: "sm", direction: "vertical", edges: "both" })}
                >
                    {#each Array.from({ length: 8 }) as _, i (i)}
                        <div class="bg-sunken rounded-3xl squircle h-16 w-full shrink-0"></div>
                    {/each}
                </ScrollAreaContent>
            </ScrollArea>
        </div>
    </Overlay>
{/if}
