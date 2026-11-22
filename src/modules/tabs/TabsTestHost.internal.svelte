<script lang="ts">
    import { ChevronLeft } from "@lucide/svelte";
    import type { MouseEventHandler, PointerEventHandler } from "svelte/elements";

    import Tabs from "./Tabs.svelte";
    import TabsIcon from "./TabsIcon.svelte";
    import TabsLabel from "./TabsLabel.svelte";
    import TabsList from "./TabsList.svelte";
    import TabsPanel from "./TabsPanel.svelte";
    import TabsTrigger from "./TabsTrigger.svelte";
    import type {
        TabsActivationMode,
        TabsBaseline,
        TabsOrientation,
        TabsSize,
        TabsWidth,
    } from "./index.ts";

    export interface TestTabItem {
        value: string;
        label?: string;
        href?: string;
        disabled?: boolean;
        withIcon?: boolean;
        onclick?: MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
        onpointerdown?: PointerEventHandler<HTMLButtonElement | HTMLAnchorElement>;
        panelContent?: string;
        panelKeepMounted?: boolean;
        includePanel?: boolean;
    }

    interface Props {
        value?: string;
        onValueChange?: (value: string) => void;
        size?: TabsSize;
        orientation?: TabsOrientation;
        width?: TabsWidth;
        baseline?: TabsBaseline;
        activationMode?: TabsActivationMode;
        loop?: boolean;
        disabled?: boolean;
        keepMounted?: boolean;
        withPanels?: boolean;
        ref?: HTMLDivElement | null;
        items: TestTabItem[];
    }

    let {
        value = $bindable(),
        onValueChange,
        size = "md",
        orientation = "horizontal",
        width = "content",
        baseline = "full",
        activationMode = "automatic",
        loop = true,
        disabled = false,
        keepMounted = false,
        withPanels = true,
        ref = $bindable(null),
        items,
    }: Props = $props();
</script>

<Tabs
    bind:ref
    bind:value
    {onValueChange}
    {size}
    {orientation}
    {width}
    {baseline}
    {activationMode}
    {loop}
    {disabled}
    {keepMounted}
>
    <TabsList>
        {#each items as item (item.value)}
            {#if item.href !== undefined}
                <TabsTrigger
                    value={item.value}
                    href={item.href}
                    disabled={item.disabled}
                    onclick={item.onclick as MouseEventHandler<HTMLAnchorElement>}
                    onpointerdown={item.onpointerdown as PointerEventHandler<HTMLAnchorElement>}
                >
                    {#if item.withIcon}
                        <TabsIcon icon={ChevronLeft} />
                    {/if}
                    <TabsLabel>{item.label ?? item.value}</TabsLabel>
                </TabsTrigger>
            {:else}
                <TabsTrigger
                    value={item.value}
                    disabled={item.disabled}
                    onclick={item.onclick as MouseEventHandler<HTMLButtonElement>}
                    onpointerdown={item.onpointerdown as PointerEventHandler<HTMLButtonElement>}
                >
                    {#if item.withIcon}
                        <TabsIcon icon={ChevronLeft} />
                    {/if}
                    <TabsLabel>{item.label ?? item.value}</TabsLabel>
                </TabsTrigger>
            {/if}
        {/each}
    </TabsList>

    {#if withPanels}
        {#each items as item (item.value)}
            {#if item.includePanel !== false}
                <TabsPanel value={item.value} keepMounted={item.panelKeepMounted}>
                    {item.panelContent ?? `Panel ${item.value}`}
                </TabsPanel>
            {/if}
        {/each}
    {/if}
</Tabs>
