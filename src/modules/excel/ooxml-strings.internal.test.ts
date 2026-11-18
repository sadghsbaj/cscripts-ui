import { describe, expect, it } from "vitest";
import {
	appendSharedStringsXml,
	createSharedStringsReader,
	createSharedStringsWriter,
	parseSharedStringsXml,
} from "./ooxml-strings.internal.ts";

const HTTP_SCHEME = ["http", "://"].join("");

describe("parseSharedStringsXml and createSharedStringsReader", () => {
	it("parses plain <si><t>, structured <si><r><t> rich-text runs, boolean flag variants, xml:space='preserve', and skips <rPh> phonetic runs", () => {
		const xml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<sst xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main" count="5" uniqueCount="5">` +
			`<si><t>Plain text</t></si>` +
			`<si><t xml:space="preserve">  Leading &amp; trailing\n</t><rPh sb="0" eb="2"><t>PHONETIC_IGNORED</t></rPh><phoneticPr fontId="1"/></si>` +
			`<si>` +
			`<r><rPr><b/><i val="1"/><sz val="12.5"/><color rgb="FFFF0000"/><rFont val="Segoe UI"/></rPr><t xml:space="preserve">BoldRed </t></r>` +
			`<r><rPr><b val="0"/><i val="false"/><color theme="4"/></rPr><t>NormalTheme</t></r>` +
			`<rPh sb="0" eb="4"><t>KATAKANA</t></rPh>` +
			`</si>` +
			`<si/>` +
			`<si><t/></si>` +
			`</sst>`;

		const reader = createSharedStringsReader(xml, {
			resolveColor(attrs) {
				if (attrs["rgb"] === "FFFF0000") {
					return "#FF0000";
				}
				if (attrs["theme"] === "4") {
					return "#4472C4";
				}
				return;
			},
		});

		expect(reader.size).toBe(5);
		expect(reader.get(0)).toEqual({ text: "Plain text" });
		expect(reader.get(1)).toEqual({ text: "  Leading & trailing\n" });
		expect(reader.get(2)).toEqual({
			text: "BoldRed NormalTheme",
			richText: [
				{
					text: "BoldRed ",
					bold: true,
					italic: true,
					fontSize: 12.5,
					fg: "#FF0000",
					fontFamily: "Segoe UI",
				},
				{
					text: "NormalTheme",
					fg: "#4472C4",
				},
			],
		});
		expect(reader.get(3)).toEqual({ text: "" });
		expect(reader.get(4)).toEqual({ text: "" });
		expect(reader.get(99)).toBeUndefined();
	});
});

describe("createSharedStringsWriter", () => {
	it("deduplicates plain and rich strings independently and tracks count vs uniqueCount", () => {
		const writer = createSharedStringsWriter();

		expect(writer.addString("Alpha")).toBe(0);
		expect(writer.addString("  Beta\n")).toBe(1);
		expect(writer.addString("Alpha")).toBe(0); // duplicate plain

		// Rich text with same concatenated text "Alpha" must not collide with plain "Alpha"
		const richAlpha = [
			{ text: "Al", bold: true, fg: "#18181B", fontSize: 11, fontFamily: "Segoe UI" },
			{ text: "pha", italic: true },
		] as const;
		expect(writer.addRichText(richAlpha)).toBe(2);
		expect(writer.addRichText(richAlpha)).toBe(2); // duplicate rich

		// Total references = 5, distinct entries = 3
		expect(writer.getCount()).toBe(5);
		expect(writer.getUniqueCount()).toBe(3);

		const xml = writer.toXml();
		expect(xml).toContain('count="5" uniqueCount="3"');
		expect(xml).toContain('<t xml:space="preserve">  Beta\n</t>');

		const bytesXml = new TextDecoder().decode(writer.toUint8Array());
		expect(bytesXml).toBe(xml);

		const reparsed = parseSharedStringsXml(xml);
		expect(reparsed).toEqual([
			{ text: "Alpha" },
			{ text: "  Beta\n" },
			{
				text: "Alpha",
				richText: [
					{ text: "Al", bold: true, fg: "#18181B", fontSize: 11, fontFamily: "Segoe UI" },
					{ text: "pha", italic: true },
				],
			},
		]);
	});
});

describe("appendSharedStringsXml", () => {
	it("appends only to the tail while preserving existing indices and updating count/uniqueCount", () => {
		const existingXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<sst xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main" count="4" uniqueCount="2">` +
			`<si><t>Existing0</t></si>` +
			`<si><t>Existing1</t></si>` +
			`</sst>`;

		const noOp = appendSharedStringsXml(existingXml, []);
		expect(noOp).toEqual({ xml: existingXml, indices: [] });

		const richRuns = [{ text: "Rich ", bold: true, fg: "#FF0000" }, { text: "Run" }];
		const result = appendSharedStringsXml(existingXml, [
			"Existing1", // reuses index 1
			"New2 ", // appended at index 2 with xml:space="preserve"
			richRuns, // appended at index 3
			"New2 ", // reuses index 2
		]);

		expect(result.indices).toEqual([1, 2, 3, 2]);
		expect(result.xml).toContain('count="8" uniqueCount="4"');

		const reparsed = parseSharedStringsXml(result.xml);
		expect(reparsed).toHaveLength(4);
		expect(reparsed[0]).toEqual({ text: "Existing0" });
		expect(reparsed[1]).toEqual({ text: "Existing1" });
		expect(reparsed[2]).toEqual({ text: "New2 " });
		expect(reparsed[3]).toEqual({ text: "Rich Run", richText: richRuns });
	});

	it("expands self-closing <sst count='0' uniqueCount='0'/> and adds missing count/uniqueCount attributes", () => {
		const selfClosingXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<sst xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`;

		const expanded = appendSharedStringsXml(selfClosingXml, ["First", "Second", "First"]);
		expect(expanded.indices).toEqual([0, 1, 0]);
		expect(expanded.xml).toContain('count="3" uniqueCount="2"');
		expect(parseSharedStringsXml(expanded.xml)).toEqual([
			{ text: "First" },
			{ text: "Second" },
		]);

		// Missing count & uniqueCount attributes on <sst>
		const noCountAttrsXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<sst xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<si><t>A</t></si>` +
			`</sst>`;

		const updated = appendSharedStringsXml(noCountAttrsXml, ["B", "A"]);
		expect(updated.indices).toEqual([1, 0]);
		expect(updated.xml).toContain('count="3"');
		expect(updated.xml).toContain('uniqueCount="2"');
	});

	it("propagates <x:sst> namespace prefix across all appended <x:si>, <x:r>, <x:rPr>, and <x:t> elements", () => {
		const prefixedXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<x:sst xmlns:x="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">` +
			`<x:si><x:t>Seed</x:t></x:si>` +
			`</x:sst>`;

		const { xml, indices } = appendSharedStringsXml(prefixedXml, [
			"PlainPrefixed",
			[
				{
					text: "RichPrefixed",
					bold: true,
					italic: true,
					fontSize: 10,
					fg: "#18181B",
					fontFamily: "Calibri",
				},
			],
		]);

		expect(indices).toEqual([1, 2]);
		expect(xml).toContain("<x:si><x:t>PlainPrefixed</x:t></x:si>");
		expect(xml).toContain(
			'<x:si><x:r><x:rPr><x:b/><x:i/><x:sz val="10"/><x:color rgb="FF18181B"/><x:rFont val="Calibri"/></x:rPr><x:t>RichPrefixed</x:t></x:r></x:si></x:sst>',
		);

		const entries = parseSharedStringsXml(xml);
		expect(entries).toHaveLength(3);
		expect(entries[1]).toEqual({ text: "PlainPrefixed" });
		expect(entries[2]?.text).toBe("RichPrefixed");
	});
});
