import { ExcelError } from "./errors.ts";
import type { ExcelFormat } from "./types.ts";

export interface SlugifyFileNameOptions {
	extension?: string;
	dateSuffix?: boolean | Date;
	separator?: string;
}

export interface ReadExcelFileResult {
	name: string;
	format: ExcelFormat;
	bytes: Uint8Array;
}

const OLE2_MAGIC = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

const UNSUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([".xls", ".xlsb", ".ods"]);

const OOXML_EXTENSION_MAP: ReadonlyMap<string, ExcelFormat> = new Map([
	[".xlsx", "xlsx"],
	[".xlsm", "xlsm"],
	[".xltx", "xltx"],
	[".xltm", "xltm"],
]);

const TEXT_EXTENSION_MAP: ReadonlyMap<string, ExcelFormat> = new Map([
	[".csv", "csv"],
	[".tsv", "tsv"],
]);

const MIME_TO_OOXML_FORMAT: ReadonlyMap<string, ExcelFormat> = new Map([
	["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
	["application/vnd.ms-excel.sheet.macroenabled.12", "xlsm"],
	["application/vnd.openxmlformats-officedocument.spreadsheetml.template", "xltx"],
	["application/vnd.ms-excel.template.macroenabled.12", "xltm"],
]);

const UNSUPPORTED_MIME_TYPES: ReadonlySet<string> = new Set([
	"application/vnd.ms-excel",
	"application/vnd.ms-excel.sheet.binary.macroenabled.12",
	"application/vnd.oasis.opendocument.spreadsheet",
]);

function getBaseName(fileName: string): string {
	const lastSlash = Math.max(fileName.lastIndexOf("/"), fileName.lastIndexOf("\\"));
	return lastSlash >= 0 ? fileName.slice(lastSlash + 1) : fileName;
}

function getFileExtension(fileName: string): string {
	const base = getBaseName(fileName);
	const dotIndex = base.lastIndexOf(".");
	if (dotIndex <= 0 || dotIndex === base.length - 1) {
		return "";
	}
	return base.slice(dotIndex).toLowerCase();
}

function hasOle2Magic(bytes: Uint8Array): boolean {
	if (bytes.length < OLE2_MAGIC.length) {
		return false;
	}
	for (const [i, expected] of OLE2_MAGIC.entries()) {
		if (bytes[i] !== expected) {
			return false;
		}
	}
	return true;
}

function hasZipMagic(bytes: Uint8Array): boolean {
	if (bytes.length < 4) {
		return false;
	}
	if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
		return false;
	}
	const b2 = bytes[2];
	const b3 = bytes[3];
	return (
		(b2 === 0x03 && b3 === 0x04) ||
		(b2 === 0x05 && b3 === 0x06) ||
		(b2 === 0x07 && b3 === 0x08)
	);
}

function trimSeparator(value: string, separator: string): string {
	if (separator.length === 0) {
		return value;
	}
	let start = 0;
	let end = value.length;
	while (start < end && value.startsWith(separator, start)) {
		start += separator.length;
	}
	while (end - start >= separator.length && value.endsWith(separator, end)) {
		end -= separator.length;
	}
	return value.slice(start, end);
}

function slugifySegment(raw: string, separator: string): string {
	const normalized = raw
		.normalize("NFC")
		.toLowerCase()
		.replaceAll("ä", "ae")
		.replaceAll("ö", "oe")
		.replaceAll("ü", "ue")
		.replaceAll("ß", "ss")
		.normalize("NFD")
		.replaceAll(/[\u{0300}-\u{036F}]/gu, "")
		.replaceAll(/[^a-z0-9]+/g, () => separator);

	return trimSeparator(normalized, separator);
}

function formatUtcDateSuffix(date: Date): string {
	if (Number.isNaN(date.getTime())) {
		throw new ExcelError("INVALID_CONFIG", "Invalid Date provided for slugifyFileName dateSuffix.");
	}
	const year = String(date.getUTCFullYear()).padStart(4, "0");
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function detectTextFormatFromBytes(bytes: Uint8Array): ExcelFormat | null {
	if (bytes.byteLength === 0) {
		return null;
	}
	const sampleLength = Math.min(bytes.length, 4096);
	for (let i = 0; i < sampleLength; i += 1) {
		const byte = bytes[i] ?? 0;
		// Reject NUL and disallowed binary control bytes while allowing TAB (0x09), LF (0x0A), and CR (0x0D).
		if (
			byte < 0x09 ||
			byte === 0x0b ||
			byte === 0x0c ||
			(byte >= 0x0e && byte <= 0x1f)
		) {
			return null;
		}
	}
	const decoder = new TextDecoder("utf-8", { fatal: true });
	let sample: string;
	try {
		sample =
			bytes.length > sampleLength
				? decoder.decode(bytes.subarray(0, sampleLength), { stream: true })
				: decoder.decode(bytes);
	} catch {
		return null;
	}
	const firstLineEnd = sample.search(/\r|\n/);
	const firstLine = firstLineEnd >= 0 ? sample.slice(0, firstLineEnd) : sample;
	const tabCount = (firstLine.match(/\t/g) ?? []).length;
	const commaCount = (firstLine.match(/,/g) ?? []).length;
	const semiCount = (firstLine.match(/;/g) ?? []).length;
	if (tabCount > 0 && tabCount >= commaCount && tabCount >= semiCount) {
		return "tsv";
	}
	return "csv";
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
	if (
		typeof document === "undefined" ||
		typeof URL === "undefined" ||
		typeof URL.createObjectURL !== "function"
	) {
		throw new ExcelError(
			"INVALID_CONFIG",
			"Browser DOM (document and URL.createObjectURL) is required to download files.",
		);
	}
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.rel = "noopener";
	anchor.style.display = "none";

	const container = document.body ?? document.documentElement;
	container.append(anchor);
	try {
		anchor.click();
	} finally {
		anchor.remove();
		// Defer revocation by one macrotask so Chromium initiates the download before invalidating the object URL.
		setTimeout(() => {
			URL.revokeObjectURL(url);
		}, 0);
	}
}

export function isTempOfficeFile(fileName: string): boolean {
	return getBaseName(fileName).startsWith("~$");
}

export function slugifyFileName(
	parts: readonly string[],
	options?: SlugifyFileNameOptions,
): string {
	const separator = options?.separator ?? "-";
	const cleanedParts: string[] = [];

	for (const part of parts) {
		const slug = slugifySegment(part, separator);
		if (slug.length > 0) {
			cleanedParts.push(slug);
		}
	}

	let base = cleanedParts.length > 0 ? cleanedParts.join(separator) : "export";

	if (options?.dateSuffix === true) {
		const suffix = formatUtcDateSuffix(new Date());
		base = separator.length > 0 ? `${base}${separator}${suffix}` : `${base}${suffix}`;
	} else if (options?.dateSuffix instanceof Date) {
		const suffix = formatUtcDateSuffix(options.dateSuffix);
		base = separator.length > 0 ? `${base}${separator}${suffix}` : `${base}${suffix}`;
	}

	if (options?.extension !== undefined) {
		const ext = options.extension.trim().replace(/^\.+/, "").toLowerCase();
		if (ext.length > 0) {
			return `${base}.${ext}`;
		}
	}

	return base;
}

export async function readExcelFile(file: File | Blob): Promise<ReadExcelFileResult> {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);
	const name = "name" in file && typeof file.name === "string" ? file.name : "";
	const extension = getFileExtension(name);

	if (hasOle2Magic(bytes)) {
		throw new ExcelError(
			"UNSUPPORTED_FORMAT",
			`Legacy binary OLE2/CFBF spreadsheet format is not supported${name ? ` ("${name}")` : ""}.`,
			{ details: { name, extension } },
		);
	}

	if (extension.length > 0 && UNSUPPORTED_EXTENSIONS.has(extension)) {
		throw new ExcelError(
			"UNSUPPORTED_FORMAT",
			`Unsupported spreadsheet extension "${extension}"${name ? ` for "${name}"` : ""}.`,
			{ details: { name, extension } },
		);
	}

	const ooxmlFormatFromExt = OOXML_EXTENSION_MAP.get(extension);
	if (ooxmlFormatFromExt !== undefined) {
		if (!hasZipMagic(bytes)) {
			throw new ExcelError(
				"CORRUPT_ARCHIVE",
				`File "${name}" has OOXML extension "${extension}" but does not start with a valid ZIP signature.`,
				{ details: { name, extension } },
			);
		}
		return { name, format: ooxmlFormatFromExt, bytes };
	}

	const textFormatFromExt = TEXT_EXTENSION_MAP.get(extension);
	if (textFormatFromExt !== undefined) {
		return { name, format: textFormatFromExt, bytes };
	}

	if (extension.length > 0) {
		throw new ExcelError(
			"UNSUPPORTED_FORMAT",
			`Unsupported file extension "${extension}"${name ? ` for "${name}"` : ""}.`,
			{ details: { name, extension } },
		);
	}

	const mimeType =
		typeof file.type === "string"
			? (file.type.split(";", 1)[0]?.trim().toLowerCase() ?? "")
			: "";

	if (UNSUPPORTED_MIME_TYPES.has(mimeType)) {
		throw new ExcelError(
			"UNSUPPORTED_FORMAT",
			`Unsupported spreadsheet MIME type "${mimeType}".`,
			{ details: { name, mimeType } },
		);
	}

	const ooxmlFormatFromMime = MIME_TO_OOXML_FORMAT.get(mimeType);
	if (ooxmlFormatFromMime !== undefined) {
		if (!hasZipMagic(bytes)) {
			throw new ExcelError(
				"CORRUPT_ARCHIVE",
				`Blob declares OOXML MIME type "${mimeType}" but does not start with a valid ZIP signature.`,
				{ details: { name, mimeType } },
			);
		}
		return { name, format: ooxmlFormatFromMime, bytes };
	}

	if (hasZipMagic(bytes)) {
		return { name, format: "xlsx", bytes };
	}

	if (mimeType === "text/tab-separated-values") {
		return { name, format: "tsv", bytes };
	}

	if (mimeType === "text/csv") {
		return { name, format: "csv", bytes };
	}

	if (bytes.byteLength === 0) {
		throw new ExcelError(
			"UNSUPPORTED_FORMAT",
			"Cannot detect Excel format from empty unnamed Blob.",
			{ details: { name, mimeType } },
		);
	}

	const detectedTextFormat = detectTextFormatFromBytes(bytes);
	if (detectedTextFormat !== null) {
		return { name, format: detectedTextFormat, bytes };
	}

	throw new ExcelError(
		"UNSUPPORTED_FORMAT",
		`Unable to detect a supported spreadsheet format${name ? ` for "${name}"` : ""}.`,
		{ details: { name, mimeType } },
	);
}

export function downloadXlsxBytes(bytes: Uint8Array, fileName: string): void {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	const blob = new Blob([copy], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const resolvedName = fileName.trim().length > 0 ? fileName : "export.xlsx";
	triggerBlobDownload(blob, resolvedName);
}

export function downloadCsvText(text: string, fileName: string): void {
	const blob = new Blob([text], {
		type: "text/csv;charset=utf-8",
	});
	const resolvedName = fileName.trim().length > 0 ? fileName : "export.csv";
	triggerBlobDownload(blob, resolvedName);
}
