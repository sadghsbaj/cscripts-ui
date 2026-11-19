import { describe, expect, it } from "vitest";
import { setCell } from "./coords.ts";
import { diffSheets, diffWorkbooks } from "./diff.ts";
import type { CellModel, WorkbookModel, WorksheetModel } from "./types.ts";

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

describe("diff: diffSheets (cell mode)", () => {
	it("detects addedCells, removedCells, and modifiedCells including Date equality/inequality", () => {
		const d1 = new Date(Date.UTC(2026, 0, 15));
		const d1Copy = new Date(Date.UTC(2026, 0, 15));
		const d2 = new Date(Date.UTC(2026, 0, 16));

		const base = makeSheet("Data", [
			["A1", { value: "Keep" }],
			["B1", { value: 100 }],
			["C1", { value: "RemoveMe" }],
			["A2", { value: d1, type: "date" }],
			["B2", { value: d1, type: "date" }],
		]);
		const target = makeSheet("Data", [
			["A1", { value: "Keep" }],
			["B1", { value: 150 }],
			["D1", { value: "Added" }],
			["A2", { value: d1Copy, type: "date" }],
			["B2", { value: d2, type: "date" }],
		]);

		const diff = diffSheets(base, target);

		expect(diff.mode).toBe("cell");
		expect(diff.sheetName).toBe("Data");
		expect(diff.hasChanges).toBe(true);

		expect(diff.addedCells).toEqual([
			{ kind: "added", ref: "D1", row: 0, col: 3, after: "Added" },
		]);
		expect(diff.removedCells).toEqual([
			{ kind: "removed", ref: "C1", row: 0, col: 2, before: "RemoveMe" },
		]);
		expect(diff.modifiedCells).toEqual([
			{ kind: "modified", ref: "B1", row: 0, col: 1, before: 100, after: 150 },
			{ kind: "modified", ref: "B2", row: 1, col: 1, before: d1, after: d2 },
		]);
	});

	it("respects ignoreWhitespace, compareFormulas, and compareStyles", () => {
		const base = makeSheet("Metrics", [
			["A1", { value: "  Hello   World  " }],
			["B1", { value: 10, formula: { expression: "SUM(A2:A3)", cachedResult: 10 } }],
			[
				"C1",
				{
					value: 42,
					style: { fg: "#18181B", font: { bold: true, size: 10 } },
				},
			],
		]);
		const target = makeSheet("Metrics", [
			["A1", { value: "Hello World" }],
			["B1", { value: 10, formula: { expression: "SUM(A2:A4)", cachedResult: 10 } }],
			[
				"C1",
				{
					value: 42,
					style: { font: { size: 10, bold: false }, fg: "#18181B" },
				},
			],
		]);

		// Default: ignoreWhitespace=false, compareFormulas=true, compareStyles=false
		const defaultDiff = diffSheets(base, target);
		expect(defaultDiff.modifiedCells.map((c) => c.ref)).toEqual(["A1", "B1"]);
		expect(defaultDiff.modifiedCells[1]).toMatchObject({
			ref: "B1",
			formulaBefore: "SUM(A2:A3)",
			formulaAfter: "SUM(A2:A4)",
		});

		// ignoreWhitespace=true, compareFormulas=false, compareStyles=false -> no changes
		const relaxedDiff = diffSheets(base, target, {
			ignoreWhitespace: true,
			compareFormulas: false,
			compareStyles: false,
		});
		expect(relaxedDiff.hasChanges).toBe(false);
		expect(relaxedDiff.modifiedCells).toEqual([]);

		// compareStyles=true detects C1 style change
		const styleDiff = diffSheets(base, target, {
			ignoreWhitespace: true,
			compareFormulas: false,
			compareStyles: true,
		});
		expect(styleDiff.hasChanges).toBe(true);
		expect(styleDiff.modifiedCells).toEqual([
			{
				kind: "modified",
				ref: "C1",
				row: 0,
				col: 2,
				before: 42,
				after: 42,
				styleChanged: true,
			},
		]);
	});

	it("treats key-order-equivalent style objects as unchanged when compareStyles is true", () => {
		const base = makeSheet("S", [
			["A1", { value: 1, style: { bg: "#FFFFFF", fg: "#000000" } }],
		]);
		const target = makeSheet("S", [
			["A1", { value: 1, style: { fg: "#000000", bg: "#FFFFFF" } }],
		]);

		const diff = diffSheets(base, target, { compareStyles: true });
		expect(diff.hasChanges).toBe(false);
	});
});

describe("diff: diffSheets (row mode)", () => {
	it("treats reordered identical rows as unchanged", () => {
		const base = makeSheet("Inventory", [
			["A1", { value: "SKU" }],
			["B1", { value: "Qty" }],
			["A2", { value: "SKU-1" }],
			["B2", { value: 10 }],
			["A3", { value: "SKU-2" }],
			["B3", { value: 20 }],
		]);
		const reordered = makeSheet("Inventory", [
			["A1", { value: "SKU" }],
			["B1", { value: "Qty" }],
			["A2", { value: "SKU-2" }],
			["B2", { value: 20 }],
			["A3", { value: "SKU-1" }],
			["B3", { value: 10 }],
		]);

		const byCol = diffSheets(base, reordered, { keyCol: 0 });
		expect(byCol.mode).toBe("row");
		expect(byCol.hasChanges).toBe(false);
		expect(byCol.addedRows).toEqual([]);
		expect(byCol.removedRows).toEqual([]);
		expect(byCol.modifiedRows).toEqual([]);

		const byHeader = diffSheets(base, reordered, { keyHeader: "sku" });
		expect(byHeader.mode).toBe("row");
		expect(byHeader.hasChanges).toBe(false);
	});

	it("detects addedRows, removedRows, and modifiedRows with accurate changedFields using keyHeader or keyCol", () => {
		const base = makeSheet("Employees", [
			["A1", { value: "Dept" }],
			["B1", { value: "EmpID" }],
			["C1", { value: "Salary" }],
			["A2", { value: "Eng" }],
			["B2", { value: "E1" }],
			["C2", { value: 100 }],
			["A3", { value: "Sales" }],
			["B3", { value: "E2" }],
			["C3", { value: 80 }],
		]);
		const target = makeSheet("Employees", [
			["A1", { value: "Dept" }],
			["B1", { value: "EmpID" }],
			["C1", { value: "Salary" }],
			["A2", { value: "Eng" }],
			["B2", { value: "E1" }],
			["C2", { value: 115 }],
			["A3", { value: "Ops" }],
			["B3", { value: "E3" }],
			["C3", { value: 90 }],
		]);

		const diff = diffSheets(base, target, { keyHeader: "EmpID" });
		expect(diff.mode).toBe("row");
		expect(diff.hasChanges).toBe(true);
		expect(diff.addedRows).toEqual([{ kind: "added", key: "E3", targetRowIndex: 3 }]);
		expect(diff.removedRows).toEqual([{ kind: "removed", key: "E2", baseRowIndex: 3 }]);
		expect(diff.modifiedRows).toEqual([
			{
				kind: "modified",
				key: "E1",
				baseRowIndex: 2,
				targetRowIndex: 2,
				changedFields: [{ field: "Salary", before: 100, after: 115 }],
			},
		]);

		const byCol = diffSheets(base, target, { keyCol: 1 });
		expect(byCol.modifiedRows).toEqual(diff.modifiedRows);
		expect(byCol.addedRows).toEqual(diff.addedRows);
		expect(byCol.removedRows).toEqual(diff.removedRows);
	});

	it("reports edits and deletions on duplicate keys instead of silently overwriting them", () => {
		const base = makeSheet("Duplicates", [
			["A1", { value: "SKU" }],
			["B1", { value: "Qty" }],
			["A2", { value: "SKU-1" }],
			["B2", { value: 10 }],
			["A3", { value: "SKU-1" }],
			["B3", { value: 20 }],
		]);

		const editedDuplicate = makeSheet("Duplicates", [
			["A1", { value: "SKU" }],
			["B1", { value: "Qty" }],
			["A2", { value: "SKU-1" }],
			["B2", { value: 10 }],
			["A3", { value: "SKU-1" }],
			["B3", { value: 25 }],
		]);

		const editDiff = diffSheets(base, editedDuplicate, { keyHeader: "SKU" });
		expect(editDiff.hasChanges).toBe(true);
		expect(editDiff.modifiedRows).toEqual([
			{
				kind: "modified",
				key: "SKU-1#2",
				baseRowIndex: 3,
				targetRowIndex: 3,
				changedFields: [{ field: "Qty", before: 20, after: 25 }],
			},
		]);

		const deletedDuplicate = makeSheet("Duplicates", [
			["A1", { value: "SKU" }],
			["B1", { value: "Qty" }],
			["A2", { value: "SKU-1" }],
			["B2", { value: 10 }],
		]);

		const deleteDiff = diffSheets(base, deletedDuplicate, { keyHeader: "SKU" });
		expect(deleteDiff.hasChanges).toBe(true);
		expect(deleteDiff.removedRows).toEqual([
			{ kind: "removed", key: "SKU-1#2", baseRowIndex: 3 },
		]);
	});

	it("reports formula changes in changedFields when compareFormulas is true even with identical cached values", () => {
		const base = makeSheet("Calc", [
			["A1", { value: "ID" }],
			["B1", { value: "Total" }],
			["A2", { value: "R1" }],
			["B2", { value: 100, formula: { expression: "SUM(C2:D2)", cachedResult: 100 } }],
		]);
		const target = makeSheet("Calc", [
			["A1", { value: "ID" }],
			["B1", { value: "Total" }],
			["A2", { value: "R1" }],
			["B2", { value: 100, formula: { expression: "C2+D2", cachedResult: 100 } }],
		]);

		const withFormulas = diffSheets(base, target, { keyHeader: "ID", compareFormulas: true });
		expect(withFormulas.hasChanges).toBe(true);
		expect(withFormulas.modifiedRows).toEqual([
			{
				kind: "modified",
				key: "R1",
				baseRowIndex: 2,
				targetRowIndex: 2,
				changedFields: [
					{
						field: "Total",
						before: 100,
						after: 100,
						formulaBefore: "SUM(C2:D2)",
						formulaAfter: "C2+D2",
					},
				],
			},
		]);

		const withoutFormulas = diffSheets(base, target, {
			keyHeader: "ID",
			compareFormulas: false,
		});
		expect(withoutFormulas.hasChanges).toBe(false);
		expect(withoutFormulas.modifiedRows).toEqual([]);
	});

	it("disambiguates duplicate headers ['Val', 'Val_2', 'Val'] collision-free and does not fall back to col 0 when keyHeader is missing", () => {
		const base = makeSheet("DupHeaders", [
			["A1", { value: "ID" }],
			["B1", { value: "Val" }],
			["C1", { value: "Val_2" }],
			["D1", { value: "Val" }],
			["A2", { value: "K1" }],
			["B2", { value: 1 }],
			["C2", { value: 2 }],
			["D2", { value: 3 }],
		]);
		const target = makeSheet("DupHeaders", [
			["A1", { value: "ID" }],
			["B1", { value: "Val" }],
			["C1", { value: "Val_2" }],
			["D1", { value: "Val" }],
			["A2", { value: "K1" }],
			["B2", { value: 1 }],
			["C2", { value: 2 }],
			["D2", { value: 99 }],
		]);

		const dupHeaderDiff = diffSheets(base, target, { keyHeader: "ID" });
		expect(dupHeaderDiff.hasChanges).toBe(true);
		expect(dupHeaderDiff.modifiedRows).toEqual([
			{
				kind: "modified",
				key: "K1",
				baseRowIndex: 2,
				targetRowIndex: 2,
				changedFields: [{ field: "Val_3", before: 3, after: 99 }],
			},
		]);

		// Missing keyHeader must NOT silently fall back to column 0
		const missingKeyDiff = diffSheets(base, target, { keyHeader: "MissingColumn" });
		expect(missingKeyDiff.mode).toBe("row");
		expect(missingKeyDiff.hasChanges).toBe(false);
		expect(missingKeyDiff.addedRows).toEqual([]);
		expect(missingKeyDiff.removedRows).toEqual([]);
		expect(missingKeyDiff.modifiedRows).toEqual([]);
	});
});

describe("diff: diffWorkbooks", () => {
	it("detects addedSheets, removedSheets, modifiedSheets, unchangedSheets, and honors sheetFilter", () => {
		const baseWb: WorkbookModel = {
			dateSystem: 1900,
			sheets: [
				makeSheet("Same", [["A1", { value: 1 }]]),
				makeSheet("Changed", [["A1", { value: 10 }]]),
				makeSheet("Removed", [["A1", { value: "bye" }]]),
			],
		};
		const targetWb: WorkbookModel = {
			dateSystem: 1900,
			sheets: [
				makeSheet("Same", [["A1", { value: 1 }]]),
				makeSheet("Changed", [["A1", { value: 20 }]]),
				makeSheet("Added", [["A1", { value: "hi" }]]),
			],
		};

		const full = diffWorkbooks(baseWb, targetWb);
		expect(full.hasChanges).toBe(true);
		expect(full.addedSheets).toEqual(["Added"]);
		expect(full.removedSheets).toEqual(["Removed"]);
		expect(full.unchangedSheets).toEqual(["Same"]);
		expect(full.modifiedSheets).toHaveLength(1);
		expect(full.modifiedSheets[0]?.sheetName).toBe("Changed");
		expect(full.modifiedSheets[0]?.modifiedCells).toHaveLength(1);

		const filteredByList = diffWorkbooks(baseWb, targetWb, { sheetFilter: ["Same"] });
		expect(filteredByList.hasChanges).toBe(false);
		expect(filteredByList.unchangedSheets).toEqual(["Same"]);
		expect(filteredByList.addedSheets).toEqual([]);
		expect(filteredByList.removedSheets).toEqual([]);
		expect(filteredByList.modifiedSheets).toEqual([]);

		const filteredByFn = diffWorkbooks(baseWb, targetWb, {
			sheetFilter: (name) => name === "Changed" || name === "Added",
		});
		expect(filteredByFn.hasChanges).toBe(true);
		expect(filteredByFn.addedSheets).toEqual(["Added"]);
		expect(filteredByFn.removedSheets).toEqual([]);
		expect(filteredByFn.modifiedSheets.map((s) => s.sheetName)).toEqual(["Changed"]);
	});
});
