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
});
