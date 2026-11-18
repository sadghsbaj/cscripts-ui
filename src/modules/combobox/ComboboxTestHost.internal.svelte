<script lang="ts">
    import type { Component } from "svelte";
    import type {
        FocusEventHandler,
        FormEventHandler,
        KeyboardEventHandler,
        MouseEventHandler,
        PointerEventHandler,
    } from "svelte/elements";

    import type { PopoverPlacement, PopoverWidth } from "../popover/index.ts";
    import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";
    import {
        Combobox,
        ComboboxClear,
        ComboboxContent,
        ComboboxControl,
        ComboboxEmpty,
        ComboboxGroup,
        ComboboxGroupLabel,
        ComboboxIcon,
        ComboboxInput,
        ComboboxItem,
        ComboboxItemDescription,
        ComboboxItemIcon,
        ComboboxItemText,
        ComboboxSeparator,
        ComboboxTrigger,
        type ComboboxFilterFn,
        type ComboboxIconComponentProps,
        type ComboboxSize,
        type ComboboxVariant,
    } from "./index.ts";

    export interface TestComboboxItem {
        value: string;
        label?: string;
        keywords?: string[];
        text?: string;
        plainText?: string;
        description?: string;
        icon?: Component<ComboboxIconComponentProps>;
        childIcon?: Component<ComboboxIconComponentProps>;
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
        onpointerdown?: PointerEventHandler<HTMLDivElement>;
        onpointerup?: PointerEventHandler<HTMLDivElement>;
    }

    export interface TestComboboxGroup {
        key: string;
        label?: string;
        labelId?: string;
        labelClass?: string;
        labelAttrs?: Record<string, unknown>;
        showLabel?: boolean;
        class?: string;
        attrs?: Record<string, unknown>;
        bindRef?: boolean;
        items: TestComboboxItem[];
    }

    interface Props {
        value?: string;
        onValueChange?: (value: string | undefined) => void;
        inputValue?: string;
        onInputValueChange?: (inputValue: string) => void;
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        variant?: ComboboxVariant;
        size?: ComboboxSize;
        filter?: boolean | ComboboxFilterFn;
        allowCustomValue?: boolean;
        openOnFocus?: boolean;
        disabled?: boolean;
        readonly?: boolean;
        invalid?: boolean;
        required?: boolean;
        name?: string;
        id?: string;

        controlRef?: HTMLDivElement | null;
        controlId?: string;
        controlDisabled?: boolean;
        controlReadonly?: boolean;
        controlInvalid?: boolean;
        controlClass?: string;
        controlAttrs?: Record<string, unknown>;
        onControlMouseDown?: MouseEventHandler<HTMLDivElement>;

        leadingIcon?: Component<ComboboxIconComponentProps>;
        leadingIconColor?: string;
        leadingIconClass?: string;

        inputRef?: HTMLInputElement | null;
        inputId?: string;
        inputDisabled?: boolean;
        inputReadonly?: boolean;
        inputInvalid?: boolean;
        placeholder?: string;
        inputClass?: string;
        inputAttrs?: Record<string, unknown>;
        onInput?: FormEventHandler<HTMLInputElement>;
        onInputKeyDown?: KeyboardEventHandler<HTMLInputElement>;
        onInputFocus?: FocusEventHandler<HTMLInputElement>;
        onInputBlur?: FocusEventHandler<HTMLInputElement>;

        showClear?: boolean;
        clearRef?: HTMLButtonElement | null;
        clearDisabled?: boolean;
        clearIcon?: Component<ComboboxIconComponentProps>;
        clearClass?: string;
        clearAttrs?: Record<string, unknown>;

        showTrigger?: boolean;
        triggerRef?: HTMLButtonElement | null;
        triggerDisabled?: boolean;
        triggerClass?: string;
        triggerAttrs?: Record<string, unknown>;
        customTriggerText?: string;

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
        onContentPointerMove?: PointerEventHandler<HTMLDivElement>;
        onContentPointerDown?: PointerEventHandler<HTMLDivElement>;

        showEmpty?: boolean;
        emptyRef?: HTMLDivElement | null;
        emptyText?: string;
        emptyClass?: string;
        emptyAttrs?: Record<string, unknown>;

        items?: TestComboboxItem[];
        groups?: TestComboboxGroup[];
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
        inputValue = $bindable(""),
        onInputValueChange,
        open = $bindable(false),
        onOpenChange,
        variant = "soft",
        size = "md",
        filter = true,
        allowCustomValue = false,
        openOnFocus = false,
        disabled = false,
        readonly = false,
        invalid = false,
        required = false,
        name,
        id,

        controlRef = $bindable(null),
        controlId,
        controlDisabled,
        controlReadonly,
        controlInvalid,
        controlClass,
        controlAttrs = {},
        onControlMouseDown,

        leadingIcon,
        leadingIconColor,
        leadingIconClass,

        inputRef = $bindable(null),
        inputId,
        inputDisabled,
        inputReadonly,
        inputInvalid,
        placeholder,
        inputClass,
        inputAttrs = {},
        onInput,
        onInputKeyDown,
        onInputFocus,
        onInputBlur,

        showClear = true,
        clearRef = $bindable(null),
        clearDisabled,
        clearIcon,
        clearClass,
        clearAttrs = {},

        showTrigger = true,
        triggerRef = $bindable(null),
        triggerDisabled,
        triggerClass,
        triggerAttrs = {},
        customTriggerText,

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
        onContentPointerMove,
        onContentPointerDown,

        showEmpty = true,
        emptyRef = $bindable(null),
        emptyText,
        emptyClass,
        emptyAttrs = {},

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

{#snippet renderItemInner(item: TestComboboxItem)}
    {#if item.childIcon}
        <ComboboxItemIcon
            icon={item.childIcon}
            color={item.childIconColor}
            class={item.childIconClass}
            {...item.childIconAttrs}
        />
    {/if}
    {#if item.text !== undefined}
        {#if item.bindRef}
            <ComboboxItemText bind:ref={itemTextRef} class={item.textClass} {...item.textAttrs}>
                {item.text}
            </ComboboxItemText>
        {:else}
            <ComboboxItemText class={item.textClass} {...item.textAttrs}>
                {item.text}
            </ComboboxItemText>
        {/if}
    {/if}
    {#if item.plainText !== undefined}
        {item.plainText}
    {/if}
    {#if item.description !== undefined}
        {#if item.bindRef}
            <ComboboxItemDescription
                bind:ref={itemDescriptionRef}
                class={item.descriptionClass}
                {...item.descriptionAttrs}
            >
                {item.description}
            </ComboboxItemDescription>
        {:else}
            <ComboboxItemDescription class={item.descriptionClass} {...item.descriptionAttrs}>
                {item.description}
            </ComboboxItemDescription>
        {/if}
    {/if}
{/snippet}

{#snippet renderItem(item: TestComboboxItem)}
    {#if item.bindRef}
        <ComboboxItem
            bind:ref={itemRef}
            value={item.value}
            label={item.label}
            keywords={item.keywords}
            icon={item.icon}
            disabled={item.disabled}
            hideIndicator={item.hideIndicator}
            class={item.class}
            onclick={item.onclick}
            onpointerdown={item.onpointerdown}
            onpointerup={item.onpointerup}
            {...item.attrs}
        >
            {@render renderItemInner(item)}
        </ComboboxItem>
    {:else}
        <ComboboxItem
            value={item.value}
            label={item.label}
            keywords={item.keywords}
            icon={item.icon}
            disabled={item.disabled}
            hideIndicator={item.hideIndicator}
            class={item.class}
            onclick={item.onclick}
            onpointerdown={item.onpointerdown}
            onpointerup={item.onpointerup}
            {...item.attrs}
        >
            {@render renderItemInner(item)}
        </ComboboxItem>
    {/if}
{/snippet}

<Combobox
    bind:value
    {onValueChange}
    bind:inputValue
    {onInputValueChange}
    bind:open
    {onOpenChange}
    {variant}
    {size}
    {filter}
    {allowCustomValue}
    {openOnFocus}
    {disabled}
    {readonly}
    {invalid}
    {required}
    {name}
    {id}
>
    <ComboboxControl
        bind:ref={controlRef}
        id={controlId}
        disabled={controlDisabled}
        readonly={controlReadonly}
        invalid={controlInvalid}
        class={controlClass}
        onmousedown={onControlMouseDown}
        {...controlAttrs}
    >
        {#if leadingIcon}
            <ComboboxIcon icon={leadingIcon} color={leadingIconColor} class={leadingIconClass} />
        {/if}
        <ComboboxInput
            bind:ref={inputRef}
            id={inputId}
            disabled={inputDisabled}
            readonly={inputReadonly}
            invalid={inputInvalid}
            {placeholder}
            class={inputClass}
            oninput={onInput}
            onkeydown={onInputKeyDown}
            onfocus={onInputFocus}
            onblur={onInputBlur}
            {...inputAttrs}
        />
        {#if showClear}
            <ComboboxClear
                bind:ref={clearRef}
                icon={clearIcon}
                disabled={clearDisabled}
                class={clearClass}
                {...clearAttrs}
            />
        {/if}
        {#if showTrigger}
            <ComboboxTrigger
                bind:ref={triggerRef}
                disabled={triggerDisabled}
                class={triggerClass}
                {...triggerAttrs}
            >
                {#if customTriggerText !== undefined}
                    <span>{customTriggerText}</span>
                {/if}
            </ComboboxTrigger>
        {/if}
    </ComboboxControl>

    <ComboboxContent
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
        onpointermove={onContentPointerMove}
        onpointerdown={onContentPointerDown}
        {...contentAttrs}
    >
        {#if showEmpty}
            {#if emptyText !== undefined}
                <ComboboxEmpty bind:ref={emptyRef} class={emptyClass} {...emptyAttrs}>
                    {emptyText}
                </ComboboxEmpty>
            {:else}
                <ComboboxEmpty bind:ref={emptyRef} class={emptyClass} {...emptyAttrs} />
            {/if}
        {/if}

        {#if groups.length > 0}
            {#each groups as group, index (group.key)}
                {#if index > 0 && showSeparator}
                    <ComboboxSeparator bind:ref={separatorRef} class={separatorClass} {...separatorAttrs} />
                {/if}

                {#if group.bindRef}
                    <ComboboxGroup bind:ref={groupRef} class={group.class} {...group.attrs}>
                        {#if group.showLabel !== false && group.label !== undefined}
                            <ComboboxGroupLabel
                                bind:ref={groupLabelRef}
                                id={group.labelId}
                                class={group.labelClass}
                                {...group.labelAttrs}
                            >
                                {group.label}
                            </ComboboxGroupLabel>
                        {/if}
                        {#each group.items as item (item.value)}
                            {@render renderItem(item)}
                        {/each}
                    </ComboboxGroup>
                {:else}
                    <ComboboxGroup class={group.class} {...group.attrs}>
                        {#if group.showLabel !== false && group.label !== undefined}
                            <ComboboxGroupLabel id={group.labelId} class={group.labelClass} {...group.labelAttrs}>
                                {group.label}
                            </ComboboxGroupLabel>
                        {/if}
                        {#each group.items as item (item.value)}
                            {@render renderItem(item)}
                        {/each}
                    </ComboboxGroup>
                {/if}
            {/each}
        {:else}
            {#each items as item (item.value)}
                {@render renderItem(item)}
            {/each}
        {/if}
    </ComboboxContent>
</Combobox>
