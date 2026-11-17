import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { cardStructureRule } from "../card.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("card ESLint rules", () => {
    describe("card/require-structure", () => {
        it("validates direct-child placement of <Card> subcomponents", () => {
            ruleTester.run("card/require-structure", cardStructureRule, {
                valid: [
                    {
                        code: "<Card><CardHeader><CardTitle>Title</CardTitle><CardDescription>Desc</CardDescription></CardHeader><CardBody>Body</CardBody><CardFooter>Footer</CardFooter><CardClose /></Card>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Card><CardTitle>Title</CardTitle><CardDescription>Desc</CardDescription></Card>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Card><CardMedia /><CardRail /><CardOrnament /></Card>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Control-flow blocks are transparent between Card and direct children
                        code: "<Card>{#if show}<CardBody>Body</CardBody>{:else}<CardFooter>Footer</CardFooter>{/if}</Card>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Card>{#each items as item}<CardBody>{item}</CardBody>{/each}</Card>",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Card><CardHeader>{#if hasTitle}<CardTitle>Title</CardTitle>{/if}</CardHeader></Card>",
                        filename: "src/Component.svelte",
                    },
                    {
                        // Snippet definitions are exempt (may be rendered inside Card elsewhere)
                        code: "{#snippet body()}<CardBody>Body</CardBody>{/snippet}",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "{#snippet title()}<CardTitle>Title</CardTitle>{/snippet}",
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        // Subcomponent outside Card
                        code: "<CardBody>Body</CardBody>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardParent",
                                data: { name: "CardBody" },
                            },
                        ],
                    },
                    {
                        // CardTitle outside Card / CardHeader
                        code: "<CardTitle>Title</CardTitle>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardOrHeaderParent",
                                data: { name: "CardTitle" },
                            },
                        ],
                    },
                    {
                        // CardBody wrapped in extra <div> inside Card
                        code: "<Card><div><CardBody>Body</CardBody></div></Card>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardParent",
                                data: { name: "CardBody" },
                            },
                        ],
                    },
                    {
                        // CardClose wrapped in extra <div> inside Card
                        code: "<Card><div><CardClose /></div></Card>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardParent",
                                data: { name: "CardClose" },
                            },
                        ],
                    },
                    {
                        // CardClose placed inside CardHeader instead of Card
                        code: "<Card><CardHeader><CardClose /></CardHeader></Card>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardParent",
                                data: { name: "CardClose" },
                            },
                        ],
                    },
                    {
                        // CardTitle wrapped in <div> inside Card
                        code: "<Card><div><CardTitle>Title</CardTitle></div></Card>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardOrHeaderParent",
                                data: { name: "CardTitle" },
                            },
                        ],
                    },
                    {
                        // CardDescription placed inside CardBody instead of Card or CardHeader
                        code: "<Card><CardBody><CardDescription>Desc</CardDescription></CardBody></Card>",
                        filename: "src/Component.svelte",
                        errors: [
                            {
                                messageId: "requireDirectCardOrHeaderParent",
                                data: { name: "CardDescription" },
                            },
                        ],
                    },
                ],
            });
        });
    });
});
