<script lang="ts">
    import { Switch, type SwitchSize } from "../switch/index.ts";
    import SwitchGroup from "./SwitchGroup.svelte";
    import SwitchGroupSelectAll from "./SwitchGroupSelectAll.svelte";

    interface TestSwitchItem {
        value: string;
        size?: SwitchSize;
        name?: string;
        disabled?: boolean;
        onCheckedChange?: (checked: boolean) => void;
        onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
    }

    interface TestSelectAllConfig {
        size?: SwitchSize;
        disabled?: boolean;
        class?: string;
        onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
    }

    interface Props {
        mode?: "bound" | "controlled";
        value?: string[];
        onValueChange?: (value: string[]) => void;
        name?: string;
        disabled?: boolean;
        class?: string;
        groupAttrs?: Record<string, unknown>;
        ref?: HTMLDivElement | null;
        selectAllRef?: HTMLInputElement | null;
        items: TestSwitchItem[];
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
        class: className,
        groupAttrs = {},
        ref = $bindable(null),
        selectAllRef = $bindable(null),
        items,
        selectAll,
        includeUnvaluedChild = false,
        includeStandalone = false,
    }: Props = $props();
</script>

{#snippet groupContent()}
    {#if selectAll}
        <SwitchGroupSelectAll
            bind:ref={selectAllRef}
            size={selectAll.size ?? "md"}
            disabled={selectAll.disabled}
            class={selectAll.class}
            onchange={selectAll.onchange}
        />
    {/if}

    {#each items as item (item.value)}
        <Switch
            size={item.size ?? "md"}
            value={item.value}
            name={item.name}
            disabled={item.disabled}
            onCheckedChange={item.onCheckedChange}
            onchange={item.onchange}
        />
    {/each}

    {#if includeUnvaluedChild}
        <Switch size="md" data-testid="unvalued-child" />
    {/if}
{/snippet}

{#if mode === "controlled"}
    <SwitchGroup
        bind:ref
        bind:value={() => value, () => {}}
        {onValueChange}
        {name}
        {disabled}
        class={className}
        {...groupAttrs}
    >
        {@render groupContent()}
    </SwitchGroup>
{:else}
    <SwitchGroup
        bind:ref
        bind:value
        {onValueChange}
        {name}
        {disabled}
        class={className}
        {...groupAttrs}
    >
        {@render groupContent()}
    </SwitchGroup>
{/if}

{#if includeStandalone}
    <Switch size="md" value="standalone" data-testid="standalone-switch" />
{/if}
