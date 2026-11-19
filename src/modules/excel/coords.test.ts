import { describe, expect, it } from "vitest";
import {
	colToLetter,
	formatCellRef,
	getCell,
	letterToCol,
	parseCellRef,
	parseRangeRef,
	parseSheetQualifiedRef,
	setCell,
	translateFormulaRefs,
} from "./coords.ts";
import { EXCEL_ERROR_CODES, ExcelError, isExcelError } from "./errors.ts";
import type { WorksheetModel } from "./types.ts";

function makeSheet(name = "Sheet1"): WorksheetModel {
	return {
		name,
		cells: new Map(),
	};
}

describe("ExcelError and isExcelError", () => {
	it("constructs ExcelError with code, message, details, and cause", () => {
		const rootCause = new Error("bad coordinate");
		const err = new ExcelError("INVALID_CELL_REF", "Out of bounds", {
			details: { ref: "XFE1" },
			cause: rootCause,
		});

		expect(err).toBeInstanceOf(Error);
		expect(err).toBeInstanceOf(ExcelError);
		expect(err.name).toBe("ExcelError");
		expect(err.code).toBe("INVALID_CELL_REF");
		expect(err.message).toBe("Out of bounds");
		expect(err.details).toEqual({ ref: "XFE1" });
		expect(err.cause).toBe(rootCause);

		const withoutCause = new ExcelError("PATCH_FAILED", "Patch error");
		expect(withoutCause.cause).toBeUndefined();
		expect(withoutCause.details).toBeUndefined();
	});

	it("identifies ExcelError instances and cross-realm objects via isExcelError", () => {
		expect(EXCEL_ERROR_CODES).toContain("INVALID_CELL_REF");
		expect(EXCEL_ERROR_CODES).toContain("INVALID_RANGE_REF");

		for (const code of EXCEL_ERROR_CODES) {
			expect(isExcelError(new ExcelError(code, "msg"))).toBe(true);
			expect(isExcelError({ name: "ExcelError", code, message: "cross-realm" })).toBe(true);
		}

		expect(isExcelError(null)).toBe(false);
		expect(isExcelError(undefined)).toBe(false);
		expect(isExcelError("ExcelError")).toBe(false);
		expect(isExcelError(new Error("plain"))).toBe(false);
		expect(isExcelError({ name: "ExcelError", code: "NOT_A_CODE" })).toBe(false);
		expect(isExcelError({ name: "TypeError", code: "INVALID_CELL_REF" })).toBe(false);
		expect(isExcelError({ name: "ExcelError", code: 123 })).toBe(false);
	});
});

describe("colToLetter and letterToCol", () => {
	it("converts valid 0-based column indices and Excel letters bidirectionally", () => {
		const cases: Array<[number, string]> = [
			[0, "A"],
			[25, "Z"],
			[26, "AA"],
			[701, "ZZ"],
			[702, "AAA"],
			[16_383, "XFD"],
		];

		for (const [index, letter] of cases) {
			expect(colToLetter(index)).toBe(letter);
			expect(letterToCol(letter)).toBe(index);
		}

		expect(letterToCol("xfd")).toBe(16_383);
		expect(letterToCol("aA")).toBe(26);
	});

	it("throws ExcelError('INVALID_CELL_REF') on out-of-range or invalid columns", () => {
		for (const badCol of [-1, 16_384, 1.5, NaN, Infinity]) {
			try {
				colToLetter(badCol);
				expect.unreachable(`Expected colToLetter(${String(badCol)}) to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("INVALID_CELL_REF");
				}
			}
		}

		for (const badLetters of ["", "XFE", "AAAA", "A1", "$A", "1"]) {
			try {
				letterToCol(badLetters);
				expect.unreachable(`Expected letterToCol(${badLetters}) to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("INVALID_CELL_REF");
				}
			}
		}
	});
});

describe("parseCellRef and formatCellRef", () => {
	it("parses and formats absolute/relative A1 references across Excel bounds", () => {
		expect(parseCellRef("$A$1")).toEqual({
			col: 0,
			row: 0,
			colAbsolute: true,
			rowAbsolute: true,
		});
		expect(parseCellRef("$B2")).toEqual({
			col: 1,
			row: 1,
			colAbsolute: true,
			rowAbsolute: false,
		});
		expect(parseCellRef("C$3")).toEqual({
			col: 2,
			row: 2,
			colAbsolute: false,
			rowAbsolute: true,
		});
		expect(parseCellRef("A1")).toEqual({
			col: 0,
			row: 0,
			colAbsolute: false,
			rowAbsolute: false,
		});
		expect(parseCellRef("xfd1048576")).toEqual({
			col: 16_383,
			row: 1_048_575,
			colAbsolute: false,
			rowAbsolute: false,
		});

		expect(formatCellRef(0, 0)).toBe("A1");
		expect(formatCellRef(0, 0, { colAbsolute: true, rowAbsolute: true })).toBe("$A$1");
		expect(formatCellRef(1, 1, { colAbsolute: true })).toBe("$B2");
		expect(formatCellRef(2, 2, { rowAbsolute: true })).toBe("C$3");
		expect(formatCellRef(16_383, 1_048_575)).toBe("XFD1048576");
	});

	it("rejects out-of-bounds or malformed cell references with INVALID_CELL_REF", () => {
		for (const badRef of ["A0", "A01", "XFE1", "A1048577", "$A$1048577", "", "A1:B2", "1A"]) {
			try {
				parseCellRef(badRef);
				expect.unreachable(`Expected parseCellRef("${badRef}") to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("INVALID_CELL_REF");
				}
			}
		}

		for (const [col, row] of [
			[0, -1],
			[0, 1_048_576],
			[0, 1.5],
			[16_384, 0],
		] as const) {
			try {
				formatCellRef(col, row);
				expect.unreachable(`Expected formatCellRef(${col}, ${row}) to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("INVALID_CELL_REF");
				}
			}
		}
	});
});

describe("parseRangeRef", () => {
	it("parses single-cell ranges and normalizes reversed corners", () => {
		expect(parseRangeRef("B4")).toEqual({
			start: { col: 1, row: 3 },
			end: { col: 1, row: 3 },
		});

		const expected = {
			start: { col: 1, row: 1 },
			end: { col: 3, row: 9 },
		};
		expect(parseRangeRef("B2:D10")).toEqual(expected);
		expect(parseRangeRef("D10:B2")).toEqual(expected);
		expect(parseRangeRef("D2:B10")).toEqual(expected);
		expect(parseRangeRef("B10:D2")).toEqual(expected);
		expect(parseRangeRef("$D$10:$B$2")).toEqual(expected);
	});

	it("throws ExcelError('INVALID_RANGE_REF') on malformed range strings", () => {
		for (const badRange of ["", "A1:B2:C3", "A1:", ":B2", "A0:B2", "XFE1:B2"]) {
			try {
				parseRangeRef(badRange);
				expect.unreachable(`Expected parseRangeRef("${badRange}") to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("INVALID_RANGE_REF");
				}
			}
		}
	});
});

describe("parseSheetQualifiedRef", () => {
	it("parses escaped quoted sheet names, unquoted sheet names, and plain refs", () => {
		expect(parseSheetQualifiedRef("'Sheet''s Name'!$A$1:$D$10")).toEqual({
			sheetName: "Sheet's Name",
			range: {
				start: { col: 0, row: 0 },
				end: { col: 3, row: 9 },
			},
		});

		expect(parseSheetQualifiedRef("Overview!B2")).toEqual({
			sheetName: "Overview",
			range: {
				start: { col: 1, row: 1 },
				end: { col: 1, row: 1 },
			},
		});

		expect(parseSheetQualifiedRef("C3")).toEqual({
			range: {
				start: { col: 2, row: 2 },
				end: { col: 2, row: 2 },
			},
		});
	});

	it("throws ExcelError('INVALID_RANGE_REF') on invalid sheet-qualified refs", () => {
		for (const bad of ["", "!A1", "Sheet!", "'Unclosed!A1", "''!A1", "'Sheet'A1", "'Sheet'!A0"]) {
			try {
				parseSheetQualifiedRef(bad);
				expect.unreachable(`Expected parseSheetQualifiedRef("${bad}") to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("INVALID_RANGE_REF");
				}
			}
		}
	});
});

describe("translateFormulaRefs", () => {
	it("translates relative axes while preserving $, functions, quoted literals, and sheet names", () => {
		const formula = `SUM(A1:B$2)+$C$3+LOG10(D4)+"A1"+'My Sheet'!E5`;
		expect(translateFormulaRefs(formula, 1, 1)).toBe(
			`SUM(B2:C$2)+$C$3+LOG10(E5)+"A1"+'My Sheet'!F6`,
		);

		expect(translateFormulaRefs(formula, 0, 0)).toBe(formula);

		expect(translateFormulaRefs(`Q1!B2+'Sheet''s A1'!$C4+"say ""A1"""`, 2, 3)).toBe(
			`Q1!D5+'Sheet''s A1'!$C7+"say ""A1"""`,
		);
		expect(translateFormulaRefs("R1C1+A1", 1, 1)).toBe("R1C1+B2");
		expect(translateFormulaRefs("'A1'!B2", 1, 1)).toBe("'A1'!C3");
		expect(translateFormulaRefs("SUM(Q1:Q4!B2, Jan1:Dec1!$A1)", 1, 2)).toBe(
			"SUM(Q1:Q4!C4, Jan1:Dec1!$A3)",
		);
	});

	it("preserves structured table column names inside [...] while still shifting cell references outside", () => {
		expect(translateFormulaRefs("SUM(Sales[Q1])", 1, 1)).toBe("SUM(Sales[Q1])");
		expect(translateFormulaRefs("[@A1]+B1", 1, 1)).toBe("[@A1]+C2");
		expect(translateFormulaRefs("Sales[[#Totals],[Q1]]+A1", 1, 1)).toBe(
			"Sales[[#Totals],[Q1]]+B2",
		);
		expect(translateFormulaRefs("SUM(Sales[A1]:Sales[B2])+B1", 2, 3)).toBe(
			"SUM(Sales[A1]:Sales[B2])+D4",
		);
	});

	it("replaces out-of-bounds translated references with #REF!", () => {
		expect(translateFormulaRefs("A1+B2+$A3+A$1", -1, 0)).toBe("#REF!+A2+$A3+#REF!");
		expect(translateFormulaRefs("B1+$B$1+B$2", 0, -1)).toBe("#REF!+$B$1+B$2");
		expect(translateFormulaRefs("XFD1+A1048576", 1, 0)).toBe("#REF!+B1048576");
		expect(translateFormulaRefs("XFD1+A1048576", 0, 1)).toBe("XFD2+#REF!");
	});
});

describe("getCell and setCell", () => {
	it("normalizes cell map keys case-insensitively and without $ signs", () => {
		const sheet = makeSheet();
		const cell = { value: 42 };

		setCell(sheet, "$b$4", cell);
		expect(sheet.cells.has("B4")).toBe(true);
		expect(sheet.cells.size).toBe(1);

		expect(getCell(sheet, "B4")).toBe(cell);
		expect(getCell(sheet, "b4")).toBe(cell);
		expect(getCell(sheet, "$B4")).toBe(cell);
		expect(getCell(sheet, "B$4")).toBe(cell);

		const updated = { value: 99 };
		setCell(sheet, "B$4", updated);
		expect(sheet.cells.size).toBe(1);
		expect(getCell(sheet, "$b$4")).toBe(updated);
		expect(getCell(sheet, "C1")).toBeUndefined();
	});

	it("throws ExcelError('INVALID_CELL_REF') when accessing an invalid key", () => {
		const sheet = makeSheet();
		expect(() => getCell(sheet, "A0")).toThrow(ExcelError);
		expect(() => setCell(sheet, "XFE1", { value: 1 })).toThrow(ExcelError);
	});
});
