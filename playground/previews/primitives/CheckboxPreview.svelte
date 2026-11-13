<script module>
    export const id = "checkbox";
    export const label = "Checkbox";
</script>

<script lang="ts">
    import { Checkbox, CHECKBOX_SIZES } from "cs/svelte/checkbox";
    import { PreviewHeader, PreviewSection } from "../../components/index.ts";

    let basicChecked = $state(false);
    let softChecked = $state(true);
    let elevatedChecked = $state(false);

    let uncheckedState = $state(false);
    let checkedState = $state(true);
    let indeterminateState = $state(true);
    let invalidState = $state(false);

    const closeScript = ["</", "script>"].join("");

    /* eslint-disable unicorn/no-incorrect-template-string-interpolation -- Svelte code snippets contain literal {checked} bindings */
    const basicCode = `<script lang="ts">
    import { Checkbox } from "cs/svelte/checkbox";

    let checked = $state(false);
${closeScript}

<Checkbox variant="soft" size="md" bind:checked />`;

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
    /* eslint-enable unicorn/no-incorrect-template-string-interpolation */
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

            <label class="flex items-center gap-2.5 text-sm text-main select-none">
                <Checkbox variant="elevated" size="md" bind:checked={elevatedChecked} />
                <span>Elevated</span>
            </label>
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
                <Checkbox variant="soft" size="md" bind:indeterminate={indeterminateState} />
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

    <PreviewSection title="Sizes" code={sizesCode}>
        <div class="flex items-center gap-5">
            {#each CHECKBOX_SIZES as size (size)}
                <Checkbox variant="soft" {size} checked aria-label="Checkbox size {size}" />
            {/each}
        </div>
    </PreviewSection>
</div>
