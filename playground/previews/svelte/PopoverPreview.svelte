<script module>
    export const id = "popover";
    export const label = "Popover";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger, type PopoverPlacement, type PopoverSize } from "cs/svelte/popover";

    const placements: PopoverPlacement[] = ["top", "bottom", "left", "right"];
    const sizes: PopoverSize[] = ["content", "anchor", "min-anchor"];
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl px-2 lg:px-8">
        <!-- Placements -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Placements</h2>
            <div class="flex flex-wrap gap-3">
                {#each placements as placement (placement)}
                    {const popoverId = `popover-placement-${placement}`}
                    <Button variant="soft" color="base" size="md" {@attach popoverTrigger({ target: popoverId })}>
                        <ButtonLabel>{placement[0]?.toUpperCase() + placement.slice(1)}</ButtonLabel>
                    </Button>

                    <Popover
                        id={popoverId}
                        {placement}
                        size="content"
                        class="bg-elevation-1 shadow-elevation-2 rounded-2xl squircle p-4 text-xs font-500 text-main flex flex-col gap-1"
                    >
                        <span class="font-600">Placement: {placement}</span>
                        <span class="text-weak">Popover positioned relative to anchor</span>
                    </Popover>
                {/each}
            </div>
        </div>

        <!-- Sizes -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Sizes</h2>
            <div class="flex flex-col gap-3 w-full">
                {#each sizes as size (size)}
                    {const popoverId = `popover-size-${size}`}
                    <Button
                        variant="soft"
                        color="base"
                        size="md"
                        class="w-full"
                        {@attach popoverTrigger({ target: popoverId })}
                    >
                        <ButtonLabel>Size: {size}</ButtonLabel>
                    </Button>

                    <Popover
                        id={popoverId}
                        placement="bottom"
                        {size}
                        class="bg-elevation-1 shadow-elevation-2 rounded-2xl squircle p-4 text-xs font-500 text-main flex flex-col gap-1"
                    >
                        <span class="font-600">{size}</span>
                        <span class="text-weak">
                            {#if size === "content"}
                                Fits content width
                            {:else if size === "anchor"}
                                Exactly matches anchor width
                            {:else}
                                Min anchor width, expands if content is wider
                            {/if}
                        </span>
                    </Popover>
                {/each}
            </div>
        </div>

        <!-- Offsets & Modes -->
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px flex flex-col justify-start items-start gap-5"
        >
            <h2 class="title-2xl">Offset & Modes</h2>
            <div class="flex flex-wrap gap-3">
                <!-- Large Offset -->
                <Button
                    variant="soft"
                    color="base"
                    size="md"
                    {@attach popoverTrigger({ target: "popover-offset-demo" })}
                >
                    <ButtonLabel>Offset 24px</ButtonLabel>
                </Button>
                <Popover
                    id="popover-offset-demo"
                    placement="top"
                    size="content"
                    offset="24px"
                    class="bg-elevation-1 shadow-elevation-2 rounded-2xl squircle p-4 text-xs font-500 text-main flex flex-col gap-1"
                >
                    <span class="font-600">Offset: 24px</span>
                    <span class="text-weak">Increased spacing from anchor</span>
                </Popover>

                <!-- Hint / Hover Mode -->
                <Button
                    variant="soft"
                    color="base"
                    size="md"
                    {@attach popoverTrigger({ target: "popover-hint-demo", mode: "hint" })}
                >
                    <ButtonLabel>Hover (Hint)</ButtonLabel>
                </Button>
                <Popover
                    id="popover-hint-demo"
                    popover="hint"
                    placement="bottom"
                    size="content"
                    class="bg-elevation-1 shadow-elevation-2 rounded-2xl squircle p-4 text-xs font-500 text-main flex flex-col gap-1"
                >
                    <span class="font-600">Hint Popover</span>
                    <span class="text-weak">Triggered via hover or focus</span>
                </Popover>
            </div>
        </div>
    </div>
</div>
