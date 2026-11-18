<script lang="ts">
    import { createPointerDragRelease } from "../../shared/listbox/pointer-drag-release.ts";
    import {
        setDropdownContext,
        type DropdownOpenFocus,
        type DropdownOpenOptions,
    } from "./dropdown.context.internal.ts";
    import type { DropdownProps } from "./index.ts";

    type PopoverElement = HTMLDivElement & {
        showPopover: (options?: { source?: HTMLElement }) => void;
        hidePopover: () => void;
    };

    let { open = $bindable(false), onOpenChange, size, disabled = false, id, children }: DropdownProps = $props();

    const generatedId = $props.id();

    let triggerIdOverride = $state<string | undefined>();
    let menuIdOverride = $state<string | undefined>();
    let triggerRef = $state<HTMLElement | null>(null);
    let contentRef = $state<HTMLDivElement | null>(null);

    let openFocus: DropdownOpenFocus = "first";
    let lastSyncedOpen = false;
    let reconcilingToggle: boolean | null = null;
    const { beginPointerOpen, shouldCommitPointerRelease, clearPointerOpen } = createPointerDragRelease(
        () => triggerRef
    );

    const defaultTriggerId = $derived(id ?? `${generatedId}-trigger`);
    const defaultMenuId = $derived(`${id ?? generatedId}-menu`);
    const triggerId = $derived(triggerIdOverride ?? defaultTriggerId);
    const menuId = $derived(menuIdOverride ?? defaultMenuId);

    function isPopoverDomOpen(el: HTMLDivElement | null): boolean {
        if (!el) return false;
        try {
            return el.matches(":popover-open");
        } catch {
            return false;
        }
    }

    function setOpen(nextOpen: boolean, options?: DropdownOpenOptions): void {
        if (nextOpen && disabled) return;

        const popoverEl = contentRef as PopoverElement | null;

        if (nextOpen) {
            if (!open) {
                open = true;
                onOpenChange?.(true);
            }
            if (!open) {
                lastSyncedOpen = false;
                openFocus = "first";
                return;
            }
            openFocus = options?.openFocus ?? "first";
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
        openFocus = "first";
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
                openFocus = "first";
            }
            return;
        }

        lastSyncedOpen = Boolean(open);
        if (reconcilingToggle !== nextOpen) {
            try {
                reconcilingToggle = nextOpen;
                if (nextOpen) {
                    clearPointerOpen();
                    openFocus = "first";
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

    setDropdownContext({
        get size() {
            return size;
        },
        get open() {
            return Boolean(open);
        },
        get disabled() {
            return Boolean(disabled);
        },
        get triggerId() {
            return triggerId;
        },
        get menuId() {
            return menuId;
        },
        get triggerRef() {
            return triggerRef;
        },
        get contentRef() {
            return contentRef;
        },
        get openFocus() {
            return openFocus;
        },
        registerTrigger(el: HTMLElement | null): () => void {
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
        registerMenuId(overrideId: string | undefined): () => void {
            menuIdOverride = overrideId;
            return () => {
                if (menuIdOverride === overrideId) {
                    menuIdOverride = undefined;
                }
            };
        },
        setOpen,
        syncPopoverOpen,
        beginPointerOpen,
        shouldCommitPointerRelease,
        clearPointerOpen,
    });

    // Keep trigger ARIA/state attributes synced without forcing dropdownTrigger attachment to tear down.
    $effect(() => {
        const el = triggerRef;
        if (!el) return;
        const isOpen = Boolean(open);
        el.setAttribute("aria-expanded", isOpen ? "true" : "false");
        el.setAttribute("aria-controls", menuId);
        if (isOpen) {
            el.dataset.open = "";
        } else {
            delete el.dataset.open;
        }
    });

    // Sync external `bind:open` mutations and dynamic `disabled` without fighting native `popoverTrigger` toggles.
    $effect(() => {
        const popoverEl = contentRef as PopoverElement | null;

        if (disabled && (Boolean(open) || isPopoverDomOpen(contentRef))) {
            clearPointerOpen();
            openFocus = "first";
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
        openFocus = "first";
        if (isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
            popoverEl.hidePopover();
        }
    });

    $effect(() => {
        return clearPointerOpen;
    });
</script>

{@render children?.()}
