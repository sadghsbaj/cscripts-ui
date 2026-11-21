<script lang="ts">
    import {
        setContextMenuContext,
        type ContextMenuOpenOptions,
        type ContextMenuOpenOrigin,
    } from "./context-menu.context.internal.ts";
    import type { ContextMenuProps } from "./index.ts";

    type PopoverElement = HTMLDivElement & {
        showPopover: (options?: { source?: HTMLElement }) => void;
        hidePopover: () => void;
    };

    const DRAG_DISTANCE_THRESHOLD_PX = 4;

    let { open = $bindable(false), onOpenChange, size, disabled = false, id, children }: ContextMenuProps = $props();

    const generatedId = $props.id();

    let menuIdOverride = $state<string | undefined>();
    let activeTriggerRef = $state<HTMLElement | null>(null);
    let contentRef = $state<HTMLDivElement | null>(null);
    let anchorX = $state(0);
    let anchorY = $state(0);
    let openOrigin = $state<ContextMenuOpenOrigin>("pointer");
    let openSequence = $state(0);
    let isInstantReposition = $state(false);

    let restoreFocusTarget: HTMLElement | null = null;
    let lastSyncedOpen = false;
    let reconcilingToggle: boolean | null = null;
    let instantFrameId: number | null = null;

    let pointerDragActive = false;
    let pointerStartX = 0;
    let pointerStartY = 0;

    const defaultMenuId = $derived(`${id ?? generatedId}-menu`);
    const menuId = $derived(menuIdOverride ?? defaultMenuId);

    function isPopoverDomOpen(el: HTMLDivElement | null): boolean {
        if (!el) return false;
        try {
            return el.matches(":popover-open");
        } catch {
            return false;
        }
    }

    function clampAnchorCoord(value: number, viewportSize: number): number {
        if (viewportSize <= 8) return Math.max(0, value);
        return Math.min(Math.max(4, value), viewportSize - 4);
    }

    function cancelInstantFrame(): void {
        if (instantFrameId === null || typeof cancelAnimationFrame !== "function") return;
        cancelAnimationFrame(instantFrameId);
        instantFrameId = null;
    }

    function scheduleClearInstantReposition(): void {
        cancelInstantFrame();
        if (typeof requestAnimationFrame === "function") {
            instantFrameId = requestAnimationFrame(() => {
                instantFrameId = null;
                isInstantReposition = false;
            });
        } else {
            isInstantReposition = false;
        }
    }

    function handleWindowPointerEnd(): void {
        clearPointerOpen();
    }

    function clearPointerOpen(): void {
        pointerDragActive = false;
        if (typeof window !== "undefined") {
            window.removeEventListener("pointerup", handleWindowPointerEnd);
            window.removeEventListener("pointercancel", handleWindowPointerEnd);
        }
    }

    function beginPointerOpen(clientX: number, clientY: number): void {
        clearPointerOpen();
        pointerDragActive = true;
        pointerStartX = clientX;
        pointerStartY = clientY;

        if (typeof window !== "undefined") {
            window.addEventListener("pointerup", handleWindowPointerEnd, { once: true });
            window.addEventListener("pointercancel", handleWindowPointerEnd, { once: true });
        }
    }

    function shouldCommitPointerRelease(event: PointerEvent): boolean {
        if (!pointerDragActive) return false;
        if (event.pointerType !== "mouse" || event.button !== 2) return false;
        if (!(event.target instanceof Element) || !event.target.closest(".cs-context-menu-item")) return false;

        // Gate right-button drag-release strictly on pointer travel distance so macOS/Linux
        // pointerup after right-click does not accidentally activate the first item.
        const distance = Math.hypot(event.clientX - pointerStartX, event.clientY - pointerStartY);
        return distance >= DRAG_DISTANCE_THRESHOLD_PX;
    }

    function captureRestoreFocusTarget(trigger: HTMLElement): void {
        const active = typeof document !== "undefined" ? document.activeElement : null;
        if (active instanceof HTMLElement && active !== contentRef && !contentRef?.contains(active)) {
            restoreFocusTarget = active;
            return;
        }
        if (trigger !== activeTriggerRef || !restoreFocusTarget?.isConnected) {
            restoreFocusTarget = trigger;
        }
    }

    function restoreFocus(): void {
        const target = restoreFocusTarget;
        restoreFocusTarget = null;
        if (target && target.isConnected) {
            target.focus({ preventScroll: true });
        }
    }

    function setOpen(nextOpen: boolean, options?: ContextMenuOpenOptions): void {
        if (nextOpen && disabled) return;

        const popoverEl = contentRef as PopoverElement | null;

        if (nextOpen) {
            if (!open) {
                open = true;
                onOpenChange?.(true);
            }
            if (!open) {
                clearPointerOpen();
                lastSyncedOpen = false;
                return;
            }
            lastSyncedOpen = true;
            if (popoverEl && !isPopoverDomOpen(popoverEl) && typeof popoverEl.showPopover === "function") {
                popoverEl.showPopover();
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
        cancelInstantFrame();
        isInstantReposition = false;
        lastSyncedOpen = false;
        if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
            popoverEl.hidePopover();
        }
        if (options?.restoreFocus !== false) {
            restoreFocus();
        }
    }

    function openAt(
        trigger: HTMLElement,
        clientX: number,
        clientY: number,
        origin: ContextMenuOpenOrigin,
        event: MouseEvent | KeyboardEvent,
        onOpen?: (event: MouseEvent | KeyboardEvent) => void
    ): void {
        if (disabled) return;

        const wasAlreadyOpen = Boolean(open) || isPopoverDomOpen(contentRef);

        if (origin === "keyboard") {
            captureRestoreFocusTarget(trigger);
        } else {
            restoreFocusTarget = null;
        }
        activeTriggerRef = trigger;
        anchorX = typeof window !== "undefined" ? clampAnchorCoord(clientX, window.innerWidth) : clientX;
        anchorY = typeof window !== "undefined" ? clampAnchorCoord(clientY, window.innerHeight) : clientY;
        openOrigin = origin;
        openSequence += 1;

        onOpen?.(event);

        if (origin === "pointer") {
            beginPointerOpen(clientX, clientY);
        } else {
            clearPointerOpen();
        }

        if (wasAlreadyOpen) {
            isInstantReposition = true;
            scheduleClearInstantReposition();
        } else {
            cancelInstantFrame();
            isInstantReposition = false;
        }

        setOpen(true);
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
                cancelInstantFrame();
                isInstantReposition = false;
            }
            return;
        }

        lastSyncedOpen = Boolean(open);
        if (reconcilingToggle !== nextOpen) {
            try {
                reconcilingToggle = nextOpen;
                if (nextOpen) {
                    clearPointerOpen();
                    cancelInstantFrame();
                    isInstantReposition = false;
                    if (popoverEl && isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
                        popoverEl.hidePopover();
                    }
                } else if (
                    !disabled &&
                    popoverEl &&
                    !isPopoverDomOpen(popoverEl) &&
                    typeof popoverEl.showPopover === "function"
                ) {
                    popoverEl.showPopover();
                }
            } finally {
                reconcilingToggle = null;
            }
        }
    }

    setContextMenuContext({
        get size() {
            return size;
        },
        get open() {
            return Boolean(open);
        },
        get disabled() {
            return Boolean(disabled);
        },
        get menuId() {
            return menuId;
        },
        get activeTriggerRef() {
            return activeTriggerRef;
        },
        get contentRef() {
            return contentRef;
        },
        get anchorX() {
            return anchorX;
        },
        get anchorY() {
            return anchorY;
        },
        get openOrigin() {
            return openOrigin;
        },
        get openSequence() {
            return openSequence;
        },
        get isInstantReposition() {
            return isInstantReposition;
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
        unregisterTrigger(el: HTMLElement): void {
            if (activeTriggerRef === el) {
                delete el.dataset.open;
                activeTriggerRef = null;
            }
            if (restoreFocusTarget === el) {
                restoreFocusTarget = null;
            }
        },
        openAt,
        setOpen,
        syncPopoverOpen,
        restoreFocus,
        shouldCommitPointerRelease,
        clearPointerOpen,
    });

    // Expose data-open only on the currently active trigger while the menu is open.
    $effect(() => {
        const el = activeTriggerRef;
        if (!el || !open) return;
        el.dataset.open = "";
        return () => {
            delete el.dataset.open;
        };
    });

    // Sync external `bind:open` mutations and dynamic `disabled`.
    $effect(() => {
        const popoverEl = contentRef as PopoverElement | null;

        if (disabled && (Boolean(open) || isPopoverDomOpen(contentRef))) {
            clearPointerOpen();
            cancelInstantFrame();
            isInstantReposition = false;
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
                popoverEl.showPopover();
            }
            return;
        }

        clearPointerOpen();
        cancelInstantFrame();
        isInstantReposition = false;
        if (isPopoverDomOpen(popoverEl) && typeof popoverEl.hidePopover === "function") {
            popoverEl.hidePopover();
        }
    });

    function cleanupOnUnmount(): void {
        clearPointerOpen();
        cancelInstantFrame();
    }

    $effect(() => cleanupOnUnmount);
</script>

{@render children?.()}
