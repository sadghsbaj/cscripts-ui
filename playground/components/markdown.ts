import { Marked, type Tokens } from "marked";

import { highlightCode, type HighlightLanguage } from "./highlight.ts";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

const LANGUAGE_ALIASES: Record<string, HighlightLanguage> = {
    svelte: "svelte",
    ts: "typescript",
    typescript: "typescript",
    css: "css",
    bash: "bash",
    sh: "bash",
};

function stripFrontmatter(source: string): string {
    return source.replace(FRONTMATTER_RE, "").trim();
}

function escapeHtml(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/**
 * Renders a module `*.docs.md` string (stripping YAML frontmatter) into HTML
 * with Shiki syntax highlighting for supported code blocks.
 */
export async function renderMarkdown(source: string): Promise<string> {
    const markdown = stripFrontmatter(source);
    const highlightedBlocks = new Map<Tokens.Code, string>();

    const parser = new Marked({
        gfm: true,
        async: true,
        async walkTokens(token) {
            if (token.type !== "code") return;

            const codeToken = token as Tokens.Code;
            const normalizedLang = (codeToken.lang ?? "").trim().toLowerCase();
            const mappedLang = LANGUAGE_ALIASES[normalizedLang];
            if (!mappedLang) return;

            try {
                const html = await highlightCode(codeToken.text.trimEnd(), mappedLang);
                highlightedBlocks.set(codeToken, html);
            } catch {
                // Fall back to escaped plain code block below.
            }
        },
        renderer: {
            code(token) {
                const highlighted = highlightedBlocks.get(token);
                if (highlighted) {
                    return `<div class="cs-docs-code">${highlighted}</div>`;
                }
                return `<div class="cs-docs-code"><pre><code>${escapeHtml(token.text.trimEnd())}</code></pre></div>`;
            },
        },
    });

    return parser.parse(markdown);
}
