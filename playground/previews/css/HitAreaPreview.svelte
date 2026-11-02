<script module>
    export const id = "hit-area";
    export const label = "Hit-Area";

    let showHitArea = $state(false);

    const previewButtons = [
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
</script>

<div class="flex flex-col gap-5">
    {#if showHitArea}
        <button
            class="cs-button w-fit"
            data-size="md"
            data-variant="soft"
            data-color="accent"
            onclick={() => (showHitArea = !showHitArea)}>Show Area</button
        >
    {:else}
        <button
            class="cs-button w-fit"
            data-size="md"
            data-variant="soft"
            data-color="base"
            onclick={() => (showHitArea = !showHitArea)}>Show Area</button
        >
    {/if}

    <div class="flex justify-center">
        <div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl px-2 lg:px-8">
            {#each previewButtons as button (button)}
                <button class="cs-button" data-size={button.size} data-variant="soft" data-color="base"
                    ><Plus />
                    <span
                        class="cs-hit-area border border-dashed"
                        class:is-visible={showHitArea}
                        data-size={button.size}
                        aria-hidden="true"
                        style="--hit-area-color: var(--cs-color-{button.color}-500);"
                    ></span>
                </button>
            {/each}

            <button class="cs-button" data-size="md" data-variant="soft" data-color="base"
                ><Plus />
                <span
                    class="cs-hit-area border border-dashed size-64px"
                    class:is-visible={showHitArea}
                    data-size="md"
                    aria-hidden="true"
                    style="--hit-area-color: var(--cs-color-blue-500);"
                ></span>
            </button>
        </div>
    </div>
</div>

<style>
    .cs-hit-area {
        border-color: transparent;
    }

    .is-visible {
        border-color: var(--hit-area-color);
    }
</style>
