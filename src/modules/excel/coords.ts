import { ExcelError } from "./errors.ts";
import type { CellModel, ParsedCellRef, RangeRef, WorksheetModel } from "./types.ts";

const MAX_COL_INDEX = 16_383;
const MAX_ROW_INDEX = 1_048_575;

const COL_LETTERS_RE = /^[A-Za-z]{1,3}$/;
const CELL_REF_RE = /^(\$?)([A-Za-z]{1,3})(\$?)([1-9]\d{0,6})$/;
const INLINE_CELL_REF_RE = /^(\$?)([A-Za-z]{1,3})(\$?)([1-9]\d{0,6})/;
const BEFORE_REF_INVALID_RE = /[A-Za-z0-9_.#$]/;
const AFTER_REF_INVALID_RE = /[A-Za-z0-9_(!.$]/;
const UNQUOTED_3D_SHEET_SUFFIX_RE = /^:[A-Za-z0-9_.]+!/;

function tryLetterToCol(letters: string): number | null {
	if (!COL_LETTERS_RE.test(letters)) {
		return null;
	}
	const upper = letters.toUpperCase();
	let col = 0;
	for (let i = 0; i < upper.length; i += 1) {
		const code = upper.codePointAt(i);
		if (code === undefined) {
			return null;
		}
		col = col * 26 + (code - 64);
	}
	const zeroBased = col - 1;
	if (zeroBased < 0 || zeroBased > MAX_COL_INDEX) {
		return null;
	}
	return zeroBased;
}

export function colToLetter(colIndexZeroBased: number): string {
	if (
		!Number.isSafeInteger(colIndexZeroBased) ||
		colIndexZeroBased < 0 ||
		colIndexZeroBased > MAX_COL_INDEX
	) {
		throw new ExcelError(
			"INVALID_CELL_REF",
			`Column index ${String(colIndexZeroBased)} is outside Excel bounds (0..${MAX_COL_INDEX}).`,
			{ details: { col: colIndexZeroBased } },
		);
	}
	let current = colIndexZeroBased + 1;
	let result = "";
	while (current > 0) {
		const remainder = (current - 1) % 26;
		result = String.fromCodePoint(65 + remainder) + result;
		current = Math.floor((current - 1) / 26);
	}
	return result;
}

export function letterToCol(letters: string): number {
	const col = typeof letters === "string" ? tryLetterToCol(letters) : null;
	if (col === null) {
		throw new ExcelError(
			"INVALID_CELL_REF",
			`Column label "${letters}" is not a valid Excel column (A..XFD).`,
			{ details: { letters } },
		);
	}
	return col;
}

export function parseCellRef(ref: string): ParsedCellRef {
	if (typeof ref !== "string") {
		throw new ExcelError("INVALID_CELL_REF", `Invalid cell reference: ${ref}.`, {
			details: { ref },
		});
	}
	const match = CELL_REF_RE.exec(ref);
	if (!match) {
		throw new ExcelError("INVALID_CELL_REF", `Invalid cell reference "${ref}".`, {
			details: { ref },
		});
	}
	const [, colDollar, colLetters, rowDollar, rowStr] = match;
	if (colLetters === undefined || rowStr === undefined) {
		throw new ExcelError("INVALID_CELL_REF", `Invalid cell reference "${ref}".`, {
			details: { ref },
		});
	}
	const col = tryLetterToCol(colLetters);
	const row = Number(rowStr) - 1;
	if (col === null || row < 0 || row > MAX_ROW_INDEX) {
		throw new ExcelError("INVALID_CELL_REF", `Cell reference "${ref}" is out of Excel bounds.`, {
			details: { ref },
		});
	}
	return {
		col,
		row,
		colAbsolute: colDollar === "$",
		rowAbsolute: rowDollar === "$",
	};
}

export function formatCellRef(
	col: number,
	row: number,
	options?: { colAbsolute?: boolean; rowAbsolute?: boolean },
): string {
	const colLetters = colToLetter(col);
	if (!Number.isSafeInteger(row) || row < 0 || row > MAX_ROW_INDEX) {
		throw new ExcelError(
			"INVALID_CELL_REF",
			`Row index ${String(row)} is outside Excel bounds (0..${MAX_ROW_INDEX}).`,
			{ details: { col, row } },
		);
	}
	const colPrefix = options?.colAbsolute ? "$" : "";
	const rowPrefix = options?.rowAbsolute ? "$" : "";
	return `${colPrefix}${colLetters}${rowPrefix}${row + 1}`;
}

export function parseRangeRef(rangeRef: string): RangeRef {
	if (typeof rangeRef !== "string" || rangeRef.length === 0) {
		throw new ExcelError("INVALID_RANGE_REF", `Invalid range reference: ${rangeRef}.`, {
			details: { rangeRef },
		});
	}
	const parts = rangeRef.split(":");
	if (parts.length !== 1 && parts.length !== 2) {
		throw new ExcelError("INVALID_RANGE_REF", `Invalid range reference "${rangeRef}".`, {
			details: { rangeRef },
		});
	}
	const startStr = parts[0];
	const endStr = parts[1] ?? startStr;
	if (!startStr || !endStr) {
		throw new ExcelError("INVALID_RANGE_REF", `Invalid range reference "${rangeRef}".`, {
			details: { rangeRef },
		});
	}
	try {
		const a = parseCellRef(startStr);
		const b = parseCellRef(endStr);
		return {
			start: {
				col: Math.min(a.col, b.col),
				row: Math.min(a.row, b.row),
			},
			end: {
				col: Math.max(a.col, b.col),
				row: Math.max(a.row, b.row),
			},
		};
	} catch (error) {
		throw new ExcelError("INVALID_RANGE_REF", `Invalid range reference "${rangeRef}".`, {
			details: { rangeRef },
			cause: error,
		});
	}
}

export function parseSheetQualifiedRef(ref: string): { sheetName?: string; range: RangeRef } {
	if (typeof ref !== "string" || ref.length === 0) {
		throw new ExcelError("INVALID_RANGE_REF", `Invalid reference: ${ref}.`, {
			details: { ref },
		});
	}

	if (ref.startsWith("'")) {
		let sheetName = "";
		let i = 1;
		let closedAt = -1;
		while (i < ref.length) {
			const ch = ref[i];
			if (ch === "'") {
				if (ref[i + 1] === "'") {
					sheetName += "'";
					i += 2;
					continue;
				}
				closedAt = i;
				break;
			}
			sheetName += ch ?? "";
			i += 1;
		}
		if (closedAt === -1 || ref[closedAt + 1] !== "!" || sheetName.length === 0) {
			throw new ExcelError("INVALID_RANGE_REF", `Invalid sheet-qualified reference "${ref}".`, {
				details: { ref },
			});
		}
		const rangeStr = ref.slice(closedAt + 2);
		return { sheetName, range: parseRangeRef(rangeStr) };
	}

	const bangIndex = ref.indexOf("!");
	if (bangIndex !== -1) {
		const sheetName = ref.slice(0, bangIndex);
		const rangeStr = ref.slice(bangIndex + 1);
		if (sheetName.length === 0 || rangeStr.length === 0) {
			throw new ExcelError("INVALID_RANGE_REF", `Invalid sheet-qualified reference "${ref}".`, {
				details: { ref },
			});
		}
		return { sheetName, range: parseRangeRef(rangeStr) };
	}

	return { range: parseRangeRef(ref) };
}

function scanQuotedLiteral(text: string, start: number, quoteChar: string): number {
	let i = start + 1;
	while (i < text.length) {
		if (text[i] === quoteChar) {
			if (text[i + 1] === quoteChar) {
				i += 2;
				continue;
			}
			return i + 1;
		}
		i += 1;
	}
	return text.length;
}

export function translateFormulaRefs(
	expression: string,
	colDelta: number,
	rowDelta: number,
): string {
	if (colDelta === 0 && rowDelta === 0) {
		return expression;
	}

	let out = "";
	let bracketDepth = 0;
	let i = 0;
	while (i < expression.length) {
		const ch = expression[i];
		if (ch === '"' || ch === "'") {
			const end = scanQuotedLiteral(expression, i, ch);
			out += expression.slice(i, end);
			i = end;
			continue;
		}
		if (ch === "[") {
			bracketDepth += 1;
			out += ch;
			i += 1;
			continue;
		}
		if (ch === "]") {
			if (bracketDepth > 0) {
				bracketDepth -= 1;
			}
			out += ch;
			i += 1;
			continue;
		}
		if (bracketDepth > 0) {
			out += ch ?? "";
			i += 1;
			continue;
		}

		const prev = i > 0 ? expression[i - 1] : "";
		const canStartRef = prev === "" || (prev !== undefined && !BEFORE_REF_INVALID_RE.test(prev));
		if (canStartRef && (ch === "$" || (ch !== undefined && /[A-Za-z]/.test(ch)))) {
			const match = INLINE_CELL_REF_RE.exec(expression.slice(i));
			if (match) {
				const [full, colDollar, colLetters, rowDollar, rowStr] = match;
				const tail = expression.slice(i + full.length);
				const nextChar = tail[0];
				const canEndRef =
					(nextChar === undefined || !AFTER_REF_INVALID_RE.test(nextChar)) &&
					!UNQUOTED_3D_SHEET_SUFFIX_RE.test(tail);
				if (canEndRef && colLetters !== undefined && rowStr !== undefined) {
					const col = tryLetterToCol(colLetters);
					const row = Number(rowStr) - 1;
					if (col !== null && row >= 0 && row <= MAX_ROW_INDEX) {
						const colAbsolute = colDollar === "$";
						const rowAbsolute = rowDollar === "$";
						const nextCol = colAbsolute ? col : col + colDelta;
						const nextRow = rowAbsolute ? row : row + rowDelta;
						out +=
							nextCol < 0 ||
							nextCol > MAX_COL_INDEX ||
							nextRow < 0 ||
							nextRow > MAX_ROW_INDEX
								? "#REF!"
								: formatCellRef(nextCol, nextRow, { colAbsolute, rowAbsolute });
						i += full.length;
						continue;
					}
				}
			}
		}

		out += ch ?? "";
		i += 1;
	}
	return out;
}

function normalizeCellKey(ref: string): string {
	const parsed = parseCellRef(ref);
	return formatCellRef(parsed.col, parsed.row);
}

export function getCell(sheet: WorksheetModel, ref: string): CellModel | undefined {
	return sheet.cells.get(normalizeCellKey(ref));
}

export function setCell(sheet: WorksheetModel, ref: string, cell: CellModel): void {
	sheet.cells.set(normalizeCellKey(ref), cell);
}
