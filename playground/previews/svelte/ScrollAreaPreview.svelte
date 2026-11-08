<script module>
    export const id = "scroll-area";
    export const label = "Scroll-Area";
</script>

<script lang="ts">
    import { SCROLL_AREA_SIZES, ScrollArea, ScrollAreaContent, scrollFade, type ScrollAreaSize } from "cs/svelte";

    const items = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`);
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each SCROLL_AREA_SIZES as size (size)}
            {@render verticalCard(false, size)}
        {/each}

        {@render horizontalCard(false)}
        {@render bothCard(false)}
        {@render customSizeCard(true)}
    </div>
</div>

{#snippet verticalCard(isElevated: boolean, size: ScrollAreaSize)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">
            Vertical ({size})
        </h2>
        <ScrollArea {size} direction="vertical" class="w-full max-h-40">
            <ScrollAreaContent
                class="flex flex-col gap-2"
                {@attach scrollFade({ size, direction: "vertical", edges: "both" })}
            >
                {#each items as item (item)}
                    <div class="bg-elevation-2 rounded-xl px-4 py-2 text-sm shrink-0">
                        {item}
                    </div>
                {/each}
            </ScrollAreaContent>
        </ScrollArea>
    </div>
{/snippet}

{#snippet horizontalCard(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">Horizontal</h2>
        <ScrollArea size="md" direction="horizontal" class="w-full">
            <ScrollAreaContent
                class="flex items-center gap-2 py-2"
                {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
            >
                {#each items as item (item)}
                    <div class="bg-elevation-2 rounded-xl px-4 py-6 text-sm shrink-0">
                        {item}
                    </div>
                {/each}
            </ScrollAreaContent>
        </ScrollArea>
    </div>
{/snippet}

{#snippet bothCard(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">Both</h2>
        <ScrollArea size="md" direction="both" class="w-full max-h-40">
            <ScrollAreaContent {@attach scrollFade({ size: "md", direction: "both", edges: "both" })}>
                <div class="grid grid-cols-4 gap-2 min-w-500px min-h-300px">
                    {#each items as item (item)}
                        <div class="bg-elevation-2 rounded-xl px-4 py-4 text-sm">
                            {item}
                        </div>
                    {/each}
                </div>
            </ScrollAreaContent>
        </ScrollArea>
    </div>
{/snippet}

{#snippet customSizeCard(isElevated: boolean)}
    <div
        class="{!isElevated
            ? 'bg-elevation-1 shadow-elevation-1'
            : 'bg-elevation-0'} rounded-3xl squircle p-8 flex-center min-h-200px min-w-300px flex flex-col justify-start items-start gap-5"
    >
        <h2 class="title-2xl">Custom</h2>
        <ScrollArea size="md" direction="vertical" scrollbar="always" class="w-full max-h-40">
            <ScrollAreaContent
                style="--cs-scroll-fade-size: 96px"
                class="flex flex-col gap-2"
                {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
            >
                {#each items as item (item)}
                    <div class="bg-elevation-2 rounded-xl px-4 py-2 text-sm shrink-0">
                        {item}
                    </div>
                {/each}
            </ScrollAreaContent>
        </ScrollArea>
    </div>
{/snippet}
