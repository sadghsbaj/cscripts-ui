<script module>
    export const id = "button-group";
    export const label = "Button-Group";
</script>

<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import {
        Button,
        BUTTON_COLORS,
        BUTTON_SIZES,
        ButtonGroup,
        ButtonIcon,
        ButtonLabel,
        HitArea,
        type ButtonColor,
        type ButtonVariant,
    } from "cs/svelte";

    const variants = ["solid", "soft", "ghost"] as const satisfies readonly Exclude<ButtonVariant, "elevated">[];
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each variants as variant (variant)}
            {#each BUTTON_COLORS as color (color)}
                {@render previewCard(false, variant, color)}
            {/each}
        {/each}

        {@render previewCard(true, "solid", "accent")}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, variant: Exclude<ButtonVariant, "elevated">, color: ButtonColor)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-sm dark:(border border-elevation-1)'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start px-1 gap-5"
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
            <div class="flex gap-3 justify-between">
                {#if !isElevated}
                    <ButtonGroup>
                        <Button size="md" {variant} {color}>
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                        <Button size="md" {variant} {color}>
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                        <Button size="md" {variant} {color}>
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                    </ButtonGroup>
                {:else}
                    <ButtonGroup>
                        <Button size="md" variant="elevated">
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                        <Button size="md" variant="elevated">
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                        <Button size="md" variant="elevated">
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                    </ButtonGroup>
                {/if}
            </div>
        </div>
    </div>
{/snippet}
