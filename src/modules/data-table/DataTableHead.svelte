<script lang="ts">
    import { t } from "../../shared/lang.internal.ts";
    import { Checkbox, type CheckboxSize, type CheckboxVariant } from "../checkbox/index.ts";
    import { isFilterActive, resolveColumnAlign } from "./data-table-engine.internal.ts";
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import DataTableHeaderCell from "./DataTableHeaderCell.svelte";
    import type { DataTableHeadProps } from "./index.ts";

    let { ref = $bindable(null), class: className, children, ...rest }: DataTableHeadProps = $props();

    const ctx = hasDataTableContext() ? getDataTableContext() : undefined;
    const table = $derived(ctx?.table);

    const checkboxVariant = $derived<CheckboxVariant>(ctx?.variant === "soft" ? "elevated" : "soft");

    const checkboxSize = $derived.by<CheckboxSize>(() => {
        switch (ctx?.size) {
            case "xs": {
                return "xs";
            }
            case "lg": {
                return "md";
            }
            default: {
                return "sm";
            }
        }
    });

    function handleToggleAllVisible(): void {
        if (!table) return;
        if (table.allVisibleSelected) {
            table.deselectAllVisible();
        } else {
            table.selectAllVisible();
        }
    }
</script>

<div bind:this={ref} role="rowgroup" {...rest} class={["cs-data-table-header", className]}>
    <div role="row" aria-rowindex={1} class="cs-data-table-header-row">
        {#if children}
            {@render children()}
        {:else if table}
            {#if table.selectable}
                <DataTableHeaderCell selection aria-colindex={1}>
                    <label class="cs-data-table-selection-hit">
                        <span class="cs-data-table-checkbox-wrap">
                            <Checkbox
                                variant={checkboxVariant}
                                size={checkboxSize}
                                aria-label={t({ de: "Alle Zeilen auswählen", en: "Select all rows" })}
                                disabled={table.rowCount === 0}
                                bind:checked={() => table.allVisibleSelected, handleToggleAllVisible}
                                bind:indeterminate={() => table.someVisibleSelected, () => {}}
                            />
                        </span>
                    </label>
                </DataTableHeaderCell>
            {/if}

            {#each table.columns as column, idx (column.id)}
                {let sortInfo = table.getColumnSort(column.id)}
                {let isFiltered = isFilterActive(table.filters[column.id])}
                {let colIndex = (table.selectable ? 2 : 1) + idx}
                <DataTableHeaderCell
                    columnId={column.id}
                    align={resolveColumnAlign(column)}
                    width={column.width}
                    minWidth={column.minWidth}
                    maxWidth={column.maxWidth}
                    sortable={column.sortable}
                    filterable={column.filterable}
                    sort={sortInfo?.direction ?? null}
                    sortPriority={table.sorting.length > 1 ? sortInfo?.priority : undefined}
                    filtered={isFiltered}
                    pinned={column.pinned}
                    aria-colindex={colIndex}
                >
                    {#if column.header}
                        {@render column.header({ column })}
                    {:else}
                        {column.label}
                    {/if}
                </DataTableHeaderCell>
            {/each}
        {/if}
    </div>
</div>
