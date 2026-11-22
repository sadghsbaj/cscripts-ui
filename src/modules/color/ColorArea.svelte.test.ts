import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorAreaTestHost from "./ColorAreaTestHost.internal.svelte";
import {
    COLOR_AREA_SIZES,
    ColorArea,
    type ColorAreaSize,
    type ColorChannel,
} from "./index.ts";

function getAreaElements(container: HTMLElement): {
    root: HTMLDivElement;
    surface: HTMLDivElement;
    thumb: HTMLDivElement;
} {
    const root = container.querySelector<HTMLDivElement>(".cs-color-area");
    const surface = container.querySelector<HTMLDivElement>(".cs-color-area-surface");
    const thumb = container.querySelector<HTMLDivElement>(".cs-color-area-thumb");
    if (!root || !surface || !thumb) {
        throw new Error("Expected ColorArea root, surface, and thumb elements to be mounted");
    }
    return { root, surface, thumb };
}

function mockSurfaceRect(
    surface: HTMLDivElement,
    rect: { left: number; top: number; width: number; height: number }
): void {
    vi.spyOn(surface, "getBoundingClientRect").mockReturnValue({
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

describe("ColorArea Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders sizes xs-xl, channel attributes, data-alpha, invalid/disabled/readonly, class, bind:ref, and ARIA slider semantics", () => {
        expect(COLOR_AREA_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);

        let size = $state<ColorAreaSize>("xs");
        let xChannel = $state<ColorChannel | undefined>();
        let yChannel = $state<ColorChannel | undefined>();
        let invalid = $state(false);
        let disabled = $state(false);
        let readonly = $state(false);
        const refState = $state<{ ref: HTMLDivElement | null }>({ ref: null });

        const instance = mount(ColorArea, {
            target: container,
            props: {
                get size() {
                    return size;
                },
                get xChannel() {
                    return xChannel;
                },
                get yChannel() {
                    return yChannel;
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
                get ref() {
                    return refState.ref;
                },
                set ref(next) {
                    refState.ref = next;
                },
                class: "custom-area",
            },
        });
        flushSync();

        for (const nextSize of COLOR_AREA_SIZES) {
            size = nextSize;
            flushSync();
            const { root } = getAreaElements(container);
            expect(root.dataset.size).toBe(nextSize);
        }

        const { root, surface, thumb } = getAreaElements(container);
        expect(refState.ref).toBe(root);
        expect(root.classList.contains("cs-color-area")).toBe(true);
        expect(root.classList.contains("custom-area")).toBe(true);
        expect(surface.getAttribute("aria-hidden")).toBe("true");
        expect(thumb.getAttribute("role")).toBe("slider");
        expect(thumb.getAttribute("tabindex")).toBe("0");
        expect(thumb.getAttribute("aria-roledescription")).toBe("2D color area");
        expect(root.dataset.xChannel).toBe("saturation");
        expect(root.dataset.yChannel).toBe("value");
        expect(root.dataset.alpha).toBeUndefined();
        expect(root.dataset.invalid).toBeUndefined();
        expect(root.dataset.disabled).toBeUndefined();
        expect(root.dataset.readonly).toBeUndefined();
        expect(thumb.getAttribute("aria-disabled")).toBeNull();
        expect(thumb.getAttribute("aria-readonly")).toBeNull();
        expect(thumb.getAttribute("aria-invalid")).toBeNull();

        xChannel = "hue";
        yChannel = "alpha";
        invalid = true;
        disabled = true;
        readonly = true;
        flushSync();

        expect(root.dataset.xChannel).toBe("hue");
        expect(root.dataset.yChannel).toBe("alpha");
        expect(root.dataset.alpha).toBe("");
        expect(root.dataset.invalid).toBe("");
        expect(root.dataset.disabled).toBe("");
        expect(root.dataset.readonly).toBe("");
        expect(thumb.getAttribute("tabindex")).toBe("-1");
        expect(thumb.getAttribute("aria-disabled")).toBe("true");
        expect(thumb.getAttribute("aria-readonly")).toBe("true");
        expect(thumb.getAttribute("aria-invalid")).toBe("true");

        unmount(instance);
    });

    test("resolves aria-label and aria-labelledby cleanly on the slider thumb", () => {
        let xChannel = $state<ColorChannel | undefined>();
        let yChannel = $state<ColorChannel | undefined>();
        let label = $state<string | undefined>();
        let ariaLabel = $state<string | undefined>();
        let ariaLabelledBy = $state<string | undefined>();

        const instance = mount(ColorArea, {
            target: container,
            props: {
                size: "md",
                get xChannel() {
                    return xChannel;
                },
                get yChannel() {
                    return yChannel;
                },
                get label() {
                    return label;
                },
                get "aria-label"() {
                    return ariaLabel;
                },
                get "aria-labelledby"() {
                    return ariaLabelledBy;
                },
            },
        });
        flushSync();

        const { thumb } = getAreaElements(container);
        expect(thumb.getAttribute("aria-label")).toBe("Saturation and Value");
        expect(thumb.getAttribute("aria-labelledby")).toBeNull();

        xChannel = "red";
        yChannel = "blue";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBe("Red and Blue");

        ariaLabelledBy = "external-area-label";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBeNull();
        expect(thumb.getAttribute("aria-labelledby")).toBe("external-area-label");

        ariaLabel = "Custom 2D plane";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBe("Custom 2D plane");
        expect(thumb.getAttribute("aria-labelledby")).toBeNull();

        label = "Explicit label prop";
        flushSync();
        expect(thumb.getAttribute("aria-label")).toBe("Explicit label prop");
        expect(thumb.getAttribute("aria-labelledby")).toBeNull();

        unmount(instance);
    });

    test("resolves default channels by ColorPickerContext space and switches between CSS layers and canvas plane", () => {
        let pickerSpace = $state<"hsv" | "hsl" | "oklch">("hsv");
        let xChannel = $state<ColorChannel | undefined>();
        let yChannel = $state<ColorChannel | undefined>();

        const instance = mount(ColorAreaTestHost, {
            target: container,
            props: {
                withPicker: true,
                get pickerSpace() {
                    return pickerSpace;
                },
                get xChannel() {
                    return xChannel;
                },
                get yChannel() {
                    return yChannel;
                },
            },
        });
        flushSync();

        const { root, surface } = getAreaElements(container);
        // HSV default: saturation × value with 1 combined CSS layer
        expect(root.dataset.xChannel).toBe("saturation");
        expect(root.dataset.yChannel).toBe("value");
        const hsvLayers = surface.querySelectorAll<HTMLElement>(".cs-color-area-layer");
        expect(hsvLayers).toHaveLength(1);
        expect(hsvLayers[0]?.style.backgroundImage).toContain("#000");
        expect(hsvLayers[0]?.style.backgroundImage).toContain("#fff");
        expect(surface.querySelector(".cs-color-area-canvas")).toBeNull();

        // HSL space: hsl-saturation × lightness with 3 CSS layers
        pickerSpace = "hsl";
        flushSync();
        expect(root.dataset.xChannel).toBe("hsl-saturation");
        expect(root.dataset.yChannel).toBe("lightness");
        expect(surface.querySelectorAll(".cs-color-area-layer")).toHaveLength(3);
        expect(surface.querySelector(".cs-color-area-canvas")).toBeNull();

        // OKLCH space: chroma × oklch-lightness with canvas fallback
        pickerSpace = "oklch";
        flushSync();
        expect(root.dataset.xChannel).toBe("chroma");
        expect(root.dataset.yChannel).toBe("oklch-lightness");
        expect(surface.querySelectorAll(".cs-color-area-layer")).toHaveLength(0);
        expect(surface.querySelector(".cs-color-area-canvas")).not.toBeNull();

        // Explicit xChannel/yChannel override even inside oklch space -> RGB CSS fast-path
        xChannel = "red";
        yChannel = "green";
        flushSync();
        expect(root.dataset.xChannel).toBe("red");
        expect(root.dataset.yChannel).toBe("green");
        expect(surface.querySelectorAll(".cs-color-area-layer")).toHaveLength(2);
        expect(surface.querySelector(".cs-color-area-canvas")).toBeNull();

        unmount(instance);
    });

    test("supports standalone bind:xValue/bind:yValue, strict controlled mode, uncontrolled mode, color fallback, and live thumb styles", () => {
        // 1) Controlled bind:xValue + bind:yValue + clamping + live styles
        const bindState = $state({ xValue: 50, yValue: 75 });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const boundHost = mount(ColorAreaTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                color: "#ef4444",
                get xValue() {
                    return bindState.xValue;
                },
                set xValue(next) {
                    bindState.xValue = next;
                },
                get yValue() {
                    return bindState.yValue;
                },
                set yValue(next) {
                    bindState.yValue = next;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, thumb: boundThumb } = getAreaElements(container);
        expect(boundThumb.getAttribute("aria-valuemin")).toBe("0");
        expect(boundThumb.getAttribute("aria-valuemax")).toBe("100");
        expect(boundThumb.getAttribute("aria-valuenow")).toBe("50");
        expect(boundThumb.getAttribute("aria-valuetext")).toBe("Saturation 50%, Value 75%");
        expect(boundThumb.style.getPropertyValue("--cs-color-area-x-progress")).toBe("0.5");
        expect(boundThumb.style.getPropertyValue("--cs-color-area-y-progress")).toBe("0.75");
        expect(root.style.getPropertyValue("--cs-color-area-thumb-bg")).toContain("rgb(");

        // Out-of-range values clamp cleanly
        bindState.xValue = 140;
        bindState.yValue = -20;
        flushSync();
        expect(boundThumb.getAttribute("aria-valuenow")).toBe("100");
        expect(boundThumb.getAttribute("aria-valuetext")).toBe("Saturation 100%, Value 0%");

        // NaN falls back to channel defaultValue (0)
        bindState.xValue = NaN;
        flushSync();
        expect(boundThumb.getAttribute("aria-valuenow")).toBe("0");

        dispatchKey(boundThumb, "ArrowRight");
        expect(bindState.xValue).toBe(1);
        expect(onValueChange).toHaveBeenCalledWith(1, 0);
        expect(onCommit).toHaveBeenCalledWith(1, 0);

        unmount(boundHost);
        container.replaceChildren();

        // 2) Strict controlled mode (bind:xValue={() => v, () => {}}): rejects internal mutation
        const strictOnChange = vi.fn();
        const strictHost = mount(ColorAreaTestHost, {
            target: container,
            props: {
                bindMode: "strict",
                strictXValue: 40,
                strictYValue: 60,
                onValueChange: strictOnChange,
            },
        });
        flushSync();

        const { thumb: strictThumb } = getAreaElements(container);
        dispatchKey(strictThumb, "ArrowRight");
        expect(strictOnChange).toHaveBeenCalledWith(41, 60);
        expect(strictThumb.getAttribute("aria-valuenow")).toBe("40");
        expect(strictThumb.getAttribute("aria-valuetext")).toBe("Saturation 40%, Value 60%");

        unmount(strictHost);
        container.replaceChildren();

        // 3) Uncontrolled mode with color fallback (#ff0000 -> S=100%, V=100%)
        const uncontrolledOnChange = vi.fn();
        const uncontrolledOnCommit = vi.fn();
        const uncontrolledHost = mount(ColorAreaTestHost, {
            target: container,
            props: {
                bindMode: "none",
                color: "#ff0000",
                onValueChange: uncontrolledOnChange,
                onCommit: uncontrolledOnCommit,
            },
        });
        flushSync();

        const { surface, thumb } = getAreaElements(container);
        expect(thumb.getAttribute("aria-valuetext")).toBe("Saturation 100%, Value 100%");
        expect(thumb.style.getPropertyValue("--cs-color-area-x-progress")).toBe("1");
        expect(thumb.style.getPropertyValue("--cs-color-area-y-progress")).toBe("1");

        // Keyboard stepping updates uncontrolled internal state
        dispatchKey(thumb, "ArrowLeft");
        expect(thumb.getAttribute("aria-valuetext")).toBe("Saturation 99%, Value 100%");
        expect(thumb.style.getPropertyValue("--cs-color-area-x-progress")).toBe("0.99");
        expect(uncontrolledOnChange).toHaveBeenCalledWith(99, 100);
        expect(uncontrolledOnCommit).toHaveBeenCalledWith(99, 100);

        // Pointer drag updates uncontrolled internal state
        mockSurfaceRect(surface, { left: 0, top: 0, width: 200, height: 100 });
        dispatchPointer(surface, "pointerdown", { pointerId: 1, clientX: 50, clientY: 50 });
        expect(thumb.getAttribute("aria-valuetext")).toBe("Saturation 25%, Value 50%");
        expect(thumb.style.getPropertyValue("--cs-color-area-x-progress")).toBe("0.25");
        expect(thumb.style.getPropertyValue("--cs-color-area-y-progress")).toBe("0.5");
        dispatchPointer(surface, "pointerup", { pointerId: 1, clientX: 50, clientY: 50 });
        expect(uncontrolledOnCommit).toHaveBeenLastCalledWith(25, 50);

        unmount(uncontrolledHost);
    });

    test("integrates with ColorPickerContext: atomic setChannels, commit flags, bidirectional sync, and context flags", () => {
        const pickerState = $state({
            value: "#ff0000",
            disabled: false,
            readonly: false,
            invalid: false,
        });
        const onPickerSetChannels = vi.fn();

        const host = mount(ColorAreaTestHost, {
            target: container,
            props: {
                withPicker: true,
                get pickerValue() {
                    return pickerState.value;
                },
                set pickerValue(next) {
                    pickerState.value = next;
                },
                get pickerDisabled() {
                    return pickerState.disabled;
                },
                get pickerReadonly() {
                    return pickerState.readonly;
                },
                get pickerInvalid() {
                    return pickerState.invalid;
                },
                onPickerSetChannels,
            },
        });
        flushSync();

        const { root, surface, thumb } = getAreaElements(container);
        expect(thumb.getAttribute("aria-valuetext")).toBe("Saturation 100%, Value 100%");

        // External pickerValue update reflects in ColorArea
        pickerState.value = "#804040";
        flushSync();
        expect(thumb.getAttribute("aria-valuetext")).toBe("Saturation 50%, Value 50%");

        // Pointer drag calls atomic setChannels({ saturation, value }, { commit: false })
        mockSurfaceRect(surface, { left: 0, top: 0, width: 100, height: 100 });
        dispatchPointer(root, "pointerdown", { pointerId: 2, clientX: 80, clientY: 20 });
        expect(onPickerSetChannels).toHaveBeenLastCalledWith(
            { saturation: 80, value: 80 },
            { commit: false }
        );
        expect(pickerState.value).not.toBe("#804040");

        // Pointer up commits atomically
        dispatchPointer(root, "pointerup", { pointerId: 2, clientX: 80, clientY: 20 });
        expect(onPickerSetChannels).toHaveBeenLastCalledWith(
            { saturation: 80, value: 80 },
            { commit: true }
        );

        // Keyboard stepping commits atomically
        dispatchKey(thumb, "ArrowLeft");
        expect(onPickerSetChannels).toHaveBeenLastCalledWith(
            { saturation: 79, value: 80 },
            { commit: true }
        );

        // Respects pickerCtx.disabled, pickerCtx.readonly, pickerCtx.invalid
        pickerState.invalid = true;
        pickerState.readonly = true;
        flushSync();
        expect(root.dataset.invalid).toBe("");
        expect(root.dataset.readonly).toBe("");
        expect(thumb.getAttribute("aria-invalid")).toBe("true");
        expect(thumb.getAttribute("aria-readonly")).toBe("true");

        const callsBeforeReadonly = onPickerSetChannels.mock.calls.length;
        dispatchKey(thumb, "ArrowRight");
        dispatchPointer(root, "pointerdown", { pointerId: 3, clientX: 10, clientY: 10 });
        expect(onPickerSetChannels).toHaveBeenCalledTimes(callsBeforeReadonly);

        pickerState.readonly = false;
        pickerState.disabled = true;
        flushSync();
        expect(root.dataset.disabled).toBe("");
        expect(thumb.getAttribute("tabindex")).toBe("-1");
        expect(thumb.getAttribute("aria-disabled")).toBe("true");
        dispatchKey(thumb, "ArrowRight");
        expect(onPickerSetChannels).toHaveBeenCalledTimes(callsBeforeReadonly);

        unmount(host);
    });

    test("handles 2D pointer drag lifecycle, LTR/RTL X-axis, inverted-Y surface mapping, pointercancel, lostpointercapture, and pointer-focus", () => {
        const state = $state({ xValue: 50, yValue: 50 });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const host = mount(ColorAreaTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get xValue() {
                    return state.xValue;
                },
                set xValue(next) {
                    state.xValue = next;
                },
                get yValue() {
                    return state.yValue;
                },
                set yValue(next) {
                    state.yValue = next;
                },
                onValueChange,
                onCommit,
            },
        });
        flushSync();

        const { root, surface, thumb } = getAreaElements(container);
        mockSurfaceRect(surface, { left: 10, top: 20, width: 200, height: 100 });

        // Non-primary button ignored
        dispatchPointer(root, "pointerdown", { pointerId: 1, button: 2, clientX: 50, clientY: 50 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onValueChange).not.toHaveBeenCalled();

        // Primary pointerdown: top-left (10, 20) -> X=0 (min), Y=100 (max)
        dispatchPointer(root, "pointerdown", { pointerId: 1, clientX: 10, clientY: 20 });
        expect(root.dataset.dragging).toBe("");
        expect(thumb.dataset.pointerFocus).toBe("");
        expect(document.activeElement).toBe(thumb);
        expect(state.xValue).toBe(0);
        expect(state.yValue).toBe(100);
        expect(onCommit).not.toHaveBeenCalled();

        // Mismatched pointerId move/up is ignored
        dispatchPointer(root, "pointermove", { pointerId: 99, clientX: 210, clientY: 120 });
        expect(state.xValue).toBe(0);
        expect(state.yValue).toBe(100);

        // Move outside bounds clamps to bottom-right -> X=100 (max), Y=0 (min)
        dispatchPointer(root, "pointermove", { pointerId: 1, clientX: 400, clientY: 300 });
        expect(state.xValue).toBe(100);
        expect(state.yValue).toBe(0);
        expect(onCommit).not.toHaveBeenCalled();

        // Pointerup commits lastDraggedX/Y
        dispatchPointer(root, "pointerup", { pointerId: 1, clientX: 400, clientY: 300 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenLastCalledWith(100, 0);

        // Blur clears data-pointer-focus
        thumb.dispatchEvent(new FocusEvent("blur"));
        flushSync();
        expect(thumb.dataset.pointerFocus).toBeUndefined();

        // Pointercancel commits and clears dragging
        dispatchPointer(root, "pointerdown", { pointerId: 2, clientX: 110, clientY: 70 });
        expect(state.xValue).toBe(50);
        expect(state.yValue).toBe(50);
        dispatchPointer(root, "pointercancel", { pointerId: 2, clientX: 110, clientY: 70 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onCommit).toHaveBeenCalledTimes(2);
        expect(onCommit).toHaveBeenLastCalledWith(50, 50);

        // Lostpointercapture commits and clears dragging
        dispatchPointer(root, "pointerdown", { pointerId: 3, clientX: 60, clientY: 45 });
        expect(state.xValue).toBe(25);
        expect(state.yValue).toBe(75);
        dispatchPointer(root, "lostpointercapture", { pointerId: 3 });
        expect(root.dataset.dragging).toBeUndefined();
        expect(onCommit).toHaveBeenCalledTimes(3);
        expect(onCommit).toHaveBeenLastCalledWith(25, 75);

        // RTL reverses X-axis: left edge = max (100), right edge = min (0), Y stays top=max
        root.style.direction = "rtl";
        dispatchPointer(root, "pointerdown", { pointerId: 4, clientX: 10, clientY: 20 });
        expect(state.xValue).toBe(100);
        expect(state.yValue).toBe(100);
        dispatchPointer(root, "pointermove", { pointerId: 4, clientX: 210, clientY: 120 });
        expect(state.xValue).toBe(0);
        expect(state.yValue).toBe(0);
        dispatchPointer(root, "pointerup", { pointerId: 4, clientX: 210, clientY: 120 });

        unmount(host);
    });

    test("handles 2D keyboard stepping (Arrows, Shift+Arrows, PageUp/PageDown, Home/End, Shift+Home/End, RTL, and guards)", () => {
        const state = $state({ xValue: 50, yValue: 50, disabled: false, readonly: false });
        const onValueChange = vi.fn();
        const onCommit = vi.fn();

        const host = mount(ColorAreaTestHost, {
            target: container,
            props: {
                bindMode: "bind",
                get xValue() {
                    return state.xValue;
                },
                set xValue(next) {
                    state.xValue = next;
                },
                get yValue() {
                    return state.yValue;
                },
                set yValue(next) {
                    state.yValue = next;
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

        const { root, thumb } = getAreaElements(container);

        // ArrowRight / ArrowLeft (±step = 1)
        const rightEv = dispatchKey(thumb, "ArrowRight");
        expect(rightEv.defaultPrevented).toBe(true);
        expect(state.xValue).toBe(51);
        expect(state.yValue).toBe(50);
        expect(onCommit).toHaveBeenLastCalledWith(51, 50);

        dispatchKey(thumb, "ArrowLeft");
        expect(state.xValue).toBe(50);

        // Shift+ArrowRight / Shift+ArrowLeft (±largeStep = 10)
        dispatchKey(thumb, "ArrowRight", { shiftKey: true });
        expect(state.xValue).toBe(60);
        dispatchKey(thumb, "ArrowLeft", { shiftKey: true });
        expect(state.xValue).toBe(50);

        // ArrowUp / ArrowDown (±step = 1) and Shift+ArrowUp / Shift+ArrowDown (±largeStep = 10)
        dispatchKey(thumb, "ArrowUp");
        expect(state.yValue).toBe(51);
        dispatchKey(thumb, "ArrowDown");
        expect(state.yValue).toBe(50);
        dispatchKey(thumb, "ArrowUp", { shiftKey: true });
        expect(state.yValue).toBe(60);
        dispatchKey(thumb, "ArrowDown", { shiftKey: true });
        expect(state.yValue).toBe(50);

        // PageUp / PageDown (Y ±largeStep = 10)
        dispatchKey(thumb, "PageUp");
        expect(state.yValue).toBe(60);
        dispatchKey(thumb, "PageDown");
        expect(state.yValue).toBe(50);

        // Home / End (X min / max)
        dispatchKey(thumb, "Home");
        expect(state.xValue).toBe(0);
        expect(state.yValue).toBe(50);
        dispatchKey(thumb, "End");
        expect(state.xValue).toBe(100);

        // Shift+Home / Shift+End (Y min / max)
        dispatchKey(thumb, "Home", { shiftKey: true });
        expect(state.yValue).toBe(0);
        expect(state.xValue).toBe(100);
        dispatchKey(thumb, "End", { shiftKey: true });
        expect(state.yValue).toBe(100);

        // RTL reverses ArrowRight / ArrowLeft
        state.xValue = 50;
        root.style.direction = "rtl";
        flushSync();
        dispatchKey(thumb, "ArrowRight");
        expect(state.xValue).toBe(49);
        dispatchKey(thumb, "ArrowLeft");
        expect(state.xValue).toBe(50);

        // Unrelated key does not preventDefault or fire callbacks
        const callsBeforeUnknown = onValueChange.mock.calls.length;
        const unknownEv = dispatchKey(thumb, "Enter");
        expect(unknownEv.defaultPrevented).toBe(false);
        expect(onValueChange).toHaveBeenCalledTimes(callsBeforeUnknown);

        // Readonly and disabled guards
        state.readonly = true;
        flushSync();
        dispatchKey(thumb, "ArrowUp");
        expect(onValueChange).toHaveBeenCalledTimes(callsBeforeUnknown);

        state.readonly = false;
        state.disabled = true;
        flushSync();
        dispatchKey(thumb, "ArrowDown");
        expect(onValueChange).toHaveBeenCalledTimes(callsBeforeUnknown);

        unmount(host);
    });
});
