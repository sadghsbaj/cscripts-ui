import { parseForESLint, type AST } from "svelte-eslint-parser";
import { describe, expect, it } from "vitest";
import type { Rule } from "eslint";

import {
    findAttribute,
    findRawIcons,
    getElementName,
    getImportedIconNames,
    getLiteralStringValue,
    hasAccessibleLabel,
    hasDescendantElement,
    hasTooltipAttachment,
    isTruthyAttribute,
    shouldSkipFile,
} from "../utils.ts";

function parseSnippet(code: string): {
    ast: AST.SvelteProgram;
    elements: AST.SvelteElement[];
} {
    const res = parseForESLint(code);
    return {
        ast: res.ast,
        elements: res.ast.body.filter((node): node is AST.SvelteElement => node.type === "SvelteElement"),
    };
}

describe("utils AST helpers", () => {
    describe("shouldSkipFile", () => {
        it("identifies files that should be skipped", () => {
            expect(shouldSkipFile({ filename: "src/eslint/rules/button.ts" } as Rule.RuleContext)).toBe(true);
            expect(shouldSkipFile({ filename: "src/button.test.ts" } as Rule.RuleContext)).toBe(true);
            expect(shouldSkipFile({ filename: "src/button.spec.ts" } as Rule.RuleContext)).toBe(true);
            expect(shouldSkipFile({ filename: "src/svelte/Button.svelte" } as Rule.RuleContext)).toBe(false);
            expect(shouldSkipFile({ filename: undefined } as unknown as Rule.RuleContext)).toBe(false);
        });
    });

    describe("getElementName", () => {
        it("extracts element and component names", () => {
            const parsed = parseSnippet("<Button /><div />");
            const [btn, div] = parsed.elements;
            if (!btn || !div) throw new Error("Expected 2 elements");

            expect(getElementName(btn)).toBe("Button");
            expect(getElementName(div)).toBe("div");
        });
    });

    describe("findAttribute and getLiteralStringValue", () => {
        it("finds attributes and extracts string values properly", () => {
            const parsed = parseSnippet('<Button variant="solid" size={"md"} disabled dynamic={computed} />');
            const [btn] = parsed.elements;
            if (!btn) throw new Error("Expected button element");

            const variantAttr = findAttribute(btn, "variant");
            expect(variantAttr).toBeDefined();
            if (variantAttr) {
                expect(getLiteralStringValue(variantAttr)).toBe("solid");
            }

            const sizeAttr = findAttribute(btn, "size");
            expect(sizeAttr).toBeDefined();
            if (sizeAttr) {
                expect(getLiteralStringValue(sizeAttr)).toBe("md");
            }

            const disabledAttr = findAttribute(btn, "disabled");
            expect(disabledAttr).toBeDefined();
            if (disabledAttr) {
                expect(getLiteralStringValue(disabledAttr)).toBe("");
            }

            const dynamicAttr = findAttribute(btn, "dynamic");
            expect(dynamicAttr).toBeDefined();
            if (dynamicAttr) {
                expect(getLiteralStringValue(dynamicAttr)).toBeUndefined();
            }

            expect(findAttribute(btn, "nonexistent")).toBeUndefined();
        });
    });

    describe("isTruthyAttribute", () => {
        it("identifies truthy boolean and mustache expressions", () => {
            const parsed = parseSnippet('<Button iconOnly boolAttr={true} strAttr="true" falseAttr={false} />');
            const [btn] = parsed.elements;
            if (!btn) throw new Error("Expected button element");

            expect(isTruthyAttribute(btn, "iconOnly")).toBe(true);
            expect(isTruthyAttribute(btn, "boolAttr")).toBe(true);
            expect(isTruthyAttribute(btn, "strAttr")).toBe(true);
            expect(isTruthyAttribute(btn, "falseAttr")).toBe(false);
            expect(isTruthyAttribute(btn, "missingAttr")).toBe(false);
        });
    });

    describe("hasAccessibleLabel", () => {
        it("checks aria-label and aria-labelledby", () => {
            const snippet = [
                '<Button aria-label="Submit" />',
                '<Button aria-labelledby="heading-1" />',
                "<Button aria-label={dynamicLabel} />",
                '<Button aria-label="   " />',
                "<Button />",
            ].join("\n");

            const parsed = parseSnippet(snippet);
            const [withLabel, withLabelledBy, withDynamic, withWhitespace, withoutLabel] = parsed.elements;
            if (!withLabel || !withLabelledBy || !withDynamic || !withWhitespace || !withoutLabel) {
                throw new Error("Expected 5 button elements");
            }

            expect(hasAccessibleLabel(withLabel)).toBe(true);
            expect(hasAccessibleLabel(withLabelledBy)).toBe(true);
            expect(hasAccessibleLabel(withDynamic)).toBe(true);
            expect(hasAccessibleLabel(withWhitespace)).toBe(false);
            expect(hasAccessibleLabel(withoutLabel)).toBe(false);
        });
    });

    describe("hasDescendantElement", () => {
        it("traverses nested elements and conditional blocks", () => {
            const parsed = parseSnippet(`
                <Button>
                    {#if condition}
                        <span><ButtonIcon /></span>
                    {:else}
                        <ButtonLabel />
                    {/if}
                </Button>
            `);

            const [btn] = parsed.elements;
            if (!btn) throw new Error("Expected button element");

            expect(hasDescendantElement(btn.children, "ButtonIcon")).toBe(true);
            expect(hasDescendantElement(btn.children, "ButtonLabel")).toBe(true);
            expect(hasDescendantElement(btn.children, "HitArea")).toBe(false);
        });
    });

    describe("getImportedIconNames and findRawIcons", () => {
        it("detects imported icons and flags raw icons inside buttons", () => {
            const code = [
                "<script>",
                '    import { Check, X as CloseIcon } from "@lucide/svelte";',
                '    import { Other } from "somewhere-else";',
                "</script>",
                "",
                "<Button>",
                "    <Check />",
                "    <svg></svg>",
                "    <ButtonIcon icon={Check} />",
                "</Button>",
            ].join("\n");

            const parsed = parseSnippet(code);
            const context = {
                sourceCode: { ast: parsed.ast },
            } as unknown as Rule.RuleContext;

            const iconNames = getImportedIconNames(context);
            expect(iconNames.has("Check")).toBe(true);
            expect(iconNames.has("CloseIcon")).toBe(true);
            expect(iconNames.has("Other")).toBe(false);

            const [btn] = parsed.elements;
            if (!btn) throw new Error("Expected button element");

            const rawIcons = findRawIcons(btn.children, iconNames);
            const rawNames = rawIcons.map((i) => getElementName(i));

            expect(rawNames).toContain("Check");
            expect(rawNames).toContain("svg");
            expect(rawNames).not.toContain("ButtonIcon");
        });
    });

    describe("hasTooltipAttachment", () => {
        it("detects tooltip attachments on elements", () => {
            const parsed = parseSnippet(`
                <Button {@attach tooltip("Settings")} />
                <Button {@attach tooltip({ text: "Settings" })} />
                <Button {@attach customTooltip("Settings")} />
                <Button tooltip="Settings" />
                <Button />
            `);

            const [b1, b2, b3, b4, b5] = parsed.elements;
            if (!b1 || !b2 || !b3 || !b4 || !b5) {
                throw new Error("Expected 5 parsed button elements");
            }
            expect(hasTooltipAttachment(b1)).toBe(true);
            expect(hasTooltipAttachment(b2)).toBe(true);
            expect(hasTooltipAttachment(b3)).toBe(true);
            expect(hasTooltipAttachment(b4)).toBe(true);
            expect(hasTooltipAttachment(b5)).toBe(false);
        });
    });
});
