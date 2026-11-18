# Excel — Module Blueprint

## 1. Overview & Scope

- **Module:** `excel` (`src/modules/excel/`, imported as `cs/svelte/excel`)
- **Kind:** `utility` (headless, framework-agnostic pure TypeScript; zero `.svelte` components, zero CSS)
- **Runtime Dependency:** `fflate` (sole runtime dependency for synchronous, zero-stream ZIP/DEFLATE via `zipSync`, `unzipSync`, `strToU8`, `strFromU8`).
- **Environment Contract:** 100 % synchronous in-memory browser & test execution (`Uint8Array` / `ArrayBuffer` / `Blob` / `File`), fully compatible with `vite-plugin-singlefile` (`file://`), Vitest, and Bun. Zero Node.js streams, zero Web Workers, zero `fetch()`, and zero cross-module imports (no imports from `src/modules/file-system/` or other modules).

### 1.1 Supported Formats (v1)

| Format | Read | Write (From Scratch) | Surgical In-Place Patch | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `.xlsx` | Full | Full | Full | Standard OOXML SpreadsheetML |
| `.xlsm` | Full | No *(non-goal)* | Full | Preserves `xl/vbaProject.bin`, `xl/vbaData.xml`, rels, and macro content types byte-for-byte |
| `.xltx` / `.xltm` | Full | Optional export as `.xlsx` | Full | Same OOXML package; `convertTemplateToWorkbook` swaps `[Content_Types].xml` main workbook content type (`template.main` → `sheet.main`, `template.macroEnabled.main` → `sheet.macroEnabled.main`) |
| `.csv` / `.tsv` | Full | Full | N/A | Pure-TS RFC 4180, delimiter sniffing (`"," \| ";" \| "\t"`), UTF-8 BOM option, optional formula-injection guard |
| `.xls` (BIFF8), `.xlsb`, `.ods` | No | No | No | Rejected immediately with `ExcelError("UNSUPPORTED_FORMAT")` |

> **Why `.xlsm` authoring from scratch is a non-goal:** `vbaProject.bin` is a compiled Microsoft CFBF/OLE2 binary container with P-code/VBA streams. Authoring macros from scratch is out of scope, whereas surgical patching preserves existing macro containers untouched.

### 1.2 Feature Feasibility, Complexity & Recommendation Matrix

| Feature Area | v1 Status | Complexity | Architectural Notes |
| :--- | :--- | :--- | :--- |
| Cell values (`number`, `string`, `boolean`, `date`, `error`) | **Included** | Low | Native OOXML types (`n`, `s`, `inlineStr`, `str`, `b`, `e`, `d`, serial date/time) |
| Raw formula metadata (`<f>` + cached `<v>`, shared/array) | **Included** | Low–Med | Read normal/shared/array `<f>` + `<v>`; write & patch `<f>` + `<v>`; evaluator deferred |
| Rich-text runs (`<r><t>`) | **Included** | Low–Med | Read concatenated/structured runs; optional structured run write |
| Styles (`StyleRegistry`) & theme/indexed colors | **Included** | Medium | Deduplicates fonts, `bg` fills, borders, alignments, `numFmt` (`cellXfs`); resolves `rgb`, `indexed`, and `theme`+`tint` |
| `mergedCells`, row/col `hidden` & `outlineLevel` | **Included** | Low | Preserves hierarchy/grouping metadata for extraction & export |
| Custom column widths, row heights, `freezePanes`, `autoFilter` | **Included** | Low | Native sheet view & dimension elements |
| Print & view polish (`showGridLines`, `tabColor`, `pageSetup`) | **Included** | Low | Sheet view gridlines, tab accent color, margins, orientation, fit-to-page, print titles/area |
| `1900` & `1904` date systems (date + datetime + time) | **Included** | Low | Reads `workbookPr/@date1904`; handles Lotus-1900 leap-year quirk + fractional serial time |
| Hyperlinks (external URLs & internal sheet refs) | **Included** | Low | `xl/worksheets/_rels/*.rels` + `<hyperlinks>` (`r:id` or `location`) |
| Data Validations (`list`, `whole`, `decimal`, `date`, `textLength`, `custom`) | **Included** | Low–Med | Standard `<dataValidations>` XML with prompts, alerts, `allowBlank`, `showDropDown` |
| Excel Tables (`xl/tables/table*.xml`) & Defined Names (`<definedNames>`) | **Read + Patch Preserve** | Low–Med | Read `workbook.tables`, `readNamedTable()`, `resolveDefinedName()`; preserved in Patcher |
| Cell Comments / Notes (`commentsN.xml`, `threadedComments`) | **Read + Patch Preserve** | High (write) | Reading & lossless patch preservation; from-scratch legacy `vmlDrawingN.vml` deferred to Phase 2 |
| Conditional Formatting (`<conditionalFormatting>`) | **Patch Preserve** | Med–High (write) | Preserved byte-for-byte in patcher; declarative rule builder deferred to Phase 2 |
| Formula Evaluation Engine (Lexer/AST/DAG) | **Deferred** | High | Out of scope in v1; pluggable `FormulaEvaluator` hook reserved in Core & Patcher |
| Svelte Reactive State / UI Table Components | **Deferred** | Low | Pure headless TS in v1; `TableProjection` contract bridges to future `table` / `.svelte.ts` modules |

---

## 2. Public API

### 2.1 File Layout (`src/modules/excel/`)

`index.ts` is the sole public entry point. Files containing `.internal.` MUST NOT be exported from `index.ts`.

```text
src/modules/excel/
  index.ts                    # Sole public barrel
  types.ts                    # Public contracts (Workbook, Worksheet, Cell, PatchSession, TableProjection, etc.)
  errors.ts                   # EXCEL_ERROR_CODES, ExcelError, isExcelError
  coords.ts                   # A1 <-> { col, row } & range/sheet-qualified ref parsing/formatting
  dates.ts                    # 1900/1904 serial date/datetime/time math, ISO/EU/US dates, period parsing
  values.ts                   # Locale/accounting numbers, thresholds, display formatting, text normalization, comparators
  ooxml.ts                    # readXlsxBytes, writeXlsxBytes, createPatchSession, patchXlsxBytes, readNamedTable, resolveDefinedName
  ooxml-xml.internal.ts       # Namespace-agnostic XML scanner, entity/space handling, chunked Uint8Array writer, sorted slice patcher
  ooxml-styles.internal.ts    # StyleRegistry (cellXfs/fonts/fills/borders/numFmts) & theme/indexed color resolver
  ooxml-strings.internal.ts   # SharedStrings reader (plain + <r><t>) & deduplicating writer
  ooxml-package.internal.ts   # Relationship-driven ZIP/Content_Types/rels resolution, zip-bomb bounds, table/validation/hyperlink/comment XML
  csv.ts                      # readCsvText, writeCsvText, sniffCsvDelimiter
  builder.ts                  # createWorkbookBuilder, defineExcelTheme, ZINC_CAUTION_THEME
  scanner.ts                  # resolveSheet, sheetToGrid, fillDownGrid, profileSheet, inferColumnType, fuzzy matching, Patterns A–J
  query.ts                    # sheetToRecords, recordsToSheet, workbookToJson, jsonToWorkbook, transforms, window analytics, projectTable
  diff.ts                     # diffWorkbooks, diffSheets
  validate.ts                 # validateSheetRules
  browser-io.ts               # readExcelFile, downloadXlsxBytes, downloadCsvText, isTempOfficeFile, slugifyFileName
  adapters.ts                 # Structural FileAdapter-compatible factories (xlsx / csv) + StandardSchemaV1
  excel.blueprint.md          # This architectural specification
  excel.docs.md               # Public user documentation (written during implementation)
  excel.internal.md           # Internal engineering invariants (written during implementation)
```

### 2.2 Errors (`errors.ts`)

```ts
export const EXCEL_ERROR_CODES = [
  "UNSUPPORTED_FORMAT",
  "INVALID_CONFIG",
  "LIMIT_EXCEEDED",
  "CORRUPT_ARCHIVE",
  "CORRUPT_XML",
  "SHEET_NOT_FOUND",
  "INVALID_CELL_REF",
  "INVALID_RANGE_REF",
  "PATCH_FAILED",
  "SCHEMA_VALIDATION_FAILED",
  "FORMULA_EVALUATION_FAILED",
] as const;

export type ExcelErrorCode = (typeof EXCEL_ERROR_CODES)[number];

export interface ExcelErrorOptions {
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class ExcelError extends Error {
  readonly code: ExcelErrorCode;
  readonly details?: Record<string, unknown>;
  override readonly cause?: unknown;
  constructor(code: ExcelErrorCode, message: string, options?: ExcelErrorOptions);
}

export function isExcelError(value: unknown): value is ExcelError;
```

### 2.3 Core Option Arrays & Types (`types.ts`)

All enum option arrays use `UPPER_SNAKE_CASE` `as const`:
- `EXCEL_FORMATS = ["xlsx", "xlsm", "xltx", "xltm", "csv", "tsv"] as const` (`type ExcelFormat`)
- `SHEET_VISIBILITY_STATES = ["visible", "hidden", "veryHidden"] as const` (`type SheetVisibilityState`)
- `CELL_VALUE_TYPES = ["number", "string", "boolean", "date", "error", "empty"] as const` (`type CellValueType`)
- `CELL_STATUSES = ["base", "positive", "caution", "negative"] as const` (`type CellStatus`)
- `DIAGNOSTIC_SEVERITIES = ["caution", "negative"] as const` (`type DiagnosticSeverity`)
- `HIDDEN_ROW_POLICIES = ["include", "skip", "skip-if-empty"] as const` (`type HiddenRowPolicy`)
- `FORMULA_CACHE_POLICIES = ["preserve", "clear", "recalculate"] as const` (`type FormulaCachePolicy`)
- `DATE_SYSTEMS = [1900, 1904] as const` (`type ExcelDateSystem`)
- `SORT_DIRECTIONS = ["asc", "desc", "none"] as const` (`type SortDirection`)
- `AGGREGATION_KINDS = ["sum", "avg", "weightedAvg", "min", "max", "count", "countIf", "median", "percentile", "rate", "first", "last"] as const` (`type AggregationKind`)
- `TIME_BUCKETS = ["day", "month", "quarter", "year"] as const` (`type TimeBucket`)
- `JOIN_MODES = ["left", "inner", "outer"] as const` (`type JoinMode`)
- `INFERRED_COLUMN_TYPES = ["number", "date", "datetime", "boolean", "threshold", "currency", "string", "empty"] as const` (`type InferredColumnType`)

#### Core Coordinate, Workbook & Cell Data Model

```ts
export interface CellCoord {
  col: number;           // 0-based column index (0 = A, 16383 = XFD)
  row: number;           // 0-based row index (0 = row 1, 1048575 = row 1048576)
}

export interface ParsedCellRef extends CellCoord {
  colAbsolute: boolean;
  rowAbsolute: boolean;
}

export interface RangeRef {
  start: CellCoord;
  end: CellCoord;
}

export interface CellRichTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  fg?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface CellComment {
  author?: string;
  text: string;
  threaded?: boolean;
}

export interface CellHyperlink {
  target?: string;       // External URL (mailto:, https://, file:)
  location?: string;     // Internal workbook reference ("Sheet2!A1")
  display?: string;
  tooltip?: string;
}

export type CellScalar = number | string | boolean | Date | null;

export interface CellFormula {
  expression: string;    // Stored without leading "="; resolved for shared formula slaves on read
  kind?: "normal" | "shared" | "array" | "dataTable";
  sharedGroup?: number;  // OOXML si="..."
  ref?: string;          // Master/array target range (e.g. "C2:C10")
  dynamicArray?: boolean;
  cachedResult?: CellScalar;
  error?: string;        // e.g. "#REF!", "#DIV/0!"
}

export interface BorderEdgeSpec {
  style: "thin" | "medium" | "thick" | "dashed" | "dotted" | "double";
  fg?: string;
}

export interface ExcelStyleSpec {
  fg?: string;
  bg?: string;
  font?: {
    family?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
  };
  border?: {
    top?: BorderEdgeSpec;
    right?: BorderEdgeSpec;
    bottom?: BorderEdgeSpec;
    left?: BorderEdgeSpec;
  };
  align?: {
    horizontal?: "left" | "center" | "right" | "justify";
    vertical?: "top" | "center" | "bottom";
    wrapText?: boolean;
    indent?: number;
  };
  numFmt?: string;
}

export interface CellModel {
  value: CellScalar;
  type?: CellValueType;
  formula?: CellFormula;
  richText?: readonly CellRichTextRun[];
  style?: ExcelStyleSpec;
  hyperlink?: CellHyperlink;
  comment?: CellComment; // Read-only in v1; preserved by Patcher
}

export interface DataValidationRule {
  sqref: string;         // e.g. "B2:B100"
  kind: "list" | "whole" | "decimal" | "date" | "textLength" | "custom";
  operator?: "between" | "notBetween" | "equal" | "notEqual" | "greaterThan" | "lessThan" | "greaterThanOrEqual" | "lessThanOrEqual";
  formula1: string;      // e.g. '"A,B,C"' or '=Lists!$A$1:$A$10'
  formula2?: string;
  allowBlank?: boolean;
  showDropDown?: boolean;
  promptTitle?: string;
  prompt?: string;
  errorTitle?: string;   // Maps 1:1 to OOXML <dataValidation errorTitle="...">
  error?: string;        // Maps 1:1 to OOXML <dataValidation error="...">
  errorStyle?: "stop" | "warning" | "information"; // Literal OOXML ST_DataValidationErrorStyle enum
}

export interface ColumnSpec {
  min: number;           // 1-based column index
  max: number;
  width?: number;
  hidden?: boolean;
  outlineLevel?: number;
}

export interface RowMeta {
  rowIndex: number;      // 1-based Excel row index
  height?: number;
  hidden?: boolean;
  outlineLevel?: number;
  collapsed?: boolean;
}

export interface SheetFreezePane {
  rows?: number;         // ySplit
  cols?: number;         // xSplit
}

export interface SheetPageMargins {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  header?: number;
  footer?: number;
}

export interface SheetPageSetup {
  orientation?: "portrait" | "landscape";
  paperSize?: "A4" | "letter" | "legal" | number;
  fitToWidth?: number;   // Enables fitToPage="1" in <sheetPr><pageSetUpPr/></sheetPr> when width or height is set
  fitToHeight?: number;
  margins?: SheetPageMargins;
  printTitleRows?: string; // e.g. "1:2" -> serialized as _xlnm.Print_Titles definedName
  printTitleCols?: string; // e.g. "A:B"
  printArea?: string;      // e.g. "A1:H40" -> serialized as _xlnm.Print_Area definedName
}

export interface ExcelTableColumn {
  id: number;
  name: string;
  totalsRowFunction?: string;
  totalsRowLabel?: string;
}

export interface ExcelTableSpec {
  name: string;
  displayName?: string;
  sheetName: string;
  ref: string;           // e.g. "A1:F25"
  headerRowCount?: number;
  totalsRowCount?: number;
  autoFilterRef?: string;
  styleName?: string;
  columns: ExcelTableColumn[];
}

export interface DefinedNameSpec {
  name: string;
  formula: string;       // e.g. "'Assumptions'!$B$2:$B$12"
  localSheetId?: number; // 0-based sheet index for sheet-scoped names
  comment?: string;
  hidden?: boolean;
}

export interface WorksheetModel {
  name: string;
  state?: SheetVisibilityState;
  cells: Map<string, CellModel>; // Keyed by normalized uppercase A1 ref (e.g. "B4"); managed via getCell/setCell
  rowsMeta?: Map<number, RowMeta>;
  columns?: ColumnSpec[];
  merges?: string[];     // e.g. ["A1:D1"]
  freezePane?: SheetFreezePane;
  autoFilterRef?: string;
  dataValidations?: DataValidationRule[];
  showGridLines?: boolean;
  tabColor?: string;     // Hex "#RRGGBB"
  pageSetup?: SheetPageSetup;
  defaultRowHeight?: number;
  defaultColWidth?: number;
}

export interface WorkbookModel {
  dateSystem: ExcelDateSystem; // 1900 | 1904
  sheets: WorksheetModel[];
  tables?: ExcelTableSpec[];
  definedNames?: DefinedNameSpec[];
  sourceFormat?: "xlsx" | "xlsm" | "xltx" | "xltm";
}

export interface GridRow {
  rowIndex: number;      // 1-based Excel row index
  hidden: boolean;
  outlineLevel?: number;
  cells: unknown[];
}

export interface TableColumnSpec<TRow = Record<string, unknown>> {
  id: string;
  header: string;
  subHeader?: string;
  align?: "left" | "center" | "right";
  width?: number;
  numFmt?: string;
  accessor?: keyof TRow | ((row: TRow) => unknown);
  format?: (value: unknown, row: TRow) => string;
  status?: (value: unknown, row: TRow) => CellStatus;
}
```

#### Pluggable Formula Hook (v1 Contract, Evaluator Deferred)

```ts
export interface FormulaRecalcTarget {
  sheetName: string;
  ref: string;
  expression: string;
  currentCachedResult: CellScalar;
}

export interface FormulaEvaluator {
  recalculate(
    workbook: WorkbookModel,
    changedCells: ReadonlyArray<{ sheetName: string; ref: string }>,
  ): ReadonlyArray<{ sheetName: string; ref: string; value: CellScalar; error?: string }>;
}
```

### 2.4 Coordinates, Dates & Value Normalization (`coords.ts`, `dates.ts`, `values.ts`)

- **`coords.ts`:**
  - `colToLetter(colIndexZeroBased: number): string` (`0 -> "A"`, `26 -> "AA"`, `16383 -> "XFD"`)
  - `letterToCol(letters: string): number` (throws `ExcelError("INVALID_CELL_REF")` outside `0..16383`)
  - `parseCellRef(ref: string): ParsedCellRef` (0-based `col` and `row`; validates `0 <= col <= 16383`, `0 <= row <= 1048575`, else throws `ExcelError("INVALID_CELL_REF")`)
  - `formatCellRef(col: number, row: number, options?: { colAbsolute?: boolean; rowAbsolute?: boolean }): string`
  - `parseRangeRef(rangeRef: string): RangeRef` (normalizes reversed corners; throws `ExcelError("INVALID_RANGE_REF")` on invalid input)
  - `parseSheetQualifiedRef(ref: string): { sheetName?: string; range: RangeRef }` (handles `'Sheet Name'!$A$1:$D$10` and `''` unescaping)
  - `translateFormulaRefs(expression: string, colDelta: number, rowDelta: number): string` (translates non-`$` relative A1 refs outside string literals for shared formula resolution)
  - `getCell(sheet: WorksheetModel, ref: string): CellModel | undefined`
  - `setCell(sheet: WorksheetModel, ref: string, cell: CellModel): void`
- **`dates.ts`:**
  - `excelSerialToDate(serial: number, dateSystem?: ExcelDateSystem): Date | null` (pure UTC, sub-second rounded; handles `1900` Lotus-1900 leap-year bug: `1 <= serial < 60` uses `1899-12-31`, `serial >= 61` uses `1899-12-30`, `60 <= serial < 61` clamps to `1900-02-28` + time fraction; `0 <= serial < 1` returns time on epoch; `serial < 0` returns `null`; respects `dateSystem: 1904`)
  - `excelSerialToIsoDate(serial: number, dateSystem?: ExcelDateSystem): string | null` (`"YYYY-MM-DD"`)
  - `excelSerialToIsoDateTime(serial: number, dateSystem?: ExcelDateSystem): string | null` (`"YYYY-MM-DDTHH:mm:ssZ"`)
  - `excelSerialToTime(serial: number): string | null` (`"HH:mm:ss"`)
  - `isoDateToExcelSerial(isoDate: string | Date, dateSystem?: ExcelDateSystem): number` (preserves fractional UTC time when non-midnight)
  - `parseDateValue(input: unknown, options?: { dateSystem?: ExcelDateSystem; formats?: ("iso" | "eu" | "us")[] }): string | null` (normalizes `DD.MM.YYYY`, `D.M.YY`, `YYYY-MM-DD`, `MM/DD/YYYY`, ISO timestamps, serials)
  - `parsePeriodHeader(input: unknown, options?: { fallbackYear?: number; dateSystem?: ExcelDateSystem; locales?: ("de" | "en")[] }): string | null` (normalizes serial dates, `"January"`, `"März"`/`"Maerz"`, `"2026-01"`, `"2026-Q1"` → canonical `"YYYY-MM"` or `"YYYY-Q#"`)
- **`values.ts`:**
  - `EXCEL_ERROR_TOKENS`: `["#REF!", "#DIV/0!", "#VALUE!", "#N/A", "#NAME?", "#NUM!", "#NULL!", "#SPILL!", "#CALC!"] as const`
  - `isExcelErrorValue(value: unknown): boolean`
  - `normalizeCellText(value: unknown, options?: { stripZeroWidth?: boolean; collapseWhitespace?: boolean; normalizeLineEndings?: boolean }): string` (strips `\u00A0` NBSP and `\u200B-\u200D\uFEFF` zero-width characters, normalizes `\r\n`/`\r` to `\n`, optionally collapses whitespace runs)
  - `cellToString(value: unknown, options?: { emptyOnError?: boolean }): string`
  - `formatCellDisplay(cell: CellModel | CellScalar, options?: { numFmt?: string; dateSystem?: ExcelDateSystem; locale?: string; currencySymbol?: string }): string` (lightweight OOXML `numFmt` display formatter for `General`, `@`, decimals/thousands `#,##0.00`, percentages `0.0%`, currencies, negative parentheses, multi-section `pos;neg;zero;text`, and date/time patterns)
  - `parseLocaleNumber(value: unknown, options?: { emptyPlaceholders?: string[]; percentageMode?: "raw" | "ratio" | "percent" }): number | null`
    - Handles finite numbers, scientific notation, German decimal comma (`"106,89"`), thousands separator disambiguation (`/^[+-]?\d{1,3}(\.\d{3})+$/`), accounting parentheses (`"(70.000,00 €)"` → `-70000`), currency symbols (`€`, `$`, `CHF`, `GBP`, `EUR`), and placeholders (`"-"`, `"—"`, `""`, `"na"`).
  - `parseBooleanValue(value: unknown, options?: { trueTokens?: string[]; falseTokens?: string[] }): boolean | null` (supports `true/false`, `ja/nein`, `yes/no`, `1/0`, `x`)
  - `ThresholdParseOptions` & `HybridValue`:
    - `parseThresholdValue(value: unknown, options?: ThresholdParseOptions): HybridValue`
    - Returns `{ kind: "number" | "threshold" | "missing" | "text", raw: unknown, display: string, numeric: number | null, sortValue: number, operator?: "<" | "<=" | ">" | ">=", bound?: number, status?: CellStatus }`.
    - Configurable threshold aggregation & sort multiplier (e.g. `< 0,2` → `sortValue = 0.2 * 0.25`, `missing` → `Missing Last`).
  - `compareMissingLast(a: number | null, b: number | null, direction?: "asc" | "desc"): number`
  - `compareNatural(a: string, b: string, locale?: string): number` (`localeCompare(b, locale, { numeric: true })`)
  - `roundAdaptive(value: number, rules?: Array<{ minAbs: number; decimals: number }>): number`

### 2.5 OOXML Read, Write & Surgical Patch (`ooxml.ts`)

- **`ReadXlsxOptions` & `readXlsxBytes(bytes: Uint8Array | ArrayBuffer, options?: ReadXlsxOptions): WorkbookModel`**
  - Options: `{ includeStyles?: boolean; includeComments?: boolean; includeValidations?: boolean; includeHyperlinks?: boolean; includeTables?: boolean; sheetFilter?: string[] | ((name: string) => boolean); maxUncompressedBytes?: number; maxEntryBytes?: number; maxEntryCount?: number; maxSheets?: number; maxCells?: number }`
  - Default security bounds: `maxUncompressedBytes = 128 * 1024 * 1024`, `maxEntryBytes = 64 * 1024 * 1024`, `maxEntryCount = 4096`, `maxSheets = 256`, `maxCells = 2_000_000`.
  - Resolves all parts strictly via `_rels/.rels` → `workbook.xml.rels` → `sheetN.xml.rels` (never hardcoded paths); missing `sharedStrings.xml` or `styles.xml` are tolerated cleanly.
- **`WriteXlsxOptions` & `writeXlsxBytes(workbook: WorkbookModel, options?: WriteXlsxOptions): Uint8Array`**
  - Options: `{ useSharedStrings?: boolean; compressionLevel?: 0 | 1 | 6 | 9; convertTemplateToWorkbook?: boolean; sanitizeFormulaInjection?: boolean }`
  - Uses deduplicating `StyleRegistry` + `SharedStrings` + chunked `Uint8Array` row serialization and strict ECMA-376 XSD child element ordering.
- **Tables & Defined Names Helpers (`ooxml.ts`):**
  - `readNamedTable(workbook: WorkbookModel, tableName: string): { table: ExcelTableSpec; sheet: WorksheetModel; range: RangeRef; records: Array<Record<string, CellScalar>> } | null`
  - `resolveDefinedName(workbook: WorkbookModel, name: string, options?: { sheetName?: string }): { spec: DefinedNameSpec; sheetName?: string; range?: RangeRef; ref?: string } | null`
- **Surgical Patcher (`createPatchSession`, `patchXlsxBytes`):**
  - `PatchCellOptions`: `{ preserveStyle?: boolean; stringMode?: "inline" | "shared"; style?: ExcelStyleSpec }`
  - `PatchSessionOptions`: `{ onFormulaCache?: FormulaCachePolicy; clearScope?: "sheet" | "workbook"; evaluator?: FormulaEvaluator }`
  - `PatchSession` buffers all mutations per sheet and applies them in a single sorted pass inside `toBytes()`:
    - `getWorkbook(): WorkbookModel`
    - `setCellValue(sheetName: string, ref: string, value: CellScalar, options?: PatchCellOptions): this` (writes literal value, clears `<f>`, preserves `s="..."` unless `preserveStyle: false` or `style` is provided)
    - `setFormula(sheetName: string, ref: string, expression: string, cachedResult?: CellScalar, options?: PatchCellOptions): this`
    - `setCachedResult(sheetName: string, ref: string, cachedResult: CellScalar, error?: string): this`
    - `setCellStyle(sheetName: string, ref: string, style: ExcelStyleSpec): this` (appends/deduplicates into `xl/styles.xml` without shifting existing `cellXfs` indices)
    - `clearCellValue(sheetName: string, ref: string): this` (clears `<v>`, `<f>`, `<is>`, `t="..."` while keeping `s="..."` formatting intact)
    - `deleteCell(sheetName: string, ref: string): this` (removes the `<c>` element completely)
    - `setRowHidden(sheetName: string, rowIndex: number, hidden: boolean): this`
    - `setRowHeight(sheetName: string, rowIndex: number, height: number | null): this`
    - `setColWidth(sheetName: string, colIndexOrRange: number | [number, number], width: number | null): this`
    - `setColHidden(sheetName: string, colIndexOrRange: number | [number, number], hidden: boolean): this`
    - `setSheetVisibility(sheetName: string, state: SheetVisibilityState): this`
    - `addHyperlink(sheetName: string, ref: string, link: CellHyperlink): this`
    - `setDataValidation(sheetName: string, rule: DataValidationRule): this`
    - `recalculate(evaluator?: FormulaEvaluator): this`
    - `toBytes(options?: { convertTemplateToWorkbook?: boolean }): Uint8Array`
  - One-shot helper: `patchXlsxBytes(baseBytes: Uint8Array | ArrayBuffer, apply: (session: PatchSession) => void, options?: PatchSessionOptions & { convertTemplateToWorkbook?: boolean }): Uint8Array`

### 2.6 CSV / TSV (`csv.ts`)

- `sniffCsvDelimiter(text: string): "," | ";" | "\t"`
- `readCsvText(text: string, options?: { delimiter?: "auto" | "," | ";" | "\t"; sheetName?: string; trimCells?: boolean; maxBytes?: number; maxRows?: number }): WorkbookModel`
- `writeCsvText(sheet: WorksheetModel, options?: { delimiter?: "," | ";" | "\t"; bom?: boolean; lineEnding?: "\r\n" | "\n"; sanitizeFormulaInjection?: boolean; formatDisplay?: boolean; dateSystem?: ExcelDateSystem }): string`

### 2.7 Declarative Multi-Zone Builder & Themes (`builder.ts`)

- `ExcelTheme`: `{ fontFamily: string; title: ExcelStyleSpec & { rowHeight?: number }; subtitle: ExcelStyleSpec; header: ExcelStyleSpec & { rowHeight?: number }; subHeader: ExcelStyleSpec; data: ExcelStyleSpec & { rowHeight?: number }; footer: ExcelStyleSpec; statuses: Record<CellStatus, ExcelStyleSpec> }`
- `defineExcelTheme(theme: Partial<ExcelTheme> & { fontFamily?: string }): ExcelTheme`
- `ZINC_CAUTION_THEME`: Built-in theme (Zinc neutral surfaces + Caution-Amber alert highlight).
- `createWorkbookBuilder(options?: { theme?: ExcelTheme; dateSystem?: ExcelDateSystem; sanitizeFormulaInjection?: boolean }): WorkbookBuilder`
  - `builder.sheet(name: string, configure: (sheet: SheetBuilder) => void): this`
  - `SheetBuilder` methods:
    - `addTitleBlock({ title, subtitle?, emptyRowsAfter? })`
    - `addTable({ columns, subHeaderRow?, rows, totalsRow?, freezeHeader?, autoFilter?, autoFit? })`
    - `addValidation(rule: DataValidationRule)`
    - `addHyperlink(ref: string, link: CellHyperlink)`
    - `setFreezePane(pane: SheetFreezePane)`
    - `setView(options: { showGridLines?: boolean; tabColor?: string; state?: SheetVisibilityState })`
    - `setPageSetup(setup: SheetPageSetup)`
    - `toModel(): WorksheetModel`
  - `builder.toModel(): WorkbookModel`
  - `builder.toBytes(options?: WriteXlsxOptions): Uint8Array`

### 2.8 Structural Scanners, Profiling & Fuzzy Matching (`scanner.ts`)

- **Sheet, Grid & Cleaning Utilities:**
  - `resolveSheet(workbook: WorkbookModel, candidates: readonly string[], options?: { normalize?: boolean }): WorksheetModel | null`
  - `sheetToGrid(sheet: WorksheetModel, options?: { hiddenPolicy?: HiddenRowPolicy; preserveEmptyRows?: boolean; expandMergedCells?: "none" | "top-left"; resolveCell?: (cell: CellModel) => unknown }): GridRow[]`
  - `fillDownGrid(grid: readonly GridRow[], options?: { colIndices?: readonly number[]; stopOnBlankRow?: boolean; emptyValues?: readonly unknown[] }): GridRow[]` (forward-fills blank cells in grouped report columns)
- **Sheet Profiling & Type Inference:**
  - `inferColumnType(values: readonly unknown[], options?: { dateSystem?: ExcelDateSystem }): ColumnTypeInference` (`{ inferredType: InferredColumnType, confidence: number, nonEmptyCount: number, nullCount: number, distinctCount: number, min?: number | string, max?: number | string, sampleValues: unknown[] }`)
  - `profileSheet(sheet: WorksheetModel, options?: { headerRow?: number; sampleSize?: number; hiddenPolicy?: HiddenRowPolicy; dateSystem?: ExcelDateSystem }): SheetProfile` (`{ sheetName, rowCount, colCount, nonEmptyCellCount, fillRate, formulaCellCount, mergesCount, headerRowIndex, columns: ColumnProfile[] }`)
- **Anchor & Fuzzy Matching (`FuzzyMatchOptions`):**
  - `cleanAnchorText(text: string, options?: { stripPrefixes?: string[]; stripSuffixes?: string[] }): string`
  - `fuzzyMatchAnchor(candidate: string, target: string, options?: FuzzyMatchOptions): boolean` (`equals` | `startsWith` | `includes` with length-tiered Levenshtein + first/second/last-char structural guard + sliding word window)
  - `createAliasResolver<TKey extends string>(aliases: Record<TKey, readonly string[]>, matchOptions?: FuzzyMatchOptions): (input: string) => TKey | null`
- **Structural Extractors (Patterns A–J):**
  - **Pattern A:** `scanKeyValueBlock(grid, options)` — vertical/horizontal/multi-pair key-value scanning + optional fallback across sheets.
  - **Pattern B:** `detectAxisHeader(grid, options)` — threshold scan for $M$ typed/period cells, relative lookahead/lookbehind from anchor/unit row, `Map` last-wins dedup, attached metadata rows.
  - **Pattern C:** `scanStackedSections(grid, options)` — cursor state machine over stacked blocks sharing a column axis, validation-row vector extraction, subtotal vs summary lookahead, hard cut-off stop anchor.
  - **Pattern D:** `scanGroupedRecords(grid, options)` — multi-row entity blocks with bounded lookahead (`maxLookahead`), early break on next entity start, repeated-section state transitions.
  - **Pattern E:** `scanStridedColumns(grid, options)` — fixed $K$-column repeating strides per axis group, offset header detection, automatic duplicate name disambiguation.
  - **Pattern F:** `scanFormTable(grid, options)` — dynamic header binding, template-placeholder vs user-entry activity filter, footer stop anchor.
  - **Pattern G:** `scanMatrix(grid, options)` / `unpivotGrid(grid, options)` — cross-tab row-header × col-header extraction into normalized `{ rowKey, colKey, value }[]`.
  - **Pattern H:** `scanHierarchy(grid, options)` — parent-child tree reconstruction from row `outlineLevel`, cell `indent`, leading whitespace, or hierarchical numbering codes (`1.2.3`).
  - **Pattern I:** `discoverRegions(grid, options)` — detects contiguous rectangular non-empty table islands separated by blank rows/columns.
  - **Pattern J:** `flattenMergedHeaders(sheet, options)` — resolves merged super-headers (`A1:C1` over `A2:C2`) into hierarchical column paths (`string[]` or joined keys).

### 2.9 Cleaning, Transformation, Diffing, Validation & Headless UI Projection (`query.ts`, `diff.ts`, `validate.ts`)

- **Schema-Driven & Universal JSON Extraction (`query.ts`):**
  - `sheetToRecords<T>(sheetOrGrid, options: SheetToRecordsOptions<T>): RecordsExtractionResult<T>`
    - Supports fuzzy header-to-field mapping, synchronous `StandardSchemaV1<unknown, T>` validation (rejects async schemas with `ExcelError("INVALID_CONFIG")`), and **non-throwing diagnostic collection** (`{ records: T[], diagnostics: ExtractionDiagnostic[] }` with `{ severity: DiagnosticSeverity, sheet, ref, row, col, field, code?, message }`).
  - `recordsToSheet<T>(records: readonly T[], columns: readonly TableColumnSpec<T>[], options?: { sheetName?: string }): WorksheetModel`
  - `workbookToJson(workbook: WorkbookModel, options?: { sheetFilter?: string[] | ((name: string) => boolean); includeHiddenSheets?: boolean; headerRow?: number; formatDates?: "iso" | "date" | "display" }): Record<string, Array<Record<string, unknown>>>`
  - `jsonToWorkbook(sheets: Record<string, ReadonlyArray<Record<string, unknown>>>, options?: { flattenNested?: boolean; theme?: ExcelTheme; dateSystem?: ExcelDateSystem }): WorkbookModel`
- **Pipeline Transforms & Window Analytics (`query.ts`):**
  - `fillDownRecords<T extends Record<string, unknown>>(records: readonly T[], fields: ReadonlyArray<keyof T>, options?: { emptyValues?: readonly unknown[] }): T[]`
  - `canonicalizeValues(records, field, rules)` (rule-based `equals` | `startsWith` | `contains` + optional scope field)
  - `deriveField<T extends Record<string, unknown>, K extends string, V>(records: readonly T[], field: K, compute: (row: T, index: number) => V): Array<T & Record<K, V>>`
  - `mapRecords<T, U>(records: readonly T[], mapper: (row: T, index: number) => U): U[]`
  - `filterRecords(records, predicates, options)`
  - `sortRecords(records, sortSpec)` (3-state `asc` | `desc` | `none`, `compareMissingLast`, `compareNatural`, `HybridValue` sort)
  - `pivotRecords(records, config)` & `unpivotRecords(records, config)` — supports multi-key grouping, time bucketing (`day | month | quarter | year`), aggregations (`sum`, `avg`, `weightedAvg`, `min`, `max`, `count`, `countIf`, `median`, `percentile`, `rate`, `first`, `last`, custom reducer), and configurable `<`-threshold handling.
  - `computeRunningTotals<T extends Record<string, unknown>>(records: readonly T[], options: { valueField: keyof T; outputField: string; groupBy?: ReadonlyArray<keyof T> }): Array<T & Record<string, number>>`
  - `computePeriodDeltas<T extends Record<string, unknown>>(records: readonly T[], options: { valueField: keyof T; periodField: keyof T; groupBy?: ReadonlyArray<keyof T>; absoluteField?: string; relativeField?: string }): Array<T & Record<string, number | null>>`
  - `rankRecords<T extends Record<string, unknown>>(records: readonly T[], options: { valueField: keyof T; outputField: string; direction?: "asc" | "desc"; groupBy?: ReadonlyArray<keyof T>; tiePolicy?: "dense" | "competition" }): Array<T & Record<string, number>>`
  - `alignSeriesByKey(seriesList, options)` — projects sparse series onto a unified axis (e.g. `YYYY-MM`) with `null` padding.
  - `joinRecords(left, right, options)` (`left | inner | outer` on composite key) & `dedupeRecords(records, keyFn)`.
  - `projectTable(records, config): TableProjection` — produces the headless UI-agnostic grid model (`columns`, `headers`, `subHeaders`, `rows`, `footer`, `frozenRows`, `frozenCols`), using `formatCellDisplay` when custom formatters are omitted.
- **Diffing (`diff.ts`):**
  - `diffSheets(baseSheet, targetSheet, options?): SheetDiffResult` (cell-level or key-matched row-level diff: `added`, `removed`, `modified` values/formulas/styles).
  - `diffWorkbooks(baseWb, targetWb, options?): WorkbookDiffResult`
- **Validation (`validate.ts`):**
  - `validateSheetRules(workbookOrSheet, rules): ValidationReport` — declarative rules (`required`, `unique`, `range`, `sumEquals`, `crossSheetEquals`, `cutoffReached`, `noZeroBaseWithPositiveTarget`, custom predicates) emitting `ValidationIssue[]` with `{ severity: DiagnosticSeverity, sheet, ref?, row?, col?, code, message }`.

### 2.10 Browser IO & Structural File Adapters (`browser-io.ts`, `adapters.ts`)

- **`browser-io.ts`:**
  - `isTempOfficeFile(fileName: string): boolean` (`~$*` filter)
  - `slugifyFileName(parts: readonly string[], options?: { extension?: string; dateSuffix?: boolean }): string`
  - `readExcelFile(file: File | Blob): Promise<{ name: string; format: ExcelFormat; bytes: Uint8Array }>`
  - `downloadXlsxBytes(bytes: Uint8Array, fileName: string): void`
  - `downloadCsvText(text: string, fileName: string): void`
- **`adapters.ts`:**
  - Zero cross-module imports; defines structural `StandardSchemaV1` & `FileAdapter` shapes matching `src/modules/file-system/adapters.ts` (`id`, `extensions`, `decode(ctx)`, `encode(data, ctx)`) so `createXlsxAdapter(options)` and `createCsvAdapter(options)` drop directly into `file-system` collections/singletons (supports both sync and async `StandardSchemaV1` inside `async decode`).

### 2.11 CSS Variables

None. `excel` is a headless `utility` module and defines no `--cs-excel-*` CSS variables.

---

## 3. DOM, Semantics & Accessibility

- **Headless Boundary:** `excel` v1 renders **no DOM elements**, defines **no `data-*` attributes**, and ships **no `.svelte` files or CSS**.
- **UI Rendering Contract (`TableProjection`):** To ensure downstream UI tables (including a future `table` module) match Excel exports 1:1, `projectTable()` outputs an accessible, layout-ready descriptor:
  - `columns`: `{ id, label, subLabel?, align: "left" | "right" | "center", width? }`
  - `rows`: `{ key, cells: Array<{ raw, display, numeric, sortValue, status: CellStatus, align }> }`
  - `footer`: aligned summary cells
  - `frozenRows` / `frozenCols`
- **Browser Download / File Input (`browser-io.ts`):** `downloadXlsxBytes` creates a short-lived `Blob` (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) object URL, triggers a temporary anchor click without leaving persistent DOM nodes, and revokes the URL cleanly.

---

## 4. Visual & Motion Contract

- **No CSS / No Motion:** As a headless utility, `excel` has no UI surface elevation, squircle geometry, or CSS motion rules.
- **OpenXML Declarative Styling Contract (`ExcelTheme` & `StyleRegistry`):**
  - Uses `cscripts-ui` canonical token names: `bg`, `fg`, and semantic roles `base`, `positive`, `caution`, `negative` alongside structural roles `title`, `subtitle`, `header`, `subHeader`, `data`, `footer`.
  - **`ZINC_CAUTION_THEME` defaults:**
    - Font family: `"Segoe UI"` (configurable).
    - Title: `13 pt`, bold, `fg: "#18181B"` (Zinc-900), row height `26 pt`.
    - Subtitle & Sub-Header (units/limits): `9.5 pt`, `fg: "#71717A"` (Zinc-500); Sub-Header `bg: "#FAFAFA"` (Zinc-50), horizontal thin `#D4D4D8` borders.
    - Header: `10 pt`, bold, `fg: "#27272A"` (Zinc-800), `bg: "#F4F4F5"` (Zinc-100), row height `24 pt`, horizontal thin `#D4D4D8` borders.
    - Data cell (`base`): `10 pt`, `fg: "#18181B"`, transparent `bg`, row height `20 pt`, bottom thin `#E4E4E7` border (no vertical gridlines).
    - Caution cell (`caution`, e.g. threshold exceeded): `10 pt`, bold, `fg: "#78350F"` (Amber-900), `bg: "#FEF3C7"` (Amber-100) — high contrast in color and grayscale print.
    - Footer (totals): `10 pt`, bold, `fg: "#18181B"`, `bg: "#F4F4F5"`, medium `#A1A1AA` top border + thin `#D4D4D8` bottom border.
  - **Column Auto-Fit:** `autoFit` measures header, sub-header, `formatCellDisplay` data string lengths, and padding + margin buffer (`minWidth..maxWidth` clamped) to populate `<col width="..." customWidth="1"/>`, preventing `###` truncation in Excel.
  - **`StyleRegistry` Deduplication:** Hashes normalized `{ font, bg, border, align, numFmt }` descriptors so identical styles share one `cellXfs` index (`s="..."`), keeping `xl/styles.xml` compact even on 100k+ cell exports.

---

## 5. Edge Cases & Constraints

### 5.1 OOXML Spec, Security & Implementation Invariants

- **Relationship-Driven Part Resolution:** `readXlsxBytes` MUST NEVER hardcode `xl/worksheets/sheet1.xml`, `xl/styles.xml`, or `xl/sharedStrings.xml`. Parts are resolved strictly from `_rels/.rels` (`officeDocument`) → `<workbookDir>/_rels/<workbookFile>.rels` (`styles`, `sharedStrings`, `theme`, `worksheet`) → `<sheetDir>/_rels/<sheetFile>.rels` (`hyperlink`, `table`, `comments`, `threadedComments`). Target paths normalize `\`, strip leading `/`, resolve relative `..` segments safely (rejecting root escapes with `CORRUPT_ARCHIVE`), and fall back to case-insensitive ZIP lookup if exact match fails. Missing `sharedStrings.xml` or `styles.xml` degrades gracefully.
- **Namespace-Agnostic XML Scanning & Whitespace Preservation:** Internal XML scanner matches local element names (`worksheet`, `row`, `c`, `f`, `v`, `is`, `t`, `r`, `si`, `definedName`, `calcPr`, etc.) regardless of namespace prefixes (`x:`, `ss:`, `ns0:`), skips XML comments/PIs, handles CDATA and numeric/named XML entities (`&#10;`, `&#xA;`, `&amp;`), rejects `<!DOCTYPE` / `<!ENTITY` declarations, and preserves literal whitespace inside `<t>` / `<v>` (honoring `xml:space="preserve"`).
- **Sparse Attributes & All OOXML Cell Types:** Handles `<row>` without `r="..."` (incrementing `prevRow + 1`), `<c>` without `r="..."` (incrementing `prevCol + 1`), self-closing `<c r="A1" s="3"/>` (preserving style), `t="n"` (or omitted), `t="s"`, `t="inlineStr"`, `t="str"`, `t="b"`, `t="e"`, and `t="d"` (ISO 8601 date strings). Numeric cells with date/time `numFmt` codes decode to `Date` (`type: "date"`) using `workbookPr/@date1904` and UTC math.
- **Theme, Tint & Indexed Colors:** `ooxml-styles.internal.ts` parses `xl/theme/theme1.xml` `<a:clrScheme>` (handling OOXML `lt1`/`dk1`/`lt2`/`dk2` index mapping, with standard Office palette fallback), applies `tint` HSL luminance scaling, and resolves legacy `indexed="0..63"` palette colors.
- **Mandatory OOXML XSD Element Ordering & Count Consistency (Zero Repair Warnings):**
  - `<worksheet>` children MUST emit in strict ECMA-376 `CT_Worksheet` order: `sheetPr` → `dimension` → `sheetViews` → `sheetFormatPr` → `cols` → `sheetData` → `sheetCalcPr` → `sheetProtection` → `autoFilter` → `mergeCells` → `conditionalFormatting` → `dataValidations` → `hyperlinks` → `pageMargins` → `pageSetup` → `drawing` → `legacyDrawing` → `tableParts`. Never emit empty `<cols/>`, `<mergeCells count="0"/>`, `<autoFilter/>`, or `<dataValidations count="0"/>`.
  - `<styleSheet>` children MUST emit in strict order: `numFmts` → `fonts` → `fills` → `borders` → `cellStyleXfs` → `cellXfs` → `cellStyles` → `dxfs` → `tableStyles`. `<fills>` MUST reserve `fillId="0"` (`patternType="none"`) and `fillId="1"` (`patternType="gray125"`); `<borders>` MUST reserve `borderId="0"` (empty border); `<cellStyleXfs>` and `<cellXfs>` MUST reserve index `0`. All `count="..."` and `<sst count="..." uniqueCount="...">` attributes MUST match actual child counts.
  - Sheet names enforce Excel's 31-char limit, forbidden characters (`\ / ? * [ ] :`), no leading/trailing `'`, and case-insensitive uniqueness across the workbook.
- **Shared & Array Formulas on Read & Patch:**
  - Read resolves `<f t="shared" ref="..." si="0">expr</f>` masters and translates relative A1 refs for `<f t="shared" si="0"/>` slaves via `translateFormulaRefs`.
  - In `PatchSession`, modifying or deleting a shared-formula master cell automatically promotes the next remaining slave in that `si` group (or materializes sibling slaves to standalone `<f>`) so sibling cells never corrupt. Partial interior mutation of an `<f t="array" ref="...">` block throws `ExcelError("PATCH_FAILED")`.
- **Deterministic Batched XML Slice Patcher (`createPatchSession`):**
  - Never roundtrips untouched sheets, `xl/vbaProject.bin`, `xl/drawings/*`, `xl/comments*.xml`, `xl/vmlDrawing*.vml`, `xl/tables/*`, `<definedNames>`, or `<conditionalFormatting>` through a lossy serializer.
  - Buffers per-sheet mutations and applies them in one sorted pass in `toBytes()`, expanding self-closing `<sheetData/>` / `<c .../>` tags as needed and inserting missing `<row r="...">` and `<c r="...">` elements in strictly ascending row and column order while updating `<dimension ref="..."/>`.
  - `setCellStyle` appends deduplicated styles to `xl/styles.xml` without altering existing `cellXfs` indices; `stringMode: "shared"` appends only to the tail of `xl/sharedStrings.xml` (or falls back to `inlineStr` if absent) so existing `t="s"` indices never shift.
  - When `onFormulaCache === "clear"`, clears `<v>` across `clearScope` (`"workbook"` default, or `"sheet"`), strips stale `xl/calcChain.xml` entries (or removes `calcChain.xml` + its `[Content_Types].xml` / `workbook.xml.rels` entries), and sets `<calcPr fullCalcOnLoad="1"/>` in `xl/workbook.xml` so Excel recalculates immediately on open.
- **Security Bounds & CSV Formula Injection Guards:**
  - `readXlsxBytes` validates ZIP entry count (`maxEntryCount`), header `originalSize` via `fflate` `filter` BEFORE inflating (`maxEntryBytes`, `maxUncompressedBytes`), and actual post-inflation byte lengths (catching lying ZIP headers), throwing `ExcelError("LIMIT_EXCEEDED")`.
  - `sanitizeFormulaInjection` prefixes untrusted string values (never numeric primitives or explicit `CellFormula`s) starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with `'` in `writeCsvText` and optional `.xlsx` string writes.
- **1900 Lotus Leap-Year Bug & 1904 System:** Serials `1..59` in `1900` mode use `1899-12-31` epoch, `61+` use `1899-12-30` epoch, `60 <= serial < 61` clamps to `1900-02-28`; `date1904="1"` shifts epoch to `1904-01-01`. All date/time math executes in pure UTC.
- **Large Sheet Memory Safety:** `writeXlsxBytes` serializes worksheet `<row>` blocks in ~5,000-row `Uint8Array` chunks via `TextEncoder` and deduplicates repeated strings into `xl/sharedStrings.xml`, avoiding V8 max-string-length limits without streams.
- **Hidden-Row Topology & Non-Throwing Diagnostics:** `sheetToGrid` preserves physical 1-based `rowIndex` and empty cells (`null`) when `preserveEmptyRows: true`; `sheetToRecords` collects per-cell/row parse & schema failures into `diagnostics[]` with `{ severity: "caution" | "negative", sheet, ref, row, col, field, message }`.
- **Strict TypeScript & Repo Compliance:** Zero `any`, zero `!` non-null assertions, explicit return types on all exported functions, `UPPER_SNAKE_CASE` option arrays, `ExcelError` mirroring `FsError`, zero `*.internal.*` exports from `index.ts`.

### 5.2 Explicit Non-Goals (v1)

- Legacy binary `.xls` (BIFF8/OLE2), `.xlsb`, and `.ods`.
- Authoring VBA macros (`vbaProject.bin`) or legacy VML comment boxes (`vmlDrawingN.vml`) from scratch.
- Declarative from-scratch `<conditionalFormatting>` or Excel `<tablePart>` authoring (preserved in Patcher; read-only in v1; authoring deferred to Phase 2).
- Embedded charts, pivot table binary caches (`pivotCacheDefinition`), images, and shapes authoring from scratch (preserved byte-for-byte when untouched in Patcher).
- Streaming I/O, Web Workers, or Node.js `fs`/`stream`/`Buffer` APIs.
- Built-in JS formula parser/evaluator and Svelte UI components / `.svelte.ts` stores.

### 5.3 Future Extensions / Roadmap (Phase 2+)

1. **Formula Evaluation Layer (`formula.ts`):** Lexer, AST parser, topological dependency graph with cycle detection (`#CYCLE!`), DE/EN function normalization (`SUMME`→`SUM`, `;`→`,`), extensible function registry, plugging directly into `PatchSession.recalculate(evaluator)` and `FormulaEvaluator`.
2. **Svelte 5 & `table` Module Integration:** Reactive `table-state.svelte.ts` controller (column toggling, 3-state sort, filter/pivot state, live `TableProjection`, one-click `.xlsx` export) and visual Svelte table components consuming `TableProjection` without coupling `excel` Core to Svelte.
3. **Phase 2 OpenXML Writers:** Declarative `<conditionalFormatting>` builder (`dxfs` + rule types), Excel Table (`xl/tables/table*.xml`) writer, and from-scratch classic/threaded cell comments writer.
