import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    NUMBER_STEPPER_ORIENTATIONS,
    NUMBER_STEPPER_SIZES,
    NUMBER_STEPPER_VARIANTS,
} from "./index.ts";
import NumberStepperTestHost from "./NumberStepperTestHost.internal.svelte";

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchPointer(
    target: EventTarget,
    type: "pointerdown" | "pointerup" | "pointercancel" | "pointerleave",
    button = 0
): PointerEvent {
    const event = new PointerEvent(type, {
        button,
        bubbles: type !== "pointerleave",
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchMiddleClick(target: EventTarget): void {
    target.dispatchEvent(
        new MouseEvent("mousedown", {
            button: 1,
            bubbles: true,
            cancelable: true,
        })
    );
    target.dispatchEvent(
        new MouseEvent("auxclick", {
            button: 1,
            bubbles: true,
            cancelable: true,
        })
    );
}

function getFlowText(flowEl: Element | null): string {
    if (!flowEl) return "";
    // @number-flow/svelte renders digits inside shadowRoot; only active items lack [inert].
    if (flowEl.shadowRoot) {
        const parts = flowEl.shadowRoot.querySelectorAll(
            ".digit__num:not([inert]), .symbol__value:not([inert])",
        );
        const text = [...parts]
            .filter((el) => !el.closest("[inert]"))
            .map((el) => el.textContent ?? "")
            .join("");
        if (text) return text.replaceAll(/\s+/g, " ").trim();
    }
    return flowEl.getAttribute("aria-label") ?? flowEl.textContent?.trim() ?? "";
}

describe("NumberStepper Svelte 5 Component", () => {
    let container: HTMLDivElement;

    function getRoot(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-number-stepper");
        if (!el) throw new Error("Expected .cs-number-stepper root");
        return el;
    }

    function getDecrement(): HTMLButtonElement {
        const el = container.querySelector<HTMLButtonElement>('button[data-direction="decrement"]');
        if (!el) throw new Error("Expected decrement button");
        return el;
    }

    function getIncrement(): HTMLButtonElement {
        const el = container.querySelector<HTMLButtonElement>('button[data-direction="increment"]');
        if (!el) throw new Error("Expected increment button");
        return el;
    }

    function getInput(): HTMLInputElement {
        const el = container.querySelector<HTMLInputElement>("input.cs-number-stepper-field");
        if (!el) throw new Error("Expected NumberStepperInput <input>");
        return el;
    }

    function getValueEl(): HTMLElement {
        const el = container.querySelector<HTMLElement>(".cs-number-stepper-value");
        if (!el) throw new Error("Expected .cs-number-stepper-value");
        return el;
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        vi.useRealTimers();
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Root attributes, ref binding, class & rest forwarding", () => {
        test("renders all variants, sizes, orientations, disabled, invalid, and binds all refs", () => {
            for (const variant of NUMBER_STEPPER_VARIANTS) {
                for (const size of NUMBER_STEPPER_SIZES) {
                    for (const orientation of NUMBER_STEPPER_ORIENTATIONS) {
                        let ref: HTMLDivElement | null = null;
                        let decRef: HTMLButtonElement | null = null;
                        let incRef: HTMLButtonElement | null = null;

                        const instance = mount(NumberStepperTestHost, {
                            target: container,
                            props: {
                                variant,
                                size,
                                orientation,
                                get ref() {
                                    return ref;
                                },
                                set ref(el) {
                                    ref = el;
                                },
                                get decrementRef() {
                                    return decRef;
                                },
                                set decrementRef(el) {
                                    decRef = el;
                                },
                                get incrementRef() {
                                    return incRef;
                                },
                                set incrementRef(el) {
                                    incRef = el;
                                },
                            },
                        });
                        flushSync();

                        const root = getRoot();
                        expect(ref).toBe(root);
                        expect(decRef).toBe(getDecrement());
                        expect(incRef).toBe(getIncrement());
                        expect(root.getAttribute("role")).toBe("group");
                        expect(root.dataset.variant).toBe(variant);
                        expect(root.dataset.size).toBe(size);
                        expect(root.dataset.orientation).toBe(orientation);
                        expect(root.dataset.disabled).toBeUndefined();
                        expect(root.dataset.invalid).toBeUndefined();
                        expect(root.getAttribute("aria-disabled")).toBeNull();

                        unmount(instance);
                    }
                }
            }
        });

        test("forwards class, {...rest}, disabled, and invalid attributes across root and subcomponents", () => {
            let inputRef: HTMLInputElement | null = null;
            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "input",
                    disabled: true,
                    invalid: true,
                    rootClass: "custom-root",
                    decrementClass: "custom-dec",
                    incrementClass: "custom-inc",
                    inputClass: "custom-input",
                    rootRest: { "data-testid": "stepper-root", "aria-label": "Quantity" },
                    decrementRest: { "data-testid": "dec-btn" },
                    incrementRest: { "data-testid": "inc-btn" },
                    inputRest: { "data-testid": "num-input" },
                    get inputRef() {
                        return inputRef;
                    },
                    set inputRef(el) {
                        inputRef = el;
                    },
                },
            });
            flushSync();

            const root = getRoot();
            expect(root.classList.contains("cs-number-stepper")).toBe(true);
            expect(root.classList.contains("custom-root")).toBe(true);
            expect(root.dataset.testid).toBe("stepper-root");
            expect(root.getAttribute("aria-label")).toBe("Quantity");
            expect(root.dataset.disabled).toBe("");
            expect(root.dataset.invalid).toBe("");
            expect(root.getAttribute("aria-disabled")).toBe("true");

            const dec = getDecrement();
            expect(dec.classList.contains("cs-number-stepper-btn")).toBe(true);
            expect(dec.classList.contains("custom-dec")).toBe(true);
            expect(dec.dataset.testid).toBe("dec-btn");

            const inc = getIncrement();
            expect(inc.classList.contains("cs-number-stepper-btn")).toBe(true);
            expect(inc.classList.contains("custom-inc")).toBe(true);
            expect(inc.dataset.testid).toBe("inc-btn");

            const input = getInput();
            expect(inputRef).toBe(input);
            expect(input.classList.contains("cs-number-stepper-field")).toBe(true);
            expect(input.classList.contains("custom-input")).toBe(true);
            expect(input.dataset.testid).toBe("num-input");
            expect(input.getAttribute("aria-invalid")).toBe("true");

            unmount(instance);
        });
    });

    describe("Increment / Decrement stepping, precision, clamping & sync", () => {
        test("steps by custom step, clamps to min/max, and fires onValueChange without spurious no-ops", () => {
            let value = $state(3);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "value",
                    min: 0,
                    max: 10,
                    step: 4,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const dec = getDecrement();
            const inc = getIncrement();

            // 3 + 4 = 7
            inc.click();
            flushSync();
            expect(value).toBe(7);
            expect(onValueChange).toHaveBeenLastCalledWith(7);

            // 7 + 4 = 11 -> clamped to 10
            inc.click();
            flushSync();
            expect(value).toBe(10);
            expect(onValueChange).toHaveBeenLastCalledWith(10);
            expect(inc.disabled).toBe(true);

            // Clicking disabled increment at max is a no-op
            inc.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(2);

            // 10 - 4 = 6 -> re-enables increment
            dec.click();
            flushSync();
            expect(value).toBe(6);
            expect(inc.disabled).toBe(false);

            // 6 - 4 = 2 -> 2 - 4 = -2 clamped to 0
            dec.click();
            flushSync();
            expect(value).toBe(2);
            dec.click();
            flushSync();
            expect(value).toBe(0);
            expect(dec.disabled).toBe(true);
            expect(onValueChange).toHaveBeenCalledTimes(5);

            unmount(instance);
        });

        test("maintains decimal precision (0.1 + 0.2 = 0.3) and handles scientific notation steps", () => {
            let value = $state(0.1);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    step: 0.2,
                    min: 0.1,
                    max: 1,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            getIncrement().click();
            flushSync();
            expect(value).toBe(0.3);
            expect(onValueChange).toHaveBeenLastCalledWith(0.3);

            getDecrement().click();
            flushSync();
            expect(value).toBe(0.1);

            unmount(instance);

            let sciValue = $state(0);
            const sciInstance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    step: 1e-7,
                    get value() {
                        return sciValue;
                    },
                    set value(v) {
                        sciValue = v;
                    },
                },
            });
            flushSync();

            getIncrement().click();
            flushSync();
            expect(sciValue).toBe(1e-7);

            getIncrement().click();
            flushSync();
            expect(sciValue).toBe(2e-7);

            getDecrement().click();
            flushSync();
            expect(sciValue).toBe(1e-7);

            unmount(sciInstance);
        });

        test("supports strict controlled mode without mutating external value unless parent updates", () => {
            let value = $state(5);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    strictControlled: true,
                    middle: "input",
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            getIncrement().click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledWith(6);
            // Setter in strictControlled is a no-op, so parent value stays 5 and UI reflects 5
            expect(value).toBe(5);
            expect(getInput().value).toBe("5");
            expect(getInput().getAttribute("aria-valuenow")).toBe("5");

            unmount(instance);
        });
    });

    describe("Boundary, whole-stepper, and per-button disabled overrides", () => {
        test("disables buttons at min/max, on whole-stepper disabled, and on per-button disabled", () => {
            let value = $state(0);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    min: 0,
                    max: 2,
                    decrementDisabled: false,
                    incrementDisabled: true,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            // At min=0, decrement is disabled by boundary; increment is disabled by per-button override
            expect(getDecrement().disabled).toBe(true);
            expect(getIncrement().disabled).toBe(true);

            getIncrement().click();
            flushSync();
            expect(value).toBe(0);
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("whole-stepper disabled locks buttons, input, and resettable value", () => {
            let value = $state(5);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    min: 0,
                    max: 10,
                    defaultValue: 2,
                    disabled: true,
                    middle: "value",
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            expect(getDecrement().disabled).toBe(true);
            expect(getIncrement().disabled).toBe(true);
            expect((getValueEl() as HTMLButtonElement).disabled).toBe(true);

            getDecrement().click();
            getIncrement().click();
            getValueEl().click();
            flushSync();

            expect(value).toBe(5);
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });
    });

    describe("middleClick on root", () => {
        test("resets value to defaultValue and updates input/buttons", () => {
            let value = $state(10);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    min: 0,
                    max: 10,
                    defaultValue: 4,
                    middle: "input",
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            expect(getIncrement().disabled).toBe(true);

            dispatchMiddleClick(getRoot());
            flushSync();

            expect(value).toBe(4);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith(4);
            expect(getInput().value).toBe("4");
            expect(getIncrement().disabled).toBe(false);

            // Second middle click when already at defaultValue is a no-op
            dispatchMiddleClick(getRoot());
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("syncs focused input draft and DOM value on middle-click reset without reverting on blur", () => {
            let value = $state(42);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    defaultValue: 4,
                    middle: "input",
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const input = getInput();
            input.focus();
            input.value = "99";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            flushSync();
            expect(input.value).toBe("99");

            dispatchMiddleClick(getRoot());
            flushSync();

            expect(value).toBe(4);
            expect(input.value).toBe("4");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith(4);

            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            flushSync();

            expect(value).toBe(4);
            expect(input.value).toBe("4");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("does nothing when defaultValue is undefined or stepper is disabled", () => {
            let value = $state(5);
            const onValueChange = vi.fn();

            const noDefault = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            dispatchMiddleClick(getRoot());
            flushSync();
            expect(value).toBe(5);
            expect(onValueChange).not.toHaveBeenCalled();
            unmount(noDefault);

            const disabledStepper = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    defaultValue: 0,
                    disabled: true,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            dispatchMiddleClick(getRoot());
            flushSync();
            expect(value).toBe(5);
            expect(onValueChange).not.toHaveBeenCalled();
            unmount(disabledStepper);
        });
    });

    describe("NumberStepperInput", () => {
        test("sets spinbutton semantics, inputmode, prefix/suffix, and cross-syncs with buttons", () => {
            let value = $state(5);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "input",
                    min: 0,
                    max: 20,
                    step: 0.5,
                    prefix: "$",
                    suffix: "USD",
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const input = getInput();
            const shell = input.closest<HTMLElement>(".cs-number-stepper-input-shell");
            expect(shell?.dataset.hasSuffix).toBe("");
            const units = [...container.querySelectorAll(".cs-number-stepper-unit")];
            expect(units.map((u) => u.textContent)).toEqual(["$", "USD"]);
            expect(units.every((u) => u.getAttribute("aria-hidden") === "true")).toBe(true);

            expect(input.getAttribute("role")).toBe("spinbutton");
            expect(input.getAttribute("inputmode")).toBe("decimal");
            expect(input.getAttribute("aria-valuenow")).toBe("5");
            expect(input.getAttribute("aria-valuemin")).toBe("0");
            expect(input.getAttribute("aria-valuemax")).toBe("20");

            // Keyboard ArrowUp / ArrowDown / Home / End
            input.focus();
            dispatchKey(input, "ArrowUp");
            flushSync();
            expect(value).toBe(5.5);
            expect(input.value).toBe("5.5");

            dispatchKey(input, "ArrowDown");
            flushSync();
            expect(value).toBe(5);

            dispatchKey(input, "End");
            flushSync();
            expect(value).toBe(20);
            expect(getIncrement().disabled).toBe(true);

            dispatchKey(input, "Home");
            flushSync();
            expect(value).toBe(0);
            expect(getDecrement().disabled).toBe(true);
            expect(getIncrement().disabled).toBe(false);

            // Button click updates input display
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            flushSync();
            getIncrement().click();
            flushSync();
            expect(value).toBe(0.5);
            expect(input.value).toBe("0.5");

            unmount(instance);
        });

        test("commits valid draft on Enter and blur, and reverts on Escape or invalid input", () => {
            let value = $state(10);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "input",
                    min: 0,
                    max: 100,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const input = getInput();
            const blurSpy = vi.spyOn(input, "blur");

            // Typing + Enter commits & clamps
            input.focus();
            input.value = "150";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            dispatchKey(input, "Enter");
            flushSync();

            expect(value).toBe(100);
            expect(input.value).toBe("100");
            expect(blurSpy).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(100);

            // Typing + blur commits
            input.focus();
            input.value = "42";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            flushSync();

            expect(value).toBe(42);
            expect(input.value).toBe("42");

            // Escape reverts draft without firing onValueChange
            input.focus();
            input.value = "99";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            dispatchKey(input, "Escape");
            flushSync();

            expect(value).toBe(42);
            expect(input.value).toBe("42");
            expect(blurSpy).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenCalledTimes(2);

            // Invalid / empty input reverts on blur
            input.focus();
            input.value = "not-a-number";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            flushSync();

            expect(value).toBe(42);
            expect(input.value).toBe("42");
            expect(onValueChange).toHaveBeenCalledTimes(2);

            input.focus();
            input.value = " ".repeat(3);
            input.dispatchEvent(new Event("input", { bubbles: true }));
            dispatchKey(input, "Enter");
            flushSync();

            expect(value).toBe(42);
            expect(input.value).toBe("42");
            expect(onValueChange).toHaveBeenCalledTimes(2);

            unmount(instance);
        });

        test("respects inputReadonly and inputDisabled", () => {
            let value = $state(5);
            const onValueChange = vi.fn();

            const readonlyInstance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "input",
                    inputReadonly: true,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const readonlyInput = getInput();
            expect(readonlyInput.readOnly).toBe(true);
            readonlyInput.focus();
            dispatchKey(readonlyInput, "ArrowUp");
            flushSync();
            expect(value).toBe(5);
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(readonlyInstance);

            const disabledInstance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "input",
                    inputDisabled: true,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const disabledInput = getInput();
            expect(disabledInput.disabled).toBe(true);
            expect(container.querySelector(".cs-number-stepper-input-shell[data-disabled]")).not.toBeNull();
            expect(getDecrement().disabled).toBe(false);
            expect(getIncrement().disabled).toBe(false);

            getIncrement().click();
            flushSync();
            expect(value).toBe(6);
            expect(disabledInput.value).toBe("6");

            unmount(disabledInstance);
        });

        test("renders NumberMorph overlay with data-has-display, updates on step/middle-click, and toggles data-editing on focus/commit", () => {
            let value = $state(10);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "input-morph",
                    min: 0,
                    max: 100,
                    defaultValue: 25,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const root = getRoot();
            const input = getInput();
            const shell = input.closest<HTMLElement>(".cs-number-stepper-input-shell");
            const display = shell?.querySelector<HTMLElement>(".cs-number-stepper-input-display");
            const flowEl = display?.querySelector("number-flow-svelte") ?? null;

            expect(shell?.dataset.hasDisplay).toBe("");
            expect(shell?.dataset.editing).toBeUndefined();
            expect(display).not.toBeNull();
            expect(display?.getAttribute("aria-hidden")).toBe("true");
            expect(display?.querySelector(".cs-number-morph")).not.toBeNull();
            expect(input.value).toBe("10");
            expect(getFlowText(flowEl)).toBe("10");

            // Increment / decrement while blurred updates both <input> and <NumberMorph> overlay
            getIncrement().click();
            flushSync();
            expect(value).toBe(11);
            expect(input.value).toBe("11");
            expect(getFlowText(flowEl)).toBe("11");
            expect(shell?.dataset.editing).toBeUndefined();

            getDecrement().click();
            flushSync();
            expect(value).toBe(10);
            expect(input.value).toBe("10");
            expect(getFlowText(flowEl)).toBe("10");
            expect(shell?.dataset.editing).toBeUndefined();

            // Middle-click reset while blurred updates both <input> and <NumberMorph> overlay
            dispatchMiddleClick(root);
            flushSync();
            expect(value).toBe(25);
            expect(input.value).toBe("25");
            expect(getFlowText(flowEl)).toBe("25");
            expect(shell?.dataset.editing).toBeUndefined();

            // Focus sets data-editing=""; Enter commits, clears data-editing, and updates overlay
            input.focus();
            flushSync();
            expect(shell?.dataset.editing).toBe("");

            input.value = "42";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            dispatchKey(input, "Enter");
            flushSync();

            expect(value).toBe(42);
            expect(input.value).toBe("42");
            expect(shell?.dataset.editing).toBeUndefined();
            expect(getFlowText(flowEl)).toBe("42");

            // Focus again, then commit via blur
            input.focus();
            flushSync();
            expect(shell?.dataset.editing).toBe("");

            input.value = "78";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
            flushSync();

            expect(value).toBe(78);
            expect(input.value).toBe("78");
            expect(shell?.dataset.editing).toBeUndefined();
            expect(getFlowText(flowEl)).toBe("78");

            unmount(instance);
        });
    });

    describe("NumberStepperValue", () => {
        test("renders formatted value with locales/format/prefix/suffix and acts as reset button when defaultValue is set", () => {
            let value = $state(1234.5);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "value",
                    defaultValue: 100,
                    locales: "en-US",
                    format: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
                    prefix: "~",
                    suffix: " kg",
                    valueClass: "custom-value",
                    valueRest: { "data-testid": "val-el" },
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const el = getValueEl();
            expect(el.tagName).toBe("BUTTON");
            expect(el.getAttribute("type")).toBe("button");
            expect(el.classList.contains("custom-value")).toBe(true);
            expect(el.dataset.testid).toBe("val-el");
            expect(el.textContent?.trim()).toBe("~1,234.5 kg");

            // Keyboard arrow keys on resettable value button
            dispatchKey(el, "ArrowRight");
            flushSync();
            expect(value).toBe(1235.5);

            dispatchKey(el, "ArrowLeft");
            flushSync();
            expect(value).toBe(1234.5);

            // Normal click resets to defaultValue
            el.click();
            flushSync();
            expect(value).toBe(100);
            expect(el.textContent?.trim()).toBe("~100.0 kg");
            expect(onValueChange).toHaveBeenLastCalledWith(100);

            unmount(instance);
        });

        test("renders as <span> when defaultValue is undefined and supports children snippet (NumberMorph)", () => {
            let value = $state(25);
            let valueRef: HTMLElement | null = null;

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    middle: "value-morph",
                    suffix: "%",
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                    get valueRef() {
                        return valueRef;
                    },
                    set valueRef(el) {
                        valueRef = el;
                    },
                },
            });
            flushSync();

            const el = getValueEl();
            expect(el.tagName).toBe("SPAN");
            expect(valueRef).toBe(el);
            expect(el.querySelector(".cs-number-morph")).not.toBeNull();

            // Clicking span does nothing
            el.click();
            flushSync();
            expect(value).toBe(25);

            // Stepping updates child NumberMorph
            getIncrement().click();
            flushSync();
            expect(value).toBe(26);

            unmount(instance);
        });
    });

    describe("Vertical orientation constraint", () => {
        test('throws when NumberStepperInput is mounted inside orientation="vertical"', () => {
            expect(() => {
                mount(NumberStepperTestHost, {
                    target: container,
                    props: {
                        orientation: "vertical",
                        middle: "input",
                    },
                });
            }).toThrow('NumberStepperInput cannot be used inside NumberStepper with orientation="vertical".');
        });

        test('throws when NumberStepperValue is mounted inside orientation="vertical"', () => {
            expect(() => {
                mount(NumberStepperTestHost, {
                    target: container,
                    props: {
                        orientation: "vertical",
                        middle: "value",
                    },
                });
            }).toThrow('NumberStepperValue cannot be used inside NumberStepper with orientation="vertical".');
        });
    });

    describe("Repeat-on-hold", () => {
        test("repeats after 400ms every 85ms until pointerup and suppresses trailing click", () => {
            vi.useFakeTimers();

            let value = $state(0);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    min: 0,
                    max: 10,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const inc = getIncrement();

            // Pointerdown does not step immediately; waits 400ms
            dispatchPointer(inc, "pointerdown", 0);
            flushSync();
            expect(value).toBe(0);

            vi.advanceTimersByTime(399);
            flushSync();
            expect(value).toBe(0);

            // At 400ms, initial repeat step fires
            vi.advanceTimersByTime(1);
            flushSync();
            expect(value).toBe(1);

            // Every 85ms thereafter
            vi.advanceTimersByTime(85);
            flushSync();
            expect(value).toBe(2);

            vi.advanceTimersByTime(170);
            flushSync();
            expect(value).toBe(4);

            // pointerup stops repeating, and trailing click is consumed (no double-step)
            dispatchPointer(inc, "pointerup", 0);
            inc.click();
            flushSync();
            expect(value).toBe(4);

            vi.advanceTimersByTime(500);
            flushSync();
            expect(value).toBe(4);

            unmount(instance);
        });

        test("stops repeating on pointercancel, pointerleave, and at min/max boundary", () => {
            vi.useFakeTimers();

            let value = $state(2);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    min: 0,
                    max: 4,
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            const dec = getDecrement();
            const inc = getIncrement();

            // Non-primary button does not start repeat
            dispatchPointer(inc, "pointerdown", 2);
            vi.advanceTimersByTime(600);
            flushSync();
            expect(value).toBe(2);

            // Quick tap (<400ms) steps once via click without repeat
            dispatchPointer(inc, "pointerdown", 0);
            vi.advanceTimersByTime(150);
            dispatchPointer(inc, "pointerup", 0);
            inc.click();
            flushSync();
            expect(value).toBe(3);

            // pointercancel stops repeat and clears hasRepeated so subsequent click works
            dispatchPointer(dec, "pointerdown", 0);
            vi.advanceTimersByTime(400);
            flushSync();
            expect(value).toBe(2);
            dispatchPointer(dec, "pointercancel", 0);
            vi.advanceTimersByTime(300);
            flushSync();
            expect(value).toBe(2);
            dec.click();
            flushSync();
            expect(value).toBe(1);

            // Repeat hits min boundary (0) and stops cleanly
            dispatchPointer(dec, "pointerdown", 0);
            vi.advanceTimersByTime(400 + 85 * 5);
            flushSync();
            expect(value).toBe(0);
            expect(dec.disabled).toBe(true);

            // pointerleave stops repeat and clears hasRepeated so subsequent click works
            dispatchPointer(inc, "pointerdown", 0);
            vi.advanceTimersByTime(400);
            flushSync();
            expect(value).toBe(1);
            dispatchPointer(inc, "pointerleave", 0);
            vi.advanceTimersByTime(300);
            flushSync();
            expect(value).toBe(1);
            inc.click();
            flushSync();
            expect(value).toBe(2);

            unmount(instance);
        });

        test("cleans up repeat timers on unmount", () => {
            vi.useFakeTimers();

            let value = $state(0);
            const onValueChange = vi.fn();

            const instance = mount(NumberStepperTestHost, {
                target: container,
                props: {
                    onValueChange,
                    get value() {
                        return value;
                    },
                    set value(v) {
                        value = v;
                    },
                },
            });
            flushSync();

            dispatchPointer(getIncrement(), "pointerdown", 0);
            vi.advanceTimersByTime(400);
            flushSync();
            expect(value).toBe(1);

            unmount(instance);
            vi.advanceTimersByTime(500);
            expect(value).toBe(1);
            expect(onValueChange).toHaveBeenCalledTimes(1);
        });
    });
});
