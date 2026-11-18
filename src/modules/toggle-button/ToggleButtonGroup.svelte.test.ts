import { flushSync, mount, unmount } from "svelte";
import type { MouseEventHandler } from "svelte/elements";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ToggleButtonGroupTestHost from "./ToggleButtonGroupTestHost.internal.svelte";

interface TestToggleItem {
    value: string;
    disabled?: boolean;
    onclick?: MouseEventHandler<HTMLButtonElement>;
}

describe("ToggleButtonGroup Svelte 5 Component", () => {
    let container: HTMLDivElement;

    const defaultItems: TestToggleItem[] = [{ value: "left" }, { value: "center" }, { value: "right" }];

    function getGroup(): HTMLDivElement | null {
        return container.querySelector<HTMLDivElement>(".cs-toggle-button-group");
    }

    function getButton(value: string): HTMLButtonElement | null {
        const buttons = container.querySelectorAll<HTMLButtonElement>("button.cs-toggle-button");
        for (const button of buttons) {
            if (button.textContent?.trim() === value) {
                return button;
            }
        }
        return null;
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test('type="single" (fixed) selects clicked item, switches active item, and ignores re-clicking active item', () => {
        let value = $state<string | undefined>("left");
        const onValueChange = vi.fn();

        const instance = mount(ToggleButtonGroupTestHost, {
            target: container,
            props: {
                type: "single",
                items: defaultItems,
                get value() {
                    return value;
                },
                set value(next: string | undefined) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("true");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("false");
        expect("fixedSelection" in (getGroup()?.dataset ?? {})).toBe(true);

        // Switch to another item
        getButton("center")?.click();
        flushSync();
        expect(value).toBe("center");
        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("false");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("true");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith("center");

        // Re-clicking already-active item is a no-op
        getButton("center")?.click();
        flushSync();
        expect(value).toBe("center");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("true");
        expect(onValueChange).toHaveBeenCalledTimes(1);

        unmount(instance);
    });

    test('type="single" with allowDeselect={true} deselects active item to undefined', () => {
        let value = $state<string | undefined>("left");
        const onValueChange = vi.fn();

        const instance = mount(ToggleButtonGroupTestHost, {
            target: container,
            props: {
                type: "single",
                allowDeselect: true,
                items: defaultItems,
                get value() {
                    return value;
                },
                set value(next: string | undefined) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        expect("fixedSelection" in (getGroup()?.dataset ?? {})).toBe(false);
        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("true");

        getButton("left")?.click();
        flushSync();
        expect(value).toBeUndefined();
        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("false");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith(undefined);

        // Clicking again re-selects
        getButton("right")?.click();
        flushSync();
        expect(value).toBe("right");
        expect(getButton("right")?.getAttribute("aria-pressed")).toBe("true");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onValueChange).toHaveBeenLastCalledWith("right");

        unmount(instance);
    });

    test('type="multiple" toggles items into and out of string[] and fires onValueChange', () => {
        let value = $state<string[]>(["left"]);
        const onValueChange = vi.fn();

        const instance = mount(ToggleButtonGroupTestHost, {
            target: container,
            props: {
                type: "multiple",
                items: defaultItems,
                get value() {
                    return value;
                },
                set value(next: string[]) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("true");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("false");

        getButton("center")?.click();
        flushSync();
        expect(value).toEqual(["left", "center"]);
        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("true");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("true");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith(["left", "center"]);

        getButton("left")?.click();
        flushSync();
        expect(value).toEqual(["center"]);
        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("false");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("true");
        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onValueChange).toHaveBeenLastCalledWith(["center"]);

        unmount(instance);
    });

    test("group-level disabled propagates to child buttons and reacts when disabled changes", () => {
        let value = $state<string | undefined>("left");
        let disabled = $state(true);
        const onValueChange = vi.fn();

        const instance = mount(ToggleButtonGroupTestHost, {
            target: container,
            props: {
                type: "single",
                items: defaultItems,
                get disabled() {
                    return disabled;
                },
                get value() {
                    return value;
                },
                set value(next: string | undefined) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        const group = getGroup();
        expect(group?.getAttribute("aria-disabled")).toBe("true");
        expect("disabled" in (group?.dataset ?? {})).toBe(true);
        expect(getButton("left")?.hasAttribute("disabled")).toBe(true);
        expect(getButton("center")?.hasAttribute("disabled")).toBe(true);

        // Clicks do nothing while disabled
        getButton("center")?.click();
        getButton("center")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        flushSync();
        expect(value).toBe("left");
        expect(onValueChange).not.toHaveBeenCalled();

        // Reacts when group disabled changes to false
        disabled = false;
        flushSync();
        expect(group?.getAttribute("aria-disabled")).toBeNull();
        expect("disabled" in (group?.dataset ?? {})).toBe(false);
        expect(getButton("left")?.hasAttribute("disabled")).toBe(false);
        expect(getButton("center")?.hasAttribute("disabled")).toBe(false);

        getButton("center")?.click();
        flushSync();
        expect(value).toBe("center");
        expect(onValueChange).toHaveBeenCalledTimes(1);
        expect(onValueChange).toHaveBeenLastCalledWith("center");

        unmount(instance);
    });

    test("onclick calling event.preventDefault() on a grouped ToggleButton cancels group.toggle", () => {
        let value = $state<string | undefined>("left");
        const onValueChange = vi.fn();
        const items: TestToggleItem[] = [
            { value: "left" },
            {
                value: "center",
                onclick: (event: MouseEvent) => {
                    event.preventDefault();
                },
            },
        ];

        const instance = mount(ToggleButtonGroupTestHost, {
            target: container,
            props: {
                type: "single",
                items,
                get value() {
                    return value;
                },
                set value(next: string | undefined) {
                    value = next;
                },
                onValueChange,
            },
        });
        flushSync();

        getButton("center")?.click();
        flushSync();

        expect(value).toBe("left");
        expect(getButton("left")?.getAttribute("aria-pressed")).toBe("true");
        expect(getButton("center")?.getAttribute("aria-pressed")).toBe("false");
        expect(onValueChange).not.toHaveBeenCalled();

        unmount(instance);
    });
});
