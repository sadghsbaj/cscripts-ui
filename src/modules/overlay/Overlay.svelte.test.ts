import { mount, tick, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import Overlay from "./Overlay.svelte";

describe("Overlay Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders with data-scroll-locked attribute by default", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        expect(overlayEl).not.toBeNull();
        if (overlayEl) {
            expect("scrollLocked" in overlayEl.dataset).toBe(true);
        }

        unmount(instance);
    });

    test("omits data-scroll-locked when lockScroll is explicitly false", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
                lockScroll: false,
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        expect(overlayEl).not.toBeNull();
        if (overlayEl) {
            expect("scrollLocked" in overlayEl.dataset).toBe(false);
        }

        unmount(instance);
    });

    test("prevents default on wheel events occurring directly on the backdrop", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
                lockScroll: true,
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        expect(overlayEl).not.toBeNull();

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        overlayEl?.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(true);

        unmount(instance);
    });

    test("does not prevent default on wheel events when lockScroll is false", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
                lockScroll: false,
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        expect(overlayEl).not.toBeNull();

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        overlayEl?.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(false);

        unmount(instance);
    });

    test("prevents default on wheel events targeting non-scrollable child content", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
                lockScroll: true,
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        const nonScrollableChild = document.createElement("div");
        const header = document.createElement("h2");
        header.textContent = "Modal Title";
        nonScrollableChild.append(header);
        overlayEl?.append(nonScrollableChild);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        header.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(true);

        unmount(instance);
    });

    test("allows wheel events on scrollable child content (e.g. cs-scroll-area-content)", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
                lockScroll: true,
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        const scrollArea = document.createElement("div");
        scrollArea.classList.add("cs-scroll-area-content");
        Object.defineProperties(scrollArea, {
            clientHeight: { configurable: true, value: 200 },
            scrollHeight: { configurable: true, value: 500 },
        });

        const item = document.createElement("p");
        item.textContent = "Scrollable paragraph";
        scrollArea.append(item);
        overlayEl?.append(scrollArea);

        const wheelEvent = new WheelEvent("wheel", { bubbles: true, cancelable: true });
        item.dispatchEvent(wheelEvent);

        expect(wheelEvent.defaultPrevented).toBe(false);

        unmount(instance);
    });

    test("prevents default on touchmove events occurring on the backdrop", async () => {
        const instance = mount(Overlay, {
            target: container,
            props: {
                variant: "dim",
                lockScroll: true,
            },
        });
        await tick();

        const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
        const touchEvent = new TouchEvent("touchmove", { bubbles: true, cancelable: true });
        overlayEl?.dispatchEvent(touchEvent);

        expect(touchEvent.defaultPrevented).toBe(true);

        unmount(instance);
    });
});
