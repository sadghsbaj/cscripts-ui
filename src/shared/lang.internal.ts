/**
 * Supported compile-time UI languages for `cs` built-in labels.
 *
 * Internal-only helper (`*.internal.ts`) — NEVER re-export to consumer apps.
 * Technical `Error` messages stay in English; brand and site names
 * (e.g. `Pfleiderer`, plant names) stay fixed.
 */
export type CsLanguage = "de" | "en";

declare const __CS_LANG__: CsLanguage | undefined;

/**
 * Active built-in UI language resolved from Vite's `__CS_LANG__` define,
 * defaulting to `"en"` when `csLanguage()` is not configured.
 */
// eslint-disable-next-line unicorn/no-typeof-undefined -- __CS_LANG__ is an optional Vite compile-time define
export const CS_LANG: CsLanguage = typeof __CS_LANG__ !== "undefined" ? __CS_LANG__ : "en";

/**
 * Selects the localized value for the active `CS_LANG`.
 *
 * Internal-only — keep technical `Error` messages in English and brand/site names fixed.
 */
export function t<T>(labels: Record<CsLanguage, T>): T {
    return labels[CS_LANG];
}
