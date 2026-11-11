import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { scrollLock } from "./scroll-lock.attach";

describe("scrollLock Svelte 5 Element Attachment", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("applies data-scroll-locked by default", async () => {
        const attach = scrollLock();
        const cleanup = attach(container);
        await tick();

        expect("scrollLocked" in container.dataset).toBe(true);

        cleanup?.();
        expect("scrollLocked" in container.dataset).toBe(false);
    });

    test("does not apply data-scroll-locked when enabled is false via boolean shorthand", async () => {
        const attach = scrollLock(false);
        const cleanup = attach(container);
        await tick();

        expect("scrollLocked" in container.dataset).toBe(false);

        cleanup?.();
    });

    test("responds reactively to getter function", async () => {
        let isLocked = false;
        const attach = scrollLock(() => isLocked);
        const cleanup = attach(container);
        await tick();

        expect("scrollLocked" in container.dataset).toBe(false);

        isLocked = true;
        // Trigger wheel event while dynamically active
        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        container.dispatchEvent(wheelEvent);
        expect(wheelEvent.defaultPrevented).toBe(true);

        cleanup?.();
    });

    test("prevents default on wheel events occurring directly on the boundary", async () => {
        const attach = scrollLock();
        const cleanup = attach(container);
        await tick();

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        container.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(true);

        cleanup?.();
    });

    test("does not prevent default when enabled is false", async () => {
        const attach = scrollLock(false);
        const cleanup = attach(container);
        await tick();

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        container.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(false);

        cleanup?.();
    });

    test("prevents default on wheel events targeting non-scrollable child content", async () => {
        const attach = scrollLock();
        const cleanup = attach(container);
        await tick();

        const child = document.createElement("div");
        const title = document.createElement("h2");
        title.textContent = "Title";
        child.append(title);
        container.append(child);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        title.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(true);

        cleanup?.();
    });

    test("allows wheel events on scrollable child element with cs-scroll-area-content", async () => {
        const attach = scrollLock();
        const cleanup = attach(container);
        await tick();

        const scrollArea = document.createElement("div");
        scrollArea.classList.add("cs-scroll-area-content");
        Object.defineProperties(scrollArea, {
            clientHeight: { configurable: true, value: 200 },
            scrollHeight: { configurable: true, value: 500 },
        });

        const paragraph = document.createElement("p");
        paragraph.textContent = "Inner content";
        scrollArea.append(paragraph);
        container.append(scrollArea);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        paragraph.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(false);

        cleanup?.();
    });

    test("supports custom isScrollable predicate", async () => {
        const attach = scrollLock({
            isScrollable: (element) => element.classList.contains("custom-viewport"),
        });
        const cleanup = attach(container);
        await tick();

        const customViewport = document.createElement("div");
        customViewport.classList.add("custom-viewport");

        const span = document.createElement("span");
        customViewport.append(span);
        container.append(customViewport);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        span.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(false);

        cleanup?.();
    });

    test("blocks all children when allowScrollableChildren is false", async () => {
        const attach = scrollLock({
            allowScrollableChildren: false,
        });
        const cleanup = attach(container);
        await tick();

        const scrollArea = document.createElement("div");
        scrollArea.classList.add("cs-scroll-area-content");
        Object.defineProperties(scrollArea, {
            clientHeight: { configurable: true, value: 200 },
            scrollHeight: { configurable: true, value: 500 },
        });

        const paragraph = document.createElement("p");
        scrollArea.append(paragraph);
        container.append(scrollArea);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        paragraph.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(true);

        cleanup?.();
    });

    test("prevents default on touchmove events occurring on the boundary", async () => {
        const attach = scrollLock();
        const cleanup = attach(container);
        await tick();

        const touchEvent = new TouchEvent("touchmove", { bubbles: true, cancelable: true });
        container.dispatchEvent(touchEvent);

        expect(touchEvent.defaultPrevented).toBe(true);

        cleanup?.();
    });
});
