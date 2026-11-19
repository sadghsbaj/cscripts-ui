import { describe, expect, it } from "vitest";
import { setCell } from "./coords.ts";
import type { CellModel, WorkbookModel, WorksheetModel } from "./types.ts";
import { validateSheetRules } from "./validate.ts";

function makeSheet(name: string, entries: ReadonlyArray<[string, CellModel]>): WorksheetModel {
	const sheet: WorksheetModel = {
		name,
		cells: new Map<string, CellModel>(),
	};
	for (const [ref, cell] of entries) {
		setCell(sheet, ref, cell);
	}
	return sheet;
}

describe("validate: validateSheetRules", () => {
	it("enforces required and unique (case-insensitive and case-sensitive) rules", () => {
		const sheet = makeSheet("Codes", [
			["A1", { value: "Code" }],
			["A2", { value: "ABC" }],
			["A3", { value: "  abc " }],
			["A4", { value: " ".repeat(3) }],
			["A5", { value: "ABC" }],
		]);

		const insensitive = validateSheetRules(sheet, [
			{ kind: "required", col: "A", startRow: 2, endRow: 5 },
			{ kind: "unique", col: 0, startRow: 2, endRow: 5, caseSensitive: false },
		]);

		expect(insensitive.valid).toBe(false);
		expect(insensitive.errorCount).toBe(3);
		expect(insensitive.cautionCount).toBe(0);
		expect(insensitive.issues).toEqual([
			{
				severity: "negative",
				sheet: "Codes",
				ref: "A4",
				row: 4,
				col: 0,
				code: "REQUIRED",
				message: "Cell A4 is required.",
			},
			{
				severity: "negative",
				sheet: "Codes",
				ref: "A3",
				row: 3,
				col: 0,
				code: "DUPLICATE_VALUE",
				message: 'Duplicate value "  abc " at A3 (first seen at A2).',
			},
			{
				severity: "negative",
				sheet: "Codes",
				ref: "A5",
				row: 5,
				col: 0,
				code: "DUPLICATE_VALUE",
				message: 'Duplicate value "ABC" at A5 (first seen at A2).',
			},
		]);

		const sensitive = validateSheetRules(sheet, [
			{ kind: "unique", col: "A", startRow: 2, endRow: 5, caseSensitive: true },
		]);
		expect(sensitive.errorCount).toBe(1);
		expect(sensitive.issues[0]).toMatchObject({
			ref: "A5",
			row: 5,
			col: 0,
			code: "DUPLICATE_VALUE",
		});
	});

	it("enforces range (min/max) and sumEquals (within and outside tolerance)", () => {
		const sheet = makeSheet("Numbers", [
			["A1", { value: "Val" }],
			["A2", { value: -5 }],
			["A3", { value: 0 }],
			["A4", { value: 100 }],
			["A5", { value: 105 }],
			["A6", { value: "text" }],
			["B2", { value: 10.1 }],
			["B3", { value: 20.2 }],
			["B4", { value: 30.3 }],
			["B5", { value: 60.6000001 }],
			["B6", { value: 61 }],
		]);

		const report = validateSheetRules(sheet, [
			{ kind: "range", col: "A", startRow: 2, endRow: 6, min: 0, max: 100 },
			{ kind: "sumEquals", sourceRange: "B2:B4", targetRef: "B5", tolerance: 1e-4 },
			{
				kind: "sumEquals",
				sourceRange: "B2:B4",
				targetRef: "B6",
				tolerance: 1e-4,
				severity: "caution",
			},
		]);

		expect(report.valid).toBe(false);
		expect(report.errorCount).toBe(2);
		expect(report.cautionCount).toBe(1);
		expect(report.issues.map((i) => ({ ref: i.ref, code: i.code, severity: i.severity }))).toEqual([
			{ ref: "A2", code: "OUT_OF_RANGE", severity: "negative" },
			{ ref: "A5", code: "OUT_OF_RANGE", severity: "negative" },
			{ ref: "B6", code: "SUM_MISMATCH", severity: "caution" },
		]);
	});

	it("enforces crossSheetEquals across two sheets and handles missing sheets", () => {
		const wb: WorkbookModel = {
			dateSystem: 1900,
			sheets: [
				makeSheet("Summary", [
					["B2", { value: 100.0001 }],
					["B3", { value: 50 }],
				]),
				makeSheet("Detail", [
					["C10", { value: 100 }],
					["C11", { value: 55 }],
				]),
			],
		};

		const report = validateSheetRules(wb, [
			{
				kind: "crossSheetEquals",
				leftSheet: "Summary",
				leftRef: "B2",
				rightSheet: "Detail",
				rightRef: "C10",
				tolerance: 1e-3,
			},
			{
				kind: "crossSheetEquals",
				leftSheet: "Summary",
				leftRef: "B3",
				rightSheet: "Detail",
				rightRef: "C11",
			},
			{
				kind: "crossSheetEquals",
				leftSheet: "Summary",
				leftRef: "B2",
				rightSheet: "MissingSheet",
				rightRef: "A1",
			},
		]);

		expect(report.valid).toBe(false);
		expect(report.errorCount).toBe(2);
		expect(report.issues[0]).toMatchObject({
			severity: "negative",
			sheet: "Summary",
			ref: "B3",
			row: 3,
			col: 1,
			code: "CROSS_SHEET_MISMATCH",
		});
		expect(report.issues[1]).toMatchObject({
			severity: "negative",
			sheet: "MissingSheet",
			code: "SHEET_NOT_FOUND",
		});
	});

	it("enforces cutoffReached across all 4 operators (>=, >, <=, <)", () => {
		const sheet = makeSheet("Limits", [
			["A2", { value: 9 }],
			["A3", { value: 10 }],
			["A4", { value: 11 }],
		]);

		const gte = validateSheetRules(sheet, [
			{ kind: "cutoffReached", col: "A", startRow: 2, endRow: 4, cutoff: 10, operator: ">=" },
		]);
		expect(gte.issues.map((i) => i.ref)).toEqual(["A3", "A4"]);

		const gt = validateSheetRules(sheet, [
			{ kind: "cutoffReached", col: "A", startRow: 2, endRow: 4, cutoff: 10, operator: ">" },
		]);
		expect(gt.issues.map((i) => i.ref)).toEqual(["A4"]);

		const lte = validateSheetRules(sheet, [
			{ kind: "cutoffReached", col: "A", startRow: 2, endRow: 4, cutoff: 10, operator: "<=" },
		]);
		expect(lte.issues.map((i) => i.ref)).toEqual(["A2", "A3"]);

		const lt = validateSheetRules(sheet, [
			{ kind: "cutoffReached", col: "A", startRow: 2, endRow: 4, cutoff: 10, operator: "<" },
		]);
		expect(lt.issues.map((i) => i.ref)).toEqual(["A2"]);
		expect(lt.issues[0]).toMatchObject({
			severity: "negative",
			sheet: "Limits",
			ref: "A2",
			row: 2,
			col: 0,
			code: "CUTOFF_REACHED",
		});
	});

	it("enforces noZeroBaseWithPositiveTarget and custom rules, and computes valid/cautionCount accurately", () => {
		const sheet = makeSheet("Targets", [
			["A2", { value: 0 }],
			["B2", { value: 15 }], // invalid: zero base, positive target
			["A3", { value: null }],
			["B3", { value: 5 }], // invalid: missing base, positive target
			["A4", { value: 0 }],
			["B4", { value: 0 }], // ok
			["A5", { value: 10 }],
			["B5", { value: 20 }], // ok
		]);

		// Caution-only report should have valid === true
		const cautionReport = validateSheetRules(sheet, [
			{
				kind: "noZeroBaseWithPositiveTarget",
				baseCol: "A",
				targetCol: "B",
				startRow: 2,
				endRow: 5,
				severity: "caution",
			},
			{
				kind: "custom",
				code: "CUSTOM_CHECK",
				severity: "caution",
				validate: ({ sheet: s }) => [
					{
						severity: "caution",
						sheet: s.name,
						ref: "B5",
						row: 5,
						col: 1,
						code: "",
						message: "Double-check high target",
					},
				],
			},
		]);

		expect(cautionReport.valid).toBe(true);
		expect(cautionReport.errorCount).toBe(0);
		expect(cautionReport.cautionCount).toBe(3);
		expect(cautionReport.issues[0]).toMatchObject({
			severity: "caution",
			sheet: "Targets",
			ref: "B2",
			row: 2,
			col: 1,
			code: "ZERO_BASE_POSITIVE_TARGET",
		});
		expect(cautionReport.issues[1]).toMatchObject({
			severity: "caution",
			sheet: "Targets",
			ref: "B3",
			row: 3,
			col: 1,
			code: "ZERO_BASE_POSITIVE_TARGET",
		});
		expect(cautionReport.issues[2]).toEqual({
			severity: "caution",
			sheet: "Targets",
			ref: "B5",
			row: 5,
			col: 1,
			code: "CUSTOM_CHECK",
			message: "Double-check high target",
		});
	});

	it("evaluates sumEquals over huge ranges in O(populated cells), ignores non-numeric/threshold cells, and distinguishes non-numeric vs empty targetRef", () => {
		const sheet = makeSheet("HugeSum", [
			["A1", { value: 12.5 }],
			["B2", { value: "27,5" }],
			["C3", { value: "< 0,2" }],
			["D4", { value: "not-a-number" }],
			["Z50000", { value: 10 }],
			["AA1", { value: "TBD" }], // non-numeric target
			// AB1 is empty
		]);

		const report = validateSheetRules(sheet, [
			// Huge full-sheet range: sum of numeric cells = 12.5 + 27.5 + 10 = 50
			{ kind: "sumEquals", sourceRange: "A1:XFD1048576", targetRef: "AA1" },
			{ kind: "sumEquals", sourceRange: "A1:XFD1048576", targetRef: "AB1" },
		]);

		expect(report.valid).toBe(false);
		expect(report.errorCount).toBe(2);
		expect(report.issues[0]).toMatchObject({
			ref: "AA1",
			code: "SUM_MISMATCH",
			message: 'Sum of A1:XFD1048576 (50) does not match AA1 (non-numeric "TBD").',
		});
		expect(report.issues[1]).toMatchObject({
			ref: "AB1",
			code: "SUM_MISMATCH",
			message: "Sum of A1:XFD1048576 (50) does not match AB1 (empty).",
		});
		expect(report.issues[0]?.message).not.toBe(report.issues[1]?.message);

		// Matching target outside the huge source range passes cleanly
		const matchingSheet = makeSheet("HugeSumOk", [
			["A1", { value: 25 }],
			["B1", { value: "< 0,5" }],
			["C1", { value: "label" }],
			["XFD1048575", { value: 75 }],
			["A1048576", { value: 100 }],
		]);
		const okReport = validateSheetRules(matchingSheet, [
			{ kind: "sumEquals", sourceRange: "A1:XFD1048575", targetRef: "A1048576" },
		]);
		expect(okReport.valid).toBe(true);
		expect(okReport.issues).toEqual([]);
	});

	it("clamps startRow: 0 cleanly to row 1 without throwing INVALID_CELL_REF", () => {
		const sheet = makeSheet("ZeroStart", [
			["A1", { value: null }],
			["A2", { value: 50 }],
			["B1", { value: 0 }],
			["C1", { value: 5 }],
		]);

		const report = validateSheetRules(sheet, [
			{ kind: "required", col: "A", startRow: 0, endRow: 2 },
			{ kind: "unique", col: "A", startRow: 0, endRow: 2 },
			{ kind: "range", col: "A", startRow: 0, endRow: 2, min: 0, max: 10 },
			{ kind: "cutoffReached", col: "A", startRow: 0, endRow: 2, cutoff: 40, operator: ">=" },
			{ kind: "noZeroBaseWithPositiveTarget", baseCol: "B", targetCol: "C", startRow: 0, endRow: 2 },
		]);

		expect(report.valid).toBe(false);
		expect(report.issues.map((i) => ({ ref: i.ref, row: i.row, code: i.code }))).toEqual([
			{ ref: "A1", row: 1, code: "REQUIRED" },
			{ ref: "A2", row: 2, code: "OUT_OF_RANGE" },
			{ ref: "A2", row: 2, code: "CUTOFF_REACHED" },
			{ ref: "C1", row: 1, code: "ZERO_BASE_POSITIVE_TARGET" },
		]);
	});
});
