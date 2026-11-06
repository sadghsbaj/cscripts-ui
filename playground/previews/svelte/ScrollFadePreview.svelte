<script module>
    export const id = "scroll-fade";
    export const label = "Scroll-Fade";
</script>

<script lang="ts">
    import { SCROLL_FADE_SIZES, scrollFade, type ScrollFadeSize } from "cs/svelte";

    const items = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`);
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each SCROLL_FADE_SIZES as size (size)}
            {@render verticalCard(false, size)}
        {/each}

        {@render horizontalCard(false)}
        {@render bothCard(false)}
        {@render customSizeCard(true)}
    </div>
</div>

{#snippet verticalCard(isElevated: boolean, size: ScrollFadeSize)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">
            Vertical ({size})
        </h2>
        <div
            class="w-full max-h-40 overflow-y-auto flex flex-col gap-2 pr-1"
            {@attach scrollFade({ size, direction: "vertical", edges: "both" })}
        >
            {#each items as item (item)}
                <div class="bg-elevation-2 rounded-xl px-4 py-2 text-sm shrink-0">
                    {item}
                </div>
            {/each}
        </div>
    </div>
{/snippet}

{#snippet horizontalCard(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">Horizontal</h2>
        <div
            class="w-full overflow-x-auto flex items-center gap-2 py-2"
            {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
        >
            {#each items as item (item)}
                <div class="bg-elevation-2 rounded-xl px-4 py-6 text-sm shrink-0">
                    {item}
                </div>
            {/each}
        </div>
    </div>
{/snippet}

{#snippet bothCard(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">Both</h2>
        <div
            class="w-full max-h-40 overflow-auto"
            {@attach scrollFade({ size: "md", direction: "both", edges: "both" })}
        >
            <div class="grid grid-cols-4 gap-2 min-w-500px min-h-300px">
                {#each items as item (item)}
                    <div class="bg-elevation-2 rounded-xl px-4 py-4 text-sm">
                        {item}
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/snippet}

{#snippet customSizeCard(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">Custom</h2>
        <div
            style="--cs-scroll-fade-size: 96px"
            class="w-full max-h-40 overflow-y-auto flex flex-col gap-2 pr-1"
            {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
        >
            {#each items as item (item)}
                <div class="bg-elevation-2 rounded-xl px-4 py-2 text-sm shrink-0">
                    {item}
                </div>
            {/each}
        </div>
    </div>
{/snippet}
