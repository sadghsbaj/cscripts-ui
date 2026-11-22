import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorFormatSelectTestHost from "./ColorFormatSelectTestHost.internal.svelte";
import {
    COLOR_FORMAT_SELECT_DEFAULTS,
    COLOR_FORMAT_SELECT_SIZES,
    COLOR_FORMAT_SELECT_VARIANTS,
    type ColorFormat,
    type ColorFormatSelectSize,
    type ColorFormatSelectVariant,
} from "./index.ts";

function dispatchToggleEvent(element: HTMLElement, newState: "open" | "closed", oldState: "open" | "closed"): void {
    const event = new Event("toggle");
    Object.assign(event, { newState, oldState });
    element.dispatchEvent(event);
}

function restorePrototypeProperty(target: object, key: string, descriptor: PropertyDescriptor | undefined): void {
    if (descriptor) {
        Object.defineProperty(target, key, descriptor);
    } else {
        Reflect.deleteProperty(target, key);
    }
}

/* eslint-disable unicorn/no-this-outside-of-class -- HTMLElement.prototype polyfill methods require dynamic `this` binding */
function installPopoverPolyfill(
    openPopovers: WeakSet<HTMLElement>,
    baseMatches: typeof HTMLElement.prototype.matches
): void {
    Object.defineProperties(HTMLElement.prototype, {
        matches: {
            configurable: true,
            writable: true,
            value(this: HTMLElement, selector: string): boolean {
                if (selector === ":popover-open") {
                    return openPopovers.has(this);
                }
                return baseMatches.call(this, selector);
            },
        },
        showPopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement): void {
                if (openPopovers.has(this)) return;
                openPopovers.add(this);
                dispatchToggleEvent(this, "open", "closed");
            },
        },
        hidePopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement): void {
                if (!openPopovers.has(this)) return;
                openPopovers.delete(this);
                dispatchToggleEvent(this, "closed", "open");
            },
        },
        togglePopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement, options?: boolean | { source?: HTMLElement; force?: boolean }): boolean {
                const force = typeof options === "boolean" ? options : options?.force;
                const next = typeof force === "boolean" ? force : !openPopovers.has(this);
                if (next) {
                    (this as HTMLElement & { showPopover: () => void }).showPopover();
                } else {
                    (this as HTMLElement & { hidePopover: () => void }).hidePopover();
                }
                return next;
            },
        },
    });
}
/* eslint-enable unicorn/no-this-outside-of-class */

function dispatchClick(target: EventTarget): MouseEvent {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

function dispatchKeyDown(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function requireTrigger(root: ParentNode): HTMLButtonElement {
    return requireElement<HTMLButtonElement>(root, "button.cs-color-format-select-trigger");
}

function requireValueElement(root: ParentNode): HTMLSpanElement {
    return requireElement<HTMLSpanElement>(root, "span.cs-select-trigger-value");
}

function requireContent(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-select-content");
}

function getItems(root: ParentNode): HTMLDivElement[] {
    return [...root.querySelectorAll<HTMLDivElement>("div.cs-select-item")];
}

function requireItem(root: ParentNode, value: ColorFormat): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, `div.cs-select-item[data-value="${CSS.escape(value)}"]`);
}

function getHiddenInput(root: ParentNode): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('input[type="hidden"]');
}

describe("ColorFormatSelect Svelte 5 Component", () => {
    let container: HTMLDivElement;
    let openPopovers: WeakSet<HTMLElement>;
    let originalMatchesDescriptor: PropertyDescriptor | undefined;
    let originalShowPopoverDescriptor: PropertyDescriptor | undefined;
    let originalHidePopoverDescriptor: PropertyDescriptor | undefined;
    let originalTogglePopoverDescriptor: PropertyDescriptor | undefined;
    let originalScrollIntoViewDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        openPopovers = new WeakSet<HTMLElement>();
        originalMatchesDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "matches");
        originalShowPopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover");
        originalHidePopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidePopover");
        originalTogglePopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "togglePopover");
        originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

        const baseMatches = HTMLElement.prototype.matches;
        installPopoverPolyfill(openPopovers, baseMatches);

        if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
            Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
                configurable: true,
                writable: true,
                value(): void {},
            });
        }

        container = document.createElement("div");
        container.addEventListener("click", (event: MouseEvent): void => {
            if (event.defaultPrevented || !(event.target instanceof Element)) return;
            const button = event.target.closest<HTMLButtonElement>("button[popovertarget]");
            if (!button || button.disabled) return;
            const targetId = button.getAttribute("popovertarget");
            if (!targetId) return;
            const targetEl = document.getElementById(targetId) as
                | (HTMLElement & { togglePopover?: (options?: { source?: HTMLElement }) => boolean })
                | null;
            if (!targetEl || !targetEl.hasAttribute("popover") || typeof targetEl.togglePopover !== "function") return;
            targetEl.togglePopover({ source: button });
        });
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        restorePrototypeProperty(HTMLElement.prototype, "matches", originalMatchesDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "showPopover", originalShowPopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "hidePopover", originalHidePopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "togglePopover", originalTogglePopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoViewDescriptor);
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("Rendering, variants, sizes & Select composition", () => {
        test("exports canonical defaults, variants, and sizes", () => {
            expect(COLOR_FORMAT_SELECT_VARIANTS).toEqual(["soft", "elevated"]);
            expect(COLOR_FORMAT_SELECT_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
            expect(COLOR_FORMAT_SELECT_DEFAULTS).toEqual(["hex", "rgb", "hsl", "oklch"]);
        });

        test("forwards variants, sizes xs-xl, bind:ref, id, class, and rest attributes", () => {
            const state = $state<{
                variant: ColorFormatSelectVariant;
                size: ColorFormatSelectSize;
                ref: HTMLButtonElement | null;
            }>({
                variant: "soft",
                size: "xs",
                ref: null,
            });

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    get ref() {
                        return state.ref;
                    },
                    set ref(next) {
                        state.ref = next;
                    },
                    id: "custom-format-select",
                    className: "custom-format-class",
                    triggerAttrs: {
                        "data-testid": "format-trigger",
                        title: "Choose color format",
                    },
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            expect(state.ref).toBe(trigger);
            expect(trigger).toBeInstanceOf(HTMLButtonElement);
            expect(trigger.id).toBe("custom-format-select");
            expect(trigger.classList.contains("cs-select-trigger")).toBe(true);
            expect(trigger.classList.contains("cs-color-format-select-trigger")).toBe(true);
            expect(trigger.classList.contains("custom-format-class")).toBe(true);
            expect(trigger.dataset.testid).toBe("format-trigger");
            expect(trigger.getAttribute("title")).toBe("Choose color format");

            for (const variant of COLOR_FORMAT_SELECT_VARIANTS) {
                state.variant = variant;
                flushSync();
                expect(trigger.dataset.variant).toBe(variant);
            }

            for (const size of COLOR_FORMAT_SELECT_SIZES) {
                state.size = size;
                flushSync();
                expect(trigger.dataset.size).toBe(size);
            }

            unmount(instance);
        });

        test("forwards disabled, invalid, required, and name hidden input", () => {
            const state = $state({
                disabled: false,
                invalid: false,
                required: false,
                value: "rgb" as ColorFormat,
            });
            const onOpenChange = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    bindMode: "bind",
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        if (next !== undefined) {
                            state.value = next;
                        }
                    },
                    get disabled() {
                        return state.disabled;
                    },
                    get invalid() {
                        return state.invalid;
                    },
                    get required() {
                        return state.required;
                    },
                    name: "color_format",
                    onOpenChange,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const hiddenInput = getHiddenInput(container);
            expect(hiddenInput).not.toBeNull();
            expect(hiddenInput?.getAttribute("name")).toBe("color_format");
            expect(hiddenInput?.value).toBe("rgb");
            expect(hiddenInput?.disabled).toBe(false);
            expect(trigger.disabled).toBe(false);
            expect("disabled" in trigger.dataset).toBe(false);
            expect("invalid" in trigger.dataset).toBe(false);
            expect(trigger.getAttribute("aria-required")).toBeNull();

            state.invalid = true;
            state.required = true;
            flushSync();
            expect("invalid" in trigger.dataset).toBe(true);
            expect(trigger.getAttribute("aria-invalid")).toBe("true");
            expect(trigger.getAttribute("aria-required")).toBe("true");

            state.disabled = true;
            flushSync();
            expect(trigger.disabled).toBe(true);
            expect("disabled" in trigger.dataset).toBe(true);
            expect(hiddenInput?.disabled).toBe(true);

            dispatchClick(trigger);
            expect(onOpenChange).not.toHaveBeenCalled();
            expect(requireContent(container).matches(":popover-open")).toBe(false);

            unmount(instance);
        });

        test("renders default formats with canonical labels", () => {
            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
            });
            flushSync();

            const items = getItems(container);
            expect(items.map((item) => item.dataset.value)).toEqual(["hex", "rgb", "hsl", "oklch"]);
            expect(items.map((item) => item.dataset.label)).toEqual(["Hex", "RGB", "HSL", "OKLCH"]);
            expect(requireValueElement(container).textContent?.trim()).toBe("Hex");

            unmount(instance);
        });

        test("supports custom formats (auto, hex8, p3), deduplicates entries, and falls back on empty array", () => {
            const state = $state<{ formats: readonly ColorFormat[] }>({
                formats: ["auto", "hex8", "p3", "hex8", "auto", "rgb"],
            });

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    get formats() {
                        return state.formats;
                    },
                },
            });
            flushSync();

            let items = getItems(container);
            expect(items.map((item) => item.dataset.value)).toEqual(["auto", "hex8", "p3", "rgb"]);
            expect(items.map((item) => item.dataset.label)).toEqual(["Auto", "Hex8", "P3", "RGB"]);
            expect(requireValueElement(container).textContent?.trim()).toBe("Auto");

            state.formats = [];
            flushSync();

            items = getItems(container);
            expect(items.map((item) => item.dataset.value)).toEqual(["hex", "rgb", "hsl", "oklch"]);
            expect(items.map((item) => item.dataset.label)).toEqual(["Hex", "RGB", "HSL", "OKLCH"]);
            expect(requireValueElement(container).textContent?.trim()).toBe("Hex");

            unmount(instance);
        });

        test("resolves accessible naming precedence: label > aria-label > aria-labelledby > localized default", () => {
            const state = $state<{
                label?: string;
                ariaLabel?: string;
                ariaLabelledBy?: string;
            }>({});

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    get label() {
                        return state.label;
                    },
                    get ariaLabel() {
                        return state.ariaLabel;
                    },
                    get ariaLabelledBy() {
                        return state.ariaLabelledBy;
                    },
                    externalLabelText: "Output format",
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            expect(trigger.getAttribute("aria-label")).toBe("Color format");
            expect(trigger.getAttribute("aria-labelledby")).toBeNull();

            state.ariaLabelledBy = "ext-format-label";
            flushSync();
            expect(trigger.getAttribute("aria-labelledby")).toBe("ext-format-label");
            expect(trigger.getAttribute("aria-label")).toBeNull();

            state.ariaLabel = "Custom ARIA format";
            flushSync();
            expect(trigger.getAttribute("aria-label")).toBe("Custom ARIA format");
            expect(trigger.getAttribute("aria-labelledby")).toBe("ext-format-label");

            state.label = "Explicit label prop";
            flushSync();
            expect(trigger.getAttribute("aria-label")).toBe("Explicit label prop");

            unmount(instance);
        });
    });

    describe("Interaction (open, bind:value, uncontrolled, strict controlled)", () => {
        test("opens on click, selects format, closes popover, updates bind:value, hidden input, and fires callbacks", () => {
            const state = $state<{
                value: ColorFormat;
                open: boolean;
            }>({
                value: "hex",
                open: false,
            });
            const onValueChange = vi.fn();
            const onOpenChange = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    bindMode: "bind",
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        if (next !== undefined) {
                            state.value = next;
                        }
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    name: "format",
                    onValueChange,
                    onOpenChange,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const hiddenInput = getHiddenInput(container);

            expect(state.open).toBe(false);
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect(requireValueElement(container).textContent?.trim()).toBe("Hex");
            expect(hiddenInput?.value).toBe("hex");

            dispatchClick(trigger);
            expect(state.open).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);
            expect(trigger.getAttribute("aria-expanded")).toBe("true");
            expect(content.matches(":popover-open")).toBe(true);

            dispatchClick(requireItem(container, "oklch"));
            expect(state.value).toBe("oklch");
            expect(state.open).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("oklch");
            expect(onOpenChange).toHaveBeenCalledTimes(2);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);
            expect(requireValueElement(container).textContent?.trim()).toBe("OKLCH");
            expect(hiddenInput?.value).toBe("oklch");
            expect(content.matches(":popover-open")).toBe(false);

            // Cross-interaction: programmatic value update then user click selection
            state.value = "hsl";
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("HSL");
            expect(hiddenInput?.value).toBe("hsl");

            dispatchClick(trigger);
            expect(state.open).toBe(true);
            dispatchClick(requireItem(container, "rgb"));
            expect(state.value).toBe("rgb");
            expect(state.open).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("rgb");
            expect(requireValueElement(container).textContent?.trim()).toBe("RGB");
            expect(hiddenInput?.value).toBe("rgb");

            unmount(instance);
        });

        test("works in uncontrolled mode without value prop", () => {
            const onValueChange = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    bindMode: "none",
                    formats: ["rgb", "hsl", "oklch"],
                    name: "uncontrolled_format",
                    onValueChange,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const hiddenInput = getHiddenInput(container);

            expect(requireValueElement(container).textContent?.trim()).toBe("RGB");
            expect(hiddenInput?.value).toBe("rgb");

            dispatchClick(trigger);
            dispatchClick(requireItem(container, "oklch"));
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("oklch");
            expect(requireValueElement(container).textContent?.trim()).toBe("OKLCH");
            expect(hiddenInput?.value).toBe("oklch");

            dispatchClick(trigger);
            dispatchClick(requireItem(container, "hsl"));
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("hsl");
            expect(requireValueElement(container).textContent?.trim()).toBe("HSL");
            expect(hiddenInput?.value).toBe("hsl");

            unmount(instance);
        });

        test("supports strict controlled value and programmatic open/Escape closing", () => {
            const state = $state<{
                strictValue: ColorFormat;
                open: boolean;
            }>({
                strictValue: "hex",
                open: false,
            });
            const onValueChange = vi.fn();
            const onOpenChange = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    bindMode: "strict",
                    get strictValue() {
                        return state.strictValue;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    onValueChange,
                    onOpenChange,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            const content = requireContent(container);

            // Programmatic open & close
            state.open = true;
            flushSync();
            expect(content.matches(":popover-open")).toBe(true);

            state.open = false;
            flushSync();
            expect(content.matches(":popover-open")).toBe(false);

            // Reopen and press Escape on trigger to close
            dispatchClick(trigger);
            expect(state.open).toBe(true);
            dispatchKeyDown(trigger, "Escape");
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);

            // Selecting in strict mode calls onValueChange without mutating parent strictValue
            dispatchClick(requireTrigger(container));
            dispatchClick(requireItem(container, "hsl"));
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("hsl");
            expect(state.strictValue).toBe("hex");
            expect(requireValueElement(container).textContent?.trim()).toBe("Hex");

            state.strictValue = "hsl";
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("HSL");

            unmount(instance);
        });
    });

    describe("ColorPickerContext integration", () => {
        test("reads pickerCtx.format reactively and calls pickerCtx.setFormat on selection", () => {
            const state = $state<{
                pickerFormat: ColorFormat;
            }>({
                pickerFormat: "rgb",
            });
            const onPickerSetFormat = vi.fn();
            const onValueChange = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    withPicker: true,
                    bindMode: "none",
                    get pickerFormat() {
                        return state.pickerFormat;
                    },
                    set pickerFormat(next) {
                        state.pickerFormat = next;
                    },
                    onPickerSetFormat,
                    onValueChange,
                },
            });
            flushSync();

            expect(requireValueElement(container).textContent?.trim()).toBe("RGB");
            expect(requireItem(container, "rgb").getAttribute("aria-selected")).toBe("true");

            // External update to pickerCtx.format syncs to trigger display
            state.pickerFormat = "hsl";
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("HSL");

            // User selection calls pickerCtx.setFormat and updates pickerFormat
            dispatchClick(requireTrigger(container));
            dispatchClick(requireItem(container, "oklch"));

            expect(onPickerSetFormat).toHaveBeenCalledTimes(1);
            expect(onPickerSetFormat).toHaveBeenLastCalledWith("oklch");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("oklch");
            expect(state.pickerFormat).toBe("oklch");
            expect(requireValueElement(container).textContent?.trim()).toBe("OKLCH");

            unmount(instance);
        });

        test("resolves pickerCtx.format='auto' fallback to 'hex' or formats[0] when 'auto' is absent, and shows 'Auto' when present", () => {
            const state = $state<{
                pickerFormat: ColorFormat;
                formats: readonly ColorFormat[];
            }>({
                pickerFormat: "auto",
                formats: ["rgb", "hex", "hsl"],
            });

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    withPicker: true,
                    bindMode: "none",
                    get pickerFormat() {
                        return state.pickerFormat;
                    },
                    set pickerFormat(next) {
                        state.pickerFormat = next;
                    },
                    get formats() {
                        return state.formats;
                    },
                },
            });
            flushSync();

            // "auto" absent, "hex" present -> falls back to "hex"
            expect(requireValueElement(container).textContent?.trim()).toBe("Hex");

            // "auto" absent, "hex" absent -> falls back to formats[0] ("rgb")
            state.formats = ["rgb", "hsl", "oklch"];
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("RGB");

            // "auto" present -> displays "Auto"
            state.formats = ["auto", "rgb", "hsl"];
            flushSync();
            expect(requireValueElement(container).textContent?.trim()).toBe("Auto");

            unmount(instance);
        });

        test("respects pickerCtx.disabled and pickerCtx.invalid, while remaining interactive when pickerCtx.readonly is true", () => {
            const state = $state({
                pickerFormat: "hex" as ColorFormat,
                pickerDisabled: false,
                pickerInvalid: false,
                pickerReadonly: true,
            });
            const onPickerSetFormat = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    withPicker: true,
                    bindMode: "none",
                    get pickerFormat() {
                        return state.pickerFormat;
                    },
                    set pickerFormat(next) {
                        state.pickerFormat = next;
                    },
                    get pickerDisabled() {
                        return state.pickerDisabled;
                    },
                    get pickerInvalid() {
                        return state.pickerInvalid;
                    },
                    get pickerReadonly() {
                        return state.pickerReadonly;
                    },
                    onPickerSetFormat,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);

            // pickerCtx.readonly = true must NOT disable format switching
            expect(trigger.disabled).toBe(false);
            expect("disabled" in trigger.dataset).toBe(false);
            dispatchClick(trigger);
            expect(requireContent(container).matches(":popover-open")).toBe(true);
            dispatchClick(requireItem(container, "rgb"));
            expect(onPickerSetFormat).toHaveBeenCalledTimes(1);
            expect(onPickerSetFormat).toHaveBeenLastCalledWith("rgb");
            expect(state.pickerFormat).toBe("rgb");
            expect(requireValueElement(container).textContent?.trim()).toBe("RGB");

            // pickerCtx.invalid propagates
            state.pickerInvalid = true;
            flushSync();
            expect("invalid" in trigger.dataset).toBe(true);
            expect(trigger.getAttribute("aria-invalid")).toBe("true");

            // pickerCtx.disabled propagates and blocks opening
            state.pickerDisabled = true;
            flushSync();
            expect(trigger.disabled).toBe(true);
            expect("disabled" in trigger.dataset).toBe(true);
            dispatchClick(trigger);
            expect(requireContent(container).matches(":popover-open")).toBe(false);

            unmount(instance);
        });

        test("explicit value prop overrides pickerCtx.format and syncs both on selection", () => {
            const state = $state<{
                value: ColorFormat;
                pickerFormat: ColorFormat;
            }>({
                value: "oklch",
                pickerFormat: "hex",
            });
            const onPickerSetFormat = vi.fn();

            const instance = mount(ColorFormatSelectTestHost, {
                target: container,
                props: {
                    withPicker: true,
                    bindMode: "bind",
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        if (next !== undefined) {
                            state.value = next;
                        }
                    },
                    get pickerFormat() {
                        return state.pickerFormat;
                    },
                    set pickerFormat(next) {
                        state.pickerFormat = next;
                    },
                    onPickerSetFormat,
                },
            });
            flushSync();

            expect(requireValueElement(container).textContent?.trim()).toBe("OKLCH");

            dispatchClick(requireTrigger(container));
            dispatchClick(requireItem(container, "hsl"));

            expect(state.value).toBe("hsl");
            expect(state.pickerFormat).toBe("hsl");
            expect(onPickerSetFormat).toHaveBeenCalledWith("hsl");
            expect(requireValueElement(container).textContent?.trim()).toBe("HSL");

            unmount(instance);
        });
    });
});
