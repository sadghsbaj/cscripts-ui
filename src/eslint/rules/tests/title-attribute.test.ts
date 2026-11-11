import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { noTitleAttributeRule } from "../title-attribute.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("title-attribute ESLint rules", () => {
    describe("title-attribute/no-title-attribute", () => {
        it("forbids native title attributes in .svelte and .html files", () => {
            ruleTester.run("title-attribute/no-title-attribute", noTitleAttributeRule, {
                valid: [
                    {
                        // Svelte component using tooltip attachment instead
                        code: '<button {@attach tooltip("Save changes")}>Save</button>',
                        filename: "src/Component.svelte",
                    },
                    {
                        // HTML title tag (e.g. in index.html or <head>)
                        code: "<title>My Application Title</title>",
                        filename: "index.html",
                    },
                    {
                        // Svelte head with title element
                        code: "<svelte:head><title>Page Title</title></svelte:head>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // SVG title element
                        code: "<svg><title>Icon description</title><path d='M0 0' /></svg>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Custom prop named something else
                        code: '<CustomComponent heading="Title of post" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        // Standard accessible button without title
                        code: '<button aria-label="Close dialog">X</button>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Static string title on button in Svelte
                        code: '<button title="Click here to submit">Submit</button>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenTitleAttribute" }],
                    },
                    {
                        // Dynamic title attribute in Svelte
                        code: "<div title={tooltipText}>Content</div>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenTitleAttribute" }],
                    },
                    {
                        // Boolean title attribute
                        code: "<span title>Hover text</span>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "forbiddenTitleAttribute" }],
                    },
                    {
                        // Title attribute on an element in HTML file
                        code: '<a href="/home" title="Go home">Home</a>',
                        filename: "index.html",
                        errors: [{ messageId: "forbiddenTitleAttribute" }],
                    },
                    {
                        // Title attribute on an SVG path in HTML file
                        code: '<svg><path d="M0 0" title="Path hover" /></svg>',
                        filename: "index.html",
                        errors: [{ messageId: "forbiddenTitleAttribute" }],
                    },
                ],
            });
        });
    });
});
