import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorSliderTestHost from "./ColorSliderTestHost.internal.svelte";
import {
    COLOR_SLIDER_ORIENTATIONS,
    COLOR_SLIDER_SIZES,
    ColorSlider,
    type ColorChannel,
    type ColorSliderOrientation,
    type ColorSliderSize,
} from "./index.ts";

function getSliderElements(container: HTMLElement): {
    root: HTMLDivElement;
    track: HTMLDivElement;
    thumb: HTMLDivElement;
} {
    const root = container.querySelector<HTMLDivElement>(".cs-color-slider");
    const track = container.querySelector<HTMLDivElement>(".cs-color-slider-track");
    const thumb = container.querySelector<HTMLDivElement>(".cs-color-slider-thumb");
    if (!root || !track || !thumb) {
        throw new Error("Expected ColorSlider root, track, and thumb elements to be mounted");
    }
    return { root, track, thumb };
}

function mockTrackRect(
    track: HTMLDivElement,
    rect: { left: number; top: number; width: number; height: number }
): void {
    vi.spyOn(track, "getBoundingClientRect").mockReturnValue({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        x: rect.left,
        y: rect.top,
        toJSON: () => ({}),
    } as DOMRect);
}

function dispatchPointer(
    target: EventTarget,
    type: "pointerdown" | "pointermove" | "pointerup" | "pointercancel" | "lostpointercapture",
    options: { pointerId?: number; button?: number; clientX?: number; clientY?: number } = {}
): PointerEvent {
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: options.pointerId ?? 1,
        button: options.button ?? 0,
        clientX: options.clientX ?? 0,
        clientY: options.clientY ?? 0,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

describe("ColorSlider Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders sizes xs-xl, orientations, channel attributes, data-alpha, inverted, invalid, and ARIA slider semantics", () => {
        expect(COLOR_SLIDER_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
        expect(COLOR_SLIDER_ORIENTATIONS).toEqual(["horizontal", "vertical"]);

        let size = $state<ColorSliderSize>("xs");
        let orientation = $state<ColorSliderOrientation>("horizontal");
        let channel = $state<ColorChannel>("hue");
        let inverted = $state(false);
        let invalid = $state(false);
        let disabled = $state(false);
        let readonly = $state(false);

        const instance = mount(ColorSlider, {
            target: container,
            props: {
                get size() {
                    return size;
                },
                get orientation() {
                    return orientation;
                },
                get channel() {
                    return channel;
                },
                get inverted() {
                    return inverted;
                },
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

        for (const nextSize of COLOR_SLIDER_SIZES) {
            size = nextSize;
            flushSync();
            const { root } = getSliderElements(container);
            expect(root.dataset.size).toBe(nextSize);
        }

        const { root, track, thumb } = getSliderElements(container);
        expect(track.getAttribute("aria-hidden")).toBe("true");
        expect(thumb.getAttribute("role")).toBe("slider");
        expect(thumb.getAttribute("tabindex")).toBe("0");
        expect(root.dataset.orientation).toBe("horizontal");
        expect(thumb.getAttribute("aria-orientation")).toBe("horizontal");
        expect(root.dataset.channel).toBe("hue");
        expect(root.dataset.alpha).toBeUndefined();
        expect(root.dataset.inverted).toBeUndefined();
        expect(root.dataset.invalid).toBeUndefined();
        expect(root.dataset.disabled).toBeUndefined();
        expect(root.dataset.readonly).toBeUndefined();
        expect(thumb.getAttribute("aria-disabled")).toBeNull();
        expect(thumb.getAttribute("aria-readonly")).toBeNull();
        expect(thumb.getAttribute("aria-invalid")).toBeNull();

        channel = "alpha";
        orientation = "vertical";
        inverted = true;
        invalid = true;
        readonly = true;
        flushSync();

        expect(root.dataset.channel).toBe("alpha");
        expect(root.dataset.alpha).toBe("");
        expect(root.dataset.orientation).toBe("vertical");
        expect(thumb.getAttribute("aria-orientation")).toBe("vertical");
        expect(root.dataset.inverted).toBe("");
        expect(root.dataset.invalid).toBe("");
        expect(root.dataset.readonly).toBe("");
        expect(thumb.getAttribute("aria-invalid")).toBe("true");
        expect(thumb.getAttribute("aria-readonly")).toBe("true");
        expect(thumb.getAttribute("tabindex")).toBe("0");

        disabled = true;
        flushSync();
        expect(root.dataset.disabled).toBe("");
        expect(thumb.getAttribute("aria-disabled")).toBe("true");
        expect(thumb.getAttribute("tabindex")).toBe("-1");

        unmount(instance);
    });

    test("resolves aria-label and aria-labelledby cleanly on the slider thumb", () => {
        let channel = $state<ColorChannel>("hue");
        let label = $state<string | undefined>(undefined);
        let ariaLabel = $state<string | undefined>(undefined);
        let ariaLabelledby = $state<string | undefined>(undefined);

        const instance = mount(ColorSlider, {
            target: container,
            props: {
                size: "md",
                get channel() {
                    return channel;
                },
                get label() {
                    return label;
                },
                get "aria-label"() {
                    return ariaLabel;
                },
                get "aria-labelledby"() {
                    return ariaLabelledby;
                },
            },
        });
        flushSync();

        const { thumb } = getSliderElements(container);
        expect(thumb.getAttribute("aria-label")).toBe("Hue");
        expect(thumb.getAttribute("aria-labelledby")).toBeNull();

        channel = "alpha";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBe("Alpha");

        ariaLabelledby = "external-slider-label";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBeNull();
        expect(thumb.getAttribute("aria-labelledby")).toBe("external-slider-label");

        ariaLabel = "Custom opacity";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBe("Custom opacity");
        expect(thumb.getAttribute("aria-labelledby")).toBeNull();

        label = "Explicit label prop";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBe("Explicit label prop");
        expect(thumb.getAttribute("aria-labelledby")).toBeNull();

        unmount(instance);
    });

    test("exposes channel metadata, formatted aria-valuetext, and clamps out-of-range values", () => {
        const cases: Array<{
            channel: ColorChannel;
            value: number;
            expectedMin: string;
            expectedMax: string;
            expectedNow: string;
            expectedText: string;
        }> = [
            {
                channel: "hue",
                value: 180,
                expectedMin: "0",
                expectedMax: "360",
                expectedNow: "180",
                expectedText: "180°",
            },
            {
                channel: "hue",
                value: 450,
                expectedMin: "0",
                expectedMax: "360",
                expectedNow: "360",
                expectedText: "360°",
            },
            {
                channel: "alpha",
                value: 0.5,
                expectedMin: "0",
                expectedMax: "1",
                expectedNow: "0.5",
                expectedText: "50%",
            },
            {
                channel: "alpha",
                value: -0.25,
                expectedMin: "0",
                expectedMax: "1",
                expectedNow: "0",
                expectedText: "0%",
            },
            {
                channel: "chroma",
                value: 0.125,
                expectedMin: "0",
                expectedMax: "0.4",
                expectedNow: "0.125",
                expectedText: "0.125",
            },
            {
                channel: "red",
                value: 300,
                expectedMin: "0",
                expectedMax: "255",
                expectedNow: "255",
                expectedText: "255",
            },
            {
                channel: "oklch-lightness",
                value: 0.75,
                expectedMin: "0",
                expectedMax: "1",
                expectedNow: "0.75",
                expectedText: "75%",
            },
        ];

        let channel = $state<ColorChannel>("hue");
        let value = $state<number>(0);

        const instance = mount(ColorSlider, {
            target: container,
            props: {
                size: "md",
                get channel() {
                    return channel;
                },
                get value() {
                    return value;
                },
            },
        });
        flushSync();

        const { thumb } = getSliderElements(container);
        for (const item of cases) {
            channel = item.channel;
            value = item.value;
            flushSync();

            expect(thumb.getAttribute("aria-valuemin")).toBe(item.expectedMin);
            expect(thumb.getAttribute("aria-valuemax")).toBe(item.expectedMax);
            expect(thumb.getAttribute("aria-valuenow")).toBe(item.expectedNow);
            expect(thumb.getAttribute("aria-valuetext")).toBe(item.expectedText);
        }

        unmount(instance);
    });

    test("supports standalone bind:value, strict controlled bind:value, onValueChange, and onCommit", () => {
        const bound = $state({ value: 120 });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const bindInstance = mount(ColorSliderTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return bound.value;
                },
                set value(next: number | undefined) {
                    if (next !== undefined) {
                        bound.value = next;
                    }
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, track, thumb } = getSliderElements(container);
        expect(thumb.getAttribute("aria-valuenow")).toBe("120");
        mockTrackRect(track, { left: 0, top: 0, width: 200, height: 12 });

        dispatchPointer(root, "pointerdown", { clientX: 100 });
        expect(bound.value).toBe(180);
        expect(thumb.getAttribute("aria-valuenow")).toBe("180");
        expect(onValueChange).toHaveBeenCalledWith(180);
        expect(onCommit).not.toHaveBeenCalled();

        dispatchPointer(root, "pointerup", { clientX: 100 });
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith(180);

        dispatchKey(thumb, "ArrowRight");
        expect(bound.value).toBe(181);
        expect(onValueChange).toHaveBeenLastCalledWith(181);
        expect(onCommit).toHaveBeenLastCalledWith(181);

        unmount(bindInstance);

        // Strict controlled getter/no-op setter: callbacks fire, but DOM stays pinned to strictValue.
        const strict = $state({ value: 90 });
        const strictChange = vi.fn();
        const strictCommit = vi.fn();
        const strictInstance = mount(ColorSliderTestHost, {
            target: container,
            props: {
                bindMode: "strict",
                channel: "hue",
                get strictValue() {
                    return strict.value;
                },
                onValueChange: strictChange,
                onCommit: strictCommit,
            },
        });
        flushSync();

        const strictEls = getSliderElements(container);
        expect(strictEls.thumb.getAttribute("aria-valuenow")).toBe("90");
        dispatchKey(strictEls.thumb, "ArrowRight");
        expect(strictChange).toHaveBeenCalledWith(91);
        expect(strictCommit).toHaveBeenCalledWith(91);
        expect(strictEls.thumb.getAttribute("aria-valuenow")).toBe("90");

        strict.value = 270;
        flushSync();
        expect(strictEls.thumb.getAttribute("aria-valuenow")).toBe("270");

        unmount(strictInstance);
    });

    test("works uncontrolled without value prop, falls back to color prop, and updates live gradient/thumb styles", () => {
        let color = $state<string | undefined>("#ff0000");
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorSlider, {
            target: container,
            props: {
                size: "md",
                channel: "red",
                get color() {
                    return color;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, track, thumb } = getSliderElements(container);
        expect(thumb.getAttribute("aria-valuenow")).toBe("255");
        expect(thumb.style.getPropertyValue("--cs-color-slider-progress")).toBe("1");

        const initialGradient = root.style.getPropertyValue("--cs-color-slider-gradient");
        const initialThumbFill = root.style.getPropertyValue("--cs-color-slider-thumb-bg");
        expect(initialGradient).toContain("linear-gradient(");
        expect(initialThumbFill).not.toBe("");

        // Changing color prop updates gradient and thumb fill when value is uncontrolled.
        color = "#0080ff";
        flushSync();
        expect(thumb.getAttribute("aria-valuenow")).toBe("0");
        expect(thumb.style.getPropertyValue("--cs-color-slider-progress")).toBe("0");
        const blueGradient = root.style.getPropertyValue("--cs-color-slider-gradient");
        const blueThumbFill = root.style.getPropertyValue("--cs-color-slider-thumb-bg");
        expect(blueGradient).not.toBe(initialGradient);
        expect(blueThumbFill).not.toBe(initialThumbFill);

        // Keyboard stepping transitions into internalValue and updates thumb progress & fill.
        dispatchKey(thumb, "End");
        expect(thumb.getAttribute("aria-valuenow")).toBe("255");
        expect(thumb.style.getPropertyValue("--cs-color-slider-progress")).toBe("1");
        expect(onValueChange).toHaveBeenLastCalledWith(255);
        expect(onCommit).toHaveBeenLastCalledWith(255);
        expect(root.style.getPropertyValue("--cs-color-slider-thumb-bg")).not.toBe(blueThumbFill);

        // Pointer drag also updates uncontrolled internal value.
        mockTrackRect(track, { left: 0, top: 0, width: 255, height: 12 });
        dispatchPointer(root, "pointerdown", { clientX: 51 });
        expect(thumb.getAttribute("aria-valuenow")).toBe("51");
        expect(thumb.style.getPropertyValue("--cs-color-slider-progress")).toBe("0.2");
        dispatchPointer(root, "pointerup", { clientX: 51 });
        expect(onCommit).toHaveBeenLastCalledWith(51);

        unmount(instance);
    });

    test("integrates with ColorPickerContext for reads, commit=false/true writes, and disabled/readonly/invalid", () => {
        const picker = $state({
            value: "#ff0000",
            disabled: false,
            readonly: false,
            invalid: false,
        });
        const setChannelSpy = vi.fn();

        const instance = mount(ColorSliderTestHost, {
            target: container,
            props: {
                withPicker: true,
                channel: "hue",
                get pickerValue() {
                    return picker.value;
                },
                set pickerValue(next: string) {
                    picker.value = next;
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
                onPickerSetChannel: setChannelSpy,
            },
        });
        flushSync();

        const { root, track, thumb } = getSliderElements(container);
        expect(thumb.getAttribute("aria-valuenow")).toBe("0");

        mockTrackRect(track, { left: 0, top: 0, width: 360, height: 12 });
        dispatchPointer(root, "pointerdown", { clientX: 90 });
        expect(setChannelSpy).toHaveBeenCalledWith("hue", 90, { commit: false });
        expect(thumb.getAttribute("aria-valuenow")).toBe("90");

        dispatchPointer(root, "pointermove", { clientX: 180 });
        expect(setChannelSpy).toHaveBeenLastCalledWith("hue", 180, { commit: false });
        expect(thumb.getAttribute("aria-valuenow")).toBe("180");

        dispatchPointer(root, "pointerup", { clientX: 180 });
        expect(setChannelSpy).toHaveBeenLastCalledWith("hue", 180, { commit: true });

        dispatchKey(thumb, "ArrowRight");
        expect(setChannelSpy).toHaveBeenLastCalledWith("hue", 181, { commit: true });

        // External pickerValue update reflects in slider.
        picker.value = "#00ff00";
        flushSync();
        expect(thumb.getAttribute("aria-valuenow")).toBe("120");

        // Context readonly blocks interaction.
        setChannelSpy.mockClear();
        picker.readonly = true;
        flushSync();
        expect(root.dataset.readonly).toBe("");
        expect(thumb.getAttribute("aria-readonly")).toBe("true");
        dispatchKey(thumb, "ArrowRight");
        dispatchPointer(root, "pointerdown", { clientX: 60 });
        expect(setChannelSpy).not.toHaveBeenCalled();

        // Context disabled & invalid propagate to root and thumb.
        picker.readonly = false;
        picker.disabled = true;
        picker.invalid = true;
        flushSync();
        expect(root.dataset.disabled).toBe("");
        expect(root.dataset.invalid).toBe("");
        expect(thumb.getAttribute("aria-disabled")).toBe("true");
        expect(thumb.getAttribute("aria-invalid")).toBe("true");
        expect(thumb.getAttribute("tabindex")).toBe("-1");
        dispatchKey(thumb, "ArrowRight");
        dispatchPointer(root, "pointerdown", { clientX: 60 });
        expect(setChannelSpy).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("handles pointer drag across horizontal, RTL, vertical, inverted, pointercancel, and lostpointercapture", () => {
        const state = $state({
            value: 0,
            orientation: "horizontal" as ColorSliderOrientation,
            inverted: false,
        });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorSliderTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return state.value;
                },
                set value(next: number | undefined) {
                    if (next !== undefined) {
                        state.value = next;
                    }
                },
                get orientation() {
                    return state.orientation;
                },
                get inverted() {
                    return state.inverted;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, track, thumb } = getSliderElements(container);
        mockTrackRect(track, { left: 10, top: 20, width: 200, height: 100 });

        // Non-primary pointer button is ignored.
        dispatchPointer(root, "pointerdown", { button: 2, clientX: 110 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onValueChange).not.toHaveBeenCalled();

        // Horizontal LTR: left = min (0), right = max (360).
        dispatchPointer(root, "pointerdown", { pointerId: 1, clientX: 10 });
        expect(root.dataset.dragging).toBe("");
        expect(document.activeElement).toBe(thumb);
        expect(state.value).toBe(0);

        // Mismatched pointerId is ignored during drag.
        dispatchPointer(root, "pointermove", { pointerId: 2, clientX: 210 });
        expect(state.value).toBe(0);

        dispatchPointer(root, "pointermove", { pointerId: 1, clientX: 210 });
        expect(state.value).toBe(360);
        expect(onCommit).not.toHaveBeenCalled();

        dispatchPointer(root, "pointerup", { pointerId: 1, clientX: 210 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenLastCalledWith(360);

        // Horizontal RTL: left = max (360), right = min (0), gradient direction = "to left".
        root.style.direction = "rtl";
        dispatchPointer(root, "pointerdown", { pointerId: 3, clientX: 10 });
        expect(state.value).toBe(360);
        expect(root.style.getPropertyValue("--cs-color-slider-gradient")).toContain("to left");
        dispatchPointer(root, "pointercancel", { pointerId: 3 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onCommit).toHaveBeenLastCalledWith(360);

        // Vertical non-inverted: bottom = min (0), top = max (360).
        root.style.direction = "ltr";
        state.orientation = "vertical";
        flushSync();
        dispatchPointer(root, "pointerdown", { pointerId: 4, clientY: 120 });
        expect(state.value).toBe(0);
        dispatchPointer(root, "pointermove", { pointerId: 4, clientY: 20 });
        expect(state.value).toBe(360);
        dispatchPointer(root, "lostpointercapture", { pointerId: 4 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onCommit).toHaveBeenLastCalledWith(360);

        // Vertical inverted: top = min (0), bottom = max (360).
        state.inverted = true;
        flushSync();
        dispatchPointer(root, "pointerdown", { pointerId: 5, clientY: 20 });
        expect(state.value).toBe(0);
        dispatchPointer(root, "pointermove", { pointerId: 5, clientY: 120 });
        expect(state.value).toBe(360);
        dispatchPointer(root, "pointerup", { pointerId: 5 });

        // Horizontal inverted: left = max (360), right = min (0).
        state.orientation = "horizontal";
        flushSync();
        dispatchPointer(root, "pointerdown", { pointerId: 6, clientX: 10 });
        expect(state.value).toBe(360);
        dispatchPointer(root, "pointermove", { pointerId: 6, clientX: 210 });
        expect(state.value).toBe(0);
        dispatchPointer(root, "pointerup", { pointerId: 6 });

        unmount(instance);
    });

    test("supports keyboard stepping, inverted/RTL axes, unrecognized key pass-through, and disabled/readonly guards", () => {
        const state = $state({
            value: 180,
            inverted: false,
            disabled: false,
            readonly: false,
        });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const instance = mount(ColorSliderTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                channel: "hue",
                get value() {
                    return state.value;
                },
                set value(next: number | undefined) {
                    if (next !== undefined) {
                        state.value = next;
                    }
                },
                get inverted() {
                    return state.inverted;
                },
                get disabled() {
                    return state.disabled;
                },
                get readonly() {
                    return state.readonly;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, thumb } = getSliderElements(container);

        const enterEvent = dispatchKey(thumb, "Enter");
        expect(enterEvent.defaultPrevented).toBe(false);
        expect(onValueChange).not.toHaveBeenCalled();
        expect(onCommit).not.toHaveBeenCalled();

        dispatchKey(thumb, "ArrowRight");
        expect(state.value).toBe(181);
        dispatchKey(thumb, "ArrowLeft");
        expect(state.value).toBe(180);
        dispatchKey(thumb, "ArrowUp");
        expect(state.value).toBe(181);
        dispatchKey(thumb, "ArrowDown");
        expect(state.value).toBe(180);
        dispatchKey(thumb, "PageUp");
        expect(state.value).toBe(195);
        dispatchKey(thumb, "PageDown");
        expect(state.value).toBe(180);
        dispatchKey(thumb, "Home");
        expect(state.value).toBe(0);
        dispatchKey(thumb, "End");
        expect(state.value).toBe(360);

        // Inverted reverses all stepping keys and Home/End.
        state.value = 180;
        state.inverted = true;
        flushSync();
        dispatchKey(thumb, "ArrowRight");
        expect(state.value).toBe(179);
        dispatchKey(thumb, "ArrowUp");
        expect(state.value).toBe(178);
        dispatchKey(thumb, "PageUp");
        expect(state.value).toBe(163);
        dispatchKey(thumb, "Home");
        expect(state.value).toBe(360);
        dispatchKey(thumb, "End");
        expect(state.value).toBe(0);

        // RTL reverses ArrowRight/ArrowLeft.
        state.inverted = false;
        state.value = 180;
        root.style.direction = "rtl";
        flushSync();
        dispatchKey(thumb, "ArrowRight");
        expect(state.value).toBe(179);
        dispatchKey(thumb, "ArrowLeft");
        expect(state.value).toBe(180);

        // Readonly and disabled guard keyboard stepping.
        onValueChange.mockClear();
        onCommit.mockClear();
        state.readonly = true;
        flushSync();
        const readonlyEvent = dispatchKey(thumb, "ArrowRight");
        expect(readonlyEvent.defaultPrevented).toBe(false);
        expect(state.value).toBe(180);
        expect(onValueChange).not.toHaveBeenCalled();

        state.readonly = false;
        state.disabled = true;
        flushSync();
        const disabledEvent = dispatchKey(thumb, "Home");
        expect(disabledEvent.defaultPrevented).toBe(false);
        expect(state.value).toBe(180);
        expect(onCommit).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("tracks data-pointer-focus on pointerdown/blur and supports bind:ref and class", () => {
        const state = $state<{ ref: HTMLDivElement | null }>({ ref: null });

        const instance = mount(ColorSliderTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                value: 180,
                get ref() {
                    return state.ref;
                },
                set ref(next) {
                    state.ref = next;
                },
                sliderAttrs: {
                    class: "custom-slider",
                },
            },
        });
        flushSync();

        const { root, thumb } = getSliderElements(container);
        expect(state.ref).toBe(root);
        expect(root.classList.contains("cs-color-slider")).toBe(true);
        expect(root.classList.contains("custom-slider")).toBe(true);
        expect(thumb.dataset.pointerFocus).toBeUndefined();

        dispatchPointer(root, "pointerdown", { clientX: 50 });
        expect(thumb.dataset.pointerFocus).toBe("");

        thumb.dispatchEvent(new FocusEvent("blur"));
        flushSync();
        expect(thumb.dataset.pointerFocus).toBeUndefined();

        unmount(instance);
    });
});
