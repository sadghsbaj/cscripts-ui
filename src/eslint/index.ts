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

import { baseRulesConfig } from "./base-rules";
import { ignoresConfig } from "./ignores";
import { customRulesConfigs } from "./rules/index";
import { shortcutsConfig } from "./shortcuts";
import { svelteConfig } from "./svelte";
import { unicornConfig } from "./unicorn";
import { unocssConfig } from "./unocss";

export { baseRulesConfig } from "./base-rules";
export { ignoresConfig } from "./ignores";
export * from "./rules/index";
export { shortcutsConfig } from "./shortcuts";
export { svelteConfig } from "./svelte";
export { unicornConfig } from "./unicorn";
export { unocssConfig } from "./unocss";

export const csEslint = defineConfig([
    ignoresConfig,

    js.configs.recommended,
    ...ts.configs.recommended,

    ...baseRulesConfig,
    shortcutsConfig,
    ...customRulesConfigs,
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

export default csEslint;
