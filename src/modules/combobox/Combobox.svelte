<script lang="ts" generics="T extends string = string">
    import { createListboxRegistry } from "../../shared/listbox/listbox-registry.svelte.ts";
    import { createPointerDragRelease } from "../../shared/listbox/pointer-drag-release.ts";
    import type { ComboboxProps } from "./index.ts";
    import {
        setComboboxContext,
        type ComboboxOpenFocus,
        type ComboboxOpenOptions,
        type ComboboxRegisteredItem,
    } from "./combobox.context.internal.ts";

    type PopoverElement = HTMLDivElement & {
        showPopover: (options?: { source?: HTMLElement }) => void;
        hidePopover: () => void;
    };

    const UNINITIALIZED = Symbol("uninitialized");

    let {
        value = $bindable<T | undefined>(),
        onValueChange,
        inputValue = $bindable(""),
        onInputValueChange,
        open = $bindable(false),
        onOpenChange,
        variant,
        size,
        filter = true,
        allowCustomValue = false,
        openOnFocus = false,
        disabled = false,
        readonly = false,
        invalid = false,
        required = false,
        name,
        id,
        children,
    }: ComboboxProps<T> = $props();

    const generatedId = $props.id();
    const registry = createListboxRegistry<ComboboxRegisteredItem<T>>();

    let inputIdOverride = $state<string | undefined>();
    let listboxIdOverride = $state<string | undefined>();
    let controlRef = $state<HTMLDivElement | null>(null);
    let inputRef = $state<HTMLInputElement | null>(null);
    let contentRef = $state<HTMLDivElement | null>(null);

    let isFiltering = $state(false);
    let isKeyboardNav = $state(false);
    let highlightedValue = $state<T | undefined>();

    let lastSyncedOpen = false;
    let reconcilingToggle: boolean | null = null;
    let lastSyncedValue: T | undefined | typeof UNINITIALIZED = UNINITIALIZED;
    const { beginPointerOpen, shouldCommitPointerRelease, clearPointerOpen } = createPointerDragRelease(
        () => controlRef
    );

    const controlId = $derived(id ?? `${generatedId}-control`);
    const defaultInputId = $derived(id ? `${id}-input` : `${generatedId}-input`);
    const defaultListboxId = $derived(`${id ?? generatedId}-listbox`);
    const inputId = $derived(inputIdOverride ?? defaultInputId);
    const listboxId = $derived(listboxIdOverride ?? defaultListboxId);

    const selectedItem = $derived(value !== undefined ? registry.get(value) : undefined);

    const highlightedItemId = $derived.by((): string | undefined => {
        if (highlightedValue === undefined) return undefined;
        const item = registry.get(highlightedValue);
        if (!item || !item.visible || item.disabled) return undefined;
        return item.id;
    });

    const visibleItemCount = $derived.by((): number => {
        let count = 0;
        for (const item of registry.items.values()) {
            if (item.visible) count += 1;
        }
        return count;
    });

    function normalizeFilterText(text: string): string {
        return text.trim().replaceAll(/\s+/g, " ").toLowerCase();
    }

    function isPopoverDomOpen(el: HTMLDivElement | null): boolean {
        if (!el) return false;
        try {
            return el.matches(":popover-open");
        } catch {
            return false;
        }
    }

    function isItemVisible(label: string, itemValue: T, keywords?: string[]): boolean {
        if (!isFiltering || filter === false) return true;
        if (typeof filter === "function") {
            return filter(label, inputValue, itemValue);
        }
        const normalizedQuery = normalizeFilterText(inputValue);
        if (normalizedQuery === "") return true;
        if (normalizeFilterText(label).includes(normalizedQuery)) return true;
        if (keywords?.some((kw) => normalizeFilterText(kw).includes(normalizedQuery))) {
            return true;
        }
        return false;
    }

    function getVisibleEnabledItems(): ComboboxRegisteredItem<T>[] {
        return registry.getOrdered((item) => item.visible && !item.disabled);
    }

    function resolveInitialHighlight(openFocus: ComboboxOpenFocus): T | undefined {
        const visibleEnabled = getVisibleEnabledItems();
        if (visibleEnabled.length === 0) return undefined;

        if (openFocus === "selected") {
            if (value !== undefined) {
                const selectedVisible = visibleEnabled.find((item) => item.value === value);
                if (selectedVisible) return selectedVisible.value;
            }
            return visibleEnabled[0]?.value;
        }

        if (openFocus === "last") {
            if (value !== undefined) {
                const selectedVisible = visibleEnabled.find((item) => item.value === value);
                if (selectedVisible) return selectedVisible.value;
            }
            return visibleEnabled.at(-1)?.value;
        }

        return visibleEnabled[0]?.value;
    }

    function setInputValue(nextInputValue: string, options?: { filter?: boolean; open?: boolean }): void {
        if (inputValue !== nextInputValue) {
            inputValue = nextInputValue;
            onInputValueChange?.(nextInputValue);
        }
        if (nextInputValue === "" && value !== undefined) {
            value = undefined;
            lastSyncedValue = undefined;
            // eslint-disable-next-line unicorn/no-useless-undefined -- T | undefined callback requires explicit argument
            onValueChange?.(undefined);
        }
        if (options?.filter !== false) {
            isFiltering = true;
        }
        if (options?.open && !open && !disabled && !readonly) {
            setOpen(true, { filter: options?.filter ?? true, openFocus: "first" });
        }
    }

    function setHighlightedValue(nextValue: T | undefined, options?: { keyboard?: boolean }): void {
        highlightedValue = nextValue;
        if (options?.keyboard !== undefined) {
            isKeyboardNav = options.keyboard;
        }
    }

    function moveHighlight(direction: 1 | -1): void {
        const visibleEnabled = getVisibleEnabledItems();
        if (visibleEnabled.length === 0) {
            highlightedValue = undefined;
            return;
        }
        const currentIndex =
            highlightedValue === undefined ? -1 : visibleEnabled.findIndex((item) => item.value === highlightedValue);
        let nextItem: ComboboxRegisteredItem<T> | undefined;
        if (currentIndex === -1) {
            nextItem = direction === 1 ? visibleEnabled[0] : visibleEnabled.at(-1);
        } else {
            const nextIndex = Math.max(0, Math.min(visibleEnabled.length - 1, currentIndex + direction));
            nextItem = visibleEnabled[nextIndex];
        }
        highlightedValue = nextItem?.value;
        isKeyboardNav = true;
        nextItem?.element?.scrollIntoView({ block: "nearest" });
    }

    function select(itemValue: T): void {
        if (disabled || readonly) return;
        const registered = registry.get(itemValue);
        const nextLabel = registered?.label ?? itemValue;

        if (value !== itemValue) {
            value = itemValue;
            onValueChange?.(itemValue);
        }
        lastSyncedValue = value;

        if (inputValue !== nextLabel) {
            inputValue = nextLabel;
            onInputValueChange?.(nextLabel);
        }

        isFiltering = false;
        setOpen(false);
        inputRef?.focus({ preventScroll: true });
    }

    function commitCustomValue(): void {
        if (disabled || readonly || !allowCustomValue) return;
        const nextValue = inputValue === "" ? undefined : (inputValue as T);
        if (value !== nextValue) {
            value = nextValue;
            onValueChange?.(nextValue);
        }
        lastSyncedValue = value;
    }

    function clear(): void {
        if (disabled || readonly) return;
        isFiltering = false;
        highlightedValue = undefined;

        if (value !== undefined) {
            value = undefined;
            lastSyncedValue = undefined;
            // eslint-disable-next-line unicorn/no-useless-undefined -- T | undefined callback requires explicit argument
            onValueChange?.(undefined);
        }
        if (inputValue !== "") {
            inputValue = "";
            onInputValueChange?.("");
        }
        inputRef?.focus({ preventScroll: true });
    }

    function handleInputBlur(): void {
        isFiltering = false;
        isKeyboardNav = false;
        highlightedValue = undefined;

        if (allowCustomValue) {
            commitCustomValue();
            return;
        }

        const targetLabel = value !== undefined ? (selectedItem?.label ?? value) : "";
        if (inputValue !== targetLabel) {
            inputValue = targetLabel;
            onInputValueChange?.(targetLabel);
        }
    }

    function setOpen(nextOpen: boolean, options?: ComboboxOpenOptions): void {
        if (nextOpen && (disabled || readonly)) return;

        const popoverEl = contentRef as PopoverElement | null;

        if (nextOpen) {
            isFiltering = options?.filter ?? false;
            isKeyboardNav = false;
            if (!open) {
                open = true;
                onOpenChange?.(true);
            }
            if (!open) {
                lastSyncedOpen = false;
                isFiltering = false;
                return;
            }
            lastSyncedOpen = true;
            highlightedValue = resolveInitialHighlight(options?.openFocus ?? (isFiltering ? "first" : "selected"));
            if (popoverEl && !isPopoverDomOpen(popoverEl) && typeof popoverEl.showPopover === "function") {
                popoverEl.showPopover({ source: controlRef ?? undefined });
            }
            return;
        }

        if (open) {
            open = false;
            onOpenChange?.(false);
        }
        if (open) {
            lastSyncedOpen = true;
            return;
        }
        clearPointerOpen();
        isFiltering = false;
        isKeyboardNav = false;
        highlightedValue = undefined;
        lastSyncedOpen = false;
        if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
            popoverEl.hidePopover();
        }
    }

    function syncPopoverOpen(nextOpen: boolean): void {
        const popoverEl = contentRef as PopoverElement | null;

        if (nextOpen && (disabled || readonly)) {
            if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                popoverEl.hidePopover();
            }
            return;
        }

        const wasOpen = Boolean(open);
        if (wasOpen !== nextOpen) {
            open = nextOpen;
            onOpenChange?.(nextOpen);
        }

        if (Boolean(open) === nextOpen) {
            lastSyncedOpen = nextOpen;
            if (!nextOpen) {
                clearPointerOpen();
                if (wasOpen) {
                    handleInputBlur();
                } else {
                    isFiltering = false;
                    isKeyboardNav = false;
                    highlightedValue = undefined;
                }
            }
            return;
        }

        lastSyncedOpen = Boolean(open);
        if (reconcilingToggle !== nextOpen) {
            try {
                reconcilingToggle = nextOpen;
                if (nextOpen) {
                    clearPointerOpen();
                    isFiltering = false;
                    isKeyboardNav = false;
                    highlightedValue = undefined;
                    if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                        popoverEl.hidePopover();
                    }
                } else if (
                    !disabled &&
                    !readonly &&
                    popoverEl &&
                    !isPopoverDomOpen(popoverEl) &&
                    typeof popoverEl.showPopover === "function"
                ) {
                    popoverEl.showPopover({ source: controlRef ?? undefined });
                }
            } finally {
                reconcilingToggle = null;
            }
        }
    }

    setComboboxContext<T>({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get value() {
            return value;
        },
        get inputValue() {
            return inputValue;
        },
        get open() {
            return Boolean(open);
        },
        get disabled() {
            return Boolean(disabled);
        },
        get readonly() {
            return Boolean(readonly);
        },
        get invalid() {
            return Boolean(invalid);
        },
        get required() {
            return Boolean(required);
        },
        get filter() {
            return filter;
        },
        get allowCustomValue() {
            return Boolean(allowCustomValue);
        },
        get openOnFocus() {
            return Boolean(openOnFocus);
        },
        get isFiltering() {
            return isFiltering;
        },
        get isKeyboardNav() {
            return isKeyboardNav;
        },
        get controlId() {
            return controlId;
        },
        get inputId() {
            return inputId;
        },
        get listboxId() {
            return listboxId;
        },
        get controlRef() {
            return controlRef;
        },
        get inputRef() {
            return inputRef;
        },
        get contentRef() {
            return contentRef;
        },
        get highlightedValue() {
            return highlightedValue;
        },
        get highlightedItemId() {
            return highlightedItemId;
        },
        get visibleItemCount() {
            return visibleItemCount;
        },
        get selectedItem() {
            return selectedItem;
        },
        registerControl(el: HTMLDivElement | null): () => void {
            controlRef = el;
            return () => {
                if (controlRef === el) {
                    controlRef = null;
                }
            };
        },
        registerInput(el: HTMLInputElement | null): () => void {
            inputRef = el;
            return () => {
                if (inputRef === el) {
                    inputRef = null;
                }
            };
        },
        registerInputId(overrideId: string | undefined): () => void {
            inputIdOverride = overrideId;
            return () => {
                if (inputIdOverride === overrideId) {
                    inputIdOverride = undefined;
                }
            };
        },
        registerContent(el: HTMLDivElement | null): () => void {
            contentRef = el;
            return () => {
                if (contentRef === el) {
                    contentRef = null;
                }
            };
        },
        registerListboxId(overrideId: string | undefined): () => void {
            listboxIdOverride = overrideId;
            return () => {
                if (listboxIdOverride === overrideId) {
                    listboxIdOverride = undefined;
                }
            };
        },
        registerItem: registry.register,
        isItemVisible,
        isSelected(itemValue: T): boolean {
            return value === itemValue;
        },
        isHighlighted(itemValue: T): boolean {
            return highlightedValue === itemValue;
        },
        setInputValue,
        setHighlightedValue,
        setKeyboardNav(keyboard: boolean): void {
            isKeyboardNav = keyboard;
        },
        moveHighlight,
        select,
        commitCustomValue,
        clear,
        setOpen,
        syncPopoverOpen,
        beginPointerOpen,
        shouldCommitPointerRelease,
        clearPointerOpen,
        handleInputBlur,
    });

    // Sync initial or externally mutated `value` to `inputValue` when not actively filtering.
    $effect(() => {
        if (isFiltering) return;
        const nextLabel = value !== undefined ? (selectedItem?.label ?? value) : "";
        if (value !== lastSyncedValue || (value !== undefined && inputValue === "" && nextLabel !== "")) {
            lastSyncedValue = value;
            if (inputValue !== nextLabel) {
                inputValue = nextLabel;
            }
        }
    });

    // Keep highlightedValue valid when filtering changes visible items while open.
    $effect(() => {
        if (!open) return;
        const visibleEnabled = getVisibleEnabledItems();
        if (visibleEnabled.length === 0) {
            highlightedValue = undefined;
            return;
        }
        const stillValid =
            highlightedValue !== undefined && visibleEnabled.some((item) => item.value === highlightedValue);
        if (!stillValid && isFiltering) {
            highlightedValue = visibleEnabled[0]?.value;
        }
    });

    // Sync external `bind:open` mutations and dynamic `disabled`/`readonly` with the native popover.
    $effect(() => {
        const popoverEl = contentRef as PopoverElement | null;

        if ((disabled || readonly) && (Boolean(open) || isPopoverDomOpen(contentRef))) {
            clearPointerOpen();
            isFiltering = false;
            isKeyboardNav = false;
            highlightedValue = undefined;
            lastSyncedOpen = false;
            if (open) {
                open = false;
                onOpenChange?.(false);
            }
            if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                popoverEl.hidePopover();
            }
            return;
        }

        const nextOpen = Boolean(open);
        if (nextOpen === lastSyncedOpen) return;
        if (!popoverEl) return;

        lastSyncedOpen = nextOpen;
        if (nextOpen) {
            if (!isPopoverDomOpen(popoverEl) && typeof popoverEl.showPopover === "function") {
                popoverEl.showPopover({ source: controlRef ?? undefined });
            }
            return;
        }

        clearPointerOpen();
        isFiltering = false;
        isKeyboardNav = false;
        highlightedValue = undefined;
        if (isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
            popoverEl.hidePopover();
        }
    });

    $effect(() => {
        return clearPointerOpen;
    });
</script>

{@render children?.()}

{#if name}
    <input type="hidden" {name} value={value ?? ""} {disabled} />
{/if}
