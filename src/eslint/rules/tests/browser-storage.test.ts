import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";
import ts from "typescript-eslint";

import { noNativeStorageRule, requireStoragePrefixRule } from "../browser-storage.ts";

const svelteRuleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
        parserOptions: {
            parser: ts.parser,
        },
    },
});

const tsRuleTester = new RuleTester({
    languageOptions: {
        parser: ts.parser,
    },
});

describe("browser-storage ESLint rules", () => {
    describe("browser-storage/no-native-storage", () => {
        it("forbids direct localStorage and sessionStorage calls in .ts and .svelte files", () => {
            tsRuleTester.run("browser-storage/no-native-storage (ts)", noNativeStorageRule, {
                valid: [
                    {
                        code: 'import { getLocalStorage, setLocalStorage } from "cs/svelte/browser-storage"; setLocalStorage("filter", "all"); const v = getLocalStorage("filter");',
                        filename: "src/feature.ts",
                    },
                    {
                        // Allowed inside browser-storage primitive implementation itself
                        code: 'window.localStorage.setItem("k", "v"); window.sessionStorage.getItem("k");',
                        filename: "src/svelte/primitives/browser-storage/storage-core.ts",
                    },
                ],
                invalid: [
                    {
                        code: 'localStorage.setItem("theme", "dark");',
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenLocalStorage" }],
                    },
                    {
                        code: 'const val = window.localStorage.getItem("key");',
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenLocalStorage" }],
                    },
                    {
                        code: 'sessionStorage.setItem("step", "1");',
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenSessionStorage" }],
                    },
                    {
                        code: 'globalThis.sessionStorage.removeItem("step");',
                        filename: "src/feature.ts",
                        errors: [{ messageId: "forbiddenSessionStorage" }],
                    },
                ],
            });

            svelteRuleTester.run("browser-storage/no-native-storage (svelte)", noNativeStorageRule, {
                valid: [
                    {
                        code: '<script lang="ts">import { setLocalStorage } from "cs/svelte/browser-storage";</script><button onclick={() => setLocalStorage("k", "v")}>Save</button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<button onclick={() => localStorage.setItem("k", "v")}>Save</button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenLocalStorage" }],
                    },
                    {
                        code: '<script lang="ts">const v = sessionStorage.getItem("k");</script><p>{v}</p>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenSessionStorage" }],
                    },
                ],
            });
        });
    });

    describe("browser-storage/require-storage-prefix", () => {
        it("requires a non-empty configureStoragePrefix('app-id') call in main.ts", () => {
            tsRuleTester.run("browser-storage/require-storage-prefix", requireStoragePrefixRule, {
                valid: [
                    {
                        code: 'import { configureStoragePrefix } from "cs/svelte/browser-storage"; configureStoragePrefix("holzanalysen");',
                        filename: "src/main.ts",
                    },
                    {
                        // Allowed in template/src/main.ts inside cscripts-ui before being scaffolded into a project
                        code: 'import { configureStoragePrefix } from "cs/svelte/browser-storage"; configureStoragePrefix("");',
                        filename: "template/src/main.ts",
                    },
                    {
                        // Regular modules do not need to call configureStoragePrefix
                        code: "export const x = 42;",
                        filename: "src/features/calc.ts",
                    },
                ],
                invalid: [
                    {
                        code: 'import { configureStoragePrefix } from "cs/svelte/browser-storage"; configureStoragePrefix("");',
                        filename: "src/main.ts",
                        errors: [{ messageId: "emptyStoragePrefix" }],
                    },
                    {
                        code: 'import { configureStoragePrefix } from "cs/svelte/browser-storage"; configureStoragePrefix("   ::  ");',
                        filename: "src/main.ts",
                        errors: [{ messageId: "emptyStoragePrefix" }],
                    },
                    {
                        code: 'import { mount } from "svelte";',
                        filename: "src/main.ts",
                        errors: [{ messageId: "missingStoragePrefixInMain" }],
                    },
                ],
            });
        });
    });
});
