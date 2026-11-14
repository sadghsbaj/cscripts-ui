import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { scrollLock } from "./index";

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

    test("responds reactively to getter function and updates dataset dynamically", async () => {
        let isLocked = $state(false);
        const attach = scrollLock(() => isLocked);
        const cleanup = attach(container);
        await tick();

        expect("scrollLocked" in container.dataset).toBe(false);

        isLocked = true;
        await tick();
        expect("scrollLocked" in container.dataset).toBe(true);

        // Trigger wheel event while dynamically active
        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        container.dispatchEvent(wheelEvent);
        expect(wheelEvent.defaultPrevented).toBe(true);

        isLocked = false;
        await tick();
        expect("scrollLocked" in container.dataset).toBe(false);

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

    test("allows wheel events on scrollable child element when scroll room remains, but prevents chaining at edges", async () => {
        const attach = scrollLock();
        const cleanup = attach(container);
        await tick();

        const scrollArea = document.createElement("div");
        scrollArea.classList.add("cs-scroll-area-content");
        scrollArea.scrollTop = 50;
        Object.defineProperties(scrollArea, {
            clientHeight: { configurable: true, value: 200 },
            scrollHeight: { configurable: true, value: 500 },
        });

        const paragraph = document.createElement("p");
        paragraph.textContent = "Inner content";
        scrollArea.append(paragraph);
        container.append(scrollArea);

        // Scrolling down in the middle of content -> allowed
        const wheelEventDown = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 30 });
        paragraph.dispatchEvent(wheelEventDown);
        expect(wheelEventDown.defaultPrevented).toBe(false);

        // Scrolling up in the middle of content -> allowed
        const wheelEventUp = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -30 });
        paragraph.dispatchEvent(wheelEventUp);
        expect(wheelEventUp.defaultPrevented).toBe(false);

        // Scrolled all the way to the bottom edge
        scrollArea.scrollTop = 300; // 300 + 200 = 500
        const wheelEventAtBottom = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 30 });
        paragraph.dispatchEvent(wheelEventAtBottom);
        expect(wheelEventAtBottom.defaultPrevented).toBe(true);

        // At bottom edge, but scrolling UP -> allowed
        const wheelEventUpFromBottom = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -30 });
        paragraph.dispatchEvent(wheelEventUpFromBottom);
        expect(wheelEventUpFromBottom.defaultPrevented).toBe(false);

        // Scrolled all the way to the top edge
        scrollArea.scrollTop = 0;
        const wheelEventAtTop = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: -30 });
        paragraph.dispatchEvent(wheelEventAtTop);
        expect(wheelEventAtTop.defaultPrevented).toBe(true);

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
        customViewport.scrollTop = 10;
        Object.defineProperties(customViewport, {
            clientHeight: { configurable: true, value: 100 },
            scrollHeight: { configurable: true, value: 200 },
        });

        const span = document.createElement("span");
        customViewport.append(span);
        container.append(customViewport);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY: 20 });
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
