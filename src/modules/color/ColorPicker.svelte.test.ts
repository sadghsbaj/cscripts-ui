import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorPickerTestHost from "./ColorPickerTestHost.internal.svelte";
import {
    COLOR_PICKER_SPACES,
    isInGamut,
    type ColorAlphaFormat,
    type ColorFormat,
    type ColorGamut,
    type ColorPickerSpace,
} from "./index.ts";

interface EyeDropperResultMock {
    sRGBHex: string;
}

interface EyeDropperInstanceMock {
    open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResultMock>;
}

type EyeDropperConstructorMock = new () => EyeDropperInstanceMock;

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

function setInputAndCommit(input: HTMLInputElement, nextValue: string): void {
    input.focus();
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
    dispatchKeyDown(input, "Enter");
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function requirePickerRoot(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-color-picker");
}

function requireProbe(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, '[data-testid="ctx-probe"]');
}

function requireFullColorInput(root: ParentNode): HTMLInputElement {
    return requireElement<HTMLInputElement>(root, '.cs-color-input[data-mode="full"] input');
}

function requireAlphaColorInput(root: ParentNode): HTMLInputElement {
    return requireElement<HTMLInputElement>(root, '.cs-color-input[data-channel="alpha"] input');
}

function requireFormatTrigger(root: ParentNode): HTMLButtonElement {
    return requireElement<HTMLButtonElement>(root, "button.cs-color-format-select-trigger");
}

function selectFormatOption(root: ParentNode, format: ColorFormat): void {
    const trigger = requireFormatTrigger(root);
    dispatchClick(trigger);
    const option = requireElement<HTMLElement>(root, `[role="option"][data-value="${CSS.escape(format)}"]`);
    dispatchClick(option);
}

describe("ColorPicker Svelte 5 Component", () => {
    let container: HTMLDivElement;
    let baseMatches: typeof HTMLElement.prototype.matches;
    let originalDescriptors: Record<string, PropertyDescriptor | undefined>;
    let originalEyeDropper: unknown;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);

        baseMatches = HTMLElement.prototype.matches;
        originalDescriptors = {
            matches: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "matches"),
            showPopover: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover"),
            hidePopover: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidePopover"),
            togglePopover: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "togglePopover"),
        };
        installPopoverPolyfill(new WeakSet<HTMLElement>(), baseMatches);

        originalEyeDropper = Reflect.get(window, "EyeDropper");
        const eyeDropperMock: EyeDropperConstructorMock = class {
            open(): Promise<EyeDropperResultMock> {
                return Promise.resolve({ sRGBHex: "#3b82f6" });
            }
        };
        Object.defineProperty(window, "EyeDropper", {
            configurable: true,
            writable: true,
            value: eyeDropperMock,
        });
    });

    afterEach(() => {
        for (const [key, descriptor] of Object.entries(originalDescriptors)) {
            restorePrototypeProperty(HTMLElement.prototype, key, descriptor);
        }
        if (originalEyeDropper === undefined) {
            Reflect.deleteProperty(window, "EyeDropper");
        } else {
            Object.defineProperty(window, "EyeDropper", {
                configurable: true,
                writable: true,
                value: originalEyeDropper,
            });
        }
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders group semantics, data attributes, bind:ref, class, rest props, and children(ctx)", () => {
        expect(COLOR_PICKER_SPACES).toEqual(["hsv", "hsl", "oklch"]);

        const state = $state<{
            ref: HTMLDivElement | null;
            space: ColorPickerSpace;
            disabled: boolean;
            readonly: boolean;
            invalid: boolean;
        }>({
            ref: null,
            space: "hsv",
            disabled: false,
            readonly: false,
            invalid: false,
        });

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                get ref() {
                    return state.ref;
                },
                set ref(next) {
                    state.ref = next;
                },
                get space() {
                    return state.space;
                },
                get disabled() {
                    return state.disabled;
                },
                get readonly() {
                    return state.readonly;
                },
                get invalid() {
                    return state.invalid;
                },
                className: "custom-picker",
                pickerAttrs: {
                    id: "main-picker",
                    "data-custom": "picker-tag",
                },
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const probe = requireProbe(container);

        expect(state.ref).toBe(picker);
        expect(picker.getAttribute("role")).toBe("group");
        expect(picker.classList.contains("cs-color-picker")).toBe(true);
        expect(picker.classList.contains("custom-picker")).toBe(true);
        expect(picker.id).toBe("main-picker");
        expect(picker.dataset.custom).toBe("picker-tag");
        expect(picker.dataset.space).toBe("hsv");
        expect(picker.dataset.format).toBe("auto");
        expect(picker.dataset.disabled).toBeUndefined();
        expect(picker.dataset.readonly).toBeUndefined();
        expect(picker.dataset.invalid).toBeUndefined();
        expect(picker.getAttribute("aria-disabled")).toBeNull();
        expect(picker.getAttribute("aria-label")).toBe("Color picker");

        expect(probe.dataset.value).toBe("#3b82f6");
        expect(probe.dataset.format).toBe("auto");
        expect(probe.dataset.space).toBe("hsv");
        expect(probe.dataset.disabled).toBe("false");
        expect(probe.dataset.readonly).toBe("false");
        expect(probe.dataset.invalid).toBe("false");
        expect(probe.dataset.hasSetFormat).toBe("true");

        state.space = "oklch";
        state.disabled = true;
        state.readonly = true;
        state.invalid = true;
        flushSync();

        expect(picker.dataset.space).toBe("oklch");
        expect(picker.dataset.disabled).toBe("");
        expect(picker.dataset.readonly).toBe("");
        expect(picker.dataset.invalid).toBe("");
        expect(picker.getAttribute("aria-disabled")).toBe("true");
        expect(probe.dataset.space).toBe("oklch");
        expect(probe.dataset.disabled).toBe("true");
        expect(probe.dataset.readonly).toBe("true");
        expect(probe.dataset.invalid).toBe("true");

        unmount(instance);
    });

    test("resolves accessible group name precedence: label > aria-label > aria-labelledby > default", () => {
        const state = $state<{
            label: string | undefined;
            ariaLabel: string | undefined;
            ariaLabelledBy: string | undefined;
        }>({
            label: "Primary accent",
            ariaLabel: "Fallback aria label",
            ariaLabelledBy: "ext-picker-label",
        });

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                withChildren: false,
                get label() {
                    return state.label;
                },
                get ariaLabel() {
                    return state.ariaLabel;
                },
                get ariaLabelledBy() {
                    return state.ariaLabelledBy;
                },
                externalLabelText: "External Picker Label",
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        expect(picker.getAttribute("aria-label")).toBe("Primary accent");
        expect(picker.getAttribute("aria-labelledby")).toBe("ext-picker-label");

        state.label = undefined;
        flushSync();
        expect(picker.getAttribute("aria-label")).toBe("Fallback aria label");
        expect(picker.getAttribute("aria-labelledby")).toBe("ext-picker-label");

        state.ariaLabel = undefined;
        flushSync();
        expect(picker.getAttribute("aria-label")).toBeNull();
        expect(picker.getAttribute("aria-labelledby")).toBe("ext-picker-label");

        state.ariaLabelledBy = undefined;
        flushSync();
        expect(picker.getAttribute("aria-label")).toBe("Color picker");
        expect(picker.getAttribute("aria-labelledby")).toBeNull();

        unmount(instance);
    });

    test("supports uncontrolled defaultValue and defaultFormat", () => {
        const onValueChange = vi.fn();
        const onCommit = vi.fn();
        const onFormatChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                bindMode: "none",
                defaultValue: "rgb(255, 0, 0)",
                defaultFormat: "rgb",
                onValueChange,
                onCommit,
                onFormatChange,
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const probe = requireProbe(container);
        const fullInput = requireFullColorInput(container);

        expect(picker.dataset.format).toBe("rgb");
        expect(probe.dataset.format).toBe("rgb");
        expect(probe.dataset.value).toBe("rgb(255 0 0)");
        expect(fullInput.value).toBe("rgb(255 0 0)");
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();
        expect(onFormatChange).not.toHaveBeenCalled();

        selectFormatOption(container, "hsl");

        expect(picker.dataset.format).toBe("hsl");
        expect(probe.dataset.format).toBe("hsl");
        expect(fullInput.value).toBe("hsl(0 100% 50%)");
        expect(onFormatChange).toHaveBeenCalledTimes(1);
        expect(onFormatChange).toHaveBeenLastCalledWith("hsl");

        unmount(instance);
    });

    test("supports controlled bind:value, onValueChange, onCommit, bind:format, and onFormatChange", () => {
        const state = $state<{
            value: string | undefined;
            format: ColorFormat | undefined;
        }>({
            value: "#ef4444",
            format: "hex",
        });

        const onValueChange = vi.fn();
        const onCommit = vi.fn();
        const onFormatChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
                get format() {
                    return state.format;
                },
                set format(next) {
                    state.format = next;
                },
                onValueChange,
                onCommit,
                onFormatChange,
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const fullInput = requireFullColorInput(container);

        expect(picker.dataset.format).toBe("hex");
        expect(fullInput.value).toBe("ef4444");

        // Format switch via ColorFormatSelect updates bind:format, data-format, and ColorInput
        selectFormatOption(container, "rgb");
        expect(state.format).toBe("rgb");
        expect(picker.dataset.format).toBe("rgb");
        expect(onFormatChange).toHaveBeenCalledWith("rgb");
        expect(fullInput.value).toBe("rgb(239 68 68)");

        // External format update syncs back down
        state.format = "hex";
        flushSync();
        expect(picker.dataset.format).toBe("hex");
        expect(fullInput.value).toBe("ef4444");

        // Child mutation updates bind:value + callbacks
        setInputAndCommit(fullInput, "#22c55e");
        fullInput.blur();
        flushSync();
        expect(state.value).toBe("#22c55e");
        expect(onValueChange).toHaveBeenCalledWith("#22c55e");
        expect(onCommit).toHaveBeenCalledWith("#22c55e");

        // External value update syncs down to children
        state.value = "#3b82f6";
        flushSync();
        expect(fullInput.value).toBe("3b82f6");
        expect(requireProbe(container).dataset.value).toBe("#3b82f6");

        unmount(instance);
    });

    test("respects strict controlled bind:value and bind:format without detaching", () => {
        const state = $state({
            strictValue: "#ef4444",
            strictFormat: "hex" as ColorFormat,
        });

        const onValueChange = vi.fn();
        const onCommit = vi.fn();
        const onFormatChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                bindMode: "strict",
                get strictValue() {
                    return state.strictValue;
                },
                get strictFormat() {
                    return state.strictFormat;
                },
                onValueChange,
                onCommit,
                onFormatChange,
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const fullInput = requireFullColorInput(container);

        setInputAndCommit(fullInput, "#22c55e");
        fullInput.blur();
        flushSync();
        expect(onValueChange).toHaveBeenCalledWith("#22c55e");
        expect(onCommit).toHaveBeenCalledWith("#22c55e");
        expect(requireProbe(container).dataset.value).toBe("#ef4444");
        expect(fullInput.value).toBe("ef4444");

        selectFormatOption(container, "hsl");
        expect(onFormatChange).toHaveBeenCalledWith("hsl");
        expect(picker.dataset.format).toBe("hex");
        expect(fullInput.value).toBe("ef4444");

        unmount(instance);
    });

    test("synchronizes ColorArea, ColorSlider, ColorInput, ColorFormatSelect, ColorSwatch, ColorSwatchGroup, and ColorEyeDropper end-to-end", async () => {
        const state = $state<{
            value: string | undefined;
            format: ColorFormat | undefined;
        }>({
            value: "#3b82f6",
            format: "hex",
        });

        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return state.value;
                },
                set value(next) {
                    state.value = next;
                },
                get format() {
                    return state.format;
                },
                set format(next) {
                    state.format = next;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const areaThumb = requireElement<HTMLElement>(container, ".cs-color-area-thumb");
        const hueThumb = requireElement<HTMLElement>(
            container,
            '.cs-color-slider[data-channel="hue"] .cs-color-slider-thumb'
        );
        const alphaThumb = requireElement<HTMLElement>(
            container,
            '.cs-color-slider[data-channel="alpha"] .cs-color-slider-thumb'
        );
        const fullInput = requireFullColorInput(container);
        const alphaInput = requireAlphaColorInput(container);
        const activeSwatch = requireElement<HTMLElement>(container, '.cs-color-swatch[aria-label="Active color"]');
        const redSwatch = requireElement<HTMLButtonElement>(container, '.cs-color-swatch[aria-label="Red"]');
        const greenSwatch = requireElement<HTMLButtonElement>(container, '.cs-color-swatch[aria-label="Green"]');
        const blueSwatch = requireElement<HTMLButtonElement>(container, '.cs-color-swatch[aria-label="Blue"]');
        const eyeDropper = requireElement<HTMLButtonElement>(container, "button.cs-color-eye-dropper");

        expect(blueSwatch.getAttribute("aria-checked")).toBe("true");
        expect(redSwatch.getAttribute("aria-checked")).toBe("false");
        expect(activeSwatch.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#3b82f6");

        // 1. SwatchGroup click -> syncs all siblings
        dispatchClick(redSwatch);
        expect(state.value).toBe("#ef4444");
        expect(redSwatch.getAttribute("aria-checked")).toBe("true");
        expect(blueSwatch.getAttribute("aria-checked")).toBe("false");
        expect(fullInput.value).toBe("ef4444");
        expect(activeSwatch.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#ef4444");
        expect(hueThumb.getAttribute("aria-valuenow")).toBe("0");

        // 2. ColorSlider (alpha) keyboard step -> syncs alpha ColorInput and full ColorInput
        expect(alphaInput.value).toBe("100%");
        dispatchKeyDown(alphaThumb, "ArrowLeft");
        expect(Number(alphaThumb.getAttribute("aria-valuenow"))).toBeLessThan(100);
        expect(alphaInput.value).toBe("99%");
        expect(fullInput.value).toBe("ef4444fc");
        expect(state.value).toBe("#ef4444fc");

        // 3. ColorInput commit -> syncs SwatchGroup, ColorSlider, ColorArea, ColorSwatch
        setInputAndCommit(fullInput, "#22c55e");
        fullInput.blur();
        flushSync();
        expect(state.value).toBe("#22c55e");
        expect(greenSwatch.getAttribute("aria-checked")).toBe("true");
        expect(redSwatch.getAttribute("aria-checked")).toBe("false");
        expect(activeSwatch.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#22c55e");
        expect(alphaInput.value).toBe("100%");
        expect(Number(hueThumb.getAttribute("aria-valuenow"))).toBeGreaterThan(100);
        expect(areaThumb.getAttribute("aria-valuenow")).not.toBeNull();

        // 4. ColorArea keyboard step -> syncs ColorInput & state
        const beforeAreaX = areaThumb.getAttribute("aria-valuenow");
        dispatchKeyDown(areaThumb, "ArrowLeft");
        expect(areaThumb.getAttribute("aria-valuenow")).not.toBe(beforeAreaX);
        expect(state.value).not.toBe("#22c55e");

        // 5. ColorEyeDropper pick -> syncs back to Blue (#3b82f6)
        dispatchClick(eyeDropper);
        await Promise.resolve();
        await Promise.resolve();
        flushSync();

        expect(state.value).toBe("#3b82f6");
        expect(blueSwatch.getAttribute("aria-checked")).toBe("true");
        expect(fullInput.value).toBe("3b82f6");
        expect(activeSwatch.style.getPropertyValue("--cs-color-swatch-bg")).toBe("#3b82f6");
        expect(onValueChange).toHaveBeenLastCalledWith("#3b82f6");
        expect(onCommit).toHaveBeenLastCalledWith("#3b82f6");

        unmount(instance);
    });

    test("blocks all color and format mutations when disabled", async () => {
        const onValueChange = vi.fn();
        const onCommit = vi.fn();
        const onFormatChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                defaultValue: "#3b82f6",
                defaultFormat: "hex",
                disabled: true,
                onValueChange,
                onCommit,
                onFormatChange,
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const area = requireElement<HTMLElement>(container, ".cs-color-area");
        const areaThumb = requireElement<HTMLElement>(container, ".cs-color-area-thumb");
        const hueSlider = requireElement<HTMLElement>(container, '.cs-color-slider[data-channel="hue"]');
        const hueThumb = requireElement<HTMLElement>(
            container,
            '.cs-color-slider[data-channel="hue"] .cs-color-slider-thumb'
        );
        const fullInput = requireFullColorInput(container);
        const formatTrigger = requireFormatTrigger(container);
        const swatchGroup = requireElement<HTMLElement>(container, ".cs-color-swatch-group");
        const redSwatch = requireElement<HTMLButtonElement>(container, '.cs-color-swatch[aria-label="Red"]');
        const eyeDropper = requireElement<HTMLButtonElement>(container, "button.cs-color-eye-dropper");

        expect(picker.dataset.disabled).toBe("");
        expect(picker.getAttribute("aria-disabled")).toBe("true");
        expect(area.dataset.disabled).toBe("");
        expect(hueSlider.dataset.disabled).toBe("");
        expect(fullInput.disabled).toBe(true);
        expect(formatTrigger.disabled).toBe(true);
        expect(swatchGroup.dataset.disabled).toBe("");
        expect(eyeDropper.disabled).toBe(true);

        dispatchKeyDown(areaThumb, "ArrowLeft");
        dispatchKeyDown(hueThumb, "ArrowRight");
        setInputAndCommit(fullInput, "#ef4444");
        dispatchClick(redSwatch);
        dispatchClick(formatTrigger);
        dispatchClick(eyeDropper);
        await Promise.resolve();
        flushSync();

        expect(requireProbe(container).dataset.value).toBe("#3b82f6");
        expect(requireProbe(container).dataset.format).toBe("hex");
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();
        expect(onFormatChange).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("blocks color mutations when readonly while keeping ColorFormatSelect interactive", async () => {
        const onValueChange = vi.fn();
        const onCommit = vi.fn();
        const onFormatChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                defaultValue: "#3b82f6",
                defaultFormat: "hex",
                readonly: true,
                onValueChange,
                onCommit,
                onFormatChange,
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const area = requireElement<HTMLElement>(container, ".cs-color-area");
        const areaThumb = requireElement<HTMLElement>(container, ".cs-color-area-thumb");
        const hueSlider = requireElement<HTMLElement>(container, '.cs-color-slider[data-channel="hue"]');
        const hueThumb = requireElement<HTMLElement>(
            container,
            '.cs-color-slider[data-channel="hue"] .cs-color-slider-thumb'
        );
        const fullInput = requireFullColorInput(container);
        const formatTrigger = requireFormatTrigger(container);
        const redSwatch = requireElement<HTMLButtonElement>(container, '.cs-color-swatch[aria-label="Red"]');
        const eyeDropper = requireElement<HTMLButtonElement>(container, "button.cs-color-eye-dropper");

        expect(picker.dataset.readonly).toBe("");
        expect(picker.dataset.disabled).toBeUndefined();
        expect(area.dataset.readonly).toBe("");
        expect(hueSlider.dataset.readonly).toBe("");
        expect(fullInput.readOnly).toBe(true);
        expect(formatTrigger.disabled).toBe(false);
        expect(eyeDropper.disabled).toBe(true);

        // Color mutations are blocked
        dispatchKeyDown(areaThumb, "ArrowLeft");
        dispatchKeyDown(hueThumb, "ArrowRight");
        setInputAndCommit(fullInput, "#ef4444");
        dispatchClick(redSwatch);
        dispatchClick(eyeDropper);
        await Promise.resolve();
        flushSync();

        expect(requireProbe(container).dataset.value).toBe("#3b82f6");
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();

        // Format selection remains interactive
        selectFormatOption(container, "hsl");
        expect(picker.dataset.format).toBe("hsl");
        expect(requireProbe(container).dataset.format).toBe("hsl");
        expect(fullInput.value).toBe("hsl(217.2 91.2% 59.8%)");
        expect(onFormatChange).toHaveBeenCalledTimes(1);
        expect(onFormatChange).toHaveBeenCalledWith("hsl");

        unmount(instance);
    });

    test("propagates invalid state to ColorArea, ColorSlider, ColorInput, and ColorFormatSelect", () => {
        const state = $state({ invalid: true });

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                get invalid() {
                    return state.invalid;
                },
            },
        });
        flushSync();

        const picker = requirePickerRoot(container);
        const area = requireElement<HTMLElement>(container, ".cs-color-area");
        const hueSlider = requireElement<HTMLElement>(container, '.cs-color-slider[data-channel="hue"]');
        const alphaSlider = requireElement<HTMLElement>(container, '.cs-color-slider[data-channel="alpha"]');
        const fullInputRoot = requireElement<HTMLElement>(container, '.cs-color-input[data-mode="full"]');
        const alphaInputRoot = requireElement<HTMLElement>(container, '.cs-color-input[data-channel="alpha"]');
        const formatTrigger = requireFormatTrigger(container);

        expect(picker.dataset.invalid).toBe("");
        expect(area.dataset.invalid).toBe("");
        expect(hueSlider.dataset.invalid).toBe("");
        expect(alphaSlider.dataset.invalid).toBe("");
        expect(fullInputRoot.dataset.invalid).toBe("");
        expect(alphaInputRoot.dataset.invalid).toBe("");
        expect(formatTrigger.dataset.invalid).toBe("");
        expect(formatTrigger.getAttribute("aria-invalid")).toBe("true");

        state.invalid = false;
        flushSync();

        expect(picker.dataset.invalid).toBeUndefined();
        expect(area.dataset.invalid).toBeUndefined();
        expect(hueSlider.dataset.invalid).toBeUndefined();
        expect(alphaSlider.dataset.invalid).toBeUndefined();
        expect(fullInputRoot.dataset.invalid).toBeUndefined();
        expect(alphaInputRoot.dataset.invalid).toBeUndefined();
        expect(formatTrigger.dataset.invalid).toBeUndefined();
        expect(formatTrigger.getAttribute("aria-invalid")).toBeNull();

        unmount(instance);
    });

    test("supports alphaFormat 'always' and 'never' across ColorFormatSelect, alpha mutations, and bound value", () => {
        const onValueChange = vi.fn();

        // alphaFormat="always" forces alpha emission even for opaque colors
        const alwaysInstance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                defaultValue: "#3b82f6",
                defaultFormat: "hex",
                alphaFormat: "always",
                onValueChange,
            },
        });
        flushSync();

        expect(requireProbe(container).dataset.value).toBe("#3b82f6ff");
        expect(onValueChange).not.toHaveBeenCalled();

        selectFormatOption(container, "rgb");
        expect(requireProbe(container).dataset.value).toBe("rgb(59 130 246 / 1)");

        unmount(alwaysInstance);

        // alphaFormat="never" strips alpha even for translucent colors and alpha mutations
        const neverState = $state({ value: "#3b82f680" });
        const neverInstance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return neverState.value;
                },
                set value(next: string | undefined) {
                    if (next !== undefined) neverState.value = next;
                },
                defaultFormat: "hex8",
                alphaFormat: "never",
                onValueChange,
            },
        });
        flushSync();

        expect(requireProbe(container).dataset.value).toBe("#3b82f6");
        expect(requireAlphaColorInput(container).value).toBe("50%");

        selectFormatOption(container, "rgb");
        expect(requireProbe(container).dataset.value).toBe("rgb(59 130 246)");

        setInputAndCommit(requireAlphaColorInput(container), "25%");
        expect(requireAlphaColorInput(container).value).toBe("25%");
        expect(requireProbe(container).dataset.value).toBe("rgb(59 130 246)");

        setInputAndCommit(requireFullColorInput(container), "#ef444480");
        expect(requireProbe(container).dataset.value).toBe("rgb(239 68 68)");
        expect(neverState.value).toBe("rgb(239 68 68)");

        unmount(neverInstance);
    });

    test("reacts to dynamic alphaFormat changes without emitting spurious onValueChange", () => {
        const state = $state<{ alphaFormat: ColorAlphaFormat }>({ alphaFormat: "auto" });
        const onValueChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                defaultValue: "#3b82f6",
                defaultFormat: "hex",
                get alphaFormat() {
                    return state.alphaFormat;
                },
                onValueChange,
            },
        });
        flushSync();

        expect(requireProbe(container).dataset.value).toBe("#3b82f6");

        state.alphaFormat = "always";
        flushSync();
        expect(requireProbe(container).dataset.value).toBe("#3b82f6ff");

        state.alphaFormat = "never";
        flushSync();
        expect(requireProbe(container).dataset.value).toBe("#3b82f6");

        state.alphaFormat = "auto";
        flushSync();
        expect(requireProbe(container).dataset.value).toBe("#3b82f6");
        expect(onValueChange).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("clamps wide-gamut colors when gamut='srgb' and preserves them when gamut='p3'", () => {
        // gamut="srgb" clamps initial wide-gamut value and subsequent wide-gamut ColorInput commits
        const state = $state({ value: "color(display-p3 1 0 0)" });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const srgbInstance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return state.value;
                },
                set value(next: string | undefined) {
                    if (next !== undefined) state.value = next;
                },
                defaultFormat: "p3",
                gamut: "srgb",
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const probeSrgb = requireProbe(container);
        expect(probeSrgb.dataset.inGamut).toBe("true");
        expect(probeSrgb.dataset.value).not.toBe("color(display-p3 1 0 0)");
        expect(onValueChange).not.toHaveBeenCalled();

        setInputAndCommit(requireFullColorInput(container), "oklch(0.7 0.35 150)");
        expect(probeSrgb.dataset.inGamut).toBe("true");
        expect(state.value).not.toBe("oklch(0.7 0.35 150)");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith(state.value);
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenLastCalledWith(state.value);

        selectFormatOption(container, "rgb");
        expect(isInGamut(state.value, "srgb")).toBe(true);

        unmount(srgbInstance);

        // gamut="p3" preserves P3 wide-gamut colors without clamping to sRGB
        const p3Instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                defaultValue: "color(display-p3 1 0 0)",
                defaultFormat: "p3",
                gamut: "p3",
            },
        });
        flushSync();

        const probeP3 = requireProbe(container);
        expect(probeP3.dataset.inGamut).toBe("true");
        expect(probeP3.dataset.value).toBe("color(display-p3 1 0 0)");
        expect(requireFullColorInput(container).value).toBe("color(display-p3 1 0 0)");
        expect(isInGamut("color(display-p3 1 0 0)", "srgb")).toBe(false);

        unmount(p3Instance);
    });

    test("reacts to dynamic gamut changes between 'p3', undefined, and 'srgb'", () => {
        const state = $state<{ gamut: ColorGamut | undefined }>({ gamut: "p3" });
        const onValueChange = vi.fn();

        const instance = mount(ColorPickerTestHost, {
            target: container,
            props: {
                defaultValue: "color(display-p3 1 0 0)",
                defaultFormat: "p3",
                get gamut() {
                    return state.gamut;
                },
                onValueChange,
            },
        });
        flushSync();

        const probe = requireProbe(container);
        expect(probe.dataset.inGamut).toBe("true");
        expect(probe.dataset.value).toBe("color(display-p3 1 0 0)");

        // Switching gamut to undefined keeps wide-gamut unclamped; inGamut checks sRGB by default
        state.gamut = undefined;
        flushSync();
        expect(probe.dataset.value).toBe("color(display-p3 1 0 0)");
        expect(probe.dataset.inGamut).toBe("false");

        // Tightening gamut to "srgb" clamps effective output and restores inGamut=true
        state.gamut = "srgb";
        flushSync();
        expect(probe.dataset.inGamut).toBe("true");
        expect(probe.dataset.value).not.toBe("color(display-p3 1 0 0)");
        expect(requireFullColorInput(container).value).toBe(probe.dataset.value);
        expect(onValueChange).not.toHaveBeenCalled();

        selectFormatOption(container, "rgb");
        expect(isInGamut(probe.dataset.value ?? "", "srgb")).toBe(true);

        unmount(instance);
    });
});
