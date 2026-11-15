import { FsError } from "./errors.ts";

export const DEFAULT_MAX_SEGMENT_LENGTH = 200;
export const DEFAULT_WARN_RELATIVE_PATH_LENGTH = 180;
export const DEFAULT_MAX_RELATIVE_PATH_LENGTH = 220;
export const DEFAULT_SYSTEM_DIR = "_cs-fs";

export type PathValidationReason =
	| "empty"
	| "traversal"
	| "invalid-chars"
	| "trailing-dot-or-space"
	| "reserved-name"
	| "too-long";

export interface PathLengthWarning {
	path: string;
	length: number;
	threshold: number;
}

export interface PathValidationOptions {
	maxSegmentLength?: number;
	warnRelativePathLength?: number;
	maxRelativePathLength?: number;
	onWarn?: (warning: PathLengthWarning) => void;
}

export interface PathValidationResult {
	valid: boolean;
	reasons: PathValidationReason[];
	invalidChars: string[];
	suggestion: string;
}

const INVALID_SEGMENT_CHARS = new Set([":", "*", "?", '"', "<", ">", "|", "\\", "/"]);

const WINDOWS_RESERVED_NAMES = new Set([
	"CON",
	"PRN",
	"AUX",
	"NUL",
	"COM1",
	"COM2",
	"COM3",
	"COM4",
	"COM5",
	"COM6",
	"COM7",
	"COM8",
	"COM9",
	"LPT1",
	"LPT2",
	"LPT3",
	"LPT4",
	"LPT5",
	"LPT6",
	"LPT7",
	"LPT8",
	"LPT9",
]);

function isControlChar(char: string): boolean {
	const code = char.codePointAt(0);
	return code !== undefined && code >= 0x00 && code <= 0x1f;
}

function isWindowsReservedName(segment: string): boolean {
	const dotIndex = segment.indexOf(".");
	const baseName = dotIndex === -1 ? segment : segment.slice(0, dotIndex);
	return WINDOWS_RESERVED_NAMES.has(baseName.toUpperCase());
}

function collectInvalidChars(segment: string): string[] {
	const found: string[] = [];
	const seen = new Set<string>();
	for (const char of segment) {
		if (!INVALID_SEGMENT_CHARS.has(char) && !isControlChar(char)) continue;
		if (seen.has(char)) continue;
		seen.add(char);
		found.push(char);
	}
	return found;
}

function buildSegmentSuggestion(segment: string, maxSegmentLength: number): string {
	let cleaned = "";
	for (const char of segment) {
		cleaned += INVALID_SEGMENT_CHARS.has(char) || isControlChar(char) ? "_" : char;
	}

	while (cleaned.endsWith(".") || cleaned.endsWith(" ")) {
		cleaned = cleaned.slice(0, -1);
	}

	if (cleaned.length === 0 || cleaned === "." || cleaned === "..") {
		cleaned = "_";
	}

	if (isWindowsReservedName(cleaned)) {
		cleaned = `_${cleaned}`;
	}

	if (Number.isFinite(maxSegmentLength) && cleaned.length > maxSegmentLength) {
		cleaned = cleaned.slice(0, Math.max(1, maxSegmentLength));
		while (cleaned.endsWith(".") || cleaned.endsWith(" ")) {
			cleaned = cleaned.slice(0, -1);
		}
		if (cleaned.length === 0 || cleaned === "." || cleaned === "..") {
			cleaned = "_";
		}
		if (isWindowsReservedName(cleaned)) {
			const prefixed = `_${cleaned}`;
			cleaned =
				prefixed.length > maxSegmentLength ? prefixed.slice(0, maxSegmentLength) : prefixed;
		}
	}

	return cleaned;
}

export function validatePathSegment(
	segment: string,
	options?: PathValidationOptions,
): PathValidationResult {
	const maxSegmentLength = options?.maxSegmentLength ?? DEFAULT_MAX_SEGMENT_LENGTH;
	const reasons: PathValidationReason[] = [];
	const invalidChars = collectInvalidChars(segment);

	if (segment.length === 0) {
		reasons.push("empty");
	}
	if (segment === "." || segment === "..") {
		reasons.push("traversal");
	}
	if (invalidChars.length > 0) {
		reasons.push("invalid-chars");
	}
	if (segment.length > 0 && (segment.endsWith(".") || segment.endsWith(" "))) {
		reasons.push("trailing-dot-or-space");
	}
	if (segment.length > 0 && isWindowsReservedName(segment)) {
		reasons.push("reserved-name");
	}
	if (Number.isFinite(maxSegmentLength) && segment.length > maxSegmentLength) {
		reasons.push("too-long");
	}

	const suggestion = buildSegmentSuggestion(segment, maxSegmentLength);

	return {
		valid: reasons.length === 0,
		reasons,
		invalidChars,
		suggestion,
	};
}

export function sanitizePathSegment(
	segment: string,
	options?: PathValidationOptions,
): PathValidationResult {
	return validatePathSegment(segment, options);
}

function trimSlashes(value: string): string {
	let trimmed = value;
	while (trimmed.startsWith("/")) {
		trimmed = trimmed.slice(1);
	}
	while (trimmed.endsWith("/")) {
		trimmed = trimmed.slice(0, -1);
	}
	return trimmed;
}

export function normalizeRelativePath(
	relativePath: string,
	options?: PathValidationOptions,
): string {
	return validateRelativePath(trimSlashes(relativePath), options);
}

export function validateRelativePath(
	relativePath: string,
	options?: PathValidationOptions,
): string {
	if (relativePath.length === 0) {
		throw new FsError("INVALID_PATH", "Relative path must not be empty.", {
			details: {
				segment: "",
				path: relativePath,
				reasons: ["empty"],
				invalidChars: [],
				suggestion: "_",
			},
		});
	}

	if (relativePath.includes("\\")) {
		const invalidChars = collectInvalidChars(relativePath);
		throw new FsError("INVALID_PATH", `Invalid path "${relativePath}": contains backslashes.`, {
			details: {
				segment: relativePath,
				path: relativePath,
				reasons: ["invalid-chars"],
				invalidChars,
				suggestion: relativePath.replaceAll("\\", "/"),
			},
		});
	}

	const maxRelativePathLength = options?.maxRelativePathLength ?? DEFAULT_MAX_RELATIVE_PATH_LENGTH;
	const warnRelativePathLength =
		options?.warnRelativePathLength ?? DEFAULT_WARN_RELATIVE_PATH_LENGTH;

	const segments = relativePath.split("/");
	for (const segment of segments) {
		const result = validatePathSegment(segment, options);
		if (!result.valid) {
			throw new FsError(
				"INVALID_PATH",
				`Invalid path segment "${segment}" in "${relativePath}": ${result.reasons.join(", ")}.`,
				{
					details: {
						segment,
						path: relativePath,
						reasons: result.reasons,
						invalidChars: result.invalidChars,
						suggestion: result.suggestion,
					},
				},
			);
		}
	}

	if (Number.isFinite(maxRelativePathLength) && relativePath.length > maxRelativePathLength) {
		throw new FsError(
			"INVALID_PATH",
			`Relative path "${relativePath}" exceeds max length (${relativePath.length} > ${maxRelativePathLength}).`,
			{
				details: {
					segment: segments.at(-1) ?? "",
					path: relativePath,
					reasons: ["too-long"],
					invalidChars: [],
					suggestion: relativePath.slice(0, maxRelativePathLength),
				},
			},
		);
	}

	if (
		Number.isFinite(warnRelativePathLength) &&
		relativePath.length > warnRelativePathLength &&
		options?.onWarn
	) {
		options.onWarn({
			path: relativePath,
			length: relativePath.length,
			threshold: warnRelativePathLength,
		});
	}

	return relativePath;
}

export interface PathTemplateOptions {
	paramPatterns?: Record<string, RegExp | string>;
	pathOptions?: PathValidationOptions;
}

type SegmentPart =
	| { kind: "literal"; value: string }
	| { kind: "param"; name: string; pattern?: RegExp; forbiddenSubstrings: string[] };

interface CompiledSegment {
	raw: string;
	parts: SegmentPart[];
	regex: RegExp;
	paramNames: string[];
}

export interface PathTemplate {
	readonly pattern: string;
	readonly paramNames: readonly string[];
	/** @internal */
	readonly _segments: readonly CompiledSegment[];
	build(params: Record<string, string>): string;
	parse(relativePath: string): Record<string, string> | null;
	matches(relativePath: string): boolean;
}

function escapeRegExp(literal: string): string {
	return literal.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

function compileParamRegex(name: string, rawPattern: RegExp | string): RegExp {
	const source = typeof rawPattern === "string" ? rawPattern : rawPattern.source;
	try {
		return new RegExp(`^(?:${source})$`);
	} catch (error) {
		throw new FsError("INVALID_CONFIG", `Invalid paramPattern for "{${name}}": ${source}`, {
			cause: error,
			details: { param: name, pattern: source },
		});
	}
}

function parseSegmentTemplate(
	segmentPattern: string,
	seenParams: Set<string>,
	paramPatterns?: Record<string, RegExp | string>,
): CompiledSegment {
	if (segmentPattern.length === 0) {
		throw new FsError("INVALID_CONFIG", "Path template must not contain empty segments.");
	}
	if (segmentPattern === "." || segmentPattern === "..") {
		throw new FsError(
			"INVALID_CONFIG",
			`Path template must not contain traversal segment "${segmentPattern}".`,
		);
	}

	const parts: SegmentPart[] = [];
	const paramNames: string[] = [];
	let index = 0;

	while (index < segmentPattern.length) {
		const openIndex = segmentPattern.indexOf("{", index);
		if (openIndex === -1) {
			const literal = segmentPattern.slice(index);
			const invalid = collectInvalidChars(literal);
			if (invalid.length > 0) {
				throw new FsError(
					"INVALID_CONFIG",
					`Path template literal "${literal}" contains invalid characters.`,
					{ details: { segment: segmentPattern, invalidChars: invalid } },
				);
			}
			parts.push({ kind: "literal", value: literal });
			break;
		}

		if (openIndex > index) {
			const literal = segmentPattern.slice(index, openIndex);
			const invalid = collectInvalidChars(literal);
			if (invalid.length > 0) {
				throw new FsError(
					"INVALID_CONFIG",
					`Path template literal "${literal}" contains invalid characters.`,
					{ details: { segment: segmentPattern, invalidChars: invalid } },
				);
			}
			parts.push({ kind: "literal", value: literal });
		}

		const closeIndex = segmentPattern.indexOf("}", openIndex + 1);
		if (closeIndex === -1) {
			throw new FsError(
				"INVALID_CONFIG",
				`Unclosed "{" in path template segment "${segmentPattern}".`,
			);
		}

		const paramName = segmentPattern.slice(openIndex + 1, closeIndex);
		if (paramName.length === 0 || paramName.includes("{")) {
			throw new FsError(
				"INVALID_CONFIG",
				`Invalid parameter placeholder in segment "${segmentPattern}".`,
			);
		}
		if (seenParams.has(paramName)) {
			throw new FsError(
				"INVALID_CONFIG",
				`Duplicate parameter "{${paramName}}" in path template.`,
			);
		}

		// Adjacent {a}{b} without an explicit literal delimiter is ambiguous on parse.
		const prevPart = parts.at(-1);
		if (prevPart?.kind === "param") {
			throw new FsError(
				"INVALID_CONFIG",
				`Adjacent parameters "{${prevPart.name}}{${paramName}}" in "${segmentPattern}" require an explicit literal delimiter.`,
			);
		}

		seenParams.add(paramName);
		paramNames.push(paramName);

		const rawPattern = paramPatterns?.[paramName];
		const compiledPattern =
			rawPattern === undefined ? undefined : compileParamRegex(paramName, rawPattern);

		parts.push({
			kind: "param",
			name: paramName,
			pattern: compiledPattern,
			forbiddenSubstrings: [],
		});

		index = closeIndex + 1;
	}

	// Record adjacent literal delimiters so unpatterned params reject delimiter injection.
	for (let i = 0; i < parts.length; i++) {
		const part = parts[i];
		if (part?.kind !== "param") continue;
		const nextPart = parts[i + 1];
		if (nextPart?.kind === "literal") {
			part.forbiddenSubstrings.push(nextPart.value);
		}
	}

	let regexSource = "^";
	let paramGroupIndex = 0;
	for (const part of parts) {
		if (part.kind === "literal") {
			regexSource += escapeRegExp(part.value);
		} else if (part.pattern) {
			const inner = part.pattern.source.slice(4, -2);
			regexSource += `(?<p${paramGroupIndex}>${inner})`;
			paramGroupIndex += 1;
		} else {
			regexSource += `(?<p${paramGroupIndex}>.+?)`;
			paramGroupIndex += 1;
		}
	}
	regexSource += "$";

	return {
		raw: segmentPattern,
		parts,
		regex: new RegExp(regexSource),
		paramNames,
	};
}

function parseSegmentParams(
	compiled: CompiledSegment,
	actual: string,
	result: Record<string, string>,
): boolean {
	const match = compiled.regex.exec(actual);
	if (!match) {
		return false;
	}

	let paramGroupIndex = 0;
	for (const part of compiled.parts) {
		if (part.kind !== "param") continue;
		const captured = match.groups?.[`p${paramGroupIndex}`];
		paramGroupIndex += 1;
		if (captured === undefined || captured.length === 0) {
			return false;
		}
		if (!part.pattern) {
			for (const delim of part.forbiddenSubstrings) {
				if (captured.includes(delim)) {
					return false;
				}
			}
		}
		result[part.name] = captured;
	}
	return true;
}

export function createPathTemplate(pattern: string, options?: PathTemplateOptions): PathTemplate {
	if (pattern.length === 0 || pattern.includes("\\")) {
		throw new FsError("INVALID_CONFIG", `Invalid path template pattern "${pattern}".`);
	}

	const normalizedPattern = trimSlashes(pattern);
	if (normalizedPattern.length === 0) {
		throw new FsError("INVALID_CONFIG", "Path template pattern must not be empty.");
	}

	const rawSegments = normalizedPattern.split("/");
	const seenParams = new Set<string>();
	const compiledSegments = rawSegments.map((seg) =>
		parseSegmentTemplate(seg, seenParams, options?.paramPatterns),
	);
	const allParamNames = [...seenParams];

	function buildSegment(
		segment: CompiledSegment,
		params: Record<string, string>,
	): string {
		let builtSegment = "";
		for (const part of segment.parts) {
			if (part.kind === "literal") {
				builtSegment += part.value;
				continue;
			}

			const value = params[part.name];
			if (value === undefined || value.length === 0) {
				throw new FsError(
					"INVALID_PATH",
					`Missing or empty parameter "${part.name}" for template "${normalizedPattern}".`,
					{
						details: {
							param: part.name,
							path: normalizedPattern,
							reasons: ["empty"],
							invalidChars: [],
							suggestion: "_",
						},
					},
				);
			}

			const invalidChars = collectInvalidChars(value);
			if (invalidChars.length > 0) {
				throw new FsError(
					"INVALID_PATH",
					`Parameter "${part.name}" contains invalid path characters.`,
					{
						details: {
							param: part.name,
							segment: value,
							path: normalizedPattern,
							reasons: ["invalid-chars"],
							invalidChars,
							suggestion: buildSegmentSuggestion(
								value,
								options?.pathOptions?.maxSegmentLength ??
									DEFAULT_MAX_SEGMENT_LENGTH,
							),
						},
					},
				);
			}

			if (part.pattern) {
				if (!part.pattern.test(value)) {
					throw new FsError(
						"INVALID_PATH",
						`Parameter "${part.name}" value "${value}" does not match required pattern.`,
						{
							details: {
								param: part.name,
								segment: value,
								path: normalizedPattern,
								reasons: ["invalid-chars"],
								invalidChars: [],
								suggestion: value,
							},
						},
					);
				}
			} else {
				for (const delim of part.forbiddenSubstrings) {
					if (value.includes(delim)) {
						throw new FsError(
							"INVALID_PATH",
							`Parameter "${part.name}" value "${value}" contains reserved delimiter "${delim}".`,
							{
								details: {
									param: part.name,
									segment: value,
									path: normalizedPattern,
									reasons: ["invalid-chars"],
									invalidChars: [delim],
									suggestion: value.replaceAll(delim, "_"),
								},
							},
						);
					}
				}
			}

			builtSegment += value;
		}
		return builtSegment;
	}

	function build(params: Record<string, string>): string {
		const builtSegments = compiledSegments.map((segment) => buildSegment(segment, params));
		const fullPath = builtSegments.join("/");
		return validateRelativePath(fullPath, options?.pathOptions);
	}

	function parse(relativePath: string): Record<string, string> | null {
		if (relativePath.length === 0 || relativePath.includes("\\")) {
			return null;
		}
		if (relativePath.startsWith("/") || relativePath.endsWith("/")) {
			return null;
		}

		const segments = relativePath.split("/");
		if (segments.length !== compiledSegments.length) {
			return null;
		}

		const result: Record<string, string> = {};
		for (const [index, compiled] of compiledSegments.entries()) {
			const actual = segments[index];
			if (actual === undefined || !parseSegmentParams(compiled, actual, result)) {
				return null;
			}
		}

		return result;
	}

	function matches(relativePath: string): boolean {
		return parse(relativePath) !== null;
	}

	return {
		pattern: normalizedPattern,
		paramNames: allParamNames,
		build,
		parse,
		matches,
		_segments: compiledSegments,
	};
}

function segmentsCanOverlap(a: CompiledSegment, b: CompiledSegment): boolean {
	const aIsStatic = a.paramNames.length === 0;
	const bIsStatic = b.paramNames.length === 0;

	if (aIsStatic && bIsStatic) {
		return a.raw === b.raw;
	}
	if (aIsStatic) {
		return b.regex.test(a.raw);
	}
	if (bIsStatic) {
		return a.regex.test(b.raw);
	}

	// Both segments have parameters: check fixed literal prefix/suffix compatibility first.
	const aFirst = a.parts[0];
	const bFirst = b.parts[0];
	if (aFirst?.kind === "literal" && bFirst?.kind === "literal") {
		const minLen = Math.min(aFirst.value.length, bFirst.value.length);
		if (aFirst.value.slice(0, minLen) !== bFirst.value.slice(0, minLen)) {
			return false;
		}
	}

	const aLast = a.parts.at(-1);
	const bLast = b.parts.at(-1);
	if (aLast?.kind === "literal" && bLast?.kind === "literal") {
		const minLen = Math.min(aLast.value.length, bLast.value.length);
		if (aLast.value.slice(-minLen) !== bLast.value.slice(-minLen)) {
			return false;
		}
	}

	// Synthesize representative strings of varying lengths/formats and test against both regexes.
	const sampleFrom = (seg: CompiledSegment, fill: string): string =>
		seg.parts
			.map((p) => {
				if (p.kind === "literal") return p.value;
				return fill;
			})
			.join("");

	const sampleFills = [
		"x",
		"xx",
		"xxxx",
		"1",
		"11",
		"111",
		"1111",
		"2026-01-01",
		"2026-01-01T00:00:00Z",
		"aa-bb",
	];

	for (const fill of sampleFills) {
		const sampleA = sampleFrom(a, fill);
		const sampleB = sampleFrom(b, fill);
		if (
			(a.regex.test(sampleA) && b.regex.test(sampleA)) ||
			(a.regex.test(sampleB) && b.regex.test(sampleB))
		) {
			return true;
		}
	}

	return false;
}

function templatesOverlap(a: PathTemplate, b: PathTemplate): boolean {
	if (a._segments.length !== b._segments.length) {
		return false;
	}
	for (const [index, segA] of a._segments.entries()) {
		const segB = b._segments[index];
		if (!segB || !segmentsCanOverlap(segA, segB)) {
			return false;
		}
	}
	return true;
}

export function assertNonOverlappingTemplates(templates: readonly PathTemplate[]): void {
	for (const [i, a] of templates.entries()) {
		const rest = templates.slice(i + 1);
		for (const b of rest) {
			if (templatesOverlap(a, b)) {
				throw new FsError(
					"INVALID_CONFIG",
					`Overlapping path templates detected: "${a.pattern}" and "${b.pattern}".`,
					{ details: { templates: [a.pattern, b.pattern] } },
				);
			}
		}
	}
}

export type PathIgnoreRule = string | RegExp | ((relativePath: string) => boolean);

const ALWAYS_IGNORED_FILENAMES = new Set(["thumbs.db", "desktop.ini", ".ds_store"]);

export function isIgnoredPath(
	relativePath: string,
	systemDir = DEFAULT_SYSTEM_DIR,
	customIgnore?: readonly PathIgnoreRule[],
): boolean {
	let normalized = relativePath;
	while (normalized.startsWith("/")) {
		normalized = normalized.slice(1);
	}
	if (normalized.length === 0) {
		return false;
	}

	const segments = normalized.split("/");
	if (segments[0] === systemDir) {
		return true;
	}

	for (const segment of segments) {
		if (ALWAYS_IGNORED_FILENAMES.has(segment.toLowerCase())) {
			return true;
		}
		if (segment.startsWith("~$")) {
			return true;
		}
	}

	if (!customIgnore || customIgnore.length === 0) {
		return false;
	}

	const fileName = segments.at(-1) ?? "";
	for (const rule of customIgnore) {
		if (typeof rule === "string") {
			if (rule.endsWith("/*")) {
				const prefix = rule.slice(0, -1);
				if (normalized.startsWith(prefix)) return true;
			} else if (normalized === rule || fileName === rule || segments.includes(rule)) {
				return true;
			}
		} else if (rule instanceof RegExp) {
			if (rule.test(normalized)) return true;
		} else if (rule(normalized)) {
			return true;
		}
	}

	return false;
}
