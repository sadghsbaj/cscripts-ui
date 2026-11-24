<script module>
    export const id = "checkbox";
    export const label = "Checkbox";
</script>

<script lang="ts">
    import { ArrowRight } from "@lucide/svelte";
    import { Checkbox, CHECKBOX_SIZES } from "cs/svelte/checkbox";
    import { PreviewHeader, PreviewSection, SunkenWell } from "../../../playground/components/index.ts";

    let basicChecked = $state(false);
    let softChecked = $state(false);
    let elevatedChecked = $state(false);

    let uncheckedState = $state(false);
    let checkedState = $state(true);
    let invalidState = $state(false);

    let triStep = $state(0);
    let indeterminateChecked = $state(false);
    let indeterminateActive = $state(true);

    function applyTriState(
        event: Event,
        nextChecked: boolean,
        nextIndeterminate: boolean,
    ): void {
        const target = event.currentTarget as HTMLInputElement;
        target.checked = nextChecked;
        target.indeterminate = nextIndeterminate;
    }

    function handleTriStateChange(event: Event): void {
        triStep = (triStep + 1) % 3;
        indeterminateChecked = triStep === 1;
        indeterminateActive = triStep === 0;
        applyTriState(event, indeterminateChecked, indeterminateActive);
    }

    let cycleAStep = $state(0);
    let cycleAChecked = $state(false);
    let cycleAIndeterminate = $state(false);

    function handleCycleAChange(event: Event): void {
        cycleAStep = (cycleAStep + 1) % 3;
        cycleAChecked = cycleAStep === 2;
        cycleAIndeterminate = cycleAStep === 1;
        applyTriState(event, cycleAChecked, cycleAIndeterminate);
    }

    let cycleBStep = $state(0);
    let cycleBChecked = $state(false);
    let cycleBIndeterminate = $state(false);

    function handleCycleBChange(event: Event): void {
        cycleBStep = (cycleBStep + 1) % 3;
        cycleBChecked = cycleBStep === 1;
        cycleBIndeterminate = cycleBStep === 2;
        applyTriState(event, cycleBChecked, cycleBIndeterminate);
    }

    const closeScript = ["</", "script>"].join("");

    const basicCode = `<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";

    let checked = $state(false);
${closeScript}

<label class="flex items-center gap-3 text-sm text-main select-none">
    <Checkbox variant="soft" size="md" bind:checked />
    <span>Accept terms and conditions</span>
</label>`;

    const variantsCode = `<Checkbox variant="soft" size="md" />
<Checkbox variant="elevated" size="md" />`;

    const statesCode = `<Checkbox variant="soft" size="md" />
<Checkbox variant="soft" size="md" checked />
<Checkbox variant="soft" size="md" indeterminate />
<Checkbox variant="soft" size="md" invalid />
<Checkbox variant="soft" size="md" disabled />`;

    const sizesCode = `<Checkbox variant="soft" size="xs" checked />
<Checkbox variant="soft" size="sm" checked />
<Checkbox variant="soft" size="md" checked />
<Checkbox variant="soft" size="lg" checked />
<Checkbox variant="soft" size="xl" checked />`;

    const disabledCode = `<Checkbox variant="soft" size="md" disabled />
<Checkbox variant="soft" size="md" checked disabled />
<Checkbox variant="soft" size="md" indeterminate disabled />
<Checkbox variant="elevated" size="md" disabled />`;
</script>

<div class="flex flex-col gap-10">
    <PreviewHeader
        title="Checkbox"
        description="A binary or indeterminate selection control with soft and elevated surfaces."
    />

    <PreviewSection title="Basic" code={basicCode}>
        <label class="flex items-center gap-3 text-sm text-main select-none">
            <Checkbox variant="soft" size="md" bind:checked={basicChecked} />
            <span>Accept terms and conditions</span>
        </label>
    </PreviewSection>

    <PreviewSection
        title="Variants"
        description="Use soft on elevated cards and elevated directly on canvas backgrounds."
        code={variantsCode}
    >
        <div class="flex items-center gap-8">
            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox variant="soft" size="md" bind:checked={softChecked} />
                <span>Soft</span>
            </label>

            <SunkenWell>
                <label class="flex items-center gap-2.5 text-sm text-main select-none">
                    <Checkbox variant="elevated" size="md" bind:checked={elevatedChecked} />
                    <span>Elevated</span>
                </label>
            </SunkenWell>
        </div>
    </PreviewSection>

    <PreviewSection
        title="States"
        description="Supports unchecked, checked, indeterminate, invalid, and disabled states."
        code={statesCode}
    >
        <div class="flex flex-wrap items-center gap-6">
            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox variant="soft" size="md" bind:checked={uncheckedState} />
                <span>Unchecked</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox variant="soft" size="md" bind:checked={checkedState} />
                <span>Checked</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox
                    variant="soft"
                    size="md"
                    bind:checked={indeterminateChecked}
                    bind:indeterminate={indeterminateActive}
                    onchange={handleTriStateChange}
                />
                <span>Indeterminate</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox variant="soft" size="md" bind:checked={invalidState} invalid />
                <span>Invalid</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                <Checkbox variant="soft" size="md" disabled />
                <span>Disabled</span>
            </label>
        </div>
    </PreviewSection>

    <PreviewSection
        title="Tri-state Cycles"
        description="Click each checkbox to cycle through its three states."
    >
        <div class="flex flex-wrap items-center gap-8">
            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox
                    variant="soft"
                    size="md"
                    bind:checked={cycleAChecked}
                    bind:indeterminate={cycleAIndeterminate}
                    onchange={handleCycleAChange}
                    aria-label="Unchecked to Indeterminate to Checked"
                />
                <span class="inline-flex items-center gap-1">Unchecked <ArrowRight class="size-3.5 text-weak" aria-hidden="true" /> Indeterminate <ArrowRight class="size-3.5 text-weak" aria-hidden="true" /> Checked</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox
                    variant="soft"
                    size="md"
                    bind:checked={cycleBChecked}
                    bind:indeterminate={cycleBIndeterminate}
                    onchange={handleCycleBChange}
                    aria-label="Unchecked to Checked to Indeterminate"
                />
                <span class="inline-flex items-center gap-1">Unchecked <ArrowRight class="size-3.5 text-weak" aria-hidden="true" /> Checked <ArrowRight class="size-3.5 text-weak" aria-hidden="true" /> Indeterminate</span>
            </label>
        </div>
    </PreviewSection>

    <PreviewSection title="Sizes" code={sizesCode}>
        <div class="flex items-center gap-5">
            {#each CHECKBOX_SIZES as size (size)}
                <Checkbox variant="soft" {size} checked aria-label="Checkbox size {size}" />
            {/each}
        </div>
    </PreviewSection>

    <PreviewSection title="Disabled" code={disabledCode}>
        <div class="flex flex-wrap items-center gap-6">
            <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                <Checkbox variant="soft" size="md" disabled />
                <span>Unchecked</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                <Checkbox variant="soft" size="md" checked disabled />
                <span>Checked</span>
            </label>

            <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                <Checkbox variant="soft" size="md" indeterminate disabled />
                <span>Indeterminate</span>
            </label>

            <SunkenWell>
                <label class="flex items-center gap-2.5 text-sm text-weak select-none">
                    <Checkbox variant="elevated" size="md" disabled />
                    <span>Elevated</span>
                </label>
            </SunkenWell>
        </div>
    </PreviewSection>
</div>
