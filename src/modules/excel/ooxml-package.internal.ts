import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { formatCellRef, parseCellRef } from "./coords.ts";
import { ExcelError } from "./errors.ts";
import {
	applyXmlSlicePatches,
	escapeXmlAttr,
	escapeXmlText,
	expandSelfClosingTag,
	findXmlChild,
	findXmlChildren,
	getXmlAttr,
	getXmlPrefix,
	parseXmlTree,
	scanXml,
	upsertXmlAttribute,
	xmlSpaceAttr,
	type XmlElement,
	type XmlSlicePatch,
} from "./ooxml-xml.internal.ts";
import type {
	CellComment,
	CellHyperlink,
	DataValidationRule,
	DefinedNameSpec,
	ExcelTableColumn,
	ExcelTableSpec,
} from "./types.ts";

export const DEFAULT_MAX_UNCOMPRESSED_BYTES = 128 * 1024 * 1024;
export const DEFAULT_MAX_ENTRY_BYTES = 64 * 1024 * 1024;
export const DEFAULT_MAX_ENTRY_COUNT = 4096;

const HTTP_SCHEME = ["http", "://"].join("");
const RELS_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/package/2006/relationships`;
const CONTENT_TYPES_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/package/2006/content-types`;
const OFFICE_DOC_REL_TYPE = `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument`;
const HYPERLINK_REL_TYPE = `${HTTP_SCHEME}schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink`;

const TEMPLATE_MAIN_CT =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml";
const SHEET_MAIN_CT =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";
const TEMPLATE_MACRO_CT = "application/vnd.ms-excel.template.macroEnabled.main+xml";
const SHEET_MACRO_CT = "application/vnd.ms-excel.sheet.macroEnabled.main+xml";

export interface ExtractOoxmlOptions {
	maxUncompressedBytes?: number;
	maxEntryBytes?: number;
	maxEntryCount?: number;
}

export interface PackageRelationship {
	id: string;
	type: string;
	target: string;
	targetMode?: "External" | "Internal";
}

export interface ContentTypeDefault {
	extension: string;
	contentType: string;
}

export interface ContentTypeOverride {
	partName: string;
	contentType: string;
}

export interface ContentTypesModel {
	defaults: ContentTypeDefault[];
	overrides: ContentTypeOverride[];
}

export interface WorksheetHyperlinkEntry {
	ref: string;
	link: CellHyperlink;
	relId?: string;
}

export function encodeUtf8(text: string): Uint8Array {
	return strToU8(text);
}

export function decodeUtf8(bytes: Uint8Array): string {
	return strFromU8(bytes);
}

export function normalizePackagePath(rawPath: string): string {
	const forward = rawPath.replaceAll("\\", "/").replace(/^\/+/, "");
	const segments = forward.split("/");
	const resolved: string[] = [];

	for (const segment of segments) {
		if (segment === "" || segment === ".") {
			continue;
		}
		if (segment === "..") {
			if (resolved.length === 0) {
				throw new ExcelError(
					"CORRUPT_ARCHIVE",
					`OOXML archive path escapes package root: "${rawPath}".`,
					{ details: { path: rawPath } },
				);
			}
			resolved.pop();
			continue;
		}
		resolved.push(segment);
	}

	return resolved.join("/");
}

export function resolvePackageTarget(basePartPath: string, target: string): string {
	if (target.startsWith("/") || target.startsWith("\\")) {
		return normalizePackagePath(target);
	}
	const normalizedBase = normalizePackagePath(basePartPath);
	const slashIndex = normalizedBase.lastIndexOf("/");
	const baseDir = slashIndex === -1 ? "" : normalizedBase.slice(0, slashIndex);
	const combined = baseDir.length > 0 ? `${baseDir}/${target}` : target;
	return normalizePackagePath(combined);
}

export function getRelsPathForPart(partPath: string): string {
	const normalized = normalizePackagePath(partPath);
	if (normalized.length === 0) {
		return "_rels/.rels";
	}
	const slashIndex = normalized.lastIndexOf("/");
	if (slashIndex === -1) {
		return `_rels/${normalized}.rels`;
	}
	const dir = normalized.slice(0, slashIndex);
	const file = normalized.slice(slashIndex + 1);
	return `${dir}/_rels/${file}.rels`;
}

export function findPackageEntry(
	entries: Readonly<Record<string, Uint8Array>>,
	targetPath: string,
): { path: string; bytes: Uint8Array } | undefined {
	const normalized = normalizePackagePath(targetPath);
	if (Object.hasOwn(entries, normalized)) {
		const bytes = entries[normalized];
		if (bytes) {
			return { path: normalized, bytes };
		}
	}

	const lowerTarget = normalized.toLowerCase();
	for (const [key, bytes] of Object.entries(entries)) {
		if (normalizePackagePath(key).toLowerCase() !== lowerTarget) {
			continue;
		}
		if (bytes) {
			return { path: key, bytes };
		}
	}

	return undefined;
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

function hasZipMagic(bytes: Uint8Array): boolean {
	if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
		return false;
	}
	const b2 = bytes[2];
	const b3 = bytes[3];
	return (b2 === 0x03 && b3 === 0x04) || (b2 === 0x05 && b3 === 0x06);
}

export function extractOoxmlPackage(
	input: Uint8Array | ArrayBuffer,
	options?: ExtractOoxmlOptions,
): Record<string, Uint8Array> {
	const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
	if (!hasZipMagic(bytes)) {
		throw new ExcelError("CORRUPT_ARCHIVE", "Input bytes are not a valid ZIP/OOXML archive.");
	}

	const maxUncompressedBytes =
		options?.maxUncompressedBytes ?? DEFAULT_MAX_UNCOMPRESSED_BYTES;
	const maxEntryBytes = options?.maxEntryBytes ?? DEFAULT_MAX_ENTRY_BYTES;
	const maxEntryCount = options?.maxEntryCount ?? DEFAULT_MAX_ENTRY_COUNT;

	let entryCount = 0;
	let declaredTotalBytes = 0;
	let extracted: Record<string, Uint8Array>;

	try {
		extracted = unzipSync(bytes, {
			filter(file) {
				entryCount += 1;
				if (entryCount > maxEntryCount) {
					throw new ExcelError(
						"LIMIT_EXCEEDED",
						`ZIP archive exceeds maxEntryCount (${maxEntryCount}).`,
						{ details: { maxEntryCount } },
					);
				}

				// Validate ZIP entry paths eagerly so root-escaping names never inflate.
				normalizePackagePath(file.name);

				if (file.originalSize > maxEntryBytes) {
					throw new ExcelError(
						"LIMIT_EXCEEDED",
						`ZIP entry "${file.name}" exceeds maxEntryBytes (${maxEntryBytes}).`,
						{ details: { entry: file.name, size: file.originalSize, maxEntryBytes } },
					);
				}

				declaredTotalBytes += file.originalSize;
				if (declaredTotalBytes > maxUncompressedBytes) {
					throw new ExcelError(
						"LIMIT_EXCEEDED",
						`ZIP archive declared size exceeds maxUncompressedBytes (${maxUncompressedBytes}).`,
						{ details: { maxUncompressedBytes } },
					);
				}

				return !file.name.endsWith("/");
			},
		});
	} catch (error) {
		if (error instanceof ExcelError) {
			throw error;
		}
		throw new ExcelError("CORRUPT_ARCHIVE", "Failed to decompress OOXML ZIP archive.", {
			cause: error,
		});
	}

	// Re-verify actual inflated byte lengths to catch spoofed ZIP header sizes.
	let actualTotalBytes = 0;
	const normalizedArchive: Record<string, Uint8Array> = Object.create(null) as Record<
		string,
		Uint8Array
	>;

	for (const [rawName, entryBytes] of Object.entries(extracted)) {
		if (entryBytes.byteLength > maxEntryBytes) {
			throw new ExcelError(
				"LIMIT_EXCEEDED",
				`Inflated ZIP entry "${rawName}" exceeds maxEntryBytes (${maxEntryBytes}).`,
				{ details: { entry: rawName, size: entryBytes.byteLength, maxEntryBytes } },
			);
		}
		actualTotalBytes += entryBytes.byteLength;
		if (actualTotalBytes > maxUncompressedBytes) {
			throw new ExcelError(
				"LIMIT_EXCEEDED",
				`Inflated ZIP archive exceeds maxUncompressedBytes (${maxUncompressedBytes}).`,
				{ details: { actualTotalBytes, maxUncompressedBytes } },
			);
		}
		const normalizedName = normalizePackagePath(rawName);
		if (normalizedName.length > 0) {
			normalizedArchive[normalizedName] = entryBytes;
		}
	}

	return normalizedArchive;
}

export function packOoxmlPackage(
	entries: Readonly<Record<string, Uint8Array>>,
	compressionLevel: 0 | 1 | 6 | 9 = 6,
): Uint8Array {
	const clean: Record<string, Uint8Array> = {};
	for (const [path, data] of Object.entries(entries)) {
		clean[normalizePackagePath(path)] = data;
	}
	return zipSync(clean, { level: compressionLevel });
}

export function parseRelationshipsXml(xml: string): PackageRelationship[] {
	const root = parseXmlTree(xml);
	if (!root) {
		return [];
	}

	const rels: PackageRelationship[] = [];
	for (const el of findXmlChildren(root, "Relationship")) {
		const id = getXmlAttr(el.attrs, "Id");
		const type = getXmlAttr(el.attrs, "Type");
		const target = getXmlAttr(el.attrs, "Target");
		if (!id || !type || target === undefined) {
			continue;
		}
		const targetModeRaw = getXmlAttr(el.attrs, "TargetMode");
		const rel: PackageRelationship = { id, type, target };
		if (targetModeRaw === "External" || targetModeRaw === "Internal") {
			rel.targetMode = targetModeRaw;
		}
		rels.push(rel);
	}
	return rels;
}

export function findRelationshipsByType(
	rels: readonly PackageRelationship[],
	typeOrSuffix: string,
): PackageRelationship[] {
	const suffix = `/${typeOrSuffix}`;
	return rels.filter((rel) => rel.type === typeOrSuffix || rel.type.endsWith(suffix));
}

function normalizeXmlPrefix(prefix?: string): string {
	if (!prefix) {
		return "";
	}
	const trimmed = prefix.trim();
	if (trimmed.length === 0) {
		return "";
	}
	return trimmed.endsWith(":") ? trimmed : `${trimmed}:`;
}

function serializeRelationshipTag(rel: PackageRelationship, prefix = ""): string {
	const p = normalizeXmlPrefix(prefix);
	const modeAttr = rel.targetMode ? ` TargetMode="${escapeXmlAttr(rel.targetMode)}"` : "";
	return `<${p}Relationship Id="${escapeXmlAttr(rel.id)}" Type="${escapeXmlAttr(rel.type)}" Target="${escapeXmlAttr(rel.target)}"${modeAttr}/>`;
}

export function serializeRelationshipsXml(rels: readonly PackageRelationship[]): string {
	const body = rels.map((rel) => serializeRelationshipTag(rel)).join("");
	return (
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		`<Relationships xmlns="${RELS_NS}">${body}</Relationships>`
	);
}

export function appendRelationshipsXml(
	xml: string,
	additions: readonly PackageRelationship[],
): string {
	if (additions.length === 0) {
		return xml;
	}
	const root = parseXmlTree(xml);
	if (!root) {
		return serializeRelationshipsXml(additions);
	}
	const existingIds = new Set(
		findXmlChildren(root, "Relationship")
			.map((el) => getXmlAttr(el.attrs, "Id"))
			.filter((id): id is string => id !== undefined),
	);
	const toAdd = additions.filter((rel) => !existingIds.has(rel.id));
	if (toAdd.length === 0) {
		return xml;
	}
	const prefix = getXmlPrefix(root.rawName);
	const additionXml = toAdd.map((rel) => serializeRelationshipTag(rel, prefix)).join("");
	if (root.selfClosing) {
		const openTag = xml.slice(root.openStart, root.openEnd);
		return applyXmlSlicePatches(xml, [
			{
				start: root.openStart,
				end: root.openEnd,
				replacement: expandSelfClosingTag(openTag, additionXml),
			},
		]);
	}
	return applyXmlSlicePatches(xml, [
		{ start: root.closeStart, end: root.closeStart, replacement: additionXml },
	]);
}

export function removeRelationshipsByTarget(
	xml: string,
	basePartPath: string,
	targetPartPath: string,
): string {
	const root = parseXmlTree(xml);
	if (!root) {
		return xml;
	}
	const normalizedTarget = normalizePackagePath(targetPartPath).toLowerCase();
	const patches: XmlSlicePatch[] = [];

	for (const el of findXmlChildren(root, "Relationship")) {
		const target = getXmlAttr(el.attrs, "Target");
		const targetMode = getXmlAttr(el.attrs, "TargetMode");
		if (!target || targetMode === "External") {
			continue;
		}
		let resolved: string;
		try {
			resolved = resolvePackageTarget(basePartPath, target).toLowerCase();
		} catch {
			continue;
		}
		if (resolved === normalizedTarget) {
			patches.push({ start: el.openStart, end: el.closeEnd, replacement: "" });
		}
	}

	return applyXmlSlicePatches(xml, patches);
}

export function resolveWorkbookPartPath(
	entries: Readonly<Record<string, Uint8Array>>,
): string {
	const rootRelsEntry = findPackageEntry(entries, "_rels/.rels");
	if (rootRelsEntry) {
		const rels = parseRelationshipsXml(decodeUtf8(rootRelsEntry.bytes));
		const docRel =
			rels.find((rel) => rel.type === OFFICE_DOC_REL_TYPE) ??
			findRelationshipsByType(rels, "officeDocument")[0];
		if (docRel) {
			return resolvePackageTarget("", docRel.target);
		}
	}

	const fallback = findPackageEntry(entries, "xl/workbook.xml");
	if (fallback) {
		return fallback.path;
	}

	throw new ExcelError("CORRUPT_ARCHIVE", "OOXML package does not contain a workbook part.");
}

export function parseContentTypesXml(xml: string): ContentTypesModel {
	const root = parseXmlTree(xml);
	if (!root) {
		return { defaults: [], overrides: [] };
	}

	const defaults: ContentTypeDefault[] = [];
	const overrides: ContentTypeOverride[] = [];

	for (const el of root.children) {
		if (el.localName === "Default") {
			const extension = getXmlAttr(el.attrs, "Extension");
			const contentType = getXmlAttr(el.attrs, "ContentType");
			if (extension && contentType) {
				defaults.push({ extension, contentType });
			}
		} else if (el.localName === "Override") {
			const partName = getXmlAttr(el.attrs, "PartName");
			const contentType = getXmlAttr(el.attrs, "ContentType");
			if (partName && contentType) {
				overrides.push({ partName, contentType });
			}
		}
	}

	return { defaults, overrides };
}

export function serializeContentTypesXml(model: ContentTypesModel): string {
	const parts: string[] = [
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
		`<Types xmlns="${CONTENT_TYPES_NS}">`,
	];
	for (const def of model.defaults) {
		parts.push(
			`<Default Extension="${escapeXmlAttr(def.extension)}" ContentType="${escapeXmlAttr(def.contentType)}"/>`,
		);
	}
	for (const ovr of model.overrides) {
		parts.push(
			`<Override PartName="${escapeXmlAttr(ovr.partName)}" ContentType="${escapeXmlAttr(ovr.contentType)}"/>`,
		);
	}
	parts.push("</Types>");
	return parts.join("");
}

export function convertTemplateToWorkbookContentTypes(xml: string): string {
	const root = parseXmlTree(xml);
	if (!root) {
		return xml;
	}

	const patches: XmlSlicePatch[] = [];
	for (const el of findXmlChildren(root, "Override")) {
		const ct = getXmlAttr(el.attrs, "ContentType");
		let replacementCt: string | undefined;
		if (ct === TEMPLATE_MAIN_CT) {
			replacementCt = SHEET_MAIN_CT;
		} else if (ct === TEMPLATE_MACRO_CT) {
			replacementCt = SHEET_MACRO_CT;
		}
		if (replacementCt) {
			const openTag = xml.slice(el.openStart, el.openEnd);
			patches.push({
				start: el.openStart,
				end: el.openEnd,
				replacement: upsertXmlAttribute(openTag, "ContentType", replacementCt),
			});
		}
	}

	return applyXmlSlicePatches(xml, patches);
}

function normalizeContentTypePartName(partName: string): string {
	return `/${normalizePackagePath(partName)}`.toLowerCase();
}

export function removeContentTypeOverride(xml: string, partName: string): string {
	const root = parseXmlTree(xml);
	if (!root) {
		return xml;
	}
	const target = normalizeContentTypePartName(partName);
	const patches: XmlSlicePatch[] = [];

	for (const el of findXmlChildren(root, "Override")) {
		const rawPartName = getXmlAttr(el.attrs, "PartName");
		if (!rawPartName) {
			continue;
		}
		if (normalizeContentTypePartName(rawPartName) === target) {
			patches.push({ start: el.openStart, end: el.closeEnd, replacement: "" });
		}
	}

	return applyXmlSlicePatches(xml, patches);
}

export function ensureContentTypeOverride(
	xml: string,
	partName: string,
	contentType: string,
): string {
	const root = parseXmlTree(xml);
	const formattedPart = `/${normalizePackagePath(partName)}`;
	if (!root) {
		return serializeContentTypesXml({
			defaults: [],
			overrides: [{ partName: formattedPart, contentType }],
		});
	}

	const targetLower = formattedPart.toLowerCase();
	for (const el of findXmlChildren(root, "Override")) {
		const existing = getXmlAttr(el.attrs, "PartName");
		if (existing && normalizeContentTypePartName(existing) === targetLower) {
			const openTag = xml.slice(el.openStart, el.openEnd);
			return applyXmlSlicePatches(xml, [
				{
					start: el.openStart,
					end: el.openEnd,
					replacement: upsertXmlAttribute(openTag, "ContentType", contentType),
				},
			]);
		}
	}

	const prefix = getXmlPrefix(root.rawName);
	const addition = `<${prefix}Override PartName="${escapeXmlAttr(formattedPart)}" ContentType="${escapeXmlAttr(contentType)}"/>`;
	if (root.selfClosing) {
		const openTag = xml.slice(root.openStart, root.openEnd);
		return applyXmlSlicePatches(xml, [
			{
				start: root.openStart,
				end: root.openEnd,
				replacement: expandSelfClosingTag(openTag, addition),
			},
		]);
	}
	return applyXmlSlicePatches(xml, [
		{ start: root.closeStart, end: root.closeStart, replacement: addition },
	]);
}

function tryNormalizeCellKey(ref: string | undefined): string | undefined {
	if (!ref) {
		return undefined;
	}
	try {
		const parsed = parseCellRef(ref);
		return formatCellRef(parsed.col, parsed.row);
	} catch {
		return ref.toUpperCase();
	}
}

export function removeCalcChainEntries(
	calcChainXml: string,
	sheetId: string,
	cellRefs?: ReadonlySet<string>,
): { xml: string; remainingCount: number } {
	const root = parseXmlTree(calcChainXml);
	if (!root) {
		return { xml: calcChainXml, remainingCount: 0 };
	}

	const normalizedRefs = cellRefs
		? new Set(
				Array.from(cellRefs, (ref) => tryNormalizeCellKey(ref) ?? ref.toUpperCase()),
			)
		: undefined;

	let activeSheetId = "";
	let previousSurvivingSheetId = "";
	let remainingCount = 0;
	const patches: XmlSlicePatch[] = [];

	for (const el of findXmlChildren(root, "c")) {
		const explicitSheetId = getXmlAttr(el.attrs, "i");
		if (explicitSheetId !== undefined) {
			activeSheetId = explicitSheetId;
		}
		const ref = tryNormalizeCellKey(getXmlAttr(el.attrs, "r"));
		const matchesSheet = activeSheetId === sheetId;
		const matchesRef = !normalizedRefs || (ref !== undefined && normalizedRefs.has(ref));

		if (matchesSheet && matchesRef) {
			patches.push({ start: el.openStart, end: el.closeEnd, replacement: "" });
			continue;
		}

		remainingCount += 1;
		// Preserve omitted `i` inheritance per ECMA-376 §18.6.1 when preceding entries are stripped.
		if (explicitSheetId === undefined && activeSheetId !== previousSurvivingSheetId && activeSheetId.length > 0) {
			const openTag = calcChainXml.slice(el.openStart, el.openEnd);
			patches.push({
				start: el.openStart,
				end: el.openEnd,
				replacement: upsertXmlAttribute(openTag, "i", activeSheetId),
			});
		}
		previousSurvivingSheetId = activeSheetId;
	}

	return {
		xml: applyXmlSlicePatches(calcChainXml, patches),
		remainingCount,
	};
}

export function stripCalcChainFromPackage(
	entries: Record<string, Uint8Array>,
	workbookPartPath = "xl/workbook.xml",
): void {
	const normalizedWorkbookPath = normalizePackagePath(workbookPartPath);
	const wbRelsPath = getRelsPathForPart(normalizedWorkbookPath);
	const wbRelsEntry = findPackageEntry(entries, wbRelsPath);

	let calcChainPath = "xl/calcChain.xml";
	if (wbRelsEntry) {
		const relsXml = decodeUtf8(wbRelsEntry.bytes);
		const rels = parseRelationshipsXml(relsXml);
		const calcRel = findRelationshipsByType(rels, "calcChain")[0];
		if (calcRel) {
			calcChainPath = resolvePackageTarget(normalizedWorkbookPath, calcRel.target);
			const updatedRels = removeRelationshipsByTarget(
				relsXml,
				normalizedWorkbookPath,
				calcChainPath,
			);
			entries[wbRelsEntry.path] = encodeUtf8(updatedRels);
		}
	}

	const calcEntry = findPackageEntry(entries, calcChainPath);
	if (calcEntry) {
		delete entries[calcEntry.path];
	}

	const contentTypesEntry = findPackageEntry(entries, "[Content_Types].xml");
	if (contentTypesEntry) {
		const updatedCt = removeContentTypeOverride(
			decodeUtf8(contentTypesEntry.bytes),
			calcChainPath,
		);
		entries[contentTypesEntry.path] = encodeUtf8(updatedCt);
	}
}

export function parseTableXml(xml: string, sheetName: string): ExcelTableSpec | null {
	const root = parseXmlTree(xml);
	if (!root || root.localName !== "table") {
		return null;
	}

	const name = getXmlAttr(root.attrs, "name") ?? getXmlAttr(root.attrs, "displayName");
	const ref = getXmlAttr(root.attrs, "ref");
	if (!name || !ref) {
		return null;
	}

	const displayName = getXmlAttr(root.attrs, "displayName");
	const headerRowAttr = getXmlAttr(root.attrs, "headerRowCount");
	const totalsRowAttr = getXmlAttr(root.attrs, "totalsRowCount");

	const autoFilterEl = findXmlChild(root, "autoFilter");
	const autoFilterRef = autoFilterEl ? getXmlAttr(autoFilterEl.attrs, "ref") : undefined;

	const styleEl = findXmlChild(root, "tableStyleInfo");
	const styleName = styleEl ? getXmlAttr(styleEl.attrs, "name") : undefined;

	const columnsEl = findXmlChild(root, "tableColumns");
	const columns: ExcelTableColumn[] = [];
	if (columnsEl) {
		for (const colEl of findXmlChildren(columnsEl, "tableColumn")) {
			const id = parseSafeIntAttr(getXmlAttr(colEl.attrs, "id"));
			const colName = getXmlAttr(colEl.attrs, "name");
			if (id === undefined || colName === undefined) {
				continue;
			}
			const column: ExcelTableColumn = { id, name: colName };
			const totalsFn = getXmlAttr(colEl.attrs, "totalsRowFunction");
			const totalsLabel = getXmlAttr(colEl.attrs, "totalsRowLabel");
			if (totalsFn) {
				column.totalsRowFunction = totalsFn;
			}
			if (totalsLabel !== undefined) {
				column.totalsRowLabel = totalsLabel;
			}
			columns.push(column);
		}
	}

	const spec: ExcelTableSpec = {
		name,
		sheetName,
		ref,
		columns,
	};
	if (displayName) {
		spec.displayName = displayName;
	}
	const headerRowCount = parseSafeIntAttr(headerRowAttr);
	if (headerRowCount !== undefined) {
		spec.headerRowCount = headerRowCount;
	}
	const totalsRowCount = parseSafeIntAttr(totalsRowAttr);
	if (totalsRowCount !== undefined) {
		spec.totalsRowCount = totalsRowCount;
	}
	if (autoFilterRef) {
		spec.autoFilterRef = autoFilterRef;
	}
	if (styleName) {
		spec.styleName = styleName;
	}
	return spec;
}

export function parseDefinedNamesXml(xml: string): DefinedNameSpec[] {
	const root = parseXmlTree(xml);
	if (!root) {
		return [];
	}

	const elements =
		root.localName === "definedNames"
			? findXmlChildren(root, "definedName")
			: (() => {
					const container = findXmlChild(root, "definedNames");
					return container ? findXmlChildren(container, "definedName") : [];
				})();

	const names: DefinedNameSpec[] = [];
	for (const el of elements) {
		const name = getXmlAttr(el.attrs, "name");
		if (!name) {
			continue;
		}
		const spec: DefinedNameSpec = {
			name,
			formula: el.text,
		};
		const localSheetId = parseSafeIntAttr(getXmlAttr(el.attrs, "localSheetId"));
		if (localSheetId !== undefined) {
			spec.localSheetId = localSheetId;
		}
		const comment = getXmlAttr(el.attrs, "comment");
		if (comment !== undefined) {
			spec.comment = comment;
		}
		const hidden = getXmlAttr(el.attrs, "hidden");
		if (hidden === "1" || hidden?.toLowerCase() === "true") {
			spec.hidden = true;
		}
		names.push(spec);
	}
	return names;
}

export function serializeDefinedNamesXml(
	names: readonly DefinedNameSpec[],
	options?: string | { prefix?: string },
): string {
	if (names.length === 0) {
		return "";
	}
	const p = normalizeXmlPrefix(typeof options === "string" ? options : options?.prefix);
	const parts: string[] = [`<${p}definedNames>`];
	for (const item of names) {
		const attrs: string[] = [`name="${escapeXmlAttr(item.name)}"`];
		if (item.localSheetId !== undefined) {
			attrs.push(`localSheetId="${item.localSheetId}"`);
		}
		if (item.comment !== undefined) {
			attrs.push(`comment="${escapeXmlAttr(item.comment)}"`);
		}
		if (item.hidden) {
			attrs.push('hidden="1"');
		}
		parts.push(`<${p}definedName ${attrs.join(" ")}>${escapeXmlText(item.formula)}</${p}definedName>`);
	}
	parts.push(`</${p}definedNames>`);
	return parts.join("");
}

const VALIDATION_KINDS = new Set<DataValidationRule["kind"]>([
	"list",
	"whole",
	"decimal",
	"date",
	"textLength",
	"custom",
]);

const VALIDATION_OPERATORS = new Set<NonNullable<DataValidationRule["operator"]>>([
	"between",
	"notBetween",
	"equal",
	"notEqual",
	"greaterThan",
	"lessThan",
	"greaterThanOrEqual",
	"lessThanOrEqual",
]);

const VALIDATION_ERROR_STYLES = new Set<NonNullable<DataValidationRule["errorStyle"]>>([
	"stop",
	"warning",
	"information",
]);

function parseOoxmlBoolAttr(value: string | undefined): boolean | undefined {
	if (value === undefined) {
		return undefined;
	}
	const lower = value.toLowerCase();
	if (lower === "1" || lower === "true") {
		return true;
	}
	if (lower === "0" || lower === "false") {
		return false;
	}
	return undefined;
}

export function parseDataValidationsXml(xml: string): DataValidationRule[] {
	const root = parseXmlTree(xml);
	if (!root) {
		return [];
	}

	const container =
		root.localName === "dataValidations" ? root : findXmlChild(root, "dataValidations");
	if (!container) {
		return [];
	}

	const rules: DataValidationRule[] = [];
	for (const el of findXmlChildren(container, "dataValidation")) {
		const sqref = getXmlAttr(el.attrs, "sqref");
		const typeRaw = getXmlAttr(el.attrs, "type") ?? "custom";
		if (!sqref || !VALIDATION_KINDS.has(typeRaw as DataValidationRule["kind"])) {
			continue;
		}

		const formula1El = findXmlChild(el, "formula1");
		const formula2El = findXmlChild(el, "formula2");
		const rule: DataValidationRule = {
			sqref,
			kind: typeRaw as DataValidationRule["kind"],
			formula1: formula1El ? formula1El.text : "",
		};

		if (formula2El) {
			rule.formula2 = formula2El.text;
		}
		const operator = getXmlAttr(el.attrs, "operator");
		if (operator && VALIDATION_OPERATORS.has(operator as NonNullable<DataValidationRule["operator"]>)) {
			rule.operator = operator as DataValidationRule["operator"];
		}
		const allowBlank = parseOoxmlBoolAttr(getXmlAttr(el.attrs, "allowBlank"));
		if (allowBlank !== undefined) {
			rule.allowBlank = allowBlank;
		}
		// ECMA-376 §18.3.1.32 inverts `showDropDown`: "1" suppresses the list arrow, "0" shows it.
		const suppressDropDown = parseOoxmlBoolAttr(getXmlAttr(el.attrs, "showDropDown"));
		if (suppressDropDown !== undefined) {
			rule.showDropDown = !suppressDropDown;
		}
		const promptTitle = getXmlAttr(el.attrs, "promptTitle");
		if (promptTitle !== undefined) {
			rule.promptTitle = promptTitle;
		}
		const prompt = getXmlAttr(el.attrs, "prompt");
		if (prompt !== undefined) {
			rule.prompt = prompt;
		}
		const errorTitle = getXmlAttr(el.attrs, "errorTitle");
		if (errorTitle !== undefined) {
			rule.errorTitle = errorTitle;
		}
		const error = getXmlAttr(el.attrs, "error");
		if (error !== undefined) {
			rule.error = error;
		}
		const errorStyle = getXmlAttr(el.attrs, "errorStyle");
		if (
			errorStyle &&
			VALIDATION_ERROR_STYLES.has(errorStyle as NonNullable<DataValidationRule["errorStyle"]>)
		) {
			rule.errorStyle = errorStyle as DataValidationRule["errorStyle"];
		}
		rules.push(rule);
	}
	return rules;
}

export function serializeDataValidationsXml(
	rules: readonly DataValidationRule[],
	options?: string | { prefix?: string },
): string {
	if (rules.length === 0) {
		return "";
	}
	const p = normalizeXmlPrefix(typeof options === "string" ? options : options?.prefix);
	const parts: string[] = [`<${p}dataValidations count="${rules.length}">`];
	for (const rule of rules) {
		const attrs: string[] = [`type="${escapeXmlAttr(rule.kind)}"`];
		if (rule.operator) {
			attrs.push(`operator="${escapeXmlAttr(rule.operator)}"`);
		}
		if (rule.allowBlank !== undefined) {
			attrs.push(`allowBlank="${rule.allowBlank ? "1" : "0"}"`);
		}
		if (rule.showDropDown !== undefined) {
			attrs.push(`showDropDown="${rule.showDropDown ? "0" : "1"}"`);
		}
		if (rule.errorStyle) {
			attrs.push(`errorStyle="${escapeXmlAttr(rule.errorStyle)}"`);
		}
		if (rule.promptTitle !== undefined) {
			attrs.push(`promptTitle="${escapeXmlAttr(rule.promptTitle)}"`);
		}
		if (rule.prompt !== undefined) {
			attrs.push(`prompt="${escapeXmlAttr(rule.prompt)}"`);
		}
		if (rule.errorTitle !== undefined) {
			attrs.push(`errorTitle="${escapeXmlAttr(rule.errorTitle)}"`);
		}
		if (rule.error !== undefined) {
			attrs.push(`error="${escapeXmlAttr(rule.error)}"`);
		}
		if (rule.prompt !== undefined || rule.promptTitle !== undefined) {
			attrs.push('showInputMessage="1"');
		}
		if (rule.error !== undefined || rule.errorTitle !== undefined) {
			attrs.push('showErrorMessage="1"');
		}
		attrs.push(`sqref="${escapeXmlAttr(rule.sqref)}"`);

		parts.push(
			`<${p}dataValidation ${attrs.join(" ")}>`,
			`<${p}formula1${xmlSpaceAttr(rule.formula1)}>${escapeXmlText(rule.formula1)}</${p}formula1>`,
		);
		if (rule.formula2 !== undefined) {
			parts.push(
				`<${p}formula2${xmlSpaceAttr(rule.formula2)}>${escapeXmlText(rule.formula2)}</${p}formula2>`,
			);
		}
		parts.push(`</${p}dataValidation>`);
	}
	parts.push(`</${p}dataValidations>`);
	return parts.join("");
}

export function parseHyperlinksXml(
	xml: string,
	sheetRels: readonly PackageRelationship[] = [],
): WorksheetHyperlinkEntry[] {
	const root = parseXmlTree(xml);
	if (!root) {
		return [];
	}

	const container = root.localName === "hyperlinks" ? root : findXmlChild(root, "hyperlinks");
	if (!container) {
		return [];
	}

	const relById = new Map<string, PackageRelationship>();
	for (const rel of sheetRels) {
		relById.set(rel.id, rel);
	}

	const entries: WorksheetHyperlinkEntry[] = [];
	for (const el of findXmlChildren(container, "hyperlink")) {
		const rawRef = getXmlAttr(el.attrs, "ref");
		if (!rawRef) {
			continue;
		}
		const ref = tryNormalizeCellKey(rawRef) ?? rawRef.toUpperCase();
		const relId = getXmlAttr(el.attrs, "id");
		const location = getXmlAttr(el.attrs, "location");
		const display = getXmlAttr(el.attrs, "display");
		const tooltip = getXmlAttr(el.attrs, "tooltip");

		const link: CellHyperlink = {};
		if (relId) {
			const rel = relById.get(relId);
			if (rel) {
				link.target = rel.target;
			}
		}
		if (location !== undefined) {
			link.location = location;
		}
		if (display !== undefined) {
			link.display = display;
		}
		if (tooltip !== undefined) {
			link.tooltip = tooltip;
		}

		entries.push(relId ? { ref, link, relId } : { ref, link });
	}
	return entries;
}

export function serializeHyperlinksXml(
	entries: ReadonlyArray<{ ref: string; link: CellHyperlink }>,
	startRelIdNum = 1,
	options?: string | { prefix?: string },
): { xml: string; relationships: PackageRelationship[] } {
	if (entries.length === 0) {
		return { xml: "", relationships: [] };
	}

	const p = normalizeXmlPrefix(typeof options === "string" ? options : options?.prefix);
	const parts: string[] = [`<${p}hyperlinks>`];
	const relationships: PackageRelationship[] = [];
	let nextRelNum = startRelIdNum;

	for (const entry of entries) {
		const ref = tryNormalizeCellKey(entry.ref) ?? entry.ref.toUpperCase();
		const attrs: string[] = [`ref="${escapeXmlAttr(ref)}"`];
		if (entry.link.target) {
			const relId = `rId${nextRelNum}`;
			nextRelNum += 1;
			attrs.push(`r:id="${relId}"`);
			relationships.push({
				id: relId,
				type: HYPERLINK_REL_TYPE,
				target: entry.link.target,
				targetMode: "External",
			});
		}
		if (entry.link.location !== undefined) {
			attrs.push(`location="${escapeXmlAttr(entry.link.location)}"`);
		}
		if (entry.link.display !== undefined) {
			attrs.push(`display="${escapeXmlAttr(entry.link.display)}"`);
		}
		if (entry.link.tooltip !== undefined) {
			attrs.push(`tooltip="${escapeXmlAttr(entry.link.tooltip)}"`);
		}
		parts.push(`<${p}hyperlink ${attrs.join(" ")}/>`);
	}

	parts.push(`</${p}hyperlinks>`);
	return { xml: parts.join(""), relationships };
}

function collectCommentText(textEl: XmlElement | undefined): string {
	if (!textEl) {
		return "";
	}
	const directT = findXmlChild(textEl, "t");
	if (directT) {
		return directT.text;
	}
	const runs = findXmlChildren(textEl, "r");
	if (runs.length > 0) {
		return runs
			.map((run) => findXmlChild(run, "t")?.text ?? "")
			.join("");
	}
	return textEl.text;
}

export function parseCommentsXml(xml: string): Map<string, CellComment> {
	const comments = new Map<string, CellComment>();
	const root = parseXmlTree(xml);
	if (!root) {
		return comments;
	}

	const authorsEl = findXmlChild(root, "authors");
	const authors = authorsEl ? findXmlChildren(authorsEl, "author").map((a) => a.text) : [];

	const listEl = findXmlChild(root, "commentList");
	if (!listEl) {
		return comments;
	}

	for (const commentEl of findXmlChildren(listEl, "comment")) {
		const rawRef = getXmlAttr(commentEl.attrs, "ref");
		if (!rawRef) {
			continue;
		}
		const ref = tryNormalizeCellKey(rawRef) ?? rawRef.toUpperCase();
		const authorId = parseSafeIntAttr(getXmlAttr(commentEl.attrs, "authorId"));
		let author: string | undefined;
		if (authorId !== undefined && authorId >= 0) {
			author = authors[authorId];
		}
		const text = collectCommentText(findXmlChild(commentEl, "text"));

		const entry: CellComment = author ? { author, text } : { text };
		comments.set(ref, entry);
	}

	return comments;
}

function parsePersonsLookup(personsXml: string | undefined): Map<string, string> {
	const lookup = new Map<string, string>();
	if (!personsXml) {
		return lookup;
	}
	const root = parseXmlTree(personsXml);
	if (!root) {
		return lookup;
	}
	for (const personEl of findXmlChildren(root, "person")) {
		const id = getXmlAttr(personEl.attrs, "id");
		const displayName = getXmlAttr(personEl.attrs, "displayName");
		if (id && displayName) {
			lookup.set(id, displayName);
		}
	}
	return lookup;
}

export function parseThreadedCommentsXml(
	xml: string,
	personsXml?: string,
): Map<string, CellComment> {
	const comments = new Map<string, CellComment>();
	const persons = parsePersonsLookup(personsXml);

	let activeRef: string | undefined;
	let activePersonId: string | undefined;
	let inText = false;
	let textBuffer = "";

	scanXml(xml, {
		onOpenTag(tag) {
			if (tag.localName === "threadedComment") {
				if (tag.selfClosing) {
					activeRef = undefined;
					activePersonId = undefined;
					textBuffer = "";
					return;
				}
				const rawRef = getXmlAttr(tag.attrs, "ref");
				activeRef = rawRef ? (tryNormalizeCellKey(rawRef) ?? rawRef.toUpperCase()) : undefined;
				activePersonId = getXmlAttr(tag.attrs, "personId");
				textBuffer = "";
				return;
			}
			if (activeRef !== undefined && tag.localName === "text" && !tag.selfClosing) {
				inText = true;
			}
		},
		onCloseTag(tag) {
			if (tag.localName === "text") {
				inText = false;
				return;
			}
			if (tag.localName === "threadedComment" && activeRef !== undefined) {
				const author = activePersonId ? persons.get(activePersonId) : undefined;
				const existing = comments.get(activeRef);
				if (existing) {
					existing.text = `${existing.text}\n${textBuffer}`;
				} else {
					const comment: CellComment = { text: textBuffer, threaded: true };
					if (author) {
						comment.author = author;
					}
					comments.set(activeRef, comment);
				}
				activeRef = undefined;
				activePersonId = undefined;
				textBuffer = "";
			}
		},
		onText(text) {
			if (inText) {
				textBuffer += text;
			}
		},
	});

	return comments;
}
