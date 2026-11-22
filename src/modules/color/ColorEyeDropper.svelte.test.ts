import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ColorEyeDropperTestHost from "./ColorEyeDropperTestHost.internal.svelte";
import {
    COLOR_EYE_DROPPER_SIZES,
    COLOR_EYE_DROPPER_VARIANTS,
    isEyeDropperSupported,
    type ColorEyeDropperSize,
    type ColorEyeDropperVariant,
} from "./index.ts";

function createDeferred<T>(): PromiseWithResolvers<T> {
    return Promise.withResolvers<T>();
}

interface EyeDropperOpenCall {
    signal: AbortSignal | undefined;
}

function installMockEyeDropper(
    onOpen: (options?: { signal?: AbortSignal }) => Promise<{ sRGBHex: string }>
): EyeDropperOpenCall[] {
    const calls: EyeDropperOpenCall[] = [];

    class MockEyeDropper {
        open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }> {
            calls.push({ signal: options?.signal });
            return onOpen(options);
        }
    }

    Object.defineProperty(window, "EyeDropper", {
        value: MockEyeDropper,
        configurable: true,
        writable: true,
    });

    return calls;
}

function removeMockEyeDropper(): void {
    Reflect.deleteProperty(window, "EyeDropper");
}

function dispatchClick(target: EventTarget): MouseEvent {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    flushSync();
    return event;
}

async function flushMicrotasks(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
    flushSync();
}

function getButton(container: HTMLElement): HTMLButtonElement {
    const button = container.querySelector("button");
    if (!button) {
        throw new Error("Expected <button> element to be rendered");
    }
    return button;
}

describe("ColorEyeDropper", () => {
    let container: HTMLElement;
    let mounted: Array<ReturnType<typeof mount>> = [];
    let originalEyeDropperDescriptor: PropertyDescriptor | undefined;

    function mountHost(initialProps: Record<string, unknown> = {}): {
        instance: ReturnType<typeof mount>;
        props: Record<string, unknown>;
    } {
        const props: Record<string, unknown> = $state({
            variant: "ghost",
            size: "md",
            ...initialProps,
        });
        const instance = mount(ColorEyeDropperTestHost, {
            target: container,
            props,
        });
        mounted.push(instance);
        flushSync();
        return { instance, props };
    }

    beforeEach(() => {
        originalEyeDropperDescriptor = Object.getOwnPropertyDescriptor(window, "EyeDropper");
        removeMockEyeDropper();
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        for (const instance of mounted) {
            unmount(instance);
        }
        mounted = [];
        container.remove();
        if (originalEyeDropperDescriptor) {
            Object.defineProperty(window, "EyeDropper", originalEyeDropperDescriptor);
        } else {
            removeMockEyeDropper();
        }
        vi.restoreAllMocks();
    });

    describe("browser support & unsupportedBehavior", () => {
        test("renders nothing by default (unsupportedBehavior='hide') when EyeDropper is unavailable", () => {
            expect(isEyeDropperSupported()).toBe(false);
            const { props } = mountHost({ ref: null });

            expect(container.querySelector("button")).toBeNull();
            expect(props.ref).toBeNull();
        });

        test("renders disabled button with aria-disabled, data-unsupported, and localized title when unsupportedBehavior='disable'", () => {
            expect(isEyeDropperSupported()).toBe(false);
            const onPick = vi.fn();
            const onError = vi.fn();
            mountHost({
                unsupportedBehavior: "disable",
                onPick,
                onError,
            });

            const button = getButton(container);
            expect(button.disabled).toBe(true);
            expect(button.getAttribute("aria-disabled")).toBe("true");
            expect(button.dataset.unsupported).toBe("");
            expect(button.title).toBe("EyeDropper is not supported in this browser");

            dispatchClick(button);
            expect(onPick).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });

        test("allows custom title to override localized unsupported title", () => {
            mountHost({
                unsupportedBehavior: "disable",
                title: "Custom unsupported hint",
            });

            const button = getButton(container);
            expect(button.title).toBe("Custom unsupported hint");
        });

        test("renders button with class, bind:ref, variant, and size when EyeDropper is supported", () => {
            installMockEyeDropper(() => createDeferred<{ sRGBHex: string }>().promise);
            expect(isEyeDropperSupported()).toBe(true);

            const { props } = mountHost({
                ref: null,
                variant: "elevated",
                size: "sm",
                className: "custom-dropper",
                buttonAttrs: { "data-testid": "eye-dropper-btn" },
            });

            const button = getButton(container);
            expect(props.ref).toBe(button);
            expect(button.classList.contains("cs-color-eye-dropper")).toBe(true);
            expect(button.classList.contains("custom-dropper")).toBe(true);
            expect(button.dataset.variant).toBe("elevated");
            expect(button.dataset.size).toBe("sm");
            expect(button.dataset.unsupported).toBeUndefined();
            expect(button.dataset.testid).toBe("eye-dropper-btn");
            expect(button.getAttribute("aria-disabled")).toBeNull();
            expect(button.disabled).toBe(false);
        });

        test.each(COLOR_EYE_DROPPER_VARIANTS)("forwards variant=%s to Button", (variant: ColorEyeDropperVariant) => {
            installMockEyeDropper(() => createDeferred<{ sRGBHex: string }>().promise);
            mountHost({ variant });

            const button = getButton(container);
            expect(button.dataset.variant).toBe(variant);
        });

        test.each(COLOR_EYE_DROPPER_SIZES)("forwards size=%s and renders HitArea only for xs-lg", (size: ColorEyeDropperSize) => {
            installMockEyeDropper(() => createDeferred<{ sRGBHex: string }>().promise);
            mountHost({ size });

            const button = getButton(container);
            expect(button.dataset.size).toBe(size);
            expect(button.dataset.iconOnly).toBe("");

            const hitArea = button.querySelector(".cs-hit-area");
            if (size === "xl") {
                expect(hitArea).toBeNull();
            } else {
                expect(hitArea).not.toBeNull();
            }
        });

        test("omits iconOnly and HitArea when custom children are provided", () => {
            installMockEyeDropper(() => createDeferred<{ sRGBHex: string }>().promise);
            mountHost({
                size: "sm",
                customChildrenText: "Sample",
            });

            const button = getButton(container);
            expect(button.dataset.iconOnly).toBeUndefined();
            expect(button.querySelector(".cs-hit-area")).toBeNull();
            expect(button.querySelector(".custom-dropper-content")?.textContent).toBe("Sample");
        });

        test("resolves accessible name in order: label > aria-label > aria-labelledby > localized default", () => {
            installMockEyeDropper(() => createDeferred<{ sRGBHex: string }>().promise);

            const { props } = mountHost({
                label: "Explicit label",
                ariaLabel: "Fallback aria label",
                ariaLabelledBy: "external-dropper-label",
                externalLabelText: "External label",
            });

            const button = getButton(container);
            expect(button.getAttribute("aria-label")).toBe("Explicit label");
            expect(button.getAttribute("aria-labelledby")).toBe("external-dropper-label");

            props.label = undefined;
            flushSync();
            expect(button.getAttribute("aria-label")).toBe("Fallback aria label");

            props.ariaLabel = undefined;
            flushSync();
            expect(button.getAttribute("aria-label")).toBeNull();
            expect(button.getAttribute("aria-labelledby")).toBe("external-dropper-label");

            props.ariaLabelledBy = undefined;
            flushSync();
            expect(button.getAttribute("aria-labelledby")).toBeNull();
            expect(button.getAttribute("aria-label")).toBe("Pick color from screen");
        });
    });

    describe("pick lifecycle & AbortController", () => {
        test("click opens EyeDropper with signal, sets data-picking while pending, updates bind:value and calls onPick", async () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => deferred.promise);
            const onPick = vi.fn();

            const { props } = mountHost({
                bindMode: "bind",
                value: "#000000",
                onPick,
            });

            const button = getButton(container);
            expect(button.dataset.picking).toBeUndefined();

            dispatchClick(button);

            expect(calls).toHaveLength(1);
            expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
            expect(calls[0]?.signal?.aborted).toBe(false);
            expect(button.dataset.picking).toBe("");

            deferred.resolve({ sRGBHex: "#ff5500" });
            await flushMicrotasks();

            expect(button.dataset.picking).toBeUndefined();
            expect(props.value).toBe("#ff5500");
            expect(onPick).toHaveBeenCalledTimes(1);
            expect(onPick).toHaveBeenCalledWith("#ff5500");
        });

        test("fires onPick in strict controlled bind mode without mutating parent strictValue", async () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            installMockEyeDropper(() => deferred.promise);
            const onPick = vi.fn();

            const { props } = mountHost({
                bindMode: "strict",
                strictValue: "#112233",
                onPick,
            });

            dispatchClick(getButton(container));
            deferred.resolve({ sRGBHex: "#445566" });
            await flushMicrotasks();

            expect(onPick).toHaveBeenCalledWith("#445566");
            expect(props.strictValue).toBe("#112233");
        });

        test("ignores second click while a pick session is already active", async () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => deferred.promise);

            mountHost();
            const button = getButton(container);

            dispatchClick(button);
            dispatchClick(button);

            expect(calls).toHaveLength(1);
            expect(button.dataset.picking).toBe("");

            deferred.resolve({ sRGBHex: "#123456" });
            await flushMicrotasks();

            expect(button.dataset.picking).toBeUndefined();
        });

        test("silently ignores AbortError without calling onError and allows subsequent picks", async () => {
            let attempt = 0;
            const firstDeferred = createDeferred<{ sRGBHex: string }>();
            const secondDeferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => {
                attempt += 1;
                return attempt === 1 ? firstDeferred.promise : secondDeferred.promise;
            });

            const onPick = vi.fn();
            const onError = vi.fn();
            const { props } = mountHost({
                bindMode: "bind",
                value: "#aaaaaa",
                onPick,
                onError,
            });

            const button = getButton(container);
            dispatchClick(button);
            expect(button.dataset.picking).toBe("");

            firstDeferred.reject(new DOMException("The user aborted a request.", "AbortError"));
            await flushMicrotasks();

            expect(onError).not.toHaveBeenCalled();
            expect(onPick).not.toHaveBeenCalled();
            expect(props.value).toBe("#aaaaaa");
            expect(button.dataset.picking).toBeUndefined();

            dispatchClick(button);
            expect(calls).toHaveLength(2);
            expect(calls[1]?.signal?.aborted).toBe(false);

            secondDeferred.resolve({ sRGBHex: "#bbbbbb" });
            await flushMicrotasks();

            expect(props.value).toBe("#bbbbbb");
            expect(onPick).toHaveBeenCalledWith("#bbbbbb");
        });

        test("calls onError for non-abort errors and clears data-picking", async () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            installMockEyeDropper(() => deferred.promise);

            const onPick = vi.fn();
            const onError = vi.fn();
            mountHost({ onPick, onError });

            const button = getButton(container);
            dispatchClick(button);

            const failure = new Error("EyeDropper failed");
            deferred.reject(failure);
            await flushMicrotasks();

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(failure);
            expect(onPick).not.toHaveBeenCalled();
            expect(button.dataset.picking).toBeUndefined();
        });

        test("aborts active signal on unmount during an open pick session", () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => deferred.promise);

            const { instance } = mountHost();
            dispatchClick(getButton(container));

            const signal = calls[0]?.signal;
            expect(signal?.aborted).toBe(false);

            unmount(instance);
            mounted = [];

            expect(signal?.aborted).toBe(true);
        });

        test("aborts active signal when disabled becomes true during an open pick session", async () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => deferred.promise);
            const onError = vi.fn();

            const { props } = mountHost({ disabled: false, onError });
            const button = getButton(container);

            dispatchClick(button);
            const signal = calls[0]?.signal;
            expect(signal?.aborted).toBe(false);

            props.disabled = true;
            flushSync();

            expect(signal?.aborted).toBe(true);
            expect(button.disabled).toBe(true);

            deferred.reject(new DOMException("Aborted", "AbortError"));
            await flushMicrotasks();

            expect(onError).not.toHaveBeenCalled();
            expect(button.dataset.picking).toBeUndefined();
        });

        test("respects onclick callback and skips EyeDropper.open when event.preventDefault() is called", () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => deferred.promise);
            let shouldPrevent = true;
            const onclick = vi.fn((event: MouseEvent) => {
                if (shouldPrevent) {
                    event.preventDefault();
                }
            });

            mountHost({ onclick });
            const button = getButton(container);

            dispatchClick(button);
            expect(onclick).toHaveBeenCalledTimes(1);
            expect(calls).toHaveLength(0);
            expect(button.dataset.picking).toBeUndefined();

            shouldPrevent = false;
            dispatchClick(button);
            expect(onclick).toHaveBeenCalledTimes(2);
            expect(calls).toHaveLength(1);
            expect(button.dataset.picking).toBe("");
        });
    });

    describe("ColorPickerContext integration", () => {
        test("calls pickerCtx.setString(sRGBHex, { commit: true }) on successful pick", async () => {
            const deferred = createDeferred<{ sRGBHex: string }>();
            installMockEyeDropper(() => deferred.promise);
            const onPickerSetString = vi.fn();
            const onPick = vi.fn();

            mountHost({
                withPicker: true,
                onPickerSetString,
                onPick,
            });

            dispatchClick(getButton(container));
            deferred.resolve({ sRGBHex: "#10b981" });
            await flushMicrotasks();

            expect(onPickerSetString).toHaveBeenCalledTimes(1);
            expect(onPickerSetString).toHaveBeenCalledWith("#10b981", { commit: true });
            expect(onPick).toHaveBeenCalledWith("#10b981");
        });

        test("disables button and prevents EyeDropper.open when pickerCtx.disabled or pickerCtx.readonly is true", () => {
            const calls = installMockEyeDropper(() => createDeferred<{ sRGBHex: string }>().promise);

            const { props } = mountHost({
                withPicker: true,
                pickerDisabled: true,
            });

            const button = getButton(container);
            expect(button.disabled).toBe(true);
            dispatchClick(button);
            expect(calls).toHaveLength(0);

            props.pickerDisabled = false;
            props.pickerReadonly = true;
            flushSync();

            expect(button.disabled).toBe(true);
            dispatchClick(button);
            expect(calls).toHaveLength(0);
        });

        test("aborts active pick session when pickerCtx.disabled or pickerCtx.readonly becomes true", async () => {
            let attempt = 0;
            const firstDeferred = createDeferred<{ sRGBHex: string }>();
            const secondDeferred = createDeferred<{ sRGBHex: string }>();
            const calls = installMockEyeDropper(() => {
                attempt += 1;
                return attempt === 1 ? firstDeferred.promise : secondDeferred.promise;
            });

            const { props } = mountHost({
                withPicker: true,
                pickerDisabled: false,
                pickerReadonly: false,
            });

            const button = getButton(container);
            dispatchClick(button);
            expect(calls[0]?.signal?.aborted).toBe(false);

            props.pickerReadonly = true;
            flushSync();

            expect(calls[0]?.signal?.aborted).toBe(true);
            expect(button.disabled).toBe(true);

            firstDeferred.reject(new DOMException("Aborted", "AbortError"));
            await flushMicrotasks();

            props.pickerReadonly = false;
            flushSync();
            expect(button.disabled).toBe(false);

            dispatchClick(button);
            expect(calls).toHaveLength(2);
            expect(calls[1]?.signal?.aborted).toBe(false);
        });
    });
});
