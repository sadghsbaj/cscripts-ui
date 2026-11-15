import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import CheckboxGroupTestHost from "./CheckboxGroupTestHost.internal.svelte";

interface TestCheckboxItem {
    value: string;
    name?: string;
    disabled?: boolean;
    invalid?: boolean;
    onCheckedChange?: (checked: boolean) => void;
}

interface TestSelectAllConfig {
    disabled?: boolean;
    invalid?: boolean;
    class?: string;
    onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
}

describe("CheckboxGroup Svelte 5 Component", () => {
    let container: HTMLDivElement;

    const defaultItems: TestCheckboxItem[] = [{ value: "a" }, { value: "b" }, { value: "c" }];

    function getGroup(): HTMLDivElement | null {
        return container.querySelector<HTMLDivElement>(".cs-checkbox-group");
    }

    function getItem(value: string): HTMLInputElement | null {
        return container.querySelector<HTMLInputElement>(`input.cs-checkbox[value="${CSS.escape(value)}"]`);
    }

    function getSelectAll(): HTMLInputElement | null {
        return container.querySelector<HTMLInputElement>("input.cs-checkbox-group-select-all");
    }

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("Root semantics & attributes", () => {
        test("renders role='group', .cs-checkbox-group, custom class, rest attributes, and ref binding", () => {
            let ref = $state<HTMLDivElement | null>(null);

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    class: "custom-group",
                    groupAttrs: {
                        "aria-label": "Features",
                        "data-testid": "features-group",
                    },
                    get ref() {
                        return ref;
                    },
                    set ref(next: HTMLDivElement | null) {
                        ref = next;
                    },
                },
            });
            flushSync();

            const group = getGroup();
            expect(group).not.toBeNull();
            expect(ref).toBe(group);
            expect(group?.getAttribute("role")).toBe("group");
            expect(group?.classList.contains("cs-checkbox-group")).toBe(true);
            expect(group?.classList.contains("custom-group")).toBe(true);
            expect(group?.getAttribute("aria-label")).toBe("Features");
            expect(group?.dataset.testid).toBe("features-group");
            expect(group?.getAttribute("aria-disabled")).toBeNull();
            expect(group?.hasAttribute("data-disabled")).toBe(false);
            expect(group?.getAttribute("aria-invalid")).toBeNull();
            expect(group?.hasAttribute("data-invalid")).toBe(false);

            unmount(instance);
        });

        test("disabled and invalid set aria-* and data-* attributes reactively", () => {
            let disabled = $state(true);
            let invalid = $state(true);

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    get disabled() {
                        return disabled;
                    },
                    get invalid() {
                        return invalid;
                    },
                },
            });
            flushSync();

            const group = getGroup();
            expect(group?.getAttribute("aria-disabled")).toBe("true");
            expect(group?.dataset.disabled).toBe("");
            expect(group?.dataset.invalid).toBe("");

            disabled = false;
            invalid = false;
            flushSync();

            expect(group?.getAttribute("aria-disabled")).toBeNull();
            expect(group?.hasAttribute("data-disabled")).toBe(false);
            expect(group?.hasAttribute("data-invalid")).toBe(false);

            unmount(instance);
        });
    });

    describe("$bindable & controlled value + onValueChange", () => {
        test("clicking child Checkbox toggles value in $bindable array without duplicates and fires onValueChange", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
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

            expect(getItem("a")?.checked).toBe(true);
            expect(getItem("b")?.checked).toBe(false);

            // Toggle "b" on
            getItem("b")?.click();
            flushSync();
            expect(value).toEqual(["a", "b"]);
            expect(getItem("b")?.checked).toBe(true);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);

            // Toggle "a" off
            getItem("a")?.click();
            flushSync();
            expect(value).toEqual(["b"]);
            expect(getItem("a")?.checked).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith(["b"]);

            // Toggle "a" back on — no duplicates
            getItem("a")?.click();
            flushSync();
            expect(value).toEqual(["b", "a"]);
            expect(new Set(value).size).toBe(value.length);
            expect(onValueChange).toHaveBeenCalledTimes(3);

            unmount(instance);
        });

        test("controlled mode fires onValueChange without mutating DOM checked state until value prop updates", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    mode: "controlled",
                    items: defaultItems,
                    get value() {
                        return value;
                    },
                    onValueChange,
                },
            });
            flushSync();

            expect(getItem("a")?.checked).toBe(true);
            expect(getItem("b")?.checked).toBe(false);

            // Click "b" — parent does not update value yet
            getItem("b")?.click();
            flushSync();

            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
            expect(value).toEqual(["a"]);
            expect(getItem("b")?.checked).toBe(false);

            // Now parent accepts and updates controlled value
            value = ["a", "b"];
            flushSync();
            expect(getItem("b")?.checked).toBe(true);

            unmount(instance);
        });
    });

    describe("Form & State Propagation (name, disabled, invalid)", () => {
        test("name propagates to child Checkboxes unless child specifies its own name", () => {
            const items: TestCheckboxItem[] = [
                { value: "a" },
                { value: "b", name: "custom-b" },
            ];

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    name: "features",
                    items,
                    selectAll: {},
                },
            });
            flushSync();

            expect(getItem("a")?.getAttribute("name")).toBe("features");
            expect(getItem("b")?.getAttribute("name")).toBe("custom-b");
            // SelectAll must not inherit group.name
            expect(getSelectAll()?.getAttribute("name")).toBeNull();

            unmount(instance);
        });

        test("group disabled disables all child items and SelectAll and blocks toggling", () => {
            let value = $state<string[]>(["a"]);
            let disabled = $state(true);
            const onValueChange = vi.fn();

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    selectAll: {},
                    get disabled() {
                        return disabled;
                    },
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

            expect(getItem("a")?.disabled).toBe(true);
            expect(getItem("b")?.disabled).toBe(true);
            expect(getSelectAll()?.disabled).toBe(true);

            getItem("b")?.click();
            getSelectAll()?.click();
            flushSync();

            expect(value).toEqual(["a"]);
            expect(onValueChange).not.toHaveBeenCalled();

            // Re-enable group
            disabled = false;
            flushSync();

            expect(getItem("a")?.disabled).toBe(false);
            expect(getItem("b")?.disabled).toBe(false);
            expect(getSelectAll()?.disabled).toBe(false);

            getItem("b")?.click();
            flushSync();
            expect(value).toEqual(["a", "b"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("group invalid propagates aria-invalid='true' to children and SelectAll unless child overrides invalid={false}", () => {
            const items: TestCheckboxItem[] = [
                { value: "a" },
                { value: "b", invalid: false },
            ];

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    invalid: true,
                    items,
                    selectAll: {},
                },
            });
            flushSync();

            expect(getItem("a")?.getAttribute("aria-invalid")).toBe("true");
            expect(getItem("b")?.getAttribute("aria-invalid")).toBeNull();
            expect(getSelectAll()?.getAttribute("aria-invalid")).toBe("true");

            unmount(instance);
        });
    });

    describe("CheckboxGroupSelectAll tri-state & interaction", () => {
        test("cycles unchecked -> checked -> unchecked and reflects partial selection as indeterminate", () => {
            let value = $state<string[]>([]);
            const onValueChange = vi.fn();
            const selectAllChange = vi.fn();
            const selectAll: TestSelectAllConfig = { onchange: selectAllChange };

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    selectAll,
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

            const all = getSelectAll();
            expect(all).not.toBeNull();
            // 0 selected
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);

            // Partial selection
            getItem("a")?.click();
            flushSync();
            expect(value).toEqual(["a"]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(true);

            // Click SelectAll from partial -> selects all enabled items
            all?.click();
            flushSync();
            expect(value).toEqual(["a", "b", "c"]);
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);
            expect(selectAllChange).toHaveBeenCalledTimes(1);

            // Click SelectAll from all-selected -> deselects all enabled items
            all?.click();
            flushSync();
            expect(value).toEqual([]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);
            expect(selectAllChange).toHaveBeenCalledTimes(2);

            // Click SelectAll from empty -> selects all enabled items
            all?.click();
            flushSync();
            expect(value).toEqual(["a", "b", "c"]);
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);
            expect(selectAllChange).toHaveBeenCalledTimes(3);

            unmount(instance);
        });

        test("respects disabled items: ignores unselected disabled items for isAllSelected and preserves pre-selected disabled items", () => {
            let value = $state<string[]>(["d-checked"]);
            const items: TestCheckboxItem[] = [
                { value: "a" },
                { value: "b" },
                { value: "d-unchecked", disabled: true },
                { value: "d-checked", disabled: true },
            ];

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items,
                    selectAll: {},
                    get value() {
                        return value;
                    },
                    set value(next: string[]) {
                        value = next;
                    },
                },
            });
            flushSync();

            const all = getSelectAll();
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);

            // Select "a" -> partial
            getItem("a")?.click();
            flushSync();
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(true);

            // Select "b" -> all enabled items selected even though "d-unchecked" is disabled & unselected
            getItem("b")?.click();
            flushSync();
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);

            // Click SelectAll to deselect enabled items -> "d-checked" must be preserved
            all?.click();
            flushSync();
            expect(value).toEqual(["d-checked"]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);

            unmount(instance);
        });

        test("SelectAll does not register itself in value[] and stays synced when controlled group rejects change", () => {
            const value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    mode: "controlled",
                    items: defaultItems,
                    selectAll: {},
                    get value() {
                        return value;
                    },
                    onValueChange,
                },
            });
            flushSync();

            const all = getSelectAll();
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(true);

            all?.click();
            flushSync();

            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
            // Controlled value didn't change, so SelectAll DOM properties remain synced to partial state
            expect(value).toEqual(["a"]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(true);

            unmount(instance);
        });
    });

    describe("Dynamic mount/unmount & Standalone coexistence", () => {
        test("dynamically adding and removing items updates SelectAll tri-state reactively", () => {
            let value = $state<string[]>(["a", "b"]);
            let items = $state<TestCheckboxItem[]>([{ value: "a" }, { value: "b" }]);

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    selectAll: {},
                    get items() {
                        return items;
                    },
                    get value() {
                        return value;
                    },
                    set value(next: string[]) {
                        value = next;
                    },
                },
            });
            flushSync();

            const all = getSelectAll();
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);

            // Dynamically mount unselected item "c" -> SelectAll becomes indeterminate
            items = [{ value: "a" }, { value: "b" }, { value: "c" }];
            flushSync();
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(true);

            // Dynamically unmount "c" -> SelectAll becomes checked again
            items = [{ value: "a" }, { value: "b" }];
            flushSync();
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);

            unmount(instance);
        });

        test("unvalued Checkbox inside group and standalone Checkbox outside group operate independently without affecting group.value", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items: [{ value: "a" }, { value: "b" }],
                    selectAll: {},
                    includeUnvaluedChild: true,
                    includeStandalone: true,
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

            const unvalued = container.querySelector<HTMLInputElement>('[data-testid="unvalued-child"]');
            const standalone = container.querySelector<HTMLInputElement>('[data-testid="standalone-checkbox"]');
            expect(unvalued).not.toBeNull();
            expect(standalone).not.toBeNull();

            unvalued?.click();
            standalone?.click();
            flushSync();

            expect(unvalued?.checked).toBe(true);
            expect(standalone?.checked).toBe(true);
            expect(value).toEqual(["a"]);
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("child Checkbox onCheckedChange still fires when toggled inside a CheckboxGroup", () => {
            let value = $state<string[]>([]);
            const onCheckedChangeA = vi.fn();
            const items: TestCheckboxItem[] = [
                { value: "a", onCheckedChange: onCheckedChangeA },
                { value: "b" },
            ];

            const instance = mount(CheckboxGroupTestHost, {
                target: container,
                props: {
                    items,
                    get value() {
                        return value;
                    },
                    set value(next: string[]) {
                        value = next;
                    },
                },
            });
            flushSync();

            getItem("a")?.click();
            flushSync();
            expect(onCheckedChangeA).toHaveBeenCalledTimes(1);
            expect(onCheckedChangeA).toHaveBeenLastCalledWith(true);

            getItem("a")?.click();
            flushSync();
            expect(onCheckedChangeA).toHaveBeenCalledTimes(2);
            expect(onCheckedChangeA).toHaveBeenLastCalledWith(false);

            unmount(instance);
        });

        test.each([
            { label: "partial selection", initial: ["a"] },
            { label: "empty selection", initial: [] as string[] },
        ])(
            "clicking SelectAll then unchecking a child updates SelectAll to indeterminate ($label)",
            ({ initial }) => {
                let value = $state<string[]>([...initial]);

                const instance = mount(CheckboxGroupTestHost, {
                    target: container,
                    props: {
                        items: defaultItems,
                        selectAll: {},
                        get value() {
                            return value;
                        },
                        set value(next: string[]) {
                            value = next;
                        },
                    },
                });
                flushSync();

                const selectAll = getSelectAll();
                const itemB = getItem("b");
                expect(selectAll).not.toBeNull();
                expect(itemB).not.toBeNull();

                // Step 2: Click SelectAll so all enabled items become selected
                selectAll?.click();
                flushSync();
                expect(value).toEqual(["a", "b", "c"]);
                expect(selectAll?.checked).toBe(true);
                expect(selectAll?.indeterminate).toBe(false);

                // Step 3: Click one child <Checkbox> to uncheck it
                itemB?.click();
                flushSync();

                // Step 4: Assert SelectAll.checked === false, SelectAll.indeterminate === true, and value excludes "b"
                expect(value).toEqual(["a", "c"]);
                expect({
                    checked: selectAll?.checked,
                    indeterminate: selectAll?.indeterminate,
                }).toEqual({
                    checked: false,
                    indeterminate: true,
                });

                unmount(instance);
            },
        );
    });
});
