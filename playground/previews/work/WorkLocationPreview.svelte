<script module>
    export const id = "work-location";
    export const label = "Work-Location";
</script>

<script lang="ts">
    import { WORK_LOCATION_IDS, WORK_LOCATIONS, WorkLocation, type WorkLocationId } from "cs/svelte/work";
</script>

<div class="flex justify-center">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl px-2 lg:px-8">
        {#each WORK_LOCATION_IDS as location (location)}
            {@render previewCard(location, "")}
        {/each}
        {#each WORK_LOCATION_IDS as location (location)}
            {@render previewCard(location, "text-emerald-500")}
        {/each}
    </div>
</div>

{#snippet previewCard(location: WorkLocationId, colorClass: string)}
    <div class="bg-elevated shadow-elevated rounded-3xl squircle p-8 min-h-200px flex flex-col gap-5">
        <h2 class="title-2xl">
            {WORK_LOCATIONS[location].label}
        </h2>
        <div class="grid grid-cols-2 gap-6 items-center flex-1">
            <WorkLocation {location} class={["w-full max-h-160px", colorClass]} />
            <WorkLocation {location} marker class={["w-full max-h-160px", colorClass]} />
        </div>
    </div>
{/snippet}
