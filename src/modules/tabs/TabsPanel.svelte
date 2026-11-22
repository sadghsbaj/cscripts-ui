<script lang="ts" generics="T extends string = string">
    import { getTabsContext } from "./tabs.context.ts";
    import type { TabsPanelProps } from "./tabs.types.ts";

    let {
        ref = $bindable(null),
        value,
        keepMounted,
        class: className,
        children,
        ...rest
    }: TabsPanelProps<T> = $props();

    const tabs = getTabsContext();
    const uid = $props.id();

    const panelId = $derived(`${tabs.rootId}-panel-${uid}`);
    const isSelected = $derived(tabs.isSelected(value));
    const shouldKeepMounted = $derived(keepMounted ?? tabs.keepMounted);
    const triggerId = $derived(tabs.getTriggerId(value));

    $effect(() => {
        return tabs.registerPanel(value, panelId);
    });
</script>

{#if shouldKeepMounted || isSelected}
    <div
        bind:this={ref}
        {...rest}
        id={panelId}
        role="tabpanel"
        aria-labelledby={triggerId}
        tabindex={0}
        class={["cs-tabs-panel", className]}
        data-value={value}
        data-selected={isSelected ? "" : undefined}
        hidden={!isSelected || undefined}
    >
        {@render children?.()}
    </div>
{/if}
