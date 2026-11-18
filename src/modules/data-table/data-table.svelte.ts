import type { Snippet } from "svelte";
import type { Attachment } from "svelte/attachments";
import { SvelteSet } from "svelte/reactivity";

import { resolveGetter } from "../../shared/resolve-getter.ts";
import {
    createVirtualScroll,
    type VirtualScrollController,
    type VirtualScrollItemAriaProps,
    type VirtualScrollScrollToIndexOptions,
} from "../virtual-scroll/index.ts";
import {
    computeColumnFacets,
    DATA_TABLE_ROW_HEIGHT_PX,
    extractColumnValue,
    filterRowIndices,
    formatColumnValue,
    isFilterActive,
    sortRowIndices,
} from "./data-table-engine.internal.ts";

export const DATA_TABLE_VARIANTS = ["elevated", "soft", "transparent"] as const;
export const DATA_TABLE_SIZES = ["xs", "sm", "md", "lg"] as const;
export const DATA_TABLE_ALIGNS = ["start", "center", "end"] as const;
export const DATA_TABLE_TONES = ["base", "accent", "positive", "caution", "negative"] as const;
export const DATA_TABLE_COLOR_MODES = ["tint", "exact"] as const;
export const DATA_TABLE_COLUMN_TYPES = [
    "text",
    "number",
    "currency",
    "percent",
    "date",
    "datetime",
    "boolean",
] as const;
export const DATA_TABLE_SORT_DIRECTIONS = ["asc", "desc"] as const;
export const DATA_TABLE_FILTER_MODES = ["values", "condition", "both", "auto"] as const;
export const DATA_TABLE_CONDITION_OPERATORS = [
    "contains",
    "notContains",
    "equals",
    "notEquals",
    "startsWith",
    "endsWith",
    "gt",
    "gte",
    "lt",
    "lte",
    "between",
    "isEmpty",
    "isNotEmpty",
] as const;
export const DATA_TABLE_PIN_POSITIONS = ["start", "end"] as const;
export const DATA_TABLE_EMPHASES = ["default", "strong", "weak"] as const;
export const DATA_TABLE_ROLES = ["table", "grid"] as const;

export type DataTableVariant = (typeof DATA_TABLE_VARIANTS)[number];
export type DataTableSize = (typeof DATA_TABLE_SIZES)[number];
export type DataTableAlign = (typeof DATA_TABLE_ALIGNS)[number];
export type DataTableTone = (typeof DATA_TABLE_TONES)[number];
export type DataTableColorMode = (typeof DATA_TABLE_COLOR_MODES)[number];
export type DataTableColumnType = (typeof DATA_TABLE_COLUMN_TYPES)[number];
export type DataTableSortDirection = (typeof DATA_TABLE_SORT_DIRECTIONS)[number];
export type DataTableFilterMode = (typeof DATA_TABLE_FILTER_MODES)[number];
export type DataTableConditionOperator = (typeof DATA_TABLE_CONDITION_OPERATORS)[number];
export type DataTablePinPosition = (typeof DATA_TABLE_PIN_POSITIONS)[number];
export type DataTableEmphasis = (typeof DATA_TABLE_EMPHASES)[number];
export type DataTableRole = (typeof DATA_TABLE_ROLES)[number];

export type DataTableRowId = string | number;
export type DataTableMaybeGetter<T> = T | (() => T);

export interface DataTableCellStyle {
    bg?: string;
    fg?: string;
    colorMode?: DataTableColorMode;
    emphasis?: DataTableEmphasis;
    bold?: boolean;
    italic?: boolean;
    align?: DataTableAlign;
    wrap?: boolean;
}

export interface DataTableRowStyle {
    bg?: string;
    fg?: string;
    colorMode?: DataTableColorMode;
}

export interface DataTableSortRule {
    columnId: string;
    direction: DataTableSortDirection;
}

export type DataTableColumnFilter =
    | {
          kind: "values";
          selected: readonly string[];
      }
    | {
          kind: "condition";
          operator: DataTableConditionOperator;
          value?: string;
          valueTo?: string;
      };

export interface DataTableFacetItem {
    key: string;
    rawValue: unknown;
    label: string;
    count: number;
    isEmpty: boolean;
}

export interface DataTableFacetResult {
    items: readonly DataTableFacetItem[];
    totalDistinct: number;
    truncated: boolean;
}

export interface DataTableVirtualizeOptions {
    overscan?: number;
    estimatedRowHeight?: number;
    initialViewportSize?: number;
    initialRenderCount?: number;
    fixed?: boolean;
}

export interface DataTableRowView<TRow = unknown> {
    row: TRow;
    rowId: DataTableRowId;
    rowIndex: number;
    sourceIndex: number;
    isSelected: boolean;
    isEven: boolean;
    isSelectable: boolean;
}

export interface DataTableCellRenderContext<TRow = unknown> {
    row: TRow;
    rowId: DataTableRowId;
    rowIndex: number;
    sourceIndex: number;
    column: DataTableColumn<TRow>;
    value: unknown;
    formatted: string;
    isSelected: boolean;
    isEven: boolean;
}

export interface DataTableRowRenderContext<TRow = unknown> {
    row: TRow;
    rowId: DataTableRowId;
    rowIndex: number;
    sourceIndex: number;
    isSelected: boolean;
    isEven: boolean;
    isSelectable: boolean;
    ariaProps: VirtualScrollItemAriaProps;
    attachRow: Attachment<HTMLElement>;
}

export interface DataTableColumn<TRow = Record<string, unknown>> {
    id: string;
    label: string;
    subLabel?: string;
    type?: DataTableColumnType;
    accessor?: keyof TRow | ((row: TRow, sourceIndex: number) => unknown);
    format?: (value: unknown, row: TRow) => string;
    cell?: Snippet<[DataTableCellRenderContext<TRow>]>;
    header?: Snippet<[{ column: DataTableColumn<TRow> }]>;
    align?: DataTableAlign;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    sortable?: boolean;
    sortFn?: (a: TRow, b: TRow) => number;
    filterable?: boolean;
    filterMode?: DataTableFilterMode;
    conditionOperators?: readonly DataTableConditionOperator[];
    wrap?: boolean;
    emphasis?: DataTableEmphasis;
    tone?: DataTableTone | ((value: unknown, row: TRow) => DataTableTone | undefined);
    cellStyle?:
        DataTableCellStyle | ((value: unknown, row: TRow, sourceIndex: number) => DataTableCellStyle | undefined);
    bg?: string;
    fg?: string;
    colorMode?: DataTableColorMode;
    visible?: boolean;
    pinned?: DataTablePinPosition;
}

export interface DataTableOptions<TRow = Record<string, unknown>> {
    data: DataTableMaybeGetter<readonly TRow[]>;
    columns: DataTableMaybeGetter<readonly DataTableColumn<TRow>[]>;
    getRowId?: (row: TRow, sourceIndex: number) => DataTableRowId;
    selectable?: DataTableMaybeGetter<boolean>;
    isRowSelectable?: (row: TRow, sourceIndex: number) => boolean;
    multiSort?: DataTableMaybeGetter<boolean>;
    initialSorting?: readonly DataTableSortRule[];
    initialFilters?: Readonly<Record<string, DataTableColumnFilter>>;
    initialSelection?: readonly DataTableRowId[];
    rowTone?: (row: TRow, sourceIndex: number) => DataTableTone | undefined;
    rowStyle?: (row: TRow, sourceIndex: number) => DataTableRowStyle | undefined;
    virtualize?: DataTableMaybeGetter<boolean | DataTableVirtualizeOptions>;
    highCardinalityThreshold?: number;
    maxChecklistValues?: number;
    locale?: DataTableMaybeGetter<string | undefined>;
    onSortingChange?: (sorting: readonly DataTableSortRule[]) => void;
    onFiltersChange?: (filters: Readonly<Record<string, DataTableColumnFilter>>) => void;
    onSelectionChange?: (selectedIds: readonly DataTableRowId[]) => void;
}

export interface DataTableHostBridge {
    getSize: () => DataTableSize;
    getWrap: () => boolean;
    openPopover: (columnId: string, triggerEl?: HTMLElement | null) => void;
    closePopover: (options?: { restoreFocus?: boolean }) => void;
    scrollToColumn: (columnId: string, options?: { behavior?: ScrollBehavior }) => void;
    scrollToRowFallback: (viewIndex: number, options?: VirtualScrollScrollToIndexOptions) => void;
}

function defaultGetRowId(_row: unknown, sourceIndex: number): DataTableRowId {
    return sourceIndex;
}

function defaultIsRowSelectable(): boolean {
    return true;
}

function sanitizeFilters(
    filters: Readonly<Record<string, DataTableColumnFilter>> | undefined
): Readonly<Record<string, DataTableColumnFilter>> {
    if (!filters) return {};
    const next: Record<string, DataTableColumnFilter> = {};
    for (const [columnId, filter] of Object.entries(filters)) {
        if (isFilterActive(filter)) {
            next[columnId] = filter;
        }
    }
    return next;
}

export class DataTableController<TRow = Record<string, unknown>> {
    readonly #options: DataTableOptions<TRow>;

    #sorting = $state.raw<readonly DataTableSortRule[]>([]);
    #filters = $state.raw<Readonly<Record<string, DataTableColumnFilter>>>({});
    #selectedRowIds = $state.raw<ReadonlySet<DataTableRowId>>(new SvelteSet());
    #openPopoverColumnId = $state<string | null>(null);
    #lastSelectionAnchorIndex: number | null = null;

    #host = $state.raw<DataTableHostBridge | null>(null);
    #virtual: VirtualScrollController | null = null;

    readonly #data = $derived.by(() => resolveGetter(this.#options.data));
    readonly #allColumns = $derived.by(() => resolveGetter(this.#options.columns));
    readonly #visibleColumns = $derived.by(() => this.#allColumns.filter((col) => col.visible !== false));
    readonly #selectable = $derived.by(() => Boolean(resolveGetter(this.#options.selectable) ?? false));
    readonly #multiSort = $derived.by(() => Boolean(resolveGetter(this.#options.multiSort) ?? false));
    readonly #locale = $derived.by(() => resolveGetter(this.#options.locale));
    readonly #virtualizeConfig = $derived.by(() => resolveGetter(this.#options.virtualize) ?? false);
    readonly #isVirtualized = $derived.by(() => Boolean(this.#virtualizeConfig));

    readonly #hostSize = $derived.by<DataTableSize>(() => this.#host?.getSize() ?? "md");
    readonly #hostWrap = $derived.by<boolean>(() => this.#host?.getWrap() ?? false);
    readonly #hasWrappedColumn = $derived.by(() => this.#hostWrap || this.#visibleColumns.some((col) => col.wrap));

    readonly #resolvedEstimatedRowHeight = $derived.by(() => {
        const cfg = this.#virtualizeConfig;
        if (typeof cfg === "object" && cfg.estimatedRowHeight !== undefined && cfg.estimatedRowHeight > 0) {
            return cfg.estimatedRowHeight;
        }
        return DATA_TABLE_ROW_HEIGHT_PX[this.#hostSize];
    });

    readonly #resolvedVirtualFixed = $derived.by(() => {
        const cfg = this.#virtualizeConfig;
        if (typeof cfg === "object" && cfg.fixed !== undefined) {
            return cfg.fixed && !this.#hasWrappedColumn;
        }
        return !this.#hasWrappedColumn;
    });

    readonly #resolvedVirtualOverscan = $derived.by(() => {
        const cfg = this.#virtualizeConfig;
        if (typeof cfg === "object" && cfg.overscan !== undefined) {
            return cfg.overscan;
        }
        return 8;
    });

    readonly #activeFilterColumns = $derived.by(() => {
        const result: DataTableColumn<TRow>[] = [];
        for (const col of this.#visibleColumns) {
            const filter = this.#filters[col.id];
            if (isFilterActive(filter)) {
                result.push(col);
            }
        }
        return result;
    });

    // Stage 1: filter indices
    readonly #filteredIndices = $derived.by(() => filterRowIndices(this.#data, this.#visibleColumns, this.#filters));

    // Stage 2: sort filtered indices
    readonly #sortedIndices = $derived.by(() =>
        sortRowIndices(this.#data, this.#filteredIndices, this.#visibleColumns, this.#sorting, this.#locale)
    );

    // Intersect stored selection with current dataset only when non-empty.
    readonly #effectiveSelectedIds = $derived.by<ReadonlySet<DataTableRowId>>(() => {
        if (this.#selectedRowIds.size === 0) return this.#selectedRowIds;
        const data = this.#data;
        const getRowId = this.#options.getRowId ?? defaultGetRowId;
        const valid = new SvelteSet<DataTableRowId>();
        for (const [i, row] of data.entries()) {
            const id = getRowId(row, i);
            if (this.#selectedRowIds.has(id)) {
                valid.add(id);
                if (valid.size === this.#selectedRowIds.size) break;
            }
        }
        return valid;
    });

    readonly #visibleSelectionSummary = $derived.by(() => {
        const selected = this.#effectiveSelectedIds;
        if (!this.#selectable || selected.size === 0 || this.#sortedIndices.length === 0) {
            return { allVisibleSelected: false, someVisibleSelected: false };
        }

        const data = this.#data;
        const indices = this.#sortedIndices;
        const getRowId = this.#options.getRowId ?? defaultGetRowId;
        const isRowSelectable = this.#options.isRowSelectable ?? defaultIsRowSelectable;

        let selectableCount = 0;
        let selectedVisibleCount = 0;

        for (const sourceIndex of indices) {
            const row = data[sourceIndex];
            if (row === undefined) continue;
            if (!isRowSelectable(row, sourceIndex)) continue;
            selectableCount += 1;
            if (selected.has(getRowId(row, sourceIndex))) {
                selectedVisibleCount += 1;
            }
        }

        if (selectableCount === 0) {
            return { allVisibleSelected: false, someVisibleSelected: false };
        }

        return {
            allVisibleSelected: selectedVisibleCount === selectableCount,
            someVisibleSelected: selectedVisibleCount > 0 && selectedVisibleCount < selectableCount,
        };
    });

    // Stage 3: lazy cross-filtered facets ONLY for openPopoverColumnId
    readonly #openPopoverFacets = $derived.by<DataTableFacetResult>(() => {
        const columnId = this.#openPopoverColumnId;
        if (!columnId) {
            return { items: [], totalDistinct: 0, truncated: false };
        }

        const existingFilter = this.#filters[columnId];
        const selectedKeys = existingFilter?.kind === "values" ? existingFilter.selected : undefined;

        return computeColumnFacets(this.#data, this.#visibleColumns, this.#filters, columnId, {
            maxChecklistValues: this.maxChecklistValues,
            locale: this.#locale,
            selectedKeys,
        });
    });

    // Lazy full view array for ergonomic non-virtualized iteration (untouched when virtualized).
    readonly #rows = $derived.by<readonly DataTableRowView<TRow>[]>(() => {
        const indices = this.#sortedIndices;
        const result = Array.from<DataTableRowView<TRow>>({ length: indices.length });
        for (let i = 0; i < indices.length; i++) {
            const view = this.getRowAt(i);
            if (view) {
                result[i] = view;
            }
        }
        return result;
    });

    constructor(options: DataTableOptions<TRow>) {
        this.#options = options;
        this.#sorting = options.initialSorting ? [...options.initialSorting] : [];
        this.#filters = sanitizeFilters(options.initialFilters);
        this.#selectedRowIds = options.initialSelection ? new SvelteSet(options.initialSelection) : new SvelteSet();

        const initialCfg = resolveGetter(options.virtualize);
        if (initialCfg !== undefined && initialCfg !== false) {
            this.#ensureVirtualController();
        }
    }

    #ensureVirtualController(): VirtualScrollController {
        if (this.#virtual) return this.#virtual;

        const cfg = resolveGetter(this.#options.virtualize);
        const objCfg = typeof cfg === "object" ? cfg : undefined;

        this.#virtual = createVirtualScroll({
            count: () => (this.#isVirtualized ? this.#sortedIndices.length : 0),
            estimateSize: () => this.#resolvedEstimatedRowHeight,
            fixed: () => this.#resolvedVirtualFixed,
            overscan: () => {
                // Depend on estimated row height so size switches trigger a virtual range recompute.
                void this.#resolvedEstimatedRowHeight;
                return this.#resolvedVirtualOverscan;
            },
            getItemKey: (viewIndex) => this.#getViewRowKey(viewIndex),
            initialViewportSize: objCfg?.initialViewportSize ?? 600,
            initialRenderCount: objCfg?.initialRenderCount ?? 20,
        });

        return this.#virtual;
    }

    #getViewRowKey(viewIndex: number): DataTableRowId {
        const sourceIndex = this.#sortedIndices[viewIndex];
        if (sourceIndex === undefined) return viewIndex;
        const row = this.#data[sourceIndex];
        if (row === undefined) return sourceIndex;
        return (this.#options.getRowId ?? defaultGetRowId)(row, sourceIndex);
    }

    get columns(): readonly DataTableColumn<TRow>[] {
        return this.#visibleColumns;
    }

    get totalRowCount(): number {
        return this.#data.length;
    }

    get rowCount(): number {
        return this.#sortedIndices.length;
    }

    get rows(): readonly DataTableRowView<TRow>[] {
        return this.#rows;
    }

    get sorting(): readonly DataTableSortRule[] {
        return this.#sorting;
    }

    get filters(): Readonly<Record<string, DataTableColumnFilter>> {
        return this.#filters;
    }

    get activeFilterColumns(): readonly DataTableColumn<TRow>[] {
        return this.#activeFilterColumns;
    }

    get activeFilterCount(): number {
        return this.#activeFilterColumns.length;
    }

    get isFiltered(): boolean {
        return this.#activeFilterColumns.length > 0;
    }

    get selectable(): boolean {
        return this.#selectable;
    }

    get multiSort(): boolean {
        return this.#multiSort;
    }

    get selectedRowIds(): ReadonlySet<DataTableRowId> {
        return this.#effectiveSelectedIds;
    }

    get selectedCount(): number {
        return this.#effectiveSelectedIds.size;
    }

    get allVisibleSelected(): boolean {
        return this.#visibleSelectionSummary.allVisibleSelected;
    }

    get someVisibleSelected(): boolean {
        return this.#visibleSelectionSummary.someVisibleSelected;
    }

    get openPopoverColumnId(): string | null {
        return this.#openPopoverColumnId;
    }

    get openPopoverFacets(): DataTableFacetResult {
        return this.#openPopoverFacets;
    }

    get isVirtualized(): boolean {
        return this.#isVirtualized;
    }

    get virtual(): VirtualScrollController | null {
        if (!this.#isVirtualized) return null;
        return this.#ensureVirtualController();
    }

    get highCardinalityThreshold(): number {
        return this.#options.highCardinalityThreshold ?? 500;
    }

    get maxChecklistValues(): number {
        return this.#options.maxChecklistValues ?? 10_000;
    }

    get isVirtualFixed(): boolean {
        return this.#resolvedVirtualFixed;
    }

    /**
     * Internal bridge invoked by `DataTable.svelte` to connect DOM capabilities (`size`, `wrap`, popover, scroll).
     */
    attachHost = (bridge: DataTableHostBridge): (() => void) => {
        this.#host = bridge;
        return () => {
            if (this.#host === bridge) {
                this.#host = null;
            }
        };
    };

    /**
     * Internal setter synchronized with the shared popover element's `toggle` lifecycle.
     */
    syncOpenPopoverColumnId = (columnId: string | null): void => {
        this.#openPopoverColumnId = columnId;
    };

    resolveRowTone = (row: TRow, sourceIndex: number): DataTableTone | undefined => {
        return this.#options.rowTone?.(row, sourceIndex);
    };

    resolveRowStyle = (row: TRow, sourceIndex: number): DataTableRowStyle | undefined => {
        return this.#options.rowStyle?.(row, sourceIndex);
    };

    extractValue = (column: DataTableColumn<TRow>, row: TRow, sourceIndex: number): unknown => {
        return extractColumnValue(column, row, sourceIndex);
    };

    formatValue = (column: DataTableColumn<TRow>, value: unknown, row: TRow): string => {
        return formatColumnValue(column, value, row);
    };

    getRowAt = (viewIndex: number): DataTableRowView<TRow> | undefined => {
        const sourceIndex = this.#sortedIndices[viewIndex];
        if (sourceIndex === undefined) return undefined;
        const row = this.#data[sourceIndex];
        if (row === undefined) return undefined;

        const rowId = (this.#options.getRowId ?? defaultGetRowId)(row, sourceIndex);
        const isSelectable = (this.#options.isRowSelectable ?? defaultIsRowSelectable)(row, sourceIndex);

        return {
            row,
            rowId,
            rowIndex: viewIndex,
            sourceIndex,
            isSelected: this.#effectiveSelectedIds.has(rowId),
            isEven: viewIndex % 2 === 1,
            isSelectable,
        };
    };

    getColumnSort = (columnId: string): { direction: DataTableSortDirection; priority: number } | null => {
        const idx = this.#sorting.findIndex((rule) => rule.columnId === columnId);
        if (idx === -1) return null;
        const rule = this.#sorting[idx];
        if (!rule) return null;
        return {
            direction: rule.direction,
            priority: idx + 1,
        };
    };

    toggleSort = (columnId: string, options?: { multi?: boolean }): void => {
        const existing = this.getColumnSort(columnId);
        const nextDirection: DataTableSortDirection | null = !existing
            ? "asc"
            : existing.direction === "asc"
              ? "desc"
              : null;
        this.setColumnSort(columnId, nextDirection, options);
    };

    setColumnSort = (
        columnId: string,
        direction: DataTableSortDirection | null,
        options?: { multi?: boolean }
    ): void => {
        const useMulti = Boolean(options?.multi && this.#multiSort);
        let next: DataTableSortRule[];

        if (direction === null) {
            next = this.#sorting.filter((rule) => rule.columnId !== columnId);
        } else if (useMulti) {
            const idx = this.#sorting.findIndex((rule) => rule.columnId === columnId);
            next =
                idx === -1
                    ? [...this.#sorting, { columnId, direction }]
                    : this.#sorting.map((rule, i) => (i === idx ? { columnId, direction } : rule));
        } else {
            next = [{ columnId, direction }];
        }

        this.setSorting(next);
    };

    setSorting = (rules: readonly DataTableSortRule[]): void => {
        this.#sorting = [...rules];
        this.#options.onSortingChange?.(this.#sorting);
    };

    clearSorting = (): void => {
        if (this.#sorting.length === 0) return;
        this.setSorting([]);
    };

    setColumnFilter = (columnId: string, filter: DataTableColumnFilter | null): void => {
        const next: Record<string, DataTableColumnFilter> = { ...this.#filters };
        if (!filter || !isFilterActive(filter)) {
            if (!(columnId in next)) return;
            delete next[columnId];
        } else {
            next[columnId] = filter;
        }
        this.#filters = next;
        this.#options.onFiltersChange?.(this.#filters);
    };

    clearColumnFilter = (columnId: string): void => {
        this.setColumnFilter(columnId, null);
    };

    clearAllFilters = (): void => {
        if (Object.keys(this.#filters).length === 0) return;
        this.#filters = {};
        this.#options.onFiltersChange?.(this.#filters);
    };

    isRowSelected = (rowId: DataTableRowId): boolean => {
        return this.#effectiveSelectedIds.has(rowId);
    };

    toggleRowSelection = (rowId: DataTableRowId, options?: { shiftKey?: boolean; viewIndex?: number }): void => {
        if (!this.#selectable) return;

        const isRowSelectable = this.#options.isRowSelectable ?? defaultIsRowSelectable;
        const getRowId = this.#options.getRowId ?? defaultGetRowId;
        const next = new SvelteSet(this.#effectiveSelectedIds);
        const shouldSelect = !next.has(rowId);

        if (
            options?.shiftKey &&
            options.viewIndex !== undefined &&
            this.#lastSelectionAnchorIndex !== null &&
            this.#sortedIndices.length > 0
        ) {
            const start = Math.max(0, Math.min(this.#lastSelectionAnchorIndex, options.viewIndex));
            const end = Math.min(
                this.#sortedIndices.length - 1,
                Math.max(this.#lastSelectionAnchorIndex, options.viewIndex)
            );

            for (let viewIdx = start; viewIdx <= end; viewIdx++) {
                const sourceIndex = this.#sortedIndices[viewIdx];
                if (sourceIndex === undefined) continue;
                const row = this.#data[sourceIndex];
                if (row === undefined) continue;
                if (!isRowSelectable(row, sourceIndex)) continue;
                const id = getRowId(row, sourceIndex);
                if (shouldSelect) {
                    next.add(id);
                } else {
                    next.delete(id);
                }
            }
            this.#lastSelectionAnchorIndex = options.viewIndex;
        } else {
            if (options?.viewIndex !== undefined) {
                const sourceIndex = this.#sortedIndices[options.viewIndex];
                const row = sourceIndex === undefined ? undefined : this.#data[sourceIndex];
                if (sourceIndex !== undefined && row !== undefined && !isRowSelectable(row, sourceIndex)) {
                    return;
                }
                this.#lastSelectionAnchorIndex = options.viewIndex;
            } else if (this.#options.isRowSelectable) {
                const data = this.#data;
                for (const [sourceIndex, row] of data.entries()) {
                    if (getRowId(row, sourceIndex) === rowId) {
                        if (!isRowSelectable(row, sourceIndex)) {
                            return;
                        }
                        break;
                    }
                }
            }
            if (shouldSelect) {
                next.add(rowId);
            } else {
                next.delete(rowId);
            }
        }

        this.#selectedRowIds = next;
        this.#options.onSelectionChange?.([...next]);
    };

    selectAllVisible = (): void => {
        if (!this.#selectable) return;
        const data = this.#data;
        const indices = this.#sortedIndices;
        const getRowId = this.#options.getRowId ?? defaultGetRowId;
        const isRowSelectable = this.#options.isRowSelectable ?? defaultIsRowSelectable;

        const next = new SvelteSet(this.#effectiveSelectedIds);
        for (const sourceIndex of indices) {
            const row = data[sourceIndex];
            if (row === undefined) continue;
            if (!isRowSelectable(row, sourceIndex)) continue;
            next.add(getRowId(row, sourceIndex));
        }

        this.#selectedRowIds = next;
        this.#options.onSelectionChange?.([...next]);
    };

    deselectAllVisible = (): void => {
        if (!this.#selectable || this.#effectiveSelectedIds.size === 0) return;
        const data = this.#data;
        const indices = this.#sortedIndices;
        const getRowId = this.#options.getRowId ?? defaultGetRowId;

        const next = new SvelteSet(this.#effectiveSelectedIds);
        for (const sourceIndex of indices) {
            const row = data[sourceIndex];
            if (row === undefined) continue;
            next.delete(getRowId(row, sourceIndex));
        }

        this.#selectedRowIds = next;
        this.#options.onSelectionChange?.([...next]);
    };

    selectAllMatching = (): void => {
        this.selectAllVisible();
    };

    clearSelection = (): void => {
        if (this.#selectedRowIds.size === 0) return;
        this.#selectedRowIds = new SvelteSet();
        this.#lastSelectionAnchorIndex = null;
        this.#options.onSelectionChange?.([]);
    };

    setSelection = (ids: readonly DataTableRowId[]): void => {
        const next = new SvelteSet(ids);
        this.#selectedRowIds = next;
        this.#options.onSelectionChange?.([...next]);
    };

    openColumnPopover = (columnId: string, triggerEl?: HTMLElement | null): void => {
        if (this.#host) {
            this.#host.openPopover(columnId, triggerEl);
            return;
        }
        this.#openPopoverColumnId = columnId;
    };

    closeColumnPopover = (options?: { restoreFocus?: boolean }): void => {
        if (this.#host) {
            this.#host.closePopover(options);
            return;
        }
        this.#openPopoverColumnId = null;
    };

    scrollToRow = (viewIndex: number, options?: VirtualScrollScrollToIndexOptions): void => {
        if (this.#isVirtualized && this.#virtual) {
            this.#virtual.scrollToIndex(viewIndex, options);
            return;
        }
        this.#host?.scrollToRowFallback(viewIndex, options);
    };

    scrollToColumn = (columnId: string, options?: { behavior?: ScrollBehavior }): void => {
        this.#host?.scrollToColumn(columnId, options);
    };
}

/**
 * Creates a headless reactive `DataTableController` for sorting, filtering, selection, and virtualization.
 */
export function createDataTable<TRow = Record<string, unknown>>(
    options: DataTableOptions<TRow>
): DataTableController<TRow> {
    return new DataTableController(options);
}
