import type { CellRichTextRun } from "./types.ts";
import {
	applyXmlSlicePatches,
	createChunkedXmlWriter,
	escapeXmlAttr,
	escapeXmlText,
	expandSelfClosingTag,
	getXmlAttr,
	getXmlPrefix,
	scanXml,
	upsertXmlAttribute,
	xmlSpaceAttr,
	type XmlSlicePatch,
} from "./ooxml-xml.internal.ts";

const HTTP_SCHEME = ["http", "://"].join("");
const SPREADSHEET_NS = `${HTTP_SCHEME}schemas.openxmlformats.org/spreadsheetml/2006/main`;

export interface SharedStringEntry {
	text: string;
	richText?: CellRichTextRun[];
}

export interface SharedStringsReader {
	readonly size: number;
	readonly entries: readonly SharedStringEntry[];
	get(index: number): SharedStringEntry | undefined;
}

export interface SharedStringsWriter {
	addString(text: string): number;
	addRichText(runs: readonly CellRichTextRun[]): number;
	getCount(): number;
	getUniqueCount(): number;
	toXml(): string;
	toUint8Array(): Uint8Array;
}

export interface SharedStringsParseOptions {
	resolveColor?: (attrs: Readonly<Record<string, string>>) => string | undefined;
}

function defaultResolveRgbAttr(attrs: Readonly<Record<string, string>>): string | undefined {
	const rgb = getXmlAttr(attrs, "rgb");
	if (!rgb) {
		return undefined;
	}
	const clean = rgb.trim().replace(/^#/, "").toUpperCase();
	if (/^[0-9A-F]{6}$/.test(clean)) {
		return `#${clean}`;
	}
	if (/^[0-9A-F]{8}$/.test(clean) && clean !== "00000000") {
		return `#${clean.slice(2)}`;
	}
	return undefined;
}

function isFlagEnabled(attrs: Readonly<Record<string, string>>): boolean {
	const val = getXmlAttr(attrs, "val");
	return val === undefined || val === "1" || val.toLowerCase() === "true";
}

function serializePlainSiXml(text: string, prefix = ""): string {
	return `<${prefix}si><${prefix}t${xmlSpaceAttr(text)}>${escapeXmlText(text)}</${prefix}t></${prefix}si>`;
}

function toOoxmlRgb(color: string): string {
	const clean = color.trim().replace(/^#/, "").toUpperCase();
	if (clean.length === 6) {
		return `FF${clean}`;
	}
	if (clean.length === 8) {
		return clean;
	}
	return "FF000000";
}

function serializeRichRunXml(run: CellRichTextRun, prefix = ""): string {
	const rPrParts: string[] = [];
	if (run.bold) {
		rPrParts.push(`<${prefix}b/>`);
	}
	if (run.italic) {
		rPrParts.push(`<${prefix}i/>`);
	}
	if (run.fontSize !== undefined && Number.isFinite(run.fontSize)) {
		rPrParts.push(`<${prefix}sz val="${run.fontSize}"/>`);
	}
	if (run.fg) {
		rPrParts.push(`<${prefix}color rgb="${escapeXmlAttr(toOoxmlRgb(run.fg))}"/>`);
	}
	if (run.fontFamily) {
		rPrParts.push(`<${prefix}rFont val="${escapeXmlAttr(run.fontFamily)}"/>`);
	}
	const rPrXml = rPrParts.length > 0 ? `<${prefix}rPr>${rPrParts.join("")}</${prefix}rPr>` : "";
	return `<${prefix}r>${rPrXml}<${prefix}t${xmlSpaceAttr(run.text)}>${escapeXmlText(run.text)}</${prefix}t></${prefix}r>`;
}

function serializeRichSiXml(runs: readonly CellRichTextRun[], prefix = ""): string {
	return `<${prefix}si>${runs.map((run) => serializeRichRunXml(run, prefix)).join("")}</${prefix}si>`;
}

function richRunsKey(runs: readonly CellRichTextRun[]): string {
	return (
		"r:" +
		runs
			.map((run) =>
				[
					run.bold ? "1" : "0",
					run.italic ? "1" : "0",
					run.fontSize ?? "",
					run.fg?.toUpperCase() ?? "",
					run.fontFamily ?? "",
					`${run.text.length}:${run.text}`,
				].join("|"),
			)
			.join("\u{0000}")
	);
}

function plainTextKey(text: string): string {
	return `p:${text}`;
}

interface ParsedSstInternal {
	entries: SharedStringEntry[];
	sstOpenStart: number;
	sstOpenEnd: number;
	sstCloseStart: number;
	sstRawName: string;
	sstSelfClosing: boolean;
	declaredCount?: number;
}

function scanSharedStringsInternal(
	xml: string,
	options?: SharedStringsParseOptions,
): ParsedSstInternal {
	const resolveColor = options?.resolveColor ?? defaultResolveRgbAttr;
	const entries: SharedStringEntry[] = [];

	let sstOpenStart = -1;
	let sstOpenEnd = -1;
	let sstCloseStart = -1;
	let sstRawName = "sst";
	let sstSelfClosing = false;
	let declaredCount: number | undefined;

	let inSi = false;
	let phoneticDepth = 0;
	let inRun = false;
	let inRPr = false;
	let inText = false;

	let plainBuffer = "";
	let runTextBuffer = "";
	let currentRuns: CellRichTextRun[] = [];
	let currentRunMeta: Omit<CellRichTextRun, "text"> = {};

	scanXml(xml, {
		onOpenTag(tag) {
			if (tag.localName === "sst" && sstOpenStart === -1) {
				sstOpenStart = tag.openStart;
				sstOpenEnd = tag.openEnd;
				sstRawName = tag.rawName;
				sstSelfClosing = tag.selfClosing;
				const countAttr = getXmlAttr(tag.attrs, "count")?.trim();
				if (countAttr) {
					const parsed = Number(countAttr);
					if (Number.isSafeInteger(parsed) && parsed >= 0) {
						declaredCount = parsed;
					}
				}
				return;
			}

			if (tag.localName === "si") {
				inSi = true;
				phoneticDepth = 0;
				inRun = false;
				inRPr = false;
				inText = false;
				plainBuffer = "";
				currentRuns = [];
				if (tag.selfClosing) {
					entries.push({ text: "" });
					inSi = false;
				}
				return;
			}

			if (!inSi) {
				return;
			}

			if (tag.localName === "rPh") {
				if (!tag.selfClosing) {
					phoneticDepth += 1;
				}
				return;
			}

			if (phoneticDepth > 0) {
				if (tag.localName === "rPh" && !tag.selfClosing) {
					phoneticDepth += 1;
				}
				return;
			}

			if (tag.localName === "r") {
				inRun = true;
				runTextBuffer = "";
				currentRunMeta = {};
				if (tag.selfClosing) {
					currentRuns.push({ text: "" });
					inRun = false;
				}
				return;
			}

			if (inRun && tag.localName === "rPr") {
				if (!tag.selfClosing) {
					inRPr = true;
				}
				return;
			}

			if (inRPr) {
				switch (tag.localName) {
					case "b": {
						if (isFlagEnabled(tag.attrs)) {
							currentRunMeta.bold = true;
						}
						break;
					}
					case "i": {
						if (isFlagEnabled(tag.attrs)) {
							currentRunMeta.italic = true;
						}
						break;
					}
					case "color": {
						const fg = resolveColor(tag.attrs);
						if (fg) {
							currentRunMeta.fg = fg;
						}
						break;
					}
					case "sz": {
						const val = getXmlAttr(tag.attrs, "val")?.trim();
						const parsed = val ? Number(val) : NaN;
						if (Number.isFinite(parsed)) {
							currentRunMeta.fontSize = parsed;
						}
						break;
					}
					case "rFont": {
						const val = getXmlAttr(tag.attrs, "val");
						if (val) {
							currentRunMeta.fontFamily = val;
						}
						break;
					}
				}
				return;
			}

			if (tag.localName === "t" && !tag.selfClosing) {
				inText = true;
			}
		},
		onCloseTag(tag) {
			if (tag.localName === "sst" && sstCloseStart === -1) {
				sstCloseStart = tag.closeStart;
				return;
			}
			if (!inSi) {
				return;
			}
			if (tag.localName === "rPh" && phoneticDepth > 0) {
				phoneticDepth -= 1;
				return;
			}
			if (phoneticDepth > 0) {
				return;
			}
			if (tag.localName === "t") {
				inText = false;
				return;
			}
			if (tag.localName === "rPr") {
				inRPr = false;
				return;
			}
			if (tag.localName === "r" && inRun) {
				currentRuns.push({ text: runTextBuffer, ...currentRunMeta });
				inRun = false;
				runTextBuffer = "";
				currentRunMeta = {};
				return;
			}
			if (tag.localName === "si") {
				if (currentRuns.length > 0) {
					entries.push({
						text: currentRuns.map((run) => run.text).join(""),
						richText: currentRuns,
					});
				} else {
					entries.push({ text: plainBuffer });
				}
				inSi = false;
				plainBuffer = "";
				currentRuns = [];
			}
		},
		onText(text) {
			if (!inSi || phoneticDepth > 0 || !inText) {
				return;
			}
			if (inRun) {
				runTextBuffer += text;
			} else {
				plainBuffer += text;
			}
		},
	});

	return {
		entries,
		sstOpenStart,
		sstOpenEnd,
		sstCloseStart,
		sstRawName,
		sstSelfClosing,
		declaredCount,
	};
}

export function parseSharedStringsXml(
	xml: string,
	options?: SharedStringsParseOptions,
): SharedStringEntry[] {
	return scanSharedStringsInternal(xml, options).entries;
}

export function createSharedStringsReader(
	xml: string,
	options?: SharedStringsParseOptions,
): SharedStringsReader {
	const entries = parseSharedStringsXml(xml, options);
	return {
		size: entries.length,
		entries,
		get(index: number): SharedStringEntry | undefined {
			return entries[index];
		},
	};
}

export function createSharedStringsWriter(): SharedStringsWriter {
	const items: Array<{ kind: "plain"; text: string } | { kind: "rich"; runs: readonly CellRichTextRun[] }> = [];
	const keyToIndex = new Map<string, number>();
	let totalCount = 0;

	return {
		addString(text: string): number {
			totalCount += 1;
			const key = plainTextKey(text);
			const existing = keyToIndex.get(key);
			if (existing !== undefined) {
				return existing;
			}
			const index = items.length;
			keyToIndex.set(key, index);
			items.push({ kind: "plain", text });
			return index;
		},
		addRichText(runs: readonly CellRichTextRun[]): number {
			totalCount += 1;
			const key = richRunsKey(runs);
			const existing = keyToIndex.get(key);
			if (existing !== undefined) {
				return existing;
			}
			const index = items.length;
			keyToIndex.set(key, index);
			items.push({ kind: "rich", runs });
			return index;
		},
		getCount(): number {
			return totalCount;
		},
		getUniqueCount(): number {
			return items.length;
		},
		toXml(): string {
			const parts: string[] = [
				'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
				`<sst xmlns="${SPREADSHEET_NS}" count="${totalCount}" uniqueCount="${items.length}">`,
			];
			for (const item of items) {
				parts.push(
					item.kind === "plain"
						? serializePlainSiXml(item.text)
						: serializeRichSiXml(item.runs),
				);
			}
			parts.push("</sst>");
			return parts.join("");
		},
		toUint8Array(): Uint8Array {
			const writer = createChunkedXmlWriter(5000);
			writer.write('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
			writer.write(
				`<sst xmlns="${SPREADSHEET_NS}" count="${totalCount}" uniqueCount="${items.length}">`,
			);
			for (const item of items) {
				writer.write(
					item.kind === "plain"
						? serializePlainSiXml(item.text)
						: serializeRichSiXml(item.runs),
				);
				writer.markRowBoundary();
			}
			writer.write("</sst>");
			return writer.toUint8Array();
		},
	};
}

export function appendSharedStringsXml(
	xml: string,
	additions: ReadonlyArray<string | readonly CellRichTextRun[]>,
	options?: SharedStringsParseOptions,
): { xml: string; indices: number[] } {
	if (additions.length === 0) {
		return { xml, indices: [] };
	}

	const parsed = scanSharedStringsInternal(xml, options);
	if (parsed.sstOpenStart === -1) {
		const writer = createSharedStringsWriter();
		const indices = additions.map((item) =>
			typeof item === "string" ? writer.addString(item) : writer.addRichText(item),
		);
		return { xml: writer.toXml(), indices };
	}

	const keyToIndex = new Map<string, number>();
	for (const [idx, entry] of parsed.entries.entries()) {
		const key =
			entry.richText && entry.richText.length > 0
				? richRunsKey(entry.richText)
				: plainTextKey(entry.text);
		if (!keyToIndex.has(key)) {
			keyToIndex.set(key, idx);
		}
	}

	const prefix = getXmlPrefix(parsed.sstRawName);
	let totalCount = parsed.declaredCount ?? parsed.entries.length;
	const newSiXmls: string[] = [];
	const indices: number[] = [];

	for (const item of additions) {
		totalCount += 1;
		const key = typeof item === "string" ? plainTextKey(item) : richRunsKey(item);
		const existing = keyToIndex.get(key);
		if (existing !== undefined) {
			indices.push(existing);
			continue;
		}
		const nextIndex = parsed.entries.length + newSiXmls.length;
		keyToIndex.set(key, nextIndex);
		newSiXmls.push(
			typeof item === "string"
				? serializePlainSiXml(item, prefix)
				: serializeRichSiXml(item, prefix),
		);
		indices.push(nextIndex);
	}

	const newUniqueCount = parsed.entries.length + newSiXmls.length;
	const openTag = xml.slice(parsed.sstOpenStart, parsed.sstOpenEnd);
	let updatedOpenTag = upsertXmlAttribute(openTag, "count", String(totalCount));
	updatedOpenTag = upsertXmlAttribute(updatedOpenTag, "uniqueCount", String(newUniqueCount));

	const patches: XmlSlicePatch[] = [];
	if (parsed.sstSelfClosing) {
		patches.push({
			start: parsed.sstOpenStart,
			end: parsed.sstOpenEnd,
			replacement: expandSelfClosingTag(updatedOpenTag, newSiXmls.join("")),
		});
	} else {
		if (updatedOpenTag !== openTag) {
			patches.push({
				start: parsed.sstOpenStart,
				end: parsed.sstOpenEnd,
				replacement: updatedOpenTag,
			});
		}
		if (newSiXmls.length > 0 && parsed.sstCloseStart !== -1) {
			patches.push({
				start: parsed.sstCloseStart,
				end: parsed.sstCloseStart,
				replacement: newSiXmls.join(""),
			});
		}
	}

	return {
		xml: applyXmlSlicePatches(xml, patches),
		indices,
	};
}
