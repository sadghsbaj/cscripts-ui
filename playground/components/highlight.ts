import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import css from "shiki/langs/css.mjs";
import svelte from "shiki/langs/svelte.mjs";
import typescript from "shiki/langs/typescript.mjs";

export type HighlightLanguage = "svelte" | "typescript" | "css" | "bash";

const monoTheme = createCssVariablesTheme({
    name: "cs-mono",
    variablePrefix: "--cs-shiki-",
    variableDefaults: {},
    fontStyle: true,
});

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighterCore({
            themes: [monoTheme],
            langs: [svelte, typescript, css, bash],
            engine: createJavaScriptRegexEngine(),
        });
    }
    return highlighterPromise;
}

/**
 * Highlights a code snippet using the shared Shiki core instance and the monotone CSS-variable theme.
 */
export async function highlightCode(code: string, lang: HighlightLanguage = "svelte"): Promise<string> {
    const highlighter = await getHighlighter();
    return highlighter.codeToHtml(code, {
        lang,
        theme: "cs-mono",
    });
}
