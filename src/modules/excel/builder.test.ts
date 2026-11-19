import { describe, expect, it } from "vitest";
import {
	createWorkbookBuilder,
	defineExcelTheme,
	ZINC_CAUTION_THEME,
} from "./builder.ts";
import { getCell } from "./coords.ts";
import { isExcelError } from "./errors.ts";
import { readXlsxBytes } from "./ooxml.ts";
import type { CellStatus, TableColumnSpec, WorkbookModel, WorksheetModel } from "./types.ts";

interface SampleMetricRow {
	parameter: string;
	value: number;
	limit: number;
	status: CellStatus;
	notes: string;
}

function getRequiredSheet(wb: WorkbookModel, index = 0): WorksheetModel {
	const sheet = wb.sheets[index];
	if (!sheet) {
		throw new Error(`Expected sheet at index ${index}`);
	}
	return sheet;
}

describe("builder: ZINC_CAUTION_THEME & defineExcelTheme", () => {
	it("verifies ZINC_CAUTION_THEME default tokens match blueprint §4 specifications", () => {
		expect(ZINC_CAUTION_THEME.fontFamily).toBe("Segoe UI");

		// Title: 13pt bold, #18181B, rowHeight 26
		expect(ZINC_CAUTION_THEME.title.fg).toBe("#18181B");
		expect(ZINC_CAUTION_THEME.title.font).toEqual({
			family: "Segoe UI",
			size: 13,
			bold: true,
		});
		expect(ZINC_CAUTION_THEME.title.rowHeight).toBe(26);

		// Subtitle: 9.5pt, #71717A
		expect(ZINC_CAUTION_THEME.subtitle.fg).toBe("#71717A");
		expect(ZINC_CAUTION_THEME.subtitle.font).toEqual({
			family: "Segoe UI",
			size: 9.5,
		});

		// Header: 10pt bold, #27272A on #F4F4F5, rowHeight 24, thin #D4D4D8 top/bottom borders
		expect(ZINC_CAUTION_THEME.header.fg).toBe("#27272A");
		expect(ZINC_CAUTION_THEME.header.bg).toBe("#F4F4F5");
		expect(ZINC_CAUTION_THEME.header.font).toEqual({
			family: "Segoe UI",
			size: 10,
			bold: true,
		});
		expect(ZINC_CAUTION_THEME.header.rowHeight).toBe(24);
		expect(ZINC_CAUTION_THEME.header.border?.top).toEqual({ style: "thin", fg: "#D4D4D8" });
		expect(ZINC_CAUTION_THEME.header.border?.bottom).toEqual({ style: "thin", fg: "#D4D4D8" });

		// SubHeader: 9.5pt, #71717A on #FAFAFA
		expect(ZINC_CAUTION_THEME.subHeader.fg).toBe("#71717A");
		expect(ZINC_CAUTION_THEME.subHeader.bg).toBe("#FAFAFA");
		expect(ZINC_CAUTION_THEME.subHeader.font).toEqual({
			family: "Segoe UI",
			size: 9.5,
		});

		// Data: 10pt, #18181B, rowHeight 20, thin #E4E4E7 bottom border
		expect(ZINC_CAUTION_THEME.data.fg).toBe("#18181B");
		expect(ZINC_CAUTION_THEME.data.bg).toBeUndefined();
		expect(ZINC_CAUTION_THEME.data.font).toEqual({
			family: "Segoe UI",
			size: 10,
		});
		expect(ZINC_CAUTION_THEME.data.rowHeight).toBe(20);
		expect(ZINC_CAUTION_THEME.data.border?.bottom).toEqual({ style: "thin", fg: "#E4E4E7" });

		// Footer: 10pt bold, #18181B on #F4F4F5, medium #A1A1AA top & thin #D4D4D8 bottom
		expect(ZINC_CAUTION_THEME.footer.fg).toBe("#18181B");
		expect(ZINC_CAUTION_THEME.footer.bg).toBe("#F4F4F5");
		expect(ZINC_CAUTION_THEME.footer.font).toEqual({
			family: "Segoe UI",
			size: 10,
			bold: true,
		});
		expect(ZINC_CAUTION_THEME.footer.border?.top).toEqual({ style: "medium", fg: "#A1A1AA" });
		expect(ZINC_CAUTION_THEME.footer.border?.bottom).toEqual({ style: "thin", fg: "#D4D4D8" });

		// Statuses: caution #78350F on #FEF3C7, positive #14532D on #DCFCE7, negative #7F1D1D on #FEE2E2
		expect(ZINC_CAUTION_THEME.statuses.base).toEqual({});
		expect(ZINC_CAUTION_THEME.statuses.caution).toEqual({
			fg: "#78350F",
			bg: "#FEF3C7",
			font: { family: "Segoe UI", size: 10, bold: true },
		});
		expect(ZINC_CAUTION_THEME.statuses.positive.fg).toBe("#14532D");
		expect(ZINC_CAUTION_THEME.statuses.positive.bg).toBe("#DCFCE7");
		expect(ZINC_CAUTION_THEME.statuses.negative.fg).toBe("#7F1D1D");
		expect(ZINC_CAUTION_THEME.statuses.negative.bg).toBe("#FEE2E2");
	});

	it("merges partial overrides and propagates top-level fontFamily across all roles and statuses in defineExcelTheme", () => {
		const custom = defineExcelTheme({
			fontFamily: "Inter",
			title: { fg: "#000000", rowHeight: 30 },
			header: { font: { family: "JetBrains Mono", size: 11 } },
			statuses: {
				base: {},
				positive: ZINC_CAUTION_THEME.statuses.positive,
				caution: { bg: "#FDE68A" },
				negative: ZINC_CAUTION_THEME.statuses.negative,
			},
		});

		expect(custom.fontFamily).toBe("Inter");
		// Propagated Inter to title, subtitle, subHeader, data, footer, statuses
		expect(custom.title.fg).toBe("#000000");
		expect(custom.title.rowHeight).toBe(30);
		expect(custom.title.font?.family).toBe("Inter");
		expect(custom.title.font?.size).toBe(13);
		expect(custom.title.font?.bold).toBe(true);

		// Explicit role font.family wins over top-level fontFamily
		expect(custom.header.font?.family).toBe("JetBrains Mono");
		expect(custom.header.font?.size).toBe(11);
		expect(custom.header.font?.bold).toBe(true);
		expect(custom.header.bg).toBe("#F4F4F5");

		expect(custom.data.font?.family).toBe("Inter");
		expect(custom.footer.font?.family).toBe("Inter");

		// Caution kept #78350F fg, updated bg to #FDE68A, and propagated Inter fontFamily
		expect(custom.statuses.caution.fg).toBe("#78350F");
		expect(custom.statuses.caution.bg).toBe("#FDE68A");
		expect(custom.statuses.caution.font?.family).toBe("Inter");
	});
});

describe("builder: createWorkbookBuilder & SheetBuilder full roundtrip", () => {
	it("builds a multi-zone sheet (addTitleBlock + addTable + validation + hyperlink + view + pageSetup) and roundtrips via toBytes() -> readXlsxBytes()", () => {
		const rows: SampleMetricRow[] = [
			{
				parameter: "Lead (Pb)",
				value: 14.25,
				limit: 10,
				status: "caution",
				notes: "Exceeds threshold",
			},
			{
				parameter: "Mercury (Hg)",
				value: 0.45,
				limit: 1,
				status: "positive",
				notes: "Within normal range cleanly",
			},
			{
				parameter: "Cadmium (Cd)",
				value: 2.1,
				limit: 5,
				status: "base",
				notes: "Baseline",
			},
			{
				parameter: "Arsenic (As)",
				value: 25.8,
				limit: 10,
				status: "negative",
				notes: "Critical alert",
			},
		];

		const columns: TableColumnSpec<SampleMetricRow>[] = [
			{
				id: "parameter",
				header: "Parameter",
				subHeader: "Analyte",
				align: "left",
			},
			{
				id: "value",
				header: "Measured",
				subHeader: "mg/kg",
				align: "right",
				numFmt: "#,##0.00",
				status: (_val, row) => row.status,
			},
			{
				id: "limit",
				header: "Limit",
				subHeader: "mg/kg",
				align: "right",
				width: 14,
				numFmt: "#,##0.00",
			},
			{
				id: "notes",
				header: "Inspector Notes",
				subHeader: "Remarks",
				align: "left",
			},
		];

		const builder = createWorkbookBuilder();
		builder.sheet("Lab Report", (sheet) => {
			sheet
				.addTitleBlock({
					title: "Environmental Soil Analysis 2026",
					subtitle: "Accredited Lab Summary — Q1",
					emptyRowsAfter: 1,
					mergeCols: 4,
				})
				.addTable({
					columns,
					subHeaderRow: true,
					rows,
					totalsRow: {
						parameter: "Total / Max",
						value: {
							value: 42.6,
							type: "number",
							formula: {
								expression: "SUM(B6:B9)",
								cachedResult: 42.6,
							},
						},
						limit: 10,
						notes: "4 samples",
					},
					freezeHeader: true,
					autoFilter: true,
					autoFit: { minWidth: 10, maxWidth: 28, padding: 3 },
				})
				.addValidation({
					sqref: "B6:B9",
					kind: "decimal",
					operator: "greaterThanOrEqual",
					formula1: "0",
					allowBlank: false,
					errorTitle: "Invalid Value",
					error: "Measured value must be non-negative",
					errorStyle: "stop",
				})
				.addHyperlink("A1", {
					target: "https://example.com/lab-report",
					tooltip: "Open online portal",
				})
				.addHyperlink("E1", {
					location: "'Lab Report'!A5",
					display: "Jump to Table",
				})
				.setView({
					showGridLines: false,
					tabColor: "#F59E0B",
					state: "visible",
				})
				.setPageSetup({
					orientation: "landscape",
					paperSize: "A4",
					fitToWidth: 1,
					fitToHeight: 0,
					margins: { top: 0.5, bottom: 0.5, left: 0.4, right: 0.4, header: 0.2, footer: 0.2 },
					printTitleRows: "4:5",
					printArea: "A1:D10",
				});
		});

		const bytes = builder.toBytes();
		const wb = readXlsxBytes(bytes);
		const sheet = getRequiredSheet(wb, 0);

		expect(sheet.name).toBe("Lab Report");

		// 1. Title & Subtitle block (Row 1 = A1, Row 2 = A2, Row 3 = empty)
		const titleCell = getCell(sheet, "A1");
		expect(titleCell?.value).toBe("Environmental Soil Analysis 2026");
		expect(titleCell?.style?.fg).toBe("#18181B");
		expect(titleCell?.style?.font?.size).toBe(13);
		expect(titleCell?.style?.font?.bold).toBe(true);
		expect(titleCell?.hyperlink?.target).toBe("https://example.com/lab-report");
		expect(titleCell?.hyperlink?.tooltip).toBe("Open online portal");

		const subtitleCell = getCell(sheet, "A2");
		expect(subtitleCell?.value).toBe("Accredited Lab Summary — Q1");
		expect(subtitleCell?.style?.fg).toBe("#71717A");
		expect(subtitleCell?.style?.font?.size).toBe(9.5);

		expect(sheet.merges).toContain("A1:D1");
		expect(sheet.merges).toContain("A2:D2");

		// Hyperlink created on previously non-existent cell E1
		const jumpCell = getCell(sheet, "E1");
		expect(jumpCell?.value).toBe("Jump to Table");
		expect(jumpCell?.hyperlink?.location).toBe("'Lab Report'!A5");

		// 2. Table Header (Row 4 = A4:D4) & SubHeader (Row 5 = A5:D5)
		const headerB4 = getCell(sheet, "B4");
		expect(headerB4?.value).toBe("Measured");
		expect(headerB4?.style?.fg).toBe("#27272A");
		expect(headerB4?.style?.bg).toBe("#F4F4F5");
		expect(headerB4?.style?.font?.bold).toBe(true);
		expect(headerB4?.style?.align?.horizontal).toBe("right");

		const subHeaderB5 = getCell(sheet, "B5");
		expect(subHeaderB5?.value).toBe("mg/kg");
		expect(subHeaderB5?.style?.fg).toBe("#71717A");
		expect(subHeaderB5?.style?.bg).toBe("#FAFAFA");

		// 3. Data rows (Rows 6..9 = B6..B9) preserve native numeric values alongside numFmt & semantic status colors
		const cautionCell = getCell(sheet, "B6");
		expect(cautionCell?.value).toBe(14.25);
		expect(cautionCell?.type).toBe("number");
		expect(cautionCell?.style?.numFmt).toBe("#,##0.00");
		expect(cautionCell?.style?.fg).toBe("#78350F");
		expect(cautionCell?.style?.bg).toBe("#FEF3C7");
		expect(cautionCell?.style?.font?.bold).toBe(true);

		const positiveCell = getCell(sheet, "B7");
		expect(positiveCell?.value).toBe(0.45);
		expect(positiveCell?.style?.fg).toBe("#14532D");
		expect(positiveCell?.style?.bg).toBe("#DCFCE7");

		const baseCell = getCell(sheet, "B8");
		expect(baseCell?.value).toBe(2.1);
		expect(baseCell?.style?.fg).toBe("#18181B");
		expect(baseCell?.style?.bg).toBeUndefined();

		const negativeCell = getCell(sheet, "B9");
		expect(negativeCell?.value).toBe(25.8);
		expect(negativeCell?.style?.fg).toBe("#7F1D1D");
		expect(negativeCell?.style?.bg).toBe("#FEE2E2");

		// 4. Totals / Footer row (Row 10 = A10:D10)
		const footerLabel = getCell(sheet, "A10");
		expect(footerLabel?.value).toBe("Total / Max");
		expect(footerLabel?.style?.bg).toBe("#F4F4F5");
		expect(footerLabel?.style?.font?.bold).toBe(true);
		expect(footerLabel?.style?.border?.top).toEqual({ style: "medium", fg: "#A1A1AA" });

		const footerSum = getCell(sheet, "B10");
		expect(footerSum?.value).toBe(42.6);
		expect(footerSum?.formula?.expression).toBe("SUM(B6:B9)");
		expect(footerSum?.style?.numFmt).toBe("#,##0.00");

		// 5. Row heights (Title row 1 = 26, Header row 4 = 24, Data rows 6..9 = 20)
		expect(sheet.rowsMeta?.get(1)?.height).toBe(26);
		expect(sheet.rowsMeta?.get(4)?.height).toBe(24);
		expect(sheet.rowsMeta?.get(6)?.height).toBe(20);
		expect(sheet.rowsMeta?.get(9)?.height).toBe(20);

		// 6. Freeze pane (header is row 4, sub-header is row 5 -> freezePane.rows === 5) & AutoFilter (A4:D9)
		expect(sheet.freezePane).toEqual({ rows: 5 });
		expect(sheet.autoFilterRef).toBe("A4:D9");

		// 7. Column widths from autoFit & explicit col.width
		const col1 = sheet.columns?.find((c) => c.min === 1 && c.max === 1);
		const col2 = sheet.columns?.find((c) => c.min === 2 && c.max === 2);
		const col3 = sheet.columns?.find((c) => c.min === 3 && c.max === 3);
		const col4 = sheet.columns?.find((c) => c.min === 4 && c.max === 4);
		expect(col1?.width).toBeGreaterThanOrEqual(10);
		expect(col1?.width).toBeLessThanOrEqual(28);
		expect(col2?.width).toBeGreaterThanOrEqual(10);
		// Explicit width on col 3 ("limit") is preserved verbatim
		expect(col3?.width).toBe(14);
		// Long notes ("Within normal range cleanly" = 27 chars + 3 padding = 30 -> clamped to maxWidth 28)
		expect(col4?.width).toBe(28);

		// 8. Data validation, View, PageSetup
		expect(sheet.dataValidations).toHaveLength(1);
		expect(sheet.dataValidations?.[0]?.sqref).toBe("B6:B9");
		expect(sheet.dataValidations?.[0]?.kind).toBe("decimal");
		expect(sheet.dataValidations?.[0]?.errorTitle).toBe("Invalid Value");

		expect(sheet.showGridLines).toBe(false);
		expect(sheet.tabColor).toBe("#F59E0B");
		expect(sheet.state).toBe("visible");

		expect(sheet.pageSetup?.orientation).toBe("landscape");
		expect(sheet.pageSetup?.paperSize).toBe("A4");
		expect(sheet.pageSetup?.fitToWidth).toBe(1);
		expect(sheet.pageSetup?.fitToHeight).toBe(0);
		expect(sheet.pageSetup?.printTitleRows).toBe("4:5");
		expect(sheet.pageSetup?.printArea).toBe("A1:D10");
	});

	it("forwards sanitizeFormulaInjection from createWorkbookBuilder options into toBytes()", () => {
		const builder = createWorkbookBuilder({
			sanitizeFormulaInjection: true,
		});
		builder.sheet("Sanitized", (sheet) => {
			sheet.addTable({
				columns: [
					{ id: "text", header: "Text" },
					{ id: "num", header: "Num" },
				],
				rows: [
					{ text: '=HYPERLINK("https://evil.tld")', num: -99 },
					{ text: "@SUM(A1:A2)", num: 42 },
				],
			});
		});

		const wb = readXlsxBytes(builder.toBytes());
		const sheet = getRequiredSheet(wb);

		// Untrusted string starting with = or @ is prefixed with ' in the serialized .xlsx
		expect(getCell(sheet, "A2")?.value).toBe('\'=HYPERLINK("https://evil.tld")');
		expect(getCell(sheet, "A3")?.value).toBe("'@SUM(A1:A2)");
		// Negative number remains a native number
		expect(getCell(sheet, "B2")?.value).toBe(-99);
		expect(getCell(sheet, "B2")?.type).toBe("number");
	});

	it("rejects empty or whitespace-only sheet names with ExcelError('INVALID_CONFIG')", () => {
		const builder = createWorkbookBuilder();
		try {
			builder.sheet(" ".repeat(3), () => {});
			expect.fail("Expected INVALID_CONFIG for blank sheet name");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("INVALID_CONFIG");
			}
		}
	});

	it("does not invoke strict col.format on null, undefined, or CellModel values in addTable", () => {
		interface StrictRow {
			label: string;
			amount: number | null | undefined | { value: number; type: "number"; style?: { fg: string } };
		}

		const rows: StrictRow[] = [
			{ label: "Normal", amount: 12.345 },
			{ label: "Null", amount: null },
			{ label: "Undefined", amount: undefined },
			{ label: "CellModel", amount: { value: 99.5, type: "number", style: { fg: "#0055AA" } } },
		];

		const builder = createWorkbookBuilder();
		builder.sheet("StrictFormat", (sheet) => {
			sheet.addTable<StrictRow>({
				columns: [
					{ id: "label", header: "Label" },
					{
						id: "amount",
						header: "Amount",
						numFmt: "0.00",
						format: (v) => (v as number).toFixed(2),
					},
				],
				rows,
				autoFit: true,
			});
		});

		const wb = readXlsxBytes(builder.toBytes());
		const sheet = getRequiredSheet(wb, 0);
		expect(getCell(sheet, "B2")?.value).toBe(12.345);
		expect(getCell(sheet, "B2")?.style?.numFmt).toBe("0.00");
		expect(getCell(sheet, "B3")?.value).toBeNull();
		expect(getCell(sheet, "B4")?.value).toBeNull();
		expect(getCell(sheet, "B5")?.value).toBe(99.5);
		expect(getCell(sheet, "B5")?.style?.fg).toBe("#0055AA");
	});

	it("supports stacked addTable calls on one sheet along with array-form subHeaderRow and totalsRow", () => {
		const builder = createWorkbookBuilder();
		builder.sheet("Stacked", (sheet) => {
			sheet
				.addTable({
					columns: [
						{ id: "name", header: "Item" },
						{ id: "qty", header: "Qty", align: "right" },
					],
					subHeaderRow: ["Description", "Units"],
					rows: [
						{ name: "Bolts", qty: 10 },
						{ name: "Nuts", qty: 20 },
					],
					totalsRow: ["Subtotal A", 30],
					emptyRowsAfter: 1,
				})
				.addTable({
					columns: [
						{ id: "code", header: "Code" },
						{ id: "score", header: "Score", align: "right" },
					],
					subHeaderRow: ["ID", "Pts"],
					rows: [{ code: "X1", score: 95 }],
					totalsRow: ["Subtotal B", 95],
				});
		});

		const wb = readXlsxBytes(builder.toBytes());
		const sheet = getRequiredSheet(wb, 0);

		// Table 1: Row 1 header, Row 2 subHeader, Rows 3-4 data, Row 5 totals, Row 6 empty spacer
		expect(getCell(sheet, "A1")?.value).toBe("Item");
		expect(getCell(sheet, "B1")?.value).toBe("Qty");
		expect(getCell(sheet, "A2")?.value).toBe("Description");
		expect(getCell(sheet, "B2")?.value).toBe("Units");
		expect(getCell(sheet, "A3")?.value).toBe("Bolts");
		expect(getCell(sheet, "B3")?.value).toBe(10);
		expect(getCell(sheet, "A4")?.value).toBe("Nuts");
		expect(getCell(sheet, "B4")?.value).toBe(20);
		expect(getCell(sheet, "A5")?.value).toBe("Subtotal A");
		expect(getCell(sheet, "B5")?.value).toBe(30);
		expect(getCell(sheet, "A6")).toBeUndefined();

		// Table 2: Row 7 header, Row 8 subHeader, Row 9 data, Row 10 totals
		expect(getCell(sheet, "A7")?.value).toBe("Code");
		expect(getCell(sheet, "B7")?.value).toBe("Score");
		expect(getCell(sheet, "A8")?.value).toBe("ID");
		expect(getCell(sheet, "B8")?.value).toBe("Pts");
		expect(getCell(sheet, "A9")?.value).toBe("X1");
		expect(getCell(sheet, "B9")?.value).toBe(95);
		expect(getCell(sheet, "A10")?.value).toBe("Subtotal B");
		expect(getCell(sheet, "B10")?.value).toBe(95);
	});
});
