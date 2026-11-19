---
name: Excel
kind: utility
import: cs/svelte/excel
exports:
  - EXCEL_ERROR_CODES
  - EXCEL_FORMATS
  - SHEET_VISIBILITY_STATES
  - CELL_VALUE_TYPES
  - CELL_STATUSES
  - DIAGNOSTIC_SEVERITIES
  - HIDDEN_ROW_POLICIES
  - FORMULA_CACHE_POLICIES
  - DATE_SYSTEMS
  - SORT_DIRECTIONS
  - AGGREGATION_KINDS
  - TIME_BUCKETS
  - JOIN_MODES
  - INFERRED_COLUMN_TYPES
  - EXCEL_ERROR_TOKENS
  - ZINC_CAUTION_THEME
  - ExcelError
  - isExcelError
  - colToLetter
  - letterToCol
  - parseCellRef
  - formatCellRef
  - parseRangeRef
  - parseSheetQualifiedRef
  - translateFormulaRefs
  - getCell
  - setCell
  - excelSerialToDate
  - excelSerialToIsoDate
  - excelSerialToIsoDateTime
  - excelSerialToTime
  - isoDateToExcelSerial
  - parseDateValue
  - parsePeriodHeader
  - isExcelErrorValue
  - normalizeCellText
  - cellToString
  - formatCellDisplay
  - parseLocaleNumber
  - parseBooleanValue
  - parseThresholdValue
  - compareMissingLast
  - compareNatural
  - roundAdaptive
  - readXlsxBytes
  - writeXlsxBytes
  - readNamedTable
  - resolveDefinedName
  - createPatchSession
  - patchXlsxBytes
  - sniffCsvDelimiter
  - readCsvText
  - writeCsvText
  - defineExcelTheme
  - createWorkbookBuilder
  - resolveSheet
  - sheetToGrid
  - fillDownGrid
  - inferColumnType
  - profileSheet
  - cleanAnchorText
  - fuzzyMatchAnchor
  - createAliasResolver
  - scanKeyValueBlock
  - detectAxisHeader
  - scanStackedSections
  - scanGroupedRecords
  - scanStridedColumns
  - scanFormTable
  - scanMatrix
  - unpivotGrid
  - scanHierarchy
  - discoverRegions
  - flattenMergedHeaders
  - sheetToRecords
  - recordsToSheet
  - workbookToJson
  - jsonToWorkbook
  - fillDownRecords
  - canonicalizeValues
  - deriveField
  - mapRecords
  - filterRecords
  - sortRecords
  - pivotRecords
  - unpivotRecords
  - computeRunningTotals
  - computePeriodDeltas
  - rankRecords
  - alignSeriesByKey
  - joinRecords
  - dedupeRecords
  - projectTable
  - diffSheets
  - diffWorkbooks
  - validateSheetRules
  - isTempOfficeFile
  - slugifyFileName
  - readExcelFile
  - downloadXlsxBytes
  - downloadCsvText
  - createXlsxAdapter
  - createCsvAdapter
  - WorkbookModel
  - WorksheetModel
  - CellModel
  - ExcelStyleSpec
  - ExcelTheme
  - PatchSession
  - WorkbookBuilder
  - SheetBuilder
  - TableProjection
  - FileAdapter
---

# Excel

## Overview

Pure-TypeScript spreadsheet engine for reading, writing, surgically patching, scanning, analyzing, validating, and exporting Excel and CSV/TSV files in browser and Node 20+ environments. It has zero runtime dependencies other than `fflate`, requires no Web Workers, works inside single-file `file://` bundles, and is 100% synchronous in memory (only `readExcelFile` and the async `FileAdapter` hooks for `cs/svelte/file-system` return promises).

## Supported Formats

| Format | Extensions | Read | Write from Scratch | Lossless Patch | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| OOXML Workbook | `.xlsx` | Yes | Yes | Yes | Full styles, shared strings, formulas, tables, defined names, comments, hyperlinks, validations. |
| Macro-Enabled OOXML | `.xlsm` | Yes | No | Yes | Preserves `vbaProject.bin`, macro content types, drawings, charts, pivot tables, and conditional formatting untouched. |
| OOXML Templates | `.xltx`, `.xltm` | Yes | Yes | Yes | Pass `convertTemplateToWorkbook: true` on `writeXlsxBytes`, `session.toBytes()`, or `patchXlsxBytes` to convert content types to `.xlsx` / `.xlsm`. |
| Delimited Text | `.csv`, `.tsv` | Yes | Yes | — | RFC 4180 parser/serializer with auto-delimiter sniffing (`,`, `;`, `\t`), UTF-8 BOM handling, and optional formula-injection guard. |
| Legacy / Other | `.xls`, `.xlsb`, `.ods` | No | No | No | Rejected immediately (by OLE2 magic bytes, extension, or MIME type) with `ExcelError("UNSUPPORTED_FORMAT")`. |

## Reading & Writing `.xlsx`

`readXlsxBytes` parses a `Uint8Array` or `ArrayBuffer` into a `WorkbookModel`. `writeXlsxBytes` serializes a `WorkbookModel` into `.xlsx` bytes. Use `readNamedTable` and `resolveDefinedName` to query structured Excel tables (`ListObject`) and workbook/sheet-scoped named ranges.

```ts
import {
	getCell,
	readNamedTable,
	readXlsxBytes,
	resolveDefinedName,
	setCell,
	writeXlsxBytes,
	type WorkbookModel,
} from "cs/svelte/excel";

// Read an existing workbook
const workbook = readXlsxBytes(xlsxBytes, {
	includeStyles: true,
	includeComments: true,
	includeValidations: true,
	includeHyperlinks: true,
	includeTables: true,
	sheetFilter: (name) => !name.startsWith("_"),
});

// Read a structured Excel Table (ListObject)
const ordersTable = readNamedTable(workbook, "OrdersTable");
if (ordersTable) {
	console.log(ordersTable.table.ref, ordersTable.records);
}

// Resolve a workbook- or sheet-scoped Defined Name
const taxRateRef = resolveDefinedName(workbook, "TaxRate", { sheetName: "Summary" });
if (taxRateRef?.sheetName && taxRateRef.ref) {
	const sheet = workbook.sheets.find((s) => s.name === taxRateRef.sheetName);
	const cell = sheet ? getCell(sheet, taxRateRef.ref) : undefined;
	console.log("Tax rate:", cell?.value);
}

// Write a workbook from scratch
const summarySheet = { name: "Summary", cells: new Map() };
setCell(summarySheet, "A1", { value: "Revenue", style: { font: { bold: true } } });
setCell(summarySheet, "B1", { value: 42_500, style: { numFmt: "#,##0.00" } });

const outModel: WorkbookModel = {
	dateSystem: 1900,
	sheets: [summarySheet],
};

const bytes = writeXlsxBytes(outModel, {
	useSharedStrings: true, // default: true
	compressionLevel: 6, // 0 | 1 | 6 | 9 (default: 6)
	sanitizeFormulaInjection: false, // default: false
});
```

## Lossless Surgical Patching

When editing existing templates or `.xlsm` workbooks, use `createPatchSession` or `patchXlsxBytes` instead of `readXlsxBytes` + `writeXlsxBytes`. Patching modifies only touched XML slices and preserves untouched ZIP parts (`vbaProject.bin`, charts, drawings, pivot tables, `<conditionalFormatting>`, custom XML, etc.) byte-for-byte.

```ts
import { createPatchSession, patchXlsxBytes } from "cs/svelte/excel";

// One-shot helper
const patchedBytes = patchXlsxBytes(
	templateBytes,
	(session) => {
		session
			.setCellValue("Budget", "C4", 18_500, { preserveStyle: true })
			.setCellValue("Budget", "D4", "Approved", { stringMode: "shared" })
			.setFormula("Budget", "E4", "SUM(C4:C12)")
			.setRowHidden("Budget", 15, true)
			.setColWidth("Budget", [2, 4], 16)
			.setSheetVisibility("Scratchpad", "hidden");
	},
	{
		onFormulaCache: "clear", // "preserve" (default) | "clear" | "recalculate"
		clearScope: "workbook", // "workbook" (default) | "sheet"
		convertTemplateToWorkbook: true, // converts .xltx/.xltm -> .xlsx/.xlsm
	},
);

// Multi-step session with custom formula recalculation
const session = createPatchSession(xlsmBytes, {
	onFormulaCache: "recalculate",
	evaluator: {
		recalculate(wb, changedCells) {
			// Return updated cached values for dependent formula cells
			return [{ sheetName: "Budget", ref: "E4", value: 18_500 }];
		},
	},
});
session.setCellValue("Budget", "C4", 18_500);
session.recalculate();
const updatedXlsmBytes = session.toBytes();
```

**`onFormulaCache` policies:**
- `"preserve"` (default): Leaves existing `<v>` cached formula results untouched.
- `"clear"`: Removes cached `<v>` results across `clearScope` (`"workbook"` or `"sheet"`), drops `xl/calcChain.xml`, and sets `fullCalcOnLoad="1"` on `<calcPr>` so Excel recalculates on open.
- `"recalculate"`: Uses the supplied `FormulaEvaluator` to update cached `<v>` values and removes `calcChain.xml`.

**Other `PatchSession` methods:** `getWorkbook()`, `setCachedResult()`, `setCellStyle()`, `clearCellValue()`, `deleteCell()`, `setRowHeight()`, `setColHidden()`, `addHyperlink()`, `setDataValidation()`, `toBytes()`.

## Declarative Themed Exports

Use `createWorkbookBuilder`, `ZINC_CAUTION_THEME`, and `defineExcelTheme` to produce styled multi-sheet reports with auto-fitted column widths, frozen headers, auto-filters, totals rows, and semantic status highlights (`"base" | "positive" | "caution" | "negative"`).

```ts
import { createWorkbookBuilder, defineExcelTheme } from "cs/svelte/excel";

interface ProjectRow {
	name: string;
	owner: string;
	budget: number;
	variancePct: number;
}

const rows: ProjectRow[] = [
	{ name: "North Wing", owner: "A. Weber", budget: 120_000, variancePct: -0.04 },
	{ name: "South Annex", owner: "M. Lindner", budget: 85_000, variancePct: 0.14 },
];

// Merges overrides on top of ZINC_CAUTION_THEME automatically
const customTheme = defineExcelTheme({
	fontFamily: "Inter",
	header: { bg: "#F4F4F5", fg: "#18181B" },
});

const bytes = createWorkbookBuilder({
	theme: customTheme,
	dateSystem: 1900,
	sanitizeFormulaInjection: true,
})
	.sheet("Projects", (sheet) => {
		sheet
			.setView({ showGridLines: true, tabColor: "#D97706" })
			.addTitleBlock({
				title: "Q3 Capital Projects",
				subtitle: "Generated from workspace snapshot",
				mergeCols: 4,
				emptyRowsAfter: 1,
			})
			.addTable({
				columns: [
					{ id: "name", header: "Project", accessor: "name" },
					{ id: "owner", header: "Owner", accessor: "owner" },
					{
						id: "budget",
						header: "Budget (EUR)",
						accessor: "budget",
						align: "right",
						numFmt: "#,##0",
					},
					{
						id: "variancePct",
						header: "Variance",
						accessor: "variancePct",
						align: "right",
						numFmt: "0.0%",
						status: (v) => {
							const n = Number(v);
							if (n > 0.1) return "negative";
							if (n > 0) return "caution";
							return "positive";
						},
					},
				],
				rows,
				totalsRow: {
					name: "Total",
					budget: { value: 205_000, formula: { expression: "SUM(C5:C6)" } },
				},
				freezeHeader: true,
				autoFilter: true,
				autoFit: { minWidth: 10, maxWidth: 42, padding: 3 },
			})
			.setPageSetup({ orientation: "landscape", paperSize: "A4", fitToWidth: 1, fitToHeight: 0 });
	})
	.toBytes();
```

## CSV & TSV

`sniffCsvDelimiter` scores `,`, `;`, and `\t` across up to 25 logical rows outside quotes. `readCsvText` parses RFC 4180 text into a single-sheet `WorkbookModel`. `writeCsvText` serializes any `WorksheetModel` with optional UTF-8 BOM and formula-injection protection.

```ts
import { readCsvText, sniffCsvDelimiter, writeCsvText } from "cs/svelte/excel";

const delimiter = sniffCsvDelimiter(rawCsv); // "," | ";" | "\t"

const workbook = readCsvText(rawCsv, {
	delimiter: "auto", // default: "auto"
	sheetName: "Imported",
	trimCells: true,
	maxBytes: 64 * 1024 * 1024, // default: 64 MiB
	maxRows: 1_048_576, // default: 1,048,576
});

const firstSheet = workbook.sheets[0];
const safeCsv = firstSheet
	? writeCsvText(firstSheet, {
			delimiter: ";", // default: ","
			bom: true, // prepend UTF-8 BOM for Excel on Windows (default: false)
			lineEnding: "\r\n", // default: "\r\n"
			formatDisplay: true, // format numbers/dates using cell numFmt (default: true)
			sanitizeFormulaInjection: true, // prefix untrusted =,+,-,@,\t,\r strings with "'" (default: false)
		})
	: "";
```

## Messy Spreadsheet Ingestion

Real-world spreadsheets rarely start at `A1` or use clean single-row headers. The scanner layer normalizes sheets into dense grids, profiles columns, fuzzy-matches labels, and implements 10 reusable layout patterns (**Patterns A–J**).

```ts
import {
	fillDownGrid,
	fuzzyMatchAnchor,
	profileSheet,
	resolveSheet,
	sheetToGrid,
} from "cs/svelte/excel";

// Resolve sheet by exact, normalized, or fuzzy candidate name
const sheet = resolveSheet(workbook, ["Monthly Report", "Monatsbericht"], {
	normalize: true,
	fuzzy: { maxDistance: 2 },
});
if (!sheet) throw new Error("Report sheet missing");

// Inspect dimensions, fill rate, detected header row, and inferred column types
const profile = profileSheet(sheet, { dateSystem: workbook.dateSystem });

// Convert to dense GridRow[] with merged-cell expansion and hidden-row policy
const grid = sheetToGrid(sheet, {
	hiddenPolicy: "skip", // "include" | "skip" | "skip-if-empty"
	expandMergedCells: "top-left", // "none" | "top-left"
});

// Fill down blank grouping cells in columns 0 and 1
const filled = fillDownGrid(grid, { colIndices: [0, 1], stopOnBlankRow: true });

// Fuzzy-match noisy anchor labels (umlaut/diacritic folding, structural guard)
const isMatch = fuzzyMatchAnchor("Gesamtkosten (EUR)", "Gesamtkosten", {
	mode: "startsWith",
	maxDistance: 1,
});
```

### Layout Patterns A–J

| Pattern | Function | Purpose |
| :--- | :--- | :--- |
| **A** | `scanKeyValueBlock(grid, options)` | Vertical, horizontal, or multi-pair key-value metadata blocks (with optional cross-sheet fallback). |
| **B** | `detectAxisHeader(grid, options)` | Detects horizontal period/date/numeric axis headers with lookahead/lookbehind from anchor rows and attached metadata rows. |
| **C** | `scanStackedSections(grid, options)` | Cursor state machine over stacked blocks sharing a column axis, with validation rows, subtotals, summaries, and stop anchors. |
| **D** | `scanGroupedRecords(grid, options)` | Multi-row entity blocks with bounded lookahead (`maxLookahead`), early break on next entity, and sub-sections. |
| **E** | `scanStridedColumns(grid, options)` | Fixed $K$-column repeating strides per axis group with automatic duplicate header disambiguation. |
| **F** | `scanFormTable(grid, options)` | Dynamic header binding over form templates, separating template placeholders from user-entered rows up to a footer stop anchor. |
| **G** | `scanMatrix(grid, options)` / `unpivotGrid(grid, options)` | Cross-tab row-header × column-header extraction into normalized `{ rowKey, colKey, value }[]`. |
| **H** | `scanHierarchy(grid, options)` | Reconstructs parent-child trees from row `outlineLevel`, cell `indent`, leading whitespace, or numbering codes (`1.2.3`). |
| **I** | `discoverRegions(grid, options)` | Detects contiguous rectangular non-empty table islands separated by blank rows/columns. |
| **J** | `flattenMergedHeaders(sheet, options)` | Resolves merged super-headers (`A1:C1` over `A2:C2`) into hierarchical column paths or joined keys. |

Additional helper: `createAliasResolver(aliases, options?)` builds a reusable fuzzy alias lookup function.

## Extraction, Analytics & UI Projection

### Structured Extraction (`sheetToRecords`)

`sheetToRecords` maps fuzzy column aliases, parses cell values, and validates each row against a **synchronous** `StandardSchemaV1` validator (Zod, Valibot, ArkType, etc.). Validation errors never abort extraction—they are collected in `diagnostics[]` with sheet name, cell ref, row/col, and field metadata.

```ts
import {
	parseLocaleNumber,
	sheetToRecords,
	type StandardSchemaV1,
} from "cs/svelte/excel";

interface OrderRecord {
	orderId: string;
	amount: number;
}

declare const orderSchema: StandardSchemaV1<unknown, OrderRecord>;

const result = sheetToRecords<OrderRecord>(sheet, {
	columns: [
		{ field: "orderId", aliases: ["Order ID", "Bestell-Nr"], required: true },
		{
			field: "amount",
			aliases: ["Amount", "Betrag"],
			parse: (raw) => parseLocaleNumber(raw),
		},
	],
	schema: orderSchema, // MUST be synchronous
	onInvalidRow: "skip", // "skip" (default) | "include"
});

console.log(result.records, result.diagnostics, result.mappedColumns);
```

### Pivoting, Sorting & UI Table Projection

```ts
import {
	pivotRecords,
	projectTable,
	sortRecords,
} from "cs/svelte/excel";

const pivoted = pivotRecords(orders, {
	groupBy: ["region"],
	timeBucket: { field: "orderDate", bucket: "quarter", outputField: "quarter" },
	measures: [
		{ name: "totalRevenue", field: "amount", aggregation: "sum" },
		{ name: "avgOrder", field: "amount", aggregation: "avg" },
		{ name: "orderCount", aggregation: "count" },
	],
});

const sorted = sortRecords(pivoted, [
	{ field: "region", direction: "asc", natural: true },
	{ field: "totalRevenue", direction: "desc" },
]);

const projection = projectTable(sorted, {
	columns: [
		{ id: "region", header: "Region", accessor: "region" },
		{ id: "quarter", header: "Quarter", accessor: "quarter" },
		{
			id: "totalRevenue",
			header: "Revenue",
			accessor: "totalRevenue",
			align: "right",
			numFmt: "#,##0.00",
			status: (v) => (Number(v) >= 50_000 ? "positive" : "base"),
		},
	],
	frozenRows: 1,
	frozenCols: 1,
});
```

Additional record transforms exported from `cs/svelte/excel`:
- `recordsToSheet`, `workbookToJson`, `jsonToWorkbook`
- `fillDownRecords`, `canonicalizeValues`, `deriveField`, `mapRecords`, `filterRecords`
- `unpivotRecords`, `computeRunningTotals`, `computePeriodDeltas`, `rankRecords`, `alignSeriesByKey`, `joinRecords`, `dedupeRecords`

### Diffing & Validation Rules

```ts
import { diffSheets, diffWorkbooks, validateSheetRules } from "cs/svelte/excel";

// Cell-level or key-matched row-level diffing
const sheetDiff = diffSheets(beforeSheet, afterSheet, {
	mode: "row", // "cell" (default) | "row"
	keyHeader: "Order ID",
	compareFormulas: true,
	ignoreWhitespace: true,
});

const wbDiff = diffWorkbooks(beforeWb, afterWb, {
	sheetFilter: (name) => name !== "Scratchpad",
});

// Declarative QA / audit rules (accepts WorksheetModel or WorkbookModel)
const report = validateSheetRules(workbook, [
	{ kind: "required", sheet: "Orders", col: "A", startRow: 2 },
	{ kind: "unique", sheet: "Orders", col: "A", startRow: 2 },
	{ kind: "range", sheet: "Orders", col: "C", startRow: 2, min: 0 },
	{ kind: "sumEquals", sheet: "Orders", sourceRange: "C2:C50", targetRef: "C51", tolerance: 0.01 },
	{
		kind: "crossSheetEquals",
		leftSheet: "Orders",
		leftRef: "C51",
		rightSheet: "Summary",
		rightRef: "B4",
	},
	{ kind: "cutoffReached", sheet: "KPIs", col: "D", startRow: 2, cutoff: 0.95, operator: ">=" },
	{ kind: "noZeroBaseWithPositiveTarget", sheet: "Budget", baseCol: "B", targetCol: "C", startRow: 2 },
]);

if (!report.valid) {
	console.warn(`${report.errorCount} errors, ${report.cautionCount} cautions`, report.issues);
}
```

## Browser I/O & `file-system` Adapters

### Browser Upload & Download Helpers

```ts
import {
	downloadCsvText,
	downloadXlsxBytes,
	isTempOfficeFile,
	readCsvText,
	readExcelFile,
	readXlsxBytes,
	slugifyFileName,
} from "cs/svelte/excel";

async function handleFileInput(file: File) {
	if (isTempOfficeFile(file.name)) return; // skips ~$lock files

	const loaded = await readExcelFile(file); // async: reads File/Blob + validates magic bytes/extension
	const workbook =
		loaded.format === "csv" || loaded.format === "tsv"
			? readCsvText(new TextDecoder().decode(loaded.bytes))
			: readXlsxBytes(loaded.bytes);

	return workbook;
}

const fileName = slugifyFileName(["Q3 Report", "München"], {
	dateSuffix: true,
	extension: "xlsx",
}); // e.g. "q3-report-muenchen-2026-11-19.xlsx"

downloadXlsxBytes(xlsxBytes, fileName);
downloadCsvText(csvText, "export.csv");
```

### Structural `FileAdapter` Factories for `cs/svelte/file-system`

`createXlsxAdapter` and `createCsvAdapter` return objects structurally compatible with `FileAdapter` from `cs/svelte/file-system` without importing `cs/svelte/file-system` (keeping modules decoupled).

```ts
import { createCsvAdapter, createXlsxAdapter, sheetToRecords } from "cs/svelte/excel";
import { defineCollection, defineWorkspace } from "cs/svelte/file-system";

const ordersXlsxAdapter = createXlsxAdapter({
	id: "orders-xlsx",
	extensions: [".xlsx", ".xlsm"],
	fromWorkbook: (wb) => {
		const firstSheet = wb.sheets[0];
		return firstSheet ? sheetToRecords(firstSheet).records : [];
	},
	// Optional StandardSchemaV1 (sync or async) and toWorkbook() for writes
});

const logsCsvAdapter = createCsvAdapter({
	id: "logs-csv",
	readOptions: { delimiter: "auto", trimCells: true },
	writeOptions: { delimiter: ";", bom: true, sanitizeFormulaInjection: true },
});

export const workspace = defineWorkspace({
	namespace: "my-app",
	collections: {
		orders: defineCollection({
			pattern: "imports/{id}.xlsx",
			adapter: ordersXlsxAdapter,
		}),
		logs: defineCollection({
			pattern: "exports/{id}.csv",
			adapter: logsCsvAdapter,
		}),
	},
});
```

## Coordinates, Dates & Value Helpers

- **Coordinates (`coords.ts`):** `colToLetter`, `letterToCol`, `parseCellRef`, `formatCellRef`, `parseRangeRef`, `parseSheetQualifiedRef`, `translateFormulaRefs`, `getCell`, `setCell`.
- **Dates (`dates.ts`):** `excelSerialToDate`, `excelSerialToIsoDate`, `excelSerialToIsoDateTime`, `excelSerialToTime`, `isoDateToExcelSerial`, `parseDateValue`, `parsePeriodHeader`.
- **Values (`values.ts`):** `isExcelErrorValue`, `normalizeCellText`, `cellToString`, `formatCellDisplay`, `parseLocaleNumber`, `parseBooleanValue`, `parseThresholdValue`, `compareMissingLast`, `compareNatural`, `roundAdaptive`.

## Caveats & Security Defaults

1. **Zip-Bomb & Size Limits:**
   `readXlsxBytes` enforces strict limits both before and after ZIP inflation (catching spoofed central-directory headers):
   - `maxUncompressedBytes`: `128 MiB` (`134_217_728`)
   - `maxEntryBytes`: `64 MiB` (`67_108_864`)
   - `maxEntryCount`: `4_096`
   - `maxSheets`: `256`
   - `maxCells`: `2_000_000`
   `readCsvText` defaults to `maxBytes: 64 MiB`, `maxRows: 1_048_576`, and hard-caps columns at `16_384`. Exceeding any limit throws `ExcelError("LIMIT_EXCEEDED")`.
2. **XXE & Path Traversal Rejection:**
   Any XML part containing `<!DOCTYPE` or `<!ENTITY` throws `ExcelError("CORRUPT_XML")`. Any ZIP entry path escaping the archive root (`..`) throws `ExcelError("CORRUPT_ARCHIVE")`.
3. **Formula Injection Guard (`sanitizeFormulaInjection`):**
   Defaults to `false` on `writeCsvText`, `writeXlsxBytes`, and `createWorkbookBuilder` to avoid mutating trusted data unexpectedly. Enable `sanitizeFormulaInjection: true` whenever exporting untrusted user text: string cells (without explicit `formula` and not already prefixed with `'`) starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are prefixed with `'`.
4. **Sync-Only `StandardSchemaV1` in `sheetToRecords`:**
   `sheetToRecords` is 100% synchronous. If a passed `StandardSchemaV1` validator returns a Promise/thenable, `sheetToRecords` throws `ExcelError("INVALID_CONFIG")`. Use `createXlsxAdapter` / `createCsvAdapter` if you need async schema validation during file I/O.
5. **1900 / 1904 Pure-UTC Date Math:**
   All serial conversions use pure UTC arithmetic to avoid local timezone and DST off-by-one bugs. In the 1900 date system, Excel's legacy Lotus 1-2-3 leap-year bug (phantom `1900-02-29`, serial `60`) is clamped to `1900-02-28` (`23:59:59` max for fractional serial 60), while serials `< 60` and `> 60` align with Excel's calendar.

## `ExcelErrorCode` Reference

All operational errors throw `ExcelError` (checkable with `isExcelError(err)`), exposing `err.code`, `err.message`, optional `err.details`, and optional `err.cause`.

| Code | Meaning |
| :--- | :--- |
| `UNSUPPORTED_FORMAT` | Unsupported file extension (`.xls`, `.xlsb`, `.ods`), OLE2 binary header, or unsupported MIME type. |
| `INVALID_CONFIG` | Invalid option value, invalid delimiter, async schema passed to `sheetToRecords`, missing DOM for download, or invalid adapter config. |
| `LIMIT_EXCEEDED` | Archive or CSV exceeded `maxUncompressedBytes`, `maxEntryBytes`, `maxEntryCount`, `maxSheets`, `maxCells`, `maxBytes`, `maxRows`, or `16_384` columns. |
| `CORRUPT_ARCHIVE` | Missing ZIP signature, failed decompression, path traversal (`..`), or missing required OOXML part. |
| `CORRUPT_XML` | Malformed XML, missing root element, or forbidden `<!DOCTYPE` / `<!ENTITY` declaration. |
| `SHEET_NOT_FOUND` | Requested sheet name does not exist in the workbook or patch session. |
| `INVALID_CELL_REF` | Cell reference or column/row index is malformed or outside Excel bounds (`A1..XFD1048576`). |
| `INVALID_RANGE_REF` | Range or sheet-qualified range reference is malformed. |
| `PATCH_FAILED` | Overlapping/out-of-bounds XML slice patch, invalid self-closing tag expansion, or attempted partial mutation of a multi-cell array formula. |
| `SCHEMA_VALIDATION_FAILED` | Standard Schema v1 validation failed in an adapter (`createXlsxAdapter` / `createCsvAdapter`) or recorded as a diagnostic code in `sheetToRecords`. |
| `FORMULA_EVALUATION_FAILED` | Supplied `FormulaEvaluator.recalculate()` threw an error or returned invalid results during `PatchSession`. |
