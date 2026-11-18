<script lang="ts" generics="TRow = Record<string, unknown>">
    import type { Attachment } from "svelte/attachments";

    import { t } from "../../shared/lang.internal.ts";
    import { Checkbox, type CheckboxSize, type CheckboxVariant } from "../checkbox/index.ts";
    import { isNumericColumnType, resolveColumnAlign } from "./data-table-engine.internal.ts";
    import { getDataTableContext, hasDataTableContext } from "./data-table.context.ts";
    import type {
        DataTableCellRenderContext,
        DataTableColumn,
        DataTableRowRenderContext,
        DataTableRowView,
    } from "./data-table.svelte.ts";
    import DataTableCell from "./DataTableCell.svelte";
    import DataTableRow from "./DataTableRow.svelte";
    import type { DataTableBodyProps } from "./index.ts";

    const ROW_CLICK_IGNORE_SELECTOR =
        'a, button, input, select, textarea, label, [role="button"], [role="checkbox"], [data-row-click-ignore]';

    const noopAttachment: Attachment<HTMLElement> = () => {};

    let {
        ref = $bindable(null),
        cell,
        row: rowSnippet,
        onRowClick,
        class: className,
        children,
        ...rest
    }: DataTableBodyProps<TRow> = $props();

    const ctx = hasDataTableContext() ? getDataTableContext<TRow>() : undefined;
    const table = $derived(ctx?.table);
    const virtual = $derived(table?.isVirtualized ? table.virtual : null);

    let shiftKeyOnNextToggle = false;

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

    const attachList = $derived<Attachment<HTMLElement>>(virtual ? virtual.attachList : noopAttachment);

    function recordShiftKey(event: MouseEvent): void {
        shiftKeyOnNextToggle = event.shiftKey;
    }

    function handleSelectRow(view: DataTableRowView<TRow>): void {
        if (!table) return;
        const shiftKey = shiftKeyOnNextToggle;
        shiftKeyOnNextToggle = false;
        table.toggleRowSelection(view.rowId, {
            shiftKey,
            viewIndex: view.rowIndex,
        });
    }

    function handleRowClick(
        view: DataTableRowView<TRow>,
        event: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }
    ): void {
        if (!onRowClick) return;
        if (event.target instanceof Element && event.target.closest(ROW_CLICK_IGNORE_SELECTOR) !== null) {
            return;
        }
        onRowClick(view.row, {
            rowId: view.rowId,
            rowIndex: view.rowIndex,
            event,
        });
    }

    function handleRowKeyDown(
        view: DataTableRowView<TRow>,
        event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }
    ): void {
        if (!onRowClick || event.target !== event.currentTarget) return;
        if (event.key === "Enter") {
            event.preventDefault();
            onRowClick(view.row, {
                rowId: view.rowId,
                rowIndex: view.rowIndex,
                event: new MouseEvent("click", { bubbles: true, cancelable: true }),
            });
        }
    }

    function buildRowRenderContext(view: DataTableRowView<TRow>): DataTableRowRenderContext<TRow> {
        const ariaProps = virtual
            ? virtual.getItemAriaProps(view.rowIndex, { role: "row", headerRowCount: 1 })
            : { "aria-rowindex": view.rowIndex + 2 };
        const attachRow =
            virtual && table && !table.isVirtualFixed ? virtual.attachItem(view.rowIndex) : noopAttachment;

        return {
            row: view.row,
            rowId: view.rowId,
            rowIndex: view.rowIndex,
            sourceIndex: view.sourceIndex,
            isSelected: view.isSelected,
            isEven: view.isEven,
            isSelectable: view.isSelectable,
            ariaProps,
            attachRow,
        };
    }

    function buildCellRenderContext(
        view: DataTableRowView<TRow>,
        column: DataTableColumn<TRow>
    ): DataTableCellRenderContext<TRow> {
        const value = table ? table.extractValue(column, view.row, view.sourceIndex) : undefined;
        const formatted = table ? table.formatValue(column, value, view.row) : "";
        return {
            row: view.row,
            rowId: view.rowId,
            rowIndex: view.rowIndex,
            sourceIndex: view.sourceIndex,
            column,
            value,
            formatted,
            isSelected: view.isSelected,
            isEven: view.isEven,
        };
    }
</script>

{#snippet renderControllerRow(view: DataTableRowView<TRow>)}
    {#if table}
        {#if rowSnippet}
            {@render rowSnippet(buildRowRenderContext(view))}
        {:else}
            {const rowAria = virtual
                ? virtual.getItemAriaProps(view.rowIndex, { role: "row", headerRowCount: 1 })
                : { "aria-rowindex": view.rowIndex + 2 }}
            {const attachRow = virtual && !table.isVirtualFixed ? virtual.attachItem(view.rowIndex) : noopAttachment}
            {const rowTone = table.resolveRowTone(view.row, view.sourceIndex)}
            {const rowStyle = table.resolveRowStyle(view.row, view.sourceIndex)}
            <DataTableRow
                {...rowAria}
                {@attach attachRow}
                selected={view.isSelected}
                even={view.isEven}
                interactive={Boolean(onRowClick)}
                tone={rowTone}
                bg={rowStyle?.bg}
                fg={rowStyle?.fg}
                colorMode={rowStyle?.colorMode}
                tabindex={onRowClick ? 0 : undefined}
                data-row-index={view.rowIndex}
                onclick={onRowClick ? (event) => handleRowClick(view, event) : undefined}
                onkeydown={onRowClick ? (event) => handleRowKeyDown(view, event) : undefined}
            >
                {#if table.selectable}
                    <DataTableCell selection aria-colindex={1}>
                        <label class="cs-data-table-selection-hit">
                            <Checkbox
                                variant={checkboxVariant}
                                size={checkboxSize}
                                disabled={!view.isSelectable}
                                aria-label={t({ de: "Zeile auswählen", en: "Select row" })}
                                onpointerdown={recordShiftKey}
                                onclick={recordShiftKey}
                                bind:checked={() => view.isSelected, () => handleSelectRow(view)}
                            />
                        </label>
                    </DataTableCell>
                {/if}

                {#each table.columns as column, colIdx (column.id)}
                    {const cellCtx = buildCellRenderContext(view, column)}
                    {const cellTone =
                        typeof column.tone === "function" ? column.tone(cellCtx.value, view.row) : undefined}
                    {const colTone = typeof column.tone === "string" ? column.tone : undefined}
                    {const cellStyle =
                        typeof column.cellStyle === "function"
                            ? column.cellStyle(cellCtx.value, view.row, view.sourceIndex)
                            : column.cellStyle}
                    {const align = cellStyle?.align ?? resolveColumnAlign(column)}
                    {const wrapCell = cellStyle?.wrap ?? column.wrap}
                    {const emphasis = cellStyle?.emphasis ?? column.emphasis}
                    {const numeric = isNumericColumnType(column.type)}
                    {const colIndex = (table.selectable ? 2 : 1) + colIdx}
                    <DataTableCell
                        {align}
                        {numeric}
                        wrap={wrapCell}
                        {emphasis}
                        tone={cellTone}
                        bg={cellStyle?.bg}
                        fg={cellStyle?.fg}
                        colorMode={cellStyle?.colorMode}
                        {colTone}
                        colBg={column.bg}
                        colFg={column.fg}
                        colColorMode={column.colorMode}
                        pinned={column.pinned}
                        bold={cellStyle?.bold}
                        italic={cellStyle?.italic}
                        aria-colindex={colIndex}
                    >
                        {#if column.cell}
                            {@render column.cell(cellCtx)}
                        {:else if cell}
                            {@render cell(cellCtx)}
                        {:else}
                            {cellCtx.formatted}
                        {/if}
                    </DataTableCell>
                {/each}
            </DataTableRow>
        {/if}
    {/if}
{/snippet}

<div bind:this={ref} role="rowgroup" {...rest} class={["cs-data-table-body", className]} {@attach attachList}>
    {#if children}
        {@render children()}
    {:else if table && virtual}
        {#each virtual.items as vItem (vItem.key)}
            {const view = table.getRowAt(vItem.index)}
            {#if view}
                {@render renderControllerRow(view)}
            {/if}
        {/each}
    {:else if table}
        {#each table.rows as view (view.rowId)}
            {@render renderControllerRow(view)}
        {/each}
    {/if}
</div>
