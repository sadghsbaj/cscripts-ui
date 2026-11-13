<script module>
    export const id = "checkbox";
    export const label = "Checkbox";
</script>

<script lang="ts">
    import { untrack } from "svelte";
    import { ToggleButton, ToggleButtonLabel } from "cs/svelte/toggle-button";
    import { ToggleButtonGroup } from "cs/svelte/toggle-button-group";

    import { Checkbox, CHECKBOX_SIZES } from "../../../src/svelte/primitives/checkbox";

    const STATES = [
        { id: "unchecked", label: "Unchecked" },
        { id: "checked", label: "Checked" },
        { id: "indeterminate", label: "Indeterminate" },
        { id: "invalid", label: "Invalid" },
    ] as const;

    type StateMode = (typeof STATES)[number]["id"];

    let selectedMode = $state<StateMode>("unchecked");

    let singleChecked = $state(false);
    let singleIndeterminate = $state(false);
    let singleInvalid = $state(false);

    function applyMode(mode: StateMode | undefined): void {
        if (!mode) return;
        selectedMode = mode;
        singleChecked = mode === "checked" || mode === "invalid";
        singleIndeterminate = mode === "indeterminate";
        singleInvalid = mode === "invalid";
    }

    $effect(() => {
        const mode = selectedMode;
        untrack(() => {
            applyMode(mode);
        });
    });
</script>

<div class="size-full flex-center flex flex-col gap-8 py-8">
    <ToggleButtonGroup type="single" bind:value={selectedMode} orientation="horizontal">
        {#each STATES as state (state.id)}
            <ToggleButton
                value={state.id}
                variant="soft"
                color="accent"
                size="md"
                class="w-32"
                onclick={() => applyMode(state.id)}
            >
                <ToggleButtonLabel>{state.label}</ToggleButtonLabel>
            </ToggleButton>
        {/each}
    </ToggleButtonGroup>

    <!-- Single interactive test checkbox connected to ToggleButtonGroup -->
    <div
        class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-120px min-w-300px flex-center flex-col gap-2"
    >
        <Checkbox
            variant="soft"
            size="lg"
            bind:checked={singleChecked}
            bind:indeterminate={singleIndeterminate}
            invalid={singleInvalid}
        />
        <span class="text-xs text-weak capitalize">{selectedMode}</span>
    </div>

    <!-- Overview cards with static/independent checkboxes -->
    <div class="flex gap-4">
        <div
            class="bg-elevation-1 shadow-elevation-1 rounded-3xl squircle p-8 min-h-200px min-w-300px flex-center flex-col gap-3"
        >
            {#each CHECKBOX_SIZES as size (size)}
                <Checkbox variant="soft" {size} />
            {/each}
        </div>

        <div class="p-8 min-h-200px min-w-300px flex-center flex-col gap-3">
            {#each CHECKBOX_SIZES as size (size)}
                <Checkbox variant="elevated" {size} />
            {/each}
        </div>
    </div>
</div>
