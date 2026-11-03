<script module>
    export const id = "button";
    export const label = "Button";
</script>

<script lang="ts">
    import { Plus } from "@lucide/svelte";

    const variants = ["solid", "soft", "ghost"] as const;
    const colors = ["accent", "base", "danger"] as const;
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each variants as variant (variant)}
            {#each colors as color (color)}
                {@render previewCard(false, variant, color)}
            {/each}
        {/each}

        {@render previewCard(true, "", "")}
    </div>
</div>

{#snippet previewCard(
    isElevated: boolean,
    variant: (typeof variants)[number] | "",
    color: (typeof colors)[number] | ""
)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-sm dark:(border border-elevation-1)'
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
            {#each sizes as size (size)}
                <div class="flex gap-3 justify-between">
                    {#if !isElevated}
                        <button class="cs-button" data-size={size} data-variant={variant} data-color={color}
                            ><span class="cs-button-label">Click me!</span></button
                        >
                        <button
                            class="cs-button"
                            data-size={size}
                            data-variant={variant}
                            data-color={color}
                            data-icon-only
                        >
                            <Plus />
                            <span aria-hidden="true" class="cs-hit-area" data-size="md"></span>
                        </button>
                    {:else}
                        <button class="cs-button" data-size={size} data-variant="elevated">
                            <span class="cs-button-label">Click me!</span>
                        </button>
                        <button class="cs-button" data-size={size} data-variant="elevated" data-icon-only>
                            <Plus />
                            <span aria-hidden="true" class="cs-hit-area" data-size="md"></span>
                        </button>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/snippet}
