<script lang="ts">
    import type { Component } from "svelte";
    import type { FocusEventHandler, KeyboardEventHandler, MouseEventHandler, PointerEventHandler } from "svelte/elements";

    import type { PopoverPlacement } from "../popover/index.ts";
    import {
        ContextMenu,
        ContextMenuCheckboxItem,
        ContextMenuContent,
        ContextMenuFooter,
        ContextMenuGroup,
        ContextMenuGroupLabel,
        ContextMenuHeader,
        ContextMenuItem,
        ContextMenuItemDescription,
        ContextMenuItemIcon,
        ContextMenuItemShortcut,
        ContextMenuItemText,
        ContextMenuRadioGroup,
        ContextMenuRadioItem,
        ContextMenuSeparator,
        contextMenuTrigger,
        type ContextMenuIconComponentProps,
        type ContextMenuSize,
    } from "./index.ts";

    export interface TestContextMenuItem {
        key: string;
        text?: string;
        description?: string;
        shortcut?: string;
        label?: string;
        href?: string;
        icon?: Component<ContextMenuIconComponentProps>;
        slotIcon?: Component<ContextMenuIconComponentProps>;
        negative?: boolean;
        disabled?: boolean;
        closeOnSelect?: boolean;
        onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    }

    export interface TestContextMenuGroup {
        key: string;
        label?: string;
        items: TestContextMenuItem[];
    }

    export interface TestContextMenuRadioItem {
        value: string;
        text: string;
        disabled?: boolean;
        closeOnSelect?: boolean;
        onSelect?: (event: MouseEvent | KeyboardEvent) => void;
    }

    interface Props {
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        size?: ContextMenuSize;
        disabled?: boolean;
        id?: string;

        triggerRef?: HTMLDivElement | null;
        triggerId?: string;
        triggerEnabled?: boolean | (() => boolean);
        triggerText?: string;
        onTriggerOpen?: (event: MouseEvent | KeyboardEvent) => void;
        showFocusableTriggerChild?: boolean;

        showSecondTrigger?: boolean;
        secondTriggerRef?: HTMLDivElement | null;
        secondTriggerId?: string;
        secondTriggerEnabled?: boolean | (() => boolean);
        secondTriggerText?: string;
        onSecondTriggerOpen?: (event: MouseEvent | KeyboardEvent) => void;

        contentRef?: HTMLDivElement | null;
        contentId?: string;
        placement?: PopoverPlacement;
        offset?: string;
        maxHeight?: string;
        animate?: boolean;
        ariaLabel?: string;
        ariaLabelledby?: string;
        onContentKeyDown?: KeyboardEventHandler<HTMLDivElement>;
        onContentPointerMove?: PointerEventHandler<HTMLDivElement>;
        onContentPointerDown?: PointerEventHandler<HTMLDivElement>;
        onContentFocusOut?: FocusEventHandler<HTMLDivElement>;
        onContentContextMenu?: MouseEventHandler<HTMLDivElement>;

        pinnedHeaderText?: string;
        pinnedFooterText?: string;
        scrollableHeaderText?: string;
        scrollableFooterText?: string;

        items?: TestContextMenuItem[];
        groups?: TestContextMenuGroup[];
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
        radioItems?: TestContextMenuRadioItem[];

        customWidgets?: boolean;
        outsideButton?: boolean;
        externalHeadingId?: string;
    }

    let {
        open = $bindable(false),
        onOpenChange,
        size = "md",
        disabled = false,
        id,

        triggerRef = $bindable(null),
        triggerId,
        triggerEnabled = true,
        triggerText = "Canvas Item",
        onTriggerOpen,
        showFocusableTriggerChild = false,

        showSecondTrigger = false,
        secondTriggerRef = $bindable(null),
        secondTriggerId,
        secondTriggerEnabled = true,
        secondTriggerText = "Second Item",
        onSecondTriggerOpen,

        contentRef = $bindable(null),
        contentId,
        placement = "bottom-start",
        offset = "2px",
        maxHeight,
        animate = false,
        ariaLabel,
        ariaLabelledby,
        onContentKeyDown,
        onContentPointerMove,
        onContentPointerDown,
        onContentFocusOut,
        onContentContextMenu,

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
        externalHeadingId,
    }: Props = $props();
</script>

{#snippet renderActionItem(item: TestContextMenuItem)}
    <ContextMenuItem
        data-item-key={item.key}
        href={item.href}
        icon={item.icon}
        label={item.label}
        negative={item.negative}
        disabled={item.disabled}
        closeOnSelect={item.closeOnSelect}
        onSelect={item.onSelect}
    >
        {#if item.slotIcon}
            <ContextMenuItemIcon icon={item.slotIcon} />
        {/if}
        {#if item.text !== undefined}
            <ContextMenuItemText>{item.text}</ContextMenuItemText>
        {/if}
        {#if item.description !== undefined}
            <ContextMenuItemDescription>{item.description}</ContextMenuItemDescription>
        {/if}
        {#if item.shortcut !== undefined}
            <ContextMenuItemShortcut>{item.shortcut}</ContextMenuItemShortcut>
        {/if}
    </ContextMenuItem>
{/snippet}

{#snippet pinnedHeader()}
    {#if pinnedHeaderText}
        <ContextMenuHeader data-testid="pinned-header">{pinnedHeaderText}</ContextMenuHeader>
    {/if}
{/snippet}

{#snippet pinnedFooter()}
    {#if pinnedFooterText}
        <ContextMenuFooter data-testid="pinned-footer">{pinnedFooterText}</ContextMenuFooter>
    {/if}
{/snippet}

{#if externalHeadingId}
    <h2 id={externalHeadingId}>External Menu Heading</h2>
{/if}

<ContextMenu bind:open {onOpenChange} {size} {disabled} {id}>
    <div
        bind:this={triggerRef}
        id={triggerId}
        role="region"
        aria-label={triggerText}
        tabindex="-1"
        class="test-context-menu-trigger"
        {@attach contextMenuTrigger({ enabled: triggerEnabled, onOpen: onTriggerOpen })}
    >
        <span>{triggerText}</span>
        {#if showFocusableTriggerChild}
            <button type="button" data-testid="trigger-child-button">Inner Button</button>
        {/if}
    </div>

    {#if showSecondTrigger}
        <div
            bind:this={secondTriggerRef}
            id={secondTriggerId}
            role="region"
            aria-label={secondTriggerText}
            tabindex="-1"
            class="test-context-menu-trigger-second"
            {@attach contextMenuTrigger({ enabled: secondTriggerEnabled, onOpen: onSecondTriggerOpen })}
        >
            <span>{secondTriggerText}</span>
        </div>
    {/if}

    <ContextMenuContent
        bind:ref={contentRef}
        id={contentId}
        {placement}
        {offset}
        {maxHeight}
        {animate}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        header={pinnedHeaderText ? pinnedHeader : undefined}
        footer={pinnedFooterText ? pinnedFooter : undefined}
        onkeydown={onContentKeyDown}
        onpointermove={onContentPointerMove}
        onpointerdown={onContentPointerDown}
        onfocusout={onContentFocusOut}
        oncontextmenu={onContentContextMenu}
    >
        {#if scrollableHeaderText}
            <ContextMenuHeader data-testid="scrollable-header">{scrollableHeaderText}</ContextMenuHeader>
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
            <ContextMenuSeparator />
        {/if}

        {#each groups as group (group.key)}
            <ContextMenuGroup data-group-key={group.key}>
                {#if group.label}
                    <ContextMenuGroupLabel>{group.label}</ContextMenuGroupLabel>
                {/if}
                {#each group.items as item (item.key)}
                    {@render renderActionItem(item)}
                {/each}
            </ContextMenuGroup>
        {/each}

        {#if showCheckboxItem}
            <ContextMenuCheckboxItem
                bind:checked={checkboxChecked}
                {onCheckedChange}
                indeterminate={checkboxIndeterminate}
                disabled={checkboxDisabled}
                closeOnSelect={checkboxCloseOnSelect}
                onSelect={onCheckboxSelect}
            >
                <ContextMenuItemText>{checkboxLabel}</ContextMenuItemText>
            </ContextMenuCheckboxItem>
        {/if}

        {#if radioItems.length > 0}
            <ContextMenuRadioGroup bind:value={radioValue} onValueChange={onRadioValueChange}>
                {#each radioItems as radio (radio.value)}
                    <ContextMenuRadioItem
                        value={radio.value}
                        disabled={radio.disabled}
                        closeOnSelect={radio.closeOnSelect}
                        onSelect={radio.onSelect}
                    >
                        <ContextMenuItemText>{radio.text}</ContextMenuItemText>
                    </ContextMenuRadioItem>
                {/each}
            </ContextMenuRadioGroup>
        {/if}

        {#if scrollableFooterText}
            <ContextMenuFooter data-testid="scrollable-footer">{scrollableFooterText}</ContextMenuFooter>
        {/if}
    </ContextMenuContent>
</ContextMenu>

{#if outsideButton}
    <button type="button" data-testid="outside-button">Outside</button>
{/if}
