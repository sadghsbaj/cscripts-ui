import { ExcelError } from "./errors.ts";

const LEADING_OR_TRAILING_WS_OR_NEWLINE_RE = /^\s|\s$|[\r\n]/;
const XML_ENTITY_RE = /&(#x[0-9A-Fa-f]+|#\d+|amp|lt|gt|quot|apos);/g;
const DOCTYPE_OR_ENTITY_RE = /^(?:DOCTYPE|ENTITY)\b/i;

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
};

export interface XmlOpenTagInfo {
	rawName: string;
	localName: string;
	attrs: Record<string, string>;
	selfClosing: boolean;
	openStart: number;
	openEnd: number;
}

export interface XmlCloseTagInfo {
	rawName: string;
	localName: string;
	closeStart: number;
	closeEnd: number;
}

export interface XmlScanHandlers {
	onOpenTag?: (tag: XmlOpenTagInfo) => void;
	onCloseTag?: (tag: XmlCloseTagInfo) => void;
	onText?: (text: string, start: number, end: number) => void;
}

export interface XmlElement {
	rawName: string;
	localName: string;
	attrs: Record<string, string>;
	children: XmlElement[];
	text: string;
	openStart: number;
	openEnd: number;
	closeStart: number;
	closeEnd: number;
	selfClosing: boolean;
}

export interface XmlSlicePatch {
	start: number;
	end: number;
	replacement: string;
}

export interface ChunkedXmlWriter {
	write(chunk: string): void;
	markRowBoundary(): void;
	toUint8Array(): Uint8Array;
}

function isIllegalXmlControlCode(code: number): boolean {
	return (
		code <= 0x08 ||
		code === 0x0b ||
		code === 0x0c ||
		(code >= 0x0e && code <= 0x1f) ||
		code === 0xff_fe ||
		code === 0xff_ff
	);
}

export function stripIllegalXmlChars(text: string): string {
	let firstBad = -1;
	for (let i = 0; i < text.length; i += 1) {
		const code = text.codePointAt(i);
		if (code !== undefined && isIllegalXmlControlCode(code)) {
			firstBad = i;
			break;
		}
	}
	if (firstBad === -1) {
		return text;
	}
	let out = text.slice(0, firstBad);
	for (let i = firstBad + 1; i < text.length; i += 1) {
		const code = text.codePointAt(i);
		if (code !== undefined && !isIllegalXmlControlCode(code)) {
			out += text[i] ?? "";
		}
	}
	return out;
}

export function escapeXmlText(text: string): string {
	return stripIllegalXmlChars(text)
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");
}

export function escapeXmlAttr(text: string): string {
	return escapeXmlText(text).replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function isValidXmlCodePoint(codePoint: number): boolean {
	if (codePoint < 1 || codePoint > 0x10_ff_ff) {
		return false;
	}
	if (codePoint >= 0xd8_00 && codePoint <= 0xdf_ff) {
		return false;
	}
	if (codePoint === 0xff_fe || codePoint === 0xff_ff) {
		return false;
	}
	return !(
		(codePoint >= 0x01 && codePoint <= 0x08) ||
		codePoint === 0x0b ||
		codePoint === 0x0c ||
		(codePoint >= 0x0e && codePoint <= 0x1f)
	);
}

export function decodeXmlEntities(text: string): string {
	if (!text.includes("&")) {
		return text;
	}
	return text.replaceAll(XML_ENTITY_RE, (full, body: string) => {
		if (body.startsWith("#x")) {
			const codePoint = Number.parseInt(body.slice(2), 16);
			return isValidXmlCodePoint(codePoint) ? String.fromCodePoint(codePoint) : full;
		}
		if (body.startsWith("#")) {
			const codePoint = Number(body.slice(1));
			return isValidXmlCodePoint(codePoint) ? String.fromCodePoint(codePoint) : full;
		}
		return NAMED_ENTITIES[body] ?? full;
	});
}

export function needsXmlSpacePreserve(text: string): boolean {
	return text.length > 0 && LEADING_OR_TRAILING_WS_OR_NEWLINE_RE.test(text);
}

export function xmlSpaceAttr(text: string): string {
	return needsXmlSpacePreserve(text) ? ' xml:space="preserve"' : "";
}

export function getXmlLocalName(rawName: string): string {
	const colonIndex = rawName.indexOf(":");
	return colonIndex === -1 ? rawName : rawName.slice(colonIndex + 1);
}

export function getXmlPrefix(rawName: string): string {
	const colonIndex = rawName.indexOf(":");
	return colonIndex === -1 ? "" : rawName.slice(0, colonIndex + 1);
}

export function getXmlAttr(
	attrs: Readonly<Record<string, string>>,
	localOrQualifiedName: string,
): string | undefined {
	if (Object.hasOwn(attrs, localOrQualifiedName)) {
		return attrs[localOrQualifiedName];
	}
	const suffix = `:${localOrQualifiedName}`;
	for (const [key, value] of Object.entries(attrs)) {
		if (key === "xmlns" || key.startsWith("xmlns:")) {
			continue;
		}
		if (key.endsWith(suffix)) {
			return value;
		}
	}
	return undefined;
}

const XML_WHITESPACE_CHARS = new Set<string | undefined>([" ", "\t", "\n", "\r"]);

function isXmlWhitespace(ch: string | undefined): boolean {
	return XML_WHITESPACE_CHARS.has(ch);
}

function parseStartTagHeader(headerContent: string): {
	rawName: string;
	attrs: Record<string, string>;
} {
	const len = headerContent.length;
	let pos = 0;

	while (pos < len && isXmlWhitespace(headerContent[pos])) {
		pos += 1;
	}
	const nameStart = pos;
	while (pos < len && !isXmlWhitespace(headerContent[pos])) {
		pos += 1;
	}
	const rawName = headerContent.slice(nameStart, pos);
	if (rawName.length === 0) {
		throw new ExcelError("CORRUPT_XML", "XML start tag is missing an element name.");
	}

	const attrs = Object.create(null) as Record<string, string>;
	while (pos < len) {
		while (pos < len && isXmlWhitespace(headerContent[pos])) {
			pos += 1;
		}
		if (pos >= len) {
			break;
		}

		const attrStart = pos;
		while (
			pos < len &&
			headerContent[pos] !== "=" &&
			!isXmlWhitespace(headerContent[pos])
		) {
			pos += 1;
		}
		const attrName = headerContent.slice(attrStart, pos);
		while (pos < len && isXmlWhitespace(headerContent[pos])) {
			pos += 1;
		}
		if (headerContent[pos] !== "=" || attrName.length === 0) {
			throw new ExcelError("CORRUPT_XML", `Malformed XML attribute near "${attrName}".`);
		}
		pos += 1;
		while (pos < len && isXmlWhitespace(headerContent[pos])) {
			pos += 1;
		}

		const quote = headerContent[pos];
		if (quote !== '"' && quote !== "'") {
			throw new ExcelError("CORRUPT_XML", `Missing quote for XML attribute "${attrName}".`);
		}
		pos += 1;
		const valStart = pos;
		const valEnd = headerContent.indexOf(quote, valStart);
		if (valEnd === -1) {
			throw new ExcelError("CORRUPT_XML", `Unterminated value for XML attribute "${attrName}".`);
		}
		attrs[attrName] = decodeXmlEntities(headerContent.slice(valStart, valEnd));
		pos = valEnd + 1;
	}

	return { rawName, attrs };
}

function findTagClosingBracket(xml: string, startAfterLt: number): number {
	const len = xml.length;
	let inQuote: string | null = null;
	for (let i = startAfterLt; i < len; i += 1) {
		const ch = xml[i];
		if (inQuote !== null) {
			if (ch === inQuote) {
				inQuote = null;
			}
			continue;
		}
		if (ch === '"' || ch === "'") {
			inQuote = ch;
			continue;
		}
		if (ch === "<") {
			throw new ExcelError("CORRUPT_XML", "Unexpected '<' inside XML tag.");
		}
		if (ch === ">") {
			return i;
		}
	}
	throw new ExcelError("CORRUPT_XML", "Unterminated XML start tag.");
}

function findDeclarationEnd(xml: string, startAfterBang: number): number {
	const len = xml.length;
	let inQuote: string | null = null;
	for (let i = startAfterBang; i < len; i += 1) {
		const ch = xml[i];
		if (inQuote !== null) {
			if (ch === inQuote) {
				inQuote = null;
			}
			continue;
		}
		if (ch === '"' || ch === "'") {
			inQuote = ch;
			continue;
		}
		if (ch === ">") {
			return i;
		}
	}
	throw new ExcelError("CORRUPT_XML", "Unterminated XML declaration.");
}

export function scanXml(xml: string, handlers: XmlScanHandlers): void {
	const len = xml.length;
	let pos = xml.codePointAt(0) === 0xfe_ff ? 1 : 0;

	while (pos < len) {
		const lt = xml.indexOf("<", pos);
		if (lt === -1) {
			if (pos < len && handlers.onText) {
				handlers.onText(decodeXmlEntities(xml.slice(pos)), pos, len);
			}
			break;
		}

		if (lt > pos && handlers.onText) {
			handlers.onText(decodeXmlEntities(xml.slice(pos, lt)), pos, lt);
		}

		if (xml.startsWith("<!--", lt)) {
			const endComment = xml.indexOf("-->", lt + 4);
			if (endComment === -1) {
				throw new ExcelError("CORRUPT_XML", "Unterminated XML comment.");
			}
			pos = endComment + 3;
			continue;
		}

		if (xml.startsWith("<![CDATA[", lt)) {
			const endCdata = xml.indexOf("]]>", lt + 9);
			if (endCdata === -1) {
				throw new ExcelError("CORRUPT_XML", "Unterminated XML CDATA section.");
			}
			if (handlers.onText) {
				handlers.onText(xml.slice(lt + 9, endCdata), lt + 9, endCdata);
			}
			pos = endCdata + 3;
			continue;
		}

		if (xml.startsWith("<?", lt)) {
			const endPi = xml.indexOf("?>", lt + 2);
			if (endPi === -1) {
				throw new ExcelError("CORRUPT_XML", "Unterminated XML processing instruction.");
			}
			pos = endPi + 2;
			continue;
		}

		if (xml.startsWith("<!", lt)) {
			const preview = xml.slice(lt + 2, lt + 12);
			if (DOCTYPE_OR_ENTITY_RE.test(preview)) {
				throw new ExcelError(
					"CORRUPT_XML",
					"XML DOCTYPE and ENTITY declarations are forbidden for security.",
				);
			}
			const endDecl = findDeclarationEnd(xml, lt + 2);
			pos = endDecl + 1;
			continue;
		}

		if (xml.startsWith("</", lt)) {
			const gt = xml.indexOf(">", lt + 2);
			if (gt === -1) {
				throw new ExcelError("CORRUPT_XML", "Unterminated XML closing tag.");
			}
			const rawName = xml.slice(lt + 2, gt).trim();
			if (rawName.length === 0) {
				throw new ExcelError("CORRUPT_XML", "Empty XML closing tag.");
			}
			handlers.onCloseTag?.({
				rawName,
				localName: getXmlLocalName(rawName),
				closeStart: lt,
				closeEnd: gt + 1,
			});
			pos = gt + 1;
			continue;
		}

		const gt = findTagClosingBracket(xml, lt + 1);
		let headerEnd = gt;
		while (headerEnd > lt + 1 && isXmlWhitespace(xml[headerEnd - 1])) {
			headerEnd -= 1;
		}
		const selfClosing = headerEnd > lt + 1 && xml[headerEnd - 1] === "/";
		const contentEnd = selfClosing ? headerEnd - 1 : gt;
		const { rawName, attrs } = parseStartTagHeader(xml.slice(lt + 1, contentEnd));

		handlers.onOpenTag?.({
			rawName,
			localName: getXmlLocalName(rawName),
			attrs,
			selfClosing,
			openStart: lt,
			openEnd: gt + 1,
		});
		pos = gt + 1;
	}
}

export function parseXmlTree(xml: string): XmlElement | null {
	let root: XmlElement | null = null;
	const stack: XmlElement[] = [];

	scanXml(xml, {
		onOpenTag(tag) {
			const element: XmlElement = {
				rawName: tag.rawName,
				localName: tag.localName,
				attrs: tag.attrs,
				children: [],
				text: "",
				openStart: tag.openStart,
				openEnd: tag.openEnd,
				closeStart: tag.selfClosing ? tag.openEnd : -1,
				closeEnd: tag.selfClosing ? tag.openEnd : -1,
				selfClosing: tag.selfClosing,
			};
			const parent = stack.at(-1);
			if (parent) {
				parent.children.push(element);
			} else if (root === null) {
				root = element;
			}
			if (!tag.selfClosing) {
				stack.push(element);
			}
		},
		onCloseTag(tag) {
			const current = stack.pop();
			if (!current || current.localName !== tag.localName) {
				throw new ExcelError(
					"CORRUPT_XML",
					`Mismatched XML closing tag </${tag.rawName}>.`,
				);
			}
			current.closeStart = tag.closeStart;
			current.closeEnd = tag.closeEnd;
		},
		onText(text) {
			const current = stack.at(-1);
			if (current) {
				current.text += text;
			}
		},
	});

	if (stack.length > 0) {
		const unclosed = stack.at(-1);
		throw new ExcelError(
			"CORRUPT_XML",
			`Unclosed XML element <${unclosed?.rawName ?? "unknown"}>.`,
		);
	}

	return root;
}

export function findXmlChild(el: XmlElement, localName: string): XmlElement | undefined {
	return el.children.find((child) => child.localName === localName);
}

export function findXmlChildren(el: XmlElement, localName: string): XmlElement[] {
	return el.children.filter((child) => child.localName === localName);
}

export function findXmlDescendant(el: XmlElement, localName: string): XmlElement | undefined {
	for (const child of el.children) {
		if (child.localName === localName) {
			return child;
		}
		const nested = findXmlDescendant(child, localName);
		if (nested) {
			return nested;
		}
	}
	return undefined;
}

export function findXmlDescendants(el: XmlElement, localName: string): XmlElement[] {
	const matches: XmlElement[] = [];
	const visit = (node: XmlElement): void => {
		for (const child of node.children) {
			if (child.localName === localName) {
				matches.push(child);
			}
			visit(child);
		}
	};
	visit(el);
	return matches;
}

export function concatUint8Arrays(chunks: readonly Uint8Array[]): Uint8Array {
	let totalLength = 0;
	for (const chunk of chunks) {
		totalLength += chunk.byteLength;
	}
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return result;
}

export function createChunkedXmlWriter(rowChunkSize = 5000): ChunkedXmlWriter {
	const encoder = new TextEncoder();
	const encodedChunks: Uint8Array[] = [];
	let buffer: string[] = [];
	let rowsInBuffer = 0;
	const threshold = Math.max(1, rowChunkSize);

	const flush = (): void => {
		if (buffer.length === 0) {
			return;
		}
		encodedChunks.push(encoder.encode(buffer.join("")));
		buffer = [];
		rowsInBuffer = 0;
	};

	return {
		write(chunk: string): void {
			if (chunk.length > 0) {
				buffer.push(chunk);
			}
		},
		markRowBoundary(): void {
			rowsInBuffer += 1;
			if (rowsInBuffer >= threshold) {
				flush();
			}
		},
		toUint8Array(): Uint8Array {
			flush();
			return concatUint8Arrays(encodedChunks);
		},
	};
}

export function applyXmlSlicePatches(xml: string, patches: readonly XmlSlicePatch[]): string {
	if (patches.length === 0) {
		return xml;
	}

	const sorted = patches.toSorted((a, b) => a.start - b.start || a.end - b.end);
	const parts: string[] = [];
	let cursor = 0;

	for (const patch of sorted) {
		if (patch.start < 0 || patch.end < patch.start || patch.end > xml.length) {
			throw new ExcelError(
				"PATCH_FAILED",
				`XML slice patch range [${patch.start}, ${patch.end}] is out of bounds (0..${xml.length}).`,
			);
		}
		if (patch.start < cursor) {
			throw new ExcelError(
				"PATCH_FAILED",
				`Overlapping XML slice patch at offset ${patch.start} (previous ended at ${cursor}).`,
			);
		}
		if (patch.start > cursor) {
			parts.push(xml.slice(cursor, patch.start));
		}
		parts.push(patch.replacement);
		cursor = patch.end;
	}

	if (cursor < xml.length) {
		parts.push(xml.slice(cursor));
	}

	return parts.join("");
}

export function expandSelfClosingTag(selfClosingTagXml: string, innerXml: string): string {
	const match = /^<([^\s/>]+)/.exec(selfClosingTagXml);
	const gtIdx = selfClosingTagXml.lastIndexOf(">");
	if (!match?.[1] || gtIdx === -1 || selfClosingTagXml.slice(gtIdx + 1).trim().length > 0) {
		throw new ExcelError("PATCH_FAILED", "Expected a self-closing XML tag to expand.");
	}
	let slashIdx = gtIdx;
	while (slashIdx > 0 && isXmlWhitespace(selfClosingTagXml[slashIdx - 1])) {
		slashIdx -= 1;
	}
	slashIdx -= 1;
	if (slashIdx <= 0 || selfClosingTagXml[slashIdx] !== "/") {
		throw new ExcelError("PATCH_FAILED", "Expected a self-closing XML tag to expand.");
	}
	const rawName = match[1];
	let headerEnd = slashIdx;
	while (headerEnd > 0 && isXmlWhitespace(selfClosingTagXml[headerEnd - 1])) {
		headerEnd -= 1;
	}
	return `${selfClosingTagXml.slice(0, headerEnd)}>${innerXml}</${rawName}>`;
}

interface AttributeSpan {
	name: string;
	fullStart: number;
	valueStart: number;
	valueEnd: number;
	fullEnd: number;
}

function scanTagAttributes(openTagXml: string): {
	attrs: AttributeSpan[];
	closeTokenStart: number;
} {
	const len = openTagXml.length;
	let pos = 0;
	while (pos < len && openTagXml[pos] !== "<") {
		pos += 1;
	}
	pos += 1;
	while (pos < len && isXmlWhitespace(openTagXml[pos])) {
		pos += 1;
	}
	while (pos < len && !isXmlWhitespace(openTagXml[pos]) && openTagXml[pos] !== ">" && openTagXml[pos] !== "/") {
		pos += 1;
	}

	const attrs: AttributeSpan[] = [];
	while (pos < len) {
		while (pos < len && isXmlWhitespace(openTagXml[pos])) {
			pos += 1;
		}
		if (pos >= len || openTagXml[pos] === ">" || openTagXml[pos] === "/") {
			break;
		}
		const fullStart = pos;
		while (
			pos < len &&
			openTagXml[pos] !== "=" &&
			!isXmlWhitespace(openTagXml[pos]) &&
			openTagXml[pos] !== ">"
		) {
			pos += 1;
		}
		const name = openTagXml.slice(fullStart, pos);
		while (pos < len && isXmlWhitespace(openTagXml[pos])) {
			pos += 1;
		}
		if (openTagXml[pos] !== "=") {
			break;
		}
		pos += 1;
		while (pos < len && isXmlWhitespace(openTagXml[pos])) {
			pos += 1;
		}
		const quote = openTagXml[pos];
		if (quote !== '"' && quote !== "'") {
			break;
		}
		const valueStart = pos + 1;
		const valueEnd = openTagXml.indexOf(quote, valueStart);
		if (valueEnd === -1) {
			break;
		}
		attrs.push({
			name,
			fullStart,
			valueStart,
			valueEnd,
			fullEnd: valueEnd + 1,
		});
		pos = valueEnd + 1;
	}

	let closeTokenStart = openTagXml.lastIndexOf(">");
	if (closeTokenStart === -1) {
		closeTokenStart = openTagXml.length;
	}
	while (closeTokenStart > 0 && isXmlWhitespace(openTagXml[closeTokenStart - 1])) {
		closeTokenStart -= 1;
	}
	if (closeTokenStart > 0 && openTagXml[closeTokenStart - 1] === "/") {
		closeTokenStart -= 1;
		while (closeTokenStart > 0 && isXmlWhitespace(openTagXml[closeTokenStart - 1])) {
			closeTokenStart -= 1;
		}
	}

	return { attrs, closeTokenStart };
}

export function upsertXmlAttribute(
	openTagXml: string,
	attrName: string,
	attrValue: string,
): string {
	const escaped = escapeXmlAttr(attrValue);
	const { attrs, closeTokenStart } = scanTagAttributes(openTagXml);
	const existing = attrs.find((attr) => attr.name === attrName);
	if (existing) {
		return (
			openTagXml.slice(0, existing.valueStart) +
			escaped +
			openTagXml.slice(existing.valueEnd)
		);
	}
	const insertion = ` ${attrName}="${escaped}"`;
	return (
		openTagXml.slice(0, closeTokenStart) +
		insertion +
		openTagXml.slice(closeTokenStart)
	);
}

export function removeXmlAttribute(openTagXml: string, attrName: string): string {
	const { attrs } = scanTagAttributes(openTagXml);
	const existing = attrs.find((attr) => attr.name === attrName);
	if (!existing) {
		return openTagXml;
	}
	let start = existing.fullStart;
	while (start > 0 && isXmlWhitespace(openTagXml[start - 1])) {
		start -= 1;
	}
	return openTagXml.slice(0, start) + openTagXml.slice(existing.fullEnd);
}
