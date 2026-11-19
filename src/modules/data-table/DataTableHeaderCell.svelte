<script lang="ts">
    import { untrack } from "svelte";
    import { ChevronDown, ListFilter } from "@lucide/svelte";

    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type { DataTableHeaderCellProps } from "./index.ts";

    let {
        ref = $bindable(null),
        columnId,
        align = "start",
        width,
        minWidth,
        maxWidth,
        sortable = false,
        filterable = false,
        sort = null,
        sortPriority,
        filtered = false,
        open,
        selection = false,
        pinned,
        onTrigger,
        class: className,
        children,
        ...rest
    }: DataTableHeaderCellProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;
    const registrationId = Symbol("cs-data-table-header-cell");

    let triggerRef = $state<HTMLButtonElement | null>(null);

    const resolvedPinned = $derived(pinned ?? (selection ? "start" : undefined));
    const isInteractive = $derived(!selection && Boolean(sortable || filterable || onTrigger));
    const isOpen = $derived(open ?? (columnId && ctx ? ctx.isPopoverOpenFor(columnId) : false));

    const ariaSort = $derived.by(() => {
        if (sort === "asc") return "ascending" as const;
        if (sort === "desc") return "descending" as const;
        if (sortable) return "none" as const;
        return;
    });

    $effect(() => {
        if (!ctx) return;
        const entry = untrack(() => ({
            id: registrationId,
            columnId,
            width,
            minWidth,
            maxWidth,
            selection,
            pinned: resolvedPinned,
            element: ref,
        }));
        return ctx.registerHeaderCell(entry);
    });

    $effect(() => {
        if (!ctx) return;
        ctx.updateHeaderCell(registrationId, {
            columnId,
            width,
            minWidth,
            maxWidth,
            selection,
            pinned: resolvedPinned,
            element: ref,
        });
    });

    $effect(() => {
        if (!ctx || !columnId || !isInteractive) return;
        return ctx.registerHeaderTrigger(columnId, triggerRef);
    });

    function handleTriggerPointerDown(event: PointerEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        if (onTrigger || !ctx || !columnId || !filterable) return;
        ctx.handleHeaderTriggerPointerDown(columnId, event, event.currentTarget);
    }

    function handleTriggerClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        if (onTrigger) {
            onTrigger(event);
            return;
        }
        if (!ctx || !columnId) return;
        if (filterable) {
            ctx.handleHeaderTriggerClick(columnId, event, event.currentTarget);
            return;
        }
        if (sortable) {
            ctx.table?.toggleSort(columnId, { multi: event.shiftKey });
        }
    }

    function handleTriggerKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }): void {
        if (onTrigger) {
            if (event.key === "ArrowDown" && filterable) {
                event.preventDefault();
                onTrigger(event);
            }
            return;
        }
        if (!ctx || !columnId || !filterable) return;
        ctx.handleHeaderTriggerKeyDown(columnId, event, event.currentTarget);
    }
</script>

<div
    bind:this={ref}
    role="columnheader"
    aria-sort={ariaSort}
    {...rest}
    class={["cs-data-table-header-cell", className]}
    data-align={align}
    data-sort={sort ?? undefined}
    data-filtered={filtered ? "" : undefined}
    data-open={isOpen ? "" : undefined}
    data-selection={selection ? "" : undefined}
    data-pinned={resolvedPinned}
    data-interactive={isInteractive ? "" : undefined}
>
    {#if isInteractive}
        <button
            bind:this={triggerRef}
            type="button"
            class="cs-data-table-header-trigger"
            popovertarget={filterable && ctx ? ctx.popoverId : undefined}
            aria-haspopup={filterable ? "dialog" : undefined}
            aria-expanded={filterable ? (isOpen ? "true" : "false") : undefined}
            aria-controls={filterable && isOpen && ctx ? ctx.popoverId : undefined}
            style:anchor-name={columnId && isOpen && ctx ? `--anchor-${ctx.popoverId}` : undefined}
            onpointerdown={handleTriggerPointerDown}
            onclick={handleTriggerClick}
            onkeydown={handleTriggerKeyDown}
        >
            <span class="cs-data-table-header-label">
                {@render children?.()}
            </span>
            <span class="cs-data-table-header-indicators" aria-hidden="true">
                {#if sortable}
                    <svg
                        class="cs-data-table-header-icon cs-data-table-header-sort-dual"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path class="cs-data-table-header-sort-up" stroke="currentColor" d="M5 6.25 8 3.25 11 6.25" />
                        <path class="cs-data-table-header-sort-down" stroke="currentColor" d="M5 9.75 8 12.75 11 9.75" />
                    </svg>
                    {#if sort && sortPriority !== undefined && sortPriority > 0}
                        <span class="cs-data-table-header-sort-priority">{sortPriority}</span>
                    {/if}
                {/if}
                {#if filtered}
                    <ListFilter class="cs-data-table-header-icon cs-data-table-header-filter-icon" />
                {/if}
                {#if (filterable || onTrigger) && !sortable}
                    <ChevronDown class="cs-data-table-header-icon cs-data-table-header-cue" />
                {/if}
            </span>
        </button>
    {:else if selection}
        {@render children?.()}
    {:else}
        <span class="cs-data-table-header-label">
            {@render children?.()}
        </span>
    {/if}
</div>
