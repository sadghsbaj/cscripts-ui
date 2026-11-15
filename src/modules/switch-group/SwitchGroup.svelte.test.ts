import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SwitchGroupSelectAll } from ".";
import type { SwitchSize } from "../switch/index.ts";
import SwitchGroupTestHost from "./SwitchGroupTestHost.internal.svelte";

interface TestSwitchItem {
    value: string;
    size?: SwitchSize;
    name?: string;
    disabled?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
}

interface TestSelectAllConfig {
    size?: SwitchSize;
    disabled?: boolean;
    class?: string;
    onchange?: (event: Event & { currentTarget: EventTarget & HTMLInputElement }) => void;
}

describe("SwitchGroup Svelte 5 Component", () => {
    let container: HTMLDivElement;

    const defaultItems: TestSwitchItem[] = [{ value: "a" }, { value: "b" }, { value: "c" }];

    function getGroup(): HTMLDivElement | null {
        return container.querySelector<HTMLDivElement>(".cs-switch-group");
    }

    function getItem(value: string): HTMLInputElement | null {
        return container.querySelector<HTMLInputElement>(`input.cs-switch[value="${CSS.escape(value)}"]`);
    }

    function getSelectAll(): HTMLInputElement | null {
        return container.querySelector<HTMLInputElement>("input.cs-switch-group-select-all");
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
        test("renders <div role='group' class='cs-switch-group'> with ref, custom class, rest attributes, and no invalid/size/variant attrs", () => {
            let ref = $state<HTMLDivElement | null>(null);

            const instance = mount(SwitchGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    class: "custom-group",
                    groupAttrs: {
                        "aria-label": "Notifications",
                        "data-testid": "notifications-group",
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
            expect(group).toBeInstanceOf(HTMLDivElement);
            expect(ref).toBe(group);
            expect(group?.getAttribute("role")).toBe("group");
            expect(group?.classList.contains("cs-switch-group")).toBe(true);
            expect(group?.classList.contains("custom-group")).toBe(true);
            expect(group?.getAttribute("aria-label")).toBe("Notifications");
            expect(group?.dataset.testid).toBe("notifications-group");
            expect(group?.getAttribute("aria-disabled")).toBeNull();
            expect(group?.hasAttribute("data-disabled")).toBe(false);
            expect(group?.getAttribute("aria-invalid")).toBeNull();
            expect(group?.hasAttribute("data-invalid")).toBe(false);
            expect(group?.hasAttribute("data-size")).toBe(false);
            expect(group?.hasAttribute("data-variant")).toBe(false);

            unmount(instance);
        });

        test("disabled sets aria-disabled and data-disabled reactively without emitting invalid/size/variant attrs", () => {
            let disabled = $state(true);

            const instance = mount(SwitchGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    get disabled() {
                        return disabled;
                    },
                },
            });
            flushSync();

            const group = getGroup();
            expect(group?.getAttribute("aria-disabled")).toBe("true");
            expect(group?.dataset.disabled).toBe("");
            expect(group?.getAttribute("aria-invalid")).toBeNull();
            expect(group?.hasAttribute("data-invalid")).toBe(false);
            expect(group?.hasAttribute("data-size")).toBe(false);
            expect(group?.hasAttribute("data-variant")).toBe(false);

            disabled = false;
            flushSync();

            expect(group?.getAttribute("aria-disabled")).toBeNull();
            expect(group?.hasAttribute("data-disabled")).toBe(false);

            unmount(instance);
        });
    });

    describe("$bindable & controlled value + onValueChange", () => {
        test("clicking child Switch toggles value in $bindable array without duplicates and fires onValueChange", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(SwitchGroupTestHost, {
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

        test("controlled bind:value={get, set} keeps DOM input.checked in sync on rejection and updates on acceptance", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(SwitchGroupTestHost, {
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

            // Reject turning "b" on
            getItem("b")?.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b"]);
            expect(value).toEqual(["a"]);
            expect(getItem("b")?.checked).toBe(false);

            // Reject turning "a" off
            getItem("a")?.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith([]);
            expect(value).toEqual(["a"]);
            expect(getItem("a")?.checked).toBe(true);

            // Parent accepts update
            value = ["a", "b"];
            flushSync();
            expect(getItem("a")?.checked).toBe(true);
            expect(getItem("b")?.checked).toBe(true);

            unmount(instance);
        });
    });

    describe("Form & State Propagation (name, disabled)", () => {
        test("name propagates to child Switches unless child specifies its own name, and SelectAll never inherits group.name", () => {
            const items: TestSwitchItem[] = [
                { value: "a" },
                { value: "b", name: "custom-b" },
            ];

            const instance = mount(SwitchGroupTestHost, {
                target: container,
                props: {
                    name: "channels",
                    items,
                    selectAll: {},
                },
            });
            flushSync();

            expect(getItem("a")?.getAttribute("name")).toBe("channels");
            expect(getItem("b")?.getAttribute("name")).toBe("custom-b");
            expect(getSelectAll()?.getAttribute("name")).toBeNull();

            unmount(instance);
        });

        test("group disabled disables all child items and SelectAll and blocks toggling until re-enabled", () => {
            let value = $state<string[]>(["a"]);
            let disabled = $state(true);
            const onValueChange = vi.fn();

            const instance = mount(SwitchGroupTestHost, {
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

        test("per-item disabled and SelectAll disabled operate independently without disabling sibling items", () => {
            let value = $state<string[]>([]);
            const onValueChange = vi.fn();
            const items: TestSwitchItem[] = [
                { value: "a", disabled: true },
                { value: "b" },
            ];

            const instance = mount(SwitchGroupTestHost, {
                target: container,
                props: {
                    items,
                    selectAll: { disabled: true },
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
            expect(getItem("b")?.disabled).toBe(false);
            expect(getSelectAll()?.disabled).toBe(true);

            getItem("a")?.click();
            getSelectAll()?.click();
            flushSync();
            expect(value).toEqual([]);
            expect(onValueChange).not.toHaveBeenCalled();

            getItem("b")?.click();
            flushSync();
            expect(value).toEqual(["b"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            // Only enabled item "b" is selected, so SelectAll reflects isAllSelected === true
            expect(getSelectAll()?.checked).toBe(true);

            unmount(instance);
        });
    });

    describe("SwitchGroupSelectAll binary master switch & interaction", () => {
        test("renders switch semantics with ref, class, data-size, and never sets indeterminate or aria-checked='mixed'", () => {
            let value = $state<string[]>([]);
            let selectAllRef = $state<HTMLInputElement | null>(null);

            const instance = mount(SwitchGroupTestHost, {
                target: container,
                props: {
                    items: defaultItems,
                    selectAll: { size: "lg", class: "custom-all" },
                    get selectAllRef() {
                        return selectAllRef;
                    },
                    set selectAllRef(next: HTMLInputElement | null) {
                        selectAllRef = next;
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
            expect(all).toBeInstanceOf(HTMLInputElement);
            expect(selectAllRef).toBe(all);
            expect(all?.getAttribute("type")).toBe("checkbox");
            expect(all?.getAttribute("role")).toBe("switch");
            expect(all?.classList.contains("cs-switch")).toBe(true);
            expect(all?.classList.contains("cs-switch-group-select-all")).toBe(true);
            expect(all?.classList.contains("custom-all")).toBe(true);
            expect(all?.dataset.size).toBe("lg");

            // Empty -> false, never indeterminate / mixed
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);
            expect(all?.getAttribute("aria-checked")).not.toBe("mixed");

            // Partial -> still false, never indeterminate / mixed
            getItem("a")?.click();
            flushSync();
            expect(value).toEqual(["a"]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);
            expect(all?.getAttribute("aria-checked")).not.toBe("mixed");

            // All selected -> true, never indeterminate / mixed
            getItem("b")?.click();
            getItem("c")?.click();
            flushSync();
            expect(value).toEqual(["a", "b", "c"]);
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);
            expect(all?.getAttribute("aria-checked")).not.toBe("mixed");

            unmount(instance);
        });

        test("toggles all enabled items on/off across empty, partial, full, and child-deselect transitions", () => {
            let value = $state<string[]>([]);
            const onValueChange = vi.fn();
            const selectAllChange = vi.fn();
            const selectAll: TestSelectAllConfig = { onchange: selectAllChange };

            const instance = mount(SwitchGroupTestHost, {
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
            expect(all?.checked).toBe(false);

            // Partial selection -> click SelectAll -> selects all enabled items
            getItem("a")?.click();
            flushSync();
            expect(value).toEqual(["a"]);
            expect(all?.checked).toBe(false);

            all?.click();
            flushSync();
            expect(value).toEqual(["a", "b", "c"]);
            expect(all?.checked).toBe(true);
            expect(all?.indeterminate).toBe(false);
            expect(selectAllChange).toHaveBeenCalledTimes(1);

            // Click SelectAll when all selected -> deselects all enabled items
            all?.click();
            flushSync();
            expect(value).toEqual([]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);
            expect(selectAllChange).toHaveBeenCalledTimes(2);

            // Click SelectAll when empty -> selects all enabled items
            all?.click();
            flushSync();
            expect(value).toEqual(["a", "b", "c"]);
            expect(all?.checked).toBe(true);
            expect(selectAllChange).toHaveBeenCalledTimes(3);

            // Uncheck one child -> SelectAll becomes false (not indeterminate/mixed)
            getItem("b")?.click();
            flushSync();
            expect(value).toEqual(["a", "c"]);
            expect(all?.checked).toBe(false);
            expect(all?.indeterminate).toBe(false);
            expect(all?.getAttribute("aria-checked")).not.toBe("mixed");

            unmount(instance);
        });

        test("preserves pre-selected disabled items and unregistered values on toggleAll(), and ignores unselected disabled items for isAllSelected", () => {
            let value = $state<string[]>(["d-checked", "external-val"]);
            const items: TestSwitchItem[] = [
                { value: "a" },
                { value: "b" },
                { value: "d-unchecked", disabled: true },
                { value: "d-checked", disabled: true },
            ];

            const instance = mount(SwitchGroupTestHost, {
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

            // Select "a" -> still partial
            getItem("a")?.click();
            flushSync();
            expect(all?.checked).toBe(false);

            // Select "b" -> all enabled items selected even though "d-unchecked" is disabled & unselected
            getItem("b")?.click();
            flushSync();
            expect(all?.checked).toBe(true);

            // Click SelectAll to deselect enabled items -> "d-checked" and "external-val" must be preserved
            all?.click();
            flushSync();
            expect(value).toEqual(["d-checked", "external-val"]);
            expect(all?.checked).toBe(false);

            // Click SelectAll to re-select enabled items -> "d-checked" and "external-val" stay preserved, "d-unchecked" stays unselected
            all?.click();
            flushSync();
            expect(value).toEqual(["d-checked", "external-val", "a", "b"]);
            expect(getItem("d-unchecked")?.checked).toBe(false);
            expect(all?.checked).toBe(true);

            unmount(instance);
        });

        test("SelectAll does not register in value[] and stays synced when controlled group rejects select-all or deselect-all", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(SwitchGroupTestHost, {
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

            // Reject selecting all from partial state
            all?.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
            expect(value).toEqual(["a"]);
            expect(all?.checked).toBe(false);

            // Accept all selected, then reject deselecting all
            value = ["a", "b", "c"];
            flushSync();
            expect(all?.checked).toBe(true);

            all?.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith([]);
            expect(value).toEqual(["a", "b", "c"]);
            expect(all?.checked).toBe(true);

            unmount(instance);
        });

        test("SwitchGroupSelectAll outside SwitchGroup defaults to unchecked and enabled", () => {
            const instance = mount(SwitchGroupSelectAll, {
                target: container,
                props: {
                    size: "md",
                },
            });
            flushSync();

            const all = getSelectAll();
            expect(all?.checked).toBe(false);
            expect(all?.disabled).toBe(false);
            expect(all?.indeterminate).toBe(false);

            unmount(instance);
        });
    });

    describe("Dynamic mount/unmount, standalone Switch, & callback ordering", () => {
        test("dynamically mounting and unmounting items updates SelectAll.checked reactively", () => {
            let value = $state<string[]>(["a", "b"]);
            let items = $state<TestSwitchItem[]>([{ value: "a" }, { value: "b" }]);

            const instance = mount(SwitchGroupTestHost, {
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

            // Dynamically mount unselected item "c" -> SelectAll becomes false
            items = [{ value: "a" }, { value: "b" }, { value: "c" }];
            flushSync();
            expect(all?.checked).toBe(false);

            // Dynamically unmount "c" -> SelectAll becomes true again
            items = [{ value: "a" }, { value: "b" }];
            flushSync();
            expect(all?.checked).toBe(true);

            unmount(instance);
        });

        test("unvalued Switch inside SwitchGroup and standalone Switch outside SwitchGroup do not register or affect group.value", () => {
            let value = $state<string[]>(["a"]);
            const onValueChange = vi.fn();

            const instance = mount(SwitchGroupTestHost, {
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
            const standalone = container.querySelector<HTMLInputElement>('[data-testid="standalone-switch"]');
            expect(unvalued).not.toBeNull();
            expect(standalone).not.toBeNull();

            unvalued?.click();
            standalone?.click();
            flushSync();

            expect(unvalued?.checked).toBe(true);
            expect(standalone?.checked).toBe(true);
            expect(value).toEqual(["a"]);
            expect(onValueChange).not.toHaveBeenCalled();

            // Select "b" -> only "a" and "b" are registered items, so SelectAll becomes true
            getItem("b")?.click();
            flushSync();
            expect(value).toEqual(["a", "b"]);
            expect(getSelectAll()?.checked).toBe(true);

            unmount(instance);
        });

        test("Switch onchange fires before onCheckedChange inside SwitchGroup, and onCheckedChange is skipped when controlled group rejects change", () => {
            const events: string[] = [];
            let value = $state<string[]>([]);
            let mode = $state<"bound" | "controlled">("bound");

            const items: TestSwitchItem[] = [
                {
                    value: "a",
                    onchange: (event) => {
                        events.push(`onchange:${event.currentTarget.checked}`);
                    },
                    onCheckedChange: (checked) => {
                        events.push(`onCheckedChange:${checked}`);
                    },
                },
                { value: "b" },
            ];

            const instance = mount(SwitchGroupTestHost, {
                target: container,
                props: {
                    get mode() {
                        return mode;
                    },
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

            // Bound mode: toggle on then off -> onchange before onCheckedChange
            getItem("a")?.click();
            flushSync();
            expect(events).toEqual(["onchange:true", "onCheckedChange:true"]);

            events.length = 0;
            getItem("a")?.click();
            flushSync();
            expect(events).toEqual(["onchange:false", "onCheckedChange:false"]);

            // Controlled rejection: onchange fires, DOM checked reverts, onCheckedChange does NOT fire
            events.length = 0;
            mode = "controlled";
            flushSync();

            getItem("a")?.click();
            flushSync();
            expect(events).toEqual(["onchange:true"]);
            expect(getItem("a")?.checked).toBe(false);

            unmount(instance);
        });
    });
});
