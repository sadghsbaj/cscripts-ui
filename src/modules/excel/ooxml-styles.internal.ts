import type { BorderEdgeSpec, ExcelStyleSpec } from "./types.ts";
import {
	applyXmlSlicePatches,
	escapeXmlAttr,
	expandSelfClosingTag,
	findXmlChild,
	findXmlChildren,
	getXmlAttr,
	getXmlPrefix,
	parseXmlTree,
	upsertXmlAttribute,
	type XmlElement,
	type XmlSlicePatch,
} from "./ooxml-xml.internal.ts";

const HTTP_SCHEME = ["http", "://"].join("");
const SPREADSHEET_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main`;

export const INDEXED_COLOR_PALETTE: readonly string[] = [
	"#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
	"#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
	"#800000", "#008000", "#000080", "#808000", "#800080", "#008080", "#C0C0C0", "#808080",
	"#9999FF", "#993366", "#FFFFCC", "#CCFFFF", "#660066", "#FF8080", "#0066CC", "#CCCCFF",
	"#000080", "#FF00FF", "#FFFF00", "#00FFFF", "#800080", "#800000", "#008080", "#0000FF",
	"#00CCFF", "#CCFFFF", "#CCFFCC", "#FFFF99", "#99CCFF", "#FF99CC", "#CC99FF", "#FFCC99",
	"#3366FF", "#33CCCC", "#99CC00", "#FFCC00", "#FF9900", "#FF6600", "#666699", "#969696",
	"#003366", "#339966", "#003300", "#333300", "#993300", "#993366", "#333399", "#333333",
];

// Office theme color slots in Excel `theme="0..11"` index order (note lt1/dk1 & lt2/dk2 swap vs XML order).
export const DEFAULT_THEME_COLORS: readonly string[] = [
	"#FFFFFF", // 0: lt1
	"#000000", // 1: dk1
	"#E7E6E6", // 2: lt2
	"#44546A", // 3: dk2
	"#4472C4", // 4: accent1
	"#ED7D31", // 5: accent2
	"#A5A5A5", // 6: accent3
	"#FFC000", // 7: accent4
	"#5B9BD5", // 8: accent5
	"#70AD47", // 9: accent6
	"#0563C1", // 10: hlink
	"#954F72", // 11: folHlink
];

const THEME_SLOT_INDEX: Readonly<Record<string, number>> = {
	lt1: 0,
	dk1: 1,
	lt2: 2,
	dk2: 3,
	accent1: 4,
	accent2: 5,
	accent3: 6,
	accent4: 7,
	accent5: 8,
	accent6: 9,
	hlink: 10,
	folHlink: 11,
};

const BUILTIN_NUMFMT_CODE_BY_ID: Readonly<Record<number, string>> = {
	0: "General",
	1: "0",
	2: "0.00",
	3: "#,##0",
	4: "#,##0.00",
	9: "0%",
	10: "0.00%",
	11: "0.00E+00",
	12: "# ?/?",
	13: "# ??/??",
	14: "mm-dd-yy",
	15: "d-mmm-yy",
	16: "d-mmm",
	17: "mmm-yy",
	18: "h:mm AM/PM",
	19: "h:mm:ss AM/PM",
	20: "h:mm",
	21: "h:mm:ss",
	22: "m/d/yy h:mm",
	37: "#,##0 ;(#,##0)",
	38: "#,##0 ;[Red](#,##0)",
	39: "#,##0.00;(#,##0.00)",
	40: "#,##0.00;[Red](#,##0.00)",
	45: "mm:ss",
	46: "[h]:mm:ss",
	47: "mmss.0",
	48: "##0.0E+0",
	49: "@",
};

const BUILTIN_NUMFMT_ID_BY_CODE: Readonly<Record<string, number>> = (() => {
	const map: Record<string, number> = Object.create(null) as Record<string, number>;
	for (const [idStr, code] of Object.entries(BUILTIN_NUMFMT_CODE_BY_ID)) {
		map[code] = Number(idStr);
	}
	return map;
})();

const BUILTIN_DATE_NUMFMT_IDS = new Set<number>([
	14, 15, 16, 17, 18, 19, 20, 21, 22,
	27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
	45, 46, 47,
	50, 51, 52, 53, 54, 55, 56, 57, 58,
]);

const BORDER_STYLES = new Set<BorderEdgeSpec["style"]>([
	"thin",
	"medium",
	"thick",
	"dashed",
	"dotted",
	"double",
]);

const ALIGN_HORIZONTALS = new Set(["left", "center", "right", "justify"]);
const ALIGN_VERTICALS = new Set(["top", "center", "bottom"]);
const ELAPSED_DATE_BRACKET_RE = /^(?:hh?|mm?|ss?)$/i;

export interface ParsedStyles {
	cellXfs: ExcelStyleSpec[];
	numFmtIds: number[];
	isDateByXf: boolean[];
	numFmts: Map<number, string>;
}

export function normalizeHexColor(input: string | undefined): string | undefined {
	if (!input) {
		return undefined;
	}
	const trimmed = input.trim().replace(/^#/, "").toUpperCase();
	if (/^[0-9A-F]{3}$/.test(trimmed)) {
		const [r, g, b] = trimmed;
		return `#${r ?? ""}${r ?? ""}${g ?? ""}${g ?? ""}${b ?? ""}${b ?? ""}`;
	}
	if (/^[0-9A-F]{6}$/.test(trimmed)) {
		return `#${trimmed}`;
	}
	if (/^[0-9A-F]{8}$/.test(trimmed)) {
		if (trimmed === "00000000") {
			return undefined;
		}
		return `#${trimmed.slice(2)}`;
	}
	return undefined;
}

function toOoxmlArgb(hexColor: string): string {
	const normalized = normalizeHexColor(hexColor);
	return normalized ? `FF${normalized.slice(1)}` : "FF000000";
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	if (max === min) {
		return [0, 0, l];
	}
	const d = max - min;
	const s = d / (l > 0.5 ? 2 - max - min : max + min);
	let h: number;
	if (max === r) {
		h = (g - b) / d + (g < b ? 6 : 0);
	} else if (max === g) {
		h = (b - r) / d + 2;
	} else {
		h = (r - g) / d + 4;
	}
	return [h / 6, s, l];
}

function hueToRgb(p: number, q: number, tInput: number): number {
	let t = tInput;
	if (t < 0) {
		t += 1;
	}
	if (t > 1) {
		t -= 1;
	}
	if (t < 1 / 6) {
		return p + (q - p) * 6 * t;
	}
	if (t < 1 / 2) {
		return q;
	}
	if (t < 2 / 3) {
		return p + (q - p) * (2 / 3 - t) * 6;
	}
	return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
	if (s === 0) {
		return [l, l, l];
	}
	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;
	return [
		hueToRgb(p, q, h + 1 / 3),
		hueToRgb(p, q, h),
		hueToRgb(p, q, h - 1 / 3),
	];
}

export function applyColorTint(hexRgb: string, tint: number): string {
	const normalized = normalizeHexColor(hexRgb);
	if (!normalized || !Number.isFinite(tint) || tint === 0) {
		return normalized ?? hexRgb;
	}
	const r = Number.parseInt(normalized.slice(1, 3), 16) / 255;
	const g = Number.parseInt(normalized.slice(3, 5), 16) / 255;
	const b = Number.parseInt(normalized.slice(5, 7), 16) / 255;
	const [h, s, l] = rgbToHsl(r, g, b);

	const clampedTint = Math.max(-1, Math.min(1, tint));
	const nextL =
		clampedTint < 0 ? l * (1 + clampedTint) : l * (1 - clampedTint) + clampedTint;
	const [nr, ng, nb] = hslToRgb(h, s, Math.max(0, Math.min(1, nextL)));

	const toHex = (channel: number): string =>
		Math.round(Math.max(0, Math.min(255, channel * 255)))
			.toString(16)
			.padStart(2, "0")
			.toUpperCase();

	return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}

export function parseThemeColorsXml(themeXml: string): string[] {
	const colors = [...DEFAULT_THEME_COLORS];
	const root = parseXmlTree(themeXml);
	if (!root) {
		return colors;
	}

	const stack: XmlElement[] = [root];
	let clrScheme: XmlElement | undefined;
	while (stack.length > 0) {
		const node = stack.pop();
		if (!node) {
			continue;
		}
		if (node.localName === "clrScheme") {
			clrScheme = node;
			break;
		}
		for (let i = node.children.length - 1; i >= 0; i -= 1) {
			const child = node.children[i];
			if (child) {
				stack.push(child);
			}
		}
	}

	if (!clrScheme) {
		return colors;
	}

	for (const slot of clrScheme.children) {
		const slotIndex = THEME_SLOT_INDEX[slot.localName];
		if (slotIndex === undefined) {
			continue;
		}
		const srgb = findXmlChild(slot, "srgbClr");
		if (srgb) {
			const hex = normalizeHexColor(getXmlAttr(srgb.attrs, "val"));
			if (hex) {
				colors[slotIndex] = hex;
			}
			continue;
		}
		const sysClr = findXmlChild(slot, "sysClr");
		if (sysClr) {
			const lastClr = normalizeHexColor(getXmlAttr(sysClr.attrs, "lastClr"));
			if (lastClr) {
				colors[slotIndex] = lastClr;
				continue;
			}
			const val = getXmlAttr(sysClr.attrs, "val");
			if (val === "windowText") {
				colors[slotIndex] = "#000000";
			} else if (val === "window") {
				colors[slotIndex] = "#FFFFFF";
			}
		}
	}

	return colors;
}

function parseSafeIntAttr(value: string | undefined): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	const parsed = Number(trimmed);
	return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseFiniteFloatAttr(value: string | undefined): number | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return undefined;
	}
	const parsed = Number(trimmed);
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function resolveOoxmlColor(
	attrs: Readonly<Record<string, string>>,
	themeColors: readonly string[] = DEFAULT_THEME_COLORS,
	indexedColors: readonly string[] = INDEXED_COLOR_PALETTE,
): string | undefined {
	let baseColor: string | undefined;

	const rgb = getXmlAttr(attrs, "rgb");
	if (rgb) {
		baseColor = normalizeHexColor(rgb);
	}

	if (!baseColor) {
		const themeIdx = parseSafeIntAttr(getXmlAttr(attrs, "theme"));
		if (themeIdx !== undefined && themeIdx >= 0 && themeIdx < themeColors.length) {
			baseColor = themeColors[themeIdx];
		}
	}

	if (!baseColor) {
		const indexed = parseSafeIntAttr(getXmlAttr(attrs, "indexed"));
		if (indexed !== undefined && indexed >= 0 && indexed < indexedColors.length) {
			baseColor = indexedColors[indexed];
		}
	}

	if (!baseColor) {
		return undefined;
	}

	const tint = parseFiniteFloatAttr(getXmlAttr(attrs, "tint"));
	if (tint !== undefined && tint !== 0) {
		return applyColorTint(baseColor, tint);
	}

	return baseColor;
}

export function getBuiltinNumFmtCode(numFmtId: number): string | undefined {
	return BUILTIN_NUMFMT_CODE_BY_ID[numFmtId];
}

function stripNonDateFormatTokens(pattern: string): string {
	let out = "";
	let inQuotes = false;
	let i = 0;

	while (i < pattern.length) {
		const ch = pattern[i];
		if (!inQuotes && ch === "\\" && i + 1 < pattern.length) {
			i += 2;
			continue;
		}
		if (ch === '"') {
			inQuotes = !inQuotes;
			i += 1;
			continue;
		}
		if (!inQuotes && ch === "[") {
			const closeIdx = pattern.indexOf("]", i + 1);
			if (closeIdx !== -1) {
				const tag = pattern.slice(i + 1, closeIdx);
				if (ELAPSED_DATE_BRACKET_RE.test(tag)) {
					out += `[${tag}]`;
				}
				i = closeIdx + 1;
				continue;
			}
		}
		if (!inQuotes && (ch === "_" || ch === "*") && i + 1 < pattern.length) {
			i += 2;
			continue;
		}
		if (!inQuotes) {
			out += ch ?? "";
		}
		i += 1;
	}

	return out;
}

export function isDateNumFmt(numFmtId: number, formatCode?: string): boolean {
	if (BUILTIN_DATE_NUMFMT_IDS.has(numFmtId)) {
		return true;
	}
	const code = formatCode ?? BUILTIN_NUMFMT_CODE_BY_ID[numFmtId];
	if (!code || code === "General" || code === "@") {
		return false;
	}

	const strippedAll = stripNonDateFormatTokens(code);
	const stripped = strippedAll.split(";", 1)[0] ?? strippedAll;
	if (
		stripped.includes("#") ||
		stripped.includes("%") ||
		stripped.includes("?") ||
		/e[+-]/i.test(stripped)
	) {
		return false;
	}
	return /[ydhs]|mmm+|am\/pm|a\/p|\[(?:hh?|mm?|ss?)\]/i.test(stripped);
}

function isXmlFlagTrue(el: XmlElement | undefined): boolean {
	if (!el) {
		return false;
	}
	const val = getXmlAttr(el.attrs, "val");
	return val === undefined || val === "1" || val.toLowerCase() === "true";
}

function parseBorderEdge(
	edgeEl: XmlElement | undefined,
	themeColors: readonly string[],
	indexedColors: readonly string[],
): BorderEdgeSpec | undefined {
	if (!edgeEl) {
		return undefined;
	}
	const style = getXmlAttr(edgeEl.attrs, "style");
	if (!style || !BORDER_STYLES.has(style as BorderEdgeSpec["style"])) {
		return undefined;
	}
	const colorEl = findXmlChild(edgeEl, "color");
	const fg = colorEl ? resolveOoxmlColor(colorEl.attrs, themeColors, indexedColors) : undefined;
	return fg ? { style: style as BorderEdgeSpec["style"], fg } : { style: style as BorderEdgeSpec["style"] };
}

interface ParsedFontEntry {
	font?: ExcelStyleSpec["font"];
	fg?: string;
}

function parseFontElement(
	fontEl: XmlElement,
	themeColors: readonly string[],
	indexedColors: readonly string[],
): ParsedFontEntry {
	const familyEl = findXmlChild(fontEl, "name") ?? findXmlChild(fontEl, "rFont");
	const sizeEl = findXmlChild(fontEl, "sz");
	const boldEl = findXmlChild(fontEl, "b");
	const italicEl = findXmlChild(fontEl, "i");
	const underlineEl = findXmlChild(fontEl, "u");
	const strikeEl = findXmlChild(fontEl, "strike");
	const colorEl = findXmlChild(fontEl, "color");

	const family = familyEl ? getXmlAttr(familyEl.attrs, "val") : undefined;
	const size = parseFiniteFloatAttr(sizeEl ? getXmlAttr(sizeEl.attrs, "val") : undefined);
	const bold = isXmlFlagTrue(boldEl) ? true : undefined;
	const italic = isXmlFlagTrue(italicEl) ? true : undefined;
	const underlineVal = underlineEl ? getXmlAttr(underlineEl.attrs, "val") : undefined;
	const underline =
		underlineEl && underlineVal !== "none" ? true : undefined;
	const strike = isXmlFlagTrue(strikeEl) ? true : undefined;
	const fg = colorEl ? resolveOoxmlColor(colorEl.attrs, themeColors, indexedColors) : undefined;

	const font: NonNullable<ExcelStyleSpec["font"]> = {};
	if (family !== undefined) {
		font.family = family;
	}
	if (size !== undefined) {
		font.size = size;
	}
	if (bold) {
		font.bold = true;
	}
	if (italic) {
		font.italic = true;
	}
	if (underline) {
		font.underline = true;
	}
	if (strike) {
		font.strike = true;
	}

	return {
		font: Object.keys(font).length > 0 ? font : undefined,
		fg,
	};
}

function parseFillElement(
	fillEl: XmlElement,
	themeColors: readonly string[],
	indexedColors: readonly string[],
): string | undefined {
	const patternFill = findXmlChild(fillEl, "patternFill");
	if (!patternFill) {
		return undefined;
	}
	const patternType = getXmlAttr(patternFill.attrs, "patternType");
	if (patternType !== "solid") {
		return undefined;
	}
	const fgColor = findXmlChild(patternFill, "fgColor");
	if (fgColor) {
		const resolved = resolveOoxmlColor(fgColor.attrs, themeColors, indexedColors);
		if (resolved) {
			return resolved;
		}
	}
	const bgColor = findXmlChild(patternFill, "bgColor");
	return bgColor ? resolveOoxmlColor(bgColor.attrs, themeColors, indexedColors) : undefined;
}

function parseBorderElement(
	borderEl: XmlElement,
	themeColors: readonly string[],
	indexedColors: readonly string[],
): ExcelStyleSpec["border"] | undefined {
	const top = parseBorderEdge(findXmlChild(borderEl, "top"), themeColors, indexedColors);
	const right = parseBorderEdge(findXmlChild(borderEl, "right"), themeColors, indexedColors);
	const bottom = parseBorderEdge(findXmlChild(borderEl, "bottom"), themeColors, indexedColors);
	const left = parseBorderEdge(findXmlChild(borderEl, "left"), themeColors, indexedColors);
	if (!top && !right && !bottom && !left) {
		return undefined;
	}
	const border: NonNullable<ExcelStyleSpec["border"]> = {};
	if (top) {
		border.top = top;
	}
	if (right) {
		border.right = right;
	}
	if (bottom) {
		border.bottom = bottom;
	}
	if (left) {
		border.left = left;
	}
	return border;
}

function parseAlignmentElement(alignEl: XmlElement | undefined): ExcelStyleSpec["align"] | undefined {
	if (!alignEl) {
		return undefined;
	}
	const horizontal = getXmlAttr(alignEl.attrs, "horizontal");
	const vertical = getXmlAttr(alignEl.attrs, "vertical");
	const wrapTextAttr = getXmlAttr(alignEl.attrs, "wrapText");
	const indentAttr = getXmlAttr(alignEl.attrs, "indent");

	const align: NonNullable<ExcelStyleSpec["align"]> = {};
	if (horizontal && ALIGN_HORIZONTALS.has(horizontal)) {
		align.horizontal = horizontal as NonNullable<ExcelStyleSpec["align"]>["horizontal"];
	}
	if (vertical && ALIGN_VERTICALS.has(vertical)) {
		align.vertical = vertical as NonNullable<ExcelStyleSpec["align"]>["vertical"];
	}
	if (wrapTextAttr === "1" || wrapTextAttr?.toLowerCase() === "true") {
		align.wrapText = true;
	}
	const indent = parseSafeIntAttr(indentAttr);
	if (indent !== undefined && indent > 0) {
		align.indent = indent;
	}
	return Object.keys(align).length > 0 ? align : undefined;
}

function resolveIndexedColorsOverride(root: XmlElement): readonly string[] {
	const colorsEl = findXmlChild(root, "colors");
	const indexedEl = colorsEl ? findXmlChild(colorsEl, "indexedColors") : undefined;
	if (!indexedEl) {
		return INDEXED_COLOR_PALETTE;
	}
	const custom: string[] = [...INDEXED_COLOR_PALETTE];
	const entries = findXmlChildren(indexedEl, "rgbColor");
	for (const [idx, entry] of entries.entries()) {
		const hex = normalizeHexColor(getXmlAttr(entry.attrs, "rgb"));
		if (hex) {
			custom[idx] = hex;
		}
	}
	return custom;
}

export function parseStylesXml(
	stylesXml: string,
	themeColors: readonly string[] = DEFAULT_THEME_COLORS,
): ParsedStyles {
	const root = parseXmlTree(stylesXml);
	if (!root) {
		return {
			cellXfs: [{}],
			numFmtIds: [0],
			isDateByXf: [false],
			numFmts: new Map(),
		};
	}

	const indexedColors = resolveIndexedColorsOverride(root);
	const numFmts = new Map<number, string>();
	const numFmtsEl = findXmlChild(root, "numFmts");
	if (numFmtsEl) {
		for (const el of findXmlChildren(numFmtsEl, "numFmt")) {
			const id = parseSafeIntAttr(getXmlAttr(el.attrs, "numFmtId"));
			const code = getXmlAttr(el.attrs, "formatCode");
			if (id !== undefined && code !== undefined) {
				numFmts.set(id, code);
			}
		}
	}

	const fontsEl = findXmlChild(root, "fonts");
	const fonts: ParsedFontEntry[] = fontsEl
		? findXmlChildren(fontsEl, "font").map((el) => parseFontElement(el, themeColors, indexedColors))
		: [];

	const fillsEl = findXmlChild(root, "fills");
	const fills: Array<string | undefined> = fillsEl
		? findXmlChildren(fillsEl, "fill").map((el) => parseFillElement(el, themeColors, indexedColors))
		: [];

	const bordersEl = findXmlChild(root, "borders");
	const borders: Array<ExcelStyleSpec["border"] | undefined> = bordersEl
		? findXmlChildren(bordersEl, "border").map((el) =>
				parseBorderElement(el, themeColors, indexedColors),
			)
		: [];

	const cellXfsEl = findXmlChild(root, "cellXfs");
	const xfElements = cellXfsEl ? findXmlChildren(cellXfsEl, "xf") : [];

	const cellXfs: ExcelStyleSpec[] = [];
	const numFmtIds: number[] = [];
	const isDateByXf: boolean[] = [];

	for (const xf of xfElements) {
		const numFmtId = parseSafeIntAttr(getXmlAttr(xf.attrs, "numFmtId")) ?? 0;
		const fontId = parseSafeIntAttr(getXmlAttr(xf.attrs, "fontId")) ?? 0;
		const fillId = parseSafeIntAttr(getXmlAttr(xf.attrs, "fillId")) ?? 0;
		const borderId = parseSafeIntAttr(getXmlAttr(xf.attrs, "borderId")) ?? 0;

		const applyNumberFormat = getXmlAttr(xf.attrs, "applyNumberFormat");
		const applyFont = getXmlAttr(xf.attrs, "applyFont");
		const applyFill = getXmlAttr(xf.attrs, "applyFill");
		const applyBorder = getXmlAttr(xf.attrs, "applyBorder");
		const applyAlignment = getXmlAttr(xf.attrs, "applyAlignment");

		const spec: ExcelStyleSpec = {};
		if ((fontId > 0 || applyFont === "1") && applyFont !== "0") {
			const parsedFont = fonts[fontId];
			if (parsedFont?.font) {
				spec.font = parsedFont.font;
			}
			if (parsedFont?.fg) {
				spec.fg = parsedFont.fg;
			}
		}
		if ((fillId > 1 || applyFill === "1") && applyFill !== "0") {
			const bg = fills[fillId];
			if (bg) {
				spec.bg = bg;
			}
		}
		if ((borderId > 0 || applyBorder === "1") && applyBorder !== "0") {
			const border = borders[borderId];
			if (border) {
				spec.border = border;
			}
		}
		if (applyAlignment !== "0") {
			const align = parseAlignmentElement(findXmlChild(xf, "alignment"));
			if (align) {
				spec.align = align;
			}
		}

		const fmtCode = numFmts.get(numFmtId) ?? BUILTIN_NUMFMT_CODE_BY_ID[numFmtId];
		if ((numFmtId > 0 || applyNumberFormat === "1") && applyNumberFormat !== "0" && fmtCode) {
			spec.numFmt = fmtCode;
		}

		cellXfs.push(spec);
		numFmtIds.push(numFmtId);
		isDateByXf.push(isDateNumFmt(numFmtId, fmtCode));
	}

	if (cellXfs.length === 0) {
		cellXfs.push({});
		numFmtIds.push(0);
		isDateByXf.push(false);
	}

	return { cellXfs, numFmtIds, isDateByXf, numFmts };
}

interface NormalizedBorderEdge {
	style: BorderEdgeSpec["style"];
	fg?: string;
}

interface NormalizedStyle {
	fg?: string;
	bg?: string;
	font?: {
		family?: string;
		size?: number;
		bold?: boolean;
		italic?: boolean;
		underline?: boolean;
		strike?: boolean;
	};
	border?: {
		top?: NormalizedBorderEdge;
		right?: NormalizedBorderEdge;
		bottom?: NormalizedBorderEdge;
		left?: NormalizedBorderEdge;
	};
	align?: {
		horizontal?: "left" | "center" | "right" | "justify";
		vertical?: "top" | "center" | "bottom";
		wrapText?: boolean;
		indent?: number;
	};
	numFmt?: string;
}

function normalizeEdge(edge: BorderEdgeSpec | undefined): NormalizedBorderEdge | undefined {
	if (!edge) {
		return undefined;
	}
	const fg = normalizeHexColor(edge.fg);
	return fg ? { style: edge.style, fg } : { style: edge.style };
}

function normalizeStyleSpec(style: ExcelStyleSpec | undefined): NormalizedStyle {
	if (!style) {
		return {};
	}
	const out: NormalizedStyle = {};
	const fg = normalizeHexColor(style.fg);
	if (fg) {
		out.fg = fg;
	}
	const bg = normalizeHexColor(style.bg);
	if (bg) {
		out.bg = bg;
	}
	if (style.font) {
		const font: NonNullable<NormalizedStyle["font"]> = {};
		if (style.font.family) {
			font.family = style.font.family;
		}
		if (style.font.size !== undefined && Number.isFinite(style.font.size)) {
			font.size = style.font.size;
		}
		if (style.font.bold) {
			font.bold = true;
		}
		if (style.font.italic) {
			font.italic = true;
		}
		if (style.font.underline) {
			font.underline = true;
		}
		if (style.font.strike) {
			font.strike = true;
		}
		if (Object.keys(font).length > 0) {
			out.font = font;
		}
	}
	if (style.border) {
		const top = normalizeEdge(style.border.top);
		const right = normalizeEdge(style.border.right);
		const bottom = normalizeEdge(style.border.bottom);
		const left = normalizeEdge(style.border.left);
		if (top || right || bottom || left) {
			out.border = { top, right, bottom, left };
		}
	}
	if (style.align) {
		const align: NonNullable<NormalizedStyle["align"]> = {};
		if (style.align.horizontal) {
			align.horizontal = style.align.horizontal;
		}
		if (style.align.vertical) {
			align.vertical = style.align.vertical;
		}
		if (style.align.wrapText) {
			align.wrapText = true;
		}
		if (style.align.indent !== undefined && style.align.indent > 0) {
			align.indent = Math.trunc(style.align.indent);
		}
		if (Object.keys(align).length > 0) {
			out.align = align;
		}
	}
	if (style.numFmt && style.numFmt !== "General") {
		out.numFmt = style.numFmt;
	}
	return out;
}

function edgeKey(edge: NormalizedBorderEdge | undefined): string {
	return edge ? `${edge.style}:${edge.fg ?? ""}` : "";
}

function fontKey(font: NormalizedStyle["font"], fg: string | undefined): string {
	const family = font?.family?.trim() || "Calibri";
	const size =
		font?.size !== undefined && Number.isFinite(font.size) ? String(font.size) : "11";
	return [
		family,
		size,
		font?.bold ? "1" : "0",
		font?.italic ? "1" : "0",
		font?.underline ? "1" : "0",
		font?.strike ? "1" : "0",
		fg ?? "",
	].join("|");
}

function borderKey(border: NormalizedStyle["border"]): string {
	if (!border) {
		return "";
	}
	return [
		edgeKey(border.left),
		edgeKey(border.right),
		edgeKey(border.top),
		edgeKey(border.bottom),
	].join("|");
}

function alignKey(align: NormalizedStyle["align"]): string {
	if (!align) {
		return "";
	}
	return [
		align.horizontal ?? "",
		align.vertical ?? "",
		align.wrapText ? "1" : "0",
		align.indent ?? 0,
	].join("|");
}

function styleKey(norm: NormalizedStyle): string {
	return [
		fontKey(norm.font, norm.fg),
		norm.bg ?? "",
		borderKey(norm.border),
		alignKey(norm.align),
		norm.numFmt ?? "",
	].join("::");
}

function serializeFontXml(
	font: NormalizedStyle["font"],
	fg: string | undefined,
	prefix = "",
): string {
	const parts: string[] = [`<${prefix}font>`];
	if (font?.bold) {
		parts.push(`<${prefix}b/>`);
	}
	if (font?.italic) {
		parts.push(`<${prefix}i/>`);
	}
	if (font?.strike) {
		parts.push(`<${prefix}strike/>`);
	}
	if (font?.underline) {
		parts.push(`<${prefix}u/>`);
	}
	parts.push(`<${prefix}sz val="${font?.size ?? 11}"/>`);
	if (fg) {
		parts.push(`<${prefix}color rgb="${toOoxmlArgb(fg)}"/>`);
	}
	parts.push(
		`<${prefix}name val="${escapeXmlAttr(font?.family ?? "Calibri")}"/>`,
		`</${prefix}font>`,
	);
	return parts.join("");
}

function serializeFillXml(bg: string, prefix = ""): string {
	return `<${prefix}fill><${prefix}patternFill patternType="solid"><${prefix}fgColor rgb="${toOoxmlArgb(bg)}"/></${prefix}patternFill></${prefix}fill>`;
}

function serializeBorderSideXml(
	side: string,
	edge: NormalizedBorderEdge | undefined,
	prefix = "",
): string {
	if (!edge) {
		return `<${prefix}${side}/>`;
	}
	if (edge.fg) {
		return `<${prefix}${side} style="${edge.style}"><${prefix}color rgb="${toOoxmlArgb(edge.fg)}"/></${prefix}${side}>`;
	}
	return `<${prefix}${side} style="${edge.style}"/>`;
}

function serializeBorderXml(
	border: NonNullable<NormalizedStyle["border"]>,
	prefix = "",
): string {
	return (
		`<${prefix}border>` +
		serializeBorderSideXml("left", border.left, prefix) +
		serializeBorderSideXml("right", border.right, prefix) +
		serializeBorderSideXml("top", border.top, prefix) +
		serializeBorderSideXml("bottom", border.bottom, prefix) +
		`<${prefix}diagonal/>` +
		`</${prefix}border>`
	);
}

function serializeAlignmentXml(
	align: NonNullable<NormalizedStyle["align"]>,
	prefix = "",
): string {
	const attrs: string[] = [];
	if (align.horizontal) {
		attrs.push(`horizontal="${align.horizontal}"`);
	}
	if (align.vertical) {
		attrs.push(`vertical="${align.vertical}"`);
	}
	if (align.wrapText) {
		attrs.push('wrapText="1"');
	}
	if (align.indent !== undefined && align.indent > 0) {
		attrs.push(`indent="${align.indent}"`);
	}
	return `<${prefix}alignment ${attrs.join(" ")}/>`;
}

function serializeXfXml(
	entry: {
		numFmtId: number;
		fontId: number;
		fillId: number;
		borderId: number;
		align?: NormalizedStyle["align"];
	},
	prefix = "",
): string {
	const attrs: string[] = [
		`numFmtId="${entry.numFmtId}"`,
		`fontId="${entry.fontId}"`,
		`fillId="${entry.fillId}"`,
		`borderId="${entry.borderId}"`,
		'xfId="0"',
	];
	if (entry.numFmtId > 0) {
		attrs.push('applyNumberFormat="1"');
	}
	if (entry.fontId > 0) {
		attrs.push('applyFont="1"');
	}
	if (entry.fillId > 1) {
		attrs.push('applyFill="1"');
	}
	if (entry.borderId > 0) {
		attrs.push('applyBorder="1"');
	}
	if (entry.align) {
		attrs.push('applyAlignment="1"');
		return `<${prefix}xf ${attrs.join(" ")}>${serializeAlignmentXml(entry.align, prefix)}</${prefix}xf>`;
	}
	return `<${prefix}xf ${attrs.join(" ")}/>`;
}

export class StyleRegistry {
	private readonly customNumFmts: Array<{ id: number; code: string }> = [];
	private readonly customNumFmtIds = new Map<string, number>();
	private nextCustomNumFmtId = 164;

	private readonly fonts: string[] = ['<font><sz val="11"/><name val="Calibri"/></font>'];
	private readonly fontMap = new Map<string, number>([[fontKey(undefined, undefined), 0]]);

	// Reserve fillId="0" (none) and fillId="1" (gray125) per ECMA-376 §18.8.20.
	private readonly fills: string[] = [
		'<fill><patternFill patternType="none"/></fill>',
		'<fill><patternFill patternType="gray125"/></fill>',
	];
	private readonly fillMap = new Map<string, number>();

	// Reserve borderId="0" (empty border) per ECMA-376.
	private readonly borders: string[] = [
		"<border><left/><right/><top/><bottom/><diagonal/></border>",
	];
	private readonly borderMap = new Map<string, number>([["", 0]]);

	private readonly cellXfs: string[] = [
		'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
	];
	private readonly xfMap = new Map<string, number>([[styleKey({}), 0]]);

	register(style?: ExcelStyleSpec): number {
		return this.insertStyle(style, true);
	}

	registerPreservingIndex(style?: ExcelStyleSpec): number {
		return this.insertStyle(style, false);
	}

	private insertStyle(style: ExcelStyleSpec | undefined, deduplicate: boolean): number {
		const norm = normalizeStyleSpec(style);
		const key = styleKey(norm);
		if (deduplicate) {
			const existing = this.xfMap.get(key);
			if (existing !== undefined) {
				return existing;
			}
		}

		let numFmtId = 0;
		if (norm.numFmt) {
			const builtinId = BUILTIN_NUMFMT_ID_BY_CODE[norm.numFmt];
			if (builtinId !== undefined) {
				numFmtId = builtinId;
			} else {
				const existingCustom = this.customNumFmtIds.get(norm.numFmt);
				if (existingCustom !== undefined) {
					numFmtId = existingCustom;
				} else {
					numFmtId = this.nextCustomNumFmtId;
					this.nextCustomNumFmtId += 1;
					this.customNumFmtIds.set(norm.numFmt, numFmtId);
					this.customNumFmts.push({ id: numFmtId, code: norm.numFmt });
				}
			}
		}

		let fontId = 0;
		if (norm.font || norm.fg) {
			const fKey = fontKey(norm.font, norm.fg);
			const existingFont = this.fontMap.get(fKey);
			if (existingFont !== undefined) {
				fontId = existingFont;
			} else {
				fontId = this.fonts.length;
				this.fonts.push(serializeFontXml(norm.font, norm.fg));
				this.fontMap.set(fKey, fontId);
			}
		}

		let fillId = 0;
		if (norm.bg) {
			const existingFill = this.fillMap.get(norm.bg);
			if (existingFill !== undefined) {
				fillId = existingFill;
			} else {
				fillId = this.fills.length;
				this.fills.push(serializeFillXml(norm.bg));
				this.fillMap.set(norm.bg, fillId);
			}
		}

		let borderId = 0;
		if (norm.border) {
			const bKey = borderKey(norm.border);
			const existingBorder = this.borderMap.get(bKey);
			if (existingBorder !== undefined) {
				borderId = existingBorder;
			} else {
				borderId = this.borders.length;
				this.borders.push(serializeBorderXml(norm.border));
				this.borderMap.set(bKey, borderId);
			}
		}

		const xfIndex = this.cellXfs.length;
		this.cellXfs.push(
			serializeXfXml({
				numFmtId,
				fontId,
				fillId,
				borderId,
				align: norm.align,
			}),
		);
		if (!this.xfMap.has(key)) {
			this.xfMap.set(key, xfIndex);
		}
		return xfIndex;
	}

	getStyleCount(): number {
		return this.cellXfs.length;
	}

	toXml(): string {
		const parts: string[] = [
			'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
			`<styleSheet xmlns="${SPREADSHEET_NS}">`,
		];

		if (this.customNumFmts.length > 0) {
			parts.push(`<numFmts count="${this.customNumFmts.length}">`);
			for (const nf of this.customNumFmts) {
				parts.push(`<numFmt numFmtId="${nf.id}" formatCode="${escapeXmlAttr(nf.code)}"/>`);
			}
			parts.push("</numFmts>");
		}

		parts.push(
			`<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>`,
			`<fills count="${this.fills.length}">${this.fills.join("")}</fills>`,
			`<borders count="${this.borders.length}">${this.borders.join("")}</borders>`,
			'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
			`<cellXfs count="${this.cellXfs.length}">${this.cellXfs.join("")}</cellXfs>`,
			'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
			'<dxfs count="0"/>',
			'<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>',
			"</styleSheet>",
		);
		return parts.join("");
	}
}

export function createStyleRegistry(): StyleRegistry {
	return new StyleRegistry();
}

function buildSectionPatch(
	stylesXml: string,
	sectionEl: XmlElement,
	newCount: number,
	appendedXml: string,
	patches: XmlSlicePatch[],
): void {
	if (appendedXml.length === 0) {
		return;
	}
	const openTag = stylesXml.slice(sectionEl.openStart, sectionEl.openEnd);
	const updatedOpenTag = upsertXmlAttribute(openTag, "count", String(newCount));
	if (sectionEl.selfClosing) {
		patches.push({
			start: sectionEl.openStart,
			end: sectionEl.openEnd,
			replacement: expandSelfClosingTag(updatedOpenTag, appendedXml),
		});
		return;
	}
	if (updatedOpenTag !== openTag) {
		patches.push({
			start: sectionEl.openStart,
			end: sectionEl.openEnd,
			replacement: updatedOpenTag,
		});
	}
	patches.push({
		start: sectionEl.closeStart,
		end: sectionEl.closeStart,
		replacement: appendedXml,
	});
}

const MODELED_XF_ATTRS = new Set([
	"numFmtId",
	"fontId",
	"fillId",
	"borderId",
	"xfId",
	"applyNumberFormat",
	"applyFont",
	"applyFill",
	"applyBorder",
	"applyAlignment",
]);
const MODELED_ALIGN_ATTRS = new Set(["horizontal", "vertical", "wrapText", "indent"]);
const MODELED_FONT_CHILDREN = new Set(["b", "i", "u", "strike", "sz", "color", "name", "rFont"]);
const MODELED_BORDER_CHILDREN = new Set(["left", "right", "top", "bottom", "diagonal"]);

function isLosslesslyModeledXf(
	xfEl: XmlElement,
	fontEls: readonly XmlElement[],
	fillEls: readonly XmlElement[],
	borderEls: readonly XmlElement[],
): boolean {
	for (const attrName of Object.keys(xfEl.attrs)) {
		if (!MODELED_XF_ATTRS.has(attrName)) {
			return false;
		}
	}
	const xfId = getXmlAttr(xfEl.attrs, "xfId");
	if (xfId !== undefined && xfId !== "0") {
		return false;
	}

	for (const child of xfEl.children) {
		if (child.localName !== "alignment") {
			return false;
		}
		for (const attrName of Object.keys(child.attrs)) {
			if (!MODELED_ALIGN_ATTRS.has(attrName)) {
				return false;
			}
		}
		const h = getXmlAttr(child.attrs, "horizontal");
		if (h !== undefined && !ALIGN_HORIZONTALS.has(h)) {
			return false;
		}
		const v = getXmlAttr(child.attrs, "vertical");
		if (v !== undefined && !ALIGN_VERTICALS.has(v)) {
			return false;
		}
	}

	const fontId = parseSafeIntAttr(getXmlAttr(xfEl.attrs, "fontId")) ?? 0;
	const fontEl = fontEls[fontId];
	if (fontEl) {
		for (const child of fontEl.children) {
			if (!MODELED_FONT_CHILDREN.has(child.localName)) {
				return false;
			}
			if (child.localName === "u") {
				const uVal = getXmlAttr(child.attrs, "val");
				if (uVal !== undefined && uVal !== "single" && uVal !== "none") {
					return false;
				}
			}
		}
		if (fontId === 0) {
			// Guard against non-Calibri default font[0] being falsely treated as default Calibri 11.
			if (
				findXmlChild(fontEl, "b") ||
				findXmlChild(fontEl, "i") ||
				findXmlChild(fontEl, "u") ||
				findXmlChild(fontEl, "strike") ||
				findXmlChild(fontEl, "color")
			) {
				return false;
			}
			const nameEl = findXmlChild(fontEl, "name") ?? findXmlChild(fontEl, "rFont");
			const nameVal = nameEl ? getXmlAttr(nameEl.attrs, "val") : undefined;
			if (nameVal !== undefined && nameVal !== "Calibri") {
				return false;
			}
			const szEl = findXmlChild(fontEl, "sz");
			const szVal = szEl ? getXmlAttr(szEl.attrs, "val") : undefined;
			if (szVal !== undefined && szVal !== "11") {
				return false;
			}
		}
	}

	const fillId = parseSafeIntAttr(getXmlAttr(xfEl.attrs, "fillId")) ?? 0;
	const fillEl = fillEls[fillId];
	if (fillEl) {
		const [patternFill] = fillEl.children;
		if (fillEl.children.length !== 1 || patternFill?.localName !== "patternFill") {
			return false;
		}
		const patternType = getXmlAttr(patternFill.attrs, "patternType");
		if (patternType !== "none" && patternType !== "gray125" && patternType !== "solid") {
			return false;
		}
		if (patternType === "solid") {
			for (const child of patternFill.children) {
				if (child.localName === "fgColor") {
					continue;
				}
				if (
					child.localName === "bgColor" &&
					Object.keys(child.attrs).length === 1 &&
					getXmlAttr(child.attrs, "indexed") === "64"
				) {
					continue;
				}
				return false;
			}
		} else if (patternFill.children.length > 0) {
			return false;
		}
	}

	const borderId = parseSafeIntAttr(getXmlAttr(xfEl.attrs, "borderId")) ?? 0;
	const borderEl = borderEls[borderId];
	if (borderEl) {
		if (Object.keys(borderEl.attrs).length > 0) {
			return false;
		}
		for (const child of borderEl.children) {
			if (!MODELED_BORDER_CHILDREN.has(child.localName)) {
				return false;
			}
			if (child.localName === "diagonal") {
				if (Object.keys(child.attrs).length > 0 || child.children.length > 0) {
					return false;
				}
				continue;
			}
			const style = getXmlAttr(child.attrs, "style");
			if (style !== undefined && !BORDER_STYLES.has(style as BorderEdgeSpec["style"])) {
				return false;
			}
		}
	}

	return true;
}

export function appendStylesToStylesXml(
	stylesXml: string,
	styles: readonly ExcelStyleSpec[],
	options?: { themeColors?: readonly string[] },
): { xml: string; styleIndices: number[] } {
	if (styles.length === 0) {
		return { xml: stylesXml, styleIndices: [] };
	}

	const root = parseXmlTree(stylesXml);
	if (!root) {
		const registry = new StyleRegistry();
		const styleIndices = styles.map((style) => registry.register(style));
		return { xml: registry.toXml(), styleIndices };
	}

	const parsed = parseStylesXml(stylesXml, options?.themeColors);
	const numFmtsEl = findXmlChild(root, "numFmts");
	const fontsEl = findXmlChild(root, "fonts");
	const fillsEl = findXmlChild(root, "fills");
	const bordersEl = findXmlChild(root, "borders");
	const cellXfsEl = findXmlChild(root, "cellXfs");
	const xfEls = cellXfsEl ? findXmlChildren(cellXfsEl, "xf") : [];
	const baseXfCount = xfEls.length;

	if (!fontsEl || !fillsEl || !bordersEl || !cellXfsEl) {
		const registry = new StyleRegistry();
		if (baseXfCount > 0) {
			for (const existingSpec of parsed.cellXfs.slice(1)) {
				registry.registerPreservingIndex(existingSpec);
			}
		}
		const styleIndices = styles.map((style) => registry.register(style));
		return { xml: registry.toXml(), styleIndices };
	}

	const fontEls = findXmlChildren(fontsEl, "font");
	const fillEls = findXmlChildren(fillsEl, "fill");
	const borderEls = findXmlChildren(bordersEl, "border");
	const addedXfKeyToIndex = new Map<string, number>();
	for (const [idx, existingSpec] of parsed.cellXfs.entries()) {
		const xfEl = xfEls[idx];
		if (!xfEl || !isLosslesslyModeledXf(xfEl, fontEls, fillEls, borderEls)) {
			continue;
		}
		const norm = normalizeStyleSpec(existingSpec);
		const key = styleKey(norm);
		if (!addedXfKeyToIndex.has(key)) {
			addedXfKeyToIndex.set(key, idx);
		}
	}

	const existingNumFmtCount = numFmtsEl ? findXmlChildren(numFmtsEl, "numFmt").length : 0;
	let maxNumFmtId = 163;
	const customNumFmtCodeToId = new Map<string, number>();
	for (const [id, code] of parsed.numFmts.entries()) {
		if (id > maxNumFmtId) {
			maxNumFmtId = id;
		}
		if (!customNumFmtCodeToId.has(code)) {
			customNumFmtCodeToId.set(code, id);
		}
	}

	const prefix = getXmlPrefix(root.rawName);
	const baseFontCount = findXmlChildren(fontsEl, "font").length;
	const baseFillCount = findXmlChildren(fillsEl, "fill").length;
	const baseBorderCount = findXmlChildren(bordersEl, "border").length;

	const addedNumFmts: string[] = [];
	const addedFonts: string[] = [];
	const addedFills: string[] = [];
	const addedBorders: string[] = [];
	const addedXfs: string[] = [];

	const addedFontMap = new Map<string, number>();
	const addedFillMap = new Map<string, number>();
	const addedBorderMap = new Map<string, number>();

	if (baseFontCount === 0) {
		addedFonts.push(
			`<${prefix}font><${prefix}sz val="11"/><${prefix}name val="Calibri"/></${prefix}font>`,
		);
		addedFontMap.set(fontKey(undefined, undefined), 0);
	}
	if (baseFillCount === 0) {
		addedFills.push(
			`<${prefix}fill><${prefix}patternFill patternType="none"/></${prefix}fill>`,
			`<${prefix}fill><${prefix}patternFill patternType="gray125"/></${prefix}fill>`,
		);
	} else if (baseFillCount === 1) {
		addedFills.push(
			`<${prefix}fill><${prefix}patternFill patternType="gray125"/></${prefix}fill>`,
		);
	}
	if (baseBorderCount === 0) {
		addedBorders.push(
			`<${prefix}border><${prefix}left/><${prefix}right/><${prefix}top/><${prefix}bottom/><${prefix}diagonal/></${prefix}border>`,
		);
	}
	if (baseXfCount === 0) {
		addedXfs.push(
			`<${prefix}xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`,
		);
		addedXfKeyToIndex.set(styleKey(normalizeStyleSpec({})), 0);
	}

	const styleIndices: number[] = [];

	for (const style of styles) {
		const norm = normalizeStyleSpec(style);
		const key = styleKey(norm);
		const addedXf = addedXfKeyToIndex.get(key);
		if (addedXf !== undefined) {
			styleIndices.push(addedXf);
			continue;
		}

		let numFmtId = 0;
		if (norm.numFmt) {
			const builtinId = BUILTIN_NUMFMT_ID_BY_CODE[norm.numFmt];
			if (builtinId !== undefined) {
				numFmtId = builtinId;
			} else {
				const knownId = customNumFmtCodeToId.get(norm.numFmt);
				if (knownId !== undefined) {
					numFmtId = knownId;
				} else {
					maxNumFmtId += 1;
					numFmtId = maxNumFmtId;
					customNumFmtCodeToId.set(norm.numFmt, numFmtId);
					addedNumFmts.push(
						`<${prefix}numFmt numFmtId="${numFmtId}" formatCode="${escapeXmlAttr(norm.numFmt)}"/>`,
					);
				}
			}
		}

		let fontId = 0;
		if (norm.font || norm.fg) {
			const fKey = fontKey(norm.font, norm.fg);
			const knownFont = addedFontMap.get(fKey);
			if (knownFont !== undefined) {
				fontId = knownFont;
			} else {
				fontId = baseFontCount + addedFonts.length;
				addedFonts.push(serializeFontXml(norm.font, norm.fg, prefix));
				addedFontMap.set(fKey, fontId);
			}
		}

		let fillId = 0;
		if (norm.bg) {
			const knownFill = addedFillMap.get(norm.bg);
			if (knownFill !== undefined) {
				fillId = knownFill;
			} else {
				fillId = baseFillCount + addedFills.length;
				addedFills.push(serializeFillXml(norm.bg, prefix));
				addedFillMap.set(norm.bg, fillId);
			}
		}

		let borderId = 0;
		if (norm.border) {
			const bKey = borderKey(norm.border);
			const knownBorder = addedBorderMap.get(bKey);
			if (knownBorder !== undefined) {
				borderId = knownBorder;
			} else {
				borderId = baseBorderCount + addedBorders.length;
				addedBorders.push(serializeBorderXml(norm.border, prefix));
				addedBorderMap.set(bKey, borderId);
			}
		}

		const nextXfIndex = baseXfCount + addedXfs.length;
		addedXfs.push(
			serializeXfXml(
				{
					numFmtId,
					fontId,
					fillId,
					borderId,
					align: norm.align,
				},
				prefix,
			),
		);
		addedXfKeyToIndex.set(key, nextXfIndex);
		styleIndices.push(nextXfIndex);
	}

	if (addedXfs.length === 0) {
		return { xml: stylesXml, styleIndices };
	}

	const patches: XmlSlicePatch[] = [];
	if (addedNumFmts.length > 0) {
		if (numFmtsEl) {
			buildSectionPatch(
				stylesXml,
				numFmtsEl,
				existingNumFmtCount + addedNumFmts.length,
				addedNumFmts.join(""),
				patches,
			);
		} else {
			patches.push({
				start: fontsEl.openStart,
				end: fontsEl.openStart,
				replacement: `<${prefix}numFmts count="${addedNumFmts.length}">${addedNumFmts.join("")}</${prefix}numFmts>`,
			});
		}
	}

	buildSectionPatch(
		stylesXml,
		fontsEl,
		baseFontCount + addedFonts.length,
		addedFonts.join(""),
		patches,
	);
	buildSectionPatch(
		stylesXml,
		fillsEl,
		baseFillCount + addedFills.length,
		addedFills.join(""),
		patches,
	);
	buildSectionPatch(
		stylesXml,
		bordersEl,
		baseBorderCount + addedBorders.length,
		addedBorders.join(""),
		patches,
	);
	buildSectionPatch(
		stylesXml,
		cellXfsEl,
		baseXfCount + addedXfs.length,
		addedXfs.join(""),
		patches,
	);

	return {
		xml: applyXmlSlicePatches(stylesXml, patches),
		styleIndices,
	};
}

export function appendStyleToStylesXml(
	stylesXml: string,
	style: ExcelStyleSpec,
	options?: { themeColors?: readonly string[] },
): { xml: string; styleIndex: number } {
	const result = appendStylesToStylesXml(stylesXml, [style], options);
	return {
		xml: result.xml,
		styleIndex: result.styleIndices[0] ?? 0,
	};
}
