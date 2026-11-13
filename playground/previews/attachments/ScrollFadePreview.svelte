<script module>
    export const id = "scroll-fade";
    export const label = "Scroll-Fade";
</script>

<script lang="ts">
    import { SCROLL_FADE_SIZES, scrollFade } from "cs/svelte/scroll-fade";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const items = Array.from({ length: 12 }, (_, i) => `Item ${i + 1}`);

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { scrollFade } from "cs/svelte/scroll-fade";
${closeScript}

<div
    class="w-full max-h-40 overflow-y-auto flex flex-col gap-2"
    {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
>
    <!-- Scrollable content -->
</div>`;

    const horizontalCode = `<div
    class="w-full overflow-x-auto flex items-center gap-2 py-2"
    {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
>
    <!-- Horizontal items -->
</div>`;

    const bothCode = `<div
    class="w-full max-w-md h-44 overflow-auto"
    {@attach scrollFade({ size: "md", direction: "both", edges: "both" })}
>
    <div class="grid grid-cols-4 gap-2 w-720px">
        <!-- 2D scrollable grid -->
    </div>
</div>`;

    const customCode = `<div
    style="--cs-scroll-fade-size: 96px"
    class="w-full max-h-40 overflow-y-auto flex flex-col gap-2"
    {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
>
    <!-- Custom fade depth -->
</div>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="scrollFade"
        description="Scroll-driven CSS mask attachment that fades overflow edges dynamically as content scrolls."
    />

    <PreviewSection title="Vertical Sizes" code={basicCode}>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {#each SCROLL_FADE_SIZES as size (size)}
                <div class="flex flex-col gap-2">
                    <span class="text-xs font-medium text-weak capitalize">Size: {size}</span>
                    <div
                        class="w-full max-h-40 overflow-y-auto flex flex-col gap-2 pr-1"
                        {@attach scrollFade({ size, direction: "vertical", edges: "both" })}
                    >
                        {#each items as item (item)}
                            <div class="bg-sunken rounded-xl px-4 py-2 text-sm text-main shrink-0">
                                {item}
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection title="Horizontal" code={horizontalCode}>
        <div
            class="w-full overflow-x-auto flex items-center gap-2 py-2"
            {@attach scrollFade({ size: "md", direction: "horizontal", edges: "both" })}
        >
            {#each items as item (item)}
                <div class="bg-sunken rounded-xl px-4 py-6 text-sm text-main shrink-0">
                    {item}
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection title="Both Axes" code={bothCode}>
        <div
            class="w-full max-w-md h-44 overflow-auto"
            {@attach scrollFade({ size: "md", direction: "both", edges: "both" })}
        >
            <div class="grid grid-cols-4 gap-2 w-720px">
                {#each items as item (item)}
                    <div class="bg-sunken rounded-xl px-4 py-6 text-sm text-main">
                        {item}
                    </div>
                {/each}
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Custom Fade Size"
        description="Override the mask depth using the --cs-scroll-fade-size custom property."
        code={customCode}
    >
        <div
            style="--cs-scroll-fade-size: 96px"
            class="w-full max-w-sm max-h-40 overflow-y-auto flex flex-col gap-2 pr-1"
            {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}
        >
            {#each items as item (item)}
                <div class="bg-sunken rounded-xl px-4 py-2 text-sm text-main shrink-0">
                    {item}
                </div>
            {/each}
        </div>
    </PreviewSection>
</div>
