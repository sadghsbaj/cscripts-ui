import { readCsvText, writeCsvText, type ReadCsvOptions, type WriteCsvOptions } from "./csv.ts";
import { ExcelError } from "./errors.ts";
import { readXlsxBytes, writeXlsxBytes, type ReadXlsxOptions, type WriteXlsxOptions } from "./ooxml.ts";
import type { StandardSchemaResult, StandardSchemaV1 } from "./query.ts";
import type { WorkbookModel, WorksheetModel } from "./types.ts";

export type { StandardSchemaIssue, StandardSchemaResult, StandardSchemaV1 } from "./query.ts";

export interface AdapterDecodeContext {
	path: string;
	file: File;
	readBytes(): Promise<Uint8Array>;
	readText(): Promise<string>;
}

export interface AdapterDecodeResult<TData, TDecodedMeta = unknown> {
	data: TData;
	meta?: TDecodedMeta;
	migrated?: boolean;
	fromVersion?: number;
	warnings?: string[];
}

export interface AdapterEncodeContext {
	path: string;
}

export interface FileAdapter<TData, TDecodedMeta = unknown> {
	readonly id: string;
	readonly extensions: readonly string[];
	decode(ctx: AdapterDecodeContext): Promise<AdapterDecodeResult<TData, TDecodedMeta>>;
	encode(data: TData, ctx: AdapterEncodeContext): Promise<Uint8Array | string>;
}

export interface XlsxAdapterMeta {
	sourceFormat?: WorkbookModel["sourceFormat"];
	sheetNames: string[];
}

export interface XlsxAdapterOptions<TData = WorkbookModel> {
	id?: string;
	extensions?: readonly string[];
	readOptions?: ReadXlsxOptions;
	writeOptions?: WriteXlsxOptions;
	fromWorkbook?: (workbook: WorkbookModel, ctx: AdapterDecodeContext) => TData | Promise<TData>;
	toWorkbook?: (data: TData, ctx: AdapterEncodeContext) => WorkbookModel | Promise<WorkbookModel>;
	schema?: StandardSchemaV1<unknown, TData>;
}

export interface CsvAdapterMeta {
	sheetName: string;
}

export interface CsvAdapterOptions<TData = WorkbookModel> {
	id?: string;
	extensions?: readonly string[];
	readOptions?: ReadCsvOptions;
	writeOptions?: WriteCsvOptions;
	sheetName?: string;
	fromWorkbook?: (workbook: WorkbookModel, ctx: AdapterDecodeContext) => TData | Promise<TData>;
	toWorksheet?: (
		data: TData,
		ctx: AdapterEncodeContext,
	) => WorksheetModel | Promise<WorksheetModel>;
	schema?: StandardSchemaV1<unknown, TData>;
}

const DEFAULT_XLSX_EXTENSIONS: readonly string[] = [".xlsx", ".xlsm", ".xltx", ".xltm"];
const DEFAULT_CSV_EXTENSIONS: readonly string[] = [".csv", ".tsv"];

function assertValidAdapterConfig(id: string, extensions: readonly string[]): void {
	if (typeof id !== "string" || id.trim().length === 0) {
		throw new ExcelError("INVALID_CONFIG", "Adapter 'id' must be a non-empty string.", {
			details: { id },
		});
	}
	if (!Array.isArray(extensions) || extensions.length === 0) {
		throw new ExcelError(
			"INVALID_CONFIG",
			`Adapter "${id}" must declare at least one file extension.`,
			{ details: { id, extensions } },
		);
	}
	for (const ext of extensions) {
		if (typeof ext !== "string" || !ext.startsWith(".") || ext.length < 2) {
			throw new ExcelError(
				"INVALID_CONFIG",
				`Adapter "${id}" has invalid extension "${String(ext)}". Extensions must start with ".".`,
				{ details: { id, extension: ext } },
			);
		}
	}
}

function assertValidSchema<T>(schema: StandardSchemaV1<unknown, T> | undefined): void {
	if (schema === undefined) {
		return;
	}
	const standard = schema?.["~standard"];
	if (
		typeof standard !== "object" ||
		standard === null ||
		standard.version !== 1 ||
		typeof standard.validate !== "function"
	) {
		throw new ExcelError(
			"INVALID_CONFIG",
			"Invalid Standard Schema v1 object: expected '~standard.version === 1' and a validate() function.",
		);
	}
}

async function validateWithSchema<T>(
	candidate: unknown,
	schema: StandardSchemaV1<unknown, T>,
	path: string,
): Promise<T> {
	let result: StandardSchemaResult<T>;
	try {
		result = await schema["~standard"].validate(candidate);
	} catch (error) {
		throw new ExcelError(
			"SCHEMA_VALIDATION_FAILED",
			`Schema validation threw for "${path}".`,
			{
				details: { path },
				cause: error,
			},
		);
	}

	const rawResult: unknown = result;
	if (rawResult === null || typeof rawResult !== "object") {
		throw new ExcelError(
			"SCHEMA_VALIDATION_FAILED",
			`Schema validation returned an invalid result for "${path}".`,
			{
				details: { path },
			},
		);
	}

	if ("issues" in result && result.issues !== undefined && result.issues.length > 0) {
		const firstMessage = result.issues[0]?.message ?? "Validation failed.";
		throw new ExcelError(
			"SCHEMA_VALIDATION_FAILED",
			`Schema validation failed for "${path}": ${firstMessage}`,
			{
				details: {
					issues: result.issues,
					path,
				},
			},
		);
	}

	if (result.issues !== undefined) {
		throw new ExcelError(
			"SCHEMA_VALIDATION_FAILED",
			`Schema validation failed for "${path}".`,
			{
				details: {
					issues: result.issues,
					path,
				},
			},
		);
	}

	return result.value;
}

function isWorkbookModel(value: unknown): value is WorkbookModel {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as { sheets?: unknown; dateSystem?: unknown };
	return (
		Array.isArray(record.sheets) &&
		(record.dateSystem === 1900 || record.dateSystem === 1904)
	);
}

function isWorksheetModel(value: unknown): value is WorksheetModel {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const record = value as { name?: unknown; cells?: unknown };
	return typeof record.name === "string" && record.cells instanceof Map;
}

export function createXlsxAdapter<TData = WorkbookModel>(
	options?: XlsxAdapterOptions<TData>,
): FileAdapter<TData, XlsxAdapterMeta> {
	const id = options?.id ?? "xlsx";
	const extensions = options?.extensions ?? DEFAULT_XLSX_EXTENSIONS;

	assertValidAdapterConfig(id, extensions);
	assertValidSchema(options?.schema);

	return {
		id,
		extensions,
		async decode(ctx: AdapterDecodeContext): Promise<AdapterDecodeResult<TData, XlsxAdapterMeta>> {
			const bytes = await ctx.readBytes();
			const workbook = readXlsxBytes(bytes, options?.readOptions);
			const candidate: unknown =
				options?.fromWorkbook !== undefined
					? await options.fromWorkbook(workbook, ctx)
					: workbook;

			const data =
				options?.schema !== undefined
					? await validateWithSchema(candidate, options.schema, ctx.path)
					: (candidate as TData);

			return {
				data,
				meta: {
					sourceFormat: workbook.sourceFormat,
					sheetNames: workbook.sheets.map((sheet) => sheet.name),
				},
			};
		},
		async encode(data: TData, ctx: AdapterEncodeContext): Promise<Uint8Array> {
			let workbook: WorkbookModel;
			if (options?.toWorkbook !== undefined) {
				workbook = await options.toWorkbook(data, ctx);
			} else if (isWorkbookModel(data)) {
				workbook = data;
			} else {
				throw new ExcelError(
					"INVALID_CONFIG",
					`Cannot encode value for "${ctx.path}": expected a WorkbookModel or a custom toWorkbook() option.`,
					{ details: { path: ctx.path } },
				);
			}

			return writeXlsxBytes(workbook, options?.writeOptions);
		},
	};
}

export function createCsvAdapter<TData = WorkbookModel>(
	options?: CsvAdapterOptions<TData>,
): FileAdapter<TData, CsvAdapterMeta> {
	const id = options?.id ?? "csv";
	const extensions = options?.extensions ?? DEFAULT_CSV_EXTENSIONS;

	assertValidAdapterConfig(id, extensions);
	assertValidSchema(options?.schema);

	return {
		id,
		extensions,
		async decode(ctx: AdapterDecodeContext): Promise<AdapterDecodeResult<TData, CsvAdapterMeta>> {
			const text = await ctx.readText();
			const readOptions: ReadCsvOptions | undefined =
				options?.sheetName !== undefined && options.readOptions?.sheetName === undefined
					? { ...options.readOptions, sheetName: options.sheetName }
					: options?.readOptions;

			const workbook = readCsvText(text, readOptions);
			const sheetName =
				workbook.sheets[0]?.name ??
				options?.sheetName ??
				options?.readOptions?.sheetName ??
				"Sheet1";

			const candidate: unknown =
				options?.fromWorkbook !== undefined
					? await options.fromWorkbook(workbook, ctx)
					: workbook;

			const data =
				options?.schema !== undefined
					? await validateWithSchema(candidate, options.schema, ctx.path)
					: (candidate as TData);

			return {
				data,
				meta: { sheetName },
			};
		},
		async encode(data: TData, ctx: AdapterEncodeContext): Promise<string> {
			let sheet: WorksheetModel;
			if (options?.toWorksheet !== undefined) {
				sheet = await options.toWorksheet(data, ctx);
			} else if (isWorkbookModel(data)) {
				const firstSheet = data.sheets[0];
				if (firstSheet === undefined) {
					throw new ExcelError(
						"INVALID_CONFIG",
						`Cannot encode empty WorkbookModel for "${ctx.path}": workbook contains no sheets.`,
						{ details: { path: ctx.path } },
					);
				}
				sheet = firstSheet;
			} else if (isWorksheetModel(data)) {
				sheet = data;
			} else {
				throw new ExcelError(
					"INVALID_CONFIG",
					`Cannot encode value for "${ctx.path}": expected a WorkbookModel, WorksheetModel, or a custom toWorksheet() option.`,
					{ details: { path: ctx.path } },
				);
			}

			return writeCsvText(sheet, options?.writeOptions);
		},
	};
}
