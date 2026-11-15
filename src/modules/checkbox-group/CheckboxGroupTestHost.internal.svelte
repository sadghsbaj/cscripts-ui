<script lang="ts">
    import { Checkbox } from "../checkbox/index.ts";
    import CheckboxGroup from "./CheckboxGroup.svelte";
    import CheckboxGroupSelectAll from "./CheckboxGroupSelectAll.svelte";

    interface TestCheckboxItem {
        value: string;
        name?: string;
        disabled?: boolean;
        invalid?: boolean;
        onCheckedChange?: (checked: boolean) => void;
    }

    interface TestSelectAllConfig {
        disabled?: boolean;
        invalid?: boolean;
        class?: string;
        onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
    }

    interface Props {
        mode?: "bound" | "controlled";
        value?: string[];
        onValueChange?: (value: string[]) => void;
        name?: string;
        disabled?: boolean;
        invalid?: boolean;
        class?: string;
        groupAttrs?: Record<string, unknown>;
        ref?: HTMLDivElement | null;
        items: TestCheckboxItem[];
        selectAll?: TestSelectAllConfig;
        includeUnvaluedChild?: boolean;
        includeStandalone?: boolean;
    }

    let {
        mode = "bound",
        value = $bindable([]),
        onValueChange,
        name,
        disabled = false,
        invalid = false,
        class: className,
        groupAttrs = {},
        ref = $bindable(null),
        items,
        selectAll,
        includeUnvaluedChild = false,
        includeStandalone = false,
    }: Props = $props();
</script>

{#snippet groupContent()}
    {#if selectAll}
        <CheckboxGroupSelectAll
            variant="soft"
            size="md"
            disabled={selectAll.disabled}
            invalid={selectAll.invalid}
            class={selectAll.class}
            onchange={selectAll.onchange}
        />
    {/if}

    {#each items as item (item.value)}
        <Checkbox
            variant="soft"
            size="md"
            value={item.value}
            name={item.name}
            disabled={item.disabled}
            invalid={item.invalid}
            onCheckedChange={item.onCheckedChange}
        />
    {/each}

    {#if includeUnvaluedChild}
        <Checkbox variant="soft" size="md" data-testid="unvalued-child" />
    {/if}
{/snippet}

{#if mode === "controlled"}
    <CheckboxGroup
        bind:ref
        bind:value={() => value, () => {}}
        {onValueChange}
        {name}
        {disabled}
        {invalid}
        class={className}
        {...groupAttrs}
    >
        {@render groupContent()}
    </CheckboxGroup>
{:else}
    <CheckboxGroup
        bind:ref
        bind:value
        {onValueChange}
        {name}
        {disabled}
        {invalid}
        class={className}
        {...groupAttrs}
    >
        {@render groupContent()}
    </CheckboxGroup>
{/if}

{#if includeStandalone}
    <Checkbox variant="soft" size="md" value="standalone" data-testid="standalone-checkbox" />
{/if}
