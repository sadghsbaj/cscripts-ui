<script module>
    export const id = "close-button";
    export const label = "Close-Button";
</script>

<script lang="ts">
    import { CLOSE_BUTTON_SIZES, CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../components/index.ts";

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { CloseButton } from "cs/svelte/close-button";
    import { HitArea } from "cs/svelte/hit-area";
${closeScript}

<CloseButton variant="soft" size="md">
    <HitArea size="md" />
</CloseButton>`;

    const variantsCode = `<CloseButton variant="soft" size="md">
    <HitArea size="md" />
</CloseButton>
<CloseButton variant="ghost" size="md">
    <HitArea size="md" />
</CloseButton>
<CloseButton variant="elevated" size="md">
    <HitArea size="md" />
</CloseButton>`;

    const sizesCode = `<CloseButton variant="soft" size="sm"><HitArea size="md" /></CloseButton>
<CloseButton variant="soft" size="md"><HitArea size="md" /></CloseButton>
<CloseButton variant="soft" size="lg"><HitArea size="md" /></CloseButton>`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="CloseButton"
        description="A dedicated dismiss button with soft, ghost, and elevated variants."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <CloseButton variant="soft" size="md">
            <HitArea size="md" />
        </CloseButton>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Use soft or ghost inside cards and elevated directly on canvas or sunken surfaces."
        code={variantsCode}
    >
        <div class="flex items-center gap-6">
            <CloseButton variant="soft" size="md">
                <HitArea size="md" />
            </CloseButton>

            <CloseButton variant="ghost" size="md">
                <HitArea size="md" />
            </CloseButton>

            <SunkenWell>
                <CloseButton variant="elevated" size="md">
                    <HitArea size="md" />
                </CloseButton>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection title="Sizes" code={sizesCode}>
        <div class="flex items-center gap-5">
            {#each CLOSE_BUTTON_SIZES as size (size)}
                <CloseButton variant="soft" {size}>
                    <HitArea size="md" />
                </CloseButton>
            {/each}
        </div>
    </PreviewSection>
</div>
