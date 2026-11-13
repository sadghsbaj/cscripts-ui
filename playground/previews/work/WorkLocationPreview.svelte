<script module lang="ts">
    export const id = "work-location";
    export const label = "WorkLocation";
</script>

<script lang="ts">
    import { WORK_LOCATION_IDS, WORK_LOCATIONS, WorkLocation } from "cs/svelte/work";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { WorkLocation } from "cs/svelte/work";
${closeScript}

<WorkLocation location="neumarkt" class="h-140px w-auto" />`;

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippet contains literal {location} binding */
    const locationsCode = `<script lang="ts">
    import { WORK_LOCATION_IDS, WORK_LOCATIONS, WorkLocation } from "cs/svelte/work";
${closeScript}

{#each WORK_LOCATION_IDS as location (location)}
    <div class="flex flex-col items-center gap-2">
        <WorkLocation {location} marker class="h-120px w-auto" />
        <span class="text-xs text-weak">{WORK_LOCATIONS[location].label}</span>
    </div>
{/each}`;
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */

    const markerCode = `<WorkLocation location="arnsberg" class="h-130px w-auto" />
<WorkLocation location="arnsberg" marker class="h-130px w-auto" />`;

    const colorCode = `<WorkLocation location="baruth" marker class="h-120px w-auto text-emerald-500" />
<WorkLocation location="leutkirch" marker class="h-120px w-auto text-sky-500" />
<WorkLocation location="guetersloh" marker class="h-120px w-auto text-amber-500" />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="WorkLocation"
        description="SVG map primitive for Pfleiderer plant regions with an optional location marker."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <WorkLocation location="neumarkt" class="h-140px w-auto" />
    </PreviewSection>

    <PreviewSection
        title="Locations"
        description="All available plant regions defined in WORK_LOCATION_IDS."
        code={locationsCode}
    >
        <div class="flex flex-wrap items-end justify-center gap-8">
            {#each WORK_LOCATION_IDS as location (location)}
                <div class="flex flex-col items-center gap-2">
                    <WorkLocation {location} marker class="h-120px w-auto" />
                    <span class="text-xs text-weak">{WORK_LOCATIONS[location].label}</span>
                </div>
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection
        title="Marker"
        description="Highlights the plant coordinates with a centered dot on the region outline."
        code={markerCode}
    >
        <div class="flex flex-wrap items-end justify-center gap-10">
            <div class="flex flex-col items-center gap-2">
                <WorkLocation location="arnsberg" class="h-130px w-auto" />
                <span class="text-xs text-weak">Default</span>
            </div>
            <div class="flex flex-col items-center gap-2">
                <WorkLocation location="arnsberg" marker class="h-130px w-auto" />
                <span class="text-xs text-weak">marker</span>
            </div>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Color"
        description="Stroke and tinted fill derive from currentColor."
        code={colorCode}
    >
        <div class="flex flex-wrap items-end justify-center gap-10">
            <WorkLocation location="baruth" marker class="h-120px w-auto text-emerald-500" />
            <WorkLocation location="leutkirch" marker class="h-120px w-auto text-sky-500" />
            <WorkLocation location="guetersloh" marker class="h-120px w-auto text-amber-500" />
        </div>
    </PreviewSection>
</div>
