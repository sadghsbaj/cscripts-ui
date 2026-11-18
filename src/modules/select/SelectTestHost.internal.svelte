<script lang="ts">
    import type { Component } from "svelte";
    import type { KeyboardEventHandler, MouseEventHandler, PointerEventHandler } from "svelte/elements";

    import type { PopoverPlacement, PopoverWidth } from "../popover/index.ts";
    import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";
    import {
        Select,
        SelectContent,
        SelectGroup,
        SelectGroupLabel,
        SelectItem,
        SelectItemDescription,
        SelectItemIcon,
        SelectItemText,
        SelectSeparator,
        SelectTrigger,
        SelectValue,
        type SelectIconComponentProps,
        type SelectSize,
        type SelectVariant,
    } from "./index.ts";

    export interface TestSelectItem {
        value: string;
        label?: string;
        text?: string;
        plainText?: string;
        description?: string;
        icon?: Component<SelectIconComponentProps>;
        childIcon?: Component<SelectIconComponentProps>;
        childIconColor?: string;
        childIconClass?: string;
        childIconAttrs?: Record<string, unknown>;
        disabled?: boolean;
        hideIndicator?: boolean;
        class?: string;
        attrs?: Record<string, unknown>;
        textClass?: string;
        textAttrs?: Record<string, unknown>;
        descriptionClass?: string;
        descriptionAttrs?: Record<string, unknown>;
        bindRef?: boolean;
        onclick?: MouseEventHandler<HTMLDivElement>;
        onpointerup?: PointerEventHandler<HTMLDivElement>;
        onkeydown?: KeyboardEventHandler<HTMLDivElement>;
    }

    export interface TestSelectGroup {
        key: string;
        label?: string;
        labelId?: string;
        labelClass?: string;
        labelAttrs?: Record<string, unknown>;
        showLabel?: boolean;
        class?: string;
        attrs?: Record<string, unknown>;
        bindRef?: boolean;
        items: TestSelectItem[];
    }

    interface Props {
        value?: string;
        onValueChange?: (value: string) => void;
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        variant?: SelectVariant;
        size?: SelectSize;
        disabled?: boolean;
        invalid?: boolean;
        required?: boolean;
        name?: string;
        id?: string;

        triggerRef?: HTMLButtonElement | null;
        triggerId?: string;
        triggerDisabled?: boolean;
        triggerInvalid?: boolean;
        triggerHideIndicator?: boolean;
        triggerClass?: string;
        triggerAttrs?: Record<string, unknown>;
        triggerChildrenMode?: "auto" | "value" | "value-snippet" | "custom";
        customTriggerText?: string;
        onTriggerKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
        onTriggerKeyUp?: KeyboardEventHandler<HTMLButtonElement>;

        valueRef?: HTMLSpanElement | null;
        valuePlaceholder?: string;
        valueShowIcon?: boolean;
        valueClass?: string;
        valueAttrs?: Record<string, unknown>;

        contentRef?: HTMLDivElement | null;
        contentId?: string;
        placement?: PopoverPlacement;
        width?: PopoverWidth;
        offset?: string;
        maxHeight?: string;
        scrollbar?: ScrollAreaScrollbar;
        animate?: boolean;
        contentClass?: string;
        contentStyle?: string;
        contentAttrs?: Record<string, unknown>;
        onContentKeyDown?: KeyboardEventHandler<HTMLDivElement>;
        onContentPointerMove?: PointerEventHandler<HTMLDivElement>;
        onContentPointerDown?: PointerEventHandler<HTMLDivElement>;

        items?: TestSelectItem[];
        groups?: TestSelectGroup[];
        showSeparator?: boolean;
        separatorClass?: string;
        separatorAttrs?: Record<string, unknown>;

        groupRef?: HTMLDivElement | null;
        groupLabelRef?: HTMLDivElement | null;
        itemRef?: HTMLDivElement | null;
        itemTextRef?: HTMLSpanElement | null;
        itemDescriptionRef?: HTMLParagraphElement | null;
        separatorRef?: HTMLDivElement | null;
    }

    let {
        value = $bindable(),
        onValueChange,
        open = $bindable(false),
        onOpenChange,
        variant = "soft",
        size = "md",
        disabled = false,
        invalid = false,
        required = false,
        name,
        id,

        triggerRef = $bindable(null),
        triggerId,
        triggerDisabled,
        triggerInvalid,
        triggerHideIndicator = false,
        triggerClass,
        triggerAttrs = {},
        triggerChildrenMode = "value",
        customTriggerText = "Custom trigger",
        onTriggerKeyDown,
        onTriggerKeyUp,

        valueRef = $bindable(null),
        valuePlaceholder,
        valueShowIcon = true,
        valueClass,
        valueAttrs = {},

        contentRef = $bindable(null),
        contentId,
        placement = "bottom-start",
        width = "min-anchor",
        offset = "8px",
        maxHeight,
        scrollbar = "hover",
        animate = true,
        contentClass,
        contentStyle,
        contentAttrs = {},
        onContentKeyDown,
        onContentPointerMove,
        onContentPointerDown,

        items = [],
        groups = [],
        showSeparator = false,
        separatorClass,
        separatorAttrs = {},

        groupRef = $bindable(null),
        groupLabelRef = $bindable(null),
        itemRef = $bindable(null),
        itemTextRef = $bindable(null),
        itemDescriptionRef = $bindable(null),
        separatorRef = $bindable(null),
    }: Props = $props();
</script>

{#snippet renderItemInner(item: TestSelectItem)}
    {#if item.childIcon}
        <SelectItemIcon
            icon={item.childIcon}
            color={item.childIconColor}
            class={item.childIconClass}
            {...item.childIconAttrs}
        />
    {/if}
    {#if item.text !== undefined}
        {#if item.bindRef}
            <SelectItemText bind:ref={itemTextRef} class={item.textClass} {...item.textAttrs}>
                {item.text}
            </SelectItemText>
        {:else}
            <SelectItemText class={item.textClass} {...item.textAttrs}>
                {item.text}
            </SelectItemText>
        {/if}
    {/if}
    {#if item.plainText !== undefined}
        {item.plainText}
    {/if}
    {#if item.description !== undefined}
        {#if item.bindRef}
            <SelectItemDescription
                bind:ref={itemDescriptionRef}
                class={item.descriptionClass}
                {...item.descriptionAttrs}
            >
                {item.description}
            </SelectItemDescription>
        {:else}
            <SelectItemDescription class={item.descriptionClass} {...item.descriptionAttrs}>
                {item.description}
            </SelectItemDescription>
        {/if}
    {/if}
{/snippet}

{#snippet renderItem(item: TestSelectItem)}
    {#if item.bindRef}
        <SelectItem
            bind:ref={itemRef}
            value={item.value}
            label={item.label}
            icon={item.icon}
            disabled={item.disabled}
            hideIndicator={item.hideIndicator}
            class={item.class}
            onclick={item.onclick}
            onpointerup={item.onpointerup}
            onkeydown={item.onkeydown}
            {...item.attrs}
        >
            {@render renderItemInner(item)}
        </SelectItem>
    {:else}
        <SelectItem
            value={item.value}
            label={item.label}
            icon={item.icon}
            disabled={item.disabled}
            hideIndicator={item.hideIndicator}
            class={item.class}
            onclick={item.onclick}
            onpointerup={item.onpointerup}
            onkeydown={item.onkeydown}
            {...item.attrs}
        >
            {@render renderItemInner(item)}
        </SelectItem>
    {/if}
{/snippet}

{#snippet renderGroupContent(group: TestSelectGroup)}
    {#if group.showLabel !== false && group.label !== undefined}
        {#if group.bindRef}
            <SelectGroupLabel bind:ref={groupLabelRef} id={group.labelId} class={group.labelClass} {...group.labelAttrs}>
                {group.label}
            </SelectGroupLabel>
        {:else}
            <SelectGroupLabel id={group.labelId} class={group.labelClass} {...group.labelAttrs}>
                {group.label}
            </SelectGroupLabel>
        {/if}
    {/if}
    {#each group.items as item (item.value)}
        {@render renderItem(item)}
    {/each}
{/snippet}

<Select
    bind:value
    {onValueChange}
    bind:open
    {onOpenChange}
    {variant}
    {size}
    {disabled}
    {invalid}
    {required}
    {name}
    {id}
>
    {#if triggerChildrenMode === "auto"}
        <SelectTrigger
            bind:ref={triggerRef}
            id={triggerId}
            disabled={triggerDisabled}
            invalid={triggerInvalid}
            hideIndicator={triggerHideIndicator}
            class={triggerClass}
            onkeydown={onTriggerKeyDown}
            onkeyup={onTriggerKeyUp}
            {...triggerAttrs}
        />
    {:else}
        <SelectTrigger
            bind:ref={triggerRef}
            id={triggerId}
            disabled={triggerDisabled}
            invalid={triggerInvalid}
            hideIndicator={triggerHideIndicator}
            class={triggerClass}
            onkeydown={onTriggerKeyDown}
            onkeyup={onTriggerKeyUp}
            {...triggerAttrs}
        >
            {#if triggerChildrenMode === "custom"}
                <span data-testid="custom-trigger">{customTriggerText}</span>
            {:else if triggerChildrenMode === "value-snippet"}
                <SelectValue
                    bind:ref={valueRef}
                    placeholder={valuePlaceholder}
                    showIcon={valueShowIcon}
                    class={valueClass}
                    {...valueAttrs}
                >
                    {#snippet children(selected)}
                        <span data-testid="custom-value">
                            {selected ? `${selected.value}:${selected.label}` : "None chosen"}
                        </span>
                    {/snippet}
                </SelectValue>
            {:else}
                <SelectValue
                    bind:ref={valueRef}
                    placeholder={valuePlaceholder}
                    showIcon={valueShowIcon}
                    class={valueClass}
                    {...valueAttrs}
                />
            {/if}
        </SelectTrigger>
    {/if}

    <SelectContent
        bind:ref={contentRef}
        id={contentId}
        {placement}
        {width}
        {offset}
        {maxHeight}
        {scrollbar}
        {animate}
        class={contentClass}
        style={contentStyle}
        onkeydown={onContentKeyDown}
        onpointermove={onContentPointerMove}
        onpointerdown={onContentPointerDown}
        {...contentAttrs}
    >
        {#each items as item (item.value)}
            {@render renderItem(item)}
        {/each}

        {#each groups as group, index (group.key)}
            {#if index > 0 && showSeparator}
                {#if index === 1}
                    <SelectSeparator bind:ref={separatorRef} class={separatorClass} {...separatorAttrs} />
                {:else}
                    <SelectSeparator class={separatorClass} {...separatorAttrs} />
                {/if}
            {/if}

            {#if group.bindRef}
                <SelectGroup bind:ref={groupRef} class={group.class} {...group.attrs}>
                    {@render renderGroupContent(group)}
                </SelectGroup>
            {:else}
                <SelectGroup class={group.class} {...group.attrs}>
                    {@render renderGroupContent(group)}
                </SelectGroup>
            {/if}
        {/each}

        {#if groups.length === 0 && showSeparator}
            <SelectSeparator bind:ref={separatorRef} class={separatorClass} {...separatorAttrs} />
        {/if}
    </SelectContent>
</Select>
