<script lang="ts">
    import type { ClassValue } from "svelte/elements";
    import type { CollapsibleMotion } from "../collapsible/index.ts";
    import {
        Accordion,
        AccordionContent,
        AccordionHeader,
        AccordionItem,
        AccordionTrigger,
        type AccordionHeaderElement,
        type AccordionSize,
        type AccordionVariant,
    } from "./index.ts";

    export interface TestAccordionItemConfig {
        value: string;
        title?: string;
        subtitle?: string;
        disabled?: boolean;
        headerAs?: AccordionHeaderElement | false;
        padded?: boolean;
        region?: boolean;
        keepMounted?: boolean;
        motion?: CollapsibleMotion;
        animate?: boolean;
        hasLeading?: boolean;
        indicatorMode?: "default" | "none" | "custom";
        contentText?: string;
        itemClass?: ClassValue;
        headerClass?: ClassValue;
        triggerClass?: ClassValue;
        contentClass?: ClassValue;
        itemRest?: Record<string, unknown>;
        headerRest?: Record<string, unknown>;
        triggerRest?: Record<string, unknown>;
        contentRest?: Record<string, unknown>;
        nestedItems?: TestAccordionItemConfig[];
        onItemRef?: (el: HTMLDivElement | null) => void;
        onHeaderRef?: (el: HTMLHeadingElement | HTMLDivElement | null) => void;
        onTriggerRef?: (el: HTMLButtonElement | null) => void;
        onContentRef?: (el: HTMLDivElement | null) => void;
    }

    interface Props {
        variant?: AccordionVariant;
        size?: AccordionSize;
        multiple?: boolean;
        value?: string | string[];
        onValueChange?: (val: unknown) => void;
        collapsible?: boolean;
        disabled?: boolean;
        keepMounted?: boolean;
        motion?: CollapsibleMotion;
        animate?: boolean;
        loop?: boolean;
        rootClass?: ClassValue;
        rootRest?: Record<string, unknown>;
        onRootRef?: (el: HTMLDivElement | null) => void;
        items: TestAccordionItemConfig[];
    }

    let {
        variant = "flush",
        size = "md",
        multiple = false,
        value = $bindable(),
        onValueChange,
        collapsible = false,
        disabled = false,
        keepMounted = true,
        motion = "slide",
        animate = true,
        loop = true,
        rootClass,
        rootRest = {},
        onRootRef,
        items,
    }: Props = $props();

    let rootRef = $state<HTMLDivElement | null>(null);
    $effect(() => {
        onRootRef?.(rootRef);
    });

    const itemRefs = $state<Record<string, HTMLDivElement | null>>({});
    const headerRefs = $state<Record<string, HTMLHeadingElement | HTMLDivElement | null>>({});
    const triggerRefs = $state<Record<string, HTMLButtonElement | null>>({});
    const contentRefs = $state<Record<string, HTMLDivElement | null>>({});
</script>

{#snippet triggerContent(item: TestAccordionItemConfig)}
    {#snippet leadingSnippet()}
        <span class="test-leading">L</span>
    {/snippet}

    {#snippet customIndicatorSnippet({ open }: { open: boolean })}
        <span class="test-custom-indicator">{open ? "−" : "+"}</span>
    {/snippet}

    <AccordionTrigger
        bind:ref={
            (): HTMLButtonElement | null => triggerRefs[item.value] ?? null,
            (el: HTMLButtonElement | null): void => {
                triggerRefs[item.value] = el;
                item.onTriggerRef?.(el);
            }
        }
        leading={item.hasLeading ? leadingSnippet : undefined}
        subtitle={item.subtitle}
        indicator={item.indicatorMode === "none"
            ? false
            : item.indicatorMode === "custom"
              ? customIndicatorSnippet
              : undefined}
        class={item.triggerClass}
        {...item.triggerRest}
    >
        {item.title ?? item.value}
    </AccordionTrigger>
{/snippet}

{#if multiple}
    <Accordion
        bind:ref={rootRef}
        {variant}
        {size}
        multiple={true}
        bind:value={value as string[] | undefined}
        onValueChange={onValueChange as ((val: string[]) => void) | undefined}
        {disabled}
        {keepMounted}
        {motion}
        {animate}
        {loop}
        class={rootClass}
        {...rootRest}
    >
        {#each items as item (item.value)}
            <AccordionItem
                bind:ref={
                    (): HTMLDivElement | null => itemRefs[item.value] ?? null,
                    (el: HTMLDivElement | null): void => {
                        itemRefs[item.value] = el;
                        item.onItemRef?.(el);
                    }
                }
                value={item.value}
                disabled={item.disabled}
                class={item.itemClass}
                {...item.itemRest}
            >
                {#if item.headerAs === false}
                    {@render triggerContent(item)}
                {:else}
                    <AccordionHeader
                        bind:ref={
                            (): HTMLHeadingElement | HTMLDivElement | null => headerRefs[item.value] ?? null,
                            (el: HTMLHeadingElement | HTMLDivElement | null): void => {
                                headerRefs[item.value] = el;
                                item.onHeaderRef?.(el);
                            }
                        }
                        as={item.headerAs}
                        class={item.headerClass}
                        {...item.headerRest}
                    >
                        {@render triggerContent(item)}
                    </AccordionHeader>
                {/if}
                <AccordionContent
                    bind:ref={
                        (): HTMLDivElement | null => contentRefs[item.value] ?? null,
                        (el: HTMLDivElement | null): void => {
                            contentRefs[item.value] = el;
                            item.onContentRef?.(el);
                        }
                    }
                    padded={item.padded}
                    region={item.region}
                    keepMounted={item.keepMounted}
                    motion={item.motion}
                    animate={item.animate}
                    class={item.contentClass}
                    {...item.contentRest}
                >
                    <p class="test-content-text">{item.contentText ?? `Content ${item.value}`}</p>
                    {#if item.nestedItems}
                        <Accordion variant="flush" size="sm" data-testid="nested-accordion">
                            {#each item.nestedItems as nested (nested.value)}
                                <AccordionItem value={nested.value} disabled={nested.disabled}>
                                    <AccordionHeader>
                                        <AccordionTrigger data-testid={`nested-trigger-${nested.value}`}>
                                            {nested.title ?? nested.value}
                                        </AccordionTrigger>
                                    </AccordionHeader>
                                    <AccordionContent>
                                        {nested.contentText ?? `Nested ${nested.value}`}
                                    </AccordionContent>
                                </AccordionItem>
                            {/each}
                        </Accordion>
                    {/if}
                </AccordionContent>
            </AccordionItem>
        {/each}
    </Accordion>
{:else}
    <Accordion
        bind:ref={rootRef}
        {variant}
        {size}
        multiple={false}
        bind:value={value as string | undefined}
        onValueChange={onValueChange as ((val: string | undefined) => void) | undefined}
        {collapsible}
        {disabled}
        {keepMounted}
        {motion}
        {animate}
        {loop}
        class={rootClass}
        {...rootRest}
    >
        {#each items as item (item.value)}
            <AccordionItem
                bind:ref={
                    (): HTMLDivElement | null => itemRefs[item.value] ?? null,
                    (el: HTMLDivElement | null): void => {
                        itemRefs[item.value] = el;
                        item.onItemRef?.(el);
                    }
                }
                value={item.value}
                disabled={item.disabled}
                class={item.itemClass}
                {...item.itemRest}
            >
                {#if item.headerAs === false}
                    {@render triggerContent(item)}
                {:else}
                    <AccordionHeader
                        bind:ref={
                            (): HTMLHeadingElement | HTMLDivElement | null => headerRefs[item.value] ?? null,
                            (el: HTMLHeadingElement | HTMLDivElement | null): void => {
                                headerRefs[item.value] = el;
                                item.onHeaderRef?.(el);
                            }
                        }
                        as={item.headerAs}
                        class={item.headerClass}
                        {...item.headerRest}
                    >
                        {@render triggerContent(item)}
                    </AccordionHeader>
                {/if}
                <AccordionContent
                    bind:ref={
                        (): HTMLDivElement | null => contentRefs[item.value] ?? null,
                        (el: HTMLDivElement | null): void => {
                            contentRefs[item.value] = el;
                            item.onContentRef?.(el);
                        }
                    }
                    padded={item.padded}
                    region={item.region}
                    keepMounted={item.keepMounted}
                    motion={item.motion}
                    animate={item.animate}
                    class={item.contentClass}
                    {...item.contentRest}
                >
                    <p class="test-content-text">{item.contentText ?? `Content ${item.value}`}</p>
                    {#if item.nestedItems}
                        <Accordion variant="flush" size="sm" data-testid="nested-accordion">
                            {#each item.nestedItems as nested (nested.value)}
                                <AccordionItem value={nested.value} disabled={nested.disabled}>
                                    <AccordionHeader>
                                        <AccordionTrigger data-testid={`nested-trigger-${nested.value}`}>
                                            {nested.title ?? nested.value}
                                        </AccordionTrigger>
                                    </AccordionHeader>
                                    <AccordionContent>
                                        {nested.contentText ?? `Nested ${nested.value}`}
                                    </AccordionContent>
                                </AccordionItem>
                            {/each}
                        </Accordion>
                    {/if}
                </AccordionContent>
            </AccordionItem>
        {/each}
    </Accordion>
{/if}
