import { flushSync, mount, unmount } from "svelte";
import { createAttachmentKey } from "svelte/attachments";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    TEXT_AREA_RESIZES,
    TEXT_AREA_SIZES,
    TEXT_AREA_VARIANTS,
    TextArea,
    type TextAreaProps,
    type TextAreaResize,
    type TextAreaSize,
    type TextAreaVariant,
} from "./index.ts";

function dispatchInput(textarea: HTMLTextAreaElement, nextValue: string): Event {
    textarea.value = nextValue;
    const event = new Event("input", { bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);
    return event;
}

describe("TextArea Svelte 5 Component", () => {
    let container: HTMLDivElement;

    function getTextArea(): HTMLTextAreaElement {
        const el = container.querySelector<HTMLTextAreaElement>("textarea.cs-text-area");
        if (!el) throw new Error("Expected textarea.cs-text-area");
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

    describe("Exports", () => {
        test("exports TextArea component and canonical option arrays from index.ts", () => {
            expect(TextArea).toBeTypeOf("function");
            expect(TEXT_AREA_VARIANTS).toEqual(["soft", "elevated"]);
            expect(TEXT_AREA_SIZES).toEqual(["sm", "md", "lg"]);
            expect(TEXT_AREA_RESIZES).toEqual(["none", "vertical", "horizontal", "both"]);

            const variantCheck: TextAreaVariant = "soft";
            const sizeCheck: TextAreaSize = "md";
            const resizeCheck: TextAreaResize = "vertical";
            const propsCheck: TextAreaProps = {
                variant: variantCheck,
                size: sizeCheck,
                resize: resizeCheck,
            };
            expect(propsCheck.variant).toBe("soft");
        });
    });

    describe("Rendering, Defaults & Data Attributes", () => {
        test("renders a single <textarea class='cs-text-area'> root with zero wrapper elements and expected defaults", () => {
            const instance = mount(TextArea, {
                target: container,
                props: { variant: "soft", size: "md" },
            });
            flushSync();

            expect(container.children).toHaveLength(1);
            const textarea = getTextArea();
            expect(container.firstElementChild).toBe(textarea);
            expect(textarea.tagName).toBe("TEXTAREA");
            expect(textarea.classList.contains("cs-text-area")).toBe(true);

            expect(textarea.dataset.variant).toBe("soft");
            expect(textarea.dataset.size).toBe("md");
            expect(textarea.dataset.resize).toBe("vertical");
            expect(textarea.getAttribute("rows")).toBe("3");
            expect(textarea.hasAttribute("cols")).toBe(false);
            expect(textarea.value).toBe("");

            expect(textarea.dataset.invalid).toBeUndefined();
            expect(textarea.dataset.disabled).toBeUndefined();
            expect(textarea.dataset.readonly).toBeUndefined();
            expect(textarea.hasAttribute("aria-invalid")).toBe(false);
            expect(textarea.disabled).toBe(false);
            expect(textarea.readOnly).toBe(false);

            unmount(instance);
        });

        test.each(TEXT_AREA_VARIANTS)("renders data-variant=%s", (variant) => {
            const instance = mount(TextArea, {
                target: container,
                props: { variant, size: "md" },
            });
            flushSync();

            expect(getTextArea().dataset.variant).toBe(variant);

            unmount(instance);
        });

        test.each(TEXT_AREA_SIZES)("renders data-size=%s", (size) => {
            const instance = mount(TextArea, {
                target: container,
                props: { variant: "soft", size },
            });
            flushSync();

            expect(getTextArea().dataset.size).toBe(size);

            unmount(instance);
        });

        test.each(TEXT_AREA_RESIZES)("renders data-resize=%s", (resize) => {
            const instance = mount(TextArea, {
                target: container,
                props: { variant: "soft", size: "md", resize },
            });
            flushSync();

            expect(getTextArea().dataset.resize).toBe(resize);

            unmount(instance);
        });

        test("forwards explicit rows and cols and updates them reactively", () => {
            let rows = $state(6);
            let cols = $state<number | undefined>(40);

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "lg",
                    get rows() {
                        return rows;
                    },
                    get cols() {
                        return cols;
                    },
                },
            });
            flushSync();

            const textarea = getTextArea();
            expect(textarea.getAttribute("rows")).toBe("6");
            expect(textarea.getAttribute("cols")).toBe("40");

            rows = 10;
            cols = undefined;
            flushSync();

            expect(textarea.getAttribute("rows")).toBe("10");
            expect(textarea.hasAttribute("cols")).toBe(false);

            unmount(instance);
        });
    });

    describe("States (invalid, disabled, readonly)", () => {
        test("applies invalid, disabled, and readonly attributes when true", () => {
            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    invalid: true,
                    disabled: true,
                    readonly: true,
                },
            });
            flushSync();

            const textarea = getTextArea();
            expect(textarea.dataset.invalid).toBe("");
            expect(textarea.getAttribute("aria-invalid")).toBe("true");
            expect(textarea.disabled).toBe(true);
            expect(textarea.dataset.disabled).toBe("");
            expect(textarea.readOnly).toBe(true);
            expect(textarea.dataset.readonly).toBe("");

            unmount(instance);
        });

        test("readonly sets readOnly and data-readonly without disabling the textarea", () => {
            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    readonly: true,
                },
            });
            flushSync();

            const textarea = getTextArea();
            expect(textarea.readOnly).toBe(true);
            expect(textarea.dataset.readonly).toBe("");
            expect(textarea.disabled).toBe(false);
            expect(textarea.dataset.disabled).toBeUndefined();

            unmount(instance);
        });

        test("reactively toggles invalid, disabled, and readonly states cleanly", () => {
            let invalid = $state(false);
            let disabled = $state(false);
            let readonly = $state(false);

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get invalid() {
                        return invalid;
                    },
                    get disabled() {
                        return disabled;
                    },
                    get readonly() {
                        return readonly;
                    },
                },
            });
            flushSync();

            const textarea = getTextArea();
            expect(textarea.hasAttribute("aria-invalid")).toBe(false);
            expect(textarea.disabled).toBe(false);
            expect(textarea.readOnly).toBe(false);

            invalid = true;
            disabled = true;
            readonly = true;
            flushSync();

            expect(textarea.dataset.invalid).toBe("");
            expect(textarea.getAttribute("aria-invalid")).toBe("true");
            expect(textarea.disabled).toBe(true);
            expect(textarea.dataset.disabled).toBe("");
            expect(textarea.readOnly).toBe(true);
            expect(textarea.dataset.readonly).toBe("");

            invalid = false;
            disabled = false;
            readonly = false;
            flushSync();

            expect(textarea.dataset.invalid).toBeUndefined();
            expect(textarea.hasAttribute("aria-invalid")).toBe(false);
            expect(textarea.disabled).toBe(false);
            expect(textarea.dataset.disabled).toBeUndefined();
            expect(textarea.readOnly).toBe(false);
            expect(textarea.dataset.readonly).toBeUndefined();

            unmount(instance);
        });
    });

    describe("Value Binding & Callbacks", () => {
        test("bind:value syncs two-way without firing onValueChange on mount or programmatic updates", () => {
            let value = $state("initial\nline 2");
            const onValueChange = vi.fn();

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
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

            const textarea = getTextArea();
            expect(textarea.value).toBe("initial\nline 2");
            expect(onValueChange).not.toHaveBeenCalled();

            // Programmatic update -> DOM updates, callback does not fire
            value = "programmatic\nupdate";
            flushSync();
            expect(textarea.value).toBe("programmatic\nupdate");
            expect(onValueChange).not.toHaveBeenCalled();

            // User input -> bound value updates and onValueChange fires
            dispatchInput(textarea, "typed\nby user");
            flushSync();
            expect(value).toBe("typed\nby user");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("typed\nby user");

            unmount(instance);
        });

        test("fires consumer oninput before onValueChange on user input", () => {
            const callOrder: string[] = [];
            const oninput = vi.fn(() => {
                callOrder.push("oninput");
            });
            const onValueChange = vi.fn(() => {
                callOrder.push("onValueChange");
            });

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    oninput,
                    onValueChange,
                },
            });
            flushSync();

            dispatchInput(getTextArea(), "hello");
            flushSync();

            expect(oninput).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenCalledWith("hello");
            expect(callOrder).toEqual(["oninput", "onValueChange"]);

            unmount(instance);
        });

        test("supports controlled bind:value getter/setter transformation and external updates", () => {
            let controlled = $state("LOCKED");
            const onValueChange = vi.fn();

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
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

            const textarea = getTextArea();
            expect(textarea.value).toBe("LOCKED");

            dispatchInput(textarea, "attempt");
            flushSync();
            expect(onValueChange).toHaveBeenCalledWith("attempt");
            expect(controlled).toBe("ATTEMPT");
            expect(textarea.value).toBe("ATTEMPT");

            controlled = "APPROVED";
            flushSync();
            expect(textarea.value).toBe("APPROVED");

            unmount(instance);
        });
    });

    describe("Refs, Rest Props & Attachments", () => {
        test("binds ref directly to the <textarea> DOM element", () => {
            let ref: HTMLTextAreaElement | null = null;

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get ref() {
                        return ref;
                    },
                    set ref(el: HTMLTextAreaElement | null) {
                        ref = el;
                    },
                },
            });
            flushSync();

            expect(ref).toBeInstanceOf(HTMLTextAreaElement);
            expect(ref).toBe(getTextArea());

            unmount(instance);
        });

        test("forwards {...rest} attributes, merges class, and enables <label for={id}> association", () => {
            const label = document.createElement("label");
            label.htmlFor = "notes-textarea";
            label.textContent = "Notes";
            container.before(label);

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "sm",
                    id: "notes-textarea",
                    name: "notes",
                    placeholder: "Write your notes...",
                    maxlength: 250,
                    minlength: 5,
                    wrap: "soft",
                    autocomplete: "off",
                    spellcheck: false,
                    required: true,
                    "aria-label": "Notes",
                    "aria-describedby": "notes-hint",
                    "data-testid": "notes-field",
                    style: "max-width: 400px;",
                    class: "custom-textarea",
                },
            });
            flushSync();

            const textarea = getTextArea();
            expect(textarea.id).toBe("notes-textarea");
            expect(textarea.name).toBe("notes");
            expect(textarea.placeholder).toBe("Write your notes...");
            expect(textarea.maxLength).toBe(250);
            expect(textarea.minLength).toBe(5);
            expect(textarea.getAttribute("wrap")).toBe("soft");
            expect(textarea.getAttribute("autocomplete")).toBe("off");
            expect(textarea.getAttribute("spellcheck")).toBe("false");
            expect(textarea.required).toBe(true);
            expect(textarea.getAttribute("aria-label")).toBe("Notes");
            expect(textarea.getAttribute("aria-describedby")).toBe("notes-hint");
            expect(textarea.dataset.testid).toBe("notes-field");
            expect(textarea.style.maxWidth).toBe("400px");
            expect(textarea.classList.contains("cs-text-area")).toBe(true);
            expect(textarea.classList.contains("custom-textarea")).toBe(true);
            expect(label.control).toBe(textarea);

            unmount(instance);
            label.remove();
        });

        test("forwards attachments via {...rest} directly to <textarea> and cleans up on unmount", () => {
            const cleanup = vi.fn();
            const attachment = vi.fn((node: HTMLTextAreaElement) => {
                expect(node).toBeInstanceOf(HTMLTextAreaElement);
                node.dataset.attached = "true";
                return cleanup;
            });

            const instance = mount(TextArea, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    [createAttachmentKey()]: attachment,
                },
            });
            flushSync();

            const textarea = getTextArea();
            expect(attachment).toHaveBeenCalledTimes(1);
            expect(attachment).toHaveBeenCalledWith(textarea);
            expect(textarea.dataset.attached).toBe("true");
            expect(cleanup).not.toHaveBeenCalled();

            unmount(instance);
            expect(cleanup).toHaveBeenCalledTimes(1);
        });
    });
});
