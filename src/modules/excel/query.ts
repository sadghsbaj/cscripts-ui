import {
	type AutoFitOptions,
	type ExcelTheme,
	type TableTotalsValue,
	createWorkbookBuilder,
} from "./builder.ts";
import { formatCellRef } from "./coords.ts";
import { parseDateValue } from "./dates.ts";
import { ExcelError } from "./errors.ts";
import { type FuzzyMatchOptions, createAliasResolver, sheetToGrid } from "./scanner.ts";
import type {
	AggregationKind,
	CellModel,
	CellScalar,
	CellStatus,
	DiagnosticSeverity,
	ExcelDateSystem,
	GridRow,
	HiddenRowPolicy,
	JoinMode,
	SortDirection,
	TableColumnSpec,
	TimeBucket,
	WorkbookModel,
	WorksheetModel,
} from "./types.ts";
import {
	type HybridValue,
	type ThresholdParseOptions,
	compareMissingLast,
	compareNatural,
	formatCellDisplay,
	normalizeCellText,
	parseLocaleNumber,
	parseThresholdValue,
} from "./values.ts";

export interface StandardSchemaIssue {
	readonly message: string;
	readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
}

export type StandardSchemaResult<Output> =
	| { readonly value: Output; readonly issues?: undefined }
	| { readonly issues: ReadonlyArray<StandardSchemaIssue> };

export interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
		readonly types?: { readonly input: Input; readonly output: Output };
	};
}

export interface ExtractionDiagnostic {
	severity: DiagnosticSeverity;
	sheet: string;
	ref?: string;
	row?: number;
	col?: number;
	field?: string;
	code?: string;
	message: string;
}

export interface SheetToRecordsColumnMapping {
	field: string;
	aliases?: readonly string[];
	required?: boolean;
	parse?: (value: unknown, context: { row: number; col: number; ref: string }) => unknown;
}

export interface SheetToRecordsOptions<T = Record<string, unknown>> {
	sheetName?: string;
	headerRow?: number;
	columns?: readonly SheetToRecordsColumnMapping[];
	fuzzy?: FuzzyMatchOptions;
	hiddenPolicy?: HiddenRowPolicy;
	expandMergedCells?: "none" | "top-left";
	schema?: StandardSchemaV1<unknown, T>;
	skipEmptyRows?: boolean;
	onInvalidRow?: "skip" | "include";
}

export interface RecordsExtractionResult<T> {
	records: T[];
	diagnostics: ExtractionDiagnostic[];
	headerRowIndex: number | null;
	mappedColumns: Record<string, number>;
}

export interface RecordsToSheetOptions {
	sheetName?: string;
	theme?: ExcelTheme;
	dateSystem?: ExcelDateSystem;
	subHeaderRow?:
		| boolean
		| Readonly<Record<string, string>>
		| readonly (string | undefined)[];
	totalsRow?:
		| Readonly<Record<string, TableTotalsValue>>
		| readonly (TableTotalsValue | undefined)[];
	freezeHeader?: boolean;
	autoFilter?: boolean;
	autoFit?: boolean | AutoFitOptions;
}

export interface WorkbookToJsonOptions {
	sheetFilter?: string[] | ((name: string) => boolean);
	includeHiddenSheets?: boolean;
	headerRow?: number;
	formatDates?: "iso" | "date" | "display";
}

export interface JsonToWorkbookOptions {
	flattenNested?: boolean;
	theme?: ExcelTheme;
	dateSystem?: ExcelDateSystem;
}

export interface CanonicalizeRule {
	match: "equals" | "startsWith" | "contains";
	pattern: string;
	replacement: string;
	caseSensitive?: boolean;
	scopeField?: string;
	scopeValue?: unknown;
}

export interface SortSpec<T> {
	field?: keyof T | ((row: T) => unknown);
	direction: SortDirection;
	natural?: boolean;
	thresholdOptions?: ThresholdParseOptions;
	locale?: string;
	comparator?: (a: T, b: T) => number;
}

export interface PivotMeasureConfig<T> {
	name: string;
	field?: keyof T | ((row: T) => unknown);
	aggregation: AggregationKind | ((values: readonly unknown[], rows: readonly T[]) => unknown);
	weightField?: keyof T | ((row: T) => unknown);
	denominatorField?: keyof T | ((row: T) => unknown);
	predicate?: (row: T) => boolean;
	/**
	 * Percentile in `[0, 1]` fraction scale (e.g. `0.01` = 1st, `0.5` = 50th, `1` = 100th).
	 * Values `> 1` up to `100` are convenience-scaled by `/ 100` (e.g. `75` = 75th percentile).
	 */
	percentile?: number;
	thresholdPolicy?: "ignore" | "bound" | "half" | "zero" | "scaled";
	thresholdOptions?: ThresholdParseOptions;
}

export interface PivotConfig<T> {
	groupBy?: ReadonlyArray<keyof T>;
	timeBucket?: {
		field: keyof T;
		bucket: TimeBucket;
		outputField?: string;
		dateSystem?: ExcelDateSystem;
	};
	measures: readonly PivotMeasureConfig<T>[];
}

export interface UnpivotConfig<T> {
	idFields: ReadonlyArray<keyof T>;
	valueFields?: ReadonlyArray<keyof T>;
	variableField?: string;
	valueField?: string;
	skipEmpty?: boolean;
}

export interface TableProjectionColumn {
	id: string;
	label: string;
	subLabel?: string;
	align: "left" | "center" | "right";
	width?: number;
}

export interface TableProjectionCell {
	colId: string;
	raw: unknown;
	display: string;
	numeric: number | null;
	sortValue: number;
	status: CellStatus;
	align: "left" | "center" | "right";
}

export interface TableProjectionRow {
	key: string;
	cells: TableProjectionCell[];
}

export interface TableProjection {
	columns: TableProjectionColumn[];
	headers: string[];
	subHeaders: string[];
	rows: TableProjectionRow[];
	footer?: TableProjectionCell[];
	frozenRows: number;
	frozenCols: number;
}

export interface ProjectTableConfig<TRow> {
	columns: readonly TableColumnSpec<TRow>[];
	keyField?: keyof TRow | ((row: TRow, index: number) => string);
	footer?: Readonly<Record<string, unknown>>;
	frozenRows?: number;
	frozenCols?: number;
	dateSystem?: ExcelDateSystem;
	locale?: string;
	thresholdOptions?: ThresholdParseOptions;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
	return (
		value !== null &&
		typeof value === "object" &&
		"then" in value &&
		typeof (value as { then?: unknown }).then === "function"
	);
}

const HYBRID_KINDS = new Set(["number", "threshold", "missing", "text"]);

function isHybridValue(value: unknown): value is HybridValue {
	if (typeof value !== "object" || value === null || value instanceof Date) {
		return false;
	}
	const candidate = value as Record<string, unknown>;
	return (
		typeof candidate.kind === "string" &&
		HYBRID_KINDS.has(candidate.kind) &&
		typeof candidate.display === "string" &&
		typeof candidate.sortValue === "number" &&
		"raw" in candidate &&
		"numeric" in candidate
	);
}

function isEmptyValue(value: unknown, emptyValues?: readonly unknown[]): boolean {
	if (value === null || value === undefined) {
		return true;
	}
	if (typeof value === "string" && normalizeCellText(value).length === 0) {
		return true;
	}
	if (emptyValues && emptyValues.length > 0) {
		const normalized =
			typeof value === "string" ? normalizeCellText(value).toLowerCase() : value;
		for (const candidate of emptyValues) {
			if (candidate === value) {
				return true;
			}
			if (
				typeof candidate === "string" &&
				typeof normalized === "string" &&
				normalizeCellText(candidate).toLowerCase() === normalized
			) {
				return true;
			}
		}
	}
	return false;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null || value instanceof Date || Array.isArray(value)) {
		return false;
	}
	const proto = Object.getPrototypeOf(value) as unknown;
	return proto === Object.prototype || proto === null;
}

function encodeKeyPart(value: unknown): string {
	if (value === null) {
		return "null:";
	}
	if (value === undefined) {
		return "undef:";
	}
	if (value instanceof Date) {
		return `date:${Number.isNaN(value.getTime()) ? "NaN" : String(value.getTime())}`;
	}
	if (typeof value === "number") {
		return `num:${String(value)}`;
	}
	if (typeof value === "boolean") {
		return `bool:${value ? "1" : "0"}`;
	}
	return `str:${String(value)}`;
}

function buildCompositeKey(parts: readonly unknown[]): string {
	return JSON.stringify(parts.map((part) => encodeKeyPart(part)));
}

function isNonJoinableKeyPart(value: unknown): boolean {
	return (
		value === null ||
		value === undefined ||
		(typeof value === "number" && Number.isNaN(value)) ||
		(value instanceof Date && Number.isNaN(value.getTime()))
	);
}

function buildJoinKey(parts: readonly unknown[]): string | null {
	for (const part of parts) {
		if (isNonJoinableKeyPart(part)) {
			return null;
		}
	}
	return buildCompositeKey(parts);
}

function disambiguateUniqueName(base: string, usedNames: Set<string>): string {
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

function readField<T>(row: T, field: keyof T | ((r: T) => unknown) | undefined): unknown {
	if (field === undefined) {
		return undefined;
	}
	if (typeof field === "function") {
		return field(row);
	}
	return (row as Record<string, unknown>)[String(field)];
}

function extractIssueField(issue: StandardSchemaIssue): string | undefined {
	const firstSeg = issue.path?.[0];
	if (firstSeg === undefined) {
		return undefined;
	}
	if (typeof firstSeg === "object" && firstSeg !== null && "key" in firstSeg) {
		return String(firstSeg.key);
	}
	return String(firstSeg);
}

function buildAliasMap(
	columns: readonly SheetToRecordsColumnMapping[],
): Record<string, readonly string[]> {
	const aliasMap: Record<string, readonly string[]> = {};
	for (const col of columns) {
		aliasMap[col.field] = [col.field, ...(col.aliases ?? [])];
	}
	return aliasMap;
}

function countMatchedFieldsInRow(
	row: GridRow,
	resolver: (input: string) => string | null,
): number {
	const matched = new Set<string>();
	for (const cell of row.cells) {
		const text = normalizeCellText(cell);
		if (text.length === 0) {
			continue;
		}
		const field = resolver(text);
		if (field !== null) {
			matched.add(field);
		}
	}
	return matched.size;
}

function detectHeaderGridIndex(
	grid: readonly GridRow[],
	explicitHeaderRow: number | undefined,
	resolver: ((input: string) => string | null) | null,
): number {
	if (explicitHeaderRow !== undefined) {
		return grid.findIndex((row) => row.rowIndex === explicitHeaderRow);
	}

	if (resolver !== null) {
		const searchLimit = Math.min(20, grid.length);
		let bestIdx = -1;
		let bestMatchCount = 0;
		for (let i = 0; i < searchLimit; i += 1) {
			const row = grid[i];
			if (!row) {
				continue;
			}
			const count = countMatchedFieldsInRow(row, resolver);
			if (count > bestMatchCount) {
				bestMatchCount = count;
				bestIdx = i;
			}
		}
		if (bestIdx !== -1) {
			return bestIdx;
		}
	}

	const firstNonEmpty = grid.findIndex((row) => row.cells.some((c) => !isEmptyValue(c)));
	return firstNonEmpty === -1 ? 0 : firstNonEmpty;
}

function extractRawRecordFromRow(
	row: GridRow,
	sheetName: string,
	columns: readonly SheetToRecordsColumnMapping[] | undefined,
	mappedColumns: Record<string, number>,
	diagnostics: ExtractionDiagnostic[],
): Record<string, unknown> {
	const rawRecord: Record<string, unknown> = {};
	const zeroBasedRow = Math.max(0, row.rowIndex - 1);

	if (columns) {
		for (const colSpec of columns) {
			const colIdx = mappedColumns[colSpec.field];
			if (colIdx === undefined) {
				continue;
			}
			const rawVal = row.cells[colIdx] ?? null;
			const ref = formatCellRef(colIdx, zeroBasedRow);
			if (colSpec.parse) {
				try {
					rawRecord[colSpec.field] = colSpec.parse(rawVal, {
						row: row.rowIndex,
						col: colIdx,
						ref,
					});
				} catch (error) {
					diagnostics.push({
						severity: "negative",
						sheet: sheetName,
						ref,
						row: row.rowIndex,
						col: colIdx,
						field: colSpec.field,
						code: "PARSE_ERROR",
						message: error instanceof Error ? error.message : String(error),
					});
					rawRecord[colSpec.field] = rawVal;
				}
			} else {
				rawRecord[colSpec.field] = rawVal;
			}
		}
	} else {
		for (const [field, colIdx] of Object.entries(mappedColumns)) {
			rawRecord[field] = row.cells[colIdx] ?? null;
		}
	}

	return rawRecord;
}

export function sheetToRecords<T = Record<string, unknown>>(
	sheetOrGrid: WorksheetModel | readonly GridRow[],
	options?: SheetToRecordsOptions<T>,
): RecordsExtractionResult<T> {
	const isGrid = Array.isArray(sheetOrGrid);
	const sheetName = options?.sheetName ?? (isGrid ? "Sheet1" : (sheetOrGrid as WorksheetModel).name);
	const grid: readonly GridRow[] = isGrid
		? (sheetOrGrid as readonly GridRow[])
		: sheetToGrid(sheetOrGrid as WorksheetModel, {
				hiddenPolicy: options?.hiddenPolicy ?? "include",
				preserveEmptyRows: false,
				expandMergedCells: options?.expandMergedCells ?? "none",
			});

	const diagnostics: ExtractionDiagnostic[] = [];
	const mappedColumns: Record<string, number> = {};

	if (grid.length === 0) {
		if (options?.columns) {
			for (const col of options.columns) {
				if (col.required) {
					diagnostics.push({
						severity: "negative",
						sheet: sheetName,
						field: col.field,
						code: "MISSING_REQUIRED_COLUMN",
						message: `Required column "${col.field}" was not found in empty sheet "${sheetName}".`,
					});
				}
			}
		}
		return { records: [], diagnostics, headerRowIndex: null, mappedColumns };
	}

	const resolver =
		options?.columns && options.columns.length > 0
			? createAliasResolver(buildAliasMap(options.columns), options.fuzzy)
			: null;

	const headerGridIdx = detectHeaderGridIndex(grid, options?.headerRow, resolver);
	const headerRow = grid[headerGridIdx];

	if (!headerRow) {
		if (options?.headerRow !== undefined) {
			diagnostics.push({
				severity: "negative",
				sheet: sheetName,
				row: options.headerRow,
				code: "HEADER_NOT_FOUND",
				message: `Header row ${String(options.headerRow)} was not found in sheet "${sheetName}".`,
			});
		}
		if (options?.columns) {
			for (const col of options.columns) {
				if (col.required) {
					diagnostics.push({
						severity: "negative",
						sheet: sheetName,
						field: col.field,
						code: "MISSING_REQUIRED_COLUMN",
						message: `Required column "${col.field}" was not found in sheet "${sheetName}".`,
					});
				}
			}
		}
		return { records: [], diagnostics, headerRowIndex: null, mappedColumns };
	}

	if (options?.columns && resolver !== null) {
		for (const [colIdx, cell] of headerRow.cells.entries()) {
			const text = normalizeCellText(cell);
			if (text.length === 0) {
				continue;
			}
			const field = resolver(text);
			if (field !== null && mappedColumns[field] === undefined) {
				mappedColumns[field] = colIdx;
			}
		}
		for (const col of options.columns) {
			if (col.required && mappedColumns[col.field] === undefined) {
				diagnostics.push({
					severity: "negative",
					sheet: sheetName,
					row: headerRow.rowIndex,
					field: col.field,
					code: "MISSING_REQUIRED_COLUMN",
					message: `Required column "${col.field}" was not found in header row ${String(headerRow.rowIndex)}.`,
				});
			}
		}
	} else {
		const usedNames = new Set<string>();
		for (const [colIdx, cell] of headerRow.cells.entries()) {
			const text = normalizeCellText(cell);
			if (text.length === 0) {
				continue;
			}
			const fieldName = disambiguateUniqueName(text, usedNames);
			mappedColumns[fieldName] = colIdx;
		}
	}

	const mappedColIndices = Object.values(mappedColumns);
	const skipEmptyRows = options?.skipEmptyRows ?? true;
	const onInvalidRow = options?.onInvalidRow ?? "skip";
	const records: T[] = [];

	for (let i = headerGridIdx + 1; i < grid.length; i += 1) {
		const row = grid[i];
		if (!row) {
			continue;
		}

		if (skipEmptyRows) {
			const hasValue =
				mappedColIndices.length > 0
					? mappedColIndices.some((colIdx) => !isEmptyValue(row.cells[colIdx]))
					: row.cells.some((cell) => !isEmptyValue(cell));
			if (!hasValue) {
				continue;
			}
		}

		const zeroBasedRow = Math.max(0, row.rowIndex - 1);
		const rawRecord = extractRawRecordFromRow(
			row,
			sheetName,
			options?.columns,
			mappedColumns,
			diagnostics,
		);

		if (options?.schema) {
			let validationResult: ReturnType<(typeof options.schema)["~standard"]["validate"]>;
			try {
				validationResult = options.schema["~standard"].validate(rawRecord);
			} catch (error) {
				diagnostics.push({
					severity: "negative",
					sheet: sheetName,
					row: row.rowIndex,
					code: "SCHEMA_VALIDATION_FAILED",
					message:
						error instanceof Error && error.message.length > 0
							? error.message
							: "Schema validation threw an error.",
				});
				if (onInvalidRow === "include") {
					records.push(rawRecord as T);
				}
				continue;
			}

			if (isThenable(validationResult)) {
				throw new ExcelError(
					"INVALID_CONFIG",
					"sheetToRecords only supports synchronous StandardSchemaV1 schemas.",
				);
			}

			const rawResult: unknown = validationResult;
			if (rawResult === null || typeof rawResult !== "object") {
				diagnostics.push({
					severity: "negative",
					sheet: sheetName,
					row: row.rowIndex,
					code: "SCHEMA_VALIDATION_FAILED",
					message: "Schema validation returned an invalid result.",
				});
				if (onInvalidRow === "include") {
					records.push(rawRecord as T);
				}
				continue;
			}

			if ("issues" in validationResult && validationResult.issues !== undefined) {
				if (validationResult.issues.length > 0) {
					for (const issue of validationResult.issues) {
						const field = extractIssueField(issue);
						const colIdx = field !== undefined ? mappedColumns[field] : undefined;
						const ref =
							colIdx !== undefined ? formatCellRef(colIdx, zeroBasedRow) : undefined;
						diagnostics.push({
							severity: "negative",
							sheet: sheetName,
							...(ref !== undefined && { ref }),
							row: row.rowIndex,
							...(colIdx !== undefined && { col: colIdx }),
							...(field !== undefined && { field }),
							code: "SCHEMA_VALIDATION_FAILED",
							message: issue.message,
						});
					}
				} else {
					diagnostics.push({
						severity: "negative",
						sheet: sheetName,
						row: row.rowIndex,
						code: "SCHEMA_VALIDATION_FAILED",
						message: "Schema validation failed.",
					});
				}
				if (onInvalidRow === "include") {
					records.push(rawRecord as T);
				}
				continue;
			}

			records.push(validationResult.value);
		} else {
			records.push(rawRecord as T);
		}
	}

	return {
		records,
		diagnostics,
		headerRowIndex: headerRow.rowIndex,
		mappedColumns,
	};
}

export function recordsToSheet<T = Record<string, unknown>>(
	records: readonly T[],
	columns: readonly TableColumnSpec<T>[],
	options?: RecordsToSheetOptions,
): WorksheetModel {
	const sheetName = options?.sheetName ?? "Sheet1";
	const builder = createWorkbookBuilder({
		theme: options?.theme,
		dateSystem: options?.dateSystem,
	});
	builder.sheet(sheetName, (sheet) => {
		sheet.addTable({
			columns,
			rows: records,
			subHeaderRow: options?.subHeaderRow,
			totalsRow: options?.totalsRow,
			freezeHeader: options?.freezeHeader,
			autoFilter: options?.autoFilter,
			autoFit: options?.autoFit,
		});
	});
	const model = builder.toModel();
	return (
		model.sheets[0] ?? {
			name: sheetName,
			cells: new Map<string, CellModel>(),
		}
	);
}

function formatDateIsoCompact(date: Date): string {
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	const isMidnight =
		date.getUTCHours() === 0 &&
		date.getUTCMinutes() === 0 &&
		date.getUTCSeconds() === 0 &&
		date.getUTCMilliseconds() === 0;
	const iso = date.toISOString();
	return isMidnight ? iso.slice(0, 10) : iso;
}

function matchesSheetFilter(
	name: string,
	filter: string[] | ((sheetName: string) => boolean) | undefined,
): boolean {
	if (filter === undefined) {
		return true;
	}
	if (typeof filter === "function") {
		return filter(name);
	}
	return filter.includes(name);
}

export function workbookToJson(
	workbook: WorkbookModel,
	options?: WorkbookToJsonOptions,
): Record<string, Array<Record<string, unknown>>> {
	const includeHiddenSheets = options?.includeHiddenSheets ?? false;
	const formatDates = options?.formatDates ?? "iso";
	const result: Record<string, Array<Record<string, unknown>>> = {};

	for (const sheet of workbook.sheets) {
		if (!includeHiddenSheets && (sheet.state === "hidden" || sheet.state === "veryHidden")) {
			continue;
		}
		if (!matchesSheetFilter(sheet.name, options?.sheetFilter)) {
			continue;
		}

		const grid = sheetToGrid(sheet, {
			hiddenPolicy: "include",
			preserveEmptyRows: false,
			resolveCell: (cell: CellModel): unknown => {
				const raw =
					cell.value ??
					(cell.richText && cell.richText.length > 0
						? cell.richText.map((run) => run.text).join("")
						: (cell.formula?.cachedResult ?? null));
				if (raw instanceof Date) {
					if (formatDates === "date") {
						return raw;
					}
					if (formatDates === "display") {
						return formatCellDisplay(cell, { dateSystem: workbook.dateSystem });
					}
					return formatDateIsoCompact(raw);
				}
				return raw;
			},
		});

		const extracted = sheetToRecords<Record<string, unknown>>(grid, {
			sheetName: sheet.name,
			headerRow: options?.headerRow,
		});
		result[sheet.name] = extracted.records;
	}

	return result;
}

function flattenRecordObject(
	record: Record<string, unknown>,
	prefix = "",
	target: Record<string, unknown> = {},
): Record<string, unknown> {
	for (const [key, value] of Object.entries(record)) {
		const fullKey = prefix.length > 0 ? `${prefix}.${key}` : key;
		if (isPlainRecord(value)) {
			const entries = Object.entries(value);
			if (entries.length === 0) {
				target[fullKey] = null;
			} else {
				flattenRecordObject(value, fullKey, target);
			}
		} else {
			target[fullKey] = value;
		}
	}
	return target;
}

export function jsonToWorkbook(
	sheets: Record<string, ReadonlyArray<Record<string, unknown>>>,
	options?: JsonToWorkbookOptions,
): WorkbookModel {
	const flattenNested = options?.flattenNested ?? false;
	const builder = createWorkbookBuilder({
		theme: options?.theme,
		dateSystem: options?.dateSystem,
	});

	for (const [sheetName, rawRecords] of Object.entries(sheets)) {
		const rows = flattenNested
			? rawRecords.map((rec) => flattenRecordObject(rec))
			: rawRecords;

		const keySet = new Set<string>();
		for (const row of rows) {
			for (const key of Object.keys(row)) {
				keySet.add(key);
			}
		}

		const columns: TableColumnSpec<Record<string, unknown>>[] = Array.from(
			keySet,
			(key) => ({ id: key, header: key }),
		);

		builder.sheet(sheetName, (sheet) => {
			if (columns.length > 0) {
				sheet.addTable({ columns, rows });
			}
		});
	}

	return builder.toModel();
}

export function fillDownRecords<T extends Record<string, unknown>>(
	records: readonly T[],
	fields: ReadonlyArray<keyof T>,
	options?: { emptyValues?: readonly unknown[] },
): T[] {
	const carried = new Map<keyof T, unknown>();
	const result: T[] = [];

	for (const record of records) {
		const copy = { ...record };
		for (const field of fields) {
			const val = copy[field];
			if (isEmptyValue(val, options?.emptyValues)) {
				if (carried.has(field)) {
					copy[field] = carried.get(field) as T[keyof T];
				}
			} else {
				carried.set(field, val);
			}
		}
		result.push(copy);
	}

	return result;
}

function matchesCanonicalizeRule(
	hay: string,
	needle: string,
	mode: CanonicalizeRule["match"],
): boolean {
	switch (mode) {
		case "equals": {
			return hay === needle;
		}
		case "startsWith": {
			return hay.startsWith(needle);
		}
		case "contains": {
			return hay.includes(needle);
		}
	}
}

function applyCanonicalizeRules(
	current: string,
	record: Record<string, unknown>,
	rules: readonly CanonicalizeRule[],
): string {
	for (const rule of rules) {
		if (rule.scopeField !== undefined && record[rule.scopeField] !== rule.scopeValue) {
			continue;
		}
		const hay = rule.caseSensitive ? current : current.toLowerCase();
		const needle = rule.caseSensitive ? rule.pattern : rule.pattern.toLowerCase();
		if (matchesCanonicalizeRule(hay, needle, rule.match)) {
			return rule.replacement;
		}
	}
	return current;
}

export function canonicalizeValues<T extends Record<string, unknown>>(
	records: readonly T[],
	field: keyof T,
	rules: readonly CanonicalizeRule[],
): T[] {
	const result: T[] = [];

	for (const record of records) {
		const copy = { ...record };
		const current = copy[field];
		if (typeof current === "string") {
			copy[field] = applyCanonicalizeRules(current, copy, rules) as T[keyof T];
		}
		result.push(copy);
	}

	return result;
}

export function deriveField<T extends Record<string, unknown>, K extends string, V>(
	records: readonly T[],
	field: K,
	compute: (row: T, index: number) => V,
): Array<T & Record<K, V>> {
	return records.map((row, index) => ({
		...row,
		[field]: compute(row, index),
	})) as Array<T & Record<K, V>>;
}

export function mapRecords<T, U>(
	records: readonly T[],
	mapper: (row: T, index: number) => U,
): U[] {
	return records.map((row, index) => mapper(row, index));
}

export function filterRecords<T>(
	records: readonly T[],
	predicates:
		| ((row: T, index: number) => boolean)
		| ReadonlyArray<(row: T, index: number) => boolean>,
	options?: { mode?: "and" | "or" },
): T[] {
	const list = typeof predicates === "function" ? [predicates] : predicates;
	if (list.length === 0) {
		return [...records];
	}
	const mode = options?.mode ?? "and";
	return records.filter((row, index) =>
		mode === "or"
			? list.some((pred) => pred(row, index))
			: list.every((pred) => pred(row, index)),
	);
}

function isSortMissing(value: unknown): boolean {
	if (value === null || value === undefined) {
		return true;
	}
	if (typeof value === "number") {
		return !Number.isFinite(value);
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime());
	}
	if (typeof value === "string") {
		return normalizeCellText(value).length === 0;
	}
	if (isHybridValue(value)) {
		return value.kind === "missing" || !Number.isFinite(value.sortValue);
	}
	return false;
}

function compareValuesForSort<T>(valA: unknown, valB: unknown, spec: SortSpec<T>): number {
	const dir: "asc" | "desc" = spec.direction === "desc" ? "desc" : "asc";

	if (spec.thresholdOptions !== undefined || isHybridValue(valA) || isHybridValue(valB)) {
		const hybA = isHybridValue(valA) ? valA : parseThresholdValue(valA, spec.thresholdOptions);
		const hybB = isHybridValue(valB) ? valB : parseThresholdValue(valB, spec.thresholdOptions);
		const numA = hybA.kind === "missing" || !Number.isFinite(hybA.sortValue) ? null : hybA.sortValue;
		const numB = hybB.kind === "missing" || !Number.isFinite(hybB.sortValue) ? null : hybB.sortValue;
		const cmp = compareMissingLast(numA, numB, dir);
		if (cmp !== 0) {
			return cmp;
		}
		if (hybA.kind === "text" && hybB.kind === "text") {
			const textCmp = spec.natural
				? compareNatural(hybA.display, hybB.display, spec.locale)
				: hybA.display.localeCompare(hybB.display, spec.locale);
			return dir === "desc" ? -textCmp : textCmp;
		}
		return 0;
	}

	const aMissing = isSortMissing(valA);
	const bMissing = isSortMissing(valB);
	if (aMissing && bMissing) {
		return 0;
	}
	if (aMissing) {
		return 1;
	}
	if (bMissing) {
		return -1;
	}

	if (typeof valA === "number" && typeof valB === "number") {
		return compareMissingLast(valA, valB, dir);
	}
	if (valA instanceof Date && valB instanceof Date) {
		return compareMissingLast(valA.getTime(), valB.getTime(), dir);
	}
	if (typeof valA === "boolean" && typeof valB === "boolean") {
		return compareMissingLast(valA ? 1 : 0, valB ? 1 : 0, dir);
	}

	const strA = valA instanceof Date ? valA.toISOString() : String(valA);
	const strB = valB instanceof Date ? valB.toISOString() : String(valB);
	const cmp = spec.natural
		? compareNatural(strA, strB, spec.locale)
		: strA.localeCompare(strB, spec.locale);
	return dir === "desc" ? -cmp : cmp;
}

export function sortRecords<T>(
	records: readonly T[],
	sortSpec: SortSpec<T> | readonly SortSpec<T>[],
): T[] {
	const specs = Array.isArray(sortSpec)
		? (sortSpec as readonly SortSpec<T>[])
		: [sortSpec as SortSpec<T>];
	const activeSpecs = specs.filter((spec) => spec.direction !== "none");
	if (activeSpecs.length === 0) {
		return [...records];
	}

	return records.toSorted((a, b) => {
		for (const spec of activeSpecs) {
			if (spec.comparator) {
				const cmp = spec.comparator(a, b);
				if (cmp !== 0) {
					return spec.direction === "desc" ? -cmp : cmp;
				}
				continue;
			}
			const valA = readField(a, spec.field);
			const valB = readField(b, spec.field);
			const cmp = compareValuesForSort(valA, valB, spec);
			if (cmp !== 0) {
				return cmp;
			}
		}
		return 0;
	});
}

function formatTimeBucket(
	raw: unknown,
	bucket: TimeBucket,
	dateSystem: ExcelDateSystem,
): string | null {
	const isoDate = parseDateValue(raw, { dateSystem });
	if (isoDate === null) {
		return null;
	}
	const year = isoDate.slice(0, 4);
	const month = Number(isoDate.slice(5, 7));
	switch (bucket) {
		case "day": {
			return isoDate;
		}
		case "month": {
			return isoDate.slice(0, 7);
		}
		case "quarter": {
			const quarter = Math.floor((month - 1) / 3) + 1;
			return `${year}-Q${String(quarter)}`;
		}
		case "year": {
			return year;
		}
	}
}

function extractNumericForPivot(
	value: unknown,
	thresholdPolicy: "ignore" | "bound" | "half" | "zero" | "scaled",
	thresholdOptions?: ThresholdParseOptions,
): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (value === null || value === undefined) {
		return null;
	}
	const hybrid = isHybridValue(value) ? value : parseThresholdValue(value, thresholdOptions);
	if (hybrid.kind === "number") {
		return hybrid.numeric;
	}
	if (hybrid.kind === "threshold") {
		switch (thresholdPolicy) {
			case "ignore": {
				return null;
			}
			case "bound": {
				return hybrid.bound ?? null;
			}
			case "half": {
				return hybrid.bound === undefined ? null : hybrid.bound * 0.5;
			}
			case "zero": {
				return 0;
			}
			case "scaled": {
				return Number.isFinite(hybrid.sortValue) ? hybrid.sortValue : null;
			}
		}
	}
	return null;
}

function computePercentile(numbers: readonly number[], rawPercentile: number): number | null {
	if (numbers.length === 0 || !Number.isFinite(rawPercentile)) {
		return null;
	}
	const sorted = numbers.toSorted((a, b) => a - b);
	if (sorted.length === 1) {
		return sorted[0] ?? null;
	}
	const normalizedP = rawPercentile > 1 ? rawPercentile / 100 : rawPercentile;
	const p = Math.max(0, Math.min(1, normalizedP));
	const idx = p * (sorted.length - 1);
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	const loVal = sorted[lo] ?? 0;
	const hiVal = sorted[hi] ?? loVal;
	return loVal + (hiVal - loVal) * (idx - lo);
}

function evaluatePivotMeasure<T>(
	measure: PivotMeasureConfig<T>,
	rows: readonly T[],
): unknown {
	const rawValues =
		measure.field !== undefined ? rows.map((row) => readField(row, measure.field)) : [];

	if (typeof measure.aggregation === "function") {
		return measure.aggregation(rawValues, rows);
	}

	const policy = measure.thresholdPolicy ?? "ignore";
	const extractNums = (): number[] => {
		const nums: number[] = [];
		for (const val of rawValues) {
			const n = extractNumericForPivot(val, policy, measure.thresholdOptions);
			if (n !== null) {
				nums.push(n);
			}
		}
		return nums;
	};

	switch (measure.aggregation) {
		case "sum": {
			const nums = extractNums();
			let total = 0;
			for (const n of nums) {
				total += n;
			}
			return total;
		}
		case "avg": {
			const nums = extractNums();
			if (nums.length === 0) {
				return null;
			}
			let total = 0;
			for (const n of nums) {
				total += n;
			}
			return total / nums.length;
		}
		case "weightedAvg": {
			let weightedSum = 0;
			let totalWeight = 0;
			for (const row of rows) {
				const v = extractNumericForPivot(
					readField(row, measure.field),
					policy,
					measure.thresholdOptions,
				);
				const w = extractNumericForPivot(
					readField(row, measure.weightField),
					policy,
					measure.thresholdOptions,
				);
				if (v !== null && w !== null) {
					weightedSum += v * w;
					totalWeight += w;
				}
			}
			return totalWeight === 0 ? null : weightedSum / totalWeight;
		}
		case "min": {
			const nums = extractNums();
			if (nums.length === 0) {
				return null;
			}
			let minVal = nums[0] ?? 0;
			for (let i = 1; i < nums.length; i += 1) {
				const n = nums[i];
				if (n !== undefined && n < minVal) {
					minVal = n;
				}
			}
			return minVal;
		}
		case "max": {
			const nums = extractNums();
			if (nums.length === 0) {
				return null;
			}
			let maxVal = nums[0] ?? 0;
			for (let i = 1; i < nums.length; i += 1) {
				const n = nums[i];
				if (n !== undefined && n > maxVal) {
					maxVal = n;
				}
			}
			return maxVal;
		}
		case "count": {
			if (measure.field === undefined) {
				return rows.length;
			}
			let count = 0;
			for (const val of rawValues) {
				if (!isEmptyValue(val)) {
					count += 1;
				}
			}
			return count;
		}
		case "countIf": {
			if (!measure.predicate) {
				return 0;
			}
			let count = 0;
			for (const row of rows) {
				if (measure.predicate(row)) {
					count += 1;
				}
			}
			return count;
		}
		case "median": {
			return computePercentile(extractNums(), 0.5);
		}
		case "percentile": {
			return computePercentile(extractNums(), measure.percentile ?? 0.5);
		}
		case "rate": {
			let numSum = 0;
			let denSum = 0;
			for (const row of rows) {
				const n = extractNumericForPivot(
					readField(row, measure.field),
					policy,
					measure.thresholdOptions,
				);
				const d = extractNumericForPivot(
					readField(row, measure.denominatorField),
					policy,
					measure.thresholdOptions,
				);
				if (n !== null) {
					numSum += n;
				}
				if (d !== null) {
					denSum += d;
				}
			}
			return denSum === 0 ? null : numSum / denSum;
		}
		case "first": {
			for (const val of rawValues) {
				if (!isEmptyValue(val)) {
					return val;
				}
			}
			return null;
		}
		case "last": {
			for (let i = rawValues.length - 1; i >= 0; i -= 1) {
				const val = rawValues[i];
				if (!isEmptyValue(val)) {
					return val;
				}
			}
			return null;
		}
	}
}

export function pivotRecords<T extends Record<string, unknown>>(
	records: readonly T[],
	config: PivotConfig<T>,
): Array<Record<string, unknown>> {
	const groupBy = config.groupBy ?? [];
	const timeBucket = config.timeBucket;
	const bucketOutputField = timeBucket
		? (timeBucket.outputField ?? String(timeBucket.field))
		: null;
	const dateSystem = timeBucket?.dateSystem ?? 1900;

	const groups = new Map<string, { groupRecord: Record<string, unknown>; rows: T[] }>();

	for (const row of records) {
		const keyParts: unknown[] = [];
		const groupRecord: Record<string, unknown> = {};

		for (const field of groupBy) {
			const val = row[field];
			keyParts.push(val);
			groupRecord[String(field)] = val;
		}

		if (timeBucket && bucketOutputField !== null) {
			const bucketVal = formatTimeBucket(row[timeBucket.field], timeBucket.bucket, dateSystem);
			keyParts.push(bucketVal);
			groupRecord[bucketOutputField] = bucketVal;
		}

		const groupKey = buildCompositeKey(keyParts);
		const existing = groups.get(groupKey);
		if (existing) {
			existing.rows.push(row);
		} else {
			groups.set(groupKey, { groupRecord, rows: [row] });
		}
	}

	const output: Array<Record<string, unknown>> = [];
	for (const { groupRecord, rows } of groups.values()) {
		const entry: Record<string, unknown> = { ...groupRecord };
		for (const measure of config.measures) {
			entry[measure.name] = evaluatePivotMeasure(measure, rows);
		}
		output.push(entry);
	}

	return output;
}

function unpivotSingleRecord<T extends Record<string, unknown>>(
	record: T,
	idFields: ReadonlyArray<keyof T>,
	targetValueFields: readonly string[],
	variableField: string,
	valueField: string,
	skipEmpty: boolean,
	output: Array<Record<string, unknown>>,
): void {
	const idPart: Record<string, unknown> = {};
	for (const idField of idFields) {
		idPart[String(idField)] = record[idField];
	}

	for (const field of targetValueFields) {
		const val = record[field];
		if (skipEmpty && isEmptyValue(val)) {
			continue;
		}
		output.push({
			...idPart,
			[variableField]: field,
			[valueField]: val ?? null,
		});
	}
}

export function unpivotRecords<T extends Record<string, unknown>>(
	records: readonly T[],
	config: UnpivotConfig<T>,
): Array<Record<string, unknown>> {
	const idSet = new Set<string>(config.idFields.map(String));
	const variableField = config.variableField ?? "variable";
	const valueField = config.valueField ?? "value";
	const skipEmpty = config.skipEmpty ?? false;
	const explicitValueFields = config.valueFields ? config.valueFields.map(String) : null;
	const result: Array<Record<string, unknown>> = [];

	for (const record of records) {
		const targetValueFields =
			explicitValueFields ?? Object.keys(record).filter((k) => !idSet.has(k));
		unpivotSingleRecord(
			record,
			config.idFields,
			targetValueFields,
			variableField,
			valueField,
			skipEmpty,
			result,
		);
	}

	return result;
}

function toFiniteNumber(value: unknown): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (isHybridValue(value)) {
		return value.numeric;
	}
	return parseLocaleNumber(value);
}

export function computeRunningTotals<T extends Record<string, unknown>>(
	records: readonly T[],
	options: {
		valueField: keyof T;
		outputField: string;
		groupBy?: ReadonlyArray<keyof T>;
	},
): Array<T & Record<string, number>> {
	const groupBy = options.groupBy ?? [];
	const runningByGroup = new Map<string, number>();

	return records.map((record) => {
		const key =
			groupBy.length > 0
				? buildCompositeKey(groupBy.map((field) => record[field]))
				: "__all__";
		const num = toFiniteNumber(record[options.valueField]) ?? 0;
		const nextTotal = (runningByGroup.get(key) ?? 0) + num;
		runningByGroup.set(key, nextTotal);
		return {
			...record,
			[options.outputField]: nextTotal,
		} as T & Record<string, number>;
	});
}

function comparePeriodValues(a: unknown, b: unknown): number {
	const aMissing = isSortMissing(a);
	const bMissing = isSortMissing(b);
	if (aMissing && bMissing) {
		return 0;
	}
	if (aMissing) {
		return 1;
	}
	if (bMissing) {
		return -1;
	}
	if (typeof a === "number" && typeof b === "number") {
		return a - b;
	}
	if (a instanceof Date && b instanceof Date) {
		return a.getTime() - b.getTime();
	}
	return compareNatural(String(a), String(b));
}

function computePartitionPeriodDeltas<T extends Record<string, unknown>>(
	indices: readonly number[],
	records: readonly T[],
	valueField: keyof T,
	periodField: keyof T,
	deltas: Array<{ abs: number | null; rel: number | null }>,
): void {
	const ordered = indices.toSorted((idxA, idxB) => {
		const rowA = records[idxA];
		const rowB = records[idxB];
		return comparePeriodValues(rowA?.[periodField], rowB?.[periodField]);
	});

	let prevVal: number | null = null;
	for (const [i, rowIdx] of ordered.entries()) {
		const currVal = toFiniteNumber(records[rowIdx]?.[valueField]);
		if (i > 0 && currVal !== null && prevVal !== null) {
			const abs = currVal - prevVal;
			const rel = prevVal !== 0 ? abs / Math.abs(prevVal) : null;
			deltas[rowIdx] = { abs, rel };
		} else {
			deltas[rowIdx] = { abs: null, rel: null };
		}
		prevVal = currVal;
	}
}

export function computePeriodDeltas<T extends Record<string, unknown>>(
	records: readonly T[],
	options: {
		valueField: keyof T;
		periodField: keyof T;
		groupBy?: ReadonlyArray<keyof T>;
		absoluteField?: string;
		relativeField?: string;
	},
): Array<T & Record<string, number | null>> {
	const groupBy = options.groupBy ?? [];
	const absoluteField = options.absoluteField ?? "deltaAbs";
	const relativeField = options.relativeField ?? "deltaRel";

	const partitions = new Map<string, number[]>();
	for (const [idx, record] of records.entries()) {
		const key =
			groupBy.length > 0
				? buildCompositeKey(groupBy.map((field) => record[field]))
				: "__all__";
		const bucket = partitions.get(key);
		if (bucket) {
			bucket.push(idx);
		} else {
			partitions.set(key, [idx]);
		}
	}

	const deltas: Array<{ abs: number | null; rel: number | null }> = Array.from(
		{ length: records.length },
		() => ({ abs: null, rel: null }),
	);

	for (const indices of partitions.values()) {
		computePartitionPeriodDeltas(
			indices,
			records,
			options.valueField,
			options.periodField,
			deltas,
		);
	}

	return records.map((record, idx) => {
		const delta = deltas[idx] ?? { abs: null, rel: null };
		return {
			...record,
			[absoluteField]: delta.abs,
			[relativeField]: delta.rel,
		} as T & Record<string, number | null>;
	});
}

function assignPartitionRanks<T extends Record<string, unknown>>(
	indices: readonly number[],
	records: readonly T[],
	valueField: keyof T,
	direction: "asc" | "desc",
	tiePolicy: "dense" | "competition",
	ranks: number[],
): void {
	const scored = indices.map((idx) => ({
		idx,
		val: toFiniteNumber(records[idx]?.[valueField]),
	}));
	const sorted = scored.toSorted((a, b) => compareMissingLast(a.val, b.val, direction));

	let prevVal: number | null | undefined;
	let currentRank = 0;

	for (const [i, entry] of sorted.entries()) {
		if (i === 0) {
			currentRank = 1;
		} else if (entry.val !== prevVal) {
			currentRank = 1 + (tiePolicy === "dense" ? currentRank : i);
		}
		ranks[entry.idx] = currentRank;
		prevVal = entry.val;
	}
}

export function rankRecords<T extends Record<string, unknown>>(
	records: readonly T[],
	options: {
		valueField: keyof T;
		outputField: string;
		direction?: "asc" | "desc";
		groupBy?: ReadonlyArray<keyof T>;
		tiePolicy?: "dense" | "competition";
	},
): Array<T & Record<string, number>> {
	const direction = options.direction ?? "desc";
	const tiePolicy = options.tiePolicy ?? "competition";
	const groupBy = options.groupBy ?? [];

	const partitions = new Map<string, number[]>();
	for (const [idx, record] of records.entries()) {
		const key =
			groupBy.length > 0
				? buildCompositeKey(groupBy.map((field) => record[field]))
				: "__all__";
		const bucket = partitions.get(key);
		if (bucket) {
			bucket.push(idx);
		} else {
			partitions.set(key, [idx]);
		}
	}

	const ranks: number[] = Array.from({ length: records.length }, () => 0);

	for (const indices of partitions.values()) {
		assignPartitionRanks(indices, records, options.valueField, direction, tiePolicy, ranks);
	}

	return records.map(
		(record, idx) =>
			({
				...record,
				[options.outputField]: ranks[idx] ?? 0,
			}) as T & Record<string, number>,
	);
}

export function alignSeriesByKey<T extends Record<string, unknown>>(
	seriesList: ReadonlyArray<{ id: string; records: readonly T[] }>,
	options: {
		keyField: keyof T;
		valueField: keyof T;
		keys?: readonly string[];
		sortKeys?: boolean;
	},
): { keys: string[]; series: Array<{ id: string; values: unknown[] }> } {
	let keys: string[];
	if (options.keys) {
		keys = [...options.keys];
	} else {
		const keySet = new Set<string>();
		for (const item of seriesList) {
			for (const rec of item.records) {
				const rawKey = rec[options.keyField];
				if (rawKey !== null && rawKey !== undefined) {
					keySet.add(String(rawKey));
				}
			}
		}
		keys = [...keySet];
		if (options.sortKeys !== false) {
			keys = keys.toSorted((a, b) => compareNatural(a, b));
		}
	}

	const series = seriesList.map((item) => {
		const lookup = new Map<string, unknown>();
		for (const rec of item.records) {
			const rawKey = rec[options.keyField];
			if (rawKey !== null && rawKey !== undefined) {
				lookup.set(String(rawKey), rec[options.valueField]);
			}
		}
		const values = keys.map((k) => (lookup.has(k) ? (lookup.get(k) ?? null) : null));
		return { id: item.id, values };
	});

	return { keys, series };
}

function mergeJoinedRow(
	leftRow: Record<string, unknown> | null,
	rightRow: Record<string, unknown> | null,
	leftKeys: readonly string[],
	rightKeys: readonly string[],
	rightPrefix: string,
): Record<string, unknown> {
	const merged: Record<string, unknown> = {};
	if (leftRow !== null) {
		for (const [k, v] of Object.entries(leftRow)) {
			merged[k] = v;
		}
	}
	if (rightRow !== null) {
		const rightKeySet = new Set<string>(rightKeys);
		for (const [k, v] of Object.entries(rightRow)) {
			if (leftRow !== null && rightKeySet.has(k) && k in merged) {
				continue;
			}
			const targetKey =
				rightPrefix.length > 0 && !(leftRow === null && rightKeySet.has(k))
					? `${rightPrefix}${k}`
					: k;
			if (!(targetKey in merged)) {
				merged[targetKey] = v;
			}
		}
		if (leftRow === null) {
			for (const [i, lk] of leftKeys.entries()) {
				const rk = rightKeys[i];
				if (rk !== undefined && !(lk in merged)) {
					merged[lk] = rightRow[rk];
				}
			}
		}
	}
	return merged;
}

export function joinRecords<
	TLeft extends Record<string, unknown>,
	TRight extends Record<string, unknown>,
>(
	left: readonly TLeft[],
	right: readonly TRight[],
	options: {
		on:
			| string
			| readonly string[]
			| { left: readonly (keyof TLeft)[]; right: readonly (keyof TRight)[] };
		mode?: JoinMode;
		rightPrefix?: string;
	},
): Array<Record<string, unknown>> {
	const mode: JoinMode = options.mode ?? "left";
	const rightPrefix = options.rightPrefix ?? "";

	let leftKeys: string[];
	let rightKeys: string[];
	if (typeof options.on === "string") {
		leftKeys = [options.on];
		rightKeys = [options.on];
	} else if (Array.isArray(options.on)) {
		leftKeys = [...(options.on as readonly string[])];
		rightKeys = [...(options.on as readonly string[])];
	} else {
		const pair = options.on as {
			left: readonly (keyof TLeft)[];
			right: readonly (keyof TRight)[];
		};
		leftKeys = pair.left.map(String);
		rightKeys = pair.right.map(String);
	}

	const rightIndex = new Map<string, Array<{ row: TRight; idx: number }>>();
	for (const [idx, rRow] of right.entries()) {
		const key = buildJoinKey(rightKeys.map((k) => rRow[k]));
		if (key === null) {
			continue;
		}
		const bucket = rightIndex.get(key);
		if (bucket) {
			bucket.push({ row: rRow, idx });
		} else {
			rightIndex.set(key, [{ row: rRow, idx }]);
		}
	}

	const matchedRightIndices = new Set<number>();
	const result: Array<Record<string, unknown>> = [];

	for (const lRow of left) {
		const key = buildJoinKey(leftKeys.map((k) => lRow[k]));
		const matches = key === null ? undefined : rightIndex.get(key);
		if (matches && matches.length > 0) {
			for (const match of matches) {
				matchedRightIndices.add(match.idx);
				result.push(mergeJoinedRow(lRow, match.row, leftKeys, rightKeys, rightPrefix));
			}
		} else if (mode === "left" || mode === "outer") {
			result.push(mergeJoinedRow(lRow, null, leftKeys, rightKeys, rightPrefix));
		}
	}

	if (mode === "outer") {
		for (const [idx, rRow] of right.entries()) {
			if (!matchedRightIndices.has(idx)) {
				result.push(mergeJoinedRow(null, rRow, leftKeys, rightKeys, rightPrefix));
			}
		}
	}

	return result;
}

export function dedupeRecords<T>(
	records: readonly T[],
	keyFn: keyof T | ((row: T, index: number) => string),
	options?: { keep?: "first" | "last" },
): T[] {
	const keep = options?.keep ?? "first";
	const getKey = (row: T, index: number): string =>
		typeof keyFn === "function"
			? keyFn(row, index)
			: encodeKeyPart((row as Record<string, unknown>)[String(keyFn)]);

	if (keep === "first") {
		const seen = new Set<string>();
		const out: T[] = [];
		for (const [idx, row] of records.entries()) {
			const key = getKey(row, idx);
			if (!seen.has(key)) {
				seen.add(key);
				out.push(row);
			}
		}
		return out;
	}

	const lastIndexByKey = new Map<string, number>();
	for (const [idx, row] of records.entries()) {
		lastIndexByKey.set(getKey(row, idx), idx);
	}
	const out: T[] = [];
	for (const [idx, row] of records.entries()) {
		if (lastIndexByKey.get(getKey(row, idx)) === idx) {
			out.push(row);
		}
	}
	return out;
}

function projectSingleCell<TRow>(
	col: TableColumnSpec<TRow>,
	raw: unknown,
	row: TRow | undefined,
	config: ProjectTableConfig<TRow>,
): TableProjectionCell {
	let numeric: number | null = null;
	let sortValue = Infinity;
	let defaultStatus: CellStatus = "base";
	let scalarForDisplay: CellScalar = null;

	if (isHybridValue(raw)) {
		numeric = raw.numeric;
		sortValue = raw.sortValue;
		defaultStatus = raw.status ?? "base";
		scalarForDisplay = raw.kind === "number" && raw.numeric !== null ? raw.numeric : raw.display;
	} else if (typeof raw === "number") {
		numeric = Number.isFinite(raw) ? raw : null;
		sortValue = numeric ?? Infinity;
		scalarForDisplay = raw;
	} else if (raw instanceof Date) {
		const ts = raw.getTime();
		numeric = Number.isNaN(ts) ? null : ts;
		sortValue = numeric ?? Infinity;
		scalarForDisplay = raw;
	} else if (typeof raw === "boolean") {
		numeric = raw ? 1 : 0;
		sortValue = numeric;
		scalarForDisplay = raw;
	} else if (typeof raw === "string") {
		const hybrid = parseThresholdValue(raw, config.thresholdOptions);
		numeric = hybrid.numeric;
		sortValue = hybrid.sortValue;
		if (hybrid.kind === "threshold") {
			defaultStatus = hybrid.status ?? "caution";
		}
		scalarForDisplay = raw;
	} else if (raw !== null && raw !== undefined) {
		scalarForDisplay = String(raw);
	}

	const display =
		col.format && row !== undefined
			? col.format(raw, row)
			: formatCellDisplay(scalarForDisplay, {
					numFmt: col.numFmt,
					dateSystem: config.dateSystem,
					locale: config.locale,
				});

	const status: CellStatus =
		col.status && row !== undefined ? col.status(raw, row) : defaultStatus;

	return {
		colId: col.id,
		raw,
		display,
		numeric,
		sortValue,
		status,
		align: col.align ?? "left",
	};
}

export function projectTable<TRow = Record<string, unknown>>(
	records: readonly TRow[],
	config: ProjectTableConfig<TRow>,
): TableProjection {
	const columns: TableProjectionColumn[] = config.columns.map((col) => ({
		id: col.id,
		label: col.header,
		...(col.subHeader !== undefined && { subLabel: col.subHeader }),
		align: col.align ?? "left",
		...(col.width !== undefined && { width: col.width }),
	}));

	const headers = columns.map((c) => c.label);
	const subHeaders = columns.map((c) => c.subLabel ?? "");

	const rows: TableProjectionRow[] = records.map((row, rowIdx) => {
		let key: string;
		if (typeof config.keyField === "function") {
			key = config.keyField(row, rowIdx);
		} else if (config.keyField !== undefined) {
			const rawKey = (row as Record<string, unknown>)[String(config.keyField)];
			key = String(rawKey ?? rowIdx);
		} else {
			key = String(rowIdx);
		}

		const cells: TableProjectionCell[] = config.columns.map((col) => {
			const raw =
				typeof col.accessor === "function"
					? col.accessor(row)
					: col.accessor !== undefined
						? (row as Record<string, unknown>)[String(col.accessor)]
						: (row as Record<string, unknown>)[col.id];
			return projectSingleCell(col, raw ?? null, row, config);
		});

		return { key, cells };
	});

	let footer: TableProjectionCell[] | undefined;
	if (config.footer) {
		footer = config.columns.map((col) =>
			projectSingleCell(col, config.footer?.[col.id] ?? null, undefined, config),
		);
	}

	return {
		columns,
		headers,
		subHeaders,
		rows,
		...(footer !== undefined && { footer }),
		frozenRows: config.frozenRows ?? 0,
		frozenCols: config.frozenCols ?? 0,
	};
}
