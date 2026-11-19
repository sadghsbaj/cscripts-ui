import { describe, expect, it } from "vitest";
import { getCell } from "./coords.ts";
import { type CsvDelimiter, readCsvText, sniffCsvDelimiter, writeCsvText } from "./csv.ts";
import { isExcelError } from "./errors.ts";
import type { CellModel, WorksheetModel } from "./types.ts";

function getRequiredSheet(wb: { sheets: WorksheetModel[] }, index = 0): WorksheetModel {
	const sheet = wb.sheets[index];
	if (!sheet) {
		throw new Error(`Expected sheet at index ${index}`);
	}
	return sheet;
}

describe("csv: sniffCsvDelimiter", () => {
	it("detects comma, semicolon, and tab delimiters across consistent rows", () => {
		expect(sniffCsvDelimiter("id,name,score\n1,Alice,95\n2,Bob,88")).toBe(",");
		expect(sniffCsvDelimiter("id;name;score\r\n1;Alice;95\r\n2;Bob;88")).toBe(";");
		expect(sniffCsvDelimiter("id\tname\tscore\n1\tAlice\t95\n2\tBob\t88")).toBe("\t");
	});

	it("ignores delimiters inside double-quoted fields, including multiline and escaped quotes", () => {
		const semicolonWithQuotedCommas = [
			'id;description;notes',
			'1;"a,b,c,d,e";"quote ""x,y"" inside"',
			'2;"line 1, with, commas\nline 2, still, quoted";"done,ok"',
		].join("\n");
		expect(sniffCsvDelimiter(semicolonWithQuotedCommas)).toBe(";");

		const tabWithQuotedSemicolons = [
			"col1\tcol2\tcol3",
			'A\t"1;2;3;4;5"\t"x;y;z"',
			'B\t"6;7;8;9;10"\t"m;n;o"',
		].join("\r\n");
		expect(sniffCsvDelimiter(tabWithQuotedSemicolons)).toBe("\t");
	});

	it("strips leading UTF-8 BOM and defaults to comma when no candidate delimiter is present", () => {
		expect(sniffCsvDelimiter("\u{FEFF}a;b;c\n1;2;3")).toBe(";");
		expect(sniffCsvDelimiter("\u{FEFF}single_column\nrow1\nrow2")).toBe(",");
		expect(sniffCsvDelimiter("")).toBe(",");
		expect(sniffCsvDelimiter("\u{FEFF}   \r\n  ")).toBe(",");
	});

	it("detects semicolon delimiter when unquoted fields contain mid-field double quotes", () => {
		expect(sniffCsvDelimiter('5" pipe;10;20\n3" pipe;30;40')).toBe(";");
	});
});

describe("csv: readCsvText", () => {
	it("parses RFC 4180 quoted fields, embedded LF/CRLF/CR newlines, escaped quotes, and ignores a single trailing EOF newline", () => {
		const csv =
			'\u{FEFF}Name,Quote,Multiline,Empty,Trailing\r\n' +
			'"Alice, Jr.","She said ""Hello""","Line 1\r\nLine 2\nLine 3\rLine 4",,ok\r\n';

		const wb = readCsvText(csv);
		expect(wb.dateSystem).toBe(1900);
		expect(wb.sheets).toHaveLength(1);

		const sheet = getRequiredSheet(wb);
		expect(sheet.name).toBe("Sheet1");
		expect(getCell(sheet, "A1")?.value).toBe("Name");
		expect(getCell(sheet, "A2")?.value).toBe("Alice, Jr.");
		expect(getCell(sheet, "B2")?.value).toBe('She said "Hello"');
		expect(getCell(sheet, "C2")?.value).toBe("Line 1\nLine 2\nLine 3\nLine 4");
		// Empty cells are skipped in sheet.cells map
		expect(getCell(sheet, "D2")).toBeUndefined();
		expect(getCell(sheet, "E2")?.value).toBe("ok");
		expect(getCell(sheet, "A3")).toBeUndefined();
	});

	it("respects custom sheetName, explicit delimiter, and trimCells: true (skipping whitespace-only cells after trim)", () => {
		const csv = '  colA ; colB ; colC \n  val1  ;   ;"  spaced inside quotes  "';
		const wb = readCsvText(csv, {
			delimiter: ";",
			sheetName: "ImportedData",
			trimCells: true,
		});

		const sheet = getRequiredSheet(wb);
		expect(sheet.name).toBe("ImportedData");
		expect(getCell(sheet, "A1")?.value).toBe("colA");
		expect(getCell(sheet, "B1")?.value).toBe("colB");
		expect(getCell(sheet, "C1")?.value).toBe("colC");
		expect(getCell(sheet, "A2")?.value).toBe("val1");
		expect(getCell(sheet, "B2")).toBeUndefined();
		expect(getCell(sheet, "C2")?.value).toBe("spaced inside quotes");
	});

	it("returns an empty sheet when given an empty string or BOM-only string", () => {
		const wbEmpty = readCsvText("");
		expect(getRequiredSheet(wbEmpty).cells.size).toBe(0);

		const wbBomOnly = readCsvText("\u{FEFF}");
		expect(getRequiredSheet(wbBomOnly).cells.size).toBe(0);
	});

	it("enforces maxBytes (ASCII fast-path and multi-byte UTF-8) and maxRows with ExcelError('LIMIT_EXCEEDED')", () => {
		// ASCII length exceeding maxBytes
		try {
			readCsvText("a,b,c\n1,2,3", { maxBytes: 5 });
			expect.fail("Expected maxBytes LIMIT_EXCEEDED");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
			}
		}

		// Multi-byte UTF-8 where string.length <= maxBytes but UTF-8 byteLength > maxBytes
		// "ä" is 1 UTF-16 code unit, 2 UTF-8 bytes; 4 chars = 8 bytes
		try {
			readCsvText("ääää", { maxBytes: 6 });
			expect.fail("Expected multi-byte UTF-8 maxBytes LIMIT_EXCEEDED");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
				expect(error.details?.byteLength).toBe(8);
			}
		}

		// maxRows limit
		try {
			readCsvText("h1,h2\n1,2\n3,4", { maxRows: 2 });
			expect.fail("Expected maxRows LIMIT_EXCEEDED");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
				expect(error.details?.maxRows).toBe(2);
			}
		}
	});

	it("throws ExcelError('INVALID_CONFIG') on invalid delimiter or non-positive maxBytes/maxRows", () => {
		try {
			readCsvText("a|b|c", { delimiter: "|" as unknown as CsvDelimiter });
			expect.fail("Expected INVALID_CONFIG for unsupported delimiter");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("INVALID_CONFIG");
			}
		}

		try {
			readCsvText("a,b", { maxBytes: 0 });
			expect.fail("Expected INVALID_CONFIG for maxBytes <= 0");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("INVALID_CONFIG");
			}
		}

		try {
			readCsvText("a,b", { maxRows: -1 });
			expect.fail("Expected INVALID_CONFIG for maxRows <= 0");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("INVALID_CONFIG");
			}
		}
	});
});

describe("csv: writeCsvText", () => {
	it("returns empty string (or BOM when bom: true) for an empty worksheet", () => {
		const emptySheet: WorksheetModel = {
			name: "Empty",
			cells: new Map(),
		};
		expect(writeCsvText(emptySheet)).toBe("");
		expect(writeCsvText(emptySheet, { bom: true })).toBe("\u{FEFF}");
	});

	it("applies RFC 4180 quoting for delimiters, quotes, CR/LF, and leading/trailing whitespace, supporting custom delimiter, bom, and lineEnding", () => {
		const sheet: WorksheetModel = {
			name: "Quoting",
			cells: new Map<string, CellModel>([
				["A1", { value: "plain", type: "string" }],
				["B1", { value: "has;semicolon", type: "string" }],
				["C1", { value: 'has "quotes"', type: "string" }],
				["A2", { value: " leading", type: "string" }],
				["B2", { value: "trailing\t", type: "string" }],
				["C2", { value: "line1\nline2", type: "string" }],
			]),
		};

		const out = writeCsvText(sheet, {
			delimiter: ";",
			bom: true,
			lineEnding: "\n",
		});

		expect(out).toBe(
			'\u{FEFF}plain;"has;semicolon";"has ""quotes"""\n' +
				'" leading";"trailing\t";"line1\nline2"',
		);
	});

	it("supports formatDisplay: true (default, using numFmt and dateSystem) vs formatDisplay: false (raw scalar representation)", () => {
		// In 1900 dateSystem, serial 45_658 is 2025-01-01; in 1904 dateSystem, serial 45_658 is 2029-01-02
		const sheet: WorksheetModel = {
			name: "DisplayVsRaw",
			cells: new Map<string, CellModel>([
				["A1", { value: 1234.5, type: "number", style: { numFmt: "#,##0.00" } }],
				["B1", { value: 0.256, type: "number", style: { numFmt: "0.0%" } }],
				["C1", { value: 45_658, type: "number", style: { numFmt: "yyyy-mm-dd" } }],
				["D1", { value: true, type: "boolean" }],
			]),
		};

		const formatted1900 = writeCsvText(sheet, {
			formatDisplay: true,
			dateSystem: 1900,
			lineEnding: "\n",
		});
		expect(formatted1900).toBe('"1,234.50",25.6%,2025-01-01,TRUE');

		const formatted1904 = writeCsvText(sheet, {
			formatDisplay: true,
			dateSystem: 1904,
			lineEnding: "\n",
		});
		expect(formatted1904).toBe('"1,234.50",25.6%,2029-01-02,TRUE');

		const raw = writeCsvText(sheet, {
			formatDisplay: false,
			lineEnding: "\n",
		});
		expect(raw).toBe("1234.5,0.256,45658,TRUE");
	});

	it(String.raw`prefixes untrusted string and rich-text cells starting with =, +, -, @, \t, \r when sanitizeFormulaInjection: true, while leaving numbers, booleans, dates, and explicit formula cells untouched`, () => {
		const sheet: WorksheetModel = {
			name: "FormulaGuard",
			cells: new Map<string, CellModel>([
				["A1", { value: "=CMD|' /C calc'!A0", type: "string" }],
				["B1", { value: "+1+1", type: "string" }],
				["C1", { value: "-100%", type: "string" }],
				["D1", { value: "@SUM(A1:A2)", type: "string" }],
				["E1", { value: "\tmalicious", type: "string" }],
				["F1", { value: "\rmalicious", type: "string" }],
				[
					"G1",
					{
						value: null,
						type: "string",
						richText: [{ text: "=RICH_INJECT()" }],
					},
				],
				// Already escaped with leading apostrophe -> should not double-prefix
				["H1", { value: "'=already_escaped", type: "string" }],
				// Safe non-string types and explicit formula cell -> must NOT be prefixed
				["A2", { value: -42.5, type: "number" }],
				["B2", { value: false, type: "boolean" }],
				["C2", { value: new Date("2025-03-15T00:00:00.000Z"), type: "date" }],
				[
					"D2",
					{
						value: "=SUM(1;2)",
						type: "string",
						formula: { expression: "SUM(1,2)", cachedResult: "=SUM(1;2)" },
					},
				],
			]),
		};

		const sanitized = writeCsvText(sheet, {
			sanitizeFormulaInjection: true,
			lineEnding: "\n",
		});
		const lines = sanitized.split("\n");
		expect(lines[0]).toBe(
			"'=CMD|' /C calc'!A0,'+1+1,'-100%,'@SUM(A1:A2),'\tmalicious,\"'\rmalicious\",'=RICH_INJECT(),'=already_escaped",
		);
		expect(lines[1]).toBe("-42.5,FALSE,2025-03-15,=SUM(1;2),,,,");
	});

	it("prefixes whitespace-preceded and newline-preceded formula triggers when sanitizeFormulaInjection: true while leaving plain indented text untouched", () => {
		const sheet: WorksheetModel = {
			name: "WhitespaceFormulaGuard",
			cells: new Map<string, CellModel>([
				["A1", { value: " =CMD()", type: "string" }],
				["B1", { value: "\n=CMD()", type: "string" }],
				["C1", { value: "  hello", type: "string" }],
			]),
		};

		const out = writeCsvText(sheet, {
			sanitizeFormulaInjection: true,
			lineEnding: "\n",
		});
		// A1 gets prefixed with ' (no leading space anymore, no quoting needed);
		// B1 gets prefixed with ' and contains \n so RFC 4180 quotes it;
		// C1 is NOT prefixed, keeps leading spaces so RFC 4180 quotes it.
		expect(out).toBe(`' =CMD(),"'\n=CMD()","  hello"`);
	});

	it("writes non-normalized cell map keys ('a1', '$B$1') cleanly in writeCsvText", () => {
		const sheet: WorksheetModel = {
			name: "NonNormalizedKeys",
			cells: new Map<string, CellModel>([
				["a1", { value: "LowerA1", type: "string" }],
				["$B$1", { value: 42, type: "number" }],
				["$a2", { value: "Row2A", type: "string" }],
			]),
		};

		const out = writeCsvText(sheet, { lineEnding: "\n" });
		expect(out).toBe("LowerA1,42\nRow2A,");
	});

	it("throws ExcelError('INVALID_CONFIG') when writeCsvText receives an invalid delimiter", () => {
		const sheet: WorksheetModel = {
			name: "InvalidDelim",
			cells: new Map([["A1", { value: "x", type: "string" }]]),
		};
		try {
			writeCsvText(sheet, { delimiter: "|" as unknown as CsvDelimiter });
			expect.fail("Expected INVALID_CONFIG");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("INVALID_CONFIG");
			}
		}
	});
});
