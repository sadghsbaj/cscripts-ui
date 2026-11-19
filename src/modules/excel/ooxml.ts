import {
    colToLetter,
    formatCellRef,
    getCell,
    parseCellRef,
    parseRangeRef,
    parseSheetQualifiedRef,
    setCell,
    translateFormulaRefs,
} from "./coords.ts";
import { excelSerialToDate, isoDateToExcelSerial } from "./dates.ts";
import { ExcelError } from "./errors.ts";
import {
    appendRelationshipsXml,
    convertTemplateToWorkbookContentTypes,
    decodeUtf8,
    DEFAULT_MAX_ENTRY_BYTES,
    DEFAULT_MAX_ENTRY_COUNT,
    DEFAULT_MAX_UNCOMPRESSED_BYTES,
    encodeUtf8,
    ensureContentTypeOverride,
    extractOoxmlPackage,
    findPackageEntry,
    findRelationshipsByType,
    getRelsPathForPart,
    packOoxmlPackage,
    parseCommentsXml,
    parseContentTypesXml,
    parseDataValidationsXml,
    parseDefinedNamesXml,
    parseHyperlinksXml,
    parseRelationshipsXml,
    parseTableXml,
    parseThreadedCommentsXml,
    removeCalcChainEntries,
    resolvePackageTarget,
    resolveWorkbookPartPath,
    serializeContentTypesXml,
    serializeDataValidationsXml,
    serializeDefinedNamesXml,
    serializeHyperlinksXml,
    serializeRelationshipsXml,
    stripCalcChainFromPackage,
    type PackageRelationship,
} from "./ooxml-package.internal.ts";
import {
    appendSharedStringsXml,
    createSharedStringsReader,
    createSharedStringsWriter,
    type SharedStringsReader,
    type SharedStringsWriter,
} from "./ooxml-strings.internal.ts";
import {
    appendStylesToStylesXml,
    createStyleRegistry,
    DEFAULT_THEME_COLORS,
    isDateNumFmt,
    normalizeHexColor,
    parseStylesXml,
    parseThemeColorsXml,
    resolveOoxmlColor,
    type ParsedStyles,
    type StyleRegistry,
} from "./ooxml-styles.internal.ts";
import {
    applyXmlSlicePatches,
    createChunkedXmlWriter,
    escapeXmlAttr,
    escapeXmlText,
    expandSelfClosingTag,
    findXmlChild,
    findXmlChildren,
    getXmlAttr,
    getXmlPrefix,
    parseXmlTree,
    removeXmlAttribute,
    scanXml,
    upsertXmlAttribute,
    xmlSpaceAttr,
    type XmlElement,
    type XmlSlicePatch,
} from "./ooxml-xml.internal.ts";
import {
    SHEET_VISIBILITY_STATES,
    type CellFormula,
    type CellHyperlink,
    type CellModel,
    type CellRichTextRun,
    type CellScalar,
    type ColumnSpec,
    type DataValidationRule,
    type DefinedNameSpec,
    type ExcelDateSystem,
    type ExcelStyleSpec,
    type ExcelTableSpec,
    type FormulaEvaluator,
    type PatchCellOptions,
    type PatchSessionOptions,
    type RangeRef,
    type RowMeta,
    type SheetFreezePane,
    type SheetPageMargins,
    type SheetPageSetup,
    type SheetVisibilityState,
    type WorkbookModel,
    type WorksheetModel,
} from "./types.ts";
import { isExcelErrorValue } from "./values.ts";

export type { PatchCellOptions, PatchSessionOptions } from "./types.ts";

export interface ReadXlsxOptions {
    includeStyles?: boolean;
    includeComments?: boolean;
    includeValidations?: boolean;
    includeHyperlinks?: boolean;
    includeTables?: boolean;
    sheetFilter?: string[] | ((name: string) => boolean);
    maxUncompressedBytes?: number;
    maxEntryBytes?: number;
    maxEntryCount?: number;
    maxSheets?: number;
    maxCells?: number;
}

export interface WriteXlsxOptions {
    useSharedStrings?: boolean;
    compressionLevel?: 0 | 1 | 6 | 9;
    convertTemplateToWorkbook?: boolean;
    sanitizeFormulaInjection?: boolean;
}

export interface PatchSession {
    getWorkbook(): WorkbookModel;
    setCellValue(sheetName: string, ref: string, value: CellScalar, options?: PatchCellOptions): this;
    setFormula(
        sheetName: string,
        ref: string,
        expression: string,
        cachedResult?: CellScalar,
        options?: PatchCellOptions
    ): this;
    setCachedResult(sheetName: string, ref: string, cachedResult: CellScalar, error?: string): this;
    setCellStyle(sheetName: string, ref: string, style: ExcelStyleSpec): this;
    clearCellValue(sheetName: string, ref: string): this;
    deleteCell(sheetName: string, ref: string): this;
    setRowHidden(sheetName: string, rowIndex: number, hidden: boolean): this;
    setRowHeight(sheetName: string, rowIndex: number, height: number | null): this;
    setColWidth(sheetName: string, colIndexOrRange: number | [number, number], width: number | null): this;
    setColHidden(sheetName: string, colIndexOrRange: number | [number, number], hidden: boolean): this;
    setSheetVisibility(sheetName: string, state: SheetVisibilityState): this;
    addHyperlink(sheetName: string, ref: string, link: CellHyperlink): this;
    setDataValidation(sheetName: string, rule: DataValidationRule): this;
    recalculate(evaluator?: FormulaEvaluator): this;
    toBytes(options?: { convertTemplateToWorkbook?: boolean }): Uint8Array;
}

const DEFAULT_MAX_SHEETS = 256;
const DEFAULT_MAX_CELLS = 2_000_000;
const MAX_EXCEL_ROW_1_BASED = 1_048_576;
const MAX_EXCEL_COL_1_BASED = 16_384;

const HTTP_SCHEME = ["http", "://"].join("");
const SPREADSHEET_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main`;
const OFFICE_REL_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships`;
const OFFICE_DOC_REL_TYPE = `${OFFICE_REL_NS}/officeDocument`;
const WORKSHEET_REL_TYPE = `${OFFICE_REL_NS}/worksheet`;
const STYLES_REL_TYPE = `${OFFICE_REL_NS}/styles`;
const SHARED_STRINGS_REL_TYPE = `${OFFICE_REL_NS}/sharedStrings`;
const HYPERLINK_REL_TYPE = `${OFFICE_REL_NS}/hyperlink`;

const SHEET_MAIN_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
const SHEET_MACRO_CT = "application/vnd.ms-excel.sheet.macroEnabled.main+xml";
const TEMPLATE_MAIN_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml";
const TEMPLATE_MACRO_CT = "application/vnd.ms-excel.template.macroEnabled.main+xml";
const BINARY_MAIN_CT = "application/vnd.ms-excel.sheet.binary.macroEnabled.main";
const WORKSHEET_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml";
const STYLES_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml";
const SHARED_STRINGS_CT = "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml";
const RELS_CT = "application/vnd.openxmlformats-package.relationships+xml";

const MAIN_CONTENT_TYPES: ReadonlySet<string> = new Set([
    SHEET_MAIN_CT,
    SHEET_MACRO_CT,
    TEMPLATE_MAIN_CT,
    TEMPLATE_MACRO_CT,
    BINARY_MAIN_CT,
]);

const FORBIDDEN_SHEET_NAME_CHARS_RE = /[\\/?*[\]:]/;
const FORMULA_INJECTION_TRIGGER_RE = /^(?:[=+\-@\t\r\n]|\s*[=+\-@])/;
const FORMULA_KINDS: ReadonlySet<string> = new Set(["shared", "array", "dataTable", "normal"]);

// Strict ECMA-376 Part 1 §18.3.1.99 CT_Worksheet child element sequence.
const WORKSHEET_ELEMENT_ORDER: readonly string[] = [
    "sheetPr",
    "dimension",
    "sheetViews",
    "sheetFormatPr",
    "cols",
    "sheetData",
    "sheetCalcPr",
    "sheetProtection",
    "protectedRanges",
    "scenarios",
    "autoFilter",
    "sortState",
    "dataConsolidate",
    "customSheetViews",
    "mergeCells",
    "phoneticPr",
    "conditionalFormatting",
    "dataValidations",
    "hyperlinks",
    "printOptions",
    "pageMargins",
    "pageSetup",
    "headerFooter",
    "rowBreaks",
    "colBreaks",
    "customProperties",
    "cellWatches",
    "ignoredErrors",
    "smartTags",
    "drawing",
    "legacyDrawing",
    "legacyDrawingHF",
    "picture",
    "oleObjects",
    "controls",
    "webPublishItems",
    "tableParts",
    "extLst",
];

const WORKSHEET_ORDER_INDEX: Readonly<Record<string, number>> = (() => {
    const map: Record<string, number> = Object.create(null) as Record<string, number>;
    for (const [idx, name] of WORKSHEET_ELEMENT_ORDER.entries()) {
        map[name] = idx;
    }
    return map;
})();

const VISIBILITY_STATE_SET: ReadonlySet<string> = new Set(SHEET_VISIBILITY_STATES);

function parseSafeInt(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseFiniteFloat(value: string | undefined): number | undefined {
    if (value === undefined) {
        return undefined;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return undefined;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOoxmlBool(value: string | undefined): boolean | undefined {
    if (value === undefined) {
        return undefined;
    }
    const lower = value.trim().toLowerCase();
    if (lower === "1" || lower === "true") {
        return true;
    }
    if (lower === "0" || lower === "false") {
        return false;
    }
    return undefined;
}

function isOle2CfbMagic(bytes: Uint8Array): boolean {
    return (
        bytes.byteLength >= 8 &&
        bytes[0] === 0xd0 &&
        bytes[1] === 0xcf &&
        bytes[2] === 0x11 &&
        bytes[3] === 0xe0 &&
        bytes[4] === 0xa1 &&
        bytes[5] === 0xb1 &&
        bytes[6] === 0x1a &&
        bytes[7] === 0xe1
    );
}

function detectSourceFormat(
    entries: Readonly<Record<string, Uint8Array>>,
    workbookPath: string
): "xlsx" | "xlsm" | "xltx" | "xltm" {
    const ctEntry = findPackageEntry(entries, "[Content_Types].xml");
    if (ctEntry) {
        const ctModel = parseContentTypesXml(decodeUtf8(ctEntry.bytes));
        const targetPart = `/${workbookPath}`.toLowerCase();
        const matchingOverride =
            ctModel.overrides.find((ovr) => ovr.partName.toLowerCase() === targetPart) ??
            ctModel.overrides.find((ovr) => MAIN_CONTENT_TYPES.has(ovr.contentType));
        if (matchingOverride) {
            switch (matchingOverride.contentType) {
                case BINARY_MAIN_CT: {
                    throw new ExcelError(
                        "UNSUPPORTED_FORMAT",
                        "Binary Excel workbook (.xlsb) format is not supported."
                    );
                }
                case SHEET_MACRO_CT: {
                    return "xlsm";
                }
                case TEMPLATE_MAIN_CT: {
                    return "xltx";
                }
                case TEMPLATE_MACRO_CT: {
                    return "xltm";
                }
                case SHEET_MAIN_CT: {
                    return "xlsx";
                }
            }
        }
    }
    if (findPackageEntry(entries, "xl/vbaProject.bin")) {
        return "xlsm";
    }
    return "xlsx";
}

function matchesSheetFilter(name: string, filter: ReadXlsxOptions["sheetFilter"]): boolean {
    if (!filter) {
        return true;
    }
    if (typeof filter === "function") {
        return filter(name);
    }
    const lower = name.toLowerCase();
    return filter.some((candidate) => candidate === name || candidate.toLowerCase() === lower);
}

function isValidCalendarYmd(year: number, month: number, day: number): boolean {
    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }
    const probe = new Date(Date.UTC(year, month - 1, day));
    return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function parseIsoCellDate(raw: string): Date | null {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
        return null;
    }
    const ymdMatch = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T t])/.exec(trimmed);
    if (ymdMatch) {
        const year = Number(ymdMatch[1]);
        const month = Number(ymdMatch[2]);
        const day = Number(ymdMatch[3]);
        if (!isValidCalendarYmd(year, month, day)) {
            return null;
        }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const d = new Date(`${trimmed}T00:00:00.000Z`);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed);
    const normalized = /^\d{4}-\d{2}-\d{2}[T t]/.test(trimmed)
        ? `${trimmed.replace(/^(\d{4}-\d{2}-\d{2})[T t]/, "$1T").replace(/z$/, "Z")}${hasTz ? "" : "Z"}`
        : trimmed;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
}

function isUtcMidnight(date: Date): boolean {
    return (
        date.getUTCHours() === 0 &&
        date.getUTCMinutes() === 0 &&
        date.getUTCSeconds() === 0 &&
        date.getUTCMilliseconds() === 0
    );
}

function defaultDateNumFmtForDate(date: Date): string {
    return isUtcMidnight(date) ? "yyyy-mm-dd" : "yyyy-mm-dd hh:mm:ss";
}

function toOoxmlArgbAttr(hex: string): string {
    const normalized = normalizeHexColor(hex);
    return normalized ? `FF${normalized.slice(1)}` : "FF000000";
}

function decodePaperSize(raw: string | undefined): SheetPageSetup["paperSize"] | undefined {
    const code = parseSafeInt(raw);
    if (code === undefined) {
        return undefined;
    }
    switch (code) {
        case 1: {
            return "letter";
        }
        case 5: {
            return "legal";
        }
        case 9: {
            return "A4";
        }
        default: {
            return code;
        }
    }
}

function encodePaperSize(paperSize: SheetPageSetup["paperSize"] | undefined): number | undefined {
    if (paperSize === undefined) {
        return undefined;
    }
    if (typeof paperSize === "number") {
        return Number.isSafeInteger(paperSize) ? paperSize : undefined;
    }
    switch (paperSize) {
        case "letter": {
            return 1;
        }
        case "legal": {
            return 5;
        }
        case "A4": {
            return 9;
        }
    }
}

function splitTopLevelCommas(formula: string): string[] {
    const parts: string[] = [];
    let current = "";
    let inSingleQuote = false;
    for (const ch of formula) {
        if (ch === "'") {
            inSingleQuote = !inSingleQuote;
            current += ch;
            continue;
        }
        if (ch === "," && !inSingleQuote) {
            parts.push(current.trim());
            current = "";
            continue;
        }
        current += ch;
    }
    if (current.trim().length > 0) {
        parts.push(current.trim());
    }
    return parts;
}

function stripSheetPrefixFromRef(part: string): string {
    if (part.startsWith("'")) {
        let i = 1;
        while (i < part.length) {
            if (part[i] === "'") {
                if (part[i + 1] === "'") {
                    i += 2;
                    continue;
                }
                if (part[i + 1] === "!") {
                    return part.slice(i + 2);
                }
                break;
            }
            i += 1;
        }
    }
    const bang = part.indexOf("!");
    return bang === -1 ? part : part.slice(bang + 1);
}

function applyPrintTitlesFormulaToSheet(sheet: WorksheetModel, formula: string): void {
    for (const token of splitTopLevelCommas(formula)) {
        const clean = stripSheetPrefixFromRef(token).replaceAll("$", "");
        if (/^\d+:\d+$/.test(clean)) {
            sheet.pageSetup ??= {};
            sheet.pageSetup.printTitleRows = clean;
        } else if (/^[A-Za-z]{1,3}:[A-Za-z]{1,3}$/.test(clean)) {
            sheet.pageSetup ??= {};
            sheet.pageSetup.printTitleCols = clean.toUpperCase();
        }
    }
}

function applyPrintDefinedNamesToSheets(
    definedNames: readonly DefinedNameSpec[],
    originalIndexToSheet: ReadonlyMap<number, WorksheetModel>
): void {
    for (const dn of definedNames) {
        if (dn.localSheetId === undefined) {
            continue;
        }
        const sheet = originalIndexToSheet.get(dn.localSheetId);
        if (!sheet) {
            continue;
        }
        const lowerName = dn.name.toLowerCase();
        if (lowerName === "_xlnm.print_area") {
            const rangePart = stripSheetPrefixFromRef(dn.formula.trim()).replaceAll("$", "");
            if (rangePart.length > 0) {
                sheet.pageSetup ??= {};
                sheet.pageSetup.printArea = rangePart;
            }
        } else if (lowerName === "_xlnm.print_titles") {
            applyPrintTitlesFormulaToSheet(sheet, dn.formula);
        }
    }
}

interface SharedMasterFormulaInfo {
    col: number;
    row: number;
    expression: string;
    ref?: string;
}

interface PendingSharedSlave {
    cellRef: string;
    col: number;
    row: number;
    si: number;
}

function attachCommentsFromPart(
    cells: Map<string, CellModel>,
    entries: Readonly<Record<string, Uint8Array>>,
    sheetPartPath: string,
    rel: PackageRelationship,
    threaded: boolean,
    personsXml?: string
): void {
    const commentPath = resolvePackageTarget(sheetPartPath, rel.target);
    const commentEntry = findPackageEntry(entries, commentPath);
    if (!commentEntry) {
        return;
    }
    const commentMap = threaded
        ? parseThreadedCommentsXml(decodeUtf8(commentEntry.bytes), personsXml)
        : parseCommentsXml(decodeUtf8(commentEntry.bytes));
    for (const [ref, comment] of commentMap) {
        const existing = cells.get(ref);
        if (existing) {
            existing.comment = comment;
        } else {
            cells.set(ref, { value: null, type: "empty", comment });
        }
    }
}

function parseWorksheetXml(
    sheetXml: string,
    sheetName: string,
    sheetState: SheetVisibilityState | undefined,
    options: {
        dateSystem: ExcelDateSystem;
        themeColors: readonly string[];
        parsedStyles?: ParsedStyles;
        sharedStrings?: SharedStringsReader;
        includeStyles: boolean;
        includeValidations: boolean;
        includeHyperlinks: boolean;
        includeComments: boolean;
        includeTables: boolean;
        sheetRels: readonly PackageRelationship[];
        sheetPartPath: string;
        entries: Readonly<Record<string, Uint8Array>>;
        personsXml?: string;
        cellCounter: { count: number; maxCells: number };
        tablesOut: ExcelTableSpec[];
    }
): WorksheetModel {
    const cells = new Map<string, CellModel>();
    const rowsMeta = new Map<number, RowMeta>();
    const columns: ColumnSpec[] = [];
    const merges: string[] = [];
    const tableRelIds: string[] = [];
    const sharedMasters = new Map<number, SharedMasterFormulaInfo>();
    const pendingSlaves: PendingSharedSlave[] = [];

    let freezePane: SheetFreezePane | undefined;
    let autoFilterRef: string | undefined;
    let showGridLines: boolean | undefined;
    let tabColor: string | undefined;
    let pageSetup: SheetPageSetup | undefined;
    let fitToPageFlag = false;
    let defaultRowHeight: number | undefined;
    let defaultColWidth: number | undefined;

    let dataValidationsStart = -1;
    let dataValidationsEnd = -1;
    let hyperlinksStart = -1;
    let hyperlinksEnd = -1;

    let inSheetPr = false;
    let inSheetViews = false;
    let inCols = false;
    let inSheetData = false;
    let inMergeCells = false;
    let inTableParts = false;

    let prevRow1Based = 0;
    let currentRow1Based = 0;
    let prevCol0Based = -1;

    let inCell = false;
    let cellCol = 0;
    let cellRow = 0;
    let cellRef = "";
    let cellTypeAttr: string | undefined;
    let cellStyleIdx: number | undefined;
    let cellHasCm = false;

    let inFormula = false;
    let hasFormula = false;
    let formulaKind: CellFormula["kind"] = "normal";
    let formulaRefAttr: string | undefined;
    let formulaSiAttr: number | undefined;
    let formulaBuffer = "";

    let inValue = false;
    let hasValue = false;
    let valueBuffer = "";

    let inInlineStr = false;
    let hasInlineStr = false;
    let inlinePhoneticDepth = 0;
    let inInlineRun = false;
    let inInlineRPr = false;
    let inInlineText = false;
    let inlinePlainBuffer = "";
    let inlineRunTextBuffer = "";
    let inlineRuns: CellRichTextRun[] = [];
    let inlineRunMeta: Omit<CellRichTextRun, "text"> = {};

    const finalizeCurrentCell = (): void => {
        if (!inCell) {
            return;
        }
        inCell = false;

        let value: CellScalar = null;
        let type: CellModel["type"] = "empty";
        let richText: readonly CellRichTextRun[] | undefined;

        switch (cellTypeAttr) {
            case "s": {
                if (hasValue) {
                    const sstIdx = parseSafeInt(valueBuffer);
                    const entry = sstIdx === undefined ? undefined : options.sharedStrings?.get(sstIdx);
                    value = entry ? entry.text : "";
                    type = "string";
                    if (entry?.richText && entry.richText.length > 0) {
                        richText = entry.richText;
                    }
                }
                break;
            }
            case "inlineStr": {
                if (inlineRuns.length > 0) {
                    value = inlineRuns.map((run) => run.text).join("");
                    type = "string";
                    richText = inlineRuns;
                } else {
                    value = inlinePlainBuffer;
                    type = "string";
                }
                break;
            }
            case "str": {
                value = hasValue ? valueBuffer : "";
                type = "string";
                break;
            }
            case "b": {
                if (hasValue) {
                    const trimmed = valueBuffer.trim().toLowerCase();
                    value = trimmed === "1" || trimmed === "true";
                    type = "boolean";
                }
                break;
            }
            case "e": {
                const errToken = valueBuffer.trim() || "#VALUE!";
                value = errToken;
                type = "error";
                break;
            }
            case "d": {
                if (hasValue) {
                    const parsedDate = parseIsoCellDate(valueBuffer);
                    if (parsedDate) {
                        value = parsedDate;
                        type = "date";
                    } else {
                        value = valueBuffer;
                        type = "string";
                    }
                }
                break;
            }
            default: {
                if (hasInlineStr) {
                    if (inlineRuns.length > 0) {
                        value = inlineRuns.map((run) => run.text).join("");
                        type = "string";
                        richText = inlineRuns;
                    } else {
                        value = inlinePlainBuffer;
                        type = "string";
                    }
                } else if (hasValue) {
                    const trimmed = valueBuffer.trim();
                    if (trimmed.length > 0) {
                        const num = Number(trimmed);
                        if (Number.isFinite(num)) {
                            const isDate =
                                cellStyleIdx !== undefined && (options.parsedStyles?.isDateByXf[cellStyleIdx] ?? false);
                            if (isDate) {
                                const dateVal = excelSerialToDate(num, options.dateSystem);
                                if (dateVal) {
                                    value = dateVal;
                                    type = "date";
                                } else {
                                    value = num;
                                    type = "number";
                                }
                            } else {
                                value = num;
                                type = "number";
                            }
                        }
                    }
                }
                break;
            }
        }

        let formula: CellFormula | undefined;
        if (hasFormula) {
            const rawExpr = formulaBuffer.trim();
            const expr = rawExpr.startsWith("=") ? rawExpr.slice(1) : rawExpr;
            formula = {
                expression: expr,
                kind: formulaKind,
            };
            if (formulaRefAttr) {
                formula.ref = formulaRefAttr;
            }
            if (formulaSiAttr !== undefined) {
                formula.sharedGroup = formulaSiAttr;
            }
            if (formulaKind === "array" && cellHasCm) {
                formula.dynamicArray = true;
            }
            if (type === "error" && typeof value === "string") {
                formula.error = value;
                formula.cachedResult = null;
            } else if (type !== "empty") {
                formula.cachedResult = value;
            }

            if (formulaKind === "shared" && formulaSiAttr !== undefined) {
                if (expr.length > 0) {
                    sharedMasters.set(formulaSiAttr, {
                        col: cellCol,
                        row: cellRow,
                        expression: expr,
                        ref: formulaRefAttr,
                    });
                } else {
                    const master = sharedMasters.get(formulaSiAttr);
                    if (master) {
                        formula.expression = translateFormulaRefs(
                            master.expression,
                            cellCol - master.col,
                            cellRow - master.row
                        );
                    } else {
                        pendingSlaves.push({
                            cellRef,
                            col: cellCol,
                            row: cellRow,
                            si: formulaSiAttr,
                        });
                    }
                }
            }
        }

        let style: ExcelStyleSpec | undefined;
        if (options.includeStyles && cellStyleIdx !== undefined) {
            const resolved = options.parsedStyles?.cellXfs[cellStyleIdx];
            if (resolved && Object.keys(resolved).length > 0) {
                style = resolved;
            } else if (cellStyleIdx > 0 && type === "empty" && !formula) {
                style = {};
            }
        }

        if (type === "empty" && !formula && !richText && !style) {
            return;
        }

        options.cellCounter.count += 1;
        if (options.cellCounter.count > options.cellCounter.maxCells) {
            throw new ExcelError("LIMIT_EXCEEDED", `Workbook exceeds maxCells (${options.cellCounter.maxCells}).`, {
                details: { maxCells: options.cellCounter.maxCells },
            });
        }

        const cellModel: CellModel = { value, type };
        if (formula) {
            cellModel.formula = formula;
        }
        if (richText) {
            cellModel.richText = richText;
        }
        if (style) {
            cellModel.style = style;
        }
        cells.set(cellRef, cellModel);
    };

    scanXml(sheetXml, {
        onOpenTag(tag) {
            if (inSheetData) {
                if (tag.localName === "row") {
                    const rAttr = parseSafeInt(getXmlAttr(tag.attrs, "r"));
                    currentRow1Based = rAttr !== undefined && rAttr >= 1 ? rAttr : prevRow1Based + 1;
                    prevRow1Based = currentRow1Based;
                    prevCol0Based = -1;

                    const ht = parseFiniteFloat(getXmlAttr(tag.attrs, "ht"));
                    const hidden = parseOoxmlBool(getXmlAttr(tag.attrs, "hidden")) === true;
                    const outlineLevel = parseSafeInt(getXmlAttr(tag.attrs, "outlineLevel"));
                    const collapsed = parseOoxmlBool(getXmlAttr(tag.attrs, "collapsed")) === true;

                    if (ht !== undefined || hidden || (outlineLevel !== undefined && outlineLevel > 0) || collapsed) {
                        const meta: RowMeta = { rowIndex: currentRow1Based };
                        if (ht !== undefined) {
                            meta.height = ht;
                        }
                        if (hidden) {
                            meta.hidden = true;
                        }
                        if (outlineLevel !== undefined && outlineLevel > 0) {
                            meta.outlineLevel = outlineLevel;
                        }
                        if (collapsed) {
                            meta.collapsed = true;
                        }
                        rowsMeta.set(currentRow1Based, meta);
                    }
                    return;
                }

                if (tag.localName === "c") {
                    inCell = true;
                    const rAttr = getXmlAttr(tag.attrs, "r");
                    if (rAttr) {
                        const parsed = parseCellRef(rAttr);
                        cellCol = parsed.col;
                        cellRow = parsed.row;
                    } else {
                        cellCol = prevCol0Based + 1;
                        cellRow = Math.max(0, currentRow1Based - 1);
                    }
                    cellRef = formatCellRef(cellCol, cellRow);
                    prevCol0Based = cellCol;
                    cellTypeAttr = getXmlAttr(tag.attrs, "t");
                    cellStyleIdx = parseSafeInt(getXmlAttr(tag.attrs, "s"));
                    cellHasCm = getXmlAttr(tag.attrs, "cm") !== undefined;

                    inFormula = false;
                    hasFormula = false;
                    formulaKind = "normal";
                    formulaRefAttr = undefined;
                    formulaSiAttr = undefined;
                    formulaBuffer = "";

                    inValue = false;
                    hasValue = false;
                    valueBuffer = "";

                    inInlineStr = false;
                    hasInlineStr = false;
                    inlinePhoneticDepth = 0;
                    inInlineRun = false;
                    inInlineRPr = false;
                    inInlineText = false;
                    inlinePlainBuffer = "";
                    inlineRunTextBuffer = "";
                    inlineRuns = [];
                    inlineRunMeta = {};

                    if (tag.selfClosing) {
                        finalizeCurrentCell();
                    }
                    return;
                }

                if (!inCell) {
                    return;
                }

                if (tag.localName === "f") {
                    hasFormula = true;
                    const fType = getXmlAttr(tag.attrs, "t");
                    formulaKind =
                        fType && FORMULA_KINDS.has(fType) ? (fType as NonNullable<CellFormula["kind"]>) : "normal";
                    formulaRefAttr = getXmlAttr(tag.attrs, "ref");
                    formulaSiAttr = parseSafeInt(getXmlAttr(tag.attrs, "si"));
                    formulaBuffer = "";
                    inFormula = !tag.selfClosing;
                    return;
                }

                if (tag.localName === "v") {
                    hasValue = true;
                    valueBuffer = "";
                    inValue = !tag.selfClosing;
                    return;
                }

                if (tag.localName === "is") {
                    hasInlineStr = true;
                    inInlineStr = !tag.selfClosing;
                    return;
                }

                if (inInlineStr) {
                    if (tag.localName === "rPh") {
                        if (!tag.selfClosing) {
                            inlinePhoneticDepth += 1;
                        }
                        return;
                    }
                    if (inlinePhoneticDepth > 0) {
                        return;
                    }
                    if (tag.localName === "r") {
                        inInlineRun = true;
                        inlineRunTextBuffer = "";
                        inlineRunMeta = {};
                        if (tag.selfClosing) {
                            inlineRuns.push({ text: "" });
                            inInlineRun = false;
                        }
                        return;
                    }
                    if (inInlineRun && tag.localName === "rPr") {
                        if (!tag.selfClosing) {
                            inInlineRPr = true;
                        }
                        return;
                    }
                    if (inInlineRPr) {
                        switch (tag.localName) {
                            case "b": {
                                if (parseOoxmlBool(getXmlAttr(tag.attrs, "val")) !== false) {
                                    inlineRunMeta.bold = true;
                                }
                                break;
                            }
                            case "i": {
                                if (parseOoxmlBool(getXmlAttr(tag.attrs, "val")) !== false) {
                                    inlineRunMeta.italic = true;
                                }
                                break;
                            }
                            case "color": {
                                const fg = resolveOoxmlColor(tag.attrs, options.themeColors);
                                if (fg) {
                                    inlineRunMeta.fg = fg;
                                }
                                break;
                            }
                            case "sz": {
                                const sz = parseFiniteFloat(getXmlAttr(tag.attrs, "val"));
                                if (sz !== undefined) {
                                    inlineRunMeta.fontSize = sz;
                                }
                                break;
                            }
                            case "rFont":
                            case "name": {
                                const val = getXmlAttr(tag.attrs, "val");
                                if (val) {
                                    inlineRunMeta.fontFamily = val;
                                }
                                break;
                            }
                        }
                        return;
                    }
                    if (tag.localName === "t" && !tag.selfClosing) {
                        inInlineText = true;
                    }
                }
                return;
            }

            switch (tag.localName) {
                case "sheetPr": {
                    if (!tag.selfClosing) {
                        inSheetPr = true;
                    }
                    break;
                }
                case "tabColor": {
                    if (inSheetPr) {
                        const resolved = resolveOoxmlColor(tag.attrs, options.themeColors);
                        if (resolved) {
                            tabColor = resolved;
                        }
                    }
                    break;
                }
                case "pageSetUpPr": {
                    if (inSheetPr && parseOoxmlBool(getXmlAttr(tag.attrs, "fitToPage")) === true) {
                        fitToPageFlag = true;
                    }
                    break;
                }
                case "sheetViews": {
                    if (!tag.selfClosing) {
                        inSheetViews = true;
                    }
                    break;
                }
                case "sheetView": {
                    if (inSheetViews) {
                        const sg = parseOoxmlBool(getXmlAttr(tag.attrs, "showGridLines"));
                        if (sg !== undefined) {
                            showGridLines = sg;
                        }
                    }
                    break;
                }
                case "pane": {
                    if (inSheetViews) {
                        const state = getXmlAttr(tag.attrs, "state");
                        if (!state || state === "frozen" || state === "frozenSplit") {
                            const xSplit = parseSafeInt(getXmlAttr(tag.attrs, "xSplit"));
                            const ySplit = parseSafeInt(getXmlAttr(tag.attrs, "ySplit"));
                            if ((xSplit !== undefined && xSplit > 0) || (ySplit !== undefined && ySplit > 0)) {
                                freezePane = {};
                                if (ySplit !== undefined && ySplit > 0) {
                                    freezePane.rows = ySplit;
                                }
                                if (xSplit !== undefined && xSplit > 0) {
                                    freezePane.cols = xSplit;
                                }
                            }
                        }
                    }
                    break;
                }
                case "sheetFormatPr": {
                    defaultRowHeight = parseFiniteFloat(getXmlAttr(tag.attrs, "defaultRowHeight"));
                    defaultColWidth = parseFiniteFloat(getXmlAttr(tag.attrs, "defaultColWidth"));
                    break;
                }
                case "cols": {
                    if (!tag.selfClosing) {
                        inCols = true;
                    }
                    break;
                }
                case "col": {
                    if (inCols) {
                        const min = parseSafeInt(getXmlAttr(tag.attrs, "min"));
                        const max = parseSafeInt(getXmlAttr(tag.attrs, "max"));
                        if (min !== undefined && max !== undefined) {
                            const colSpec: ColumnSpec = { min, max };
                            const width = parseFiniteFloat(getXmlAttr(tag.attrs, "width"));
                            if (width !== undefined) {
                                colSpec.width = width;
                            }
                            if (parseOoxmlBool(getXmlAttr(tag.attrs, "hidden")) === true) {
                                colSpec.hidden = true;
                            }
                            const outlineLevel = parseSafeInt(getXmlAttr(tag.attrs, "outlineLevel"));
                            if (outlineLevel !== undefined && outlineLevel > 0) {
                                colSpec.outlineLevel = outlineLevel;
                            }
                            columns.push(colSpec);
                        }
                    }
                    break;
                }
                case "sheetData": {
                    if (!tag.selfClosing) {
                        inSheetData = true;
                    }
                    break;
                }
                case "autoFilter": {
                    if (autoFilterRef === undefined) {
                        const ref = getXmlAttr(tag.attrs, "ref");
                        if (ref) {
                            autoFilterRef = ref;
                        }
                    }
                    break;
                }
                case "mergeCells": {
                    if (!tag.selfClosing) {
                        inMergeCells = true;
                    }
                    break;
                }
                case "mergeCell": {
                    if (inMergeCells) {
                        const ref = getXmlAttr(tag.attrs, "ref");
                        if (ref) {
                            merges.push(ref);
                        }
                    }
                    break;
                }
                case "dataValidations": {
                    if (options.includeValidations && dataValidationsStart === -1) {
                        dataValidationsStart = tag.openStart;
                        if (tag.selfClosing) {
                            dataValidationsEnd = tag.openEnd;
                        }
                    }
                    break;
                }
                case "hyperlinks": {
                    if (options.includeHyperlinks && hyperlinksStart === -1) {
                        hyperlinksStart = tag.openStart;
                        if (tag.selfClosing) {
                            hyperlinksEnd = tag.openEnd;
                        }
                    }
                    break;
                }
                case "pageMargins": {
                    const margins: SheetPageMargins = {};
                    const top = parseFiniteFloat(getXmlAttr(tag.attrs, "top"));
                    const right = parseFiniteFloat(getXmlAttr(tag.attrs, "right"));
                    const bottom = parseFiniteFloat(getXmlAttr(tag.attrs, "bottom"));
                    const left = parseFiniteFloat(getXmlAttr(tag.attrs, "left"));
                    const header = parseFiniteFloat(getXmlAttr(tag.attrs, "header"));
                    const footer = parseFiniteFloat(getXmlAttr(tag.attrs, "footer"));
                    if (top !== undefined) margins.top = top;
                    if (right !== undefined) margins.right = right;
                    if (bottom !== undefined) margins.bottom = bottom;
                    if (left !== undefined) margins.left = left;
                    if (header !== undefined) margins.header = header;
                    if (footer !== undefined) margins.footer = footer;
                    if (Object.keys(margins).length > 0) {
                        pageSetup ??= {};
                        pageSetup.margins = margins;
                    }
                    break;
                }
                case "pageSetup": {
                    const orientation = getXmlAttr(tag.attrs, "orientation");
                    const paperSize = decodePaperSize(getXmlAttr(tag.attrs, "paperSize"));
                    const fitToWidth = parseSafeInt(getXmlAttr(tag.attrs, "fitToWidth"));
                    const fitToHeight = parseSafeInt(getXmlAttr(tag.attrs, "fitToHeight"));
                    if (
                        orientation === "portrait" ||
                        orientation === "landscape" ||
                        paperSize !== undefined ||
                        fitToWidth !== undefined ||
                        fitToHeight !== undefined ||
                        fitToPageFlag
                    ) {
                        pageSetup ??= {};
                        if (orientation === "portrait" || orientation === "landscape") {
                            pageSetup.orientation = orientation;
                        }
                        if (paperSize !== undefined) {
                            pageSetup.paperSize = paperSize;
                        }
                        if (fitToWidth !== undefined) {
                            pageSetup.fitToWidth = fitToWidth;
                        } else if (fitToPageFlag && fitToHeight === undefined) {
                            pageSetup.fitToWidth = 1;
                        }
                        if (fitToHeight !== undefined) {
                            pageSetup.fitToHeight = fitToHeight;
                        }
                    }
                    break;
                }
                case "tableParts": {
                    if (!tag.selfClosing) {
                        inTableParts = true;
                    }
                    break;
                }
                case "tablePart": {
                    if (inTableParts) {
                        const relId = getXmlAttr(tag.attrs, "id");
                        if (relId) {
                            tableRelIds.push(relId);
                        }
                    }
                    break;
                }
            }
        },
        onCloseTag(tag) {
            if (inSheetData) {
                if (tag.localName === "sheetData") {
                    inSheetData = false;
                    return;
                }
                if (tag.localName === "c") {
                    finalizeCurrentCell();
                    return;
                }
                if (!inCell) {
                    return;
                }
                if (tag.localName === "f") {
                    inFormula = false;
                    return;
                }
                if (tag.localName === "v") {
                    inValue = false;
                    return;
                }
                if (tag.localName === "is") {
                    inInlineStr = false;
                    return;
                }
                if (inInlineStr) {
                    if (tag.localName === "rPh" && inlinePhoneticDepth > 0) {
                        inlinePhoneticDepth -= 1;
                        return;
                    }
                    if (inlinePhoneticDepth > 0) {
                        return;
                    }
                    if (tag.localName === "t") {
                        inInlineText = false;
                        return;
                    }
                    if (tag.localName === "rPr") {
                        inInlineRPr = false;
                        return;
                    }
                    if (tag.localName === "r" && inInlineRun) {
                        inlineRuns.push({ text: inlineRunTextBuffer, ...inlineRunMeta });
                        inInlineRun = false;
                        inlineRunTextBuffer = "";
                        inlineRunMeta = {};
                    }
                }
                return;
            }

            switch (tag.localName) {
                case "sheetPr": {
                    inSheetPr = false;
                    break;
                }
                case "sheetViews": {
                    inSheetViews = false;
                    break;
                }
                case "cols": {
                    inCols = false;
                    break;
                }
                case "mergeCells": {
                    inMergeCells = false;
                    break;
                }
                case "dataValidations": {
                    if (dataValidationsStart !== -1 && dataValidationsEnd === -1) {
                        dataValidationsEnd = tag.closeEnd;
                    }
                    break;
                }
                case "hyperlinks": {
                    if (hyperlinksStart !== -1 && hyperlinksEnd === -1) {
                        hyperlinksEnd = tag.closeEnd;
                    }
                    break;
                }
                case "tableParts": {
                    inTableParts = false;
                    break;
                }
            }
        },
        onText(text) {
            if (!inCell) {
                return;
            }
            if (inFormula) {
                formulaBuffer += text;
            } else if (inValue) {
                valueBuffer += text;
            } else if (inInlineStr && inlinePhoneticDepth === 0 && inInlineText) {
                if (inInlineRun) {
                    inlineRunTextBuffer += text;
                } else {
                    inlinePlainBuffer += text;
                }
            }
        },
    });

    if (fitToPageFlag && pageSetup?.fitToWidth === undefined && pageSetup?.fitToHeight === undefined) {
        pageSetup ??= {};
        pageSetup.fitToWidth = 1;
    }

    for (const slave of pendingSlaves) {
        const master = sharedMasters.get(slave.si);
        const cell = cells.get(slave.cellRef);
        if (master && cell?.formula) {
            cell.formula.expression = translateFormulaRefs(
                master.expression,
                slave.col - master.col,
                slave.row - master.row
            );
        }
    }

    let dataValidations: DataValidationRule[] | undefined;
    if (options.includeValidations && dataValidationsStart !== -1 && dataValidationsEnd > dataValidationsStart) {
        const parsedRules = parseDataValidationsXml(sheetXml.slice(dataValidationsStart, dataValidationsEnd));
        if (parsedRules.length > 0) {
            dataValidations = parsedRules;
        }
    }

    if (options.includeHyperlinks && hyperlinksStart !== -1 && hyperlinksEnd > hyperlinksStart) {
        const parsedLinks = parseHyperlinksXml(sheetXml.slice(hyperlinksStart, hyperlinksEnd), options.sheetRels);
        const MAX_HYPERLINK_RANGE_CELLS = 1000;
        for (const item of parsedLinks) {
            let range: RangeRef;
            try {
                range = parseRangeRef(item.ref);
            } catch {
                continue;
            }
            let attached = 0;
            for (let r = range.start.row; r <= range.end.row && attached < MAX_HYPERLINK_RANGE_CELLS; r += 1) {
                for (let c = range.start.col; c <= range.end.col && attached < MAX_HYPERLINK_RANGE_CELLS; c += 1) {
                    const cellRef = formatCellRef(c, r);
                    const existing = cells.get(cellRef);
                    if (existing) {
                        existing.hyperlink = item.link;
                    } else {
                        cells.set(cellRef, {
                            value: null,
                            type: "empty",
                            hyperlink: item.link,
                        });
                    }
                    attached += 1;
                }
            }
        }
    }

    if (options.includeComments && options.sheetRels.length > 0) {
        for (const commentRel of findRelationshipsByType(options.sheetRels, "comments")) {
            attachCommentsFromPart(cells, options.entries, options.sheetPartPath, commentRel, false);
        }
        for (const threadedRel of findRelationshipsByType(options.sheetRels, "threadedComments")) {
            attachCommentsFromPart(
                cells,
                options.entries,
                options.sheetPartPath,
                threadedRel,
                true,
                options.personsXml
            );
        }
    }

    if (options.includeTables && options.sheetRels.length > 0) {
        const relById = new Map<string, PackageRelationship>();
        for (const rel of options.sheetRels) {
            relById.set(rel.id, rel);
        }
        const tableRelsToLoad: PackageRelationship[] =
            tableRelIds.length > 0
                ? tableRelIds.map((id) => relById.get(id)).filter((r): r is PackageRelationship => r !== undefined)
                : findRelationshipsByType(options.sheetRels, "table");

        for (const tableRel of tableRelsToLoad) {
            const tablePath = resolvePackageTarget(options.sheetPartPath, tableRel.target);
            const tableEntry = findPackageEntry(options.entries, tablePath);
            if (tableEntry) {
                const spec = parseTableXml(decodeUtf8(tableEntry.bytes), sheetName);
                if (spec) {
                    options.tablesOut.push(spec);
                }
            }
        }
    }

    const sheetModel: WorksheetModel = {
        name: sheetName,
        state: sheetState ?? "visible",
        cells,
    };
    if (rowsMeta.size > 0) {
        sheetModel.rowsMeta = rowsMeta;
    }
    if (columns.length > 0) {
        sheetModel.columns = columns;
    }
    if (merges.length > 0) {
        sheetModel.merges = merges;
    }
    if (freezePane) {
        sheetModel.freezePane = freezePane;
    }
    if (autoFilterRef) {
        sheetModel.autoFilterRef = autoFilterRef;
    }
    if (dataValidations) {
        sheetModel.dataValidations = dataValidations;
    }
    if (showGridLines !== undefined) {
        sheetModel.showGridLines = showGridLines;
    }
    if (tabColor) {
        sheetModel.tabColor = tabColor;
    }
    if (pageSetup) {
        sheetModel.pageSetup = pageSetup;
    }
    if (defaultRowHeight !== undefined) {
        sheetModel.defaultRowHeight = defaultRowHeight;
    }
    if (defaultColWidth !== undefined) {
        sheetModel.defaultColWidth = defaultColWidth;
    }
    return sheetModel;
}

export function readXlsxBytes(bytes: Uint8Array | ArrayBuffer, options?: ReadXlsxOptions): WorkbookModel {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (isOle2CfbMagic(u8)) {
        throw new ExcelError("UNSUPPORTED_FORMAT", "Legacy BIFF8/OLE2 (.xls) format is not supported.");
    }

    const entries = extractOoxmlPackage(u8, {
        maxUncompressedBytes: options?.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES,
        maxEntryBytes: options?.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES,
        maxEntryCount: options?.maxEntryCount ?? DEFAULT_MAX_ENTRY_COUNT,
    });

    const mimetypeEntry = findPackageEntry(entries, "mimetype");
    if (mimetypeEntry) {
        const mime = decodeUtf8(mimetypeEntry.bytes).trim();
        if (mime.startsWith("application/vnd.oasis.opendocument")) {
            throw new ExcelError("UNSUPPORTED_FORMAT", "OpenDocument Spreadsheet (.ods) format is not supported.");
        }
    }

    if (findPackageEntry(entries, "xl/workbook.bin")) {
        throw new ExcelError("UNSUPPORTED_FORMAT", "Binary Excel workbook (.xlsb) format is not supported.");
    }

    const workbookPath = resolveWorkbookPartPath(entries);
    if (workbookPath.toLowerCase().endsWith(".bin")) {
        throw new ExcelError("UNSUPPORTED_FORMAT", "Binary Excel workbook (.xlsb) format is not supported.");
    }

    const workbookEntry = findPackageEntry(entries, workbookPath);
    if (!workbookEntry) {
        throw new ExcelError("CORRUPT_ARCHIVE", `Workbook part "${workbookPath}" was not found in archive.`);
    }

    const sourceFormat = detectSourceFormat(entries, workbookEntry.path);
    const workbookXml = decodeUtf8(workbookEntry.bytes);
    const wbRoot = parseXmlTree(workbookXml);
    if (!wbRoot) {
        throw new ExcelError("CORRUPT_XML", "Workbook XML does not contain a root element.");
    }

    const wbPrEl = findXmlChild(wbRoot, "workbookPr");
    const date1904 = wbPrEl !== undefined && parseOoxmlBool(getXmlAttr(wbPrEl.attrs, "date1904")) === true;
    const dateSystem: ExcelDateSystem = date1904 ? 1904 : 1900;

    const wbRelsEntry = findPackageEntry(entries, getRelsPathForPart(workbookEntry.path));
    const wbRels = wbRelsEntry ? parseRelationshipsXml(decodeUtf8(wbRelsEntry.bytes)) : [];
    const wbRelById = new Map<string, PackageRelationship>();
    for (const rel of wbRels) {
        wbRelById.set(rel.id, rel);
    }

    const themeRel = findRelationshipsByType(wbRels, "theme")[0];
    const themeEntry = themeRel
        ? findPackageEntry(entries, resolvePackageTarget(workbookEntry.path, themeRel.target))
        : undefined;
    const themeColors = themeEntry ? parseThemeColorsXml(decodeUtf8(themeEntry.bytes)) : DEFAULT_THEME_COLORS;

    const stylesRel = findRelationshipsByType(wbRels, "styles")[0];
    const stylesEntry = stylesRel
        ? findPackageEntry(entries, resolvePackageTarget(workbookEntry.path, stylesRel.target))
        : undefined;
    const parsedStyles = stylesEntry ? parseStylesXml(decodeUtf8(stylesEntry.bytes), themeColors) : undefined;

    const sstRel = findRelationshipsByType(wbRels, "sharedStrings")[0];
    const sstEntry = sstRel
        ? findPackageEntry(entries, resolvePackageTarget(workbookEntry.path, sstRel.target))
        : undefined;
    const sharedStrings = sstEntry
        ? createSharedStringsReader(decodeUtf8(sstEntry.bytes), {
              resolveColor: (attrs) => resolveOoxmlColor(attrs, themeColors),
          })
        : undefined;

    const personRel = findRelationshipsByType(wbRels, "person")[0];
    const personEntry = personRel
        ? findPackageEntry(entries, resolvePackageTarget(workbookEntry.path, personRel.target))
        : undefined;
    const personsXml = personEntry ? decodeUtf8(personEntry.bytes) : undefined;

    const sheetsContainer = findXmlChild(wbRoot, "sheets");
    const sheetElements = sheetsContainer ? findXmlChildren(sheetsContainer, "sheet") : [];

    const maxSheets = options?.maxSheets ?? DEFAULT_MAX_SHEETS;
    const maxCells = options?.maxCells ?? DEFAULT_MAX_CELLS;

    interface PendingSheetDescriptor {
        originalIndex: number;
        name: string;
        state: SheetVisibilityState;
        relId: string | undefined;
    }

    const selectedSheets: PendingSheetDescriptor[] = [];
    for (const [originalIndex, sheetEl] of sheetElements.entries()) {
        const name = getXmlAttr(sheetEl.attrs, "name");
        if (!name || !matchesSheetFilter(name, options?.sheetFilter)) {
            continue;
        }
        const rawState = getXmlAttr(sheetEl.attrs, "state");
        const state: SheetVisibilityState =
            rawState && VISIBILITY_STATE_SET.has(rawState) ? (rawState as SheetVisibilityState) : "visible";
        const relId = getXmlAttr(sheetEl.attrs, "id");
        selectedSheets.push({ originalIndex, name, state, relId });
    }

    if (selectedSheets.length > maxSheets) {
        throw new ExcelError("LIMIT_EXCEEDED", `Workbook exceeds maxSheets (${maxSheets}).`, {
            details: { sheetCount: selectedSheets.length, maxSheets },
        });
    }

    const includeStyles = options?.includeStyles ?? true;
    const includeComments = options?.includeComments ?? true;
    const includeValidations = options?.includeValidations ?? true;
    const includeHyperlinks = options?.includeHyperlinks ?? true;
    const includeTables = options?.includeTables ?? true;

    const cellCounter = { count: 0, maxCells };
    const tablesOut: ExcelTableSpec[] = [];
    const sheets: WorksheetModel[] = [];
    const originalIndexToSheet = new Map<number, WorksheetModel>();
    const originalIndexToFilteredIndex = new Map<number, number>();

    for (const desc of selectedSheets) {
        const rel = desc.relId ? wbRelById.get(desc.relId) : undefined;
        const sheetPartPath = resolvePackageTarget(
            workbookEntry.path,
            rel ? rel.target : `worksheets/sheet${desc.originalIndex + 1}.xml`
        );
        const sheetEntry = findPackageEntry(entries, sheetPartPath);
        if (!sheetEntry) {
            throw new ExcelError(
                "CORRUPT_ARCHIVE",
                `Worksheet part "${sheetPartPath}" for sheet "${desc.name}" is missing from archive.`,
                { details: { sheetName: desc.name, path: sheetPartPath } }
            );
        }

        const sheetRelsEntry = findPackageEntry(entries, getRelsPathForPart(sheetEntry.path));
        const sheetRels = sheetRelsEntry ? parseRelationshipsXml(decodeUtf8(sheetRelsEntry.bytes)) : [];

        const parsedSheet = parseWorksheetXml(decodeUtf8(sheetEntry.bytes), desc.name, desc.state, {
            dateSystem,
            themeColors,
            parsedStyles,
            sharedStrings,
            includeStyles,
            includeValidations,
            includeHyperlinks,
            includeComments,
            includeTables,
            sheetRels,
            sheetPartPath: sheetEntry.path,
            entries,
            personsXml,
            cellCounter,
            tablesOut,
        });

        const filteredIndex = sheets.length;
        sheets.push(parsedSheet);
        originalIndexToSheet.set(desc.originalIndex, parsedSheet);
        originalIndexToFilteredIndex.set(desc.originalIndex, filteredIndex);
    }

    const rawDefinedNames = parseDefinedNamesXml(workbookXml);
    applyPrintDefinedNamesToSheets(rawDefinedNames, originalIndexToSheet);

    const remappedDefinedNames: DefinedNameSpec[] = [];
    for (const dn of rawDefinedNames) {
        if (dn.localSheetId === undefined) {
            remappedDefinedNames.push(dn);
        } else {
            const mappedIdx = originalIndexToFilteredIndex.get(dn.localSheetId);
            if (mappedIdx !== undefined) {
                remappedDefinedNames.push({ ...dn, localSheetId: mappedIdx });
            }
        }
    }

    const workbookModel: WorkbookModel = {
        dateSystem,
        sheets,
        sourceFormat,
    };
    if (includeTables && tablesOut.length > 0) {
        workbookModel.tables = tablesOut;
    }
    if (remappedDefinedNames.length > 0) {
        workbookModel.definedNames = remappedDefinedNames;
    }
    return workbookModel;
}

function validateWorkbookSheets(sheets: readonly WorksheetModel[]): void {
    if (!Array.isArray(sheets) || sheets.length === 0) {
        throw new ExcelError("INVALID_CONFIG", "Workbook must contain at least one worksheet.");
    }

    const seenLowerNames = new Set<string>();
    for (const sheet of sheets) {
        const name = sheet.name;
        if (typeof name !== "string" || name.length === 0) {
            throw new ExcelError("INVALID_CONFIG", "Worksheet name must be a non-empty string.");
        }
        if (name.length > 31) {
            throw new ExcelError("INVALID_CONFIG", `Worksheet name "${name}" exceeds Excel's 31-character limit.`, {
                details: { sheetName: name },
            });
        }
        if (FORBIDDEN_SHEET_NAME_CHARS_RE.test(name)) {
            throw new ExcelError(
                "INVALID_CONFIG",
                String.raw`Worksheet name "${name}" contains forbidden Excel characters (\ / ? * [ ] :).`,
                { details: { sheetName: name } }
            );
        }
        if (name.startsWith("'") || name.endsWith("'")) {
            throw new ExcelError(
                "INVALID_CONFIG",
                `Worksheet name "${name}" cannot start or end with a single quote (').`,
                { details: { sheetName: name } }
            );
        }
        const lower = name.toLowerCase();
        if (seenLowerNames.has(lower)) {
            throw new ExcelError(
                "INVALID_CONFIG",
                `Duplicate worksheet name "${name}" (Excel sheet names are case-insensitive).`,
                { details: { sheetName: name } }
            );
        }
        seenLowerNames.add(lower);
    }
}

function sanitizeStringIfFormulaTrigger(value: string, enabled: boolean): string {
    if (!enabled || value.length === 0) {
        return value;
    }
    return FORMULA_INJECTION_TRIGGER_RE.test(value) ? `'${value}` : value;
}

function sanitizeRichRunsIfFormulaTrigger(
    runs: readonly CellRichTextRun[],
    enabled: boolean
): readonly CellRichTextRun[] {
    if (!enabled || runs.length === 0) {
        return runs;
    }
    const first = runs[0];
    if (!first || !FORMULA_INJECTION_TRIGGER_RE.test(first.text)) {
        return runs;
    }
    return [{ ...first, text: `'${first.text}` }, ...runs.slice(1)];
}

function serializeInlineRichRunsXml(runs: readonly CellRichTextRun[], prefix = ""): string {
    const parts: string[] = [];
    for (const run of runs) {
        const rPr: string[] = [];
        if (run.bold) {
            rPr.push(`<${prefix}b/>`);
        }
        if (run.italic) {
            rPr.push(`<${prefix}i/>`);
        }
        if (run.fontSize !== undefined && Number.isFinite(run.fontSize)) {
            rPr.push(`<${prefix}sz val="${run.fontSize}"/>`);
        }
        if (run.fg) {
            rPr.push(`<${prefix}color rgb="${escapeXmlAttr(toOoxmlArgbAttr(run.fg))}"/>`);
        }
        if (run.fontFamily) {
            rPr.push(`<${prefix}rFont val="${escapeXmlAttr(run.fontFamily)}"/>`);
        }
        const rPrXml = rPr.length > 0 ? `<${prefix}rPr>${rPr.join("")}</${prefix}rPr>` : "";
        parts.push(
            `<${prefix}r>${rPrXml}<${prefix}t${xmlSpaceAttr(run.text)}>${escapeXmlText(run.text)}</${prefix}t></${prefix}r>`
        );
    }
    return parts.join("");
}

function computeCellBoundingDimension(coords: ReadonlyArray<{ col: number; row: number }>): string {
    if (coords.length === 0) {
        return "A1";
    }
    let minCol = Infinity;
    let minRow = Infinity;
    let maxCol = -Infinity;
    let maxRow = -Infinity;
    for (const c of coords) {
        if (c.col < minCol) minCol = c.col;
        if (c.row < minRow) minRow = c.row;
        if (c.col > maxCol) maxCol = c.col;
        if (c.row > maxRow) maxRow = c.row;
    }
    if (minCol === maxCol && minRow === maxRow) {
        return formatCellRef(minCol, minRow);
    }
    return `${formatCellRef(minCol, minRow)}:${formatCellRef(maxCol, maxRow)}`;
}

function serializeColsSectionXml(columns: readonly ColumnSpec[] | undefined, prefix = ""): string {
    if (!columns || columns.length === 0) {
        return "";
    }
    const parts: string[] = [`<${prefix}cols>`];
    for (const col of columns) {
        const attrs: string[] = [`min="${col.min}"`, `max="${col.max}"`];
        if (col.width !== undefined && Number.isFinite(col.width)) {
            attrs.push(`width="${col.width}"`, 'customWidth="1"');
        } else {
            attrs.push('width="10"');
        }
        if (col.hidden) {
            attrs.push('hidden="1"');
        }
        if (col.outlineLevel !== undefined && col.outlineLevel > 0) {
            attrs.push(`outlineLevel="${col.outlineLevel}"`);
        }
        parts.push(`<${prefix}col ${attrs.join(" ")}/>`);
    }
    parts.push(`</${prefix}cols>`);
    return parts.join("");
}

function synthesizeWorkbookDefinedNames(workbook: WorkbookModel): DefinedNameSpec[] {
    const result: DefinedNameSpec[] = [...(workbook.definedNames ?? [])];

    for (const [sheetIdx, sheet] of workbook.sheets.entries()) {
        const ps = sheet.pageSetup;
        if (!ps) {
            continue;
        }
        const quotedSheet = `'${sheet.name.replaceAll("'", "''")}'`;

        if (ps.printTitleRows || ps.printTitleCols) {
            const hasExisting = result.some(
                (dn) => dn.localSheetId === sheetIdx && dn.name.toLowerCase() === "_xlnm.print_titles"
            );
            if (!hasExisting) {
                const parts: string[] = [];
                if (ps.printTitleRows) {
                    const cleanRows = stripSheetPrefixFromRef(ps.printTitleRows.trim()).replaceAll("$", "");
                    const [r1, r2] = cleanRows.split(":", 2);
                    if (r1) {
                        parts.push(`${quotedSheet}!$${r1}:$${r2 ?? r1}`);
                    }
                }
                if (ps.printTitleCols) {
                    const cleanCols = stripSheetPrefixFromRef(ps.printTitleCols.trim())
                        .replaceAll("$", "")
                        .toUpperCase();
                    const [c1, c2] = cleanCols.split(":", 2);
                    if (c1) {
                        parts.push(`${quotedSheet}!$${c1}:$${c2 ?? c1}`);
                    }
                }
                if (parts.length > 0) {
                    result.push({
                        name: "_xlnm.Print_Titles",
                        localSheetId: sheetIdx,
                        formula: parts.join(","),
                    });
                }
            }
        }

        if (ps.printArea) {
            const hasExisting = result.some(
                (dn) => dn.localSheetId === sheetIdx && dn.name.toLowerCase() === "_xlnm.print_area"
            );
            if (!hasExisting) {
                const parsed = parseSheetQualifiedRef(ps.printArea.trim());
                const startRef = formatCellRef(parsed.range.start.col, parsed.range.start.row, {
                    colAbsolute: true,
                    rowAbsolute: true,
                });
                const endRef = formatCellRef(parsed.range.end.col, parsed.range.end.row, {
                    colAbsolute: true,
                    rowAbsolute: true,
                });
                const rangeFormula =
                    startRef === endRef ? `${quotedSheet}!${startRef}` : `${quotedSheet}!${startRef}:${endRef}`;
                result.push({
                    name: "_xlnm.Print_Area",
                    localSheetId: sheetIdx,
                    formula: rangeFormula,
                });
            }
        }
    }

    return result;
}

function serializeWorksheetCellForWrite(
    ref: string,
    cell: CellModel,
    options: {
        styleRegistry: StyleRegistry;
        sstWriter?: SharedStringsWriter;
        sanitizeFormulaInjection: boolean;
        dateSystem: ExcelDateSystem;
    }
): string | null {
    const isDateVal = cell.value instanceof Date && !Number.isNaN(cell.value.getTime());
    const cachedDate =
        cell.formula?.cachedResult instanceof Date && !Number.isNaN(cell.formula.cachedResult.getTime())
            ? cell.formula.cachedResult
            : undefined;
    const dateForFmt = isDateVal ? (cell.value as Date) : cachedDate;

    let effectiveStyle = cell.style;
    if (dateForFmt && !effectiveStyle?.numFmt) {
        effectiveStyle = {
            ...effectiveStyle,
            numFmt: defaultDateNumFmtForDate(dateForFmt),
        };
    }
    const styleIdx = effectiveStyle ? options.styleRegistry.register(effectiveStyle) : 0;
    const sAttr = styleIdx > 0 ? ` s="${styleIdx}"` : "";

    if (cell.formula) {
        const rawExpr = cell.formula.expression.trim();
        const cleanExpr = rawExpr.startsWith("=") ? rawExpr.slice(1) : rawExpr;
        const fAttrs: string[] = [];
        if (cell.formula.kind && cell.formula.kind !== "normal") {
            fAttrs.push(`t="${cell.formula.kind}"`);
        }
        if (cell.formula.ref) {
            fAttrs.push(`ref="${escapeXmlAttr(cell.formula.ref)}"`);
        }
        if (cell.formula.sharedGroup !== undefined) {
            fAttrs.push(`si="${cell.formula.sharedGroup}"`);
        }
        const fAttrStr = fAttrs.length > 0 ? ` ${fAttrs.join(" ")}` : "";
        const isSharedSlave =
            cell.formula.kind === "shared" && !cell.formula.ref && cell.formula.sharedGroup !== undefined;
        const fXml = isSharedSlave ? `<f${fAttrStr}/>` : `<f${fAttrStr}>${escapeXmlText(cleanExpr)}</f>`;

        let cached: CellScalar | string =
            cell.formula.cachedResult === undefined ? cell.value : cell.formula.cachedResult;
        if (cell.type === "error" && typeof cell.value === "string") {
            cached = cell.value;
        }
        if (cell.formula.error !== undefined) {
            cached = cell.formula.error;
        }

        if (
            cell.formula.error !== undefined ||
            cell.type === "error" ||
            (typeof cached === "string" && isExcelErrorValue(cached))
        ) {
            const errStr = String(cached ?? "#VALUE!");
            return `<c r="${ref}"${sAttr} t="e">${fXml}<v>${escapeXmlText(errStr)}</v></c>`;
        }
        if (typeof cached === "number" && Number.isFinite(cached)) {
            return `<c r="${ref}"${sAttr}>${fXml}<v>${cached}</v></c>`;
        }
        if (cached instanceof Date && !Number.isNaN(cached.getTime())) {
            const serial = isoDateToExcelSerial(cached, options.dateSystem);
            return `<c r="${ref}"${sAttr}>${fXml}<v>${serial}</v></c>`;
        }
        if (typeof cached === "boolean") {
            return `<c r="${ref}"${sAttr} t="b">${fXml}<v>${cached ? "1" : "0"}</v></c>`;
        }
        if (typeof cached === "string") {
            return `<c r="${ref}"${sAttr} t="str">${fXml}<v${xmlSpaceAttr(cached)}>${escapeXmlText(cached)}</v></c>`;
        }
        return `<c r="${ref}"${sAttr}>${fXml}</c>`;
    }

    if (cell.richText && cell.richText.length > 0) {
        const runs = sanitizeRichRunsIfFormulaTrigger(cell.richText, options.sanitizeFormulaInjection);
        if (options.sstWriter) {
            const idx = options.sstWriter.addRichText(runs);
            return `<c r="${ref}"${sAttr} t="s"><v>${idx}</v></c>`;
        }
        return `<c r="${ref}"${sAttr} t="inlineStr"><is>${serializeInlineRichRunsXml(runs)}</is></c>`;
    }

    if (cell.type === "error") {
        const errText = typeof cell.value === "string" && cell.value.length > 0 ? cell.value : "#VALUE!";
        return `<c r="${ref}"${sAttr} t="e"><v>${escapeXmlText(errText)}</v></c>`;
    }

    if (cell.value instanceof Date) {
        if (!Number.isNaN(cell.value.getTime())) {
            const serial = isoDateToExcelSerial(cell.value, options.dateSystem);
            return `<c r="${ref}"${sAttr}><v>${serial}</v></c>`;
        }
        return styleIdx > 0 || cell.hyperlink ? `<c r="${ref}"${sAttr}/>` : null;
    }

    if (typeof cell.value === "number") {
        if (Number.isFinite(cell.value)) {
            return `<c r="${ref}"${sAttr}><v>${cell.value}</v></c>`;
        }
        return styleIdx > 0 || cell.hyperlink ? `<c r="${ref}"${sAttr}/>` : null;
    }

    if (typeof cell.value === "boolean") {
        return `<c r="${ref}"${sAttr} t="b"><v>${cell.value ? "1" : "0"}</v></c>`;
    }

    if (typeof cell.value === "string") {
        const strVal = sanitizeStringIfFormulaTrigger(cell.value, options.sanitizeFormulaInjection);
        if (options.sstWriter) {
            const idx = options.sstWriter.addString(strVal);
            return `<c r="${ref}"${sAttr} t="s"><v>${idx}</v></c>`;
        }
        return `<c r="${ref}"${sAttr} t="inlineStr"><is><t${xmlSpaceAttr(strVal)}>${escapeXmlText(strVal)}</t></is></c>`;
    }

    return styleIdx > 0 || cell.hyperlink ? `<c r="${ref}"${sAttr}/>` : null;
}

export function writeXlsxBytes(workbook: WorkbookModel, options?: WriteXlsxOptions): Uint8Array {
    validateWorkbookSheets(workbook.sheets);

    const useSharedStrings = options?.useSharedStrings ?? true;
    const sanitizeFormulaInjection = options?.sanitizeFormulaInjection ?? false;
    const compressionLevel = options?.compressionLevel ?? 6;
    const dateSystem: ExcelDateSystem = workbook.dateSystem === 1904 ? 1904 : 1900;

    const styleRegistry = createStyleRegistry();
    const sstWriter = useSharedStrings ? createSharedStringsWriter() : undefined;
    const entries: Record<string, Uint8Array> = {};
    const wbRels: PackageRelationship[] = [];

    for (const [sheetIdx, sheet] of workbook.sheets.entries()) {
        const sheetNumber = sheetIdx + 1;
        const sheetRelId = `rId${sheetNumber}`;
        const sheetPartPath = `xl/worksheets/sheet${sheetNumber}.xml`;
        wbRels.push({
            id: sheetRelId,
            type: WORKSHEET_REL_TYPE,
            target: `worksheets/sheet${sheetNumber}.xml`,
        });

        interface IndexedCellEntry {
            col: number;
            row: number;
            ref: string;
            cell: CellModel;
        }

        const rowsMap = new Map<number, IndexedCellEntry[]>();
        const allCoords: Array<{ col: number; row: number }> = [];
        const hyperlinkEntries: Array<{ ref: string; link: CellHyperlink }> = [];

        for (const [rawRef, cell] of sheet.cells) {
            const parsed = parseCellRef(rawRef);
            const normRef = formatCellRef(parsed.col, parsed.row);
            const row1Based = parsed.row + 1;
            let list = rowsMap.get(row1Based);
            if (!list) {
                list = [];
                rowsMap.set(row1Based, list);
            }
            list.push({ col: parsed.col, row: parsed.row, ref: normRef, cell });
            allCoords.push({ col: parsed.col, row: parsed.row });
        }

        const rowIndicesSet = new Set<number>(rowsMap.keys());
        if (sheet.rowsMeta) {
            for (const rowIdx of sheet.rowsMeta.keys()) {
                if (Number.isSafeInteger(rowIdx) && rowIdx >= 1) {
                    rowIndicesSet.add(rowIdx);
                }
            }
        }
        const sortedRowIndices = [...rowIndicesSet].toSorted((a, b) => a - b);

        for (const row1Based of sortedRowIndices) {
            const rowCells = rowsMap.get(row1Based);
            if (rowCells) {
                rowCells.sort((a, b) => a.col - b.col);
                for (const entry of rowCells) {
                    if (entry.cell.hyperlink) {
                        hyperlinkEntries.push({ ref: entry.ref, link: entry.cell.hyperlink });
                    }
                }
            }
        }

        const { xml: hyperlinksXml, relationships: hlRels } = serializeHyperlinksXml(hyperlinkEntries, 1);
        if (hlRels.length > 0) {
            entries[getRelsPathForPart(sheetPartPath)] = encodeUtf8(serializeRelationshipsXml(hlRels));
        }

        const writer = createChunkedXmlWriter(5000);
        writer.write('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
        writer.write(`<worksheet xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">`);

        // 1. sheetPr
        const hasFitToPage = sheet.pageSetup?.fitToWidth !== undefined || sheet.pageSetup?.fitToHeight !== undefined;
        if (sheet.tabColor || hasFitToPage) {
            const tabColorXml = sheet.tabColor
                ? `<tabColor rgb="${escapeXmlAttr(toOoxmlArgbAttr(sheet.tabColor))}"/>`
                : "";
            const pageSetUpPrXml = hasFitToPage ? '<pageSetUpPr fitToPage="1"/>' : "";
            writer.write(`<sheetPr>${tabColorXml}${pageSetUpPrXml}</sheetPr>`);
        }

        // 2. dimension
        writer.write(`<dimension ref="${computeCellBoundingDimension(allCoords)}"/>`);

        // 3. sheetViews
        const xSplit = sheet.freezePane?.cols !== undefined && sheet.freezePane.cols > 0 ? sheet.freezePane.cols : 0;
        const ySplit = sheet.freezePane?.rows !== undefined && sheet.freezePane.rows > 0 ? sheet.freezePane.rows : 0;
        const showGridAttr = sheet.showGridLines === false ? ' showGridLines="0"' : "";
        if (xSplit > 0 || ySplit > 0) {
            const topLeftCell = formatCellRef(xSplit, ySplit);
            const activePane = xSplit > 0 && ySplit > 0 ? "bottomRight" : ySplit > 0 ? "bottomLeft" : "topRight";
            const paneAttrs: string[] = [];
            if (xSplit > 0) paneAttrs.push(`xSplit="${xSplit}"`);
            if (ySplit > 0) paneAttrs.push(`ySplit="${ySplit}"`);
            paneAttrs.push(`topLeftCell="${topLeftCell}"`, `activePane="${activePane}"`, 'state="frozen"');
            writer.write(
                `<sheetViews><sheetView workbookViewId="0"${showGridAttr}><pane ${paneAttrs.join(" ")}/></sheetView></sheetViews>`
            );
        } else {
            writer.write(`<sheetViews><sheetView workbookViewId="0"${showGridAttr}/></sheetViews>`);
        }

        // 4. sheetFormatPr
        const defaultColWidthAttr =
            sheet.defaultColWidth !== undefined && Number.isFinite(sheet.defaultColWidth)
                ? ` defaultColWidth="${sheet.defaultColWidth}"`
                : "";
        const defaultRowHeight =
            sheet.defaultRowHeight !== undefined && Number.isFinite(sheet.defaultRowHeight)
                ? sheet.defaultRowHeight
                : 15;
        writer.write(`<sheetFormatPr${defaultColWidthAttr} defaultRowHeight="${defaultRowHeight}"/>`);

        // 5. cols
        const colsXml = serializeColsSectionXml(sheet.columns);
        if (colsXml.length > 0) {
            writer.write(colsXml);
        }

        // 6. sheetData
        if (sortedRowIndices.length === 0) {
            writer.write("<sheetData/>");
        } else {
            writer.write("<sheetData>");
            for (const row1Based of sortedRowIndices) {
                const meta = sheet.rowsMeta?.get(row1Based);
                const rowAttrs: string[] = [`r="${row1Based}"`];
                if (meta?.height !== undefined && Number.isFinite(meta.height)) {
                    rowAttrs.push(`ht="${meta.height}"`, 'customHeight="1"');
                }
                if (meta?.hidden) {
                    rowAttrs.push('hidden="1"');
                }
                if (meta?.outlineLevel !== undefined && meta.outlineLevel > 0) {
                    rowAttrs.push(`outlineLevel="${meta.outlineLevel}"`);
                }
                if (meta?.collapsed) {
                    rowAttrs.push('collapsed="1"');
                }

                const rowCells = rowsMap.get(row1Based) ?? [];
                const cellXmlParts: string[] = [];
                for (const { ref, cell } of rowCells) {
                    const serializedCell = serializeWorksheetCellForWrite(ref, cell, {
                        styleRegistry,
                        sstWriter,
                        sanitizeFormulaInjection,
                        dateSystem,
                    });
                    if (serializedCell !== null) {
                        cellXmlParts.push(serializedCell);
                    }
                }

                if (cellXmlParts.length > 0) {
                    writer.write(`<row ${rowAttrs.join(" ")}>${cellXmlParts.join("")}</row>`);
                } else {
                    writer.write(`<row ${rowAttrs.join(" ")}/>`);
                }
                writer.markRowBoundary();
            }
            writer.write("</sheetData>");
        }

        // 7. autoFilter
        if (sheet.autoFilterRef) {
            writer.write(`<autoFilter ref="${escapeXmlAttr(sheet.autoFilterRef)}"/>`);
        }

        // 8. mergeCells
        if (sheet.merges && sheet.merges.length > 0) {
            writer.write(
                `<mergeCells count="${sheet.merges.length}">${sheet.merges
                    .map((m) => `<mergeCell ref="${escapeXmlAttr(m)}"/>`)
                    .join("")}</mergeCells>`
            );
        }

        // 9. dataValidations
        if (sheet.dataValidations && sheet.dataValidations.length > 0) {
            writer.write(serializeDataValidationsXml(sheet.dataValidations));
        }

        // 10. hyperlinks
        if (hyperlinksXml.length > 0) {
            writer.write(hyperlinksXml);
        }

        // 11. pageMargins
        if (sheet.pageSetup?.margins) {
            const m = sheet.pageSetup.margins;
            const left = m.left ?? 0.7;
            const right = m.right ?? 0.7;
            const top = m.top ?? 0.75;
            const bottom = m.bottom ?? 0.75;
            const header = m.header ?? 0.3;
            const footer = m.footer ?? 0.3;
            writer.write(
                `<pageMargins left="${left}" right="${right}" top="${top}" bottom="${bottom}" header="${header}" footer="${footer}"/>`
            );
        }

        // 12. pageSetup
        if (sheet.pageSetup) {
            const ps = sheet.pageSetup;
            const psAttrs: string[] = [];
            const paperCode = encodePaperSize(ps.paperSize);
            if (paperCode !== undefined) {
                psAttrs.push(`paperSize="${paperCode}"`);
            }
            if (ps.orientation === "portrait" || ps.orientation === "landscape") {
                psAttrs.push(`orientation="${ps.orientation}"`);
            }
            if (ps.fitToWidth !== undefined && Number.isSafeInteger(ps.fitToWidth)) {
                psAttrs.push(`fitToWidth="${ps.fitToWidth}"`);
            }
            if (ps.fitToHeight !== undefined && Number.isSafeInteger(ps.fitToHeight)) {
                psAttrs.push(`fitToHeight="${ps.fitToHeight}"`);
            }
            if (psAttrs.length > 0) {
                writer.write(`<pageSetup ${psAttrs.join(" ")}/>`);
            }
        }

        writer.write("</worksheet>");
        entries[sheetPartPath] = writer.toUint8Array();
    }

    const stylesRelId = `rId${wbRels.length + 1}`;
    wbRels.push({
        id: stylesRelId,
        type: STYLES_REL_TYPE,
        target: "styles.xml",
    });
    entries["xl/styles.xml"] = encodeUtf8(styleRegistry.toXml());

    const hasSharedStrings = sstWriter !== undefined && sstWriter.getCount() > 0;
    if (sstWriter && hasSharedStrings) {
        const sstRelId = `rId${wbRels.length + 1}`;
        wbRels.push({
            id: sstRelId,
            type: SHARED_STRINGS_REL_TYPE,
            target: "sharedStrings.xml",
        });
        entries["xl/sharedStrings.xml"] = sstWriter.toUint8Array();
    }

    const synthesizedDefinedNames = synthesizeWorkbookDefinedNames(workbook);
    const sheetsXml = workbook.sheets
        .map((sheet, idx) => {
            const stateAttr = sheet.state && sheet.state !== "visible" ? ` state="${escapeXmlAttr(sheet.state)}"` : "";
            return `<sheet name="${escapeXmlAttr(sheet.name)}" sheetId="${idx + 1}"${stateAttr} r:id="rId${idx + 1}"/>`;
        })
        .join("");

    const workbookXml =
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        `<workbook xmlns="${SPREADSHEET_NS}" xmlns:r="${OFFICE_REL_NS}">` +
        `<workbookPr${dateSystem === 1904 ? ' date1904="1"' : ""}/>` +
        `<sheets>${sheetsXml}</sheets>` +
        serializeDefinedNamesXml(synthesizedDefinedNames) +
        "</workbook>";

    entries["xl/workbook.xml"] = encodeUtf8(workbookXml);
    entries["xl/_rels/workbook.xml.rels"] = encodeUtf8(serializeRelationshipsXml(wbRels));
    entries["_rels/.rels"] = encodeUtf8(
        serializeRelationshipsXml([
            {
                id: "rId1",
                type: OFFICE_DOC_REL_TYPE,
                target: "xl/workbook.xml",
            },
        ])
    );

    const isTemplate =
        !options?.convertTemplateToWorkbook && (workbook.sourceFormat === "xltx" || workbook.sourceFormat === "xltm");
    const workbookContentType = isTemplate ? TEMPLATE_MAIN_CT : SHEET_MAIN_CT;

    const overrides = [
        { partName: "/xl/workbook.xml", contentType: workbookContentType },
        ...workbook.sheets.map((_, idx) => ({
            partName: `/xl/worksheets/sheet${idx + 1}.xml`,
            contentType: WORKSHEET_CT,
        })),
        { partName: "/xl/styles.xml", contentType: STYLES_CT },
    ];
    if (hasSharedStrings) {
        overrides.push({
            partName: "/xl/sharedStrings.xml",
            contentType: SHARED_STRINGS_CT,
        });
    }

    entries["[Content_Types].xml"] = encodeUtf8(
        serializeContentTypesXml({
            defaults: [
                { extension: "rels", contentType: RELS_CT },
                { extension: "xml", contentType: "application/xml" },
            ],
            overrides,
        })
    );

    return packOoxmlPackage(entries, compressionLevel);
}

export function readNamedTable(
    workbook: WorkbookModel,
    tableName: string
): {
    table: ExcelTableSpec;
    sheet: WorksheetModel;
    range: RangeRef;
    records: Array<Record<string, CellScalar>>;
} | null {
    if (!workbook.tables || typeof tableName !== "string" || tableName.trim().length === 0) {
        return null;
    }
    const targetLower = tableName.trim().toLowerCase();
    const table = workbook.tables.find(
        (t) =>
            t.name.toLowerCase() === targetLower ||
            (t.displayName !== undefined && t.displayName.toLowerCase() === targetLower)
    );
    if (!table) {
        return null;
    }

    const sheet =
        workbook.sheets.find((s) => s.name === table.sheetName) ??
        workbook.sheets.find((s) => s.name.toLowerCase() === table.sheetName.toLowerCase());
    if (!sheet) {
        return null;
    }

    const range = parseSheetQualifiedRef(table.ref).range;
    const headerRowCount = table.headerRowCount ?? 1;
    const totalsRowCount = table.totalsRowCount ?? 0;

    const colCount = range.end.col - range.start.col + 1;
    const colNames: string[] = [];
    for (let c = 0; c < colCount; c += 1) {
        const specCol = table.columns[c];
        if (specCol?.name) {
            colNames.push(specCol.name);
            continue;
        }
        if (headerRowCount > 0) {
            const headerCell = getCell(sheet, formatCellRef(range.start.col + c, range.start.row));
            if (headerCell && headerCell.value !== null && headerCell.value !== undefined) {
                colNames.push(String(headerCell.value));
                continue;
            }
        }
        colNames.push(colToLetter(range.start.col + c));
    }

    const dataStartRow = range.start.row + headerRowCount;
    const dataEndRow = range.end.row - totalsRowCount;
    const records: Array<Record<string, CellScalar>> = [];

    for (let row = dataStartRow; row <= dataEndRow; row += 1) {
        const record: Record<string, CellScalar> = {};
        for (let c = 0; c < colCount; c += 1) {
            const key = colNames[c] ?? colToLetter(range.start.col + c);
            const cell = getCell(sheet, formatCellRef(range.start.col + c, row));
            record[key] = cell ? cell.value : null;
        }
        records.push(record);
    }

    return { table, sheet, range, records };
}

export function resolveDefinedName(
    workbook: WorkbookModel,
    name: string,
    options?: { sheetName?: string }
): {
    spec: DefinedNameSpec;
    sheetName?: string;
    range?: RangeRef;
    ref?: string;
} | null {
    if (!workbook.definedNames || typeof name !== "string" || name.trim().length === 0) {
        return null;
    }
    const targetLower = name.trim().toLowerCase();
    const candidates = workbook.definedNames.filter((dn) => dn.name.toLowerCase() === targetLower);
    if (candidates.length === 0) {
        return null;
    }

    let spec: DefinedNameSpec | undefined;
    if (options?.sheetName) {
        const sheetLower = options.sheetName.toLowerCase();
        const targetSheetIdx = workbook.sheets.findIndex(
            (s) => s.name === options.sheetName || s.name.toLowerCase() === sheetLower
        );
        if (targetSheetIdx !== -1) {
            spec = candidates.find((dn) => dn.localSheetId === targetSheetIdx);
        }
        spec ??= candidates.find((dn) => dn.localSheetId === undefined);
    } else {
        spec = candidates.find((dn) => dn.localSheetId === undefined) ?? candidates[0];
    }

    if (!spec) {
        return null;
    }

    const rawFormula = spec.formula.trim();
    const cleaned = rawFormula.startsWith("=") ? rawFormula.slice(1).trim() : rawFormula;
    try {
        const parsed = parseSheetQualifiedRef(cleaned);
        const resolvedSheetName =
            parsed.sheetName ??
            (spec.localSheetId === undefined ? undefined : workbook.sheets[spec.localSheetId]?.name);
        const startRef = formatCellRef(parsed.range.start.col, parsed.range.start.row);
        const endRef = formatCellRef(parsed.range.end.col, parsed.range.end.row);
        const ref = startRef === endRef ? startRef : `${startRef}:${endRef}`;
        return {
            spec,
            ...(resolvedSheetName !== undefined && { sheetName: resolvedSheetName }),
            range: parsed.range,
            ref,
        };
    } catch {
        return { spec };
    }
}

interface CellPatchState {
    col: number;
    row: number;
    ref: string;
    deleted?: boolean;
    contentMode: "keep" | "clear" | "value" | "formula";
    value?: CellScalar;
    stringMode?: "inline" | "shared";
    sharedStringSlot?: number;
    formulaExpr?: string;
    cachedResult?: CellScalar;
    cachedError?: string;
    hasCachedUpdate?: boolean;
    styleMode: "preserve" | "clear" | "set";
    styleBatchSlot?: number;
    isAutoDateStyle?: boolean;
    preAutoDateStyleMode?: "preserve" | "clear" | "set";
    preAutoDateStyleBatchSlot?: number;
    preAutoDateStyle?: ExcelStyleSpec;
}

interface RowPatchOp {
    rowIndex: number;
    hidden?: boolean;
    height?: number | null;
}

interface SheetPatchBuffer {
    cellOps: Map<string, CellPatchState>;
    rowOps: Map<number, RowPatchOp>;
    colsModified: boolean;
    hyperlinksAdded: Map<string, CellHyperlink>;
    validationsModified: boolean;
    staleCalcChainRefs: Set<string>;
}

function normalizeColRange1Based(colIndexOrRange: number | [number, number]): [number, number] {
    if (typeof colIndexOrRange === "number") {
        if (!Number.isSafeInteger(colIndexOrRange) || colIndexOrRange < 1 || colIndexOrRange > MAX_EXCEL_COL_1_BASED) {
            throw new ExcelError(
                "INVALID_CELL_REF",
                `Column index ${String(colIndexOrRange)} is outside 1-based Excel bounds (1..${MAX_EXCEL_COL_1_BASED}).`,
                { details: { colIndexOrRange } }
            );
        }
        return [colIndexOrRange, colIndexOrRange];
    }
    const [a, b] = colIndexOrRange;
    if (
        !Number.isSafeInteger(a) ||
        !Number.isSafeInteger(b) ||
        a < 1 ||
        b < 1 ||
        a > MAX_EXCEL_COL_1_BASED ||
        b > MAX_EXCEL_COL_1_BASED
    ) {
        throw new ExcelError(
            "INVALID_CELL_REF",
            `Column range [${String(a)}, ${String(b)}] is outside 1-based Excel bounds (1..${MAX_EXCEL_COL_1_BASED}).`,
            { details: { colIndexOrRange } }
        );
    }
    return [Math.min(a, b), Math.max(a, b)];
}

function applyColumnPatchToSpecs(
    existing: readonly ColumnSpec[] | undefined,
    minCol: number,
    maxCol: number,
    update: { width?: number | null; hidden?: boolean }
): ColumnSpec[] {
    const source = existing ?? [];
    const segments: ColumnSpec[] = [];
    const covered = new Set<number>();

    for (const spec of source) {
        if (spec.max < minCol || spec.min > maxCol) {
            segments.push({ ...spec });
            continue;
        }
        if (spec.min < minCol) {
            segments.push({ ...spec, max: minCol - 1 });
        }
        const overlapStart = Math.max(spec.min, minCol);
        const overlapEnd = Math.min(spec.max, maxCol);
        for (let c = overlapStart; c <= overlapEnd; c += 1) {
            covered.add(c);
        }
        const updated: ColumnSpec = { ...spec, min: overlapStart, max: overlapEnd };
        if (update.width !== undefined) {
            if (update.width === null) {
                delete updated.width;
            } else {
                updated.width = update.width;
            }
        }
        if (update.hidden !== undefined) {
            if (update.hidden) {
                updated.hidden = true;
            } else {
                delete updated.hidden;
            }
        }
        if (updated.width !== undefined || updated.hidden || updated.outlineLevel) {
            segments.push(updated);
        }
        if (spec.max > maxCol) {
            segments.push({ ...spec, min: maxCol + 1 });
        }
    }

    const hasNewProps = (update.width !== undefined && update.width !== null) || update.hidden === true;
    if (hasNewProps) {
        let gapStart: number | undefined;
        for (let c = minCol; c <= maxCol; c += 1) {
            if (!covered.has(c)) {
                gapStart ??= c;
            } else if (gapStart !== undefined) {
                const gapSpec: ColumnSpec = { min: gapStart, max: c - 1 };
                if (update.width !== undefined && update.width !== null) {
                    gapSpec.width = update.width;
                }
                if (update.hidden) {
                    gapSpec.hidden = true;
                }
                segments.push(gapSpec);
                gapStart = undefined;
            }
        }
        if (gapStart !== undefined) {
            const gapSpec: ColumnSpec = { min: gapStart, max: maxCol };
            if (update.width !== undefined && update.width !== null) {
                gapSpec.width = update.width;
            }
            if (update.hidden) {
                gapSpec.hidden = true;
            }
            segments.push(gapSpec);
        }
    }

    return segments.toSorted((a, b) => a.min - b.min || a.max - b.max);
}

function insertOrReplaceWorksheetChildPatch(
    root: XmlElement,
    localName: string,
    newSectionXml: string
): XmlSlicePatch | null {
    const existing = findXmlChild(root, localName);
    if (existing) {
        return {
            start: existing.openStart,
            end: existing.closeEnd,
            replacement: newSectionXml,
        };
    }
    if (newSectionXml.length === 0) {
        return null;
    }
    const targetOrder = WORKSHEET_ORDER_INDEX[localName] ?? 999;
    for (const child of root.children) {
        const childOrder = WORKSHEET_ORDER_INDEX[child.localName];
        if (childOrder !== undefined && childOrder > targetOrder) {
            return {
                start: child.openStart,
                end: child.openStart,
                replacement: newSectionXml,
            };
        }
    }
    return {
        start: root.closeStart,
        end: root.closeStart,
        replacement: newSectionXml,
    };
}

interface ParsedExistingCellNode {
    col: number;
    row: number;
    ref: string;
    hasExplicitRef: boolean;
    el: XmlElement;
    fEl?: XmlElement;
    vEl?: XmlElement;
    isEl?: XmlElement;
    styleIdx?: number;
}

interface ParsedExistingRowNode {
    rowIndex: number;
    hasExplicitRowAttr: boolean;
    el: XmlElement;
    cells: ParsedExistingCellNode[];
    cellByRef: Map<string, ParsedExistingCellNode>;
}

function analyzeExistingSheetData(sheetDataEl: XmlElement): {
    rows: ParsedExistingRowNode[];
    rowByIndex: Map<number, ParsedExistingRowNode>;
    allCellByRef: Map<string, ParsedExistingCellNode>;
} {
    const rows: ParsedExistingRowNode[] = [];
    const rowByIndex = new Map<number, ParsedExistingRowNode>();
    const allCellByRef = new Map<string, ParsedExistingCellNode>();

    let prevRow1Based = 0;
    for (const rowEl of findXmlChildren(sheetDataEl, "row")) {
        const rAttr = parseSafeInt(getXmlAttr(rowEl.attrs, "r"));
        const hasExplicitRowAttr = rAttr !== undefined && rAttr >= 1;
        const rowIndex = hasExplicitRowAttr ? rAttr : prevRow1Based + 1;
        prevRow1Based = rowIndex;

        const cells: ParsedExistingCellNode[] = [];
        const cellByRef = new Map<string, ParsedExistingCellNode>();
        let prevCol0Based = -1;

        for (const cEl of findXmlChildren(rowEl, "c")) {
            const cRefAttr = getXmlAttr(cEl.attrs, "r");
            let col: number;
            let row: number;
            let hasExplicitRef = false;
            if (cRefAttr) {
                const parsed = parseCellRef(cRefAttr);
                col = parsed.col;
                row = parsed.row;
                hasExplicitRef = true;
            } else {
                col = prevCol0Based + 1;
                row = Math.max(0, rowIndex - 1);
            }
            prevCol0Based = col;
            const ref = formatCellRef(col, row);
            const node: ParsedExistingCellNode = {
                col,
                row,
                ref,
                hasExplicitRef,
                el: cEl,
                fEl: findXmlChild(cEl, "f"),
                vEl: findXmlChild(cEl, "v"),
                isEl: findXmlChild(cEl, "is"),
                styleIdx: parseSafeInt(getXmlAttr(cEl.attrs, "s")),
            };
            cells.push(node);
            cellByRef.set(ref, node);
            allCellByRef.set(ref, node);
        }

        const rowNode: ParsedExistingRowNode = {
            rowIndex,
            hasExplicitRowAttr,
            el: rowEl,
            cells,
            cellByRef,
        };
        rows.push(rowNode);
        rowByIndex.set(rowIndex, rowNode);
    }

    return { rows, rowByIndex, allCellByRef };
}

interface SharedGroupEntry {
    si: number;
    master?: ParsedExistingCellNode & { expr: string; rangeRef?: string };
    slaves: ParsedExistingCellNode[];
}

function collectSharedGroupsAndCheckArrays(
    sheetName: string,
    allCellByRef: ReadonlyMap<string, ParsedExistingCellNode>,
    buf: SheetPatchBuffer | undefined
): Map<number, SharedGroupEntry> {
    const sharedGroups = new Map<number, SharedGroupEntry>();

    for (const cellNode of allCellByRef.values()) {
        const fEl = cellNode.fEl;
        if (!fEl) {
            continue;
        }
        const fType = getXmlAttr(fEl.attrs, "t");
        const fRef = getXmlAttr(fEl.attrs, "ref");

        if (fType === "array" && fRef) {
            const range = parseRangeRef(fRef);
            const isMultiCellArray = range.start.col !== range.end.col || range.start.row !== range.end.row;
            if (isMultiCellArray && buf) {
                for (const op of buf.cellOps.values()) {
                    const isContentMutation = op.deleted === true || op.contentMode !== "keep";
                    if (
                        isContentMutation &&
                        op.col >= range.start.col &&
                        op.col <= range.end.col &&
                        op.row >= range.start.row &&
                        op.row <= range.end.row
                    ) {
                        throw new ExcelError(
                            "PATCH_FAILED",
                            `Cannot partially mutate cell "${op.ref}" inside multi-cell array formula range "${fRef}" on sheet "${sheetName}".`,
                            { details: { sheetName, ref: op.ref, arrayRange: fRef } }
                        );
                    }
                }
            }
        }

        if (fType === "shared") {
            const si = parseSafeInt(getXmlAttr(fEl.attrs, "si"));
            if (si === undefined) {
                continue;
            }
            let group = sharedGroups.get(si);
            if (!group) {
                group = { si, slaves: [] };
                sharedGroups.set(si, group);
            }
            const rawExpr = fEl.text.trim();
            if (rawExpr.length > 0 || fRef !== undefined) {
                const cleanExpr = rawExpr.startsWith("=") ? rawExpr.slice(1) : rawExpr;
                group.master = { ...cellNode, expr: cleanExpr, rangeRef: fRef };
            } else {
                group.slaves.push(cellNode);
            }
        }
    }

    return sharedGroups;
}

type RewrittenFormulaSpec =
    { kind: "shared"; si: number; expr: string; ref: string } | { kind: "normal"; expr: string };

function isContiguousCoordBlock(coords: ReadonlyArray<{ col: number; row: number }>): boolean {
    if (coords.length <= 1) {
        return true;
    }
    let minCol = Infinity;
    let minRow = Infinity;
    let maxCol = -Infinity;
    let maxRow = -Infinity;
    const seen = new Set<string>();
    for (const c of coords) {
        if (c.col < minCol) minCol = c.col;
        if (c.row < minRow) minRow = c.row;
        if (c.col > maxCol) maxCol = c.col;
        if (c.row > maxRow) maxRow = c.row;
        seen.add(`${c.col}:${c.row}`);
    }
    const expectedCount = (maxCol - minCol + 1) * (maxRow - minRow + 1);
    return seen.size === expectedCount;
}

function sheetHasFormulaCell(sheet: WorksheetModel): boolean {
    for (const cell of sheet.cells.values()) {
        if (cell.formula !== undefined) {
            return true;
        }
    }
    return false;
}

function reconcileLiveSharedFormulaGroupBeforeCellMutation(sheetModel: WorksheetModel, mutatedRef: string): void {
    const targetCell = sheetModel.cells.get(mutatedRef);
    const targetFormula = targetCell?.formula;
    if (targetFormula?.kind !== "shared" || targetFormula.sharedGroup === undefined) {
        return;
    }
    const si = targetFormula.sharedGroup;
    const wasMaster = targetFormula.ref !== undefined;

    const remaining: Array<{ ref: string; col: number; row: number; cell: CellModel }> = [];
    for (const [ref, cell] of sheetModel.cells) {
        if (ref === mutatedRef) {
            continue;
        }
        if (cell.formula?.kind === "shared" && cell.formula.sharedGroup === si) {
            const parsed = parseCellRef(ref);
            remaining.push({ ref, col: parsed.col, row: parsed.row, cell });
        }
    }
    if (remaining.length === 0) {
        return;
    }

    remaining.sort((a, b) => a.row - b.row || a.col - b.col);
    if (wasMaster && isContiguousCoordBlock(remaining)) {
        const promoted = remaining[0];
        if (promoted?.cell.formula) {
            promoted.cell.formula.ref = computeCellBoundingDimension(remaining);
        }
        return;
    }

    for (const item of remaining) {
        if (!item.cell.formula) {
            continue;
        }
        item.cell.formula.kind = "normal";
        delete item.cell.formula.sharedGroup;
        delete item.cell.formula.ref;
    }
}

function serializePatchedCellElementXml(
    op: CellPatchState,
    existingNode: ParsedExistingCellNode | undefined,
    context: {
        sheetXml: string;
        prefix: string;
        dateSystem: ExcelDateSystem;
        resolvedStyleIndices: readonly number[];
        resolvedSharedStringIndices: readonly number[];
        hasInitialSst: boolean;
        rewrittenFormulaByRef: ReadonlyMap<string, RewrittenFormulaSpec>;
    }
): string {
    const p = context.prefix;
    let openTag = existingNode
        ? context.sheetXml.slice(existingNode.el.openStart, existingNode.el.openEnd)
        : `<${p}c r="${op.ref}"/>`;

    openTag = upsertXmlAttribute(openTag, "r", op.ref);

    if (op.styleMode === "set" && op.styleBatchSlot !== undefined) {
        const styleIdx = context.resolvedStyleIndices[op.styleBatchSlot] ?? 0;
        openTag = styleIdx > 0 ? upsertXmlAttribute(openTag, "s", String(styleIdx)) : removeXmlAttribute(openTag, "s");
    } else if (op.styleMode === "clear") {
        openTag = removeXmlAttribute(openTag, "s");
    }

    const makeOpenAndClose = (innerXml: string): string => {
        if (innerXml.length === 0) {
            if (openTag.endsWith("/>")) {
                return openTag;
            }
            const gt = openTag.lastIndexOf(">");
            return `${openTag.slice(0, gt)}/>`;
        }
        if (openTag.endsWith("/>")) {
            return expandSelfClosingTag(openTag, innerXml);
        }
        return `${openTag}${innerXml}</${existingNode?.el.rawName ?? `${p}c`}>`;
    };

    if (op.contentMode === "clear") {
        openTag = removeXmlAttribute(openTag, "t");
        return makeOpenAndClose("");
    }

    if (op.contentMode === "value") {
        const val = op.value;
        if (val === null || val === undefined) {
            openTag = removeXmlAttribute(openTag, "t");
            return makeOpenAndClose("");
        }
        if (typeof val === "boolean") {
            openTag = upsertXmlAttribute(openTag, "t", "b");
            return makeOpenAndClose(`<${p}v>${val ? "1" : "0"}</${p}v>`);
        }
        if (typeof val === "number") {
            openTag = removeXmlAttribute(openTag, "t");
            return makeOpenAndClose(Number.isFinite(val) ? `<${p}v>${val}</${p}v>` : "");
        }
        if (val instanceof Date) {
            openTag = removeXmlAttribute(openTag, "t");
            if (Number.isNaN(val.getTime())) {
                return makeOpenAndClose("");
            }
            const serial = isoDateToExcelSerial(val, context.dateSystem);
            return makeOpenAndClose(`<${p}v>${serial}</${p}v>`);
        }
        if (typeof val === "string") {
            if (op.stringMode === "shared" && op.sharedStringSlot !== undefined && context.hasInitialSst) {
                const sstIdx = context.resolvedSharedStringIndices[op.sharedStringSlot] ?? 0;
                openTag = upsertXmlAttribute(openTag, "t", "s");
                return makeOpenAndClose(`<${p}v>${sstIdx}</${p}v>`);
            }
            openTag = upsertXmlAttribute(openTag, "t", "inlineStr");
            return makeOpenAndClose(`<${p}is><${p}t${xmlSpaceAttr(val)}>${escapeXmlText(val)}</${p}t></${p}is>`);
        }
        openTag = removeXmlAttribute(openTag, "t");
        return makeOpenAndClose("");
    }

    if (op.contentMode === "formula") {
        const expr = op.formulaExpr ?? "";
        const fXml = `<${p}f>${escapeXmlText(expr)}</${p}f>`;
        if (op.cachedError) {
            openTag = upsertXmlAttribute(openTag, "t", "e");
            return makeOpenAndClose(`${fXml}<${p}v>${escapeXmlText(op.cachedError)}</${p}v>`);
        }
        const cached = op.cachedResult;
        if (typeof cached === "number" && Number.isFinite(cached)) {
            openTag = removeXmlAttribute(openTag, "t");
            return makeOpenAndClose(`${fXml}<${p}v>${cached}</${p}v>`);
        }
        if (cached instanceof Date && !Number.isNaN(cached.getTime())) {
            openTag = removeXmlAttribute(openTag, "t");
            const serial = isoDateToExcelSerial(cached, context.dateSystem);
            return makeOpenAndClose(`${fXml}<${p}v>${serial}</${p}v>`);
        }
        if (typeof cached === "boolean") {
            openTag = upsertXmlAttribute(openTag, "t", "b");
            return makeOpenAndClose(`${fXml}<${p}v>${cached ? "1" : "0"}</${p}v>`);
        }
        if (typeof cached === "string") {
            openTag = upsertXmlAttribute(openTag, "t", "str");
            return makeOpenAndClose(`${fXml}<${p}v${xmlSpaceAttr(cached)}>${escapeXmlText(cached)}</${p}v>`);
        }
        openTag = removeXmlAttribute(openTag, "t");
        return makeOpenAndClose(fXml);
    }

    // contentMode === "keep"
    if (!existingNode) {
        return makeOpenAndClose("");
    }
    const rewrittenFormula = context.rewrittenFormulaByRef.get(op.ref);

    if (!rewrittenFormula && !op.hasCachedUpdate) {
        if (existingNode.el.selfClosing) {
            return openTag;
        }
        const innerSlice = context.sheetXml.slice(existingNode.el.openEnd, existingNode.el.closeStart);
        return `${openTag}${innerSlice}</${existingNode.el.rawName}>`;
    }

    let fPartXml = "";
    if (rewrittenFormula) {
        fPartXml =
            rewrittenFormula.kind === "shared"
                ? `<${p}f t="shared" ref="${escapeXmlAttr(rewrittenFormula.ref)}" si="${rewrittenFormula.si}">${escapeXmlText(rewrittenFormula.expr)}</${p}f>`
                : `<${p}f>${escapeXmlText(rewrittenFormula.expr)}</${p}f>`;
    } else if (existingNode.fEl) {
        fPartXml = context.sheetXml.slice(existingNode.fEl.openStart, existingNode.fEl.closeEnd);
    }

    let vPartXml = "";
    if (op.hasCachedUpdate) {
        if (op.cachedError) {
            openTag = upsertXmlAttribute(openTag, "t", "e");
            vPartXml = `<${p}v>${escapeXmlText(op.cachedError)}</${p}v>`;
        } else if (typeof op.cachedResult === "number" && Number.isFinite(op.cachedResult)) {
            openTag = removeXmlAttribute(openTag, "t");
            vPartXml = `<${p}v>${op.cachedResult}</${p}v>`;
        } else if (op.cachedResult instanceof Date && !Number.isNaN(op.cachedResult.getTime())) {
            openTag = removeXmlAttribute(openTag, "t");
            const serial = isoDateToExcelSerial(op.cachedResult, context.dateSystem);
            vPartXml = `<${p}v>${serial}</${p}v>`;
        } else if (typeof op.cachedResult === "boolean") {
            openTag = upsertXmlAttribute(openTag, "t", "b");
            vPartXml = `<${p}v>${op.cachedResult ? "1" : "0"}</${p}v>`;
        } else if (typeof op.cachedResult === "string") {
            openTag = upsertXmlAttribute(openTag, "t", "str");
            vPartXml = `<${p}v${xmlSpaceAttr(op.cachedResult)}>${escapeXmlText(op.cachedResult)}</${p}v>`;
        } else {
            openTag = removeXmlAttribute(openTag, "t");
            vPartXml = "";
        }
    } else if (existingNode.vEl) {
        vPartXml = context.sheetXml.slice(existingNode.vEl.openStart, existingNode.vEl.closeEnd);
    } else if (existingNode.isEl) {
        vPartXml = context.sheetXml.slice(existingNode.isEl.openStart, existingNode.isEl.closeEnd);
    }

    return makeOpenAndClose(`${fPartXml}${vPartXml}`);
}

function patchSingleExistingRow(
    existingRow: ParsedExistingRowNode,
    rowIndex: number,
    rowOp: RowPatchOp | undefined,
    rowCellOps: readonly CellPatchState[],
    sheetPatches: XmlSlicePatch[],
    cellContext: {
        sheetXml: string;
        prefix: string;
        dateSystem: ExcelDateSystem;
        resolvedStyleIndices: readonly number[];
        resolvedSharedStringIndices: readonly number[];
        hasInitialSst: boolean;
        rewrittenFormulaByRef: ReadonlyMap<string, RewrittenFormulaSpec>;
    }
): void {
    const { sheetXml } = cellContext;
    let rowOpenTag = sheetXml.slice(existingRow.el.openStart, existingRow.el.openEnd);
    if (!existingRow.hasExplicitRowAttr) {
        rowOpenTag = upsertXmlAttribute(rowOpenTag, "r", String(rowIndex));
    }
    if (rowOp) {
        if (rowOp.hidden !== undefined) {
            rowOpenTag = rowOp.hidden
                ? upsertXmlAttribute(rowOpenTag, "hidden", "1")
                : removeXmlAttribute(rowOpenTag, "hidden");
        }
        if (rowOp.height !== undefined) {
            if (rowOp.height === null) {
                rowOpenTag = removeXmlAttribute(rowOpenTag, "ht");
                rowOpenTag = removeXmlAttribute(rowOpenTag, "customHeight");
            } else {
                rowOpenTag = upsertXmlAttribute(rowOpenTag, "ht", String(rowOp.height));
                rowOpenTag = upsertXmlAttribute(rowOpenTag, "customHeight", "1");
            }
        }
    }

    if (existingRow.el.selfClosing) {
        const activeCellOps = rowCellOps.filter((op) => !op.deleted);
        const innerCellsXml = activeCellOps
            .map((op) => serializePatchedCellElementXml(op, undefined, cellContext))
            .join("");
        const replacement = innerCellsXml.length > 0 ? expandSelfClosingTag(rowOpenTag, innerCellsXml) : rowOpenTag;
        sheetPatches.push({
            start: existingRow.el.openStart,
            end: existingRow.el.openEnd,
            replacement,
        });
        return;
    }

    if (rowOpenTag !== sheetXml.slice(existingRow.el.openStart, existingRow.el.openEnd)) {
        sheetPatches.push({
            start: existingRow.el.openStart,
            end: existingRow.el.openEnd,
            replacement: rowOpenTag,
        });
    }

    const hasStructuralCellChange = rowCellOps.some((op) => op.deleted || !existingRow.cellByRef.has(op.ref));
    if (hasStructuralCellChange) {
        for (const cNode of existingRow.cells) {
            if (cNode.hasExplicitRef || rowCellOps.some((o) => o.ref === cNode.ref)) {
                continue;
            }
            const cOpen = sheetXml.slice(cNode.el.openStart, cNode.el.openEnd);
            sheetPatches.push({
                start: cNode.el.openStart,
                end: cNode.el.openEnd,
                replacement: upsertXmlAttribute(cOpen, "r", cNode.ref),
            });
        }
    }

    const insertionsByAnchorOffset = new Map<number, string[]>();
    for (const op of rowCellOps) {
        const existingCell = existingRow.cellByRef.get(op.ref);
        if (existingCell) {
            const replacement = op.deleted ? "" : serializePatchedCellElementXml(op, existingCell, cellContext);
            sheetPatches.push({
                start: existingCell.el.openStart,
                end: existingCell.el.closeEnd,
                replacement,
            });
        } else if (!op.deleted) {
            const nextSibling = existingRow.cells.find((c) => c.col > op.col);
            const anchorOffset = nextSibling ? nextSibling.el.openStart : existingRow.el.closeStart;
            let list = insertionsByAnchorOffset.get(anchorOffset);
            if (!list) {
                list = [];
                insertionsByAnchorOffset.set(anchorOffset, list);
            }
            list.push(serializePatchedCellElementXml(op, undefined, cellContext));
        }
    }

    for (const [offset, xmlList] of insertionsByAnchorOffset) {
        sheetPatches.push({
            start: offset,
            end: offset,
            replacement: xmlList.join(""),
        });
    }
}

export function createPatchSession(baseBytes: Uint8Array | ArrayBuffer, options?: PatchSessionOptions): PatchSession {
    const u8 = baseBytes instanceof Uint8Array ? baseBytes : new Uint8Array(baseBytes);
    const workbook = readXlsxBytes(u8);
    const baseEntries = extractOoxmlPackage(u8);
    const workbookPath = resolveWorkbookPartPath(baseEntries);
    const workbookEntry = findPackageEntry(baseEntries, workbookPath);
    if (!workbookEntry) {
        throw new ExcelError("CORRUPT_ARCHIVE", `Workbook part "${workbookPath}" was not found in archive.`);
    }

    const wbRelsEntry = findPackageEntry(baseEntries, getRelsPathForPart(workbookEntry.path));
    const wbRels = wbRelsEntry ? parseRelationshipsXml(decodeUtf8(wbRelsEntry.bytes)) : [];
    const wbRelById = new Map<string, PackageRelationship>();
    for (const rel of wbRels) {
        wbRelById.set(rel.id, rel);
    }

    const themeRel = findRelationshipsByType(wbRels, "theme")[0];
    const themeEntry = themeRel
        ? findPackageEntry(baseEntries, resolvePackageTarget(workbookEntry.path, themeRel.target))
        : undefined;
    const themeColors = themeEntry ? parseThemeColorsXml(decodeUtf8(themeEntry.bytes)) : DEFAULT_THEME_COLORS;

    const stylesRel = findRelationshipsByType(wbRels, "styles")[0];
    const initialStylesEntry = stylesRel
        ? findPackageEntry(baseEntries, resolvePackageTarget(workbookEntry.path, stylesRel.target))
        : undefined;

    const sstRel = findRelationshipsByType(wbRels, "sharedStrings")[0];
    const initialSstEntry = sstRel
        ? findPackageEntry(baseEntries, resolvePackageTarget(workbookEntry.path, sstRel.target))
        : undefined;

    const wbRoot = parseXmlTree(decodeUtf8(workbookEntry.bytes));
    if (!wbRoot) {
        throw new ExcelError("CORRUPT_XML", "Workbook XML has no root element.");
    }
    const sheetsContainer = findXmlChild(wbRoot, "sheets");
    const sheetElements = sheetsContainer ? findXmlChildren(sheetsContainer, "sheet") : [];

    interface SheetPackageBinding {
        model: WorksheetModel;
        partPath: string;
        sheetId: string;
        relId?: string;
    }

    const sheetBindings = new Map<string, SheetPackageBinding>();
    for (const [idx, sheetModel] of workbook.sheets.entries()) {
        const sheetEl =
            sheetElements.find((el) => getXmlAttr(el.attrs, "name") === sheetModel.name) ?? sheetElements[idx];
        const relId = sheetEl ? getXmlAttr(sheetEl.attrs, "id") : undefined;
        const sheetId = (sheetEl ? getXmlAttr(sheetEl.attrs, "sheetId") : undefined) ?? String(idx + 1);
        const rel = relId ? wbRelById.get(relId) : undefined;
        const resolvedTarget = resolvePackageTarget(
            workbookEntry.path,
            rel ? rel.target : `worksheets/sheet${idx + 1}.xml`
        );
        const entry = findPackageEntry(baseEntries, resolvedTarget);
        if (!entry) {
            throw new ExcelError("CORRUPT_ARCHIVE", `Worksheet part "${resolvedTarget}" not found in archive.`);
        }
        sheetBindings.set(sheetModel.name, {
            model: sheetModel,
            partPath: entry.path,
            sheetId,
            relId,
        });
    }

    const sheetBuffers = new Map<string, SheetPatchBuffer>();
    const visibilityUpdates = new Map<string, SheetVisibilityState>();
    const styleBatch: ExcelStyleSpec[] = [];
    const sharedStringBatch: string[] = [];
    const changedCellsKeys = new Set<string>();
    const changedCellsList: Array<{ sheetName: string; ref: string }> = [];
    let recalculated = false;

    const resolveSheetBinding = (sheetName: string): SheetPackageBinding => {
        const exact = sheetBindings.get(sheetName);
        if (exact) {
            return exact;
        }
        const lower = sheetName.toLowerCase();
        for (const binding of sheetBindings.values()) {
            if (binding.model.name.toLowerCase() === lower) {
                return binding;
            }
        }
        throw new ExcelError("SHEET_NOT_FOUND", `Worksheet "${sheetName}" was not found in workbook.`, {
            details: { sheetName },
        });
    };

    const getSheetBuffer = (canonicalSheetName: string): SheetPatchBuffer => {
        let buf = sheetBuffers.get(canonicalSheetName);
        if (!buf) {
            buf = {
                cellOps: new Map(),
                rowOps: new Map(),
                colsModified: false,
                hyperlinksAdded: new Map(),
                validationsModified: false,
                staleCalcChainRefs: new Set(),
            };
            sheetBuffers.set(canonicalSheetName, buf);
        }
        return buf;
    };

    const getCellPatchState = (
        buf: SheetPatchBuffer,
        ref: string
    ): { parsed: { col: number; row: number }; normRef: string; state: CellPatchState } => {
        const parsed = parseCellRef(ref);
        const normRef = formatCellRef(parsed.col, parsed.row);
        let state = buf.cellOps.get(normRef);
        if (!state) {
            state = {
                col: parsed.col,
                row: parsed.row,
                ref: normRef,
                contentMode: "keep",
                styleMode: "preserve",
            };
            buf.cellOps.set(normRef, state);
        }
        return { parsed, normRef, state };
    };

    const queueStyleInBatch = (style: ExcelStyleSpec): number => {
        const slot = styleBatch.length;
        styleBatch.push(style);
        return slot;
    };

    const queueSharedStringInBatch = (text: string): number => {
        const slot = sharedStringBatch.length;
        sharedStringBatch.push(text);
        return slot;
    };

    const markCellChanged = (sheetName: string, normRef: string): void => {
        const key = `${sheetName}!${normRef}`;
        if (!changedCellsKeys.has(key)) {
            changedCellsKeys.add(key);
            changedCellsList.push({ sheetName, ref: normRef });
        }
        recalculated = false;
    };

    const applyCellOptionsStyle = (
        sheetModel: WorksheetModel,
        normRef: string,
        state: CellPatchState,
        cellOptions?: PatchCellOptions,
        dateFallback?: Date
    ): ExcelStyleSpec | undefined => {
        if (cellOptions?.style) {
            state.styleMode = "set";
            state.styleBatchSlot = queueStyleInBatch(cellOptions.style);
            state.isAutoDateStyle = false;
            state.preAutoDateStyleMode = undefined;
            state.preAutoDateStyleBatchSlot = undefined;
            state.preAutoDateStyle = undefined;
            return cellOptions.style;
        }
        if (cellOptions?.preserveStyle === false) {
            if (dateFallback && !Number.isNaN(dateFallback.getTime())) {
                const dateStyle: ExcelStyleSpec = {
                    numFmt: defaultDateNumFmtForDate(dateFallback),
                };
                state.styleMode = "set";
                state.styleBatchSlot = queueStyleInBatch(dateStyle);
                state.isAutoDateStyle = true;
                state.preAutoDateStyleMode = "clear";
                state.preAutoDateStyleBatchSlot = undefined;
                state.preAutoDateStyle = undefined;
                return dateStyle;
            }
            state.styleMode = "clear";
            state.styleBatchSlot = undefined;
            state.isAutoDateStyle = false;
            state.preAutoDateStyleMode = undefined;
            state.preAutoDateStyleBatchSlot = undefined;
            state.preAutoDateStyle = undefined;
            return undefined;
        }
        const existingCell = sheetModel.cells.get(normRef);
        const baseStyle = state.isAutoDateStyle ? state.preAutoDateStyle : existingCell?.style;
        if (dateFallback && !Number.isNaN(dateFallback.getTime())) {
            const hasExistingDateFmt = baseStyle?.numFmt !== undefined && isDateNumFmt(0, baseStyle.numFmt);
            if (!hasExistingDateFmt) {
                if (!state.isAutoDateStyle) {
                    state.preAutoDateStyleMode = state.styleMode;
                    state.preAutoDateStyleBatchSlot = state.styleBatchSlot;
                    state.preAutoDateStyle = baseStyle;
                }
                const mergedDateStyle: ExcelStyleSpec = {
                    ...baseStyle,
                    numFmt: defaultDateNumFmtForDate(dateFallback),
                };
                state.styleMode = "set";
                state.styleBatchSlot = queueStyleInBatch(mergedDateStyle);
                state.isAutoDateStyle = true;
                return mergedDateStyle;
            }
            if (state.isAutoDateStyle) {
                state.styleMode = state.preAutoDateStyleMode ?? "preserve";
                state.styleBatchSlot = state.preAutoDateStyleBatchSlot;
                state.isAutoDateStyle = false;
                state.preAutoDateStyleMode = undefined;
                state.preAutoDateStyleBatchSlot = undefined;
                state.preAutoDateStyle = undefined;
            }
            return baseStyle;
        }
        if (state.isAutoDateStyle) {
            const restoredStyle = state.preAutoDateStyle;
            state.styleMode = state.preAutoDateStyleMode ?? "preserve";
            state.styleBatchSlot = state.preAutoDateStyleBatchSlot;
            state.isAutoDateStyle = false;
            state.preAutoDateStyleMode = undefined;
            state.preAutoDateStyleBatchSlot = undefined;
            state.preAutoDateStyle = undefined;
            return restoredStyle;
        }
        return existingCell?.style;
    };

    const patchSingleWorksheet = (
        sheetName: string,
        entriesCopy: Record<string, Uint8Array>,
        policy: "preserve" | "clear" | "recalculate",
        resolvedStyleIndices: readonly number[],
        resolvedSharedStringIndices: readonly number[]
    ): void => {
        const binding = resolveSheetBinding(sheetName);
        const sheetEntry = findPackageEntry(entriesCopy, binding.partPath);
        if (!sheetEntry) {
            return;
        }
        const sheetXml = decodeUtf8(sheetEntry.bytes);
        const root = parseXmlTree(sheetXml);
        if (!root) {
            throw new ExcelError("CORRUPT_XML", `Worksheet "${sheetName}" XML has no root element.`);
        }

        const p = getXmlPrefix(root.rawName);
        const buf = sheetBuffers.get(sheetName);
        const sheetPatches: XmlSlicePatch[] = [];

        const sheetDataEl = findXmlChild(root, "sheetData");
        if (!sheetDataEl) {
            throw new ExcelError("CORRUPT_XML", `Worksheet "${sheetName}" XML is missing <sheetData>.`);
        }

        const { rows: existingRows, rowByIndex, allCellByRef } = analyzeExistingSheetData(sheetDataEl);

        const sharedGroups = collectSharedGroupsAndCheckArrays(sheetName, allCellByRef, buf);

        const rewrittenFormulaByRef = new Map<string, RewrittenFormulaSpec>();
        if (buf) {
            for (const group of sharedGroups.values()) {
                if (!group.master) {
                    continue;
                }
                const masterOp = buf.cellOps.get(group.master.ref);
                const masterFormulaReplaced =
                    masterOp !== undefined && (masterOp.deleted === true || masterOp.contentMode !== "keep");

                const anySlaveReplaced = group.slaves.some((slave) => {
                    const op = buf.cellOps.get(slave.ref);
                    return op !== undefined && (op.deleted === true || op.contentMode !== "keep");
                });

                if (!masterFormulaReplaced && !anySlaveReplaced) {
                    continue;
                }

                const survivingSlaves = group.slaves
                    .filter((slave) => {
                        const op = buf.cellOps.get(slave.ref);
                        return op === undefined || (!op.deleted && op.contentMode === "keep");
                    })
                    .toSorted((a, b) => a.row - b.row || a.col - b.col);

                if (masterFormulaReplaced && !anySlaveReplaced && isContiguousCoordBlock(survivingSlaves)) {
                    const promoted = survivingSlaves[0];
                    if (!promoted) {
                        continue;
                    }
                    const promotedExpr = translateFormulaRefs(
                        group.master.expr,
                        promoted.col - group.master.col,
                        promoted.row - group.master.row
                    );
                    const promotedRangeRef = computeCellBoundingDimension(
                        survivingSlaves.map((s) => ({ col: s.col, row: s.row }))
                    );
                    rewrittenFormulaByRef.set(promoted.ref, {
                        kind: "shared",
                        si: group.si,
                        expr: promotedExpr,
                        ref: promotedRangeRef,
                    });
                    getCellPatchState(buf, promoted.ref);
                    const livePromotedCell = binding.model.cells.get(promoted.ref);
                    if (livePromotedCell?.formula) {
                        livePromotedCell.formula.expression = promotedExpr;
                        livePromotedCell.formula.ref = promotedRangeRef;
                    }
                    continue;
                }

                // A slave was mutated/deleted (or surviving slaves are non-contiguous):
                // materialize all surviving untouched members of this shared group into standalone normal formulas.
                const survivingMembers: ParsedExistingCellNode[] = masterFormulaReplaced
                    ? survivingSlaves
                    : [group.master, ...survivingSlaves];

                for (const member of survivingMembers) {
                    const standaloneExpr = translateFormulaRefs(
                        group.master.expr,
                        member.col - group.master.col,
                        member.row - group.master.row
                    );
                    rewrittenFormulaByRef.set(member.ref, {
                        kind: "normal",
                        expr: standaloneExpr,
                    });
                    getCellPatchState(buf, member.ref);
                    const liveCell = binding.model.cells.get(member.ref);
                    if (liveCell?.formula) {
                        liveCell.formula.expression = standaloneExpr;
                        liveCell.formula.kind = "normal";
                        delete liveCell.formula.sharedGroup;
                        delete liveCell.formula.ref;
                    }
                }
            }
        }

        const cellOpsByRow = new Map<number, CellPatchState[]>();
        if (buf) {
            for (const op of buf.cellOps.values()) {
                const row1 = op.row + 1;
                let list = cellOpsByRow.get(row1);
                if (!list) {
                    list = [];
                    cellOpsByRow.set(row1, list);
                }
                list.push(op);
            }
        }

        if (policy === "clear") {
            for (const cellNode of allCellByRef.values()) {
                if (!cellNode.fEl) {
                    continue;
                }
                const existingOp = buf?.cellOps.get(cellNode.ref);
                if (
                    existingOp &&
                    (existingOp.deleted || existingOp.contentMode !== "keep" || existingOp.hasCachedUpdate)
                ) {
                    continue;
                }
                const row1 = cellNode.row + 1;
                const clearCacheOp: CellPatchState = existingOp ?? {
                    col: cellNode.col,
                    row: cellNode.row,
                    ref: cellNode.ref,
                    contentMode: "keep",
                    styleMode: "preserve",
                };
                clearCacheOp.hasCachedUpdate = true;
                clearCacheOp.cachedResult = null;
                clearCacheOp.cachedError = undefined;
                if (!existingOp) {
                    let list = cellOpsByRow.get(row1);
                    if (!list) {
                        list = [];
                        cellOpsByRow.set(row1, list);
                    }
                    list.push(clearCacheOp);
                }
                const liveCell = binding.model.cells.get(cellNode.ref);
                if (liveCell?.formula) {
                    liveCell.formula.cachedResult = null;
                    delete liveCell.formula.error;
                    liveCell.value = null;
                    if (liveCell.type === "error") {
                        liveCell.type = "empty";
                    }
                }
            }
        }

        const cellContext = {
            sheetXml,
            prefix: p,
            dateSystem: workbook.dateSystem,
            resolvedStyleIndices,
            resolvedSharedStringIndices,
            hasInitialSst: initialSstEntry !== undefined,
            rewrittenFormulaByRef,
        };

        const touchedRowIndices = new Set<number>([...cellOpsByRow.keys(), ...(buf ? buf.rowOps.keys() : [])]);
        const sortedTouchedRows = [...touchedRowIndices].toSorted((a, b) => a - b);
        const newRowsToInsert: Array<{ rowIndex: number; xml: string }> = [];

        for (const rowIndex of sortedTouchedRows) {
            const existingRow = rowByIndex.get(rowIndex);
            const rowOp = buf?.rowOps.get(rowIndex);
            const rowCellOps = (cellOpsByRow.get(rowIndex) ?? []).toSorted((a, b) => a.col - b.col);

            if (!existingRow) {
                const activeCellOps = rowCellOps.filter((op) => !op.deleted);
                if (activeCellOps.length === 0 && !rowOp) {
                    continue;
                }
                let rowOpenTag = `<${p}row r="${rowIndex}"/>`;
                if (rowOp?.height !== undefined && rowOp.height !== null) {
                    rowOpenTag = upsertXmlAttribute(rowOpenTag, "ht", String(rowOp.height));
                    rowOpenTag = upsertXmlAttribute(rowOpenTag, "customHeight", "1");
                }
                if (rowOp?.hidden) {
                    rowOpenTag = upsertXmlAttribute(rowOpenTag, "hidden", "1");
                }
                const innerCellsXml = activeCellOps
                    .map((op) => serializePatchedCellElementXml(op, undefined, cellContext))
                    .join("");
                const rowXml = innerCellsXml.length > 0 ? expandSelfClosingTag(rowOpenTag, innerCellsXml) : rowOpenTag;
                newRowsToInsert.push({ rowIndex, xml: rowXml });
            } else {
                patchSingleExistingRow(existingRow, rowIndex, rowOp, rowCellOps, sheetPatches, cellContext);
            }
        }

        if (newRowsToInsert.length > 0) {
            if (sheetDataEl.selfClosing) {
                const sdOpen = sheetXml.slice(sheetDataEl.openStart, sheetDataEl.openEnd);
                sheetPatches.push({
                    start: sheetDataEl.openStart,
                    end: sheetDataEl.openEnd,
                    replacement: expandSelfClosingTag(sdOpen, newRowsToInsert.map((r) => r.xml).join("")),
                });
            } else {
                for (const rNode of existingRows) {
                    if (rNode.hasExplicitRowAttr || touchedRowIndices.has(rNode.rowIndex)) {
                        continue;
                    }
                    const rOpen = sheetXml.slice(rNode.el.openStart, rNode.el.openEnd);
                    sheetPatches.push({
                        start: rNode.el.openStart,
                        end: rNode.el.openEnd,
                        replacement: upsertXmlAttribute(rOpen, "r", String(rNode.rowIndex)),
                    });
                }

                const rowInsertionsByOffset = new Map<number, string[]>();
                for (const newRow of newRowsToInsert) {
                    const nextRow = existingRows.find((r) => r.rowIndex > newRow.rowIndex);
                    const offset = nextRow ? nextRow.el.openStart : sheetDataEl.closeStart;
                    let list = rowInsertionsByOffset.get(offset);
                    if (!list) {
                        list = [];
                        rowInsertionsByOffset.set(offset, list);
                    }
                    list.push(newRow.xml);
                }
                for (const [offset, xmlList] of rowInsertionsByOffset) {
                    sheetPatches.push({
                        start: offset,
                        end: offset,
                        replacement: xmlList.join(""),
                    });
                }
            }
        }

        const dimEl = findXmlChild(root, "dimension");
        if (dimEl) {
            const allCoords: Array<{ col: number; row: number }> = [];
            for (const ref of binding.model.cells.keys()) {
                const parsed = parseCellRef(ref);
                allCoords.push({ col: parsed.col, row: parsed.row });
            }
            const newDimRef = computeCellBoundingDimension(allCoords);
            const dimOpen = sheetXml.slice(dimEl.openStart, dimEl.openEnd);
            sheetPatches.push({
                start: dimEl.openStart,
                end: dimEl.openEnd,
                replacement: upsertXmlAttribute(dimOpen, "ref", newDimRef),
            });
        }

        if (buf?.colsModified) {
            const colsXml = serializeColsSectionXml(binding.model.columns, p);
            const colPatch = insertOrReplaceWorksheetChildPatch(root, "cols", colsXml);
            if (colPatch) {
                sheetPatches.push(colPatch);
            }
        }

        if (buf?.validationsModified) {
            const dvXml = serializeDataValidationsXml(binding.model.dataValidations ?? [], p);
            const dvPatch = insertOrReplaceWorksheetChildPatch(root, "dataValidations", dvXml);
            if (dvPatch) {
                sheetPatches.push(dvPatch);
            }
        }

        let needsRelNamespaceOnWorksheet =
            findXmlChild(root, "tableParts") !== undefined || findXmlChild(root, "drawing") !== undefined;

        if (buf && buf.hyperlinksAdded.size > 0) {
            const sheetRelsPath = getRelsPathForPart(sheetEntry.path);
            const sheetRelsEntry = findPackageEntry(entriesCopy, sheetRelsPath);
            const existingSheetRels = sheetRelsEntry ? parseRelationshipsXml(decodeUtf8(sheetRelsEntry.bytes)) : [];

            let maxRelNum = 0;
            for (const rel of existingSheetRels) {
                const match = /^rId(\d+)$/i.exec(rel.id);
                if (match?.[1]) {
                    const num = Number(match[1]);
                    if (num > maxRelNum) {
                        maxRelNum = num;
                    }
                }
            }

            const existingHyperlinks = parseHyperlinksXml(sheetXml, existingSheetRels);
            const mergedByRef = new Map<string, { ref: string; link: CellHyperlink; relId?: string }>();
            for (const entry of existingHyperlinks) {
                mergedByRef.set(entry.ref, entry);
            }
            for (const [ref, link] of buf.hyperlinksAdded) {
                mergedByRef.set(ref, { ref, link });
            }

            const newRels: PackageRelationship[] = [];
            const hlTagParts: string[] = [`<${p}hyperlinks>`];
            let nextRelNum = maxRelNum + 1;

            for (const item of mergedByRef.values()) {
                const attrs: string[] = [`ref="${escapeXmlAttr(item.ref)}"`];
                if (item.link.target) {
                    needsRelNamespaceOnWorksheet = true;
                    const relId = item.relId ?? `rId${nextRelNum++}`;
                    attrs.push(`r:id="${escapeXmlAttr(relId)}"`);
                    if (!item.relId) {
                        newRels.push({
                            id: relId,
                            type: HYPERLINK_REL_TYPE,
                            target: item.link.target,
                            targetMode: "External",
                        });
                    }
                }
                if (item.link.location !== undefined) {
                    attrs.push(`location="${escapeXmlAttr(item.link.location)}"`);
                }
                if (item.link.display !== undefined) {
                    attrs.push(`display="${escapeXmlAttr(item.link.display)}"`);
                }
                if (item.link.tooltip !== undefined) {
                    attrs.push(`tooltip="${escapeXmlAttr(item.link.tooltip)}"`);
                }
                hlTagParts.push(`<${p}hyperlink ${attrs.join(" ")}/>`);
            }
            hlTagParts.push(`</${p}hyperlinks>`);

            const hlPatch = insertOrReplaceWorksheetChildPatch(root, "hyperlinks", hlTagParts.join(""));
            if (hlPatch) {
                sheetPatches.push(hlPatch);
            }

            if (newRels.length > 0) {
                if (sheetRelsEntry) {
                    entriesCopy[sheetRelsEntry.path] = encodeUtf8(
                        appendRelationshipsXml(decodeUtf8(sheetRelsEntry.bytes), newRels)
                    );
                } else {
                    entriesCopy[sheetRelsPath] = encodeUtf8(serializeRelationshipsXml(newRels));
                }
            }
        }

        if (needsRelNamespaceOnWorksheet) {
            const wsOpenTag = sheetXml.slice(root.openStart, root.openEnd);
            const updatedWsOpenTag = upsertXmlAttribute(wsOpenTag, "xmlns:r", OFFICE_REL_NS);
            if (updatedWsOpenTag !== wsOpenTag) {
                sheetPatches.push({
                    start: root.openStart,
                    end: root.openEnd,
                    replacement: updatedWsOpenTag,
                });
            }
        }

        if (sheetPatches.length > 0) {
            entriesCopy[sheetEntry.path] = encodeUtf8(applyXmlSlicePatches(sheetXml, sheetPatches));
        }
    };

    const session: PatchSession = {
        getWorkbook(): WorkbookModel {
            return workbook;
        },

        setCellValue(sheetName: string, ref: string, value: CellScalar, cellOptions?: PatchCellOptions): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            state.deleted = false;
            state.contentMode = "value";
            state.value = value;
            state.hasCachedUpdate = false;
            state.stringMode = cellOptions?.stringMode ?? "inline";
            state.sharedStringSlot =
                typeof value === "string" && state.stringMode === "shared" && initialSstEntry !== undefined
                    ? queueSharedStringInBatch(value)
                    : undefined;

            const dateVal = value instanceof Date && !Number.isNaN(value.getTime()) ? value : undefined;
            const effectiveStyle = applyCellOptionsStyle(binding.model, normRef, state, cellOptions, dateVal);

            const existing = binding.model.cells.get(normRef);
            reconcileLiveSharedFormulaGroupBeforeCellMutation(binding.model, normRef);
            buf.staleCalcChainRefs.add(normRef);
            const isInvalidNumber = typeof value === "number" && !Number.isFinite(value);
            const isInvalidDate = value instanceof Date && Number.isNaN(value.getTime());
            const normalizedValue: CellScalar = isInvalidNumber || isInvalidDate ? null : value;
            const cellType: CellModel["type"] =
                normalizedValue === null || normalizedValue === undefined
                    ? "empty"
                    : normalizedValue instanceof Date
                      ? "date"
                      : typeof normalizedValue === "number"
                        ? "number"
                        : typeof normalizedValue === "boolean"
                          ? "boolean"
                          : "string";

            const nextCell: CellModel = { value: normalizedValue, type: cellType };
            if (effectiveStyle) {
                nextCell.style = effectiveStyle;
            }
            if (existing?.hyperlink) {
                nextCell.hyperlink = existing.hyperlink;
            }
            if (existing?.comment) {
                nextCell.comment = existing.comment;
            }
            setCell(binding.model, normRef, nextCell);
            markCellChanged(binding.model.name, normRef);
            return session;
        },

        setFormula(
            sheetName: string,
            ref: string,
            expression: string,
            cachedResult?: CellScalar,
            cellOptions?: PatchCellOptions
        ): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            const trimmed = expression.trim();
            const cleanExpr = trimmed.startsWith("=") ? trimmed.slice(1) : trimmed;
            const cached = cachedResult === undefined ? null : cachedResult;
            const isErr = typeof cached === "string" && isExcelErrorValue(cached);

            state.deleted = false;
            state.contentMode = "formula";
            state.formulaExpr = cleanExpr;
            state.cachedResult = isErr ? null : cached;
            state.cachedError = isErr ? cached.trim().toUpperCase() : undefined;
            state.hasCachedUpdate = false;

            const dateVal = cached instanceof Date && !Number.isNaN(cached.getTime()) ? cached : undefined;
            const effectiveStyle = applyCellOptionsStyle(binding.model, normRef, state, cellOptions, dateVal);

            const existing = binding.model.cells.get(normRef);
            reconcileLiveSharedFormulaGroupBeforeCellMutation(binding.model, normRef);
            if (existing?.formula?.expression !== cleanExpr) {
                buf.staleCalcChainRefs.add(normRef);
            }
            const formulaModel: CellFormula = {
                expression: cleanExpr,
                kind: "normal",
            };
            if (state.cachedError) {
                formulaModel.error = state.cachedError;
                formulaModel.cachedResult = null;
            } else if (cached !== null) {
                formulaModel.cachedResult = cached;
            }

            const cellType: CellModel["type"] = state.cachedError
                ? "error"
                : cached === null
                  ? "empty"
                  : cached instanceof Date
                    ? "date"
                    : typeof cached === "number"
                      ? "number"
                      : typeof cached === "boolean"
                        ? "boolean"
                        : "string";

            const nextCell: CellModel = {
                value: state.cachedError ?? cached,
                type: cellType,
                formula: formulaModel,
            };
            if (effectiveStyle) {
                nextCell.style = effectiveStyle;
            }
            if (existing?.hyperlink) {
                nextCell.hyperlink = existing.hyperlink;
            }
            if (existing?.comment) {
                nextCell.comment = existing.comment;
            }
            setCell(binding.model, normRef, nextCell);
            markCellChanged(binding.model.name, normRef);
            return session;
        },

        setCachedResult(sheetName: string, ref: string, cachedResult: CellScalar, error?: string): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            const errToken =
                error ??
                (typeof cachedResult === "string" && isExcelErrorValue(cachedResult)
                    ? cachedResult.trim().toUpperCase()
                    : undefined);

            state.deleted = false;
            if (state.contentMode === "formula") {
                state.cachedResult = errToken ? null : cachedResult;
                state.cachedError = errToken;
            } else if (state.contentMode === "value") {
                state.value = errToken ?? cachedResult;
            } else {
                state.hasCachedUpdate = true;
                state.cachedResult = errToken ? null : cachedResult;
                state.cachedError = errToken;
            }

            const existing = binding.model.cells.get(normRef);
            const cellType: CellModel["type"] = errToken
                ? "error"
                : cachedResult === null
                  ? "empty"
                  : cachedResult instanceof Date
                    ? "date"
                    : typeof cachedResult === "number"
                      ? "number"
                      : typeof cachedResult === "boolean"
                        ? "boolean"
                        : "string";

            if (existing) {
                existing.value = errToken ?? cachedResult;
                existing.type = cellType;
                if (existing.formula) {
                    if (errToken) {
                        existing.formula.error = errToken;
                        existing.formula.cachedResult = null;
                    } else {
                        delete existing.formula.error;
                        existing.formula.cachedResult = cachedResult;
                    }
                }
            } else {
                setCell(binding.model, normRef, {
                    value: errToken ?? cachedResult,
                    type: cellType,
                });
            }
            return session;
        },

        setCellStyle(sheetName: string, ref: string, style: ExcelStyleSpec): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            state.deleted = false;
            state.styleMode = "set";
            state.styleBatchSlot = queueStyleInBatch(style);
            state.isAutoDateStyle = false;
            state.preAutoDateStyleMode = undefined;
            state.preAutoDateStyleBatchSlot = undefined;
            state.preAutoDateStyle = undefined;

            const existing = binding.model.cells.get(normRef);
            if (existing) {
                existing.style = style;
            } else {
                setCell(binding.model, normRef, {
                    value: null,
                    type: "empty",
                    style,
                });
            }
            return session;
        },

        clearCellValue(sheetName: string, ref: string): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            state.deleted = false;
            state.contentMode = "clear";
            state.hasCachedUpdate = false;
            state.value = undefined;
            state.formulaExpr = undefined;
            state.cachedResult = undefined;
            state.cachedError = undefined;

            const existing = binding.model.cells.get(normRef);
            reconcileLiveSharedFormulaGroupBeforeCellMutation(binding.model, normRef);
            buf.staleCalcChainRefs.add(normRef);
            if (existing) {
                existing.value = null;
                existing.type = "empty";
                delete existing.formula;
                delete existing.richText;
                if (!existing.style && !existing.hyperlink && !existing.comment) {
                    binding.model.cells.delete(normRef);
                }
            }
            markCellChanged(binding.model.name, normRef);
            return session;
        },

        deleteCell(sheetName: string, ref: string): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            state.deleted = true;
            state.contentMode = "clear";
            state.value = undefined;
            state.sharedStringSlot = undefined;
            state.formulaExpr = undefined;
            state.cachedResult = undefined;
            state.cachedError = undefined;
            state.hasCachedUpdate = false;
            state.styleMode = "clear";
            state.styleBatchSlot = undefined;
            state.isAutoDateStyle = false;
            state.preAutoDateStyleMode = undefined;
            state.preAutoDateStyleBatchSlot = undefined;
            state.preAutoDateStyle = undefined;
            reconcileLiveSharedFormulaGroupBeforeCellMutation(binding.model, normRef);
            buf.staleCalcChainRefs.add(normRef);
            binding.model.cells.delete(normRef);
            markCellChanged(binding.model.name, normRef);
            return session;
        },

        setRowHidden(sheetName: string, rowIndex: number, hidden: boolean): PatchSession {
            if (!Number.isSafeInteger(rowIndex) || rowIndex < 1 || rowIndex > MAX_EXCEL_ROW_1_BASED) {
                throw new ExcelError(
                    "INVALID_CELL_REF",
                    `Row index ${String(rowIndex)} is outside 1-based Excel bounds (1..${MAX_EXCEL_ROW_1_BASED}).`,
                    { details: { rowIndex } }
                );
            }
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const rowOp = buf.rowOps.get(rowIndex) ?? { rowIndex };
            rowOp.hidden = hidden;
            buf.rowOps.set(rowIndex, rowOp);

            binding.model.rowsMeta ??= new Map();
            const meta = binding.model.rowsMeta.get(rowIndex) ?? { rowIndex };
            if (hidden) {
                meta.hidden = true;
            } else {
                delete meta.hidden;
            }
            binding.model.rowsMeta.set(rowIndex, meta);
            return session;
        },

        setRowHeight(sheetName: string, rowIndex: number, height: number | null): PatchSession {
            if (!Number.isSafeInteger(rowIndex) || rowIndex < 1 || rowIndex > MAX_EXCEL_ROW_1_BASED) {
                throw new ExcelError(
                    "INVALID_CELL_REF",
                    `Row index ${String(rowIndex)} is outside 1-based Excel bounds (1..${MAX_EXCEL_ROW_1_BASED}).`,
                    { details: { rowIndex } }
                );
            }
            if (height !== null && (!Number.isFinite(height) || height < 0)) {
                throw new ExcelError("INVALID_CONFIG", `Invalid row height: ${String(height)}.`, {
                    details: { height },
                });
            }
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const rowOp = buf.rowOps.get(rowIndex) ?? { rowIndex };
            rowOp.height = height;
            buf.rowOps.set(rowIndex, rowOp);

            binding.model.rowsMeta ??= new Map();
            const meta = binding.model.rowsMeta.get(rowIndex) ?? { rowIndex };
            if (height === null) {
                delete meta.height;
            } else {
                meta.height = height;
            }
            binding.model.rowsMeta.set(rowIndex, meta);
            return session;
        },

        setColWidth(sheetName: string, colIndexOrRange: number | [number, number], width: number | null): PatchSession {
            const [minCol, maxCol] = normalizeColRange1Based(colIndexOrRange);
            if (width !== null && (!Number.isFinite(width) || width < 0)) {
                throw new ExcelError("INVALID_CONFIG", `Invalid column width: ${String(width)}.`, {
                    details: { width },
                });
            }
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            buf.colsModified = true;
            binding.model.columns = applyColumnPatchToSpecs(binding.model.columns, minCol, maxCol, { width });
            return session;
        },

        setColHidden(sheetName: string, colIndexOrRange: number | [number, number], hidden: boolean): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const [minCol, maxCol] = normalizeColRange1Based(colIndexOrRange);
            const buf = getSheetBuffer(binding.model.name);
            buf.colsModified = true;
            binding.model.columns = applyColumnPatchToSpecs(binding.model.columns, minCol, maxCol, { hidden });
            return session;
        },

        setSheetVisibility(sheetName: string, state: SheetVisibilityState): PatchSession {
            if (!VISIBILITY_STATE_SET.has(state)) {
                throw new ExcelError("INVALID_CONFIG", `Invalid worksheet visibility state: "${String(state)}".`, {
                    details: { state },
                });
            }
            const binding = resolveSheetBinding(sheetName);
            binding.model.state = state;
            visibilityUpdates.set(binding.model.name, state);
            return session;
        },

        addHyperlink(sheetName: string, ref: string, link: CellHyperlink): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const buf = getSheetBuffer(binding.model.name);
            const { normRef, state } = getCellPatchState(buf, ref);

            state.deleted = false;
            buf.hyperlinksAdded.set(normRef, link);

            const existing = binding.model.cells.get(normRef);
            if (existing) {
                existing.hyperlink = link;
            } else {
                setCell(binding.model, normRef, {
                    value: null,
                    type: "empty",
                    hyperlink: link,
                });
            }
            return session;
        },

        setDataValidation(sheetName: string, rule: DataValidationRule): PatchSession {
            const binding = resolveSheetBinding(sheetName);
            const sqrefTokens = rule.sqref
                .trim()
                .split(/\s+/)
                .filter((t) => t.length > 0);
            if (sqrefTokens.length === 0) {
                throw new ExcelError("INVALID_RANGE_REF", "Data validation sqref cannot be empty.");
            }
            for (const token of sqrefTokens) {
                parseRangeRef(token);
            }

            const buf = getSheetBuffer(binding.model.name);
            buf.validationsModified = true;

            binding.model.dataValidations ??= [];
            const existingIdx = binding.model.dataValidations.findIndex(
                (r) => r.sqref.toUpperCase() === rule.sqref.toUpperCase()
            );
            if (existingIdx !== -1) {
                binding.model.dataValidations[existingIdx] = rule;
            } else {
                binding.model.dataValidations.push(rule);
            }
            return session;
        },

        recalculate(evaluator?: FormulaEvaluator): PatchSession {
            const activeEvaluator = evaluator ?? options?.evaluator;
            if (!activeEvaluator) {
                throw new ExcelError(
                    "FORMULA_EVALUATION_FAILED",
                    "Cannot recalculate formulas without a FormulaEvaluator."
                );
            }
            let results: ReadonlyArray<{
                sheetName: string;
                ref: string;
                value: CellScalar;
                error?: string;
            }>;
            try {
                results = activeEvaluator.recalculate(workbook, changedCellsList);
            } catch (error) {
                if (error instanceof ExcelError) {
                    throw error;
                }
                throw new ExcelError(
                    "FORMULA_EVALUATION_FAILED",
                    "FormulaEvaluator threw an error during recalculate().",
                    { cause: error }
                );
            }

            for (const item of results) {
                session.setCachedResult(item.sheetName, item.ref, item.value, item.error);
            }
            recalculated = true;
            return session;
        },

        toBytes(toBytesOptions?: { convertTemplateToWorkbook?: boolean }): Uint8Array {
            const policy = options?.onFormulaCache ?? "preserve";
            if (policy === "recalculate" && !recalculated) {
                session.recalculate();
            }

            const entriesCopy: Record<string, Uint8Array> = { ...baseEntries };

            // 1. Batch-append any new styles to xl/styles.xml without shifting existing cellXfs indices.
            let resolvedStyleIndices: number[] = [];
            if (styleBatch.length > 0) {
                if (initialStylesEntry) {
                    const appended = appendStylesToStylesXml(decodeUtf8(initialStylesEntry.bytes), styleBatch, {
                        themeColors,
                    });
                    entriesCopy[initialStylesEntry.path] = encodeUtf8(appended.xml);
                    resolvedStyleIndices = appended.styleIndices;
                } else {
                    const appended = appendStylesToStylesXml("", styleBatch, { themeColors });
                    const stylesPath = "xl/styles.xml";
                    entriesCopy[stylesPath] = encodeUtf8(appended.xml);
                    resolvedStyleIndices = appended.styleIndices;
                    if (wbRelsEntry) {
                        let maxRelNum = 0;
                        for (const rel of wbRels) {
                            const match = /^rId(\d+)$/i.exec(rel.id);
                            if (match?.[1]) {
                                const num = Number(match[1]);
                                if (num > maxRelNum) {
                                    maxRelNum = num;
                                }
                            }
                        }
                        const nextRelId = `rId${maxRelNum + 1}`;
                        entriesCopy[wbRelsEntry.path] = encodeUtf8(
                            appendRelationshipsXml(decodeUtf8(entriesCopy[wbRelsEntry.path] ?? wbRelsEntry.bytes), [
                                { id: nextRelId, type: STYLES_REL_TYPE, target: "styles.xml" },
                            ])
                        );
                    }
                    const ctEntry = findPackageEntry(entriesCopy, "[Content_Types].xml");
                    if (ctEntry) {
                        entriesCopy[ctEntry.path] = encodeUtf8(
                            ensureContentTypeOverride(decodeUtf8(ctEntry.bytes), stylesPath, STYLES_CT)
                        );
                    }
                }
            }

            // 2. Batch-append any shared strings to the tail of xl/sharedStrings.xml.
            let resolvedSharedStringIndices: number[] = [];
            if (sharedStringBatch.length > 0 && initialSstEntry) {
                const appended = appendSharedStringsXml(decodeUtf8(initialSstEntry.bytes), sharedStringBatch);
                entriesCopy[initialSstEntry.path] = encodeUtf8(appended.xml);
                resolvedSharedStringIndices = appended.indices;
            }

            const clearScope = options?.clearScope ?? "workbook";
            const sheetsToProcess = new Set<string>(sheetBuffers.keys());
            if (policy === "clear" && clearScope === "workbook") {
                for (const sheet of workbook.sheets) {
                    if (sheetHasFormulaCell(sheet)) {
                        sheetsToProcess.add(sheet.name);
                    }
                }
            }

            // 3. Apply surgical per-sheet XML patches.
            for (const sheetName of sheetsToProcess) {
                patchSingleWorksheet(sheetName, entriesCopy, policy, resolvedStyleIndices, resolvedSharedStringIndices);
            }

            // 4. Patch workbook.xml if visibility changed or onFormulaCache === "clear".
            if (policy !== "clear") {
                const calcRel = findRelationshipsByType(wbRels, "calcChain")[0];
                const calcChainPath = calcRel
                    ? resolvePackageTarget(workbookEntry.path, calcRel.target)
                    : "xl/calcChain.xml";
                const calcEntry = findPackageEntry(entriesCopy, calcChainPath);
                if (calcEntry) {
                    let calcXml = decodeUtf8(calcEntry.bytes);
                    let calcModified = false;
                    let remainingCount = -1;
                    for (const [sheetName, buf] of sheetBuffers) {
                        if (buf.staleCalcChainRefs.size === 0) {
                            continue;
                        }
                        const binding = sheetBindings.get(sheetName);
                        if (!binding) {
                            continue;
                        }
                        const updated = removeCalcChainEntries(calcXml, binding.sheetId, buf.staleCalcChainRefs);
                        if (updated.xml !== calcXml) {
                            calcXml = updated.xml;
                            calcModified = true;
                        }
                        remainingCount = updated.remainingCount;
                    }
                    if (calcModified) {
                        if (remainingCount === 0) {
                            stripCalcChainFromPackage(entriesCopy, workbookEntry.path);
                        } else {
                            entriesCopy[calcEntry.path] = encodeUtf8(calcXml);
                        }
                    }
                }
            }

            if (visibilityUpdates.size > 0 || policy === "clear") {
                const currentWbXml = decodeUtf8(entriesCopy[workbookEntry.path] ?? workbookEntry.bytes);
                const currentWbRoot = parseXmlTree(currentWbXml);
                if (currentWbRoot) {
                    const wbPrefix = getXmlPrefix(currentWbRoot.rawName);
                    const wbPatches: XmlSlicePatch[] = [];

                    if (visibilityUpdates.size > 0) {
                        const sheetsEl = findXmlChild(currentWbRoot, "sheets");
                        const sheetEls = sheetsEl ? findXmlChildren(sheetsEl, "sheet") : [];
                        for (const sheetEl of sheetEls) {
                            const sName = getXmlAttr(sheetEl.attrs, "name");
                            if (!sName) {
                                continue;
                            }
                            const newState = visibilityUpdates.get(sName);
                            if (newState === undefined) {
                                continue;
                            }
                            const sOpen = currentWbXml.slice(sheetEl.openStart, sheetEl.openEnd);
                            const updated =
                                newState === "visible" && getXmlAttr(sheetEl.attrs, "state") === undefined
                                    ? sOpen
                                    : upsertXmlAttribute(sOpen, "state", newState);
                            wbPatches.push({
                                start: sheetEl.openStart,
                                end: sheetEl.openEnd,
                                replacement: updated,
                            });
                        }
                    }

                    if (policy === "clear") {
                        const calcPrEl = findXmlChild(currentWbRoot, "calcPr");
                        if (calcPrEl) {
                            const cOpen = currentWbXml.slice(calcPrEl.openStart, calcPrEl.openEnd);
                            wbPatches.push({
                                start: calcPrEl.openStart,
                                end: calcPrEl.openEnd,
                                replacement: upsertXmlAttribute(cOpen, "fullCalcOnLoad", "1"),
                            });
                        } else {
                            wbPatches.push({
                                start: currentWbRoot.closeStart,
                                end: currentWbRoot.closeStart,
                                replacement: `<${wbPrefix}calcPr fullCalcOnLoad="1"/>`,
                            });
                        }
                        stripCalcChainFromPackage(entriesCopy, workbookEntry.path);
                    }

                    if (wbPatches.length > 0) {
                        entriesCopy[workbookEntry.path] = encodeUtf8(applyXmlSlicePatches(currentWbXml, wbPatches));
                    }
                }
            }

            // 5. Optional template-to-workbook Content_Types swap.
            if (toBytesOptions?.convertTemplateToWorkbook) {
                const ctEntry = findPackageEntry(entriesCopy, "[Content_Types].xml");
                if (ctEntry) {
                    entriesCopy[ctEntry.path] = encodeUtf8(
                        convertTemplateToWorkbookContentTypes(decodeUtf8(ctEntry.bytes))
                    );
                }
                if (workbook.sourceFormat === "xltx") {
                    workbook.sourceFormat = "xlsx";
                } else if (workbook.sourceFormat === "xltm") {
                    workbook.sourceFormat = "xlsm";
                }
            }

            return packOoxmlPackage(entriesCopy, 6);
        },
    };

    return session;
}

export function patchXlsxBytes(
    baseBytes: Uint8Array | ArrayBuffer,
    apply: (session: PatchSession) => void,
    options?: PatchSessionOptions & { convertTemplateToWorkbook?: boolean }
): Uint8Array {
    const session = createPatchSession(baseBytes, options);
    apply(session);
    return session.toBytes({
        convertTemplateToWorkbook: options?.convertTemplateToWorkbook,
    });
}
