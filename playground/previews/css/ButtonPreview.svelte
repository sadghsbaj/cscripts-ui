<script lang="ts">
    import { Plus } from "@lucide/svelte";

    const variants = ["solid", "soft", "ghost"] as const;
    const colors = ["accent", "base", "danger"] as const;
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
</script>

{#snippet buttonGroup(variantList: readonly string[], color?: string)}
    <div class="flex flex-col gap-2 items-start">
        {#each variantList as variant (variant)}
            {#each sizes as size (size)}
                <button class="cs-button" data-variant={variant} data-color={color} data-size={size}>
                    <span>Click me!</span>
                    <Plus />
                </button>
            {/each}

            <!-- Icon-only Button -->
            <button class="cs-button" data-variant={variant} data-color={color} data-size="md">
                <Plus />
            </button>
        {/each}
    </div>
{/snippet}

<div class="p-8 flex flex-col gap-10">
    <div class="flex gap-3">
        {#each colors as color (color)}
            {@render buttonGroup(variants, color)}
        {/each}

        {@render buttonGroup(["elevated"])}
    </div>
</div>
