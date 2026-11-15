<script module>
    export const id = "switch";
    export const label = "Switch";
</script>

<script lang="ts">
    import { Switch, SWITCH_SIZES, type SwitchSize } from "cs/svelte/switch";
    import { PreviewHeader, PreviewSection } from "../../../playground/components/index.ts";

    let basicChecked = $state(false);

    let offState = $state(false);
    let onState = $state(true);

    let sizeChecked = $state<Record<SwitchSize, boolean>>({
        xs: true,
        sm: true,
        md: true,
        lg: true,
        xl: true,
    });

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { Switch } from "cs/svelte/switch";

    let checked = $state(false);
${closeScript}

<label class="flex items-center gap-3 text-sm text-main select-none">
    <Switch size="md" bind:checked />
    <span>Enable notifications</span>
</label>`;

    const statesCode = `<Switch size="md" />
<Switch size="md" checked />
<Switch size="md" disabled />
<Switch size="md" checked disabled />`;

    const sizesCode = `<Switch size="xs" checked />
<Switch size="sm" checked />
<Switch size="md" checked />
<Switch size="lg" checked />
<Switch size="xl" checked />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Switch"
        description="A binary toggle control with a soft track and tactile thumb physics."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <label class="flex items-center gap-3 text-sm text-main select-none">
            <Switch size="md" bind:checked={basicChecked} />
            <span>Enable notifications</span>
        </label>
    </PreviewSection>

    <PreviewSection
        title="States"
        description="Supports off, on, and disabled states."
        code={statesCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Switch size="md" bind:checked={offState} />
                <span>Off</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Switch size="md" bind:checked={onState} />
                <span>On</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                <Switch size="md" disabled />
                <span>Disabled off</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                <Switch size="md" checked disabled />
                <span>Disabled on</span>
            </label>
        </div>
    </PreviewSection>

    <PreviewSection title="Sizes" code={sizesCode}>
        <div class="flex items-center gap-5">
            {#each SWITCH_SIZES as size (size)}
                <Switch
                    {size}
                    bind:checked={sizeChecked[size]}
                    aria-label="Switch size {size}"
                />
            {/each}
        </div>
    </PreviewSection>
</div>
