<script module>
    export const id = "popover";
    export const label = "Popover";
</script>

<script lang="ts">
    import { Button, ButtonLabel } from "cs/svelte/button";
    import { Popover, popoverTrigger, type PopoverPlacement, type PopoverWidth } from "cs/svelte/popover";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    const placements: PopoverPlacement[] = ["top", "bottom", "left", "right"];
    const widths: PopoverWidth[] = ["content", "anchor", "min-anchor"];

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
    width="content"
    class="bg-elevated shadow-floating rounded-2xl squircle p-4 text-xs text-main"
>
    Popover content anchored to the trigger.
</Popover>`;

    const placementsCode = `<Popover id="popover-top" placement="top" width="content">...</Popover>
<Popover id="popover-bottom" placement="bottom" width="content">...</Popover>
<Popover id="popover-left" placement="left" width="content">...</Popover>
<Popover id="popover-right" placement="right" width="content">...</Popover>`;

    const widthsCode = `<Popover id="popover-content" placement="bottom" width="content">...</Popover>
<Popover id="popover-anchor" placement="bottom" width="anchor">...</Popover>
<Popover id="popover-min-anchor" placement="bottom" width="min-anchor">...</Popover>`;

    const modesCode = `<Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "offset-popover" })}>
    <ButtonLabel>Offset 24px</ButtonLabel>
</Button>
<Popover id="offset-popover" placement="top" width="content" offset="24px">...</Popover>

<Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "hover-popover", triggerOn: "hover", delay: [300, 150] })}>
    <ButtonLabel>Hover</ButtonLabel>
</Button>
<Popover id="hover-popover" popover="manual" placement="bottom" width="content">...</Popover>`;
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
            width="content"
            class="bg-elevated shadow-floating rounded-2xl squircle p-4 text-xs font-500 text-main"
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
                width="content"
                class="bg-elevated shadow-floating rounded-2xl squircle p-4 text-xs font-500 text-main"
            >
                <div class="flex flex-col gap-1">
                    <span class="font-600 text-strong">Placement: {placement}</span>
                    <span class="text-weak">Popover positioned relative to anchor</span>
                </div>
            </Popover>
        {/each}
    </PreviewSection>

    <PreviewSection
        title="Widths"
        description="Compare content width, exact anchor width, and min-anchor width side by side."
        code={widthsCode}
    >
        <div class="flex-wrap flex-center gap-4">
            {#each widths as width (width)}
                <Button variant="tertiary" size="md" {@attach popoverTrigger({ target: `popover-width-${width}` })}>
                    <ButtonLabel>Width: {width}</ButtonLabel>
                </Button>

                <Popover
                    id="popover-width-{width}"
                    placement="bottom"
                    {width}
                    class="bg-elevated shadow-floating rounded-2xl squircle p-4 text-xs font-500 text-main"
                >
                    <div class="flex flex-col gap-1">
                        <span class="font-600 text-strong">{width}</span>
                        <span class="text-weak">
                            {#if width === "content"}
                                Fits content
                            {:else if width === "anchor"}
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

    <PreviewSection title="Offset & Hover Trigger" code={modesCode}>
        <Button variant="tertiary" size="md" {@attach popoverTrigger({ target: "popover-offset-demo" })}>
            <ButtonLabel>Offset 24px</ButtonLabel>
        </Button>
        <Popover
            id="popover-offset-demo"
            placement="top"
            width="content"
            offset="24px"
            class="bg-elevated shadow-floating rounded-2xl squircle p-4 text-xs font-500 text-main"
        >
            <div class="flex flex-col gap-1">
                <span class="font-600 text-strong">Offset: 24px</span>
                <span class="text-weak">Increased spacing from anchor</span>
            </div>
        </Popover>

        <Button
            variant="tertiary"
            size="md"
            {@attach popoverTrigger({ target: "popover-hover-demo", triggerOn: "hover" })}
        >
            <ButtonLabel>Hover</ButtonLabel>
        </Button>
        <Popover
            id="popover-hover-demo"
            popover="manual"
            placement="bottom"
            width="content"
            class="bg-elevated shadow-floating rounded-2xl squircle p-4 text-xs font-500 text-main"
        >
            <div class="flex flex-col gap-1">
                <span class="font-600 text-strong">Hover Popover</span>
                <span class="text-weak">Triggered via hover or focus-visible</span>
            </div>
        </Popover>
    </PreviewSection>
</div>
