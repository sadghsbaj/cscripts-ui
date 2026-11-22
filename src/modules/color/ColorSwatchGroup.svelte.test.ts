import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorSwatchGroupTestHost, { type GroupSwatchItem } from "./ColorSwatchGroupTestHost.internal.svelte";
import {
    COLOR_SWATCH_GROUP_ORIENTATIONS,
    ColorSwatchGroup,
    formatColor,
    parseColor,
    type ColorSwatchGroupOrientation,
} from "./index.ts";

const DEFAULT_SWATCHES: GroupSwatchItem[] = [
    { id: "red", color: "#ef4444", label: "Red" },
    { id: "green", color: "#22c55e", label: "Green" },
    { id: "blue", color: "#3b82f6", label: "Blue" },
    { id: "amber", color: "#f59e0b", label: "Amber" },
];

function getGroup(container: HTMLElement): HTMLDivElement {
    const group = container.querySelector<HTMLDivElement>(".cs-color-swatch-group");
    if (!group) throw new Error("Expected .cs-color-swatch-group element");
    return group;
}

function getSwatchButton(container: HTMLElement, id: string): HTMLButtonElement {
    const btn = container.querySelector<HTMLButtonElement>(`[data-swatch-id="${CSS.escape(id)}"]`);
    if (!btn) throw new Error(`Expected swatch button with data-swatch-id="${id}"`);
    return btn;
}

function getAllSwatchButtons(container: HTMLElement): HTMLButtonElement[] {
    return [...container.querySelectorAll<HTMLButtonElement>("button.cs-color-swatch")];
}

function dispatchKey(
    target: HTMLElement,
    key: string,
    init: KeyboardEventInit = {}
): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

describe("ColorSwatchGroup Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("renders radiogroup ARIA, orientation, disabled, ref, and layout attributes", () => {
        expect(COLOR_SWATCH_GROUP_ORIENTATIONS).toEqual(["horizontal", "vertical", "both"]);

        let orientation = $state<ColorSwatchGroupOrientation>("both");
        let columns = $state<number | undefined>(undefined);
        let disabled = $state(false);
        let ref = $state<HTMLDivElement | null>(null);

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                swatches: DEFAULT_SWATCHES,
                get orientation() {
                    return orientation;
                },
                get columns() {
                    return columns;
                },
                get disabled() {
                    return disabled;
                },
                get ref() {
                    return ref;
                },
                set ref(next) {
                    ref = next;
                },
                groupAttrs: { "aria-label": "Brand palette", class: "custom-group" },
            },
        });
        flushSync();

        const group = getGroup(container);
        expect(ref).toBe(group);
        expect(group.getAttribute("role")).toBe("radiogroup");
        expect(group.getAttribute("aria-label")).toBe("Brand palette");
        expect(group.classList.contains("cs-color-swatch-group")).toBe(true);
        expect(group.classList.contains("custom-group")).toBe(true);
        expect(group.dataset.orientation).toBe("both");
        expect(group.hasAttribute("aria-orientation")).toBe(false);
        expect(group.dataset.layout).toBe("flex");
        expect(group.dataset.columns).toBeUndefined();
        expect(group.style.getPropertyValue("--cs-color-swatch-group-columns")).toBe("");
        expect(group.hasAttribute("aria-disabled")).toBe(false);
        expect(group.dataset.disabled).toBeUndefined();

        orientation = "horizontal";
        flushSync();
        expect(group.dataset.orientation).toBe("horizontal");
        expect(group.getAttribute("aria-orientation")).toBe("horizontal");

        orientation = "vertical";
        flushSync();
        expect(group.dataset.orientation).toBe("vertical");
        expect(group.getAttribute("aria-orientation")).toBe("vertical");

        // Valid columns -> grid layout
        columns = 7;
        flushSync();
        expect(group.dataset.layout).toBe("grid");
        expect(group.dataset.columns).toBe("7");
        expect(group.style.getPropertyValue("--cs-color-swatch-group-columns")).toBe("7");

        // Fractional columns >= 1 are floored
        columns = 3.9;
        flushSync();
        expect(group.dataset.layout).toBe("grid");
        expect(group.dataset.columns).toBe("3");
        expect(group.style.getPropertyValue("--cs-color-swatch-group-columns")).toBe("3");

        // Invalid columns fall back to flex
        for (const invalidColumns of [0, -2, NaN, Infinity]) {
            columns = invalidColumns;
            flushSync();
            expect(group.dataset.layout).toBe("flex");
            expect(group.dataset.columns).toBeUndefined();
            expect(group.style.getPropertyValue("--cs-color-swatch-group-columns")).toBe("");
        }

        disabled = true;
        flushSync();
        expect(group.getAttribute("aria-disabled")).toBe("true");
        expect(group.dataset.disabled).toBe("");

        unmount(instance);
    });

    test("supports $bindable value, strict controlled value, and onValueChange across sequential clicks", () => {
        let boundValue = $state<string | undefined>("#ef4444");
        const onValueChange = vi.fn();

        const bindableInstance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                swatches: DEFAULT_SWATCHES,
                get value() {
                    return boundValue;
                },
                set value(next) {
                    boundValue = next;
                },
                onValueChange,
            },
        });
        flushSync();

        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("true");
        expect(getSwatchButton(container, "green").getAttribute("aria-checked")).toBe("false");

        // A -> B
        getSwatchButton(container, "green").click();
        flushSync();
        expect(boundValue).toBe("#22c55e");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith("#22c55e");
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("false");
        expect(getSwatchButton(container, "green").getAttribute("aria-checked")).toBe("true");

        // B -> A
        getSwatchButton(container, "red").click();
        flushSync();
        expect(boundValue).toBe("#ef4444");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onValueChange).toHaveBeenLastCalledWith("#ef4444");

        // External value update
        boundValue = "#3b82f6";
        flushSync();
        expect(getSwatchButton(container, "blue").getAttribute("aria-checked")).toBe("true");
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("false");

        unmount(bindableInstance);

        // Strict controlled mode: getter/setter rejects mutation unless parent updates
        let strictValue = $state("#ef4444");
        const strictChanges = vi.fn();
        const strictInstance = mount(ColorSwatchGroup, {
            target: container,
            props: {
                get value() {
                    return strictValue;
                },
                set value(_next) {
                    // Intentionally ignore internal writes to verify strict controlled mode
                },
                onValueChange: strictChanges,
            },
        });
        flushSync();
        unmount(strictInstance);

        // Verify strict controlled via ColorSwatchGroupTestHost (with swatches)
        const strictHost = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                swatches: DEFAULT_SWATCHES,
                get value() {
                    return strictValue;
                },
                set value(_next) {
                    // Reject direct mutation
                },
                onValueChange: strictChanges,
            },
        });
        flushSync();

        getSwatchButton(container, "green").click();
        flushSync();
        expect(strictChanges).toHaveBeenCalledTimes(1);
        expect(strictChanges).toHaveBeenCalledWith("#22c55e");
        // Selection remains on red until parent updates strictValue
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("true");
        expect(getSwatchButton(container, "green").getAttribute("aria-checked")).toBe("false");

        strictValue = "#22c55e";
        flushSync();
        expect(getSwatchButton(container, "green").getAttribute("aria-checked")).toBe("true");

        unmount(strictHost);
    });

    test("supports uncontrolled standalone mode without a value prop (A -> B -> A)", () => {
        const onValueChange = vi.fn();
        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                useBindValue: false,
                swatches: DEFAULT_SWATCHES,
                onValueChange,
            },
        });
        flushSync();

        const red = getSwatchButton(container, "red");
        const green = getSwatchButton(container, "green");
        const blue = getSwatchButton(container, "blue");

        // Initial mount: no selection, roving tabindex on first enabled swatch
        expect(red.getAttribute("aria-checked")).toBe("false");
        expect(green.getAttribute("aria-checked")).toBe("false");
        expect(red.getAttribute("tabindex")).toBe("0");
        expect(green.getAttribute("tabindex")).toBe("-1");
        expect(blue.getAttribute("tabindex")).toBe("-1");

        // Click A (red)
        red.click();
        flushSync();
        expect(red.getAttribute("aria-checked")).toBe("true");
        expect(green.getAttribute("aria-checked")).toBe("false");
        expect(red.getAttribute("tabindex")).toBe("0");
        expect(green.getAttribute("tabindex")).toBe("-1");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith("#ef4444");

        // Click B (green)
        green.click();
        flushSync();
        expect(red.getAttribute("aria-checked")).toBe("false");
        expect(green.getAttribute("aria-checked")).toBe("true");
        expect(red.getAttribute("tabindex")).toBe("-1");
        expect(green.getAttribute("tabindex")).toBe("0");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onValueChange).toHaveBeenLastCalledWith("#22c55e");

        // Click A (red) again
        red.click();
        flushSync();
        expect(red.getAttribute("aria-checked")).toBe("true");
        expect(green.getAttribute("aria-checked")).toBe("false");
        expect(red.getAttribute("tabindex")).toBe("0");
        expect(green.getAttribute("tabindex")).toBe("-1");
        expect(onValueChange).toHaveBeenCalledTimes(3);
        expect(onValueChange).toHaveBeenLastCalledWith("#ef4444");

        unmount(instance);
    });

    test("matches selected color case-insensitively and perceptually across hex, rgb, oklch, and transparent", () => {
        const parsedRed = parseColor("#ef4444");
        if (!parsedRed) throw new Error("Expected parsedRed");
        const oklchRed = formatColor(parsedRed, "oklch");

        const swatches: GroupSwatchItem[] = [
            { id: "red", color: "#ef4444" },
            { id: "clear", color: "transparent" },
            { id: "blue", color: "#3b82f6" },
        ];

        let value = $state<string | undefined>("#EF4444");
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        // Case-insensitive hex
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("true");

        // Clicking already-selected swatch (even with different case) does not fire onValueChange
        getSwatchButton(container, "red").click();
        flushSync();
        expect(onValueChange).not.toHaveBeenCalled();

        // rgb(...) equivalent
        value = "rgb(239 68 68)";
        flushSync();
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("true");
        getSwatchButton(container, "red").click();
        flushSync();
        expect(onValueChange).not.toHaveBeenCalled();

        // oklch(...) equivalent
        value = oklchRed;
        flushSync();
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("true");
        getSwatchButton(container, "red").click();
        flushSync();
        expect(onValueChange).not.toHaveBeenCalled();

        // transparent vs rgba(0 0 0 / 0)
        value = "rgba(0 0 0 / 0)";
        flushSync();
        expect(getSwatchButton(container, "clear").getAttribute("aria-checked")).toBe("true");
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("false");
        getSwatchButton(container, "clear").click();
        flushSync();
        expect(onValueChange).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("blocks selection on disabled swatches and inside a disabled group", () => {
        const swatches: GroupSwatchItem[] = [
            { id: "red", color: "#ef4444" },
            { id: "green", color: "#22c55e", disabled: true },
            { id: "blue", color: "#3b82f6" },
        ];

        let value = $state<string | undefined>("#ef4444");
        let groupDisabled = $state(false);
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                get disabled() {
                    return groupDisabled;
                },
                onValueChange,
            },
        });
        flushSync();

        const greenBtn = getSwatchButton(container, "green");
        expect(greenBtn.disabled).toBe(true);
        greenBtn.click();
        flushSync();
        expect(value).toBe("#ef4444");
        expect(onValueChange).not.toHaveBeenCalled();

        // Enable group-level disabled
        groupDisabled = true;
        flushSync();

        const blueBtn = getSwatchButton(container, "blue");
        expect(blueBtn.disabled).toBe(true);
        blueBtn.click();
        flushSync();
        expect(value).toBe("#ef4444");
        expect(onValueChange).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("integrates with ColorPickerContext (reads value, calls setString with commit, respects readonly and disabled)", () => {
        let pickerValue = $state("#ef4444");
        let pickerDisabled = $state(false);
        let pickerReadonly = $state(false);
        let groupValue = $state<string | undefined>(undefined);
        const onValueChange = vi.fn();
        const onPickerSetString = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                withPicker: true,
                swatches: DEFAULT_SWATCHES,
                get pickerValue() {
                    return pickerValue;
                },
                set pickerValue(next) {
                    pickerValue = next;
                },
                get pickerDisabled() {
                    return pickerDisabled;
                },
                get pickerReadonly() {
                    return pickerReadonly;
                },
                onPickerSetString,
                get value() {
                    return groupValue;
                },
                set value(next) {
                    groupValue = next;
                },
                onValueChange,
            },
        });
        flushSync();

        // Reads pickerCtx.value when group value is undefined
        expect(getSwatchButton(container, "red").getAttribute("aria-checked")).toBe("true");

        // Selecting a swatch calls pickerCtx.setString(color, { commit: true }) and onValueChange
        getSwatchButton(container, "green").click();
        flushSync();
        expect(onPickerSetString).toHaveBeenCalledTimes(1);
        expect(onPickerSetString).toHaveBeenCalledWith("#22c55e", { commit: true });
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledWith("#22c55e");
        expect(pickerValue).toBe("#22c55e");
        expect(groupValue).toBeUndefined();
        expect(getSwatchButton(container, "green").getAttribute("aria-checked")).toBe("true");

        // External pickerValue update reflects in group
        pickerValue = "#3b82f6";
        flushSync();
        expect(getSwatchButton(container, "blue").getAttribute("aria-checked")).toBe("true");

        // Readonly blocks selection without marking the group disabled
        pickerReadonly = true;
        flushSync();
        const group = getGroup(container);
        expect(group.hasAttribute("aria-disabled")).toBe(false);
        getSwatchButton(container, "amber").click();
        flushSync();
        expect(onPickerSetString).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(pickerValue).toBe("#3b82f6");

        // Readonly still allows keyboard focus navigation (ArrowRight / ArrowDown) without changing selection
        const readonlyRects: Record<string, DOMRect> = {
            red: new DOMRect(0, 0, 24, 24),
            green: new DOMRect(32, 0, 24, 24),
            blue: new DOMRect(0, 32, 24, 24),
            amber: new DOMRect(32, 32, 24, 24),
        };
        for (const [id, rect] of Object.entries(readonlyRects)) {
            vi.spyOn(getSwatchButton(container, id), "getBoundingClientRect").mockReturnValue(rect);
        }

        const greenBtn = getSwatchButton(container, "green");
        const blueBtn = getSwatchButton(container, "blue");
        const amberBtn = getSwatchButton(container, "amber");

        blueBtn.focus();
        flushSync();
        const readonlyRight = dispatchKey(blueBtn, "ArrowRight");
        expect(readonlyRight.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(amberBtn);
        expect(amberBtn.getAttribute("tabindex")).toBe("0");
        expect(blueBtn.getAttribute("aria-checked")).toBe("true");
        expect(amberBtn.getAttribute("aria-checked")).toBe("false");
        expect(onPickerSetString).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(pickerValue).toBe("#3b82f6");

        const readonlyDown = dispatchKey(amberBtn, "ArrowDown");
        expect(readonlyDown.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(greenBtn);
        expect(greenBtn.getAttribute("tabindex")).toBe("0");
        expect(blueBtn.getAttribute("aria-checked")).toBe("true");
        expect(greenBtn.getAttribute("aria-checked")).toBe("false");
        expect(onPickerSetString).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(pickerValue).toBe("#3b82f6");

        // Disabled from pickerCtx disables group and swatches
        pickerReadonly = false;
        pickerDisabled = true;
        flushSync();
        expect(group.getAttribute("aria-disabled")).toBe("true");
        expect(group.dataset.disabled).toBe("");
        expect(getSwatchButton(container, "amber").disabled).toBe(true);
        getSwatchButton(container, "amber").click();
        flushSync();
        expect(onPickerSetString).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenCalledTimes(1);

        unmount(instance);
    });

    test("manages roving tabindex on mount, fallback on disable/unmount, and focusout reset", () => {
        let swatches = $state<GroupSwatchItem[]>([
            { id: "red", color: "#ef4444", disabled: true },
            { id: "green", color: "#22c55e" },
            { id: "blue", color: "#3b82f6" },
        ]);
        let value = $state<string | undefined>(undefined);

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                get swatches() {
                    return swatches;
                },
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
            },
        });
        flushSync();

        // No value selected: first enabled swatch ("green") gets tabindex="0"
        expect(getSwatchButton(container, "red").getAttribute("tabindex")).toBe("-1");
        expect(getSwatchButton(container, "green").getAttribute("tabindex")).toBe("0");
        expect(getSwatchButton(container, "blue").getAttribute("tabindex")).toBe("-1");

        // Select "blue": only "blue" gets tabindex="0"
        value = "#3b82f6";
        flushSync();
        expect(getSwatchButton(container, "green").getAttribute("tabindex")).toBe("-1");
        expect(getSwatchButton(container, "blue").getAttribute("tabindex")).toBe("0");

        // Selected swatch ("blue") becomes disabled -> falls back to next active ("green")
        swatches = [
            { id: "red", color: "#ef4444", disabled: true },
            { id: "green", color: "#22c55e" },
            { id: "blue", color: "#3b82f6", disabled: true },
        ];
        flushSync();
        expect(getSwatchButton(container, "green").getAttribute("tabindex")).toBe("0");
        expect(getSwatchButton(container, "blue").getAttribute("tabindex")).toBe("-1");

        // Re-enable "blue", focus "green", then unmount "blue" -> tabStop stays valid;
        // then focus "blue" and unmount "blue" -> falls back to "green"
        swatches = [
            { id: "red", color: "#ef4444", disabled: true },
            { id: "green", color: "#22c55e" },
            { id: "blue", color: "#3b82f6" },
        ];
        flushSync();
        const blueBtn = getSwatchButton(container, "blue");
        blueBtn.focus();
        flushSync();
        expect(blueBtn.getAttribute("tabindex")).toBe("0");

        // Unmount selected/focused swatch "blue"
        swatches = [
            { id: "red", color: "#ef4444", disabled: true },
            { id: "green", color: "#22c55e" },
        ];
        flushSync();
        expect(getSwatchButton(container, "green").getAttribute("tabindex")).toBe("0");

        // Focus out to outside element resets focusedElement so selected item keeps tabStop
        const outsideBtn = container.querySelector<HTMLButtonElement>('[data-testid="outside-focus"]');
        if (!outsideBtn) throw new Error("Expected outside-focus button");
        getSwatchButton(container, "green").focus();
        flushSync();
        getSwatchButton(container, "green").dispatchEvent(
            new FocusEvent("focusout", { bubbles: true, relatedTarget: outsideBtn })
        );
        flushSync();
        expect(getSwatchButton(container, "green").getAttribute("tabindex")).toBe("0");

        // When all swatches are disabled, no swatch has tabindex="0"
        swatches = [
            { id: "red", color: "#ef4444", disabled: true },
            { id: "green", color: "#22c55e", disabled: true },
        ];
        flushSync();
        for (const btn of getAllSwatchButtons(container)) {
            expect(btn.getAttribute("tabindex")).toBe("-1");
        }

        unmount(instance);
    });

    test("supports horizontal keyboard navigation (ArrowLeft/ArrowRight wrap, Home/End, skips disabled, ignores ArrowUp/Down)", () => {
        const swatches: GroupSwatchItem[] = [
            { id: "s0", color: "#111111", disabled: true },
            { id: "s1", color: "#ef4444" },
            { id: "s2", color: "#22c55e", disabled: true },
            { id: "s3", color: "#3b82f6" },
            { id: "s4", color: "#f59e0b" },
        ];

        let value = $state<string | undefined>("#ef4444");
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                orientation: "horizontal",
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        const s1 = getSwatchButton(container, "s1");
        const s3 = getSwatchButton(container, "s3");
        const s4 = getSwatchButton(container, "s4");

        s1.focus();
        flushSync();

        // ArrowUp / ArrowDown do nothing in horizontal mode
        const upEvent = dispatchKey(s1, "ArrowUp");
        expect(upEvent.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(s1);
        expect(onValueChange).not.toHaveBeenCalled();

        const downEvent = dispatchKey(s1, "ArrowDown");
        expect(downEvent.defaultPrevented).toBe(false);
        expect(onValueChange).not.toHaveBeenCalled();

        // ArrowRight skips disabled s2 -> s3
        const right1 = dispatchKey(s1, "ArrowRight");
        expect(right1.defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(s3);
        expect(s3.getAttribute("aria-checked")).toBe("true");
        expect(onValueChange).toHaveBeenLastCalledWith("#3b82f6");

        // End -> s4
        dispatchKey(s3, "End");
        expect(document.activeElement).toBe(s4);
        expect(s4.getAttribute("aria-checked")).toBe("true");
        expect(onValueChange).toHaveBeenLastCalledWith("#f59e0b");

        // ArrowRight at end wraps around disabled s0 -> s1
        dispatchKey(s4, "ArrowRight");
        expect(document.activeElement).toBe(s1);
        expect(s1.getAttribute("aria-checked")).toBe("true");
        expect(onValueChange).toHaveBeenLastCalledWith("#ef4444");

        // ArrowLeft at start wraps around -> s4
        dispatchKey(s1, "ArrowLeft");
        expect(document.activeElement).toBe(s4);
        expect(s4.getAttribute("aria-checked")).toBe("true");

        // Home -> first enabled swatch (s1, skipping disabled s0)
        dispatchKey(s4, "Home");
        expect(document.activeElement).toBe(s1);
        expect(s1.getAttribute("aria-checked")).toBe("true");

        unmount(instance);
    });

    test("supports vertical keyboard navigation (ArrowUp/ArrowDown wrap, Home/End, ignores ArrowLeft/Right)", () => {
        const swatches: GroupSwatchItem[] = [
            { id: "s0", color: "#ef4444" },
            { id: "s1", color: "#22c55e", disabled: true },
            { id: "s2", color: "#3b82f6" },
        ];

        let value = $state<string | undefined>("#ef4444");
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                orientation: "vertical",
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        const s0 = getSwatchButton(container, "s0");
        const s2 = getSwatchButton(container, "s2");
        s0.focus();
        flushSync();

        // ArrowLeft / ArrowRight do nothing in vertical mode
        expect(dispatchKey(s0, "ArrowLeft").defaultPrevented).toBe(false);
        expect(dispatchKey(s0, "ArrowRight").defaultPrevented).toBe(false);
        expect(onValueChange).not.toHaveBeenCalled();

        // ArrowDown skips disabled s1 -> s2
        expect(dispatchKey(s0, "ArrowDown").defaultPrevented).toBe(true);
        expect(document.activeElement).toBe(s2);
        expect(s2.getAttribute("aria-checked")).toBe("true");
        expect(onValueChange).toHaveBeenLastCalledWith("#3b82f6");

        // ArrowDown wraps -> s0
        dispatchKey(s2, "ArrowDown");
        expect(document.activeElement).toBe(s0);
        expect(s0.getAttribute("aria-checked")).toBe("true");

        // ArrowUp wraps -> s2
        dispatchKey(s0, "ArrowUp");
        expect(document.activeElement).toBe(s2);
        expect(s2.getAttribute("aria-checked")).toBe("true");

        // Home / End
        dispatchKey(s2, "Home");
        expect(document.activeElement).toBe(s0);
        dispatchKey(s0, "End");
        expect(document.activeElement).toBe(s2);

        unmount(instance);
    });

    test("supports 2D spatial ArrowUp/ArrowDown and linear ArrowLeft/ArrowRight in orientation='both' with incomplete last row", () => {
        // 5 swatches in a 3-column 2xN grid:
        // Row 0: [s0 (col 0), s1 (col 1), s2 (col 2)]
        // Row 1: [s3 (col 0), s4 (col 1)]  (incomplete last row)
        const swatches: GroupSwatchItem[] = [
            { id: "s0", color: "#ef4444" },
            { id: "s1", color: "#22c55e" },
            { id: "s2", color: "#3b82f6" },
            { id: "s3", color: "#f59e0b" },
            { id: "s4", color: "#a855f7" },
        ];

        let value = $state<string | undefined>("#ef4444");
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                orientation: "both",
                columns: 3,
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        const rects: Record<string, DOMRect> = {
            s0: new DOMRect(0, 0, 24, 24),
            s1: new DOMRect(32, 0, 24, 24),
            s2: new DOMRect(64, 0, 24, 24),
            s3: new DOMRect(0, 32, 24, 24),
            s4: new DOMRect(32, 32, 24, 24),
        };

        for (const [id, rect] of Object.entries(rects)) {
            vi.spyOn(getSwatchButton(container, id), "getBoundingClientRect").mockReturnValue(rect);
        }

        const s0 = getSwatchButton(container, "s0");
        const s1 = getSwatchButton(container, "s1");
        const s2 = getSwatchButton(container, "s2");
        const s3 = getSwatchButton(container, "s3");
        const s4 = getSwatchButton(container, "s4");

        s0.focus();
        flushSync();

        // Linear horizontal step: s0 -> s1 -> s2
        dispatchKey(s0, "ArrowRight");
        expect(document.activeElement).toBe(s1);
        dispatchKey(s1, "ArrowRight");
        expect(document.activeElement).toBe(s2);
        expect(s2.getAttribute("aria-checked")).toBe("true");

        // Spatial ArrowDown from s2 (col 2, row 0) -> nearest X in row 1 is s4 (col 1)
        dispatchKey(s2, "ArrowDown");
        expect(document.activeElement).toBe(s4);
        expect(s4.getAttribute("aria-checked")).toBe("true");

        // Spatial ArrowDown from s4 (col 1, row 1) wraps to row 0 -> s1 (col 1)
        dispatchKey(s4, "ArrowDown");
        expect(document.activeElement).toBe(s1);
        expect(s1.getAttribute("aria-checked")).toBe("true");

        // Spatial ArrowUp from s1 (col 1, row 0) wraps to row 1 -> s4 (col 1)
        dispatchKey(s1, "ArrowUp");
        expect(document.activeElement).toBe(s4);

        // Linear ArrowLeft from s4 -> s3, then ArrowUp -> s0
        dispatchKey(s4, "ArrowLeft");
        expect(document.activeElement).toBe(s3);
        dispatchKey(s3, "ArrowUp");
        expect(document.activeElement).toBe(s0);

        // Home / End
        dispatchKey(s0, "End");
        expect(document.activeElement).toBe(s4);
        dispatchKey(s4, "Home");
        expect(document.activeElement).toBe(s0);

        unmount(instance);
    });

    test("ignores ArrowUp/ArrowDown without preventDefault on a single-row orientation='both' group", () => {
        const swatches: GroupSwatchItem[] = [
            { id: "s0", color: "#ef4444" },
            { id: "s1", color: "#22c55e" },
            { id: "s2", color: "#3b82f6" },
        ];

        let value = $state<string | undefined>("#ef4444");
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                orientation: "both",
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        const rects: Record<string, DOMRect> = {
            s0: new DOMRect(0, 0, 24, 24),
            s1: new DOMRect(32, 0, 24, 24),
            s2: new DOMRect(64, 0, 24, 24),
        };
        for (const [id, rect] of Object.entries(rects)) {
            vi.spyOn(getSwatchButton(container, id), "getBoundingClientRect").mockReturnValue(rect);
        }

        const s0 = getSwatchButton(container, "s0");
        s0.focus();
        flushSync();

        const upEvent = dispatchKey(s0, "ArrowUp");
        expect(upEvent.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(s0);
        expect(onValueChange).not.toHaveBeenCalled();

        const downEvent = dispatchKey(s0, "ArrowDown");
        expect(downEvent.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(s0);
        expect(onValueChange).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("reverses ArrowLeft/ArrowRight in dir='rtl' and ignores modified or defaultPrevented keydowns", () => {
        const swatches: GroupSwatchItem[] = [
            { id: "s0", color: "#ef4444" },
            { id: "s1", color: "#22c55e" },
            { id: "s2", color: "#3b82f6" },
        ];

        let value = $state<string | undefined>("#ef4444");
        let blockKeys = $state(false);
        const onValueChange = vi.fn();

        const instance = mount(ColorSwatchGroupTestHost, {
            target: container,
            props: {
                orientation: "horizontal",
                dir: "rtl",
                groupAttrs: { style: "direction: rtl" },
                swatches,
                get value() {
                    return value;
                },
                set value(next) {
                    value = next;
                },
                onValueChange,
                onkeydown: (e) => {
                    if (blockKeys) e.preventDefault();
                },
            },
        });
        flushSync();

        const s0 = getSwatchButton(container, "s0");
        const s1 = getSwatchButton(container, "s1");
        const s2 = getSwatchButton(container, "s2");
        s0.focus();
        flushSync();

        // In RTL, ArrowLeft advances forward (s0 -> s1) and ArrowRight goes backward (s1 -> s0 -> s2)
        dispatchKey(s0, "ArrowLeft");
        expect(document.activeElement).toBe(s1);
        expect(s1.getAttribute("aria-checked")).toBe("true");

        dispatchKey(s1, "ArrowRight");
        expect(document.activeElement).toBe(s0);
        expect(s0.getAttribute("aria-checked")).toBe("true");

        dispatchKey(s0, "ArrowRight");
        expect(document.activeElement).toBe(s2);
        expect(s2.getAttribute("aria-checked")).toBe("true");

        const callsBeforeModifiers = onValueChange.mock.calls.length;

        // Modifier keys must not navigate
        dispatchKey(s2, "ArrowLeft", { altKey: true });
        dispatchKey(s2, "ArrowLeft", { ctrlKey: true });
        dispatchKey(s2, "ArrowLeft", { metaKey: true });
        expect(document.activeElement).toBe(s2);
        expect(onValueChange).toHaveBeenCalledTimes(callsBeforeModifiers);

        // defaultPrevented from onkeydown must not navigate
        blockKeys = true;
        flushSync();
        dispatchKey(s2, "ArrowLeft");
        expect(document.activeElement).toBe(s2);
        expect(onValueChange).toHaveBeenCalledTimes(callsBeforeModifiers);

        unmount(instance);
    });
});
