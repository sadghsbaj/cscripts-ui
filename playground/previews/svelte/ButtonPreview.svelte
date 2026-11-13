<script module>
    export const id = "button";
    export const label = "Button";
</script>

<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { Button, BUTTON_SIZES, ButtonIcon, ButtonLabel, type ButtonVariant } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";

    const variants = ["primary", "secondary", "tertiary", "ghost"] as const satisfies readonly Exclude<
        ButtonVariant,
        "elevated"
    >[];
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each variants as variant (variant)}
            {@render previewCard(false, variant)}
        {/each}

        {@render previewCard(true, "primary")}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, variant: Exclude<ButtonVariant, "elevated">)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">
            {#if !isElevated}
                {variant[0]?.toUpperCase() + variant.slice(1)}
            {:else}
                Elevated
            {/if}
        </h2>
        <div class="w-full h-full flex flex-col gap-2">
            {#each BUTTON_SIZES as size (size)}
                <div class="flex gap-3 justify-between">
                    {#if !isElevated}
                        {#if variant === "tertiary"}
                            <Button {size} variant="tertiary">
                                <ButtonLabel>Click me!</ButtonLabel>
                            </Button>
                            <Button {size} variant="tertiary" iconOnly aria-label="Hinzufügen">
                                <ButtonIcon icon={Plus} />
                                <HitArea size="md" />
                            </Button>
                        {:else}
                            <Button {size} {variant}>
                                <ButtonLabel>Click me!</ButtonLabel>
                            </Button>
                            <Button {size} {variant} iconOnly aria-label="Hinzufügen">
                                <ButtonIcon icon={Plus} />
                                <HitArea size="md" />
                            </Button>
                        {/if}
                    {:else}
                        <Button {size} variant="elevated">
                            <ButtonLabel>Click me!</ButtonLabel>
                        </Button>
                        <Button {size} variant="elevated" iconOnly aria-label="Hinzufügen">
                            <ButtonIcon icon={Plus} />
                            <HitArea size="md" />
                        </Button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/snippet}
