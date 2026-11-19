import { colToLetter, formatCellRef, parseCellRef } from "./coords.ts";
import type {
	CellModel,
	CellScalar,
	ExcelStyleSpec,
	WorkbookModel,
	WorksheetModel,
} from "./types.ts";
import { cellToString, normalizeCellText } from "./values.ts";

export type CellDiffKind = "added" | "removed" | "modified";

export interface CellDiffEntry {
	kind: CellDiffKind;
	ref: string;
	row: number;
	col: number;
	before?: CellScalar;
	after?: CellScalar;
	formulaBefore?: string;
	formulaAfter?: string;
	styleChanged?: boolean;
}

export interface RowDiffEntry {
	kind: CellDiffKind;
	key: string;
	baseRowIndex?: number;
	targetRowIndex?: number;
	changedFields?: Array<{
		field: string;
		before: unknown;
		after: unknown;
		formulaBefore?: string;
		formulaAfter?: string;
	}>;
}

export interface SheetDiffOptions {
	mode?: "cell" | "row";
	keyCol?: number;
	keyHeader?: string;
	headerRow?: number;
	compareFormulas?: boolean;
	compareStyles?: boolean;
	ignoreWhitespace?: boolean;
}

export interface SheetDiffResult {
	sheetName: string;
	mode: "cell" | "row";
	hasChanges: boolean;
	addedCells: CellDiffEntry[];
	removedCells: CellDiffEntry[];
	modifiedCells: CellDiffEntry[];
	addedRows: RowDiffEntry[];
	removedRows: RowDiffEntry[];
	modifiedRows: RowDiffEntry[];
}

export interface WorkbookDiffOptions extends SheetDiffOptions {
	sheetFilter?: string[] | ((name: string) => boolean);
}

export interface WorkbookDiffResult {
	hasChanges: boolean;
	addedSheets: string[];
	removedSheets: string[];
	modifiedSheets: SheetDiffResult[];
	unchangedSheets: string[];
}

function areScalarValuesEqual(
	a: unknown,
	b: unknown,
	ignoreWhitespace: boolean,
): boolean {
	if (a === undefined && b === undefined) {
		return true;
	}
	if ((a === null || a === undefined) && (b === null || b === undefined)) {
		return true;
	}
	if (a instanceof Date && b instanceof Date) {
		const ta = a.getTime();
		const tb = b.getTime();
		return (Number.isNaN(ta) && Number.isNaN(tb)) || ta === tb;
	}
	if (typeof a === "string" && typeof b === "string") {
		if (ignoreWhitespace) {
			return (
				normalizeCellText(a, { collapseWhitespace: true }) ===
				normalizeCellText(b, { collapseWhitespace: true })
			);
		}
		return a === b;
	}
	if (typeof a === "number" && typeof b === "number") {
		if (Number.isNaN(a) && Number.isNaN(b)) {
			return true;
		}
		return a === b;
	}
	return a === b;
}

function canonicalizeForJson(value: unknown): unknown {
	if (value === null || value === undefined || typeof value !== "object") {
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => canonicalizeForJson(item));
	}
	const record = value as Record<string, unknown>;
	const sortedKeys = Object.keys(record).toSorted((a, b) => a.localeCompare(b));
	const out: Record<string, unknown> = {};
	for (const key of sortedKeys) {
		const v = record[key];
		if (v !== undefined) {
			out[key] = canonicalizeForJson(v);
		}
	}
	return out;
}

function canonicalizeStyle(style?: ExcelStyleSpec): string {
	if (!style) {
		return "";
	}
	const canonical = canonicalizeForJson(style) as Record<string, unknown>;
	if (Object.keys(canonical).length === 0) {
		return "";
	}
	return JSON.stringify(canonical);
}

function resolveCellValue(cell: CellModel): CellScalar {
	if (cell.value !== null && cell.value !== undefined) {
		return cell.value;
	}
	if (cell.richText && cell.richText.length > 0) {
		return cell.richText.map((run) => run.text).join("");
	}
	return cell.formula?.cachedResult ?? null;
}

interface NormalizedCellEntry {
	ref: string;
	row: number;
	col: number;
	cell: CellModel;
}

function buildNormalizedCellMap(sheet: WorksheetModel): Map<string, NormalizedCellEntry> {
	const map = new Map<string, NormalizedCellEntry>();
	for (const [rawRef, cell] of sheet.cells.entries()) {
		const parsed = parseCellRef(rawRef);
		const ref = formatCellRef(parsed.col, parsed.row);
		map.set(ref, { ref, row: parsed.row, col: parsed.col, cell });
	}
	return map;
}

function isEffectivelyEmptyCell(cell: CellModel, compareStyles: boolean): boolean {
	const hasVal = resolveCellValue(cell) !== null;
	const hasFormula = cell.formula?.expression !== undefined;
	const hasStyle = compareStyles && canonicalizeStyle(cell.style).length > 0;
	return !hasVal && !hasFormula && !hasStyle;
}

function diffSheetsByCell(
	baseSheet: WorksheetModel,
	targetSheet: WorksheetModel,
	options: SheetDiffOptions | undefined,
): SheetDiffResult {
	const compareFormulas = options?.compareFormulas !== false;
	const compareStyles = options?.compareStyles === true;
	const ignoreWhitespace = options?.ignoreWhitespace === true;

	const baseMap = buildNormalizedCellMap(baseSheet);
	const targetMap = buildNormalizedCellMap(targetSheet);

	const allRefsMap = new Map<string, { row: number; col: number }>();
	for (const entry of baseMap.values()) {
		allRefsMap.set(entry.ref, { row: entry.row, col: entry.col });
	}
	for (const entry of targetMap.values()) {
		allRefsMap.set(entry.ref, { row: entry.row, col: entry.col });
	}

	const sortedRefs = [...allRefsMap].toSorted(
		(a, b) => a[1].row - b[1].row || a[1].col - b[1].col,
	);

	const addedCells: CellDiffEntry[] = [];
	const removedCells: CellDiffEntry[] = [];
	const modifiedCells: CellDiffEntry[] = [];

	for (const [ref, coord] of sortedRefs) {
		const baseEntry = baseMap.get(ref);
		const targetEntry = targetMap.get(ref);

		if (!baseEntry && targetEntry) {
			if (isEffectivelyEmptyCell(targetEntry.cell, compareStyles)) {
				continue;
			}
			const afterVal = resolveCellValue(targetEntry.cell);
			const formulaAfter = targetEntry.cell.formula?.expression;
			addedCells.push({
				kind: "added",
				ref,
				row: coord.row,
				col: coord.col,
				after: afterVal,
				...(formulaAfter !== undefined && { formulaAfter }),
			});
			continue;
		}

		if (baseEntry && !targetEntry) {
			if (isEffectivelyEmptyCell(baseEntry.cell, compareStyles)) {
				continue;
			}
			const beforeVal = resolveCellValue(baseEntry.cell);
			const formulaBefore = baseEntry.cell.formula?.expression;
			removedCells.push({
				kind: "removed",
				ref,
				row: coord.row,
				col: coord.col,
				before: beforeVal,
				...(formulaBefore !== undefined && { formulaBefore }),
			});
			continue;
		}

		if (baseEntry && targetEntry) {
			const beforeVal = resolveCellValue(baseEntry.cell);
			const afterVal = resolveCellValue(targetEntry.cell);
			const valueChanged = !areScalarValuesEqual(beforeVal, afterVal, ignoreWhitespace);

			const formulaBefore = baseEntry.cell.formula?.expression;
			const formulaAfter = targetEntry.cell.formula?.expression;
			const formulaChanged = compareFormulas && formulaBefore !== formulaAfter;

			const styleChanged =
				compareStyles &&
				canonicalizeStyle(baseEntry.cell.style) !== canonicalizeStyle(targetEntry.cell.style);

			if (valueChanged || formulaChanged || styleChanged) {
				modifiedCells.push({
					kind: "modified",
					ref,
					row: coord.row,
					col: coord.col,
					before: beforeVal,
					after: afterVal,
					...(formulaChanged && {
						...(formulaBefore !== undefined && { formulaBefore }),
						...(formulaAfter !== undefined && { formulaAfter }),
					}),
					...(compareStyles && { styleChanged }),
				});
			}
		}
	}

	return {
		sheetName: targetSheet.name,
		mode: "cell",
		hasChanges:
			addedCells.length > 0 || removedCells.length > 0 || modifiedCells.length > 0,
		addedCells,
		removedCells,
		modifiedCells,
		addedRows: [],
		removedRows: [],
		modifiedRows: [],
	};
}

interface ExtractedRowEntry {
	rowIndex: number;
	fields: Record<string, unknown>;
	formulas: Record<string, string | undefined>;
}

interface ExtractedSheetRows {
	headers: Map<number, string>;
	rowsByKey: Map<string, ExtractedRowEntry>;
}

function disambiguateUniqueHeader(base: string, usedNames: Set<string>): string {
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

function extractKeyedRows(
	sheet: WorksheetModel,
	headerRow1Based: number,
	keyColOption: number | undefined,
	keyHeaderOption: string | undefined,
	ignoreWhitespace: boolean,
): ExtractedSheetRows {
	const byRow = new Map<
		number,
		Map<number, { value: CellScalar; formula: string | undefined }>
	>();
	let maxCol = -1;

	for (const [rawRef, cell] of sheet.cells.entries()) {
		const parsed = parseCellRef(rawRef);
		const row1Based = parsed.row + 1;
		let cols = byRow.get(row1Based);
		if (!cols) {
			cols = new Map<number, { value: CellScalar; formula: string | undefined }>();
			byRow.set(row1Based, cols);
		}
		cols.set(parsed.col, {
			value: resolveCellValue(cell),
			formula: cell.formula?.expression,
		});
		if (parsed.col > maxCol) {
			maxCol = parsed.col;
		}
	}

	const headerCells = byRow.get(headerRow1Based);
	const headers = new Map<number, string>();
	const usedHeaderNames = new Set<string>();

	for (let c = 0; c <= maxCol; c += 1) {
		const rawHeader = headerCells?.get(c)?.value;
		const text = normalizeCellText(rawHeader);
		const baseName = text.length > 0 ? text : colToLetter(c);
		headers.set(c, disambiguateUniqueHeader(baseName, usedHeaderNames));
	}

	let keyCol = keyColOption ?? 0;
	if (keyColOption === undefined && keyHeaderOption !== undefined) {
		const targetHeader = normalizeCellText(keyHeaderOption).toLowerCase();
		let foundKeyCol: number | undefined;
		for (const [colIdx, headerName] of headers) {
			if (normalizeCellText(headerName).toLowerCase() === targetHeader) {
				foundKeyCol = colIdx;
				break;
			}
		}
		if (foundKeyCol === undefined) {
			return { headers, rowsByKey: new Map() };
		}
		keyCol = foundKeyCol;
	}

	const sortedRows = [...byRow].toSorted((a, b) => a[0] - b[0]);
	const occurrenceCount = new Map<string, number>();
	const rowsByKey = new Map<string, ExtractedRowEntry>();

	for (const [rowIndex, cols] of sortedRows) {
		if (rowIndex <= headerRow1Based) {
			continue;
		}
		const rawKey = cols.get(keyCol)?.value;
		const keyStr = ignoreWhitespace
			? normalizeCellText(cellToString(rawKey), { collapseWhitespace: true })
			: normalizeCellText(cellToString(rawKey));
		if (keyStr.length === 0) {
			continue;
		}

		// Disambiguate duplicate keys deterministically so edits/additions/removals on duplicate rows are never lost.
		const count = (occurrenceCount.get(keyStr) ?? 0) + 1;
		occurrenceCount.set(keyStr, count);
		let uniqueKey = count === 1 ? keyStr : `${keyStr}#${String(count)}`;
		let extraSuffix = count;
		while (rowsByKey.has(uniqueKey)) {
			extraSuffix += 1;
			uniqueKey = `${keyStr}#${String(extraSuffix)}`;
		}

		const fields: Record<string, unknown> = {};
		const formulas: Record<string, string | undefined> = {};
		for (let c = 0; c <= maxCol; c += 1) {
			const headerName = headers.get(c) ?? colToLetter(c);
			const entry = cols.get(c);
			fields[headerName] = entry?.value ?? null;
			formulas[headerName] = entry?.formula;
		}

		rowsByKey.set(uniqueKey, { rowIndex, fields, formulas });
	}

	return { headers, rowsByKey };
}

function diffSheetsByRow(
	baseSheet: WorksheetModel,
	targetSheet: WorksheetModel,
	options: SheetDiffOptions | undefined,
): SheetDiffResult {
	const headerRow = options?.headerRow ?? 1;
	const compareFormulas = options?.compareFormulas !== false;
	const ignoreWhitespace = options?.ignoreWhitespace === true;

	const baseExtracted = extractKeyedRows(
		baseSheet,
		headerRow,
		options?.keyCol,
		options?.keyHeader,
		ignoreWhitespace,
	);
	const targetExtracted = extractKeyedRows(
		targetSheet,
		headerRow,
		options?.keyCol,
		options?.keyHeader,
		ignoreWhitespace,
	);

	const addedRows: RowDiffEntry[] = [];
	const removedRows: RowDiffEntry[] = [];
	const modifiedRows: RowDiffEntry[] = [];

	for (const [key, baseRow] of baseExtracted.rowsByKey.entries()) {
		const targetRow = targetExtracted.rowsByKey.get(key);
		if (!targetRow) {
			removedRows.push({
				kind: "removed",
				key,
				baseRowIndex: baseRow.rowIndex,
			});
			continue;
		}

		const fieldNames = new Set<string>([
			...Object.keys(baseRow.fields),
			...Object.keys(targetRow.fields),
		]);
		const changedFields: Array<{
			field: string;
			before: unknown;
			after: unknown;
			formulaBefore?: string;
			formulaAfter?: string;
		}> = [];

		for (const field of fieldNames) {
			const before = baseRow.fields[field] ?? null;
			const after = targetRow.fields[field] ?? null;
			const valueChanged = !areScalarValuesEqual(before, after, ignoreWhitespace);
			const formulaBefore = baseRow.formulas[field];
			const formulaAfter = targetRow.formulas[field];
			const formulaChanged = compareFormulas && formulaBefore !== formulaAfter;
			if (valueChanged || formulaChanged) {
				changedFields.push({
					field,
					before,
					after,
					...(formulaChanged && {
						...(formulaBefore !== undefined && { formulaBefore }),
						...(formulaAfter !== undefined && { formulaAfter }),
					}),
				});
			}
		}

		if (changedFields.length > 0) {
			modifiedRows.push({
				kind: "modified",
				key,
				baseRowIndex: baseRow.rowIndex,
				targetRowIndex: targetRow.rowIndex,
				changedFields,
			});
		}
	}

	for (const [key, targetRow] of targetExtracted.rowsByKey.entries()) {
		if (!baseExtracted.rowsByKey.has(key)) {
			addedRows.push({
				kind: "added",
				key,
				targetRowIndex: targetRow.rowIndex,
			});
		}
	}

	return {
		sheetName: targetSheet.name,
		mode: "row",
		hasChanges:
			addedRows.length > 0 || removedRows.length > 0 || modifiedRows.length > 0,
		addedCells: [],
		removedCells: [],
		modifiedCells: [],
		addedRows,
		removedRows,
		modifiedRows,
	};
}

export function diffSheets(
	baseSheet: WorksheetModel,
	targetSheet: WorksheetModel,
	options?: SheetDiffOptions,
): SheetDiffResult {
	const mode: "cell" | "row" =
		options?.mode ??
		(options?.keyCol !== undefined || options?.keyHeader !== undefined ? "row" : "cell");

	return mode === "row"
		? diffSheetsByRow(baseSheet, targetSheet, options)
		: diffSheetsByCell(baseSheet, targetSheet, options);
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

export function diffWorkbooks(
	baseWb: WorkbookModel,
	targetWb: WorkbookModel,
	options?: WorkbookDiffOptions,
): WorkbookDiffResult {
	const baseMap = new Map<string, WorksheetModel>();
	for (const sheet of baseWb.sheets) {
		if (matchesSheetFilter(sheet.name, options?.sheetFilter)) {
			baseMap.set(sheet.name, sheet);
		}
	}

	const targetMap = new Map<string, WorksheetModel>();
	for (const sheet of targetWb.sheets) {
		if (matchesSheetFilter(sheet.name, options?.sheetFilter)) {
			targetMap.set(sheet.name, sheet);
		}
	}

	const addedSheets: string[] = [];
	const removedSheets: string[] = [];
	const modifiedSheets: SheetDiffResult[] = [];
	const unchangedSheets: string[] = [];

	for (const [name, baseSheet] of baseMap) {
		const targetSheet = targetMap.get(name);
		if (!targetSheet) {
			removedSheets.push(name);
			continue;
		}
		const sheetDiff = diffSheets(baseSheet, targetSheet, options);
		if (sheetDiff.hasChanges) {
			modifiedSheets.push(sheetDiff);
		} else {
			unchangedSheets.push(name);
		}
	}

	for (const name of targetMap.keys()) {
		if (!baseMap.has(name)) {
			addedSheets.push(name);
		}
	}

	return {
		hasChanges:
			addedSheets.length > 0 || removedSheets.length > 0 || modifiedSheets.length > 0,
		addedSheets,
		removedSheets,
		modifiedSheets,
		unchangedSheets,
	};
}
