<script lang="ts">
    import {
        CommandPalette,
        CommandPaletteBar,
        CommandPaletteBody,
        CommandPaletteClear,
        CommandPaletteEmpty,
        CommandPaletteFooter,
        CommandPaletteGroup,
        CommandPaletteGroupLabel,
        CommandPaletteInput,
        CommandPaletteItem,
        CommandPaletteItemDescription,
        CommandPaletteItemText,
        CommandPaletteList,
        CommandPalettePage,
        CommandPalettePreview,
        CommandPaletteScope,
        CommandPaletteWidget,
        type CommandPaletteCloseReason,
        type CommandPaletteFilterFn,
        type CommandPalettePlugin,
        type CommandPalettePushPageOptions,
        type CommandPaletteRegistry,
        type CommandPaletteShortcutConfig,
        type CommandPaletteSize,
    } from "./index.ts";

    export interface TestPaletteItem {
        value: string;
        label?: string;
        text?: string;
        description?: string;
        keywords?: readonly string[];
        disabled?: boolean;
        negative?: boolean;
        href?: string;
        closeOnSelect?: boolean;
        onSelect?: (event: MouseEvent | KeyboardEvent) => void;
        pushPage?: { id: string; options?: CommandPalettePushPageOptions };
    }

    export interface TestPaletteGroup {
        key: string;
        label?: string;
        items: readonly TestPaletteItem[];
    }

    export interface TestPalettePage {
        value: string;
        label?: string;
        filter?: boolean | CommandPaletteFilterFn;
        items?: readonly TestPaletteItem[];
        widget?: boolean;
        external?: boolean;
    }

    interface Props {
        open?: boolean;
        onOpenChange?: (open: boolean) => void;
        size?: CommandPaletteSize;
        inputValue?: string;
        onInputValueChange?: (inputValue: string) => void;
        highlightedValue?: string | undefined;
        onHighlightedValueChange?: (value: string | undefined) => void;
        pages?: string[];
        onPagesChange?: (pages: string[]) => void;
        filter?: boolean | CommandPaletteFilterFn;
        loop?: boolean;
        resetOnClose?: boolean;
        popPageOnEscape?: boolean;
        popPageOnBackspace?: boolean;
        shortcut?: boolean | CommandPaletteShortcutConfig;
        registry?: CommandPaletteRegistry;
        plugins?: readonly CommandPalettePlugin[];
        dismissible?: boolean;
        closeOnEscape?: boolean;
        focusTrap?: boolean;
        onBeforeClose?: (reason: CommandPaletteCloseReason) => boolean | void | Promise<boolean | void>;
        onClose?: (reason: CommandPaletteCloseReason) => void;
        id?: string;

        showBar?: boolean;
        barShowScope?: boolean;
        manualScope?: boolean;
        manualScopeLabel?: string;
        showClear?: boolean;
        showList?: boolean;
        showEmpty?: boolean;
        emptyText?: string;
        showWidget?: boolean;
        showPreview?: boolean;
        previewText?: string;
        showFooter?: boolean;
        footerText?: string;
        items?: readonly TestPaletteItem[];
        groups?: readonly TestPaletteGroup[];
        customPages?: readonly TestPalettePage[];
        externalInput?: boolean;
    }

    let {
        open = $bindable(true),
        onOpenChange,
        size = "md",
        inputValue = $bindable(""),
        onInputValueChange,
        highlightedValue = $bindable<string | undefined>(),
        onHighlightedValueChange,
        pages = $bindable<string[]>([]),
        onPagesChange,
        filter = true,
        loop = true,
        resetOnClose = true,
        popPageOnEscape = true,
        popPageOnBackspace = true,
        shortcut = false,
        registry,
        plugins,
        dismissible = true,
        closeOnEscape,
        focusTrap = true,
        onBeforeClose,
        onClose,
        id,

        showBar = true,
        barShowScope = true,
        manualScope = false,
        manualScopeLabel,
        showClear = true,
        showList = true,
        showEmpty = true,
        emptyText = "No matching commands.",
        showWidget = false,
        showPreview = false,
        previewText = "Preview pane",
        showFooter = false,
        footerText = "Footer hints",
        items = [],
        groups = [],
        customPages = [],
        externalInput = false,
    }: Props = $props();

    let paletteApi = $state<ReturnType<typeof CommandPalette> | undefined>();

    export function getOpen(): boolean {
        return open;
    }

    export function setOpen(next: boolean): void {
        open = next;
    }

    export function getInputValue(): string {
        return inputValue;
    }

    export function setInputValue(next: string): void {
        inputValue = next;
    }

    export function getHighlightedValue(): string | undefined {
        return highlightedValue;
    }

    export function getPages(): string[] {
        return pages;
    }

    export function pushPage(pageId: string, options?: CommandPalettePushPageOptions): void {
        paletteApi?.pushPage(pageId, options);
    }

    export function popPage(): void {
        paletteApi?.popPage();
    }

    export function resetPages(): void {
        paletteApi?.resetPages();
    }

    export function focusInput(): void {
        paletteApi?.focusInput();
    }

    export async function requestClose(reason?: CommandPaletteCloseReason): Promise<boolean> {
        return (await paletteApi?.requestClose(reason)) ?? false;
    }

    function handleItemSelect(item: TestPaletteItem, event: MouseEvent | KeyboardEvent): void {
        item.onSelect?.(event);
        if (item.pushPage) {
            paletteApi?.pushPage(item.pushPage.id, item.pushPage.options);
        }
    }
</script>

{#if externalInput}
    <input data-testid="external-input" type="text" />
{/if}

<CommandPalette
    bind:this={paletteApi}
    bind:open
    {onOpenChange}
    {size}
    bind:inputValue
    {onInputValueChange}
    bind:highlightedValue
    {onHighlightedValueChange}
    bind:pages
    {onPagesChange}
    {filter}
    {loop}
    {resetOnClose}
    {popPageOnEscape}
    {popPageOnBackspace}
    {shortcut}
    {registry}
    {plugins}
    {dismissible}
    {closeOnEscape}
    {focusTrap}
    {onBeforeClose}
    {onClose}
    {id}
>
    {#if showBar}
        <CommandPaletteBar showScope={barShowScope}>
            {#if manualScope}
                <CommandPaletteScope label={manualScopeLabel} />
            {/if}
            <CommandPaletteInput placeholder="Search commands..." />
            {#if showClear}
                <CommandPaletteClear />
            {/if}
        </CommandPaletteBar>
    {/if}

    <CommandPaletteBody>
        {#if showList}
            <CommandPaletteList>
                {#if showWidget}
                    <CommandPaletteWidget data-testid="test-widget">
                        <button type="button" data-testid="widget-button">Widget Action</button>
                        <input type="text" data-testid="widget-input" />
                    </CommandPaletteWidget>
                {/if}

                {#each items as item (item.value)}
                    <CommandPaletteItem
                        value={item.value}
                        label={item.label}
                        keywords={item.keywords}
                        disabled={item.disabled}
                        negative={item.negative}
                        href={item.href}
                        closeOnSelect={item.closeOnSelect}
                        onSelect={(event) => handleItemSelect(item, event)}
                    >
                        <CommandPaletteItemText>{item.text ?? item.label ?? item.value}</CommandPaletteItemText>
                        {#if item.description}
                            <CommandPaletteItemDescription>{item.description}</CommandPaletteItemDescription>
                        {/if}
                    </CommandPaletteItem>
                {/each}

                {#each groups as group (group.key)}
                    <CommandPaletteGroup>
                        {#if group.label}
                            <CommandPaletteGroupLabel>{group.label}</CommandPaletteGroupLabel>
                        {/if}
                        {#each group.items as item (item.value)}
                            <CommandPaletteItem
                                value={item.value}
                                label={item.label}
                                keywords={item.keywords}
                                disabled={item.disabled}
                                negative={item.negative}
                                href={item.href}
                                closeOnSelect={item.closeOnSelect}
                                onSelect={(event) => handleItemSelect(item, event)}
                            >
                                <CommandPaletteItemText>{item.text ?? item.label ?? item.value}</CommandPaletteItemText>
                            </CommandPaletteItem>
                        {/each}
                    </CommandPaletteGroup>
                {/each}

                {#each customPages.filter((p) => !p.external) as page (page.value)}
                    <CommandPalettePage value={page.value} label={page.label} filter={page.filter}>
                        {#if page.widget}
                            <CommandPaletteWidget data-testid={`page-widget-${page.value}`}>
                                <button type="button" data-testid={`page-widget-btn-${page.value}`}>
                                    Page Widget
                                </button>
                            </CommandPaletteWidget>
                        {/if}
                        {#each page.items ?? [] as item (item.value)}
                            <CommandPaletteItem
                                value={item.value}
                                label={item.label}
                                keywords={item.keywords}
                                disabled={item.disabled}
                                closeOnSelect={item.closeOnSelect}
                                onSelect={(event) => handleItemSelect(item, event)}
                            >
                                <CommandPaletteItemText>{item.text ?? item.label ?? item.value}</CommandPaletteItemText>
                            </CommandPaletteItem>
                        {/each}
                    </CommandPalettePage>
                {/each}

                {#if showEmpty}
                    <CommandPaletteEmpty>{emptyText}</CommandPaletteEmpty>
                {/if}
            </CommandPaletteList>
        {/if}

        {#each customPages.filter((p) => p.external) as page (page.value)}
            <CommandPalettePage value={page.value} label={page.label} filter={page.filter}>
                <CommandPaletteWidget data-testid={`external-page-widget-${page.value}`}>
                    <button type="button">External View</button>
                </CommandPaletteWidget>
            </CommandPalettePage>
        {/each}

        {#if showPreview}
            <CommandPalettePreview data-testid="test-preview">
                {previewText}
            </CommandPalettePreview>
        {/if}
    </CommandPaletteBody>

    {#if showFooter}
        <CommandPaletteFooter data-testid="test-footer">
            {footerText}
        </CommandPaletteFooter>
    {/if}
</CommandPalette>
