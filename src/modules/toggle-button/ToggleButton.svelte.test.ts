import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ToggleButton from "./ToggleButton.svelte";

describe("ToggleButton Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("uncontrolled button starts unpressed and toggles aria-pressed on click", () => {
        const instance = mount(ToggleButton, {
            target: container,
            props: {
                variant: "soft",
                color: "accent",
                size: "md",
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-toggle-button");
        expect(button).not.toBeNull();
        expect(button?.getAttribute("aria-pressed")).toBe("false");

        button?.click();
        flushSync();
        expect(button?.getAttribute("aria-pressed")).toBe("true");

        button?.click();
        flushSync();
        expect(button?.getAttribute("aria-pressed")).toBe("false");

        unmount(instance);
    });

    test("supports two-way bind:pressed and fires onPressedChange with next boolean", () => {
        let pressed = $state(false);
        const onPressedChange = vi.fn();

        const instance = mount(ToggleButton, {
            target: container,
            props: {
                variant: "soft",
                color: "accent",
                size: "md",
                get pressed() {
                    return pressed;
                },
                set pressed(next: boolean) {
                    pressed = next;
                },
                onPressedChange,
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-toggle-button");
        expect(button?.getAttribute("aria-pressed")).toBe("false");

        button?.click();
        flushSync();
        expect(pressed).toBe(true);
        expect(button?.getAttribute("aria-pressed")).toBe("true");
        expect(onPressedChange).toHaveBeenCalledTimes(1);
        expect(onPressedChange).toHaveBeenLastCalledWith(true);

        button?.click();
        flushSync();
        expect(pressed).toBe(false);
        expect(button?.getAttribute("aria-pressed")).toBe("false");
        expect(onPressedChange).toHaveBeenCalledTimes(2);
        expect(onPressedChange).toHaveBeenLastCalledWith(false);

        pressed = true;
        flushSync();
        expect(button?.getAttribute("aria-pressed")).toBe("true");

        unmount(instance);
    });

    test("supports Svelte 5 getter/setter function binding", () => {
        const store = $state({ pinned: false });
        const setPinned = vi.fn((next: boolean) => {
            store.pinned = next;
        });

        const instance = mount(ToggleButton, {
            target: container,
            props: {
                variant: "ghost",
                color: "positive",
                size: "sm",
                get pressed() {
                    return store.pinned;
                },
                set pressed(next: boolean) {
                    setPinned(next);
                },
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-toggle-button");
        expect(button?.getAttribute("aria-pressed")).toBe("false");

        button?.click();
        flushSync();
        expect(setPinned).toHaveBeenCalledTimes(1);
        expect(setPinned).toHaveBeenLastCalledWith(true);
        expect(store.pinned).toBe(true);
        expect(button?.getAttribute("aria-pressed")).toBe("true");

        button?.click();
        flushSync();
        expect(setPinned).toHaveBeenCalledTimes(2);
        expect(setPinned).toHaveBeenLastCalledWith(false);
        expect(store.pinned).toBe(false);
        expect(button?.getAttribute("aria-pressed")).toBe("false");

        unmount(instance);
    });

    test("onclick calling event.preventDefault() cancels toggle and skips onPressedChange", () => {
        let pressed = $state(false);
        const onPressedChange = vi.fn();

        const instance = mount(ToggleButton, {
            target: container,
            props: {
                variant: "soft",
                color: "accent",
                size: "md",
                get pressed() {
                    return pressed;
                },
                set pressed(next: boolean) {
                    pressed = next;
                },
                onPressedChange,
                onclick: (event: MouseEvent) => {
                    event.preventDefault();
                },
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-toggle-button");
        button?.click();
        flushSync();

        expect(pressed).toBe(false);
        expect(button?.getAttribute("aria-pressed")).toBe("false");
        expect(onPressedChange).not.toHaveBeenCalled();

        unmount(instance);
    });

    test("disabled prevents toggling and sets the disabled attribute", () => {
        let pressed = $state(false);
        const onPressedChange = vi.fn();

        const instance = mount(ToggleButton, {
            target: container,
            props: {
                variant: "soft",
                color: "accent",
                size: "md",
                disabled: true,
                get pressed() {
                    return pressed;
                },
                set pressed(next: boolean) {
                    pressed = next;
                },
                onPressedChange,
            },
        });
        flushSync();

        const button = container.querySelector<HTMLButtonElement>("button.cs-toggle-button");
        expect(button?.disabled).toBe(true);
        expect(button?.hasAttribute("disabled")).toBe(true);

        button?.click();
        button?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        flushSync();

        expect(pressed).toBe(false);
        expect(button?.getAttribute("aria-pressed")).toBe("false");
        expect(onPressedChange).not.toHaveBeenCalled();

        unmount(instance);
    });
});
