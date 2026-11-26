import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    TEXT_INPUT_SIZES,
    TEXT_INPUT_VARIANTS,
    TextInput,
    TextInputAction,
    TextInputField,
} from "./index.ts";
import TextInputTestHost from "./TextInputTestHost.internal.svelte";

function dispatchInput(input: HTMLInputElement, nextValue: string): Event {
    input.value = nextValue;
    const event = new Event("input", { bubbles: true, cancelable: true });
    input.dispatchEvent(event);
    return event;
}

function dispatchMouseDown(target: EventTarget): MouseEvent {
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
}

describe("TextInput Svelte 5 Component", () => {
    let container: HTMLDivElement;

    function getShell(): HTMLDivElement {
        const el = container.querySelector<HTMLDivElement>(".cs-text-input");
        if (!el) throw new Error("Expected .cs-text-input shell");
        return el;
    }

    function getField(): HTMLInputElement {
        const el = container.querySelector<HTMLInputElement>("input.cs-text-input-field");
        if (!el) throw new Error("Expected input.cs-text-input-field");
        return el;
    }

    function getAction(): HTMLButtonElement {
        const el = container.querySelector<HTMLButtonElement>("button.cs-text-input-action");
        if (!el) throw new Error("Expected button.cs-text-input-action");
        return el;
    }

    function getIcon(): SVGElement {
        const el = container.querySelector<SVGElement>(".cs-text-input-icon");
        if (!el) throw new Error("Expected .cs-text-input-icon");
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

    describe("Rendering & Data Attributes", () => {
        test.each(TEXT_INPUT_VARIANTS)("renders data-variant=%s on .cs-text-input", (variant) => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: { variant, size: "md" },
            });
            flushSync();

            expect(getShell().dataset.variant).toBe(variant);

            unmount(instance);
        });

        test.each(TEXT_INPUT_SIZES)("renders data-size=%s on .cs-text-input", (size) => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: { variant: "soft", size },
            });
            flushSync();

            expect(getShell().dataset.size).toBe(size);

            unmount(instance);
        });

        test("omits state data attributes and aria-invalid when false/undefined on initial mount", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: { showAction: true },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            const action = getAction();

            expect(shell.dataset.invalid).toBeUndefined();
            expect(shell.dataset.disabled).toBeUndefined();
            expect(shell.dataset.readonly).toBeUndefined();

            expect(field.disabled).toBe(false);
            expect(field.readOnly).toBe(false);
            expect(field.hasAttribute("aria-invalid")).toBe(false);

            expect(action.disabled).toBe(false);

            unmount(instance);
        });

        test("propagates invalid, disabled, and readonly from TextInput context to TextInputField and TextInputAction", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    invalid: true,
                    disabled: true,
                    readonly: true,
                    showAction: true,
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            const action = getAction();

            expect(shell.dataset.invalid).toBe("");
            expect(shell.dataset.disabled).toBe("");
            expect(shell.dataset.readonly).toBe("");

            expect(field.getAttribute("aria-invalid")).toBe("true");
            expect(field.disabled).toBe(true);
            expect(field.readOnly).toBe(true);

            expect(action.disabled).toBe(true);

            unmount(instance);
        });

        test("readonly on TextInput sets data-readonly and input.readOnly but does NOT auto-disable TextInputAction", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    readonly: true,
                    showAction: true,
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            const action = getAction();

            expect(shell.dataset.readonly).toBe("");
            expect(shell.dataset.disabled).toBeUndefined();
            expect(field.readOnly).toBe(true);
            expect(field.disabled).toBe(false);
            expect(action.disabled).toBe(false);

            unmount(instance);
        });

        test("supports local overrides on TextInputField and TextInputAction", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    invalid: true,
                    disabled: false,
                    readonly: false,
                    fieldDisabled: true,
                    fieldReadonly: true,
                    fieldInvalid: false,
                    showAction: true,
                    actionDisabled: true,
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            const action = getAction();

            expect(shell.dataset.invalid).toBe("");
            expect(shell.dataset.disabled).toBeUndefined();
            expect(shell.dataset.readonly).toBeUndefined();

            expect(field.disabled).toBe(true);
            expect(field.readOnly).toBe(true);
            expect(field.hasAttribute("aria-invalid")).toBe(false);

            expect(action.disabled).toBe(true);

            unmount(instance);
        });

        test("local invalid=true on TextInputField sets aria-invalid even when shell invalid is false", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    invalid: false,
                    fieldInvalid: true,
                },
            });
            flushSync();

            expect(getShell().dataset.invalid).toBeUndefined();
            expect(getField().getAttribute("aria-invalid")).toBe("true");

            unmount(instance);
        });

        test("reactively updates propagated states when shell props change", () => {
            let disabled = $state(false);
            let readonly = $state(false);
            let invalid = $state(false);

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    get disabled() {
                        return disabled;
                    },
                    get readonly() {
                        return readonly;
                    },
                    get invalid() {
                        return invalid;
                    },
                    showAction: true,
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            const action = getAction();

            expect(field.disabled).toBe(false);
            expect(field.readOnly).toBe(false);
            expect(field.hasAttribute("aria-invalid")).toBe(false);
            expect(action.disabled).toBe(false);

            disabled = true;
            readonly = true;
            invalid = true;
            flushSync();

            expect(shell.dataset.disabled).toBe("");
            expect(shell.dataset.readonly).toBe("");
            expect(shell.dataset.invalid).toBe("");
            expect(field.disabled).toBe(true);
            expect(field.readOnly).toBe(true);
            expect(field.getAttribute("aria-invalid")).toBe("true");
            expect(action.disabled).toBe(true);

            disabled = false;
            readonly = false;
            invalid = false;
            flushSync();

            expect(shell.dataset.disabled).toBeUndefined();
            expect(shell.dataset.readonly).toBeUndefined();
            expect(shell.dataset.invalid).toBeUndefined();
            expect(field.disabled).toBe(false);
            expect(field.readOnly).toBe(false);
            expect(field.hasAttribute("aria-invalid")).toBe(false);
            expect(action.disabled).toBe(false);

            unmount(instance);
        });
    });

    describe("Value Binding & Callbacks", () => {
        test("bind:value syncs two-way between host state and <input>.value without firing onValueChange on mount or programmatic updates", () => {
            let value = $state("initial");
            const onValueChange = vi.fn();

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    get value() {
                        return value;
                    },
                    set value(next: string) {
                        value = next;
                    },
                    onValueChange,
                },
            });
            flushSync();

            const field = getField();
            expect(field.value).toBe("initial");
            expect(onValueChange).not.toHaveBeenCalled();

            // Programmatic update -> DOM updates, callback does not fire
            value = "programmatic";
            flushSync();
            expect(field.value).toBe("programmatic");
            expect(onValueChange).not.toHaveBeenCalled();

            // User input -> bound value updates and onValueChange fires
            dispatchInput(field, "typed by user");
            flushSync();
            expect(value).toBe("typed by user");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("typed by user");

            unmount(instance);
        });

        test("fires both consumer oninput and onValueChange on user input", () => {
            const onValueChange = vi.fn();
            const oninput = vi.fn();

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    onValueChange,
                    fieldProps: { oninput },
                },
            });
            flushSync();

            const field = getField();
            dispatchInput(field, "hello");
            flushSync();

            expect(oninput).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith("hello");

            unmount(instance);
        });

        test("supports controlled bind:value getter/setter transformation and external updates", () => {
            let controlled = $state("LOCKED");
            const onValueChange = vi.fn();

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    get value() {
                        return controlled;
                    },
                    set value(next: string) {
                        controlled = next.toUpperCase();
                    },
                    onValueChange,
                },
            });
            flushSync();

            const field = getField();
            expect(field.value).toBe("LOCKED");

            // User types lowercase -> controlled setter normalizes to uppercase -> input reflects normalized value
            dispatchInput(field, "attempt");
            flushSync();
            expect(onValueChange).toHaveBeenCalledWith("attempt");
            expect(controlled).toBe("ATTEMPT");
            expect(field.value).toBe("ATTEMPT");

            // Parent updates controlled value -> input reflects new value
            controlled = "APPROVED";
            flushSync();
            expect(field.value).toBe("APPROVED");

            unmount(instance);
        });
    });

    describe("Refs & Attribute Forwarding", () => {
        test("binds ref on TextInput, TextInputField, and TextInputAction to their DOM elements", () => {
            let shellRef: HTMLDivElement | null = null;
            let fieldRef: HTMLInputElement | null = null;
            let actionRef: HTMLButtonElement | null = null;

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showAction: true,
                    get shellRef() {
                        return shellRef;
                    },
                    set shellRef(el: HTMLDivElement | null) {
                        shellRef = el;
                    },
                    get fieldRef() {
                        return fieldRef;
                    },
                    set fieldRef(el: HTMLInputElement | null) {
                        fieldRef = el;
                    },
                    get actionRef() {
                        return actionRef;
                    },
                    set actionRef(el: HTMLButtonElement | null) {
                        actionRef = el;
                    },
                },
            });
            flushSync();

            expect(shellRef).toBeInstanceOf(HTMLDivElement);
            expect(shellRef).toBe(getShell());

            expect(fieldRef).toBeInstanceOf(HTMLInputElement);
            expect(fieldRef).toBe(getField());

            expect(actionRef).toBeInstanceOf(HTMLButtonElement);
            expect(actionRef).toBe(getAction());

            unmount(instance);
        });

        test("forwards {...rest} attributes on TextInput to .cs-text-input shell", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    shellProps: {
                        class: "custom-shell",
                        style: "width: 240px;",
                        "data-testid": "email-shell",
                    },
                },
            });
            flushSync();

            const shell = getShell();
            expect(shell.classList.contains("cs-text-input")).toBe(true);
            expect(shell.classList.contains("custom-shell")).toBe(true);
            expect(shell.style.width).toBe("240px");
            expect(shell.dataset.testid).toBe("email-shell");

            unmount(instance);
        });

        test("forwards {...rest} attributes on TextInputField to <input> and enables <label for={id}>", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    labelText: "Email address",
                    fieldProps: {
                        id: "email-input",
                        name: "email",
                        type: "email",
                        placeholder: "you@example.com",
                        required: true,
                        "aria-label": "Email",
                        "aria-describedby": "email-hint",
                        class: "custom-field",
                    },
                },
            });
            flushSync();

            const field = getField();
            const label = container.querySelector<HTMLLabelElement>("label");

            expect(field.id).toBe("email-input");
            expect(field.name).toBe("email");
            expect(field.type).toBe("email");
            expect(field.placeholder).toBe("you@example.com");
            expect(field.required).toBe(true);
            expect(field.getAttribute("aria-label")).toBe("Email");
            expect(field.getAttribute("aria-describedby")).toBe("email-hint");
            expect(field.classList.contains("cs-text-input-field")).toBe(true);
            expect(field.classList.contains("custom-field")).toBe(true);
            expect(label?.control).toBe(field);

            unmount(instance);
        });
    });

    describe("Shell Click-to-Focus", () => {
        test("mousedown directly on .cs-text-input shell focuses <input> and calls preventDefault() when !disabled", () => {
            const onmousedown = vi.fn();

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    shellProps: { onmousedown },
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            expect(document.activeElement).not.toBe(field);

            const event = dispatchMouseDown(shell);
            expect(event.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(field);
            expect(onmousedown).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("mousedown on .cs-text-input shell when disabled does NOT focus <input> or call preventDefault()", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    disabled: true,
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();

            const event = dispatchMouseDown(shell);
            expect(event.defaultPrevented).toBe(false);
            expect(document.activeElement).not.toBe(field);

            unmount(instance);
        });

        test("mousedown on TextInputAction does NOT get hijacked by shell mousedown", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showAction: true,
                },
            });
            flushSync();

            const field = getField();
            const action = getAction();

            const event = dispatchMouseDown(action);
            expect(event.defaultPrevented).toBe(false);
            expect(document.activeElement).not.toBe(field);

            unmount(instance);
        });

        test("mousedown directly on <input> does NOT call preventDefault() from shell handler", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {},
            });
            flushSync();

            const field = getField();
            const event = dispatchMouseDown(field);
            expect(event.defaultPrevented).toBe(false);

            unmount(instance);
        });

        test("unmounting TextInputField unregisters fieldEl cleanly so shell mousedown is a safe no-op", () => {
            let showField = $state(true);

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    get showField() {
                        return showField;
                    },
                },
            });
            flushSync();

            const shell = getShell();
            const staleField = getField();
            const focusSpy = vi.spyOn(staleField, "focus");

            showField = false;
            flushSync();

            expect(container.querySelector("input.cs-text-input-field")).toBeNull();
            const event = dispatchMouseDown(shell);
            expect(event.defaultPrevented).toBe(false);
            expect(focusSpy).not.toHaveBeenCalled();

            unmount(instance);
        });
    });

    describe("Subcomponents (TextInputIcon, TextInputAction)", () => {
        test("TextInputIcon renders with aria-hidden='true' and .cs-text-input-icon", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showIcon: true,
                    iconProps: { class: "custom-icon" },
                },
            });
            flushSync();

            const icon = getIcon();
            expect(icon.getAttribute("aria-hidden")).toBe("true");
            expect(icon.classList.contains("cs-text-input-icon")).toBe(true);
            expect(icon.classList.contains("custom-icon")).toBe(true);

            unmount(instance);
        });

        test("TextInputAction enforces type='button' even when type='submit' is passed, and renders <HitArea>", () => {
            const onclick = vi.fn();

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showAction: true,
                    actionProps: {
                        type: "submit",
                        "aria-label": "Clear input",
                        onclick,
                    },
                },
            });
            flushSync();

            const action = getAction();
            expect(action.getAttribute("type")).toBe("button");
            expect(action.getAttribute("aria-label")).toBe("Clear input");
            expect(action.querySelector(".cs-hit-area")).not.toBeNull();

            const actionIcon = action.querySelector(".cs-text-input-action-icon");
            expect(actionIcon).not.toBeNull();
            expect(actionIcon?.getAttribute("aria-hidden")).toBe("true");

            action.click();
            expect(onclick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("TextInputAction toggles visible state (data-visible, aria-hidden, tabindex)", () => {
            let visible = $state(false);

            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showAction: true,
                    get actionVisible() {
                        return visible;
                    },
                    actionProps: {
                        tabindex: 0,
                        "aria-label": "Clear",
                    },
                },
            });
            flushSync();

            const action = getAction();
            expect(action.dataset.visible).toBe("false");
            expect(action.getAttribute("aria-hidden")).toBe("true");
            expect(action.getAttribute("tabindex")).toBe("-1");

            visible = true;
            flushSync();

            expect(action.dataset.visible).toBe("");
            expect(action.hasAttribute("aria-hidden")).toBe(false);
            expect(action.getAttribute("tabindex")).toBe("0");

            visible = false;
            flushSync();

            expect(action.dataset.visible).toBe("false");
            expect(action.getAttribute("aria-hidden")).toBe("true");
            expect(action.getAttribute("tabindex")).toBe("-1");

            unmount(instance);
        });

        test("TextInputAction renders custom children when icon is omitted", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showAction: true,
                    actionUseIcon: false,
                    actionLabel: "Show",
                    actionProps: { "aria-label": "Show password" },
                },
            });
            flushSync();

            const action = getAction();
            expect(action.querySelector(".cs-text-input-action-icon")).toBeNull();
            expect(action.textContent?.trim()).toBe("Show");

            unmount(instance);
        });

        test("standalone TextInput, TextInputField, and TextInputAction render safely without throwing", () => {
            const shellInstance = mount(TextInput, {
                target: container,
                props: { variant: "elevated", size: "sm" },
            });
            const fieldInstance = mount(TextInputField, {
                target: container,
                props: { value: "standalone" },
            });
            const actionInstance = mount(TextInputAction, {
                target: container,
                props: { "aria-label": "Standalone action" },
            });
            flushSync();

            expect(getShell().dataset.variant).toBe("elevated");
            expect(getField().value).toBe("standalone");
            expect(getAction().getAttribute("type")).toBe("button");

            unmount(actionInstance);
            unmount(fieldInstance);
            unmount(shellInstance);
        });
    });

    describe("Focus Ring Selector", () => {
        test("shell matches :has(> .cs-text-input-field:focus) only when TextInputField is focused, not when TextInputAction is focused", () => {
            const instance = mount(TextInputTestHost, {
                target: container,
                props: {
                    showAction: true,
                    actionVisible: true,
                    actionProps: { "aria-label": "Clear input" },
                },
            });
            flushSync();

            const shell = getShell();
            const field = getField();
            const action = getAction();

            expect(shell.matches(":has(> .cs-text-input-field:focus)")).toBe(false);
            expect(shell.matches(":has(> .cs-text-input-field:focus):not([data-disabled])")).toBe(false);

            field.focus();
            expect(document.activeElement).toBe(field);
            expect(shell.matches(":has(> .cs-text-input-field:focus)")).toBe(true);
            expect(shell.matches(":has(> .cs-text-input-field:focus):not([data-disabled])")).toBe(true);

            action.focus();
            expect(document.activeElement).toBe(action);
            expect(shell.matches(":has(> .cs-text-input-field:focus)")).toBe(false);
            expect(shell.matches(":has(> .cs-text-input-field:focus):not([data-disabled])")).toBe(false);

            field.focus();
            expect(document.activeElement).toBe(field);
            expect(shell.matches(":has(> .cs-text-input-field:focus)")).toBe(true);

            unmount(instance);
        });
    });
});
