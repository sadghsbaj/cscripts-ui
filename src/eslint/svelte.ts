import type { Linter } from "eslint";
import svelte from "eslint-plugin-svelte";
import ts from "typescript-eslint";

const forbiddenLegacyContextSelector = {
    selector:
        "ImportDeclaration[source.value='svelte'] ImportSpecifier[imported.name=/^(getContext|setContext|hasContext)$/]",
    message:
        "Legacy 'getContext' / 'setContext' / 'hasContext' is forbidden. Use Svelte 5's type-safe 'createContext' from 'svelte' instead.",
};

export const svelteConfig: Linter.Config[] = [
    ...svelte.configs.recommended,

    {
        files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
        languageOptions: {
            parserOptions: {
                parser: ts.parser,
                extraFileExtensions: [".svelte"],
            },
        },
    },
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        rules: {
            "no-restricted-syntax": ["error", forbiddenLegacyContextSelector],
        },
    },
    {
        files: ["**/*.svelte"],
        rules: {
            "prefer-const": "off",
            "no-restricted-syntax": [
                "error",
                forbiddenLegacyContextSelector,
                {
                    selector: "SvelteDirective[kind='Action']",
                    message:
                        "The legacy 'use:action' directive is forbidden. Use Svelte 5 attachments or element functions instead.",
                },
                {
                    selector:
                        "CallExpression[callee.object.name='document'][callee.property.name=/^(querySelector|querySelectorAll|getElementById|getElementsByClassName|getElementsByTagName)$/]",
                    message:
                        "Direct DOM queries on 'document' are forbidden in .svelte components. Use 'bind:this', Svelte5 attachments, or element parameters instead.",
                },
                {
                    selector: "SvelteConstTag",
                    message:
                        "The legacy '{@const}' tag is deprecated. Use Svelte 5 '{const ...}' or '{let ...}' declaration tags instead.",
                },
            ],
        },
    },
];
