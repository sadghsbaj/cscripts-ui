<script lang="ts">
    import type { Attachment } from "svelte/attachments";

    import { t } from "../../shared/lang.internal.ts";
    import { Button, ButtonLabel } from "../button/index.ts";
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type { DataTableStatusBarProps } from "./index.ts";

    let {
        ref = $bindable(null),
        selectionActions,
        filterActions,
        class: className,
        children,
        ...rest
    }: DataTableStatusBarProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;
    const table = $derived(ctx?.table);

    const isSelectionMode = $derived(Boolean(table && table.selectedCount > 0));
    const isFilterMode = $derived(Boolean(table && !isSelectionMode && table.activeFilterCount > 0));
    const isOpen = $derived(Boolean(children || isSelectionMode || isFilterMode));
    const mode = $derived<"selection" | "filter">(isSelectionMode ? "selection" : "filter");

    const displayedFilterColumns = $derived.by(() => {
        const cols = table?.activeFilterColumns ?? [];
        if (cols.length <= 3) return cols;
        return cols.slice(0, 2);
    });

    const overflowFilterColumnCount = $derived.by(() => {
        const total = table?.activeFilterColumns.length ?? 0;
        return total > 3 ? total - 2 : 0;
    });

    $effect(() => {
        if (!ctx) return;
        ctx.setStatusBarVisible(isOpen);
        return () => {
            ctx.setStatusBarVisible(false);
        };
    });

    // Move status bar into the bottom dock below ScrollArea when authored inside <DataTable> children.
    const dockAtBottom: Attachment<HTMLElement> = (node) => {
        const dock = ctx?.statusBarDockEl;
        if (!dock || node.parentElement === dock) return;

        dock.append(node);
        return () => {
            if (node.parentElement === dock) {
                node.remove();
            }
        };
    };
</script>

<div
    bind:this={ref}
    {...rest}
    {@attach dockAtBottom}
    class={["cs-data-table-status-bar-shell", className]}
    data-open={isOpen ? "" : undefined}
    data-mode={mode}
    inert={!isOpen ? true : undefined}
>
    <div class="cs-data-table-status-bar-clip">
        <div class="cs-data-table-status-bar" data-mode={mode}>
            {#if children}
                {@render children()}
            {:else if table && isSelectionMode}
                <div class="cs-data-table-status-bar-start">
                    <span class="cs-data-table-status-bar-summary" role="status" aria-live="polite">
                        {t({
                            de: `${table.selectedCount.toLocaleString()} ausgewählt`,
                            en: `${table.selectedCount.toLocaleString()} selected`,
                        })}
                    </span>
                    {#if !table.allVisibleSelected && table.rowCount > 0}
                        <Button variant="ghost" size="xs" onclick={() => table.selectAllMatching()}>
                            <ButtonLabel>
                                {t({
                                    de: `Alle ${table.rowCount.toLocaleString()} auswählen`,
                                    en: `Select all ${table.rowCount.toLocaleString()}`,
                                })}
                            </ButtonLabel>
                        </Button>
                    {/if}
                </div>
                <div class="cs-data-table-status-bar-end">
                    {#if selectionActions}
                        {@render selectionActions({
                            selectedCount: table.selectedCount,
                            clearSelection: table.clearSelection,
                        })}
                    {/if}
                    <Button variant="ghost" size="xs" onclick={() => table.clearSelection()}>
                        <ButtonLabel>{t({ de: "Leeren", en: "Clear" })}</ButtonLabel>
                    </Button>
                </div>
            {:else if table && isFilterMode}
                <div class="cs-data-table-status-bar-start">
                    <span class="cs-data-table-status-bar-summary" role="status" aria-live="polite">
                        {t({
                            de: `${table.rowCount.toLocaleString()} von ${table.totalRowCount.toLocaleString()} Zeilen`,
                            en: `${table.rowCount.toLocaleString()} of ${table.totalRowCount.toLocaleString()} rows`,
                        })}
                    </span>
                    {#if displayedFilterColumns.length > 0}
                        <span class="cs-data-table-status-bar-dot" aria-hidden="true"></span>
                        <div class="cs-data-table-status-bar-columns">
                            {#each displayedFilterColumns as col (col.id)}
                                <button
                                    type="button"
                                    class="cs-data-table-status-bar-column-btn"
                                    onclick={() => table.openColumnPopover(col.id)}
                                >
                                    {col.label}
                                </button>
                            {/each}
                            {#if overflowFilterColumnCount > 0}
                                <span class="cs-data-table-status-bar-more">
                                    {t({
                                        de: `+${overflowFilterColumnCount} weitere`,
                                        en: `+${overflowFilterColumnCount} more`,
                                    })}
                                </span>
                            {/if}
                        </div>
                    {/if}
                </div>
                <div class="cs-data-table-status-bar-end">
                    {#if filterActions}
                        {@render filterActions({
                            activeFilterCount: table.activeFilterCount,
                            clearAllFilters: table.clearAllFilters,
                        })}
                    {:else}
                        <Button variant="ghost" size="xs" onclick={() => table.clearAllFilters()}>
                            <ButtonLabel>{t({ de: "Filter zurücksetzen", en: "Reset filters" })}</ButtonLabel>
                        </Button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>
