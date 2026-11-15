import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import CheckboxPreview from "./Checkbox.preview.svelte";
import Checkbox from "./Checkbox.svelte";

describe("Checkbox Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    test("unchecked -> checked -> unchecked does not set data-morph", () => {
        const state = $state({ checked: false });

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                get checked() {
                    return state.checked;
                },
                set checked(next: boolean) {
                    state.checked = next;
                },
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input).not.toBeNull();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        input?.click();
        flushSync();
        expect(state.checked).toBe(true);
        expect(input?.checked).toBe(true);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        input?.click();
        flushSync();
        expect(state.checked).toBe(false);
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        unmount(instance);
    });

    test("unchecked -> indeterminate -> unchecked does not set data-morph via native click + onchange", () => {
        let step = 0;
        const state = $state({ checked: false, indeterminate: false });

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                get checked() {
                    return state.checked;
                },
                set checked(next: boolean) {
                    state.checked = next;
                },
                get indeterminate() {
                    return state.indeterminate;
                },
                set indeterminate(next: boolean) {
                    state.indeterminate = next;
                },
                onchange: (event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    step = (step + 1) % 2;
                    state.checked = false;
                    state.indeterminate = step === 1;
                    target.checked = state.checked;
                    target.indeterminate = state.indeterminate;
                },
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input).not.toBeNull();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        input?.click();
        flushSync();
        expect(state.checked).toBe(false);
        expect(state.indeterminate).toBe(true);
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(true);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        input?.click();
        flushSync();
        expect(state.checked).toBe(false);
        expect(state.indeterminate).toBe(false);
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        unmount(instance);
    });

    test("indeterminate -> checked sets data-morph and returning to unchecked clears it", () => {
        const state = $state({ checked: false, indeterminate: true });

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                get checked() {
                    return state.checked;
                },
                set checked(next: boolean) {
                    state.checked = next;
                },
                get indeterminate() {
                    return state.indeterminate;
                },
                set indeterminate(next: boolean) {
                    state.indeterminate = next;
                },
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(true);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        state.indeterminate = false;
        state.checked = true;
        flushSync();
        expect(input?.checked).toBe(true);
        expect(input?.indeterminate).toBe(false);
        expect(input?.dataset.morph).toBe("");

        state.checked = false;
        state.indeterminate = false;
        flushSync();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        unmount(instance);
    });

    test("checked -> indeterminate sets data-morph and returning to unchecked clears it", () => {
        const state = $state({ checked: true, indeterminate: false });

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                get checked() {
                    return state.checked;
                },
                set checked(next: boolean) {
                    state.checked = next;
                },
                get indeterminate() {
                    return state.indeterminate;
                },
                set indeterminate(next: boolean) {
                    state.indeterminate = next;
                },
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input?.checked).toBe(true);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        state.checked = false;
        state.indeterminate = true;
        flushSync();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(true);
        expect(input?.dataset.morph).toBe("");

        state.checked = false;
        state.indeterminate = false;
        flushSync();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(false);
        expect(input?.hasAttribute("data-morph")).toBe(false);

        unmount(instance);
    });

    test("Checkbox.preview.svelte tri-state Cycle A and Cycle B update checked, indeterminate, and data-morph on every click", async () => {
        const instance = mount(CheckboxPreview, {
            target: container,
        });
        flushSync();

        const cycleA = container.querySelector<HTMLInputElement>(
            'input.cs-checkbox[aria-label="Unchecked to Indeterminate to Checked"]',
        );
        const cycleB = container.querySelector<HTMLInputElement>(
            'input.cs-checkbox[aria-label="Unchecked to Checked to Indeterminate"]',
        );

        expect(cycleA).not.toBeNull();
        expect(cycleB).not.toBeNull();

        // Cycle A: 0 (unchecked) -> 1 (indeterminate) -> 2 (checked) -> 0 (unchecked)
        expect(cycleA?.checked).toBe(false);
        expect(cycleA?.indeterminate).toBe(false);
        expect(cycleA?.hasAttribute("data-morph")).toBe(false);

        cycleA?.click();
        await Promise.resolve();
        flushSync();
        expect(cycleA?.checked).toBe(false);
        expect(cycleA?.indeterminate).toBe(true);
        expect(cycleA?.hasAttribute("data-morph")).toBe(false);

        cycleA?.click();
        await Promise.resolve();
        flushSync();
        expect(cycleA?.checked).toBe(true);
        expect(cycleA?.indeterminate).toBe(false);
        expect(cycleA?.dataset.morph).toBe("");

        cycleA?.click();
        await Promise.resolve();
        flushSync();
        expect(cycleA?.checked).toBe(false);
        expect(cycleA?.indeterminate).toBe(false);
        expect(cycleA?.hasAttribute("data-morph")).toBe(false);

        // Cycle B: 0 (unchecked) -> 1 (checked) -> 2 (indeterminate) -> 0 (unchecked)
        expect(cycleB?.checked).toBe(false);
        expect(cycleB?.indeterminate).toBe(false);
        expect(cycleB?.hasAttribute("data-morph")).toBe(false);

        cycleB?.click();
        await Promise.resolve();
        flushSync();
        expect(cycleB?.checked).toBe(true);
        expect(cycleB?.indeterminate).toBe(false);
        expect(cycleB?.hasAttribute("data-morph")).toBe(false);

        cycleB?.click();
        await Promise.resolve();
        flushSync();
        expect(cycleB?.checked).toBe(false);
        expect(cycleB?.indeterminate).toBe(true);
        expect(cycleB?.dataset.morph).toBe("");

        cycleB?.click();
        await Promise.resolve();
        flushSync();
        expect(cycleB?.checked).toBe(false);
        expect(cycleB?.indeterminate).toBe(false);
        expect(cycleB?.hasAttribute("data-morph")).toBe(false);

        unmount(instance);
    });

    test("onCheckedChange fires with (true) and (false) on user toggle without bind:checked", () => {
        const onCheckedChange = vi.fn();

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                onCheckedChange,
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input).not.toBeNull();
        expect(input?.checked).toBe(false);

        input?.click();
        flushSync();
        expect(input?.checked).toBe(true);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenLastCalledWith(true);

        input?.click();
        flushSync();
        expect(input?.checked).toBe(false);
        expect(onCheckedChange).toHaveBeenCalledTimes(2);
        expect(onCheckedChange).toHaveBeenLastCalledWith(false);

        unmount(instance);
    });

    test("clicking an indeterminate checkbox clears indeterminate and fires onIndeterminateChange(false) and onCheckedChange(true)", () => {
        const onCheckedChange = vi.fn();
        const onIndeterminateChange = vi.fn();

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                checked: false,
                indeterminate: true,
                onCheckedChange,
                onIndeterminateChange,
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input).not.toBeNull();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(true);

        input?.click();
        flushSync();
        expect(input?.checked).toBe(true);
        expect(input?.indeterminate).toBe(false);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenLastCalledWith(true);
        expect(onIndeterminateChange).toHaveBeenCalledTimes(1);
        expect(onIndeterminateChange).toHaveBeenLastCalledWith(false);

        unmount(instance);
    });

    test("tri-state onchange from checked to indeterminate fires onCheckedChange(false) and onIndeterminateChange(true)", () => {
        const onCheckedChange = vi.fn();
        const onIndeterminateChange = vi.fn();

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                checked: true,
                indeterminate: false,
                onCheckedChange,
                onIndeterminateChange,
                onchange: (event: Event & { currentTarget: HTMLInputElement }) => {
                    event.currentTarget.checked = false;
                    event.currentTarget.indeterminate = true;
                },
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input).not.toBeNull();
        expect(input?.checked).toBe(true);
        expect(input?.indeterminate).toBe(false);

        input?.click();
        flushSync();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(true);
        expect(onCheckedChange).toHaveBeenCalledTimes(1);
        expect(onCheckedChange).toHaveBeenLastCalledWith(false);
        expect(onIndeterminateChange).toHaveBeenCalledTimes(1);
        expect(onIndeterminateChange).toHaveBeenLastCalledWith(true);

        unmount(instance);
    });

    test("does not fire onCheckedChange or onIndeterminateChange when its respective value did not change", () => {
        const onCheckedChange = vi.fn();
        const onIndeterminateChange = vi.fn();

        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
                checked: false,
                indeterminate: false,
                onCheckedChange,
                onIndeterminateChange,
                onchange: (event: Event & { currentTarget: HTMLInputElement }) => {
                    event.currentTarget.checked = false;
                    event.currentTarget.indeterminate = true;
                },
            },
        });
        flushSync();

        const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
        expect(input).not.toBeNull();

        // unchecked -> indeterminate: checked stays false, indeterminate becomes true
        input?.click();
        flushSync();
        expect(input?.checked).toBe(false);
        expect(input?.indeterminate).toBe(true);
        expect(onCheckedChange).not.toHaveBeenCalled();
        expect(onIndeterminateChange).toHaveBeenCalledTimes(1);
        expect(onIndeterminateChange).toHaveBeenLastCalledWith(true);

        // Clicking again: onchange keeps checked = false and indeterminate = true -> neither fires
        input?.click();
        flushSync();
        expect(onCheckedChange).not.toHaveBeenCalled();
        expect(onIndeterminateChange).toHaveBeenCalledTimes(1);

        unmount(instance);
    });

    test("renders a single continuous .cs-checkbox-dash path (d='M5 12H19') with no overlapping round caps", () => {
        const instance = mount(Checkbox, {
            target: container,
            props: {
                variant: "soft",
                size: "md",
            },
        });
        flushSync();

        const dashPaths = container.querySelectorAll<SVGPathElement>(
            ":scope svg.cs-checkbox-icon path.cs-checkbox-dash",
        );
        expect(dashPaths).toHaveLength(1);
        expect(dashPaths[0]?.getAttribute("d")).toBe("M5 12H19");

        unmount(instance);
    });

    test("initial indeterminate mount suppresses data-dash-enter, sets data-settled after rAF, and sets data-dash-enter on unchecked -> indeterminate", () => {
        const rafQueue: FrameRequestCallback[] = [];
        vi.stubGlobal(
            "requestAnimationFrame",
            vi.fn((cb: FrameRequestCallback) => {
                rafQueue.push(cb);
                return rafQueue.length;
            }),
        );
        vi.stubGlobal("cancelAnimationFrame", vi.fn());

        try {
            const state = $state({ checked: false, indeterminate: true });

            const instance = mount(Checkbox, {
                target: container,
                props: {
                    variant: "soft",
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(next: boolean) {
                        state.checked = next;
                    },
                    get indeterminate() {
                        return state.indeterminate;
                    },
                    set indeterminate(next: boolean) {
                        state.indeterminate = next;
                    },
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-checkbox");
            expect(input).not.toBeNull();
            expect(input?.indeterminate).toBe(true);
            expect(input?.hasAttribute("data-dash-enter")).toBe(false);
            expect(input?.hasAttribute("data-settled")).toBe(false);

            // Advance the settlement animation frame
            expect(rafQueue.length).toBeGreaterThan(0);
            rafQueue.shift()?.(16);
            flushSync();

            expect(input?.hasAttribute("data-settled")).toBe(true);
            expect(input?.hasAttribute("data-dash-enter")).toBe(false);

            // Transition indeterminate -> unchecked
            state.indeterminate = false;
            flushSync();
            expect(input?.indeterminate).toBe(false);
            expect(input?.hasAttribute("data-dash-enter")).toBe(false);

            // Subsequent unchecked -> indeterminate transition sets data-dash-enter
            state.indeterminate = true;
            flushSync();
            expect(input?.indeterminate).toBe(true);
            expect(input?.hasAttribute("data-dash-enter")).toBe(true);

            unmount(instance);
        } finally {
            vi.unstubAllGlobals();
        }
    });
});
