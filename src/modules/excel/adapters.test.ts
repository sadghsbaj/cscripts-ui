import { describe, expect, it } from "vitest";
import type { FileAdapter as FsFileAdapter } from "../file-system/adapters.ts";
import {
	createCsvAdapter,
	createXlsxAdapter,
	type AdapterDecodeContext,
	type FileAdapter,
	type StandardSchemaResult,
	type StandardSchemaV1,
} from "./adapters.ts";
import { getCell, setCell } from "./coords.ts";
import { ExcelError, isExcelError } from "./errors.ts";
import type { CellModel, WorkbookModel, WorksheetModel } from "./types.ts";

function makeSheet(name: string, entries: ReadonlyArray<[string, CellModel]>): WorksheetModel {
	const sheet: WorksheetModel = {
		name,
		cells: new Map<string, CellModel>(),
	};
	for (const [ref, cell] of entries) {
		setCell(sheet, ref, cell);
	}
	return sheet;
}

function makeWorkbook(): WorkbookModel {
	return {
		dateSystem: 1900,
		sheets: [
			makeSheet("Sales", [
				["A1", { value: "Product" }],
				["B1", { value: "Amount" }],
				["A2", { value: "Widget" }],
				["B2", { value: 125.5 }],
				["A3", { value: "Gadget" }],
				["B3", { value: 300 }],
			]),
		],
	};
}

function firstSheet(workbook: WorkbookModel): WorksheetModel {
	const sheet = workbook.sheets[0];
	if (sheet === undefined) {
		throw new Error("Expected workbook to contain at least one sheet.");
	}
	return sheet;
}

function makeDecodeContext(path: string, payload: Uint8Array | string): AdapterDecodeContext {
	const bytes =
		typeof payload === "string" ? new TextEncoder().encode(payload) : new Uint8Array(payload);
	const text = typeof payload === "string" ? payload : new TextDecoder().decode(payload);
	const file = new File([bytes], path.split("/").at(-1) ?? path);
	return {
		path,
		file,
		async readBytes() {
			return bytes;
		},
		async readText() {
			return text;
		},
	};
}

async function expectExcelErrorCode(
	promise: Promise<unknown>,
	expectedCode: ExcelError["code"],
): Promise<ExcelError> {
	try {
		await promise;
		expect.unreachable(`Expected ExcelError("${expectedCode}") to be thrown.`);
	} catch (error) {
		expect(isExcelError(error)).toBe(true);
		const excelError = error as ExcelError;
		expect(excelError.code).toBe(expectedCode);
		return excelError;
	}
}

interface SalesRow {
	product: string;
	amount: number;
}

function createSalesSchema(mode: "sync" | "async"): StandardSchemaV1<unknown, SalesRow[]> {
	const validateImpl = (value: unknown): StandardSchemaResult<SalesRow[]> => {
		if (!Array.isArray(value)) {
			return {
				issues: [{ message: "Expected an array of sales rows.", path: [] }],
			};
		}
		const out: SalesRow[] = [];
		for (const [index, entry] of value.entries()) {
			const record = typeof entry === "object" && entry !== null ? (entry as Record<string, unknown>) : null;
			const product = record?.product;
			const amount = record?.amount;
			if (typeof product !== "string" || typeof amount !== "number" || amount < 0) {
				return {
					issues: [
						{
							message: `Invalid row at index ${index}`,
							path: [index, "amount"],
						},
					],
				};
			}
			out.push({
				product: product.trim(),
				amount,
			});
		}
		return { value: out };
	};

	return {
		"~standard": {
			version: 1,
			vendor: "test",
			validate:
				mode === "sync"
					? validateImpl
					: async (value: unknown) => {
							await Promise.resolve();
							return validateImpl(value);
						},
		},
	};
}

async function salesRowsFromXlsxWorkbook(workbook: WorkbookModel): Promise<SalesRow[]> {
	await Promise.resolve();
	const sheet = firstSheet(workbook);
	return [
		{
			product: String(getCell(sheet, "A2")?.value ?? ""),
			amount: Number(getCell(sheet, "B2")?.value ?? 0),
		},
		{
			product: String(getCell(sheet, "A3")?.value ?? ""),
			amount: Number(getCell(sheet, "B3")?.value ?? 0),
		},
	];
}

async function salesRowsToXlsxWorkbook(rows: SalesRow[]): Promise<WorkbookModel> {
	await Promise.resolve();
	const entries: Array<[string, CellModel]> = [
		["A1", { value: "Product" }],
		["B1", { value: "Amount" }],
	];
	for (const [idx, row] of rows.entries()) {
		entries.push(
			[`A${idx + 2}`, { value: row.product }],
			[`B${idx + 2}`, { value: row.amount }],
		);
	}
	return {
		dateSystem: 1900,
		sheets: [makeSheet("Sales", entries)],
	};
}

function salesRowsFromCsvWorkbook(workbook: WorkbookModel): SalesRow[] {
	const sheet = firstSheet(workbook);
	return [
		{
			product: String(getCell(sheet, "A2")?.value ?? ""),
			amount: Number(getCell(sheet, "B2")?.value ?? 0),
		},
	];
}

function salesRowsToCsvWorksheet(rows: SalesRow[]): WorksheetModel {
	const entries: Array<[string, CellModel]> = [
		["A1", { value: "Product" }],
		["B1", { value: "Amount" }],
	];
	for (const [idx, row] of rows.entries()) {
		entries.push(
			[`A${idx + 2}`, { value: row.product }],
			[`B${idx + 2}`, { value: row.amount }],
		);
	}
	return makeSheet("Sales", entries);
}

describe("adapters: createXlsxAdapter", () => {
	it("exposes default id and extensions and roundtrips a WorkbookModel", async () => {
		const adapter = createXlsxAdapter();
		expect(adapter.id).toBe("xlsx");
		expect(adapter.extensions).toEqual([".xlsx", ".xlsm", ".xltx", ".xltm"]);

		const wb = makeWorkbook();
		const encoded = await adapter.encode(wb, { path: "reports/sales.xlsx" });
		expect(encoded).toBeInstanceOf(Uint8Array);

		const decoded = await adapter.decode(makeDecodeContext("reports/sales.xlsx", encoded));
		expect(decoded.meta?.sheetNames).toEqual(["Sales"]);
		expect(decoded.meta?.sourceFormat).toBe("xlsx");
		expect(decoded.data.sheets).toHaveLength(1);
		const sheet = firstSheet(decoded.data);
		expect(getCell(sheet, "A2")?.value).toBe("Widget");
		expect(getCell(sheet, "B2")?.value).toBe(125.5);
		expect(getCell(sheet, "B3")?.value).toBe(300);
	});

	it("supports custom fromWorkbook / toWorkbook and sync & async StandardSchemaV1 validation", async () => {
		for (const mode of ["sync", "async"] as const) {
			const adapter = createXlsxAdapter<SalesRow[]>({
				id: `sales-${mode}`,
				extensions: [".xlsx"],
				fromWorkbook: salesRowsFromXlsxWorkbook,
				toWorkbook: salesRowsToXlsxWorkbook,
				schema: createSalesSchema(mode),
			});

			expect(adapter.id).toBe(`sales-${mode}`);
			expect(adapter.extensions).toEqual([".xlsx"]);

			const validRows: SalesRow[] = [
				{ product: "  Alpha  ", amount: 10 },
				{ product: "Beta", amount: 25 },
			];
			const encoded = await adapter.encode(validRows, { path: "sales.xlsx" });
			const decoded = await adapter.decode(makeDecodeContext("sales.xlsx", encoded));
			expect(decoded.data).toEqual([
				{ product: "Alpha", amount: 10 },
				{ product: "Beta", amount: 25 },
			]);

			const invalidEncoded = await adapter.encode(
				[
					{ product: "Alpha", amount: 10 },
					{ product: "Bad", amount: -5 },
				],
				{ path: "bad.xlsx" },
			);
			const err = await expectExcelErrorCode(
				adapter.decode(makeDecodeContext("bad.xlsx", invalidEncoded)),
				"SCHEMA_VALIDATION_FAILED",
			);
			expect(err.details?.path).toBe("bad.xlsx");
			expect(err.details?.issues).toEqual([
				{ message: "Invalid row at index 1", path: [1, "amount"] },
			]);
		}
	});

	it("validates adapter config and rejects non-WorkbookModel encode without toWorkbook", async () => {
		expect(() => createXlsxAdapter({ id: "  " })).toThrow(ExcelError);
		expect(() => createXlsxAdapter({ extensions: [] })).toThrow(ExcelError);
		expect(() => createXlsxAdapter({ extensions: ["xlsx"] })).toThrow(ExcelError);

		const invalidSchemas: unknown[] = [
			{},
			{ "~standard": null },
			{ "~standard": { version: 2, vendor: "bad", validate: () => ({ value: null }) } },
			{ "~standard": { version: 1, vendor: "bad", validate: "not-a-function" } },
		];
		for (const badSchema of invalidSchemas) {
			let caught: unknown;
			try {
				createXlsxAdapter({ schema: badSchema as StandardSchemaV1<unknown, WorkbookModel> });
			} catch (error) {
				caught = error;
			}
			expect(isExcelError(caught)).toBe(true);
			expect((caught as ExcelError).code).toBe("INVALID_CONFIG");
		}

		const adapter = createXlsxAdapter<unknown>();
		await expectExcelErrorCode(
			adapter.encode({ not: "a workbook" }, { path: "wrong.xlsx" }),
			"INVALID_CONFIG",
		);
	});

	it("throws SCHEMA_VALIDATION_FAILED when schema.validate throws, returns empty issues[], or returns null/undefined", async () => {
		const validBytes = await createXlsxAdapter().encode(makeWorkbook(), { path: "sales.xlsx" });
		const rootCause = new TypeError("Schema crashed");

		const throwingAdapter = createXlsxAdapter({
			schema: {
				"~standard": {
					version: 1,
					vendor: "test-throw",
					validate: () => {
						throw rootCause;
					},
				},
			},
		});
		const throwErr = await expectExcelErrorCode(
			throwingAdapter.decode(makeDecodeContext("throw.xlsx", validBytes)),
			"SCHEMA_VALIDATION_FAILED",
		);
		expect(throwErr.cause).toBe(rootCause);
		expect(throwErr.details?.path).toBe("throw.xlsx");

		const emptyIssuesAdapter = createXlsxAdapter({
			schema: {
				"~standard": {
					version: 1,
					vendor: "test-empty-issues",
					validate: () => ({ issues: [] }),
				},
			},
		});
		await expectExcelErrorCode(
			emptyIssuesAdapter.decode(makeDecodeContext("empty-issues.xlsx", validBytes)),
			"SCHEMA_VALIDATION_FAILED",
		);

		for (const badResult of [null, undefined] as const) {
			const invalidReturnAdapter = createXlsxAdapter({
				schema: {
					"~standard": {
						version: 1,
						vendor: "test-bad-return",
						validate: () => badResult as unknown as StandardSchemaResult<WorkbookModel>,
					},
				},
			});
			await expectExcelErrorCode(
				invalidReturnAdapter.decode(makeDecodeContext("bad-return.xlsx", validBytes)),
				"SCHEMA_VALIDATION_FAILED",
			);
		}
	});
});

describe("adapters: createCsvAdapter", () => {
	it("exposes default id and extensions and roundtrips WorkbookModel and WorksheetModel", async () => {
		const adapter = createCsvAdapter({ sheetName: "Imported" });
		expect(adapter.id).toBe("csv");
		expect(adapter.extensions).toEqual([".csv", ".tsv"]);

		// Roundtrip WorkbookModel
		const wb = makeWorkbook();
		const csvFromWb = await adapter.encode(wb, { path: "sales.csv" });
		expect(typeof csvFromWb).toBe("string");

		const decodedWb = await adapter.decode(makeDecodeContext("sales.csv", csvFromWb));
		expect(decodedWb.meta?.sheetName).toBe("Imported");
		const decodedWbSheet = firstSheet(decodedWb.data);
		expect(decodedWbSheet.name).toBe("Imported");
		expect(getCell(decodedWbSheet, "A2")?.value).toBe("Widget");
		expect(getCell(decodedWbSheet, "B2")?.value).toBe("125.5");

		// Roundtrip direct WorksheetModel
		const sheetAdapter = createCsvAdapter<WorksheetModel>({
			sheetName: "DirectSheet",
			fromWorkbook: firstSheet,
		});
		const directSheet = firstSheet(wb);
		const csvFromSheet = await sheetAdapter.encode(directSheet, { path: "direct.csv" });
		const decodedSheet = await sheetAdapter.decode(
			makeDecodeContext("direct.csv", csvFromSheet),
		);
		expect(decodedSheet.meta?.sheetName).toBe("DirectSheet");
		expect(decodedSheet.data.name).toBe("DirectSheet");
		expect(getCell(decodedSheet.data, "A3")?.value).toBe("Gadget");
		expect(getCell(decodedSheet.data, "B3")?.value).toBe("300");
	});

	it("supports custom fromWorkbook / toWorksheet and sync & async StandardSchemaV1 validation", async () => {
		for (const mode of ["sync", "async"] as const) {
			const adapter = createCsvAdapter<SalesRow[]>({
				id: `csv-${mode}`,
				fromWorkbook: salesRowsFromCsvWorkbook,
				toWorksheet: salesRowsToCsvWorksheet,
				schema: createSalesSchema(mode),
			});

			const encoded = await adapter.encode([{ product: "  Pencil  ", amount: 4 }], {
				path: "items.csv",
			});
			const decoded = await adapter.decode(makeDecodeContext("items.csv", encoded));
			expect(decoded.data).toEqual([{ product: "Pencil", amount: 4 }]);

			const badEncoded = await adapter.encode([{ product: "Pencil", amount: -1 }], {
				path: "bad.csv",
			});
			const err = await expectExcelErrorCode(
				adapter.decode(makeDecodeContext("bad.csv", badEncoded)),
				"SCHEMA_VALIDATION_FAILED",
			);
			expect(err.details?.path).toBe("bad.csv");
			expect(err.details?.issues).toEqual([
				{ message: "Invalid row at index 0", path: [0, "amount"] },
			]);
		}
	});

	it("rejects empty WorkbookModel or invalid value when encoding without toWorksheet", async () => {
		const adapter = createCsvAdapter<unknown>();
		const emptyWb: WorkbookModel = { dateSystem: 1900, sheets: [] };
		await expectExcelErrorCode(adapter.encode(emptyWb, { path: "empty.csv" }), "INVALID_CONFIG");
		await expectExcelErrorCode(adapter.encode(12_345, { path: "num.csv" }), "INVALID_CONFIG");
	});

	it("rejects invalid StandardSchemaV1 config and handles throwing / empty issues[] / null / undefined schema results", async () => {
		let configErr: unknown;
		try {
			createCsvAdapter({
				schema: { "~standard": { version: 2, vendor: "bad", validate: () => ({ value: null }) } } as unknown as StandardSchemaV1<
					unknown,
					WorkbookModel
				>,
			});
		} catch (error) {
			configErr = error;
		}
		expect(isExcelError(configErr)).toBe(true);
		expect((configErr as ExcelError).code).toBe("INVALID_CONFIG");

		const csvPayload = "Product,Amount\nWidget,10\n";

		const throwingAdapter = createCsvAdapter({
			schema: {
				"~standard": {
					version: 1,
					vendor: "test-throw",
					validate: async () => {
						await Promise.resolve();
						throw new Error("Async schema boom");
					},
				},
			},
		});
		await expectExcelErrorCode(
			throwingAdapter.decode(makeDecodeContext("throw.csv", csvPayload)),
			"SCHEMA_VALIDATION_FAILED",
		);

		const emptyIssuesAdapter = createCsvAdapter({
			schema: {
				"~standard": {
					version: 1,
					vendor: "test-empty-issues",
					validate: () => ({ issues: [] }),
				},
			},
		});
		await expectExcelErrorCode(
			emptyIssuesAdapter.decode(makeDecodeContext("empty.csv", csvPayload)),
			"SCHEMA_VALIDATION_FAILED",
		);

		for (const badResult of [null, undefined] as const) {
			const invalidReturnAdapter = createCsvAdapter({
				schema: {
					"~standard": {
						version: 1,
						vendor: "test-bad-return",
						validate: () => badResult as unknown as StandardSchemaResult<WorkbookModel>,
					},
				},
			});
			await expectExcelErrorCode(
				invalidReturnAdapter.decode(makeDecodeContext("bad.csv", csvPayload)),
				"SCHEMA_VALIDATION_FAILED",
			);
		}
	});
});

describe("adapters: structural compatibility with file-system FileAdapter", () => {
	it("excel FileAdapter instances are structurally assignable to file-system FileAdapter", () => {
		const xlsxAdapter = createXlsxAdapter();
		const csvAdapter = createCsvAdapter();

		// Compile-time assignability checks (enforced by svelte-check / tsc)
		const fsXlsx: FsFileAdapter<WorkbookModel> = xlsxAdapter;
		const fsCsv: FsFileAdapter<WorkbookModel> = csvAdapter;

		// Generic interface-level assignability check
		const checkAssignability = <TData, TMeta>(
			excelAdapter: FileAdapter<TData, TMeta>,
		): FsFileAdapter<TData, TMeta> => excelAdapter;

		expect(checkAssignability(xlsxAdapter)).toBe(fsXlsx);
		expect(checkAssignability(csvAdapter)).toBe(fsCsv);
		expect(fsXlsx.id).toBe("xlsx");
		expect(fsCsv.id).toBe("csv");
	});
});
