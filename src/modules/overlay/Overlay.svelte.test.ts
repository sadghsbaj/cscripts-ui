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

    describe("VisualViewport safe-area tracking", () => {
        interface MockVisualViewport extends EventTarget {
            height: number;
            width: number;
            offsetTop: number;
            offsetLeft: number;
            pageTop: number;
            pageLeft: number;
            scale: number;
        }

        let mockVv: MockVisualViewport;
        let originalVisualViewport: VisualViewport | null;
        let originalInnerHeight: number;

        beforeEach(() => {
            originalVisualViewport = window.visualViewport;
            originalInnerHeight = window.innerHeight;

            mockVv = Object.assign(new EventTarget(), {
                height: 800,
                width: 1024,
                offsetTop: 0,
                offsetLeft: 0,
                pageTop: 0,
                pageLeft: 0,
                scale: 1,
            });

            Object.defineProperties(window, {
                innerHeight: {
                    configurable: true,
                    writable: true,
                    value: 800,
                },
                visualViewport: {
                    configurable: true,
                    writable: true,
                    value: mockVv,
                },
            });
        });

        afterEach(() => {
            Object.defineProperties(window, {
                visualViewport: {
                    configurable: true,
                    writable: true,
                    value: originalVisualViewport,
                },
                innerHeight: {
                    configurable: true,
                    writable: true,
                    value: originalInnerHeight,
                },
            });
        });

        test("leaves inset CSS variables unset in default state when visualViewport matches innerHeight", async () => {
            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");

            unmount(instance);
        });

        test("sets --cs-overlay-inset-bottom when virtual keyboard opens and shrinks visualViewport.height", async () => {
            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();

            mockVv.height = 500;
            mockVv.offsetTop = 0;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("300px");

            unmount(instance);
        });

        test("sets both --cs-overlay-inset-top and --cs-overlay-inset-bottom on iOS offsetTop pan with keyboard", async () => {
            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();

            mockVv.height = 500;
            mockVv.offsetTop = 60;
            mockVv.dispatchEvent(new Event("scroll"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("60px");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("240px");

            mockVv.offsetTop = 100;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("100px");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("200px");

            unmount(instance);
        });

        test("ignores resize and scroll updates during pinch-to-zoom when scale > 1.01", async () => {
            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();

            mockVv.scale = 1.5;
            mockVv.height = 400;
            mockVv.offsetTop = 80;
            mockVv.dispatchEvent(new Event("resize"));
            mockVv.dispatchEvent(new Event("scroll"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");

            // Once zoom resets back to <= 1.01, subsequent events apply normally
            mockVv.scale = 1;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("80px");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("320px");

            unmount(instance);
        });

        test("clamps subpixel and 1px rounding noise (<= 1px) to 0 without setting inline CSS variables", async () => {
            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();

            // rawTop = Math.round(0.8) = 1 -> clamped to 0
            // rawBottom = Math.round(800 - 798.4 - 0.8) = Math.round(0.8) = 1 -> clamped to 0
            mockVv.offsetTop = 0.8;
            mockVv.height = 798.4;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");

            // Exact 1px difference also clamps to 0
            mockVv.offsetTop = 0;
            mockVv.height = 799;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");

            unmount(instance);
        });

        test("removes inset CSS variables when keyboard closes and cleans up listeners on unmount", async () => {
            const vvRemoveSpy = vi.spyOn(mockVv, "removeEventListener");
            const winRemoveSpy = vi.spyOn(window, "removeEventListener");

            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();

            // Open keyboard + pan
            mockVv.height = 500;
            mockVv.offsetTop = 50;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("50px");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("250px");

            // Close keyboard
            mockVv.height = 800;
            mockVv.offsetTop = 0;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");

            // Re-open keyboard, then unmount while open to verify unmount cleanup removes styles and listeners
            mockVv.height = 520;
            mockVv.offsetTop = 30;
            mockVv.dispatchEvent(new Event("resize"));
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("30px");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("250px");

            unmount(instance);

            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");
            expect(vvRemoveSpy).toHaveBeenCalledWith("resize", expect.any(Function));
            expect(vvRemoveSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
            expect(winRemoveSpy).toHaveBeenCalledWith("resize", expect.any(Function));

            // Subsequent visualViewport events after unmount must not mutate the detached element
            mockVv.height = 400;
            mockVv.offsetTop = 40;
            mockVv.dispatchEvent(new Event("resize"));
            mockVv.dispatchEvent(new Event("scroll"));
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl?.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");
        });

        test("freezes --cs-overlay-inset-top and --cs-overlay-inset-bottom during out:overlayExit and ignores visualViewport events while exiting", async () => {
            const instance = mount(Overlay, {
                target: container,
                props: { variant: "dim" },
            });
            await tick();

            const overlayEl = container.querySelector<HTMLDivElement>(".cs-overlay");
            expect(overlayEl).not.toBeNull();
            if (!overlayEl) return;

            // Simulate non-zero CSS exit transition duration so out:overlayExit keeps the overlay in the DOM while exiting
            overlayEl.style.transitionDuration = "180ms";

            // Open virtual keyboard + iOS viewport offset pan while open
            mockVv.height = 500;
            mockVv.offsetTop = 60;
            mockVv.dispatchEvent(new Event("resize"));

            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-top")).toBe("60px");
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("240px");

            // Begin exit transition (triggers out:overlayExit with duration 180ms)
            const unmountPromise = unmount(instance, { outro: true });

            // Overlay remains in the DOM during exit transition with insets frozen at pre-exit values
            expect(container.querySelector(".cs-overlay")).toBe(overlayEl);
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-top")).toBe("60px");
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("240px");

            // Simulate virtual keyboard closing / viewport scrolling mid-exit transition
            mockVv.height = 800;
            mockVv.offsetTop = 0;
            mockVv.dispatchEvent(new Event("resize"));
            mockVv.dispatchEvent(new Event("scroll"));
            window.dispatchEvent(new Event("resize"));

            // Insets must remain frozen and not snap back to empty/0 mid-exit
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-top")).toBe("60px");
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("240px");

            // Also verify that further viewport shifts to different non-zero values are ignored while exiting
            mockVv.height = 420;
            mockVv.offsetTop = 90;
            mockVv.dispatchEvent(new Event("resize"));
            mockVv.dispatchEvent(new Event("scroll"));

            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-top")).toBe("60px");
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("240px");

            await unmountPromise;

            expect(container.querySelector(".cs-overlay")).toBeNull();
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-top")).toBe("");
            expect(overlayEl.style.getPropertyValue("--cs-overlay-inset-bottom")).toBe("");
        });
    });
});
