# DataTable — Module Blueprint

## 1. Overview & Scope

- **Module:** `data-table` (`src/modules/data-table/`)
- **Import Path:** `cs/svelte/data-table` (`src/modules/data-table/index.ts`)
- **Kind:** `hybrid` (headless reactive Svelte 5 controller `createDataTable` + flat `PascalCase` compound component suite)
- **CSS Layer:** `@layer components.composite` (co-located `data-table.css`, imported by `DataTable.svelte`)
- **Purpose:** A standalone, general-purpose read-only interactive data table and grid surface that scales effortlessly from a 5-row declarative list inside a `Card` to a 100,000-row, multi-column analytical dataset. Combines calm typographic clarity with deterministic CSS Grid rows, quiet in-header sorting & filtering, full per-cell/row/column styling, and flow-preserving row virtualization.

### Dual Authoring Modes

1. **Declarative Compound Mode (Zero Controller Boilerplate):**
   Compose `<DataTable>`, `<DataTableHead>`, `<DataTableHeaderCell>`, `<DataTableBody>`, `<DataTableRow>`, `<DataTableCell>`, and `<DataTableEmpty>` directly for small list tables or server-driven tables.
2. **Controller-Driven Mode (`createDataTable` + Compound Components):**
   Pass `table={createDataTable(...)}` to `<DataTable>` for built-in sorting (single + optional multi-sort), column header popover filtering (value checklist + condition rules), row selection (including tri-state header & `Shift+Click` range select), contextual `<DataTableStatusBar>`, and 100k-row `VirtualScroll` Padding Mode virtualization—while retaining 100% custom cell/row rendering flexibility via Svelte snippets.

### Boundaries & Module Composition

- **Public Sibling Composition Only (Zero Cross-Module Internals):**
  - `../scroll-area/index.ts` (`ScrollArea`, `ScrollAreaContent`) — 2D overlay scrollbars and scroll container.
  - `../virtual-scroll/index.ts` (`createVirtualScroll`) — Flow-preserving Padding Mode virtualization for both the main table body and high-cardinality filter checklists.
  - `../popover/index.ts` (`Popover`) — Single shared column header sort/filter floating panel.
  - `../checkbox/index.ts` (`Checkbox`) — Row/header selection and filter value checklists.
  - `../text-input/index.ts` (`TextInput`, `TextInputField`) — Condition filter value inputs (checklist search uses a flush borderless `<input>` directly inside the popover header with zero nested box).
  - `../select/index.ts` (`Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`) — Condition filter operator selector.
  - `../segmented-control/index.ts` (`SegmentedControl`, `SegmentedControlItem`, `SegmentedControlLabel`) — `Values` | `Condition` filter mode switcher inside column popover (mounted only when a column enables both modes).
  - `../button/index.ts` (`Button`, `ButtonLabel`) — Calm ghost/secondary reset and bulk-action controls.
- **Shared Internal Utilities:**
  - `../../shared/surface-radius/index.ts` (`createSurfaceRadius`) — Concentric corner radii when nested inside `Card` or `KpiCard`.
  - `../../shared/resolve-getter.ts` (`resolveGetter`) — Uniform `MaybeGetter<T>` resolution.
  - `../../shared/listbox/listbox.css` — Floating panel visual grammar and hairline separator tokens for the column header popover.
  - `../../shared/lang.internal.ts` (`t`) — Compile-time `de`/`en` localization for all built-in UI copy and ARIA defaults.
- **Standalone UI Module:** `src/modules/data-table/` is 100% self-contained with zero domain-specific coupling to other data modules.
- **V1 ContextMenu Verdict:** A right-click `ContextMenu` module is **explicitly out of scope for V1**. All column operations (sort, clear sort, value checklist, condition filter) live inside the keyboard-accessible Column Header Popover, row actions belong in an optional trailing cell using `Dropdown`, and native browser right-click remains unobstructed for read-only text copy and inspection.

### File Layout (`src/modules/data-table/`)

All files strictly follow `.agents/rules/naming.md` (`*.internal.*` files are NEVER re-exported from `index.ts`):

| File | Visibility | Responsibility |
| :--- | :--- | :--- |
| `index.ts` | Public | Sole public barrel exporting components, `createDataTable`, `DataTableController`, constants, types, and public context helpers. |
| `data-table.svelte.ts` | Public (via `index.ts`) | Headless reactive `DataTableController` class and `createDataTable()` factory. |
| `data-table.context.ts` | Public (via `index.ts`) | Typed `DataTableContext` (`getDataTableContext`, `setDataTableContext`, `hasDataTableContext`). |
| `data-table.css` | Internal stylesheet | Complete `@layer components.composite` styling (variants, sizes, sticky geometry, 3-layer paint stack, tones, popover layout). |
| `DataTable.svelte` | Public | Root shell, `createSurfaceRadius`, `ScrollArea`, `.cs-data-table-canvas`, scroll-state tracking, and automatic single-instance column popover host. |
| `DataTableStatusBar.svelte` | Public | Calm bottom-docked contextual filter/selection strip (occupies `0px` when idle; smooth `grid-template-rows: 0fr → 1fr` reveal). |
| `DataTableHead.svelte` | Public | Sticky header wrapper (`role="rowgroup"` + `.cs-data-table-header-row`), auto-rendering controller columns or declarative children. |
| `DataTableHeaderCell.svelte` | Public | Individual column header (`role="columnheader"`), unified interactive trigger with concentric inset squircle pill (`::before`), optical sort/filter indicators, and declarative column track registration. |
| `DataTableBody.svelte` | Public | Body region (`role="rowgroup"`), integrating `VirtualScroll` Padding Mode or standard flow, with auto-render, `cell` snippet, `row` snippet, or declarative children. |
| `DataTableRow.svelte` | Public | Grid row (`role="row"`), logical `[data-even]`, selection/tone/custom-fill variables, and optional `onRowClick` interactivity. |
| `DataTableCell.svelte` | Public | Grid cell (`role="cell"` / `"gridcell"`), 3-layer paint stack, composed inset hairlines, alignment, `tabular-nums`, truncation/wrapping, and optional `selection` / `pinned` / `tone` / `bg` / `fg` / `colorMode`. |
| `DataTableEmpty.svelte` | Public | Quiet centered empty & filtered-empty state with one-click filter reset. |
| `DataTableColumnPopover.internal.svelte` | Internal | Single shared floating sort & filter popover (`Popover` + 2-up horizontal sort toggles + conditional `SegmentedControl` + flush borderless search + additive unchecked-at-rest checklist + condition builder + conditional bottom footer). |
| `data-table-engine.internal.ts` | Internal | Pure functions: filter predicate compilation, Schwartzian sorting, null-last type-aware comparators, lazy cross-filtered facet aggregation, grid track compiler. |
| `data-table-scroll.internal.ts` | Internal | rAF-coalesced passive scroll-state attachment (`scrolledY`, `scrolledXStart`, `scrolledXEnd`, `isScrolling`) for `.cs-scroll-area-content`. |
| `data-table.blueprint.md` | Docs | This technical architecture blueprint. |
| `data-table.design.md` | Docs | Visual craft and token specification. |
| `data-table.docs.md` | Docs | Consumer documentation. |
| `DataTable.preview.svelte` | Preview | Interactive playground, 100k-row stress test, conditional formatting, card nesting, and empty states. |
| `data-table.test.ts` | Tests | Vitest unit tests (engine: sorting, filtering, facets, grid track compiler, 100k benchmarks). |
| `data-table.svelte.test.ts` | Tests | Vitest Svelte component & controller reactivity tests. |

---

## 2. Public API

### 2.1 Exports (`src/modules/data-table/index.ts`)

**Components (flat `PascalCase`):**
- `DataTable`
- `DataTableStatusBar`
- `DataTableHead`
- `DataTableHeaderCell`
- `DataTableBody`
- `DataTableRow`
- `DataTableCell`
- `DataTableEmpty`

**Controller & Context:**
- `createDataTable`, `DataTableController`
- `getDataTableContext`, `setDataTableContext`, `hasDataTableContext`, `type DataTableContext`

**Constants & Union Types:**
- `DATA_TABLE_VARIANTS = ["elevated", "soft", "transparent"] as const` → `DataTableVariant`
- `DATA_TABLE_SIZES = ["xs", "sm", "md", "lg"] as const` → `DataTableSize`
- `DATA_TABLE_ALIGNS = ["start", "center", "end"] as const` → `DataTableAlign`
- `DATA_TABLE_TONES = ["base", "accent", "positive", "caution", "negative"] as const` → `DataTableTone`
- `DATA_TABLE_COLOR_MODES = ["tint", "exact"] as const` → `DataTableColorMode`
- `DATA_TABLE_COLUMN_TYPES = ["text", "number", "currency", "percent", "date", "datetime", "boolean"] as const` → `DataTableColumnType`
- `DATA_TABLE_SORT_DIRECTIONS = ["asc", "desc"] as const` → `DataTableSortDirection`
- `DATA_TABLE_FILTER_MODES = ["values", "condition", "both", "auto"] as const` → `DataTableFilterMode`
- `DATA_TABLE_CONDITION_OPERATORS = ["contains", "notContains", "equals", "notEquals", "startsWith", "endsWith", "gt", "gte", "lt", "lte", "between", "isEmpty", "isNotEmpty"] as const` → `DataTableConditionOperator`
- `DATA_TABLE_PIN_POSITIONS = ["start", "end"] as const` → `DataTablePinPosition`
- `DATA_TABLE_EMPHASES = ["default", "strong", "weak"] as const` → `DataTableEmphasis`
- `DATA_TABLE_ROLES = ["table", "grid"] as const` → `DataTableRole`

### 2.2 Headless Controller API (`createDataTable`)

#### Core Data & Column Contracts

```ts
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
          /** Additive selected canonical value keys (empty string "" represents blank/null). Must be non-empty; unchecking the last value clears the column filter back to `null` (0 checked boxes = unfiltered). */
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

export interface DataTableColumn<TRow = Record<string, unknown>> {
    id: string;
    label: string;
    subLabel?: string;
    /** Data type driving default alignment, tabular-nums, sort comparator, sort copy, and condition operators. @default "text" */
    type?: DataTableColumnType;
    /** Value extractor. Falls back to `row[id]` if omitted. */
    accessor?: keyof TRow | ((row: TRow, sourceIndex: number) => unknown);
    /** Custom string formatter for display, value-checklist labels, and text search. */
    format?: (value: unknown, row: TRow) => string;
    /** Optional custom cell snippet for rich embedded components. */
    cell?: Snippet<[DataTableCellRenderContext<TRow>]>;
    /** Optional custom header label snippet. */
    header?: Snippet<[{ column: DataTableColumn<TRow> }]>;
    /** Explicit alignment override. Defaults by `type` (number/currency/percent/datetime -> "end", boolean -> "center", else "start"). */
    align?: DataTableAlign;
    /** Explicit width (`number` -> px, `string` -> CSS grid track). */
    width?: number | string;
    /** Minimum track width in px. @default 120 */
    minWidth?: number;
    /** Optional maximum track width in px. */
    maxWidth?: number;
    /** Enables sorting on this column. @default false */
    sortable?: boolean;
    /** Custom comparator override (`< 0`, `0`, `> 0`). Null/empty handling remains last unless `sortEmpty` is handled explicitly. */
    sortFn?: (a: TRow, b: TRow) => number;
    /** Enables column header filtering popover. @default false */
    filterable?: boolean;
    /** Filter UI mode inside popover. @default "auto" */
    filterMode?: DataTableFilterMode;
    /** Optional explicit condition operator whitelist for this column. */
    conditionOperators?: readonly DataTableConditionOperator[];
    /** Enables multi-line text wrapping for this column's cells. @default false */
    wrap?: boolean;
    /** Cell typographic emphasis (`"strong"` for primary identifier columns). */
    emphasis?: DataTableEmphasis;
    /** Static or per-cell semantic tone (`"base" | "accent" | "positive" | "caution" | "negative"`). */
    tone?: DataTableTone | ((value: unknown, row: TRow) => DataTableTone | undefined);
    /** Static or per-cell custom styling (harmonized `tint` or verbatim `exact` colors). */
    cellStyle?: DataTableCellStyle | ((value: unknown, row: TRow, sourceIndex: number) => DataTableCellStyle | undefined);
    /** Column-level background/foreground fill (Layer 1 column tier). */
    bg?: string;
    fg?: string;
    colorMode?: DataTableColorMode;
    /** V2-ready column visibility hook (`false` omits column from grid & DOM). @default true */
    visible?: boolean;
    /** V2-ready pinning hook (`"start"` / `"end"`). Selection column uses `"start"` automatically in V1. */
    pinned?: DataTablePinPosition;
}
```

#### `createDataTable(options: DataTableOptions<TRow>): DataTableController<TRow>`

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `data` | `DataTableMaybeGetter<readonly TRow[]>` | Required | Source rows array (use `$state.raw` for 10k+ row datasets to avoid deep Svelte proxy overhead). |
| `columns` | `DataTableMaybeGetter<readonly DataTableColumn<TRow>[]>` | Required | Column specifications. |
| `getRowId` | `(row: TRow, sourceIndex: number) => DataTableRowId` | `(_, i) => i` | Stable unique row key for selection, `{#each}` keying, and `VirtualScroll`. |
| `selectable` | `DataTableMaybeGetter<boolean>` | `false` | Enables leading pinned selection checkbox column and row selection state. |
| `isRowSelectable` | `(row: TRow, sourceIndex: number) => boolean` | `() => true` | Per-row selection guard (disabled checkbox on non-selectable rows). |
| `multiSort` | `DataTableMaybeGetter<boolean>` | `false` | Allows sorting by multiple columns simultaneously (`Shift+Click` on sort-only columns or multi-column sort API). |
| `initialSorting` | `readonly DataTableSortRule[]` | `[]` | Initial sort state. |
| `initialFilters` | `Readonly<Record<string, DataTableColumnFilter>>` | `{}` | Initial per-column filter map. |
| `initialSelection` | `readonly DataTableRowId[]` | `[]` | Initial selected row IDs. |
| `rowTone` | `(row: TRow, sourceIndex: number) => DataTableTone \| undefined` | `undefined` | Per-row semantic tone resolver. |
| `rowStyle` | `(row: TRow, sourceIndex: number) => DataTableRowStyle \| undefined` | `undefined` | Per-row custom `bg`/`fg`/`colorMode` resolver. |
| `virtualize` | `DataTableMaybeGetter<boolean \| DataTableVirtualizeOptions>` | `false` | Explicit opt-in to `VirtualScroll` Padding Mode (`overscan`, `estimatedRowHeight`, `initialViewportSize`, `initialRenderCount`, `fixed`). |
| `highCardinalityThreshold` | `number` | `500` | Distinct-value count above which `"auto"` / `"both"` filter popovers open on the `Condition` tab by default. |
| `maxChecklistValues` | `number` | `10_000` | Safety cap on distinct checklist items materialized in a single column popover. |
| `locale` | `DataTableMaybeGetter<string \| undefined>` | `undefined` | Optional `Intl.Collator` locale for text sorting. |
| `onSortingChange` | `(sorting: readonly DataTableSortRule[]) => void` | `undefined` | Callback fired after sorting changes. |
| `onFiltersChange` | `(filters: Readonly<Record<string, DataTableColumnFilter>>) => void` | `undefined` | Callback fired after filters change. |
| `onSelectionChange` | `(selectedIds: readonly DataTableRowId[]) => void` | `undefined` | Callback fired after row selection changes. |

#### `DataTableController<TRow>` Reactive State & Methods

- **Reactive Getters:**
  - `columns: readonly DataTableColumn<TRow>[]` — Active visible columns (`col.visible !== false`).
  - `totalRowCount: number` — Raw `data.length`.
  - `rowCount: number` — Post-filter view row count (`sortedIndices.length`).
  - `rows: readonly DataTableRowView<TRow>[]` — Lazy `$derived` full view array (ergonomic for non-virtualized tables; never allocated when virtualized body accesses `getRowAt(viewIndex)`).
  - `sorting: readonly DataTableSortRule[]` — Active sort rules in priority order.
  - `filters: Readonly<Record<string, DataTableColumnFilter>>` — Active column filters.
  - `activeFilterColumns: readonly DataTableColumn<TRow>[]` — Filtered columns in column order (drives `DataTableStatusBar` clickable column links).
  - `activeFilterCount: number` — Number of active column filters.
  - `isFiltered: boolean` — `activeFilterCount > 0`.
  - `selectable: boolean` — Whether selection is enabled.
  - `selectedRowIds: ReadonlySet<DataTableRowId>` — Selected row IDs.
  - `selectedCount: number` — Number of currently selected rows.
  - `allVisibleSelected: boolean` / `someVisibleSelected: boolean` — Tri-state values for header `<Checkbox>`.
  - `openPopoverColumnId: string | null` — Currently open column header popover ID.
  - `openPopoverFacets: DataTableFacetResult` — Lazily computed cross-filtered distinct values for `openPopoverColumnId` ONLY (empty when closed).
  - `isVirtualized: boolean` — Whether virtualization is active.
  - `virtual: VirtualScrollController | null` — Underlying `VirtualScrollController` when virtualized (exposes `scrollToIndex`, `scrollToOffset`, `visibleRange`, `isScrolling`, `measure`, `invalidate`).
- **Methods:**
  - `getRowAt(viewIndex: number): DataTableRowView<TRow> | undefined` — O(1) indexed access used by virtualized rendering.
  - `getColumnSort(columnId: string): { direction: DataTableSortDirection; priority: number } | null`
  - `toggleSort(columnId: string, options?: { multi?: boolean }): void` — Cycles `none -> asc -> desc -> none`.
  - `setColumnSort(columnId: string, direction: DataTableSortDirection | null, options?: { multi?: boolean }): void`
  - `setSorting(rules: readonly DataTableSortRule[]): void` / `clearSorting(): void`
  - `setColumnFilter(columnId: string, filter: DataTableColumnFilter | null): void` — Passing `null` or a `{ kind: "values", selected: [] }` payload clears the column filter (additive unchecked-at-rest semantics: `0` checked boxes = no active filter).
  - `clearColumnFilter(columnId: string): void` / `clearAllFilters(): void`
  - `isRowSelected(rowId: DataTableRowId): boolean`
  - `toggleRowSelection(rowId: DataTableRowId, options?: { shiftKey?: boolean; viewIndex?: number }): void` — Supports `Shift+Click` contiguous range selection in current view order.
  - `selectAllVisible(): void` / `selectAllMatching(): void` / `clearSelection(): void` / `setSelection(ids: readonly DataTableRowId[]): void`
  - `openColumnPopover(columnId: string, triggerEl?: HTMLElement | null): void` — Scrolls column header into horizontal view if needed and opens the shared column popover anchored to it.
  - `closeColumnPopover(options?: { restoreFocus?: boolean }): void`
  - `scrollToRow(viewIndex: number, options?: VirtualScrollScrollToIndexOptions): void`
  - `scrollToColumn(columnId: string, options?: { behavior?: ScrollBehavior }): void`

### 2.3 Compound Component Props

> **Mandatory API Rules:** `variant` and `size` on `DataTable` are **required** with NO default values. Every DOM-rendering component exposes `ref = $bindable(null)` and forwards `{...rest}` (`class={["cs-...", className]}`).

#### `DataTable<TRow>` (`Omit<HTMLAttributes<HTMLDivElement>, "role">`)
- `ref = $bindable<HTMLDivElement | null>(null)` — Root `.cs-data-table` shell.
- `viewportRef = $bindable<HTMLDivElement | null>(null)` — Inner `ScrollAreaContent` scroll viewport.
- `variant: DataTableVariant` — **Required** (`"elevated" | "soft" | "transparent"`).
- `size: DataTableSize` — **Required** (`"xs" | "sm" | "md" | "lg"`).
- `table?: DataTableController<TRow>` — Optional headless controller.
- `striped?: boolean` — `@default false` (alternating logical `[data-even]` bands; suppresses row hairlines unless `gridlines` is also set).
- `gridlines?: boolean` — `@default false` (opt-in vertical column cell seams).
- `wrap?: boolean` — `@default false` (table-wide cell wrapping; automatically switches `VirtualScroll` to measured mode `fixed: false` when virtualized).
- `colorMode?: DataTableColorMode` — `@default "tint"` (default custom-color mode for `bg` overrides; overridable per row/column/cell).
- `role?: DataTableRole` — `@default "table"` (`"table" | "grid"`).
- `scrollbar?: ScrollAreaScrollbar` — `@default "hover"` (forwarded to `ScrollArea`).
- `gridColumns?: string` — Optional explicit `--cs-data-table-grid-columns` override for declarative tables.
- `minWidth?: number | string` — Optional explicit `--cs-data-table-min-width` override for declarative tables.
- `label?: string` / `labelledBy?: string` — Accessible name wired onto the inner `[role="table" | "grid"]` element.
- `children?: Snippet`

#### `DataTableStatusBar` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `selectionActions?: Snippet<[{ selectedCount: number; clearSelection: () => void }]>` — Bulk-action controls rendered on the trailing end when `selectedCount > 0`.
- `filterActions?: Snippet<[{ activeFilterCount: number; clearAllFilters: () => void }]>` — Optional override/supplement on the trailing end when in filter-summary mode.
- `children?: Snippet` — Optional fully custom status bar content (for declarative mode).
- *Behavior:* Docked at the **bottom** of `.cs-data-table` (below `.cs-scroll-area`, `flex-shrink: 0`) so toggling filters or row checkboxes never causes top layout jump or shifts headers, anchored popovers, or rows under the pointer. Occupies `0px` when idle and reveals smoothly via a `grid-template-rows: 0fr → 1fr` + `opacity` transition (`--cs-dur-200` `--cs-ease-quart-out`) whenever `activeFilterCount > 0`, `selectedCount > 0`, or custom `children` are provided.

#### `DataTableHead` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `children?: Snippet` — Optional declarative `<DataTableHeaderCell>`s. When omitted and `table` is present in context, auto-renders the selection header cell (if `table.selectable`) and every visible column in `table.columns`.

#### `DataTableHeaderCell` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `columnId?: string` — Column identifier (used for anchor lookup, `scrollToColumn`, and popover wiring).
- `align?: DataTableAlign` — `@default "start"`.
- `width?: number | string` / `minWidth?: number` / `maxWidth?: number` — Participates in automatic declarative track compilation when no controller is attached.
- `sortable?: boolean` / `filterable?: boolean`
- `sort?: DataTableSortDirection | null` — Active sort direction (`"asc" | "desc" | null`).
- `sortPriority?: number` — 1-based multi-sort priority badge (`1`, `2`, ...).
- `filtered?: boolean` — Active filter cue (`data-filtered`).
- `open?: boolean` — Popover open cue (`data-open`).
- `selection?: boolean` — Renders the fixed-width leading selection header cell (`data-selection`, `data-pinned="start"`).
- `pinned?: DataTablePinPosition` — `"start" | "end"`.
- `onTrigger?: (event: MouseEvent | KeyboardEvent) => void` — Declarative activation callback when not controller-driven.
- `children?: Snippet`

#### `DataTableBody<TRow>` (`Omit<HTMLAttributes<HTMLDivElement>, "children">`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `cell?: Snippet<[DataTableCellRenderContext<TRow>]>` — Custom cell renderer override (applied across all columns that do not define their own `column.cell` snippet).
- `row?: Snippet<[DataTableRowRenderContext<TRow>]>` — Full custom row renderer (receives `row`, `rowId`, `rowIndex`, `sourceIndex`, `isSelected`, `isEven`, `ariaProps`, `attachRow`).
- `onRowClick?: (row: TRow, context: { rowId: DataTableRowId; rowIndex: number; event: MouseEvent }) => void` — Marks rows `[data-interactive]` and fires on non-control row clicks (ignores clicks originating from nested `<button>`, `<a>`, `<input>`, `<label>`).
- `children?: Snippet` — Declarative `<DataTableRow>` children when not controller-driven.

#### `DataTableRow` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `selected?: boolean` — Sets `data-selected` (and `aria-selected` only when table `role="grid"`).
- `even?: boolean` — Logical parity flag (`data-even`) for virtualization-safe zebra striping.
- `interactive?: boolean` — Sets `data-interactive` when row has click behavior.
- `tone?: DataTableTone` — Row-level semantic tone (`data-tone`).
- `bg?: string` / `fg?: string` / `colorMode?: DataTableColorMode` — Row-level custom fill & ink (Layer 1 row tier).
- `children?: Snippet`

#### `DataTableCell` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `align?: DataTableAlign` — `@default "start"`.
- `numeric?: boolean` — Applies `font-variant-numeric: tabular-nums lining-nums` (`data-numeric`).
- `wrap?: boolean` — Opt-in multi-line cell wrapping (`data-wrap`).
- `emphasis?: DataTableEmphasis` — `"default" | "strong" | "weak"` (`data-emphasis`).
- `tone?: DataTableTone` — Cell-level semantic tone (`data-tone`).
- `bg?: string` / `fg?: string` / `colorMode?: DataTableColorMode` — Cell-level custom fill & ink (Layer 1 highest-precedence cell tier).
- `colBg?: string` / `colFg?: string` / `colTone?: DataTableTone` — Optional column-tier fill tokens applied automatically in controller mode.
- `selection?: boolean` — Selection checkbox cell (`data-selection`, `data-pinned="start"`).
- `pinned?: DataTablePinPosition` — `"start" | "end"`.
- `children?: Snippet`

#### `DataTableEmpty` (`HTMLAttributes<HTMLDivElement>`)
- `ref = $bindable<HTMLDivElement | null>(null)`
- `title?: string` — Defaults contextually via `t({ de, en })` (`"No rows yet"` vs `"No matching rows"` when `table.isFiltered`).
- `description?: string` — Concise 1-line helper text (auto-localized default when filtered).
- `icon?: Component` — Optional bare monochrome Lucide icon override (`20px`–`24px`, `stroke-width: 1.75`).
- `hideReset?: boolean` — `@default false` (hides automatic `Reset filters` button in filtered-empty state).
- `children?: Snippet` — Optional fully custom empty state body.
- *Behavior:* In controller-driven mode, automatically renders ONLY when `table.rowCount === 0` (leaving `<DataTableHead>` visible at full width).

### 2.4 CSS Custom Properties (`--cs-data-table-*`)

All tokens strictly follow `.agents/rules/naming.md` (`bg`, `fg`, `shadow`, `radius`, `dur`, `ease` — never `--_` or forbidden aliases like `surface`):

| Token | Role & Default |
| :--- | :--- |
| `--cs-data-table-bg` | Shell fill (`--cs-color-elevated` / `--cs-color-base-soft` / `transparent`). |
| `--cs-data-table-fg` | Default body text (`--cs-color-text-main`). |
| `--cs-data-table-backdrop-bg` | Consumer override for opaque sticky header & pinned-column backing when `variant="transparent"` sits on a non-canvas backdrop (e.g. `var(--cs-color-elevated)` inside a `Card`). Defaults to `var(--cs-color-canvas)`. |
| `--cs-data-table-header-bg` | 100% opaque surface-matched sticky header background per variant (no grey header slab at rest). |
| `--cs-data-table-sticky-bg` | 100% opaque pinned-column backing per variant and `[data-striped] [data-even]` state. |
| `--cs-data-table-shadow` | Outer shell shadow (`--cs-shadow-elevated` on `elevated` in light mode; dark-mode specular rim rendered via `::after` overlay at `z-index: 40`; `none` on `soft`/`transparent`). |
| `--cs-data-table-header-shadow-scrolled` | Contact shadow fading in beneath sticky header on `[data-scrolled-y]`. |
| `--cs-data-table-divider` / `--cs-data-table-header-divider` / `--cs-data-table-gridline` | Composed `inset box-shadow` cell row divider, unbroken `1px` header hairline, and opt-in vertical column hairlines. |
| `--cs-data-table-stripe-bg` | Alternating `[data-even]` row tint when `[data-striped]`. |
| `--cs-data-table-radius` / `--cs-data-table-nested-radius` / `--cs-data-table-squircle` | Outer squircle radius (`12px`/`16px`/`24px`/`28px`, concentric when `[data-nested]`). |
| `--cs-data-table-grid-columns` | Shared CSS Grid track template applied to `.cs-data-table-header-row` and every `.cs-data-table-row`. |
| `--cs-data-table-min-width` | Computed minimum canvas inline-size (`px`) driving deterministic horizontal overflow. |
| `--cs-data-table-row-height` / `--cs-data-table-header-height` / `--cs-data-table-status-bar-height` | Exact integer px row (`28`/`36`/`44`/`52`), header (`30`/`34`/`38`/`42`), and status bar (`32`/`34`/`38`/`42`) heights. |
| `--cs-data-table-cell-px` / `--cs-data-table-edge-px` / `--cs-data-table-cell-py` | Inner cell inline padding (`8`/`10`/`12`/`16`), outer first/last column clearance (`12`/`16`/`20`/`24`, or `8`/`10`/`12`/`16` on `transparent`), and wrapped block padding (`6`/`9`/`12`/`16`). |
| `--cs-data-table-selection-width` | Fixed leading selection track width (`36px`/`40px`/`44px`/`52px`). |
| `--cs-data-table-font-size` / `--cs-data-table-line-height` | Body font size & snapped integer line-height (`16px`/`18px`/`20px`). |
| `--cs-data-table-header-font-size` / `--cs-data-table-header-line-height` | Header font size & snapped integer line-height (`16px`/`18px`). |
| `--cs-data-table-cell-bg` / `--cs-data-table-cell-fg` | Layer 1 cell custom fill & ink overrides. |
| `--cs-data-table-row-bg` / `--cs-data-table-row-fg` | Layer 1 row custom fill & ink overrides. |
| `--cs-data-table-col-bg` / `--cs-data-table-col-fg` | Layer 1 column custom fill & ink overrides. |
| `--cs-data-table-row-hover-dur` | Row hover transition duration (`var(--cs-dur-60)`, snapped to `0ms` while `[data-scrolling]`). |

---

### 2.5 Core Architectural Solutions

#### A. CSS Grid Rows + `VirtualScroll` Padding Mode + 2D Scroll + Sticky Header & Columns

`src/modules/virtual-scroll/` uses **flow-preserving Padding Mode** (`attachList` setting exact integer `padding-block-start` / `padding-block-end` in normal document flow — zero `position: absolute`, zero `translate3d`). Rows are never promoted onto GPU transform layers (eliminating bilinear subpixel text blur by construction), native tab order and text selection flow naturally, and `padding-block-start` is always an exact integer multiple of `--cs-data-table-row-height` in `fixed: true` mode.

Exact DOM wrapper geometry inside `<DataTable>`:

```text
.cs-data-table (div; overflow: clip; isolation: isolate; display: flex; flex-direction: column;
                border-radius; corner-shape; box-shadow;
                [data-variant="elevated"]::after dark-mode specular rim at z-index: 40; pointer-events: none;
                data-variant, data-size, data-striped, data-gridlines, data-nested,
                data-scrolled-y, data-scrolled-x-start, data-scrolled-x-end, data-scrolling)
├── .cs-scroll-area (ScrollArea, flex: 1 1 auto; min-height: 0; direction="both")
│   └── .cs-data-table-viewport (.cs-scroll-area-content; overflow: auto;
│                                scroll-padding-block-start: calc(var(--cs-data-table-header-height) + 4px);
│                                @attach scrollState + @attach virtual.attachViewport)
│       └── .cs-data-table-canvas (role="table" | "grid";
│                                  display: flex; flex-direction: column;
│                                  inline-size: max(100%, var(--cs-data-table-min-width, 0px));
│                                  min-block-size: 100%)
│           ├── .cs-data-table-header (role="rowgroup"; position: sticky; inset-block-start: 0; z-index: 10;
│           │                          inline-size: 100%; background: var(--cs-data-table-header-bg);
│           │                          unbroken 1px inset bottom hairline)
│           │   └── .cs-data-table-header-row (role="row"; display: grid;
│           │                                  grid-template-columns: var(--cs-data-table-grid-columns))
│           │       └── .cs-data-table-header-cell (role="columnheader";
│           │                                       [data-pinned="start"]: sticky inset-inline-start: 0 z-index: 15)
│           │           └── .cs-data-table-header-trigger (full-cell button; inset squircle pill via ::before;
│           │                                              outline-offset: -2px on :focus-visible)
│           ├── .cs-data-table-body (role="rowgroup"; display: flex; flex-direction: column; inline-size: 100%;
│           │                        @attach virtual.attachList when virtualized)
│           │   └── .cs-data-table-row (role="row"; display: grid;
│           │                           grid-template-columns: var(--cs-data-table-grid-columns);
│           │                           outline-offset: -2px on :focus-visible;
│           │                           data-even={viewIndex % 2 === 1 ? "" : undefined})
│           │       └── .cs-data-table-cell (role="cell"; min-inline-size: 0;
│           │                                composed inset box-shadow dividers;
│           │                                [data-pinned="start"]: sticky inset-inline-start: 0 z-index: 5)
│           └── [when empty] .cs-data-table-empty (sticky inline-start: 0; max-inline-size: 100% of viewport)
├── [optional] .cs-data-table-status-bar (flex-shrink: 0; bottom-docked below scroll viewport; 0px when idle;
│                                         grid-template-rows: 0fr -> 1fr reveal)
├── [edge cues] .cs-data-table-edge-shadow[data-edge="start" | "end"] (only when no pinned column owns the edge)
└── [single shared] DataTableColumnPopover.internal.svelte (<Popover id={popoverId} popover="auto">)
```

**Why this geometry works without drift or glitches:**
1. **No `width: max-content` blow-up:** Using `inline-size: max(100%, var(--cs-data-table-min-width, 0px))` instead of `width: max-content` gives `.cs-data-table-canvas` a **definite inline size**. Long `nowrap` cell text truncates cleanly inside `minmax(120px, 1fr)` tracks instead of expanding the table width or causing horizontal jitter as virtual rows recycle!
2. **Simultaneous vertical + horizontal stickiness:** `.cs-scroll-area-content` is the single 2D scroll container (`overflow: auto`), and `.cs-data-table-canvas` has `overflow: visible` spanning the full scrollable height and width. Therefore:
   - `.cs-data-table-header` sticks vertically (`inset-block-start: 0; z-index: 10`) across the entire horizontal span (`100%` of canvas).
   - Pinned leading cells (`[data-pinned="start"]`) stick horizontally (`inset-inline-start: 0`) inside both the header (corner cell sits at `z-index: 15` within header's `z-index: 10` stacking context, automatically above all body rows) and body rows (`z-index: 5` above sibling cells).
   - `.cs-data-table-empty` uses `position: sticky; inset-inline-start: 0; inline-size: var(--cs-data-table-viewport-width, 100%)` so empty-state copy stays centered in the visible viewport even on a wide 20-column table!
3. **`VirtualScroll` `listOffset` & `scroll-padding-block-start`:**
   - `virtual.attachViewport` binds to `ScrollAreaContent` (`.cs-data-table-viewport`) and `virtual.attachList` binds to `.cs-data-table-body`.
   - `VirtualScrollController.#getListOffset()` automatically computes `bodyRect.top - viewportRect.top + viewport.scrollTop`, which equals the exact sticky header height (`30`/`34`/`38`/`42px`).
   - `.cs-data-table-viewport` sets `scroll-padding-block-start: calc(var(--cs-data-table-header-height) + 4px)`, so `virtual.scrollToIndex(i, { align: "start" })` and `Shift+Tab` focus scrolling keep rows and inset `-2px` focus rings completely clear of the sticky header (never tucked under it).
   - `ScrollAreaManager`'s `ResizeObserver` watches `.cs-data-table-canvas` (direct child of `.cs-scroll-area-content`), automatically keeping custom overlay thumbs synchronized whenever `VirtualScroll` updates `padding-block-start` / `padding-block-end` or filter counts change.
4. **Logical Zebra Parity (`[data-even]`):**
   - Set `data-even={viewIndex % 2 === 1 ? "" : undefined}` from the row's 0-based logical view index (NEVER CSS `:nth-child(even)`), so alternating stripe cadence never flickers as `VirtualScroll` adds/removes leading DOM rows.
5. **Virtualization Modes:**
   - **Default Fast-Path (`fixed: true`):** Active whenever `wrap` is `false` on both the table and all visible columns. Uses exact integer `estimateSize` (`28`/`36`/`44`/`52` from `size`), **O(1)** index math, zero Fenwick tree allocation, zero per-row `ResizeObserver`, and skips `attachItem` overhead.
   - **Measured Wrap Mode (`fixed: false`):** Automatically enabled when `table.wrap` or any visible `column.wrap` is `true` (or `virtualize.fixed === false`). Binds `virtual.attachItem(viewIndex)` to each `.cs-data-table-row` for pooled `ResizeObserver` height measurement + scroll anchoring. (Note: `attachItem` sets `contain: layout style` — NEVER `contain: paint` — so `position: sticky` on pinned cells remains functional; verified in Playwright E2E.)

#### B. Column Width Compilation (`--cs-data-table-grid-columns` & `--cs-data-table-min-width`)

`compileGridTracks(columns, options)` computes both CSS variables synchronously in O(C):
- **Leading selection column** (when `selectable`):
  - Track: `var(--cs-data-table-selection-width)`
  - Min-width contribution: exact size constant (`xs: 36`, `sm: 40`, `md: 44`, `lg: 52`).
- **Each visible data column:**
  - `typeof width === "number"`: Track = `${Math.max(minWidth ?? 0, width)}px`; min contribution = `Math.max(minWidth ?? 0, width)`.
  - `typeof width === "string"`: Track = `width`; min contribution = `minWidth ?? parsePxLiteral(width) ?? 120`.
  - `width === undefined`: `min = minWidth ?? 120`; Track = `maxWidth !== undefined ? minmax(${min}px, ${maxWidth}px) : minmax(${min}px, 1fr)`; min contribution = `min`.
- **Declarative Mode (No Controller):**
  - If consumer passes `gridColumns` prop, use it directly (plus optional `minWidth`).
  - Otherwise, `<DataTableHeaderCell>` instances register their `(width, minWidth, maxWidth, selection)` specs in DOM order into `DataTableContext`, automatically compiling `--cs-data-table-grid-columns` and `--cs-data-table-min-width` with zero manual CSS required.

#### C. Single Shared Column Header Popover Architecture

A 50-column table mounts **exactly ONE** `<Popover id={popoverId} popover="auto">` (`DataTableColumnPopover.internal.svelte`), never 50:
- **Dynamic CSS Anchor Handoff:**
  - Only the single active column's `<button class="cs-data-table-header-trigger">` receives `style:anchor-name={isActivePopoverCol ? `--anchor-${popoverId}` : undefined}`.
  - `Popover` binds `placement={activeColumn.resolvedAlign === "end" ? "bottom-end" : "bottom-start"}`, `width="content"`, `offset="6px"` (`inline-size: 256px`, `max-inline-size: min(288px, calc(100vw - 32px))`).
- **Streamlined 4-Zone Anatomy (Zero Box-in-Box, Calm Additive Selection):**
  1. **Zone 1 — 2-Up Horizontal Sort Toggle Pair (rendered ONLY if `sortable`):**
     - 2-column horizontal button grid (`30px` at `xs`/`sm`, `32px` at `md`/`lg`, concentric `10px`/`12px` radius) with `<button type="button" aria-pressed={isActive ? "true" : "false"}>` and concise type-aware copy (`A to Z` / `Z to A`, `Lowest` / `Highest`, `Oldest` / `Newest`, `Ascending` / `Descending`). Clicking the active direction clears the column's sort (`null`).
  2. **Zone 1b — Conditional Mode Switch (rendered ONLY when a column supports both `values` and `condition`):**
     - `<SegmentedControl size="xs" width="equal">` (`Values` | `Condition`). Omitted on single-mode columns.
  3. **Zone 2A — Values Mode (Flush Borderless Search + Additive Checklist):**
     - **Flush integrated borderless search `<input>`:** `34px` tall flush between `1px` `--cs-listbox-separator-bg` hairlines (zero boxed `<TextInput>` inside a padded panel), with `:focus-within::after` `2px` accent bottom hairline and inline clear button. **Auto-hidden when `totalDistinct <= 7`** so low-cardinality status/category columns show only the clean checklist.
     - **Additive unchecked-at-rest checklist:** `0` checked boxes at rest = unfiltered (serene monochrome; **no top `Select all · Clear` utility strip**). Checking one or more values sets `{ kind: "values", selected: [...] }` (inclusive OR); unchecking the last value clears the column filter back to `null`. On re-open while filtered, already-checked items pin gently to the top of the list (never jumping mid-click). Rendered inside `<ScrollArea size="sm" direction="vertical">` (`max-block-size: 204px`, `30px` full-row `<label>` + `<Checkbox variant="soft" size="sm" />` + quiet `tabular-nums` count).
  4. **Zone 2B — Condition Mode:**
     - `<Select variant="soft" size="xs" />` for operator + `<TextInput variant="soft" size="xs" />` for value(s): `between` renders a 2-column `Min` / `Max` grid; unary `isEmpty` / `isNotEmpty` renders zero value inputs. Live application (`0ms` for `< 2,000` rows, `120ms` debounce for `>= 2,000` rows).
  5. **Zone 3 — Conditional Quiet Bottom Footer (`34px`, hidden when idle):**
     - Renders ONLY when a search query or active column filter exists (`0px` when idle). Left: contextual `<Button variant="ghost" size="xs">` (`Select matches` while searching, `Clear` / `Reset` when filtered); Right: quiet `tabular-nums` match count (`N matches` / `N matching`).
- **Deterministic Open / Switch / Toggle Protocol:**
  - Primary mouse button (`pointerdown`, `button === 0`):
    - Clicking the **already-open** column header calls `popoverEl.hidePopover()` and sets a one-shot `suppressNextClick` guard (preventing native light-dismiss + subsequent `click` from bouncing the popover back open).
    - Clicking a **different** column header moves `anchor-name` synchronously to the new header button, updates `openPopoverColumnId`, updates `placement`, and invokes `hidePopover()` (if open) + `showPopover({ source: newTriggerEl })` (resets search input, checklist scroll position, and focus cleanly).
  - Touch & Keyboard (`click` / `Enter` / `Space` / `ArrowDown`): toggles cleanly when `suppressNextClick` is false.
- **Lazy Subtree Mounting:** Popover inner controls (sort buttons, flush search, `ScrollArea`, checklist, `Select`, `TextInput`) mount inside `{#if activeColumn}` ONLY while open (`0` idle DOM nodes across all 50 columns).
- **Focus Restoration:**
  - On open: focus moves to the flush search `<input>` (when checklist search is visible) or the first sort/condition/checklist control on the next frame.
  - On `Escape` or explicit keyboard close: `ontoggle` (`newState === "closed"`) restores focus to the triggering column header button (`triggerEl.focus({ preventScroll: true })`) UNLESS dismissal came from clicking another interactive element outside the popover.

#### D. Nested Popover Safety (`Select` Inside `DataTableColumnPopover`)

The Condition filter renders `<Select variant="soft" size="xs" />` (which internally uses `<Popover popover="auto">`) inside `.cs-data-table-column-popover` (also `<Popover popover="auto">`).
- **Contract Guarantee:**
  1. `<Select>` MUST remain a DOM descendant of `.cs-data-table-column-popover` (never portaled out). Under WHATWG HTML's Popover API ancestor algorithm, because both `<SelectTrigger>` (`source`) and `<SelectContent>` are DOM descendants of the open parent `popover="auto"`, opening `<SelectContent>` pushes it onto the top-layer stack **above** `.cs-data-table-column-popover` WITHOUT dismissing the parent.
  2. `.cs-data-table-column-popover` MUST NOT manually intercept `Escape` to call `hidePopover()`. Relying on native browser `popover="auto"` `Escape` handling guarantees the first `Escape` dismisses ONLY `<SelectContent>` (returning focus to `<SelectTrigger>`) while keeping the filter popover open, and a second `Escape` dismisses the filter popover (returning focus to the column header trigger).
  3. Clicking inside the filter popover while `<SelectContent>` is open light-dismisses only `<SelectContent>`; clicking outside both light-dismisses the entire stack cleanly.
  4. `SelectContent`'s existing `Tab` handler closes only `<Select>` and moves focus smoothly to the adjacent condition `<TextInput>`.
  5. Dedicated Playwright E2E test required to verify nested `Select` open, option pick, `Escape` single-layer close, and outside light-dismiss in Chromium.

#### E. 100k-Row Filtering, Sorting & Lazy Facet Pipeline

All data transformations execute in staged, memoized Svelte 5 `$derived` pipelines operating on **flat index arrays (`number[]`)** instead of cloning 100k wrapper objects:

1. **Stage 1 — Filter (`filteredIndices: number[]`):**
   - Recomputes ONLY when `data`, `columns`, or `filters` change (independent of `sorting`, `selection`, or popover state).
   - **Zero-filter fast-path:** When `activeFilterCount === 0`, skips per-row iteration entirely.
   - **Pre-compiled predicates:** Before scanning rows, each active column filter compiles to a tight closure:
     - `values` filter → `Set<string>` O(1) lookup per row.
     - `condition` filter → pre-lowercased query string or pre-parsed `number` / `timestamp` bounds once outside the loop.
   - Cross-column AND short-circuiting exits on the first failing column.
2. **Stage 2 — Sort (`sortedIndices: number[]`):**
   - Recomputes ONLY when `filteredIndices`, `columns`, or `sorting` change.
   - **Zero-sort fast-path:** Returns `filteredIndices` verbatim.
   - **Schwartzian Transform (Decorate-Sort-Undecorate):** Extracts sort keys for active sort column(s) ONCE per row (`O(N)` accessor calls instead of `O(N log N)`), sorts index positions, and unwraps.
   - **Null / Empty Always Last:** `null`, `undefined`, `""`, and `NaN` sort **after** all populated values in BOTH `"asc"` and `"desc"` directions (standard analytical table convention).
   - **Stable Tie-Breaking:** Ties break deterministically by original `sourceIndex` (`a - b`).
   - **Cached Collator:** Text columns share a single cached `Intl.Collator(locale, { numeric: true, sensitivity: "base" })` per locale.
3. **Stage 3 — Lazy Cross-Filtered Facets (`openPopoverFacets`):**
   - Computed **ONLY** for `openPopoverColumnId` while the popover is open (`0ms` cost for closed columns).
   - **Cross-Filtering Semantics:** Evaluates all active filters **EXCEPT** `openPopoverColumnId` itself so the user can see unchecked sibling values in the current column while facet counts stay accurate to filters applied on *other* columns.
   - Empty values group into a single canonical `""` key labeled `t({ de: "(Leer)", en: "(Blank)" })`, pinned at the bottom of the checklist.
4. **Adaptive Debounce & High-Cardinality Virtualization:**
   - Condition text/range inputs apply synchronously (`0ms`) when `totalRowCount < 2_000` and debounce by `120ms` when `totalRowCount >= 2_000`.
   - Checklist search filters facets synchronously below `2_000` distinct values (`120ms` debounce above).
   - Checklist renders in standard flow inside `<ScrollArea size="sm" direction="vertical">` (`max-block-size: 204px`, `30px` rows with `2px` gap) for `<= 200` items, and automatically switches to `createVirtualScroll({ count, estimateSize: 32, fixed: true, overscan: 6 })` in Padding Mode when filtered facets exceed **`200`** items (`FACET_VIRTUALIZE_THRESHOLD`).

#### F. Key Interaction & Performance Decisions

| Decision Area | Architectural Choice | Rationale |
| :--- | :--- | :--- |
| **1. Unified header click vs. split sort + filter triggers** | **Unified full-cell header trigger.** Non-interactive = static text; sort-only = 1-click direct sort cycle (`Shift+Click` for multi-sort); filterable (with or without sort) = 1-click opens the anchored Sort & Filter Popover. | Guarantees `> 1936px²` hit targets down to narrow `72px` `xs` dense columns, zero `<HitArea />` collision, zero header text crowding, and 1 keyboard Tab stop per column. |
| **2. Opaque `--cs-data-table-sticky-bg` for pinned columns** | **Dedicated opaque `--cs-data-table-sticky-bg` token** resolved per `[data-variant]` and `[data-striped] [data-even]`, composited as the bottommost solid plate beneath the 3-layer paint stack on `[data-pinned]` cells. | Guarantees 100% opaque occlusion of horizontally scrolling cells across `elevated`, `soft`, `transparent`, and `striped` modes while preserving identical composited tone/selection/hover color on pinned cells. |
| **3. Value checklist cardinality cap** | **Hybrid 3-tier threshold:** `<= 200` flow checklist (`<= 7` auto-hides flush search) → `> 200` auto-virtualized checklist via `createVirtualScroll` (`fixed: true`, `30px` rows) → `> 500` (`highCardinalityThreshold`) auto-opens `"condition"` tab by default (when `filterMode` is `"auto"` / `"both"` and no value filter is active), while keeping `"values"` accessible up to `maxChecklistValues = 10_000` with a quiet truncation note. | Keeps 100k-row UUID/timestamp columns effortless and jank-free without removing value-checklist capability when desired. |

---

## 3. DOM, Semantics & Accessibility

### Native Elements & ARIA Structure

Because `DataTable` uses CSS Grid rows for pixel-exact alignment and `VirtualScroll` Padding Mode, it emits complete WAI-ARIA table semantics:

- **Default `role="table"` (Recommended for Read-Only Data Tables):**
  Screen readers (NVDA, JAWS, VoiceOver) provide full native table navigation (`Ctrl+Alt+Arrows`) without trapping keyboard users in application/forms mode. Optional `role="grid"` prop is supported for consumers adding custom 2D cell navigation.
- **Role & Attribute Map:**
  - `.cs-data-table-canvas`: `role={role}`, `aria-rowcount={totalViewRows + 1}`, `aria-colcount={totalVisibleCols}`, `aria-label={label}`, `aria-labelledby={labelledBy}`.
  - `.cs-data-table-header`: `role="rowgroup"`.
  - `.cs-data-table-header-row`: `role="row"`, `aria-rowindex={1}`.
  - `.cs-data-table-header-cell`: `role="columnheader"`, `aria-colindex={colIndex + 1}`, `aria-sort={sortDir === "asc" ? "ascending" : sortDir === "desc" ? "descending" : sortable ? "none" : undefined}`.
  - `.cs-data-table-header-trigger`: native `<button type="button">` — when filterable: `aria-haspopup="dialog"`, `aria-expanded={isOpen ? "true" : "false"}`, `aria-controls={isOpen ? popoverId : undefined}`.
  - `.cs-data-table-body`: `role="rowgroup"`.
  - `.cs-data-table-row`: `role="row"`, `aria-rowindex={viewIndex + 2}` (wired via `virtual.getItemAriaProps(viewIndex, { role: "row", headerRowCount: 1 })` when virtualized), and `aria-selected={role === "grid" && selectable ? (isSelected ? "true" : "false") : undefined}` (omitted on `role="table"` per ARIA 1.2 validity; selection state is conveyed by the native `<Checkbox>`).
  - `.cs-data-table-cell`: `role={role === "grid" ? "gridcell" : "cell"}`, `aria-colindex={colIndex + 1}`.
  - Selection `<Checkbox>` inputs: wrapped in cell-filling `<label class="cs-data-table-selection-hit">` (Void Control Rule) with localized `aria-label` (`t({ de: "Alle Zeilen auswählen", en: "Select all rows" })` / `t({ de: "Zeile auswählen", en: "Select row" })`).
  - `.cs-data-table-column-popover`: `role="dialog"`, `aria-modal="false"`, `aria-label={t({ de: `Spaltenoptionen: ${col.label}`, en: `Column options: ${col.label}` })}`; 2-up horizontal sort toggle buttons emit `aria-pressed={isActive ? "true" : "false"}`.
  - `.cs-data-table-status-bar` count summary: `role="status"` + `aria-live="polite"` on the text span only (never wrapping interactive buttons).

### Complete `data-*` Attribute Contract

- **`.cs-data-table`:** `data-variant`, `data-size`, `data-striped`, `data-gridlines`, `data-nested`, `data-scrolled-y`, `data-scrolled-x-start`, `data-scrolled-x-end`, `data-scrolling`.
- **`.cs-data-table-status-bar`:** `data-mode="filter" | "selection"`.
- **`.cs-data-table-header-cell`:** `data-align`, `data-sort="asc" | "desc"`, `data-filtered`, `data-open`, `data-selection`, `data-pinned="start" | "end"`, `data-interactive`.
- **`.cs-data-table-row`:** `data-selected`, `data-even`, `data-interactive`, `data-tone`, `data-color-mode`.
- **`.cs-data-table-cell`:** `data-align`, `data-numeric`, `data-wrap`, `data-emphasis`, `data-tone`, `data-color-mode`, `data-selection`, `data-pinned="start" | "end"`.

### Keyboard & Focus Contract

- `Tab` / `Shift+Tab`: Flows naturally in DOM order: header selection checkbox → interactive column header buttons → body row selection checkboxes, links, and row action controls → bottom-docked status bar controls (when active).
- **Unclipped `:focus-visible` inside clip/scroll bounds:** `.cs-data-table-header-trigger:focus-visible` and focusable interactive `.cs-data-table-row:focus-visible` apply `outline-offset: -2px` (inheriting the global `2px solid var(--cs-color-accent-solid)` outline for full `forced-colors` compliance without clipping), and `.cs-data-table-viewport` sets `scroll-padding-block-start: calc(var(--cs-data-table-header-height) + 4px)` so `Shift+Tab` never scrolls a focused control or inset ring underneath the sticky header.
- `Enter` / `Space` on sort-only header button: Cycles sort (`none → asc → desc → none`); with `Shift` appends/cycles in `multiSort` mode.
- `Enter` / `Space` / `ArrowDown` on filterable header button: Opens shared column popover anchored to that header and focuses its primary interactive control.
- `Escape` inside column popover: Native `popover="auto"` dismisses topmost layer (`SelectContent` first if open; otherwise column popover, restoring focus to the triggering column header button).
- `Shift+Click` on row selection checkboxes: Toggles contiguous range between the anchor row and clicked row in current view order.
- Native keyboard scrolling (`PageUp`, `PageDown`, `Home`, `End`, Arrow keys) works natively when `.cs-data-table-viewport` is focused because scrolling is 100% browser-native.

### Localization (`src/shared/lang.internal.ts`)

All built-in labels and ARIA defaults MUST resolve through `t({ de, en })`, including:
- Type-aware 2-up sort labels (`A to Z` / `Z to A`, `Lowest` / `Highest`, `Oldest` / `Newest`, `Ascending` / `Descending`).
- Popover copy (`Search`, `Values`, `Condition`, `Select matches`, `Clear`, `Reset`, `matches`, `matching`, `Value`, `Min`, `Max`, `(Blank)`, condition operators, truncation notice).
- Status bar & empty copy (`{visible} of {total} rows`, `+N more`, `Reset filters`, `{count} selected`, `Select all {count}`, `Clear`, `No rows yet`, `No matching rows`, `Adjust or clear active filters to see results.`).

---

## 4. Visual & Motion Contract

### Surface Variants, Surface-Matched Header, Specular Rim & Opaque Sticky Backing

- **Variants (`variant` required — all use 100% opaque surface-matched sticky headers at rest, zero grey header slab):**
  - `elevated`: `--cs-color-elevated` shell, surface-matched `--cs-color-elevated` opaque sticky header, squircle radius. Light mode applies `--cs-shadow-elevated` on the shell; dark mode preserves `--cs-shadow-elevated`'s top specular rim via a `.cs-data-table[data-variant="elevated"]::after` overlay (`position: absolute; inset: 0; border-radius: inherit; corner-shape: inherit; pointer-events: none; z-index: 40;`) so the opaque sticky header never obscures the top highlight.
  - `soft`: `--cs-color-base-soft` shell, `shadow: none`, squircle radius, surface-matched 100% opaque sticky header (`color-mix` resolved over `--cs-data-table-backdrop-bg` for nesting inside `elevated` `Card`s without double shadows).
  - `transparent`: `transparent` shell, `shadow: none`, `0px` radius, surface-matched 100% opaque header backed by `var(--cs-data-table-backdrop-bg, var(--cs-color-canvas))`.
- **Concentric Nesting (`createSurfaceRadius`):**
  - Calls `createSurfaceRadius(() => (size === "xs" ? "sm" : size))`.
  - When nested inside `Card` or `KpiCard`, sets `data-nested`, adopts `--cs-data-table-nested-radius` (`8px`–`12px`), and steps squircle down to `--cs-squircle-smooth`.
- **Header Inset Squircle Pill (`::before`) & Composed Cell Inset Dividers:**
  - `.cs-data-table-header` keeps a completely **unbroken `1px` inset bottom hairline** (`--cs-data-table-header-divider`) across all columns (never chopped into `2px` bottom tab underlines).
  - `.cs-data-table-header-trigger` paints a concentric inset squircle pill via `::before`: `transparent` at rest and when sorted-only at rest, `--cs-color-base-soft` on hover/open (`--cs-color-base-soft-hover` on `:active`), and whisper accent tint (`8%` light / `15%` dark; hover `12%` / `21%`) when `[data-filtered]`.
  - Horizontal row dividers live inside `.cs-data-table-cell`'s composed `box-shadow` alongside the `2px` selected leading bar (`--cs-data-table-cell-edge-shadow`) and opt-in `1px` vertical gridline (`--cs-data-table-cell-gridline-shadow`) so opaque pinned cells never interrupt the row hairline.
- **Opaque `--cs-data-table-sticky-bg` Resolution:**
  - Every `[data-variant]` defines a 100% opaque `--cs-data-table-sticky-bg` (and a pre-blended opaque stripe override for `[data-striped] .cs-data-table-row[data-even]`), eliminating ghosting beneath pinned selection/start columns.
  - Non-pinned cells use the 3-layer paint stack (`background-color` = resolved cell/row/col/stripe fill; `background-image` = hover sheen over selected wash).
  - Pinned cells (`[data-pinned]`) place `background-color: var(--cs-data-table-sticky-bg)` as the solid base and stack `hover sheen` → `selected wash` → `resolved cell/row/col translucent fill` in `background-image` so pinned cells match row aesthetics identically with zero bleed-through.
- **Custom Colors (`colorMode`: `"tint"` | `"exact"`):**
  - `"tint"` (default): OKLab `color-mix` (`14%` light / `24%` dark) keeping `--cs-color-text-strong` crisp in both themes.
  - `"exact"`: Verbatim `--cs-data-table-*-bg`; when no explicit `--cs-data-table-*-fg` is supplied, defaults to `contrast-color(var(--cs-data-table-cell-bg))` with a clean fallback (`--cs-color-text-strong`) so light custom fills remain legible in dark mode.
- **Checkbox Soft-on-Soft Guard:**
  - Uses `<Checkbox variant="soft" />` inside `elevated` and `transparent` tables; automatically switches to `<Checkbox variant="elevated" />` inside `variant="soft"` tables.

### Proportional Size Scale (`size` required)

| Size | Row Height | Header Height | Cell `px` / Edge `px` *(elevated/soft)* | Selection Width | Status Bar | Radius *(Standalone)* | Paired `ScrollArea` / `Checkbox` |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `xs` *(Dense Grid)* | `28px` | `30px` | `8px` / `12px` | `36px` | `32px` | `12px` | `sm` / `xs` |
| `sm` *(Compact)* | `36px` | `34px` | `10px` / `16px` | `40px` | `34px` | `16px` | `sm` / `sm` |
| `md` *(Balanced)* | `44px` | `38px` | `12px` / `20px` | `44px` | `38px` | `24px` | `md` / `sm` |
| `lg` *(Spacious / Rich)* | `52px` | `42px` | `16px` / `24px` | `52px` | `42px` | `28px` | `md` / `md` |

> *`transparent` variant edge padding:* Tightens `--cs-data-table-edge-px` to `--cs-data-table-cell-px` (`8 / 10 / 12 / 16px`) for crisp optical alignment with surrounding headings.

### Motion & Layering Contract

- **Deterministic `z-index` Stack (inside `isolation: isolate`):** Body cells (`0`) → Pinned body cells (`5`) → Sticky header (`10`, corner cell `z-index: 15` within header stacking context) → `ScrollArea` tracks (`30`) → `elevated` dark-mode specular shell rim `::after` (`40`, `pointer-events: none`) → Shared Column `Popover` (browser top layer).
- **Motion Tokens (`src/css/foundation/motion.css`):**
  - Row hover sheen: `--cs-dur-60` `--cs-ease-effect` (**`0ms` while `[data-scrolling]`** to prevent hover trails across 100k recycled rows).
  - Header inset pill & cue fade: `--cs-dur-effect-fast` `--cs-ease-effect`.
  - Header chevron open/close (`0deg ↔ 180deg`): Open `--cs-dur-200` `--cs-ease-quart-out` / Close `--cs-dur-exit-md` `--cs-ease-exit`.
  - Sort arrow flip (`0deg ↔ 180deg`): `--cs-dur-effect` `--cs-ease-quart-out`.
  - Sticky header scrolled shadow: `--cs-dur-effect` `--cs-ease-effect`.
  - Column popover: `Popover` `[data-animate]` tuned tight (`distance: 6px`, `scale-start: 0.94`, in `--cs-dur-enter-sm`, out `--cs-dur-exit-sm`), with snapped integer `line-height` values (`16px` / `18px` / `20px`) per `design-and-tokens.md`.
  - 2-up sort button press: `scale: 0.97`, `--cs-dur-press` `--cs-ease-press`.
  - Bottom-docked status bar reveal: `grid-template-rows: 0fr → 1fr` + `opacity`, `--cs-dur-200` `--cs-ease-quart-out`.
  - Virtualized row DOM updates: **`transition: none`** (`0ms`) for instantaneous sort/filter/scroll response.
  - Global `prefers-reduced-motion: reduce` is inherited from `motion.css` (never duplicated inside the module).

---

## 5. Edge Cases, Constraints & Implementation Plan

### Edge Cases & Constraints

1. **Bounded Height Requirement for Virtualization:**
   - When `virtualize` is enabled, `<DataTable>` MUST have a bounded block-size (`height`, `max-height`, or `flex: 1; min-height: 0`). Because `virtualize` defaults to `false`, unbounded small tables never collapse to `0px`. Virtualized tables default `initialRenderCount: 20` and `initialViewportSize: 600` for SSR hydration.
2. **Dynamic `data` / `columns` Updates:**
   - When `data` updates (e.g., live refresh), active `sorting` and `filters` re-apply automatically; `selectedRowIds` retains IDs present in the new dataset (or consumers can call `clearSelection()`). When a column is removed from `columns`, stale sort/filter entries for that `columnId` are safely ignored.
3. **Interactive Elements Inside Clickable Rows (`onRowClick`):**
   - `DataTableRow` click handler ignores events whose target matches or descends from `a, button, input, select, textarea, label, [role="button"], [role="checkbox"], [data-row-click-ignore]` so clicking a selection checkbox, link, or row-action `Dropdown` never triggers `onRowClick`.
4. **Sticky Pinned Cells + `contain: layout style`:**
   - In `fixed: false` (wrapped virtualized) mode, `VirtualScroll.attachItem` applies `contain: layout style` (never `contain: paint`). Verify pinned column stickiness and `::after` edge-shadow rendering in Playwright E2E tests.
5. **RTL Horizontal Scroll & Edge Cues:**
   - All padding, alignment (`start` / `end`), sticky insets (`inset-inline-start` / `inset-inline-end`), and scroll-edge detection (`Math.abs(scrollLeft)`) use CSS logical properties and RTL-safe math.
6. **Subpixel & Zero-Height Safety:**
   - All row/header heights and popover line-heights are exact whole integers. Zero-height hidden tabs preserve `VirtualScroll` state and re-hydrate cleanly via `ResizeObserver` when shown.
7. **Browser Support:**
   - Modern Chromium-first (`popover="auto"`, CSS Anchor Positioning, `position-visibility: anchors-visible`, `corner-shape`, `light-dark()`, `oklab`/`oklch`, `contrast-color()` with graceful fallback).

### Explicit Non-Goals (V1) & V2 Extensibility Hooks

- **Explicit Non-Goals (V1):**
  - Inline cell editing, formula engine, ribbon/toolbar chrome, or undo/redo stack.
  - Right-click `ContextMenu` or 2D drag range selection.
  - Built-in server pagination / async data fetching (consumers pass external rows and declarative sort/filter handlers or update `data`).
  - Interactive column drag-to-resize, column drag-to-reorder, or column visibility picker UI.
  - Sticky summary/footer totals rows or row expansion/tree-grid sub-rows.
- **V2 Extensibility Hooks Designed In:**
  - `DataTableColumn.visible?: boolean` (already respected by controller & track compiler → V2 Column Visibility UI plugs in with zero breaking changes).
  - `DataTableColumn.pinned?: "start" | "end"` (CSS `[data-pinned]` + opaque `--cs-data-table-sticky-bg` + `z-index` already designed → V2 multi-column sticky offset accumulator plugs in cleanly).
  - `compileGridTracks()` reads reactive column widths → V2 interactive column resizing simply updates a reactive `columnWidths` map in `DataTableController`.

### V1 Implementation Milestones

1. **Milestone 1 — Pure Data Engine & Unit Tests (`data-table-engine.internal.ts`, `data-table.test.ts`):**
   - Grid track compiler (`compileGridTracks`), filter predicate compiler (`values` + all 13 `condition` operators), Schwartzian multi-column sorter (type-aware comparators, null-last, stable tie-break), lazy cross-filtered facet aggregator, and 100k-row Vitest performance & correctness benchmarks.
2. **Milestone 2 — Headless Reactive Controller (`data-table.svelte.ts`, `data-table.context.ts`, `data-table-scroll.internal.ts`):**
   - `createDataTable` / `DataTableController` integrating `$derived` staged pipeline, tri-state & `Shift+Click` range selection, lazy `openPopoverFacets`, and `createVirtualScroll` Padding Mode integration (`fixed: true` fast-path + `fixed: false` wrap mode).
3. **Milestone 3 — Base Compound Primitives & Styling (`data-table.css`, `DataTable`, `DataTableHead`, `DataTableHeaderCell`, `DataTableBody`, `DataTableRow`, `DataTableCell`, `DataTableEmpty`):**
   - All 3 variants (`elevated`, `soft`, `transparent`) with surface-matched sticky headers and dark-mode `elevated::after` specular rim, 4 sizes (`xs`–`lg` with `28/36/44/52px` rows & `30/34/38/42px` headers), `createSurfaceRadius` concentric nesting, `ScrollArea` 2D scrolling, unbroken `1px` header hairline + inset squircle header pills, composed cell inset dividers, `outline-offset: -2px` inset focus rings, pinned selection column, opaque `--cs-data-table-sticky-bg`, 3-layer paint stack, semantic tones, and `tint`/`exact` custom colors.
4. **Milestone 4 — Column Header Sort/Filter Popover & Bottom-Docked Status Bar (`DataTableColumnPopover.internal.svelte`, `DataTableStatusBar.svelte`):**
   - Single shared `Popover` with dynamic `anchor-name` handoff, 2-up horizontal sort toggle buttons (`aria-pressed`), conditional `SegmentedControl`, flush borderless search (auto-hidden when `<= 7` values), additive unchecked-at-rest checklist (auto-virtualized above `200` facets), `Select`-powered condition builder (nested `popover="auto"` safe), conditional bottom footer, `highCardinalityThreshold` auto-switch, and bottom-docked idle-hidden `DataTableStatusBar` (`grid-template-rows: 0fr → 1fr` reveal).
5. **Milestone 5 — Barrel, Preview, Docs & Full Verification (`index.ts`, `DataTable.preview.svelte`, `data-table.docs.md`, `data-table.svelte.test.ts`, Playwright E2E):**
   - All 5 preview sections from `data-table.design.md` §9 (including 100,000-row × 16-column stress demo), Vitest component tests, Playwright E2E (nested `Select` inside filter popover, sticky header + pinned selection column under 2D scroll, 100k-row virtualization, bottom status bar zero-jump reveal, keyboard focus restoration, light/dark visual verification), `bun run typecheck`, and `bun run lint`.
