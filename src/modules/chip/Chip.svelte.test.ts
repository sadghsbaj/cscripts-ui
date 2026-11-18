import { flushSync, mount, unmount } from "svelte";
import { Check } from "@lucide/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ChipTestHost, { type ChipHostItem } from "./ChipTestHost.internal.svelte";
import {
    Chip,
    CHIP_SIZES,
    CHIP_TRIGGER_ELEMENTS,
    CHIP_VARIANTS,
    ChipIcon,
    ChipTrigger,
    type ChipSize,
    type ChipTriggerProps,
    type ChipVariant,
} from "./index.ts";

describe("Chip Svelte 5 Component Family", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
    });

    function getGroup(): HTMLDivElement | null {
        return container.querySelector<HTMLDivElement>(".cs-chip-group");
    }

    function getChip(itemId?: string): HTMLSpanElement | null {
        if (itemId) {
            return container.querySelector<HTMLSpanElement>(`span.cs-chip[data-item-id="${CSS.escape(itemId)}"]`);
        }
        return container.querySelector<HTMLSpanElement>("span.cs-chip");
    }

    function getTrigger(itemId?: string): HTMLButtonElement | HTMLAnchorElement | null {
        const scope = itemId ? getChip(itemId) : container;
        return scope?.querySelector<HTMLButtonElement | HTMLAnchorElement>(".cs-chip-trigger") ?? null;
    }

    function getRemove(itemId?: string): HTMLButtonElement | null {
        const scope = itemId ? getChip(itemId) : container;
        return scope?.querySelector<HTMLButtonElement>("button.cs-chip-remove") ?? null;
    }

    test("exports canonical variant, size, and trigger element option lists", () => {
        expect(CHIP_VARIANTS).toEqual(["soft", "elevated", "accent"]);
        expect(CHIP_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
        expect(CHIP_TRIGGER_ELEMENTS).toEqual(["button", "a"]);
    });

    describe("Four Uniform Compositions & DOM Structure", () => {
        test("renders static chip as a plain span without interactive buttons or fill layer", () => {
            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showIcon: true,
                    labelText: "TypeScript",
                },
            });
            flushSync();

            const chip = getChip();
            expect(chip).not.toBeNull();
            expect(chip?.tagName).toBe("SPAN");
            expect(chip?.dataset.variant).toBe("soft");
            expect(chip?.dataset.size).toBe("md");
            expect(chip?.hasAttribute("data-interactive")).toBe(false);
            expect(chip?.hasAttribute("data-split")).toBe(false);
            expect(chip?.hasAttribute("data-pressed")).toBe(false);
            expect(chip?.querySelector("button, a")).toBeNull();
            expect(chip?.querySelector(".cs-chip-fill")).toBeNull();
            expect(chip?.querySelector(".cs-chip-label")?.textContent).toBe("TypeScript");
            expect(chip?.querySelector(".cs-chip-icon")?.getAttribute("aria-hidden")).toBe("true");

            unmount(instance);
        });

        test("renders removable chip with span shell and button.cs-chip-remove without interactive/split flags", () => {
            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "elevated",
                    size: "sm",
                    showRemove: true,
                    labelText: "Alice",
                },
            });
            flushSync();

            const chip = getChip();
            const remove = getRemove();
            expect(chip?.tagName).toBe("SPAN");
            expect(chip?.hasAttribute("data-interactive")).toBe(false);
            expect(chip?.hasAttribute("data-split")).toBe(false);
            expect(chip?.querySelector(".cs-chip-fill")).toBeNull();
            expect(remove).not.toBeNull();
            expect(remove?.tagName).toBe("BUTTON");
            expect(remove?.type).toBe("button");

            unmount(instance);
        });

        test("renders interactive full-pill trigger with data-interactive, no data-split, and fill inside trigger", () => {
            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "accent",
                    size: "lg",
                    showTrigger: true,
                    showIcon: true,
                    triggerKind: "toggle",
                    labelText: "Open",
                },
            });
            flushSync();

            const chip = getChip();
            const trigger = getTrigger();
            expect(chip?.tagName).toBe("SPAN");
            expect(chip?.hasAttribute("data-interactive")).toBe(true);
            expect(chip?.hasAttribute("data-split")).toBe(false);
            expect(trigger?.tagName).toBe("BUTTON");

            const directFill = chip?.querySelector(":scope > .cs-chip-fill");
            const triggerFill = trigger?.querySelector(":scope > .cs-chip-fill");
            expect(directFill).toBeNull();
            expect(triggerFill).not.toBeNull();
            expect(triggerFill?.getAttribute("aria-hidden")).toBe("true");
            expect(trigger?.querySelector(":scope > .cs-chip-trigger-content > .cs-chip-icon:first-child")).not.toBeNull();

            unmount(instance);
        });

        test("renders split chip with data-interactive and data-split, placing fill directly inside chip shell", () => {
            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showTrigger: true,
                    showRemove: true,
                    triggerKind: "toggle",
                    labelText: "Status: Open",
                },
            });
            flushSync();

            const chip = getChip();
            const trigger = getTrigger();
            const remove = getRemove();
            expect(chip?.tagName).toBe("SPAN");
            expect(chip?.hasAttribute("data-interactive")).toBe(true);
            expect(chip?.hasAttribute("data-split")).toBe(true);
            expect(trigger).not.toBeNull();
            expect(remove).not.toBeNull();

            const directFill = chip?.querySelector(":scope > .cs-chip-fill");
            const triggerFill = trigger?.querySelector(":scope > .cs-chip-fill");
            expect(directFill).not.toBeNull();
            expect(directFill?.getAttribute("aria-hidden")).toBe("true");
            expect(triggerFill).toBeNull();

            unmount(instance);
        });

        test("applies variant, size, invalid, iconOnly, and disabled data attributes reactively", () => {
            let variant = $state<ChipVariant>("soft");
            let size = $state<ChipSize>("xs");
            let invalid = $state(false);
            let iconOnly = $state(false);
            let disabled = $state(false);

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    get variant() {
                        return variant;
                    },
                    get size() {
                        return size;
                    },
                    get invalid() {
                        return invalid;
                    },
                    get iconOnly() {
                        return iconOnly;
                    },
                    get disabled() {
                        return disabled;
                    },
                    showIcon: true,
                    labelText: "Tag",
                },
            });
            flushSync();

            const chip = getChip();
            for (const nextVariant of CHIP_VARIANTS) {
                variant = nextVariant;
                flushSync();
                expect(chip?.dataset.variant).toBe(nextVariant);
            }

            for (const nextSize of CHIP_SIZES) {
                size = nextSize;
                flushSync();
                expect(chip?.dataset.size).toBe(nextSize);
            }

            expect(chip?.hasAttribute("data-invalid")).toBe(false);
            expect(chip?.hasAttribute("data-icon-only")).toBe(false);
            expect(chip?.hasAttribute("data-disabled")).toBe(false);

            invalid = true;
            iconOnly = true;
            disabled = true;
            flushSync();

            expect(chip?.dataset.invalid).toBe("");
            expect(chip?.dataset.iconOnly).toBe("");
            expect(chip?.dataset.disabled).toBe("");

            invalid = false;
            iconOnly = false;
            disabled = false;
            flushSync();

            expect(chip?.hasAttribute("data-invalid")).toBe(false);
            expect(chip?.hasAttribute("data-icon-only")).toBe(false);
            expect(chip?.hasAttribute("data-disabled")).toBe(false);

            unmount(instance);
        });

        test("binds ref and forwards rest attributes, classes, roles, and tabindex across Chip subcomponents", () => {
            let groupRef: HTMLDivElement | null = null;
            let chipRef: HTMLSpanElement | null = null;
            let triggerRef: HTMLButtonElement | HTMLAnchorElement | null = null;
            let labelRef: HTMLSpanElement | null = null;
            let removeRef: HTMLButtonElement | null = null;

            const singleInstance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showIcon: true,
                    strokeWidth: 1.75,
                    showTrigger: true,
                    showRemove: true,
                    triggerKind: "action",
                    labelText: "Forwarding",
                    get chipRef() {
                        return chipRef;
                    },
                    set chipRef(el: HTMLSpanElement | null) {
                        chipRef = el;
                    },
                    get triggerRef() {
                        return triggerRef;
                    },
                    set triggerRef(el: HTMLButtonElement | HTMLAnchorElement | null) {
                        triggerRef = el;
                    },
                    get labelRef() {
                        return labelRef;
                    },
                    set labelRef(el: HTMLSpanElement | null) {
                        labelRef = el;
                    },
                    get removeRef() {
                        return removeRef;
                    },
                    set removeRef(el: HTMLButtonElement | null) {
                        removeRef = el;
                    },
                    chipAttrs: {
                        class: "custom-chip",
                        role: "option",
                        "aria-selected": "true",
                        "data-testid": "chip-el",
                    },
                    triggerAttrs: { class: "custom-trigger", tabindex: -1, "data-testid": "trigger-el" },
                    labelAttrs: { class: "custom-label", "data-testid": "label-el" },
                    removeAttrs: { class: "custom-remove", tabindex: -1, "data-testid": "remove-el" },
                    iconAttrs: { class: "custom-icon", "data-testid": "icon-el" },
                },
            });
            flushSync();

            const chip = getChip();
            const trigger = getTrigger();
            const label = container.querySelector<HTMLSpanElement>(".cs-chip-label");
            const remove = getRemove();
            const icon = container.querySelector<SVGElement>(".cs-chip-icon");

            expect(chipRef).toBe(chip);
            expect(chip?.classList.contains("cs-chip")).toBe(true);
            expect(chip?.classList.contains("custom-chip")).toBe(true);
            expect(chip?.getAttribute("role")).toBe("option");
            expect(chip?.getAttribute("aria-selected")).toBe("true");
            expect(chip?.dataset.testid).toBe("chip-el");

            expect(triggerRef).toBe(trigger);
            expect(trigger?.classList.contains("cs-chip-trigger")).toBe(true);
            expect(trigger?.classList.contains("custom-trigger")).toBe(true);
            expect(trigger?.getAttribute("tabindex")).toBe("-1");
            expect(trigger?.dataset.testid).toBe("trigger-el");

            expect(labelRef).toBe(label);
            expect(label?.classList.contains("cs-chip-label")).toBe(true);
            expect(label?.classList.contains("custom-label")).toBe(true);
            expect(label?.dataset.testid).toBe("label-el");

            expect(removeRef).toBe(remove);
            expect(remove?.classList.contains("cs-chip-remove")).toBe(true);
            expect(remove?.classList.contains("custom-remove")).toBe(true);
            expect(remove?.getAttribute("tabindex")).toBe("-1");
            expect(remove?.dataset.testid).toBe("remove-el");

            expect(icon?.classList.contains("cs-chip-icon")).toBe(true);
            expect(icon?.classList.contains("custom-icon")).toBe(true);
            expect(icon?.getAttribute("stroke-width")).toBe("1.75");
            expect(icon?.dataset.testid).toBe("icon-el");

            unmount(singleInstance);
            expect(chipRef).toBeNull();
            expect(triggerRef).toBeNull();
            expect(labelRef).toBeNull();
            expect(removeRef).toBeNull();

            const groupInstance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "soft",
                    groupSize: "md",
                    get groupRef() {
                        return groupRef;
                    },
                    set groupRef(el: HTMLDivElement | null) {
                        groupRef = el;
                    },
                    groupAttrs: { class: "custom-group", role: "listbox", "data-testid": "group-el" },
                    items: [{ id: "a", label: "A", showTrigger: false }],
                },
            });
            flushSync();

            const group = getGroup();
            expect(groupRef).toBe(group);
            expect(group?.classList.contains("cs-chip-group")).toBe(true);
            expect(group?.classList.contains("custom-group")).toBe(true);
            expect(group?.getAttribute("role")).toBe("listbox");
            expect(group?.dataset.testid).toBe("group-el");

            unmount(groupInstance);
            expect(groupRef).toBeNull();
        });

        test("ChipIcon defaults strokeWidth to 2.25 and sets aria-hidden='true'", () => {
            const instance = mount(ChipIcon, {
                target: container,
                props: { icon: Check },
            });
            flushSync();

            const icon = container.querySelector<SVGElement>(".cs-chip-icon");
            expect(icon).not.toBeNull();
            expect(icon?.getAttribute("aria-hidden")).toBe("true");
            expect(icon?.getAttribute("stroke-width")).toBe("2.25");

            unmount(instance);
        });
    });

    describe("Validation & Nesting Guards", () => {
        test("standalone Chip throws descriptive Error when variant or size is omitted", () => {
            expect(() => {
                mount(Chip, { target: container, props: {} });
                flushSync();
            }).toThrow(/requires both `variant` and `size`/);

            expect(() => {
                mount(Chip, { target: container, props: { variant: "soft" } });
                flushSync();
            }).toThrow(/requires both `variant` and `size`/);

            expect(() => {
                mount(Chip, { target: container, props: { size: "md" } });
                flushSync();
            }).toThrow(/requires both `variant` and `size`/);
        });

        test("Chip inherits variant and size from ChipGroup, allows child overrides, and throws if neither provides them", () => {
            expect(() => {
                mount(ChipTestHost, {
                    target: container,
                    props: {
                        mode: "group",
                        items: [{ id: "missing", label: "Missing", showTrigger: false }],
                    },
                });
                flushSync();
            }).toThrow(/requires both `variant` and `size`/);

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "soft",
                    groupSize: "sm",
                    items: [
                        { id: "inherited", label: "Inherited", showTrigger: false },
                        { id: "override-variant", label: "Accent", variant: "accent", showTrigger: false },
                        {
                            id: "override-both",
                            label: "Large Elevated",
                            variant: "elevated",
                            size: "lg",
                            showTrigger: false,
                        },
                    ],
                },
            });
            flushSync();

            expect(getChip("inherited")?.dataset.variant).toBe("soft");
            expect(getChip("inherited")?.dataset.size).toBe("sm");

            expect(getChip("override-variant")?.dataset.variant).toBe("accent");
            expect(getChip("override-variant")?.dataset.size).toBe("sm");

            expect(getChip("override-both")?.dataset.variant).toBe("elevated");
            expect(getChip("override-both")?.dataset.size).toBe("lg");

            unmount(instance);
        });

        test("ChipTrigger with value outside ChipGroup throws descriptive Error", () => {
            expect(() => {
                mount(ChipTestHost, {
                    target: container,
                    props: {
                        mode: "single",
                        variant: "soft",
                        size: "md",
                        showTrigger: true,
                        triggerKind: "value",
                        triggerValue: "orphan",
                    },
                });
                flushSync();
            }).toThrow(/must be used inside a <ChipGroup>/);
        });

        test("link ChipTrigger throws descriptive Error when given pressed or value", () => {
            expect(() => {
                mount(ChipTrigger, {
                    target: container,
                    props: {
                        href: "/tags/svelte",
                        pressed: true,
                    } as unknown as ChipTriggerProps,
                });
                flushSync();
            }).toThrow(/rendered as an <a> link cannot use `value` or `pressed`/);

            expect(() => {
                mount(ChipTrigger, {
                    target: container,
                    props: {
                        as: "a",
                        href: "/tags/svelte",
                        pressed: false,
                    } as unknown as ChipTriggerProps,
                });
                flushSync();
            }).toThrow(/rendered as an <a> link cannot use `value` or `pressed`/);

            expect(() => {
                mount(ChipTestHost, {
                    target: container,
                    props: {
                        mode: "group",
                        groupVariant: "soft",
                        groupSize: "md",
                        items: [
                            {
                                id: "bad-link",
                                label: "Bad Link",
                                href: "/tags/bad",
                                triggerAttrs: { value: "bad" },
                            },
                        ],
                    },
                });
                flushSync();
            }).toThrow(/rendered as an <a> link cannot use `value` or `pressed`/);
        });

        test("nesting ChipRemove inside ChipTrigger throws descriptive Error", () => {
            expect(() => {
                mount(ChipTestHost, {
                    target: container,
                    props: {
                        mode: "nested-remove-in-trigger",
                    },
                });
                flushSync();
            }).toThrow(/must be a sibling of <ChipTrigger> inside <Chip>, not nested inside <ChipTrigger>/);
        });
    });

    describe("Interactive States, Links & Accessibility", () => {
        test("ChipTrigger enforces type='button' and omits aria-pressed on action buttons", () => {
            const onTriggerClick = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "elevated",
                    size: "md",
                    showTrigger: true,
                    triggerKind: "action",
                    labelText: "Summarize",
                    onTriggerClick,
                    triggerAttrs: { type: "submit" },
                },
            });
            flushSync();

            const chip = getChip();
            const trigger = getTrigger() as HTMLButtonElement | null;
            expect(trigger?.tagName).toBe("BUTTON");
            expect(trigger?.getAttribute("type")).toBe("button");
            expect(trigger?.hasAttribute("aria-pressed")).toBe(false);

            trigger?.click();
            flushSync();

            expect(onTriggerClick).toHaveBeenCalledTimes(1);
            expect(trigger?.hasAttribute("aria-pressed")).toBe(false);
            expect(chip?.hasAttribute("data-pressed")).toBe(false);

            unmount(instance);
        });

        test("standalone toggle ChipTrigger supports bind:pressed, onPressedChange, and mirrors data-pressed onto Chip", () => {
            let pressed = $state(false);
            const onPressedChange = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showTrigger: true,
                    showRemove: true,
                    triggerKind: "toggle",
                    labelText: "Only Open",
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

            const chip = getChip();
            const trigger = getTrigger();
            expect(trigger?.getAttribute("aria-pressed")).toBe("false");
            expect(chip?.hasAttribute("data-pressed")).toBe(false);

            trigger?.click();
            flushSync();
            expect(pressed).toBe(true);
            expect(trigger?.getAttribute("aria-pressed")).toBe("true");
            expect(chip?.dataset.pressed).toBe("");
            expect(onPressedChange).toHaveBeenCalledTimes(1);
            expect(onPressedChange).toHaveBeenLastCalledWith(true);

            trigger?.click();
            flushSync();
            expect(pressed).toBe(false);
            expect(trigger?.getAttribute("aria-pressed")).toBe("false");
            expect(chip?.hasAttribute("data-pressed")).toBe(false);
            expect(onPressedChange).toHaveBeenCalledTimes(2);
            expect(onPressedChange).toHaveBeenLastCalledWith(false);

            // Parent state update propagates to trigger and chip shell
            pressed = true;
            flushSync();
            expect(trigger?.getAttribute("aria-pressed")).toBe("true");
            expect(chip?.dataset.pressed).toBe("");

            unmount(instance);
        });

        test("onclick calling event.preventDefault() prevents toggle and skips onPressedChange", () => {
            let pressed = $state(false);
            const onPressedChange = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showTrigger: true,
                    triggerKind: "toggle",
                    labelText: "Guarded",
                    get pressed() {
                        return pressed;
                    },
                    set pressed(next: boolean) {
                        pressed = next;
                    },
                    onPressedChange,
                    onTriggerClick: (event: MouseEvent) => {
                        event.preventDefault();
                    },
                },
            });
            flushSync();

            const trigger = getTrigger();
            trigger?.click();
            flushSync();

            expect(pressed).toBe(false);
            expect(trigger?.getAttribute("aria-pressed")).toBe("false");
            expect(getChip()?.hasAttribute("data-pressed")).toBe(false);
            expect(onPressedChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("strict controlled bind:pressed keeps DOM synced to parent value while firing onPressedChange", () => {
            let strictPressed = $state(false);
            const onPressedChange = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "strict-trigger",
                    labelText: "Controlled",
                    get strictPressed() {
                        return strictPressed;
                    },
                    onPressedChange,
                },
            });
            flushSync();

            const chip = getChip();
            const trigger = getTrigger();
            expect(trigger?.getAttribute("aria-pressed")).toBe("false");

            // Parent refuses update -> DOM stays false
            trigger?.click();
            flushSync();
            expect(onPressedChange).toHaveBeenCalledTimes(1);
            expect(onPressedChange).toHaveBeenLastCalledWith(true);
            expect(trigger?.getAttribute("aria-pressed")).toBe("false");
            expect(chip?.hasAttribute("data-pressed")).toBe(false);

            // Parent accepts update -> DOM reflects true
            strictPressed = true;
            flushSync();
            expect(trigger?.getAttribute("aria-pressed")).toBe("true");
            expect(chip?.dataset.pressed).toBe("");

            unmount(instance);
        });

        test("link ChipTrigger renders <a> with href when enabled, and omits href with aria-disabled/data-disabled/tabindex=-1 when disabled", () => {
            let triggerDisabled = $state(false);
            const onTriggerClick = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showTrigger: true,
                    triggerKind: "link",
                    triggerHref: "/tags/svelte",
                    get triggerDisabled() {
                        return triggerDisabled;
                    },
                    onTriggerClick,
                    labelText: "#svelte",
                    triggerAttrs: { tabindex: 0 },
                },
            });
            flushSync();

            const anchor = getTrigger() as HTMLAnchorElement | null;
            expect(anchor?.tagName).toBe("A");
            expect(anchor?.getAttribute("href")).toBe("/tags/svelte");
            expect(anchor?.hasAttribute("type")).toBe(false);
            expect(anchor?.hasAttribute("aria-pressed")).toBe(false);
            expect(anchor?.hasAttribute("disabled")).toBe(false);
            expect(anchor?.hasAttribute("aria-disabled")).toBe(false);
            expect(anchor?.hasAttribute("data-disabled")).toBe(false);
            expect(anchor?.getAttribute("tabindex")).toBe("0");

            triggerDisabled = true;
            flushSync();

            expect(anchor?.hasAttribute("href")).toBe(false);
            expect(anchor?.getAttribute("role")).toBe("link");
            expect(anchor?.getAttribute("aria-disabled")).toBe("true");
            expect(anchor?.dataset.disabled).toBe("");
            expect(anchor?.getAttribute("tabindex")).toBe("-1");

            const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
            const dispatched = anchor?.dispatchEvent(clickEvent);
            flushSync();

            expect(dispatched).toBe(false);
            expect(clickEvent.defaultPrevented).toBe(true);
            expect(onTriggerClick).not.toHaveBeenCalled();

            triggerDisabled = false;
            flushSync();
            expect(anchor?.getAttribute("href")).toBe("/tags/svelte");
            expect(anchor?.hasAttribute("aria-disabled")).toBe(false);
            expect(anchor?.getAttribute("tabindex")).toBe("0");

            unmount(instance);
        });

        test("disabled ChipTrigger button ignores clicks and skips onclick and onPressedChange", () => {
            let pressed = $state(false);
            let chipDisabled = $state(true);
            const onPressedChange = vi.fn();
            const onTriggerClick = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    get disabled() {
                        return chipDisabled;
                    },
                    showTrigger: true,
                    triggerKind: "toggle",
                    get pressed() {
                        return pressed;
                    },
                    set pressed(next: boolean) {
                        pressed = next;
                    },
                    onPressedChange,
                    onTriggerClick,
                },
            });
            flushSync();

            const trigger = getTrigger() as HTMLButtonElement | null;
            expect(trigger?.disabled).toBe(true);
            expect(trigger?.dataset.disabled).toBe("");

            trigger?.click();
            trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();

            expect(pressed).toBe(false);
            expect(onTriggerClick).not.toHaveBeenCalled();
            expect(onPressedChange).not.toHaveBeenCalled();

            chipDisabled = false;
            flushSync();
            expect(trigger?.disabled).toBe(false);
            expect(trigger?.hasAttribute("data-disabled")).toBe(false);

            trigger?.click();
            flushSync();
            expect(pressed).toBe(true);
            expect(onTriggerClick).toHaveBeenCalledTimes(1);
            expect(onPressedChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("per-trigger disabled on button ChipTrigger ignores clicks while sibling ChipRemove remains enabled in split mode", () => {
            let pressed = $state(false);
            const onPressedChange = vi.fn();
            const onTriggerClick = vi.fn();
            const onRemoveClick = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showTrigger: true,
                    showRemove: true,
                    triggerKind: "toggle",
                    triggerDisabled: true,
                    get pressed() {
                        return pressed;
                    },
                    set pressed(next: boolean) {
                        pressed = next;
                    },
                    onPressedChange,
                    onTriggerClick,
                    onRemoveClick,
                },
            });
            flushSync();

            const chip = getChip();
            const trigger = getTrigger() as HTMLButtonElement | null;
            const remove = getRemove();

            expect(chip?.hasAttribute("data-disabled")).toBe(false);
            expect(trigger?.disabled).toBe(true);
            expect(trigger?.dataset.disabled).toBe("");
            expect(remove?.disabled).toBe(false);

            trigger?.click();
            flushSync();
            expect(pressed).toBe(false);
            expect(onTriggerClick).not.toHaveBeenCalled();
            expect(onPressedChange).not.toHaveBeenCalled();

            remove?.click();
            flushSync();
            expect(onRemoveClick).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("ChipRemove enforces type='button', defaults localized aria-label, allows overrides, and isolates disabled state", () => {
            const onTriggerClick = vi.fn();
            const onRemoveClick = vi.fn();

            // Default localized aria-label + custom type="submit" attempt + tabindex=-1
            const defaultInstance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showTrigger: true,
                    showRemove: true,
                    triggerKind: "action",
                    removeDisabled: true,
                    onTriggerClick,
                    onRemoveClick,
                    removeAttrs: { type: "submit", tabindex: -1 },
                },
            });
            flushSync();

            const trigger = getTrigger() as HTMLButtonElement | null;
            const remove = getRemove();
            expect(remove?.getAttribute("type")).toBe("button");
            expect(remove?.getAttribute("aria-label")).toBe("Remove");
            expect(remove?.getAttribute("tabindex")).toBe("-1");
            expect(remove?.disabled).toBe(true);
            expect(remove?.dataset.disabled).toBe("");
            expect(remove?.querySelector("svg.cs-chip-remove-icon")?.getAttribute("aria-hidden")).toBe("true");
            expect(remove?.querySelector("svg.cs-chip-remove-icon")?.getAttribute("stroke-width")).toBe("2.5");

            // Sibling trigger stays enabled while remove is disabled
            expect(trigger?.disabled).toBe(false);
            trigger?.click();
            flushSync();
            expect(onTriggerClick).toHaveBeenCalledTimes(1);

            remove?.click();
            flushSync();
            expect(onRemoveClick).not.toHaveBeenCalled();

            unmount(defaultInstance);

            // Custom aria-label override + custom children snippet
            const customLabelInstance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showRemove: true,
                    customRemoveText: "×",
                    removeAttrs: { "aria-label": "Remove TypeScript" },
                },
            });
            flushSync();

            const customRemove = getRemove();
            expect(customRemove?.getAttribute("aria-label")).toBe("Remove TypeScript");
            expect(customRemove?.textContent?.trim()).toBe("×");
            expect(customRemove?.querySelector("svg.cs-chip-remove-icon")).toBeNull();

            unmount(customLabelInstance);

            // aria-labelledby omits default aria-label
            const labelledByInstance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    showRemove: true,
                    removeAttrs: { "aria-labelledby": "external-remove-label" },
                },
            });
            flushSync();

            const labelledByRemove = getRemove();
            expect(labelledByRemove?.hasAttribute("aria-label")).toBe(false);
            expect(labelledByRemove?.getAttribute("aria-labelledby")).toBe("external-remove-label");

            unmount(labelledByInstance);
        });
    });

    describe("ChipGroup Selection & Inheritance", () => {
        const groupItems: ChipHostItem[] = [
            { id: "open", label: "Open", value: "open" },
            { id: "closed", label: "Closed", value: "closed" },
            { id: "draft", label: "Draft", value: "draft" },
        ];

        test("single-select binds value, fires onValueChange across A -> B -> A -> A, and syncs external updates", () => {
            let value = $state<string | undefined>(undefined);
            const onValueChange = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "soft",
                    groupSize: "md",
                    items: groupItems,
                    get groupValue() {
                        return value;
                    },
                    set groupValue(next: string | string[] | undefined) {
                        value = next as string | undefined;
                    },
                    onGroupValueChange: onValueChange,
                },
            });
            flushSync();

            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("false");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("false");

            // Select A
            getTrigger("open")?.click();
            flushSync();
            expect(value).toBe("open");
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(getChip("open")?.dataset.pressed).toBe("");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("open");

            // Switch A -> B
            getTrigger("closed")?.click();
            flushSync();
            expect(value).toBe("closed");
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("false");
            expect(getChip("open")?.hasAttribute("data-pressed")).toBe(false);
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("true");
            expect(getChip("closed")?.dataset.pressed).toBe("");
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("closed");

            // Switch B -> A
            getTrigger("open")?.click();
            flushSync();
            expect(value).toBe("open");
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("false");
            expect(onValueChange).toHaveBeenCalledTimes(3);
            expect(onValueChange).toHaveBeenLastCalledWith("open");

            // Deselect A -> undefined
            getTrigger("open")?.click();
            flushSync();
            expect(value).toBeUndefined();
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("false");
            expect(getChip("open")?.hasAttribute("data-pressed")).toBe(false);
            expect(onValueChange).toHaveBeenCalledTimes(4);
            expect(onValueChange).toHaveBeenLastCalledWith(undefined);

            // External parent mutation updates DOM
            value = "draft";
            flushSync();
            expect(getTrigger("draft")?.getAttribute("aria-pressed")).toBe("true");
            expect(getChip("draft")?.dataset.pressed).toBe("");

            unmount(instance);
        });

        test("multi-select toggles values into and out of string[] even starting from undefined", () => {
            let value = $state<string[] | undefined>(undefined);
            const onValueChange = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "elevated",
                    groupSize: "md",
                    multiple: true,
                    items: groupItems,
                    get groupValue() {
                        return value;
                    },
                    set groupValue(next: string | string[] | undefined) {
                        value = next as string[] | undefined;
                    },
                    onGroupValueChange: onValueChange,
                },
            });
            flushSync();

            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("false");

            getTrigger("open")?.click();
            flushSync();
            expect(value).toEqual(["open"]);
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(onValueChange).toHaveBeenLastCalledWith(["open"]);

            getTrigger("closed")?.click();
            flushSync();
            expect(value).toEqual(["open", "closed"]);
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("true");
            expect(onValueChange).toHaveBeenLastCalledWith(["open", "closed"]);

            getTrigger("open")?.click();
            flushSync();
            expect(value).toEqual(["closed"]);
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("false");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("true");
            expect(onValueChange).toHaveBeenLastCalledWith(["closed"]);

            // External array update syncs DOM
            value = ["open", "draft"];
            flushSync();
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("false");
            expect(getTrigger("draft")?.getAttribute("aria-pressed")).toBe("true");

            unmount(instance);
        });

        test("strict controlled ChipGroup keeps selection synced to parent while firing onValueChange", () => {
            let strictGroupValue = $state<string | undefined>("open");
            const onValueChange = vi.fn();

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "strict-group",
                    groupVariant: "soft",
                    groupSize: "md",
                    items: groupItems,
                    get strictGroupValue() {
                        return strictGroupValue;
                    },
                    onGroupValueChange: onValueChange,
                },
            });
            flushSync();

            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("false");

            getTrigger("closed")?.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("closed");
            // Setter was a no-op so DOM remains synced to parent value
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("true");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("false");

            strictGroupValue = "closed";
            flushSync();
            expect(getTrigger("open")?.getAttribute("aria-pressed")).toBe("false");
            expect(getTrigger("closed")?.getAttribute("aria-pressed")).toBe("true");

            unmount(instance);
        });

        test("split chip inside ChipGroup isolates trigger selection from ChipRemove clicks, and preventDefault cancels toggle", () => {
            let value = $state<string | undefined>(undefined);
            const onValueChange = vi.fn();
            const onRemoveOpen = vi.fn();
            const onRemoveClosed = vi.fn();

            const splitItems: ChipHostItem[] = [
                {
                    id: "open",
                    label: "Open",
                    value: "open",
                    showRemove: true,
                    onRemoveClick: onRemoveOpen,
                },
                {
                    id: "closed",
                    label: "Closed",
                    value: "closed",
                    showRemove: true,
                    onclick: (event: MouseEvent) => {
                        event.preventDefault();
                    },
                    onRemoveClick: onRemoveClosed,
                },
            ];

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "soft",
                    groupSize: "md",
                    items: splitItems,
                    get groupValue() {
                        return value;
                    },
                    set groupValue(next: string | string[] | undefined) {
                        value = next as string | undefined;
                    },
                    onGroupValueChange: onValueChange,
                },
            });
            flushSync();

            // Clicking ChipRemove does not toggle group selection
            getRemove("open")?.click();
            flushSync();
            expect(onRemoveOpen).toHaveBeenCalledTimes(1);
            expect(value).toBeUndefined();
            expect(onValueChange).not.toHaveBeenCalled();

            // Clicking ChipTrigger toggles group selection without triggering ChipRemove
            getTrigger("open")?.click();
            flushSync();
            expect(value).toBe("open");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onRemoveOpen).toHaveBeenCalledTimes(1);

            // Clicking ChipTrigger whose onclick calls preventDefault cancels group.toggle
            getTrigger("closed")?.click();
            flushSync();
            expect(value).toBe("open");
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("uncontrolled ChipGroup manages selection state internally and fires onValueChange", () => {
            const onValueChange = vi.fn();
            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "uncontrolled-group",
                    groupVariant: "elevated",
                    groupSize: "sm",
                    onGroupValueChange: onValueChange,
                    items: [
                        { id: "a", label: "Alpha", value: "a" },
                        { id: "b", label: "Beta", value: "b" },
                    ],
                },
            });
            flushSync();

            expect(getTrigger("a")?.getAttribute("aria-pressed")).toBe("false");
            expect(getTrigger("b")?.getAttribute("aria-pressed")).toBe("false");

            getTrigger("a")?.click();
            flushSync();
            expect(getTrigger("a")?.getAttribute("aria-pressed")).toBe("true");
            expect(getChip("a")?.dataset.pressed).toBe("");
            expect(onValueChange).toHaveBeenLastCalledWith("a");

            getTrigger("b")?.click();
            flushSync();
            expect(getTrigger("a")?.getAttribute("aria-pressed")).toBe("false");
            expect(getTrigger("b")?.getAttribute("aria-pressed")).toBe("true");
            expect(onValueChange).toHaveBeenLastCalledWith("b");

            getTrigger("b")?.click();
            flushSync();
            expect(getTrigger("b")?.getAttribute("aria-pressed")).toBe("false");
            expect(onValueChange).toHaveBeenLastCalledWith(undefined);

            unmount(instance);
        });

        test("wrap defaults to data-wrap='' and omits data-wrap when wrap={false}", () => {
            let groupWrap = $state(true);

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "soft",
                    groupSize: "md",
                    get groupWrap() {
                        return groupWrap;
                    },
                    items: [{ id: "a", label: "A", showTrigger: false }],
                },
            });
            flushSync();

            const group = getGroup();
            expect(group?.dataset.wrap).toBe("");

            groupWrap = false;
            flushSync();
            expect(group?.hasAttribute("data-wrap")).toBe(false);

            unmount(instance);
        });

        test("group disabled propagates aria-disabled and disabled states to all children reactively without losing per-item disabled", () => {
            let groupDisabled = $state(true);
            let value = $state<string | undefined>("open");
            const onValueChange = vi.fn();

            const mixedItems: ChipHostItem[] = [
                { id: "open", label: "Open", value: "open", showRemove: true },
                { id: "per-chip-disabled", label: "Locked Chip", value: "locked", disabled: true, showRemove: true },
                { id: "link-item", label: "#svelte", href: "/tags/svelte" },
            ];

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "group",
                    groupVariant: "soft",
                    groupSize: "md",
                    get groupDisabled() {
                        return groupDisabled;
                    },
                    items: mixedItems,
                    get groupValue() {
                        return value;
                    },
                    set groupValue(next: string | string[] | undefined) {
                        value = next as string | undefined;
                    },
                    onGroupValueChange: onValueChange,
                },
            });
            flushSync();

            const group = getGroup();
            expect(group?.getAttribute("aria-disabled")).toBe("true");
            expect(group?.dataset.disabled).toBe("");

            expect(getChip("open")?.dataset.disabled).toBe("");
            expect((getTrigger("open") as HTMLButtonElement | null)?.disabled).toBe(true);
            expect(getRemove("open")?.disabled).toBe(true);

            const linkTrigger = getTrigger("link-item") as HTMLAnchorElement | null;
            expect(linkTrigger?.hasAttribute("href")).toBe(false);
            expect(linkTrigger?.getAttribute("aria-disabled")).toBe("true");
            expect(linkTrigger?.getAttribute("tabindex")).toBe("-1");

            getTrigger("open")?.click();
            getTrigger("open")?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
            flushSync();
            expect(value).toBe("open");
            expect(onValueChange).not.toHaveBeenCalled();

            // Re-enable group: normal items become enabled, per-chip disabled item remains disabled
            groupDisabled = false;
            flushSync();

            expect(group?.hasAttribute("aria-disabled")).toBe(false);
            expect(group?.hasAttribute("data-disabled")).toBe(false);

            expect(getChip("open")?.hasAttribute("data-disabled")).toBe(false);
            expect((getTrigger("open") as HTMLButtonElement | null)?.disabled).toBe(false);
            expect(getRemove("open")?.disabled).toBe(false);

            expect(linkTrigger?.getAttribute("href")).toBe("/tags/svelte");
            expect(linkTrigger?.hasAttribute("aria-disabled")).toBe(false);
            expect(linkTrigger?.hasAttribute("tabindex")).toBe(false);

            expect(getChip("per-chip-disabled")?.dataset.disabled).toBe("");
            expect((getTrigger("per-chip-disabled") as HTMLButtonElement | null)?.disabled).toBe(true);
            expect(getRemove("per-chip-disabled")?.disabled).toBe(true);

            // Enabled item can now toggle
            getTrigger("open")?.click();
            flushSync();
            expect(value).toBeUndefined();
            expect(onValueChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });
    });

    describe("Dynamic Mount/Unmount Lifecycle", () => {
        test("dynamically toggling ChipRemove and ChipTrigger updates split state, fill location, and pressed cleanup", () => {
            let showTrigger = $state(true);
            let showRemove = $state(false);
            let pressed = $state(true);

            const instance = mount(ChipTestHost, {
                target: container,
                props: {
                    mode: "single",
                    variant: "soft",
                    size: "md",
                    get showTrigger() {
                        return showTrigger;
                    },
                    get showRemove() {
                        return showRemove;
                    },
                    triggerKind: "toggle",
                    get pressed() {
                        return pressed;
                    },
                    set pressed(next: boolean) {
                        pressed = next;
                    },
                    labelText: "Dynamic",
                },
            });
            flushSync();

            const chip = getChip();
            expect(chip?.hasAttribute("data-interactive")).toBe(true);
            expect(chip?.hasAttribute("data-split")).toBe(false);
            expect(chip?.dataset.pressed).toBe("");
            expect(getTrigger()?.querySelector(":scope > .cs-chip-fill")).not.toBeNull();
            expect(chip?.querySelector(":scope > .cs-chip-fill")).toBeNull();

            // Add ChipRemove dynamically -> transitions to split mode
            showRemove = true;
            flushSync();
            expect(chip?.hasAttribute("data-interactive")).toBe(true);
            expect(chip?.hasAttribute("data-split")).toBe(true);
            expect(chip?.dataset.pressed).toBe("");
            expect(chip?.querySelector(":scope > .cs-chip-fill")).not.toBeNull();
            expect(getTrigger()?.querySelector(":scope > .cs-chip-fill")).toBeNull();

            // Remove ChipTrigger dynamically -> cleans up interactive, split, and pressed flags
            showTrigger = false;
            flushSync();
            expect(chip?.hasAttribute("data-interactive")).toBe(false);
            expect(chip?.hasAttribute("data-split")).toBe(false);
            expect(chip?.hasAttribute("data-pressed")).toBe(false);
            expect(chip?.querySelector(".cs-chip-fill")).toBeNull();

            unmount(instance);
        });
    });
});
