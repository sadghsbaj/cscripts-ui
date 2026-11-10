<script module>
    export const id = "toggle-button";
    export const label = "Toggle-Button";
</script>

<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { HitArea } from "cs/svelte/hit-area";
    import {
        TOGGLE_BUTTON_COLORS,
        TOGGLE_BUTTON_SIZES,
        TOGGLE_BUTTON_VARIANTS,
        ToggleButton,
        ToggleButtonIcon,
        ToggleButtonLabel,
        type ToggleButtonColor,
        type ToggleButtonVariant,
    } from "cs/svelte/toggle-button";
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each TOGGLE_BUTTON_VARIANTS as variant (variant)}
            {#each TOGGLE_BUTTON_COLORS as color (color)}
                {@render previewCard(false, variant, color)}
            {/each}
        {/each}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, variant: Exclude<ToggleButtonVariant, "elevated">, color: ToggleButtonColor)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">
            {#if !isElevated}
                {variant[0]?.toUpperCase() + variant.slice(1)}
                +
                {color[0]?.toUpperCase() + color.slice(1)}
            {:else}
                Elevated
            {/if}
        </h2>
        <div class="w-full h-full flex flex-col gap-2">
            {#each TOGGLE_BUTTON_SIZES as size (size)}
                <div class="flex gap-3 justify-between">
                    <ToggleButton {size} {variant} {color}>
                        <ToggleButtonLabel>Click me!</ToggleButtonLabel>
                    </ToggleButton>
                    <ToggleButton {size} {variant} {color} iconOnly aria-label="Hinzufügen">
                        <ToggleButtonIcon icon={Plus} />
                        <HitArea size="md" />
                    </ToggleButton>
                </div>
            {/each}
        </div>
    </div>
{/snippet}
