import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { scrollFade } from "./scroll-fade.attach.ts";

/**
 * Helper to mock scroll metrics on an element.
 */
function mockScrollMetrics(
    el: HTMLElement,
    metrics: {
        clientHeight?: number;
        scrollHeight?: number;
        scrollTop?: number;
        clientWidth?: number;
        scrollWidth?: number;
        scrollLeft?: number;
    }
): void {
    if (metrics.clientHeight !== undefined) {
        Object.defineProperty(el, "clientHeight", {
            value: metrics.clientHeight,
            configurable: true,
        });
    }
    if (metrics.scrollHeight !== undefined) {
        Object.defineProperty(el, "scrollHeight", {
            value: metrics.scrollHeight,
            configurable: true,
        });
    }
    if (metrics.scrollTop !== undefined) {
        Object.defineProperty(el, "scrollTop", {
            value: metrics.scrollTop,
            configurable: true,
            writable: true,
        });
    }
    if (metrics.clientWidth !== undefined) {
        Object.defineProperty(el, "clientWidth", {
            value: metrics.clientWidth,
            configurable: true,
        });
    }
    if (metrics.scrollWidth !== undefined) {
        Object.defineProperty(el, "scrollWidth", {
            value: metrics.scrollWidth,
            configurable: true,
        });
    }
    if (metrics.scrollLeft !== undefined) {
        Object.defineProperty(el, "scrollLeft", {
            value: metrics.scrollLeft,
            configurable: true,
            writable: true,
        });
    }
}

describe("scrollFade Svelte 5 Element Attachment", () => {
    let container: HTMLDivElement;
    let styleEl: HTMLStyleElement;

    beforeEach(() => {
        // happy-dom does not yet parse native CSS @layer / nesting, so inject flat size rules for unit tests
        styleEl = document.createElement("style");
        styleEl.textContent = `
            .cs-scroll-fade[data-scroll-fade-size="sm"] { --cs-scroll-fade-size: 24px; }
            .cs-scroll-fade[data-scroll-fade-size="md"] { --cs-scroll-fade-size: 40px; }
            .cs-scroll-fade[data-scroll-fade-size="lg"] { --cs-scroll-fade-size: 64px; }
        `;
        document.head.append(styleEl);

        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        styleEl.remove();
        container.remove();
        vi.restoreAllMocks();
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
            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("");

            cleanup?.();
        });
    });

    describe("Directions & Horizontal Scrolling", () => {
        test("should calculate horizontal scroll fades and data attributes", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientWidth: 200, scrollWidth: 600, scrollLeft: 100 });

            const attach = scrollFade({ size: "md", direction: "horizontal", edges: "both" });
            const cleanup = attach(div);

            expect(div.dataset.scrollFadeDirection).toBe("horizontal");
            expect(div.style.getPropertyValue("--cs-scroll-fade-left")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-right")).toBe("40px");
            expect(div.dataset.scrollFadeCanScrollStart).toBe("true");
            expect(div.dataset.scrollFadeCanScrollEnd).toBe("true");

            cleanup?.();
        });

        test("should calculate both vertical and horizontal fades when direction is 'both'", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, {
                clientHeight: 200,
                scrollHeight: 600,
                scrollTop: 0,
                clientWidth: 200,
                scrollWidth: 600,
                scrollLeft: 400,
            });

            const attach = scrollFade({ size: "md", direction: "both", edges: "both" });
            const cleanup = attach(div);

            expect(div.dataset.scrollFadeDirection).toBe("both");
            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("0px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-left")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-right")).toBe("0px");
            expect(div.dataset.scrollFadeCanScrollStart).toBe("true");
            expect(div.dataset.scrollFadeCanScrollEnd).toBe("true");

            cleanup?.();
        });
    });

    describe("Vertical Scroll State Calculations", () => {
        test("should show bottom fade only when scrolled to top", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 0 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("0px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");
            expect(div.dataset.scrollFadeCanScrollStart).toBe("false");
            expect(div.dataset.scrollFadeCanScrollEnd).toBe("true");

            cleanup?.();
        });

        test("should show both top and bottom fade when scrolled in middle", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 150 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");
            expect(div.dataset.scrollFadeCanScrollStart).toBe("true");
            expect(div.dataset.scrollFadeCanScrollEnd).toBe("true");

            cleanup?.();
        });

        test("should show top fade only when scrolled to bottom", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 400 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("0px");
            expect(div.dataset.scrollFadeCanScrollStart).toBe("true");
            expect(div.dataset.scrollFadeCanScrollEnd).toBe("false");

            cleanup?.();
        });

        test("should show no fades when content does not overflow", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 300, scrollHeight: 300, scrollTop: 0 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("0px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("0px");
            expect(div.dataset.scrollFadeCanScrollStart).toBe("false");
            expect(div.dataset.scrollFadeCanScrollEnd).toBe("false");

            cleanup?.();
        });
    });

    describe("Smooth Scaling & Snapping", () => {
        test("should smoothly scale fade size when smooth is true", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 15 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both", smooth: true });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("15px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");

            cleanup?.();
        });

        test("should snap directly to max size when smooth is false", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 5 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both", smooth: false });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");

            cleanup?.();
        });
    });

    describe("Edge Filtering ('start' / 'end')", () => {
        test("should only fade start edge when edges is 'start'", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 100 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "start" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("0px");

            cleanup?.();
        });

        test("should only fade end edge when edges is 'end'", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 100 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "end" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("0px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");

            cleanup?.();
        });
    });

    describe("Edge Case Clamping (iOS / Safari Bounce)", () => {
        test("should clamp negative scrollTop during rubber-band bounce", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: -25 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("0px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");

            cleanup?.();
        });

        test("should clamp excessive scrollTop beyond maxScrollTop during bounce", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 450 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("40px");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("0px");

            cleanup?.();
        });
    });

    describe("onFadeChange Callback", () => {
        test("should invoke onFadeChange with comprehensive scroll detail", () => {
            const onFadeChange = vi.fn();
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 100 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both", onFadeChange });
            const cleanup = attach(div);

            expect(onFadeChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    element: div,
                    vertical: expect.objectContaining({
                        canScrollStart: true,
                        canScrollEnd: true,
                        isScrollable: true,
                        startFade: 40,
                        endFade: 40,
                    }),
                })
            );

            cleanup?.();
        });
    });

    describe("Size Presets & CSS Custom Property Override", () => {
        test("should apply sm preset (24px) via CSS", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 0 });

            const attach = scrollFade({ size: "sm", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("24px");
            cleanup?.();
        });

        test("should apply md preset (40px) via CSS", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 0 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("40px");
            cleanup?.();
        });

        test("should apply lg preset (64px) via CSS", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 0 });

            const attach = scrollFade({ size: "lg", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("64px");
            cleanup?.();
        });

        test("should respect custom --cs-scroll-fade-size CSS variable override", () => {
            const div = document.createElement("div");
            div.style.setProperty("--cs-scroll-fade-size", "55px");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 0 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("55px");
            cleanup?.();
        });
    });

    describe("Teardown & Cleanup Lifecycle", () => {
        test("should remove class, data attributes, and CSS custom properties upon cleanup", () => {
            const div = document.createElement("div");
            container.append(div);
            mockScrollMetrics(div, { clientHeight: 200, scrollHeight: 600, scrollTop: 100 });

            const attach = scrollFade({ size: "md", direction: "vertical", edges: "both" });
            const cleanup = attach(div);

            expect(div.classList.contains("cs-scroll-fade")).toBe(true);
            expect(div.dataset.scrollFadeSize).toBe("md");
            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).not.toBe("");

            cleanup?.();

            expect(div.classList.contains("cs-scroll-fade")).toBe(false);
            expect(div.dataset.scrollFadeSize).toBeUndefined();
            expect(div.dataset.scrollFadeDirection).toBeUndefined();
            expect(div.dataset.scrollFadeEdges).toBeUndefined();
            expect(div.dataset.scrollFadeCanScrollStart).toBeUndefined();
            expect(div.dataset.scrollFadeCanScrollEnd).toBeUndefined();
            expect(div.style.getPropertyValue("--cs-scroll-fade-top")).toBe("");
            expect(div.style.getPropertyValue("--cs-scroll-fade-bottom")).toBe("");
            expect(div.style.getPropertyValue("--cs-scroll-fade-left")).toBe("");
            expect(div.style.getPropertyValue("--cs-scroll-fade-right")).toBe("");
        });
    });
});
