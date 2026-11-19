---
name: DataTable
kind: hybrid
import: cs/svelte/data-table
exports:
  - DataTable
  - DataTableStatusBar
  - DataTableHead
  - DataTableHeaderCell
  - DataTableBody
  - DataTableRow
  - DataTableCell
  - DataTableEmpty
  - getDataTableContext
  - setDataTableContext
  - hasDataTableContext
  - DataTableContext
  - DataTableHeaderRegistration
  - createDataTable
  - DataTableController
  - DATA_TABLE_VARIANTS
  - DATA_TABLE_SIZES
  - DATA_TABLE_ALIGNS
  - DATA_TABLE_TONES
  - DATA_TABLE_COLOR_MODES
  - DATA_TABLE_COLUMN_TYPES
  - DATA_TABLE_SORT_DIRECTIONS
  - DATA_TABLE_FILTER_MODES
  - DATA_TABLE_CONDITION_OPERATORS
  - DATA_TABLE_PIN_POSITIONS
  - DATA_TABLE_EMPHASES
  - DATA_TABLE_ROLES
  - DataTableVariant
  - DataTableSize
  - DataTableAlign
  - DataTableTone
  - DataTableColorMode
  - DataTableColumnType
  - DataTableSortDirection
  - DataTableFilterMode
  - DataTableConditionOperator
  - DataTablePinPosition
  - DataTableEmphasis
  - DataTableRole
  - DataTableRowId
  - DataTableMaybeGetter
  - DataTableCellStyle
  - DataTableRowStyle
  - DataTableSortRule
  - DataTableColumnFilter
  - DataTableFacetItem
  - DataTableFacetResult
  - DataTableVirtualizeOptions
  - DataTableRowView
  - DataTableCellRenderContext
  - DataTableRowRenderContext
  - DataTableColumn
  - DataTableOptions
  - DataTableProps
  - DataTableStatusBarProps
  - DataTableHeadProps
  - DataTableHeaderCellProps
  - DataTableBodyProps
  - DataTableRowProps
  - DataTableCellProps
  - DataTableEmptyIconProps
  - DataTableEmptyProps
---

# DataTable

## Overview
CSS Subgrid data table with a headless reactive controller (`createDataTable`) supporting multi-column sorting, Excel/Notion-style cross-filtered checklist and condition column popovers, row selection with `Shift+Click` range support, sticky column pinning, semantic tones, and row virtualization. Can also be composed declaratively without a controller using `<DataTableHead>`, `<DataTableBody>`, `<DataTableRow>`, and `<DataTableCell>`.

## Usage Guidance

- **Controller Mode (`createDataTable`) vs. Declarative Mode:**
  - Use **`createDataTable`** when you need sorting, column filtering, cross-filtered facet checklists, multi-row selection, or row virtualization. Pass `table={table}` to `<DataTable>` and render `<DataTableHead />` and `<DataTableBody />` (which auto-generate headers, rows, cells, selection checkboxes, and empty states from the controller).
  - Use **Declarative Mode** (omitting `table`) for static or externally managed tables where you author `<DataTableHeaderCell>`, `<DataTableRow>`, and `<DataTableCell>` children directly.
- **Virtualization for Large Datasets:** Enable `virtualize: true` (or pass `DataTableVirtualizeOptions`) in `createDataTable` when rendering hundreds or thousands of rows. Give `<DataTable>` a bounded height (e.g. `class="h-112"` or a flex/grid container) so the internal scroll viewport can compute visible row ranges. When `wrap` is false on both the table and all visible columns, virtualization automatically uses O(1) fixed-height math (`isVirtualFixed = true`).
- **Soft-on-Soft Surface Nesting:** Choose `variant="elevated"` on default page backgrounds, `variant="soft"` inside elevated cards or modals to avoid double shadows, and `variant="transparent"` when embedding flush inside an already-framed container.

## API

### `createDataTable(options)` — `DataTableOptions<TRow>`

| Option | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `data` | `DataTableMaybeGetter<readonly TRow[]>` | Yes | — | Source rows array or reactive getter `() => rows`. |
| `columns` | `DataTableMaybeGetter<readonly DataTableColumn<TRow>[]>` | Yes | — | Column definitions array or reactive getter `() => columns`. |
| `getRowId` | `(row: TRow, sourceIndex: number) => DataTableRowId` | No | `(_row, i) => i` | Stable unique ID extractor per row. Recommended whenever selection or virtualization is enabled. |
| `selectable` | `DataTableMaybeGetter<boolean>` | No | `false` | Prepends a sticky selection checkbox column and enables row selection. |
| `isRowSelectable` | `(row: TRow, sourceIndex: number) => boolean` | No | `() => true` | Predicate controlling whether an individual row can be selected. |
| `multiSort` | `DataTableMaybeGetter<boolean>` | No | `false` | Allows multi-column sorting via `Shift+Click` on column headers. |
| `initialSorting` | `readonly DataTableSortRule[]` | No | `[]` | Initial active sort rules (`{ columnId, direction }`). |
| `initialFilters` | `Readonly<Record<string, DataTableColumnFilter>>` | No | `{}` | Initial active column filters keyed by `columnId`. |
| `initialSelection` | `readonly DataTableRowId[]` | No | `[]` | Initial selected row IDs. |
| `rowTone` | `(row: TRow, sourceIndex: number) => DataTableTone \| undefined` | No | `undefined` | Resolves a semantic row tone (`"base" \| "accent" \| "positive" \| "caution" \| "negative"`). |
| `rowStyle` | `(row: TRow, sourceIndex: number) => DataTableRowStyle \| undefined` | No | `undefined` | Resolves custom row colors (`{ bg, fg, colorMode }`). |
| `virtualize` | `DataTableMaybeGetter<boolean \| DataTableVirtualizeOptions>` | No | `false` | Enables row virtualization (`overscan`, `estimatedRowHeight`, `initialViewportSize`, `initialRenderCount`, `fixed`). |
| `highCardinalityThreshold` | `number` | No | `500` | Distinct value threshold used when `column.filterMode` is `"auto"`. |
| `maxChecklistValues` | `number` | No | `10_000` | Maximum distinct facet items collected for a column filter checklist before truncating. |
| `locale` | `DataTableMaybeGetter<string \| undefined>` | No | `undefined` | BCP 47 locale tag for `Intl.Collator`, `Intl.NumberFormat`, and `Intl.DateTimeFormat`. |
| `onSortingChange` | `(sorting: readonly DataTableSortRule[]) => void` | No | `undefined` | Callback fired whenever sorting rules change. |
| `onFiltersChange` | `(filters: Readonly<Record<string, DataTableColumnFilter>>) => void` | No | `undefined` | Callback fired whenever active column filters change. |
| `onSelectionChange` | `(selectedIds: readonly DataTableRowId[]) => void` | No | `undefined` | Callback fired whenever selected row IDs change. |

### `DataTableColumn<TRow>`

| Property | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `string` | Yes | — | Unique column identifier. |
| `label` | `string` | Yes | — | Primary header label text. |
| `subLabel` | `string` | No | `undefined` | Secondary muted sub-label displayed in the header cell. |
| `type` | `DataTableColumnType` | No | `"text"` | Data type (`"text" \| "number" \| "currency" \| "percent" \| "date" \| "datetime" \| "boolean"`). Numeric types default to `"end"` alignment and `tabular-nums`. |
| `accessor` | `keyof TRow \| ((row: TRow, sourceIndex: number) => unknown)` | No | `column.id` | Property key or extractor function for the column's raw value. |
| `format` | `(value: unknown, row: TRow) => string` | No | Type formatter | Custom display string formatter (also indexed by checklist search). |
| `cell` | `Snippet<[DataTableCellRenderContext<TRow>]>` | No | `undefined` | Custom cell rendering snippet for this column. |
| `header` | `Snippet<[{ column: DataTableColumn<TRow> }]>` | No | `undefined` | Custom header content snippet for this column. |
| `align` | `DataTableAlign` | No | `"start"` (`"end"` for numeric) | Horizontal alignment: `"start" \| "center" \| "end"`. |
| `width` | `number \| string` | No | `"minmax(120px, 1fr)"` | CSS grid track width (number in `px` or CSS track string such as `"180px"`, `"1.5fr"`). |
| `minWidth` | `number` | No | `undefined` | Minimum track width in pixels when `width` is flexible. |
| `maxWidth` | `number` | No | `undefined` | Maximum track width in pixels. |
| `sortable` | `boolean` | No | `false` | Enables sorting on this column via header click or column menu. |
| `sortFn` | `(a: TRow, b: TRow) => number` | No | Type comparator | Custom sort comparator function. |
| `filterable` | `boolean` | No | `false` | Enables the column filter popover menu. |
| `filterMode` | `DataTableFilterMode` | No | `"both"` | Filter popover tabs: `"values" \| "condition" \| "both" \| "auto"`. |
| `conditionOperators` | `readonly DataTableConditionOperator[]` | No | Type operators | Allowed condition operators for this column. |
| `wrap` | `boolean` | No | `false` | Allows cell text wrapping instead of single-line ellipsis truncation. |
| `emphasis` | `DataTableEmphasis` | No | `"default"` | Typography weight/contrast emphasis: `"default" \| "strong" \| "weak"`. |
| `tone` | `DataTableTone \| ((value: unknown, row: TRow) => DataTableTone \| undefined)` | No | `undefined` | Semantic column/cell tone (`"base" \| "accent" \| "positive" \| "caution" \| "negative"`). |
| `cellStyle` | `DataTableCellStyle \| ((value: unknown, row: TRow, sourceIndex: number) => DataTableCellStyle \| undefined)` | No | `undefined` | Dynamic or static cell styling (`bg`, `fg`, `colorMode`, `emphasis`, `bold`, `italic`, `align`, `wrap`). |
| `bg` | `string` | No | `undefined` | Column background color CSS value. |
| `fg` | `string` | No | `undefined` | Column foreground color CSS value. |
| `colorMode` | `DataTableColorMode` | No | `undefined` | Color application mode: `"tint"` (softened blend) or `"exact"` (raw CSS color). |
| `visible` | `boolean` | No | `true` | Hides the column when `false`. |
| `pinned` | `DataTablePinPosition` | No | `undefined` | Sticky horizontal pin position: `"start" \| "end"`. |

### `DataTableController<TRow>` Reactive Getters & Methods

| Member | Type | Description |
| :--- | :--- | :--- |
| `columns` | `readonly DataTableColumn<TRow>[]` | Currently visible columns (`visible !== false`). |
| `totalRowCount` | `number` | Total number of rows in the unfiltered source dataset. |
| `rowCount` | `number` | Number of rows after applying active filters. |
| `rows` | `readonly DataTableRowView<TRow>[]` | Filtered and sorted row views (lazily evaluated for non-virtualized rendering). |
| `sorting` | `readonly DataTableSortRule[]` | Active sorting rules in priority order. |
| `filters` | `Readonly<Record<string, DataTableColumnFilter>>` | Active column filters keyed by `columnId`. |
| `activeFilterColumns` | `readonly DataTableColumn<TRow>[]` | Visible columns that currently have an active filter. |
| `activeFilterCount` | `number` | Number of visible columns with an active filter. |
| `isFiltered` | `boolean` | `true` when at least one column filter is active. |
| `selectable` | `boolean` | Whether row selection is enabled. |
| `multiSort` | `boolean` | Whether multi-column sorting is enabled. |
| `selectedRowIds` | `ReadonlySet<DataTableRowId>` | Set of currently selected row IDs (automatically intersected with valid dataset IDs). |
| `selectedCount` | `number` | Number of currently selected rows. |
| `allVisibleSelected` | `boolean` | `true` when all selectable filtered rows are selected. |
| `someVisibleSelected` | `boolean` | `true` when some (but not all) selectable filtered rows are selected. |
| `openPopoverColumnId` | `string \| null` | ID of the column whose header menu popover is currently open. |
| `openPopoverFacets` | `DataTableFacetResult` | Cross-filtered facet counts (`items`, `totalDistinct`, `truncated`) lazily computed for `openPopoverColumnId`. |
| `isVirtualized` | `boolean` | Whether row virtualization is active. |
| `isVirtualFixed` | `boolean` | Whether virtualization uses O(1) fixed row height math. |
| `virtual` | `VirtualScrollController \| null` | Underlying virtual scroll controller when virtualized. |
| `getRowAt(viewIndex)` | `(viewIndex: number) => DataTableRowView<TRow> \| undefined` | Returns the row view at a filtered/sorted `viewIndex`. |
| `getColumnSort(columnId)` | `(columnId: string) => { direction: DataTableSortDirection; priority: number } \| null` | Returns sort direction and 1-based priority for a column, or `null`. |
| `toggleSort(columnId, options?)` | `(columnId: string, options?: { multi?: boolean }) => void` | Cycles column sort through `"asc" -> "desc" -> null`. |
| `setColumnSort(columnId, dir, options?)` | `(columnId: string, direction: DataTableSortDirection \| null, options?: { multi?: boolean }) => void` | Explicitly sets or clears sort direction for a column. |
| `setSorting(rules)` | `(rules: readonly DataTableSortRule[]) => void` | Replaces all active sort rules. |
| `clearSorting()` | `() => void` | Clears all active sort rules. |
| `setColumnFilter(columnId, filter)` | `(columnId: string, filter: DataTableColumnFilter \| null) => void` | Sets or clears a column's `"values"` or `"condition"` filter. |
| `clearColumnFilter(columnId)` | `(columnId: string) => void` | Clears the filter on a specific column. |
| `clearAllFilters()` | `() => void` | Clears all active column filters. |
| `isRowSelected(rowId)` | `(rowId: DataTableRowId) => boolean` | Returns whether `rowId` is currently selected. |
| `toggleRowSelection(rowId, options?)` | `(rowId: DataTableRowId, options?: { shiftKey?: boolean; viewIndex?: number }) => void` | Toggles selection for `rowId`, or selects/deselects a contiguous range when `shiftKey` and `viewIndex` are passed. |
| `selectAllVisible()` | `() => void` | Selects all selectable rows in the current filtered view. |
| `deselectAllVisible()` | `() => void` | Deselects all rows in the current filtered view. |
| `selectAllMatching()` | `() => void` | Alias for `selectAllVisible()`. |
| `clearSelection()` | `() => void` | Clears all selected rows across the entire table. |
| `setSelection(ids)` | `(ids: readonly DataTableRowId[]) => void` | Replaces the selection with the given row IDs. |
| `openColumnPopover(columnId, triggerEl?)` | `(columnId: string, triggerEl?: HTMLElement \| null) => void` | Opens the shared sort/filter popover anchored to the specified column header. |
| `closeColumnPopover(options?)` | `(options?: { restoreFocus?: boolean }) => void` | Closes the active column header popover. |
| `scrollToRow(viewIndex, options?)` | `(viewIndex: number, options?: VirtualScrollScrollToIndexOptions) => void` | Scrolls the viewport to the row at `viewIndex`. |
| `scrollToColumn(columnId, options?)` | `(columnId: string, options?: { behavior?: ScrollBehavior }) => void` | Scrolls the horizontal viewport to bring `columnId` into view outside pinned columns. |
| `extractValue(column, row, sourceIndex)` | `(column: DataTableColumn<TRow>, row: TRow, sourceIndex: number) => unknown` | Extracts raw cell value for a column and row. |
| `formatValue(column, value, row)` | `(column: DataTableColumn<TRow>, value: unknown, row: TRow) => string` | Formats a raw cell value using the column's formatter or type default. |

### `DataTable` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "role">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `variant` | `DataTableVariant` | Yes | — | Surface variant: `"elevated" \| "soft" \| "transparent"`. |
| `size` | `DataTableSize` | Yes | — | Density scale: `"xs"` (28px row), `"sm"` (34px row), `"md"` (40px row), `"lg"` (48px row). |
| `table` | `DataTableController<TRow>` | No | `undefined` | Reactive controller created via `createDataTable`. |
| `striped` | `boolean` | No | `false` | Applies alternating background tint to even rows. |
| `gridlines` | `boolean` | No | `false` | Renders vertical divider hairlines between columns. |
| `wrap` | `boolean` | No | `false` | Enables multi-line text wrapping across all cells by default. |
| `colorMode` | `DataTableColorMode` | No | `"tint"` | Default color mode for custom row/column/cell `bg`/`fg` colors (`"tint" \| "exact"`). |
| `role` | `DataTableRole` | No | `"grid"` when virtualized/selectable, else `"table"` | ARIA table role: `"table" \| "grid"`. |
| `scrollbar` | `ScrollAreaScrollbar` | No | `"auto"` | ScrollArea scrollbar visibility mode (`"auto" \| "hover" \| "always" \| "hidden"`). |
| `gridColumns` | `string` | No | Computed from columns | Custom CSS `grid-template-columns` string for declarative tables without a controller. |
| `minWidth` | `number \| string` | No | `undefined` | Optional `min-width` applied to the inner CSS grid element. |
| `label` | `string` | No | `undefined` | Accessible `aria-label` applied to the table grid element. |
| `labelledBy` | `string` | No | `undefined` | Accessible `aria-labelledby` applied to the table grid element. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the outer `.cs-data-table` root element. |
| `viewportRef` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the scrollable viewport element. |
| `children` | `Snippet` | No | `undefined` | Table sections (`<DataTableStatusBar>`, `<DataTableHead>`, `<DataTableBody>`). |

### `DataTableStatusBar` Props
Extends `HTMLAttributes<HTMLDivElement>`. Automatically renders when filters or selections are active (or when custom `children` are provided), showing active filter pills with one-click removal, filtered row counts, and selection summary actions.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selectionActions` | `Snippet<[{ selectedCount: number; clearSelection: () => void }]>` | No | `undefined` | Custom action controls rendered when `selectedCount > 0`. |
| `filterActions` | `Snippet<[{ activeFilterCount: number; clearAllFilters: () => void }]>` | No | `undefined` | Custom action controls rendered when `activeFilterCount > 0`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the status bar element. |
| `children` | `Snippet` | No | `undefined` | Additional custom status bar content. |

### `DataTableHead` & `DataTableHeaderCell` Props

`DataTableHeadProps` extends `HTMLAttributes<HTMLDivElement>` (`ref?: HTMLDivElement | null`, `children?: Snippet`). When `children` is omitted and `table` is provided, `<DataTableHead />` automatically renders the selection header checkbox and all visible column header cells.

`DataTableHeaderCellProps` extends `HTMLAttributes<HTMLDivElement>`:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `columnId` | `string` | No | Auto-generated | Column ID used for track registration and controller lookup. |
| `align` | `DataTableAlign` | No | `"start"` | Header label alignment: `"start" \| "center" \| "end"`. |
| `width` | `number \| string` | No | `"minmax(120px, 1fr)"` | Track width registered with the parent CSS Grid in declarative mode. |
| `minWidth` | `number` | No | `undefined` | Minimum track width in pixels. |
| `maxWidth` | `number` | No | `undefined` | Maximum track width in pixels. |
| `sortable` | `boolean` | No | `false` | Renders the interactive sort trigger and dual-chevron indicator. |
| `filterable` | `boolean` | No | `false` | Renders the filter menu trigger button. |
| `sort` | `DataTableSortDirection \| null` | No | Controller state | Active sort direction (`"asc" \| "desc" \| null`). |
| `sortPriority` | `number` | No | Controller state | 1-based multi-sort priority badge number (shown when multiple columns are sorted). |
| `filtered` | `boolean` | No | Controller state | Highlights the header cell as actively filtered. |
| `open` | `boolean` | No | Controller state | Marks the header cell's popover menu as open. |
| `selection` | `boolean` | No | `false` | Styles the cell as a compact selection checkbox header cell. |
| `pinned` | `DataTablePinPosition` | No | `undefined` | Sticky horizontal pin position: `"start" \| "end"`. |
| `onTrigger` | `(event: MouseEvent \| KeyboardEvent) => void` | No | Controller handler | Custom trigger callback for declarative sortable/filterable headers. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the header cell element. |
| `children` | `Snippet` | No | `undefined` | Header cell label content. |

### `DataTableBody` Props
Extends `Omit<HTMLAttributes<HTMLDivElement>, "children">`.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `cell` | `Snippet<[DataTableCellRenderContext<TRow>]>` | No | `undefined` | Fallback custom cell snippet used for columns that do not define `column.cell`. |
| `row` | `Snippet<[DataTableRowRenderContext<TRow>]>` | No | `undefined` | Custom row rendering snippet in controller mode. |
| `onRowClick` | `(row: TRow, context: { rowId: DataTableRowId; rowIndex: number; event: MouseEvent }) => void` | No | `undefined` | Callback fired when a body row is clicked (excluding interactive controls inside the row). |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the body `rowgroup` element. |
| `children` | `Snippet` | No | `undefined` | Declarative `<DataTableRow>` children, or a custom `<DataTableEmpty>` override in controller mode. |

### `DataTableRow` & `DataTableCell` Props

`DataTableRowProps` extends `HTMLAttributes<HTMLDivElement>`:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `selected` | `boolean` | No | `false` | Highlights the row as selected and sets `aria-selected="true"`. |
| `even` | `boolean` | No | `false` | Marks the row as even-indexed for `striped` tables. |
| `interactive` | `boolean` | No | `false` | Applies pointer cursor and interactive hover feedback. |
| `tone` | `DataTableTone` | No | `undefined` | Semantic row tone: `"base" \| "accent" \| "positive" \| "caution" \| "negative"`. |
| `bg` | `string` | No | `undefined` | Custom row background color. |
| `fg` | `string` | No | `undefined` | Custom row foreground color. |
| `colorMode` | `DataTableColorMode` | No | Table `colorMode` | Color mode for custom `bg`/`fg`: `"tint" \| "exact"`. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the row element. |
| `children` | `Snippet` | No | `undefined` | `<DataTableCell>` children. |

`DataTableCellProps` extends `HTMLAttributes<HTMLDivElement>`:

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `align` | `DataTableAlign` | No | `"start"` (`"end"` if `numeric`) | Cell content alignment: `"start" \| "center" \| "end"`. |
| `numeric` | `boolean` | No | `false` | Applies `font-variant-numeric: tabular-nums` and defaults `align` to `"end"`. |
| `wrap` | `boolean` | No | Table `wrap` | Allows cell text to wrap across multiple lines. |
| `emphasis` | `DataTableEmphasis` | No | `"default"` | Typography emphasis: `"default" \| "strong" \| "weak"`. |
| `tone` | `DataTableTone` | No | `undefined` | Cell semantic tone (overrides column and row tone). |
| `bg` | `string` | No | `undefined` | Cell background color (overrides column and row `bg`). |
| `fg` | `string` | No | `undefined` | Cell foreground color (overrides column and row `fg`). |
| `colorMode` | `DataTableColorMode` | No | `undefined` | Cell color mode (`"tint" \| "exact"`). |
| `colBg` | `string` | No | `undefined` | Column-level background color (overrides row `bg`, yields to cell `bg`). |
| `colFg` | `string` | No | `undefined` | Column-level foreground color (overrides row `fg`, yields to cell `fg`). |
| `colTone` | `DataTableTone` | No | `undefined` | Column-level semantic tone (overrides row `tone`, yields to cell `tone`). |
| `colColorMode` | `DataTableColorMode` | No | `undefined` | Column-level color mode (`"tint" \| "exact"`). |
| `selection` | `boolean` | No | `false` | Styles the cell as a selection checkbox cell. |
| `pinned` | `DataTablePinPosition` | No | `undefined` | Sticky horizontal pin position: `"start" \| "end"`. |
| `bold` | `boolean` | No | `false` | Applies bold font weight. |
| `italic` | `boolean` | No | `false` | Applies italic font style. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the cell element. |
| `children` | `Snippet` | No | `undefined` | Cell content. |

### `DataTableEmpty` Props
Extends `HTMLAttributes<HTMLDivElement>`. Spans across all grid columns when `rowCount === 0` and automatically offers a "Clear all filters" button when the empty state is caused by active filters.

| Prop | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | No | `"No matching rows"` (filtered) / `"No data available"` | Heading text. |
| `description` | `string` | No | Contextual helper copy | Secondary description text. |
| `icon` | `Component<DataTableEmptyIconProps>` | No | Built-in filter/table icon | Custom SVG icon component. |
| `hideReset` | `boolean` | No | `false` | Hides the automatic "Clear all filters" button when filtered. |
| `ref` | `HTMLDivElement \| null` | No | `null` | `$bindable` reference to the empty state element. |
| `children` | `Snippet` | No | `undefined` | Custom action buttons or content below the description. |

### `data-*` Attributes

- **`<DataTable>` (`.cs-data-table`):** `data-variant`, `data-size`, `data-striped`, `data-gridlines`, `data-wrap`, `data-virtualized`, `data-virtual-fixed`, `data-filtered`, `data-has-selection`, `data-scrolled-x-start`, `data-scrolled-x-end`, `data-scrolled-y`.
- **`<DataTableHeaderCell>` (`.cs-data-table-header-cell`):** `data-column-id`, `data-align`, `data-sortable`, `data-filterable`, `data-interactive`, `data-sort` (`"asc" | "desc"`), `data-filtered`, `data-open`, `data-selection`, `data-pinned` (`"start" | "end"`), `data-pinned-edge` (`"start" | "end"`).
- **`<DataTableRow>` (`.cs-data-table-row`):** `data-selected`, `data-even`, `data-interactive`, `data-tone`, `data-color-mode`, `data-custom-bg`, `data-custom-fg`.
- **`<DataTableCell>` (`.cs-data-table-cell`):** `data-align`, `data-numeric`, `data-wrap`, `data-emphasis`, `data-tone`, `data-color-mode`, `data-custom-bg`, `data-custom-fg`, `data-col-tone`, `data-col-color-mode`, `data-col-bg`, `data-col-fg`, `data-selection`, `data-pinned` (`"start" | "end"`), `data-pinned-edge` (`"start" | "end"`), `data-bold`, `data-italic`.

## Examples

### Controller Mode with Sorting, Filtering & Selection
```svelte
<script lang="ts">
    import {
        createDataTable,
        DataTable,
        DataTableBody,
        DataTableHead,
        DataTableStatusBar,
        type DataTableColumn,
    } from "cs/svelte/data-table";

    interface Invoice {
        id: string;
        customer: string;
        status: "Paid" | "Pending" | "Overdue";
        amount: number;
    }

    const invoices: Invoice[] = [
        { id: "INV-101", customer: "Acme Corp", status: "Paid", amount: 4200 },
        { id: "INV-102", customer: "Globex", status: "Pending", amount: 1850 },
        { id: "INV-103", customer: "Initech", status: "Overdue", amount: 940 },
    ];

    const columns: DataTableColumn<Invoice>[] = [
        { id: "id", label: "Invoice", width: 120, pinned: "start", sortable: true, emphasis: "strong" },
        { id: "customer", label: "Customer", sortable: true, filterable: true },
        {
            id: "status",
            label: "Status",
            width: 140,
            sortable: true,
            filterable: true,
            tone: (value) => (value === "Paid" ? "positive" : value === "Overdue" ? "negative" : "caution"),
        },
        { id: "amount", label: "Amount", type: "currency", width: 140, sortable: true, filterable: true },
    ];

    const table = createDataTable({
        data: () => invoices,
        columns: () => columns,
        getRowId: (row) => row.id,
        selectable: true,
        multiSort: true,
    });
</script>

<DataTable variant="elevated" size="md" {table} striped>
    <DataTableStatusBar />
    <DataTableHead />
    <DataTableBody />
</DataTable>
```

### Virtualized Large Dataset
```svelte
<script lang="ts">
    import { createDataTable, DataTable, DataTableBody, DataTableHead } from "cs/svelte/data-table";

    const rows = Array.from({ length: 10_000 }, (_, i) => ({
        id: i + 1,
        name: `Node-${i + 1}`,
        latency: Math.round(Math.sin(i) * 40 + 55),
    }));

    const table = createDataTable({
        data: () => rows,
        columns: [
            { id: "id", label: "ID", type: "number", width: 90, sortable: true },
            { id: "name", label: "Host", sortable: true, filterable: true },
            { id: "latency", label: "Latency (ms)", type: "number", width: 140, sortable: true },
        ],
        getRowId: (row) => row.id,
        virtualize: true,
    });
</script>

<DataTable variant="soft" size="sm" {table} class="h-96">
    <DataTableHead />
    <DataTableBody />
</DataTable>
```

### Declarative Mode
```svelte
<script lang="ts">
    import {
        DataTable,
        DataTableBody,
        DataTableCell,
        DataTableHead,
        DataTableHeaderCell,
        DataTableRow,
    } from "cs/svelte/data-table";
</script>

<DataTable variant="soft" size="md">
    <DataTableHead>
        <DataTableHeaderCell width="160px">Region</DataTableHeaderCell>
        <DataTableHeaderCell>Cluster</DataTableHeaderCell>
        <DataTableHeaderCell width="120px" align="end">Uptime</DataTableHeaderCell>
    </DataTableHead>
    <DataTableBody>
        <DataTableRow>
            <DataTableCell emphasis="strong">eu-central-1</DataTableCell>
            <DataTableCell>fra-prod-01</DataTableCell>
            <DataTableCell numeric tone="positive">99.99%</DataTableCell>
        </DataTableRow>
    </DataTableBody>
</DataTable>
```

## Keyboard & Pointer Interaction

- **3-State Sort Cycle & Dual-Chevron Indicator:** Sortable header cells render a persistent dual-chevron indicator (`data-sort="asc" | "desc"`). Clicking a sortable header (that is not filterable, or clicking the sort trigger area when split from the filter button) cycles `"asc" -> "desc" -> unsorted (null)`. When `multiSort: true` is enabled on the controller, holding `Shift` while clicking adds or updates the column as a secondary/tertiary sort rule with a 1-based priority badge.
- **`pointerdown` Open + `pointerup` Drag-Release in Column Menus:** Filterable column header triggers open the shared column popover immediately on primary `pointerdown` for zero-latency response. Keeping the pointer pressed, dragging onto a "Sort ascending", "Sort descending", "Clear sort", or "Clear column filter" menu item, and releasing (`pointerup`) executes that action and closes the popover in a single gesture after a `140ms` hold threshold. A quick click (<`140ms`) keeps the popover open for normal browsing and checklist search.
- **`Shift+Click` Range Selection:** Clicking a row's selection checkbox toggles that row and records its `viewIndex` as the selection anchor. Holding `Shift` while clicking another row's selection checkbox selects or deselects all selectable visible rows between the anchor index and the target row in the current sorted/filtered order.
- **Popover & Checklist Keyboard Navigation:** Inside the column filter popover, `ArrowDown` and `ArrowUp` move focus across sort actions, the search input, and virtualized checklist items; `Escape` closes the popover and restores focus to the header trigger.
- **Horizontal Keyboard Scrolling with Sticky Pinned Columns:** Focusing the table viewport and pressing `ArrowLeft` / `ArrowRight` scrolls horizontally while automatically adjusting `scroll-padding-inline` to account for sticky `pinned="start"` and `pinned="end"` columns.
