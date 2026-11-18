# Excel Module — v1 Execution Milestones

> **Source of Truth:** [excel.blueprint.md](./excel.blueprint.md)  
> **Dependency Note:** `fflate` is not currently listed in `package.json` `dependencies`; Milestone 1 requires `bun add fflate` as its prerequisite.  
> **Global Constraints:** Zero `any`, zero `!` non-null assertions, explicit return types on all exported functions, zero `*.internal.*` re-exports from `index.ts`, zero cross-module imports, 100 % synchronous in-memory execution (except `File`/`Blob` reading in `browser-io.ts` and `async decode` in `adapters.ts`).

## Status Tracker

| Milestone | Title | Status | Depends On |
| :--- | :--- | :--- | :--- |
| **M0** | Core Contracts, Errors, Coordinates, Dates & Value Normalization | `Done` | — |
| **M1** | Internal OOXML Engine (XML, Styles, SharedStrings, Package/ZIP) | `Done` | M0 + `fflate` |
| **M2** | Public OOXML Read, Write, Tables/DefinedNames & Surgical Patcher | `Planned` | M0, M1 |
| **M3** | CSV / TSV & Declarative Multi-Zone Builder / Themes | `Planned` | M0, M2 |
| **M4** | Structural Scanners, Profiling, Fuzzy Matching & Patterns A–J | `Planned` | M0 |
| **M5** | Cleaning, Transformation, Analytics, Diffing, Validation & TableProjection | `Planned` | M0, M3, M4 |
| **M6** | Browser I/O, Structural File Adapters, Public Barrel & Module Docs | `Planned` | M0–M5 |

---

## Milestone 0 — Core Contracts, Errors, Coordinates, Dates & Value Normalization

### Goal
Establish the zero-dependency TypeScript foundation (`errors`, `types`, A1 coordinates, 1900/1904 UTC date math, locale/threshold parsing, and `numFmt` display formatting) that every downstream milestone builds upon.

### Scope & Files
- `src/modules/excel/errors.ts`
  - Exports: `EXCEL_ERROR_CODES`, `ExcelErrorCode`, `ExcelErrorOptions`, `ExcelError`, `isExcelError`
- `src/modules/excel/types.ts`
  - Exports option arrays & types (`UPPER_SNAKE_CASE` `as const`): `EXCEL_FORMATS` (`ExcelFormat`), `SHEET_VISIBILITY_STATES` (`SheetVisibilityState`), `CELL_VALUE_TYPES` (`CellValueType`), `CELL_STATUSES` (`CellStatus`), `DIAGNOSTIC_SEVERITIES` (`DiagnosticSeverity`), `HIDDEN_ROW_POLICIES` (`HiddenRowPolicy`), `FORMULA_CACHE_POLICIES` (`FormulaCachePolicy`), `DATE_SYSTEMS` (`ExcelDateSystem`), `SORT_DIRECTIONS` (`SortDirection`), `AGGREGATION_KINDS` (`AggregationKind`), `TIME_BUCKETS` (`TimeBucket`), `JOIN_MODES` (`JoinMode`), `INFERRED_COLUMN_TYPES` (`InferredColumnType`)
  - Exports core interfaces: `CellCoord`, `ParsedCellRef`, `RangeRef`, `CellRichTextRun`, `CellComment`, `CellHyperlink`, `CellScalar`, `CellFormula`, `BorderEdgeSpec`, `ExcelStyleSpec`, `CellModel`, `DataValidationRule`, `ColumnSpec`, `RowMeta`, `SheetFreezePane`, `SheetPageMargins`, `SheetPageSetup`, `ExcelTableColumn`, `ExcelTableSpec`, `DefinedNameSpec`, `WorksheetModel`, `WorkbookModel`, `GridRow`, `TableColumnSpec`, `FormulaRecalcTarget`, `FormulaEvaluator`
- `src/modules/excel/coords.ts` (imports `errors.ts`, `types.ts`)
  - Exports: `colToLetter`, `letterToCol`, `parseCellRef`, `formatCellRef`, `parseRangeRef`, `parseSheetQualifiedRef`, `translateFormulaRefs`, `getCell`, `setCell`
- `src/modules/excel/dates.ts` (imports `types.ts`)
  - Exports: `excelSerialToDate`, `excelSerialToIsoDate`, `excelSerialToIsoDateTime`, `excelSerialToTime`, `isoDateToExcelSerial`, `parseDateValue`, `parsePeriodHeader`
- `src/modules/excel/values.ts` (imports `types.ts`, `dates.ts`)
  - Exports: `EXCEL_ERROR_TOKENS`, `isExcelErrorValue`, `normalizeCellText`, `cellToString`, `formatCellDisplay`, `parseLocaleNumber`, `parseBooleanValue`, `ThresholdParseOptions`, `HybridValue`, `parseThresholdValue`, `compareMissingLast`, `compareNatural`, `roundAdaptive`

### Key Implementation Details / Invariants
- **Bounds & Coordinates (§2.4):** 0-based `col` (`0..16383`, `"A".."XFD"`) and `row` (`0..1048575`, Excel `1..1048576`); invalid refs throw `ExcelError("INVALID_CELL_REF")` or `ExcelError("INVALID_RANGE_REF")`. `parseRangeRef` normalizes reversed corners; `parseSheetQualifiedRef` unescapes `'Sheet''s Name'!$A$1:$D$10`.
- **Formula Translation (§2.4):** `translateFormulaRefs` translates only non-`$` relative A1 refs outside string literals (`"..."`) for shared formula slave resolution.
- **Map Normalization:** `setCell` / `getCell` normalize keys to uppercase A1 refs (no `$`).
- **1900 Lotus Leap-Year Bug & 1904 System (§2.4, §5.1):** Pure UTC math with sub-second rounding; in `1900` mode: `1 <= serial < 60` uses `1899-12-31`, `serial >= 61` uses `1899-12-30`, `60 <= serial < 61` clamps to `1900-02-28` + time fraction, `0 <= serial < 1` returns time on epoch, `serial < 0` returns `null`. `1904` mode uses `1904-01-01`. `isoDateToExcelSerial` preserves fractional UTC time when non-midnight.
- **Locale, Thresholds & Display (§2.4):** `normalizeCellText` strips `\u00A0` and `\u200B-\u200D\uFEFF` and normalizes `\r\n`/`\r` → `\n`. `parseLocaleNumber` handles scientific notation, German decimal commas (`"106,89"`), thousands-dot disambiguation (`/^[+-]?\d{1,3}(\.\d{3})+$/`), accounting parentheses (`"(70.000,00 €)"` → `-70000`), currency tokens (`€`, `$`, `CHF`, `GBP`, `EUR`), and placeholders (`"-"`, `"—"`, `""`, `"na"`). `parseThresholdValue` separates `number | threshold | missing | text` with configurable `sortValue` multiplier and `Missing Last` support. `formatCellDisplay` handles `General`, `@`, `#,##0.00`, `0.0%`, currencies, negative parens, multi-section `pos;neg;zero;text`, and date/time patterns.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/coords.test.ts`: `colToLetter`/`letterToCol` boundaries (`0`, `25`, `26`, `16383`, out-of-range throws), `parseCellRef`/`formatCellRef` absolute `$` flags, `parseRangeRef` corner normalization, `parseSheetQualifiedRef` quoted sheet names with `''`, `translateFormulaRefs` preserving `$A$1` and string literals like `"A1"`.
- `src/modules/excel/dates.test.ts`: `1900` serials `0.5`, `1`, `59`, `60` (clamped `1900-02-28`), `61`, `45000.75`; `1904` roundtrip; `parseDateValue` across `DD.MM.YYYY`, `D.M.YY`, `YYYY-MM-DD`, `MM/DD/YYYY`; `parsePeriodHeader` across `"März"`, `"Maerz"`, `"January"`, `"2026-Q1"`, serial dates.
- `src/modules/excel/values.test.ts`: `parseLocaleNumber` (DE/EN decimals, thousands vs decimal edge cases, accounting parens, currencies), `parseBooleanValue` (`ja/nein`, `x`), `parseThresholdValue` + `compareMissingLast` + `compareNatural`, `formatCellDisplay` multi-section & date formats, `ExcelError` / `isExcelError`.
- Run `bun run typecheck`, `bun run lint`, and `bun run test`.
- **Gate:** `tester` & `reviewer` verify Milestone 0 contracts, zero `any`/`!`, and passing checks before starting M1.

---

## Milestone 1 — Internal OOXML Engine (XML, Styles, SharedStrings, Package/ZIP)

### Goal
Build all low-level, `.internal.` OOXML building blocks: namespace-agnostic XML scanning/chunked writing/slice patching, deduplicating `StyleRegistry` + theme/tint/indexed colors, `SharedStrings` reader/writer, and relationship-driven ZIP packaging with zip-bomb security bounds.

### Prerequisite
- Install runtime dependency: `bun add fflate` (`zipSync`, `unzipSync`, `strToU8`, `strFromU8`).

### Scope & Files
- `src/modules/excel/ooxml-xml.internal.ts` (imports `errors.ts`)
  - Internal symbols: namespace-agnostic XML tag/attribute scanner, XML entity/CDATA decoder, `<!DOCTYPE`/`<!ENTITY` guard, `xml:space="preserve"` handling, XML escaper, ~5,000-row chunked `Uint8Array` writer (`TextEncoder`), sorted byte/character slice patcher + self-closing tag expander (`<sheetData/>`, `<c .../>`).
- `src/modules/excel/ooxml-styles.internal.ts` (imports `types.ts`, `ooxml-xml.internal.ts`)
  - Internal symbols: `StyleRegistry`, theme `<a:clrScheme>` parser (`theme1.xml`), `tint` HSL luminance scaler, legacy `indexed="0..63"` color palette, `numFmt` date/time detector, `<styleSheet>` XML serializer & non-shifting tail appender for Patcher.
- `src/modules/excel/ooxml-strings.internal.ts` (imports `types.ts`, `ooxml-xml.internal.ts`)
  - Internal symbols: `SharedStringsReader` (plain `<t>` + structured `<r><t>` rich-text runs), `SharedStringsWriter` (deduplicating table + `<sst count="..." uniqueCount="...">` serializer + tail-only append helper).
- `src/modules/excel/ooxml-package.internal.ts` (imports `fflate`, `errors.ts`, `types.ts`, `coords.ts`, `ooxml-xml.internal.ts`)
  - Internal symbols: ZIP extraction with `filter` pre-inflation + post-inflation byte-length checks, `_rels/.rels` → `workbook.xml.rels` → `sheetN.xml.rels` path resolver (with `\` normalization, `..` traversal rejection → `CORRUPT_ARCHIVE`, case-insensitive fallback), `[Content_Types].xml` reader/updater (including `convertTemplateToWorkbook` swaps), XML readers/writers for `xl/tables/table*.xml`, `<definedNames>`, `<dataValidations>`, `<hyperlinks>`, `commentsN.xml` / `threadedComments`, and `calcChain.xml` cleanup helpers.

### Key Implementation Details / Invariants
- **Namespace-Agnostic XML & XXE Protection (§5.1):** Match local element names regardless of prefixes (`x:`, `ss:`, `ns0:`), skip comments/PIs, reject `<!DOCTYPE` / `<!ENTITY` with `ExcelError("CORRUPT_XML")`, preserve literal whitespace inside `<t>` / `<v>`.
- **Strict `<styleSheet>` Order & Reserved Indices (§5.1):** Emit `numFmts` → `fonts` → `fills` → `borders` → `cellStyleXfs` → `cellXfs` → `cellStyles` → `dxfs` → `tableStyles`. Reserve `fillId="0"` (`none`), `fillId="1"` (`gray125`), `borderId="0"` (empty), `cellStyleXfs[0]`, `cellXfs[0]`. All `count="..."` attributes MUST equal actual child counts.
- **Theme/Tint/Indexed Colors (§5.1):** Parse `xl/theme/theme1.xml` `<a:clrScheme>` with `lt1`/`dk1`/`lt2`/`dk2` index mapping + standard Office palette fallback + HSL `tint` luminance scaling.
- **Zip-Bomb Bounds (§2.5, §5.1):** Default `maxUncompressedBytes = 128 MiB`, `maxEntryBytes = 64 MiB`, `maxEntryCount = 4096`. Validate entry count and `originalSize` in `fflate` `filter` BEFORE inflating AND actual decompressed byte lengths AFTER inflating (catching lying ZIP headers) → throw `ExcelError("LIMIT_EXCEEDED")`.
- **Relationship Resolution (§5.1):** Never hardcode `xl/worksheets/sheet1.xml`, `xl/styles.xml`, or `xl/sharedStrings.xml`; resolve strictly via rels graph, tolerating missing `sharedStrings.xml` or `styles.xml`.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/ooxml-xml.internal.test.ts`: Prefixed tags (`x:row`, `ss:c`), `<!DOCTYPE>` rejection, entities (`&#10;`, `&#xA;`, `&amp;`), `xml:space="preserve"`, chunked writer, sorted slice patcher expanding `<c r="A1" s="1"/>` and `<sheetData/>`.
- `src/modules/excel/ooxml-styles.internal.test.ts`: `StyleRegistry` deduplication, reserved `fillId` 0/1 & `borderId` 0, theme `lt1`/`dk1` + `tint` calculations, indexed color palette, non-shifting tail append.
- `src/modules/excel/ooxml-strings.internal.test.ts`: Plain + `<r><t>` rich-text run parsing, `SharedStringsWriter` deduplication + `count`/`uniqueCount` parity, tail-only append preserving earlier indices.
- `src/modules/excel/ooxml-package.internal.test.ts`: Non-standard sheet paths via rels, `..` path escape rejection (`CORRUPT_ARCHIVE`), lying-header zip-bomb rejection (`LIMIT_EXCEEDED`), case-insensitive ZIP lookup fallback, `[Content_Types].xml` template-to-workbook swap.
- Run `bun run typecheck`, `bun run lint`, and `bun run test`.
- **Gate:** `tester` & `reviewer` sign off on M1 invariants before starting M2.

---

## Milestone 2 — Public OOXML Read, Write, Tables/DefinedNames & Surgical Patcher

### Goal
Deliver the public `ooxml.ts` engine supporting full `.xlsx` / `.xlsm` / `.xltx` / `.xltm` reading, from-scratch `.xlsx` writing (with strict ECMA-376 XSD child order and 5,000-row chunked memory safety), Excel Table & Defined Name resolution, and the lossless surgical `PatchSession`.

### Scope & Files
- `src/modules/excel/ooxml.ts` (imports M0 + M1 `.internal.` files)
  - Exports:
    - `ReadXlsxOptions`, `readXlsxBytes`
    - `WriteXlsxOptions`, `writeXlsxBytes`
    - `readNamedTable`, `resolveDefinedName`
    - `PatchCellOptions`, `PatchSessionOptions`, `PatchSession`, `createPatchSession`, `patchXlsxBytes`

### Key Implementation Details / Invariants
- **Read (`readXlsxBytes`):**
  - Rejects legacy `.xls` / `.xlsb` / `.ods` (or non-ZIP signatures) cleanly (`UNSUPPORTED_FORMAT` / `CORRUPT_ARCHIVE`).
  - Enforces `maxSheets = 256` and `maxCells = 2_000_000` (`LIMIT_EXCEEDED`), plus `sheetFilter`.
  - Handles sparse `<row>` / `<c>` without `r="..."` (auto-incrementing `prevRow + 1` / `prevCol + 1`), self-closing `<c r="A1" s="3"/>`, all OOXML cell types (`n`, `s`, `inlineStr`, `str`, `b`, `e`, `d`), date/time `numFmt` decoding via `workbookPr/@date1904`, `<f>` master/shared/array/dataTable formulas (`translateFormulaRefs` for shared slaves), `merges`, `rowsMeta` (`hidden`, `outlineLevel`, `collapsed`, `height`), `columns`, `freezePane`, `autoFilterRef`, `dataValidations`, `hyperlinks`, `comments`, `showGridLines`, `tabColor`, `pageSetup`, `tables`, `definedNames`, `sourceFormat`.
- **Write (`writeXlsxBytes`):**
  - Enforces Excel sheet name rules (<=31 chars, no `\ / ? * [ ] :`, no leading/trailing `'`, case-insensitive uniqueness).
  - Emits `<worksheet>` children in strict ECMA-376 `CT_Worksheet` order: `sheetPr` → `dimension` → `sheetViews` → `sheetFormatPr` → `cols` → `sheetData` → `sheetCalcPr` → `sheetProtection` → `autoFilter` → `mergeCells` → `conditionalFormatting` → `dataValidations` → `hyperlinks` → `pageMargins` → `pageSetup` → `drawing` → `legacyDrawing` → `tableParts`.
  - Declares/upserts `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"` on the `<worksheet>` root tag (`upsertXmlAttribute`) whenever `<hyperlinks>` (with external `r:id`), `<tableParts>`, or `<drawing>` are emitted into a worksheet.
  - Never emits empty `<cols/>`, `<mergeCells count="0"/>`, `<autoFilter/>`, or `<dataValidations count="0"/>`.
  - Handles `sanitizeFormulaInjection`, `convertTemplateToWorkbook`, `useSharedStrings`, `compressionLevel` (`0 | 1 | 6 | 9`), `_xlnm.Print_Titles` & `_xlnm.Print_Area` defined names, and `fitToWidth`/`fitToHeight` → `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`.
- **Surgical Patcher (`createPatchSession`, `patchXlsxBytes`):**
  - Preserves untouched sheets, `xl/vbaProject.bin`, `xl/vbaData.xml`, `xl/drawings/*`, `xl/comments*.xml`, `xl/vmlDrawing*.vml`, `xl/tables/*`, `<definedNames>`, and `<conditionalFormatting>` byte-for-byte.
  - Buffers all mutations (`setCellValue`, `setFormula`, `setCachedResult`, `setCellStyle`, `clearCellValue`, `deleteCell`, `setRowHidden`, `setRowHeight`, `setColWidth`, `setColHidden`, `setSheetVisibility`, `addHyperlink`, `setDataValidation`, `recalculate`) and applies them in one sorted pass inside `toBytes()`, updating `<dimension ref="..."/>`.
  - Shared-formula safety: mutating/deleting a shared master promotes the next remaining slave or materializes sibling slaves; partial interior mutation of an `<f t="array" ref="...">` block throws `ExcelError("PATCH_FAILED")`.
  - `onFormulaCache === "clear"` clears `<v>` across `clearScope` (`"workbook"` default or `"sheet"`), cleans `xl/calcChain.xml` (and its `[Content_Types].xml` / `workbook.xml.rels` entries), and sets `<calcPr fullCalcOnLoad="1"/>`.
  - `setCellStyle` appends to `xl/styles.xml` without shifting existing `cellXfs` indices, batching all `setCellStyle` additions into a single `appendStylesToStylesXml(stylesXml, newStyles)` pass inside `toBytes()` so component fonts/fills/borders are deduplicated in one batch; `stringMode: "shared"` appends only to the tail of `xl/sharedStrings.xml` (falling back to `inlineStr` if absent).
  - Declares/upserts `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"` on the `<worksheet>` root tag (`upsertXmlAttribute`) whenever `<hyperlinks>` (with external `r:id`), `<tableParts>`, or `<drawing>` are patched into a worksheet.
  - Propagates the target root element's XML namespace prefix (`getXmlPrefix(root.rawName)`) into `serializeDataValidationsXml`, `serializeHyperlinksXml`, `serializeDefinedNamesXml`, and patched `<row>`/`<c>`/`<f>`/`<v>`/`<is>`/`<cols>`/`<dimension>` tags when patching namespace-prefixed `<x:worksheet>` / `<x:workbook>` documents.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/ooxml.test.ts`:
  - Full read/write roundtrip (numbers, strings, rich text, booleans, errors, 1900 & 1904 dates/times, formulas, merges, freeze panes, autoFilter, dataValidations, internal/external hyperlinks, pageSetup/printArea, hidden/veryHidden sheets, outline levels).
  - Sparse/unprefixed/prefixed XML edge cases, `readNamedTable` & `resolveDefinedName`, invalid sheet names, `maxSheets`/`maxCells` limits, `.xls`/`.ods` rejection.
  - Surgical patcher suite: `.xlsm` byte-for-byte preservation of `vbaProject.bin` + untouched sheets + `<conditionalFormatting>`, shared formula master deletion/promotion, array formula interior mutation throwing `PATCH_FAILED`, `clearCellValue` keeping `s="..."`, `onFormulaCache: "clear"` updating `calcPr` & `calcChain.xml`, `convertTemplateToWorkbook`, `recalculate(mockEvaluator)`.
  - Large-sheet stress test (e.g., 25,000+ rows) confirming chunked write + `SharedStrings` deduplication completes cleanly in memory.
- Run `bun run typecheck`, `bun run lint`, and `bun run test`.
- **Gate:** `tester` & `reviewer` sign off on M2 before starting M3.

---

## Milestone 3 — CSV / TSV & Declarative Multi-Zone Builder / Themes

### Goal
Implement RFC 4180 CSV/TSV parsing & serialization and the declarative themed `WorkbookBuilder` / `SheetBuilder` with `ZINC_CAUTION_THEME` and column `autoFit`.

### Scope & Files
- `src/modules/excel/csv.ts` (imports `types.ts`, `errors.ts`, `coords.ts`, `values.ts`)
  - Exports: `sniffCsvDelimiter`, `readCsvText`, `writeCsvText`
- `src/modules/excel/builder.ts` (imports `types.ts`, `coords.ts`, `values.ts`, `ooxml.ts`)
  - Exports: `ExcelTheme`, `defineExcelTheme`, `ZINC_CAUTION_THEME`, `WorkbookBuilder`, `SheetBuilder`, `createWorkbookBuilder`

### Key Implementation Details / Invariants
- **CSV / TSV (`csv.ts`, §2.6, §5.1):**
  - Pure-TS RFC 4180 (quoted fields, embedded newlines, `""` escaping), UTF-8 BOM stripping on read / optional BOM on write, `sniffCsvDelimiter` (`"," | ";" | "\t"`), `trimCells`, `maxBytes` / `maxRows` safety bounds (`LIMIT_EXCEEDED`), `formatDisplay` + `dateSystem` support, and `sanitizeFormulaInjection` prefixing untrusted strings starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with `'` (never numeric primitives).
- **Theme & Builder (`builder.ts`, §2.7, §4):**
  - `ZINC_CAUTION_THEME` uses canonical tokens (`bg`, `fg`, `base`, `positive`, `caution`, `negative`) and exact defaults (`Segoe UI`, Title `13pt` `#18181B` height `26pt`, Subtitle/Sub-Header `9.5pt` `#71717A` / `#FAFAFA`, Header `10pt` `#27272A` on `#F4F4F5` height `24pt`, Data `10pt` `#18181B` height `20pt`, Caution `#78350F` on `#FEF3C7`, Footer `10pt` bold `#18181B` on `#F4F4F5`).
  - `SheetBuilder` supports `addTitleBlock`, `addTable` (`columns`, `subHeaderRow`, `rows`, `totalsRow`, `freezeHeader`, `autoFilter`, `autoFit`), `addValidation`, `addHyperlink`, `setFreezePane`, `setView`, `setPageSetup`, `toModel`.
  - `autoFit` measures header, sub-header, and `formatCellDisplay` data string lengths (+ padding/margin clamped to `minWidth..maxWidth`) to emit `<col width="..." customWidth="1"/>`.
  - `builder.toBytes(options)` delegates to `writeXlsxBytes`, forwarding `sanitizeFormulaInjection`.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/csv.test.ts`: Delimiter sniffing (`,` vs `;` vs `\t`), RFC 4180 quotes/newlines/escaped quotes, BOM read/write, `maxBytes`/`maxRows` limits, formula injection guard (`=CMD()`, `+1`, `-1`, `@SUM`, `\t`, `\r` on strings vs safe `-42` numbers).
- `src/modules/excel/builder.test.ts`: `defineExcelTheme` partial overrides, `ZINC_CAUTION_THEME` multi-zone sheet (`addTitleBlock` + `addTable` with `subHeaderRow`, `totalsRow`, `status` styling, `autoFit`, `freezeHeader`, `autoFilter`) roundtripped through `toBytes()` → `readXlsxBytes()`.
- Run `bun run typecheck`, `bun run lint`, and `bun run test`.
- **Gate:** `tester` & `reviewer` sign off on M3.

---

## Milestone 4 — Structural Scanners, Profiling, Fuzzy Matching & Patterns A–J

### Goal
Implement the messy-spreadsheet ingestion toolkit: `resolveSheet`, `sheetToGrid`, `fillDownGrid`, column/sheet profiling, fuzzy anchor & alias resolution, and all 10 structural extractors (Patterns A–J).

### Scope & Files
- `src/modules/excel/scanner.ts` (imports `types.ts`, `errors.ts`, `coords.ts`, `dates.ts`, `values.ts`)
  - Exports:
    - Sheet/Grid/Cleaning: `resolveSheet`, `sheetToGrid`, `fillDownGrid`
    - Profiling & Inference: `ColumnTypeInference`, `ColumnProfile`, `SheetProfile`, `inferColumnType`, `profileSheet`
    - Anchor & Fuzzy Matching: `FuzzyMatchOptions`, `cleanAnchorText`, `fuzzyMatchAnchor`, `createAliasResolver`
    - Patterns A–J:
      - A: `scanKeyValueBlock`
      - B: `detectAxisHeader`
      - C: `scanStackedSections`
      - D: `scanGroupedRecords`
      - E: `scanStridedColumns`
      - F: `scanFormTable`
      - G: `scanMatrix`, `unpivotGrid`
      - H: `scanHierarchy`
      - I: `discoverRegions`
      - J: `flattenMergedHeaders`

### Key Implementation Details / Invariants
- **Hidden-Row Topology & Merges (§5.1):** `sheetToGrid` preserves physical 1-based `rowIndex` and empty slots (`null`) when `preserveEmptyRows: true`, honors `HiddenRowPolicy` (`"include" | "skip" | "skip-if-empty"`), and expands merged cells (`"none" | "top-left"`).
- **Fuzzy Anchor Matching (§2.8):** `fuzzyMatchAnchor` supports `"equals" | "startsWith" | "includes"` with length-tiered Levenshtein distance, first/second/last-char structural guard, and sliding word window after `cleanAnchorText` + `normalizeCellText`.
- **Patterns A–J Invariants (§2.8):**
  - Pattern A: vertical/horizontal/multi-pair key-value scanning + optional multi-sheet fallback.
  - Pattern B: threshold scan for $M$ typed/period cells, relative lookahead/lookbehind from anchor/unit row, `Map` last-wins dedup, attached metadata rows.
  - Pattern C: cursor state machine over stacked blocks sharing a column axis, validation-row vector extraction, subtotal vs summary lookahead, hard cut-off stop anchor.
  - Pattern D: multi-row entity blocks with bounded `maxLookahead`, early break on next entity start, repeated-section transitions.
  - Pattern E: fixed $K$-column repeating strides per axis group, offset header detection, duplicate name disambiguation.
  - Pattern F: dynamic header binding, template-placeholder vs user-entry activity filter, footer stop anchor.
  - Pattern G: cross-tab `scanMatrix` / `unpivotGrid` → `{ rowKey, colKey, value }[]`.
  - Pattern H: `scanHierarchy` from `outlineLevel`, cell `indent`, leading whitespace, or hierarchical numbering codes (`1.2.3`).
  - Pattern I: `discoverRegions` finding contiguous rectangular table islands separated by blank rows/cols.
  - Pattern J: `flattenMergedHeaders` resolving merged super-headers into hierarchical column paths.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/scanner.test.ts`:
  - `resolveSheet`, `sheetToGrid` (`preserveEmptyRows`, `hiddenPolicy`, `expandMergedCells: "top-left"`), `fillDownGrid` (`stopOnBlankRow`).
  - `inferColumnType` & `profileSheet` across `number`, `date`, `datetime`, `boolean`, `threshold`, `currency`, `string`, `empty`.
  - `fuzzyMatchAnchor` (typo tolerance, structural guard against false positives, sliding word window) & `createAliasResolver`.
  - Dedicated fixture tests for each Pattern A through J (including tricky stacked/strided/hierarchical/merged-header/multi-region sheets).
- Run `bun run typecheck`, `bun run lint`, and `bun run test`.
- **Gate:** `tester` & `reviewer` sign off on M4.

---

## Milestone 5 — Cleaning, Transformation, Analytics, Diffing, Validation & TableProjection

### Goal
Implement schema-validated extraction (`sheetToRecords`), bidirectional JSON/workbook conversion, full relational/window analytics (`query.ts`), workbook/sheet diffing (`diff.ts`), declarative audit rules (`validate.ts`), and the UI-agnostic `TableProjection` contract.

### Scope & Files
- `src/modules/excel/query.ts` (imports `types.ts`, `errors.ts`, `coords.ts`, `dates.ts`, `values.ts`, `builder.ts`, `scanner.ts`)
  - Exports: `SheetToRecordsOptions`, `RecordsExtractionResult`, `ExtractionDiagnostic`, `TableProjection`, `sheetToRecords`, `recordsToSheet`, `workbookToJson`, `jsonToWorkbook`, `fillDownRecords`, `canonicalizeValues`, `deriveField`, `mapRecords`, `filterRecords`, `sortRecords`, `pivotRecords`, `unpivotRecords`, `computeRunningTotals`, `computePeriodDeltas`, `rankRecords`, `alignSeriesByKey`, `joinRecords`, `dedupeRecords`, `projectTable`
- `src/modules/excel/diff.ts` (imports `types.ts`, `coords.ts`, `values.ts`)
  - Exports: `SheetDiffResult`, `WorkbookDiffResult`, `diffSheets`, `diffWorkbooks`
- `src/modules/excel/validate.ts` (imports `types.ts`, `coords.ts`, `values.ts`)
  - Exports: `ValidationIssue`, `ValidationReport`, `validateSheetRules`

### Key Implementation Details / Invariants
- **Non-Throwing Extraction & Sync Schema Guard (§2.9, §5.1):** `sheetToRecords` supports fuzzy header-to-field mapping and synchronous `StandardSchemaV1<unknown, T>`. If `schema["~standard"].validate(...)` returns a `Promise`/thenable, immediately throw `ExcelError("INVALID_CONFIG")`. Per-cell/row failures emit non-throwing `diagnostics[]` with `{ severity: "caution" | "negative", sheet, ref, row, col, field, code?, message }`.
- **Analytics & Pivoting (§2.9):**
  - `sortRecords`: 3-state `asc` | `desc` | `none`, `compareMissingLast`, `compareNatural`, `HybridValue` sort.
  - `pivotRecords` / `unpivotRecords`: multi-key grouping, `TIME_BUCKETS` (`day | month | quarter | year`), all 12 `AGGREGATION_KINDS` (`sum`, `avg`, `weightedAvg`, `min`, `max`, `count`, `countIf`, `median`, `percentile`, `rate`, `first`, `last`) + custom reducer, configurable `<`-threshold handling.
  - Window analytics: `computeRunningTotals`, `computePeriodDeltas` (absolute + relative), `rankRecords` (`dense` | `competition`), `alignSeriesByKey` (`null`-padded axis alignment), `joinRecords` (`left | inner | outer` composite key), `dedupeRecords`.
- **Headless UI Contract (`projectTable`, §2.9, §3):** Outputs `{ columns, headers, subHeaders, rows, footer, frozenRows, frozenCols }` using `formatCellDisplay` whenever custom `format` is omitted so UI tables match Excel exports 1:1.
- **Diffing & Validation (§2.9):**
  - `diffSheets` / `diffWorkbooks`: cell-level and key-matched row-level diffs (`added`, `removed`, `modified` values/formulas/styles).
  - `validateSheetRules`: `required`, `unique`, `range`, `sumEquals`, `crossSheetEquals`, `cutoffReached`, `noZeroBaseWithPositiveTarget`, custom predicates → `ValidationReport` with `ValidationIssue[]`.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/query.test.ts`: `sheetToRecords` (sync StandardSchema pass/fail diagnostics + async schema throwing `INVALID_CONFIG`), `recordsToSheet`, `workbookToJson`/`jsonToWorkbook`, `fillDownRecords`, `canonicalizeValues`, `sortRecords` (`Missing Last`, `HybridValue`, natural sort), `pivotRecords` (all 12 aggregations + time buckets + threshold policy), `computeRunningTotals`, `computePeriodDeltas`, `rankRecords` (`dense` vs `competition`), `alignSeriesByKey`, `joinRecords` (`left`/`inner`/`outer`), `projectTable`.
- `src/modules/excel/diff.test.ts`: Cell-level & key-matched row-level sheet diffs, formula/style change detection, workbook added/removed/modified sheets.
- `src/modules/excel/validate.test.ts`: All built-in rules (`required`, `unique`, `range`, `sumEquals`, `crossSheetEquals`, `cutoffReached`, `noZeroBaseWithPositiveTarget`, custom) producing accurate `{ severity, sheet, ref, code, message }`.
- Run `bun run typecheck`, `bun run lint`, and `bun run test`.
- **Gate:** `tester` & `reviewer` sign off on M5.

---

## Milestone 6 — Browser I/O, Structural File Adapters, Public Barrel & Module Docs

### Goal
Complete browser file/download utilities, zero-coupling structural `FileAdapter` factories, the sole public `index.ts` barrel, and user + internal documentation.

### Scope & Files
- `src/modules/excel/browser-io.ts` (imports `types.ts`, `errors.ts`)
  - Exports: `isTempOfficeFile`, `slugifyFileName`, `readExcelFile`, `downloadXlsxBytes`, `downloadCsvText`
- `src/modules/excel/adapters.ts` (imports `types.ts`, `errors.ts`, `ooxml.ts`, `csv.ts`, `query.ts`)
  - Exports: structural `StandardSchemaV1` / `FileAdapter` types, `createXlsxAdapter`, `createCsvAdapter`
- `src/modules/excel/index.ts`
  - Sole public barrel re-exporting all public symbols from `types.ts`, `errors.ts`, `coords.ts`, `dates.ts`, `values.ts`, `ooxml.ts`, `csv.ts`, `builder.ts`, `scanner.ts`, `query.ts`, `diff.ts`, `validate.ts`, `browser-io.ts`, `adapters.ts`. **MUST NOT** export any `*.internal.*` file or internal symbol.
- `src/modules/excel/excel.docs.md` — Public user documentation (API examples, workflows, caveats).
- `src/modules/excel/excel.internal.md` — Internal engineering invariants (XML scanner, `StyleRegistry`, `SharedStrings`, Patcher slice mechanics, security bounds).

### Key Implementation Details / Invariants
- **Browser I/O (§2.10, §3):**
  - `isTempOfficeFile`: rejects `~$*` Office lock files.
  - `readExcelFile(file)`: reads `File | Blob` into `Uint8Array` and detects `ExcelFormat` (extension + magic-byte sanity).
  - `downloadXlsxBytes` / `downloadCsvText`: creates short-lived `Blob` URL (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` / `text/csv;charset=utf-8`), clicks temporary anchor without leaving persistent DOM nodes, and revokes the object URL cleanly.
- **Structural Adapters (§2.10):** Zero imports from `src/modules/file-system/`; structurally identical `FileAdapter` contract (`id`, `extensions`, `decode(ctx)`, `encode(data, ctx)`). Supports both sync and async `StandardSchemaV1` inside `async decode` (throwing `ExcelError("SCHEMA_VALIDATION_FAILED")` on schema failure).
- **Barrel Hygiene (§2.1, §5.1):** Verify `cs/svelte/excel` resolves cleanly via `package.json` `"./svelte/*": "./src/modules/*/index.ts"` and zero `*.internal.*` symbols leak.

### Tests & Verification Gate ("Done When")
- `src/modules/excel/adapters.test.ts`: `createXlsxAdapter` & `createCsvAdapter` roundtrip `encode`/`decode`, sync & async `StandardSchemaV1` validation + `SCHEMA_VALIDATION_FAILED` rejection, structural compatibility check against `src/modules/file-system/adapters.ts` types (via test-only type assertion if desired, never in production `adapters.ts`).
- `src/modules/excel/browser-io.test.ts` + `src/modules/excel/excel.browser.spec.ts` (Playwright): `isTempOfficeFile`, `slugifyFileName`, `readExcelFile` with `File`/`Blob`, real Chromium `downloadXlsxBytes` / `downloadCsvText` download event verification + zero leftover DOM anchor nodes.
- `src/modules/excel/index.test.ts`: Public barrel smoke test ensuring all documented exports exist and zero `*.internal.*` modules are exposed.
- Full verification: `bun run typecheck`, `bun run lint`, `bun run test`, Playwright browser spec, and `bun run build:docs` (if `excel.docs.md` is indexed).
- **Final Gate:** `tester` & `reviewer` full v1 audit against `excel.blueprint.md` and `.agents/rules/`.

---

## Phase 2+ Backlog (Post-v1 Roadmap)

Matches §5.3 of [excel.blueprint.md](./excel.blueprint.md); strictly out of scope for v1 Milestones 0–6:

1. **Formula Evaluation Layer (`formula.ts`):**
   - Lexer, AST parser, and topological dependency graph with cycle detection (`#CYCLE!`).
   - DE/EN function & separator normalization (`SUMME` → `SUM`, `;` → `,`) and extensible function registry.
   - Plugs directly into v1's reserved `FormulaEvaluator` interface and `PatchSession.recalculate(evaluator)`.
2. **Svelte 5 & `table` Module Integration:**
   - Reactive `table-state.svelte.ts` controller (column visibility toggling, 3-state sort, filter/pivot state, live `TableProjection`, one-click `.xlsx` export).
   - Visual Svelte table components consuming `projectTable()` (`TableProjection`) without coupling `src/modules/excel/` core to Svelte or CSS.
3. **Phase 2 OpenXML Writers:**
   - Declarative `<conditionalFormatting>` builder (`dxfs` styles + rule types).
   - Native Excel Table (`xl/tables/table*.xml`) writer (from-scratch `<tablePart>` authoring).
   - From-scratch classic (`commentsN.xml` + `vmlDrawingN.vml`) and threaded (`threadedComments`) cell comments writers.
