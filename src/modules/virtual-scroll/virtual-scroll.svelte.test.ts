import { createRawSnippet, flushSync, mount, type Snippet, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createVirtualScroll, VirtualScroll, type VirtualScrollController } from "./index.ts";

function makeChildren(): Snippet<[string, number]> {
    return createRawSnippet<[string, number]>((getItem, getIndex) => ({
        render: () => `<span class="row-label"></span>`,
        setup: (node) => {
            $effect(() => {
                node.textContent = `${getItem()}#${getIndex()}`;
            });
        },
    }));
}

const TRACKED_ELEMENTS = new Set<Element>();

function trackObserve(el: Element): void {
    TRACKED_ELEMENTS.add(el);
}

function trackUnobserve(el: Element): void {
    TRACKED_ELEMENTS.delete(el);
}

function trackDisconnect(): void {
    TRACKED_ELEMENTS.clear();
}

class TrackingResizeObserver {
    observe = vi.fn(trackObserve);
    unobserve = vi.fn(trackUnobserve);
    disconnect = vi.fn(trackDisconnect);
}

function stubTrackingResizeObserver(): Set<Element> {
    TRACKED_ELEMENTS.clear();
    vi.stubGlobal("ResizeObserver", TrackingResizeObserver);
    return TRACKED_ELEMENTS;
}

function stubMockResizeObserver(): ResizeObserverCallback[] {
    const callbacks: ResizeObserverCallback[] = [];
    class MockResizeObserver {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();

        constructor(cb: ResizeObserverCallback) {
            callbacks.push(cb);
        }
    }
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    return callbacks;
}

describe("VirtualScroll (Svelte 5 + happy-dom)", () => {
    let container: HTMLDivElement;
    let origClientHeight: PropertyDescriptor | undefined;
    let origClientWidth: PropertyDescriptor | undefined;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);

        origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");
        origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");

        /* eslint-disable unicorn/no-this-outside-of-class -- HTMLElement.prototype getters require dynamic this */
        Object.defineProperties(HTMLElement.prototype, {
            clientHeight: {
                configurable: true,
                get() {
                    const el = this as HTMLElement;
                    if (
                        el.classList?.contains("cs-virtual-scroll") ||
                        el.dataset.virtualScrollViewport !== undefined
                    ) {
                        return 300;
                    }
                    return 0;
                },
            },
            clientWidth: {
                configurable: true,
                get() {
                    const el = this as HTMLElement;
                    if (
                        el.classList?.contains("cs-virtual-scroll") ||
                        el.dataset.virtualScrollViewport !== undefined
                    ) {
                        return 400;
                    }
                    return 0;
                },
            },
        });
        /* eslint-enable unicorn/no-this-outside-of-class */
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        container.remove();
        if (origClientHeight) {
            Object.defineProperty(HTMLElement.prototype, "clientHeight", origClientHeight);
        }
        if (origClientWidth) {
            Object.defineProperty(HTMLElement.prototype, "clientWidth", origClientWidth);
        }
    });

    it("renders two-element structure with as='div', data attributes, and zero position: absolute", () => {
        const items = Array.from({ length: 50 }, (_, i) => `Row ${i}`);
        const captured: { controller: VirtualScrollController | null } = { controller: null };

        const instance = mount(VirtualScroll<string>, {
            target: container,
            props: {
                items,
                estimateSize: 50,
                overscan: 1,
                class: "custom-vp",
                listClass: "custom-list",
                role: "listbox",
                children: makeChildren(),
                get controller() {
                    return captured.controller;
                },
                set controller(v: VirtualScrollController | null) {
                    captured.controller = v;
                },
            },
        });
        flushSync();

        const viewport = container.querySelector<HTMLElement>(".cs-virtual-scroll");
        const list = container.querySelector<HTMLElement>(".cs-virtual-scroll-list");
        const renderedItems = container.querySelectorAll<HTMLElement>(".cs-virtual-scroll-item");

        expect(viewport).not.toBeNull();
        expect(list).not.toBeNull();
        if (!viewport || !list) throw new Error("Missing viewport or list element");

        expect(viewport.tagName).toBe("DIV");
        expect(list.tagName).toBe("DIV");
        expect(viewport.classList.contains("custom-vp")).toBe(true);
        expect(list.classList.contains("custom-list")).toBe(true);
        expect(list.getAttribute("role")).toBe("listbox");

        expect(viewport.dataset.virtualScrollViewport).toBe("");
        expect(viewport.dataset.orientation).toBe("vertical");
        expect(viewport.dataset.scrollTarget).toBe("element");
        expect(list.dataset.virtualScrollList).toBe("");

        // 300px / 50px = 6 visible + 1 overscan = 7 items
        expect(renderedItems).toHaveLength(7);
        expect(renderedItems[0]?.dataset.index).toBe("0");
        expect(renderedItems[0]?.style.contain).toBe("layout style");
        expect(renderedItems[0]?.textContent).toBe("Row 0#0");

        // Strictly normal flow: no position: absolute on viewport, list, or items
        expect(getComputedStyle(viewport).position).not.toBe("absolute");
        expect(getComputedStyle(list).position).not.toBe("absolute");
        for (const itemEl of renderedItems) {
            expect(itemEl.style.position).not.toBe("absolute");
            expect(getComputedStyle(itemEl).position).not.toBe("absolute");
        }

        expect(captured.controller).not.toBeNull();
        expect(captured.controller?.totalSize).toBe(2500);

        unmount(instance);
    });

    it("renders semantic <ul>/<li> and <ol>/<li> when as='ul' or as='ol'", () => {
        const items = ["A", "B", "C"];

        const ulInstance = mount(VirtualScroll<string>, {
            target: container,
            props: {
                items,
                as: "ul",
                estimateSize: 40,
                children: makeChildren(),
            },
        });
        flushSync();

        const ulList = container.querySelector(".cs-virtual-scroll-list");
        expect(ulList?.tagName).toBe("UL");
        expect(ulList?.querySelectorAll(":scope > li.cs-virtual-scroll-item")).toHaveLength(3);
        unmount(ulInstance);

        const olInstance = mount(VirtualScroll<string>, {
            target: container,
            props: {
                items,
                as: "ol",
                estimateSize: 40,
                children: makeChildren(),
            },
        });
        flushSync();

        const olList = container.querySelector(".cs-virtual-scroll-list");
        expect(olList?.tagName).toBe("OL");
        expect(olList?.querySelectorAll(":scope > li.cs-virtual-scroll-item")).toHaveLength(3);
        unmount(olInstance);
    });

    it("preserves initial user padding in attachList and cleans up on unmount", () => {
        const vp = document.createElement("div");
        const list = document.createElement("div");
        vp.append(list);
        container.append(vp);

        const origGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
            const base = origGetComputedStyle.call(window, el, pseudo);
            if (el === list) {
                return new Proxy(base, {
                    get(target, prop) {
                        if (prop === "paddingBlockStart") return "16px";
                        if (prop === "paddingBlockEnd") return "24px";
                        if (prop === "paddingInlineStart") return "0px";
                        if (prop === "paddingInlineEnd") return "0px";
                        if (prop === "rowGap") return "0px";
                        if (prop === "columnGap") return "0px";
                        const value = Reflect.get(target, prop, target);
                        return typeof value === "function" ? value.bind(target) : value;
                    },
                });
            }
            return base;
        });

        const cleanup = $effect.root(() => {
            const controller = createVirtualScroll({
                count: 20,
                estimateSize: 50,
                overscan: 0,
            });

            const cleanVp = controller.attachViewport(vp);
            const cleanList = controller.attachList(list);

            // offsetBefore = 0, offsetAfter = 20*50 - 300 = 700
            expect(list.style.paddingBlockStart).toBe("16px");
            expect(list.style.paddingBlockEnd).toBe("724px");
            expect(list.style.getPropertyValue("--cs-virtual-scroll-before")).toBe("0px");
            expect(list.style.getPropertyValue("--cs-virtual-scroll-after")).toBe("700px");
            expect(list.style.getPropertyValue("--cs-virtual-scroll-total-size")).toBe("1000px");

            cleanList?.();
            cleanVp?.();

            expect(list.style.paddingBlockStart).toBe("");
            expect(list.style.paddingBlockEnd).toBe("");
            expect(list.style.getPropertyValue("--cs-virtual-scroll-total-size")).toBe("");
        });

        cleanup();
    });

    it("supports DOM reuse without (item.key) and updates data-index + ResizeObserver cleanly", () => {
        const observed = stubTrackingResizeObserver();

        let items = $state(["Item 0", "Item 1", "Item 2"]);
        const instance = mount(VirtualScroll<string>, {
            target: container,
            props: {
                get items() {
                    return items;
                },
                estimateSize: 50,
                children: makeChildren(),
            },
        });
        flushSync();

        const initialNodes = [...container.querySelectorAll<HTMLElement>(".cs-virtual-scroll-item")];
        expect(initialNodes).toHaveLength(3);
        // ResizeObserver observes the viewport element plus the 3 rendered items
        expect(observed.size).toBe(4);
        expect([...observed].filter((el) => el.classList.contains("cs-virtual-scroll-item"))).toHaveLength(3);

        // Mutate item contents at same indices (default key = index -> DOM nodes are reused)
        items = ["Updated 0", "Updated 1", "Updated 2"];
        flushSync();

        const updatedNodes = [...container.querySelectorAll<HTMLElement>(".cs-virtual-scroll-item")];
        expect(updatedNodes[0]).toBe(initialNodes[0]);
        expect(updatedNodes[0]?.dataset.index).toBe("0");
        expect(updatedNodes[0]?.textContent).toBe("Updated 0#0");

        unmount(instance);
        expect(observed.size).toBe(0);
    });

    it("reactively updates count, lanes, gap, and preserves getItemKey measurements", () => {
        const resizeCallbacks = stubMockResizeObserver();

        let count = $state(10);
        let lanes = $state(1);
        let gap = $state(0);
        let keys = Array.from({ length: 10 }, (_, i) => `key-${i}`);

        let ctrl!: VirtualScrollController;
        const cleanup = $effect.root(() => {
            ctrl = createVirtualScroll({
                count: () => count,
                estimateSize: 40,
                lanes: () => lanes,
                gap: () => gap,
                getItemKey: (i) => keys[i] ?? i,
                initialViewportSize: 1000,
            });
        });

        expect(ctrl.totalSize).toBe(400);

        // Measure key-1 to 100px
        const el1 = document.createElement("div");
        const clean1 = ctrl.attachItem(1)(el1);
        resizeCallbacks[0]?.(
            [{ target: el1, borderBoxSize: [{ blockSize: 100, inlineSize: 100 }] } as unknown as ResizeObserverEntry],
            {} as ResizeObserver
        );
        expect(ctrl.totalSize).toBe(9 * 40 + 100); // 460

        // Insert "key-new" at index 0 -> "key-1" moves to index 2 and keeps 100px
        keys = ["key-new", ...keys];
        count = keys.length;
        flushSync();

        expect(ctrl.items[2]?.key).toBe("key-1");
        expect(ctrl.items[2]?.size).toBe(100);
        expect(ctrl.totalSize).toBe(10 * 40 + 100); // 500

        // Switch lanes to 2 -> 11 items = 6 rows. Row 1 (indices 2,3) has max(100, 40) = 100.
        lanes = 2;
        flushSync();
        // 5 rows * 40 + 1 row * 100 = 300
        expect(ctrl.totalSize).toBe(300);

        // Add gap = 10 -> 5 gaps * 10 = 50 => 350
        gap = 10;
        flushSync();
        expect(ctrl.totalSize).toBe(350);

        // Shrink count to 0
        count = 0;
        flushSync();
        expect(ctrl.items).toEqual([]);
        expect(ctrl.totalSize).toBe(0);

        clean1?.();
        cleanup();
    });

    it("supports horizontal orientation (clientWidth, scrollLeft, paddingInline) and switching vertical <-> horizontal", () => {
        const vp = document.createElement("div");
        const list = document.createElement("div");
        vp.append(list);
        container.append(vp);

        let scrollTop = 0;
        let scrollLeft = 0;
        Object.defineProperties(vp, {
        	scrollTop: {
	            get: () => scrollTop,
	            set: (v: number) => {
	                scrollTop = v;
	            },
	            configurable: true,
	        },
        	scrollLeft: {
	            get: () => scrollLeft,
	            set: (v: number) => {
	                scrollLeft = v;
	            },
	            configurable: true,
	        },
        });
        vp.scrollTo = ((options?: ScrollToOptions) => {
            if (typeof options?.top === "number") scrollTop = options.top;
            if (typeof options?.left === "number") scrollLeft = options.left;
        }) as typeof vp.scrollTo;

        let orientation = $state<"vertical" | "horizontal">("horizontal");
        let ctrl!: VirtualScrollController;

        const cleanup = $effect.root(() => {
            ctrl = createVirtualScroll({
                count: 20,
                estimateSize: 50,
                overscan: 0,
                orientation: () => orientation,
            });

            const cleanVp = ctrl.attachViewport(vp);
            const cleanList = ctrl.attachList(list);

            // clientWidth = 400 -> 8 visible items (0..7), offsetBefore = 0, offsetAfter = 1000 - 400 = 600
            expect(vp.dataset.orientation).toBe("horizontal");
            expect(ctrl.startIndex).toBe(0);
            expect(ctrl.endIndex).toBe(7);
            expect(list.style.paddingInlineStart).toBe("0px");
            expect(list.style.paddingInlineEnd).toBe("600px");
            expect(list.style.paddingBlockStart).toBe("");
            expect(list.style.paddingBlockEnd).toBe("");

            // Scroll horizontally by 250px -> items 5..12, offsetBefore = 250, offsetAfter = 350
            ctrl.scrollToOffset(250);
            expect(scrollLeft).toBe(250);
            expect(ctrl.scrollOffset).toBe(250);
            expect(ctrl.startIndex).toBe(5);
            expect(ctrl.endIndex).toBe(12);
            expect(list.style.paddingInlineStart).toBe("250px");
            expect(list.style.paddingInlineEnd).toBe("350px");

            // Switch horizontal -> vertical (clientHeight = 300, scrollTop = 0 -> items 0..5, offsetAfter = 700)
            orientation = "vertical";
            flushSync();

            expect(vp.dataset.orientation).toBe("vertical");
            expect(ctrl.scrollOffset).toBe(0);
            expect(ctrl.startIndex).toBe(0);
            expect(ctrl.endIndex).toBe(5);
            expect(list.style.paddingInlineStart).toBe("");
            expect(list.style.paddingInlineEnd).toBe("");
            expect(list.style.paddingBlockStart).toBe("0px");
            expect(list.style.paddingBlockEnd).toBe("700px");

            // Switch vertical -> horizontal (restores horizontal axis using scrollLeft = 250)
            orientation = "horizontal";
            flushSync();

            expect(vp.dataset.orientation).toBe("horizontal");
            expect(ctrl.scrollOffset).toBe(250);
            expect(ctrl.startIndex).toBe(5);
            expect(ctrl.endIndex).toBe(12);
            expect(list.style.paddingBlockStart).toBe("");
            expect(list.style.paddingBlockEnd).toBe("");
            expect(list.style.paddingInlineStart).toBe("250px");
            expect(list.style.paddingInlineEnd).toBe("350px");

            cleanList?.();
            cleanVp?.();
        });

        cleanup();
    });

    it("does not tear down or re-run attachViewport/attachList when scrolling", () => {
        const rafQueue: FrameRequestCallback[] = [];
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });

        const items = Array.from({ length: 200 }, (_, i) => `Row ${i}`);
        const captured: { controller: VirtualScrollController | null } = { controller: null };

        const instance = mount(VirtualScroll<string>, {
            target: container,
            props: {
                items,
                estimateSize: 50,
                overscan: 2,
                children: makeChildren(),
                get controller() {
                    return captured.controller;
                },
                set controller(v: VirtualScrollController | null) {
                    captured.controller = v;
                },
            },
        });
        flushSync();

        const viewport = container.querySelector<HTMLElement>(".cs-virtual-scroll");
        const list = container.querySelector<HTMLElement>(".cs-virtual-scroll-list");
        if (!viewport || !list) throw new Error("Missing viewport or list element");

        let scrollTop = 0;
        Object.defineProperty(viewport, "scrollTop", {
            get: () => scrollTop,
            set: (v: number) => {
                scrollTop = v;
            },
            configurable: true,
        });

        const addListenerSpy = vi.spyOn(viewport, "addEventListener");
        const removeListenerSpy = vi.spyOn(viewport, "removeEventListener");
        const removeStylePropSpy = vi.spyOn(list.style, "removeProperty");

        const flushRaf = (): void => {
            while (rafQueue.length > 0) {
                const cb = rafQueue.shift();
                cb?.(performance.now());
            }
            flushSync();
        };

        // Scroll past 2000px
        scrollTop = 2050;
        viewport.dispatchEvent(new Event("scroll"));
        flushRaf();

        expect(captured.controller?.scrollOffset).toBe(2050);
        expect(list.dataset.virtualScrollList).toBe("");
        expect(list.style.paddingBlockEnd).not.toBe("");
        expect(Number(list.style.paddingBlockStart.slice(0, -2))).toBeGreaterThan(0);

        // Scroll again to verify attachments remain stable across multiple scroll frames
        scrollTop = 3500;
        viewport.dispatchEvent(new Event("scroll"));
        flushRaf();

        expect(captured.controller?.scrollOffset).toBe(3500);
        expect(list.style.paddingBlockEnd).not.toBe("");
        expect(addListenerSpy.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(0);
        expect(removeListenerSpy.mock.calls.filter(([type]) => type === "scroll")).toHaveLength(0);
        expect(removeStylePropSpy).not.toHaveBeenCalled();

        unmount(instance);
    });

    it("does not anchor scrollTop on first-time measurement of overscan rows above viewport, but anchors on subsequent resize", () => {
        const rafQueue: FrameRequestCallback[] = [];
        vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
            rafQueue.push(cb);
            return rafQueue.length;
        });

        const resizeCallbacks = stubMockResizeObserver();

        const vp = document.createElement("div");
        const list = document.createElement("div");
        vp.append(list);
        container.append(vp);

        let scrollTop = 0;
        Object.defineProperty(vp, "scrollTop", {
            get: () => scrollTop,
            set: (v: number) => {
                scrollTop = v;
            },
            configurable: true,
        });
        vp.scrollTo = ((options?: ScrollToOptions) => {
            if (typeof options?.top === "number") scrollTop = options.top;
        }) as typeof vp.scrollTo;

        let ctrl!: VirtualScrollController;
        const cleanup = $effect.root(() => {
            ctrl = createVirtualScroll({
                count: 100,
                estimateSize: 50,
                overscan: 2,
            });

            const cleanVp = ctrl.attachViewport(vp);
            const cleanList = ctrl.attachList(list);

            // Simulate user scroll to 1000px -> visibleStartRow = 20, overscan rows = 18..19
            scrollTop = 1000;
            vp.dispatchEvent(new Event("scroll"));
            while (rafQueue.length > 0) {
                const cb = rafQueue.shift();
                cb?.(performance.now());
            }

            expect(ctrl.visibleRange.startIndex).toBe(20);
            expect(ctrl.startIndex).toBe(18);

            const el18 = document.createElement("div");
            const el19 = document.createElement("div");
            const clean18 = ctrl.attachItem(18)(el18);
            const clean19 = ctrl.attachItem(19)(el19);
            const itemResizeCb = resizeCallbacks.at(-1);
            expect(itemResizeCb).toBeDefined();

            // First-time measurement where actualSize (30) < estimateSize (50): must NOT mutate scrollTop
            itemResizeCb?.(
                [
                    { target: el18, borderBoxSize: [{ blockSize: 30, inlineSize: 400 }] } as unknown as ResizeObserverEntry,
                    { target: el19, borderBoxSize: [{ blockSize: 30, inlineSize: 400 }] } as unknown as ResizeObserverEntry,
                ],
                {} as ResizeObserver
            );

            expect(scrollTop).toBe(1000);
            expect(ctrl.totalSize).toBe(100 * 50 - 2 * 20);

            // Subsequent resize of already-measured overscan row 18 (30 -> 70, delta +40): MUST anchor scrollTop
            itemResizeCb?.(
                [{ target: el18, borderBoxSize: [{ blockSize: 70, inlineSize: 400 }] } as unknown as ResizeObserverEntry],
                {} as ResizeObserver
            );

            expect(scrollTop).toBe(1040);

            clean18?.();
            clean19?.();
            cleanList?.();
            cleanVp?.();
        });

        cleanup();
    });
});
