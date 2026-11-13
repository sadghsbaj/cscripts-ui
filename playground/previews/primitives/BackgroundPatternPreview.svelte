<script module>
    export const id = "background-pattern";
    export const label = "Background-Pattern";
</script>

<script lang="ts">
    import {
        BACKGROUND_PATTERN_SIZES,
        BACKGROUND_PATTERN_VARIANTS,
        BackgroundPattern,
    } from "cs/svelte/background-pattern";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { BackgroundPattern } from "cs/svelte/background-pattern";
${closeScript}

<div class="relative isolate overflow-hidden h-44 w-full rounded-2xl border border-base-soft bg-canvas">
    <BackgroundPattern variant="dots" size="md" />
</div>`;

    const variantsCode = `<BackgroundPattern variant="dots" size="sm" />
<BackgroundPattern variant="dots" size="md" />
<BackgroundPattern variant="dots" size="lg" />
<BackgroundPattern variant="grid" size="md" />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="BackgroundPattern"
        description="Subtle decorative dot and grid patterns rendered inside a positioned surface container."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <div class="relative isolate overflow-hidden h-44 w-full max-w-md rounded-2xl border border-base-soft bg-canvas">
            <BackgroundPattern variant="dots" size="md" />
        </div>
    </PreviewSection>

    <PreviewSection title="Variants & Sizes" code={variantsCode}>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {#each BACKGROUND_PATTERN_VARIANTS as variant (variant)}
                {#each BACKGROUND_PATTERN_SIZES as size (size)}
                    <div
                        class="relative isolate overflow-hidden h-36 rounded-2xl border border-base-soft bg-canvas flex items-end p-3"
                    >
                        <BackgroundPattern {variant} {size} />
                        <span class="relative z-10 text-xs font-medium text-weak capitalize">
                            {variant} ({size})
                        </span>
                    </div>
                {/each}
            {/each}
        </div>
    </PreviewSection>
</div>
