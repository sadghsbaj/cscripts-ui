import type { Plugin } from "vite";

export type CsLanguage = "de" | "en";

const HTML_OPEN_TAG_REGEX = /<html\b([^>]*)>/i;
const LANG_ATTR_REGEX = /(^|\s)lang\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i;

/**
 * Configures the build-time language for `cs` components and the HTML document.
 *
 * - Injects `__CS_LANG__` via Vite `define` so built-in `cs` UI/a11y defaults
 *   resolve to the selected language at compile time.
 * - Updates or inserts `lang="..."` on the `<html ...>` tag via `transformIndexHtml`.
 */
export function csLanguage(lang: CsLanguage = "en"): Plugin {
    return {
        name: "vite-plugin-cs-language",
        config() {
            return {
                define: {
                    __CS_LANG__: JSON.stringify(lang),
                },
            };
        },
        transformIndexHtml(html) {
            return html.replace(HTML_OPEN_TAG_REGEX, (_match, attrs: string) => {
                if (LANG_ATTR_REGEX.test(attrs)) {
                    return `<html${attrs.replace(LANG_ATTR_REGEX, (_attr, prefix: string) => `${prefix}lang="${lang}"`)}>`;
                }

                return `<html lang="${lang}"${attrs}>`;
            });
        },
    };
}
