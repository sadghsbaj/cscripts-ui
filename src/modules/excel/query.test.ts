import { describe, expect, it } from "vitest";
import { createWorkbookBuilder } from "./builder.ts";
import { getCell, setCell } from "./coords.ts";
import { isExcelError } from "./errors.ts";
import {
	alignSeriesByKey,
	canonicalizeValues,
	computePeriodDeltas,
	computeRunningTotals,
	dedupeRecords,
	deriveField,
	fillDownRecords,
	filterRecords,
	joinRecords,
	jsonToWorkbook,
	mapRecords,
	pivotRecords,
	projectTable,
	rankRecords,
	recordsToSheet,
	sheetToRecords,
	sortRecords,
	unpivotRecords,
	workbookToJson,
	type StandardSchemaV1,
} from "./query.ts";
import type {
	CellModel,
	GridRow,
	TableColumnSpec,
	WorkbookModel,
	WorksheetModel,
} from "./types.ts";
import { formatCellDisplay, parseThresholdValue } from "./values.ts";

function makeSheet(
	name: string,
	entries: ReadonlyArray<[string, CellModel]>,
	extra?: Partial<Omit<WorksheetModel, "name" | "cells">>,
): WorksheetModel {
	const sheet: WorksheetModel = {
		name,
		cells: new Map<string, CellModel>(),
		...extra,
	};
	for (const [ref, cell] of entries) {
		setCell(sheet, ref, cell);
	}
	return sheet;
}

describe("query: sheetToRecords", () => {
	it("maps headers fuzzily via aliases, detects header row below metadata, and reports missing required columns", () => {
		const sheet = makeSheet("Samples", [
			["A1", { value: "Lab Export Q1" }],
			["A3", { value: "Sample ID" }],
			["B3", { value: "Temprature" }], // 1-char typo for Temperature
			["C3", { value: "Value" }],
			["A4", { value: "S-01" }],
			["B4", { value: "21,5" }],
			["C4", { value: 10 }],
			["A5", { value: "S-02" }],
			["B5", { value: "bad" }],
			["C5", { value: 20 }],
		]);

		const res = sheetToRecords<{ id: string; temp: number; val: number }>(sheet, {
			columns: [
				{ field: "id", aliases: ["Sample ID"], required: true },
				{
					field: "temp",
					aliases: ["Temperature"],
					required: true,
					parse: (v) => {
						const parsed = Number(String(v).replace(",", "."));
						if (Number.isNaN(parsed)) {
							throw new TypeError(`Invalid temperature: ${String(v)}`);
						}
						return parsed;
					},
				},
				{ field: "val", aliases: ["Value"] },
				{ field: "analyst", aliases: ["Analyst"], required: true },
			],
		});

		expect(res.headerRowIndex).toBe(3);
		expect(res.mappedColumns).toEqual({ id: 0, temp: 1, val: 2 });
		expect(res.records).toEqual([
			{ id: "S-01", temp: 21.5, val: 10 },
			{ id: "S-02", temp: "bad", val: 20 },
		]);

		expect(res.diagnostics).toHaveLength(2);
		expect(res.diagnostics[0]).toMatchObject({
			severity: "negative",
			sheet: "Samples",
			row: 3,
			field: "analyst",
			code: "MISSING_REQUIRED_COLUMN",
		});
		expect(res.diagnostics[1]).toMatchObject({
			severity: "negative",
			sheet: "Samples",
			ref: "B5",
			row: 5,
			col: 1,
			field: "temp",
			code: "PARSE_ERROR",
			message: "Invalid temperature: bad",
		});
	});

	it("works on GridRow[] directly and disambiguates duplicate headers when columns are omitted", () => {
		const grid: GridRow[] = [
			{ rowIndex: 1, hidden: false, cells: ["Code", "Score", "Score"] },
			{ rowIndex: 2, hidden: false, cells: ["A", 10, 20] },
			{ rowIndex: 3, hidden: false, cells: [null, "", null] },
			{ rowIndex: 4, hidden: false, cells: ["B", 30, 40] },
		];

		const skipped = sheetToRecords(grid, { sheetName: "Scores" });
		expect(skipped.headerRowIndex).toBe(1);
		expect(skipped.mappedColumns).toEqual({ Code: 0, Score: 1, Score_2: 2 });
		expect(skipped.records).toEqual([
			{ Code: "A", Score: 10, Score_2: 20 },
			{ Code: "B", Score: 30, Score_2: 40 },
		]);

		const kept = sheetToRecords(grid, { sheetName: "Scores", skipEmptyRows: false });
		expect(kept.records).toHaveLength(3);
		expect(kept.records[1]).toEqual({ Code: null, Score: "", Score_2: null });
	});

	it("validates rows with synchronous StandardSchemaV1 and honors onInvalidRow skip vs include", () => {
		interface ItemRecord {
			sku: string;
			qty: number;
		}

		const syncSchema: StandardSchemaV1<unknown, ItemRecord> = {
			"~standard": {
				version: 1,
				vendor: "test",
				validate: (value) => {
					const rec = value as Record<string, unknown>;
					const qty = Number(rec.qty);
					if (typeof rec.sku !== "string" || rec.sku.length === 0) {
						return {
							issues: [{ message: "SKU required", path: ["sku"] }],
						};
					}
					if (!Number.isFinite(qty) || qty <= 0) {
						return {
							issues: [{ message: "Quantity must be positive", path: [{ key: "qty" }] }],
						};
					}
					return { value: { sku: rec.sku.toUpperCase(), qty } };
				},
			},
		};

		const grid: GridRow[] = [
			{ rowIndex: 1, hidden: false, cells: ["sku", "qty"] },
			{ rowIndex: 2, hidden: false, cells: ["ab-1", 5] },
			{ rowIndex: 3, hidden: false, cells: ["ab-2", -3] },
			{ rowIndex: 4, hidden: false, cells: ["", 2] },
		];

		const skipped = sheetToRecords<ItemRecord>(grid, {
			sheetName: "Inventory",
			schema: syncSchema,
			onInvalidRow: "skip",
		});

		expect(skipped.records).toEqual([{ sku: "AB-1", qty: 5 }]);
		expect(skipped.diagnostics).toEqual([
			{
				severity: "negative",
				sheet: "Inventory",
				ref: "B3",
				row: 3,
				col: 1,
				field: "qty",
				code: "SCHEMA_VALIDATION_FAILED",
				message: "Quantity must be positive",
			},
			{
				severity: "negative",
				sheet: "Inventory",
				ref: "A4",
				row: 4,
				col: 0,
				field: "sku",
				code: "SCHEMA_VALIDATION_FAILED",
				message: "SKU required",
			},
		]);

		const included = sheetToRecords<ItemRecord>(grid, {
			sheetName: "Inventory",
			schema: syncSchema,
			onInvalidRow: "include",
		});

		expect(included.records).toHaveLength(3);
		expect(included.records[0]).toEqual({ sku: "AB-1", qty: 5 });
		expect(included.records[1]).toEqual({ sku: "ab-2", qty: -3 });
		expect(included.diagnostics).toHaveLength(2);
	});

	it("throws ExcelError('INVALID_CONFIG') immediately when given an async StandardSchemaV1", () => {
		const asyncSchema: StandardSchemaV1<unknown, { name: string }> = {
			"~standard": {
				version: 1,
				vendor: "test-async",
				validate: async (value) => ({ value: value as { name: string } }),
			},
		};

		const grid: GridRow[] = [
			{ rowIndex: 1, hidden: false, cells: ["name"] },
			{ rowIndex: 2, hidden: false, cells: ["Alice"] },
		];

		let caught: unknown;
		try {
			sheetToRecords(grid, { schema: asyncSchema });
		} catch (error) {
			caught = error;
		}

		expect(isExcelError(caught)).toBe(true);
		if (isExcelError(caught)) {
			expect(caught.code).toBe("INVALID_CONFIG");
		}
	});

	it("emits diagnostics for empty sheets and missing explicit headerRow", () => {
		const emptyRes = sheetToRecords([], {
			sheetName: "Empty",
			columns: [{ field: "id", required: true }],
		});
		expect(emptyRes.records).toEqual([]);
		expect(emptyRes.headerRowIndex).toBeNull();
		expect(emptyRes.diagnostics[0]?.code).toBe("MISSING_REQUIRED_COLUMN");

		const missingHeaderRes = sheetToRecords(
			[{ rowIndex: 1, hidden: false, cells: ["id"] }],
			{
				sheetName: "Short",
				headerRow: 5,
				columns: [{ field: "id", required: true }],
			},
		);
		expect(missingHeaderRes.headerRowIndex).toBeNull();
		expect(missingHeaderRes.diagnostics.map((d) => d.code)).toEqual([
			"HEADER_NOT_FOUND",
			"MISSING_REQUIRED_COLUMN",
		]);
	});

	it("disambiguates duplicate headers ['Score', 'Score_2', 'Score'] collision-free to Score, Score_2, Score_3", () => {
		const grid: GridRow[] = [
			{ rowIndex: 1, hidden: false, cells: ["Score", "Score_2", "Score"] },
			{ rowIndex: 2, hidden: false, cells: [10, 20, 30] },
		];

		const res = sheetToRecords(grid, { sheetName: "Collisions" });
		expect(res.mappedColumns).toEqual({ Score: 0, Score_2: 1, Score_3: 2 });
		expect(res.records).toEqual([{ Score: 10, Score_2: 20, Score_3: 30 }]);
	});

	it("emits negative SCHEMA_VALIDATION_FAILED diagnostics when StandardSchemaV1 throws or returns empty issues[]", () => {
		const throwingSchema: StandardSchemaV1<unknown, { name: string }> = {
			"~standard": {
				version: 1,
				vendor: "test-throw",
				validate: () => {
					throw new Error("Validator exploded");
				},
			},
		};

		const emptyIssuesSchema: StandardSchemaV1<unknown, { name: string }> = {
			"~standard": {
				version: 1,
				vendor: "test-empty-issues",
				validate: () => ({ issues: [] }),
			},
		};

		const grid: GridRow[] = [
			{ rowIndex: 1, hidden: false, cells: ["name"] },
			{ rowIndex: 2, hidden: false, cells: ["Alice"] },
		];

		const thrownSkipped = sheetToRecords(grid, {
			sheetName: "ThrowSheet",
			schema: throwingSchema,
			onInvalidRow: "skip",
		});
		expect(thrownSkipped.records).toEqual([]);
		expect(thrownSkipped.diagnostics).toEqual([
			{
				severity: "negative",
				sheet: "ThrowSheet",
				row: 2,
				code: "SCHEMA_VALIDATION_FAILED",
				message: "Validator exploded",
			},
		]);

		const thrownIncluded = sheetToRecords(grid, {
			sheetName: "ThrowSheet",
			schema: throwingSchema,
			onInvalidRow: "include",
		});
		expect(thrownIncluded.records).toEqual([{ name: "Alice" }]);
		expect(thrownIncluded.diagnostics).toHaveLength(1);

		const emptyIssuesSkipped = sheetToRecords(grid, {
			sheetName: "EmptyIssuesSheet",
			schema: emptyIssuesSchema,
			onInvalidRow: "skip",
		});
		expect(emptyIssuesSkipped.records).toEqual([]);
		expect(emptyIssuesSkipped.diagnostics).toEqual([
			{
				severity: "negative",
				sheet: "EmptyIssuesSheet",
				row: 2,
				code: "SCHEMA_VALIDATION_FAILED",
				message: "Schema validation failed.",
			},
		]);

		const emptyIssuesIncluded = sheetToRecords(grid, {
			sheetName: "EmptyIssuesSheet",
			schema: emptyIssuesSchema,
			onInvalidRow: "include",
		});
		expect(emptyIssuesIncluded.records).toEqual([{ name: "Alice" }]);
		expect(emptyIssuesIncluded.diagnostics).toHaveLength(1);
	});
});

describe("query: recordsToSheet, workbookToJson & jsonToWorkbook", () => {
	it("converts records to a WorksheetModel and roundtrips via sheetToRecords", () => {
		const columns: TableColumnSpec<{ name: string; amount: number }>[] = [
			{ id: "name", header: "Name", subHeader: "Label" },
			{ id: "amount", header: "Amount", subHeader: "EUR", align: "right" },
		];
		const rows = [
			{ name: "Alpha", amount: 120 },
			{ name: "Beta", amount: 80 },
		];

		const sheet = recordsToSheet(rows, columns, {
			sheetName: "Budget",
			subHeaderRow: true,
			totalsRow: {
				name: "Total",
				amount: { value: 200, formula: { expression: "SUM(B3:B4)", cachedResult: 200 } },
			},
			freezeHeader: true,
			autoFilter: true,
			autoFit: true,
		});

		expect(sheet.name).toBe("Budget");
		expect(getCell(sheet, "A1")?.value).toBe("Name");
		expect(getCell(sheet, "B2")?.value).toBe("EUR");
		expect(getCell(sheet, "A3")?.value).toBe("Alpha");
		expect(getCell(sheet, "B5")?.formula?.expression).toBe("SUM(B3:B4)");
		expect(sheet.freezePane).toEqual({ rows: 2 });
		expect(sheet.autoFilterRef).toBe("A1:B4");

		const extracted = sheetToRecords(sheet, { headerRow: 1 });
		expect(extracted.records[1]).toEqual({ Name: "Alpha", Amount: 120 });
		expect(extracted.records[2]).toEqual({ Name: "Beta", Amount: 80 });
	});

	it("exports workbookToJson with sheetFilter, includeHiddenSheets, and all formatDates modes", () => {
		const midnight = new Date(Date.UTC(2026, 2, 15, 0, 0, 0));
		const timestamp = new Date(Date.UTC(2026, 2, 15, 14, 30, 0));

		const visibleSheet = makeSheet("Visible", [
			["A1", { value: "Item" }],
			["B1", { value: "Date" }],
			["A2", { value: "Day" }],
			["B2", { value: midnight, type: "date", style: { numFmt: "dd.mm.yyyy" } }],
			["A3", { value: "Time" }],
			["B3", { value: timestamp, type: "date", style: { numFmt: "yyyy-mm-dd hh:mm" } }],
		]);
		const hiddenSheet = makeSheet(
			"Hidden",
			[
				["A1", { value: "Key" }],
				["A2", { value: "Secret" }],
			],
			{ state: "hidden" },
		);
		const veryHiddenSheet = makeSheet(
			"VeryHidden",
			[
				["A1", { value: "Key" }],
				["A2", { value: "TopSecret" }],
			],
			{ state: "veryHidden" },
		);
		const otherSheet = makeSheet("Other", [
			["A1", { value: "K" }],
			["A2", { value: "V" }],
		]);

		const wb: WorkbookModel = {
			dateSystem: 1900,
			sheets: [visibleSheet, hiddenSheet, veryHiddenSheet, otherSheet],
		};

		// Default: excludes hidden & veryHidden, formatDates: "iso"
		const isoDefault = workbookToJson(wb);
		expect(Object.keys(isoDefault)).toEqual(["Visible", "Other"]);
		expect(isoDefault.Visible).toEqual([
			{ Item: "Day", Date: "2026-03-15" },
			{ Item: "Time", Date: "2026-03-15T14:30:00.000Z" },
		]);

		// includeHiddenSheets: true + array sheetFilter
		const withHidden = workbookToJson(wb, {
			includeHiddenSheets: true,
			sheetFilter: ["Hidden", "VeryHidden"],
		});
		expect(Object.keys(withHidden)).toEqual(["Hidden", "VeryHidden"]);
		expect(withHidden.Hidden).toEqual([{ Key: "Secret" }]);
		expect(withHidden.VeryHidden).toEqual([{ Key: "TopSecret" }]);

		// Predicate sheetFilter + formatDates: "date"
		const dateMode = workbookToJson(wb, {
			sheetFilter: (name) => name === "Visible",
			formatDates: "date",
		});
		expect(dateMode.Visible?.[0]?.Date).toBeInstanceOf(Date);
		expect((dateMode.Visible?.[0]?.Date as Date).getTime()).toBe(midnight.getTime());

		// formatDates: "display"
		const displayMode = workbookToJson(wb, {
			sheetFilter: ["Visible"],
			formatDates: "display",
		});
		expect(displayMode.Visible?.[0]?.Date).toBe("15.03.2026");
		expect(displayMode.Visible?.[1]?.Date).toBe("2026-03-15 14:30");
	});

	it("builds a WorkbookModel via jsonToWorkbook with flattenNested preserving Date and null", () => {
		const createdAt = new Date(Date.UTC(2026, 0, 10));
		const wb = jsonToWorkbook(
			{
				Orders: [
					{
						id: 1,
						customer: { name: "Acme", address: { city: "Berlin" } },
						meta: {},
						createdAt,
						notes: null,
					},
				],
			},
			{ flattenNested: true },
		);

		expect(wb.sheets).toHaveLength(1);
		const sheet = wb.sheets[0];
		expect(sheet?.name).toBe("Orders");

		const back = workbookToJson(wb, { formatDates: "date" });
		expect(back.Orders).toEqual([
			{
				id: 1,
				"customer.name": "Acme",
				"customer.address.city": "Berlin",
				meta: null,
				createdAt,
				notes: null,
			},
		]);
	});
});

describe("query: cleaning & row transforms", () => {
	it("fillDownRecords carries last non-empty value without mutating input", () => {
		const input = [
			{ region: "North", city: "Hamburg", sales: 10 },
			{ region: "", city: null, sales: 20 },
			{ region: "N/A", city: "Bremen", sales: 30 },
			{ region: "South", city: undefined, sales: 40 },
		];

		const filled = fillDownRecords(input, ["region", "city"], { emptyValues: ["n/a"] });

		expect(filled).toEqual([
			{ region: "North", city: "Hamburg", sales: 10 },
			{ region: "North", city: "Hamburg", sales: 20 },
			{ region: "North", city: "Bremen", sales: 30 },
			{ region: "South", city: "Bremen", sales: 40 },
		]);
		expect(input[1]?.region).toBe("");
	});

	it("canonicalizeValues supports equals, startsWith, contains, caseSensitive, and scopeField/scopeValue", () => {
		const input = [
			{ group: "Lab", label: "nitrat" },
			{ group: "Lab", label: "PH-Wert (20°C)" },
			{ group: "Lab", label: "Total Iron (Fe)" },
			{ group: "Other", label: "nitrat" },
			{ group: "Lab", label: 42 as unknown },
		];

		const result = canonicalizeValues(input, "label", [
			{
				match: "equals",
				pattern: "nitrat",
				replacement: "Nitrate",
				scopeField: "group",
				scopeValue: "Lab",
			},
			{ match: "startsWith", pattern: "pH-", replacement: "pH", caseSensitive: false },
			{ match: "contains", pattern: "Iron", replacement: "Fe", caseSensitive: true },
		]);

		expect(result.map((r) => r.label)).toEqual(["Nitrate", "pH", "Fe", "nitrat", 42]);
		expect(input[0]?.label).toBe("nitrat");
	});

	it("deriveField, mapRecords, and filterRecords (and vs or) behave immutably", () => {
		const rows = [
			{ id: 1, score: 80, active: true },
			{ id: 2, score: 40, active: true },
			{ id: 3, score: 90, active: false },
			{ id: 4, score: 20, active: false },
		];

		const derived = deriveField(rows, "passed", (r, idx) => r.score >= 50 && idx >= 0);
		expect(derived.map((r) => r.passed)).toEqual([true, false, true, false]);

		const mapped = mapRecords(rows, (r, idx) => `${String(idx)}:${String(r.id)}`);
		expect(mapped).toEqual(["0:1", "1:2", "2:3", "3:4"]);

		const highScore = (r: (typeof rows)[number]): boolean => r.score >= 50;
		const isActive = (r: (typeof rows)[number]): boolean => r.active;

		expect(filterRecords(rows, [highScore, isActive], { mode: "and" }).map((r) => r.id)).toEqual([
			1,
		]);
		expect(filterRecords(rows, [highScore, isActive], { mode: "or" }).map((r) => r.id)).toEqual([
			1, 2, 3,
		]);
		expect(filterRecords(rows, []).map((r) => r.id)).toEqual([1, 2, 3, 4]);
	});
});

describe("query: sortRecords", () => {
	it("supports 3-state asc/desc/none and Missing Last in both asc and desc", () => {
		const rows = [
			{ id: "a", val: null as number | null | undefined },
			{ id: "b", val: 30 },
			{ id: "c", val: undefined },
			{ id: "d", val: 10 },
			{ id: "e", val: NaN },
			{ id: "f", val: 20 },
		];

		const noneSorted = sortRecords(rows, { field: "val", direction: "none" });
		expect(noneSorted.map((r) => r.id)).toEqual(["a", "b", "c", "d", "e", "f"]);
		expect(noneSorted).not.toBe(rows);

		const asc = sortRecords(rows, { field: "val", direction: "asc" });
		expect(asc.slice(0, 3).map((r) => r.val)).toEqual([10, 20, 30]);
		expect(asc.slice(3).map((r) => r.id)).toEqual(["a", "c", "e"]);

		const desc = sortRecords(rows, { field: "val", direction: "desc" });
		expect(desc.slice(0, 3).map((r) => r.val)).toEqual([30, 20, 10]);
		expect(desc.slice(3).map((r) => r.id)).toEqual(["a", "c", "e"]);
	});

	it("supports natural sorting ('Item 2' < 'Item 10') and HybridValue/thresholdOptions sorting ('< 0,2' < 0.5)", () => {
		const items = [{ name: "Item 10" }, { name: "Item 2" }, { name: "Item 1" }];
		expect(
			sortRecords(items, { field: "name", direction: "asc", natural: true }).map((r) => r.name),
		).toEqual(["Item 1", "Item 2", "Item 10"]);
		expect(
			sortRecords(items, { field: "name", direction: "desc", natural: true }).map((r) => r.name),
		).toEqual(["Item 10", "Item 2", "Item 1"]);

		const measurements = [
			{ id: "m1", reading: 0.5 as unknown },
			{ id: "m2", reading: null as unknown },
			{ id: "m3", reading: "< 0,2" as unknown },
			{ id: "m4", reading: 0.2 as unknown },
		];

		const byThresholdAsc = sortRecords(measurements, {
			field: "reading",
			direction: "asc",
			thresholdOptions: { belowMultiplier: 0.5 },
		});
		expect(byThresholdAsc.map((r) => r.id)).toEqual(["m3", "m4", "m1", "m2"]);

		const byThresholdDesc = sortRecords(measurements, {
			field: "reading",
			direction: "desc",
			thresholdOptions: { belowMultiplier: 0.5 },
		});
		expect(byThresholdDesc.map((r) => r.id)).toEqual(["m1", "m4", "m3", "m2"]);

		// Direct HybridValue objects without thresholdOptions
		const hybrids = [
			{ id: "h1", v: parseThresholdValue(0.5) },
			{ id: "h2", v: parseThresholdValue("< 0,2") },
			{ id: "h3", v: parseThresholdValue(null) },
		];
		expect(sortRecords(hybrids, { field: "v", direction: "asc" }).map((r) => r.id)).toEqual([
			"h2",
			"h1",
			"h3",
		]);
	});
});

describe("query: pivotRecords & unpivotRecords", () => {
	it("computes all 12 AGGREGATION_KINDS plus custom reducer across multi-key groupBy", () => {
		const rows = [
			{ dept: "Eng", region: "EU", val: 10, weight: 1, denom: 100, tag: "first-a", ok: true },
			{ dept: "Eng", region: "EU", val: 20, weight: 3, denom: 100, tag: "", ok: false },
			{ dept: "Eng", region: "EU", val: 40, weight: 1, denom: 200, tag: "last-a", ok: true },
			{ dept: "Eng", region: "EU", val: null as number | null, weight: 2, denom: 0, tag: null, ok: false },
			{ dept: "Sales", region: "US", val: 50, weight: 2, denom: 50, tag: "only", ok: true },
		];

		const pivoted = pivotRecords(rows, {
			groupBy: ["dept", "region"],
			measures: [
				{ name: "sum", field: "val", aggregation: "sum" },
				{ name: "avg", field: "val", aggregation: "avg" },
				{ name: "wAvg", field: "val", weightField: "weight", aggregation: "weightedAvg" },
				{ name: "min", field: "val", aggregation: "min" },
				{ name: "max", field: "val", aggregation: "max" },
				{ name: "countRows", aggregation: "count" },
				{ name: "countNonEmpty", field: "val", aggregation: "count" },
				{ name: "countOk", aggregation: "countIf", predicate: (r) => r.ok },
				{ name: "median", field: "val", aggregation: "median" },
				{ name: "p75", field: "val", aggregation: "percentile", percentile: 75 },
				{ name: "rate", field: "val", denominatorField: "denom", aggregation: "rate" },
				{ name: "firstTag", field: "tag", aggregation: "first" },
				{ name: "lastTag", field: "tag", aggregation: "last" },
				{
					name: "custom",
					field: "val",
					aggregation: (values, groupRows) => `${String(values.length)}/${String(groupRows.length)}`,
				},
			],
		});

		expect(pivoted).toHaveLength(2);
		const eng = pivoted[0];
		expect(eng).toMatchObject({
			dept: "Eng",
			region: "EU",
			sum: 70,
			min: 10,
			max: 40,
			countRows: 4,
			countNonEmpty: 3,
			countOk: 2,
			median: 20,
			p75: 30,
			firstTag: "first-a",
			lastTag: "last-a",
			custom: "4/4",
		});
		expect(eng?.avg).toBeCloseTo(70 / 3, 10);
		// weightedAvg = (10*1 + 20*3 + 40*1) / (1 + 3 + 1) = 110 / 5 = 22
		expect(eng?.wAvg).toBe(22);
		// rate = (10 + 20 + 40) / (100 + 100 + 200 + 0) = 70 / 400 = 0.175
		expect(eng?.rate).toBeCloseTo(0.175, 10);

		const sales = pivoted[1];
		expect(sales).toMatchObject({
			dept: "Sales",
			region: "US",
			sum: 50,
			avg: 50,
			wAvg: 50,
			min: 50,
			max: 50,
			countRows: 1,
			countNonEmpty: 1,
			countOk: 1,
			median: 50,
			p75: 50,
			rate: 1,
			firstTag: "only",
			lastTag: "only",
		});
	});

	it("supports all 4 timeBucket granularities (day, month, quarter, year)", () => {
		const rows = [
			{ dt: "2026-01-15", v: 10 },
			{ dt: "2026-01-20", v: 5 },
			{ dt: "2026-03-02", v: 20 },
			{ dt: "2026-07-10", v: 30 },
		];

		const byDay = pivotRecords(rows, {
			timeBucket: { field: "dt", bucket: "day", outputField: "bucket" },
			measures: [{ name: "total", field: "v", aggregation: "sum" }],
		});
		expect(byDay.map((r) => r.bucket)).toEqual([
			"2026-01-15",
			"2026-01-20",
			"2026-03-02",
			"2026-07-10",
		]);

		const byMonth = pivotRecords(rows, {
			timeBucket: { field: "dt", bucket: "month", outputField: "bucket" },
			measures: [{ name: "total", field: "v", aggregation: "sum" }],
		});
		expect(byMonth).toEqual([
			{ bucket: "2026-01", total: 15 },
			{ bucket: "2026-03", total: 20 },
			{ bucket: "2026-07", total: 30 },
		]);

		const byQuarter = pivotRecords(rows, {
			timeBucket: { field: "dt", bucket: "quarter", outputField: "bucket" },
			measures: [{ name: "total", field: "v", aggregation: "sum" }],
		});
		expect(byQuarter).toEqual([
			{ bucket: "2026-Q1", total: 35 },
			{ bucket: "2026-Q3", total: 30 },
		]);

		const byYear = pivotRecords(rows, {
			timeBucket: { field: "dt", bucket: "year", outputField: "bucket" },
			measures: [{ name: "total", field: "v", aggregation: "sum" }],
		});
		expect(byYear).toEqual([{ bucket: "2026", total: 65 }]);
	});

	it("handles all 5 thresholdPolicy modes (ignore, bound, half, zero, scaled)", () => {
		const rows = [
			{ group: "A", reading: 10 as unknown },
			{ group: "A", reading: "< 2,0" as unknown },
		];

		const pivoted = pivotRecords(rows, {
			groupBy: ["group"],
			measures: [
				{ name: "ignore", field: "reading", aggregation: "sum", thresholdPolicy: "ignore" },
				{ name: "bound", field: "reading", aggregation: "sum", thresholdPolicy: "bound" },
				{ name: "half", field: "reading", aggregation: "sum", thresholdPolicy: "half" },
				{ name: "zero", field: "reading", aggregation: "avg", thresholdPolicy: "zero" },
				{
					name: "scaled",
					field: "reading",
					aggregation: "sum",
					thresholdPolicy: "scaled",
					thresholdOptions: { belowMultiplier: 0.2 },
				},
			],
		});

		expect(pivoted[0]).toMatchObject({
			group: "A",
			ignore: 10,
			bound: 12,
			half: 11,
			zero: 5, // avg(10, 0) = 5
			scaled: 10.4, // 10 + 2.0 * 0.2
		});
	});

	it("unpivotRecords melts wide rows to long form with optional skipEmpty", () => {
		const wide = [
			{ station: "S1", jan: 10, feb: null as number | null, mar: 30 },
			{ station: "S2", jan: 5, feb: 15, mar: "" as unknown },
		];

		const full = unpivotRecords(wide, {
			idFields: ["station"],
			variableField: "month",
			valueField: "reading",
		});
		expect(full).toHaveLength(6);
		expect(full[1]).toEqual({ station: "S1", month: "feb", reading: null });

		const compact = unpivotRecords(wide, {
			idFields: ["station"],
			valueFields: ["jan", "feb", "mar"],
			variableField: "month",
			valueField: "reading",
			skipEmpty: true,
		});
		expect(compact).toEqual([
			{ station: "S1", month: "jan", reading: 10 },
			{ station: "S1", month: "mar", reading: 30 },
			{ station: "S2", month: "jan", reading: 5 },
			{ station: "S2", month: "feb", reading: 15 },
		]);
	});

	it("handles pivotRecords edge cases: NaN/boundary percentiles, 0 weight/denominator, invalid/null timeBucket dates, and empty records", () => {
		const rows = [
			{ grp: "G", val: 0, weight: 0, denom: 0 },
			{ grp: "G", val: 100, weight: 0, denom: 0 },
		];

		const pivoted = pivotRecords(rows, {
			groupBy: ["grp"],
			measures: [
				{ name: "pNaN", field: "val", aggregation: "percentile", percentile: NaN },
				{ name: "p0", field: "val", aggregation: "percentile", percentile: 0 },
				{ name: "p1", field: "val", aggregation: "percentile", percentile: 1 },
				{ name: "p100", field: "val", aggregation: "percentile", percentile: 100 },
				{ name: "p001", field: "val", aggregation: "percentile", percentile: 0.01 },
				{ name: "wAvgZero", field: "val", weightField: "weight", aggregation: "weightedAvg" },
				{ name: "rateZero", field: "val", denominatorField: "denom", aggregation: "rate" },
			],
		});

		expect(pivoted).toEqual([
			{
				grp: "G",
				pNaN: null,
				p0: 0,
				p1: 100,
				p100: 100,
				p001: 1,
				wAvgZero: null,
				rateZero: null,
			},
		]);

		const datedRows = [
			{ dt: null as string | null, v: 5 },
			{ dt: "not-a-date", v: 7 },
			{ dt: "2026-04-12", v: 10 },
		];
		const bucketed = pivotRecords(datedRows, {
			timeBucket: { field: "dt", bucket: "month", outputField: "month" },
			measures: [{ name: "total", field: "v", aggregation: "sum" }],
		});
		expect(bucketed).toEqual([
			{ month: null, total: 12 },
			{ month: "2026-04", total: 10 },
		]);

		const emptyResult = pivotRecords<Record<string, unknown>>([], {
			groupBy: ["grp"],
			measures: [{ name: "total", field: "val", aggregation: "sum" }],
		});
		expect(emptyResult).toEqual([]);
	});
});

describe("query: window analytics, alignment, joins & dedupe", () => {
	it("computeRunningTotals computes global and grouped cumulative sums", () => {
		const rows = [
			{ group: "A", amount: 10 },
			{ group: "B", amount: 5 },
			{ group: "A", amount: 15 },
			{ group: "B", amount: 20 },
		];

		const globalTotals = computeRunningTotals(rows, {
			valueField: "amount",
			outputField: "cum",
		});
		expect(globalTotals.map((r) => r.cum)).toEqual([10, 15, 30, 50]);

		const groupedTotals = computeRunningTotals(rows, {
			valueField: "amount",
			outputField: "cum",
			groupBy: ["group"],
		});
		expect(groupedTotals.map((r) => r.cum)).toEqual([10, 5, 25, 25]);
	});

	it("computePeriodDeltas computes absolute & relative deltas, handles zero previous, and preserves input order", () => {
		// Deliberately unsorted periods across two groups
		const rows = [
			{ id: "a3", group: "A", period: "2026-03", val: 30 },
			{ id: "a1", group: "A", period: "2026-01", val: 0 },
			{ id: "b2", group: "B", period: "2026-02", val: 150 },
			{ id: "a2", group: "A", period: "2026-02", val: 20 },
			{ id: "b1", group: "B", period: "2026-01", val: 100 },
		];

		const result = computePeriodDeltas(rows, {
			valueField: "val",
			periodField: "period",
			groupBy: ["group"],
		});

		// Input order preserved
		expect(result.map((r) => r.id)).toEqual(["a3", "a1", "b2", "a2", "b1"]);
		// a3: prev=20 -> abs=10, rel=0.5
		expect(result[0]?.deltaAbs).toBe(10);
		expect(result[0]?.deltaRel).toBe(0.5);
		// a1: first in group -> null, null
		expect(result[1]?.deltaAbs).toBeNull();
		expect(result[1]?.deltaRel).toBeNull();
		// b2: prev=100 -> abs=50, rel=0.5
		expect(result[2]?.deltaAbs).toBe(50);
		expect(result[2]?.deltaRel).toBe(0.5);
		// a2: prev=0 -> abs=20, rel=null (zero base)
		expect(result[3]?.deltaAbs).toBe(20);
		expect(result[3]?.deltaRel).toBeNull();
		// b1: first in group -> null, null
		expect(result[4]?.deltaAbs).toBeNull();
		expect(result[4]?.deltaRel).toBeNull();
	});

	it("rankRecords supports competition vs dense ties, groupBy, and missing-last", () => {
		const rows = [
			{ group: "G1", name: "a", score: 100 as number | null },
			{ group: "G1", name: "b", score: 80 },
			{ group: "G1", name: "c", score: 80 },
			{ group: "G1", name: "d", score: 60 },
			{ group: "G1", name: "e", score: null },
			{ group: "G2", name: "x", score: 50 },
			{ group: "G2", name: "y", score: 70 },
		];

		const comp = rankRecords(rows, {
			valueField: "score",
			outputField: "rank",
			direction: "desc",
			groupBy: ["group"],
			tiePolicy: "competition",
		});
		expect(comp.map((r) => r.rank)).toEqual([1, 2, 2, 4, 5, 2, 1]);

		const dense = rankRecords(rows, {
			valueField: "score",
			outputField: "rank",
			direction: "desc",
			groupBy: ["group"],
			tiePolicy: "dense",
		});
		expect(dense.map((r) => r.rank)).toEqual([1, 2, 2, 3, 4, 2, 1]);
	});

	it("alignSeriesByKey aligns sparse series onto a unified null-padded axis", () => {
		const aligned = alignSeriesByKey(
			[
				{
					id: "siteA",
					records: [
						{ month: "2026-01", v: 10 },
						{ month: "2026-03", v: 30 },
					],
				},
				{
					id: "siteB",
					records: [
						{ month: "2026-02", v: 20 },
						{ month: "2026-03", v: 35 },
					],
				},
			],
			{ keyField: "month", valueField: "v" },
		);

		expect(aligned.keys).toEqual(["2026-01", "2026-02", "2026-03"]);
		expect(aligned.series).toEqual([
			{ id: "siteA", values: [10, null, 30] },
			{ id: "siteB", values: [null, 20, 35] },
		]);
	});

	it("joinRecords supports left, inner, outer, composite keys, and rightPrefix", () => {
		const left = [
			{ org: "A", year: 2025, rev: 100 },
			{ org: "B", year: 2025, rev: 200 },
		];
		const right = [
			{ org: "A", year: 2025, rev: 90, target: 110 },
			{ org: "C", year: 2025, rev: 300, target: 310 },
		];

		const leftJoined = joinRecords(left, right, {
			on: ["org", "year"],
			mode: "left",
			rightPrefix: "plan_",
		});
		expect(leftJoined).toEqual([
			{ org: "A", year: 2025, rev: 100, plan_rev: 90, plan_target: 110 },
			{ org: "B", year: 2025, rev: 200 },
		]);

		const innerJoined = joinRecords(left, right, {
			on: ["org", "year"],
			mode: "inner",
			rightPrefix: "plan_",
		});
		expect(innerJoined).toEqual([
			{ org: "A", year: 2025, rev: 100, plan_rev: 90, plan_target: 110 },
		]);

		const outerJoined = joinRecords(left, right, {
			on: ["org", "year"],
			mode: "outer",
			rightPrefix: "plan_",
		});
		expect(outerJoined).toEqual([
			{ org: "A", year: 2025, rev: 100, plan_rev: 90, plan_target: 110 },
			{ org: "B", year: 2025, rev: 200 },
			{ org: "C", year: 2025, plan_rev: 300, plan_target: 310 },
		]);
	});

	it("joinRecords never cross-joins null, undefined, or NaN keys across inner/left/outer and supports asymmetric keys & 1-to-many", () => {
		const left = [
			{ id: "A" as string | number | null | undefined, lVal: 1 },
			{ id: null, lVal: 2 },
			{ id: undefined, lVal: 3 },
			{ id: NaN, lVal: 4 },
		];
		const right = [
			{ id: "A" as string | number | null | undefined, rVal: 10 },
			{ id: null, rVal: 20 },
			{ id: undefined, rVal: 30 },
			{ id: NaN, rVal: 40 },
		];

		const inner = joinRecords(left, right, { on: "id", mode: "inner" });
		expect(inner).toEqual([{ id: "A", lVal: 1, rVal: 10 }]);

		const leftJoined = joinRecords(left, right, { on: "id", mode: "left" });
		expect(leftJoined).toHaveLength(4);
		expect(leftJoined[0]).toEqual({ id: "A", lVal: 1, rVal: 10 });
		expect(leftJoined[1]).toEqual({ id: null, lVal: 2 });
		expect(leftJoined[2]).toEqual({ id: undefined, lVal: 3 });
		expect(Number.isNaN(leftJoined[3]?.id as number)).toBe(true);
		expect(leftJoined[3]?.rVal).toBeUndefined();

		const outerJoined = joinRecords(left, right, { on: "id", mode: "outer" });
		expect(outerJoined).toHaveLength(7);
		expect(outerJoined[0]).toEqual({ id: "A", lVal: 1, rVal: 10 });
		expect(outerJoined.slice(1, 4).every((row) => row.rVal === undefined)).toBe(true);
		expect(outerJoined.slice(4).every((row) => row.lVal === undefined)).toBe(true);
		expect(outerJoined.slice(4).map((row) => row.rVal)).toEqual([20, 30, 40]);

		// Asymmetric { left, right } key mapping + 1-to-many join
		const orders = [
			{ customerId: "C1", orderNo: "O-1" },
			{ customerId: "C2", orderNo: "O-2" },
		];
		const invoices = [
			{ custCode: "C1", invNo: "I-101" },
			{ custCode: "C1", invNo: "I-102" },
			{ custCode: "C3", invNo: "I-103" },
		];

		const asymmetric = joinRecords(orders, invoices, {
			on: { left: ["customerId"], right: ["custCode"] },
			mode: "outer",
		});
		expect(asymmetric).toEqual([
			{ customerId: "C1", orderNo: "O-1", custCode: "C1", invNo: "I-101" },
			{ customerId: "C1", orderNo: "O-1", custCode: "C1", invNo: "I-102" },
			{ customerId: "C2", orderNo: "O-2" },
			{ custCode: "C3", invNo: "I-103", customerId: "C3" },
		]);
	});

	it("dedupeRecords honors keep: 'first' vs 'last'", () => {
		const rows = [
			{ id: "k1", version: 1 },
			{ id: "k2", version: 1 },
			{ id: "k1", version: 2 },
			{ id: "k2", version: 3 },
		];

		expect(dedupeRecords(rows, "id", { keep: "first" })).toEqual([
			{ id: "k1", version: 1 },
			{ id: "k2", version: 1 },
		]);
		expect(dedupeRecords(rows, "id", { keep: "last" })).toEqual([
			{ id: "k1", version: 2 },
			{ id: "k2", version: 3 },
		]);
	});
});

describe("query: projectTable", () => {
	it("produces TableProjection with formatCellDisplay parity, custom format/status, footer, and freeze panes", () => {
		interface LabRow {
			id: string;
			name: string;
			value: number | string;
			measuredAt: Date;
		}

		const dt = new Date(Date.UTC(2026, 4, 1));
		const rows: LabRow[] = [
			{ id: "r1", name: "Lead", value: 12.345, measuredAt: dt },
			{ id: "r2", name: "Cadmium", value: "< 0,5", measuredAt: dt },
		];

		const columns: TableColumnSpec<LabRow>[] = [
			{ id: "name", header: "Parameter", subHeader: "Name", align: "left", width: 18 },
			{
				id: "value",
				header: "Reading",
				subHeader: "mg/L",
				align: "right",
				numFmt: "0.00",
				status: (v) => (typeof v === "number" && v > 10 ? "negative" : "base"),
			},
			{
				id: "measuredAt",
				header: "Date",
				align: "center",
				numFmt: "yyyy-mm-dd",
			},
			{
				id: "tag",
				header: "Custom",
				accessor: (r) => r.name,
				format: (v, r) => `${r.id}:${String(v)}`,
			},
		];

		const projection = projectTable(rows, {
			columns,
			keyField: "id",
			footer: { name: "Total", value: 12.345 },
			frozenRows: 2,
			frozenCols: 1,
		});

		expect(projection.columns).toEqual([
			{ id: "name", label: "Parameter", subLabel: "Name", align: "left", width: 18 },
			{ id: "value", label: "Reading", subLabel: "mg/L", align: "right" },
			{ id: "measuredAt", label: "Date", align: "center" },
			{ id: "tag", label: "Custom", align: "left" },
		]);
		expect(projection.headers).toEqual(["Parameter", "Reading", "Date", "Custom"]);
		expect(projection.subHeaders).toEqual(["Name", "mg/L", "", ""]);
		expect(projection.frozenRows).toBe(2);
		expect(projection.frozenCols).toBe(1);

		expect(projection.rows).toHaveLength(2);
		expect(projection.rows[0]?.key).toBe("r1");
		// formatCellDisplay parity when col.format is omitted
		const expectedNumDisplay = formatCellDisplay(12.345, { numFmt: "0.00" });
		const expectedDateDisplay = formatCellDisplay(dt, { numFmt: "yyyy-mm-dd" });
		expect(projection.rows[0]?.cells[1]).toMatchObject({
			colId: "value",
			raw: 12.345,
			display: expectedNumDisplay,
			numeric: 12.345,
			sortValue: 12.345,
			status: "negative",
			align: "right",
		});
		expect(projection.rows[0]?.cells[2]?.display).toBe(expectedDateDisplay);
		expect(projection.rows[0]?.cells[3]?.display).toBe("r1:Lead");

		// Threshold string cell gets sortValue from parseThresholdValue and custom status callback
		expect(projection.rows[1]?.cells[1]?.numeric).toBeNull();
		expect(projection.rows[1]?.cells[1]?.sortValue).toBeLessThan(0.5);
		expect(projection.rows[1]?.cells[1]?.status).toBe("base");

		// Footer uses formatCellDisplay without row-dependent formatter
		expect(projection.footer).toHaveLength(4);
		expect(projection.footer?.[0]?.display).toBe("Total");
		expect(projection.footer?.[1]?.display).toBe(expectedNumDisplay);

		// Verify builder sanity (smoke check that builder imports cleanly alongside query)
		const wb = createWorkbookBuilder();
		wb.sheet("Summary", (s) => {
			s.addTable({ columns, rows });
		});
		expect(wb.toModel().sheets).toHaveLength(1);
	});
});
