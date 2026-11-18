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

const EXCEL_ERROR_CODE_SET: ReadonlySet<string> = new Set(EXCEL_ERROR_CODES);

export class ExcelError extends Error {
	readonly code: ExcelErrorCode;
	readonly details?: Record<string, unknown>;
	override readonly cause?: unknown;

	constructor(code: ExcelErrorCode, message: string, options?: ExcelErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause });
		this.name = "ExcelError";
		this.code = code;
		this.details = options?.details;
		this.cause = options?.cause;
	}
}

export function isExcelError(value: unknown): value is ExcelError {
	if (value instanceof ExcelError) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as { name?: unknown; code?: unknown };
	return (
		record.name === "ExcelError" &&
		typeof record.code === "string" &&
		EXCEL_ERROR_CODE_SET.has(record.code)
	);
}
