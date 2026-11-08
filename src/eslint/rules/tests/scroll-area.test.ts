import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "bun:test";
import { RuleTester } from "eslint";

import { scrollAreaScrollFadeOnContentRule, scrollAreaStructureRule } from "../scroll-area.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("scroll-area ESLint rules", () => {
    describe("scroll-area/require-structure", () => {
        it("enforces <ScrollArea> and <ScrollAreaContent> compound structure", () => {
            ruleTester.run("scroll-area/require-structure", scrollAreaStructureRule, {
                valid: [
                    {
                        code: '<ScrollArea direction="vertical"><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ScrollArea direction="vertical">{#if true}<ScrollAreaContent>Items</ScrollAreaContent>{/if}</ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<ScrollArea direction="vertical"><div>Missing content wrapper</div></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingContent" }],
                    },
                    {
                        code: "<div><ScrollAreaContent>Orphaned content</ScrollAreaContent></div>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "orphanedContent" }],
                    },
                ],
            });
        });
    });

    describe("scroll-area/scroll-fade-on-content", () => {
        it("warns when scrollFade is attached to <ScrollArea> instead of <ScrollAreaContent>", () => {
            ruleTester.run("scroll-area/scroll-fade-on-content", scrollAreaScrollFadeOnContentRule, {
                valid: [
                    {
                        code: '<ScrollArea direction="vertical"><ScrollAreaContent {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ScrollArea direction="vertical" {@attach otherAttachment()}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<ScrollArea direction="vertical" {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "scrollFadeOnOuterWrapper" }],
                    },
                    {
                        code: '<ScrollArea direction="vertical" {@attach scrollFade}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "scrollFadeOnOuterWrapper" }],
                    },
                ],
            });
        });
    });
});
