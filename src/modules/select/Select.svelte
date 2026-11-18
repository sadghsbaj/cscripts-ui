<script lang="ts" generics="T extends string = string">
    import { createListboxRegistry } from "../../shared/listbox/listbox-registry.svelte.ts";
    import { createPointerDragRelease } from "../../shared/listbox/pointer-drag-release.ts";
    import type { SelectProps, SelectSelectedItem } from "./index.ts";
    import {
        setSelectContext,
        type SelectOpenFocus,
        type SelectOpenOptions,
        type SelectRegisteredItem,
    } from "./select.context.internal.ts";

    type PopoverElement = HTMLDivElement & {
        showPopover: (options?: { source?: HTMLElement }) => void;
        hidePopover: () => void;
    };

    let {
        value = $bindable(),
        onValueChange,
        open = $bindable(false),
        onOpenChange,
        variant,
        size,
        disabled = false,
        invalid = false,
        required = false,
        name,
        id,
        children,
    }: SelectProps<T> = $props();

    const generatedId = $props.id();
    const registry = createListboxRegistry<SelectRegisteredItem<T>>();

    let triggerIdOverride = $state<string | undefined>();
    let listboxIdOverride = $state<string | undefined>();
    let triggerRef = $state<HTMLButtonElement | null>(null);
    let contentRef = $state<HTMLDivElement | null>(null);

    let openFocus: SelectOpenFocus = "selected";
    let lastSyncedOpen = false;
    let reconcilingToggle: boolean | null = null;
    const { beginPointerOpen, shouldCommitPointerRelease, clearPointerOpen } = createPointerDragRelease(
        () => triggerRef
    );

    const defaultTriggerId = $derived(id ?? `${generatedId}-trigger`);
    const defaultListboxId = $derived(`${id ?? generatedId}-listbox`);
    const triggerId = $derived(triggerIdOverride ?? defaultTriggerId);
    const listboxId = $derived(listboxIdOverride ?? defaultListboxId);

    const selectedItem = $derived.by((): SelectSelectedItem<T> | undefined => {
        if (value === undefined) return undefined;
        const registered = registry.get(value);
        if (!registered) return undefined;
        return {
            value: registered.value,
            label: registered.label,
            icon: registered.icon,
            iconColor: registered.iconColor,
        };
    });

    function isPopoverDomOpen(el: HTMLDivElement | null): boolean {
        if (!el) return false;
        try {
            return el.matches(":popover-open");
        } catch {
            return false;
        }
    }

    function getOrderedEnabledItems(): SelectRegisteredItem<T>[] {
        return registry.getOrdered((item) => !item.disabled);
    }

    function selectWithoutToggle(itemValue: T): void {
        if (disabled) return;
        if (value === itemValue) return;
        value = itemValue;
        onValueChange?.(itemValue);
    }

    function select(itemValue: T): void {
        if (disabled) return;
        selectWithoutToggle(itemValue);
        setOpen(false, { restoreFocus: true });
    }

    function setOpen(nextOpen: boolean, options?: SelectOpenOptions): void {
        if (nextOpen && disabled) return;

        const popoverEl = contentRef as PopoverElement | null;

        if (nextOpen) {
            if (!open) {
                open = true;
                onOpenChange?.(true);
            }
            if (!open) {
                lastSyncedOpen = false;
                openFocus = "selected";
                return;
            }
            openFocus = options?.openFocus ?? "selected";
            lastSyncedOpen = true;
            if (popoverEl && !isPopoverDomOpen(popoverEl) && typeof popoverEl.showPopover === "function") {
                popoverEl.showPopover({ source: triggerRef ?? undefined });
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
        openFocus = "selected";
        lastSyncedOpen = false;
        if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
            popoverEl.hidePopover();
        }
        if (options?.restoreFocus !== false) {
            triggerRef?.focus({ preventScroll: true });
        }
    }

    function syncPopoverOpen(nextOpen: boolean): void {
        const popoverEl = contentRef as PopoverElement | null;

        if (nextOpen && disabled) {
            if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                popoverEl.hidePopover();
            }
            return;
        }

        if (Boolean(open) !== nextOpen) {
            open = nextOpen;
            onOpenChange?.(nextOpen);
        }

        if (Boolean(open) === nextOpen) {
            lastSyncedOpen = nextOpen;
            if (!nextOpen) {
                clearPointerOpen();
                openFocus = "selected";
            }
            return;
        }

        lastSyncedOpen = Boolean(open);
        if (reconcilingToggle !== nextOpen) {
            try {
                reconcilingToggle = nextOpen;
                if (nextOpen) {
                    clearPointerOpen();
                    openFocus = "selected";
                    if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                        popoverEl.hidePopover();
                    }
                } else if (
                    !disabled &&
                    popoverEl &&
                    !isPopoverDomOpen(popoverEl) &&
                    typeof popoverEl.showPopover === "function"
                ) {
                    popoverEl.showPopover({ source: triggerRef ?? undefined });
                }
            } finally {
                reconcilingToggle = null;
            }
        }
    }

    setSelectContext<T>({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get value() {
            return value;
        },
        get open() {
            return Boolean(open);
        },
        get disabled() {
            return Boolean(disabled);
        },
        get invalid() {
            return Boolean(invalid);
        },
        get required() {
            return Boolean(required);
        },
        get triggerId() {
            return triggerId;
        },
        get listboxId() {
            return listboxId;
        },
        get triggerRef() {
            return triggerRef;
        },
        get contentRef() {
            return contentRef;
        },
        get selectedItem() {
            return selectedItem;
        },
        get openFocus() {
            return openFocus;
        },
        registerTrigger(el: HTMLButtonElement | null): () => void {
            triggerRef = el;
            return () => {
                if (triggerRef === el) {
                    triggerRef = null;
                }
            };
        },
        registerTriggerId(overrideId: string | undefined): () => void {
            triggerIdOverride = overrideId;
            return () => {
                if (triggerIdOverride === overrideId) {
                    triggerIdOverride = undefined;
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
        getOrderedEnabledItems,
        isSelected(itemValue: T): boolean {
            return value === itemValue;
        },
        select,
        selectWithoutToggle,
        setOpen,
        syncPopoverOpen,
        beginPointerOpen,
        shouldCommitPointerRelease,
        clearPointerOpen,
    });

    // Sync external `bind:open` mutations and dynamic `disabled` without fighting native `popoverTrigger` toggles.
    $effect(() => {
        const popoverEl = contentRef as PopoverElement | null;

        if (disabled && (Boolean(open) || isPopoverDomOpen(contentRef))) {
            clearPointerOpen();
            openFocus = "selected";
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
                popoverEl.showPopover({ source: triggerRef ?? undefined });
            }
            return;
        }

        clearPointerOpen();
        openFocus = "selected";
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
