import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import {
    scrollAreaNoOuterContentClassesRule,
    scrollAreaScrollFadeOnContentRule,
    scrollAreaStructureRule,
} from "../scroll-area.ts";

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
                        code: '<ScrollArea size="md" direction="vertical"><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical">{#if true}<ScrollAreaContent>Items</ScrollAreaContent>{/if}</ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<ScrollArea size="md" direction="vertical"><div>Missing content wrapper</div></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingContent" }],
                    },
                    {
                        code: "<div><ScrollAreaContent>Orphaned content</ScrollAreaContent></div>",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "orphanedContent" }],
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical"><ScrollAreaContent>Items</ScrollAreaContent><ScrollAreaOvershoot /></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "manualOvershoot" }],
                    },
                ],
            });
        });
    });

    describe("scroll-area/no-outer-content-classes", () => {
        it("forbids padding, gap/space, and overflow/scrollbar utilities on <ScrollArea>", () => {
            ruleTester.run("scroll-area/no-outer-content-classes", scrollAreaNoOuterContentClassesRule, {
                valid: [
                    {
                        code: '<ScrollArea size="md" direction="vertical" class="w-full max-h-40 m-4 rounded-xl border"><ScrollAreaContent class="p-8 lg:p-16 flex flex-col gap-4">Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<ScrollArea size="lg" direction="vertical" class="size-full p-8 lg:p-16"><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [
                            { messageId: "paddingOnOuterWrapper", data: { className: "p-8" } },
                            { messageId: "paddingOnOuterWrapper", data: { className: "lg:p-16" } },
                        ],
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical" class={["w-full", "px-4"]}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "paddingOnOuterWrapper", data: { className: "px-4" } }],
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical" class="gap-4 space-y-2"><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [
                            { messageId: "gapOnOuterWrapper", data: { className: "gap-4" } },
                            { messageId: "gapOnOuterWrapper", data: { className: "space-y-2" } },
                        ],
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical" class="overflow-y-auto scrollbar-sm"><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [
                            { messageId: "overflowOnOuterWrapper", data: { className: "overflow-y-auto" } },
                            { messageId: "overflowOnOuterWrapper", data: { className: "scrollbar-sm" } },
                        ],
                    },
                ],
            });
        });
    });

    describe("scroll-area/scroll-fade-on-content", () => {
        it("warns when scrollFade is attached to <ScrollArea> or has a mismatched direction", () => {
            ruleTester.run("scroll-area/scroll-fade-on-content", scrollAreaScrollFadeOnContentRule, {
                valid: [
                    {
                        code: '<ScrollArea size="md" direction="vertical"><ScrollAreaContent {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical" {@attach otherAttachment()}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<ScrollArea size="md" direction="vertical" {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "scrollFadeOnOuterWrapper" }],
                    },
                    {
                        code: '<ScrollArea size="md" direction="vertical" {@attach scrollFade}><ScrollAreaContent>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "scrollFadeOnOuterWrapper" }],
                    },
                    {
                        code: '<ScrollArea size="md" direction="horizontal"><ScrollAreaContent {@attach scrollFade({ size: "md", direction: "vertical", edges: "both" })}>Items</ScrollAreaContent></ScrollArea>',
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "directionMismatch",
                                data: { fadeDirection: "vertical", areaDirection: "horizontal" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
