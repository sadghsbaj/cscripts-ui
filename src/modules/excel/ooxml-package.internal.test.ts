import { describe, expect, it } from "vitest";
import { isExcelError } from "./errors.ts";
import {
	appendRelationshipsXml,
	convertTemplateToWorkbookContentTypes,
	decodeUtf8,
	encodeUtf8,
	ensureContentTypeOverride,
	extractOoxmlPackage,
	findPackageEntry,
	findRelationshipsByType,
	getRelsPathForPart,
	normalizePackagePath,
	packOoxmlPackage,
	parseCommentsXml,
	parseContentTypesXml,
	parseDataValidationsXml,
	parseDefinedNamesXml,
	parseHyperlinksXml,
	parseRelationshipsXml,
	parseTableXml,
	parseThreadedCommentsXml,
	removeCalcChainEntries,
	removeContentTypeOverride,
	removeRelationshipsByTarget,
	resolvePackageTarget,
	resolveWorkbookPartPath,
	serializeContentTypesXml,
	serializeDataValidationsXml,
	serializeDefinedNamesXml,
	serializeHyperlinksXml,
	serializeRelationshipsXml,
	stripCalcChainFromPackage,
} from "./ooxml-package.internal.ts";

const HTTP_SCHEME = ["http", "://"].join("");

function spoofZipFilterSizesToNaN(zipBytes: Uint8Array): Uint8Array {
	const copy = new Uint8Array(zipBytes);
	const view = new DataView(copy.buffer, copy.byteOffset, copy.byteLength);

	for (let i = 0; i <= copy.byteLength - 4; i += 1) {
		const sig = view.getUint32(i, true);
		if (sig === 0x02_01_4b_50 && i + 32 <= copy.byteLength) {
			// Central directory file header: set extra field length (offset +30) to 1.
			// In fflate's zh() parser, an odd extra field length (< 4) leaves `su` (originalSize) as
			// `undefined` (which compares false in `file.originalSize > maxEntryBytes` during `filter`),
			// while `new Uint8Array(undefined)` allocates a 0-length buffer that fflate's `inflt`
			// dynamically resizes or truncates—allowing us to test the post-inflation / spoofed-header paths.
			view.setUint16(i + 30, 1, true);
		}
	}

	return copy;
}

describe("Package paths, rels resolution, case-insensitive lookup, and root-escape guard", () => {
	it("normalizes slashes, relative segments, rels paths, and case-insensitive entry lookup", () => {
		expect(normalizePackagePath(String.raw`/xl\worksheets/./sheet1.xml`)).toBe(
			"xl/worksheets/sheet1.xml",
		);
		expect(normalizePackagePath("xl/worksheets/../styles.xml")).toBe("xl/styles.xml");

		expect(resolvePackageTarget("xl/workbook.xml", "worksheets/sheet2.xml")).toBe(
			"xl/worksheets/sheet2.xml",
		);
		expect(resolvePackageTarget("xl/worksheets/sheet1.xml", "../tables/table1.xml")).toBe(
			"xl/tables/table1.xml",
		);
		expect(resolvePackageTarget("xl/worksheets/sheet1.xml", "/xl/sharedStrings.xml")).toBe(
			"xl/sharedStrings.xml",
		);

		expect(getRelsPathForPart("")).toBe("_rels/.rels");
		expect(getRelsPathForPart("xl/workbook.xml")).toBe("xl/_rels/workbook.xml.rels");
		expect(getRelsPathForPart("xl/worksheets/sheet1.xml")).toBe(
			"xl/worksheets/_rels/sheet1.xml.rels",
		);

		const entries: Record<string, Uint8Array> = {
			"XL/Worksheets/Sheet1.XML": encodeUtf8("<worksheet/>"),
		};
		const found = findPackageEntry(entries, "/xl/worksheets/sheet1.xml");
		expect(found?.path).toBe("XL/Worksheets/Sheet1.XML");
		expect(found ? decodeUtf8(found.bytes) : "").toBe("<worksheet/>");
		expect(findPackageEntry(entries, "xl/missing.xml")).toBeUndefined();
	});

	it("throws ExcelError('CORRUPT_ARCHIVE') when a relative path escapes package root", () => {
		for (const badPath of ["../secret.xml", "xl/../../outside.xml", "/.."]) {
			try {
				normalizePackagePath(badPath);
				expect.unreachable(`Expected normalizePackagePath("${badPath}") to throw`);
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("CORRUPT_ARCHIVE");
				}
			}
		}

		try {
			resolvePackageTarget("xl/workbook.xml", "../../escape.xml");
			expect.unreachable("Expected root-escaping target to throw");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("CORRUPT_ARCHIVE");
			}
		}
	});
});

describe("extractOoxmlPackage, packOoxmlPackage, rels graph traversal, and zip-bomb bounds", () => {
	it("resolves non-standard workbook, sheet, and style paths via _rels/.rels -> workbook.xml.rels -> sheet.xml.rels", () => {
		const rootRels = serializeRelationshipsXml([
			{
				id: "rId1",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument`,
				target: "custom_xl/main_book.xml",
			},
		]);
		const wbRels = serializeRelationshipsXml([
			{
				id: "rIdSheetA",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`,
				target: "views/tab_alpha.xml",
			},
			{
				id: "rIdStyles",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/styles`,
				target: "theme_and_styles/custom_styles.xml",
			},
		]);
		const sheetRels = serializeRelationshipsXml([
			{
				id: "rIdTable1",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/table`,
				target: "../tables/custom_table.xml",
			},
		]);

		const packed = packOoxmlPackage({
			"_rels/.rels": encodeUtf8(rootRels),
			"custom_xl/main_book.xml": encodeUtf8("<workbook/>"),
			"custom_xl/_rels/main_book.xml.rels": encodeUtf8(wbRels),
			"custom_xl/views/tab_alpha.xml": encodeUtf8("<worksheet/>"),
			"custom_xl/views/_rels/tab_alpha.xml.rels": encodeUtf8(sheetRels),
			"custom_xl/theme_and_styles/custom_styles.xml": encodeUtf8("<styleSheet/>"),
			"custom_xl/tables/custom_table.xml": encodeUtf8("<table/>"),
		});

		const extracted = extractOoxmlPackage(packed);
		const wbPath = resolveWorkbookPartPath(extracted);
		expect(wbPath).toBe("custom_xl/main_book.xml");

		const wbRelsEntry = findPackageEntry(extracted, getRelsPathForPart(wbPath));
		expect(wbRelsEntry).toBeDefined();
		const parsedWbRels = parseRelationshipsXml(
			wbRelsEntry ? decodeUtf8(wbRelsEntry.bytes) : "",
		);

		const sheetRel = findRelationshipsByType(parsedWbRels, "worksheet")[0];
		expect(sheetRel).toBeDefined();
		const sheetPath = resolvePackageTarget(wbPath, sheetRel?.target ?? "");
		expect(sheetPath).toBe("custom_xl/views/tab_alpha.xml");

		const styleRel = findRelationshipsByType(parsedWbRels, "styles")[0];
		expect(resolvePackageTarget(wbPath, styleRel?.target ?? "")).toBe(
			"custom_xl/theme_and_styles/custom_styles.xml",
		);

		const sheetRelsEntry = findPackageEntry(extracted, getRelsPathForPart(sheetPath));
		const parsedSheetRels = parseRelationshipsXml(
			sheetRelsEntry ? decodeUtf8(sheetRelsEntry.bytes) : "",
		);
		const tableRel = findRelationshipsByType(parsedSheetRels, "table")[0];
		expect(resolvePackageTarget(sheetPath, tableRel?.target ?? "")).toBe(
			"custom_xl/tables/custom_table.xml",
		);

		// Also verify appendRelationshipsXml on existing and self-closing <Relationships/>
		const appendedRels = appendRelationshipsXml("<Relationships/>", [
			{ id: "rId9", type: "custom", target: "foo.xml" },
		]);
		expect(parseRelationshipsXml(appendedRels)).toEqual([
			{ id: "rId9", type: "custom", target: "foo.xml" },
		]);

		// Verify appendRelationshipsXml preserves namespace prefix on <pr:Relationships> (both open and self-closing)
		const prefixedSelfClosingRels = appendRelationshipsXml(
			`<pr:Relationships xmlns:pr="${HTTP_SCHEME}schemas.openxmlformats.org/package/2006/relationships"/>`,
			[{ id: "rId1", type: "custom", target: "bar.xml", targetMode: "External" }],
		);
		expect(prefixedSelfClosingRels).toContain(
			'<pr:Relationship Id="rId1" Type="custom" Target="bar.xml" TargetMode="External"/>',
		);
		expect(prefixedSelfClosingRels).toContain("</pr:Relationships>");

		const prefixedExpandedRels = appendRelationshipsXml(prefixedSelfClosingRels, [
			{ id: "rId2", type: "custom2", target: "baz.xml" },
		]);
		expect(prefixedExpandedRels).toContain(
			'<pr:Relationship Id="rId2" Type="custom2" Target="baz.xml"/>',
		);
		expect(parseRelationshipsXml(prefixedExpandedRels)).toEqual([
			{ id: "rId1", type: "custom", target: "bar.xml", targetMode: "External" },
			{ id: "rId2", type: "custom2", target: "baz.xml" },
		]);
	});

	it("rejects invalid ZIP signatures with CORRUPT_ARCHIVE", () => {
		for (const invalidBytes of [
			new Uint8Array([]),
			new Uint8Array([0x00, 0x01, 0x02, 0x03]),
			encodeUtf8("not a zip archive"),
			new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), // OLE2 .xls magic
		]) {
			try {
				extractOoxmlPackage(invalidBytes);
				expect.unreachable("Expected invalid ZIP signature to throw CORRUPT_ARCHIVE");
			} catch (error) {
				expect(isExcelError(error)).toBe(true);
				if (isExcelError(error)) {
					expect(error.code).toBe("CORRUPT_ARCHIVE");
				}
			}
		}
	});

	it("enforces maxEntryCount, maxEntryBytes, maxUncompressedBytes, AND post-inflation spoofed header checks with LIMIT_EXCEEDED", () => {
		const payloadA = encodeUtf8("A".repeat(2048));
		const payloadB = encodeUtf8("B".repeat(2048));
		const validZip = packOoxmlPackage(
			{
				"xl/a.xml": payloadA,
				"xl/b.xml": payloadB,
			},
			6,
		);

		// 1. maxEntryCount exceeded
		try {
			extractOoxmlPackage(validZip, { maxEntryCount: 1 });
			expect.unreachable("Expected maxEntryCount limit to throw");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
			}
		}

		// 2. maxEntryBytes exceeded (pre-inflation filter)
		try {
			extractOoxmlPackage(validZip, { maxEntryBytes: 1000 });
			expect.unreachable("Expected maxEntryBytes limit to throw");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
			}
		}

		// 3. maxUncompressedBytes exceeded (pre-inflation filter)
		try {
			extractOoxmlPackage(validZip, { maxUncompressedBytes: 3000 });
			expect.unreachable("Expected maxUncompressedBytes limit to throw");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
			}
		}

		// 4. Lying ZIP headers: test with stored (level 0) entry where central directory uncompressed size is 0
		// while compressed size is 2048 (`slc(data, b, b + sc)` returns 2048 bytes even though `originalSize` is 0!),
		// verifying the post-inflation byte-length checks throw ExcelError("LIMIT_EXCEEDED")!
		const storedZip = packOoxmlPackage(
			{
				"xl/a.xml": payloadA,
				"xl/b.xml": payloadB,
			},
			0,
		);
		const spoofedStoredZip = new Uint8Array(storedZip);
		const view = new DataView(
			spoofedStoredZip.buffer,
			spoofedStoredZip.byteOffset,
			spoofedStoredZip.byteLength,
		);
		for (let i = 0; i <= spoofedStoredZip.byteLength - 4; i += 1) {
			const sig = view.getUint32(i, true);
			if (sig === 0x04_03_4b_50 && i + 26 <= spoofedStoredZip.byteLength) {
				view.setUint32(i + 22, 0, true);
			} else if (sig === 0x02_01_4b_50 && i + 28 <= spoofedStoredZip.byteLength) {
				view.setUint32(i + 24, 0, true);
			}
		}

		try {
			extractOoxmlPackage(spoofedStoredZip, { maxEntryBytes: 1000 });
			expect.unreachable("Expected post-inflation maxEntryBytes check to catch spoofed ZIP header");
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
				expect(error.message).toContain("Inflated ZIP entry");
			}
		}

		try {
			extractOoxmlPackage(spoofedStoredZip, { maxUncompressedBytes: 3000 });
			expect.unreachable(
				"Expected post-inflation maxUncompressedBytes check to catch spoofed ZIP header",
			);
		} catch (error) {
			expect(isExcelError(error)).toBe(true);
			if (isExcelError(error)) {
				expect(error.code).toBe("LIMIT_EXCEEDED");
				expect(error.message).toContain("Inflated ZIP archive");
			}
		}

		// Also verify corrupt ZIP64 extra field rejects cleanly
		const corruptExtraZip = spoofZipFilterSizesToNaN(validZip);
		expect(() => extractOoxmlPackage(corruptExtraZip)).toThrow();
	});
});

describe("[Content_Types].xml and calcChain.xml helpers", () => {
	it("parses, serializes, updates overrides, and converts template content types (xltx -> xlsx, xltm -> xlsm)", () => {
		const model = {
			defaults: [
				{ extension: "rels", contentType: "application/vnd.openxmlformats-package.relationships+xml" },
				{ extension: "xml", contentType: "application/xml" },
			],
			overrides: [
				{
					partName: "/xl/workbook.xml",
					contentType:
						"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml",
				},
			],
		};

		const xml = serializeContentTypesXml(model);
		expect(parseContentTypesXml(xml)).toEqual(model);

		// Convert xltx -> xlsx
		const convertedXlsx = convertTemplateToWorkbookContentTypes(xml);
		expect(parseContentTypesXml(convertedXlsx).overrides[0]?.contentType).toBe(
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
		);

		// Convert xltm -> xlsm
		const xltmXml = ensureContentTypeOverride(
			xml,
			"/xl/workbook.xml",
			"application/vnd.ms-excel.template.macroEnabled.main+xml",
		);
		const convertedXlsm = convertTemplateToWorkbookContentTypes(xltmXml);
		expect(parseContentTypesXml(convertedXlsm).overrides[0]?.contentType).toBe(
			"application/vnd.ms-excel.sheet.macroEnabled.main+xml",
		);

		// Add and remove override
		const withCalc = ensureContentTypeOverride(
			convertedXlsx,
			"xl/calcChain.xml",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml",
		);
		expect(parseContentTypesXml(withCalc).overrides).toHaveLength(2);

		const withoutCalc = removeContentTypeOverride(withCalc, "/xl/calcChain.xml");
		expect(parseContentTypesXml(withoutCalc).overrides).toHaveLength(1);

		// Verify ensureContentTypeOverride preserves namespace prefix on <ct:Types>
		const prefixedTypesXml =
			`<ct:Types xmlns:ct="${HTTP_SCHEME}schemas.openxmlformats.org/package/2006/content-types">` +
			`<ct:Default Extension="xml" ContentType="application/xml"/>` +
			`</ct:Types>`;
		const withPrefixedOverride = ensureContentTypeOverride(
			prefixedTypesXml,
			"xl/styles.xml",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
		);
		expect(withPrefixedOverride).toContain(
			'<ct:Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
		);
		expect(parseContentTypesXml(withPrefixedOverride).overrides).toEqual([
			{
				partName: "/xl/styles.xml",
				contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml",
			},
		]);
	});

	it("removes calcChain entries while preserving sheet-id 'i' inheritance and strips calcChain from package", () => {
		// Notice second <c r="A2"/> omits i="1" and third <c r="B1" i="2"/> switches to sheet 2,
		// fourth <c r="B2"/> inherits i="2", fifth <c r="A3" i="1"/> switches back to sheet 1,
		// sixth <c r="A4"/> inherits i="1".
		const calcChainXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<calcChain xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<c r="A1" i="1"/>` +
			`<c r="A2"/>` +
			`<c r="B1" i="2"/>` +
			`<c r="B2"/>` +
			`<c r="A3" i="1"/>` +
			`<c r="A4"/>` +
			`</calcChain>`;

		// Remove A1 and A3 from sheet "1": A2 and A4 survive and MUST receive explicit i="1"
		// so A4 doesn't accidentally inherit i="2" from B2!
		const partial = removeCalcChainEntries(calcChainXml, "1", new Set(["a1", "A3"]));
		expect(partial.remainingCount).toBe(4);
		expect(partial.xml).toBe(
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
				`<calcChain xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
				`<c r="A2" i="1"/>` +
				`<c r="B1" i="2"/>` +
				`<c r="B2"/>` +
				`<c r="A4" i="1"/>` +
				`</calcChain>`,
		);

		// Remove all entries across entire package via stripCalcChainFromPackage
		const wbRelsXml = serializeRelationshipsXml([
			{
				id: "rId1",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet`,
				target: "worksheets/sheet1.xml",
			},
			{
				id: "rId2",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/calcChain`,
				target: "calcChain.xml",
			},
		]);
		const ctXml = serializeContentTypesXml({
			defaults: [],
			overrides: [
				{
					partName: "/xl/calcChain.xml",
					contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml",
				},
			],
		});

		const entries: Record<string, Uint8Array> = {
			"[Content_Types].xml": encodeUtf8(ctXml),
			"xl/workbook.xml": encodeUtf8("<workbook/>"),
			"xl/_rels/workbook.xml.rels": encodeUtf8(wbRelsXml),
			"xl/calcChain.xml": encodeUtf8(calcChainXml),
		};

		stripCalcChainFromPackage(entries, "xl/workbook.xml");
		expect(findPackageEntry(entries, "xl/calcChain.xml")).toBeUndefined();
		const updatedWbRelsXml = decodeUtf8(entries["xl/_rels/workbook.xml.rels"] ?? new Uint8Array());
		expect(parseRelationshipsXml(updatedWbRelsXml)).toHaveLength(1);
		const updatedCtXml = decodeUtf8(entries["[Content_Types].xml"] ?? new Uint8Array());
		expect(parseContentTypesXml(updatedCtXml).overrides).toHaveLength(0);

		// Also verify removeRelationshipsByTarget directly
		const strippedRels = removeRelationshipsByTarget(
			wbRelsXml,
			"xl/workbook.xml",
			"xl/calcChain.xml",
		);
		expect(parseRelationshipsXml(strippedRels)).toHaveLength(1);
	});
});

describe("OOXML worksheet & workbook metadata parsers and serializers", () => {
	it("parses Excel Table XML (parseTableXml)", () => {
		const tableXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<table xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="SalesTable" displayName="SalesTable" ref="A1:C10" headerRowCount="1" totalsRowCount="1">` +
			`<autoFilter ref="A1:C9"/>` +
			`<tableColumns count="3">` +
			`<tableColumn id="1" name="Region" totalsRowLabel="Total"/>` +
			`<tableColumn id="2" name="Q1" totalsRowFunction="sum"/>` +
			`<tableColumn id="3" name="Q2" totalsRowFunction="average"/>` +
			`</tableColumns>` +
			`<tableStyleInfo name="TableStyleMedium9" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>` +
			`</table>`;

		expect(parseTableXml(tableXml, "Summary")).toEqual({
			name: "SalesTable",
			displayName: "SalesTable",
			sheetName: "Summary",
			ref: "A1:C10",
			headerRowCount: 1,
			totalsRowCount: 1,
			autoFilterRef: "A1:C9",
			styleName: "TableStyleMedium9",
			columns: [
				{ id: 1, name: "Region", totalsRowLabel: "Total" },
				{ id: 2, name: "Q1", totalsRowFunction: "sum" },
				{ id: 3, name: "Q2", totalsRowFunction: "average" },
			],
		});

		expect(parseTableXml("<notATable/>", "Sheet1")).toBeNull();
	});

	it("roundtrips <definedNames> XML (parseDefinedNamesXml / serializeDefinedNamesXml)", () => {
		expect(serializeDefinedNamesXml([])).toBe("");

		const specs = [
			{ name: "TaxRate", formula: "Assumptions!$B$2", comment: "VAT rate" },
			{
				name: "_xlnm.Print_Area",
				formula: "'Sheet 1'!$A$1:$G$40",
				localSheetId: 0,
				hidden: true,
			},
		];

		const xml = serializeDefinedNamesXml(specs);
		expect(parseDefinedNamesXml(xml)).toEqual(specs);
		expect(parseDefinedNamesXml(`<workbook>${xml}</workbook>`)).toEqual(specs);

		const prefixedXml = serializeDefinedNamesXml(specs, { prefix: "x:" });
		expect(prefixedXml).toContain("<x:definedNames><x:definedName ");
		expect(prefixedXml).toContain("</x:definedName></x:definedNames>");
		expect(parseDefinedNamesXml(prefixedXml)).toEqual(specs);
		expect(serializeDefinedNamesXml(specs, "x")).toBe(prefixedXml);
	});

	it("roundtrips <dataValidations> XML including ECMA-376 showDropDown inversion", () => {
		expect(serializeDataValidationsXml([])).toBe("");

		const rules = [
			{
				sqref: "B2:B100",
				kind: "list" as const,
				formula1: '"Open,In Progress,Closed"',
				allowBlank: true,
				showDropDown: true, // In OOXML attribute this must serialize as showDropDown="0"
				promptTitle: "Status",
				prompt: "Pick a status",
			},
			{
				sqref: "C2:C100",
				kind: "decimal" as const,
				operator: "between" as const,
				formula1: "0",
				formula2: "100.5",
				allowBlank: false,
				showDropDown: false, // In OOXML attribute this must serialize as showDropDown="1"
				errorStyle: "warning" as const,
				errorTitle: "Out of range",
				error: "Enter a percentage between 0 and 100.5",
			},
		];

		const xml = serializeDataValidationsXml(rules);
		// Verify ECMA-376 §18.3.1.32 inversion in raw XML attributes
		expect(xml).toContain('type="list" allowBlank="1" showDropDown="0"');
		expect(xml).toContain('type="decimal" operator="between" allowBlank="0" showDropDown="1"');

		expect(parseDataValidationsXml(xml)).toEqual(rules);
		expect(parseDataValidationsXml(`<worksheet>${xml}</worksheet>`)).toEqual(rules);

		const prefixedXml = serializeDataValidationsXml(rules, { prefix: "x:" });
		expect(prefixedXml).toContain('<x:dataValidations count="2"><x:dataValidation ');
		expect(prefixedXml).toContain("<x:formula1>");
		expect(prefixedXml).toContain("<x:formula2>100.5</x:formula2>");
		expect(prefixedXml).toContain("</x:dataValidation></x:dataValidations>");
		expect(parseDataValidationsXml(prefixedXml)).toEqual(rules);
		expect(serializeDataValidationsXml(rules, "x")).toBe(prefixedXml);
	});

	it("roundtrips <hyperlinks> XML with external relationships and internal locations", () => {
		expect(serializeHyperlinksXml([])).toEqual({ xml: "", relationships: [] });

		const entries = [
			{
				ref: "$a$1",
				link: {
					target: "https://example.com/report?id=1&v=2",
					display: "Example Report",
					tooltip: "Open in browser",
				},
			},
			{
				ref: "b2",
				link: {
					location: "'Details'!A1",
					display: "Go to Details",
				},
			},
		];

		const serialized = serializeHyperlinksXml(entries, 5);
		expect(serialized.relationships).toEqual([
			{
				id: "rId5",
				type: `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink`,
				target: "https://example.com/report?id=1&v=2",
				targetMode: "External",
			},
		]);

		const parsed = parseHyperlinksXml(
			`<worksheet>${serialized.xml}</worksheet>`,
			serialized.relationships,
		);
		expect(parsed).toEqual([
			{
				ref: "A1",
				relId: "rId5",
				link: {
					target: "https://example.com/report?id=1&v=2",
					display: "Example Report",
					tooltip: "Open in browser",
				},
			},
			{
				ref: "B2",
				link: {
					location: "'Details'!A1",
					display: "Go to Details",
				},
			},
		]);

		const prefixedSerialized = serializeHyperlinksXml(entries, 5, { prefix: "x:" });
		expect(prefixedSerialized.xml).toContain('<x:hyperlinks><x:hyperlink ref="A1" r:id="rId5"');
		expect(prefixedSerialized.xml).toContain("</x:hyperlinks>");
		expect(parseHyperlinksXml(prefixedSerialized.xml, prefixedSerialized.relationships)).toEqual(
			parsed,
		);
		expect(serializeHyperlinksXml(entries, 5, "x").xml).toBe(prefixedSerialized.xml);
	});

	it("parses classic comments (parseCommentsXml) and threaded comments (parseThreadedCommentsXml) without leaking self-closing state", () => {
		const classicXml =
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
			`<comments xmlns="${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main">` +
			`<authors><author>Alice</author><author>Bob</author></authors>` +
			`<commentList>` +
			`<comment ref="$a$1" authorId="0"><text><t>Plain comment</t></text></comment>` +
			`<comment ref="B2" authorId="1"><text><r><t>Alice: </t></r><r><t>Check variance</t></r></text></comment>` +
			`</commentList>` +
			`</comments>`;

		const classic = parseCommentsXml(classicXml);
		expect(classic.get("A1")).toEqual({ author: "Alice", text: "Plain comment" });
		expect(classic.get("B2")).toEqual({ author: "Bob", text: "Alice: Check variance" });

		const personsXml =
			`<personList>` +
			`<person id="{P-1}" displayName="Clara"/>` +
			`<person id="{P-2}" displayName="David"/>` +
			`</personList>`;

		// Include a self-closing <threadedComment ref="A1" personId="{P-1}"/> followed by an stray <text>
		// and subsequent real threaded comments on C3 to ensure self-closing tags never leak state!
		const threadedXml =
			`<ThreadedComments>` +
			`<threadedComment ref="A1" personId="{P-1}"/>` +
			`<text>Leaked text outside comment</text>` +
			`<threadedComment ref="c3" personId="{P-1}"><text>First note</text></threadedComment>` +
			`<threadedComment ref="C3" personId="{P-2}"><text>Follow-up reply</text></threadedComment>` +
			`</ThreadedComments>`;

		const threaded = parseThreadedCommentsXml(threadedXml, personsXml);
		expect(threaded.has("A1")).toBe(false);
		expect(threaded.get("C3")).toEqual({
			author: "Clara",
			text: "First note\nFollow-up reply",
			threaded: true,
		});
	});
});
