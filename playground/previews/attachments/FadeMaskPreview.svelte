<script module>
    export const id = "fade-mask";
    export const label = "Fade-Mask";
</script>

<script lang="ts">
    import { BackgroundPattern } from "cs/svelte/background-pattern";
    import { FADE_MASK_STRENGTHS, FADE_MASK_VARIANTS, fadeMask } from "cs/svelte/fade-mask";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { BackgroundPattern } from "cs/svelte/background-pattern";
    import { fadeMask } from "cs/svelte/fade-mask";
${closeScript}

<div class="relative isolate overflow-hidden h-44 w-full rounded-2xl border border-base-soft bg-canvas">
    <BackgroundPattern variant="grid" size="md" {@attach fadeMask({ variant: "radial", strength: "md" })} />
</div>`;

    const variantsCode = `<BackgroundPattern variant="grid" size="md" {@attach fadeMask({ variant: "radial", strength: "sm" })} />
<BackgroundPattern variant="grid" size="md" {@attach fadeMask({ variant: "radial", strength: "lg" })} />
<BackgroundPattern variant="grid" size="md" {@attach fadeMask({ variant: "linear", strength: "md" })} />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="fadeMask"
        description="Applies soft radial or linear CSS alpha masks to fade edges into the surrounding surface."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <div class="relative isolate overflow-hidden h-44 w-full max-w-md rounded-2xl border border-base-soft bg-canvas">
            <BackgroundPattern
                variant="grid"
                size="md"
                {@attach fadeMask({ variant: "radial", strength: "md" })}
            />
        </div>
    </PreviewSection>

    <PreviewSection title="Variants & Strengths" code={variantsCode}>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {#each FADE_MASK_VARIANTS as variant (variant)}
                {#each FADE_MASK_STRENGTHS as strength (strength)}
                    <div
                        class="relative isolate overflow-hidden h-36 rounded-2xl border border-base-soft bg-canvas flex items-end p-3"
                    >
                        <BackgroundPattern variant="grid" size="md" {@attach fadeMask({ variant, strength })} />
                        <span class="relative z-10 text-xs font-medium text-weak capitalize">
                            {variant} ({strength})
                        </span>
                    </div>
                {/each}
            {/each}
        </div>
    </PreviewSection>
</div>
