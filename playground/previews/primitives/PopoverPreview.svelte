<script module>
    export const id = "popover";
    export const label = "Popover";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger, type PopoverPlacement, type PopoverSize } from "cs/svelte/popover";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const placements: PopoverPlacement[] = ["top", "bottom", "left", "right"];
    const sizes: PopoverSize[] = ["content", "anchor", "min-anchor"];

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger } from "cs/svelte/popover";
${closeScript}

<Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "demo-popover" })}>
    <ButtonLabel>Open popover</ButtonLabel>
</Button>

<Popover
    id="demo-popover"
    placement="bottom"
    size="content"
    class="bg-elevated shadow-elevated rounded-2xl squircle p-4 text-xs text-main"
>
    Popover content anchored to the trigger.
</Popover>`;

    const placementsCode = `<Popover id="popover-top" placement="top" size="content">...</Popover>
<Popover id="popover-bottom" placement="bottom" size="content">...</Popover>
<Popover id="popover-left" placement="left" size="content">...</Popover>
<Popover id="popover-right" placement="right" size="content">...</Popover>`;

    const sizesCode = `<Popover id="popover-content" placement="bottom" size="content">...</Popover>
<Popover id="popover-anchor" placement="bottom" size="anchor">...</Popover>
<Popover id="popover-min-anchor" placement="bottom" size="min-anchor">...</Popover>`;

    const modesCode = `<Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "offset-popover" })}>
    <ButtonLabel>Offset 24px</ButtonLabel>
</Button>
<Popover id="offset-popover" placement="top" size="content" offset="24px">...</Popover>

<Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "hint-popover", mode: "hint" })}>
    <ButtonLabel>Hover (Hint)</ButtonLabel>
</Button>
<Popover id="hint-popover" popover="hint" placement="bottom" size="content">...</Popover>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Popover"
        description="Top-layer anchor-positioned surface supporting click and hover triggers."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "popover-basic-demo" })}>
            <ButtonLabel>Open popover</ButtonLabel>
        </Button>

        <Popover
            id="popover-basic-demo"
            placement="bottom"
            size="content"
            class="bg-elevated shadow-elevated rounded-2xl squircle p-4 text-xs font-500 text-main"
        >
            <div class="flex flex-col gap-1">
                <span class="font-600 text-strong">Popover</span>
                <span class="text-weak">Positioned via CSS anchor positioning</span>
            </div>
        </Popover>
    </PreviewSection>

    <PreviewSection title="Placements" code={placementsCode}>
        {#each placements as placement (placement)}
            <Button
                variant="tertiary"
                size="md"
                {@attach popoverTrigger({ target: `popover-placement-${placement}` })}
            >
                <ButtonLabel>{placement[0]?.toUpperCase() + placement.slice(1)}</ButtonLabel>
            </Button>

            <Popover
                id="popover-placement-{placement}"
                {placement}
                size="content"
                class="bg-elevated shadow-elevated rounded-2xl squircle p-4 text-xs font-500 text-main"
            >
                <div class="flex flex-col gap-1">
                    <span class="font-600 text-strong">Placement: {placement}</span>
                    <span class="text-weak">Popover positioned relative to anchor</span>
                </div>
            </Popover>
        {/each}
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Compare content width, exact anchor width, and min-anchor width side by side."
        code={sizesCode}
    >
        <div class="flex-wrap flex-center gap-4">
            {#each sizes as size (size)}
                <Button variant="tertiary" size="md" {@attach popoverTrigger({ target: `popover-size-${size}` })}>
                    <ButtonLabel>Size: {size}</ButtonLabel>
                </Button>

                <Popover
                    id="popover-size-{size}"
                    placement="bottom"
                    {size}
                    class="bg-elevated shadow-elevated rounded-2xl squircle p-4 text-xs font-500 text-main"
                >
                    <div class="flex flex-col gap-1">
                        <span class="font-600 text-strong">{size}</span>
                        <span class="text-weak">
                            {#if size === "content"}
                                Fits content
                            {:else if size === "anchor"}
                                Matches trigger width even with longer text
                            {:else}
                                At least trigger width, expands for wider content
                            {/if}
                        </span>
                    </div>
                </Popover>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection title="Offset & Hint Mode" code={modesCode}>
        <Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "popover-offset-demo" })}>
            <ButtonLabel>Offset 24px</ButtonLabel>
        </Button>
        <Popover
            id="popover-offset-demo"
            placement="top"
            size="content"
            offset="24px"
            class="bg-elevated shadow-elevated rounded-2xl squircle p-4 text-xs font-500 text-main"
        >
            <div class="flex flex-col gap-1">
                <span class="font-600 text-strong">Offset: 24px</span>
                <span class="text-weak">Increased spacing from anchor</span>
            </div>
        </Popover>

        <Button
            variant="tertiary"
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
            class="bg-elevated shadow-elevated rounded-2xl squircle p-4 text-xs font-500 text-main"
        >
            <div class="flex flex-col gap-1">
                <span class="font-600 text-strong">Hint Popover</span>
                <span class="text-weak">Triggered via hover or focus</span>
            </div>
        </Popover>
    </PreviewSection>
</div>
