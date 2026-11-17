import * as svelteParser from "svelte-eslint-parser";
import { describe, it } from "vitest";
import { RuleTester } from "eslint";

import { progressNoSegmentsOnBarRule, progressRequireAccessibleLabelRule } from "../progress.ts";

const ruleTester = new RuleTester({
    languageOptions: {
        parser: svelteParser,
    },
});

describe("progress ESLint rules", () => {
    describe("progress/require-accessible-label", () => {
        it("requires an accessible label on <Progress> unless hidden or spread", () => {
            ruleTester.run("progress/require-accessible-label", progressRequireAccessibleLabelRule, {
                valid: [
                    {
                        code: '<Progress value={50} aria-label="Upload progress" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Progress value={50} aria-labelledby="upload-label" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Progress value={50} aria-hidden="true" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Progress value={50} aria-hidden />",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: "<Progress value={50} {...props} />",
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<div role="progressbar"></div>',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: "<Progress value={50} />",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingAccessibleLabel" }],
                    },
                    {
                        code: '<Progress value={50} appearance="dashed" segments={5} />',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingAccessibleLabel" }],
                    },
                    {
                        code: "<Progress value={50} aria-hidden={false} />",
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "missingAccessibleLabel" }],
                    },
                ],
            });
        });
    });

    describe("progress/no-segments-on-bar", () => {
        it('warns when <Progress appearance="bar"> specifies segments', () => {
            ruleTester.run("progress/no-segments-on-bar", progressNoSegmentsOnBarRule, {
                valid: [
                    {
                        code: '<Progress value={50} aria-label="Loading" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Progress value={50} appearance="bar" aria-label="Loading" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Progress value={50} appearance="dashed" segments={5} aria-label="Loading" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Progress value={50} appearance="dotted" segments={5} aria-label="Loading" />',
                        filename: "src/Component.svelte",
                    },
                    {
                        code: '<Progress value={50} appearance={app} segments={5} aria-label="Loading" />',
                        filename: "src/Component.svelte",
                    },
                ],
                invalid: [
                    {
                        code: '<Progress value={50} appearance="bar" segments={5} aria-label="Loading" />',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "segmentsOnBar" }],
                    },
                    {
                        code: '<Progress value={50} appearance="bar" segments={10} />',
                        filename: "src/Component.svelte",
                        errors: [{ messageId: "segmentsOnBar" }],
                    },
                ],
            });
        });
    });
});
