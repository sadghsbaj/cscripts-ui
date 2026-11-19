import { describe, expect, it } from "vitest";
import {
	appendStylesToStylesXml,
	appendStyleToStylesXml,
	applyColorTint,
	createStyleRegistry,
	DEFAULT_THEME_COLORS,
	getBuiltinNumFmtCode,
	INDEXED_COLOR_PALETTE,
	isDateNumFmt,
	normalizeHexColor,
	parseStylesXml,
	parseThemeColorsXml,
	resolveOoxmlColor,
	StyleRegistry,
} from "./ooxml-styles.internal.ts";
import { findXmlChild, findXmlChildren, getXmlAttr, parseXmlTree } from "./ooxml-xml.internal.ts";

const HTTP_SCHEME = ["http", "://"].join("");

describe("StyleRegistry deduplication, reserved indices, and strict <styleSheet> ordering", () => {
	it("resolves default register(), register({}), and register({ numFmt: 'General' }) to index 0", () => {
		const registry = createStyleRegistry();
		expect(registry).toBeInstanceOf(StyleRegistry);
		expect(registry.getStyleCount()).toBe(1);

		expect(registry.register()).toBe(0);
		expect(registry.register({})).toBe(0);
		expect(registry.register({ numFmt: "General" })).toBe(0);
		expect(registry.getStyleCount()).toBe(1);
	});

	it("deduplicates identical normalized styles and component resources while preserving reserved indices", () => {
		const registry = new StyleRegistry();

		const idx1 = registry.register({
			fg: "#18181b",
			bg: "#fef3c7",
			font: { family: "Segoe UI", size: 10, bold: true, italic: true, underline: true, strike: true },
			border: {
				top: { style: "thin", fg: "#d4d4d8" },
				bottom: { style: "double", fg: "#18181b" },
			},
			align: { horizontal: "right", vertical: "center", wrapText: true, indent: 2 },
			numFmt: "#,##0.00",
		});
		expect(idx1).toBe(1);

		// Re-registering with different hex case / leading-# omission deduplicates to index 1
		const idx1Dup = registry.register({
			fg: "18181B",
			bg: "FEF3C7",
			font: { family: "Segoe UI", size: 10, bold: true, italic: true, underline: true, strike: true },
			border: {
				top: { style: "thin", fg: "D4D4D8" },
				bottom: { style: "double", fg: "18181B" },
			},
			align: { horizontal: "right", vertical: "center", wrapText: true, indent: 2 },
			numFmt: "#,##0.00",
		});
		expect(idx1Dup).toBe(1);

		// Registering a custom number format allocates numFmtId >= 164 and reuses existing font/fill
		const idx2 = registry.register({
			fg: "#18181B",
			bg: "#FEF3C7",
			font: { family: "Segoe UI", size: 10, bold: true, italic: true, underline: true, strike: true },
			numFmt: "yyyy-mm-dd hh:mm",
		});
		expect(idx2).toBe(2);
		expect(registry.register({
			fg: "#18181B",
			bg: "#FEF3C7",
			font: { family: "Segoe UI", size: 10, bold: true, italic: true, underline: true, strike: true },
			numFmt: "yyyy-mm-dd hh:mm",
		})).toBe(2);

		const xml = registry.toXml();
		const root = parseXmlTree(xml);
		expect(root).not.toBeNull();
		expect(root?.localName).toBe("styleSheet");

		// Verify strict ECMA-376 child element ordering
		const childNames = root?.children.map((c) => c.localName) ?? [];
		expect(childNames).toEqual([
			"numFmts",
			"fonts",
			"fills",
			"borders",
			"cellStyleXfs",
			"cellXfs",
			"cellStyles",
			"dxfs",
			"tableStyles",
		]);

		// Verify count="..." parity with actual child elements on every collection
		for (const sectionName of [
			"numFmts",
			"fonts",
			"fills",
			"borders",
			"cellStyleXfs",
			"cellXfs",
			"cellStyles",
			"dxfs",
			"tableStyles",
		]) {
			const section = root ? findXmlChild(root, sectionName) : undefined;
			expect(section).toBeDefined();
			const declaredCount = Number(getXmlAttr(section?.attrs ?? {}, "count"));
			expect(declaredCount).toBe(section?.children.length ?? 0);
		}

		// Verify reserved fillId="0" (none), fillId="1" (gray125), borderId="0", cellStyleXfs[0], cellXfs[0]
		const fillsEl = root ? findXmlChild(root, "fills") : undefined;
		const fillChildren = fillsEl ? findXmlChildren(fillsEl, "fill") : [];
		expect(fillChildren).toHaveLength(3); // none, gray125, #FEF3C7
		const [fill0, fill1, fill2] = fillChildren;
		expect(getXmlAttr((fill0 ? findXmlChild(fill0, "patternFill") : undefined)?.attrs ?? {}, "patternType")).toBe("none");
		expect(getXmlAttr((fill1 ? findXmlChild(fill1, "patternFill") : undefined)?.attrs ?? {}, "patternType")).toBe("gray125");
		expect(getXmlAttr((fill2 ? findXmlChild(fill2, "patternFill") : undefined)?.attrs ?? {}, "patternType")).toBe("solid");

		// Font and fill should have been deduplicated across idx1 and idx2 (1 default + 1 custom = 2 fonts)
		const fontsEl = root ? findXmlChild(root, "fonts") : undefined;
		expect(fontsEl?.children).toHaveLength(2);

		const bordersEl = root ? findXmlChild(root, "borders") : undefined;
		expect(bordersEl?.children).toHaveLength(2); // borderId=0 reserved empty + 1 custom border
	});
});

describe("Theme colors, HSL tint scaling, indexed colors, and resolveOoxmlColor", () => {
	it("parses theme1.xml with lt1/dk1 & lt2/dk2 slot swap, srgbClr, and sysClr[@lastClr]", () => {
		const themeXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<a:theme xmlns:a="${HTTP_SCHEME}schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">` +
			`<a:themeElements>` +
			`<a:clrScheme name="Custom">` +
			`<a:dk1><a:sysClr val="windowText" lastClr="111111"/></a:dk1>` +
			`<a:lt1><a:sysClr val="window" lastClr="FEFEFE"/></a:lt1>` +
			`<a:dk2><a:srgbClr val="223344"/></a:dk2>` +
			`<a:lt2><a:srgbClr val="EEFFEE"/></a:lt2>` +
			`<a:accent1><a:srgbClr val="4472C4"/></a:accent1>` +
			`<a:accent2><a:sysClr val="windowText"/></a:accent2>` +
			`<a:accent3><a:sysClr val="window"/></a:accent3>` +
			`</a:clrScheme>` +
			`</a:themeElements>` +
			`</a:theme>`;

		const themeColors = parseThemeColorsXml(themeXml);
		expect(themeColors).toHaveLength(12);
		// Index 0 is lt1, Index 1 is dk1, Index 2 is lt2, Index 3 is dk2
		expect(themeColors[0]).toBe("#FEFEFE");
		expect(themeColors[1]).toBe("#111111");
		expect(themeColors[2]).toBe("#EEFFEE");
		expect(themeColors[3]).toBe("#223344");
		expect(themeColors[4]).toBe("#4472C4");
		expect(themeColors[5]).toBe("#000000"); // windowText fallback without lastClr
		expect(themeColors[6]).toBe("#FFFFFF"); // window fallback without lastClr
		expect(themeColors[7]).toBe(DEFAULT_THEME_COLORS[7]);
	});

	it("applies positive, negative, and zero HSL tint adjustments accurately", () => {
		expect(applyColorTint("#4472C4", 0)).toBe("#4472C4");
		expect(applyColorTint("#000000", 0.5)).toBe("#808080");
		expect(applyColorTint("#FFFFFF", -0.5)).toBe("#808080");
		expect(applyColorTint("#4472C4", 1)).toBe("#FFFFFF");
		expect(applyColorTint("#4472C4", -1)).toBe("#000000");

		// Positive tint lightens, negative tint darkens
		const lightened = applyColorTint("#4472C4", 0.4);
		const darkened = applyColorTint("#4472C4", -0.25);
		expect(lightened).toMatch(/^#[0-9A-F]{6}$/);
		expect(darkened).toMatch(/^#[0-9A-F]{6}$/);
		expect(Number.parseInt(lightened.slice(1, 3), 16)).toBeGreaterThan(0x44);
		expect(Number.parseInt(darkened.slice(1, 3), 16)).toBeLessThan(0x44);
	});

	it("normalizes hex colors and resolves rgb, theme+tint, and indexed colors", () => {
		expect(normalizeHexColor("#abc")).toBe("#AABBCC");
		expect(normalizeHexColor("ff18181b")).toBe("#18181B");
		expect(normalizeHexColor("00000000")).toBeUndefined();
		expect(normalizeHexColor("invalid")).toBeUndefined();

		expect(INDEXED_COLOR_PALETTE).toHaveLength(64);
		expect(INDEXED_COLOR_PALETTE[0]).toBe("#000000");
		expect(INDEXED_COLOR_PALETTE[2]).toBe("#FF0000");

		expect(resolveOoxmlColor({ rgb: "FF336699" })).toBe("#336699");
		expect(resolveOoxmlColor({ theme: "0" })).toBe("#FFFFFF");
		expect(resolveOoxmlColor({ theme: "0", tint: "-0.5" })).toBe("#808080");
		expect(resolveOoxmlColor({ indexed: "2" })).toBe("#FF0000");
		expect(resolveOoxmlColor({ indexed: "999" })).toBeUndefined();
	});
});

describe("isDateNumFmt and getBuiltinNumFmtCode", () => {
	it("recognizes built-in date/time IDs, elapsed time, and custom patterns while rejecting numeric/color/quoted tokens", () => {
		for (const id of [14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]) {
			expect(getBuiltinNumFmtCode(id)).toBeDefined();
			expect(isDateNumFmt(id)).toBe(true);
		}
		expect(getBuiltinNumFmtCode(46)).toBe("[h]:mm:ss");
		expect(isDateNumFmt(0)).toBe(false);
		expect(isDateNumFmt(1)).toBe(false);
		expect(isDateNumFmt(2)).toBe(false);
		expect(isDateNumFmt(11)).toBe(false);
		expect(isDateNumFmt(49)).toBe(false);

		// Custom date/time format codes
		expect(isDateNumFmt(164, "yyyy-mm-dd")).toBe(true);
		expect(isDateNumFmt(165, "dd.mm.yyyy hh:mm:ss")).toBe(true);
		expect(isDateNumFmt(166, "[$-409]d-mmm-yy;@")).toBe(true);
		expect(isDateNumFmt(167, "[Red]yyyy/mm/dd")).toBe(true);
		expect(isDateNumFmt(168, "[h]:mm:ss")).toBe(true);
		expect(isDateNumFmt(169, "[mm]:ss")).toBe(true);
		expect(isDateNumFmt(180, '"a;b" yyyy-mm-dd')).toBe(true);

		// Reject non-date format codes that contain date letters inside quotes, color tags, or scientific notation
		expect(isDateNumFmt(170, "General")).toBe(false);
		expect(isDateNumFmt(171, "@")).toBe(false);
		expect(isDateNumFmt(172, '"m" 0.00')).toBe(false);
		expect(isDateNumFmt(173, '"year" #,##0')).toBe(false);
		expect(isDateNumFmt(174, "[Red]0.00")).toBe(false);
		expect(isDateNumFmt(175, "0.00E+00")).toBe(false);
		expect(isDateNumFmt(176, "0.0%")).toBe(false);
		expect(isDateNumFmt(177, "# ?/?")).toBe(false);
		expect(isDateNumFmt(178, String.raw`\m\d\y 0`)).toBe(false);
	});
});

describe("parseStylesXml and appendStylesToStylesXml / appendStyleToStylesXml", () => {
	it("parses custom <indexedColors>, theme colors, fonts, fills, borders, alignments, and date numFmts", () => {
		const stylesXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<styleSheet xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<numFmts count="1"><numFmt numFmtId="164" formatCode="dd.mm.yyyy"/></numFmts>` +
			`<fonts count="2">` +
			`<font><sz val="11"/><name val="Calibri"/></font>` +
			`<font><b/><i/><u/><strike/><sz val="12"/><color indexed="0"/><name val="Arial"/></font>` +
			`</fonts>` +
			`<fills count="3">` +
			`<fill><patternFill patternType="none"/></fill>` +
			`<fill><patternFill patternType="gray125"/></fill>` +
			`<fill><patternFill patternType="solid"><fgColor theme="4" tint="0.5"/></patternFill></fill>` +
			`</fills>` +
			`<borders count="2">` +
			`<border><left/><right/><top/><bottom/><diagonal/></border>` +
			`<border><left style="thin"><color rgb="FF112233"/></left><right/><top style="medium"/><bottom/><diagonal/></border>` +
			`</borders>` +
			`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
			`<cellXfs count="2">` +
			`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
			`<xf numFmtId="164" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">` +
			`<alignment horizontal="center" vertical="top" wrapText="1" indent="3"/>` +
			`</xf>` +
			`</cellXfs>` +
			`<colors><indexedColors><rgbColor rgb="00ABCDEF"/></indexedColors></colors>` +
			`</styleSheet>`;

		const parsed = parseStylesXml(stylesXml);
		expect(parsed.cellXfs).toHaveLength(2);
		expect(parsed.cellXfs[0]).toEqual({});
		expect(parsed.isDateByXf).toEqual([false, true]);
		expect(parsed.numFmtIds).toEqual([0, 164]);
		expect(parsed.cellXfs[1]).toEqual({
			fg: "#ABCDEF", // overridden indexed="0" from <indexedColors>
			bg: applyColorTint(DEFAULT_THEME_COLORS[4] ?? "#4472C4", 0.5),
			font: {
				family: "Arial",
				size: 12,
				bold: true,
				italic: true,
				underline: true,
				strike: true,
			},
			border: {
				left: { style: "thin", fg: "#112233" },
				top: { style: "medium" },
			},
			align: {
				horizontal: "center",
				vertical: "top",
				wrapText: true,
				indent: 3,
			},
			numFmt: "dd.mm.yyyy",
		});
	});

	it("appends new styles without shifting existing cellXfs indices and handles missing <numFmts>", () => {
		// Initial stylesheet without <numFmts>
		const baseXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<styleSheet xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="2">` +
			`<font><sz val="11"/><name val="Calibri"/></font>` +
			`<font><b/><sz val="11"/><color rgb="FF18181B"/><name val="Segoe UI"/></font>` +
			`</fonts>` +
			`<fills count="2">` +
			`<fill><patternFill patternType="none"/></fill>` +
			`<fill><patternFill patternType="gray125"/></fill>` +
			`</fills>` +
			`<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
			`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
			`<cellXfs count="2">` +
			`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
			`<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
			`</cellXfs>` +
			`</styleSheet>`;

		const existingStyle = {
			fg: "#18181B",
			font: { family: "Segoe UI", size: 11, bold: true },
		};
		const newStyle = {
			fg: "#78350F",
			bg: "#FEF3C7",
			numFmt: "0.000",
		};

		const { xml: updatedXml, styleIndices } = appendStylesToStylesXml(baseXml, [
			{},
			existingStyle,
			newStyle,
			newStyle, // duplicate in same batch
		]);

		// Indices 0 and 1 must be preserved without shifting; newStyle gets appended at index 2
		expect(styleIndices).toEqual([0, 1, 2, 2]);
		expect(updatedXml).toContain('<numFmts count="1"><numFmt numFmtId="164" formatCode="0.000"/></numFmts><fonts');

		const reparsed = parseStylesXml(updatedXml);
		expect(reparsed.cellXfs).toHaveLength(3);
		expect(reparsed.cellXfs[1]).toEqual(existingStyle);
		expect(reparsed.cellXfs[2]).toEqual({
			...newStyle,
			font: { family: "Calibri", size: 11 },
		});
	});

	it("expands self-closing <numFmts count='0'/> and propagates <x:styleSheet> namespace prefixes across all appended tags", () => {
		const prefixedXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<x:styleSheet xmlns:x="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<x:numFmts count="0"/>` +
			`<x:fonts count="1"><x:font><x:sz val="11"/><x:name val="Calibri"/></x:font></x:fonts>` +
			`<x:fills count="2"><x:fill><x:patternFill patternType="none"/></x:fill><x:fill><x:patternFill patternType="gray125"/></x:fill></x:fills>` +
			`<x:borders count="1"><x:border><x:left/><x:right/><x:top/><x:bottom/><x:diagonal/></x:border></x:borders>` +
			`<x:cellStyleXfs count="1"><x:xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></x:cellStyleXfs>` +
			`<x:cellXfs count="1"><x:xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></x:cellXfs>` +
			`</x:styleSheet>`;

		const { xml, styleIndex } = appendStyleToStylesXml(prefixedXml, {
			fg: "#FF0000",
			bg: "#FFFF00",
			font: { bold: true, size: 12, family: "Segoe UI" },
			border: { top: { style: "thin", fg: "#000000" } },
			align: { horizontal: "center" },
			numFmt: "yyyy-mm-dd",
		});

		expect(styleIndex).toBe(1);
		expect(xml).toContain('<x:numFmts count="1"><x:numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></x:numFmts>');
		expect(xml).toContain('<x:fonts count="2">');
		expect(xml).toContain('<x:font><x:b/><x:sz val="12"/><x:color rgb="FFFF0000"/><x:name val="Segoe UI"/></x:font>');
		expect(xml).toContain('<x:fills count="3">');
		expect(xml).toContain('<x:fill><x:patternFill patternType="solid"><x:fgColor rgb="FFFFFF00"/></x:patternFill></x:fill>');
		expect(xml).toContain('<x:borders count="2">');
		expect(xml).toContain('<x:border><x:left/><x:right/><x:top style="thin"><x:color rgb="FF000000"/></x:top><x:bottom/><x:diagonal/></x:border>');
		expect(xml).toContain('<x:cellXfs count="2">');
		expect(xml).toContain('<x:alignment horizontal="center"/></x:xf>');

		const reparsed = parseStylesXml(xml);
		expect(reparsed.cellXfs).toHaveLength(2);
		expect(reparsed.isDateByXf[1]).toBe(true);
	});

	it("seeds reserved defaults when <fonts count='0'/>, <fills count='0'/> (or count='1'), <borders count='0'/>, and <cellXfs count='0'/> are under-populated", () => {
		const emptySectionsXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<styleSheet xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="0"/>` +
			`<fills count="0"/>` +
			`<borders count="0"/>` +
			`<cellXfs count="0"/>` +
			`</styleSheet>`;

		const customStyle = {
			fg: "#1E3A8A",
			bg: "#DBEAFE",
			font: { family: "Segoe UI", size: 12, bold: true },
			border: { bottom: { style: "medium" as const, fg: "#1D4ED8" } },
		};

		const { xml: seededXml, styleIndices } = appendStylesToStylesXml(emptySectionsXml, [
			customStyle,
		]);
		expect(styleIndices).toEqual([1]);

		const root = parseXmlTree(seededXml);
		expect(root).not.toBeNull();
		const fontsEl = root ? findXmlChild(root, "fonts") : undefined;
		const fillsEl = root ? findXmlChild(root, "fills") : undefined;
		const bordersEl = root ? findXmlChild(root, "borders") : undefined;
		const cellXfsEl = root ? findXmlChild(root, "cellXfs") : undefined;

		// fontId=0 default + fontId=1 custom
		expect(fontsEl?.children).toHaveLength(2);
		// fillId=0 (none), fillId=1 (gray125), fillId=2 (#DBEAFE)
		expect(fillsEl?.children).toHaveLength(3);
		// borderId=0 (empty), borderId=1 (custom)
		expect(bordersEl?.children).toHaveLength(2);
		// xfIndex=0 (default), xfIndex=1 (custom)
		expect(cellXfsEl?.children).toHaveLength(2);

		const xf1 = cellXfsEl?.children[1];
		expect(getXmlAttr(xf1?.attrs ?? {}, "fontId")).toBe("1");
		expect(getXmlAttr(xf1?.attrs ?? {}, "fillId")).toBe("2");
		expect(getXmlAttr(xf1?.attrs ?? {}, "borderId")).toBe("1");

		const reparsed = parseStylesXml(seededXml);
		expect(reparsed.cellXfs).toEqual([{}, customStyle]);

		// Also verify <fills count="1"> with only patternType="none" seeds fillId=1 (gray125) so custom fill receives fillId=2
		const singleFillXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<styleSheet xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>` +
			`<fills count="1"><fill><patternFill patternType="none"/></fill></fills>` +
			`<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
			`<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>` +
			`</styleSheet>`;

		const { xml: singleFillUpdated, styleIndices: singleFillIndices } = appendStylesToStylesXml(
			singleFillXml,
			[{ bg: "#FEF3C7" }],
		);
		expect(singleFillIndices).toEqual([1]);
		expect(singleFillUpdated).toContain('<fills count="3">');
		expect(parseStylesXml(singleFillUpdated).cellXfs[1]).toEqual({ bg: "#FEF3C7" });
	});

	it("is idempotent across sequential multi-pass appendStylesToStylesXml calls when font.family and font.size are omitted", () => {
		const initialXml = createStyleRegistry().toXml();
		const targetStyle = { fg: "#78350F", bg: "#FEF3C7" };

		const pass1 = appendStylesToStylesXml(initialXml, [targetStyle]);
		expect(pass1.styleIndices).toEqual([1]);

		const pass2 = appendStylesToStylesXml(pass1.xml, [targetStyle]);
		expect(pass2.styleIndices).toEqual([1]);
		expect(pass2.xml).toBe(pass1.xml);

		const root = parseXmlTree(pass2.xml);
		const fontsEl = root ? findXmlChild(root, "fonts") : undefined;
		const cellXfsEl = root ? findXmlChild(root, "cellXfs") : undefined;
		expect(fontsEl?.children).toHaveLength(2);
		expect(cellXfsEl?.children).toHaveLength(2);
	});

	it("preserves existing cellXfs indices on missing-section fallback even when existing <cellXfs> contains duplicate <xf> entries", () => {
		// Missing <borders>, while <cellXfs> has 3 entries where index 0 and index 1 are both default XFs
		// and index 2 is a bold style.
		const partialStylesXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<styleSheet xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="2">` +
			`<font><sz val="11"/><name val="Calibri"/></font>` +
			`<font><b/><sz val="11"/><color rgb="FF18181B"/><name val="Calibri"/></font>` +
			`</fonts>` +
			`<fills count="2">` +
			`<fill><patternFill patternType="none"/></fill>` +
			`<fill><patternFill patternType="gray125"/></fill>` +
			`</fills>` +
			`<cellXfs count="3">` +
			`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
			`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
			`<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
			`</cellXfs>` +
			`</styleSheet>`;

		const newStyle = { bg: "#DBEAFE" };
		const { xml: fallbackXml, styleIndices } = appendStylesToStylesXml(partialStylesXml, [
			newStyle,
		]);

		// Because indices 0, 1, 2 were already in <cellXfs>, the newly appended style must get index 3
		// without collapsing duplicate index 1 into index 0!
		expect(styleIndices).toEqual([3]);

		const reparsed = parseStylesXml(fallbackXml);
		expect(reparsed.cellXfs).toHaveLength(4);
		expect(reparsed.cellXfs[0]).toEqual({});
		expect(reparsed.cellXfs[1]).toEqual({});
		expect(reparsed.cellXfs[2]).toEqual({
			fg: "#18181B",
			font: { family: "Calibri", size: 11, bold: true },
		});
		expect(reparsed.cellXfs[3]).toEqual(newStyle);
	});

	it("does not falsely reuse a pre-existing xf with unmodeled attributes (textRotation / gradientFill) while deduplicating within the appended batch", () => {
		const unmodeledStylesXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<styleSheet xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<fonts count="2">` +
			`<font><sz val="11"/><name val="Calibri"/></font>` +
			`<font><b/><sz val="11"/><name val="Calibri"/></font>` +
			`</fonts>` +
			`<fills count="3">` +
			`<fill><patternFill patternType="none"/></fill>` +
			`<fill><patternFill patternType="gray125"/></fill>` +
			`<fill><gradientFill degree="90"><stop position="0"><color rgb="FFFFFFFF"/></stop><stop position="1"><color rgb="FF000000"/></stop></gradientFill></fill>` +
			`</fills>` +
			`<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
			`<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
			`<cellXfs count="3">` +
			`<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
			// Index 1: bold font + unmodeled textRotation="90"
			`<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment textRotation="90"/></xf>` +
			// Index 2: bold font + unmodeled gradient fillId="2"
			`<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
			`</cellXfs>` +
			`</styleSheet>`;

		const boldStyle = { font: { bold: true } };
		const { xml: updatedXml, styleIndices } = appendStylesToStylesXml(unmodeledStylesXml, [
			boldStyle,
			boldStyle,
		]);

		// Must NOT reuse index 1 (textRotation="90") or index 2 (gradientFill),
		// and both identical entries in the same batch must deduplicate to index 3.
		expect(styleIndices).toEqual([3, 3]);

		const root = parseXmlTree(updatedXml);
		const cellXfsEl = root ? findXmlChild(root, "cellXfs") : undefined;
		expect(cellXfsEl?.children).toHaveLength(4);
		expect(updatedXml).toContain('textRotation="90"');
		expect(updatedXml).toContain('<gradientFill degree="90">');
	});
});
