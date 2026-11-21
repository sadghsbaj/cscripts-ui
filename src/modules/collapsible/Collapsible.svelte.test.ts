import { createRawSnippet, flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from "vitest";

import Collapsible from "./Collapsible.svelte";
import type { CollapsibleAxis, CollapsibleMotion } from "./index.ts";

function makeTextSnippet(text: string, testId = "collapsible-child"): ReturnType<typeof createRawSnippet> {
    return createRawSnippet(() => ({
        render: () => `<span data-testid="${testId}">${text}</span>`,
    }));
}

function getRequiredElement<T extends Element>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function fireTransitionEnd(target: Element, propertyName: string): void {
    const event = new Event("transitionend", { bubbles: true });
    Object.defineProperty(event, "propertyName", { value: propertyName });
    target.dispatchEvent(event);
}

function mockTransitionDuration(duration = "200ms", delay = "0s"): MockInstance<typeof window.getComputedStyle> {
    return vi.spyOn(window, "getComputedStyle").mockReturnValue({
        transitionDuration: duration,
        transitionDelay: delay,
    } as CSSStyleDeclaration);
}

describe("Collapsible Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe("Default rendering & props", () => {
        test("renders .cs-collapsible root and .cs-collapsible-inner child with default attributes", () => {
            const instance = mount(Collapsible, {
                target: container,
                props: {
                    children: makeTextSnippet("Hello"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            expect(root.id).toBeTruthy();
            expect(root.dataset.axis).toBe("vertical");
            expect(root.dataset.motion).toBe("slide");
            expect(root.dataset.state).toBe("closed");
            expect("open" in root.dataset).toBe(false);
            expect("disabled" in root.dataset).toBe(false);
            expect("collapsedSize" in root.dataset).toBe(false);
            expect("fadeMask" in root.dataset).toBe(false);
            expect(inner.textContent).toBe("Hello");

            unmount(instance);
        });

        test("supports custom id, ref binding, class merging, and {...rest} forwarding", () => {
            const state = $state<{ ref: HTMLDivElement | null }>({ ref: null });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    id: "custom-collapsible",
                    class: ["extra-class", { "conditional-class": true }],
                    "data-testid": "my-collapsible",
                    "aria-label": "Details",
                    get ref() {
                        return state.ref;
                    },
                    set ref(el: HTMLDivElement | null) {
                        state.ref = el;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, "#custom-collapsible");
            expect(state.ref).toBe(root);
            expect(root.classList.contains("cs-collapsible")).toBe(true);
            expect(root.classList.contains("extra-class")).toBe(true);
            expect(root.classList.contains("conditional-class")).toBe(true);
            expect(root.dataset.testid).toBe("my-collapsible");
            expect(root.getAttribute("aria-label")).toBe("Details");

            unmount(instance);
        });

        test("reflects axis, motion, and disabled props on data attributes", () => {
            const state = $state<{
                axis: CollapsibleAxis;
                motion: CollapsibleMotion;
                disabled: boolean;
            }>({
                axis: "horizontal",
                motion: "swell",
                disabled: true,
            });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get axis() {
                        return state.axis;
                    },
                    get motion() {
                        return state.motion;
                    },
                    get disabled() {
                        return state.disabled;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.dataset.axis).toBe("horizontal");
            expect(root.dataset.motion).toBe("swell");
            expect("disabled" in root.dataset).toBe(true);

            state.axis = "vertical";
            state.motion = "fade";
            state.disabled = false;
            flushSync();

            expect(root.dataset.axis).toBe("vertical");
            expect(root.dataset.motion).toBe("fade");
            expect("disabled" in root.dataset).toBe(false);

            state.motion = "none";
            flushSync();
            expect(root.dataset.motion).toBe("none");

            unmount(instance);
        });
    });

    describe("State & A11y lifecycle", () => {
        test("closed by default sets data-state='closed', inert on inner, and no data-open", () => {
            const instance = mount(Collapsible, {
                target: container,
                props: {
                    children: makeTextSnippet("Hidden"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            expect(root.dataset.state).toBe("closed");
            expect("open" in root.dataset).toBe(false);
            expect("instant" in root.dataset).toBe(false);
            expect(inner.inert).toBe(true);

            unmount(instance);
        });

        test("opening -> open -> closing -> closed lifecycle with transitionend", () => {
            mockTransitionDuration("200ms");
            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    children: makeTextSnippet("Content"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            expect(root.dataset.state).toBe("closed");
            expect(inner.inert).toBe(true);

            // Open: data-open present & inert removed immediately, state is "opening"
            state.open = true;
            flushSync();

            expect(root.dataset.state).toBe("opening");
            expect("open" in root.dataset).toBe(true);
            expect(inner.inert).toBe(false);

            // Settle open via transitionend
            fireTransitionEnd(root, "grid-template-rows");
            flushSync();

            expect(root.dataset.state).toBe("open");
            expect("open" in root.dataset).toBe(true);
            expect(inner.inert).toBe(false);

            // Close: inert applied immediately, data-open removed, state is "closing"
            state.open = false;
            flushSync();

            expect(root.dataset.state).toBe("closing");
            expect("open" in root.dataset).toBe(false);
            expect(inner.inert).toBe(true);

            // Settle closed via transitionend
            fireTransitionEnd(root, "grid-template-rows");
            flushSync();

            expect(root.dataset.state).toBe("closed");
            expect("open" in root.dataset).toBe(false);
            expect(inner.inert).toBe(true);

            unmount(instance);
        });

        test("settles via fallback timer if transitionend is swallowed", () => {
            vi.useFakeTimers();
            mockTransitionDuration("150ms", "50ms");
            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("opening");

            // Total duration = 150 + 50 = 200ms, fallback = 200 + 50 = 250ms
            vi.advanceTimersByTime(249);
            flushSync();
            expect(root.dataset.state).toBe("opening");

            vi.advanceTimersByTime(1);
            flushSync();
            expect(root.dataset.state).toBe("open");

            unmount(instance);
        });

        test("animate={false} forces data-motion='none', data-instant, and synchronous settlement", () => {
            mockTransitionDuration("200ms");
            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    animate: false,
                    motion: "swell",
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.dataset.motion).toBe("none");
            expect("instant" in root.dataset).toBe(true);
            expect(root.dataset.state).toBe("closed");

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("open");
            expect("open" in root.dataset).toBe(true);

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closed");
            expect("open" in root.dataset).toBe(false);

            unmount(instance);
        });

        test("motion='none' settles synchronously without waiting for transitionend", () => {
            mockTransitionDuration("200ms");
            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    motion: "none",
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.dataset.motion).toBe("none");

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("open");

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closed");

            unmount(instance);
        });

        test("initial open={true} mount starts in data-state='open' with data-instant cleared after initial frame", () => {
            const rafCallbacks: FrameRequestCallback[] = [];
            vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    open: true,
                    children: makeTextSnippet("Initially Open"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            expect(root.dataset.state).toBe("open");
            expect("open" in root.dataset).toBe(true);
            expect("instant" in root.dataset).toBe(true);
            expect(inner.inert).toBe(false);

            // Simulate first animation frame completing
            expect(rafCallbacks.length).toBe(1);
            const firstRaf = rafCallbacks[0];
            if (!firstRaf) {
                throw new Error("Expected initial mount requestAnimationFrame callback");
            }
            firstRaf(performance.now());
            flushSync();

            expect("instant" in root.dataset).toBe(false);
            expect(root.dataset.state).toBe("open");

            unmount(instance);
        });
    });

    describe("Partial collapse (collapsedSize + fadeMask)", () => {
        test("sets data-collapsed-size, --cs-collapsible-collapsed-size, and omits inert when closed", () => {
            const instance = mount(Collapsible, {
                target: container,
                props: {
                    open: false,
                    collapsedSize: "48px",
                    children: makeTextSnippet("Preview"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            expect("collapsedSize" in root.dataset).toBe(true);
            expect(root.getAttribute("style")).toContain("--cs-collapsible-collapsed-size: 48px;");
            expect(inner.inert).toBe(false);

            unmount(instance);
        });

        test("merges --cs-collapsible-collapsed-size with consumer style with or without trailing semicolon", () => {
            const state = $state({ style: "color: red" });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    collapsedSize: "3rem",
                    get style() {
                        return state.style;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.getAttribute("style")).toBe("color: red; --cs-collapsible-collapsed-size: 3rem;");

            state.style = "color: blue; ";
            flushSync();
            expect(root.getAttribute("style")).toBe("color: blue; --cs-collapsible-collapsed-size: 3rem;");

            unmount(instance);
        });

        test("sets data-fade-mask when fadeMask={true}", () => {
            const state = $state({ fadeMask: true });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    collapsedSize: "48px",
                    get fadeMask() {
                        return state.fadeMask;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect("fadeMask" in root.dataset).toBe(true);

            state.fadeMask = false;
            flushSync();
            expect("fadeMask" in root.dataset).toBe(false);

            unmount(instance);
        });

        test("reactive collapsedSize toggling to undefined while closed removes attribute, inline var, and restores inert", () => {
            const state = $state<{ collapsedSize: string | undefined }>({ collapsedSize: "48px" });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    open: false,
                    get collapsedSize() {
                        return state.collapsedSize;
                    },
                    children: makeTextSnippet("Preview"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            expect("collapsedSize" in root.dataset).toBe(true);
            expect(root.getAttribute("style")).toContain("--cs-collapsible-collapsed-size: 48px;");
            expect(inner.inert).toBe(false);

            state.collapsedSize = undefined;
            flushSync();

            expect("collapsedSize" in root.dataset).toBe(false);
            expect(root.getAttribute("style")).toBeNull();
            expect(root.style.getPropertyValue("--cs-collapsible-collapsed-size")).toBe("");
            expect(inner.inert).toBe(true);

            unmount(instance);
        });
    });

    describe("keepMounted={false}", () => {
        test("does not mount children when closed, mounts on open, and unmounts after close settles", () => {
            mockTransitionDuration("200ms");
            const rafCallbacks: FrameRequestCallback[] = [];
            vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });

            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    keepMounted: false,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    children: makeTextSnippet("Lazy Content"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.querySelector("[data-testid='collapsible-child']")).toBeNull();

            // Open: mounts children immediately at 0fr, defers data-open until next animation frame
            state.open = true;
            flushSync();

            expect(root.dataset.state).toBe("opening");
            expect(root.querySelector("[data-testid='collapsible-child']")).not.toBeNull();
            expect("open" in root.dataset).toBe(false);

            expect(rafCallbacks.length).toBe(1);
            const firstRaf = rafCallbacks[0];
            if (!firstRaf) {
                throw new Error("Expected lazy-mount requestAnimationFrame callback");
            }
            firstRaf(performance.now());
            flushSync();

            expect("open" in root.dataset).toBe(true);

            fireTransitionEnd(root, "grid-template-rows");
            flushSync();
            expect(root.dataset.state).toBe("open");
            expect(root.querySelector("[data-testid='collapsible-child']")).not.toBeNull();

            // Close: remains mounted while closing
            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closing");
            expect(root.querySelector("[data-testid='collapsible-child']")).not.toBeNull();

            // Unmounts once settled closed
            fireTransitionEnd(root, "grid-template-rows");
            flushSync();
            expect(root.dataset.state).toBe("closed");
            expect(root.querySelector("[data-testid='collapsible-child']")).toBeNull();

            unmount(instance);
        });

        test("rapid false -> true -> false before lazy-mount rAF settles directly to closed without phantom closing", () => {
            mockTransitionDuration("200ms");
            const rafCallbacks: FrameRequestCallback[] = [];
            vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });
            const cancelRafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    keepMounted: false,
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    children: makeTextSnippet("Lazy Content"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.dataset.state).toBe("closed");
            expect(root.querySelector("[data-testid='collapsible-child']")).toBeNull();

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("opening");
            expect("open" in root.dataset).toBe(false);
            expect(root.querySelector("[data-testid='collapsible-child']")).not.toBeNull();
            expect(rafCallbacks.length).toBe(1);

            state.open = false;
            flushSync();
            expect(cancelRafSpy).toHaveBeenCalledWith(1);
            expect(root.dataset.state).toBe("closed");
            expect("open" in root.dataset).toBe(false);
            expect(root.querySelector("[data-testid='collapsible-child']")).toBeNull();

            unmount(instance);
        });

        test("forces keepMounted to true when collapsedSize is set", () => {
            const instance = mount(Collapsible, {
                target: container,
                props: {
                    open: false,
                    keepMounted: false,
                    collapsedSize: "40px",
                    children: makeTextSnippet("Always Mounted"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            expect(root.dataset.state).toBe("closed");
            expect(root.querySelector("[data-testid='collapsible-child']")).not.toBeNull();

            unmount(instance);
        });
    });

    describe("Nested transitionend isolation", () => {
        test("ignores transitionend from child elements and mismatched propertyName", () => {
            mockTransitionDuration("200ms");
            const onTransitionEnd = vi.fn();
            const state = $state<{ open: boolean; axis: CollapsibleAxis }>({
                open: false,
                axis: "vertical",
            });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get axis() {
                        return state.axis;
                    },
                    ontransitionend: onTransitionEnd,
                    children: makeTextSnippet("Nested"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");
            const child = getRequiredElement<HTMLElement>(root, "[data-testid='collapsible-child']");

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("opening");

            // Bubbled transitionend from descendant or inner wrapper must not settle outer Collapsible
            fireTransitionEnd(child, "grid-template-rows");
            fireTransitionEnd(inner, "grid-template-rows");
            flushSync();
            expect(root.dataset.state).toBe("opening");

            // Wrong propertyName on root must not settle vertical Collapsible
            fireTransitionEnd(root, "opacity");
            fireTransitionEnd(root, "grid-template-columns");
            flushSync();
            expect(root.dataset.state).toBe("opening");

            // Consumer handler still received those events
            expect(onTransitionEnd).toHaveBeenCalledTimes(4);

            // Matching propertyName on root settles vertical Collapsible
            fireTransitionEnd(root, "grid-template-rows");
            flushSync();
            expect(root.dataset.state).toBe("open");

            // Horizontal axis requires grid-template-columns on close
            state.axis = "horizontal";
            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closing");

            fireTransitionEnd(root, "grid-template-rows");
            flushSync();
            expect(root.dataset.state).toBe("closing");

            fireTransitionEnd(root, "grid-template-columns");
            flushSync();
            expect(root.dataset.state).toBe("closed");

            unmount(instance);
        });
    });

    describe("Edge cases & interruptions", () => {
        test("prefers-reduced-motion: reduce settles synchronously without waiting for transitionend", () => {
            mockTransitionDuration("200ms");
            vi.spyOn(window, "matchMedia").mockImplementation(
                (query: string) =>
                    ({
                        matches: query === "(prefers-reduced-motion: reduce)",
                        media: query,
                    }) as MediaQueryList,
            );

            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    children: makeTextSnippet("Reduced Motion"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("open");
            expect("open" in root.dataset).toBe(true);
            expect(inner.inert).toBe(false);

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closed");
            expect("open" in root.dataset).toBe(false);
            expect(inner.inert).toBe(true);

            unmount(instance);
        });

        test("mid-transition reversals (closed -> opening -> closing and open -> closing -> opening) cancel prior timers", () => {
            vi.useFakeTimers();
            mockTransitionDuration("200ms");
            const state = $state({ open: false });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    children: makeTextSnippet("Reversal"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");
            const inner = getRequiredElement<HTMLDivElement>(root, ".cs-collapsible-inner");

            // closed -> opening -> closing
            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("opening");

            vi.advanceTimersByTime(100);
            flushSync();
            expect(root.dataset.state).toBe("opening");

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closing");
            expect("open" in root.dataset).toBe(false);
            expect(inner.inert).toBe(true);

            // Past original opening fallback (250ms total from start), must still be closing
            vi.advanceTimersByTime(160);
            flushSync();
            expect(root.dataset.state).toBe("closing");

            // Remaining 90ms settles closing -> closed
            vi.advanceTimersByTime(90);
            flushSync();
            expect(root.dataset.state).toBe("closed");

            // open -> closing -> opening
            state.open = true;
            flushSync();
            fireTransitionEnd(root, "grid-template-rows");
            flushSync();
            expect(root.dataset.state).toBe("open");

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closing");

            vi.advanceTimersByTime(100);
            flushSync();
            expect(root.dataset.state).toBe("closing");

            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("opening");
            expect("open" in root.dataset).toBe(true);
            expect(inner.inert).toBe(false);

            // Past original closing fallback, must still be opening
            vi.advanceTimersByTime(160);
            flushSync();
            expect(root.dataset.state).toBe("opening");

            vi.advanceTimersByTime(90);
            flushSync();
            expect(root.dataset.state).toBe("open");

            unmount(instance);
        });

        test("mid-transition animate={false} or motion='none' settles immediately instead of waiting for fallbackTimer", () => {
            vi.useFakeTimers();
            mockTransitionDuration("200ms");
            const state = $state<{ open: boolean; animate: boolean; motion: CollapsibleMotion }>({
                open: false,
                animate: true,
                motion: "slide",
            });

            const instance = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    get animate() {
                        return state.animate;
                    },
                    get motion() {
                        return state.motion;
                    },
                    children: makeTextSnippet("Instant Override"),
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-collapsible");

            // Flip animate to false mid-opening
            state.open = true;
            flushSync();
            expect(root.dataset.state).toBe("opening");

            state.animate = false;
            flushSync();
            expect(root.dataset.state).toBe("open");
            expect(root.dataset.motion).toBe("none");
            expect("instant" in root.dataset).toBe(true);
            expect("open" in root.dataset).toBe(true);

            // Re-enable animate and flip motion to "none" mid-closing
            state.animate = true;
            flushSync();
            expect(root.dataset.state).toBe("open");

            state.open = false;
            flushSync();
            expect(root.dataset.state).toBe("closing");

            state.motion = "none";
            flushSync();
            expect(root.dataset.state).toBe("closed");
            expect(root.dataset.motion).toBe("none");
            expect("open" in root.dataset).toBe(false);

            // Advancing timers should not cause any delayed state changes
            vi.advanceTimersByTime(300);
            flushSync();
            expect(root.dataset.state).toBe("closed");

            unmount(instance);
        });

        test("unmount cleanup mid-transition and during initial mountedInstant frame cancels timers and rAFs cleanly", () => {
            vi.useFakeTimers();
            mockTransitionDuration("200ms");
            let nextRafId = 0;
            vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => {
                nextRafId += 1;
                return nextRafId;
            });
            const cancelRafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
            const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

            // 1. Unmount during initial mountedInstant frame (open={true})
            const mountedOpen = mount(Collapsible, {
                target: container,
                props: {
                    open: true,
                    children: makeTextSnippet("Initial Open"),
                },
            });
            flushSync();
            expect(nextRafId).toBe(1);

            expect(() => unmount(mountedOpen)).not.toThrow();
            expect(cancelRafSpy).toHaveBeenCalledWith(1);

            // 2. Unmount mid-transition (fallbackTimer active)
            const state = $state({ open: false });
            const midTransition = mount(Collapsible, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next: boolean) {
                        state.open = next;
                    },
                    children: makeTextSnippet("Mid Transition"),
                },
            });
            flushSync();

            state.open = true;
            flushSync();

            expect(() => unmount(midTransition)).not.toThrow();
            expect(clearTimeoutSpy).toHaveBeenCalled();
            expect(() => vi.advanceTimersByTime(500)).not.toThrow();

            // 3. Unmount during keepMounted={false} lazy-mount rAF
            const lazyState = $state({ open: false });
            const lazyTransition = mount(Collapsible, {
                target: container,
                props: {
                    keepMounted: false,
                    get open() {
                        return lazyState.open;
                    },
                    set open(next: boolean) {
                        lazyState.open = next;
                    },
                    children: makeTextSnippet("Lazy Unmount"),
                },
            });
            flushSync();

            lazyState.open = true;
            flushSync();
            expect(nextRafId).toBe(2);

            expect(() => unmount(lazyTransition)).not.toThrow();
            expect(cancelRafSpy).toHaveBeenCalledWith(2);
        });
    });
});
