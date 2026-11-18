import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DataTableTestHost from "./DataTableTestHost.internal.svelte";
import {
    createDataTable,
    type DataTableCellRenderContext,
    type DataTableColumn,
    type DataTableController,
    type DataTableVariant,
} from "./index.ts";

interface PersonRow extends Record<string, unknown> {
    id: string;
    name: string;
    department: string;
    salary: number;
    hiredAt: string;
    active: boolean;
    locked?: boolean;
}

const SAMPLE_DATA: PersonRow[] = [
    { id: "r1", name: "Alice", department: "Engineering", salary: 120_000, hiredAt: "2024-01-10", active: true },
    { id: "r2", name: "Bob", department: "Design", salary: 95_000, hiredAt: "2023-05-20", active: false, locked: true },
    { id: "r3", name: "Charlie", department: "Engineering", salary: 150_000, hiredAt: "2025-02-01", active: true },
    { id: "r4", name: "Diana", department: "Sales", salary: 110_000, hiredAt: "2024-07-15", active: true },
    { id: "r5", name: "Eve", department: "Design", salary: 130_000, hiredAt: "2022-11-30", active: false },
];

const SAMPLE_COLUMNS: DataTableColumn<PersonRow>[] = [
    { id: "name", label: "Name", type: "text", sortable: true, filterable: true },
    { id: "department", label: "Department", type: "text", sortable: true, filterable: true },
    { id: "salary", label: "Salary", type: "currency", sortable: true, filterable: true },
    { id: "hiredAt", label: "Hired", type: "date", sortable: true, filterable: true },
    { id: "active", label: "Active", type: "boolean", sortable: true, filterable: true },
];

function sortedIds(ids: Iterable<string | number>): string[] {
    return [...ids].map(String).toSorted((a, b) => a.localeCompare(b));
}

function dispatchToggleEvent(element: HTMLElement, newState: "open" | "closed", oldState: "open" | "closed"): void {
    const event = new Event("toggle");
    Object.assign(event, { newState, oldState });
    element.dispatchEvent(event);
}

function restorePrototypeProperty(target: object, key: string, descriptor: PropertyDescriptor | undefined): void {
    if (descriptor) {
        Object.defineProperty(target, key, descriptor);
    } else {
        Reflect.deleteProperty(target, key);
    }
}

/* eslint-disable unicorn/no-this-outside-of-class -- HTMLElement.prototype polyfill methods require dynamic `this` binding */
function installPopoverPolyfill(
    openPopovers: WeakSet<HTMLElement>,
    baseMatches: typeof HTMLElement.prototype.matches
): void {
    Object.defineProperties(HTMLElement.prototype, {
        matches: {
            configurable: true,
            writable: true,
            value(this: HTMLElement, selector: string): boolean {
                if (selector === ":popover-open") {
                    return openPopovers.has(this);
                }
                return baseMatches.call(this, selector);
            },
        },
        showPopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement): void {
                if (openPopovers.has(this)) return;
                openPopovers.add(this);
                dispatchToggleEvent(this, "open", "closed");
            },
        },
        hidePopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement): void {
                if (!openPopovers.has(this)) return;
                openPopovers.delete(this);
                dispatchToggleEvent(this, "closed", "open");
            },
        },
        togglePopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement, options?: boolean | { source?: HTMLElement; force?: boolean }): boolean {
                const force = typeof options === "boolean" ? options : options?.force;
                const next = typeof force === "boolean" ? force : !openPopovers.has(this);
                if (next) {
                    (this as HTMLElement & { showPopover: () => void }).showPopover();
                } else {
                    (this as HTMLElement & { hidePopover: () => void }).hidePopover();
                }
                return next;
            },
        },
    });
}
/* eslint-enable unicorn/no-this-outside-of-class */

describe("createDataTable headless reactivity & state", () => {
    it("re-applies sorting and filtering on reactive data updates and drops stale selection IDs", () => {
        let data = $state<PersonRow[]>([...SAMPLE_DATA]);
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: () => data,
                columns: SAMPLE_COLUMNS,
                getRowId: (row) => row.id,
                selectable: true,
                initialSorting: [{ columnId: "salary", direction: "desc" }],
                initialFilters: {
                    department: { kind: "values", selected: ["Engineering"] },
                },
                initialSelection: ["r1", "r3", "r5"],
            });
        });

        expect(table.totalRowCount).toBe(5);
        expect(table.rowCount).toBe(2);
        expect(table.rows.map((r) => r.rowId)).toEqual(["r3", "r1"]);
        expect(table.rows.map((r) => r.isEven)).toEqual([false, true]);
        expect(table.selectedCount).toBe(3);

        // Replace dataset: remove r3 & r5, add r6 in Engineering with higher salary
        const alice = SAMPLE_DATA[0];
        const diana = SAMPLE_DATA[3];
        if (!alice || !diana) throw new Error("Missing sample rows");
        data = [
            alice,
            { id: "r6", name: "Frank", department: "Engineering", salary: 200_000, hiredAt: "2025-03-01", active: true },
            diana,
        ];
        flushSync();

        expect(table.totalRowCount).toBe(3);
        expect(table.rowCount).toBe(2);
        expect(table.rows.map((r) => r.rowId)).toEqual(["r6", "r1"]);
        // Stale IDs r3 & r5 are pruned from effective selectedRowIds, r1 survives
        expect([...table.selectedRowIds]).toEqual(["r1"]);
        expect(table.selectedCount).toBe(1);

        cleanup();
    });

    it("handles dynamic column removal and visible: false without crashing", () => {
        let columns = $state<DataTableColumn<PersonRow>[]>([...SAMPLE_COLUMNS]);
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: SAMPLE_DATA,
                columns: () => columns,
                getRowId: (row) => row.id,
                initialSorting: [{ columnId: "department", direction: "asc" }],
                initialFilters: {
                    department: { kind: "values", selected: ["Engineering"] },
                },
            });
        });

        expect(table.activeFilterCount).toBe(1);
        expect(table.rowCount).toBe(2);

        // Hide the filtered/sorted column via visible: false
        columns = SAMPLE_COLUMNS.map((col) => (col.id === "department" ? { ...col, visible: false } : col));
        flushSync();

        expect(table.columns.some((col) => col.id === "department")).toBe(false);
        expect(table.activeFilterCount).toBe(0);
        expect(table.rowCount).toBe(5);

        // Remove the column completely
        columns = SAMPLE_COLUMNS.filter((col) => col.id !== "department");
        flushSync();

        expect(table.columns.some((col) => col.id === "department")).toBe(false);
        expect(table.rowCount).toBe(5);

        cleanup();
    });

    it("cycles toggleSort (none -> asc -> desc -> none), supports multiSort stacking, and keeps clearSorting idempotent", () => {
        const onSortingChange = vi.fn();
        let multiSort = $state(false);
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: SAMPLE_DATA,
                columns: SAMPLE_COLUMNS,
                getRowId: (row) => row.id,
                multiSort: () => multiSort,
                onSortingChange,
            });
        });

        expect(table.sorting).toEqual([]);
        table.clearSorting();
        expect(onSortingChange).not.toHaveBeenCalled();

        // Cycle: none -> asc -> desc -> none
        table.toggleSort("salary");
        expect(table.getColumnSort("salary")).toEqual({ direction: "asc", priority: 1 });
        expect(table.rows.map((r) => r.rowId)).toEqual(["r2", "r4", "r1", "r5", "r3"]);

        table.toggleSort("salary");
        expect(table.getColumnSort("salary")).toEqual({ direction: "desc", priority: 1 });
        expect(table.rows.map((r) => r.rowId)).toEqual(["r3", "r5", "r1", "r4", "r2"]);

        table.toggleSort("salary");
        expect(table.getColumnSort("salary")).toBeNull();
        expect(table.sorting).toEqual([]);
        expect(onSortingChange).toHaveBeenCalledTimes(3);

        // When multiSort is false, { multi: true } still replaces the single active sort
        table.toggleSort("department");
        table.toggleSort("salary", { multi: true });
        expect(table.sorting).toEqual([{ columnId: "salary", direction: "asc" }]);

        // Enable multiSort: stack department (priority 1) + salary (priority 2)
        multiSort = true;
        flushSync();

        table.setSorting([]);
        table.toggleSort("department", { multi: true });
        table.toggleSort("salary", { multi: true });
        expect(table.sorting).toEqual([
            { columnId: "department", direction: "asc" },
            { columnId: "salary", direction: "asc" },
        ]);
        expect(table.getColumnSort("department")).toEqual({ direction: "asc", priority: 1 });
        expect(table.getColumnSort("salary")).toEqual({ direction: "asc", priority: 2 });

        // Cycle priority-1 column to desc, then remove it -> salary promotes to priority 1
        table.toggleSort("department", { multi: true });
        expect(table.getColumnSort("department")).toEqual({ direction: "desc", priority: 1 });
        table.toggleSort("department", { multi: true });
        expect(table.getColumnSort("department")).toBeNull();
        expect(table.getColumnSort("salary")).toEqual({ direction: "asc", priority: 1 });

        cleanup();
    });

    it("normalizes empty additive values filter to null, keeps filter clears idempotent, and computes facets lazily", () => {
        const onFiltersChange = vi.fn();
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: SAMPLE_DATA,
                columns: SAMPLE_COLUMNS,
                getRowId: (row) => row.id,
                initialFilters: {
                    department: { kind: "values", selected: [] }, // sanitized out at init
                },
                onFiltersChange,
            });
        });

        expect(table.isFiltered).toBe(false);
        expect(table.filters).toEqual({});

        // Idempotent clear when unfiltered
        table.clearColumnFilter("department");
        table.clearAllFilters();
        expect(onFiltersChange).not.toHaveBeenCalled();

        // Set active values filter
        table.setColumnFilter("department", { kind: "values", selected: ["Design"] });
        expect(table.isFiltered).toBe(true);
        expect(table.rowCount).toBe(2);
        expect(onFiltersChange).toHaveBeenCalledTimes(1);

        // Passing empty selected array normalizes to removing the filter
        table.setColumnFilter("department", { kind: "values", selected: [] });
        expect(table.isFiltered).toBe(false);
        expect(table.filters).toEqual({});
        expect(table.rowCount).toBe(5);
        expect(onFiltersChange).toHaveBeenCalledTimes(2);

        // Passing empty again is a no-op
        table.setColumnFilter("department", { kind: "values", selected: [] });
        expect(onFiltersChange).toHaveBeenCalledTimes(2);

        // Lazy facets: empty while closed, cross-filtered when open
        expect(table.openPopoverFacets.items).toEqual([]);
        table.setColumnFilter("active", { kind: "values", selected: ["Yes"] });
        table.openColumnPopover("department");
        expect(table.openPopoverColumnId).toBe("department");
        // Only active=true rows: Alice (Eng), Charlie (Eng), Diana (Sales)
        expect(table.openPopoverFacets.items.map((item) => [item.key, item.count])).toEqual([
            ["Engineering", 2],
            ["Sales", 1],
        ]);
        table.closeColumnPopover();
        expect(table.openPopoverFacets.items).toEqual([]);

        cleanup();
    });

    it("handles row selection, isRowSelectable guard, tri-state, Shift+Click range in view order, selectAllMatching, and clearSelection", () => {
        const onSelectionChange = vi.fn();
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: SAMPLE_DATA,
                columns: SAMPLE_COLUMNS,
                getRowId: (row) => row.id,
                selectable: true,
                isRowSelectable: (row) => !row.locked,
                onSelectionChange,
            });
        });

        // Initial idle state
        expect(table.selectedCount).toBe(0);
        expect(table.allVisibleSelected).toBe(false);
        expect(table.someVisibleSelected).toBe(false);

        // Idempotent clearSelection when empty
        table.clearSelection();
        expect(onSelectionChange).not.toHaveBeenCalled();

        // Guard: r2 (Bob) is locked -> toggling with viewIndex is rejected
        table.toggleRowSelection("r2", { viewIndex: 1 });
        expect(table.isRowSelected("r2")).toBe(false);
        expect(table.selectedCount).toBe(0);
        expect(onSelectionChange).not.toHaveBeenCalled();

        // Sort descending by salary -> view order is [r3 (150k), r5 (130k), r1 (120k), r4 (110k), r2 (95k, locked)]
        table.setColumnSort("salary", "desc");
        expect(table.rows.map((r) => r.rowId)).toEqual(["r3", "r5", "r1", "r4", "r2"]);

        // Select anchor at viewIndex 0 (r3) -> tri-state is indeterminate (someVisibleSelected)
        table.toggleRowSelection("r3", { viewIndex: 0 });
        expect(table.selectedCount).toBe(1);
        expect(table.allVisibleSelected).toBe(false);
        expect(table.someVisibleSelected).toBe(true);

        // Shift+Click at viewIndex 2 (r1) -> selects contiguous range [0..2] = r3, r5, r1 in sorted view order
        table.toggleRowSelection("r1", { shiftKey: true, viewIndex: 2 });
        expect(sortedIds(table.selectedRowIds)).toEqual(["r1", "r3", "r5"]);
        expect(table.allVisibleSelected).toBe(false);
        expect(table.someVisibleSelected).toBe(true);

        // Shift+Click through locked row (viewIndex 4 = r2): selects r4 (viewIndex 3) and skips locked r2
        table.toggleRowSelection("r2", { shiftKey: true, viewIndex: 4 });
        expect(sortedIds(table.selectedRowIds)).toEqual(["r1", "r3", "r4", "r5"]);
        expect(table.isRowSelected("r2")).toBe(false);
        // All 4 selectable rows are now selected -> allVisibleSelected is true even though locked r2 is unselected
        expect(table.allVisibleSelected).toBe(true);
        expect(table.someVisibleSelected).toBe(false);

        // Clear all selection
        table.clearSelection();
        expect(table.selectedCount).toBe(0);

        // Filter to Engineering (r3, r1) and call selectAllMatching
        table.setColumnFilter("department", { kind: "values", selected: ["Engineering"] });
        table.selectAllMatching();
        expect(sortedIds(table.selectedRowIds)).toEqual(["r1", "r3"]);
        expect(table.allVisibleSelected).toBe(true);
        expect(table.someVisibleSelected).toBe(false);

        // Clear filter -> now 2 of 4 selectable rows are selected -> indeterminate
        table.clearAllFilters();
        expect(table.allVisibleSelected).toBe(false);
        expect(table.someVisibleSelected).toBe(true);

        // Filter to Design (r5 selectable, r2 locked), select r5, then deselectAllVisible -> keeps r1 & r3
        table.setColumnFilter("department", { kind: "values", selected: ["Design"] });
        table.selectAllVisible();
        expect(sortedIds(table.selectedRowIds)).toEqual(["r1", "r3", "r5"]);
        expect(table.allVisibleSelected).toBe(true);

        table.deselectAllVisible();
        expect(sortedIds(table.selectedRowIds)).toEqual(["r1", "r3"]);
        expect(table.allVisibleSelected).toBe(false);
        expect(table.someVisibleSelected).toBe(false);

        cleanup();
    });

    it("enforces isRowSelectable guard on programmatic toggleRowSelection(rowId) without viewIndex", () => {
        const onSelectionChange = vi.fn();
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: SAMPLE_DATA,
                columns: SAMPLE_COLUMNS,
                getRowId: (row) => row.id,
                selectable: true,
                isRowSelectable: (row) => !row.locked,
                onSelectionChange,
            });
        });

        table.toggleRowSelection("r2");
        expect(table.isRowSelected("r2")).toBe(false);
        expect(table.selectedCount).toBe(0);
        expect(onSelectionChange).not.toHaveBeenCalled();

        cleanup();
    });
});

describe("DataTable compound components (Svelte 5 + happy-dom)", () => {
    let container: HTMLDivElement;
    let openPopovers: WeakSet<HTMLElement>;
    let origMatches: PropertyDescriptor | undefined;
    let origShowPopover: PropertyDescriptor | undefined;
    let origHidePopover: PropertyDescriptor | undefined;
    let origTogglePopover: PropertyDescriptor | undefined;
    let origClientHeight: PropertyDescriptor | undefined;
    let origClientWidth: PropertyDescriptor | undefined;
    let mockViewportHeight = 300;
    let mockViewportWidth = 600;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);

        openPopovers = new WeakSet<HTMLElement>();
        origMatches = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "matches");
        origShowPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover");
        origHidePopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidePopover");
        origTogglePopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "togglePopover");
        origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
        origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");

        installPopoverPolyfill(openPopovers, HTMLElement.prototype.matches);

        mockViewportHeight = 300;
        mockViewportWidth = 600;

        /* eslint-disable unicorn/no-this-outside-of-class -- HTMLElement.prototype getters require dynamic this */
        Object.defineProperties(HTMLElement.prototype, {
            clientHeight: {
                configurable: true,
                get() {
                    const el = this as HTMLElement;
                    if (el.classList?.contains("cs-data-table-viewport")) {
                        return mockViewportHeight;
                    }
                    return 0;
                },
            },
            clientWidth: {
                configurable: true,
                get() {
                    const el = this as HTMLElement;
                    if (el.classList?.contains("cs-data-table-viewport")) {
                        return mockViewportWidth;
                    }
                    return 0;
                },
            },
        });
        /* eslint-enable unicorn/no-this-outside-of-class */
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
        restorePrototypeProperty(HTMLElement.prototype, "matches", origMatches);
        restorePrototypeProperty(HTMLElement.prototype, "showPopover", origShowPopover);
        restorePrototypeProperty(HTMLElement.prototype, "hidePopover", origHidePopover);
        restorePrototypeProperty(HTMLElement.prototype, "togglePopover", origTogglePopover);
        restorePrototypeProperty(HTMLElement.prototype, "clientHeight", origClientHeight);
        restorePrototypeProperty(HTMLElement.prototype, "clientWidth", origClientWidth);
    });

    it("renders declarative mode without controller, auto-compiles grid tracks, and supports role='table' vs role='grid'", () => {
        const onTrigger = vi.fn();
        let role = $state<"table" | "grid">("table");
        let gridColumns = $state<string | undefined>(undefined);

        const instance = mount(DataTableTestHost, {
            target: container,
            props: {
                mode: "declarative",
                variant: "elevated",
                size: "sm",
                striped: true,
                gridlines: true,
                label: "Team roster",
                get role() {
                    return role;
                },
                get gridColumns() {
                    return gridColumns;
                },
                declarativeHeaders: [
                    { columnId: "sel", label: "", selection: true },
                    { columnId: "name", label: "Name", width: 180, sortable: true, onTrigger },
                    { columnId: "role", label: "Role", minWidth: 140, maxWidth: 260 },
                ],
                declarativeRows: [
                    ["", "Alice", "Lead"],
                    ["", "Bob", "Designer"],
                ],
            },
        });
        flushSync();

        const root = container.querySelector<HTMLDivElement>(".cs-data-table");
        const canvas = container.querySelector<HTMLDivElement>(".cs-data-table-canvas");
        expect(root?.dataset.variant).toBe("elevated");
        expect(root?.dataset.size).toBe("sm");
        expect(root?.dataset.striped).toBe("");
        expect(root?.dataset.gridlines).toBe("");
        expect(root?.style.getPropertyValue("--cs-data-table-grid-columns")).toBe(
            "var(--cs-data-table-selection-width) 180px minmax(140px, 260px)"
        );
        expect(root?.style.getPropertyValue("--cs-data-table-min-width")).toBe(`${40 + 180 + 140}px`);

        expect(canvas?.getAttribute("role")).toBe("table");
        expect(canvas?.getAttribute("aria-colcount")).toBe("3");
        expect(canvas?.getAttribute("aria-label")).toBe("Team roster");
        expect(container.querySelectorAll('[role="cell"]')).toHaveLength(6);
        expect(container.querySelector(".cs-data-table-column-popover")).toBeNull();

        // Declarative header trigger click
        const nameTrigger = container.querySelector<HTMLButtonElement>(".cs-data-table-header-trigger");
        nameTrigger?.click();
        flushSync();
        expect(onTrigger).toHaveBeenCalledTimes(1);

        // Switch role to grid -> cells become gridcell; explicit gridColumns overrides auto-compilation
        role = "grid";
        gridColumns = "40px 1fr 1fr";
        flushSync();
        expect(canvas?.getAttribute("role")).toBe("grid");
        expect(container.querySelectorAll('[role="gridcell"]')).toHaveLength(6);
        expect(root?.style.getPropertyValue("--cs-data-table-grid-columns")).toBe("40px 1fr 1fr");

        unmount(instance);
    });

    it("renders controller-driven snippets, styling tiers (cell > row > col), parity, and onRowClick interactive-descendant guards", () => {
        const onRowClick = vi.fn();
        const colCellSnippet = createRawSnippet<[DataTableCellRenderContext<PersonRow>]>((getCtx) => ({
            render: () =>
                `<div class="col-custom"><button type="button" class="row-action">Act</button><a href="#x" class="row-link">Link</a><input class="row-input" /><label class="row-label">Lbl</label><span data-row-click-ignore class="row-ignore">Ign</span><span class="row-text"></span></div>`,
            setup: (node) => {
                $effect(() => {
                    const text = node.querySelector(".row-text");
                    if (text) text.textContent = `col:${getCtx().formatted}`;
                });
            },
        }));

        const styledColumns: DataTableColumn<PersonRow>[] = [
            {
                id: "name",
                label: "Name",
                cell: colCellSnippet,
                tone: (val) => (val === "Alice" ? "positive" : undefined),
                cellStyle: (val) =>
                    val === "Alice" ? { bg: "#00aa55", fg: "#ffffff", colorMode: "exact", bold: true } : undefined,
                bg: "#cccccc",
                fg: "#222222",
                colorMode: "tint",
            },
            {
                id: "department",
                label: "Department",
                tone: "accent",
                bg: "#ddeeff",
                colorMode: "tint",
            },
        ];

        const table = createDataTable({
            data: SAMPLE_DATA.slice(0, 3),
            columns: styledColumns,
            getRowId: (row) => row.id,
            selectable: true,
            rowTone: (row) => (row.id === "r2" ? "caution" : undefined),
            rowStyle: (row) => (row.id === "r2" ? { bg: "#ffeecc", fg: "#332200", colorMode: "exact" } : undefined),
        });

        let role = $state<"table" | "grid">("table");
        const instance = mount(DataTableTestHost<PersonRow>, {
            target: container,
            props: {
                variant: "elevated",
                size: "md",
                table,
                useBodyCellSnippet: true,
                onRowClick,
                get role() {
                    return role;
                },
            },
        });
        flushSync();

        const canvas = container.querySelector<HTMLDivElement>(".cs-data-table-canvas");
        expect(canvas?.getAttribute("aria-rowcount")).toBe("4"); // 3 data rows + 1 header
        expect(canvas?.getAttribute("aria-colcount")).toBe("3"); // selection + 2 columns

        const rows = [...container.querySelectorAll<HTMLDivElement>(".cs-data-table-row")];
        expect(rows).toHaveLength(3);
        const [row0, row1] = rows;
        if (!row0 || !row1) throw new Error("Missing rendered rows");

        expect(rows.map((r) => r.dataset.even !== undefined)).toEqual([false, true, false]);
        expect(rows.map((r) => r.getAttribute("aria-rowindex"))).toEqual(["2", "3", "4"]);
        // role="table" omits aria-selected
        expect(row0.hasAttribute("aria-selected")).toBe(false);

        // Snippet precedence: column.cell wins on `name`, DataTableBody `cell` snippet renders on `department`
        const row0Cells = [...row0.querySelectorAll<HTMLDivElement>(".cs-data-table-cell")];
        expect(row0Cells[1]?.querySelector(".row-text")?.textContent).toBe("col:Alice");
        expect(row0Cells[2]?.querySelector(".custom-body-cell")?.textContent?.trim()).toBe("body:Engineering");

        // Styling tier attributes & CSS variables:
        // Row 0 / cell 1 (`name`): cell tier + col tier both exposed (CSS gives cell > row > col precedence)
        expect(row0Cells[1]?.dataset.tone).toBe("positive");
        expect(row0Cells[1]?.dataset.customBg).toBe("");
        expect(row0Cells[1]?.dataset.colorMode).toBe("exact");
        expect(row0Cells[1]?.style.getPropertyValue("--cs-data-table-cell-bg")).toBe("#00aa55");
        expect(row0Cells[1]?.style.getPropertyValue("--cs-data-table-cell-fg")).toBe("#ffffff");
        expect(row0Cells[1]?.style.getPropertyValue("--cs-data-table-col-bg")).toBe("#cccccc");

        // Row 0 / cell 2 (`department`): static column tone & colBg
        expect(row0Cells[2]?.dataset.colTone).toBe("accent");
        expect(row0Cells[2]?.dataset.colBg).toBe("");
        expect(row0Cells[2]?.dataset.colColorMode).toBe("tint");

        // Row 1 (`r2`): row tone & rowStyle
        expect(row1.dataset.tone).toBe("caution");
        expect(row1.dataset.customBg).toBe("");
        expect(row1.dataset.colorMode).toBe("exact");
        expect(row1.style.getPropertyValue("--cs-data-table-row-bg")).toBe("#ffeecc");

        // onRowClick ignores interactive descendants: button, a, input, label, [data-row-click-ignore]
        row0Cells[1]?.querySelector<HTMLButtonElement>(".row-action")?.click();
        row0Cells[1]?.querySelector<HTMLAnchorElement>(".row-link")?.click();
        row0Cells[1]?.querySelector<HTMLInputElement>(".row-input")?.click();
        row0Cells[1]?.querySelector<HTMLLabelElement>(".row-label")?.click();
        row0Cells[1]?.querySelector<HTMLSpanElement>(".row-ignore")?.click();
        expect(onRowClick).not.toHaveBeenCalled();

        // Clicking non-interactive text inside cell fires onRowClick with row + metadata
        row0Cells[1]?.querySelector<HTMLSpanElement>(".row-text")?.click();
        expect(onRowClick).toHaveBeenCalledTimes(1);
        expect(onRowClick.mock.calls[0]?.[0]).toEqual(SAMPLE_DATA[0]);
        expect(onRowClick.mock.calls[0]?.[1]).toMatchObject({ rowId: "r1", rowIndex: 0 });

        // Pressing Enter directly on focused row fires onRowClick
        row1.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        expect(onRowClick).toHaveBeenCalledTimes(2);
        expect(onRowClick.mock.calls[1]?.[1]).toMatchObject({ rowId: "r2", rowIndex: 1 });

        // Switch role to grid -> emits aria-selected="false" / "true"
        role = "grid";
        table.toggleRowSelection("r1", { viewIndex: 0 });
        flushSync();
        expect(row0.getAttribute("aria-selected")).toBe("true");
        expect(row1.getAttribute("aria-selected")).toBe("false");

        unmount(instance);

        // Also verify custom `row` snippet mode
        const rowSnippetInstance = mount(DataTableTestHost<PersonRow>, {
            target: container,
            props: {
                variant: "elevated",
                size: "md",
                table,
                useBodyRowSnippet: true,
            },
        });
        flushSync();
        const customRows = container.querySelectorAll<HTMLDivElement>(".custom-body-row");
        expect(customRows).toHaveLength(3);
        expect(customRows[0]?.dataset.customRowId).toBe("r1");
        expect(customRows[0]?.textContent).toContain("row-snippet:Alice");
        unmount(rowSnippetInstance);
    });

    it("manages DataTableStatusBar idle -> filter -> selection -> filter -> idle transitions and docking", () => {
        const table = createDataTable({
            data: SAMPLE_DATA,
            columns: SAMPLE_COLUMNS,
            getRowId: (row) => row.id,
            selectable: true,
        });

        const instance = mount(DataTableTestHost<PersonRow>, {
            target: container,
            props: {
                variant: "elevated",
                size: "md",
                table,
                showStatusBar: true,
            },
        });
        flushSync();

        const root = container.querySelector<HTMLDivElement>(".cs-data-table");
        const dock = container.querySelector<HTMLDivElement>(".cs-data-table-status-bar-dock");
        const shell = container.querySelector<HTMLDivElement>(".cs-data-table-status-bar-shell");

        // Docked into bottom dock, hidden & inert when idle
        expect(shell?.parentElement).toBe(dock);
        expect(shell?.dataset.open).toBeUndefined();
        expect(shell?.hasAttribute("inert")).toBe(true);
        expect(root?.dataset.statusBarOpen).toBeUndefined();

        // Apply filter -> reveals in filter mode
        table.setColumnFilter("department", { kind: "values", selected: ["Engineering"] });
        flushSync();
        expect(shell?.dataset.open).toBe("");
        expect(shell?.hasAttribute("inert")).toBe(false);
        expect(shell?.dataset.mode).toBe("filter");
        expect(root?.dataset.statusBarOpen).toBe("");
        expect(shell?.querySelector(".cs-data-table-status-bar-summary")?.textContent?.trim()).toBe("2 of 5 rows");

        // Select a row while filtered -> switches cleanly to selection mode
        table.toggleRowSelection("r1", { viewIndex: 0 });
        flushSync();
        expect(shell?.dataset.mode).toBe("selection");
        expect(shell?.querySelector(".cs-data-table-status-bar-summary")?.textContent?.trim()).toBe("1 selected");

        // Click "Clear" button in selection mode -> clears selection and returns to filter mode
        const clearBtn = [...(shell?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((btn) =>
            btn.textContent?.includes("Clear")
        );
        expect(clearBtn).toBeDefined();
        clearBtn?.click();
        flushSync();

        expect(table.selectedCount).toBe(0);
        expect(shell?.dataset.mode).toBe("filter");
        expect(shell?.dataset.open).toBe("");

        // Click "Reset filters" in filter mode -> clears filters and hides status bar
        const resetBtn = [...(shell?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((btn) =>
            btn.textContent?.includes("Reset filters")
        );
        expect(resetBtn).toBeDefined();
        resetBtn?.click();
        flushSync();

        expect(table.isFiltered).toBe(false);
        expect(shell?.dataset.open).toBeUndefined();
        expect(shell?.hasAttribute("inert")).toBe(true);
        expect(root?.dataset.statusBarOpen).toBeUndefined();

        unmount(instance);
    });

    it("renders DataTableEmpty contextually for default vs filtered-empty states and supports filter reset", () => {
        let data = $state<PersonRow[]>([...SAMPLE_DATA]);
        let hideReset = $state(false);
        let table!: DataTableController<PersonRow>;

        const cleanup = $effect.root(() => {
            table = createDataTable({
                data: () => data,
                columns: SAMPLE_COLUMNS,
                getRowId: (row) => row.id,
            });
        });

        const instance = mount(DataTableTestHost<PersonRow>, {
            target: container,
            props: {
                variant: "elevated",
                size: "md",
                table,
                showEmpty: true,
                get emptyHideReset() {
                    return hideReset;
                },
            },
        });
        flushSync();

        // Hidden when rows exist
        expect(container.querySelector(".cs-data-table-empty")).toBeNull();

        // Filtered-empty state shows "No matching rows" + working "Reset filters" button
        table.setColumnFilter("name", { kind: "condition", operator: "equals", value: "Nobody" });
        flushSync();

        const emptyEl = container.querySelector<HTMLDivElement>(".cs-data-table-empty");
        expect(emptyEl).not.toBeNull();
        expect(emptyEl?.querySelector(".cs-data-table-empty-title")?.textContent).toBe("No matching rows");
        expect(emptyEl?.querySelector(".cs-data-table-empty-description")?.textContent).toContain("Adjust or clear");
        const resetButton = emptyEl?.querySelector<HTMLButtonElement>(":scope .cs-data-table-empty-actions button");
        expect(resetButton).not.toBeNull();

        // hideReset hides button
        hideReset = true;
        flushSync();
        expect(container.querySelector(".cs-data-table-empty-actions")).toBeNull();

        // Re-enable reset and click it -> restores rows and hides DataTableEmpty
        hideReset = false;
        flushSync();
        container.querySelector<HTMLButtonElement>(":scope .cs-data-table-empty-actions button")?.click();
        flushSync();
        expect(table.isFiltered).toBe(false);
        expect(table.rowCount).toBe(5);
        expect(container.querySelector(".cs-data-table-empty")).toBeNull();

        // Truly empty dataset (unfiltered) shows "No rows yet" with no reset button
        data = [];
        flushSync();
        const defaultEmpty = container.querySelector<HTMLDivElement>(".cs-data-table-empty");
        expect(defaultEmpty).not.toBeNull();
        expect(defaultEmpty?.querySelector(".cs-data-table-empty-title")?.textContent).toBe("No rows yet");
        expect(defaultEmpty?.querySelector(".cs-data-table-empty-actions")).toBeNull();

        unmount(instance);
        cleanup();
    });

    it("enforces soft-on-soft Checkbox guard across soft, elevated, and transparent variants", () => {
        let variant = $state<DataTableVariant>("soft");
        const table = createDataTable({
            data: SAMPLE_DATA.slice(0, 2),
            columns: SAMPLE_COLUMNS.slice(0, 2),
            getRowId: (row) => row.id,
            selectable: true,
        });

        const instance = mount(DataTableTestHost<PersonRow>, {
            target: container,
            props: {
                get variant() {
                    return variant;
                },
                size: "md",
                table,
            },
        });
        flushSync();

        const getCheckboxVariants = (): string[] =>
            [...container.querySelectorAll<HTMLInputElement>("input.cs-checkbox")].map((el) => el.dataset.variant ?? "");

        // variant="soft" -> Checkbox switches to "elevated"
        expect(getCheckboxVariants()).toEqual(["elevated", "elevated", "elevated"]);

        // variant="elevated" -> Checkbox uses "soft"
        variant = "elevated";
        flushSync();
        expect(getCheckboxVariants()).toEqual(["soft", "soft", "soft"]);

        // variant="transparent" -> Checkbox uses "soft"
        variant = "transparent";
        flushSync();
        expect(getCheckboxVariants()).toEqual(["soft", "soft", "soft"]);

        unmount(instance);
    });

    it("handles sort-only headers and the single shared filter popover (sort toggles, additive checklist, search auto-hide, condition mode, high-cardinality default)", () => {
        interface PopoverRow extends Record<string, unknown> {
            id: string;
            sortOnly: number;
            status: string;
            category: string;
            code: string;
        }

        const statuses = ["Open", "Review", "Done"] as const;
        const rows: PopoverRow[] = Array.from({ length: 12 }, (_, i) => ({
            id: `p-${i}`,
            sortOnly: 12 - i,
            status: statuses[i % 3] ?? "Open",
            category: `Cat-${i % 9}`, // 9 distinct (> 7 -> search shown, <= 10 -> values tab default)
            code: `CODE-${String(i).padStart(2, "0")}`, // 12 distinct (> highCardinalityThreshold 10 -> condition tab default)
        }));

        const cols: DataTableColumn<PopoverRow>[] = [
            { id: "sortOnly", label: "Rank", type: "number", sortable: true, filterable: false },
            { id: "status", label: "Status", type: "text", sortable: true, filterable: true },
            { id: "category", label: "Category", type: "text", sortable: false, filterable: true },
            { id: "code", label: "Code", type: "text", sortable: true, filterable: true },
        ];

        const table = createDataTable({
            data: rows,
            columns: cols,
            getRowId: (row) => row.id,
            highCardinalityThreshold: 10,
        });

        const instance = mount(DataTableTestHost<PopoverRow>, {
            target: container,
            props: {
                variant: "elevated",
                size: "md",
                table,
            },
        });
        flushSync();

        // Only ONE shared popover instance exists
        const popovers = container.querySelectorAll<HTMLDivElement>(".cs-data-table-column-popover");
        expect(popovers).toHaveLength(1);
        const popover = popovers[0];
        if (!popover) throw new Error("Missing column popover");

        const triggers = [...container.querySelectorAll<HTMLButtonElement>(".cs-data-table-header-trigger")];
        expect(triggers).toHaveLength(4);
        const [sortOnlyTrigger, statusTrigger, categoryTrigger, codeTrigger] = triggers;
        if (!sortOnlyTrigger || !statusTrigger || !categoryTrigger || !codeTrigger) {
            throw new Error("Missing header triggers");
        }

        // 1. Sort-only header cycles sort directly without opening popover
        sortOnlyTrigger.click();
        flushSync();
        expect(table.getColumnSort("sortOnly")).toEqual({ direction: "asc", priority: 1 });
        expect(table.openPopoverColumnId).toBeNull();

        sortOnlyTrigger.click();
        flushSync();
        expect(table.getColumnSort("sortOnly")).toEqual({ direction: "desc", priority: 1 });

        sortOnlyTrigger.click();
        flushSync();
        expect(table.getColumnSort("sortOnly")).toBeNull();

        // 2. Filterable low-cardinality column (`status`, 3 distinct <= 7): opens popover on Values tab with NO search input
        statusTrigger.click();
        flushSync();
        expect(table.openPopoverColumnId).toBe("status");
        expect(statusTrigger.getAttribute("aria-expanded")).toBe("true");
        expect(popover.querySelector(".cs-data-table-popover-search-input")).toBeNull();

        // 2-up sort toggle buttons inside popover update sort and aria-pressed
        const sortBtns = [...popover.querySelectorAll<HTMLButtonElement>(".cs-data-table-popover-sort-btn")];
        expect(sortBtns).toHaveLength(2);
        const [ascBtn, descBtn] = sortBtns;
        if (!ascBtn || !descBtn) throw new Error("Missing sort buttons");

        ascBtn.click();
        flushSync();
        expect(table.getColumnSort("status")).toEqual({ direction: "asc", priority: 1 });
        expect(ascBtn.getAttribute("aria-pressed")).toBe("true");
        expect(descBtn.getAttribute("aria-pressed")).toBe("false");

        // Clicking active sort toggle clears sort
        ascBtn.click();
        flushSync();
        expect(table.getColumnSort("status")).toBeNull();
        expect(ascBtn.getAttribute("aria-pressed")).toBe("false");

        // Additive checklist: all unchecked at rest, checking one filters, unchecking clears back to unfiltered
        const facetCheckboxes = [
            ...popover.querySelectorAll<HTMLInputElement>(":scope .cs-data-table-popover-option input"),
        ];
        expect(facetCheckboxes).toHaveLength(3);
        expect(facetCheckboxes.every((cb) => !cb.checked)).toBe(true);
        const firstFacetCb = facetCheckboxes[0];
        if (!firstFacetCb) throw new Error("Missing facet checkbox");

        firstFacetCb.click(); // "Done" (sorted alphabetically: Done, Open, Review)
        flushSync();
        expect(table.filters.status).toEqual({ kind: "values", selected: ["Done"] });
        expect(table.rowCount).toBe(4);

        firstFacetCb.click(); // Uncheck last selected value -> clears filter
        flushSync();
        expect(table.filters.status).toBeUndefined();
        expect(table.rowCount).toBe(12);

        // 3. Switch to `category` (9 distinct > 7): search input IS visible and filters options
        categoryTrigger.click();
        flushSync();
        expect(table.openPopoverColumnId).toBe("category");
        const searchInput = popover.querySelector<HTMLInputElement>(".cs-data-table-popover-search-input");
        expect(searchInput).not.toBeNull();
        if (!searchInput) throw new Error("Missing search input");

        searchInput.value = "Cat-8";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        flushSync();
        expect(popover.querySelectorAll(".cs-data-table-popover-option")).toHaveLength(1);

        // Footer shows "Select matches" button while searching
        const selectMatchesBtn = popover.querySelector<HTMLButtonElement>(":scope .cs-data-table-popover-footer button");
        selectMatchesBtn?.click();
        flushSync();
        expect(table.filters.category).toEqual({ kind: "values", selected: ["Cat-8"] });
        expect(table.rowCount).toBe(1);
        table.clearColumnFilter("category");
        flushSync();

        // 4. Switch to high-cardinality `code` (12 distinct > highCardinalityThreshold 10): defaults to Condition tab
        codeTrigger.click();
        flushSync();
        expect(table.openPopoverColumnId).toBe("code");
        expect(popover.querySelector(".cs-data-table-popover-condition")).not.toBeNull();
        expect(popover.querySelector(".cs-data-table-popover-list")).toBeNull();

        // Typing into condition value applies filter live
        const condInput = popover.querySelector<HTMLInputElement>(":scope .cs-data-table-popover-condition input");
        expect(condInput).not.toBeNull();
        if (!condInput) throw new Error("Missing condition input");
        condInput.value = "CODE-05";
        condInput.dispatchEvent(new Event("input", { bubbles: true }));
        flushSync();
        expect(table.filters.code).toEqual({ kind: "condition", operator: "contains", value: "CODE-05" });
        expect(table.rowCount).toBe(1);
        expect(table.rows[0]?.row.code).toBe("CODE-05");

        // Clicking the already-open trigger closes the popover cleanly
        codeTrigger.click();
        flushSync();
        expect(table.openPopoverColumnId).toBeNull();

        // ArrowDown on filterable header opens popover
        statusTrigger.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
        flushSync();
        expect(table.openPopoverColumnId).toBe("status");

        // Switching to Condition tab manually on low-cardinality column works
        const conditionTabBtn = popover.querySelector<HTMLButtonElement>(
            'button.cs-segmented-control-item[data-value="condition"]'
        );
        conditionTabBtn?.click();
        flushSync();
        expect(popover.querySelector(".cs-data-table-popover-condition")).not.toBeNull();

        unmount(instance);
    });

    it("virtualizes large datasets with windowed DOM subset, header-offset aria-rowindex, and logical data-even parity", () => {
        interface BigRow extends Record<string, unknown> {
            id: string;
            label: string;
        }

        const bigData: BigRow[] = Array.from({ length: 200 }, (_, i) => ({
            id: `row-${i}`,
            label: `Entry ${i}`,
        }));

        const cols: DataTableColumn<BigRow>[] = [{ id: "label", label: "Label", type: "text" }];

        // Viewport height = 220px, size="md" -> 44px rows -> 5 visible rows + overscan 2
        mockViewportHeight = 220;

        const table = createDataTable({
            data: bigData,
            columns: cols,
            getRowId: (row) => row.id,
            virtualize: { overscan: 2, initialViewportSize: 220, initialRenderCount: 10 },
        });

        const captured: { viewportRef: HTMLDivElement | null } = { viewportRef: null };
        const instance = mount(DataTableTestHost<BigRow>, {
            target: container,
            props: {
                variant: "elevated",
                size: "md",
                striped: true,
                table,
                get viewportRef() {
                    return captured.viewportRef;
                },
                set viewportRef(el: HTMLDivElement | null) {
                    captured.viewportRef = el;
                },
            },
        });
        flushSync();

        const initialRows = [...container.querySelectorAll<HTMLDivElement>(".cs-data-table-row")];
        expect(initialRows.length).toBeGreaterThan(0);
        expect(initialRows.length).toBeLessThan(20);

        for (const rowEl of initialRows) {
            const viewIdx = Number(rowEl.dataset.rowIndex);
            expect(rowEl.getAttribute("aria-rowindex")).toBe(String(viewIdx + 2));
            expect(rowEl.dataset.even !== undefined).toBe(viewIdx % 2 === 1);
        }

        // Scroll viewport down to row ~50 (50 * 44 = 2200px)
        const vp = captured.viewportRef;
        expect(vp).not.toBeNull();
        if (!vp) throw new Error("Missing viewportRef");
        let scrollTop = 0;
        Object.defineProperty(vp, "scrollTop", {
            get: () => scrollTop,
            set: (v: number) => {
                scrollTop = v;
            },
            configurable: true,
        });
        vp.scrollTo = ((options?: ScrollToOptions) => {
            if (typeof options?.top === "number") scrollTop = options.top;
        }) as typeof vp.scrollTo;

        table.scrollToRow(50, { align: "start" });
        flushSync();

        const scrolledRows = [...container.querySelectorAll<HTMLDivElement>(".cs-data-table-row")];
        expect(scrolledRows.length).toBeGreaterThan(0);
        expect(scrolledRows.length).toBeLessThan(20);

        const viewIndices = scrolledRows.map((el) => Number(el.dataset.rowIndex));
        expect(viewIndices).toContain(50);

        // Verify logical parity & aria-rowindex remain exact after recycling DOM rows
        for (const rowEl of scrolledRows) {
            const viewIdx = Number(rowEl.dataset.rowIndex);
            expect(rowEl.getAttribute("aria-rowindex")).toBe(String(viewIdx + 2));
            expect(rowEl.dataset.even !== undefined).toBe(viewIdx % 2 === 1);
        }

        unmount(instance);
    });
});
