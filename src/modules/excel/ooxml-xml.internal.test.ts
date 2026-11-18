import { describe, expect, it } from "vitest";
import { ExcelError, isExcelError } from "./errors.ts";
import {
	applyXmlSlicePatches,
	concatUint8Arrays,
	createChunkedXmlWriter,
	decodeXmlEntities,
	escapeXmlAttr,
	escapeXmlText,
	expandSelfClosingTag,
	findXmlChild,
	findXmlChildren,
	findXmlDescendant,
	findXmlDescendants,
	getXmlAttr,
	getXmlLocalName,
	getXmlPrefix,
	needsXmlSpacePreserve,
	parseXmlTree,
	removeXmlAttribute,
	scanXml,
	stripIllegalXmlChars,
	upsertXmlAttribute,
	xmlSpaceAttr,
	type XmlCloseTagInfo,
	type XmlOpenTagInfo,
} from "./ooxml-xml.internal.ts";

const HTTP_SCHEME = ["http", "://"].join("");

describe("getXmlLocalName, getXmlPrefix, and getXmlAttr", () => {
	it("extracts local names and namespace prefixes accurately", () => {
		expect(getXmlLocalName("row")).toBe("row");
		expect(getXmlLocalName("x:row")).toBe("row");
		expect(getXmlLocalName("ss:c")).toBe("c");
		expect(getXmlLocalName("ns0:styleSheet")).toBe("styleSheet");

		expect(getXmlPrefix("row")).toBe("");
		expect(getXmlPrefix("x:row")).toBe("x:");
		expect(getXmlPrefix("ss:c")).toBe("ss:");
		expect(getXmlPrefix("ns0:styleSheet")).toBe("ns0:");
	});

	it("resolves exact and namespace-prefixed attributes while skipping xmlns declarations", () => {
		const attrs = {
			"xmlns": `${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main`,
			"xmlns:r": `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships`,
			"r:id": "rId5",
			"x:s": "12",
		};

		// Looking up "r" must NOT match "xmlns:r"
		expect(getXmlAttr(attrs, "r")).toBeUndefined();
		expect(getXmlAttr(attrs, "id")).toBe("rId5");
		expect(getXmlAttr(attrs, "r:id")).toBe("rId5");
		expect(getXmlAttr(attrs, "s")).toBe("12");
		expect(getXmlAttr(attrs, "x:s")).toBe("12");

		// When an exact attribute "r" is also present alongside "xmlns:r", it resolves "r"
		const cellAttrs = {
			"xmlns:r": `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships`,
			"r": "B4",
			"r:id": "rId1",
		};
		expect(getXmlAttr(cellAttrs, "r")).toBe("B4");
		expect(getXmlAttr(cellAttrs, "id")).toBe("rId1");
	});
});

describe("XML entity decoding, escaping, control char stripping, and xml:space", () => {
	it("decodes named and decimal/hex numeric XML entities and preserves invalid code points", () => {
		expect(decodeXmlEntities("plain text")).toBe("plain text");
		expect(
			decodeXmlEntities("A &amp; B &lt; C &gt; D &quot;E&quot; &apos;F&apos;"),
		).toBe(`A & B < C > D "E" 'F'`);
		expect(decodeXmlEntities("Line1&#10;Line2&#xA;Line3&#x09;Tab&#13;CR")).toBe(
			"Line1\nLine2\nLine3\tTab\rCR",
		);
		expect(decodeXmlEntities("Emoji &#x1F600; &amp; Euro &#8364;")).toBe("Emoji 😀 & Euro €");

		// Invalid XML code points (0, control chars, surrogates, 0xFFFE, 0xFFFF, > 0x10FFFF) remain unexpanded
		expect(decodeXmlEntities("Null&#0;Bell&#7;VT&#xB;FF&#12;Ctrl&#x1F;")).toBe(
			"Null&#0;Bell&#7;VT&#xB;FF&#12;Ctrl&#x1F;",
		);
		expect(decodeXmlEntities("NonChar&#xFFFE;&#xFFFF;Surrogate&#xD800;Over&#x110000;")).toBe(
			"NonChar&#xFFFE;&#xFFFF;Surrogate&#xD800;Over&#x110000;",
		);
	});

	it("strips illegal XML control characters while preserving tab, LF, CR, and normal text", () => {
		const validText = "Hello\tWorld\nNext\rLine";
		expect(stripIllegalXmlChars(validText)).toBe(validText);

		const dirty = `A\u{0000}B\u{0008}C\tD\nE\u{000B}F\u{000C}G\rH\u{000E}I\u{001F}J\u{FFFE}K\u{FFFF}L`;
		expect(stripIllegalXmlChars(dirty)).toBe("ABC\tD\nEFG\rHIJKL");

		expect(escapeXmlText(`a < b & c > d\u{0000}`)).toBe("a &lt; b &amp; c &gt; d");
		expect(escapeXmlAttr(`"quoted" & 'single' <tag>\u{0007}`)).toBe(
			"&quot;quoted&quot; &amp; &apos;single&apos; &lt;tag&gt;",
		);
	});

	it("detects leading/trailing whitespace and newlines for xml:space='preserve'", () => {
		expect(needsXmlSpacePreserve("")).toBe(false);
		expect(needsXmlSpacePreserve("Normal text")).toBe(false);
		expect(needsXmlSpacePreserve(" leading")).toBe(true);
		expect(needsXmlSpacePreserve("trailing ")).toBe(true);
		expect(needsXmlSpacePreserve("\tleadingTab")).toBe(true);
		expect(needsXmlSpacePreserve("multi\nline")).toBe(true);
		expect(needsXmlSpacePreserve("carriage\rreturn")).toBe(true);

		expect(xmlSpaceAttr("Normal")).toBe("");
		expect(xmlSpaceAttr(" padded ")).toBe(' xml:space="preserve"');
		expect(xmlSpaceAttr("line1\nline2")).toBe(' xml:space="preserve"');
	});
});

describe("scanXml and parseXmlTree", () => {
	it("scans namespace-prefixed tags, single/double quoted attributes containing < and >, comments, PIs, BOM, and CDATA", () => {
		const xml =
			"\u{FEFF}" +
			'<?xml version="1.0" encoding="UTF-8"?>' +
			"<!-- comment with <fakeTag/> -->" +
			`<x:worksheet xmlns:x="${HTTP_SCHEME}example.com" xmlns:r="${HTTP_SCHEME}rels">` +
			`<x:sheetData>` +
			`<x:row r="1" custom='a > b &amp; c &lt; d'>` +
			`<ss:c r="A1" t="inlineStr" formula="A1>0"><ss:is><ss:t xml:space="preserve">  <![CDATA[<raw>&literal]]> &amp; tail </ss:t></ss:is></ss:c>` +
			`<ss:c r="B1" s="2" />` +
			`</x:row>` +
			`</x:sheetData>` +
			`</x:worksheet>`;

		const openTags: XmlOpenTagInfo[] = [];
		const closeTags: XmlCloseTagInfo[] = [];
		const textChunks: string[] = [];

		scanXml(xml, {
			onOpenTag(tag) {
				openTags.push(tag);
			},
			onCloseTag(tag) {
				closeTags.push(tag);
			},
			onText(text) {
				textChunks.push(text);
			},
		});

		expect(openTags.map((t) => [t.rawName, t.localName, t.selfClosing])).toEqual([
			["x:worksheet", "worksheet", false],
			["x:sheetData", "sheetData", false],
			["x:row", "row", false],
			["ss:c", "c", false],
			["ss:is", "is", false],
			["ss:t", "t", false],
			["ss:c", "c", true],
		]);

		expect(openTags[2]?.attrs).toEqual({
			r: "1",
			custom: "a > b & c < d",
		});
		expect(openTags[3]?.attrs).toEqual({
			r: "A1",
			t: "inlineStr",
			formula: "A1>0",
		});
		expect(closeTags.map((t) => [t.rawName, t.localName])).toEqual([
			["ss:t", "t"],
			["ss:is", "is"],
			["ss:c", "c"],
			["x:row", "row"],
			["x:sheetData", "sheetData"],
			["x:worksheet", "worksheet"],
		]);
		expect(textChunks.join("")).toBe("  <raw>&literal & tail ");

		const tree = parseXmlTree(xml);
		expect(tree).not.toBeNull();
		expect(tree?.localName).toBe("worksheet");
		const rowEl = tree ? findXmlDescendant(tree, "row") : undefined;
		expect(rowEl?.attrs["custom"]).toBe("a > b & c < d");

		const cells = tree ? findXmlDescendants(tree, "c") : [];
		expect(cells).toHaveLength(2);
		const tEl = tree ? findXmlDescendant(tree, "t") : undefined;
		expect(tEl?.text).toBe("  <raw>&literal & tail ");

		const sheetDataEl = tree ? findXmlChild(tree, "sheetData") : undefined;
		expect(sheetDataEl?.localName).toBe("sheetData");
		expect(sheetDataEl ? findXmlChildren(sheetDataEl, "row") : []).toHaveLength(1);
	});

	it("rejects <!DOCTYPE and <!ENTITY declarations with ExcelError('CORRUPT_XML')", () => {
		const doctypeXml = `<?xml version="1.0"?><!DOCTYPE lolz [<!ELEMENT lolz (#PCDATA)>]><root/>`;
		const entityXml = `<?xml version="1.0"?><!ENTITY xxe SYSTEM "file:///etc/passwd"><root/>`;

		for (const malicious of [doctypeXml, entityXml]) {
			try {
				scanXml(malicious, {});
				expect.unreachable("Expected DOCTYPE/ENTITY to be rejected");
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("CORRUPT_XML");
				}
			}
		}
	});

	it("throws ExcelError('CORRUPT_XML') on malformed XML constructs", () => {
		const malformedInputs = [
			"<root><!-- unterminated comment</root>",
			"<root><![CDATA[unterminated cdata</root>",
			"<root><?pi unterminated</root>",
			'<root attr="unterminated></root>',
			"<root attr=unquoted></root>",
			"<root attr></root>",
			"<root <nested/></root>",
			"<root></unterminated",
			"<root></>",
			"<root><child></root>",
			"<root><unclosed>",
		];

		for (const bad of malformedInputs) {
			expect(() => parseXmlTree(bad)).toThrow(ExcelError);
			try {
				parseXmlTree(bad);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("CORRUPT_XML");
				}
			}
		}
	});
});

describe("createChunkedXmlWriter and concatUint8Arrays", () => {
	it("flushes UTF-8 encoded chunks across row boundaries and produces exact bytes", () => {
		const writer = createChunkedXmlWriter(2);
		writer.write("<sheetData>");
		writer.write('<row r="1"><c r="A1"><v>1</v></c></row>');
		writer.markRowBoundary();
		writer.write('<row r="2"><c r="A2"><v>2</v></c></row>');
		writer.markRowBoundary(); // triggers flush at threshold=2
		writer.write('<row r="3"><c r="A3"><t>ÄÖÜ €</t></c></row>');
		writer.markRowBoundary();
		writer.write(""); // no-op write
		writer.write("</sheetData>");

		const bytes = writer.toUint8Array();
		const decoded = new TextDecoder().decode(bytes);
		expect(decoded).toBe(
			'<sheetData><row r="1"><c r="A1"><v>1</v></c></row><row r="2"><c r="A2"><v>2</v></c></row><row r="3"><c r="A3"><t>ÄÖÜ €</t></c></row></sheetData>',
		);

		const combined = concatUint8Arrays([
			new Uint8Array([1, 2]),
			new Uint8Array([]),
			new Uint8Array([3, 4, 5]),
		]);
		expect([...combined]).toEqual([1, 2, 3, 4, 5]);
	});
});

describe("applyXmlSlicePatches, expandSelfClosingTag, upsertXmlAttribute, and removeXmlAttribute", () => {
	it("applies unsorted non-overlapping slice patches in order", () => {
		const xml = `<worksheet><dimension ref="A1"/><sheetData/></worksheet>`;
		expect(applyXmlSlicePatches(xml, [])).toBe(xml);

		const dimStart = xml.indexOf('<dimension ref="A1"/>');
		const dimEnd = dimStart + '<dimension ref="A1"/>'.length;
		const sdStart = xml.indexOf("<sheetData/>");
		const sdEnd = sdStart + "<sheetData/>".length;

		// Pass patches in reverse offset order to verify sorting
		const patched = applyXmlSlicePatches(xml, [
			{
				start: sdStart,
				end: sdEnd,
				replacement: expandSelfClosingTag("<sheetData/>", '<row r="1"/>'),
			},
			{
				start: dimStart,
				end: dimEnd,
				replacement: '<dimension ref="A1:B2"/>',
			},
		]);

		expect(patched).toBe(
			`<worksheet><dimension ref="A1:B2"/><sheetData><row r="1"/></sheetData></worksheet>`,
		);
	});

	it("expands self-closing tags including prefixed tags and attributes containing '/'", () => {
		expect(expandSelfClosingTag("<sheetData/>", '<row r="1"/>')).toBe(
			'<sheetData><row r="1"/></sheetData>',
		);
		expect(expandSelfClosingTag('<c r="A1" s="1"/>', "<v>42</v>")).toBe(
			'<c r="A1" s="1"><v>42</v></c>',
		);
		expect(
			expandSelfClosingTag('<x:c r="A1" fmt="m/d/yy" />', "<x:v>45000</x:v>"),
		).toBe('<x:c r="A1" fmt="m/d/yy"><x:v>45000</x:v></x:c>');
		expect(
			expandSelfClosingTag('<c r="A1" s="1" / >', "<v>99</v>"),
		).toBe('<c r="A1" s="1"><v>99</v></c>');

		for (const invalid of ["<sheetData></sheetData>", "plain", "<c/>trailing"]) {
			try {
				expandSelfClosingTag(invalid, "");
				expect.unreachable(`Expected expandSelfClosingTag("${invalid}") to fail`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("PATCH_FAILED");
				}
			}
		}
	});

	it("upserts and removes XML attributes on both regular and self-closing start tags", () => {
		// Upsert existing attribute
		expect(upsertXmlAttribute('<c r="A1" s="1" t="n">', "t", "s")).toBe(
			'<c r="A1" s="1" t="s">',
		);
		// Upsert new attribute on normal opening tag
		expect(upsertXmlAttribute('<c r="A1">', "s", "3")).toBe('<c r="A1" s="3">');
		// Upsert new attribute on self-closing tag (including '/' inside another attribute)
		expect(upsertXmlAttribute('<c r="A1" fmt="a/b" />', "s", "5")).toBe(
			'<c r="A1" fmt="a/b" s="5" />',
		);
		// Upsert and remove attributes on self-closing tag with whitespace between '/' and '>'
		expect(upsertXmlAttribute('<c r="A1" s="1" / >', "t", "n")).toBe(
			'<c r="A1" s="1" t="n" / >',
		);
		expect(upsertXmlAttribute('<c r="A1" s="1" / >', "s", "7")).toBe(
			'<c r="A1" s="7" / >',
		);
		expect(removeXmlAttribute('<c r="A1" s="1" / >', "s")).toBe(
			'<c r="A1" / >',
		);
		// Escapes attribute values on upsert
		expect(upsertXmlAttribute("<row>", "custom", `a"b&c`)).toBe(
			'<row custom="a&quot;b&amp;c">',
		);

		// Remove existing and non-existent attributes
		expect(removeXmlAttribute('<c r="A1" t="s" s="2"/>', "t")).toBe('<c r="A1" s="2"/>');
		expect(removeXmlAttribute('<c r="A1" s="2">', "missing")).toBe('<c r="A1" s="2">');
	});

	it("throws ExcelError('PATCH_FAILED') on overlapping or out-of-bounds patches", () => {
		const xml = "<root><a/><b/></root>";

		// Overlapping ranges
		try {
			applyXmlSlicePatches(xml, [
				{ start: 6, end: 10, replacement: "<x/>" },
				{ start: 8, end: 14, replacement: "<y/>" },
			]);
			expect.unreachable("Expected overlapping patch to throw");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("PATCH_FAILED");
			}
		}

		// Out-of-bounds ranges (negative start, end < start, end > xml.length)
		for (const badPatch of [
			{ start: -1, end: 2, replacement: "" },
			{ start: 5, end: 3, replacement: "" },
			{ start: 0, end: xml.length + 1, replacement: "" },
		]) {
			try {
				applyXmlSlicePatches(xml, [badPatch]);
				expect.unreachable("Expected out-of-bounds patch to throw");
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("PATCH_FAILED");
				}
			}
		}
	});
});
