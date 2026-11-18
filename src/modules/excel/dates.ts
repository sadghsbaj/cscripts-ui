import type { ExcelDateSystem } from "./types.ts";

const MS_PER_DAY = 86_400_000;
const SECONDS_PER_DAY = 86_400;

const EPOCH_1900_PRE_60 = Date.UTC(1899, 11, 31);
const EPOCH_1900_POST_60 = Date.UTC(1899, 11, 30);
const DATE_1900_02_28 = Date.UTC(1900, 1, 28);
const UTC_1900_03_01 = Date.UTC(1900, 2, 1);
const EPOCH_1904 = Date.UTC(1904, 0, 1);
const MAX_DATE_MS = 8.64e15;

const INVISIBLE_CHARS_RE = /[\u{00A0}\u{200B}-\u{200D}\u{FEFF}]/gu;
const ISO_DATE_ONLY_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const ISO_DATETIME_RE =
	/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const EU_DATE_RE =
	/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const US_DATE_RE =
	/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

const DE_MONTHS: Readonly<Record<string, number>> = {
	jan: 1,
	januar: 1,
	feb: 2,
	februar: 2,
	maer: 3,
	mrz: 3,
	maerz: 3,
	marz: 3,
	apr: 4,
	april: 4,
	mai: 5,
	jun: 6,
	juni: 6,
	jul: 7,
	juli: 7,
	aug: 8,
	august: 8,
	sep: 9,
	sept: 9,
	september: 9,
	okt: 10,
	oktober: 10,
	nov: 11,
	november: 11,
	dez: 12,
	dezember: 12,
};

const EN_MONTHS: Readonly<Record<string, number>> = {
	jan: 1,
	january: 1,
	feb: 2,
	february: 2,
	mar: 3,
	march: 3,
	apr: 4,
	april: 4,
	may: 5,
	jun: 6,
	june: 6,
	jul: 7,
	july: 7,
	aug: 8,
	august: 8,
	sep: 9,
	sept: 9,
	september: 9,
	oct: 10,
	october: 10,
	nov: 11,
	november: 11,
	dec: 12,
	december: 12,
};

function pad2(value: number): string {
	return String(value).padStart(2, "0");
}

function pad4(value: number): string {
	return String(value).padStart(4, "0");
}

function formatUtcIsoDate(date: Date): string {
	return `${pad4(date.getUTCFullYear())}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function expandTwoDigitYear(yearStr: string): number {
	const parsed = Number(yearStr);
	if (yearStr.length === 4) {
		return parsed;
	}
	return (parsed <= 69 ? 2000 : 1900) + parsed;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
	if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
		return false;
	}
	const check = new Date(0);
	check.setUTCFullYear(year, month - 1, day);
	check.setUTCHours(0, 0, 0, 0);
	return (
		check.getUTCFullYear() === year &&
		check.getUTCMonth() === month - 1 &&
		check.getUTCDate() === day
	);
}

function isValidTimeParts(hours: number, minutes: number, seconds: number): boolean {
	return (
		hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59 && seconds >= 0 && seconds <= 59
	);
}

function formatValidatedDate(year: number, month: number, day: number): string | null {
	if (!isValidCalendarDate(year, month, day)) {
		return null;
	}
	return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

function cleanDateInput(input: string): string {
	return input.replaceAll(INVISIBLE_CHARS_RE, " ").trim();
}

export function excelSerialToDate(
	serial: number,
	dateSystem: ExcelDateSystem = 1900,
): Date | null {
	if (!Number.isFinite(serial) || serial < 0) {
		return null;
	}

	let wholeDays = Math.floor(serial);
	let fracSeconds = Math.round((serial - wholeDays) * SECONDS_PER_DAY);

	let ms: number;
	if (dateSystem === 1904) {
		if (fracSeconds >= SECONDS_PER_DAY) {
			wholeDays += 1;
			fracSeconds = 0;
		}
		ms = EPOCH_1904 + wholeDays * MS_PER_DAY + fracSeconds * 1000;
	} else if (wholeDays === 60) {
		// Lotus 1-2-3 / Excel treat 1900 as a leap year; clamp phantom Feb 29 (serial 60) to Feb 28.
		const clampedSeconds = Math.min(fracSeconds, SECONDS_PER_DAY - 1);
		ms = DATE_1900_02_28 + clampedSeconds * 1000;
	} else {
		if (fracSeconds >= SECONDS_PER_DAY) {
			wholeDays += 1;
			fracSeconds = 0;
		}
		if (wholeDays === 60) {
			ms = DATE_1900_02_28 + (SECONDS_PER_DAY - 1) * 1000;
		} else {
			const epoch = wholeDays < 60 ? EPOCH_1900_PRE_60 : EPOCH_1900_POST_60;
			ms = epoch + wholeDays * MS_PER_DAY + fracSeconds * 1000;
		}
	}

	if (Math.abs(ms) > MAX_DATE_MS) {
		return null;
	}
	const date = new Date(ms);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function excelSerialToIsoDate(
	serial: number,
	dateSystem: ExcelDateSystem = 1900,
): string | null {
	const date = excelSerialToDate(serial, dateSystem);
	if (!date) {
		return null;
	}
	return formatUtcIsoDate(date);
}

export function excelSerialToIsoDateTime(
	serial: number,
	dateSystem: ExcelDateSystem = 1900,
): string | null {
	const date = excelSerialToDate(serial, dateSystem);
	if (!date) {
		return null;
	}
	return `${formatUtcIsoDate(date)}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}Z`;
}

export function excelSerialToTime(serial: number): string | null {
	if (!Number.isFinite(serial) || serial < 0) {
		return null;
	}
	const fracSeconds =
		Math.round((serial - Math.floor(serial)) * SECONDS_PER_DAY) % SECONDS_PER_DAY;
	const hours = Math.floor(fracSeconds / 3600);
	const minutes = Math.floor((fracSeconds % 3600) / 60);
	const seconds = fracSeconds % 60;
	return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export function isoDateToExcelSerial(
	isoDate: string | Date,
	dateSystem: ExcelDateSystem = 1900,
): number {
	let ms: number;
	if (isoDate instanceof Date) {
		if (Number.isNaN(isoDate.getTime())) {
			throw new RangeError("Invalid Date provided to isoDateToExcelSerial.");
		}
		ms = isoDate.getTime();
	} else {
		const trimmed = cleanDateInput(isoDate);
		const dateMatch = ISO_DATE_ONLY_RE.exec(trimmed);
		if (dateMatch) {
			const year = Number(dateMatch[1] ?? "");
			const month = Number(dateMatch[2] ?? "");
			const day = Number(dateMatch[3] ?? "");
			if (!isValidCalendarDate(year, month, day)) {
				throw new RangeError(`Invalid ISO date "${isoDate}".`);
			}
			ms = Date.UTC(year, month - 1, day);
		} else {
			const dtMatch = ISO_DATETIME_RE.exec(trimmed);
			if (!dtMatch) {
				throw new RangeError(`Invalid ISO date "${isoDate}".`);
			}
			const year = Number(dtMatch[1] ?? "");
			const month = Number(dtMatch[2] ?? "");
			const day = Number(dtMatch[3] ?? "");
			const hours = Number(dtMatch[4] ?? "");
			const minutes = Number(dtMatch[5] ?? "");
			const seconds = dtMatch[6] ? Number(dtMatch[6]) : 0;
			if (!isValidCalendarDate(year, month, day) || !isValidTimeParts(hours, minutes, seconds)) {
				throw new RangeError(`Invalid ISO datetime "${isoDate}".`);
			}
			const normalized = dtMatch[7]
				? trimmed.replace(" ", "T")
				: `${trimmed.replace(" ", "T")}Z`;
			ms = Date.parse(normalized);
			if (Number.isNaN(ms)) {
				throw new RangeError(`Invalid ISO datetime "${isoDate}".`);
			}
		}
	}

	if (dateSystem === 1904) {
		return (ms - EPOCH_1904) / MS_PER_DAY;
	}
	const epoch = ms >= UTC_1900_03_01 ? EPOCH_1900_POST_60 : EPOCH_1900_PRE_60;
	return (ms - epoch) / MS_PER_DAY;
}

function tryParseIsoDateString(text: string): string | null {
	const dateMatch = ISO_DATE_ONLY_RE.exec(text);
	if (dateMatch) {
		const year = Number(dateMatch[1] ?? "");
		const month = Number(dateMatch[2] ?? "");
		const day = Number(dateMatch[3] ?? "");
		return formatValidatedDate(year, month, day);
	}

	const dtMatch = ISO_DATETIME_RE.exec(text);
	if (!dtMatch) {
		return null;
	}
	const year = Number(dtMatch[1] ?? "");
	const month = Number(dtMatch[2] ?? "");
	const day = Number(dtMatch[3] ?? "");
	const hours = Number(dtMatch[4] ?? "");
	const minutes = Number(dtMatch[5] ?? "");
	const seconds = dtMatch[6] ? Number(dtMatch[6]) : 0;
	if (!isValidCalendarDate(year, month, day) || !isValidTimeParts(hours, minutes, seconds)) {
		return null;
	}
	const normalized = dtMatch[7] ? text.replace(" ", "T") : `${text.replace(" ", "T")}Z`;
	const parsed = Date.parse(normalized);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return formatUtcIsoDate(new Date(parsed));
}

function hasValidOptionalTime(match: RegExpExecArray): boolean {
	if (match[4] === undefined) {
		return true;
	}
	const hours = Number(match[4]);
	const minutes = Number(match[5] ?? "");
	const seconds = match[6] ? Number(match[6]) : 0;
	return isValidTimeParts(hours, minutes, seconds);
}

function tryParseEuDateString(text: string): string | null {
	const match = EU_DATE_RE.exec(text);
	if (!match || !hasValidOptionalTime(match)) {
		return null;
	}
	const day = Number(match[1] ?? "");
	const month = Number(match[2] ?? "");
	const year = expandTwoDigitYear(match[3] ?? "");
	return formatValidatedDate(year, month, day);
}

function tryParseUsDateString(text: string): string | null {
	const match = US_DATE_RE.exec(text);
	if (!match || !hasValidOptionalTime(match)) {
		return null;
	}
	const month = Number(match[1] ?? "");
	const day = Number(match[2] ?? "");
	const year = expandTwoDigitYear(match[3] ?? "");
	return formatValidatedDate(year, month, day);
}

function tryParseDateFormat(cleaned: string, format: "iso" | "eu" | "us"): string | null {
	switch (format) {
		case "iso": {
			return tryParseIsoDateString(cleaned);
		}
		case "eu": {
			return tryParseEuDateString(cleaned);
		}
		case "us": {
			return tryParseUsDateString(cleaned);
		}
	}
}

export function parseDateValue(
	input: unknown,
	options?: { dateSystem?: ExcelDateSystem; formats?: ("iso" | "eu" | "us")[] },
): string | null {
	if (input instanceof Date) {
		return Number.isNaN(input.getTime()) ? null : formatUtcIsoDate(input);
	}
	const dateSystem = options?.dateSystem ?? 1900;
	if (typeof input === "number") {
		return excelSerialToIsoDate(input, dateSystem);
	}
	if (typeof input !== "string") {
		return null;
	}

	const cleaned = cleanDateInput(input);
	if (cleaned.length === 0) {
		return null;
	}

	const formats = options?.formats ?? ["iso", "eu", "us"];
	for (const format of formats) {
		const parsed = tryParseDateFormat(cleaned, format);
		if (parsed !== null) {
			return parsed;
		}
	}
	return null;
}

function normalizeMonthToken(token: string): string {
	return token
		.toLowerCase()
		.replaceAll("ä", "ae")
		.replaceAll("ö", "oe")
		.replaceAll("ü", "ue")
		.replaceAll("ß", "ss")
		.replaceAll(".", "")
		.trim();
}

function resolveMonthName(token: string, locales: readonly ("de" | "en")[]): number | null {
	const normalized = normalizeMonthToken(token);
	for (const locale of locales) {
		const table = locale === "de" ? DE_MONTHS : EN_MONTHS;
		const month = table[normalized];
		if (month !== undefined) {
			return month;
		}
	}
	return null;
}

export function parsePeriodHeader(
	input: unknown,
	options?: { fallbackYear?: number; dateSystem?: ExcelDateSystem; locales?: ("de" | "en")[] },
): string | null {
	if (input instanceof Date) {
		if (Number.isNaN(input.getTime())) {
			return null;
		}
		return `${pad4(input.getUTCFullYear())}-${pad2(input.getUTCMonth() + 1)}`;
	}
	const dateSystem = options?.dateSystem ?? 1900;
	if (typeof input === "number") {
		const iso = excelSerialToIsoDate(input, dateSystem);
		return iso ? iso.slice(0, 7) : null;
	}
	if (typeof input !== "string") {
		return null;
	}

	const cleaned = cleanDateInput(input).replaceAll(/\s+/g, " ");
	if (cleaned.length === 0) {
		return null;
	}

	const isoDate = tryParseIsoDateString(cleaned);
	if (isoDate !== null) {
		return isoDate.slice(0, 7);
	}

	const yearMonthMatch = /^(\d{4})[-/.](\d{1,2})$/.exec(cleaned);
	if (yearMonthMatch) {
		const year = Number(yearMonthMatch[1] ?? "");
		const month = Number(yearMonthMatch[2] ?? "");
		if (month >= 1 && month <= 12) {
			return `${pad4(year)}-${pad2(month)}`;
		}
		return null;
	}

	const monthYearMatch = /^(\d{1,2})[-/.](\d{4})$/.exec(cleaned);
	if (monthYearMatch) {
		const month = Number(monthYearMatch[1] ?? "");
		const year = Number(monthYearMatch[2] ?? "");
		if (month >= 1 && month <= 12) {
			return `${pad4(year)}-${pad2(month)}`;
		}
		return null;
	}

	const fallbackYear = options?.fallbackYear ?? new Date().getUTCFullYear();

	const yearQuarterMatch = /^(\d{4})[-/\s]?q([1-4])$/i.exec(cleaned);
	if (yearQuarterMatch) {
		const year = Number(yearQuarterMatch[1] ?? "");
		const quarter = yearQuarterMatch[2] ?? "";
		return `${pad4(year)}-Q${quarter}`;
	}

	const quarterYearMatch = /^q([1-4])[-/\s]?(\d{2}|\d{4})$/i.exec(cleaned);
	if (quarterYearMatch) {
		const quarter = quarterYearMatch[1] ?? "";
		const year = expandTwoDigitYear(quarterYearMatch[2] ?? "");
		return `${pad4(year)}-Q${quarter}`;
	}

	const bareQuarterMatch = /^q([1-4])$/i.exec(cleaned);
	if (bareQuarterMatch) {
		const quarter = bareQuarterMatch[1] ?? "";
		return `${pad4(fallbackYear)}-Q${quarter}`;
	}

	const locales = options?.locales ?? ["de", "en"];

	const monthAndYear = /^([A-Za-zÀ-ÿ.]+)[,\s/-]+(\d{2}|\d{4})$/.exec(cleaned);
	if (monthAndYear) {
		const month = resolveMonthName(monthAndYear[1] ?? "", locales);
		if (month !== null) {
			const year = expandTwoDigitYear(monthAndYear[2] ?? "");
			return `${pad4(year)}-${pad2(month)}`;
		}
	}

	const yearAndMonth = /^(\d{4})[\s/-]+([A-Za-zÀ-ÿ.]+)$/.exec(cleaned);
	if (yearAndMonth) {
		const month = resolveMonthName(yearAndMonth[2] ?? "", locales);
		if (month !== null) {
			const year = Number(yearAndMonth[1] ?? "");
			return `${pad4(year)}-${pad2(month)}`;
		}
	}

	const bareMonth = resolveMonthName(cleaned, locales);
	if (bareMonth !== null) {
		return `${pad4(fallbackYear)}-${pad2(bareMonth)}`;
	}

	return null;
}
