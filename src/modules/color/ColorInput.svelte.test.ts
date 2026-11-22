import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorInputTestHost from "./ColorInputTestHost.internal.svelte";
import {
    COLOR_INPUT_SIZES,
    COLOR_INPUT_VARIANTS,
    ColorInput,
    type ColorAlphaFormat,
    type ColorChannel,
    type ColorFormat,
    type ColorInputSize,
    type ColorInputVariant,
} from "./index.ts";

function getColorInputElements(container: HTMLElement): {
    root: HTMLDivElement;
    input: HTMLInputElement;
    prefix: HTMLSpanElement | null;
    swatch: HTMLElement | null;
} {
    const root = container.querySelector<HTMLDivElement>(".cs-color-input");
    const input = container.querySelector<HTMLInputElement>(".cs-color-input-field");
    if (!root || !input) {
        throw new Error("Expected ColorInput root and field elements to be mounted");
    }
    const prefix = container.querySelector<HTMLSpanElement>(".cs-color-input-prefix");
    const swatch = container.querySelector<HTMLElement>(".cs-color-input-swatch");
    return { root, input, prefix, swatch };
}

function focusInput(input: HTMLInputElement): void {
    input.focus();
    flushSync();
}

function typeInput(input: HTMLInputElement, nextValue: string): void {
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    flushSync();
}

function blurInput(input: HTMLInputElement): void {
    input.blur();
    flushSync();
}

function dispatchKey(
    target: EventTarget,
    key: string,
    options: { shiftKey?: boolean } = {}
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        shiftKey: options.shiftKey ?? false,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

describe("ColorInput Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders variants, sizes xs-xl, mode/channel attributes, refs, and custom class", () => {
        expect(COLOR_INPUT_VARIANTS).toEqual(["soft", "elevated"]);
        expect(COLOR_INPUT_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);

        const state = $state<{
            variant: ColorInputVariant;
            size: ColorInputSize;
            channel: ColorChannel | undefined;
            ref: HTMLDivElement | null;
            inputRef: HTMLInputElement | null;
        }>({
            variant: "soft",
            size: "xs",
            channel: undefined,
            ref: null,
            inputRef: null,
        });

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                get variant() {
                    return state.variant;
                },
                get size() {
                    return state.size;
                },
                get channel() {
                    return state.channel;
                },
                get ref() {
                    return state.ref;
                },
                set ref(next) {
                    state.ref = next;
                },
                get inputRef() {
                    return state.inputRef;
                },
                set inputRef(next) {
                    state.inputRef = next;
                },
                inputAttrs: { class: "custom-color-input" },
            },
        });
        flushSync();

        const initial = getColorInputElements(container);
        expect(state.ref).toBe(initial.root);
        expect(state.inputRef).toBe(initial.input);
        expect(initial.root.classList.contains("cs-text-input")).toBe(true);
        expect(initial.root.classList.contains("cs-color-input")).toBe(true);
        expect(initial.root.classList.contains("custom-color-input")).toBe(true);
        expect(initial.root.dataset.mode).toBe("full");
        expect(initial.root.dataset.channel).toBeUndefined();
        expect(initial.input.getAttribute("inputmode")).toBe("text");
        expect(initial.input.getAttribute("spellcheck")).toBe("false");
        expect(initial.input.getAttribute("autocomplete")).toBe("off");
        expect(initial.input.getAttribute("autocapitalize")).toBe("off");

        for (const nextVariant of COLOR_INPUT_VARIANTS) {
            state.variant = nextVariant;
            flushSync();
            expect(getColorInputElements(container).root.dataset.variant).toBe(nextVariant);
        }

        for (const nextSize of COLOR_INPUT_SIZES) {
            state.size = nextSize;
            flushSync();
            expect(getColorInputElements(container).root.dataset.size).toBe(nextSize);
        }

        state.channel = "hue";
        flushSync();
        const channelEls = getColorInputElements(container);
        expect(channelEls.root.dataset.mode).toBe("channel");
        expect(channelEls.root.dataset.channel).toBe("hue");
        expect(channelEls.input.getAttribute("inputmode")).toBe("decimal");

        unmount(instance);
        expect(state.ref).toBeNull();
        expect(state.inputRef).toBeNull();
    });

    test("controls hex prefix and decorative ColorSwatch visibility across formats and modes", () => {
        let value = $state("#3b82f6");
        let format = $state<ColorFormat>("auto");
        let showPrefix = $state(true);
        let showSwatch = $state(false);
        let channel = $state<ColorChannel | undefined>(undefined);

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return value;
                },
                set value(next) {
                    if (typeof next === "string") value = next;
                },
                get format() {
                    return format;
                },
                get showPrefix() {
                    return showPrefix;
                },
                get showSwatch() {
                    return showSwatch;
                },
                get channel() {
                    return channel;
                },
            },
        });
        flushSync();

        // Default hex mode shows # prefix and strips leading # from input value.
        let els = getColorInputElements(container);
        expect(els.prefix?.textContent).toBe("#");
        expect(els.prefix?.getAttribute("aria-hidden")).toBe("true");
        expect(els.input.value).toBe("3b82f6");
        expect(els.swatch).toBeNull();

        // Enabling showSwatch renders a decorative ColorSwatch preview.
        showSwatch = true;
        flushSync();
        els = getColorInputElements(container);
        expect(els.swatch).not.toBeNull();
        expect(els.swatch?.dataset.mode).toBe("preview");
        expect(els.swatch?.getAttribute("aria-hidden")).toBe("true");
        expect(els.swatch?.getAttribute("role")).toBeNull();
        expect(els.swatch?.getAttribute("aria-label")).toBeNull();

        // Disabling showPrefix hides # and keeps # inside input value.
        showPrefix = false;
        flushSync();
        els = getColorInputElements(container);
        expect(els.prefix).toBeNull();
        expect(els.input.value).toBe("#3b82f6");

        // Switching to rgb or oklch hides # prefix even when showPrefix=true.
        showPrefix = true;
        format = "rgb";
        flushSync();
        els = getColorInputElements(container);
        expect(els.prefix).toBeNull();
        expect(els.input.value).toMatch(/^rgb\(/);

        format = "oklch";
        flushSync();
        els = getColorInputElements(container);
        expect(els.prefix).toBeNull();
        expect(els.input.value).toMatch(/^oklch\(/);

        // Single-channel mode never renders # prefix or swatch.
        format = "hex";
        channel = "alpha";
        flushSync();
        els = getColorInputElements(container);
        expect(els.prefix).toBeNull();
        expect(els.swatch).toBeNull();

        unmount(instance);
    });

    test("resolves accessible labels and disabled, readonly, invalid states", () => {
        let label = $state<string | undefined>(undefined);
        let ariaLabel = $state<string | undefined>(undefined);
        let ariaLabelledBy = $state<string | undefined>(undefined);
        let channel = $state<ColorChannel | undefined>(undefined);
        let disabled = $state(false);
        let readonly = $state(false);
        let invalid = $state(false);

        const instance = mount(ColorInput, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                get label() {
                    return label;
                },
                get channel() {
                    return channel;
                },
                get disabled() {
                    return disabled;
                },
                get readonly() {
                    return readonly;
                },
                get invalid() {
                    return invalid;
                },
                get "aria-label"() {
                    return ariaLabel;
                },
                get "aria-labelledby"() {
                    return ariaLabelledBy;
                },
                placeholder: "Hex color",
            },
        });
        flushSync();

        const { root, input } = getColorInputElements(container);
        expect(input.getAttribute("aria-label")).toBe("Color value");
        expect(input.getAttribute("aria-labelledby")).toBeNull();
        expect(input.getAttribute("placeholder")).toBe("Hex color");
        expect(root.dataset.disabled).toBeUndefined();
        expect(root.dataset.readonly).toBeUndefined();
        expect(root.dataset.invalid).toBeUndefined();
        expect(input.disabled).toBe(false);
        expect(input.readOnly).toBe(false);
        expect(input.getAttribute("aria-invalid")).toBeNull();

        channel = "alpha";
        flushSync();
        expect(input.getAttribute("aria-label")).toBe("Alpha");

        ariaLabelledBy = "external-color-heading";
        flushSync();
        expect(input.getAttribute("aria-label")).toBeNull();
        expect(input.getAttribute("aria-labelledby")).toBe("external-color-heading");

        ariaLabel = "Primary accent";
        flushSync();
        expect(input.getAttribute("aria-label")).toBe("Primary accent");

        label = "Explicit label";
        flushSync();
        expect(input.getAttribute("aria-label")).toBe("Explicit label");

        disabled = true;
        readonly = true;
        invalid = true;
        flushSync();
        expect(root.dataset.disabled).toBe("");
        expect(root.dataset.readonly).toBe("");
        expect(root.dataset.invalid).toBe("");
        expect(input.disabled).toBe(true);
        expect(input.readOnly).toBe(true);
        expect(input.getAttribute("aria-invalid")).toBe("true");

        unmount(instance);
    });

    test("full-color mode parses hex, rgb, and oklch tolerantly and manages draft lifecycle", () => {
        const state = $state({ value: "#3b82f6" });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return state.value;
                },
                set value(next) {
                    if (typeof next === "string") state.value = next;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, input } = getColorInputElements(container);
        expect(input.value).toBe("3b82f6");

        // Incomplete draft does not jump, does not mark invalid, and does not emit callbacks.
        focusInput(input);
        typeInput(input, "4f46e");
        expect(input.value).toBe("4f46e");
        expect(root.dataset.invalid).toBeUndefined();
        expect(input.getAttribute("aria-invalid")).toBeNull();
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();

        // Completing bare hex emits onValueChange (commit: false) without committing yet.
        typeInput(input, "4f46e5");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith("#4f46e5");
        expect(state.value).toBe("#4f46e5");
        expect(onCommit).not.toHaveBeenCalled();

        // Enter formats and commits.
        dispatchKey(input, "Enter");
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenLastCalledWith("#4f46e5");
        expect(input.value).toBe("4f46e5");

        // Pasting uppercase #hex and committing via blur normalizes display.
        typeInput(input, "#EF4444");
        expect(onValueChange).toHaveBeenLastCalledWith("#ef4444");
        blurInput(input);
        expect(onCommit).toHaveBeenCalledTimes(2);
        expect(onCommit).toHaveBeenLastCalledWith("#ef4444");
        expect(input.value).toBe("ef4444");

        // Format="auto" adapts to pasted rgb(...) and oklch(...) strings.
        focusInput(input);
        typeInput(input, "rgb(59 130 246)");
        expect(onValueChange).toHaveBeenLastCalledWith("rgb(59 130 246)");
        dispatchKey(input, "Enter");
        expect(onCommit).toHaveBeenLastCalledWith("rgb(59 130 246)");
        expect(getColorInputElements(container).prefix).toBeNull();

        typeInput(input, "oklch(0.623 0.214 259.815)");
        expect(onValueChange).toHaveBeenLastCalledWith("oklch(0.623 0.214 259.82)");
        blurInput(input);
        expect(onCommit).toHaveBeenLastCalledWith("oklch(0.623 0.214 259.82)");

        unmount(instance);
    });

    test("full-color mode reverts invalid draft on Enter/Blur and reverts dirty Escape with stopPropagation + blur", () => {
        const state = $state({ value: "#3b82f6" });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return state.value;
                },
                set value(next) {
                    if (typeof next === "string") state.value = next;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { input } = getColorInputElements(container);
        const blurSpy = vi.spyOn(input, "blur");

        // Clean Escape does not stopPropagation or blur.
        focusInput(input);
        const cleanEsc = dispatchKey(input, "Escape");
        expect(cleanEsc.cancelBubble).toBe(false);
        expect(blurSpy).not.toHaveBeenCalled();

        // Invalid draft on Enter reverts to preFocusValue without committing.
        typeInput(input, "not-a-color");
        dispatchKey(input, "Enter");
        expect(input.value).toBe("3b82f6");
        expect(state.value).toBe("#3b82f6");
        expect(onCommit).not.toHaveBeenCalled();

        // Invalid draft on Blur also reverts to preFocusValue without committing.
        typeInput(input, "rgb(12");
        blurInput(input);
        expect(input.value).toBe("3b82f6");
        expect(onCommit).not.toHaveBeenCalled();

        // Dirty Escape after a valid live preview reverts live value + draft, stops propagation, and blurs.
        focusInput(input);
        typeInput(input, "10b981");
        expect(state.value).toBe("#10b981");
        expect(onValueChange).toHaveBeenLastCalledWith("#10b981");

        blurSpy.mockClear();
        const escEvent = dispatchKey(input, "Escape");
        expect(escEvent.defaultPrevented).toBe(true);
        expect(escEvent.cancelBubble).toBe(true);
        expect(blurSpy).toHaveBeenCalledTimes(1);
        expect(state.value).toBe("#3b82f6");
        expect(input.value).toBe("3b82f6");

        unmount(instance);
    });

    test("supports strict controlled mode and ignores edits when disabled or readonly", () => {
        const strict = $state({ value: "#3b82f6" });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();
        let disabled = $state(false);
        let readonly = $state(false);

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "strict",
                get strictStringValue() {
                    return strict.value;
                },
                get disabled() {
                    return disabled;
                },
                get readonly() {
                    return readonly;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { input } = getColorInputElements(container);
        focusInput(input);
        typeInput(input, "ef4444");
        expect(onValueChange).toHaveBeenCalledWith("#ef4444");
        blurInput(input);
        expect(onCommit).toHaveBeenCalledWith("#ef4444");
        // Strict getter keeps displayed value pinned to strict.value after blur.
        expect(input.value).toBe("3b82f6");

        strict.value = "#22c55e";
        flushSync();
        expect(input.value).toBe("22c55e");

        // Disabled and readonly block emissions on input/Enter/Blur.
        onValueChange.mockClear();
        onCommit.mockClear();
        readonly = true;
        flushSync();
        focusInput(input);
        typeInput(input, "000000");
        dispatchKey(input, "Enter");
        blurInput(input);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();

        readonly = false;
        disabled = true;
        flushSync();
        typeInput(input, "ffffff");
        dispatchKey(input, "Enter");
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("single-channel mode formats units, parses alpha/oklch-lightness/hue/red/chroma, clamps, and reverts invalid", () => {
        const cases: Array<{
            channel: ColorChannel;
            initial: number;
            expectedDisplay: string;
            noUnitDisplay: string;
            typed: string;
            expectedParsed: number;
            outOfRangeTyped: string;
            expectedClamped: number;
        }> = [
            {
                channel: "alpha",
                initial: 0.5,
                expectedDisplay: "50%",
                noUnitDisplay: "50",
                typed: "75%",
                expectedParsed: 0.75,
                outOfRangeTyped: "150",
                expectedClamped: 1,
            },
            {
                channel: "oklch-lightness",
                initial: 0.62,
                expectedDisplay: "62%",
                noUnitDisplay: "62",
                typed: "45",
                expectedParsed: 0.45,
                outOfRangeTyped: "-20%",
                expectedClamped: 0,
            },
            {
                channel: "hue",
                initial: 180,
                expectedDisplay: "180°",
                noUnitDisplay: "180",
                typed: "240°",
                expectedParsed: 240,
                outOfRangeTyped: "500",
                expectedClamped: 360,
            },
            {
                channel: "red",
                initial: 128,
                expectedDisplay: "128",
                noUnitDisplay: "128",
                typed: "200",
                expectedParsed: 200,
                outOfRangeTyped: "999",
                expectedClamped: 255,
            },
            {
                channel: "chroma",
                initial: 0.15,
                expectedDisplay: "0.150",
                noUnitDisplay: "0.150",
                typed: "0.25",
                expectedParsed: 0.25,
                outOfRangeTyped: "0.9",
                expectedClamped: 0.4,
            },
        ];

        for (const item of cases) {
            const state = $state({ value: item.initial, showUnit: true });
            const onValueChange = vi.fn();
            const onCommit = vi.fn();

            const instance = mount(ColorInputTestHost, {
                target: container,
                props: {
                    bindMode: "bind",
                    channel: item.channel,
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        if (typeof next === "number") state.value = next;
                    },
                    get showUnit() {
                        return state.showUnit;
                    },
                    onValueChange,
                    onCommit,
                },
            });
            flushSync();

            const { input } = getColorInputElements(container);
            expect(input.value).toBe(item.expectedDisplay);

            state.showUnit = false;
            flushSync();
            expect(input.value).toBe(item.noUnitDisplay);
            state.showUnit = true;
            flushSync();

            focusInput(input);
            typeInput(input, item.typed);
            expect(state.value).toBe(item.expectedParsed);
            expect(onValueChange).toHaveBeenLastCalledWith(item.expectedParsed);
            dispatchKey(input, "Enter");
            expect(onCommit).toHaveBeenLastCalledWith(item.expectedParsed);

            // Out-of-range numeric input clamps on Enter.
            typeInput(input, item.outOfRangeTyped);
            dispatchKey(input, "Enter");
            expect(state.value).toBe(item.expectedClamped);
            expect(onCommit).toHaveBeenLastCalledWith(item.expectedClamped);

            // Non-numeric input reverts to preFocusValue on Blur.
            typeInput(input, "abc");
            blurInput(input);
            expect(state.value).toBe(item.expectedClamped);

            unmount(instance);
        }
    });

    test("single-channel mode supports ArrowUp/ArrowDown (+Shift largeStep), color fallback, and dirty Escape", () => {
        const state = $state({ value: 180, disabled: false });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return state.value;
                },
                set value(next) {
                    if (typeof next === "number") state.value = next;
                },
                get disabled() {
                    return state.disabled;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { input } = getColorInputElements(container);
        focusInput(input);

        dispatchKey(input, "ArrowUp");
        expect(state.value).toBe(181);
        expect(input.value).toBe("181°");
        expect(onValueChange).toHaveBeenLastCalledWith(181);
        expect(onCommit).toHaveBeenLastCalledWith(181);

        dispatchKey(input, "ArrowDown", { shiftKey: true });
        expect(state.value).toBe(166);
        expect(input.value).toBe("166°");
        expect(onCommit).toHaveBeenLastCalledWith(166);

        // Dirty Escape after typing reverts back to last committed/stepped preFocus value (166).
        typeInput(input, "300");
        expect(state.value).toBe(300);
        const escEvent = dispatchKey(input, "Escape");
        expect(escEvent.defaultPrevented).toBe(true);
        expect(escEvent.cancelBubble).toBe(true);
        expect(state.value).toBe(166);
        expect(input.value).toBe("166°");

        // Disabled blocks ArrowUp stepping.
        state.disabled = true;
        flushSync();
        dispatchKey(input, "ArrowUp");
        expect(state.value).toBe(166);

        unmount(instance);

        // Standalone color prop fallback when value and pickerCtx are absent.
        const fallbackInstance = mount(ColorInput, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                channel: "red",
                color: "#ff8000",
            },
        });
        flushSync();
        expect(getColorInputElements(container).input.value).toBe("255");
        unmount(fallbackInstance);
    });

    test("integrates with ColorPickerContext in full-color and single-channel modes", () => {
        const picker = $state<{
            value: string;
            format: ColorFormat;
            disabled: boolean;
            readonly: boolean;
            invalid: boolean;
            channel: ColorChannel | undefined;
        }>({
            value: "#3b82f6",
            format: "hex",
            disabled: false,
            readonly: false,
            invalid: false,
            channel: undefined,
        });
        const onPickerSetString = vi.fn();
        const onPickerSetChannel = vi.fn();

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                withPicker: true,
                get pickerValue() {
                    return picker.value;
                },
                set pickerValue(next) {
                    picker.value = next;
                },
                get pickerFormat() {
                    return picker.format;
                },
                get pickerDisabled() {
                    return picker.disabled;
                },
                get pickerReadonly() {
                    return picker.readonly;
                },
                get pickerInvalid() {
                    return picker.invalid;
                },
                get channel() {
                    return picker.channel;
                },
                onPickerSetString,
                onPickerSetChannel,
            },
        });
        flushSync();

        const { root, input } = getColorInputElements(container);
        expect(input.value).toBe("3b82f6");

        // Full-color mode calls pickerCtx.setString with commit=false on input and commit=true on Enter.
        focusInput(input);
        typeInput(input, "ef4444");
        expect(onPickerSetString).toHaveBeenLastCalledWith("#ef4444", { commit: false });
        expect(picker.value).toBe("#ef4444");

        dispatchKey(input, "Enter");
        expect(onPickerSetString).toHaveBeenLastCalledWith("#ef4444", { commit: true });

        // Dirty Escape restores pickerCtx string via setString(..., { commit: false }) before blur commits.
        typeInput(input, "10b981");
        expect(picker.value).toBe("#10b981");
        dispatchKey(input, "Escape");
        expect(onPickerSetString).toHaveBeenCalledWith("#ef4444", { commit: false });
        expect(picker.value).toBe("#ef4444");

        // Picker format="rgb" hides # prefix and formats pickerValue as rgb.
        picker.format = "rgb";
        flushSync();
        expect(getColorInputElements(container).prefix).toBeNull();
        expect(input.value).toBe("rgb(239 68 68)");

        // Picker disabled / readonly / invalid propagate to ColorInput.
        picker.disabled = true;
        picker.readonly = true;
        picker.invalid = true;
        flushSync();
        expect(root.dataset.disabled).toBe("");
        expect(root.dataset.readonly).toBe("");
        expect(root.dataset.invalid).toBe("");
        expect(input.disabled).toBe(true);
        expect(input.readOnly).toBe(true);
        expect(input.getAttribute("aria-invalid")).toBe("true");

        picker.disabled = false;
        picker.readonly = false;
        picker.invalid = false;
        flushSync();

        // Single-channel mode reads pickerCtx.getChannel and calls pickerCtx.setChannel.
        picker.channel = "red";
        flushSync();
        const channelInput = getColorInputElements(container).input;
        expect(channelInput.value).toBe("239");

        focusInput(channelInput);
        typeInput(channelInput, "100");
        expect(onPickerSetChannel).toHaveBeenLastCalledWith("red", 100, { commit: false });
        dispatchKey(channelInput, "Enter");
        expect(onPickerSetChannel).toHaveBeenLastCalledWith("red", 100, { commit: true });
        expect(picker.value).toBe("rgb(100 68 68)");

        // ArrowUp steps and commits via pickerCtx.setChannel.
        dispatchKey(channelInput, "ArrowUp");
        expect(onPickerSetChannel).toHaveBeenLastCalledWith("red", 101, { commit: true });
        expect(picker.value).toBe("rgb(101 68 68)");

        // Dirty Escape restores preFocus channel via pickerCtx.setChannel(..., { commit: false }) before blur commits.
        typeInput(channelInput, "250");
        expect(picker.value).toBe("rgb(250 68 68)");
        dispatchKey(channelInput, "Escape");
        expect(onPickerSetChannel).toHaveBeenCalledWith("red", 101, { commit: false });
        expect(picker.value).toBe("rgb(101 68 68)");

        unmount(instance);
    });

    test("uncontrolled mode (value === undefined, no pickerCtx) manages internalString and internalChannel", () => {
        // Full-color uncontrolled mode
        const fullOnValueChange = vi.fn();
        const fullOnCommit = vi.fn();

        const fullInstance = mount(ColorInput, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                onValueChange: fullOnValueChange,
                onCommit: fullOnCommit,
            },
        });
        flushSync();

        const fullInput = getColorInputElements(container).input;
        expect(fullInput.value).toBe("000000");

        focusInput(fullInput);
        typeInput(fullInput, "ef4444");
        expect(fullOnValueChange).toHaveBeenCalledTimes(1);
        expect(fullOnValueChange).toHaveBeenLastCalledWith("#ef4444");
        expect(fullOnCommit).not.toHaveBeenCalled();

        dispatchKey(fullInput, "Enter");
        expect(fullOnCommit).toHaveBeenCalledTimes(1);
        expect(fullOnCommit).toHaveBeenLastCalledWith("#ef4444");
        expect(fullInput.value).toBe("ef4444");

        // Blur commit updates internalString so blurred display reflects the new color.
        typeInput(fullInput, "10b981");
        blurInput(fullInput);
        expect(fullOnCommit).toHaveBeenCalledTimes(2);
        expect(fullOnCommit).toHaveBeenLastCalledWith("#10b981");
        expect(fullInput.value).toBe("10b981");

        // Dirty Escape reverts internalString back to "#10b981".
        focusInput(fullInput);
        typeInput(fullInput, "ff0000");
        expect(fullOnValueChange).toHaveBeenLastCalledWith("#ff0000");
        dispatchKey(fullInput, "Escape");
        expect(fullInput.value).toBe("10b981");
        expect(fullOnCommit).toHaveBeenLastCalledWith("#10b981");

        unmount(fullInstance);

        // Single-channel uncontrolled mode
        const channelOnValueChange = vi.fn();
        const channelOnCommit = vi.fn();

        const channelInstance = mount(ColorInput, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                channel: "hue",
                onValueChange: channelOnValueChange,
                onCommit: channelOnCommit,
            },
        });
        flushSync();

        const channelInput = getColorInputElements(container).input;
        expect(channelInput.value).toBe("0°");

        focusInput(channelInput);
        typeInput(channelInput, "120");
        expect(channelOnValueChange).toHaveBeenCalledTimes(1);
        expect(channelOnValueChange).toHaveBeenLastCalledWith(120);
        expect(channelOnCommit).not.toHaveBeenCalled();

        dispatchKey(channelInput, "Enter");
        expect(channelOnCommit).toHaveBeenCalledTimes(1);
        expect(channelOnCommit).toHaveBeenLastCalledWith(120);
        expect(channelInput.value).toBe("120°");

        // Blur commit updates internalChannel.
        typeInput(channelInput, "200");
        blurInput(channelInput);
        expect(channelOnCommit).toHaveBeenCalledTimes(2);
        expect(channelOnCommit).toHaveBeenLastCalledWith(200);
        expect(channelInput.value).toBe("200°");

        // ArrowUp / ArrowDown step against internalChannel.
        focusInput(channelInput);
        dispatchKey(channelInput, "ArrowUp");
        expect(channelOnValueChange).toHaveBeenLastCalledWith(201);
        expect(channelOnCommit).toHaveBeenLastCalledWith(201);
        expect(channelInput.value).toBe("201°");

        dispatchKey(channelInput, "ArrowDown");
        expect(channelOnValueChange).toHaveBeenLastCalledWith(200);
        expect(channelOnCommit).toHaveBeenLastCalledWith(200);
        expect(channelInput.value).toBe("200°");

        // Dirty Escape reverts internalChannel back to 200.
        typeInput(channelInput, "300");
        dispatchKey(channelInput, "Escape");
        expect(channelInput.value).toBe("200°");

        unmount(channelInstance);
    });

    test('alpha prop ("never" & "always") controls alpha output across formats', () => {
        const state = $state<{
            value: string;
            format: ColorFormat;
            alpha: ColorAlphaFormat;
        }>({
            value: "rgba(59, 130, 246, 0.5)",
            format: "hex",
            alpha: "never",
        });
        const onCommit = vi.fn();

        const instance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return state.value;
                },
                set value(next) {
                    if (typeof next === "string") state.value = next;
                },
                get format() {
                    return state.format;
                },
                get alpha() {
                    return state.alpha;
                },
                onCommit,
            },
        });
        flushSync();

        const { input } = getColorInputElements(container);

        // alpha="never" suppresses alpha even for translucent colors.
        expect(input.value).toBe("3b82f6");

        state.format = "rgb";
        flushSync();
        expect(input.value).toBe("rgb(59 130 246)");

        state.format = "oklch";
        flushSync();
        expect(input.value).toBe("oklch(0.6231 0.188 259.81)");

        // Typing a translucent hex with alpha="never" strips alpha on commit.
        state.format = "hex";
        flushSync();
        focusInput(input);
        typeInput(input, "#ef444480");
        dispatchKey(input, "Enter");
        expect(onCommit).toHaveBeenLastCalledWith("#ef4444");
        expect(state.value).toBe("#ef4444");
        expect(input.value).toBe("ef4444");
        blurInput(input);

        // alpha="always" outputs alpha even for opaque colors.
        state.value = "#3b82f6";
        state.alpha = "always";
        state.format = "hex";
        flushSync();
        expect(input.value).toBe("3b82f6ff");

        state.format = "rgb";
        flushSync();
        expect(input.value).toBe("rgb(59 130 246 / 1)");

        state.format = "oklch";
        flushSync();
        expect(input.value).toBe("oklch(0.6231 0.188 259.81 / 1)");

        // Typing an opaque hex with alpha="always" appends alpha on commit.
        state.format = "hex";
        flushSync();
        focusInput(input);
        typeInput(input, "10b981");
        dispatchKey(input, "Enter");
        expect(onCommit).toHaveBeenLastCalledWith("#10b981ff");
        expect(state.value).toBe("#10b981ff");
        expect(input.value).toBe("10b981ff");

        unmount(instance);
    });

    test("isolates draft during external value changes while focused until blur", () => {
        // Full-color mode
        const fullState = $state({ value: "#3b82f6" });
        const fullInstance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return fullState.value;
                },
                set value(next) {
                    if (typeof next === "string") fullState.value = next;
                },
            },
        });
        flushSync();

        const fullInput = getColorInputElements(container).input;
        focusInput(fullInput);
        typeInput(fullInput, "12");
        expect(fullInput.value).toBe("12");

        // External update does not overwrite active draft while focused.
        fullState.value = "#ef4444";
        flushSync();
        expect(fullInput.value).toBe("12");

        // On blur, invalid draft reverts and reveals the external value.
        blurInput(fullInput);
        expect(fullInput.value).toBe("ef4444");
        expect(fullState.value).toBe("#ef4444");

        unmount(fullInstance);

        // Single-channel mode
        const channelState = $state({ value: 180 });
        const channelInstance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return channelState.value;
                },
                set value(next) {
                    if (typeof next === "number") channelState.value = next;
                },
            },
        });
        flushSync();

        const channelInput = getColorInputElements(container).input;
        focusInput(channelInput);
        typeInput(channelInput, "not-a-num");
        expect(channelInput.value).toBe("not-a-num");

        channelState.value = 270;
        flushSync();
        expect(channelInput.value).toBe("not-a-num");

        blurInput(channelInput);
        expect(channelInput.value).toBe("270°");
        expect(channelState.value).toBe(270);

        unmount(channelInstance);
    });

    test("clamps ArrowUp/ArrowDown at channel bounds and blocks stepping when readonly", () => {
        const hueState = $state({ value: 359, readonly: false });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const hueInstance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return hueState.value;
                },
                set value(next) {
                    if (typeof next === "number") hueState.value = next;
                },
                get readonly() {
                    return hueState.readonly;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const hueInput = getColorInputElements(container).input;
        focusInput(hueInput);

        dispatchKey(hueInput, "ArrowUp");
        expect(hueState.value).toBe(360);
        expect(hueInput.value).toBe("360°");

        // Upper bound clamping (0/360)
        dispatchKey(hueInput, "ArrowUp", { shiftKey: true });
        expect(hueState.value).toBe(360);
        expect(hueInput.value).toBe("360°");

        // Lower bound clamping (0/360)
        blurInput(hueInput);
        hueState.value = 1;
        flushSync();
        focusInput(hueInput);

        dispatchKey(hueInput, "ArrowDown");
        expect(hueState.value).toBe(0);
        expect(hueInput.value).toBe("0°");

        dispatchKey(hueInput, "ArrowDown", { shiftKey: true });
        expect(hueState.value).toBe(0);
        expect(hueInput.value).toBe("0°");

        // Readonly blocks ArrowUp and ArrowDown without emitting callbacks or preventing default
        blurInput(hueInput);
        hueState.value = 180;
        hueState.readonly = true;
        flushSync();
        focusInput(hueInput);
        onValueChange.mockClear();
        onCommit.mockClear();

        const upEvent = dispatchKey(hueInput, "ArrowUp");
        const downEvent = dispatchKey(hueInput, "ArrowDown");
        expect(upEvent.defaultPrevented).toBe(false);
        expect(downEvent.defaultPrevented).toBe(false);
        expect(hueState.value).toBe(180);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();

        unmount(hueInstance);

        // Alpha channel bounds clamping (0/1)
        const alphaState = $state({ value: 0.99 });
        const alphaInstance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "alpha",
                get value() {
                    return alphaState.value;
                },
                set value(next) {
                    if (typeof next === "number") alphaState.value = next;
                },
            },
        });
        flushSync();

        const alphaInput = getColorInputElements(container).input;
        focusInput(alphaInput);
        dispatchKey(alphaInput, "ArrowUp", { shiftKey: true });
        expect(alphaState.value).toBe(1);
        expect(alphaInput.value).toBe("100%");

        blurInput(alphaInput);
        alphaState.value = 0.01;
        flushSync();
        focusInput(alphaInput);
        dispatchKey(alphaInput, "ArrowDown", { shiftKey: true });
        expect(alphaState.value).toBe(0);
        expect(alphaInput.value).toBe("0%");

        unmount(alphaInstance);
    });

    test('reverts empty input "" to preFocusValue on Enter and blur', () => {
        // Full-color mode
        const fullState = $state({ value: "#3b82f6" });
        const fullOnValueChange = vi.fn();
        const fullOnCommit = vi.fn();

        const fullInstance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get value() {
                    return fullState.value;
                },
                set value(next) {
                    if (typeof next === "string") fullState.value = next;
                },
                onValueChange: fullOnValueChange,
                onCommit: fullOnCommit,
            },
        });
        flushSync();

        const fullInput = getColorInputElements(container).input;
        focusInput(fullInput);
        typeInput(fullInput, "");
        expect(fullOnValueChange).not.toHaveBeenCalled();

        dispatchKey(fullInput, "Enter");
        expect(fullInput.value).toBe("3b82f6");
        expect(fullState.value).toBe("#3b82f6");
        expect(fullOnCommit).not.toHaveBeenCalled();

        typeInput(fullInput, "");
        blurInput(fullInput);
        expect(fullInput.value).toBe("3b82f6");
        expect(fullState.value).toBe("#3b82f6");
        expect(fullOnCommit).not.toHaveBeenCalled();

        unmount(fullInstance);

        // Single-channel mode
        const channelState = $state({ value: 180 });
        const channelOnValueChange = vi.fn();
        const channelOnCommit = vi.fn();

        const channelInstance = mount(ColorInputTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return channelState.value;
                },
                set value(next) {
                    if (typeof next === "number") channelState.value = next;
                },
                onValueChange: channelOnValueChange,
                onCommit: channelOnCommit,
            },
        });
        flushSync();

        const channelInput = getColorInputElements(container).input;
        focusInput(channelInput);
        typeInput(channelInput, "");
        expect(channelOnValueChange).not.toHaveBeenCalled();

        dispatchKey(channelInput, "Enter");
        expect(channelInput.value).toBe("180°");
        expect(channelState.value).toBe(180);
        expect(channelOnCommit).not.toHaveBeenCalled();

        typeInput(channelInput, "");
        blurInput(channelInput);
        expect(channelInput.value).toBe("180°");
        expect(channelState.value).toBe(180);
        expect(channelOnCommit).not.toHaveBeenCalled();

        unmount(channelInstance);
    });
});
