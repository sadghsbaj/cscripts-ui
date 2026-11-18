<script lang="ts">
    import type { MouseEventHandler } from "svelte/elements";

    import { ToggleButton, ToggleButtonLabel } from "./index.ts";
    import ToggleButtonGroup from "./ToggleButtonGroup.svelte";
    import type { ToggleButtonGroupOrientation, ToggleButtonGroupType } from "./index.ts";

    interface TestToggleItem {
        value: string;
        disabled?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement>;
    }

    interface Props {
        type: ToggleButtonGroupType;
        value?: string | string[];
        allowDeselect?: boolean;
        orientation?: ToggleButtonGroupOrientation;
        disabled?: boolean;
        ref?: HTMLDivElement | null;
        onValueChange?: ((value: string) => void) | ((value: string | undefined) => void) | ((value: string[]) => void);
        items: TestToggleItem[];
    }

    let {
        type,
        value = $bindable(),
        allowDeselect = false,
        orientation = "horizontal",
        disabled = false,
        ref = $bindable(null),
        onValueChange,
        items,
    }: Props = $props();
</script>

{#snippet groupItems()}
    {#each items as item (item.value)}
        <ToggleButton
            value={item.value}
            variant="soft"
            color="accent"
            size="md"
            disabled={item.disabled}
            onclick={item.onclick}
        >
            <ToggleButtonLabel>{item.value}</ToggleButtonLabel>
        </ToggleButton>
    {/each}
{/snippet}

{#if type === "single"}
    {#if allowDeselect}
        <ToggleButtonGroup
            type="single"
            allowDeselect={true}
            {orientation}
            {disabled}
            bind:ref
            bind:value={() => value as string | undefined, (v) => (value = v)}
            onValueChange={onValueChange as ((value: string | undefined) => void) | undefined}
        >
            {@render groupItems()}
        </ToggleButtonGroup>
    {:else}
        <ToggleButtonGroup
            type="single"
            {orientation}
            {disabled}
            bind:ref
            bind:value={() => value as string, (v) => (value = v)}
            onValueChange={onValueChange as ((value: string) => void) | undefined}
        >
            {@render groupItems()}
        </ToggleButtonGroup>
    {/if}
{:else}
    <ToggleButtonGroup
        type="multiple"
        {orientation}
        {disabled}
        bind:ref
        bind:value={() => value as string[], (v) => (value = v)}
        onValueChange={onValueChange as ((value: string[]) => void) | undefined}
    >
        {@render groupItems()}
    </ToggleButtonGroup>
{/if}
