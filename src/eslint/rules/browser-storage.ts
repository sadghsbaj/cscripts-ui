/**
 * Enforces standardized, prefix-isolated browser storage (`localStorage` & `sessionStorage`)
 * across TypeScript and Svelte files:
 * - `no-native-storage`: Forbids direct `localStorage` and `sessionStorage` access in favor of
 *   `getLocalStorage`, `setLocalStorage`, `getSessionStorage`, `setSessionStorage`, etc. from `cs/svelte/browser-storage`.
 * - `require-storage-prefix`: Ensures `configureStoragePrefix("unique-app-id")` is called in `main.ts`
 *   with a non-empty prefix so local `file://` HTML apps in Chromium/Edge never collide in shared storage.
 */

import type { Linter, Rule } from "eslint";

import { shouldSkipFile } from "./utils.ts";

function isBrowserStorageInternalFile(context: Rule.RuleContext): boolean {
    const filename = (context.filename ?? "").replaceAll("\\", "/");
    return (
        filename.includes("/svelte/primitives/browser-storage/") ||
        filename.startsWith("src/svelte/primitives/browser-storage/")
    );
}

function isTemplateMainFile(context: Rule.RuleContext): boolean {
    const filename = (context.filename ?? "").replaceAll("\\", "/");
    return filename.endsWith("/template/src/main.ts") || filename === "template/src/main.ts";
}

function isMainEntryFile(context: Rule.RuleContext): boolean {
    const filename = (context.filename ?? "").replaceAll("\\", "/");
    return filename.endsWith("/main.ts") || filename === "main.ts";
}

export const noNativeStorageRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Forbid direct localStorage and sessionStorage access in favor of prefix-isolated helpers from cs/svelte/browser-storage",
        },
        messages: {
            forbiddenLocalStorage:
                'Direct use of "localStorage" is forbidden because local file:// apps share a single storage bucket. Use "getLocalStorage()", "setLocalStorage()", "getLocalStorageJson()", "setLocalStorageJson()", "removeLocalStorage()", or "clearLocalStorage()" from "cs/svelte/browser-storage" instead (pass "{ prefix: false }" only for global shared keys like theme).',
            forbiddenSessionStorage:
                'Direct use of "sessionStorage" is forbidden. Use "getSessionStorage()", "setSessionStorage()", "getSessionStorageJson()", "setSessionStorageJson()", "removeSessionStorage()", or "clearSessionStorage()" from "cs/svelte/browser-storage" instead.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context) || isBrowserStorageInternalFile(context)) return {};

        return {
            MemberExpression(node: Rule.Node): void {
                const member = node as unknown as {
                    object?: {
                        type?: string;
                        name?: string;
                    };
                    property?: {
                        type?: string;
                        name?: string;
                    };
                };

                // Case 1: `localStorage.getItem(...)` or `sessionStorage.setItem(...)`
                if (member.object?.type === "Identifier") {
                    if (member.object.name === "localStorage") {
                        context.report({
                            node,
                            messageId: "forbiddenLocalStorage",
                        });
                        return;
                    }
                    if (member.object.name === "sessionStorage") {
                        context.report({
                            node,
                            messageId: "forbiddenSessionStorage",
                        });
                        return;
                    }
                }

                // Case 2: `window.localStorage` or `globalThis.sessionStorage`
                if (
                    member.object?.type === "Identifier" &&
                    (member.object.name === "window" || member.object.name === "globalThis") &&
                    member.property?.type === "Identifier"
                ) {
                    if (member.property.name === "localStorage") {
                        context.report({
                            node,
                            messageId: "forbiddenLocalStorage",
                        });
                    } else if (member.property.name === "sessionStorage") {
                        context.report({
                            node,
                            messageId: "forbiddenSessionStorage",
                        });
                    }
                }
            },
        };
    },
};

export const requireStoragePrefixRule: Rule.RuleModule = {
    meta: {
        type: "problem",
        docs: {
            description:
                "Enforce a non-empty configureStoragePrefix('app-id') call in main.ts so local file:// apps isolate their browser storage keys",
        },
        messages: {
            emptyStoragePrefix:
                'configureStoragePrefix() requires a unique non-empty application prefix (e.g. configureStoragePrefix("holzanalysen")) because local file:// HTML apps in Chromium/Edge share the same browser storage bucket.',
            missingStoragePrefixInMain:
                'Missing configureStoragePrefix("your-app-id") call in main.ts. Import "configureStoragePrefix" from "cs/svelte/browser-storage" and configure a unique prefix for this application.',
        },
        schema: [],
    },

    create(context: Rule.RuleContext): Rule.RuleListener {
        if (shouldSkipFile(context) || isBrowserStorageInternalFile(context) || isTemplateMainFile(context)) {
            return {};
        }

        const isMain = isMainEntryFile(context);
        let hasConfigureCall = false;

        return {
            CallExpression(node: Rule.Node): void {
                const call = node as unknown as {
                    callee?: {
                        type?: string;
                        name?: string;
                    };
                    arguments?: Array<{
                        type?: string;
                        value?: unknown;
                        expressions?: unknown[];
                        quasis?: Array<{ value?: { cooked?: string; raw?: string } }>;
                    }>;
                };

                if (call.callee?.type !== "Identifier" || call.callee.name !== "configureStoragePrefix") {
                    return;
                }

                hasConfigureCall = true;
                const firstArg = call.arguments?.[0];

                if (!firstArg) {
                    context.report({
                        node,
                        messageId: "emptyStoragePrefix",
                    });
                    return;
                }

                if (firstArg.type === "Literal" && typeof firstArg.value === "string") {
                    const normalized = firstArg.value.trim().replace(/:+$/, "");
                    if (normalized.length === 0) {
                        context.report({
                            node: firstArg as unknown as Rule.Node,
                            messageId: "emptyStoragePrefix",
                        });
                    }
                    return;
                }

                if (firstArg.type === "TemplateLiteral" && (firstArg.expressions?.length ?? 0) === 0) {
                    const raw = firstArg.quasis?.[0]?.value?.cooked ?? firstArg.quasis?.[0]?.value?.raw ?? "";
                    const normalized = raw.trim().replace(/:+$/, "");
                    if (normalized.length === 0) {
                        context.report({
                            node: firstArg as unknown as Rule.Node,
                            messageId: "emptyStoragePrefix",
                        });
                    }
                }
            },

            "Program:exit"(rawNode: unknown): void {
                if (isMain && !hasConfigureCall) {
                    context.report({
                        node: rawNode as unknown as Rule.Node,
                        messageId: "missingStoragePrefixInMain",
                    });
                }
            },
        };
    },
};

export const browserStorageConfig: Linter.Config = {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,svelte}"],
    plugins: {
        "browser-storage": {
            rules: {
                "no-native-storage": noNativeStorageRule,
                "require-storage-prefix": requireStoragePrefixRule,
            },
        },
    },
    rules: {
        "browser-storage/no-native-storage": "error",
        "browser-storage/require-storage-prefix": "error",
    },
};
