import { flushSync, mount, unmount } from "svelte";
import { Globe, Moon, Search, Star } from "@lucide/svelte";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import ComboboxTestHost, { type TestComboboxGroup, type TestComboboxItem } from "./ComboboxTestHost.internal.svelte";
import { COMBOBOX_SIZES, COMBOBOX_VARIANTS, type ComboboxSize, type ComboboxVariant } from "./index.ts";

const DEFAULT_ITEMS: TestComboboxItem[] = [
    { value: "de", plainText: "Germany", keywords: ["deutschland", "berlin"] },
    { value: "fr", plainText: "France", keywords: ["paris"] },
    { value: "es", plainText: "Spain", keywords: ["madrid"] },
];

function dispatchToggleEvent(element: HTMLElement, newState: "open" | "closed", oldState: "open" | "closed"): void {
    const event = new Event("toggle");
    Object.assign(event, { newState, oldState });
    element.dispatchEvent(event);
}

function restorePrototypeProperty(target: object, key: string, descriptor: PropertyDescriptor | undefined): void {
    if (descriptor) {
        Object.defineProperty(target, key, descriptor);
    } else {
        Reflect.deleteProperty(target, key);
    }
}

/* eslint-disable unicorn/no-this-outside-of-class -- HTMLElement.prototype polyfill methods require dynamic `this` binding */
function installPopoverPolyfill(
    openPopovers: WeakSet<HTMLElement>,
    baseMatches: typeof HTMLElement.prototype.matches
): void {
    Object.defineProperties(HTMLElement.prototype, {
        matches: {
            configurable: true,
            writable: true,
            value(this: HTMLElement, selector: string): boolean {
                if (selector === ":popover-open") {
                    return openPopovers.has(this);
                }
                return baseMatches.call(this, selector);
            },
        },
        showPopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement): void {
                if (openPopovers.has(this)) return;
                openPopovers.add(this);
                dispatchToggleEvent(this, "open", "closed");
            },
        },
        hidePopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement): void {
                if (!openPopovers.has(this)) return;
                openPopovers.delete(this);
                dispatchToggleEvent(this, "closed", "open");
            },
        },
        togglePopover: {
            configurable: true,
            writable: true,
            value(this: HTMLElement, options?: boolean | { source?: HTMLElement; force?: boolean }): boolean {
                const force = typeof options === "boolean" ? options : options?.force;
                const next = typeof force === "boolean" ? force : !openPopovers.has(this);
                if (next) {
                    (this as HTMLElement & { showPopover: () => void }).showPopover();
                } else {
                    (this as HTMLElement & { hidePopover: () => void }).hidePopover();
                }
                return next;
            },
        },
    });
}
/* eslint-enable unicorn/no-this-outside-of-class */

function dispatchKeyDown(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchPointerEvent(
    target: EventTarget,
    type: "pointerdown" | "pointerup" | "pointermove" | "pointercancel",
    init: PointerEventInit = {}
): PointerEvent {
    const event = new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerType: "mouse",
        button: 0,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchMouseDown(target: EventTarget, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent("mousedown", {
        bubbles: true,
        cancelable: true,
        button: 0,
        ...init,
    });
    target.dispatchEvent(event);
    return event;
}

function dispatchClick(target: EventTarget): MouseEvent {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
}

function typeIntoInput(input: HTMLInputElement, nextValue: string): void {
    input.value = nextValue;
    input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    flushSync();
}

function requireElement<T extends Element>(root: ParentNode, selector: string): T {
    const element = root.querySelector<T>(selector);
    if (!element) {
        throw new Error(`Expected element matching "${selector}"`);
    }
    return element;
}

function requireControl(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-combobox-control");
}

function requireInput(root: ParentNode): HTMLInputElement {
    return requireElement<HTMLInputElement>(root, "input.cs-combobox-input");
}

function requireTrigger(root: ParentNode): HTMLButtonElement {
    return requireElement<HTMLButtonElement>(root, "button.cs-combobox-trigger");
}

function requireClear(root: ParentNode): HTMLButtonElement {
    return requireElement<HTMLButtonElement>(root, "button.cs-combobox-clear");
}

function requireContent(root: ParentNode): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, "div.cs-combobox-content");
}

function requireItem(root: ParentNode, value: string): HTMLDivElement {
    return requireElement<HTMLDivElement>(root, `div.cs-combobox-item[data-value="${CSS.escape(value)}"]`);
}

function getHiddenInput(root: ParentNode): HTMLInputElement | null {
    return root.querySelector<HTMLInputElement>('input[type="hidden"]');
}

describe("Combobox Svelte 5 Component", () => {
    let container: HTMLDivElement;
    let openPopovers: WeakSet<HTMLElement>;
    let originalMatchesDescriptor: PropertyDescriptor | undefined;
    let originalShowPopoverDescriptor: PropertyDescriptor | undefined;
    let originalHidePopoverDescriptor: PropertyDescriptor | undefined;
    let originalTogglePopoverDescriptor: PropertyDescriptor | undefined;
    let originalScrollIntoViewDescriptor: PropertyDescriptor | undefined;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

        openPopovers = new WeakSet<HTMLElement>();
        originalMatchesDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "matches");
        originalShowPopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "showPopover");
        originalHidePopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "hidePopover");
        originalTogglePopoverDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "togglePopover");
        originalScrollIntoViewDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

        const baseMatches = HTMLElement.prototype.matches;
        installPopoverPolyfill(openPopovers, baseMatches);

        if (typeof HTMLElement.prototype.scrollIntoView !== "function") {
            Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
                configurable: true,
                writable: true,
                value(): void {},
            });
        }

        container = document.createElement("div");
        document.body.append(container);
    });

    afterEach(() => {
        container.remove();
        restorePrototypeProperty(HTMLElement.prototype, "matches", originalMatchesDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "showPopover", originalShowPopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "hidePopover", originalHidePopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "togglePopover", originalTogglePopoverDescriptor);
        restorePrototypeProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoViewDescriptor);
        vi.clearAllTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe("Public exports & canonical option lists", () => {
        test("exports canonical variants and sizes", () => {
            expect(COMBOBOX_VARIANTS).toEqual(["soft", "elevated"]);
            expect(COMBOBOX_SIZES).toEqual(["xs", "sm", "md", "lg", "xl"]);
        });
    });

    describe("ARIA 1.2, DOM & Form Contracts", () => {
        test("enforces ARIA 1.2 combobox contract across input, trigger, content, and items, and reacts to variant/size/state", () => {
            const state = $state<{
                variant: ComboboxVariant;
                size: ComboboxSize;
                filter: boolean;
                disabled: boolean;
                readonly: boolean;
                invalid: boolean;
                required: boolean;
                open: boolean;
            }>({
                variant: "soft",
                size: "md",
                filter: true,
                disabled: false,
                readonly: false,
                invalid: false,
                required: false,
                open: false,
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get variant() {
                        return state.variant;
                    },
                    get size() {
                        return state.size;
                    },
                    get filter() {
                        return state.filter;
                    },
                    get disabled() {
                        return state.disabled;
                    },
                    get readonly() {
                        return state.readonly;
                    },
                    get invalid() {
                        return state.invalid;
                    },
                    get required() {
                        return state.required;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const control = requireControl(container);
            const input = requireInput(container);
            const trigger = requireTrigger(container);
            const content = requireContent(container);

            expect(input.getAttribute("type")).toBe("text");
            expect(input.getAttribute("role")).toBe("combobox");
            expect(input.getAttribute("autocomplete")).toBe("off");
            expect(input.getAttribute("aria-expanded")).toBe("false");
            expect(input.getAttribute("aria-controls")).toBe(content.id);
            expect(input.getAttribute("aria-autocomplete")).toBe("list");
            expect(input.hasAttribute("aria-activedescendant")).toBe(false);
            expect(input.hasAttribute("aria-invalid")).toBe(false);
            expect(input.hasAttribute("aria-required")).toBe(false);

            expect(content.getAttribute("role")).toBe("listbox");
            expect(content.getAttribute("aria-labelledby")).toBe(input.id);

            expect(trigger.getAttribute("type")).toBe("button");
            expect(trigger.getAttribute("tabindex")).toBe("-1");
            expect(trigger.getAttribute("popovertarget")).toBe(content.id);
            expect(trigger.getAttribute("aria-expanded")).toBe("false");
            expect(trigger.getAttribute("aria-controls")).toBe(content.id);

            expect(control.dataset.variant).toBe("soft");
            expect(control.dataset.size).toBe("md");
            expect(control.dataset.state).toBe("closed");
            expect(control.dataset.open).toBeUndefined();

            // Open via ArrowDown -> highlights first item and updates aria-activedescendant
            dispatchKeyDown(input, "ArrowDown");
            flushSync();

            const firstItem = requireItem(container, "de");
            expect(state.open).toBe(true);
            expect(input.getAttribute("aria-expanded")).toBe("true");
            expect(trigger.getAttribute("aria-expanded")).toBe("true");
            expect(input.getAttribute("aria-activedescendant")).toBe(firstItem.id);
            expect(control.dataset.state).toBe("open");
            expect(control.dataset.open).toBe("");
            expect(trigger.dataset.state).toBe("open");
            expect(trigger.dataset.open).toBe("");

            // Check all variants & sizes + flags
            for (const variant of COMBOBOX_VARIANTS) {
                state.variant = variant;
                flushSync();
                expect(control.dataset.variant).toBe(variant);
            }
            for (const size of COMBOBOX_SIZES) {
                state.size = size;
                flushSync();
                expect(control.dataset.size).toBe(size);
                expect(content.dataset.size).toBe(size);
            }

            state.filter = false;
            state.invalid = true;
            state.required = true;
            flushSync();
            expect(input.getAttribute("aria-autocomplete")).toBe("none");
            expect(input.getAttribute("aria-invalid")).toBe("true");
            expect(input.getAttribute("aria-required")).toBe("true");
            expect(control.dataset.invalid).toBe("");

            // Dynamically setting readonly or disabled closes open popover
            state.readonly = true;
            flushSync();
            expect(state.open).toBe(false);
            expect(input.readOnly).toBe(true);
            expect(control.dataset.readonly).toBe("");

            state.readonly = false;
            state.open = true;
            flushSync();
            expect(openPopovers.has(content)).toBe(true);

            state.disabled = true;
            flushSync();
            expect(state.open).toBe(false);
            expect(openPopovers.has(content)).toBe(false);
            expect(input.disabled).toBe(true);
            expect(trigger.disabled).toBe(true);
            expect(control.dataset.disabled).toBe("");

            unmount(instance);
        });

        test("ComboboxGroup links aria-labelledby to ComboboxGroupLabel and ComboboxSeparator renders role='separator'", () => {
            const groups: TestComboboxGroup[] = [
                {
                    key: "europe",
                    label: "Europe",
                    items: [{ value: "de", plainText: "Germany" }],
                },
                {
                    key: "asia",
                    label: "Asia",
                    labelId: "custom-asia-label",
                    items: [{ value: "jp", plainText: "Japan" }],
                },
            ];

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    groups,
                    showSeparator: true,
                },
            });
            flushSync();

            const groupEls = [...container.querySelectorAll<HTMLDivElement>('div.cs-combobox-group[role="group"]')];
            expect(groupEls).toHaveLength(2);

            const firstLabel = groupEls[0]?.querySelector<HTMLDivElement>(".cs-combobox-group-label");
            const secondLabel = groupEls[1]?.querySelector<HTMLDivElement>(".cs-combobox-group-label");
            expect(firstLabel?.getAttribute("role")).toBe("presentation");
            expect(groupEls[0]?.getAttribute("aria-labelledby")).toBe(firstLabel?.id);
            expect(secondLabel?.id).toBe("custom-asia-label");
            expect(groupEls[1]?.getAttribute("aria-labelledby")).toBe("custom-asia-label");

            const separator = requireElement<HTMLDivElement>(container, 'div.cs-combobox-separator[role="separator"]');
            expect(separator.getAttribute("aria-orientation")).toBe("horizontal");

            unmount(instance);
        });

        test("hidden input is rendered only when name is provided and syncs value and disabled state", () => {
            const state = $state<{ name: string | undefined; value: string | undefined; disabled: boolean }>({
                name: undefined,
                value: "de",
                disabled: false,
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get name() {
                        return state.name;
                    },
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get disabled() {
                        return state.disabled;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            expect(getHiddenInput(container)).toBeNull();

            state.name = "country";
            flushSync();
            const hidden = getHiddenInput(container);
            expect(hidden).not.toBeNull();
            expect(hidden?.name).toBe("country");
            expect(hidden?.value).toBe("de");
            expect(hidden?.disabled).toBe(false);

            state.value = undefined;
            state.disabled = true;
            flushSync();
            expect(hidden?.value).toBe("");
            expect(hidden?.disabled).toBe(true);

            unmount(instance);
        });

        test("resolves item labels from plainText, explicit label, and ComboboxItemText without leaking ComboboxItemDescription", () => {
            const items: TestComboboxItem[] = [
                { value: "explicit", label: "Explicit Label", text: "Ignored Text", description: "Desc" },
                { value: "text-desc", text: "Berlin", description: "Capital of Germany" },
                { value: "plain", plainText: "Plain Option" },
            ];

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    value: "text-desc",
                    items,
                },
            });
            flushSync();

            const input = requireInput(container);
            expect(input.value).toBe("Berlin");
            expect(requireItem(container, "explicit").dataset.label).toBe("Explicit Label");
            expect(requireItem(container, "text-desc").dataset.label).toBe("Berlin");
            expect(requireItem(container, "plain").dataset.label).toBe("Plain Option");

            unmount(instance);
        });
    });

    describe("Filtering & isFiltering Session Flag", () => {
        test("opening via trigger, openOnFocus, or ArrowDown keeps all items visible even when inputValue has a selected label", () => {
            const state = $state({
                value: "de" as string | undefined,
                open: false,
                openOnFocus: true,
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    get openOnFocus() {
                        return state.openOnFocus;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            const trigger = requireTrigger(container);
            expect(input.value).toBe("Germany");

            // 1. Open via trigger
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);
            expect(requireItem(container, "fr").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "es").dataset.hidden).toBeUndefined();

            // Close
            dispatchKeyDown(input, "Escape");
            flushSync();
            expect(state.open).toBe(false);

            // 2. Open via ArrowDown
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(state.open).toBe(true);
            expect(requireItem(container, "fr").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "es").dataset.hidden).toBeUndefined();

            // Close
            dispatchKeyDown(input, "Escape");
            flushSync();

            // 3. Open via focus (openOnFocus=true)
            input.dispatchEvent(new FocusEvent("focus", { bubbles: true }));
            flushSync();
            expect(state.open).toBe(true);
            expect(requireItem(container, "fr").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "es").dataset.hidden).toBeUndefined();

            unmount(instance);
        });

        test("typing activates filtering, matches label/keywords, shows ComboboxEmpty at 0 results, and hides all items in empty groups", () => {
            const groups: TestComboboxGroup[] = [
                {
                    key: "eu",
                    label: "Europe",
                    items: [
                        { value: "de", plainText: "Germany", keywords: ["deutschland"] },
                        { value: "fr", plainText: "France", keywords: ["paris"] },
                    ],
                },
                {
                    key: "as",
                    label: "Asia",
                    items: [{ value: "jp", plainText: "Japan", keywords: ["tokyo"] }],
                },
            ];

            const state = $state({
                value: undefined as string | undefined,
                inputValue: "",
                open: false,
            });
            const onValueChange = vi.fn((next: string | undefined) => {
                state.value = next;
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    onValueChange,
                    get inputValue() {
                        return state.inputValue;
                    },
                    set inputValue(next) {
                        state.inputValue = next;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    groups,
                },
            });
            flushSync();

            const input = requireInput(container);
            expect(container.querySelector(".cs-combobox-empty")).toBeNull();

            // Typing opens popover & filters by keyword ("tokyo")
            typeIntoInput(input, "  TOKYO ");
            expect(state.open).toBe(true);
            expect(requireItem(container, "jp").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "de").dataset.hidden).toBe("");
            expect(requireItem(container, "de").hidden).toBe(true);
            expect(requireItem(container, "fr").dataset.hidden).toBe("");
            expect(container.querySelector(".cs-combobox-empty")).toBeNull();

            // First visible enabled item is auto-highlighted when filtering
            expect(input.getAttribute("aria-activedescendant")).toBe(requireItem(container, "jp").id);

            // Typing unmatched query -> all items hidden, ComboboxEmpty rendered
            typeIntoInput(input, "zzzzz");
            expect(requireItem(container, "jp").dataset.hidden).toBe("");
            const emptyEl = requireElement<HTMLDivElement>(container, ".cs-combobox-empty");
            expect(emptyEl.textContent?.trim().length).toBeGreaterThan(0);
            expect(input.hasAttribute("aria-activedescendant")).toBe(false);

            // Typing matching query restores items and removes ComboboxEmpty
            typeIntoInput(input, "fran");
            expect(container.querySelector(".cs-combobox-empty")).toBeNull();
            expect(requireItem(container, "fr").dataset.hidden).toBeUndefined();

            // Selecting an item resets isFiltering so reopening shows all items
            dispatchClick(requireItem(container, "fr"));
            flushSync();
            expect(state.value).toBe("fr");
            expect(state.inputValue).toBe("France");
            expect(state.open).toBe(false);

            // Clearing input via typing "" clears value
            typeIntoInput(input, "");
            expect(onValueChange).toHaveBeenCalledWith(undefined);
            expect(state.value).toBeUndefined();

            unmount(instance);
        });

        test("filter={false} disables built-in filtering and custom filter fn overrides built-in matching", () => {
            const customFilter = vi.fn((label: string, query: string, itemValue: string) => {
                return itemValue === query.trim() || label.startsWith(query);
            });

            const state = $state<{ filter: boolean | typeof customFilter; inputValue: string }>({
                filter: false,
                inputValue: "",
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get filter() {
                        return state.filter;
                    },
                    get inputValue() {
                        return state.inputValue;
                    },
                    set inputValue(next) {
                        state.inputValue = next;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            typeIntoInput(input, "zzzz");
            expect(requireItem(container, "de").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "fr").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "es").dataset.hidden).toBeUndefined();

            // Switch to custom filter fn: matching by itemValue "es"
            state.filter = customFilter;
            flushSync();
            typeIntoInput(input, "es");
            expect(customFilter).toHaveBeenCalled();
            expect(requireItem(container, "es").dataset.hidden).toBeUndefined();
            expect(requireItem(container, "de").dataset.hidden).toBe("");
            expect(requireItem(container, "fr").dataset.hidden).toBe("");

            unmount(instance);
        });
    });

    describe("Value Sync, allowCustomValue, Clear, Blur & Escape", () => {
        test("allowCustomValue={false} reverts dirty inputValue on Escape and blur, while allowCustomValue={true} commits on Enter and blur", () => {
            const state = $state({
                value: "de" as string | undefined,
                inputValue: "",
                open: false,
                allowCustomValue: false,
            });
            const onValueChange = vi.fn((next: string | undefined) => {
                state.value = next;
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    onValueChange,
                    get inputValue() {
                        return state.inputValue;
                    },
                    set inputValue(next) {
                        state.inputValue = next;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    get allowCustomValue() {
                        return state.allowCustomValue;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            expect(state.inputValue).toBe("Germany");

            // Type partial query and press Escape while open -> closes and reverts to "Germany"
            typeIntoInput(input, "Ger");
            expect(state.open).toBe(true);
            dispatchKeyDown(input, "Escape");
            flushSync();
            expect(state.open).toBe(false);
            expect(state.inputValue).toBe("Germany");
            expect(state.value).toBe("de");

            // Type partial query and blur to outside element -> closes and reverts to "Germany"
            const outsideButton = document.createElement("button");
            container.append(outsideButton);
            typeIntoInput(input, "Sp");
            expect(state.open).toBe(true);
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true, relatedTarget: outsideButton }));
            flushSync();
            expect(state.open).toBe(false);
            expect(state.inputValue).toBe("Germany");

            // Switch to allowCustomValue={true}
            state.allowCustomValue = true;
            flushSync();

            // Type unmatched custom value and press Enter -> commits custom value & closes
            typeIntoInput(input, "Customland");
            expect(input.hasAttribute("aria-activedescendant")).toBe(false);
            dispatchKeyDown(input, "Enter");
            flushSync();
            expect(state.value).toBe("Customland");
            expect(state.open).toBe(false);
            expect(onValueChange).toHaveBeenLastCalledWith("Customland");

            // Type another custom value and blur -> commits on blur
            typeIntoInput(input, "Anotherland");
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true, relatedTarget: outsideButton }));
            flushSync();
            expect(state.value).toBe("Anotherland");
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("ComboboxClear visibility and click clear value & inputValue while keeping focus on input", () => {
            const state = $state({
                value: "fr" as string | undefined,
                inputValue: "",
                disabled: false,
                readonly: false,
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get inputValue() {
                        return state.inputValue;
                    },
                    set inputValue(next) {
                        state.inputValue = next;
                    },
                    get disabled() {
                        return state.disabled;
                    },
                    get readonly() {
                        return state.readonly;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            const clearBtn = requireClear(container);

            expect(clearBtn.dataset.visible).toBe("");
            expect(clearBtn.hasAttribute("aria-hidden")).toBe(false);

            const focusSpy = vi.spyOn(input, "focus");
            const pdEvent = dispatchPointerEvent(clearBtn, "pointerdown");
            expect(pdEvent.defaultPrevented).toBe(true);

            dispatchClick(clearBtn);
            flushSync();

            expect(state.value).toBeUndefined();
            expect(state.inputValue).toBe("");
            expect(focusSpy).toHaveBeenCalled();
            expect(clearBtn.dataset.visible).toBe("false");
            expect(clearBtn.getAttribute("aria-hidden")).toBe("true");

            // Disabled or readonly hides clear button even when inputValue is non-empty
            typeIntoInput(input, "Spain");
            expect(clearBtn.dataset.visible).toBe("");
            state.readonly = true;
            flushSync();
            expect(clearBtn.dataset.visible).toBe("false");

            unmount(instance);
        });

        test("strict controlled bind:open rejection stays synchronized across trigger, keyboard, and toggle", () => {
            const onOpenChange = vi.fn();

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get open() {
                        return false;
                    },
                    set open(_next) {},
                    onOpenChange,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            const trigger = requireTrigger(container);
            const content = requireContent(container);

            // Trigger pointerdown attempts to open, but controlled open remains false
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(onOpenChange).toHaveBeenCalledWith(true);
            expect(input.getAttribute("aria-expanded")).toBe("false");
            expect(openPopovers.has(content)).toBe(false);

            // Native toggle open gets reconciled back to closed
            content.showPopover();
            flushSync();
            expect(openPopovers.has(content)).toBe(false);

            unmount(instance);
        });
    });

    describe("Keyboard Navigation & Guards", () => {
        test("ArrowDown/ArrowUp skip disabled & hidden items, clamp at edges, manage data-nav='keyboard', and Enter selects", () => {
            const items: TestComboboxItem[] = [
                { value: "a", plainText: "Alpha" },
                { value: "b", plainText: "Beta", disabled: true },
                { value: "c", plainText: "Gamma" },
                { value: "d", plainText: "Delta" },
            ];

            const state = $state({
                value: undefined as string | undefined,
                open: false,
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    items,
                },
            });
            flushSync();

            const input = requireInput(container);
            const content = requireContent(container);

            // ArrowDown opens and highlights first enabled item ("a")
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(state.open).toBe(true);
            expect(input.getAttribute("aria-activedescendant")).toBe(requireItem(container, "a").id);

            // ArrowDown skips disabled "b" -> lands on "c" and sets data-nav="keyboard"
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(input.getAttribute("aria-activedescendant")).toBe(requireItem(container, "c").id);
            expect(content.dataset.nav).toBe("keyboard");

            // ArrowDown -> "d", then clamps at "d"
            dispatchKeyDown(input, "ArrowDown");
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(input.getAttribute("aria-activedescendant")).toBe(requireItem(container, "d").id);

            // Home and End are NOT intercepted (stay native caret keys)
            const homeEvent = dispatchKeyDown(input, "Home");
            const endEvent = dispatchKeyDown(input, "End");
            expect(homeEvent.defaultPrevented).toBe(false);
            expect(endEvent.defaultPrevented).toBe(false);

            // Enter selects "d" and closes
            dispatchKeyDown(input, "Enter");
            flushSync();
            expect(state.value).toBe("d");
            expect(state.open).toBe(false);

            // ArrowUp when closed opens with selected item highlighted ("d")
            dispatchKeyDown(input, "ArrowUp");
            flushSync();
            expect(state.open).toBe(true);
            expect(input.getAttribute("aria-activedescendant")).toBe(requireItem(container, "d").id);

            // IME composition guard: Enter and Escape with isComposing=true are ignored
            const imeEnter = dispatchKeyDown(input, "Enter", { isComposing: true });
            const imeEscape = dispatchKeyDown(input, "Escape", { isComposing: true });
            expect(imeEnter.defaultPrevented).toBe(false);
            expect(imeEscape.defaultPrevented).toBe(false);
            expect(state.open).toBe(true);

            // Tab closes popover without preventDefault
            const tabEvent = dispatchKeyDown(input, "Tab");
            flushSync();
            expect(tabEvent.defaultPrevented).toBe(false);
            expect(state.open).toBe(false);

            unmount(instance);
        });
    });

    describe("Pointer Interactions & Press-Drag-Release", () => {
        test("trigger pointerdown toggles popover, press-drag-release commits on pointerup, and control/content keep focus on input", () => {
            const state = $state({
                value: undefined as string | undefined,
                open: false,
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const control = requireControl(container);
            const input = requireInput(container);
            const trigger = requireTrigger(container);
            const content = requireContent(container);
            const franceItem = requireItem(container, "fr");

            const focusSpy = vi.spyOn(input, "focus");

            // Control shell mousedown prevents default & focuses input
            const shellMouseDown = dispatchMouseDown(control);
            expect(shellMouseDown.defaultPrevented).toBe(true);
            expect(focusSpy).toHaveBeenCalled();

            // Mouse pointerdown on trigger opens popover
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 10, clientY: 10 });
            flushSync();
            expect(state.open).toBe(true);

            // Content padding pointerdown prevents default (doesn't blur input) and mouse pointermove clears keyboard nav
            dispatchKeyDown(input, "ArrowDown");
            flushSync();
            expect(content.dataset.nav).toBe("keyboard");

            dispatchPointerEvent(content, "pointermove");
            flushSync();
            expect(content.dataset.nav).toBeUndefined();

            const contentPd = dispatchPointerEvent(content, "pointerdown");
            expect(contentPd.defaultPrevented).toBe(true);

            // Short quick pointerup (<4px, <180ms) does NOT commit and ends the drag session
            dispatchPointerEvent(franceItem, "pointerup", { clientX: 11, clientY: 10 });
            flushSync();
            expect(state.value).toBeUndefined();
            expect(state.open).toBe(true);

            // Close and reopen via trigger pointerdown to start a fresh drag session
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 10, clientY: 10 });
            flushSync();
            expect(state.open).toBe(false);

            dispatchPointerEvent(trigger, "pointerdown", { clientX: 10, clientY: 10 });
            flushSync();
            expect(state.open).toBe(true);

            // Dragged pointerup (>= 4px) commits selection and closes
            dispatchPointerEvent(franceItem, "pointerup", { clientX: 20, clientY: 10 });
            flushSync();
            expect(state.value).toBe("fr");
            expect(state.open).toBe(false);

            // Blur with relatedTarget inside control or content does NOT close
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 10, clientY: 10 });
            flushSync();
            expect(state.open).toBe(true);
            input.dispatchEvent(new FocusEvent("blur", { bubbles: true, relatedTarget: content }));
            flushSync();
            expect(state.open).toBe(true);

            // Subsequent trigger pointerdown closes
            dispatchPointerEvent(trigger, "pointerdown", { clientX: 10, clientY: 10 });
            flushSync();
            expect(state.open).toBe(false);

            unmount(instance);
        });

        test("touch trigger flow ignores pointerdown and toggles cleanly on click", () => {
            const state = $state({ open: false });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const trigger = requireTrigger(container);
            dispatchPointerEvent(trigger, "pointerdown", { pointerType: "touch" });
            flushSync();
            expect(state.open).toBe(false);

            dispatchClick(trigger);
            flushSync();
            expect(state.open).toBe(true);

            unmount(instance);
        });
    });

    describe("ref = $bindable() & {...rest} forwarding", () => {
        test("binds refs and forwards custom classes and rest attributes on all subcomponents", () => {
            const refs = $state<{
                control: HTMLDivElement | null;
                input: HTMLInputElement | null;
                clear: HTMLButtonElement | null;
                trigger: HTMLButtonElement | null;
                content: HTMLDivElement | null;
                empty: HTMLDivElement | null;
                group: HTMLDivElement | null;
                groupLabel: HTMLDivElement | null;
                item: HTMLDivElement | null;
                itemText: HTMLSpanElement | null;
                itemDescription: HTMLParagraphElement | null;
                separator: HTMLDivElement | null;
            }>({
                control: null,
                input: null,
                clear: null,
                trigger: null,
                content: null,
                empty: null,
                group: null,
                groupLabel: null,
                item: null,
                itemText: null,
                itemDescription: null,
                separator: null,
            });

            const groups: TestComboboxGroup[] = [
                {
                    key: "g1",
                    label: "Group 1",
                    bindRef: true,
                    class: "custom-group",
                    attrs: { "data-test-group": "1" },
                    labelClass: "custom-group-label",
                    labelAttrs: { "data-test-label": "1" },
                    items: [
                        {
                            value: "one",
                            text: "One",
                            description: "First",
                            bindRef: true,
                            class: "custom-item",
                            attrs: { "data-test-item": "1" },
                            textClass: "custom-text",
                            textAttrs: { "data-test-text": "1" },
                            descriptionClass: "custom-desc",
                            descriptionAttrs: { "data-test-desc": "1" },
                            childIcon: Star,
                            icon: Globe,
                        },
                    ],
                },
                {
                    key: "g2",
                    label: "Group 2",
                    items: [{ value: "two", plainText: "Two" }],
                },
            ];

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get controlRef() {
                        return refs.control;
                    },
                    set controlRef(el) {
                        refs.control = el;
                    },
                    get inputRef() {
                        return refs.input;
                    },
                    set inputRef(el) {
                        refs.input = el;
                    },
                    get clearRef() {
                        return refs.clear;
                    },
                    set clearRef(el) {
                        refs.clear = el;
                    },
                    get triggerRef() {
                        return refs.trigger;
                    },
                    set triggerRef(el) {
                        refs.trigger = el;
                    },
                    get contentRef() {
                        return refs.content;
                    },
                    set contentRef(el) {
                        refs.content = el;
                    },
                    get emptyRef() {
                        return refs.empty;
                    },
                    set emptyRef(el) {
                        refs.empty = el;
                    },
                    get groupRef() {
                        return refs.group;
                    },
                    set groupRef(el) {
                        refs.group = el;
                    },
                    get groupLabelRef() {
                        return refs.groupLabel;
                    },
                    set groupLabelRef(el) {
                        refs.groupLabel = el;
                    },
                    get itemRef() {
                        return refs.item;
                    },
                    set itemRef(el) {
                        refs.item = el;
                    },
                    get itemTextRef() {
                        return refs.itemText;
                    },
                    set itemTextRef(el) {
                        refs.itemText = el;
                    },
                    get itemDescriptionRef() {
                        return refs.itemDescription;
                    },
                    set itemDescriptionRef(el) {
                        refs.itemDescription = el;
                    },
                    get separatorRef() {
                        return refs.separator;
                    },
                    set separatorRef(el) {
                        refs.separator = el;
                    },
                    leadingIcon: Search,
                    clearIcon: Moon,
                    controlClass: "custom-control",
                    controlAttrs: { "data-test-control": "1" },
                    inputClass: "custom-input",
                    inputAttrs: { "data-test-input": "1" },
                    clearClass: "custom-clear",
                    clearAttrs: { "data-test-clear": "1" },
                    triggerClass: "custom-trigger",
                    triggerAttrs: { "data-test-trigger": "1" },
                    contentClass: "custom-content",
                    contentAttrs: { "data-test-content": "1" },
                    emptyClass: "custom-empty",
                    emptyAttrs: { "data-test-empty": "1" },
                    separatorClass: "custom-separator",
                    separatorAttrs: { "data-test-sep": "1" },
                    showSeparator: true,
                    groups,
                },
            });
            flushSync();

            expect(refs.control?.classList.contains("custom-control")).toBe(true);
            expect(refs.control?.dataset.testControl).toBe("1");
            expect(refs.input?.classList.contains("custom-input")).toBe(true);
            expect(refs.input?.dataset.testInput).toBe("1");
            expect(refs.clear?.classList.contains("custom-clear")).toBe(true);
            expect(refs.clear?.dataset.testClear).toBe("1");
            expect(refs.trigger?.classList.contains("custom-trigger")).toBe(true);
            expect(refs.trigger?.dataset.testTrigger).toBe("1");
            expect(refs.content?.classList.contains("custom-content")).toBe(true);
            expect(refs.content?.dataset.testContent).toBe("1");
            expect(refs.group?.classList.contains("custom-group")).toBe(true);
            expect(refs.group?.dataset.testGroup).toBe("1");
            expect(refs.groupLabel?.classList.contains("custom-group-label")).toBe(true);
            expect(refs.groupLabel?.dataset.testLabel).toBe("1");
            expect(refs.item?.classList.contains("custom-item")).toBe(true);
            expect(refs.item?.dataset.testItem).toBe("1");
            expect(refs.itemText?.classList.contains("custom-text")).toBe(true);
            expect(refs.itemText?.dataset.testText).toBe("1");
            expect(refs.itemDescription?.classList.contains("custom-desc")).toBe(true);
            expect(refs.itemDescription?.dataset.testDesc).toBe("1");
            expect(refs.separator?.classList.contains("custom-separator")).toBe(true);
            expect(refs.separator?.dataset.testSep).toBe("1");

            // Trigger empty state so ComboboxEmpty mounts and binds emptyRef
            expect(refs.input).not.toBeNull();
            if (refs.input) {
                typeIntoInput(refs.input, "no-match");
            }
            expect(refs.empty?.classList.contains("custom-empty")).toBe(true);
            expect(refs.empty?.dataset.testEmpty).toBe("1");

            unmount(instance);
        });
    });

    describe("openOnFocus, clickOutside & Escape Window Fallback", () => {
        test("openOnFocus={true} opens on input click sequence (pointerdown -> focus -> pointerup -> click) and stays open", () => {
            const onOpenChange = vi.fn();
            const state = $state({ open: false });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    openOnFocus: true,
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    onOpenChange,
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            const content = requireContent(container);
            expect(content.getAttribute("popover")).toBe("manual");
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);

            // Simulate real mouse click into ComboboxInput: pointerdown -> focus -> pointerup -> click
            dispatchPointerEvent(input, "pointerdown");
            input.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
            flushSync();
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            dispatchPointerEvent(input, "pointerup");
            dispatchClick(input);
            flushSync();

            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenChange).toHaveBeenLastCalledWith(true);

            // Clicking ComboboxInput again while already open keeps it open without extra open transitions
            dispatchPointerEvent(input, "pointerdown");
            input.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
            dispatchPointerEvent(input, "pointerup");
            dispatchClick(input);
            flushSync();

            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);

            unmount(instance);
        });

        test("openOnFocus={false} (default) does not open on focus/click, while typing and trigger still open", () => {
            const state = $state({ open: false, inputValue: "" });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    get inputValue() {
                        return state.inputValue;
                    },
                    set inputValue(next) {
                        state.inputValue = next;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            const trigger = requireTrigger(container);
            const content = requireContent(container);

            // Focusing/clicking input does not open
            dispatchPointerEvent(input, "pointerdown");
            input.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
            dispatchPointerEvent(input, "pointerup");
            dispatchClick(input);
            flushSync();

            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);

            // Typing into input opens
            typeIntoInput(input, "fra");
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            // Close via trigger, then reopen via trigger
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(false);

            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);
            expect(content.matches(":popover-open")).toBe(true);

            unmount(instance);
        });

        test("clicking outside control and content closes popover via clickOutside and runs input blur/revert rules", async () => {
            const outsideButton = document.createElement("button");
            outsideButton.type = "button";
            outsideButton.textContent = "Outside";
            document.body.append(outsideButton);

            try {
                const state = $state<{ open: boolean; value: string | undefined; inputValue: string }>({
                    open: false,
                    value: "de",
                    inputValue: "Germany",
                });

                const instance = mount(ComboboxTestHost, {
                    target: container,
                    props: {
                        openOnFocus: true,
                        allowCustomValue: false,
                        get open() {
                            return state.open;
                        },
                        set open(next) {
                            state.open = next;
                        },
                        get value() {
                            return state.value;
                        },
                        set value(next) {
                            state.value = next;
                        },
                        get inputValue() {
                            return state.inputValue;
                        },
                        set inputValue(next) {
                            state.inputValue = next;
                        },
                        items: DEFAULT_ITEMS,
                    },
                });
                flushSync();

                const input = requireInput(container);
                const content = requireContent(container);

                // Open via focus and flush microtask so clickOutside registers document listeners
                input.dispatchEvent(new FocusEvent("focus", { bubbles: false }));
                flushSync();
                await Promise.resolve();
                expect(state.open).toBe(true);

                typeIntoInput(input, "Ger-dirty");
                expect(state.inputValue).toBe("Ger-dirty");

                // Clicking inside content does NOT trigger clickOutside
                dispatchPointerEvent(content, "pointerdown");
                dispatchPointerEvent(content, "pointerup");
                dispatchClick(content);
                flushSync();
                vi.advanceTimersByTime(0);
                expect(state.open).toBe(true);
                expect(state.inputValue).toBe("Ger-dirty");

                // Clicking outside both control and content closes and reverts dirty inputValue
                dispatchPointerEvent(outsideButton, "pointerdown");
                dispatchPointerEvent(outsideButton, "pointerup");
                dispatchClick(outsideButton);
                flushSync();
                vi.advanceTimersByTime(0);

                expect(state.open).toBe(false);
                expect(content.matches(":popover-open")).toBe(false);
                expect(state.inputValue).toBe("Germany");
                expect(state.value).toBe("de");

                unmount(instance);
            } finally {
                outsideButton.remove();
            }
        });

        test("Escape closes popover via window fallback when focus is not on input, and does not double-fire when focus is on input", () => {
            const onOpenChange = vi.fn();
            const state = $state<{ open: boolean; value: string | undefined; inputValue: string }>({
                open: false,
                value: "de",
                inputValue: "Germany",
            });

            const instance = mount(ComboboxTestHost, {
                target: container,
                props: {
                    allowCustomValue: false,
                    get open() {
                        return state.open;
                    },
                    set open(next) {
                        state.open = next;
                    },
                    onOpenChange,
                    get value() {
                        return state.value;
                    },
                    set value(next) {
                        state.value = next;
                    },
                    get inputValue() {
                        return state.inputValue;
                    },
                    set inputValue(next) {
                        state.inputValue = next;
                    },
                    items: DEFAULT_ITEMS,
                },
            });
            flushSync();

            const input = requireInput(container);
            const trigger = requireTrigger(container);
            const content = requireContent(container);

            // 1. Open via trigger (focus is NOT on input) and dirty inputValue
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(1);

            typeIntoInput(input, "dirty-query");
            expect(state.inputValue).toBe("dirty-query");

            // Dispatch Escape on window (not on input) -> window fallback closes and reverts
            const windowEscape = dispatchKeyDown(window, "Escape");
            flushSync();
            expect(windowEscape.defaultPrevented).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(2);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(state.inputValue).toBe("Germany");

            // 2. Open again and press Escape directly on input -> closes once without double-firing
            dispatchPointerEvent(trigger, "pointerdown");
            flushSync();
            expect(state.open).toBe(true);
            expect(onOpenChange).toHaveBeenCalledTimes(3);

            typeIntoInput(input, "another-dirty");
            const inputEscape = dispatchKeyDown(input, "Escape");
            flushSync();

            expect(inputEscape.defaultPrevented).toBe(true);
            expect(state.open).toBe(false);
            expect(content.matches(":popover-open")).toBe(false);
            expect(state.inputValue).toBe("Germany");
            expect(onOpenChange).toHaveBeenCalledTimes(4);
            expect(onOpenChange).toHaveBeenLastCalledWith(false);

            unmount(instance);
        });

        test("clicking outside with allowCustomValue={true} when focus is not on input commits typed custom value via handleInputBlur", async () => {
            const outsideButton = document.createElement("button");
            outsideButton.type = "button";
            outsideButton.textContent = "Outside";
            document.body.append(outsideButton);

            try {
                const onValueChange = vi.fn();
                const state = $state<{ open: boolean; value: string | undefined; inputValue: string }>({
                    open: false,
                    value: "de",
                    inputValue: "Germany",
                });

                const instance = mount(ComboboxTestHost, {
                    target: container,
                    props: {
                        allowCustomValue: true,
                        onValueChange,
                        get open() {
                            return state.open;
                        },
                        set open(next) {
                            state.open = next;
                        },
                        get value() {
                            return state.value;
                        },
                        set value(next) {
                            state.value = next;
                        },
                        get inputValue() {
                            return state.inputValue;
                        },
                        set inputValue(next) {
                            state.inputValue = next;
                        },
                        items: DEFAULT_ITEMS,
                    },
                });
                flushSync();

                const input = requireInput(container);
                const content = requireContent(container);

                // Open programmatically so focus is NOT on ComboboxInput, then flush microtask for clickOutside listeners
                state.open = true;
                flushSync();
                await Promise.resolve();
                expect(state.open).toBe(true);
                expect(document.activeElement).not.toBe(input);

                typeIntoInput(input, "Custom Tag");
                expect(state.inputValue).toBe("Custom Tag");
                expect(state.value).toBe("de");
                expect(document.activeElement).not.toBe(input);

                // Outside click closes popover and invokes handleInputBlur() to commit custom value
                dispatchPointerEvent(outsideButton, "pointerdown");
                dispatchPointerEvent(outsideButton, "pointerup");
                dispatchClick(outsideButton);
                flushSync();
                vi.advanceTimersByTime(0);

                expect(state.open).toBe(false);
                expect(content.matches(":popover-open")).toBe(false);
                expect(state.value).toBe("Custom Tag");
                expect(state.inputValue).toBe("Custom Tag");
                expect(onValueChange).toHaveBeenCalledTimes(1);
                expect(onValueChange).toHaveBeenLastCalledWith("Custom Tag");

                unmount(instance);
            } finally {
                outsideButton.remove();
            }
        });

        test("window Escape capture listener respects allowCustomValue, composing/defaultPrevented guards, and preempts document capture listeners", () => {
            const docCaptureListener = vi.fn();
            document.addEventListener("keydown", docCaptureListener, { capture: true });

            try {
                const state = $state<{ open: boolean; value: string | undefined; inputValue: string }>({
                    open: false,
                    value: "de",
                    inputValue: "Germany",
                });

                const instance = mount(ComboboxTestHost, {
                    target: container,
                    props: {
                        allowCustomValue: true,
                        get open() {
                            return state.open;
                        },
                        set open(next) {
                            state.open = next;
                        },
                        get value() {
                            return state.value;
                        },
                        set value(next) {
                            state.value = next;
                        },
                        get inputValue() {
                            return state.inputValue;
                        },
                        set inputValue(next) {
                            state.inputValue = next;
                        },
                        items: DEFAULT_ITEMS,
                    },
                });
                flushSync();

                const input = requireInput(container);
                const content = requireContent(container);

                // Open programmatically (focus is NOT on ComboboxInput) and enter uncommitted custom text
                state.open = true;
                flushSync();
                expect(state.open).toBe(true);
                expect(document.activeElement).not.toBe(input);

                typeIntoInput(input, "Uncommitted Custom");
                expect(state.inputValue).toBe("Uncommitted Custom");
                expect(state.value).toBe("de");

                // 1. Guard: isComposing: true does NOT close popover or stop propagation
                const composingEscape = dispatchKeyDown(document.body, "Escape", { isComposing: true });
                flushSync();
                expect(state.open).toBe(true);
                expect(composingEscape.defaultPrevented).toBe(false);
                expect(docCaptureListener).toHaveBeenCalledTimes(1);

                // 2. Guard: defaultPrevented: true does NOT close popover
                const prePreventedEscape = new KeyboardEvent("keydown", {
                    key: "Escape",
                    bubbles: true,
                    cancelable: true,
                });
                prePreventedEscape.preventDefault();
                document.body.dispatchEvent(prePreventedEscape);
                flushSync();
                expect(state.open).toBe(true);
                expect(docCaptureListener).toHaveBeenCalledTimes(2);

                // 3. Normal Escape on document.body: window capture fires first, stops propagation before document capture,
                //    closes popover, and preserves custom inputValue without committing or reverting it.
                const escapeEvent = dispatchKeyDown(document.body, "Escape");
                flushSync();
                expect(escapeEvent.defaultPrevented).toBe(true);
                expect(state.open).toBe(false);
                expect(content.matches(":popover-open")).toBe(false);
                expect(state.inputValue).toBe("Uncommitted Custom");
                expect(state.value).toBe("de");
                expect(docCaptureListener).toHaveBeenCalledTimes(2);

                // 4. Once closed, Escape propagates normally to document capture listener
                dispatchKeyDown(document.body, "Escape");
                flushSync();
                expect(docCaptureListener).toHaveBeenCalledTimes(3);

                unmount(instance);
            } finally {
                document.removeEventListener("keydown", docCaptureListener, { capture: true });
            }
        });
    });
});
