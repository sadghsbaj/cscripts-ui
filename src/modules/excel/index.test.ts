import { describe, expect, it } from "vitest";
import * as excel from "./index.ts";

describe("excel public barrel (index.ts)", () => {
	it("exports key runtime symbols from all 14 public modules", () => {
		// 1. errors.ts
		expect(excel.EXCEL_ERROR_CODES).toBeDefined();
		expect(typeof excel.ExcelError).toBe("function");
		expect(typeof excel.isExcelError).toBe("function");

		// 2. types.ts
		expect(excel.EXCEL_FORMATS).toContain("xlsx");
		expect(excel.SHEET_VISIBILITY_STATES).toContain("visible");
		expect(excel.CELL_VALUE_TYPES).toContain("number");
		expect(excel.CELL_STATUSES).toContain("caution");
		expect(excel.DIAGNOSTIC_SEVERITIES).toContain("negative");
		expect(excel.HIDDEN_ROW_POLICIES).toContain("skip");
		expect(excel.FORMULA_CACHE_POLICIES).toContain("preserve");
		expect(excel.DATE_SYSTEMS).toEqual([1900, 1904]);
		expect(excel.SORT_DIRECTIONS).toContain("asc");
		expect(excel.AGGREGATION_KINDS).toContain("sum");
		expect(excel.TIME_BUCKETS).toContain("month");
		expect(excel.JOIN_MODES).toContain("left");
		expect(excel.INFERRED_COLUMN_TYPES).toContain("string");

		// 3. coords.ts
		expect(typeof excel.colToLetter).toBe("function");
		expect(typeof excel.letterToCol).toBe("function");
		expect(typeof excel.parseCellRef).toBe("function");
		expect(typeof excel.formatCellRef).toBe("function");
		expect(typeof excel.parseRangeRef).toBe("function");
		expect(typeof excel.parseSheetQualifiedRef).toBe("function");
		expect(typeof excel.translateFormulaRefs).toBe("function");
		expect(typeof excel.getCell).toBe("function");
		expect(typeof excel.setCell).toBe("function");

		// 4. dates.ts
		expect(typeof excel.excelSerialToDate).toBe("function");
		expect(typeof excel.excelSerialToIsoDate).toBe("function");
		expect(typeof excel.excelSerialToIsoDateTime).toBe("function");
		expect(typeof excel.excelSerialToTime).toBe("function");
		expect(typeof excel.isoDateToExcelSerial).toBe("function");
		expect(typeof excel.parseDateValue).toBe("function");
		expect(typeof excel.parsePeriodHeader).toBe("function");

		// 5. values.ts
		expect(excel.EXCEL_ERROR_TOKENS).toContain("#N/A");
		expect(typeof excel.isExcelErrorValue).toBe("function");
		expect(typeof excel.normalizeCellText).toBe("function");
		expect(typeof excel.cellToString).toBe("function");
		expect(typeof excel.formatCellDisplay).toBe("function");
		expect(typeof excel.parseLocaleNumber).toBe("function");
		expect(typeof excel.parseBooleanValue).toBe("function");
		expect(typeof excel.parseThresholdValue).toBe("function");
		expect(typeof excel.compareMissingLast).toBe("function");
		expect(typeof excel.compareNatural).toBe("function");
		expect(typeof excel.roundAdaptive).toBe("function");

		// 6. ooxml.ts
		expect(typeof excel.readXlsxBytes).toBe("function");
		expect(typeof excel.writeXlsxBytes).toBe("function");
		expect(typeof excel.readNamedTable).toBe("function");
		expect(typeof excel.resolveDefinedName).toBe("function");
		expect(typeof excel.createPatchSession).toBe("function");
		expect(typeof excel.patchXlsxBytes).toBe("function");

		// 7. csv.ts
		expect(typeof excel.sniffCsvDelimiter).toBe("function");
		expect(typeof excel.readCsvText).toBe("function");
		expect(typeof excel.writeCsvText).toBe("function");

		// 8. builder.ts
		expect(excel.ZINC_CAUTION_THEME).toBeDefined();
		expect(typeof excel.defineExcelTheme).toBe("function");
		expect(typeof excel.createWorkbookBuilder).toBe("function");

		// 9. scanner.ts
		expect(typeof excel.resolveSheet).toBe("function");
		expect(typeof excel.sheetToGrid).toBe("function");
		expect(typeof excel.fillDownGrid).toBe("function");
		expect(typeof excel.inferColumnType).toBe("function");
		expect(typeof excel.profileSheet).toBe("function");
		expect(typeof excel.cleanAnchorText).toBe("function");
		expect(typeof excel.fuzzyMatchAnchor).toBe("function");
		expect(typeof excel.createAliasResolver).toBe("function");
		expect(typeof excel.scanKeyValueBlock).toBe("function");
		expect(typeof excel.detectAxisHeader).toBe("function");
		expect(typeof excel.scanStackedSections).toBe("function");
		expect(typeof excel.scanGroupedRecords).toBe("function");
		expect(typeof excel.scanStridedColumns).toBe("function");
		expect(typeof excel.scanFormTable).toBe("function");
		expect(typeof excel.scanMatrix).toBe("function");
		expect(typeof excel.unpivotGrid).toBe("function");
		expect(typeof excel.scanHierarchy).toBe("function");
		expect(typeof excel.discoverRegions).toBe("function");
		expect(typeof excel.flattenMergedHeaders).toBe("function");

		// 10. query.ts
		expect(typeof excel.sheetToRecords).toBe("function");
		expect(typeof excel.recordsToSheet).toBe("function");
		expect(typeof excel.workbookToJson).toBe("function");
		expect(typeof excel.jsonToWorkbook).toBe("function");
		expect(typeof excel.fillDownRecords).toBe("function");
		expect(typeof excel.canonicalizeValues).toBe("function");
		expect(typeof excel.deriveField).toBe("function");
		expect(typeof excel.mapRecords).toBe("function");
		expect(typeof excel.filterRecords).toBe("function");
		expect(typeof excel.sortRecords).toBe("function");
		expect(typeof excel.pivotRecords).toBe("function");
		expect(typeof excel.unpivotRecords).toBe("function");
		expect(typeof excel.computeRunningTotals).toBe("function");
		expect(typeof excel.computePeriodDeltas).toBe("function");
		expect(typeof excel.rankRecords).toBe("function");
		expect(typeof excel.alignSeriesByKey).toBe("function");
		expect(typeof excel.joinRecords).toBe("function");
		expect(typeof excel.dedupeRecords).toBe("function");
		expect(typeof excel.projectTable).toBe("function");

		// 11. diff.ts
		expect(typeof excel.diffSheets).toBe("function");
		expect(typeof excel.diffWorkbooks).toBe("function");

		// 12. validate.ts
		expect(typeof excel.validateSheetRules).toBe("function");

		// 13. browser-io.ts
		expect(typeof excel.isTempOfficeFile).toBe("function");
		expect(typeof excel.slugifyFileName).toBe("function");
		expect(typeof excel.readExcelFile).toBe("function");
		expect(typeof excel.downloadXlsxBytes).toBe("function");
		expect(typeof excel.downloadCsvText).toBe("function");

		// 14. adapters.ts
		expect(typeof excel.createXlsxAdapter).toBe("function");
		expect(typeof excel.createCsvAdapter).toBe("function");
	});

	it("does not leak any internal OOXML implementation symbols", () => {
		const exportedKeys = new Set(Object.keys(excel));
		const forbiddenInternalSymbols = [
			"scanXml",
			"parseXmlTree",
			"StyleRegistry",
			"createStyleRegistry",
			"createSharedStringsReader",
			"extractOoxmlPackage",
			"packOoxmlPackage",
			"appendStylesToStylesXml",
			"appendSharedStringsXml",
			"stripCalcChainFromPackage",
		];

		for (const symbol of forbiddenInternalSymbols) {
			expect(exportedKeys.has(symbol)).toBe(false);
		}
	});

	it("resolves identically through the package export alias cs/svelte/excel", async () => {
		const pkgExport = await import("cs/svelte/excel");
		expect(pkgExport.readXlsxBytes).toBe(excel.readXlsxBytes);
		expect(pkgExport.createXlsxAdapter).toBe(excel.createXlsxAdapter);
		expect(pkgExport.downloadXlsxBytes).toBe(excel.downloadXlsxBytes);
	});
});
