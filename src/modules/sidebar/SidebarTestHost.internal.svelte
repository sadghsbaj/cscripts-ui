<script lang="ts">
    import { Folder, Home, MoreHorizontal, Settings } from "@lucide/svelte";
    import type { Attachment } from "svelte/attachments";
    import type { ClassValue } from "svelte/elements";
    import type { OverlayVariant } from "../overlay/index.ts";
    import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";
    import type { ScrollFadeSize } from "../scroll-fade/index.ts";
    import {
        Sidebar,
        SidebarBody,
        SidebarFooter,
        SidebarGroup,
        SidebarGroupContent,
        SidebarGroupTrigger,
        SidebarHeader,
        SidebarItem,
        SidebarItemActions,
        SidebarItemIcon,
        SidebarItemLabel,
        SidebarItemRow,
        SidebarPinned,
        SidebarSection,
        SidebarSectionHeader,
        SidebarSectionLabel,
        SidebarSubheader,
        SidebarToggle,
        type SidebarAriaCurrent,
        type SidebarBehavior,
        type SidebarCollapseMode,
        type SidebarElement,
        type SidebarSectionLabelElement,
        type SidebarSide,
        type SidebarSize,
        type SidebarSubheaderRailBehavior,
        type SidebarVariant,
    } from "./index.ts";

    interface Props {
        variant?: SidebarVariant;
        size?: SidebarSize;
        as?: SidebarElement;
        side?: SidebarSide;
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        behavior?: SidebarBehavior;
        collapseMode?: SidebarCollapseMode;
        width?: "fill" | string;
        railWidth?: string;
        overlayVariant?: OverlayVariant;
        animate?: boolean;
        id?: string;
        rootClass?: ClassValue;
        rootStyle?: string;
        rootRest?: Record<string, unknown>;
        onRootRef?: (el: HTMLElement | null) => void;

        showHeader?: boolean;
        showSubheader?: boolean;
        subheaderRailBehavior?: SidebarSubheaderRailBehavior;
        showBody?: boolean;
        bodyScrollable?: boolean;
        bodyScrollbar?: ScrollAreaScrollbar;
        bodyFade?: boolean | ScrollFadeSize;
        showPinned?: boolean;
        showFooter?: boolean;

        showInsideToggle?: boolean;
        showOutsideToggle?: boolean;
        outsideToggleIconOnly?: boolean;
        outsideToggleLabel?: string;
        onOutsideToggleClick?: (
            event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }
        ) => void;

        sectionCollapsible?: boolean;
        sectionOpen?: boolean;
        onSectionOpenChange?: (open: boolean) => void;
        sectionUseHeaderWrapper?: boolean;
        sectionLabelAs?: SidebarSectionLabelElement;
        onSectionLabelClick?: (
            event: MouseEvent & { currentTarget: EventTarget & HTMLElement }
        ) => void;

        groupOpen?: boolean;
        onGroupOpenChange?: (open: boolean) => void;
        groupDisabled?: boolean;
        groupKeepMounted?: boolean;
        groupIndicatorMode?: "default" | "none" | "custom";
        groupTriggerIconOnly?: boolean;
        groupTriggerDisabled?: boolean;
        groupTriggerCurrent?: SidebarAriaCurrent;
        nestedGroupOpen?: boolean;

        itemHref?: string;
        itemCurrent?: SidebarAriaCurrent;
        itemNegative?: boolean;
        itemDisabled?: boolean;
        itemAttachment?: Attachment<HTMLElement>;
        itemRest?: Record<string, unknown>;
        onItemClick?: (
            event: MouseEvent & {
                currentTarget: EventTarget & (HTMLAnchorElement | HTMLButtonElement);
            }
        ) => void;
        actionsAlwaysVisible?: boolean;
        onActionClick?: () => void;
        onBeforeButtonClick?: () => void;
    }

    let {
        variant = "elevated",
        size = "md",
        as = "aside",
        side = "start",
        open = $bindable(true),
        onOpenChange,
        behavior = "inline",
        collapseMode = "hidden",
        width,
        railWidth,
        overlayVariant = "dim",
        animate = true,
        id = "test-sidebar",
        rootClass,
        rootStyle,
        rootRest = {},
        onRootRef,

        showHeader = true,
        showSubheader = false,
        subheaderRailBehavior = "collapse",
        showBody = true,
        bodyScrollable = true,
        bodyScrollbar = "hover",
        bodyFade = false,
        showPinned = false,
        showFooter = false,

        showInsideToggle = false,
        showOutsideToggle = false,
        outsideToggleIconOnly = true,
        outsideToggleLabel,
        onOutsideToggleClick,

        sectionCollapsible = false,
        sectionOpen = $bindable(true),
        onSectionOpenChange,
        sectionUseHeaderWrapper = false,
        sectionLabelAs = "div",
        onSectionLabelClick,

        groupOpen = $bindable(false),
        onGroupOpenChange,
        groupDisabled = false,
        groupKeepMounted = true,
        groupIndicatorMode = "default",
        groupTriggerIconOnly = false,
        groupTriggerDisabled = false,
        groupTriggerCurrent = false,
        nestedGroupOpen = $bindable(false),

        itemHref,
        itemCurrent = false,
        itemNegative = false,
        itemDisabled = false,
        itemAttachment,
        itemRest = {},
        onItemClick,
        actionsAlwaysVisible = false,
        onActionClick,
        onBeforeButtonClick,
    }: Props = $props();

    let rootRef = $state<HTMLElement | null>(null);
</script>

{#snippet customGroupIndicator({ open: isOpen }: { open: boolean })}
    <span data-testid="custom-group-indicator">{isOpen ? "OPEN" : "CLOSED"}</span>
{/snippet}

{#snippet itemBadge()}
    <span data-testid="item-badge">12</span>
{/snippet}

<button type="button" data-testid="before-sidebar-btn" onclick={onBeforeButtonClick}>
    Before
</button>

{#if showOutsideToggle}
    <SidebarToggle
        data-testid="outside-toggle"
        bind:open
        sidebarId={id}
        iconOnly={outsideToggleIconOnly}
        label={outsideToggleLabel}
        onclick={onOutsideToggleClick}
    />
{/if}

<Sidebar
    bind:ref={
        (): HTMLElement | null => rootRef,
        (el: HTMLElement | null): void => {
            rootRef = el;
            onRootRef?.(el);
        }
    }
    {variant}
    {size}
    {as}
    {side}
    bind:open
    {onOpenChange}
    {behavior}
    {collapseMode}
    {width}
    {railWidth}
    {overlayVariant}
    {animate}
    {id}
    class={rootClass}
    style={rootStyle}
    {...rootRest}
>
    {#if showHeader}
        <SidebarHeader data-testid="sidebar-header">
            <span class="test-brand">Brand</span>
            {#if showInsideToggle}
                <SidebarToggle data-testid="inside-toggle" />
            {/if}
        </SidebarHeader>
    {/if}

    {#if showSubheader}
        <SidebarSubheader data-testid="sidebar-subheader" railBehavior={subheaderRailBehavior}>
            <input type="search" data-testid="subheader-search" placeholder="Search" />
        </SidebarSubheader>
    {/if}

    {#if showBody}
        <SidebarBody
            data-testid="sidebar-body"
            scrollable={bodyScrollable}
            scrollbar={bodyScrollbar}
            fade={bodyFade}
        >
            <SidebarSection
                data-testid="sidebar-section"
                collapsible={sectionCollapsible}
                bind:open={sectionOpen}
                onOpenChange={onSectionOpenChange}
            >
                {#if sectionUseHeaderWrapper}
                    <SidebarSectionHeader data-testid="section-header">
                        <SidebarSectionLabel
                            data-testid="section-label"
                            as={sectionLabelAs}
                            onclick={onSectionLabelClick}
                        >
                            Navigation
                        </SidebarSectionLabel>
                        <button type="button" data-testid="section-header-action">Add</button>
                    </SidebarSectionHeader>
                {:else}
                    <SidebarSectionLabel
                        data-testid="section-label"
                        as={sectionLabelAs}
                        onclick={onSectionLabelClick}
                    >
                        Navigation
                    </SidebarSectionLabel>
                {/if}

                <SidebarItemRow data-testid="item-row">
                    <SidebarItem
                        data-testid="primary-item"
                        href={itemHref}
                        current={itemCurrent}
                        negative={itemNegative}
                        disabled={itemDisabled}
                        icon={Home}
                        badge={itemBadge}
                        onclick={onItemClick}
                        {@attach itemAttachment}
                        {...itemRest}
                    >
                        <SidebarItemLabel>Home</SidebarItemLabel>
                    </SidebarItem>
                    <SidebarItemActions
                        data-testid="item-actions"
                        alwaysVisible={actionsAlwaysVisible}
                    >
                        <button
                            type="button"
                            data-testid="row-action-btn"
                            onclick={onActionClick}
                            aria-label="More"
                        >
                            <MoreHorizontal />
                        </button>
                    </SidebarItemActions>
                </SidebarItemRow>

                {#if groupTriggerIconOnly}
                    <SidebarGroup
                        data-testid="sidebar-group"
                        bind:open={groupOpen}
                        onOpenChange={onGroupOpenChange}
                        disabled={groupDisabled}
                        keepMounted={groupKeepMounted}
                    >
                        <SidebarItemRow data-testid="split-group-row">
                            <SidebarItem data-testid="split-group-link" href="/projects" icon={Folder}>
                                <SidebarItemLabel>Projects</SidebarItemLabel>
                            </SidebarItem>
                            <SidebarGroupTrigger
                                data-testid="group-trigger"
                                iconOnly={true}
                                disabled={groupTriggerDisabled}
                                current={groupTriggerCurrent}
                                indicator={groupIndicatorMode === "none"
                                    ? false
                                    : groupIndicatorMode === "custom"
                                      ? customGroupIndicator
                                      : undefined}
                                aria-label="Toggle Projects"
                            />
                        </SidebarItemRow>
                        <SidebarGroupContent data-testid="group-content">
                            <SidebarItem data-testid="group-child-item" href="/projects/alpha">
                                <SidebarItemLabel>Alpha</SidebarItemLabel>
                            </SidebarItem>
                        </SidebarGroupContent>
                    </SidebarGroup>
                {:else}
                    <SidebarGroup
                        data-testid="sidebar-group"
                        bind:open={groupOpen}
                        onOpenChange={onGroupOpenChange}
                        disabled={groupDisabled}
                        keepMounted={groupKeepMounted}
                    >
                        <SidebarGroupTrigger
                            data-testid="group-trigger"
                            icon={Folder}
                            disabled={groupTriggerDisabled}
                            current={groupTriggerCurrent}
                            indicator={groupIndicatorMode === "none"
                                ? false
                                : groupIndicatorMode === "custom"
                                  ? customGroupIndicator
                                  : undefined}
                        >
                            <SidebarItemLabel>Projects</SidebarItemLabel>
                        </SidebarGroupTrigger>
                        <SidebarGroupContent data-testid="group-content">
                            <SidebarItem data-testid="group-child-item" href="/projects/alpha">
                                <SidebarItemLabel>Alpha</SidebarItemLabel>
                            </SidebarItem>

                            <SidebarGroup data-testid="nested-group" bind:open={nestedGroupOpen}>
                                <SidebarGroupTrigger data-testid="nested-group-trigger">
                                    <SidebarItemLabel>Subproject</SidebarItemLabel>
                                </SidebarGroupTrigger>
                                <SidebarGroupContent data-testid="nested-group-content">
                                    <SidebarItem data-testid="nested-child-item">
                                        <SidebarItemIcon icon={Settings} />
                                        <SidebarItemLabel>Settings</SidebarItemLabel>
                                    </SidebarItem>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarGroupContent>
                    </SidebarGroup>
                {/if}
            </SidebarSection>
        </SidebarBody>
    {/if}

    {#if showPinned}
        <SidebarPinned data-testid="sidebar-pinned">
            <SidebarItem data-testid="pinned-item">
                <SidebarItemLabel>Pinned</SidebarItemLabel>
            </SidebarItem>
        </SidebarPinned>
    {/if}

    {#if showFooter}
        <SidebarFooter data-testid="sidebar-footer">
            <span data-testid="footer-text">Footer</span>
        </SidebarFooter>
    {/if}
</Sidebar>
