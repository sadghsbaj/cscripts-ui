import { colToLetter, formatCellRef, parseCellRef, parseRangeRef } from "./coords.ts";
import { parseDateValue, parsePeriodHeader } from "./dates.ts";
import type {
	CellModel,
	ExcelDateSystem,
	GridRow,
	HiddenRowPolicy,
	InferredColumnType,
	WorkbookModel,
	WorksheetModel,
} from "./types.ts";
import {
	cellToString,
	normalizeCellText,
	parseBooleanValue,
	parseLocaleNumber,
	parseThresholdValue,
} from "./values.ts";

export type FuzzyMatchMode = "equals" | "startsWith" | "includes";

export interface FuzzyMatchOptions {
	mode?: FuzzyMatchMode;
	maxDistance?: number;
	caseSensitive?: boolean;
	structuralGuard?: boolean;
	stripPrefixes?: string[];
	stripSuffixes?: string[];
}

export interface ResolveSheetOptions {
	normalize?: boolean;
	fuzzy?: boolean | FuzzyMatchOptions;
}

export interface SheetToGridOptions {
	hiddenPolicy?: HiddenRowPolicy;
	preserveEmptyRows?: boolean;
	expandMergedCells?: "none" | "top-left";
	resolveCell?: (cell: CellModel) => unknown;
}

export interface FillDownGridOptions {
	colIndices?: readonly number[];
	stopOnBlankRow?: boolean;
	emptyValues?: readonly unknown[];
}

export interface ColumnTypeInference {
	inferredType: InferredColumnType;
	confidence: number;
	nonEmptyCount: number;
	nullCount: number;
	distinctCount: number;
	min?: number | string;
	max?: number | string;
	sampleValues: unknown[];
}

export interface ColumnProfile extends ColumnTypeInference {
	colIndex: number;
	colLetter: string;
	header: string;
}

export interface SheetProfile {
	sheetName: string;
	rowCount: number;
	colCount: number;
	nonEmptyCellCount: number;
	fillRate: number;
	formulaCellCount: number;
	mergesCount: number;
	headerRowIndex: number | null;
	columns: ColumnProfile[];
}

export type KeyValueScanLayout = "vertical" | "horizontal" | "multi-pair" | "auto";

export interface KeyValueScanOptions<TKey extends string = string> {
	fields: Record<TKey, string | readonly string[]>;
	layout?: KeyValueScanLayout;
	valueOffset?: number;
	maxSearchDistance?: number;
	fuzzy?: FuzzyMatchOptions;
	sheetCandidates?: readonly string[];
}

export interface KeyValueMatch<TKey extends string = string> {
	key: TKey;
	label: string;
	value: unknown;
	rowIndex: number;
	colIndex: number;
	sheetName?: string;
}

export interface KeyValueScanResult<TKey extends string = string> {
	values: Partial<Record<TKey, unknown>>;
	matches: KeyValueMatch<TKey>[];
}

export interface AxisColumnMatch {
	colIndex: number;
	rawHeader: unknown;
	key: string;
	metadata: Record<string, unknown>;
}

export interface AxisHeaderDetectionOptions {
	minMatches?: number;
	kind?: "period" | "date" | "number" | "any";
	anchorText?: string | readonly string[];
	lookaheadRows?: number;
	lookbehindRows?: number;
	fallbackYear?: number;
	dateSystem?: ExcelDateSystem;
	metadataRows?: Record<string, number>;
	predicate?: (cellValue: unknown, colIndex: number) => string | null;
	fuzzy?: FuzzyMatchOptions;
}

export interface AxisHeaderDetectionResult {
	headerRowIndex: number;
	headerGridIndex: number;
	columns: AxisColumnMatch[];
	columnMap: Map<string, AxisColumnMatch>;
}

export interface StackedSectionDefinition<TSectionId extends string = string> {
	id: TSectionId;
	anchor: string | readonly string[];
	anchorCol?: number;
}

export interface StackedSectionsScanOptions<TSectionId extends string = string> {
	sections: readonly StackedSectionDefinition<TSectionId>[];
	labelCol?: number;
	dataCols?: readonly number[];
	validationRowAnchor?: string | readonly string[];
	subtotalAnchors?: readonly string[];
	summaryAnchors?: readonly string[];
	stopAnchor?: string | readonly string[];
	fuzzy?: FuzzyMatchOptions;
}

export interface StackedSectionRow {
	rowIndex: number;
	label: string;
	values: Record<number, unknown>;
	rawCells: unknown[];
}

export interface StackedSectionBlock<TSectionId extends string = string> {
	id: TSectionId;
	title: string;
	startRowIndex: number;
	endRowIndex: number;
	validationRow?: Record<number, unknown>;
	rows: StackedSectionRow[];
	subtotalRow?: Record<number, unknown>;
}

export interface StackedSectionsScanResult<TSectionId extends string = string> {
	sections: StackedSectionBlock<TSectionId>[];
	summaryRows: StackedSectionRow[];
	stoppedAtRowIndex: number | null;
}

export interface GroupedRecordsScanOptions {
	startAnchor?: string | readonly string[] | ((row: GridRow) => boolean);
	keyCol?: number;
	maxLookahead?: number;
	detailFields?: Record<
		string,
		{
			rowOffset?: number;
			colIndex?: number;
			anchor?: string | readonly string[];
			valueColOffset?: number;
		}
	>;
	subSectionAnchor?: string | readonly string[];
	stopAnchor?: string | readonly string[];
	fuzzy?: FuzzyMatchOptions;
}

export interface GroupedRecordItem {
	startRowIndex: number;
	endRowIndex: number;
	key: unknown;
	fields: Record<string, unknown>;
	detailRows: GridRow[];
	subSections: Array<{ title: string; rows: GridRow[] }>;
}

export interface StridedColumnsScanOptions {
	groupRowIndex?: number;
	subHeaderRowIndex?: number;
	startCol?: number;
	stride: number;
	subColumnNames?: readonly string[];
	dataStartRowIndex?: number;
	keyCol?: number;
	stopAnchor?: string | readonly string[];
}

export interface StridedColumnGroup {
	groupName: string;
	rawGroupName: string;
	startCol: number;
	columns: Array<{ name: string; colIndex: number }>;
}

export interface StridedRecord {
	rowIndex: number;
	key: unknown;
	groups: Record<string, Record<string, unknown>>;
}

export interface StridedColumnsScanResult {
	groups: StridedColumnGroup[];
	records: StridedRecord[];
}

export interface FormTableColumnAlias<TField extends string = string> {
	field: TField;
	aliases: readonly string[];
	isActivityField?: boolean;
	placeholderValues?: readonly unknown[];
}

export interface FormTableScanOptions<TField extends string = string> {
	columns: readonly FormTableColumnAlias<TField>[];
	minHeaderMatches?: number;
	stopAnchor?: string | readonly string[];
	filterInactiveRows?: boolean;
	fuzzy?: FuzzyMatchOptions;
}

export interface FormTableRow<TField extends string = string> {
	rowIndex: number;
	record: Record<TField, unknown>;
}

export interface FormTableScanResult<TField extends string = string> {
	headerRowIndex: number;
	colMap: Record<TField, number>;
	rows: FormTableRow<TField>[];
	skippedPlaceholderRowCount: number;
}

export interface MatrixScanOptions {
	headerRowIndex?: number;
	rowKeyCols?: readonly number[];
	colStartIndex?: number;
	dataStartRowIndex?: number;
	skipEmptyValues?: boolean;
	stopAnchor?: string | readonly string[];
	formatColKey?: (raw: unknown, colIndex: number) => string;
}

export interface MatrixCellRecord {
	rowKey: string;
	rowLabels: string[];
	colKey: string;
	value: unknown;
	rowIndex: number;
	colIndex: number;
}

export type HierarchyStrategy =
	| "auto"
	| "outlineLevel"
	| "indent"
	| "whitespace"
	| "numbering";

export interface HierarchyScanOptions {
	labelCol?: number;
	codeCol?: number;
	valueCols?: Readonly<Record<string, number>>;
	strategy?: HierarchyStrategy;
	sheet?: WorksheetModel;
	startRowIndex?: number;
}

export interface HierarchyNode {
	index: number;
	rowIndex: number;
	label: string;
	code?: string;
	level: number;
	parentIndex: number | null;
	path: string[];
	values: Record<string, unknown>;
	children: HierarchyNode[];
}

export interface HierarchyScanResult {
	nodes: HierarchyNode[];
	roots: HierarchyNode[];
}

export interface DiscoverRegionsOptions {
	minRows?: number;
	minCols?: number;
	/**
	 * When `false`, regions split only on physically all-empty rows rather than `rowIndex` gaps
	 * (preventing `sheetToGrid(..., { hiddenPolicy: "skip" })` row gaps from splitting a single table).
	 * @default true
	 */
	treatRowGapsAsBlank?: boolean;
}

export interface DiscoveredRegion {
	id: string;
	startRow: number;
	endRow: number;
	startCol: number;
	endCol: number;
	rowCount: number;
	colCount: number;
	nonEmptyCount: number;
	headerPreview: string[];
	rows: GridRow[];
}

export interface FlattenMergedHeadersOptions {
	headerRows?: readonly number[] | { startRow: number; endRow: number };
	separator?: string;
	deduplicatePathSegments?: boolean;
}

export interface FlattenedHeaderColumn {
	colIndex: number;
	colLetter: string;
	path: string[];
	key: string;
}

const SURROUNDING_PUNCTUATION_RE = /^[\s:;*#\-–—]+|[\s:;*#\-–—]+$/g;
const CURRENCY_CHECK_RE = /(?:CHF|GBP|EUR|USD|[€$£¥])/i;
const TIME_PART_RE = /\b(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?\b/;
const AMBIGUOUS_NUMERIC_BOOLEAN_TOKENS = new Set(["0", "1"]);
const DEFAULT_FORM_PLACEHOLDERS = [
	"",
	"-",
	"—",
	"–",
	"0",
	"na",
	"n/a",
	"#n/a",
	"tbd",
	"todo",
	"<bitte wählen>",
	"<bitte waehlen>",
	"<select>",
	"bitte wählen",
];

function isCellValueEmpty(value: unknown, emptyValues?: readonly unknown[]): boolean {
	if (value === null || value === undefined) {
		return true;
	}
	if (typeof value === "string" && normalizeCellText(value).length === 0) {
		return true;
	}
	if (emptyValues && emptyValues.length > 0) {
		const normVal =
			typeof value === "string" ? normalizeCellText(value).toLowerCase() : value;
		for (const candidate of emptyValues) {
			if (candidate === value) {
				return true;
			}
			if (
				typeof candidate === "string" &&
				typeof normVal === "string" &&
				normalizeCellText(candidate).toLowerCase() === normVal
			) {
				return true;
			}
		}
	}
	return false;
}

function defaultResolveCell(cell: CellModel): unknown {
	if (cell.value !== null && cell.value !== undefined) {
		return cell.value;
	}
	if (cell.richText && cell.richText.length > 0) {
		return cell.richText.map((run) => run.text).join("");
	}
	if (cell.formula?.cachedResult !== undefined) {
		return cell.formula.cachedResult;
	}
	return null;
}

export function resolveSheet(
	workbook: WorkbookModel,
	candidates: readonly string[],
	options?: ResolveSheetOptions,
): WorksheetModel | null {
	const normalize = options?.normalize !== false;
	const fuzzyOption = options?.fuzzy;

	for (const candidate of candidates) {
		for (const sheet of workbook.sheets) {
			if (sheet.name === candidate) {
				return sheet;
			}
		}
		if (normalize) {
			const normCandidate = cleanAnchorText(candidate);
			if (normCandidate.length > 0) {
				for (const sheet of workbook.sheets) {
					if (cleanAnchorText(sheet.name) === normCandidate) {
						return sheet;
					}
				}
			}
		}
		if (fuzzyOption) {
			const fuzzyOpts: FuzzyMatchOptions | undefined =
				typeof fuzzyOption === "object" ? fuzzyOption : undefined;
			for (const sheet of workbook.sheets) {
				if (fuzzyMatchAnchor(sheet.name, candidate, fuzzyOpts)) {
					return sheet;
				}
			}
		}
	}

	return null;
}

const MAX_UNBOUNDED_MERGE_CELLS = 10_000;

function applyMergedCellExpansion(
	mergeRef: string,
	resolvedCoords: Map<string, { col: number; row: number; value: unknown }>,
	dataMaxRow: number,
	dataMaxCol: number,
): { endRow: number; endCol: number } {
	const range = parseRangeRef(mergeRef);
	const rawRows = range.end.row - range.start.row + 1;
	const rawCols = range.end.col - range.start.col + 1;
	const isOversized = rawRows * rawCols > MAX_UNBOUNDED_MERGE_CELLS;

	// Clip huge merges (e.g. A1:XFD1048576) to the populated cell bounding box to prevent OOM.
	const endRow = isOversized ? Math.min(range.end.row, dataMaxRow) : range.end.row;
	const endCol = isOversized ? Math.min(range.end.col, dataMaxCol) : range.end.col;
	if (endRow < range.start.row || endCol < range.start.col) {
		return { endRow: -1, endCol: -1 };
	}

	const topLeftKey = `${range.start.col}:${range.start.row}`;
	const topLeftVal = resolvedCoords.get(topLeftKey)?.value ?? null;

	for (let row = range.start.row; row <= endRow; row += 1) {
		const startCol = row === range.start.row ? range.start.col + 1 : range.start.col;
		for (let col = startCol; col <= endCol; col += 1) {
			const key = `${col}:${row}`;
			const existing = resolvedCoords.get(key)?.value;
			if (
				existing === undefined ||
				existing === null ||
				(typeof existing === "string" && existing.length === 0)
			) {
				resolvedCoords.set(key, { col, row, value: topLeftVal });
			}
		}
	}

	return { endRow, endCol };
}

export function sheetToGrid(sheet: WorksheetModel, options?: SheetToGridOptions): GridRow[] {
	const hiddenPolicy: HiddenRowPolicy = options?.hiddenPolicy ?? "include";
	const preserveEmptyRows = options?.preserveEmptyRows ?? false;
	const expandMergedCells = options?.expandMergedCells ?? "none";
	const resolveCell = options?.resolveCell ?? defaultResolveCell;

	const resolvedCoords = new Map<string, { col: number; row: number; value: unknown }>();
	let maxRow = -1;
	let maxCol = -1;

	for (const [ref, cell] of sheet.cells.entries()) {
		const parsed = parseCellRef(ref);
		const value = resolveCell(cell);
		const key = `${parsed.col}:${parsed.row}`;
		resolvedCoords.set(key, { col: parsed.col, row: parsed.row, value });
		if (parsed.row > maxRow) {
			maxRow = parsed.row;
		}
		if (parsed.col > maxCol) {
			maxCol = parsed.col;
		}
	}

	const dataMaxRow = maxRow;
	const dataMaxCol = maxCol;

	if (expandMergedCells === "top-left" && sheet.merges && sheet.merges.length > 0) {
		for (const mergeRef of sheet.merges) {
			const { endRow, endCol } = applyMergedCellExpansion(
				mergeRef,
				resolvedCoords,
				dataMaxRow,
				dataMaxCol,
			);
			if (endRow > maxRow) {
				maxRow = endRow;
			}
			if (endCol > maxCol) {
				maxCol = endCol;
			}
		}
	}

	if (preserveEmptyRows && sheet.rowsMeta) {
		for (const rowIndex of sheet.rowsMeta.keys()) {
			const zeroRow = rowIndex - 1;
			if (zeroRow > maxRow) {
				maxRow = zeroRow;
			}
		}
	}

	if (maxRow < 0) {
		return [];
	}

	const numCols = Math.max(0, maxCol + 1);
	const rows: GridRow[] = [];

	for (let r = 0; r <= maxRow; r += 1) {
		const rowIndex = r + 1;
		const rowMeta = sheet.rowsMeta?.get(rowIndex);
		const hidden = rowMeta?.hidden === true;

		if (hiddenPolicy === "skip" && hidden) {
			continue;
		}

		const cells: unknown[] = Array.from({ length: numCols }, () => null);
		for (let c = 0; c < numCols; c += 1) {
			const entry = resolvedCoords.get(`${c}:${r}`);
			if (entry !== undefined) {
				cells[c] = entry.value;
			}
		}

		const isRowEmpty = cells.every((v) => isCellValueEmpty(v));

		if (hiddenPolicy === "skip-if-empty" && hidden && isRowEmpty) {
			continue;
		}
		if (isRowEmpty && !preserveEmptyRows) {
			continue;
		}

		const outlineLevel = rowMeta?.outlineLevel;
		rows.push({
			rowIndex,
			hidden,
			...(outlineLevel !== undefined && { outlineLevel }),
			cells,
		});
	}

	return rows;
}

function fillDownRowCells(
	nextCells: unknown[],
	targetColSet: ReadonlySet<number>,
	carried: Map<number, unknown>,
	emptyValues?: readonly unknown[],
): void {
	for (const colIdx of targetColSet) {
		if (colIdx < 0) {
			continue;
		}
		while (nextCells.length <= colIdx) {
			nextCells.push(null);
		}
		const current = nextCells[colIdx];
		if (isCellValueEmpty(current, emptyValues)) {
			const prev = carried.get(colIdx);
			if (prev !== undefined) {
				nextCells[colIdx] = prev;
			}
		} else {
			carried.set(colIdx, current);
		}
	}
}

export function fillDownGrid(
	grid: readonly GridRow[],
	options?: FillDownGridOptions,
): GridRow[] {
	if (grid.length === 0) {
		return [];
	}

	const stopOnBlankRow = options?.stopOnBlankRow ?? true;
	const emptyValues = options?.emptyValues;

	let maxCols = 0;
	for (const row of grid) {
		if (row.cells.length > maxCols) {
			maxCols = row.cells.length;
		}
	}

	const targetCols =
		options?.colIndices ?? Array.from({ length: maxCols }, (_, idx) => idx);
	const targetColSet = new Set(targetCols);
	const carried = new Map<number, unknown>();
	const result: GridRow[] = [];

	for (const row of grid) {
		const nextCells = [...row.cells];
		const isBlankRow = nextCells.every((cell) => isCellValueEmpty(cell, emptyValues));

		if (isBlankRow) {
			if (stopOnBlankRow) {
				carried.clear();
			}
			result.push({
				rowIndex: row.rowIndex,
				hidden: row.hidden,
				...(row.outlineLevel !== undefined && { outlineLevel: row.outlineLevel }),
				cells: nextCells,
			});
			continue;
		}

		fillDownRowCells(nextCells, targetColSet, carried, emptyValues);

		result.push({
			rowIndex: row.rowIndex,
			hidden: row.hidden,
			...(row.outlineLevel !== undefined && { outlineLevel: row.outlineLevel }),
			cells: nextCells,
		});
	}

	return result;
}

type SingleCellKind =
	| "number"
	| "date"
	| "datetime"
	| "boolean"
	| "threshold"
	| "currency"
	| "string"
	| "ambiguous01";

interface ClassifiedCell {
	kind: SingleCellKind;
	numericValue?: number;
	dateIsoValue?: string;
	stringValue: string;
	raw: unknown;
}

function classifySingleValue(
	val: unknown,
	dateSystem: ExcelDateSystem,
): ClassifiedCell | null {
	if (val === null || val === undefined) {
		return null;
	}
	if (typeof val === "string" && normalizeCellText(val).length === 0) {
		return null;
	}

	if (val instanceof Date) {
		if (Number.isNaN(val.getTime())) {
			return null;
		}
		const isMidnight =
			val.getUTCHours() === 0 &&
			val.getUTCMinutes() === 0 &&
			val.getUTCSeconds() === 0 &&
			val.getUTCMilliseconds() === 0;
		const iso = isMidnight ? val.toISOString().slice(0, 10) : val.toISOString();
		return {
			kind: isMidnight ? "date" : "datetime",
			dateIsoValue: iso,
			stringValue: iso,
			raw: val,
		};
	}

	if (typeof val === "boolean") {
		return {
			kind: "boolean",
			stringValue: val ? "true" : "false",
			raw: val,
		};
	}

	if (typeof val === "number") {
		if (!Number.isFinite(val)) {
			return null;
		}
		if (val === 0 || val === 1) {
			return {
				kind: "ambiguous01",
				numericValue: val,
				stringValue: String(val),
				raw: val,
			};
		}
		return {
			kind: "number",
			numericValue: val,
			stringValue: String(val),
			raw: val,
		};
	}

	if (typeof val === "string") {
		const trimmed = normalizeCellText(val);
		if (trimmed.length === 0) {
			return null;
		}

		if (AMBIGUOUS_NUMERIC_BOOLEAN_TOKENS.has(trimmed)) {
			const num = Number(trimmed);
			return {
				kind: "ambiguous01",
				numericValue: num,
				stringValue: trimmed,
				raw: val,
			};
		}

		const boolParsed = parseBooleanValue(trimmed);
		if (boolParsed !== null) {
			return {
				kind: "boolean",
				stringValue: trimmed.toLowerCase(),
				raw: val,
			};
		}

		if (/^(<=|>=|<|>)/.test(trimmed)) {
			const hybrid = parseThresholdValue(trimmed);
			if (hybrid.kind === "threshold") {
				return {
					kind: "threshold",
					numericValue: hybrid.bound ?? hybrid.sortValue,
					stringValue: trimmed,
					raw: val,
				};
			}
		}

		if (CURRENCY_CHECK_RE.test(trimmed)) {
			const num = parseLocaleNumber(trimmed);
			if (num !== null) {
				return {
					kind: "currency",
					numericValue: num,
					stringValue: trimmed,
					raw: val,
				};
			}
		}

		const plainNum = parseLocaleNumber(trimmed);
		if (plainNum === null) {
			const parsedDate = parseDateValue(trimmed, { dateSystem });
			if (parsedDate !== null) {
				const timeMatch = TIME_PART_RE.exec(trimmed);
				if (timeMatch) {
					let isoDateTime = trimmed;
					if (!trimmed.startsWith(parsedDate)) {
						const hh = (timeMatch[1] ?? "00").padStart(2, "0");
						const mm = (timeMatch[2] ?? "00").padStart(2, "0");
						const ss = (timeMatch[3] ?? "00").padStart(2, "0");
						const ms = timeMatch[4] ? `.${timeMatch[4].padEnd(3, "0")}` : "";
						isoDateTime = `${parsedDate}T${hh}:${mm}:${ss}${ms}`;
					}
					return {
						kind: "datetime",
						dateIsoValue: isoDateTime,
						stringValue: isoDateTime,
						raw: val,
					};
				}
				return {
					kind: "date",
					dateIsoValue: parsedDate,
					stringValue: parsedDate,
					raw: val,
				};
			}
		} else {
			return {
				kind: "number",
				numericValue: plainNum,
				stringValue: trimmed,
				raw: val,
			};
		}

		return {
			kind: "string",
			stringValue: trimmed,
			raw: val,
		};
	}

	const fallback = normalizeCellText(val);
	return {
		kind: "string",
		stringValue: fallback,
		raw: val,
	};
}

function computeInferredMinMax(
	bestType: Exclude<InferredColumnType, "empty">,
	classified: readonly ClassifiedCell[],
): { min?: number | string; max?: number | string } {
	switch (bestType) {
		case "number":
		case "currency":
		case "threshold": {
			let minNum = Infinity;
			let maxNum = -Infinity;
			for (const item of classified) {
				if (item.numericValue === undefined || !Number.isFinite(item.numericValue)) {
					continue;
				}
				if (item.numericValue < minNum) {
					minNum = item.numericValue;
				}
				if (item.numericValue > maxNum) {
					maxNum = item.numericValue;
				}
			}
			if (Number.isFinite(minNum) && Number.isFinite(maxNum)) {
				return { min: minNum, max: maxNum };
			}
			return {};
		}
		case "date":
		case "datetime": {
			let min: string | undefined;
			let max: string | undefined;
			for (const item of classified) {
				if (item.dateIsoValue === undefined) {
					continue;
				}
				if (min === undefined || item.dateIsoValue < min) {
					min = item.dateIsoValue;
				}
				if (max === undefined || item.dateIsoValue > max) {
					max = item.dateIsoValue;
				}
			}
			return {
				...(min !== undefined && { min }),
				...(max !== undefined && { max }),
			};
		}
		case "string": {
			let min: string | undefined;
			let max: string | undefined;
			for (const item of classified) {
				if (min === undefined || item.stringValue < min) {
					min = item.stringValue;
				}
				if (max === undefined || item.stringValue > max) {
					max = item.stringValue;
				}
			}
			return {
				...(min !== undefined && { min }),
				...(max !== undefined && { max }),
			};
		}
		case "boolean": {
			return {};
		}
	}
}

export function inferColumnType(
	values: readonly unknown[],
	options?: { dateSystem?: ExcelDateSystem; sampleSize?: number },
): ColumnTypeInference {
	const dateSystem = options?.dateSystem ?? 1900;
	const sampleSize = options?.sampleSize ?? 5;

	let nonEmptyCount = 0;
	let nullCount = 0;
	const distinctSet = new Set<string>();
	const sampleValues: unknown[] = [];
	const classified: ClassifiedCell[] = [];

	let hasUnambiguousBoolean = false;
	for (const val of values) {
		const item = classifySingleValue(val, dateSystem);
		if (item === null) {
			nullCount += 1;
			continue;
		}
		nonEmptyCount += 1;
		distinctSet.add(`${item.kind}:${item.stringValue}`);
		if (sampleValues.length < sampleSize) {
			sampleValues.push(val);
		}
		if (item.kind === "boolean") {
			hasUnambiguousBoolean = true;
		}
		classified.push(item);
	}

	if (nonEmptyCount === 0) {
		return {
			inferredType: "empty",
			confidence: 1,
			nonEmptyCount: 0,
			nullCount,
			distinctCount: 0,
			sampleValues: [],
		};
	}

	const counts: Record<Exclude<InferredColumnType, "empty">, number> = {
		number: 0,
		date: 0,
		datetime: 0,
		boolean: 0,
		threshold: 0,
		currency: 0,
		string: 0,
	};

	for (const item of classified) {
		if (item.kind === "ambiguous01") {
			if (hasUnambiguousBoolean) {
				counts.boolean += 1;
			} else {
				counts.number += 1;
			}
		} else {
			counts[item.kind] += 1;
		}
	}

	// Deterministic tie-break order: earlier entries win when effective counts are equal
	// (number > date > datetime > boolean > threshold > currency > string).
	const effectiveCounts: Array<{ type: Exclude<InferredColumnType, "empty">; count: number }> = [
		{ type: "number", count: counts.number },
		{ type: "date", count: counts.date },
		{ type: "datetime", count: counts.datetime },
		{ type: "boolean", count: counts.boolean },
		{ type: "threshold", count: counts.threshold },
		{ type: "currency", count: counts.currency },
		{ type: "string", count: counts.string },
	];

	// Family promotions for mixed columns (date+datetime, threshold+number, currency+number).
	if (counts.datetime > 0 && counts.date > 0) {
		const dtEntry = effectiveCounts.find((e) => e.type === "datetime");
		if (dtEntry) {
			dtEntry.count = counts.datetime + counts.date;
		}
	}
	if (counts.threshold > 0 && counts.number > 0) {
		const thEntry = effectiveCounts.find((e) => e.type === "threshold");
		if (thEntry) {
			thEntry.count = counts.threshold + counts.number;
		}
	}
	if (counts.currency > 0 && counts.number > 0) {
		const combined = counts.currency + counts.number;
		if (counts.currency >= counts.number) {
			const curEntry = effectiveCounts.find((e) => e.type === "currency");
			if (curEntry) {
				curEntry.count = combined;
			}
		} else {
			const numEntry = effectiveCounts.find((e) => e.type === "number");
			if (numEntry) {
				numEntry.count = combined;
			}
		}
	}

	let bestType: Exclude<InferredColumnType, "empty"> = "string";
	let bestCount = -1;
	for (const entry of effectiveCounts) {
		if (entry.count <= bestCount) {
			continue;
		}
		bestCount = entry.count;
		bestType = entry.type;
	}

	const confidence = Number((bestCount / nonEmptyCount).toFixed(4));
	const { min, max } = computeInferredMinMax(bestType, classified);

	return {
		inferredType: bestType,
		confidence,
		nonEmptyCount,
		nullCount,
		distinctCount: distinctSet.size,
		...(min !== undefined && { min }),
		...(max !== undefined && { max }),
		sampleValues,
	};
}

export function profileSheet(
	sheet: WorksheetModel,
	options?: {
		headerRow?: number;
		sampleSize?: number;
		hiddenPolicy?: HiddenRowPolicy;
		dateSystem?: ExcelDateSystem;
	},
): SheetProfile {
	const grid = sheetToGrid(sheet, {
		hiddenPolicy: options?.hiddenPolicy ?? "include",
		preserveEmptyRows: false,
	});

	let formulaCellCount = 0;
	for (const cell of sheet.cells.values()) {
		if (cell.formula !== undefined) {
			formulaCellCount += 1;
		}
	}
	const mergesCount = sheet.merges?.length ?? 0;

	const rowCount = grid.length;
	let colCount = 0;
	let nonEmptyCellCount = 0;

	for (const row of grid) {
		if (row.cells.length > colCount) {
			colCount = row.cells.length;
		}
		for (const cell of row.cells) {
			if (!isCellValueEmpty(cell)) {
				nonEmptyCellCount += 1;
			}
		}
	}

	const totalSlots = rowCount * colCount;
	const fillRate = totalSlots > 0 ? Number((nonEmptyCellCount / totalSlots).toFixed(4)) : 0;

	if (rowCount === 0 || colCount === 0) {
		return {
			sheetName: sheet.name,
			rowCount,
			colCount,
			nonEmptyCellCount,
			fillRate,
			formulaCellCount,
			mergesCount,
			headerRowIndex: null,
			columns: [],
		};
	}

	let headerGridIdx = 0;
	if (options?.headerRow === undefined) {
		const searchLimit = Math.min(15, grid.length);
		let bestScore = -1;
		for (let i = 0; i < searchLimit; i += 1) {
			const row = grid[i];
			if (!row) {
				continue;
			}
			let score = 0;
			for (const cell of row.cells) {
				if (typeof cell === "string" && normalizeCellText(cell).length > 0) {
					score += 2;
				} else if (!isCellValueEmpty(cell)) {
					score += 1;
				}
			}
			if (score > bestScore) {
				bestScore = score;
				headerGridIdx = i;
			}
		}
	} else {
		const foundIdx = grid.findIndex((r) => r.rowIndex === options.headerRow);
		headerGridIdx = foundIdx === -1 ? 0 : foundIdx;
	}

	const headerRow = grid[headerGridIdx];
	const headerRowIndex = headerRow?.rowIndex ?? null;
	const dataRows = grid.slice(headerGridIdx + 1);

	const columns: ColumnProfile[] = [];
	for (let colIdx = 0; colIdx < colCount; colIdx += 1) {
		const colLetter = colToLetter(colIdx);
		const rawHeader = headerRow?.cells[colIdx];
		const headerText = normalizeCellText(rawHeader);
		const header = headerText.length > 0 ? headerText : colLetter;
		const colValues = dataRows.map((r) => r.cells[colIdx] ?? null);
		const inference = inferColumnType(colValues, {
			dateSystem: options?.dateSystem,
			sampleSize: options?.sampleSize,
		});
		columns.push({
			colIndex: colIdx,
			colLetter,
			header,
			...inference,
		});
	}

	return {
		sheetName: sheet.name,
		rowCount,
		colCount,
		nonEmptyCellCount,
		fillRate,
		formulaCellCount,
		mergesCount,
		headerRowIndex,
		columns,
	};
}

export function cleanAnchorText(
	text: string,
	options?: {
		stripPrefixes?: string[];
		stripSuffixes?: string[];
		caseSensitive?: boolean;
	},
): string {
	let cleaned = normalizeCellText(text, { collapseWhitespace: true });
	cleaned = cleaned.replaceAll(SURROUNDING_PUNCTUATION_RE, "");

	if (options?.stripPrefixes) {
		for (const prefix of options.stripPrefixes) {
			const normPrefix = normalizeCellText(prefix, { collapseWhitespace: true });
			if (normPrefix.length === 0) {
				continue;
			}
			if (
				cleaned.toLowerCase().startsWith(normPrefix.toLowerCase()) &&
				cleaned.length > normPrefix.length
			) {
				cleaned = cleaned.slice(normPrefix.length).replaceAll(SURROUNDING_PUNCTUATION_RE, "");
			}
		}
	}

	if (options?.stripSuffixes) {
		for (const suffix of options.stripSuffixes) {
			const normSuffix = normalizeCellText(suffix, { collapseWhitespace: true });
			if (normSuffix.length === 0) {
				continue;
			}
			if (
				cleaned.toLowerCase().endsWith(normSuffix.toLowerCase()) &&
				cleaned.length > normSuffix.length
			) {
				cleaned = cleaned
					.slice(0, cleaned.length - normSuffix.length)
					.replaceAll(SURROUNDING_PUNCTUATION_RE, "");
			}
		}
	}

	cleaned = cleaned.replaceAll(SURROUNDING_PUNCTUATION_RE, "");
	return options?.caseSensitive ? cleaned : cleaned.toLowerCase();
}

function computeLevenshteinDistance(a: string, b: string): number {
	if (a === b) {
		return 0;
	}
	if (a.length === 0) {
		return b.length;
	}
	if (b.length === 0) {
		return a.length;
	}

	let prev = Array.from({ length: b.length + 1 }, (_, idx) => idx);
	let curr = Array.from({ length: b.length + 1 }, () => 0);

	for (let i = 1; i <= a.length; i += 1) {
		curr[0] = i;
		const aChar = a[i - 1];
		for (let j = 1; j <= b.length; j += 1) {
			const cost = aChar === b[j - 1] ? 0 : 1;
			const del = (prev[j] ?? 0) + 1;
			const ins = (curr[j - 1] ?? 0) + 1;
			const sub = (prev[j - 1] ?? 0) + cost;
			curr[j] = Math.min(del, ins, sub);
		}
		const swap = prev;
		prev = curr;
		curr = swap;
	}

	return prev[b.length] ?? Math.max(a.length, b.length);
}

function defaultMaxDistanceForLength(len: number): number {
	if (len < 4) {
		return 0;
	}
	if (len <= 6) {
		return 1;
	}
	if (len <= 12) {
		return 2;
	}
	return 3;
}

function passesStructuralGuard(a: string, b: string): boolean {
	if (a.length === 0 || b.length === 0) {
		return false;
	}
	if (a[0] !== b[0]) {
		return false;
	}
	if (a.length >= 2 && b.length >= 2) {
		const secondMatches = a[1] === b[1];
		const lastMatches = a.at(-1) === b.at(-1);
		return secondMatches || lastMatches;
	}
	return true;
}

function passesDigitTokenGuard(candidate: string, target: string): boolean {
	const targetDigits = target.match(/\d+/g);
	const candidateDigits = candidate.match(/\d+/g);
	if (!targetDigits && !candidateDigits) {
		return true;
	}
	if (!targetDigits || !candidateDigits) {
		return false;
	}
	if (targetDigits.length !== candidateDigits.length) {
		return false;
	}
	for (const [idx, digitToken] of targetDigits.entries()) {
		if (digitToken !== candidateDigits[idx]) {
			return false;
		}
	}
	return true;
}

function fuzzyScoreSegment(
	segment: string,
	target: string,
	maxDistance: number,
	useStructuralGuard: boolean,
): number | null {
	if (segment === target) {
		return 0;
	}
	if (maxDistance <= 0) {
		return null;
	}
	if (Math.abs(segment.length - target.length) > maxDistance) {
		return null;
	}
	if (!passesDigitTokenGuard(segment, target)) {
		return null;
	}
	if (useStructuralGuard && !passesStructuralGuard(segment, target)) {
		return null;
	}
	const dist = computeLevenshteinDistance(segment, target);
	return dist <= maxDistance ? dist : null;
}

function computeFuzzyAnchorDistanceCleaned(
	c: string,
	t: string,
	options?: FuzzyMatchOptions,
): number | null {
	if (c.length === 0 || t.length === 0) {
		return null;
	}

	const mode: FuzzyMatchMode = options?.mode ?? "equals";
	const maxDistance = options?.maxDistance ?? defaultMaxDistanceForLength(t.length);
	const useStructuralGuard = options?.structuralGuard !== false;

	if (mode === "equals") {
		return fuzzyScoreSegment(c, t, maxDistance, useStructuralGuard);
	}

	if (mode === "startsWith") {
		if (c.startsWith(t)) {
			return 0;
		}
		if (maxDistance <= 0) {
			return null;
		}
		let best: number | null = null;
		const cWords = c.split(" ");
		const tWords = t.split(" ");
		if (cWords.length >= tWords.length) {
			const wordPrefix = cWords.slice(0, tWords.length).join(" ");
			const score = fuzzyScoreSegment(wordPrefix, t, maxDistance, useStructuralGuard);
			if (score !== null) {
				best = score;
			}
		}
		const minLen = Math.max(1, t.length - maxDistance);
		const maxLen = Math.min(c.length, t.length + maxDistance);
		for (let len = minLen; len <= maxLen; len += 1) {
			const slice = c.slice(0, len);
			const score = fuzzyScoreSegment(slice, t, maxDistance, useStructuralGuard);
			if (score !== null && (best === null || score < best)) {
				best = score;
			}
		}
		return best;
	}

	// mode === "includes"
	if (c.includes(t)) {
		return 0;
	}
	if (maxDistance <= 0) {
		return null;
	}

	let best: number | null = null;
	const cWords = c.split(" ");
	const tWords = t.split(" ");

	const minWindow = Math.max(1, tWords.length - 1);
	const maxWindow = Math.min(cWords.length, tWords.length + 1);
	for (let winSize = minWindow; winSize <= maxWindow; winSize += 1) {
		for (let start = 0; start + winSize <= cWords.length; start += 1) {
			const windowText = cWords.slice(start, start + winSize).join(" ");
			const score = fuzzyScoreSegment(windowText, t, maxDistance, useStructuralGuard);
			if (score !== null && (best === null || score < best)) {
				best = score;
			}
		}
	}

	return best;
}

function computeFuzzyAnchorDistance(
	candidate: string,
	target: string,
	options?: FuzzyMatchOptions,
): number | null {
	const c = cleanAnchorText(candidate, options);
	const t = cleanAnchorText(target, options);
	return computeFuzzyAnchorDistanceCleaned(c, t, options);
}

export function fuzzyMatchAnchor(
	candidate: string,
	target: string,
	options?: FuzzyMatchOptions,
): boolean {
	return computeFuzzyAnchorDistance(candidate, target, options) !== null;
}

export function createAliasResolver<TKey extends string>(
	aliases: Record<TKey, readonly string[]>,
	matchOptions?: FuzzyMatchOptions,
): (input: string) => TKey | null {
	const preparedEntries: Array<{ key: TKey; cleanedAliases: string[] }> = [];
	for (const [key, aliasList] of Object.entries(aliases) as Array<[TKey, readonly string[]]>) {
		const cleanedAliases: string[] = [];
		for (const alias of aliasList) {
			const cleaned = cleanAnchorText(alias, matchOptions);
			if (cleaned.length > 0) {
				cleanedAliases.push(cleaned);
			}
		}
		if (cleanedAliases.length > 0) {
			preparedEntries.push({ key, cleanedAliases });
		}
	}
	const exactMatchOptions: FuzzyMatchOptions = { ...matchOptions, maxDistance: 0 };

	return (input: string): TKey | null => {
		const cleanedInput = cleanAnchorText(input, matchOptions);
		if (cleanedInput.length === 0) {
			return null;
		}

		// Pass 1: exact normalized match (maxDistance: 0)
		for (const { key, cleanedAliases } of preparedEntries) {
			for (const cleanedAlias of cleanedAliases) {
				const dist = computeFuzzyAnchorDistanceCleaned(
					cleanedInput,
					cleanedAlias,
					exactMatchOptions,
				);
				if (dist === 0) {
					return key;
				}
			}
		}

		// Pass 2: fuzzy match picking lowest distance
		let bestKey: TKey | null = null;
		let bestDist = Infinity;
		for (const { key, cleanedAliases } of preparedEntries) {
			for (const cleanedAlias of cleanedAliases) {
				const dist = computeFuzzyAnchorDistanceCleaned(
					cleanedInput,
					cleanedAlias,
					matchOptions,
				);
				if (dist !== null && dist < bestDist) {
					bestDist = dist;
					bestKey = key;
				}
			}
		}

		return bestKey;
	};
}

function toAnchorList(anchor: string | readonly string[]): readonly string[] {
	return typeof anchor === "string" ? [anchor] : anchor;
}

function matchesAnyAnchor(
	cellValue: unknown,
	anchor: string | readonly string[],
	fuzzy?: FuzzyMatchOptions,
): boolean {
	if (cellValue === null || cellValue === undefined) {
		return false;
	}
	const text = cellToString(cellValue);
	if (text.trim().length === 0) {
		return false;
	}
	for (const target of toAnchorList(anchor)) {
		if (fuzzyMatchAnchor(text, target, fuzzy)) {
			return true;
		}
	}
	return false;
}

function rowMatchesAnyAnchor(
	row: GridRow,
	anchor: string | readonly string[],
	fuzzy?: FuzzyMatchOptions,
	onlyCol?: number,
): { matched: boolean; colIndex: number; text: string } {
	if (onlyCol !== undefined) {
		const cell = row.cells[onlyCol];
		if (matchesAnyAnchor(cell, anchor, fuzzy)) {
			return { matched: true, colIndex: onlyCol, text: normalizeCellText(cell) };
		}
		return { matched: false, colIndex: -1, text: "" };
	}
	for (let c = 0; c < row.cells.length; c += 1) {
		const cell = row.cells[c];
		if (matchesAnyAnchor(cell, anchor, fuzzy)) {
			return { matched: true, colIndex: c, text: normalizeCellText(cell) };
		}
	}
	return { matched: false, colIndex: -1, text: "" };
}

function isWorkbookModel(
	source: readonly GridRow[] | WorksheetModel | WorkbookModel,
): source is WorkbookModel {
	return !Array.isArray(source) && "sheets" in source;
}

function isWorksheetModel(
	source: readonly GridRow[] | WorksheetModel | WorkbookModel,
): source is WorksheetModel {
	return !Array.isArray(source) && "cells" in source;
}

function tryExtractRightValue(
	row: GridRow,
	rowIdx: number,
	colIdx: number,
	valueOffset: number,
	maxSearchDistance: number,
	isKeyCell: (r: number, c: number) => boolean,
): unknown {
	const limit = Math.max(valueOffset, maxSearchDistance);
	for (let offset = valueOffset; offset <= limit; offset += 1) {
		const targetCol = colIdx + offset;
		if (isKeyCell(rowIdx, targetCol)) {
			break;
		}
		const candidate = row.cells[targetCol];
		if (!isCellValueEmpty(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

function tryExtractBelowValue(
	grid: readonly GridRow[],
	rowIdx: number,
	colIdx: number,
	valueOffset: number,
	maxSearchDistance: number,
	isKeyCell: (r: number, c: number) => boolean,
): unknown {
	const limit = Math.max(valueOffset, maxSearchDistance);
	for (let offset = valueOffset; offset <= limit; offset += 1) {
		const targetRowIdx = rowIdx + offset;
		const targetRow = grid[targetRowIdx];
		if (!targetRow) {
			break;
		}
		if (isKeyCell(targetRowIdx, colIdx)) {
			break;
		}
		const candidate = targetRow.cells[colIdx];
		if (!isCellValueEmpty(candidate)) {
			return candidate;
		}
	}
	return undefined;
}

function extractValueForKeyCell(
	grid: readonly GridRow[],
	rowIdx: number,
	colIdx: number,
	layout: KeyValueScanLayout,
	valueOffset: number,
	maxSearchDistance: number,
	isKeyCell: (r: number, c: number) => boolean,
): unknown {
	const row = grid[rowIdx];
	if (!row) {
		return undefined;
	}

	if (layout === "vertical" || layout === "multi-pair") {
		return tryExtractRightValue(row, rowIdx, colIdx, valueOffset, maxSearchDistance, isKeyCell);
	}
	if (layout === "horizontal") {
		return tryExtractBelowValue(
			grid,
			rowIdx,
			colIdx,
			valueOffset,
			maxSearchDistance,
			isKeyCell,
		);
	}
	// layout === "auto"
	const rightVal = tryExtractRightValue(
		row,
		rowIdx,
		colIdx,
		valueOffset,
		maxSearchDistance,
		isKeyCell,
	);
	return rightVal === undefined
		? tryExtractBelowValue(grid, rowIdx, colIdx, valueOffset, maxSearchDistance, isKeyCell)
		: rightVal;
}

function scanSingleGridForKeyValue<TKey extends string>(
	grid: readonly GridRow[],
	sheetName: string | undefined,
	layout: KeyValueScanLayout,
	valueOffset: number,
	maxSearchDistance: number,
	resolveAlias: (input: string) => TKey | null,
	values: Partial<Record<TKey, unknown>>,
	matches: KeyValueMatch<TKey>[],
	fallbackMatches: Map<TKey, KeyValueMatch<TKey>>,
): void {
	const matchedPositions = new Map<string, TKey>();
	for (const [r, row] of grid.entries()) {
		for (let c = 0; c < row.cells.length; c += 1) {
			const cell = row.cells[c];
			if (typeof cell === "string" || typeof cell === "number") {
				const matchedKey = resolveAlias(String(cell));
				if (matchedKey !== null) {
					matchedPositions.set(`${r}:${c}`, matchedKey);
				}
			}
		}
	}

	const isKeyCell = (r: number, c: number): boolean => matchedPositions.has(`${r}:${c}`);

	for (const [r, row] of grid.entries()) {
		for (let c = 0; c < row.cells.length; c += 1) {
			const matchedKey = matchedPositions.get(`${r}:${c}`);
			if (matchedKey !== undefined && values[matchedKey] === undefined) {
				const extracted = extractValueForKeyCell(
					grid,
					r,
					c,
					layout,
					valueOffset,
					maxSearchDistance,
					isKeyCell,
				);
				if (extracted !== undefined) {
					values[matchedKey] = extracted;
					matches.push({
						key: matchedKey,
						label: normalizeCellText(row.cells[c]),
						value: extracted,
						rowIndex: row.rowIndex,
						colIndex: c,
						...(sheetName !== undefined && { sheetName }),
					});
					fallbackMatches.delete(matchedKey);
				} else if (!fallbackMatches.has(matchedKey)) {
					// Defer null-valued matches so later rows or fallback sheets can still supply a real value.
					fallbackMatches.set(matchedKey, {
						key: matchedKey,
						label: normalizeCellText(row.cells[c]),
						value: null,
						rowIndex: row.rowIndex,
						colIndex: c,
						...(sheetName !== undefined && { sheetName }),
					});
				}
			}
		}
	}
}

// Pattern A — scanKeyValueBlock
export function scanKeyValueBlock<TKey extends string = string>(
	source: readonly GridRow[] | WorksheetModel | WorkbookModel,
	options: KeyValueScanOptions<TKey>,
): KeyValueScanResult<TKey> {
	const layout: KeyValueScanLayout = options.layout ?? "auto";
	const valueOffset = options.valueOffset ?? 1;
	const maxSearchDistance = options.maxSearchDistance ?? Math.max(valueOffset, 3);
	const fieldEntries = Object.entries(options.fields) as Array<
		[TKey, string | readonly string[]]
	>;
	const aliasMap = {} as Record<TKey, readonly string[]>;
	for (const [key, aliases] of fieldEntries) {
		aliasMap[key] = toAnchorList(aliases);
	}
	const resolveAlias = createAliasResolver(aliasMap, options.fuzzy);

	const sheetsToScan: Array<{ sheetName?: string; grid: readonly GridRow[] }> = [];
	if (isWorkbookModel(source)) {
		if (options.sheetCandidates && options.sheetCandidates.length > 0) {
			const seen = new Set<string>();
			for (const candidate of options.sheetCandidates) {
				const resolved = resolveSheet(source, [candidate], {
					normalize: true,
					fuzzy: options.fuzzy ?? true,
				});
				if (resolved && !seen.has(resolved.name)) {
					seen.add(resolved.name);
					sheetsToScan.push({
						sheetName: resolved.name,
						grid: sheetToGrid(resolved, { expandMergedCells: "top-left" }),
					});
				}
			}
		} else {
			for (const sheet of source.sheets) {
				sheetsToScan.push({
					sheetName: sheet.name,
					grid: sheetToGrid(sheet, { expandMergedCells: "top-left" }),
				});
			}
		}
	} else if (isWorksheetModel(source)) {
		sheetsToScan.push({
			sheetName: source.name,
			grid: sheetToGrid(source, { expandMergedCells: "top-left" }),
		});
	} else {
		sheetsToScan.push({ grid: source });
	}

	const values: Partial<Record<TKey, unknown>> = {};
	const matches: KeyValueMatch<TKey>[] = [];
	const fallbackMatches = new Map<TKey, KeyValueMatch<TKey>>();
	const totalKeys = fieldEntries.length;

	for (const { sheetName, grid } of sheetsToScan) {
		scanSingleGridForKeyValue(
			grid,
			sheetName,
			layout,
			valueOffset,
			maxSearchDistance,
			resolveAlias,
			values,
			matches,
			fallbackMatches,
		);
		if (Object.keys(values).length >= totalKeys) {
			break;
		}
	}

	for (const [key, fallbackMatch] of fallbackMatches) {
		if (values[key] !== undefined) {
			continue;
		}
		values[key] = null;
		matches.push(fallbackMatch);
	}

	return { values, matches };
}

function isPlausibleCalendarYear(val: unknown): val is number {
	return typeof val === "number" && Number.isSafeInteger(val) && val >= 1900 && val <= 2100;
}

// Pattern B — detectAxisHeader
export function detectAxisHeader(
	grid: readonly GridRow[],
	options?: AxisHeaderDetectionOptions,
): AxisHeaderDetectionResult | null {
	if (grid.length === 0) {
		return null;
	}

	const minMatches = options?.minMatches ?? 2;
	const kind = options?.kind ?? "period";
	const lookaheadRows = options?.lookaheadRows ?? 5;
	const lookbehindRows = options?.lookbehindRows ?? 5;
	const dateSystem = options?.dateSystem ?? 1900;
	const fallbackYear = options?.fallbackYear;

	const parseAxisCell = (val: unknown, colIndex: number): string | null => {
		if (options?.predicate) {
			return options.predicate(val, colIndex);
		}
		if (isCellValueEmpty(val)) {
			return null;
		}
		if (kind === "period") {
			if (isPlausibleCalendarYear(val)) {
				return String(val);
			}
			return parsePeriodHeader(val, { fallbackYear, dateSystem });
		}
		if (kind === "date") {
			return parseDateValue(val, { dateSystem });
		}
		if (kind === "number") {
			const num = parseLocaleNumber(val);
			return num === null ? null : String(num);
		}
		// kind === "any"
		if (isPlausibleCalendarYear(val)) {
			return String(val);
		}
		const period = parsePeriodHeader(val, { fallbackYear, dateSystem });
		if (period !== null) {
			return period;
		}
		const date = parseDateValue(val, { dateSystem });
		if (date !== null) {
			return date;
		}
		const num = parseLocaleNumber(val);
		return num === null ? null : String(num);
	};

	let startIdx = 0;
	let endIdx = grid.length - 1;

	if (options?.anchorText !== undefined) {
		let anchorGridIdx = -1;
		for (const [i, row] of grid.entries()) {
			if (rowMatchesAnyAnchor(row, options.anchorText, options.fuzzy).matched) {
				anchorGridIdx = i;
				break;
			}
		}
		if (anchorGridIdx !== -1) {
			startIdx = Math.max(0, anchorGridIdx - lookbehindRows);
			endIdx = Math.min(grid.length - 1, anchorGridIdx + lookaheadRows);
		}
	}

	// Bare numbers parse as Excel serials, so for period-like kinds text/Date/year rows outrank numeric rows.
	const preferNonNumeric = !options?.predicate && (kind === "period" || kind === "any");
	const candidates: Array<{
		gridIdx: number;
		count: number;
		nonNumericCount: number;
		colMap: Map<string, AxisColumnMatch>;
	}> = [];

	for (let rIdx = startIdx; rIdx <= endIdx; rIdx += 1) {
		const row = grid[rIdx];
		if (!row) {
			continue;
		}
		const colMap = new Map<string, AxisColumnMatch>();
		let matchCount = 0;
		let nonNumericCount = 0;

		for (let cIdx = 0; cIdx < row.cells.length; cIdx += 1) {
			const rawHeader = row.cells[cIdx];
			const key = parseAxisCell(rawHeader, cIdx);
			if (key !== null) {
				matchCount += 1;
				if (
					typeof rawHeader !== "number" ||
					(preferNonNumeric && isPlausibleCalendarYear(rawHeader))
				) {
					nonNumericCount += 1;
				}
				const metadata: Record<string, unknown> = {};
				if (options?.metadataRows) {
					for (const [metaKey, relOffset] of Object.entries(options.metadataRows)) {
						const metaRow = grid[rIdx + relOffset];
						metadata[metaKey] = metaRow?.cells[cIdx] ?? null;
					}
				}
				// Last-wins deduplication
				colMap.set(key, {
					colIndex: cIdx,
					rawHeader,
					key,
					metadata,
				});
			}
		}

		if (matchCount >= minMatches) {
			candidates.push({ gridIdx: rIdx, count: matchCount, nonNumericCount, colMap });
		}
	}

	const useNonNumeric =
		preferNonNumeric && candidates.some((cand) => cand.nonNumericCount >= minMatches);
	let bestGridIdx = -1;
	let bestCount = -1;
	let bestColumnMap = new Map<string, AxisColumnMatch>();
	for (const cand of candidates) {
		if (useNonNumeric && cand.nonNumericCount < minMatches) {
			continue;
		}
		const score = useNonNumeric ? cand.nonNumericCount : cand.count;
		if (score > bestCount) {
			bestCount = score;
			bestGridIdx = cand.gridIdx;
			bestColumnMap = cand.colMap;
		}
	}

	if (bestGridIdx === -1) {
		return null;
	}

	const headerRow = grid[bestGridIdx];
	if (!headerRow) {
		return null;
	}

	// eslint-disable-next-line unicorn/prefer-iterator-to-array -- Iterator.prototype.toArray is ES2025-only
	const columns = [...bestColumnMap.values()].toSorted(
		(a, b) => a.colIndex - b.colIndex,
	);

	return {
		headerRowIndex: headerRow.rowIndex,
		headerGridIndex: bestGridIdx,
		columns,
		columnMap: bestColumnMap,
	};
}

function extractDataVector(
	row: GridRow,
	dataCols: readonly number[],
): Record<number, unknown> {
	const values: Record<number, unknown> = {};
	for (const colIdx of dataCols) {
		values[colIdx] = row.cells[colIdx] ?? null;
	}
	return values;
}

// Pattern C — scanStackedSections
export function scanStackedSections<TSectionId extends string = string>(
	grid: readonly GridRow[],
	options: StackedSectionsScanOptions<TSectionId>,
): StackedSectionsScanResult<TSectionId> {
	const labelCol = options.labelCol ?? 0;
	let maxCols = 0;
	for (const row of grid) {
		if (row.cells.length > maxCols) {
			maxCols = row.cells.length;
		}
	}
	const defaultDataCols: number[] = [];
	for (let c = 0; c < maxCols; c += 1) {
		if (c !== labelCol) {
			defaultDataCols.push(c);
		}
	}
	const dataCols = options.dataCols ?? defaultDataCols;

	const sections: StackedSectionBlock<TSectionId>[] = [];
	const summaryRows: StackedSectionRow[] = [];
	let currentSection: StackedSectionBlock<TSectionId> | null = null;
	let stoppedAtRowIndex: number | null = null;

	const matchSectionDef = (
		row: GridRow,
	): { def: StackedSectionDefinition<TSectionId>; title: string } | null => {
		for (const def of options.sections) {
			const match = rowMatchesAnyAnchor(row, def.anchor, options.fuzzy, def.anchorCol);
			if (match.matched) {
				return { def, title: match.text };
			}
		}
		return null;
	};

	for (const row of grid) {
		if (
			options.stopAnchor !== undefined &&
			rowMatchesAnyAnchor(row, options.stopAnchor, options.fuzzy).matched
		) {
			stoppedAtRowIndex = row.rowIndex;
			break;
		}

		const sectionMatch = matchSectionDef(row);
		if (sectionMatch !== null) {
			currentSection = {
				id: sectionMatch.def.id,
				title: sectionMatch.title,
				startRowIndex: row.rowIndex,
				endRowIndex: row.rowIndex,
				rows: [],
			};
			sections.push(currentSection);
			continue;
		}

		const isSummaryRow =
			options.summaryAnchors !== undefined &&
			options.summaryAnchors.length > 0 &&
			rowMatchesAnyAnchor(row, options.summaryAnchors, options.fuzzy).matched;

		if (isSummaryRow) {
			summaryRows.push({
				rowIndex: row.rowIndex,
				label: normalizeCellText(row.cells[labelCol]),
				values: extractDataVector(row, dataCols),
				rawCells: [...row.cells],
			});
			currentSection = null;
			continue;
		}

		if (currentSection === null) {
			continue;
		}

		if (
			options.validationRowAnchor !== undefined &&
			currentSection.validationRow === undefined &&
			rowMatchesAnyAnchor(row, options.validationRowAnchor, options.fuzzy).matched
		) {
			currentSection.validationRow = extractDataVector(row, dataCols);
			currentSection.endRowIndex = row.rowIndex;
			continue;
		}

		const isSubtotalRow =
			options.subtotalAnchors !== undefined &&
			options.subtotalAnchors.length > 0 &&
			rowMatchesAnyAnchor(row, options.subtotalAnchors, options.fuzzy).matched;

		if (isSubtotalRow) {
			currentSection.subtotalRow = extractDataVector(row, dataCols);
			currentSection.endRowIndex = row.rowIndex;
			continue;
		}

		const isRowEmpty = row.cells.every((cell) => isCellValueEmpty(cell));
		if (isRowEmpty) {
			continue;
		}

		currentSection.rows.push({
			rowIndex: row.rowIndex,
			label: normalizeCellText(row.cells[labelCol]),
			values: extractDataVector(row, dataCols),
			rawCells: [...row.cells],
		});
		currentSection.endRowIndex = row.rowIndex;
	}

	return {
		sections,
		summaryRows,
		stoppedAtRowIndex,
	};
}

function findEntityBlockEndIndex(
	grid: readonly GridRow[],
	startGridIdx: number,
	maxLookahead: number,
	isEntityStart: (row: GridRow) => boolean,
	stopAnchor?: string | readonly string[],
	fuzzy?: FuzzyMatchOptions,
): number {
	let endGridIdx = startGridIdx;
	const limitIdx = Math.min(grid.length - 1, startGridIdx + maxLookahead);

	for (let lookIdx = startGridIdx + 1; lookIdx <= limitIdx; lookIdx += 1) {
		const candidateRow = grid[lookIdx];
		if (!candidateRow) {
			break;
		}
		if (
			stopAnchor !== undefined &&
			rowMatchesAnyAnchor(candidateRow, stopAnchor, fuzzy).matched
		) {
			break;
		}
		if (isEntityStart(candidateRow)) {
			break;
		}
		endGridIdx = lookIdx;
	}

	return endGridIdx;
}

function findAnchorDetailFieldValue(
	blockRows: readonly GridRow[],
	anchor: string | readonly string[],
	valOffset: number,
	fuzzy?: FuzzyMatchOptions,
): unknown {
	for (const bRow of blockRows) {
		const match = rowMatchesAnyAnchor(bRow, anchor, fuzzy);
		if (match.matched) {
			return bRow.cells[match.colIndex + valOffset] ?? null;
		}
	}
	return null;
}

function partitionBlockSubSections(
	blockRows: readonly GridRow[],
	subSectionAnchor: string | readonly string[] | undefined,
	fuzzy?: FuzzyMatchOptions,
): {
	detailRows: GridRow[];
	subSections: Array<{ title: string; rows: GridRow[] }>;
} {
	const subSections: Array<{ title: string; rows: GridRow[] }> = [];
	const detailRows: GridRow[] = [];

	if (subSectionAnchor === undefined) {
		for (let bIdx = 1; bIdx < blockRows.length; bIdx += 1) {
			const bRow = blockRows[bIdx];
			if (bRow) {
				detailRows.push(bRow);
			}
		}
		return { detailRows, subSections };
	}

	let currentSub: { title: string; rows: GridRow[] } | null = null;
	for (const [bIdx, bRow] of blockRows.entries()) {
		const subMatch = rowMatchesAnyAnchor(bRow, subSectionAnchor, fuzzy);
		if (subMatch.matched) {
			currentSub = { title: subMatch.text, rows: [] };
			subSections.push(currentSub);
		} else if (currentSub !== null) {
			currentSub.rows.push(bRow);
		} else if (bIdx > 0) {
			detailRows.push(bRow);
		}
	}

	return { detailRows, subSections };
}

// Pattern D — scanGroupedRecords
export function scanGroupedRecords(
	grid: readonly GridRow[],
	options: GroupedRecordsScanOptions,
): GroupedRecordItem[] {
	const keyCol = options.keyCol ?? 0;
	const maxLookahead = options.maxLookahead ?? 10;

	const isEntityStart = (row: GridRow): boolean => {
		if (typeof options.startAnchor === "function") {
			return options.startAnchor(row);
		}
		if (options.startAnchor !== undefined) {
			return rowMatchesAnyAnchor(row, options.startAnchor, options.fuzzy).matched;
		}
		return !isCellValueEmpty(row.cells[keyCol]);
	};

	const items: GroupedRecordItem[] = [];
	let i = 0;

	while (i < grid.length) {
		const row = grid[i];
		if (!row) {
			i += 1;
			continue;
		}

		if (
			options.stopAnchor !== undefined &&
			rowMatchesAnyAnchor(row, options.stopAnchor, options.fuzzy).matched
		) {
			break;
		}

		if (!isEntityStart(row)) {
			i += 1;
			continue;
		}

		const startGridIdx = i;
		const endGridIdx = findEntityBlockEndIndex(
			grid,
			startGridIdx,
			maxLookahead,
			isEntityStart,
			options.stopAnchor,
			options.fuzzy,
		);

		const blockRows = grid.slice(startGridIdx, endGridIdx + 1);
		const fields: Record<string, unknown> = {};

		if (options.detailFields) {
			for (const [fieldName, spec] of Object.entries(options.detailFields)) {
				if (spec.anchor === undefined) {
					const rowOffset = spec.rowOffset ?? 0;
					const colIndex = spec.colIndex ?? keyCol;
					const targetRow = blockRows[rowOffset];
					fields[fieldName] = targetRow?.cells[colIndex] ?? null;
				} else {
					fields[fieldName] = findAnchorDetailFieldValue(
						blockRows,
						spec.anchor,
						spec.valueColOffset ?? 1,
						options.fuzzy,
					);
				}
			}
		}

		const { detailRows, subSections } = partitionBlockSubSections(
			blockRows,
			options.subSectionAnchor,
			options.fuzzy,
		);

		const lastRow = blockRows.at(-1) ?? row;
		items.push({
			startRowIndex: row.rowIndex,
			endRowIndex: lastRow.rowIndex,
			key: row.cells[keyCol] ?? null,
			fields,
			detailRows,
			subSections,
		});

		i = endGridIdx + 1;
	}

	return items;
}

function disambiguateName(base: string, usedNames: Set<string>): string {
	if (!usedNames.has(base)) {
		usedNames.add(base);
		return base;
	}
	let suffix = 2;
	while (usedNames.has(`${base}_${String(suffix)}`)) {
		suffix += 1;
	}
	const candidate = `${base}_${String(suffix)}`;
	usedNames.add(candidate);
	return candidate;
}

function findGroupHeaderInStride(
	groupRow: GridRow | undefined,
	col: number,
	stride: number,
	maxCols: number,
): string {
	for (let offset = 0; offset < stride && col + offset < maxCols; offset += 1) {
		const cellText = normalizeCellText(groupRow?.cells[col + offset]);
		if (cellText.length > 0) {
			return cellText;
		}
	}
	return "";
}

function hasNonEmptySubHeaderInStride(
	subHeaderRow: GridRow | undefined,
	col: number,
	stride: number,
	maxCols: number,
): boolean {
	if (!subHeaderRow) {
		return false;
	}
	for (let offset = 0; offset < stride && col + offset < maxCols; offset += 1) {
		if (!isCellValueEmpty(subHeaderRow.cells[col + offset])) {
			return true;
		}
	}
	return false;
}

// Pattern E — scanStridedColumns
export function scanStridedColumns(
	grid: readonly GridRow[],
	options: StridedColumnsScanOptions,
): StridedColumnsScanResult {
	if (grid.length === 0 || options.stride <= 0) {
		return { groups: [], records: [] };
	}

	const stride = options.stride;
	const startCol = options.startCol ?? 1;
	const keyCol = options.keyCol ?? 0;

	const findGridIdxByRowIndex = (
		targetRowIndex: number | undefined,
		fallbackIdx: number,
	): number => {
		if (targetRowIndex === undefined) {
			return fallbackIdx;
		}
		const idx = grid.findIndex((r) => r.rowIndex === targetRowIndex);
		return idx === -1 ? fallbackIdx : idx;
	};

	const groupGridIdx = findGridIdxByRowIndex(options.groupRowIndex, 0);
	const hasSubHeader =
		options.subHeaderRowIndex !== undefined ||
		(options.subColumnNames === undefined && grid.length > groupGridIdx + 1);
	const subHeaderGridIdx = hasSubHeader
		? findGridIdxByRowIndex(options.subHeaderRowIndex, groupGridIdx + 1)
		: -1;
	const defaultDataStartGridIdx =
		(subHeaderGridIdx === -1 ? groupGridIdx : Math.max(groupGridIdx, subHeaderGridIdx)) + 1;
	const dataStartGridIdx = findGridIdxByRowIndex(
		options.dataStartRowIndex,
		defaultDataStartGridIdx,
	);

	const groupRow = grid[groupGridIdx];
	let subHeaderRow: GridRow | undefined;
	if (subHeaderGridIdx >= 0) {
		subHeaderRow = grid[subHeaderGridIdx];
	}

	let maxCols = groupRow?.cells.length ?? 0;
	if (subHeaderRow && subHeaderRow.cells.length > maxCols) {
		maxCols = subHeaderRow.cells.length;
	}
	for (let r = dataStartGridIdx; r < grid.length; r += 1) {
		const row = grid[r];
		if (row && row.cells.length > maxCols) {
			maxCols = row.cells.length;
		}
	}

	const groups: StridedColumnGroup[] = [];
	const usedGroupNames = new Set<string>();

	for (let col = startCol; col < maxCols; col += stride) {
		const rawGroupName = findGroupHeaderInStride(groupRow, col, stride, maxCols);
		const hasAnySubHeaderOrData =
			rawGroupName.length > 0 ||
			hasNonEmptySubHeaderInStride(subHeaderRow, col, stride, maxCols);

		if (!hasAnySubHeaderOrData) {
			continue;
		}

		const baseGroupName =
			rawGroupName.length > 0 ? rawGroupName : `Group_${groups.length + 1}`;
		const groupName = disambiguateName(baseGroupName, usedGroupNames);

		const usedSubNames = new Set<string>();
		const columns: Array<{ name: string; colIndex: number }> = [];

		for (let offset = 0; offset < stride; offset += 1) {
			const colIndex = col + offset;
			const configuredSubName = options.subColumnNames?.[offset];
			const rawSubName =
				configuredSubName ??
				normalizeCellText(subHeaderRow?.cells[colIndex]) ??
				"";
			const baseSubName =
				rawSubName.length > 0 ? rawSubName : `Col_${offset + 1}`;
			const subName = disambiguateName(baseSubName, usedSubNames);
			columns.push({ name: subName, colIndex });
		}

		groups.push({
			groupName,
			rawGroupName: baseGroupName,
			startCol: col,
			columns,
		});
	}

	const records: StridedRecord[] = [];
	for (let rIdx = dataStartGridIdx; rIdx < grid.length; rIdx += 1) {
		const row = grid[rIdx];
		if (!row) {
			continue;
		}
		if (
			options.stopAnchor !== undefined &&
			rowMatchesAnyAnchor(row, options.stopAnchor).matched
		) {
			break;
		}
		if (row.cells.every((c) => isCellValueEmpty(c))) {
			continue;
		}

		const groupValues: Record<string, Record<string, unknown>> = {};
		for (const grp of groups) {
			const record: Record<string, unknown> = {};
			for (const colSpec of grp.columns) {
				record[colSpec.name] = row.cells[colSpec.colIndex] ?? null;
			}
			groupValues[grp.groupName] = record;
		}

		records.push({
			rowIndex: row.rowIndex,
			key: row.cells[keyCol] ?? null,
			groups: groupValues,
		});
	}

	return { groups, records };
}

function matchFormHeaderRow<TField extends string>(
	row: GridRow,
	resolveHeaderField: (input: string) => TField | null,
): { candidateMap: Record<TField, number>; matchedCount: number } {
	const candidateMap = {} as Record<TField, number>;
	let matchedCount = 0;

	for (let cIdx = 0; cIdx < row.cells.length; cIdx += 1) {
		const text = normalizeCellText(row.cells[cIdx]);
		if (text.length > 0) {
			const field = resolveHeaderField(text);
			if (field !== null && candidateMap[field] === undefined) {
				candidateMap[field] = cIdx;
				matchedCount += 1;
			}
		}
	}

	return { candidateMap, matchedCount };
}

// Pattern F — scanFormTable
export function scanFormTable<TField extends string = string>(
	grid: readonly GridRow[],
	options: FormTableScanOptions<TField>,
): FormTableScanResult<TField> | null {
	if (grid.length === 0 || options.columns.length === 0) {
		return null;
	}

	const minHeaderMatches =
		options.minHeaderMatches ?? Math.max(1, Math.min(2, options.columns.length));
	const filterInactiveRows = options.filterInactiveRows !== false;

	const aliasMap = {} as Record<TField, readonly string[]>;
	for (const colDef of options.columns) {
		aliasMap[colDef.field] = colDef.aliases;
	}
	const resolveHeaderField = createAliasResolver(aliasMap, options.fuzzy);

	let headerGridIdx = -1;
	let bestColMap = {} as Record<TField, number>;
	let bestMatchCount = -1;

	for (const [rIdx, row] of grid.entries()) {
		const { candidateMap, matchedCount } = matchFormHeaderRow(row, resolveHeaderField);

		if (matchedCount >= minHeaderMatches && matchedCount > bestMatchCount) {
			bestMatchCount = matchedCount;
			headerGridIdx = rIdx;
			bestColMap = candidateMap;
			if (matchedCount === options.columns.length) {
				break;
			}
		}
	}

	if (headerGridIdx === -1) {
		return null;
	}

	const headerRow = grid[headerGridIdx];
	if (!headerRow) {
		return null;
	}

	const explicitActivityCols = options.columns.filter((c) => c.isActivityField === true);
	const activityCols =
		explicitActivityCols.length > 0
			? explicitActivityCols
			: options.columns.length > 1
				? options.columns.slice(1)
				: options.columns;

	const rows: FormTableRow<TField>[] = [];
	let skippedPlaceholderRowCount = 0;

	for (let rIdx = headerGridIdx + 1; rIdx < grid.length; rIdx += 1) {
		const row = grid[rIdx];
		if (!row) {
			continue;
		}
		if (
			options.stopAnchor !== undefined &&
			rowMatchesAnyAnchor(row, options.stopAnchor, options.fuzzy).matched
		) {
			break;
		}
		if (row.cells.every((c) => isCellValueEmpty(c))) {
			continue;
		}

		const record = {} as Record<TField, unknown>;
		for (const colDef of options.columns) {
			const colIdx = bestColMap[colDef.field];
			record[colDef.field] = colIdx === undefined ? null : (row.cells[colIdx] ?? null);
		}

		if (filterInactiveRows) {
			const hasRealActivity = activityCols.some((colDef) => {
				const val = record[colDef.field];
				const placeholders = colDef.placeholderValues ?? DEFAULT_FORM_PLACEHOLDERS;
				if (typeof val === "number" && val === 0 && placeholders.includes("0")) {
					return false;
				}
				return !isCellValueEmpty(val, placeholders);
			});

			if (!hasRealActivity) {
				skippedPlaceholderRowCount += 1;
				continue;
			}
		}

		rows.push({
			rowIndex: row.rowIndex,
			record,
		});
	}

	return {
		headerRowIndex: headerRow.rowIndex,
		colMap: bestColMap,
		rows,
		skippedPlaceholderRowCount,
	};
}

function appendMatrixRowCells(
	row: GridRow,
	headerRow: GridRow,
	rowKey: string,
	rowLabels: string[],
	colStartIndex: number,
	skipEmptyValues: boolean,
	formatColKey: ((raw: unknown, colIndex: number) => string) | undefined,
	records: MatrixCellRecord[],
): void {
	const maxCols = Math.max(headerRow.cells.length, row.cells.length);
	for (let cIdx = colStartIndex; cIdx < maxCols; cIdx += 1) {
		const rawHeader = headerRow.cells[cIdx];
		const colKey = formatColKey
			? formatColKey(rawHeader, cIdx)
			: normalizeCellText(rawHeader);
		if (colKey.length === 0) {
			continue;
		}
		const value = row.cells[cIdx] ?? null;
		if (skipEmptyValues && isCellValueEmpty(value)) {
			continue;
		}
		records.push({
			rowKey,
			rowLabels,
			colKey,
			value,
			rowIndex: row.rowIndex,
			colIndex: cIdx,
		});
	}
}

// Pattern G — scanMatrix & unpivotGrid
export function scanMatrix(
	grid: readonly GridRow[],
	options?: MatrixScanOptions,
): MatrixCellRecord[] {
	if (grid.length === 0) {
		return [];
	}

	const rowKeyCols = options?.rowKeyCols ?? [0];
	let maxRowKeyCol = 0;
	for (const col of rowKeyCols) {
		if (col > maxRowKeyCol) {
			maxRowKeyCol = col;
		}
	}
	const colStartIndex = options?.colStartIndex ?? maxRowKeyCol + 1;
	const skipEmptyValues = options?.skipEmptyValues ?? true;

	let headerGridIdx = 0;
	if (options?.headerRowIndex !== undefined) {
		const found = grid.findIndex((r) => r.rowIndex === options.headerRowIndex);
		headerGridIdx = found === -1 ? 0 : found;
	}

	let dataStartGridIdx = headerGridIdx + 1;
	if (options?.dataStartRowIndex !== undefined) {
		const found = grid.findIndex((r) => r.rowIndex >= (options.dataStartRowIndex ?? 0));
		dataStartGridIdx = found === -1 ? grid.length : found;
	}

	const headerRow = grid[headerGridIdx];
	if (!headerRow) {
		return [];
	}

	const records: MatrixCellRecord[] = [];

	for (let rIdx = dataStartGridIdx; rIdx < grid.length; rIdx += 1) {
		const row = grid[rIdx];
		if (!row) {
			continue;
		}
		if (
			options?.stopAnchor !== undefined &&
			rowMatchesAnyAnchor(row, options.stopAnchor).matched
		) {
			break;
		}

		const rowLabels = rowKeyCols.map((cIdx) => normalizeCellText(row.cells[cIdx]));
		if (rowLabels.every((lbl) => lbl.length === 0)) {
			continue;
		}
		const rowKey = rowLabels.filter((lbl) => lbl.length > 0).join(" / ");

		appendMatrixRowCells(
			row,
			headerRow,
			rowKey,
			rowLabels,
			colStartIndex,
			skipEmptyValues,
			options?.formatColKey,
			records,
		);
	}

	return records;
}

export function unpivotGrid(
	grid: readonly GridRow[],
	options?: MatrixScanOptions,
): MatrixCellRecord[] {
	return scanMatrix(grid, options);
}

const NUMBERING_PREFIX_RE = /^(\d+(?:\.\d+)*)\.?(?:\s+(.+))?$/;

function computeOutlineHierarchyLevel(row: GridRow): number | null {
	return row.outlineLevel !== undefined && row.outlineLevel > 0 ? row.outlineLevel : null;
}

function computeIndentHierarchyLevel(
	row: GridRow,
	labelCol: number,
	sheet?: WorksheetModel,
): number | null {
	if (!sheet) {
		return null;
	}
	const ref = formatCellRef(labelCol, row.rowIndex - 1);
	const indent = sheet.cells.get(ref)?.style?.align?.indent;
	return indent !== undefined && indent > 0 ? indent : null;
}

function computeWhitespaceHierarchyLevel(rawLabel: string): number | null {
	const match = /^([ \t]+)/.exec(rawLabel.replaceAll("\u{00A0}", " "));
	if (!match) {
		return null;
	}
	const prefix = match[1] ?? "";
	const tabCount = (prefix.match(/\t/g) ?? []).length;
	const spaceCount = prefix.length - tabCount;
	const lvl = tabCount + Math.floor(spaceCount / 2);
	return lvl > 0 ? lvl : null;
}

function computeNumberingHierarchyLevel(
	trimmedLabel: string,
	rawCode: string | undefined,
	allowBareInlineInteger: boolean,
): { level: number; cleanedLabel: string; code: string } | null {
	if (rawCode !== undefined && rawCode.length > 0) {
		const codeMatch = /^(\d+(?:\.\d+)*)\.?$/.exec(rawCode);
		if (codeMatch) {
			const codeStr = codeMatch[1] ?? rawCode;
			const dots = (codeStr.match(/\./g) ?? []).length;
			return { level: dots, cleanedLabel: trimmedLabel, code: codeStr };
		}
	}
	const inlineMatch = NUMBERING_PREFIX_RE.exec(trimmedLabel);
	if (inlineMatch && inlineMatch[2] !== undefined) {
		const codeStr = inlineMatch[1] ?? "";
		const dots = (codeStr.match(/\./g) ?? []).length;
		// In auto strategy, avoid stripping bare integers from ordinary labels like "2024 Budget".
		if (dots === 0 && !allowBareInlineInteger) {
			return null;
		}
		const restLabel = inlineMatch[2].trim();
		return { level: dots, cleanedLabel: restLabel, code: codeStr };
	}
	return null;
}

function detectHierarchyLevel(
	row: GridRow,
	rawLabel: string,
	rawCode: string | undefined,
	strategy: HierarchyStrategy,
	labelCol: number,
	sheet?: WorksheetModel,
): { level: number; cleanedLabel: string; code?: string } {
	const trimmedLabel = normalizeCellText(rawLabel);

	if (strategy === "outlineLevel") {
		return {
			level: row.outlineLevel ?? 0,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}
	if (strategy === "indent") {
		return {
			level: computeIndentHierarchyLevel(row, labelCol, sheet) ?? 0,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}
	if (strategy === "whitespace") {
		return {
			level: computeWhitespaceHierarchyLevel(rawLabel) ?? 0,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}
	if (strategy === "numbering") {
		const numbered = computeNumberingHierarchyLevel(trimmedLabel, rawCode, true);
		if (numbered) {
			return numbered;
		}
		return {
			level: 0,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}

	// strategy === "auto"
	const numbered = computeNumberingHierarchyLevel(trimmedLabel, rawCode, false);
	if (numbered) {
		return numbered;
	}
	const outline = computeOutlineHierarchyLevel(row);
	if (outline !== null) {
		return {
			level: outline,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}
	const indent = computeIndentHierarchyLevel(row, labelCol, sheet);
	if (indent !== null) {
		return {
			level: indent,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}
	const ws = computeWhitespaceHierarchyLevel(rawLabel);
	if (ws !== null) {
		return {
			level: ws,
			cleanedLabel: trimmedLabel,
			...(rawCode !== undefined && { code: rawCode }),
		};
	}
	return {
		level: 0,
		cleanedLabel: trimmedLabel,
		...(rawCode !== undefined && { code: rawCode }),
	};
}

function popHierarchyAncestors(ancestorStack: HierarchyNode[], targetLevel: number): void {
	while (ancestorStack.length > 0) {
		const top = ancestorStack.at(-1);
		if (top && top.level >= targetLevel) {
			ancestorStack.pop();
		} else {
			break;
		}
	}
}

// Pattern H — scanHierarchy
export function scanHierarchy(
	grid: readonly GridRow[],
	options?: HierarchyScanOptions,
): HierarchyScanResult {
	const labelCol = options?.labelCol ?? 0;
	const codeCol = options?.codeCol;
	const strategy: HierarchyStrategy = options?.strategy ?? "auto";
	const startRowIndex = options?.startRowIndex ?? 1;

	const nodes: HierarchyNode[] = [];
	const roots: HierarchyNode[] = [];
	const ancestorStack: HierarchyNode[] = [];

	for (const row of grid) {
		if (row.rowIndex < startRowIndex) {
			continue;
		}
		const rawCell = row.cells[labelCol];
		if (isCellValueEmpty(rawCell)) {
			continue;
		}
		const rawLabel = cellToString(rawCell);
		const rawCode =
			codeCol !== undefined && !isCellValueEmpty(row.cells[codeCol])
				? normalizeCellText(row.cells[codeCol])
				: undefined;

		const { level, cleanedLabel, code } = detectHierarchyLevel(
			row,
			rawLabel,
			rawCode,
			strategy,
			labelCol,
			options?.sheet,
		);

		popHierarchyAncestors(ancestorStack, level);

		const parent = ancestorStack.at(-1) ?? null;
		const path = parent ? [...parent.path, cleanedLabel] : [cleanedLabel];

		const values: Record<string, unknown> = {};
		if (options?.valueCols) {
			for (const [valKey, colIdx] of Object.entries(options.valueCols)) {
				values[valKey] = row.cells[colIdx] ?? null;
			}
		}

		const node: HierarchyNode = {
			index: nodes.length,
			rowIndex: row.rowIndex,
			label: cleanedLabel,
			...(code !== undefined && { code }),
			level,
			parentIndex: parent ? parent.index : null,
			path,
			values,
			children: [],
		};

		nodes.push(node);
		if (parent) {
			parent.children.push(node);
		} else {
			roots.push(node);
		}
		ancestorStack.push(node);
	}

	return { nodes, roots };
}

function splitBandByColumnInterval(
	band: readonly GridRow[],
	startCol: number,
	endCol: number,
	treatRowGapsAsBlank: boolean,
): GridRow[][] {
	const subBands: GridRow[][] = [];
	let curSub: GridRow[] = [];

	for (const row of band) {
		const sliceCells = row.cells.slice(startCol, endCol + 1);
		const hasSliceData = sliceCells.some((c) => !isCellValueEmpty(c));
		if (!hasSliceData) {
			if (curSub.length > 0) {
				subBands.push(curSub);
				curSub = [];
			}
			continue;
		}
		const prev = curSub.at(-1);
		if (treatRowGapsAsBlank && prev && row.rowIndex > prev.rowIndex + 1) {
			subBands.push(curSub);
			curSub = [row];
		} else {
			curSub.push(row);
		}
	}
	if (curSub.length > 0) {
		subBands.push(curSub);
	}

	return subBands;
}

function computePopulatedColBounds(
	subBand: readonly GridRow[],
	startCol: number,
	endCol: number,
): { startCol: number; endCol: number } | null {
	let tightStartCol = -1;
	let tightEndCol = -1;
	for (let c = startCol; c <= endCol; c += 1) {
		const hasData = subBand.some((row) => !isCellValueEmpty(row.cells[c]));
		if (hasData) {
			if (tightStartCol === -1) {
				tightStartCol = c;
			}
			tightEndCol = c;
		}
	}
	return tightStartCol === -1 ? null : { startCol: tightStartCol, endCol: tightEndCol };
}

function buildDiscoveredRegionFromSubBand(
	subBand: readonly GridRow[],
	startCol: number,
	endCol: number,
	minRows: number,
	minCols: number,
	regionIndex: number,
): DiscoveredRegion | null {
	const firstRow = subBand[0];
	const lastRow = subBand.at(-1);
	if (!firstRow || !lastRow) {
		return null;
	}

	const startRow = firstRow.rowIndex;
	const endRow = lastRow.rowIndex;
	const rowCount = subBand.length;
	const colCount = endCol - startCol + 1;

	if (rowCount < minRows || colCount < minCols) {
		return null;
	}

	let nonEmptyCount = 0;
	const slicedRows: GridRow[] = [];

	for (const r of subBand) {
		const cells: unknown[] = [];
		for (let c = startCol; c <= endCol; c += 1) {
			const val = r.cells[c] ?? null;
			if (!isCellValueEmpty(val)) {
				nonEmptyCount += 1;
			}
			cells.push(val);
		}
		slicedRows.push({
			rowIndex: r.rowIndex,
			hidden: r.hidden,
			...(r.outlineLevel !== undefined && { outlineLevel: r.outlineLevel }),
			cells,
		});
	}

	const headerPreview = (slicedRows[0]?.cells ?? [])
		.map((c) => normalizeCellText(c))
		.filter((t) => t.length > 0);

	return {
		id: `region_${regionIndex}`,
		startRow,
		endRow,
		startCol,
		endCol,
		rowCount,
		colCount,
		nonEmptyCount,
		headerPreview,
		rows: slicedRows,
	};
}

// Pattern I — discoverRegions
export function discoverRegions(
	grid: readonly GridRow[],
	options?: DiscoverRegionsOptions,
): DiscoveredRegion[] {
	const minRows = options?.minRows ?? 1;
	const minCols = options?.minCols ?? 1;
	const treatRowGapsAsBlank = options?.treatRowGapsAsBlank ?? true;

	// Group rows into horizontal bands separated by physically empty rows (and optionally rowIndex gaps > 1).
	const rowBands: GridRow[][] = [];
	let currentBand: GridRow[] = [];

	for (const row of grid) {
		const hasData = row.cells.some((c) => !isCellValueEmpty(c));
		if (!hasData) {
			if (currentBand.length > 0) {
				rowBands.push(currentBand);
				currentBand = [];
			}
			continue;
		}
		const prevRow = currentBand.at(-1);
		if (treatRowGapsAsBlank && prevRow && row.rowIndex > prevRow.rowIndex + 1) {
			rowBands.push(currentBand);
			currentBand = [row];
		} else {
			currentBand.push(row);
		}
	}
	if (currentBand.length > 0) {
		rowBands.push(currentBand);
	}

	if (rowBands.length === 0) {
		return [];
	}

	const regions: DiscoveredRegion[] = [];

	for (const band of rowBands) {
		let maxCol = 0;
		for (const row of band) {
			if (row.cells.length > maxCol) {
				maxCol = row.cells.length;
			}
		}

		// Find contiguous non-empty column intervals within this horizontal band.
		const colIntervals: Array<{ startCol: number; endCol: number }> = [];
		let intervalStart = -1;

		for (let c = 0; c < maxCol; c += 1) {
			const colHasData = band.some((row) => !isCellValueEmpty(row.cells[c]));
			if (colHasData) {
				if (intervalStart === -1) {
					intervalStart = c;
				}
			} else if (intervalStart !== -1) {
				colIntervals.push({ startCol: intervalStart, endCol: c - 1 });
				intervalStart = -1;
			}
		}
		if (intervalStart !== -1) {
			colIntervals.push({ startCol: intervalStart, endCol: maxCol - 1 });
		}

		for (const interval of colIntervals) {
			const subBands = splitBandByColumnInterval(
				band,
				interval.startCol,
				interval.endCol,
				treatRowGapsAsBlank,
			);
			for (const subBand of subBands) {
				const tightBounds = computePopulatedColBounds(
					subBand,
					interval.startCol,
					interval.endCol,
				);
				const region =
					tightBounds === null
						? null
						: buildDiscoveredRegionFromSubBand(
								subBand,
								tightBounds.startCol,
								tightBounds.endCol,
								minRows,
								minCols,
								regions.length + 1,
							);
				if (region !== null) {
					regions.push(region);
				}
			}
		}
	}

	return regions;
}

// Pattern J — flattenMergedHeaders
export function flattenMergedHeaders(
	sheet: WorksheetModel,
	options?: FlattenMergedHeadersOptions,
): FlattenedHeaderColumn[] {
	const separator = options?.separator ?? " / ";
	const deduplicatePathSegments = options?.deduplicatePathSegments !== false;

	let targetRowIndices: number[];
	if (Array.isArray(options?.headerRows)) {
		targetRowIndices = [...options.headerRows];
	} else if (options?.headerRows && "startRow" in options.headerRows) {
		const { startRow, endRow } = options.headerRows;
		const lo = Math.min(startRow, endRow);
		const hi = Math.max(startRow, endRow);
		targetRowIndices = [];
		for (let r = lo; r <= hi; r += 1) {
			targetRowIndices.push(r);
		}
	} else {
		targetRowIndices = [1, 2];
	}

	const grid = sheetToGrid(sheet, {
		preserveEmptyRows: true,
		expandMergedCells: "top-left",
	});

	const rowMap = new Map<number, GridRow>();
	let maxColCount = 0;
	for (const row of grid) {
		rowMap.set(row.rowIndex, row);
		if (row.cells.length > maxColCount) {
			maxColCount = row.cells.length;
		}
	}

	if (maxColCount === 0) {
		return [];
	}

	const columns: FlattenedHeaderColumn[] = [];

	for (let colIdx = 0; colIdx < maxColCount; colIdx += 1) {
		const path: string[] = [];
		for (const rowIdx of targetRowIndices) {
			const row = rowMap.get(rowIdx);
			const text = normalizeCellText(row?.cells[colIdx]);
			if (text.length > 0 && (!deduplicatePathSegments || path.at(-1) !== text)) {
				path.push(text);
			}
		}

		const colLetter = colToLetter(colIdx);
		const key = path.length > 0 ? path.join(separator) : colLetter;
		columns.push({
			colIndex: colIdx,
			colLetter,
			path,
			key,
		});
	}

	return columns;
}
