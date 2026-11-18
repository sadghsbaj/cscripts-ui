<script lang="ts">
    import type { Component } from "svelte";
    import type { FocusEventHandler, KeyboardEventHandler, PointerEventHandler } from "svelte/elements";

    import type { PopoverPlacement, PopoverWidth } from "../popover/index.ts";
    import {
        Dropdown,
        DropdownCheckboxItem,
        DropdownContent,
        DropdownFooter,
        DropdownGroup,
        DropdownGroupLabel,
        DropdownHeader,
        DropdownItem,
        DropdownItemDescription,
        DropdownItemShortcut,
        DropdownItemText,
        DropdownRadioGroup,
        DropdownRadioItem,
        DropdownSeparator,
        dropdownTrigger,
        type DropdownIconComponentProps,
        type DropdownSize,
        type DropdownTriggerOn,
    } from "./index.ts";

    export interface TestDropdownItem {
        key: string;
        text?: string;
        description?: string;
        shortcut?: string;
        label?: string;
        href?: string;
        icon?: Component<DropdownIconComponentProps>;
        negative?: boolean;
        disabled?: boolean;
        closeOnSelect?: boolean;
        onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    }

    export interface TestDropdownGroup {
        key: string;
        label?: string;
        items: TestDropdownItem[];
    }

    export interface TestDropdownRadioItem {
        value: string;
        text: string;
        disabled?: boolean;
        closeOnSelect?: boolean;
        onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    }

    interface Props {
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        size?: DropdownSize;
        disabled?: boolean;
        id?: string;

        triggerRef?: HTMLButtonElement | null;
        triggerId?: string;
        triggerDisabled?: boolean;
        triggerOn?: DropdownTriggerOn;
        triggerEnabled?: boolean | (() => boolean);
        triggerText?: string;

        contentRef?: HTMLDivElement | null;
        contentId?: string;
        placement?: PopoverPlacement;
        width?: PopoverWidth;
        offset?: string;
        maxHeight?: string;
        animate?: boolean;
        onContentKeyDown?: KeyboardEventHandler<HTMLDivElement>;
        onContentPointerMove?: PointerEventHandler<HTMLDivElement>;
        onContentPointerDown?: PointerEventHandler<HTMLDivElement>;
        onContentFocusOut?: FocusEventHandler<HTMLDivElement>;

        pinnedHeaderText?: string;
        pinnedFooterText?: string;
        scrollableHeaderText?: string;
        scrollableFooterText?: string;

        items?: TestDropdownItem[];
        groups?: TestDropdownGroup[];
        showSeparator?: boolean;

        showCheckboxItem?: boolean;
        checkboxChecked?: boolean;
        onCheckedChange?: (checked: boolean) => void;
        checkboxIndeterminate?: boolean;
        checkboxDisabled?: boolean;
        checkboxCloseOnSelect?: boolean;
        checkboxLabel?: string;
        onCheckboxSelect?: (event: MouseEvent | KeyboardEvent) => void;

        radioValue?: string;
        onRadioValueChange?: (value: string) => void;
        radioItems?: TestDropdownRadioItem[];

        customWidgets?: boolean;
        outsideButton?: boolean;
    }

    let {
        open = $bindable(false),
        onOpenChange,
        size = "md",
        disabled = false,
        id,

        triggerRef = $bindable(null),
        triggerId,
        triggerDisabled = false,
        triggerOn = "pointerdown",
        triggerEnabled = true,
        triggerText = "Actions",

        contentRef = $bindable(null),
        contentId,
        placement = "bottom-start",
        width = "content",
        offset = "8px",
        maxHeight,
        animate = false,
        onContentKeyDown,
        onContentPointerMove,
        onContentPointerDown,
        onContentFocusOut,

        pinnedHeaderText,
        pinnedFooterText,
        scrollableHeaderText,
        scrollableFooterText,

        items = [],
        groups = [],
        showSeparator = false,

        showCheckboxItem = false,
        checkboxChecked = $bindable(false),
        onCheckedChange,
        checkboxIndeterminate = false,
        checkboxDisabled = false,
        checkboxCloseOnSelect = false,
        checkboxLabel = "Show grid",
        onCheckboxSelect,

        radioValue = $bindable(),
        onRadioValueChange,
        radioItems = [],

        customWidgets = false,
        outsideButton = false,
    }: Props = $props();
</script>

{#snippet renderActionItem(item: TestDropdownItem)}
    <DropdownItem
        data-item-key={item.key}
        href={item.href}
        icon={item.icon}
        label={item.label}
        negative={item.negative}
        disabled={item.disabled}
        closeOnSelect={item.closeOnSelect}
        onSelect={item.onSelect}
    >
        {#if item.text !== undefined}
            <DropdownItemText>{item.text}</DropdownItemText>
        {/if}
        {#if item.description !== undefined}
            <DropdownItemDescription>{item.description}</DropdownItemDescription>
        {/if}
        {#if item.shortcut !== undefined}
            <DropdownItemShortcut>{item.shortcut}</DropdownItemShortcut>
        {/if}
    </DropdownItem>
{/snippet}

{#snippet pinnedHeader()}
    {#if pinnedHeaderText}
        <DropdownHeader data-testid="pinned-header">{pinnedHeaderText}</DropdownHeader>
    {/if}
{/snippet}

{#snippet pinnedFooter()}
    {#if pinnedFooterText}
        <DropdownFooter data-testid="pinned-footer">{pinnedFooterText}</DropdownFooter>
    {/if}
{/snippet}

<Dropdown bind:open {onOpenChange} {size} {disabled} {id}>
    <button
        bind:this={triggerRef}
        type="button"
        id={triggerId}
        disabled={triggerDisabled}
        class="test-dropdown-trigger"
        {@attach dropdownTrigger({ triggerOn, enabled: triggerEnabled })}
    >
        {triggerText}
    </button>

    <DropdownContent
        bind:ref={contentRef}
        id={contentId}
        {placement}
        {width}
        {offset}
        {maxHeight}
        {animate}
        header={pinnedHeaderText ? pinnedHeader : undefined}
        footer={pinnedFooterText ? pinnedFooter : undefined}
        onkeydown={onContentKeyDown}
        onpointermove={onContentPointerMove}
        onpointerdown={onContentPointerDown}
        onfocusout={onContentFocusOut}
    >
        {#if scrollableHeaderText}
            <DropdownHeader data-testid="scrollable-header">{scrollableHeaderText}</DropdownHeader>
        {/if}

        {#if customWidgets}
            <div class="test-custom-widgets">
                <input type="text" data-testid="custom-input" aria-label="Filter actions" />
                <button type="button" role="switch" aria-checked="false" data-testid="custom-switch">
                    Notifications
                </button>
            </div>
        {/if}

        {#each items as item (item.key)}
            {@render renderActionItem(item)}
        {/each}

        {#if showSeparator}
            <DropdownSeparator />
        {/if}

        {#each groups as group (group.key)}
            <DropdownGroup data-group-key={group.key}>
                {#if group.label}
                    <DropdownGroupLabel>{group.label}</DropdownGroupLabel>
                {/if}
                {#each group.items as item (item.key)}
                    {@render renderActionItem(item)}
                {/each}
            </DropdownGroup>
        {/each}

        {#if showCheckboxItem}
            <DropdownCheckboxItem
                bind:checked={checkboxChecked}
                {onCheckedChange}
                indeterminate={checkboxIndeterminate}
                disabled={checkboxDisabled}
                closeOnSelect={checkboxCloseOnSelect}
                onSelect={onCheckboxSelect}
            >
                <DropdownItemText>{checkboxLabel}</DropdownItemText>
            </DropdownCheckboxItem>
        {/if}

        {#if radioItems.length > 0}
            <DropdownRadioGroup bind:value={radioValue} onValueChange={onRadioValueChange}>
                {#each radioItems as radio (radio.value)}
                    <DropdownRadioItem
                        value={radio.value}
                        disabled={radio.disabled}
                        closeOnSelect={radio.closeOnSelect}
                        onSelect={radio.onSelect}
                    >
                        <DropdownItemText>{radio.text}</DropdownItemText>
                    </DropdownRadioItem>
                {/each}
            </DropdownRadioGroup>
        {/if}

        {#if scrollableFooterText}
            <DropdownFooter data-testid="scrollable-footer">{scrollableFooterText}</DropdownFooter>
        {/if}
    </DropdownContent>
</Dropdown>

{#if outsideButton}
    <button type="button" data-testid="outside-button">Outside</button>
{/if}
