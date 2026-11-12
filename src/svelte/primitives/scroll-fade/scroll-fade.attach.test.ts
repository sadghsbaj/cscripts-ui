import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { SCROLL_FADE_DIRECTIONS, SCROLL_FADE_EDGES, SCROLL_FADE_SIZES, scrollFade } from "./scroll-fade.attach.ts";

describe("scrollFade Svelte 5 Element Attachment", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
    });

    describe("Initialization & DOM Attributes", () => {
        test("should apply base class and required data attributes", () => {
            const div = document.createElement("div");
            container.append(div);

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-scroll-fade")).toBe(true);
            expect(div.dataset.scrollFadeSize).toBe("md");
            expect(div.dataset.scrollFadeDirection).toBe("vertical");
            expect(div.dataset.scrollFadeEdges).toBe("both");

            cleanup?.();
        });

        test("should do nothing when enabled is false", () => {
            const div = document.createElement("div");
            container.append(div);

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both", enabled: false });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-scroll-fade")).toBe(false);
            expect(div.dataset.scrollFadeSize).toBeUndefined();
            expect(div.dataset.scrollFadeDirection).toBeUndefined();
            expect(div.dataset.scrollFadeEdges).toBeUndefined();

            cleanup?.();
        });

        test("should safely ignore non-HTMLElement elements", () => {
            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(svg);

            expect(svg.classList.contains("cs-scroll-fade")).toBe(false);
            cleanup?.();
        });
    });

    describe("Configuration Options", () => {
        test.each(SCROLL_FADE_SIZES)("should configure size attribute for '%s'", (size) => {
            const div = document.createElement("div");
            container.append(div);

            const attach = scrollFade({ size, direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.dataset.scrollFadeSize).toBe(size);
            cleanup?.();
        });

        test.each(SCROLL_FADE_DIRECTIONS)("should configure direction attribute for '%s'", (direction) => {
            const div = document.createElement("div");
            container.append(div);

            const attach = scrollFade({ size: "md", direction, edges: "both" });
            const cleanup = attach(div);

            expect(div.dataset.scrollFadeDirection).toBe(direction);
            cleanup?.();
        });

        test.each(SCROLL_FADE_EDGES)("should configure edges attribute for '%s'", (edges) => {
            const div = document.createElement("div");
            container.append(div);

            const attach = scrollFade({ size: "md", direction: "vertical", edges });
            const cleanup = attach(div);

            expect(div.dataset.scrollFadeEdges).toBe(edges);
            cleanup?.();
        });
    });

    describe("Teardown & Cleanup", () => {
        test("should remove base class and all data attributes on cleanup", () => {
            const div = document.createElement("div");
            container.append(div);

            const attach = scrollFade({ size: "lg", direction: "both", edges: "both" });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-scroll-fade")).toBe(true);
            expect(div.dataset.scrollFadeSize).toBe("lg");
            expect(div.dataset.scrollFadeDirection).toBe("both");
            expect(div.dataset.scrollFadeEdges).toBe("both");

            cleanup?.();

            expect(div.classList.contains("cs-scroll-fade")).toBe(false);
            expect(div.dataset.scrollFadeSize).toBeUndefined();
            expect(div.dataset.scrollFadeDirection).toBeUndefined();
            expect(div.dataset.scrollFadeEdges).toBeUndefined();
        });
    });
});
