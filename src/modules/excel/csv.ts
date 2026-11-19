import { formatCellRef, parseCellRef, setCell } from "./coords.ts";
import { ExcelError } from "./errors.ts";
import type { CellModel, ExcelDateSystem, WorkbookModel, WorksheetModel } from "./types.ts";
import { formatCellDisplay } from "./values.ts";

export type CsvDelimiter = "," | ";" | "\t";

export interface ReadCsvOptions {
	delimiter?: "auto" | CsvDelimiter;
	sheetName?: string;
	trimCells?: boolean;
	maxBytes?: number;
	maxRows?: number;
}

export interface WriteCsvOptions {
	delimiter?: CsvDelimiter;
	bom?: boolean;
	lineEnding?: "\r\n" | "\n";
	sanitizeFormulaInjection?: boolean;
	formatDisplay?: boolean;
	dateSystem?: ExcelDateSystem;
}

const DEFAULT_MAX_CSV_BYTES = 64 * 1024 * 1024;
const DEFAULT_MAX_CSV_ROWS = 1_048_576;
const MAX_CSV_COLUMNS = 16_384;
const SNIFF_MAX_ROWS = 25;

const CANDIDATE_DELIMITERS: readonly CsvDelimiter[] = [",", ";", "\t"];
const VALID_DELIMITER_SET: ReadonlySet<string> = new Set(CANDIDATE_DELIMITERS);
const NON_STRING_TYPES = ["number", "boolean", "date"] as const;
const FORMULA_INJECTION_TRIGGER_RE = /^(?:[=+\-@\t\r\n]|\s*[=+\-@])/;
const UTF8_ENCODER = new TextEncoder();

function stripLeadingBom(text: string): string {
	return text.startsWith("\u{FEFF}") ? text.slice(1) : text;
}

function splitLogicalRowsForSniff(text: string, maxRows: number): string[] {
	const rows: string[] = [];
	let current = "";
	let inQuotes = false;
	let atFieldStart = true;
	let i = 0;

	while (i < text.length && rows.length < maxRows) {
		const ch = text[i];
		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					current += '""';
					i += 2;
					continue;
				}
				inQuotes = false;
			}
			current += ch ?? "";
			i += 1;
			continue;
		}
		if (atFieldStart && ch === '"') {
			inQuotes = true;
			atFieldStart = false;
			current += '"';
			i += 1;
			continue;
		}
		if (ch === "\n" || ch === "\r") {
			i += ch === "\r" && text[i + 1] === "\n" ? 2 : 1;
			if (current.trim().length > 0) {
				rows.push(current);
			}
			current = "";
			atFieldStart = true;
			continue;
		}
		atFieldStart = ch !== undefined && VALID_DELIMITER_SET.has(ch);
		current += ch ?? "";
		i += 1;
	}

	if (rows.length < maxRows && current.trim().length > 0) {
		rows.push(current);
	}
	return rows;
}

function countDelimiterOutsideQuotes(row: string, delimiter: CsvDelimiter): number {
	let count = 0;
	let inQuotes = false;
	let atFieldStart = true;
	let i = 0;

	while (i < row.length) {
		const ch = row[i];
		if (inQuotes) {
			if (ch === '"') {
				if (row[i + 1] === '"') {
					i += 2;
					continue;
				}
				inQuotes = false;
			}
			i += 1;
			continue;
		}
		if (atFieldStart && ch === '"') {
			inQuotes = true;
			atFieldStart = false;
			i += 1;
			continue;
		}
		if (ch === delimiter) {
			count += 1;
			atFieldStart = true;
			i += 1;
			continue;
		}
		atFieldStart = false;
		i += 1;
	}
	return count;
}

export function sniffCsvDelimiter(text: string): CsvDelimiter {
	const clean = stripLeadingBom(text);
	const rows = splitLogicalRowsForSniff(clean, SNIFF_MAX_ROWS);
	if (rows.length === 0) {
		return ",";
	}

	let bestDelimiter: CsvDelimiter = ",";
	let bestScore = -1;

	for (const candidate of CANDIDATE_DELIMITERS) {
		let totalCount = 0;
		let rowsWithDelimiter = 0;
		const counts: number[] = [];

		for (const row of rows) {
			const c = countDelimiterOutsideQuotes(row, candidate);
			counts.push(c);
			totalCount += c;
			if (c > 0) {
				rowsWithDelimiter += 1;
			}
		}

		if (totalCount === 0) {
			continue;
		}

		const mean = totalCount / rows.length;
		let variance = 0;
		for (const c of counts) {
			const diff = c - mean;
			variance += diff * diff;
		}
		variance /= rows.length;

		const consistencyRatio = rowsWithDelimiter / rows.length;
		// Reward high row coverage and low column-count variance across sampled rows.
		const score = (consistencyRatio * 1000 + Math.min(mean, 100)) / (1 + variance);
		if (score > bestScore) {
			bestScore = score;
			bestDelimiter = candidate;
		}
	}

	return bestDelimiter;
}

function resolveDelimiter(text: string, option: ReadCsvOptions["delimiter"]): CsvDelimiter {
	if (option === undefined || option === "auto") {
		return sniffCsvDelimiter(text);
	}
	if (!VALID_DELIMITER_SET.has(option)) {
		throw new ExcelError(
			"INVALID_CONFIG",
			String.raw`Unsupported CSV delimiter "${String(option)}". Expected ",", ";", "\t", or "auto".`,
			{ details: { delimiter: option } },
		);
	}
	return option;
}

function parseCsvRows(
	text: string,
	delimiter: CsvDelimiter,
	trimCells: boolean,
	maxRows: number,
): string[][] {
	if (text.length === 0) {
		return [];
	}

	const rows: string[][] = [];
	let currentRow: string[] = [];
	let field = "";
	let inQuotes = false;
	let atFieldStart = true;
	let i = 0;

	const pushField = (): void => {
		const value = trimCells ? field.trim() : field;
		currentRow.push(value);
		if (currentRow.length > MAX_CSV_COLUMNS) {
			throw new ExcelError(
				"LIMIT_EXCEEDED",
				`CSV column count ${currentRow.length} exceeds maximum allowed columns (${MAX_CSV_COLUMNS}).`,
				{ details: { columnCount: currentRow.length, maxColumns: MAX_CSV_COLUMNS } },
			);
		}
		field = "";
		atFieldStart = true;
	};

	const pushRow = (): void => {
		rows.push(currentRow);
		if (rows.length > maxRows) {
			throw new ExcelError(
				"LIMIT_EXCEEDED",
				`CSV row count ${rows.length} exceeds maximum allowed rows (${maxRows}).`,
				{ details: { rowCount: rows.length, maxRows } },
			);
		}
		currentRow = [];
	};

	while (i < text.length) {
		const ch = text[i];

		if (inQuotes) {
			if (ch === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i += 1;
				continue;
			}
			if (ch === "\r" && text[i + 1] === "\n") {
				field += "\n";
				i += 2;
				continue;
			}
			if (ch === "\r") {
				field += "\n";
				i += 1;
				continue;
			}
			field += ch ?? "";
			i += 1;
			continue;
		}

		if (atFieldStart && ch === '"') {
			inQuotes = true;
			atFieldStart = false;
			i += 1;
			continue;
		}

		if (ch === delimiter) {
			pushField();
			i += 1;
			continue;
		}

		if (ch === "\r" || ch === "\n") {
			const nextIdx = i + (ch === "\r" && text[i + 1] === "\n" ? 2 : 1);
			pushField();
			pushRow();
			i = nextIdx;
			// Ignore a single trailing newline at EOF so "a,b\r\n1,2\r\n" yields 2 rows.
			if (i === text.length) {
				return rows;
			}
			continue;
		}

		field += ch ?? "";
		atFieldStart = false;
		i += 1;
	}

	pushField();
	pushRow();
	return rows;
}

export function readCsvText(text: string, options?: ReadCsvOptions): WorkbookModel {
	if (typeof text !== "string") {
		throw new ExcelError("INVALID_CONFIG", "CSV input must be a string.");
	}

	const maxBytes = options?.maxBytes ?? DEFAULT_MAX_CSV_BYTES;
	const maxRows = Math.min(options?.maxRows ?? DEFAULT_MAX_CSV_ROWS, DEFAULT_MAX_CSV_ROWS);
	if (maxBytes <= 0 || maxRows <= 0) {
		throw new ExcelError("INVALID_CONFIG", "CSV maxBytes and maxRows must be positive numbers.", {
			details: { maxBytes, maxRows },
		});
	}

	// Fast lower-bound check before UTF-8 encoding when string length alone exceeds maxBytes.
	if (text.length > maxBytes) {
		throw new ExcelError(
			"LIMIT_EXCEEDED",
			`CSV text length (${text.length}) exceeds maxBytes limit (${maxBytes}).`,
			{ details: { byteLength: text.length, maxBytes } },
		);
	}
	// Only run full UTF-8 encoding if worst-case 3-bytes-per-code-unit could exceed maxBytes.
	if (text.length * 3 > maxBytes) {
		const byteLength = UTF8_ENCODER.encode(text).byteLength;
		if (byteLength > maxBytes) {
			throw new ExcelError(
				"LIMIT_EXCEEDED",
				`CSV byte length (${byteLength}) exceeds maxBytes limit (${maxBytes}).`,
				{ details: { byteLength, maxBytes } },
			);
		}
	}

	const cleanText = stripLeadingBom(text);
	const delimiter = resolveDelimiter(cleanText, options?.delimiter);
	const trimCells = options?.trimCells ?? false;
	const sheetName = options?.sheetName ?? "Sheet1";

	const parsedRows = parseCsvRows(cleanText, delimiter, trimCells, maxRows);
	const sheet: WorksheetModel = {
		name: sheetName,
		cells: new Map<string, CellModel>(),
	};

	for (const [rowIndex, row] of parsedRows.entries()) {
		for (const [colIndex, field] of row.entries()) {
			if (field.length > 0) {
				setCell(sheet, formatCellRef(colIndex, rowIndex), {
					value: field,
					type: "string",
				});
			}
		}
	}

	return {
		dateSystem: 1900,
		sheets: [sheet],
	};
}

function isUntrustedStringCell(cell: CellModel): boolean {
	if (cell.formula !== undefined) {
		return false;
	}
	if (cell.type !== undefined && (NON_STRING_TYPES as readonly string[]).includes(cell.type)) {
		return false;
	}
	return typeof cell.value === "string" || (cell.richText !== undefined && cell.richText.length > 0);
}

function formatRawCsvCell(cell: CellModel, dateSystem: ExcelDateSystem): string {
	if (cell.value === null) {
		if (cell.richText && cell.richText.length > 0) {
			return cell.richText.map((run) => run.text).join("");
		}
		return "";
	}
	if (cell.value instanceof Date) {
		return formatCellDisplay(cell, { dateSystem });
	}
	if (typeof cell.value === "boolean") {
		return cell.value ? "TRUE" : "FALSE";
	}
	if (typeof cell.value === "number") {
		return Number.isFinite(cell.value) ? String(cell.value) : "";
	}
	return String(cell.value);
}

function quoteCsvField(text: string, delimiter: CsvDelimiter): string {
	if (text.length === 0) {
		return "";
	}
	const startsOrEndsWithSpace =
		text.startsWith(" ") ||
		text.startsWith("\t") ||
		text.endsWith(" ") ||
		text.endsWith("\t");
	const needsQuotes =
		startsOrEndsWithSpace ||
		text.includes(delimiter) ||
		text.includes('"') ||
		text.includes("\r") ||
		text.includes("\n");
	if (!needsQuotes) {
		return text;
	}
	return `"${text.replaceAll('"', '""')}"`;
}

function formatSheetCellForCsv(
	cell: CellModel | undefined,
	delimiter: CsvDelimiter,
	formatDisplay: boolean,
	sanitizeFormulaInjection: boolean,
	dateSystem: ExcelDateSystem,
): string {
	if (!cell || (cell.value === null && (!cell.richText || cell.richText.length === 0))) {
		return "";
	}

	let text = formatDisplay
		? formatCellDisplay(cell, { dateSystem })
		: formatRawCsvCell(cell, dateSystem);

	if (
		sanitizeFormulaInjection &&
		text.length > 0 &&
		!text.startsWith("'") &&
		isUntrustedStringCell(cell) &&
		FORMULA_INJECTION_TRIGGER_RE.test(text)
	) {
		text = `'${text}`;
	}

	return quoteCsvField(text, delimiter);
}

export function writeCsvText(sheet: WorksheetModel, options?: WriteCsvOptions): string {
	const delimiter: CsvDelimiter = options?.delimiter ?? ",";
	if (!VALID_DELIMITER_SET.has(delimiter)) {
		throw new ExcelError(
			"INVALID_CONFIG",
			String.raw`Unsupported CSV delimiter "${delimiter}". Expected ",", ";", or "\t".`,
			{ details: { delimiter } },
		);
	}

	const bomPrefix = options?.bom === true ? "\u{FEFF}" : "";
	if (sheet.cells.size === 0) {
		return bomPrefix;
	}

	let maxRow = -1;
	let maxCol = -1;
	const normalizedCells = new Map<string, CellModel>();
	for (const [ref, cell] of sheet.cells.entries()) {
		const parsed = parseCellRef(ref);
		if (parsed.row > maxRow) {
			maxRow = parsed.row;
		}
		if (parsed.col > maxCol) {
			maxCol = parsed.col;
		}
		normalizedCells.set(formatCellRef(parsed.col, parsed.row), cell);
	}

	if (maxRow < 0 || maxCol < 0) {
		return bomPrefix;
	}

	const lineEnding = options?.lineEnding ?? "\r\n";
	const sanitizeFormulaInjection = options?.sanitizeFormulaInjection ?? false;
	const formatDisplay = options?.formatDisplay ?? true;
	const dateSystem: ExcelDateSystem = options?.dateSystem ?? 1900;

	const lines: string[] = [];
	for (let r = 0; r <= maxRow; r += 1) {
		const fields: string[] = [];
		for (let c = 0; c <= maxCol; c += 1) {
			const cell = normalizedCells.get(formatCellRef(c, r));
			fields.push(
				formatSheetCellForCsv(
					cell,
					delimiter,
					formatDisplay,
					sanitizeFormulaInjection,
					dateSystem,
				),
			);
		}
		lines.push(fields.join(delimiter));
	}

	return `${bomPrefix}${lines.join(lineEnding)}`;
}
