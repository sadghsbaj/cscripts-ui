<script module lang="ts">
    import type { HitAreaSize } from "cs/svelte";

    export const id = "hit-area";
    export const label = "Hit-Area";

    let showHitArea = $state(false);

    const previewButtons: Array<{ size: HitAreaSize; color: string }> = [
        {
            size: "sm",
            color: "red",
        },
        {
            size: "md",
            color: "purple",
        },
        {
            size: "lg",
            color: "pink",
        },
    ];
</script>

<script lang="ts">
    import { Plus } from "@lucide/svelte";
    import { Button, ButtonIcon, ButtonLabel, HitArea } from "cs/svelte";
</script>

<div class="flex flex-col gap-5">
    {#if showHitArea}
        <Button size="md" variant="soft" color="accent" class="w-fit" onclick={() => (showHitArea = !showHitArea)}>
            <ButtonLabel>Show Area</ButtonLabel>
        </Button>
    {:else}
        <Button size="md" variant="soft" color="base" class="w-fit" onclick={() => (showHitArea = !showHitArea)}>
            <ButtonLabel>Show Area</ButtonLabel>
        </Button>
    {/if}

    <div class="flex justify-center">
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl px-2 lg:px-8">
            {#each previewButtons as button (button)}
                <Button size={button.size} variant="soft" color="base" iconOnly aria-label="Hinzufügen">
                    <ButtonIcon icon={Plus} />
                    <HitArea
                        size={button.size}
                        class={["border border-dashed", showHitArea ? "is-visible" : ""]}
                        style="--hit-area-color: var(--cs-color-{button.color}-500);"
                    />
                </Button>
            {/each}

            <Button size="md" variant="soft" color="base" iconOnly aria-label="Hinzufügen">
                <ButtonIcon icon={Plus} />
                <HitArea
                    size="md"
                    class={["border border-dashed size-64px", showHitArea ? "is-visible" : ""]}
                    style="--hit-area-color: var(--cs-color-blue-500);"
                />
            </Button>
        </div>
    </div>
</div>

<style>
    :global(.cs-hit-area) {
        border-color: transparent;
    }

    :global(.is-visible) {
        border-color: var(--hit-area-color);
    }
</style>
