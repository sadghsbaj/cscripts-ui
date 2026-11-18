import { describe, expect, it } from "vitest";
import type { CellModel } from "./types.ts";
import {
	EXCEL_ERROR_TOKENS,
	cellToString,
	compareMissingLast,
	compareNatural,
	formatCellDisplay,
	isExcelErrorValue,
	normalizeCellText,
	parseBooleanValue,
	parseLocaleNumber,
	parseThresholdValue,
	roundAdaptive,
} from "./values.ts";

describe("error tokens, isExcelErrorValue, and cellToString", () => {
	it("recognizes all Excel error tokens across raw strings and CellModel shapes", () => {
		expect(EXCEL_ERROR_TOKENS).toEqual([
			"#REF!",
			"#DIV/0!",
			"#VALUE!",
			"#N/A",
			"#NAME?",
			"#NUM!",
			"#NULL!",
			"#SPILL!",
			"#CALC!",
		]);

		for (const token of EXCEL_ERROR_TOKENS) {
			expect(isExcelErrorValue(token)).toBe(true);
			expect(isExcelErrorValue(` ${token.toLowerCase()} `)).toBe(true);
			expect(isExcelErrorValue({ value: token })).toBe(true);
			expect(isExcelErrorValue({ value: null, formula: { expression: "1/0", error: token } })).toBe(
				true,
			);
		}

		expect(isExcelErrorValue({ value: "custom", type: "error" })).toBe(true);
		expect(isExcelErrorValue("ok")).toBe(false);
		expect(isExcelErrorValue({ value: 42 })).toBe(false);
		expect(isExcelErrorValue(null)).toBe(false);
	});

	it("extracts text via cellToString with richText fallback and emptyOnError", () => {
		expect(cellToString(null)).toBe("");
		expect(cellToString(undefined)).toBe("");
		expect(cellToString(42)).toBe("42");
		expect(cellToString(true)).toBe("true");
		expect(cellToString(new Date("2026-01-01T00:00:00.000Z"))).toBe("2026-01-01T00:00:00.000Z");
		expect(cellToString(new Date("invalid"))).toBe("");

		const richCell: CellModel = {
			value: null,
			richText: [{ text: "Hello " }, { text: "World", bold: true }],
		};
		expect(cellToString(richCell)).toBe("Hello World");

		expect(cellToString("#DIV/0!")).toBe("#DIV/0!");
		expect(cellToString("#DIV/0!", { emptyOnError: true })).toBe("");
		expect(cellToString({ value: "#REF!", type: "error" }, { emptyOnError: true })).toBe("");
		expect(
			cellToString(
				{ value: 0, formula: { expression: "A1/0", error: "#DIV/0!" } },
				{ emptyOnError: true },
			),
		).toBe("");
	});
});

describe("normalizeCellText", () => {
	it("strips NBSP and zero-width characters, normalizes line endings, and optionally collapses whitespace", () => {
		const dirty = "\u{FEFF}  Hello\u{00A0}\u{200B}World\r\nNext\rLine\u{200D}  ";
		expect(normalizeCellText(dirty)).toBe("Hello World\nNext\nLine");
		expect(normalizeCellText(dirty, { collapseWhitespace: true })).toBe("Hello World Next Line");

		expect(normalizeCellText("A\u{00A0}\u{200B}B\r\nC", { stripZeroWidth: false })).toBe(
			"A\u{00A0}\u{200B}B\nC",
		);
		expect(normalizeCellText("A\r\nB", { normalizeLineEndings: false })).toBe("A\r\nB");
		expect(normalizeCellText(null)).toBe("");
		expect(normalizeCellText(undefined)).toBe("");
	});
});

describe("parseLocaleNumber", () => {
	it("parses numbers, scientific notation, DE/EN decimals, thousands, currencies, and accounting parens", () => {
		expect(parseLocaleNumber(42.5)).toBe(42.5);
		expect(parseLocaleNumber(-0)).toBe(0);
		expect(parseLocaleNumber("9.6643E-2")).toBeCloseTo(0.096643, 10);
		expect(parseLocaleNumber("9,6643e-2")).toBeCloseTo(0.096643, 10);

		expect(parseLocaleNumber("106,89")).toBe(106.89);
		expect(parseLocaleNumber("631.000")).toBe(631_000);
		expect(parseLocaleNumber("1.234.567")).toBe(1_234_567);
		expect(parseLocaleNumber("0.123")).toBe(0.123);
		expect(parseLocaleNumber("12.34")).toBe(12.34);

		expect(parseLocaleNumber("70.000,00")).toBe(70_000);
		expect(parseLocaleNumber("70,000.00")).toBe(70_000);
		expect(parseLocaleNumber("1,234,567")).toBe(1_234_567);

		expect(parseLocaleNumber("(70.000,00 €)")).toBe(-70_000);
		expect(parseLocaleNumber("- 70.000,00 €")).toBe(-70_000);
		expect(parseLocaleNumber("CHF 1,234.50")).toBe(1234.5);
		expect(parseLocaleNumber("$ 42.50")).toBe(42.5);
		expect(parseLocaleNumber("-€42.50")).toBe(-42.5);
		expect(parseLocaleNumber("- € 42.50")).toBe(-42.5);
		expect(parseLocaleNumber("+$1,200.00")).toBe(1200);
	});

	it("handles percentage modes and rejects placeholders or invalid formats", () => {
		expect(parseLocaleNumber("12,5%")).toBe(12.5);
		expect(parseLocaleNumber("12,5%", { percentageMode: "raw" })).toBe(12.5);
		expect(parseLocaleNumber("12,5%", { percentageMode: "percent" })).toBe(12.5);
		expect(parseLocaleNumber("12,5%", { percentageMode: "ratio" })).toBe(0.125);
		expect(parseLocaleNumber("(12,5%)", { percentageMode: "ratio" })).toBe(-0.125);

		for (const emptyOrInvalid of [
			"-",
			"—",
			"–",
			"",
			"na",
			"N/A",
			"#N/A",
			"(-)",
			"(-10)",
			"1.23.456",
			"70.00,00",
			"--€42.50",
			"-€-42.50",
			"(-€42.50)",
			"- €",
			NaN,
			Infinity,
			null,
			undefined,
			"abc",
		]) {
			expect(parseLocaleNumber(emptyOrInvalid)).toBeNull();
		}

		expect(parseLocaleNumber("TBD", { emptyPlaceholders: ["tbd"] })).toBeNull();
	});
});

describe("parseBooleanValue", () => {
	it("parses boolean primitives, 1/0, and multilingual tokens", () => {
		expect(parseBooleanValue(true)).toBe(true);
		expect(parseBooleanValue(false)).toBe(false);
		expect(parseBooleanValue(1)).toBe(true);
		expect(parseBooleanValue(0)).toBe(false);

		for (const truthy of [
			"true",
			"TRUE",
			"ja",
			"Ja",
			"yes",
			"1",
			"x",
			"X",
			"wahr",
			"\u{00A0}ja\u{200B}",
		]) {
			expect(parseBooleanValue(truthy)).toBe(true);
		}
		for (const falsy of ["false", "FALSE", "nein", "Nein", "no", "0", "falsch"]) {
			expect(parseBooleanValue(falsy)).toBe(false);
		}

		expect(parseBooleanValue(2)).toBeNull();
		expect(parseBooleanValue("")).toBeNull();
		expect(parseBooleanValue("maybe")).toBeNull();
		expect(parseBooleanValue(null)).toBeNull();

		expect(parseBooleanValue("y", { trueTokens: ["y"], falseTokens: ["n"] })).toBe(true);
		expect(parseBooleanValue("n", { trueTokens: ["y"], falseTokens: ["n"] })).toBe(false);
	});
});

describe("parseThresholdValue, compareMissingLast, compareNatural, and roundAdaptive", () => {
	it("classifies thresholds, numbers, missing placeholders, and plain text", () => {
		const lt = parseThresholdValue("< 0,2");
		expect(lt).toEqual({
			kind: "threshold",
			raw: "< 0,2",
			display: "< 0,2",
			numeric: null,
			sortValue: 0.05,
			operator: "<",
			bound: 0.2,
			status: "caution",
		});

		const gte = parseThresholdValue(">= 100", {
			thresholdNumeric: "bound",
			thresholdStatus: "negative",
		});
		expect(gte).toEqual({
			kind: "threshold",
			raw: ">= 100",
			display: ">= 100",
			numeric: 100,
			sortValue: 125,
			operator: ">=",
			bound: 100,
			status: "negative",
		});

		const scaled = parseThresholdValue("<= 10", {
			thresholdNumeric: "scaled",
			belowMultiplier: 0.5,
		});
		expect(scaled.numeric).toBe(5);
		expect(scaled.sortValue).toBe(5);

		expect(parseThresholdValue("–")).toEqual({
			kind: "missing",
			raw: "–",
			display: "–",
			numeric: null,
			sortValue: Infinity,
		});

		expect(parseThresholdValue("42,5")).toEqual({
			kind: "number",
			raw: "42,5",
			display: "42,5",
			numeric: 42.5,
			sortValue: 42.5,
			status: "base",
		});

		expect(parseThresholdValue("pending")).toEqual({
			kind: "text",
			raw: "pending",
			display: "pending",
			numeric: null,
			sortValue: Infinity,
		});
	});

	it("keeps missing and non-finite sortValues strictly last in both asc and desc order", () => {
		const items = ["10", "–", "< 0,2", ">= 100", "text", null].map((raw) => ({
			raw,
			parsed: parseThresholdValue(raw),
		}));

		const asc = items.toSorted((a, b) =>
			compareMissingLast(a.parsed.sortValue, b.parsed.sortValue, "asc"),
		);
		expect(asc.map((x) => x.raw)).toEqual(["< 0,2", "10", ">= 100", "–", "text", null]);

		const desc = items.toSorted((a, b) =>
			compareMissingLast(a.parsed.sortValue, b.parsed.sortValue, "desc"),
		);
		expect(desc.map((x) => x.raw)).toEqual([">= 100", "10", "< 0,2", "–", "text", null]);

		expect(compareMissingLast(null, 5, "desc")).toBe(1);
		expect(compareMissingLast(5, null, "desc")).toBe(-1);
		expect(compareMissingLast(null, Infinity, "asc")).toBe(0);
	});

	it("performs natural string comparison and adaptive rounding", () => {
		expect(["P10", "P2", "P1", "P20"].toSorted((a, b) => compareNatural(a, b, "en"))).toEqual([
			"P1",
			"P2",
			"P10",
			"P20",
		]);
		expect(compareNatural("P2", "P10")).toBeLessThan(0);

		expect(roundAdaptive(123.456)).toBe(123);
		expect(roundAdaptive(12.345)).toBe(12.3);
		expect(roundAdaptive(1.2345)).toBe(1.23);
		expect(roundAdaptive(0.12345)).toBe(0.123);
		expect(roundAdaptive(-0.0001)).toBe(0);
		expect(roundAdaptive(NaN)).toBeNaN();
		expect(roundAdaptive(55.55, [{ minAbs: 0, decimals: 1 }])).toBe(55.6);
	});
});

describe("formatCellDisplay", () => {
	it("formats General, @, booleans, errors, richText, numbers, percentages, and currencies", () => {
		expect(formatCellDisplay(null)).toBe("");
		expect(formatCellDisplay(true)).toBe("TRUE");
		expect(formatCellDisplay(false)).toBe("FALSE");
		expect(formatCellDisplay(123.45, { numFmt: "General" })).toBe("123.45");
		expect(formatCellDisplay("hello", { numFmt: "@" })).toBe("hello");
		expect(formatCellDisplay("hello", { numFmt: '"Prefix: "@' })).toBe("Prefix: hello");
		expect(formatCellDisplay(String.raw`a"b\c`, { numFmt: '"Prefix: "@' })).toBe(
			String.raw`Prefix: a"b\c`,
		);

		expect(formatCellDisplay({ value: "#REF!", type: "error" })).toBe("#REF!");
		expect(
			formatCellDisplay({ value: null, richText: [{ text: "A" }, { text: "B", bold: true }] }),
		).toBe("AB");

		expect(formatCellDisplay(1234.5, { numFmt: "#,##0.00" })).toBe("1,234.50");
		expect(formatCellDisplay(-1234.5, { numFmt: "#,##0.00" })).toBe("-1,234.50");
		expect(formatCellDisplay(1234.5, { numFmt: "#,##0.00", locale: "de-DE" })).toBe("1.234,50");
		expect(formatCellDisplay(0.125, { numFmt: "0.0%" })).toBe("12.5%");
		expect(formatCellDisplay(1500, { numFmt: "#,##0," })).toBe("2");

		expect(formatCellDisplay(42.5, { numFmt: "[$€-407]#,##0.00" })).toBe("€42.50");
		expect(formatCellDisplay(42.5, { numFmt: "[$€-407]#,##0.00", currencySymbol: "CHF " })).toBe(
			"CHF 42.50",
		);
		expect(
			formatCellDisplay({ value: 42.5, style: { numFmt: "0.0" } }, { numFmt: "0.00" }),
		).toBe("42.50");

		// Backslash-escaped literal tokens outside quotes must not trigger date/bracket parsing
		expect(formatCellDisplay(42.5, { numFmt: String.raw`0.0\m` })).toBe("42.5m");
		expect(formatCellDisplay(42.5, { numFmt: String.raw`\[tag\] #,##0.0` })).toBe("[tag] 42.5");
		expect(formatCellDisplay(42.5, { numFmt: String.raw`0.0"\\"` })).toBe("42.5\\");
	});

	it("formats multi-section positive;negative;zero;text patterns", () => {
		const numFmt = `#,##0.00;(#,##0.00);"-";"Text: "@`;
		expect(formatCellDisplay(1234.5, { numFmt })).toBe("1,234.50");
		expect(formatCellDisplay(-1234.5, { numFmt })).toBe("(1,234.50)");
		expect(formatCellDisplay(0, { numFmt })).toBe("-");
		expect(formatCellDisplay("Note", { numFmt })).toBe("Text: Note");
	});

	it("formats Excel date, time, and datetime numFmt patterns", () => {
		// 46023 + (15*3600 + 5*60 + 5)/86400 -> 2026-01-01 15:05:05 UTC
		const serial = 46_023 + (15 * 3600 + 5 * 60 + 5) / 86_400;
		expect(formatCellDisplay(46_023, { numFmt: "yyyy-mm-dd" })).toBe("2026-01-01");
		expect(formatCellDisplay(46_023, { numFmt: "dd.mm.yyyy" })).toBe("01.01.2026");
		expect(formatCellDisplay(serial, { numFmt: "yyyy-mm-dd hh:mm:ss" })).toBe(
			"2026-01-01 15:05:05",
		);
		expect(formatCellDisplay(serial, { numFmt: "hh:mm:ss" })).toBe("15:05:05");
		expect(formatCellDisplay(serial, { numFmt: "h:mm AM/PM" })).toBe("3:05 PM");
		expect(formatCellDisplay(46_023 + 30 / 1440, { numFmt: "h:mm AM/PM" })).toBe("12:30 AM");
		expect(formatCellDisplay(46_023, { numFmt: "[$-409]dddd, mmmm d, yyyy" })).toBe(
			"Thursday, January 1, 2026",
		);

		expect(formatCellDisplay(44_561, { numFmt: "yyyy-mm-dd", dateSystem: 1904 })).toBe(
			"2026-01-01",
		);
		expect(formatCellDisplay(new Date("2026-03-15T00:00:00Z"))).toBe("2026-03-15");
		expect(formatCellDisplay(new Date("2026-03-15T09:05:02Z"))).toBe("2026-03-15 09:05:02");
		expect(formatCellDisplay(new Date("2026-03-15T09:05:02Z"), { numFmt: "dd.mm.yyyy" })).toBe(
			"15.03.2026",
		);

		expect(formatCellDisplay(0.25, { numFmt: "[h]:mm:ss" })).toBe("6:00:00");
		expect(formatCellDisplay(0.25, { numFmt: "[m]:ss" })).toBe("360:00");
		expect(formatCellDisplay(0.25, { numFmt: "[s]" })).toBe("21600");

		expect(formatCellDisplay(1.25, { numFmt: "[h]:mm:ss" })).toBe("30:00:00");
		expect(formatCellDisplay(1.25, { numFmt: "[hh]:mm:ss" })).toBe("30:00:00");
		expect(formatCellDisplay(1.25, { numFmt: "[m]:ss" })).toBe("1800:00");
		expect(formatCellDisplay(1.25, { numFmt: "[mm]:ss" })).toBe("1800:00");

		expect(formatCellDisplay(59.999 / 86_400, { numFmt: "[h]:mm:ss" })).toBe("0:01:00");
		expect(formatCellDisplay(new Date("1900-01-01T06:00:00Z"), { numFmt: "[h]:mm:ss" })).toBe(
			"30:00:00",
		);
		expect(formatCellDisplay(new Date("1899-12-30T18:00:00Z"), { numFmt: "[h]:mm:ss" })).toBe(
			"-6:00:00",
		);
		expect(formatCellDisplay(-0.25, { numFmt: "[h]:mm:ss" })).toBe("-0.25");
	});
});
