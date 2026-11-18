import { describe, expect, it, vi } from "vitest";

import {
    compileFilterPredicate,
    compileGridTracks,
    computeColumnFacets,
    DATA_TABLE_SELECTION_WIDTH_PX,
    filterRowIndices,
    getDefaultConditionOperators,
    isEmptyValue,
    isFilterActive,
    parseDateTimestamp,
    parseNumericValue,
    resolveColumnAlign,
    sortRowIndices,
} from "./data-table-engine.internal.ts";
import type { DataTableColumn, DataTableColumnFilter, DataTableSize } from "./data-table.svelte.ts";

interface EmployeeRow {
    id: number;
    name: string | null | undefined;
    department: string | null;
    salary: number | string | null | undefined;
    margin: number | null;
    hiredAt: Date | string | number | null;
    active: boolean | null;
    code?: string;
}

const COLUMNS: DataTableColumn<EmployeeRow>[] = [
    { id: "name", label: "Name", type: "text", sortable: true, filterable: true },
    { id: "department", label: "Department", type: "text", sortable: true, filterable: true },
    { id: "salary", label: "Salary", type: "currency", sortable: true, filterable: true },
    { id: "margin", label: "Margin", type: "percent", sortable: true, filterable: true },
    { id: "hiredAt", label: "Hired", type: "date", sortable: true, filterable: true },
    { id: "active", label: "Active", type: "boolean", sortable: true, filterable: true },
];

const SAMPLE_ROWS: EmployeeRow[] = [
    {
        id: 1,
        name: "Alice Johnson",
        department: "Engineering",
        salary: 120_000,
        margin: 25.5,
        hiredAt: "2024-01-15T09:30:00Z",
        active: true,
    },
    {
        id: 2,
        name: "Bob Smith",
        department: "Design",
        salary: "$95,000",
        margin: 10,
        hiredAt: "2024-06-01T14:00:00Z",
        active: false,
    },
    {
        id: 3,
        name: "Charlie Brown",
        department: "Engineering",
        salary: 150_000,
        margin: 40,
        hiredAt: new Date("2025-02-20T00:00:00Z"),
        active: true,
    },
    {
        id: 4,
        name: "",
        department: null,
        salary: NaN,
        margin: null,
        hiredAt: new Date("invalid"),
        active: null,
    },
    {
        id: 5,
        name: null,
        department: "Sales",
        salary: null,
        margin: 0,
        hiredAt: null,
        active: false,
    },
];

function runColumnFilter(columnId: string, filter: DataTableColumnFilter): number[] {
    return filterRowIndices(SAMPLE_ROWS, COLUMNS, { [columnId]: filter });
}

describe("data-table-engine: compileGridTracks & helpers", () => {
    it("compiles selection column track widths per size via includeSelection and spec.selection", () => {
        const sizes: readonly DataTableSize[] = ["xs", "sm", "md", "lg"];

        for (const size of sizes) {
            const withOption = compileGridTracks([{ width: 160 }], { size, includeSelection: true });
            expect(withOption.gridColumns).toBe("var(--cs-data-table-selection-width) 160px");
            expect(withOption.minWidthPx).toBe(DATA_TABLE_SELECTION_WIDTH_PX[size] + 160);

            const withSpec = compileGridTracks([{ selection: true }, { width: 160 }], { size });
            expect(withSpec).toEqual(withOption);
        }

        expect(DATA_TABLE_SELECTION_WIDTH_PX).toEqual({ xs: 36, sm: 40, md: 44, lg: 52 });
    });

    it("compiles numeric, string, default, minWidth, and maxWidth tracks accurately", () => {
        const result = compileGridTracks(
            [
                { width: 200 },
                { width: 80, minWidth: 110 }, // numeric width clamped up to minWidth
                { width: "150px" }, // string px literal contributes 150
                { width: "2fr" }, // non-px string falls back to default 120
                { width: "2fr", minWidth: 180 }, // explicit minWidth overrides string fallback
                {}, // default minmax(120px, 1fr)
                { minWidth: 90, maxWidth: 240 }, // bounded minmax
            ],
            { size: "md" }
        );

        expect(result.gridColumns).toBe(
            "200px 110px 150px 2fr 2fr minmax(120px, 1fr) minmax(90px, 240px)"
        );
        expect(result.minWidthPx).toBe(200 + 110 + 150 + 120 + 180 + 120 + 90);
    });

    it("omits hidden (visible: false) columns when compiling visible column tracks", () => {
        const allCols: DataTableColumn<EmployeeRow>[] = [
            { id: "name", label: "Name", width: 200 },
            { id: "secret", label: "Secret", width: 300, visible: false },
            { id: "salary", label: "Salary", minWidth: 140 },
        ];
        const visible = allCols.filter((col) => col.visible !== false);

        const result = compileGridTracks(visible, { size: "sm", includeSelection: true });
        expect(result.gridColumns).toBe("var(--cs-data-table-selection-width) 200px minmax(140px, 1fr)");
        expect(result.minWidthPx).toBe(40 + 200 + 140);
    });

    it("resolves default alignment, operators, and value parsers cleanly", () => {
        expect(resolveColumnAlign({ type: "text" })).toBe("start");
        expect(resolveColumnAlign({ type: "date" })).toBe("start");
        expect(resolveColumnAlign({ type: "datetime" })).toBe("end");
        expect(resolveColumnAlign({ type: "number" })).toBe("end");
        expect(resolveColumnAlign({ type: "currency" })).toBe("end");
        expect(resolveColumnAlign({ type: "percent" })).toBe("end");
        expect(resolveColumnAlign({ type: "boolean" })).toBe("center");
        expect(resolveColumnAlign({ type: "number", align: "start" })).toBe("start");

        expect(getDefaultConditionOperators("text")).toContain("contains");
        expect(getDefaultConditionOperators("number")).toContain("between");
        expect(getDefaultConditionOperators("date")).toContain("between");
        expect(getDefaultConditionOperators("boolean")).toEqual(["equals", "notEquals", "isEmpty", "isNotEmpty"]);

        expect(isEmptyValue(null)).toBe(true);
        expect(isEmptyValue(undefined)).toBe(true);
        expect(isEmptyValue("")).toBe(true);
        expect(isEmptyValue(NaN)).toBe(true);
        expect(isEmptyValue(new Date("not-a-date"))).toBe(true);
        expect(isEmptyValue(0)).toBe(false);
        expect(isEmptyValue(false)).toBe(false);

        expect(parseNumericValue("$1,234.50")).toBe(1234.5);
        expect(parseNumericValue(" -42.5% ")).toBe(-42.5);
        expect(parseNumericValue("€ 900")).toBe(900);
        expect(parseNumericValue("not-a-number")).toBeNull();
        expect(parseNumericValue(Infinity)).toBeNull();
        expect(parseNumericValue(NaN)).toBeNull();

        expect(parseDateTimestamp(new Date("2025-03-15T12:00:00Z"))).toBe(Date.UTC(2025, 2, 15, 12, 0, 0));
        expect(parseDateTimestamp(new Date("invalid"))).toBeNull();
        expect(parseDateTimestamp("2025-03-15")).toBe(Date.UTC(2025, 2, 15));
        expect(parseDateTimestamp("garbage")).toBeNull();
    });
});

describe("data-table-engine: filtering", () => {
    it("supports additive values filter (empty = unfiltered, single/multi selection, blank key)", () => {
        const deptCol = COLUMNS[1];
        expect(deptCol).toBeDefined();
        expect(isFilterActive(null)).toBe(false);
        expect(isFilterActive({ kind: "values", selected: [] })).toBe(false);
        if (deptCol) {
            expect(compileFilterPredicate(deptCol, { kind: "values", selected: [] })).toBeNull();
        }

        // Empty selected array -> returns all rows
        expect(runColumnFilter("department", { kind: "values", selected: [] })).toEqual([0, 1, 2, 3, 4]);

        // Single value selection
        expect(runColumnFilter("department", { kind: "values", selected: ["Engineering"] })).toEqual([0, 2]);

        // Multi value selection (OR)
        expect(runColumnFilter("department", { kind: "values", selected: ["Design", "Sales"] })).toEqual([1, 4]);

        // Blank "" canonical key matches null / undefined / "" / NaN / Invalid Date
        expect(runColumnFilter("name", { kind: "values", selected: [""] })).toEqual([3, 4]);
        expect(runColumnFilter("salary", { kind: "values", selected: [""] })).toEqual([3, 4]);
        expect(runColumnFilter("hiredAt", { kind: "values", selected: [""] })).toEqual([3, 4]);
        expect(runColumnFilter("active", { kind: "values", selected: [""] })).toEqual([3]);
    });

    it("evaluates all text condition operators case-insensitively and handles empty/null cells", () => {
        expect(runColumnFilter("name", { kind: "condition", operator: "contains", value: "  ALICE " })).toEqual([0]);
        expect(runColumnFilter("name", { kind: "condition", operator: "notContains", value: "o" })).toEqual([3, 4]);
        expect(runColumnFilter("name", { kind: "condition", operator: "equals", value: "bob smith" })).toEqual([1]);
        expect(runColumnFilter("name", { kind: "condition", operator: "notEquals", value: "bob smith" })).toEqual([
            0, 2, 3, 4,
        ]);
        expect(runColumnFilter("name", { kind: "condition", operator: "startsWith", value: "char" })).toEqual([2]);
        expect(runColumnFilter("name", { kind: "condition", operator: "endsWith", value: "SON" })).toEqual([0]);
        expect(runColumnFilter("name", { kind: "condition", operator: "isEmpty" })).toEqual([3, 4]);
        expect(runColumnFilter("name", { kind: "condition", operator: "isNotEmpty" })).toEqual([0, 1, 2]);

        // Whitespace-only query is inactive -> unfiltered
        const blankQuery = " ".repeat(3);
        expect(isFilterActive({ kind: "condition", operator: "contains", value: blankQuery })).toBe(false);
        expect(runColumnFilter("name", { kind: "condition", operator: "contains", value: blankQuery })).toEqual([
            0, 1, 2, 3, 4,
        ]);
    });

    it("evaluates numeric/currency/percent operators including invalid inputs, NaN, and between bounds", () => {
        // Currency column parses both numeric values and "$95,000" strings, excludes NaN/null on ranges
        expect(runColumnFilter("salary", { kind: "condition", operator: "equals", value: "$95,000" })).toEqual([1]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "notEquals", value: "120000" })).toEqual([
            1, 2, 3, 4,
        ]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "gt", value: "120000" })).toEqual([2]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "gte", value: "120000" })).toEqual([0, 2]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "lt", value: "120000" })).toEqual([1]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "lte", value: "120000" })).toEqual([0, 1]);

        // Between: normal inclusive, open-ended min, open-ended max, reversed bounds, empty, invalid
        expect(
            runColumnFilter("salary", { kind: "condition", operator: "between", value: "95000", valueTo: "120000" })
        ).toEqual([0, 1]);
        expect(
            runColumnFilter("salary", { kind: "condition", operator: "between", value: "120000", valueTo: "" })
        ).toEqual([0, 2]);
        expect(
            runColumnFilter("salary", { kind: "condition", operator: "between", value: "", valueTo: "100000" })
        ).toEqual([1]);
        expect(
            runColumnFilter("salary", { kind: "condition", operator: "between", value: "200000", valueTo: "50000" })
        ).toEqual([]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "between", value: "", valueTo: "" })).toEqual([
            0, 1, 2, 3, 4,
        ]);
        expect(
            runColumnFilter("salary", { kind: "condition", operator: "between", value: "abc", valueTo: "xyz" })
        ).toEqual([]);

        // Invalid numeric query on range operator returns empty match set
        expect(runColumnFilter("salary", { kind: "condition", operator: "gt", value: "not-a-num" })).toEqual([]);

        // isEmpty / isNotEmpty treat NaN and null as empty, but 0 as non-empty
        expect(runColumnFilter("salary", { kind: "condition", operator: "isEmpty" })).toEqual([3, 4]);
        expect(runColumnFilter("salary", { kind: "condition", operator: "isNotEmpty" })).toEqual([0, 1, 2]);
        expect(runColumnFilter("margin", { kind: "condition", operator: "isEmpty" })).toEqual([3]);
        expect(runColumnFilter("margin", { kind: "condition", operator: "equals", value: "0%" })).toEqual([4]);
    });

    it("evaluates date/datetime operators including date-only day bounds, timestamps, and invalid dates", () => {
        // Date-only equals matches timestamp occurring later on the same UTC day (2024-01-15T09:30:00Z)
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "equals", value: "2024-01-15" })).toEqual([0]);
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "notEquals", value: "2024-01-15" })).toEqual([
            1, 2, 3, 4,
        ]);

        // Date-only gt excludes same-day timestamps; gte includes same-day timestamps
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "gt", value: "2024-01-15" })).toEqual([1, 2]);
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "gte", value: "2024-01-15" })).toEqual([
            0, 1, 2,
        ]);
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "lt", value: "2024-06-01" })).toEqual([0]);
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "lte", value: "2024-06-01" })).toEqual([0, 1]);

        // Date-only between includes end-of-day timestamps on valueTo
        expect(
            runColumnFilter("hiredAt", {
                kind: "condition",
                operator: "between",
                value: "2024-01-15",
                valueTo: "2024-06-01",
            })
        ).toEqual([0, 1]);
        // Reversed date range -> empty
        expect(
            runColumnFilter("hiredAt", {
                kind: "condition",
                operator: "between",
                value: "2025-01-01",
                valueTo: "2024-01-01",
            })
        ).toEqual([]);
        // Invalid date query -> empty
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "gt", value: "not-a-date" })).toEqual([]);
        expect(
            runColumnFilter("hiredAt", { kind: "condition", operator: "between", value: "bad", valueTo: "worse" })
        ).toEqual([]);

        // Exact ISO datetime comparison
        expect(
            runColumnFilter("hiredAt", { kind: "condition", operator: "equals", value: "2024-01-15T09:30:00Z" })
        ).toEqual([0]);
        expect(
            runColumnFilter("hiredAt", { kind: "condition", operator: "equals", value: "2024-01-15T10:00:00Z" })
        ).toEqual([]);

        // Invalid Date and null are empty
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "isEmpty" })).toEqual([3, 4]);
        expect(runColumnFilter("hiredAt", { kind: "condition", operator: "isNotEmpty" })).toEqual([0, 1, 2]);
    });

    it("evaluates boolean column conditions", () => {
        expect(runColumnFilter("active", { kind: "condition", operator: "equals", value: "yes" })).toEqual([0, 2]);
        expect(runColumnFilter("active", { kind: "condition", operator: "equals", value: "NO" })).toEqual([1, 4]);
        expect(runColumnFilter("active", { kind: "condition", operator: "notEquals", value: "yes" })).toEqual([
            1, 3, 4,
        ]);
        expect(runColumnFilter("active", { kind: "condition", operator: "isEmpty" })).toEqual([3]);
        expect(runColumnFilter("active", { kind: "condition", operator: "isNotEmpty" })).toEqual([0, 1, 2, 4]);
    });

    it("composes cross-column AND predicates with short-circuiting and ignores unknown columns", () => {
        const secondColAccessor = vi.fn((row: EmployeeRow) => row.salary);
        const cols: DataTableColumn<EmployeeRow>[] = [
            { id: "department", label: "Department", type: "text" },
            { id: "salary", label: "Salary", type: "number", accessor: secondColAccessor },
        ];

        const matched = filterRowIndices(SAMPLE_ROWS, cols, {
            department: { kind: "values", selected: ["Engineering"] },
            salary: { kind: "condition", operator: "gt", value: "130000" },
            removedColumn: { kind: "condition", operator: "equals", value: "ignored" },
        });

        expect(matched).toEqual([2]);
        // Only rows 0 and 2 matched "Engineering", so salary accessor must only be invoked for those 2 rows
        expect(secondColAccessor).toHaveBeenCalledTimes(2);
    });
});

describe("data-table-engine: sorting", () => {
    it("sorts text naturally (numeric collator), numbers, dates, booleans, and custom sortFn", () => {
        interface MixedRow {
            id: number;
            label: string | null;
            amount: number | string | null;
            when: Date | string | null;
            flag: boolean | null;
            rank: number;
        }

        const rows: MixedRow[] = [
            { id: 0, label: "Item 10", amount: 50, when: "2024-05-10", flag: true, rank: 2 },
            { id: 1, label: "item 2", amount: "$5", when: "2023-12-01", flag: false, rank: 3 },
            { id: 2, label: "Item 1", amount: -10, when: new Date("2025-01-01"), flag: true, rank: 1 },
        ];

        const cols: DataTableColumn<MixedRow>[] = [
            { id: "label", label: "Label", type: "text" },
            { id: "amount", label: "Amount", type: "currency" },
            { id: "when", label: "When", type: "date" },
            { id: "flag", label: "Flag", type: "boolean" },
            { id: "rank", label: "Rank", sortFn: (a, b) => a.rank - b.rank },
        ];

        const indices = [0, 1, 2];

        // Natural numeric text sort: Item 1 < item 2 < Item 10
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "label", direction: "asc" }], "en")).toEqual([2, 1, 0]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "label", direction: "desc" }], "en")).toEqual([
            0, 1, 2,
        ]);

        // Currency numeric sort: -10 < $5 < 50
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "amount", direction: "asc" }])).toEqual([2, 1, 0]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "amount", direction: "desc" }])).toEqual([0, 1, 2]);

        // Date chronological sort: 2023-12-01 < 2024-05-10 < 2025-01-01
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "when", direction: "asc" }])).toEqual([1, 0, 2]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "when", direction: "desc" }])).toEqual([2, 0, 1]);

        // Boolean sort: false (1) before true (0, 2), with stable sourceIndex tie-break
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "flag", direction: "asc" }])).toEqual([1, 0, 2]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "flag", direction: "desc" }])).toEqual([0, 2, 1]);

        // Custom sortFn
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "rank", direction: "asc" }])).toEqual([2, 0, 1]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "rank", direction: "desc" }])).toEqual([1, 0, 2]);
    });

    it("always sorts null, undefined, empty string, NaN, and Invalid Date LAST in both asc and desc", () => {
        interface NullableRow {
            id: number;
            text: string | null | undefined;
            num: number | null | undefined;
            date: Date | string | null;
            bool: boolean | null;
        }

        const rows: NullableRow[] = [
            { id: 0, text: null, num: NaN, date: new Date("invalid"), bool: null },
            { id: 1, text: "Bravo", num: 20, date: "2024-02-01", bool: true },
            { id: 2, text: "", num: undefined, date: null, bool: null },
            { id: 3, text: "Alpha", num: 10, date: "2024-01-01", bool: false },
            { id: 4, text: undefined, num: null, date: "", bool: true },
        ];

        const cols: DataTableColumn<NullableRow>[] = [
            { id: "text", label: "Text", type: "text" },
            { id: "num", label: "Num", type: "number" },
            { id: "date", label: "Date", type: "date" },
            { id: "bool", label: "Bool", type: "boolean" },
        ];

        const indices = [0, 1, 2, 3, 4];

        // Text: empties [0, 2, 4] stay last in original sourceIndex order for BOTH asc and desc
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "text", direction: "asc" }], "en")).toEqual([
            3, 1, 0, 2, 4,
        ]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "text", direction: "desc" }], "en")).toEqual([
            1, 3, 0, 2, 4,
        ]);

        // Number: NaN / undefined / null [0, 2, 4] stay last in both asc and desc
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "num", direction: "asc" }])).toEqual([3, 1, 0, 2, 4]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "num", direction: "desc" }])).toEqual([1, 3, 0, 2, 4]);

        // Date: Invalid Date / null / "" [0, 2, 4] stay last in both asc and desc
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "date", direction: "asc" }])).toEqual([3, 1, 0, 2, 4]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "date", direction: "desc" }])).toEqual([1, 3, 0, 2, 4]);

        // Boolean: nulls [0, 2] stay last in both asc and desc
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "bool", direction: "asc" }])).toEqual([3, 1, 4, 0, 2]);
        expect(sortRowIndices(rows, indices, cols, [{ columnId: "bool", direction: "desc" }])).toEqual([1, 4, 3, 0, 2]);
    });

    it("supports multi-column priority sorting with deterministic sourceIndex tie-breaking", () => {
        interface PriorityRow {
            group: string;
            score: number;
            note: string;
        }

        const rows: PriorityRow[] = [
            { group: "B", score: 10, note: "first" },
            { group: "A", score: 20, note: "second" },
            { group: "A", score: 20, note: "third" },
            { group: "A", score: 30, note: "fourth" },
            { group: "B", score: 30, note: "fifth" },
        ];

        const cols: DataTableColumn<PriorityRow>[] = [
            { id: "group", label: "Group", type: "text" },
            { id: "score", label: "Score", type: "number" },
        ];

        // Primary: group asc (A then B), Secondary: score desc (30 then 20), Tie-break: sourceIndex asc (1 before 2)
        expect(
            sortRowIndices(
                rows,
                [0, 1, 2, 3, 4],
                cols,
                [
                    { columnId: "group", direction: "asc" },
                    { columnId: "score", direction: "desc" },
                ],
                "en"
            )
        ).toEqual([3, 1, 2, 4, 0]);

        // Unknown sort column is ignored gracefully
        expect(sortRowIndices(rows, [0, 1, 2], cols, [{ columnId: "nonexistent", direction: "asc" }])).toEqual([
            0, 1, 2,
        ]);
    });
});

describe("data-table-engine: lazy cross-filtered facets", () => {
    interface FacetRow {
        region: string | null;
        status: string | null;
        score: number | null;
    }

    const rows: FacetRow[] = [
        { region: "EMEA", status: "Active", score: 100 },
        { region: "EMEA", status: "Paused", score: 20 },
        { region: "EMEA", status: null, score: 5 },
        { region: "APAC", status: "Active", score: 100 },
        { region: "AMER", status: "Closed", score: null },
        { region: "", status: "Active", score: 20 },
    ];

    const cols: DataTableColumn<FacetRow>[] = [
        { id: "region", label: "Region", type: "text" },
        { id: "status", label: "Status", type: "text" },
        { id: "score", label: "Score", type: "number" },
    ];

    it("cross-filters by other active column filters while excluding the target column's own filter", () => {
        const filters: Record<string, DataTableColumnFilter> = {
            region: { kind: "values", selected: ["EMEA"] },
            status: { kind: "values", selected: ["Active"] },
        };

        // Facets for `status` apply `region === "EMEA"` ONLY (excluding status's own filter)
        const statusFacets = computeColumnFacets(rows, cols, filters, "status", { locale: "en" });
        expect(statusFacets.truncated).toBe(false);
        expect(statusFacets.totalDistinct).toBe(3);
        expect(statusFacets.items.map((item) => ({ key: item.key, count: item.count, isEmpty: item.isEmpty }))).toEqual([
            { key: "Active", count: 1, isEmpty: false },
            { key: "Paused", count: 1, isEmpty: false },
            { key: "", count: 1, isEmpty: true }, // (Blank) pinned last
        ]);
        expect(statusFacets.items.at(-1)?.label).toBe("(Blank)");

        // Facets for `region` apply `status === "Active"` ONLY (excluding region's own filter)
        const regionFacets = computeColumnFacets(rows, cols, filters, "region", { locale: "en" });
        expect(regionFacets.items.map((item) => ({ key: item.key, count: item.count }))).toEqual([
            { key: "APAC", count: 1 },
            { key: "EMEA", count: 1 },
            { key: "", count: 1 },
        ]);
    });

    it("sorts numeric facets numerically and pins (Blank) last", () => {
        const scoreFacets = computeColumnFacets(rows, cols, {}, "score");
        expect(scoreFacets.items.map((item) => ({ key: item.key, count: item.count, isEmpty: item.isEmpty }))).toEqual([
            { key: "5", count: 1, isEmpty: false },
            { key: "20", count: 2, isEmpty: false },
            { key: "100", count: 2, isEmpty: false },
            { key: "", count: 1, isEmpty: true },
        ]);
    });

    it("caps distinct checklist values with maxChecklistValues, sets truncated, and retains selectedKeys + (Blank)", () => {
        const manyRows = Array.from({ length: 30 }, (_, i) => ({
            tag: i === 29 ? null : `Tag ${String(i).padStart(2, "0")}`,
        }));
        const tagCols: DataTableColumn<{ tag: string | null }>[] = [{ id: "tag", label: "Tag", type: "text" }];

        const result = computeColumnFacets(manyRows, tagCols, {}, "tag", {
            maxChecklistValues: 5,
            selectedKeys: ["Tag 25"],
            locale: "en",
        });

        expect(result.truncated).toBe(true);
        // 29 distinct non-empty tags + 1 blank = 30 distinct total
        expect(result.totalDistinct).toBe(30);
        // 5 capped items + 1 retained selected key ("Tag 25") + 1 retained blank = 7 items
        expect(result.items).toHaveLength(7);
        expect(result.items.some((item) => item.key === "Tag 25")).toBe(true);
        expect(result.items.at(-1)?.isEmpty).toBe(true);
    });

    it("returns empty facet result for an unknown columnId", () => {
        expect(computeColumnFacets(rows, cols, {}, "missing")).toEqual({
            items: [],
            totalDistinct: 0,
            truncated: false,
        });
    });
});

describe("data-table-engine: 100k-row correctness & performance sanity", () => {
    it("filters and sorts 100,000 rows accurately within budget", () => {
        const COUNT = 100_000;
        const regions = ["EMEA", "AMER", "APAC", "LATAM"] as const;
        const rows = Array.from({ length: COUNT }, (_, i) => ({
            id: i,
            region: regions[i % 4] ?? "EMEA",
            amount: i % 100 === 0 ? null : ((i * 7919) % 10_000) - 500,
            code: `ORD-${i}`,
        }));

        const cols: DataTableColumn<(typeof rows)[number]>[] = [
            { id: "region", label: "Region", type: "text" },
            { id: "amount", label: "Amount", type: "number" },
            { id: "code", label: "Code", type: "text" },
        ];

        const start = performance.now();

        // Filter: region in ["EMEA", "APAC"] (50,000 rows) AND amount >= 5000 (excludes nulls)
        const filtered = filterRowIndices(rows, cols, {
            region: { kind: "values", selected: ["EMEA", "APAC"] },
            amount: { kind: "condition", operator: "gte", value: "5000" },
        });

        // Sort descending by amount, then ascending by region
        const sorted = sortRowIndices(rows, filtered, cols, [
            { columnId: "amount", direction: "desc" },
            { columnId: "region", direction: "asc" },
        ]);

        // Also verify null-last sort over full 100k dataset
        const allIndices = filterRowIndices(rows, cols, {});
        const fullSorted = sortRowIndices(rows, allIndices, cols, [{ columnId: "amount", direction: "desc" }]);

        const elapsed = performance.now() - start;

        // Sanity checks on correctness
        expect(filtered.length).toBeGreaterThan(20_000);
        expect(sorted).toHaveLength(filtered.length);
        for (let i = 1; i < sorted.length; i++) {
            const prevIdx = sorted[i - 1];
            const currIdx = sorted[i];
            const prev = prevIdx === undefined ? undefined : rows[prevIdx];
            const curr = currIdx === undefined ? undefined : rows[currIdx];
            expect(prev).toBeDefined();
            expect(curr).toBeDefined();
            if (!prev || !curr) continue;
            expect(prev.region === "EMEA" || prev.region === "APAC").toBe(true);
            expect(curr.amount).toBeGreaterThanOrEqual(5000);
            expect(prev.amount).not.toBeNull();
            expect(curr.amount).not.toBeNull();
            if (prev.amount !== null && curr.amount !== null) {
                expect(prev.amount).toBeGreaterThanOrEqual(curr.amount);
            }
        }

        // Nulls (1,000 rows where i % 100 === 0) must all sit at the very end of fullSorted
        expect(fullSorted).toHaveLength(COUNT);
        const firstIdx = fullSorted[0] ?? -1;
        const lastNonNullIdx = fullSorted[COUNT - 1001] ?? -1;
        const firstNullIdx = fullSorted[COUNT - 1000] ?? -1;
        const lastNullIdx = fullSorted[COUNT - 1] ?? -1;
        expect(rows[firstIdx]?.amount).not.toBeNull();
        expect(rows[lastNonNullIdx]?.amount).not.toBeNull();
        expect(rows[firstNullIdx]?.amount).toBeNull();
        expect(rows[lastNullIdx]?.amount).toBeNull();

        expect(elapsed).toBeLessThan(2000);
    });
});
