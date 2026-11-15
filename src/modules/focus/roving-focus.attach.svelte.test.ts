import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    rovingFocus,
    type RovingFocusChangeEvent,
    type RovingFocusOrientation,
} from "./roving-focus.attach";

function createButton(label: string, attrs?: Record<string, string | boolean>): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    if (attrs) {
        for (const [key, value] of Object.entries(attrs)) {
            if (value === true) {
                btn.setAttribute(key, "");
            } else if (value !== false) {
                btn.setAttribute(key, value);
            }
        }
    }
    return btn;
}

type ButtonTuple<N extends 2 | 3 | 4> = N extends 2
    ? [HTMLButtonElement, HTMLButtonElement]
    : N extends 3
      ? [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement]
      : [HTMLButtonElement, HTMLButtonElement, HTMLButtonElement, HTMLButtonElement];

function createToolbar<N extends 2 | 3 | 4 = 3>(
    count: N = 3 as N
): { toolbar: HTMLDivElement; buttons: ButtonTuple<N> } {
    const toolbar = document.createElement("div");
    toolbar.setAttribute("role", "toolbar");
    const buttons = Array.from({ length: count }, (_, i) => createButton(`Item ${i + 1}`));
    toolbar.append(...buttons);
    return { toolbar, buttons: buttons as ButtonTuple<N> };
}

function dispatchKey(
    target: EventTarget,
    key: string,
    init: Partial<KeyboardEventInit> = {}
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
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

describe("rovingFocus Svelte 5 Element Attachment", () => {
    let host: HTMLDivElement;

    beforeEach(() => {
        host = document.createElement("div");
        document.body.append(host);
    });

    afterEach(() => {
        host.remove();
        vi.restoreAllMocks();
    });

    describe("Initialization & enabled", () => {
        test("should initialize with minimal required orientation, set data-roving-focus, and assign single tabindex='0'", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);

            const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);

            expect(toolbar.dataset.rovingFocus).toBe("");
            expect(buttons[0].getAttribute("tabindex")).toBe("0");
            expect(buttons[0].dataset.rovingActive).toBe("");
            expect(buttons[1].getAttribute("tabindex")).toBe("-1");
            expect("rovingActive" in buttons[1].dataset).toBe(false);
            expect(buttons[2].getAttribute("tabindex")).toBe("-1");
            expect("rovingActive" in buttons[2].dataset).toBe(false);
            expect(document.activeElement).not.toBe(buttons[0]);

            cleanup?.();
        });

        test("should handle empty container gracefully without throwing or firing onActiveChange", () => {
            const empty = document.createElement("div");
            host.append(empty);
            const onActiveChange = vi.fn();

            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(empty);

            expect(empty.dataset.rovingFocus).toBe("");
            expect(onActiveChange).not.toHaveBeenCalled();

            const event = dispatchKey(empty, "ArrowRight");
            expect(event.defaultPrevented).toBe(true);

            cleanup?.();
            expect("rovingFocus" in empty.dataset).toBe(false);
        });

        test("should perform zero DOM mutations and ignore keys when enabled is false", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const onActiveChange = vi.fn();

            const cleanup = rovingFocus({ orientation: "horizontal", enabled: false, onActiveChange })(
                toolbar
            );

            expect("rovingFocus" in toolbar.dataset).toBe(false);
            for (const btn of buttons) {
                expect(btn.hasAttribute("tabindex")).toBe(false);
                expect("rovingActive" in btn.dataset).toBe(false);
            }
            expect(onActiveChange).not.toHaveBeenCalled();

            buttons[0].focus();
            const event = dispatchKey(buttons[0], "ArrowRight");
            expect(event.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("should perform zero DOM mutations when enabled getter returns false", () => {
            const { toolbar, buttons } = createToolbar(2);
            host.append(toolbar);
            const onActiveChange = vi.fn();

            const cleanup = rovingFocus({
                orientation: "horizontal",
                enabled: () => false,
                onActiveChange,
            })(toolbar);

            expect("rovingFocus" in toolbar.dataset).toBe(false);
            expect(buttons[0].hasAttribute("tabindex")).toBe(false);
            expect(buttons[1].hasAttribute("tabindex")).toBe(false);
            expect(onActiveChange).not.toHaveBeenCalled();

            cleanup?.();
        });

        test("should resolve initialActive via CSS selector", () => {
            const { toolbar, buttons } = createToolbar(3);
            buttons[1].dataset.selected = "";
            host.append(toolbar);

            const cleanup = rovingFocus({
                orientation: "horizontal",
                initialActive: "[data-selected]",
            })(toolbar);

            expect(buttons[0].getAttribute("tabindex")).toBe("-1");
            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(buttons[2].getAttribute("tabindex")).toBe("-1");

            cleanup?.();
        });

        test("should resolve initialActive via function resolver", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const resolver = vi.fn((items: HTMLElement[], container: HTMLElement) => {
                expect(items).toEqual(buttons);
                expect(container).toBe(toolbar);
                return items[2] ?? null;
            });

            const cleanup = rovingFocus({ orientation: "horizontal", initialActive: resolver })(
                toolbar
            );

            expect(resolver).toHaveBeenCalledTimes(1);
            expect(buttons[2].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[2].dataset).toBe(true);
            expect(buttons[0].getAttribute("tabindex")).toBe("-1");

            cleanup?.();
        });

        test("should fall back to existing tabindex='0' or first item when initialActive selector is invalid or unmatched", () => {
            const { toolbar, buttons } = createToolbar(3);
            buttons[1].setAttribute("tabindex", "0");
            buttons[0].setAttribute("tabindex", "-1");
            buttons[2].setAttribute("tabindex", "-1");
            host.append(toolbar);

            const cleanup1 = rovingFocus({
                orientation: "horizontal",
                initialActive: "[invalid===",
            })(toolbar);
            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            cleanup1?.();

            // When no existing tabindex="0" and resolver returns external element, fall back to first item
            const external = createButton("External");
            host.append(external);
            for (const b of buttons) b.removeAttribute("tabindex");

            const cleanup2 = rovingFocus({
                orientation: "horizontal",
                initialActive: () => external,
            })(toolbar);
            expect(buttons[0].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[0].dataset).toBe(true);
            cleanup2?.();
        });

        test("should fire onActiveChange on mount with reason 'init'", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();

            const cleanup = rovingFocus({
                orientation: "horizontal",
                initialActive: () => buttons[1],
                onActiveChange,
            })(toolbar);

            expect(onActiveChange).toHaveBeenCalledTimes(1);
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[1],
                previousItem: null,
                container: toolbar,
                reason: "init",
            });

            cleanup?.();
        });
    });

    describe("Keyboard Navigation & Orientations", () => {
        test("horizontal: ArrowRight/ArrowLeft move next/prev and preventDefault; ArrowUp/ArrowDown ignored", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);

            buttons[0].focus();

            const right = dispatchKey(buttons[0], "ArrowRight");
            expect(right.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[1]);
            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect(buttons[0].getAttribute("tabindex")).toBe("-1");

            const up = dispatchKey(buttons[1], "ArrowUp");
            expect(up.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[1]);

            const down = dispatchKey(buttons[1], "ArrowDown");
            expect(down.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[1]);

            const left = dispatchKey(buttons[1], "ArrowLeft");
            expect(left.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("vertical: ArrowUp/ArrowDown move prev/next; ArrowLeft/ArrowRight ignored", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const cleanup = rovingFocus({ orientation: "vertical" })(toolbar);

            buttons[0].focus();

            const right = dispatchKey(buttons[0], "ArrowRight");
            expect(right.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[0]);

            const down = dispatchKey(buttons[0], "ArrowDown");
            expect(down.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[1]);

            const left = dispatchKey(buttons[1], "ArrowLeft");
            expect(left.defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[1]);

            const up = dispatchKey(buttons[1], "ArrowUp");
            expect(up.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("both: all 4 arrow keys step linearly through DOM order", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const cleanup = rovingFocus({ orientation: "both" })(toolbar);

            buttons[0].focus();

            dispatchKey(buttons[0], "ArrowRight");
            expect(document.activeElement).toBe(buttons[1]);

            dispatchKey(buttons[1], "ArrowDown");
            expect(document.activeElement).toBe(buttons[2]);

            dispatchKey(buttons[2], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[1]);

            dispatchKey(buttons[1], "ArrowUp");
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("should dynamically react to orientation, loop, and homeEnd getters without remounting", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);

            let orientation: RovingFocusOrientation = "horizontal";
            let loop = true;
            let homeEnd = true;

            const cleanup = rovingFocus({
                orientation: () => orientation,
                loop: () => loop,
                homeEnd: () => homeEnd,
            })(toolbar);

            buttons[0].focus();

            // Initially horizontal + loop + homeEnd
            expect(dispatchKey(buttons[0], "ArrowDown").defaultPrevented).toBe(false);
            dispatchKey(buttons[0], "ArrowLeft"); // wraps to last
            expect(document.activeElement).toBe(buttons[2]);

            // Switch orientation -> vertical, loop -> false, homeEnd -> false
            orientation = "vertical";
            loop = false;
            homeEnd = false;

            expect(dispatchKey(buttons[2], "ArrowRight").defaultPrevented).toBe(false);
            expect(dispatchKey(buttons[2], "Home").defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[2]);

            // loop=false clamps at last item on ArrowDown
            const downAtEnd = dispatchKey(buttons[2], "ArrowDown");
            expect(downAtEnd.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[2]);

            // ArrowUp moves to middle
            dispatchKey(buttons[2], "ArrowUp");
            expect(document.activeElement).toBe(buttons[1]);

            // Re-enable homeEnd
            homeEnd = true;
            dispatchKey(buttons[1], "Home");
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("dir='rtl': ArrowLeft moves next and ArrowRight moves previous; Home/End/Up/Down unaffected", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const cleanup = rovingFocus({ dir: "rtl", orientation: "both" })(toolbar);

            buttons[0].focus();

            dispatchKey(buttons[0], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[1]);

            dispatchKey(buttons[1], "ArrowRight");
            expect(document.activeElement).toBe(buttons[0]);

            // Vertical and Home/End remain unaffected by RTL
            dispatchKey(buttons[0], "ArrowDown");
            expect(document.activeElement).toBe(buttons[1]);

            dispatchKey(buttons[1], "End");
            expect(document.activeElement).toBe(buttons[2]);

            dispatchKey(buttons[2], "Home");
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("dir='auto' (default): reads computed direction='rtl' from container", () => {
            const { toolbar, buttons } = createToolbar(3);
            toolbar.style.direction = "rtl";
            host.append(toolbar);

            const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);
            buttons[0].focus();

            dispatchKey(buttons[0], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[1]);

            dispatchKey(buttons[1], "ArrowRight");
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("dir='ltr' explicitly overrides computed direction='rtl'", () => {
            const { toolbar, buttons } = createToolbar(3);
            toolbar.style.direction = "rtl";
            host.append(toolbar);

            const cleanup = rovingFocus({ orientation: "horizontal", dir: "ltr" })(toolbar);
            buttons[0].focus();

            dispatchKey(buttons[0], "ArrowRight");
            expect(document.activeElement).toBe(buttons[1]);

            dispatchKey(buttons[1], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[0]);

            cleanup?.();
        });

        test("loop=true wraps at ends; loop=false clamps at ends without firing duplicate onActiveChange", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const onActiveChange = vi.fn();

            // loop: true
            const cleanup1 = rovingFocus({ orientation: "horizontal", loop: true, onActiveChange })(
                toolbar
            );
            buttons[0].focus();
            dispatchKey(buttons[0], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[2]);
            dispatchKey(buttons[2], "ArrowRight");
            expect(document.activeElement).toBe(buttons[0]);
            cleanup1?.();

            onActiveChange.mockClear();

            // loop: false
            const cleanup2 = rovingFocus({
                orientation: "horizontal",
                loop: false,
                onActiveChange,
            })(toolbar);
            expect(onActiveChange).toHaveBeenCalledTimes(1); // init
            onActiveChange.mockClear();

            buttons[0].focus();
            dispatchKey(buttons[0], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[0]);
            expect(onActiveChange).not.toHaveBeenCalled();

            dispatchKey(buttons[0], "End");
            expect(document.activeElement).toBe(buttons[2]);
            expect(onActiveChange).toHaveBeenCalledTimes(1);

            onActiveChange.mockClear();
            dispatchKey(buttons[2], "ArrowRight");
            expect(document.activeElement).toBe(buttons[2]);
            expect(onActiveChange).not.toHaveBeenCalled();

            cleanup2?.();
        });

        test("homeEnd=true jumps to first/last; homeEnd=false ignores Home/End", () => {
            const { toolbar, buttons } = createToolbar(4);
            host.append(toolbar);

            const cleanup1 = rovingFocus({ orientation: "horizontal", homeEnd: true })(toolbar);
            buttons[0].focus();
            const endEv = dispatchKey(buttons[0], "End");
            expect(endEv.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[3]);

            const homeEv = dispatchKey(buttons[3], "Home");
            expect(homeEv.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(buttons[0]);
            cleanup1?.();

            const cleanup2 = rovingFocus({ orientation: "horizontal", homeEnd: false })(toolbar);
            buttons[1].focus();
            expect(dispatchKey(buttons[1], "Home").defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[1]);
            expect(dispatchKey(buttons[1], "End").defaultPrevented).toBe(false);
            expect(document.activeElement).toBe(buttons[1]);
            cleanup2?.();
        });

        test("preventScroll defaults to false and forwards true when configured", () => {
            const { toolbar, buttons } = createToolbar(2);
            host.append(toolbar);

            const focusSpyDefault = vi.spyOn(buttons[1], "focus");
            const cleanup1 = rovingFocus({ orientation: "horizontal" })(toolbar);
            buttons[0].focus();
            dispatchKey(buttons[0], "ArrowRight");
            expect(focusSpyDefault).toHaveBeenCalledWith({ preventScroll: false });
            cleanup1?.();

            focusSpyDefault.mockRestore();

            const focusSpyTrue = vi.spyOn(buttons[1], "focus");
            const cleanup2 = rovingFocus({ orientation: "horizontal", preventScroll: true })(toolbar);
            buttons[0].focus();
            dispatchKey(buttons[0], "ArrowRight");
            expect(focusSpyTrue).toHaveBeenCalledWith({ preventScroll: true });
            cleanup2?.();
        });
    });

    describe("Guards & Isolation", () => {
        test.each(["altKey", "ctrlKey", "metaKey", "shiftKey"] as const)(
            "should ignore arrow/Home/End keys when %s is pressed",
            (modifier) => {
                const { toolbar, buttons } = createToolbar(3);
                host.append(toolbar);
                const onActiveChange = vi.fn();
                const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
                onActiveChange.mockClear();

                buttons[0].focus();
                for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
                    const event = dispatchKey(buttons[0], key, { [modifier]: true });
                    expect(event.defaultPrevented).toBe(false);
                }

                expect(document.activeElement).toBe(buttons[0]);
                expect(onActiveChange).not.toHaveBeenCalled();

                cleanup?.();
            }
        );

        test("should ignore arrow/Home/End keys originating in text-editing targets", () => {
            const toolbar = document.createElement("div");
            const btn = createButton("Action");
            const textInput = document.createElement("input");
            textInput.type = "text";
            const searchInput = document.createElement("input");
            searchInput.type = "search";
            const textarea = document.createElement("textarea");
            const select = document.createElement("select");
            const option = document.createElement("option");
            option.textContent = "A";
            select.append(option);
            const editable = document.createElement("div");
            editable.setAttribute("contenteditable", "true");
            const editableChild = document.createElement("span");
            editable.append(editableChild);

            toolbar.append(btn, textInput, searchInput, textarea, select, editable);
            host.append(toolbar);

            const onActiveChange = vi.fn();
            const cleanup = rovingFocus({ orientation: "both", onActiveChange })(toolbar);
            onActiveChange.mockClear();

            for (const target of [textInput, searchInput, textarea, select, editable, editableChild]) {
                for (const key of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"]) {
                    const event = dispatchKey(target, key);
                    expect(event.defaultPrevented).toBe(false);
                }
            }

            expect(btn.getAttribute("tabindex")).toBe("0");
            expect(onActiveChange).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("<input type='range'> preserves native arrow/Home/End handling", () => {
            const toolbar = document.createElement("div");
            const btn = createButton("Action");
            const rangeInput = document.createElement("input");
            rangeInput.type = "range";
            rangeInput.min = "0";
            rangeInput.max = "100";
            rangeInput.value = "50";
            toolbar.append(btn, rangeInput);
            host.append(toolbar);

            const onActiveChange = vi.fn();
            const cleanup = rovingFocus({ orientation: "both", onActiveChange })(toolbar);

            rangeInput.focus();
            onActiveChange.mockClear();
            for (const key of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"]) {
                const event = dispatchKey(rangeInput, key);
                expect(event.defaultPrevented).toBe(false);
            }

            expect(rangeInput.getAttribute("tabindex")).toBe("0");
            expect(document.activeElement).toBe(rangeInput);
            expect(onActiveChange).not.toHaveBeenCalled();
            cleanup?.();
        });

        test("should isolate nested [data-roving-focus] containers", () => {
            const outer = document.createElement("div");
            const outerBtn1 = createButton("Outer 1");
            const outerBtn2 = createButton("Outer 2");

            const inner = document.createElement("div");
            const innerBtn1 = createButton("Inner 1");
            const innerBtn2 = createButton("Inner 2");
            inner.append(innerBtn1, innerBtn2);

            outer.append(outerBtn1, inner, outerBtn2);
            host.append(outer);

            const onOuterChange = vi.fn();
            const onInnerChange = vi.fn();

            // Mount inner first so [data-roving-focus] exists when outer initializes
            const cleanupInner = rovingFocus({
                orientation: "horizontal",
                onActiveChange: onInnerChange,
            })(inner);
            const cleanupOuter = rovingFocus({
                orientation: "horizontal",
                onActiveChange: onOuterChange,
            })(outer);

            onOuterChange.mockClear();
            onInnerChange.mockClear();

            // Outer must only manage outerBtn1 and outerBtn2
            expect(outerBtn1.getAttribute("tabindex")).toBe("0");
            expect(outerBtn2.getAttribute("tabindex")).toBe("-1");
            expect(innerBtn1.getAttribute("tabindex")).toBe("0");
            expect(innerBtn2.getAttribute("tabindex")).toBe("-1");

            // Keydown inside inner must only move inner
            innerBtn1.focus();
            dispatchKey(innerBtn1, "ArrowRight");
            expect(document.activeElement).toBe(innerBtn2);
            expect(onInnerChange).toHaveBeenCalledTimes(1);
            expect(onOuterChange).not.toHaveBeenCalled();
            expect(outerBtn1.getAttribute("tabindex")).toBe("0");

            // Pointerdown inside inner must not affect outer
            dispatchPointerDown(innerBtn1);
            expect(innerBtn1.getAttribute("tabindex")).toBe("0");
            expect(outerBtn1.getAttribute("tabindex")).toBe("0");
            expect(onOuterChange).not.toHaveBeenCalled();

            // Outer keyboard navigation skips inner items entirely
            outerBtn1.focus();
            dispatchKey(outerBtn1, "ArrowRight");
            expect(document.activeElement).toBe(outerBtn2);
            expect(onOuterChange).toHaveBeenCalledTimes(1);

            cleanupOuter?.();
            cleanupInner?.();
        });

        test("should isolate nested [data-roving-focus] when outer mounts before inner and uses broad items: 'button'", async () => {
            const outer = document.createElement("div");
            const inner = document.createElement("div");
            const innerBtn1 = createButton("Inner 1");
            const innerBtn2 = createButton("Inner 2");
            inner.append(innerBtn1, innerBtn2);

            const outerBtn1 = createButton("Outer 1");
            const outerBtn2 = createButton("Outer 2");
            // Place inner first so outer initially sees innerBtn1 before inner mounts
            outer.append(inner, outerBtn1, outerBtn2);
            host.append(outer);

            const onOuterChange = vi.fn();
            const onInnerChange = vi.fn();

            const cleanupOuter = rovingFocus({
                orientation: "horizontal",
                items: "button",
                onActiveChange: onOuterChange,
            })(outer);
            const cleanupInner = rovingFocus({
                orientation: "horizontal",
                onActiveChange: onInnerChange,
            })(inner);
            await flushMicrotasks();

            onOuterChange.mockClear();
            onInnerChange.mockClear();

            // Outer must exclude inner's buttons and promote outerBtn1
            expect(outerBtn1.getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in outerBtn1.dataset).toBe(true);
            expect(outerBtn2.getAttribute("tabindex")).toBe("-1");
            expect(innerBtn1.getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in innerBtn1.dataset).toBe(true);
            expect(innerBtn2.getAttribute("tabindex")).toBe("-1");

            // Keyboard navigation inside inner must not affect outer
            innerBtn1.focus();
            dispatchKey(innerBtn1, "ArrowRight");
            expect(document.activeElement).toBe(innerBtn2);
            expect(onInnerChange).toHaveBeenCalledTimes(1);
            expect(onOuterChange).not.toHaveBeenCalled();

            // Keyboard navigation inside outer must skip inner buttons
            outerBtn1.focus();
            dispatchKey(outerBtn1, "ArrowRight");
            expect(document.activeElement).toBe(outerBtn2);
            expect(onOuterChange).toHaveBeenCalledTimes(1);

            cleanupInner?.();
            cleanupOuter?.();
        });
    });

    describe("Pointer, Focus Memory & Cross-Interactions", () => {
        test("pointerdown updates active item and fires onActiveChange with reason 'pointer' (idempotent on same item)", () => {
            const { toolbar, buttons } = createToolbar(3);
            const nestedSpan = document.createElement("span");
            nestedSpan.textContent = "Nested";
            buttons[2].append(nestedSpan);
            host.append(toolbar);

            const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();
            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            onActiveChange.mockClear();

            // Click nested child of buttons[2]
            dispatchPointerDown(nestedSpan);

            expect(buttons[2].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[2].dataset).toBe(true);
            expect(buttons[0].getAttribute("tabindex")).toBe("-1");
            expect("rovingActive" in buttons[0].dataset).toBe(false);
            expect(onActiveChange).toHaveBeenCalledTimes(1);
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[2],
                previousItem: buttons[0],
                container: toolbar,
                reason: "pointer",
            });

            // Clicking already active item is a no-op
            onActiveChange.mockClear();
            dispatchPointerDown(buttons[2]);
            expect(onActiveChange).not.toHaveBeenCalled();

            cleanup?.();
        });

        test("focusin updates active item and fires onActiveChange with reason 'focus'", () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);

            const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();
            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            onActiveChange.mockClear();

            buttons[1].focus();
            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(buttons[0].getAttribute("tabindex")).toBe("-1");
            expect(onActiveChange).toHaveBeenCalledTimes(1);
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[1],
                previousItem: buttons[0],
                container: toolbar,
                reason: "focus",
            });

            // Re-focusing same item does not re-fire
            onActiveChange.mockClear();
            buttons[1].dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
            expect(onActiveChange).not.toHaveBeenCalled();

            cleanup?.();
        });

        test("Tab-out preserves active tabindex='0' and re-entering resumes from remembered item", () => {
            const { toolbar, buttons } = createToolbar(3);
            const externalBtn = createButton("Outside");
            host.append(toolbar, externalBtn);

            const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);

            buttons[0].focus();
            dispatchKey(buttons[0], "ArrowRight");
            expect(document.activeElement).toBe(buttons[1]);
            expect(buttons[1].getAttribute("tabindex")).toBe("0");

            // Simulate Tab-out to external element
            buttons[1].dispatchEvent(
                new FocusEvent("focusout", { bubbles: true, relatedTarget: externalBtn })
            );
            externalBtn.focus();

            expect(document.activeElement).toBe(externalBtn);
            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(buttons[0].getAttribute("tabindex")).toBe("-1");

            // Re-enter via focus on remembered item
            buttons[1].focus();
            dispatchKey(buttons[1], "ArrowRight");
            expect(document.activeElement).toBe(buttons[2]);

            cleanup?.();
        });

        test("cross-interaction: keyboard -> pointer -> keyboard -> external blur -> re-enter", () => {
            const { toolbar, buttons } = createToolbar(4);
            const externalBtn = createButton("Outside");
            host.append(toolbar, externalBtn);

            const reasons: string[] = [];
            const cleanup = rovingFocus({
                orientation: "horizontal",
                onActiveChange: (e) => {
                    reasons.push(`${e.reason}:${e.activeItem.textContent}`);
                },
            })(toolbar);

            // 1. Keyboard ArrowRight: Item 1 -> Item 2
            buttons[0].focus();
            dispatchKey(buttons[0], "ArrowRight");
            expect(document.activeElement).toBe(buttons[1]);

            // 2. Pointer click on Item 4
            dispatchPointerDown(buttons[3]);
            buttons[3].focus();
            expect(buttons[3].getAttribute("tabindex")).toBe("0");

            // 3. Keyboard ArrowLeft from Item 4 -> Item 3
            dispatchKey(buttons[3], "ArrowLeft");
            expect(document.activeElement).toBe(buttons[2]);
            expect(buttons[2].getAttribute("tabindex")).toBe("0");

            // 4. External blur
            buttons[2].dispatchEvent(
                new FocusEvent("focusout", { bubbles: true, relatedTarget: externalBtn })
            );
            externalBtn.focus();
            expect(buttons[2].getAttribute("tabindex")).toBe("0");

            // 5. Re-enter and step right -> Item 4
            buttons[2].focus();
            dispatchKey(buttons[2], "ArrowRight");
            expect(document.activeElement).toBe(buttons[3]);

            expect(reasons).toEqual([
                "init:Item 1",
                "keyboard:Item 2",
                "pointer:Item 4",
                "keyboard:Item 3",
                "keyboard:Item 4",
            ]);

            cleanup?.();
        });
    });

    describe("Disabled, Hidden & Dynamic DOM Mutations", () => {
        test("should skip disabled, aria-disabled, inert, hidden, and aria-hidden items on init and navigation", () => {
            const toolbar = document.createElement("div");
            const disabledBtn = createButton("Disabled", { disabled: true });
            const valid1 = createButton("Valid 1");
            const ariaDisabledBtn = createButton("AriaDisabled", { "aria-disabled": "true" });
            const inertWrapper = document.createElement("div");
            inertWrapper.setAttribute("inert", "");
            const inertBtn = createButton("Inert");
            inertWrapper.append(inertBtn);
            const hiddenBtn = createButton("Hidden", { hidden: true });
            const ariaHiddenBtn = createButton("AriaHidden", { "aria-hidden": "true" });
            const valid2 = createButton("Valid 2");

            toolbar.append(
                disabledBtn,
                valid1,
                ariaDisabledBtn,
                inertWrapper,
                hiddenBtn,
                ariaHiddenBtn,
                valid2
            );
            host.append(toolbar);

            const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);

            expect(valid1.getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in valid1.dataset).toBe(true);
            expect(disabledBtn.hasAttribute("tabindex")).toBe(false);
            expect(valid2.getAttribute("tabindex")).toBe("-1");

            valid1.focus();
            dispatchKey(valid1, "ArrowRight");
            expect(document.activeElement).toBe(valid2);

            dispatchKey(valid2, "ArrowLeft");
            expect(document.activeElement).toBe(valid1);

            cleanup?.();
        });

        test("should support custom items selector, custom items resolver, and invalid selector fallback", () => {
            const container = document.createElement("div");
            const decoyBtn = createButton("Decoy");
            const item1 = createButton("Menu 1", { role: "menuitem" });
            const item2 = createButton("Menu 2", { role: "menuitem" });
            container.append(decoyBtn, item1, item2);
            host.append(container);

            // Selector
            const cleanupSelector = rovingFocus({
                orientation: "horizontal",
                items: '[role="menuitem"]',
            })(container);
            expect(decoyBtn.hasAttribute("tabindex")).toBe(false);
            expect(item1.getAttribute("tabindex")).toBe("0");
            expect(item2.getAttribute("tabindex")).toBe("-1");
            item1.focus();
            dispatchKey(item1, "ArrowRight");
            expect(document.activeElement).toBe(item2);
            cleanupSelector?.();

            // Resolver
            const cleanupResolver = rovingFocus({
                orientation: "horizontal",
                items: (root) => [...root.querySelectorAll<HTMLElement>('[role="menuitem"]')],
            })(container);
            expect(decoyBtn.hasAttribute("tabindex")).toBe(false);
            expect(item1.getAttribute("tabindex")).toBe("0");
            cleanupResolver?.();

            // Invalid selector does not throw
            const onActiveChange = vi.fn();
            const cleanupInvalid = rovingFocus({
                orientation: "horizontal",
                items: "[broken===",
                onActiveChange,
            })(container);
            expect(onActiveChange).not.toHaveBeenCalled();
            cleanupInvalid?.();
        });

        test("removing active item while focus is inside moves tabindex='0' and focus to nearest valid sibling", async () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();

            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            buttons[1].focus();
            onActiveChange.mockClear();

            // Remove middle active item -> promotes next sibling (buttons[2])
            buttons[1].remove();
            await flushMicrotasks();

            expect(buttons[2].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[2].dataset).toBe(true);
            expect(document.activeElement).toBe(buttons[2]);
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[2],
                previousItem: buttons[1],
                container: toolbar,
                reason: "mutation",
            });

            // Remove last active item -> promotes previous sibling (buttons[0])
            onActiveChange.mockClear();
            buttons[2].remove();
            await flushMicrotasks();

            expect(buttons[0].getAttribute("tabindex")).toBe("0");
            expect(document.activeElement).toBe(buttons[0]);
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[0],
                previousItem: buttons[2],
                container: toolbar,
                reason: "mutation",
            });

            cleanup?.();
        });

        test("disabling active item while focus is inside moves tabindex='0' and focus to nearest valid sibling", async () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);

            const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);
            buttons[0].focus();

            buttons[0].disabled = true;
            await flushMicrotasks();

            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(document.activeElement).toBe(buttons[1]);

            cleanup?.();
        });

        test("removing or disabling active item while focus is outside updates tabindex='0' silently without stealing focus", async () => {
            const { toolbar, buttons } = createToolbar(3);
            const externalBtn = createButton("Outside");
            host.append(toolbar, externalBtn);

            const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();
            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            externalBtn.focus();
            onActiveChange.mockClear();

            const focusSpy = vi.spyOn(buttons[1], "focus");

            buttons[0].disabled = true;
            await flushMicrotasks();

            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(document.activeElement).toBe(externalBtn);
            expect(focusSpy).not.toHaveBeenCalled();
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[1],
                previousItem: buttons[0],
                container: toolbar,
                reason: "mutation",
            });

            cleanup?.();
        });

        test("adding new items dynamically assigns tabindex='-1' and preserves current active item", async () => {
            const { toolbar, buttons } = createToolbar(2);
            host.append(toolbar);
            const onActiveChange = vi.fn();

            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            buttons[1].focus();
            onActiveChange.mockClear();

            const newBtn = createButton("Item 3");
            toolbar.append(newBtn);
            await flushMicrotasks();

            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(newBtn.getAttribute("tabindex")).toBe("-1");
            expect("rovingActive" in newBtn.dataset).toBe(false);
            expect(onActiveChange).not.toHaveBeenCalled();

            // Newly added item is reachable via ArrowRight
            dispatchKey(buttons[1], "ArrowRight");
            expect(document.activeElement).toBe(newBtn);
            expect(newBtn.getAttribute("tabindex")).toBe("0");

            cleanup?.();
        });

        test("focusout with relatedTarget: null to non-focusable background clears isFocusWithin so subsequent removal does not steal focus", async () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();

            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            buttons[0].focus();
            expect(document.activeElement).toBe(buttons[0]);
            onActiveChange.mockClear();

            // Blur to non-focusable background while buttons[0] is still connected, enabled, and visible
            buttons[0].blur();
            buttons[0].dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
            expect(toolbar.contains(document.activeElement)).toBe(false);

            const focusSpy = vi.spyOn(buttons[1], "focus");
            buttons[0].remove();
            await flushMicrotasks();

            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(focusSpy).not.toHaveBeenCalled();
            expect(document.activeElement).not.toBe(buttons[1]);
            expect(onActiveChange).toHaveBeenCalledWith({
                activeItem: buttons[1],
                previousItem: buttons[0],
                container: toolbar,
                reason: "mutation",
            });

            cleanup?.();
        });

        test("focusout with relatedTarget: null due to active item removal, disablement, or hidden=true preserves isFocusWithin and focuses nearest sibling", async () => {
            // 1. Disablement (aria-disabled so happy-dom allows blur() to clear activeElement)
            {
                const { toolbar, buttons } = createToolbar(3);
                host.append(toolbar);
                const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);
                buttons[0].focus();

                buttons[0].setAttribute("aria-disabled", "true");
                buttons[0].blur();
                buttons[0].dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
                expect(toolbar.contains(document.activeElement)).toBe(false);

                await flushMicrotasks();
                expect(buttons[1].getAttribute("tabindex")).toBe("0");
                expect(document.activeElement).toBe(buttons[1]);
                cleanup?.();
                toolbar.remove();
            }

            // 2. hidden = true
            {
                const { toolbar, buttons } = createToolbar(3);
                host.append(toolbar);
                const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);
                buttons[0].focus();

                buttons[0].hidden = true;
                buttons[0].blur();
                buttons[0].dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
                expect(toolbar.contains(document.activeElement)).toBe(false);

                await flushMicrotasks();
                expect(buttons[1].getAttribute("tabindex")).toBe("0");
                expect(document.activeElement).toBe(buttons[1]);
                cleanup?.();
                toolbar.remove();
            }

            // 3. Removal
            {
                const { toolbar, buttons } = createToolbar(3);
                host.append(toolbar);
                const cleanup = rovingFocus({ orientation: "horizontal" })(toolbar);
                buttons[0].focus();

                buttons[0].remove();
                expect(toolbar.contains(document.activeElement)).toBe(false);

                await flushMicrotasks();
                expect(buttons[1].getAttribute("tabindex")).toBe("0");
                expect(document.activeElement).toBe(buttons[1]);
                cleanup?.();
                toolbar.remove();
            }
        });

        test("removing or disabling the last remaining item transitions to empty and recovers without stealing focus", async () => {
            // 1. Removal -> empty -> add new item
            {
                const { toolbar, buttons } = createToolbar(2);
                host.append(toolbar);
                const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();
                const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);

                buttons[0].focus();
                onActiveChange.mockClear();

                buttons[0].remove();
                buttons[1].remove();
                await flushMicrotasks();

                expect("rovingActive" in buttons[0].dataset).toBe(false);
                expect("rovingActive" in buttons[1].dataset).toBe(false);
                expect(onActiveChange).not.toHaveBeenCalled();

                const recovered = createButton("Recovered");
                const focusSpy = vi.spyOn(recovered, "focus");
                toolbar.append(recovered);
                await flushMicrotasks();

                expect(recovered.getAttribute("tabindex")).toBe("0");
                expect("rovingActive" in recovered.dataset).toBe(true);
                expect(focusSpy).not.toHaveBeenCalled();
                expect(document.activeElement).not.toBe(recovered);
                expect(onActiveChange).toHaveBeenCalledWith({
                    activeItem: recovered,
                    previousItem: null,
                    container: toolbar,
                    reason: "mutation",
                });

                cleanup?.();
                toolbar.remove();
            }

            // 2. Disablement -> empty -> re-enable item
            {
                const toolbar = document.createElement("div");
                const onlyBtn = createButton("Only");
                toolbar.append(onlyBtn);
                host.append(toolbar);
                const onActiveChange = vi.fn<(e: RovingFocusChangeEvent) => void>();
                const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);

                onlyBtn.focus();
                onActiveChange.mockClear();

                onlyBtn.setAttribute("aria-disabled", "true");
                onlyBtn.blur();
                onlyBtn.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: null }));
                expect(toolbar.contains(document.activeElement)).toBe(false);
                await flushMicrotasks();

                expect("rovingActive" in onlyBtn.dataset).toBe(false);
                expect(onActiveChange).not.toHaveBeenCalled();

                const focusSpy = vi.spyOn(onlyBtn, "focus");
                onlyBtn.removeAttribute("aria-disabled");
                await flushMicrotasks();

                expect(onlyBtn.getAttribute("tabindex")).toBe("0");
                expect("rovingActive" in onlyBtn.dataset).toBe(true);
                expect(focusSpy).not.toHaveBeenCalled();
                expect(document.activeElement).not.toBe(onlyBtn);
                expect(onActiveChange).toHaveBeenCalledWith({
                    activeItem: onlyBtn,
                    previousItem: null,
                    container: toolbar,
                    reason: "mutation",
                });

                cleanup?.();
                toolbar.remove();
            }
        });

        test("removing or disabling a non-active item keeps currentActiveItem intact without firing onActiveChange", async () => {
            const { toolbar, buttons } = createToolbar(3);
            host.append(toolbar);
            const onActiveChange = vi.fn();

            const cleanup = rovingFocus({ orientation: "horizontal", onActiveChange })(toolbar);
            buttons[1].focus();
            onActiveChange.mockClear();

            // Remove non-active trailing item
            buttons[2].remove();
            await flushMicrotasks();

            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(document.activeElement).toBe(buttons[1]);
            expect(onActiveChange).not.toHaveBeenCalled();

            // Disable non-active leading item
            buttons[0].disabled = true;
            await flushMicrotasks();

            expect(buttons[1].getAttribute("tabindex")).toBe("0");
            expect("rovingActive" in buttons[1].dataset).toBe(true);
            expect(document.activeElement).toBe(buttons[1]);
            expect(onActiveChange).not.toHaveBeenCalled();

            cleanup?.();
        });
    });

    describe("Teardown & tabindex Restoration", () => {
        test("should restore original tabindex values (absent, '0', '-1') and remove data-* attributes on cleanup", () => {
            const toolbar = document.createElement("div");
            const btnAbsent = createButton("Absent");
            const btnZero = createButton("Zero", { tabindex: "0" });
            const btnNeg = createButton("Neg", { tabindex: "-1" });
            toolbar.append(btnAbsent, btnZero, btnNeg);
            host.append(toolbar);

            const cleanup = rovingFocus({
                orientation: "horizontal",
                initialActive: () => btnNeg,
            })(toolbar);

            expect(toolbar.dataset.rovingFocus).toBe("");
            expect(btnAbsent.getAttribute("tabindex")).toBe("-1");
            expect(btnZero.getAttribute("tabindex")).toBe("-1");
            expect(btnNeg.getAttribute("tabindex")).toBe("0");
            expect(btnNeg.dataset.rovingActive).toBe("");

            cleanup?.();

            expect("rovingFocus" in toolbar.dataset).toBe(false);
            expect("rovingActive" in btnNeg.dataset).toBe(false);
            expect(btnAbsent.hasAttribute("tabindex")).toBe(false);
            expect(btnZero.getAttribute("tabindex")).toBe("0");
            expect(btnNeg.getAttribute("tabindex")).toBe("-1");

            // Subsequent events are ignored after cleanup
            btnAbsent.focus();
            const event = dispatchKey(btnAbsent, "ArrowRight");
            expect(event.defaultPrevented).toBe(false);
        });
    });
});
