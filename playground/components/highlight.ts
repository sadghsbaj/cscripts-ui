import { createCssVariablesTheme, createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

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
            langs: [
                import("shiki/langs/svelte.mjs"),
                import("shiki/langs/typescript.mjs"),
                import("shiki/langs/css.mjs"),
                import("shiki/langs/bash.mjs"),
            ],
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
