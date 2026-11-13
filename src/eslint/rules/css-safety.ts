/**
 * CSS safety ESLint rules for `.svelte` `<style>` blocks and `.css` files:
 * - `vendor-prefix-order`: Ensures `-webkit-*` / `-moz-*` / `-ms-*` properties precede their
 *   standard counterpart in the same rule block (LightningCSS drops standard properties that come first).
 * - `no-oklch-neutral-mix`: Flags `color-mix(in oklch, ...)` with neutral gray tokens
 *   (`--cs-color-base-*`, `zinc-*`, `slate-*`, `gray-*`), which rotates hues toward violet/blue.
 */

import type { AST } from "svelte-eslint-parser";
import type { Linter, Rule } from "eslint";

import { attachmentCssParser } from "./attachment-layers.ts";
import { shouldSkipFile } from "./utils.ts";

const VENDOR_PREFIX_RE = /^-(?:webkit|moz|ms)-([a-z-]+)$/i;
const DECLARATION_PROP_RE = /^\s*([a-z-]+)\s*:/i;
const OKLCH_COLOR_MIX_START_RE = /\bcolor-mix\s*\(/gi;
const IN_OKLCH_RE = /^\s*in\s+oklch\b/i;
const NEUTRAL_TOKEN_RE = /--cs-color-(?:base|zinc|slate|gray)-\d+/;

interface VendorPrefixViolation {
    prefixed: string;
    standard: string;
    offset: number;
}

function readStringLiteral(css: string, start: number): { text: string; endIndex: number } {
    const quote = css[start];
    let text = quote ?? "";
    let i = start + 1;

    while (i < css.length) {
        const ch = css[i];
        text += ch;
        if (ch === "\\") {
            i++;
            if (i < css.length) text += css[i];
        } else if (ch === quote) {
            return { text, endIndex: i };
        }
        i++;
    }

    return { text, endIndex: css.length - 1 };
}

/**
 * Scans CSS text block-by-block (ignoring comments and strings) to detect vendor-prefixed
 * declarations that appear after their unprefixed standard property in the same block.
 */
function findVendorPrefixViolations(css: string): VendorPrefixViolation[] {
    const violations: VendorPrefixViolation[] = [];
    const blockStack: Array<Set<string>> = [new Set()];
    let buffer = "";
    let bufferStart = 0;

    const flushDeclaration = (): void => {
        const match = DECLARATION_PROP_RE.exec(buffer);
        if (match?.[1]) {
            const prop = match[1].toLowerCase();
            const currentBlock = blockStack.at(-1);
            if (currentBlock && !prop.startsWith("--")) {
                const prefixMatch = VENDOR_PREFIX_RE.exec(prop);
                if (prefixMatch?.[1]) {
                    const standard = prefixMatch[1];
                    if (currentBlock.has(standard)) {
                        violations.push({ prefixed: prop, standard, offset: bufferStart });
                    }
                } else {
                    currentBlock.add(prop);
                }
            }
        }
        buffer = "";
    };

    for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        const next = css[i + 1];

        // Skip block comments
        if (ch === "/" && next === "*") {
            const end = css.indexOf("*/", i + 2);
            i = end === -1 ? css.length : end + 1;
            continue;
        }

        // Skip string literals
        if (ch === '"' || ch === "'") {
            if (!buffer) bufferStart = i;
            const literal = readStringLiteral(css, i);
            buffer += literal.text;
            i = literal.endIndex;
            continue;
        }

        if (ch === "{") {
            // Text before `{` is a selector or at-rule, not a declaration
            buffer = "";
            blockStack.push(new Set());
            continue;
        }

        if (ch === "}") {
            flushDeclaration();
            if (blockStack.length > 1) blockStack.pop();
            continue;
        }

        if (ch === ";") {
            flushDeclaration();
            continue;
        }

        if (!buffer && ch && !/\s/.test(ch)) {
            bufferStart = i;
        }
        if (buffer || (ch && !/\s/.test(ch))) {
            buffer += ch;
        }
    }

    flushDeclaration();
    return violations;
}

const POWERLESS_COLOR_RE = /^\s*(?:transparent|white|black)(?:\s+\d+(?:\.\d+)?%)?\s*$/i;

function splitTopLevelCommas(input: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        else if (ch === "," && depth === 0) {
            parts.push(input.slice(start, i));
            start = i + 1;
        }
    }

    parts.push(input.slice(start));
    return parts;
}

/**
 * Finds `color-mix(in oklch, ...)` calls that mix a neutral gray token with another non-trivial color.
 */
function findOklchNeutralMixOffsets(css: string): number[] {
    const offsets: number[] = [];
    OKLCH_COLOR_MIX_START_RE.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = OKLCH_COLOR_MIX_START_RE.exec(css)) !== null) {
        const openParenIdx = match.index + match[0].length - 1;
        let depth = 1;
        let cursor = openParenIdx + 1;

        while (cursor < css.length && depth > 0) {
            if (css[cursor] === "(") depth++;
            else if (css[cursor] === ")") depth--;
            cursor++;
        }

        const inner = css.slice(openParenIdx + 1, depth === 0 ? cursor - 1 : css.length);
        const parts = splitTopLevelCommas(inner);
        if (parts.length < 3) continue;

        const [space, colorA, colorB] = parts;
        if (!space || !colorA || !colorB) continue;
        if (!IN_OKLCH_RE.test(space)) continue;
        if (POWERLESS_COLOR_RE.test(colorA) || POWERLESS_COLOR_RE.test(colorB)) continue;

        if (NEUTRAL_TOKEN_RE.test(colorA) || NEUTRAL_TOKEN_RE.test(colorB)) {
            offsets.push(match.index);
        }
    }

    return offsets;
}

function getStyleBlockCss(node: AST.SvelteStyleElement): string {
    return node.children.map((c) => (c.type === "SvelteText" ? c.value : "")).join("");
}

export const vendorPrefixOrderRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Require vendor-prefixed CSS properties (e.g. -webkit-backdrop-filter) to appear before their standard counterpart",
        },
        messages: {
            vendorPrefixAfterStandard:
                'Place "{{prefixed}}" before "{{standard}}" so LightningCSS does not strip "{{standard}}" during production minification.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const reportViolations = (css: string, node: Rule.Node, baseOffset: number): void => {
            for (const violation of findVendorPrefixViolations(css)) {
                const loc = context.sourceCode.getLocFromIndex(baseOffset + violation.offset);
                context.report({
                    node,
                    loc: { start: loc, end: loc },
                    messageId: "vendorPrefixAfterStandard",
                    data: {
                        prefixed: violation.prefixed,
                        standard: violation.standard,
                    },
                });
            }
        };

        if ((context.filename ?? "").endsWith(".css")) {
            return {
                Program(rawNode: unknown): void {
                    reportViolations(context.sourceCode.text, rawNode as Rule.Node, 0);
                },
            };
        }

        return {
            SvelteStyleElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteStyleElement;
                const css = getStyleBlockCss(node);
                if (!css) return;

                const firstText = node.children.find((c) => c.type === "SvelteText");
                const baseOffset = firstText?.range?.[0] ?? node.startTag.range[1];
                reportViolations(css, node.startTag as unknown as Rule.Node, baseOffset);
            },
        };
    },
};

export const noOklchNeutralMixRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Disallow color-mix(in oklch, ...) with neutral gray tokens that cause hue shifts toward violet/blue",
        },
        messages: {
            oklchNeutralMix:
                'Use "color-mix(in oklab, ...)" instead of "in oklch" when mixing with neutral tokens (--cs-color-base-*, zinc-*, slate-*, gray-*) to prevent hue-wheel shifts.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context)) return {};

        const reportOffsets = (css: string, node: Rule.Node, baseOffset: number): void => {
            for (const offset of findOklchNeutralMixOffsets(css)) {
                const loc = context.sourceCode.getLocFromIndex(baseOffset + offset);
                context.report({
                    node,
                    loc: { start: loc, end: loc },
                    messageId: "oklchNeutralMix",
                });
            }
        };

        if ((context.filename ?? "").endsWith(".css")) {
            return {
                Program(rawNode: unknown): void {
                    reportOffsets(context.sourceCode.text, rawNode as Rule.Node, 0);
                },
            };
        }

        return {
            SvelteStyleElement(rawNode: Rule.Node): void {
                const node = rawNode as unknown as AST.SvelteStyleElement;
                const css = getStyleBlockCss(node);
                if (!css) return;

                const firstText = node.children.find((c) => c.type === "SvelteText");
                const baseOffset = firstText?.range?.[0] ?? node.startTag.range[1];
                reportOffsets(css, node.startTag as unknown as Rule.Node, baseOffset);
            },
        };
    },
};

const cssSafetyPlugin = {
    rules: {
        "vendor-prefix-order": vendorPrefixOrderRule,
        "no-oklch-neutral-mix": noOklchNeutralMixRule,
    },
};

const cssSafetyRules: Linter.RulesRecord = {
    "css-safety/vendor-prefix-order": "error",
    "css-safety/no-oklch-neutral-mix": "error",
};

export const cssSafetyConfigs: Linter.Config[] = [
    {
        files: ["**/*.svelte"],
        plugins: { "css-safety": cssSafetyPlugin },
        rules: cssSafetyRules,
    },
    {
        files: ["**/*.css"],
        languageOptions: { parser: attachmentCssParser },
        plugins: { "css-safety": cssSafetyPlugin },
        rules: cssSafetyRules,
    },
];
