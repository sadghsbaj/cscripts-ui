import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ControlGroupTestHost from "./ControlGroupTestHost.internal.svelte";
import { createControlGroup, type ControlGroupContext } from "./index.ts";

interface ContextProbeResult {
    id: string;
    hasPrimary: boolean;
    primaryGroup: ControlGroupContext | undefined;
    hasSecondary: boolean;
    secondaryGroup: ControlGroupContext | undefined;
}

describe("createControlGroup", () => {
    describe("Initial & Unusual value Inputs", () => {
        test("normalizes undefined value to empty array", () => {
            const rawValue: readonly string[] | undefined = undefined;
            const group = createControlGroup({
                value: () => rawValue,
            });

            expect(group.value).toEqual([]);
            expect(group.isSelected("a")).toBe(false);
        });

        test("handles empty array value", () => {
            const group = createControlGroup({
                value: () => [],
            });

            expect(group.value).toEqual([]);
            expect(group.isSelected("a")).toBe(false);
        });

        test("handles pre-populated value array", () => {
            const group = createControlGroup({
                value: () => ["a", "b"],
            });

            expect(group.value).toEqual(["a", "b"]);
            expect(group.isSelected("a")).toBe(true);
            expect(group.isSelected("b")).toBe(true);
            expect(group.isSelected("c")).toBe(false);
        });

        test("handles duplicate entries in value array", () => {
            let value = $state<string[]>(["a", "a"]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            // Selecting an already-selected duplicate is idempotent
            group.setSelected("a", true);
            expect(onValueChange).not.toHaveBeenCalled();
            expect(value).toEqual(["a", "a"]);

            // Adding another value deduplicates existing entries
            group.setSelected("b", true);
            expect(value).toEqual(["a", "b"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);

            // Reset to duplicates and deselect "a": removes ALL occurrences
            value = ["a", "b", "a"];
            flushSync();
            group.setSelected("a", false);
            expect(value).toEqual(["b"]);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith(["b"]);
        });
    });

    describe("$bindable vs. Strict Controlled Mode", () => {
        test("$bindable mode (setValue provided) updates bound state and calls onValueChange", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            group.setSelected("b", true);
            flushSync();
            expect(value).toEqual(["a", "b"]);
            expect(group.value).toEqual(["a", "b"]);
            expect(group.isSelected("b")).toBe(true);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);

            group.toggle("a");
            flushSync();
            expect(value).toEqual(["b"]);
            expect(group.value).toEqual(["b"]);
            expect(group.isSelected("a")).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith(["b"]);
        });

        test("strict controlled mode (setValue omitted) calls onValueChange without mutating external state until parent updates", () => {
            let parentValue = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => parentValue,
                onValueChange,
            });

            group.setSelected("b", true);
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
            // External state has not changed because parent didn't apply it
            expect(parentValue).toEqual(["a"]);
            expect(group.value).toEqual(["a"]);
            expect(group.isSelected("b")).toBe(false);

            group.toggle("a");
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith([]);
            expect(parentValue).toEqual(["a"]);
            expect(group.isSelected("a")).toBe(true);

            // Once parent updates its state, group reflects it
            parentValue = ["b"];
            flushSync();
            expect(group.value).toEqual(["b"]);
            expect(group.isSelected("a")).toBe(false);
            expect(group.isSelected("b")).toBe(true);
        });
    });

    describe("Idempotency (onValueChange Suppression)", () => {
        test("setSelected(item, true) when already selected does not call setValue or onValueChange", () => {
            let value = $state<string[]>(["a"]);
            const setValue = vi.fn((next: string[]) => {
                value = next;
            });
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue,
                onValueChange,
            });

            group.setSelected("a", true);
            expect(setValue).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();
        });

        test("setSelected(item, false) when not selected does not call setValue or onValueChange", () => {
            let value = $state<string[]>(["a"]);
            const setValue = vi.fn((next: string[]) => {
                value = next;
            });
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue,
                onValueChange,
            });

            group.setSelected("b", false);
            expect(setValue).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();
        });

        test("setAllSelected(true) when all enabled items are already selected does not call onValueChange", () => {
            let value = $state<string[]>(["a", "b"]);
            const setValue = vi.fn((next: string[]) => {
                value = next;
            });
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue,
                onValueChange,
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "b" });
            group.registerItem({ value: () => "c", disabled: () => true });

            group.setAllSelected(true);
            expect(setValue).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();
        });

        test("setAllSelected(false) when no enabled items are selected does not call onValueChange", () => {
            let value = $state<string[]>(["c", "external"]);
            const setValue = vi.fn((next: string[]) => {
                value = next;
            });
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue,
                onValueChange,
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "b" });
            group.registerItem({ value: () => "c", disabled: () => true });

            group.setAllSelected(false);
            expect(setValue).not.toHaveBeenCalled();
            expect(onValueChange).not.toHaveBeenCalled();
        });
    });

    describe("disabled Group Guard", () => {
        test("suppresses setSelected, toggle, toggleAll, and setAllSelected when disabled, and re-enables when toggled false", () => {
            let value = $state<string[]>(["a"]);
            let disabled = $state(true);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
                disabled: () => disabled,
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "b" });

            expect(group.disabled).toBe(true);

            group.setSelected("b", true);
            group.toggle("a");
            group.toggleAll();
            group.setAllSelected(true);
            group.setAllSelected(false);

            expect(value).toEqual(["a"]);
            expect(onValueChange).not.toHaveBeenCalled();

            disabled = false;
            flushSync();
            expect(group.disabled).toBe(false);

            group.toggle("b");
            expect(value).toEqual(["a", "b"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);

            group.toggleAll();
            expect(value).toEqual([]);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith([]);
        });
    });

    describe("Array Immutability", () => {
        test("never mutates original value array reference and always emits fresh array references", () => {
            const initial = ["a"];
            let value = $state<string[]>(initial);
            const emitted: string[][] = [];

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange: (next) => {
                    emitted.push(next);
                },
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "b" });

            group.setSelected("b", true);
            expect(initial).toEqual(["a"]);
            expect(emitted[0]).toEqual(["a", "b"]);
            expect(emitted[0]).not.toBe(initial);

            const beforeToggle = value;
            group.toggle("b");
            expect(beforeToggle).toEqual(["a", "b"]);
            expect(emitted[1]).toEqual(["a"]);
            expect(emitted[1]).not.toBe(beforeToggle);

            const beforeToggleAll = value;
            group.toggleAll();
            expect(beforeToggleAll).toEqual(["a"]);
            expect(emitted[2]).toEqual(["a", "b"]);
            expect(emitted[2]).not.toBe(beforeToggleAll);

            const beforeSetAll = value;
            group.setAllSelected(false);
            expect(beforeSetAll).toEqual(["a", "b"]);
            expect(emitted[3]).toEqual([]);
            expect(emitted[3]).not.toBe(beforeSetAll);
            expect(initial).toEqual(["a"]);
        });
    });

    describe("Dynamic Item Registration & Tri-State", () => {
        test("handles zero registered items", () => {
            let value = $state<string[]>([]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            expect(group.hasRegisteredItems).toBe(false);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(false);

            group.toggleAll();
            group.setAllSelected(true);
            group.setAllSelected(false);
            expect(value).toEqual([]);
            expect(onValueChange).not.toHaveBeenCalled();
        });

        test("computes partial and full selection tri-state and toggles all enabled items", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "b" });
            group.registerItem({ value: () => "c" });

            expect(group.hasRegisteredItems).toBe(true);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(true);

            // toggleAll selects remaining enabled items
            group.toggleAll();
            flushSync();
            expect(value).toEqual(["a", "b", "c"]);
            expect(group.isAllSelected).toBe(true);
            expect(group.isIndeterminate).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(1);

            // toggleAll when all selected deselects enabled items
            group.toggleAll();
            flushSync();
            expect(value).toEqual([]);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(2);
        });

        test("respects disabled items and preserves disabled/unregistered values during toggleAll and setAllSelected", () => {
            let value = $state<string[]>(["a", "disabled-selected", "external"]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "disabled-selected", disabled: () => true });
            group.registerItem({ value: () => "disabled-unselected", disabled: () => true });

            // Unselected disabled item does NOT prevent isAllSelected === true
            expect(group.isAllSelected).toBe(true);
            expect(group.isIndeterminate).toBe(false);

            // toggleAll deselects enabled items while preserving pre-selected disabled and unregistered values
            group.toggleAll();
            flushSync();
            expect(value).toEqual(["disabled-selected", "external"]);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(false);

            // toggleAll selects enabled items without selecting disabled-unselected
            group.toggleAll();
            flushSync();
            expect(value).toEqual(["disabled-selected", "external", "a"]);
            expect(value).not.toContain("disabled-unselected");
            expect(group.isAllSelected).toBe(true);

            // setAllSelected(false) also preserves disabled-selected and external
            group.setAllSelected(false);
            flushSync();
            expect(value).toEqual(["disabled-selected", "external"]);
        });

        test("handles all registered items disabled", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            group.registerItem({ value: () => "a", disabled: () => true });
            group.registerItem({ value: () => "b", disabled: () => true });

            expect(group.hasRegisteredItems).toBe(true);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(false);

            group.toggleAll();
            group.setAllSelected(true);
            group.setAllSelected(false);
            expect(value).toEqual(["a"]);
            expect(onValueChange).not.toHaveBeenCalled();
        });

        test("updates tri-state reactively on dynamic register/unregister", () => {
            let value = $state<string[]>(["a"]);

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
            });

            const unregisterA = group.registerItem({ value: () => "a" });
            const unregisterB = group.registerItem({ value: () => "b" });
            flushSync();

            expect(group.hasRegisteredItems).toBe(true);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(true);

            // Unmounting unselected item "b" flips isAllSelected to true
            unregisterB();
            flushSync();
            expect(group.isAllSelected).toBe(true);
            expect(group.isIndeterminate).toBe(false);

            // Registering a new unselected item "c" flips isAllSelected to false and isIndeterminate to true
            const unregisterC = group.registerItem({ value: () => "c" });
            flushSync();
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(true);

            unregisterA();
            unregisterC();
            flushSync();
            expect(group.hasRegisteredItems).toBe(false);
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(false);
        });

        test("updates tri-state reactively when item value or disabled props change", () => {
            let value = $state<string[]>(["a"]);
            let itemBValue = $state("b");
            let itemBDisabled = $state(false);

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({
                value: () => itemBValue,
                disabled: () => itemBDisabled,
            });
            flushSync();

            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(true);

            // Disabling unselected item B makes all enabled items selected
            itemBDisabled = true;
            flushSync();
            expect(group.isAllSelected).toBe(true);
            expect(group.isIndeterminate).toBe(false);

            // Re-enabling item B restores indeterminate
            itemBDisabled = false;
            flushSync();
            expect(group.isAllSelected).toBe(false);
            expect(group.isIndeterminate).toBe(true);

            // Changing item B's value to "a" (which is selected) makes all enabled items selected
            itemBValue = "a";
            flushSync();
            expect(group.isAllSelected).toBe(true);
            expect(group.isIndeterminate).toBe(false);
        });

        test("handles duplicate registered item values without adding duplicate entries to value", () => {
            let value = $state<string[]>([]);
            const onValueChange = vi.fn();

            const group = createControlGroup({
                value: () => value,
                setValue: (next) => {
                    value = next;
                },
                onValueChange,
            });

            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "a" });
            group.registerItem({ value: () => "b" });

            group.setAllSelected(true);
            flushSync();

            expect(value).toEqual(["a", "b"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);

            group.setAllSelected(false);
            flushSync();
            expect(value).toEqual([]);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith([]);
        });
    });

    describe("Context Scoping & Standalone Usage", () => {
        let container: HTMLDivElement;

        beforeEach(() => {
            container = document.createElement("div");
            document.body.append(container);
        });

        afterEach(() => {
            container.remove();
        });

        test("standalone usage outside any group reports hasContext() === false without throwing", () => {
            const probes: ContextProbeResult[] = [];

            const instance = mount(ControlGroupTestHost, {
                target: container,
                props: {
                    mode: "standalone",
                    onProbe: (result: ContextProbeResult) => {
                        probes.push(result);
                    },
                },
            });
            flushSync();

            expect(probes).toHaveLength(1);
            expect(probes[0]).toEqual({
                id: "standalone",
                hasPrimary: false,
                primaryGroup: undefined,
                hasSecondary: false,
                secondaryGroup: undefined,
            });

            unmount(instance);
        });

        test("nested groups using the same context key scope inner children to inner group and outer children to outer group", () => {
            let outerValue = $state<string[]>(["outer-1"]);
            let innerValue = $state<string[]>(["inner-1"]);

            const outerGroup = createControlGroup({
                value: () => outerValue,
                setValue: (next) => {
                    outerValue = next;
                },
            });
            const innerGroup = createControlGroup({
                value: () => innerValue,
                setValue: (next) => {
                    innerValue = next;
                },
            });

            const probes: ContextProbeResult[] = [];

            const instance = mount(ControlGroupTestHost, {
                target: container,
                props: {
                    mode: "nested-same",
                    outerGroup,
                    innerGroup,
                    onProbe: (result: ContextProbeResult) => {
                        probes.push(result);
                    },
                },
            });
            flushSync();

            const outerProbe = probes.find((probe) => probe.id === "outer-child");
            const innerProbe = probes.find((probe) => probe.id === "inner-child");

            expect(outerProbe?.hasPrimary).toBe(true);
            expect(outerProbe?.primaryGroup).toBe(outerGroup);
            expect(innerProbe?.hasPrimary).toBe(true);
            expect(innerProbe?.primaryGroup).toBe(innerGroup);

            // Mutations through resolved contexts stay isolated
            innerProbe?.primaryGroup?.toggle("inner-2");
            expect(innerValue).toEqual(["inner-1", "inner-2"]);
            expect(outerValue).toEqual(["outer-1"]);

            outerProbe?.primaryGroup?.toggle("outer-2");
            expect(outerValue).toEqual(["outer-1", "outer-2"]);
            expect(innerValue).toEqual(["inner-1", "inner-2"]);

            unmount(instance);
        });

        test("separate context keys do not interfere when nested", () => {
            let checkboxValue = $state<string[]>(["c1"]);
            let switchValue = $state<string[]>(["s1"]);

            const checkboxGroup = createControlGroup({
                value: () => checkboxValue,
                setValue: (next) => {
                    checkboxValue = next;
                },
            });
            const switchGroup = createControlGroup({
                value: () => switchValue,
                setValue: (next) => {
                    switchValue = next;
                },
            });

            const probes: ContextProbeResult[] = [];

            const instance = mount(ControlGroupTestHost, {
                target: container,
                props: {
                    mode: "nested-separate",
                    outerGroup: checkboxGroup,
                    innerGroup: switchGroup,
                    onProbe: (result: ContextProbeResult) => {
                        probes.push(result);
                    },
                },
            });
            flushSync();

            expect(probes).toHaveLength(1);
            expect(probes[0]?.hasPrimary).toBe(true);
            expect(probes[0]?.primaryGroup).toBe(checkboxGroup);
            expect(probes[0]?.hasSecondary).toBe(true);
            expect(probes[0]?.secondaryGroup).toBe(switchGroup);

            unmount(instance);
        });
    });

    describe("name and invalid Reactivity", () => {
        test("reflects reactive updates to name and invalid getters", () => {
            let name = $state<string | undefined>(undefined);
            let invalid = $state<boolean | undefined>(false);

            const group = createControlGroup({
                value: () => [],
                name: () => name,
                invalid: () => invalid,
            });

            expect(group.name).toBeUndefined();
            expect(group.invalid).toBe(false);

            name = "prefs";
            invalid = true;
            flushSync();

            expect(group.name).toBe("prefs");
            expect(group.invalid).toBe(true);

            name = undefined;
            invalid = undefined;
            flushSync();

            expect(group.name).toBeUndefined();
            expect(group.invalid).toBe(false);
        });
    });
});
