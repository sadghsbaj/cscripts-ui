<script lang="ts">
    import "../../shared/listbox/listbox.css";
    import "./command-palette.internal.css";

    import { SvelteMap, SvelteSet } from "svelte/reactivity";

    import { t } from "../../shared/lang.internal.ts";
    import { createListboxRegistry } from "../../shared/listbox/listbox-registry.svelte.ts";
    import { focusTrap as attachFocusTrap, type FocusTrapTarget } from "../focus/index.ts";
    import { Overlay } from "../overlay/index.ts";
    import { scoreCommandPaletteMatch } from "./command-palette-score.ts";
    import { matchesCommandPaletteShortcut } from "./command-palette-shortcut.attach.ts";
    import {
        setInternalCommandPaletteContext,
        type CommandPaletteInternalContext,
        type CommandPaletteRegisteredItem,
        type CommandPaletteRegisteredPage,
    } from "./command-palette.context.internal.ts";
    import { setPublicCommandPaletteContext } from "./command-palette.context.ts";
    import type {
        CommandPaletteCloseReason,
        CommandPaletteContext,
        CommandPaletteFilterCandidate,
        CommandPaletteFilterFn,
        CommandPalettePlugin,
        CommandPaletteProps,
        CommandPalettePushPageOptions,
    } from "./index.ts";

    let {
        ref = $bindable(null),
        open = $bindable(false),
        onOpenChange,
        size,
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
        overlayVariant = "dim",
        lockScroll = true,
        dismissible = true,
        closeOnEscape,
        focusTrap = true,
        initialFocus,
        restoreFocus = true,
        onBeforeClose,
        onClose,
        id,
        class: className,
        children,
        onkeydown,
        onpointermove,
        ...rest
    }: CommandPaletteProps = $props();

    const generatedId = $props.id();
    const baseId = $derived(id ?? generatedId);
    const effectiveCloseOnEscape = $derived(closeOnEscape ?? dismissible);
    const activePage = $derived(pages.at(-1));

    const itemRegistry = createListboxRegistry<CommandPaletteRegisteredItem>();
    const widgetIds = new SvelteSet<string>();
    const manualScopeIds = new SvelteSet<string>();
    const registeredPages = new SvelteMap<string, CommandPaletteRegisteredPage>();
    const pushedPageLabels = new SvelteMap<string, string>();

    let inputRef = $state<HTMLInputElement | null>(null);
    let customInputId = $state<string | undefined>();
    let listRef = $state<HTMLElement | null>(null);
    let customListboxId = $state<string | undefined>();
    let isKeyboardNav = $state(false);

    let pageMutationVersion = 0;
    let isClosing = false;
    let wasOpen = false;

    interface PageSnapshot {
        page: string;
        parentInputValue: string;
        parentHighlightedValue: string | undefined;
    }

    const pageSnapshots: PageSnapshot[] = [];

    const inputId = $derived(customInputId ?? `${baseId}-input`);
    const listboxId = $derived(customListboxId ?? `${baseId}-listbox`);
    const hasListMounted = $derived(listRef !== null);

    const allPlugins = $derived.by((): readonly CommandPalettePlugin[] => {
        const merged = new SvelteMap<string, CommandPalettePlugin>();
        if (registry) {
            for (const plugin of registry.plugins.values()) {
                merged.set(plugin.id, plugin);
            }
        }
        if (plugins) {
            for (const plugin of plugins) {
                merged.set(plugin.id, plugin);
            }
        }
        return merged
            .values()
            .toArray()
            .toSorted((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    });

    const activePrefixPlugin = $derived.by((): CommandPalettePlugin | undefined => {
        if (activePage !== undefined || inputValue === "") return undefined;

        let matched: CommandPalettePlugin | undefined;
        for (const plugin of allPlugins) {
            if (!plugin.prefix) continue;
            if (!inputValue.startsWith(plugin.prefix)) continue;
            if (!matched || plugin.prefix.length > (matched.prefix?.length ?? 0)) {
                matched = plugin;
            }
        }
        return matched;
    });

    const effectiveQuery = $derived(
        activePrefixPlugin?.prefix ? inputValue.slice(activePrefixPlugin.prefix.length) : inputValue
    );

    const activeScopeLabel = $derived.by((): string | undefined => {
        if (activePage !== undefined) {
            const pageMeta = registeredPages.get(activePage);
            if (pageMeta?.label) return pageMeta.label;
            const pushedLabel = pushedPageLabels.get(activePage);
            if (pushedLabel) return pushedLabel;
            const pluginMatch = allPlugins.find((p) => p.page === activePage || p.id === activePage);
            if (pluginMatch?.label) return pluginMatch.label;
            return activePage;
        }
        if (activePrefixPlugin) {
            return activePrefixPlugin.label ?? activePrefixPlugin.prefix;
        }
        return undefined;
    });

    const hasExternalActivePage = $derived(
        activePage !== undefined && registeredPages.get(activePage)?.inList === false
    );

    const visibleItems = $derived(itemRegistry.getOrdered((item) => item.visible));
    const visibleEnabledItems = $derived(visibleItems.filter((item) => !item.disabled));
    const visibleItemCount = $derived(visibleItems.length);
    const visibleWidgetCount = $derived(widgetIds.size);

    const highlightedItemId = $derived.by((): string | undefined => {
        if (highlightedValue === undefined) return undefined;
        const item = itemRegistry.get(highlightedValue);
        if (!item || !item.visible || item.disabled) return undefined;
        return item.id;
    });

    const resolvedAriaLabel = $derived(
        rest["aria-label"] ?? (rest["aria-labelledby"] ? undefined : t({ de: "Befehlspalette", en: "Command palette" }))
    );

    const resolvedInitialFocus = $derived<FocusTrapTarget | false>(
        initialFocus !== undefined ? initialFocus : () => inputRef
    );

    function setInputValue(nextValue: string): void {
        if (inputValue === nextValue) return;
        inputValue = nextValue;
        onInputValueChange?.(nextValue);
    }

    function setHighlightedValue(nextValue: string | undefined, options?: { keyboard?: boolean }): void {
        if (options?.keyboard !== undefined) {
            isKeyboardNav = options.keyboard;
        }
        if (highlightedValue === nextValue) return;
        highlightedValue = nextValue;
        onHighlightedValueChange?.(nextValue);
    }

    function setKeyboardNav(keyboard: boolean): void {
        isKeyboardNav = keyboard;
    }

    function scrollItemIntoView(item: CommandPaletteRegisteredItem | undefined): void {
        item?.element?.scrollIntoView({ block: "nearest" });
    }

    function moveHighlight(direction: 1 | -1): void {
        const enabled = visibleEnabledItems;
        if (enabled.length === 0) return;

        const currentIndex =
            highlightedValue === undefined ? -1 : enabled.findIndex((item) => item.value === highlightedValue);

        let nextIndex: number;
        if (currentIndex === -1) {
            nextIndex = direction === 1 ? 0 : enabled.length - 1;
        } else {
            nextIndex = currentIndex + direction;
            if (nextIndex < 0) {
                nextIndex = loop ? enabled.length - 1 : 0;
            } else if (nextIndex >= enabled.length) {
                nextIndex = loop ? 0 : enabled.length - 1;
            }
        }

        const nextItem = enabled[nextIndex];
        if (!nextItem) return;
        setHighlightedValue(nextItem.value, { keyboard: true });
        scrollItemIntoView(nextItem);
    }

    function highlightEdge(edge: "first" | "last"): void {
        const enabled = visibleEnabledItems;
        if (enabled.length === 0) return;

        const target = edge === "first" ? enabled[0] : enabled.at(-1);
        if (!target) return;
        setHighlightedValue(target.value, { keyboard: true });
        scrollItemIntoView(target);
    }

    function activateHighlighted(event: KeyboardEvent): boolean {
        if (highlightedValue === undefined) return false;
        const item = itemRegistry.get(highlightedValue);
        if (!item || !item.visible || item.disabled) return false;

        if (item.element instanceof HTMLAnchorElement) {
            event.preventDefault();
            item.element.click();
            return true;
        }
        item.select(event);
        event.preventDefault();
        return true;
    }

    export function focusInput(): void {
        inputRef?.focus({ preventScroll: true });
    }

    export function pushPage(pageId: string, options?: CommandPalettePushPageOptions): void {
        pageMutationVersion += 1;
        pageSnapshots.push({
            page: pageId,
            parentInputValue: inputValue,
            parentHighlightedValue: highlightedValue,
        });
        if (options?.label) {
            pushedPageLabels.set(pageId, options.label);
        }
        const nextPages = [...pages, pageId];
        pages = nextPages;
        onPagesChange?.(nextPages);

        setInputValue(options?.inputValue ?? "");
        setHighlightedValue(undefined);
        focusInput();
    }

    export function popPage(): void {
        if (pages.length === 0) return;
        pageMutationVersion += 1;

        const poppedPage = pages.at(-1);
        const snapshot = pageSnapshots.pop();
        if (poppedPage && !pages.slice(0, -1).includes(poppedPage)) {
            pushedPageLabels.delete(poppedPage);
        }

        const nextPages = pages.slice(0, -1);
        pages = nextPages;
        onPagesChange?.(nextPages);

        if (snapshot && snapshot.page === poppedPage) {
            setInputValue(snapshot.parentInputValue);
            setHighlightedValue(snapshot.parentHighlightedValue);
        } else {
            setInputValue("");
            setHighlightedValue(undefined);
        }
        focusInput();
    }

    export function resetPages(): void {
        if (pages.length === 0) return;
        pageMutationVersion += 1;
        pageSnapshots.length = 0;
        pushedPageLabels.clear();
        pages = [];
        onPagesChange?.([]);
    }

    function resetStateAfterClose(): void {
        pageSnapshots.length = 0;
        pushedPageLabels.clear();
        isKeyboardNav = false;

        if (inputValue !== "") {
            inputValue = "";
            onInputValueChange?.("");
        }
        if (pages.length > 0) {
            pages = [];
            onPagesChange?.([]);
        }
        if (highlightedValue !== undefined) {
            highlightedValue = undefined;
            onHighlightedValueChange?.(highlightedValue);
        }
    }

    export async function requestClose(reason: CommandPaletteCloseReason = "programmatic"): Promise<boolean> {
        if (!open || isClosing) return false;

        if (reason === "escape" && !effectiveCloseOnEscape) {
            return false;
        }

        if ((reason === "outside-click" || reason === "close-button") && !dismissible) {
            return false;
        }

        if (onBeforeClose) {
            isClosing = true;
            try {
                const allowed = await onBeforeClose(reason);
                if (allowed === false) {
                    return false;
                }
            } finally {
                isClosing = false;
            }
        }

        if (!open) return false;

        wasOpen = false;
        open = false;
        onOpenChange?.(false);
        onClose?.(reason);

        if (resetOnClose) {
            resetStateAfterClose();
        }
        return true;
    }

    function clearInput(): void {
        setInputValue("");
        focusInput();
    }

    function clearScope(): void {
        if (pages.length > 0) {
            popPage();
            return;
        }
        if (activePrefixPlugin?.prefix && inputValue.startsWith(activePrefixPlugin.prefix)) {
            setInputValue(inputValue.slice(activePrefixPlugin.prefix.length));
            focusInput();
        }
    }

    function isItemVisible(
        candidate: CommandPaletteFilterCandidate,
        pageValue: string | undefined,
        overrideFilter?: boolean | CommandPaletteFilterFn,
        isPrefixPluginItem = false
    ): boolean {
        // Scope visibility: root items hide when a sub-page is active; page items only show on their page.
        if (pageValue !== activePage) {
            return false;
        }

        // Prefix mode: when a prefix plugin is active on root, hide unrelated root items.
        if (activePrefixPlugin && !isPrefixPluginItem) {
            return false;
        }

        const pageMeta = activePage !== undefined ? registeredPages.get(activePage) : undefined;
        const activeFilter = overrideFilter ?? pageMeta?.filter ?? filter;
        if (activeFilter === false) return true;

        const query = activePage === undefined ? effectiveQuery : inputValue;
        if (typeof activeFilter === "function") {
            return activeFilter(candidate, query);
        }

        return scoreCommandPaletteMatch(query, candidate) > 0;
    }

    function isHighlighted(itemValue: string): boolean {
        return highlightedValue === itemValue;
    }

    function handleEscape(event: KeyboardEvent): void {
        if (event.isComposing) return;
        if (pages.length > 0 && popPageOnEscape && !event.shiftKey) {
            event.preventDefault();
            popPage();
            return;
        }
        void requestClose("escape");
    }

    function handleBackdropClick(): void {
        if (!dismissible) return;
        void requestClose("outside-click");
    }

    function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onkeydown?.(event);
        if (event.defaultPrevented) return;

        if (!focusTrap && event.key === "Escape") {
            handleEscape(event);
            return;
        }

        // Prevent Mod+A from selecting background page text when focus is outside an editable field.
        if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "a") {
            const target = event.target;
            const isEditable =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                (target instanceof HTMLElement && target.isContentEditable);
            if (!isEditable) {
                event.preventDefault();
            }
        }
    }

    function handlePointerMove(event: PointerEvent & { currentTarget: EventTarget & HTMLDivElement }): void {
        onpointermove?.(event);
        if (event.pointerType === "mouse" && isKeyboardNav) {
            isKeyboardNav = false;
        }
    }

    // Keep highlightedValue synchronously snapped to the first visible enabled item when results change.
    $effect(() => {
        if (!open) return;

        const enabled = visibleEnabledItems;
        if (enabled.length === 0) {
            if (highlightedValue !== undefined) {
                highlightedValue = undefined;
                onHighlightedValueChange?.(highlightedValue);
            }
            return;
        }

        const currentStillValid =
            highlightedValue !== undefined && enabled.some((item) => item.value === highlightedValue);
        if (!currentStillValid) {
            const first = enabled[0];
            if (first) {
                highlightedValue = first.value;
                onHighlightedValueChange?.(first.value);
            }
        }
    });

    // Reset state if consumer flips `open` from true to false externally via bind:open.
    $effect(() => {
        if (wasOpen && !open && resetOnClose) {
            resetStateAfterClose();
        }
        wasOpen = open;
    });

    // Optional global hotkey (Mod+K or custom shortcut config) active even while closed.
    $effect(() => {
        if (!shortcut || typeof window === "undefined") return;

        const config = shortcut === true ? undefined : shortcut;

        function handleGlobalKeyDown(event: KeyboardEvent): void {
            if (!matchesCommandPaletteShortcut(event, config)) return;
            event.preventDefault();
            if (open) {
                void requestClose("shortcut");
            } else {
                open = true;
                onOpenChange?.(true);
            }
        }

        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => {
            window.removeEventListener("keydown", handleGlobalKeyDown);
        };
    });

    const publicContext: CommandPaletteContext = {
        get open() {
            return open;
        },
        get size() {
            return size;
        },
        get inputValue() {
            return inputValue;
        },
        get highlightedValue() {
            return highlightedValue;
        },
        get pages() {
            return pages;
        },
        get activePage() {
            return activePage;
        },
        get activePrefix() {
            return activePrefixPlugin?.prefix;
        },
        get visibleItemCount() {
            return visibleItemCount;
        },
        get visibleWidgetCount() {
            return visibleWidgetCount;
        },
        setInputValue,
        setHighlightedValue: (nextValue) => {
            setHighlightedValue(nextValue);
        },
        pushPage,
        popPage,
        resetPages,
        focusInput,
        close: (reason = "programmatic") => {
            void requestClose(reason);
        },
    };

    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- non-reactive map avoids re-triggering the lifecycle $effect
    const activePluginCleanups = new Map<CommandPalettePlugin, (() => void) | void>();

    function cleanupAllPluginHooks(): void {
        for (const cleanup of activePluginCleanups.values()) {
            if (typeof cleanup === "function") {
                cleanup();
            }
        }
        activePluginCleanups.clear();
    }

    // Run plugin onOpen lifecycle hooks per plugin without tearing down unaffected plugins when allPlugins changes.
    $effect(() => {
        if (!open) {
            cleanupAllPluginHooks();
            return;
        }

        const currentPlugins = new Set(allPlugins);
        for (const [plugin, cleanup] of activePluginCleanups) {
            if (currentPlugins.has(plugin)) continue;
            if (typeof cleanup === "function") {
                cleanup();
            }
            activePluginCleanups.delete(plugin);
        }

        for (const plugin of allPlugins) {
            if (activePluginCleanups.has(plugin)) continue;
            const cleanup = plugin.onOpen?.(publicContext);
            activePluginCleanups.set(plugin, typeof cleanup === "function" ? cleanup : undefined);
        }
    });

    $effect(() => cleanupAllPluginHooks);

    const internalContext: CommandPaletteInternalContext = {
        get open() {
            return open;
        },
        get size() {
            return size;
        },
        get inputValue() {
            return inputValue;
        },
        get highlightedValue() {
            return highlightedValue;
        },
        get pages() {
            return pages;
        },
        get activePage() {
            return activePage;
        },
        get activePrefix() {
            return activePrefixPlugin?.prefix;
        },
        get listboxId() {
            return listboxId;
        },
        get inputId() {
            return inputId;
        },
        get isKeyboardNav() {
            return isKeyboardNav;
        },
        get hasListMounted() {
            return hasListMounted;
        },
        get hasExternalActivePage() {
            return hasExternalActivePage;
        },
        get highlightedItemId() {
            return highlightedItemId;
        },
        get visibleItemCount() {
            return visibleItemCount;
        },
        get visibleWidgetCount() {
            return visibleWidgetCount;
        },
        get popPageOnBackspace() {
            return popPageOnBackspace;
        },
        get activePrefixPlugin() {
            return activePrefixPlugin;
        },
        get activeScopeLabel() {
            return activeScopeLabel;
        },
        get effectiveQuery() {
            return effectiveQuery;
        },
        get allPlugins() {
            return allPlugins;
        },
        get hasManualScope() {
            return manualScopeIds.size > 0;
        },
        get pageMutationVersion() {
            return pageMutationVersion;
        },
        publicContext,
        registerInput(el: HTMLInputElement | null): () => void {
            inputRef = el;
            return () => {
                if (inputRef === el) {
                    inputRef = null;
                }
            };
        },
        registerInputId(nextId: string | undefined): () => void {
            customInputId = nextId;
            return () => {
                if (customInputId === nextId) {
                    customInputId = undefined;
                }
            };
        },
        registerList(el: HTMLElement | null, nextId: string | undefined): () => void {
            listRef = el;
            customListboxId = nextId;
            return () => {
                if (listRef === el) {
                    listRef = null;
                }
                if (customListboxId === nextId) {
                    customListboxId = undefined;
                }
            };
        },
        registerItem(meta: CommandPaletteRegisteredItem): () => void {
            return itemRegistry.register(meta);
        },
        registerWidget(widgetId: string): () => void {
            widgetIds.add(widgetId);
            return () => {
                widgetIds.delete(widgetId);
            };
        },
        registerPage(meta: CommandPaletteRegisteredPage): () => void {
            registeredPages.set(meta.value, meta);
            return () => {
                if (registeredPages.get(meta.value) === meta) {
                    registeredPages.delete(meta.value);
                }
            };
        },
        registerManualScope(scopeId: string): () => void {
            manualScopeIds.add(scopeId);
            return () => {
                manualScopeIds.delete(scopeId);
            };
        },
        isItemVisible,
        isHighlighted,
        setInputValue,
        setHighlightedValue,
        setKeyboardNav,
        moveHighlight,
        highlightEdge,
        activateHighlighted,
        clearInput,
        clearScope,
        focusInput,
        requestClose,
        pushPage,
        popPage,
        resetPages,
        close: (reason = "programmatic") => {
            void requestClose(reason);
        },
    };

    setPublicCommandPaletteContext(publicContext);
    setInternalCommandPaletteContext(internalContext);
</script>

{#if open}
    <Overlay variant={overlayVariant} {lockScroll} class="cs-command-palette-overlay" onclick={handleBackdropClick}>
        <div
            bind:this={ref}
            role="dialog"
            aria-modal="true"
            aria-label={resolvedAriaLabel}
            {...rest}
            {@attach attachFocusTrap({
                enabled: () => open && focusTrap,
                initialFocus: resolvedInitialFocus,
                fallbackFocus: "self",
                restoreFocus,
                // Let pointerdown reach the enclosing Overlay backdrop so Overlay.onclick fires.
                allowOutsideClick: (event) =>
                    event.target instanceof Element && event.target === ref?.closest(".cs-overlay"),
                onEscape: handleEscape,
            })}
            class={["cs-command-palette", className]}
            data-size={size}
            data-has-page={activePage ? "" : undefined}
            data-nav={isKeyboardNav ? "keyboard" : undefined}
            onkeydown={handleKeyDown}
            onpointermove={handlePointerMove}
        >
            {@render children?.()}
        </div>
    </Overlay>
{/if}
