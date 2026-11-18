import type { Component, Snippet } from "svelte";
import type { HTMLAttributes, SVGAttributes } from "svelte/elements";

import type { ScrollAreaScrollbar } from "../scroll-area/index.ts";
import type {
    DataTableAlign,
    DataTableCellRenderContext,
    DataTableColorMode,
    DataTableController,
    DataTableEmphasis,
    DataTablePinPosition,
    DataTableRole,
    DataTableRowId,
    DataTableRowRenderContext,
    DataTableSize,
    DataTableSortDirection,
    DataTableTone,
    DataTableVariant,
} from "./data-table.svelte.ts";

export { default as DataTable } from "./DataTable.svelte";
export { default as DataTableStatusBar } from "./DataTableStatusBar.svelte";
export { default as DataTableHead } from "./DataTableHead.svelte";
export { default as DataTableHeaderCell } from "./DataTableHeaderCell.svelte";
export { default as DataTableBody } from "./DataTableBody.svelte";
export { default as DataTableRow } from "./DataTableRow.svelte";
export { default as DataTableCell } from "./DataTableCell.svelte";
export { default as DataTableEmpty } from "./DataTableEmpty.svelte";

export {
    getDataTableContext,
    setDataTableContext,
    hasDataTableContext,
    type DataTableContext,
    type DataTableHeaderRegistration,
} from "./data-table.context.ts";

export {
    createDataTable,
    DataTableController,
    DATA_TABLE_VARIANTS,
    DATA_TABLE_SIZES,
    DATA_TABLE_ALIGNS,
    DATA_TABLE_TONES,
    DATA_TABLE_COLOR_MODES,
    DATA_TABLE_COLUMN_TYPES,
    DATA_TABLE_SORT_DIRECTIONS,
    DATA_TABLE_FILTER_MODES,
    DATA_TABLE_CONDITION_OPERATORS,
    DATA_TABLE_PIN_POSITIONS,
    DATA_TABLE_EMPHASES,
    DATA_TABLE_ROLES,
    type DataTableVariant,
    type DataTableSize,
    type DataTableAlign,
    type DataTableTone,
    type DataTableColorMode,
    type DataTableColumnType,
    type DataTableSortDirection,
    type DataTableFilterMode,
    type DataTableConditionOperator,
    type DataTablePinPosition,
    type DataTableEmphasis,
    type DataTableRole,
    type DataTableRowId,
    type DataTableMaybeGetter,
    type DataTableCellStyle,
    type DataTableRowStyle,
    type DataTableSortRule,
    type DataTableColumnFilter,
    type DataTableFacetItem,
    type DataTableFacetResult,
    type DataTableVirtualizeOptions,
    type DataTableRowView,
    type DataTableCellRenderContext,
    type DataTableRowRenderContext,
    type DataTableColumn,
    type DataTableOptions,
} from "./data-table.svelte.ts";

export interface DataTableProps<TRow = Record<string, unknown>> extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
    ref?: HTMLDivElement | null;
    viewportRef?: HTMLDivElement | null;
    variant: DataTableVariant;
    size: DataTableSize;
    table?: DataTableController<TRow>;
    striped?: boolean;
    gridlines?: boolean;
    wrap?: boolean;
    colorMode?: DataTableColorMode;
    role?: DataTableRole;
    scrollbar?: ScrollAreaScrollbar;
    gridColumns?: string;
    minWidth?: number | string;
    label?: string;
    labelledBy?: string;
    children?: Snippet;
}

export interface DataTableStatusBarProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    selectionActions?: Snippet<[{ selectedCount: number; clearSelection: () => void }]>;
    filterActions?: Snippet<[{ activeFilterCount: number; clearAllFilters: () => void }]>;
    children?: Snippet;
}

export interface DataTableHeadProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    children?: Snippet;
}

export interface DataTableHeaderCellProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    columnId?: string;
    align?: DataTableAlign;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    sortable?: boolean;
    filterable?: boolean;
    sort?: DataTableSortDirection | null;
    sortPriority?: number;
    filtered?: boolean;
    open?: boolean;
    selection?: boolean;
    pinned?: DataTablePinPosition;
    onTrigger?: (event: MouseEvent | KeyboardEvent) => void;
    children?: Snippet;
}

export interface DataTableBodyProps<TRow = Record<string, unknown>> extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children"
> {
    ref?: HTMLDivElement | null;
    cell?: Snippet<[DataTableCellRenderContext<TRow>]>;
    row?: Snippet<[DataTableRowRenderContext<TRow>]>;
    onRowClick?: (row: TRow, context: { rowId: DataTableRowId; rowIndex: number; event: MouseEvent }) => void;
    children?: Snippet;
}

export interface DataTableRowProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    selected?: boolean;
    even?: boolean;
    interactive?: boolean;
    tone?: DataTableTone;
    bg?: string;
    fg?: string;
    colorMode?: DataTableColorMode;
    children?: Snippet;
}

export interface DataTableCellProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    align?: DataTableAlign;
    numeric?: boolean;
    wrap?: boolean;
    emphasis?: DataTableEmphasis;
    tone?: DataTableTone;
    bg?: string;
    fg?: string;
    colorMode?: DataTableColorMode;
    colBg?: string;
    colFg?: string;
    colTone?: DataTableTone;
    colColorMode?: DataTableColorMode;
    selection?: boolean;
    pinned?: DataTablePinPosition;
    bold?: boolean;
    italic?: boolean;
    children?: Snippet;
}

export type DataTableEmptyIconProps = Omit<SVGAttributes<SVGSVGElement>, "children" | "color"> &
    Record<string, unknown>;

export interface DataTableEmptyProps extends HTMLAttributes<HTMLDivElement> {
    ref?: HTMLDivElement | null;
    title?: string;
    description?: string;
    icon?: Component<DataTableEmptyIconProps>;
    hideReset?: boolean;
    children?: Snippet;
}
