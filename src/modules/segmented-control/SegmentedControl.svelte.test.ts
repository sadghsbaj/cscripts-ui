import { flushSync, mount, unmount } from "svelte";
import type { MouseEventHandler } from "svelte/elements";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SEGMENTED_CONTROL_SIZES, SEGMENTED_CONTROL_WIDTHS } from "./index.ts";
import SegmentedControlTestHost from "./SegmentedControlTestHost.internal.svelte";

interface TestSegmentedItem {
    value: string;
    label?: string;
    disabled?: boolean;
    withIcon?: boolean;
    onclick?: MouseEventHandler<HTMLButtonElement>;
}

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchPointerDown(target: EventTarget): PointerEvent {
    const event = new PointerEvent("pointerdown", {
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("SegmentedControl Svelte 5 Component", () => {
    let container: HTMLDivElement;

    const defaultItems: TestSegmentedItem[] = [{ value: "day" }, { value: "week" }, { value: "month" }];

    function getRoot(): HTMLDivElement | null {
        return container.querySelector<HTMLDivElement>(".cs-segmented-control");
    }

    function requireRoot(): HTMLDivElement {
        const el = getRoot();
        if (!el) throw new Error("Expected .cs-segmented-control root");
        return el;
    }

    function getViewport(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-segmented-control-viewport");
        if (!el) throw new Error("Expected .cs-segmented-control-viewport");
        return el;
    }

    function getIndicator(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-segmented-control-indicator");
        if (!el) throw new Error("Expected .cs-segmented-control-indicator");
        return el;
    }

    function getItem(value: string): HTMLButtonElement | null {
        return container.querySelector<HTMLButtonElement>(
            `button.cs-segmented-control-item[data-value="${CSS.escape(value)}"]`
        );
    }

    function requireItem(value: string): HTMLButtonElement {
        const el = getItem(value);
        if (!el) throw new Error(`Expected item "${value}"`);
        return el;
    }

    function getAllItems(): HTMLButtonElement[] {
        return [...container.querySelectorAll<HTMLButtonElement>("button.cs-segmented-control-item")];
    }

    function getHiddenInput(): HTMLInputElement | null {
        return container.querySelector<HTMLInputElement>('input[type="hidden"]');
    }

    function getScrollButton(direction: "prev" | "next"): HTMLButtonElement {
        const el = container.querySelector<HTMLButtonElement>(
            `button.cs-segmented-control-scroll-btn[data-direction="${CSS.escape(direction)}"]`
        );
        if (!el) throw new Error(`Expected scroll button "${direction}"`);
        return el;
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("DOM, semantics & props", () => {
        test("renders radiogroup, radio items, labels, icons, and binds ref", () => {
            let ref: HTMLDivElement | null = null;
            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    value: "week",
                    items: [
                        { value: "day", label: "Daily", withIcon: true },
                        { value: "week", label: "Weekly" },
                    ],
                    get ref() {
                        return ref;
                    },
                    set ref(el) {
                        ref = el;
                    },
                },
            });
            flushSync();

            const root = requireRoot();
            expect(ref).toBe(root);
            expect(root.getAttribute("role")).toBe("radiogroup");
            expect(root.dataset.size).toBe("md");
            expect(root.dataset.width).toBe("content");

            const dayBtn = requireItem("day");
            const weekBtn = requireItem("week");
            expect(dayBtn.getAttribute("role")).toBe("radio");
            expect(dayBtn.getAttribute("aria-checked")).toBe("false");
            expect(dayBtn.dataset.state).toBe("inactive");
            expect(weekBtn.getAttribute("aria-checked")).toBe("true");
            expect(weekBtn.dataset.state).toBe("active");

            const icon = dayBtn.querySelector(".cs-segmented-control-icon");
            expect(icon).not.toBeNull();
            expect(icon?.getAttribute("aria-hidden")).toBe("true");

            const label = dayBtn.querySelector(".cs-segmented-control-label");
            expect(label?.textContent).toBe("Daily");

            unmount(instance);
        });

        test("applies all size variants (xs-xl) and width variants (content, equal)", () => {
            for (const size of SEGMENTED_CONTROL_SIZES) {
                const instance = mount(SegmentedControlTestHost, {
                    target: container,
                    props: { size, value: "day", items: defaultItems },
                });
                flushSync();
                expect(requireRoot().dataset.size).toBe(size);
                unmount(instance);
            }

            for (const width of SEGMENTED_CONTROL_WIDTHS) {
                const instance = mount(SegmentedControlTestHost, {
                    target: container,
                    props: { width, value: "day", items: defaultItems },
                });
                flushSync();
                expect(requireRoot().dataset.width).toBe(width);
                unmount(instance);
            }
        });

        test("renders hidden input only when name is provided and syncs its value", () => {
            let name = $state<string | undefined>(undefined);
            let value = $state<string | undefined>("day");

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get name() {
                        return name;
                    },
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    items: defaultItems,
                },
            });
            flushSync();

            expect(getHiddenInput()).toBeNull();

            name = "period";
            flushSync();
            const input = getHiddenInput();
            expect(input).not.toBeNull();
            expect(input?.name).toBe("period");
            expect(input?.value).toBe("day");

            requireItem("month").click();
            flushSync();
            expect(input?.value).toBe("month");

            value = undefined;
            flushSync();
            expect(input?.value).toBe("");

            unmount(instance);
        });
    });

    describe("selection & controlled state", () => {
        test("bind:value updates on click, fires onValueChange once, and ignores re-clicking active item", () => {
            let value = $state<string | undefined>("day");
            const onValueChange = vi.fn();

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            requireItem("week").click();
            flushSync();
            expect(value).toBe("week");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("week");
            expect(requireItem("day").getAttribute("aria-checked")).toBe("false");
            expect(requireItem("day").dataset.state).toBe("inactive");
            expect(requireItem("week").getAttribute("aria-checked")).toBe("true");
            expect(requireItem("week").dataset.state).toBe("active");

            // Clicking already-active item must be a no-op
            requireItem("week").click();
            flushSync();
            expect(value).toBe("week");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("respects item onclick event.preventDefault()", () => {
            let value = $state<string | undefined>("day");
            const onValueChange = vi.fn();

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: [
                        { value: "day" },
                        {
                            value: "week",
                            onclick: (e: MouseEvent) => e.preventDefault(),
                        },
                    ],
                },
            });
            flushSync();

            requireItem("week").click();
            flushSync();
            expect(value).toBe("day");
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("strict controlled rejection keeps aria-checked and data-state in sync with getter", () => {
            let controlledValue = $state("day");
            const onValueChange = vi.fn();

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get value() {
                        return controlledValue;
                    },
                    set value(_next) {
                        // Intentionally reject update
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            // Click rejected
            requireItem("month").click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledWith("month");
            expect(requireItem("day").getAttribute("aria-checked")).toBe("true");
            expect(requireItem("day").dataset.state).toBe("active");
            expect(requireItem("month").getAttribute("aria-checked")).toBe("false");
            expect(requireItem("month").dataset.state).toBe("inactive");

            // Keyboard rejected
            const dayBtn = requireItem("day");
            dayBtn.focus();
            dispatchKey(dayBtn, "ArrowRight");
            flushSync();
            expect(dayBtn.getAttribute("aria-checked")).toBe("true");
            expect(requireItem("week").getAttribute("aria-checked")).toBe("false");

            // External parent update still syncs cleanly
            controlledValue = "month";
            flushSync();
            expect(dayBtn.getAttribute("aria-checked")).toBe("false");
            expect(requireItem("month").getAttribute("aria-checked")).toBe("true");
            expect(requireItem("month").dataset.state).toBe("active");

            unmount(instance);
        });
    });

    describe("disabled behavior", () => {
        test("group disabled disables all items, hidden input, and blocks click/keyboard selection", () => {
            let value = $state<string | undefined>("day");
            const onValueChange = vi.fn();

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    disabled: true,
                    name: "period",
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();

            const root = requireRoot();
            expect(root.getAttribute("aria-disabled")).toBe("true");
            expect("disabled" in root.dataset).toBe(true);
            expect(getHiddenInput()?.disabled).toBe(true);

            for (const item of getAllItems()) {
                expect(item.disabled).toBe(true);
                expect("disabled" in item.dataset).toBe(true);
            }

            requireItem("week").click();
            flushSync();
            expect(value).toBe("day");
            expect(onValueChange).not.toHaveBeenCalled();

            dispatchKey(requireItem("day"), "ArrowRight");
            flushSync();
            expect(value).toBe("day");
            expect("arrowNav" in root.dataset).toBe(false);

            unmount(instance);
        });

        test("per-item disabled blocks click selection and is skipped by rovingFocus", async () => {
            let value = $state<string | undefined>("day");
            const onValueChange = vi.fn();

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: [{ value: "day" }, { value: "week", disabled: true }, { value: "month" }],
                },
            });
            flushSync();

            const dayBtn = requireItem("day");
            const weekBtn = requireItem("week");
            expect("disabled" in dayBtn.dataset).toBe(false);
            expect(weekBtn.disabled).toBe(true);
            expect("disabled" in weekBtn.dataset).toBe(true);

            // Clicking disabled item does nothing
            weekBtn.click();
            flushSync();
            expect(value).toBe("day");
            expect(onValueChange).not.toHaveBeenCalled();

            // ArrowRight from "day" skips disabled "week" and lands on "month"
            dayBtn.focus();
            dispatchKey(dayBtn, "ArrowRight");
            flushSync();
            await flushMicrotasks();

            expect(document.activeElement).toBe(requireItem("month"));
            expect(value).toBe("month");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("month");

            unmount(instance);
        });
    });

    describe("roving focus & data-arrow-nav", () => {
        test("initialActive focuses [aria-checked='true'] or falls back to first enabled item", async () => {
            const instance1 = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    value: "month",
                    items: defaultItems,
                },
            });
            flushSync();
            await flushMicrotasks();

            expect(requireItem("day").tabIndex).toBe(-1);
            expect(requireItem("week").tabIndex).toBe(-1);
            expect(requireItem("month").tabIndex).toBe(0);
            unmount(instance1);

            // When value is undefined and first item is disabled, first enabled item gets tabIndex=0
            const instance2 = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    value: undefined,
                    items: [{ value: "day", disabled: true }, { value: "week" }, { value: "month" }],
                },
            });
            flushSync();
            await flushMicrotasks();

            expect(requireItem("day").disabled).toBe(true);
            expect(requireItem("week").tabIndex).toBe(0);
            expect(requireItem("month").tabIndex).toBe(-1);
            unmount(instance2);
        });

        test("ArrowRight, ArrowLeft, Home, End move focus, auto-select, do not loop, and manage data-arrow-nav", async () => {
            let value = $state<string | undefined>("day");
            const onValueChange = vi.fn();

            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    onValueChange,
                    items: defaultItems,
                },
            });
            flushSync();
            await flushMicrotasks();

            const root = requireRoot();
            const dayBtn = requireItem("day");
            const weekBtn = requireItem("week");
            const monthBtn = requireItem("month");
            expect("arrowNav" in root.dataset).toBe(false);

            dayBtn.focus();

            // ArrowRight -> week
            dispatchKey(dayBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(weekBtn);
            expect(value).toBe("week");
            expect("arrowNav" in root.dataset).toBe(true);

            // End -> month
            dispatchKey(weekBtn, "End");
            flushSync();
            expect(document.activeElement).toBe(monthBtn);
            expect(value).toBe("month");

            // ArrowRight at end (loop: false) stays on month and does not re-fire
            dispatchKey(monthBtn, "ArrowRight");
            flushSync();
            expect(document.activeElement).toBe(monthBtn);
            expect(value).toBe("month");
            expect(onValueChange).toHaveBeenCalledTimes(2);

            // Home -> day
            dispatchKey(monthBtn, "Home");
            flushSync();
            expect(document.activeElement).toBe(dayBtn);
            expect(value).toBe("day");

            // ArrowLeft at start (loop: false) stays on day
            dispatchKey(dayBtn, "ArrowLeft");
            flushSync();
            expect(document.activeElement).toBe(dayBtn);
            expect(value).toBe("day");

            // focusout to another item INSIDE root keeps data-arrow-nav
            dayBtn.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: weekBtn }));
            flushSync();
            expect("arrowNav" in root.dataset).toBe(true);

            // focusout leaving root clears data-arrow-nav
            const outsideBtn = document.createElement("button");
            document.body.append(outsideBtn);
            dayBtn.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideBtn }));
            flushSync();
            expect("arrowNav" in root.dataset).toBe(false);
            outsideBtn.remove();

            // Re-enable via ArrowRight, then clear via pointerdown
            dispatchKey(dayBtn, "ArrowRight");
            flushSync();
            expect("arrowNav" in root.dataset).toBe(true);

            dispatchPointerDown(root);
            flushSync();
            expect("arrowNav" in root.dataset).toBe(false);

            unmount(instance);
        });
    });

    describe("indicator & scroll chevrons", () => {
        test("sets indicator styles, data-active for matched value, and data-ready after requestAnimationFrame", () => {
            let rafCallback: FrameRequestCallback | null = null;
            vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
                rafCallback = cb;
                return 1;
            });
            vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});

            let value = $state<string | undefined>("week");
            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next) {
                        value = next;
                    },
                    items: defaultItems,
                },
            });
            flushSync();

            const indicator = getIndicator();
            expect("active" in indicator.dataset).toBe(true);
            expect("ready" in indicator.dataset).toBe(false);
            expect(indicator.style.getPropertyValue("--cs-segmented-control-indicator-x")).toMatch(/px$/);
            expect(indicator.style.getPropertyValue("--cs-segmented-control-indicator-w")).toMatch(/px$/);

            // After first animation frame, data-ready is set
            expect(rafCallback).not.toBeNull();
            (rafCallback as FrameRequestCallback | null)?.(16);
            flushSync();
            expect("ready" in indicator.dataset).toBe(true);

            // Unmatched value hides indicator
            value = "nonexistent";
            flushSync();
            expect("active" in indicator.dataset).toBe(false);

            // Matched value shows indicator again
            value = "day";
            flushSync();
            expect("active" in indicator.dataset).toBe(true);

            unmount(instance);
        });

        test("scroll chevrons and viewport data-scroll-* attributes reflect overflow state and step on prev/next click", () => {
            const instance = mount(SegmentedControlTestHost, {
                target: container,
                props: {
                    value: "day",
                    items: defaultItems,
                },
            });
            flushSync();

            const viewport = getViewport();
            const prevBtn = getScrollButton("prev");
            const nextBtn = getScrollButton("next");

            expect(prevBtn.getAttribute("tabindex")).toBe("-1");
            expect(prevBtn.getAttribute("aria-hidden")).toBe("true");
            expect(nextBtn.getAttribute("tabindex")).toBe("-1");
            expect(nextBtn.getAttribute("aria-hidden")).toBe("true");
            expect("scrollPrev" in viewport.dataset).toBe(false);
            expect("scrollNext" in viewport.dataset).toBe(false);

            // Simulate horizontal overflow on viewport (middle position: both prev & next active)
            let scrollLeft = 50;
            Object.defineProperties(viewport, {
                scrollWidth: { configurable: true, get: () => 400 },
                clientWidth: { configurable: true, get: () => 200 },
                scrollLeft: { configurable: true, get: () => scrollLeft },
            });
            viewport.dispatchEvent(new Event("scroll"));
            flushSync();

            expect("visible" in prevBtn.dataset).toBe(true);
            expect("visible" in nextBtn.dataset).toBe(true);
            expect("scrollPrev" in viewport.dataset).toBe(true);
            expect("scrollNext" in viewport.dataset).toBe(true);

            // At start (scrollLeft = 0): only next is active
            scrollLeft = 0;
            viewport.dispatchEvent(new Event("scroll"));
            flushSync();
            expect("visible" in prevBtn.dataset).toBe(false);
            expect("visible" in nextBtn.dataset).toBe(true);
            expect("scrollPrev" in viewport.dataset).toBe(false);
            expect("scrollNext" in viewport.dataset).toBe(true);

            // At end (scrollLeft = 200): only prev is active
            scrollLeft = 200;
            viewport.dispatchEvent(new Event("scroll"));
            flushSync();
            expect("visible" in prevBtn.dataset).toBe(true);
            expect("visible" in nextBtn.dataset).toBe(false);
            expect("scrollPrev" in viewport.dataset).toBe(true);
            expect("scrollNext" in viewport.dataset).toBe(false);

            // Return to middle and verify both nextBtn.click() and prevBtn.click() scroll in opposite directions
            scrollLeft = 50;
            viewport.dispatchEvent(new Event("scroll"));
            flushSync();

            const scrollBySpy = vi.fn();
            viewport.scrollBy = scrollBySpy;
            viewport.getBoundingClientRect = () =>
                ({ left: 0, right: 200, width: 200, top: 0, bottom: 32, height: 32, x: 0, y: 0 }) as DOMRect;

            nextBtn.click();
            expect(scrollBySpy).toHaveBeenCalledTimes(1);
            const nextCall = scrollBySpy.mock.calls[0]?.[0] as ScrollToOptions;
            expect(nextCall.left).toBeGreaterThan(0);

            prevBtn.click();
            expect(scrollBySpy).toHaveBeenCalledTimes(2);
            const prevCall = scrollBySpy.mock.calls[1]?.[0] as ScrollToOptions;
            expect(prevCall.left).toBeLessThan(0);

            unmount(instance);
        });
    });
});
