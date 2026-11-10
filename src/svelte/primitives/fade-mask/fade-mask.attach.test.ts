import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { FADE_MASK_STRENGTHS, FADE_MASK_VARIANTS, fadeMask } from "./fade-mask.attach.ts";

describe("fadeMask Svelte 5 Element Attachment", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Initialization & DOM Attributes", () => {
        test("should apply base class and required data attributes", () => {
            const div = document.createElement("div");
            container.append(div);

            const attach = fadeMask({ variant: "radial", strength: "md" });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-fade-mask")).toBe(true);
            expect(div.dataset.fadeMaskVariant).toBe("radial");
            expect(div.dataset.fadeMaskStrength).toBe("md");

            cleanup?.();
        });

        test("should do nothing when enabled is false", () => {
            const div = document.createElement("div");
            container.append(div);

            const attach = fadeMask({ variant: "radial", strength: "md", enabled: false });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-fade-mask")).toBe(false);
            expect(div.dataset.fadeMaskVariant).toBeUndefined();
            expect(div.dataset.fadeMaskStrength).toBeUndefined();

            cleanup?.();
        });
    });

    describe("Variants & Strengths", () => {
        test("should set data-fade-mask-variant for all supported variants", () => {
            for (const variant of FADE_MASK_VARIANTS) {
                const el = document.createElement("div");
                container.append(el);

                const attach = fadeMask({ variant, strength: "md" });
                const cleanup = attach(el);

                expect(el.classList.contains("cs-fade-mask")).toBe(true);
                expect(el.dataset.fadeMaskVariant).toBe(variant);

                cleanup?.();
            }
        });

        test("should set data-fade-mask-strength for all supported strengths", () => {
            for (const strength of FADE_MASK_STRENGTHS) {
                const el = document.createElement("div");
                container.append(el);

                const attach = fadeMask({ variant: "radial", strength });
                const cleanup = attach(el);

                expect(el.classList.contains("cs-fade-mask")).toBe(true);
                expect(el.dataset.fadeMaskStrength).toBe(strength);

                cleanup?.();
            }
        });
    });

    describe("HTML & SVG Element Compatibility", () => {
        test("should apply class and data attributes to an SVG element", () => {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            container.append(svg);

            const attach = fadeMask({ variant: "radial", strength: "lg" });
            const cleanup = attach(svg);

            expect(svg.classList.contains("cs-fade-mask")).toBe(true);
            expect(svg.dataset.fadeMaskVariant).toBe("radial");
            expect(svg.dataset.fadeMaskStrength).toBe("lg");

            cleanup?.();
        });
    });

    describe("Teardown & Cleanup Lifecycle", () => {
        test("should remove class and data attributes upon teardown", () => {
            const div = document.createElement("div");
            container.append(div);

            const attach = fadeMask({ variant: "radial", strength: "md" });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-fade-mask")).toBe(true);
            expect(div.dataset.fadeMaskVariant).toBe("radial");
            expect(div.dataset.fadeMaskStrength).toBe("md");

            cleanup?.();

            expect(div.classList.contains("cs-fade-mask")).toBe(false);
            expect(div.dataset.fadeMaskVariant).toBeUndefined();
            expect(div.dataset.fadeMaskStrength).toBeUndefined();
        });

        test("should preserve unrelated existing classes and data attributes upon cleanup", () => {
            const div = document.createElement("div");
            div.classList.add("custom-class");
            div.dataset.customAttr = "keep";
            container.append(div);

            const attach = fadeMask({ variant: "radial", strength: "md" });
            const cleanup = attach(div);

            cleanup?.();

            expect(div.classList.contains("custom-class")).toBe(true);
            expect(div.dataset.customAttr).toBe("keep");
        });
    });
});
