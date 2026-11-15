export const FS_ERROR_CODES = [
	"MISSING_PREFIX",
	"INVALID_CONFIG",
	"UNSUPPORTED_ENV",
	"UNSUPPORTED_SCHEMA_VERSION",
	"UNLINKED",
	"PERMISSION_REQUIRED",
	"PERMISSION_DENIED",
	"HANDLE_STALE",
	"FILE_LOCKED",
	"FILE_TOO_LARGE",
	"NOT_FOUND",
	"INVALID_PATH",
	"VALIDATION_FAILED",
	"MIGRATION_FAILED",
	"CORRUPT_DATA",
	"CONFLICT",
	"ABORTED",
	"IO_FAILED",
] as const;

export type FsErrorCode = (typeof FS_ERROR_CODES)[number];

export interface FsErrorOptions {
	details?: Record<string, unknown>;
	cause?: unknown;
}

const FS_ERROR_CODE_SET: ReadonlySet<string> = new Set(FS_ERROR_CODES);

export class FsError extends Error {
	readonly code: FsErrorCode;
	readonly details?: Record<string, unknown>;
	override readonly cause?: unknown;

	constructor(code: FsErrorCode, message: string, options?: FsErrorOptions) {
		super(message, options?.cause === undefined ? undefined : { cause: options.cause });
		this.name = "FsError";
		this.code = code;
		this.details = options?.details;
		this.cause = options?.cause;
	}
}

export function isFsError(value: unknown): value is FsError {
	if (value instanceof FsError) {
		return true;
	}
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as { name?: unknown; code?: unknown };
	return (
		record.name === "FsError" &&
		typeof record.code === "string" &&
		FS_ERROR_CODE_SET.has(record.code)
	);
}
