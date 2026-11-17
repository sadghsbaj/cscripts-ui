<script module>
    export const id = "text-area";
    export const label = "TextArea";
</script>

<script lang="ts">
    import {
        TEXT_AREA_RESIZES,
        TEXT_AREA_SIZES,
        TextArea,
        type TextAreaResize,
        type TextAreaSize,
    } from "cs/svelte/text-area";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let softValue = $state("");
    let elevatedValue = $state("");

    let sizeValues = $state<Record<TextAreaSize, string>>({
        sm: "",
        md: "",
        lg: "",
    });

    let invalidSoftValue = $state("Missing required summary.");
    let invalidElevatedValue = $state("Exceeds 280 characters.");
    let readonlyValue = $state(
        "Read-only release notes.\nYou can select and copy this text, but you cannot edit it."
    );

    let resizeValues = $state<Record<TextAreaResize, string>>({
        vertical: "",
        none: "",
        horizontal: "",
        both: "",
    });

    let tallValue = $state("");

    const closeScript = ["</", "script>"].join("");

    const variantsCode = `<script lang="ts">
    import { TextArea } from "cs/svelte/text-area";

    let value = $state("");
${closeScript}

<TextArea variant="soft" size="md" bind:value placeholder="Soft textarea..." />
<TextArea variant="elevated" size="md" bind:value placeholder="Elevated textarea..." />`;

    const sizesCode = `<TextArea variant="soft" size="sm" placeholder="Size sm" />
<TextArea variant="soft" size="md" placeholder="Size md" />
<TextArea variant="soft" size="lg" placeholder="Size lg" />`;

    const statesCode = `<TextArea variant="soft" size="md" invalid value="Invalid input" />
<TextArea variant="elevated" size="md" invalid value="Invalid elevated" />

<TextArea variant="soft" size="md" disabled value="Disabled soft" />
<TextArea variant="elevated" size="md" disabled value="Disabled elevated" />

<TextArea variant="soft" size="md" readonly value="Readonly content" />`;

    const resizeCode = `<TextArea variant="soft" size="md" resize="vertical" placeholder="Vertical (default)" />
<TextArea variant="soft" size="md" resize="none" placeholder="None" />
<TextArea variant="soft" size="md" resize="horizontal" placeholder="Horizontal" />
<TextArea variant="soft" size="md" resize="both" placeholder="Both" />
<TextArea variant="soft" size="md" rows={5} placeholder="Custom rows (5)" />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="TextArea"
        description="Multi-line text entry primitive with soft and elevated surfaces, three sizes, and configurable resize behavior."
    />

    <PreviewSection
        title="Variants"
        description="Use soft on canvas or elevated cards, and elevated on canvas or sunken wells."
        code={variantsCode}
    >
        <div class="flex flex-wrap items-start gap-6">
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">soft</span>
                <TextArea
                    variant="soft"
                    size="md"
                    bind:value={softValue}
                    placeholder="Write a note..."
                    class="w-72"
                />
            </div>

            <SunkenWell>
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">elevated</span>
                    <TextArea
                        variant="elevated"
                        size="md"
                        bind:value={elevatedValue}
                        placeholder="Write a note..."
                        class="w-72"
                    />
                </div>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Sizes"
        description="Three sizes (sm, md, lg) scaling font size, padding, and corner radius."
        code={sizesCode}
    >
        <div class="flex flex-col items-start gap-4">
            {#each TEXT_AREA_SIZES as size (size)}
                <div class="flex items-start gap-3">
                    <span class="w-6 pt-2 text-xs font-medium text-weak uppercase">{size}</span>
                    <TextArea
                        variant="soft"
                        {size}
                        bind:value={sizeValues[size]}
                        placeholder="Size {size}"
                        class="w-72"
                    />
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="States"
        description="Supports invalid (inset negative ring preserving elevation shadow), disabled, and readonly states."
        code={statesCode}
    >
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Invalid (soft)</span>
                    <TextArea variant="soft" size="md" invalid bind:value={invalidSoftValue} class="w-72" />
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Invalid (elevated)</span>
                        <TextArea
                            variant="elevated"
                            size="md"
                            invalid
                            bind:value={invalidElevatedValue}
                            class="w-72"
                        />
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-wrap items-start gap-6">
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-medium text-weak">Disabled (soft)</span>
                    <TextArea variant="soft" size="md" disabled value="Disabled soft textarea" class="w-72" />
                </div>

                <SunkenWell>
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">Disabled (elevated)</span>
                        <TextArea
                            variant="elevated"
                            size="md"
                            disabled
                            value="Disabled elevated textarea"
                            class="w-72"
                        />
                    </div>
                </SunkenWell>
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">Readonly</span>
                <TextArea variant="soft" size="md" readonly bind:value={readonlyValue} class="w-72" />
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Resize & Rows"
        description="Configure resize handles (vertical by default, none, horizontal, or both) and initial row count."
        code={resizeCode}
    >
        <div class="flex flex-col gap-5">
            <div class="flex flex-wrap items-start gap-6">
                {#each TEXT_AREA_RESIZES as resize (resize)}
                    <div class="flex flex-col gap-1.5">
                        <span class="text-xs font-medium text-weak">
                            {resize === "vertical" ? "vertical (default)" : resize}
                        </span>
                        <TextArea
                            variant="soft"
                            size="md"
                            {resize}
                            bind:value={resizeValues[resize]}
                            placeholder="resize=&quot;{resize}&quot;"
                            class="w-60"
                        />
                    </div>
                {/each}
            </div>

            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-medium text-weak">rows={5}</span>
                <TextArea
                    variant="soft"
                    size="md"
                    rows={5}
                    bind:value={tallValue}
                    placeholder="Five initial rows..."
                    class="w-72"
                />
            </div>
        </div>
    </PreviewSection>
</div>
