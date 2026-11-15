import { describe, expect, it, vi } from "vitest";
import { isFsError, type FsError } from "./errors.ts";
import {
	assertNonOverlappingTemplates,
	createPathTemplate,
	DEFAULT_MAX_RELATIVE_PATH_LENGTH,
	DEFAULT_MAX_SEGMENT_LENGTH,
	DEFAULT_WARN_RELATIVE_PATH_LENGTH,
	isIgnoredPath,
	normalizeRelativePath,
	sanitizePathSegment,
	validatePathSegment,
	validateRelativePath,
} from "./path-template.ts";

function captureInvalidPath(fn: () => unknown): FsError {
	try {
		fn();
	} catch (error) {
		expect(isFsError(error)).toBe(true);
		if (isFsError(error)) {
			expect(error.code).toBe("INVALID_PATH");
			return error;
		}
	}
	throw new Error("Expected FsError('INVALID_PATH') to be thrown");
}

describe("path-template: Windows/SMB & path safety", () => {
	it("rejects all Windows reserved device names (case-insensitive and with extensions)", () => {
		const reserved = [
			"CON",
			"PRN",
			"AUX",
			"NUL",
			"con",
			"Aux",
			"CON.txt",
			"nul.json",
			"com1.tar.gz",
			...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
			...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
			...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}.log`),
		];

		for (const name of reserved) {
			const res = validatePathSegment(name);
			expect(res.valid).toBe(false);
			expect(res.reasons).toContain("reserved-name");
			expect(res.suggestion.startsWith("_")).toBe(true);

			const err = captureInvalidPath(() => validateRelativePath(`folder/${name}`));
			expect(err.details?.reasons).toContain("reserved-name");
			expect(typeof err.details?.suggestion).toBe("string");
		}

		// Non-reserved names starting with reserved prefixes must pass
		expect(validatePathSegment("CON123").valid).toBe(true);
		expect(validatePathSegment("CONSOLE.txt").valid).toBe(true);
	});

	it("rejects invalid characters including control chars and backslashes without silent rewriting", () => {
		const badChars = [":", "*", "?", '"', "<", ">", "|", "\\", "/", "\u{0000}", "\n", "\u{001F}"];
		for (const char of badChars) {
			const seg = `file${char}name`;
			const res = validatePathSegment(seg);
			expect(res.valid).toBe(false);
			expect(res.reasons).toContain("invalid-chars");
			expect(res.invalidChars).toContain(char);
			expect(res.suggestion).toBe("file_name");
		}

		const backslashErr = captureInvalidPath(() =>
			validateRelativePath(String.raw`a\b\c.txt`),
		);
		expect(backslashErr.details?.reasons).toEqual(["invalid-chars"]);
		expect(backslashErr.details?.invalidChars).toEqual(["\\"]);
		expect(backslashErr.details?.suggestion).toBe("a/b/c.txt");

		const multiErr = captureInvalidPath(() => validateRelativePath("dir/bad:name?.txt"));
		expect(multiErr.details?.reasons).toEqual(["invalid-chars"]);
		expect(multiErr.details?.invalidChars).toEqual([":", "?"]);
		expect(multiErr.details?.suggestion).toBe("bad_name_.txt");
	});

	it("rejects trailing dots and spaces", () => {
		for (const seg of ["file.", "file ", "file. .", "CON."]) {
			const res = validatePathSegment(seg);
			expect(res.valid).toBe(false);
			expect(res.reasons).toContain("trailing-dot-or-space");
		}

		expect(sanitizePathSegment("report. ").suggestion).toBe("report");
		expect(sanitizePathSegment("CON.").suggestion).toBe("_CON");
		expect(sanitizePathSegment("...").suggestion).toBe("_");

		const err = captureInvalidPath(() => validateRelativePath("dir./file.txt"));
		expect(err.details?.reasons).toContain("trailing-dot-or-space");
	});

	it("rejects path traversal and empty segments in both validateRelativePath and normalizeRelativePath", () => {
		for (const badPath of ["", ".", "..", "a/../b", "./a", "a//b", "a/./b", "/../a"]) {
			const err = captureInvalidPath(() => normalizeRelativePath(badPath));
			expect(
				(err.details?.reasons as string[]).some((r) => r === "traversal" || r === "empty"),
			).toBe(true);
		}

		// normalizeRelativePath only trims leading/trailing slashes on valid paths
		expect(normalizeRelativePath("/logs/2026/app.json/")).toBe("logs/2026/app.json");
	});

	it("enforces configurable maxSegmentLength, warnRelativePathLength, and maxRelativePathLength", () => {
		expect(DEFAULT_MAX_SEGMENT_LENGTH).toBe(200);
		expect(DEFAULT_WARN_RELATIVE_PATH_LENGTH).toBe(180);
		expect(DEFAULT_MAX_RELATIVE_PATH_LENGTH).toBe(220);

		const seg200 = "a".repeat(200);
		const seg201 = "a".repeat(201);
		expect(validateRelativePath(seg200)).toBe(seg200);
		expect(captureInvalidPath(() => validateRelativePath(seg201)).details?.reasons).toContain(
			"too-long",
		);

		// Custom maxSegmentLength truncates suggestion safely
		const shortRes = sanitizePathSegment("CON1234567890", { maxSegmentLength: 5 });
		expect(shortRes.valid).toBe(false);
		expect(shortRes.reasons).toContain("too-long");
		expect(shortRes.suggestion.length).toBeLessThanOrEqual(5);

		// warnRelativePathLength triggers onWarn only when exceeded
		const onWarn = vi.fn();
		const at180 = `${"a".repeat(90)}/${"b".repeat(89)}`;
		expect(at180.length).toBe(180);
		validateRelativePath(at180, { onWarn });
		expect(onWarn).not.toHaveBeenCalled();

		const at181 = `${"a".repeat(90)}/${"b".repeat(90)}`;
		expect(at181.length).toBe(181);
		validateRelativePath(at181, { onWarn });
		expect(onWarn).toHaveBeenCalledWith({
			path: at181,
			length: 181,
			threshold: 180,
		});

		// maxRelativePathLength default 220 vs Infinity
		const path221 = `${"a".repeat(110)}/${"b".repeat(110)}`;
		expect(path221.length).toBe(221);
		expect(captureInvalidPath(() => validateRelativePath(path221)).details?.reasons).toContain(
			"too-long",
		);
		expect(validateRelativePath(path221, { maxRelativePathLength: Infinity })).toBe(path221);
	});
});

describe("path-template: PathTemplate build, parse, and overlap checks", () => {
	it("builds and round-trip parses case-sensitive templates", () => {
		const tpl = createPathTemplate("logs/{year}/{month}/report.json");
		expect(tpl.pattern).toBe("logs/{year}/{month}/report.json");
		expect(tpl.paramNames).toEqual(["year", "month"]);

		const built = tpl.build({ year: "2026", month: "11" });
		expect(built).toBe("logs/2026/11/report.json");
		expect(tpl.matches(built)).toBe(true);
		expect(tpl.parse(built)).toEqual({ year: "2026", month: "11" });

		// Case-sensitive matching
		expect(tpl.matches("LOGS/2026/11/report.json")).toBe(false);
		expect(tpl.parse("logs/2026/11/REPORT.JSON")).toBeNull();
		expect(tpl.parse("/logs/2026/11/report.json")).toBeNull();
	});

	it("supports multi-param delimited segments and rejects delimiter injection", () => {
		const tpl = createPathTemplate("batches/{date}__{location}.json");
		const built = tpl.build({ date: "2026-11-15", location: "plant-a" });
		expect(built).toBe("batches/2026-11-15__plant-a.json");
		expect(tpl.parse(built)).toEqual({ date: "2026-11-15", location: "plant-a" });

		// Delimiter injection on build throws INVALID_PATH
		const err = captureInvalidPath(() =>
			tpl.build({ date: "2026__extra", location: "plant-a" }),
		);
		expect(err.details?.invalidChars).toContain("__");

		// Trailing literal delimiter injection in parsed path is rejected
		expect(tpl.parse("batches/2026__plant-a.json.json")).toBeNull();
	});

	it("rejects invalid template configurations with INVALID_CONFIG", () => {
		const badPatterns = [
			"",
			"/",
			String.raw`logs\{id}.json`,
			"logs//{id}.json",
			"logs/../{id}.json",
			"logs/{a}{b}.json",
			"logs/{a}/{a}.json",
			"logs/{unclosed.json",
			"logs/{}.json",
			"logs/bad:char/{id}.json",
		];

		for (const pattern of badPatterns) {
			expect(() => createPathTemplate(pattern)).toThrowError(/./);
			try {
				createPathTemplate(pattern);
			} catch (error) {
				expect(isFsError(error) && error.code === "INVALID_CONFIG").toBe(true);
			}
		}

		expect(() =>
			createPathTemplate("logs/{id}.json", {
				paramPatterns: { id: "[invalid(" },
			}),
		).toThrowError();
	});

	it("enforces paramPatterns on both build and parse", () => {
		const tpl = createPathTemplate("logs/{date}/{id}.json", {
			paramPatterns: {
				date: /\d{4}-\d{2}-\d{2}/,
				id: "[a-z0-9-]+",
			},
		});

		const valid = tpl.build({ date: "2026-11-15", id: "run-42" });
		expect(valid).toBe("logs/2026-11-15/run-42.json");
		expect(tpl.parse(valid)).toEqual({ date: "2026-11-15", id: "run-42" });

		captureInvalidPath(() => tpl.build({ date: "not-a-date", id: "run-42" }));
		captureInvalidPath(() => tpl.build({ date: "2026-11-15", id: "UPPER" }));
		expect(tpl.parse("logs/2026-11-15/UPPER.json")).toBeNull();
		expect(tpl.parse("logs/20261115/run-42.json")).toBeNull();

		// Capturing groups inside paramPatterns must not shift subsequent param captures
		const multiWithGroup = createPathTemplate("logs/{kind}__{env}.json", {
			paramPatterns: {
				kind: /(audit|error)/,
				env: /(prod|dev)/,
			},
		});
		const builtMulti = multiWithGroup.build({ kind: "audit", env: "prod" });
		expect(builtMulti).toBe("logs/audit__prod.json");
		expect(multiWithGroup.parse(builtMulti)).toEqual({ kind: "audit", env: "prod" });
	});

	it("strips outer ^ and $ anchors in paramPatterns and rejects disallowed RegExp flags", () => {
		const anchored = createPathTemplate("report-{year}.json", {
			paramPatterns: { year: /^\d{4}$/ },
		});
		const built = anchored.build({ year: "2026" });
		expect(built).toBe("report-2026.json");
		expect(anchored.parse(built)).toEqual({ year: "2026" });
		expect(anchored.parse("report-20265.json")).toBeNull();
		expect(anchored.parse("report-26.json")).toBeNull();
		captureInvalidPath(() => anchored.build({ year: "26" }));

		for (const pattern of [/\d{4}/g, /\d{4}/y, /\d{4}/i, /\d{4}/m, /\d{4}/u, /\d{4}/v, /\d{4}/s, /[a-z]+/gi]) {
			try {
				createPathTemplate("report-{year}.json", {
					paramPatterns: { year: pattern },
				});
				throw new Error(`Expected INVALID_CONFIG for flags "${pattern.flags}"`);
			} catch (error) {
				expect(isFsError(error) && error.code === "INVALID_CONFIG").toBe(true);
			}
		}
	});

	it("detects overlapping templates and allows disjoint templates", () => {
		const a = createPathTemplate("logs/{id}.json");
		const b = createPathTemplate("logs/latest.json");
		const c = createPathTemplate("logs/{name}.json");
		const d = createPathTemplate("reports/{id}.json");
		const e = createPathTemplate("logs/{id}.csv");

		expect(() => assertNonOverlappingTemplates([a, d, e])).not.toThrow();

		// Multi-char paramPatterns: overlapping 4-digit patterns vs disjoint date pattern
		const yearTpl = createPathTemplate("logs/{year}.json", {
			paramPatterns: { year: /\d{4}/ },
		});
		const codeTpl = createPathTemplate("logs/{code}.json", {
			paramPatterns: { code: /[0-9]{4}/ },
		});
		const dateTpl = createPathTemplate("logs/{date}.json", {
			paramPatterns: { date: /\d{4}-\d{2}-\d{2}/ },
		});

		expect(() => assertNonOverlappingTemplates([yearTpl, dateTpl])).not.toThrow();

		for (const pair of [
			[a, b],
			[a, c],
			[yearTpl, codeTpl],
		]) {
			try {
				assertNonOverlappingTemplates(pair);
				throw new Error("Expected overlap error");
			} catch (error) {
				expect(isFsError(error) && error.code === "INVALID_CONFIG").toBe(true);
			}
		}
	});
});

describe("path-template: isIgnoredPath", () => {
	it("unconditionally ignores systemDir, OS metadata files, Office lock files, and custom rules", () => {
		expect(isIgnoredPath("_cs-fs/backups/doc.json.123.1.bak")).toBe(true);
		expect(isIgnoredPath("/_cs-fs/state.json")).toBe(true);
		expect(isIgnoredPath(".custom-sys/meta.json", ".custom-sys")).toBe(true);
		expect(isIgnoredPath("_cs-fs/meta.json", ".custom-sys")).toBe(false);

		expect(isIgnoredPath("Thumbs.db")).toBe(true);
		expect(isIgnoredPath("sub/thumbs.db")).toBe(true);
		expect(isIgnoredPath("sub/desktop.ini")).toBe(true);
		expect(isIgnoredPath(".DS_Store")).toBe(true);
		expect(isIgnoredPath("docs/~$report.docx")).toBe(true);

		const custom = ["drafts/*", /\.tmp$/, (p: string) => p.includes("secret")];
		expect(isIgnoredPath("drafts/v1.json", undefined, custom)).toBe(true);
		expect(isIgnoredPath("data/cache.tmp", undefined, custom)).toBe(true);
		expect(isIgnoredPath("keys/secret-token.json", undefined, custom)).toBe(true);
		expect(isIgnoredPath("data/valid.json", undefined, custom)).toBe(false);
	});
});
