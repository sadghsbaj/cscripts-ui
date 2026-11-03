<script module>
    export const id = "close-button";
    export const label = "Close-Button";
</script>

<script lang="ts">
    import { X } from "@lucide/svelte";

    type Variant = "soft" | "ghost" | "elevated";
    const sizes = ["xs", "sm", "md", "lg", "xl"] as const;
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {@render previewCard(false, "soft")}
        {@render previewCard(false, "ghost")}
        {@render previewCard(true, "elevated")}
    </div>
</div>

{#snippet previewCard(isElevated: boolean, variant: Variant | "")}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-sm dark:(border border-elevation-1)'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">
            {variant[0]?.toUpperCase() + variant.slice(1)}
            Elevated
        </h2>
        <div class="w-full h-full flex flex-col gap-2">
            {#each sizes as size (size)}
                <div class="flex gap-3 justify-between">
                    <button
                        type="button"
                        aria-label="Schließen"
                        class="cs-close-button"
                        data-size={size}
                        data-variant={variant}
                    >
                        <X aria-hidden="true" />
                        <span aria-hidden="true" class="cs-hit-area" data-size="md"></span>
                    </button>
                </div>
            {/each}
        </div>
    </div>
{/snippet}
