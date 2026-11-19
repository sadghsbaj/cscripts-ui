import {
	formatCellRef,
	getCell,
	letterToCol,
	parseCellRef,
	parseRangeRef,
} from "./coords.ts";
import type {
	CellModel,
	CellScalar,
	DiagnosticSeverity,
	WorkbookModel,
	WorksheetModel,
} from "./types.ts";
import { cellToString, normalizeCellText, parseLocaleNumber } from "./values.ts";

export interface ValidationIssue {
	severity: DiagnosticSeverity;
	sheet: string;
	ref?: string;
	row?: number;
	col?: number;
	code: string;
	message: string;
}

export interface ValidationReport {
	valid: boolean;
	errorCount: number;
	cautionCount: number;
	issues: ValidationIssue[];
}

export type ValidationRule =
	| {
			kind: "required";
			sheet?: string;
			col: number | string;
			startRow?: number;
			endRow?: number;
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "unique";
			sheet?: string;
			col: number | string;
			startRow?: number;
			endRow?: number;
			caseSensitive?: boolean;
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "range";
			sheet?: string;
			col: number | string;
			startRow?: number;
			endRow?: number;
			min?: number;
			max?: number;
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "sumEquals";
			sheet?: string;
			sourceRange: string;
			targetRef: string;
			tolerance?: number;
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "crossSheetEquals";
			leftSheet: string;
			leftRef: string;
			rightSheet: string;
			rightRef: string;
			tolerance?: number;
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "cutoffReached";
			sheet?: string;
			col: number | string;
			startRow?: number;
			endRow?: number;
			cutoff: number;
			operator?: ">=" | ">" | "<=" | "<";
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "noZeroBaseWithPositiveTarget";
			sheet?: string;
			baseCol: number | string;
			targetCol: number | string;
			startRow?: number;
			endRow?: number;
			severity?: DiagnosticSeverity;
			code?: string;
			message?: string;
	  }
	| {
			kind: "custom";
			sheet?: string;
			code?: string;
			severity?: DiagnosticSeverity;
			validate: (context: {
				workbook?: WorkbookModel;
				sheet: WorksheetModel;
			}) => ValidationIssue[];
	  };

function isWorkbookModel(input: WorkbookModel | WorksheetModel): input is WorkbookModel {
	return "sheets" in input && Array.isArray(input.sheets);
}

function resolveColumnIndex(col: number | string): number {
	return typeof col === "number" ? col : letterToCol(col);
}

function resolveCellScalar(cell: CellModel | undefined): CellScalar {
	if (!cell) {
		return null;
	}
	if (cell.value !== null && cell.value !== undefined) {
		return cell.value;
	}
	if (cell.richText && cell.richText.length > 0) {
		return cell.richText.map((run) => run.text).join("");
	}
	return cell.formula?.cachedResult ?? null;
}

function isEmptyScalar(value: CellScalar): boolean {
	if (value === null || value === undefined) {
		return true;
	}
	if (typeof value === "string") {
		return normalizeCellText(value).length === 0;
	}
	return false;
}

function extractNumericScalar(value: CellScalar): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? value : null;
	}
	if (typeof value === "string") {
		return parseLocaleNumber(value);
	}
	return null;
}

function getSheetRowRange(
	sheet: WorksheetModel,
	startRowOption: number | undefined,
	endRowOption: number | undefined,
): { startRow: number; endRow: number } | null {
	let maxRow1Based = 0;
	for (const ref of sheet.cells.keys()) {
		const parsed = parseCellRef(ref);
		const row1Based = parsed.row + 1;
		if (row1Based > maxRow1Based) {
			maxRow1Based = row1Based;
		}
	}

	const startRow = Math.max(1, startRowOption ?? 1);
	const endRow = endRowOption ?? maxRow1Based;
	if (endRow < startRow || endRow <= 0) {
		return null;
	}
	return { startRow, endRow };
}

function resolveTargetSheets(
	workbook: WorkbookModel | undefined,
	singleSheet: WorksheetModel | undefined,
	sheetName: string | undefined,
): { sheets: WorksheetModel[]; missingSheetName?: string } {
	if (sheetName !== undefined) {
		if (workbook) {
			const found = workbook.sheets.find((s) => s.name === sheetName);
			return found ? { sheets: [found] } : { sheets: [], missingSheetName: sheetName };
		}
		if (singleSheet && singleSheet.name === sheetName) {
			return { sheets: [singleSheet] };
		}
		return { sheets: [], missingSheetName: sheetName };
	}

	if (workbook) {
		return { sheets: workbook.sheets };
	}
	return singleSheet ? { sheets: [singleSheet] } : { sheets: [] };
}

function findSheetByName(
	workbook: WorkbookModel | undefined,
	singleSheet: WorksheetModel | undefined,
	sheetName: string,
): WorksheetModel | undefined {
	if (workbook) {
		return workbook.sheets.find((s) => s.name === sheetName);
	}
	return singleSheet?.name === sheetName ? singleSheet : undefined;
}

function areCrossSheetValuesEqual(
	left: CellScalar,
	right: CellScalar,
	tolerance: number,
): boolean {
	const leftNum = extractNumericScalar(left);
	const rightNum = extractNumericScalar(right);
	if (leftNum !== null && rightNum !== null) {
		return Math.abs(leftNum - rightNum) <= tolerance;
	}
	if (left instanceof Date && right instanceof Date) {
		return left.getTime() === right.getTime();
	}
	if (typeof left === "string" && typeof right === "string") {
		return normalizeCellText(left) === normalizeCellText(right);
	}
	return left === right;
}

function evaluateCutoff(
	value: number,
	cutoff: number,
	operator: ">=" | ">" | "<=" | "<",
): boolean {
	switch (operator) {
		case ">=": {
			return value >= cutoff;
		}
		case ">": {
			return value > cutoff;
		}
		case "<=": {
			return value <= cutoff;
		}
		case "<": {
			return value < cutoff;
		}
	}
}

function validateSingleSheetRule(
	rule: Exclude<ValidationRule, { kind: "crossSheetEquals" }>,
	sheet: WorksheetModel,
	workbook: WorkbookModel | undefined,
	issues: ValidationIssue[],
): void {
	const severity: DiagnosticSeverity = rule.severity ?? "negative";

	switch (rule.kind) {
		case "required": {
			const colIdx = resolveColumnIndex(rule.col);
			const bounds = getSheetRowRange(sheet, rule.startRow, rule.endRow);
			if (!bounds) {
				return;
			}
			for (let row1 = bounds.startRow; row1 <= bounds.endRow; row1 += 1) {
				const ref = formatCellRef(colIdx, row1 - 1);
				const val = resolveCellScalar(getCell(sheet, ref));
				if (isEmptyScalar(val)) {
					issues.push({
						severity,
						sheet: sheet.name,
						ref,
						row: row1,
						col: colIdx,
						code: rule.code ?? "REQUIRED",
						message: rule.message ?? `Cell ${ref} is required.`,
					});
				}
			}
			return;
		}

		case "unique": {
			const colIdx = resolveColumnIndex(rule.col);
			const bounds = getSheetRowRange(sheet, rule.startRow, rule.endRow);
			if (!bounds) {
				return;
			}
			const seen = new Map<string, string>();
			for (let row1 = bounds.startRow; row1 <= bounds.endRow; row1 += 1) {
				const ref = formatCellRef(colIdx, row1 - 1);
				const val = resolveCellScalar(getCell(sheet, ref));
				if (isEmptyScalar(val)) {
					continue;
				}
				const rawText = cellToString(val);
				const key = rule.caseSensitive
					? rawText
					: normalizeCellText(rawText).toLowerCase();
				const firstRef = seen.get(key);
				if (firstRef !== undefined) {
					issues.push({
						severity,
						sheet: sheet.name,
						ref,
						row: row1,
						col: colIdx,
						code: rule.code ?? "DUPLICATE_VALUE",
						message:
							rule.message ??
							`Duplicate value "${rawText}" at ${ref} (first seen at ${firstRef}).`,
					});
				} else {
					seen.set(key, ref);
				}
			}
			return;
		}

		case "range": {
			const colIdx = resolveColumnIndex(rule.col);
			const bounds = getSheetRowRange(sheet, rule.startRow, rule.endRow);
			if (!bounds) {
				return;
			}
			for (let row1 = bounds.startRow; row1 <= bounds.endRow; row1 += 1) {
				const ref = formatCellRef(colIdx, row1 - 1);
				const val = resolveCellScalar(getCell(sheet, ref));
				const num = extractNumericScalar(val);
				if (num === null) {
					continue;
				}
				const belowMin = rule.min !== undefined && num < rule.min;
				const aboveMax = rule.max !== undefined && num > rule.max;
				if (belowMin || aboveMax) {
					issues.push({
						severity,
						sheet: sheet.name,
						ref,
						row: row1,
						col: colIdx,
						code: rule.code ?? "OUT_OF_RANGE",
						message:
							rule.message ??
							`Value ${String(num)} at ${ref} is outside allowed range [${rule.min ?? "-∞"}, ${rule.max ?? "+∞"}].`,
					});
				}
			}
			return;
		}

		case "sumEquals": {
			const range = parseRangeRef(rule.sourceRange);
			let sum = 0;
			for (const [rawRef, cell] of sheet.cells.entries()) {
				const parsed = parseCellRef(rawRef);
				if (
					parsed.row >= range.start.row &&
					parsed.row <= range.end.row &&
					parsed.col >= range.start.col &&
					parsed.col <= range.end.col
				) {
					const num = extractNumericScalar(resolveCellScalar(cell));
					if (num !== null) {
						sum += num;
					}
				}
			}
			const targetParsed = parseCellRef(rule.targetRef);
			const normalizedTargetRef = formatCellRef(targetParsed.col, targetParsed.row);
			const targetScalar = resolveCellScalar(getCell(sheet, normalizedTargetRef));
			const targetNum = extractNumericScalar(targetScalar);
			const tolerance = rule.tolerance ?? 1e-6;
			if (targetNum === null || Math.abs(sum - targetNum) > tolerance) {
				const targetDisplay =
					targetNum !== null
						? String(targetNum)
						: isEmptyScalar(targetScalar)
							? "empty"
							: `non-numeric "${cellToString(targetScalar)}"`;
				issues.push({
					severity,
					sheet: sheet.name,
					ref: normalizedTargetRef,
					row: targetParsed.row + 1,
					col: targetParsed.col,
					code: rule.code ?? "SUM_MISMATCH",
					message:
						rule.message ??
						`Sum of ${rule.sourceRange} (${String(sum)}) does not match ${normalizedTargetRef} (${targetDisplay}).`,
				});
			}
			return;
		}

		case "cutoffReached": {
			const colIdx = resolveColumnIndex(rule.col);
			const bounds = getSheetRowRange(sheet, rule.startRow, rule.endRow);
			if (!bounds) {
				return;
			}
			const operator = rule.operator ?? ">=";
			for (let row1 = bounds.startRow; row1 <= bounds.endRow; row1 += 1) {
				const ref = formatCellRef(colIdx, row1 - 1);
				const num = extractNumericScalar(resolveCellScalar(getCell(sheet, ref)));
				if (num === null) {
					continue;
				}
				if (evaluateCutoff(num, rule.cutoff, operator)) {
					issues.push({
						severity,
						sheet: sheet.name,
						ref,
						row: row1,
						col: colIdx,
						code: rule.code ?? "CUTOFF_REACHED",
						message:
							rule.message ??
							`Value ${String(num)} at ${ref} reached cutoff (${operator} ${String(rule.cutoff)}).`,
					});
				}
			}
			return;
		}

		case "noZeroBaseWithPositiveTarget": {
			const baseColIdx = resolveColumnIndex(rule.baseCol);
			const targetColIdx = resolveColumnIndex(rule.targetCol);
			const bounds = getSheetRowRange(sheet, rule.startRow, rule.endRow);
			if (!bounds) {
				return;
			}
			for (let row1 = bounds.startRow; row1 <= bounds.endRow; row1 += 1) {
				const baseRef = formatCellRef(baseColIdx, row1 - 1);
				const targetRef = formatCellRef(targetColIdx, row1 - 1);
				const baseVal = extractNumericScalar(resolveCellScalar(getCell(sheet, baseRef)));
				const targetVal = extractNumericScalar(resolveCellScalar(getCell(sheet, targetRef)));
				if ((baseVal === 0 || baseVal === null) && targetVal !== null && targetVal > 0) {
					issues.push({
						severity,
						sheet: sheet.name,
						ref: targetRef,
						row: row1,
						col: targetColIdx,
						code: rule.code ?? "ZERO_BASE_POSITIVE_TARGET",
						message:
							rule.message ??
							`Row ${String(row1)} has zero/missing base (${baseRef}) with positive target ${String(targetVal)} (${targetRef}).`,
					});
				}
			}
			return;
		}

		case "custom": {
			const customIssues = rule.validate({ workbook, sheet });
			for (const issue of customIssues) {
				issues.push({
					...issue,
					severity: issue.severity ?? severity,
					code: issue.code || rule.code || "CUSTOM_VALIDATION_FAILED",
				});
			}
		}
	}
}

export function validateSheetRules(
	workbookOrSheet: WorkbookModel | WorksheetModel,
	rules: readonly ValidationRule[],
): ValidationReport {
	const workbook = isWorkbookModel(workbookOrSheet) ? workbookOrSheet : undefined;
	const singleSheet = workbook ? undefined : (workbookOrSheet as WorksheetModel);
	const issues: ValidationIssue[] = [];

	for (const rule of rules) {
		if (rule.kind === "crossSheetEquals") {
			const severity: DiagnosticSeverity = rule.severity ?? "negative";
			const leftSheet = findSheetByName(workbook, singleSheet, rule.leftSheet);
			const rightSheet = findSheetByName(workbook, singleSheet, rule.rightSheet);

			if (!leftSheet) {
				issues.push({
					severity,
					sheet: rule.leftSheet,
					code: rule.code ?? "SHEET_NOT_FOUND",
					message: `Sheet "${rule.leftSheet}" was not found for cross-sheet validation.`,
				});
				continue;
			}
			if (!rightSheet) {
				issues.push({
					severity,
					sheet: rule.rightSheet,
					code: rule.code ?? "SHEET_NOT_FOUND",
					message: `Sheet "${rule.rightSheet}" was not found for cross-sheet validation.`,
				});
				continue;
			}

			const leftParsed = parseCellRef(rule.leftRef);
			const rightParsed = parseCellRef(rule.rightRef);
			const leftNormRef = formatCellRef(leftParsed.col, leftParsed.row);
			const rightNormRef = formatCellRef(rightParsed.col, rightParsed.row);

			const leftVal = resolveCellScalar(getCell(leftSheet, leftNormRef));
			const rightVal = resolveCellScalar(getCell(rightSheet, rightNormRef));
			const tolerance = rule.tolerance ?? 1e-6;

			if (!areCrossSheetValuesEqual(leftVal, rightVal, tolerance)) {
				issues.push({
					severity,
					sheet: leftSheet.name,
					ref: leftNormRef,
					row: leftParsed.row + 1,
					col: leftParsed.col,
					code: rule.code ?? "CROSS_SHEET_MISMATCH",
					message:
						rule.message ??
						`${leftSheet.name}!${leftNormRef} (${cellToString(leftVal)}) does not equal ${rightSheet.name}!${rightNormRef} (${cellToString(rightVal)}).`,
				});
			}
			continue;
		}

		const resolved = resolveTargetSheets(workbook, singleSheet, rule.sheet);
		if (resolved.missingSheetName !== undefined) {
			issues.push({
				severity: rule.severity ?? "negative",
				sheet: resolved.missingSheetName,
				code: rule.code ?? "SHEET_NOT_FOUND",
				message: `Sheet "${resolved.missingSheetName}" was not found.`,
			});
			continue;
		}

		for (const sheet of resolved.sheets) {
			validateSingleSheetRule(rule, sheet, workbook, issues);
		}
	}

	let errorCount = 0;
	let cautionCount = 0;
	for (const issue of issues) {
		if (issue.severity === "negative") {
			errorCount += 1;
		} else {
			cautionCount += 1;
		}
	}

	return {
		valid: errorCount === 0,
		errorCount,
		cautionCount,
		issues,
	};
}
