import { excelSerialToDate, isoDateToExcelSerial } from "./dates.ts";
import type { CellModel, CellScalar, CellStatus, ExcelDateSystem } from "./types.ts";

export const EXCEL_ERROR_TOKENS = [
	"#REF!",
	"#DIV/0!",
	"#VALUE!",
	"#N/A",
	"#NAME?",
	"#NUM!",
	"#NULL!",
	"#SPILL!",
	"#CALC!",
] as const;

const EXCEL_ERROR_TOKEN_SET: ReadonlySet<string> = new Set(EXCEL_ERROR_TOKENS);

const NBSP_RE = /\u{00A0}/gu;
const ZERO_WIDTH_RE = /[\u{200B}-\u{200D}\u{FEFF}]/gu;
const LINE_ENDING_RE = /\r\n|\r/g;

const DEFAULT_EMPTY_PLACEHOLDERS = ["", "-", "—", "–", "na", "n/a", "#n/a"];
const DEFAULT_TRUE_TOKENS = ["true", "yes", "ja", "1", "x", "wahr"];
const DEFAULT_FALSE_TOKENS = ["false", "no", "nein", "0", "falsch"];

const MONTH_NAMES_SHORT = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];
const MONTH_NAMES_LONG = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const WEEKDAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES_LONG = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

function isCellModel(value: unknown): value is CellModel {
	if (typeof value !== "object" || value === null || value instanceof Date) {
		return false;
	}
	return "value" in value;
}

export function isExcelErrorValue(value: unknown): boolean {
	if (typeof value === "string") {
		return EXCEL_ERROR_TOKEN_SET.has(value.trim().toUpperCase());
	}
	if (isCellModel(value)) {
		if (value.type === "error") {
			return true;
		}
		if (typeof value.value === "string") {
			return EXCEL_ERROR_TOKEN_SET.has(value.value.trim().toUpperCase());
		}
		if (typeof value.formula?.error === "string") {
			return EXCEL_ERROR_TOKEN_SET.has(value.formula.error.trim().toUpperCase());
		}
	}
	return false;
}

export function normalizeCellText(
	value: unknown,
	options?: {
		stripZeroWidth?: boolean;
		collapseWhitespace?: boolean;
		normalizeLineEndings?: boolean;
	},
): string {
	if (value === null || value === undefined) {
		return "";
	}
	let text = value instanceof Date ? value.toISOString() : String(value);

	const stripZeroWidth = options?.stripZeroWidth ?? true;
	if (stripZeroWidth) {
		text = text.replaceAll(NBSP_RE, " ").replaceAll(ZERO_WIDTH_RE, "");
	}

	const normalizeLineEndings = options?.normalizeLineEndings ?? true;
	if (normalizeLineEndings) {
		text = text.replaceAll(LINE_ENDING_RE, "\n");
	}

	if (options?.collapseWhitespace) {
		text = text.replaceAll(/\s+/g, " ");
	}

	return text.trim();
}

export function cellToString(value: unknown, options?: { emptyOnError?: boolean }): string {
	let current: unknown = value;
	while (isCellModel(current)) {
		if (options?.emptyOnError && isExcelErrorValue(current)) {
			return "";
		}
		if (current.value === null && current.richText && current.richText.length > 0) {
			return current.richText.map((run) => run.text).join("");
		}
		current = current.value;
	}

	if (current === null || current === undefined) {
		return "";
	}
	if (typeof current === "string") {
		if (options?.emptyOnError && isExcelErrorValue(current)) {
			return "";
		}
		return current;
	}
	if (current instanceof Date) {
		return Number.isNaN(current.getTime()) ? "" : current.toISOString();
	}
	if (typeof current === "number" || typeof current === "boolean") {
		return String(current);
	}
	return String(current);
}

function splitNumFmtSections(numFmt: string): string[] {
	const sections: string[] = [];
	let current = "";
	let inQuotes = false;
	for (let i = 0; i < numFmt.length; i += 1) {
		const ch = numFmt[i];
		if (ch === "\\" && i + 1 < numFmt.length) {
			current += ch + (numFmt[i + 1] ?? "");
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			current += ch;
			continue;
		}
		if (ch === ";" && !inQuotes) {
			sections.push(current);
			current = "";
			continue;
		}
		current += ch ?? "";
	}
	sections.push(current);
	return sections;
}

interface CleanedSection {
	pattern: string;
	bracketCurrency?: string;
}

const ELAPSED_TIME_TAG_RE = /^(?:hh?|mm?|ss?)$/i;

function cleanNumFmtSection(section: string): CleanedSection {
	let out = "";
	let bracketCurrency: string | undefined;
	let inQuotes = false;
	let i = 0;

	while (i < section.length) {
		const ch = section[i];
		if (!inQuotes && ch === "\\" && i + 1 < section.length) {
			out += section.slice(i, i + 2);
			i += 2;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			out += ch;
			i += 1;
			continue;
		}
		if (!inQuotes && ch === "[") {
			const closeIdx = section.indexOf("]", i + 1);
			if (closeIdx !== -1) {
				const tag = section.slice(i + 1, closeIdx);
				if (tag.startsWith("$")) {
					const dashIdx = tag.indexOf("-");
					const symbol = dashIdx === -1 ? tag.slice(1) : tag.slice(1, dashIdx);
					if (symbol.length > 0) {
						bracketCurrency = symbol;
						out += `"${symbol}"`;
					}
				} else if (ELAPSED_TIME_TAG_RE.test(tag)) {
					out += `[${tag}]`;
				}
				i = closeIdx + 1;
				continue;
			}
		}
		if (!inQuotes && ch === "_" && i + 1 < section.length) {
			if (section[i + 1] === " ") {
				out += " ";
			}
			i += 2;
			continue;
		}
		if (!inQuotes && ch === "*" && i + 1 < section.length) {
			if (section[i + 1] === " ") {
				out += " ";
			}
			i += 2;
			continue;
		}
		out += ch ?? "";
		i += 1;
	}

	return { pattern: out, bracketCurrency };
}

function stripLiteralsForDetection(pattern: string): string {
	let out = "";
	let inQuotes = false;
	for (let i = 0; i < pattern.length; i += 1) {
		const ch = pattern[i];
		if (ch === "\\" && i + 1 < pattern.length) {
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (!inQuotes) {
			out += ch ?? "";
		}
	}
	return out;
}

function isDateTimeFormat(pattern: string): boolean {
	const unquoted = stripLiteralsForDetection(pattern);
	if (unquoted.includes("#") || unquoted.includes("%")) {
		return false;
	}
	return /[ydhs]|am\/pm|a\/p|\[(?:hh?|mm?|ss?)\]/i.test(unquoted);
}

function extractLiteralText(pattern: string): string {
	let out = "";
	let inQuotes = false;
	for (let i = 0; i < pattern.length; i += 1) {
		const ch = pattern[i];
		if (ch === "\\" && i + 1 < pattern.length) {
			out += pattern[i + 1] ?? "";
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		out += ch ?? "";
	}
	return out;
}

interface DatePatternToken {
	kind: "literal" | "code";
	text: string;
	elapsed?: boolean;
}

function formatDateToken(
	lower: string,
	token: DatePatternToken,
	idx: number,
	tokens: ReadonlyArray<DatePatternToken>,
	parts: {
		year: number;
		month: number;
		day: number;
		weekday: number;
		hours24: number;
		hours12: number;
		minutes: number;
		seconds: number;
		totalHours: number;
		totalMinutes: number;
		totalSeconds: number;
		hasAmPm: boolean;
	},
): string {
	switch (lower) {
		case "yyyy": {
			return String(parts.year).padStart(4, "0");
		}
		case "yy":
		case "y": {
			return String(parts.year % 100).padStart(2, "0");
		}
		case "dddd": {
			return WEEKDAY_NAMES_LONG[parts.weekday] ?? "";
		}
		case "ddd": {
			return WEEKDAY_NAMES_SHORT[parts.weekday] ?? "";
		}
		case "dd": {
			return String(parts.day).padStart(2, "0");
		}
		case "d": {
			return String(parts.day);
		}
		case "hh": {
			const h = token.elapsed
				? parts.totalHours
				: parts.hasAmPm
					? parts.hours12
					: parts.hours24;
			return String(h).padStart(2, "0");
		}
		case "h": {
			const h = token.elapsed
				? parts.totalHours
				: parts.hasAmPm
					? parts.hours12
					: parts.hours24;
			return String(h);
		}
		case "ss": {
			const s = token.elapsed ? parts.totalSeconds : parts.seconds;
			return String(s).padStart(2, "0");
		}
		case "s": {
			const s = token.elapsed ? parts.totalSeconds : parts.seconds;
			return String(s);
		}
		case "am/pm": {
			return parts.hours24 < 12 ? "AM" : "PM";
		}
		case "a/p": {
			return parts.hours24 < 12 ? "A" : "P";
		}
		default: {
			if (!lower.startsWith("m")) {
				return token.text;
			}
			// Disambiguate Excel "m"/"mm": elapsed tag or adjacent to hour/second -> minute, else month.
			const prevCode = tokens.slice(0, idx).findLast((t) => t.kind === "code");
			const nextCode = tokens.slice(idx + 1).find((t) => t.kind === "code");
			const isMinute =
				(lower === "m" || lower === "mm") &&
				(token.elapsed === true ||
					(prevCode !== undefined && /^h+$/i.test(prevCode.text)) ||
					(nextCode !== undefined && /^s+$/i.test(nextCode.text)));

			if (isMinute) {
				const m = token.elapsed ? parts.totalMinutes : parts.minutes;
				return lower === "mm" ? String(m).padStart(2, "0") : String(m);
			}
			switch (lower) {
				case "mmmm": {
					return MONTH_NAMES_LONG[parts.month - 1] ?? "";
				}
				case "mmm": {
					return MONTH_NAMES_SHORT[parts.month - 1] ?? "";
				}
				case "mm": {
					return String(parts.month).padStart(2, "0");
				}
				default: {
					return String(parts.month);
				}
			}
		}
	}
}

function formatDateWithPattern(date: Date, pattern: string, serial: number): string {
	const unquoted = stripLiteralsForDetection(pattern);
	const hasAmPm = /am\/pm|a\/p/i.test(unquoted);

	const tokens: DatePatternToken[] = [];
	let hasElapsed = false;
	let i = 0;
	while (i < pattern.length) {
		const ch = pattern[i];
		if (ch === "\\" && i + 1 < pattern.length) {
			tokens.push({ kind: "literal", text: pattern[i + 1] ?? "" });
			i += 2;
			continue;
		}
		if (ch === '"') {
			const end = pattern.indexOf('"', i + 1);
			if (end === -1) {
				tokens.push({ kind: "literal", text: pattern.slice(i + 1) });
				break;
			}
			tokens.push({ kind: "literal", text: pattern.slice(i + 1, end) });
			i = end + 1;
			continue;
		}
		const rest = pattern.slice(i);
		const elapsedMatch = /^\[(hh?|mm?|ss?)\]/i.exec(rest);
		if (elapsedMatch) {
			hasElapsed = true;
			tokens.push({ kind: "code", text: elapsedMatch[1] ?? "", elapsed: true });
			i += elapsedMatch[0].length;
			continue;
		}
		const amPmMatch = /^(AM\/PM|am\/pm|A\/P|a\/p)/.exec(rest);
		if (amPmMatch) {
			tokens.push({ kind: "code", text: amPmMatch[1] ?? "" });
			i += amPmMatch[0].length;
			continue;
		}
		const runMatch = /^([yYmMdDhHsS]+)/.exec(rest);
		if (runMatch) {
			tokens.push({ kind: "code", text: runMatch[1] ?? "" });
			i += runMatch[0].length;
			continue;
		}
		tokens.push({ kind: "literal", text: ch ?? "" });
		i += 1;
	}

	const totalSeconds = Math.round(Math.abs(serial) * 86_400);
	const totalHours = Math.floor(totalSeconds / 3600);
	const totalMinutes = Math.floor(totalSeconds / 60);

	// Derive regular time parts from the same rounded totalSeconds when elapsed tokens appear
	// so sub-second rounding (e.g. 59.999s) never desyncs [h]/[m] from mm/ss.
	const hours24 = hasElapsed ? totalHours % 24 : date.getUTCHours();
	const minutes = hasElapsed ? totalMinutes % 60 : date.getUTCMinutes();
	const seconds = hasElapsed ? totalSeconds % 60 : date.getUTCSeconds();

	const parts = {
		year: date.getUTCFullYear(),
		month: date.getUTCMonth() + 1,
		day: date.getUTCDate(),
		weekday: date.getUTCDay(),
		hours24,
		hours12: hours24 % 12 === 0 ? 12 : hours24 % 12,
		minutes,
		seconds,
		totalHours,
		totalMinutes,
		totalSeconds,
		hasAmPm,
	};

	let result = "";
	for (const [idx, token] of tokens.entries()) {
		result +=
			token.kind === "literal"
				? token.text
				: formatDateToken(token.text.toLowerCase(), token, idx, tokens, parts);
	}
	return hasElapsed && serial < 0 && totalSeconds > 0 ? `-${result}` : result;
}

const CORE_PATTERN_CHARS = new Set(["#", "0", "?", ".", ","]);

function formatNumericWithPattern(
	raw: number,
	section: string,
	useSectionSign: boolean,
	locale: string,
	currencyOverride?: string,
	bracketCurrency?: string,
): string {
	const unquoted = stripLiteralsForDetection(section);
	if (!/[#0?]/.test(unquoted)) {
		return extractLiteralText(section);
	}

	let coreStart = -1;
	let coreEnd = -1;
	let inQuotes = false;
	for (let i = 0; i < section.length; i += 1) {
		const ch = section[i];
		if (ch === "\\" && i + 1 < section.length) {
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (!inQuotes && ch !== undefined && CORE_PATTERN_CHARS.has(ch)) {
			if (coreStart === -1) {
				coreStart = i;
			}
			coreEnd = i + 1;
		}
	}

	if (coreStart === -1 || coreEnd === -1) {
		return String(raw);
	}

	let prefix = extractLiteralText(section.slice(0, coreStart));
	const coreRaw = section.slice(coreStart, coreEnd);
	let suffix = extractLiteralText(section.slice(coreEnd));

	const percentCount = (unquoted.match(/%/g) ?? []).length;
	let value = percentCount > 0 ? raw * 100 ** percentCount : raw;

	const trailingCommaMatch = /(,+)$/.exec(coreRaw);
	const scalingCommas = trailingCommaMatch ? (trailingCommaMatch[1]?.length ?? 0) : 0;
	if (scalingCommas > 0) {
		value /= 1000 ** scalingCommas;
	}

	const coreWithoutTrailingCommas =
		scalingCommas > 0 ? coreRaw.slice(0, coreRaw.length - scalingCommas) : coreRaw;

	const dotIdx = coreWithoutTrailingCommas.indexOf(".");
	const intPart =
		dotIdx === -1 ? coreWithoutTrailingCommas : coreWithoutTrailingCommas.slice(0, dotIdx);
	const fracPart = dotIdx === -1 ? "" : coreWithoutTrailingCommas.slice(dotIdx + 1);

	const useGrouping = intPart.includes(",");
	const minFractionDigits = (fracPart.match(/0/g) ?? []).length;
	const maxFractionDigits = Math.min(20, (fracPart.match(/[0#?]/g) ?? []).length);

	const isNegative = value < 0;
	const absFormatted = new Intl.NumberFormat(locale, {
		useGrouping,
		minimumFractionDigits: minFractionDigits,
		maximumFractionDigits: Math.max(minFractionDigits, maxFractionDigits),
	}).format(Math.abs(value));

	if (currencyOverride !== undefined) {
		if (bracketCurrency && prefix.includes(bracketCurrency)) {
			prefix = prefix.replace(bracketCurrency, () => currencyOverride);
		} else if (bracketCurrency && suffix.includes(bracketCurrency)) {
			suffix = suffix.replace(bracketCurrency, () => currencyOverride);
		} else {
			prefix = prefix.replaceAll(/[€$£¥]/g, () => currencyOverride);
			suffix = suffix.replaceAll(/[€$£¥]/g, () => currencyOverride);
		}
	}

	const needsImplicitMinus = !useSectionSign && isNegative;
	if (needsImplicitMinus && !prefix.includes("-") && !prefix.includes("(")) {
		return `-${prefix}${absFormatted}${suffix}`;
	}
	return `${prefix}${absFormatted}${suffix}`;
}

function applyTextTemplate(cleanedPattern: string, raw: string): string | null {
	let out = "";
	let hasPlaceholder = false;
	let inQuotes = false;
	for (let i = 0; i < cleanedPattern.length; i += 1) {
		const ch = cleanedPattern[i];
		if (ch === "\\" && i + 1 < cleanedPattern.length) {
			out += cleanedPattern[i + 1] ?? "";
			i += 1;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			continue;
		}
		if (!inQuotes && ch === "@") {
			hasPlaceholder = true;
			out += raw;
			continue;
		}
		out += ch ?? "";
	}
	return hasPlaceholder ? out : null;
}

export function formatCellDisplay(
	cell: CellModel | CellScalar,
	options?: {
		numFmt?: string;
		dateSystem?: ExcelDateSystem;
		locale?: string;
		currencySymbol?: string;
	},
): string {
	let raw: CellScalar;
	let cellNumFmt: string | undefined;
	if (isCellModel(cell)) {
		if (cell.type === "error" && typeof cell.value === "string") {
			return cell.value;
		}
		if (cell.value === null && cell.richText && cell.richText.length > 0) {
			return cell.richText.map((run) => run.text).join("");
		}
		raw = cell.value;
		cellNumFmt = cell.style?.numFmt;
	} else {
		raw = cell;
	}

	if (raw === null || raw === undefined) {
		return "";
	}
	if (typeof raw === "boolean") {
		return raw ? "TRUE" : "FALSE";
	}

	const numFmt = options?.numFmt ?? cellNumFmt;

	if (typeof raw === "string") {
		if (!numFmt || numFmt === "General" || numFmt === "@") {
			return raw;
		}
		const sections = splitNumFmtSections(numFmt);
		const textSection =
			sections.length >= 4 ? sections[3] : sections.length === 1 ? sections[0] : undefined;
		if (textSection !== undefined && textSection !== "@") {
			const cleaned = cleanNumFmtSection(textSection).pattern;
			const formatted = applyTextTemplate(cleaned, raw);
			if (formatted !== null) {
				return formatted;
			}
		}
		return raw;
	}

	const dateSystem = options?.dateSystem ?? 1900;
	const locale = options?.locale ?? "en-US";

	if (raw instanceof Date) {
		if (Number.isNaN(raw.getTime())) {
			return "";
		}
		if (!numFmt || numFmt === "General" || numFmt === "@") {
			const isMidnight =
				raw.getUTCHours() === 0 &&
				raw.getUTCMinutes() === 0 &&
				raw.getUTCSeconds() === 0;
			const iso = raw.toISOString();
			return isMidnight ? iso.slice(0, 10) : `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
		}
		const sections = splitNumFmtSections(numFmt);
		const cleaned = cleanNumFmtSection(sections[0] ?? numFmt);
		const serial = isoDateToExcelSerial(raw, dateSystem);
		if (isDateTimeFormat(cleaned.pattern)) {
			return formatDateWithPattern(raw, cleaned.pattern, serial);
		}
		return formatNumericWithPattern(
			serial,
			cleaned.pattern,
			sections.length > 1,
			locale,
			options?.currencySymbol,
			cleaned.bracketCurrency,
		);
	}

	if (!Number.isFinite(raw)) {
		return "";
	}
	if (!numFmt || numFmt === "General" || numFmt === "@") {
		return String(raw);
	}

	const sections = splitNumFmtSections(numFmt);
	let chosenSection = sections[0] ?? numFmt;
	let useSectionSign = false;
	if (sections.length === 2) {
		if (raw < 0) {
			chosenSection = sections[1] ?? chosenSection;
			useSectionSign = true;
		}
	} else if (sections.length >= 3) {
		if (raw < 0) {
			chosenSection = sections[1] ?? chosenSection;
			useSectionSign = true;
		} else if (raw === 0) {
			chosenSection = sections[2] ?? chosenSection;
			useSectionSign = true;
		}
	}

	const cleaned = cleanNumFmtSection(chosenSection);
	if (isDateTimeFormat(cleaned.pattern)) {
		const date = excelSerialToDate(raw, dateSystem);
		if (!date) {
			return String(raw);
		}
		return formatDateWithPattern(date, cleaned.pattern, raw);
	}

	return formatNumericWithPattern(
		raw,
		cleaned.pattern,
		useSectionSign,
		locale,
		options?.currencySymbol,
		cleaned.bracketCurrency,
	);
}

const CURRENCY_TOKEN_RE = /^(?:CHF|GBP|EUR|USD|[€$£¥])\s*|\s*(?:CHF|GBP|EUR|USD|[€$£¥])$/gi;
const SCIENTIFIC_RE = /^[+-]?\d+(?:[.,]\d+)?[eE][+-]?\d+$/;
const DOT_THOUSANDS_RE = /^[+-]?[1-9]\d{0,2}(\.\d{3})+$/;
const COMMA_THOUSANDS_MULTI_RE = /^[+-]?[1-9]\d{0,2}(,\d{3}){2,}$/;
const DOT_THOUSANDS_BEFORE_COMMA_RE = /^[+-]?\d{1,3}(\.\d{3})*,\d+$/;
const COMMA_THOUSANDS_BEFORE_DOT_RE = /^[+-]?\d{1,3}(,\d{3})*\.\d+$/;
const PLAIN_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

function applyPercentageMode(
	value: number,
	hasPercent: boolean,
	mode: "raw" | "ratio" | "percent",
): number {
	const normalized = value === 0 ? 0 : value;
	if (!hasPercent) {
		return normalized;
	}
	return mode === "ratio" ? normalized / 100 : normalized;
}

export function parseLocaleNumber(
	value: unknown,
	options?: {
		emptyPlaceholders?: string[];
		percentageMode?: "raw" | "ratio" | "percent";
	},
): number | null {
	if (typeof value === "number") {
		return Number.isFinite(value) ? (value === 0 ? 0 : value) : null;
	}
	if (typeof value !== "string") {
		return null;
	}

	const percentageMode = options?.percentageMode ?? "raw";
	let text = normalizeCellText(value);
	const placeholders = new Set(
		(options?.emptyPlaceholders ?? DEFAULT_EMPTY_PLACEHOLDERS).map((p) => p.trim().toLowerCase()),
	);
	if (placeholders.has(text.toLowerCase())) {
		return null;
	}

	let isAccountingNegative = false;
	if (text.startsWith("(") && text.endsWith(")")) {
		isAccountingNegative = true;
		text = text.slice(1, -1).trim();
		if (placeholders.has(text.toLowerCase())) {
			return null;
		}
	}

	let hasPercent = false;
	if (text.endsWith("%")) {
		hasPercent = true;
		text = text.slice(0, -1).trim();
	}

	// Extract an optional leading sign before currency stripping so "-€42.50" / "+$1,200.00" parse cleanly.
	let leadingSign = "";
	const leadingSignMatch = /^([+-])\s*/.exec(text);
	if (leadingSignMatch) {
		leadingSign = leadingSignMatch[1] ?? "";
		text = text.slice(leadingSignMatch[0].length);
	}

	if (isAccountingNegative && leadingSign !== "") {
		return null;
	}

	text = text.replaceAll(CURRENCY_TOKEN_RE, "").trim();

	if (text.length === 0 || placeholders.has(text.toLowerCase())) {
		return null;
	}

	text = text.replace(/^([+-])\s+/, "$1");

	const hasInnerSign = text.startsWith("-") || text.startsWith("+");
	if ((leadingSign !== "" && hasInnerSign) || (isAccountingNegative && hasInnerSign)) {
		return null;
	}
	if (leadingSign !== "") {
		text = `${leadingSign}${text}`;
	}

	if (SCIENTIFIC_RE.test(text)) {
		const parsed = Number(text.replace(",", "."));
		if (!Number.isFinite(parsed)) {
			return null;
		}
		const signed = isAccountingNegative ? -parsed : parsed;
		return applyPercentageMode(signed, hasPercent, percentageMode);
	}

	let normalizedNumeric: string;
	const hasComma = text.includes(",");
	const hasDot = text.includes(".");

	if (hasComma && hasDot) {
		const lastComma = text.lastIndexOf(",");
		const lastDot = text.lastIndexOf(".");
		if (lastComma > lastDot) {
			if (!DOT_THOUSANDS_BEFORE_COMMA_RE.test(text)) {
				return null;
			}
			normalizedNumeric = text.replaceAll(".", "").replace(",", ".");
		} else {
			if (!COMMA_THOUSANDS_BEFORE_DOT_RE.test(text)) {
				return null;
			}
			normalizedNumeric = text.replaceAll(",", "");
		}
	} else if (hasComma) {
		const commaCount = (text.match(/,/g) ?? []).length;
		if (commaCount > 1) {
			if (!COMMA_THOUSANDS_MULTI_RE.test(text)) {
				return null;
			}
			normalizedNumeric = text.replaceAll(",", "");
		} else {
			normalizedNumeric = text.replace(",", ".");
		}
	} else if (hasDot) {
		const dotCount = (text.match(/\./g) ?? []).length;
		if (dotCount > 1) {
			if (!DOT_THOUSANDS_RE.test(text)) {
				return null;
			}
			normalizedNumeric = text.replaceAll(".", "");
		} else {
			normalizedNumeric = DOT_THOUSANDS_RE.test(text) ? text.replaceAll(".", "") : text;
		}
	} else {
		normalizedNumeric = text;
	}

	if (!PLAIN_NUMBER_RE.test(normalizedNumeric)) {
		return null;
	}
	const parsed = Number(normalizedNumeric);
	if (!Number.isFinite(parsed)) {
		return null;
	}
	const signed = isAccountingNegative ? -parsed : parsed;
	return applyPercentageMode(signed, hasPercent, percentageMode);
}

export function parseBooleanValue(
	value: unknown,
	options?: { trueTokens?: string[]; falseTokens?: string[] },
): boolean | null {
	if (typeof value === "boolean") {
		return value;
	}
	if (typeof value === "number") {
		if (value === 1) {
			return true;
		}
		if (value === 0) {
			return false;
		}
		return null;
	}
	if (typeof value !== "string") {
		return null;
	}

	const normalized = normalizeCellText(value).toLowerCase();
	if (normalized.length === 0) {
		return null;
	}

	const trueSet = new Set(
		(options?.trueTokens ?? DEFAULT_TRUE_TOKENS).map((t) => t.trim().toLowerCase()),
	);
	if (trueSet.has(normalized)) {
		return true;
	}

	const falseSet = new Set(
		(options?.falseTokens ?? DEFAULT_FALSE_TOKENS).map((t) => t.trim().toLowerCase()),
	);
	if (falseSet.has(normalized)) {
		return false;
	}

	return null;
}

export interface ThresholdParseOptions {
	belowMultiplier?: number;
	aboveMultiplier?: number;
	thresholdNumeric?: "null" | "bound" | "scaled";
	emptyPlaceholders?: string[];
	percentageMode?: "raw" | "ratio" | "percent";
	missingSortValue?: number;
	thresholdStatus?: CellStatus;
}

export interface HybridValue {
	kind: "number" | "threshold" | "missing" | "text";
	raw: unknown;
	display: string;
	numeric: number | null;
	sortValue: number;
	operator?: "<" | "<=" | ">" | ">=";
	bound?: number;
	status?: CellStatus;
}

const THRESHOLD_RE = /^(<=|>=|<|>)\s*(.+)$/;

export function parseThresholdValue(
	value: unknown,
	options?: ThresholdParseOptions,
): HybridValue {
	const missingSortValue = options?.missingSortValue ?? Infinity;

	if (value === null || value === undefined) {
		return {
			kind: "missing",
			raw: value,
			display: "",
			numeric: null,
			sortValue: missingSortValue,
		};
	}

	if (typeof value === "number") {
		if (!Number.isFinite(value)) {
			return {
				kind: "missing",
				raw: value,
				display: "",
				numeric: null,
				sortValue: missingSortValue,
			};
		}
		const normalized = value === 0 ? 0 : value;
		return {
			kind: "number",
			raw: value,
			display: String(normalized),
			numeric: normalized,
			sortValue: normalized,
			status: "base",
		};
	}

	const belowMultiplier = options?.belowMultiplier ?? 0.25;
	const aboveMultiplier = options?.aboveMultiplier ?? 1.25;
	const thresholdNumeric = options?.thresholdNumeric ?? "null";

	const display = normalizeCellText(value);
	const placeholders = new Set(
		(options?.emptyPlaceholders ?? DEFAULT_EMPTY_PLACEHOLDERS).map((p) => p.trim().toLowerCase()),
	);
	if (placeholders.has(display.toLowerCase())) {
		return {
			kind: "missing",
			raw: value,
			display,
			numeric: null,
			sortValue: missingSortValue,
		};
	}

	const thresholdMatch = THRESHOLD_RE.exec(display);
	if (thresholdMatch) {
		const operator = thresholdMatch[1] as "<" | "<=" | ">" | ">=";
		const rest = thresholdMatch[2] ?? "";
		const bound = parseLocaleNumber(rest, {
			emptyPlaceholders: options?.emptyPlaceholders,
			percentageMode: options?.percentageMode,
		});
		if (bound !== null) {
			const multiplier =
				operator === "<" || operator === "<=" ? belowMultiplier : aboveMultiplier;
			const sortValue = bound * multiplier;
			let numeric: number | null = null;
			if (thresholdNumeric === "bound") {
				numeric = bound;
			} else if (thresholdNumeric === "scaled") {
				numeric = sortValue;
			}
			return {
				kind: "threshold",
				raw: value,
				display,
				numeric,
				sortValue,
				operator,
				bound,
				status: options?.thresholdStatus ?? "caution",
			};
		}
	}

	const parsedNumber = parseLocaleNumber(display, {
		emptyPlaceholders: options?.emptyPlaceholders,
		percentageMode: options?.percentageMode,
	});
	if (parsedNumber !== null) {
		return {
			kind: "number",
			raw: value,
			display,
			numeric: parsedNumber,
			sortValue: parsedNumber,
			status: "base",
		};
	}

	return {
		kind: "text",
		raw: value,
		display,
		numeric: null,
		sortValue: missingSortValue,
	};
}

export function compareMissingLast(
	a: number | null,
	b: number | null,
	direction: "asc" | "desc" = "asc",
): number {
	const aMissing = a === null || !Number.isFinite(a);
	const bMissing = b === null || !Number.isFinite(b);
	if (aMissing && bMissing) {
		return 0;
	}
	if (aMissing) {
		return 1;
	}
	if (bMissing) {
		return -1;
	}
	return direction === "desc" ? b - a : a - b;
}

export function compareNatural(a: string, b: string, locale?: string): number {
	return a.localeCompare(b, locale, { numeric: true });
}

const DEFAULT_ADAPTIVE_RULES: ReadonlyArray<{ minAbs: number; decimals: number }> = [
	{ minAbs: 100, decimals: 0 },
	{ minAbs: 10, decimals: 1 },
	{ minAbs: 1, decimals: 2 },
	{ minAbs: 0, decimals: 3 },
];

export function roundAdaptive(
	value: number,
	rules?: Array<{ minAbs: number; decimals: number }>,
): number {
	if (!Number.isFinite(value)) {
		return value;
	}
	const activeRules = (rules && rules.length > 0 ? rules : DEFAULT_ADAPTIVE_RULES).toSorted(
		(a, b) => b.minAbs - a.minAbs,
	);
	const abs = Math.abs(value);
	let decimals = activeRules.at(-1)?.decimals ?? 0;
	for (const rule of activeRules) {
		if (abs >= rule.minAbs) {
			decimals = rule.decimals;
			break;
		}
	}
	const factor = 10 ** Math.max(0, Math.floor(decimals));
	const rounded = Math.round((value + Number.EPSILON * Math.sign(value)) * factor) / factor;
	return rounded === 0 ? 0 : rounded;
}
