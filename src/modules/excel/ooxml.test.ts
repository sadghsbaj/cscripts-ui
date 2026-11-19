import { describe, expect, it } from "vitest";
import { isExcelError } from "./errors.ts";
import {
	decodeUtf8,
	encodeUtf8,
	extractOoxmlPackage,
	packOoxmlPackage,
} from "./ooxml-package.internal.ts";
import {
	createPatchSession,
	patchXlsxBytes,
	readNamedTable,
	readXlsxBytes,
	resolveDefinedName,
	writeXlsxBytes,
} from "./ooxml.ts";
import type { FormulaEvaluator, WorkbookModel, WorksheetModel } from "./types.ts";

const HTTP_SCHEME = ["http", "://"].join("");
const SPREADSHEET_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main`;
const OFFICE_REL_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships`;
const PKG_REL_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/package/2006/relationships`;
const CONTENT_TYPES_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/package/2006/content-types`;

function makeWorkbook(sheets: WorksheetModel[], dateSystem: 1900 | 1904 = 1900): WorkbookModel {
	return {
		dateSystem,
		sheets,
	};
}

function getRequiredSheet(wb: WorkbookModel, index = 0): WorksheetModel {
	const sheet = wb.sheets[index];
	if (!sheet) {
		throw new Error(`Expected sheet at index ${index}`);
	}
	return sheet;
}

function getRequiredEntry(
	entries: Readonly<Record<string, Uint8Array>>,
	path: string,
): Uint8Array {
	const bytes = entries[path];
	if (!bytes) {
		throw new Error(`Expected package entry "${path}"`);
	}
	return bytes;
}

describe("ooxml: Full Read/Write Roundtrip (writeXlsxBytes -> readXlsxBytes)", () => {
	it("roundtrips scalars, shared strings, inline strings, rich text runs, booleans, errors, dates (1900 & 1904), and formulas", () => {
		const dateOnly = new Date("2025-07-15T00:00:00.000Z");
		const dateTime = new Date("2025-07-15T14:30:45.000Z");

		const sheet: WorksheetModel = {
			name: "DataTypes",
			cells: new Map([
				["A1", { value: 1234.567, type: "number" }],
				["A2", { value: -42, type: "number" }],
				["B1", { value: "Hello World", type: "string" }],
				["B2", { value: "  leading and trailing  ", type: "string" }],
				[
					"B3",
					{
						value: "Bold & Italic",
						type: "string",
						richText: [
							{
								text: "Bold ",
								bold: true,
								fg: "#FF0000",
								fontSize: 12,
								fontFamily: "Calibri",
							},
							{
								text: "& Italic",
								italic: true,
								fg: "#0055AA",
								fontSize: 10,
								fontFamily: "Consolas",
							},
						],
					},
				],
				["C1", { value: true, type: "boolean" }],
				["C2", { value: false, type: "boolean" }],
				["D1", { value: "#DIV/0!", type: "error" }],
				["D2", { value: "#REF!", type: "error" }],
				["E1", { value: dateOnly, type: "date" }],
				["E2", { value: dateTime, type: "date" }],
				[
					"F1",
					{
						value: 1192.567,
						type: "number",
						formula: {
							expression: "A1+A2",
							cachedResult: 1192.567,
						},
					},
				],
				[
					"F2",
					{
						value: "#DIV/0!",
						type: "error",
						formula: {
							expression: "1/0",
							cachedResult: null,
							error: "#DIV/0!",
						},
					},
				],
				[
					"F3",
					{
						value: "OK",
						type: "string",
						formula: {
							expression: 'IF(C1,"OK","NO")',
							cachedResult: "OK",
						},
					},
				],
				[
					"F4",
					{
						value: true,
						type: "boolean",
						formula: {
							expression: "A1>0",
							cachedResult: true,
						},
					},
				],
			]),
		};

		// 1. With useSharedStrings: true (default) and 1900 date system
		const bytesShared = writeXlsxBytes(makeWorkbook([sheet], 1900), {
			useSharedStrings: true,
		});
		const pkgShared = extractOoxmlPackage(bytesShared);
		expect(pkgShared["xl/sharedStrings.xml"]).toBeDefined();

		const wbShared = readXlsxBytes(bytesShared);
		expect(wbShared.dateSystem).toBe(1900);
		const sShared = getRequiredSheet(wbShared, 0);

		expect(sShared.cells.get("A1")?.value).toBeCloseTo(1234.567, 6);
		expect(sShared.cells.get("A2")?.value).toBe(-42);
		expect(sShared.cells.get("B1")?.value).toBe("Hello World");
		expect(sShared.cells.get("B2")?.value).toBe("  leading and trailing  ");
		expect(sShared.cells.get("B3")?.value).toBe("Bold & Italic");
		expect(sShared.cells.get("B3")?.richText).toEqual([
			{
				text: "Bold ",
				bold: true,
				fg: "#FF0000",
				fontSize: 12,
				fontFamily: "Calibri",
			},
			{
				text: "& Italic",
				italic: true,
				fg: "#0055AA",
				fontSize: 10,
				fontFamily: "Consolas",
			},
		]);
		expect(sShared.cells.get("C1")?.value).toBe(true);
		expect(sShared.cells.get("C2")?.value).toBe(false);
		expect(sShared.cells.get("D1")).toMatchObject({ value: "#DIV/0!", type: "error" });
		expect(sShared.cells.get("D2")).toMatchObject({ value: "#REF!", type: "error" });
		expect((sShared.cells.get("E1")?.value as Date).toISOString()).toBe(dateOnly.toISOString());
		expect((sShared.cells.get("E2")?.value as Date).toISOString()).toBe(dateTime.toISOString());
		expect(sShared.cells.get("F1")?.formula).toMatchObject({
			expression: "A1+A2",
			cachedResult: 1192.567,
		});
		expect(sShared.cells.get("F2")?.formula).toMatchObject({
			expression: "1/0",
			cachedResult: null,
			error: "#DIV/0!",
		});
		expect(sShared.cells.get("F3")?.formula).toMatchObject({
			expression: 'IF(C1,"OK","NO")',
			cachedResult: "OK",
		});
		expect(sShared.cells.get("F4")?.formula).toMatchObject({
			expression: "A1>0",
			cachedResult: true,
		});

		// 2. With useSharedStrings: false (inlineStr) and 1904 date system
		const bytesInline = writeXlsxBytes(makeWorkbook([sheet], 1904), {
			useSharedStrings: false,
		});
		const pkgInline = extractOoxmlPackage(bytesInline);
		expect(pkgInline["xl/sharedStrings.xml"]).toBeUndefined();
		const sheetXmlInline = decodeUtf8(getRequiredEntry(pkgInline, "xl/worksheets/sheet1.xml"));
		expect(sheetXmlInline).toContain('t="inlineStr"');

		const wbInline = readXlsxBytes(bytesInline);
		expect(wbInline.dateSystem).toBe(1904);
		const sInline = getRequiredSheet(wbInline, 0);
		expect(sInline.cells.get("B1")?.value).toBe("Hello World");
		expect(sInline.cells.get("B2")?.value).toBe("  leading and trailing  ");
		expect(sInline.cells.get("B3")?.value).toBe("Bold & Italic");
		expect(sInline.cells.get("B3")?.richText).toHaveLength(2);
		expect((sInline.cells.get("E1")?.value as Date).toISOString()).toBe(dateOnly.toISOString());
		expect((sInline.cells.get("E2")?.value as Date).toISOString()).toBe(dateTime.toISOString());
	});

	it("applies sanitizeFormulaInjection: true to string and richText triggers while leaving numbers and explicit formulas untouched", () => {
		const sheet: WorksheetModel = {
			name: "Sanitize",
			cells: new Map([
				["A1", { value: "=CMD|' /C calc'!A0", type: "string" }],
				["A2", { value: "+SUM(1,2)", type: "string" }],
				["A3", { value: "-100+200", type: "string" }],
				["A4", { value: "@SUM(A1:A2)", type: "string" }],
				["A5", { value: "\t=evil()", type: "string" }],
				["A6", { value: "\r=evil()", type: "string" }],
				["A7", { value: "Normal text", type: "string" }],
				[
					"A8",
					{
						value: "=RichTrigger",
						type: "string",
						richText: [{ text: "=Rich", bold: true }, { text: "Trigger" }],
					},
				],
				["B1", { value: -55.25, type: "number" }],
				[
					"B2",
					{
						value: 10,
						type: "number",
						formula: { expression: "=SUM(5,5)", cachedResult: 10 },
					},
				],
			]),
		};

		const bytes = writeXlsxBytes(makeWorkbook([sheet]), {
			sanitizeFormulaInjection: true,
			useSharedStrings: false,
		});
		const parsed = getRequiredSheet(readXlsxBytes(bytes), 0);

		expect(parsed.cells.get("A1")?.value).toBe("'=CMD|' /C calc'!A0");
		expect(parsed.cells.get("A2")?.value).toBe("'+SUM(1,2)");
		expect(parsed.cells.get("A3")?.value).toBe("'-100+200");
		expect(parsed.cells.get("A4")?.value).toBe("'@SUM(A1:A2)");
		expect(parsed.cells.get("A5")?.value).toBe("'\t=evil()");
		expect(parsed.cells.get("A6")?.value).toBe("'\r=evil()");
		expect(parsed.cells.get("A7")?.value).toBe("Normal text");
		expect(parsed.cells.get("A8")?.value).toBe("'=RichTrigger");
		expect(parsed.cells.get("A8")?.richText?.[0]?.text).toBe("'=Rich");
		expect(parsed.cells.get("B1")?.value).toBe(-55.25);
		expect(parsed.cells.get("B2")?.formula?.expression).toBe("SUM(5,5)");
		expect(parsed.cells.get("B2")?.value).toBe(10);
	});

	it("roundtrips styles (fg, bg, font, border, align, numFmt) and still decodes Date cells when includeStyles: false", () => {
		const testDate = new Date("2026-03-20T00:00:00.000Z");
		const sheet: WorksheetModel = {
			name: "Styled",
			cells: new Map([
				[
					"A1",
					{
						value: 0.456,
						type: "number",
						style: {
							fg: "#112233",
							bg: "#FFEECC",
							font: {
								family: "Arial",
								size: 14,
								bold: true,
								italic: true,
								underline: true,
								strike: true,
							},
							border: {
								top: { style: "thin", fg: "#000000" },
								right: { style: "medium", fg: "#334455" },
								bottom: { style: "double", fg: "#667788" },
								left: { style: "dashed", fg: "#99AABB" },
							},
							align: {
								horizontal: "right",
								vertical: "center",
								wrapText: true,
								indent: 2,
							},
							numFmt: "0.0%",
						},
					},
				],
				[
					"B1",
					{
						value: testDate,
						type: "date",
					},
				],
			]),
		};

		const bytes = writeXlsxBytes(makeWorkbook([sheet]));

		// With includeStyles: true
		const wbWithStyles = readXlsxBytes(bytes, { includeStyles: true });
		const cellA1 = getRequiredSheet(wbWithStyles, 0).cells.get("A1");
		expect(cellA1?.style).toEqual({
			fg: "#112233",
			bg: "#FFEECC",
			font: {
				family: "Arial",
				size: 14,
				bold: true,
				italic: true,
				underline: true,
				strike: true,
			},
			border: {
				top: { style: "thin", fg: "#000000" },
				right: { style: "medium", fg: "#334455" },
				bottom: { style: "double", fg: "#667788" },
				left: { style: "dashed", fg: "#99AABB" },
			},
			align: {
				horizontal: "right",
				vertical: "center",
				wrapText: true,
				indent: 2,
			},
			numFmt: "0.0%",
		});

		// With includeStyles: false
		const wbNoStyles = readXlsxBytes(bytes, { includeStyles: false });
		const sheetNoStyles = getRequiredSheet(wbNoStyles, 0);
		const cellA1NoStyle = sheetNoStyles.cells.get("A1");
		expect(cellA1NoStyle?.style).toBeUndefined();

		const cellB1NoStyle = sheetNoStyles.cells.get("B1");
		expect(cellB1NoStyle?.style).toBeUndefined();
		expect(cellB1NoStyle?.type).toBe("date");
		expect(cellB1NoStyle?.value).toBeInstanceOf(Date);
		expect((cellB1NoStyle?.value as Date).toISOString()).toBe(testDate.toISOString());
	});

	it("roundtrips worksheet metadata, pageSetup, merges, freezePane, validations, hyperlinks, rowsMeta, columns, state, and enforces ECMA-376 child ordering", () => {
		const sheet1: WorksheetModel = {
			name: "FullMeta",
			state: "visible",
			showGridLines: false,
			tabColor: "#2288DD",
			defaultRowHeight: 18,
			defaultColWidth: 12,
			freezePane: { rows: 2, cols: 1 },
			autoFilterRef: "A1:D10",
			merges: ["A1:B1", "C3:D4"],
			columns: [
				{ min: 1, max: 2, width: 24.5, outlineLevel: 1 },
				{ min: 3, max: 3, width: 15, hidden: true },
			],
			rowsMeta: new Map([
				[1, { rowIndex: 1, height: 28, outlineLevel: 1 }],
				[3, { rowIndex: 3, height: 14, hidden: true, collapsed: true }],
			]),
			dataValidations: [
				{
					sqref: "B2:B10",
					kind: "list",
					formula1: '"Open,Closed,Pending"',
					allowBlank: true,
					showDropDown: true,
					promptTitle: "Status",
					prompt: "Choose status",
					errorTitle: "Invalid",
					error: "Must be from list",
					errorStyle: "warning",
				},
				{
					sqref: "C2:C10",
					kind: "whole",
					operator: "between",
					formula1: "1",
					formula2: "100",
					allowBlank: false,
				},
			],
			pageSetup: {
				orientation: "landscape",
				paperSize: "A4",
				fitToWidth: 1,
				fitToHeight: 0,
				margins: {
					left: 0.5,
					right: 0.5,
					top: 0.8,
					bottom: 0.8,
					header: 0.25,
					footer: 0.25,
				},
				printTitleRows: "1:2",
				printTitleCols: "A:A",
				printArea: "A1:D20",
			},
			cells: new Map([
				[
					"A1",
					{
						value: "External Docs",
						type: "string",
						hyperlink: {
							target: "https://example.com/docs",
							display: "Docs Link",
							tooltip: "Open documentation",
						},
					},
				],
				[
					"A2",
					{
						value: "Go to HiddenSheet",
						type: "string",
						hyperlink: {
							location: "'HiddenSheet'!A1",
							tooltip: "Jump to hidden sheet",
						},
					},
				],
			]),
		};

		const sheet2: WorksheetModel = {
			name: "HiddenSheet",
			state: "hidden",
			cells: new Map([["A1", { value: 1, type: "number" }]]),
		};

		const sheet3: WorksheetModel = {
			name: "VeryHiddenSheet",
			state: "veryHidden",
			cells: new Map(),
		};

		const bytes = writeXlsxBytes(makeWorkbook([sheet1, sheet2, sheet3]));
		const pkg = extractOoxmlPackage(bytes);

		// Verify strict ECMA-376 element ordering in sheet1.xml
		const sheet1Xml = decodeUtf8(getRequiredEntry(pkg, "xl/worksheets/sheet1.xml"));
		expect(sheet1Xml).toContain('<pageSetUpPr fitToPage="1"/>');

		const orderedTags = [
			"<sheetPr>",
			"<dimension ",
			"<sheetViews>",
			"<sheetFormatPr ",
			"<cols>",
			"<sheetData>",
			"<autoFilter ",
			"<mergeCells ",
			"<dataValidations ",
			"<hyperlinks>",
			"<pageMargins ",
			"<pageSetup ",
		];
		let lastPos = -1;
		for (const tagToken of orderedTags) {
			const pos = sheet1Xml.indexOf(tagToken);
			expect(pos).toBeGreaterThan(lastPos);
			lastPos = pos;
		}

		// Verify absence of empty optional tags on sheet3.xml
		const sheet3Xml = decodeUtf8(getRequiredEntry(pkg, "xl/worksheets/sheet3.xml"));
		expect(sheet3Xml).not.toContain("<cols");
		expect(sheet3Xml).not.toContain("<mergeCells");
		expect(sheet3Xml).not.toContain("<dataValidations");
		expect(sheet3Xml).not.toContain("<hyperlinks");
		expect(sheet3Xml).not.toContain("<autoFilter");
		expect(sheet3Xml).not.toContain("<pageMargins");
		expect(sheet3Xml).not.toContain("<pageSetup");

		// Read back and verify all properties roundtrip
		const parsed = readXlsxBytes(bytes);
		expect(parsed.sheets).toHaveLength(3);

		const s1 = getRequiredSheet(parsed, 0);
		expect(s1.name).toBe("FullMeta");
		expect(s1.state).toBe("visible");
		expect(s1.showGridLines).toBe(false);
		expect(s1.tabColor).toBe("#2288DD");
		expect(s1.defaultRowHeight).toBe(18);
		expect(s1.defaultColWidth).toBe(12);
		expect(s1.freezePane).toEqual({ rows: 2, cols: 1 });
		expect(s1.autoFilterRef).toBe("A1:D10");
		expect(s1.merges).toEqual(["A1:B1", "C3:D4"]);
		expect(s1.columns).toEqual([
			{ min: 1, max: 2, width: 24.5, outlineLevel: 1 },
			{ min: 3, max: 3, width: 15, hidden: true },
		]);
		expect(s1.rowsMeta?.get(1)).toEqual({ rowIndex: 1, height: 28, outlineLevel: 1 });
		expect(s1.rowsMeta?.get(3)).toEqual({
			rowIndex: 3,
			height: 14,
			hidden: true,
			collapsed: true,
		});
		expect(s1.dataValidations).toEqual(sheet1.dataValidations);
		expect(s1.pageSetup).toEqual({
			orientation: "landscape",
			paperSize: "A4",
			fitToWidth: 1,
			fitToHeight: 0,
			margins: {
				left: 0.5,
				right: 0.5,
				top: 0.8,
				bottom: 0.8,
				header: 0.25,
				footer: 0.25,
			},
			printTitleRows: "1:2",
			printTitleCols: "A:A",
			printArea: "A1:D20",
		});
		expect(s1.cells.get("A1")?.hyperlink).toEqual({
			target: "https://example.com/docs",
			display: "Docs Link",
			tooltip: "Open documentation",
		});
		expect(s1.cells.get("A2")?.hyperlink).toEqual({
			location: "'HiddenSheet'!A1",
			tooltip: "Jump to hidden sheet",
		});

		expect(parsed.sheets[1]?.state).toBe("hidden");
		expect(parsed.sheets[2]?.state).toBe("veryHidden");
	});
});

describe("ooxml: Sparse, Prefixed & Format/Security Edge Cases", () => {
	it("reads sparse <row> and <c> without r attributes and self-closing styled <c r='A1' s='1'/>", () => {
		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Types xmlns="${CONTENT_TYPES_NS}">` +
					'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
					'<Default Extension="xml" ContentType="application/xml"/>' +
					'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
					"</Types>",
			),
			"_rels/.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
					"</Relationships>",
			),
			"xl/workbook.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
					'<sheets><sheet name="Sparse" sheetId="1" r:id="rId1"/></sheets>' +
					"</workbook>",
			),
			"xl/_rels/workbook.xml.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
					`<Relationship Id="rId2" Type="${OFFICE_REL_NS}/styles" Target="styles.xml"/>` +
					"</Relationships>",
			),
			"xl/styles.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<styleSheet xmlns="${SPREADSHEET_NS}">` +
					'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
					'<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
					'<borders count="1"><border><left/><right/><top/><bottom/></border></borders>' +
					'<cellXfs count="2"><xf fontId="0" fillId="0" borderId="0"/><xf fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs>' +
					"</styleSheet>",
			),
			"xl/worksheets/sheet1.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<worksheet xmlns="${SPREADSHEET_NS}">` +
					"<sheetData>" +
					"<row>" +
					'<c r="A1" s="1"/>' +
					"<c><v>10</v></c>" +
					'<c t="inlineStr"><is><t>ThirdCol</t></is></c>' +
					"</row>" +
					"<row>" +
					"<c><v>20</v></c>" +
					"</row>" +
					"</sheetData>" +
					"</worksheet>",
			),
		};

		const wb = readXlsxBytes(packOoxmlPackage(entries));
		const sheet = getRequiredSheet(wb, 0);
		expect(sheet.cells.get("A1")).toMatchObject({
			value: null,
			type: "empty",
			style: { font: { bold: true, size: 11, family: "Calibri" } },
		});
		expect(sheet.cells.get("B1")?.value).toBe(10);
		expect(sheet.cells.get("C1")?.value).toBe("ThirdCol");
		expect(sheet.cells.get("A2")?.value).toBe(20);
	});

	it("reads namespace-prefixed XML (<x:workbook>, <x:worksheet>, <x:row>, <x:c>) and shared formulas", () => {
		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Types xmlns="${CONTENT_TYPES_NS}">` +
					'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
					'<Default Extension="xml" ContentType="application/xml"/>' +
					"</Types>",
			),
			"_rels/.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
					"</Relationships>",
			),
			"xl/workbook.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<x:workbook xmlns:x="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
					'<x:sheets><x:sheet name="Prefixed" sheetId="1" r:id="rId1"/></x:sheets>' +
					"</x:workbook>",
			),
			"xl/_rels/workbook.xml.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
					"</Relationships>",
			),
			"xl/worksheets/sheet1.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<x:worksheet xmlns:x="${SPREADSHEET_NS}">` +
					"<x:sheetData>" +
					'<x:row r="2">' +
					'<x:c r="A2"><x:v>1</x:v></x:c>' +
					'<x:c r="B2"><x:v>2</x:v></x:c>' +
					'<x:c r="C2"><x:f t="shared" ref="C2:C4" si="0">A2+B2</x:f><x:v>3</x:v></x:c>' +
					"</x:row>" +
					'<x:row r="3">' +
					'<x:c r="A3"><x:v>10</x:v></x:c>' +
					'<x:c r="B3"><x:v>20</x:v></x:c>' +
					'<x:c r="C3"><x:f t="shared" si="0"/><x:v>30</x:v></x:c>' +
					"</x:row>" +
					'<x:row r="4">' +
					'<x:c r="A4"><x:v>100</x:v></x:c>' +
					'<x:c r="B4"><x:v>200</x:v></x:c>' +
					'<x:c r="C4"><x:f t="shared" si="0"/><x:v>300</x:v></x:c>' +
					"</x:row>" +
					"</x:sheetData>" +
					"</x:worksheet>",
			),
		};

		const wb = readXlsxBytes(packOoxmlPackage(entries));
		expect(wb.sheets).toHaveLength(1);
		const sheet = getRequiredSheet(wb, 0);
		expect(sheet.name).toBe("Prefixed");
		expect(sheet.cells.get("C2")?.formula).toMatchObject({
			expression: "A2+B2",
			kind: "shared",
			sharedGroup: 0,
			ref: "C2:C4",
			cachedResult: 3,
		});
		expect(sheet.cells.get("C3")?.formula).toMatchObject({
			expression: "A3+B3",
			kind: "shared",
			sharedGroup: 0,
			cachedResult: 30,
		});
		expect(sheet.cells.get("C4")?.formula).toMatchObject({
			expression: "A4+B4",
			kind: "shared",
			sharedGroup: 0,
			cachedResult: 300,
		});
	});

	it("extracts records from OOXML tables via readNamedTable and resolves global vs sheet-scoped definedNames via resolveDefinedName", () => {
		const baseBytes = writeXlsxBytes({
			dateSystem: 1900,
			sheets: [
				{
					name: "Sales",
					cells: new Map([
						["A1", { value: "Product", type: "string" }],
						["B1", { value: "Revenue", type: "string" }],
						["A2", { value: "Widget", type: "string" }],
						["B2", { value: 250, type: "number" }],
						["A3", { value: "Gadget", type: "string" }],
						["B3", { value: 400, type: "number" }],
						["A4", { value: "Total", type: "string" }],
						["B4", { value: 650, type: "number" }],
					]),
				},
				{
					name: "Summary",
					cells: new Map([["C5", { value: 999, type: "number" }]]),
				},
			],
			definedNames: [
				{ name: "TaxRate", formula: "'Sales'!$B$2:$B$3" },
				{ name: "ScopedMetric", localSheetId: 0, formula: "'Sales'!$B$2" },
				{ name: "ScopedMetric", localSheetId: 1, formula: "'Summary'!$C$5" },
			],
		});

		const entries = extractOoxmlPackage(baseBytes);
		// Inject xl/tables/table1.xml and relationship on sheet1
		entries["xl/tables/table1.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<table xmlns="${SPREADSHEET_NS}" id="1" name="SalesTable" displayName="SalesTable" ref="A1:B4" headerRowCount="1" totalsRowCount="1">` +
				'<autoFilter ref="A1:B3"/>' +
				'<tableColumns count="2">' +
				'<tableColumn id="1" name="Product" totalsRowLabel="Total"/>' +
				'<tableColumn id="2" name="Revenue" totalsRowFunction="sum"/>' +
				"</tableColumns>" +
				'<tableStyleInfo name="TableStyleMedium2"/>' +
				"</table>",
		);
		entries["xl/worksheets/_rels/sheet1.xml.rels"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<Relationships xmlns="${PKG_REL_NS}">` +
				`<Relationship Id="rIdTable1" Type="${OFFICE_REL_NS}/table" Target="../tables/table1.xml"/>` +
				"</Relationships>",
		);
		const s1Xml = decodeUtf8(getRequiredEntry(entries, "xl/worksheets/sheet1.xml"));
		entries["xl/worksheets/sheet1.xml"] = encodeUtf8(
			s1Xml.replace(
				"</worksheet>",
				'<tableParts count="1"><tablePart r:id="rIdTable1"/></tableParts></worksheet>',
			),
		);

		const wb = readXlsxBytes(packOoxmlPackage(entries));
		expect(wb.tables).toHaveLength(1);

		const namedTable = readNamedTable(wb, "salestable");
		expect(namedTable).not.toBeNull();
		expect(namedTable?.records).toEqual([
			{ Product: "Widget", Revenue: 250 },
			{ Product: "Gadget", Revenue: 400 },
		]);
		expect(readNamedTable(wb, "NonExistentTable")).toBeNull();

		// Global defined name
		const globalResolved = resolveDefinedName(wb, "taxrate");
		expect(globalResolved).toMatchObject({
			sheetName: "Sales",
			ref: "B2:B3",
		});

		// Sheet-scoped defined name resolution
		const salesScoped = resolveDefinedName(wb, "ScopedMetric", { sheetName: "Sales" });
		expect(salesScoped).toMatchObject({
			sheetName: "Sales",
			ref: "B2",
		});

		const summaryScoped = resolveDefinedName(wb, "ScopedMetric", { sheetName: "Summary" });
		expect(summaryScoped).toMatchObject({
			sheetName: "Summary",
			ref: "C5",
		});

		// readNamedTable with sheet-qualified table.ref ('My Sheet'!A1:B3)
		const qualifiedWb: WorkbookModel = {
			dateSystem: 1900,
			sheets: [
				{
					name: "My Sheet",
					cells: new Map([
						["A1", { value: "Item", type: "string" }],
						["B1", { value: "Qty", type: "string" }],
						["A2", { value: "Alpha", type: "string" }],
						["B2", { value: 10, type: "number" }],
						["A3", { value: "Beta", type: "string" }],
						["B3", { value: 25, type: "number" }],
					]),
				},
			],
			tables: [
				{
					name: "QualifiedTable",
					sheetName: "My Sheet",
					ref: "'My Sheet'!A1:B3",
					columns: [
						{ id: 1, name: "Item" },
						{ id: 2, name: "Qty" },
					],
					headerRowCount: 1,
					totalsRowCount: 0,
				},
			],
		};
		const qualifiedResult = readNamedTable(qualifiedWb, "QualifiedTable");
		expect(qualifiedResult).not.toBeNull();
		expect(qualifiedResult?.records).toEqual([
			{ Item: "Alpha", Qty: 10 },
			{ Item: "Beta", Qty: 25 },
		]);
	});

	it('expands range <hyperlink ref="A1:A3"/> across A1, A2, A3 on read and re-writes via writeXlsxBytes without INVALID_CELL_REF', () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Links",
					cells: new Map([
						["A1", { value: "Row 1", type: "string" }],
						["A2", { value: "Row 2", type: "string" }],
						["A3", { value: "Row 3", type: "string" }],
					]),
				},
			]),
		);

		const entries = extractOoxmlPackage(baseBytes);
		entries["xl/worksheets/_rels/sheet1.xml.rels"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<Relationships xmlns="${PKG_REL_NS}">` +
				`<Relationship Id="rIdH1" Type="${OFFICE_REL_NS}/hyperlink" Target="https://example.com/range" TargetMode="External"/>` +
				"</Relationships>",
		);
		const rawSheetXml = decodeUtf8(getRequiredEntry(entries, "xl/worksheets/sheet1.xml"));
		entries["xl/worksheets/sheet1.xml"] = encodeUtf8(
			rawSheetXml.replace(
				"</worksheet>",
				'<hyperlinks><hyperlink ref="A1:A3" r:id="rIdH1" tooltip="Shared link"/></hyperlinks></worksheet>',
			),
		);

		const readWb = readXlsxBytes(packOoxmlPackage(entries));
		const readSheet = getRequiredSheet(readWb, 0);
		for (const ref of ["A1", "A2", "A3"]) {
			expect(readSheet.cells.get(ref)?.hyperlink).toEqual({
				target: "https://example.com/range",
				tooltip: "Shared link",
			});
		}

		// Re-writing via writeXlsxBytes must succeed without throwing INVALID_CELL_REF
		const rewrittenBytes = writeXlsxBytes(readWb);
		const roundtripped = readXlsxBytes(rewrittenBytes);
		const rtSheet = getRequiredSheet(roundtripped, 0);
		for (const ref of ["A1", "A2", "A3"]) {
			expect(rtSheet.cells.get(ref)?.hyperlink).toEqual({
				target: "https://example.com/range",
				tooltip: "Shared link",
			});
		}
	});

	it('reads ISO t="d" cells including lowercase "z" and rejects invalid calendar rollovers like "2026-02-31"', () => {
		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Types xmlns="${CONTENT_TYPES_NS}">` +
					'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
					'<Default Extension="xml" ContentType="application/xml"/>' +
					"</Types>",
			),
			"_rels/.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
					"</Relationships>",
			),
			"xl/workbook.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
					'<sheets><sheet name="IsoDates" sheetId="1" r:id="rId1"/></sheets>' +
					"</workbook>",
			),
			"xl/_rels/workbook.xml.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
					"</Relationships>",
			),
			"xl/worksheets/sheet1.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<worksheet xmlns="${SPREADSHEET_NS}">` +
					"<sheetData>" +
					'<row r="1">' +
					'<c r="A1" t="d"><v>2026-03-15T10:30:00Z</v></c>' +
					'<c r="A2" t="d"><v>2026-03-15T10:30:00z</v></c>' +
					'<c r="A3" t="d"><v>2026-03-15</v></c>' +
					'<c r="A4" t="d"><v>2026-02-31</v></c>' +
					"</row>" +
					"</sheetData>" +
					"</worksheet>",
			),
		};

		const wb = readXlsxBytes(packOoxmlPackage(entries));
		const sheet = getRequiredSheet(wb, 0);

		expect(sheet.cells.get("A1")?.type).toBe("date");
		expect((sheet.cells.get("A1")?.value as Date).toISOString()).toBe("2026-03-15T10:30:00.000Z");

		expect(sheet.cells.get("A2")?.type).toBe("date");
		expect((sheet.cells.get("A2")?.value as Date).toISOString()).toBe("2026-03-15T10:30:00.000Z");

		expect(sheet.cells.get("A3")?.type).toBe("date");
		expect((sheet.cells.get("A3")?.value as Date).toISOString()).toBe("2026-03-15T00:00:00.000Z");

		// Invalid calendar date must not silently roll over to 2026-03-03
		expect(sheet.cells.get("A4")?.type).toBe("string");
		expect(sheet.cells.get("A4")?.value).toBe("2026-02-31");
	});

	it("rejects .xls (OLE2), .ods, and .xlsb with UNSUPPORTED_FORMAT and corrupt bytes with CORRUPT_ARCHIVE", () => {
		// 1. OLE2 .xls magic bytes: D0 CF 11 E0 A1 B1 1A E1
		const ole2Bytes = new Uint8Array([
			0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00,
		]);
		try {
			readXlsxBytes(ole2Bytes);
			expect.unreachable("Expected OLE2 bytes to throw UNSUPPORTED_FORMAT");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("UNSUPPORTED_FORMAT");
		}

		// 2. .ods package
		const odsBytes = packOoxmlPackage({
			mimetype: encodeUtf8("application/vnd.oasis.opendocument.spreadsheet"),
		});
		try {
			readXlsxBytes(odsBytes);
			expect.unreachable("Expected .ods archive to throw UNSUPPORTED_FORMAT");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("UNSUPPORTED_FORMAT");
		}

		// 3. .xlsb package with xl/workbook.bin
		const xlsbBytes = packOoxmlPackage({
			"xl/workbook.bin": new Uint8Array([1, 2, 3, 4]),
		});
		try {
			readXlsxBytes(xlsbBytes);
			expect.unreachable("Expected .xlsb archive to throw UNSUPPORTED_FORMAT");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("UNSUPPORTED_FORMAT");
		}

		// 4. Random corrupt bytes
		const corruptBytes = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
		try {
			readXlsxBytes(corruptBytes);
			expect.unreachable("Expected corrupt bytes to throw CORRUPT_ARCHIVE");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("CORRUPT_ARCHIVE");
		}
	});

	it("validates sheet names on write (INVALID_CONFIG), enforces maxSheets and maxCells (LIMIT_EXCEEDED), and supports sheetFilter", () => {
		const invalidSheetBookCases: WorksheetModel[][] = [
			[], // empty sheets array
			[{ name: "A".repeat(32), cells: new Map() }], // >31 chars
			[{ name: "Bad/Name", cells: new Map() }],
			[{ name: String.raw`Bad\Name`, cells: new Map() }],
			[{ name: "Bad?Name", cells: new Map() }],
			[{ name: "Bad*Name", cells: new Map() }],
			[{ name: "Bad[Name]", cells: new Map() }],
			[{ name: "Bad:Name", cells: new Map() }],
			[{ name: "'LeadingQuote", cells: new Map() }],
			[{ name: "TrailingQuote'", cells: new Map() }],
			[
				{ name: "Report", cells: new Map() },
				{ name: "report", cells: new Map() },
			], // duplicate case-insensitive
		];

		for (const sheets of invalidSheetBookCases) {
			try {
				writeXlsxBytes(makeWorkbook(sheets));
				expect.unreachable("Expected invalid sheet config to throw INVALID_CONFIG");
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) expect(error.code).toBe("INVALID_CONFIG");
			}
		}

		const multiSheetBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Alpha",
					cells: new Map([
						["A1", { value: 1, type: "number" }],
						["A2", { value: 2, type: "number" }],
					]),
				},
				{
					name: "Beta",
					cells: new Map([
						["A1", { value: 3, type: "number" }],
						["A2", { value: 4, type: "number" }],
					]),
				},
				{
					name: "Gamma",
					cells: new Map([["A1", { value: 5, type: "number" }]]),
				},
			]),
		);

		// maxSheets limit
		try {
			readXlsxBytes(multiSheetBytes, { maxSheets: 2 });
			expect.unreachable("Expected maxSheets: 2 to throw LIMIT_EXCEEDED");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("LIMIT_EXCEEDED");
		}

		// maxCells limit
		try {
			readXlsxBytes(multiSheetBytes, { maxCells: 3 });
			expect.unreachable("Expected maxCells: 3 to throw LIMIT_EXCEEDED");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("LIMIT_EXCEEDED");
		}

		// sheetFilter array & predicate
		const filteredArray = readXlsxBytes(multiSheetBytes, { sheetFilter: ["beta"] });
		expect(filteredArray.sheets.map((s) => s.name)).toEqual(["Beta"]);

		const filteredPredicate = readXlsxBytes(multiSheetBytes, {
			sheetFilter: (name) => name.startsWith("G") || name.startsWith("A"),
		});
		expect(filteredPredicate.sheets.map((s) => s.name)).toEqual(["Alpha", "Gamma"]);
	});

	it("supports readXlsxBytes feature flags (includeComments for classic & threaded comments, includeValidations, includeHyperlinks, includeTables)", () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "FlagsSheet",
					dataValidations: [
						{
							sqref: "A1:A5",
							kind: "list",
							formula1: '"One,Two"',
						},
					],
					cells: new Map([
						[
							"A1",
							{
								value: "One",
								type: "string",
								hyperlink: {
									target: "https://example.com",
									tooltip: "Example",
								},
							},
						],
						["B1", { value: "ThreadedTarget", type: "string" }],
					]),
				},
			]),
		);

		const entries = extractOoxmlPackage(baseBytes);
		entries["xl/comments1.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<comments xmlns="${SPREADSHEET_NS}">` +
				"<authors><author>Alice</author></authors>" +
				'<commentList><comment ref="A1" authorId="0"><text><t>Classic review note</t></text></comment></commentList>' +
				"</comments>",
		);
		entries["xl/threadedComments/threadedComment1.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				'<ThreadedComments xmlns="http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments">' +
				'<threadedComment ref="B1" personId="p1"><text>First reply</text></threadedComment>' +
				'<threadedComment ref="B1" personId="p1"><text>Second reply</text></threadedComment>' +
				"</ThreadedComments>",
		);
		entries["xl/persons/person.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				'<personList xmlns="http://schemas.microsoft.com/office/spreadsheetml/2018/threadedcomments">' +
				'<person id="p1" displayName="Bob"/>' +
				"</personList>",
		);
		entries["xl/tables/table1.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<table xmlns="${SPREADSHEET_NS}" id="1" name="FlagTable" displayName="FlagTable" ref="A1:B1">` +
				'<tableColumns count="2"><tableColumn id="1" name="Col1"/><tableColumn id="2" name="Col2"/></tableColumns>' +
				"</table>",
		);
		const wbRelsXml = decodeUtf8(getRequiredEntry(entries, "xl/_rels/workbook.xml.rels"));
		entries["xl/_rels/workbook.xml.rels"] = encodeUtf8(
			`${wbRelsXml.slice(0, -"</Relationships>".length)}<Relationship Id="rIdPerson1" Type="${OFFICE_REL_NS}/person" Target="persons/person.xml"/></Relationships>`,
		);
		const sheetRelsXml = decodeUtf8(
			getRequiredEntry(entries, "xl/worksheets/_rels/sheet1.xml.rels"),
		);
		entries["xl/worksheets/_rels/sheet1.xml.rels"] = encodeUtf8(
			`${sheetRelsXml.slice(0, -"</Relationships>".length)}<Relationship Id="rIdComment1" Type="${OFFICE_REL_NS}/comments" Target="../comments1.xml"/>` +
				`<Relationship Id="rIdThreaded1" Type="${OFFICE_REL_NS}/threadedComments" Target="../threadedComments/threadedComment1.xml"/>` +
				`<Relationship Id="rIdTable1" Type="${OFFICE_REL_NS}/table" Target="../tables/table1.xml"/>` +
				"</Relationships>",
		);

		const fullPkgBytes = packOoxmlPackage(entries);

		// 1. Default flags (all true)
		const wbAll = readXlsxBytes(fullPkgBytes);
		const sAll = getRequiredSheet(wbAll, 0);
		expect(sAll.cells.get("A1")?.comment).toEqual({
			author: "Alice",
			text: "Classic review note",
		});
		expect(sAll.cells.get("B1")?.comment).toEqual({
			author: "Bob",
			text: "First reply\nSecond reply",
			threaded: true,
		});
		expect(sAll.cells.get("A1")?.hyperlink).toEqual({
			target: "https://example.com",
			tooltip: "Example",
		});
		expect(sAll.dataValidations).toHaveLength(1);
		expect(wbAll.tables).toHaveLength(1);

		// 2. All optional feature flags disabled
		const wbDisabled = readXlsxBytes(fullPkgBytes, {
			includeComments: false,
			includeValidations: false,
			includeHyperlinks: false,
			includeTables: false,
		});
		const sDisabled = getRequiredSheet(wbDisabled, 0);
		expect(sDisabled.cells.get("A1")?.comment).toBeUndefined();
		expect(sDisabled.cells.get("B1")?.comment).toBeUndefined();
		expect(sDisabled.cells.get("A1")?.hyperlink).toBeUndefined();
		expect(sDisabled.dataValidations).toBeUndefined();
		expect(wbDisabled.tables).toBeUndefined();
	});
});

describe("ooxml: Surgical Patcher (createPatchSession, patchXlsxBytes)", () => {
	it("preserves untouched ZIP entries and untouched worksheet elements byte-for-byte in a simulated .xlsm package", () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Sheet1",
					cells: new Map([
						["A1", { value: "Original", type: "string" }],
						["B1", { value: 100, type: "number" }],
					]),
				},
				{
					name: "Sheet2",
					cells: new Map([["A1", { value: "UntouchedSheet2", type: "string" }]]),
				},
			]),
		);

		const entries = extractOoxmlPackage(baseBytes);
		const vbaBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x42, 0x99, 0x10]);
		const commentsXmlBytes = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<comments xmlns="${SPREADSHEET_NS}">` +
				"<authors><author>Alice</author></authors>" +
				'<commentList><comment ref="A1" authorId="0"><text><t>Keep me!</t></text></comment></commentList>' +
				"</comments>",
		);
		entries["xl/vbaProject.bin"] = vbaBytes;
		entries["xl/comments1.xml"] = commentsXmlBytes;

		const conditionalFormattingBlock =
			'<conditionalFormatting sqref="B1:B10"><cfRule type="cellIs" dxfId="0" priority="1" operator="greaterThan"><formula>50</formula></cfRule></conditionalFormatting>';
		const rawSheet1Xml = decodeUtf8(getRequiredEntry(entries, "xl/worksheets/sheet1.xml"));
		const sheet1OriginalXml = `${rawSheet1Xml.slice(0, -"</worksheet>".length)}${conditionalFormattingBlock}</worksheet>`;
		entries["xl/worksheets/sheet1.xml"] = encodeUtf8(sheet1OriginalXml);

		const originalSheet2Bytes = new Uint8Array(
			getRequiredEntry(entries, "xl/worksheets/sheet2.xml"),
		);
		const xlsmInputBytes = packOoxmlPackage(entries);

		const patchedBytes = patchXlsxBytes(xlsmInputBytes, (session) => {
			session.setCellValue("Sheet1", "B1", 999);
		});

		const patchedEntries = extractOoxmlPackage(patchedBytes);
		expect(patchedEntries["xl/vbaProject.bin"]).toEqual(vbaBytes);
		expect(patchedEntries["xl/comments1.xml"]).toEqual(commentsXmlBytes);
		expect(patchedEntries["xl/worksheets/sheet2.xml"]).toEqual(originalSheet2Bytes);

		const patchedSheet1Xml = decodeUtf8(
			getRequiredEntry(patchedEntries, "xl/worksheets/sheet1.xml"),
		);
		expect(patchedSheet1Xml).toContain(conditionalFormattingBlock);

		const reparsed = readXlsxBytes(patchedBytes);
		expect(reparsed.sheets[0]?.cells.get("B1")?.value).toBe(999);
		expect(reparsed.sheets[0]?.cells.get("A1")?.value).toBe("Original");
		expect(reparsed.sheets[1]?.cells.get("A1")?.value).toBe("UntouchedSheet2");
	});

	it("supports cell mutations: setCellValue (style preserve/override, inline & shared string tail-append), setFormula, setCachedResult, setCellStyle (non-shifting), clearCellValue, and deleteCell", () => {
		const initialBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Mutations",
					cells: new Map([
						[
							"A1",
							{
								value: 10,
								type: "number",
								style: { fg: "#AA0000", font: { bold: true } },
							},
						],
						[
							"A2",
							{
								value: "KeepStyleOnClear",
								type: "string",
								style: { bg: "#00FF00" },
							},
						],
						["A3", { value: "DeleteMe", type: "string" }],
						["B1", { value: "ExistingShared", type: "string" }],
					]),
				},
			]),
			{ useSharedStrings: true },
		);

		const beforePkg = extractOoxmlPackage(initialBytes);
		const beforeSheetXml = decodeUtf8(getRequiredEntry(beforePkg, "xl/worksheets/sheet1.xml"));
		const a1StyleIdx = /<c r="A1" s="(\d+)"/.exec(beforeSheetXml)?.[1];
		const a2StyleIdx = /<c r="A2" s="(\d+)"/.exec(beforeSheetXml)?.[1];
		expect(a1StyleIdx).toBeDefined();
		expect(a2StyleIdx).toBeDefined();

		const patchedBytes = patchXlsxBytes(initialBytes, (session) => {
			// 1. setCellValue preserving existing s="..."
			session.setCellValue("Mutations", "A1", 42);
			// 2. setCellValue with inline string vs shared string tail-append
			session.setCellValue("Mutations", "C1", "InlineStringPatch", {
				stringMode: "inline",
			});
			session.setCellValue("Mutations", "C2", "AppendedSharedString", {
				stringMode: "shared",
			});
			// 3. setFormula + setCachedResult
			session.setFormula("Mutations", "D1", "A1*2", 84);
			session.setCachedResult("Mutations", "D1", 840);
			// 4. setCellStyle (appends new xf to xl/styles.xml without shifting A1/A2 style indices)
			session.setCellStyle("Mutations", "E1", {
				bg: "#123456",
				font: { italic: true },
			});
			// 5. clearCellValue (clears content while keeping s="...")
			session.clearCellValue("Mutations", "A2");
			// 6. deleteCell
			session.deleteCell("Mutations", "A3");
		});

		const afterPkg = extractOoxmlPackage(patchedBytes);
		const afterSheetXml = decodeUtf8(getRequiredEntry(afterPkg, "xl/worksheets/sheet1.xml"));

		// Verify A1 and A2 kept their exact original style indices (non-shifting)
		expect(afterSheetXml).toContain(`<c r="A1" s="${String(a1StyleIdx)}"><v>42</v></c>`);
		expect(afterSheetXml).toContain(`<c r="A2" s="${String(a2StyleIdx)}"/>`);
		expect(afterSheetXml).not.toContain('r="A3"');
		expect(afterSheetXml).toContain('r="C1" t="inlineStr"');
		expect(afterSheetXml).toContain('r="C2" t="s"');

		const wb = readXlsxBytes(patchedBytes);
		const s = getRequiredSheet(wb, 0);
		expect(s.cells.get("A1")?.value).toBe(42);
		expect(s.cells.get("A1")?.style?.fg).toBe("#AA0000");
		expect(s.cells.get("A2")?.value).toBeNull();
		expect(s.cells.get("A2")?.style?.bg).toBe("#00FF00");
		expect(s.cells.has("A3")).toBe(false);
		expect(s.cells.get("B1")?.value).toBe("ExistingShared");
		expect(s.cells.get("C1")?.value).toBe("InlineStringPatch");
		expect(s.cells.get("C2")?.value).toBe("AppendedSharedString");
		expect(s.cells.get("D1")?.formula).toMatchObject({
			expression: "A1*2",
			cachedResult: 840,
		});
		expect(s.cells.get("E1")?.style).toMatchObject({
			bg: "#123456",
			font: { italic: true },
		});
	});

	it("promotes the next slave in a shared-formula group when the master cell is overwritten or deleted, and rejects interior array-formula mutations with PATCH_FAILED", () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Formulas",
					cells: new Map([
						["A2", { value: 1, type: "number" }],
						["B2", { value: 2, type: "number" }],
						["A3", { value: 3, type: "number" }],
						["B3", { value: 4, type: "number" }],
						["A4", { value: 5, type: "number" }],
						["B4", { value: 6, type: "number" }],
					]),
				},
			]),
		);

		const entries = extractOoxmlPackage(baseBytes);
		entries["xl/worksheets/sheet1.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<worksheet xmlns="${SPREADSHEET_NS}">` +
				"<sheetData>" +
				'<row r="2">' +
				'<c r="A2"><v>1</v></c>' +
				'<c r="B2"><v>2</v></c>' +
				'<c r="C2"><f t="shared" ref="C2:C4" si="0">A2+B2</f><v>3</v></c>' +
				'<c r="D2"><f t="array" ref="D2:D3">A2:A3*B2:B3</f><v>2</v></c>' +
				"</row>" +
				'<row r="3">' +
				'<c r="A3"><v>3</v></c>' +
				'<c r="B3"><v>4</v></c>' +
				'<c r="C3"><f t="shared" si="0"/><v>7</v></c>' +
				'<c r="D3"><v>12</v></c>' +
				"</row>" +
				'<row r="4">' +
				'<c r="A4"><v>5</v></c>' +
				'<c r="B4"><v>6</v></c>' +
				'<c r="C4"><f t="shared" si="0"/><v>11</v></c>' +
				"</row>" +
				"</sheetData>" +
				"</worksheet>",
		);
		const pkgWithSharedAndArray = packOoxmlPackage(entries);

		// 1. Mutating an interior cell or the master cell of a multi-cell array formula must throw PATCH_FAILED
		for (const arrayCellRef of ["D2", "D3"]) {
			try {
				patchXlsxBytes(pkgWithSharedAndArray, (session) => {
					session.setCellValue("Formulas", arrayCellRef, 999);
				});
				expect.unreachable(
					`Expected mutating "${arrayCellRef}" inside multi-cell array formula to throw PATCH_FAILED`,
				);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) expect(error.code).toBe("PATCH_FAILED");
			}
		}

		// 2. Overwriting shared formula master C2 promotes C3 to master so C3 and C4 remain valid
		const patchedShared = patchXlsxBytes(pkgWithSharedAndArray, (session) => {
			session.setCellValue("Formulas", "C2", 1000);
		});
		const wb = readXlsxBytes(patchedShared);
		const s = getRequiredSheet(wb, 0);
		expect(s.cells.get("C2")?.value).toBe(1000);
		expect(s.cells.get("C2")?.formula).toBeUndefined();
		expect(s.cells.get("C3")?.formula?.expression).toBe("A3+B3");
		expect(s.cells.get("C4")?.formula?.expression).toBe("A4+B4");

		// 3. Mutating an interior slave cell (C3) materializes C2 and C4 into standalone normal formulas without corruption
		const patchedSlaveBytes = patchXlsxBytes(pkgWithSharedAndArray, (session) => {
			session.setCellValue("Formulas", "C3", 777);
		});
		const patchedSlavePkg = extractOoxmlPackage(patchedSlaveBytes);
		const patchedSlaveXml = decodeUtf8(
			getRequiredEntry(patchedSlavePkg, "xl/worksheets/sheet1.xml"),
		);
		expect(patchedSlaveXml).toContain("<c r=\"C2\"><f>A2+B2</f><v>3</v></c>");
		expect(patchedSlaveXml).toContain("<c r=\"C4\"><f>A4+B4</f><v>11</v></c>");

		const wbSlave = readXlsxBytes(patchedSlaveBytes);
		const sSlave = getRequiredSheet(wbSlave, 0);
		expect(sSlave.cells.get("C2")?.formula).toMatchObject({
			expression: "A2+B2",
			kind: "normal",
			cachedResult: 3,
		});
		expect(sSlave.cells.get("C3")?.value).toBe(777);
		expect(sSlave.cells.get("C3")?.formula).toBeUndefined();
		expect(sSlave.cells.get("C4")?.formula).toMatchObject({
			expression: "A4+B4",
			kind: "normal",
			cachedResult: 11,
		});
	});

	it("patches row height/hidden, col width/hidden, sheet visibility, external hyperlinks (upserting xmlns:r), data validations, and preserves x: namespace prefixes", () => {
		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Types xmlns="${CONTENT_TYPES_NS}">` +
					'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
					'<Default Extension="xml" ContentType="application/xml"/>' +
					"</Types>",
			),
			"_rels/.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
					"</Relationships>",
			),
			"xl/workbook.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<x:workbook xmlns:x="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
					'<x:sheets><x:sheet name="PrefixedSheet" sheetId="1" r:id="rId1"/></x:sheets>' +
					"</x:workbook>",
			),
			"xl/_rels/workbook.xml.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
					"</Relationships>",
			),
			// Notice no xmlns:r on <x:worksheet> initially
			"xl/worksheets/sheet1.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<x:worksheet xmlns:x="${SPREADSHEET_NS}">` +
					"<x:sheetData>" +
					'<x:row r="1"><x:c r="A1"><x:v>10</x:v></x:c></x:row>' +
					"</x:sheetData>" +
					"</x:worksheet>",
			),
		};

		const baseBytes = packOoxmlPackage(entries);
		const patchedBytes = patchXlsxBytes(baseBytes, (session) => {
			session
				.setCellValue("PrefixedSheet", "B2", 55)
				.setRowHidden("PrefixedSheet", 1, true)
				.setRowHeight("PrefixedSheet", 2, 32)
				.setColWidth("PrefixedSheet", [1, 2], 22)
				.setColHidden("PrefixedSheet", 3, true)
				.setSheetVisibility("PrefixedSheet", "hidden")
				.addHyperlink("PrefixedSheet", "A1", {
					target: "https://example.org",
					tooltip: "Example Org",
				})
				.setDataValidation("PrefixedSheet", {
					sqref: "B2:B5",
					kind: "list",
					formula1: '"Yes,No"',
				});
		});

		const patchedPkg = extractOoxmlPackage(patchedBytes);
		const patchedSheetXml = decodeUtf8(getRequiredEntry(patchedPkg, "xl/worksheets/sheet1.xml"));

		// Verify x: prefix inheritance and xmlns:r upsert on <x:worksheet>
		expect(patchedSheetXml).toContain(`xmlns:r="${OFFICE_REL_NS}"`);
		expect(patchedSheetXml).toContain("<x:cols>");
		expect(patchedSheetXml).toContain('<x:row r="2"');
		expect(patchedSheetXml).toContain('<x:c r="B2">');
		expect(patchedSheetXml).toContain("<x:dataValidations ");
		expect(patchedSheetXml).toContain("<x:hyperlinks>");

		const reparsed = readXlsxBytes(patchedBytes);
		const s = getRequiredSheet(reparsed, 0);
		expect(s.state).toBe("hidden");
		expect(s.rowsMeta?.get(1)?.hidden).toBe(true);
		expect(s.rowsMeta?.get(2)?.height).toBe(32);
		expect(s.columns).toEqual([
			{ min: 1, max: 2, width: 22 },
			{ min: 3, max: 3, width: 10, hidden: true },
		]);
		expect(s.cells.get("A1")?.hyperlink).toEqual({
			target: "https://example.org",
			tooltip: "Example Org",
		});
		expect(s.dataValidations).toEqual([
			{
				sqref: "B2:B5",
				kind: "list",
				formula1: '"Yes,No"',
			},
		]);
	});

	it("supports formula cache policies (onFormulaCache: 'clear' and recalculate(mockEvaluator)) and convertTemplateToWorkbook: true", () => {
		const baseBytes = writeXlsxBytes({
			dateSystem: 1900,
			sourceFormat: "xltx",
			sheets: [
				{
					name: "CalcSheet",
					cells: new Map([
						["A1", { value: 10, type: "number" }],
						[
							"B1",
							{
								value: 20,
								type: "number",
								formula: { expression: "A1*2", cachedResult: 20 },
							},
						],
					]),
				},
			],
		});

		// Inject a simulated xl/calcChain.xml to verify removal on onFormulaCache: "clear"
		const entries = extractOoxmlPackage(baseBytes);
		entries["xl/calcChain.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<calcChain xmlns="${SPREADSHEET_NS}"><c r="B1" i="1"/></calcChain>`,
		);
		const bytesWithCalcChain = packOoxmlPackage(entries);

		// 1. onFormulaCache: "clear" + convertTemplateToWorkbook: true
		const clearedBytes = patchXlsxBytes(
			bytesWithCalcChain,
			(session) => {
				session.setCellValue("CalcSheet", "A1", 50);
			},
			{ onFormulaCache: "clear", convertTemplateToWorkbook: true },
		);

		const clearedPkg = extractOoxmlPackage(clearedBytes);
		expect(clearedPkg["xl/calcChain.xml"]).toBeUndefined();
		const wbXml = decodeUtf8(getRequiredEntry(clearedPkg, "xl/workbook.xml"));
		expect(wbXml).toContain('fullCalcOnLoad="1"');
		const ctXml = decodeUtf8(getRequiredEntry(clearedPkg, "[Content_Types].xml"));
		expect(ctXml).toContain(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
		);
		expect(ctXml).not.toContain("template.main+xml");

		const clearedWb = readXlsxBytes(clearedBytes);
		expect(clearedWb.sourceFormat).toBe("xlsx");
		expect(clearedWb.sheets[0]?.cells.get("B1")?.formula?.cachedResult).toBeUndefined();

		// 2. recalculate(mockEvaluator)
		const mockEvaluator: FormulaEvaluator = {
			recalculate(_workbook, changedCells) {
				expect([...changedCells]).toEqual([{ sheetName: "CalcSheet", ref: "A1" }]);
				return [{ sheetName: "CalcSheet", ref: "B1", value: 100 }];
			},
		};

		const session = createPatchSession(bytesWithCalcChain);
		session.setCellValue("CalcSheet", "A1", 50);
		session.recalculate(mockEvaluator);
		const recalcBytes = session.toBytes();

		const recalcWb = readXlsxBytes(recalcBytes);
		expect(recalcWb.sheets[0]?.cells.get("B1")?.formula?.cachedResult).toBe(100);
		expect(recalcWb.sheets[0]?.cells.get("B1")?.value).toBe(100);

		// 3. Automatic trigger of recalculate() inside toBytes() when onFormulaCache: "recalculate"
		let autoEvaluatorCalled = false;
		const autoEvaluator: FormulaEvaluator = {
			recalculate(_workbook, changedCells) {
				autoEvaluatorCalled = true;
				expect([...changedCells]).toEqual([{ sheetName: "CalcSheet", ref: "A1" }]);
				return [{ sheetName: "CalcSheet", ref: "B1", value: 140 }];
			},
		};
		const autoSession = createPatchSession(bytesWithCalcChain, {
			onFormulaCache: "recalculate",
			evaluator: autoEvaluator,
		});
		autoSession.setCellValue("CalcSheet", "A1", 70);
		const autoBytes = autoSession.toBytes();
		expect(autoEvaluatorCalled).toBe(true);
		const autoWb = readXlsxBytes(autoBytes);
		expect(autoWb.sheets[0]?.cells.get("B1")?.formula?.cachedResult).toBe(140);

		// 4. Calling session.recalculate() without an evaluator throws FORMULA_EVALUATION_FAILED
		const noEvalSession = createPatchSession(bytesWithCalcChain);
		try {
			noEvalSession.recalculate();
			expect.unreachable("Expected recalculate() without evaluator to throw");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("FORMULA_EVALUATION_FAILED");
		}
	});

	it("respects clearScope: 'sheet' vs 'workbook', setCellValue style options (preserveStyle: false and style override), null height/width resets, and SHEET_NOT_FOUND", () => {
		const twoSheetBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Sheet1",
					rowsMeta: new Map([[1, { rowIndex: 1, height: 30 }]]),
					columns: [{ min: 1, max: 1, width: 25 }],
					cells: new Map([
						[
							"A1",
							{
								value: 10,
								type: "number",
								style: { fg: "#FF0000", font: { bold: true } },
							},
						],
						[
							"A2",
							{
								value: 20,
								type: "number",
								style: { bg: "#00FF00" },
							},
						],
						[
							"B1",
							{
								value: 30,
								type: "number",
								formula: { expression: "A1+A2", cachedResult: 30 },
							},
						],
					]),
				},
				{
					name: "Sheet2",
					cells: new Map([
						[
							"B1",
							{
								value: 300,
								type: "number",
								formula: { expression: "Sheet1!B1*10", cachedResult: 300 },
							},
						],
					]),
				},
			]),
		);

		// 1. clearScope: "sheet" clears Sheet1 formula cached <v> while preserving Sheet2 cached <v>
		const sheetScopedBytes = patchXlsxBytes(
			twoSheetBytes,
			(session) => {
				// preserveStyle: false strips s="..." on A1
				session.setCellValue("Sheet1", "A1", 15, { preserveStyle: false });
				// style override sets new style on A2
				session.setCellValue("Sheet1", "A2", 25, {
					style: { bg: "#0000FF", font: { italic: true } },
				});
				// null height/width resets custom row height and column width
				session.setRowHeight("Sheet1", 1, null);
				session.setColWidth("Sheet1", 1, null);
			},
			{ onFormulaCache: "clear", clearScope: "sheet" },
		);

		const scopedPkg = extractOoxmlPackage(sheetScopedBytes);
		const scopedSheet1Xml = decodeUtf8(
			getRequiredEntry(scopedPkg, "xl/worksheets/sheet1.xml"),
		);
		expect(scopedSheet1Xml).toContain('<c r="A1"><v>15</v></c>');
		expect(scopedSheet1Xml).not.toContain('ht="30"');
		expect(scopedSheet1Xml).not.toContain("<cols>");

		const scopedWb = readXlsxBytes(sheetScopedBytes);
		const s1 = getRequiredSheet(scopedWb, 0);
		const s2 = getRequiredSheet(scopedWb, 1);

		expect(s1.cells.get("A1")?.style).toBeUndefined();
		expect(s1.cells.get("A2")?.style).toMatchObject({
			bg: "#0000FF",
			font: { italic: true },
		});
		expect(s1.rowsMeta?.get(1)?.height).toBeUndefined();
		expect(s1.columns).toBeUndefined();
		expect(s1.cells.get("B1")?.formula?.cachedResult).toBeUndefined();
		expect(s2.cells.get("B1")?.formula?.cachedResult).toBe(300);

		// 2. Mutating a non-existent sheet throws SHEET_NOT_FOUND
		try {
			patchXlsxBytes(twoSheetBytes, (session) => {
				session.setCellValue("MissingSheet", "A1", 1);
			});
			expect.unreachable("Expected mutating non-existent sheet to throw SHEET_NOT_FOUND");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) expect(error.code).toBe("SHEET_NOT_FOUND");
		}
	});

	it("does not resurrect deleted cell values when deleteCell is followed by setCellStyle or addHyperlink in the same PatchSession", () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Sheet1",
					cells: new Map([
						["A1", { value: "OldBaseValue", type: "string" }],
						["A2", { value: "ExistingBaseValue", type: "string" }],
						["A3", { value: "OldLinkCell", type: "string" }],
					]),
				},
			]),
		);

		const session = createPatchSession(baseBytes);
		// 1. Mutated then deleted then styled
		session
			.setCellValue("Sheet1", "A1", 999)
			.deleteCell("Sheet1", "A1")
			.setCellStyle("Sheet1", "A1", { bg: "#FF0000" });

		// 2. Existing cell in base workbook deleted then styled
		session
			.deleteCell("Sheet1", "A2")
			.setCellStyle("Sheet1", "A2", { bg: "#FF0000" });

		// 3. Existing cell deleted then given a hyperlink
		session
			.deleteCell("Sheet1", "A3")
			.addHyperlink("Sheet1", "A3", { target: "https://example.com" });

		for (const wb of [session.getWorkbook(), readXlsxBytes(session.toBytes())]) {
			const sheet = getRequiredSheet(wb, 0);
			expect(sheet.cells.get("A1")?.value).toBeNull();
			expect(sheet.cells.get("A1")?.style?.bg).toBe("#FF0000");

			expect(sheet.cells.get("A2")?.value).toBeNull();
			expect(sheet.cells.get("A2")?.style?.bg).toBe("#FF0000");

			expect(sheet.cells.get("A3")?.value).toBeNull();
			expect(sheet.cells.get("A3")?.hyperlink).toEqual({
				target: "https://example.com",
			});
		}
	});

	it("reverts auto-synthesized Date style when overwritten by a non-Date value in the same PatchSession", () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Sheet1",
					cells: new Map([["B1", { value: 1, type: "number" }]]),
				},
			]),
		);

		const session = createPatchSession(baseBytes);
		session
			.setCellValue("Sheet1", "B1", new Date("2026-01-15T00:00:00Z"), { preserveStyle: false })
			.setCellValue("Sheet1", "B1", 42);

		for (const wb of [session.getWorkbook(), readXlsxBytes(session.toBytes())]) {
			const cell = getRequiredSheet(wb, 0).cells.get("B1");
			expect(cell?.value).toBe(42);
			expect(cell?.type).toBe("number");
			expect(cell?.style?.numFmt).toBeUndefined();
		}
	});

	it('cleans up stale xl/calcChain.xml entries under onFormulaCache: "preserve" when formula cells are overwritten', () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Sheet1",
					cells: new Map([
						["A2", { value: 10, type: "number" }],
						[
							"C2",
							{
								value: 20,
								type: "number",
								formula: { expression: "A2*2", cachedResult: 20 },
							},
						],
						[
							"D2",
							{
								value: 30,
								type: "number",
								formula: { expression: "A2*3", cachedResult: 30 },
							},
						],
					]),
				},
			]),
		);

		// Case 1: calcChain has C2 and D2 -> overwriting C2 removes C2 while keeping D2
		const multiEntries = extractOoxmlPackage(baseBytes);
		multiEntries["xl/calcChain.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<calcChain xmlns="${SPREADSHEET_NS}"><c r="C2" i="1"/><c r="D2" i="1"/></calcChain>`,
		);
		const patchedMulti = patchXlsxBytes(
			packOoxmlPackage(multiEntries),
			(session) => {
				session.setCellValue("Sheet1", "C2", 999);
			},
			{ onFormulaCache: "preserve" },
		);
		const patchedMultiPkg = extractOoxmlPackage(patchedMulti);
		expect(patchedMultiPkg["xl/calcChain.xml"]).toBeDefined();
		const updatedCalcChain = decodeUtf8(getRequiredEntry(patchedMultiPkg, "xl/calcChain.xml"));
		expect(updatedCalcChain).not.toContain('r="C2"');
		expect(updatedCalcChain).toContain('r="D2"');

		// Case 2: calcChain has only C2 -> overwriting C2 strips xl/calcChain.xml completely
		const singleEntries = extractOoxmlPackage(baseBytes);
		singleEntries["xl/calcChain.xml"] = encodeUtf8(
			'<?xml version="1.0" encoding="UTF-8"?>' +
				`<calcChain xmlns="${SPREADSHEET_NS}"><c r="C2" i="1"/></calcChain>`,
		);
		const patchedSingle = patchXlsxBytes(
			packOoxmlPackage(singleEntries),
			(session) => {
				session.setCellValue("Sheet1", "C2", 999);
			},
			{ onFormulaCache: "preserve" },
		);
		const patchedSinglePkg = extractOoxmlPackage(patchedSingle);
		expect(patchedSinglePkg["xl/calcChain.xml"]).toBeUndefined();
		expect(readXlsxBytes(patchedSingle).sheets[0]?.cells.get("C2")?.value).toBe(999);
	});

	it("preserves explicit setCellStyle across setCellValue(Date) -> setCellValue(42) in the same PatchSession", () => {
		const baseBytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Sheet1",
					cells: new Map([["A1", { value: 1, type: "number" }]]),
				},
			]),
		);

		const session = createPatchSession(baseBytes);
		session
			.setCellStyle("Sheet1", "A1", { bg: "#FF0000" })
			.setCellValue("Sheet1", "A1", new Date("2026-01-15T00:00:00.000Z"))
			.setCellValue("Sheet1", "A1", 42);

		for (const wb of [session.getWorkbook(), readXlsxBytes(session.toBytes())]) {
			const cell = getRequiredSheet(wb, 0).cells.get("A1");
			expect(cell?.value).toBe(42);
			expect(cell?.type).toBe("number");
			expect(cell?.style?.bg).toBe("#FF0000");
			expect(cell?.style?.numFmt).toBeUndefined();
		}
	});

	it("synthesizes xl/styles.xml without rId collision when workbook.xml.rels uses non-sequential rIds (rId11)", () => {
		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Types xmlns="${CONTENT_TYPES_NS}">` +
					'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
					'<Default Extension="xml" ContentType="application/xml"/>' +
					'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
					'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
					"</Types>",
			),
			"_rels/.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
					"</Relationships>",
			),
			"xl/workbook.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
					'<sheets><sheet name="Sheet1" sheetId="1" r:id="rId11"/></sheets>' +
					"</workbook>",
			),
			"xl/_rels/workbook.xml.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId11" Type="${OFFICE_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
					"</Relationships>",
			),
			"xl/worksheets/sheet1.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<worksheet xmlns="${SPREADSHEET_NS}">` +
					'<sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData>' +
					"</worksheet>",
			),
		};

		const patchedBytes = patchXlsxBytes(packOoxmlPackage(entries), (session) => {
			session.setCellStyle("Sheet1", "A1", { bg: "#112233", font: { bold: true } });
		});

		const patchedPkg = extractOoxmlPackage(patchedBytes);
		expect(patchedPkg["xl/styles.xml"]).toBeDefined();

		const wbRelsXml = decodeUtf8(getRequiredEntry(patchedPkg, "xl/_rels/workbook.xml.rels"));
		const rIds: string[] = [];
		for (const match of wbRelsXml.matchAll(/Id="(rId\d+)"/g)) {
			if (match[1]) {
				rIds.push(match[1]);
			}
		}
		expect(new Set(rIds).size).toBe(rIds.length);
		expect(rIds).toContain("rId11");
		expect(wbRelsXml).toContain('Target="styles.xml"');

		const reparsed = readXlsxBytes(patchedBytes);
		const a1 = getRequiredSheet(reparsed, 0).cells.get("A1");
		expect(a1?.value).toBe(1);
		expect(a1?.style?.bg).toBe("#112233");
		expect(a1?.style?.font?.bold).toBe(true);
	});

	it("patches an empty sheet with self-closing <sheetData/> cleanly", () => {
		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Types xmlns="${CONTENT_TYPES_NS}">` +
					'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
					'<Default Extension="xml" ContentType="application/xml"/>' +
					"</Types>",
			),
			"_rels/.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/officeDocument" Target="xl/workbook.xml"/>` +
					"</Relationships>",
			),
			"xl/workbook.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
					'<sheets><sheet name="Empty" sheetId="1" r:id="rId1"/></sheets>' +
					"</workbook>",
			),
			"xl/_rels/workbook.xml.rels": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<Relationships xmlns="${PKG_REL_NS}">` +
					`<Relationship Id="rId1" Type="${OFFICE_REL_NS}/worksheet" Target="worksheets/sheet1.xml"/>` +
					"</Relationships>",
			),
			"xl/worksheets/sheet1.xml": encodeUtf8(
				'<?xml version="1.0" encoding="UTF-8"?>' +
					`<worksheet xmlns="${SPREADSHEET_NS}"><sheetData/></worksheet>`,
			),
		};

		const patchedBytes = patchXlsxBytes(packOoxmlPackage(entries), (session) => {
			session.setCellValue("Empty", "B2", "Inserted");
		});

		const wb = readXlsxBytes(patchedBytes);
		expect(getRequiredSheet(wb, 0).cells.get("B2")?.value).toBe("Inserted");
	});

	it("patches Date values in 1904 dateSystem, splits <col min='1' max='5'/> in setColWidth, and normalizes NaN / invalid Date consistently", () => {
		const targetDate = new Date("2026-06-15T00:00:00.000Z");
		const baseBytes = writeXlsxBytes(
			makeWorkbook(
				[
					{
						name: "Sheet1",
						columns: [{ min: 1, max: 5, width: 12 }],
						cells: new Map([
							["A1", { value: 1, type: "number" }],
							["B1", { value: 2, type: "number", style: { bg: "#EEEEEE" } }],
							["C1", { value: 3, type: "number", style: { bg: "#EEEEEE" } }],
							["D1", { value: 4, type: "number" }],
						]),
					},
				],
				1904,
			),
		);

		const session = createPatchSession(baseBytes);
		session
			.setCellValue("Sheet1", "A1", targetDate)
			.setCellValue("Sheet1", "B1", NaN)
			.setCellValue("Sheet1", "C1", new Date("invalid"))
			.setCellValue("Sheet1", "D1", NaN)
			.setColWidth("Sheet1", 3, 25);

		const patchedBytes = session.toBytes();
		const pkg = extractOoxmlPackage(patchedBytes);
		const sheetXml = decodeUtf8(getRequiredEntry(pkg, "xl/worksheets/sheet1.xml"));
		expect(sheetXml).not.toContain("NaN");

		for (const wb of [session.getWorkbook(), readXlsxBytes(patchedBytes)]) {
			expect(wb.dateSystem).toBe(1904);
			const sheet = getRequiredSheet(wb, 0);

			const a1 = sheet.cells.get("A1");
			expect(a1?.type).toBe("date");
			expect(a1?.value).toBeInstanceOf(Date);
			expect((a1?.value as Date).toISOString()).toBe(targetDate.toISOString());

			expect(sheet.cells.get("B1")).toMatchObject({
				value: null,
				type: "empty",
				style: { bg: "#EEEEEE" },
			});
			expect(sheet.cells.get("C1")).toMatchObject({
				value: null,
				type: "empty",
				style: { bg: "#EEEEEE" },
			});
			expect(sheet.cells.get("D1")?.value ?? null).toBeNull();

			expect(sheet.columns).toEqual([
				{ min: 1, max: 2, width: 12 },
				{ min: 3, max: 3, width: 25 },
				{ min: 4, max: 5, width: 12 },
			]);
		}
	});
});

describe("ooxml: Large-Sheet Chunked Stress Test", () => {
	it("writes and reads back a 25,000-row worksheet with repeated strings using chunked writer and SharedStrings deduplication", () => {
		const rowCount = 25_000;
		const cells = new Map<string, { value: string | number; type: "string" | "number" }>();
		const categories = ["Hardware", "Software", "Services", "Support", "Cloud"];

		for (let r = 1; r <= rowCount; r += 1) {
			const category = categories[r % categories.length] ?? "Hardware";
			cells.set(`A${r}`, { value: category, type: "string" });
			cells.set(`B${r}`, { value: r * 1.5, type: "number" });
		}

		const bytes = writeXlsxBytes(
			makeWorkbook([
				{
					name: "Large25k",
					cells,
				},
			]),
			{ useSharedStrings: true, compressionLevel: 1 },
		);

		const pkg = extractOoxmlPackage(bytes);
		const sstXml = decodeUtf8(getRequiredEntry(pkg, "xl/sharedStrings.xml"));
		expect(sstXml).toContain('uniqueCount="5"');

		const wb = readXlsxBytes(bytes);
		const sheet = getRequiredSheet(wb, 0);
		expect(sheet.cells.size).toBe(rowCount * 2);
		expect(sheet.cells.get("A1")?.value).toBe(categories[1]);
		expect(sheet.cells.get("B1")?.value).toBe(1.5);
		expect(sheet.cells.get("A12500")?.value).toBe(categories[12_500 % categories.length]);
		expect(sheet.cells.get("B25000")?.value).toBe(25_000 * 1.5);
	});
});
