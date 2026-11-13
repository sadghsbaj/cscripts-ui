<script module>
    export const id = "playground";
    export const label = "Playground";
</script>

<script lang="ts">
    import { CHECKBOX_SIZES } from "../../../src/svelte/primitives/checkbox";
    import Checkbox from "../../../src/svelte/primitives/checkbox/Checkbox.svelte";
</script>

<div class="size-full flex-center flex flex-col gap-4">
    <div class="flex gap-4">
        <div
            class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px min-w-300px flex-center flex-col gap-3"
        >
            {#each CHECKBOX_SIZES as size (size)}
                <Checkbox variant="soft" {size} />
            {/each}
        </div>

        <div class="p-8 min-h-200px min-w-300px flex-center flex-col gap-3">
            {#each CHECKBOX_SIZES as size (size)}
                <Checkbox variant="elevated" {size} invalid />
            {/each}
        </div>
    </div>
</div>
