import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { autoResize } from "./index.ts";

const ALL_CSS_VARS = [
    "--cs-auto-resize-min-rows",
    "--cs-auto-resize-max-rows",
    "--cs-auto-resize-min-height",
    "--cs-auto-resize-max-height",
    "--cs-auto-resize-min-width",
    "--cs-auto-resize-max-width",
    "--cs-auto-resize-chrome-block",
] as const;

function createStyledNativeTextarea(container: HTMLElement): HTMLTextAreaElement {
    const textarea = document.createElement("textarea");
    textarea.style.paddingTop = "6px";
    textarea.style.paddingBottom = "8px";
    textarea.style.borderTop = "1px solid black";
    textarea.style.borderBottom = "2px solid black";
    container.append(textarea);
    return textarea;
}

describe("autoResize Svelte 5 Element Attachment", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe("Attachment Lifecycle & DOM Attributes", () => {
        test("adds .cs-auto-resize and data-auto-resize='' on attach with zero arguments", () => {
            const textarea = document.createElement("textarea");
            container.append(textarea);

            const cleanup = autoResize()(textarea);

            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            for (const cssVar of ALL_CSS_VARS) {
                expect(textarea.style.getPropertyValue(cssVar)).toBe("");
            }

            cleanup?.();
        });

        test("safely ignores non-HTMLElement nodes such as SVG", () => {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            container.append(svg);

            const cleanup = autoResize({ minWidth: 100 })(svg as unknown as HTMLElement);

            expect(svg.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in svg.dataset).toBe(false);

            cleanup?.();
        });

        test("removes .cs-auto-resize, data-auto-resize, and all --cs-auto-resize-* properties on teardown", () => {
            const textarea = document.createElement("textarea");
            container.append(textarea);

            // Attach with row bounds first, then simulate all seven vars being present on style
            const cleanup = autoResize({
                minRows: 2,
                maxRows: 6,
                minWidth: 120,
                maxWidth: 400,
            })(textarea);

            textarea.style.setProperty("--cs-auto-resize-min-height", "48px");
            textarea.style.setProperty("--cs-auto-resize-max-height", "240px");

            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            for (const cssVar of ALL_CSS_VARS) {
                expect(textarea.style.getPropertyValue(cssVar)).not.toBe("");
            }

            cleanup?.();

            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect(textarea.dataset.autoResize).toBeUndefined();
            expect("autoResize" in textarea.dataset).toBe(false);
            for (const cssVar of ALL_CSS_VARS) {
                expect(textarea.style.getPropertyValue(cssVar)).toBe("");
            }
        });

        test("preserves unrelated classes, data attributes, and inline styles on teardown", () => {
            const textarea = document.createElement("textarea");
            textarea.classList.add("custom-class");
            textarea.dataset.customAttr = "keep";
            textarea.style.color = "red";
            container.append(textarea);

            const cleanup = autoResize({ minRows: 2, maxRows: 5, minWidth: 80 })(textarea);
            cleanup?.();

            expect(textarea.classList.contains("custom-class")).toBe(true);
            expect(textarea.dataset.customAttr).toBe("keep");
            expect(textarea.style.color).toBe("red");
        });
    });

    describe("enabled Option", () => {
        test("does nothing when enabled is false", () => {
            const textarea = document.createElement("textarea");
            textarea.rows = 3;
            container.append(textarea);

            const cleanup = autoResize({
                enabled: false,
                minRows: 2,
                maxRows: 6,
                minWidth: 100,
                maxWidth: 300,
            })(textarea);

            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);
            for (const cssVar of ALL_CSS_VARS) {
                expect(textarea.style.getPropertyValue(cssVar)).toBe("");
            }

            cleanup?.();
        });

        test("respects getter enabled: () => false and enabled: () => true", () => {
            const textarea = document.createElement("textarea");
            container.append(textarea);

            let isEnabled = false;
            const attach = autoResize({ enabled: () => isEnabled, minRows: 2 });

            const cleanupDisabled = attach(textarea);
            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);
            cleanupDisabled?.();

            isEnabled = true;
            const cleanupEnabled = attach(textarea);
            expect(textarea.classList.contains("cs-auto-resize")).toBe(true);
            expect(textarea.dataset.autoResize).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("2");
            cleanupEnabled?.();

            expect(textarea.classList.contains("cs-auto-resize")).toBe(false);
            expect("autoResize" in textarea.dataset).toBe(false);
        });
    });

    describe("Row Bounds (minRows & maxRows)", () => {
        test("infers minRows from <textarea rows={3}> when minRows is omitted", () => {
            const textarea = document.createElement("textarea");
            textarea.setAttribute("rows", "3");
            container.append(textarea);

            const cleanup = autoResize()(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("3");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");

            cleanup?.();
        });

        test("omits --cs-auto-resize-min-rows when <textarea> has no rows attribute and minRows is omitted", () => {
            const textarea = document.createElement("textarea");
            container.append(textarea);

            expect(textarea.hasAttribute("rows")).toBe(false);

            const cleanup = autoResize()(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");

            cleanup?.();
        });

        test("does not infer minRows on <input> elements", () => {
            const input = document.createElement("input");
            container.append(input);

            const cleanup = autoResize()(input);

            expect(input.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");

            cleanup?.();
        });

        test("explicit minRows overrides <textarea rows> and maxRows sets --cs-auto-resize-max-rows", () => {
            const textarea = document.createElement("textarea");
            textarea.setAttribute("rows", "3");
            container.append(textarea);

            const cleanup = autoResize({ minRows: 5, maxRows: 10 })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("5");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("10");

            cleanup?.();
        });

        test.each([0, -1, 0.5, 1.5, 2.5, NaN, Infinity, -Infinity])(
            "ignores invalid/non-positive/fractional row count %s for minRows and maxRows",
            (invalidRows) => {
                const textarea = document.createElement("textarea");
                container.append(textarea);

                const cleanup = autoResize({ minRows: invalidRows, maxRows: invalidRows })(textarea);

                expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
                expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");
                expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

                cleanup?.();
            },
        );

        test.each(["abc", "0", "-2", "2.5"])(
            "ignores invalid rows attribute %j when inferring minRows",
            (invalidRowsAttr) => {
                const textarea = document.createElement("textarea");
                textarea.setAttribute("rows", invalidRowsAttr);
                container.append(textarea);

                const cleanup = autoResize()(textarea);

                expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
                expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

                cleanup?.();
            },
        );
    });

    describe("Dimension Bounds (minHeight, maxHeight, minWidth, maxWidth) & Precedence", () => {
        test("formats finite numbers as px and passes non-empty CSS length strings through", () => {
            const textarea = document.createElement("textarea");
            container.append(textarea);

            const cleanupNumeric = autoResize({
                minHeight: 80,
                maxHeight: 320,
                minWidth: 0,
                maxWidth: 480,
            })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-height")).toBe("80px");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-height")).toBe("320px");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("0px");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-width")).toBe("480px");
            cleanupNumeric?.();

            const cleanupString = autoResize({
                minHeight: "5rem",
                maxHeight: "40dvh",
                minWidth: "60px",
                maxWidth: "100%",
            })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-height")).toBe("5rem");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-height")).toBe("40dvh");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-width")).toBe("60px");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-width")).toBe("100%");
            cleanupString?.();
        });

        test("ignores non-finite numbers and empty or whitespace-only strings", () => {
            const input = document.createElement("input");
            container.append(input);

            const cleanupInvalidNumbers = autoResize({
                minHeight: NaN,
                maxHeight: Infinity,
                minWidth: -Infinity,
                maxWidth: NaN,
            })(input);

            for (const cssVar of ALL_CSS_VARS) {
                expect(input.style.getPropertyValue(cssVar)).toBe("");
            }
            cleanupInvalidNumbers?.();

            const cleanupEmptyStrings = autoResize({
                minHeight: "",
                maxHeight: " ".repeat(3),
                minWidth: "\t",
                maxWidth: "",
            })(input);

            for (const cssVar of ALL_CSS_VARS) {
                expect(input.style.getPropertyValue(cssVar)).toBe("");
            }
            cleanupEmptyStrings?.();
        });

        test("minHeight takes precedence over minRows (and inferred rows) and maxHeight takes precedence over maxRows", () => {
            const textarea = document.createElement("textarea");
            textarea.setAttribute("rows", "3");
            container.append(textarea);

            const cleanup = autoResize({
                minRows: 2,
                maxRows: 8,
                minHeight: 96,
                maxHeight: "24rem",
            })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-height")).toBe("96px");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-height")).toBe("24rem");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-min-rows")).toBe("");
            expect(textarea.style.getPropertyValue("--cs-auto-resize-max-rows")).toBe("");

            cleanup?.();
        });
    });

    describe("Native <textarea> Chrome Block Fallback (--cs-auto-resize-chrome-block)", () => {
        test("sets --cs-auto-resize-chrome-block from padding and border block widths when minRows is active", () => {
            const textarea = createStyledNativeTextarea(container);

            const cleanup = autoResize({ minRows: 2 })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("17px");

            cleanup?.();
        });

        test("sets --cs-auto-resize-chrome-block when maxRows is active or rows attribute is inferred", () => {
            const maxRowsTextarea = createStyledNativeTextarea(container);
            const cleanupMaxRows = autoResize({ maxRows: 5 })(maxRowsTextarea);
            expect(maxRowsTextarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("17px");
            cleanupMaxRows?.();

            const attrRowsTextarea = createStyledNativeTextarea(container);
            attrRowsTextarea.setAttribute("rows", "3");
            const cleanupAttrRows = autoResize()(attrRowsTextarea);
            expect(attrRowsTextarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("17px");
            cleanupAttrRows?.();
        });

        test("does not set --cs-auto-resize-chrome-block when .cs-text-area is present", () => {
            const textarea = createStyledNativeTextarea(container);
            textarea.classList.add("cs-text-area");

            const cleanup = autoResize({ minRows: 2, maxRows: 6 })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

            cleanup?.();
        });

        test("does not set --cs-auto-resize-chrome-block when minHeight and maxHeight override rows", () => {
            const textarea = createStyledNativeTextarea(container);

            const cleanup = autoResize({
                minRows: 2,
                maxRows: 6,
                minHeight: 80,
                maxHeight: 240,
            })(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

            cleanup?.();
        });

        test("does not set --cs-auto-resize-chrome-block when neither minRows nor maxRows is active", () => {
            const textarea = createStyledNativeTextarea(container);

            const cleanup = autoResize()(textarea);

            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");

            cleanup?.();
        });

        test("removes --cs-auto-resize-chrome-block on teardown", () => {
            const textarea = createStyledNativeTextarea(container);

            const cleanup = autoResize({ minRows: 2 })(textarea);
            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("17px");

            cleanup?.();
            expect(textarea.style.getPropertyValue("--cs-auto-resize-chrome-block")).toBe("");
        });
    });
});
