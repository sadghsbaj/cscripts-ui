# Excel Module — Internal Engineering Invariants

Maintainer reference for `src/modules/excel/`. All files matching `*.internal.*` are strictly private implementation details and **must never** be re-exported from `src/modules/excel/index.ts`.

## Internal Module Map

| File | Responsibility |
| :--- | :--- |
| `ooxml-xml.internal.ts` | Namespace-agnostic XML scanner/tree parser, XXE rejection, illegal XML char stripping, `ChunkedXmlWriter`, sorted slice patcher, self-closing tag expansion, attribute upsert/removal. |
| `ooxml-styles.internal.ts` | `StyleRegistry` deduplication, ECMA-376 reserved style IDs, `<styleSheet>` serialization, theme/tint/indexed color resolution, date `numFmt` detection, non-shifting `appendStylesToStylesXml`. |
| `ooxml-strings.internal.ts` | `SharedStringsReader`, `SharedStringsWriter` (plain `<t>` + rich-text `<r><rPr><t>`), `count`/`uniqueCount` parity, tail-only `appendSharedStringsXml`. |
| `ooxml-package.internal.ts` | `fflate` ZIP extract/pack, path traversal & zip-bomb guards, `.rels` resolution, `[Content_Types].xml` parsing/template swap, `calcChain.xml` cleanup, tables/definedNames/validations/hyperlinks/comments XML codecs. |

---

## 1. XML Engine (`ooxml-xml.internal.ts`)

1. **Namespace-Agnostic Scanning:**
   `scanXml` and `parseXmlTree` record both `rawName` (e.g. `x:worksheet`, `r:id`) and `localName` (stripping any prefix before `:`). Attribute lookup (`getXmlAttr`) and child lookup (`findXmlChild`, `findXmlChildren`) match by `localName`, while patch helpers preserve the original document's namespace prefix via `getXmlPrefix(rawName)`.
2. **XXE Rejection:**
   Any `<!DOCTYPE` or `<!ENTITY` declaration encountered during scanning immediately throws `ExcelError("CORRUPT_XML")`. External entities and DTD expansion are never supported.
3. **Illegal XML 1.0 Control Characters:**
   `stripIllegalXmlChars` strips invalid XML 1.0 characters (`0x00–0x08`, `0x0B`, `0x0C`, `0x0E–0x1F`, `0xFFFE`, `0xFFFF`) before entity escaping so Excel never rejects generated sheets with a corrupt-XML repair dialog. `xmlSpaceAttr(text)` adds ` xml:space="preserve"` whenever text has leading/trailing whitespace or newlines.
4. **Chunked UTF-8 Serialization (`ChunkedXmlWriter`):**
   `createChunkedXmlWriter(rowChunkSize = 5000)` buffers string fragments and flushes them through `TextEncoder` into `Uint8Array` chunks every 5,000 rows (`markRowBoundary()`), concatenating once at `toUint8Array()`. This prevents multi-hundred-megabyte intermediate JS string allocations on large exports.
5. **Sorted Non-Overlapping Slice Patcher (`applyXmlSlicePatches`):**
   All surgical XML edits emit `{ start, end, replacement }` byte/code-unit spans against the original XML string. `applyXmlSlicePatches` sorts patches ascending by `(start, end)`, verifies `0 <= start <= end <= xml.length` and `patch.start >= cursor` (throwing `ExcelError("PATCH_FAILED")` on out-of-bounds or overlapping spans), and assembles the output in one linear pass.
6. **Self-Closing Tag Expansion (`expandSelfClosingTag`):**
   When appending children into a container that was serialized as self-closing (e.g., `<sheetData/>`, `<sst count="0" uniqueCount="0"/>`, `<fonts count="0"/>`), `expandSelfClosingTag` converts `<tag attrs/>` into `<tag attrs>innerXml</tag>` while preserving original tag name and attributes.

---

## 2. Styles Engine (`ooxml-styles.internal.ts`)

1. **ECMA-376 Reserved Indices:**
   `StyleRegistry` pre-populates mandatory slots that Excel requires at fixed indices:
   - `fontId="0"`: default `<font><sz val="11"/><name val="Calibri"/></font>`.
   - `fillId="0"`: `<fill><patternFill patternType="none"/></fill>`.
   - `fillId="1"`: `<fill><patternFill patternType="gray125"/></fill>` (ECMA-376 §18.8.20). Custom solid fills start at `fillId >= 2`, and `applyFill="1"` is only emitted when `fillId > 1`.
   - `borderId="0"`: `<border><left/><right/><top/><bottom/><diagonal/></border>`.
   - `cellXfs[0]`: `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`.
   - Custom `numFmtId` values start at `164`; built-in ECMA-376 format codes (`0..49`) reuse their standard IDs.
2. **Strict `<styleSheet>` Child Element Order:**
   Excel requires `<styleSheet>` children in exact schema order:
   `numFmts` → `fonts` → `fills` → `borders` → `cellStyleXfs` → `cellXfs` → `cellStyles` → `dxfs` → `tableStyles`.
   Never reorder these sections in `StyleRegistry.toXml()` or when inserting missing sections during patching.
3. **Deduplication & Non-Shifting Patching (`appendStylesToStylesXml`):**
   When patching an existing workbook, `appendStylesToStylesXml` parses existing `cellXfs` to deduplicate identical styles and appends any new `numFmt`, `font`, `fill`, `border`, and `xf` elements **only at the tail** of their respective containers, updating each container's `count` attribute via `applyXmlSlicePatches` / `expandSelfClosingTag`. Existing `s="..."` indices on untouched cells in every worksheet remain valid without rewriting the workbook.
4. **Theme, Tint & Indexed Color Resolution:**
   - `parseThemeColorsXml` maps OOXML `<a:clrScheme>` slots into Excel's `theme="0..11"` index order (accounting for the `lt1`/`dk1` and `lt2`/`dk2` swap relative to XML declaration order).
   - `resolveOoxmlColor` resolves `rgb` (6- or 8-hex ARGB), `theme` + optional `tint` (HSL luminance scaling in `applyColorTint`), and `indexed` (64-entry `INDEXED_COLOR_PALETTE`).

---

## 3. Shared Strings (`ooxml-strings.internal.ts`)

1. **Plain & Rich-Text Runs:**
   Both `SharedStringsReader` and `SharedStringsWriter` support plain `<si><t>` entries and multi-run `<si><r><rPr>...</rPr><t>...</t></r></si>` entries (`bold`, `italic`, `fontSize`, `fg`, `fontFamily`). Deduplication keys distinguish plain strings (`p:...`) from rich-text run sequences (`r:...`).
2. **`count` vs `uniqueCount` Parity:**
   `count` represents total string references across cells (incremented on every `addString` / `addRichText` / appended reference), while `uniqueCount` equals the number of distinct `<si>` elements. Both attributes are kept synchronized on `<sst>`.
3. **Tail-Only Appending (`appendSharedStringsXml`):**
   During patching, `appendSharedStringsXml` scans the existing `sharedStrings.xml`, reuses indices for already-present plain/rich entries, appends only new `<si>` elements immediately before `</sst>` (or expands `<sst/>`), updates `count` and `uniqueCount`, and preserves any namespace prefix. Existing `t="s"` cell indices are never shifted.

---

## 4. OOXML Package & ZIP Safety (`ooxml-package.internal.ts`)

1. **Relationship-Driven Part Resolution:**
   Reading and patching never assume hardcoded paths like `xl/workbook.xml` or `xl/worksheets/sheet1.xml`:
   - `resolveWorkbookPartPath` resolves the `officeDocument` relationship from `_rels/.rels`.
   - Worksheet, styles, theme, sharedStrings, table, comment, threadedComment, and hyperlink targets are resolved relative to the owning part via `getRelsPathForPart` + `resolvePackageTarget` + `findPackageEntry` (with case-insensitive path fallback for non-conforming producers).
2. **Path Traversal Rejection:**
   `normalizePackagePath` normalizes backslashes, strips leading slashes, resolves `.` / `..`, and throws `ExcelError("CORRUPT_ARCHIVE")` if any `..` segment escapes the archive root. This runs inside `unzipSync`'s `filter` callback **before** entry inflation.
3. **Dual-Phase Zip-Bomb Protection:**
   `extractOoxmlPackage` enforces `maxEntryCount` (default `4_096`), `maxEntryBytes` (default `64 MiB`), and `maxUncompressedBytes` (default `128 MiB`) twice:
   - **Pre-inflation** inside `fflate.unzipSync`'s `filter` callback using ZIP header `originalSize`.
   - **Post-inflation** by summing actual inflated `entryBytes.byteLength` across all extracted entries to catch spoofed central-directory headers.
   Violations throw `ExcelError("LIMIT_EXCEEDED")`.
4. **Template Content-Type Swap (`convertTemplateToWorkbookContentTypes`):**
   Rewrites `[Content_Types].xml` overrides from `spreadsheetml.template.main+xml` → `spreadsheetml.sheet.main+xml` (`.xltx` → `.xlsx`) and `ms-excel.template.macroEnabled.main+xml` → `ms-excel.sheet.macroEnabled.main+xml` (`.xltm` → `.xlsm`), preserving all other overrides and defaults.
5. **`calcChain.xml` Cleanup (`stripCalcChainFromPackage`):**
   Whenever formulas are modified or formula caches are cleared/recalculated, `stripCalcChainFromPackage` deletes `xl/calcChain.xml`, removes its `<Relationship>` from `workbook.xml.rels`, and removes its `<Override>` from `[Content_Types].xml`. Leaving a stale `calcChain.xml` causes Excel to flag the workbook as corrupted on open.

---

## 5. Worksheet Schema & Patching Invariants (`ooxml.ts`)

1. **Strict ECMA-376 `CT_Worksheet` Child Element Order:**
   `WORKSHEET_ELEMENT_ORDER` encodes the exact §18.3.1.99 sequence:
   ```text
   sheetPr → dimension → sheetViews → sheetFormatPr → cols → sheetData →
   sheetCalcPr → sheetProtection → protectedRanges → scenarios → autoFilter →
   sortState → dataConsolidate → customSheetViews → mergeCells → phoneticPr →
   conditionalFormatting → dataValidations → hyperlinks → printOptions →
   pageMargins → pageSetup → headerFooter → rowBreaks → colBreaks →
   customProperties → cellWatches → ignoredErrors → smartTags → drawing →
   legacyDrawing → legacyDrawingHF → picture → oleObjects → controls →
   webPublishItems → tableParts → extLst
   ```
   When patching inserts a new top-level worksheet element (e.g. `<cols>`, `<dataValidations>`, `<hyperlinks>`), the insertion offset **must** be computed via `WORKSHEET_ORDER_INDEX`. Out-of-order children trigger Excel's file-repair prompt.
2. **Shared-Formula Master Promotion & Slave Materialization:**
   - **On read:** Shared master formulas (`<f t="shared" ref="A1:A10" si="0">expr</f>`) are indexed by `si`; slave cells (`<f t="shared" si="0"/>`) have their expressions expanded via `translateFormulaRefs(master.expr, colDelta, rowDelta)`.
   - **On patch:** Mutating, clearing, or deleting any cell in shared group `si` invalidates the original shared group. Surviving untouched members are either promoted to a valid new master (if contiguous) or materialized into standalone normal `<f>expr</f>` formulas so no orphaned slave `<f t="shared" si="N"/>` remains.
3. **Array-Formula Mutation Rejection:**
   Attempting to partially mutate, clear, or delete a cell inside a multi-cell array formula range (`<f t="array" ref="A1:C5">`) throws `ExcelError("PATCH_FAILED")` rather than producing a broken CSE/dynamic array range.
4. **`PatchSession` Batching Semantics:**
   - All mutation methods (`setCellValue`, `setFormula`, `setCellStyle`, `setRowHidden`, `setColWidth`, `addHyperlink`, `setDataValidation`, etc.) immediately update the live `WorkbookModel` returned by `getWorkbook()` and queue per-sheet patch buffers.
   - `toBytes()` commits pending styles (`appendStylesToStylesXml`), shared strings (`appendSharedStringsXml`), per-sheet XML slice patches, `workbook.xml` sheet visibility / `<calcPr fullCalcOnLoad="1"/>`, `calcChain.xml` stripping, and optional template content-type conversion in a single deterministic pass.
   - Untouched ZIP entries (`vbaProject.bin`, drawings, charts, pivot tables, `<conditionalFormatting>`, custom XML) are copied byte-for-byte into the output archive.

---

## 6. Runtime, TypeScript & Architecture Constraints

- **Strict TypeScript:** Zero `any`, zero non-null assertions (`!`) in production `.ts` files, safe under `noUncheckedIndexedAccess` and strict ESLint rules.
- **Node 20 LTS & Browser Compatibility:** Do **not** use ES2025 iterator helper methods (e.g. `map.values().map(...)`, `set.values().toArray()`). Use `for..of` loops or `Array.from(...)`.
- **Module Isolation:** Zero cross-module imports inside `src/modules/excel/`. For example, `adapters.ts` defines a structurally compatible `FileAdapter` interface rather than importing from `src/modules/file-system/`.
- **Public Barrel Hygiene:** `src/modules/excel/index.ts` must never export any symbol from `*.internal.*` files.
- **Single-File `file://` Safe:** Zero Web Workers, zero dynamic `import()` asset fetches, zero runtime dependencies beyond `fflate`, and 100% synchronous in-memory execution (except `readExcelFile` and async `FileAdapter` hooks).
