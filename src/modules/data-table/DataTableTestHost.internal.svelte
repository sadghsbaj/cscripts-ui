<script lang="ts" module>
    export interface DeclarativeHeaderSpec {
        columnId?: string;
        label: string;
        width?: number | string;
        minWidth?: number;
        maxWidth?: number;
        sortable?: boolean;
        filterable?: boolean;
        selection?: boolean;
        pinned?: "start" | "end";
        onTrigger?: (event: MouseEvent | KeyboardEvent) => void;
    }
</script>

<script lang="ts" generics="TRow extends Record<string, unknown> = Record<string, unknown>">
    import type { Snippet } from "svelte";

    import {
        DataTable,
        DataTableBody,
        DataTableCell,
        DataTableEmpty,
        DataTableHead,
        DataTableHeaderCell,
        DataTableRow,
        DataTableStatusBar,
        type DataTableCellRenderContext,
        type DataTableController,
        type DataTableRole,
        type DataTableRowId,
        type DataTableRowRenderContext,
        type DataTableSize,
        type DataTableVariant,
    } from "./index.ts";

    interface Props {
        mode?: "controller" | "declarative";
        variant?: DataTableVariant;
        size?: DataTableSize;
        table?: DataTableController<TRow>;
        striped?: boolean;
        gridlines?: boolean;
        wrap?: boolean;
        role?: DataTableRole;
        gridColumns?: string;
        minWidth?: number | string;
        label?: string;
        showStatusBar?: boolean;
        showEmpty?: boolean;
        emptyHideReset?: boolean;
        useBodyCellSnippet?: boolean;
        useBodyRowSnippet?: boolean;
        onRowClick?: (row: TRow, context: { rowId: DataTableRowId; rowIndex: number; event: MouseEvent }) => void;
        customCell?: Snippet<[DataTableCellRenderContext<TRow>]>;
        declarativeHeaders?: readonly DeclarativeHeaderSpec[];
        declarativeRows?: readonly (readonly string[])[];
        ref?: HTMLDivElement | null;
        viewportRef?: HTMLDivElement | null;
    }

    let {
        mode = "controller",
        variant = "elevated",
        size = "md",
        table,
        striped = false,
        gridlines = false,
        wrap = false,
        role = "table",
        gridColumns,
        minWidth,
        label,
        showStatusBar = false,
        showEmpty = false,
        emptyHideReset = false,
        useBodyCellSnippet = false,
        useBodyRowSnippet = false,
        onRowClick,
        customCell,
        declarativeHeaders = [],
        declarativeRows = [],
        ref = $bindable(null),
        viewportRef = $bindable(null),
    }: Props = $props();
</script>

{#snippet bodyCellSnippet(ctx: DataTableCellRenderContext<TRow>)}
    <span class="custom-body-cell" data-col={ctx.column.id} data-table-rows={table?.rowCount ?? 0}>
        body:{ctx.formatted}
    </span>
{/snippet}

{#snippet bodyRowSnippet(ctx: DataTableRowRenderContext<TRow>)}
    <DataTableRow
        {...ctx.ariaProps}
        {@attach ctx.attachRow}
        selected={ctx.isSelected}
        even={ctx.isEven}
        class="custom-body-row"
        data-custom-row-id={String(ctx.rowId)}
    >
        {#each table?.columns ?? [] as col (col.id)}
            <DataTableCell>row-snippet:{String(ctx.row[col.id] ?? "")}</DataTableCell>
        {/each}
    </DataTableRow>
{/snippet}

<DataTable
    bind:ref
    bind:viewportRef
    {variant}
    {size}
    table={mode === "controller" ? table : undefined}
    {striped}
    {gridlines}
    {wrap}
    {role}
    {gridColumns}
    {minWidth}
    {label}
>
    {#if mode === "declarative"}
        <DataTableHead>
            {#each declarativeHeaders as header, i (header.columnId ?? i)}
                <DataTableHeaderCell
                    columnId={header.columnId}
                    width={header.width}
                    minWidth={header.minWidth}
                    maxWidth={header.maxWidth}
                    sortable={header.sortable}
                    filterable={header.filterable}
                    selection={header.selection}
                    pinned={header.pinned}
                    onTrigger={header.onTrigger}
                >
                    {header.label}
                </DataTableHeaderCell>
            {/each}
        </DataTableHead>
        <DataTableBody>
            {#each declarativeRows as rowValues, rowIdx (rowIdx)}
                <DataTableRow even={rowIdx % 2 === 1}>
                    {#each rowValues as cellValue, colIdx (colIdx)}
                        <DataTableCell>{cellValue}</DataTableCell>
                    {/each}
                </DataTableRow>
            {/each}
        </DataTableBody>
    {:else}
        <DataTableHead />
        <DataTableBody
            {onRowClick}
            cell={customCell ?? (useBodyCellSnippet ? bodyCellSnippet : undefined)}
            row={useBodyRowSnippet ? bodyRowSnippet : undefined}
        />
        {#if showEmpty}
            <DataTableEmpty hideReset={emptyHideReset} />
        {/if}
        {#if showStatusBar}
            <DataTableStatusBar />
        {/if}
    {/if}
</DataTable>
