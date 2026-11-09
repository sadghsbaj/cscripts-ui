<script module>
    export const id = "fade-mask";
    export const label = "Fade-Mask";
</script>

<script lang="ts">
    import { FADE_MASK_STRENGTHS, FADE_MASK_VARIANTS, fadeMask, type FadeMaskVariant } from "cs/svelte/attachments";
    import { BackgroundPattern } from "cs/svelte/components";
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each FADE_MASK_VARIANTS as variant (variant)}
            {@render previewCard(false, variant)}
            {@render previewCard(true, variant)}
        {/each}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, variant: FadeMaskVariant)}
    {#each FADE_MASK_STRENGTHS as strength (strength)}
        <div
            class="{!isElevated
                ? 'bg-elevation-1 shadow-elevation-1'
                : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">
                {variant[0]?.toUpperCase() + variant.slice(1)} ({strength})
            </h2>
            <div class="w-full h-full flex flex-col gap-2">
                <div class="flex gap-3 justify-between h-full">
                    <BackgroundPattern variant="grid" size="md" {@attach fadeMask({ variant, strength })} />
                </div>
            </div>
        </div>
    {/each}
{/snippet}
