/**
 * CS ESLint flat config bundle.
 *
 * Consumers (template, playground) only need:
 *
 *     import cs from "cs/eslint";
 *     export default cs;
 *
 * Add project-specific overrides by spreading: `export default [...cs, { rules: { ... } }]`.
 * Individual rule sets live next to this file and are re-exported for cherry-picking.
 */
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import ts from "typescript-eslint";

import { baseRulesConfig } from "./base-rules.ts";
import { ignoresConfig } from "./ignores.ts";
import { libraryRulesConfigs, sharedRulesConfigs } from "./rules/index.ts";
import { shortcutsConfig } from "./shortcuts.ts";
import { svelteConfig } from "./svelte.ts";
import { unicornConfig } from "./unicorn.ts";
import { unocssConfig } from "./unocss.ts";

export { baseRulesConfig } from "./base-rules.ts";
export { ignoresConfig } from "./ignores.ts";
export * from "./rules/index.ts";
export { shortcutsConfig } from "./shortcuts.ts";
export { svelteConfig } from "./svelte.ts";
export { unicornConfig } from "./unicorn.ts";
export { unocssConfig } from "./unocss.ts";

export const csEslint = defineConfig([
    ignoresConfig,

    js.configs.recommended,
    ...ts.configs.recommended,

    ...baseRulesConfig,
    shortcutsConfig,
    ...sharedRulesConfigs,
    ...unicornConfig,
    ...unocssConfig,

    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.es2024,
            },
        },
    },

    ...svelteConfig,

    // Must stay last: disables rules that conflict with Prettier.
    prettier,
]);

export const csLibraryEslint = defineConfig([
    ...csEslint,
    ...libraryRulesConfigs,
    {
        files: ["src/uno/shortcuts/**"],
        rules: {
            "shortcuts/enforce-shortcuts": "off",
        },
    },
    {
        files: ["src/uno/dots/**"],
        rules: {
            "unicode-dots/no-unicode-dots": "off",
        },
    },
    {
        files: ["src/modules/browser-storage/**"],
        rules: {
            "browser-storage/no-native-storage": "off",
            "browser-storage/require-storage-prefix": "off",
        },
    },
    {
        files: ["template/src/main.ts"],
        rules: {
            "browser-storage/require-storage-prefix": "off",
        },
    },
    {
        files: ["src/modules/clipboard/clipboard.utils.ts"],
        rules: {
            "clipboard/no-native-clipboard": "off",
        },
    },
    {
        files: ["src/modules/select/SelectTrigger.svelte"],
        rules: {
            "select/require-structure": "off",
            "select/require-item-text": "off",
        },
    },
    {
        files: ["src/modules/kbd/Kbd.svelte"],
        rules: {
            "kbd/no-raw-kbd": "off",
        },
    },
]);

export default csEslint;
