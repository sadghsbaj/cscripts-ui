import { afterEach, describe, expect, it, vi } from "vitest";
import {
	downloadCsvText,
	downloadXlsxBytes,
	isTempOfficeFile,
	readExcelFile,
	slugifyFileName,
} from "./browser-io.ts";
import { setCell } from "./coords.ts";
import { ExcelError, isExcelError } from "./errors.ts";
import { writeXlsxBytes } from "./ooxml.ts";
import type { WorkbookModel } from "./types.ts";

const OLE2_MAGIC_BYTES = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
const ZIP_LOCAL_HEADER_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
const ZIP_EMPTY_ARCHIVE_BYTES = new Uint8Array([0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00]);

function makeMinimalXlsxBytes(): Uint8Array<ArrayBuffer> {
	const sheet = { name: "Sheet1", cells: new Map() };
	setCell(sheet, "A1", { value: "Hello" });
	setCell(sheet, "B1", { value: 42 });
	const workbook: WorkbookModel = {
		dateSystem: 1900,
		sheets: [sheet],
	};
	return new Uint8Array(writeXlsxBytes(workbook));
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

describe("browser-io: isTempOfficeFile", () => {
	it("returns true for Office temp lock files across bare names and POSIX/Windows paths", () => {
		expect(isTempOfficeFile("~$Report.xlsx")).toBe(true);
		expect(isTempOfficeFile(String.raw`C:\dir\~$Budget.xlsm`)).toBe(true);
		expect(isTempOfficeFile("sub/~$Notes.xlsx")).toBe(true);
		expect(isTempOfficeFile(String.raw`C:\dir/nested\~$Draft.xltx`)).toBe(true);
	});

	it("returns false for regular files and non-prefix tilde/dollar sequences", () => {
		expect(isTempOfficeFile("Report.xlsx")).toBe(false);
		expect(isTempOfficeFile("~Report.xlsx")).toBe(false);
		expect(isTempOfficeFile("data~$1.xlsx")).toBe(false);
		expect(isTempOfficeFile("~$dir/Report.xlsx")).toBe(false);
		expect(isTempOfficeFile("")).toBe(false);
	});
});

describe("browser-io: slugifyFileName", () => {
	it("transliterates German umlauts and eszett and strips combining diacritics", () => {
		expect(slugifyFileName(["Änderung", "Öl", "Übersicht", "Straße"])).toBe(
			"aenderung-oel-uebersicht-strasse",
		);
		expect(slugifyFileName(["Café", "Résumé", "naïve", "crème brûlée"])).toBe(
			"cafe-resume-naive-creme-brulee",
		);
	});

	it("collapses punctuation, trims stray separators, and supports custom separators", () => {
		expect(slugifyFileName(["  Hello,   World!!  ", "---Q1 / 2026---"])).toBe(
			"hello-world-q1-2026",
		);
		expect(
			slugifyFileName(["Sales Report", "Region: EMEA"], {
				separator: "_",
			}),
		).toBe("sales_report_region_emea");
		expect(slugifyFileName(["Alpha", "Beta"], { separator: "" })).toBe("alphabeta");
	});

	it("handles extension with and without leading dots", () => {
		expect(slugifyFileName(["Budget", "2026"], { extension: "xlsx" })).toBe("budget-2026.xlsx");
		expect(slugifyFileName(["Budget", "2026"], { extension: ".xlsx" })).toBe("budget-2026.xlsx");
		expect(slugifyFileName(["Budget", "2026"], { extension: "  ..CSV  " })).toBe(
			"budget-2026.csv",
		);
		expect(slugifyFileName(["Budget"], { extension: "..." })).toBe("budget");
	});

	it("appends UTC YYYY-MM-DD dateSuffix for boolean true and explicit Date instances", () => {
		const fixedDate = new Date(Date.UTC(2026, 2, 5, 23, 59, 59));
		expect(
			slugifyFileName(["Report"], {
				dateSuffix: fixedDate,
				extension: "xlsx",
			}),
		).toBe("report-2026-03-05.xlsx");

		expect(
			slugifyFileName(["Report"], {
				dateSuffix: fixedDate,
				separator: "_",
				extension: ".csv",
			}),
		).toBe("report_2026-03-05.csv");

		const nowUtc = new Date();
		const expectedToday = `${String(nowUtc.getUTCFullYear()).padStart(4, "0")}-${String(nowUtc.getUTCMonth() + 1).padStart(2, "0")}-${String(nowUtc.getUTCDate()).padStart(2, "0")}`;
		expect(slugifyFileName(["Daily"], { dateSuffix: true })).toBe(`daily-${expectedToday}`);
	});

	it("throws INVALID_CONFIG when dateSuffix is an invalid Date", () => {
		try {
			slugifyFileName(["Report"], { dateSuffix: new Date("not-a-date") });
			expect.unreachable("Expected INVALID_CONFIG error.");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			expect((error as ExcelError).code).toBe("INVALID_CONFIG");
		}
	});

	it('falls back to "export" when all parts are empty or non-alphanumeric', () => {
		expect(slugifyFileName([])).toBe("export");
		expect(slugifyFileName(["", " ".repeat(3), "!!!", "---"])).toBe("export");
		const fallbackDate = new Date(Date.UTC(2026, 0, 9));
		expect(
			slugifyFileName([" ".repeat(3), "###"], {
				dateSuffix: fallbackDate,
				extension: "xlsx",
			}),
		).toBe("export-2026-01-09.xlsx");
	});
});

describe("browser-io: readExcelFile", () => {
	it("detects OOXML extensions (.xlsx, .xlsm, .xltx, .xltm) with valid ZIP bytes", async () => {
		const xlsxBytes = makeMinimalXlsxBytes();
		const cases: ReadonlyArray<readonly [string, "xlsx" | "xlsm" | "xltx" | "xltm"]> = [
			["report.xlsx", "xlsx"],
			["macros.XLSM", "xlsm"],
			["template.xltx", "xltx"],
			["macro-template.xltm", "xltm"],
		];

		for (const [name, expectedFormat] of cases) {
			const file = new File([xlsxBytes], name);
			const result = await readExcelFile(file);
			expect(result.name).toBe(name);
			expect(result.format).toBe(expectedFormat);
			expect(result.bytes).toEqual(xlsxBytes);
		}
	});

	it("detects .csv and .tsv File extensions", async () => {
		const csvFile = new File(["a,b\n1,2\n"], "data.csv", { type: "text/csv" });
		const csvResult = await readExcelFile(csvFile);
		expect(csvResult.name).toBe("data.csv");
		expect(csvResult.format).toBe("csv");
		expect(new TextDecoder().decode(csvResult.bytes)).toBe("a,b\n1,2\n");

		const tsvFile = new File(["a\tb\n1\t2\n"], "data.TSV", {
			type: "text/tab-separated-values",
		});
		const tsvResult = await readExcelFile(tsvFile);
		expect(tsvResult.name).toBe("data.TSV");
		expect(tsvResult.format).toBe("tsv");
		expect(new TextDecoder().decode(tsvResult.bytes)).toBe("a\tb\n1\t2\n");
	});

	it("detects unnamed Blobs from ZIP magic bytes and MIME types", async () => {
		const zipBlob = new Blob([ZIP_LOCAL_HEADER_BYTES]);
		const zipResult = await readExcelFile(zipBlob);
		expect(zipResult.name).toBe("");
		expect(zipResult.format).toBe("xlsx");
		expect(zipResult.bytes).toEqual(ZIP_LOCAL_HEADER_BYTES);

		const emptyZipBlob = new Blob([ZIP_EMPTY_ARCHIVE_BYTES]);
		const emptyZipResult = await readExcelFile(emptyZipBlob);
		expect(emptyZipResult.format).toBe("xlsx");

		const xlsmMimeBlob = new Blob([ZIP_LOCAL_HEADER_BYTES], {
			type: "application/vnd.ms-excel.sheet.macroenabled.12",
		});
		const xlsmResult = await readExcelFile(xlsmMimeBlob);
		expect(xlsmResult.format).toBe("xlsm");

		const csvBlob = new Blob(["col1,col2\n1,2\n"], { type: "text/csv;charset=utf-8" });
		const csvResult = await readExcelFile(csvBlob);
		expect(csvResult.name).toBe("");
		expect(csvResult.format).toBe("csv");

		const tsvBlob = new Blob(["col1\tcol2\n1\t2\n"], {
			type: "text/tab-separated-values",
		});
		const tsvResult = await readExcelFile(tsvBlob);
		expect(tsvResult.name).toBe("");
		expect(tsvResult.format).toBe("tsv");

		const untypedTsvBlob = new Blob(["k\tv\n1\t2\n"]);
		const untypedTsvResult = await readExcelFile(untypedTsvBlob);
		expect(untypedTsvResult.format).toBe("tsv");
	});

	it("throws UNSUPPORTED_FORMAT for OLE2 (.xls), .xlsb, .ods, and unsupported MIME/binary inputs", async () => {
		await expectExcelErrorCode(
			readExcelFile(new File([OLE2_MAGIC_BYTES], "legacy.xls")),
			"UNSUPPORTED_FORMAT",
		);
		await expectExcelErrorCode(
			readExcelFile(new Blob([OLE2_MAGIC_BYTES])),
			"UNSUPPORTED_FORMAT",
		);
		await expectExcelErrorCode(
			readExcelFile(new File([ZIP_LOCAL_HEADER_BYTES], "binary.xlsb")),
			"UNSUPPORTED_FORMAT",
		);
		await expectExcelErrorCode(
			readExcelFile(new File([ZIP_LOCAL_HEADER_BYTES], "calc.ods")),
			"UNSUPPORTED_FORMAT",
		);
		await expectExcelErrorCode(
			readExcelFile(new File(["plain"], "notes.txt")),
			"UNSUPPORTED_FORMAT",
		);
		await expectExcelErrorCode(
			readExcelFile(
				new Blob([ZIP_LOCAL_HEADER_BYTES], {
					type: "application/vnd.oasis.opendocument.spreadsheet",
				}),
			),
			"UNSUPPORTED_FORMAT",
		);
		const nullBinaryBlob = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])]);
		await expectExcelErrorCode(readExcelFile(nullBinaryBlob), "UNSUPPORTED_FORMAT");
	});

	it("throws CORRUPT_ARCHIVE for non-ZIP .xlsx files or OOXML-typed Blobs", async () => {
		const corruptFile = new File(["not a zip archive at all"], "broken.xlsx");
		await expectExcelErrorCode(readExcelFile(corruptFile), "CORRUPT_ARCHIVE");

		const corruptMimeBlob = new Blob(["not a zip"], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		await expectExcelErrorCode(readExcelFile(corruptMimeBlob), "CORRUPT_ARCHIVE");
	});

	it("rejects 0-byte unnamed Blob with UNSUPPORTED_FORMAT while allowing named 0-byte empty.csv", async () => {
		await expectExcelErrorCode(readExcelFile(new Blob([])), "UNSUPPORTED_FORMAT");

		const emptyCsv = new File([], "empty.csv");
		const result = await readExcelFile(emptyCsv);
		expect(result.name).toBe("empty.csv");
		expect(result.format).toBe("csv");
		expect(result.bytes.byteLength).toBe(0);
	});

	it("rejects non-null-byte binary garbage (invalid UTF-8 and control bytes) with UNSUPPORTED_FORMAT", async () => {
		const invalidUtf8 = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x80, 0x81])]);
		await expectExcelErrorCode(readExcelFile(invalidUtf8), "UNSUPPORTED_FORMAT");

		const controlBytes = new Blob([new Uint8Array([0x01, 0x02, 0x03])]);
		await expectExcelErrorCode(readExcelFile(controlBytes), "UNSUPPORTED_FORMAT");
	});
});

describe("browser-io: downloadXlsxBytes & downloadCsvText", () => {
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
		document.body.replaceChildren();
	});

	it("downloads XLSX bytes with the OOXML MIME type, cleans up anchor, and revokes object URL", async () => {
		vi.useFakeTimers();

		let capturedBlob: Blob | undefined;
		let capturedDownload = "";
		let capturedHref = "";
		let attachedDuringClick = false;

		const createObjectURLSpy = vi
			.spyOn(URL, "createObjectURL")
			.mockImplementation((obj: Blob | MediaSource) => {
				capturedBlob = obj as Blob;
				return "blob:mock-xlsx-url";
			});
		const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
		const clickSpy = vi
			.spyOn(HTMLAnchorElement.prototype, "click")
			.mockImplementation(() => {
				const anchor = document.body.querySelector("a");
				if (anchor !== null) {
					capturedDownload = anchor.download;
					capturedHref = anchor.href;
					attachedDuringClick = anchor.isConnected;
				}
			});

		const bytes = makeMinimalXlsxBytes();
		downloadXlsxBytes(bytes, "quarterly-report.xlsx");

		expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
		expect(clickSpy).toHaveBeenCalledTimes(1);
		expect(attachedDuringClick).toBe(true);
		expect(capturedDownload).toBe("quarterly-report.xlsx");
		expect(capturedHref).toBe("blob:mock-xlsx-url");
		expect(document.body.querySelectorAll("a").length).toBe(0);

		expect(capturedBlob).toBeInstanceOf(Blob);
		if (capturedBlob === undefined) {
			throw new Error("Expected capturedBlob to be defined.");
		}
		expect(capturedBlob.type).toBe(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		const downloadedBytes = new Uint8Array(await capturedBlob.arrayBuffer());
		expect(downloadedBytes).toEqual(bytes);

		expect(revokeObjectURLSpy).not.toHaveBeenCalled();
		vi.runAllTimers();
		expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
		expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-xlsx-url");
	});

	it("downloads CSV text with UTF-8 CSV MIME type, falls back on empty filename, and cleans up even if click throws", async () => {
		vi.useFakeTimers();

		let capturedBlob: Blob | undefined;
		let capturedDownload = "";

		vi.spyOn(URL, "createObjectURL").mockImplementation((obj: Blob | MediaSource) => {
			capturedBlob = obj as Blob;
			return "blob:mock-csv-url";
		});
		const revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
			const anchor = document.body.querySelector("a");
			capturedDownload = anchor?.download ?? "";
		});

		downloadCsvText("Name,Score\nAlice,42\n", "scores.csv");

		expect(capturedDownload).toBe("scores.csv");
		expect(document.body.querySelectorAll("a").length).toBe(0);
		expect(capturedBlob).toBeInstanceOf(Blob);
		if (capturedBlob === undefined) {
			throw new Error("Expected capturedBlob to be defined.");
		}
		expect(capturedBlob.type).toBe("text/csv;charset=utf-8");
		expect(await capturedBlob.text()).toBe("Name,Score\nAlice,42\n");

		vi.runAllTimers();
		expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock-csv-url");

		// Blank filename fallback + cleanup when click() throws
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
			const anchor = document.body.querySelector("a");
			capturedDownload = anchor?.download ?? "";
			throw new Error("Simulated click failure");
		});

		expect(() => downloadCsvText("a,b\n", " ".repeat(3))).toThrow("Simulated click failure");
		expect(capturedDownload).toBe("export.csv");
		expect(document.body.querySelectorAll("a").length).toBe(0);

		vi.runAllTimers();
		expect(revokeObjectURLSpy).toHaveBeenCalledTimes(2);
	});

	it("throws INVALID_CONFIG for downloadXlsxBytes and downloadCsvText when URL.createObjectURL is missing", () => {
		const originalDescriptor = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
		Object.defineProperty(URL, "createObjectURL", {
			value: undefined,
			configurable: true,
			writable: true,
		});

		try {
			const bytes = makeMinimalXlsxBytes();
			let xlsxError: unknown;
			try {
				downloadXlsxBytes(bytes, "report.xlsx");
			} catch (error) {
				xlsxError = error;
			}
			expect(isExcelError(xlsxError)).toBe(true);
			expect((xlsxError as ExcelError).code).toBe("INVALID_CONFIG");

			let csvError: unknown;
			try {
				downloadCsvText("a,b\n1,2\n", "report.csv");
			} catch (error) {
				csvError = error;
			}
			expect(isExcelError(csvError)).toBe(true);
			expect((csvError as ExcelError).code).toBe("INVALID_CONFIG");
		} finally {
			if (originalDescriptor !== undefined) {
				Object.defineProperty(URL, "createObjectURL", originalDescriptor);
			}
		}
	});
});
