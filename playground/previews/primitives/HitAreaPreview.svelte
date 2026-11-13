<script module lang="ts">
    export const id = "hit-area";
    export const label = "Hit-Area";
</script>

<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea, type HitAreaSize } from "cs/svelte/hit-area";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { tooltip } from "cs/svelte/tooltip";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let showHitArea = $state(true);

    const previewButtons: Array<{ size: HitAreaSize; label: string; color: string }> = [
        { size: "sm", label: "Small hit area", color: "red" },
        { size: "md", label: "Medium hit area", color: "purple" },
        { size: "lg", label: "Large hit area", color: "pink" },
    ];

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {Component} bindings */
    const basicCode = `<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { Button, ButtonIcon } from "cs/svelte/button";
    import { HitArea } from "cs/svelte/hit-area";
    import { tooltip } from "cs/svelte/tooltip";
${closeScript}

<Button
    size="md"
    variant="tertiary"
    iconOnly
    aria-label="Add item"
    {@attach tooltip("Add item")}
>
    <ButtonIcon icon={Plus} />
    <HitArea size="md" />
</Button>`;

    const sizesCode = `<Button size="sm" variant="tertiary" iconOnly aria-label="Small" {@attach tooltip("Small")}>
    <ButtonIcon icon={Plus} />
    <HitArea size="sm" />
</Button>
<Button size="md" variant="tertiary" iconOnly aria-label="Medium" {@attach tooltip("Medium")}>
    <ButtonIcon icon={Plus} />
    <HitArea size="md" />
</Button>
<Button size="lg" variant="tertiary" iconOnly aria-label="Large" {@attach tooltip("Large")}>
    <ButtonIcon icon={Plus} />
    <HitArea size="lg" />
</Button>
<Button size="md" variant="tertiary" iconOnly aria-label="Custom 64px" {@attach tooltip("Custom 64px")}>
    <ButtonIcon icon={Plus} />
    <HitArea size="md" class="size-64px" />
</Button>`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="HitArea"
        description="Expands the invisible interactive target of compact controls without altering visual layout."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <Button
            size="md"
            variant="tertiary"
            iconOnly
            aria-label="Add item"
            {@attach tooltip("Add item")}
        >
            <ButtonIcon icon={Plus} />
            <HitArea size="md" />
        </Button>
    </PreviewSection>

    <PreviewSection
        title="Sizes & Custom Bounds"
        description="Toggle the dashed overlay to inspect how small, medium, large, and custom hit areas extend beyond the icon."
        code={sizesCode}
    >
        <div class="flex flex-col items-center gap-6">
            <ToggleButton variant="soft" color="accent" size="sm" bind:pressed={showHitArea}>
                <ToggleButtonLabel>Show Hit-Area Bounds</ToggleButtonLabel>
            </ToggleButton>

            <div class="flex-wrap flex-center gap-8 py-2">
                {#each previewButtons as button (button.size)}
                    <Button
                        size={button.size}
                        variant="tertiary"
                        iconOnly
                        aria-label={button.label}
                        {@attach tooltip(button.label)}
                    >
                        <ButtonIcon icon={Plus} />
                        <HitArea
                            size={button.size}
                            class={["border border-dashed", showHitArea ? "is-visible" : ""]}
                            style="--hit-area-color: var(--cs-color-{button.color}-500);"
                        />
                    </Button>
                {/each}

                <Button
                    size="md"
                    variant="tertiary"
                    iconOnly
                    aria-label="Custom 64px hit area"
                    {@attach tooltip("Custom 64px")}
                >
                    <ButtonIcon icon={Plus} />
                    <HitArea
                        size="md"
                        class={["border border-dashed size-64px", showHitArea ? "is-visible" : ""]}
                        style="--hit-area-color: var(--cs-color-blue-500);"
                    />
                </Button>
            </div>
        </div>
    </PreviewSection>
</div>

<style>
    :global(.cs-hit-area) {
        border-color: transparent;
    }

    :global(.is-visible) {
        border-color: var(--hit-area-color);
    }
</style>
