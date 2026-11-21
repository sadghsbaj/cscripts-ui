import { flushSync, mount, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import AccordionTestHost, { type TestAccordionItemConfig } from "./AccordionTestHost.internal.svelte";
import { ACCORDION_SIZES, ACCORDION_VARIANTS, type AccordionSize, type AccordionVariant } from "./index.ts";

function getRequiredElement<T extends Element>(parent: ParentNode, selector: string): T {
    const element = parent.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function getAllTriggers(parent: ParentNode): HTMLButtonElement[] {
    return [...parent.querySelectorAll<HTMLButtonElement>(".cs-accordion-trigger")];
}

function getAllItems(parent: ParentNode): HTMLDivElement[] {
    return [...parent.querySelectorAll<HTMLDivElement>(".cs-accordion-item")];
}

function getAllContents(parent: ParentNode): HTMLDivElement[] {
    return [...parent.querySelectorAll<HTMLDivElement>(".cs-accordion-content")];
}

function pressKey(target: HTMLElement, key: string, modifiers: Partial<KeyboardEventInit> = {}): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...modifiers,
    });
    target.dispatchEvent(event);
    return event;
}

describe("Accordion Svelte 5 Component", () => {
    let container: HTMLDivElement;

    const baseItems: TestAccordionItemConfig[] = [
        { value: "one", title: "Section One" },
        { value: "two", title: "Section Two" },
        { value: "three", title: "Section Three" },
    ];

    beforeEach(() => {
        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe("1. Rendering, Variants, Sizes & Forwarding", () => {
        test("sets data-variant and data-size on .cs-accordion for all variants and sizes", () => {
            const state = $state<{ variant: AccordionVariant; size: AccordionSize }>({
                variant: "flush",
                size: "sm",
            });

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    items: baseItems,
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-accordion");

            for (const variant of ACCORDION_VARIANTS) {
                for (const size of ACCORDION_SIZES) {
                    state.variant = variant;
                    state.size = size;
                    flushSync();
                    expect(root.dataset.variant).toBe(variant);
                    expect(root.dataset.size).toBe(size);
                }
            }

            unmount(instance);
        });

        test("forwards ref, class merging, and {...rest} across Accordion, AccordionItem, AccordionHeader, AccordionTrigger, and AccordionContent", () => {
            let rootRef: HTMLDivElement | null = null;
            let itemRef: HTMLDivElement | null = null;
            let headerRef: HTMLHeadingElement | HTMLDivElement | null = null;
            let triggerRef: HTMLButtonElement | null = null;
            let contentRef: HTMLDivElement | null = null;

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    rootClass: ["root-extra", { "root-cond": true }],
                    rootRest: { "data-testid": "acc-root", "aria-label": "FAQ" },
                    onRootRef: (el: HTMLDivElement | null): void => {
                        rootRef = el;
                    },
                    items: [
                        {
                            value: "one",
                            title: "First",
                            itemClass: "item-extra",
                            itemRest: { "data-testid": "acc-item" },
                            headerClass: "header-extra",
                            headerRest: { "data-testid": "acc-header" },
                            triggerClass: "trigger-extra",
                            triggerRest: { "data-testid": "acc-trigger", type: "submit" },
                            contentClass: "content-extra",
                            contentRest: { "data-testid": "acc-content" },
                            onItemRef: (el: HTMLDivElement | null): void => {
                                itemRef = el;
                            },
                            onHeaderRef: (el: HTMLHeadingElement | HTMLDivElement | null): void => {
                                headerRef = el;
                            },
                            onTriggerRef: (el: HTMLButtonElement | null): void => {
                                triggerRef = el;
                            },
                            onContentRef: (el: HTMLDivElement | null): void => {
                                contentRef = el;
                            },
                        },
                    ],
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-accordion");
            const item = getRequiredElement<HTMLDivElement>(container, ".cs-accordion-item");
            const header = getRequiredElement<HTMLElement>(container, ".cs-accordion-header");
            const trigger = getRequiredElement<HTMLButtonElement>(container, ".cs-accordion-trigger");
            const content = getRequiredElement<HTMLDivElement>(container, ".cs-accordion-content");

            expect(rootRef).toBe(root);
            expect(itemRef).toBe(item);
            expect(headerRef).toBe(header);
            expect(triggerRef).toBe(trigger);
            expect(contentRef).toBe(content);

            expect(root.classList.contains("cs-accordion")).toBe(true);
            expect(root.classList.contains("root-extra")).toBe(true);
            expect(root.classList.contains("root-cond")).toBe(true);
            expect(root.dataset.testid).toBe("acc-root");
            expect(root.getAttribute("aria-label")).toBe("FAQ");

            expect(item.classList.contains("cs-accordion-item")).toBe(true);
            expect(item.classList.contains("item-extra")).toBe(true);
            expect(item.dataset.testid).toBe("acc-item");

            expect(header.classList.contains("cs-accordion-header")).toBe(true);
            expect(header.classList.contains("header-extra")).toBe(true);
            expect(header.dataset.testid).toBe("acc-header");

            expect(trigger.classList.contains("cs-accordion-trigger")).toBe(true);
            expect(trigger.classList.contains("trigger-extra")).toBe(true);
            expect(trigger.dataset.testid).toBe("acc-trigger");
            // type="button" is enforced even if a different type is passed via {...rest}
            expect(trigger.type).toBe("button");

            expect(content.classList.contains("cs-accordion-content")).toBe(true);
            expect(content.classList.contains("content-extra")).toBe(true);
            expect(content.dataset.testid).toBe("acc-content");

            unmount(instance);
        });

        test("AccordionHeader defaults to h3, supports as='h2' / as='div', and AccordionTrigger works without AccordionHeader", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    items: [
                        { value: "default-h", title: "Default H3" },
                        { value: "h2-item", title: "Heading H2", headerAs: "h2" },
                        { value: "div-item", title: "Div Header", headerAs: "div" },
                        { value: "headerless", title: "No Header", headerAs: false },
                    ],
                },
            });
            flushSync();

            const items = getAllItems(container);
            expect(items).toHaveLength(4);

            expect(items[0]?.querySelector(".cs-accordion-header")?.tagName).toBe("H3");
            expect(items[1]?.querySelector(".cs-accordion-header")?.tagName).toBe("H2");
            expect(items[2]?.querySelector(".cs-accordion-header")?.tagName).toBe("DIV");
            expect(items[3]?.querySelector(".cs-accordion-header")).toBeNull();
            expect(items[3]?.querySelector(".cs-accordion-trigger")?.textContent?.trim()).toBe("No Header");

            // Clicking headerless trigger still toggles
            const headerlessTrigger = items[3]?.querySelector<HTMLButtonElement>(".cs-accordion-trigger");
            headerlessTrigger?.click();
            flushSync();
            expect(headerlessTrigger?.getAttribute("aria-expanded")).toBe("true");
            expect("open" in (items[3]?.dataset ?? {})).toBe(true);

            unmount(instance);
        });

        test("AccordionTrigger enforces type='button', renders leading, subtitle, and indicator (default, false, custom snippet)", () => {
            const state = $state<{ value: string | undefined }>({ value: "custom-ind" });

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "separated",
                    size: "lg",
                    get value() {
                        return state.value;
                    },
                    set value(next: string | undefined) {
                        state.value = next;
                    },
                    items: [
                        {
                            value: "default-ind",
                            title: "Default",
                            subtitle: "Helpful subtitle",
                            hasLeading: true,
                        },
                        {
                            value: "no-ind",
                            title: "No Indicator",
                            indicatorMode: "none",
                        },
                        {
                            value: "custom-ind",
                            title: "Custom Indicator",
                            indicatorMode: "custom",
                        },
                    ],
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            const t0 = triggers[0];
            const t1 = triggers[1];
            const t2 = triggers[2];

            expect(t0?.getAttribute("type")).toBe("button");
            expect(t0?.querySelector(":scope .cs-accordion-trigger-leading .test-leading")?.textContent).toBe("L");
            expect(t0?.querySelector(".cs-accordion-trigger-leading")?.getAttribute("aria-hidden")).toBe("true");
            expect(t0?.querySelector(".cs-accordion-trigger-subtitle")?.textContent).toBe("Helpful subtitle");
            expect(t0?.querySelector(":scope .cs-accordion-indicator svg")).not.toBeNull();

            expect(t1?.querySelector(".cs-accordion-indicator")).toBeNull();

            expect(t2?.querySelector(":scope .cs-accordion-indicator .test-custom-indicator")?.textContent).toBe("−");
            // Switch open item away from custom-ind so custom indicator receives open: false
            t0?.click();
            flushSync();
            expect(t2?.querySelector(":scope .cs-accordion-indicator .test-custom-indicator")?.textContent).toBe("+");

            unmount(instance);
        });
    });

    describe("2. Single & Multiple Selection", () => {
        test("single mode (collapsible=false): clicking closed opens it and closes previous; clicking open is a no-op", () => {
            let value = $state<string | undefined>("one");
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    multiple: false,
                    collapsible: false,
                    get value() {
                        return value;
                    },
                    set value(next: string | undefined) {
                        value = next;
                    },
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            const items = getAllItems(container);

            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("false");
            expect("open" in (items[0]?.dataset ?? {})).toBe(true);
            expect("open" in (items[1]?.dataset ?? {})).toBe(false);

            // Click already-open item -> stays open, no callback
            triggers[0]?.click();
            flushSync();
            expect(value).toBe("one");
            expect(onValueChange).not.toHaveBeenCalled();

            // Click closed item -> opens it, closes previous
            triggers[1]?.click();
            flushSync();
            expect(value).toBe("two");
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");
            expect("open" in (items[0]?.dataset ?? {})).toBe(false);
            expect("open" in (items[1]?.dataset ?? {})).toBe(true);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("two");

            // Click third, then back to first (cross-sequence A -> B -> C -> A)
            triggers[2]?.click();
            flushSync();
            expect(value).toBe("three");
            triggers[0]?.click();
            flushSync();
            expect(value).toBe("one");
            expect(onValueChange).toHaveBeenCalledTimes(3);

            unmount(instance);
        });

        test("single mode with collapsible=true: clicking open item closes it to undefined and fires onValueChange", () => {
            let value = $state<string | undefined>("one");
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    multiple: false,
                    collapsible: true,
                    get value() {
                        return value;
                    },
                    set value(next: string | undefined) {
                        value = next;
                    },
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);

            // Collapse open item
            triggers[0]?.click();
            flushSync();
            expect(value).toBeUndefined();
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith(undefined);

            // Re-open same item
            triggers[0]?.click();
            flushSync();
            expect(value).toBe("one");
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("one");

            unmount(instance);
        });

        test("multiple mode: multiple items open simultaneously; toggling adds/removes from array and fires onValueChange", () => {
            let value = $state<string[] | undefined>(["one"]);
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    multiple: true,
                    get value() {
                        return value;
                    },
                    set value(next: string[] | undefined) {
                        value = next;
                    },
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("false");
            expect(triggers[2]?.getAttribute("aria-expanded")).toBe("false");

            // Open second item while keeping first open
            triggers[1]?.click();
            flushSync();
            expect(value).toEqual(["one", "two"]);
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");
            expect(onValueChange).toHaveBeenLastCalledWith(["one", "two"]);

            // Open third item
            triggers[2]?.click();
            flushSync();
            expect(value).toEqual(["one", "two", "three"]);

            // Close first item while others remain open
            triggers[0]?.click();
            flushSync();
            expect(value).toEqual(["two", "three"]);
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");
            expect(triggers[2]?.getAttribute("aria-expanded")).toBe("true");

            // Close remaining items
            triggers[1]?.click();
            flushSync();
            triggers[2]?.click();
            flushSync();
            expect(value).toEqual([]);
            expect(onValueChange).toHaveBeenCalledTimes(5);

            unmount(instance);
        });

        test("external controlled value updates propagate cleanly and strict controlled getter rejects unapproved writes", () => {
            const external = $state<{ value: string | undefined }>({ value: "one" });
            const onValueChange = vi.fn();

            // Strict controlled: setter is a no-op until parent updates external.value
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    collapsible: true,
                    get value() {
                        return external.value;
                    },
                    set value(_next: string | undefined) {
                        // Intentionally ignore internal write to verify strict controlled behavior
                    },
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("false");

            // Clicking two requests change via onValueChange, but DOM stays on "one" until parent commits
            triggers[1]?.click();
            flushSync();
            expect(onValueChange).toHaveBeenCalledWith("two");
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("false");

            // Parent commits update
            external.value = "two";
            flushSync();
            expect(triggers[0]?.getAttribute("aria-expanded")).toBe("false");
            expect(triggers[1]?.getAttribute("aria-expanded")).toBe("true");

            unmount(instance);
        });

        test("uncontrolled mode (value omitted) with multiple=false toggles items and fires onValueChange", () => {
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    multiple: false,
                    collapsible: false,
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["false", "false", "false"]);

            triggers[0]?.click();
            flushSync();
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["true", "false", "false"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);
            expect(onValueChange).toHaveBeenLastCalledWith("one");

            // Clicking open item with collapsible=false is a no-op
            triggers[0]?.click();
            flushSync();
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["true", "false", "false"]);
            expect(onValueChange).toHaveBeenCalledTimes(1);

            triggers[1]?.click();
            flushSync();
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["false", "true", "false"]);
            expect(onValueChange).toHaveBeenCalledTimes(2);
            expect(onValueChange).toHaveBeenLastCalledWith("two");

            unmount(instance);

            // Also verify collapsible=true with value omitted
            const onCollapsibleChange = vi.fn();
            const collapsibleInstance = mount(AccordionTestHost, {
                target: container,
                props: {
                    multiple: false,
                    collapsible: true,
                    onValueChange: onCollapsibleChange,
                    items: baseItems,
                },
            });
            flushSync();

            const collapsibleTriggers = getAllTriggers(container);
            collapsibleTriggers[0]?.click();
            flushSync();
            expect(collapsibleTriggers[0]?.getAttribute("aria-expanded")).toBe("true");
            expect(onCollapsibleChange).toHaveBeenLastCalledWith("one");

            collapsibleTriggers[0]?.click();
            flushSync();
            expect(collapsibleTriggers[0]?.getAttribute("aria-expanded")).toBe("false");
            expect(onCollapsibleChange).toHaveBeenLastCalledWith(undefined);

            unmount(collapsibleInstance);
        });

        test("uncontrolled mode (value omitted) with multiple=true toggles items and fires onValueChange", () => {
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    multiple: true,
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["false", "false", "false"]);

            triggers[0]?.click();
            flushSync();
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["true", "false", "false"]);
            expect(onValueChange).toHaveBeenLastCalledWith(["one"]);

            triggers[2]?.click();
            flushSync();
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["true", "false", "true"]);
            expect(onValueChange).toHaveBeenLastCalledWith(["one", "three"]);

            triggers[0]?.click();
            flushSync();
            expect(triggers.map((t) => t.getAttribute("aria-expanded"))).toEqual(["false", "false", "true"]);
            expect(onValueChange).toHaveBeenLastCalledWith(["three"]);

            unmount(instance);
        });

        test("clicking a nested accordion trigger does not toggle or mutate the outer accordion value", () => {
            let outerValue = $state<string | undefined>("outer-1");
            const onOuterValueChange = vi.fn((next: unknown) => {
                outerValue = next as string | undefined;
            });

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    multiple: false,
                    collapsible: true,
                    get value() {
                        return outerValue;
                    },
                    onValueChange: onOuterValueChange,
                    items: [
                        {
                            value: "outer-1",
                            title: "Outer One",
                            triggerRest: { "data-testid": "outer-trigger-1" },
                            nestedItems: [
                                { value: "inner-1", title: "Inner One" },
                                { value: "inner-2", title: "Inner Two" },
                            ],
                        },
                        {
                            value: "outer-2",
                            title: "Outer Two",
                            triggerRest: { "data-testid": "outer-trigger-2" },
                        },
                    ],
                },
            });
            flushSync();

            const outerTrigger1 = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="outer-trigger-1"]',
            );
            const innerTrigger1 = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="nested-trigger-inner-1"]',
            );
            const innerTrigger2 = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="nested-trigger-inner-2"]',
            );

            expect(outerTrigger1.getAttribute("aria-expanded")).toBe("true");
            expect(innerTrigger1.getAttribute("aria-expanded")).toBe("false");

            innerTrigger1.click();
            flushSync();

            expect(innerTrigger1.getAttribute("aria-expanded")).toBe("true");
            expect(outerTrigger1.getAttribute("aria-expanded")).toBe("true");
            expect(outerValue).toBe("outer-1");
            expect(onOuterValueChange).not.toHaveBeenCalled();

            innerTrigger2.click();
            flushSync();

            expect(innerTrigger1.getAttribute("aria-expanded")).toBe("false");
            expect(innerTrigger2.getAttribute("aria-expanded")).toBe("true");
            expect(outerTrigger1.getAttribute("aria-expanded")).toBe("true");
            expect(outerValue).toBe("outer-1");
            expect(onOuterValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });
    });

    describe("3. Disabled States", () => {
        test("item disabled=true sets disabled & data-disabled and prevents toggling", () => {
            let value = $state<string | undefined>("one");
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    get value() {
                        return value;
                    },
                    set value(next: string | undefined) {
                        value = next;
                    },
                    onValueChange,
                    items: [
                        { value: "one", title: "One" },
                        { value: "two", title: "Two", disabled: true },
                    ],
                },
            });
            flushSync();

            const items = getAllItems(container);
            const triggers = getAllTriggers(container);

            expect("disabled" in (items[0]?.dataset ?? {})).toBe(false);
            expect(triggers[0]?.disabled).toBe(false);

            expect("disabled" in (items[1]?.dataset ?? {})).toBe(true);
            expect("disabled" in (triggers[1]?.dataset ?? {})).toBe(true);
            expect(triggers[1]?.disabled).toBe(true);

            triggers[1]?.click();
            flushSync();
            expect(value).toBe("one");
            expect(onValueChange).not.toHaveBeenCalled();

            unmount(instance);
        });

        test("root disabled=true disables all items and prevents toggling", () => {
            const state = $state<{ disabled: boolean; value: string | undefined }>({
                disabled: true,
                value: "one",
            });
            const onValueChange = vi.fn();

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "elevated",
                    size: "md",
                    collapsible: true,
                    get disabled() {
                        return state.disabled;
                    },
                    get value() {
                        return state.value;
                    },
                    set value(next: string | undefined) {
                        state.value = next;
                    },
                    onValueChange,
                    items: baseItems,
                },
            });
            flushSync();

            const root = getRequiredElement<HTMLDivElement>(container, ".cs-accordion");
            const items = getAllItems(container);
            const triggers = getAllTriggers(container);

            expect("disabled" in root.dataset).toBe(true);
            for (const item of items) {
                expect("disabled" in item.dataset).toBe(true);
            }
            for (const trigger of triggers) {
                expect(trigger.disabled).toBe(true);
                expect("disabled" in trigger.dataset).toBe(true);
            }

            triggers[0]?.click();
            triggers[1]?.click();
            flushSync();
            expect(state.value).toBe("one");
            expect(onValueChange).not.toHaveBeenCalled();

            // Re-enabling root restores interactivity
            state.disabled = false;
            flushSync();
            expect("disabled" in root.dataset).toBe(false);
            triggers[1]?.click();
            flushSync();
            expect(state.value).toBe("two");
            expect(onValueChange).toHaveBeenCalledWith("two");

            unmount(instance);
        });
    });

    describe("4. WAI-ARIA & Keyboard Navigation", () => {
        test("wires aria-expanded, aria-controls, role='region', and aria-labelledby (omitted when region=false)", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    value: "one",
                    items: [
                        { value: "one", title: "Region On", region: true },
                        { value: "two", title: "Region Off", region: false },
                    ],
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            const contents = getAllContents(container);

            const t0 = triggers[0];
            const c0 = contents[0];
            expect(t0?.id).toBeTruthy();
            expect(c0?.id).toBeTruthy();
            expect(t0?.getAttribute("aria-expanded")).toBe("true");
            expect(t0?.getAttribute("aria-controls")).toBe(c0?.id);
            expect(c0?.getAttribute("role")).toBe("region");
            expect(c0?.getAttribute("aria-labelledby")).toBe(t0?.id);

            const t1 = triggers[1];
            const c1 = contents[1];
            expect(t1?.getAttribute("aria-expanded")).toBe("false");
            expect(t1?.getAttribute("aria-controls")).toBe(c1?.id);
            expect(c1?.getAttribute("role")).toBeNull();
            expect(c1?.getAttribute("aria-labelledby")).toBeNull();

            unmount(instance);
        });

        test("ArrowDown, ArrowUp, Home, End navigate non-disabled triggers, wrap with loop=true, and skip disabled items", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    loop: true,
                    items: [
                        { value: "one", title: "One" },
                        { value: "two", title: "Two", disabled: true },
                        { value: "three", title: "Three" },
                        { value: "four", title: "Four" },
                    ],
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            const t0 = triggers[0];
            const t2 = triggers[2];
            const t3 = triggers[3];

            t0?.focus();
            expect(document.activeElement).toBe(t0);

            // ArrowDown skips disabled t1 -> lands on t2
            if (t0) pressKey(t0, "ArrowDown");
            expect(document.activeElement).toBe(t2);

            // ArrowDown -> t3
            if (t2) pressKey(t2, "ArrowDown");
            expect(document.activeElement).toBe(t3);

            // ArrowDown at end wraps -> t0
            if (t3) pressKey(t3, "ArrowDown");
            expect(document.activeElement).toBe(t0);

            // ArrowUp at start wraps -> t3
            if (t0) pressKey(t0, "ArrowUp");
            expect(document.activeElement).toBe(t3);

            // ArrowUp -> t2, then ArrowUp skips disabled t1 -> t0
            if (t3) pressKey(t3, "ArrowUp");
            expect(document.activeElement).toBe(t2);
            if (t2) pressKey(t2, "ArrowUp");
            expect(document.activeElement).toBe(t0);

            // End -> last enabled (t3), Home -> first enabled (t0)
            if (t0) pressKey(t0, "End");
            expect(document.activeElement).toBe(t3);
            if (t3) pressKey(t3, "Home");
            expect(document.activeElement).toBe(t0);

            // Modifier keys do not navigate
            if (t0) pressKey(t0, "ArrowDown", { ctrlKey: true });
            expect(document.activeElement).toBe(t0);

            // Natural Tab is not intercepted (defaultPrevented stays false)
            if (t0) {
                const tabEvent = pressKey(t0, "Tab");
                expect(tabEvent.defaultPrevented).toBe(false);
            }

            unmount(instance);
        });

        test("loop=false clamps ArrowDown and ArrowUp at boundaries", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    loop: false,
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            const t0 = triggers[0];
            const t2 = triggers[2];

            t0?.focus();
            if (t0) pressKey(t0, "ArrowUp");
            expect(document.activeElement).toBe(t0);

            t2?.focus();
            if (t2) pressKey(t2, "ArrowDown");
            expect(document.activeElement).toBe(t2);

            unmount(instance);
        });

        test("nested accordions: ArrowDown inside inner accordion does not move focus in outer accordion", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    value: "outer-1",
                    items: [
                        {
                            value: "outer-1",
                            title: "Outer 1",
                            nestedItems: [
                                { value: "inner-1", title: "Inner 1" },
                                { value: "inner-2", title: "Inner 2" },
                            ],
                        },
                        {
                            value: "outer-2",
                            title: "Outer 2",
                        },
                    ],
                },
            });
            flushSync();

            const innerTrigger1 = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="nested-trigger-inner-1"]',
            );
            const innerTrigger2 = getRequiredElement<HTMLButtonElement>(
                container,
                '[data-testid="nested-trigger-inner-2"]',
            );

            innerTrigger1.focus();
            expect(document.activeElement).toBe(innerTrigger1);

            const keyEvent = pressKey(innerTrigger1, "ArrowDown");
            expect(keyEvent.defaultPrevented).toBe(true);
            // Focus moves to innerTrigger2, NOT outer-2
            expect(document.activeElement).toBe(innerTrigger2);

            unmount(instance);
        });

        test("dynamic item add, remove, and reorder updates ArrowDown/ArrowUp/Home/End order and unregisters unmounted triggers", () => {
            const state = $state<{ items: TestAccordionItemConfig[] }>({
                items: [
                    { value: "one", title: "One" },
                    { value: "two", title: "Two" },
                    { value: "three", title: "Three" },
                ],
            });

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    loop: true,
                    get items() {
                        return state.items;
                    },
                },
            });
            flushSync();

            // Reorder existing items in DOM: three, one, two
            state.items = [
                { value: "three", title: "Three" },
                { value: "one", title: "One" },
                { value: "two", title: "Two" },
            ];
            flushSync();

            let triggers = getAllTriggers(container);
            expect(triggers.map((t) => t.textContent?.trim())).toEqual(["Three", "One", "Two"]);
            let [t0, t1, t2] = triggers;
            if (!t0 || !t1 || !t2) throw new Error("Expected 3 triggers");

            t0.focus();
            pressKey(t0, "ArrowDown");
            expect(document.activeElement).toBe(t1); // One

            pressKey(t1, "ArrowDown");
            expect(document.activeElement).toBe(t2); // Two

            pressKey(t2, "ArrowUp");
            expect(document.activeElement).toBe(t1); // One

            pressKey(t1, "Home");
            expect(document.activeElement).toBe(t0); // Three

            pressKey(t0, "End");
            expect(document.activeElement).toBe(t2); // Two

            // Add a fourth item at the end
            state.items = [...state.items, { value: "four", title: "Four" }];
            flushSync();

            triggers = getAllTriggers(container);
            expect(triggers.map((t) => t.textContent?.trim())).toEqual(["Three", "One", "Two", "Four"]);
            const [, addedT1, addedT2, addedT3] = triggers;
            if (!addedT1 || !addedT2 || !addedT3) throw new Error("Expected 4 triggers");

            addedT2.focus();
            pressKey(addedT2, "ArrowDown");
            expect(document.activeElement).toBe(addedT3); // Four

            // Remove "one" (unmounts its trigger)
            const removedTrigger = addedT1;
            state.items = state.items.filter((item) => item.value !== "one");
            flushSync();
            expect(removedTrigger.isConnected).toBe(false);

            triggers = getAllTriggers(container);
            expect(triggers.map((t) => t.textContent?.trim())).toEqual(["Three", "Two", "Four"]);
            [t0, t1] = triggers;
            if (!t0 || !t1) throw new Error("Expected remaining triggers");

            t0.focus();
            pressKey(t0, "ArrowDown");
            expect(document.activeElement).toBe(t1); // Two (skips unmounted One)

            pressKey(t1, "ArrowUp");
            expect(document.activeElement).toBe(t0); // Three

            unmount(instance);
        });

        test("consumer onclick/onkeydown calling event.preventDefault() prevents toggling and keyboard focus movement", () => {
            const onValueChange = vi.fn();
            const consumerClick = vi.fn((event: MouseEvent) => {
                event.preventDefault();
            });
            const consumerKeyDown = vi.fn((event: KeyboardEvent) => {
                event.preventDefault();
            });

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    onValueChange,
                    items: [
                        {
                            value: "one",
                            title: "One",
                            triggerRest: {
                                onclick: consumerClick,
                                onkeydown: consumerKeyDown,
                            },
                        },
                        { value: "two", title: "Two" },
                    ],
                },
            });
            flushSync();

            const [firstTrigger] = getAllTriggers(container);
            if (!firstTrigger) throw new Error("Expected first trigger");
            firstTrigger.click();
            flushSync();

            expect(consumerClick).toHaveBeenCalledTimes(1);
            expect(firstTrigger.getAttribute("aria-expanded")).toBe("false");
            expect(onValueChange).not.toHaveBeenCalled();

            firstTrigger.focus();
            expect(document.activeElement).toBe(firstTrigger);

            const keyEvent = pressKey(firstTrigger, "ArrowDown");
            expect(consumerKeyDown).toHaveBeenCalledTimes(1);
            expect(keyEvent.defaultPrevented).toBe(true);
            expect(document.activeElement).toBe(firstTrigger);

            unmount(instance);
        });
    });

    describe("5. Content & <Collapsible> Integration", () => {
        test("padded=false sets data-flush on .cs-accordion-content-body", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    value: "one",
                    items: [
                        { value: "one", title: "Padded", padded: true },
                        { value: "two", title: "Flush", padded: false },
                    ],
                },
            });
            flushSync();

            const bodies = [...container.querySelectorAll<HTMLDivElement>(".cs-accordion-content-body")];
            expect(bodies).toHaveLength(2);
            expect("flush" in (bodies[0]?.dataset ?? {})).toBe(false);
            expect("flush" in (bodies[1]?.dataset ?? {})).toBe(true);

            unmount(instance);
        });

        test("keepMounted=false lazily mounts content on open", () => {
            let value = $state<string | undefined>(undefined);

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    keepMounted: false,
                    get value() {
                        return value;
                    },
                    set value(next: string | undefined) {
                        value = next;
                    },
                    items: [
                        { value: "lazy", title: "Lazy Item", contentText: "Lazy body" },
                    ],
                },
            });
            flushSync();

            expect(container.querySelector(".test-content-text")).toBeNull();

            const trigger = getRequiredElement<HTMLButtonElement>(container, ".cs-accordion-trigger");
            trigger.click();
            flushSync();

            expect(value).toBe("lazy");
            expect(container.querySelector(".test-content-text")?.textContent).toBe("Lazy body");

            unmount(instance);
        });

        test("initial open item sets data-instant on mount and clears it after requestAnimationFrame", () => {
            const rafCallbacks: FrameRequestCallback[] = [];
            vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb: FrameRequestCallback): number => {
                rafCallbacks.push(cb);
                return rafCallbacks.length;
            });
            vi.spyOn(window, "cancelAnimationFrame").mockImplementation((): void => {});

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    variant: "flush",
                    size: "md",
                    value: "one",
                    items: [
                        { value: "one", title: "Initially Open" },
                        { value: "two", title: "Initially Closed" },
                    ],
                },
            });
            flushSync();

            const items = getAllItems(container);
            const triggers = getAllTriggers(container);

            // Initially open item & trigger have data-instant; closed item does not
            expect("instant" in (items[0]?.dataset ?? {})).toBe(true);
            expect("instant" in (triggers[0]?.dataset ?? {})).toBe(true);
            expect("instant" in (items[1]?.dataset ?? {})).toBe(false);
            expect("instant" in (triggers[1]?.dataset ?? {})).toBe(false);

            // Flush rAF callback
            expect(rafCallbacks.length).toBeGreaterThanOrEqual(1);
            for (const cb of rafCallbacks) {
                cb(16);
            }
            flushSync();

            expect("instant" in (items[0]?.dataset ?? {})).toBe(false);
            expect("instant" in (triggers[0]?.dataset ?? {})).toBe(false);

            unmount(instance);
        });

        test('root animate=false and motion="none" set data-instant on triggers and data-motion="none" on <Collapsible>', () => {
            const state = $state<{ animate: boolean; motion: "slide" | "fade" | "swell" | "none" }>({
                animate: false,
                motion: "slide",
            });

            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    get animate() {
                        return state.animate;
                    },
                    get motion() {
                        return state.motion;
                    },
                    items: baseItems,
                },
            });
            flushSync();

            const triggers = getAllTriggers(container);
            const contents = getAllContents(container);

            // animate=false -> data-instant on triggers & <Collapsible>, data-motion="none" on <Collapsible>
            expect("instant" in (triggers[0]?.dataset ?? {})).toBe(true);
            expect("instant" in (contents[0]?.dataset ?? {})).toBe(true);
            expect(contents[0]?.dataset.motion).toBe("none");

            // animate=true, motion="none" -> still data-instant on triggers & data-motion="none" on <Collapsible>
            state.animate = true;
            state.motion = "none";
            flushSync();

            expect("instant" in (triggers[0]?.dataset ?? {})).toBe(true);
            expect(contents[0]?.dataset.motion).toBe("none");

            // animate=true, motion="fade" -> clears data-instant on trigger and sets data-motion="fade"
            state.motion = "fade";
            flushSync();

            expect("instant" in (triggers[0]?.dataset ?? {})).toBe(false);
            expect("instant" in (contents[0]?.dataset ?? {})).toBe(false);
            expect(contents[0]?.dataset.motion).toBe("fade");

            unmount(instance);
        });

        test("AccordionContent per-panel keepMounted, motion, and animate override root defaults", () => {
            const instance = mount(AccordionTestHost, {
                target: container,
                props: {
                    keepMounted: false,
                    motion: "slide",
                    animate: true,
                    items: [
                        { value: "default-panel", title: "Default Panel" },
                        {
                            value: "keep-fade-panel",
                            title: "Keep + Fade Panel",
                            keepMounted: true,
                            motion: "fade",
                        },
                        {
                            value: "no-animate-panel",
                            title: "No Animate Panel",
                            animate: false,
                        },
                    ],
                },
            });
            flushSync();

            const contents = getAllContents(container);

            // Panel 0 inherits root defaults
            expect(contents[0]?.querySelector(".test-content-text")).toBeNull();
            expect(contents[0]?.dataset.motion).toBe("slide");
            expect("instant" in (contents[0]?.dataset ?? {})).toBe(false);

            // Panel 1 overrides keepMounted=true and motion="fade"
            expect(contents[1]?.querySelector(".test-content-text")?.textContent).toBe(
                "Content keep-fade-panel",
            );
            expect(contents[1]?.dataset.motion).toBe("fade");
            expect("instant" in (contents[1]?.dataset ?? {})).toBe(false);

            // Panel 2 overrides animate=false (sets data-instant and data-motion="none")
            expect(contents[2]?.dataset.motion).toBe("none");
            expect("instant" in (contents[2]?.dataset ?? {})).toBe(true);

            unmount(instance);

            // Also verify panel animate=true + motion="swell" overrides root animate=false
            const reverseInstance = mount(AccordionTestHost, {
                target: container,
                props: {
                    animate: false,
                    motion: "none",
                    items: [
                        { value: "inherited", title: "Inherited" },
                        { value: "override", title: "Override", animate: true, motion: "swell" },
                    ],
                },
            });
            flushSync();

            const reverseContents = getAllContents(container);
            expect(reverseContents[0]?.dataset.motion).toBe("none");
            expect("instant" in (reverseContents[0]?.dataset ?? {})).toBe(true);
            expect(reverseContents[1]?.dataset.motion).toBe("swell");
            expect("instant" in (reverseContents[1]?.dataset ?? {})).toBe(false);

            unmount(reverseInstance);
        });
    });
});
