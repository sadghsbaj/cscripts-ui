<script module>
    export const id = "fade-mask";
    export const label = "Fade-Mask";
</script>

<script lang="ts">
    import { BackgroundPattern, FADE_MASK_STRENGTHS, FADE_MASK_TYPES, fadeMask, type FadeMaskType } from "cs/svelte";
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each FADE_MASK_TYPES as type (type)}
            {@render previewCard(false, type)}
            {@render previewCard(true, type)}
        {/each}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, type: FadeMaskType)}
    {#each FADE_MASK_STRENGTHS as strength (strength)}
        <div
            class="{!isElevated
                ? 'bg-elevation-1 shadow-sm dark:(border border-elevation-1)'
                : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">
                {type[0]?.toUpperCase() + type.slice(1)}
            </h2>
            <div class="w-full h-full flex flex-col gap-2">
                <div class="flex gap-3 justify-between h-full">
                    <BackgroundPattern variant="grid" size="md" {@attach fadeMask({ type, strength })} />
                </div>
            </div>
        </div>
    {/each}
{/snippet}
