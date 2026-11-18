import { describe, expect, it } from "vitest";
import {
	excelSerialToDate,
	excelSerialToIsoDate,
	excelSerialToIsoDateTime,
	excelSerialToTime,
	isoDateToExcelSerial,
	parseDateValue,
	parsePeriodHeader,
} from "./dates.ts";

describe("1900 Excel serial conversions", () => {
	it("handles 1900 epoch, fractional time, Lotus leap-year clamp on serial 60, and modern dates", () => {
		expect(excelSerialToIsoDateTime(0.5)).toBe("1899-12-31T12:00:00Z");
		expect(excelSerialToTime(0.5)).toBe("12:00:00");

		expect(excelSerialToIsoDate(1)).toBe("1900-01-01");
		expect(excelSerialToIsoDate(59)).toBe("1900-02-28");

		// Serial 60 is Excel's phantom 1900-02-29: clamped to 1900-02-28 while keeping time fraction
		expect(excelSerialToIsoDate(60)).toBe("1900-02-28");
		expect(excelSerialToIsoDateTime(60)).toBe("1900-02-28T00:00:00Z");
		expect(excelSerialToIsoDateTime(60.5)).toBe("1900-02-28T12:00:00Z");
		expect(excelSerialToIsoDateTime(59.9999999)).toBe("1900-02-28T23:59:59Z");

		expect(excelSerialToIsoDate(61)).toBe("1900-03-01");
		expect(excelSerialToIsoDate(46_023)).toBe("2026-01-01");
		expect(excelSerialToIsoDateTime(45_000.75)).toBe("2023-03-15T18:00:00Z");
		expect(excelSerialToTime(45_000.75)).toBe("18:00:00");
	});

	it("returns null for negative or non-finite serials", () => {
		for (const bad of [-0.1, -10, NaN, Infinity, -Infinity]) {
			expect(excelSerialToDate(bad)).toBeNull();
			expect(excelSerialToIsoDate(bad)).toBeNull();
			expect(excelSerialToIsoDateTime(bad)).toBeNull();
			expect(excelSerialToTime(bad)).toBeNull();
		}
	});
});

describe("1904 Excel serial conversions and roundtrip", () => {
	it("roundtrips 1904 dates and preserves fractional UTC time", () => {
		expect(excelSerialToIsoDate(0, 1904)).toBe("1904-01-01");
		expect(excelSerialToIsoDate(1, 1904)).toBe("1904-01-02");

		const dateOnlySerial = isoDateToExcelSerial("2026-01-01", 1904);
		expect(excelSerialToIsoDate(dateOnlySerial, 1904)).toBe("2026-01-01");

		const dtSerial = isoDateToExcelSerial("2026-01-01T18:00:00Z", 1904);
		expect(dtSerial).toBe(dateOnlySerial + 0.75);
		expect(excelSerialToIsoDateTime(dtSerial, 1904)).toBe("2026-01-01T18:00:00Z");

		const fromDate = isoDateToExcelSerial(new Date("2026-06-15T06:30:00Z"), 1904);
		expect(excelSerialToIsoDateTime(fromDate, 1904)).toBe("2026-06-15T06:30:00Z");
	});

	it("roundtrips 1900 pre-60 and post-60 dates and throws RangeError on invalid ISO input", () => {
		expect(isoDateToExcelSerial("1900-01-01", 1900)).toBe(1);
		expect(isoDateToExcelSerial("1900-02-28", 1900)).toBe(59);
		expect(isoDateToExcelSerial("1900-03-01", 1900)).toBe(61);
		expect(isoDateToExcelSerial("2026-01-01", 1900)).toBe(46_023);
		expect(isoDateToExcelSerial("2023-03-15T18:00:00Z", 1900)).toBe(45_000.75);

		expect(() => isoDateToExcelSerial("2026-02-31")).toThrow(RangeError);
		expect(() => isoDateToExcelSerial("2026-03-15T25:00:00")).toThrow(RangeError);
		expect(() => isoDateToExcelSerial("2026-3-5T12:00:00")).toThrow(RangeError);
		expect(() => isoDateToExcelSerial("not-a-date")).toThrow(RangeError);
		expect(() => isoDateToExcelSerial(new Date("invalid"))).toThrow(RangeError);
	});
});

describe("parseDateValue", () => {
	it("parses EU, ISO, US, timestamp, Date, and Excel serial inputs", () => {
		expect(parseDateValue("15.03.2026")).toBe("2026-03-15");
		expect(parseDateValue("5.3.26")).toBe("2026-03-05");
		expect(parseDateValue("5.3.69")).toBe("2069-03-05");
		expect(parseDateValue("5.3.70")).toBe("1970-03-05");
		expect(parseDateValue("15.03.2026 14:30:00")).toBe("2026-03-15");
		expect(parseDateValue("15.03.2026 08:30:15")).toBe("2026-03-15");

		expect(parseDateValue("2026-03-15")).toBe("2026-03-15");
		expect(parseDateValue("2026-03-15T14:30:00Z")).toBe("2026-03-15");
		expect(parseDateValue("2026-03-15 14:30:00")).toBe("2026-03-15");
		expect(parseDateValue("2026-03-15T23:30:00-02:00")).toBe("2026-03-16");

		expect(parseDateValue("03/15/2026", { formats: ["us", "iso"] })).toBe("2026-03-15");
		expect(parseDateValue("01/02/2026", { formats: ["us", "iso"] })).toBe("2026-01-02");

		expect(parseDateValue(46_023)).toBe("2026-01-01");
		expect(parseDateValue(44_561, { dateSystem: 1904 })).toBe("2026-01-01");
		expect(parseDateValue(new Date("2026-04-05T00:00:00Z"))).toBe("2026-04-05");
		expect(parseDateValue("\u{00A0}2026-03-15\u{200B}")).toBe("2026-03-15");
		expect(parseDateValue("2024-02-29")).toBe("2024-02-29");
	});

	it("strictly rejects impossible calendar dates and non-date values", () => {
		for (const invalid of [
			"2026-02-31",
			"99.99.2026",
			"2025-02-29",
			"2026-13-01",
			"02/29/2025",
			"15.03.2026 99:99",
			"03/15/2026 24:00",
			"2026-03-15T25:00:00",
			"2026-03-15T12:60:00",
			"2026-3-5T12:00:00",
			"",
			" ".repeat(3),
			null,
			undefined,
			true,
			new Date("invalid"),
		]) {
			expect(parseDateValue(invalid)).toBeNull();
		}
		expect(parseDateValue("03/15/2026 24:00", { formats: ["us", "iso"] })).toBeNull();
	});
});

describe("parsePeriodHeader", () => {
	it("parses German and English month names, year-month formats, quarters, and serials", () => {
		expect(parsePeriodHeader("März", { fallbackYear: 2026 })).toBe("2026-03");
		expect(parsePeriodHeader("Maerz", { fallbackYear: 2026 })).toBe("2026-03");
		expect(parsePeriodHeader("Mrz.", { fallbackYear: 2026 })).toBe("2026-03");
		expect(parsePeriodHeader("January", { fallbackYear: 2026 })).toBe("2026-01");
		expect(parsePeriodHeader("Sept.", { fallbackYear: 2026 })).toBe("2026-09");

		expect(parsePeriodHeader("2026-01")).toBe("2026-01");
		expect(parsePeriodHeader("01/2026")).toBe("2026-01");
		expect(parsePeriodHeader("2026-01-15")).toBe("2026-01");

		expect(parsePeriodHeader("2026-Q1")).toBe("2026-Q1");
		expect(parsePeriodHeader("Q2 2026")).toBe("2026-Q2");
		expect(parsePeriodHeader("Q4-25")).toBe("2025-Q4");
		expect(parsePeriodHeader("Q3", { fallbackYear: 2026 })).toBe("2026-Q3");

		expect(parsePeriodHeader("März 2026")).toBe("2026-03");
		expect(parsePeriodHeader("2026 März")).toBe("2026-03");
		expect(parsePeriodHeader("Jan 26")).toBe("2026-01");

		expect(parsePeriodHeader(46_023)).toBe("2026-01");
		expect(parsePeriodHeader(44_561, { dateSystem: 1904 })).toBe("2026-01");
		expect(parsePeriodHeader(new Date("2026-05-10T00:00:00Z"))).toBe("2026-05");
	});

	it("respects locale filtering and rejects invalid period strings", () => {
		expect(parsePeriodHeader("März", { fallbackYear: 2026, locales: ["en"] })).toBeNull();
		expect(parsePeriodHeader("March", { fallbackYear: 2026, locales: ["en"] })).toBe("2026-03");

		for (const bad of ["", "2026-13", "Q5 2026", "not-a-period", NaN, new Date("invalid")]) {
			expect(parsePeriodHeader(bad)).toBeNull();
		}
	});
});
