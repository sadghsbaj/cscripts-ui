<script lang="ts" generics="TRow = Record<string, unknown>">
    import { untrack } from "svelte";
    import type { Attachment } from "svelte/attachments";

    import "./data-table.css";

    import { createPointerDragRelease } from "../../shared/listbox/pointer-drag-release.ts";
    import { createSurfaceRadius } from "../../shared/surface-radius/index.ts";
    import { ScrollArea, ScrollAreaContent, type ScrollAreaSize } from "../scroll-area/index.ts";
    import type { VirtualScrollScrollToIndexOptions } from "../virtual-scroll/index.ts";
    import {
        compileGridTracks,
        DATA_TABLE_SELECTION_WIDTH_PX,
        resolveColumnAlign,
    } from "./data-table-engine.internal.ts";
    import { dataTableScrollState, type DataTableScrollState } from "./data-table-scroll.internal.ts";
    import { setDataTableContext, type DataTableHeaderRegistration } from "./data-table.context.ts";
    import DataTableColumnPopover from "./DataTableColumnPopover.internal.svelte";
    import type { DataTableProps } from "./index.ts";

    type PopoverElement = HTMLElement & {
        showPopover: (options?: { source?: HTMLElement }) => void;
        hidePopover: () => void;
    };

    const noopAttachment: Attachment<HTMLElement> = () => {};

    let {
        ref = $bindable(null),
        viewportRef = $bindable(null),
        variant,
        size,
        table,
        striped = false,
        gridlines = false,
        wrap = false,
        colorMode = "tint",
        role = "table",
        scrollbar = "hover",
        gridColumns,
        minWidth,
        label,
        labelledBy,
        class: className,
        children,
        ...rest
    }: DataTableProps<TRow> = $props();

    const uid = $props.id();
    const popoverId = `cs-data-table-popover-${uid}`;
    const surfaceRadius = createSurfaceRadius(() => (size === "xs" ? "sm" : size));

    let statusBarDockEl = $state<HTMLDivElement | null>(null);
    let statusBarVisible = $state(false);
    let headerRegistrations = $state.raw<readonly DataTableHeaderRegistration[]>([]);

    let scrollState = $state.raw<DataTableScrollState>({
        scrolledY: false,
        scrolledXStart: false,
        scrolledXEnd: false,
        isScrolling: false,
        viewportWidth: 0,
    });

    // eslint-disable-next-line svelte/prefer-svelte-reactivity -- Imperative DOM lookup only; never read reactively.
    const headerTriggers = new Map<string, HTMLElement>();
    let popoverEl: PopoverElement | null = null;
    let activeTriggerEl: HTMLElement | null = null;
    let lastTriggerEl: HTMLElement | null = null;
    let switchingPopover = false;
    let suppressNextClickColumnId: string | null = null;
    let suppressResetTimer: ReturnType<typeof setTimeout> | null = null;
    let cleanupSuppressListeners: (() => void) | null = null;

    const { beginPointerOpen, shouldCommitPointerRelease, clearPointerOpen } = createPointerDragRelease(
        () => activeTriggerEl
    );

    const scrollAreaSize = $derived<ScrollAreaSize>(size === "xs" || size === "sm" ? "sm" : "md");

    const orderedHeaderRegistrations = $derived.by(() => {
        if (headerRegistrations.length <= 1) return headerRegistrations;
        return headerRegistrations.toSorted((a, b) => {
            if (!a.element || !b.element || a.element === b.element) return 0;
            const pos = a.element.compareDocumentPosition(b.element);
            if ((pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) return -1;
            if ((pos & Node.DOCUMENT_POSITION_PRECEDING) !== 0) return 1;
            return 0;
        });
    });

    const compiledTracks = $derived.by(() => {
        if (gridColumns !== undefined) {
            return {
                gridColumns,
                minWidthPx: typeof minWidth === "number" ? minWidth : 0,
            };
        }
        if (table) {
            return compileGridTracks(table.columns, {
                size,
                includeSelection: table.selectable,
            });
        }
        if (orderedHeaderRegistrations.length > 0) {
            return compileGridTracks(orderedHeaderRegistrations, { size });
        }
        return {
            gridColumns: "",
            minWidthPx: 0,
        };
    });

    const resolvedMinWidth = $derived.by(() => {
        if (minWidth !== undefined) {
            return typeof minWidth === "number" ? `${minWidth}px` : minWidth;
        }
        return compiledTracks.minWidthPx > 0 ? `${compiledTracks.minWidthPx}px` : undefined;
    });

    const hasPinnedStart = $derived.by(() => {
        if (table) {
            return table.selectable || table.columns.some((col) => col.pinned === "start");
        }
        return orderedHeaderRegistrations.some((reg) => reg.pinned === "start" || reg.selection);
    });

    const hasPinnedEnd = $derived.by(() => {
        if (table) {
            return table.columns.some((col) => col.pinned === "end");
        }
        return orderedHeaderRegistrations.some((reg) => reg.pinned === "end");
    });

    const ariaRowCount = $derived(table ? table.rowCount + 1 : undefined);
    const ariaColCount = $derived.by(() => {
        if (table) {
            return table.columns.length + (table.selectable ? 1 : 0);
        }
        return orderedHeaderRegistrations.length > 0 ? orderedHeaderRegistrations.length : undefined;
    });

    const attachVirtualViewport = $derived<Attachment<HTMLElement>>(
        table?.isVirtualized && table.virtual ? table.virtual.attachViewport : noopAttachment
    );

    const scrollAttachment = dataTableScrollState({
        onStateChange: (next) => {
            scrollState = next;
        },
    });

    function isPopoverDomOpen(el: HTMLElement | null): boolean {
        if (!el) return false;
        try {
            return el.matches(":popover-open");
        } catch {
            return false;
        }
    }

    function clearSuppressNextClick(): void {
        suppressNextClickColumnId = null;
        if (suppressResetTimer !== null) {
            clearTimeout(suppressResetTimer);
            suppressResetTimer = null;
        }
        if (cleanupSuppressListeners !== null) {
            cleanupSuppressListeners();
            cleanupSuppressListeners = null;
        }
    }

    function armSuppressNextClick(columnId: string): void {
        clearSuppressNextClick();
        suppressNextClickColumnId = columnId;
        if (typeof window === "undefined") return;

        // Releasing outside the trigger emits no click, so clear on the next task to avoid leaking.
        const resetSuppression = (): void => {
            cleanupSuppressListeners?.();
            cleanupSuppressListeners = null;

            if (suppressResetTimer !== null) {
                clearTimeout(suppressResetTimer);
            }
            suppressResetTimer = setTimeout(() => {
                clearSuppressNextClick();
            }, 0);
        };

        window.addEventListener("pointerup", resetSuppression);
        window.addEventListener("pointercancel", resetSuppression);
        cleanupSuppressListeners = () => {
            window.removeEventListener("pointerup", resetSuppression);
            window.removeEventListener("pointercancel", resetSuppression);
        };
    }

    function scrollToColumn(columnId: string, options?: { behavior?: "auto" | "instant" | "smooth" }): void {
        const vp = viewportRef;
        if (!vp) return;
        const headerEl =
            headerTriggers.get(columnId) ??
            orderedHeaderRegistrations.find((reg) => reg.columnId === columnId)?.element ??
            null;
        if (!headerEl) return;

        const vpRect = vp.getBoundingClientRect();
        const elRect = headerEl.getBoundingClientRect();
        const pinnedLeadReserve = table?.selectable ? DATA_TABLE_SELECTION_WIDTH_PX[size] : 0;

        const visibleStart = vpRect.left + pinnedLeadReserve;
        const visibleEnd = vpRect.right;

        let deltaX = 0;
        if (elRect.left < visibleStart) {
            deltaX = elRect.left - visibleStart - 8;
        } else if (elRect.right > visibleEnd) {
            deltaX = elRect.right - visibleEnd + 8;
        }

        if (Math.abs(deltaX) > 1) {
            vp.scrollBy({
                left: deltaX,
                behavior: options?.behavior ?? "auto",
            });
        }
    }

    function scrollToRowFallback(viewIndex: number, options?: VirtualScrollScrollToIndexOptions): void {
        const vp = viewportRef;
        if (!vp) return;
        const rowEl = vp.querySelector<HTMLElement>(
            `.cs-data-table-row[data-row-index="${CSS.escape(String(viewIndex))}"]`
        );
        if (!rowEl) return;

        const align = options?.align ?? "auto";
        const block: "start" | "center" | "end" | "nearest" =
            align === "start" ? "start" : align === "center" ? "center" : align === "end" ? "end" : "nearest";
        rowEl.scrollIntoView({
            block,
            behavior: options?.behavior ?? "auto",
        });
    }

    function openColumnPopover(columnId: string, triggerEl?: HTMLElement | null): void {
        if (!table) return;
        const targetTrigger = triggerEl ?? headerTriggers.get(columnId) ?? null;
        if (!targetTrigger) return;

        scrollToColumn(columnId, { behavior: "instant" });

        const anchorToken = `--anchor-${popoverId}`;
        if (activeTriggerEl && activeTriggerEl !== targetTrigger) {
            activeTriggerEl.style.removeProperty("anchor-name");
        }
        targetTrigger.style.setProperty("anchor-name", anchorToken);
        activeTriggerEl = targetTrigger;
        lastTriggerEl = targetTrigger;

        const col = table.columns.find((c) => c.id === columnId);
        const nextPlacement = col && resolveColumnAlign(col) === "end" ? "bottom-end" : "bottom-start";

        table.syncOpenPopoverColumnId(columnId);

        const pop = popoverEl;
        if (!pop || typeof pop.showPopover !== "function") return;

        pop.dataset.placement = nextPlacement;

        if (isPopoverDomOpen(pop)) {
            switchingPopover = true;
            pop.hidePopover();
            pop.showPopover({ source: targetTrigger });
            queueMicrotask(() => {
                switchingPopover = false;
            });
        } else {
            pop.showPopover({ source: targetTrigger });
        }
    }

    function closeColumnPopover(options?: { restoreFocus?: boolean }): void {
        clearSuppressNextClick();
        clearPointerOpen();
        const pop = popoverEl;
        const restore = options?.restoreFocus ?? false;
        const triggerToFocus = lastTriggerEl;

        if (pop && isPopoverDomOpen(pop) && typeof pop.hidePopover === "function") {
            pop.hidePopover();
        }

        if (activeTriggerEl) {
            activeTriggerEl.style.removeProperty("anchor-name");
            activeTriggerEl = null;
        }

        table?.syncOpenPopoverColumnId(null);

        if (restore && triggerToFocus && triggerToFocus.isConnected) {
            triggerToFocus.focus({ preventScroll: true });
        }
    }

    function markPopoverClosedFromNative(restoreFocus: boolean): void {
        clearSuppressNextClick();
        clearPointerOpen();
        const triggerToFocus = lastTriggerEl;

        if (activeTriggerEl) {
            activeTriggerEl.style.removeProperty("anchor-name");
            activeTriggerEl = null;
        }

        table?.syncOpenPopoverColumnId(null);

        if (restoreFocus && triggerToFocus && triggerToFocus.isConnected) {
            triggerToFocus.focus({ preventScroll: true });
        }
    }

    function handleHeaderTriggerPointerDown(columnId: string, event: PointerEvent, triggerEl: HTMLElement): void {
        if (event.pointerType !== "mouse" || event.button !== 0) return;

        if (table?.openPopoverColumnId === columnId && isPopoverDomOpen(popoverEl)) {
            clearPointerOpen();
            closeColumnPopover({ restoreFocus: false });
            armSuppressNextClick(columnId);
            return;
        }

        openColumnPopover(columnId, triggerEl);
        beginPointerOpen(event.clientX, event.clientY);
        armSuppressNextClick(columnId);
    }

    function handleHeaderTriggerClick(columnId: string, event: MouseEvent, triggerEl: HTMLElement): void {
        if (suppressNextClickColumnId === columnId) {
            clearSuppressNextClick();
            event.preventDefault();
            return;
        }

        // Prevent native `popovertarget` from double-toggling after custom open/close logic.
        event.preventDefault();

        if (table?.openPopoverColumnId === columnId && isPopoverDomOpen(popoverEl)) {
            closeColumnPopover({ restoreFocus: false });
            return;
        }

        openColumnPopover(columnId, triggerEl);
    }

    function handleHeaderTriggerKeyDown(columnId: string, event: KeyboardEvent, triggerEl: HTMLElement): void {
        if (event.key !== "ArrowDown") return;
        event.preventDefault();
        openColumnPopover(columnId, triggerEl);
    }

    // Bind host bridge to controller so programmatic controller APIs work seamlessly.
    $effect(() => {
        if (!table) return;
        return table.attachHost({
            getSize: () => size,
            getWrap: () => wrap,
            openPopover: openColumnPopover,
            closePopover: closeColumnPopover,
            scrollToColumn,
            scrollToRowFallback,
        });
    });

    // Re-invalidate measured virtual row heights when size or wrap changes in measured mode.
    $effect(() => {
        void size;
        void wrap;
        if (table?.isVirtualized && !table.isVirtualFixed) {
            untrack(() => {
                table.virtual?.invalidate(0);
            });
        }
    });

    function cleanupPointerInteraction(): void {
        clearSuppressNextClick();
        clearPointerOpen();
    }

    // Clean up any pending click-suppression timer and drag-release listeners on teardown.
    $effect(() => cleanupPointerInteraction);

    setDataTableContext<TRow>({
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get role() {
            return role;
        },
        get striped() {
            return striped;
        },
        get gridlines() {
            return gridlines;
        },
        get wrap() {
            return wrap;
        },
        get colorMode() {
            return colorMode;
        },
        get popoverId() {
            return popoverId;
        },
        get table() {
            return table;
        },
        get viewportEl() {
            return viewportRef;
        },
        get statusBarDockEl() {
            return statusBarDockEl;
        },
        get hasPinnedStart() {
            return hasPinnedStart;
        },
        get hasPinnedEnd() {
            return hasPinnedEnd;
        },
        get statusBarVisible() {
            return statusBarVisible;
        },
        setStatusBarVisible(visible: boolean): void {
            statusBarVisible = visible;
        },
        registerHeaderCell(entry: DataTableHeaderRegistration): () => void {
            untrack(() => {
                headerRegistrations = [...headerRegistrations, entry];
            });
            return () => {
                untrack(() => {
                    headerRegistrations = headerRegistrations.filter((item) => item.id !== entry.id);
                });
            };
        },
        updateHeaderCell(id: symbol, patch: Partial<Omit<DataTableHeaderRegistration, "id">>): void {
            untrack(() => {
                let changed = false;
                const next = headerRegistrations.map((item) => {
                    if (item.id !== id) return item;
                    if (
                        item.columnId === patch.columnId &&
                        item.width === patch.width &&
                        item.minWidth === patch.minWidth &&
                        item.maxWidth === patch.maxWidth &&
                        item.selection === patch.selection &&
                        item.pinned === patch.pinned &&
                        item.element === patch.element
                    ) {
                        return item;
                    }
                    changed = true;
                    return { ...item, ...patch };
                });
                if (changed) {
                    headerRegistrations = next;
                }
            });
        },
        registerHeaderTrigger(columnId: string, el: HTMLElement | null): () => void {
            if (!el) {
                headerTriggers.delete(columnId);
                return () => {};
            }

            headerTriggers.set(columnId, el);

            // Prevent native `popovertarget` click from double-toggling after `pointerdown` already handled it.
            const onClickCapture = (event: MouseEvent): void => {
                if (suppressNextClickColumnId !== columnId) return;
                clearSuppressNextClick();
                event.preventDefault();
                event.stopImmediatePropagation();
            };

            el.addEventListener("click", onClickCapture, { capture: true });

            return () => {
                el.removeEventListener("click", onClickCapture, { capture: true });
                if (headerTriggers.get(columnId) === el) {
                    headerTriggers.delete(columnId);
                }
            };
        },
        registerColumnPopoverEl(el: HTMLElement | null): () => void {
            popoverEl = el as PopoverElement | null;
            return () => {
                if (popoverEl === el) {
                    popoverEl = null;
                }
            };
        },
        openColumnPopover,
        closeColumnPopover,
        handleHeaderTriggerPointerDown,
        handleHeaderTriggerClick,
        handleHeaderTriggerKeyDown,
        isPopoverOpenFor(columnId: string): boolean {
            return table?.openPopoverColumnId === columnId;
        },
        scrollToColumn,
        isSwitchingPopover(): boolean {
            return switchingPopover;
        },
        markPopoverClosedFromNative,
        shouldCommitPointerRelease,
        clearPointerOpen,
    });
</script>

<div
    bind:this={ref}
    {...rest}
    class={["cs-data-table", className]}
    data-variant={variant}
    data-size={size}
    data-striped={striped ? "" : undefined}
    data-gridlines={gridlines ? "" : undefined}
    data-nested={surfaceRadius.isNested ? "" : undefined}
    data-scrolled-y={scrollState.scrolledY ? "" : undefined}
    data-scrolled-x-start={scrollState.scrolledXStart ? "" : undefined}
    data-scrolled-x-end={scrollState.scrolledXEnd ? "" : undefined}
    data-scrolling={scrollState.isScrolling ? "" : undefined}
    data-status-bar-open={statusBarVisible ? "" : undefined}
    style:--cs-data-table-nested-radius={surfaceRadius.nestedRadius}
    style:--cs-data-table-grid-columns={compiledTracks.gridColumns || undefined}
    style:--cs-data-table-min-width={resolvedMinWidth}
    style:--cs-data-table-viewport-width={scrollState.viewportWidth > 0 ? `${scrollState.viewportWidth}px` : undefined}
>
    <ScrollArea size={scrollAreaSize} direction="both" {scrollbar}>
        <ScrollAreaContent
            bind:ref={viewportRef}
            class="cs-data-table-viewport"
            {@attach scrollAttachment}
            {@attach attachVirtualViewport}
        >
            <div
                {role}
                aria-rowcount={ariaRowCount}
                aria-colcount={ariaColCount}
                aria-label={label}
                aria-labelledby={labelledBy}
                class="cs-data-table-canvas"
            >
                {@render children?.()}
            </div>
        </ScrollAreaContent>
    </ScrollArea>

    <div bind:this={statusBarDockEl} class="cs-data-table-status-bar-dock"></div>

    {#if !hasPinnedStart}
        <div class="cs-data-table-edge-shadow" data-edge="start" aria-hidden="true"></div>
    {/if}
    {#if !hasPinnedEnd}
        <div class="cs-data-table-edge-shadow" data-edge="end" aria-hidden="true"></div>
    {/if}

    {#if table}
        <DataTableColumnPopover />
    {/if}
</div>
