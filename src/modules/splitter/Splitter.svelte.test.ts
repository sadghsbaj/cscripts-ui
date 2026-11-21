import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    SPLITTER_ORIENTATIONS,
    SPLITTER_SIZES,
    SPLITTER_VARIANTS,
    type SplitterExtent,
    type SplitterOrientation,
    type SplitterResizeEvent,
    type SplitterSize,
    type SplitterVariant,
} from "./index.ts";
import SplitterTestHost from "./SplitterTestHost.internal.svelte";

function getRequiredElement<T extends Element>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function getBasisPx(element: HTMLElement): number {
    const raw = element.style.getPropertyValue("--cs-splitter-pane-basis").trim();
    return Number(raw.replace(/px$/, ""));
}

function pressKey(
    target: HTMLElement,
    key: string,
    modifiers: Partial<KeyboardEventInit> = {},
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

function firePointer(
    target: HTMLElement,
    type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel",
    init: Partial<PointerEventInit> = {},
): PointerEvent {
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        pointerId: 1,
        clientX: 0,
        clientY: 0,
        ...init,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

let capturedObservers: Array<{ target: Element; callback: ResizeObserverCallback }> = [];

class MockResizeObserver {
    private callback: ResizeObserverCallback;
    constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
    }
    observe(target: Element): void {
        capturedObservers.push({ target, callback: this.callback });
    }
    unobserve(): void {}
    disconnect(): void {}
}

function setSplitterSize(el: Element, width: number, height: number): void {
    Object.defineProperties(el, {
        clientWidth: { configurable: true, get: () => width },
        clientHeight: { configurable: true, get: () => height },
    });
}

function triggerResizeObserver(target?: Element): void {
    for (const entry of capturedObservers) {
        if (!target || entry.target === target) {
            entry.callback([], {} as ResizeObserver);
        }
    }
    flushSync();
}

describe("Splitter Svelte 5 Component", () => {
    let container: HTMLDivElement;
    let origClientWidth: PropertyDescriptor | undefined;
    let origClientHeight: PropertyDescriptor | undefined;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);

        capturedObservers = [];

        origClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
        origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

        Object.defineProperties(HTMLElement.prototype, {
            clientWidth: {
                configurable: true,
                get: () => 1000,
            },
            clientHeight: {
                configurable: true,
                get: () => 600,
            },
        });

        // Stub pointer capture APIs for happy-dom
        const capturedPointers = new Set<number>();
        HTMLElement.prototype.setPointerCapture = (pointerId: number): void => {
            capturedPointers.add(pointerId);
        };
        HTMLElement.prototype.hasPointerCapture = (pointerId: number): boolean => {
            return capturedPointers.has(pointerId);
        };
        HTMLElement.prototype.releasePointerCapture = (pointerId: number): void => {
            capturedPointers.delete(pointerId);
        };

        vi.stubGlobal("ResizeObserver", MockResizeObserver);
    });

    afterEach(() => {
        container.remove();
        if (origClientWidth) {
            Object.defineProperty(HTMLElement.prototype, "clientWidth", origClientWidth);
        }
        if (origClientHeight) {
            Object.defineProperty(HTMLElement.prototype, "clientHeight", origClientHeight);
        }
        vi.unstubAllGlobals();
        delete document.documentElement.dataset.splitterDragging;
        vi.restoreAllMocks();
    });

    describe("1. Rendering, Orientations, Variants & Sizes", () => {
        test("renders data-orientation, data-variant, and data-size across all combinations", () => {
            const state = $state<{
                orientation: SplitterOrientation;
                variant: SplitterVariant;
                size: SplitterSize;
            }>({
                orientation: "horizontal",
                variant: "subtle",
                size: "md",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    get orientation() {
                        return state.orientation;
                    },
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-splitter");
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            for (const orientation of SPLITTER_ORIENTATIONS) {
                for (const variant of SPLITTER_VARIANTS) {
                    for (const size of SPLITTER_SIZES) {
                        state.orientation = orientation;
                        state.variant = variant;
                        state.size = size;
                        flushSync();

                        expect(root.dataset.orientation).toBe(orientation);
                        expect(root.dataset.variant).toBe(variant);
                        expect(root.dataset.size).toBe(size);

                        expect(handle.dataset.orientation).toBe(orientation);
                        expect(handle.dataset.variant).toBe(variant);
                        expect(handle.dataset.size).toBe(size);
                        // WAI-ARIA separator orientation is perpendicular to splitter axis
                        expect(handle.getAttribute("aria-orientation")).toBe(
                            orientation === "horizontal" ? "vertical" : "horizontal",
                        );
                    }
                }
            }

            unmount(instance);
        });

        test("computes initial pane basis for horizontal (clientWidth=1000) and vertical (clientHeight=600)", () => {
            const state = $state<{ orientation: SplitterOrientation }>({
                orientation: "horizontal",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    get orientation() {
                        return state.orientation;
                    },
                    leftDefaultExtent: "300px",
                },
            });
            flushSync();

            const leftPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );
            const mainPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="main-pane"]',
            );

            expect(getBasisPx(leftPane)).toBeCloseTo(300, 1);
            expect(getBasisPx(mainPane)).toBeCloseTo(700, 1);
            expect("sized" in leftPane.dataset).toBe(true);

            // Switch to vertical: Splitter reconciles orientation change automatically without ResizeObserver
            state.orientation = "vertical";
            flushSync();

            expect(getBasisPx(leftPane)).toBeCloseTo(300, 1);
            expect(getBasisPx(mainPane)).toBeCloseTo(300, 1);

            unmount(instance);
        });

        test("supports animate={false}, localized default aria-label, custom label, and per-handle variant/size overrides", () => {
            const state = $state<{
                animate: boolean;
                handleLabel: string | undefined;
                handleVariant: SplitterVariant | undefined;
                handleSize: SplitterSize | undefined;
            }>({
                animate: false,
                handleLabel: undefined,
                handleVariant: "elevated",
                handleSize: "lg",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    variant: "subtle",
                    size: "sm",
                    get animate() {
                        return state.animate;
                    },
                    get handleLabel() {
                        return state.handleLabel;
                    },
                    get handleVariant() {
                        return state.handleVariant;
                    },
                    get handleSize() {
                        return state.handleSize;
                    },
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-splitter");
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            expect("animate" in root.dataset).toBe(false);
            expect(handle.dataset.variant).toBe("elevated");
            expect(handle.dataset.size).toBe("lg");
            expect(handle.getAttribute("aria-label")).toBeTruthy();

            state.animate = true;
            state.handleLabel = "Custom divider";
            state.handleVariant = undefined;
            state.handleSize = undefined;
            flushSync();

            expect("animate" in root.dataset).toBe(true);
            expect(handle.getAttribute("aria-label")).toBe("Custom divider");
            expect(handle.dataset.variant).toBe("subtle");
            expect(handle.dataset.size).toBe("sm");

            unmount(instance);
        });
    });

    describe("2. 2D Nested Splitters & Event Isolation", () => {
        test("pointer and keyboard events on inner vertical splitter do not bubble to outer horizontal splitter", () => {
            const onOuterResize = vi.fn<(e: SplitterResizeEvent) => void>();
            const onInnerResize = vi.fn<(e: SplitterResizeEvent) => void>();

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    nested: true,
                    onOuterResize,
                    onInnerResize,
                },
            });
            flushSync();

            const outerRoot = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="outer-splitter"]',
            );
            const innerRoot = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="inner-splitter"]',
            );
            const innerHandle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="inner-handle"]',
            );
            const innerTop = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="inner-top"]',
            );

            expect(innerHandle.getAttribute("aria-orientation")).toBe("horizontal");

            // Pointer drag on inner vertical handle
            firePointer(innerHandle, "pointerdown", { clientX: 500, clientY: 300 });
            expect("dragging" in innerRoot.dataset).toBe(true);
            expect("dragging" in outerRoot.dataset).toBe(false);

            firePointer(innerHandle, "pointermove", { clientX: 500, clientY: 350 });
            expect(getBasisPx(innerTop)).toBeCloseTo(350, 1);
            expect(onInnerResize).toHaveBeenCalledTimes(1);
            expect(onOuterResize).not.toHaveBeenCalled();

            firePointer(innerHandle, "pointerup", { clientX: 500, clientY: 350 });
            expect("dragging" in innerRoot.dataset).toBe(false);

            // Keyboard resize on inner handle
            pressKey(innerHandle, "ArrowDown");
            expect(getBasisPx(innerTop)).toBeCloseTo(366, 1);
            expect(onInnerResize).toHaveBeenCalledTimes(2);
            expect(onOuterResize).not.toHaveBeenCalled();

            unmount(instance);
        });
    });

    describe("3. Dynamic {#if} Pane Show/Hide, ID Memory & Bound extent", () => {
        test("remembers uncontrolled extent with explicit id, but resets to defaultExtent without id", () => {
            const state = $state<{ showExtraPane: boolean; extraPaneId: string | undefined }>({
                showExtraPane: true,
                extraPaneId: "remembered-drawer",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    get showExtraPane() {
                        return state.showExtraPane;
                    },
                    get extraPaneId() {
                        return state.extraPaneId;
                    },
                    extraPaneDefaultExtent: "200px",
                },
            });
            flushSync();

            let extraPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-pane"]',
            );
            const extraHandle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-handle"]',
            );
            expect(getBasisPx(extraPane)).toBeCloseTo(200, 1);

            // Resize extra pane larger by moving extraHandle left (-64px via Shift+ArrowLeft)
            pressKey(extraHandle, "ArrowLeft", { shiftKey: true });
            expect(getBasisPx(extraPane)).toBeCloseTo(264, 1);

            // Hide and re-show with explicit id -> remembers 264px
            state.showExtraPane = false;
            flushSync();
            expect(container.querySelector('[data-testid="extra-pane"]')).toBeNull();

            state.showExtraPane = true;
            flushSync();
            extraPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-pane"]',
            );
            expect(getBasisPx(extraPane)).toBeCloseTo(264, 1);

            unmount(instance);

            // Now test without explicit id -> resets to defaultExtent (200px) on re-mount
            const noIdState = $state<{ showExtraPane: boolean }>({ showExtraPane: true });
            const instance2 = mount(SplitterTestHost, {
                target: container,
                props: {
                    get showExtraPane() {
                        return noIdState.showExtraPane;
                    },
                    extraPaneId: undefined,
                    extraPaneDefaultExtent: "200px",
                },
            });
            flushSync();

            const extraHandle2 = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-handle"]',
            );
            pressKey(extraHandle2, "ArrowLeft", { shiftKey: true });
            expect(
                getBasisPx(getRequiredElement(container, '[data-testid="extra-pane"]')),
            ).toBeCloseTo(264, 1);

            noIdState.showExtraPane = false;
            flushSync();
            noIdState.showExtraPane = true;
            flushSync();

            expect(
                getBasisPx(getRequiredElement(container, '[data-testid="extra-pane"]')),
            ).toBeCloseTo(200, 1);

            unmount(instance2);
        });

        test("syncs bind:extent bidirectionally on user resize and external prop change", () => {
            const state = $state<{ extraPaneExtent: SplitterExtent | undefined }>({
                extraPaneExtent: "200px",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    showExtraPane: true,
                    extraPaneId: "bound-pane",
                    get extraPaneExtent() {
                        return state.extraPaneExtent;
                    },
                    set extraPaneExtent(v: SplitterExtent | undefined) {
                        state.extraPaneExtent = v;
                    },
                },
            });
            flushSync();

            const extraPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-pane"]',
            );
            const extraHandle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-handle"]',
            );
            expect(getBasisPx(extraPane)).toBeCloseTo(200, 1);

            // User keyboard resize updates bound extent
            pressKey(extraHandle, "ArrowLeft", { shiftKey: true });
            expect(getBasisPx(extraPane)).toBeCloseTo(264, 1);
            expect(state.extraPaneExtent).toBe("264px");

            // External extent update resizes pane
            state.extraPaneExtent = "320px";
            flushSync();
            expect(getBasisPx(extraPane)).toBeCloseTo(320, 1);

            unmount(instance);
        });
    });

    describe("4. Collapsible, inert, Double-Click Actions & Bound collapsed", () => {
        test("collapses via drag threshold, sets inert on 0px collapsed pane, and syncs collapsed = $bindable()", () => {
            const onCollapseChange = vi.fn<(collapsed: boolean) => void>();
            const state = $state<{ leftCollapsed: boolean; collapsedExtent: SplitterExtent }>({
                leftCollapsed: false,
                collapsedExtent: "0px",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    leftMin: "200px",
                    leftCollapsible: true,
                    get leftCollapsed() {
                        return state.leftCollapsed;
                    },
                    set leftCollapsed(v: boolean) {
                        state.leftCollapsed = v;
                    },
                    get leftCollapsedExtent() {
                        return state.collapsedExtent;
                    },
                    leftCollapseThreshold: 0.5,
                    onLeftCollapseChange: onCollapseChange,
                },
            });
            flushSync();

            const leftPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            expect(leftPane.inert).toBe(false);
            expect("collapsed" in leftPane.dataset).toBe(false);

            // Drag left by -220px -> target = 80px (< 100px threshold) -> snaps to 0px collapsed
            firePointer(handle, "pointerdown", { clientX: 300, clientY: 0 });
            firePointer(handle, "pointermove", { clientX: 80, clientY: 0 });
            firePointer(handle, "pointerup", { clientX: 80, clientY: 0 });

            expect(state.leftCollapsed).toBe(true);
            expect(onCollapseChange).toHaveBeenCalledTimes(1);
            expect(onCollapseChange).toHaveBeenCalledWith(true);
            expect("collapsed" in leftPane.dataset).toBe(true);
            expect(leftPane.inert).toBe(true);
            expect(getBasisPx(leftPane)).toBe(0);

            // External uncollapse does NOT fire onCollapseChange
            state.leftCollapsed = false;
            flushSync();
            expect(onCollapseChange).toHaveBeenCalledTimes(1);
            expect(leftPane.inert).toBe(false);
            expect(getBasisPx(leftPane)).toBeCloseTo(300, 1);

            // Non-zero collapsedExtent (48px) does NOT set inert when collapsed
            state.collapsedExtent = "48px";
            state.leftCollapsed = true;
            flushSync();
            expect("collapsed" in leftPane.dataset).toBe(true);
            expect(leftPane.inert).toBe(false);

            unmount(instance);
        });

        test("doubleClickAction supports 'reset' (default), 'collapse', and 'none'", () => {
            const state = $state<{
                action: "reset" | "collapse" | "none";
                leftCollapsed: boolean;
            }>({
                action: "reset",
                leftCollapsed: false,
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    leftMin: "150px",
                    leftCollapsible: true,
                    get doubleClickAction() {
                        return state.action;
                    },
                    get leftCollapsed() {
                        return state.leftCollapsed;
                    },
                    set leftCollapsed(v: boolean) {
                        state.leftCollapsed = v;
                    },
                },
            });
            flushSync();

            const leftPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            // Move pane away from default, then double-click with "reset"
            pressKey(handle, "ArrowRight", { shiftKey: true });
            expect(getBasisPx(leftPane)).toBeCloseTo(364, 1);

            handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
            flushSync();
            expect(getBasisPx(leftPane)).toBeCloseTo(300, 1);

            // Switch to "collapse"
            state.action = "collapse";
            flushSync();
            handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
            flushSync();
            expect(state.leftCollapsed).toBe(true);

            // Double-click again with "none" does not expand
            state.action = "none";
            flushSync();
            handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
            flushSync();
            expect(state.leftCollapsed).toBe(true);

            unmount(instance);
        });

        test("mounts initially collapsed, uncollapses on doubleClickAction='reset', and records preCollapseExtents on keyboard Arrow collapse", () => {
            const state = $state<{ leftCollapsed: boolean }>({ leftCollapsed: true });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    leftMin: "200px",
                    leftCollapsible: true,
                    leftCollapseThreshold: 0.5,
                    get leftCollapsed() {
                        return state.leftCollapsed;
                    },
                    set leftCollapsed(v: boolean) {
                        state.leftCollapsed = v;
                    },
                },
            });
            flushSync();

            const leftPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            // Initially mounted collapsed
            expect("collapsed" in leftPane.dataset).toBe(true);
            expect(leftPane.inert).toBe(true);
            expect(getBasisPx(leftPane)).toBe(0);

            // doubleClickAction="reset" uncollapses to defaultExtent (300px)
            handle.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
            flushSync();
            expect(state.leftCollapsed).toBe(false);
            expect(leftPane.inert).toBe(false);
            expect(getBasisPx(leftPane)).toBeCloseTo(300, 1);

            // Resize to 240px, then collapse via large keyboard ArrowLeft (-150px -> 90px < 100px threshold)
            pressKey(handle, "ArrowLeft", { shiftKey: true }); // 300 - 64 = 236
            expect(getBasisPx(leftPane)).toBeCloseTo(236, 1);
            pressKey(handle, "ArrowLeft", { shiftKey: true }); // 236 - 64 = 172 -> clamped to min 200
            expect(getBasisPx(leftPane)).toBeCloseTo(200, 1);
            // Collapse from 200px with a 150px step via Enter? No, test Arrow collapse with keyboardStepLarge="150px"
            unmount(instance);

            const kbState = $state<{ leftCollapsed: boolean }>({ leftCollapsed: false });
            const kbInstance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "260px",
                    leftMin: "200px",
                    leftCollapsible: true,
                    leftCollapseThreshold: 0.5,
                    keyboardStepLarge: "170px",
                    get leftCollapsed() {
                        return kbState.leftCollapsed;
                    },
                    set leftCollapsed(v: boolean) {
                        kbState.leftCollapsed = v;
                    },
                },
            });
            flushSync();

            const kbLeft = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );
            const kbHandle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );
            expect(getBasisPx(kbLeft)).toBeCloseTo(260, 1);

            // Shift+ArrowLeft by 170px -> 90px (< 100px threshold) collapses and records 260px
            pressKey(kbHandle, "ArrowLeft", { shiftKey: true });
            expect(kbState.leftCollapsed).toBe(true);
            expect(getBasisPx(kbLeft)).toBe(0);

            // Enter expands back to recorded 260px
            pressKey(kbHandle, "Enter");
            expect(kbState.leftCollapsed).toBe(false);
            expect(getBasisPx(kbLeft)).toBeCloseTo(260, 1);

            unmount(kbInstance);
        });

        test("handles one-way reactive props (collapsed and extent without bind:) without throwing TypeError", () => {
            const state = $state<{ leftCollapsed: boolean; extraPaneExtent: SplitterExtent }>({
                leftCollapsed: false,
                extraPaneExtent: "200px",
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    leftMin: "150px",
                    leftCollapsible: true,
                    showExtraPane: true,
                    extraPaneId: "one-way-extra",
                    get leftCollapsed() {
                        return state.leftCollapsed;
                    },
                    get extraPaneExtent() {
                        return state.extraPaneExtent;
                    },
                },
            });
            flushSync();

            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );
            const extraHandle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="extra-handle"]',
            );

            // Toggle collapse and drag without a setter on props -> must not throw
            expect(() => {
                pressKey(handle, "Enter");
                pressKey(extraHandle, "ArrowLeft", { shiftKey: true });
            }).not.toThrow();

            unmount(instance);
        });
    });

    describe("5. WAI-ARIA, Keyboard Resizing & Disabled State", () => {
        test("updates aria-valuenow/min/max and handles Arrow, Shift+Arrow, Home, End, and Enter", () => {
            const state = $state<{ leftCollapsed: boolean }>({ leftCollapsed: false });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    leftMin: "150px",
                    leftMax: "700px",
                    leftCollapsible: true,
                    get leftCollapsed() {
                        return state.leftCollapsed;
                    },
                    set leftCollapsed(v: boolean) {
                        state.leftCollapsed = v;
                    },
                },
            });
            flushSync();

            const leftPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            expect(handle.getAttribute("role")).toBe("separator");
            expect(handle.getAttribute("tabindex")).toBe("0");
            expect(handle.getAttribute("aria-controls")).toBe("left-pane");
            expect(handle.getAttribute("aria-valuenow")).toBe("30");
            expect(handle.getAttribute("aria-valuemin")).toBe("15");
            expect(handle.getAttribute("aria-valuemax")).toBe("70");

            // ArrowRight (+16px)
            pressKey(handle, "ArrowRight");
            expect(getBasisPx(leftPane)).toBeCloseTo(316, 1);

            // Shift+ArrowLeft (-64px)
            pressKey(handle, "ArrowLeft", { shiftKey: true });
            expect(getBasisPx(leftPane)).toBeCloseTo(252, 1);

            // End -> max (700px)
            pressKey(handle, "End");
            expect(getBasisPx(leftPane)).toBeCloseTo(700, 1);
            expect(handle.getAttribute("aria-valuenow")).toBe("70");

            // Home -> collapses collapsible pane to 0px
            pressKey(handle, "Home");
            expect(state.leftCollapsed).toBe(true);
            expect(getBasisPx(leftPane)).toBe(0);

            // Enter -> expands back
            pressKey(handle, "Enter");
            expect(state.leftCollapsed).toBe(false);
            expect(getBasisPx(leftPane)).toBeCloseTo(700, 1);

            unmount(instance);
        });

        test("blocks pointer and keyboard interaction when disabled on Splitter or SplitterHandle", () => {
            const onResize = vi.fn();
            const state = $state<{ disabled: boolean; handleDisabled: boolean }>({
                disabled: true,
                handleDisabled: false,
            });

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    get disabled() {
                        return state.disabled;
                    },
                    get handleDisabled() {
                        return state.handleDisabled;
                    },
                    onResize,
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-splitter");
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            expect("disabled" in root.dataset).toBe(true);
            expect("disabled" in handle.dataset).toBe(true);
            expect(handle.getAttribute("aria-disabled")).toBe("true");
            expect(handle.getAttribute("tabindex")).toBe("-1");

            pressKey(handle, "ArrowRight");
            firePointer(handle, "pointerdown", { clientX: 300 });
            firePointer(handle, "pointermove", { clientX: 400 });
            expect(onResize).not.toHaveBeenCalled();

            // Enable root, disable handle specifically
            state.disabled = false;
            state.handleDisabled = true;
            flushSync();

            expect("disabled" in root.dataset).toBe(false);
            expect("disabled" in handle.dataset).toBe(true);
            pressKey(handle, "ArrowRight");
            expect(onResize).not.toHaveBeenCalled();

            unmount(instance);
        });
    });

    describe("6. Pointer Drag Lifecycle & ResizeObserver", () => {
        test("tracks data-dragging, global data-splitter-dragging, onResize, and onResizeEnd", () => {
            const onResize = vi.fn<(e: SplitterResizeEvent) => void>();
            const onResizeEnd = vi.fn<(e: SplitterResizeEvent) => void>();

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    onResize,
                    onResizeEnd,
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-splitter");
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );
            const leftPane = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="left-pane"]',
            );

            // Right-click (button: 2) is ignored
            firePointer(handle, "pointerdown", { button: 2, clientX: 300 });
            expect("dragging" in root.dataset).toBe(false);

            // Primary drag
            firePointer(handle, "pointerdown", { button: 0, clientX: 300 });
            expect("dragging" in root.dataset).toBe(true);
            expect("dragging" in handle.dataset).toBe(true);
            expect(document.documentElement.dataset.splitterDragging).toBe("horizontal");

            firePointer(handle, "pointermove", { clientX: 420 });
            expect(getBasisPx(leftPane)).toBeCloseTo(420, 1);
            expect(onResize).toHaveBeenCalledTimes(1);
            expect(onResize.mock.calls[0]?.[0].panes[0]?.extentPx).toBeCloseTo(420, 1);

            firePointer(handle, "pointerup", { clientX: 420 });
            expect("dragging" in root.dataset).toBe(false);
            expect("dragging" in handle.dataset).toBe(false);
            expect(document.documentElement.dataset.splitterDragging).toBeUndefined();
            expect(onResizeEnd).toHaveBeenCalledTimes(1);

            // Container resize keeps px-default pane pinned while main absorbs delta
            setSplitterSize(root, 1400, 600);
            triggerResizeObserver(root);
            expect(getBasisPx(leftPane)).toBeCloseTo(420, 1);
            expect(
                getBasisPx(getRequiredElement(container, '[data-testid="main-pane"]')),
            ).toBeCloseTo(980, 1);

            unmount(instance);
        });

        test("ignores non-active pointerId moves and clears drag lock on pointercancel, window blur, and unmount", () => {
            const onResize = vi.fn<(e: SplitterResizeEvent) => void>();
            const onResizeEnd = vi.fn<(e: SplitterResizeEvent) => void>();

            const instance = mount(SplitterTestHost, {
                target: container,
                props: {
                    leftDefaultExtent: "300px",
                    onResize,
                    onResizeEnd,
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-splitter");
            const handle = getRequiredElement<HTMLDivElement>(
                container,
                '[data-testid="primary-handle"]',
            );

            // Start drag with pointerId: 1
            firePointer(handle, "pointerdown", { pointerId: 1, clientX: 300 });
            expect("dragging" in root.dataset).toBe(true);
            expect(document.documentElement.dataset.splitterDragging).toBe("horizontal");

            // Non-active pointerId: 2 move is ignored
            firePointer(handle, "pointermove", { pointerId: 2, clientX: 500 });
            expect(onResize).not.toHaveBeenCalled();

            // pointercancel clears drag lock and fires onResizeEnd
            firePointer(handle, "pointercancel", { pointerId: 1, clientX: 350 });
            expect("dragging" in root.dataset).toBe(false);
            expect(document.documentElement.dataset.splitterDragging).toBeUndefined();
            expect(onResizeEnd).toHaveBeenCalledTimes(1);

            // Start drag again, then window blur clears drag lock
            firePointer(handle, "pointerdown", { pointerId: 3, clientX: 300 });
            expect("dragging" in root.dataset).toBe(true);
            expect(document.documentElement.dataset.splitterDragging).toBe("horizontal");

            window.dispatchEvent(new Event("blur"));
            flushSync();
            expect("dragging" in root.dataset).toBe(false);
            expect(document.documentElement.dataset.splitterDragging).toBeUndefined();

            // Start drag again, then unmount mid-drag clears global drag attribute
            firePointer(handle, "pointerdown", { pointerId: 4, clientX: 300 });
            expect(document.documentElement.dataset.splitterDragging).toBe("horizontal");

            unmount(instance);
            flushSync();
            expect(document.documentElement.dataset.splitterDragging).toBeUndefined();
        });
    });
});
