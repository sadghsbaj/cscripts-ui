<script module>
    export const id = "scroll-area";
    export const label = "Scroll-Area";
</script>

<script lang="ts">
    import { SCROLL_AREA_SIZES, ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const items = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`);

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { ScrollArea, ScrollAreaContent } from "cs/svelte/scroll-area";
    import { scrollFade } from "cs/svelte/scroll-fade";
${closeScript}

<ScrollArea size="md" direction="vertical" class="w-full max-h-40">
    <ScrollAreaContent
        class="flex flex-col gap-2"
        {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
    >
        <!-- Scrollable items -->
    </ScrollAreaContent>
</ScrollArea>`;

    const horizontalCode = `<ScrollArea size="md" direction="horizontal" class="w-full">
    <ScrollAreaContent
        class="flex items-center gap-2 py-2"
        {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
    >
        <!-- Horizontal items -->
    </ScrollAreaContent>
</ScrollArea>`;

    const bothCode = `<ScrollArea size="md" direction="both" class="w-full max-w-md h-44">
    <ScrollAreaContent {@attach scrollFade({ size: "md", direction: "both", edges: "both" })}>
        <div class="grid grid-cols-4 gap-2 w-720px">
            <!-- 2D grid items -->
        </div>
    </ScrollAreaContent>
</ScrollArea>`;

    const customCode = `<ScrollArea size="md" direction="vertical" scrollbar="always" class="w-full max-h-40">
    <ScrollAreaContent
        style="--cs-scroll-fade-size: 96px"
        class="flex flex-col gap-2"
        {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
    >
        <!-- Items with custom fade depth -->
    </ScrollAreaContent>
</ScrollArea>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="ScrollArea"
        description="Styled scrollable container with elastic overshoot, directional axes, and scrollbar sizes."
    />

    <PreviewSection title="Vertical Sizes" code={basicCode}>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {#each SCROLL_AREA_SIZES as size (size)}
                <div class="flex flex-col gap-2">
                    <span class="text-xs font-medium text-weak capitalize">Size: {size}</span>
                    <ScrollArea {size} direction="vertical" class="w-full max-h-40">
                        <ScrollAreaContent
                            class="flex flex-col gap-2"
                            {@attach scrollFade({ size, direction: "vertical", edges: "both" })}
                        >
                            {#each items as item (item)}
                                <div class="bg-sunken rounded-xl px-4 py-2 text-sm text-main shrink-0">
                                    {item}
                                </div>
                            {/each}
                        </ScrollAreaContent>
                    </ScrollArea>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection title="Horizontal" code={horizontalCode}>
        <ScrollArea size="md" direction="horizontal" class="w-full">
            <ScrollAreaContent
                class="flex items-center gap-2 py-2"
                {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
            >
                {#each items as item (item)}
                    <div class="bg-sunken rounded-xl px-4 py-6 text-sm text-main shrink-0">
                        {item}
                    </div>
                {/each}
            </ScrollAreaContent>
        </ScrollArea>
    </PreviewSection>

    <PreviewSection title="Both Axes" code={bothCode}>
        <ScrollArea size="md" direction="both" class="w-full max-w-md h-44">
            <ScrollAreaContent {@attach scrollFade({ size: "md", direction: "both", edges: "both" })}>
                <div class="grid grid-cols-4 gap-2 w-720px">
                    {#each items as item (item)}
                        <div class="bg-sunken rounded-xl px-4 py-6 text-sm text-main">
                            {item}
                        </div>
                    {/each}
                </div>
            </ScrollAreaContent>
        </ScrollArea>
    </PreviewSection>

    <PreviewSection
        title="Always Visible Scrollbar & Custom Fade"
        description="Override scrollbar visibility with scrollbar='always' and customize --cs-scroll-fade-size."
        code={customCode}
    >
        <ScrollArea size="md" direction="vertical" scrollbar="always" class="w-full max-h-40 max-w-sm">
            <ScrollAreaContent
                style="--cs-scroll-fade-size: 96px"
                class="flex flex-col gap-2"
                {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
            >
                {#each items as item (item)}
                    <div class="bg-sunken rounded-xl px-4 py-2 text-sm text-main shrink-0">
                        {item}
                    </div>
                {/each}
            </ScrollAreaContent>
        </ScrollArea>
    </PreviewSection>
</div>
