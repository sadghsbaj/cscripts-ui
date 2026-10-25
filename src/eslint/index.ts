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
import { shortcutsConfig } from "./shortcuts.ts";
import { svelteConfig } from "./svelte.ts";
import { unicodeDotsConfig } from "./unicode-dots.ts";
import { unicornConfig } from "./unicorn.ts";
import { unocssConfig } from "./unocss.ts";

export { baseRulesConfig } from "./base-rules.ts";
export { ignoresConfig } from "./ignores.ts";
export { shortcutsConfig } from "./shortcuts.ts";
export { svelteConfig } from "./svelte.ts";
export { unicodeDotsConfig } from "./unicode-dots.ts";
export { unicornConfig } from "./unicorn.ts";
export { unocssConfig } from "./unocss.ts";

export const csEslint = defineConfig([
    ignoresConfig,

    js.configs.recommended,
    ...ts.configs.recommended,

    ...baseRulesConfig,
    shortcutsConfig,
    unicodeDotsConfig,
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
