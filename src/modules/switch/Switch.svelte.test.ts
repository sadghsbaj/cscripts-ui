import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SWITCH_SIZES, Switch } from ".";

describe("Switch Svelte 5 Component", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    describe("DOM, Semantics & Props", () => {
        test("renders a single <input type='checkbox' role='switch' class='cs-switch'> with zero wrapper DOM", () => {
            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                },
            });
            flushSync();

            expect(container.children).toHaveLength(1);
            const input = container.firstElementChild;
            expect(input).toBeInstanceOf(HTMLInputElement);
            expect(input?.tagName).toBe("INPUT");
            expect(input?.getAttribute("type")).toBe("checkbox");
            expect(input?.getAttribute("role")).toBe("switch");
            expect(input?.classList.contains("cs-switch")).toBe(true);

            unmount(instance);
        });

        test("does not emit data-variant on <input class='cs-switch'>", () => {
            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.hasAttribute("data-variant")).toBe(false);
            expect(input?.dataset.variant).toBeUndefined();

            unmount(instance);
        });

        test.each(SWITCH_SIZES)("sets data-size=%s", (size) => {
            const instance = mount(Switch, {
                target: container,
                props: {
                    size,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.dataset.size).toBe(size);

            unmount(instance);
        });

        test("binds ref to HTMLInputElement", () => {
            let boundRef: HTMLInputElement | null = null;

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get ref() {
                        return boundRef;
                    },
                    set ref(el: HTMLInputElement | null) {
                        boundRef = el;
                    },
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(boundRef).toBeInstanceOf(HTMLInputElement);
            expect(boundRef).toBe(input);

            unmount(instance);
        });

        test("forwards rest attributes and custom class while keeping type='checkbox' and role='switch'", () => {
            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "lg",
                    name: "notifications",
                    value: "enabled",
                    disabled: true,
                    "aria-label": "Enable notifications",
                    class: "custom-switch",
                    ...({ type: "text", role: "checkbox" } as Record<string, unknown>),
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input).not.toBeNull();
            expect(input?.name).toBe("notifications");
            expect(input?.value).toBe("enabled");
            expect(input?.disabled).toBe(true);
            expect(input?.getAttribute("aria-label")).toBe("Enable notifications");
            expect(input?.classList.contains("cs-switch")).toBe(true);
            expect(input?.classList.contains("custom-switch")).toBe(true);
            expect(input?.getAttribute("type")).toBe("checkbox");
            expect(input?.getAttribute("role")).toBe("switch");

            unmount(instance);
        });
    });

    describe("Uncontrolled & bind:checked + onCheckedChange", () => {
        test("uncontrolled switch toggles input.checked and fires onCheckedChange(true)/(false) without firing on mount", () => {
            const onCheckedChange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    onCheckedChange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input).not.toBeNull();
            expect(input?.checked).toBe(false);
            expect(onCheckedChange).not.toHaveBeenCalled();

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

        test("two-way bind:checked syncs state and fires onCheckedChange only on user delta", () => {
            const state = $state({ checked: false });
            const onCheckedChange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(next: boolean) {
                        state.checked = next;
                    },
                    onCheckedChange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.checked).toBe(false);
            expect(onCheckedChange).not.toHaveBeenCalled();

            input?.click();
            flushSync();
            expect(state.checked).toBe(true);
            expect(input?.checked).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);

            input?.click();
            flushSync();
            expect(state.checked).toBe(false);
            expect(input?.checked).toBe(false);
            expect(onCheckedChange).toHaveBeenCalledTimes(2);
            expect(onCheckedChange).toHaveBeenLastCalledWith(false);

            // External state update syncs DOM without firing onCheckedChange
            state.checked = true;
            flushSync();
            expect(input?.checked).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledTimes(2);

            unmount(instance);
        });

        test("controlled bind:checked with no-op setter accepts change via onCheckedChange", () => {
            const state = $state({ checked: false });
            const onCheckedChange = vi.fn((next: boolean) => {
                state.checked = next;
            });

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(_next: boolean) {},
                    onCheckedChange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.checked).toBe(false);

            input?.click();
            flushSync();
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);
            expect(state.checked).toBe(true);
            expect(input?.checked).toBe(true);

            input?.click();
            flushSync();
            expect(onCheckedChange).toHaveBeenCalledTimes(2);
            expect(onCheckedChange).toHaveBeenLastCalledWith(false);
            expect(state.checked).toBe(false);
            expect(input?.checked).toBe(false);

            unmount(instance);
        });

        test("controlled bind:checked with no-op setter rejects/reverts change when onCheckedChange does not update state", () => {
            const state = $state({ checked: false });
            const onCheckedChange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(_next: boolean) {},
                    onCheckedChange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.checked).toBe(false);

            input?.click();
            flushSync();
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);
            expect(state.checked).toBe(false);
            expect(input?.checked).toBe(false);

            unmount(instance);
        });

        test("initial checked: true mounts checked without firing onCheckedChange and toggles true -> false -> true", () => {
            const state = $state({ checked: true });
            const onCheckedChange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(next: boolean) {
                        state.checked = next;
                    },
                    onCheckedChange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.checked).toBe(true);
            expect(onCheckedChange).not.toHaveBeenCalled();

            input?.click();
            flushSync();
            expect(state.checked).toBe(false);
            expect(input?.checked).toBe(false);
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(false);

            input?.click();
            flushSync();
            expect(state.checked).toBe(true);
            expect(input?.checked).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledTimes(2);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);

            unmount(instance);
        });

        test("controlled bind:checked with no-op setter rejects/reverts true -> false change when onCheckedChange does not update state", () => {
            const state = $state({ checked: true });
            const onCheckedChange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(_next: boolean) {},
                    onCheckedChange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.checked).toBe(true);

            input?.click();
            flushSync();
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(false);
            expect(state.checked).toBe(true);
            expect(input?.checked).toBe(true);

            unmount(instance);
        });
    });

    describe("onchange Ordering & Label Pairing", () => {
        test("consumer onchange runs before checked / onCheckedChange sync and overriding currentTarget.checked is respected", () => {
            const events: string[] = [];
            const state = $state({ checked: false });

            const onCheckedChange = vi.fn((next: boolean) => {
                events.push(`onCheckedChange:${next}`);
            });

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(next: boolean) {
                        events.push(`setChecked:${next}`);
                        state.checked = next;
                    },
                    onCheckedChange,
                    onchange: (event: Event & { currentTarget: HTMLInputElement }) => {
                        events.push(`onchange:state=${state.checked},target=${event.currentTarget.checked}`);
                    },
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            input?.click();
            flushSync();

            expect(events).toEqual([
                "onchange:state=false,target=true",
                "setChecked:true",
                "onCheckedChange:true",
            ]);

            unmount(instance);
        });

        test("overriding event.currentTarget.checked to previous value inside onchange prevents onCheckedChange", () => {
            const state = $state({ checked: false });
            const onCheckedChange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    get checked() {
                        return state.checked;
                    },
                    set checked(next: boolean) {
                        state.checked = next;
                    },
                    onCheckedChange,
                    onchange: (event: Event & { currentTarget: HTMLInputElement }) => {
                        event.currentTarget.checked = false;
                    },
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            input?.click();
            flushSync();

            expect(state.checked).toBe(false);
            expect(input?.checked).toBe(false);
            expect(onCheckedChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("wrapping <Switch /> inside <label> toggles it when clicking the label text", () => {
            const onCheckedChange = vi.fn();
            const label = document.createElement("label");
            const text = document.createElement("span");
            text.textContent = "Dark mode";
            container.append(label);

            const instance = mount(Switch, {
                target: label,
                props: {
                    size: "md",
                    onCheckedChange,
                },
            });
            label.append(text);
            flushSync();

            const input = label.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.checked).toBe(false);

            text.click();
            flushSync();
            expect(input?.checked).toBe(true);
            expect(onCheckedChange).toHaveBeenCalledTimes(1);
            expect(onCheckedChange).toHaveBeenLastCalledWith(true);

            text.click();
            flushSync();
            expect(input?.checked).toBe(false);
            expect(onCheckedChange).toHaveBeenCalledTimes(2);
            expect(onCheckedChange).toHaveBeenLastCalledWith(false);

            unmount(instance);
        });
    });

    describe("Disabled State", () => {
        test("disabled prevents user toggle via click and does not fire onCheckedChange", () => {
            const state = $state({ checked: false });
            const onCheckedChange = vi.fn();
            const onchange = vi.fn();

            const instance = mount(Switch, {
                target: container,
                props: {
                    size: "md",
                    disabled: true,
                    get checked() {
                        return state.checked;
                    },
                    set checked(next: boolean) {
                        state.checked = next;
                    },
                    onCheckedChange,
                    onchange,
                },
            });
            flushSync();

            const input = container.querySelector<HTMLInputElement>("input.cs-switch");
            expect(input?.disabled).toBe(true);
            expect(input?.checked).toBe(false);

            input?.click();
            flushSync();

            expect(state.checked).toBe(false);
            expect(input?.checked).toBe(false);
            expect(onchange).not.toHaveBeenCalled();
            expect(onCheckedChange).not.toHaveBeenCalled();

            unmount(instance);
        });
    });
});
